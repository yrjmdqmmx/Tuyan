import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const readSource = (relativePath) => readFileSync(new URL(relativePath, import.meta.url), 'utf8')

test('featured carousel declares five-second autoplay and all required pause conditions', () => {
  const source = readSource('../src/components/FeaturedTemplateStudio.jsx')
  assert.match(source, /setInterval[\s\S]*?5000/u)
  assert.match(source, /prefers-reduced-motion:\s*reduce/u)
  assert.match(source, /visibilitychange/u)
  assert.match(source, /document\.hidden/u)
  assert.match(source, /onMouseEnter/u)
  assert.match(source, /onMouseLeave/u)
  assert.match(source, /onFocusCapture/u)
  assert.match(source, /onBlurCapture/u)
  assert.match(source, /aria-label="上一张模板"/u)
  assert.match(source, /aria-label="下一张模板"/u)
})

test('featured studio, prominent settings, ratios, and guide have desktop and 390px layout contracts', () => {
  const styles = readSource('../src/styles.css')
  assert.match(styles, /\.featured-template-hero\s*\{[\s\S]*?grid-template-columns:/u)
  assert.match(styles, /\.featured-template-grid\s*\{[\s\S]*?repeat\(3,/u)
  assert.match(styles, /\.generation-settings-summary\s*\{[\s\S]*?background:/u)
  assert.match(styles, /\.aspect-ratio-options\s*\{[\s\S]*?grid-template-columns:/u)
  assert.match(styles, /\.guide-directory\s*\{[\s\S]*?position:\s*sticky/u)
  assert.match(styles, /@media\s*\(max-width:\s*760px\)[\s\S]*?\.featured-carousel-card\s*\{[\s\S]*?flex-basis:\s*100%/u)
  assert.match(styles, /@media\s*\(max-width:\s*390px\)[\s\S]*?\.featured-template-hero[\s\S]*?\.generation-settings-summary[\s\S]*?\.aspect-ratio-options/u)
  assert.match(styles, /@media\s*\(max-width:\s*760px\)[\s\S]*?\.guide-directory\s*\{[\s\S]*?overflow-x:\s*auto/u)
})

test('private workspace cleanup includes the negative prompt and template dirty state', () => {
  const source = readSource('../src/App.jsx')
  assert.match(source, /function clearPrivateWorkspace\(\)[\s\S]*?setNegativePrompt\(''\)/u)
  assert.match(source, /function clearPrivateWorkspace\(\)[\s\S]*?setInputIsDirty\(false\)/u)
})
