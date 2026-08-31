import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveScientificProviderTimeoutMs } from '../src/image-runtime-timeout.js'

test('scientific provider timeout defaults to the frozen five minute window', () => {
  assert.equal(resolveScientificProviderTimeoutMs(undefined), 300_000)
  assert.equal(resolveScientificProviderTimeoutMs('300000'), 300_000)
})

test('scientific provider timeout rejects drift outside the bounded production window', () => {
  for (const value of ['', '119999', '600001', '300000.5', 'not-a-number']) {
    assert.throws(() => resolveScientificProviderTimeoutMs(value), /SCIENTIFIC_V2_PROVIDER_TIMEOUT_INVALID/)
  }
  assert.equal(resolveScientificProviderTimeoutMs('120000'), 120_000)
  assert.equal(resolveScientificProviderTimeoutMs('600000'), 600_000)
})
