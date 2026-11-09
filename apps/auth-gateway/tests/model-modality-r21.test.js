import test from 'node:test'
import assert from 'node:assert/strict'
import { auditedModelSpecs, withModelAudit } from '../src/model-audit.js'
import { assertTokenDanceFacts, tokenDanceBefore } from '../../../test-support/tokendance-modality-assertions.mjs'
import { mergeCardFacts } from '../../web/src/lib/catalogCardFacts.js'
import { isApiSource, modelCardSources } from '../../web/src/lib/modelCardSources.js'
test('R21 Gateway generated facts preserve channel values, exclusions, provenance and unknowns', () => {
  assertTokenDanceFacts(id => withModelAudit('tokendance', { id }).auditSpecifications)
})
test('R21 Gateway facts cannot re-add stale base modalities in card consumers', () => {
  const prior = { value: ['text', 'image', 'video'], state: 'known', sourceUrls: [] }
  assertTokenDanceFacts(id => mergeCardFacts(auditedModelSpecs('tokendance', id), { inputModalities: prior, outputModalities: prior }, { roles: ['vision'] }))
})
test('R21 Gateway source pointers render model pages only; portal evidence never leaks into links', () => {
  const api = 'https://tokendance.space/portal/api/models/qwen3.6-plus'
  assert.equal(isApiSource(api), true)
  for (const { id } of tokenDanceBefore.rows) {
    const audit = auditedModelSpecs('tokendance', id)
    assert.deepEqual(modelCardSources({ channel: 'tokendance', model: { id }, audit, fields: audit.fields }).sources, ['https://tokendance.space/models/' + id])
    assert.ok(audit.sourceLinks.every(link => !isApiSource(link.url)))
  }
})
