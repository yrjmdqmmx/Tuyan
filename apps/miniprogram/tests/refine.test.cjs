const assert = require('node:assert/strict')

const { buildRefineJobPayload, refineRequestSource } = require('../miniprogram/utils/refine.js')

assert.deepEqual(refineRequestSource({ url: 'https://expired.example/a.png', objectKey: 'jobs/a/result.png' }), { sourceImageObjectKey: 'jobs/a/result.png' })
assert.deepEqual(refineRequestSource({ url: 'https://legacy.example/a.png', objectKey: '' }), { sourceImageUrl: 'https://legacy.example/a.png' })

const routes = {
  main: { accessProvider: 'openai', modelId: 'main' },
  image: { accessProvider: 'ark', modelId: 'image' },
  vision: { accessProvider: 'gemini', modelId: 'vision' },
}
const base = {
  configurationMode: 'advanced', modelRoutes: routes, registry: { routeContractVersion: 1 },
  apiKeys: { openai: 'unused', ark: 'ark-key', gemini: 'gemini-key' },
  source: { url: 'https://signed.example/a.png', objectKey: 'jobs/a/result.png' },
  editInstruction: '放大标签', aspectRatio: '1:1', imageSize: '2K',
}
const direct = buildRefineJobPayload({ ...base, refineMode: 'direct-edit' })
assert.equal(direct.action, 'refineImage')
assert.equal(direct.clientPlatform, 'miniprogram')
assert.deepEqual(direct.apiKeys, { ark: 'ark-key' })
assert.equal(direct.sourceImageObjectKey, 'jobs/a/result.png')
assert.equal(direct.sourceImageUrl, undefined)
assert.deepEqual(direct.modelRoutes, routes)

const redraw = buildRefineJobPayload({ ...base, refineMode: 'analyze-redraw' })
assert.deepEqual(redraw.apiKeys, { ark: 'ark-key', gemini: 'gemini-key' })

console.log('refine.test.cjs passed')
