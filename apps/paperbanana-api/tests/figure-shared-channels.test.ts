import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'
import { createDocument, generationContextFromDocument } from '@paperbanana/figure-core'
import { createRefineRuntime } from '../../../test-support/refine-runtime.mjs'
import { createFigureOperations } from '../src/figure-operations.js'
import { createFigureStudioService } from '../src/figure-studio.js'

const plan = { title: 'Fixture', summary: 'Synthetic data only.', nodes: [{ id: 'a', label: 'A' }], edges: [], notes: [] }
const channels = { runware: 'google:gemini@3.1-flash-lite', tokenhub: 'hy3', xiaomi: 'mimo-v2.6-pro', sensenova: 'sensenova-6.8-flash-lite', stepfun: 'step-5-preview', qianfan: 'ernie-5.1', iflytek: 'spark-x2.5', longcat: 'LongCat-2.0' }
const request = (provider: string, modelId: string) => {
  const document = createDocument({ id: 'shared-channel-source' })
  return { action: 'figureStudioPlan', userId: 'shared-channel-owner', requestId: 'fixture-shared-' + provider, materials: 'Synthetic fixture only', document, documentContext: { id: document.id, revision: document.revision, sha256: createHash('sha256').update(JSON.stringify(document)).digest('hex'), generationContextSha256: createHash('sha256').update(JSON.stringify(generationContextFromDocument(document))).digest('hex') }, mainRoute: { accessProvider: provider, modelId }, apiKeys: { [provider]: `fixture-${provider}-key` } }
}
const compose = (runtime: any) => {
  const studio = createFigureStudioService({ supportedProviders: runtime.legacy.figureStudioTextProviders(), modelText: runtime.legacy.figureStudioTextModel, runConverter: async () => { throw new Error('No converter in fixture') } })
  const ops = createFigureOperations({ db: runtime.db, service: runtime.tokenDanceService, baseWorkflow: runtime.workflow, studio })
  runtime.legacy.configureProviderWorkflow(ops.hooks)
  return { studio, ops }
}
const query = (ops: ReturnType<typeof createFigureOperations>, body: ReturnType<typeof request>) => ops.handle({ action: 'figureStudioOperation', userId: body.userId, requestId: body.requestId })

test('trusted catalog projection exposes every current text channel, excludes image-only routes and has no network dependency', async () => {
  const runtime: any = await createRefineRuntime({ tokenDance: true })
  try {
    let network = 0
    runtime.legacy.configureRuntimeFetch(async () => { network++; throw new Error('Catalog projection must not use network') })
    const { studio, ops } = compose(runtime)
    const capabilities = await studio.handle({ action: 'figureStudioCapabilities' })
    assert.equal(capabilities.modelPlanning, true)
    for (const provider of [...Object.keys(channels), 'openai', 'gemini', 'kimi', 'openrouter', 'tokendance', 'custom']) assert.ok(capabilities.supportedProviders.includes(provider), provider)
    for (const provider of ['recraft', 'bfl', 'stability', 'ideogram', 'fal', 'replicate']) assert.equal(capabilities.supportedProviders.includes(provider), false, provider)
    const failed = await ops.handle({ ...request('forged', 'fake'), supportedProviders: ['forged'] })
    assert.equal(failed.errorCode, 'FIGURE_STUDIO_ROUTE_UNSUPPORTED'); assert.equal(failed.requestState, 'not_sent')
    assert.equal(network, 0)
    const unconfigured = createFigureStudioService({ modelText: async () => { throw new Error('Must not dispatch without trusted providers') }, runConverter: async () => { throw new Error('No converter') } })
    assert.equal((await unconfigured.handle({ action: 'figureStudioCapabilities' })).modelPlanning, false)
    assert.equal((await unconfigured.handle(request('openai', 'gpt-4.1'))).requestState, 'not_sent')
  } finally { await runtime.close() }
})

test('all eight shared text adapters enter durable figure checkpoints and retain provider identity with mocked transport', async () => {
  const runtime: any = await createRefineRuntime({ tokenDance: true })
  try {
    const { ops } = compose(runtime)
    const calls: any[] = []
    runtime.legacy.configureRuntimeFetch(async (url: any, init: any) => {
      const wire = JSON.parse(init.body), body = Array.isArray(wire) ? wire[0] : wire
      calls.push({ url: String(url), body, authorization: new Headers(init.headers).get('authorization') })
      if (Array.isArray(wire)) return Response.json({ data: [{ taskUUID: body.taskUUID, text: JSON.stringify(plan), finishReason: 'stop', cost: 0 }] })
      return Response.json({ id: 'mock-provider-id', model: body.model, choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(plan) } }], stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(plan) }] })
    })
    for (const [provider, model] of Object.entries(channels)) {
      const body = request(provider, model)
      assert.equal((await ops.handle(body)).code, 0, provider)
      await ops.drain()
      const completed = await query(ops, body)
      assert.equal(completed.operation.status, 'succeeded', JSON.stringify(completed))
      assert.deepEqual(completed.operation.result, { plan })
      assert.equal(completed.operation.providerCalls.length, 1)
      assert.equal(completed.operation.providerCalls[0].source, 'figure-studio')
      assert.equal(completed.operation.providerCalls[0].operationRequestId, body.requestId)
      assert.equal(calls.at(-1).authorization, `Bearer fixture-${provider}-key`)
      const count = calls.length
      await ops.handle(body); await query(ops, body)
      assert.equal(calls.length, count)
    }
    assert.equal(calls.length, 8)
    const steps = runtime.db.collection('paperbanana_figure_provider_steps').rows
    assert.equal(steps.length, 8); assert.ok(steps.every((step: any) => step.state === 'complete' && step.pending))
    assert.equal(await runtime.db.collection('paperbanana_provider_steps').countDocuments({}), 0)
    assert.ok(!JSON.stringify(steps).includes('fixture-tokenhub-key'))
  } finally { await runtime.close() }
})

test('Runware explicit recovery polls the persisted task instead of creating a second text task', async () => {
  const runtime: any = await createRefineRuntime({ tokenDance: true })
  try {
    const { ops } = compose(runtime)
    let submits = 0, polls = 0, originalTaskId = ''
    runtime.legacy.configureRuntimeFetch(async (_url: any, init: any) => {
      const wire = JSON.parse(init.body)[0]
      if (wire.taskType !== 'getResponse') {
        submits++; originalTaskId = wire.taskUUID
        throw new Error('Synthetic network loss after original submission')
      }
      polls++; assert.equal(wire.taskUUID, originalTaskId)
      return Response.json({ data: [{ taskUUID: originalTaskId, text: JSON.stringify(plan), finishReason: 'stop' }] })
    })
    const body = request('runware', channels.runware)
    assert.equal((await ops.handle(body)).code, 0); await ops.drain()
    const blocked = await query(ops, body)
    assert.equal(blocked.operation.status, 'blocked'); assert.equal(blocked.operation.recovery.canResume, true, JSON.stringify(blocked))
    await query(ops, body); await ops.handle(body)
    assert.equal(submits, 1); assert.equal(polls, 0)
    assert.equal((await ops.handle({ action: 'figureStudioResume', userId: body.userId, requestId: body.requestId })).code, 0)
    await ops.drain()
    const result = await query(ops, body)
    assert.equal(result.operation.status, 'succeeded', JSON.stringify(result))
    assert.equal(submits, 1); assert.equal(polls, 1)
  } finally { await runtime.close() }
})
