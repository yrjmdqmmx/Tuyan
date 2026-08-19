import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const readSource = (relativePath) => readFileSync(new URL(relativePath, import.meta.url), 'utf8')

test('generation settings drawer stays mounted and supports Escape, backdrop, close and focus restoration', () => {
  const source = readSource('../src/components/GenerationSettingsDrawer.jsx')
  assert.match(source, /aria-hidden=\{!open\}/u)
  assert.match(source, /event\.key === 'Escape'/u)
  assert.match(source, /event\.target === event\.currentTarget/u)
  assert.match(source, /previousFocusRef\.current\?\.focus/u)
  assert.match(source, /data-focus-setting/u)
  assert.match(source, /requested\?\.querySelector\(FOCUSABLE\)/u)
  assert.match(source, /focusTimer = window\.setTimeout/u)
  assert.match(source, /document\.querySelector\('\.accessible-dialog-backdrop'\)/u)
  assert.doesNotMatch(source, /if \(!open\) return null/u)
})

test('generation canvas has a settings toolbar and keeps refine as a top-level tab', () => {
  const source = readSource('../src/App.jsx')
  assert.match(source, />生成设置</u)
  assert.match(source, /generation-config-summary/u)
  assert.match(source, /activeTab === 'refine'/u)
  assert.match(source, />精修图片</u)
})

test('model picker supports provider grouping, search, disabled reasons and windowing', () => {
  const source = readSource('../src/components/ModelPicker.jsx')
  assert.match(source, /推荐模型/u)
  assert.match(source, /全部兼容模型/u)
  assert.match(source, /type="search"/u)
  assert.match(source, /groupRegistryModels/u)
  assert.match(source, /selectionDisabledReason/u)
  assert.match(source, /visibleStart/u)
  assert.match(source, /aria-disabled/u)
})
