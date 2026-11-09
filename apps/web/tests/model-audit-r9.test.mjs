import expectedSourceRows from './fixtures/model-audit-r9-source-rows-r24.json' with { type: 'json' }
import test, { afterEach, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import React from 'react'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import { STATIC_MODEL_REGISTRY } from '../src/lib/staticModelCatalog.js'
import { modelCardSpecifications, modelCardName, safeOfficialSources } from '../src/lib/modelCardSpecifications.js'
import { modelVersionDetail } from '../src/lib/modelPresentation.js'
import { ModelSpecifications } from '../src/components/ModelSpecifications.jsx'
import { isApiSource } from '../src/lib/modelCardSources.js'
import * as web from '../src/lib/modelAudit.js'
import * as core from '../../../packages/api/src/model-audit.ts'
import * as gateway from '../../auth-gateway/src/model-audit.js'

const require = createRequire(import.meta.url)
const mini = require('../../miniprogram/miniprogram/utils/model-audit.js')
const miniCatalog = require('../../miniprogram/miniprogram/utils/static-model-catalog.js').STATIC_MODEL_REGISTRY
const miniPresentation = require('../../miniprogram/miniprogram/utils/model-presentation.js')
beforeEach(t => t.mock.method(Date, 'now', () => Date.parse('2026-11-09')))
afterEach(cleanup)

test('R9 removal/lifecycle display names and notices contain no uncertainty or full-width notes in any runtime', () => {
  for (const [runtime, api] of Object.entries({ web, core, gateway, mini })) {
    assert.equal(api.modelDisplayName('xiaomi', 'mimo-v2.5'), 'MiMo-v2.5', runtime)
    assert.equal(api.modelDisplayName('xiaomi', 'mimo-v2.5-pro'), 'MiMo-v2.5-pro', runtime)
    assert.equal(api.modelDisplayName('bailian', 'deepseek-v4-flash'), 'DeepSeek-V4-Flash', runtime)
    for (const [key, row] of Object.entries({ ...web.MODEL_AUDIT_DATA.removed, ...web.MODEL_AUDIT_DATA.notices })) {
      const slash = key.indexOf('/'), provider = key.slice(0, slash), id = key.slice(slash + 1)
      const replacement = row.replacementApiId || row.replacement
      for (const text of [api.modelDisplayName(provider, id), replacement && api.modelDisplayName(provider, replacement),
        api.removedModelHint(provider, id), api.auditedModelLifecycle(provider, id)?.message].filter(Boolean)) {
        assert.doesNotMatch(text, /待确认|[（）]/, `${runtime}/${key}: ${text}`)
      }
      if (api.assertAuditedModelAvailable && web.MODEL_AUDIT_DATA.removed[key]) {
        assert.throws(() => api.assertAuditedModelAvailable(provider, id), error => {
          assert.doesNotMatch(error.message, /待确认|[（）]/, `${runtime}/${key}`)
          assert.equal(error.code, 'MODEL_UNAVAILABLE'); assert.equal(error.requestState, 'not_sent')
          return true
        })
      }
    }
  }
  for (const [provider, channel] of Object.entries(STATIC_MODEL_REGISTRY)) for (const model of channel.models) {
    const miniModel = miniCatalog[provider].models.find(row => row.id === model.id)
    assert.ok(miniModel, provider + '/' + model.id)
    for (const name of [model.label, modelCardName(provider, model), miniModel.label]) {
      assert.doesNotMatch(name, /待确认/, provider + '/' + model.id)
    }
    for (const detail of [modelVersionDetail(model), miniPresentation.modelVersionDetail(miniModel)]) {
      assert.doesNotMatch(detail, /具体版本待确认/, provider + '/' + model.id)
    }
  }
  assert.doesNotMatch(modelVersionDetail({ id: 'unknown' }), /具体版本待确认/)
  assert.doesNotMatch(miniPresentation.modelVersionDetail({ id: 'unknown' }), /具体版本待确认/)
})

test('R9 Bailian Kimi K3 visible official link and title use the channel source and verification date', () => {
  const original = STATIC_MODEL_REGISTRY.bailian.models.find(model => model.id === 'kimi-k3')
  // A generic catalog source must never displace the channel capability evidence.
  const model = { ...original, officialSourceUrl: 'https://huggingface.co/moonshotai/Kimi-K3' }
  const before = structuredClone(model)
  for (const compactSources of [false, true]) {
    const view = render(React.createElement(ModelSpecifications, { provider: 'bailian', model, compactSources }))
    const link = screen.getByRole('link')
    assert.equal(link.getAttribute('href'), 'https://help.aliyun.com/zh/model-studio/kimi-k3')
    assert.equal(link.textContent, '官方文档 · 百炼 · Kimi K3 (Bailian hosted)')
    assert.match(link.title, /^核实日期 2026-11-09\n/)
    assert.match(link.title, /上下文窗口：1,048,576 tokens/)
    assert.match(link.title, /最大输出：1,048,576 tokens/)
    assert.deepEqual(model, before)
    view.unmount()
  }
})

test('R9 channel evidence remains available; R12 permits only notices, human pages and specific-source promotion', () => {
  let cards = 0, channels = new Set()
  for (const [provider, channel] of Object.entries(STATIC_MODEL_REGISTRY)) for (const original of channel.models) {
    const model = { ...original, officialSourceUrl: 'https://catalog.example/generic' }
    const data = modelCardSpecifications(provider, model)
    const sources = safeOfficialSources(Object.values(data.fields).filter(fact => fact.provenance === 'channel')
      .flatMap(fact => fact.sourceUrls || [fact.sourceUrl]))
    if (!sources.length) continue
    // R12 supersedes the first-evidence rule, but retains every safe source.
    for (const source of sources) assert.equal(data.sources.includes(source), !isApiSource(source, web.MODEL_AUDIT_DATA.sourceChecks))
    const first = data.sources[0]
    assert.ok(first && !isApiSource(first, web.MODEL_AUDIT_DATA.sourceChecks), provider + '/' + model.id)
    assert.ok(data.channelSources.includes(first) || data.vendorSources.includes(first) || data.lifecycleSources.includes(first), provider + '/' + model.id)
    if (provider === 'tokendance') assert.deepEqual(data.sources, ['https://tokendance.space/models/' + model.id, ...data.vendorSources, ...data.lifecycleSources])
    else assert.ok(data.sources.includes(model.officialSourceUrl), 'secondary evidence is retained')
    const view = render(React.createElement(ModelSpecifications, { provider, model }))
    assert.equal(screen.getByRole('link').getAttribute('href'), first, provider + '/' + model.id)
    assert.deepEqual({url: screen.getByRole('link').getAttribute('href'), label: screen.getByRole('link').textContent}, expectedSourceRows[provider + '/' + model.id])
    view.unmount(); cards++; channels.add(provider)
  }
  assert.equal(cards, Object.keys(expectedSourceRows).length); assert.ok(cards > 100); assert.ok(channels.size > 10)
  for (const officialSourceUrl of ['https://catalog.example/exact', 'http://unsafe.example', 'https://user:password@unsafe.example']) {
    const model = { id: 'r9-unaudited', officialSourceUrl }
    const data = modelCardSpecifications('r9-unknown', model)
    assert.deepEqual(data.channelSources, [])
    assert.deepEqual(data.sources, officialSourceUrl === 'https://catalog.example/exact' ? [officialSourceUrl] : [])
  }
})

test('R9 touch source dialog keeps the same channel link and verification date', t => {
  const matchMedia = window.matchMedia
  window.matchMedia = () => ({ matches: true })
  t.after(() => { window.matchMedia = matchMedia })
  const model = STATIC_MODEL_REGISTRY.bailian.models.find(model => model.id === 'kimi-k3')
  render(React.createElement(ModelSpecifications, { provider: 'bailian', model }))
  fireEvent.click(screen.getByRole('link'))
  const dialog = screen.getByRole('dialog', { name: '官方文档规格' })
  assert.match(dialog.textContent, /核实日期 2026-11-09/)
  assert.equal(within(dialog).getAllByRole('link')[0].getAttribute('href'), 'https://help.aliyun.com/zh/model-studio/kimi-k3')
})
