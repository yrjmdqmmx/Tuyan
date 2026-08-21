const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', 'miniprogram', relativePath), 'utf8')
}

const indexWxml = read('pages/index/index.wxml')
const indexWxss = read('pages/index/index.wxss')
const templateWxss = read('components/featured-template-studio/featured-template-studio.wxss')
const settingsWxml = read('components/generation-settings-sheet/generation-settings-sheet.wxml')
const settingsWxss = read('components/generation-settings-sheet/generation-settings-sheet.wxss')
const modelWxml = read('components/model-picker/model-picker.wxml')
const recordsWxss = read('pages/records/records.wxss')
const libraryWxml = read('components/reference-library/reference-library.wxml')
const libraryWxss = read('components/reference-library/reference-library.wxss')

assert.doesNotMatch(indexWxml, /香港生产 API/)
assert.doesNotMatch(indexWxml, /summary-icon/)
assert.match(indexWxml, /summary-action/)
assert.match(indexWxml, /summary-details/)
assert.match(indexWxss, /\.summary-value\{[^}]*white-space:normal/)
assert.match(templateWxss, /\.template-apply\s*\{[^}]*display:flex[^}]*align-items:center[^}]*justify-content:center/)

for (const label of ['流程', '检索', '候选', '评审']) {
  assert.match(settingsWxml, new RegExp(`class="setting-label">${label}<`))
}
assert.doesNotMatch(settingsWxml, /configurationMode === 'advanced'[^>]*><view class="setting-label">(?:流程|检索|候选|评审)</)
assert.match(settingsWxml, /manual-library" wx:if="\{\{draft\.retrievalSetting === 'manual'\}\}"/)
assert.match(settingsWxml, /<reference-library task-name="\{\{libraryTaskName\}\}"/)
assert.match(settingsWxss, /\.sheet-save\{[^}]*display:flex[^}]*align-items:center[^}]*justify-content:center/)

assert.match(modelWxml, /model-steps/)
assert.match(modelWxml, /provider-card/)
assert.match(modelWxml, /vendor-card/)
assert.match(modelWxml, /model-list/)
assert.match(modelWxml, /推荐模型/)
assert.match(modelWxml, /全部兼容/)

assert.match(recordsWxss, /\.job-record-meta\s*\{[^}]*grid-template-columns:repeat\(2/)
assert.match(recordsWxss, /\.job-models text:last-child\s*\{[^}]*white-space:normal/)
assert.match(recordsWxss, /\.job-prompt-preview\s*\{[^}]*max-height:none/)

assert.match(libraryWxml, /全库 306/)
assert.match(libraryWxml, /当前匹配 \{\{totalItems\}\}/)
assert.match(libraryWxss, /\.library-search-input\{[^}]*min-width:0/)
assert.match(libraryWxss, /\.library-search-input\{[^}]*box-sizing:border-box/)

console.log('mobile-ui-layout.test.cjs passed')
