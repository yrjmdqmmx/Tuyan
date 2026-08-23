import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(
  new URL('../apps/ios/PaperBanana/Features/Settings/AccountSecurityView.swift', import.meta.url),
  'utf8',
)

test('iOS account security renders the resend countdown value', () => {
  assert.equal(source.includes('"(model.auth.resendCooldownSeconds) 秒后可重发"'), false)
  assert.equal(source.match(/"\\\(model\.auth\.resendCooldownSeconds\) 秒后可重发"/g)?.length, 2)
})

test('iOS account security explains password rules without exposing the maximum', () => {
  assert.match(source, /至少 8 位/)
  assert.match(source, /其他设备.*自动退出.*新密码重新登录/)
  assert.doesNotMatch(source, /8[–-]128|最高|上限|会话.*撤销|撤销.*会话/)
})
