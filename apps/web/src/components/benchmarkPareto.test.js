import assert from 'node:assert/strict'
import test, { afterEach } from 'node:test'
import React from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import BenchmarkPareto from './BenchmarkPareto.jsx'
import { OFFICIAL_PRICES, TEST_COSTS } from './benchmarkParetoMath.js'
import { BenchmarkObservatory } from './BenchmarkPage.jsx'

afterEach(() => { cleanup();window.history.replaceState(null, '', '/') })
function model(id, score = 8) {
  const entry = OFFICIAL_PRICES.models.find(p => p.modelId === id)
  return { modelId: id, profileId: 'profile-' + id, displayName: id, developer: id.split('/')[0], overallScore: score, overallRank: 1, dimensions: { scientific_faithfulness: { mean: 10 - score } }, evidence: entry.binding?.map(s => ({ ...s, actualOutputPixels: { width: s.width, height: s.height } })) || [] }
}
const axes = [{ id: 'scientific_faithfulness', label: '科研忠实度' }]
test('compact controls, budget, dimensions, cost bars and advanced source filtering stay linked', () => {
  render(React.createElement(BenchmarkPareto, { models: [model('krea/krea-2-medium', 8), model('krea/krea-2-large', 9), model('openai/gpt-image-2')], axes }))
  assert.match(screen.getByLabelText('比较范围').textContent, /2 个模型/)
  assert.equal(screen.queryByLabelText('最高价格'), null)
  fireEvent.click(screen.getByRole('button', { name: '筛选', exact: true }))
  fireEvent.change(screen.getByLabelText('最高价格'), { target: { value: '.04' } })
  assert.match(screen.getByLabelText('比较范围').textContent, /1 个模型/)
  assert.equal(within(screen.getByLabelText('单张成本榜')).getAllByRole('listitem').length, 1)
  fireEvent.click(screen.getByRole('button', { name: '重置筛选' }))
  fireEvent.change(screen.getByLabelText('评测维度'), { target: { value: 'scientific_faithfulness' } })
  assert.match(screen.getByLabelText('比较范围').textContent, /科研忠实度.*2 个模型/)
  assert.equal(within(screen.getByLabelText('帕累托最优模型')).getAllByRole('listitem').length, 1)
  fireEvent.click(screen.getByRole('button', { name: '放大图表' }))
  assert.equal(screen.getByLabelText('当前缩放').textContent, '2×')
  fireEvent.click(screen.getByRole('button', { name: '重置视图' }))
  assert.equal(screen.getByLabelText('当前缩放').textContent, '1×')
  fireEvent.change(screen.getByLabelText('供应商'), { target: { value: 'openai' } })
  assert.match(screen.getByLabelText('比较范围').textContent, /0 个模型/)
  assert.ok(screen.getByText('没有符合条件的模型'))
})
test('seven bills remain included with normalized names and full provenance behind an expansion', () => {
  const billed = TEST_COSTS.models.map(e => ({ ...model(e.modelId), profileId: e.profileId, evidence: e.binding.map(s => ({ ...s, actualOutputPixels: { width: s.width, height: s.height } })) }))
  render(React.createElement(BenchmarkPareto, { models: [...billed, model('krea/krea-2-medium')], axes }))
  assert.match(screen.getByLabelText('比较范围').textContent, /8 个模型/)
  fireEvent.change(screen.getByLabelText('模型搜索'), { target: { value: 'openai/gpt-image-2.5-flare' } })
  assert.match(screen.getByLabelText('比较范围').textContent, /1 个模型/)
  fireEvent.click(screen.getByRole('button', { name: /^GPT Image 2.5 Flare，8.00/ }))
  const detail = screen.getByLabelText('模型计价详情')
  assert.match(detail.textContent, /\$0.250/)
  assert.match(detail.textContent, /账单已核对/)
  assert.equal(within(detail).queryByText('openai/gpt-image-2.5-flare'), null)
  fireEvent.click(within(detail).getByRole('button', { name: '计费详情' }))
  assert.ok(within(detail).getByText('openai/gpt-image-2.5-flare'))
  assert.match(within(detail).getByRole('link', { name: /公开逐题账单/ }).href, /leaderboard/)
  fireEvent.keyDown(document, { key: 'Escape' })
  assert.equal(screen.queryByLabelText('模型计价详情'), null)
  fireEvent.change(screen.getByLabelText('成本来源'), { target: { value: 'official' } })
  assert.match(screen.getByLabelText('比较范围').textContent, /0 个模型/)
  fireEvent.change(screen.getByLabelText('成本来源'), { target: { value: 'combined' } })
  assert.match(screen.getByLabelText('比较范围').textContent, /1 个模型/)
})
test('ordinary ranking remains default; toggle is deep-linkable and history aware', () => {
  const release = { models: [model('krea/krea-2-medium')], presentationVersion: 'scientific-leaderboard-v2', eligibleModelCount: 1 }
  render(React.createElement(BenchmarkObservatory, { release }))
  assert.equal(screen.getByRole('button', { name: '排名', exact: true }).getAttribute('aria-pressed'), 'true')
  fireEvent.click(screen.getByRole('button', { name: '帕累托', exact: true }))
  assert.equal(new URLSearchParams(window.location.search).get('view'), 'pareto')
  assert.ok(screen.getByLabelText('帕累托视图'))
  fireEvent.click(screen.getByRole('button', { name: '排名', exact: true }))
  assert.equal(screen.queryByLabelText('帕累托视图'), null)
  assert.equal(new URLSearchParams(window.location.search).get('view'), null)
})

test('touch chart expansion locks page scroll and Escape restores it', () => {
  const width = window.innerWidth, overflow = document.body.style.overflow
  window.innerWidth = 390
  try {
    render(React.createElement(BenchmarkPareto, { models: [model('krea/krea-2-medium')], axes }))
    fireEvent.click(screen.getByRole('button', { name: '展开图表', exact: true }))
    assert.ok(screen.getByRole('dialog', { name: '帕累托前沿', exact: true }))
    assert.equal(document.body.style.overflow, 'hidden')
    fireEvent.keyDown(document, { key: 'Escape' })
    assert.equal(screen.queryByRole('dialog', { name: '帕累托前沿', exact: true }), null)
    assert.equal(document.body.style.overflow, overflow)
    fireEvent.click(screen.getByRole('button', { name: '展开图表', exact: true }))
    cleanup()
    assert.equal(document.body.style.overflow, overflow)
  } finally { window.innerWidth = width;document.body.style.overflow = overflow }
})
