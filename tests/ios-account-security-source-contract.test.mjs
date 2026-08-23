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
