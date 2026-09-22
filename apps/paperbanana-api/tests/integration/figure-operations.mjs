// Real MongoDB tests, fixed synthetic model output, no external provider calls.
// The runner owns one freshly generated database and may drop only that database.
import assert from 'node:assert/strict';
import { randomBytes, createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { MongoClient } from 'mongodb';
import { createDocument } from '@paperbanana/figure-core';
import { createFigureOperations } from '../../src/figure-operations.ts';
import { createFigureStudioService } from '../../src/figure-studio.ts';
import { createProviderWorkflow } from '../../src/provider-workflow.ts';
import { createTokenDanceService } from '../../src/tokendance-service.ts';
import { normalizeUniversalRoute } from '../../../../packages/api/src/universal-api.ts';

const plan = { title: '合成科研流程', summary: '仅验证持久化行为的固定测试数据。', nodes: [{ id: 'input', label: '输入' }, { id: 'analysis', label: '分析' }], edges: [{ from: 'input', to: 'analysis' }], notes: ['没有调用外部模型。'] };
const document = createDocument({ id: 'mongo-integration-source' });
const documentContext = { id: document.id, revision: document.revision, sha256: createHash('sha256').update(JSON.stringify(document)).digest('hex') };
const native = { accessProvider: 'openai', modelId: 'gpt-5.6-sol' };
const route = normalizeUniversalRoute({ accessProvider: 'custom', modelId: 'synthetic/ExactID', custom: { version: 1, connectionId: 'fixture-connection', protocol: 'openai-chat', baseUrl: 'https://fixture.example.com/v1', auth: 'bearer', capabilities: { text: true, vision: false, imageGeneration: false, imageEditing: false }, inputLimits: { maxCount: 1, maxBytes: 1024, maxTotalBytes: 1024, maxDimension: 100, maxPixels: 10000, requestMaxBytes: 32768, mimeTypes: ['image/png'] }, outputLimits: { maxBytes: 32768, maxDimension: 100, maxPixels: 10000, mimeTypes: ['image/png'] } } });
const credentials = { custom: JSON.stringify({ [route.custom.connectionId]: { baseUrl: route.custom.baseUrl, protocol: route.custom.protocol, auth: route.custom.auth, apiKey: 'synthetic-no-provider-key' } }) };
const modelOutput = JSON.stringify(plan);
let externalProviderCalls = 0;
const noNetwork = async () => { externalProviderCalls++; throw new Error('External provider network is forbidden in Figure Mongo integration'); };
globalThis.fetch = noNetwork;
function localUri(value) {
  assert.equal(typeof value, 'string', 'FIGURE_INTEGRATION_MONGO_URI is required');
  const url = new URL(value);
  assert.equal(url.protocol, 'mongodb:');
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname), 'Only explicit loopback Mongo is allowed');
  assert.ok(!url.username && !url.password && url.pathname === '/', 'Use loopback Mongo without credentials or an existing database name');
  return value;
}
function request(requestId, userId, extra = {}) {
  return { action: 'figureStudioPlan', requestId, userId, documentContext, materials: '输入，然后分析。', mainRoute: native, apiKeys: { openai: 'synthetic-native-key' }, ...extra };
}
const query = (ops, body) => ops.handle({ action: 'figureStudioOperation', userId: body.userId, requestId: body.requestId });
function makeOperations(db, secret, behavior) {
  const service = createTokenDanceService({ db, secret, fetcher: noNetwork });
  const baseWorkflow = createProviderWorkflow({ db, service });
  let ops;
  const studio = createFigureStudioService({ modelTimeoutMs: 10000, modelText: async (body, system, input) => behavior({ body, call: async (output = modelOutput) => ops.hooks.call(['synthetic-text', body.mainRoute, system, input], async () => {
    if (body.mainRoute.accessProvider === 'custom') await ops.hooks.record({ channel: 'custom', model: route.modelId, requestId: 'synthetic-provider-record', status: 'succeeded', billingStatus: 'unconfirmed' });
    return output;
  }) }) });
  ops = createFigureOperations({ db, service, baseWorkflow, studio });
  return ops;
}
function gate() {
  let resolve;
  const promise = new Promise(done => { resolve = done });
  return { promise, resolve };
}
async function until(predicate) {
  const deadline = Date.now() + 5000;
  while (!await predicate()) {
    assert.ok(Date.now() < deadline, 'Timed out waiting for local Mongo test boundary');
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}
async function restartProbe(setup) {
  // A separate Node process has no previous service object, Mongo connection,
  // in-memory result, or in-flight promise to satisfy these reads.
  const child = spawn(process.execPath, ['--import', 'tsx', fileURLToPath(import.meta.url), '--read-persisted'], {
    cwd: fileURLToPath(new URL('../..', import.meta.url)), stdio: ['pipe', 'pipe', 'pipe'],
    env: { PATH: process.env.PATH || '' },
  });
  let stdout = '', stderr = '';
  child.stdout.on('data', bytes => { stdout += bytes; });
  child.stderr.on('data', bytes => { stderr += bytes; });
  const timer = setTimeout(() => child.kill('SIGKILL'), 10000);
  child.stdin.end(JSON.stringify(setup));
  try {
    const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('close', resolve); });
    assert.equal(code, 0, stderr);
    return JSON.parse(stdout.trim());
  } finally { clearTimeout(timer); }
}

if (process.argv[2] === '--read-persisted') {
  let raw = '';
  for await (const chunk of process.stdin) { raw += chunk; assert.ok(raw.length < 16384); }
  const setup = JSON.parse(raw), uri = localUri(setup.uri);
  assert.match(setup.dbName, /^tuyan_figure_integration_\d+_[a-f0-9]{12}$/);
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 3000 });
  try {
    await client.connect();
    const db = client.db(setup.dbName);
    assert.ok(await db.collection('__integration_owner').findOne({ _id: setup.ownerToken }));
    let calls = 0;
    const ops = makeOperations(db, setup.secret, async () => { calls++; throw new Error('Persisted query unexpectedly entered model'); });
    for (const body of setup.requests) {
      const result = await query(ops, body);
      assert.equal(result.operation.status, 'succeeded', JSON.stringify(result));
      assert.deepEqual(result.operation.result, { plan });
    }
    assert.equal(calls, 0); assert.equal(externalProviderCalls, 0);
    console.log(JSON.stringify({ freshProcess: true, persistedResults: setup.requests.length, syntheticCalls: calls, externalProviderCalls }));
  } finally { await client.close(); }
} else {
  const uri = localUri(process.env.FIGURE_INTEGRATION_MONGO_URI);
  const dbName = `tuyan_figure_integration_${Date.now()}_${randomBytes(6).toString('hex')}`;
  const ownerToken = randomBytes(16).toString('hex'), secret = randomBytes(32).toString('base64');
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 3000 });
  const instances = [], gates = [], checks = [];
  let owned = false, cleaned = false, syntheticCalls = 0, report;
  const make = behavior => { const ops = makeOperations(client.db(dbName), secret, behavior); instances.push(ops); return ops; };
  try {
    await client.connect();
    const db = client.db(dbName);
    // createCollection rejects an existing marker, so cleanup cannot claim a
    // pre-existing database or accept an arbitrary database from the caller.
    const names = await client.db('admin').admin().listDatabases({ nameOnly: true, filter: { name: dbName } });
    assert.equal(names.databases.length, 0);
    await db.createCollection('__integration_owner');
    await db.collection('__integration_owner').insertOne({ _id: ownerToken, purpose: 'figure-operations-integration' });
    owned = true;
    const sentinel = { _id: 'unrelated-image-job-sentinel', status: 'succeeded', note: 'created inside this fresh test database only' };
    await db.collection('paperbanana_jobs').insertOne(sentinel);

    // Unique operation PK wins a genuine race across independent service objects.
    const held = gate(); gates.push(held);
    const first = make(async ({ call }) => { await held.promise; syntheticCalls++; return call(); });
    const duplicate = make(async ({ call }) => { await held.promise; syntheticCalls++; return call(); });
    await first.ensureIndexes();
    const same = request('mongo-same-request-0001', 'mongo-idempotency-owner');
    const accepted = await Promise.all([first.handle(same), duplicate.handle(same)]);
    assert.deepEqual(accepted.map(result => result.code), [0, 0]);
    assert.equal(await db.collection('paperbanana_figure_operations').countDocuments({ userId: same.userId }), 1);
    held.resolve(); await Promise.all([first.drain(), duplicate.drain()]);
    assert.equal(syntheticCalls, 1);
    const replay = await duplicate.handle(same);
    assert.equal(replay.code, 0); assert.equal(replay.operation.status, 'succeeded');
    assert.equal(syntheticCalls, 1, 'Completed exact resubmission must read the existing result');
    assert.equal((await first.handle({ ...same, materials: 'different scientific input' })).code, 409);
    assert.equal((await query(first, { ...same, userId: 'foreign-account' })).code, 404);
    assert.equal((await query(first, same)).operation.status, 'succeeded');
    checks.push('same_request_id_cross_instance_single_dispatch_and_conflict');

    // Managed-provider checkpoints use the real Mongo driver too, with a local
    // synthetic call closure instead of an HTTP adapter.
    const managed = make(async ({ call }) => { syntheticCalls++; return call(); });
    const managedRequest = request('mongo-managed-request-0001', 'mongo-managed-owner', { mainRoute: route, apiKeys: credentials });
    assert.equal((await managed.handle(managedRequest)).code, 0); await managed.drain();
    assert.equal((await query(managed, managedRequest)).operation.status, 'succeeded');
    assert.equal(await db.collection('paperbanana_figure_provider_steps').countDocuments({ userId: managedRequest.userId, state: 'complete' }), 1);
    assert.ok(await db.collection('paperbanana_figure_provider_step_chunks').countDocuments({ userId: managedRequest.userId }) > 0);
    const persisted = await db.collection('paperbanana_figure_operations').find({ userId: { $in: [same.userId, managedRequest.userId] } }).toArray();
    assert.equal(persisted.length, 2); assert.ok(persisted.every(row => row.result));
    assert.ok(!JSON.stringify(persisted).includes(plan.title));
    assert.ok(!JSON.stringify(persisted).includes('synthetic-native-key'));
    const restarted = await restartProbe({ uri, dbName, ownerToken, secret, requests: [same, managedRequest].map(({ userId, requestId }) => ({ userId, requestId })) });
    assert.deepEqual(restarted, { freshProcess: true, persistedResults: 2, syntheticCalls: 0, externalProviderCalls: 0 });
    checks.push('native_and_managed_encrypted_results_read_by_fresh_node_process');

    // Three services cannot occupy more than two Mongo admission slots for one
    // account. Keep accepted synthetic calls pending while inspecting the DB.
    const limitGate = gate(); gates.push(limitGate);
    let entered = 0;
    const racers = Array.from({ length: 3 }, () => make(async ({ call }) => { entered++; await limitGate.promise; syntheticCalls++; return call(); }));
    const attempts = racers.map((ops, index) => ops.handle(request(`mongo-slot-request-000${index}`, 'mongo-slot-owner')));
    const limits = await Promise.all(attempts);
    assert.deepEqual(limits.map(result => result.code).sort(), [0, 0, 429]);
    await until(() => entered === 2);
    assert.equal(await db.collection('paperbanana_figure_admissions').countDocuments({ userId: 'mongo-slot-owner' }), 2);
    assert.equal(await db.collection('paperbanana_figure_operations').countDocuments({ userId: 'mongo-slot-owner', status: { $in: ['queued', 'running'] } }), 2);
    const other = make(async ({ call }) => { syntheticCalls++; return call(); });
    const otherRequest = request('mongo-slot-independent-0001', 'independent-slot-owner');
    assert.equal((await other.handle(otherRequest)).code, 0); await other.drain();
    limitGate.resolve(); await Promise.all(racers.map(ops => ops.drain()));
    assert.equal(await db.collection('paperbanana_figure_admissions').countDocuments({ userId: 'mongo-slot-owner' }), 0);
    checks.push('two_slots_atomic_across_three_instances_and_account_isolation');

    // Change account generation after async preflight but before hooks.call.
    const accountGate = gate(); gates.push(accountGate);
    let forbiddenDispatches = 0, atBoundary = false;
    const account = make(async ({ call }) => { atBoundary = true; await accountGate.promise; return account.hooks.call(['must-be-fenced'], async () => { forbiddenDispatches++; return call(); }); });
    const oldAccount = request('mongo-generation-request-0001', 'mongo-generation-owner', { mainRoute: route, apiKeys: credentials });
    assert.equal((await account.handle(oldAccount)).code, 0); await until(() => atBoundary);
    await db.collection('paperbanana_account_deletions').insertOne({ _id: 'user:' + oldAccount.userId, contractVersion: 3, status: 'active', accountGeneration: 'new-generation' });
    accountGate.resolve(); await account.drain();
    assert.equal(forbiddenDispatches, 0);
    assert.equal((await query(account, oldAccount)).code, 409);
    assert.equal(await db.collection('paperbanana_figure_provider_step_chunks').countDocuments({ userId: oldAccount.userId }), 0);
    checks.push('account_generation_change_rejected_before_synthetic_dispatch');

    for (const name of ['paperbanana_figure_operations', 'paperbanana_figure_admissions', 'paperbanana_figure_provider_executions', 'paperbanana_figure_provider_steps', 'paperbanana_figure_provider_step_chunks']) {
      const indexes = await db.collection(name).listIndexes().toArray();
      assert.ok(indexes.some(index => index.key.expiresAt === 1 && index.expireAfterSeconds === 0), name + ' lacks TTL index');
    }
    assert.deepEqual(await db.collection('paperbanana_jobs').findOne({ _id: sentinel._id }), sentinel);
    assert.equal(await db.collection('paperbanana_provider_executions').countDocuments({}), 0);
    assert.equal(externalProviderCalls, 0);
    checks.push('real_ttl_indexes_and_shared_job_namespace_unchanged');
    report = { database: dbName, mongodb: (await db.command({ buildInfo: 1 })).version, checks, syntheticCalls, externalProviderCalls, restartedProcess: restarted };
  } finally {
    for (const held of gates) held.resolve();
    for (const ops of instances) ops.stop();
    await Promise.all(instances.map(ops => ops.drain()));
    if (owned) {
      const db = client.db(dbName);
      assert.match(dbName, /^tuyan_figure_integration_\d+_[a-f0-9]{12}$/);
      assert.ok(await db.collection('__integration_owner').findOne({ _id: ownerToken }), 'Refusing cleanup without this process ownership marker');
      await db.dropDatabase();
      const after = await client.db('admin').admin().listDatabases({ nameOnly: true, filter: { name: dbName } });
      assert.equal(after.databases.length, 0); cleaned = true;
    }
    await client.close();
  }
  console.log(JSON.stringify({ ...report, cleaned }, null, 2));
}
