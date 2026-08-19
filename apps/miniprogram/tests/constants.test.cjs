const assert = require('node:assert/strict')

const {
  PROVIDERS,
  REFERENCE_IMAGE_MODES,
  RESOLUTION_OPTIONS,
  RETRIEVAL_OPTIONS,
  mainModelCanReadImages,
  supportedResolutions,
} = require('../miniprogram/utils/constants.js')

// bailian 模型常量与 apps/web/src/constants.js（SYNC.md 2026-06-08 条目）同步
const bailian = PROVIDERS.find((provider) => provider.id === 'bailian')
assert.ok(bailian)
assert.equal(bailian.mainModel, 'qwen3.8-max')
assert.equal(bailian.imageModel, 'wan2.7-image-pro')
assert.equal(bailian.visionModel, 'qwen3.8-max')
assert.deepEqual(
  bailian.mainModels.map((option) => option.value),
  ['qwen3.8-max', 'qwen3.7-plus', 'qwen3.7-flash', 'deepseek-v4-pro', 'deepseek-v4-flash', 'kimi/kimi-k3', 'glm-5.2', 'MiniMax/MiniMax-M3'],
)
assert.deepEqual(
  bailian.imageModels.map((option) => option.value),
  ['wan2.7-image-pro', 'qwen-image-3.0-pro', 'qwen-image-3.0'],
)
assert.deepEqual(
  bailian.visionModels.map((option) => option.value),
  ['qwen3.8-max', 'qwen3.7-plus', 'qwen3.5-omni-plus', 'kimi/kimi-k3'],
)

// 已剔除的旧模型不应再出现
const allBailianValues = [...bailian.mainModels, ...bailian.imageModels, ...bailian.visionModels].map((option) => option.value)
for (const removed of ['deepseek-v3.2', 'kimi-k2.5', 'glm-5', 'MiniMax-M2.5', 'wan2.7-image', 'qwen-image-2.0', 'qwen3.6-plus']) {
  assert.ok(allBailianValues.indexOf(removed) < 0, `bailian 不应再包含 ${removed}`)
}

// 清晰度档位按 provider 过滤
assert.deepEqual(supportedResolutions('bailian', 'wan2.7-image-pro'), ['1K', '2K'])
assert.deepEqual(supportedResolutions('gemini', 'gemini-3.1-flash-image'), ['1K', '2K'])
assert.deepEqual(supportedResolutions('openai', 'gpt-image-2'), ['1K', '2K', '4K'])
assert.deepEqual(supportedResolutions('openrouter', 'openrouter/openai/gpt-5.4-image-2'), ['1K', '2K', '4K'])
assert.deepEqual(RESOLUTION_OPTIONS.map((option) => option.value), ['1K', '2K', '4K'])

// 主模型读图能力正则（bailian 固定能力，SYNC.md 2026-06-08）
assert.equal(mainModelCanReadImages('bailian', 'qwen3.7-plus'), true)
assert.equal(mainModelCanReadImages('bailian', 'qwen3.5-omni-plus'), true)
assert.equal(mainModelCanReadImages('bailian', 'kimi/kimi-k3'), true)
assert.equal(mainModelCanReadImages('bailian', 'qwen3.8-max'), true)
assert.equal(mainModelCanReadImages('bailian', 'deepseek-v4-pro'), false)
assert.equal(mainModelCanReadImages('bailian', 'MiniMax/MiniMax-M3'), false)
assert.equal(mainModelCanReadImages('gemini', 'gemini-3.5-flash'), true)
assert.equal(mainModelCanReadImages('openrouter', 'openrouter/anthropic/claude-opus-4.8'), true)
assert.equal(mainModelCanReadImages('openai', 'gpt-5.5'), true)

// "自动选择"入口已移除
assert.deepEqual(REFERENCE_IMAGE_MODES.map((option) => option.value), ['main_model', 'vision_model'])

// 检索设置选项
assert.deepEqual(RETRIEVAL_OPTIONS.map((option) => option.value), ['none', 'auto', 'random', 'manual'])

console.log('constants.test.cjs passed')
