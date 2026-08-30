import { createHash, randomUUID } from 'node:crypto'

import OSS from 'ali-oss'
import { MongoClient } from 'mongodb'
import { BENCHMARK_AXES, BENCHMARK_COLLECTIONS, canonicalHash } from '@paperbanana/benchmark-core'

import { createPublicWebpRenditions } from './public-evidence-renditions.js'

type AnyRecord = { _id?: any; [key: string]: any }

const env = process.env
const confirmation = 'backfill-public-evidence-disabled-worker'

function required(name: string) {
  const value = String(env[name] || '').trim()
  if (!value) throw new Error('BENCHMARK_PUBLIC_EVIDENCE_BACKFILL_INPUT_INVALID')
  return value
}

function exactScores(value: unknown): value is Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return BENCHMARK_AXES.every((axis) => Number.isFinite(Number((value as AnyRecord)[axis]))
    && Number((value as AnyRecord)[axis]) >= 0 && Number((value as AnyRecord)[axis]) <= 10)
}

function cappedScores(judgment: AnyRecord) {
  const scores = Object.fromEntries(BENCHMARK_AXES.map((axis) => [axis, Number(judgment.scores[axis])]))
  for (const redLine of Array.isArray(judgment.confirmedRedLines) ? judgment.confirmedRedLines : []) {
    if (BENCHMARK_AXES.includes(redLine.axis) && Number.isFinite(Number(redLine.cap))) {
      scores[redLine.axis] = Math.min(scores[redLine.axis], Number(redLine.cap))
    }
  }
  return scores
}

function verifiedRelease(release: AnyRecord | null, expectedHash: string) {
  const { _id: _storedId, releaseHash, ...releaseBase } = release || {}
  if (!release || releaseHash !== expectedHash || canonicalHash(releaseBase) !== releaseHash
    || release.evaluationMode !== 'codex_single' || release.profileStatus !== 'published') {
    throw new Error('BENCHMARK_PUBLIC_EVIDENCE_BACKFILL_RELEASE_INVALID')
  }
  return release
}

function eligibleModels(release: AnyRecord) {
  return (Array.isArray(release.models) ? release.models : []).filter((model: AnyRecord) => model.ranked === true
    && Number(model.sampleCount) >= 3
    && BENCHMARK_AXES.every((axis) => Number.isFinite(Number(model.dimensions?.[axis]?.mean))))
}

function progress(stage: string, completedModels: number, totalModels: number) {
  process.stderr.write(`${JSON.stringify({ event: 'public_evidence_backfill_progress', stage, completedModels, totalModels })}\n`)
}

async function main() {
  const mode = required('PAPERBANANA_PUBLIC_EVIDENCE_BACKFILL_MODE')
  if (!['inspect', 'apply'].includes(mode)) throw new Error('BENCHMARK_PUBLIC_EVIDENCE_BACKFILL_INPUT_INVALID')
  if (env.PAPERBANANA_BENCH_ENABLED !== 'false' || env.PAPERBANANA_BENCH_CONCURRENCY !== '1') {
    throw new Error('BENCHMARK_PUBLIC_EVIDENCE_BACKFILL_WORKER_GUARD')
  }
  if (mode === 'apply' && required('PAPERBANANA_PUBLIC_EVIDENCE_BACKFILL_CONFIRM') !== confirmation) {
    throw new Error('BENCHMARK_PUBLIC_EVIDENCE_BACKFILL_INPUT_INVALID')
  }
  const expectedReleaseHash = required('PAPERBANANA_PUBLIC_EVIDENCE_RELEASE_HASH').toLowerCase()
  if (!/^[a-f0-9]{64}$/.test(expectedReleaseHash)) throw new Error('BENCHMARK_PUBLIC_EVIDENCE_BACKFILL_INPUT_INVALID')

  const client = new MongoClient(required('PAPERBANANA_BENCH_MONGODB_URI'), {
    serverSelectionTimeoutMS: 10_000,
    connectTimeoutMS: 10_000,
    socketTimeoutMS: 15_000,
    waitQueueTimeoutMS: 10_000,
  })
  const owner = `public-evidence-backfill:${randomUUID()}`
  let lockClaimed = false
  try {
    await client.connect()
    const db = client.db(env.PAPERBANANA_BENCH_MONGO_DB || 'paperbanana_benchmark')
    const releases = db.collection<AnyRecord>(BENCHMARK_COLLECTIONS.releases)
    const runs = db.collection<AnyRecord>(BENCHMARK_COLLECTIONS.runs)
    const samples = db.collection<AnyRecord>(BENCHMARK_COLLECTIONS.samples)
    const judgments = db.collection<AnyRecord>(BENCHMARK_COLLECTIONS.judgments)
    const publicEvidence = db.collection<AnyRecord>(BENCHMARK_COLLECTIONS.publicEvidence)
    const release = verifiedRelease(await releases.findOne({ releaseHash: expectedReleaseHash }, { maxTimeMS: 10_000 }), expectedReleaseHash)
    const models = eligibleModels(release)
    if (!models.length) throw new Error('BENCHMARK_PUBLIC_EVIDENCE_BACKFILL_RELEASE_EMPTY')
    progress('release_verified', 0, models.length)

    const lockId = `benchmark-public-evidence-backfill-lock:${expectedReleaseHash}`
    if (mode === 'apply') {
      const now = new Date()
      const leaseUntil = new Date(now.getTime() + 30 * 60_000)
      try {
        const lock = await publicEvidence.findOneAndUpdate(
          { _id: lockId, $or: [{ leaseUntil: { $lte: now } }, { leaseUntil: { $exists: false } }, { owner }] },
          { $set: { owner, leaseUntil, updatedAt: now }, $setOnInsert: { _id: lockId, kind: 'backfill-lock', createdAt: now } },
          { upsert: true, returnDocument: 'after' },
        )
        if (lock?.owner !== owner) throw new Error('BENCHMARK_PUBLIC_EVIDENCE_BACKFILL_LOCKED')
        lockClaimed = true
      } catch (error: any) {
        if (error?.code === 11000) throw new Error('BENCHMARK_PUBLIC_EVIDENCE_BACKFILL_LOCKED')
        throw error
      }
    }

    const oss = mode === 'apply' ? new OSS({
      region: required('PAPERBANANA_BENCH_OSS_REGION'), accessKeyId: required('PAPERBANANA_BENCH_OSS_ACCESS_KEY_ID'),
      accessKeySecret: required('PAPERBANANA_BENCH_OSS_ACCESS_KEY_SECRET'), bucket: required('PAPERBANANA_BENCH_OSS_BUCKET'),
      endpoint: required('PAPERBANANA_BENCH_OSS_INTERNAL_ENDPOINT'), secure: true, authorizationV4: true,
    }) : null
    const rows: AnyRecord[] = []
    let sourceCount = 0
    for (const [modelIndex, model] of models.entries()) {
      const run = await runs.find({
        evaluationMode: 'codex_single', evaluationEpoch: release.methodology?.evaluationEpoch,
        modelId: model.modelId, provider: model.primaryAccessProvider || model.provider, state: 'published',
      }).maxTimeMS(10_000).sort({ updatedAt: -1 }).limit(1).next()
      const runProfileId = run ? `${run.releaseDraft?.models?.[0]?.canonicalModelId || ''}:${run.evaluationMode}:${run.evaluationEpoch}` : ''
      if (!run || runProfileId !== model.profileId) throw new Error(`BENCHMARK_PUBLIC_EVIDENCE_BACKFILL_RUN_MISSING:${model.profileId}`)
      const runSamples = await samples.find({ runId: run._id, phase: 'standard', status: 'completed' }).maxTimeMS(10_000).sort({ sampleId: 1 }).toArray()
      const accepted = await judgments.find({ runId: run._id, phase: 'standard', source: 'codex', accepted: true }).maxTimeMS(10_000).toArray()
      const bySample = new Map(accepted.map((judgment) => [judgment.sampleId, judgment]))
      if (runSamples.length < 3 || bySample.size !== runSamples.length) throw new Error(`BENCHMARK_PUBLIC_EVIDENCE_BACKFILL_REVIEW_INCOMPLETE:${model.profileId}`)
      for (const sample of runSamples) {
        const judgment = bySample.get(sample.sampleId)
        if (!judgment || !exactScores(judgment.scores) || !Array.isArray(judgment.evidence)
          || !judgment.evidence.length || judgment.evidence.some((note: unknown) => typeof note !== 'string' || !note.trim())
          || !/^[a-f0-9]{64}$/.test(String(sample.imageHash || ''))) {
          throw new Error(`BENCHMARK_PUBLIC_EVIDENCE_BACKFILL_SAMPLE_INVALID:${sample.sampleId}`)
        }
        sourceCount += 1
        if (mode === 'inspect') continue
        const result = await oss!.get(String(sample.imageObjectKey || ''))
        const bytes = Buffer.from(result.content)
        const actualHash = createHash('sha256').update(bytes).digest('hex')
        if (actualHash !== sample.imageHash) throw new Error(`BENCHMARK_PUBLIC_EVIDENCE_BACKFILL_HASH_MISMATCH:${sample.sampleId}`)
        const variants = await createPublicWebpRenditions({ png: bytes, sourceHash: sample.imageHash, store: oss! })
        await samples.updateOne(
          { _id: sample._id, imageHash: sample.imageHash, status: 'completed' },
          { $set: { publicRenditions: variants, publicEvidenceBackfilledAt: new Date() } },
        )
        rows.push({
          _id: `benchmark-public-evidence:${canonicalHash([expectedReleaseHash, model.profileId, sample.sampleId])}`,
          sourceReleaseHash: expectedReleaseHash, sampleId: sample.sampleId, caseId: sample.caseId,
          profileId: model.profileId, modelId: model.modelId, imageHash: sample.imageHash,
          actualOutputPixels: sample.actualOutputPixels, variants, scores: cappedScores(judgment),
          reviewNotes: judgment.evidence.map((note: string) => note.trim()), overallRank: model.overallRank,
          overallScore: model.overallScore, createdAt: new Date(), updatedAt: new Date(),
        })
      }
      progress('model_verified', modelIndex + 1, models.length)
    }
    progress('source_verified', models.length, models.length)
    if (mode === 'apply') {
      if (rows.length !== sourceCount) throw new Error('BENCHMARK_PUBLIC_EVIDENCE_BACKFILL_ROW_COUNT_MISMATCH')
      await publicEvidence.bulkWrite(rows.map((document) => ({
        updateOne: { filter: { _id: document._id }, update: { $setOnInsert: document }, upsert: true },
      })), { ordered: false })
      const published = await publicEvidence.countDocuments({ sourceReleaseHash: expectedReleaseHash })
      if (published !== rows.length) throw new Error('BENCHMARK_PUBLIC_EVIDENCE_BACKFILL_PUBLISH_COUNT_MISMATCH')
      await publicEvidence.updateOne({ _id: lockId, owner }, { $set: { completedAt: new Date(), published }, $unset: { owner: '', leaseUntil: '' } })
      lockClaimed = false
    }
    process.stdout.write(`${JSON.stringify({ schemaVersion: 1, mode, releaseHash: expectedReleaseHash, eligibleModelCount: models.length, sourceCount, publishedCount: mode === 'apply' ? rows.length : 0, generatedOrJudgeCalls: 0 })}\n`)
  } finally {
    if (lockClaimed) {
      const db = client.db(env.PAPERBANANA_BENCH_MONGO_DB || 'paperbanana_benchmark')
      await db.collection<AnyRecord>(BENCHMARK_COLLECTIONS.publicEvidence).updateOne(
        { _id: `benchmark-public-evidence-backfill-lock:${expectedReleaseHash}`, owner },
        { $unset: { owner: '', leaseUntil: '' }, $set: { failedAt: new Date() } },
      ).catch(() => {})
    }
    await client.close(true).catch(() => {})
  }
}

await main()
