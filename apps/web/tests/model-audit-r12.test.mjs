import test, { afterEach, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import React from 'react'
import { render, cleanup } from '@testing-library/react'
import { ModelSpecifications } from '../src/components/ModelSpecifications.jsx'
import { modelCardSpecifications } from '../src/lib/modelCardSpecifications.js'
import { isApiSource, modelCardSources, modelSourceName, sourceSpecificity } from '../src/lib/modelCardSources.js'
import { MODEL_AUDIT_DATA } from '../src/lib/modelAudit.js'
import { STATIC_MODEL_REGISTRY } from '../src/lib/staticModelCatalog.js'
import { unpackRegistry, rowsOf } from '../../../scripts/lib/model-card-audit.mjs'
import full from './fixtures/r11-registry-head.json' with { type: 'json' }
import before from './fixtures/r12-links-before.json' with { type: 'json' }
import final from './fixtures/r12-final-changed-links.json' with { type: 'json' }
import linkChecks from './fixtures/r12-final-link-check-20261109.json' with { type: 'json' }
import rendered from './fixtures/r12-tokendance-rendered.json' with { type: 'json' }
import exceptions from './fixtures/r12-specificity-exceptions.json' with { type: 'json' }
const registry = unpackRegistry(full), rows = rowsOf(registry)
const model = (channel, id) => registry.providers[channel].models.find(m => m.id === id)
const models = new Map(rowsOf(STATIC_MODEL_REGISTRY).map(row => [row.channel + '/' + row.model.id, row.model]))
for (const row of rows) models.set(row.channel + '/' + row.model.id, row.model)
const linkIdentity = ({ channel, modelId, oldUrl, finalUrl }) => ({ channel, modelId, oldUrl, finalUrl })
const changedLinksFromR8 = () => before.rows.map(({ channel, modelId, oldUrl }) => ({ channel, modelId, oldUrl,
  finalUrl: modelCardSpecifications(channel, models.get(channel + '/' + modelId)).sources[0] || null })).filter(row => row.oldUrl !== row.finalUrl)
// R13 replaces all seven failures with operator-verified vendor sources.
const httpExceptions = []
const repairedLinks = linkChecks.filter(row => row.originalStatus === 404)
beforeEach(t => t.mock.method(Date, 'now', () => Date.parse('2026-11-09')))
afterEach(cleanup)
function assertLink(channel, entry, url, label) {
  const card = modelCardSpecifications(channel, entry)
  assert.equal(card.sources[0], url)
  assert.equal(modelSourceName(card, url), label)
  for (const compactSources of [false, true]) {
    const view = render(React.createElement(ModelSpecifications, { provider: channel, model: entry, compactSources }))
    const link = view.getByRole('link')
    assert.equal(link.getAttribute('href'), url)
    assert.equal(link.textContent, label + ' · ' + new URL(url).hostname)
    view.unmount()
  }
}
test('R12 full registry scheduled and retired Qwen3.5 Plus cards put 下线公告 first', t => {
  for (const date of ['2026-11-09', '2027-01-20']) {
    t.mock.method(Date, 'now', () => Date.parse(date))
    for (const id of ['qwen3.5-plus', 'qwen3.5-plus-2026-02-15', 'qwen3.5-plus-2026-04-20'])
      assertLink('bailian', model('bailian', id), 'https://help.aliyun.com/zh/model-studio/model-depreciation', '下线公告')
  }
})
test('R12 full registry retains the three pre-R9 Bailian model pages over list pages', () => {
  for (const [id, page] of [['qwen3.8-max', 'qwen3-8-max'], ['qwen3.7-max-2026-06-08', 'qwen3-7-max'], ['qwen3.8-flash', 'vision-model']]) {
    const url = 'https://help.aliyun.com/zh/model-studio/' + page
    assert.equal(before.rows.find(row => row.channel === 'bailian' && row.modelId === id).oldUrl, url)
    assertLink('bailian', model('bailian', id), url, '官方文档')
  }
})
test('R12C all 74 Chrome captures choose 67 verified channel pages and 7 vendor fallbacks in both layouts', () => {
  assert.equal(rendered.rows.length, 74)
  assert.equal(rendered.rows.filter(row => row.rendersModel).length, 67)
  assert.match(rendered.method, /Model not found/)
  assert.deepEqual(rendered.rows.map(row => row.modelId).sort(), registry.providers.tokendance.models.map(entry => entry.id).sort())
  const rejected = []
  for (const row of rendered.rows) {
    assert.equal(row.status, 200)
    assert.equal(row.url, 'https://tokendance.space/models/' + row.modelId)
    const entry = model('tokendance', row.modelId)
    const link = MODEL_AUDIT_DATA.details['tokendance/' + row.modelId].sourceLinks[0]
    if (row.rendersModel) {
      assert.deepEqual([link.url, link.scope, link.kind, link.checkedAt], [row.url, 'channel', 'model-page', '2026-11-09'])
      assertLink('tokendance', entry, row.url, '官方文档')
    } else {
      rejected.push(row.modelId)
      assert.equal(MODEL_AUDIT_DATA.sourceChecks[row.url].rendersModel, false)
      assert.equal(link.scope, 'vendor')
      assert.equal(link.kind, 'vendor-doc')
      assert.doesNotMatch(link.url, /^https:\/\/tokendance\.space\//)
      assertLink('tokendance', entry, link.url, '原厂规格')
      for (const projection of [entry, STATIC_MODEL_REGISTRY.tokendance.models.find(m => m.id === entry.id)])
        assert.ok(!modelCardSpecifications('tokendance', projection).sources.includes(row.url))
    }
  }
  assert.deepEqual(rejected.sort(), ['deepseek-chat-v3-0324', 'deepseek-v3.2', 'deepseek-v4-flash', 'deepseek-v4-flash-vision-exp', 'qwen3-30b-a3b-instruct-2507', 'qwen3-max', 'qwen3.6-max-preview'].sort())
})
test('R12 filters every specified endpoint pattern, JSON evidence and redirected API destinations', () => {
  for (const path of ['/v1/models', '/v12/models/a', '/v3/models-list', '/gateway/v1/list', '/api/v1/list', '/a/api/v2/detail', '/openapi.json', '/models/a/schema.json', '/a%2Fapi%2Fv1%2Fb'])
    assert.equal(isApiSource('https://example.test' + path), true, path)
  for (const url of ['https://api.example.test/models', 'https://replicate.com/owner/model/api/schema?x=1']) assert.equal(isApiSource(url), true)
  for (const contentType of ['application/json', 'application/json; charset=utf-8', 'application/problem+json'])
    assert.equal(isApiSource('https://example.test/catalog', { 'https://example.test/catalog': { contentType } }), true)
  assert.equal(isApiSource('https://example.test/catalog', { 'https://example.test/catalog': { finalUrl: 'https://example.test/v2/models' } }), true)
  for (const url of ['https://api-docs.deepseek.com/quick_start/pricing', 'https://example.test/api-reference/exact', 'https://example.test/models/exact', 'https://developers.openai.com/api/docs/models/gpt-6.md', 'https://developers.openai.com/api/docs/models/gpt-6', 'https://fal.ai/models/owner/model/api', 'https://example.test/api', 'https://example.test/a/api/detail', 'https://example.test/a%2Fapi%2Fb']) assert.equal(isApiSource(url), false)
  for (const { channel, model: entry } of [...rows, ...rowsOf(STATIC_MODEL_REGISTRY)]) {
    const card = modelCardSpecifications(channel, entry)
    assert.ok(card.sources.length, channel + '/' + entry.id)
    for (const url of card.sources) assert.equal(isApiSource(url, MODEL_AUDIT_DATA.sourceChecks), false, channel + '/' + entry.id + ': ' + url)
  }
})
test('R12 ranking is general: tagged lifecycle wins; dedicated channel pages beat explicit generic links', () => {
  const dedicated = 'https://docs.example.test/models/exact', notice = 'https://docs.example.test/news/2027-01'
  for (const page of ['models', 'model-list', 'models-overview', 'models/overview']) {
    const general = 'https://docs.example.test/' + page
    const args = { channel: 'unknown', model: { officialSourceUrl: dedicated }, fields: {}, audit: { sourceLinks: [
      { url: general, scope: 'channel', kind: 'documentation' }, { url: dedicated, scope: 'channel', kind: 'model-page' },
      { url: notice, scope: 'channel', kind: 'retirement-notice' },
    ] } }
    assert.equal(modelCardSources({ ...args, audit: { sourceLinks: args.audit.sourceLinks.slice(0, 2) } }).sources[0], dedicated)
    assert.equal(modelCardSources(args).sources[0], notice)
    for (const state of ['scheduled', 'retired']) {
      const data = modelCardSources({ ...args, lifecycle: { state } })
      assert.equal(data.sources[0], notice); assert.equal(modelSourceName(data, notice), '下线公告')
    }
  }
})
test('R12C generic classification cannot promote welcome, index or method-reference pages as model pages', () => {
  for (const path of ['/', '/docs/zh/welcome', '/collections/official', '/models', '/guides/models/list', '/overview', '/api-reference', '/api/chat/openai-api', '/api-reference/chat-completions/chat-completions', '/guide/3.1.1%20Chat.html'])
    assert.ok(sourceSpecificity('https://example.test' + path) < 2, path)
  for (const path of ['/api/docs/models/gpt-6.md', '/owner/exact-model', '/models/owner/model/api', '/api-reference/models/generate-an-image-with-flux', '/api-reference#tag/Generate/paths/exact-model'])
    assert.equal(sourceSpecificity('https://example.test' + path), 2, path)
  const first = 'https://example.test/guides/models/list'
  for (const fallback of ['https://example.test/welcome', 'https://example.test/api-reference', 'https://example.test/api-reference/chat-completions/chat-completions'])
    assert.equal(modelCardSources({ channel: 'unknown', audit: {}, fields: { input: { provenance: 'channel', sourceUrl: first } }, model: { officialSourceUrl: fallback } }).sources[0], first)
})
test('R12C keeps OpenAI/Together docs and replaces Replicate/fal endpoints with the same model page', () => {
  let openai = 0, together = 0, replicate = 0, replicateOpenAI = 0, fal = 0
  for (const row of before.rows) {
    const entry = registry.providers[row.channel]?.models.find(m => m.id === row.modelId)
      || STATIC_MODEL_REGISTRY[row.channel].models.find(m => m.id === row.modelId)
    const url = modelCardSpecifications(row.channel, entry).sources[0]
    if (['openai', 'together'].includes(row.channel) && row.r11Url.startsWith('https://developers.openai.com/api/docs/models/')) {
      assert.equal(url, row.r11Url, row.channel + '/' + row.modelId)
      row.channel === 'openai' ? openai++ : together++
    }
    if (/^https:\/\/replicate\.com\/[^/]+\/[^/]+\/api\/schema/.test(row.r11Url)) {
      assert.equal(url, repairedLinks.find(item => item.channel === row.channel && item.modelId === row.modelId)?.finalUrl || row.r11Url.replace(/\/api\/schema(?:\?.*)?$/, '')); replicate++
    }
    if (row.channel === 'replicate' && row.r11Url.startsWith('https://developers.openai.com/api/docs/models/')) {
      assert.equal(url, row.r11Url); replicateOpenAI++
    }
    if (row.channel === 'fal' && isApiSource(row.r11Url)) {
      assert.ok([`https://fal.ai/models/${entry.id}`, `https://fal.ai/models/${entry.id}/api`].includes(url), entry.id + ': ' + url); fal++
    }
  }
  assert.equal(openai, 71); assert.equal(together, 3); assert.equal(replicate, 90); assert.equal(replicateOpenAI, 4); assert.equal(fal, 37)
  assert.equal(modelCardSpecifications('siliconflow', model('siliconflow', 'deepseek-ai/DeepSeek-V4.1-Flash')).sources[0], 'https://www.siliconflow.cn/models')
})
test('R12C every full/static card preserves R11 specificity with exact, reasoned API-only exceptions', () => {
  const actualExceptions = []
  assert.equal(before.staticRows.length, 1064)
  for (const [scope, originals] of [['full', before.rows], ['static', before.staticRows]]) for (const row of originals) {
    const entry = (scope === 'full' && registry.providers[row.channel]?.models.find(m => m.id === row.modelId))
      || STATIC_MODEL_REGISTRY[row.channel].models.find(m => m.id === row.modelId)
    const card = modelCardSpecifications(row.channel, entry), finalUrl = card.sources[0], key = scope + '/' + row.channel + '/' + row.modelId
    assert.ok(finalUrl && !isApiSource(finalUrl, MODEL_AUDIT_DATA.sourceChecks), key)
    const apiFallback = isApiSource(row.r11Url, MODEL_AUDIT_DATA.sourceChecks) && sourceSpecificity(finalUrl) < 2
    if (apiFallback) {
      const exception = exceptions.rows.find(item => item.scope === scope && item.channel === row.channel && item.modelId === row.modelId)
      assert.ok(exception, 'unreviewed generic fallback: ' + key)
      assert.equal(exception.r11Url, row.r11Url); assert.equal(exception.finalUrl, finalUrl)
      assert.ok(exception.reason.length > 30 && exception.evidence)
      assert.deepEqual(exception.availableHumanSources, card.sources)
      assert.ok(card.sources.every(url => sourceSpecificity(url) < 2), 'specific human page exists: ' + key)
      actualExceptions.push(exception)
    } else assert.ok(sourceSpecificity(finalUrl) >= sourceSpecificity(row.r11Url), key + ': ' + row.r11Url + ' -> ' + finalUrl)
  }
  assert.deepEqual(actualExceptions, exceptions.rows, 'no stale or broadened exception entries')
  assert.equal(new Set(exceptions.rows.map(row => row.channel + '/' + row.modelId)).size, 8)
})
test('R12C an endpoint replacement prefers same-host model documentation, then vendor model documentation, then generic', () => {
  const endpoint = 'https://docs.example.test/api/v1/models', generic = 'https://docs.example.test/models'
  const vendor = 'https://vendor.test/models/exact', sameHost = 'https://docs.example.test/models/exact'
  const fields = { input: { provenance: 'channel', sourceUrl: endpoint } }
  for (const [sources, expected] of [[[generic, vendor, sameHost], sameHost], [[generic, vendor], vendor], [[generic], generic]]) {
    const card = modelCardSources({ channel: 'unknown', fields, audit: { sourceUrls: sources } })
    assert.equal(card.sources[0], expected)
    assert.ok(!card.sources.includes(endpoint))
  }
})
test('R12 final changed fixture exactly covers R8 differences using full objects and static-only identities', () => {
  assert.equal(models.size, 1064); assert.equal(before.rows.length, 1064)
  assert.deepEqual(final, changedLinksFromR8())
  assert.ok(final.every(row => !Object.hasOwn(row, 'status')), 'HTTP evidence lives in the separate R12D fixture')
})

test('R12D final HTTP fixture exactly covers all 397 full-object R8 first-link changes', () => {
  assert.equal(linkChecks.length, 397)
  assert.equal(new Set(linkChecks.map(row => row.channel + '/' + row.modelId)).size, 397)
  assert.deepEqual(linkChecks.map(linkIdentity), changedLinksFromR8())
  assert.deepEqual(linkChecks.map(linkIdentity), final)
  const distinct = new Map()
  for (const row of linkChecks) {
    const key = row.channel + '/' + row.modelId
    const fields = ['channel', 'modelId', 'oldUrl', 'finalUrl', 'status', 'contentType', 'checkedAt']
    if (row.originalStatus === 404) fields.push('originalStatus', 'previousUrl', 'previousStatus')
    assert.deepEqual(Object.keys(row).sort(), fields.sort(), key)
    assert.ok(Number.isInteger(row.status) && row.status >= 200 && row.status <= 599, key)
    assert.ok(Number.isFinite(Date.parse(row.checkedAt)), key)
    const refreshed = row.originalStatus === 404 || key === 'tokendance/deepseek-chat-v3-0324'
    assert.equal(row.checkedAt, refreshed ? '2026-11-09' : '2026-11-09T10:38:46.634Z', key)
    assert.doesNotMatch(row.contentType, /json/i, key)
    assert.match(row.contentType, /^text\/html(?:;|$)/i, key)
    assert.equal(isApiSource(row.finalUrl, { [row.finalUrl]: row }), false, key)
    const evidence = { status: row.status, contentType: row.contentType, checkedAt: row.checkedAt }
    if (distinct.has(row.finalUrl)) assert.deepEqual(evidence, distinct.get(row.finalUrl), row.finalUrl)
    else distinct.set(row.finalUrl, evidence)
  }
  assert.equal(distinct.size, 374)
  const counts = entries => entries.reduce((result, row) => ({ ...result, [row.status]: (result[row.status] || 0) + 1 }), {})
  assert.deepEqual(counts(linkChecks), { 200: 397 })
  assert.deepEqual(counts([...distinct.values()]), { 200: 374 })
})

test('R13 has no remaining 404/410 exceptions and preserves seven original 404/API records', () => {
  const actual = []
  for (const row of linkChecks.filter(row => [404, 410].includes(row.status))) {
    const key = row.channel + '/' + row.modelId
    const exception = httpExceptions.find(item => item.channel === row.channel && item.modelId === row.modelId)
    assert.ok(exception, 'unreviewed HTTP failure: ' + key)
    assert.equal(exception.reason, 'original link also 404/API', key)
    assert.equal(row.originalStatus, 404, key)
    assert.equal(isApiSource(row.oldUrl), true, key)
    actual.push(exception)
  }
  assert.equal(actual.length, 0)
  assert.equal(repairedLinks.length, 7)
  for (const row of repairedLinks) {
    assert.equal(row.status, 200)
    assert.equal(row.previousStatus, 404)
    assert.equal(isApiSource(row.oldUrl), true)
    assert.notEqual(row.previousUrl, row.finalUrl)
  }
  assert.deepEqual(actual, httpExceptions, 'no missing, stale or broadened HTTP exceptions')
})

test('R12D every checked final link remains the visible link in normal and compact cards', () => {
  for (const row of linkChecks) {
    const entry = models.get(row.channel + '/' + row.modelId)
    const card = modelCardSpecifications(row.channel, entry)
    assertLink(row.channel, entry, row.finalUrl, modelSourceName(card, row.finalUrl))
  }
})

test('R12D audit tables exactly preserve all checked links and seven original-link failures', () => {
  const doc = fs.readFileSync(new URL('../../../docs/model-card-audit-20261109.md', import.meta.url), 'utf8')
  const section = doc.split('## R12D：最终链接 HTTP 检查（当前验收）')[1].split('\n## ')[0]
  const complete = section.split('### 全部 397 张卡的最终链接检查')[1].split('\n### ')[0]
  const tableRows = [...complete.matchAll(/^\| ([^|]+) \| `([^`]+)` \| (\S+) \| (\d+) \| (\S+) \|$/gm)]
    .map(([, channel, modelId, finalUrl, status, oldUrl]) => ({ channel, modelId, finalUrl, status: Number(status), oldUrl }))
  assert.deepEqual(tableRows, linkChecks.map(({ channel, modelId, finalUrl, status, oldUrl }) => ({ channel, modelId, finalUrl, status, oldUrl })))
  const failed = section.split('### 7 个死链修复与旧 404 证据')[1].split('\n### ')[0]
  const failures = [...failed.matchAll(/^\| ([^|]+) \| `([^`]+)` \| (\S+) \| (\d+) \| (\S+) \| (\d+) \| (\S+) \| (\d+) \|$/gm)]
    .map(([, channel, modelId, finalUrl, status, oldUrl, originalStatus, previousUrl, previousStatus]) => ({ channel, modelId, finalUrl, status: Number(status), oldUrl, originalStatus: Number(originalStatus), previousUrl, previousStatus: Number(previousStatus) }))
  assert.deepEqual(failures, repairedLinks
    .map(({ channel, modelId, finalUrl, status, oldUrl, originalStatus, previousUrl, previousStatus }) => ({ channel, modelId, finalUrl, status, oldUrl, originalStatus, previousUrl, previousStatus })))
})
