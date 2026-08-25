import assert from 'node:assert/strict'
import test, { afterEach } from 'node:test'

import { cleanup, render, screen } from '@testing-library/react'
import React from 'react'

import { BenchmarkObservatory } from './BenchmarkPage.jsx'

afterEach(cleanup)

const release = {
  releaseId: 'release-1',
  releaseHash: 'release-hash',
  profileStatus: 'verified',
  suiteId: 'pb-image-diagnostic-v1',
  judgeEpoch: 'judge-2026-08-v1',
  reviewerEpoch: 'codex-2026-08-v1',
  lane: '2K-standard',
  sampleCount: 144,
  auditRatio: 0.1,
  models: [
    { modelId: 'qwen-image', displayName: 'Qwen Image', provider: 'openrouter', providerLabel: 'OpenRouter', developer: 'Alibaba', profileStatus: 'verified', sampleCount: 144, successRate: 0.98, latency: { p50Seconds: 35, p90Seconds: 60 }, estimatedCost: { usd: 4.2 }, traits: [{ axis: 'text_accuracy', direction: 'strength', delta: 0.7 }], dimensions: { text_accuracy: { mean: 9.2, ci95: { low: 8.9, high: 9.4 } }, aesthetics: { mean: 8.4, ci95: { low: 8.1, high: 8.7 } } } },
    { modelId: 'seedream', displayName: 'Seedream', provider: 'ark', providerLabel: '火山方舟', developer: 'ByteDance', profileStatus: 'provisional', sampleCount: 24, successRate: 0.96, dimensions: { text_accuracy: { mean: 8.8, ci95: { low: 8, high: 9.3 } }, aesthetics: { mean: 9.3, ci95: { low: 8.7, high: 9.7 } } }, traits: [{ axis: 'aesthetics', direction: 'strength', delta: 1 }] },
  ],
  evidence: [{ sampleId: 's1', modelId: 'qwen-image', kind: 'median', caption: '中位样本', imageUrl: 'https://example.com/image.png' }],
}

test('observatory presents seven single dimensions and never renders an overall score', () => {
  const { container } = render(React.createElement(BenchmarkObservatory, { release, selectedModelId: '', onSelectModel() {} }))
  assert.equal(screen.getAllByRole('tab').length, 7)
  assert.match(container.textContent, /模型特点速览/)
  assert.match(container.textContent, /单维排行榜/)
  assert.doesNotMatch(container.textContent, /综合总分|Overall Score/)
  assert.match(container.textContent, /OpenRouter/)
  assert.match(container.textContent, /Alibaba/)
})

test('provisional profile shows sample and interval but cannot display a leading trait badge', () => {
  const { container } = render(React.createElement(BenchmarkObservatory, { release, selectedModelId: 'seedream', onSelectModel() {} }))
  assert.match(container.textContent, /临时画像/)
  assert.match(container.textContent, /24/)
  assert.match(container.textContent, /8\.7–9\.7/)
  assert.doesNotMatch(container.textContent, /美观度强项/)
})

test('model deep-link selection opens the complete profile and matching evidence', () => {
  render(React.createElement(BenchmarkObservatory, { release, selectedModelId: 'qwen-image', onSelectModel() {} }))
  assert.equal(screen.getByRole('dialog').getAttribute('data-model-id'), 'qwen-image')
  assert.match(screen.getByRole('dialog').textContent, /中位样本/)
  assert.match(screen.getByRole('dialog').textContent, /Codex 结构化审核/)
})
