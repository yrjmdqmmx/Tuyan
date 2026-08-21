const assert = require('node:assert/strict')

const { buildCreateJobPayload } = require('../miniprogram/utils/payload.js')

const baseInput = {
  configurationMode: 'advanced',
  provider: 'bailian',
  registry: { routeContractVersion: 1 },
  modelRoutes: {
    main: { accessProvider: 'openai', modelId: 'gpt-main' },
    image: { accessProvider: 'bailian', modelId: 'wan-image' },
    vision: { accessProvider: 'gemini', modelId: 'gemini-vision' },
  },
  apiKeys: { openai: ' openai-key ', bailian: ' bailian-key ', gemini: ' gemini-key ', ark: 'unused' },
  categoryId: 'method_framework',
  categoryLabel: '方法框架图',
  methodContent: ' 这是一段足够长的方法内容描述。 ',
  caption: ' 图 1：总览。 ',
  negativePrompt: ' 避免小字。 ',
  outputFormat: 'png',
  imageSize: '2K',
  referenceImageMode: 'vision_model',
  uploadedReferenceImages: [],
  pipelineMode: 'planner_critic',
  retrievalSetting: 'manual',
  manualReferenceIds: ['ref-1', 'ref-2'],
  aspectRatio: '21:9',
  numCandidates: 2,
  maxCriticRounds: 2,
}

// 专业模式 + 手动参考：透传 retrievalSetting 与 manualReferenceIds
const advanced = buildCreateJobPayload(baseInput)
assert.equal(advanced.action, 'createJob')
assert.equal(advanced.clientPlatform, 'miniprogram')
assert.equal(advanced.taskName, 'diagram')
assert.equal(advanced.imageSize, '2K')
assert.equal(advanced.retrievalSetting, 'manual')
assert.deepEqual(advanced.manualReferenceIds, ['ref-1', 'ref-2'])
assert.equal(advanced.referenceImageMode, undefined)
assert.deepEqual(advanced.apiKeys, { openai: 'openai-key', bailian: 'bailian-key', gemini: 'gemini-key' })
assert.equal(advanced.methodContent, '这是一段足够长的方法内容描述。')
assert.equal(advanced.negativePrompt, '避免小字。')
assert.deepEqual(advanced.modelRoutes, baseInput.modelRoutes)
assert.equal(advanced.provider, 'openai')
assert.equal(advanced.mainModelName, 'gpt-main')
assert.equal(advanced.imageModelName, 'wan-image')
assert.equal(advanced.referenceVisionModelName, 'gemini-vision')
assert.equal(advanced.aspectRatio, '21:9')
assert.equal(advanced.numCandidates, 2)

// 上传参考图 ⇒ 检索强制关闭（与后端归一化语义一致，SYNC.md 2026-06-09）
const withRefs = buildCreateJobPayload({
  ...baseInput,
  uploadedReferenceImages: [
    { filename: 'ref.png', mimeType: 'image/png', size: 1024, objectKey: 'k', uploadToken: 't' },
  ],
})
assert.equal(withRefs.retrievalSetting, 'none')
assert.deepEqual(withRefs.manualReferenceIds, [])
assert.equal(withRefs.referenceImageMode, 'vision_model')

// 数据统计类别 ⇒ taskName = 'plot'
const plot = buildCreateJobPayload({ ...baseInput, categoryId: 'data_stat', categoryLabel: '数据统计图' })
assert.equal(plot.taskName, 'plot')

// 普通模式 ⇒ 固定默认流程参数，检索不生效
const simple = buildCreateJobPayload({ ...baseInput, configurationMode: 'simple' })
assert.equal(simple.pipelineMode, 'planner_critic')
assert.equal(simple.retrievalSetting, 'none')
assert.deepEqual(simple.manualReferenceIds, [])
assert.equal(simple.aspectRatio, '21:9')
assert.equal(simple.numCandidates, 1)
assert.equal(simple.maxCriticRounds, 1)
// imageSize 普通模式同样生效（web 端清晰度对两种模式都可见）
assert.equal(simple.imageSize, '2K')

console.log('payload.test.cjs passed')
