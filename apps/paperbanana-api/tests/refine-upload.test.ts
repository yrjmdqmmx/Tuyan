import assert from 'node:assert/strict'
import test from 'node:test'
import sharp from 'sharp'
import { crc32 } from 'node:zlib'
import { createRefineRuntime } from '../../../test-support/refine-runtime.mjs'

for (const accountGeneration of ['', 'restored-fixture-generation']) {
test(`real gateway/Core upload, ownership validation, source snapshot and image editing compose end to end (${accountGeneration || 'original identity'})`, async () => {
  const runtime = await createRefineRuntime()
  if (accountGeneration) await runtime.db.collection('paperbanana_account_deletions').insertOne({
    _id: 'user:refine-owner', userId: 'refine-owner', contractVersion: 3, status: 'active', accountGeneration,
  })
  const source = { filename: 'source.png', mimeType: 'image/png', size: runtime.image.length }
  const refine = {
    action: 'refineImage', provider: 'openai', apiKeys: { openai: 'local-fixture-key' }, mainModelName: 'gpt-4.1',
    imageModelName: 'gpt-image-1', referenceVisionModelName: 'gpt-4.1', editInstruction: '放大标签，保留配色和布局',
    aspectRatio: '1:1', imageSize: '1K', outputFormat: 'png',
  }
  try {
    const prepared = await runtime.post({ action: 'prepareReferenceUpload', files: [source] })
    assert.equal(prepared.data.code, 0, JSON.stringify(prepared))
    const upload = prepared.data.uploads[0]
    if (accountGeneration) assert.ok(upload.objectKey.startsWith(`references/refine-owner/lifecycles/${accountGeneration}/`))
    const request = { ...refine, sourceImageUpload: { objectKey: upload.objectKey } }
    const unfinalized = await runtime.post(request)
    assert.equal(unfinalized.data.code, 403, JSON.stringify(unfinalized))
    const put = await fetch(upload.uploadUrl, { method: 'PUT', headers: { 'Content-Type': source.mimeType }, body: new Uint8Array(runtime.image) })
    assert.equal(put.status, 200)
    const finalized = await runtime.post({ action: 'finalizeReferenceUpload', purpose: 'refine', uploads: [upload] })
    assert.equal(finalized.data.code, 0, JSON.stringify(finalized))
    assert.deepEqual(finalized.data.source, { width: 120, height: 80 })
    if (accountGeneration) {
      assert.equal((await runtime.post({ action: 'finalizeReferenceUpload', uploads: [upload] })).data.code, 0, 'ordinary reference finalize accepts restored identity paths too')
      const heads = runtime.db.collection('paperbanana_account_deletions')
      await heads.updateOne({ _id: 'user:refine-owner' }, { $set: { accountGeneration: 'next-generation' } })
      assert.equal((await runtime.post({ action: 'finalizeReferenceUpload', purpose: 'refine', uploads: [upload] })).data.code, 409)
      assert.equal((await runtime.post(request)).data.code, 403, 'prior lifecycle uploads cannot become new sources')
      await heads.updateOne({ _id: 'user:refine-owner' }, { $set: { accountGeneration } })
    }
    assert.equal((await runtime.post(request, 'other-owner')).data.code, 403)
    const legacyBypass = await runtime.post({ ...refine, sourceImageObjectKey: upload.objectKey })
    assert.equal(legacyBypass.status, 403, 'upload cannot bypass dedicated finalized source authorization')
    const submitted = await runtime.post(request)
    assert.equal(submitted.data.code, 0, JSON.stringify(submitted))
    const jobs = runtime.db.collection('paperbanana_jobs')
    const jobId = submitted.data.jobId
    const queued = await jobs.findOne({ _id: jobId })
    assert.match(queued.sourceImageObjectKey, new RegExp('^' + jobId + '/candidate-0-refine-source.png$'))
    await runtime.post({ action: 'abortReferenceUpload', uploads: [upload] })
    assert.equal(runtime.objects.has(upload.objectKey), false)
    await runtime.legacy.drainJobAdmission()
    const completed = await jobs.findOne({ _id: jobId })
    assert.equal(completed.status, 'succeeded', JSON.stringify(completed))
    assert.equal(completed.resultImages.length, 1)
    const editCall = runtime.providerCalls.find((call: any) => call.url.endsWith('/images/edits'))
    assert.ok(editCall, 'uploaded source reaches the real image editing adapter')
    const form = editCall!.options.body as FormData
    const imagePart = form.get('image') || form.get('image[]')
    assert.ok(imagePart instanceof Blob)
    const submittedPixels = await sharp(Buffer.from(await (imagePart as Blob).arrayBuffer())).raw().toBuffer()
    assert.deepEqual(submittedPixels, await sharp(runtime.image).raw().toBuffer())
    assert.equal(JSON.stringify(completed).includes('local-fixture-key'), false)
    assert.equal(JSON.stringify(completed).includes('uploadToken'), false)
    const registry = await runtime.post({ action: 'modelRegistry' })
    assert.ok(registry.data.inputOptimizationTargets.includes('editInstruction'))
    assert.ok(registry.data.refineUpload.maxBytes > 0)
  } finally { await runtime.close() }
})
}

test('finalized sources reject corrupted, mismatched, oversized and animated data before provider calls', async () => {
  const runtime = await createRefineRuntime()
  async function finalize(bytes: Buffer, mimeType = 'image/png') {
    const prepared = await runtime.post({ action: 'prepareReferenceUpload', files: [{ filename: 'source.png', mimeType, size: bytes.length }] })
    assert.equal(prepared.data.code, 0, JSON.stringify(prepared))
    const upload = prepared.data.uploads[0]
    await fetch(upload.uploadUrl, { method: 'PUT', headers: { 'Content-Type': mimeType }, body: new Uint8Array(bytes) })
    return runtime.post({ action: 'finalizeReferenceUpload', purpose: 'refine', uploads: [upload] })
  }
  try {
    for (const bytes of [Buffer.from('invalid image'), runtime.image.subarray(0, 55),
      await sharp({ create: { width: 17000, height: 1, channels: 3, background: '#fff' } }).png().toBuffer()]) {
      assert.equal((await finalize(bytes)).data.code, 400)
    }
    assert.equal((await finalize(runtime.image, 'image/jpeg')).data.code, 400)
    const oversized = await runtime.post({ action: 'prepareReferenceUpload', files: [{ filename: 'large.png', mimeType: 'image/png', size: 20 * 1024 * 1024 + 1 }] })
    assert.notEqual(oversized.data.code, 0)
    const animation = Buffer.alloc(20)
    animation.writeUInt32BE(8, 0); animation.write('acTL', 4); animation.writeUInt32BE(2, 8)
    animation.writeUInt32BE(crc32(animation.subarray(4, 16)), 16)
    const animated = Buffer.concat([runtime.image.subarray(0, 33), animation, runtime.image.subarray(33)])
    assert.equal((await finalize(animated)).data.code, 400)
    for (const format of ['jpeg', 'webp'] as const) {
      const bytes = await sharp(runtime.image).toFormat(format).toBuffer()
      const result = await finalize(bytes, 'image/' + format)
      assert.equal(result.data.code, 0, JSON.stringify(result))
      assert.deepEqual(result.data.source, { width: 120, height: 80 })
    }
    assert.equal(runtime.providerCalls.length, 0)
  } finally { await runtime.close() }
})

test('refine input optimization keeps edit-only context and preservation instructions on the real main route', async () => {
  const runtime = await createRefineRuntime()
  const original = '放大标签，保留原有文字、配色和布局。'
  const request = {
    action: 'optimizeInputs', target: 'editInstruction',
    inputs: { methodContent: 'unrelated generation method', caption: 'unrelated caption', negativePrompt: 'unrelated negative prompt', editInstruction: original },
    mainRoute: { accessProvider: 'openai', modelId: 'gpt-4.1' }, apiKey: 'local-main-fixture',
  }
  try {
    const result = await runtime.post(request)
    assert.equal(result.data.code, 0, JSON.stringify(result))
    assert.equal(result.data.target, 'editInstruction')
    const call = runtime.providerCalls.at(-1)
    assert.ok(call)
    const sent = JSON.parse(String(call.options.body))
    assert.equal(sent.model, 'gpt-4.1')
    assert.match(sent.messages.map((message: any) => message.content).join('\n'), /保留|preserv/i)
    assert.doesNotMatch(JSON.stringify(sent), /unrelated/)
    assert.ok(JSON.stringify(sent).includes(original))
    const count = runtime.providerCalls.length
    assert.equal((await runtime.post({ ...request, inputs: { ...request.inputs, editInstruction: 'x'.repeat(2001) } })).data.code, 400)
    assert.equal(runtime.providerCalls.length, count)
    runtime.failProvider(true)
    assert.notEqual((await runtime.post(request)).data.code, 0)
    assert.equal(request.inputs.editInstruction, original)
  } finally { await runtime.close() }
})
