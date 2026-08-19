import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
const modelPicker = readFileSync(new URL('../src/components/ModelPicker.jsx', import.meta.url), 'utf8')

test('Web fails closed until the server model registry loads and offers a retry action', () => {
  assert.match(app, /const modelRegistryReady = Boolean\(modelRegistry\?\.providers\?\.\[provider\]\)/)
  assert.match(app, /const missingSetting = firstMissingGenerationSetting/)
  assert.match(app, /if \(!modelRegistryReady\) return \{ setting: 'provider'/)
  assert.match(app, /setModelRegistry\(null\)/)
  assert.match(app, /setModelRegistryRetryNonce\(\(value\) => value \+ 1\)/)
})

test('OpenRouter catalog scope changes reset the virtual window before rendering fewer rows', () => {
  assert.match(modelPicker, /function changeCatalogMode\(mode\)/u)
  assert.match(modelPicker, /function resetVirtualWindow\(\)/u)
  assert.match(modelPicker, /setScrollTop\(0\)/u)
  assert.match(modelPicker, /windowRef\.current\.scrollTop = 0/u)
  assert.match(modelPicker, /setCatalogMode\(mode\); resetVirtualWindow\(\)/u)
  assert.match(modelPicker, /setQuery\(event\.target\.value\); resetVirtualWindow\(\)/u)
  assert.match(modelPicker, /useEffect\(resetVirtualWindow, \[models, role, outputFormat, provider\]\)/u)
  assert.match(modelPicker, /onClick=\{\(\) => changeCatalogMode\('recommended'\)\}/u)
  assert.match(modelPicker, /onClick=\{\(\) => changeCatalogMode\('all'\)\}/u)
})
