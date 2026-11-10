import test from 'node:test'
import assert from 'node:assert/strict'
import {imageInputPresentations, assertPresentationChanges, review, plain} from '../test-support/image-input-r27.mjs'
import {applyEvidenceR27} from './lib/model-evidence-r27.mjs'
import data from '../config/model-audit.generated.json' with {type:'json'}

test('R27 all 1064 Web and compiled Mini presentations change only the 15 reviewed image inputs and sources', async () => {
  const now = await imageInputPresentations()
  assertPresentationChanges(now)
  const unexpected = plain(now)
  unexpected['fal/fal-ai/flux-2-pro'].mini.card.specRows[1].value = 'changed output'
  assert.throws(() => assertPresentationChanges(unexpected), /unexpected change/)
  unexpected['fal/fal-ai/flux-2-pro'] = now['fal/fal-ai/flux-2-pro']
  const other = Object.keys(now).find(key => !review.reviews[key])
  unexpected[other].web.name = 'changed picker name'
  assert.throws(() => assertPresentationChanges(unexpected), /unexpected changed card/)
})

test('R27 rejects unverified quotes, incorrect sources and dates instead of restoring support', () => {
  assert.equal(Object.keys(review.reviews).length, 15)
  assert.equal(review.decisionDate, '2026-11-10')
  for (const capture of review.captures) {
    assert.equal(capture.httpStatus, 200); assert.equal(capture.method, 'GET'); assert.equal(capture.authenticated, false)
    const copy = structuredClone(review)
    copy.captures.find(row => row.identity === capture.identity).quoteMatched = false
    assert.throws(() => applyEvidenceR27(structuredClone(data), copy), /Invalid R27 image-input evidence/)
  }
  for (const field of ['sourceUrl', 'quote', 'verifiedAt']) {
    const copy = structuredClone(review)
    copy.reviews['fal/fal-ai/flux-2-pro'].inputModalities[field] = 'invalid'
    assert.throws(() => applyEvidenceR27(structuredClone(data), copy), /Invalid R27 image-input evidence/)
  }
  assert.doesNotThrow(() => applyEvidenceR27(structuredClone(data)))
})
