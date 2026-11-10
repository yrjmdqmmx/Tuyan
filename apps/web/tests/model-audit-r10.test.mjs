import test, { afterEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import React from 'react'
import { render, screen, within, fireEvent, cleanup } from '@testing-library/react'
import liveModel from './fixtures/kimi-k3-live-registry-model.json' with { type: 'json' }
import { modelCardSpecifications } from '../src/lib/modelCardSpecifications.js'
import { mergeCardFacts } from '../src/lib/catalogCardFacts.js'
import { ModelSpecifications } from '../src/components/ModelSpecifications.jsx'
import { STATIC_MODEL_REGISTRY } from '../src/lib/staticModelCatalog.js'
import ModelReplacement from '../src/workspace/ModelReplacement.jsx'

afterEach(cleanup)
const source = 'https://help.aliyun.com/zh/model-studio/kimi-k3'

test('R10 full live registry keeps channel exclusions, visible source and date in ordinary and compact cards', () => {
  const before = structuredClone(liveModel)
  assert.ok(liveModel.specificModelSpecifications.officialInputModalities.includes('video'))
  for (const model of [{ id: 'kimi-k3' }, liveModel]) {
    const card = modelCardSpecifications('bailian', model)
    assert.equal(card.input, '文本、图像'); assert.equal(card.output, '文本')
    assert.deepEqual(card.inputFact.value, ['text', 'image'])
    assert.deepEqual(card.inputFact.unsupportedModalities, ['audio', 'video'])
    assert.deepEqual(card.outputFact.unsupportedModalities, ['image', 'audio', 'video'])
    assert.equal(card.inputScope, '渠道'); assert.equal(card.inputFact.sourceUrl, source)
    assert.equal(card.inputFact.verifiedAt, '2026-11-09'); assert.equal(card.sources[0], source)
    for (const compactSources of [false, true]) {
      const view = render(React.createElement(ModelSpecifications, { provider: 'bailian', model, compactSources }))
      const input = within(screen.getByRole('group', { name: '输入模态' }))
      const output = within(screen.getByRole('group', { name: '输出模态' }))
      for (const label of ['文本', '图像']) input.getByRole('img', { name: `支持${label}输入` })
      for (const label of ['音频', '视频']) input.getByRole('img', { name: `此渠道不支持${label}输入` })
      for (const label of ['图像', '音频', '视频']) output.getByRole('img', { name: `此渠道不支持${label}输出` })
      const link = screen.getByRole('link')
      assert.equal(link.getAttribute('href'), source); assert.equal(link.textContent, '渠道资料 · 百炼 · Kimi K3')
      assert.match(link.title, /^核实日期：2026-11-09\n/)
      assert.match(link.title, /输入：渠道公布/)
      assert.doesNotMatch(link.title, /输入：图研既有核实/)
      view.unmount()
    }
  }
  assert.deepEqual(liveModel, before)
})

test('R10 exclusions override catalog unions and product floors only when explicitly recorded', () => {
  const audit = modelCardSpecifications('bailian', { id: 'kimi-k3' })
  const existing = { inputModalities: { value: ['text', 'image', 'video'], state: 'known', provenance: 'catalog', sourceUrls: [source] } }
  const plain = structuredClone(audit)
  delete plain.fields.inputModalities.unsupportedModalities
  assert.deepEqual(mergeCardFacts(plain, existing).fields.inputModalities.value, ['text', 'image', 'video'])
  const excludedImage = structuredClone(audit)
  excludedImage.fields.inputModalities.value = ['text']
  excludedImage.fields.inputModalities.unsupportedModalities = ['image', 'audio', 'video']
  assert.deepEqual(mergeCardFacts(excludedImage, existing, { roles: ['vision'] }).fields.inputModalities.value, ['text'])
})

test('R10 desktop and mobile reselect body paragraphs declare at least 12px', t => {
  const originalWidth = window.innerWidth
  t.after(() => { window.innerWidth = originalWidth })
  const style = document.createElement('style')
  style.textContent = ['workspace.css', 'workspaceModels.css'].map(name => fs.readFileSync(new URL('../src/workspace/' + name, import.meta.url), 'utf8')).join('\n')
  document.head.append(style); t.after(() => style.remove())
  const entry = { id: 'old', connectionId: 'c', modelId: 'mimo-v2.5' }
  const models = { registry: { providers: STATIC_MODEL_REGISTRY }, library: { models: [entry], connections: [{ id: 'c', provider: 'xiaomi' }] }, ready: true, registryStatus: 'ready', save() { assert.fail('No save while inspecting font sizes') } }
  for (const width of [1280, 390]) {
    window.innerWidth = width
    render(React.createElement(ModelReplacement, { provider: 'xiaomi', modelId: entry.modelId, models, entry }))
    fireEvent.click(screen.getByRole('button', { name: '改选' }))
    const paragraphs = screen.getByRole('dialog', { name: '确认切换模型' }).querySelectorAll('.tw-dialog-body > p')
    assert.equal(paragraphs.length, 3)
    for (const p of paragraphs) assert.ok(parseFloat(window.getComputedStyle(p).fontSize) >= 12, `${width}px: ${p.textContent}`)
    cleanup()
  }
  // jsdom does not evaluate viewport media queries. Also inspect every matching
  // paragraph declaration, including rules nested under mobile media queries.
  function check(rules) {
    for (const rule of rules) {
      if (rule.cssRules) check(rule.cssRules)
      if (/(?:tw-model-reselect-dialog|tw-dialog-body).*?>\s*p\b/.test(rule.selectorText || '') && rule.style?.getPropertyValue('font-size')) assert.ok(parseFloat(rule.style.getPropertyValue('font-size')) >= 12)
    }
  }
  check(style.sheet.cssRules)
})
