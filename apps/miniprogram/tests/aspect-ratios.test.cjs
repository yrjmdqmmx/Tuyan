const assert = require('node:assert/strict')

const {
  CANONICAL_ASPECT_RATIOS,
  buildAspectRatioOptions,
  buildResolutionOptions,
  normalizeSelectedAspectRatio,
} = require('../miniprogram/utils/aspect-ratios.js')

assert.deepEqual(CANONICAL_ASPECT_RATIOS, ['1:1', '3:2', '2:3', '4:3', '3:4', '16:9', '9:16', '21:9', '1:4', '4:1', '1:2', '2:1', '4:5', '5:4', '1:8', '8:1', '5:2', '2:5', '9:21', '6:10', '14:10', '10:14', '19.5:9', '9:19.5', '20:9', '9:20', '1:3', '3:1', '5:8', '8:5', '9:22', '22:9', '9:23', '23:9', '3:8', '8:3', '5:12', '12:5', '10:16', '16:10', '2.35:1', '7:5', '5:7', '3:5', '5:3'])
const declared = buildAspectRatioOptions({ capabilities: { aspectRatios: ['1:1', '16:9'] }, capabilityField: 'aspectRatios', modelLabel: 'Image X' })
assert.equal(declared.length, 46)
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

// Every Mini option must agree with the generated operation/resolution map.
const { STATIC_MODEL_REGISTRY } = require('../miniprogram/utils/static-model-catalog.js')
for (const registry of Object.values(STATIC_MODEL_REGISTRY)) for (const model of registry.models) {
  for (const capabilityField of ['aspectRatios', 'refineAspectRatios']) {
    for (const [resolution, ratios] of Object.entries(model.capabilities?.[capabilityField + 'ByResolution'] || {})) {
      const options = buildAspectRatioOptions({ capabilities: model.capabilities, capabilityField, resolution })
      assert.deepEqual(options.filter(item => !item.disabled).map(item => item.value), ['auto', ...ratios], `${model.id}/${capabilityField}/${resolution}`)
    }
  }
}
const ideogram = STATIC_MODEL_REGISTRY.ideogram.models.find(item => item.id === 'ideogram-v4').capabilities
assert.equal(normalizeSelectedAspectRatio('9:22', buildAspectRatioOptions({capabilities: ideogram, capabilityField: 'refineAspectRatios', resolution: '1K'})), 'auto')
assert.equal(normalizeSelectedAspectRatio('9:22', buildAspectRatioOptions({capabilities: ideogram, capabilityField: 'refineAspectRatios', resolution: '2K'})), '9:22')
