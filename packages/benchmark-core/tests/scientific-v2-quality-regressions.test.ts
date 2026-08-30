import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import test from 'node:test'

import {
  PB_SCIENTIFIC_FIGURE_V2,
  SCIENTIFIC_BENCHMARK_AXES,
  buildScientificV2CanonicalManifest,
  canonicalHash,
  compareScientificIdentifiers,
  createScientificReviewPacket,
  rankScientificModels,
  verifyScientificReviewPacket,
} from '../src/index.js'

const signingSecret = 'q'.repeat(32)
const generationCase = PB_SCIENTIFIC_FIGURE_V2.cases[0]
const editCase = PB_SCIENTIFIC_FIGURE_V2.cases[6]

function generationItem(overrides: Record<string, unknown> = {}) {
  return {
    caseId: generationCase.id,
    caseManifestHash: generationCase.manifestHash,
    applicableAxes: generationCase.applicableAxes,
    imageHash: 'a'.repeat(64),
    rubric: generationCase.rubric,
    instruction: generationCase.instruction,
    negativePrompt: generationCase.negativePrompt,
    aspectRatio: generationCase.aspectRatio,
    attemptResult: { status: 'succeeded', routeId: 'ark:model-a', attemptHash: 'b'.repeat(64) },
    ...overrides,
  }
}

function editItem(overrides: Record<string, unknown> = {}) {
  return {
    caseId: editCase.id,
    caseManifestHash: editCase.manifestHash,
    applicableAxes: editCase.applicableAxes,
    imageHash: 'c'.repeat(64),
    rubric: editCase.rubric,
    instruction: editCase.instruction,
    sourceHash: editCase.sourceHash,
    editedHash: 'c'.repeat(64),
    region: editCase.region,
    attemptResult: { status: 'succeeded', routeId: 'ark:model-b', attemptHash: 'd'.repeat(64) },
    ...overrides,
  }
}

function packet(overrides: Record<string, unknown> = {}) {
  return createScientificReviewPacket({
    suiteManifestHash: PB_SCIENTIFIC_FIGURE_V2.manifestHash,
    packetId: 'quality-packet',
    runHash: 'e'.repeat(64),
    issuedAt: '2026-09-03T00:00:00.000Z',
    signingSecret,
    items: [generationItem(), editItem()],
    ...overrides,
  } as any)
}

function resign(value: any) {
  const {
    schemaVersion, suiteId, evaluationMode, evaluationEpoch, reviewProtocol, presentationVersion,
    suiteManifestHash, packetId, runHash, issuedAt, items,
  } = value
  const packetHash = canonicalHash({
    schemaVersion, suiteId, evaluationMode, evaluationEpoch, reviewProtocol, presentationVersion,
    suiteManifestHash, packetId, runHash, issuedAt, items,
  })
  return { ...value, packetHash, attestation: createHmac('sha256', signingSecret).update(packetHash).digest('hex') }
}

function domainReviewError(error: unknown) {
  return error instanceof Error && /^SCIENTIFIC_REVIEW_[A-Z_]+/.test(error.message)
}

function recursivelyFrozen(value: unknown): boolean {
  if (!value || typeof value !== 'object') return true
  return Object.isFrozen(value) && Object.values(value).every(recursivelyFrozen)
}

test('review packet signs suite/case manifests and exact generation instructions', () => {
  const created = packet()
  assert.equal(created.suiteManifestHash, PB_SCIENTIFIC_FIGURE_V2.manifestHash)
  assert.equal(created.items[0].caseManifestHash, generationCase.manifestHash)
  assert.equal(created.items[0].kind, 'generation')
  if (created.items[0].kind !== 'generation') throw new Error('expected generation item')
  assert.equal(created.items[0].instruction, generationCase.instruction)
  assert.equal(created.items[0].negativePrompt, generationCase.negativePrompt)
  assert.equal(created.items[0].aspectRatio, generationCase.aspectRatio)
  assert.equal(created.items[1].caseManifestHash, editCase.manifestHash)
  assert.equal(recursivelyFrozen(created), true)

  for (const invalid of [
    { suiteManifestHash: 'f'.repeat(64) },
    { items: [generationItem({ caseManifestHash: 'f'.repeat(64) })] },
    { items: [generationItem({ instruction: `${generationCase.instruction} changed` })] },
    { items: [generationItem({ negativePrompt: `${generationCase.negativePrompt} changed` })] },
    { items: [generationItem({ aspectRatio: '1:1' })] },
  ]) assert.throws(() => packet(invalid), domainReviewError)

  const tampered = resign({ ...created, suiteManifestHash: 'f'.repeat(64) })
  assert.throws(() => verifyScientificReviewPacket(tampered, signingSecret), domainReviewError)
})

test('review creator and verifier reject every extra envelope/item/attempt key', () => {
  assert.throws(() => packet({ reviewerIdentity: 'secret-reviewer' }), domainReviewError)
  assert.throws(() => packet({ items: [generationItem({ modelId: 'hidden-model' })] }), domainReviewError)
  assert.throws(() => packet({ items: [generationItem({ attemptResult: { ...generationItem().attemptResult as object, payloadObjectKey: 'private/key' } })] }), domainReviewError)

  const created = packet()
  const withEnvelopeExtra = resign({ ...created, reviewerIdentity: 'secret-reviewer' })
  const withItemExtra = resign({ ...created, items: [{ ...created.items[0], modelId: 'hidden-model' }, created.items[1]] })
  const withAttemptExtra = resign({ ...created, items: [{
    ...created.items[0],
    attemptResult: { ...created.items[0].attemptResult, responseObjectKey: 'private/key' },
  }, created.items[1]] })
  for (const invalid of [withEnvelopeExtra, withItemExtra, withAttemptExtra]) {
    assert.throws(() => verifyScientificReviewPacket(invalid, signingSecret), domainReviewError)
  }

  assert.doesNotThrow(() => packet({ items: [generationItem({
    sourceHash: undefined, editedHash: undefined, region: undefined,
  })] }))
})

test('review schemas reject oversized and malformed values before canonical hashing', () => {
  let deeplyNested: Record<string, unknown> = {}
  for (let index = 0; index < 20_000; index += 1) deeplyNested = { child: deeplyNested }
  const axesWithExtra = [...generationCase.applicableAxes] as any
  axesWithExtra.modelId = 'hidden-model'
  const itemsWithExtra = [generationItem()] as any
  itemsWithExtra.reviewerIdentity = 'hidden-reviewer'
  const malformed = [
    () => packet({ packetId: 'p'.repeat(513) }),
    () => packet({ items: Array.from({ length: 10 }, () => generationItem()) }),
    () => packet({ items: [generationItem({ applicableAxes: 'scientific_faithfulness' })] }),
    () => packet({ items: [generationItem({ applicableAxes: Array(11).fill('scientific_faithfulness') })] }),
    () => packet({ items: [generationItem({ applicableAxes: axesWithExtra })] }),
    () => packet({ items: itemsWithExtra }),
    () => packet({ items: [generationItem({ rubric: { scientific_faithfulness: deeplyNested } })] }),
    () => packet({ items: [generationItem({ rubric: [] })] }),
    () => packet({ items: [generationItem({ instruction: 'x'.repeat(10_001) })] }),
    () => packet({ items: [generationItem({ attemptResult: { ...generationItem().attemptResult as object, routeId: 'r'.repeat(2_049) } })] }),
  ]
  for (const invoke of malformed) assert.throws(invoke, domainReviewError)

  const created = packet()
  const malformedVerifierInputs = [
    resign({ ...created, packetId: 'p'.repeat(513) }),
    resign({ ...created, items: 'not-an-array' }),
    resign({ ...created, items: Array(10).fill(created.items[0]) }),
    resign({ ...created, items: [{ ...created.items[0], applicableAxes: 'axis' }] }),
    { ...created, items: [{ ...created.items[0], rubric: { scientific_faithfulness: deeplyNested } }] },
  ]
  for (const invalid of malformedVerifierInputs) {
    assert.throws(() => verifyScientificReviewPacket(invalid, signingSecret), domainReviewError)
  }
})

function registryImage(id: string, canonicalModelId: string) {
  return {
    id, canonicalModelId, label: id, vendor: 'Acme', selectable: true, roles: ['image'],
    capabilities: { imageGeneration: true, imageEditMode: 'direct-edit' as const, resolutions: ['2K'] },
  }
}

test('manifest rejects reserved identities and physical routes split across canonicals', () => {
  assert.throws(() => buildScientificV2CanonicalManifest({
    registryVersion: 'reserved-v1', registryHash: '1'.repeat(64),
    registry: { providers: { ark: { models: [registryImage('image', 'codex:gpt-image-2')] } } },
  }), /SCIENTIFIC_RESERVED_CANONICAL_IDENTITY/)

  assert.throws(() => buildScientificV2CanonicalManifest({
    registryVersion: 'collision-v1', registryHash: '2'.repeat(64),
    registry: { providers: { ark: { models: [
      registryImage('Same-Route', 'canonical-a'),
      registryImage('same-route', 'canonical-b'),
    ] } } },
  }), /SCIENTIFIC_ROUTE_COLLISION/)

  const idempotent = buildScientificV2CanonicalManifest({
    registryVersion: 'idempotent-v1', registryHash: '3'.repeat(64),
    registry: { providers: { ark: { models: [
      registryImage('same-route', 'canonical-a'),
      registryImage('same-route', 'CANONICAL-A'),
    ] } } },
  })
  assert.equal(idempotent.models.find((item) => item.canonicalModelId === 'canonical-a')?.routes.length, 1)
})

test('manifest validates model IDs and uses an explicit locale-independent byte comparator', () => {
  for (const modelId of ['', ' spaced', 'two words', '模型', 'bad\\route', 'bad//route', 'bad\u0000route']) {
    assert.throws(() => buildScientificV2CanonicalManifest({
      registryVersion: 'invalid-model-v1', registryHash: '4'.repeat(64),
      registry: { providers: { ark: { models: [registryImage(modelId, 'safe-canonical')] } } },
    }), /INVALID_SCIENTIFIC_MODEL_ID/)
  }

  const values = ['a-10', 'A-2', 'a.2', 'a/1', 'a_1', 'z']
  const expected = [...values].sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)))
  assert.deepEqual([...values].sort(compareScientificIdentifiers), expected)

  const manifest = buildScientificV2CanonicalManifest({
    registryVersion: 'byte-sort-v1', registryHash: '5'.repeat(64),
    registry: { providers: { ark: { models: [
      registryImage('z', 'z-model'), registryImage('a_1', 'a_1'), registryImage('a-1', 'a-1'),
    ] } } },
  })
  const expectedModels = [...manifest.models.map((item) => item.canonicalModelId)].sort(compareScientificIdentifiers)
  assert.deepEqual(manifest.models.map((item) => item.canonicalModelId), expectedModels)
})

test('raw-overall ties serialize by modelId bytes, reject duplicates and keep competition ranks', () => {
  const scores = Object.fromEntries(SCIENTIFIC_BENCHMARK_AXES.map((axis) => [axis, 8]))
  const lower = { ...scores, scientific_faithfulness: 7 }
  const ranked = rankScientificModels([
    { modelId: 'z-model', scores },
    { modelId: 'A-model', scores },
    { modelId: 'lower', scores: lower },
  ])
  assert.deepEqual(ranked.map((item) => [item.modelId, item.overallRank]), [
    ['A-model', 1], ['z-model', 1], ['lower', 3],
  ])
  assert.equal(JSON.stringify(ranked), JSON.stringify(rankScientificModels([
    { modelId: 'lower', scores: lower },
    { modelId: 'A-model', scores },
    { modelId: 'z-model', scores },
  ])))
  assert.throws(() => rankScientificModels([
    { modelId: 'duplicate', scores }, { modelId: 'duplicate', scores },
  ]), /DUPLICATE_SCIENTIFIC_MODEL_ID/)
})
