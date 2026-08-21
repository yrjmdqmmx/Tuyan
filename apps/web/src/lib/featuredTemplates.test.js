import assert from 'node:assert/strict'
import test from 'node:test'
import {
  FEATURED_TEMPLATE_REFERENCE_IDS,
  FEATURED_TEMPLATES,
  attachFeaturedTemplateImages,
  featuredTemplateRequest,
} from './featuredTemplates.js'

test('featured templates are the approved six complete Chinese starters in exact source order', () => {
  assert.deepEqual(FEATURED_TEMPLATE_REFERENCE_IDS, ['ref_279', 'ref_281', 'ref_245', 'ref_240', 'ref_295', 'ref_10'])
  assert.deepEqual(FEATURED_TEMPLATES.map((template) => template.sourceReferenceId), FEATURED_TEMPLATE_REFERENCE_IDS)
  assert.equal(FEATURED_TEMPLATES.length, 6)
  for (const template of FEATURED_TEMPLATES) {
    assert.ok(template.category)
    assert.ok(template.title.length >= 6)
    assert.ok(template.summary.length >= 12)
    assert.ok(template.methodContent.length >= 80)
    assert.ok(template.caption.length >= 8)
    assert.ok(template.negativePrompt.length >= 8)
    assert.doesNotMatch(Object.values(template).join('\n'), /TODO|placeholder|占位/u)
  }
})
test('featured image request contains referenceIds only', () => {
  assert.deepEqual(featuredTemplateRequest(), { referenceIds: FEATURED_TEMPLATE_REFERENCE_IDS })
})

test('featured image hydration accepts only the exact returned ids and order', () => {
  const exact = FEATURED_TEMPLATE_REFERENCE_IDS.map((id) => ({ id, imageUrl: `https://images.example/${id}.png` }))
  const hydrated = attachFeaturedTemplateImages(exact)
  assert.deepEqual(hydrated.map((template) => template.imageUrl), exact.map((item) => item.imageUrl))
  assert.equal(hydrated.every((template) => template.imageState === 'ready'), true)

  const reordered = attachFeaturedTemplateImages([...exact].reverse())
  assert.equal(reordered.every((template) => template.imageUrl === '' && template.imageState === 'fallback'), true)

  const missing = attachFeaturedTemplateImages(exact.slice(0, 5))
  assert.equal(missing.every((template) => template.imageUrl === '' && template.imageState === 'fallback'), true)
})
