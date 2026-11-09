import test, { afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import { loadCard, archivedAuditText } from '../../../scripts/lib/model-card-audit.mjs'
import React from 'react'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { STATIC_MODEL_REGISTRY } from '../src/lib/staticModelCatalog.js'
import { modelCardSpecifications } from '../src/lib/modelCardSpecifications.js'
import { ModelSpecifications } from '../src/components/ModelSpecifications.jsx'
import { mergeCardFacts } from '../src/lib/catalogCardFacts.js'
import { modalityIconStates } from '../src/lib/modelModalityIcons.js'
import channelSnapshot from '../../../config/channel-audit/tokendance-catalog-snapshot-20261109b.json' with { type: 'json' }
import baseline from './fixtures/model-modalities-main-c7b6a2fc.json' with { type: 'json' }
import schemaExpectations from './fixtures/r22-exact-schema-expectations.json' with { type: 'json' }
import phase2 from '../../../config/channel-audit/model-modality-phase2-20261109.json' with { type: 'json' }

const require = createRequire(import.meta.url)
const mini = require('../../miniprogram/miniprogram/utils/model-audit.js')
const rows = Object.entries(STATIC_MODEL_REGISTRY).flatMap(([provider, entry]) => entry.models.map(model => ({ provider, model })))
afterEach(cleanup)
const root = fileURLToPath(new URL('../../../', import.meta.url))
const beforeCard = await loadCard(root, 'd1fe6ff6')

test('the pre-phase-2 static baseline still retains every previously supported modality', () => {
  const source = archivedAuditText(root, 'd1fe6ff6', 'apps/web/src/lib/staticModelCatalog.js').replace(/export const /g, 'const ')
  const registry = vm.runInNewContext(source + ';STATIC_MODEL_REGISTRY')
  let count = 0
  for (const [provider, entry] of Object.entries(registry)) for (const model of entry.models) {
    count++
    if (provider === 'tokendance') continue // all 74 are separately asserted against the phase-1 channel snapshot below
    const card = beforeCard(provider, model), caps = model.capabilities || {}
    if (model.roles.some(role => ['vision','edit','source-image','reference-image'].includes(role)) || caps.referenceImages || caps.requiresSourceImage || caps.imageEditing || caps.imageEditMode === 'direct-edit')
      assert.ok(card.fields.inputModalities.value?.includes('image'), provider+'/'+model.id)
    for (const field of ['inputModalities','outputModalities']) for (const value of baseline.modalities[provider+'/'+model.id]?.[field] || [])
      assert.ok(card.fields[field].value?.includes(value), provider+'/'+model.id+'/'+value)
  }
  assert.equal(count,1064)
})

test('every static card retains main supported modalities and all product image-input requirements', () => {
  assert.equal(baseline.commit, 'c7b6a2fc')
  assert.equal(rows.length, 1064)
  for (const { provider, model } of rows) {
    const key = provider + '/' + model.id, before = structuredClone(model)
    const card = modelCardSpecifications(provider, model), caps = model.capabilities || {}
    const needsImage = model.roles.some(role => ['vision', 'edit', 'source-image', 'reference-image'].includes(role))
      || caps.referenceImages || caps.requiresSourceImage || caps.imageEditing || caps.imageEditMode === 'direct-edit'
      || model.operations?.some(op => op.requiresSourceImage || op.requiresImageInput)
    if (provider === 'tokendance') {
      const architecture = channelSnapshot.portal[model.id]?.architecture
      for (const [field, wire] of [['inputModalities', 'input_modalities'], ['outputModalities', 'output_modalities']]) {
        assert.deepEqual(card.fields[field].value, architecture?.[wire] || null, key + '/' + field)
        assert.equal(card.fields[field].state, architecture ? 'known' : 'unknown', key + '/' + field)
      }
      assert.deepEqual(model, before, key + ' display must not mutate execution data')
      continue
    }
    const reviewedState = (field, modality) => phase2.tables[key]
      ? phase2.tables[key][field].includes(modality) ? 'supported' : 'unsupported'
      : phase2.reviews[key]?.[field]?.decisions[modality]
    const checkSupport = (field, modality) => {
      const state = reviewedState(field, modality), fact = card.fields[field]
      const exact = schemaExpectations.find(row => row.key === key && row.field === field && row.modality === modality)
      if (state) assert.equal(fact.value?.includes(modality) || false, state === 'supported', key + '/' + field + '/' + modality)
      else if (exact) {
        assert.deepEqual(fact.value, exact.expected, key + '/exact-schema')
        assert.equal(fact.sourceUrl, exact.sourceUrl)
        assert.equal(fact.verifiedAt, exact.checkedAt)
        assert.ok(!fact.unsupportedModalities?.includes(modality), 'schema omission remains unknown')
      } else assert.ok(fact.value?.includes(modality), key + '/' + field + ' lost main ' + modality)
      if (state) assert.equal(fact.unsupportedModalities?.includes(modality) || false, state === 'unsupported', key + '/reviewed-' + modality)
    }
    if (needsImage) checkSupport('inputModalities', 'image')
    for (const field of ['inputModalities', 'outputModalities']) {
      for (const modality of baseline.modalities[key]?.[field] || []) {
        checkSupport(field, modality)
      }
    }
    assert.deepEqual(model, before, key + ' display must not mutate execution data')
  }
})

test('Mini runtime projection agrees with Web for all four fields across the whole catalog', () => {
  for (const { provider, model } of rows) {
    const web = modelCardSpecifications(provider, model).fields
    const small = mini.auditedModelSpecs(provider, model.id).fields
    for (const field of Object.keys(web)) {
      assert.deepEqual(small[field].value, web[field].value, provider + '/' + model.id + '/' + field)
      assert.equal(small[field].state, web[field].state, provider + '/' + model.id + '/' + field)
      assert.equal(small[field].provenance, web[field].provenance, provider + '/' + model.id + '/' + field)
      // R12B omits evidence URLs the picker never renders. Its retained field
      // reference must still be exact; the visible card source is tested below.
      assert.equal(small[field].sourceUrl, web[field].sourceUrl === mini.auditedModelSpecs(provider, model.id).sourceUrl ? web[field].sourceUrl : null, provider + '/' + model.id + '/' + field + '/source')
    }
    assert.equal(mini.auditedModelSpecs(provider, model.id).sourceUrl, modelCardSpecifications(provider, model).sources[0] || null, provider + '/' + model.id + '/visible-source')
  }
})

test('partial lists are unions, omissions stay unknown, and a source-image operation establishes only product input', () => {
  const unknown = { value: null, state: 'unknown', provenance: null }
  const prior = { value: ['text', 'video'], state: 'known', provenance: 'catalog', sourceUrls: [] }
  const audit = { fields: { inputModalities: { ...prior, value: ['text'], provenance: 'channel' }, outputModalities: unknown, totalContextTokens: unknown, maxOutputTokens: unknown } }
  const result = mergeCardFacts(audit, { inputModalities: prior }, { operations: [{ requiresImageInput: true }] })
  assert.deepEqual(result.fields.inputModalities.value, ['text', 'video', 'image'])
  assert.equal(result.fields.inputModalities.provenance, 'product')
  assert.deepEqual(modalityIconStates('', result.fields.inputModalities).map(x => x.state), ['supported', 'supported', 'supported', 'unknown'])
  assert.equal(result.fields.totalContextTokens.state, 'unknown')
  const qualified = { ...prior, displayValue: '文本、视频（需指定采样参数）' }
  assert.equal(mergeCardFacts(audit, { inputModalities: qualified }).fields.inputModalities.displayValue, qualified.displayValue)
})

test('official numbers keep their precision with uppercase units and exact accessible details', t => {
  for (const { provider, model } of rows) {
    const card = modelCardSpecifications(provider, model)
    for (const [field, display] of [['totalContextTokens', 'context'], ['maxOutputTokens', 'maxOutput']]) {
      const fact = card.fields[field]
      if (fact.state === 'known' && typeof fact.value === 'string') {
        assert.equal(card[display], `${fact.value.replace(/[km]$/i, unit => unit.toUpperCase())} tokens${fact.suffix || ''}`, provider + '/' + model.id + '/' + field)
        assert.doesNotMatch(card[display], /≈/)
      }
    }
  }
  const model = STATIC_MODEL_REGISTRY.deepseek.models.find(m => m.id === 'deepseek-flash')
  const view = render(React.createElement(ModelSpecifications, { provider: 'deepseek', model }))
  assert.equal(screen.getByText('384K tokens').title, '384K tokens')
  assert.equal(screen.queryByText(/393K/), null)
  const original = window.matchMedia
  window.matchMedia = () => ({ matches: true })
  t.after(() => { window.matchMedia = original })
  fireEvent.click(screen.getByRole('link'))
  assert.match(screen.getByRole('dialog').textContent, /384K/)
  view.unmount()
  render(React.createElement(ModelSpecifications, { provider: 'tokendance', model: { id: 'deepseek-v4-pro' } }))
  assert.equal(screen.getByText('≈ 1M tokens').title, '1,048,576 tokens')
})

test('image-role cards expose known token limits and only pure image models without token facts say not applicable', () => {
  let showing = 0, notApplicable = 0
  for (const { provider, model } of rows.filter(row => row.model.roles.includes('image'))) {
    const card = modelCardSpecifications(provider, model)
    for (const [field, label] of [['totalContextTokens', 'context'], ['maxOutputTokens', 'maxOutput']]) {
      if (card.fields[field].state === 'known') assert.match(card[label], / tokens$/, provider + '/' + model.id)
    }
    if (card.fields.totalContextTokens.state === 'known' || card.fields.maxOutputTokens.state === 'known') showing++
    else if (card.context === '不适用' && card.maxOutput === '不适用') notApplicable++
  }
  assert.ok(showing >= 24)
  assert.ok(notApplicable > 0)
  const gemini = modelCardSpecifications('gemini', STATIC_MODEL_REGISTRY.gemini.models.find(m => m.id === 'gemini-nano-banana-2.1'))
  assert.equal(gemini.context, '未知', 'an input limit is not a total context window')
  assert.match(gemini.maxOutput, / tokens$/)
})
