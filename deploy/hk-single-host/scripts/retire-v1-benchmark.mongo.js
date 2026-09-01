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
const ids = report.inventory.targetRunIds.map((value) => /^[a-f0-9]{24}$/.test(value) ? ObjectId(value) : value)
const expected = report.inventory.dbCounts
const tombstoneId = `v1-retirement:${report.releaseHash}`
const existing = tombstones.findOne({ _id: tombstoneId })
const countTargets = () => ({
  releases: releases.countDocuments({ releaseHash: report.releaseHash }),
  runs: runs.countDocuments({ _id: { $in: ids }, ...identity }),
  samples: samples.countDocuments({ runId: { $in: ids } }),
  judgments: judgments.countDocuments({ runId: { $in: ids } }),
  dispatches: dispatches.countDocuments({ runId: { $in: ids } }),
  publicEvidence: publicEvidence.countDocuments({ sourceReleaseHash: report.releaseHash }),
})
const countKeys = Object.keys(expected)
if (countKeys.length !== 6 || countKeys.some((key) => !Number.isSafeInteger(expected[key]) || expected[key] < 0)) {
  throw new Error('V1_RETIREMENT_MONGO_EXPECTED_COUNTS_INVALID')
}
if (existing && (existing.releaseHash !== report.releaseHash
  || existing.inventoryHash !== report.inventory.inventoryHash
  || existing.archiveManifestHash !== archiveManifestHash
  || existing.objectCount !== report.objectDeletion.deletedObjectCount
  || existing.objectBytes !== report.objectDeletion.deletedBytes
  || !['retiring', 'retired'].includes(existing.status)
  || Object.keys(existing.dbCounts || {}).length !== countKeys.length
  || countKeys.some((key) => existing.dbCounts[key] !== expected[key]))) {
  throw new Error('V1_RETIREMENT_MONGO_TOMBSTONE_CONFLICT')
}
const actual = countTargets()
let receipt
if (existing?.status === 'retired') {
  if (countKeys.some((key) => actual[key] !== 0 || existing.deleted?.[key] !== expected[key])) {
    throw new Error('V1_RETIREMENT_MONGO_REPLAY_STATE_INVALID')
  }
  receipt = { schemaVersion: 1, releaseHash: report.releaseHash, activeV2ReleaseHash: report.activeV2ReleaseHash,
    inventoryHash: report.inventory.inventoryHash, archiveManifestHash, deleted: existing.deleted, tombstoneId,
    status: 'retired', replayed: true, generatedOrJudgeCalls: 0 }
} else {
  if (!existing) {
    if (releases.countDocuments({ releaseHash: report.releaseHash, ...identity, profileStatus: 'published' }) !== 1
      || countKeys.some((key) => actual[key] !== expected[key])) throw new Error('V1_RETIREMENT_MONGO_COUNT_MISMATCH')
    tombstones.updateOne({ _id: tombstoneId }, { $setOnInsert: {
      _id: tombstoneId, releaseHash: report.releaseHash, ...identity,
      inventoryHash: report.inventory.inventoryHash, archiveManifestHash,
      objectCount: report.objectDeletion.deletedObjectCount, objectBytes: report.objectDeletion.deletedBytes,
      dbCounts: expected, status: 'retiring', startedAt: new Date(),
    } }, { upsert: true })
  } else if (countKeys.some((key) => actual[key] > expected[key] || actual[key] < 0)) {
    throw new Error('V1_RETIREMENT_MONGO_RESUME_COUNT_INVALID')
  }

  const previouslyDeleted = Object.fromEntries(countKeys.map((key) => [key, expected[key] - actual[key]]))
  const newlyDeleted = {
    dispatches: dispatches.deleteMany({ runId: { $in: ids } }).deletedCount,
    judgments: judgments.deleteMany({ runId: { $in: ids } }).deletedCount,
    samples: samples.deleteMany({ runId: { $in: ids } }).deletedCount,
    runs: runs.deleteMany({ _id: { $in: ids }, ...identity }).deletedCount,
    publicEvidence: publicEvidence.deleteMany({ sourceReleaseHash: report.releaseHash }).deletedCount,
    releases: releases.deleteMany({ releaseHash: report.releaseHash, ...identity }).deletedCount,
  }
  publicEvidence.deleteOne({ _id: `benchmark-public-evidence-backfill-lock:${report.releaseHash}` })
  const deleted = Object.fromEntries(countKeys.map((key) => [key, previouslyDeleted[key] + newlyDeleted[key]]))
  for (const key of countKeys) if (deleted[key] !== expected[key]) throw new Error(`V1_RETIREMENT_MONGO_DELETE_COUNT_MISMATCH:${key}`)
  const remaining = countTargets()
  for (const key of countKeys) if (remaining[key] !== 0) throw new Error(`V1_RETIREMENT_MONGO_REMAINING_COUNT_MISMATCH:${key}`)
  if (releases.countDocuments({ releaseHash: report.activeV2ReleaseHash, suiteId: 'pb-scientific-figure-v2', evaluationMode: 'codex_scientific_v2', profileStatus: 'published' }) !== 1) {
    throw new Error('V1_RETIREMENT_MONGO_ACTIVE_V2_CHANGED')
  }
  const finalized = tombstones.updateOne({ _id: tombstoneId, status: { $in: ['retiring', 'retired'] } }, { $set: { status: 'retired', completedAt: new Date(), deleted } })
  if (finalized.matchedCount !== 1) throw new Error('V1_RETIREMENT_MONGO_TOMBSTONE_FINALIZE_CONFLICT')
  receipt = { schemaVersion: 1, releaseHash: report.releaseHash, activeV2ReleaseHash: report.activeV2ReleaseHash,
    inventoryHash: report.inventory.inventoryHash, archiveManifestHash, deleted, tombstoneId, status: 'retired',
    replayed: false, resumed: Boolean(existing), generatedOrJudgeCalls: 0 }
}
const serializedReceipt = JSON.stringify(receipt)
const receiptPath = String(process.env.PAPERBANANA_V1_RECEIPT_PATH || '')
if (receiptPath) {
  if (!/^\/tmp\/paperbanana-v1-retirement-receipt(?:-[a-zA-Z0-9-]+)?\.json$/.test(receiptPath)) {
    throw new Error('V1_RETIREMENT_MONGO_RECEIPT_PATH_INVALID')
  }
  fs.writeFileSync(receiptPath, `${serializedReceipt}\n`, { encoding: 'utf8', mode: 0o600, flag: 'wx' })
}
print(serializedReceipt)
