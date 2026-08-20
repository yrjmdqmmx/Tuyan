import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildOpenRouterDriftReport,
  openRouterNormalizedImageProfileIds,
} from '../scripts/check-openrouter-model-drift.js'

const paidVerifiedProfileIds = [
  'bytedance-seed/seedream-4.5',
  'bytedance-seed/seedream-5-0-lite',
  'bytedance-seed/seedream-5-0-pro',
  'google/gemini-2.5-flash-image',
  'google/gemini-3-pro-image',
  'google/gemini-3-pro-image-preview',
  'google/gemini-3.1-flash-image',
  'google/gemini-3.1-flash-image-preview',
  'google/gemini-3.1-flash-lite-image',
  'krea/krea-2-large',
  'krea/krea-2-medium',
  'krea/krea-2-medium-turbo',
  'microsoft/mai-image-2.5',
  'microsoft/mai-image-2.5-pro',
  'openai/gpt-5-image',
  'openai/gpt-5-image-mini',
  'openai/gpt-5.4-image-2',
  'openai/gpt-image-1',
  'openai/gpt-image-1-mini',
  'openai/gpt-image-2',
  'qwen/qwen-image-3',
  'qwen/qwen-image-3-pro',
  'recraft/recraft-v3',
  'recraft/recraft-v4',
  'recraft/recraft-v4-pro',
  'recraft/recraft-v4.1',
  'recraft/recraft-v4.1-pro',
  'recraft/recraft-v4.1-utility',
  'recraft/recraft-v4.1-utility-pro',
  'sourceful/riverflow-v2-fast',
  'sourceful/riverflow-v2-pro',
  'sourceful/riverflow-v2.5-fast',
  'x-ai/grok-imagine-image-2.0',
  'x-ai/grok-imagine-image-quality',
].sort()

test('OpenRouter drift policy tracks the exact paid-verified normalization profile', () => {
  assert.deepEqual([...openRouterNormalizedImageProfileIds].sort(), paidVerifiedProfileIds)
})

test('OpenRouter drift check warns when a paid-verified normalized image route disappears', () => {
  const imageModels = openRouterNormalizedImageProfileIds
    .filter((id) => id !== 'recraft/recraft-v4')
    .map((id) => ({ id }))
  imageModels.push({
    id: 'sourceful/riverflow-v2.5-pro',
    supported_parameters: { output_format: { values: ['png'] } },
  } as any)
  const report = buildOpenRouterDriftReport(
    [
      { id: 'openai/gpt-5.6-sol' },
      { id: 'google/gemini-3.7-flash' },
    ],
    imageModels,
  )

  assert.deepEqual(report.missingNormalizedImageProfiles, ['recraft/recraft-v4'])
  assert.equal(report.status, 'warning')
})

test('OpenRouter drift check warns when Seedream 4.5 loses every canonical resolution at or above 2K', () => {
  const imageModels = openRouterNormalizedImageProfileIds.map((id) => ({
    id,
    supported_parameters: id === 'bytedance-seed/seedream-4.5'
      ? { resolution: { values: ['1K', '512', 'HD'] } }
      : {},
  }))
  imageModels.push({
    id: 'sourceful/riverflow-v2.5-pro',
    supported_parameters: { output_format: { values: ['png'] } },
  } as any)
  const report = buildOpenRouterDriftReport(
    [
      { id: 'openai/gpt-5.6-sol' },
      { id: 'google/gemini-3.7-flash' },
    ],
    imageModels,
  )

  assert.deepEqual(report.degradedNormalizedImageProfiles, ['bytedance-seed/seedream-4.5'])
  assert.equal(report.status, 'warning')
})

test('OpenRouter drift check only reports missing recommendations and never auto-promotes catalog additions', () => {
  const report = buildOpenRouterDriftReport(
    ['openai/gpt-5.6-sol', 'vendor/new-text-model'],
    ['sourceful/riverflow-v2.5-pro', 'vendor/new-image-model'],
  )

  assert.deepEqual(report.missingRecommendations, ['google/gemini-3.7-flash'])
  assert.deepEqual(report.nonRuntimeSelectableRecommendations, ['sourceful/riverflow-v2.5-pro'])
  assert.deepEqual(report.unreviewedCatalogAdditions, ['vendor/new-image-model', 'vendor/new-text-model'])
  assert.deepEqual(report.autoPromotions, [])
  assert.equal(report.status, 'warning')
})

test('OpenRouter drift check warns when a present image recommendation lacks explicit PNG or SVG output', () => {
  const report = buildOpenRouterDriftReport(
    [
      { id: 'openai/gpt-5.6-sol' },
      { id: 'google/gemini-3.7-flash' },
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
      { id: 'openai/gpt-5.6-sol' },
      { id: 'google/gemini-3.7-flash' },
    ],
    [
      {
        id: 'sourceful/riverflow-v2.5-pro',
        supported_parameters: { output_format: { values: ['png', 'jpeg'] } },
      },
      ...openRouterNormalizedImageProfileIds.map((id) => ({
        id,
        supported_parameters: id === 'bytedance-seed/seedream-4.5'
          ? { resolution: { values: ['2K', '4K'] } }
          : {},
      })),
    ],
  )

  assert.deepEqual(report.missingRecommendations, [])
  assert.deepEqual(report.nonRuntimeSelectableRecommendations, [])
  assert.deepEqual(report.missingNormalizedImageProfiles, [])
  assert.deepEqual(report.degradedNormalizedImageProfiles, [])
  assert.equal(report.status, 'ok')
})
