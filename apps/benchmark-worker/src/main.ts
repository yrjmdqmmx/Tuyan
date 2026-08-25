import { randomUUID } from 'node:crypto'
import { writeFile } from 'node:fs/promises'

import OSS from 'ali-oss'
import { MongoClient } from 'mongodb'
import { canonicalHash } from '@paperbanana/benchmark-core'

import { loadAuthoritativeImageRuntime } from './authoritative-runtime.js'
import { loadBuildProvenance } from './build-provenance.js'
import { loadBenchCredentials, parseWorkerConfig, redactHealthError } from './config.js'
import { detectImageCandidates } from './detector.js'
import { createWorkerMongoRepository } from './mongo-repository.js'
import { UnknownProviderOutcomeError } from './provider-operation.js'
import { processAcquiredBenchmarkRun } from './process-run.js'
import { createOpenRouterJudgeEgress } from './judge-egress.js'

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
  let openRouterJudgeEgress: ReturnType<typeof createOpenRouterJudgeEgress> | null = null
  async function processOne() {
    if (!config.enabled || working || stopping) return
    working = true
    let heartbeat: ReturnType<typeof setInterval> | undefined
    let activeRun: any = null
    try {
      const run = await repository.acquireRun(workerId, config.leaseMs)
      if (!run) return
      activeRun = run
      heartbeat = setInterval(() => { void repository.heartbeat(run._id, workerId, run.leaseToken, run.state, config.leaseMs) }, config.heartbeatMs)
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
      openRouterJudgeEgress ||= createOpenRouterJudgeEgress(env)
      await processAcquiredBenchmarkRun({
        run, workerId, workerCodeSha: buildProvenance.codeSha,
        configuredCodeSha: String(env.PAPERBANANA_CODE_SHA || '').toLowerCase(), credentials,
        imageRuntime, oss, repository, openRouterJudgeFetch: openRouterJudgeEgress.fetch,
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
    await openRouterJudgeEgress?.close().catch(() => {})
    await client.close()
  }
  process.once('SIGTERM', () => { void shutdown() })
  process.once('SIGINT', () => { void shutdown() })
}

void main().catch(async (error) => {
  await writeHealth('failed', { error: redactHealthError((error as Error).message || error) }).catch(() => {})
  process.exitCode = 1
})
