const assert = require('node:assert/strict')

const { cleanupCachedImages, resolveImageUrl } = require('../miniprogram/utils/jobs.js')

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

// 开发者工具会把旧本地文件序列化成 127.0.0.1/__APP__/paperbanana-* 代理 URL；
// 它只在原模拟会话中有效，不能当作普通远程 URL 继续交给 <image>。
assert.equal(resolveImageUrl('http://127.0.0.1:43988/__APP__/paperbanana-old.png'), '')

// 清理必须同步完成，页面随后读取旧任务时不会先通过存在检查、再被异步删除。
const unlinked = []
global.wx = {
  env: { USER_DATA_PATH: '/tmp/paperbanana-tests' },
  getFileSystemManager: () => ({
    readdirSync() { return ['paperbanana-old.png', 'keep.txt'] },
    unlinkSync(filePath) { unlinked.push(filePath) },
  }),
}
cleanupCachedImages()
assert.deepEqual(unlinked, ['/tmp/paperbanana-tests/paperbanana-old.png'])

console.log('stable-url.test.cjs passed')
