import test from 'node:test'
import assert from 'node:assert/strict'
import { auditedModelSpecs } from '../../../packages/api/src/model-audit.js'
import details from '../../../packages/api/src/provider-model-details.js'
import { exactModelDetails, normalizeCatalogModel, mergeCatalogRows } from '../../../packages/api/src/provider-catalog.js'
import { createRefineRuntime } from '../../../test-support/refine-runtime.mjs'
import { assertTokenDanceFacts, tokenDanceSnapshot } from '../../../test-support/tokendance-modality-assertions.mjs'
import { sourceIdentity } from '../../../packages/api/src/card-presentation.mjs'

test('R21 Core exact channel specifications leave the base/vendor archive intact', () => {
  const base = structuredClone(details.models['tokendance/qwen3.6-plus'])
  assert.ok(base.specifications.officialInputModalities.includes('image'))
  assert.ok(base.specifications.officialInputModalities.includes('video'))
  assertTokenDanceFacts((id: string) => ({ fields: exactModelDetails('tokendance', id).specifications.modalityFacts }))
  assert.deepEqual(details.models['tokendance/qwen3.6-plus'], base)
  const qwen = normalizeCatalogModel('tokendance', { id: 'qwen3.6-plus', inputModalities: ['text', 'image', 'video'] }, tokenDanceSnapshot.sourceUrl)!
  const merged = mergeCatalogRows([{ id: qwen.id, specifications: base.specifications }, qwen])[0]
  assert.deepEqual(qwen.inputModalities, ['text', 'image', 'video'])
  assert.deepEqual(merged.specifications.officialInputModalities, ['text'])
  const hidden = exactModelDetails('tokendance', 'deepseek-v4-flash-vision-exp').specifications
  assert.equal(hidden.officialInputModalities, undefined)
})
test('R21 real Core modelRegistry objects preserve channel facts through all enrichments', async t => {
  t.mock.method(Date, 'now', () => Date.parse('2026-11-09T16:00:00Z'))
  const runtime: any = await createRefineRuntime({ startServer: false })
  try {
    runtime.legacy.configureRuntimeFetch(async (url: any) => {
      assert.equal(String(url), tokenDanceSnapshot.sourceUrl)
      return Response.json({ data: tokenDanceSnapshot.data })
    })
    const result = await runtime.legacy.modelRegistry({ provider: 'tokendance' })
    const models = result.providers.tokendance.models
    assert.equal(models.length, 74)
    const find = (id: string) => models.find((model: any) => model.id === id)
    assertTokenDanceFacts((id: string) => find(id).auditSpecifications)
    assertTokenDanceFacts((id: string) => ({ fields: find(id).specificModelSpecifications.modalityFacts }))
    assertTokenDanceFacts((id: string) => ({ fields: find(id).specifications.modalityFacts }))
    for (const model of models) {
      const facts = auditedModelSpecs('tokendance', model.id).fields
      assert.deepEqual(model.specifications.modalityFacts.inputModalities, facts.inputModalities)
      assert.deepEqual(model.specifications.modalityFacts.outputModalities, facts.outputModalities)
    }
    assert.equal(runtime.providerCalls.length, 0)
  } finally { await runtime.close() }
})
test('R21 Core source consumers reject machine evidence and keep channel pages before labelled vendor field sources', async () => {
  const { isApiSource, modelCardSources, modelSourceRows } = await import(new URL('../../web/src/lib/modelCardSources.js', import.meta.url).href)
  const api = 'https://tokendance.space/portal/api/models/qwen3.6-plus'
  assert.equal(isApiSource(api), true)
  for (const id of ['qwen3.6-plus', 'deepseek-v4.1-flash']) {
    const audit = auditedModelSpecs('tokendance', id)
    // Vendor provenance is what makes a card field display 源自原厂.
    const vendorUrls = Object.values(audit.fields).filter(fact => fact.provenance === 'vendor')
      .flatMap(fact => fact.sourceUrls || [fact.sourceUrl]).filter((url): url is string => typeof url === 'string')
    const channelUrl = 'https://tokendance.space/models/' + id
    const expected = [channelUrl, ...vendorUrls].filter((url, index, urls) =>
      urls.findIndex(other => sourceIdentity(other) === sourceIdentity(url)) === index)
    const data = modelCardSources({ channel: 'tokendance', model: { id }, audit: { ...audit, sourceUrl: api }, fields: audit.fields })
    assert.deepEqual(data.sources, expected, id)
    assert.equal(data.sources[0], channelUrl, id)
    assert.equal(new Set(data.sources.map(sourceIdentity)).size, data.sources.length, id)
    for (const url of data.sources) {
      assert.doesNotMatch(decodeURIComponent(new URL(url).pathname), /\/portal\/api(?:\/|$)|\/openapi|\/swagger|\.(?:json|ya?ml)\/?$/i, id)
      assert.equal(isApiSource(url), false, id + ': ' + url)
    }
    for (const row of modelSourceRows(data).slice(1)) {
      assert.ok(vendorUrls.some(url => sourceIdentity(url) === sourceIdentity(row.url)), id + ': ' + row.url)
      assert.match(row.label, /^(官方文档|渠道资料) · /, id)
    }
    assert.equal(audit.fields.maxOutputTokens.provenance, 'vendor', id)
    assert.equal(audit.fields.maxOutputTokens.sourceUrl, id === 'deepseek-v4.1-flash'
      ? 'https://api-docs.deepseek.com/quick_start/pricing/' : 'https://help.aliyun.com/zh/model-studio/models', id)
    assert.equal(data.sources[1], audit.fields.maxOutputTokens.sourceUrl, id)
  }
})
