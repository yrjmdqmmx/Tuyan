import {expectedHumanRows} from '../../../test-support/source-links-i3-r24.mjs'
import test, { afterEach } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { render, screen, within, fireEvent, cleanup } from '@testing-library/react'
import { ModelSpecifications, ModelLifecycleBadge } from '../src/components/ModelSpecifications.jsx'
import { STATIC_MODEL_REGISTRY } from '../src/lib/staticModelCatalog.js'
import { modelCardSpecifications } from '../src/lib/modelCardSpecifications.js'
import { modelSourceRows } from '../src/lib/modelCardSources.js'
import { sourceTitle, sourceIdentity } from '../../../packages/api/src/card-presentation.mjs'
import { historicalIds, titleExamples, f3TitleExamples, titleIssues, titleBaseline, scanTitles } from '../../../test-support/source-titles-r23.mjs'
afterEach(cleanup)

test('R23F source titles preserve real model names, API subjects and version/date separators', () => {
  for (const [url, model, expected] of titleExamples) assert.equal(sourceTitle(url, model), expected)
  for (const version of ['3-5', '3_5', '3.8', '4.1', 'v2.6', '2507', '0813']) {
    const label = sourceTitle('https://docs.example.test/models/model-' + version)
    assert.ok(label.toLowerCase().includes(version.replace('_', '-')), label)
  }
  for (const label of ['官方文档 · stable diffusion 35', '官方文档 · qwen3 8 max', '官方文档 · api · fal.ai/models/a', '官方文档 · fal.ai · Model', '官方文档 · gpt 6.1 sol', '官方文档 · GPT-6.1-Sol', '官方文档 · GPT GPT', '官方文档 · Stable Diffusion Stable Diffusion', '官方文档 · title…']) {
    const name = label.includes('diffusion') ? 'Stable Diffusion 3.5' : label.includes('qwen') ? 'Qwen3.8 Max' : 'GPT-6.1 Sol'
    assert.ok(titleIssues({url:'https://docs.example.test/models/gpt-6.1-sol',label}, name).length, label)
  }
})

test('R23F3 known model punctuation survives general/quickstart slugs and genuine hyphens remain', () => {
  for (const [url, model, expected] of f3TitleExamples) assert.equal(sourceTitle(url, model), expected, url)
  for (const token of ['Qwen3-8', 'K2-7', 'V4-1']) {
    assert.ok(titleIssues({url:'https://docs.example.test/general',label:'官方文档 · Example · ' + token}, 'Unrelated Card')
      .some(issue => issue.startsWith('hyphenated dotted version:')), token)
  }
  assert.ok(titleIssues({url:'https://docs.example.test/general',label:'官方文档 · Example · Custom V7-2'}, 'Custom', 'custom-v7.2')
    .includes('hyphenated dotted version: V7-2'))
  for (const name of ['Qwen3-8B', 'Qwen3.8-27B', 'DeepSeek-R1-0528']) {
    assert.deepEqual(titleIssues({url:'https://docs.example.test/' + name,label:'官方文档 · Example · ' + name}, name), [])
  }
  const card = modelCardSpecifications('stability', STATIC_MODEL_REGISTRY.stability.models.find(model => model.id === 'sd3.5-flash'))
  assert.equal(modelSourceRows(card).find(row => row.url.endsWith('/stable-diffusion-35')).label, '官方文档 · Stability · Stable Diffusion 3.5')
})

test('R23F all 1064 rendered Web cards and evidence/notice dialogs pass the title scan without changing URLs or names', t => {
  const cards = []; let renderedRows = 0, notices = 0
  for (const [provider, entry] of Object.entries(STATIC_MODEL_REGISTRY)) for (const model of entry.models) {
    const data = modelCardSpecifications(provider, model), rows = modelSourceRows(data), card = provider + '/' + model.id
    const old = titleBaseline.web.find(row => row.card === card)
    assert.equal(data.sourceModel.displayName, old.name, card)
    assert.deepEqual(rows.map(row => row.url), expectedHumanRows(old.rows,card,'web').map(row => row.url), card)
    assert.equal(new Set(rows.map(row => row.label)).size, rows.length, card)
    assert.equal(new Set(rows.map(row => sourceIdentity(row.url))).size, rows.length, card)
    render(React.createElement(ModelSpecifications, {provider, model, compactSources:true}))
    if (rows.length) {
      const link = screen.getByRole('link')
      assert.equal(link.textContent, rows[0].label)
      for (const row of rows) assert.ok(link.title.includes(row.label))
    }
    fireEvent.click(screen.getByRole('button', {name:/^输入模态/}))
    const links = within(screen.getByRole('dialog')).queryAllByRole('link')
    assert.deepEqual(links.map(link => ({url:link.getAttribute('href'),label:link.textContent})), rows)
    renderedRows += links.length
    cards.push({card, name:old.name, rows}); cleanup()
    if (data.lifecycle?.state === 'scheduled' && data.lifecycle.sourceUrl) {
      render(React.createElement(ModelLifecycleBadge, {provider,lifecycle:data.lifecycle}))
      fireEvent.click(screen.getByRole('button'))
      const link = within(screen.getByRole('dialog')).getByRole('link')
      assert.deepEqual(titleIssues({url:link.href,label:link.textContent}), [], card)
      notices++; cleanup()
    }
  }
  assert.equal(cards.length, 1064); assert.ok(renderedRows > 1064); assert.ok(notices > 0)
  assert.deepEqual(scanTitles(cards), [])
  t.diagnostic(JSON.stringify({cards:cards.length,renderedRows,notices,suspicious:0}))
})

test('R23F only the seven missing TokenDance pages get the historical tooltip and dialog hint', () => {
  let changed = 0, controls = 0
  for (const model of STATIC_MODEL_REGISTRY.tokendance.models) {
    const {container} = render(React.createElement(ModelSpecifications, {provider:'tokendance',model}))
    const unknown = [...container.querySelectorAll('[data-state="unknown"], [data-state="unlisted"]')]
    if (historicalIds.includes(model.id)) {
      assert.ok(unknown.length, model.id)
      for (const icon of unknown) assert.equal(icon.title, '渠道页无此型号（核实日期：2026-11-09）')
      fireEvent.click(screen.getByRole('button',{name:/^输入模态/}))
      assert.match(screen.getByRole('dialog').textContent, /渠道页无此型号（核实日期：2026-11-09）/)
      assert.doesNotMatch(screen.getByRole('dialog').textContent, /渠道未标注此模态/)
      changed++
    } else { for (const icon of unknown) assert.match(icon.title, /^渠道未标注此模态/); assert.doesNotMatch(container.innerHTML, /渠道页无此型号/); controls++ }
    cleanup()
  }
  assert.equal(changed, 7); assert.equal(controls, 67)
})
