import assert from 'node:assert/strict'
import test from 'node:test'
import { ApiError, fetchJson } from './client.js'

test('fetchJson preserves HTTP and business status for recovery policy', async () => {
  const previous = globalThis.fetch
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ code: 401, error: 'Please log in' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
    await assert.rejects(fetchJson('https://api.invalid'), (error) => {
      assert.equal(error instanceof ApiError, true)
      assert.equal(error.status, 401)
      assert.equal(error.code, 401)
      return true
    })

    globalThis.fetch = async () => Response.json({ code: 429, error: 'busy' })
    await assert.rejects(fetchJson('https://api.invalid'), (error) => {
      assert.equal(error.status, 200)
      assert.equal(error.code, 429)
      return true
    })
  } finally {
    globalThis.fetch = previous
  }
})
