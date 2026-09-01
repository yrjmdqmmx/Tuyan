const fs = require('node:fs')

const report = JSON.parse(fs.readFileSync(process.env.PAPERBANANA_V1_REPORT_PATH, 'utf8'))
const archiveManifestHash = String(process.env.PAPERBANANA_V1_ARCHIVE_MANIFEST_HASH || '')
if (report?.schemaVersion !== 1 || report.mode !== 'delete-objects' || report.generatedOrJudgeCalls !== 0
  || !/^[a-f0-9]{64}$/.test(report.releaseHash || '') || !/^[a-f0-9]{64}$/.test(report.activeV2ReleaseHash || '')
  || !/^[a-f0-9]{64}$/.test(report.inventory?.inventoryHash || '') || !/^[a-f0-9]{64}$/.test(archiveManifestHash)
  || report.objectDeletion?.inventoryHash !== report.inventory.inventoryHash) throw new Error('V1_RETIREMENT_MONGO_INPUT_INVALID')

const benchmark = db.getSiblingDB('paperbanana_benchmark')
const releases = benchmark.getCollection('paperbanana_benchmark_releases')
const runs = benchmark.getCollection('paperbanana_benchmark_runs')
const samples = benchmark.getCollection('paperbanana_benchmark_samples')
const judgments = benchmark.getCollection('paperbanana_benchmark_judgments')
const dispatches = benchmark.getCollection('paperbanana_benchmark_dispatches')
const publicEvidence = benchmark.getCollection('paperbanana_benchmark_public_evidence')
const tombstones = benchmark.getCollection('paperbanana_benchmark_release_tombstones')
const identity = report.inventory.identity
if (identity?.suiteId !== 'pb-image-light-v1' || identity?.evaluationMode !== 'codex_single'
  || identity?.evaluationEpoch !== 'codex-single-2026-08-v1' || identity?.reviewProtocol !== 'codex-single-two-pass-v1') {
  throw new Error('V1_RETIREMENT_MONGO_IDENTITY_INVALID')
}
if (releases.countDocuments({ releaseHash: report.activeV2ReleaseHash, suiteId: 'pb-scientific-figure-v2', evaluationMode: 'codex_scientific_v2', profileStatus: 'published' }) !== 1) {
  throw new Error('V1_RETIREMENT_MONGO_ACTIVE_V2_INVALID')
}
if (releases.countDocuments({ releaseHash: report.releaseHash, ...identity, profileStatus: 'published' }) !== 1) throw new Error('V1_RETIREMENT_MONGO_RELEASE_INVALID')

const ids = report.inventory.targetRunIds.map((value) => /^[a-f0-9]{24}$/.test(value) ? ObjectId(value) : value)
const expected = report.inventory.dbCounts
const actual = {
  releases: releases.countDocuments({ releaseHash: report.releaseHash }),
  runs: runs.countDocuments({ _id: { $in: ids }, ...identity }),
  samples: samples.countDocuments({ runId: { $in: ids } }),
  judgments: judgments.countDocuments({ runId: { $in: ids } }),
  dispatches: dispatches.countDocuments({ runId: { $in: ids } }),
  publicEvidence: publicEvidence.countDocuments({ sourceReleaseHash: report.releaseHash }),
}
for (const key of Object.keys(expected)) if (actual[key] !== expected[key]) throw new Error(`V1_RETIREMENT_MONGO_COUNT_MISMATCH:${key}`)

const tombstoneId = `v1-retirement:${report.releaseHash}`
const existing = tombstones.findOne({ _id: tombstoneId })
if (existing && (existing.inventoryHash !== report.inventory.inventoryHash || existing.archiveManifestHash !== archiveManifestHash || existing.status === 'retired')) {
  throw new Error('V1_RETIREMENT_MONGO_TOMBSTONE_CONFLICT')
}
tombstones.updateOne({ _id: tombstoneId }, { $setOnInsert: {
  _id: tombstoneId, releaseHash: report.releaseHash, ...identity,
  inventoryHash: report.inventory.inventoryHash, archiveManifestHash,
  objectCount: report.objectDeletion.deletedObjectCount, objectBytes: report.objectDeletion.deletedBytes,
  dbCounts: expected, status: 'retiring', startedAt: new Date(),
} }, { upsert: true })

const deleted = {
  dispatches: dispatches.deleteMany({ runId: { $in: ids } }).deletedCount,
  judgments: judgments.deleteMany({ runId: { $in: ids } }).deletedCount,
  samples: samples.deleteMany({ runId: { $in: ids } }).deletedCount,
  runs: runs.deleteMany({ _id: { $in: ids }, ...identity }).deletedCount,
  publicEvidence: publicEvidence.deleteMany({ sourceReleaseHash: report.releaseHash }).deletedCount,
  releases: releases.deleteMany({ releaseHash: report.releaseHash, ...identity }).deletedCount,
}
publicEvidence.deleteOne({ _id: `benchmark-public-evidence-backfill-lock:${report.releaseHash}` })
for (const key of Object.keys(expected)) if (deleted[key] !== expected[key]) throw new Error(`V1_RETIREMENT_MONGO_DELETE_COUNT_MISMATCH:${key}`)
if (releases.countDocuments({ releaseHash: report.activeV2ReleaseHash, suiteId: 'pb-scientific-figure-v2', evaluationMode: 'codex_scientific_v2', profileStatus: 'published' }) !== 1) {
  throw new Error('V1_RETIREMENT_MONGO_ACTIVE_V2_CHANGED')
}
tombstones.updateOne({ _id: tombstoneId, status: 'retiring' }, { $set: { status: 'retired', completedAt: new Date(), deleted } })
print(JSON.stringify({ schemaVersion: 1, releaseHash: report.releaseHash, activeV2ReleaseHash: report.activeV2ReleaseHash,
  inventoryHash: report.inventory.inventoryHash, archiveManifestHash, deleted, tombstoneId, status: 'retired', generatedOrJudgeCalls: 0 }))
