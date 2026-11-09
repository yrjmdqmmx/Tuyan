import test from 'node:test'
import assert from 'node:assert/strict'
import { applyThinkingSnapshot, applyThinkingTransport, compileThinkingSelection, thinkingProfile } from '../../../packages/api/src/thinking.js'

const compile = (modelId: string, options: any) => compileThinkingSelection({ provider: 'together', modelId, protocol: 'openai-chat-completions', options }, 'main')

test('Together V4.1 Flash integer effort is not a token budget and never becomes an automatic maximum', () => {
  const model = 'deepseek-ai/DeepSeek-V4.1-Flash'
  const body = { model, max_tokens: 512, temperature: 0.3, top_p: 0.8, messages: [], reasoning: { enabled: true } }
  for (const effort of [1, 50, 100]) {
    const request = applyThinkingTransport('https://api.together.xyz/v1/chat/completions', { method: 'POST', body: JSON.stringify(body) }, compile(model, { effort }))
    assert.deepEqual(JSON.parse(String(request?.body)), { ...body, reasoning_effort: effort })
  }
  for (const effort of [0, 101, 1.5, NaN, Infinity, '50', 'high', true]) assert.throws(() => compile(model, { effort }))
  assert.deepEqual(compile(model, {}).wire, {})
  assert.deepEqual(applyThinkingSnapshot({ ...body, reasoning_effort: 100 }, compile(model, {})), body)
  assert.deepEqual(applyThinkingSnapshot(body), body)
  assert.throws(() => compile(model, { budget: 100 }))
  assert.throws(() => compile(model, { mode: false }))
})

test('Together exact versions retain different enums, defaults and protocol isolation', () => {
  const models: [string, string[], string | null][] = [
    ['deepseek-ai/DeepSeek-V4-Flash-0731', ['low', 'high', 'max'], null],
    ['Qwen/Qwen3.8-2.4T-A95B', ['low', 'high', 'xhigh'], 'xhigh'],
    ['Qwen/Qwen3.8-Flash', ['low', 'medium', 'xhigh'], null],
  ]
  for (const [model, efforts, defaultValue] of models) {
    assert.equal(thinkingProfile('together', model, 'main', 'openai-chat-completions').controls[0].default, defaultValue)
    for (const effort of efforts) assert.deepEqual(compile(model, { effort }).wire, { reasoning_effort: effort })
    for (const effort of ['none', 'low', 'medium', 'high', 'xhigh', 'max'].filter(value => !efforts.includes(value))) assert.throws(() => compile(model, { effort }))
    assert.deepEqual(compile(model, {}).wire, {})
    assert.throws(() => compile(model, { mode: false }))
    for (const role of ['vision', 'image'] as const) assert.throws(() => compileThinkingSelection({ provider: 'together', modelId: model, protocol: 'openai-chat-completions', options: { effort: 'low' } }, role))
    assert.throws(() => compileThinkingSelection({ provider: 'together', modelId: model, protocol: 'anthropic-messages', options: { effort: 'low' } }, 'main'))
  }
  assert.throws(() => compile('deepseek-ai/DeepSeek-V4.1-Flash-new', { effort: 50 }))
  assert.throws(() => compileThinkingSelection({ provider: 'fireworks', modelId: 'accounts/fireworks/models/qwen3p8-max', protocol: 'openai-chat-completions', options: { effort: 'xhigh' } }, 'main'))
})

test('Z-Image smart rewriting uses its own boolean and refuses image input without touching generation parameters', () => {
  const select = (options: any) => compileThinkingSelection({ provider: 'bailian', modelId: 'z-image-turbo', protocol: 'bailian-multimodal-generation', options }, 'image')
  const body = { model: 'z-image-turbo', input: { messages: [{ role: 'user', content: [{ text: 'offline fixture' }] }] }, parameters: { n: 1, size: '1024*1024', seed: 1, watermark: false } }
  for (const mode of [true, false]) {
    const request = applyThinkingTransport('https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', { method: 'POST', body: JSON.stringify(body) }, select({ mode }))
    assert.deepEqual(JSON.parse(String(request?.body)), { ...body, parameters: { ...body.parameters, prompt_extend: mode } })
    assert.throws(() => applyThinkingSnapshot({ ...body, input: { messages: [{ content: [{ image: 'fixture://source' }] }] } }, select({ mode })), /带图/)
  }
  assert.deepEqual(select({}).wire, {})
  assert.deepEqual(applyThinkingSnapshot(body, select({})), body)
  assert.deepEqual(applyThinkingSnapshot({ ...body, parameters: { prompt_extend: true } }), { ...body, parameters: { prompt_extend: true } })
  for (const options of [{ mode: 'true' }, { effort: 'high' }, { budget: 100 }]) assert.throws(() => select(options))
})

test('Bailian full image schemas expose no independent thinking controls and retain image parameters', () => {
  const ids = ['wan2.6-image', 'wan2.5-i2i-preview', 'wan2.5-t2i-preview', 'wan2.2-t2i-flash', 'wan2.2-t2i-plus', 'wanx2.0-t2i-turbo', 'wanx2.1-imageedit', 'wanx2.1-t2i-plus', 'wanx2.1-t2i-turbo', 'kling/kling-v3-image-generation', 'kling/kling-v3-omni-image-generation', 'vidu/vidu-image-lite_reference2image', 'vidu/vidu-image-pro_reference2image', 'vidu/vidu-image_reference2image', 'vidu/viduq2-fast_reference2image', 'vidu/viduq2-pro_reference2image', 'vidu/viduq3-fast_reference2image']
  for (const modelId of ids) {
    const p = thinkingProfile('bailian', modelId, 'image', 'bailian-async-images')
    assert.equal(p.status, 'unsupported', modelId)
    const selection = { provider: 'bailian', modelId, protocol: 'bailian-async-images', options: {} }
    const body = { model: modelId, parameters: { prompt_extend: true, seed: 42, n: 1 } }
    assert.deepEqual(applyThinkingSnapshot(body, compileThinkingSelection(selection, 'image')), body)
    assert.throws(() => compileThinkingSelection({ ...selection, options: { mode: true } }, 'image'))
  }
  for (const modelId of ['qwen-long', 'qwen-max']) assert.equal(thinkingProfile('bailian', modelId, 'main', 'bailian-openai-chat').statusReason, 'non-thinking-only')
  assert.equal(thinkingProfile('bailian', 'qwen-long-latest', 'main', 'bailian-openai-chat').status, 'unconfirmed')
  assert.equal(thinkingProfile('bailian', 'wan2.6-t2i', 'image', 'bailian-multimodal-generation').status, 'unsupported')
})

test('Retired Ark and out-of-scope Batch IDs cannot gain controls from historical documentation', () => {
  for (const modelId of ['deepseek-v4-flash-260425', 'doubao-seed-1-6-250615', 'doubao-1-5-lite-32k-250115', 'glm-4-7-251222']) {
    assert.equal(thinkingProfile('ark', modelId, 'main', 'ark-openai-chat').statusReason, 'catalog-retired')
    assert.throws(() => compileThinkingSelection({ provider: 'ark', modelId, protocol: 'ark-openai-chat', options: { mode: 'disabled' } }, 'main'))
  }
  assert.throws(() => compileThinkingSelection({ provider: 'openrouter', modelId: 'openai/gpt-6-astra:batch', protocol: 'openrouter-chat-completions', options: { effort: 'high' } }, 'main'))
})
