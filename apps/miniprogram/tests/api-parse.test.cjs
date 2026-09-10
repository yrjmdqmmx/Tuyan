const assert = require('node:assert/strict')

const { coerceJsonResponse } = require('../miniprogram/utils/api.js')

// 已是对象（wx.request 正常解析）：原样返回
const obj = { code: 0, job: { id: 'a' } }
assert.equal(coerceJsonResponse(obj), obj)

// 合法 JSON 字符串：解析
assert.deepEqual(coerceJsonResponse('{"code":0,"ok":true}'), { code: 0, ok: true })

// 字符串值内含裸控制字符（后端未转义 AI 文本的真实场景）：清洗后可解析，换行降级为空格
const dirty = '{"code":0,"job":{"id":"x","stages":[{"text":"第一行\n第二行\t缩进控制"}]}}'
assert.throws(() => JSON.parse(dirty))
const parsed = coerceJsonResponse(dirty)
assert.equal(parsed.code, 0)
assert.equal(parsed.job.id, 'x')
assert.equal(parsed.job.stages[0].text, '第一行 第二行 缩进控制')

// 彻底不是 JSON 的字符串：原样返回（调用方按错误处理）
assert.equal(coerceJsonResponse('<html>502 Bad Gateway</html>'), '<html>502 Bad Gateway</html>')

console.log('api-parse.test.cjs passed')


require('node:test')('mini PUT uses the remaining signed window with a ten-minute client cap', async () => {
  const { uploadReferenceFile } = require('../miniprogram/utils/api.js')
  const before = globalThis.wx, requests = []
  let reads = 0
  globalThis.wx = {
    getFileSystemManager: () => ({readFile(options) {reads++;options.success({data:new ArrayBuffer(1)})}}),
    request(options) {requests.push(options);options.success({statusCode:200})},
  }
  try {
    await uploadReferenceFile('/tmp/fixture.png','https://storage.example/upload','image/png',Date.now()+900000)
    assert.equal(requests[0].timeout,600000)
    await uploadReferenceFile('/tmp/fixture.png','https://storage.example/upload','image/png',Date.now()+300000)
    assert.ok(requests[1].timeout > 290000 && requests[1].timeout <= 295000)
    await assert.rejects(uploadReferenceFile('/tmp/fixture.png','https://storage.example/upload','image/png',Date.now()-1),/已过期/)
    assert.equal(reads,2);assert.equal(requests.length,2)
  } finally { globalThis.wx=before }
})
