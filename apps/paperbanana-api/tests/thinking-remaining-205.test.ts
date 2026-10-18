import test from 'node:test'
import assert from 'node:assert/strict'
import { applyThinkingSnapshot, applyThinkingTransport, compileThinkingSelection, thinkingProfile } from '../../../packages/api/src/thinking.js'

const select = (modelId: string, options: any, role: 'main' | 'vision' = 'main') =>
  compileThinkingSelection({ provider: 'tokenhub', modelId, protocol: 'openai-chat-completions', options }, role)
const transport = (body: any, snapshot: any) => JSON.parse(String(applyThinkingTransport(
  'https://tokenhub.tencentmaas.com/v1/chat/completions', { method: 'POST', body: JSON.stringify(body) }, snapshot)?.body))

test('TokenHub K2.8 uses exact effort levels and removes incompatible fixed sampling without raising max_tokens', () => {
  const model = 'kimi-k2.8-preview'
  const body = { model, messages: [], max_tokens: 512, temperature: 0.6, top_p: 0.8, top_k: 20, n: 2, presence_penalty: 1, frequency_penalty: 1, thinking: { type: 'disabled', keep: 'all' }, reasoning_effort: 'low' }
  for (const role of ['main', 'vision'] as const) {
    for (const effort of ['low', 'high', 'max']) assert.deepEqual(transport(body, select(model, { effort }, role)), { model, messages: [], max_tokens: 512, reasoning_effort: effort })
    assert.deepEqual(transport(body, select(model, {}, role)), { model, messages: [], max_tokens: 512 })
    assert.equal(thinkingProfile('tokenhub', model, role, 'openai-chat-completions').controls[0].default, 'max')
    for (const options of [{ effort: 'medium' }, { effort: 'none' }, { effort: 'xhigh' }, { effort: 100 }, { mode: 'disabled' }, { budget: 8192 }]) assert.throws(() => select(model, options, role))
  }
  assert.deepEqual(applyThinkingSnapshot(body), body, 'legacy clients without a snapshot keep their request')
})

test('TokenHub MiMo preserves explicit off sampling and omits provider defaults for each documented role', () => {
  for (const model of ['mimo-v2.5-pro', 'mimo-v2.6-pro', 'mimo-v2.6-flash']) {
    const roles = model === 'mimo-v2.5-pro' ? ['main'] as const : ['main', 'vision'] as const
    const body = { model, messages: [], max_tokens: 512, temperature: 0.6, top_p: 0.8, thinking: { type: 'disabled' } }
    for (const role of roles) {
      assert.deepEqual(transport(body, select(model, { mode: 'enabled' }, role)), { model, messages: [], max_tokens: 512, thinking: { type: 'enabled' } })
      assert.deepEqual(transport(body, select(model, { mode: 'disabled' }, role)), body)
      assert.deepEqual(transport(body, select(model, {}, role)), { model, messages: [], max_tokens: 512 })
      for (const options of [{ mode: true }, { mode: 'auto' }, { effort: 'high' }, { budget: 2048 }]) assert.throws(() => select(model, options, role))
    }
    assert.deepEqual(applyThinkingSnapshot(body), body)
  }
})

test('new TokenHub contracts cannot leak into adjacent IDs, protocols or roles', () => {
  assert.throws(() => select('mimo-v2.5-pro', { mode: 'enabled' }, 'vision'))
  assert.throws(() => select('mimo-v2.6-pro-ultraspeed', { mode: 'enabled' }))
  assert.throws(() => select('kimi-k2.8-preview-new', { effort: 'low' }))
  for (const protocol of ['anthropic-messages', 'openai-responses']) assert.throws(() => compileThinkingSelection({ provider: 'tokenhub', modelId: 'kimi-k2.8-preview', protocol, options: { effort: 'low' } }, 'main'))
  const snapshot = select('kimi-k2.8-preview', { effort: 'low' })
  assert.throws(() => transport({ model: 'kimi-k2.6', messages: [] }, snapshot))
  assert.throws(() => applyThinkingTransport('https://tokenhub.tencentmaas.com/v1/messages', { method: 'POST', body: JSON.stringify({ model: 'kimi-k2.8-preview' }) }, snapshot))
  for (const model of ['deepseek-v4.1-flash', 'step-5-preview']) assert.equal(thinkingProfile('tokenhub', model, 'main', 'openai-chat-completions').status, 'unconfirmed')
  // The subsequent channel review confirms only this exact ID's switch, not Kimi's effort enum.
  assert.throws(() => select('deepseek/deepseek-flash', { effort: 'high' }))
})

test('TokenHub image schema classification does not rewrite prompt optimization, search or image settings', () => {
  for (const modelId of ['hy-image-v3', 'hy-image-v3.5-preview', 'wand-vega-image-lite', 'wand-vega-image-flash', 'wand-vega-image-pro', 'vidu-image-q2', 'seedream-image-v5.0-lite', 'seedream-image-v5.0-pro']) {
    const selection = { provider: 'tokenhub', modelId, protocol: 'provider-images', options: {} }
    assert.equal(thinkingProfile('tokenhub', modelId, 'image', 'provider-images').status, 'unsupported')
    const body = { model: modelId, prompt: 'offline fixture', size: '1024x1024', revise: true, optimize_prompt_options: { mode: 'standard' }, use_search_tool: { value: false } }
    assert.deepEqual(applyThinkingSnapshot(body, compileThinkingSelection(selection, 'image')), body)
    for (const options of [{ mode: true }, { effort: 'high' }, { budget: 1024 }]) assert.throws(() => compileThinkingSelection({ ...selection, options: options as any }, 'image'))
  }
})
