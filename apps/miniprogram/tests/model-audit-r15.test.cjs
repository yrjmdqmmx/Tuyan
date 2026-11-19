const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { loadComponent } = require('./helpers/component.cjs')
const { getModelRegistryState } = require('../miniprogram/utils/model-registry-store.js')
const { STATIC_MODEL_REGISTRY } = require('../miniprogram/utils/static-model-catalog.js')
const root = path.resolve(__dirname, '../miniprogram')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

test('R15 both compiled mini notices expose exact unbroken model names and cancellation preserves selections', () => {
  const registry = { providers: STATIC_MODEL_REGISTRY }
  getModelRegistryState().registry = registry
  for (const [provider, modelId, names] of [
    ['xiaomi', 'mimo-v2.5', ['MiMo-v2.5', 'MiMo-V2.6-Flash']],
    ['fireworks', 'accounts/fireworks/models/glm-5p2', ['GLM 5.2', 'GLM 5.3']],
    ['stepfun', 'step-2x-large', ['Step 2x Large']],
  ]) {
    let modal
    const wx = { showModal: value => { modal = value } }
    const loaded = loadComponent('components/model-picker/model-picker.js', {}, { wx })
    const picker = loaded.instance
    picker.getRegistry = () => registry
    Object.assign(picker.properties, { selectedProvider:provider, selectedModel:modelId, role:'main', outputFormat:'svg' })
    const before = structuredClone(picker.properties)
    picker.resetFlow()
    const noticeNames = row => [row.displayName, ...(row.replacementApiId ? [row.replacementDisplayName] : [])]
    assert.deepEqual(noticeNames(picker.data.removed), names)
    picker.confirmReplacement()
    if (names.length === 2) { assert.ok(modal); modal.success({ confirm:false }) }
    else assert.equal(modal, undefined)
    assert.deepEqual(picker.properties, before)
    if (names.length === 2) {
      picker.confirmReplacement()
      picker.properties.selectedProvider = 'bailian'
      modal.success({ confirm:true })
      assert.equal(loaded.events.length, 0, 'a late modal must still recheck the current channel')
    }
    const sheet = loadComponent('components/generation-settings-sheet/generation-settings-sheet.js', {}, { wx }).instance
    sheet.getRegistry = () => registry
    const routes = Object.fromEntries(['main','image','vision'].map(role => [role, { accessProvider:'', modelId:'' }]))
    routes.main = { accessProvider:provider, modelId }
    Object.assign(sheet.properties, { settings: { configurationMode:'advanced', simpleProvider:provider, modelRoutes:routes, outputFormat:'svg', imageSize:'2K', aspectRatio:'1:1', providerRegions:{} }, purpose:'create', executionRoles:[], apiKeys:{}, manualReferenceIds:[] })
    sheet.resetDraft()
    assert.deepEqual(noticeNames(sheet.data.routeRows.find(row => row.role === 'main').removed), names)
    assert.deepEqual(structuredClone(sheet.data.draft.modelRoutes.main), routes.main)
  }
})

test('R15 mini template and mobile CSS isolate names and put both 改选 actions on a left-aligned new line', () => {
  const template = read('templates/model-unavailable.wxml')
  for (const field of ['displayName','replacementDisplayName']) {
    assert.ok(template.includes(`<text class="model-name-nowrap">{{removed.${field}}}</text>`))
  }
  assert.match(template, /wx:if="\{\{removed\.replacementApiId\}\}"/)
  for (const [name, prefix, handler] of [['model-picker','','confirmReplacement'], ['generation-settings-sheet','item.','replaceRemoved']]) {
    const markup = read(`components/${name}/${name}.wxml`)
    assert.match(markup, /<import src="\.\.\/\.\.\/templates\/model-unavailable\.wxml"\/>/)
    assert.ok(markup.includes(`class="${prefix ? 'privacy-note' : 'model-note'} model-unavailable-notice"><template is="model-unavailable" data="{{removed:${prefix}removed}}"/><button`))
    assert.ok(markup.includes(`bindtap="${handler}">改选</button>`))
  }
  const css = read('app.wxss')
  assert.match(css, /button::after\s*\{\s*border: 0;/)
  for (const component of ['model-picker','generation-settings-sheet']) assert.match(read(`components/${component}/${component}.ts`), /styleIsolation: 'apply-shared'/)
  assert.match(css, /\.model-name-nowrap\{[^}]*white-space:nowrap;[^}]*word-break:normal;[^}]*overflow-wrap:normal/)
  assert.match(css, /@media\(max-width:480px\)\{\.model-unavailable-notice\{flex-direction:column;align-items:flex-start;gap:8px\}\.model-unavailable-notice>button\{align-self:flex-start\}\}/)
  assert.match(css, /\.model-unavailable-notice>button\{width:auto;margin:0;flex:none\}/)
})

test('R15 every mini wrapping label is the explicit deletion-confirmation checkbox exception', () => {
  const wrappers = []
  for (const file of fs.readdirSync(root, { recursive:true }).filter(file => file.endsWith('.wxml'))) {
    for (const match of read(file).matchAll(/<label\b[^>]*>[\s\S]*?<\/label>/g)) {
      if (/<(?:input|textarea|button|picker|switch|checkbox|radio)\b/.test(match[0])) wrappers.push({ file, markup:match[0] })
    }
  }
  assert.equal(wrappers.length, 1)
  assert.equal(wrappers[0].file, path.join('components','account-settings','account-settings.wxml'))
  assert.match(wrappers[0].markup, /^<label class="danger-confirm"><checkbox /)
  assert.match(wrappers[0].markup, /我理解删除不可撤销<\/label>$/)
  // Intentional: tapping the confirmation text toggles that same checkbox.
})

test('R15 remains size-neutral against the committed R14 source package', () => {
  const bytes = fs.readdirSync(root, { recursive:true, withFileTypes:true })
    .filter(entry => entry.isFile()).reduce((total, entry) => total + fs.statSync(path.join(entry.parentPath, entry.name)).size, 0)
  assert.ok(bytes <= 1569427, `R14 source 1569427 bytes; R15 source ${bytes} bytes`)
  // The original 1572864-byte budget and package-budget.test.cjs remain intact.
})
