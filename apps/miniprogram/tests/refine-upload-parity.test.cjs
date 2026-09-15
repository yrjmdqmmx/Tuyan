const { test } = require('node:test')
const assert = require('node:assert/strict')
const { validateRefineFile, uploadRefineSource } = require('../miniprogram/utils/refine-upload.js')
const limits = { version: 1, mimeTypes: ['image/png', 'image/jpeg', 'image/webp'], maxBytes: 1000000, maxDimension: 4096, maxPixels: 10000000, modelMaxBytes: { 'openai/image': 500000 } }
const file = { path: '/tmp/test.png', filename: 'test.png', mimeType: 'image/png', size: 10000, width: 100, height: 100 }
const route = { accessProvider: 'openai', modelId: 'image' }
test('refine file validation follows declared MIME, model byte and pixel limits', () => {
  validateRefineFile(file, limits, route)
  assert.throws(() => validateRefineFile(file, undefined, route))
  assert.throws(() => validateRefineFile({ ...file, mimeType: 'image/svg+xml' }, limits, route))
  assert.throws(() => validateRefineFile({ ...file, size: 600000 }, limits, route))
  assert.throws(() => validateRefineFile({ ...file, width: 4097 }, limits, route))
  assert.throws(() => validateRefineFile({ ...file, width: 4000, height: 4000 }, limits, route))
})

function harness(overrides = {}) {
  const calls = []; const stages = []
  const options = { limits, route, isCurrent: () => true, canCleanup: () => true, onStage: s => stages.push(s),
    request: async body => { calls.push(body); if (body.action === 'prepareReferenceUpload') return { uploads: [{ objectKey: 'references/owner/lifecycles/2/test.png', uploadToken: 'synthetic-upload-token', uploadUrl: 'https://storage.example.test/put', filename: file.filename, mimeType: file.mimeType, size: file.size }] }; return { code: 0, source: { width: 100, height: 100 } } },
    put: async () => calls.push({ action: 'put' }), ...overrides }
  return { options, calls, stages }
}
test('refine upload finalizes with purpose and retains cleanup without leaking token into source', async () => {
  const { options, calls, stages } = harness()
  const result = await uploadRefineSource(file, options)
  assert.deepEqual(calls.map(c => c.action), ['prepareReferenceUpload', 'put', 'finalizeReferenceUpload'])
  assert.equal(calls[2].purpose, 'refine')
  assert.equal(calls[2].uploads[0].uploadUrl, undefined)
  assert.equal(result.source.uploaded, true)
  assert.equal(result.source.uploadToken, undefined)
  assert.deepEqual(stages, ['preparing', 'uploading', 'checking', 'ready'])
  await result.cleanup(); await result.cleanup()
  assert.equal(calls.filter(c => c.action === 'abortReferenceUpload').length, 1)
})
test('failed or replaced upload is aborted and cannot become a ready source', async () => {
  const failed = harness({ put: async () => { throw new Error('offline') } })
  await assert.rejects(uploadRefineSource(file, failed.options), /offline/)
  assert.equal(failed.calls.at(-1).action, 'abortReferenceUpload')
  let current = true
  const replaced = harness({ isCurrent: () => current, put: async () => { current = false } })
  await assert.rejects(uploadRefineSource(file, replaced.options), /取消/)
  assert.ok(!replaced.calls.some(c => c.action === 'finalizeReferenceUpload'))
  assert.equal(replaced.calls.at(-1).action, 'abortReferenceUpload')
})
