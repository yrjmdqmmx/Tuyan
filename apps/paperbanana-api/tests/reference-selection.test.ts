import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { randomBytes } from 'node:crypto'
import { createRefineRuntime } from '../../../test-support/refine-runtime.mjs'
import { memoryDb } from '../../../test-support/memory-db.mjs'
import { relevantReferenceSelection } from '../../../packages/api/src/reference-selection.js'
import { publicExecutionFailure, atJobStage } from '../../../packages/api/src/execution-errors.js'
import { tokenDanceChatBody, tokenDanceFailure, tokenDanceInputError, tokenDanceResponse } from '../../../packages/api/src/tokendance.js'
import { createProviderWorkflow } from '../src/provider-workflow.js'
import { tokenDanceCipher } from '../src/tokendance-service.js'

const selections = (count: number) => ({ selections: Array.from({ length: count }, (_, i) => ({ id: `ref-${i}`, relevance: 0.95 - i / 100, visualFit: true, contribution: `complementary layout ${i}` })) })
const body = (model = 'qwen3.8-flash') => ({ action: 'createJob', provider: 'tokendance', modelRoutes: {
  main: { accessProvider: 'tokendance', modelId: model }, image: { accessProvider: 'tokendance', modelId: 'seedream-5.0-pro' },
  vision: { accessProvider: 'tokendance', modelId: 'qwen3.8-flash' },
}, methodContent: 'Construct an academic retrieval augmented multi agent workflow with planning and review.', caption: 'A multi-agent framework.',
pipelineMode: 'full', retrievalSetting: 'auto', numCandidates: 1, maxCriticRounds: 0, imageSize: '2K', aspectRatio: '1:1' })

async function seed(r: any, count: number) {
  const rows = []
  for (let i = 0; i < count; i++) {
    const image = await sharp({ create: { width: 80 + i, height: 80, channels: 3, background: { r: 30 + i * 10, g: 100, b: 150 } } }).png().toBuffer()
    const row = { _id: `ref-${i}`, id: `ref-${i}`, taskName: 'diagram', title: `Diagram ${i}`, summary: `Complementary scientific layout ${i}`,
      source: 'paperbanana-bench', corpusVersion: 'zh-CN.v2', imageObjectKey: `library/${i}.png`, imageUrl: `https://fixture.invalid/${i}.png` }
    rows.push(row); r.objects.set(row.imageObjectKey, { bytes: image, mimeType: 'image/png' })
    await r.db.collection('paperbanana_references').insertOne(row)
  }
  return rows
}

test('production regression: 10 auto results fit Qwen 8 or another model 3, then reach generation', async () => {
  for (const [model, limit, uploadedCount] of [['qwen3.8-flash', 8, 0], ['seed-evolving', 3, 0], ['qwen3.8-flash', 0, 2]] as const) {
    const r = await createRefineRuntime({ tokenDance: true, retrievalResponse: selections(10) })
    try {
      await seed(r, 10)
      const auth = await r.post({ action: 'tokenDanceAuthorize' })
      await r.post({ action: 'tokenDanceExchange', state: auth.data.state, code: 'fixture-code' })
      let uploads: any[] = []
      if (uploadedCount) {
        const prepared = await r.post({ action: 'prepareReferenceUpload', files: Array.from({ length: uploadedCount }, (_, i) => ({ filename: `upload-${i}.png`, mimeType: 'image/png', size: r.image.length })) })
        uploads = prepared.data.uploads
        for (const upload of uploads) assert.equal((await fetch(upload.uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'image/png' }, body: new Uint8Array(r.image) })).status, 200)
        assert.equal((await r.post({ action: 'finalizeReferenceUpload', uploads })).data.code, 0)
      }
      const created = await r.post({ ...body(model), referenceImageMode: 'main_model', referenceImages: uploads }); assert.equal(created.data.code, 0, JSON.stringify(created))
      await r.legacy.drainJobAdmission()
      const job = (await r.post({ action: 'getJob', jobId: created.data.jobId })).data.job
      assert.equal(job.status, 'succeeded', JSON.stringify(job))
      assert.equal(job.retrievedReferenceIds.length, limit)
      assert.equal(job.referenceSelection.imageCount, limit + uploadedCount)
      const chats = r.tokenDanceCalls.filter((c: any) => c.url.endsWith('/chat/completions')).map((c: any) => JSON.parse(c.options.body))
      const planner = chats.find((c: any) => Array.isArray(c.messages[1].content))
      assert.equal(planner.messages[1].content.filter((c: any) => c.type === 'image_url').length, limit + uploadedCount)
      if (!uploadedCount) assert.match(chats[0].messages[0].content, /ZERO|NEVER a target/)
      else assert.equal(job.retrievalSetting, 'none', 'existing upload/retrieval UI exclusivity stays authoritative')
      assert.ok(r.tokenDanceCalls.some((c: any) => c.url.endsWith('/images/generations')))
      assert.equal(job.recovery, null)
    } finally { await r.close() }
  }
})

test('no useful references or fewer references than budget never causes quota filling', async () => {
  for (const count of [0, 2]) {
    const r = await createRefineRuntime({ tokenDance: true, retrievalResponse: selections(count) })
    try {
      await seed(r, 10)
      const auth = await r.post({ action: 'tokenDanceAuthorize' }); await r.post({ action: 'tokenDanceExchange', state: auth.data.state, code: 'fixture' })
      const created = await r.post(body()); await r.legacy.drainJobAdmission()
      const job = (await r.post({ action: 'getJob', jobId: created.data.jobId })).data.job
      assert.equal(job.status, 'succeeded', JSON.stringify(job))
      assert.equal(job.retrievedReferenceIds.length, count)
    } finally { await r.close() }
  }
})

test('relevance, visual intent, duplicate source and contribution filtering; malformed output fails closed', () => {
  const candidates = Array.from({ length: 6 }, (_, i) => ({ id: `ref-${i}`, title: `layout ${i}`, imageObjectKey: `image-${i}` }))
  candidates[5].imageObjectKey = candidates[0].imageObjectKey
  const answer = selections(6)
  answer.selections[1].relevance = 0.2; answer.selections[2].visualFit = false
  answer.selections[3].contribution = answer.selections[0].contribution
  answer.selections.push(answer.selections[0])
  assert.deepEqual(relevantReferenceSelection(answer, candidates, 8).map(x => x.id), ['ref-0', 'ref-4'])
  for (const invalid of [null, {}, { ids: ['ref-0'] }, { selections: 'ref-0' }]) assert.deepEqual(relevantReferenceSelection(invalid, candidates, 8), [])
})

test('uploaded and retrieved images share the actual planner budget; corrupted, duplicate bytes and overlarge refs are skipped', async () => {
  const r = await createRefineRuntime()
  try {
    const refs = await seed(r, 10)
    r.objects.set(refs[1].imageObjectKey, r.objects.get(refs[0].imageObjectKey)!)
    r.objects.set(refs[2].imageObjectKey, { bytes: Buffer.from('invalid image'), mimeType: 'image/png' })
    const uploaded = [{ filename: 'upload.png', mimeType: 'image/png', url: `data:image/png;base64,${r.image.toString('base64')}`, size: r.image.length }]
    const result = await r.legacy.preparePlanningReferences(body('seed-evolving'), refs, uploaded)
    assert.equal(result.images.length, 2)
    assert.deepEqual(result.references.map((x: any) => x.id), ['ref-0', 'ref-3'])
    const none = await r.legacy.preparePlanningReferences(body('seed-evolving'), refs, Array(3).fill(uploaded[0]))
    assert.equal(none.references.length, 0)
    assert.throws(() => r.legacy.assertVisionInputBudget('tokendance', 'seed-evolving', Array(4).fill(uploaded[0])), /最多接收 3/)
    assert.throws(() => r.legacy.assertVisionInputBudget('tokendance', 'qwen3.8-flash', [{ url: 'https://fixture.invalid/x', size: 8000001 }]), /单图/)
    assert.throws(() => r.legacy.assertVisionInputBudget('tokendance', 'qwen3.8-flash', Array(4).fill({ url: 'https://fixture.invalid/x', size: 7000000 })), /合计/)
    assert.throws(() => tokenDanceChatBody('seed-evolving', 's', 'u', Array(4).fill(uploaded[0])), (e: any) => e.requestState === 'not_sent')
    assert.equal(r.providerCalls.length, 0)
  } finally { await r.close() }
})

test('Chinese errors retain stage, category and advice without exposing upstream secrets', async () => {
  for (const [error, category] of [
    [tokenDanceInputError('本次合计 9 张图片，上限 8 张。'), 'input'],
    [tokenDanceFailure(403), 'permission'], [tokenDanceFailure(402, 'top_up_balance'), 'balance'],
    [tokenDanceFailure(429, 'rate_limit'), 'rate_limit'], [new DOMException('fixture', 'TimeoutError'), 'timeout'],
    [Object.assign(new Error('fixture-key password=secret https://provider.invalid/?key=abc'), { status: 503 }), 'provider'],
  ] as const) {
    try { await atJobStage('planning', async () => { throw error }) } catch (e) {
      const failure = publicExecutionFailure(e, 1)
      assert.equal(failure.category, category); assert.equal(failure.stageLabel, '图示规划')
      assert.match(failure.message, /失败：/); assert.match(failure.suggestion, /请/)
      assert.doesNotMatch(JSON.stringify(failure), /fixture-key|password=|provider.invalid/)
      assert.match(failure.billingMessage, /账单|记录/)
    }
  }
})

test('local validation keeps completed checkpoints, records no new request, and does not permit blind replay', async () => {
  const db = memoryDb(), cipher = tokenDanceCipher(randomBytes(32).toString('base64'))
  const service = { cipher, accepting: async () => {}, credential: async () => ({ key: 'fixture-key' }) }
  const workflow = createProviderWorkflow({ db: db as any, service: service as any })
  const task = { jobId: 'local-input', kind: 'create', body: { userId: 'fixture-user' }, routeSecrets: { tokendance: 'fixture-key' } }
  await db.collection('paperbanana_jobs').insertOne({ _id: task.jobId, providerCalls: [{ requestedModel: 'qwen3.8-flash' }] })
  await assert.rejects(workflow.run(task, async () => {
    await workflow.call(['selection'], async () => 'saved selected references')
    await workflow.call(['planner'], async () => { throw tokenDanceInputError('合计 9 张图片超过上限。') })
  }))
  const steps = db.collection('paperbanana_provider_steps').rows
  assert.deepEqual(steps.map((x: any) => x.state), ['complete', 'rejected'])
  const execution = db.collection('paperbanana_provider_executions').rows[0]
  assert.equal(execution.recovery.action, 'change_input'); assert.equal(execution.recovery.canResume, false)
  assert.equal(execution.recovery.requestState, 'not_sent'); assert.equal(execution.recovery.billingStatus, 'prior_calls')
  assert.ok(db.collection('paperbanana_provider_step_chunks').rows.length)
  await assert.rejects(workflow.resume(task.jobId, 'fixture-user', async () => assert.fail('must not enqueue')))
})


test('text-only planners consume metadata, and separate vision uploads do not reduce the planner image budget', async () => {
  const r = await createRefineRuntime()
  try {
    const refs = await seed(r, 10)
    const textBody = { ...body(), modelRoutes: { ...body().modelRoutes, main: { accessProvider: 'deepseek', modelId: 'deepseek-chat' } } }
    const text = await r.legacy.preparePlanningReferences(textBody, refs, [])
    assert.equal(text.images.length, 0); assert.equal(text.visual, false)
    const planner = await r.legacy.preparePlanningReferences({ ...body(), referenceImageModeUsed: 'vision_model', referenceImages: Array(8).fill({}) }, refs, [])
    assert.equal(planner.images.length, 8)
    const vanilla = await r.legacy.preparePlanningReferences({ ...body(), pipelineMode: 'vanilla' }, refs, [])
    assert.equal(vanilla.images.length, 0)
  } finally { await r.close() }
})

test('explicit provider rejection and dispatched-but-unknown calls remain distinct across workflow recovery', async () => {
  for (const [error, expectedState, expectedRequest] of [
    [tokenDanceFailure(403), 'rejected', 'rejected'],
    [new Error('fetch failed after dispatch'), 'unknown', 'unknown'],
  ] as const) {
    const db = memoryDb(), cipher = tokenDanceCipher(randomBytes(32).toString('base64'))
    const service = { cipher, accepting: async () => {}, credential: async () => ({ key: 'fixture-key' }) }
    const workflow = createProviderWorkflow({ db: db as any, service: service as any })
    const task = { jobId: expectedState, kind: 'create', body: { userId: 'owner' }, routeSecrets: { tokendance: 'fixture-key' } }
    await db.collection('paperbanana_jobs').insertOne({ _id: task.jobId })
    let dispatched = 0
    await assert.rejects(workflow.run(task, () => workflow.call(['planner'], async () => { dispatched++; throw error })))
    const step = db.collection('paperbanana_provider_steps').rows[0]
    const recovery = db.collection('paperbanana_provider_executions').rows[0].recovery
    assert.equal(step.state, expectedState); assert.equal(recovery.requestState, expectedRequest)
    assert.equal(recovery.canResume, false)
    await assert.rejects(workflow.resume(task.jobId, 'owner', async () => assert.fail('must not replay')))
    assert.equal(dispatched, 1)
  }
})

test('historical 10-vs-8 task gets a read-only Chinese explanation without rewriting uncertain charges', async () => {
  const r = await createRefineRuntime()
  try {
    const original = { _id: 'old-limit-job', userId: 'refine-owner', status: 'failed', error: 'Model execution failed. Please retry.',
      logs: ['ERROR: 本次图像分析输入超过图研的 8 张组合上限。'], stages: [], recovery: { action: 'review_request', canResume: false }, providerCalls: [{ requestedModel: 'qwen3.8-flash' }] }
    await r.db.collection('paperbanana_jobs').insertOne(original)
    const job = (await r.post({ action: 'getJob', jobId: original._id })).data.job
    assert.match(job.error, /图示规划失败.*8 张/)
    assert.equal(job.failure.billingStatus, 'unknown'); assert.equal(job.recovery.canResume, false)
    assert.equal((await r.db.collection('paperbanana_jobs').findOne({ _id: original._id })).error, original.error)
    assert.equal(r.providerCalls.length, 0)
  } finally { await r.close() }
})


test('upgrading request descriptors never silently replays a previously paid v1 checkpoint', async () => {
  const db = memoryDb(), cipher = tokenDanceCipher(randomBytes(32).toString('base64'))
  const service = { cipher, accepting: async () => {}, credential: async () => ({ key: 'fixture-key' }) }
  const workflow = createProviderWorkflow({ db: db as any, service: service as any })
  await db.collection('paperbanana_jobs').insertOne({ _id: 'old-execution', userId: 'owner', stages: [{ id: 'saved-stage' }] })
  await db.collection('paperbanana_provider_executions').insertOne({ _id: 'old-execution', userId: 'owner', version: 'tokendance-workflow-v1', state: 'blocked', recovery: { canResume: true }, secret: 'encrypted-old-snapshot' })
  await db.collection('paperbanana_provider_steps').insertOne({ _id: 'old-planner', userId: 'owner', jobId: 'old-execution', state: 'complete' })
  await assert.rejects(workflow.resume('old-execution', 'owner', async () => assert.fail('never replay')), /旧执行版本/)
  const job = db.collection('paperbanana_jobs').rows[0]
  assert.equal(job.recovery.canResume, false); assert.match(job.recovery.message, /已保留成功步骤/)
  assert.equal(job.stages[0].id, 'saved-stage')
  assert.equal(db.collection('paperbanana_provider_steps').rows[0].state, 'complete')
})


test('transport disconnects and timeouts use different Chinese categories and never resend a paid request', async () => {
  for (const [problem, category] of [[new TypeError('fetch failed; Bearer fixture-sensitive'), 'network'], [new DOMException('fixture-sensitive', 'TimeoutError'), 'timeout']] as const) {
    let requests = 0
    await assert.rejects(tokenDanceResponse((async () => { requests++; throw problem }) as any, '/gateway/openai/v1/chat/completions', 'fixture-key', { model: 'fixture' }), (error: any) => {
      const failure = publicExecutionFailure(error)
      assert.equal(failure.category, category); assert.equal(failure.requestState, 'unknown')
      assert.equal(failure.billingStatus, 'unknown'); assert.doesNotMatch(JSON.stringify(failure), /fixture-sensitive|fixture-key/)
      return true
    })
    assert.equal(requests, 1)
  }
})


test('reference selection, prepared bytes and completed planner survive balance recovery without repeated calls', async () => {
  const r = await createRefineRuntime({ tokenDance: true, retrievalResponse: selections(2) })
  try {
    const refs = await seed(r, 2)
    const auth = await r.post({ action: 'tokenDanceAuthorize' }); await r.post({ action: 'tokenDanceExchange', state: auth.data.state, code: 'fixture' })
    r.setTokenDanceFailure('top_up_balance')
    const created = await r.post(body()); assert.equal(created.data.code, 0)
    await r.legacy.drainJobAdmission()
    const before = (await r.post({ action: 'getJob', jobId: created.data.jobId })).data.job
    assert.equal(before.recovery.canResume, true); assert.equal(before.failure.category, 'balance')
    const chats = r.tokenDanceCalls.filter(c => c.url.endsWith('/chat/completions')).length
    assert.ok(chats >= 2)
    // A changed library object must not alter the saved request and cause a new planner charge.
    r.objects.set(refs[0].imageObjectKey, { bytes: Buffer.from('changed-library-object'), mimeType: 'image/png' })
    r.setTokenDanceFailure('')
    await new Promise(resolve => setTimeout(resolve, 1010))
    const resumed = await r.post({ action: 'tokenDanceResume', jobId: created.data.jobId })
    assert.equal(resumed.data.code, 0, JSON.stringify(resumed))
    await r.legacy.drainJobAdmission()
    const after = (await r.post({ action: 'getJob', jobId: created.data.jobId })).data.job
    assert.equal(after.status, 'succeeded', JSON.stringify(after))
    assert.equal(after.failure, null)
    assert.equal(r.tokenDanceCalls.filter(c => c.url.endsWith('/chat/completions')).length, chats)
    assert.deepEqual(after.retrievedReferenceIds, before.retrievedReferenceIds)
    assert.ok(before.stages.every((stage: any) => after.stages.some((saved: any) => saved.id === stage.id)))
  } finally { await r.close() }
})

test('initial rendering and enhancement success or fallback remain separate visible stages', async () => {
  for (const enhancementFails of [false, true]) {
    const r = await createRefineRuntime()
    try {
      let renders = 0
      r.legacy.configureRuntimeFetch(async (input: any) => {
        const url = String(input)
        if (url.endsWith('/models')) return Response.json({ data: [] })
        if (url.endsWith('/responses') || url.endsWith('/chat/completions')) return Response.json({ output_text: 'A scientific workflow with clear labels and arrows.', choices: [{ message: { content: 'A scientific workflow with clear labels and arrows.' } }] })
        if (/\/images\/(generations|edits)$/.test(url)) {
          renders++
          if (enhancementFails && renders === 2) return Response.json({ error: { message: 'enhancement rejected' } }, { status: 400 })
          return Response.json({ data: [{ b64_json: r.output.toString('base64') }] })
        }
        throw new Error('Unexpected fixture request')
      })
      const created = await r.post({ action: 'createJob', provider: 'openai', apiKeys: { openai: 'fixture-key' },
        mainModelName: 'gpt-5.6-sol', imageModelName: 'gpt-image-2', referenceVisionModelName: 'gpt-5.6-sol',
        methodContent: 'A sufficiently detailed methodology for a scientific workflow diagram.', caption: 'Workflow.',
        outputFormat: 'png', pipelineMode: 'planner_critic', retrievalSetting: 'none', maxCriticRounds: 0, numCandidates: 1, imageSize: '2K' })
      assert.equal(created.data.code, 0, JSON.stringify(created))
      await r.legacy.drainJobAdmission()
      const job = (await r.post({ action: 'getJob', jobId: created.data.jobId })).data.job
      assert.equal(job.status, 'succeeded', JSON.stringify(job))
      assert.equal(renders, 2)
      const stages = job.stages.filter((stage: any) => stage.type === 'render')
      assert.equal(stages.length, 2)
      assert.equal(stages[0].title, '初次渲染')
      assert.match(stages[1].title, enhancementFails ? /精修放大.*已回退/ : /精修放大（2K）/)
      assert.equal(Boolean(stages[1].error), enhancementFails)
      if (!enhancementFails) assert.ok(stages[1].image)
    } finally { await r.close() }
  }
})

test('SVG generation failure reports rendering after a successful saved plan', async () => {
  const r = await createRefineRuntime()
  try {
    let calls = 0
    r.legacy.configureRuntimeFetch(async (input: any) => {
      const url = String(input)
      if (url.endsWith('/models')) return Response.json({ data: [] })
      assert.ok(url.endsWith('/responses') || url.endsWith('/chat/completions'))
      calls++
      return calls === 1 ? Response.json({ output_text: 'A clear scientific diagram with labeled stages.', choices: [{ message: { content: 'A clear scientific diagram with labeled stages.' } }] })
        : Response.json({ error: { message: 'SVG provider failure' } }, { status: 400 })
    })
    const created = await r.post({ action: 'createJob', provider: 'openai', apiKeys: { openai: 'fixture-key' },
      mainModelName: 'gpt-5.6-sol', imageModelName: 'gpt-image-2', referenceVisionModelName: 'gpt-5.6-sol',
      methodContent: 'A sufficiently detailed methodology for an SVG workflow diagram.', caption: 'Workflow.',
      outputFormat: 'svg', pipelineMode: 'planner_critic', retrievalSetting: 'none', maxCriticRounds: 0, numCandidates: 1 })
    assert.equal(created.data.code, 0, JSON.stringify(created))
    await r.legacy.drainJobAdmission()
    const job = (await r.post({ action: 'getJob', jobId: created.data.jobId })).data.job
    assert.equal(job.status, 'failed'); assert.equal(job.failure.stage, 'rendering')
    assert.match(job.error, /图像生成失败/)
    assert.equal(job.stages.filter((stage: any) => stage.type === 'planner').length, 1)
  } finally { await r.close() }
})

test('incompatible queued or expired running jobs become visibly failed while live leases stay active', async () => {
  const db = memoryDb(), cipher = tokenDanceCipher(randomBytes(32).toString('base64'))
  const workflow = createProviderWorkflow({ db: db as any, now: () => 100000,
    service: { cipher, accepting: async () => {}, credential: async () => ({ key: 'fixture-key' }) } as any })
  for (const [id, state, leaseUntil] of [['queued', 'queued', 0], ['expired', 'running', 99999], ['live', 'running', 100001]] as const) {
    await db.collection('paperbanana_jobs').insertOne({ _id: id, userId: 'owner', status: state, stages: [{ id: 'saved-plan' }] })
    await db.collection('paperbanana_provider_executions').insertOne({ _id: id, userId: 'owner', version: 'tokendance-workflow-v1', state, leaseUntil: new Date(leaseUntil) })
  }
  await workflow.reconcileUser('owner')
  for (const id of ['queued', 'expired']) {
    const job = await db.collection('paperbanana_jobs').findOne({ _id: id })
    assert.equal(job.status, 'failed'); assert.equal(job.recovery.canResume, false)
    assert.match(job.error, /旧执行版本/); assert.equal(job.stages[0].id, 'saved-plan')
  }
  assert.equal((await db.collection('paperbanana_jobs').findOne({ _id: 'live' })).status, 'running')
})
