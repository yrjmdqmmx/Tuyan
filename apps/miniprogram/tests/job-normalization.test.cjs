const assert = require('node:assert/strict')

global.wx = { env: { USER_DATA_PATH: '/tmp' } }
const { normalizeJob, toLocalJobSummary, toRecordJobSummary } = require('../miniprogram/utils/jobs.js')

const job = normalizeJob({
  id: 'job-1', status: 'failed', clientPlatform: 'miniprogram', routingMode: 'mixed', modelRoutingSource: 'explicit',
  modelRoutes: {
    main: { accessProvider: 'openai', modelId: 'main' },
    image: { accessProvider: 'ark', modelId: 'image' },
    vision: { accessProvider: 'gemini', modelId: 'vision' },
  },
  negativePrompt: '避免小字', methodContent: '完整方法输入', caption: '图 1', aspectRatio: '4:1',
  businessCode: 'ASPECT_RATIO_UNSUPPORTED', error: 'failed',
  resultImages: [{ url: 'https://signed.example/result.png?token=one', objectKey: 'jobs/job-1/result.png', mimeType: 'image/png' }],
})

assert.equal(job.client_platform, 'miniprogram')
assert.equal(job.routing_mode, 'mixed')
assert.equal(job.model_routing_source, 'explicit')
assert.equal(job.negative_prompt, '避免小字')
assert.equal(job.model_routes.image.accessProvider, 'ark')
assert.equal(job.result_images[0].object_key, 'jobs/job-1/result.png')
assert.equal(job.business_code, 'ASPECT_RATIO_UNSUPPORTED')
assert.equal(job.method_content, '完整方法输入')
assert.equal(job.aspect_ratio, '4:1')

const localSummary = toLocalJobSummary(job)
assert.equal(localSummary.result_images.length, 1)
assert.equal(localSummary.result_images[0].object_key, 'jobs/job-1/result.png')
assert.equal(localSummary.method_content, '')
assert.equal(localSummary.stages.length, 0)

const recordSummary = toRecordJobSummary(job)
assert.equal(recordSummary.method_content, '完整方法输入')

console.log('job-normalization.test.cjs passed')
