const test = require('node:test')
const assert = require('node:assert/strict')
const { auditedModelSpecs } = require('../miniprogram/utils/model-audit.js')
const { STATIC_MODEL_REGISTRY } = require('../miniprogram/utils/static-model-catalog.js')
const { modelDeveloper } = require('../miniprogram/utils/model-presentation.js')
const { loadComponent } = require('./helpers/component.cjs')
test('R21 compiled Mini facts match every channel declaration without unioning base arrays', async () => {
  const { assertTokenDanceFacts } = await import('../../../test-support/tokendance-modality-assertions.mjs')
  assertTokenDanceFacts(id => auditedModelSpecs('tokendance', id))
})
test('R21 Mini visible sources are model pages, never portal JSON', async () => {
  const { tokenDanceBefore } = await import('../../../test-support/tokendance-modality-assertions.mjs')
  const { isApiSource } = await import('../../web/src/lib/modelCardSources.js')
  assert.equal(isApiSource('https://tokendance.space/portal/api/models/qwen3.6-plus'), true)
  for (const { id } of tokenDanceBefore.rows) assert.equal(auditedModelSpecs('tokendance', id).sourceUrl, 'https://tokendance.space/models/' + id)
})
test('R21 compiled Mini picker renders Qwen exclusions and all three promoted cards', () => {
  const picker = loadComponent('components/model-picker/model-picker.js').instance
  picker.getRegistry = () => ({ providers: STATIC_MODEL_REGISTRY })
  Object.assign(picker.properties, { role: 'main', outputFormat: 'svg' })
  for (const [id, supported] of [['qwen3.6-plus', []], ['kimi-k3.1-pro', ['图像', '视频']], ['minimax-m3.1-flash', ['图像']], ['deepseek-v4.1-flash-1017', ['图像']]]) {
    const model = STATIC_MODEL_REGISTRY.tokendance.models.find(m => m.id === id)
    Object.assign(picker.data, { activeProvider: 'tokendance', activeVendor: modelDeveloper('tokendance', model).label })
    picker.refreshModelLists()
    const row = picker.data.visibleCompatibleModels.find(m => m.id === id).specRows[0]
    assert.equal(row.unknownText, '')
    for (const label of supported) assert.ok(row.value.includes(label), id + '/' + label)
    if (id === 'qwen3.6-plus') assert.equal(row.unsupportedText, '图像、音频、视频')
  }
})
