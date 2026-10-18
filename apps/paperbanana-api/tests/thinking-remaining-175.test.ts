import test from 'node:test'
import assert from 'node:assert/strict'
import { applyThinkingSnapshot, applyThinkingTransport, compileThinkingSelection, thinkingProfile } from '../../../packages/api/src/thinking.js'
import { createRefineRuntime } from '../../../test-support/refine-runtime.mjs'

const switches = [
  ['bailian', 'qwen3.6-27b', 'bailian-openai-chat', 'enable_thinking', [true, false]],
  ['bailian', 'qwen3.5-plus-2026-04-20', 'bailian-openai-chat', 'enable_thinking', [true, false]],
  ['tokenhub', 'deepseek/deepseek-flash', 'openai-chat-completions', 'thinking.type', ['enabled', 'disabled']],
  ['tokenhub', 'deepseek/deepseek-v4-flash-vision-exp', 'openai-chat-completions', 'thinking.type', ['enabled', 'disabled']],
] as const
const get = (body: any, path: string) => path.split('.').reduce((value, key) => value?.[key], body)

test('new channel switches validate exact wire types and keep output and sampling limits', () => {
  for (const [provider, modelId, protocol, field, values] of switches) for (const role of ['main', 'vision'] as const) {
    const identity = { provider, modelId, protocol }
    const body = { model: modelId, messages: [], max_tokens: 256, temperature: 0.5, top_p: 0.9 }
    for (const mode of values) {
      const snapshot = compileThinkingSelection({ ...identity, options: { mode } }, role)
      const request = JSON.parse(String(applyThinkingTransport('https://fixture.example/v1/chat/completions', { method: 'POST', body: JSON.stringify(body) }, snapshot)?.body))
      assert.equal(get(request, field), mode)
      assert.deepEqual({ ...request, enable_thinking: undefined, thinking: undefined }, { ...body, enable_thinking: undefined, thinking: undefined })
    }
    assert.deepEqual(applyThinkingSnapshot(body, compileThinkingSelection({ ...identity, options: {} }, role)), body)
    assert.deepEqual(applyThinkingSnapshot(body), body, 'legacy request has no new override')
    for (const options of [{ effort: 'high' }, { budget: 65536 }, { mode: 'false' }] as Record<string, string | number | boolean>[]) {
      assert.throws(() => compileThinkingSelection({ ...identity, options }, role))
    }
    assert.throws(() => compileThinkingSelection({ ...identity, protocol: 'openai-responses', options: { mode: values[0] } }, role))
    assert.throws(() => compileThinkingSelection({ ...identity, options: { mode: values[0] } }, 'image'))
  }
  // Neither a neighbouring snapshot nor another channel inherits this binding.
  assert.throws(() => compileThinkingSelection({ provider: 'bailian', modelId: 'qwen3.5-plus-2026-04-21', protocol: 'bailian-openai-chat', options: { mode: true } }, 'main'))
  assert.throws(() => compileThinkingSelection({ provider: 'tokendance', modelId: 'qwen3.6-27b', protocol: 'openai-chat-completions', options: { mode: true } }, 'main'))
})

test('actual Bailian text and vision adapters send switches over SSE and return only visible text', async () => {
  const runtime: any = await createRefineRuntime()
  let snapshot: any, captured: any[] = []
  try {
    runtime.legacy.configureProviderWorkflow({ ...runtime.workflow, active: () => true, key: async () => 'fixture-key', call: async (_d: any, fn: any) => fn(), thinking: () => snapshot, record: async () => {} })
    runtime.legacy.configureRuntimeFetch(async (_url: any, init: any) => {
      captured.push(JSON.parse(init.body))
      const events = [
        { choices: [{ index: 0, delta: { reasoning_content: 'hidden reasoning' } }] },
        { choices: [{ index: 0, delta: { content: 'Visible answer' }, finish_reason: 'stop' }] },
      ]
      return new Response(events.map(value => `data: ${JSON.stringify(value)}\n\n`).join('') + 'data: [DONE]\n\n', { headers: { 'Content-Type': 'text/event-stream' } })
    })
    for (const modelId of ['qwen3.6-27b', 'qwen3.5-plus-2026-04-20']) for (const role of ['main', 'vision'] as const) for (const mode of [true, false, undefined]) {
      snapshot = compileThinkingSelection({ provider: 'bailian', modelId, protocol: 'bailian-openai-chat', options: mode === undefined ? {} : { mode } }, role)
      captured = []
      const images = role === 'vision' ? [{ filename: 'x.png', mimeType: 'image/png', url: `data:image/png;base64,${runtime.image.toString('base64')}` }] : []
      const result = await runtime.legacy.callTextModel('bailian', modelId, 'fixture-key', 'system', 'user', images, { thinkingRole: role })
      assert.equal(result, 'Visible answer')
      assert.equal(captured.length, 1, 'no automatic retry or inferred request')
      assert.equal(captured[0].stream, true)
      assert.equal(captured[0].enable_thinking, mode)
      assert.equal(captured[0].thinking_budget, undefined)
      assert.equal(captured[0].reasoning_effort, undefined)
    }
  } finally { await runtime.close() }
})

test('verified no-control models preserve normal fields and reject fabricated thinking settings', () => {
  const cases = [
    ['zhipu', 'glm-4v-flash', 'main', 'openai-chat-completions'],
    ['zhipu', 'glm-4v-flash', 'vision', 'openai-chat-completions'],
    ['mistral', 'mistral-large-2512', 'main', 'openai-chat-completions'],
    ['mistral', 'mistral-large-2512', 'vision', 'openai-chat-completions'],
    ...['doubao-seedream-5-0-260128', 'doubao-seedream-4-5-251128', 'doubao-seedream-4-0-250828', 'doubao-seedream-5-0-flash-260915'].map(model => ['ark', model, 'image', 'ark-images']),
    ...['openai/gpt-image-2', 'google/gemini-3-pro-image', 'Qwen/Qwen-Image-2.0', 'google/imagen-4.0-fast', 'google/imagen-4.0-preview', 'google/imagen-4.0-ultra', 'prunaai/p-image-ideogram'].map(model => ['together', model, 'image', 'provider-images']),
  ]
  for (const [provider, modelId, role, protocol] of cases) {
    assert.equal(thinkingProfile(provider, modelId, role as any, protocol).status, 'unsupported')
    const body = { model: modelId, prompt: 'fixture', width: 1024, height: 1024, steps: 28, guidance_scale: 7.5, max_tokens: 256, optimize_prompt_options: { mode: 'standard' } }
    const selection = { provider, modelId, protocol, options: {} }
    assert.deepEqual(applyThinkingSnapshot(body, compileThinkingSelection(selection, role as any)), body)
    for (const options of [{ mode: true }, { effort: 'high' }, { budget: 100 }] as Record<string, string | number | boolean>[]) assert.throws(() => compileThinkingSelection({ ...selection, options }, role as any))
  }
  assert.equal(thinkingProfile('together', 'Qwen/Qwen3.7-Max', 'main', 'openai-chat-completions').status, 'unconfirmed')
  assert.equal(thinkingProfile('tokenhub', 'deepseek-v4.1-flash', 'main', 'openai-chat-completions').status, 'unconfirmed')
})
