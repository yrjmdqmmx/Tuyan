import test, { afterEach } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { render, screen, within, fireEvent, cleanup } from '@testing-library/react'
import { ModelSpecifications } from '../src/components/ModelSpecifications.jsx'
import { modelCardSpecifications } from '../src/lib/modelCardSpecifications.js'
import { modelCardSources, modelSourceRows, isVerifiedTokenDancePage } from '../src/lib/modelCardSources.js'
import { STATIC_MODEL_REGISTRY } from '../src/lib/staticModelCatalog.js'
import { displayModalities, displayModalityText, sourceIdentity } from '../../../packages/api/src/card-presentation.mjs'
import { modalityIconStates } from '../src/lib/modelModalityIcons.js'
import { assertReviewedLinks, expectedTokenDanceSources } from '../../../test-support/card-review-r22.mjs'
afterEach(cleanup)
const model = (channel, id) => STATIC_MODEL_REGISTRY[channel].models.find(model => model.id === id)
test('R22B all 74 TokenDance cards use rendered evidence; seven histories retain main links and missing evidence has no link', () => {
  assertReviewedLinks(id => modelCardSpecifications('tokendance', { id }))
  for (const entry of STATIC_MODEL_REGISTRY.tokendance.models) {
    const before = structuredClone(entry)
    render(React.createElement(ModelSpecifications, {provider:'tokendance', model:entry}))
    assert.equal(screen.getByRole('link').getAttribute('href'), expectedTokenDanceSources(entry.id)[0])
    assert.deepEqual(entry, before)
    cleanup()
  }
  const url = 'https://tokendance.space/models/uncaptured-id'
  for (const channel of ['tokendance', 'custom']) {
    assert.deepEqual(modelCardSources({channel, model:{id:'uncaptured-id'}, audit:{sourceUrl:url}, fields:{}}).sources, [])
  }
  for (const sourceUrl of ['https://tokendance.space/models', 'https://tokendance.space/docs']) assert.deepEqual(modelCardSources({channel:'tokendance',model:{id:'uncaptured-id'},audit:{sourceUrl},fields:{}}).sources, [])
  assert.equal(isVerifiedTokenDancePage(url), false)
  assert.equal(isVerifiedTokenDancePage('https://tokendance.space/models/qwen3.6-plus?utm_source=card#details'), true)
  assert.equal(isVerifiedTokenDancePage('https://tokendance.space/models/qwen3.6-plus?model=uncaptured'), false)
  render(React.createElement(ModelSpecifications, {provider:'tokendance', model:{id:'uncaptured-id'}}))
  assert.equal(screen.queryByRole('link'), null)
  screen.getByText('官方文档待确认')
})
test('R22B all 1064 cards have unique canonical URLs and unique visible source names', () => {
  let count = 0
  for (const [channel, provider] of Object.entries(STATIC_MODEL_REGISTRY)) for (const entry of provider.models) {
    const card = modelCardSpecifications(channel, entry), rows = modelSourceRows(card)
    assert.equal(new Set(rows.map(row => sourceIdentity(row.url))).size, rows.length, channel+'/'+entry.id)
    assert.equal(new Set(rows.map(row => row.label)).size, rows.length, channel+'/'+entry.id)
    for (const row of rows) if (row.url.startsWith('https://tokendance.space/models/')) assert.ok(isVerifiedTokenDancePage(row.url))
    count++
  }
  assert.equal(count, 1064)
})
test('R22B normalized duplicates across evidence lists render once with Bailian page subjects in the mobile dialog', t => {
  const url='https://help.aliyun.com/zh/model-studio/deepseek-v4-1-flash'
  const sources=modelCardSources({channel:'bailian',model:{},audit:{sourceUrls:[url+'/',url+'#inputs',url+'?utm_source=test'],sourceLinks:[{url,scope:'channel'}]},fields:{}})
  assert.equal(sources.sources.length,1)
  assert.equal(sources.channelSources.length,1)
  const original = window.matchMedia
  window.matchMedia = () => ({matches:true})
  t.after(() => { window.matchMedia = original })
  render(React.createElement(ModelSpecifications,{provider:'bailian',model:model('bailian','deepseek-v4.1-flash')}))
  assert.equal(screen.getByRole('link').textContent,'官方文档 · 百炼 · DeepSeek-V4.1-Flash 模型页')
  fireEvent.click(screen.getByRole('link'))
  const dialog=screen.getByRole('dialog'), links=within(dialog).getAllByRole('link')
  assert.equal(links.length,4)
  assert.equal(new Set(links.map(a=>sourceIdentity(a.href))).size,4)
  assert.equal(new Set(links.map(a=>a.textContent)).size,4)
  within(dialog).getByRole('link',{name:'官方文档 · 百炼 · 模型列表'})
  for (const a of links) assert.equal(dialog.textContent.split(a.textContent).length-1,1, 'source appears once, not again in details')
})
test('R22B modality text, icons and tooltip subjects sort copies as text image video audio', () => {
  const raw=['audio','video','image','text','file'], before=[...raw]
  assert.deepEqual(displayModalities(raw),['text','image','video','audio','file'])
  assert.deepEqual(raw,before)
  assert.equal(displayModalityText('音频、视频（需确认）、图像、文本、文件'),'文本、图像、视频（需确认）、音频、文件')
  const card=modelCardSpecifications('custom',{id:'ordering',specifications:{version:1,officialInputModalities:raw,sourceUrls:['https://example.com/spec']}})
  assert.equal(card.input,'文本、图像、视频、音频、文件')
  assert.deepEqual(modalityIconStates(card.input,card.inputFact).map(row=>row.id),['text','image','video','audio'])
  render(React.createElement(ModelSpecifications,{provider:'tokendance',model:model('tokendance','kimi-k3.1-pro')}))
  assert.deepEqual(within(screen.getByRole('group',{name:'输入模态'})).getAllByRole('img').map(node=>node.getAttribute('aria-label')),['文本：支持','图像：支持','视频：支持','音频：渠道未开放'])
  assert.deepEqual(model('tokendance','kimi-k3.1-pro').roles,['main'], 'vision role remains execution-based')
})
test('R22B every vendor-only TokenDance limit is visibly attributed beside the value', () => {
  let fields=0
  for (const entry of STATIC_MODEL_REGISTRY.tokendance.models) {
    const card=modelCardSpecifications('tokendance',entry)
    const {container}=render(React.createElement(ModelSpecifications,{provider:'tokendance',model:entry}))
    for (const [index,key] of ['inputModalities','outputModalities','totalContextTokens','maxOutputTokens'].entries()) {
      const fact=card.fields[key], dd=container.querySelectorAll('dd')[index]
      if(fact.provenance==='vendor' && fact.state==='known') {assert.ok(dd.textContent.includes('源自原厂'),entry.id+'/'+key);fields++}
      if(fact.state==='unknown') assert.ok(!/0 tokens|∞/.test(dd.textContent))
    }
    if(entry.id==='qwen3.6-plus') assert.match(container.querySelectorAll('dd')[3].textContent,/≈ 66K tokens源自原厂/)
    cleanup()
  }
  assert.equal(fields,20)
})
