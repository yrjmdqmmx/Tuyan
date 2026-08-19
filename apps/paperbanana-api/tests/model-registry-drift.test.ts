import assert from 'node:assert/strict'
import test from 'node:test'

import { buildOpenRouterDriftReport } from '../scripts/check-openrouter-model-drift.js'

test('OpenRouter drift check only reports missing recommendations and never auto-promotes catalog additions', () => {
  const report = buildOpenRouterDriftReport(
    ['openai/gpt-5.5', 'vendor/new-text-model'],
    ['openai/gpt-image-2', 'vendor/new-image-model'],
  )

  assert.deepEqual(report.missingRecommendations, ['google/gemini-3.6-flash'])
  assert.deepEqual(report.unreviewedCatalogAdditions, ['vendor/new-image-model', 'vendor/new-text-model'])
  assert.deepEqual(report.autoPromotions, [])
  assert.equal(report.status, 'warning')
})
