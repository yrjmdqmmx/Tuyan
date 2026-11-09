import assert from 'node:assert/strict'
import test from 'node:test'
import {
  INPUT_LIMITS,
  accountPageUrl,
  officialApiBase,
  shouldPollJob,
  validateApiBase,
} from './runtimePolicy.js'

test('production API base is pinned to the official origin', () => {
  assert.equal(officialApiBase('https://paperbanana.asia'), 'https://api.paperbanana.asia')
  assert.equal(validateApiBase('https://api.paperbanana.asia', false), 'https://api.paperbanana.asia')
  assert.throws(() => validateApiBase('https://attacker.example', false), /official/i)
  assert.equal(validateApiBase('http://localhost:8787/', true), 'http://localhost:8787')
})

test('polling stops when a job reaches a terminal state', () => {
  assert.equal(shouldPollJob(null), true)
  assert.equal(shouldPollJob({ status: 'queued' }), true)
  assert.equal(shouldPollJob({ status: 'running' }), true)
  assert.equal(shouldPollJob({ status: 'succeeded' }), false)
  assert.equal(shouldPollJob({ status: 'failed' }), false)
  assert.equal(shouldPollJob({ status: 'cancelled' }), false)
})

test('input limits are bounded for cost protection', () => {
  assert.equal(INPUT_LIMITS.methodContent, 12000)
  assert.equal(INPUT_LIMITS.caption, 1000)
  assert.equal(INPUT_LIMITS.negativePrompt, 1000)
  assert.equal(INPUT_LIMITS.maxCriticRounds, 5)
})


test('Hangzhou website uses its same-origin API without accepting lookalike hosts', () => {
  assert.equal(officialApiBase('https://tuyansci.cn'), 'https://tuyansci.cn')
  assert.equal(officialApiBase('https://tuyansci.cn.evil.example'), 'https://api.paperbanana.asia')
  assert.equal(validateApiBase('https://tuyansci.cn/', false), 'https://tuyansci.cn')
  for (const url of ['http://tuyansci.cn', 'https://tuyansci.cn:444', 'https://tuyansci.cn.evil.example', 'https://user@tuyansci.cn', 'https://tuyansci.cn/path', 'https://tuyansci.cn?url=evil']) {
    assert.throws(() => validateApiBase(url, false), /official/)
  }
  assert.equal(accountPageUrl('reset-password.html', 'https://tuyansci.cn'), 'https://tuyansci.cn/account/reset-password.html')
  assert.equal(accountPageUrl('reset-password.html', 'https://www.paperbanana.asia'), 'https://www.paperbanana.asia/account/reset-password.html')
})
