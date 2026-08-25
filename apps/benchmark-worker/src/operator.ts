import { createHash } from 'node:crypto'

import OSS from 'ali-oss'
import { benchmarkJudgeStackHash, canonicalHash } from '@paperbanana/benchmark-core'

import { loadAuthoritativeImageRuntime } from './authoritative-runtime.js'
import { BenchmarkBudget } from './budget.js'
import { loadBuildProvenance } from './build-provenance.js'
import { executeBenchmarkCanary } from './canary.js'
import { executeJudgeCalibration } from './calibration-fixtures.js'
import { renderCalibrationFixture } from './calibration-render.js'
import { loadBenchCredentials } from './config.js'
import { callBlindJudge } from './judge-provider.js'
import { parseBenchmarkOperatorAuthorization } from './operator-authorization.js'
import { classifyOperatorError } from './operator-error.js'
import { runProviderOperation } from './provider-operation.js'

const env = process.env

function required(name: string) {
  const value = String(env[name] || '').trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

async function main() {
  const authorization = parseBenchmarkOperatorAuthorization(env) as any
  const buildProvenance = await loadBuildProvenance()
  if (buildProvenance.codeSha !== authorization.codeSha) throw new Error('BENCHMARK_OPERATOR_BUILD_PROVENANCE_MISMATCH')
  const credentials = loadBenchCredentials(env)
  if (!credentials.openrouter || !credentials.bailian) throw new Error('BENCHMARK_DEDICATED_JUDGE_CREDENTIALS_MISSING')
  if (authorization.mode === 'canary' && !credentials[authorization.provider as keyof typeof credentials]) throw new Error('BENCHMARK_DEDICATED_GENERATION_CREDENTIAL_MISSING')
  const budget = new BenchmarkBudget({
    maxGenerations: authorization.maxGenerations,
    maxJudgeCalls: authorization.maxJudgeCalls,
    maxEstimatedUsd: authorization.maxEstimatedUsd,
  })
  const oss = new OSS({
    region: required('PAPERBANANA_BENCH_OSS_REGION'),
    accessKeyId: required('PAPERBANANA_BENCH_OSS_ACCESS_KEY_ID'),
    accessKeySecret: required('PAPERBANANA_BENCH_OSS_ACCESS_KEY_SECRET'),
    bucket: required('PAPERBANANA_BENCH_OSS_BUCKET'),
    endpoint: required('PAPERBANANA_BENCH_OSS_INTERNAL_ENDPOINT'),
    secure: true,
    authorizationV4: true,
  })

  async function judge(provider: 'openrouter' | 'bailian', image: Uint8Array, rubric: unknown, caption: string) {
    return runProviderOperation(
      () => callBlindJudge({
        provider,
        apiKey: credentials[provider],
        imageBase64: Buffer.from(image).toString('base64'),
        rubric,
        caption,
        beforeDispatch: async () => {
          budget.reserve({ kind: 'judgment', estimatedUsd: authorization.estimatedPerJudgeCallUsd })
        },
      }),
      { maxRetries: 1 },
    )
  }

  let result: Record<string, unknown>
  if (authorization.mode === 'calibration') {
    result = await executeJudgeCalibration({
      async render(fixture) {
        return renderCalibrationFixture(fixture)
      },
      async judge(provider, fixture, image) {
        return judge(provider, image, fixture.rubric, fixture.caption)
      },
    })
    if (!result.passed) throw new Error('BENCHMARK_JUDGE_CALIBRATION_FAILED')
  } else {
    const runtime = await loadAuthoritativeImageRuntime()
    const images = new Map<string, Buffer>()
    result = await executeBenchmarkCanary({
      provider: authorization.provider,
      modelId: authorization.modelId,
      lane: authorization.lane,
      async generate(sample) {
        budget.reserve({ kind: 'generation', estimatedUsd: authorization.estimatedPerGenerationUsd })
        const startedAt = Date.now()
        const imageBase64 = await runtime.generate({
          provider: authorization.provider,
          model: authorization.modelId,
          apiKey: credentials[authorization.provider as keyof typeof credentials],
          prompt: sample.prompt,
          aspectRatio: sample.aspectRatio,
          imageSize: authorization.lane,
        })
        const bytes = Buffer.from(imageBase64, 'base64')
        const imageHash = createHash('sha256').update(bytes).digest('hex')
        const imageObjectKey = `bench/canary/objects/${imageHash}.png`
        try {
          await oss.put(imageObjectKey, bytes, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, no-store', 'x-oss-forbid-overwrite': 'true' } })
        } catch (error: any) {
          if (![409, 'FileAlreadyExists'].includes(error?.status || error?.code)) throw error
          const existing = await oss.get(imageObjectKey)
          if (createHash('sha256').update(Buffer.from(existing.content)).digest('hex') !== imageHash) throw new Error('BENCHMARK_CONTENT_ADDRESS_COLLISION')
        }
        images.set(imageHash, bytes)
        return { imageHash, imageObjectKey, latencyMs: Date.now() - startedAt }
      },
      async judge(provider, sample) {
        const image = images.get(sample.imageHash)
        if (!image) throw new Error('BENCHMARK_CANARY_IMAGE_MISSING')
        return judge(provider, image, sample.rubric, sample.caption)
      },
    })
  }

  const reportBase = {
    operatorMode: authorization.mode,
    codeSha: authorization.codeSha,
    judgeEpoch: 'judge-2026-08-v1',
    judgeStackHash: benchmarkJudgeStackHash(authorization.codeSha),
    authorizationHash: authorization.authorizationHash,
    authorization,
    priceHash: authorization.priceHash,
    priceSnapshot: authorization.priceSnapshot,
    usage: budget.snapshot(),
    createdAt: new Date().toISOString(),
    result,
  }
  const operatorReportHash = canonicalHash(reportBase)
  const finalReport = { ...reportBase, operatorReportHash }
  const reportObjectKey = `bench/operator-reports/${operatorReportHash}.json`
  const reportBytes = Buffer.from(JSON.stringify(finalReport))
  try {
    await oss.put(reportObjectKey, reportBytes, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store', 'x-oss-forbid-overwrite': 'true' } })
  } catch (error: any) {
    if (![409, 'FileAlreadyExists'].includes(error?.status || error?.code)) throw error
    const existing = await oss.get(reportObjectKey)
    if (!Buffer.from(existing.content).equals(reportBytes)) throw new Error('BENCHMARK_OPERATOR_REPORT_COLLISION')
  }
  process.stdout.write(`${JSON.stringify({ ...finalReport, reportObjectKey })}\n`)
}

void main().catch((error) => {
  process.stderr.write(`${classifyOperatorError(error)}\n`)
  process.exitCode = 1
})
