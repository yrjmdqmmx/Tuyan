import assert from 'node:assert/strict'
import test from 'node:test'
import { canonicalHash } from '@paperbanana/benchmark-core'
import { scientificEvidenceCost, scientificCostSummary, publicScientificCost } from '../src/scientific-v2-cost.js'
import { SCIENTIFIC_V2_BILLING_EVIDENCE } from '../src/scientific-v2-billing-evidence.js'
import { assertScientificV2ExpansionDescriptor, assertScientificV2ExpansionPreservedModels } from '../src/scientific-v2-expansion.js'

function fixture({ billed = false, failed = false, codex = false, unsupported = false } = {}) {
  const proof = SCIENTIFIC_V2_BILLING_EVIDENCE[0]
  const manifestHash = billed ? proof.manifestHash : 'a'.repeat(64)
  const modelId = codex ? 'codex:gpt-image-2' : proof.modelId
  const status = unsupported ? 'unsupported' : failed ? 'failed' : 'succeeded'
  const attempts = unsupported ? [] : [{ responseClass: failed ? 'confirmed_provider_failure' : 'succeeded', rawImageHash: proof.imageHash }]
  const slot = { canonicalModelId: modelId, caseId: proof.caseId, modelId, provider: codex ? 'codex' : 'replicate', operation: 'generation', imageSize: 'provider-default', status, attempts, costCny: codex || unsupported ? 0 : 1.75 }
  const row = { canonicalModelId: modelId, caseId: proof.caseId, status, imageHash: proof.imageHash, attemptSummary: { count: attempts.length, responseClasses: attempts.map(a => a.responseClass) } }
  const base = { manifestHash, slots: [slot] }
  const batch = { status: 'published', manifestHash, state: { ...base, stateHash: canonicalHash(base) }, manifest: { manifestHash, priceSnapshot: { entries: [{ provider: 'replicate', modelId, operation: 'generation', imageSize: 'provider-default', originalCurrency: 'USD', entryHash: 'b'.repeat(64), charges: [{ billable: 'output_image', unit: 'image', quantityDecimal: '1', rateDecimal: '0.25' }] }] } } }
  return { row, batch }
}

test('invoice annotation requires the exact manifest, model, case, image, and attempt count', () => {
  const { row, batch } = fixture({ billed: true })
  assert.equal(scientificEvidenceCost(row, batch).basis, 'invoice_reconciled')
  assert.equal(scientificEvidenceCost(row, batch).amount, '0.25')
  assert.equal(scientificEvidenceCost({ ...row, imageHash: 'c'.repeat(64) }, batch).basis, 'unavailable')
  assert.equal(scientificEvidenceCost({ ...row, attemptSummary: { count: 2, responseClasses: ['succeeded', 'succeeded'] } }, batch).basis, 'unavailable')
  assert.equal(scientificEvidenceCost(row, { ...batch, status: 'running' }).basis, 'unavailable')
})
test('flat rate is calculated, failed-attempt accounting is estimated, Codex is unknown, and no call is zero', () => {
  for (const [options, basis] of [[{}, 'official_rate_calculated'], [{ failed: true }, 'budget_estimate'], [{ codex: true }, 'unavailable'], [{ unsupported: true }, 'not_called']] as const) {
    const { row, batch } = fixture(options)
    assert.equal(scientificEvidenceCost(row, batch).basis, basis)
  }
  const { row, batch } = fixture()
  batch.state.slots[0].costCny = 999
  assert.equal(scientificEvidenceCost(row, batch).basis, 'unavailable')
})
test('invoice-confirmed no-output failure is zero, while a mismatched failure remains unverified', () => {
  const proof = SCIENTIFIC_V2_BILLING_EVIDENCE.find(item => item.modelId === 'google/nano-banana'
    && item.caseId === 'scientific-gen-05-math-bilingual')!
  assert.equal(proof.amount, '0')
  assert.equal(proof.imageHash, null)
  const attempts = [{ responseClass: 'confirmed_technical_failure', rawImageHash: null }]
  const slot = { canonicalModelId: proof.modelId, caseId: proof.caseId, modelId: proof.modelId,
    provider: 'replicate', operation: 'generation', imageSize: 'provider-default', status: 'failed', attempts, costCny: 0.26157754 }
  const base = { manifestHash: proof.manifestHash, slots: [slot] }
  const batch = { status: 'published', manifestHash: proof.manifestHash, manifest: { manifestHash: proof.manifestHash },
    state: { ...base, stateHash: canonicalHash(base) } }
  const row = { canonicalModelId: proof.modelId, caseId: proof.caseId, status: 'failed',
    attemptSummary: { count: 1, responseClasses: ['confirmed_technical_failure'] } }
  for (const evidence of [row, { ...row, imageHash: null }]) {
    const cost = scientificEvidenceCost(evidence, batch)
    assert.equal(cost.basis, 'invoice_reconciled')
    assert.equal(cost.amount, '0')
    assert.equal(cost.currency, 'USD')
  }
  assert.equal(scientificEvidenceCost({ ...row, status: 'succeeded' }, batch).basis, 'unavailable')
  assert.equal(scientificEvidenceCost({ ...row, attemptSummary: { count: 2, responseClasses: ['confirmed_technical_failure', 'succeeded'] } }, batch).basis, 'unavailable')
  assert.notEqual(scientificEvidenceCost({ ...row, imageHash: 'c'.repeat(64) }, batch).basis, 'invoice_reconciled')
  const withOutput = { ...base, slots: [{ ...slot, attempts: [{ ...attempts[0], rawImageHash: 'e'.repeat(64) }] }] }
  assert.equal(scientificEvidenceCost(row, { ...batch,
    state: { ...withOutput, stateHash: canonicalHash(withOutput) } }).basis, 'budget_estimate')
  const different = { ...base, manifestHash: 'd'.repeat(64) }
  assert.equal(scientificEvidenceCost(row, { ...batch, manifestHash: different.manifestHash,
    manifest: { manifestHash: different.manifestHash }, state: { ...different, stateHash: canonicalHash(different) } }).basis, 'budget_estimate')
})
test('summary adds decimal amounts exactly and never mixes currencies or treats unknown as free', () => {
  const costs = [
    { currency: 'USD', amount: '0.034', basis: 'official_rate_calculated', evidenceHash: 'a'.repeat(64) },
    { currency: 'USD', amount: '0.128', basis: 'official_rate_calculated', evidenceHash: 'a'.repeat(64) },
    { currency: 'CNY', amount: '1.75', basis: 'budget_estimate' },
    { currency: null, amount: null, basis: 'unavailable' },
  ]
  const summary = scientificCostSummary(costs.map(cost => ({ cost })))
  assert.equal(summary.knownCaseCount, 3)
  assert.equal(summary.caseCount, 4)
  assert.equal(summary.totals[0].amount, '0.162')
  assert.equal(summary.totals[1].amount, '1.75')
  assert.equal(publicScientificCost({ ...costs[0], secret: 'do-not-publish' }).evidenceHash, 'a'.repeat(64))
  assert.equal(JSON.stringify(publicScientificCost({ ...costs[0], secret: 'do-not-publish' })).includes('secret'), false)
  for (const amount of [NaN, 'NaN', '-1', '1e9', null]) assert.equal(publicScientificCost({ ...costs[0], amount }).basis, 'unavailable')
})
test('replacement is explicit and restricted to GPT Image 2, with exact preservation of every other row', () => {
  const descriptor = { schemaVersion: 1, kind: 'single_model_expansion', baseline: { releaseId: 'release', releaseHash: 'a'.repeat(64), batchId: 'batch', manifestHash: 'b'.repeat(64) }, targetModelId: 'openai/gpt-image-2', replacesModelId: 'codex:gpt-image-2' }
  assertScientificV2ExpansionDescriptor(descriptor)
  assert.throws(() => assertScientificV2ExpansionDescriptor({ ...descriptor, replacesModelId: 'other' }))
  assert.throws(() => assertScientificV2ExpansionDescriptor({ ...descriptor, targetModelId: 'other' }))
  const baseline = { models: [{ canonicalModelId: 'codex:gpt-image-2', overallRank: 1 }, { canonicalModelId: 'keep', overallRank: 2, scores: { text: 8 } }] }
  const models = [{ ...baseline.models[1], overallRank: 1 }, { canonicalModelId: 'openai/gpt-image-2', overallRank: 2 }]
  assertScientificV2ExpansionPreservedModels(baseline, models, descriptor.targetModelId, descriptor.replacesModelId)
  assert.throws(() => assertScientificV2ExpansionPreservedModels(baseline, [{ ...models[0], scores: { text: 9 } }, models[1]], descriptor.targetModelId, descriptor.replacesModelId))
  assert.deepEqual(baseline.models[0], { canonicalModelId: 'codex:gpt-image-2', overallRank: 1 })
})
