import { createHash, randomUUID } from 'node:crypto'
import { writeFile } from 'node:fs/promises'

import OSS from 'ali-oss'
import { MongoClient } from 'mongodb'
import { PB_IMAGE_DIAGNOSTIC_V1, benchmarkJudgeStackHash, canonicalHash } from '@paperbanana/benchmark-core'

import { loadAuthoritativeImageRuntime } from './authoritative-runtime.js'
import { loadBuildProvenance } from './build-provenance.js'
import { loadBenchCredentials, parseWorkerConfig, redactHealthError } from './config.js'
import { detectImageCandidates } from './detector.js'
import { callBlindJudge } from './judge-provider.js'
import { createWorkerMongoRepository } from './mongo-repository.js'
import { executeBenchmarkRun } from './runner.js'
import { runProviderOperation, UnknownProviderOutcomeError } from './provider-operation.js'

const env = process.env
const config = parseWorkerConfig(env)
const workerId = `benchmark-worker:${randomUUID()}`
const healthFile = env.PAPERBANANA_BENCH_HEALTH_FILE || '/tmp/benchmark-worker-health.json'

function required(name: string) {
  const value = String(env[name] || '').trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

async function writeHealth(status: string, fields: Record<string, unknown> = {}) {
  healthState = { ...healthState, ok: status !== 'failed', status, enabled: config.enabled, workerId, ...fields }
  await writeFile(healthFile, JSON.stringify({ ...healthState, updatedAt: new Date().toISOString() }), { mode: 0o600 })
}

let healthState: Record<string, unknown> = { ok: true, status: 'starting' }

async function main() {
  const buildProvenance = await loadBuildProvenance()
  const client = new MongoClient(required('PAPERBANANA_BENCH_MONGODB_URI'))
  await client.connect()
  const db = client.db(config.mongoDbName)
  const repository = createWorkerMongoRepository(db)
  await repository.ensureIndexes()
  const credentials = loadBenchCredentials(env)
  let stopping = false
  let detecting = false
  let working = false

  async function discover() {
    if (detecting || stopping) return
    detecting = true
    try {
      const apiUrl = required('PAPERBANANA_API_URL')
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Paperbanana-Gateway-Token': required('PAPERBANANA_BENCH_DISCOVERY_TOKEN') },
        body: JSON.stringify({ action: 'modelRegistry' }),
      })
      const registry = await response.json() as any
      if (!response.ok || registry.code !== 0) throw new Error('BENCHMARK_REGISTRY_FETCH_FAILED')
      const registryHash = canonicalHash(registry)
      const previous = await repository.registrySnapshot()
      const candidates = detectImageCandidates(previous?.snapshot || {}, registry, registryHash)
      await repository.saveCandidates(candidates)
      await repository.saveRegistrySnapshot(registry, registryHash)
      await writeHealth('ready', { lastDetectionAt: new Date().toISOString(), detectedCandidates: candidates.length })
    } finally { detecting = false }
  }

  let imageRuntime: Awaited<ReturnType<typeof loadAuthoritativeImageRuntime>> | null = null
  let oss: OSS | null = null
  async function processOne() {
    if (!config.enabled || working || stopping) return
    working = true
    let heartbeat: ReturnType<typeof setInterval> | undefined
    let activeRun: any = null
    try {
      const run = await repository.acquireRun(workerId, config.leaseMs)
      if (!run) return
      activeRun = run
      const workerCodeSha = buildProvenance.codeSha
      if (workerCodeSha !== String(env.PAPERBANANA_CODE_SHA || '').toLowerCase() || workerCodeSha !== run.codeSha) throw new Error('BENCHMARK_WORKER_CODE_SHA_MISMATCH')
      if (benchmarkJudgeStackHash(workerCodeSha) !== run.judgeStackHash) throw new Error('BENCHMARK_JUDGE_STACK_MISMATCH')
      heartbeat = setInterval(() => { void repository.heartbeat(run._id, workerId, run.leaseToken, run.state, config.leaseMs) }, config.heartbeatMs)
      const provider = String(run.provider) as 'bailian' | 'openrouter' | 'ark'
      const apiKey = credentials[provider]
      if (!apiKey || !credentials.openrouter || !credentials.bailian) throw new Error('BENCHMARK_DEDICATED_CREDENTIALS_MISSING')
      imageRuntime ||= await loadAuthoritativeImageRuntime()
      oss ||= new OSS({
        region: required('PAPERBANANA_BENCH_OSS_REGION'),
        accessKeyId: required('PAPERBANANA_BENCH_OSS_ACCESS_KEY_ID'),
        accessKeySecret: required('PAPERBANANA_BENCH_OSS_ACCESS_KEY_SECRET'),
        bucket: required('PAPERBANANA_BENCH_OSS_BUCKET'),
        endpoint: required('PAPERBANANA_BENCH_OSS_INTERNAL_ENDPOINT'),
        secure: true,
        authorizationV4: true,
      })
      const phase = run.state === 'full_running' ? 'full' : 'quick'
      const phaseCases = phase === 'full'
        ? [...PB_IMAGE_DIAGNOSTIC_V1.cases]
        : PB_IMAGE_DIAGNOSTIC_V1.quickCaseIds.map((id) => PB_IMAGE_DIAGNOSTIC_V1.cases.find((item) => item.id === id)!)
      const unsupportedFixed = phaseCases.filter((item) => item.aspectRatio !== 'auto' && !(run.aspectRatios || []).includes(item.aspectRatio))
      const selectedCases = phaseCases.filter((item) => !unsupportedFixed.includes(item))
      await executeBenchmarkRun({
        run: { runId: run._id, phase, provider, modelId: run.modelId, lane: run.lane, repetitions: phase === 'full' ? 3 : 2, runHash: run.runHash, expectedCaseCount: phaseCases.length, capabilityGaps: unsupportedFixed.map((item) => `aspectRatio:${item.aspectRatio}`) },
        cases: selectedCases as any,
        async generate(sample) {
          await repository.reserveBudget(run._id, workerId, run.leaseToken, run.state, 'generation', Number(run.approval?.priceSnapshot?.estimatedPerGeneration || 0))
          await repository.beginSampleDispatch(run, workerId, sample)
          const startedAt = Date.now()
          const imageBase64 = await imageRuntime!.generate({ provider, model: run.modelId, apiKey, prompt: sample.prompt, aspectRatio: sample.aspectRatio, imageSize: sample.lane })
          const bytes = Buffer.from(imageBase64, 'base64')
          const imageHash = createHash('sha256').update(bytes).digest('hex')
          const imageObjectKey = `bench/objects/${imageHash}.png`
          try {
            await oss!.put(imageObjectKey, bytes, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, no-store', 'x-oss-forbid-overwrite': 'true' } })
          } catch (error: any) {
            if (![409, 'FileAlreadyExists'].includes(error?.status || error?.code)) throw error
            const existing = await oss!.get(imageObjectKey)
            if (createHash('sha256').update(Buffer.from(existing.content)).digest('hex') !== imageHash) throw new Error('BENCHMARK_CONTENT_ADDRESS_COLLISION')
          }
          return { imageHash, imageObjectKey, latencyMs: Date.now() - startedAt }
        },
        async judge(judgeProvider, sample) {
          const object = await oss!.get(sample.imageObjectKey!)
          let dispatchIndex = 0
          return runProviderOperation(
            () => callBlindJudge({
              provider: judgeProvider,
              apiKey: credentials[judgeProvider],
              imageBase64: Buffer.from(object.content).toString('base64'),
              rubric: sample.rubric,
              caption: sample.caption,
              beforeDispatch: async () => {
                const currentDispatch = dispatchIndex
                dispatchIndex += 1
                await repository.beginJudgeDispatch(run, workerId, sample.sampleId, judgeProvider, currentDispatch)
                try {
                  await repository.reserveBudget(run._id, workerId, run.leaseToken, run.state, 'judgment', Number(run.approval?.priceSnapshot?.estimatedPerJudgeCall))
                } catch (error) {
                  await repository.cancelJudgeDispatch(run, sample.sampleId, judgeProvider, currentDispatch)
                  throw error
                }
              },
            }),
            { maxRetries: 1 },
          )
        },
        repository: repository.forRun(run, workerId),
      })
      await writeHealth('ready', { lastRunId: run._id, lastRunCompletedAt: new Date().toISOString() })
    } catch (error) {
      const message = String((error as Error).message || error)
      const unknownOutcome = error instanceof UnknownProviderOutcomeError || /UNKNOWN_PROVIDER_OUTCOME|timed out after dispatch/i.test(message)
      const safetyPause = unknownOutcome || /BENCHMARK_(?:WORKER_CODE_SHA|JUDGE_STACK)_MISMATCH/.test(message)
      if (activeRun) await repository.finishWithError(activeRun._id, workerId, activeRun.leaseToken, activeRun.state, safetyPause ? 'paused' : 'failed', unknownOutcome ? 'UNKNOWN_PROVIDER_OUTCOME' : safetyPause ? 'BENCHMARK_PROVENANCE_MISMATCH' : 'BENCHMARK_RUN_FAILED')
      await writeHealth('degraded', { lastError: redactHealthError(message) })
    } finally {
      if (heartbeat) clearInterval(heartbeat)
      working = false
    }
  }

  await discover()
  const healthTimer = setInterval(() => { void writeFile(healthFile, JSON.stringify({ ...healthState, updatedAt: new Date().toISOString() }), { mode: 0o600 }) }, 30_000)
  const detectionTimer = setInterval(() => { void discover() }, config.detectionIntervalMs)
  const workTimer = setInterval(() => { void processOne() }, 1_000)
  const shutdown = async () => {
    if (stopping) return
    stopping = true
    clearInterval(detectionTimer)
    clearInterval(workTimer)
    clearInterval(healthTimer)
    while (working || detecting) await new Promise((resolve) => setTimeout(resolve, 100))
    await client.close()
  }
  process.once('SIGTERM', () => { void shutdown() })
  process.once('SIGINT', () => { void shutdown() })
}

void main().catch(async (error) => {
  await writeHealth('failed', { error: redactHealthError((error as Error).message || error) }).catch(() => {})
  process.exitCode = 1
})
