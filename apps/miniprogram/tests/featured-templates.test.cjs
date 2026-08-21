const assert = require('node:assert/strict')

const {
  FEATURED_TEMPLATE_REFERENCE_IDS,
  FEATURED_TEMPLATES,
  attachFeaturedTemplateImages,
  featuredTemplateRequest,
} = require('../miniprogram/utils/featured-templates.js')

assert.deepEqual(FEATURED_TEMPLATE_REFERENCE_IDS, ['ref_279', 'ref_281', 'ref_245', 'ref_240', 'ref_295', 'ref_10'])
assert.equal(FEATURED_TEMPLATES.length, 6)
for (const template of FEATURED_TEMPLATES) {
  assert.ok(template.methodContent.length > 80)
  assert.ok(template.caption)
  assert.ok(template.negativePrompt)
}
assert.deepEqual(featuredTemplateRequest(), { referenceIds: FEATURED_TEMPLATE_REFERENCE_IDS })
const attached = attachFeaturedTemplateImages([
  { id: 'ref_279', imageUrl: 'https://signed.example/ref279.png' },
  { id: 'ref_10', image_url: 'https://signed.example/ref10.png' },
])
assert.equal(attached[0].imageUrl, 'https://signed.example/ref279.png')
assert.equal(attached[1].imageUrl, '')
assert.equal(attached[5].imageUrl, 'https://signed.example/ref10.png')
assert.equal(attached[1].hasImage, false)

console.log('featured-templates.test.cjs passed')
