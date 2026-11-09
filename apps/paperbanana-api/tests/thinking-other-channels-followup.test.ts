import test from 'node:test'
import assert from 'node:assert/strict'
import { applyThinkingSnapshot, applyThinkingTransport, compileThinkingSelection, thinkingProfile } from '../../../packages/api/src/thinking.js'

const zhipuModels = ['glm-4.7-flashx', 'glm-4.5-air', 'glm-4.5-airx', 'glm-4.5-flash', 'glm-4.6v-flash', 'glm-4.6v-flashx']

test('Zhipu exact ChatThinking models send enabled/disabled without injecting budgets or sampling settings', () => {
  for (const modelId of zhipuModels) {
    for (const role of (modelId.includes('4.6v') ? ['main', 'vision'] : ['main']) as ('main' | 'vision')[]) {
      const compile = (options: any) => compileThinkingSelection({ provider: 'zhipu', modelId, protocol: 'openai-chat-completions', options }, role)
      assert.equal(thinkingProfile('zhipu', modelId, role, 'openai-chat-completions').controls[0].default, 'enabled')
      const body = { model: modelId, max_tokens: 1024, temperature: 0.4, top_p: 0.8, thinking: { clear_thinking: true } }
      for (const mode of ['enabled', 'disabled']) {
        const request = applyThinkingTransport('https://open.bigmodel.cn/api/paas/v4/chat/completions', { method: 'POST', body: JSON.stringify(body) }, compile({ mode }))
        assert.deepEqual(JSON.parse(String(request?.body)), { ...body, thinking: { clear_thinking: true, type: mode } })
      }
      assert.deepEqual(compile({}).wire, {})
      assert.deepEqual(applyThinkingSnapshot({ ...body, thinking: { clear_thinking: true, type: 'enabled' } }, compile({})), body)
      assert.deepEqual(applyThinkingSnapshot(body), body)
      for (const options of [{ mode: 'auto' }, { mode: true }, { effort: 'high' }, { budget: 1024 }]) assert.throws(() => compile(options))
    }
  }
})

test('Zhipu contract stays scoped to the audited role, channel, version and protocol', () => {
  for (const modelId of ['glm-4-flash-250414', 'glm-4.1v-thinking-flash', 'glm-4.5-air-new']) {
    assert.throws(() => compileThinkingSelection({ provider: 'zhipu', modelId, protocol: 'openai-chat-completions', options: { mode: 'disabled' } }, 'main'))
  }
  assert.throws(() => compileThinkingSelection({ provider: 'zhipu', modelId: 'glm-4.5-air', protocol: 'openai-chat-completions', options: { mode: 'disabled' } }, 'vision'))
  assert.throws(() => compileThinkingSelection({ provider: 'zhipu', modelId: 'glm-4.5-air', protocol: 'anthropic-messages', options: { mode: 'disabled' } }, 'main'))
  assert.throws(() => compileThinkingSelection({ provider: 'siliconflow', modelId: 'zai-org/GLM-4.5-Air', protocol: 'openai-chat-completions', options: { mode: 'disabled' } }, 'main'))
})

test('Image API contracts preserve generation controls instead of treating them as thinking', () => {
  const models: [string, string, string][] = [
    ...['cogview-3-flash', 'cogview-4', 'cogview-4-250304', 'glm-image'].map(id => ['zhipu', id, 'provider-images'] as [string, string, string]),
    ['minimax', 'image-01', 'provider-images'],
    ...['qwen-image', 'qwen-image-edit', 'musesteamer-air-image'].map(id => ['qianfan', id, 'qianfan-images'] as [string, string, string]),
    ...['sd3.5-large', 'sd3.5-large-turbo', 'sd3.5-medium', 'stable-image-core', 'stable-image-ultra'].map(id => ['stability', id, 'provider-images'] as [string, string, string]),
    ...['FLUX.2-dev', 'FLUX.2-flex', 'FLUX.2-max', 'FLUX.2-pro', 'FLUX.1-kontext-max', 'FLUX.1-kontext-pro'].map(id => ['together', 'black-forest-labs/' + id, 'provider-images'] as [string, string, string]),
    ...['qwen-image-2.0-pro-2026-06-22', 'qwen-image-2.0', 'qwen-image-2.0-2026-03-03', 'qwen-image-2.0-pro', 'qwen-image-2.0-pro-2026-03-03', 'qwen-image-2.0-pro-2026-04-22'].map(id => ['bailian', id, 'bailian-multimodal-generation'] as [string, string, string]),
  ]
  for (const [provider, modelId, protocol] of models) {
    const profile = thinkingProfile(provider, modelId, 'image', protocol)
    assert.equal(profile.status, 'unsupported', provider + '/' + modelId)
    assert.equal(profile.statusReason, 'image-parameters')
    const compile = (options: any) => compileThinkingSelection({ provider, modelId, protocol, options }, 'image')
    const body = { model: modelId, prompt: 'offline fixture', prompt_extend: true, prompt_optimizer: false, steps: 20, guidance_scale: 3.5, strength: 0.7 }
    assert.deepEqual(applyThinkingSnapshot(body, compile({})), body)
    for (const options of [{ mode: true }, { effort: 'high' }, { budget: 4096 }]) assert.throws(() => compile(options))
  }
})

test('Incomplete generation scope and conflicting model enums remain unconfirmed', () => {
  for (const [provider, modelId, reason] of [['minimax', 'image-01-live', 'parameter-contract-incomplete'], ['stability', 'sd3.5-flash', 'conflicting-docs']]) {
    const profile = thinkingProfile(provider, modelId, 'image', 'provider-images')
    assert.equal(profile.status, 'unconfirmed'); assert.equal(profile.statusReason, reason)
    assert.throws(() => compileThinkingSelection({ provider, modelId, protocol: 'provider-images', options: { mode: true } }, 'image'))
  }
})
