import test from 'node:test'
import assert from 'node:assert/strict'
import { applyThinkingSnapshot, compileThinkingSelection, thinkingProfile } from '../../../packages/api/src/thinking.js'
import { createRefineRuntime } from '../../../test-support/refine-runtime.mjs'

const cases = [
  { modelId: 'unisound/unisound-u2', values: ['enabled', 'disabled'], wire: (mode: any) => ({ thinking: { type: mode } }) },
  { modelId: 'vanchin/deepseek-v4-pro-0813', values: [true, false], wire: (mode: any) => ({ enable_thinking: mode }) },
] as const
const identity = (modelId: string) => ({ provider: 'bailian', modelId, protocol: 'bailian-openai-chat' })
const localFailure = (error: any) => error.businessCode === 'THINKING_CONFIG_INVALID' && error.requestState === 'not_sent'

test('exact supplier switches preserve normal fields and leave legacy/default requests untouched', () => {
  for (const entry of cases) {
    const body = { model: entry.modelId, messages: [], max_tokens: 256, temperature: 0.5, top_p: 0.9, stream: true }
    for (const mode of entry.values) {
      const snapshot = compileThinkingSelection({ ...identity(entry.modelId), options: { mode } }, 'main')
      assert.deepEqual(snapshot.wire, entry.wire(mode))
      assert.deepEqual(applyThinkingSnapshot(body, snapshot), { ...body, ...entry.wire(mode) })
    }
    assert.deepEqual(applyThinkingSnapshot(body, compileThinkingSelection({ ...identity(entry.modelId), options: {} }, 'main')), body)
    assert.deepEqual(applyThinkingSnapshot(body), body)
    for (const options of [{ mode: 'false' }, { effort: 'xhigh' }, { effort: 'high' }, { budget: 65536 }] as Record<string, string | number | boolean>[]) {
      assert.throws(() => compileThinkingSelection({ ...identity(entry.modelId), options }, 'main'), localFailure)
    }
    for (const role of ['vision', 'image'] as const) assert.throws(() => compileThinkingSelection({ ...identity(entry.modelId), options: { mode: entry.values[0] } }, role), localFailure)
    assert.throws(() => compileThinkingSelection({ ...identity(entry.modelId), protocol: 'openai-chat-completions', options: { mode: entry.values[0] } }, 'main'), localFailure)
  }
  assert.throws(() => compileThinkingSelection({ ...identity('unisound/unisound-u2'), options: { mode: false } }, 'main'), localFailure)
  assert.throws(() => compileThinkingSelection({ ...identity('vanchin/deepseek-v4-pro-0813'), options: { mode: 'disabled' } }, 'main'), localFailure)
  assert.throws(() => compileThinkingSelection({ ...identity('vanchin/deepseek-v4-pro-0814'), options: { mode: true } }, 'main'), localFailure)
  assert.throws(() => compileThinkingSelection({ provider: 'qianfan', modelId: 'deepseek-v4-pro-0813', protocol: 'openai-chat-completions', options: { mode: true } }, 'main'), localFailure)
})

test('actual Bailian adapter emits the supplier-specific wire shape, SSE visible text, and no inferred budgets', async () => {
  const runtime: any = await createRefineRuntime()
  let snapshot: any, captured: any[] = []
  try {
    runtime.legacy.configureProviderWorkflow({ ...runtime.workflow, active: () => true, key: async () => 'fixture-key', call: async (_d: any, fn: any) => fn(), thinking: () => snapshot, record: async () => {} })
    runtime.legacy.configureRuntimeFetch(async (url: any, init: any) => {
      captured.push({ url, body: JSON.parse(init.body) })
      return new Response([
        { choices: [{ index: 0, delta: { reasoning_content: 'fixture reasoning' } }] },
        { choices: [{ index: 0, delta: { content: 'Visible fixture' }, finish_reason: 'stop' }] },
      ].map(value => `data: ${JSON.stringify(value)}\n\n`).join('') + 'data: [DONE]\n\n', { headers: { 'Content-Type': 'text/event-stream' } })
    })
    for (const entry of cases) for (const mode of [...entry.values, undefined]) {
      snapshot = compileThinkingSelection({ ...identity(entry.modelId), options: mode === undefined ? {} : { mode } }, 'main')
      captured = []
      assert.equal(await runtime.legacy.callTextModel('bailian', entry.modelId, 'fixture-key', 'system', 'user', [], { thinkingRole: 'main' }), 'Visible fixture')
      assert.equal(captured.length, 1)
      const { body, url } = captured[0]
      assert.equal(url, 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions')
      assert.equal(body.model, entry.modelId)
      assert.equal(body.stream, true)
      const fields = Object.fromEntries(['thinking', 'enable_thinking'].filter(k => k in body).map(k => [k, body[k]]))
      assert.deepEqual(fields, mode === undefined ? {} : entry.wire(mode))
      for (const field of ['reasoning_effort', 'thinking_budget', 'extra_body']) assert.equal(body[field], undefined)
    }
  } finally { await runtime.close() }
})

test('Vanchin V3 has no control; unresolved exact IDs retain their evidence boundary', () => {
  assert.equal(thinkingProfile('bailian', 'vanchin/deepseek-v3', 'main', 'bailian-openai-chat').status, 'unsupported')
  const request = { model: 'vanchin/deepseek-v3', max_tokens: 256, temperature: 0.3 }
  assert.deepEqual(applyThinkingSnapshot(request, compileThinkingSelection({ ...identity(request.model), options: {} }, 'main')), request)
  assert.throws(() => compileThinkingSelection({ ...identity(request.model), options: { mode: true } }, 'main'), localFailure)
  for (const modelId of ['deepseek-v3', 'qwen3-coder-flash', 'qwen3-max-2025-09-23']) assert.equal(thinkingProfile('bailian', modelId, 'main', 'bailian-openai-chat').status, 'unconfirmed')
  // Qwen3.5-27B and ERNIE-5.1 were subsequently verified; their exact
  // controls and transport are covered by thinking-qianfan-console-23.test.ts.
  for (const modelId of ['deepseek-v4-pro-0813', 'deepseek-v4.1-flash', 'ernie-x1.1']) {
    assert.equal(thinkingProfile('qianfan', modelId, 'main', 'openai-chat-completions').status, 'unconfirmed')
    assert.throws(() => compileThinkingSelection({ provider: 'qianfan', modelId, protocol: 'openai-chat-completions', options: { budget: 16384 } }, 'main'), localFailure)
  }
})
