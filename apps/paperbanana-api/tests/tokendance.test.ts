import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { memoryDb } from '../../../test-support/memory-db.mjs'
import { createRefineRuntime } from '../../../test-support/refine-runtime.mjs'
import { createTokenDanceService, tokenDanceCipher } from '../src/tokendance-service.js'
import { createProviderWorkflow } from '../src/provider-workflow.js'
import { TOKENDANCE_APP_URL, TokenDanceError, tokenDanceAmount, tokenDanceBalance, tokenDanceChat, tokenDanceChatBody, tokenDanceImageBody, tokenDanceResponse, tokenDanceFailure } from '../../../packages/api/src/tokendance.js'
import { resolveImageSize } from '../../../packages/types/src/image-size-contract.js'
import { STATIC_MODEL_REGISTRY as mini } from '../../miniprogram/miniprogram/utils/static-model-catalog.js'
import { compareTokenDanceCatalog } from '../../../scripts/check-tokendance-catalog.mjs'
const catalog = JSON.parse(readFileSync(new URL('../../../config/tokendance/catalog.json', import.meta.url), 'utf8'))
const { STATIC_MODEL_REGISTRY: web } = createRequire(import.meta.url)('../../web/src/lib/staticModelCatalog.js')
const sizes = JSON.parse(readFileSync(new URL('../../../config/image-size-contracts.json', import.meta.url), 'utf8'))
const secret = Buffer.alloc(32, 37).toString('base64')

test('all 93 live IDs are accounted for, all eligible roles agree across clients, and discovery reports changes', () => {
  assert.equal(catalog.models.length, 93)
  assert.equal(new Set(catalog.models.map((m: any) => m.id)).size, 93)
  const included = catalog.models.filter((m: any) => m.roles.length)
  assert.equal(included.length, 62)
  for (const [role, count] of Object.entries({ main: 60, vision: 27, image: 2, optimize: 60, refine: 2 })) assert.equal(included.filter((m: any) => m.roles.includes(role)).length, count)
  assert.deepEqual(web.tokendance, mini.tokendance)
  for (const model of catalog.models) {
    const entry = web.tokendance.models.find((m: any) => m.id === model.id)
    if (!model.roles.length) { assert.ok(model.excludedReason); assert.equal(entry, undefined); continue }
    assert.deepEqual(entry.roles, model.roles.filter((role: string) => ['main', 'vision', 'image'].includes(role)))
    assert.equal(entry.verified, false)
    assert.notEqual(entry.vendorId, 'unconfirmed')
    if (model.roles.includes('main')) assert.deepEqual(Object.keys(tokenDanceChatBody(model.id, 'system', 'user')).sort(), ['messages', 'model', 'stream'])
    if (model.roles.includes('vision')) assert.ok(tokenDanceChatBody(model.id, 'system', 'user', [{ url: 'https://example.org/image.png' }]).messages[1].content)
    else if (model.roles.includes('main')) assert.throws(() => tokenDanceChatBody(model.id, 's', 'u', [{ url: 'https://example.org/image.png' }]))
  }
  for (const id of ['spark-x2.5-4b', 'dots-3-note-preview', 'qwen3.8-max-0902', 'deepseek-chat-v3-0324']) assert.ok(web.tokendance.models.some((m: any) => m.id === id))
  const live = { data: catalog.models.map((m: any) => ({ ...m })) }
  assert.deepEqual(compareTokenDanceCatalog(catalog, live).newModels, [])
  live.data[0].supported_protocols = []
  live.data.push({ id: 'new-unreviewed', supported_protocols: ['openai:chat-completions'] })
  const drift = compareTokenDanceCatalog(catalog, live)
  assert.deepEqual(drift.newModels, ['new-unreviewed']); assert.equal(drift.protocolChanges.length, 1)
  assert.throws(() => compareTokenDanceCatalog(catalog, { data: [...live.data, live.data[0]] }), /Duplicate/)
})

test('every displayed Seedream generation/edit ratio and resolution forms a legal isolated request', () => {
  for (const model of web.tokendance.models.filter((m: any) => m.roles.includes('image'))) {
    for (const operation of ['generation', 'editing']) {
      const profile = sizes.profiles[sizes.routes['tokendance/' + model.id][operation]]
      const map = model.capabilities[operation === 'generation' ? 'aspectRatiosByResolution' : 'refineAspectRatiosByResolution']
      for (const [tier, ratios] of Object.entries(map)) for (const ratio of ['auto', ...(ratios as string[])]) {
        const value = resolveImageSize(profile, ratio, tier)
        const body = tokenDanceImageBody(model.id, 'research figure', value.size!, operation === 'editing' ? ['data:image/png;base64,fixture'] : [])
        assert.equal(body.output_format, 'png'); assert.equal(body.response_format, 'b64_json')
        assert.equal('n' in body, false); assert.equal('quality' in body, false)
        assert.equal('stream' in body, model.id.endsWith('lite'))
      }
    }
  }
  assert.throws(() => tokenDanceImageBody('seedream-5.0-lite', 'x', '1024x1024'))
  assert.throws(() => tokenDanceImageBody('seedream-5.0-pro', 'x', '4K'))
  assert.throws(() => tokenDanceImageBody('seedream-5.0-pro', 'x', '2K', Array(11).fill('image')))
})

test('streaming decodes split Chinese text, records actual model, never retries partial output or exposes upstream secrets', async () => {
  const body = 'data: {"model":"qwen3.8-flash","id":"req-123","choices":[{"delta":{"reasoning_content":"not user output","content":"科研"}}]}\n\ndata: [DONE]\n\n'
  const bytes = new TextEncoder().encode(body)
  const fetcher = async (_url: any, init: any) => {
    assert.equal(init.headers['X-App-URL'], TOKENDANCE_APP_URL)
    assert.equal(JSON.parse(init.body).model, 'qwen3.8-flash')
    return new Response(new ReadableStream({ start(controller) { for (const byte of bytes) controller.enqueue(new Uint8Array([byte])); controller.close() } }), { headers: { 'content-type': 'text/event-stream' } })
  }
  const result = await tokenDanceChat(fetcher as any, 'qwen3.8-flash', 'fixture-key', 's', 'u', [])
  assert.equal(result.text, '科研'); assert.equal(result.call.actualModel, 'qwen3.8-flash')
  let calls = 0
  await assert.rejects(tokenDanceChat((async () => { calls++; return new Response(body.replace('data: [DONE]\n\n', ''), { headers: { 'content-type': 'text/event-stream' } }) }) as any, 'qwen3.8-flash', 'fixture-key', 's', 'u', []), (error: any) => error.uncertain)
  assert.equal(calls, 1)
})

function fixture() {
  const db = memoryDb(), calls: any[] = []
  let time = Date.now(), paid = false, lostPayment = false
  const service = createTokenDanceService({ db: db as any, secret, now: () => time, fetcher: (async (url: any, init: any) => {
    calls.push({ url: String(url), init })
    assert.equal(init.headers['X-App-URL'], TOKENDANCE_APP_URL)
    if (String(url).endsWith('/auth/keys')) return Response.json({ key: 'fixture-user-key' })
    if (String(url).endsWith('/user/balance')) return Response.json({ balance: { credits: 12_000_000, credits_used: 500_001, balance: 11_499_999 } })
    if (String(url).includes('/payment/sessions')) {
      if (lostPayment && init.method === 'POST') throw new Error('fixture dropped reply')
      return Response.json({ session: { id: 'order-fixture', amount: 10, status: paid ? 'paid' : 'pending', payment_url: 'https://pay.example.com/fixture', alipay_url: 'alipays://platformapi/startapp?appId=fixture', status_url: 'https://tokendance.space/portal/api/v1/payment/sessions/order-fixture', created_at: Math.floor(time / 1000), expired_at: Math.floor(time / 1000) + 600, ...(paid ? { paid_at: Math.floor(time / 1000) } : {}) } }, { status: init.method === 'POST' ? 201 : 200 })
    }
    throw new Error('unexpected fixture endpoint')
  }) as any })
  const request = (action: string, body = {}, user = 'user-one') => service.handle({ action, ...body }, user)
  return { db, calls, service, request, advance(ms: number) { time += ms }, pay() { paid = true }, losePayment() { lostPayment = true } }
}

test('S256 binds callback to immutable user, consumes once, encrypts at rest, supports cancellation and rejects expiration', async () => {
  const f = fixture()
  const start = await f.request('tokenDanceAuthorize')
  const auth = new URL(start.authorizationUrl)
  assert.equal(auth.searchParams.get('app_url'), TOKENDANCE_APP_URL)
  assert.equal(new URL(auth.searchParams.get('callback_url')!).searchParams.get('state'), start.state)
  await assert.rejects(f.request('tokenDanceExchange', { state: start.state, code: 'fixture-code' }, 'user-other'))
  await f.request('tokenDanceExchange', { state: start.state, code: 'fixture-code' })
  const exchange = JSON.parse(f.calls[0].init.body)
  assert.equal(createHash('sha256').update(exchange.code_verifier).digest('base64url'), auth.searchParams.get('code_challenge'))
  await assert.rejects(f.request('tokenDanceExchange', { state: start.state, code: 'fixture-code' }))
  assert.equal(f.calls.length, 1)
  const row = await f.db.collection('paperbanana_tokendance_connections').findOne({ _id: 'user-one' })
  assert.ok(!JSON.stringify(row).includes('fixture-user-key'))
  assert.throws(() => tokenDanceCipher(secret).open(row.secret, 'user-other'))
  const wallet = await f.request('tokenDanceBalance'); assert.equal(wallet.wallet.balance, 11_499_999); assert.equal(wallet.wallet.keyLimit, null)
  const cancel = await f.request('tokenDanceAuthorize'); await f.request('tokenDanceCancel', { state: cancel.state })
  await assert.rejects(f.request('tokenDanceExchange', { state: cancel.state, code: 'fixture-code' }))
  const expired = await f.request('tokenDanceAuthorize'); f.advance(601000)
  await assert.rejects(f.request('tokenDanceExchange', { state: expired.state, code: 'fixture-code' }))
  await f.request('tokenDanceDisconnect'); assert.equal((await f.request('tokenDanceStatus')).connected, false)
})

test('payment units, local idempotency, owner isolation, authoritative paid status and unknown creation are independent', async () => {
  for (const value of [0, -1, 1.5, '10', 100001, Infinity]) assert.throws(() => tokenDanceAmount(value))
  assert.equal(tokenDanceAmount(100000), 100000)
  assert.throws(() => tokenDanceBalance({ balance: { credits: '10', credits_used: 0, balance: 10 } }))
  const f = fixture(), flow = await f.request('tokenDanceAuthorize')
  await f.request('tokenDanceExchange', { state: flow.state, code: 'fixture-code' })
  const body = { amount: 10, attemptId: 'attempt-fixture-0001' }
  assert.equal((await f.request('tokenDancePaymentCreate', body)).session.status, 'pending')
  await f.request('tokenDancePaymentCreate', body)
  assert.equal(f.calls.filter(call => call.url.endsWith('/payment/sessions')).length, 1)
  await assert.rejects(f.request('tokenDancePaymentStatus', body, 'other-user'))
  assert.equal((await f.request('tokenDancePaymentStatus', body)).session.status, 'pending')
  f.pay(); f.advance(3001)
  assert.equal((await f.request('tokenDancePaymentStatus', body)).session.status, 'paid')
  const history = (await f.request('tokenDancePayments')).payments
  assert.equal(history.length, 1)
  assert.equal(history[0].session.status, 'paid')
  assert.equal(new Date(history[0].createdAt).toISOString(), history[0].createdAt)
  assert.ok(Date.parse(history[0].checkedAt) > Date.parse(history[0].createdAt))
  assert.deepEqual((await f.request('tokenDancePayments', {}, 'other-user')).payments, [])
  f.losePayment()
  await assert.rejects(f.request('tokenDancePaymentCreate', { ...body, attemptId: 'attempt-fixture-0002' }), (e: any) => e.uncertain)
  const count = f.calls.length
  await assert.rejects(f.request('tokenDancePaymentCreate', { ...body, attemptId: 'attempt-fixture-0002' }))
  assert.equal(f.calls.length, count)
})

test('task recovery reuses paid steps across service restart and rejects foreign resume and ambiguous calls', async () => {
  const f = fixture(), flow = await f.request('tokenDanceAuthorize')
  await f.request('tokenDanceExchange', { state: flow.state, code: 'fixture-code' })
  const task = { jobId: 'job-recovery', kind: 'create', body: { userId: 'user-one', modelRoutes: { main: { accessProvider: 'tokendance', modelId: 'qwen3.8-flash' } } }, routeSecrets: { tokendance: 'fixture-user-key', openai: 'fixture-other-key' } }
  await f.db.collection('paperbanana_jobs').insertOne({ _id: task.jobId })
  let workflow = createProviderWorkflow({ db: f.db as any, service: f.service }), planned = 0, rendered = 0
  const run = () => workflow.run(task, async () => {
    const text = await workflow.call(['planner'], async () => { planned++; return 'planned result' }); assert.equal(text, 'planned result')
    await workflow.call(['image'], async () => { rendered++; if (rendered === 1) throw new TokenDanceError(402, 'balance', 'top_up_balance'); return 'image bytes' })
  })
  await assert.rejects(run())
  workflow = createProviderWorkflow({ db: f.db as any, service: f.service })
  await assert.rejects(workflow.resume(task.jobId, 'another-user', run))
  await workflow.resume(task.jobId, 'user-one', run)
  assert.equal(planned, 1); assert.equal(rendered, 2)
  await assert.rejects(workflow.resume(task.jobId, 'user-one', run))
  const ambiguous = { ...task, jobId: 'job-ambiguous' }
  await assert.rejects(workflow.run(ambiguous, () => workflow.call(['image'], async () => { throw new Error('reply lost') })))
  await assert.rejects(workflow.resume(ambiguous.jobId, 'user-one', async () => {}))
  assert.equal(JSON.stringify(f.db.collection('paperbanana_provider_executions').rows).includes('fixture-other-key'), false)
})

test('history reconciles abandoned resumed queues after restart without interrupting this process queue or replaying saved calls', async () => {
  const f = fixture(), flow = await f.request('tokenDanceAuthorize')
  await f.request('tokenDanceExchange', { state: flow.state, code: 'fixture-code' })
  const task = { jobId: 'history-restart', kind: 'create', body: { userId: 'user-one' }, routeSecrets: { tokendance: 'fixture-user-key' } }
  const jobs = f.db.collection('paperbanana_jobs'), executions = f.db.collection('paperbanana_provider_executions')
  await jobs.insertOne({ _id: task.jobId, status: 'failed' })
  let workflow = createProviderWorkflow({ db: f.db as any, service: f.service }), planned = 0, available = false
  const run = () => workflow.run(task, async () => {
    await workflow.call('plan', async () => { planned++; return 'plan' })
    await workflow.call('image', async () => { if (!available) throw new TokenDanceError(402, 'balance', 'top_up_balance'); return 'image' })
  })
  await assert.rejects(run())
  await workflow.resume(task.jobId, 'user-one', async () => {})
  await workflow.reconcileUser('user-one')
  assert.equal((await executions.findOne({ _id: task.jobId }))?.state, 'queued')
  workflow = createProviderWorkflow({ db: f.db as any, service: f.service })
  await workflow.reconcileUser('another-user')
  assert.equal((await executions.findOne({ _id: task.jobId }))?.state, 'queued')
  await workflow.reconcileUser('user-one')
  assert.equal((await executions.findOne({ _id: task.jobId }))?.state, 'blocked')
  assert.equal((await jobs.findOne({ _id: task.jobId }))?.recovery.canResume, true)
  available = true
  await workflow.resume(task.jobId, 'user-one', run)
  assert.equal(planned, 1)
})

test('disconnect during an in-flight exchange cannot reinstall a Key, and simultaneous code exchange is single-use', async () => {
  const db = memoryDb(); let complete: any, entered: any, calls = 0
  const started = new Promise(resolve => { entered = resolve })
  const service = createTokenDanceService({ db: db as any, secret, fetcher: (async () => { calls++; entered(); return new Promise(resolve => { complete = resolve }) }) as any })
  const flow = await service.handle({ action: 'tokenDanceAuthorize' }, 'user-race')
  const body = { action: 'tokenDanceExchange', state: flow.state, code: 'fixture-code' }
  const exchange = service.handle(body, 'user-race')
  await started
  await assert.rejects(service.handle(body, 'user-race'))
  await service.remove('user-race')
  complete(Response.json({ key: 'fixture-key' }))
  await assert.rejects(exchange)
  assert.equal(calls, 1)
  assert.equal((await service.handle({ action: 'tokenDanceStatus' }, 'user-race')).connected, false)
})

test('simultaneous payment creation is claimed once per owner, and status polling respects the 3-second interval', async () => {
  const f = fixture(); await f.service.ensureIndexes()
  const flow = await f.request('tokenDanceAuthorize')
  await f.request('tokenDanceExchange', { state: flow.state, code: 'fixture-code' })
  const attempts = await Promise.allSettled(['concurrent-order-0001', 'concurrent-order-0002'].map(attemptId => f.request('tokenDancePaymentCreate', { amount: 10, attemptId })))
  assert.equal(attempts.filter(row => row.status === 'fulfilled').length, 1)
  assert.equal(f.calls.filter(call => call.url.endsWith('/payment/sessions')).length, 1)
  const result: any = attempts.find(row => row.status === 'fulfilled')
  const before = f.calls.length
  await Promise.all(Array.from({ length: 3 }, () => f.request('tokenDancePaymentStatus', { attemptId: result.value.attemptId })))
  assert.equal(f.calls.length, before + 1)
})

test('recovery preserves nested paid results and isolates identical prompts across candidates during concurrent resume', async () => {
  const f = fixture(), flow = await f.request('tokenDanceAuthorize')
  await f.request('tokenDanceExchange', { state: flow.state, code: 'fixture-code' })
  const workflow = createProviderWorkflow({ db: f.db as any, service: f.service })
  const task = { jobId: 'nested-candidates', kind: 'create', body: { userId: 'user-one', prompt: 'private fixture content' }, routeSecrets: { tokendance: 'fixture' } }
  let blocked = true
  const counts = { planner: [0, 0], image: [0, 0] }
  const run = () => workflow.run(task, async () => {
    for (let i = 0; i < 2; i++) await workflow.scope('candidate-' + i, () => workflow.call(['composite'], async () => {
      await workflow.call(['same planner'], async () => { counts.planner[i]++; return 'planned' })
      return workflow.call(['same image'], async () => { counts.image[i]++; if (i === 1 && blocked) throw new TokenDanceError(402, 'balance', 'top_up_balance'); return 'image' })
    }))
  })
  await assert.rejects(run()); blocked = false
  const attempts = await Promise.allSettled([workflow.resume(task.jobId, 'user-one', run), workflow.resume(task.jobId, 'user-one', run)])
  assert.equal(attempts.filter(row => row.status === 'fulfilled').length, 1)
  assert.deepEqual(counts, { planner: [1, 1], image: [1, 2] })
  assert.equal(JSON.stringify(f.db.collection('paperbanana_provider_executions').rows).includes('private fixture content'), false)
})

test('key recovery, wallet recovery and rate limiting remain distinct and upstream error bodies never escape', async () => {
  for (const action of ['top_up_balance', 'reauthorize_api_key', 'api_key_quota']) {
    const error = tokenDanceFailure(403, action)
    assert.equal(error.recoveryAction, action); assert.equal(error.uncertain, false)
  }
  assert.equal(tokenDanceFailure(429, '', '17').retryAfterSeconds, 17)
  assert.equal(tokenDanceFailure(503, 'top_up_balance').uncertain, true)
  await assert.rejects(tokenDanceResponse((async () => new Response('secret fixture-do-not-echo', { status: 401 })) as any, '/gateway/v1/chat/completions', 'fixture-key', {}), (error: any) => error.recoveryAction === 'reauthorize_api_key' && !error.message.includes('fixture'))
})

test('an account deletion barrier prevents an in-flight model result from recreating encrypted recovery data', async () => {
  const f = fixture(), workflow = createProviderWorkflow({ db: f.db as any, service: f.service })
  const task = { jobId: 'deletion-race', kind: 'create', body: { userId: 'user-one' }, routeSecrets: { tokendance: 'fixture' } }
  await assert.rejects(workflow.run(task, async () => { await workflow.call(['paid model'], async () => {
    await f.db.collection('paperbanana_account_deletions').insertOne({ _id: 'user:user-one', contractVersion: 3, status: 'deleting' })
    await workflow.remove('user-one')
    return 'private image result after deletion started'
  }) }))
  for (const name of ['executions', 'steps', 'step_chunks']) assert.equal(await f.db.collection('paperbanana_provider_' + name).countDocuments({ userId: 'user-one' }), 0)
})

test('headless authorization, reconnecting a pending order, complete erasure and admin-only pricing keep credentials separated', async () => {
  const f = fixture(), flow = await f.request('tokenDanceAuthorize', { platform: 'miniprogram' })
  assert.equal(new URL(flow.authorizationUrl).searchParams.has('callback_url'), false)
  await f.request('tokenDanceExchange', { state: flow.state, code: 'fixture-code' })
  await f.request('tokenDancePaymentCreate', { amount: 10, attemptId: 'reconnect-order-0001' })
  await f.request('tokenDanceDisconnect')
  assert.equal(f.db.collection('paperbanana_tokendance_payments').rows[0].secret, undefined)
  const next = await f.request('tokenDanceAuthorize')
  await f.request('tokenDanceExchange', { state: next.state, code: 'fixture-code' })
  f.pay()
  assert.equal((await f.request('tokenDancePaymentStatus', { attemptId: 'reconnect-order-0001' })).session.status, 'paid')
  await assert.rejects(f.request('adminTokenDancePricing'), (error: any) => error.status === 403)
  assert.equal((await f.service.handle({ action: 'adminTokenDancePricing' }, 'user-one', true)).available, false)
  await f.service.eraseUserData('user-one')
  for (const name of ['connections', 'flows', 'payments']) assert.equal(f.db.collection('paperbanana_tokendance_' + name).rows.length, 0)
})

test('real legacy adapters dispatch every eligible text and vision ID plus both Seedream generation/edit protocols', async () => {
  const runtime = await createRefineRuntime()
  const requests: any[] = []
  try {
    runtime.legacy.configureRuntimeFetch(async (url: any, init: any = {}) => {
      if (String(url).endsWith('/gateway/v1/models')) return Response.json({ data: catalog.models })
      requests.push({ url: String(url), init })
      const body = JSON.parse(init.body)
      if (String(url).endsWith('/chat/completions')) return Response.json({ model: body.model, id: 'request-fixture', choices: [{ message: { content: 'scientific text' } }] })
      if (String(url).endsWith('/images/generations')) return Response.json({ model: body.model, data: [{ b64_json: runtime.output.toString('base64') }] })
      throw new Error('Unexpected endpoint')
    })
    for (const model of catalog.models) {
      if (model.roles.includes('main')) assert.equal(await runtime.legacy.callTextModel('tokendance', model.id, 'fixture', 's', 'u'), 'scientific text')
      if (model.roles.includes('vision')) assert.equal(await runtime.legacy.callVisionModel('tokendance', model.id, 'fixture', 'm', 'c', [{ url: 'https://example.com/figure.png' }]), 'scientific text')
      if (model.roles.includes('image')) for (const source of ['', 'data:image/png;base64,' + runtime.image.toString('base64')]) assert.ok(await runtime.legacy.callImageModel('tokendance', model.id, 'fixture', 'figure', '16:9', source, '2K', true))
    }
    assert.equal(requests.length, 91)
    for (const { url, init } of requests) { assert.equal(init.headers['X-App-URL'], TOKENDANCE_APP_URL); assert.ok(url.startsWith('https://tokendance.space/gateway/')); assert.equal('models' in JSON.parse(init.body), false) }
  } finally { await runtime.close() }
})

test('real Gateway/Core compose login, authorization, generation, balance failure, payment and same-job recovery without recharging the planner', async () => {
  const runtime = await createRefineRuntime({ tokenDance: true })
  try {
    assert.equal((await runtime.post({ action: 'tokenDanceAuthorize' }, 'anonymous')).status, 401)
    const start = await runtime.post({ action: 'tokenDanceAuthorize' })
    assert.equal(start.data.code, 0)
    assert.equal((await runtime.post({ action: 'tokenDanceExchange', state: start.data.state, code: 'fixture-code' }, 'other-owner')).status, 409)
    assert.equal((await runtime.post({ action: 'tokenDanceExchange', state: start.data.state, code: 'fixture-code' })).data.connected, true)
    const routes = { main: { accessProvider: 'tokendance', modelId: 'qwen3.8-flash' }, image: { accessProvider: 'tokendance', modelId: 'seedream-5.0-lite' }, vision: { accessProvider: 'tokendance', modelId: 'qwen3.8-flash' } }
    runtime.setTokenDanceFailure('top_up_balance')
    const submission = await runtime.post({ action: 'createJob', provider: 'tokendance', modelRoutes: routes, apiKeys: { tokendance: 'must-not-trust-client' }, methodContent: '研究一种通过输入、处理和输出三个阶段生成学术图示的方法。', caption: '图一：方法流程。', outputFormat: 'png', pipelineMode: 'planner_critic', retrievalSetting: 'none', imageSize: '2K', aspectRatio: '16:9', numCandidates: 1, maxCriticRounds: 0 })
    assert.equal(submission.data.code, 0, JSON.stringify(submission))
    await runtime.legacy.drainJobAdmission()
    const before = await runtime.post({ action: 'getJob', jobId: submission.data.jobId })
    assert.equal(before.data.job.status, 'failed', JSON.stringify(before.data))
    assert.equal(before.data.job.recovery.action, 'top_up_balance')
    const plannerCalls = runtime.tokenDanceCalls.filter((call: any) => call.url.endsWith('/chat/completions')).length
    assert.ok(plannerCalls > 0)
    for (const call of runtime.tokenDanceCalls.filter((call: any) => call.url.includes('/gateway/'))) assert.equal(call.options.headers.Authorization, 'Bearer fixture-tokendance-user-key')
    const payment = await runtime.post({ action: 'tokenDancePaymentCreate', amount: 10, attemptId: 'integration-payment-01' })
    assert.equal(payment.data.session.status, 'pending')
    runtime.payTokenDance()
    const status = await runtime.post({ action: 'tokenDancePaymentStatus', attemptId: 'integration-payment-01' })
    assert.equal(status.data.session.status, 'paid')
    await new Promise(resolve => setTimeout(resolve, 1010))
    assert.equal((await runtime.post({ action: 'tokenDanceResume', jobId: submission.data.jobId }, 'other-owner')).status, 401)
    const resumed = await runtime.post({ action: 'tokenDanceResume', jobId: submission.data.jobId })
    assert.equal(resumed.data.jobId, submission.data.jobId, JSON.stringify(resumed))
    await runtime.legacy.drainJobAdmission()
    const after = await runtime.post({ action: 'getJob', jobId: submission.data.jobId })
    assert.equal(after.data.job.status, 'succeeded', JSON.stringify(after.data))
    assert.equal(runtime.tokenDanceCalls.filter((call: any) => call.url.endsWith('/chat/completions')).length, plannerCalls)
    assert.ok(after.data.job.providerCalls.length >= 2)
    assert.equal(JSON.stringify(after).includes('fixture-tokendance-user-key'), false)
    const source = after.data.job.resultImages[0].objectKey
    const refined = await runtime.post({ action: 'refineImage', provider: 'tokendance', modelRoutes: routes, sourceImageObjectKey: source, editInstruction: '放大标签并保留布局。', imageSize: '2K', aspectRatio: '16:9' })
    assert.equal(refined.data.code, 0, JSON.stringify(refined))
    await runtime.legacy.drainJobAdmission()
    const edited = await runtime.post({ action: 'getJob', jobId: refined.data.jobId })
    assert.equal(edited.data.job.status, 'succeeded', JSON.stringify(edited))
    const lastImage = runtime.tokenDanceCalls.filter((call: any) => call.url.endsWith('/images/generations')).at(-1)
    assert.ok(lastImage)
    assert.ok(JSON.parse(lastImage.options.body).image[0].startsWith('data:image/png;base64,'))
    await runtime.post({ action: 'tokenDanceDisconnect' })
    const unused = await runtime.post({ action: 'refineImage', configurationMode: 'advanced', provider: 'tokendance', modelRoutes: { ...routes, image: { accessProvider: 'openai', modelId: 'gpt-image-2' } }, apiKeys: { openai: 'fixture-openai' }, sourceImageObjectKey: source, editInstruction: '保留布局。', imageSize: '2K', aspectRatio: '16:9' })
    assert.equal(unused.data.code, 0, 'unused TD main/vision routes must not require a connection: ' + JSON.stringify(unused))
    await runtime.legacy.drainJobAdmission()
    assert.equal((await runtime.post({ action: 'getJob', jobId: unused.data.jobId })).data.job.status, 'succeeded')
  } finally { await runtime.close() }
})
