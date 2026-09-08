import assert from 'node:assert/strict';
import test from 'node:test';
import { createAccountVerification } from '../src/account-verification.js';
import { memoryDb } from '../../../test-support/memory-db.mjs';

function fixture() {
  let time = new Date('2026-09-08T00:00:00Z');
  const db = memoryDb({ user: [{ _id: 'original', email: 'fixture@163.test', emailVerified: false }] });
  const verification = createAccountVerification({ db, callbackUrl: 'https://web.example.test/account/email-verified.html', now: () => time, mongoClient: {
    startSession: () => ({ withTransaction: async (work) => work(), endSession: async () => {} }),
  } });
  return { db, verification, advance: (ms) => { time = new Date(+time + ms); } };
}
const request = (token) => new Request(`https://api.example.test/api/auth/verify-email?token=${token}&callbackURL=https://evil.test`);
const result = (response) => new URL(response.headers.get('location')).searchParams.get('error');
const statusRequest = (token) => new Request('https://api.example.test/api/auth/verification-status', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }),
});

test('opening a verified link again reports completion without repeating the account update', async () => {
  const f = fixture();
  const token = await f.verification.issue({ id: 'original' });
  assert.equal(result(await f.verification.handler(request(token))), null);
  const original = structuredClone(f.db.collection('user').rows[0]);
  f.advance(1000);
  const repeated = await f.verification.handler(request(token));
  assert.equal(result(repeated), 'TOKEN_USED');
  assert.equal(new URL(repeated.headers.get('location')).origin, 'https://web.example.test');
  assert.equal(repeated.headers.get('cache-control'), 'no-store');
  assert.equal(repeated.headers.get('set-cookie'), null);
  assert.deepEqual(f.db.collection('user').rows[0], original);
  assert.equal(JSON.stringify(f.db.collection('accountVerificationTokens').rows).includes(token), false);
});

test('expiry, malformed links and database failure have distinct outcomes', async () => {
  const f = fixture();
  const token = await f.verification.issue({ id: 'original' });
  f.advance(3600001);
  assert.equal(result(await f.verification.handler(request(token))), 'TOKEN_EXPIRED');
  assert.equal(result(await f.verification.handler(request('missing'))), 'INVALID_TOKEN');
  f.db.collection('accountVerificationTokens').findOne = async () => { throw new Error('database unavailable'); };
  assert.equal(result(await f.verification.handler(request(token))), 'VERIFICATION_UNAVAILABLE');
  assert.equal(f.db.collection('user').rows[0].emailVerified, false);
});

test('the registration observer detects completion but cannot verify or log in', async () => {
  const f = fixture();
  const observer = await f.verification.issueStatus({ id: 'original', email: 'fixture@163.test' });
  const status = async (token) => (await f.verification.handler(statusRequest(token))).json();
  assert.deepEqual(await status(observer), { status: 'pending' });
  assert.equal(result(await f.verification.handler(request(observer))), 'INVALID_TOKEN');
  assert.equal(f.db.collection('user').rows[0].emailVerified, false);
  const token = await f.verification.issue({ id: 'original' });
  assert.deepEqual(await status(token), { status: 'pending' });
  await f.verification.handler(request(token));
  const response = await f.verification.handler(statusRequest(observer));
  assert.deepEqual(await response.json(), { status: 'verified' });
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('set-cookie'), null);
  f.advance(3600001);
  assert.deepEqual(await status(observer), { status: 'pending' });
});

test('unknown, synthetic and mismatched identities cannot observe an existing email', async () => {
  const f = fixture();
  const status = async (token) => (await f.verification.handler(statusRequest(token))).json();
  const unknown = await f.verification.issueStatus({ id: 'synthetic-id', email: 'fixture@163.test' });
  const mismatched = await f.verification.issueStatus({ id: 'original', email: 'someone-else@example.test' });
  f.db.collection('user').rows[0].emailVerified = true;
  for (const token of [unknown, mismatched, 'invalid', '']) assert.deepEqual(await status(token), { status: 'pending' });
  assert.equal(f.db.collection('accountVerificationTokens').rows.length, 0);
});

test('used links and observers remain bound to the original identity and email', async () => {
  for (const change of ['deleting', 'email-change', 'replacement', 'unverified']) {
    const f = fixture();
    const token = await f.verification.issue({ id: 'original' });
    const observer = await f.verification.issueStatus({ id: 'original', email: 'fixture@163.test' });
    await f.verification.handler(request(token));
    if (change === 'deleting') await f.db.collection('accountDeletionOperations').insertOne({ _id: 'original' });
    if (change === 'email-change') f.db.collection('user').rows[0].email = 'changed@example.test';
    if (change === 'replacement') f.db.collection('user').rows[0]._id = 'new-identity';
    if (change === 'unverified') f.db.collection('user').rows[0].emailVerified = false;
    assert.equal(result(await f.verification.handler(request(token))), 'INVALID_TOKEN', change);
    assert.deepEqual(await (await f.verification.handler(statusRequest(observer))).json(), { status: 'pending' }, change);
  }
});
