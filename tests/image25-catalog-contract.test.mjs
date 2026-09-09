import assert from 'node:assert/strict'
import test from 'node:test'
import { createRequire } from 'node:module'
import { STATIC_MODEL_REGISTRY } from '../apps/web/src/lib/staticModelCatalog.js'
import { buildAspectRatioOptions } from '../apps/web/src/lib/aspectRatios.js'

const mini = createRequire(import.meta.url)('../apps/miniprogram/miniprogram/utils/static-model-catalog.js')

test('GPT Image 2.5 uses documented IDs in both clients and sorts ahead of Image 2', () => {
  for (const catalog of [STATIC_MODEL_REGISTRY, mini.STATIC_MODEL_REGISTRY]) {
    for (const provider of ['openai', 'fal', 'replicate']) {
      const models = catalog[provider].models
      const previous = models.findIndex(model => model.id === (provider === 'openai' ? 'gpt-image-2' : 'openai/gpt-image-2'))
      for (const variant of ['sunburst', 'flare']) {
        const id = provider === 'openai' ? `gpt-image-2.5-${variant}` : provider === 'fal' ? `openai/gpt-image-2.5/${variant}/text-to-image` : `openai/gpt-image-2.5-${variant}`
        const index = models.findIndex(model => model.id === id)
        assert.ok(index >= 0 && index < previous, `${provider}/${id} must appear ahead of Image 2`)
        const model = models[index]
        assert.equal(model.vendorId, 'openai')
        assert.equal(model.selectable, true)
        assert.deepEqual(model.roles, ['image'])
        assert.equal(model.verified, false, 'official catalog evidence is not a paid inference result')
        assert.equal(model.capabilities.imageEditing, true)
        assert.equal(model.capabilities.maxReferenceImages, 1)
        assert.equal(model.capabilities.imageEditMode, 'direct-edit')
        assert.ok(model.officialSourceUrl.includes(provider === 'openai' ? 'developers.openai.com' : provider === 'fal' ? 'fal.ai/models/' : 'replicate.com/openai/'))
      }
    }
    for (const variant of ['sunburst', 'flare']) {
      const dated = catalog.openai.models.find(model => model.id === `gpt-image-2.5-${variant}-2026-09-08`)
      assert.equal(dated?.releasedAt, '2026-09-08')
      assert.equal(dated?.protocol, 'openai-images')
    }
    assert.equal(catalog.together.models.some(model => model.id.includes('gpt-image-2.5')), false)
  }
})

test('Image 2.5 picker keeps dimensions specific to the selected channel', () => {
  const direct = STATIC_MODEL_REGISTRY.openai.models.find(model => model.id === 'gpt-image-2.5-sunburst')
  assert.ok(direct)
  assert.deepEqual(direct.capabilities.resolutions, ['1K', '2K', '4K'])
  const options = buildAspectRatioOptions({capabilities:direct.capabilities, capabilityField:'aspectRatios', resolution:'4K'})
  assert.equal(options.find(option => option.value === '16:9')?.disabled, false)
  assert.equal(options.some(option => option.value === '1:8'), false)
  const hosted = STATIC_MODEL_REGISTRY.replicate.models.find(model => model.id === 'openai/gpt-image-2.5-sunburst')
  assert.deepEqual(hosted.capabilities.resolutions, ['auto'])
  assert.deepEqual(hosted.capabilities.aspectRatios, ['1:1', '3:2', '2:3', '4:3', '3:4', '16:9', '9:16'])
})
