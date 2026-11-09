import { expectedTokenDanceSources } from '../../../test-support/card-review-r22.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { auditedModelSpecs, withModelAudit } from '../src/model-audit.js'
import { assertTokenDanceFacts, tokenDanceBefore } from '../../../test-support/tokendance-modality-assertions.mjs'
import { mergeCardFacts } from '../../web/src/lib/catalogCardFacts.js'
import { isApiSource, modelCardSources, modelSourceRows } from '../../web/src/lib/modelCardSources.js'
import { sourceIdentity } from '../../../packages/api/src/card-presentation.mjs'
test('R21 Gateway generated facts preserve channel values, exclusions, provenance and unknowns', () => {
  assertTokenDanceFacts(id => withModelAudit('tokendance', { id }).auditSpecifications)
})
test('R21 Gateway facts cannot re-add stale base modalities in card consumers', () => {
  const prior = { value: ['text', 'image', 'video'], state: 'known', sourceUrls: [] }
  assertTokenDanceFacts(id => mergeCardFacts(auditedModelSpecs('tokendance', id), { inputModalities: prior, outputModalities: prior }, { roles: ['vision'] }))
})
test('R21 Gateway sources keep reviewed channel pages and labelled vendor field sources; machine evidence never leaks', () => {
  const api = 'https://tokendance.space/portal/api/models/qwen3.6-plus'
  assert.equal(isApiSource(api), true)
  for (const { id } of tokenDanceBefore.rows) {
    const audit = auditedModelSpecs('tokendance', id)
    // Vendor provenance is what makes a card field display 源自原厂.
    const vendorUrls = Object.values(audit.fields).filter(fact => fact.provenance === 'vendor')
      .flatMap(fact => fact.sourceUrls || [fact.sourceUrl]).filter(Boolean)
    const reviewed = expectedTokenDanceSources(id)
    const expected = [...reviewed, ...vendorUrls].filter((url, index, urls) =>
      urls.findIndex(other => sourceIdentity(other) === sourceIdentity(url)) === index)
    const data = modelCardSources({ channel: 'tokendance', model: { id }, audit, fields: audit.fields })
    assert.deepEqual(data.sources, expected, id)
    assert.equal(data.sources[0], reviewed[0], id)
    assert.equal(new Set(data.sources.map(sourceIdentity)).size, data.sources.length, id)
    for (const url of data.sources) {
      assert.doesNotMatch(decodeURIComponent(new URL(url).pathname), /\/portal\/api(?:\/|$)|\/openapi|\/swagger|\.(?:json|ya?ml)\/?$/i, id)
      assert.equal(isApiSource(url), false, id + ': ' + url)
    }
    for (const row of modelSourceRows(data).slice(reviewed.length)) {
      assert.ok(vendorUrls.some(url => sourceIdentity(url) === sourceIdentity(row.url)), id + ': ' + row.url)
      assert.match(row.label, /^原厂规格 · /, id)
    }
    if (id === 'deepseek-v4.1-flash') {
      assert.equal(audit.fields.maxOutputTokens.provenance, 'vendor')
      assert.equal(audit.fields.maxOutputTokens.sourceUrl, 'https://api-docs.deepseek.com/quick_start/pricing/')
      assert.equal(data.sources[1], audit.fields.maxOutputTokens.sourceUrl)
    }
    assert.ok(audit.sourceLinks.every(link => !isApiSource(link.url)))
  }
})
