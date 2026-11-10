import test, { afterEach, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import React from 'react'
import { render, screen, within, fireEvent, cleanup } from '@testing-library/react'
import names from './fixtures/removed-model-names-main-c7b6a2fc.json' with { type: 'json' }
import nameOverrides from './fixtures/removed-model-name-overrides-r9.json' with { type: 'json' }
import { STATIC_MODEL_REGISTRY } from '../src/lib/staticModelCatalog.js'
import { MODEL_AUDIT_DATA, assertAuditedModelAvailable } from '../src/lib/modelAudit.js'
import { modelCardSpecifications } from '../src/lib/modelCardSpecifications.js'
import { ModelSpecifications } from '../src/components/ModelSpecifications.jsx'
import WorkspaceModelCatalog from '../src/workspace/WorkspaceModelCatalog.jsx'
import WorkspaceModelPicker from '../src/workspace/WorkspaceModelPicker.jsx'

beforeEach(t => t.mock.method(Date, 'now', () => Date.parse('2026-11-09')))
afterEach(cleanup)
const fixture = (provider, id) => ({ registry: { providers: STATIC_MODEL_REGISTRY }, ready: true, busy: false, registryStatus: 'ready',
  library: { connections: [{ id: 'c', provider, label: '连接', hasCredential: true }], models: [{ id: 'old', connectionId: 'c', modelId: id }] },
  save: () => assert.fail('Viewing/cancelling must not save') })
function noRawIds(text, id, row) {
  for (const [apiId, display] of [[id, row.displayName], [row.replacementApiId, row.replacementDisplayName]]) {
    if (apiId && apiId !== display) assert.ok(!text.includes(apiId), `Raw ID ${apiId} in ${text}`)
  }
}

test('R8 every removed identity renders its verbatim main label except the documented R9 override', () => {
  assert.equal(names.commit, 'c7b6a2fc')
  assert.equal(Object.keys(names.models).length, 68)
  assert.deepEqual(Object.keys(MODEL_AUDIT_DATA.removed), Object.keys(names.models))
  let confirmations = 0
  for (const [key, original] of Object.entries(names.models)) {
    const row = { ...original, ...nameOverrides[key] }
    const slash = key.indexOf('/'), provider = key.slice(0, slash), id = key.slice(slash + 1)
    assert.equal(MODEL_AUDIT_DATA.removed[key].displayName, row.displayName, key)
    const expected = `${row.displayName}：原型号已不可用，请重新选择。${row.replacementApiId ? `推荐：${row.replacementDisplayName}` : ''}`
    const models = fixture(provider, id), before = structuredClone(models.library)
    const view = render(React.createElement(WorkspaceModelCatalog, { models, mode: 'library' }))
    const notice = screen.getByRole('status')
    assert.equal(notice.firstChild.textContent, expected, key)
    noRawIds(notice.outerHTML, id, row)
    if (row.replacementApiId) {
      fireEvent.click(within(notice).getByRole('button', { name: '改选' }))
      const dialog = screen.getByRole('dialog', { name: '确认切换模型' })
      assert.ok(dialog.textContent.includes(`${row.displayName} → ${row.replacementDisplayName}`), key)
      noRawIds(dialog.outerHTML, id, row)
      fireEvent.click(within(dialog).getByRole('button', { name: '取消' }))
      confirmations++
    } else assert.equal(within(notice).queryByRole('button', { name: '改选' }), null)
    assert.deepEqual(models.library, before)
    assert.throws(() => assertAuditedModelAvailable(provider, id), error => {
      assert.equal(error.message, `模型 ${expected}`)
      noRawIds(error.message, id, row)
      assert.equal(error.code, 'MODEL_UNAVAILABLE'); assert.equal(error.businessCode, 'MODEL_UNAVAILABLE')
      assert.equal(error.statusCode, 400); assert.equal(error.replacement, row.replacementApiId)
      assert.equal(error.sourceUrl, MODEL_AUDIT_DATA.removed[key].sourceUrl)
      return true
    })
    view.unmount()
  }
  assert.equal(confirmations, Object.values(names.models).filter(row => row.replacementApiId).length)
})

test('R8 every rendered catalog card has uppercase token units while stored labels remain untouched', () => {
  let count = 0, lowercaseSources = 0
  for (const [provider, channel] of Object.entries(STATIC_MODEL_REGISTRY)) for (const model of channel.models) {
    const specs = modelCardSpecifications(provider, model)
    const view = render(React.createElement(ModelSpecifications, { provider, model }))
    for (const [field, label] of [['totalContextTokens', '上下文窗口'], ['maxOutputTokens', '最大输出']]) {
      const cell = within(view.container).getByText(label).parentElement.querySelector('dd')
      assert.doesNotMatch(cell.textContent, /\d(?:\.\d+)?[km]\b/, provider + '/' + model.id)
      const value = specs.fields[field].value
      if (typeof value === 'string' && /[km]$/.test(value)) {
        lowercaseSources++
        assert.ok(cell.textContent.includes(value.slice(0, -1) + value.at(-1).toUpperCase()))
        assert.equal(cell.title, `${value} tokens`, 'provenance retains the official label')
      }
    }
    view.unmount(); count++
  }
  assert.equal(count, 1064); assert.ok(lowercaseSources > 0)
})

test('R8 Bailian Kimi K3 keeps its exact evidence and R21 resolves SiliconFlow full registry specifications', () => {
  const card = modelCardSpecifications('bailian', STATIC_MODEL_REGISTRY.bailian.models.find(m => m.id === 'kimi-k3'))
  assert.deepEqual(card.fields.inputModalities.value, ['text', 'image'])
  assert.deepEqual(card.fields.outputModalities.value, ['text'])
  assert.equal(card.fields.totalContextTokens.value, 1048576)
  assert.equal(card.fields.maxOutputTokens.value, 1048576)
  for (const fact of Object.values(card.fields)) {
    assert.equal(fact.sourceUrl, 'https://help.aliyun.com/zh/model-studio/kimi-k3')
    assert.equal(fact.verifiedAt, '2026-11-09')
  }
  const silicon = modelCardSpecifications('siliconflow', STATIC_MODEL_REGISTRY.siliconflow.models.find(m => m.id === 'Qwen/Qwen3.8-27B'))
  assert.equal(silicon.fields.totalContextTokens.value, 262144); assert.equal(silicon.context, '≈ 262K tokens')
  assert.equal(silicon.fields.totalContextTokens.sourceUrl, 'https://huggingface.co/Qwen/Qwen3.8-27B')
  assert.equal(silicon.fields.totalContextTokens.verifiedAt, '2026-10-16')
  const native = modelCardSpecifications('kimi', STATIC_MODEL_REGISTRY.kimi.models.find(m => m.id === 'kimi-k3'))
  assert.equal(native.fields.totalContextTokens.value, 1000000, 'other channels remain unchanged')
})

test('R8 picker footer and catalog share button rules; reselect has one style, spacing and content height', () => {
  const style = document.createElement('style')
  style.textContent = ['../src/workspace/workspace.css', '../src/workspace/workspaceModels.css', '../src/components/modelUnavailable.css'].map(path => fs.readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n')
  document.head.append(style)
  try {
    const models = fixture('xiaomi', 'mimo-v2.5')
    const view = render(React.createElement(WorkspaceModelCatalog, { models, mode: 'library' }))
    const libraryButton = screen.getByRole('button', { name: '改选' }), libraryStyle = window.getComputedStyle(libraryButton)
    assert.ok(!libraryStyle.textDecoration.includes('underline'))
    const buttonStyle = Object.fromEntries(['fontSize', 'padding', 'border', 'borderRadius', 'backgroundColor', 'textDecoration'].map(key => [key, libraryStyle[key]]))
    view.unmount()
    render(React.createElement(WorkspaceModelPicker, { models, role: 'main', path: 'svg', current: { libraryModelId: 'old', connectionId: 'c', accessProvider: 'xiaomi', modelId: 'mimo-v2.5' } }))
    const configButton = screen.getByRole('button', { name: '改选' }), configStyle = window.getComputedStyle(configButton)
    for (const [key, value] of Object.entries(buttonStyle)) assert.equal(configStyle[key], value, key)
    assert.equal(configStyle.margin, '0px')
    assert.equal(window.getComputedStyle(configButton.parentElement).gap, '8px')
    fireEvent.click(configButton)
    const dialog = screen.getByRole('dialog')
    assert.equal(window.getComputedStyle(dialog).minHeight, '0px')
    assert.equal(window.getComputedStyle(dialog).height, 'auto')
    cleanup()
    const live = fixture('xiaomi', 'mimo-v2.6-flash')
    render(React.createElement(WorkspaceModelPicker, { models: live, role: 'main', path: 'svg', current: { libraryModelId: 'old', connectionId: 'c', accessProvider: 'xiaomi', modelId: 'mimo-v2.6-flash' } }))
    fireEvent.click(screen.getByRole('button', { name: '主模型' }))
    const select = screen.getByRole('dialog').querySelector('.tw-catalog-card-actions > button')
    assert.ok(select)
    const catalog = document.createElement('div')
    catalog.className = 'tw-shell tw-model-management'
    catalog.innerHTML = '<div class="tw-catalog-card"><div class="tw-catalog-card-actions"><button>选择</button></div></div>'
    document.body.append(catalog)
    const actual = window.getComputedStyle(select), expected = window.getComputedStyle(catalog.querySelector('button'))
    for (const key of ['fontSize', 'minHeight', 'border', 'borderRadius', 'backgroundColor', 'color', 'padding', 'display', 'alignItems', 'justifyContent', 'gap']) assert.equal(actual[key], expected[key], key)
    assert.equal(actual.backgroundColor, 'rgb(240, 244, 236)')
    catalog.remove()
  } finally { style.remove() }
})
