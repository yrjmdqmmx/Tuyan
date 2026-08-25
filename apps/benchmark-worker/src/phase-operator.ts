import { randomUUID } from 'node:crypto'

import OSS from 'ali-oss'
import { MongoClient } from 'mongodb'

import { loadAuthoritativeImageRuntime } from './authoritative-runtime.js'
import { loadBuildProvenance } from './build-provenance.js'
import { loadBenchCredentials, parseWorkerConfig, redactHealthError } from './config.js'
import { createWorkerMongoRepository } from './mongo-repository.js'
import { parseBenchmarkPhaseAuthorization } from './phase-operator-authorization.js'
import { buildBenchmarkPhaseOperatorReport } from './phase-operator-report.js'
import { processAcquiredBenchmarkRun } from './process-run.js'
import { UnknownProviderOutcomeError } from './provider-operation.js'
import { createOpenRouterJudgeEgress } from './judge-egress.js'

const env = process.env

function required(name: string) {
  const value = String(env[name] || '').trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

async function main() {
  const authorization = parseBenchmarkPhaseAuthorization(env)
  const provenance = await loadBuildProvenance()
  if (provenance.codeSha !== authorization.codeSha) throw new Error('BENCHMARK_PHASE_OPERATOR_RUN_MISMATCH')
  const config = parseWorkerConfig(env)
  const workerId = `benchmark-phase-operator:${randomUUID()}`
  const client = new MongoClient(required('PAPERBANANA_BENCH_MONGODB_URI'))
  let activeRun: Record<string, any> | null = null
  let heartbeat: ReturnType<typeof setInterval> | undefined
  const openRouterJudgeEgress = createOpenRouterJudgeEgress(env)
  try {
    await client.connect()
    const repository = createWorkerMongoRepository(client.db(config.mongoDbName))
    await repository.ensureIndexes()
    activeRun = await repository.acquireRunById(authorization.runId, authorization.expectedState, workerId, config.leaseMs)
    if (!activeRun) throw new Error('BENCHMARK_PHASE_OPERATOR_EXACT_RUN_UNAVAILABLE')
    heartbeat = setInterval(() => { void repository.heartbeat(activeRun!._id, workerId, activeRun!.leaseToken, activeRun!.state, config.leaseMs) }, config.heartbeatMs)
    const credentials = loadBenchCredentials(env)
    const imageRuntime = await loadAuthoritativeImageRuntime()
    const oss = new OSS({
      region: required('PAPERBANANA_BENCH_OSS_REGION'), accessKeyId: required('PAPERBANANA_BENCH_OSS_ACCESS_KEY_ID'),
      accessKeySecret: required('PAPERBANANA_BENCH_OSS_ACCESS_KEY_SECRET'), bucket: required('PAPERBANANA_BENCH_OSS_BUCKET'),
      endpoint: required('PAPERBANANA_BENCH_OSS_INTERNAL_ENDPOINT'), secure: true, authorizationV4: true,
    })
    await processAcquiredBenchmarkRun({
      run: activeRun, workerId, workerCodeSha: provenance.codeSha, configuredCodeSha: authorization.codeSha,
      authorization, credentials, imageRuntime, oss, repository, openRouterJudgeFetch: openRouterJudgeEgress.fetch,
    })
    const snapshot = await repository.phaseReport(authorization.runId, authorization.phase)
    if (!snapshot.run || snapshot.run.state !== (authorization.phase === 'quick' ? 'quick_review' : 'codex_audit')
      || snapshot.run.leaseOwner || snapshot.run.leaseToken || snapshot.run.leaseUntil) {
      throw new Error('BENCHMARK_PHASE_OPERATOR_POSTCONDITION_FAILED')
    }
    process.stdout.write(`${JSON.stringify(buildBenchmarkPhaseOperatorReport({
      runId: authorization.runId, phase: authorization.phase, authorizationHash: authorization.authorizationHash,
      usage: snapshot.run.usageByPhase?.[authorization.phase] || {}, state: snapshot.run.state,
      sampleCount: snapshot.sampleCount, judgmentCount: snapshot.judgmentCount, auditCount: snapshot.auditCount,
    }))}\n`)
  } catch (error) {
    const message = String((error as Error).message || error)
    const unknown = error instanceof UnknownProviderOutcomeError || /UNKNOWN_PROVIDER_OUTCOME|timed out after dispatch/i.test(message)
    const budget = /BENCHMARK_BUDGET_PAUSED/.test(message)
    if (activeRun && !budget) {
      await createWorkerMongoRepository(client.db(config.mongoDbName)).finishWithError(
        activeRun._id, workerId, activeRun.leaseToken, activeRun.state, unknown ? 'paused' : 'failed',
        unknown ? 'UNKNOWN_PROVIDER_OUTCOME' : 'BENCHMARK_PHASE_OPERATOR_FAILED',
      ).catch(() => {})
    }
    throw error
  } finally {
    if (heartbeat) clearInterval(heartbeat)
    await openRouterJudgeEgress.close().catch(() => {})
    await client.close().catch(() => {})
  }
}

void main().catch((error) => {
  process.stderr.write(`${redactHealthError((error as Error).message || error)}\n`)
  process.exitCode = 1
})
