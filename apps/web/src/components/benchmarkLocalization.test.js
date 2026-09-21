import assert from 'node:assert/strict'
import test, { afterEach } from 'node:test'
import fs from 'node:fs'
import React from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { BenchmarkLocaleProvider, BenchmarkLanguageSwitch } from './BenchmarkLocale.jsx'
import { BENCHMARK_LANGUAGE_KEY, benchmarkText, readBenchmarkLocale } from './benchmarkLocale.js'
import { BenchmarkObservatory } from './BenchmarkPage.jsx'
import { benchmarkDeveloper, benchmarkDeveloperName, benchmarkRecordKey, matchesBenchmarkModel } from './benchmarkDevelopers.js'
import { OFFICIAL_PRICES, TEST_COSTS, comparisonPrice } from './benchmarkParetoMath.js'
import { presentBenchmarkPrice } from './benchmarkPricePresentation.js'
import { SCIENTIFIC_WEB_CONTRACT } from './scientificBenchmarkContract.js'

afterEach(() => { cleanup(); window.localStorage.clear(); window.sessionStorage.clear() })
const axes = SCIENTIFIC_WEB_CONTRACT.axes
function model(id, rank, developer, profileId = `profile-${id}`) {
  const entry = OFFICIAL_PRICES.models.find(item => item.modelId === id)
  return { modelId: id, profileId, developer, displayName: id, overallRank: rank, overallScore: 10 - rank / 10,
    dimensions: Object.fromEntries(axes.map((axis, index) => [axis, { mean: index ? rank / 10 : 10 - rank / 10 }])),
    dimensionRanks: Object.fromEntries(axes.map(axis => [axis, rank])),
    evidence: entry?.binding?.map(slot => ({ ...slot, actualOutputPixels: { width: slot.width, height: slot.height } })) || [] }
}
const models = [model('krea/krea-2-medium', 5, 'Krea'), model('krea/krea-2-large', 9, 'Krea'), model('openai/gpt-image-2', 1, 'OpenAI'), model('qwen/image-unpriced', 15, 'Alibaba Qwen')]
const release = { models, presentationVersion: 'scientific-leaderboard-v2', eligibleModelCount: models.length }
function App({ data = release, pathname }) {
  return React.createElement(BenchmarkLocaleProvider, null,
    React.createElement(BenchmarkLanguageSwitch),
    React.createElement(BenchmarkObservatory, { release: data, pathname, showNavigation: false }))
}
const rankingFilters = () => within(screen.getByRole('region', { name: /排名筛选|Ranking filters/ }))
const matrixRows = () => [...screen.getByRole('table', { name: /生图模型综合排行榜|Image model overall ranking/ }).querySelectorAll('tbody tr')]
const en = () => fireEvent.click(screen.getByRole('button', { name: 'English', exact: true }))

test('default Chinese, persisted English, storage failure and language changes preserve ranking state and data', () => {
  const original = structuredClone(release)
  const rendered = render(React.createElement(App))
  assert.equal(document.documentElement.lang, 'zh-CN')
  assert.ok(screen.getByRole('button', { name: '按综合排序' }))
  fireEvent.change(rankingFilters().getByLabelText('模型搜索'), { target: { value: 'Krea' } })
  fireEvent.click(rankingFilters().getByRole('button', { name: '筛选', exact: true }))
  fireEvent.change(rankingFilters().getByLabelText('模型研发厂商'), { target: { value: 'krea' } })
  fireEvent.click(screen.getByRole('button', { name: '按结构拓扑排序' }))
  assert.match(matrixRows()[0].textContent, /krea-2-large/)
  en()
  assert.equal(document.documentElement.lang, 'en')
  assert.equal(window.localStorage.getItem(BENCHMARK_LANGUAGE_KEY), 'en')
  assert.equal(rankingFilters().getByLabelText('Model search').value, 'Krea')
  assert.equal(rankingFilters().getByLabelText('Model developer').value, 'krea')
  assert.match(matrixRows()[0].textContent, /krea-2-large/)
  assert.equal(screen.getByRole('button', { name: 'Sort by Structural topology' }).closest('th').getAttribute('aria-sort'), 'descending')
  assert.deepEqual(release, original)
  rendered.unmount()
  render(React.createElement(App))
  assert.equal(document.documentElement.lang, 'en')
  assert.equal(rankingFilters().getByLabelText('Model search').value, 'Krea')
  cleanup()
  const descriptor = Object.getOwnPropertyDescriptor(window, 'localStorage')
  Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('Storage disabled') } })
  try {
    assert.equal(readBenchmarkLocale(), 'zh-CN')
    render(React.createElement(App))
    en()
    assert.equal(document.documentElement.lang, 'en')
  } finally { Object.defineProperty(window, 'localStorage', descriptor) }
})

test('developer and search jointly filter Top10 and matrix without renumbering; empty state clears both', () => {
  const many = Array.from({ length: 12 }, (_, index) => model(`krea/test-${index}`, index + 10, 'Krea'))
  const { container } = render(React.createElement(App, { data: { ...release, models: [...many, models[2]] } }))
  fireEvent.click(rankingFilters().getByRole('button', { name: '筛选', exact: true }))
  fireEvent.change(rankingFilters().getByLabelText('模型研发厂商'), { target: { value: 'krea' } })
  assert.equal(matrixRows().length, 12)
  for (const card of container.querySelectorAll('.bench-dimension-card')) {
    assert.equal(card.querySelectorAll('.bench-mini-row').length, 10)
    assert.doesNotMatch(card.textContent, /openai/)
  }
  assert.match(matrixRows()[0].textContent, /#10/)
  fireEvent.change(rankingFilters().getByLabelText('模型搜索'), { target: { value: 'test-11' } })
  assert.equal(matrixRows().length, 1)
  assert.match(matrixRows()[0].textContent, /#21/)
  fireEvent.change(rankingFilters().getByLabelText('模型搜索'), { target: { value: 'no-match' } })
  assert.ok(screen.getByText('没有匹配的模型'))
  assert.match(rankingFilters().getAllByRole('status')[0].textContent, /匹配 0 \/ 13/)
  fireEvent.click(rankingFilters().getAllByRole('button', { name: '清空条件' })[0])
  assert.equal(matrixRows().length, 13)
  assert.equal(rankingFilters().getByLabelText('模型研发厂商').value, '')
  assert.equal(rankingFilters().queryByLabelText('最高价格'), null)
})

test('ranking and Pareto share developer/query; costs remain Pareto-only and chart state survives language and view switches', () => {
  render(React.createElement(App))
  fireEvent.change(rankingFilters().getByLabelText('模型搜索'), { target: { value: 'Krea' } })
  fireEvent.click(rankingFilters().getByRole('button', { name: '筛选', exact: true }))
  fireEvent.change(rankingFilters().getByLabelText('模型研发厂商'), { target: { value: 'krea' } })
  fireEvent.click(screen.getByRole('button', { name: '帕累托', exact: true }))
  const pareto = within(screen.getByRole('region', { name: '帕累托视图' }))
  assert.equal(pareto.getByLabelText('模型搜索').value, 'Krea')
  fireEvent.click(pareto.getByRole('button', { name: /^筛选/ }))
  assert.equal(pareto.getByLabelText('模型研发厂商').value, 'krea')
  fireEvent.change(pareto.getByLabelText('最高价格'), { target: { value: '.04' } })
  fireEvent.click(pareto.getByRole('button', { name: '放大图表' }))
  assert.equal(pareto.getByLabelText('当前缩放').textContent, '2×')
  const route = window.location.href
  en()
  assert.equal(window.location.href, route)
  assert.equal(pareto.getByLabelText('Current zoom').textContent, '2×')
  assert.equal(pareto.getByLabelText('Maximum price').value, '.04')
  fireEvent.click(screen.getByRole('button', { name: 'Rankings', exact: true }))
  assert.equal(matrixRows().length, 2)
  fireEvent.click(rankingFilters().getByRole('button', { name: 'Clear all' }))
  assert.equal(matrixRows().length, 4) // Includes both models without comparable cost.
  fireEvent.click(screen.getByRole('button', { name: 'Pareto', exact: true }))
  assert.equal(pareto.getByLabelText('Maximum price').value, '.04')
  assert.equal(pareto.getByLabelText('Model developer').value, '')
})

test('developer aliases match in either language; channels never become developers; conflicting records stay separate', () => {
  for (const alias of ['Alibaba Qwen', 'Alibaba Wan', 'Qwen', 'Tongyi-MAI']) {
    const row = model('unrecognized-id', 1, alias)
    assert.equal(benchmarkDeveloper(row).id, 'alibaba')
    for (const query of ['阿里巴巴', 'Alibaba', 'Qwen']) assert.ok(matchesBenchmarkModel(row, query, 'alibaba'))
    assert.equal(benchmarkDeveloperName(row), '阿里巴巴')
    assert.equal(benchmarkDeveloperName(row, 'en'), 'Alibaba')
  }
  assert.ok(matchesBenchmarkModel(model('google/nano-banana-pro', 1, 'Google'), 'Nano Banana Pro'))
  assert.ok(matchesBenchmarkModel(model('openai/gpt-image-2', 1, 'OpenAI'), 'GPT Image 2'))
  assert.equal(benchmarkDeveloper(model('google/example', 1, 'OpenAI')).conflict, true)
  assert.equal(benchmarkDeveloper(model('replicate/unknown-model', 1, 'Replicate')).id, 'unconfirmed')
  const separate = [model('google/example', 8, 'Google', 'channel-a'), model('google/example', 9, 'Google', 'channel-b')]
  assert.notEqual(benchmarkRecordKey(separate[0]), benchmarkRecordKey(separate[1]))
  render(React.createElement(App, { data: { ...release, models: separate } }))
  assert.equal(matrixRows().length, 2)
  assert.notEqual(matrixRows()[0].querySelector('a').href, matrixRows()[1].querySelector('a').href)
})

test('dimension page uses the same saved matching range and retains official ranks across language changes', () => {
  window.sessionStorage.setItem('tuyan.benchmark.filters.v1', JSON.stringify({ query: 'Krea', vendor: 'krea', sortMetric: 'overall' }))
  render(React.createElement(App, { pathname: '/leaderboard/scientific-faithfulness' }))
  const table = screen.getByRole('table')
  assert.equal(table.querySelectorAll('tbody tr').length, 2)
  assert.match(table.textContent, /#5/)
  en()
  assert.equal(rankingFilters().getByLabelText('Model search').value, 'Krea')
  assert.match(table.textContent, /#9/)
})

test('all known pricing explanations have English text without changing cost or evidence values', () => {
  const t = (key, values) => benchmarkText('en', key, values)
  const fields = ['reason', 'conditions', 'rateText', 'calculation', 'channel', 'generationApi', 'editApi', 'feeBreakdown', 'missingFields', 'auditNotes']
  for (const entry of OFFICIAL_PRICES.models) {
    const bill = TEST_COSTS.models.find(item => item.modelId === entry.modelId)
    const row = model(entry.modelId, 1, '', bill?.profileId)
    if (bill) row.evidence = bill.binding.map(slot => ({ ...slot, actualOutputPixels: { width: slot.width, height: slot.height } }))
    for (const basis of ['official', 'combined']) {
      const price = comparisonPrice(row, basis)
      const before = structuredClone(price)
      const display = presentBenchmarkPrice(price, row, t)
      for (const key of fields) assert.doesNotMatch(JSON.stringify(display[key]) || '', /[\u3400-\u9fff]/u, `${entry.modelId}: ${key}`)
      for (const source of price.sources) assert.doesNotMatch(t(source.label), /[\u3400-\u9fff]/u)
      for (const key of ['usd', 'exact', 'status', 'modelId', 'slots', 'binding', 'rule', 'officialModelId', 'version']) assert.deepEqual(display[key], price[key])
      assert.deepEqual(price, before)
    }
  }
})

test('translation entries preserve placeholders and contain complete English interface strings', () => {
  const messages = JSON.parse(fs.readFileSync(new URL('./benchmarkMessages.json', import.meta.url)))
  for (const [key, value] of Object.entries(messages)) {
    const english = typeof value === 'string' ? value : value.en
    assert.ok(english?.trim(), key)
    assert.doesNotMatch(english, /[\u3400-\u9fff]/u, key)
    assert.deepEqual(english.match(/\{\w+\}/g)?.sort() || [], key.match(/\{\w+\}/g)?.sort() || [], key)
  }
})
