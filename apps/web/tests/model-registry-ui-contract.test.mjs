import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
const modelPicker = readFileSync(new URL('../src/components/ModelPicker.jsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')

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

test('selected model notes keep unknown lifecycle and catalog-only verification explicit', () => {
  assert.match(app, /if \(value === 'stable'\) return '稳定版';/u)
  assert.match(app, /return '状态未知';/u)
  assert.match(app, /function formatVerification\(model\)/u)
  assert.match(app, /目录兼容（未实测）/u)
  assert.match(app, /\{formatVerification\(model\)\}/u)
  assert.match(styles, /\.model-option-badges\s*\{[^}]*flex-wrap:\s*wrap;/su)
})
