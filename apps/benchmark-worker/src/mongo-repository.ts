import { BENCHMARK_COLLECTIONS } from '@paperbanana/benchmark-core'
import { randomUUID } from 'node:crypto'
import type { Db } from 'mongodb'

type AnyRecord = { _id: string; [key: string]: any }

export async function listIndexesOrEmpty(collection: { indexes(): Promise<any[]> }) {
  try { return await collection.indexes() }
  catch (error: any) {
    if (error?.code === 26 || error?.codeName === 'NamespaceNotFound') return []
    throw error
  }
}

export function createWorkerMongoRepository(db: Db, now = () => new Date()) {
  const models = db.collection<AnyRecord>(BENCHMARK_COLLECTIONS.models)
  const runs = db.collection<AnyRecord>(BENCHMARK_COLLECTIONS.runs)
  const samples = db.collection<AnyRecord>(BENCHMARK_COLLECTIONS.samples)
  const judgments = db.collection<AnyRecord>(BENCHMARK_COLLECTIONS.judgments)

  return {
    async ensureIndexes() {
      const legacyJudgmentIndex = 'runId_1_sampleId_1_provider_1_judgeEpoch_1'
      const existingJudgmentIndexes = await listIndexesOrEmpty(judgments)
      if (existingJudgmentIndexes.some((index) => index.name === legacyJudgmentIndex)) await judgments.dropIndex(legacyJudgmentIndex)
      await Promise.all([
        models.createIndex({ provider: 1, modelId: 1 }, { unique: true }),
        runs.createIndex({ state: 1, leaseUntil: 1 }),
        samples.createIndex({ runId: 1, caseId: 1, repetition: 1 }, { unique: true }),
        samples.createIndex({ retentionExpiresAt: 1 }, { expireAfterSeconds: 0 }),
        judgments.createIndex({ runId: 1, sampleId: 1, provider: 1, judgeEpoch: 1 }, { unique: true, name: 'automatic_judgment_unique', partialFilterExpression: { status: 'completed' } }),
        judgments.createIndex({ runId: 1, sampleId: 1, source: 1, packetHash: 1, reviewHash: 1 }, { unique: true, name: 'codex_packet_judgment_unique', partialFilterExpression: { source: 'codex' } }),
      ])
    },
    async registrySnapshot() { return models.findOne({ _id: 'benchmark-registry-latest' }) },
    async saveRegistrySnapshot(snapshot: any, registryHash: string) {
      await models.updateOne({ _id: 'benchmark-registry-latest' }, { $set: { snapshot, registryHash, capturedAt: now() } }, { upsert: true })
    },
    async saveCandidates(candidates: any[]) {
      for (const candidate of candidates) {
        await models.updateOne(
          { _id: candidate.candidateId },
          { $setOnInsert: { _id: candidate.candidateId, ...candidate, detectedAt: now(), updatedAt: now() } },
          { upsert: true },
        )
      }
      return candidates.length
    },
    async acquireRun(workerId: string, leaseMs: number) {
      const timestamp = now()
      const leaseToken = randomUUID()
      return runs.findOneAndUpdate(
        { state: { $in: ['quick_running', 'full_running'] }, $or: [{ leaseUntil: { $exists: false } }, { leaseUntil: { $lte: timestamp } }] },
        { $set: { leaseOwner: workerId, leaseToken, leaseUntil: new Date(timestamp.getTime() + leaseMs), heartbeatAt: timestamp } },
        { sort: { createdAt: 1 }, returnDocument: 'after' },
      )
    },
    async heartbeat(runId: string, workerId: string, leaseToken: string, expectedState: string, leaseMs: number) {
      const result = await runs.updateOne({ _id: runId, leaseOwner: workerId, leaseToken, state: expectedState }, { $set: { heartbeatAt: now(), leaseUntil: new Date(now().getTime() + leaseMs) } })
      return result.modifiedCount === 1
    },
    async reserveBudget(runId: string, workerId: string, leaseToken: string, expectedState: string, kind: 'generation' | 'judgment', estimatedUsd: number) {
      const timestamp = now()
      const leaseFilter = { _id: runId, leaseOwner: workerId, leaseToken, state: expectedState, leaseUntil: { $gt: timestamp } }
      const run = await runs.findOne(leaseFilter)
      if (!run) throw new Error('BENCHMARK_RUN_LEASE_LOST')
      const usage = run.usage || { generations: 0, judgments: 0, estimatedUsd: 0 }
      const limits = run.approval || {}
      const generations = Number(usage.generations || 0) + (kind === 'generation' ? 1 : 0)
      const judgmentCount = Number(usage.judgments || 0) + (kind === 'judgment' ? 1 : 0)
      const cost = Number(usage.estimatedUsd || 0) + estimatedUsd
      const reason = generations > Number(limits.maxGenerations) ? 'GENERATIONS'
        : judgmentCount > Number(limits.maxJudgeCalls) ? 'JUDGMENTS'
          : cost > Number(limits.maxEstimatedUsd) ? 'COST' : ''
      if (reason) {
        await runs.updateOne(leaseFilter, { $set: { state: 'paused', pauseReason: `BENCHMARK_BUDGET_PAUSED:${reason}`, updatedAt: now() }, $unset: { leaseOwner: '', leaseToken: '', leaseUntil: '' } })
        throw new Error(`BENCHMARK_BUDGET_PAUSED:${reason}`)
      }
      const result = await runs.updateOne(
        { ...leaseFilter, 'usage.generations': Number(usage.generations || 0), 'usage.judgments': Number(usage.judgments || 0), 'usage.estimatedUsd': Number(usage.estimatedUsd || 0) },
        { $set: { usage: { generations, judgments: judgmentCount, estimatedUsd: cost }, updatedAt: now() } },
      )
      if (result.modifiedCount !== 1) throw new Error('BENCHMARK_BUDGET_CONFLICT')
    },
    async finishWithError(runId: string, workerId: string, leaseToken: string, expectedState: string, state: 'paused' | 'failed', reason: string) {
      await runs.updateOne(
        { _id: runId, leaseOwner: workerId, leaseToken, state: expectedState },
        { $set: { state, errorCode: reason.slice(0, 160), updatedAt: now() }, $unset: { leaseOwner: '', leaseToken: '', leaseUntil: '' } },
      )
    },
    async beginJudgeDispatch(run: AnyRecord, workerId: string, sampleId: string, provider: string, dispatchIndex: number) {
      const lease = await runs.findOne({ _id: run._id, leaseOwner: workerId, leaseToken: run.leaseToken, state: run.state, leaseUntil: { $gt: now() } })
      if (!lease) throw new Error('BENCHMARK_RUN_LEASE_LOST')
      const operationId = `dispatch:${provider}:${sampleId}:${dispatchIndex}`
      try {
        await judgments.insertOne({ _id: operationId, runId: run._id, sampleId, provider: `dispatch:${provider}:${dispatchIndex}`, judgeEpoch: run.judgeEpoch, status: 'dispatched', leaseToken: run.leaseToken, createdAt: now() })
      } catch (error: any) {
        if (error?.code === 11000) throw new Error('UNKNOWN_PROVIDER_OUTCOME:JUDGE_DISPATCH_ALREADY_RECORDED')
        throw error
      }
    },
    async cancelJudgeDispatch(run: AnyRecord, sampleId: string, provider: string, dispatchIndex: number) {
      await judgments.deleteOne({ _id: `dispatch:${provider}:${sampleId}:${dispatchIndex}`, leaseToken: run.leaseToken, status: 'dispatched' })
    },
    async beginSampleDispatch(run: AnyRecord, workerId: string, sample: { sampleId: string; caseId: string; repetition: number }) {
      const lease = await runs.findOne({ _id: run._id, leaseOwner: workerId, leaseToken: run.leaseToken, state: run.state, leaseUntil: { $gt: now() } })
      if (!lease) throw new Error('BENCHMARK_RUN_LEASE_LOST')
      try {
        await samples.insertOne({ _id: sample.sampleId, ...sample, runId: run._id, status: 'dispatched', leaseToken: run.leaseToken, createdAt: now() })
      } catch (error: any) {
        if (error?.code === 11000) throw new Error('UNKNOWN_PROVIDER_OUTCOME:SAMPLE_DISPATCH_ALREADY_RECORDED')
        throw error
      }
    },
    forRun(run: AnyRecord, workerId: string) {
      return {
        async findSample(sampleId: string) {
          const sample = await samples.findOne({ _id: sampleId, runId: run._id })
          if (sample?.status === 'dispatched') throw new Error('UNKNOWN_PROVIDER_OUTCOME:SAMPLE_DISPATCH_ALREADY_RECORDED')
          return sample?.status === 'completed' ? sample as any : null
        },
        async saveSample(sample: any) {
          const result = await samples.updateOne({ _id: sample.sampleId, runId: run._id, status: 'dispatched', leaseToken: run.leaseToken }, { $set: { ...sample, status: 'completed', completedAt: now() }, $unset: { leaseToken: '' } })
          if (result.modifiedCount !== 1) throw new Error('BENCHMARK_SAMPLE_COMMIT_CONFLICT')
        },
        async findJudgment(sampleId: string, provider: string) { return judgments.findOne({ _id: `${provider}:${sampleId}:${run.judgeEpoch}`, status: 'completed' }) as any },
        async saveJudgment(judgment: any) {
          await judgments.updateOne({ _id: `${judgment.provider}:${judgment.sampleId}:${run.judgeEpoch}` }, { $setOnInsert: { _id: `${judgment.provider}:${judgment.sampleId}:${run.judgeEpoch}`, ...judgment, runId: run._id, judgeEpoch: run.judgeEpoch, status: 'completed', createdAt: now() } }, { upsert: true })
        },
        async markAudits(sampleIds: string[]) { await samples.updateMany({ _id: { $in: sampleIds }, runId: run._id }, { $set: { auditRequired: true } }) },
        async completeRun(nextState: string, summary: Record<string, unknown> = {}) {
          const result = await runs.updateOne(
            { _id: run._id, leaseOwner: workerId, leaseToken: run.leaseToken, state: run.state },
            { $set: { state: nextState, ...summary, updatedAt: now() }, $unset: { leaseOwner: '', leaseToken: '', leaseUntil: '' } },
          )
          if (result.modifiedCount !== 1) throw new Error('BENCHMARK_RUN_LEASE_LOST')
        },
      }
    },
  }
}
