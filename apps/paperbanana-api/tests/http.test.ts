import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import test from 'node:test'

import { createServer, type AppConfig } from '../src/server.js'

const config = {
  gatewayToken: 'configured-service-token',
  serviceName: 'paperbanana-api',
  version: '0.1.0',
}

async function withServer(
  handler: (ctx: any) => unknown | Promise<unknown>,
  run: (baseUrl: string) => Promise<void>,
  readinessProbe: () => Promise<any> = async () => ({ ready: true, dependencies: { mongodb: 'ready', oss: 'ready' } }),
  serverConfig: AppConfig = config,
  healthSnapshot: () => any = () => ({ ready: true, dependencies: { mongodb: 'ready', oss: 'ready' } }),
) {
  const server = createServer({ handler, readinessProbe, healthSnapshot, config: serverConfig, logger: { info() {}, warn() {}, error() {} } })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  try {
    await run(`http://127.0.0.1:${port}`)
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
}

test('protected API calls require the internal transport header', async () => {
  await withServer(async () => ({ code: 0 }), async (baseUrl) => {
    for (const token of [undefined, 'wrong']) {
      const headers = new Headers({ 'content-type': 'application/json' })
      if (token) headers.set('x-paperbanana-gateway-token', token)
      const response = await fetch(`${baseUrl}/paperbanana-api`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'health' }),
      })
      assert.equal(response.status, 401)
      assert.deepEqual(await response.json(), { code: 401, error: 'Unauthorized internal transport' })
    }
  })
})

test('POST strips caller tokens, injects the service token, and preserves HTTP-200 business envelopes', async () => {
  let receivedBody: unknown
  await withServer(async (ctx) => {
    receivedBody = ctx.body
    return { code: 422, error: 'business validation failed' }
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/paperbanana-api`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-paperbanana-gateway-token': config.gatewayToken,
        'x-paperbanana-admin-transport-token': 'configured-admin-transport-token',
        'x-paperbanana-admin-user-id': 'immutable-admin-id',
      },
      body: JSON.stringify({ action: 'createJob', gatewayToken: 'caller-value', adminToken: 'caller-admin' }),
    })

    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { code: 422, error: 'business validation failed' })
    assert.deepEqual(receivedBody, { action: 'createJob', gatewayToken: config.gatewayToken })
  })
})

test('POST exposes only the gateway-authenticated client IP and safe user agent to the legacy handler', async () => {
  let receivedHeaders: Record<string, unknown> = {}
  await withServer(async (ctx) => {
    receivedHeaders = ctx.headers
    return { code: 0 }
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/paperbanana-api`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-paperbanana-gateway-token': config.gatewayToken,
        'x-paperbanana-client-ip': '203.0.113.17',
        'x-forwarded-for': '198.51.100.66',
        'x-real-ip': '198.51.100.77',
        'forwarded': 'for=198.51.100.88',
        'user-agent': 'safe-client',
      },
      body: JSON.stringify({ action: 'createJob' }),
    })

    assert.equal(response.status, 200)
    assert.equal(receivedHeaders['x-paperbanana-client-ip'], '203.0.113.17')
    assert.equal(receivedHeaders['user-agent'], 'safe-client')
    assert.equal(receivedHeaders['x-forwarded-for'], undefined)
    assert.equal(receivedHeaders['x-real-ip'], undefined)
    assert.equal(receivedHeaders.forwarded, undefined)
    assert.equal(receivedHeaders['x-paperbanana-gateway-token'], undefined)
  })
})

test('POST accepts a JSON string request body before token sanitization', async () => {
  let receivedBody: unknown
  await withServer(async (ctx) => {
    receivedBody = ctx.body
    return { code: 0, ok: true }
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/paperbanana-api`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-paperbanana-gateway-token': config.gatewayToken,
        'x-paperbanana-admin-transport-token': 'configured-admin-transport-token',
        'x-paperbanana-admin-user-id': 'immutable-admin-id',
      },
      body: JSON.stringify(JSON.stringify({ action: 'modelCapability', adminToken: 'remove-me' })),
    })

    assert.equal(response.status, 200)
    assert.deepEqual(receivedBody, { action: 'modelCapability', gatewayToken: config.gatewayToken })
  })
})

test('POST rejects JSON bodies larger than 1 MiB', async () => {
  await withServer(async () => assert.fail('handler must not run for oversized JSON'), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/paperbanana-api`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-paperbanana-gateway-token': config.gatewayToken,
      },
      body: JSON.stringify({ action: 'createJob', padding: 'x'.repeat(1024 * 1024) }),
    })

    assert.equal(response.status, 413)
    assert.deepEqual(await response.json(), { code: 413, error: 'Request body too large' })
  })
})

test('admin actions replace caller adminToken with the server-side admin token', async () => {
  let receivedBody: unknown
  await withServer(async (ctx) => {
    receivedBody = ctx.body
    return { code: 0, jobs: [] }
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/paperbanana-api`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-paperbanana-gateway-token': config.gatewayToken,
        'x-paperbanana-admin-transport-token': 'configured-admin-transport-token',
        'x-paperbanana-admin-user-id': 'immutable-admin-id',
      },
      body: JSON.stringify({ action: 'adminJobs', adminToken: 'caller-admin-token' }),
    })

    assert.equal(response.status, 200)
    assert.deepEqual(receivedBody, {
      action: 'adminJobs',
      gatewayToken: config.gatewayToken,
      adminToken: 'configured-server-admin-token',
      adminUserId: 'immutable-admin-id',
    })
  }, async () => ({ ready: true }), {
    ...config,
    adminToken: 'configured-server-admin-token',
    adminTransportToken: 'configured-admin-transport-token',
  })
})

test('every benchmark admin action receives only the server-side admin token', async () => {
  const received: any[] = []
  await withServer(async (ctx) => {
    received.push(ctx.body)
    return { code: 0 }
  }, async (baseUrl) => {
    for (const action of [
      'adminBenchmarkCandidates',
      'adminBenchmarkApprove',
      'adminBenchmarkControl',
      'adminBenchmarkReviewExport',
      'adminBenchmarkReviewImport',
      'adminBenchmarkPublish',
    ]) {
      const response = await fetch(`${baseUrl}/paperbanana-api`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-paperbanana-gateway-token': config.gatewayToken,
          'x-paperbanana-admin-transport-token': 'configured-admin-transport-token',
          'x-paperbanana-admin-user-id': 'immutable-admin-id',
        },
        body: JSON.stringify({ action, adminToken: 'caller-token' }),
      })
      assert.equal(response.status, 200)
    }
    assert.equal(received.length, 6)
    assert.ok(received.every((body) => body.adminToken === 'configured-server-admin-token'))
  }, async () => ({ ready: true }), { ...config, adminToken: 'configured-server-admin-token', adminTransportToken: 'configured-admin-transport-token' })
})

test('shared gateway token alone cannot authorize benchmark admin actions', async () => {
  let called = false
  const benchmarkService = { async handle(_body: any, isAdmin: boolean) { called = isAdmin; if (!isAdmin) throw new Error('BENCHMARK_ADMIN_REQUIRED'); return { code: 0 } } }
  const server = createServer({
    handler: async () => ({ code: 0 }), readinessProbe: async () => ({ ready: true }), healthSnapshot: () => ({ ready: true }),
    config: { ...config, adminToken: 'admin', adminTransportToken: 'transport' }, logger: { info() {}, warn() {}, error() {} }, benchmarkService,
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  try {
    const response = await fetch(`http://127.0.0.1:${port}/paperbanana-api`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-paperbanana-gateway-token': config.gatewayToken }, body: JSON.stringify({ action: 'adminBenchmarkPublish' }) })
    assert.equal((await response.json()).code, 401)
    assert.equal(called, false)
  } finally { await new Promise<void>((resolve) => server.close(() => resolve())) }
})

test('benchmark discovery token can read only modelRegistry', async () => {
  const received: string[] = []
  await withServer(async (ctx) => { received.push(ctx.body.action); return { code: 0 } }, async (baseUrl) => {
    const headers = { 'content-type': 'application/json', 'x-paperbanana-gateway-token': 'discovery-only' }
    const allowed = await fetch(`${baseUrl}/paperbanana-api`, { method: 'POST', headers, body: JSON.stringify({ action: 'modelRegistry' }) })
    assert.equal(allowed.status, 200)
    const denied = await fetch(`${baseUrl}/paperbanana-api`, { method: 'POST', headers, body: JSON.stringify({ action: 'adminBenchmarkPublish' }) })
    assert.equal(denied.status, 403)
    assert.deepEqual(received, ['modelRegistry'])
  }, async () => ({ ready: true }), { ...config, benchmarkDiscoveryToken: 'discovery-only' })
})

test('GET forwards query fields through the protected legacy envelope', async () => {
  let receivedBody: unknown
  await withServer(async (ctx) => {
    receivedBody = ctx.body
    return { code: 0, status: 'supported' }
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/paperbanana-api?action=modelCapability&provider=gemini`, {
      headers: { 'x-paperbanana-gateway-token': config.gatewayToken },
    })

    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { code: 0, status: 'supported' })
    assert.deepEqual(receivedBody, {
      action: 'modelCapability',
      provider: 'gemini',
      gatewayToken: config.gatewayToken,
    })
  })
})

test('OPTIONS preserves CORS behavior and returns 204 without transport authentication', async () => {
  await withServer(async () => assert.fail('handler must not run for OPTIONS'), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/paperbanana-api`, { method: 'OPTIONS' })

    assert.equal(response.status, 204)
    assert.equal(response.headers.get('access-control-allow-origin'), '*')
    assert.equal(response.headers.get('access-control-allow-methods'), 'GET,POST,OPTIONS')
    assert.match(response.headers.get('access-control-allow-headers') || '', /X-Paperbanana-Gateway-Token/i)
    assert.doesNotMatch(response.headers.get('access-control-allow-headers') || '', /X-Admin-Token/i)
  })
})

test('health identifies the Node service and reports dependency readiness', async () => {
  await withServer(async () => assert.fail('handler must not run for health'), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`)

    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), {
      ok: true,
      service: 'paperbanana-api',
      runtime: 'node',
      version: '0.1.0',
      ready: true,
      dependencies: { mongodb: 'ready', oss: 'ready' },
    })
  })
})

test('ready returns 503 until every startup dependency is ready', async () => {
  await withServer(
    async () => assert.fail('handler must not run for ready'),
    async (baseUrl) => {
      const response = await fetch(`${baseUrl}/ready`)
      assert.equal(response.status, 503)
      assert.deepEqual(await response.json(), {
        ok: false,
        service: 'paperbanana-api',
        runtime: 'node',
        version: '0.1.0',
        ready: false,
        dependencies: { mongodb: 'ready', oss: 'unavailable' },
      })
    },
    async () => ({ ready: false, dependencies: { mongodb: 'ready', oss: 'unavailable' } }),
  )
})

test('provider egress degradation is visible while ready remains authoritative for Mongo and OSS', async () => {
  const snapshot = {
    ready: true,
    dependencies: { mongodb: 'ready', oss: 'ready', providerEgress: 'degraded' },
  }
  await withServer(
    async () => assert.fail('handler must not run for health endpoints'),
    async (baseUrl) => {
      const ready = await fetch(`${baseUrl}/ready`)
      assert.equal(ready.status, 200)
      assert.deepEqual(await ready.json(), {
        ok: true,
        service: 'paperbanana-api',
        runtime: 'node',
        version: '0.1.0',
        ...snapshot,
      })

      const health = await fetch(`${baseUrl}/health`)
      assert.equal(health.status, 200)
      assert.deepEqual((await health.json()).dependencies, snapshot.dependencies)
    },
    async () => snapshot,
    config,
    () => snapshot,
  )
})

test('health remains a liveness success while reporting dependencies as not ready', async () => {
  await withServer(
    async () => assert.fail('handler must not run for health'),
    async (baseUrl) => {
      const response = await fetch(`${baseUrl}/health`)
      assert.equal(response.status, 200)
      assert.deepEqual(await response.json(), {
        ok: true,
        service: 'paperbanana-api',
        runtime: 'node',
        version: '0.1.0',
        ready: false,
        dependencies: { mongodb: 'unavailable', oss: 'ready' },
      })
    },
    async () => ({ ready: false, dependencies: { mongodb: 'unavailable', oss: 'ready' } }),
    config,
    () => ({ ready: false, dependencies: { mongodb: 'unavailable', oss: 'ready' } }),
  )
})

test('health is process-local and does not invoke a stalled readiness probe', async () => {
  let probeCalls = 0
  await withServer(
    async () => assert.fail('handler must not run for health'),
    async (baseUrl) => {
      const response = await fetch(`${baseUrl}/health`)
      assert.equal(response.status, 200)
      assert.equal(probeCalls, 0)
      assert.deepEqual(await response.json(), {
        ok: true,
        service: 'paperbanana-api',
        runtime: 'node',
        version: '0.1.0',
        ready: false,
        dependencies: { mongodb: 'unavailable', oss: 'unavailable' },
      })
    },
    async () => {
      probeCalls += 1
      return await new Promise(() => {})
    },
    config,
    () => ({ ready: false, dependencies: { mongodb: 'unavailable', oss: 'unavailable' } }),
  )
})

test('health remains responsive while a readiness request is actively stalled', async () => {
  let probeCalls = 0
  let releaseProbe!: () => void
  await withServer(
    async () => assert.fail('handler must not run for health'),
    async (baseUrl) => {
      const readyRequest = fetch(`${baseUrl}/ready`)
      while (!probeCalls) await new Promise((resolve) => setImmediate(resolve))

      const health = await fetch(`${baseUrl}/health`)
      assert.equal(health.status, 200)
      assert.equal((await health.json()).ready, false)
      assert.equal(probeCalls, 1)

      releaseProbe()
      assert.equal((await readyRequest).status, 503)
    },
    async () => {
      probeCalls += 1
      await new Promise<void>((resolve) => { releaseProbe = resolve })
      return { ready: false, dependencies: { mongodb: 'unavailable', oss: 'unavailable' } }
    },
    config,
    () => ({ ready: false, dependencies: { mongodb: 'unavailable', oss: 'unavailable' } }),
  )
})
