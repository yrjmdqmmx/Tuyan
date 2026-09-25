import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')

test('a committed account deletion signs out locally before best-effort session refresh', () => {
  // The controller's clear/refresh race is exercised by useAuthSession.test.jsx.
  const start = app.indexOf('async function handleAccountDeleted()')
  const end = app.indexOf('\n  function ', start + 1)
  const handler = app.slice(start, end)
  assert.ok(handler.indexOf('authSession.clear()') < handler.indexOf('authSession.refresh()'))
  assert.match(handler, /try \{\s*await authSession\.refresh\(\);?\s*\} catch/)
})
