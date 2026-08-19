const assert = require('node:assert/strict')

const { formatClientPlatform, normalizeJob } = require('../miniprogram/utils/jobs.js')

assert.equal(normalizeJob({ id: 'snake', client_platform: 'web' }).client_platform, 'web')
assert.equal(normalizeJob({ id: 'camel', clientPlatform: 'ios' }).client_platform, 'ios')
assert.equal(normalizeJob({ id: 'camel', clientPlatform: 'ios' }).client_platform_text, 'iOS')
assert.equal(normalizeJob({ id: 'legacy' }).client_platform, '')
assert.equal(normalizeJob({ id: 'legacy' }).client_platform_text, '未记录')
assert.equal(formatClientPlatform('miniprogram'), '微信小程序')
assert.equal(formatClientPlatform(''), '未记录')
assert.equal(formatClientPlatform('unknown-platform'), '未记录')

console.log('client-platform.test.cjs passed')
