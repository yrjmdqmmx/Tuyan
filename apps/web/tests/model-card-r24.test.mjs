import test, { afterEach } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { render, screen, within, fireEvent, cleanup } from '@testing-library/react'
import { STATIC_MODEL_REGISTRY } from '../src/lib/staticModelCatalog.js'
import { modelCardSpecifications } from '../src/lib/modelCardSpecifications.js'
import { modelSourceRows } from '../src/lib/modelCardSources.js'
import { ModelSpecifications } from '../src/components/ModelSpecifications.jsx'
import { titleSourceRows } from '../../../packages/api/src/card-presentation.mjs'
import { historicalChannelIds, modalityIconStates } from '../../../packages/api/src/modality-presentation.mjs'
import pages from '../../../packages/api/src/card-data/tokendance-pages.json' with { type: 'json' }
import fixture from '../../../test-support/fixtures/model-card-r24.json' with { type: 'json' }
afterEach(cleanup)

test('R24 Web keeps retirement roles in the three reported cards and their dialogs', () => {
  for (const key of fixture.noticeCards) {
    const slash = key.indexOf('/'), provider = key.slice(0, slash), id = key.slice(slash + 1)
    const model = STATIC_MODEL_REGISTRY[provider].models.find(model => model.id === id)
    const rows = modelSourceRows(modelCardSpecifications(provider, model))
    assert.deepEqual(rows.find(row => row.url === fixture.noticeUrl), {url: fixture.noticeUrl, label: fixture.noticeLabel})
    render(React.createElement(ModelSpecifications, {provider, model}))
    fireEvent.click(screen.getByRole('button', {name: /^输入模态/}))
    const link = within(screen.getByRole('dialog')).getByRole('link', {name: fixture.noticeLabel})
    assert.equal(link.getAttribute('href'), fixture.noticeUrl)
    cleanup()
  }
  assert.equal(titleSourceRows([{url:fixture.noticeUrl,label:'渠道公告'}])[0].label, '渠道公告 · 百炼 · 模型下线公告')
})

test('R24 Web scans all 1064 cards for retirement labels and the exact seven historical hints', t => {
  let cards = 0, notices = 0
  const historical = new Set()
  for (const [provider, entry] of Object.entries(STATIC_MODEL_REGISTRY)) for (const model of entry.models) {
    const card = modelCardSpecifications(provider, model)
    for (const row of modelSourceRows(card)) {
      const url = new URL(row.url)
      if (/deprecat|depreciat|retire|sunset|下线/i.test(decodeURIComponent(url.pathname)) || /aliyun\.com$/.test(url.hostname) && /^\/notice\/\d+/.test(url.pathname) || url.hostname === 'docs.x.ai' && url.pathname.startsWith('/developers/migration/') || card.lifecycleSources.includes(row.url)) {
        assert.match(row.label, /^下线公告 · /, provider + '/' + model.id + ': ' + row.url); notices++
      }
    }
    for (const field of ['input', 'output']) for (const icon of modalityIconStates(card[field], card[field + 'Fact'], provider, model.id)) {
      if (icon.tooltip.includes('渠道页无此型号')) { assert.equal(provider, 'tokendance'); historical.add(model.id) }
    }
    cards++
  }
  assert.equal(cards, 1064); assert.ok(notices > 3)
  assert.deepEqual([...historical].sort(), fixture.historicalIds)
  assert.deepEqual([...historicalChannelIds(pages)].sort(), fixture.historicalIds)
  const missing = historicalChannelIds({...pages, ...fixture.syntheticPages})
  for (const id of Object.keys(fixture.syntheticPages)) for (const icon of modalityIconStates('未知', {state:'unknown'}, 'tokendance', id, missing)) {
    assert.equal(icon.tooltip, id === 'extra-retired-model' ? '渠道页无此型号' : '渠道未标注此模态')
    assert.equal(icon.state, 'unknown')
  }
  t.diagnostic(JSON.stringify({cards,notices,historical:historical.size}))
})
