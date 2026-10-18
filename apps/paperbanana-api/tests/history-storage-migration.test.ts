import assert from 'node:assert/strict'
import test from 'node:test'
import { createRefineRuntime } from '../../../test-support/refine-runtime.mjs'

test('history renews bucket URLs without rewriting selections or calling a model', async () => {
  const r = await createRefineRuntime()
  try {
    const reference = { id: 'historical-reference', imageObjectKey: 'references/history.png',
      imageUrl: 'https://old-bucket.oss-cn-hongkong.aliyuncs.com/history.png?expired=1',
      title: 'Original selection', match: { relevance: 0.9 }, source: 'paperbanana-bench' }
    const external = { id: 'external', imageUrl: 'https://example.org/reference.png' }
    await r.db.collection('paperbanana_jobs').insertOne({ _id: 'storage-history', jobId: 'storage-history',
      userId: 'refine-owner', status: 'succeeded', retrievedReferences: [reference, external],
      resultImages: [{ objectKey: 'storage-history/result.png', url: reference.imageUrl }],
      stages: [{ image: { objectKey: 'storage-history/stage.png', url: reference.imageUrl } }] })
    const response = await r.post({ action: 'getJob', jobId: 'storage-history' })
    assert.equal(response.data.code, 0)
    const job = response.data.job
    assert.deepEqual(job.retrievedReferences, [{ ...reference, imageUrl: r.baseUrl + '/objects/references/history.png' }, external])
    assert.equal(job.resultImages[0].url, r.baseUrl + '/objects/storage-history/result.png')
    assert.equal(job.stages[0].image.url, r.baseUrl + '/objects/storage-history/stage.png')
    assert.equal(r.providerCalls.length, 0)
    assert.equal((await r.db.collection('paperbanana_jobs').findOne({ _id: 'storage-history' })).retrievedReferences[0].imageUrl, reference.imageUrl)
    ;(globalThis as any).__refineTestCloud.storage.bucket = () => ({ async getDownloadUrl() { throw new Error('signing unavailable') } })
    const failed = await r.post({ action: 'getJob', jobId: 'storage-history' })
    assert.equal(failed.data.job.retrievedReferences[0].imageUrl, '')
    assert.deepEqual(failed.data.job.retrievedReferences[1], external)
  } finally { await r.close() }
})
