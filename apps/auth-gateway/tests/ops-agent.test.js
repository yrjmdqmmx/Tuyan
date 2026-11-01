import assert from 'node:assert/strict';
import test from 'node:test';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';
import { createApp } from '../src/app.js';
import { loadOpsConfig } from '../src/ops-config.js';
import { createOpsRouter } from '../src/ops-router.js';
import { createOpsService, readHostSnapshot } from '../src/ops-service.js';
import { createOpsCoreClient } from '../src/ops-core-client.js';
import { parseOpsQuery, JOB_STATES, FAILURE_CATEGORIES, FAILURE_STAGES, REQUEST_STATES } from '../../../packages/api/src/ops-read-contract.mjs';

const clock = Date.parse('2026-11-01T12:00:00.000Z');
const sampledAt = new Date(clock).toISOString();
const token = 'local_fixture_only_'.padEnd(48, 'x');
const internalToken = 'internal_fixture_only_'.padEnd(48, 'y');
const digest = value => createHash('sha256').update(value).digest('hex');
const scopes = ['overview:read', 'failures:read', 'health:read'];
const counts = (names, values = {}) => Object.fromEntries(names.map(key => [key, values[key] || 0]));
const fixtureConfig = (extra = {}) => ({ enabled: true, internalToken, tokens: [{ id: 'fixture', sha256: digest(token), scopes, expiresAt: '2027-01-01T00:00:00.000Z' }], ...extra });
const headers = { authorization: `Bearer ${token}` };
const accounts = { async overview() { return { total: 12, registered: 2, asOf: sampledAt, email: 'PRIVATE_SENTINEL' }; } };
async function coreRead(kind) {
  if (kind === 'overview') return { sampledAt, counts: counts(JOB_STATES, { succeeded: 3, failed: 1 }), prompt: 'PRIVATE_SENTINEL' };
  if (kind === 'failures') return { sampledAt, categories: counts(FAILURE_CATEGORIES, { quota: 1 }), stages: counts(FAILURE_STAGES, { rendering: 1 }), requestStates: counts(REQUEST_STATES, { rejected: 1 }), error: 'PRIVATE_SENTINEL' };
  return { version: 1, sampledAt, process: { uptimeSeconds: 120, memoryBytes: { rss: 123 } }, private: 'PRIVATE_SENTINEL' };
}
async function withRouter(run, options = {}) {
  const logs = [], calls = [];
  const app = express();
  app.use('/api/agent-ops', createOpsRouter({ config: fixtureConfig(), accounts, coreUrl: 'http://unused.invalid',
    coreRead: async (...args) => { calls.push(args); return coreRead(...args); }, nowMs: () => clock,
    logger: { info: (...args) => logs.push(args) }, ...options }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try { await run({ url: `http://127.0.0.1:${server.address().port}/api/agent-ops`, logs, calls }); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
async function rpc(url, method, params = {}) {
  return fetch(`${url}/mcp`, { method: 'POST', headers: { ...headers, 'content-type': 'application/json',
    accept: 'application/json, text/event-stream', 'mcp-protocol-version': '2025-06-18' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
}

test('configuration is off by default, rejects malformed secrets/scopes and credential reuse', () => {
  assert.deepEqual(loadOpsConfig({}), { enabled: false });
  const env = { TUYAN_OPS_AGENT_ENABLED: 'true', PAPERBANANA_OPERATIONS_TOKEN: internalToken,
    TUYAN_OPS_AGENT_TOKENS: JSON.stringify(fixtureConfig().tokens) };
  assert.equal(loadOpsConfig(env).tokens[0].id, 'fixture');
  for (const mutation of [
    { TUYAN_OPS_AGENT_TOKENS: 'PRIVATE_SENTINEL' }, { PAPERBANANA_OPERATIONS_TOKEN: '' },
    { PAPERBANANA_GATEWAY_TOKEN: internalToken }, { PAPERBANANA_GATEWAY_TOKEN: token },
    { ADMIN_TOKEN: internalToken }, { ADMIN_TOKEN: token },
    { ADMIN_TOKEN: ` ${token}\n` }, { PAPERBANANA_GATEWAY_TOKEN: ` ${internalToken}\n` },
    { TUYAN_OPS_HOST_SNAPSHOT_FILE: '../relative' },
    ...[{ sha256: 'short' }, { expiresAt: 'invalid' }, { scopes: ['admin:write'] }].map(extra => ({
      TUYAN_OPS_AGENT_TOKENS: JSON.stringify([{ ...fixtureConfig().tokens[0], ...extra }]),
    })),
  ]) assert.throws(() => loadOpsConfig({ ...env, ...mutation }), error => !error.message.includes('PRIVATE_SENTINEL'));
});

test('window validation rejects operator injection, unbounded, impossible and future dates', () => {
  assert.deepEqual(parseOpsQuery('overview', {}, clock), { from: '2026-10-31T12:00:00.000Z', to: sampledAt });
  for (const input of [{ action: 'delete' }, { from: { $gte: '' } }, { from: sampledAt },
    { from: '2026-02-30T00:00:00.000Z', to: sampledAt },
    { from: '2025-01-01T00:00:00.000Z', to: sampledAt },
    { from: sampledAt, to: '2026-11-02T00:00:00.000Z' },
    { from: [sampledAt], to: sampledAt }, null, []]) assert.throws(() => parseOpsQuery('overview', input, clock));
  assert.throws(() => parseOpsQuery('health', { from: sampledAt }, clock));
  assert.throws(() => parseOpsQuery('delete', {}, clock));
});

test('authentication excludes anonymous, cookie, query, expired keys and browser requests', async () => {
  await withRouter(async ({ url, calls }) => {
    for (const request of [{}, { headers: { cookie: `session=${token}` } }, { headers: { authorization: 'Bearer wrong' } }]) {
      assert.equal((await fetch(`${url}/overview?token=${token}`, request)).status, 401);
    }
    assert.equal((await fetch(`${url}/overview`, { headers: { ...headers, origin: 'https://example.com' } })).status, 403);
    assert.equal(calls.length, 0);
  });
  await withRouter(async ({ url }) => assert.equal((await fetch(`${url}/overview`, { headers })).status, 401),
    { config: fixtureConfig({ tokens: [{ ...fixtureConfig().tokens[0], expiresAt: sampledAt }] }) });
  await withRouter(async ({ url }) => assert.equal((await fetch(`${url}/overview`, { headers })).status, 404), { config: { enabled: false } });
});

test('HTTP responses and audits use fixed projections, scopes, methods and bounded queries', async () => {
  await withRouter(async ({ url, logs, calls }) => {
    const response = await fetch(`${url}/overview`, { headers });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), null);
    assert.equal(response.headers.get('set-cookie'), null);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const body = await response.json();
    assert.equal(body.tasks.successRate, 0.75);
    assert.equal(body.users.retainedAccounts, 12);
    assert.equal(body.window.field, 'createdAt');
    assert.equal(JSON.stringify(body).includes('PRIVATE_SENTINEL'), false);
    await fetch(`${url}/overview`, { headers });
    assert.equal(calls.length, 1); // cached aggregate
    assert.equal((await fetch(`${url}/overview?action=adminTaskFollowup`, { headers })).status, 400);
    assert.equal((await fetch(`${url}/overview?from[x]=1`, { headers })).status, 400);
    for (const method of ['POST', 'DELETE', 'PUT']) assert.equal((await fetch(`${url}/overview`, { headers, method })).status, 405);
    assert.equal((await fetch(`${url}/delete`, { headers })).status, 404);
    assert.equal(JSON.stringify(logs).includes(token), false);
    assert.equal(JSON.stringify(logs).includes('adminTaskFollowup'), false);
  });
  await withRouter(async ({ url }) => {
    assert.equal((await fetch(`${url}/overview`, { headers })).status, 403);
    const listing = await (await rpc(url, 'tools/list')).json();
    assert.deepEqual(listing.result.tools.map(tool => tool.name), ['tuyan_ops_health']);
    const denied = await (await rpc(url, 'tools/call', { name: 'tuyan_ops_overview', arguments: {} })).json();
    assert.ok(denied.error || denied.result?.isError);
  }, { config: fixtureConfig({ tokens: [{ ...fixtureConfig().tokens[0], scopes: ['health:read'] }] }) });
});

test('MCP initialize/discovery/parallel tool calls work statelessly with no write tools', async () => {
  await withRouter(async ({ url }) => {
    const initialized = await rpc(url, 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'fixture', version: '1' } });
    assert.equal(initialized.status, 200);
    assert.equal(initialized.headers.get('mcp-session-id'), null);
    const init = await initialized.json();
    assert.equal(init.result.serverInfo.name, 'tuyan-private-operations');
    const listing = await (await rpc(url, 'tools/list')).json();
    assert.deepEqual(listing.result.tools.map(tool => tool.name), ['tuyan_ops_overview', 'tuyan_ops_failures', 'tuyan_ops_health']);
    assert.ok(listing.result.tools.every(tool => tool.annotations.readOnlyHint && !tool.annotations.destructiveHint));
    const results = await Promise.all(['overview', 'failures', 'health'].map(async kind => {
      const body = await (await rpc(url, 'tools/call', { name: `tuyan_ops_${kind}`, arguments: {} })).json();
      assert.equal(body.result.isError, undefined);
      assert.equal(body.result.structuredContent.operation, kind);
      return body;
    }));
    assert.equal(JSON.stringify(results).includes('PRIVATE_SENTINEL'), false);
    const invalid = await (await rpc(url, 'tools/call', { name: 'tuyan_ops_overview', arguments: { from: 'bad' } })).json();
    assert.ok(invalid.error || invalid.result.isError);
  });
});

test('bounded per-credential rate limit and body limit', async () => {
  await withRouter(async ({ url }) => {
    for (let i = 0; i < 60; i++) assert.equal((await fetch(`${url}/health`, { headers })).status, 200);
    const response = await fetch(`${url}/health`, { headers });
    assert.equal(response.status, 429);
    assert.equal(response.headers.get('retry-after'), '60');
  });
  await withRouter(async ({ url }) => {
    assert.equal((await fetch(`${url}/mcp`, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ x: 'a'.repeat(17 * 1024) }) })).status, 413);
  });
});

test('missing/malformed sources are unavailable, zeros stay zeros, and empty denominator is null', async () => {
  const service = createOpsService({ nowMs: () => clock, accounts: { overview: async () => { throw new Error('PRIVATE_SENTINEL'); } }, coreRead: async () => { throw new Error('PRIVATE_SENTINEL'); } });
  const result = await service('overview', {});
  assert.equal(result.users.available, false); assert.equal(result.tasks.available, false);
  assert.equal(JSON.stringify(result).includes('PRIVATE_SENTINEL'), false);
  const zero = createOpsService({ nowMs: () => clock, accounts, coreRead: async () => ({ sampledAt, counts: counts(JOB_STATES) }) });
  const empty = await zero('overview', {});
  assert.equal(empty.tasks.total, 0); assert.equal(empty.tasks.successRate, null);
  const malformed = createOpsService({ nowMs: () => clock, accounts, coreRead: async () => ({ sampledAt, counts: {} }) });
  assert.equal((await malformed('overview', {})).tasks.available, false);
});

test('health snapshot projects only safe fields, identifies stale/missing/wrong-host data', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'tuyan-ops-test-'));
  const path = join(dir, 'hz-latest.json');
  try {
    const fixture = { version: 1, node: 'hz', sampledAt: new Date(clock - 360_000).toISOString(),
      host: { rootDiskBytes: { total: 1000, available: 30 }, loadAverage: [1, 2, 3], secret: 'PRIVATE_SENTINEL' }, core: { secret: 'PRIVATE_SENTINEL' } };
    await writeFile(path, JSON.stringify(fixture));
    const result = await readHostSnapshot(path, clock);
    assert.equal(result.stale, true); assert.equal(result.lowDiskSpace, true);
    assert.equal(result.rootDiskAvailableRatio, 0.03);
    assert.equal(JSON.stringify(result).includes('PRIVATE_SENTINEL'), false);
    await writeFile(path, JSON.stringify({ ...fixture, node: 'hk' }));
    assert.equal((await readHostSnapshot(path, clock)).available, false);
    await writeFile(path, 'x'.repeat(17 * 1024));
    assert.equal((await readHostSnapshot(path, clock)).available, false);
    assert.equal((await readHostSnapshot('', clock)).reason, 'not_configured');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('at most four aggregate queries run concurrently, and capacity recovers after completion', async () => {
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  const service = createOpsService({ nowMs: () => clock, accounts,
    coreRead: async kind => { await pending; return coreRead(kind); } });
  const reads = Array.from({ length: 4 }, () => service('overview', {}));
  await assert.rejects(service('overview', {}), error => error.status === 503);
  release();
  assert.ok((await Promise.all(reads)).every(result => result.tasks.available));
  assert.equal((await service('failures', {})).failures.total, 1);
});

test('Core transport never forwards client/admin credentials, follows redirects or accepts arbitrary actions', async () => {
  const requests = [];
  const client = createOpsCoreClient({ url: 'http://core.internal:3000/paperbanana-api', token: internalToken,
    fetchImpl: async (url, options) => { requests.push({ url: String(url), options }); return Response.json({ sampledAt }); } });
  await client('overview', { from: '2026-10-30T00:00:00.000Z', to: '2026-10-31T00:00:00.000Z' });
  assert.equal(new URL(requests[0].url).pathname, '/internal/operations/overview');
  assert.equal(requests[0].options.method, 'GET'); assert.equal(requests[0].options.redirect, 'error');
  assert.deepEqual(requests[0].options.headers, { 'x-paperbanana-operations-token': internalToken, accept: 'application/json' });
  await assert.rejects(client('adminTaskFollowup', {}));
  assert.equal(requests.length, 1);
  for (const response of [new Response('PRIVATE_SENTINEL', { status: 302, headers: { location: 'https://example.com' } }),
    new Response('PRIVATE_SENTINEL'.repeat(10000)), new Response('PRIVATE_SENTINEL', { status: 500 })]) {
    const failing = createOpsCoreClient({ url: 'http://core.internal', token: internalToken, fetchImpl: async () => response });
    await assert.rejects(failing('health', {}), error => error.message === 'Operations source unavailable');
  }
});

test('actual Gateway mounts private ops before public CORS/auth and keeps public MCP separate', async () => {
  let authCalls = 0, backendCalls = 0;
  const app = createApp({ config: { opsAgent: fixtureConfig(), backend: { url: 'http://unused.invalid', mode: 'node' }, frontendOrigins: ['https://example.com'], adminUserIds: new Set(),
    guestCookie: { name: 'fixture', secret: 'x'.repeat(32) }, maintenance: { retryAfterSeconds: 1 }, oss: {} },
    auth: { adminAccounts: accounts, webHandler: async () => Response.json({}), optionalSession: async () => { authCalls++; return null; } },
    backend: { call: async () => { backendCalls++; return {}; } }, isMaintenance: () => false, nowSeconds: () => clock / 1000,
    logger: { info() {}, warn() {}, error() {} } });
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const denied = await fetch(`${base}/api/agent-ops/overview`);
    assert.equal(denied.status, 401); assert.equal(denied.headers.get('access-control-allow-origin'), null);
    assert.equal(authCalls, 0); assert.equal(backendCalls, 0);
    const response = await fetch(`${base}/mcp`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }) });
    const text = await response.text();
    assert.equal(response.status, 200); assert.ok(text.includes('tuyan.get_workflow_bundle')); assert.equal(text.includes('tuyan_ops_'), false);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
