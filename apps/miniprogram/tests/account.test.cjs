const assert = require('node:assert/strict')

const {
  ACCOUNT_CLEAR_STORAGE_KEYS,
  buildDeleteAccountPayload,
  clearAccountClientState,
  validateDeleteAccountInput,
} = require('../miniprogram/utils/account.js')

assert.deepEqual(buildDeleteAccountPayload(' user@example.com ', 'correct horse'), { email: 'user@example.com', password: 'correct horse' })
assert.equal(validateDeleteAccountInput({ currentEmail: 'user@example.com', email: 'other@example.com', password: 'password', confirmed: true }), '请输入当前账号邮箱。')
assert.equal(validateDeleteAccountInput({ currentEmail: 'user@example.com', email: 'user@example.com', password: '', confirmed: true }), '请输入当前密码。')
assert.equal(validateDeleteAccountInput({ currentEmail: 'user@example.com', email: 'user@example.com', password: 'password', confirmed: false }), '请完成二次确认。')
assert.equal(validateDeleteAccountInput({ currentEmail: 'user@example.com', email: 'user@example.com', password: 'password', confirmed: true }), '')

const removed = []
let memoryCleared = false
clearAccountClientState((key) => removed.push(key), () => { memoryCleared = true })
assert.deepEqual(removed, ACCOUNT_CLEAR_STORAGE_KEYS)
assert.equal(memoryCleared, true)
assert.ok(removed.includes('paperbanana_auth_cookie'))
assert.ok(removed.includes('paperbanana_mini_jobs'))

console.log('account.test.cjs passed')
