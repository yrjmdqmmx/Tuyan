import test from 'node:test'
import assert from 'node:assert/strict'
import { phase2Registry } from '../../../test-support/phase2-modality.mjs'
import { assertReviewedLinks } from '../../../test-support/card-review-r22.mjs'
test('R22B Core projections preserve verified navigation and vendor provenance for all TokenDance cards', async t => {
  t.mock.method(Date, 'now', () => Date.parse('2026-11-09T12:00:00Z'))
  const registry = await phase2Registry(), models: any[] = registry.providers.tokendance.models
  assertReviewedLinks(id => models.find(model => model.id === id).cardSpecifications)
  const qwen = models.find(model => model.id === 'qwen3.6-plus').cardSpecifications
  assert.equal(qwen.fields.maxOutputTokens.provenance, 'vendor')
  assert.equal(qwen.fields.maxOutputTokens.value, 65536)
  assert.equal(models.find(model => model.id === 'kimi-k3.1-pro').roles.includes('vision'), false)
})
