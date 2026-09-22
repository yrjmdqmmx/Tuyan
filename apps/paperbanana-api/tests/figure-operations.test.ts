import assert from 'node:assert/strict'
import { createHash, randomBytes } from 'node:crypto'
import test from 'node:test'
import { createDocument } from '@paperbanana/figure-core'
import { memoryDb } from '../../../test-support/memory-db.mjs'
import { createRefineRuntime } from '../../../test-support/refine-runtime.mjs'
import { createFigureOperations } from '../src/figure-operations.js'
import { createFigureStudioService } from '../src/figure-studio.js'
import { createTokenDanceService } from '../src/tokendance-service.js'
import { createProviderWorkflow } from '../src/provider-workflow.js'
import { createUniversalRuntime } from '../src/universal-adapters.js'
import { normalizeUniversalRoute, UniversalApiError } from '../../../packages/api/src/universal-api.js'
import { TokenDanceError } from '../../../packages/api/src/tokendance.js'

const plan = { title: '研究流程', summary: '材料中的两个阶段。', nodes: [{ id: 'input', label: '输入' }, { id: 'analysis', label: '分析' }], edges: [{ from: 'input', to: 'analysis' }], notes: ['请作者确认箭头语义。'] }
const native = { accessProvider: 'openai', modelId: 'gpt-5.6-sol' }
const custom = () => normalizeUniversalRoute({ accessProvider: 'custom', modelId: 'exact/Model:KeepCase', custom: { version: 1, connectionId: 'figure-main', protocol: 'openai-chat', baseUrl: 'https://figure.example.com/v1', auth: 'bearer', capabilities: { text: true, vision: false, imageGeneration: false, imageEditing: false }, inputLimits: { maxCount: 2, maxBytes: 5e6, maxTotalBytes: 10e6, maxDimension: 4096, maxPixels: 16e6, requestMaxBytes: 32e6, mimeTypes: ['image/png'] }, outputLimits: { maxBytes: 10e6, maxDimension: 4096, maxPixels: 16e6, mimeTypes: ['image/png'] } } })
const envelope = (route = custom(), key = 'fixture-custom-key') => JSON.stringify({ [route.custom.connectionId]: { baseUrl: route.custom.baseUrl, protocol: route.custom.protocol, auth: route.custom.auth, apiKey: key } })
const context = (document = createDocument({ id: 'fixture-source' })) => ({ id: document.id, revision: document.revision, sha256: createHash('sha256').update(JSON.stringify(document)).digest('hex') })
const body = (extra: Record<string, any> = {}) => ({ action: 'figureStudioPlan', requestId: 'fixture-request-00001', documentContext: context(), userId: 'figure-user', materials: '输入然后分析。', mainRoute: native, apiKeys: { openai: 'fixture-native-key' }, ...extra })
const tick = () => new Promise(resolve => setImmediate(resolve))
async function fixture() {
  const db: any = memoryDb(), service = createTokenDanceService({ db, secret: randomBytes(32).toString('base64') }), baseWorkflow = createProviderWorkflow({ db, service })
  const calls: any[] = []
  let behavior: (b: any) => Promise<string> = async () => JSON.stringify(plan), now = Date.now()
  let ops: ReturnType<typeof createFigureOperations>
  const studio = createFigureStudioService({ modelText: async (b, system, input) => ops.hooks.call(['text', b.mainRoute, system, input], async () => {
    const key = b.mainRoute.accessProvider === 'tokendance' ? await ops.hooks.key(b.apiKeys.tokendance) : b.apiKeys[b.mainRoute.accessProvider]
    calls.push({ userId: b.userId, key, mainRoute: b.mainRoute })
    const result = await behavior(b)
    if (['custom', 'tokendance'].includes(b.mainRoute.accessProvider)) await ops.hooks.record({ channel: b.mainRoute.accessProvider, model: b.mainRoute.modelId, requestId: 'actual-provider-id', status: 'succeeded', billingStatus: 'unconfirmed' })
    return result
  }) })
  ops = createFigureOperations({ db, service, baseWorkflow, studio, now: () => now })
  await ops.ensureIndexes()
  return { db, service, baseWorkflow, studio, ops, calls, setBehavior(value: typeof behavior) { behavior = value }, advance(ms: number) { now += ms }, async get(request = body()) { return ops.handle({ action: 'figureStudioOperation', userId: request.userId, requestId: request.requestId }) }, async done(request = body()) { await ops.drain(); return this.get(request) } }
}

test('native receipt is atomic, encrypted, owner-scoped, durable across instances and conflicts do not call again', async () => {
  const f = await fixture(), request = body()
  let release!: (value: string) => void
  f.setBehavior(async () => new Promise(resolve => { release = resolve }))
  const [one, two] = await Promise.all([f.ops.handle(request), f.ops.handle(request)])
  assert.equal(one.code, 0); assert.equal(two.code, 0)
  assert.ok(['queued', 'running'].includes(one.operation.status))
  await tick(); assert.equal(f.calls.length, 1)
  assert.equal((await f.ops.handle(body({ materials: 'different' }))).code, 409)
  assert.equal((await f.ops.handle({ action: 'figureStudioOperation', requestId: request.requestId, userId: 'other-user' })).code, 404)
  release(JSON.stringify(plan))
  const done = await f.done(); assert.equal(done.operation.status, 'succeeded'); assert.deepEqual(done.operation.result, { plan })
  assert.match(done.operation.requestHash, /^[a-f0-9]{64}$/)
  const secondInstance = createFigureOperations({ db: f.db, service: f.service, baseWorkflow: f.baseWorkflow, studio: f.studio })
  assert.deepEqual((await secondInstance.handle({ action: 'figureStudioOperation', requestId: request.requestId, userId: request.userId })).operation.result, { plan })
  assert.equal((await f.ops.handle(request)).operation.status, 'succeeded'); assert.equal(f.calls.length, 1)
  const row = await f.db.collection('paperbanana_figure_operations').findOne({ userId: request.userId })
  assert.ok(row.result); assert.ok(!JSON.stringify(row).includes('fixture-native-key')); assert.ok(!JSON.stringify(row).includes('研究流程'))
  assert.deepEqual(done.operation.providerCalls[0], { channel: 'openai', model: native.modelId, status: 'succeeded', billingStatus: 'unconfirmed', source: 'figure-studio', kind: 'plan', operationRequestId: request.requestId })
})

test('custom known rejection preserves typed recovery, validates replacement binding and explicitly resumes original ID', async () => {
  const f = await fixture(), route = custom(), request = body({ mainRoute: route, apiKeys: { custom: envelope(route) } })
  f.setBehavior(async () => { throw new UniversalApiError('UPSTREAM_REJECTED', 'rejected', 402) })
  await f.ops.handle(request)
  const failed = await f.done(request)
  assert.equal(failed.operation.status, 'blocked'); assert.equal(failed.operation.recovery.canResume, true); assert.equal(failed.operation.recovery.action, 'top_up_balance'); assert.equal(failed.operation.recovery.requestState, 'rejected')
  assert.equal((await f.ops.handle(request)).operation.status, 'blocked'); assert.equal(f.calls.length, 1)
  const wrong = custom(); wrong.custom.baseUrl = 'https://wrong.example.com/v1'
  assert.equal((await f.ops.handle({ action: 'figureStudioResume', requestId: request.requestId, userId: request.userId, apiKeys: { custom: envelope(wrong) } })).code, 400)
  assert.equal(f.calls.length, 1)
  f.setBehavior(async () => JSON.stringify(plan))
  assert.equal((await f.ops.handle({ action: 'figureStudioResume', requestId: request.requestId, userId: request.userId, apiKeys: { custom: envelope(route, 'rotated-key') } })).code, 0)
  const done = await f.done(request); assert.equal(done.operation.status, 'succeeded'); assert.equal(done.operation.requestHash, failed.operation.requestHash)
  assert.match(f.calls[1].key, /rotated-key/); assert.equal(f.calls.length, 2)
  assert.equal(done.operation.providerCalls[0].requestId, 'actual-provider-id'); assert.equal(done.operation.providerCalls[0].operationRequestId, request.requestId)
  assert.equal(f.db.collection('paperbanana_provider_executions').rows.length, 0)
  assert.equal(f.db.collection('paperbanana_figure_provider_executions').rows[0].state, 'complete')
  assert.equal(f.db.collection('paperbanana_figure_provider_executions').rows[0].secret, undefined)
})

test('TokenDance only uses account authority and concurrent accounts cannot exchange keys or records', async () => {
  const f = await fixture(), route = { accessProvider: 'tokendance', modelId: 'gemini-3.1-pro-preview' }
  for (const userId of ['owner-A', 'owner-B']) await f.db.collection('paperbanana_tokendance_connections').insertOne({ _id: userId, version: 'fixture', secret: f.service.cipher!.seal({ key: userId + '-authoritative' }, userId) })
  const requests = ['owner-A', 'owner-B'].map(userId => body({ userId, mainRoute: route, apiKeys: { tokendance: 'forged-browser-key' } }))
  const accepted = await Promise.all(requests.map(r => f.ops.handle(r)))
  assert.ok(accepted.every(r => r.code === 0)); await f.ops.drain()
  assert.deepEqual(f.calls.map(c => c.key).sort(), ['owner-A-authoritative', 'owner-B-authoritative'])
  for (const request of requests) {
    const done = await f.get(request); assert.equal(done.operation.status, 'succeeded'); assert.equal(done.operation.providerCalls.length, 1)
    assert.ok(!JSON.stringify(done).includes('authoritative'))
  }
  assert.equal((await f.ops.handle(body({ userId: 'no-connection', mainRoute: route, apiKeys: { tokendance: 'forged' } }))).code, 401)
  assert.equal(f.calls.length, 2)
})

test('unknown managed/native failures and invalid paid model output never replay', async () => {
  for (const provider of ['custom', 'openai']) {
    const f = await fixture(), request = provider === 'custom' ? body({ mainRoute: custom(), apiKeys: { custom: envelope() } }) : body()
    f.setBehavior(async () => { throw new UniversalApiError('RESULT_UNKNOWN', 'unknown', 504) })
    await f.ops.handle(request); const failed = await f.done(request)
    assert.equal(failed.operation.recovery.canResume, false); assert.equal(failed.operation.failure.requestState, 'unknown')
    assert.equal((await f.ops.handle({ action: 'figureStudioResume', requestId: request.requestId, userId: request.userId })).code, 409)
    await f.ops.handle(request); assert.equal(f.calls.length, 1)
  }
  const f = await fixture(); f.setBehavior(async () => 'not json')
  await f.ops.handle(body()); const failed = await f.done()
  assert.equal(failed.operation.status, 'blocked'); assert.equal(failed.operation.failure.billingStatus, 'unconfirmed'); assert.equal(failed.operation.recovery.canResume, false)
  assert.match(failed.operation.failure.message, /JSON/); assert.equal(failed.operation.result, undefined)
})

test('input/key binding/context failures happen before admission, selected edit scope/version stay immutable', async () => {
  const f = await fixture(), document = createDocument({ id: 'source-edit', elements: [{ id: 'one', type: 'text', x: 2, y: 3, width: 10, height: 5, text: '甲' }, { id: 'two', type: 'text', x: 2, y: 12, width: 10, height: 5, text: '乙' }] })
  const request = body({ action: 'figureStudioEdit', document, documentContext: context(document), objectIds: ['one'], baseRevision: 0, instruction: '改为丙' })
  for (const invalid of [body({ requestId: 'bad' }), body({ documentContext: { ...context(), sha256: 'x' } }), { ...request, baseRevision: 1 }, { ...request, documentContext: { ...context(document), sha256: 'a'.repeat(64) } }, body({ mainRoute: custom(), apiKeys: { custom: '{}' } })]) {
    const failed = await f.ops.handle(invalid); assert.ok(failed.code >= 400); assert.equal(failed.requestState, 'not_sent')
  }
  assert.equal(f.calls.length, 0); assert.equal(f.db.collection('paperbanana_figure_operations').rows.length, 0)
  f.setBehavior(async () => JSON.stringify({ commands: [{ type: 'update', id: 'two', patch: { text: '越界' } }] }))
  await f.ops.handle(request); const failed = await f.done(request)
  assert.equal(failed.operation.status, 'blocked'); assert.equal(failed.operation.recovery.canResume, false); assert.equal((document.elements[1] as any).text, '乙')
})

test('account deletion/generation, expiry and execution-version prevent old result replay without erasing unrelated evidence', async () => {
  const f = await fixture(); let release!: (value: string) => void
  f.setBehavior(async () => new Promise(resolve => { release = resolve }))
  const request = body(); await f.ops.handle(request); await tick()
  await f.db.collection('paperbanana_account_deletions').insertOne({ _id: 'user:figure-user', contractVersion: 3, status: 'active', accountGeneration: 'new-account-generation' })
  release(JSON.stringify(plan)); await f.ops.drain()
  assert.equal((await f.get()).code, 409)
  assert.equal(f.db.collection('paperbanana_figure_operations').rows.length, 1)
  await f.ops.remove(request.userId)
  for (const name of ['paperbanana_figure_operations', 'paperbanana_figure_provider_executions', 'paperbanana_figure_provider_steps', 'paperbanana_figure_provider_step_chunks']) assert.equal(f.db.collection(name).rows.length, 0)
  const next = await fixture(); await next.ops.handle(body()); await next.ops.drain()
  await next.db.collection('paperbanana_figure_operations').updateOne({ userId: 'figure-user' }, { $set: { version: 'old-version' } })
  const old = await next.get(); assert.equal(old.operation.status, 'blocked'); assert.equal(old.operation.recovery.canResume, false); assert.equal(old.operation.result, undefined)
  next.advance(8 * 86400_000); assert.equal((await next.get()).code, 404)
  assert.ok(next.db.collection('paperbanana_figure_operations').indexes.some((x: any) => x.expireAfterSeconds === 0))
})

test('a stale native claim remains unknown across restart and query never calls model again', async () => {
  const f = await fixture(); let release!: (value: string) => void
  f.setBehavior(async () => new Promise(resolve => { release = resolve }))
  await f.ops.handle(body()); await tick(); f.advance(61_000)
  const stale = await f.get(); assert.equal(stale.operation.status, 'blocked'); assert.equal(stale.operation.recovery.canResume, false); assert.equal(stale.operation.recovery.requestState, 'unknown')
  release(JSON.stringify(plan)); await f.ops.drain(); assert.equal((await f.get()).operation.status, 'blocked'); assert.equal(f.calls.length, 1)
})

test('managed catalog preflight retains retry state and safe explicit resume does one paid call', async () => {
  const f = await fixture(), request = body({ mainRoute: custom(), apiKeys: { custom: envelope() } })
  const error = new TokenDanceError(503, '目录尚未读取', 'retry_request', 0, false, 'not_sent')
  f.setBehavior(async () => { throw error })
  await f.ops.handle(request); const failed = await f.done(request)
  assert.equal(failed.operation.recovery.canResume, true); assert.equal(failed.operation.recovery.requestState, 'not_sent'); assert.equal(failed.operation.recovery.action, 'retry_request')
  f.setBehavior(async () => JSON.stringify(plan)); await f.ops.handle({ action: 'figureStudioResume', requestId: request.requestId, userId: request.userId }); assert.equal((await f.done(request)).operation.status, 'succeeded')
})

test('real legacy custom adapter uses the same workflow and binding, keeps precise model ID, and resumes only explicit rejection', async () => {
  const runtime: any = await createRefineRuntime({ tokenDance: true })
  try {
    const calls: any[] = []; let failure = true
    runtime.legacy.configureUniversalRuntime(createUniversalRuntime({ transport: { checkUrl: async () => {}, request: async request => {
      calls.push(request)
      if (failure) throw new UniversalApiError('UPSTREAM_REJECTED', 'rejected', 402)
      return { status: 200, headers: new Headers(), bytes: Buffer.from(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(plan) } }] })) }
    } } }))
    const ops = createFigureOperations({ db: runtime.db, service: runtime.tokenDanceService, baseWorkflow: runtime.workflow, studio: createFigureStudioService({ modelText: runtime.legacy.figureStudioTextModel }) })
    runtime.legacy.configureProviderWorkflow(ops.hooks)
    const request = body({ mainRoute: custom(), apiKeys: { custom: envelope() } })
    assert.equal((await ops.handle(request)).code, 0); await ops.drain()
    const failed = await ops.handle({ action: 'figureStudioOperation', userId: request.userId, requestId: request.requestId })
    assert.equal(failed.operation.recovery.canResume, true, JSON.stringify(failed)); assert.equal(calls.length, 1)
    assert.equal(runtime.tokenDanceCalls.length, 0)
    failure = false
    await ops.handle({ action: 'figureStudioResume', userId: request.userId, requestId: request.requestId, apiKeys: { custom: envelope(custom(), 'replacement-key') } }); await ops.drain()
    const done = await ops.handle({ action: 'figureStudioOperation', userId: request.userId, requestId: request.requestId })
    assert.equal(done.operation.status, 'succeeded', JSON.stringify(done)); assert.deepEqual(done.operation.result, { plan }); assert.equal(calls.length, 2)
    assert.equal(calls[1].headers.Authorization, 'Bearer replacement-key'); assert.equal(JSON.parse(calls[1].body).model, 'exact/Model:KeepCase')
    assert.equal(done.operation.providerCalls[0].source, 'figure-studio')
    assert.equal(runtime.db.collection('paperbanana_jobs').rows.length, 0)
  } finally { await runtime.close() }
})

test('real legacy TokenDance adapter preserves provider request ID, authoritative key and uncertain zero replay', async () => {
  const runtime: any = await createRefineRuntime({ tokenDance: true })
  try {
    const { readFile } = await import('node:fs/promises')
    const catalog = JSON.parse(await readFile(new URL('../../../config/tokendance/catalog.json', import.meta.url), 'utf8'))
    const calls: any[] = []
    runtime.legacy.configureRuntimeFetch(async (url: any, options: any) => {
      if (String(url).endsWith('/models')) return Response.json({ data: catalog.models })
      calls.push({ url, options })
      return new Response('data: ' + JSON.stringify({ model: 'qwen3.8-flash', id: 'provider-trace-456', choices: [{ delta: { content: JSON.stringify(plan) } }] }) + '\n\ndata: [DONE]\n\n', { headers: { 'Content-Type': 'text/event-stream' } })
    })
    const userId = 'figure-td-owner'
    await runtime.db.collection('paperbanana_tokendance_connections').insertOne({ _id: userId, version: 'fixture', secret: runtime.tokenDanceService.cipher.seal({ key: 'account-authority-key' }, userId) })
    const ops = createFigureOperations({ db: runtime.db, service: runtime.tokenDanceService, baseWorkflow: runtime.workflow, studio: createFigureStudioService({ modelText: runtime.legacy.figureStudioTextModel }) })
    runtime.legacy.configureProviderWorkflow(ops.hooks)
    const request = body({ userId, mainRoute: { accessProvider: 'tokendance', modelId: 'qwen3.8-flash' }, apiKeys: { tokendance: 'forged-key' } })
    await ops.handle(request); await ops.drain()
    const done = await ops.handle({ action: 'figureStudioOperation', userId, requestId: request.requestId })
    assert.equal(done.operation.status, 'succeeded', JSON.stringify(done)); assert.equal(calls.length, 1)
    assert.equal(calls[0].options.headers.Authorization, 'Bearer account-authority-key')
    assert.equal(JSON.parse(calls[0].options.body).max_tokens, 4096)
    assert.equal(done.operation.providerCalls[0].requestId, 'provider-trace-456'); assert.equal(done.operation.providerCalls[0].operationRequestId, request.requestId)
    await ops.handle(request); await ops.drain(); assert.equal(calls.length, 1)
    assert.ok(!JSON.stringify(runtime.db.collection('paperbanana_figure_provider_executions').rows).includes('account-authority-key'))
  } finally { await runtime.close() }
})

test('shared model busy gate stays not_sent without false unknown recovery or a provider step', async () => {
  const f = await fixture(), releases: Array<(value: string) => void> = []
  f.setBehavior(async () => new Promise(resolve => releases.push(resolve)))
  const first = body({ userId: 'busy-user-1' }), second = body({ userId: 'busy-user-2' })
  await f.ops.handle(first); await f.ops.handle(second); await tick()
  const request = body({ userId: 'busy-user-3', mainRoute: custom(), apiKeys: { custom: envelope() } })
  await f.ops.handle(request); await tick(); await tick()
  const busy = await f.get(request)
  assert.equal(busy.operation.status, 'blocked', JSON.stringify(busy)); assert.equal(busy.operation.failure.requestState, 'not_sent'); assert.equal(busy.operation.recovery.requestState, 'not_sent'); assert.equal(busy.operation.recovery.billingStatus, 'not_called'); assert.equal(busy.operation.recovery.canResume, false)
  assert.equal(f.calls.length, 2); assert.equal(f.db.collection('paperbanana_figure_provider_steps').rows.length, 0)
  releases.forEach(resolve => resolve(JSON.stringify(plan))); await f.ops.drain()
})

test('account generation is rechecked at paid-call/key boundaries after async preflight and cannot borrow a new account key', async () => {
  for (const provider of ['openai', 'tokendance']) {
    const db: any = memoryDb(), service = createTokenDanceService({ db, secret: randomBytes(32).toString('base64') }), baseWorkflow = createProviderWorkflow({ db, service })
    const userId = 'generation-owner'; let release!: () => void, entered!: () => void, calls = 0, keys = 0
    const gate = new Promise<void>(resolve => { release = resolve }), started = new Promise<void>(resolve => { entered = resolve })
    if (provider === 'tokendance') await db.collection('paperbanana_tokendance_connections').insertOne({ _id: userId, version: 'fixture', secret: service.cipher!.seal({ key: 'old-key' }, userId) })
    let ops: ReturnType<typeof createFigureOperations>
    const studio = createFigureStudioService({ modelText: async b => {
      entered(); await gate
      if (provider === 'tokendance') { await ops.hooks.key(b.apiKeys.tokendance); keys++ }
      return ops.hooks.call(['paid-model'], async () => { calls++; return JSON.stringify(plan) })
    } })
    ops = createFigureOperations({ db, service, baseWorkflow, studio })
    await ops.handle(body({ userId, mainRoute: { accessProvider: provider, modelId: provider === 'tokendance' ? 'qwen3.8-flash' : native.modelId } })); await started
    await db.collection('paperbanana_account_deletions').insertOne({ _id: 'user:' + userId, contractVersion: 3, status: 'active', accountGeneration: 'new-generation' })
    if (provider === 'tokendance') await db.collection('paperbanana_tokendance_connections').updateOne({ _id: userId }, { $set: { secret: service.cipher!.seal({ key: 'new-generation-key' }, userId) } })
    release(); await ops.drain()
    assert.equal(calls, 0); assert.equal(keys, 0)
    assert.equal((await ops.handle({ action: 'figureStudioOperation', userId, requestId: body().requestId })).code, 409)
  }
})

test('transient persistence failure retains other operations and uncertain billing evidence', async () => {
  const f = await fixture(), first = body({ requestId: 'request-evidence-0001' }), second = body({ requestId: 'request-evidence-0002' })
  await f.ops.handle(first); await f.ops.drain()
  const collection = f.db.collection('paperbanana_figure_operations'), update = collection.updateOne.bind(collection)
  let once = true
  collection.updateOne = async (query: any, change: any, options: any) => {
    if (once && change.$set?.result) { once = false; throw new Error('database temporarily unavailable') }
    return update(query, change, options)
  }
  await f.ops.handle(second); await f.ops.drain()
  assert.equal((await f.get(first)).operation.status, 'succeeded')
  const failed = await f.get(second); assert.equal(failed.operation.status, 'blocked'); assert.equal(failed.operation.recovery.canResume, false)
  assert.equal(collection.rows.length, 2); assert.equal(f.calls.length, 2)
})

test('same-account admission is atomic across instances while other accounts have independent slots', async () => {
  const db: any = memoryDb(), service = createTokenDanceService({ db, secret: randomBytes(32).toString('base64') }), baseWorkflow = createProviderWorkflow({ db, service })
  const releases: Array<(value: string) => void> = []; let calls = 0
  const instances = Array.from({ length: 3 }, () => {
    let ops: ReturnType<typeof createFigureOperations>
    const studio = createFigureStudioService({ modelText: async () => ops.hooks.call(['paid-model'], async () => { calls++; return new Promise(resolve => releases.push(resolve)) }) })
    ops = createFigureOperations({ db, service, baseWorkflow, studio }); return ops
  })
  const results = await Promise.all(instances.map((ops, i) => ops.handle(body({ requestId: 'atomic-request-' + i.toString().padStart(4, '0') }))))
  await tick(); assert.deepEqual(results.map(r => r.code).sort(), [0, 0, 429]); assert.equal(calls, 2)
  const other = await instances[2].handle(body({ userId: 'another-owner' })); assert.equal(other.code, 0); await tick(); assert.equal(calls, 3)
  releases.forEach(resolve => resolve(JSON.stringify(plan))); await Promise.all(instances.map(ops => ops.drain()))
  assert.equal(db.collection('paperbanana_figure_admissions').rows.length, 0)
})

test('managed restart reconciliation maps shared failed status to blocked and permits only safe explicit resume', async () => {
  const f = await fixture(), request = body({ mainRoute: custom(), apiKeys: { custom: envelope() } })
  f.setBehavior(async () => { throw new UniversalApiError('UPSTREAM_REJECTED', 'rejected', 402) })
  await f.ops.handle(request); await f.ops.drain()
  const op = f.db.collection('paperbanana_figure_operations').rows[0]
  await f.db.collection('paperbanana_figure_operations').updateOne({ _id: op._id }, { $set: { status: 'running', leaseUntil: new Date(0) }, $unset: { recovery: '' } })
  await f.db.collection('paperbanana_figure_provider_executions').updateOne({ _id: op._id }, { $set: { state: 'running', instanceId: 'abandoned-instance', leaseUntil: new Date(0) }, $unset: { recovery: '' } })
  f.advance(61_000)
  const recovered = await f.get(request)
  assert.equal(recovered.operation.status, 'blocked', JSON.stringify(recovered)); assert.equal(recovered.operation.recovery.canResume, true); assert.equal(recovered.operation.recovery.requestState, 'not_sent')
  assert.equal(f.calls.length, 1)
  f.setBehavior(async () => JSON.stringify(plan))
  assert.equal((await f.ops.handle({ action: 'figureStudioResume', userId: request.userId, requestId: request.requestId })).code, 0)
  assert.equal((await f.done(request)).operation.status, 'succeeded'); assert.equal(f.calls.length, 2)
})

test('validated encrypted result survives interruption before final status without provider replay', async () => {
  for (const managed of [false, true]) {
    const f = await fixture(), request = managed ? body({ mainRoute: custom(), apiKeys: { custom: envelope() } }) : body()
    await f.ops.handle(request); await f.ops.drain()
    await f.db.collection('paperbanana_figure_operations').updateOne({ userId: request.userId }, { $set: { status: 'running', leaseUntil: new Date(0) } })
    const recovered = await f.get(request)
    assert.equal(recovered.operation.status, 'succeeded'); assert.deepEqual(recovered.operation.result, { plan }); assert.equal(f.calls.length, 1)
  }
})

test('TokenDance async live catalog cannot dispatch after account generation changed', async () => {
  const runtime: any = await createRefineRuntime({ tokenDance: true })
  try {
    const { readFile } = await import('node:fs/promises')
    const catalog = JSON.parse(await readFile(new URL('../../../config/tokendance/catalog.json', import.meta.url), 'utf8'))
    let release!: () => void, entered!: () => void, calls = 0
    const gate = new Promise<void>(resolve => { release = resolve }), started = new Promise<void>(resolve => { entered = resolve })
    runtime.legacy.configureRuntimeFetch(async (url: any) => {
      if (String(url).endsWith('/models')) { entered(); await gate; return Response.json({ data: catalog.models }) }
      calls++; return Response.json({ choices: [{ message: { content: JSON.stringify(plan) } }] })
    })
    const userId = 'catalog-generation-owner'
    await runtime.db.collection('paperbanana_tokendance_connections').insertOne({ _id: userId, version: 'fixture', secret: runtime.tokenDanceService.cipher.seal({ key: 'account-key' }, userId) })
    const ops = createFigureOperations({ db: runtime.db, service: runtime.tokenDanceService, baseWorkflow: runtime.workflow, studio: createFigureStudioService({ modelText: runtime.legacy.figureStudioTextModel }) })
    runtime.legacy.configureProviderWorkflow(ops.hooks)
    await ops.handle(body({ userId, mainRoute: { accessProvider: 'tokendance', modelId: 'qwen3.8-flash' } })); await started
    await runtime.db.collection('paperbanana_account_deletions').insertOne({ _id: 'user:' + userId, contractVersion: 3, status: 'active', accountGeneration: 'changed' })
    release(); await ops.drain(); assert.equal(calls, 0)
  } finally { await runtime.close() }
})

test('expired or reassigned admission is fenced at dispatch even while the old operation owner remains running', async () => {
  for (const mode of ['expired', 'reassigned']) {
    const db: any = memoryDb(), service = createTokenDanceService({ db, secret: randomBytes(32).toString('base64') }), baseWorkflow = createProviderWorkflow({ db, service })
    let release!: () => void, entered!: () => void, calls = 0
    const gate = new Promise<void>(resolve => { release = resolve }), started = new Promise<void>(resolve => { entered = resolve })
    let ops: ReturnType<typeof createFigureOperations>
    const studio = createFigureStudioService({ modelText: async () => { entered(); await gate; return ops.hooks.call(['paid-model'], async () => { calls++; return JSON.stringify(plan) }) } })
    ops = createFigureOperations({ db, service, baseWorkflow, studio })
    await ops.handle(body()); await started
    const admission = db.collection('paperbanana_figure_admissions').rows[0]
    await db.collection('paperbanana_figure_admissions').updateOne({ _id: admission._id }, { $set: mode === 'expired' ? { leaseUntil: new Date(0) } : { owner: 'replacement-owner' } })
    release(); await ops.drain()
    assert.equal(calls, 0)
    const failed = await ops.handle({ action: 'figureStudioOperation', requestId: body().requestId, userId: body().userId })
    assert.equal(failed.operation.status, 'blocked'); assert.equal(failed.operation.failure.requestState, 'not_sent')
    if (mode === 'reassigned') assert.equal(db.collection('paperbanana_figure_admissions').rows[0].owner, 'replacement-owner')
  }
})
