import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';

import { startGateway } from '../src/bootstrap.js';

function env(overrides = {}) {
  return {
    NODE_ENV: 'production',
    PORT: '3005',
    AUTH_BASE_URL: 'https://api.paperbanana.asia',
    BETTER_AUTH_SECRET: 'better-auth-secret-with-at-least-32-bytes',
    MONGODB_URI: 'mongodb://mongo:27017/paperbanana_auth',
    PAPERBANANA_API_URL: 'http://paperbanana-api:3006/paperbanana-api',
    PAPERBANANA_GATEWAY_TOKEN: 'gateway-token',
    PAPERBANANA_GUEST_COOKIE_SECRET: 'guest-cookie-secret-with-at-least-32-bytes',
    ...overrides,
  };
}

test('validates all environment before opening the auth database', async () => {
  let authStarts = 0;
  await assert.rejects(
    () =>
      startGateway({
        env: env({ PAPERBANANA_GATEWAY_TOKEN: '' }),
        createAuthRuntimeImpl: async () => { authStarts += 1; },
      }),
    /PAPERBANANA_GATEWAY_TOKEN is required/,
  );
  assert.equal(authStarts, 0);
});

test('closes HTTP acceptance before the auth database on termination', async () => {
  const events = [];
  const signals = new EventEmitter();
  const server = {
    close(callback) { events.push('server.close'); callback(); },
  };
  const auth = { async close() { events.push('auth.close'); } };
  const runtime = await startGateway({
    env: env(),
    signals,
    createAuthRuntimeImpl: async () => auth,
    createBackendClientImpl: () => ({}),
    createMaintenanceCheckImpl: () => () => false,
    createAppImpl: () => 'app',
    listenImpl: async (app, port, host) => {
      assert.equal(app, 'app');
      assert.equal(port, 3005);
      assert.equal(host, '0.0.0.0');
      return server;
    },
    logger: { info() {}, error() {} },
  });

  signals.emit('SIGTERM');
  await runtime.stopped;
  assert.deepEqual(events, ['server.close', 'auth.close']);
});

test('closes the auth database if listening fails', async () => {
  let closed = 0;
  await assert.rejects(
    () =>
      startGateway({
        env: env(),
        createAuthRuntimeImpl: async () => ({ async close() { closed += 1; } }),
        createBackendClientImpl: () => ({}),
        createMaintenanceCheckImpl: () => () => false,
        createAppImpl: () => 'app',
        listenImpl: async () => { throw new Error('EADDRINUSE'); },
        logger: { info() {}, error() {} },
      }),
    /EADDRINUSE/,
  );
  assert.equal(closed, 1);
});

test('settles the stopped lifecycle even when database close reports an error', async () => {
  const runtime = await startGateway({
    env: env(),
    signals: new EventEmitter(),
    createAuthRuntimeImpl: async () => ({ async close() { throw new Error('mongo close failed'); } }),
    createBackendClientImpl: () => ({}),
    createMaintenanceCheckImpl: () => () => false,
    createAppImpl: () => 'app',
    listenImpl: async () => ({ close(callback) { callback(); } }),
    logger: { info() {}, error() {} },
  });

  await assert.rejects(() => runtime.stop(), /mongo close failed/);
  const settled = await Promise.race([
    runtime.stopped.then(() => true),
    new Promise((resolve) => setTimeout(() => resolve(false), 20)),
  ]);
  assert.equal(settled, true);
});
