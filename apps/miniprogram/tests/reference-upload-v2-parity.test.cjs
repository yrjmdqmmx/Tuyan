const { test } = require('node:test')
const assert = require('node:assert/strict')
const { validateRefineFile, validateRefineModelInput, uploadRefineSource } = require('../miniprogram/utils/refine-upload.js')
const { referenceUploadContract, activeReferenceUploadPolicy, referenceUploadSelectionError, referenceUploadTimeout } = require('../miniprogram/utils/reference-upload-policy.js')
const { normalizeModelRegistry } = require('../miniprogram/utils/model-registry.js')
const contract = referenceUploadContract()
const limits = { version: 2, mimeTypes: ['image/png', 'image/jpeg', 'image/webp'], maxBytes: 20971520, maxDimension: 16384, maxPixels: 32000000, modelMaxBytes: { 'tokendance/seedream-5.0-pro': 4194304 } }
const route = { accessProvider: 'tokendance', modelId: 'seedream-5.0-pro' }
const file = { path: '/tmp/original.png', filename: 'original.png', mimeType: 'image/png', size: 20971520, width: 4000, height: 4000 }

test('refine v2 accepts platform originals independently from model transfer quota and checks direct-edit dimensions', () => {
  validateRefineFile(file, limits, route)
  assert.throws(() => validateRefineFile({ ...file, size: file.size + 1 }, limits, route))
  assert.throws(() => validateRefineFile({ ...file, width: 8000, height: 8000 }, limits, route))
  assert.throws(() => validateRefineModelInput({ width: 1000, height: 10 }, contract, route, 'refine'), /短边|长短边/)
  validateRefineModelInput(file, contract, route, 'refine')
  assert.throws(() => validateRefineFile(file, { ...limits, version: 1 }, route))
})
test('generation v2 preserves files when count, total, SVG or selected model limits block submission', () => {
  const policy = activeReferenceUploadPolicy(contract, { accessProvider: 'tokendance', modelId: 'qwen3.8-flash' })
  const images = Array.from({ length: 8 }, () => ({ ...file, size: 1000000 }))
  assert.equal(referenceUploadSelectionError(images, policy), '')
  assert.match(referenceUploadSelectionError([...images, file], policy), /最多提交 8 张/)
  assert.match(referenceUploadSelectionError(Array(5).fill(file), policy), /原图合计/)
  assert.match(referenceUploadSelectionError([{ ...file, size: 5242881, mimeType: 'image/svg+xml' }], policy), /SVG/)
  const fallback = activeReferenceUploadPolicy(contract, { accessProvider: 'unknown', modelId: 'unconfirmed' })
  assert.match(referenceUploadSelectionError(images, fallback), /文件已保留/)
  assert.equal(images.length, 8)
})
test('signed deadline is retained through refinement PUT and expired uploads stop before finalize', async () => {
  const expiresAt = Date.now() + 60000, calls = []
  const options = { limits, route, isCurrent: () => true, canCleanup: () => true, onStage() {},
    request: async body => { calls.push(body.action); return body.action === 'prepareReferenceUpload' ? { uploads: [{ ...file, objectKey: 'references/fixture/image.png', uploadToken: 'test-only', uploadUrl: 'https://fixture.invalid/put', expiresAt }] } : { source: { width: file.width, height: file.height } } },
    put: async (path, url, mime, expiry) => { assert.equal(expiry, expiresAt); throw new Error('expired signed URL') } }
  await assert.rejects(uploadRefineSource(file, options), /expired/)
  assert.deepEqual(calls, ['prepareReferenceUpload', 'abortReferenceUpload'])
  assert.equal(referenceUploadTimeout(10000, 6000), 0)
  assert.equal(referenceUploadTimeout(66000, 6000), 55000)
})
