import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
const modelPicker = readFileSync(new URL('../src/components/ModelPicker.jsx', import.meta.url), 'utf8')

test('Web fails closed until the server model registry loads and offers a retry action', () => {
  assert.match(app, /const missingSetting = firstMissingGenerationSetting/)
  assert.match(app, /firstInvalidRequiredRoute/)
  assert.match(app, /requiredRouteRoles: createRouteRoles/)
  assert.match(app, /setModelRegistry\(null\)/)
  assert.match(app, /setModelRegistryRetryNonce\(\(value\) => value \+ 1\)/)
})

test('OpenRouter catalog scope and search changes reset the incremental list before rendering fewer rows', () => {
  assert.match(modelPicker, /function changeCatalogMode\(mode\)/u)
  assert.match(modelPicker, /function resetModelList\(\)/u)
  assert.match(modelPicker, /setCompatibleLimit\(COMPATIBLE_PAGE_SIZE\)/u)
  assert.match(modelPicker, /windowRef\.current\.scrollTop = 0/u)
  assert.match(modelPicker, /setCatalogMode\(mode\); resetModelList\(\)/u)
  assert.match(modelPicker, /setQuery\(event\.target\.value\); resetModelList\(\)/u)
  assert.match(modelPicker, /onClick=\{\(\) => changeCatalogMode\('recommended'\)\}/u)
  assert.match(modelPicker, /onClick=\{\(\) => changeCatalogMode\('all'\)\}/u)
})
