import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const authPanel = readFileSync(new URL('../src/components/AuthPanel.jsx', import.meta.url), 'utf8')
const verifiedPage = readFileSync(new URL('../public/account/email-verified.html', import.meta.url), 'utf8')
const resetPage = readFileSync(new URL('../public/account/reset-password.html', import.meta.url), 'utf8')
const resetScript = readFileSync(new URL('../public/account/reset-password.js', import.meta.url), 'utf8')
const accountStyles = readFileSync(new URL('../public/account/account.css', import.meta.url), 'utf8')

test('auth panel exposes explicit verification and password recovery states', () => {
  assert.match(authPanel, /requestPasswordReset/)
  assert.match(authPanel, /sendVerificationEmail/)
  assert.match(authPanel, /EMAIL_NOT_VERIFIED/)
  assert.match(authPanel, /等待验证/)
  assert.match(authPanel, /忘记密码/)
  assert.match(authPanel, /callbackURL/)
  assert.match(authPanel, /redirectTo/)
  assert.match(authPanel, /setError\(err \|\|/)
  assert.doesNotMatch(authPanel, /setError\(err\?\.message/)
});

test('account landing pages cover safe token states and password boundaries', () => {
  assert.match(verifiedPage, /邮箱验证成功/)
  assert.match(verifiedPage, /链接已失效/)
  assert.match(verifiedPage, /链接已使用/)
  assert.match(resetPage, /密码至少 8 位/)
  assert.match(resetPage, /已登录设备.*自动退出/)
  assert.doesNotMatch(resetPage, /8[–-]128|最高|上限/)
  assert.match(resetPage, />重置密码<\/button>/)
  assert.match(resetScript, /\/api\/auth\/reset-password/)
  assert.match(resetScript, /newPassword/)
  assert.match(resetScript, /password\.length < 8/)
  assert.match(resetScript, /password\.length > 128/)
  assert.doesNotMatch(resetScript, /8[–-]128/)
  assert.match(resetScript, /TOKEN_EXPIRED|INVALID_TOKEN/)
  assert.match(accountStyles, /@media\s*\(max-width:\s*640px\)/)
  assert.match(accountStyles, /button:focus-visible/)
  assert.match(accountStyles, /\.actions button\s*\{\s*width:\s*100%/)
});
