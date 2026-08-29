import { createHash, randomUUID } from 'node:crypto'

import OSS from 'ali-oss'
import { MongoClient } from 'mongodb'

import { loadBuildProvenance } from './build-provenance.js'
import { loadBenchCredentials, parseWorkerConfig } from './config.js'
import {
  assertConfirmedNotForwardedInput,
  assertDispatchReconciliationInspection,
  reconcileConfirmedNotForwardedJudgeDispatch,
  type ConfirmedNotForwardedInput,
  type DispatchReconciliationInspection,
} from './dispatch-reconciliation.js'
import { createOpenRouterJudgeEgress } from './judge-egress.js'
import { callBlindJudge } from './judge-provider.js'
import { createWorkerMongoRepository } from './mongo-repository.js'
import { runProviderOperation } from './provider-operation.js'

const env = process.env
type AnyRecord = { _id: string; [key: string]: any }

function required(name: string) {
  const value = String(env[name] || '').trim()
  if (!value) throw new Error('BENCHMARK_DISPATCH_RECONCILIATION_INPUT_INVALID')
  return value
}

function integer(name: string) {
  const value = Number(required(name))
  if (!Number.isInteger(value)) throw new Error('BENCHMARK_DISPATCH_RECONCILIATION_INPUT_INVALID')
  return value
}

async function main() {
  const mode = required('PAPERBANANA_RECONCILE_MODE')
  if (!['inspect', 'apply'].includes(mode)) throw new Error('BENCHMARK_DISPATCH_RECONCILIATION_INPUT_INVALID')
  if (mode === 'apply' && required('PAPERBANANA_RECONCILE_CONFIRM') !== 'retry-confirmed-not-forwarded-openrouter-dispatch-disabled-worker') {
    throw new Error('BENCHMARK_DISPATCH_RECONCILIATION_INPUT_INVALID')
  }
  if (env.PAPERBANANA_BENCH_ENABLED !== 'false' || env.PAPERBANANA_BENCH_CONCURRENCY !== '1') {
    throw new Error('BENCHMARK_DISPATCH_RECONCILIATION_WORKER_GUARD')
  }
  const expectedSha = required('PAPERBANANA_RECONCILE_EXPECTED_SHA')
  const operatorSha256 = required('PAPERBANANA_RECONCILE_OPERATOR_SHA256')
  if (!/^[a-f0-9]{40}$/.test(expectedSha) || !/^[a-f0-9]{64}$/.test(operatorSha256)) throw new Error('BENCHMARK_DISPATCH_RECONCILIATION_INPUT_INVALID')
  if ((await loadBuildProvenance()).codeSha !== expectedSha || env.PAPERBANANA_CODE_SHA !== expectedSha) {
    throw new Error('BENCHMARK_DISPATCH_RECONCILIATION_PROVENANCE_MISMATCH')
  }
  const input = assertConfirmedNotForwardedInput({
    runId: required('PAPERBANANA_RECONCILE_RUN_ID'),
    sampleId: required('PAPERBANANA_RECONCILE_SAMPLE_ID'),
    phase: 'quick', provider: 'openrouter', failedDispatchIndex: 0, retryDispatchIndex: 1,
    proof: {
      target: 'openrouter.ai:443', proxyStatus: 503,
      durationMs: integer('PAPERBANANA_RECONCILE_PROXY_DURATION_MS'), responseBytes: 0,
      logSha256: required('PAPERBANANA_RECONCILE_PROXY_LOG_SHA256'),
    },
  } as ConfirmedNotForwardedInput)
  const client = new MongoClient(required('PAPERBANANA_BENCH_MONGODB_URI'))
  const config = parseWorkerConfig(env)
  const workerId = `benchmark-dispatch-reconciliation:${randomUUID()}`
  let claimedRun: Record<string, any> | null = null
  let heartbeat: ReturnType<typeof setInterval> | undefined
  let openRouterEgress: ReturnType<typeof createOpenRouterJudgeEgress> | undefined
  try {
    await client.connect()
    const db = client.db(config.mongoDbName)
    const runs = db.collection<any>('paperbanana_benchmark_runs')
    const samples = db.collection<any>('paperbanana_benchmark_samples')
    const judgments = db.collection<any>('paperbanana_benchmark_judgments')
    const dispatches = db.collection<any>('paperbanana_benchmark_dispatches')
    const repository = createWorkerMongoRepository(db)
    const dispatchId = `dispatch:${input.provider}:${input.sampleId}:${input.failedDispatchIndex}`
    const retryDispatchId = `dispatch:${input.provider}:${input.sampleId}:${input.retryDispatchIndex}`
    let sample: Record<string, any> | null = null
    const inspect = async (): Promise<DispatchReconciliationInspection> => {
      const run = await runs.findOne({ _id: input.runId }) as Record<string, any> | null
      sample = await samples.findOne({ _id: input.sampleId, runId: input.runId }) as Record<string, any> | null
      const judgment = await judgments.findOne({ _id: `${input.provider}:${input.sampleId}:${run?.judgeEpoch || ''}`, status: 'completed' })
      const markers = await dispatches.find({ runId: input.runId, sampleId: input.sampleId, logicalProvider: input.provider }).sort({ dispatchIndex: 1 }).toArray()
      const exactKeys = ['_id', 'dispatchIndex', 'judgeEpoch', 'logicalProvider', 'phase', 'runId', 'sampleId']
      if (!run || run.codeSha !== expectedSha || run.provider !== 'bailian' || run.modelId !== 'qwen-image-2.0-pro'
        || run.lane !== '2K-standard' || run.suiteId !== 'pb-image-diagnostic-v1' || run.judgeEpoch !== 'judge-2026-08-v1'
        || !sample || sample.phase !== 'quick' || sample.status !== 'completed'
        || markers.some((marker) => JSON.stringify(Object.keys(marker).sort()) !== JSON.stringify(exactKeys)
          || marker._id !== `dispatch:${marker.logicalProvider}:${marker.sampleId}:${marker.dispatchIndex}`)
        || await dispatches.countDocuments({ _id: retryDispatchId }) !== 0) {
        throw new Error('BENCHMARK_DISPATCH_RECONCILIATION_STATE_INVALID')
      }
      return assertDispatchReconciliationInspection({
        runState: String(run.state), errorCode: String(run.errorCode || ''),
        hasLease: Boolean(run.leaseOwner || run.leaseToken || run.leaseUntil),
        sampleCompleted: true, judgmentExists: Boolean(judgment),
        dispatchIndexes: markers.map((marker) => Number(marker.dispatchIndex)),
        usage: {
          generations: Number(run.usageByPhase?.quick?.generations),
          judgments: Number(run.usageByPhase?.quick?.judgments),
          judgeCalls: Number(run.usageByPhase?.quick?.judgeCalls),
        },
      })
    }
    const inspected = await inspect()
    if (mode === 'inspect') {
      process.stdout.write(`${JSON.stringify({ schemaVersion: 1, mode, runId: input.runId, sampleId: input.sampleId, proofHash: input.proof.logSha256, inspection: inspected, workerEnabled: false })}\n`)
      return
    }
    const credentials = loadBenchCredentials(env)
    if (!credentials.openrouter) throw new Error('BENCHMARK_DISPATCH_RECONCILIATION_CREDENTIAL_MISSING')
    const oss = new OSS({
      region: required('PAPERBANANA_BENCH_OSS_REGION'), accessKeyId: required('PAPERBANANA_BENCH_OSS_ACCESS_KEY_ID'),
      accessKeySecret: required('PAPERBANANA_BENCH_OSS_ACCESS_KEY_SECRET'), bucket: required('PAPERBANANA_BENCH_OSS_BUCKET'),
      endpoint: required('PAPERBANANA_BENCH_OSS_INTERNAL_ENDPOINT'), secure: true, authorizationV4: true,
    })
    openRouterEgress = createOpenRouterJudgeEgress(env)
    const result = await reconcileConfirmedNotForwardedJudgeDispatch(input, {
      inspect,
      async claim() {
        const leaseToken = randomUUID()
        claimedRun = await runs.findOneAndUpdate(
          { _id: input.runId, state: 'paused', errorCode: 'UNKNOWN_PROVIDER_OUTCOME', leaseOwner: { $exists: false }, leaseToken: { $exists: false }, leaseUntil: { $exists: false }, 'dispatchReconciliations.dispatchId': { $ne: dispatchId } },
          { $set: { state: 'quick_running', leaseOwner: workerId, leaseToken, leaseUntil: new Date(Date.now() + config.leaseMs), heartbeatAt: new Date(), updatedAt: new Date() }, $push: { dispatchReconciliations: { schemaVersion: 1, dispatchId, retryDispatchId, resolution: 'confirmed_not_forwarded', proof: input.proof, operatorSha256, status: 'applying', createdAt: new Date() } } } as any,
          { returnDocument: 'after' },
        ) as Record<string, any> | null
        if (!claimedRun) throw new Error('BENCHMARK_DISPATCH_RECONCILIATION_CLAIM_CONFLICT')
        heartbeat = setInterval(() => { void repository.heartbeat(input.runId, workerId, claimedRun!.leaseToken, 'quick_running', config.leaseMs) }, config.heartbeatMs)
      },
      async reserveAndMark(index) {
        if (!claimedRun) throw new Error('BENCHMARK_DISPATCH_RECONCILIATION_LEASE_LOST')
        await repository.reserveBudget(input.runId, workerId, claimedRun.leaseToken, 'quick_running', 'judgeCall', Number(claimedRun.approval?.priceSnapshot?.estimatedPerJudgeCall || 0))
        await repository.beginJudgeDispatch(claimedRun as any, workerId, input.sampleId, input.provider, index)
      },
      async judge(beforeDispatch) {
        if (!sample) throw new Error('BENCHMARK_DISPATCH_RECONCILIATION_SAMPLE_MISSING')
        const object = await oss.get(String(sample.imageObjectKey || ''))
        return runProviderOperation(() => callBlindJudge({
          provider: input.provider, apiKey: credentials.openrouter,
          imageBase64: Buffer.from(object.content).toString('base64'), rubric: sample!.rubric, caption: String(sample!.caption || ''),
          fetchImpl: openRouterEgress!.fetch, beforeDispatch,
        }), { maxRetries: 1 })
      },
      async save(judgment) {
        if (!claimedRun) throw new Error('BENCHMARK_DISPATCH_RECONCILIATION_LEASE_LOST')
        await repository.forRun(claimedRun as any, workerId).saveJudgment(judgment)
      },
      async release() {
        if (!claimedRun) throw new Error('BENCHMARK_DISPATCH_RECONCILIATION_LEASE_LOST')
        const updated = await runs.updateOne(
          { _id: input.runId, state: 'quick_running', leaseOwner: workerId, leaseToken: claimedRun.leaseToken, 'dispatchReconciliations.dispatchId': dispatchId },
          { $set: { 'dispatchReconciliations.$[entry].status': 'completed', 'dispatchReconciliations.$[entry].completedAt': new Date(), updatedAt: new Date() }, $unset: { leaseOwner: '', leaseToken: '', leaseUntil: '', errorCode: '' } },
          { arrayFilters: [{ 'entry.dispatchId': dispatchId, 'entry.operatorSha256': operatorSha256 }] },
        )
        if (updated.modifiedCount !== 1) throw new Error('BENCHMARK_DISPATCH_RECONCILIATION_RELEASE_CONFLICT')
      },
      async pause(reason) {
        if (!claimedRun) return
        await runs.updateOne(
          { _id: input.runId, leaseOwner: workerId, leaseToken: claimedRun.leaseToken },
          { $set: { state: 'paused', errorCode: reason, 'dispatchReconciliations.$[entry].status': 'failed', updatedAt: new Date() }, $unset: { leaseOwner: '', leaseToken: '', leaseUntil: '' } },
          { arrayFilters: [{ 'entry.dispatchId': dispatchId, 'entry.operatorSha256': operatorSha256 }] },
        )
      },
    })
    const resultHash = createHash('sha256').update(JSON.stringify({ ...result, proofHash: input.proof.logSha256, operatorSha256 })).digest('hex')
    process.stdout.write(`${JSON.stringify({ schemaVersion: 1, mode, ...result, proofHash: input.proof.logSha256, operatorSha256, resultHash, workerEnabled: false })}\n`)
  } finally {
    if (heartbeat) clearInterval(heartbeat)
    await openRouterEgress?.close().catch(() => {})
    await client.close().catch(() => {})
  }
}

void main().catch(() => {
  process.stderr.write('BENCHMARK_DISPATCH_RECONCILIATION_FAILED\n')
  process.exitCode = 1
})
