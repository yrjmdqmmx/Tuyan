import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { createEcosystemRouter } from '../src/ecosystem.js';

const origin = 'https://tuyan.example';
const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>').toString('base64');
const result = { tool: 'semiotic', format: 'svg', base64: svg, filename: '../../bad.svg', engineVersion: '3.12.1', summary: {} };
async function fixture(t, { worker = { url: 'http://worker:8000', token: 'internal-test-token-never-client' }, fetchImpl = async () => Response.json(result), isMaintenance, timeoutMs, auth } = {}) {
  const app = express(), calls = [];
  app.use('/api/ecosystem', createEcosystemRouter({ frontendOrigins: [origin], worker, isMaintenance, timeoutMs,
    auth: auth || { optionalSession: async req => req.get('cookie') === 'fixture=A' ? { user: { id: 'A' } } : null },
    fetchImpl: async (...args) => { calls.push(args); return fetchImpl(...args); } }));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api/ecosystem`;
  const request = (options = {}, path = '/render') => fetch(base + path, { method: 'POST', body: JSON.stringify({ tool: 'semiotic', data: [{ x: 1, y: 2 }], options: { chart: 'scatter', x: 'x', y: 'y' } }), ...options, headers: { origin, cookie: 'fixture=A', 'content-type': 'application/json', 'x-workspace-account': 'A', ...options.headers } });
  return { request, calls };
}
test('ecosystem requires live account and trusted origin before parsing and forwarding', async t => {
  const f = await fixture(t);
  for (const [headers, status] of [[{ cookie: '' }, 401], [{ origin: 'https://evil.test' }, 403], [{ origin: '' }, 403], [{ 'x-workspace-account': 'B' }, 409], [{ 'content-type': 'text/plain' }, 415]]) assert.equal((await f.request({ headers })).status, status);
  assert.equal(f.calls.length, 0);
  const response = await f.request(), value = await response.json();
  assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(value.filename, 'Tuyan-semiotic.svg'); assert.equal(value.base64, svg);
  assert.equal(JSON.stringify(value).includes('internal-test-token'), false);
  assert.equal(String(f.calls[0][0]), 'http://worker:8000/render');
  assert.equal(f.calls[0][1].headers.Authorization, 'Bearer internal-test-token-never-client');
  assert.equal(f.calls[0][1].headers.cookie, undefined);
});
test('unconfigured or maintained service fails closed, never touching Core or worker', async t => {
  for (const options of [{ worker: {} }, { isMaintenance: () => true }]) {
    const f = await fixture(t, options); assert.equal((await f.request()).status, 503); assert.equal(f.calls.length, 0);
  }
});
test('malformed and excessive payloads never reach the worker', async t => {
  const f = await fixture(t);
  assert.equal((await f.request({ body: '{broken' })).status, 400);
  assert.equal((await f.request({ body: '{"tool":"semiotic","data":[{"x":1,"y":1e400}],"options":{"x":"x","y":"y"}}' })).status, 400);
  assert.equal((await f.request({ body: JSON.stringify({ tool: 'shell' }) })).status, 400);
  assert.equal((await f.request({ body: JSON.stringify({ tool: 'semiotic', data: 'x'.repeat(8 * 1024 * 1024) }) })).status, 413);
  assert.equal(f.calls.length, 0);
});
test('gateway preserves duplicate JSON properties for strict worker rejection', async t => {
  const raw = '{"tool":"semiotic","tool":"semiotic","data":[{"x":1,"y":2}]}';
  const f = await fixture(t, {fetchImpl: async (_url, init) => {
    assert.equal(Buffer.from(init.body).toString(), raw);
    return Response.json({error:{code:'invalid_json'}}, {status:400});
  }});
  assert.equal((await f.request({body:raw})).status, 400);
});
test('worker errors are bounded and hidden; expired sessions cannot receive results', async t => {
  const bad = await fixture(t, { fetchImpl: async () => Response.json({ error: 'TOKEN=very-secret traceback /app/private' }, { status: 500 }) });
  const res = await bad.request(); assert.equal(res.status, 502); assert.doesNotMatch(await res.text(), /TOKEN|traceback|private/);
  let reads = 0;
  const revoked = await fixture(t, { auth: { optionalSession: async () => ++reads === 1 ? { user: { id: 'A' } } : null } });
  assert.equal((await revoked.request()).status, 401);
  const malformed = await fixture(t, { fetchImpl: async () => Response.json({ ...result, tool: 'dataviz' }) });
  assert.equal((await malformed.request()).status, 502);
});
test('concurrent account renders are rejected, then released after completion', async t => {
  let finish, started; const ready = new Promise(resolve => { started = resolve; });
  const f = await fixture(t, { fetchImpl: async () => { started(); await new Promise(resolve => { finish = resolve; }); return Response.json(result); } });
  const first = f.request(); await ready;
  assert.equal((await f.request()).status, 429); finish(); assert.equal((await first).status, 200);
  assert.equal(f.calls.length, 1);
});
test('worker timeout aborts the request and rate window bounds repeated renders', async t => {
  const slow = await fixture(t, { timeoutMs: 20, fetchImpl: async (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(Error('timed out')), { once: true })) });
  assert.equal((await slow.request()).status, 504);
  const f = await fixture(t);
  for (let i = 0; i < 6; i++) assert.equal((await f.request()).status, 200);
  assert.equal((await f.request()).status, 429); assert.equal(f.calls.length, 6);
});
