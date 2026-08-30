import assert from 'node:assert/strict'
import test, { afterEach } from 'node:test'

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import React from 'react'

import BenchmarkPage, { BenchmarkEvidenceImage, BenchmarkObservatory, BenchmarkPromptSubmissionForm } from './BenchmarkPage.jsx'
import { canonicalizeLeaderboardLocation } from '../leaderboardRoutes.js'

afterEach(cleanup)

const axes = [
  'faithfulness',
  'conciseness',
  'readability',
  'aesthetics',
  'text_accuracy',
  'topology',
  'instruction_adherence',
]

const labels = ['忠实度', '简洁度', '可读性', '美观度', '文字 / 符号', '拓扑关系', '指令遵从']

function makeModel(index) {
  const rank = index + 1
  const aesthetics = index === 0 ? 9.324 : index === 1 ? 9.321 : 9.1 - index * 0.31
  const means = {
    faithfulness: 9.8 - index * 0.23,
    conciseness: 9.7 - index * 0.21,
    readability: 9.6 - index * 0.19,
    aesthetics,
    text_accuracy: 9.4 - index * 0.17,
    topology: 9.3 - index * 0.15,
    instruction_adherence: 9.2 - index * 0.13,
  }
  return {
    profileId: `profile-${rank}`,
    modelId: `model-${rank}`,
    displayName: index === 0 ? 'Banana Prime' : index === 1 ? 'Banana Pro' : `模型 ${rank}`,
    overallScore: 9.91 - index * 0.37,
    overallRank: rank,
    dimensions: Object.fromEntries(axes.map((axis) => [axis, { mean: means[axis], ci95: { low: 1.11, high: 9.99 } }])),
    dimensionRanks: Object.fromEntries(axes.map((axis) => [axis, rank])),
  }
}

const release = {
  releaseId: 'release-arena',
  profileStatus: 'published',
  evaluationMode: 'codex_single',
  suiteId: 'pb-image-light-v1',
  presentationVersion: 'arena-leaderboard-v1',
  eligibleModelCount: 12,
  sourceReleaseHash: 'source-hash',
  rankingMethod: { id: 'equal_weight_mean_v1', tieMethod: 'competition' },
  models: Array.from({ length: 12 }, (_, index) => makeModel(index)),
}

function renderPage(pathname = '/leaderboard') {
  return render(React.createElement(BenchmarkObservatory, { release, pathname }))
}

test('overview renders seven Top10 cards with full-ranking links', () => {
  const { container } = renderPage()
  const cards = container.querySelectorAll('.bench-dimension-card')
  assert.equal(cards.length, 7)
  cards.forEach((card, index) => {
    assert.match(card.textContent, new RegExp(labels[index].replace(' / ', ' \\/ ')))
    assert.match(card.textContent, /Top10/u)
    assert.equal(card.querySelectorAll('.bench-mini-row').length, 10)
    const link = within(card).getByRole('link', { name: '查看完整排名' })
    assert.ok(link.getAttribute('href')?.startsWith('/leaderboard/'))
  })
})

test('overview matrix shows Overall and seven dimensions with rank and two-decimal scores', () => {
  const { container } = renderPage()
  const table = screen.getByRole('table', { name: '生图模型综合排行榜' })
  assert.ok(within(table).getByRole('columnheader', { name: /Overall/u }))
  labels.forEach((label) => assert.ok(within(table).getByRole('columnheader', { name: new RegExp(label.replace(' / ', ' \\/ ')) })))
  const firstRow = container.querySelector('tbody tr')
  assert.match(firstRow.textContent, /#1 · 9\.91/u)
  assert.match(firstRow.textContent, /#1 · 9\.32/u)
  assert.equal(container.querySelectorAll('.rank-top-1').length > 0, true)
  assert.equal(container.querySelectorAll('.rank-top-2').length > 0, true)
  assert.equal(container.querySelectorAll('.rank-top-3').length > 0, true)
  assert.doesNotMatch(container.textContent, /95%|置信区间|区间|不产生综合总分|失败模型仍公开/u)
  assert.doesNotMatch(container.textContent, /1\.11|9\.99/u)
  assert.equal(firstRow.querySelector('a').getAttribute('href'), '/leaderboard/models/profile-1')
})

test('evidence images lazy-load responsive WebP and request the full rendition only after expansion', () => {
  const variants = [
    { kind: 'thumbnail', url: 'https://img.example/thumb.webp', width: 640, height: 320, mimeType: 'image/webp' },
    { kind: 'detail', url: 'https://img.example/detail.webp', width: 1600, height: 800, mimeType: 'image/webp' },
    { kind: 'full', url: 'https://img.example/full.webp', width: 2400, height: 1200, mimeType: 'image/webp' },
  ]
  const { container } = render(React.createElement(BenchmarkEvidenceImage, { variants, alt: '模型样本' }))
  const image = screen.getByRole('img', { name: '模型样本' })
  assert.equal(image.getAttribute('loading'), 'lazy')
  assert.equal(image.getAttribute('decoding'), 'async')
  assert.match(image.getAttribute('srcset'), /thumb\.webp 640w.*detail\.webp 1600w/u)
  assert.doesNotMatch(image.getAttribute('srcset'), /full\.webp/u)
  assert.equal(container.querySelectorAll('img[src="https://img.example/full.webp"]').length, 0)
  fireEvent.click(screen.getByRole('button', { name: '查看模型样本高清图' }))
  assert.equal(container.querySelectorAll('img[src="https://img.example/full.webp"]').length, 1)
})

test('prompt submission form sends the five text-only community fields', async () => {
  let submitted
  render(React.createElement(BenchmarkPromptSubmissionForm, {
    authenticated: true,
    onSubmit: async (payload) => { submitted = payload; return { submissionId: 'prompt-1', status: 'pending' } },
  }))
  fireEvent.change(screen.getByLabelText('评估提示词'), { target: { value: '绘制一个中英双语拓扑图' } })
  fireEvent.change(screen.getByLabelText('想测试的模型能力'), { target: { value: '双语文字与拓扑关系' } })
  fireEvent.change(screen.getByLabelText('必须出现的内容或关系'), { target: { value: '中文和英文标签' } })
  fireEvent.change(screen.getByLabelText('不允许出现的结果'), { target: { value: '乱码' } })
  fireEvent.change(screen.getByLabelText('补充说明'), { target: { value: '社区建议' } })
  fireEvent.click(screen.getByRole('button', { name: '提交候选提示词' }))
  await screen.findByText('投稿已进入候选池')
  assert.deepEqual(submitted, {
    prompt: '绘制一个中英双语拓扑图', capability: '双语文字与拓扑关系', requiredElements: '中文和英文标签', forbiddenResults: '乱码', notes: '社区建议',
  })
})

test('model evidence route requests only the selected public profile and renders scores plus review notes', async () => {
  const previousFetch = globalThis.fetch
  const bodies = []
  globalThis.fetch = async (_input, options = {}) => {
    bodies.push(JSON.parse(options.body))
    return { ok: true, status: 200, async text() { return JSON.stringify({ code: 0, profile: {
      ...release.models[0],
      cases: [{ id: 'complex_topology-05', title: '拓扑关系题', renderPrompt: '完整提示词', negativePrompt: '禁止乱码', requiredEntities: [], requiredRelations: ['A→B'], requiredText: [], forbidden: ['乱码'] }],
      evidence: [{ sampleId: 'sample-1', caseId: 'complex_topology-05', imageHash: 'a'.repeat(64), actualOutputPixels: { width: 1200, height: 600, megapixels: 0.72, fileSizeBytes: 1000 }, scores: Object.fromEntries(axes.map((axis) => [axis, 8])), reviewNotes: ['拓扑完整，次要标签略拥挤。'], variants: [{ kind: 'thumbnail', url: 'https://img.example/thumb.webp', width: 640, height: 320, mimeType: 'image/webp' }] }],
      release: { releaseHash: 'release-hash' },
    } }) } }
  }
  try {
    render(React.createElement(BenchmarkPage, { apiBase: 'https://gateway.example', backendMode: 'gateway', enabled: true, pathname: '/leaderboard/models/profile-1' }))
    await screen.findByRole('heading', { name: 'Banana Prime' })
    assert.deepEqual(bodies, [{ action: 'benchmarkModelProfile', profileId: 'profile-1' }])
    assert.ok(screen.getByText('拓扑完整，次要标签略拥挤。'))
    assert.equal(screen.getAllByText('8.00').length, 7)
  } finally { globalThis.fetch = previousFetch }
})

test('missing and null ranking fields render as em dashes instead of zero scores', () => {
  const incomplete = {
    ...release,
    eligibleModelCount: 1,
    models: [{
      ...release.models[0],
      overallScore: null,
      overallRank: null,
      dimensions: { ...release.models[0].dimensions, faithfulness: { mean: null } },
      dimensionRanks: { ...release.models[0].dimensionRanks, faithfulness: null },
    }],
  }
  const { container } = render(React.createElement(BenchmarkObservatory, { release: incomplete, pathname: '/leaderboard' }))
  const row = container.querySelector('.bench-matrix tbody tr')
  assert.match(row.textContent, /—/u)
  assert.doesNotMatch(row.textContent, /#0|0\.00/u)
})

test('overview filters models live and sorts every metric by raw descending score', () => {
  const { container } = renderPage()
  const rows = () => [...container.querySelectorAll('.bench-matrix tbody tr')]
  const overallButton = screen.getByRole('button', { name: '按Overall排序' })
  const aestheticsButton = screen.getByRole('button', { name: '按美观度排序' })
  const overallHeader = overallButton.closest('th')
  const aestheticsHeader = aestheticsButton.closest('th')
  assert.equal(overallHeader.getAttribute('aria-sort'), 'descending')
  assert.equal(aestheticsHeader.hasAttribute('aria-sort'), false)
  assert.equal(overallButton.hasAttribute('aria-pressed'), false)
  assert.match(rows()[0].textContent, /Banana Prime/u)

  fireEvent.click(aestheticsButton)
  assert.match(rows()[0].textContent, /Banana Prime/u)
  assert.match(rows()[1].textContent, /Banana Pro/u)
  assert.match(rows()[0].textContent, /9\.32/u)
  assert.match(rows()[1].textContent, /9\.32/u)
  assert.equal(overallHeader.hasAttribute('aria-sort'), false)
  assert.equal(aestheticsHeader.getAttribute('aria-sort'), 'descending')
  assert.equal(aestheticsButton.hasAttribute('aria-pressed'), false)

  fireEvent.change(screen.getByRole('searchbox', { name: '搜索综合排行榜模型' }), { target: { value: 'Pro' } })
  assert.equal(rows().length, 1)
  assert.match(rows()[0].textContent, /Banana Pro/u)
  assert.match(screen.getByText(/1\s*\/\s*12/u).textContent, /1\s*\/\s*12/u)
})

test('dimension route renders all eligible models, backend tie ranks, search, and return link', () => {
  const { container } = renderPage('/leaderboard/aesthetics')
  assert.ok(screen.getByRole('heading', { name: '美观度完整排名' }))
  assert.equal(container.querySelectorAll('.bench-dimension-table tbody tr').length, 12)
  assert.equal(within(container.querySelector('.bench-dimension-table tbody tr')).getByText('#1').textContent, '#1')
  assert.ok(screen.getByRole('link', { name: '返回综合总榜' }).getAttribute('href') === '/leaderboard')
  assert.equal(screen.getByRole('link', { name: '方法说明' }).getAttribute('href'), '/leaderboard/methodology')
  const scrollRegion = container.querySelector('.bench-dimension-full .bench-matrix-scroll')
  assert.equal(scrollRegion.getAttribute('tabindex'), '0')
  assert.equal(scrollRegion.getAttribute('aria-label'), '可横向滚动的美观度完整排名')

  fireEvent.change(screen.getByRole('searchbox', { name: '搜索美观度排名模型' }), { target: { value: 'model-12' } })
  assert.equal(container.querySelectorAll('.bench-dimension-table tbody tr').length, 1)
  assert.match(container.querySelector('.bench-dimension-table tbody tr').textContent, /model-12/u)
})

test('invalid leaderboard slug stays in the leaderboard shell with a friendly return action', () => {
  renderPage('/leaderboard/not-a-dimension')
  assert.ok(screen.getByRole('heading', { name: '没有这个排行榜维度' }))
  assert.ok(screen.getByRole('link', { name: '返回综合总榜' }).getAttribute('href') === '/leaderboard')
  assert.equal(screen.queryByRole('table'), null)
})

test('real page restores a fallback invalid slug before API loading or request errors', () => {
  const previousFetch = globalThis.fetch
  let requests = 0
  globalThis.fetch = async () => { requests += 1; throw new Error('must not request') }
  try {
    const restored = canonicalizeLeaderboardLocation({ pathname: '/leaderboard', search: '?__route=%2Fleaderboard%2Fnot-a-dimension', hash: '' }, { replaceState() {} })
    render(React.createElement(BenchmarkPage, { apiBase: '', enabled: true, pathname: restored.pathname }))
    assert.ok(screen.getByRole('heading', { name: '没有这个排行榜维度' }))
    assert.equal(requests, 0)
    assert.doesNotMatch(document.body.textContent, /正在读取排行榜|排行榜暂不可用/u)
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('overview requests only the leaderboard action and never methodology', async () => {
  const previousFetch = globalThis.fetch
  const bodies = []
  globalThis.fetch = async (_input, options = {}) => {
    bodies.push(JSON.parse(options.body))
    return { ok: true, status: 200, async text() { return JSON.stringify({ code: 0, release }) } }
  }
  try {
    render(React.createElement(BenchmarkPage, { apiBase: 'https://gateway.example', backendMode: 'gateway', enabled: true, pathname: '/leaderboard' }))
    await screen.findByRole('heading', { name: '生图模型排行榜' })
    assert.deepEqual(bodies, [{ action: 'benchmarkLeaderboard' }])
    assert.equal(bodies.some((body) => body.action === 'benchmarkMethodology'), false)
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('overview removes the old methodology section and flows from hero to dimensions to matrix', () => {
  const { container } = renderPage()
  const hero = container.querySelector('.bench-hero')
  const dimensions = container.querySelector('[aria-labelledby="bench-dimensions-title"]')
  const matrix = container.querySelector('.bench-matrix-section')
  assert.equal(container.querySelector('.bench-methodology'), null)
  assert.doesNotMatch(container.textContent, /读榜前需要知道/u)
  assert.equal(screen.getByRole('link', { name: '方法说明' }).getAttribute('href'), '/leaderboard/methodology')
  assert.ok(hero.compareDocumentPosition(dimensions) & Node.DOCUMENT_POSITION_FOLLOWING)
  assert.ok(dimensions.compareDocumentPosition(matrix) & Node.DOCUMENT_POSITION_FOLLOWING)
})
