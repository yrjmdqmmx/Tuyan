// A loopback-only fixture. No provider request or real mail delivery is possible.
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { MongoClient } from 'mongodb';
import { createApp } from '../../src/app.js';
import { createAccountDeletionService } from '../../src/account-deletion.js';
import { createAuthRuntime } from '../../src/auth.js';
import { createBoundedAuthHandler } from '../../src/auth-http.js';
import express from 'express';

export async function createWatchaFixture({ uri, webOrigin, mailMax = 100, now, databaseBarrier } = {}) {
  if (!/^mongodb:\/\/127\.0\.0\.1:\d+\//.test(uri || '')) throw new Error('Disposable loopback Mongo required');
  if (webOrigin && !/^http:\/\/127\.0\.0\.1:\d+$/.test(webOrigin)) throw new Error('Loopback Web origin required');
  const client = new MongoClient(uri); await client.connect();
  const dbName = `watcha_fixture_${randomUUID().replaceAll('-', '')}`;
  const db = client.db(dbName); const mail = []; const calls = [];
  const app = express(); const server = createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const frontend = webOrigin || origin;
  const config = { mongoUri: uri, mongoDbName: dbName, authSecret: 'local-watcha-fixture-secret-not-production', authBaseUrl: origin,
    frontendOrigins: [origin, frontend], production: false,
    watcha: { enabled: true, clientId: 'fixture-id', clientSecret: 'fixture-secret', scopes: 'read email' },
    authEmail: { deliveryEnabled: true, requireVerification: true, windowMax: mailMax, dailyMax: mailMax,
      directMail: { accountName: 'fixture@example.test', fromAlias: 'Fixture' } } };
  class FixtureMongoClient extends MongoClient {
    db(name) {
      const database = super.db(name);
      if (!databaseBarrier) return database;
      const collection = database.collection.bind(database);
      database.collection = (collectionName, ...args) => {
        const target = collection(collectionName, ...args);
        return new Proxy(target, { get(object, key) {
          const value = object[key];
          if (typeof value !== 'function') return value;
          if (!['updateOne', 'insertOne'].includes(key)) return value.bind(object);
          return async (...methodArgs) => {
            await databaseBarrier({ collection: collectionName, method: key, args: methodArgs });
            return value.apply(object, methodArgs);
          };
        } });
      };
      return database;
    }
  }
  const runtime = await createAuthRuntime(config, { MongoClientClass: FixtureMongoClient, logger: { info() {}, warn() {} }, ...(now ? { watchaNow: now } : {}),
    directMailClientFactory: () => ({ async singleSendMail(message) { mail.push(message); return { body: { requestId: 'fixture' } }; } }),
    watchaFetch: async (url, options) => {
      calls.push({ url, method: options.method });
      if (url === 'https://watcha.cn/oauth/api/token') {
        const params = new URLSearchParams(options.body);
        if (params.get('client_secret') !== 'fixture-secret') throw new Error('Unexpected fixture secret');
        if (params.get('code') === 'provider-error') return Response.json({ error: 'fixture-sensitive-provider-detail' }, { status: 400 });
        return Response.json({ access_token: `fixture:${params.get('code')}`, token_type: 'Bearer', expires_in: 1800, scope: 'read' });
      }
      if (url !== 'https://watcha.cn/oauth/api/userinfo') throw new Error('Unexpected external target');
      const id = Number(options.headers.authorization.replace('Bearer fixture:', ''));
      return Response.json({ statusCode: 200, data: { user_id: id, nickname: `观猹测试 ${id}` } });
    } });
  app.use((req, res, next) => {
    if (req.headers.host !== new URL(origin).host) return res.sendStatus(403);
    if (req.headers.origin && ![origin, frontend].includes(req.headers.origin)) return res.sendStatus(403);
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || frontend);
    res.setHeader('Access-Control-Allow-Credentials', 'true'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });
  app.get('/fixture/authorize', (req, res) => {
    const params = new URLSearchParams({ state: String(req.query.state), code: String(req.query.identity || '9001') });
    res.redirect(`${origin}/api/auth/oauth2/callback/watcha?${params}`);
  });
  app.get('/fixture/mail', (_req, res) => res.json(mail.map((row) => ({ to: row.toAddress, text: row.textBody }))));
  app.all('/api/auth/*', createBoundedAuthHandler(async (request) => {
    const response = await runtime.webHandler(request);
    return response;
  }));
  const backend = { cachedStatus: () => ({ ok: true }), ready: async () => ({ ok: true }),
    async call(body) { return { status: 200, data: { code: 0, ok: true, state: 'active', deletionContractVersion: 3,
      operationId: body.operationId, phase: body.action === 'completeAccountDeletion' ? 'completed' : 'awaiting_auth' } }; } };
  const accountDeletion = createAccountDeletionService({ auth: runtime, backend, store: runtime.deletionStore, logger: { warn() {} } });
  app.use(createApp({ config: { ...config, trustProxy: 1, backend: { mode: 'node' }, adminUserIds: new Set(), maintenance: { retryAfterSeconds: 30 }, oss: {},
    guestCookie: { name: 'fixture_guest', secret: 'local-fixture-guest-cookie-secret-long', ttlSeconds: 86400, secure: false } },
    auth: runtime, backend, accountDeletion, isMaintenance: () => false, logger: { info() {}, warn() {}, error() {} } }));
  return { origin, runtime, db, mail, calls, config,
    async close() { await new Promise((resolve) => server.close(resolve)); await runtime.close(); await db.dropDatabase(); await client.close(); } };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const fixture = await createWatchaFixture({ uri: process.env.WATCHA_TEST_MONGO_URI, webOrigin: process.env.WATCHA_FIXTURE_WEB_ORIGIN });
  console.log(JSON.stringify({ gatewayOrigin: fixture.origin, mailUrl: `${fixture.origin}/fixture/mail`, fixtureOnly: true }));
  const close = async () => { await fixture.close(); process.exit(0); };
  process.once('SIGTERM', close); process.once('SIGINT', close);
}
