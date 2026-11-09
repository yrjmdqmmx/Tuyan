import test, { afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import React from 'react'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { STATIC_MODEL_REGISTRY } from '../src/lib/staticModelCatalog.js'
import { modelCardSpecifications } from '../src/lib/modelCardSpecifications.js'
import { ModelSpecifications } from '../src/components/ModelSpecifications.jsx'
import { mergeCardFacts } from '../src/lib/catalogCardFacts.js'
import { modalityIconStates } from '../src/lib/modelModalityIcons.js'
import baseline from './fixtures/model-modalities-main-c7b6a2fc.json' with { type: 'json' }

const require = createRequire(import.meta.url)
const mini = require('../../miniprogram/miniprogram/utils/model-audit.js')
const rows = Object.entries(STATIC_MODEL_REGISTRY).flatMap(([provider, entry]) => entry.models.map(model => ({ provider, model })))
afterEach(cleanup)

test('every static card retains main supported modalities and all product image-input requirements', () => {
  assert.equal(baseline.commit, 'c7b6a2fc')
  assert.equal(rows.length, 1064)
  for (const { provider, model } of rows) {
    const key = provider + '/' + model.id, before = structuredClone(model)
    const card = modelCardSpecifications(provider, model), caps = model.capabilities || {}
    const needsImage = model.roles.some(role => ['vision', 'edit', 'source-image', 'reference-image'].includes(role))
      || caps.referenceImages || caps.requiresSourceImage || caps.imageEditing || caps.imageEditMode === 'direct-edit'
      || model.operations?.some(op => op.requiresSourceImage || op.requiresImageInput)
    if (needsImage) assert.ok(card.fields.inputModalities.value?.includes('image'), key + ' requires image input')
    for (const field of ['inputModalities', 'outputModalities']) {
      for (const modality of baseline.modalities[key]?.[field] || []) {
        assert.ok(card.fields[field].value?.includes(modality), key + '/' + field + ' lost main ' + modality)
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
      assert.equal(small[field].sourceUrl, web[field].sourceUrl, provider + '/' + model.id + '/' + field + '/source')
    }
  }
})

test('partial lists are unions, omissions stay unknown, and a source-image operation establishes only product input', () => {
  const unknown = { value: null, state: 'unknown', provenance: null }
  const prior = { value: ['text', 'video'], state: 'known', provenance: 'catalog', sourceUrls: [] }
  const audit = { fields: { inputModalities: { ...prior, value: ['text'], provenance: 'channel' }, outputModalities: unknown, totalContextTokens: unknown, maxOutputTokens: unknown } }
  const result = mergeCardFacts(audit, { inputModalities: prior }, { operations: [{ requiresImageInput: true }] })
  assert.deepEqual(result.fields.inputModalities.value, ['text', 'video', 'image'])
  assert.equal(result.fields.inputModalities.provenance, 'product')
  assert.deepEqual(modalityIconStates('', result.fields.inputModalities).map(x => x.state), ['supported', 'supported', 'unknown', 'supported'])
  assert.equal(result.fields.totalContextTokens.state, 'unknown')
  const qualified = { ...prior, displayValue: '文本、视频（需指定采样参数）' }
  assert.equal(mergeCardFacts(audit, { inputModalities: qualified }).fields.inputModalities.displayValue, qualified.displayValue)
})

test('official labels render verbatim while published integers retain an exact accessible detail', t => {
  for (const { provider, model } of rows) {
    const card = modelCardSpecifications(provider, model)
    for (const [field, display] of [['totalContextTokens', 'context'], ['maxOutputTokens', 'maxOutput']]) {
      const fact = card.fields[field]
      if (fact.state === 'known' && typeof fact.value === 'string') {
        assert.equal(card[display], `${fact.value} tokens${fact.suffix || ''}`, provider + '/' + model.id + '/' + field)
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
