import assert from 'node:assert/strict';
import test from 'node:test';
import { ObjectId } from 'mongodb';

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
      async findOne(query, options) { operations.push(['user.findOne', query, options]); return null; },
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
    startSession() {
      let active = false;
      return {
        startTransaction() { active = true; events.push('transaction:start'); },
        async abortTransaction() { active = false; events.push('transaction:abort'); },
        inTransaction() { return active; },
        async endSession() { events.push('transaction:end'); },
      };
    }
    async close() { events.push('close'); }
  }
  let betterConfig;
  const fakeAuth = {
    handler: async () => Response.json({ ok: true }),
    api: {
      async getSession() { return { user: { id: 'u1' } }; },
      async verifyPassword() { return { status: true }; },
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
  assert.equal(betterConfig.emailAndPassword.minPasswordLength, 8);
  assert.equal(betterConfig.emailAndPassword.maxPasswordLength, 128);
  assert.equal(betterConfig.emailAndPassword.resetPasswordTokenExpiresIn, 3600);
  assert.equal(betterConfig.emailAndPassword.revokeSessionsOnPasswordReset, true);
  assert.equal(betterConfig.emailAndPassword.autoSignIn, false);
  assert.equal(betterConfig.emailVerification.expiresIn, 3600);
  assert.equal(betterConfig.emailVerification.sendOnSignUp, true);
  assert.equal(betterConfig.emailVerification.sendOnSignIn, true);
  assert.deepEqual(betterConfig.logger, { disabled: true });
  assert.equal(betterConfig.rateLimit.storage, 'database');
  assert.deepEqual(betterConfig.rateLimit.customRules['/sign-in/email'], { window: 900, max: 10 });
  assert.equal(typeof runtime.webHandler, 'function');
  assert.deepEqual(runtime.cachedStatus(), { ok: true, checkedAt: null });
  assert.deepEqual(await runtime.ready(), { ok: true });
  assert.deepEqual(db.commands, [{ ping: 1 }]);
  assert.deepEqual(events.slice(-3), ['transaction:start', 'transaction:abort', 'transaction:end']);
  assert.ok(runtime.cachedStatus().checkedAt);
  await runtime.close();
  assert.equal(events.at(-1), 'close');
});

test('sign-up hides account existence and never forwards a session cookie', async () => {
  const db = fakeDatabase();
  class FakeMongoClient {
    async connect() {}
    db() { return db; }
    async close() {}
  }
  let responseMode = 'created';
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
        async handler() {
          if (responseMode === 'invalid') {
            return Response.json({ code: 'PASSWORD_TOO_SHORT' }, { status: 400 });
          }
          if (responseMode === 'duplicate') {
            return Response.json(
              { code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL', message: 'User already exists' },
              { status: 422 },
            );
          }
          return Response.json(
            { token: 'must-not-leak', user: { id: 'u1', email: 'owner@example.com' } },
            { headers: { 'set-cookie': 'paperbanana.session=must-not-forward' } },
          );
        },
        api: {},
      }),
    },
  );

  const request = new Request('https://api.paperbanana.asia/api/auth/sign-up/email', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'owner@example.com', password: 'valid-password' }),
  });
  const created = await runtime.webHandler(request.clone());
  assert.equal(created.status, 200);
  assert.deepEqual(await created.json(), { status: true, emailVerificationRequired: true });
  assert.equal(created.headers.get('set-cookie'), null);

  responseMode = 'duplicate';
  const duplicate = await runtime.webHandler(request.clone());
  assert.equal(duplicate.status, 200);
  assert.deepEqual(await duplicate.json(), { status: true, emailVerificationRequired: true });

  responseMode = 'invalid';
  const invalid = await runtime.webHandler(request.clone());
  assert.equal(invalid.status, 400);
  assert.deepEqual(await invalid.json(), { code: 'PASSWORD_TOO_SHORT' });
});

test('readiness fails closed when MongoDB does not support auth deletion transactions', async () => {
  const db = fakeDatabase();
  db.collection = () => ({
    async findOne() {
      throw new Error('Transaction numbers are only allowed on a replica set member or mongos');
    },
  });
  class StandaloneMongoClient {
    async connect() {}
    db() { return db; }
    startSession() {
      let active = false;
      return {
        startTransaction() { active = true; },
        async abortTransaction() { active = false; },
        inTransaction() { return active; },
        async endSession() {},
      };
    }
    async close() {}
  }
  const runtime = await createAuthRuntime(
    {
      mongoUri: 'mongodb://standalone:27017',
      mongoDbName: 'paperbanana_auth',
      authSecret: 'auth-secret',
      authBaseUrl: 'https://api.paperbanana.asia/',
      frontendOrigins: [],
      production: true,
      cookieDomain: '',
      cookieSameSite: 'lax',
    },
    {
      MongoClientClass: StandaloneMongoClient,
      adapterFactory: () => ({}),
      betterAuthFactory: () => ({ handler: async () => Response.json({ ok: true }), api: {} }),
    },
  );

  assert.deepEqual(await runtime.ready(), {
    ok: false,
    error: 'mongodb unavailable',
  });
  assert.equal(runtime.cachedStatus().ok, false);
});

test('verifyPassword uses the current session endpoint and never creates a new session', async () => {
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
        handler: async () => Response.json({ ok: true }),
        api: {
          async getSession() { return null; },
          async signInEmail() { throw new Error('must not create a session'); },
          async verifyPassword(input) { authApiCalls.push(['verifyPassword', input]); return { status: true }; },
          async signOut(input) {
            authApiCalls.push(['signOut', input]);
            return { headers: { getSetCookie: () => ['paperbanana.session=; Max-Age=0'] } };
          },
        },
      }),
      fromNodeHeadersImpl: (headers) => ({ converted: headers }),
    },
  );

  assert.equal(
    await runtime.verifyPassword({ password: 'secret', headers: { cookie: 'session=x' } }),
    true,
  );
  const appended = [];
  await runtime.clearSessionCookie(
    { headers: { cookie: 'x' } },
    { append(name, value) { appended.push([name, value]); } },
  );
  assert.equal(authApiCalls[0][0], 'verifyPassword');
  assert.deepEqual(authApiCalls[0][1], {
    body: { password: 'secret' },
    headers: { converted: { cookie: 'session=x' } },
  });
  assert.deepEqual(appended, [['Set-Cookie', 'paperbanana.session=; Max-Age=0']]);
});

test('verifyPassword maps only Better Auth INVALID_PASSWORD and propagates internal failures', async () => {
  const db = fakeDatabase();
  class FakeMongoClient {
    async connect() {}
    db() { return db; }
    async close() {}
  }
  let failure = Object.assign(new Error('Invalid password'), {
    statusCode: 400,
    body: { code: 'INVALID_PASSWORD', message: 'Invalid password' },
  });
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
        handler: async () => Response.json({ ok: true }),
        api: {
          async getSession() { return null; },
          async verifyPassword() { throw failure; },
          async signOut() { return { headers: { getSetCookie: () => [] } }; },
        },
      }),
      fromNodeHeadersImpl: (headers) => headers,
    },
  );

  assert.equal(await runtime.verifyPassword({ password: 'wrong', headers: {} }), false);
  failure = new Error('Mongo connection failed');
  await assert.rejects(
    () => runtime.verifyPassword({ password: 'secret', headers: {} }),
    /Mongo connection failed/,
  );
});

function transactionalFixture(failAt = '') {
  const id = new ObjectId('507f1f77bcf86cd799439011');
  const state = {
    session: [{ userId: id }, { userId: String(id) }],
    account: [{ userId: id }, { userId: String(id) }],
    user: [{ _id: id, id: String(id) }],
  };
  const operations = [];
  let ended = 0;
  const mongoSession = {
    async withTransaction(work) {
      const snapshot = Object.fromEntries(Object.entries(state).map(([name, rows]) => [name, [...rows]]));
      try {
        await work();
      } catch (error) {
        for (const [name, rows] of Object.entries(snapshot)) state[name] = rows;
        throw error;
      }
    },
    async endSession() { ended += 1; },
  };
  const db = {
    async command() { return { ok: 1 }; },
    collection(name) {
      return {
        async deleteMany(query, options) {
          operations.push({ name, query, options });
          assert.equal(options.session, mongoSession);
          if (failAt === name) throw new Error(`injected ${name} failure`);
          state[name] = [];
        },
        async deleteOne(query, options) {
          operations.push({ name, query, options });
          assert.equal(options.session, mongoSession);
          if (failAt === name) throw new Error(`injected ${name} failure`);
          if (failAt === 'user-missing') return { deletedCount: 0 };
          state[name] = [];
          return { deletedCount: 1 };
        },
        find() {
          return { sort() { return this; }, limit() { return this; }, async toArray() { return []; } };
        },
        aggregate() { return { async toArray() { return []; } }; },
      };
    },
  };
  class FakeMongoClient {
    async connect() {}
    db() { return db; }
    startSession() { return mongoSession; }
    async close() {}
  }
  return { id, state, operations, FakeMongoClient, ended: () => ended };
}

async function runtimeForTransaction(fixture) {
  return createAuthRuntime(
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
      MongoClientClass: fixture.FakeMongoClient,
      adapterFactory: () => ({}),
      betterAuthFactory: () => ({
        handler: async () => Response.json({ ok: true }),
        api: {
          async getSession() { return null; },
          async verifyPassword() { return { status: true }; },
          async signOut() { return { headers: { getSetCookie: () => [] } }; },
        },
      }),
      fromNodeHeadersImpl: (headers) => headers,
    },
  );
}

test('hard deletion commits session, account, and user removal in one Mongo transaction', async () => {
  const fixture = transactionalFixture();
  const runtime = await runtimeForTransaction(fixture);

  await runtime.deleteUser(String(fixture.id));

  assert.deepEqual(Object.fromEntries(Object.entries(fixture.state).map(([name, rows]) => [name, rows.length])), {
    session: 0,
    account: 0,
    user: 0,
  });
  assert.equal(fixture.ended(), 1);
  assert.deepEqual(fixture.operations.map(({ name }) => name), ['session', 'account', 'user']);
  const candidates = fixture.operations[0].query.userId.$in;
  assert.ok(candidates.some((value) => typeof value === 'string'));
  assert.ok(candidates.some((value) => value instanceof ObjectId));
});

test('hard deletion rolls back without partial auth loss on every injected delete failure', async () => {
  for (const failAt of ['session', 'account', 'user', 'user-missing']) {
    const fixture = transactionalFixture(failAt);
    const runtime = await runtimeForTransaction(fixture);

    await assert.rejects(
      () => runtime.deleteUser(String(fixture.id)),
      failAt === 'user-missing' ? /Auth user deletion did not match/ : new RegExp(`injected ${failAt} failure`),
    );
    assert.deepEqual(
      Object.fromEntries(Object.entries(fixture.state).map(([name, rows]) => [name, rows.length])),
      { session: 2, account: 2, user: 1 },
      failAt,
    );
    assert.equal(fixture.ended(), 1);
  }
});

test('hard deletion rejects an empty current-session user id', async () => {
  const fixture = transactionalFixture();
  const runtime = await runtimeForTransaction(fixture);
  await assert.rejects(() => runtime.deleteUser(''), /Auth user id is required/);
  assert.deepEqual(
    Object.fromEntries(Object.entries(fixture.state).map(([name, rows]) => [name, rows.length])),
    { session: 2, account: 2, user: 1 },
  );
});
