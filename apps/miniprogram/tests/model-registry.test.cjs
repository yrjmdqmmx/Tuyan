const assert = require('node:assert/strict')

const {
  MODEL_PROVIDER_IDS,
  groupRegistryModels,
  modelAvailabilityPresentation,
  normalizeModelRegistry,
  partitionRegistryModels,
} = require('../miniprogram/utils/model-registry.js')

function provider(id) {
  return {
    accessKind: id === 'openrouter' ? 'aggregator' : 'direct',
    routeContractVersion: 1,
    accountCatalogRequired: id === 'ark',
    defaults: { main: `${id}-main`, image: `${id}-image`, vision: `${id}-vision` },
    models: [
      { id: `${id}-main`, label: 'Main', vendor: 'Vendor A', lifecycle: 'stable', verificationState: 'registry', verified: true, selectable: true, roles: ['main'] },
      { id: `${id}-image`, label: 'Image', vendor: 'Vendor B', lifecycle: 'stable', verificationState: 'catalog', verified: false, selectable: true, roles: ['image'], capabilities: { outputFormats: ['png'], aspectRatios: ['1:1'] } },
      { id: `${id}-vision`, label: 'Vision', vendor: 'Vendor A', lifecycle: 'unknown', verificationState: 'unverified', verified: false, selectable: true, roles: ['vision'] },
    ],
  }
}

function registry() {
  return {
    code: 0,
    registryVersion: '2026-08-21.v9',
    routeContractVersion: 1,
    supportsModelRoutes: true,
    providers: Object.fromEntries(MODEL_PROVIDER_IDS.map((id) => [id, provider(id)])),
  }
}

assert.deepEqual(MODEL_PROVIDER_IDS, ['gemini', 'openai', 'bailian', 'ark', 'openrouter', 'deepseek', 'kimi', 'zhipu', 'siliconflow', 'anthropic', 'recraft', 'xai', 'bfl', 'stability', 'ideogram', 'minimax', 'mistral', 'together', 'fireworks', 'fal', 'replicate', 'tokendance'])
const normalized = normalizeModelRegistry(registry())
assert.equal(normalized.registryVersion, '2026-08-21.v9')
assert.equal(normalized.providers.openrouter.models.length, 3)
assert.throws(() => normalizeModelRegistry({ ...registry(), providers: { openai: provider('openai') } }), /五个 API 渠道/)
assert.throws(() => normalizeModelRegistry({ ...registry(), routeContractVersion: 0 }), /模型路由契约/)
assert.throws(() => normalizeModelRegistry({ ...registry(), providers: { ...registry().providers, openai: { ...provider('openai'), defaults: { main: 'missing', image: 'openai-image', vision: 'openai-vision' } } } }), /默认主模型/)

assert.deepEqual(modelAvailabilityPresentation({ lifecycle: 'stable', verificationState: 'registry', verified: true }), {
  lifecycleLabel: '稳定', verificationLabel: '注册表已验证', verifiedForAccount: false,
})
assert.equal(modelAvailabilityPresentation({ lifecycle: 'unknown', verificationState: 'catalog' }).lifecycleLabel, '生命周期未知')
assert.equal(modelAvailabilityPresentation({ lifecycle: 'stable', verificationState: 'catalog' }).verificationLabel, '官方目录')
assert.equal(modelAvailabilityPresentation({ lifecycle: 'stable', verificationState: 'inference-verified' }).verifiedForAccount, true)

const partition = partitionRegistryModels([
  { id: 'ok', vendor: 'OpenAI', roles: ['image'], selectable: true, capabilities: { outputFormats: ['png'] } },
  { id: 'disabled', vendor: 'Google', roles: ['image'], selectable: false, disabledReason: '当前账号无权益' },
  { id: 'wrong', vendor: 'OpenAI', roles: ['main'], roleReasons: { image: '不提供图片输出' } },
], { role: 'image', outputFormat: 'png' })
assert.deepEqual(partition.compatible.map((item) => item.id), ['ok'])
assert.deepEqual(partition.incompatible.map((item) => item.selectionDisabledReason), ['当前账号无权益', '不提供图片输出'])
assert.deepEqual(groupRegistryModels(partition.compatible).map((group) => group.vendor), ['OpenAI'])

console.log('model-registry.test.cjs passed')

// Older servers remain usable while new channels roll out. New partial-role
// catalogs are valid only when every role they do expose has a valid default.
const previousProviders = Object.fromEntries(['gemini', 'openai', 'bailian', 'ark', 'openrouter'].map((id) => [id, provider(id)]))
assert.equal(normalizeModelRegistry({ ...registry(), providers: previousProviders }).providers.xai, undefined)
const textOnly = { ...provider('anthropic'), defaults: { main: 'anthropic-main', image: '', vision: 'anthropic-vision' }, models: provider('anthropic').models.filter((item) => !item.roles.includes('image')) }
const imageOnly = { ...provider('recraft'), defaults: { main: '', image: 'recraft-image', vision: '' }, models: provider('recraft').models.filter((item) => item.roles.includes('image')) }
const partial = normalizeModelRegistry({ ...registry(), providers: { ...previousProviders, anthropic: textOnly, recraft: imageOnly } })
assert.equal(partial.providers.anthropic.defaults.image, '')
assert.equal(partial.providers.recraft.defaults.main, '')
assert.throws(() => normalizeModelRegistry({ ...registry(), providers: { ...previousProviders, anthropic: { ...textOnly, defaults: { ...textOnly.defaults, main: '' } } } }), /默认主模型/)

const datedFixture = registry()
datedFixture.providers.openai.models[0].expirationDate = '2000-01-01'
datedFixture.providers.openai.models[1].earliestRetirementDate = '2000-01-01'
datedFixture.providers.openai.models[1].replacementModelId = 'next-image'
datedFixture.providers.openai.models[1].regions = ['cn-beijing']
datedFixture.providers.openai.models[1].roleProtocols = { image: 'openai-images' }
const dated = normalizeModelRegistry(datedFixture)
assert.equal(partitionRegistryModels(dated.providers.openai.models, { role: 'main' }).compatible.length, 0)
assert.equal(partitionRegistryModels(dated.providers.openai.models, { role: 'image' }).compatible.length, 1)
assert.equal(dated.providers.openai.models[1].earliestRetirementDate, '2000-01-01')
assert.equal(dated.providers.openai.models[1].replacementModelId, 'next-image')
assert.deepEqual(dated.providers.openai.models[1].roleProtocols, { image: 'openai-images' })
assert.deepEqual(dated.providers.openai.models[1].regions, ['cn-beijing'])

const originalNow = Date.now
const zoneFixture = registry()
zoneFixture.providers.openai.models[0].expirationDate = '2026-10-10'
zoneFixture.providers.openai.models[0].expirationAt = '2026-10-10T00:00:00+08:00'
const zoned = normalizeModelRegistry(zoneFixture).providers.openai.models
try {
  Date.now = () => Date.parse('2026-10-09T15:59:59.999Z')
  assert.equal(partitionRegistryModels(zoned, { role: 'main' }).compatible.length, 1)
  Date.now = () => Date.parse('2026-10-09T16:00:00Z')
  assert.equal(partitionRegistryModels(zoned, { role: 'main' }).incompatible.length, 1)
} finally { Date.now = originalNow }
