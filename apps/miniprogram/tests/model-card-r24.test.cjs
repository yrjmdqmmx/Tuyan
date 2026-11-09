const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm')
const {createRequire} = require('node:module')
const {STATIC_MODEL_REGISTRY} = require('../miniprogram/utils/static-model-catalog.js')
const {historicalChannelIds, modalityIconStates, titleSourceRows} = require('../miniprogram/utils/card-presentation.js')
const fixture = require('../../../test-support/fixtures/model-card-r24.json')
const pages = require('../../../packages/api/src/card-data/tokendance-pages.json')
const filename = require.resolve('../miniprogram/components/model-picker/model-picker.js')
let definition, modal
const context = {Component(value){definition=value}, exports:{}, require:createRequire(filename), wx:{showModal(value){modal=value}}}
vm.runInNewContext(fs.readFileSync(filename,'utf8')+'\nthis.present=presentModel',context,{filename})

test('R24 Mini preserves retirement labels in all 1064 cards and the three reported copy dialogs', t => {
  let cards = 0, notices = 0, examples = 0
  const historical = new Set()
  for (const [provider, entry] of Object.entries(STATIC_MODEL_REGISTRY)) for (const model of entry.models) {
    const card = context.present(model,'','',provider), key = provider + '/' + model.id
    for (const row of card.specSources) {
      const url = new URL(row.url)
      if (/deprecat|depreciat|retire|sunset|下线/i.test(decodeURIComponent(url.pathname)) || /aliyun\.com$/.test(url.hostname) && /^\/notice\/\d+/.test(url.pathname) || url.hostname === 'docs.x.ai' && url.pathname.startsWith('/developers/migration/')) {
        assert.match(row.label, /^下线公告 · /, key); notices++
      }
      if (fixture.noticeCards.includes(key) && row.url === fixture.noticeUrl) {
        assert.equal(row.label, fixture.noticeLabel)
        definition.methods.copySource({currentTarget:{dataset:{url:row.url,source:row.label,notice:card.auditMessage}}})
        assert.ok(modal.content.endsWith(fixture.noticeLabel)); examples++
      }
    }
    for (const icon of card.specRows.flatMap(row=>row.icons)) if (icon.tooltip.includes('渠道页无此型号')) {assert.equal(provider,'tokendance'); historical.add(model.id)}
    cards++
  }
  assert.equal(cards,1064); assert.equal(examples,3); assert.ok(notices>3)
  assert.deepEqual([...historical].sort(),fixture.historicalIds)
  assert.deepEqual([...historicalChannelIds(pages)].sort(),fixture.historicalIds)
  const missing = historicalChannelIds({...pages,...fixture.syntheticPages})
  for (const id of Object.keys(fixture.syntheticPages)) for (const icon of modalityIconStates('未知',{state:'unknown'},'tokendance',id,missing)) {
    assert.equal(icon.tooltip,id==='extra-retired-model'?'渠道页无此型号':'渠道未标注此模态'); assert.equal(icon.state,'unknown')
  }
  assert.equal(titleSourceRows([{url:fixture.noticeUrl,label:'渠道公告'}])[0].label,'渠道公告 · 百炼 · 模型下线公告')
  t.diagnostic(JSON.stringify({cards,notices,historical:historical.size}))
})
