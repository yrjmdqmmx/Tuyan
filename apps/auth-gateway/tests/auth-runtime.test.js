import assert from 'node:assert/strict';
import test from 'node:test';

import { createAuthRuntime } from '../src/auth.js';

function fakeDatabase() {
  const commands = [];
  const operations = [];
  const collections = {
    session: {
      async deleteMany(query) { operations.push(['session.deleteMany', query]); },
      aggregate() { return { async toArray() { return []; } }; },
    },
    account: {
      async deleteMany(query) { operations.push(['account.deleteMany', query]); },
    },
    user: {
      async deleteOne(query) { operations.push(['user.deleteOne', query]); },
      find() {
        return {
          sort() { return this; },
          limit() { return this; },
          async toArray() { return []; },
        };
      },
    },
  };
  return {
    commands,
    operations,
    async command(command) { commands.push(command); return { ok: 1 }; },
    collection(name) { return collections[name]; },
  };
}

test('auth runtime connects only when constructed and exposes readiness and graceful close', async () => {
  const db = fakeDatabase();
  const events = [];
  class FakeMongoClient {
    constructor(uri) { events.push(`construct:${uri}`); }
    async connect() { events.push('connect'); }
    db(name) { events.push(`db:${name}`); return db; }
    async close() { events.push('close'); }
  }
  let betterConfig;
  const fakeAuth = {
    api: {
      async getSession() { return { user: { id: 'u1' } }; },
      async signInEmail() { return { user: { id: 'u1' } }; },
      async signOut() {
        return { headers: { getSetCookie: () => ['session=; Max-Age=0'] } };
      },
    },
  };

  assert.deepEqual(events, []);
  const runtime = await createAuthRuntime(
    {
      mongoUri: 'mongodb://mongo:27017',
      mongoDbName: 'paperbanana_auth',
      authSecret: 'auth-secret',
      authBaseUrl: 'https://api.paperbanana.asia/',
      frontendOrigins: ['https://paperbanana.asia'],
      production: true,
      cookieDomain: '',
      cookieSameSite: 'lax',
    },
    {
      MongoClientClass: FakeMongoClient,
      adapterFactory: (value) => ({ adapterDb: value }),
      betterAuthFactory(config) { betterConfig = config; return fakeAuth; },
      handlerFactory: () => 'auth-handler',
      fromNodeHeadersImpl: (headers) => headers,
    },
  );

  assert.deepEqual(events, [
    'construct:mongodb://mongo:27017',
    'connect',
    'db:paperbanana_auth',
  ]);
  assert.equal(betterConfig.database.adapterDb, db);
  assert.equal(betterConfig.advanced.useSecureCookies, true);
  assert.equal(runtime.handler, 'auth-handler');
  assert.deepEqual(runtime.cachedStatus(), { ok: true, checkedAt: null });
  assert.deepEqual(await runtime.ready(), { ok: true });
  assert.deepEqual(db.commands, [{ ping: 1 }]);
  assert.ok(runtime.cachedStatus().checkedAt);
  await runtime.close();
  assert.equal(events.at(-1), 'close');
});

test('verifyPassword, cookie clearing, and hard deletion use the configured auth store', async () => {
  const db = fakeDatabase();
  class FakeMongoClient {
    async connect() {}
    db() { return db; }
    async close() {}
  }
  const authApiCalls = [];
  const runtime = await createAuthRuntime(
    {
      mongoUri: 'mongodb://mongo:27017',
      mongoDbName: 'paperbanana_auth',
      authSecret: 'auth-secret',
      authBaseUrl: 'https://api.paperbanana.asia/',
      frontendOrigins: [],
      production: true,
      cookieDomain: '',
      cookieSameSite: 'lax',
    },
    {
      MongoClientClass: FakeMongoClient,
      adapterFactory: () => ({}),
      betterAuthFactory: () => ({
        api: {
          async getSession() { return null; },
          async signInEmail(input) { authApiCalls.push(['signInEmail', input]); return {}; },
          async signOut(input) {
            authApiCalls.push(['signOut', input]);
            return { headers: { getSetCookie: () => ['paperbanana.session=; Max-Age=0'] } };
          },
        },
      }),
      handlerFactory: () => () => {},
      fromNodeHeadersImpl: (headers) => ({ converted: headers }),
    },
  );

  assert.equal(
    await runtime.verifyPassword({ email: 'owner@example.com', password: 'secret', headers: { cookie: 'x' } }),
    true,
  );
  const appended = [];
  await runtime.clearSessionCookie(
    { headers: { cookie: 'x' } },
    { append(name, value) { appended.push([name, value]); } },
  );
  await runtime.deleteUser('507f1f77bcf86cd799439011');

  assert.equal(authApiCalls[0][0], 'signInEmail');
  assert.deepEqual(appended, [['Set-Cookie', 'paperbanana.session=; Max-Age=0']]);
  assert.deepEqual(db.operations.map(([name]) => name), [
    'session.deleteMany',
    'account.deleteMany',
    'user.deleteOne',
  ]);
});
