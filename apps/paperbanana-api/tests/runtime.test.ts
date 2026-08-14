import assert from 'node:assert/strict'
import test from 'node:test'

import { prepareRuntime } from '../src/runtime.js'

test('runtime reconciles interrupted jobs before dependency readiness and legacy handler loading', async () => {
  const calls: string[] = []
  const handler = async () => ({ code: 0 })
  const mongo = {
    db: { collection() {} },
    async connect() { calls.push('mongo.connect') },
    async reconcileInterruptedJobs() { calls.push('mongo.reconcile'); return 2 },
    async probe() { calls.push('mongo.probe') },
    async close() { calls.push('mongo.close') },
  }
  const oss = {
    bucket() {},
    async probe() { calls.push('oss.probe') },
  }

  const runtime = await prepareRuntime({
    mongo: mongo as any,
    oss: oss as any,
    configureCloud() { calls.push('cloud.configure') },
    async loadHandler() { calls.push('handler.load'); return handler },
    logger: { info() {}, warn() {}, error() {} },
  })

  assert.equal(runtime.handler, handler)
  assert.deepEqual(calls, [
    'mongo.connect',
    'mongo.reconcile',
    'mongo.probe',
    'oss.probe',
    'cloud.configure',
    'handler.load',
  ])
})

test('runtime readiness probe reports each dependency without throwing', async () => {
  const mongo = {
    db: { collection() {} },
    async connect() {},
    async reconcileInterruptedJobs() { return 0 },
    async probe() { throw new Error('mongo down') },
    async close() {},
  }
  let firstMongoProbe = true
  ;(mongo as any).probe = async () => {
    if (firstMongoProbe) { firstMongoProbe = false; return }
    throw new Error('mongo down')
  }
  const oss = { bucket() {}, async probe() {} }
  const runtime = await prepareRuntime({
    mongo: mongo as any,
    oss: oss as any,
    configureCloud() {},
    async loadHandler() { return async () => ({ code: 0 }) },
    logger: { info() {}, warn() {}, error() {} },
  })

  assert.deepEqual(await runtime.readinessProbe(), {
    ready: false,
    dependencies: { mongodb: 'unavailable', oss: 'ready' },
  })
})

test('runtime closes Mongo when startup readiness fails', async () => {
  let closed = false
  const mongo = {
    db: { collection() {} },
    async connect() {},
    async reconcileInterruptedJobs() { return 0 },
    async probe() { throw new Error('startup ping failed') },
    async close() { closed = true },
  }
  const oss = { bucket() {}, async probe() {} }

  await assert.rejects(
    prepareRuntime({
      mongo: mongo as any,
      oss: oss as any,
      configureCloud() {},
      async loadHandler() { return async () => ({ code: 0 }) },
      logger: { info() {}, warn() {}, error() {} },
    }),
    /startup ping failed/,
  )
  assert.equal(closed, true)
})
