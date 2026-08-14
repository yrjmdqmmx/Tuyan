import assert from 'node:assert/strict'
import test from 'node:test'

import { redactLogValue } from '../src/redaction.js'
import { createLogger } from '../src/logger.js'

test('redacts authorization, service tokens, admin tokens, and provider API keys recursively', () => {
  const input = {
    authorization: 'Bearer user-secret',
    requestBody: { caption: 'must not be logged' },
    nested: {
      gatewayToken: 'gateway-body-secret',
      adminToken: 'admin-body-secret',
      apiKey: 'provider-secret',
      apiKeys: { gemini: 'gemini-secret' },
      safe: 'visible',
    },
  }

  assert.deepEqual(redactLogValue(input), {
    authorization: '[REDACTED]',
    requestBody: '[REDACTED]',
    nested: {
      gatewayToken: '[REDACTED]',
      adminToken: '[REDACTED]',
      apiKey: '[REDACTED]',
      apiKeys: '[REDACTED]',
      safe: 'visible',
    },
  })
})

test('redacts Gemini key query parameters from strings without hiding safe URL parts', () => {
  const value = 'request failed: https://generativelanguage.googleapis.com/v1/models/x?key=gemini-secret&alt=json'

  assert.equal(
    redactLogValue(value),
    'request failed: https://generativelanguage.googleapis.com/v1/models/x?key=[REDACTED]&alt=json',
  )
})

test('redacts sensitive headers case-insensitively', () => {
  assert.deepEqual(
    redactLogValue({ Authorization: 'Bearer x', 'X-Paperbanana-Gateway-Token': 'service-secret' }),
    { Authorization: '[REDACTED]', 'X-Paperbanana-Gateway-Token': '[REDACTED]' },
  )
})

test('structured logger applies redaction before writing fields', () => {
  const lines: string[] = []
  const logger = createLogger((line) => lines.push(line))

  logger.error('provider failed', {
    body: { apiKeys: { gemini: 'body-secret' } },
    authorization: 'Bearer auth-secret',
    url: 'https://generativelanguage.googleapis.com/v1/models/x?key=url-secret',
  })

  assert.equal(lines.length, 1)
  assert.doesNotMatch(lines[0], /body-secret|auth-secret|url-secret/)
  assert.match(lines[0], /\[REDACTED\]/)
})
