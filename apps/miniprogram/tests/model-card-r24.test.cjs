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
  const historical = historicalChannelIds(pages)
  for (const [provider, entry] of Object.entries(STATIC_MODEL_REGISTRY)) for (const model of entry.models) {
    const card = context.present(model,'','',provider), key = provider + '/' + model.id
    if (fixture.noticeCards.includes(key)) assert.ok(!card.specSources.some(row => row.url === fixture.noticeUrl))
    for (const row of card.specSources) {
      const url = new URL(row.url)
      if (/deprecat|depreciat|retire|sunset|下线/i.test(decodeURIComponent(url.pathname)) || /aliyun\.com$/.test(url.hostname) && /^\/notice\/\d+/.test(url.pathname) || url.hostname === 'docs.x.ai' && url.pathname.startsWith('/developers/migration/')) {
        assert.match(row.label, /^下线公告 · /, key); notices++
      }
      if (fixture.currentNotices[key] && row.url === fixture.currentNotices[key].url) {
        assert.equal(row.label, fixture.currentNotices[key].label.replace('2027-01-19','2027年01月19日'))
        definition.methods.copySource({currentTarget:{dataset:{url:row.url,source:row.label,notice:card.auditMessage}}})
        assert.ok(modal.content.endsWith(fixture.currentNotices[key].label.replace('2027-01-19','2027年01月19日'))); examples++
      }
    }
    for (const icon of card.specRows.flatMap(row=>row.icons)) if (icon.tooltip.includes('渠道页无此型号')) {assert.equal(provider,'tokendance'); historical.add(model.id)}
    cards++
  }
  assert.equal(cards,1064); assert.equal(examples,1); assert.ok(notices>3)
  assert.deepEqual([...historical].sort(),fixture.historicalIds)
  assert.deepEqual([...historicalChannelIds(pages)].sort(),fixture.historicalIds)
  const missing = historicalChannelIds({...pages,...fixture.syntheticPages})
  for (const id of Object.keys(fixture.syntheticPages)) for (const icon of modalityIconStates('未知',{state:'unknown'},'tokendance',id,missing)) {
    assert.equal(icon.tooltip,'官方资料未说明是否支持'+icon.label+'输入'); assert.equal(icon.state,'unknown')
  }
  assert.equal(titleSourceRows([{url:fixture.noticeUrl,label:'渠道公告'}])[0].label,'下线公告 · 百炼 · 模型下线公告')
  t.diagnostic(JSON.stringify({cards,notices,historical:historical.size}))
})
