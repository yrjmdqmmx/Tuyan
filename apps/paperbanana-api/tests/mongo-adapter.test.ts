import assert from 'node:assert/strict'
import test from 'node:test'

import { createMongoAdapter, reconcileInterruptedJobs } from '../src/mongo-adapter.js'

test('reconciliation idempotently fails only queued and running jobs with a retryable restart code', async () => {
  const jobs = [
    { _id: 'queued', status: 'queued' },
    { _id: 'running', status: 'running' },
    { _id: 'done', status: 'succeeded' },
    { _id: 'failed', status: 'failed', errorCode: 'OLD_ERROR' },
  ]
  const collection = {
    async updateMany(filter: any, update: any) {
      let modifiedCount = 0
      for (const job of jobs) {
        if (!filter.status.$in.includes(job.status)) continue
        Object.assign(job, update.$set)
        modifiedCount += 1
      }
      return { modifiedCount }
    },
  }
  const now = new Date('2026-08-14T01:02:03.000Z')

  const first = await reconcileInterruptedJobs(collection, now)
  const second = await reconcileInterruptedJobs(collection, new Date('2026-08-14T02:00:00.000Z'))

  assert.equal(first, 2)
  assert.equal(second, 0)
  assert.deepEqual(jobs, [
    {
      _id: 'queued',
      status: 'failed',
      error: 'Service restarted before this job completed. Retry the request.',
      errorCode: 'RUNTIME_RESTARTED_RETRY',
      retryable: true,
      completedAt: now,
      updatedAt: now,
    },
    {
      _id: 'running',
      status: 'failed',
      error: 'Service restarted before this job completed. Retry the request.',
      errorCode: 'RUNTIME_RESTARTED_RETRY',
      retryable: true,
      completedAt: now,
      updatedAt: now,
    },
    { _id: 'done', status: 'succeeded' },
    { _id: 'failed', status: 'failed', errorCode: 'OLD_ERROR' },
  ])
})

test('Mongo adapter exposes native collection calls without connecting during construction', async () => {
  let connectCount = 0
  const jobsCollection = { findOne: async () => ({ _id: 'job-1' }) }
  const database = {
    collection(name: string) {
      assert.equal(name, 'paperbanana_jobs')
      return jobsCollection
    },
    command: async (command: unknown) => {
      assert.deepEqual(command, { ping: 1 })
      return { ok: 1 }
    },
  }
  const client = {
    db(name: string) {
      assert.equal(name, 'paperbanana_business')
      return database
    },
    async connect() { connectCount += 1 },
    async close() {},
  }

  const adapter = createMongoAdapter(
    { uri: 'mongodb://example.invalid', database: 'paperbanana_business' },
    { client: client as any },
  )

  assert.equal(connectCount, 0)
  assert.equal(adapter.db.collection('paperbanana_jobs'), jobsCollection)
  await adapter.connect()
  await adapter.probe()
  assert.equal(connectCount, 1)
})
