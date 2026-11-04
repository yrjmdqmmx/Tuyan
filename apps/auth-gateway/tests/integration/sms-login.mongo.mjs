import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createWatchaFixture } from './watcha-fixture.mjs';
import { loadSmsConfig } from '../../src/sms.js';

const uri = process.env.PHONE_TEST_MONGO_URI;

async function setup(t, enabled = true, transportEnabled = true) {
  // Future fixed UTC window: advancing the app clock cannot race Mongo's real TTL sweeper.
  let clock = new Date(Math.ceil(Date.now() / 86400000) * 86400000 + 3600000), answer;
  const startedAt = new Date(clock);
  const messages = [];
  const fixture = await createWatchaFixture({ uri, now: () => clock,
    sms: loadSmsConfig({ SMS_LOGIN_ENABLED: String(enabled) }),
    ...(transportEnabled ? { smsTransport: { async send(message) { messages.push(message); return { accepted: true }; } } } : {}),
    phoneCaptchaRenderer: async value => { answer = value; return 'data:image/png;base64,fixture'; },
  });
  t.after(() => fixture.close());
  function browser() {
    const cookies = new Map();
    return { async request(path, body) {
      const response = await fetch(`${fixture.origin}/api/auth/${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { origin: fixture.origin, 'content-type': 'application/json', cookie: [...cookies].map(([k,v]) => `${k}=${v}`).join('; ') },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      for (const cookie of response.headers.getSetCookie()) {
        const [name, ...parts] = cookie.split(';')[0].split('=');
        cookies.set(name, parts.join('='));
      }
      return { status: response.status, data: await response.json(), headers: response.headers };
    } };
  }
  async function send(b, phone = '13800001234') {
    const challenge = await b.request('phone/challenge', { phone, purpose: 'login' });
    assert.equal(challenge.status, 200);
    return b.request('phone/send-code', { phone, purpose: 'login', challengeId: challenge.data.challengeId, captcha: answer });
  }
  async function issue(b, phone = '13800001234') {
    const response = await send(b, phone);
    assert.equal(response.status, 200);
    return { phone, purpose: 'login', requestId: response.data.requestId, code: messages.at(-1).code };
  }
  return { ...fixture, messages, browser, send, issue, startedAt, advance(ms) { clock = new Date(+clock + ms); } };
}

test('SMS off: status hidden, all mutations 404, no SMS collections or delivery', async t => {
  const f = await setup(t, false), b = f.browser();
  assert.deepEqual((await b.request('phone/status')).data, { available: false });
  for (const path of ['challenge', 'send-code', 'verify']) {
    const r = await b.request(`phone/${path}`, { phone: '13800001234', purpose: 'login' });
    assert.equal(r.status, 404); assert.equal(r.data.code, 'PHONE_DISABLED');
  }
  assert.equal(f.messages.length, 0);
  assert.equal((await f.db.listCollections().toArray()).some(row => row.name.startsWith('phone')), false);
});

test('enabling login alone does not create a real sender', async t => {
  const f = await setup(t, true, false);
  assert.deepEqual((await f.browser().request('phone/status')).data, { available: false });
});

test('six-digit hashed OTP, TTL indexes and atomic phone ownership indexes', async t => {
  const f = await setup(t), b = f.browser(), proof = await f.issue(b);
  assert.match(proof.code, /^\d{6}$/);
  const stored = await f.db.collection('phoneCodes').findOne({ requestId: proof.requestId });
  assert.match(stored.codeHash, /^[a-f0-9]{64}$/);
  assert.equal(stored.expiresAt.getTime(), +f.startedAt + 300000);
  assert.equal(JSON.stringify(stored).includes(proof.phone), false);
  assert.equal(JSON.stringify(stored).includes(proof.code), false);
  for (const name of ['phoneCodes', 'phoneChallenges', 'phoneRateLimits', 'phoneConfirmations']) {
    assert.ok((await f.db.collection(name).indexes()).some(index => index.key.expiresAt === 1 && index.expireAfterSeconds === 0));
  }
  const indexes = await f.db.collection('account').indexes();
  for (const name of ['phone_identity_unique_v1', 'phone_user_unique_v1']) {
    const index = indexes.find(row => row.name === name);
    assert.equal(index.unique, true); assert.deepEqual(index.partialFilterExpression, { providerId: 'phone' });
  }
});

test('fifth wrong code locks proof; correct code afterwards cannot log in', async t => {
  const f = await setup(t), b = f.browser(), proof = await f.issue(b);
  const wrong = proof.code === '000000' ? '111111' : '000000';
  for (let i = 0; i < 4; i++) assert.equal((await b.request('phone/verify', { ...proof, code: wrong })).data.code, 'PHONE_INVALID_CODE');
  const locked = await b.request('phone/verify', { ...proof, code: wrong });
  assert.equal(locked.status, 429); assert.equal(locked.data.code, 'PHONE_TOO_MANY_ATTEMPTS');
  assert.equal((await b.request('phone/verify', proof)).data.code, 'PHONE_TOO_MANY_ATTEMPTS');
  assert.equal(await f.db.collection('user').countDocuments(), 0);
  assert.equal((await f.db.collection('phoneCodes').findOne({requestId:proof.requestId})).attempts, 5);
});

test('correct code is accepted on the fifth attempt, and is single use', async t => {
  const f = await setup(t), b = f.browser(), proof = await f.issue(b);
  const wrong = proof.code === '000000' ? '111111' : '000000';
  for (let i = 0; i < 4; i++) await b.request('phone/verify', { ...proof, code: wrong });
  assert.equal((await b.request('phone/verify', proof)).status, 200);
  const session = (await b.request('get-session')).data;
  assert.equal(session.user.phoneOnly, true);
  assert.ok(session.session.userId === session.user.id);
  await b.request('sign-out', {});
  assert.equal((await b.request('phone/verify', proof)).data.code, 'PHONE_INVALID_CODE');
  assert.equal(await f.db.collection('user').countDocuments(), 1);
});

test('parallel wrong attempts cannot exceed five comparisons or unlock the proof', async t => {
  const f = await setup(t), b = f.browser(), proof = await f.issue(b);
  const wrong = proof.code === '000000' ? '111111' : '000000';
  const results = await Promise.all(Array.from({length:12}, () => b.request('phone/verify', {...proof,code:wrong})));
  assert.equal(results.filter(r => r.data.code === 'PHONE_INVALID_CODE').length, 4);
  assert.equal(results.filter(r => r.data.code === 'PHONE_TOO_MANY_ATTEMPTS').length, 8);
  assert.equal((await f.db.collection('phoneCodes').findOne({requestId:proof.requestId})).attempts, 5);
  assert.equal((await b.request('phone/verify', proof)).data.code, 'PHONE_TOO_MANY_ATTEMPTS');
  assert.equal(await f.db.collection('user').countDocuments(), 0);
});

test('expires at exactly five minutes even before Mongo TTL cleanup', async t => {
  const f = await setup(t), b = f.browser(), proof = await f.issue(b);
  f.advance(300000);
  assert.equal((await b.request('phone/verify', proof)).data.code, 'PHONE_CODE_EXPIRED');
  assert.equal(await f.db.collection('user').countDocuments(), 0);
});

test('cooldown is continuous through 59.999s; resend at 60s invalidates previous proof', async t => {
  const f = await setup(t), b = f.browser(), first = await f.issue(b);
  f.advance(59999);
  const denied = await f.send(b);
  assert.equal(denied.status, 429); assert.equal(denied.headers.get('retry-after'), '1');
  assert.equal(f.messages.length, 1);
  f.advance(1);
  const second = await f.issue(b);
  assert.equal((await b.request('phone/verify', first)).data.code, 'PHONE_INVALID_CODE');
  assert.equal((await b.request('phone/verify', second)).status, 200);
});

test('phone daily cap survives different browsers and hourly windows', async t => {
  const f = await setup(t);
  for (let i = 0; i < 10; i++) {
    await f.issue(f.browser());
    f.advance(3600000);
  }
  const denied = await f.send(f.browser());
  assert.equal(denied.status, 429); assert.equal(denied.data.code, 'PHONE_RATE_LIMIT');
  assert.equal(f.messages.length, 10);
});

test('IP cap applies across phone numbers and browsers', async t => {
  const f = await setup(t);
  for (let i = 0; i < 20; i++) await f.issue(f.browser(), `1380000${String(i).padStart(4, '0')}`);
  const denied = await f.send(f.browser(), '13900009999');
  assert.equal(denied.status, 429); assert.equal(f.messages.length, 20);
});

test('separate browsers racing to register one phone produce one user and original sessions', async t => {
  const f = await setup(t), a = f.browser(), b = f.browser();
  const first = await f.issue(a); f.advance(60000); const second = await f.issue(b);
  const responses = await Promise.all([a.request('phone/verify', first), b.request('phone/verify', second)]);
  assert.equal(responses.filter(r => r.status === 200).length >= 1, true);
  assert.equal(await f.db.collection('user').countDocuments(), 1);
  assert.equal(await f.db.collection('account').countDocuments({providerId:'phone'}), 1);
  // A duplicate-key loser can log in with a new proof; no orphan user survives rollback.
  const returning = f.browser(); f.advance(60000);
  assert.equal((await returning.request('phone/verify', await f.issue(returning))).status, 200);
  const owner = await f.db.collection('account').findOne({providerId:'phone'});
  assert.equal((await returning.request('get-session')).data.user.id, String(owner.userId));
});
