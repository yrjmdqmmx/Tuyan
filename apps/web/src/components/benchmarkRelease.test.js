import assert from 'node:assert/strict'
import test from 'node:test'

import { SCIENTIFIC_WEB_CONTRACT } from './scientificBenchmarkContract.js'

const hex = (character) => character.repeat(64)
const variant = (character, withUrl = false) => ({
  kind: 'detail', imageHash: hex(character), width: 1600, height: 900, fileSizeBytes: 2048, mimeType: 'image/webp',
  ...(withUrl ? { url: `https://signed.example/${character}.webp` } : {}),
})

function succeededSlot(scientificCase, index, withUrl = false) {
  const imageHash = hex(String((index % 9) + 1))
  return {
    caseId: scientificCase.id, kind: scientificCase.kind, status: 'succeeded', imageHash,
    scores: Object.fromEntries(scientificCase.applicableAxes.map((axis) => [axis, 8])),
    reviewNotes: ['加分：双盲审核未确认红线问题'],
    attemptSummary: { count: 1, responseClasses: [index === 1 ? 'succeeded_low_quality' : 'succeeded'] },
    variants: [variant('a', withUrl)],
    ...(scientificCase.kind === 'edit' ? {
      sourceHash: scientificCase.sourceHash, editedHash: imageHash, region: scientificCase.region,
      beforeVariants: [variant('b', withUrl)],
    } : {}),
  }
}

function failedSlot(scientificCase) {
  return {
    caseId: scientificCase.id, kind: scientificCase.kind, status: 'failed', failureReason: 'confirmed_attempts_exhausted',
    attemptSummary: { count: 4, responseClasses: ['confirmed_technical_failure', 'confirmed_provider_failure', 'confirmed_technical_failure', 'confirmed_provider_failure'] },
  }
}

function unsupportedSlot(scientificCase) {
  return {
    caseId: scientificCase.id, kind: 'edit', status: 'unsupported', failureReason: 'direct_edit_route_unavailable',
    attemptSummary: { count: 0, responseClasses: [] },
  }
}

function evidence(withUrl = false) {
  return SCIENTIFIC_WEB_CONTRACT.cases.map((scientificCase, index) => {
    if (index === 5 || index === 8) return failedSlot(scientificCase)
    if (index === 7) return unsupportedSlot(scientificCase)
    return succeededSlot(scientificCase, index, withUrl)
  })
}

function model(withUrl = false) {
  const slots = evidence(withUrl)
  return {
    profileId: 'scientific-profile', modelId: 'scientific-model', canonicalModelId: 'scientific-model', displayName: 'Scientific Model',
    overallScore: 6.5, overallRank: 1,
    scores: Object.fromEntries(SCIENTIFIC_WEB_CONTRACT.axes.map((axis) => [axis, 6.5])),
    dimensions: Object.fromEntries(SCIENTIFIC_WEB_CONTRACT.axes.map((axis) => [axis, { mean: 6.5, denominator: 9, succeededSlots: 6, zeroedSlots: 3 }])),
    dimensionRanks: Object.fromEntries(SCIENTIFIC_WEB_CONTRACT.axes.map((axis) => [axis, 1])),
    generationSuccessRate: 5 / 6, editSuccessRate: 1 / 3, successRate: 6 / 9,
    attemptSummary: { total: 14, succeeded: 6, failed: 2, unsupported: 1 },
    failureReasons: slots.filter((item) => item.failureReason).map((item) => ({ caseId: item.caseId, reason: item.failureReason })),
    evidence: slots,
  }
}

function scientificRelease() {
  return {
    profileStatus: 'published', suiteId: SCIENTIFIC_WEB_CONTRACT.suiteId, suiteHash: SCIENTIFIC_WEB_CONTRACT.suiteHash,
    ...SCIENTIFIC_WEB_CONTRACT.identity, eligibleModelCount: 1,
    rankingMethod: { id: 'ten_dimension_raw_equal_weight_mean', axes: [...SCIENTIFIC_WEB_CONTRACT.axes], weights: SCIENTIFIC_WEB_CONTRACT.axes.map(() => 0.1), tieMethod: 'competition' },
    models: [model()],
  }
}

function publicCases() {
  return SCIENTIFIC_WEB_CONTRACT.cases.map((item) => ({
    ...structuredClone(item), title: item.id, instruction: `instruction ${item.id}`,
    rubric: Object.fromEntries(item.applicableAxes.map((axis) => [axis, `rubric ${axis}`])),
    ...(item.kind === 'generation' ? { negativePrompt: 'negative', aspectRatio: '16:9' } : {}),
  }))
}

test('shared normalizer accepts exact nine-slot release and derives matching rates and attempts', async () => {
  const { normalizeLeaderboardRelease } = await import('./benchmarkRelease.js')
  const source = scientificRelease()
  const normalized = normalizeLeaderboardRelease(source)
  assert.notEqual(normalized, source)
  assert.equal(normalized.models[0].evidence.length, 9)
  assert.deepEqual(normalized.models[0].attemptSummary, { total: 14, succeeded: 6, failed: 2, unsupported: 1 })
})

test('scientific slots are reordered by their case IDs and reject duplicate or missing cases', async () => {
  const { normalizeLeaderboardRelease } = await import('./benchmarkRelease.js')
  const shuffled = scientificRelease()
  shuffled.models[0].evidence.reverse()

  const normalized = normalizeLeaderboardRelease(shuffled)
  assert.deepEqual(normalized?.models[0].evidence.map((slot) => slot.caseId), SCIENTIFIC_WEB_CONTRACT.cases.map((scientificCase) => scientificCase.id))

  const duplicate = scientificRelease()
  duplicate.models[0].evidence[8] = structuredClone(duplicate.models[0].evidence[0])
  assert.equal(normalizeLeaderboardRelease(duplicate), null)
})

test('succeeded evidence fails closed for missing attempts, bad terminal class, image, variants, scores, or edit before/after', async (t) => {
  const { normalizeLeaderboardRelease } = await import('./benchmarkRelease.js')
  const mutations = [
    ['zero attempts', (slot) => { slot.attemptSummary = { count: 0, responseClasses: [] } }],
    ['more than four attempts', (slot) => { slot.attemptSummary = { count: 5, responseClasses: [...Array(4).fill('confirmed_provider_failure'), 'succeeded'] } }],
    ['wrong last response', (slot) => { slot.attemptSummary.responseClasses = ['confirmed_provider_failure'] }],
    ['success has a failure reason', (slot) => { slot.failureReason = 'confirmed_attempts_exhausted' }],
    ['missing image hash', (slot) => { delete slot.imageHash }],
    ['bad variant hash', (slot) => { slot.variants[0].imageHash = 'not-a-hash' }],
    ['missing applicable score', (slot) => { delete slot.scores.scientific_faithfulness }],
    ['extra score', (slot) => { slot.scores.edit_target_accuracy = 8 }],
    ['edit missing before', (_slot, release) => { delete release.models[0].evidence[6].beforeVariants }],
    ['edit hash mismatch', (_slot, release) => { release.models[0].evidence[6].editedHash = hex('f') }],
  ]
  for (const [name, mutate] of mutations) await t.test(name, () => {
    const release = scientificRelease()
    mutate(release.models[0].evidence[0], release)
    assert.equal(normalizeLeaderboardRelease(release), null)
  })
})

test('failed and unsupported evidence cannot carry fake results or invalid attempts', async (t) => {
  const { normalizeLeaderboardRelease } = await import('./benchmarkRelease.js')
  const mutations = [
    ['failed has three attempts', (release) => { const slot = release.models[0].evidence[5]; slot.attemptSummary.count = 3; slot.attemptSummary.responseClasses.pop() }],
    ['failed has succeeded attempt', (release) => { release.models[0].evidence[5].attemptSummary.responseClasses[3] = 'succeeded' }],
    ['failed has fake image', (release) => { release.models[0].evidence[5].imageHash = hex('a'); release.models[0].evidence[5].variants = [variant('b')] }],
    ['failed has fake image dimensions', (release) => { release.models[0].evidence[5].actualOutputPixels = { width: 1600, height: 900 } }],
    ['failed has fake scores', (release) => { release.models[0].evidence[5].scores = { scientific_faithfulness: 0 } }],
    ['generation marked unsupported', (release) => { release.models[0].evidence[5] = unsupportedSlot(SCIENTIFIC_WEB_CONTRACT.cases[5]) }],
    ['unsupported has attempt', (release) => { const slot = release.models[0].evidence[7]; slot.attemptSummary = { count: 1, responseClasses: ['confirmed_provider_failure'] } }],
  ]
  for (const [name, mutate] of mutations) await t.test(name, () => {
    const release = scientificRelease(); mutate(release)
    assert.equal(normalizeLeaderboardRelease(release), null)
  })
})

test('server success rates, attempt aggregates, and failure reasons must equal slot-derived values', async (t) => {
  const { normalizeLeaderboardRelease } = await import('./benchmarkRelease.js')
  for (const [name, mutate] of [
    ['generation rate', (item) => { item.generationSuccessRate = 1 }],
    ['edit rate', (item) => { item.editSuccessRate = 1 }],
    ['overall rate', (item) => { item.successRate = 1 }],
    ['attempt total', (item) => { item.attemptSummary.total = 13 }],
    ['status count', (item) => { item.attemptSummary.failed = 1 }],
    ['failure reasons', (item) => { item.failureReasons = [] }],
  ]) await t.test(name, () => {
    const release = scientificRelease(); mutate(release.models[0])
    assert.equal(normalizeLeaderboardRelease(release), null)
  })
})

test('profile and case responses reuse the same scientific slot validator', async () => {
  const { normalizeScientificProfile, normalizeScientificCaseResponse } = await import('./benchmarkRelease.js')
  const profile = { ...model(true), cases: publicCases(), release: { suiteId: SCIENTIFIC_WEB_CONTRACT.suiteId, suiteHash: SCIENTIFIC_WEB_CONTRACT.suiteHash, ...SCIENTIFIC_WEB_CONTRACT.identity } }
  assert.equal(normalizeScientificProfile(profile)?.evidence.length, 9)
  const editSlot = structuredClone(profile.evidence[6])
  const response = { code: 0, case: publicCases()[6], items: [{ ...editSlot, profileId: profile.profileId, canonicalModelId: profile.canonicalModelId, overallRank: 1, model: { profileId: profile.profileId, modelId: profile.modelId, displayName: profile.displayName, overallRank: 1, overallScore: 6.5 } }], nextCursor: null }
  assert.equal(normalizeScientificCaseResponse(response, editSlot.caseId)?.items.length, 1)
  response.items[0].beforeVariants = []
  assert.equal(normalizeScientificCaseResponse(response, editSlot.caseId), null)
})

test('v1 and historical releases retain their existing shape', async () => {
  const { normalizeLeaderboardRelease } = await import('./benchmarkRelease.js')
  const release = { presentationVersion: 'arena-leaderboard-v1', models: [{ modelId: 'legacy' }] }
  assert.deepEqual(normalizeLeaderboardRelease(release), release)
})
