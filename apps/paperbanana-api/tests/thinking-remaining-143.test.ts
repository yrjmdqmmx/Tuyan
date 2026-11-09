import test from 'node:test'
import assert from 'node:assert/strict'
import { applyThinkingSnapshot, compileThinkingSelection } from '../../../packages/api/src/thinking.js'
import { createRefineRuntime } from '../../../test-support/refine-runtime.mjs'

const identity = { provider: 'iflytek', modelId: 'xopkimik25', protocol: 'openai-chat-completions' }

test('MaaS Kimi switch is boolean and isolated by service ID, role and protocol', () => {
  for (const role of ['main', 'vision'] as const) {
    const body = { model: identity.modelId, messages: [], temperature: 0.5, top_p: 0.9, max_tokens: 256 }
    for (const mode of [true, false]) {
      assert.deepEqual(applyThinkingSnapshot(body, compileThinkingSelection({ ...identity, options: { mode } }, role)), { ...body, enable_thinking: mode })
    }
    assert.deepEqual(applyThinkingSnapshot(body, compileThinkingSelection({ ...identity, options: {} }, role)), body)
    assert.deepEqual(applyThinkingSnapshot(body), body)
    for (const options of [{ mode: 'false' }, { mode: 1 }, { effort: 'high' }, { budget: 1024 }]) {
      assert.throws(() => compileThinkingSelection({ ...identity, options } as any, role))
    }
    for (const modelId of ['xopkimik26', 'xopkimik27code', 'kimi-k2.5']) {
      assert.throws(() => compileThinkingSelection({ ...identity, modelId, options: { mode: true } }, role))
    }
    assert.throws(() => compileThinkingSelection({ ...identity, protocol: 'anthropic-messages', options: { mode: true } }, role))
  }
  assert.throws(() => compileThinkingSelection({ ...identity, options: { mode: true } }, 'image'))
})

test('MaaS documented effort explicitly enables thinking while defaults and adjacent identities stay unchanged', () => {
  for (const modelId of ['xopglm52', 'xopdeepseekv4pro']) {
    const compile = (options: any) => compileThinkingSelection({ ...identity, modelId, options }, 'main')
    const body = { model: modelId, temperature: 0.5, top_p: 0.9, max_tokens: 256 }
    for (const effort of ['high', 'max']) {
      assert.deepEqual(applyThinkingSnapshot(body, compile({ effort })), { ...body, reasoning_effort: effort, enable_thinking: true })
    }
    assert.deepEqual(compile({}).wire, {})
    assert.deepEqual(applyThinkingSnapshot({ ...body, reasoning_effort: 'max', enable_thinking: true }, compile({})), body)
    assert.deepEqual(applyThinkingSnapshot(body), body)
    for (const options of [{ effort: 'none' }, { effort: 'low' }, { effort: 'xhigh' }, { effort: 'max', mode: false }, { budget: 4096 }]) assert.throws(() => compile(options))
    for (const role of ['vision', 'image'] as const) assert.throws(() => compileThinkingSelection({ ...identity, modelId, options: { effort: 'high' } }, role))
    assert.throws(() => compileThinkingSelection({ ...identity, modelId, protocol: 'anthropic-messages', options: { effort: 'high' } }, 'main'))
  }
  for (const modelId of ['xopglm53', 'xopglm51', 'xopdeepseekv4pro0813', 'xopdeepseekv4flash']) {
    assert.deepEqual(compileThinkingSelection({ ...identity, modelId, options: {} }, 'main').wire, {})
    assert.throws(() => compileThinkingSelection({ ...identity, modelId, options: { effort: 'high' } }, 'main'))
  }
})

test('actual MaaS text and vision adapter sends exact switch on existing v2 route without adding other controls', async () => {
  const r: any = await createRefineRuntime()
  let snapshot: any, captured: any[] = []
  try {
    r.legacy.configureProviderWorkflow({ ...r.workflow, active: () => true, key: async () => 'fixture-key', call: async (_d: any, fn: any) => fn(), thinking: () => snapshot, record: async () => {} })
    r.legacy.configureRuntimeFetch(async (url: any, init: any) => {
      captured.push({ url: String(url), body: JSON.parse(init.body) })
      return Response.json({ choices: [{ finish_reason: 'stop', message: { content: 'Visible answer', reasoning_content: 'hidden reasoning' } }] })
    })
    for (const role of ['main', 'vision'] as const) {
      let baseline: any
      for (const mode of [undefined, true, false]) {
        snapshot = mode === undefined ? undefined : compileThinkingSelection({ ...identity, options: { mode } }, role)
        captured = []
        const images = role === 'vision' ? [{ filename: 'x.png', mimeType: 'image/png', url: `data:image/png;base64,${r.image.toString('base64')}` }] : []
        assert.equal(await r.legacy.callTextModel(identity.provider, identity.modelId, 'fixture-key', 'system', 'user', images, { thinkingRole: role }), 'Visible answer')
        assert.equal(captured.length, 1, 'no automatic retry')
        const { url, body } = captured[0]
        assert.equal(url, 'https://maas-api.cn-huabei-1.xf-yun.com/v2/chat/completions')
        assert.equal(body.model, identity.modelId)
        assert.equal(body.enable_thinking, mode)
        assert.equal(body.reasoning_effort, undefined)
        assert.equal(body.thinking_budget, undefined)
        if (mode === undefined) baseline = body
        else assert.deepEqual(body, { ...baseline, enable_thinking: mode }, 'preserve existing sampling, output and multimodal payload')
      }
    }
    for (const modelId of ['xopglm52', 'xopdeepseekv4pro']) {
      let baseline: any
      for (const effort of [undefined, 'high', 'max']) {
        snapshot = effort === undefined ? undefined : compileThinkingSelection({ ...identity, modelId, options: { effort } }, 'main')
        captured = []
        assert.equal(await r.legacy.callTextModel(identity.provider, modelId, 'fixture-key', 'system', 'user', [], { thinkingRole: 'main' }), 'Visible answer')
        assert.equal(captured.length, 1)
        const { url, body } = captured[0]
        assert.equal(url, 'https://maas-api.cn-huabei-1.xf-yun.com/v2/chat/completions')
        assert.equal(body.model, modelId)
        if (effort === undefined) baseline = body
        else assert.deepEqual(body, { ...baseline, reasoning_effort: effort, enable_thinking: true }, 'explicit effort activates thinking without changing sampling or output limits')
      }
    }
  } finally { await r.close() }
})
