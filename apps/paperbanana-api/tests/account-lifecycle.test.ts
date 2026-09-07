import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import vm from 'node:vm'
import { stripTypeScriptTypes } from 'node:module'
import { memoryDb } from '../../../test-support/memory-db.mjs'

// Execute the actual production lifecycle functions with only Mongo, OSS and
// clock replaced. No network clients, credentials or production data are used.
const source = fs.readFileSync(new URL('../../laf-functions/paperbanana-api.ts', import.meta.url), 'utf8')
function extract(name: string) {
  const start = source.search(new RegExp(`^(?:export )?(?:async )?function ${name}\\(`, 'm'))
  assert.ok(start >= 0, name)
  const remaining = source.slice(start)
  const end = remaining.slice(1).search(/\n(?:export )?(?:async )?function |\n(?:export )?(?:const|let|type) /)
  return remaining.slice(0, end < 0 ? undefined : end + 1).replace(/^export /, '')
}
const functions = ['accountIdQuery', 'accountDeletionStatus', 'deleteAccount', 'listAccountObjectKeys', 'completeAccountDeletion', 'storedObjectKeysForJob', 'accountOwnerKeys', 'ensureAccountAcceptingWork', 'sweepDeletedAccountObjects']
const javascript = stripTypeScriptTypes(functions.map(extract).join('\n'))
function fixture({ jobs = [], tombstones = [], uploads = [], objects = [] } : any = {}) {
  const db = memoryDb({ paperbanana_jobs: jobs, paperbanana_account_deletions: tombstones, paperbanana_reference_upload_state: uploads })
  let time = Date.parse('2026-09-07T12:00:00Z')
  class Clock extends Date { constructor(value: any = time) { super(value) } static now() { return time } }
  const deleted: string[] = []
  const listed: string[] = []
  const files = new Set<string>(objects)
  let failureKey = ''
  const bucket = {
    async listFiles({ Prefix, Marker }: any) { assert.equal(Marker, undefined); listed.push(Prefix); return { Contents: [...files].filter((key) => key.startsWith(Prefix)).map((Key) => ({ Key })), IsTruncated: false } },
    async deleteFile(key: string) { if (key === failureKey) throw new Error('mock OSS outage'); deleted.push(key); files.delete(key) },
  }
  const context = vm.createContext({
    Date: Clock, console, accountDeletions: db.collection('paperbanana_account_deletions'), jobs: db.collection('paperbanana_jobs'),
    feedback: db.collection('feedback'), referenceUploadState: db.collection('paperbanana_reference_upload_state'),
    jobAdmission: { freezeOwners() {} }, cloud: { storage: { bucket: () => bucket } }, bucketName: 'fake',
    randomId: () => 'lease-test', referenceUploadStateRetentionMs: 86400000,
    deleteAdditionalAccountData: async (userId: string) => db.collection('submissions').deleteMany({ userId }),
    ok: (body: any) => ({ code: 0, ...body }), fail: (error: string, code: number) => ({ code, error }),
  })
  vm.runInContext(javascript, context)
  const body = { userId: 'old-id', operationId: '12345678-1234-1234-1234-123456789abc' }
  return { db, context, body, files, deleted, listed, advanceTime: (ms: number) => { time += ms }, failAt: (key: string) => { failureKey = key }, run: () => context.deleteAccount(body) }
}
const oldJob = { _id: 'old-job', userId: 'old-id', userEmail: 'same@example.test', status: 'succeeded', resultImages: [{ objectKey: 'old-job/result.png' }] }
const newJob = { _id: 'new-job', userId: 'new-id', userEmail: 'same@example.test', status: 'succeeded', resultImages: [{ objectKey: 'new-job/result.png' }] }

test('legacy interrupted/completed markers never trigger cleanup on request or sweep', async () => {
  for (const status of ['deleting', 'deleted']) {
    const f = fixture({ tombstones: [{ _id: 'user:old-id', userId: 'old-id', status, ownerPrefixes: ['old-id', 'same-example.test'], jobIds: ['old-job', 'new-job'] }], objects: ['old-job/result.png', 'new-job/result.png'] })
    assert.equal((await f.run()).error, 'ACCOUNT_DELETION_REVIEW_REQUIRED')
    await f.context.sweepDeletedAccountObjects()
    assert.equal((await f.context.accountDeletionStatus(f.body)).state, 'review_required')
    assert.deepEqual(f.deleted, [])
    assert.deepEqual(f.listed, [])
    assert.equal(await f.context.ensureAccountAcceptingWork({ userId: 'old-id' }), false)
    assert.equal(await f.context.ensureAccountAcceptingWork({ userId: 'new-id', userEmail: 'same@example.test' }), true)
  }
})

test('same-email new identity survives old identity deletion, acknowledgement and future sweeps', async () => {
  const f = fixture({ jobs: [oldJob, newJob], objects: ['old-job/result.png', 'new-job/result.png', 'references/old-id/a.png', 'references/new-id/a.png', 'references/same-example.test/legacy.png'] })
  await f.db.collection('feedback').insertOne({ _id: 'old-feedback', userId: 'old-id' })
  await f.db.collection('feedback').insertOne({ _id: 'new-feedback', userId: 'new-id', userEmail: 'same@example.test' })
  await f.db.collection('submissions').insertOne({ _id: 'old-submission', userId: 'old-id' })
  assert.equal((await f.run()).phase, 'awaiting_auth')
  assert.deepEqual(f.db.collection('paperbanana_jobs').rows, [newJob])
  assert.equal(f.db.collection('feedback').rows.length, 1)
  assert.equal(f.db.collection('submissions').rows.length, 0)
  assert.equal((await f.context.completeAccountDeletion(f.body)).phase, 'completed')
  await f.context.sweepDeletedAccountObjects()
  assert.deepEqual([...f.files].sort(), ['new-job/result.png', 'references/new-id/a.png', 'references/same-example.test/legacy.png'].sort())
  assert.equal(f.listed.includes('references/same-example.test/'), false)
})

test('storage failure persists phase/cursor and frozen manifest; retry after restart finishes without new-ID data', async () => {
  const f = fixture({ jobs: [oldJob, newJob], objects: ['old-job/result.png', 'references/old-id/a.png', 'new-job/result.png'] })
  f.failAt('references/old-id/a.png')
  assert.equal((await f.run()).code, 503)
  let row = f.db.collection('paperbanana_account_deletions').rows[0]
  assert.equal(row.phase, 'objects')
  assert.equal(row.objectCursor, 1)
  assert.ok(row.irreversibleStartedAt)
  assert.ok(row.lastFailedAt)
  assert.equal(f.db.collection('paperbanana_jobs').rows.length, 2)
  vm.runInContext(javascript, f.context) // new functions, persisted collections unchanged
  f.failAt('')
  assert.equal((await f.run()).phase, 'awaiting_auth')
  assert.equal(f.deleted.filter((key) => key === 'old-job/result.png').length, 1)
  assert.equal(f.db.collection('paperbanana_jobs').rows[0].userId, 'new-id')
})

test('all signed PUT states wait through expiry plus settlement, then exact late key is inventoried', async () => {
  const f = fixture({ uploads: [{ _id: 'references/old-id/late.png', ownerKey: 'user:old-id', status: 'finalized', expiresAt: new Date('2026-09-07T12:15:00Z') }] })
  assert.equal((await f.run()).error, 'ACCOUNT_DELETION_WAITING_FOR_UPLOADS')
  f.advanceTime(16 * 60 * 1000)
  assert.equal((await f.run()).error, 'ACCOUNT_DELETION_WAITING_FOR_UPLOADS')
  f.files.add('references/old-id/late.png')
  f.advanceTime(86400000)
  assert.equal((await f.run()).phase, 'awaiting_auth')
  assert.deepEqual(f.deleted, ['references/old-id/late.png'])
})

test('running job across isolates blocks inventory; unsafe shared references require review before deletion', async () => {
  const running = fixture({ jobs: [{ ...oldJob, status: 'running' }] })
  assert.equal((await running.run()).error, 'ACCOUNT_DELETION_WAITING_FOR_JOBS')
  assert.deepEqual(running.listed, [])
  const unsafe = fixture({ jobs: [{ ...oldJob, referenceImages: [{ objectKey: 'references/new-id/a.png' }] }] })
  assert.equal((await unsafe.run()).error, 'ACCOUNT_DELETION_REVIEW_REQUIRED')
  assert.deepEqual(unsafe.deleted, [])
})

test('conflicting ID fields cannot transfer scope; wrong operation cannot acknowledge or rerun', async () => {
  const f = fixture({ jobs: [{ ...newJob, user_id: 'old-id' }, { ...oldJob, userId: undefined, user_id: 'old-id' }] })
  assert.equal((await f.run()).code, 0)
  assert.equal(f.db.collection('paperbanana_jobs').rows[0].userId, 'new-id')
  assert.equal((await f.context.deleteAccount({ ...f.body, operationId: '87654321-1234-1234-1234-123456789abc' })).error, 'ACCOUNT_DELETION_OPERATION_MISMATCH')
  assert.equal((await f.context.completeAccountDeletion({ ...f.body, operationId: 'wrong' })).code, 409)
})

test('business cleanup failure keeps manifest for retry and completion cannot jump over it', async () => {
  const f = fixture({ jobs: [oldJob] })
  f.context.deleteAdditionalAccountData = async () => { throw new Error('benchmark db down') }
  assert.equal((await f.run()).code, 503)
  assert.equal(f.db.collection('paperbanana_account_deletions').rows[0].phase, 'business')
  assert.equal((await f.context.completeAccountDeletion(f.body)).code, 409)
  f.context.deleteAdditionalAccountData = async () => {}
  assert.equal((await f.run()).phase, 'awaiting_auth')
})

test('claim rereads persisted phase instead of replaying stale waiting state from another worker', async () => {
  const f = fixture()
  await f.db.collection('paperbanana_account_deletions').insertOne({
    _id: 'user:old-id', contractVersion: 3, operationId: f.body.operationId, status: 'deleting', phase: 'waiting',
  })
  const collection = f.db.collection('paperbanana_account_deletions')
  const update = collection.updateOne
  collection.updateOne = async (query: any, change: any, options: any) => {
    if (change.$inc?.attempts) collection.rows[0].phase = 'awaiting_auth'
    return update(query, change, options)
  }
  assert.equal((await f.run()).phase, 'awaiting_auth')
  assert.deepEqual(f.listed, [])
  assert.deepEqual(f.deleted, [])
})

test('private prompt submission rejects frozen owners before insert and compensates a concurrent freeze', async () => {
  const { createMongoBenchmarkRepository } = await import('../src/benchmark-repository.js')
  const { BENCHMARK_COLLECTIONS } = await import('@paperbanana/benchmark-core')
  for (const failAt of [1, 2]) {
    const db = memoryDb()
    let checks = 0
    const repository = createMongoBenchmarkRepository(db as any, () => new Date(), async () => {}, '', async () => new Uint8Array(), {
      async assertAccountAcceptingWork() { if (++checks === failAt) throw new Error('ACCOUNT_DELETION_IN_PROGRESS') },
    })
    await assert.rejects(repository.submitPrompt({ userId: 'old-id', clientIp: '127.0.0.1', prompt: 'fixture' }), /ACCOUNT_DELETION_IN_PROGRESS/)
    assert.equal(db.collection(BENCHMARK_COLLECTIONS.promptSubmissions).rows.length, 0)
  }
})
