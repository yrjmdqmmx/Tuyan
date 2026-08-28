import assert from 'node:assert/strict'
import test, { afterEach } from 'node:test'

import { cleanup, render, screen } from '@testing-library/react'
import React from 'react'

import { BenchmarkObservatory } from './BenchmarkPage.jsx'

afterEach(cleanup)

const release = {
  releaseId: 'release-1',
  releaseHash: 'release-hash',
  profileStatus: 'published',
  suiteId: 'pb-image-light-v1',
  evaluationMode: 'codex_single',
  evaluationEpoch: 'codex-single-2026-08-v1',
  reviewProtocol: 'codex-single-two-pass-v1',
  reviewerEpoch: 'codex-single-2026-08-v1',
  sampleCount: 7,
  auditRatio: 1,
  models: [
    { profileId: 'qwen-image:codex_single:epoch', canonicalModelId: 'qwen-image', modelId: 'qwen-image', displayName: 'Qwen Image', provider: 'bailian', providerLabel: '阿里百炼', primaryAccessProvider: 'bailian', alternateAccessProviders: ['openrouter'], developer: 'Alibaba', profileStatus: 'published', ranked: true, sampleCount: 4, successRate: 1, latency: { p50Seconds: 35, p90Seconds: 60 }, estimatedCost: { usd: 0.2, generationCalls: 4, automaticJudgeCalls: 0 }, actualOutputPixels: [{ width: 2048, height: 2048, megapixels: 4.19, fileSizeBytes: 4096 }], dimensions: { text_accuracy: { mean: 9.2, ci95: { low: 8.9, high: 9.4 } }, aesthetics: { mean: 8.4, ci95: { low: 8.1, high: 8.7 } } } },
    { profileId: 'seedream:codex_single:epoch', canonicalModelId: 'seedream', modelId: 'seedream', displayName: 'Seedream', provider: 'ark', providerLabel: '火山方舟', primaryAccessProvider: 'ark', alternateAccessProviders: [], developer: 'ByteDance', profileStatus: 'published', ranked: false, unrankedReason: 'INSUFFICIENT_SAMPLES', sampleCount: 3, successRate: 0.75, actualOutputPixels: [{ width: 1024, height: 1024, megapixels: 1.05, fileSizeBytes: 2048 }], dimensions: { text_accuracy: { mean: 8.8, ci95: { low: 8, high: 9.3 } }, aesthetics: { mean: 9.3, ci95: { low: 8.7, high: 9.7 } } } },
  ],
  evidence: [{ sampleId: 's1', modelId: 'qwen-image', kind: 'median', caption: '中位样本', imageUrl: 'https://example.com/image.png' }],
}

test('observatory presents seven single dimensions and never renders an overall score', () => {
  const { container } = render(React.createElement(BenchmarkObservatory, { release, selectedModelId: '', onSelectModel() {} }))
  assert.equal(screen.getAllByRole('tab').length, 7)
  assert.match(container.textContent, /模型特点速览/)
  assert.match(container.textContent, /单维排行榜/)
  assert.doesNotMatch(container.textContent, /综合总分[:：]\s*\d|Overall Score[:：]\s*\d/)
  assert.match(container.textContent, /OpenRouter/)
  assert.match(container.textContent, /Alibaba/)
  assert.match(container.textContent, /每个实际模型固定 4 张/)
  assert.match(container.textContent, /Codex 全量两遍盲审/)
  assert.doesNotMatch(container.textContent, /双模型盲评|临时集|正式集|临时画像/)
})

test('insufficient profile stays visible with pixels but is excluded from quality ranking', () => {
  const { container } = render(React.createElement(BenchmarkObservatory, { release, selectedModelId: 'seedream:codex_single:epoch', onSelectModel() {} }))
  assert.match(container.textContent, /样本不足、未排名/)
  assert.match(container.textContent, /1024×1024/)
  assert.match(container.textContent, /3\/4/)
  assert.match(container.textContent, /8\.7–9\.7/)
})

test('model deep-link selection opens the complete profile and matching evidence', () => {
  render(React.createElement(BenchmarkObservatory, { release, selectedModelId: 'qwen-image:codex_single:epoch', onSelectModel() {} }))
  assert.equal(screen.getByRole('dialog').getAttribute('data-model-id'), 'qwen-image')
  assert.match(screen.getByRole('dialog').textContent, /中位样本/)
  assert.match(screen.getByRole('dialog').textContent, /Codex 全量两遍结构化盲审/)
  assert.match(screen.getByRole('dialog').textContent, /替代渠道：OpenRouter/)
})
