import assert from 'node:assert/strict'
import test from 'node:test'
import { mergeProviderRegistry, uniqueRegistryModels } from './modelRegistry.js'

const fallback = {
  mainModel: 'old-main', imageModel: 'old-image', visionModel: 'old-vision',
  mainModels: [['old-main', 'Old Main']], imageModels: [['old-image', 'Old Image']], visionModels: [['old-vision', 'Old Vision']],
  guideUrl: 'https://example.com', guideSteps: ['Keep'], label: 'Provider', keyName: 'provider', keyPlaceholder: 'key',
}

test('server registry replaces stale role lists and defaults while preserving provider UI metadata', () => {
  const merged = mergeProviderRegistry(fallback, {
    defaults: { main: 'new-main', image: 'new-image', vision: 'new-vision' },
    models: [
      { id: 'new-main', label: 'New Main', roles: ['main'], availabilityNotes: 'Stable' },
      { id: 'new-image', label: 'New Image', roles: ['image'], availabilityNotes: 'Dedicated API' },
      { id: 'new-vision', label: 'New Vision', roles: ['main', 'vision'], availabilityNotes: 'Reads images' },
    ],
  })
  assert.equal(merged.guideUrl, fallback.guideUrl)
  assert.equal(merged.mainModel, 'new-main')
  assert.deepEqual(merged.mainModels.map(([id]) => id), ['new-main', 'new-vision'])
  assert.deepEqual(merged.imageModels, [['new-image', 'New Image']])
  assert.deepEqual(merged.visionModels, [['new-vision', 'New Vision']])
})

test('missing registry keeps the safe built-in fallback', () => {
  assert.equal(mergeProviderRegistry(fallback, null), fallback)
})

test('selected model notes are unique when one model fills main and vision roles', () => {
  const shared = { id: 'qwen3.8-max', protocol: 'chat' }
  const image = { id: 'wan2.7-image-pro', protocol: 'image' }
  assert.deepEqual(uniqueRegistryModels([shared, image, shared]), [shared, image])
})
