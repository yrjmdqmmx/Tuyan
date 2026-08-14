import assert from 'node:assert/strict';
import test from 'node:test';

import { BackendError, createBackendClient } from '../src/backend-client.js';

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

test('Node transport uses the internal header and strips caller service tokens', async () => {
  let captured;
  const client = createBackendClient({
    mode: 'node',
    url: 'http://core/paperbanana-api',
    timeoutMs: 500,
    gatewayToken: 'server-gateway-token',
    adminToken: 'server-admin-token',
    fetchImpl: async (url, init) => {
      captured = { url, init, body: JSON.parse(init.body) };
      return jsonResponse({ code: 0, ok: true });
    },
  });

  await client.call(
    { action: 'createJob', gatewayToken: 'forged', adminToken: 'forged-admin', value: 1 },
    { clientIp: '203.0.113.8', userAgent: 'safe-agent' },
  );

  assert.equal(captured.url, 'http://core/paperbanana-api');
  assert.equal(captured.init.headers['x-paperbanana-gateway-token'], 'server-gateway-token');
  assert.equal(captured.init.headers['x-paperbanana-client-ip'], '203.0.113.8');
  assert.equal(captured.init.headers['user-agent'], 'safe-agent');
  assert.equal(captured.body.gatewayToken, undefined);
  assert.equal(captured.body.adminToken, undefined);
  assert.equal(captured.body.value, 1);
  assert.equal(captured.init.headers['x-forwarded-for'], undefined);
  assert.equal(captured.init.headers['x-real-ip'], undefined);
});

test('Laf rollback transport overwrites the gateway token and injects admin only for admin actions', async () => {
  const bodies = [];
  const headers = [];
  const client = createBackendClient({
    mode: 'laf',
    url: 'https://legacy.example/paperbanana-api',
    timeoutMs: 500,
    gatewayToken: 'server-gateway-token',
    adminToken: 'server-admin-token',
    fetchImpl: async (_url, init) => {
      bodies.push(JSON.parse(init.body));
      headers.push(init.headers);
      return jsonResponse({ code: 0 });
    },
  });

  await client.call(
    { action: 'createJob', gatewayToken: 'forged', adminToken: 'forged' },
    { clientIp: '203.0.113.22', userAgent: 'laf-client' },
  );
  await client.call(
    { action: 'adminJobs', gatewayToken: 'forged', adminToken: 'forged' },
    {},
    { adminAction: true },
  );

  assert.deepEqual(bodies[0], { action: 'createJob', gatewayToken: 'server-gateway-token' });
  assert.deepEqual(bodies[1], {
    action: 'adminJobs',
    gatewayToken: 'server-gateway-token',
    adminToken: 'server-admin-token',
  });
  assert.equal(headers[0]['x-paperbanana-client-ip'], '203.0.113.22');
  assert.equal(headers[0]['user-agent'], 'laf-client');
  assert.equal(headers[0]['x-forwarded-for'], undefined);
  assert.equal(headers[0]['x-real-ip'], undefined);
});

test('relays upstream HTTP status and JSON envelope without flattening business codes', async () => {
  const client = createBackendClient({
    mode: 'node',
    url: 'http://core/paperbanana-api',
    timeoutMs: 500,
    gatewayToken: 'token',
    fetchImpl: async () => jsonResponse({ code: 429, error: 'busy' }, 200),
  });

  assert.deepEqual(await client.call({ action: 'createJob' }), {
    status: 200,
    data: { code: 429, error: 'busy' },
  });
});

test('maps network failures to a typed 502', async () => {
  const client = createBackendClient({
    mode: 'node',
    url: 'http://core/paperbanana-api',
    timeoutMs: 500,
    gatewayToken: 'token',
    fetchImpl: async () => {
      throw new TypeError('connect failed');
    },
  });

  await assert.rejects(
    () => client.call({ action: 'health' }),
    (error) => error instanceof BackendError && error.status === 502 && error.code === 'BACKEND_UNAVAILABLE',
  );
});

test('aborts expired requests and maps them to a typed 504', async () => {
  const client = createBackendClient({
    mode: 'node',
    url: 'http://core/paperbanana-api',
    timeoutMs: 10,
    gatewayToken: 'token',
    fetchImpl: async (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true });
      }),
  });

  await assert.rejects(
    () => client.call({ action: 'health' }),
    (error) => error instanceof BackendError && error.status === 504 && error.code === 'BACKEND_TIMEOUT',
  );
});

test('Node readiness calls the protected core GET /ready and requires ready true', async () => {
  const requests = [];
  const client = createBackendClient({
    mode: 'node',
    url: 'http://core:3006/paperbanana-api',
    timeoutMs: 500,
    gatewayToken: 'gateway-token',
    fetchImpl: async (url, init) => {
      requests.push({ url, init });
      return jsonResponse({ ready: true, dependencies: { mongodb: 'ready', oss: 'ready' } });
    },
  });

  const result = await client.ready({ clientIp: '203.0.113.30' });
  assert.equal(result.ok, true);
  assert.equal(requests[0].url, 'http://core:3006/ready');
  assert.equal(requests[0].init.method, 'GET');
  assert.equal(requests[0].init.body, undefined);
  assert.equal(requests[0].init.headers['x-paperbanana-gateway-token'], 'gateway-token');
  assert.equal(client.cachedStatus().ok, true);
});

test('Node readiness rejects ready false or a non-success HTTP status', async () => {
  for (const [status, body] of [
    [200, { ready: false }],
    [503, { ready: true }],
  ]) {
    const client = createBackendClient({
      mode: 'node',
      url: 'http://core:3006/paperbanana-api',
      timeoutMs: 500,
      gatewayToken: 'gateway-token',
      fetchImpl: async () => jsonResponse(body, status),
    });
    const result = await client.ready();
    assert.equal(result.ok, false);
    assert.equal(client.cachedStatus().ok, false);
  }
});

test('Laf rollback readiness uses the legacy health action', async () => {
  let captured;
  const client = createBackendClient({
    mode: 'laf',
    url: 'https://legacy.example/paperbanana-api',
    timeoutMs: 500,
    gatewayToken: 'gateway-token',
    fetchImpl: async (url, init) => {
      captured = { url, init, body: JSON.parse(init.body) };
      return jsonResponse({ code: 0, ok: true });
    },
  });

  assert.equal((await client.ready()).ok, true);
  assert.equal(captured.url, 'https://legacy.example/paperbanana-api');
  assert.equal(captured.init.method, 'POST');
  assert.deepEqual(captured.body, { action: 'health', gatewayToken: 'gateway-token' });
});

test('business envelopes never poison or heal probe-derived readiness', async () => {
  let readinessHealthy = true;
  const client = createBackendClient({
    mode: 'node',
    url: 'http://core:3006/paperbanana-api',
    timeoutMs: 500,
    gatewayToken: 'gateway-token',
    fetchImpl: async (_url, init) => {
      if (init.method === 'GET') return jsonResponse({ ready: readinessHealthy });
      return jsonResponse(readinessHealthy ? { code: 429, error: 'busy' } : { code: 0, ok: true });
    },
  });

  await client.ready();
  const healthySnapshot = client.cachedStatus();
  await client.call({ action: 'createJob' });
  assert.deepEqual(client.cachedStatus(), healthySnapshot);

  readinessHealthy = false;
  await client.ready();
  const unhealthySnapshot = client.cachedStatus();
  await client.call({ action: 'createJob' });
  assert.deepEqual(client.cachedStatus(), unhealthySnapshot);
});
