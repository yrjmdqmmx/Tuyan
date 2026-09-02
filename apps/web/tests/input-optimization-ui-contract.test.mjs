import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')
const appSource = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')

test('input optimization comparison is side-by-side on desktop and stacked without overflow at 390px', () => {
  assert.match(styles, /\.input-optimization-comparison\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/su)
  assert.match(styles, /\.input-optimization-copy\s*\{[^}]*overflow:\s*auto/su)
  assert.match(styles, /@media\s*\(max-width:\s*390px\)[\s\S]*?\.input-optimization-comparison\s*\{[^}]*grid-template-columns:\s*1fr/su)
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.input-optimization-dialog/su)
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.input-optimization-dialog\s+\.spin\s*\{[^}]*animation:\s*none/su)
})

test('private workspace clearing and featured templates both clear every optimization undo snapshot', () => {
  const clearWorkspace = appSource.match(/function clearPrivateWorkspace\(\)\s*\{([\s\S]*?)\n  \}/u)?.[1] || ''
  const applyTemplate = appSource.match(/function applyFeaturedTemplate\(template\)\s*\{([\s\S]*?)\n  \}/u)?.[1] || ''
  assert.match(clearWorkspace, /clearInputOptimizationUndos|setInputOptimizationUndos/u)
  assert.match(applyTemplate, /clearInputOptimizationUndos|setInputOptimizationUndos/u)
})
