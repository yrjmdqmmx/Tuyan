import test from 'node:test'
import assert from 'node:assert/strict'
import {imageInputPresentations} from '../test-support/image-input-r27.mjs'
import {assertR28Presentations, r28Baseline} from '../test-support/founder-fixes-r28.mjs'
import {sourceTitle} from '../packages/api/src/card-presentation.mjs'
import {modalityIconStates} from '../packages/api/src/modality-presentation.mjs'
import {isApiSource} from '../packages/api/src/model-card-sources.mjs'
import {applyEvidenceR28} from './lib/model-evidence-r28.mjs'
import review from '../config/channel-audit/review-r28-20261110.json' with {type:'json'}

test('R28 all 1064 presentations: exact unknown prefix, conditions, field sources, dates and no unrelated changes', async () => {
  const now = await imageInputPresentations()
  assertR28Presentations(now)
  for (const [key, card] of Object.entries(now)) for (const [field, fact] of Object.entries(card.web.data.fields)) {
    for (const property of ['value','state','provenance']) {
      assert.deepEqual(fact[property], r28Baseline[key].web.data.fields[field][property], key + '/' + field + '/' + property)
      assert.deepEqual(card.mini.audit.fields[field][property], r28Baseline[key].mini.audit.fields[field][property], key + '/Mini/' + field + '/' + property)
    }
  }
  const catalogFields = Object.entries(r28Baseline).filter(([key]) => key.startsWith('fal/')).flatMap(([key, row]) => Object.entries(row.web.data.fields).filter(([, fact]) => fact.sourceUrl === review.catalogUrl).map(([field]) => key + '/' + field))
  assert.deepEqual(catalogFields.sort(), review.fields.map(row => row.identity + '/' + row.field).sort())
  assert.deepEqual(review.counts, {fields:61,pages:36,moved:61,kept:0})
  let falFields = 0
  for (const [key, card] of Object.entries(now).filter(([key]) => key.startsWith('fal/'))) {
    for (const [field, fact] of Object.entries(card.web.data.fields)) {
      assert.equal(fact.sourceUrl, card.mini.audit.fields[field].sourceUrl, key + '/' + field)
      falFields++
    }
    for (const [i, icons] of [card.web.inputIcons, card.web.outputIcons].entries()) for (const mini of card.mini.card.specRows[i].icons) {
      const title = icon => icon.tooltip.replace(/（\d{4}-\d{2}-\d{2}）/g, '')
      assert.equal(title(mini), title(icons.find(icon => icon.id === mini.id)), key + ' title parity')
    }
  }
  assert.equal(falFields, 196)
  for (const row of review.fields) {
    const card = now[row.identity], index = row.field === 'inputModalities' ? 0 : 1
    const webFact = card.web.data.fields[row.field], miniFact = card.mini.audit.fields[row.field]
    for (const fact of [webFact, miniFact]) {
      assert.deepEqual(fact.value, row.before.value); assert.equal(fact.state, row.before.state)
      assert.equal(fact.sourceUrl, row.sourceUrl); assert.equal(fact.verifiedAt, row.verifiedAt)
    }
    const web = index ? card.web.outputIcons : card.web.inputIcons, mini = card.mini.card.specRows[index].icons
    assert.deepEqual(web, mini, row.identity + '/' + row.field + ' all icon attribution titles must match')
    const title = '渠道资料 · ' + sourceTitle(row.sourceUrl)
    assert.ok(card.web.sources.some(source => source.url === row.sourceUrl && source.label === title), row.identity)
    assert.ok(card.web.sources.some(source => source.url === row.sourceUrl))
    assert.ok(card.mini.card.specSources.some(source => source.url === row.sourceUrl))
    assert.equal(isApiSource(row.sourceUrl), false)
  }
  for (const [key, card] of Object.entries(now)) for (const icons of [card.web.inputIcons, card.web.outputIcons, ...card.mini.card.specRows.slice(0, 2).map(spec => spec.icons)]) for (const icon of icons) {
    assert.doesNotMatch(icon.tooltip + icon.accessibleLabel, /有条件支持|渠道资料 · API · 模型列表/, key)
    if (['unknown','unlisted'].includes(icon.state)) {
      assert.match(icon.tooltip, /^官方资料未说明是否支持(文本|图像|视频|音频)(输入|输出)$/)
      assert.equal(icon.accessibleLabel, icon.tooltip)
    } else if (icon.state === 'conditional') {
      assert.equal(icon.accessibleLabel, icon.tooltip)
      assert.match(icon.tooltip, /^支持(文本|图像|视频|音频)(输入|输出)（[^（）]+）$/)
    }
  }
  const kimi = now['kimi/kimi-k3'].web.outputIcons.find(icon => icon.state === 'unknown')
  assert.ok(kimi); assert.equal(kimi.accessibleLabel, kimi.tooltip)
  const fallback = modalityIconStates('', {state:'known',value:['image'],provenance:'channel',sourceUrl:review.catalogUrl})
  assert.equal(fallback[1].tooltip, '支持图像输入')
  assert.equal(isApiSource(review.catalogUrl), true)
})

test('R28 source application rejects invalid status, identity, quote, direction and values', () => {
  const makeData = evidence => ({fields:['inputModalities','outputModalities'],sources:[evidence.catalogUrl],facts:[],rows:{},details:{}})
  const data = makeData(review)
  for (const row of review.fields) {
    data.rows[row.identity] ||= []
    data.rows[row.identity][data.fields.indexOf(row.field)] = data.facts.push([row.before.value,row.before.state,row.before.provenance,0]) - 1
  }
  assert.doesNotThrow(() => applyEvidenceR28(structuredClone(data)))
  for (const mutate of [r => r.pages[r.fields[0].sourceUrl].status = 404, r => r.fields[0].identityQuote = 'different-model', r => r.fields[0].evidence[0].quote = 'navigation', r => r.fields[0].evidence[0].section = 'Output', r => r.fields[0].evidence[0].modality = 'video']) {
    const bad = structuredClone(review); mutate(bad)
    assert.throws(() => applyEvidenceR28(structuredClone(data), bad))
  }
})
