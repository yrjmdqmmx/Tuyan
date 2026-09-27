import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import vm from 'node:vm'
import { stripTypeScriptTypes } from 'node:module'
import { configureCoreServices, database, objectStorage } from '../src/core-services.js'

test('Core services expose the actual Node adapters without a cloud-runtime facade', () => {
  const db = { collection() { return { marker: 'mongo' } } }
  const storage = { bucket() { return { marker: 'oss' } } }
  configureCoreServices({ mongo: { db } as any, storage: storage as any })
  assert.equal(database, db)
  assert.equal(objectStorage, storage)
})

for (const phase of ['request', 'response body']) {
  test(`plot deadline aborts a stalled ${phase}`, async () => {
    const source = fs.readFileSync(new URL('../runtime/handler.ts', import.meta.url), 'utf8')
    const code = source.slice(source.indexOf('async function renderPlotViaWorker('), source.indexOf('// Admin-only diagnostic: render a trivial'))
    const controller = new AbortController()
    let observedSignal: AbortSignal | undefined
    const awaitAbort = () => new Promise((_resolve, reject) => {
      observedSignal!.addEventListener('abort', () => reject(observedSignal!.reason), { once: true })
    })
    const context = vm.createContext({
      process: { env: { PLOT_WORKER_URL: 'http://plot-worker:8000' } },
      AbortSignal: { timeout(ms: number) { assert.equal(ms, 28000); return controller.signal } },
      runtimeFetch: async (_url: string, init: RequestInit) => { observedSignal = init.signal!; return phase === 'request' ? awaitAbort() : {} },
      parseModelResponse: awaitAbort,
    })
    vm.runInContext(stripTypeScriptTypes(code), context)
    const pending = context.renderPlotViaWorker('print(1)')
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(observedSignal, controller.signal)
    controller.abort(new Error('local simulated deadline'))
    const result = await pending
    assert.equal(result.base64, '')
    assert.equal(result.error, 'local simulated deadline')
  })
}
