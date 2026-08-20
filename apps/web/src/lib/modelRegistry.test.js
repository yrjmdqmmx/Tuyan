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
  ]
  const partition = partitionRegistryModels(models, { role: 'image', outputFormat: 'png' })
  assert.deepEqual(partition.compatible.map((model) => model.id), ['ok'])
  assert.deepEqual(partition.incompatible.map((model) => [model.id, model.selectionDisabledReason]), [
    ['wrong-role', '此路由不提供图片输出'],
    ['disabled', '当前账号目录不可用'],
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

test('recommended models sort first and searchable results stay grouped by vendor', () => {
  const models = [
    { id: 'xai/grok-image', label: 'Grok Image', vendor: 'xAI', roles: ['image'], selectable: true },
    { id: 'google/gemini-image', label: 'Gemini Image', vendor: 'Google', roles: ['image'], selectable: true, recommended: true },
    { id: 'openai/gpt-image', label: 'GPT Image', vendor: 'OpenAI', roles: ['image'], selectable: true, recommended: true },
  ]
  const visible = filterRegistryModels(models, { role: 'image', query: 'image', outputFormat: 'png' })
  assert.deepEqual(visible.map((model) => model.id), ['google/gemini-image', 'openai/gpt-image', 'xai/grok-image'])
  assert.deepEqual(groupRegistryModels(visible).map((group) => group.vendor), ['OpenAI', 'Google', 'xAI'])
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
  assert.deepEqual(visible.map((model) => model.id), ['ok', 'wrong-format', 'catalog-disabled', 'protocol-disabled'])
  assert.equal(visible[0].selectionDisabled, false)
  assert.match(visible[1].selectionDisabledReason, /PNG/u)
  assert.equal(visible[2].selectionDisabledReason, '区域不可用')
  assert.equal(visible[3].selectionDisabled, true)
  assert.equal(visible[3].selectionDisabledReason, '未声明 PNG/SVG 输出')
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
