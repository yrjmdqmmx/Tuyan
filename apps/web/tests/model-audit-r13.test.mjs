import { sourceTitle } from '../../../packages/api/src/card-presentation.mjs'
import test, { afterEach } from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import React from 'react'
import { render, cleanup } from '@testing-library/react'
import { ModelSpecifications } from '../src/components/ModelSpecifications.jsx'
import { modelCardSpecifications } from '../src/lib/modelCardSpecifications.js'
import { modelCardSources, modelSourceName, isDeadSource } from '../src/lib/modelCardSources.js'
import { MODEL_AUDIT_DATA, removedModel } from '../src/lib/modelAudit.js'
import { STATIC_MODEL_REGISTRY } from '../src/lib/staticModelCatalog.js'
import { unpackRegistry, rowsOf, loadCard, archivedAuditText } from '../../../scripts/lib/model-card-audit.mjs'
import full from './fixtures/r11-registry-head.json' with { type: 'json' }
import deadLinks from '../../../config/channel-audit/dead-links-20261109.json' with { type: 'json' }
import noticeCards from './fixtures/r13b-notice-cards.json' with { type: 'json' }

const base = 'https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/'
const expected = [
  ['replicate', 'google/imagen-3', base + '3-0-generate#3.0-generate-002', '原厂规格'],
  ['replicate', 'google/imagen-3-fast', base + '3-0-generate#3.0-fast-generate-001', '原厂规格'],
  ['replicate', 'google/imagen-4', base + '4-0-generate#4.0-generate-001', '原厂规格'],
  ['replicate', 'google/imagen-4-fast', base + '4-0-generate#4.0-fast-generate-001', '原厂规格'],
  ['replicate', 'google/imagen-4-ultra', base + '4-0-generate#4.0-ultra-generate-001', '原厂规格'],
  ['runware', 'openai:1@1', 'https://developers.openai.com/api/docs/models/gpt-image-1', '原厂规格'],
  ['runware', 'xai:grok-imagine@image-quality', 'https://docs.x.ai/developers/migration/imagine-image-quality-nov-2', '下线公告'],
]
const all = [...rowsOf(unpackRegistry(full)), ...rowsOf(STATIC_MODEL_REGISTRY)]
afterEach(cleanup)

test('R13 historical 50 notice-first cards and all 25 per-model priorities remain reproducible', async () => {
  const root=path.resolve(fileURLToPath(new URL('../../../',import.meta.url)))
  const archived=await loadCard(root,'d1fe6ff6')
  const source=archivedAuditText(root,'d1fe6ff6','apps/web/src/lib/staticModelCatalog.js').replace(/export const /g,'const ')
  const oldStatic=vm.runInNewContext(source+';STATIC_MODEL_REGISTRY')
  const historical=[...rowsOf(unpackRegistry(full)),...rowsOf(oldStatic)]
  for(const {channel,modelId,url,fullFirstUrl} of noticeCards) {
    const matches=historical.filter(row=>row.channel===channel&&row.model.id===modelId)
    assert.equal(matches.length,2)
    matches.forEach((row,i)=>assert.equal(archived(channel,row.model).sources[0],i===0?fullFirstUrl:url))
  }
  const visible=historical.filter(({channel,model})=>{const card=archived(channel,model);return card.sources[0]&&modelSourceName(card,card.sources[0])==='下线公告'})
  assert.equal(visible.length,50)
})

test('R13 exactly seven cards render verified vendor links in full/static and normal/compact layouts without delisting', t => {
  t.mock.method(Date, 'now', () => Date.parse('2026-11-09'))
  assert.deepEqual([...new Set(deadLinks.flatMap(row => row.cards))].sort(), expected.map(([channel, id]) => channel + '/' + id).sort())
  for (const [channel, id, url, label] of expected) {
    const key = channel + '/' + id
    const link = MODEL_AUDIT_DATA.details[key].sourceLinks[0]
    assert.deepEqual(link, { url, scope: 'vendor', kind: label === '下线公告' ? 'retirement-notice' : 'model-page', checkedAt: '2026-11-09' })
    assert.equal(MODEL_AUDIT_DATA.sourceChecks[url].status, 200)
    assert.equal(MODEL_AUDIT_DATA.sourceChecks[url].checkedAt, '2026-11-09')
    assert.equal(removedModel(channel, id), null)
    assert.equal(MODEL_AUDIT_DATA.notices[key], undefined)
    const matches = all.filter(row => row.channel === channel && row.model.id === id)
    assert.equal(matches.length, 2)
    for (const { model } of matches) {
      const card = modelCardSpecifications(channel, model)
      assert.equal(card.sources[0], url)
      assert.equal(modelSourceName(card, url), label)
      assert.equal(card.lifecycle, null)
      for (const compactSources of [false, true]) {
        const view = render(React.createElement(ModelSpecifications, { provider: channel, model, compactSources }))
        const visible = view.getByRole('link')
        assert.equal(visible.getAttribute('href'), url)
        assert.equal(visible.textContent, label + ' · ' + sourceTitle(url))
        for (const dead of deadLinks) assert.ok(!visible.getAttribute('title').includes(dead.url))
        view.unmount()
      }
    }
  }
})

test('R13 catalog-wide visible and secondary sources never contain any known dead URL', () => {
  assert.equal(all.length, 2125)
  assert.equal(deadLinks.length, 14)
  assert.equal(new Set(deadLinks.map(row => row.url)).size, 14)
  for (const row of deadLinks) {
    assert.equal(row.status, 404); assert.equal(row.checkedAt, '2026-11-09')
    assert.equal(isDeadSource(row.url), true)
    assert.equal(isDeadSource(row.url + '?tracking=1#section'), true)
  }
  for (const { channel, model } of all) {
    const card = modelCardSpecifications(channel, model)
    assert.ok(card.sources.length, channel + '/' + model.id)
    for (const url of card.sources) assert.equal(isDeadSource(url), false, channel + '/' + model.id + ': ' + url)
  }
})

test('R13 denylist filters every candidate path, endpoint-derived links and lifecycle links; no alternative means no link', () => {
  for (const { url } of deadLinks) {
    const args = { channel: 'unrelated', model: { id: 'fixture', officialSourceUrl: url, specifications: { sourceUrls: [url] } },
      audit: { sourceUrl: url, sourceUrls: [url], sourceLinks: [{ url, scope: 'vendor', kind: 'retirement-notice' }] },
      fields: { input: { provenance: 'channel', sourceUrl: url } }, lifecycle: { state: 'retired', sourceUrl: url } }
    assert.deepEqual(modelCardSources(args).sources, [], url)
    const good = 'https://vendor.test/models/fixture'
    args.audit.sourceLinks.push({ url: good, scope: 'vendor', kind: 'model-page' })
    assert.deepEqual(modelCardSources(args).sources, [good], url)
  }
})

test('R13B every specified notice has 下线公告 in full/static cards and preserves first-link priority', () => {
  assert.equal(noticeCards.length, 25)
  assert.equal(noticeCards.filter(row => row.channel === 'openai').length, 15)
  for (const { channel, modelId, url, fullFirstUrl } of noticeCards) {
    const matches = all.filter(row => row.channel === channel && row.model.id === modelId)
    assert.equal(matches.length, 2)
    for (const { model } of matches) {
      const card = modelCardSpecifications(channel, model)
      assert.equal(card.sources[0], fullFirstUrl, 'static cards now resolve the same complete specifications as Core')
      assert.ok(card.sources.includes(url), channel + '/' + modelId)
      assert.equal(modelSourceName(card, url), '下线公告')
      for (const compactSources of [false, true]) {
        const view = render(React.createElement(ModelSpecifications, { provider: channel, model, compactSources }))
        const visible = view.getByRole('link')
        assert.equal(visible.getAttribute('href'), card.sources[0])
        assert.ok(visible.getAttribute('title').includes('下线公告 · ' + sourceTitle(url)))
        if (card.sources[0] === url) assert.equal(visible.textContent, '下线公告 · ' + sourceTitle(url))
        view.unmount()
      }
    }
  }
})

test('R13B catalog-wide notice links are labelled 下线公告 regardless of channel availability', () => {
  let visible = 0
  for (const { channel, model } of all) {
    const card = modelCardSpecifications(channel, model)
    for (const url of card.sources) {
      const { hostname, pathname } = new URL(url)
      const notice = /deprecat|depreciat|retire|sunset|下线/i.test(pathname)
        || /(^|\.)aliyun\.com$/.test(hostname) && /^\/notice\/\d+\/?$/.test(pathname)
        || hostname === 'docs.x.ai' && pathname.startsWith('/developers/migration/')
      if (!notice) continue
      assert.equal(modelSourceName(card, url), '下线公告', channel + '/' + model.id + ': ' + url)
      if (url === card.sources[0]) {
        visible++
        const view = render(React.createElement(ModelSpecifications, { provider: channel, model }))
        assert.equal(view.getByRole('link').textContent, '下线公告 · ' + sourceTitle(url))
        view.unmount()
      }
    }
  }
  assert.equal(visible, 32, '16 full-registry and 16 fully resolved static notice cards')
  const ordinary = modelCardSources({ channel: 'unknown', audit: {}, fields: {}, model: { officialSourceUrl: 'https://example.test/notice/118177' } })
  assert.equal(modelSourceName(ordinary, ordinary.sources[0]), '官方文档')
})

test('R22B DeepSeek V3-0324 restores the vendor release page without inheriting its modalities', () => {
  const channel = 'tokendance', id = 'deepseek-chat-v3-0324', url = 'https://api-docs.deepseek.com/news/news250325'
  const channelUrl = url
  const link = MODEL_AUDIT_DATA.details[channel + '/' + id].sourceLinks[0]
  assert.equal(link.url, url); assert.equal(link.scope, 'vendor'); assert.equal(link.checkedAt, '2026-11-09')
  assert.deepEqual(MODEL_AUDIT_DATA.sourceChecks[url], { status: 200, contentType: 'text/html', checkedAt: '2026-11-09', finalUrl: url + '/', title: 'V3-0324 Release | DeepSeek API Docs' })
  const matches = all.filter(row => row.channel === channel && row.model.id === id)
  assert.equal(matches.length, 2)
  for (const { model } of matches) {
    const card = modelCardSpecifications(channel, model)
    assert.deepEqual(card.sources, [channelUrl])
    assert.equal(card.inputFact.state, 'unknown'); assert.equal(card.outputFact.state, 'unknown')
    for (const compactSources of [false, true]) {
      const view = render(React.createElement(ModelSpecifications, { provider: channel, model, compactSources }))
      assert.equal(view.getByRole('link').getAttribute('href'), channelUrl)
      assert.equal(view.getByRole('link').textContent, '原厂规格 · DeepSeek · V3-0324 Release')
      view.unmount()
    }
  }
})
