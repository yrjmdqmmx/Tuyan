import assert from 'node:assert/strict'
import test from 'node:test'
import type { Db } from 'mongodb'
import { canonicalHash } from '@paperbanana/benchmark-core'
import { createScientificRereviewRepository } from '../src/scientific-v2-rereview-repository.js'
import { SCIENTIFIC_V2_COLLECTIONS, SCIENTIFIC_V2_RELEASE_HEAD_ID } from '../src/scientific-v2-repository.js'
import { fixture, submission, secret, issuedAt } from './fixtures/scientific-v2-rereview-fixture.js'

type Row = Record<string, any>
const names = {
  sessions: 'paperbanana_benchmark_scientific_v2_rereviews',
  releases: 'paperbanana_benchmark_releases',
  rows: SCIENTIFIC_V2_COLLECTIONS.publicEvidence,
  heads: SCIENTIFIC_V2_COLLECTIONS.releaseHeads,
  lifecycles: SCIENTIFIC_V2_COLLECTIONS.releaseLifecycle,
  batches: SCIENTIFIC_V2_COLLECTIONS.batches,
  dispatches: SCIENTIFIC_V2_COLLECTIONS.dispatches,
}

function valuesAtPath(value: any, path: string[]): any[] {
  if (!path.length) return [value]
  if (Array.isArray(value)) return value.flatMap(item => valuesAtPath(item, path))
  return valuesAtPath(value?.[path[0]], path.slice(1))
}
function matches(row: Row, query: Row): boolean {
  return Object.entries(query).every(([key, expected]) => {
    const values = valuesAtPath(row, key.split('.'))
    if (expected && typeof expected === 'object' && '$in' in expected) return values.some(value => expected.$in.includes(value))
    return values.some(value => value === expected)
  })
}

/** A strict transactional double: every write in a transaction must carry its session. */
class MemoryDb {
  tables: Record<string, Row[]>
  events: { collection: string; method: string; transactional: boolean }[] = []
  transactions = { committed: 0, rolledBack: 0, ended: 0 }
  failNext: { collection: string; method: string; mode: 'throw' | 'no-match' } | null = null
  beforeTransaction: (() => void) | null = null
  private active: Row | null = null
  constructor(seed: Record<string, Row[]>) { this.tables = structuredClone(seed) }
  snapshot() { return structuredClone(this.tables) }
  rows(name: string) { return this.tables[name] || [] }
  private table(name: string, options: Row, method: string, mutates = false) {
    if (this.active && options.session !== this.active) throw new Error(`MISSING_TRANSACTION_SESSION:${name}:${method}`)
    if (options.session && options.session !== this.active) throw new Error('INVALID_TRANSACTION_SESSION')
    this.events.push({ collection: name, method, transactional: Boolean(options.session) })
    const target = this.active ? this.active.draft : this.tables
    target[name] ||= []
    if (mutates && this.failNext?.collection === name && this.failNext.method === method) {
      const failure = this.failNext; this.failNext = null
      if (failure.mode === 'throw') throw new Error('INJECTED_STORAGE_FAILURE')
      return null
    }
    return target[name] as Row[]
  }
  collection(name: string) {
    return {
      findOne: async (query: Row, options: Row = {}) => structuredClone(this.table(name, options, 'findOne')!.find(row => matches(row, query)) || null),
      find: (query: Row, options: Row = {}) => {
        let selected = this.table(name, options, 'find')!.filter(row => matches(row, query))
        const cursor = {
          sort: (order: Row) => {
            selected = [...selected].sort((left, right) => {
              for (const [key, direction] of Object.entries(order)) {
                const a = valuesAtPath(left, key.split('.'))[0], b = valuesAtPath(right, key.split('.'))[0]
                if (a !== b) return (a < b ? -1 : 1) * direction
              }
              return 0
            })
            return cursor
          },
          toArray: async () => structuredClone(selected),
        }
        return cursor
      },
      insertOne: async (row: Row, options: Row = {}) => {
        const target = this.table(name, options, 'insertOne', true)!
        if (target.some(item => item._id === row._id)) throw new Error('DUPLICATE_ID')
        target.push(structuredClone(row))
        return { insertedId: row._id }
      },
      insertMany: async (rows: Row[], options: Row = {}) => {
        const target = this.table(name, options, 'insertMany', true)!
        for (const row of rows) {
          if (target.some(item => item._id === row._id)) throw new Error('DUPLICATE_ID')
          target.push(structuredClone(row))
        }
        return { insertedCount: rows.length }
      },
      updateOne: async (query: Row, change: Row, options: Row = {}) => {
        const target = this.table(name, options, 'updateOne', true)
        const row = target?.find(item => matches(item, query))
        if (!row) return { matchedCount: 0, modifiedCount: 0 }
        assert.deepEqual(Object.keys(change), ['$set'])
        Object.assign(row, structuredClone(change.$set))
        return { matchedCount: 1, modifiedCount: 1 }
      },
    }
  }
  client = {
    startSession: () => {
      const session: Row = {
        draft: null,
        withTransaction: async (callback: () => Promise<void>) => {
          assert.equal(this.active, null)
          const before = this.beforeTransaction; this.beforeTransaction = null; before?.()
          session.draft = structuredClone(this.tables)
          this.active = session
          try {
            await callback()
            this.tables = session.draft
            this.transactions.committed += 1
          } catch (error) {
            this.transactions.rolledBack += 1
            throw error
          } finally { this.active = null }
        },
        endSession: async () => { this.transactions.ended += 1 },
      }
      return session
    },
  }
}

function setup() {
  const f = fixture()
  const batch = { _id: 'original-batch', batchId: f.baseline.batchId, providerCalls: 406,
    state: { slots: f.baseline.models.flatMap((model: Row) => model.evidence.filter((item: Row) => item.status === 'succeeded')
      .map((item: Row) => ({ canonicalModelId: model.canonicalModelId, caseId: item.caseId, status: item.status,
        attempts: [{ rawImageHash: item.imageHash, format: 'png', billingEvidence: `original-${item.imageHash}` }] }))) } }
  const db = new MemoryDb({
    [names.sessions]: [], [names.releases]: [f.baseline], [names.rows]: f.publicEvidence,
    [names.heads]: [{ _id: SCIENTIFIC_V2_RELEASE_HEAD_ID, releaseId: f.baseline._id, releaseHash: f.baseline.releaseHash }],
    [names.lifecycles]: [{ _id: `benchmark-release-lifecycle:${f.baseline._id}`, releaseId: f.baseline._id, releaseHash: f.baseline.releaseHash, status: 'active' }],
    [names.batches]: [batch], [names.dispatches]: [{ _id: 'original-provider-dispatch', rawImageHash: 'd'.repeat(64), status: 'completed', charge: '0.039' }],
  })
  const verified: { objectKey: string; imageHash: string }[] = []
  const allowedObjects = new Map<string, string>()
  for (const item of f.session.assignments.A.items) {
    allowedObjects.set(`bench/scientific-v2/private/objects/${item.imageHash}.png`, item.imageHash)
    if (item.sourceHash) allowedObjects.set(`bench/scientific-v2/private/objects/${item.sourceHash}.png`, item.sourceHash)
  }
  for (const row of f.publicEvidence) for (const variant of [...(row.variants || []), ...(row.beforeVariants || [])]) allowedObjects.set(variant.objectKey, variant.imageHash)
  const repository = createScientificRereviewRepository(db as unknown as Db, {
    secret: () => secret, codeSha: 'f'.repeat(40), now: () => new Date(issuedAt), protocolForTest: f.protocol,
    verifyObject: async (objectKey, imageHash) => {
      assert.equal(allowedObjects.get(objectKey), imageHash)
      verified.push({ objectKey, imageHash })
    },
  })
  const command = (reviewCommand: string, payload: Row = {}): Promise<Row> => repository.control({ reviewCommand, sessionId: f.sessionId, payload })
  const freeze = () => command('freeze', { scope: f.scope })
  const record = () => db.rows(names.sessions).find(item => item._id === f.sessionId)!
  const originalGeneration = structuredClone({ batches: db.rows(names.batches), dispatches: db.rows(names.dispatches) })
  return { f, db, repository, verified, command, freeze, record, originalGeneration }
}

async function finalized() {
  const s = setup()
  await s.freeze()
  await s.command('import', { role: 'A', submission: submission(s.record().session, 'A') })
  await s.command('import', { role: 'B', submission: submission(s.record().session, 'B') })
  assert.equal(s.record().status, 'review_finalized')
  return s
}
function assertOriginalGeneration(s: ReturnType<typeof setup>) {
  assert.deepEqual({ batches: s.db.rows(names.batches), dispatches: s.db.rows(names.dispatches) }, s.originalGeneration)
  assert.ok(s.db.events.filter(e => e.collection === names.batches || e.collection === names.dispatches).every(e => ['find', 'findOne'].includes(e.method)))
}

test('repository freezes and exports exact anonymous existing images without provider or generation writes', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => { throw new Error('PROVIDER_CALL_FORBIDDEN') })
  const s = setup()
  const frozen = await s.freeze()
  assert.equal(frozen.status, 'review_ready')
  assert.equal(frozen.providerCalls, 0)
  assert.equal(frozen.itemCount, 343)
  assert.equal(s.verified.length, 344)
  assert.equal((await s.freeze()).replayed, true)
  assert.equal(s.db.rows(names.sessions).length, 1)
  const exportedA = await s.command('export', { role: 'A' })
  const exportedB = await s.command('export', { role: 'B' })
  for (const exported of [exportedA, exportedB]) {
    assert.equal(exported.providerCalls, 0)
    assert.equal(exported.assignment.items.length, 343)
    assert.doesNotMatch(JSON.stringify(exported.assignment), /canonicalModelId|privateMappings|cost|price|reviewNotes|developer|displayName/)
    assert.equal(exported._objectBindings.length, 344)
  }
  assert.notDeepEqual(exportedA.assignment.items.map((item: Row) => item.itemHash), exportedB.assignment.items.map((item: Row) => item.itemHash))
  assert.equal(fetch.mock.callCount(), 0)
  assertOriginalGeneration(s)
})

test('repository refuses missing originals and stale freeze heads before creating a session', async () => {
  const missing = setup()
  missing.db.tables[names.batches][0].state.slots = []
  await assert.rejects(missing.freeze(), /ORIGINAL_OBJECT_MISSING/)
  assert.equal(missing.db.rows(names.sessions).length, 0)
  const stale = setup()
  stale.db.tables[names.heads][0].releaseHash = '9'.repeat(64)
  await assert.rejects(stale.freeze(), /BASELINE_NOT_ACTIVE/)
  assert.equal(stale.db.rows(names.sessions).length, 0)
  assert.equal(stale.verified.length, 0)
})

test('repository imports independently, publishes atomically, replays idempotently, and preserves history', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => { throw new Error('PROVIDER_CALL_FORBIDDEN') })
  const s = setup(), baselineBytes = canonicalHash(s.f.baseline)
  await s.freeze()
  const a = submission(s.record().session, 'A')
  const first = await s.command('import', { role: 'A', submission: a })
  assert.equal(first.status, 'awaiting_peer')
  assert.equal((await s.command('import', { role: 'A', submission: a })).replayed, true)
  assert.equal(s.record().revision, 1)
  await assert.rejects(s.command('publish', { expectedFinalHash: 'a'.repeat(64) }), /NOT_FINALIZED/)
  await assert.rejects(s.command('import', { role: 'A', submission: submission(s.record().session, 'A', 6) }), /REVIEW_CONFLICT/)
  const second = await s.command('import', { role: 'B', submission: submission(s.record().session, 'B') })
  assert.equal(second.status, 'review_finalized')
  const published = await s.command('publish', { expectedFinalHash: second.finalHash })
  assert.equal(published.status, 'published')
  assert.equal(published.providerCalls, 0)
  assert.equal(s.db.rows(names.releases).length, 2)
  assert.equal(s.db.rows(names.rows).length, 846)
  assert.equal(s.db.rows(names.heads)[0].releaseHash, published.releaseHash)
  assert.equal(s.db.rows(names.lifecycles).find(item => item.releaseId === s.f.baseline._id)!.status, 'superseded')
  assert.equal(s.db.rows(names.lifecycles).find(item => item.releaseId === published.releaseId)!.status, 'active')
  assert.equal(canonicalHash(s.db.rows(names.releases).find(item => item._id === s.f.baseline._id)), baselineBytes)
  const after = s.db.snapshot()
  assert.equal((await s.command('publish', { expectedFinalHash: second.finalHash })).replayed, true)
  assert.deepEqual(s.db.snapshot(), after)
  await assert.rejects(s.command('import', { role: 'A', submission: a }), /LATE_IMPORT_REJECTED/)
  assert.equal(fetch.mock.callCount(), 0)
  assertOriginalGeneration(s)
})

test('repository exports one dispute with bound reviewer hashes and requires independent arbitration before publish', async () => {
  const s = setup()
  await s.freeze()
  const a = submission(s.record().session, 'A')
  a.shards[0].results[0].lowConfidence = true
  await s.command('import', { role: 'A', submission: a })
  await s.command('import', { role: 'B', submission: submission(s.record().session, 'B') })
  const inspected = await s.command('inspect')
  assert.equal(inspected.status, 'review_dispute')
  assert.equal(inspected.disputeCount, 1)
  assert.equal(inspected.assignment.role, 'ARBITRATION')
  assert.equal(inspected.assignment.reviewerAHash, s.record().reviewerA.resultHash)
  assert.equal(inspected.assignment.reviewerBHash, s.record().reviewerB.resultHash)
  assert.doesNotMatch(JSON.stringify(inspected.assignment), /rationales|redLines|lowConfidence|scores|canonicalModelId|privateMappings/)
  await assert.rejects(s.command('publish', { expectedFinalHash: inspected.finalHash }), /NOT_FINALIZED/)
  const item = inspected.assignment.items[0]
  const arbitration = { sessionHash: inspected.sessionHash, reviewerAHash: inspected.assignment.reviewerAHash, reviewerBHash: inspected.assignment.reviewerBHash,
    shards: [{ reviewer: { model: 'gpt-6-astra', reasoningEffort: 'xhigh', agentId: 'independent-third-agent', contextId: 'fresh-arbitration-context' },
      results: [{ itemHash: item.itemHash, scores: Object.fromEntries(item.applicableAxes.map((axis: string) => [axis, 5])), redLines: [],
        rationale: '中央两个分支的连线相交且箭头较细，下方标签与边框贴合，上方标题仍清晰可辨。',
        viewedImageHashes: [...new Set([item.imageHash, ...(item.kind === 'edit' ? [item.sourceHash] : [])])] }] }] }
  const arbitrated = await s.command('arbitrate', { submission: arbitration })
  assert.equal(arbitrated.status, 'review_finalized')
  assert.equal((await s.command('publish', { expectedFinalHash: arbitrated.finalHash })).status, 'published')
  assertOriginalGeneration(s)
})

test('repository rolls back release, evidence, lifecycle and session when any publication CAS or write fails', async () => {
  for (const failure of [
    { collection: names.rows, method: 'insertMany', mode: 'throw' as const, expected: /INJECTED_STORAGE_FAILURE/ },
    { collection: names.lifecycles, method: 'updateOne', mode: 'no-match' as const, expected: /HEAD_CONFLICT/ },
    { collection: names.heads, method: 'updateOne', mode: 'no-match' as const, expected: /HEAD_CONFLICT/ },
    { collection: names.sessions, method: 'updateOne', mode: 'no-match' as const, expected: /FINAL_CONFLICT/ },
  ]) {
    const s = await finalized(), before = s.db.snapshot()
    s.db.failNext = failure
    await assert.rejects(s.command('publish', { expectedFinalHash: s.record().final.finalHash }), failure.expected)
    assert.deepEqual(s.db.snapshot(), before)
    assert.equal(s.db.transactions.rolledBack, 1)
    assert.equal(s.db.transactions.ended, 2)
    assertOriginalGeneration(s)
  }
})

test('repository rejects a head changed between preflight and transaction without overwriting the new active head', async () => {
  const s = await finalized()
  s.db.beforeTransaction = () => { s.db.tables[names.heads][0].releaseHash = '9'.repeat(64) }
  await assert.rejects(s.command('publish', { expectedFinalHash: s.record().final.finalHash }), /BASELINE_NOT_ACTIVE/)
  assert.equal(s.db.rows(names.heads)[0].releaseHash, '9'.repeat(64))
  assert.equal(s.db.rows(names.releases).length, 1)
  assert.equal(s.db.rows(names.rows).length, 423)
  assert.equal(s.record().status, 'review_finalized')
  assert.equal(s.db.transactions.rolledBack, 1)
  assertOriginalGeneration(s)
})
