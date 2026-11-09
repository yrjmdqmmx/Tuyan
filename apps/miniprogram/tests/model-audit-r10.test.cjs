const test = require('node:test')
const assert = require('node:assert/strict')
const { modelDisplayName, auditedModelSpecs } = require('../miniprogram/utils/model-audit.js')
const { STATIC_MODEL_REGISTRY } = require('../miniprogram/utils/static-model-catalog.js')
const { loadComponent } = require('./helpers/component.cjs')

test('R10 non-removed names use the static catalog label', () => {
  for (const [provider, id] of [['bailian', 'kimi-k3'], ['fireworks', 'accounts/fireworks/models/kimi-k3p1-pro']]) {
    const model = STATIC_MODEL_REGISTRY[provider].models.find(m => m.id === id)
    assert.notEqual(model.label, id)
    assert.equal(modelDisplayName(provider, id), model.label)
  }
})
test('R10 unknown names strip any accounts/models prefix and preserve other IDs', () => {
  assert.equal(modelDisplayName('fireworks', 'accounts/example/models/new-model'), 'new-model')
  assert.equal(modelDisplayName('custom', 'vendor/new-model'), 'vendor/new-model')
})
test('R10 removed names retain tombstone displayName including Xiaomi original spelling', () => {
  assert.equal(modelDisplayName('xiaomi', 'mimo-v2.5'), 'MiMo-v2.5')
  assert.equal(modelDisplayName('xiaomi', 'mimo-v2.5-pro'), 'MiMo-v2.5-pro')
  assert.equal(modelDisplayName('fireworks', 'accounts/fireworks/models/glm-5p2'), 'GLM 5.2')
})
test('R10 compiled mini Kimi card shows exclusions instead of unknown modalities', () => {
  const facts = auditedModelSpecs('bailian', 'kimi-k3').fields
  assert.deepEqual(facts.inputModalities.value, ['text', 'image'])
  assert.deepEqual(facts.inputModalities.unsupportedModalities, ['audio', 'video'])
  assert.deepEqual(facts.outputModalities.unsupportedModalities, ['image', 'audio', 'video'])
  assert.equal(facts.inputModalities.sourceUrl, 'https://help.aliyun.com/zh/model-studio/kimi-k3')
  const picker = loadComponent('components/model-picker/model-picker.js').instance
  picker.getRegistry = () => ({ providers: STATIC_MODEL_REGISTRY })
  Object.assign(picker.properties, { role: 'main', outputFormat: 'svg' })
  const model = STATIC_MODEL_REGISTRY.bailian.models.find(m => m.id === 'kimi-k3')
  const { modelDeveloper } = require('../miniprogram/utils/model-presentation.js')
  Object.assign(picker.data, { activeProvider: 'bailian', activeVendor: modelDeveloper('bailian', model).label })
  picker.refreshModelLists()
  const rows = picker.data.visibleCompatibleModels.find(m => m.id === model.id).specRows
  assert.equal(rows[0].unknownText, ''); assert.equal(rows[1].unknownText, '')
  assert.equal(rows[0].unsupportedText, '音频、视频'); assert.equal(rows[1].unsupportedText, '图像、音频、视频')
})
