import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import vm from 'node:vm'

const require = createRequire(import.meta.url)
const source = readFileSync(new URL('../scripts/retire-v1-benchmark.mongo.js', import.meta.url), 'utf8')
const activeV2 = 'f1f31caf50b810b456f434a4fd1d6eed55a60d3f8a54fa3795a08284df4cf70a'
const releaseHash = '2688db534f05256b6ce25bbd29dc7d445052d347e576898962022e172900cdb2'
const inventoryHash = 'd7278c285b9afb74ee03287ccbfc4b392462bbf5bb018d264d13704b5071ecf8'
const archiveManifestHash = '7acdd54f1ad68453832b59d7aa6d93c3ebf8273054745d8e1cdceb3c340b7415'
const expected = Object.freeze({ releases: 1, runs: 67, samples: 250, judgments: 124, dispatches: 0, publicEvidence: 124 })
const identity = Object.freeze({ suiteId: 'pb-image-light-v1', evaluationMode: 'codex_single', evaluationEpoch: 'codex-single-2026-08-v1', reviewProtocol: 'codex-single-two-pass-v1' })

function report() {
  return {
    schemaVersion: 1, mode: 'delete-objects', generatedOrJudgeCalls: 0, releaseHash, activeV2ReleaseHash: activeV2,
    inventory: { inventoryHash, identity, dbCounts: expected, targetRunIds: ['run-1'] },
    objectDeletion: { inventoryHash, deletedObjectCount: 253, deletedBytes: 343873414 },
  }
}

function stateWith(counts = expected, tombstone = null) {
  return { counts: { ...counts }, tombstone: tombstone ? structuredClone(tombstone) : null, activeV2Checks: 0 }
}

function exactTombstone(status) {
  return {
    _id: `v1-retirement:${releaseHash}`, releaseHash, ...identity, inventoryHash, archiveManifestHash,
    objectCount: 253, objectBytes: 343873414, dbCounts: { ...expected }, status,
  }
}

function collectionFor(name, state) {
  if (name === 'paperbanana_benchmark_release_tombstones') return {
    findOne: () => state.tombstone && structuredClone(state.tombstone),
    updateOne: (_query, update) => {
      if (update.$setOnInsert && !state.tombstone) state.tombstone = structuredClone(update.$setOnInsert)
      if (update.$set && state.tombstone) Object.assign(state.tombstone, structuredClone(update.$set))
      return { matchedCount: state.tombstone ? 1 : 0 }
    },
  }
  const keyByCollection = {
    paperbanana_benchmark_releases: 'releases',
    paperbanana_benchmark_runs: 'runs',
    paperbanana_benchmark_samples: 'samples',
    paperbanana_benchmark_judgments: 'judgments',
    paperbanana_benchmark_dispatches: 'dispatches',
    paperbanana_benchmark_public_evidence: 'publicEvidence',
  }
  const key = keyByCollection[name]
  assert.ok(key, `unexpected collection ${name}`)
  return {
    countDocuments: (query) => {
      if (key === 'releases' && query.releaseHash === activeV2) {
        state.activeV2Checks += 1
        return 1
      }
      return state.counts[key]
    },
    deleteMany: () => {
      const deletedCount = state.counts[key]
      state.counts[key] = 0
      return { deletedCount }
    },
    deleteOne: () => ({ deletedCount: 0 }),
  }
}

function execute(state) {
  const directory = mkdtempSync(join(tmpdir(), 'paperbanana-v1-mongo-'))
  const reportPath = join(directory, 'report.json')
  const receiptPath = join('/tmp', `paperbanana-v1-retirement-receipt-${process.pid}-${directory.slice(-6)}.json`)
  writeFileSync(reportPath, JSON.stringify(report()), { mode: 0o600 })
  const receipts = []
  const quitSignal = Symbol('quit')
  try {
    const context = {
      require,
      process: { env: { PAPERBANANA_V1_REPORT_PATH: reportPath, PAPERBANANA_V1_ARCHIVE_MANIFEST_HASH: archiveManifestHash, PAPERBANANA_V1_RECEIPT_PATH: receiptPath } },
      db: { getSiblingDB: () => ({ getCollection: (name) => collectionFor(name, state) }) },
      ObjectId: (value) => value,
      print: (value) => receipts.push(JSON.parse(value)),
      quit: () => { throw quitSignal },
      structuredClone,
    }
    try {
      vm.runInNewContext(source, context, { filename: 'retire-v1-benchmark.mongo.js' })
    } catch (error) {
      if (error !== quitSignal) throw error
    }
    assert.deepEqual(JSON.parse(readFileSync(receiptPath, 'utf8')), receipts[0])
  } finally {
    rmSync(directory, { recursive: true, force: true })
    rmSync(receiptPath, { force: true })
  }
  assert.equal(receipts.length, 1)
  return receipts[0]
}

test('V1 Mongo retirement is exact, replay-safe, and resumable after a partial prior run', () => {
  const initial = stateWith()
  const first = execute(initial)
  assert.equal(first.status, 'retired')
  assert.equal(first.replayed, false)
  assert.equal(first.resumed, false)
  assert.deepEqual(initial.counts, Object.fromEntries(Object.keys(expected).map((key) => [key, 0])))
  assert.equal(initial.tombstone.status, 'retired')
  assert.deepEqual(initial.tombstone.deleted, expected)

  const replay = execute(initial)
  assert.equal(replay.status, 'retired')
  assert.equal(replay.replayed, true)
  assert.deepEqual(replay.deleted, expected)

  const partialTombstone = exactTombstone('retiring')
  const partial = stateWith({ releases: 0, runs: 9, samples: 30, judgments: 12, dispatches: 0, publicEvidence: 7 }, partialTombstone)
  const resumed = execute(partial)
  assert.equal(resumed.status, 'retired')
  assert.equal(resumed.replayed, false)
  assert.equal(resumed.resumed, true)
  assert.deepEqual(resumed.deleted, expected)
  assert.deepEqual(partial.counts, Object.fromEntries(Object.keys(expected).map((key) => [key, 0])))
  assert.ok(partial.activeV2Checks >= 2)
})
