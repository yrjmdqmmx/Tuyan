const assert = require('node:assert/strict')

const { resolveImageUrl } = require('../miniprogram/utils/jobs.js')

// 同一对象、不同签名查询串：复用首次拿到的 URL（轮询期间 <image> src 保持稳定不闪烁）
const first = resolveImageUrl('https://oss.example.com/bucket/job-1/candidate-0.png?X-Amz-Signature=aaa&X-Amz-Date=1', 'job-1', 0)
const second = resolveImageUrl('https://oss.example.com/bucket/job-1/candidate-0.png?X-Amz-Signature=bbb&X-Amz-Date=2', 'job-1', 0)
assert.equal(first, 'https://oss.example.com/bucket/job-1/candidate-0.png?X-Amz-Signature=aaa&X-Amz-Date=1')
assert.equal(second, first)

// 不同对象互不影响
const other = resolveImageUrl('https://oss.example.com/bucket/job-1/stage-1.png?X-Amz-Signature=ccc', 'job-1', 1)
assert.equal(other, 'https://oss.example.com/bucket/job-1/stage-1.png?X-Amz-Signature=ccc')

// 无查询串的普通 URL 原样直通（不进缓存）
assert.equal(resolveImageUrl('https://example.com/static/logo.png'), 'https://example.com/static/logo.png')

// 启动清理后仍残留在任务记录里的本地缓存路径不应交给 <image> 重复报错。
global.wx = {
  env: { USER_DATA_PATH: '/tmp/paperbanana-tests' },
  getFileSystemManager: () => ({ accessSync() { throw new Error('missing') } }),
}
assert.equal(resolveImageUrl('/tmp/paperbanana-tests/missing.png'), '')

console.log('stable-url.test.cjs passed')
