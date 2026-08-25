import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { createGracefulShutdown } from '../src/shutdown.js'

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

test('graceful shutdown stops admission and drains tracked jobs before closing runtime resources', async () => {
  const calls: string[] = []
  let releaseDrain!: () => void
  const drain = new Promise<void>((resolve) => { releaseDrain = resolve })
  const shutdown = createGracefulShutdown({
    server: {
      close(callback: (error?: Error) => void) {
        calls.push('server.close')
        callback()
      },
    },
    stopAdmission() { calls.push('admission.stop') },
    async drainJobs() { calls.push('jobs.drain'); await drain },
    async closeRuntime() { calls.push('runtime.close') },
    logger: { info() {}, warn() {}, error() {} },
    forceExit() { assert.fail('force exit must not run on first signal') },
  })

  const completion = shutdown('SIGTERM')
  await new Promise((resolve) => setImmediate(resolve))
  assert.deepEqual(calls, ['admission.stop', 'server.close', 'jobs.drain'])

  releaseDrain()
  await completion
  assert.deepEqual(calls, ['admission.stop', 'server.close', 'jobs.drain', 'runtime.close'])
})

test('a second termination signal requests a force exit without closing Mongo under the first drain', async () => {
  let releaseDrain!: () => void
  const forced: number[] = []
  const shutdown = createGracefulShutdown({
    server: { close(callback: (error?: Error) => void) { callback() } },
    stopAdmission() {},
    async drainJobs() { await new Promise<void>((resolve) => { releaseDrain = resolve }) },
    async closeRuntime() {},
    logger: { info() {}, warn() {}, error() {} },
    forceExit(code) { forced.push(code) },
  })

  const completion = shutdown('SIGTERM')
  await new Promise((resolve) => setImmediate(resolve))
  void shutdown('SIGINT')
  assert.deepEqual(forced, [1])
  releaseDrain()
  await completion
})

test('shutdown still drains jobs and closes runtime if listener close reports an error', async () => {
  const calls: string[] = []
  const shutdown = createGracefulShutdown({
    server: { close(callback: (error?: Error) => void) { calls.push('server.close'); callback(new Error('close failed')) } },
    stopAdmission() { calls.push('admission.stop') },
    async drainJobs() { calls.push('jobs.drain') },
    async closeRuntime() { calls.push('runtime.close') },
    logger: { info() {}, warn() {}, error() {} },
    forceExit() {},
  })

  await assert.rejects(shutdown('SIGTERM'), /close failed/)
  assert.deepEqual(calls, ['admission.stop', 'server.close', 'jobs.drain', 'runtime.close'])
})

test('service composition configures legacy admission, cached health, and tracked shutdown hooks', () => {
  const source = fs.readFileSync(path.join(packageRoot, 'src/main.ts'), 'utf8')
  assert.match(source, /legacy\.configureJobAdmission\(config\.admission\)/)
  assert.match(source, /createProviderEgress\(config\.providerEgress\)/)
  assert.match(source, /legacy\.configureRuntimeFetch\(providerEgress\.fetch\)/)
  assert.match(source, /providerEgress,/)
  assert.match(source, /readinessProbeTimeoutMs: config\.readinessProbeTimeoutMs/)
  assert.match(source, /healthSnapshot,/)
  assert.match(source, /closeRuntime: closeAll/)
  assert.match(source, /stopAdmission: legacyLifecycle\.stop/)
  assert.match(source, /drainJobs: legacyLifecycle\.drain/)
  assert.match(source, /createGracefulShutdown\(/)
})
