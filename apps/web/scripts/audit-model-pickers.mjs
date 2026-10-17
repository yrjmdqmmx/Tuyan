// Run with node --import tsx --import ./tests/dom-setup.mjs scripts/audit-model-pickers.mjs registry.json report.json
// Uses a public registry snapshot; no credentials, network requests or model calls.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import React from 'react'
import { cleanup, fireEvent, render } from '@testing-library/react'
import ModelPicker from '../src/components/ModelPicker.jsx'
import { MODEL_CHANNEL_LABELS, presentRegistryModel } from '../src/lib/modelPresentation.js'
import { modelCardName } from '../src/lib/modelCardSpecifications.js'

const [input, output] = process.argv.slice(2)
if (!input || !output) throw new Error('Provide registry.json and report.json paths')
const raw = JSON.parse(fs.readFileSync(input, 'utf8'))
const registry = raw.registry || raw
const report = { version: registry.registryVersion, scope: 'Combined regional public/server catalog; no account entitlement or inference verification', checkedAt: new Date().toISOString(), channels: [], selections: 0 }
const buttons = selector => [...document.querySelectorAll(selector)]
const cardIds = () => buttons('.model-option').map(el => el.dataset.modelId)
const sorted = ids => [...ids].sort()
const click = element => { assert.ok(element, 'Control must exist'); fireEvent.click(element) }
const open = () => click(document.querySelector('.model-picker-trigger'))
const close = () => click(document.querySelector('[aria-label="关闭模型选择"]'))
const chooseChannel = id => click(buttons('.model-provider-rail button').find(el => el.getAttribute('aria-label') === (MODEL_CHANNEL_LABELS[id] || id)))
const exhaustPages = () => { while (document.querySelector('.model-picker-more')) click(document.querySelector('.model-picker-more')) }

// Eligibility oracle is intentionally independent of the picker partition helper.
function eligible(model, role, operation, outputFormat) {
  if (!model.roles?.includes(role) || model.selectable === false) return false
  if (model.expirationDate && !model.expirationDate.startsWith('2098') && Date.now() >= Date.parse(model.expirationAt || `${model.expirationDate}T00:00:00Z`)) return false
  if (role === 'image') {
    const formats = model.capabilities?.outputFormats
    if (formats?.length && !formats.includes(outputFormat)) return false
    if (operation === 'generation' && (model.capabilities?.requiresSourceImage === true || model.capabilities?.imageGeneration === false)) return false
    if (operation === 'editing' && Array.isArray(model.capabilities?.refineResolutions) && model.capabilities.refineResolutions.length === 0) return false
  }
  return true
}

for (const [role, operation, outputFormat] of [['main', 'generation', 'png'], ['image', 'generation', 'png'], ['vision', 'generation', 'png'], ['image', 'editing', 'png'], ['image', 'generation', 'svg']]) {
  let actualRoute
  const view = render(React.createElement(ModelPicker, { label: '核查模型', role, operation, outputFormat, registry, allowCustom: true,
    route: { accessProvider: 'custom', modelId: '' }, onRouteChange: route => { actualRoute = route } }))
  open()
  const expectedProviders = Object.entries(registry.providers).filter(([, p]) => p.models.some(m => eligible(m, role, operation, outputFormat))).map(([id]) => id)
  const expectedLabels = ['通用 API', ...expectedProviders.map(id => MODEL_CHANNEL_LABELS[id] || id)]
  assert.deepEqual(sorted(buttons('.model-provider-rail button').map(el => el.getAttribute('aria-label'))), sorted(expectedLabels), `${role}/${operation}/${outputFormat}: channel coverage`)

  for (const [provider, entry] of Object.entries(registry.providers)) {
    const expected = entry.models.filter(m => eligible(m, role, operation, outputFormat))
    const row = { provider, role, operation, outputFormat, models: expected.length, ids: expected.map(m => m.id), selected: 0, paginatedVendors: 0 }
    report.channels.push(row)
    if (!expected.length) continue
    chooseChannel(provider)
    const vendors = buttons('.model-vendor-rail button').map(el => el.getAttribute('aria-label'))
    const found = []
    for (const vendor of vendors) {
      click(buttons('.model-vendor-rail button').find(el => el.getAttribute('aria-label') === vendor))
      if (document.querySelector('.model-picker-more')) row.paginatedVendors++
      exhaustPages()
      found.push(...cardIds())
      assert.ok(buttons('.model-option-select').every(el => !el.disabled))
    }
    assert.deepEqual(sorted(found), sorted(row.ids), `${provider}/${role}/${operation}/${outputFormat}: every model appears exactly once`)
    close()
    // Exercise every model, including aliases with identical labels and models beyond page 1.
    for (const model of expected) {
      open()
      chooseChannel(provider)
      fireEvent.change(document.querySelector('input[type="search"]'), { target: { value: model.id } })
      let target
      for (const vendor of buttons('.model-vendor-rail button').map(el => el.getAttribute('aria-label'))) {
        click(buttons('.model-vendor-rail button').find(el => el.getAttribute('aria-label') === vendor))
        exhaustPages()
        target = buttons('.model-option').find(el => el.dataset.modelId === model.id)
        if (target) break
      }
      assert.ok(target, `${provider}/${model.id}: searchable and selectable`)
      const presented = presentRegistryModel(provider, model)
      assert.equal(target.querySelector('strong').textContent, modelCardName(provider, presented), 'Correct label is attached to the exact model ID')
      actualRoute = undefined
      click(row.selected % 2 ? target.querySelector('.model-option-select') : target.querySelector('dl') || target)
      assert.deepEqual(actualRoute, { accessProvider: provider, modelId: model.id }, 'Selection writes the exact channel/model ID')
      assert.equal(document.querySelector('.model-route-drawer'), null, 'Selection closes the picker')
      row.selected++; report.selections++
    }
    open()
    fs.writeFileSync(output, JSON.stringify(report, null, 2))
    console.log(`${role}/${operation}/${outputFormat} ${provider}: ${row.selected}/${row.models}`)
  }
  view.unmount(); cleanup()
}
fs.writeFileSync(output, JSON.stringify(report, null, 2))
console.log(`PASS: ${report.selections} exact route selections; ${report.channels.length} channel/role/operation/format cases`)
