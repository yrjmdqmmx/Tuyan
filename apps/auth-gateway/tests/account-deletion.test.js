import assert from 'node:assert/strict';
import test from 'node:test';
import { createAccountDeletionService, createDeletionStore } from '../src/account-deletion.js';
import { ensureAccountIndexes, normalizeAccountInput } from '../src/account-indexes.js';
import { createAuthRuntime } from '../src/auth.js';
import { memoryDb } from '../../../test-support/memory-db.mjs';

function fixture() {
  const db = memoryDb();
  const collection = db.collection('operations');
  let timestamp = Date.now();
  const now = () => new Date(timestamp);
  const store = createDeletionStore(collection, now);
  const calls = [];
  let failBusiness = false, failAuth = false, failAck = false, legacy = false, maintenance = false;
  const backend = { async call(body) {
    calls.push(body.action);
    if (body.action === 'accountDeletionCapability') return { status: 200, data: { code: 0, deletionContractVersion: legacy ? 2 : 3 } };
    if (body.action === 'deleteAccount' && failBusiness) return { status: 200, data: { code: 503, error: 'simulated OSS failure' } };
    if (body.action === 'completeAccountDeletion' && failAck) throw new Error('connection lost');
    return { status: 200, data: { code: 0, ok: true, deletionContractVersion: 3, operationId: body.operationId, phase: body.action === 'completeAccountDeletion' ? 'completed' : 'awaiting_auth' } };
  } };
  const auth = { async deleteUser(userId, op) {
    calls.push('auth');
    if (failAuth) throw new Error('transaction aborted');
    await collection.updateOne({ _id: userId, operationId: op.operationId, leaseToken: op.leaseToken }, { $set: { phase: 'ack', authDeletedAt: now() } });
  } };
  const service = () => createAccountDeletionService({ auth, backend, store, now, isMaintenance: () => maintenance });
  return { collection, store, calls, service, backend, advance: () => { timestamp += 31000 }, setFailure: (where, value) => {
    if (where === 'business') failBusiness = value;
    if (where === 'auth') failAuth = value;
    if (where === 'ack') failAck = value;
    if (where === 'legacy') legacy = value;
    if (where === 'maintenance') maintenance = value;
  } };
}

test('durable authorization precedes Core; restart resumes business, Auth and acknowledgement failures', async () => {
  for (const phase of ['business', 'auth', 'ack']) {
    const f = fixture();
    f.setFailure(phase, true);
    const result = await f.service().request('old-id');
    assert.equal(result.status, 202, phase);
    const stored = await f.store.get('old-id');
    assert.equal(stored.status, 'pending');
    assert.ok(stored.operationId);
    assert.equal(JSON.stringify(stored).includes('password'), false);
    if (phase === 'ack') assert.equal(stored.phase, 'ack');
    f.setFailure(phase, false); f.advance();
    await f.service().tick(); // new service, same durable DB
    assert.equal((await f.store.get('old-id')).status, 'completed');
    assert.equal(f.calls.filter((v) => v === 'auth').length, phase === 'auth' ? 2 : 1);
  }
});

test('old Core cannot start a deletion; maintenance pauses recovery and per-user lease excludes another process', async () => {
  const f = fixture(); f.setFailure('legacy', true);
  assert.equal((await f.service().request('old-id')).status, 503);
  assert.equal(f.collection.rows.length, 0);
  f.setFailure('legacy', false);
  await f.store.begin('old-id');
  f.setFailure('maintenance', true);
  await f.service().tick();
  assert.deepEqual(f.calls, ['accountDeletionCapability']);
  f.setFailure('maintenance', false);
  const claim = await f.store.claim('old-id');
  assert.ok(claim);
  await f.service().tick();
  assert.deepEqual(f.calls, ['accountDeletionCapability']);
  await f.store.release(claim);
  await f.service().tick();
  assert.equal((await f.store.get('old-id')).phase, 'completed');
});

test('historical review requirement is durable and never automatically deletes Auth', async () => {
  const f = fixture();
  const original = f.backend.call;
  f.backend.call = async (body) => body.action === 'deleteAccount'
    ? { status: 200, data: { code: 409, error: 'ACCOUNT_DELETION_REVIEW_REQUIRED' } } : original(body);
  assert.equal((await f.service().request('old-id')).status, 409);
  f.advance(); await f.service().tick();
  assert.equal((await f.store.get('old-id')).status, 'review_required');
  assert.equal(f.calls.includes('auth'), false);
});

test('email uniqueness preflight rejects ambiguous legacy rows without creating indexes', async () => {
  for (const users of [[{ email: ' A@example.test ' }], [{ email: 'a@example.test' }, { email: 'A@example.test' }]]) {
    const db = memoryDb({ user: users });
    await assert.rejects(ensureAccountIndexes(db), /AUTH_EMAIL_INDEX_REVIEW_REQUIRED/);
    assert.equal(db.collection('user').indexes.length, 0);
  }
  const db = memoryDb({ user: [{ email: 'a@example.test' }] });
  await ensureAccountIndexes(db);
  assert.deepEqual(db.collection('user').indexes[0], { key: { email: 1 }, name: 'auth_email_unique_v1', unique: true, collation: { locale: 'en', strength: 2 } });
  assert.equal(normalizeAccountInput({ email: ' A@Example.test ', name: 'keep' }).email, 'a@example.test');
  assert.equal(normalizeAccountInput({ name: 'keep' }).name, 'keep');
});

test('Auth deletion and receipt are atomic; a failed receipt rolls back all identity data and preserves new-ID data', async () => {
  const userId = 'old-id', operationId = 'operation-id', leaseToken = 'lease-token';
  const db = memoryDb({
    user: [{ _id: userId, email: 'old@example.test' }, { _id: 'new-id', email: 'new@example.test' }],
    session: [{ _id: 's1', userId }, { _id: 's2', userId: 'new-id' }],
    account: [{ _id: 'a1', userId }, { _id: 'a2', userId: 'new-id' }],
    accountDeletionOperations: [{ _id: userId, operationId, leaseToken, contractVersion: 3, status: 'pending', phase: 'auth' }],
  });
  const names = ['user', 'session', 'account', 'accountDeletionOperations'];
  let failReceipt = true;
  const receipt = db.collection('accountDeletionOperations');
  const originalUpdate = receipt.updateOne;
  receipt.updateOne = async (...args) => { if (failReceipt) throw new Error('simulated receipt write failure'); return originalUpdate(...args); };
  class Mongo {
    async connect() {} db() { return db; } async close() {}
    startSession() { return {
      async withTransaction(work) {
        const snapshot = names.map((name) => structuredClone(db.collection(name).rows));
        try { await work(); } catch (error) {
          names.forEach((name, i) => db.collection(name).rows.splice(0, Infinity, ...snapshot[i])); throw error;
        }
      }, async endSession() {},
    }; }
  }
  const runtime = await createAuthRuntime({ mongoUri: 'fake', mongoDbName: 'fake', authSecret: 'fake', frontendOrigins: [] }, {
    MongoClientClass: Mongo, adapterFactory: () => ({}), betterAuthFactory: () => ({ handler: async () => Response.json({}) }),
  });
  await assert.rejects(runtime.deleteUser(userId, { operationId, leaseToken }), /receipt write failure/);
  assert.equal(db.collection('user').rows.length, 2);
  assert.equal(db.collection('account').rows.length, 2);
  assert.equal(db.collection('session').rows.length, 2);
  assert.equal(receipt.rows[0].phase, 'auth');
  failReceipt = false;
  await runtime.deleteUser(userId, { operationId, leaseToken });
  for (const name of ['user', 'session', 'account']) {
    assert.equal(db.collection(name).rows.length, 1, name);
  }
  assert.equal(db.collection('user').rows[0]._id, 'new-id');
  assert.equal(receipt.rows[0].phase, 'ack');
  await assert.rejects(runtime.deleteUser('new-id', { operationId, leaseToken }), /OPERATION_MISMATCH/);
});

test('verification links cannot follow an email to a newly registered ID; repeats only report completion', async () => {
  const { createAccountVerification } = await import('../src/account-verification.js');
  const db = memoryDb({ user: [{ _id: 'old-id', email: 'same@example.test', emailVerified: false }] });
  const verification = createAccountVerification({ db, callbackUrl: 'https://paperbanana.asia/account/email-verified.html', mongoClient: {
    startSession: () => ({ withTransaction: async (work) => work(), endSession: async () => {} }),
  } });
  const oldToken = await verification.issue({ id: 'old-id' });
  await db.collection('user').deleteOne({ _id: 'old-id' });
  await db.collection('user').insertOne({ _id: 'new-id', email: 'same@example.test', emailVerified: false });
  const request = (token) => new Request('https://api.paperbanana.asia/api/auth/verify-email', { method: 'POST', headers: { origin: 'https://paperbanana.asia', 'content-type': 'application/json' }, body: JSON.stringify({ token }) });
  assert.equal((await (await verification.handler(request(oldToken))).json()).code, 'INVALID_TOKEN');
  assert.equal(db.collection('user').rows[0].emailVerified, false);
  const newToken = await verification.issue({ id: 'new-id' });
  assert.equal((await (await verification.handler(request(newToken))).json()).code, 'EMAIL_VERIFIED');
  assert.equal(db.collection('user').rows[0].emailVerified, true);
  assert.equal((await (await verification.handler(request(newToken))).json()).code, 'TOKEN_USED');
  assert.equal((await (await verification.handler(request('old-email-only.jwt.token'))).json()).code, 'INVALID_TOKEN');
});

test('a stale password-reset request cannot recreate credentials or sessions after account deletion', async () => {
  const { createAccountWriteGuard } = await import('../src/account-write-guard.js');
  const db = memoryDb({ user: [{ _id: 'old-id' }, { _id: 'new-id' }] });
  const guards = createAccountWriteGuard(db);
  for (const collection of ['account', 'session']) {
    const row = { id: `late-${collection}`, userId: 'old-id' };
    await guards[collection].create.before(row);
    await db.collection('accountDeletionOperations').updateOne({ _id: 'old-id' }, { $set: { status: 'pending' } }, { upsert: true });
    await db.collection(collection).insertOne({ _id: row.id, userId: row.userId });
    await assert.rejects(guards[collection].create.after(row), /no longer accepting/);
    assert.equal(db.collection(collection).rows.length, 0);
    await assert.rejects(guards[collection].create.before(row), /no longer accepting/);
    assert.ok(await guards[collection].create.before({ userId: 'new-id' }));
    await db.collection('accountDeletionOperations').deleteOne({ _id: 'old-id' });
  }
  await db.collection('user').deleteOne({ _id: 'old-id' });
  await assert.rejects(guards.account.create.before({ userId: 'old-id' }), /no longer accepting/);
});

test('verification is also bound to the email at issuance, even when the user ID remains the same', async () => {
  const { createAccountVerification } = await import('../src/account-verification.js');
  const db = memoryDb({ user: [{ _id: 'same-id', email: 'before@example.test', emailVerified: false }] });
  const verification = createAccountVerification({ db, callbackUrl: 'https://paperbanana.asia/account/email-verified.html', mongoClient: {
    startSession: () => ({ withTransaction: async (work) => work(), endSession: async () => {} }),
  } });
  const token = await verification.issue({ id: 'same-id' });
  await db.collection('user').updateOne({ _id: 'same-id' }, { $set: { email: 'after@example.test' } });
  const response = await verification.handler(new Request('https://api.paperbanana.asia/api/auth/verify-email', { method: 'POST', headers: { origin: 'https://paperbanana.asia', 'content-type': 'application/json' }, body: JSON.stringify({ token }) }));
  assert.equal((await response.json()).code, 'INVALID_TOKEN');
  assert.equal(db.collection('user').rows[0].emailVerified, false);
});
