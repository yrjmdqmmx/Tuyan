// Real gateway and Core composition; only infrastructure and paid providers are replaced.
// Also usable for local browser acceptance: node --import tsx test-support/refine-runtime.mjs
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import { memoryDb } from './memory-db.mjs';
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { createTokenDanceService } from '../apps/paperbanana-api/src/tokendance-service.ts';
import { createProviderWorkflow } from '../apps/paperbanana-api/src/provider-workflow.ts';
import { createApp as createCoreApp } from '../apps/paperbanana-api/src/server.ts';
import { createApp } from '../apps/auth-gateway/src/app.js';
const require = createRequire(new URL('../apps/paperbanana-api/package.json', import.meta.url));
const { build } = require('esbuild');
const sharp = require('sharp');
const express = require('express');

export async function createRefineRuntime({ port = 0, providerDelay = 0, tokenDance = false } = {}) {
  const db = memoryDb();
  const objects = new Map();
  const prepared = new Map();
  const providerCalls = [];
  let baseUrl;
  const bucket = {
    async getUploadUrl(key, _ttl, metadata) { prepared.set(key, metadata); return baseUrl + '/objects/' + key; },
    async getDownloadUrl(key) { return baseUrl + '/objects/' + key; },
    async writeFile(key, bytes, metadata) { objects.set(key, { bytes: Buffer.from(bytes), mimeType: metadata.ContentType }); },
    async readFile(key, maxBytes) {
      const object = objects.get(key);
      if (!object || object.bytes.length > maxBytes) throw new Error('Object missing or exceeds byte limit');
      return object.bytes;
    },
    async headFile(key) { const object = objects.get(key); if (!object) throw new Error('Object missing'); return { size: object.bytes.length, mimeType: object.mimeType }; },
    async deleteFile(key) { objects.delete(key); },
    async listFiles() { return { Contents: [], IsTruncated: false }; },
  };
  globalThis.__refineTestCloud = { mongo: { db }, storage: { bucket: () => bucket } };
  globalThis.__refineTestSharp = sharp;
  const result = await build({
    entryPoints: [fileURLToPath(new URL('../apps/paperbanana-api/src/legacy-entry.mjs', import.meta.url))],
    bundle: true, format: 'esm', platform: 'node', write: false,
    nodePaths: [fileURLToPath(new URL('../apps/paperbanana-api/node_modules', import.meta.url))],
    plugins: [{ name: 'local-infrastructure', setup(builder) {
      builder.onResolve({ filter: /^(@lafjs\/cloud|sharp)$/ }, args => ({ path: args.path, namespace: 'local-test' }));
      builder.onLoad({ filter: /.*/, namespace: 'local-test' }, args => ({
        loader: 'js', contents: 'export default globalThis.' + (args.path === 'sharp' ? '__refineTestSharp' : '__refineTestCloud'),
      }));
    } }],
  });
  // A unique URL keeps independent fixtures from sharing module-level lifecycle/admission state.
  const legacy = await import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text + '\n// ' + Math.random()).toString('base64'));
  const image = await sharp({ create: { width: 120, height: 80, channels: 4, background: '#89a78a' } }).png().toBuffer();
  const output = await sharp({ create: { width: 1024, height: 1024, channels: 4, background: '#b1c5ae' } }).png().toBuffer();
  let providerFailure = false;
  let tdFailure = '', tdPaid = false, tdSession = null;
  const tokenDanceCalls = [];
  const catalog = tokenDance ? JSON.parse(readFileSync(new URL('../config/tokendance/catalog.json', import.meta.url), 'utf8')) : null;
  const localFetch = async (input, options = {}) => {
    const url = String(input);
    if (url.startsWith(baseUrl + '/objects/')) {
      const object = objects.get(decodeURIComponent(url.slice((baseUrl + '/objects/').length)));
      return new Response(object?.bytes || '', { status: object ? 200 : 404, headers: { 'Content-Type': object?.mimeType || 'text/plain' } });
    }
    if (url === 'https://openrouter.ai/api/v1/models') return Response.json({ data: [] });
    if (url === 'https://tokendance.space/gateway/v1/models') return Response.json({ data: catalog?.models || [] });
    if (tokenDance && url.startsWith('https://tokendance.space/')) {
      tokenDanceCalls.push({ url, options });
      if (url.endsWith('/auth/keys')) return Response.json({ key: 'fixture-tokendance-user-key' });
      if (url.endsWith('/user/balance')) return Response.json({ balance: { credits: tdPaid ? 10000000 : 0, credits_used: 0, balance: tdPaid ? 10000000 : 0 } });
      if (url.includes('/payment/sessions')) {
        if (options.method === 'POST') tdSession = { id: 'fixture-payment-'+Date.now(), amount: JSON.parse(options.body).amount, status: 'pending', payment_url: 'https://pay.example.com/fixture-only', alipay_url: 'alipays://platformapi/startapp?appId=fixture-only', expired_at: Math.floor(Date.now()/1000)+600, created_at: Math.floor(Date.now()/1000) };
        return Response.json({ session: { ...tdSession, status_url: 'https://tokendance.space/portal/api/v1/payment/sessions/'+tdSession.id, status: tdPaid ? 'paid' : 'pending', ...(tdPaid ? { paid_at: Math.floor(Date.now()/1000) } : {}) } });
      }
      if (url.endsWith('/chat/completions')) {
        if (providerDelay) await new Promise(resolve => setTimeout(resolve, providerDelay));
        const body = JSON.parse(options.body);
        return new Response('data: '+JSON.stringify({model:body.model,id:'fixture-text-call',choices:[{delta:{content:'Create a clear scientific workflow diagram with readable labels and directional arrows.'}}]})+'\n\ndata: [DONE]\n\n', { headers: {'Content-Type':'text/event-stream'} });
      }
      if (url.endsWith('/images/generations')) {
        if (tdFailure) return Response.json({error:{message:'fixture failure'}},{status:tdFailure==='rate_limit'?429:402,headers:{'TokenDance-Recovery-Action':tdFailure,'Retry-After':'1'}});
        if (providerDelay) await new Promise(resolve => setTimeout(resolve, providerDelay));
        return Response.json({model:JSON.parse(options.body).model,data:[{b64_json:output.toString('base64')}]},{headers:{'x-request-id':'fixture-image-call'}});
      }
      throw new Error('Unexpected TokenDance fixture URL');
    }
    providerCalls.push({ url, options });
    if (providerDelay) await new Promise(resolve => setTimeout(resolve, providerDelay));
    if (providerFailure) return Response.json({ error: { message: 'Local provider failure fixture' } }, { status: 400 });
    if (url.includes('/chat/completions')) return Response.json({ choices: [{ message: { content: '需要调整：放大标签。需要保留：原有文字、配色和布局；其他内容保持不变。' } }] });
    if (url === 'https://api.openai.com/v1/images/edits') return Response.json({ data: [{ b64_json: output.toString('base64') }] });
    if (url.includes('multimodal-generation/generation')) {
      objects.set('fixture-output.png', { bytes: output, mimeType: 'image/png' });
      return Response.json({ output: { choices: [{ message: { content: [{ image: baseUrl + '/objects/fixture-output.png' }] } }] } });
    }
    throw new Error('Unexpected external request: ' + url);
  };
  legacy.configureRuntimeFetch(localFetch);
  const oldGateway = process.env.PAPERBANANA_GATEWAY_TOKEN;
  process.env.PAPERBANANA_GATEWAY_TOKEN = 'local-refine-gateway';
  const invoke = body => legacy.default({ body: { ...body, gatewayToken: 'local-refine-gateway' }, request: { method: 'POST' }, headers: {}, response: { setHeader() {}, status() {} } });
  const backend = { mode: 'node', async call(body, _context, options = {}) { if (tokenDance) { const response = await fetch(baseUrl+'/core/paperbanana-api', {method:'POST',headers:{'content-type':'application/json','x-paperbanana-gateway-token':'local-refine-gateway',...(options.authUserId?{'x-paperbanana-auth-user-id':options.authUserId}:{})},body:JSON.stringify(body)}); const data=await response.json(); if (body.action==='tokenDanceAuthorize' && data.authorizationUrl) data.authorizationUrl=baseUrl+'/fixture/authorize?target='+encodeURIComponent(new URL(data.authorizationUrl).searchParams.get('callback_url')); return {status:response.status,data}; } const data = await invoke(body); return { status: data.code >= 400 ? data.code : 200, data }; }, cachedStatus: () => ({ mode: 'node', ok: true }), ready: async () => ({ ok: true }) };
  const app = express();
  let tokenDanceService, workflow;
  if (tokenDance) {
    tokenDanceService = createTokenDanceService({db,fetcher:localFetch,secret:randomBytes(32).toString('base64'),callbackUrl:'http://127.0.0.1:5173/'});
    workflow = createProviderWorkflow({db,service:tokenDanceService});
    legacy.configureProviderWorkflow(workflow);
    app.use('/core',createCoreApp({handler:legacy.default,readinessProbe:async()=>({ready:true}),healthSnapshot:()=>({ready:true}),config:{gatewayToken:'local-refine-gateway',serviceName:'fixture-core',version:'test'},logger:{info(){},warn(){},error(){}},tokenDance:tokenDanceService,providerWorkflow:workflow,resumeTokenDanceJob:legacy.resumeTokenDanceJob,requiresTokenDanceCredential:legacy.requiresTokenDanceCredential}));
    app.get('/fixture/authorize',(req,res)=>res.type('html').send('<!doctype html><title>TokenDance 模拟授权</title><h1>本地授权测试桩</h1><p>不会连接真实 TokenDance，不会产生消费。</p><a href="'+String(req.query.target).replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'&amp;code=fixture-code">确认模拟授权</a>'));
    app.post('/fixture/paid',(_req,res)=>{tdPaid=true;tdFailure='';res.json({fixture:true,paid:true})});
    app.post('/fixture/balance-failure',(_req,res)=>{tdPaid=false;tdFailure='top_up_balance';res.json({fixture:true,paid:false})});
  }
  app.use('/objects', (req, res, next) => {
    res.set('Access-Control-Allow-Origin', 'http://127.0.0.1:5173');
    res.set('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });
  app.put('/objects/*key', express.raw({ type: '*/*', limit: '6mb' }), (req, res) => {
    const key = req.params.key.join('/');
    if (!prepared.has(key)) return res.sendStatus(403);
    objects.set(key, { bytes: req.body, mimeType: req.get('content-type') });
    res.sendStatus(200);
  });
  app.get('/objects/*key', (req, res) => {
    const object = objects.get(req.params.key.join('/'));
    if (!object) return res.sendStatus(404);
    res.type(object.mimeType).send(object.bytes);
  });
  const config = {
    production: false, trustProxy: 1, frontendOrigins: ['http://127.0.0.1:5173'], adminUserIds: new Set(), adminToken: 'local-test-admin',
    guestCookie: { name: 'refine-local-guest', secret: 'local-only-guest-secret-thirty-two-characters', ttlSeconds: 3600, secure: false },
    backend: { mode: 'node' }, maintenance: { retryAfterSeconds: 120 },
    oss: { bucket: 'paperbanana-hk', publicEndpoint: 'https://oss-cn-hongkong.aliyuncs.com', allowLegacyExternalRefineUrl: false },
  };
  const auth = {
    async optionalSession(req) { if (req.get('x-test-user')==='anonymous') return null; return { user: { id: req.get('x-test-user') || 'refine-owner', email: 'local@example.invalid', emailVerified: true } }; },
    handler(_req, res) { res.json({ user: { id: 'refine-owner', email: 'local@example.invalid', emailVerified: true }, session: { id: 'local' } }); },
    async webHandler() { return Response.json({ user: { id: 'refine-owner', email: 'local@example.invalid', emailVerified: true }, session: { id: 'local' } }); },
    cachedStatus: () => ({ ok: true }), ready: async () => ({ ok: true }),
  };
  app.use(createApp({ config, auth, backend, isMaintenance: () => false, logger: { info() {}, warn() {}, error() {} } }));
  const server = app.listen(port, '127.0.0.1');
  await once(server, 'listening');
  baseUrl = 'http://127.0.0.1:' + server.address().port;
  return {
    baseUrl, db, objects, providerCalls, image, output, legacy, invoke, tokenDanceService, workflow, tokenDanceCalls,
    setTokenDanceFailure(action) { tdFailure = action; }, payTokenDance() { tdPaid = true; tdFailure = ''; },
    failProvider(value) { providerFailure = value; },
    async post(body, user = 'refine-owner') {
      const response = await fetch(baseUrl + '/paperbanana-api', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-test-user': user }, body: JSON.stringify(body) });
      return { status: response.status, data: await response.json() };
    },
    async close() {
      await legacy.drainJobAdmission(); legacy.configureRuntimeFetch();
      await new Promise(resolve => server.close(resolve));
      if (oldGateway === undefined) delete process.env.PAPERBANANA_GATEWAY_TOKEN;
      else process.env.PAPERBANANA_GATEWAY_TOKEN = oldGateway;
    },
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const runtime = await createRefineRuntime({ port: 8791, providerDelay: 700, tokenDance: process.argv.includes('--tokendance') });
  const { writeFile } = await import('node:fs/promises');
  await writeFile('/tmp/tuyan-refine-original.png', runtime.image);
  console.log('Local acceptance runtime:', runtime.baseUrl, '(providers are fixtures)');
}
