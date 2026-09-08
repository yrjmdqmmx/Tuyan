import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { MongoClient } from 'mongodb';
import { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT } from 'jose';
import { createAuthRuntime } from '../../src/auth.js';
import { createApp } from '../../src/app.js';
import { createAccountVerification } from '../../src/account-verification.js';
import { createAccountDeletionService } from '../../src/account-deletion.js';
import { exchangeOAuthIdentity, oauthAuthorizationUrl, pkceChallenge } from '../../src/identity-providers.js';
import fs from 'node:fs';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';

const listen = (server) => new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`)));
const close = (server) => new Promise((resolve) => { server.closeAllConnections?.(); server.close(resolve); });
export async function startIdentityFixture(uri, webBase = 'http://127.0.0.1:5196') {
  if (!/^mongodb:\/\/127\.0\.0\.1:\d+\//.test(uri)) throw new Error('Disposable loopback Mongo URI required');
  const client = new MongoClient(uri); await client.connect();
  const db = client.db(`identity_test_${randomUUID().replaceAll('-', '')}`), mails = [], codes = new Map(), accesses = new Map();
  const key = await generateKeyPair('RS256'), jwk = await exportJWK(key.publicKey); jwk.kid = 'local-fixture';
  const keys = createLocalJWKSet({ keys: [jwk] });
  let app, runtime, providerBase;
  const profiles = { github: { subject: '100001', name: '科研用户 GitHub', email: 'github@example.test', emailVerified: true }, google: { subject: 'google-100001', name: '科研用户 Google', email: 'google@example.test', emailVerified: true } };
  const failures = { token: false, email: false, nonce: false, issuer: false };
  const provider = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, providerBase);
      if (url.pathname === '/authorize') {
        const accept = new URL('/approve', providerBase); accept.search = url.search;
        const cancel = new URL(url.searchParams.get('redirect_uri')); cancel.searchParams.set('state', url.searchParams.get('state')); cancel.searchParams.set('error', 'access_denied');
        res.setHeader('content-type', 'text/html; charset=utf-8');
        res.end(`<!doctype html><html lang="zh-CN"><meta name="viewport" content="width=device-width,initial-scale=1"><title>本地授权验收</title><body><h1>本地第三方授权测试</h1><p>此页面仅用于本机验收。</p><a href="${accept.toString().replaceAll('&', '&amp;')}">同意授权</a><br><a href="${cancel.toString().replaceAll('&', '&amp;')}">取消授权</a></body></html>`); return;
      }
      if (url.pathname === '/approve') {
        const code = randomUUID(), providerName = url.searchParams.get('fixture_provider');
        codes.set(code, { profile: { ...profiles[providerName] }, provider: providerName, challenge: url.searchParams.get('code_challenge'), nonce: url.searchParams.get('nonce'), redirectUri: url.searchParams.get('redirect_uri') });
        const target = new URL(url.searchParams.get('redirect_uri')); target.searchParams.set('state', url.searchParams.get('state')); target.searchParams.set('code', code);
        res.writeHead(302, { location: target.toString() }); res.end(); return;
      }
      res.setHeader('content-type', 'application/json');
      if (url.pathname === '/token') {
        let raw = ''; for await (const part of req) raw += part; const form = new URLSearchParams(raw);
        const code = form.get('code'), value = codes.get(code); codes.delete(code);
        if (failures.token || !value || pkceChallenge(form.get('code_verifier')) !== value.challenge || value.redirectUri !== form.get('redirect_uri')) { res.statusCode = 400; res.end(JSON.stringify({ error: 'invalid_grant' })); return; }
        const access = randomUUID(); accesses.set(access, value.profile);
        const idToken = await new SignJWT({ sub: value.profile.subject, email: value.profile.email, email_verified: value.profile.emailVerified, name: value.profile.name,
          nonce: failures.nonce ? 'wrong-nonce' : value.nonce }).setProtectedHeader({ alg: 'RS256', kid: jwk.kid }).setIssuedAt().setExpirationTime('5m')
          .setIssuer(failures.issuer ? 'https://wrong.example' : 'https://accounts.google.com').setAudience('fixture-google').sign(key.privateKey);
        res.end(JSON.stringify({ access_token: access, token_type: 'Bearer', id_token: idToken })); return;
      }
      const profile = accesses.get(String(req.headers.authorization || '').replace('Bearer ', ''));
      if (!profile) { res.statusCode = 401; res.end('{}'); return; }
      res.end(JSON.stringify(url.pathname === '/emails' ? [{ email: profile.email, verified: profile.emailVerified, primary: true }] : { id: Number(profile.subject), name: profile.name, login: 'fixture-user' }));
    } catch { res.statusCode = 500; res.end('{}'); }
  });
  providerBase = await listen(provider);
  const server = http.createServer((req, res) => app(req, res)), apiBase = await listen(server);
  const logger = { info() {}, warn() {}, error() {} };
  const config = { mongoUri: uri, mongoDbName: db.databaseName, authBaseUrl: apiBase, authSecret: 'local-identity-fixture-only-at-least-32-bytes',
    production: false, frontendOrigins: [webBase, apiBase, 'https://www.paperbanana.asia'], cookieSameSite: 'lax', trustProxy: false, adminUserIds: new Set(),
    authEmail: { deliveryEnabled: false, requireVerification: true, verificationCallbackUrl: webBase + '/account/email-verified.html' },
    identity: { oauth: { github: { clientId: 'fixture-github', clientSecret: 'local-only' }, google: { clientId: 'fixture-google', clientSecret: 'local-only' } }, returnUrl: webBase + '/' },
    guestCookie: { name: 'identity_fixture_guest', secret: 'local-fixture-guest-secret-32-bytes-long', ttlSeconds: 86400, secure: false },
    backend: { mode: 'node' }, maintenance: { retryAfterSeconds: 30 }, oss: {},
  };
  const cleanup = async () => { await close(server); await close(provider); await runtime?.close(); await db.dropDatabase(); await client.close(); };
  try {
    runtime = await createAuthRuntime(config, { logger, identityProviders: {
      async sendBindingEmail(message) { if (failures.email) throw new Error('local simulated mail failure'); mails.push(message); },
      authorizationUrl(name, credentials, flow) { const url = new URL(oauthAuthorizationUrl(name, credentials, flow)); const local = new URL('/authorize', providerBase); local.search = url.search; local.searchParams.set('fixture_provider', name); return local.toString(); },
      exchangeIdentity(name, credentials, flow, code) { return exchangeOAuthIdentity(name, credentials, flow, code, { googleKeySet: keys, fetchImpl(url, opts) {
        const original = String(url), target = original.includes('access_token') || original.includes('googleapis.com/token') ? '/token' : original.endsWith('/emails') ? '/emails' : '/user';
        return fetch(providerBase + target, opts);
      } }); },
    } });
    // Same business deletion functions as the deployed Core, backed by disposable Mongo.
    const source = fs.readFileSync(new URL('../../../laf-functions/paperbanana-api.ts', import.meta.url), 'utf8');
    const names = ['accountIdQuery', 'accountDeletionStatus', 'deleteAccount', 'listAccountObjectKeys', 'completeAccountDeletion', 'storedObjectKeysForJob'];
    const extracts = names.map((name) => { const start = source.search(new RegExp(`^(?:export )?(?:async )?function ${name}\\(`, 'm')); const remaining = source.slice(start); const end = remaining.slice(1).search(/\n(?:export )?(?:async )?function |\n(?:export )?(?:const|let|type) /); return remaining.slice(0, end < 0 ? undefined : end + 1).replace(/^export /, ''); });
    const context = vm.createContext({ Date, console, accountDeletions: db.collection('paperbanana_account_deletions'), jobs: db.collection('paperbanana_jobs'), feedback: db.collection('feedback'), referenceUploadState: db.collection('paperbanana_reference_upload_state'),
      jobAdmission: { freezeOwners() {} }, bucketName: 'local-fixture', randomId: randomUUID, referenceUploadStateRetentionMs: 86400000, deleteAdditionalAccountData: async () => {},
      ok: (data) => ({ code: 0, ...data }), fail: (error, code) => ({ code, error }), cloud: { storage: { bucket: () => ({ listFiles: async () => ({ Contents: [], IsTruncated: false }), deleteFile: async () => {} }) } } });
    vm.runInContext(stripTypeScriptTypes(extracts.join('\n')), context);
    const backend = { cachedStatus: () => ({ ok: true }), ready: async () => ({ ok: true }), async call(body) {
      if (names.includes(body.action)) return { status: 200, data: await context[body.action](body) };
      if (body.action === 'accountDeletionCapability') return { status: 200, data: { code: 0, deletionContractVersion: 3 } };
      return { status: 200, data: { code: 0, ok: true, jobs: [], templates: [], references: [], providers: {}, registryVersion: 'fixture', models: [] } };
    } };
    const deletion = createAccountDeletionService({ auth: runtime, backend, store: runtime.deletionStore, logger });
    app = createApp({ config, auth: runtime, backend, accountDeletion: deletion, isMaintenance: () => false, logger });
    const verifier = createAccountVerification({ db, mongoClient: client, callbackUrl: webBase + '/account/email-verified.html', frontendOrigins: [webBase, apiBase] });
    return { apiBase, providerBase, webBase, db, runtime, config, profiles, failures, mails, verifier, cleanup };
  } catch (e) { await cleanup(); throw e; }
}

export function createFixtureClient(fixture) {
  const cookies = new Map();
  return { cookies, async request(path, body, options = {}) {
    const response = await fetch(path.startsWith('http') ? path : fixture.apiBase + '/api/auth/' + path, {
      method: body === undefined ? 'GET' : 'POST', redirect: 'manual', headers: { origin: fixture.webBase, cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; '), ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...options.headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), ...options,
    });
    for (const cookie of response.headers.getSetCookie()) { const first = cookie.split(';')[0], at = first.indexOf('='); if (/max-age=0/i.test(cookie)) cookies.delete(first.slice(0, at)); else cookies.set(first.slice(0, at), first.slice(at + 1)); }
    return response;
  } };
}
