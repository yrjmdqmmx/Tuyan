import assert from 'node:assert/strict'
import test from 'node:test'
import {
  filterRegistryModels,
  groupRegistryModels,
  mergeProviderRegistry,
  modelRefinePresentation,
  partitionRegistryModels,
  uniqueRegistryModels,
} from './modelRegistry.js'

const fallback = {
  mainModel: 'old-main', imageModel: 'old-image', visionModel: 'old-vision',
  mainModels: [['old-main', 'Old Main']], imageModels: [['old-image', 'Old Image']], visionModels: [['old-vision', 'Old Vision']],
  guideUrl: 'https://example.com', guideSteps: ['Keep'], label: 'Provider', keyName: 'provider', keyPlaceholder: 'key',
}

test('server registry replaces stale role lists and defaults while preserving provider UI metadata', () => {
  const merged = mergeProviderRegistry(fallback, {
    accessKind: 'aggregator',
    routeContractVersion: 1,
    accountCatalogRequired: true,
    defaults: { main: 'new-main', image: 'new-image', vision: 'new-vision' },
    models: [
      { id: 'new-main', label: 'New Main', roles: ['main'], availabilityNotes: 'Stable' },
      { id: 'new-image', label: 'New Image', roles: ['image'], availabilityNotes: 'Dedicated API' },
      { id: 'new-vision', label: 'New Vision', roles: ['main', 'vision'], availabilityNotes: 'Reads images' },
    ],
  })
  assert.equal(merged.guideUrl, fallback.guideUrl)
  assert.equal(merged.accessKind, 'aggregator')
  assert.equal(merged.routeContractVersion, 1)
  assert.equal(merged.accountCatalogRequired, true)
  assert.equal(merged.mainModel, 'new-main')
  assert.deepEqual(merged.mainModels.map(([id]) => id), ['new-main', 'new-vision'])
  assert.deepEqual(merged.imageModels, [['new-image', 'New Image']])
  assert.deepEqual(merged.visionModels, [['new-vision', 'New Vision']])
})

test('models within each vendor use real releasedAt descending with unknown dates last and stable', () => {
  const models = [
    { id: 'unknown-a', vendor: 'Google', roles: ['main'], releasedAt: null },
    { id: 'new', vendor: 'Google', roles: ['main'], releasedAt: '2026-08-14' },
    { id: 'unknown-b', vendor: 'Google', roles: ['main'], releasedAt: null },
    { id: 'old', vendor: 'Google', roles: ['main'], releasedAt: '2026-06-01' },
  ]
  assert.deepEqual(groupRegistryModels(filterRegistryModels(models, { role: 'main' }))[0].models.map((model) => model.id), [
    'new', 'old', 'unknown-a', 'unknown-b',
  ])
})

test('a newer stable model sorts ahead of an older recommended model in the same vendor', () => {
  const models = [
    { id: 'old-recommended', vendor: 'OpenAI', roles: ['main'], releasedAt: '2026-01-01', recommended: true },
    { id: 'new-standard', vendor: 'OpenAI', roles: ['main'], releasedAt: '2026-08-01' },
  ]
  assert.deepEqual(groupRegistryModels(filterRegistryModels(models, { role: 'main' }))[0].models.map((model) => model.id), [
    'new-standard', 'old-recommended',
  ])
})

test('recommended catalog excludes preview and invite models even when flagged recommended', () => {
  const models = [
    { id: 'stable', vendor: 'OpenAI', roles: ['main'], lifecycle: 'stable', recommended: true },
    { id: 'preview', vendor: 'OpenAI', roles: ['main'], lifecycle: 'preview', recommended: true },
    { id: 'invite', vendor: 'OpenAI', roles: ['main'], lifecycle: 'invite-only', recommended: true },
    { id: 'unknown', vendor: 'OpenAI', roles: ['main'], lifecycle: 'unknown', recommended: true },
    { id: 'missing', vendor: 'OpenAI', roles: ['main'], recommended: true },
  ]
  assert.deepEqual(filterRegistryModels(models, { role: 'main', recommendedOnly: true }).map((model) => model.id), ['stable'])
})

test('OpenRouter compatible choices and disabled entries are partitioned with server reasons', () => {
  const models = [
    { id: 'ok', roles: ['image'], selectable: true, vendor: 'OpenAI', capabilities: { outputFormats: ['png'] } },
    { id: 'wrong-role', roles: ['main'], selectable: true, vendor: 'OpenAI', roleReasons: { image: '此路由不提供图片输出' } },
    { id: 'disabled', roles: ['image'], selectable: false, vendor: 'OpenAI', disabledReason: '当前账号目录不可用' },
    { id: 'unrelated-text', roles: ['main'], selectable: true, vendor: 'Anthropic' },
    { id: 'generic-chat-image-output', roles: ['main'], selectable: true, vendor: 'OpenRouter', protocol: 'openrouter-chat-completions', outputModalities: ['text', 'image'] },
  ]
  const partition = partitionRegistryModels(models, { role: 'image', outputFormat: 'png' })
  assert.deepEqual(partition.compatible.map((model) => model.id), ['ok'])
  assert.deepEqual(partition.incompatible.map((model) => [model.id, model.selectionDisabledReason]), [
    ['wrong-role', '此路由不提供图片输出'],
  ])
})

test('missing registry keeps the safe built-in fallback', () => {
  assert.equal(mergeProviderRegistry(fallback, null), fallback)
})

test('selected model notes are unique when one model fills main and vision roles', () => {
  const shared = { id: 'qwen3.8-max', protocol: 'chat' }
  const image = { id: 'wan2.7-image-pro', protocol: 'image' }
  assert.deepEqual(uniqueRegistryModels([shared, image, shared]), [shared, image])
})

test('unknown release dates keep deterministic ties regardless of recommendation and vendor grouping stays canonical', () => {
  const models = [
    { id: 'xai/grok-image', label: 'Grok Image', vendor: 'xAI', roles: ['image'], selectable: true },
    { id: 'google/gemini-image', label: 'Gemini Image', vendor: 'Google', roles: ['image'], selectable: true, recommended: true },
    { id: 'openai/gpt-image', label: 'GPT Image', vendor: 'OpenAI', roles: ['image'], selectable: true, recommended: true },
  ]
  const visible = filterRegistryModels(models, { role: 'image', query: 'image', outputFormat: 'png' })
  assert.deepEqual(visible.map((model) => model.id), ['google/gemini-image', 'openai/gpt-image', 'xai/grok-image'])
  assert.deepEqual(groupRegistryModels(visible).map((group) => group.vendor), ['OpenAI', 'SpaceXAI', '谷歌'])
})

test('role and output format filters keep incompatible entries visible but disabled', () => {
  const models = [
    { id: 'ok', vendor: 'OpenAI', roles: ['image'], selectable: true, outputModalities: ['image'], capabilities: { outputFormats: ['png'] } },
    { id: 'wrong-format', vendor: 'OpenAI', roles: ['image'], selectable: true, outputModalities: ['image'], capabilities: { outputFormats: ['jpeg'] } },
    { id: 'catalog-disabled', vendor: 'Google', roles: ['image'], selectable: false, disabledReason: '区域不可用', capabilities: { outputFormats: ['png'] } },
    { id: 'protocol-disabled', vendor: 'Google', roles: [], selectable: false, protocol: 'openrouter-images', outputModalities: ['image'], disabledReason: '未声明 PNG/SVG 输出' },
    { id: 'text-only', vendor: 'Anthropic', roles: ['main'], selectable: true },
  ]
  const visible = filterRegistryModels(models, { role: 'image', outputFormat: 'png' })
  assert.deepEqual(visible.map((model) => model.id), ['ok', 'wrong-format'])
  assert.equal(visible[0].selectionDisabled, false)
  assert.match(visible[1].selectionDisabledReason, /PNG/u)
  assert.equal(models[2].id, 'catalog-disabled')
})

test('model search indexes declared roles, capabilities, and protocol instead of labels only', () => {
  const models = [
    {
      id: 'seedream-current', label: 'Seedream Current', vendor: 'ByteDance Seedream',
      roles: ['image'], selectable: true, protocol: 'ark-images',
      capabilities: { imageEditMode: 'direct-edit', outputFormats: ['png'] },
    },
    {
      id: 'doubao-vision', label: 'Doubao Vision', vendor: 'ByteDance Doubao',
      roles: ['main', 'vision'], selectable: true, protocol: 'ark-openai-chat', capabilities: {},
    },
  ]

  assert.deepEqual(filterRegistryModels(models, { role: 'image', query: '图像生成' }).map((model) => model.id), ['seedream-current'])
  assert.deepEqual(filterRegistryModels(models, { role: 'vision', query: '视觉' }).map((model) => model.id), ['doubao-vision'])
  assert.deepEqual(filterRegistryModels(models, { role: 'image', query: 'ark-images' }).map((model) => model.id), ['seedream-current'])
})

test('refine presentation never calls a model direct edit without input references', () => {
  assert.deepEqual(modelRefinePresentation({
    inputModalities: ['text', 'image'],
    capabilities: { imageEditMode: 'direct-edit', input_references: true },
  }).label, '直接编辑')
  assert.deepEqual(modelRefinePresentation({
    inputModalities: ['text'],
    capabilities: { imageEditMode: 'direct-edit' },
  }).label, '分析后重绘')
})

test('cached expiration dates disable selection, while earliest dates and provider placeholders remain informational', () => {
  const models = [
    { id: 'expired', selectable: true, roles: ['main'], expirationDate: '2000-01-01' },
    { id: 'earliest', selectable: true, roles: ['main'], earliestRetirementDate: '2000-01-01' },
    { id: 'placeholder', selectable: true, roles: ['main'], expirationDate: '2098-12-31' },
  ]
  const { compatible, incompatible } = partitionRegistryModels(models, { role: 'main' })
  assert.deepEqual(compatible.map((m) => m.id), ['earliest', 'placeholder'])
  assert.deepEqual(incompatible, [])
  assert.equal(models[0].id, 'expired', 'historical identity is preserved')
})

test('cached retirement instants honor the channel time zone', () => {
  const now = Date.now
  const model = { id: 'cn', roles: ['main'], selectable: true, expirationDate: '2026-10-10', expirationAt: '2026-10-10T00:00:00+08:00' }
  try {
    Date.now = () => Date.parse('2026-10-09T15:59:59.999Z')
    assert.equal(partitionRegistryModels([model], { role: 'main' }).compatible.length, 1)
    Date.now = () => Date.parse('2026-10-09T16:00:00Z')
    assert.equal(partitionRegistryModels([model], { role: 'main' }).incompatible.length, 0)
  } finally { Date.now = now }
})

test('retired configured default stays identifiable and never becomes a selectable option', () => {
  const retired = { id: 'previous', roles: ['vision'], selectable: false, disabledReason: '渠道已确认停用；请手动选择。' }
  const registry = { defaults: { main: '', image: '', vision: 'previous' }, models: [retired, { id: 'current', roles: ['vision'], selectable: true }] }
  const merged = mergeProviderRegistry(fallback, registry)
  assert.equal(merged.visionModel, 'previous')
  assert.deepEqual(merged.visionModels, [['current', 'current']])
  assert.deepEqual(partitionRegistryModels(merged.registryModels, { role: 'vision' }).compatible.map(m => m.id), ['current'])
  assert.equal(registry.defaults.vision, 'previous')
})

test('temporarily unavailable models are hidden without mutating saved identities',()=>{
  const models=[{id:'quarantined',roles:['main'],selectable:false,disabledReason:'暂不可用'},{id:'unverified',roles:['main'],selectable:true,verificationState:'catalog'}]
  assert.deepEqual(filterRegistryModels(models,{role:'main'}).map(m=>m.id),['unverified'])
  assert.deepEqual(partitionRegistryModels(models,{role:'main'}).incompatible,[])
  assert.equal(models[0].id,'quarantined')
})
