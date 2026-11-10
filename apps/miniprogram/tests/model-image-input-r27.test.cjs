const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), vm = require('node:vm'), {createRequire} = require('node:module')
test('R27 all 15 compiled Mini image icons and dialog sources retain the edit quote URL and date', async () => {
  const {imageInputPresentations, assertImageInput, review} = await import('../../../test-support/image-input-r27.mjs')
  const now = await imageInputPresentations()
  const filename = require.resolve('../miniprogram/components/model-picker/model-picker.js')
  let definition, modal, clipboard
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {Component(value){definition=value},exports:{},require:createRequire(filename),
    wx:{showModal(value){modal=value},setClipboardData(value){clipboard=value.data}}}, {filename})
  for (const [key, fields] of Object.entries(review.reviews)) {
    const {card, audit} = now[key].mini
    assertImageInput(key, audit.fields.inputModalities, card.specRows[0].icons, card.specSources)
    assert.ok(card.auditMessage.includes('输入：渠道公布（核实日期：' + fields.inputModalities.verifiedAt + '）'), key)
    assert.doesNotMatch(card.auditMessage, /创始人|决定 A/)
    const icon = card.specRows[0].icons.find(icon => icon.id === 'image')
    definition.methods.showModality({currentTarget:{dataset:{label:icon.accessibleLabel,detail:icon.tooltip}}})
    assert.equal(modal.title, '图像：支持'); assert.equal(modal.content, icon.tooltip)
    const source = card.specSources[0]
    definition.methods.copySource({currentTarget:{dataset:{url:source.url,source:source.label,notice:card.auditMessage}}})
    assert.match(modal.content, /编辑接口|Edit API 文档/); modal.success({confirm:true}); assert.equal(clipboard, source.url)
  }
})
