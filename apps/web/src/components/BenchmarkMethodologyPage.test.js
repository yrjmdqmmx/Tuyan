import assert from 'node:assert/strict'
import test, { afterEach } from 'node:test'

import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import React from 'react'

import BenchmarkMethodologyPage from './BenchmarkMethodologyPage.jsx'
import { SCIENTIFIC_WEB_CONTRACT } from './scientificBenchmarkContract.js'

const axisEntries = [
  ['faithfulness', '忠实度'],
  ['conciseness', '简洁度'],
  ['readability', '可读性'],
  ['aesthetics', '美观度'],
  ['text_accuracy', '文字 / 符号'],
  ['topology', '拓扑关系'],
  ['instruction_adherence', '指令遵从'],
]

const license = { spdx: 'CC-BY-4.0', author: 'PaperBanana contributors', source: 'original' }

function makeCase(index) {
  return {
    id: `case-${index}`,
    category: `category-${index}`,
    title: `题目 ${index}`,
    caption: `题目 ${index} 的公开说明。`,
    aspectRatio: index === 1 ? '16:9' : 'auto',
    renderPrompt: `完整正向提示词 ${index}：保留所有文字与关系。`,
    negativePrompt: `完整负向提示词 ${index}：不要水印。`,
    requiredEntities: index === 2 ? [] : [`实体 ${index}A`, `实体 ${index}B`],
    requiredRelations: [`实体 ${index}A->实体 ${index}B`],
    requiredText: index === 3 ? [] : [`文字 ${index}`],
    forbidden: [`禁止项 ${index}`],
    rubric: Object.fromEntries(axisEntries.map(([axis, label]) => [axis, `${label}原文 ${index}，不得摘要。`])),
    license,
    manifestHash: `case-hash-${index}`,
    blindLabel: `INTERNAL-BLIND-${index}`,
  }
}

const methodologyResponse = {
  code: 0,
  releaseHash: 'release-hash-public-123',
  methodology: {
    suiteId: 'pb-image-light-v1',
    suiteHash: 'suite-manifest-public-456',
    evaluationMode: 'codex_single',
    evaluationEpoch: 'codex-single-2026-08-v1',
    reviewProtocol: 'codex-single-two-pass-v1',
    reviewerKind: 'codex',
    reviewerPasses: 2,
    automaticJudges: [],
    noOverallScore: false,
    rankingMethod: {
      id: 'equal_weight_mean_v1',
      axes: axisEntries.map(([axis]) => axis),
      weights: axisEntries.map(() => 1 / 7),
      tieMethod: 'competition',
    },
    internalReviewLog: 'INTERNAL-REVIEW-LOG',
    modelMapping: 'INTERNAL-MODEL-MAPPING',
  },
  suite: {
    id: 'pb-image-light-v1',
    title: 'PaperBanana Lightweight Image Diagnostic v1',
    version: 1,
    language: 'zh-CN',
    license,
    manifestHash: 'suite-manifest-public-456',
    cases: [1, 2, 3, 4].map(makeCase),
  },
  scoring: {
    scoreMin: 0,
    scoreMax: 10,
    minimumReviewedSamples: 3,
    maximumSamplesPerModel: 4,
    overallFormula: 'equal_weight_mean_v1',
    tieMethod: 'competition',
    redLinePolicy: 'confirmed_axis_cap',
  },
}

const scientificAxisEntries = [
  ['scientific_faithfulness', '科研忠实度'], ['structural_topology', '结构拓扑'], ['text_symbol_accuracy', '文字符号'],
  ['quantitative_accuracy', '数值图表'], ['instruction_adherence', '指令遵从'], ['readability_visual_hierarchy', '信息层级 / 可读性'],
  ['information_density', '信息密度'], ['publication_aesthetics', '发表级美观'], ['edit_target_accuracy', '编辑目标命中'], ['non_target_preservation', '非目标保持'],
]

function scientificMethodologyResponse() {
  const axes = [...SCIENTIFIC_WEB_CONTRACT.axes]
  const cases = SCIENTIFIC_WEB_CONTRACT.cases.map((contractCase, index) => {
    const applicableAxes = [...contractCase.applicableAxes]
    return {
      id: contractCase.id, kind: contractCase.kind,
      title: `科研题 ${index + 1}`, instruction: `固定科研指令 ${index + 1}`, applicableAxes,
      rubric: Object.fromEntries(applicableAxes.map((axis) => [axis, `${axis} 评分准则`])), manifestHash: contractCase.manifestHash,
      ...(contractCase.kind === 'generation'
        ? { negativePrompt: '不得添加题外内容', aspectRatio: '16:9' }
        : { sourceHash: contractCase.sourceHash, region: contractCase.region }),
    }
  })
  return {
    code: 0, releaseHash: 'scientific-release-hash',
    suite: { id: SCIENTIFIC_WEB_CONTRACT.suiteId, version: 2, language: 'zh-CN', caseCount: 9, manifestHash: SCIENTIFIC_WEB_CONTRACT.suiteHash, cases },
    scoring: { scoreMin: 0, scoreMax: 10, axes, overallFormula: 'ten_dimension_raw_equal_weight_mean', tieMethod: 'competition', failureScore: 0, unsupportedScore: 0 },
    methodology: {
      suiteId: SCIENTIFIC_WEB_CONTRACT.suiteId, suiteHash: SCIENTIFIC_WEB_CONTRACT.suiteHash, evaluationMode: 'codex_scientific_v2', evaluationEpoch: 'codex-scientific-2026-09-v1',
      reviewProtocol: 'codex-independent-double-review-v2', presentationVersion: 'scientific-leaderboard-v2', expectedCaseCount: 9, dimensions: axes,
      overallFormula: 'ten_dimension_raw_equal_weight_mean', tieMethod: 'competition', failureScore: 0,
      retryPolicy: { confirmedFailureMaxAttempts: 4, unknownProviderOutcome: 'pause_no_retry' }, routePriority: ['bailian', 'ark', 'openrouter'],
      providerBudgetsCny: { bailian: 180, ark: 180, openrouter: 180 }, blindReview: { reviewers: 2, arbitration: 'xhigh_on_dispute', automaticJudges: [] },
      knownLimitations: ['fixed-nine-case-suite', 'single-production-run-per-model', 'human-codex-double-review'], automaticJudges: [], automaticJudgmentCount: 0,
      rankingMethod: { id: 'ten_dimension_raw_equal_weight_mean', axes, weights: axes.map(() => 0.1), tieMethod: 'competition' },
    },
  }
}

function escapePattern(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
}

function jsonResponse(body, { ok = true, status = 200 } = {}) {
  return { ok, status, async text() { return JSON.stringify(body) } }
}

function installFetch(handler) {
  const previousFetch = globalThis.fetch
  const calls = []
  globalThis.fetch = async (input, options = {}) => {
    calls.push({ input, options, body: options.body ? JSON.parse(options.body) : null })
    return handler(calls.length, input, options)
  }
  return { calls, restore() { globalThis.fetch = previousFetch } }
}

function setClipboard(writeText) {
  Object.defineProperty(globalThis.navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  })
}

function deferred() {
  let resolve
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

const malformedResponseVariants = [
  ['object case title', (value) => { value.suite.cases[0].title = { text: 'bad' } }],
  ['object prompt', (value) => { value.suite.cases[0].renderPrompt = { text: 'bad' } }],
  ['constraint object item', (value) => { value.suite.cases[0].requiredRelations = [{ text: 'bad' }] }],
  ['rubric missing axis', (value) => { delete value.suite.cases[0].rubric.topology }],
  ['rubric axis object', (value) => { value.suite.cases[0].rubric.faithfulness = { text: 'bad' } }],
  ['suite title object', (value) => { value.suite.title = { text: 'bad' } }],
  ['suite license malformed', (value) => { value.suite.license.spdx = { text: 'bad' } }],
  ['suite hash malformed', (value) => { value.suite.manifestHash = { hash: 'bad' } }],
  ['scoring malformed', (value) => { value.scoring.maximumSamplesPerModel = { value: 4 } }],
  ['automatic judges malformed', (value) => { value.methodology.automaticJudges = [{ id: 'bad' }] }],
  ['ranking axes missing', (value) => { value.methodology.rankingMethod.axes.pop() }],
  ['ranking axes reordered', (value) => { value.methodology.rankingMethod.axes.reverse() }],
  ['ranking axes contains object', (value) => { value.methodology.rankingMethod.axes[0] = { axis: 'faithfulness' } }],
  ['ranking weights object', (value) => { value.methodology.rankingMethod.weights = Object.fromEntries(axisEntries.map(([axis]) => [axis, 1 / 7])) }],
  ['ranking weights length six', (value) => { value.methodology.rankingMethod.weights.pop() }],
  ['ranking weights length eight', (value) => { value.methodology.rankingMethod.weights.push(1 / 7) }],
  ['ranking weight is NaN', (value) => { value.methodology.rankingMethod.weights[0] = Number.NaN }],
  ['ranking weight is negative', (value) => { value.methodology.rankingMethod.weights[0] = -1 / 7 }],
  ['ranking weights do not sum to one', (value) => { value.methodology.rankingMethod.weights[0] = 0.25 }],
  ['ranking tie differs from scoring', (value) => { value.methodology.rankingMethod.tieMethod = 'ordinal' }],
  ['ranking id differs from formula', (value) => { value.methodology.rankingMethod.id = 'other_formula' }],
]

afterEach(() => {
  cleanup()
  Object.defineProperty(globalThis.navigator, 'clipboard', { configurable: true, value: undefined })
})

test('methodology page requests only methodology and renders the complete public suite document', async () => {
  const fetchMock = installFetch(() => jsonResponse(methodologyResponse))
  try {
    const { container } = render(React.createElement(BenchmarkMethodologyPage, { apiBase: 'https://gateway.example', backendMode: 'gateway' }))
    assert.match(document.body.textContent, /正在读取方法说明/u)

    await screen.findByRole('heading', { name: '评测方法与完整题集' })
    assert.deepEqual(fetchMock.calls.map((call) => call.body), [{ action: 'benchmarkMethodology' }])
    assert.equal(screen.getByRole('link', { name: '返回综合总榜' }).getAttribute('href'), '/leaderboard')
    assert.equal(screen.getByText('方法说明').getAttribute('aria-current'), 'page')

    for (const text of [
      'pb-image-light-v1', 'suite-manifest-public-456', 'release-hash-public-123', 'codex-single-2026-08-v1', 'codex_single',
      'CC-BY-4.0 · PaperBanana contributors · original', 'noOverallScore = false', 'rankingMethod = equal_weight_mean_v1',
      '冻结 / 归一模型', '每模型四题各一次', '禁止自动重试', 'Codex 两遍结构化盲审', 'automaticJudges = 0',
      '至少 3 / 4 入榜', '七维等权', 'competition 1, 1, 3',
      '0–10', '每模型最多 4', '(d1 + d2 + d3 + d4 + d5 + d6 + d7) / 7', 'confirmed_axis_cap',
      'codex-single-two-pass-v1', 'codex', '2 遍', '单一审阅者', '轻量样本', '不同原生分辨率同榜', '方向性比较',
      '不公开盲标签、模型映射、内部审核或签名材料',
    ]) assert.match(container.textContent, new RegExp(escapePattern(text), 'u'))

    const cards = container.querySelectorAll('.bench-method-case')
    assert.equal(cards.length, 4)
    cards.forEach((card, caseIndex) => {
      const index = caseIndex + 1
      const item = methodologyResponse.suite.cases[caseIndex]
      for (const text of [item.id, item.title, item.category, item.caption, item.aspectRatio, item.manifestHash, item.renderPrompt, item.negativePrompt, 'CC-BY-4.0 · PaperBanana contributors · original']) {
        assert.match(card.textContent, new RegExp(escapePattern(text), 'u'))
      }
      assert.equal(within(card).getAllByRole('button').length, 2)
      assert.equal(within(card).getByRole('link', { name: '查看全部模型结果' }).getAttribute('href'), `/leaderboard/cases/${item.id}`)
      for (const heading of ['必需实体', '必需关系', '必需文字', '禁止项']) assert.ok(within(card).getByRole('heading', { name: heading }))
      if (index === 2) assert.match(within(card).getByLabelText('必需实体').textContent, /无/u)
      if (index === 3) assert.match(within(card).getByLabelText('必需文字').textContent, /无/u)
      const rubric = within(card).getByRole('table', { name: `题目 ${index} 七维评分原文` })
      assert.equal(within(rubric).getAllByRole('row').length, 8)
      axisEntries.forEach(([, label]) => assert.match(rubric.textContent, new RegExp(`${label}原文 ${index}，不得摘要。`, 'u')))
    })

    assert.doesNotMatch(container.textContent, /INTERNAL-BLIND|INTERNAL-REVIEW-LOG|INTERNAL-MODEL-MAPPING/u)
    assert.equal(container.querySelectorAll('.bench-method-prompt').length, 8)
    assert.equal(container.querySelectorAll('.bench-method-hash').length >= 5, true)
    const rankingContract = screen.getByLabelText('完整 rankingMethod 合约')
    assert.match(rankingContract.textContent, /equal_weight_mean_v1/u)
    assert.match(rankingContract.textContent, /faithfulness → conciseness → readability → aesthetics → text_accuracy → topology → instruction_adherence/u)
    axisEntries.forEach(([axis]) => assert.match(rankingContract.textContent, new RegExp(`${axis} = ${1 / 7}`, 'u')))
    assert.match(rankingContract.textContent, /tieMethod = competition/u)
    assert.equal(screen.getByRole('link', { name: '提交评估题' }).getAttribute('href'), '/leaderboard/submit-prompt')
  } finally {
    fetchMock.restore()
  }
})

test('scientific v2 methodology shows nine cases, ten axes, zero failures, retries, channels, budgets, and double-blind limits', async () => {
  const fetchMock = installFetch(() => jsonResponse(scientificMethodologyResponse()))
  try {
    const { container } = render(React.createElement(BenchmarkMethodologyPage, { apiBase: 'https://gateway.example', backendMode: 'gateway', showNavigation: false }))
    await screen.findByRole('heading', { name: '评测方法与完整题集' })
    assert.equal(container.querySelectorAll('.bench-method-case').length, 9)
    scientificAxisEntries.forEach(([, label]) => assert.match(container.textContent, new RegExp(escapePattern(label), 'u')))
    for (const text of ['失败记 0', '确认失败最多 4 次', 'UNKNOWN_PROVIDER_OUTCOME', '不自动重试', 'bailian → ark → openrouter', '¥180', '双盲', '争议仲裁', '固定九题', '单次生产运行']) {
      assert.match(container.textContent, new RegExp(escapePattern(text), 'u'))
    }
    assert.equal(screen.queryByRole('navigation', { name: '排行榜导航' }), null)
  } finally { fetchMock.restore() }
})

test('positive and negative copy buttons write exact prompts and announce success', async () => {
  const fetchMock = installFetch(() => jsonResponse(methodologyResponse))
  const copied = []
  setClipboard(async (value) => { copied.push(value) })
  try {
    render(React.createElement(BenchmarkMethodologyPage, { apiBase: 'https://gateway.example', backendMode: 'gateway' }))
    await screen.findByRole('heading', { name: '评测方法与完整题集' })
    fireEvent.click(screen.getByRole('button', { name: '复制正向提示词：题目 1' }))
    await screen.findByRole('status', { name: '已复制正向提示词' })
    fireEvent.click(screen.getByRole('button', { name: '复制负向提示词：题目 1' }))
    await screen.findByRole('status', { name: '已复制负向提示词' })
    assert.deepEqual(copied, [methodologyResponse.suite.cases[0].renderPrompt, methodologyResponse.suite.cases[0].negativePrompt])
  } finally {
    fetchMock.restore()
  }
})

test('copy failure asks for manual copy and never announces false success', async () => {
  const fetchMock = installFetch(() => jsonResponse(methodologyResponse))
  setClipboard(async () => { throw new Error('clipboard denied') })
  try {
    render(React.createElement(BenchmarkMethodologyPage, { apiBase: 'https://gateway.example', backendMode: 'gateway' }))
    await screen.findByRole('heading', { name: '评测方法与完整题集' })
    fireEvent.click(screen.getByRole('button', { name: '复制负向提示词：题目 2' }))
    await screen.findByRole('status', { name: '复制失败，请手动选择并复制负向提示词' })
    assert.equal(screen.queryByRole('status', { name: /已复制/u }), null)
  } finally {
    fetchMock.restore()
  }
})

test('methodology error retries only the exact methodology request', async () => {
  const fetchMock = installFetch((attempt) => attempt === 1
    ? jsonResponse({ detail: 'method unavailable' }, { ok: false, status: 503 })
    : jsonResponse(methodologyResponse))
  try {
    render(React.createElement(BenchmarkMethodologyPage, { apiBase: 'https://gateway.example', backendMode: 'gateway' }))
    await screen.findByText(/方法说明暂不可用：method unavailable/u)
    fireEvent.click(screen.getByRole('button', { name: '重新加载方法说明' }))
    await screen.findByRole('heading', { name: '评测方法与完整题集' })
    assert.deepEqual(fetchMock.calls.map((call) => call.body), [
      { action: 'benchmarkMethodology' },
      { action: 'benchmarkMethodology' },
    ])
    assert.equal(fetchMock.calls.some((call) => call.body?.action === 'benchmarkLeaderboard'), false)
  } finally {
    fetchMock.restore()
  }
})

test('historical or missing suite response shows a release-specific empty state without a prompt fallback', async () => {
  const fetchMock = installFetch(() => jsonResponse({
    code: 0,
    releaseHash: 'historical-release',
    methodology: { suiteId: 'legacy-suite', noOverallScore: true },
  }))
  try {
    const { container } = render(React.createElement(BenchmarkMethodologyPage, { apiBase: 'https://gateway.example', backendMode: 'gateway' }))
    await screen.findByText('当前 release 未公开可复现题集')
    assert.doesNotMatch(container.textContent, /完整正向提示词|不要水印|题目 1/u)
    assert.deepEqual(fetchMock.calls.map((call) => call.body), [{ action: 'benchmarkMethodology' }])
  } finally {
    fetchMock.restore()
  }
})

test('every malformed methodology field fails closed to the release empty state without throwing', async (t) => {
  const previousConsoleError = console.error
  console.error = () => {}
  try {
    for (const [name, mutate] of malformedResponseVariants) {
      await t.test(name, async () => {
        const response = structuredClone(methodologyResponse)
        mutate(response)
        const fetchMock = installFetch(() => jsonResponse(response))
        try {
          render(React.createElement(BenchmarkMethodologyPage, { apiBase: 'https://gateway.example', backendMode: 'gateway' }))
          await screen.findByText('当前 release 未公开可复现题集')
          assert.equal(screen.queryByRole('heading', { name: '评测方法与完整题集' }), null)
        } finally {
          cleanup()
          fetchMock.restore()
        }
      })
    }
  } finally {
    console.error = previousConsoleError
  }
})

test('a newer copy operation wins when an older clipboard promise finishes last', async () => {
  const fetchMock = installFetch(() => jsonResponse(methodologyResponse))
  const operations = new Map()
  setClipboard((value) => {
    const operation = deferred()
    operations.set(value, operation)
    return operation.promise
  })
  try {
    render(React.createElement(BenchmarkMethodologyPage, { apiBase: 'https://gateway.example', backendMode: 'gateway' }))
    await screen.findByRole('heading', { name: '评测方法与完整题集' })
    const benchmarkCase = methodologyResponse.suite.cases[0]
    fireEvent.click(screen.getByRole('button', { name: '复制正向提示词：题目 1' }))
    fireEvent.click(screen.getByRole('button', { name: '复制负向提示词：题目 1' }))

    await act(async () => { operations.get(benchmarkCase.negativePrompt).resolve() })
    await screen.findByRole('status', { name: '已复制负向提示词' })
    await act(async () => { operations.get(benchmarkCase.renderPrompt).resolve() })

    assert.ok(screen.getByRole('status', { name: '已复制负向提示词' }))
    assert.equal(screen.queryByRole('status', { name: '已复制正向提示词' }), null)
  } finally {
    fetchMock.restore()
  }
})

test('copy status clears after about two seconds', async () => {
  const fetchMock = installFetch(() => jsonResponse(methodologyResponse))
  setClipboard(async () => {})
  try {
    render(React.createElement(BenchmarkMethodologyPage, { apiBase: 'https://gateway.example', backendMode: 'gateway' }))
    await screen.findByRole('heading', { name: '评测方法与完整题集' })
    fireEvent.click(screen.getByRole('button', { name: '复制正向提示词：题目 1' }))
    await screen.findByRole('status', { name: '已复制正向提示词' })
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 2100)) })
    assert.equal(screen.queryByRole('status'), null)
  } finally {
    fetchMock.restore()
  }
})

test('resolving a clipboard operation after unmount schedules no status timer or state warning', async () => {
  const fetchMock = installFetch(() => jsonResponse(methodologyResponse))
  const operation = deferred()
  const previousSetTimeout = globalThis.setTimeout
  const previousConsoleError = console.error
  const errors = []
  let statusTimers = 0
  setClipboard(() => operation.promise)
  try {
    const view = render(React.createElement(BenchmarkMethodologyPage, { apiBase: 'https://gateway.example', backendMode: 'gateway' }))
    await screen.findByRole('heading', { name: '评测方法与完整题集' })
    globalThis.setTimeout = (callback, delay, ...args) => {
      if (delay === 2000) statusTimers += 1
      return previousSetTimeout(callback, delay, ...args)
    }
    console.error = (...args) => { errors.push(args.join(' ')) }
    fireEvent.click(screen.getByRole('button', { name: '复制正向提示词：题目 1' }))
    view.unmount()
    await act(async () => { operation.resolve(); await operation.promise })

    assert.equal(statusTimers, 0)
    assert.equal(errors.some((message) => /unmount|state update/iu.test(message)), false)
  } finally {
    globalThis.setTimeout = previousSetTimeout
    console.error = previousConsoleError
    fetchMock.restore()
  }
})
