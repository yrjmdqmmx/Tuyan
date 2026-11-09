const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { loadComponent } = require('./helpers/component.cjs')
const { STATIC_MODEL_REGISTRY } = require('../miniprogram/utils/static-model-catalog.js')
const names = require('../../web/tests/fixtures/removed-model-names-main-c7b6a2fc.json')
const { getModelRegistryState } = require('../miniprogram/utils/model-registry-store.js')
const { auditedModelSpecs } = require('../miniprogram/utils/model-audit.js')
function noRawIds(text, id, row) {
  for (const [apiId, label] of [[id, row.displayName], [row.replacementApiId, row.replacementDisplayName]]) {
    if (apiId && apiId !== label) assert.ok(!text.includes(apiId), `${apiId}: ${text}`)
  }
}
test('R8 compiled mini notices and both confirmation paths use the exact main names for every removal', () => {
  let confirmations = 0
  getModelRegistryState().registry = { providers: STATIC_MODEL_REGISTRY }
  for (const [key, row] of Object.entries(names.models)) {
    const slash = key.indexOf('/'), provider = key.slice(0, slash), id = key.slice(slash + 1)
    const replacement = STATIC_MODEL_REGISTRY[provider].models.find(m => m.id === row.replacementApiId)
    const role = replacement?.roles.includes('main') ? 'main' : replacement?.roles[0] || 'main'
    let modal
    const p = loadComponent('components/model-picker/model-picker.js', {}, { wx: { showModal: value => { modal = value } } }).instance
    p.getRegistry = () => ({ providers: STATIC_MODEL_REGISTRY })
    Object.assign(p.properties, { selectedProvider: provider, selectedModel: id, role, outputFormat: role === 'image' ? 'png' : 'svg' })
    p.resetFlow()
    const expected = `${row.displayName}：原型号已不可用，请重新选择。${row.replacementApiId ? `推荐：${row.replacementDisplayName}` : ''}`
    assert.equal(p.data.removedHint, expected, key); noRawIds(p.data.removedHint, id, row)
    p.confirmReplacement()
    if (replacement) {
      assert.ok(modal, key)
      assert.ok(modal.content.includes(`${row.displayName} → ${row.replacementDisplayName}`))
      noRawIds(modal.content, id, row); modal.success({ confirm: false }); confirmations++
    } else assert.equal(modal, undefined)
    const sheet = loadComponent('components/generation-settings-sheet/generation-settings-sheet.js', {}, { wx: { showModal: value => { modal = value } } }).instance
    sheet.getRegistry = () => ({ providers: STATIC_MODEL_REGISTRY })
    const routes = { main: { accessProvider: '', modelId: '' }, image: { accessProvider: '', modelId: '' }, vision: { accessProvider: '', modelId: '' } }
    routes[role] = { accessProvider: provider, modelId: id }
    Object.assign(sheet.properties, { settings: { configurationMode: 'advanced', simpleProvider: provider, modelRoutes: routes, outputFormat: role === 'image' ? 'png' : 'svg', imageSize: '2K', aspectRatio: '1:1', providerRegions: {} }, purpose: 'create', executionRoles: [], apiKeys: {}, manualReferenceIds: [] })
    sheet.resetDraft(); modal = undefined
    const helper = sheet.data.routeRows.find(r => r.role === role)
    assert.equal(helper.removedHint, expected); noRawIds(helper.removedHint, id, row)
    sheet.replaceRemoved({ currentTarget: { dataset: { role } } })
    if (replacement) {
      assert.ok(modal, key)
      assert.ok(modal.content.includes(`${row.displayName} → ${row.replacementDisplayName}`))
      noRawIds(modal.content, id, row); modal.success({ confirm: false })
    } else assert.equal(modal, undefined)
  }
  assert.equal(confirmations, Object.values(names.models).filter(row => row.replacementApiId).length)
})

test('R8 every compiled mini card renders uppercase token units without changing source labels', () => {
  // Exercise the shipped renderer even for cards filtered out of current roles.
  const filename = path.resolve(__dirname, '../miniprogram/components/model-picker/model-picker.js')
  const context = { Component() {}, exports: {}, require: name => require(require.resolve(name, { paths: [path.dirname(filename)] })) }
  vm.runInNewContext(fs.readFileSync(filename, 'utf8') + '\nthis.renderCard = presentModel', context, { filename })
  let count = 0, lowercase = 0
  for (const [provider, channel] of Object.entries(STATIC_MODEL_REGISTRY)) for (const model of channel.models) {
    const card = context.renderCard(model, provider, model.id, provider)
    for (const [index, field] of [[2, 'totalContextTokens'], [3, 'maxOutputTokens']]) {
      assert.doesNotMatch(card.specRows[index].value, /\d(?:\.\d+)?[km]\b/, provider + '/' + model.id)
      const value = auditedModelSpecs(provider, model.id).fields[field].value
      if (typeof value === 'string' && /[km]$/.test(value)) {
        assert.ok(card.specRows[index].value.includes(value.slice(0, -1) + value.at(-1).toUpperCase()))
        assert.ok(card.auditMessage.includes(value + ' tokens')); lowercase++
      }
    }
    count++
  }
  assert.equal(count, 1064); assert.ok(lowercase > 0)
  const kimi = auditedModelSpecs('bailian', 'kimi-k3').fields
  assert.deepEqual(kimi.inputModalities.value, ['text', 'image']); assert.deepEqual(kimi.outputModalities.value, ['text'])
  assert.equal(kimi.totalContextTokens.value, 1048576); assert.equal(kimi.maxOutputTokens.value, 1048576)
})
