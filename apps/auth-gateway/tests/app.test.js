import assert from 'node:assert/strict';
import { once } from 'node:events';
import { request as httpRequest } from 'node:http';
import test from 'node:test';

import { createApp } from '../src/app.js';
import { loadGatewayConfig } from '../src/config.js';
import { createGuestToken, readGuestIdentity } from '../src/guest-identity.js';

function config(overrides = {}) {
  return {
    production: true,
    frontendOrigins: ['https://paperbanana.asia'],
    trustProxy: 1,
    adminToken: 'internal-admin-token',
    adminUserIds: new Set(['admin-id']),
    guestCookie: {
      name: '__Host-paperbanana_guest',
      secret: 'current-guest-cookie-secret-32-bytes-long',
      previousSecret: '',
      ttlSeconds: 30 * 24 * 60 * 60,
      secure: true,
    },
    backend: { mode: 'node' },
    maintenance: { retryAfterSeconds: 120 },
    oss: {
      bucket: 'paperbanana-hk',
      publicEndpoint: 'https://oss-cn-hongkong.aliyuncs.com',
      allowLegacyExternalRefineUrl: false,
    },
    ...overrides,
  };
}

function productionConfig(overrides = {}) {
  return loadGatewayConfig({
    NODE_ENV: 'production',
    AUTH_BASE_URL: 'https://api.paperbanana.asia',
    BETTER_AUTH_SECRET: 'better-auth-secret-with-at-least-32-bytes',
    MONGODB_URI: 'mongodb://127.0.0.1:27017/paperbanana-test',
    PAPERBANANA_API_URL: 'http://paperbanana-api:3006/paperbanana-api',
    PAPERBANANA_GATEWAY_TOKEN: 'gateway-token',
    PAPERBANANA_GUEST_COOKIE_SECRET: 'guest-cookie-secret-with-at-least-32-bytes',
    ADMIN_USER_IDS: 'admin-id',
    FRONTEND_ORIGINS: 'https://www.paperbanana.asia,https://paperbanana.asia',
    ...overrides,
  });
}

function fakeAuth(overrides = {}) {
  const events = [];
  const webRequests = [];
  return {
    events,
    webRequests,
    handler(_req, res) {
      res.status(200).json({ code: 0, auth: true });
    },
    async webHandler(request) {
      const body = request.method === 'GET' ? '' : await request.text();
      webRequests.push({ request, body });
      return Response.json({ code: 0, auth: true, body });
    },
    async optionalSession(req) {
      const value = req.get('x-test-session');
      if (!value) return null;
      const [id, email] = value.split('|');
      return { user: { id, email } };
    },
    async verifyPassword() {
      events.push('password');
      return true;
    },
    async clearSessionCookie(_req, res) {
      events.push('clear');
      res.append('set-cookie', 'paperbanana.session=; Max-Age=0; Path=/; HttpOnly');
    },
    async deleteUser(userId) {
      events.push(`delete:${userId}`);
    },
    async listUsers() {
      return { users: [{ id: 'user-1', email: 'one@example.com' }] };
    },
    cachedStatus() {
      return { ok: true, checkedAt: 'cached-auth' };
    },
    async ready() {
      return { ok: true };
    },
    async close() {},
    ...overrides,
  };
}

function fakeBackend(resolver = async () => ({ status: 200, data: { code: 0, ok: true } })) {
  const calls = [];
  return {
    mode: 'node',
    calls,
    async call(body, context, options) {
      calls.push({ body, context, options });
      return resolver(body, context, options, calls);
    },
    cachedStatus() {
      return { mode: 'node', ok: true, checkedAt: 'cached-backend' };
    },
    async ready(context) {
      calls.push({ body: { action: 'health' }, context, ready: true });
      return { ok: true, result: { status: 200, data: { code: 0, ok: true } } };
    },
  };
}

async function withApp({
  auth = fakeAuth(),
  backend = fakeBackend(),
  appConfig = config(),
  isMaintenance = () => false,
  logger = { info() {}, warn() {}, error() {} },
}, run) {
  const app = createApp({
    config: appConfig,
    auth,
    backend,
    isMaintenance,
    nowSeconds: () => 1_800_000_000,
    randomBytes: () => Buffer.alloc(32, 5),
    logger,
  });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try {
    await run({ baseUrl, auth, backend });
  } finally {
    server.close();
    await once(server, 'close');
  }
}

async function post(baseUrl, body, headers = {}) {
  return fetch(`${baseUrl}/paperbanana-api`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

test('allows exact WeChat origins and rejects lookalike domains', async () => {
  await withApp({ appConfig: productionConfig() }, async ({ baseUrl }) => {
    for (const origin of [
      'https://servicewechat.com',
      'https://developers.weixin.qq.com',
    ]) {
      const response = await fetch(`${baseUrl}/api/auth/get-session`, {
        headers: { Origin: origin },
      });

      assert.equal(response.status, 200);
      assert.equal(response.headers.get('access-control-allow-origin'), origin);
      assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
    }

    const rejected = await fetch(`${baseUrl}/api/auth/get-session`, {
      headers: { Origin: 'https://servicewechat.com.evil.example' },
    });

    assert.equal(rejected.status, 403);
    assert.equal(rejected.headers.get('access-control-allow-origin'), null);
  });
});

function cookiePair(response) {
  return String(response.headers.get('set-cookie') || '').split(';', 1)[0];
}

function chunkedRequest(url, chunks) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const request = httpRequest(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname,
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'transfer-encoding': 'chunked',
        },
      },
      (response) => {
        const body = [];
        response.on('data', (chunk) => body.push(chunk));
        response.on('end', () => resolve({
          status: response.statusCode,
          body: Buffer.concat(body).toString('utf8'),
        }));
      },
    );
    request.on('error', reject);
    for (const chunk of chunks) request.write(chunk);
    request.end();
  });
}

test('Better Auth receives bounded request bodies through the Web handler bridge', async () => {
  const auth = fakeAuth();
  await withApp({ auth }, async ({ baseUrl }) => {
    const payload = JSON.stringify({ email: 'owner@example.com', password: 'secret' });
    const response = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: payload,
    });
    assert.equal(response.status, 200);
    assert.equal(auth.webRequests.length, 1);
    assert.equal(auth.webRequests[0].body, payload);
  });
});

test('Better Auth rejects bodies larger than 1 MiB with the stable envelope', async () => {
  const auth = fakeAuth();
  await withApp({ auth }, async ({ baseUrl }) => {
    const response = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ padding: 'x'.repeat(1024 * 1024) }),
    });
    assert.equal(response.status, 413);
    assert.deepEqual(await response.json(), { code: 413, error: 'Request body too large' });
    assert.equal(auth.webRequests.length, 0);
  });
});

test('Better Auth counts chunked bytes instead of trusting Content-Length', async () => {
  const auth = fakeAuth();
  await withApp({ auth }, async ({ baseUrl }) => {
    const response = await chunkedRequest(`${baseUrl}/api/auth/sign-up/email`, [
      '{"padding":"',
      'x'.repeat(600 * 1024),
      'x'.repeat(600 * 1024),
      '"}',
    ]);
    assert.equal(response.status, 413);
    assert.deepEqual(JSON.parse(response.body), { code: 413, error: 'Request body too large' });
    assert.equal(auth.webRequests.length, 0);
  });
});

test('Better Auth still receives a valid chunked body below the limit', async () => {
  const auth = fakeAuth();
  await withApp({ auth }, async ({ baseUrl }) => {
    const response = await chunkedRequest(`${baseUrl}/api/auth/sign-up/email`, [
      '{"email":"owner@',
      'example.com"}',
    ]);
    assert.equal(response.status, 200);
    assert.equal(auth.webRequests.length, 1);
    assert.equal(auth.webRequests[0].body, '{"email":"owner@example.com"}');
  });
});

test('keeps HTTP-200 business envelopes including public saturation code 429', async () => {
  const backend = fakeBackend(async () => ({ status: 200, data: { code: 429, error: 'busy' } }));
  await withApp({ backend }, async ({ baseUrl }) => {
    const response = await post(baseUrl, { action: 'createJob' });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { code: 429, error: 'busy' });
  });
});

test('relays a real upstream HTTP status and envelope unchanged', async () => {
  const backend = fakeBackend(async () => ({ status: 422, data: { code: 422, error: 'invalid' } }));
  await withApp({ backend }, async ({ baseUrl }) => {
    const response = await post(baseUrl, { action: 'modelCapability' });
    assert.equal(response.status, 422);
    assert.deepEqual(await response.json(), { code: 422, error: 'invalid' });
  });
});

test('modelRegistry is a public read-only backend action', async () => {
  const backend = fakeBackend(async (body) => ({
    status: 200,
    data: { code: 0, registryVersion: '2026-08-19', provider: body.provider },
  }));
  await withApp({ backend }, async ({ baseUrl }) => {
    const response = await post(baseUrl, { action: 'modelRegistry', provider: 'gemini' });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      code: 0,
      registryVersion: '2026-08-19',
      provider: 'gemini',
    });
    assert.equal(backend.calls[0].body.action, 'modelRegistry');
  });
});

test('benchmark public actions are anonymous read-only backend actions', async () => {
  const backend = fakeBackend(async (body) => ({ status: 200, data: { code: 0, action: body.action } }));
  await withApp({ backend }, async ({ baseUrl }) => {
    for (const action of ['benchmarkLeaderboard', 'benchmarkModelProfile', 'benchmarkMethodology']) {
      const response = await post(baseUrl, { action, modelId: 'model-a' });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { code: 0, action });
    }
    assert.equal(backend.calls.length, 3);
  });
});

test('benchmark admin actions require immutable admin identity before forwarding', async () => {
  const backend = fakeBackend();
  await withApp({ backend }, async ({ baseUrl }) => {
    const denied = await post(baseUrl, { action: 'adminBenchmarkCandidates' });
    assert.equal(denied.status, 401);
    assert.equal(backend.calls.length, 0);

    const allowed = await post(baseUrl, { action: 'adminBenchmarkCandidates' }, { 'x-test-session': 'admin-id|admin@example.com' });
    assert.equal(allowed.status, 200);
    assert.equal(backend.calls[0].body.action, 'adminBenchmarkCandidates');
    assert.equal(backend.calls[0].options.adminAction, true);
    assert.equal(backend.calls[0].options.adminUserId, 'admin-id');
  });
});

test('anonymous writes receive a stable guest owner while raw forwarding headers are not relayed', async () => {
  await withApp({}, async ({ baseUrl, backend }) => {
    const first = await post(
      baseUrl,
      { action: 'createJob', userId: 'forged-account' },
      {
        'x-forwarded-for': '198.51.100.99, 203.0.113.10',
        'x-real-ip': '198.51.100.88',
        'user-agent': 'client-agent',
      },
    );
    const cookie = cookiePair(first);
    assert.match(cookie, /^__Host-paperbanana_guest=/);
    assert.match(backend.calls[0].body.userId, /^guest:/);
    assert.equal(backend.calls[0].body.userEmail, '');
    assert.equal(backend.calls[0].context.clientIp, '203.0.113.10');
    assert.equal(backend.calls[0].context.userAgent, 'client-agent');

    await post(baseUrl, { action: 'prepareReferenceUpload' }, { cookie });
    assert.equal(backend.calls[1].body.userId, backend.calls[0].body.userId);
    await post(baseUrl, { action: 'finalizeReferenceUpload', uploads: [] }, { cookie });
    assert.equal(backend.calls[2].body.userId, backend.calls[0].body.userId);
  });
});

test('logged-in writes use the account identity and never create a guest cookie', async () => {
  await withApp({}, async ({ baseUrl, backend }) => {
    const response = await post(
      baseUrl,
      { action: 'createJob', userId: 'forged' },
      { 'x-test-session': 'account-1|Owner@Example.com' },
    );
    assert.equal(response.headers.get('set-cookie'), null);
    assert.equal(backend.calls[0].body.userId, 'account-1');
    assert.equal(backend.calls[0].body.userEmail, 'Owner@Example.com');
  });
});

test('create and refine preserve explicit mixed routes and legacy fields without top-provider rewrites', async () => {
  const modelRoutes = {
    main: { accessProvider: 'openai', modelId: 'gpt-5.6-sol' },
    image: { accessProvider: 'bailian', modelId: 'wan2.7-image-pro' },
    vision: { accessProvider: 'gemini', modelId: 'gemini-3.7-flash' },
  };
  const backend = fakeBackend(async (body) => body.action === 'getJob'
    ? { status: 200, data: { code: 0, job: { id: body.jobId, userId: 'account-1' } } }
    : { status: 200, data: { code: 0, jobId: `${body.action}-1` } });
  await withApp({ backend }, async ({ baseUrl }) => {
    await post(baseUrl, {
      action: 'createJob',
      provider: 'openai',
      modelRoutes,
      mainModelName: 'gpt-5.6-sol',
      imageModelName: 'wan2.7-image-pro',
      referenceVisionModelName: 'gemini-3.7-flash',
      apiKeys: { openai: 'openai-secret', bailian: 'bailian-secret', gemini: 'gemini-secret' },
      gatewayToken: 'forged-gateway-token',
      adminToken: 'forged-admin-token',
    }, { 'x-test-session': 'account-1|owner@example.com' });
    await post(baseUrl, {
      action: 'refineImage',
      provider: 'openai',
      modelRoutes,
      mainModelName: 'gpt-5.6-sol',
      imageModelName: 'wan2.7-image-pro',
      referenceVisionModelName: 'gemini-3.7-flash',
      apiKeys: { openai: 'openai-secret', bailian: 'bailian-secret', gemini: 'gemini-secret' },
      sourceImageObjectKey: 'source-job/candidate.png',
      gatewayToken: 'forged-gateway-token',
      adminToken: 'forged-admin-token',
    }, { 'x-test-session': 'account-1|owner@example.com' });
    await post(baseUrl, {
      action: 'createJob',
      provider: 'gemini',
      modelRoutes: {
        main: { accessProvider: 'gemini', modelId: 'gemini-3.7-flash' },
        image: { accessProvider: 'gemini', modelId: 'gemini-3.1-flash-image-preview' },
        vision: { accessProvider: 'gemini', modelId: 'gemini-3.7-flash' },
      },
      mainModelName: 'gemini-3.7-flash',
      imageModelName: 'gemini-3.1-flash-image-preview',
    }, { 'x-test-session': 'account-1|owner@example.com' });

    const [created, sourceLookup, refined, aliasCreate] = backend.calls;
    for (const call of [created, refined]) {
      assert.equal(call.body.provider, 'openai');
      assert.deepEqual(call.body.modelRoutes, modelRoutes);
      assert.equal(call.body.mainModelName, 'gpt-5.6-sol');
      assert.equal(call.body.imageModelName, 'wan2.7-image-pro');
      assert.equal(call.body.referenceVisionModelName, 'gemini-3.7-flash');
      assert.equal(call.body.userId, 'account-1');
      assert.equal(call.body.userEmail, 'owner@example.com');
      assert.equal(call.body.gatewayToken, 'forged-gateway-token');
      assert.equal(call.body.adminToken, 'forged-admin-token');
    }
    assert.equal(sourceLookup.body.action, 'getJob');
    assert.equal(aliasCreate.body.imageModelName, 'gemini-3.1-flash-image-preview');
    assert.equal(aliasCreate.body.modelRoutes.image.modelId, 'gemini-3.1-flash-image-preview');
  });
});

test('providerAccountCatalog receives the same authenticated-or-guest write principal as jobs', async () => {
  await withApp({}, async ({ baseUrl, backend }) => {
    const anonymous = await post(baseUrl, {
      action: 'providerAccountCatalog',
      apiKeys: { ark: 'ark-secret', openai: 'openai-secret' },
      api_keys: { bailian: 'alias-secret' },
      accessToken: 'unrelated-secret',
      probes: [{ role: 'main', modelId: 'doubao-seed-2-0-mini-260428' }],
      confirmPaidImageProbe: false,
    });
    assert.equal(anonymous.status, 200);
    assert.match(cookiePair(anonymous), /^__Host-paperbanana_guest=/);
    assert.match(backend.calls[0].body.userId, /^guest:/);
    assert.equal(backend.calls[0].body.userEmail, '');
    assert.deepEqual(backend.calls[0].body.apiKeys, { ark: 'ark-secret' });
    assert.equal(Object.hasOwn(backend.calls[0].body, 'api_keys'), false);
    assert.equal(Object.hasOwn(backend.calls[0].body, 'accessToken'), false);
    assert.deepEqual(backend.calls[0].body.probes, [{ role: 'main', modelId: 'doubao-seed-2-0-mini-260428' }]);
    assert.equal(backend.calls[0].body.confirmPaidImageProbe, false);

    await post(baseUrl, { action: 'providerAccountCatalog', apiKeys: { ark: 'ark-secret' } }, {
      'x-test-session': 'account-1|owner@example.com',
    });
    assert.equal(backend.calls[1].body.userId, 'account-1');
    assert.equal(backend.calls[1].body.userEmail, 'owner@example.com');
  });
});

test('getJob allows a matching guest owner and rejects missing or mismatched ownership', async () => {
  let owner = '';
  let job = null;
  const backend = fakeBackend(async (body) => {
    if (body.action === 'createJob') {
      owner = body.userId;
      return { status: 200, data: { code: 0, jobId: 'job-1' } };
    }
    return { status: 200, data: { code: 0, job } };
  });
  await withApp({ backend }, async ({ baseUrl }) => {
    const created = await post(baseUrl, { action: 'createJob' });
    const cookie = cookiePair(created);

    job = { id: 'job-1', userId: owner };
    assert.equal((await post(baseUrl, { action: 'getJob', jobId: 'job-1' }, { cookie })).status, 200);
    assert.equal((await post(baseUrl, { action: 'getJob', jobId: 'job-1' })).status, 403);

    job = { id: 'job-1' };
    assert.equal((await post(baseUrl, { action: 'getJob', jobId: 'job-1' }, { cookie })).status, 403);
  });
});

test('getJob accepts historical account email and immutable-id admins', async () => {
  let job = { id: 'job-1', userEmail: 'old@example.com' };
  const backend = fakeBackend(async () => ({ status: 200, data: { code: 0, job } }));
  await withApp({ backend }, async ({ baseUrl }) => {
    assert.equal(
      (await post(baseUrl, { action: 'getJob' }, { 'x-test-session': 'new-id|OLD@example.com' })).status,
      200,
    );
    job = {};
    assert.equal(
      (await post(baseUrl, { action: 'getJob' }, { 'x-test-session': 'admin-id|admin@example.com' })).status,
      200,
    );
  });
});

test('matching an admin email or caller token never grants admin access', async () => {
  const backend = fakeBackend(async () => ({ status: 200, data: { code: 0, job: {} } }));
  await withApp({ backend }, async ({ baseUrl }) => {
    const sameEmail = await post(
      baseUrl,
      { action: 'adminUsers', adminToken: 'internal-admin-token' },
      {
        'x-test-session': 'attacker-id|admin@example.com',
        'x-admin-token': 'internal-admin-token',
      },
    );
    assert.equal(sameEmail.status, 403);

    const unauthenticated = await post(
      baseUrl,
      { action: 'adminUsers', adminToken: 'internal-admin-token' },
      { 'x-admin-token': 'internal-admin-token' },
    );
    assert.equal(unauthenticated.status, 401);

    const getJob = await post(
      baseUrl,
      { action: 'getJob', adminToken: 'internal-admin-token' },
      { 'x-test-session': 'attacker-id|admin@example.com' },
    );
    assert.equal(getJob.status, 403);
  });
});

test('getJob rotates a valid previous-key guest cookie while preserving access', async () => {
  const previousSecret = 'previous-guest-cookie-secret-32-bytes-long';
  const appConfig = config({
    guestCookie: {
      ...config().guestCookie,
      previousSecret,
    },
  });
  const token = createGuestToken({
    random: Buffer.alloc(32, 18).toString('base64url'),
    expiresAt: 1_800_001_000,
    secret: previousSecret,
  });
  const guest = readGuestIdentity({
    cookieHeader: `__Host-paperbanana_guest=${token}`,
    config: appConfig.guestCookie,
    nowSeconds: 1_800_000_000,
  });
  const backend = fakeBackend(async () => ({
    status: 200,
    data: { code: 0, job: { id: 'job-1', userId: guest.owner } },
  }));

  await withApp({ appConfig, backend }, async ({ baseUrl }) => {
    const response = await post(
      baseUrl,
      { action: 'getJob', jobId: 'job-1' },
      { cookie: `__Host-paperbanana_guest=${token}` },
    );
    assert.equal(response.status, 200);
    assert.match(response.headers.get('set-cookie') || '', /^__Host-paperbanana_guest=/);
  });
});

test('guest identity never enables myJobs, admin lists, or account deletion', async () => {
  await withApp({}, async ({ baseUrl }) => {
    const created = await post(baseUrl, { action: 'createJob' });
    const cookie = cookiePair(created);
    assert.equal((await post(baseUrl, { action: 'myJobs' }, { cookie })).status, 401);
    assert.equal((await post(baseUrl, { action: 'adminUsers' }, { cookie })).status, 401);
    assert.equal(
      (
        await fetch(`${baseUrl}/api/account/delete`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', cookie },
          body: JSON.stringify({ email: 'guest@example.com', password: 'secret' }),
        })
      ).status,
      401,
    );
  });
});

test('refine checks source job ownership before dispatch and prefers the object key', async () => {
  const backend = fakeBackend(async (body) => {
    if (body.action === 'getJob') {
      return { status: 200, data: { code: 0, job: { id: body.jobId, userId: 'account-1' } } };
    }
    return { status: 200, data: { code: 0, jobId: 'refine-1' } };
  });
  await withApp({ backend }, async ({ baseUrl }) => {
    const response = await post(
      baseUrl,
      {
        action: 'refineImage',
        sourceImageObjectKey: 'source-job/candidate-1.png',
        sourceImageUrl: 'https://attacker.example/image.png',
      },
      { 'x-test-session': 'account-1|owner@example.com' },
    );
    assert.equal(response.status, 200);
    assert.equal(backend.calls[0].body.action, 'getJob');
    assert.equal(backend.calls[0].body.jobId, 'source-job');
    assert.equal(backend.calls[1].body.action, 'refineImage');
    assert.equal(backend.calls[1].body.sourceImageObjectKey, 'source-job/candidate-1.png');
    assert.equal(backend.calls[1].body.sourceImageUrl, undefined);
  });
});

test('refine rejects cross-owner object keys and external URLs before dispatch', async () => {
  const backend = fakeBackend(async (body) => ({
    status: 200,
    data: { code: 0, job: { id: body.jobId, userId: 'other-account' } },
  }));
  await withApp({ backend }, async ({ baseUrl }) => {
    const crossOwner = await post(
      baseUrl,
      { action: 'refineImage', sourceImageObjectKey: 'source-job/candidate.png' },
      { 'x-test-session': 'account-1|owner@example.com' },
    );
    assert.equal(crossOwner.status, 403);
    assert.equal(backend.calls.length, 1);

    const external = await post(
      baseUrl,
      { action: 'refineImage', sourceImageUrl: 'http://169.254.169.254/latest/meta-data' },
      { 'x-test-session': 'account-1|owner@example.com' },
    );
    assert.equal(external.status, 403);
    assert.equal(backend.calls.length, 1);
  });
});

test('maintenance mode dynamically blocks the exact mutating set but preserves reads and auth', async () => {
  let maintenance = true;
  await withApp({ isMaintenance: () => maintenance }, async ({ baseUrl }) => {
    for (const action of [
      'createJob',
      'refineImage',
      'prepareReferenceUpload',
      'finalizeReferenceUpload',
      'abortReferenceUpload',
      'submitFeedback',
      'importReferences',
      'evaluateJob',
      'initDatabase',
    ]) {
      const response = await post(baseUrl, { action });
      assert.equal(response.status, 503, action);
      assert.equal(response.headers.get('retry-after'), '120');
      assert.deepEqual(await response.json(), { code: 503, error: 'MAINTENANCE_MODE' });
    }
    assert.equal((await post(baseUrl, { action: 'referenceLibrary' })).status, 200);
    assert.equal((await fetch(`${baseUrl}/api/auth/session`)).status, 200);
    maintenance = false;
    assert.equal((await post(baseUrl, { action: 'createJob' })).status, 200);
  });
});

test('health is cached liveness, ready probes dependencies, and compatibility routes retain laf alias', async () => {
  const backend = fakeBackend();
  const auth = fakeAuth();
  await withApp({ backend, auth }, async ({ baseUrl }) => {
    const health = await fetch(`${baseUrl}/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), {
      code: 0,
      ok: true,
      runtime: 'gateway',
      auth: 'better-auth',
      authReady: true,
      backend: { mode: 'node', ok: true, checkedAt: 'cached-backend' },
      laf: { mode: 'node', ok: true, checkedAt: 'cached-backend' },
      dependencies: {
        auth: { ok: true, checkedAt: 'cached-auth' },
        backend: { mode: 'node', ok: true, checkedAt: 'cached-backend' },
      },
    });
    assert.equal(backend.calls.length, 0);

    const ready = await fetch(`${baseUrl}/ready`);
    assert.equal(ready.status, 200);
    assert.equal((await ready.json()).runtime, 'gateway');
    assert.equal(backend.calls.length, 1);

    assert.equal((await fetch(`${baseUrl}/paperbanana-api`)).status, 200);
    assert.equal((await post(baseUrl, { action: 'health' })).status, 200);
  });
});

test('ready returns 503 if either auth or backend is unavailable', async () => {
  const auth = fakeAuth({ async ready() { return { ok: false, error: 'mongo down' }; } });
  await withApp({ auth }, async ({ baseUrl }) => {
    const response = await fetch(`${baseUrl}/ready`);
    assert.equal(response.status, 503);
    assert.equal((await response.json()).ok, false);
  });
});

test('account deletion mutates auth only after semantic backend success', async () => {
  const order = [];
  const auth = fakeAuth({
    async verifyPassword() { order.push('password'); return true; },
    async deleteUser() { order.push('delete'); },
    async clearSessionCookie(_req, res) { order.push('clear'); res.append('set-cookie', 'session=; Max-Age=0'); },
  });
  const backend = fakeBackend(async (body) => {
    order.push(body.action);
    if (body.action === 'accountDeletionCapability') {
      return { status: 200, data: { code: 0, deletionContractVersion: 2 } };
    }
    return { status: 200, data: { code: 0, ok: true, deletionContractVersion: 2 } };
  });
  await withApp({ auth, backend }, async ({ baseUrl }) => {
    const response = await fetch(`${baseUrl}/api/account/delete`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-test-session': 'account-1|owner@example.com' },
      body: JSON.stringify({ email: 'OWNER@example.com', password: 'secret' }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(order, ['password', 'accountDeletionCapability', 'deleteAccount', 'delete', 'clear']);
  });
});

test('account deletion preflights the v2 contract before any destructive backend call', async () => {
  const auth = fakeAuth({
    async verifyPassword() { return true; },
    async deleteUser() { assert.fail('Auth must remain intact when the backend lacks deletion v2'); },
  });
  const backend = fakeBackend(async (body) => {
    assert.equal(body.action, 'accountDeletionCapability');
    return { status: 400, data: { code: 400, error: 'Unknown action: accountDeletionCapability' } };
  });

  await withApp({ auth, backend }, async ({ baseUrl }) => {
    const response = await fetch(`${baseUrl}/api/account/delete`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-test-session': 'account-1|owner@example.com' },
      body: JSON.stringify({ email: 'owner@example.com', password: 'secret' }),
    });
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { code: 503, error: 'ACCOUNT_DELETION_CONTRACT_UNAVAILABLE' });
    assert.deepEqual(backend.calls.map((call) => call.body.action), ['accountDeletionCapability']);
  });
});

test('concurrent account deletion requests share one destructive operation', async () => {
  let backendDeletes = 0;
  let authDeletes = 0;
  let releaseDelete;
  const deleteGate = new Promise((resolve) => { releaseDelete = resolve; });
  let passwordCalls = 0;
  let releasePasswords;
  const passwordsReady = new Promise((resolve) => { releasePasswords = resolve; });
  const auth = fakeAuth({
    async verifyPassword() {
      passwordCalls += 1;
      if (passwordCalls === 2) releasePasswords();
      await passwordsReady;
      return true;
    },
    async deleteUser() { authDeletes += 1; },
  });
  const backend = fakeBackend(async (body) => {
    if (body.action === 'accountDeletionCapability') {
      return { status: 200, data: { code: 0, deletionContractVersion: 2 } };
    }
    backendDeletes += 1;
    await deleteGate;
    return { status: 200, data: { code: 0, ok: true, deletionContractVersion: 2 } };
  });

  await withApp({ auth, backend }, async ({ baseUrl }) => {
    const request = () => fetch(`${baseUrl}/api/account/delete`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-test-session': 'account-1|owner@example.com' },
      body: JSON.stringify({ email: 'owner@example.com', password: 'secret' }),
    });
    const first = request();
    const second = request();
    while (backendDeletes !== 1) await new Promise((resolve) => setImmediate(resolve));
    releaseDelete();
    const responses = await Promise.all([first, second]);
    assert.deepEqual(responses.map((response) => response.status), [200, 200]);
    assert.equal(backendDeletes, 1);
    assert.equal(authDeletes, 1);
  });
});

test('account deletion succeeds after commit even when cookie clearing fails', async () => {
  const order = [];
  const auth = fakeAuth({
    async verifyPassword() { order.push('password'); return true; },
    async deleteUser() { order.push('delete'); },
    async clearSessionCookie() { order.push('clear'); throw new Error('cookie secret leaked'); },
  });
  const backend = fakeBackend(async (body) => {
    order.push(body.action);
    if (body.action === 'accountDeletionCapability') {
      return { status: 200, data: { code: 0, deletionContractVersion: 2 } };
    }
    return { status: 200, data: { code: 0, ok: true, deletionContractVersion: 2 } };
  });
  await withApp({ auth, backend }, async ({ baseUrl }) => {
    const response = await fetch(`${baseUrl}/api/account/delete`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-test-session': 'account-1|owner@example.com' },
      body: JSON.stringify({ email: 'owner@example.com', password: 'secret' }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { code: 0, ok: true });
    assert.deepEqual(order, ['password', 'accountDeletionCapability', 'deleteAccount', 'delete', 'clear']);
  });
});

test('account deletion treats password-store failures as internal errors, not bad passwords', async () => {
  const auth = fakeAuth({
    async verifyPassword() {
      throw new Error('Mongo failed: mongodb://owner:super-secret@mongodb:27017/auth');
    },
  });
  const backend = fakeBackend();
  await withApp({ auth, backend }, async ({ baseUrl }) => {
    const response = await fetch(`${baseUrl}/api/account/delete`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-test-session': 'account-1|owner@example.com' },
      body: JSON.stringify({ email: 'owner@example.com', password: 'secret' }),
    });
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { code: 500, error: 'Internal server error' });
    assert.equal(backend.calls.length, 0);
  });
});

test('unexpected internal failures return a generic 500 and log only redacted detail', async () => {
  const logEntries = [];
  const auth = fakeAuth({
    async listUsers() {
      throw new Error('Mongo failed: mongodb://owner:super-secret@mongodb:27017/auth');
    },
  });
  await withApp(
    {
      auth,
      logger: {
        info() {},
        warn() {},
        error(message, fields) { logEntries.push({ message, fields }); },
      },
    },
    async ({ baseUrl }) => {
      const response = await post(
        baseUrl,
        { action: 'adminUsers' },
        { 'x-test-session': 'admin-id|changed@example.com' },
      );
      assert.equal(response.status, 500);
      assert.deepEqual(await response.json(), { code: 500, error: 'Internal server error' });
      const serialized = JSON.stringify(logEntries);
      assert.match(serialized, /Mongo failed/);
      assert.match(serialized, /\[REDACTED\]/);
      assert.doesNotMatch(serialized, /super-secret/);
    },
  );
});

test('route-shaped multi-key failures keep every BYOK secret out of logs and the public 500', async () => {
  const logEntries = [];
  const backend = fakeBackend(async () => {
    throw new Error('routing failed ' + JSON.stringify({
      apiKeys: { ark: 'ark-secret', openai: 'openai-secret', bailian: 'bailian-secret' },
      modelRoutes: { image: { accessProvider: 'bailian', modelId: 'wan2.7-image-pro' } },
    }));
  });
  await withApp(
    {
      backend,
      logger: { info() {}, warn() {}, error(message, fields) { logEntries.push({ message, fields }); } },
    },
    async ({ baseUrl }) => {
      const response = await post(baseUrl, {
        action: 'createJob',
        apiKeys: { ark: 'ark-secret', openai: 'openai-secret', bailian: 'bailian-secret' },
        modelRoutes: { image: { accessProvider: 'bailian', modelId: 'wan2.7-image-pro' } },
      });
      assert.equal(response.status, 500);
      assert.deepEqual(await response.json(), { code: 500, error: 'Internal server error' });
      const serialized = JSON.stringify(logEntries);
      assert.doesNotMatch(serialized, /ark-secret|openai-secret|bailian-secret/);
      assert.match(serialized, /\[REDACTED\]/);
    },
  );
});

test('account deletion preserves auth on business failure and returns the original envelope', async () => {
  const auth = fakeAuth();
  const backend = fakeBackend(async (body) => body.action === 'accountDeletionCapability'
    ? { status: 200, data: { code: 0, deletionContractVersion: 2 } }
    : { status: 200, data: { code: 503, ok: false, error: 'cleanup failed' } });
  await withApp({ auth, backend }, async ({ baseUrl }) => {
    const response = await fetch(`${baseUrl}/api/account/delete`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-test-session': 'account-1|owner@example.com' },
      body: JSON.stringify({ email: 'owner@example.com', password: 'secret' }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { code: 503, ok: false, error: 'cleanup failed' });
    assert.deepEqual(auth.events, ['password']);
  });
});

test('account deletion preserves auth when cleanup success fields are missing', async () => {
  const auth = fakeAuth();
  const backend = fakeBackend(async (body) => body.action === 'accountDeletionCapability'
    ? { status: 200, data: { code: 0, deletionContractVersion: 2 } }
    : { status: 200, data: { code: 0 } });
  await withApp({ auth, backend }, async ({ baseUrl }) => {
    const response = await fetch(`${baseUrl}/api/account/delete`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-test-session': 'account-1|owner@example.com' },
      body: JSON.stringify({ email: 'owner@example.com', password: 'secret' }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { code: 0 });
    assert.deepEqual(auth.events, ['password']);
  });
});

test('account deletion refuses a legacy cleanup response that cannot prove complete object deletion', async () => {
  const auth = fakeAuth();
  const backend = fakeBackend(async () => ({ status: 200, data: { code: 0, ok: true } }));
  await withApp({ auth, backend }, async ({ baseUrl }) => {
    const response = await fetch(`${baseUrl}/api/account/delete`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-test-session': 'account-1|owner@example.com' },
      body: JSON.stringify({ email: 'owner@example.com', password: 'secret' }),
    });
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { code: 503, error: 'ACCOUNT_DELETION_CONTRACT_UNAVAILABLE' });
    assert.deepEqual(auth.events, ['password']);
  });
});

test('maintenance blocks account deletion before password or backend calls', async () => {
  const auth = fakeAuth();
  const backend = fakeBackend();
  await withApp({ auth, backend, isMaintenance: () => true }, async ({ baseUrl }) => {
    const response = await fetch(`${baseUrl}/api/account/delete`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-test-session': 'account-1|owner@example.com' },
      body: JSON.stringify({ email: 'owner@example.com', password: 'secret' }),
    });
    assert.equal(response.status, 503);
    assert.deepEqual(auth.events, []);
    assert.deepEqual(backend.calls, []);
  });
});

test('returns a stable 1 MiB JSON body error envelope', async () => {
  await withApp({}, async ({ baseUrl, backend }) => {
    const response = await fetch(`${baseUrl}/paperbanana-api`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'createJob', padding: 'x'.repeat(1024 * 1024) }),
    });
    assert.equal(response.status, 413);
    assert.deepEqual(await response.json(), { code: 413, error: 'Request body too large' });
    assert.equal(backend.calls.length, 0);
  });
});
