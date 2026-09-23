import assert from 'node:assert/strict'
import test from 'node:test'
import { createHash } from 'node:crypto'
import { createDocument } from '@paperbanana/figure-core'
import { createRefineRuntime } from '../../../test-support/refine-runtime.mjs'
import { memoryDb } from '../../../test-support/memory-db.mjs'
import { createFigureOperations } from '../src/figure-operations.js'
import { createFigureStudioService } from '../src/figure-studio.js'
import { createProviderWorkflow } from '../src/provider-workflow.js'
import { createTokenDanceService } from '../src/tokendance-service.js'

const snapshot = (role: 'main' | 'vision') => ({ role, provider: 'openai', modelId: 'gpt-4.1', protocol: 'openai-chat-completions', options: { effort: role === 'main' ? 'low' : 'high' }, profileId: 'fixture-frozen-role', checkedAt: '2026-09-22', wire: { reasoning_effort: role === 'main' ? 'low' : 'high' }, clearFields: ['reasoning_effort'], dropSampling: true })
const task = (jobId: string) => ({ jobId, kind: 'generate', body: { userId: 'composition-owner', thinkingSnapshot: { version: 1, roles: { main: snapshot('main'), vision: snapshot('vision') } } }, routeSecrets: { openai: 'fixture-key' } })
const plan = { title: 'Fixture', summary: 'Synthetic fixture only.', nodes: [{ id: 'a', label: 'A' }], edges: [], notes: [] }

test('installing the figure wrapper retains the workbench thinking contract and distinct role transport', async () => {
  const runtime: any = await createRefineRuntime({ tokenDance: true })
  try {
    const ops = createFigureOperations({ db: runtime.db, service: runtime.tokenDanceService, baseWorkflow: runtime.workflow, studio: createFigureStudioService() })
    runtime.legacy.configureProviderWorkflow(ops.hooks)
    assert.equal((await runtime.invoke({ action: 'modelRegistry' })).thinkingContractVersion, 1)
    const sent: any[] = []
    runtime.legacy.configureRuntimeFetch(async (_url: any, init: any) => {
      sent.push(JSON.parse(init.body)); await Promise.resolve()
      return Response.json({ choices: [{ finish_reason: 'stop', message: { content: 'Visible fixture answer' } }] })
    })
    const original = task('workbench-thinking-composition')
    await runtime.db.collection('paperbanana_jobs').insertOne({ _id: original.jobId, userId: original.body.userId, providerCalls: [] })
    await ops.hooks.run(original as any, async () => {
      assert.equal(ops.hooks.active(), true)
      await Promise.all((['main', 'vision'] as const).map(async role => {
        assert.equal(await runtime.legacy.callTextModel('openai', 'gpt-4.1', 'fixture-key', 'fixture system', role, [], { thinkingRole: role }), 'Visible fixture answer')
      }))
    })
    assert.deepEqual(sent.map(body => body.reasoning_effort).sort(), ['high', 'low'])
    assert.ok(sent.every(body => body.temperature === undefined))
    assert.equal(ops.hooks.active(), false); assert.equal(ops.hooks.thinking(), undefined)
    assert.equal(await runtime.db.collection('paperbanana_provider_steps').countDocuments({ jobId: original.jobId }), 2)
    assert.equal(await runtime.db.collection('paperbanana_figure_provider_steps').countDocuments({}), 0)
  } finally { await runtime.close() }
})

test('workbench pending checkpoints survive the scoped wrapper without entering figure collections', async () => {
  const db: any = memoryDb(), service = createTokenDanceService({ db, secret: Buffer.alloc(32, 13).toString('base64') }), baseWorkflow = createProviderWorkflow({ db, service })
  const ops = createFigureOperations({ db, service, baseWorkflow, studio: createFigureStudioService() }), original = task('workbench-checkpoint-composition')
  await db.collection('paperbanana_jobs').insertOne({ _id: original.jobId, userId: original.body.userId, providerCalls: [] })
  const pending = { channel: 'fixture', taskId: 'server-task-id', pollUrl: 'https://fixture.invalid/status' }
  await ops.hooks.run(original as any, () => ops.hooks.scope('nested', async () => {
    await ops.hooks.call(['text', 'openai', 'gpt-4.1'], async () => {
      assert.deepEqual(ops.hooks.thinking(), snapshot('vision')); assert.equal(await ops.hooks.pending(), undefined)
      await ops.hooks.checkpoint(pending); assert.deepEqual(await ops.hooks.pending(), pending)
      await ops.hooks.record({ requestId: 'fixture-provider-request' }); return 'stored response'
    }, 'vision')
  }))
  const row = await db.collection('paperbanana_provider_steps').findOne({ jobId: original.jobId })
  assert.ok(row.pending); assert.doesNotMatch(JSON.stringify(row.pending), /server-task-id/); assert.equal(row.state, 'complete')
  assert.deepEqual((await db.collection('paperbanana_jobs').findOne({ _id: original.jobId })).providerCalls[0].thinking, snapshot('vision'))
  assert.equal(await db.collection('paperbanana_figure_provider_steps').countDocuments({}), 0)
})

test('native and managed figure work never inherit an enclosing workbench thinking or pending checkpoint', async () => {
  const db: any = memoryDb(), service = createTokenDanceService({ db, secret: Buffer.alloc(32, 19).toString('base64') }), baseWorkflow = createProviderWorkflow({ db, service })
  const observations: any[] = []; let ops: ReturnType<typeof createFigureOperations>
  const studio = createFigureStudioService({ modelText: async b => ops.hooks.call(['text', b.mainRoute.accessProvider, b.mainRoute.modelId], async () => {
    observations.push({ provider: b.mainRoute.accessProvider, active: ops.hooks.active(), thinking: ops.hooks.thinking(), pending: await ops.hooks.pending() })
    if (b.mainRoute.accessProvider === 'tokendance') { await ops.hooks.checkpoint({ channel: 'figure-fixture', taskId: 'only-figure-checkpoint' }); assert.equal((await ops.hooks.pending()).taskId, 'only-figure-checkpoint') }
    return JSON.stringify(plan)
  }, 'main') })
  ops = createFigureOperations({ db, service, baseWorkflow, studio })
  const original = task('workbench-enclosing-composition')
  await db.collection('paperbanana_jobs').insertOne({ _id: original.jobId, userId: original.body.userId, providerCalls: [] })
  await db.collection('paperbanana_tokendance_connections').insertOne({ _id: 'figure-composition-owner', version: 'fixture', secret: service.cipher!.seal({ key: 'fixture-td-key' }, 'figure-composition-owner') })
  const document = createDocument(), documentContext = { id: document.id, revision: document.revision, sha256: createHash('sha256').update(JSON.stringify(document)).digest('hex') }
  await ops.hooks.run(original as any, () => ops.hooks.call(['text', 'openai', 'gpt-4.1'], async () => {
    await ops.hooks.checkpoint({ channel: 'workbench-fixture', taskId: 'only-workbench-checkpoint' })
    for (const provider of ['openai', 'tokendance']) {
      const request = { action: 'figureStudioPlan', userId: 'figure-composition-owner', requestId: 'fixture-composition-' + provider, documentContext, materials: 'Synthetic fixture', mainRoute: { accessProvider: provider, modelId: provider === 'openai' ? 'gpt-5.6-sol' : 'qwen3.8-flash' }, apiKeys: { openai: 'fixture-key' } }
      assert.equal((await ops.handle(request)).code, 0); await ops.drain()
      const completed = await ops.handle({ action: 'figureStudioOperation', userId: request.userId, requestId: request.requestId })
      assert.equal(completed.operation.status, 'succeeded', JSON.stringify(completed))
    }
    assert.deepEqual(ops.hooks.thinking(), snapshot('vision')); assert.equal((await ops.hooks.pending()).taskId, 'only-workbench-checkpoint')
    return 'workbench response'
  }, 'vision').then(() => {}))
  assert.deepEqual(observations, [{ provider: 'openai', active: false, thinking: undefined, pending: undefined }, { provider: 'tokendance', active: true, thinking: undefined, pending: undefined }])
  assert.equal(await db.collection('paperbanana_provider_steps').countDocuments({}), 1)
  assert.equal(await db.collection('paperbanana_figure_provider_steps').countDocuments({}), 1)
})
