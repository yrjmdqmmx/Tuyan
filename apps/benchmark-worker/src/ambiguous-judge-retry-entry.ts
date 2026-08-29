import { createHash, randomUUID } from 'node:crypto'

import OSS from 'ali-oss'
import { MongoClient } from 'mongodb'

import { loadBuildProvenance } from './build-provenance.js'
import { loadBenchCredentials, parseWorkerConfig } from './config.js'
import { retryUserAuthorizedAmbiguousJudgeDispatch } from './dispatch-reconciliation.js'
import { callBlindJudge } from './judge-provider.js'
import { createWorkerMongoRepository } from './mongo-repository.js'
import { runProviderOperation } from './provider-operation.js'

const env = process.env
const authorization = 'retry-one-ambiguous-bailian-judgment-disabled-worker' as const

function required(name: string) {
  const value = String(env[name] || '').trim()
  if (!value) throw new Error('BENCHMARK_AMBIGUOUS_RETRY_INPUT_INVALID')
  return value
}

async function main() {
  const mode = required('PAPERBANANA_AMBIGUOUS_RETRY_MODE')
  if (!['inspect', 'apply'].includes(mode)) throw new Error('BENCHMARK_AMBIGUOUS_RETRY_INPUT_INVALID')
  if (mode === 'apply' && required('PAPERBANANA_AMBIGUOUS_RETRY_CONFIRM') !== authorization) throw new Error('BENCHMARK_AMBIGUOUS_RETRY_INPUT_INVALID')
  if (env.PAPERBANANA_BENCH_ENABLED !== 'false' || env.PAPERBANANA_BENCH_CONCURRENCY !== '1') throw new Error('BENCHMARK_AMBIGUOUS_RETRY_WORKER_GUARD')
  const expectedSha = required('PAPERBANANA_AMBIGUOUS_RETRY_EXPECTED_SHA')
  const operatorSha256 = required('PAPERBANANA_AMBIGUOUS_RETRY_OPERATOR_SHA256')
  if (!/^[a-f0-9]{40}$/.test(expectedSha) || !/^[a-f0-9]{64}$/.test(operatorSha256)) throw new Error('BENCHMARK_AMBIGUOUS_RETRY_INPUT_INVALID')
  if ((await loadBuildProvenance()).codeSha !== expectedSha || env.PAPERBANANA_CODE_SHA !== expectedSha) throw new Error('BENCHMARK_AMBIGUOUS_RETRY_PROVENANCE_MISMATCH')

  const input = {
    runId: required('PAPERBANANA_AMBIGUOUS_RETRY_RUN_ID'),
    sampleId: required('PAPERBANANA_AMBIGUOUS_RETRY_SAMPLE_ID'),
    phase: 'quick' as const,
    provider: 'bailian' as const,
    failedDispatchIndex: 0 as const,
    retryDispatchIndex: 1 as const,
    authorization,
  }
  const client = new MongoClient(required('PAPERBANANA_BENCH_MONGODB_URI'))
  const config = parseWorkerConfig(env)
  const workerId = `benchmark-ambiguous-retry:${randomUUID()}`
  let claimedRun: Record<string, any> | null = null
  let heartbeat: ReturnType<typeof setInterval> | undefined
  try {
    await client.connect()
    const db = client.db(config.mongoDbName)
    const runs = db.collection<any>('paperbanana_benchmark_runs')
    const samples = db.collection<any>('paperbanana_benchmark_samples')
    const judgments = db.collection<any>('paperbanana_benchmark_judgments')
    const dispatches = db.collection<any>('paperbanana_benchmark_dispatches')
    const repository = createWorkerMongoRepository(db)
    const dispatchId = `dispatch:bailian:${input.sampleId}:0`
    const retryDispatchId = `dispatch:bailian:${input.sampleId}:1`
    const authorizationHash = createHash('sha256').update(authorization).digest('hex')
    let sample: Record<string, any> | null = null

    const inspect = async () => {
      const run = await runs.findOne({ _id: input.runId })
      sample = await samples.findOne({ _id: input.sampleId, runId: input.runId })
      const judgment = await judgments.findOne({ _id: `bailian:${input.sampleId}:${run?.judgeEpoch || ''}`, status: 'completed' })
      const markers = await dispatches.find({ runId: input.runId, sampleId: input.sampleId, logicalProvider: 'bailian' }).sort({ dispatchIndex: 1 }).toArray()
      const byProvider = await judgments.aggregate([
        { $match: { runId: input.runId, phase: 'quick', status: 'completed' } },
        { $group: { _id: '$provider', count: { $sum: 1 } } },
      ]).toArray()
      const counts = Object.fromEntries(byProvider.map((item) => [String(item._id), Number(item.count)]))
      const exactKeys = ['_id', 'dispatchIndex', 'judgeEpoch', 'logicalProvider', 'phase', 'runId', 'sampleId']
      if (!run || run.codeSha !== expectedSha || run.provider !== 'bailian' || run.modelId !== 'qwen-image-2.0-pro'
        || run.lane !== '2K-standard' || run.suiteId !== 'pb-image-diagnostic-v1' || run.judgeEpoch !== 'judge-2026-08-v1'
        || !sample || sample.phase !== 'quick' || sample.status !== 'completed'
        || counts.openrouter !== 24 || counts.bailian !== 8
        || await dispatches.countDocuments({ runId: input.runId }) !== 34
        || markers.some((marker) => JSON.stringify(Object.keys(marker).sort()) !== JSON.stringify(exactKeys)
          || marker._id !== `dispatch:${marker.logicalProvider}:${marker.sampleId}:${marker.dispatchIndex}`)
        || await dispatches.countDocuments({ _id: retryDispatchId }) !== 0) throw new Error('BENCHMARK_AMBIGUOUS_RETRY_STATE_INVALID')
      return {
        runState: String(run.state), errorCode: String(run.errorCode || ''),
        hasLease: Boolean(run.leaseOwner || run.leaseToken || run.leaseUntil),
        sampleCompleted: true, judgmentExists: Boolean(judgment),
        dispatchIndexes: markers.map((marker) => Number(marker.dispatchIndex)),
        usage: {
          generations: Number(run.usageByPhase?.quick?.generations),
          judgments: Number(run.usageByPhase?.quick?.judgments),
          judgeCalls: Number(run.usageByPhase?.quick?.judgeCalls),
        },
      }
    }

    const inspected = await inspect()
    if (mode === 'inspect') {
      process.stdout.write(`${JSON.stringify({ schemaVersion: 1, mode, runId: input.runId, sampleId: input.sampleId, authorizationHash, inspection: inspected, workerEnabled: false })}\n`)
      return
    }
    const credentials = loadBenchCredentials(env)
    if (!credentials.bailian) throw new Error('BENCHMARK_AMBIGUOUS_RETRY_CREDENTIAL_MISSING')
    const oss = new OSS({
      region: required('PAPERBANANA_BENCH_OSS_REGION'), accessKeyId: required('PAPERBANANA_BENCH_OSS_ACCESS_KEY_ID'),
      accessKeySecret: required('PAPERBANANA_BENCH_OSS_ACCESS_KEY_SECRET'), bucket: required('PAPERBANANA_BENCH_OSS_BUCKET'),
      endpoint: required('PAPERBANANA_BENCH_OSS_INTERNAL_ENDPOINT'), secure: true, authorizationV4: true,
    })
    const result = await retryUserAuthorizedAmbiguousJudgeDispatch(input, {
      inspect,
      async claim() {
        const leaseToken = randomUUID()
        claimedRun = await runs.findOneAndUpdate(
          { _id: input.runId, state: 'paused', errorCode: 'UNKNOWN_PROVIDER_OUTCOME', leaseOwner: { $exists: false }, leaseToken: { $exists: false }, leaseUntil: { $exists: false }, 'dispatchReconciliations.retryDispatchId': { $ne: retryDispatchId } },
          { $set: { state: 'quick_running', leaseOwner: workerId, leaseToken, leaseUntil: new Date(Date.now() + config.leaseMs), heartbeatAt: new Date(), updatedAt: new Date() }, $push: { dispatchReconciliations: { schemaVersion: 1, dispatchId, retryDispatchId, resolution: 'user_authorized_ambiguous_retry', authorizationHash, operatorSha256, status: 'applying', createdAt: new Date() } } } as any,
          { returnDocument: 'after' },
        ) as Record<string, any> | null
        if (!claimedRun) throw new Error('BENCHMARK_AMBIGUOUS_RETRY_CLAIM_CONFLICT')
        heartbeat = setInterval(() => { void repository.heartbeat(input.runId, workerId, claimedRun!.leaseToken, 'quick_running', config.leaseMs) }, config.heartbeatMs)
      },
      async reserveAndMark(index) {
        if (!claimedRun) throw new Error('BENCHMARK_AMBIGUOUS_RETRY_LEASE_LOST')
        await repository.reserveBudget(input.runId, workerId, claimedRun.leaseToken, 'quick_running', 'judgeCall', Number(claimedRun.approval?.priceSnapshot?.estimatedPerJudgeCall || 0))
        await repository.beginJudgeDispatch(claimedRun as any, workerId, input.sampleId, 'bailian', index)
      },
      async judge(beforeDispatch) {
        if (!sample) throw new Error('BENCHMARK_AMBIGUOUS_RETRY_SAMPLE_MISSING')
        const object = await oss.get(String(sample.imageObjectKey || ''))
        return runProviderOperation(() => callBlindJudge({
          provider: 'bailian', apiKey: credentials.bailian!,
          imageBase64: Buffer.from(object.content).toString('base64'), rubric: sample!.rubric, caption: String(sample!.caption || ''),
          beforeDispatch,
        }), { maxRetries: 1 })
      },
      async save(judgment) {
        if (!claimedRun) throw new Error('BENCHMARK_AMBIGUOUS_RETRY_LEASE_LOST')
        await repository.forRun(claimedRun as any, workerId).saveJudgment(judgment)
      },
      async release() {
        if (!claimedRun) throw new Error('BENCHMARK_AMBIGUOUS_RETRY_LEASE_LOST')
        const updated = await runs.updateOne(
          { _id: input.runId, state: 'quick_running', leaseOwner: workerId, leaseToken: claimedRun.leaseToken, 'dispatchReconciliations.retryDispatchId': retryDispatchId },
          { $set: { 'dispatchReconciliations.$[entry].status': 'completed', 'dispatchReconciliations.$[entry].completedAt': new Date(), updatedAt: new Date() }, $unset: { leaseOwner: '', leaseToken: '', leaseUntil: '', errorCode: '' } },
          { arrayFilters: [{ 'entry.retryDispatchId': retryDispatchId, 'entry.operatorSha256': operatorSha256 }] },
        )
        if (updated.modifiedCount !== 1) throw new Error('BENCHMARK_AMBIGUOUS_RETRY_RELEASE_CONFLICT')
      },
      async pause(reason) {
        if (!claimedRun) return
        await runs.updateOne(
          { _id: input.runId, leaseOwner: workerId, leaseToken: claimedRun.leaseToken },
          { $set: { state: 'paused', errorCode: reason, 'dispatchReconciliations.$[entry].status': 'failed', updatedAt: new Date() }, $unset: { leaseOwner: '', leaseToken: '', leaseUntil: '' } },
          { arrayFilters: [{ 'entry.retryDispatchId': retryDispatchId, 'entry.operatorSha256': operatorSha256 }] },
        )
      },
    })
    const resultHash = createHash('sha256').update(JSON.stringify({ ...result, authorizationHash, operatorSha256 })).digest('hex')
    process.stdout.write(`${JSON.stringify({ schemaVersion: 1, mode, ...result, authorizationHash, operatorSha256, resultHash, workerEnabled: false })}\n`)
  } finally {
    if (heartbeat) clearInterval(heartbeat)
    await client.close().catch(() => {})
  }
}

void main().catch(() => {
  process.stderr.write('BENCHMARK_AMBIGUOUS_RETRY_FAILED\n')
  process.exitCode = 1
})
