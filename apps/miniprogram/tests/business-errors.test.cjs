const assert = require('node:assert/strict')

const { businessErrorGuidance, toBusinessError } = require('../miniprogram/utils/business-errors.js')

const error = toBusinessError(400, {
  code: 400,
  businessCode: 'INVALID_ASPECT_RATIO',
  error: 'Invalid aspect ratio',
  detail: '4:5 is not canonical',
})
assert.equal(error.httpStatus, 400)
assert.equal(error.code, 400)
assert.equal(error.businessCode, 'INVALID_ASPECT_RATIO')
assert.equal(error.detail, '4:5 is not canonical')
assert.equal(businessErrorGuidance(error).setting, 'aspect-ratio')
assert.match(businessErrorGuidance(error).message, /比例/)

const expectedSettings = {
  MODEL_ROUTE_CONFLICT: 'model-routing',
  ASPECT_RATIO_UNSUPPORTED: 'aspect-ratio',
  REFERENCE_LIBRARY_REQUEST_INVALID: 'reference-library',
  REFERENCE_LIBRARY_SELECTION_INVALID: 'reference-library',
  REFERENCE_SELECTION_INVALID: 'reference-library',
  REFERENCE_SELECTION_LIMIT: 'reference-library',
  REFINE_RESOLUTION_UNSUPPORTED: 'refine-resolution',
  REFINE_ASPECT_RATIO_UNSUPPORTED: 'refine-aspect-ratio',
}
for (const [businessCode, setting] of Object.entries(expectedSettings)) {
  assert.equal(businessErrorGuidance(toBusinessError(400, { businessCode })).setting, setting)
}
assert.match(businessErrorGuidance(toBusinessError(429, { businessCode: 'CAPACITY_LIMIT' })).message, /稍后重试/)
assert.match(businessErrorGuidance(toBusinessError(503, { businessCode: 'RUNTIME_RESTARTED_RETRY' })).message, /重新提交/)

console.log('business-errors.test.cjs passed')
