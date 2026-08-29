import { canonicalHash, type BenchmarkLane } from '@paperbanana/benchmark-core'

export type BenchmarkPhase = 'quick' | 'full' | 'standard'
export type BenchmarkPhaseProvider = 'bailian' | 'openrouter' | 'ark'

const HASH = /^[a-f0-9]{64}$/
const SHA = /^[a-f0-9]{40}$/
const RUN_ID = /^bench-run-[a-f0-9]{20}$/
const SAFE_ID = /^[A-Za-z0-9._:/-]{3,200}$/
const SUITE_ID = /^[A-Za-z0-9._-]{3,100}$/
const EPOCH = /^[A-Za-z0-9._:-]{3,100}$/
const AMOUNT = /^(?:0|[1-9][0-9]{0,5})(?:\.[0-9]{1,12})?$/

function amount(env: Record<string, string | undefined>, name: string, positive = true) {
  const raw = String(env[name] || '')
  if (!AMOUNT.test(raw)) throw new Error('BENCHMARK_PHASE_OPERATOR_AUTHORIZATION_INVALID')
  const value = Number(raw)
  if (!Number.isFinite(value) || (positive ? value <= 0 : value < 0)) throw new Error('BENCHMARK_PHASE_OPERATOR_AUTHORIZATION_INVALID')
  return value
}

function integer(env: Record<string, string | undefined>, name: string, allowZero = false) {
  const raw = String(env[name] || '')
  if (!(allowZero ? /^(?:0|[1-9][0-9]{0,3})$/ : /^[1-9][0-9]{0,3}$/).test(raw)) throw new Error('BENCHMARK_PHASE_OPERATOR_AUTHORIZATION_INVALID')
  return Number(raw)
}

export function parseBenchmarkPhaseAuthorization(env: Record<string, string | undefined>) {
  if (env.PAPERBANANA_BENCH_ENABLED !== 'false' || env.PAPERBANANA_BENCH_CONCURRENCY !== '1') {
    throw new Error('BENCHMARK_PHASE_OPERATOR_REQUIRES_DISABLED_WORKER')
  }
  const phase = String(env.PAPERBANANA_BENCH_PHASE_OPERATOR_PHASE || '') as BenchmarkPhase
  const expectedState = phase === 'quick' ? 'quick_running' : phase === 'full' ? 'full_running' : phase === 'standard' ? 'standard_running' : ''
  const codeSha = String(env.PAPERBANANA_CODE_SHA || '').toLowerCase()
  const runId = String(env.PAPERBANANA_BENCH_PHASE_OPERATOR_RUN_ID || '')
  const provider = String(env.PAPERBANANA_BENCH_PHASE_OPERATOR_PROVIDER || '') as BenchmarkPhaseProvider
  const modelId = String(env.PAPERBANANA_BENCH_PHASE_OPERATOR_MODEL_ID || '')
  const lane = String(env.PAPERBANANA_BENCH_PHASE_OPERATOR_LANE || '') as BenchmarkLane | 'provider-default'
  const suiteId = String(env.PAPERBANANA_BENCH_PHASE_OPERATOR_SUITE_ID || '')
  const suiteHash = String(env.PAPERBANANA_BENCH_PHASE_OPERATOR_SUITE_HASH || '').toLowerCase()
  const judgeEpoch = String(env.PAPERBANANA_BENCH_PHASE_OPERATOR_JUDGE_EPOCH || '')
  const judgeStackHash = String(env.PAPERBANANA_BENCH_PHASE_OPERATOR_JUDGE_STACK_HASH || '').toLowerCase()
  const signedAuthorizationHash = String(env.PAPERBANANA_BENCH_PHASE_OPERATOR_SIGNED_AUTHORIZATION_HASH || '').toLowerCase()
  const suppliedPriceHash = String(env.PAPERBANANA_BENCH_PHASE_OPERATOR_PRICE_HASH || '').toLowerCase()
  const runHash = String(env.PAPERBANANA_BENCH_PHASE_OPERATOR_RUN_HASH || '').toLowerCase()
  const runFactsHash = String(env.PAPERBANANA_BENCH_PHASE_OPERATOR_RUN_FACTS_HASH || '').toLowerCase()
  const candidateSnapshotHash = String(env.PAPERBANANA_BENCH_PHASE_OPERATOR_CANDIDATE_SNAPSHOT_HASH || '').toLowerCase()
  const aspectRatiosHash = String(env.PAPERBANANA_BENCH_PHASE_OPERATOR_ASPECT_RATIOS_HASH || '').toLowerCase()
  const registryHash = String(env.PAPERBANANA_BENCH_PHASE_OPERATOR_REGISTRY_HASH || '')
  const runIntegrityAttestation = String(env.PAPERBANANA_BENCH_PHASE_OPERATOR_RUN_INTEGRITY_ATTESTATION || '').toLowerCase()
  const immutableFactsHash = String(env.PAPERBANANA_BENCH_PHASE_OPERATOR_IMMUTABLE_FACTS_HASH || '').toLowerCase()
  const maxGenerations = integer(env, 'PAPERBANANA_BENCH_MAX_GENERATIONS')
  const maxJudgments = integer(env, 'PAPERBANANA_BENCH_MAX_JUDGMENTS', phase === 'standard')
  const maxJudgeCalls = integer(env, 'PAPERBANANA_BENCH_MAX_JUDGE_CALLS', phase === 'standard')
  const maxEstimatedUsd = amount(env, 'PAPERBANANA_BENCH_MAX_ESTIMATED_USD')
  const estimatedPerGeneration = amount(env, 'PAPERBANANA_BENCH_ESTIMATED_PER_GENERATION_USD')
  const estimatedPerJudgeCall = amount(env, 'PAPERBANANA_BENCH_ESTIMATED_PER_JUDGE_CALL_USD', phase !== 'standard')
  const currency = String(env.PAPERBANANA_BENCH_PRICE_CURRENCY || '')
  const source = String(env.PAPERBANANA_BENCH_PRICE_SOURCE || '')
  const capturedAt = String(env.PAPERBANANA_BENCH_PRICE_CAPTURED_AT || '')
  const confirm = String(env.PAPERBANANA_BENCH_PHASE_OPERATOR_CONFIRM || '')
  let priceUrl: URL | undefined
  let canonicalCapturedAt = ''
  try {
    priceUrl = new URL(source)
    canonicalCapturedAt = new Date(capturedAt).toISOString()
  } catch {}
  const generationCap = phase === 'quick' ? 24 : phase === 'full' ? 144 : phase === 'standard' ? 4 : 0
  const judgmentCap = phase === 'quick' ? 48 : phase === 'full' ? 288 : 0
  const judgeCallCap = judgmentCap * 4
  const usdCap = phase === 'quick' ? 100 : phase === 'full' ? 1_000 : phase === 'standard' ? 100_000 : 0
  const expectedConfirm = phase === 'quick'
    ? 'run-exact-approved-quick-phase-disabled-worker'
    : phase === 'full' ? 'run-exact-approved-full-phase-disabled-worker' : 'run-exact-approved-standard-phase-disabled-worker'
  const priceSnapshot = { currency, source, capturedAt, estimatedPerGeneration, estimatedPerJudgeCall }
  const priceHash = canonicalHash(priceSnapshot)
  const valid = Boolean(expectedState)
    && SHA.test(codeSha) && RUN_ID.test(runId)
    && ['bailian', 'openrouter', 'ark'].includes(provider) && SAFE_ID.test(modelId)
    && (['1K-standard', '2K-standard', '4K-standard'].includes(lane) || phase === 'standard' && lane === 'provider-default')
    && SUITE_ID.test(suiteId) && HASH.test(suiteHash) && EPOCH.test(judgeEpoch)
    && HASH.test(judgeStackHash) && HASH.test(signedAuthorizationHash) && HASH.test(suppliedPriceHash)
    && HASH.test(runHash) && HASH.test(runFactsHash) && HASH.test(candidateSnapshotHash) && HASH.test(aspectRatiosHash)
    && SAFE_ID.test(registryHash) && HASH.test(runIntegrityAttestation) && HASH.test(immutableFactsHash)
    && suppliedPriceHash === priceHash
    && maxGenerations <= generationCap && maxJudgments <= judgmentCap
    && (phase === 'standard' ? maxGenerations === 4 && maxJudgments === 0 && maxJudgeCalls === 0 && estimatedPerJudgeCall === 0
      : maxJudgeCalls >= maxJudgments && maxJudgeCalls <= judgeCallCap && maxJudgeCalls <= maxJudgments * 4)
    && estimatedPerGeneration * maxGenerations + estimatedPerJudgeCall * maxJudgeCalls <= maxEstimatedUsd + 1e-9
    && currency === 'USD' && priceUrl?.protocol === 'https:' && !priceUrl.username && !priceUrl.password
    && priceUrl.toString() === source && canonicalCapturedAt === capturedAt && confirm === expectedConfirm
  if (!valid) throw new Error('BENCHMARK_PHASE_OPERATOR_AUTHORIZATION_INVALID')
  const authorizationBase = {
    schemaVersion: 1 as const, phase, expectedState: expectedState as 'quick_running' | 'full_running' | 'standard_running', runId,
    codeSha, provider, modelId, lane, suiteId, suiteHash, judgeEpoch, judgeStackHash,
    signedAuthorizationHash, priceHash, runHash, runFactsHash, candidateSnapshotHash, aspectRatiosHash,
    registryHash, runIntegrityAttestation, immutableFactsHash,
    maxGenerations, maxJudgments, maxJudgeCalls, maxEstimatedUsd,
    priceSnapshot: Object.freeze(priceSnapshot), confirm,
  }
  return Object.freeze({ ...authorizationBase, authorizationHash: canonicalHash(authorizationBase) })
}

export type BenchmarkPhaseAuthorization = ReturnType<typeof parseBenchmarkPhaseAuthorization>
