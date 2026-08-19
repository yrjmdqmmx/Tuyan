import assert from 'node:assert/strict'
import test from 'node:test'
import { deleteAccountRequest } from './account.js'

test('account deletion re-authenticates against the gateway and preserves cookies', async () => {
  let observed
  const result = await deleteAccountRequest('https://api.paperbanana.asia/', {
    email: 'user@example.com',
    password: 'correct horse',
  }, async (url, init) => {
    observed = { url, init }
    return new Response(JSON.stringify({ code: 0, ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  })

  assert.equal(result.ok, true)
  assert.equal(observed.url, 'https://api.paperbanana.asia/api/account/delete')
  assert.equal(observed.init.credentials, 'include')
  assert.deepEqual(JSON.parse(observed.init.body), { email: 'user@example.com', password: 'correct horse' })
})

test('account deletion surfaces gateway errors without treating them as success', async () => {
  await assert.rejects(
    deleteAccountRequest('', { email: 'user@example.com', password: 'bad' }, async () => new Response(
      JSON.stringify({ code: 401, error: 'INVALID_PASSWORD' }),
      { status: 401, headers: { 'content-type': 'application/json' } },
    )),
    /INVALID_PASSWORD/,
  )
})
