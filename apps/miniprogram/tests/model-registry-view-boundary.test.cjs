const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { STATIC_MODEL_REGISTRY } = require('../miniprogram/utils/static-model-catalog.js')
const { normalizeModelRegistry, partitionRegistryModels } = require('../miniprogram/utils/model-registry.js')
const { getModelRegistryState } = require('../miniprogram/utils/model-registry-store.js')
const { registryForRegions } = require('../miniprogram/utils/provider-regions.js')
const { buildAspectRatioOptions, buildResolutionOptions } = require('../miniprogram/utils/aspect-ratios.js')

const bytes = (value) => Buffer.byteLength(JSON.stringify(value))
const providers = structuredClone(STATIC_MODEL_REGISTRY)
// Exercise the actual static catalog and a dynamic catalog larger than a single
// WeChat setData call can carry. An optional public snapshot supports local audit.
providers.openrouter = process.env.TUYAN_MINI_OPENROUTER_SNAPSHOT
  ? JSON.parse(readFileSync(process.env.TUYAN_MINI_OPENROUTER_SNAPSHOT, 'utf8'))
  : {
      ...structuredClone(providers.openai), accessKind: 'aggregator',
      models: Array.from({ length: 1800 }, (_, index) => ({
        ...structuredClone(providers.openai.models[index % providers.openai.models.length]),
        id: `catalog-growth/${index}`, vendor: 'Catalog growth fixture',
      })),
    }
if (!process.env.TUYAN_MINI_OPENROUTER_SNAPSHOT) {
  for (const role of ['main', 'image', 'vision']) {
    providers.openrouter.defaults[role] = providers.openrouter.models.find((model) => model.roles.includes(role)).id
  }
}
const registry = normalizeModelRegistry({
  registryVersion: '2026-09-07.v14', routeContractVersion: 1,
  providerRegionContractVersion: 1, supportsModelRoutes: true, providers,
})
const original = JSON.stringify(registry)
assert.ok(bytes({ registry }) > 1024 * 1024, 'fixture must reproduce the original setData overflow')
getModelRegistryState().registry = registry

let definition
global.Component = (value) => { definition = value }
global.wx = { getStorageSync() { return '' } }
function load(relative) { require(relative); return definition }
let maxPatchBytes = 0
function context(component, properties = {}) {
  const data = structuredClone(component.data)
  return Object.assign({
    data, properties,
    setData(patch) {
      const size = bytes(patch)
      maxPatchBytes = Math.max(maxPatchBytes, size)
      assert.ok(size < 128 * 1024, `view update has ${size} bytes`)
      assert.equal(patch.registry, undefined)
      assert.equal(patch.pickerRegistry, undefined)
      Object.assign(data, structuredClone(patch))
    },
    triggerEvent(name, detail) { this.lastEvent = { name, detail } },
  }, component.methods)
}
const index = context(load('../miniprogram/pages/index/index.js'))
index.schedulePersistDraft = () => {} // Avoid persistence timers; no network or storage writes.
index.applyRegistryState(getModelRegistryState())
assert.equal(index.data.registryReady, true)
assert.equal(index.data.registry, undefined)

const refine = context(load('../miniprogram/pages/refine/refine.js'))
refine.applyRegistryState(getModelRegistryState())
assert.equal(refine.data.registryReady, true)
assert.equal(refine.data.registry, undefined)

const sheetDefinition = load('../miniprogram/components/generation-settings-sheet/generation-settings-sheet.js')
const sheet = context(sheetDefinition, {
  registryVersion: registry.registryVersion, settings: index.data.settings,
  apiKeys: {}, executionRoles: ['main', 'image', 'vision'], manualReferenceIds: [],
})
sheet.resetDraft()
const pickerDefinition = load('../miniprogram/components/model-picker/model-picker.js')
assert.equal(sheetDefinition.properties.registry, undefined)
assert.equal(pickerDefinition.properties.registry, undefined)
const picker = context(pickerDefinition, {
  registryVersion: registry.registryVersion, providerRegions: {},
  role: 'image', outputFormat: 'png', selectedProvider: '', selectedModel: '',
})

let checkedResolutionOptions = 0
for (const region of ['global', 'cn']) {
  const providerRegions = { minimax: region }
  const scoped = registryForRegions(registry, providerRegions)
  picker.properties.providerRegions = providerRegions
  for (const role of ['main', 'vision', 'image']) {
    picker.properties.role = role
    picker.resetFlow()
    const expected = Object.entries(scoped.providers).flatMap(([id, provider]) => {
      const count = partitionRegistryModels(provider.models, { role, outputFormat: 'png' }).compatible.length
      return count ? [{ id, count }] : []
    })
    assert.deepEqual(new Map(picker.data.providerCards.map(({ id, count }) => [id, count])), new Map(expected.map(({ id, count }) => [id, count])))
  }
  // Every static image model uses the full, unchanged generation and edit rules.
  for (const [provider, entry] of Object.entries(scoped.providers)) {
    if (provider === 'openrouter') continue
    for (const model of entry.models.filter((model) => model.roles.includes('image'))) {
      sheet.data.draft = {
        ...structuredClone(index.data.settings), configurationMode: 'advanced', providerRegions,
        modelRoutes: { ...index.data.settings.modelRoutes, image: { accessProvider: provider, modelId: model.id } },
      }
      for (const resolution of buildResolutionOptions(model.capabilities, 'resolutions')) {
        sheet.data.draft.imageSize = resolution.value
        sheet.data.draft.aspectRatio = 'auto'
        sheet.refreshPresentation()
        const expected = buildAspectRatioOptions({ capabilities: model.capabilities, capabilityField: 'aspectRatios', resolution: resolution.value }).filter((option) => !option.disabled).map(({ value, label }) => ({ value, label }))
        assert.deepEqual(sheet.data.ratioOptions, expected, `${provider}/${model.id}/${resolution.value}`)
        assert.equal(sheet.data.draft.imageSize, resolution.value)
        checkedResolutionOptions++
      }
      refine.data.settings = structuredClone(sheet.data.draft)
      refine.refreshCapabilities()
      const resolutions = buildResolutionOptions(model.capabilities, 'refineResolutions')
      assert.deepEqual(refine.data.resolutionOptions, resolutions)
      for (let index = 0; index < resolutions.length; index++) {
        refine.onResolutionChange({ detail: { value: String(index) } })
        const expected = buildAspectRatioOptions({ capabilities: model.capabilities, capabilityField: 'refineAspectRatios', resolution: resolutions[index].value }).filter((option) => !option.disabled).map(({ value, label }) => ({ value, label }))
        assert.deepEqual(refine.data.ratioOptions, expected, `edit ${provider}/${model.id}/${resolutions[index].value}`)
        checkedResolutionOptions++
      }
    }
  }
}

picker.properties.role = 'main'
picker.resetFlow()
picker.selectProvider({ currentTarget: { dataset: { provider: 'openrouter' } } })
picker.selectVendor({ currentTarget: { dataset: { vendor: picker.data.vendorCards[0].vendor } } })
picker.setCatalogMode({ currentTarget: { dataset: { mode: 'all' } } })
assert.ok(picker.data.visibleCompatibleModels.length <= 30)
assert.equal(picker.data.compatibleModels, undefined)
assert.equal(picker.data.visibleCompatibleModels[0].capabilities, undefined)
const first = picker.data.visibleCompatibleModels[0].id
picker.loadMore()
assert.ok(picker.data.visibleCompatibleModels.length <= 60)
picker.onSearch({ detail: { value: first } })
assert.ok(picker.data.visibleCompatibleModels.some((model) => model.id === first))
picker.choose({ currentTarget: { dataset: { model: first } } })
assert.deepEqual(picker.lastEvent, { name: 'select', detail: { provider: 'openrouter', modelId: first } })

sheet.data.draft.modelRoutes = {
  main: { accessProvider: 'minimax', modelId: 'MiniMax-M3' },
  vision: { accessProvider: 'minimax', modelId: 'MiniMax-M3' },
  image: { accessProvider: 'minimax', modelId: 'image-01' },
}
sheet.data.draftKeys = { 'minimax:global': 'fixture-global', 'minimax:cn': 'fixture-cn' }
sheet.onMiniMaxRegionChange({ detail: { value: '1' } })
assert.equal(sheet.data.keyFields[0].value, 'fixture-cn')
assert.equal(sheet.data.minimaxApiBase, 'https://api.minimax.cn/v1')
sheet.data.editingRole = 'image'
sheet.selectModel({ detail: { provider: 'minimax', modelId: 'image-01-live' } })
assert.equal(sheet.data.ratioOptions.length, 8) // Auto plus seven official fixed ratios.
sheet.onMiniMaxRegionChange({ detail: { value: '0' } })
assert.equal(sheet.data.draft.modelRoutes.image.modelId, 'image-01')
assert.equal(sheet.data.keyFields[0].value, 'fixture-global')
assert.equal(sheet.data.minimaxApiBase, 'https://api.minimax.io/v1')

assert.equal(JSON.stringify(registry), original, 'view operations must not trim or mutate the canonical catalog')
console.log(JSON.stringify({ registryBytes: bytes({ registry }), maxPatchBytes, checkedResolutionOptions }))
delete global.Component
delete global.wx
