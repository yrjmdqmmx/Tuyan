const assert = require('node:assert/strict')

const {
  PROVIDERS,
  REFERENCE_IMAGE_MODES,
  RESOLUTION_OPTIONS,
  RETRIEVAL_OPTIONS,
  mainModelCanReadImages,
  supportedResolutions,
} = require('../miniprogram/utils/constants.js')

// The bundled fallback must retain every role from the shared backend catalog.
const { STATIC_MODEL_REGISTRY } = require('../miniprogram/utils/static-model-catalog.js')
for (const provider of PROVIDERS) {
  const registry = STATIC_MODEL_REGISTRY[provider.id]
  if (!registry) continue
  for (const role of ['main', 'image', 'vision']) {
    assert.equal(provider[role + 'Model'], registry.defaults[role], `${provider.id}/${role} default`)
    assert.deepEqual(provider[role + 'Models'].map((m) => m.value), registry.models.filter((m) => m.selectable && m.roles.includes(role)).map((m) => m.id), `${provider.id}/${role}`)
  }
}
// Still-supported older models remain available; realtime models need a different protocol.
const bailian = PROVIDERS.find((provider) => provider.id === 'bailian')
for (const id of ['kimi-k2.5', 'glm-5', 'MiniMax-M2.5', 'qwen3.6-plus']) assert.ok(bailian.mainModels.some((m) => m.value === id), id)
assert.equal(bailian.mainModels.some((m) => m.value.includes('-realtime')), false)

// 清晰度档位按 provider 过滤
assert.deepEqual(supportedResolutions('bailian', 'wan2.7-image-pro'), ['1K', '2K', '4K'])
assert.deepEqual(supportedResolutions('gemini', 'gemini-3.1-flash-image'), ['512', '1K', '2K', '4K'])
assert.deepEqual(supportedResolutions('openai', 'gpt-image-2'), ['1K', '2K', '4K'])
assert.deepEqual(supportedResolutions('openrouter', 'openrouter/openai/gpt-5.4-image-2'), ['1K', '2K', '4K'])
assert.deepEqual(RESOLUTION_OPTIONS.map((option) => option.value), ['512', '1K', '1.5K', '2K', '3K', '4K', 'auto'])

// 主模型读图能力正则（bailian 固定能力，SYNC.md 2026-06-08）
assert.equal(mainModelCanReadImages('bailian', 'qwen3.7-plus'), true)
assert.equal(mainModelCanReadImages('bailian', 'qwen3.5-omni-plus'), true)
assert.equal(mainModelCanReadImages('bailian', 'kimi/kimi-k3'), true)
assert.equal(mainModelCanReadImages('bailian', 'qwen3.8-max'), true)
assert.equal(mainModelCanReadImages('bailian', 'deepseek-v4-pro'), false)
assert.equal(mainModelCanReadImages('bailian', 'MiniMax/MiniMax-M3'), true)
assert.equal(mainModelCanReadImages('gemini', 'gemini-3.5-flash'), true)
assert.equal(mainModelCanReadImages('openrouter', 'openrouter/anthropic/claude-opus-4.8'), true)
assert.equal(mainModelCanReadImages('openai', 'gpt-5.5'), true)

// "自动选择"入口已移除
assert.deepEqual(REFERENCE_IMAGE_MODES.map((option) => option.value), ['main_model', 'vision_model'])

// 检索设置选项
assert.deepEqual(RETRIEVAL_OPTIONS.map((option) => option.value), ['none', 'auto', 'random', 'manual'])

console.log('constants.test.cjs passed')

for (const id of ['qwen3.8-max-0902', 'qwen3.8-flash', 'qwen3.8-27b', 'ZHIPU/GLM-5.3-Flash', 'kimi-k3']) assert.equal(mainModelCanReadImages('bailian', id), true, id)
assert.equal(mainModelCanReadImages('bailian', 'ZHIPU/GLM-5.3'), false)
assert.equal(mainModelCanReadImages('openai', 'gpt-6-astra'), true)
