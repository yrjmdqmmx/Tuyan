import assert from 'node:assert/strict'
import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import test from 'node:test'
import { createOperationsRead } from '../src/operations-read.js'
import { createServer } from '../src/server.js'

const window = { from: '2026-10-30T00:00:00.000Z', to: '2026-10-31T00:00:00.000Z' }

test('aggregate reader returns only fixed count buckets and bounded date queries', async () => {
  const pipelines: any[] = []
  let failure = false
  const db = { collection(name: string) {
    assert.equal(name, 'paperbanana_jobs')
    return { aggregate(pipeline: any[], options: any) {
      pipelines.push(pipeline)
      assert.equal(options.maxTimeMS, 5000)
      return { async toArray() {
        if (failure) return [{ categories: [{ _id: 'quota', count: 2 }, { _id: 'unknown', count: 1 }],
          stages: [{ _id: 'rendering', count: 3 }], requestStates: [{ _id: 'unknown', count: 3 }], prompt: 'PRIVATE_SENTINEL' }]
        return [{ _id: 'succeeded', count: 3 }, { _id: 'unknown', count: 2 }, { _id: 'PRIVATE_SENTINEL', count: 900 }]
      } }
    } }
  } }
  const read = createOperationsRead(db as any, () => Date.parse('2026-11-01T12:00:00.000Z'))
  const overview: any = await read('overview', window)
  assert.equal(overview.counts.succeeded, 3)
  assert.equal(overview.counts.failed, 0)
  assert.equal(overview.counts.unknown, 2)
  assert.doesNotMatch(JSON.stringify(overview), /PRIVATE_SENTINEL/)
  assert.deepEqual(pipelines[0][0], { $match: { createdAt: { $gte: new Date(window.from), $lt: new Date(window.to) } } })
  // Unknown database values are collapsed in Mongo, not a potentially unbounded list.
  assert.equal(pipelines[0][1].$group._id.$cond[2], 'unknown')
  failure = true
  const failures: any = await read('failures', window)
  assert.equal(failures.categories.quota, 2)
  assert.equal(failures.categories.unknown, 1)
  assert.equal(failures.requestStates.unknown, 3)
  assert.equal(pipelines[1][0].$match.status, 'failed')
  assert.doesNotMatch(JSON.stringify(failures), /PRIVATE_SENTINEL/)
  await assert.rejects(read('overview', { ...window, $where: 'malicious' }))
  assert.equal(pipelines.length, 2)
})

test('Core aggregate routes require independent read credentials; never invoke legacy/admin handlers', async () => {
  for (const enabled of [false, true]) {
    let calls = 0, legacyCalls = 0, fail = false
    const server = createServer({
      config: { gatewayToken: 'fixture-gateway', operationsToken: 'fixture-ops', adminTransportToken: 'fixture-admin', serviceName: 'fixture', version: '1' },
      handler: async () => { legacyCalls++; return {} }, readinessProbe: () => ({ ready: true }), healthSnapshot: () => ({ ready: true }),
      logger: { info() {}, warn() {}, error() {} },
      ...(enabled ? { operationsRead: async (kind: string, input: unknown) => {
        calls++; if (fail) throw Error('PRIVATE_SENTINEL'); return { kind, input }
      } } : {}),
    })
    server.listen(0, '127.0.0.1'); await once(server, 'listening')
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
    const headers = { 'x-paperbanana-operations-token': 'fixture-ops' }
    try {
      for (const kind of ['overview', 'failures']) {
        const path = `/internal/operations/${kind}`
        for (const h of [{}, { 'x-paperbanana-gateway-token': 'fixture-gateway' }, { 'x-paperbanana-admin-transport-token': 'fixture-admin' }]) {
          assert.equal((await fetch(base + path + '?token=fixture-ops', { headers: h as Record<string, string> })).status, enabled ? 401 : 404)
        }
        const response = await fetch(base + path, { headers })
        assert.equal(response.status, enabled ? 200 : 404)
        assert.equal(response.headers.get('access-control-allow-origin'), null)
        if (enabled) {
          assert.equal((await fetch(base + path + '?action=deleteJob', { headers })).status, 400)
          assert.equal((await fetch(base + path, { headers: { ...headers, origin: 'https://example.com' } })).status, 401)
          assert.equal((await fetch(base + path, { headers, method: 'POST' })).status, 404)
        }
      }
      assert.equal(calls, enabled ? 2 : 0)
      const denied = await fetch(base + '/paperbanana-api', { headers: { ...headers, 'content-type': 'application/json' }, method: 'POST', body: JSON.stringify({ action: 'adminTaskFollowup' }) })
      assert.equal(denied.status, 401); assert.equal(legacyCalls, 0)
      if (enabled) {
        fail = true
        const response = await fetch(base + '/internal/operations/overview', { headers })
        assert.equal(response.status, 503)
        assert.doesNotMatch(await response.text(), /PRIVATE_SENTINEL/)
      }
    } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) }
  }
})
