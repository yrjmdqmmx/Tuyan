import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  BENCHMARK_AXES,
  PB_IMAGE_LIGHT_V1,
  PB_SCIENTIFIC_FIGURE_V2,
  SCIENTIFIC_AXIS_WEIGHTS,
  SCIENTIFIC_BENCHMARK_AXES,
  SCIENTIFIC_BENCHMARK_IDENTITY,
  SCIENTIFIC_EDIT_SOURCE,
  aggregateScientificFixedSlots,
  buildScientificV2CanonicalManifest,
  canonicalHash,
  createScientificReviewPacket,
  rankScientificModels,
  readScientificEditSourcePng,
  scientificOverallScore,
  verifyScientificReviewPacket,
} from '../src/index.js'

test('scientific v2 identity and ten equal-weight axes are immutable and do not alter v1', () => {
  assert.deepEqual(SCIENTIFIC_BENCHMARK_IDENTITY, {
    suiteId: 'pb-scientific-figure-v2',
    evaluationMode: 'codex_scientific_v2',
    evaluationEpoch: 'codex-scientific-2026-09-v1',
    reviewProtocol: 'codex-independent-double-review-v2',
    presentationVersion: 'scientific-leaderboard-v2',
  })
  assert.deepEqual(SCIENTIFIC_BENCHMARK_AXES, [
    'scientific_faithfulness',
    'structural_topology',
    'text_symbol_accuracy',
    'quantitative_accuracy',
    'instruction_adherence',
    'readability_visual_hierarchy',
    'information_density',
    'publication_aesthetics',
    'edit_target_accuracy',
    'non_target_preservation',
  ])
  assert.equal(Object.isFrozen(SCIENTIFIC_BENCHMARK_IDENTITY), true)
  assert.equal(Object.isFrozen(SCIENTIFIC_BENCHMARK_AXES), true)
  assert.equal(Object.isFrozen(SCIENTIFIC_AXIS_WEIGHTS), true)
  assert.deepEqual(Object.values(SCIENTIFIC_AXIS_WEIGHTS), Array(10).fill(0.1))
  assert.deepEqual(BENCHMARK_AXES, ['faithfulness', 'conciseness', 'readability', 'aesthetics', 'text_accuracy', 'topology', 'instruction_adherence'])
  assert.equal(PB_IMAGE_LIGHT_V1.id, 'pb-image-light-v1')
  assert.equal(PB_IMAGE_LIGHT_V1.cases.length, 4)
})

test('scientific suite freezes six generation and three localized edit slots in explicit order', () => {
  assert.equal(PB_SCIENTIFIC_FIGURE_V2.id, SCIENTIFIC_BENCHMARK_IDENTITY.suiteId)
  assert.equal(PB_SCIENTIFIC_FIGURE_V2.caseCount, 9)
  assert.deepEqual(PB_SCIENTIFIC_FIGURE_V2.cases.map((item) => item.id), [
    'scientific-gen-01-method-flow',
    'scientific-gen-02-biological-pathway',
    'scientific-gen-03-model-architecture',
    'scientific-gen-04-quantitative-panels',
    'scientific-gen-05-math-bilingual',
    'scientific-gen-06-controls-negative-constraints',
    'scientific-edit-01-text-label',
    'scientific-edit-02-node-arrow',
    'scientific-edit-03-color-legend-callout',
  ])
  assert.equal(PB_SCIENTIFIC_FIGURE_V2.cases.filter((item) => item.kind === 'generation').length, 6)
  assert.equal(PB_SCIENTIFIC_FIGURE_V2.cases.filter((item) => item.kind === 'edit').length, 3)
  assert.equal(Object.isFrozen(PB_SCIENTIFIC_FIGURE_V2), true)
  assert.equal(Object.isFrozen(PB_SCIENTIFIC_FIGURE_V2.cases), true)
  for (const scientificCase of PB_SCIENTIFIC_FIGURE_V2.cases) {
    assert.ok(scientificCase.applicableAxes.length > 0)
    assert.equal(new Set(scientificCase.applicableAxes).size, scientificCase.applicableAxes.length)
    assert.equal(scientificCase.manifestHash, canonicalHash({ ...scientificCase, manifestHash: undefined }))
  }
  assert.equal(PB_SCIENTIFIC_FIGURE_V2.manifestHash, canonicalHash({ ...PB_SCIENTIFIC_FIGURE_V2, manifestHash: undefined }))
})

test('fixed-slot aggregation scores failed and unsupported applicable slots as zero and fails closed on non-execution', () => {
  const attempts = PB_SCIENTIFIC_FIGURE_V2.cases.map((scientificCase, index) => ({
    caseId: scientificCase.id,
    status: index === 0 ? 'failed' as const : index === 1 ? 'unsupported' as const : 'succeeded' as const,
    ...(index > 1 ? { scores: Object.fromEntries(scientificCase.applicableAxes.map((axis) => [axis, 10])) } : {}),
  }))
  const result = aggregateScientificFixedSlots(attempts)
  assert.equal(result.byAxis.scientific_faithfulness.denominator, 6)
  assert.equal(result.byAxis.scientific_faithfulness.zeroedSlots, 2)
  assert.equal(result.byAxis.scientific_faithfulness.mean, 40 / 6)
  assert.equal(result.byAxis.edit_target_accuracy.denominator, 3)
  assert.equal(result.byAxis.edit_target_accuracy.mean, 10)

  assert.throws(() => aggregateScientificFixedSlots(attempts.slice(1)), /SCIENTIFIC_FIXED_SLOT_SET_MISMATCH/)
  assert.throws(() => aggregateScientificFixedSlots(attempts.map((attempt, index) => index === 2 ? { caseId: attempt.caseId, status: 'not_executed' as const } : attempt)), /SCIENTIFIC_SLOT_NOT_EXECUTED/)
  assert.throws(() => aggregateScientificFixedSlots(attempts.map((attempt, index) => index === 2 ? { caseId: attempt.caseId, status: 'budget_blocked' as const } : attempt)), /SCIENTIFIC_SLOT_BUDGET_BLOCKED/)
  assert.throws(() => aggregateScientificFixedSlots(attempts.map((attempt, index) => index === 2 ? { caseId: attempt.caseId, status: 'unknown' as never } : attempt)), /INVALID_SCIENTIFIC_SLOT_STATUS/)
})

test('overall uses the raw ten-axis mean and raw-precision competition ranking', () => {
  const scores = Object.fromEntries(SCIENTIFIC_BENCHMARK_AXES.map((axis) => [axis, 8]))
  assert.equal(scientificOverallScore(scores), 8)
  const higher = { ...scores, scientific_faithfulness: 8.000_000_2 }
  const tied = { ...scores, scientific_faithfulness: 8.000_000_2 }
  const lower = { ...scores, scientific_faithfulness: 8.000_000_1 }
  const ranked = rankScientificModels([
    { modelId: 'lower', scores: lower },
    { modelId: 'higher', scores: higher },
    { modelId: 'tied', scores: tied },
  ])
  assert.deepEqual(ranked.map((item) => [item.modelId, item.overallRank]), [['higher', 1], ['tied', 1], ['lower', 3]])
  assert.ok(ranked[0].overallScore > ranked[2].overallScore)
  assert.throws(() => scientificOverallScore({ ...scores, quantitative_accuracy: Number.NaN }), /INVALID_SCIENTIFIC_AXIS_SCORE/)
})

test('three edit slots share one stable hand-authored SVG and deterministic 2048px PNG', () => {
  const svg = readFileSync(SCIENTIFIC_EDIT_SOURCE.svgPath)
  const png = readFileSync(SCIENTIFIC_EDIT_SOURCE.pngPath)
  assert.equal(createHash('sha256').update(svg).digest('hex'), '63301dfa409425e311f73af69c8ce3aa844893ce8706560a6c4c211c45167c18')
  assert.equal(SCIENTIFIC_EDIT_SOURCE.svgHash, '63301dfa409425e311f73af69c8ce3aa844893ce8706560a6c4c211c45167c18')
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10])
  assert.equal(png.readUInt32BE(16), 2048)
  assert.equal(png.readUInt32BE(20), 1152)
  assert.deepEqual(readScientificEditSourcePng(), png)
  assert.equal(createHash('sha256').update(png).digest('hex'), '484ca42fba92295797cf8875ac8c2a8e80edf242bc9710e6b9fb23aa1b24a0f3')
  assert.equal(SCIENTIFIC_EDIT_SOURCE.sourceHash, '484ca42fba92295797cf8875ac8c2a8e80edf242bc9710e6b9fb23aa1b24a0f3')

  const editBindings = PB_SCIENTIFIC_FIGURE_V2.cases.filter((item) => item.kind === 'edit').map((item) => ({
    id: item.id,
    sourceHash: item.sourceHash,
    region: item.region,
    instruction: item.instruction,
  }))
  assert.deepEqual(editBindings, [
    { id: 'scientific-edit-01-text-label', sourceHash: SCIENTIFIC_EDIT_SOURCE.sourceHash, region: '01-text-label', instruction: '仅将区域 1 的“Ligand A / 配体 A”改为“Ligand B / 配体 B”；其他文字、节点、箭头、颜色和布局保持不变。' },
    { id: 'scientific-edit-02-node-arrow', sourceHash: SCIENTIFIC_EDIT_SOURCE.sourceHash, region: '02-node-arrow', instruction: '仅在区域 2 删除 K1→K3 的下方分支箭头与 K3 节点；K1→K2 分支及其他区域保持不变。' },
    { id: 'scientific-edit-03-color-legend-callout', sourceHash: SCIENTIFIC_EDIT_SOURCE.sourceHash, region: '03-color-legend-callout', instruction: '仅在区域 3 将 activation 色块改为紫色、同步图例，并把 response callout 改为实线；其他内容保持不变。' },
  ])
})

test('v2 canonical planning filters production routes, excludes normalized OpenRouter OpenAI/Google identities and never substitutes edit modes', () => {
  const image = (id: string, vendor: string, canonicalModelId: string, imageEditMode: 'direct-edit' | 'analyze-redraw' | 'none' = 'direct-edit', overrides = {}) => ({
    id, label: `display ${id}`, vendor, canonicalModelId, selectable: true, roles: ['image'],
    capabilities: { imageGeneration: true, imageEditMode, resolutions: ['2K'] }, ...overrides,
  })
  const registry = { providers: {
    bailian: { models: [image('bailian-shared', 'Alibaba', 'shared', 'analyze-redraw')] },
    ark: { models: [image('ark-shared', 'ByteDance', 'shared')] },
    openrouter: { models: [
      image('vendor/shared', 'Acme', 'shared'),
      image('openai/gpt-image-2', 'Acme', 'or-openai'),
      image('innocent-id', 'OpenAI, Inc.', 'or-openai-vendor'),
      image('google/gemini-image', 'Acme', 'or-google'),
      image('sourceful/kept', 'Sourceful', 'kept-despite-label', 'direct-edit', { label: 'OpenAI-style label is not identity' }),
      image('disabled/image', 'Acme', 'disabled', 'direct-edit', { selectable: false }),
      { ...image('main-only', 'Acme', 'main-only'), roles: ['main'] },
    ] },
  } }
  const manifest = buildScientificV2CanonicalManifest({ registryVersion: 'production-v1', registryHash: 'a'.repeat(64), registry })
  const shared = manifest.models.find((item) => item.canonicalModelId === 'shared')!
  assert.equal(shared.generationRoute?.provider, 'bailian')
  assert.equal(shared.editRoute?.provider, 'ark')
  assert.equal(shared.routes.map((item) => item.provider).join(','), 'bailian,ark,openrouter')
  assert.equal(manifest.models.some((item) => item.canonicalModelId === 'or-openai'), false)
  assert.equal(manifest.models.some((item) => item.canonicalModelId === 'or-openai-vendor'), false)
  assert.equal(manifest.models.some((item) => item.canonicalModelId === 'or-google'), false)
  assert.equal(manifest.models.some((item) => item.canonicalModelId === 'kept-despite-label'), true)
  assert.equal(manifest.models.some((item) => item.canonicalModelId === 'disabled'), false)
  const synthetic = manifest.models.find((item) => item.canonicalModelId === 'codex:gpt-image-2')!
  assert.equal(synthetic.displayName, 'OpenAI GPT Image 2 · Codex 内置渠道')
  assert.equal(synthetic.generationRoute?.provider, 'codex')
  assert.equal(synthetic.editRoute?.editMode, 'direct-edit')
  assert.equal(shared.routes.find((item) => item.provider === 'bailian')?.editMode, 'analyze-redraw')
})

test('scientific review packets bind case, axes, rubric, attempt and edit source/output/instruction/region', () => {
  const generationCase = PB_SCIENTIFIC_FIGURE_V2.cases[0]
  const editCase = PB_SCIENTIFIC_FIGURE_V2.cases[6]
  const packet = createScientificReviewPacket({
    suiteManifestHash: PB_SCIENTIFIC_FIGURE_V2.manifestHash,
    packetId: 'packet-a',
    runHash: 'a'.repeat(64),
    issuedAt: '2026-09-01T00:00:00.000Z',
    signingSecret: 't'.repeat(32),
    items: [
      {
        caseId: generationCase.id,
        caseManifestHash: generationCase.manifestHash,
        applicableAxes: generationCase.applicableAxes,
        imageHash: 'b'.repeat(64),
        rubric: generationCase.rubric,
        instruction: generationCase.instruction,
        negativePrompt: generationCase.negativePrompt,
        aspectRatio: generationCase.aspectRatio,
        attemptResult: { status: 'succeeded', routeId: 'bailian:model-a', attemptHash: '1'.repeat(64) },
      },
      {
        caseId: editCase.id,
        caseManifestHash: editCase.manifestHash,
        applicableAxes: editCase.applicableAxes,
        imageHash: 'c'.repeat(64),
        rubric: editCase.rubric,
        attemptResult: { status: 'succeeded', routeId: 'ark:model-b', attemptHash: '2'.repeat(64) },
        sourceHash: editCase.sourceHash,
        editedHash: 'c'.repeat(64),
        region: editCase.region,
        instruction: editCase.instruction,
      },
    ],
  })
  assert.equal(Object.isFrozen(packet), true)
  assert.equal(verifyScientificReviewPacket(packet, 't'.repeat(32)).packetHash, packet.packetHash)
  const editPacketItem = packet.items[1]
  assert.equal(editPacketItem.kind, 'edit')
  if (editPacketItem.kind !== 'edit') throw new Error('expected edit review item')

  const tamper = (change: Record<string, unknown>) => ({
    ...packet,
    items: [packet.items[0], { ...packet.items[1], ...change }],
  })
  for (const changed of [
    tamper({ sourceHash: 'd'.repeat(64) }),
    tamper({ imageHash: 'd'.repeat(64), editedHash: 'd'.repeat(64) }),
    tamper({ instruction: `${editPacketItem.instruction} tampered` }),
    tamper({ region: 'other-region' }),
    { ...packet, attestation: 'e'.repeat(64) },
  ]) assert.throws(() => verifyScientificReviewPacket(changed, 't'.repeat(32)), /SCIENTIFIC_REVIEW_.*MISMATCH/)
})
