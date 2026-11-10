import test, { afterEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import React from 'react'
import { render, screen, within, fireEvent, cleanup } from '@testing-library/react'
import { ModelSpecifications } from '../src/components/ModelSpecifications.jsx'
import { STATIC_MODEL_REGISTRY } from '../src/lib/staticModelCatalog.js'
import { modalityIconStates } from '../src/lib/modelModalityIcons.js'
import phase2 from '../../../config/channel-audit/model-modality-phase2-20261109.json' with { type: 'json' }
afterEach(cleanup)
const qwen = { provider: 'tokendance', model: { id: 'qwen3.6-plus' } }
const mixed = provenance => ({ id: 'test-states', specifications: { version: 1, modalityFacts: {
  inputModalities: { value: ['text'], state: 'known', provenance, unsupportedModalities: ['image'], suppressFallback: true, sourceUrl: 'https://example.com/spec', verifiedAt: '2026-11-09' },
} } })

test('R22C all three short labels have accessible names and solid glyphs in a fixed footprint', () => {
  const { container } = render(React.createElement(ModelSpecifications, { provider: 'custom', model: mixed('channel') }))
  const inputs = within(screen.getByRole('group', { name: '输入模态' }))
  for (const [name, state] of [['支持文本输入', 'supported'], ['此渠道不支持图像输入', 'unsupported'], ['官方资料未说明是否支持视频输入', 'unknown']]) {
    const icon = inputs.getByRole('img', { name })
    assert.equal(icon.dataset.state, state)
    assert.ok(icon.classList.contains('is-' + state))
    assert.equal(icon.querySelector('svg').getAttribute('width'), '20')
    assert.equal(icon.querySelector('svg').getAttribute('height'), '20')
    assert.equal(icon.querySelectorAll('.model-modality-strike, .model-modality-question, sup').length, 0)
  }
  assert.match(inputs.getByRole('img', {name:/^官方资料未说明是否支持视频输入$/}).title, /^官方资料未说明是否支持视频输入$/)
  assert.equal(container.querySelectorAll('dt').length, 4, 'no legend or extra specification row')
  const css = fs.readFileSync(new URL('../src/components/ModelSpecifications.css', import.meta.url), 'utf8')
  assert.match(css, /\.model-modality-icon \{[^}]*width: 20px; height: 20px; flex: 0 0 20px/)
  assert.doesNotMatch(css, /stroke-dasharray|modality-strike|modality-question|\bsup\b/)
  assert.doesNotMatch(css, /is-conditional[^}]*color: var\(--muted\)/)
  const compact = fs.readFileSync(new URL('../src/workspace/workspaceModels.css', import.meta.url), 'utf8')
  assert.match(compact, /\.tw-catalog-card \.model-modality-icon \{ width:18px; height:18px; flex-basis:18px; \}/)
})

test('R22C all 74 TokenDance cards retain channel exclusion evidence and Qwen shows the captured channel quote', () => {
  for (const model of STATIC_MODEL_REGISTRY.tokendance.models) {
    const { container } = render(React.createElement(ModelSpecifications, { provider: 'tokendance', model }))
    assert.doesNotMatch(container.innerHTML, /原厂资料标明不支持/, model.id)
    for (const icon of container.querySelectorAll('[data-state="unsupported"]')) assert.match(icon.getAttribute('aria-label'), /^此渠道不支持/)
    if (model.id === qwen.model.id) {
      const inputs = within(screen.getByRole('group', { name: '输入模态' }))
      for (const icon of inputs.getAllByRole('img')) assert.equal(icon.title, icon.getAttribute('aria-label'))
    }
    cleanup()
  }
})

test('R22C vendor exclusions retain their attribution; vendor silence stays unknown and quotes retain original Bailian order', () => {
  render(React.createElement(ModelSpecifications, {provider:'custom', model:mixed('vendor')}))
  const inputs = within(screen.getByRole('group', {name:'输入模态'}))
  assert.equal(inputs.getByRole('img', {name:'该模型不支持图像输入'}).dataset.state, 'unsupported')
  assert.match(inputs.getByRole('img', {name:'支持文本输入'}).title, /^支持文本输入$/)
  assert.equal(inputs.getByRole('img', {name:/^官方资料未说明是否支持视频输入$/}).title, '官方资料未说明是否支持视频输入')
  for (const [key, row] of Object.entries(phase2.tables)) {
    cleanup()
    render(React.createElement(ModelSpecifications, {provider:'bailian',model:{id:key.slice(key.indexOf('/') + 1)}}))
    for (const icon of within(screen.getByRole('group',{name:'输入模态'})).getAllByRole('img')) assert.equal(icon.title, icon.getAttribute('aria-label'), key)
  }
})

test('R22C desktop 1280, mobile 390 and compact cards expose evidence through the existing dialog, including no-source cards', t => {
  const widthBefore = window.innerWidth
  t.after(() => { window.innerWidth = widthBefore })
  for (const width of [1280, 390]) for (const compactSources of [false, true]) {
    window.innerWidth = width
    render(React.createElement(ModelSpecifications, {...qwen, compactSources}))
    fireEvent.click(screen.getByRole('button',{name:/^输入模态 · 官方文档规格/}))
    assert.match(screen.getByRole('dialog').textContent, /支持文本输入\n/)
    assert.equal(screen.getByRole('dialog').textContent.match(/核实日期：2026-11-09/g).length, 1)
    assert.match(screen.getByRole('dialog').textContent, /此渠道不支持图像输入/)
    assert.match(screen.getByRole('dialog').textContent, /此渠道不支持视频输入/)
    cleanup()
  }
  render(React.createElement(ModelSpecifications, {provider:'custom',model:{id:'no-evidence'},compactSources:true}))
  fireEvent.click(screen.getByRole('button',{name:/^输入模态 · 官方文档规格/}))
  assert.match(screen.getByRole('dialog').textContent, /暂无官方资料/)
  assert.equal(screen.queryByRole('link'), null)
})

test('R22C legacy conditional/omitted states stay qualified and the helper does not mutate facts', () => {
  const fact = mixed('channel').specifications.modalityFacts.inputModalities, before = structuredClone(fact)
  modalityIconStates('文本', fact)
  assert.deepEqual(fact, before)
  assert.equal(modalityIconStates('文本、音频（有限支持）')[3].state, 'conditional')
  assert.equal(modalityIconStates('文本')[1].state, 'unlisted')
})
