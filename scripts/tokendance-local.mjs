// Local paid preview: real Better Auth, persistent Mongo/files and real TokenDance.
// Run from apps/paperbanana-api: node --import tsx ../../scripts/tokendance-local.mjs
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { randomBytes, createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { once } from 'node:events';
import { createAuthRuntime } from '../apps/auth-gateway/src/auth.js';
import { createApp as createGateway } from '../apps/auth-gateway/src/app.js';
import { createBackendClient } from '../apps/auth-gateway/src/backend-client.js';
import { createServer as createCore } from '../apps/paperbanana-api/src/server.ts';
import { createTokenDanceService } from '../apps/paperbanana-api/src/tokendance-service.ts';
import { createProviderWorkflow } from '../apps/paperbanana-api/src/provider-workflow.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(new URL('../apps/paperbanana-api/package.json', import.meta.url));
const { MongoClient } = require('mongodb'), { build } = require('esbuild'), sharp = require('sharp'), express = require('express');
const webRequire = createRequire(new URL('../apps/web/package.json', import.meta.url));
const { createServer: createVite } = await import(webRequire.resolve('vite'));
const webBase = 'http://127.0.0.1:5173', apiBase = 'http://127.0.0.1:8791';
const stateDir = path.join(os.homedir(), '.config', 'tuyan-tokendance-local');
await fs.mkdir(stateDir, { recursive: true, mode: 0o700 });
await fs.chmod(stateDir, 0o700);
const secretPath = path.join(stateDir, 'secrets.json');
try {
  await fs.writeFile(secretPath, JSON.stringify(Object.fromEntries(['encryption', 'auth', 'transport', 'guest', 'objects'].map(name => [name, randomBytes(32).toString('base64')]))), { flag: 'wx', mode: 0o600 });
} catch (error) { if (error.code !== 'EEXIST') throw error; }
await fs.chmod(secretPath, 0o600);
const secrets = JSON.parse(await fs.readFile(secretPath, 'utf8'));
for (const value of Object.values(secrets)) if (Buffer.from(value, 'base64').length !== 32) throw new Error('Invalid local secret configuration');
const objectsDir = path.join(stateDir, 'objects');
await fs.mkdir(objectsDir, { recursive: true, mode: 0o700 });

const container = 'tuyan-tokendance-local';
let inspect;
try { inspect = JSON.parse(execFileSync('docker', ['inspect', container], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }))[0]; } catch {}
if (!inspect) {
  execFileSync('docker', ['run', '--detach', '--name', container, '--label', 'tuyan.local=tokendance', '--publish', '127.0.0.1::27017', '--volume', 'tuyan-tokendance-local-mongo:/data/db', 'mongo:8.0.16-noble'], { stdio: ['ignore', 'ignore', 'pipe'] });
} else {
  if (inspect.Config?.Labels?.['tuyan.local'] !== 'tokendance') throw new Error('Local container name belongs to another task');
  if (!inspect.State.Running) execFileSync('docker', ['start', container], { stdio: ['ignore', 'ignore', 'pipe'] });
}
const binding = execFileSync('docker', ['port', container, '27017/tcp'], { encoding: 'utf8' }).trim();
if (!/^127\.0\.0\.1:\d+$/.test(binding)) throw new Error('Local Mongo must listen only on loopback');
const mongoUri = 'mongodb://' + binding + '/?directConnection=true';
const client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 15000 });
await client.connect();
const db = client.db('tuyan_tokendance_local_jobs');
const logger = { info() {}, warn() {}, error() {} };
const token = (method, key, expires) => createHmac('sha256', secrets.objects).update(JSON.stringify([method, key, expires])).digest('base64url');
function objectPath(key) {
  if (typeof key !== 'string' || !key || key.length > 1000 || key.split('/').some(part => !part || part === '.' || part === '..' || !/^[A-Za-z0-9._-]+$/.test(part))) throw new Error('Invalid local object key');
  return path.join(objectsDir, key);
}
function objectUrl(method, key) {
  objectPath(key);
  const expires = String(Date.now() + 3600000);
  return apiBase + '/objects/' + key + '?expires=' + expires + '&signature=' + token(method, key, expires);
}
async function saveObject(key, bytes, metadata = {}) {
  const destination = objectPath(key);
  await fs.mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
  const temporary = destination + '.' + randomUUID() + '.tmp';
  await fs.writeFile(temporary, bytes, { mode: 0o600 });
  await fs.rename(temporary, destination);
  await fs.writeFile(destination + '.metadata.json', JSON.stringify({ mimeType: metadata.ContentType || 'image/png', size: bytes.length }), { mode: 0o600 });
}
const bucket = {
  async getUploadUrl(key, _ttl, metadata) {
    objectPath(key);
    await db.collection('local_uploads').updateOne({ _id: key }, { $set: { metadata, expiresAt: new Date(Date.now() + 900000) } }, { upsert: true });
    return objectUrl('PUT', key);
  },
  async getDownloadUrl(key) { return objectUrl('GET', key); },
  async writeFile(key, bytes, metadata) { await saveObject(key, Buffer.from(bytes), metadata); },
  async readFile(key, maxBytes = 64 * 1024 * 1024) {
    const p = objectPath(key), stat = await fs.stat(p);
    if (stat.size > maxBytes) throw new Error('Local image exceeds byte limit');
    return fs.readFile(p);
  },
  async headFile(key) { return JSON.parse(await fs.readFile(objectPath(key) + '.metadata.json', 'utf8')); },
  async deleteFile(key) { for (const p of [objectPath(key), objectPath(key) + '.metadata.json']) await fs.rm(p, { force: true }); },
  async listFiles(options = {}) {
    const entries = await fs.readdir(objectsDir, { recursive: true, withFileTypes: true });
    const keys = entries.filter(entry => entry.isFile() && !entry.name.endsWith('.metadata.json') && !entry.name.endsWith('.tmp')).map(entry => path.relative(objectsDir, path.join(entry.parentPath, entry.name)).split(path.sep).join('/')).filter(key => key.startsWith(options.Prefix || '') && key > (options.Marker || '')).sort();
    return { Contents: keys.slice(0, 1000).map(Key => ({ Key })), IsTruncated: keys.length > 1000, NextMarker: keys.length > 1000 ? keys[999] : undefined };
  },
};
await db.collection('local_uploads').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
globalThis.__tuyanLocalCloud = { mongo: { db }, storage: { bucket: () => bucket } };
globalThis.__tuyanLocalSharp = sharp;
const bundle = await build({
  entryPoints: [path.join(root, 'apps/paperbanana-api/src/legacy-entry.mjs')],
  bundle: true, format: 'esm', platform: 'node', write: false,
  nodePaths: [path.join(root, 'apps/paperbanana-api/node_modules')],
  plugins: [{ name: 'local-persistent-storage', setup(builder) {
    builder.onResolve({ filter: /^(@lafjs\/cloud|sharp)$/ }, args => ({ path: args.path, namespace: 'local-runtime' }));
    builder.onLoad({ filter: /.*/, namespace: 'local-runtime' }, args => ({ loader: 'js', contents: 'export default globalThis.' + (args.path === 'sharp' ? '__tuyanLocalSharp' : '__tuyanLocalCloud') }));
  } }],
});
const legacy = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const realFetch = async (input, options = {}) => {
  const url = new URL(String(input)), method = options.method || 'GET';
  if (url.origin === 'https://tokendance.space' || url.origin === apiBase && url.pathname.startsWith('/objects/')) return fetch(input, options);
  // Public OpenRouter discovery is read-only. Other paid channels stay out of this local preview.
  if (url.href === 'https://openrouter.ai/api/v1/models' && method === 'GET') return fetch(input, options);
  if (method === 'GET' && !new Headers(options.headers).has('authorization') && url.protocol === 'https:') return fetch(input, options);
  throw new Error('本地消费测试仅启用 TokenDance 渠道。');
};
process.env.PAPERBANANA_GATEWAY_TOKEN = secrets.transport;
legacy.configureRuntimeFetch(realFetch);
legacy.configureJobAdmission({ maxActive: 1, maxPending: 3, maxPerOwner: 3, maxPerIp: 3 });
const td = createTokenDanceService({ db, fetcher: realFetch, secret: secrets.encryption, callbackUrl: webBase + '/' });
const workflow = createProviderWorkflow({ db, service: td });
legacy.configureProviderWorkflow(workflow);
legacy.configureAccountDeletionDataCleanup(async id => { await td.eraseUserData(id); await workflow.remove(id); });
await td.ensureIndexes(); await workflow.ensureIndexes();
const core = createCore({
  handler: legacy.default, readinessProbe: async () => ({ ready: true }), healthSnapshot: () => ({ ready: true }),
  config: { gatewayToken: secrets.transport, serviceName: 'tuyan-local', version: 'tokendance-live' }, logger,
  tokenDance: td, providerWorkflow: workflow, resumeTokenDanceJob: legacy.resumeTokenDanceJob, requiresTokenDanceCredential: legacy.requiresTokenDanceCredential,
});
core.listen(0, '127.0.0.1'); await once(core, 'listening');
const backend = createBackendClient({ mode: 'node', url: 'http://127.0.0.1:' + core.address().port + '/paperbanana-api', gatewayToken: secrets.transport, timeoutMs: 40000 });
const config = {
  production: false, trustProxy: false, frontendOrigins: [webBase, apiBase], adminUserIds: new Set(),
  authBaseUrl: apiBase, authSecret: secrets.auth, mongoUri, mongoDbName: 'tuyan_tokendance_local_auth', cookieSameSite: 'lax',
  authEmail: { deliveryEnabled: false, requireVerification: false, verificationCallbackUrl: webBase + '/account/email-verified.html' },
  guestCookie: { name: 'tuyan_local_guest', secret: secrets.guest, ttlSeconds: 86400, secure: false },
  backend: { mode: 'node' }, maintenance: { retryAfterSeconds: 30 },
  oss: { bucket: 'tuyan-local', publicEndpoint: apiBase, allowLegacyExternalRefineUrl: false },
};
const auth = await createAuthRuntime(config, { logger });
const api = express();
api.disable('x-powered-by');
api.use((req, res, next) => {
  if (req.get('host') !== new URL(apiBase).host || req.get('origin') && !config.frontendOrigins.includes(req.get('origin'))) return res.sendStatus(403);
  next();
});
api.use('/objects', (req, res, next) => {
  res.set('Access-Control-Allow-Origin', webBase); res.set('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS'); res.set('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  const key = req.path.slice(1), expires = String(req.query.expires || ''), supplied = Buffer.from(String(req.query.signature || ''));
  try {
    objectPath(key); const expected = Buffer.from(token(req.method, key, expires));
    if (!/^\d+$/.test(expires) || Number(expires) < Date.now() || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return res.sendStatus(403);
  } catch { return res.sendStatus(403); }
  next();
});
api.put('/objects/*key', express.raw({ type: '*/*', limit: '6mb' }), async (req, res) => {
  const key = req.params.key.join('/');
  const prepared = await db.collection('local_uploads').findOne({ _id: key, expiresAt: { $gt: new Date() } });
  if (!prepared || req.body.length !== prepared.metadata.ContentLength) return res.sendStatus(400);
  await saveObject(key, req.body, prepared.metadata); res.sendStatus(200);
});
api.get('/objects/*key', async (req, res) => {
  try { const key = req.params.key.join('/'), metadata = await bucket.headFile(key); res.set('Cache-Control', 'private, no-store').type(metadata.mimeType).send(await bucket.readFile(key)); }
  catch { res.sendStatus(404); }
});
api.use(createGateway({ config, auth, backend, isMaintenance: () => false, logger }));
const server = http.createServer(api); server.listen(8791, '127.0.0.1'); await once(server, 'listening');
Object.assign(process.env, { VITE_API_BASE: apiBase, VITE_AUTH_BASE: apiBase, VITE_BACKEND_MODE: 'gateway', VITE_AUTH_ENABLED: 'true', VITE_AUTH_REQUIRED: 'true', VITE_ALLOW_CUSTOM_API_BASE: 'true', VITE_LOCAL_CONSUMPTION_TEST: 'true' });
const vite = await createVite({ root: path.join(root, 'apps/web'), server: { host: '127.0.0.1', port: 5173, strictPort: true }, logLevel: 'error' });
await vite.listen();
console.log('TokenDance real-consumption local preview ready: ' + webBase);
console.log('Local account database and encrypted keys persist on this Mac. Model calls occur only after user submission.');
let closing = false;
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => {
  if (closing) return; closing = true;
  legacy.stopJobAdmission(); await legacy.drainJobAdmission(); await vite.close();
  server.closeAllConnections(); core.closeAllConnections();
  await Promise.all([new Promise(resolve => server.close(resolve)), new Promise(resolve => core.close(resolve))]);
  await auth.close(); await client.close(); process.exit(0);
});
