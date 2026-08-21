import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CANONICAL_ASPECT_RATIOS,
  LEGACY_SAFE_ASPECT_RATIOS,
  buildAspectRatioOptions,
  normalizeSelectedAspectRatio,
} from './aspectRatios.js'

test('aspect ratio options always expose auto plus ten fixed ratios in canonical order', () => {
  assert.deepEqual(CANONICAL_ASPECT_RATIOS, ['1:1', '3:2', '2:3', '4:3', '3:4', '16:9', '9:16', '21:9', '1:4', '4:1'])
  const options = buildAspectRatioOptions({
    capabilities: { aspectRatios: ['1:1', '16:9'] },
    capabilityField: 'aspectRatios',
    modelLabel: 'Wan Image',
  })
  assert.deepEqual(options.map((option) => option.value), ['auto', ...CANONICAL_ASPECT_RATIOS])
  assert.equal(options[0].disabled, false)
  assert.equal(options.find((option) => option.value === '16:9').disabled, false)
  const disabledReason = options.find((option) => option.value === '21:9').reason
  assert.match(disabledReason, /Wan Image/u)
  assert.match(disabledReason, /21:9/u)
  assert.match(disabledReason, /不支持/u)
})

test('old registries use the safe four ratios and unsupported values normalize to auto', () => {
  assert.deepEqual(LEGACY_SAFE_ASPECT_RATIOS, ['16:9', '21:9', '3:2', '1:1'])
  const options = buildAspectRatioOptions({ capabilities: {}, capabilityField: 'aspectRatios', modelLabel: '旧版图像模型' })
  assert.deepEqual(options.filter((option) => !option.disabled).map((option) => option.value), ['auto', '1:1', '3:2', '16:9', '21:9'])
  assert.equal(normalizeSelectedAspectRatio('4:1', options), 'auto')
  assert.equal(normalizeSelectedAspectRatio('3:2', options), '3:2')
  assert.equal(normalizeSelectedAspectRatio('auto', options), 'auto')
})

test('refine ratios consume refineAspectRatios independently from generation ratios', () => {
  const capabilities = { aspectRatios: ['16:9', '4:1'], refineAspectRatios: ['1:1', '2:3'] }
  const generation = buildAspectRatioOptions({ capabilities, capabilityField: 'aspectRatios', modelLabel: 'Image X' })
  const refine = buildAspectRatioOptions({ capabilities, capabilityField: 'refineAspectRatios', modelLabel: 'Image X' })
  assert.equal(generation.find((option) => option.value === '4:1').disabled, false)
  assert.equal(refine.find((option) => option.value === '4:1').disabled, true)
  assert.equal(refine.find((option) => option.value === '2:3').disabled, false)
})
