import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { ObjectId } from 'mongodb';
import { createAuthRuntime } from '../../src/auth.js';
import { createWatchaFixture } from './watcha-fixture.mjs';

let clock = new Date();
let databaseBarrier = async () => {};
const fixture = await createWatchaFixture({ uri: process.env.WATCHA_TEST_MONGO_URI, now: () => clock, databaseBarrier: (call) => databaseBarrier(call) });
function barrierWhen(predicate) {
  let reached; let resume; let armed = true;
  const entered = new Promise((resolve) => { reached = resolve; });
  const released = new Promise((resolve) => { resume = resolve; });
  databaseBarrier = async (call) => {
    if (!armed || !predicate(call)) return;
    armed = false; reached(); await released;
  };
  return { entered, resume: () => { databaseBarrier = async () => {}; resume(); } };
}
const { origin, runtime, db, mail } = fixture;
const digest = (value) => createHash('sha256').update(value).digest('hex');
function browser() {
  const cookies = new Map();
  return { cookies,
    cookie() { return [...cookies].map(([k, v]) => `${k}=${v}`).join('; '); },
    async request(path, body, extra = {}) {
      const response = await fetch(`${origin}${path.startsWith('/api/') ? path : `/api/auth/${path}`}`, {
        method: body === undefined ? 'GET' : 'POST', redirect: 'manual',
        headers: { origin, cookie: this.cookie(), 'content-type': 'application/json', 'x-forwarded-for': '127.0.0.1', ...extra },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      for (const cookie of response.headers.getSetCookie()) { const [name, ...value] = cookie.split(';')[0].split('='); if (value.join('=')) cookies.set(name, value.join('=')); else cookies.delete(name); }
      return response;
    },
    async json(path, body) { const r = await this.request(path, body); return { status: r.status, data: await r.json() }; },
  };
}
async function start(b, intent = 'login') {
  const result = await b.json('watcha/start', { intent, returnOrigin: origin });
  assert.equal(result.status, 200, JSON.stringify(result.data));
  const url = new URL(result.data.url); return url.searchParams.get('state');
}
async function callback(b, state, id = 42, suffix = '') { return b.request(`oauth2/callback/watcha?state=${state}&code=${id}${suffix}`); }
async function pending(b, id) {
  const state = await start(b); const response = await callback(b, state, id);
  assert.equal(response.status, 302); assert.equal(new URL(response.headers.get('location')).searchParams.get('watcha'), 'pending');
}
async function sendCode(b, purpose, email) {
  const response = await b.json('watcha/email-code', { purpose, ...(email ? { email } : {}) });
  assert.equal(response.status, 200, JSON.stringify(response.data));
  return mail.at(-1).textBody.match(/验证码：(\d{6})/)[1];
}
async function signIn(b, email, password = 'fixture-password-long') {
  const response = await b.json('sign-in/email', { email, password });
  assert.equal(response.status, 200, JSON.stringify(response.data)); return response.data.user;
}
async function existingUser(b, email) {
  const result = await b.json('sign-up/email', { email, password: 'fixture-password-long', name: 'Existing account' });
  assert.equal(result.status, 200);
  await db.collection('user').updateOne({ email }, { $set: { emailVerified: true } });
  return signIn(b, email);
}
try {
  const disabled = await createAuthRuntime({ ...fixture.config, watcha: { enabled: false }, authEmail: { deliveryEnabled: false } });
  try {
    const result = await disabled.webHandler(new Request(`${origin}/api/auth/watcha/status`));
    assert.deepEqual(await result.json(), { available: false, linked: false, hasPassword: false, emailVerified: false, pending: null });
    const blocked = await disabled.webHandler(new Request(`${origin}/api/auth/watcha/start`, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: '{}' }));
    assert.equal(blocked.status, 503); assert.equal((await blocked.json()).code, 'WATCHA_DISABLED');
  } finally { await disabled.close(); }
  console.log('PASS disabled real runtime exposes no client details and rejects initiation');
  const a = browser();
  const status = await a.json('watcha/status');
  assert.deepEqual(status.data, { available: true, linked: false, hasPassword: false, emailVerified: false, pending: null });
  assert.equal((await a.json('watcha/start', { intent: 'login', returnOrigin: 'https://evil.test' })).status, 400);
  assert.equal((await a.request('watcha/start', { intent: 'login', returnOrigin: origin }, { origin: 'https://evil.test' })).status, 403);
  assert.equal((await a.json('watcha/link', {})).status, 401);
  const malformed = await callback(a, 'bad', 42);
  assert.match(malformed.headers.get('location'), /watcha=error$/);
  const state = await start(a); const wrong = browser();
  assert.match((await callback(wrong, state)).headers.get('location'), /watcha=error$/);
  assert.equal(await db.collection('watchaTransactions').countDocuments({ _id: digest(state) }), 1);
  assert.match((await callback(a, state)).headers.get('location'), /watcha=pending$/);
  assert.match((await callback(a, state)).headers.get('location'), /watcha=error$/);
  assert.equal((await a.json('watcha/status')).data.pending.nickname, '观猹测试 42');
  console.log('PASS browser binding, origin, malformed and one-use state');

  let code = await sendCode(a, 'signup', 'new@example.test');
  const wrongCode = code === '111111' ? '222222' : '111111';
  for (let i = 0; i < 5; i++) assert.equal((await a.json('watcha/complete', { email: 'new@example.test', code: wrongCode })).data.code, 'WATCHA_INVALID_CODE');
  assert.equal((await a.json('watcha/complete', { email: 'new@example.test', code })).data.code, 'WATCHA_INVALID_CODE');
  const oldCode = code; code = await sendCode(a, 'signup', 'new@example.test');
  if (code !== oldCode) assert.equal((await a.json('watcha/complete', { email: 'new@example.test', code: oldCode })).data.code, 'WATCHA_INVALID_CODE');
  const stored = await db.collection('watchaEmailCodes').findOne({});
  assert.equal(JSON.stringify(stored).includes(code), false);
  assert.equal((await wrong.json('watcha/complete', { email: 'new@example.test', code })).data.code, 'WATCHA_PENDING_EXPIRED');
  const complete = await a.json('watcha/complete', { email: ' NEW@example.test ', code });
  assert.equal(complete.status, 200, JSON.stringify(complete.data));
  const session = await a.json('get-session'); assert.equal(session.status, 200); assert.equal(session.data.user.emailVerified, true);
  const firstId = session.data.user.id; assert.ok(firstId);
  assert.equal(await db.collection('account').countDocuments({ providerId: 'credential', userId: new ObjectId(firstId) }), 0);
  assert.deepEqual((await a.json('watcha/status')).data, { available: true, linked: true, hasPassword: false, emailVerified: true, pending: null });
  assert.equal((await a.json('watcha/start', { intent: 'login', returnOrigin: origin })).data.code, 'WATCHA_SIGN_OUT_REQUIRED');
  assert.equal((await a.request('unlink-account', { providerId: 'watcha' })).status, 404);
  console.log('PASS HMAC code, guesses, resend, browser binding and real passwordless Better Auth session');

  const returning = browser();
  assert.match((await callback(returning, await start(returning), 42)).headers.get('location'), /watcha=complete$/);
  assert.equal((await returning.json('get-session')).data.user.id, firstId);
  assert.equal(await db.collection('user').countDocuments({}), 1);
  const unlinkCode = await sendCode(a, 'unlink', 'ignored@example.test');
  assert.equal(mail.at(-1).toAddress, 'new@example.test');
  assert.equal((await a.json('watcha/unlink', { code: unlinkCode })).data.code, 'WATCHA_LAST_LOGIN_METHOD');
  assert.equal((await a.json('watcha/delete-confirmation', { code: unlinkCode })).data.code, 'WATCHA_INVALID_CODE');
  const deleteCode = await sendCode(a, 'delete');
  assert.equal((await returning.json('watcha/delete-confirmation', { code: deleteCode })).data.code, 'WATCHA_INVALID_CODE');
  const proof = await a.json('watcha/delete-confirmation', { code: deleteCode }); assert.equal(proof.status, 200);
  assert.equal(await runtime.consumeDeletionConfirmation({ confirmationToken: proof.data.confirmationToken, session: (await returning.json('get-session')).data }), false);
  assert.equal(await runtime.consumeDeletionConfirmation({ confirmationToken: proof.data.confirmationToken, session: session.data }), true);
  assert.equal(await runtime.consumeDeletionConfirmation({ confirmationToken: proof.data.confirmationToken, session: session.data }), false);
  console.log('PASS linked no-email sign-in preserves immutable ID, last-login guard, purpose/session-bound one-use deletion confirmation');
  const finalDeleteCode = await sendCode(a, 'delete');
  const finalProof = (await a.json('watcha/delete-confirmation', { code: finalDeleteCode })).data.confirmationToken;
  assert.equal((await a.json('/api/account/delete', { email: 'wrong@example.test', confirmationToken: finalProof })).status, 403);
  assert.equal((await a.json('/api/account/delete', { email: 'new@example.test', confirmationToken: finalProof })).status, 200);
  assert.equal((await a.json('get-session')).data, null);
  assert.equal(await db.collection('account').countDocuments({ userId: new ObjectId(firstId) }), 0);
  assert.equal(await db.collection('session').countDocuments({ userId: new ObjectId(firstId) }), 0);
  console.log('PASS actual Gateway passwordless deletion preserves explicit email match and commits the lifecycle service');


  const owner = browser(); const oldUser = await existingUser(owner, 'owner@example.test');
  await db.collection('fixtureJobs').insertOne({ userId: oldUser.id, value: 'preserve' });
  const preExisting = await db.collection('user').findOne({ email: 'owner@example.test' });
  const candidate = browser(); await pending(candidate, 50);
  code = await sendCode(candidate, 'signup', 'owner@example.test');
  assert.equal((await candidate.json('watcha/complete', { email: 'owner@example.test', code })).data.code, 'WATCHA_EXISTING_ACCOUNT');
  assert.ok((await candidate.json('watcha/status')).data.pending);
  assert.equal(await db.collection('account').countDocuments({ providerId: 'watcha', accountId: '50' }), 0);
  await signIn(candidate, 'owner@example.test');
  assert.equal((await candidate.json('watcha/link', {})).status, 200);
  assert.equal((await candidate.json('get-session')).data.user.id, oldUser.id);
  const postExisting = await db.collection('user').findOne({ email: 'owner@example.test' });
  delete postExisting.watchaWriteVersion;
  assert.deepEqual(postExisting, preExisting);
  assert.equal((await db.collection('fixtureJobs').findOne({ userId: oldUser.id })).value, 'preserve');
  code = await sendCode(candidate, 'unlink');
  assert.equal((await candidate.json('watcha/unlink', { code })).status, 200);
  assert.equal((await candidate.json('watcha/status')).data.linked, false);
  assert.equal(await runtime.verifyPassword({ password: 'fixture-password-long', headers: { cookie: candidate.cookie() } }), true);
  assert.equal(await runtime.verifyPassword({ password: 'wrong', headers: { cookie: candidate.cookie() } }), false);
  console.log('PASS existing email never autolinks; explicit linking preserves original user/data; password unlink and deletion reauthentication regression');

  const pin = browser(); await signIn(pin, 'owner@example.test'); const pinState = await start(pin, 'link');
  const other = browser(); await existingUser(other, 'other@example.test');
  for (const [k, v] of other.cookies) if (k.includes('session')) pin.cookies.set(k, v);
  assert.match((await callback(pin, pinState, 51)).headers.get('location'), /watcha=error$/);
  const loginSwitch = browser(); const loginState = await start(loginSwitch);
  for (const [k, v] of other.cookies) loginSwitch.cookies.set(k, v);
  assert.match((await callback(loginSwitch, loginState, 52)).headers.get('location'), /watcha=error$/);
  const denied = browser(); const deniedState = await start(denied);
  const rejected = await denied.request(`oauth2/callback/watcha?state=${deniedState}&error=secret-upstream-reason`);
  assert.match(rejected.headers.get('location'), /watcha=error$/); assert.equal(rejected.headers.get('location').includes('secret'), false);
  assert.equal(await db.collection('watchaTransactions').countDocuments({ _id: digest(deniedState) }), 0);
  assert.match((await callback(denied, await start(denied), 'provider-error')).headers.get('location'), /watcha=error$/);
  console.log('PASS account switching, pinned linking, denial state consumption and safe provider errors');

  const expiry = browser(); const expiredState = await start(expiry); clock = new Date(clock.getTime() + 11 * 60_000);
  assert.match((await callback(expiry, expiredState)).headers.get('location'), /watcha=error$/);
  await pending(expiry, 60); code = await sendCode(expiry, 'signup', 'expiry@example.test'); clock = new Date(clock.getTime() + 6 * 60_000);
  assert.equal((await expiry.json('watcha/complete', { email: 'expiry@example.test', code })).data.code, 'WATCHA_INVALID_CODE');
  clock = new Date();
  console.log('PASS explicit expiry checks do not depend on TTL background cleanup');

  for (const mode of ['identity', 'email']) {
    const p = browser(), q = browser(); await pending(p, mode === 'identity' ? 70 : 71); await pending(q, mode === 'identity' ? 70 : 72);
    const email1 = `${mode}-a@example.test`, email2 = mode === 'email' ? email1 : `${mode}-b@example.test`;
    const pcode = await sendCode(p, 'signup', email1), qcode = await sendCode(q, 'signup', email2);
    const results = await Promise.all([p.json('watcha/complete', { email: email1, code: pcode }), q.json('watcha/complete', { email: email2, code: qcode })]);
    assert.equal(results.filter((r) => r.status === 200).length, 1, JSON.stringify(results));
    assert.equal(await db.collection('user').countDocuments({ email: { $in: [email1, email2] } }), 1, 'losing transaction must leave no orphan user');
  }
  const rollback = browser(); await pending(rollback, 80); code = await sendCode(rollback, 'signup', 'rollback@example.test');
  await db.command({ collMod: 'account', validator: { accountId: { $ne: '80' } }, validationLevel: 'strict' });
  assert.notEqual((await rollback.json('watcha/complete', { email: 'rollback@example.test', code })).status, 200);
  assert.equal(await db.collection('user').countDocuments({ email: 'rollback@example.test' }), 0);
  assert.ok((await rollback.json('watcha/status')).data.pending);
  await db.command({ collMod: 'account', validator: {} });
  assert.equal((await rollback.json('watcha/complete', { email: 'rollback@example.test', code })).status, 200);
  console.log('PASS real Mongo unique identity/email concurrent collision and forced account-write rollback');

  const freezing = browser(); const freezingUser = await existingUser(freezing, 'freezing@example.test');
  assert.match((await callback(freezing, await start(freezing, 'link'), 81)).headers.get('location'), /watcha=pending$/);
  const freezeBarrier = barrierWhen(({ collection, method, args }) => collection === 'user' && method === 'updateOne' && args[0].emailVerified === true);
  const staleLink = freezing.json('watcha/link', {});
  await freezeBarrier.entered;
  // The link transaction has read no deletion operation in its snapshot but
  // has not yet written the user. Freeze completes while business cleanup is
  // deliberately not advanced. The stale writer must conflict, retry and deny.
  try { await runtime.deletionStore.begin(freezingUser.id); } finally { freezeBarrier.resume(); }
  const staleResult = await staleLink;
  assert.equal(staleResult.status, 403, JSON.stringify(staleResult.data));
  assert.equal(staleResult.data.code, 'WATCHA_ACCOUNT_UNAVAILABLE');
  assert.equal(await db.collection('account').countDocuments({ providerId: 'watcha', accountId: '81' }), 0);
  assert.equal((await runtime.deletionStore.get(freezingUser.id)).phase, 'business');
  console.log('PASS deterministic link snapshot versus deletion freeze interleave retries and leaves no binding');

  const sessionOwner = browser(); await pending(sessionOwner, 82);
  const sessionCode = await sendCode(sessionOwner, 'signup', 'session-freeze@example.test');
  assert.equal((await sessionOwner.json('watcha/complete', { email: 'session-freeze@example.test', code: sessionCode })).status, 200);
  const sessionUserId = (await sessionOwner.json('get-session')).data.user.id;
  const sessionCount = await db.collection('session').countDocuments({ userId: new ObjectId(sessionUserId) });
  const sessionLogin = browser(); const sessionState = await start(sessionLogin);
  const sessionBarrier = barrierWhen(({ collection, method, args }) => collection === 'session' && method === 'insertOne' && String(args[0].userId) === sessionUserId);
  const lateSession = callback(sessionLogin, sessionState, 82);
  await sessionBarrier.entered;
  try { await runtime.deletionStore.begin(sessionUserId); } finally { sessionBarrier.resume(); }
  const lateResult = await lateSession;
  assert.match(lateResult.headers.get('location'), /watcha=error$/);
  assert.equal(lateResult.headers.getSetCookie().some((cookie) => /paperbanana\.session_token=.+;/.test(cookie)), false);
  assert.equal(await db.collection('session').countDocuments({ userId: new ObjectId(sessionUserId) }), sessionCount);
  console.log('PASS deterministic session insertion versus deletion freeze compensates the late session and emits no login cookie');


  const life = browser(); await signIn(life, 'owner@example.test'); const lifeState = await start(life, 'link');
  await db.collection('accountDeletionOperationHistory').insertOne({ _id: 'fixture-restoration', userId: oldUser.id, closedAt: new Date() });
  assert.match((await callback(life, lifeState, 90)).headers.get('location'), /watcha=error$/);
  const blocked = browser(); await signIn(blocked, 'owner@example.test'); const blockedState = await start(blocked, 'link');
  await db.collection('accountDeletionOperations').insertOne({ _id: oldUser.id, status: 'pending' });
  assert.match((await callback(blocked, blockedState, 91)).headers.get('location'), /watcha=error$/);
  assert.equal((await blocked.json('watcha/link', {})).data.code, 'WATCHA_ACCOUNT_UNAVAILABLE');
  await runtime.deleteUser(oldUser.id);
  assert.equal(await db.collection('account').countDocuments({ userId: new ObjectId(oldUser.id) }), 0);
  assert.equal(await db.collection('session').countDocuments({ userId: new ObjectId(oldUser.id) }), 0);
  for (const collection of ['watchaTransactions', 'watchaEmailCodes', 'watchaDeletionConfirmations']) assert.equal(await db.collection(collection).countDocuments({ userId: oldUser.id }), 0);
  assert.equal((await owner.json('get-session')).data, null);
  console.log('PASS deletion/restoration invalidates pending work; deletion removes credentials, sessions and temporary confirmations');

  const docs = await db.collection('account').find({ providerId: 'watcha' }).toArray();
  for (const doc of docs) for (const field of ['accessToken', 'refreshToken', 'idToken']) assert.equal(field in doc, false);
  assert.equal(fixture.calls.every((call) => call.url.startsWith('https://watcha.cn/oauth/api/')), true);
  console.log('PASS no long-term upstream tokens and all OAuth network calls intercepted');
} finally { await fixture.close(); }

const rate = await createWatchaFixture({ uri: process.env.WATCHA_TEST_MONGO_URI, mailMax: 1 });
try {
  const send = async (path, body, cookie = '') => fetch(`${rate.origin}/api/auth/${path}`, { method: 'POST', headers: { origin: rate.origin, 'content-type': 'application/json', cookie, 'x-forwarded-for': '127.0.0.1' }, body: JSON.stringify(body), redirect: 'manual' });
  const started = await send('watcha/start', { intent: 'login', returnOrigin: rate.origin }); const cookie = started.headers.getSetCookie()[0].split(';')[0];
  const state = new URL((await started.json()).url).searchParams.get('state');
  await fetch(`${rate.origin}/api/auth/oauth2/callback/watcha?state=${state}&code=100`, { headers: { cookie }, redirect: 'manual' });
  assert.equal((await send('watcha/email-code', { purpose: 'signup', email: 'limit@example.test' }, cookie)).status, 200);
  assert.equal((await send('watcha/email-code', { purpose: 'signup', email: 'limit@example.test' }, cookie)).status, 429);
  assert.equal((await send('watcha/email-code', { purpose: 'signup', email: 'different@example.test' }, cookie)).status, 429, 'IP quota cannot be bypassed by switching emails');
  assert.equal(rate.mail.length, 1);
  console.log('PASS email and IP mail throttles prevent delivery');
} finally { await rate.close(); }
