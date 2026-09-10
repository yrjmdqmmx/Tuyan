import assert from 'node:assert/strict';
import test from 'node:test';
import { randomBytes } from 'node:crypto';
import { createProductionAuthBridge } from './lib/tokendance-production-auth.mjs';

const apiBase = 'http://127.0.0.1:8791', origin = 'http://127.0.0.1:5173';
const upstreamSecret = 'fixture-upstream-session-only';
const upstreamCookie = '__Secure-paperbanana.session_token=' + upstreamSecret + '; Path=/; Domain=.paperbanana.asia; HttpOnly; Secure; SameSite=Lax';
const sessionData = { user: { id: 'real-user-id', email: 'fixture@example.test' }, session: { id: 'session-id', token: upstreamSecret, userId: 'real-user-id', ipAddress: 'private-ip', userAgent: 'private-agent' } };
function database() {
  const rows = new Map();
  const match = (row, q) => row && (q.revision === undefined || row.revision === q.revision) && (!q.expiresAt || row.expiresAt > q.expiresAt.$gt);
  const collection = {
    async createIndex() {},
    async insertOne(row) { rows.set(row._id, structuredClone(row)); },
    async findOne(q) { const row = rows.get(q._id); return match(row, q) ? structuredClone(row) : null; },
    async deleteOne(q) { return { deletedCount: Number(rows.delete(q._id)) }; },
    async updateOne(q, change) {
      const row = rows.get(q._id); if (!match(row, q)) return { matchedCount: 0 };
      Object.assign(row, structuredClone(change.$set));
      for (const [k, v] of Object.entries(change.$inc || {})) row[k] += v;
      return { matchedCount: 1 };
    },
  };
  return { rows, collection: () => collection };
}
const request = (route, { method = 'POST', cookie, body = {}, requestOrigin = origin } = {}) => new Request(apiBase + '/api/auth/' + route, {
  method, headers: { ...(requestOrigin ? { Origin: requestOrigin } : {}), ...(cookie ? { Cookie: cookie } : {}), 'Content-Type': 'application/json' }, ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
});
async function fixture(overrides = {}) {
  const db = database(), calls = [];
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    if (overrides.fetcher) return overrides.fetcher(url, options);
    if (url.endsWith('/sign-in/email')) return Response.json({ ...sessionData, token: upstreamSecret }, { headers: { 'Set-Cookie': upstreamCookie } });
    if (url.includes('/get-session')) return Response.json(sessionData);
    if (url.endsWith('/api/account/status')) return Response.json({ code: 0, state: 'active' });
    return Response.json({ success: true });
  };
  const bridge = await createProductionAuthBridge({ db, secret: overrides.secret || randomBytes(32).toString('base64'), apiBase, frontendOrigins: [origin, apiBase], fetcher, now: overrides.now });
  return { bridge, db, calls };
}
async function login(bridge) {
  const result = await bridge.webHandler(request('sign-in/email', { body: { email: 'fixture@example.test', password: 'fixture-password' } }));
  assert.equal(result.status, 200);
  const cookie = result.headers.get('set-cookie').split(';')[0];
  return { result, cookie };
}

test('production login keeps upstream credentials encrypted and exposes only a fresh HttpOnly handle', async () => {
  const { bridge, db, calls } = await fixture();
  const { result, cookie } = await login(bridge);
  assert.doesNotMatch(JSON.stringify(await result.json()), /fixture-upstream|private-ip|private-agent/);
  assert.match(result.headers.get('set-cookie'), /HttpOnly; SameSite=Lax/);
  assert.doesNotMatch(cookie, /fixture-upstream|paperbanana/);
  assert.doesNotMatch(JSON.stringify([...db.rows.values()]), /fixture-upstream|fixture-password/);
  assert.equal(calls[0].url, 'https://api.paperbanana.asia/api/auth/sign-in/email');
  assert.equal(calls[0].options.headers.Origin, 'https://www.paperbanana.asia');
  assert.equal(calls[0].options.redirect, 'error');
  const res = await bridge.webHandler(request('get-session', { method: 'GET', cookie }));
  assert.equal((await res.json()).user.id, 'real-user-id');
  assert.ok(calls.some(call => call.url.endsWith('/get-session?disableCookieCache=true')));
  assert.ok(calls.some(call => call.url.endsWith('/api/account/status')));
  assert.equal(calls[1].options.headers.Cookie, '__Secure-paperbanana.session_token=' + upstreamSecret);
});

test('foreign, missing POST origins, changed local host and unsupported routes cannot reach production', async () => {
  const { bridge, calls } = await fixture();
  for (const requestOrigin of ['https://evil.test', undefined]) {
    const req = request('sign-in/email', { requestOrigin: requestOrigin || '' });
    assert.equal((await bridge.webHandler(req)).status, 403);
  }
  const wrongHost = new Request('http://evil.test/api/auth/sign-in/email', { method: 'POST', headers: { Origin: origin }, body: '{}' });
  assert.equal((await bridge.webHandler(wrongHost)).status, 403);
  assert.equal((await bridge.webHandler(request('delete-user'))).status, 404);
  assert.equal(calls.length, 0);
});

test('production registration and reset preserve canonical callback destinations and Retry-After', async () => {
  const calls = [];
  const { bridge } = await fixture({ fetcher: async (url, options) => { calls.push({ url, payload: JSON.parse(options.body) }); return Response.json({ code: 'RATE_LIMITED', message: 'retry' }, { status: 429, headers: { 'X-Retry-After': '60' } }); } });
  for (const [route, body] of [
    ['sign-up/email', { callbackURL: 'https://www.paperbanana.asia/account/email-verified.html' }],
    ['request-password-reset', { redirectTo: 'https://www.paperbanana.asia/account/reset-password.html' }],
  ]) {
    const result = await bridge.webHandler(request(route, { body }));
    assert.equal(result.status, 429); assert.equal(result.headers.get('x-retry-after'), '60');
    assert.deepEqual(calls.at(-1).payload, body);
  }
});

test('server revocation and local expiry remove access rather than trusting the local user ID', async () => {
  let revoked = false, time = 1000;
  const { bridge } = await fixture({ now: () => time, fetcher: async url => url.endsWith('/sign-in/email')
    ? Response.json({ ...sessionData, token: upstreamSecret }, { headers: { 'Set-Cookie': upstreamCookie } })
    : url.endsWith('/api/account/status') ? Response.json({ state: 'active' }) : Response.json(revoked ? null : sessionData) });
  const { cookie } = await login(bridge);
  revoked = true;
  assert.equal(await bridge.optionalSession({ headers: { cookie, 'x-user-id': 'forged-user' } }), null);
  revoked = false;
  const next = await login(bridge); time += 8 * 86400_000;
  assert.equal(await bridge.optionalSession({ headers: { cookie: next.cookie } }), null);
});

test('account deletion, upstream identity changes and server failure all fail closed', async () => {
  for (const mode of ['deleting', 'different-user', 'unavailable']) {
    const { bridge } = await fixture({ fetcher: async url => {
      if (url.endsWith('/sign-in/email')) return Response.json(sessionData, { headers: { 'Set-Cookie': upstreamCookie } });
      if (mode === 'unavailable') throw new Error('secret-looking-upstream-failure');
      if (url.endsWith('/api/account/status')) return Response.json({ state: mode === 'deleting' ? 'deleting' : 'active' });
      return Response.json(mode === 'different-user' ? { ...sessionData, user: { id: 'other-user' } } : sessionData);
    } });
    const { cookie } = await login(bridge);
    const result = await bridge.webHandler(request('get-session', { method: 'GET', cookie }));
    assert.equal(result.status, { deleting: 409, 'different-user': 401, unavailable: 503 }[mode]);
    assert.doesNotMatch(await result.text(), /secret-looking|fixture-upstream/);
  }
});

test('bodyless Better Auth logout clears both the local handle and upstream session', async () => {
  const { bridge, db, calls } = await fixture();
  const { cookie } = await login(bridge);
  const result = await bridge.webHandler(new Request(apiBase + '/api/auth/sign-out', { method: 'POST', headers: { Cookie: cookie, Origin: origin } }));
  assert.equal(result.status, 200); assert.match(result.headers.get('set-cookie'), /Max-Age=0/);
  assert.equal(db.rows.size, 0);
  assert.equal(await bridge.optionalSession({ headers: { cookie } }), null);
  assert.ok(calls.some(call => call.url.endsWith('/sign-out')));
});

test('a delayed server session response cannot restore a locally signed-out session', async () => {
  let release, entered;
  const blocked = new Promise(resolve => { release = resolve; });
  const started = new Promise(resolve => { entered = resolve; });
  const { bridge, db } = await fixture({ fetcher: async url => {
    if (url.endsWith('/sign-in/email')) return Response.json(sessionData, { headers: { 'Set-Cookie': upstreamCookie } });
    if (url.includes('/get-session')) { entered(); await blocked; return Response.json(sessionData); }
    if (url.endsWith('/api/account/status')) return Response.json({ state: 'active' });
    return Response.json({ success: true });
  } });
  const { cookie } = await login(bridge);
  const pending = bridge.optionalSession({ headers: { cookie } });
  await started;
  assert.equal((await bridge.webHandler(request('sign-out', { cookie }))).status, 200);
  release();
  assert.equal(await pending, null);
  assert.equal(db.rows.size, 0);
});

test('unconfirmed remote logout still clears local credentials and reports the uncertainty', async () => {
  const { bridge, db } = await fixture({ fetcher: async url => url.endsWith('/sign-in/email')
    ? Response.json(sessionData, { headers: { 'Set-Cookie': upstreamCookie } }) : Response.json({}, { status: 503 }) });
  const { cookie } = await login(bridge);
  const result = await bridge.webHandler(request('sign-out', { cookie }));
  assert.equal(result.status, 503);
  assert.match(result.headers.get('set-cookie'), /Max-Age=0/);
  assert.equal((await result.json()).code, 'REMOTE_SIGNOUT_UNCERTAIN');
  assert.equal(db.rows.size, 0);
});

test('stable local encryption supports restart; tampering never yields an authenticated session', async () => {
  const secret = randomBytes(32).toString('base64');
  const first = await fixture({ secret });
  const { cookie } = await login(first.bridge);
  const restarted = await createProductionAuthBridge({ db: first.db, secret, apiBase, frontendOrigins: [origin], fetcher: async url => Response.json(url.endsWith('/api/account/status') ? { state: 'active' } : sessionData) });
  assert.equal((await restarted.optionalSession({ headers: { cookie } })).user.id, 'real-user-id');
  first.db.rows.values().next().value.sealed.tag = Buffer.alloc(16).toString('base64');
  await assert.rejects(() => restarted.optionalSession({ headers: { cookie } }), { status: 401 });
  assert.equal(first.db.rows.size, 0);
});
