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

assert.deepEqual(MODEL_PROVIDER_IDS, ['gemini', 'openai', 'bailian', 'ark', 'openrouter'])
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
assert.equal(modelAvailabilityPresentation({ lifecycle: 'stable', verificationState: 'catalog' }).verificationLabel, '目录可见，尚未实测')
assert.equal(modelAvailabilityPresentation({ lifecycle: 'stable', verificationState: 'inference-verified' }).verifiedForAccount, true)

const partition = partitionRegistryModels([
  { id: 'ok', vendor: 'OpenAI', roles: ['image'], selectable: true, capabilities: { outputFormats: ['png'] } },
  { id: 'disabled', vendor: 'Google', roles: ['image'], selectable: false, disabledReason: '当前账号无权益' },
  { id: 'wrong', vendor: 'OpenAI', roles: ['main'], roleReasons: { image: '不提供图片输出' } },
], { role: 'image', outputFormat: 'png' })
assert.deepEqual(partition.compatible.map((item) => item.id), ['ok'])
assert.deepEqual(partition.incompatible.map((item) => item.selectionDisabledReason), ['不提供图片输出', '当前账号无权益'])
assert.deepEqual(groupRegistryModels(partition.compatible).map((group) => group.vendor), ['OpenAI'])

console.log('model-registry.test.cjs passed')
