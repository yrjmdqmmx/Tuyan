import assert from 'node:assert/strict'
import test from 'node:test'
import { formatErrorMessage, pollRetryDelay, shouldClearAuthForJobError } from './utils.js'

test('network errors do not pretend every operation was a polling refresh', () => {
  assert.equal(formatErrorMessage('Failed to fetch'), '网络请求失败，请检查连接后重试。')
  assert.equal(formatErrorMessage('Failed to fetch', 'poll'), '任务状态刷新失败，页面会自动重试。')
})

test('polling stops for permanent errors and uses bounded exponential backoff for transient errors', () => {
  assert.equal(pollRetryDelay({ status: 401 }, 1, false, () => 0), null)
  assert.equal(pollRetryDelay({ status: 403 }, 1, false, () => 0), null)
  assert.equal(pollRetryDelay({ status: 404 }, 1, false, () => 0), null)
  assert.equal(pollRetryDelay({ status: 400 }, 1, false, () => 0), null)
  assert.equal(pollRetryDelay({ code: 429 }, 1, false, () => 0), 3000)
  assert.equal(pollRetryDelay({ status: 503 }, 3, false, () => 0), 12000)
  assert.equal(pollRetryDelay(new TypeError('Failed to fetch'), 9, false, () => 0), null)
  assert.equal(pollRetryDelay({ status: 503 }, 6, true, () => 0), 60000)
})

test('only an authentication 401 clears the session; job ownership 403 stays local to the task', () => {
  assert.equal(shouldClearAuthForJobError({ status: 401 }), true)
  assert.equal(shouldClearAuthForJobError({ code: 403 }), false)
  assert.equal(shouldClearAuthForJobError({ status: 404 }), false)
})

test('provider egress and account deletion failures have actionable messages', () => {
  assert.equal(formatErrorMessage('PROVIDER_EGRESS_UNAVAILABLE'), '海外模型出口暂不可用，请稍后重试。')
  assert.equal(formatErrorMessage('INVALID_PASSWORD'), '密码不正确，请重新输入。')
  assert.equal(formatErrorMessage('EMAIL_MISMATCH'), '确认邮箱与当前登录账号不一致。')
  assert.equal(formatErrorMessage('ACCOUNT_DELETION_WAITING_FOR_UPLOADS'), '账号已冻结新任务；请在参考图上传链接失效后按提示重试注销。')
  assert.equal(formatErrorMessage('ACCOUNT_DELETION_WAITING_FOR_JOBS'), '账号已冻结新任务；正在等待运行中的任务安全结束，请稍后重试注销。')
})
