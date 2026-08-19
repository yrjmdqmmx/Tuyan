import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')

test('Web fails closed until the server model registry loads and offers a retry action', () => {
  assert.match(app, /const modelRegistryReady = Boolean\(modelRegistry\?\.providers\?\.\[provider\]\)/)
  assert.match(app, /return modelRegistryReady && authReady/)
  assert.match(app, /setModelRegistry\(null\)/)
  assert.match(app, /setModelRegistryRetryNonce\(\(value\) => value \+ 1\)/)
})
