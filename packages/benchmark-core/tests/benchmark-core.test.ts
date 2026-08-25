import assert from 'node:assert/strict'
import test from 'node:test'

import {
  BENCHMARK_AXES,
  BENCHMARK_COLLECTIONS,
  BENCHMARK_LANE_ORDER,
  BENCHMARK_RUN_TRANSITIONS,
  PB_IMAGE_DIAGNOSTIC_V1,
  aggregateAxisScores,
  applyCodexAdjudication,
  assertBenchmarkTransition,
  buildAuditSelection,
  createCodexReviewPacket,
  importCodexReview,
  canonicalHash,
  deriveRelativeTraits,
  planBenchmarkCases,
  selectBenchmarkLane,
  benchmarkImmutableRunBinding,
} from '../src/index.js'

test('pb-image-diagnostic-v1 is an immutable 48-case, eight-category suite', () => {
  assert.equal(PB_IMAGE_DIAGNOSTIC_V1.id, 'pb-image-diagnostic-v1')
  assert.equal(PB_IMAGE_DIAGNOSTIC_V1.cases.length, 48)
  assert.equal(Object.isFrozen(PB_IMAGE_DIAGNOSTIC_V1), true)
  assert.equal(Object.isFrozen(PB_IMAGE_DIAGNOSTIC_V1.cases), true)

  const byCategory = new Map<string, number>()
  const ids = new Set<string>()
  for (const diagnosticCase of PB_IMAGE_DIAGNOSTIC_V1.cases) {
    byCategory.set(diagnosticCase.category, (byCategory.get(diagnosticCase.category) || 0) + 1)
    ids.add(diagnosticCase.id)
    assert.ok(diagnosticCase.renderPrompt.length > 40)
    assert.ok(diagnosticCase.caption.length > 10)
    assert.ok(diagnosticCase.license.spdx)
    assert.equal(diagnosticCase.manifestHash, canonicalHash({
      ...diagnosticCase,
      manifestHash: undefined,
    }))
  }
  assert.equal(byCategory.size, 8)
  assert.deepEqual([...byCategory.values()], Array(8).fill(6))
  assert.equal(ids.size, 48)
  assert.equal(PB_IMAGE_DIAGNOSTIC_V1.cases.filter((item) => item.aspectRatio === 'auto').length, 42)
  assert.equal(PB_IMAGE_DIAGNOSTIC_V1.cases.filter((item) => item.aspectRatio !== 'auto').length, 6)
  assert.equal(PB_IMAGE_DIAGNOSTIC_V1.quickCaseIds.length, 12)
  assert.equal(new Set(PB_IMAGE_DIAGNOSTIC_V1.quickCaseIds).size, 12)
  assert.equal(PB_IMAGE_DIAGNOSTIC_V1.manifestHash, canonicalHash({
    ...PB_IMAGE_DIAGNOSTIC_V1,
    manifestHash: undefined,
  }))
})

test('public contract has seven axes, three lanes and an internal append-only dispatch collection', () => {
  assert.deepEqual(BENCHMARK_AXES, [
    'faithfulness',
    'conciseness',
    'readability',
    'aesthetics',
    'text_accuracy',
    'topology',
    'instruction_adherence',
  ])
  assert.deepEqual(BENCHMARK_LANE_ORDER, ['2K-standard', '1K-standard', '4K-standard'])
  assert.deepEqual(Object.values(BENCHMARK_COLLECTIONS), [
    'paperbanana_benchmark_suites',
    'paperbanana_benchmark_models',
    'paperbanana_benchmark_runs',
    'paperbanana_benchmark_samples',
    'paperbanana_benchmark_judgments',
    'paperbanana_benchmark_dispatches',
    'paperbanana_benchmark_releases',
  ])
})

test('capability planning always includes auto cases and records every unsupported fixed-ratio case unambiguously', () => {
  const plan = planBenchmarkCases(PB_IMAGE_DIAGNOSTIC_V1.cases, ['16:9'])
  assert.equal(plan.executableCases.length, 43)
  assert.equal(plan.unsupportedCases.length, 5)
  assert.deepEqual(plan.capabilityGaps, [
    'case=multi_panel_process-05;aspectRatio=1:1',
    'case=proportional_layout-02;aspectRatio=3:4',
    'case=proportional_layout-03;aspectRatio=1:1',
    'case=proportional_layout-05;aspectRatio=21:9',
    'case=proportional_layout-06;aspectRatio=4:3',
  ])
  assert.equal(plan.executableCases.filter((item) => item.aspectRatio === 'auto').length, 42)
})

test('canonical hashes preserve dates and reject unsupported object prototypes', () => {
  assert.notEqual(canonicalHash({ at: new Date('2026-08-25T00:00:00Z') }), canonicalHash({ at: new Date('2026-08-26T00:00:00Z') }))
  assert.throws(() => canonicalHash(new Map([['key', 'value']])), /UNSUPPORTED_CANONICAL_OBJECT/)
})

test('immutable run binding covers full facts, candidate snapshot, aspect ratios, registry and Core integrity attestation', () => {
  const runFacts = { runId: 'run-1', aspectRatios: ['16:9', '1:1'], registryHash: 'registry-hash', codeSha: 'a'.repeat(40) }
  const candidateSnapshot = { candidateId: 'candidate-1', aspectRatios: ['16:9', '1:1'], registryHash: 'registry-hash' }
  const input = { runHash: canonicalHash(runFacts), runFacts, candidateSnapshot, runIntegrityAttestation: 'b'.repeat(64) }
  const binding = benchmarkImmutableRunBinding(input)
  assert.equal(binding.runHash, input.runHash)
  assert.equal(binding.runFactsHash, canonicalHash(runFacts))
  assert.equal(binding.candidateSnapshotHash, canonicalHash(candidateSnapshot))
  assert.equal(binding.aspectRatiosHash, canonicalHash(runFacts.aspectRatios))
  assert.equal(binding.registryHash, runFacts.registryHash)
  for (const mutate of [
    { ...input, runHash: 'c'.repeat(64) },
    { ...input, runFacts: { ...runFacts, aspectRatios: ['16:9'] } },
    { ...input, runFacts: { ...runFacts, registryHash: 'other-registry' } },
    { ...input, candidateSnapshot: { ...candidateSnapshot, candidateId: 'other' } },
    { ...input, runIntegrityAttestation: 'c'.repeat(64) },
  ]) assert.notEqual(benchmarkImmutableRunBinding(mutate).immutableFactsHash, binding.immutableFactsHash)
})

test('lane selection chooses 2K then 1K then 4K and fails closed without a lane', () => {
  assert.equal(selectBenchmarkLane(['1K', '2K', '4K']), '2K-standard')
  assert.equal(selectBenchmarkLane(['1K', '4K']), '1K-standard')
  assert.equal(selectBenchmarkLane(['4K']), '4K-standard')
  assert.equal(selectBenchmarkLane([]), null)
})

test('run state machine accepts only declared transitions', () => {
  assert.ok(BENCHMARK_RUN_TRANSITIONS.detected.includes('approved'))
  assert.doesNotThrow(() => assertBenchmarkTransition('quick_review', 'provisional_published'))
  assert.doesNotThrow(() => assertBenchmarkTransition('codex_audit', 'verified_published'))
  assert.throws(() => assertBenchmarkTransition('detected', 'full_running'), /INVALID_BENCHMARK_TRANSITION/)
  assert.throws(() => assertBenchmarkTransition('verified_published', 'quick_running'), /INVALID_BENCHMARK_TRANSITION/)
})

test('scores aggregate repeats inside each case before averaging across cases', () => {
  const result = aggregateAxisScores([
    { caseId: 'case-a', scores: { faithfulness: 10 } },
    { caseId: 'case-a', scores: { faithfulness: 0 } },
    { caseId: 'case-b', scores: { faithfulness: 8 } },
  ], { bootstrapIterations: 500, seed: 'fixed' })
  assert.equal(result.faithfulness.caseCount, 2)
  assert.equal(result.faithfulness.sampleCount, 3)
  assert.equal(result.faithfulness.mean, 6.5)
  assert.ok(result.faithfulness.ci95.low <= 6.5)
  assert.ok(result.faithfulness.ci95.high >= 6.5)
  assert.equal('overallScore' in result, false)
})

test('Codex adjudication uses three-party medians and confirmed red-line caps', () => {
  const result = applyCodexAdjudication({
    automatic: [
      { scores: { readability: 9, topology: 8 }, redLines: [] },
      { scores: { readability: 8, topology: 2 }, redLines: ['missing_required_relation'] },
    ],
    codex: {
      scores: { readability: 7, topology: 3 },
      confirmedRedLines: [{ code: 'missing_required_relation', axis: 'topology', cap: 4 }],
    },
  })
  assert.equal(result.scores.readability, 8)
  assert.equal(result.scores.topology, 3)
  assert.deepEqual(result.appliedCaps, [{ code: 'missing_required_relation', axis: 'topology', cap: 4 }])
})

test('audit selection includes disagreements, red-line conflicts, anomalies, public evidence and deterministic ten percent', () => {
  const samples = Array.from({ length: 20 }, (_, index) => ({
    sampleId: `sample-${String(index).padStart(2, '0')}`,
    disagreement: index === 0 ? 2.1 : 0,
    redLineConflict: index === 1,
    anomalous: index === 2,
    publicEvidence: index === 3,
  }))
  const selection = buildAuditSelection(samples, 'run-hash')
  assert.ok(selection.includes('sample-00'))
  assert.ok(selection.includes('sample-01'))
  assert.ok(selection.includes('sample-02'))
  assert.ok(selection.includes('sample-03'))
  assert.ok(selection.length >= 6)
  assert.deepEqual(selection, buildAuditSelection(samples, 'run-hash'))
})

test('relative traits require verified coverage, magnitude and confidence support', () => {
  const verified = deriveRelativeTraits({
    profileStatus: 'verified',
    coverage: 0.9,
    dimensions: {
      aesthetics: { mean: 8.5, laneMedian: 7.8, differenceCi95: { low: 0.2, high: 1.1 } },
      topology: { mean: 6.5, laneMedian: 7.2, differenceCi95: { low: -1.2, high: -0.1 } },
      readability: { mean: 8, laneMedian: 7.7, differenceCi95: { low: -0.1, high: 0.7 } },
    },
  })
  assert.deepEqual(verified, [
    { axis: 'aesthetics', direction: 'strength', delta: 0.7 },
    { axis: 'topology', direction: 'weakness', delta: -0.7 },
  ])
  assert.deepEqual(deriveRelativeTraits({
    profileStatus: 'provisional',
    coverage: 1,
    dimensions: { aesthetics: { mean: 10, laneMedian: 1, differenceCi95: { low: 8, high: 10 } } },
  }), [])
})

test('Codex packets are blind and imports bind packet, image and rubric hashes', () => {
  const fullScores = Object.fromEntries(BENCHMARK_AXES.map((axis) => [axis, 7]))
  const packetSecurity = { phase: 'quick' as const, issuedAt: '2026-08-25T00:00:00.000Z', expiresAt: '2026-08-26T00:00:00.000Z', signingSecret: 'test-review-signing-secret' }
  const packet = createCodexReviewPacket({
    ...packetSecurity,
    reviewerEpoch: 'codex-2026-08-v1',
    runHash: 'run-hash',
    sourceManifestHash: 'a'.repeat(64),
    sourceManifestAttestation: 'b'.repeat(64),
    samples: [{
      sampleId: 'sample-1',
      imageObjectKey: 'bench/runs/run-1/sample-1.png',
      imageHash: 'image-hash',
      rubric: { topology: 'connections are exact' },
      rubricHash: canonicalHash({ topology: 'connections are exact' }),
      modelId: 'must-not-leak',
      automaticScores: { topology: 2 },
    }],
  })
  const serialized = JSON.stringify(packet)
  assert.equal(serialized.includes('must-not-leak'), false)
  assert.equal(serialized.includes('automaticScores'), false)
  assert.equal(packet.samples[0].blindLabel, 'sample-001')
  assert.equal((packet as any).sourceManifestHash, 'a'.repeat(64))
  assert.equal((packet as any).sourceManifestAttestation, 'b'.repeat(64))

  const imported = importCodexReview(packet, {
    packetHash: packet.packetHash,
    reviewerEpoch: packet.reviewerEpoch,
    judgments: [{
      blindLabel: 'sample-001',
      imageHash: 'image-hash',
      rubricHash: canonicalHash({ topology: 'connections are exact' }),
      scores: fullScores,
      confirmedRedLines: [],
      evidence: ['all required arrows visible'],
      confidence: 0.9,
    }],
  }, { signingSecret: packetSecurity.signingSecret, expectedPhase: 'quick', now: new Date('2026-08-25T12:00:00Z') })
  assert.equal(imported[0].sampleId, 'sample-1')
  assert.match((imported as any).attestation, /^[a-f0-9]{64}$/)
  assert.equal((imported as any).reviewHash, canonicalHash({
    packetHash: packet.packetHash,
    reviewerEpoch: packet.reviewerEpoch,
    judgments: [{
      blindLabel: 'sample-001',
      imageHash: 'image-hash',
      rubricHash: canonicalHash({ topology: 'connections are exact' }),
      scores: fullScores,
      confirmedRedLines: [],
      evidence: ['all required arrows visible'],
      confidence: 0.9,
    }],
  }))
  assert.throws(() => importCodexReview(packet, {
    packetHash: packet.packetHash,
    reviewerEpoch: packet.reviewerEpoch,
    judgments: [{ blindLabel: 'sample-001', imageHash: 'wrong', rubricHash: packet.samples[0].rubricHash, scores: fullScores, confirmedRedLines: [], evidence: ['evidence'], confidence: 1 }],
  }, { signingSecret: packetSecurity.signingSecret, expectedPhase: 'quick', now: new Date('2026-08-25T12:00:00Z') }), /CODEX_REVIEW_IMAGE_HASH_MISMATCH/)

  const twoSamplePacket = createCodexReviewPacket({
    ...packetSecurity,
    reviewerEpoch: 'codex-2026-08-v1', runHash: 'two-sample-run',
    samples: [1, 2].map((index) => ({ sampleId: `sample-${index}`, imageObjectKey: `bench/runs/two/sample-${index}.png`, imageHash: `hash-${index}`, rubric: { topology: 'exact' }, rubricHash: canonicalHash({ topology: 'exact' }) })),
  })
  const duplicate = { blindLabel: 'sample-001', imageHash: 'hash-1', rubricHash: canonicalHash({ topology: 'exact' }), scores: fullScores, confirmedRedLines: [], evidence: ['visible evidence'], confidence: 0.9 }
  assert.throws(() => importCodexReview(twoSamplePacket, { packetHash: twoSamplePacket.packetHash, reviewerEpoch: twoSamplePacket.reviewerEpoch, judgments: [duplicate, duplicate] }, { signingSecret: packetSecurity.signingSecret, expectedPhase: 'quick', now: new Date('2026-08-25T12:00:00Z') }), /CODEX_REVIEW_LABEL_SET_MISMATCH/)
})
