import assert from 'node:assert/strict'
import test, { afterEach } from 'node:test'
import React from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import BenchmarkPareto from './BenchmarkPareto.jsx'
import { OFFICIAL_PRICES } from './benchmarkParetoMath.js'
import { BenchmarkObservatory } from './BenchmarkPage.jsx'

afterEach(() => { cleanup();window.history.replaceState(null, '', '/') })
function model(id, score = 8) {
  const entry = OFFICIAL_PRICES.models.find(p => p.modelId === id)
  return { modelId: id, profileId: 'profile-' + id, displayName: id, developer: id.split('/')[0], overallScore: score, overallRank: 1, dimensions: { scientific_faithfulness: { mean: 10 - score } }, evidence: entry.binding?.map(s => ({ ...s, actualOutputPixels: { width: s.width, height: s.height } })) || [] }
}
const axes = [{ id: 'scientific_faithfulness', label: '科研忠实度' }]
test('filters, dimension, linked details, zoom and price provenance work together', () => {
  render(React.createElement(BenchmarkPareto, { models: [model('krea/krea-2-medium', 8), model('krea/krea-2-large', 9), model('openai/gpt-image-2')], axes }))
  assert.match(screen.getByLabelText('比较范围').textContent, /2 个可比模型 · 2 个前沿模型/)
  fireEvent.change(screen.getByLabelText('评测维度'), { target: { value: 'scientific_faithfulness' } })
  assert.match(screen.getByLabelText('比较范围').textContent, /科研忠实度2 个可比模型 · 1 个前沿模型/)
  fireEvent.change(screen.getByLabelText('最高价格'), { target: { value: '.04' } })
  assert.match(screen.getByLabelText('比较范围').textContent, /1 个可比模型/)
  fireEvent.mouseEnter(screen.getByRole('button', { name: '在图中高亮 krea/krea-2-medium' }))
  const detail = screen.getByLabelText('模型计价详情')
  assert.match(detail.textContent, /1K、16:9/)
  assert.equal(within(detail).getByRole('link', { name: /Krea 官方模型接口与价格/ }).href, 'https://www.krea.ai/docs/api-reference/krea/krea-2-medium')
  assert.match(within(detail).getByRole('link', { name: /查看模型评分与原图/ }).href, /profile-krea/)
  fireEvent.click(screen.getByRole('button', { name: '放大图表' }))
  assert.equal(screen.getByLabelText('当前缩放').textContent, '2×')
  fireEvent.click(screen.getByRole('button', { name: '重置图表' }))
  assert.equal(screen.getByLabelText('当前缩放').textContent, '1×')
  fireEvent.change(screen.getByLabelText('供应商'), { target: { value: 'openai' } })
  assert.match(screen.getByLabelText('比较范围').textContent, /0 个可比模型/)
  assert.ok(screen.getByText(/当前条件下没有可比较的模型/))
  assert.ok(screen.getByText(/1 个模型暂不能纳入比较/))
  fireEvent.click(screen.getByRole('button', { name: '重置筛选' }))
  fireEvent.change(screen.getByLabelText('模型搜索'), { target: { value: 'krea-2-large' } })
  assert.match(screen.getByLabelText('比较范围').textContent, /1 个可比模型 · 1 个前沿模型/)
  assert.equal(screen.getAllByRole('row', { hidden: true }).length, 4)
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
