import assert from 'node:assert/strict'
import { once } from 'node:events'
import test from 'node:test'
import { createOperationalMetrics, createProcessObservation } from '../src/operational-metrics.js'
import { createDatabaseObservation } from '../src/operations-snapshot.js'
import { createServer } from '../src/server.js'

test('bounded counters and cumulative buckets contain no dynamic labels or input data', () => {
  const metrics = createOperationalMetrics()
  metrics.increment('admission.owner_limit')
  metrics.increment('secret-account' as any)
  for (let i = 0; i < 1000; i++) metrics.observe('private-prompt-' + i, 20, true)
  metrics.observe('model:image', 2000)
  metrics.observe('model:image', NaN)
  const report = metrics.snapshot()
  assert.equal(report.counters['admission.owner_limit'], 1)
  assert.equal(report.durations.other.count, 1000)
  assert.equal(report.durations.other.errors, 1000)
  assert.deepEqual(report.durations['model:image'].buckets, [0, 0, 0, 1, 1, 1, 1, 1])
  assert.doesNotMatch(JSON.stringify(report), /secret-account|private-prompt/)
  report.counters['admission.owner_limit'] = 99
  assert.equal(metrics.snapshot().counters['admission.owner_limit'], 1)
})

test('process observer reports cumulative CPU and memory without environment values', async () => {
  const observer = createProcessObservation()
  try {
    await new Promise(resolve => setTimeout(resolve, 60))
    const report = observer.snapshot()
    assert.ok(report.memoryBytes.rss > 0)
    assert.ok(report.cpuMicroseconds.user > 0)
    assert.ok(report.eventLoop.samples > 0)
    assert.doesNotMatch(JSON.stringify(report), /TOKEN|PASSWORD|process.env/)
  } finally { observer.close() }
})

test('private endpoint requires its read-only header token, is opt-in and does not leak probe errors', async () => {
  for (const enabled of [false, true]) {
    let calls = 0, fail = false
    const server = createServer({
      config: { gatewayToken: 'fixture-gateway', adminTransportToken: 'fixture-admin', operationsToken: 'fixture-ops', serviceName: 'test', version: 'test' },
      handler: async () => ({}), readinessProbe: () => ({ ready: true }), healthSnapshot: () => ({ ready: true }),
      logger: { info() {}, warn() {}, error() {} },
      ...(enabled ? { operationsSnapshot: () => { calls++; if (fail) throw Error('PRIVATE_KEY'); return { counters: { active: 2 } } } } : {}),
    })
    server.listen(0, '127.0.0.1'); await once(server, 'listening')
    const url = `http://127.0.0.1:${(server.address() as any).port}/internal/operations`
    const headers = { 'x-paperbanana-operations-token': 'fixture-ops' }
    try {
      for (const partial of [{}, { 'x-paperbanana-gateway-token': 'fixture-gateway' }, { 'x-paperbanana-gateway-token': 'fixture-gateway', 'x-paperbanana-admin-transport-token': 'fixture-admin' }]) {
        const response = await fetch(url + '?operationsToken=fixture-ops', { headers: partial as any })
        assert.equal(response.status, enabled ? 401 : 404)
      }
      assert.equal(calls, 0)
      const response = await fetch(url, { headers })
      assert.equal(response.status, enabled ? 200 : 404)
      assert.equal(response.headers.get('cache-control'), 'no-store')
      assert.equal(response.headers.get('access-control-allow-origin'), null)
      if (enabled) {
        assert.deepEqual(await response.json(), { counters: { active: 2 } })
        const deniedApi = await fetch(url.replace('/internal/operations', '/paperbanana-api'), { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ action: 'getJob', jobId: 'fixture' }) })
        assert.equal(deniedApi.status, 401, 'the observation token has no job or admin authority')
        fail = true
        const unavailable = await fetch(url, { headers })
        assert.equal(unavailable.status, 503)
        assert.doesNotMatch(await unavailable.text(), /PRIVATE_KEY/)
      }
    } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) }
  }
})

test('database snapshot coalesces scrapes, caches, whitelists fields and tolerates missing permissions', async () => {
  let calls = 0, time = 100000, denied = false
  const db = {
    async command() { calls++; if (denied) throw Error('secret-uri'); return { connections: { current: 4, available: 10 }, mem: { resident: 90 }, privateKey: 'secret' } },
    collection() { return { aggregate() { return { toArray: async () => [{ _id: 'running', count: 2, oldest: new Date(time - 4000), owner: 'private' }] } } } },
  }
  const read = createDatabaseObservation(db as any, () => time)
  const results = await Promise.all([read(), read()])
  assert.equal(calls, 1)
  const first = results[0] as any
  assert.equal(first.jobs.states.running.count, 2)
  assert.equal(first.jobs.states.running.oldestAgeSeconds, 4)
  assert.doesNotMatch(JSON.stringify(first), /secret|private/)
  await read(); assert.equal(calls, 1)
  time += 15001; denied = true
  assert.equal((await read() as any).server.available, false)
  assert.equal(calls, 2)
})
