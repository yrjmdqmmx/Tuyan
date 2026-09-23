import assert from 'node:assert/strict'
import test from 'node:test'
import { createHash } from 'node:crypto'
import { memoryDb } from '../../../test-support/memory-db.mjs'
import { createRefineRuntime } from '../../../test-support/refine-runtime.mjs'
import { applyThinkingSnapshot, applyThinkingTransport, normalizeThinkingConfiguration, validateThinkingOptions } from '../../../packages/api/src/thinking.js'
import { isLocalInputFailure, publicExecutionFailure } from '../../../packages/api/src/execution-errors.js'
import { TokenDanceError } from '../../../packages/api/src/tokendance.js'
import type { ThinkingSnapshotRole } from '../../../packages/types/src/thinking.js'
import { createProviderWorkflow } from '../src/provider-workflow.js'
import { createTokenDanceService } from '../src/tokendance-service.js'

// These snapshots are transport fixtures, not claims about a live model's controls.
function roleSnapshot(role: 'main' | 'vision', effort: string, overrides: Partial<ThinkingSnapshotRole> = {}): ThinkingSnapshotRole {
  return { role, provider: 'openai', modelId: 'gpt-4.1', protocol: 'openai-chat-completions', options: { effort },
    profileId: 'fixture-frozen-profile-v1', checkedAt: '2026-09-22', wire: { reasoning: { effort } },
    clearFields: ['reasoning'], dropSampling: true, ...overrides }
}
function task(jobId: string, withThinking = true) {
  return { jobId, kind: 'generate', body: { userId: 'thinking-owner',
    ...(withThinking ? { thinkingSnapshot: { version: 1, roles: { main: roleSnapshot('main', 'high'), vision: roleSnapshot('vision', 'low') } } } : {}) } as any,
  routeSecrets: { openai: 'fixture-openai-private-key' } as Record<string, string> }
}
function fixture(db = memoryDb()) {
  let clock = Date.parse('2026-09-22T08:00:00Z')
  const service = createTokenDanceService({ db: db as any, secret: Buffer.alloc(32, 17).toString('base64'), now: () => clock,
    fetcher: async () => { throw new Error('Workflow tests must not make external requests') } })
  const create = () => createProviderWorkflow({ db: db as any, service, now: () => clock })
  return { db, service, workflow: create(), restart: create, advance(ms: number) { clock += ms },
    async addJob(value: ReturnType<typeof task>) { await db.collection('paperbanana_jobs').insertOne({ _id: value.jobId, userId: value.body.userId, providerCalls: [] }) },
    async connect(userId = 'thinking-owner') {
      await db.collection('paperbanana_tokendance_connections').insertOne({ _id: userId, version: 'fixture-v1', secret: service.cipher!.seal({ key: 'fixture-tokendance-private-key' }, userId) })
    } }
}
const refused = () => new TokenDanceError(402, 'fixture balance rejection', 'top_up_balance', 0, false, 'rejected')
const mainDescriptor = ['text', 'openai', 'gpt-4.1', 'fixture system', 'fixture prompt']

test('encrypted task restores its original thinking snapshot and reuses completed steps after restart', async () => {
  const f = fixture(), original = task('thinking-frozen')
  await f.addJob(original)
  const expected = structuredClone(original.body.thinkingSnapshot)
  let plannerCalls = 0, nextCalls = 0
  const execute = async (workflow: typeof f.workflow, rejectNext: boolean) => {
    const planned = await workflow.call(mainDescriptor, async () => {
      plannerCalls++
      await workflow.record({ requestId: 'fixture-planning-call' })
      return { content: 'fixture-private-planner-result', chosen: workflow.thinking() }
    }, 'main')
    assert.deepEqual(planned.chosen, expected.roles.main)
    await workflow.call(['text', 'openai', 'gpt-4.1', 'fixture next step'], async () => {
      nextCalls++
      if (rejectNext) throw refused()
      return { content: 'done' }
    }, 'vision')
  }
  await assert.rejects(f.workflow.run(original, () => execute(f.workflow, true)), { name: 'TokenDanceError', status: 402 })
  const saved = await f.db.collection('paperbanana_provider_executions').findOne({ _id: original.jobId })
  assert.ok(saved.secret)
  assert.equal(saved.recovery.canResume, true)
  assert.deepEqual(f.service.cipher!.open(saved.secret, original.jobId).task.body.thinkingSnapshot, expected)
  assert.throws(() => f.service.cipher!.open(saved.secret, 'another-job'))
  assert.doesNotMatch(JSON.stringify(saved), /fixture-openai-private-key|fixture-frozen-profile-v1/)
  const chunks = await f.db.collection('paperbanana_provider_step_chunks').find({}).toArray()
  assert.doesNotMatch(JSON.stringify(chunks), /fixture-private-planner-result/)

  // A new UI choice or profile edit cannot alter the persisted recovery input.
  original.body.thinkingSnapshot.roles.main.options.effort = 'low'
  original.body.thinkingSnapshot.roles.main.wire.reasoning.effort = 'low'
  const restarted = f.restart()
  await restarted.resume(original.jobId, 'thinking-owner', async resumed => {
    assert.deepEqual(resumed.body.thinkingSnapshot, expected)
    assert.equal(resumed.routeSecrets.openai, 'fixture-openai-private-key')
    await restarted.run(resumed, () => execute(restarted, false))
  })
  assert.equal(plannerCalls, 1)
  assert.equal(nextCalls, 2)
  const completed = await f.db.collection('paperbanana_provider_executions').findOne({ _id: original.jobId })
  assert.equal(completed.state, 'complete')
  assert.equal(completed.secret, undefined)
  const job = await f.db.collection('paperbanana_jobs').findOne({ _id: original.jobId })
  assert.equal(job.recovery, undefined)
  assert.deepEqual(job.providerCalls[0].thinking, expected.roles.main)
})

test('concurrent resume queues once; other accounts and guests cannot restore the task', async () => {
  const f = fixture(), original = task('thinking-concurrent')
  await f.addJob(original)
  // Give both authenticated users credentials so a missing connection cannot mask owner checks.
  await f.connect()
  await f.connect('thinking-other')
  await assert.rejects(f.workflow.run(original, () => f.workflow.call(mainDescriptor, async () => { throw refused() })))
  let enqueued = 0, restored: any
  const enqueue = async (value: any) => { enqueued++; restored = value; return { jobId: value.jobId } }
  await assert.rejects(f.workflow.resume(original.jobId, 'thinking-other', enqueue), { status: 409 })
  await assert.rejects(f.workflow.resume(original.jobId, 'guest:someone', enqueue), { status: 401 })
  assert.equal(enqueued, 0)
  const outcomes = await Promise.allSettled([
    f.workflow.resume(original.jobId, 'thinking-owner', enqueue),
    f.workflow.resume(original.jobId, 'thinking-owner', enqueue),
  ])
  assert.equal(outcomes.filter(result => result.status === 'fulfilled').length, 1)
  assert.equal(outcomes.filter(result => result.status === 'rejected').length, 1)
  assert.equal(enqueued, 1)
  assert.deepEqual(restored.body.thinkingSnapshot, original.body.thinkingSnapshot)
  await f.workflow.run(restored, async () => {})
})

test('unknown transport results and abandoned paid claims never become automatically resumable', async () => {
  const f = fixture(), original = task('thinking-unknown')
  await f.addJob(original)
  await f.connect()
  let calls = 0
  await assert.rejects(f.workflow.run(original, () => f.workflow.call(mainDescriptor, async () => { calls++; throw new Error('fixture reply lost') })), /reply lost/)
  const steps = await f.db.collection('paperbanana_provider_steps').find({ jobId: original.jobId }).toArray()
  assert.equal(steps[0].state, 'unknown')
  const restarted = f.restart()
  await restarted.reconcile(original.jobId)
  const blocked = await f.db.collection('paperbanana_provider_executions').findOne({ _id: original.jobId })
  assert.equal(blocked.recovery.canResume, false)
  assert.equal(blocked.recovery.requestState, 'unknown')
  assert.equal(blocked.recovery.billingStatus, 'unknown')
  await assert.rejects(restarted.resume(original.jobId, 'thinking-owner', async () => { calls++ }), { status: 409 })
  assert.equal(calls, 1)

  // Simulate a crash between claim and transport/result persistence, then lease expiry.
  await f.db.collection('paperbanana_provider_executions').updateOne({ _id: original.jobId }, { $set: { state: 'running', leaseUntil: new Date(0) } })
  await f.db.collection('paperbanana_provider_steps').updateOne({ _id: steps[0]._id }, { $set: { state: 'running' } })
  await restarted.reconcile(original.jobId)
  const abandoned = await f.db.collection('paperbanana_provider_executions').findOne({ _id: original.jobId })
  assert.equal(abandoned.state, 'blocked')
  assert.equal(abandoned.recovery.canResume, false)
  assert.equal(abandoned.recovery.action, 'review_request')
  assert.equal(calls, 1)
})

test('missing config preserves the unmanaged path and historical managed checkpoint digests', async () => {
  const f = fixture(), legacy = task('thinking-legacy-unmanaged', false)
  let calls = 0
  await f.workflow.run(legacy, async () => {
    assert.equal(f.workflow.active(), false)
    assert.equal(f.workflow.thinking(), undefined)
    await f.workflow.call(mainDescriptor, async () => { calls++; return 'old response' }, 'vision')
  })
  assert.equal(calls, 1)
  assert.equal(await f.db.collection('paperbanana_provider_executions').countDocuments({}), 0)
  const request = { method: 'POST', body: JSON.stringify({ model: 'gpt-4.1', temperature: 0.8, reasoning: { effort: 'old-default' } }) }
  assert.strictEqual(applyThinkingTransport('https://api.openai.com/v1/chat/completions', request), request)

  const managed = task('thinking-legacy-managed', false)
  managed.routeSecrets = { tokenhub: 'fixture-historical-key' }
  await f.addJob(managed)
  const descriptor = ['text', 'tokenhub', 'fixture-historical-model', 'old prompt']
  const digest = createHash('sha256').update(JSON.stringify(descriptor)).digest('hex')
  const id = `${managed.jobId}:root:${digest}:0`
  await f.db.collection('paperbanana_provider_steps').insertOne({ _id: id, userId: managed.body.userId, jobId: managed.jobId, state: 'complete', chunks: 1 })
  await f.db.collection('paperbanana_provider_step_chunks').insertOne({ _id: `${id}:0`, data: f.service.cipher!.seal(JSON.stringify('saved old response'), `${id}:0`) })
  await f.workflow.run(managed, async () => {
    assert.equal(await f.workflow.call(descriptor, async () => { throw new Error('Historical checkpoint must not resend') }, 'vision'), 'saved old response')
  })
  assert.equal(await f.db.collection('paperbanana_provider_steps').countDocuments({ jobId: managed.jobId }), 1)
})

test('explicit call role keeps same-model main and vision settings separate across async work', async () => {
  const f = fixture(), original = task('thinking-role-isolation')
  await f.addJob(original)
  await f.workflow.run(original, async () => {
    await Promise.all((['main', 'vision'] as const).map(role => f.workflow.call(mainDescriptor, async () => {
      await new Promise(resolve => setImmediate(resolve))
      assert.deepEqual(f.workflow.thinking(), original.body.thinkingSnapshot.roles[role])
      await f.workflow.scope('nested', async () => {
        await Promise.resolve()
        assert.equal(f.workflow.thinking()?.role, role)
        await f.workflow.record({ requestId: `fixture-${role}` })
      })
      return role
    }, role)))
  })
  assert.equal(f.workflow.thinking(), undefined)
  const steps = await f.db.collection('paperbanana_provider_steps').find({ jobId: original.jobId }).toArray()
  assert.equal(steps.length, 2)
  assert.ok(steps.every((step: any) => step._id.endsWith(':0')))
  assert.notEqual(steps[0]._id, steps[1]._id)
  const job = await f.db.collection('paperbanana_jobs').findOne({ _id: original.jobId })
  assert.deepEqual(job.providerCalls.map((call: any) => [call.thinking.role, call.thinking.options.effort]).sort(), [['main', 'high'], ['vision', 'low']])
})

test('invalid thinking values and request budgets are classified not_sent without transport or replay', async () => {
  const validators = [
    () => validateThinkingOptions({ status: 'supported', controls: [{ key: 'budget', label: '预算', type: 'integer', min: 1, max: 100 }] }, { budget: 101 }),
    () => validateThinkingOptions({ status: 'supported', controls: [] }, { arbitraryWireField: true }),
    () => applyThinkingSnapshot({ model: 'gpt-4.1', max_tokens: 100 }, roleSnapshot('main', 'high', { options: { budget: 100 }, wire: { thinking: { budget_tokens: 100 } }, clearFields: ['thinking'], budgetRelation: 'inclusive', budgetField: 'thinking.budget_tokens' })),
  ]
  for (const [index, validate] of validators.entries()) {
    const f = fixture(), original = task(`thinking-invalid-${index}`)
    await f.addJob(original)
    let transported = 0
    await assert.rejects(f.workflow.run(original, async () => { await f.workflow.call(mainDescriptor, async () => { validate(); transported++; return 'must not send' }) }), (error: any) => {
      assert.equal(error.name, 'ThinkingConfigValidationError')
      assert.equal(isLocalInputFailure(error), true)
      assert.equal(publicExecutionFailure(error).requestState, 'not_sent')
      assert.equal(publicExecutionFailure(error).billingStatus, 'not_called')
      assert.equal(publicExecutionFailure(error, 1).billingStatus, 'prior_calls')
      assert.equal(publicExecutionFailure(error, 1, true).billingStatus, 'unknown')
      return true
    })
    assert.equal(transported, 0)
    const step = await f.db.collection('paperbanana_provider_steps').findOne({ jobId: original.jobId })
    assert.equal(step.state, 'rejected')
    const execution = await f.db.collection('paperbanana_provider_executions').findOne({ _id: original.jobId })
    assert.deepEqual([execution.recovery.canResume, execution.recovery.action, execution.recovery.requestState, execution.recovery.billingStatus], [false, 'change_input', 'not_sent', 'not_called'])
  }
})

test('runtime text/vision wrappers forward actual roles and preserve no-config wire behavior', async () => {
  const runtime = await createRefineRuntime()
  try {
    const f = fixture(runtime.db), original = task('thinking-runtime-roles'), roles: unknown[] = []
    await f.addJob(original)
    runtime.legacy.configureProviderWorkflow({ ...f.workflow, call: (descriptor, operation, role) => {
      roles.push(role)
      assert.equal(JSON.stringify(descriptor).includes('thinkingRole'), false)
      return f.workflow.call(descriptor, operation, role)
    } })
    const images = [{ filename: 'fixture.png', mimeType: 'image/png', url: 'data:image/png;base64,' + runtime.image.toString('base64'), size: runtime.image.length, width: 120, height: 80 }]
    await f.workflow.run(original, async () => {
      await runtime.legacy.callTextModel('openai', 'gpt-4.1', original.routeSecrets.openai, 'system', 'main prompt')
      await runtime.legacy.callTextModel('openai', 'gpt-4.1', original.routeSecrets.openai, 'system', 'vision critic', [], { thinkingRole: 'vision' })
      await runtime.legacy.callVisionModel('openai', 'gpt-4.1', original.routeSecrets.openai, 'main reference analysis', 'caption', images, undefined, undefined, 'main')
      await runtime.legacy.callVisionModel('openai', 'gpt-4.1', original.routeSecrets.openai, 'vision reference analysis', 'caption', images)
    })
    assert.deepEqual(roles, ['main', 'vision', 'main', 'vision'])
    const bodies = runtime.providerCalls.map(call => JSON.parse(String(call.options.body)))
    assert.equal(bodies.length, 4)
    assert.deepEqual(bodies.map(body => body.reasoning?.effort), ['high', 'low', 'high', 'low'])
    assert.ok(bodies.every(body => body.model === 'gpt-4.1' && !Object.hasOwn(body, 'temperature')))
    await f.workflow.run(task('thinking-runtime-legacy', false), async () => {
      await runtime.legacy.callTextModel('openai', 'gpt-4.1', 'fixture-key', 'system', 'legacy prompt')
    })
    const oldBody = JSON.parse(String(runtime.providerCalls.at(-1)!.options.body))
    assert.equal(oldBody.reasoning, undefined)
    assert.equal(await f.db.collection('paperbanana_provider_executions').countDocuments({ _id: 'thinking-runtime-legacy' }), 0)

    const resolve = (runtime.legacy as any).resolveModelRouting
    const forged = { version: 1, roles: { main: { ...roleSnapshot('main', 'high'), wire: { model: 'forged-model', arbitraryWireField: true } } } }
    const routed = resolve({ provider: 'openai', mainModelName: 'gpt-4.1', referenceVisionModelName: 'gpt-4.1', imageModelName: 'gpt-image-1', thinkingSnapshot: forged })
    assert.equal(routed.thinkingConfig, undefined)
    assert.equal(routed.thinkingSnapshot, undefined)
    const identity = { provider: 'openai', modelId: 'gpt-4.1', protocol: 'fixture-unconfirmed-protocol' }
    assert.throws(() => normalizeThinkingConfiguration({ version: 1, roles: { main: { ...identity, options: {}, wire: forged.roles.main.wire } } }, { main: identity }), { name: 'ThinkingConfigValidationError' })
    assert.deepEqual(normalizeThinkingConfiguration({ version: 1, roles: { main: { ...identity, options: {} } } }, { main: identity }).thinkingSnapshot?.roles.main?.wire, {})
  } finally { await runtime.close() }
})

test('TokenDance direct runtimeFetch receives the frozen role setting', async () => {
  const runtime = await createRefineRuntime({ tokenDance: true })
  try {
    const f = fixture(runtime.db), original = task('thinking-tokendance-runtime')
    await f.connect()
    await f.addJob(original)
    original.routeSecrets = { tokendance: 'fixture-unused-original-key' }
    original.body.thinkingSnapshot.roles = { main: roleSnapshot('main', 'high', { provider: 'tokendance', modelId: 'qwen3.8-flash', protocol: 'openai:chat-completions', options: { mode: true }, wire: { enable_thinking: true }, clearFields: ['enable_thinking'] }) }
    runtime.legacy.configureProviderWorkflow(f.workflow)
    await f.workflow.run(original, async () => {
      await runtime.legacy.callTextModel('tokendance', 'qwen3.8-flash', original.routeSecrets.tokendance, 'system', 'fixture prompt')
    })
    const requests = runtime.tokenDanceCalls.filter(call => call.url.endsWith('/chat/completions'))
    assert.equal(requests.length, 1)
    assert.equal(JSON.parse(requests[0].options.body).enable_thinking, true)
    assert.equal((await f.db.collection('paperbanana_jobs').findOne({ _id: original.jobId })).providerCalls[0].thinking.options.mode, true)
  } finally { await runtime.close() }
})

test('Runware pre-transport thinking validation cannot become a resumable pending task', async () => {
  const runtime = await createRefineRuntime()
  try {
    const f = fixture(runtime.db), original = task('thinking-runware-not-sent')
    await f.addJob(original)
    original.routeSecrets = { runware: 'fixture-runware-key' }
    original.body.thinkingSnapshot.roles = { main: roleSnapshot('main', 'high', {
      provider: 'runware', modelId: 'google:gemini@3.1-flash-lite', protocol: 'runware-text',
      options: { budget: 1_000_000 }, wire: { settings: { thinkingBudget: 1_000_000 } },
      clearFields: ['settings.thinkingBudget'], budgetRelation: 'inclusive',
      budgetField: 'settings.thinkingBudget', budgetOutputField: 'settings.maxTokens',
    }) }
    runtime.legacy.configureProviderWorkflow(f.workflow)
    await assert.rejects(f.workflow.run(original, async () => {
      await runtime.legacy.callTextModel('runware', 'google:gemini@3.1-flash-lite', original.routeSecrets.runware, 'system', 'fixture prompt')
    }), (error: any) => {
      assert.equal(error.name, 'ThinkingConfigValidationError', error.message)
      assert.equal(error.requestState, 'not_sent')
      return true
    })
    assert.equal(runtime.providerCalls.length, 0)
    const step = await f.db.collection('paperbanana_provider_steps').findOne({ jobId: original.jobId })
    assert.ok(step.pending, 'adapter reserves a task UUID before reaching runtimeFetch')
    assert.equal(step.state, 'rejected')
    const execution = await f.db.collection('paperbanana_provider_executions').findOne({ _id: original.jobId })
    assert.deepEqual([execution.recovery.canResume, execution.recovery.action, execution.recovery.requestState, execution.recovery.billingStatus], [false, 'change_input', 'not_sent', 'not_called'])
  } finally { await runtime.close() }
})

test('new models retain paid-call checkpoints even for old clients without thinkingConfig', async () => {
  for (const [provider, model] of [['openai', 'gpt-6-sol'], ['openai', 'gpt-6-luna'], ['anthropic', 'claude-opus-5-5'], ['openrouter', 'anthropic/claude-opus-5.5']]) {
    const f = fixture(), original = task('refresh-' + model, false)
    original.routeSecrets = { [provider]: 'fixture-private-key' }
    original.body = { ...original.body, provider, mainModelName: model }
    await f.addJob(original)
    let calls = 0
    const descriptor = ['text', provider, model, 'system', 'user']
    await assert.rejects(f.workflow.run(original, async () => {
      assert.equal(f.workflow.active(), true)
      assert.equal(f.workflow.thinking(), undefined)
      await f.workflow.call(descriptor, async () => { calls++; return 'saved' })
      await f.workflow.call([...descriptor, 'next'], async () => { throw refused() })
    }), { status: 402 })
    const restarted = f.restart()
    await restarted.resume(original.jobId, 'thinking-owner', async resumed => {
      assert.equal(resumed.body.mainModelName, model)
      assert.equal(resumed.body.thinkingSnapshot, undefined)
      await restarted.run(resumed, async () => {
        assert.equal(await restarted.call(descriptor, async () => { calls++; return 'must not run' }), 'saved')
      })
    })
    assert.equal(calls, 1)
  }
})

test('new model transport with unknown result is not replayed after process restart', async () => {
  const f = fixture(), original = task('refresh-unknown', false)
  original.body = { ...original.body, configurationMode: 'advanced', modelRoutes: { main: { accessProvider: 'openai', modelId: 'gpt-6-luna' } } }
  await f.addJob(original)
  let calls = 0
  await assert.rejects(f.workflow.run(original, () => f.workflow.call(['text', 'openai', 'gpt-6-luna'], async () => { calls++; throw new Error('fixture reply lost') })), /reply lost/)
  const restarted = f.restart()
  await restarted.reconcile(original.jobId)
  await assert.rejects(restarted.resume(original.jobId, 'thinking-owner', async () => { calls++ }), { status: 409 })
  assert.equal(calls, 1)
})
