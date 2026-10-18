import test from 'node:test'
import assert from 'node:assert/strict'
import { applyThinkingSnapshot, applyThinkingTransport, compileThinkingSelection, thinkingProfile } from '../../../packages/api/src/thinking.js'
// @ts-expect-error Generated browser catalog independently controls availability.
import { STATIC_MODEL_REGISTRY } from '../../web/src/lib/staticModelCatalog.js'

const select = (provider: string, modelId: string, options: any, role: any = 'main', protocol = provider === 'bailian' ? 'bailian-openai-chat' : 'openai-chat-completions') =>
  compileThinkingSelection({ provider, modelId, protocol, options }, role)
const transport = (body: any, snapshot: any) => JSON.parse(String(applyThinkingTransport(
  'https://fixture.example/v1/chat/completions', { method: 'POST', body: JSON.stringify(body) }, snapshot)?.body))

test('Bailian switches use booleans, preserve sampling/output limits, and reject undocumented budgets', () => {
  for (const model of ['xiaomi/mimo-v2.5-pro', 'qwen3-vl-flash']) {
    const roles = model.startsWith('xiaomi') ? ['main'] : ['main', 'vision']
    const body = { model, messages: [], max_tokens: 512, temperature: 0.5, top_p: 0.9, enable_thinking: true, thinking_budget: 300, reasoning_effort: 'high' }
    for (const role of roles) {
      for (const mode of [true, false]) assert.deepEqual(transport(body, select('bailian', model, { mode }, role)), { model, messages: [], max_tokens: 512, temperature: 0.5, top_p: 0.9, enable_thinking: mode })
      assert.deepEqual(transport(body, select('bailian', model, {}, role)), { model, messages: [], max_tokens: 512, temperature: 0.5, top_p: 0.9 })
      for (const options of [{ mode: 'enabled' }, { mode: 'false' }, { budget: 81920 }, { effort: 'high' }]) assert.throws(() => select('bailian', model, options, role))
    }
    assert.deepEqual(applyThinkingSnapshot(body), body, 'legacy requests do not acquire a new override')
  }
  assert.throws(() => select('bailian', 'xiaomi/mimo-v2.5-pro', { mode: true }, 'vision'))
  assert.throws(() => select('bailian', 'qwen3-vl-flash', { mode: true }, 'main', 'openai-responses'))
})

test('Mistral aliases accept none/high without inventing off or automatically selecting a default', () => {
  for (const model of ['mistral-medium-3', 'mistral-medium-latest']) for (const role of ['main', 'vision']) {
    const body = { model, messages: [], max_tokens: 512, reasoning_effort: 'high' }
    for (const effort of ['none', 'high']) assert.deepEqual(transport(body, select('mistral', model, { effort }, role)), { ...body, reasoning_effort: effort })
    assert.deepEqual(transport(body, select('mistral', model, {}, role)), { model, messages: [], max_tokens: 512 })
    for (const options of [{ mode: false }, { effort: 'low' }, { effort: 'max' }, { budget: 500 }]) assert.throws(() => select('mistral', model, options, role))
    assert.equal(thinkingProfile('mistral', model, role, 'openai-chat-completions').statusReason, 'minimal-reasoning-output')
  }
  assert.throws(() => select('mistral', 'mistral-medium-2505', { effort: 'high' }))
})

test('DeepSeek documented old aliases preserve effective top_p and cannot reopen catalog selection', () => {
  for (const model of ['deepseek-v4-flash', 'deepseek-v4-flash-vision-exp']) {
    const roles = model.endsWith('exp') ? ['main', 'vision'] : ['main']
    const body = { model, messages: [], max_tokens: 512, temperature: 0.5, top_p: 0.98, frequency_penalty: 0.2, presence_penalty: 0.1, thinking: { type: 'disabled' } }
    for (const role of roles) {
      for (const effort of ['low', 'high', 'max']) assert.deepEqual(transport(body, select('deepseek', model, { effort }, role)), { model, messages: [], max_tokens: 512, top_p: 0.98, reasoning_effort: effort })
      assert.deepEqual(transport(body, select('deepseek', model, { effort: 'none' }, role)), { model, messages: [], max_tokens: 512, temperature: 0.5, top_p: 0.98, frequency_penalty: 0.2, presence_penalty: 0.1, reasoning_effort: 'none' })
      for (const options of [{ mode: false }, { effort: 'medium' }, { effort: 'xhigh' }, { budget: 256 }]) assert.throws(() => select('deepseek', model, options, role))
      assert.equal(select('deepseek', model, {}, role).modelId, model)
    }
    assert.equal(STATIC_MODEL_REGISTRY.deepseek.models.find((entry: any) => entry.id === model)?.selectable, false)
  }
  assert.throws(() => select('deepseek', 'deepseek-v4-flash', { effort: 'high' }, 'vision'))
  assert.throws(() => select('tokenhub', 'deepseek/deepseek-flash', { effort: 'high' }))
})

test('non-thinking and fixed thinking models do not expose invented controls or rewrite ordinary fields', () => {
  const cases = [
    ...['qwen3-235b-a22b-instruct-2507', 'qwen3-30b-a3b-instruct-2507', 'qwen3-next-80b-a3b-instruct'].map(model => ['bailian', model, 'unsupported']),
    ...['glm-4-flash-250414', 'glm-4-flashx-250414'].map(model => ['zhipu', model, 'unsupported']),
    ...['glm-4.1v-thinking-flash', 'glm-4.1v-thinking-flashx'].map(model => ['zhipu', model, 'fixed']),
  ]
  for (const [provider, model, status] of cases) {
    const protocol = provider === 'bailian' ? 'bailian-openai-chat' : 'openai-chat-completions'
    assert.equal(thinkingProfile(provider, model, 'main', protocol).status, status)
    const body = { model, messages: [], max_tokens: 512, temperature: 0.5 }
    assert.deepEqual(applyThinkingSnapshot(body, select(provider, model, {})), body)
    for (const options of [{ mode: false }, { effort: 'high' }, { budget: 128 }]) assert.throws(() => select(provider, model, options))
  }
})

test('image classification preserves optimization parameters and retired IDs remain without controls', () => {
  for (const [provider, model, protocol] of [['ark', 'doubao-seedream-5-0-pro-260628', 'ark-images'], ['bailian', 'wanx-v1', 'bailian-async-images']]) {
    assert.equal(thinkingProfile(provider, model, 'image', protocol).status, 'unsupported')
    const body = { model, prompt: 'fixture', size: '1024x1024', optimize_prompt_options: { mode: 'fast' }, parameters: { ref_strength: 0.5 } }
    assert.deepEqual(applyThinkingSnapshot(body, select(provider, model, {}, 'image', protocol)), body)
    assert.throws(() => select(provider, model, { effort: 'high' }, 'image', protocol))
  }
  for (const [provider, model, role, protocol] of [['stepfun', 'step-2x-large', 'image', 'stepfun-images-json'], ['stepfun', 'step-image-edit-2', 'image', 'stepfun-images-multipart'], ['mistral', 'labs-leanstral-1-5', 'main', 'openai-chat-completions']]) {
    const p = thinkingProfile(provider, model, role, protocol)
    assert.equal(p.statusReason, 'catalog-retired')
    assert.deepEqual(p.controls, [])
    assert.throws(() => select(provider, model, { mode: true }, role, protocol))
  }
})
