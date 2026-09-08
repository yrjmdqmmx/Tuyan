// Run only against a disposable local replica set. This script refuses remote
// hosts and uses a fresh DB; no email transport or model provider is configured.
import assert from 'node:assert/strict';
import { MongoClient } from 'mongodb';
import { randomUUID, createHash } from 'node:crypto';
import { inspectAccountRestoration, restoreAccountIdentity } from '../../src/account-restoration.js';
import fs from 'node:fs';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';
import { createAuthRuntime } from '../../src/auth.js';
import { createAccountVerification } from '../../src/account-verification.js';
import { createAccountDeletionService } from '../../src/account-deletion.js';

const uri = process.env.ACCOUNT_LIFECYCLE_TEST_MONGO_URI || '';
if (!/^mongodb:\/\/127\.0\.0\.1:\d+\//.test(uri)) throw new Error('A disposable loopback-only Mongo URI is required');
const client = new MongoClient(uri);
await client.connect();
const dbName = `account_lifecycle_test_${randomUUID().replaceAll('-', '')}`;
const db = client.db(dbName);
let runtime;
try {
  runtime = await createAuthRuntime({
    mongoUri: uri, mongoDbName: dbName, authSecret: 'local-lifecycle-fixture-secret-long-enough',
    authBaseUrl: 'http://127.0.0.1:3002', frontendOrigins: ['http://127.0.0.1:3002'], production: false,
    authEmail: { deliveryEnabled: false, requireVerification: true },
  });
  const authRequest = (path, body) => runtime.webHandler(new Request(`http://127.0.0.1:3002/api/auth/${path}`, {
    method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:3002' }, body: JSON.stringify(body),
  }));
  const signup = () => authRequest('sign-up/email', { email: 'lifecycle@example.test', password: 'local-fixture-password', name: 'fixture' });
  const signupResponses = await Promise.all([signup(), signup()]);
  assert.deepEqual(signupResponses.map((response) => response.status), [200, 200]);
  const signupResults = await Promise.all(signupResponses.map((response) => response.json()));
  assert.equal(await db.collection('user').countDocuments({}), 1, 'concurrent signup must have one identity');
  assert.equal(await db.collection('account').countDocuments({}), 1, 'concurrent signup must have one credential');
  const user = await db.collection('user').findOne({});
  const userId = String(user._id);
  const verifier = createAccountVerification({ db, mongoClient: client, callbackUrl: 'https://paperbanana.asia/account/email-verified.html' });
  const initialToken = await verifier.issue({ id: userId });
  for (const method of ['GET', 'HEAD']) {
    const preview = await runtime.webHandler(new Request(`http://127.0.0.1:3002/api/auth/verify-email?token=${initialToken}`, { method }));
    assert.equal(preview.status, 302);
    assert.match(new URL(preview.headers.get('location')).pathname, /email-verify.html$/);
  }
  assert.equal((await db.collection('user').findOne({})).emailVerified, false, 'prefetch cannot verify');
  for (const path of ['verify-email/', 'verify-email//']) {
    const response = await runtime.webHandler(new Request(`http://127.0.0.1:3002/api/auth/${path}?token=${initialToken}`));
    assert.equal(response.status, 404, 'library verification route aliases must remain disabled');
  }
  assert.equal(await db.collection('accountVerificationTokens').countDocuments({ consumedAt: { $exists: true } }), 0);
  const beforeConfirmation = await authRequest('sign-in/email', { email: user.email, password: 'local-fixture-password' });
  assert.equal(beforeConfirmation.status, 403);
  assert.equal((await beforeConfirmation.json()).code, 'EMAIL_NOT_VERIFIED');
  const repeated = await Promise.all([authRequest('verify-email', { token: initialToken }), authRequest('verify-email', { token: initialToken })]);
  assert.deepEqual((await Promise.all(repeated.map((r) => r.json()))).map((r) => r.code).sort(), ['TOKEN_USED', 'EMAIL_VERIFIED'].sort());
  assert.equal(await db.collection('session').countDocuments({}), 0, 'verification never creates login sessions');
  const observerResults = await Promise.all(signupResults.map(async (r) => {
    assert.match(r.verificationStatusToken, /^[A-Za-z0-9_-]{43}$/);
    return (await authRequest('verification-status', { token: r.verificationStatusToken })).json();
  }));
  assert.deepEqual(observerResults.map((r) => r.status).sort(), ['pending', 'verified']);
  const duplicateSignup = await (await signup()).json();
  assert.deepEqual(await (await authRequest('verification-status', { token: duplicateSignup.verificationStatusToken })).json(), { status: 'pending' });
  console.log('PASS concurrent verification gives success/used, registration observer detects completion, duplicate signup cannot observe existing account');
  const signedIn = await authRequest('sign-in/email', { email: user.email, password: 'local-fixture-password' });
  assert.equal(signedIn.status, 200);
  const oldCookie = signedIn.headers.getSetCookie().map((cookie) => cookie.split(';')[0]).join('; ');
  assert.ok(await db.collection('session').countDocuments({}));
  console.log('PASS real Better Auth concurrent signup, unique email index and credential/session hooks');

  const oldToken = await verifier.issue({ id: userId });
  await db.collection('verification').insertOne({ identifier: 'reset-password:fixture', value: userId, expiresAt: new Date(Date.now() + 3600000) });
  const business = db.collection('paperbanana_jobs');
  await business.insertOne({ _id: 'old-job', userId, userEmail: user.email, status: 'succeeded', resultImages: [{ objectKey: 'old-job/result.png' }] });
  await business.insertOne({ _id: 'new-job', userId: 'another-id', userEmail: user.email, status: 'succeeded', resultImages: [{ objectKey: 'new-job/result.png' }] });
  const source = fs.readFileSync(new URL('../../../laf-functions/paperbanana-api.ts', import.meta.url), 'utf8');
  const names = ['accountIdQuery', 'accountDeletionStatus', 'deleteAccount', 'listAccountObjectKeys', 'completeAccountDeletion', 'storedObjectKeysForJob'];
  const extracts = names.map((name) => {
    const start = source.search(new RegExp(`^(?:export )?(?:async )?function ${name}\\(`, 'm'));
    const remaining = source.slice(start);
    const end = remaining.slice(1).search(/\n(?:export )?(?:async )?function |\n(?:export )?(?:const|let|type) /);
    return remaining.slice(0, end < 0 ? undefined : end + 1).replace(/^export /, '');
  });
  const files = new Set(['old-job/result.png', 'new-job/result.png']);
  let failStorage = true;
  const context = vm.createContext({
    Date, console, accountDeletions: db.collection('paperbanana_account_deletions'), jobs: business,
    feedback: db.collection('feedback'), referenceUploadState: db.collection('paperbanana_reference_upload_state'),
    jobAdmission: { freezeOwners() {} }, bucketName: 'local-fake', randomId: randomUUID,
    referenceUploadStateRetentionMs: 86400000, deleteAdditionalAccountData: async () => {},
    ok: (data) => ({ code: 0, ...data }), fail: (error, code) => ({ code, error }),
    cloud: { storage: { bucket: () => ({
      listFiles: async ({ Prefix }) => ({ Contents: [...files].filter((key) => key.startsWith(Prefix)).map((Key) => ({ Key })), IsTruncated: false }),
      deleteFile: async (key) => { if (failStorage) throw new Error('local simulated OSS outage'); files.delete(key); },
    }) } },
  });
  vm.runInContext(stripTypeScriptTypes(extracts.join('\n')), context);
  const uidFingerprint = createHash('sha256').update(userId).digest('hex').slice(0, 12);
  const restoredBusinessDb = client.db(`${dbName}_biz`);
  // Exercise a genuine cross-database transaction, with immutable old data.
  await restoredBusinessDb.collection('paperbanana_jobs').insertOne({ _id: 'retained-job', userId, status: 'succeeded' });
  const legacy = { _id: `user:${userId}`, userId, status: 'deleting', createdAt: new Date('2026-08-23'), jobIds: ['retained-job'], ownerPrefixes: [userId, 'reusable-email'] };
  await restoredBusinessDb.collection('paperbanana_account_deletions').insertOne(legacy);
  const reviewOptions = { client, authDb: db, businessDb: restoredBusinessDb, userFingerprint: uidFingerprint };
  await db.collection('accountDeletionOperations').insertOne({ _id: userId, userId, operationId: 'held-legacy-operation', status: 'review_required', phase: 'business', contractVersion: 3 });
  const review = await inspectAccountRestoration(reviewOptions);
  const authBefore = { user: await db.collection('user').findOne({}), account: await db.collection('account').find({}).toArray(), sessions: await db.collection('session').find({}).toArray() };
  await assert.rejects(restoreAccountIdentity({ ...reviewOptions, expectedReviewSha256: '0'.repeat(64) }), /REVIEW_CHANGED/);
  const restored = await restoreAccountIdentity({ ...reviewOptions, expectedReviewSha256: review.summary.reviewSha256 });
  assert.equal(restored.state, 'active');
  assert.equal(restored.alreadyRestored, false);
  assert.equal(await db.collection('accountDeletionOperations').countDocuments({}), 0);
  assert.equal(await db.collection('accountDeletionOperationHistory').countDocuments({}), 1);
  assert.equal((await restoreAccountIdentity({ ...reviewOptions, expectedReviewSha256: review.summary.reviewSha256 })).alreadyRestored, true);
  assert.deepEqual(await db.collection('user').findOne({}), authBefore.user);
  assert.deepEqual(await db.collection('account').find({}).toArray(), authBefore.account);
  assert.deepEqual(await db.collection('session').find({}).toArray(), authBefore.sessions);
  assert.equal(await restoredBusinessDb.collection('paperbanana_jobs').countDocuments({}), 1);
  const archive = await restoredBusinessDb.collection('paperbanana_account_deletion_history').findOne({});
  assert.deepEqual(archive.original, legacy);
  assert.equal(archive.cleanupAllowed, false);
  // Move the resulting active head into the actual Core fixture, then verify a
  // later explicit deletion uses its new generation through the real Gateway.
  await db.collection('paperbanana_account_deletions').insertOne(await restoredBusinessDb.collection('paperbanana_account_deletions').findOne({}));
  await restoredBusinessDb.dropDatabase();
  console.log('PASS real cross-database restoration preserves original identity, credentials, sessions and history; digest and idempotence guards');
  let failAck = true;
  const backend = { async call(body) {
    if (body.action === 'accountDeletionCapability') return { status: 200, data: { code: 0, deletionContractVersion: 3 } };
    if (body.action === 'completeAccountDeletion' && failAck) throw new Error('local lost acknowledgement');
    return { status: 200, data: await context[body.action](body) };
  } };
  const service = () => createAccountDeletionService({ auth: runtime, backend, store: runtime.deletionStore });
  assert.equal((await service().request(userId)).status, 202);
  assert.ok(await db.collection('user').findOne({ _id: user._id }));
  assert.equal(await business.countDocuments({}), 2);
  failStorage = false;
  await db.collection('accountDeletionOperations').updateOne({ _id: userId }, { $set: { nextAttemptAt: new Date(0) } });
  await service().tick();
  assert.equal(await db.collection('user').countDocuments({}), 0);
  assert.equal(await db.collection('session').countDocuments({}), 0);
  assert.equal(await db.collection('account').countDocuments({}), 0);
  assert.equal(await db.collection('verification').countDocuments({}), 0);
  assert.equal(await db.collection('accountVerificationTokens').countDocuments({}), 0);
  assert.equal((await runtime.deletionStore.get(userId)).phase, 'ack');
  assert.equal(await business.countDocuments({}), 1);
  assert.deepEqual([...files], ['new-job/result.png']);
  failAck = false;
  await db.collection('accountDeletionOperations').updateOne({ _id: userId }, { $set: { nextAttemptAt: new Date(0) } });
  await service().tick();
  assert.equal((await runtime.deletionStore.get(userId)).status, 'completed');
  assert.equal((await db.collection('paperbanana_account_deletions').findOne({ _id: `user:${userId}` })).status, 'deleted');
  const oldSession = await runtime.webHandler(new Request('http://127.0.0.1:3002/api/auth/get-session', { headers: { cookie: oldCookie } }));
  assert.equal(await oldSession.json(), null);
  const oldReset = await authRequest('reset-password', { token: 'fixture', newPassword: 'other-local-fixture-password' });
  assert.equal(oldReset.status, 400);
  assert.equal(await db.collection('account').countDocuments({}), 0);
  console.log('PASS real Mongo Core/Gateway lifecycle, storage failure, Auth transaction, old session/reset and lost-ack restart');

  assert.equal((await signup()).status, 200);
  const newUser = await db.collection('user').findOne({});
  assert.notEqual(String(newUser._id), userId);
  assert.equal((await context.accountDeletionStatus({ userId: String(newUser._id) })).state, 'active');
  const oldVerification = await authRequest('verify-email', { token: oldToken });
  assert.equal((await oldVerification.json()).code, 'INVALID_TOKEN');
  assert.equal((await db.collection('user').findOne({ _id: newUser._id })).emailVerified, false);
  const newToken = await verifier.issue({ id: String(newUser._id) });
  const verified = await authRequest('verify-email', { token: newToken });
  assert.equal((await verified.json()).code, 'EMAIL_VERIFIED');
  assert.equal((await db.collection('user').findOne({ _id: newUser._id })).emailVerified, true);
  console.log('PASS same-email reregistration gets new ID; old verification token rejected, new token works');
} finally {
  await runtime?.close();
  await client.db(`${dbName}_biz`).dropDatabase();
  await db.dropDatabase();
  await client.close();
}
