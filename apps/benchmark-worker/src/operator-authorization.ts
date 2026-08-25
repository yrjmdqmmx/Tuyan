import { canonicalHash, type BenchmarkLane } from '@paperbanana/benchmark-core'

type OperatorMode = 'calibration' | 'canary'

function number(env: Record<string, string | undefined>, name: string, integer = false) {
  const value = Number(env[name])
  if (!Number.isFinite(value) || value < 0 || (integer && !Number.isInteger(value))) throw new Error('BENCHMARK_OPERATOR_AUTHORIZATION_INVALID')
  return value
}

function decimalBudgetWithinCap(env: Record<string, string | undefined>, maxGenerations: number, maxJudgeCalls: number) {
  const parse = (name: string) => {
    const value = String(env[name] || '')
    if (!/^\d{1,12}(?:\.\d{1,12})?$/.test(value)) return undefined
    const [whole, fraction = ''] = value.split('.')
    return { units: BigInt(`${whole}${fraction}`), scale: fraction.length }
  }
  const amounts = [
    parse('PAPERBANANA_BENCH_MAX_ESTIMATED_USD'),
    parse('PAPERBANANA_BENCH_ESTIMATED_PER_GENERATION_USD'),
    parse('PAPERBANANA_BENCH_ESTIMATED_PER_JUDGE_CALL_USD'),
  ]
  if (amounts.some((amount) => !amount)) return false
  const scale = Math.max(...amounts.map((amount) => amount!.scale))
  const [max, generation, judge] = amounts.map((amount) => amount!.units * (10n ** BigInt(scale - amount!.scale)))
  return generation * BigInt(maxGenerations) + judge * BigInt(maxJudgeCalls) <= max
}

export function parseBenchmarkOperatorAuthorization(env: Record<string, string | undefined>) {
  if (env.PAPERBANANA_BENCH_ENABLED !== 'false') throw new Error('BENCHMARK_OPERATOR_REQUIRES_DISABLED_WORKER')
  const mode = String(env.PAPERBANANA_BENCH_OPERATOR_MODE || '') as OperatorMode
  const codeSha = String(env.PAPERBANANA_CODE_SHA || '')
  const confirm = String(env.PAPERBANANA_BENCH_OPERATOR_CONFIRM || '')
  const maxGenerations = number(env, 'PAPERBANANA_BENCH_MAX_GENERATIONS', true)
  const maxJudgeCalls = number(env, 'PAPERBANANA_BENCH_MAX_JUDGE_CALLS', true)
  const maxEstimatedUsd = number(env, 'PAPERBANANA_BENCH_MAX_ESTIMATED_USD')
  const estimatedPerGenerationUsd = number(env, 'PAPERBANANA_BENCH_ESTIMATED_PER_GENERATION_USD')
  const estimatedPerJudgeCallUsd = number(env, 'PAPERBANANA_BENCH_ESTIMATED_PER_JUDGE_CALL_USD')
  const provider = String(env.PAPERBANANA_BENCH_OPERATOR_PROVIDER || '')
  const modelId = String(env.PAPERBANANA_BENCH_OPERATOR_MODEL_ID || '')
  const lane = String(env.PAPERBANANA_BENCH_OPERATOR_LANE || '') as BenchmarkLane
  const priceCurrency = String(env.PAPERBANANA_BENCH_PRICE_CURRENCY || '')
  const priceSource = String(env.PAPERBANANA_BENCH_PRICE_SOURCE || '')
  const priceCapturedAt = String(env.PAPERBANANA_BENCH_PRICE_CAPTURED_AT || '')
  let parsedPriceSource: URL | undefined
  let capturedAt = ''
  try {
    parsedPriceSource = new URL(priceSource)
    capturedAt = new Date(priceCapturedAt).toISOString()
  } catch {}

  const commonValid = /^[a-f0-9]{40}$/i.test(codeSha)
    && maxEstimatedUsd > 0 && maxEstimatedUsd <= 3
    && estimatedPerJudgeCallUsd > 0
    && priceCurrency === 'USD'
    && parsedPriceSource?.protocol === 'https:' && !parsedPriceSource.username && !parsedPriceSource.password
    && capturedAt === priceCapturedAt
    && decimalBudgetWithinCap(env, maxGenerations, maxJudgeCalls)
  const calibrationValid = mode === 'calibration'
    && confirm === 'calibrate-judge-disabled-worker'
    && maxGenerations === 0
    && maxJudgeCalls >= 12 && maxJudgeCalls <= 24
    && estimatedPerGenerationUsd === 0
  const canaryValid = mode === 'canary'
    && confirm === 'run-two-image-canary-disabled-worker'
    && maxGenerations === 2
    && maxJudgeCalls === 6
    && ['bailian', 'openrouter', 'ark'].includes(provider)
    && /^[A-Za-z0-9._:/-]{3,200}$/.test(modelId)
    && ['1K-standard', '2K-standard', '4K-standard'].includes(lane)
    && estimatedPerGenerationUsd > 0
  if (!commonValid || (!calibrationValid && !canaryValid)) throw new Error('BENCHMARK_OPERATOR_AUTHORIZATION_INVALID')

  const priceSnapshot = {
    currency: 'USD' as const,
    source: parsedPriceSource!.toString(),
    capturedAt,
    estimatedPerGenerationUsd,
    estimatedPerJudgeCallUsd,
  }
  const priceHash = canonicalHash(priceSnapshot)
  const authorizationBase = {
    mode,
    codeSha,
    maxGenerations,
    maxJudgeCalls,
    maxEstimatedUsd,
    estimatedPerGenerationUsd,
    estimatedPerJudgeCallUsd,
    priceSnapshot,
    priceHash,
    ...(mode === 'canary' ? { provider: provider as 'bailian' | 'openrouter' | 'ark', modelId, lane } : {}),
  }
  return Object.freeze({ ...authorizationBase, authorizationHash: canonicalHash(authorizationBase) })
}
