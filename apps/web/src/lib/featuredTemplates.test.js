import assert from 'node:assert/strict'
import test from 'node:test'
import {
  FEATURED_TEMPLATE_REFERENCE_IDS,
  FEATURED_TEMPLATES,
  attachFeaturedTemplateImages,
  featuredTemplateRequest,
} from './featuredTemplates.js'

test('featured templates are the approved six complete Chinese starters in exact source order', () => {
  assert.deepEqual(FEATURED_TEMPLATE_REFERENCE_IDS, ['journal_pcbi.1011436.g001', 'journal_pbio.2003779.g001', 'journal_pcbi.1005857.g009', 'journal_pcbi.1013027.g001', 'journal_pone.0242453.g005', 'journal_pbio.1002128.g001'])
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
