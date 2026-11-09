import test, { afterEach } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { render, screen, within, cleanup } from '@testing-library/react'
import { assertTokenDanceFacts, tokenDanceBefore } from '../../../test-support/tokendance-modality-assertions.mjs'
import { modelCardSpecifications } from '../src/lib/modelCardSpecifications.js'
import { catalogCardFacts, mergeCardFacts } from '../src/lib/catalogCardFacts.js'
import { isApiSource, modelCardSources } from '../src/lib/modelCardSources.js'
import { auditedModelSpecs } from '../src/lib/modelAudit.js'
import { STATIC_MODEL_REGISTRY } from '../src/lib/staticModelCatalog.js'
import { ModelSpecifications } from '../src/components/ModelSpecifications.jsx'
const model = id => STATIC_MODEL_REGISTRY.tokendance.models.find(m => m.id === id)
afterEach(cleanup)
test('R21 every TokenDance card uses channel architecture and preserves seven unknown histories', () => {
  assertTokenDanceFacts(id => modelCardSpecifications('tokendance', model(id)))
})
test('R21 channel declarations and silence defeat stale base unions and product floors', () => {
  const base = { value: ['text', 'image', 'audio', 'video', 'file'], state: 'known', provenance: 'catalog', sourceUrls: ['https://vendor.example/model'] }
  for (const id of ['qwen3.6-plus', 'deepseek-v4-flash-vision-exp']) {
    const audit = auditedModelSpecs('tokendance', id)
    const result = mergeCardFacts(audit, { inputModalities: base, outputModalities: base }, { roles: ['vision'], capabilities: { referenceImages: true } })
    for (const field of ['inputModalities', 'outputModalities']) assert.deepEqual(result.fields[field], { ...audit.fields[field], displayValue: undefined })
    const detailed = { officialInputModalities: base.value, sourceUrls: base.sourceUrls }
    const card = catalogCardFacts('tokendance', { id, specifications: { version: 1, modalityFacts: audit.fields }, specificModelSpecifications: detailed }, { models: [] })
    assert.deepEqual(card.inputModalities.value, audit.fields.inputModalities.value)
    const vendorAudit = { fields: { ...audit.fields, inputModalities: { ...base, provenance: 'vendor' } } }
    assert.deepEqual(mergeCardFacts(vendorAudit, card, { roles: ['vision'] }).fields.inputModalities.value, audit.fields.inputModalities.value)
  }
})
test('R21 renders promoted inputs, explicit unsupported Qwen inputs and hidden unknowns with model-page links', () => {
  for (const [id, labels] of [['qwen3.6-plus', ['图像：不支持', '视频：不支持']], ['kimi-k3.1-pro', ['图像：支持', '视频：支持']], ['minimax-m3.1-flash', ['图像：支持']], ['deepseek-v4.1-flash-1017', ['图像：支持']], ['deepseek-v4-flash-vision-exp', ['文本：未知', '图像：未知', '视频：未知']]]) {
    render(React.createElement(ModelSpecifications, { provider: 'tokendance', model: model(id) }))
    const group = within(screen.getByRole('group', { name: '输入模态' }))
    for (const label of labels) group.getByRole('img', { name: label })
    assert.equal(screen.getByRole('link').getAttribute('href'), 'https://tokendance.space/models/' + id)
    cleanup()
  }
})
test('R21 portal API URLs are audit evidence only, including redirects and encoded paths', () => {
  const api = 'https://tokendance.space/portal/api/models/qwen3.6-plus'
  for (const url of [api, api + '?format=html', api.replace('/portal/api/', '/portal/%61pi/')]) assert.equal(isApiSource(url), true)
  assert.equal(isApiSource('https://example.com/model', { 'https://example.com/model': { finalUrl: api } }), true)
  for (const { id } of tokenDanceBefore.rows) {
    const sources = modelCardSources({ channel: 'tokendance', model: { id }, audit: { sourceUrl: api }, fields: {} }).sources
    assert.deepEqual(sources, ['https://tokendance.space/models/' + id])
    assert.ok(sources.every(url => !isApiSource(url)))
  }
  assert.ok(!modelCardSources({ channel: 'custom', audit: { sourceUrl: api }, fields: {} }).sources.includes(api))
})
