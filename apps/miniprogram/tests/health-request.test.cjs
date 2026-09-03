const assert = require('node:assert/strict')

async function main() {
  const requests = []
  global.wx = {
    getStorageSync() {
      return 'session=must-not-be-sent'
    },
    setStorageSync() {},
    removeStorageSync() {},
    request(options) {
      requests.push(options)
      queueMicrotask(() => {
        if (requests.length === 1) {
          options.fail({
            errMsg: 'request:fail errcode:-100 cronet_error_code:-100 error_msg:net::ERR_CONNECTION_CLOSED',
          })
          return
        }
        options.success({
          statusCode: 200,
          header: {},
          data: { code: 0, ok: true },
        })
      })
    },
  }

  const { formatError, requestHealth } = require('../miniprogram/utils/api.js')
  const result = await requestHealth()

  assert.equal(result.ok, true)
  assert.equal(requests.length, 2, '瞬时断连仅重试一次')
  assert.deepEqual(requests.map((request) => request.data), [
    { action: 'health' },
    { action: 'health' },
  ])
  assert.equal(requests[0].header.Cookie, undefined, '公开健康探测不应携带登录 Cookie')
  assert.equal(requests[1].header.Cookie, undefined, '重试也不应携带登录 Cookie')
  assert.equal(
    formatError(new Error('request:fail error_msg:net::ERR_CONNECTION_CLOSED')),
    '网络连接临时中断，请稍后重试。',
  )

  requests.length = 0
  global.wx.request = (options) => {
    requests.push(options)
    queueMicrotask(() => {
      options.success({
        statusCode: 503,
        header: {},
        data: { error: 'service unavailable' },
      })
    })
  }

  await assert.rejects(requestHealth())
  assert.equal(requests.length, 1, 'HTTP/业务错误不能自动重试')

  console.log('health-request.test.cjs passed')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
