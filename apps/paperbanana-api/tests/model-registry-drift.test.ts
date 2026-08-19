import assert from 'node:assert/strict'
import test from 'node:test'

import { buildOpenRouterDriftReport } from '../scripts/check-openrouter-model-drift.js'

test('OpenRouter drift check only reports missing recommendations and never auto-promotes catalog additions', () => {
  const report = buildOpenRouterDriftReport(
    ['openai/gpt-5.5', 'vendor/new-text-model'],
    ['sourceful/riverflow-v2.5-pro', 'vendor/new-image-model'],
  )

  assert.deepEqual(report.missingRecommendations, ['google/gemini-3.6-flash'])
  assert.deepEqual(report.nonRuntimeSelectableRecommendations, ['sourceful/riverflow-v2.5-pro'])
  assert.deepEqual(report.unreviewedCatalogAdditions, ['vendor/new-image-model', 'vendor/new-text-model'])
  assert.deepEqual(report.autoPromotions, [])
  assert.equal(report.status, 'warning')
})

test('OpenRouter drift check warns when a present image recommendation lacks explicit PNG or SVG output', () => {
  const report = buildOpenRouterDriftReport(
    [
      { id: 'openai/gpt-5.5' },
      { id: 'google/gemini-3.6-flash' },
    ],
    [{
      id: 'sourceful/riverflow-v2.5-pro',
      supported_parameters: { output_format: { values: ['jpeg'] } },
    }],
  )

  assert.deepEqual(report.missingRecommendations, [])
  assert.deepEqual(report.nonRuntimeSelectableRecommendations, ['sourceful/riverflow-v2.5-pro'])
  assert.equal(report.status, 'warning')
  assert.deepEqual(report.autoPromotions, [])
})

test('OpenRouter drift check accepts an image recommendation with explicit PNG output', () => {
  const report = buildOpenRouterDriftReport(
    [
      { id: 'openai/gpt-5.5' },
      { id: 'google/gemini-3.6-flash' },
    ],
    [{
      id: 'sourceful/riverflow-v2.5-pro',
      supported_parameters: { output_format: { values: ['png', 'jpeg'] } },
    }],
  )

  assert.deepEqual(report.missingRecommendations, [])
  assert.deepEqual(report.nonRuntimeSelectableRecommendations, [])
  assert.equal(report.status, 'ok')
})
