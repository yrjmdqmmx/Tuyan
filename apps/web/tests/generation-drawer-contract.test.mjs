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
  assert.match(source, /panelRef\.current\?\.contains\(document\.activeElement\)/u)
  assert.doesNotMatch(source, /window\.setTimeout\(\(\) => focusTarget\?\.focus\(\), 80\)/u)
  assert.match(source, /document\.querySelector\('\.accessible-dialog-backdrop'\)/u)
  assert.match(source, /document\.querySelector\('\.model-route-backdrop'\)/u)
  assert.doesNotMatch(source, /if \(!open\) return null/u)
})

test('generation canvas has a prominent settings summary and keeps refine as a top-level tab', () => {
  const source = readSource('../src/App.jsx')
  assert.match(source, />打开完整设置</u)
  assert.match(source, /generation-settings-summary/u)
  assert.match(source, /activeTab === 'refine'/u)
  assert.match(source, />精修图片</u)
})

test('feedback lives in the top header and no floating feedback action remains', () => {
  const source = readSource('../src/App.jsx')
  assert.match(source, /className="header-feedback-button"/u)
  assert.doesNotMatch(source, /className="feedback-fab"/u)
})

test('API keys remain React memory state and are not written to browser storage or URLs', () => {
  const source = readSource('../src/App.jsx')
  assert.match(source, /const \[apiKeys, setApiKeys\] = useState/u)
  assert.match(source, /setApiKeys\(\{ openrouter: '', gemini: '', openai: '', bailian: '', ark: '' \}\)/u)
  assert.match(source, /function clearPrivateWorkspace\(\)[\s\S]*?setArkVerification\(\{\}\)/u)
  assert.doesNotMatch(source, /localStorage|sessionStorage|URLSearchParams/u)
})

test('wide model drawer has desktop rails, incremental model rows, and a mobile replacement layout', () => {
  const styles = readSource('../src/styles.css')
  assert.match(styles, /\.model-route-backdrop\s*\{[\s\S]*?position:\s*fixed/u)
  assert.match(styles, /\.model-route-drawer\s*\{[\s\S]*?width:\s*min\(860px/u)
  assert.match(styles, /\.model-route-desktop-layout\s*\{[\s\S]*?grid-template-columns:/u)
  assert.match(styles, /\.model-option\s*\{[\s\S]*?min-height:\s*104px/u)
  assert.match(styles, /\.model-incompatible \.model-option\s*\{[\s\S]*?position:\s*relative/u)
  assert.match(styles, /@media \(max-width:\s*1076px\)[\s\S]*?\.model-route-drawer\s*\{[\s\S]*?inset:\s*0/u)
  assert.match(styles, /\.model-route-mobile-step/u)
  assert.doesNotMatch(styles, /\.feedback-fab/u)
})

test('model picker supports provider grouping, search, disabled reasons and bounded incremental rows', () => {
  const source = readSource('../src/components/ModelPicker.jsx')
  assert.match(source, /推荐模型/u)
  assert.match(source, /全部兼容模型/u)
  assert.match(source, /type="search"/u)
  assert.match(source, /groupRegistryModels/u)
  assert.match(source, /selectionDisabledReason/u)
  assert.match(source, /COMPATIBLE_PAGE_SIZE/u)
  assert.match(source, /rows\.slice\(0, compatibleLimit\)/u)
  assert.match(source, />\s*显示更多模型\s*</u)
  assert.match(source, /aria-disabled/u)
  assert.match(source, /API 接入渠道/u)
  assert.match(source, /模型开发厂商/u)
  assert.match(source, /暂不兼容/u)
  assert.match(source, /model-route-mobile-step/u)
  assert.match(source, /const COMPACT_MEDIA_QUERY = '\(max-width: 1076px\)'/u)
  assert.match(source, /showIncompatible \? <div>[\s\S]*?allPartition\.incompatible\.slice\(0, incompatibleLimit\)\.map/u)
  assert.match(source, /INCOMPATIBLE_PAGE_SIZE/u)
  assert.match(source, /previousFocusRef\.current\?\.focus/u)
  assert.match(source, /summary/u)
})

test('model search has a visible keyboard focus indicator', () => {
  const styles = readSource('../src/styles.css')
  assert.match(styles, /\.model-picker-search input:focus-visible\s*\{[\s\S]*?outline:\s*2px solid/u)
  assert.match(styles, /\.model-picker-search input:focus-visible\s*\{[\s\S]*?outline-offset:/u)
})

test('mobile top tabs stay on one line and use the existing horizontal scroller', () => {
  const styles = readSource('../src/styles.css')
  assert.match(styles, /@media \(max-width:\s*760px\)[\s\S]*?\.paper-tabs\s*\{[\s\S]*?overflow-x:\s*auto/u)
  assert.match(styles, /@media \(max-width:\s*760px\)[\s\S]*?\.paper-tabs button\s*\{[\s\S]*?white-space:\s*nowrap;[\s\S]*?flex:\s*0 0 auto;[\s\S]*?min-width:\s*max-content;[\s\S]*?padding:\s*0 13px;[\s\S]*?font-size:\s*13px/u)
})
