import assert from 'node:assert/strict'
import { createHash, createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  PB_SCIENTIFIC_FIGURE_V2,
  SCIENTIFIC_EDIT_SOURCE,
  buildScientificV2CanonicalManifest,
  canonicalHash,
  createScientificReviewPacket,
  verifyScientificReviewPacket,
} from '../src/index.js'
import {
  buildScientificEditSvg,
  buildScientificVectorLabel,
  renderScientificEditPng,
} from '../scripts/scientific-edit-assets.js'

function registryImage(id: string, canonicalModelId: string, editMode: 'direct-edit' | 'analyze-redraw' = 'direct-edit', vendor = 'Acme') {
  return {
    id,
    ...(canonicalModelId ? { canonicalModelId } : {}),
    label: id,
    vendor,
    selectable: true,
    roles: ['image'],
    capabilities: { imageGeneration: true, imageEditMode: editMode, resolutions: ['2K'] },
  }
}

function recursivelyFrozen(value: unknown): boolean {
  if (!value || typeof value !== 'object') return true
  return Object.isFrozen(value) && Object.values(value).every(recursivelyFrozen)
}

test('scientific manifest is recursively frozen and its hash cannot drift after mutation attempts', () => {
  const manifest = buildScientificV2CanonicalManifest({
    registryVersion: 'production-freeze-v1',
    registryHash: 'a'.repeat(64),
    registry: { providers: { ark: { models: [registryImage('ark-image', 'frozen-model')] } } },
  })
  const originalHash = manifest.manifestHash
  assert.equal(recursivelyFrozen(manifest), true)
  assert.throws(() => { (manifest.models as any[]).push({}) }, TypeError)
  assert.throws(() => { (manifest.models[0].generationRoute as any).provider = 'openrouter' }, TypeError)
  assert.throws(() => { (manifest.models[0].routes[0].resolutions as any[]).push('4K') }, TypeError)
  assert.equal(manifest.manifestHash, originalHash)
  assert.equal(canonicalHash({ ...manifest, manifestHash: undefined }), originalHash)
})

test('production Seedream 5.0 identities merge Ark and OpenRouter lite with Ark priority', () => {
  const manifest = buildScientificV2CanonicalManifest({
    registryVersion: 'production-seedream-v1',
    registryHash: 'b'.repeat(64),
    registry: { providers: {
      ark: { models: [registryImage('doubao-seedream-5-0-260128', '', 'direct-edit', 'ByteDance Seedream')] },
      openrouter: { models: [registryImage('bytedance-seed/seedream-5-0-lite', '', 'direct-edit', 'ByteDance Seed')] },
    } },
  })
  const seedream = manifest.models.find((item) => item.canonicalModelId === 'seedream-5.0')!
  assert.ok(seedream)
  assert.deepEqual(seedream.routes.map((route) => [route.provider, route.modelId]), [
    ['ark', 'doubao-seedream-5-0-260128'],
    ['openrouter', 'bytedance-seed/seedream-5-0-lite'],
  ])
  assert.equal(seedream.generationRoute?.provider, 'ark')
  assert.equal(seedream.editRoute?.provider, 'ark')
})

test('canonical identity normalization groups whitespace/case variants and rejects dangerous separator drift', () => {
  const manifest = buildScientificV2CanonicalManifest({
    registryVersion: 'identity-normalization-v1',
    registryHash: 'c'.repeat(64),
    registry: { providers: {
      bailian: { models: [registryImage('first', '  Shared-Image  ')] },
      ark: { models: [registryImage('second', 'shared-image')] },
      openrouter: { models: [
        registryImage('openai/gpt-image-2', '  OPENAI/GPT-IMAGE-2  ', 'direct-edit', 'Acme'),
        { ...registryImage('sourceful/kept', ' Kept-Image ', 'direct-edit', 'Sourceful'), label: 'Google image display copy' },
      ] },
    } },
  })
  const shared = manifest.models.find((item) => item.canonicalModelId === 'shared-image')!
  assert.equal(shared.routes.length, 2)
  assert.equal(manifest.models.some((item) => item.canonicalModelId === 'openai/gpt-image-2'), false)
  assert.equal(manifest.models.some((item) => item.canonicalModelId === 'kept-image'), true)

  for (const canonicalModelId of ['', ' / ', 'unsafe//identity', 'unsafe\\identity', 'unsafe:/:identity']) {
    assert.throws(() => buildScientificV2CanonicalManifest({
      registryVersion: 'invalid-identity-v1', registryHash: 'd'.repeat(64),
      registry: { providers: { ark: { models: [{ ...registryImage('route', 'safe'), canonicalModelId }] } } },
    }), /INVALID_SCIENTIFIC_CANONICAL_IDENTITY/)
  }
})

const signingSecret = 'r'.repeat(32)
const generationCase = PB_SCIENTIFIC_FIGURE_V2.cases[0]
const editCase = PB_SCIENTIFIC_FIGURE_V2.cases[6]

function succeededGenerationItem(attemptHash = '1'.repeat(64)) {
  return {
    caseId: generationCase.id,
    caseManifestHash: generationCase.manifestHash,
    applicableAxes: generationCase.applicableAxes,
    imageHash: 'e'.repeat(64),
    rubric: generationCase.rubric,
    instruction: generationCase.instruction,
    negativePrompt: generationCase.negativePrompt,
    aspectRatio: generationCase.aspectRatio,
    attemptResult: { status: 'succeeded' as const, routeId: 'ark:model', attemptHash },
  }
}

function createPacket(overrides: Record<string, unknown> = {}) {
  return createScientificReviewPacket({
    suiteManifestHash: PB_SCIENTIFIC_FIGURE_V2.manifestHash,
    packetId: 'packet-schema', runHash: 'f'.repeat(64), issuedAt: '2026-09-02T00:00:00.000Z',
    signingSecret, items: [succeededGenerationItem()], ...overrides,
  } as any)
}

function resign(packet: any) {
  const base = {
    schemaVersion: packet.schemaVersion,
    suiteId: packet.suiteId,
    evaluationMode: packet.evaluationMode,
    evaluationEpoch: packet.evaluationEpoch,
    reviewProtocol: packet.reviewProtocol,
    presentationVersion: packet.presentationVersion,
    suiteManifestHash: packet.suiteManifestHash,
    packetId: packet.packetId,
    runHash: packet.runHash,
    issuedAt: packet.issuedAt,
    items: packet.items,
  }
  const packetHash = canonicalHash(base)
  return { ...packet, packetHash, attestation: createHmac('sha256', signingSecret).update(packetHash).digest('hex') }
}

test('review items require a concrete 64hex attemptHash and bind it into attemptResultHash/itemHash', () => {
  assert.throws(() => createPacket({ items: [{ ...succeededGenerationItem(), attemptResult: { status: 'succeeded', routeId: 'ark:model' } }] }), /SCIENTIFIC_REVIEW_ATTEMPT_MISMATCH/)
  assert.throws(() => createPacket({ items: [succeededGenerationItem('not-a-hash')] }), /SCIENTIFIC_REVIEW_ATTEMPT_MISMATCH/)
  const first = createPacket()
  const second = createPacket({ items: [succeededGenerationItem('2'.repeat(64))] })
  assert.equal(first.items[0].attemptResultHash, canonicalHash(first.items[0].attemptResult))
  assert.notEqual(first.items[0].attemptResultHash, second.items[0].attemptResultHash)
  assert.notEqual(first.items[0].itemHash, second.items[0].itemHash)
})

test('failed and unsupported edit attempts bind null image/edited hashes while success requires equal valid hashes', () => {
  for (const status of ['failed', 'unsupported'] as const) {
    const packet = createPacket({ items: [{
      caseId: editCase.id,
      caseManifestHash: editCase.manifestHash,
      applicableAxes: editCase.applicableAxes,
      imageHash: null,
      rubric: editCase.rubric,
      attemptResult: { status, routeId: 'ark:model', attemptHash: '3'.repeat(64) },
      sourceHash: editCase.sourceHash,
      editedHash: null,
      region: editCase.region,
      instruction: editCase.instruction,
    }] })
    assert.equal(packet.items[0].imageHash, null)
    assert.equal((packet.items[0] as any).editedHash, null)
    assert.doesNotThrow(() => verifyScientificReviewPacket(packet, signingSecret))
  }
  assert.throws(() => createPacket({ items: [{
    caseId: editCase.id, caseManifestHash: editCase.manifestHash, applicableAxes: editCase.applicableAxes, imageHash: '4'.repeat(64), rubric: editCase.rubric,
    attemptResult: { status: 'succeeded', routeId: 'ark:model', attemptHash: '3'.repeat(64) },
    sourceHash: editCase.sourceHash, editedHash: null, region: editCase.region, instruction: editCase.instruction,
  }] }), /SCIENTIFIC_REVIEW_OUTPUT_MISMATCH/)
})

test('creator and verifier share strict packet schema even when an invalid packet is re-signed', () => {
  for (const overrides of [
    { packetId: '' },
    { packetId: 42 },
    { runHash: 'short' },
    { issuedAt: '2026-09-02' },
    { issuedAt: 'not-a-date' },
    { items: [] },
    { items: [succeededGenerationItem(), succeededGenerationItem('2'.repeat(64))] },
  ]) assert.throws(() => createPacket(overrides), /SCIENTIFIC_REVIEW_/)

  const valid = createPacket()
  for (const change of [
    { packetId: '' },
    { packetId: 42 },
    { runHash: 'short' },
    { issuedAt: '2026-09-02' },
    { issuedAt: 'not-a-date' },
    { items: [] },
    { items: [valid.items[0], valid.items[0]] },
  ]) assert.throws(() => verifyScientificReviewPacket(resign({ ...valid, ...change }), signingSecret), /SCIENTIFIC_REVIEW_.*MISMATCH/)
})

test('scientific source rendering is font-hermetic and benchmark-core directly declares sharp', () => {
  const svg = readFileSync(SCIENTIFIC_EDIT_SOURCE.svgPath, 'utf8')
  const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  const renderScript = readFileSync(new URL('../scripts/render-scientific-edit-source.ts', import.meta.url), 'utf8')
  const assetBuilder = readFileSync(new URL('../scripts/scientific-edit-assets.ts', import.meta.url), 'utf8')
  const lockfile = readFileSync(new URL('../../../pnpm-lock.yaml', import.meta.url), 'utf8')
  assert.equal(/<text\b/i.test(svg), false)
  assert.equal(/font-family|Arial|sans-serif|system-ui/i.test(svg), false)
  assert.ok(svg.includes('data-label="Ligand A / 配体 A"'))
  assert.equal(packageJson.devDependencies.sharp, '0.35.3')
  assert.match(assetBuilder, /import sharp from ['"]sharp['"]/)
  assert.match(renderScript, /renderScientificEditPng\(svg\)/)
  assert.equal(renderScript.includes('apps/benchmark-worker'), false)
  assert.match(lockfile, /packages\/benchmark-core:[\s\S]*?sharp:\s*\n\s*specifier: 0\.35\.3\s*\n\s*version: 0\.35\.3/)
  assert.equal(createHash('sha256').update(svg).digest('hex'), SCIENTIFIC_EDIT_SOURCE.svgHash)
})

test('in-memory SVG build and PNG render reproduce the exact committed scientific source assets', async () => {
  const svg = Buffer.from(buildScientificEditSvg())
  assert.equal(createHash('sha256').update(svg).digest('hex'), SCIENTIFIC_EDIT_SOURCE.svgHash)
  assert.equal(/<text\b|font-family|Arial|sans-serif|system-ui/i.test(svg.toString('utf8')), false)

  const png = await renderScientificEditPng(svg)
  assert.equal(createHash('sha256').update(png).digest('hex'), SCIENTIFIC_EDIT_SOURCE.sourceHash)
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10])
  assert.equal(png.readUInt32BE(16), 2048)
  assert.equal(png.readUInt32BE(20), 1152)
})

test('visible vector glyph paths preserve lowercase instead of hiding uppercase behind data-label metadata', () => {
  const pathData = (value: string) => value.match(/\sd="([^"]+)"\/>$/)?.[1]
  const upperA = buildScientificVectorLabel('A', 0, 0, 14, '#000000')
  const lowerA = buildScientificVectorLabel('a', 0, 0, 14, '#000000')
  assert.notEqual(pathData(upperA), pathData(lowerA))

  const expectedMixedCase = buildScientificVectorLabel('Ligand A / 配体 A', 205, 257, 25, '#17324d')
  const uppercaseImpostor = buildScientificVectorLabel('LIGAND A / 配体 A', 205, 257, 25, '#17324d')
  assert.notEqual(pathData(expectedMixedCase), pathData(uppercaseImpostor))

  const svg = buildScientificEditSvg().toString('utf8')
  const committedLabel = svg.match(/<path data-label="Ligand A \/ 配体 A"[^>]+\/>/)?.[0]
  assert.equal(committedLabel, expectedMixedCase)
})

test('scientific dispute export accepts the exact SSH return-directory owner including root', () => {
  const workflow = readFileSync(new URL('../../../.github/workflows/export-scientific-v2-review-disputes.yml', import.meta.url), 'utf8')
  assert.match(workflow, /return_uid.*\^\[0-9\]\+\$/)
  assert.doesNotMatch(workflow, /return_uid.*\^\[1-9\]\[0-9\]\*\$/)
  assert.match(workflow, /stat -c %a.*\^0\?700\$/)
  assert.match(workflow, /node dist\/scientific-v2-operator\.mjs/)
  assert.match(workflow, /PAPERBANANA_SCIENTIFIC_V2_PRIVATE_OUTPUT_PATH=.*review-finalized\.json/)
  assert.doesNotMatch(workflow, /dist\/scientific-v2-review\.js/)
})
