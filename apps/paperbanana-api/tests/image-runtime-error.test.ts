import assert from 'node:assert/strict'
import test from 'node:test'

import * as runtimeErrors from '../src/image-runtime-error.js'

test('authoritative image runtime preserves confirmed HTTP status while leaving network ambiguity untyped', () => {
  const normalize = (runtimeErrors as unknown as Record<string, unknown>).normalizeAuthoritativeImageRuntimeError
  assert.equal(typeof normalize, 'function')
  for (const status of [400, 503, 429] as const) {
    const boundaryError = Object.assign(new Error('AUTHORITATIVE_IMAGE_RUNTIME_HTTP_ERROR'), { status })
    const normalized = (normalize as (error: unknown) => Error & { status?: number })(boundaryError)
    assert.equal(normalized.status, status)
    assert.equal(normalized, boundaryError)
  }
  const network = new Error('UNKNOWN_PROVIDER_OUTCOME_AFTER_DISPATCH')
  const normalizedNetwork = (normalize as (error: unknown) => Error & { status?: number })(network)
  assert.equal(normalizedNetwork, network)
  assert.equal(normalizedNetwork.status, undefined)
  assert.equal((normalize as (error: unknown) => Error & { status?: number })(new Error('model 400 unavailable')).status, undefined)
  const typed = Object.assign(new Error('AUTHORITATIVE_IMAGE_RUNTIME_HTTP_ERROR'), { status: 401 })
  assert.equal((normalize as (error: unknown) => Error & { status?: number })(typed), typed)
  for (const spoofed of [
    Object.assign(new Error('fake'), { status: '503' }),
    Object.assign(new Error('fake'), { status: true }),
    Object.assign(new Error('fake'), { status: new Number(503) }),
    Object.assign(new Error('fake'), { response: { status: '503' } }),
    new Error('Ark image request failed: HTTP 503'),
  ]) assert.equal((normalize as (error: unknown) => Error & { status?: number })(spoofed), spoofed)
})
