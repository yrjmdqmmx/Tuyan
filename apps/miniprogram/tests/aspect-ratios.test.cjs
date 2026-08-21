const assert = require('node:assert/strict')

const {
  CANONICAL_ASPECT_RATIOS,
  buildAspectRatioOptions,
  buildResolutionOptions,
  normalizeSelectedAspectRatio,
} = require('../miniprogram/utils/aspect-ratios.js')

assert.deepEqual(CANONICAL_ASPECT_RATIOS, ['1:1', '3:2', '2:3', '4:3', '3:4', '16:9', '9:16', '21:9', '1:4', '4:1'])
const declared = buildAspectRatioOptions({ capabilities: { aspectRatios: ['1:1', '16:9'] }, capabilityField: 'aspectRatios', modelLabel: 'Image X' })
assert.equal(declared.length, 11)
assert.deepEqual(declared.filter((item) => !item.disabled).map((item) => item.value), ['auto', '1:1', '16:9'])
assert.match(declared.find((item) => item.value === '4:1').reason, /Image X/)

const missing = buildAspectRatioOptions({ capabilities: {}, capabilityField: 'aspectRatios', modelLabel: '未知模型' })
assert.deepEqual(missing.filter((item) => !item.disabled).map((item) => item.value), ['auto'])
assert.equal(normalizeSelectedAspectRatio('4:1', missing), 'auto')

const capabilities = {
  resolutions: ['1K', '2K'], refineResolutions: ['4K'],
  aspectRatios: ['16:9', '4:1'], refineAspectRatios: ['1:1', '2:3'],
}
assert.deepEqual(buildAspectRatioOptions({ capabilities, capabilityField: 'aspectRatios' }).filter((item) => !item.disabled).map((item) => item.value), ['auto', '16:9', '4:1'])
assert.deepEqual(buildAspectRatioOptions({ capabilities, capabilityField: 'refineAspectRatios' }).filter((item) => !item.disabled).map((item) => item.value), ['auto', '1:1', '2:3'])
assert.deepEqual(buildResolutionOptions(capabilities, 'resolutions').map((item) => item.value), ['1K', '2K'])
assert.deepEqual(buildResolutionOptions(capabilities, 'refineResolutions').map((item) => item.value), ['4K'])

console.log('aspect-ratios.test.cjs passed')
