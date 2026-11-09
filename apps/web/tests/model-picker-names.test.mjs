import test, { afterEach } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import ModelPicker from '../src/components/ModelPicker.jsx'
import { STATIC_MODEL_REGISTRY } from '../src/lib/staticModelCatalog.js'
import { modelCardName } from '../src/lib/modelCardSpecifications.js'
import baseline from './fixtures/model-picker-names-8c456709.json' with { type: 'json' }

afterEach(cleanup)

test('R21 static picker titles preserve all 1,064 display names from 8c456709', t => {
  t.mock.method(Date, 'now', () => Date.parse('2026-11-09T12:00:00Z'))
  assert.deepEqual(Object.keys(STATIC_MODEL_REGISTRY), Object.keys(baseline.names))
  const container = document.createElement('div')
  let count = 0
  for (const [provider, channel] of Object.entries(STATIC_MODEL_REGISTRY)) {
    assert.deepEqual(channel.models.map(model => model.id), Object.keys(baseline.names[provider]), provider)
    for (const model of channel.models) {
      container.innerHTML = renderToStaticMarkup(React.createElement(ModelPicker, {
        label: '主模型', provider, role: model.roles[0] || 'main', value: model.id,
        models: [model], onChange() {},
      }))
      assert.equal(container.querySelector('.model-picker-trigger strong').textContent,
        baseline.names[provider][model.id], `${provider}/${model.id}`)
      count++
    }
  }
  assert.equal(count, 1064)
})

test('R21 picker options preserve static names and submit exact IDs across DeepSeek, Bailian and TokenDance', t => {
  t.mock.method(Date, 'now', () => Date.parse('2026-11-09T12:00:00Z'))
  for (const [provider, id] of [
    ['deepseek', 'deepseek-flash'],
    ['bailian', 'MiniMax/MiniMax-M3.1-Flash'],
    ['tokendance', 'deepseek-v4.1-flash-1017'],
  ]) {
    const model = STATIC_MODEL_REGISTRY[provider].models.find(row => row.id === id)
    assert.ok(model, `${provider}/${id}`)
    const choices = []
    render(React.createElement(ModelPicker, {
      label: '主模型', provider, role: 'main', value: id, models: [model],
      onChange: value => choices.push(value),
    }))
    fireEvent.click(screen.getByRole('button', { name: '主模型', exact: true }))
    const name = baseline.names[provider][id]
    const option = screen.getByRole('button', { name: `选择 ${name}`, exact: true })
    assert.equal(option.querySelector('strong').title, name)
    fireEvent.click(option)
    assert.deepEqual(choices, [id])
    cleanup()
  }
})

test('R21 explicit live alias names retain precedence while saved labels do not inherit fact-only enrichment', () => {
  const model = {
    id: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro',
    specificModelSpecifications: { resolvedModel: {
      modelId: 'deepseek-v4-pro-0813', displayName: 'DeepSeek-V4-Pro-0813',
      sourceUrls: ['https://api-docs.deepseek.com/quick_start/pricing'],
    } },
  }
  assert.equal(modelCardName('deepseek', model), 'DeepSeek-V4-Pro-0813')
  assert.equal(model.id, 'deepseek-v4-pro')
  assert.equal(modelCardName('deepseek', { id: 'deepseek-flash', label: 'DeepSeek-V4.1-Flash' }), 'DeepSeek-V4.1-Flash')
  assert.equal(modelCardName('deepseek', { id: 'deepseek-v4-pro' }), 'DeepSeek V4 Pro')
})
