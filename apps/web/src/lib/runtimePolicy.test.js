import assert from 'node:assert/strict'
import test from 'node:test'
import {
  INPUT_LIMITS,
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
  assert.equal(INPUT_LIMITS.maxCriticRounds, 2)
})
