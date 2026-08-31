import assert from 'node:assert/strict'
import test from 'node:test'

import {
  SCIENTIFIC_EDIT_SOURCE,
  buildScientificV2CanonicalManifest,
  buildScientificV2PriceSnapshot,
  canonicalHash,
  deriveScientificV2PriceRequirements,
  type ScientificV2PriceObservation,
  verifyScientificV2PriceSnapshot,
} from '../src/index.js'

const CAPTURED_AT = '2026-08-31T04:00:00.000Z'
const H64 = (character: string) => character.repeat(64)

function manifest() {
  const registry = { providers: {
    bailian: { models: [{
      id: 'wan-price-test', canonicalModelId: 'wan-price-test', label: 'Wan price test', vendor: 'Alibaba Wan',
      selectable: true, roles: ['image'], capabilities: { imageGeneration: true, imageEditMode: 'direct-edit', resolutions: ['2K'] },
    }] },
    openrouter: { models: [{
      id: 'vendor/or-price-test', canonicalModelId: 'or-price-test', label: 'OR price test', vendor: 'Vendor',
      selectable: true, roles: ['image'], capabilities: { imageGeneration: true, imageEditMode: 'direct-edit', resolutions: ['2K'] },
    }] },
  } } as const
  return buildScientificV2CanonicalManifest({ registryVersion: 'price-test-v1', registryHash: canonicalHash(registry), registry })
}

const source = (url: string, hashCharacter: string) => ({
  url, mediaType: 'application/json', capturedAt: CAPTURED_AT, bytesSha256: H64(hashCharacter),
})

function observations() {
  const localSource = source('https://help.aliyun.com/en/model-studio/model-pricing', 'a')
  const modelApi = source('https://openrouter.ai/api/v1/images/models', 'b')
  const endpointApi = source('https://openrouter.ai/api/v1/images/models/vendor/or-price-test/endpoints', 'c')
  const fxSource = source('https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml', 'd')
  const fxEvidence = {
    source: { ...fxSource, mediaType: 'application/xml' }, rateDate: '2026-08-31', baseCurrency: 'EUR' as const,
    usdPerBaseDecimal: '1.2', cnyPerBaseDecimal: '7.2',
  }
  const local = (operation: 'generation' | 'edit') => ({
    provider: 'bailian' as const, modelId: 'wan-price-test', operation, imageSize: '2K' as const,
    billingRegion: 'cn-beijing', outputWidth: 2048, outputHeight: 1152,
    charges: [{ billable: 'output_image' as const, unit: 'image' as const, rateDecimal: operation === 'generation' ? '0.2' : '0.3', quantityDecimal: '1', resolutionTier: '2K' as const }],
    source: localSource, openRouterEvidence: null, fxEvidence: null,
  })
  const openrouter = (operation: 'generation' | 'edit') => {
    const pricing = operation === 'generation'
      ? [{ billable: 'output_image' as const, unit: 'image' as const, costUsd: '0.05', variant: '2k' }]
      : [
          { billable: 'output_image' as const, unit: 'image' as const, costUsd: '0.05', variant: '2k' },
          { billable: 'input_reference' as const, unit: 'image' as const, costUsd: '0.01', variant: null },
        ]
    return {
      provider: 'openrouter' as const, modelId: 'vendor/or-price-test', operation, imageSize: '2K' as const,
      billingRegion: 'openrouter-global', outputWidth: 2048, outputHeight: 1152,
      charges: pricing.map((line) => ({
        billable: line.billable, unit: line.unit, rateDecimal: line.costUsd, quantityDecimal: '1', resolutionTier: line.variant,
      })),
      source: endpointApi,
      openRouterEvidence: { modelApi, endpointApi, modelId: 'vendor/or-price-test', providerSlug: 'fixture-provider', rawPricing: pricing, tokenBounds: null },
      fxEvidence,
    }
  }
  return [local('generation'), local('edit'), openrouter('generation'), openrouter('edit')]
}

test('derives unique physical route-operation requirements from the frozen canonical manifest', () => {
  const requirements = deriveScientificV2PriceRequirements(manifest())
  assert.deepEqual(requirements.map((item) => ({
    provider: item.provider, modelId: item.modelId, operation: item.operation, slotCount: item.slotCount,
    aspectRatio: item.scenario.aspectRatio, imageSize: item.imageSize, sourceHash: item.scenario.sourceImage?.sha256 || null,
  })), [
    { provider: 'bailian', modelId: 'wan-price-test', operation: 'edit', slotCount: 3, aspectRatio: '16:9', imageSize: '2K', sourceHash: SCIENTIFIC_EDIT_SOURCE.sourceHash },
    { provider: 'bailian', modelId: 'wan-price-test', operation: 'generation', slotCount: 6, aspectRatio: '16:9', imageSize: '2K', sourceHash: null },
    { provider: 'openrouter', modelId: 'vendor/or-price-test', operation: 'edit', slotCount: 3, aspectRatio: '16:9', imageSize: '2K', sourceHash: SCIENTIFIC_EDIT_SOURCE.sourceHash },
    { provider: 'openrouter', modelId: 'vendor/or-price-test', operation: 'generation', slotCount: 6, aspectRatio: '16:9', imageSize: '2K', sourceHash: null },
  ])
})

test('freezes each physical route to 2K, 1K, or provider-default from canonical capability evidence', () => {
  const registry = { providers: { openrouter: { models: [
    {
      id: 'vendor/two-k', canonicalModelId: 'vendor:two-k', selectable: true, roles: ['image'],
      capabilities: { imageGeneration: true, imageEditMode: 'none', resolutions: ['1K', '2K'] },
    },
    {
      id: 'vendor/one-k', canonicalModelId: 'vendor:one-k', selectable: true, roles: ['image'],
      capabilities: { imageGeneration: true, imageEditMode: 'none', resolutions: ['1K'] },
    },
    {
      id: 'vendor/provider-default', canonicalModelId: 'vendor:provider-default', selectable: true, roles: ['image'],
      capabilities: { imageGeneration: true, imageEditMode: 'none', resolutions: [] },
    },
  ] } } } as const
  const frozen = buildScientificV2CanonicalManifest({ registryVersion: 'route-lanes-v1', registryHash: canonicalHash(registry), registry })
  assert.deepEqual(deriveScientificV2PriceRequirements(frozen).map((item) => [item.modelId, item.imageSize]), [
    ['vendor/one-k', '1K'],
    ['vendor/provider-default', 'provider-default'],
    ['vendor/two-k', '2K'],
  ])
})

test('builds a content-addressed attested snapshot and rounds USD conversion upward at 1e-8 CNY', () => {
  const canonicalManifest = manifest()
  const snapshot = buildScientificV2PriceSnapshot({ canonicalManifest, capturedAt: CAPTURED_AT, observations: observations() })
  const generation = snapshot.entries.find((entry) => entry.provider === 'openrouter' && entry.operation === 'generation')!
  const edit = snapshot.entries.find((entry) => entry.provider === 'openrouter' && entry.operation === 'edit')!
  assert.equal(generation.unitCnyAtoms, '30000000')
  assert.equal(edit.unitCnyAtoms, '36000000')
  assert.equal(snapshot.requirementsHash, canonicalHash(snapshot.requirements))
  assert.equal(snapshot.snapshotHash, canonicalHash(Object.fromEntries(Object.entries(snapshot).filter(([key]) => key !== 'snapshotHash'))))
  assert.equal(verifyScientificV2PriceSnapshot(snapshot, canonicalManifest).snapshotHash, snapshot.snapshotHash)
})

test('does not let one operation price stand in for generation and edit', () => {
  assert.throws(() => buildScientificV2PriceSnapshot({
    canonicalManifest: manifest(), capturedAt: CAPTURED_AT,
    observations: observations().filter((entry) => !(entry.provider === 'openrouter' && entry.operation === 'edit')),
  }), /SCIENTIFIC_V2_PRICE_UNRESOLVED/)
})

test('rejects caller assertions that are not bound to matching OpenRouter raw pricing and ECB bytes', () => {
  const forged = observations().map((entry) => entry.provider === 'openrouter' && entry.operation === 'generation'
    ? { ...entry, charges: [{ ...entry.charges[0], rateDecimal: '0.01' }] }
    : entry)
  assert.throws(() => buildScientificV2PriceSnapshot({ canonicalManifest: manifest(), capturedAt: CAPTURED_AT, observations: forged }), /SCIENTIFIC_V2_OPENROUTER_PRICE_EVIDENCE_INVALID/)

  const snapshot = buildScientificV2PriceSnapshot({ canonicalManifest: manifest(), capturedAt: CAPTURED_AT, observations: observations() })
  const tampered = structuredClone(snapshot)
  tampered.entries.find((entry) => entry.provider === 'openrouter')!.fxEvidence!.source.bytesSha256 = H64('e')
  assert.throws(() => verifyScientificV2PriceSnapshot(tampered, manifest()), /SCIENTIFIC_V2_PRICE_HASH_MISMATCH/)
})

test('rejects unknown OpenRouter raw pricing billables and units instead of ignoring them', () => {
  for (const raw of [
    { billable: 'provider_magic' as 'output_image', unit: 'image' as const, costUsd: '999', variant: null },
    { billable: 'output_image' as const, unit: 'credit' as 'image', costUsd: '999', variant: null },
    { billable: 'output_image' as const, unit: 'image' as const, costUsd: '999', variant: 'mystery-premium' },
  ]) {
    const forged: ScientificV2PriceObservation[] = observations()
    forged.find((entry) => entry.provider === 'openrouter' && entry.operation === 'generation')!
      .openRouterEvidence!.rawPricing.push(raw)
    assert.throws(() => buildScientificV2PriceSnapshot({ canonicalManifest: manifest(), capturedAt: CAPTURED_AT, observations: forged }), /SCIENTIFIC_V2_OPENROUTER_PRICE_EVIDENCE_INVALID/)
  }
})

test('derives the conservative applicable OpenRouter variant instead of accepting a caller-selected low price', () => {
  const input: ScientificV2PriceObservation[] = observations()
  const generation = input.find((entry) => entry.provider === 'openrouter' && entry.operation === 'generation')!
  generation.openRouterEvidence!.rawPricing = [
    { billable: 'output_image', unit: 'image', costUsd: '0.02', variant: 'low_2k' },
    { billable: 'output_image', unit: 'image', costUsd: '0.08', variant: 'high_2k' },
    { billable: 'output_image', unit: 'image', costUsd: '0.12', variant: '4k' },
  ]
  generation.charges = [{ billable: 'output_image', unit: 'image', rateDecimal: '0.02', quantityDecimal: '1', resolutionTier: 'low_2k' }]
  assert.throws(() => buildScientificV2PriceSnapshot({ canonicalManifest: manifest(), capturedAt: CAPTURED_AT, observations: input }), /SCIENTIFIC_V2_OPENROUTER_PRICE_EVIDENCE_INVALID/)
  generation.charges = [{ billable: 'output_image', unit: 'image', rateDecimal: '0.08', quantityDecimal: '1', resolutionTier: 'high_2k' }]
  const snapshot = buildScientificV2PriceSnapshot({ canonicalManifest: manifest(), capturedAt: CAPTURED_AT, observations: input })
  assert.equal(snapshot.entries.find((entry) => entry.provider === 'openrouter' && entry.operation === 'generation')!.unitCnyAtoms, '48000000')
})

test('rejects caller-controlled 1x1 dimensions for a frozen 2K megapixel lane', () => {
  const input: ScientificV2PriceObservation[] = observations()
  const generation = input.find((entry) => entry.provider === 'openrouter' && entry.operation === 'generation')!
  generation.outputWidth = 1
  generation.outputHeight = 1
  generation.openRouterEvidence!.rawPricing = [{ billable: 'output_image', unit: 'megapixel', costUsd: '0.06', variant: '2k' }]
  generation.charges = [{ billable: 'output_image', unit: 'megapixel', rateDecimal: '0.06', quantityDecimal: '0.000001', resolutionTier: '2k' }]
  assert.throws(() => buildScientificV2PriceSnapshot({ canonicalManifest: manifest(), capturedAt: CAPTURED_AT, observations: input }), /SCIENTIFIC_V2_PRICE_OUTPUT_DIMENSIONS_INVALID/)
})

test('requires every applicable edit input image and input reference charge', () => {
  const input: ScientificV2PriceObservation[] = observations()
  const edit = input.find((entry) => entry.provider === 'openrouter' && entry.operation === 'edit')!
  edit.openRouterEvidence!.rawPricing = [
    { billable: 'output_image', unit: 'image', costUsd: '0.05', variant: '2k' },
    { billable: 'input_image', unit: 'image', costUsd: '0.02', variant: null },
    { billable: 'input_reference', unit: 'request', costUsd: '0.01', variant: null },
  ]
  edit.charges = [
    { billable: 'output_image', unit: 'image', rateDecimal: '0.05', quantityDecimal: '1', resolutionTier: '2k' },
    { billable: 'input_reference', unit: 'request', rateDecimal: '0.01', quantityDecimal: '1', resolutionTier: null },
  ]
  assert.throws(() => buildScientificV2PriceSnapshot({ canonicalManifest: manifest(), capturedAt: CAPTURED_AT, observations: input }), /SCIENTIFIC_V2_OPENROUTER_PRICE_EVIDENCE_INVALID/)
  edit.charges.splice(1, 0, { billable: 'input_image', unit: 'image', rateDecimal: '0.02', quantityDecimal: '1', resolutionTier: null })
  assert.doesNotThrow(() => buildScientificV2PriceSnapshot({ canonicalManifest: manifest(), capturedAt: CAPTURED_AT, observations: input }))
})

test('requires official token bounds and conservatively charges every applicable MAI token billable', () => {
  const input: ScientificV2PriceObservation[] = observations()
  const edit = input.find((entry) => entry.provider === 'openrouter' && entry.operation === 'edit')!
  edit.imageSize = '2K'
  edit.openRouterEvidence!.rawPricing = [
    { billable: 'input_text', unit: 'token', costUsd: '0.000005', variant: null },
    { billable: 'input_image', unit: 'token', costUsd: '0.000008', variant: null },
    { billable: 'output_image', unit: 'token', costUsd: '0.000108', variant: null },
  ]
  edit.charges = [
    { billable: 'output_image', unit: 'token', rateDecimal: '0.000108', quantityDecimal: '1024', resolutionTier: null },
    { billable: 'input_text', unit: 'token', rateDecimal: '0.000005', quantityDecimal: '4096', resolutionTier: null },
    { billable: 'input_image', unit: 'token', rateDecimal: '0.000008', quantityDecimal: '4096', resolutionTier: null },
  ]
  assert.throws(() => buildScientificV2PriceSnapshot({ canonicalManifest: manifest(), capturedAt: CAPTURED_AT, observations: input }), /SCIENTIFIC_V2_OPENROUTER_TOKEN_BOUND_UNRESOLVED/)

  edit.openRouterEvidence!.tokenBounds = {
    contextLength: 4096,
    maxCompletionTokens: 1024,
    sourceField: 'top_provider.max_completion_tokens',
  }
  const snapshot = buildScientificV2PriceSnapshot({ canonicalManifest: manifest(), capturedAt: CAPTURED_AT, observations: input })
  const entry = snapshot.entries.find((candidate) => candidate.provider === 'openrouter' && candidate.operation === 'edit')!
  assert.deepEqual(entry.charges, edit.charges)
})

test('preflight blocks only baseline fixed-slot spend while disclosing four-attempt worst case', () => {
  const expensive = observations().map((entry) => entry.provider === 'bailian'
    ? { ...entry, charges: [{ ...entry.charges[0], rateDecimal: entry.operation === 'generation' ? '20' : '10' }] }
    : entry)
  const snapshot = buildScientificV2PriceSnapshot({ canonicalManifest: manifest(), capturedAt: CAPTURED_AT, observations: expensive })
  const bailian = snapshot.preflight.providerTotals.find((item) => item.provider === 'bailian')!
  assert.equal(bailian.baselineCnyAtoms, '15000000000')
  assert.equal(bailian.worstCaseCnyAtoms, '60000000000')
  assert.equal(bailian.baselineWithinBudget, true)
  assert.equal(bailian.worstCaseWithinBudget, false)

  const overBaseline = expensive.map((entry) => entry.provider === 'bailian' && entry.operation === 'generation'
    ? { ...entry, charges: [{ ...entry.charges[0], rateDecimal: '30' }] }
    : entry)
  assert.throws(() => buildScientificV2PriceSnapshot({ canonicalManifest: manifest(), capturedAt: CAPTURED_AT, observations: overBaseline }), /SCIENTIFIC_V2_PROVIDER_BASELINE_BUDGET_EXCEEDED/)
})

test('price verification rejects symbol-key smuggling', () => {
  const frozen = manifest()
  const snapshot = buildScientificV2PriceSnapshot({ canonicalManifest: frozen, capturedAt: CAPTURED_AT, observations: observations() })
  Object.defineProperty(snapshot, Symbol('hidden'), { value: 'smuggled', enumerable: true })
  assert.throws(() => verifyScientificV2PriceSnapshot(snapshot, frozen), /SCIENTIFIC_V2_PRICE_DATA_INVALID/)
})

test('price verification rejects accessors without invoking them', () => {
  const frozen = manifest()
  const snapshot = buildScientificV2PriceSnapshot({ canonicalManifest: frozen, capturedAt: CAPTURED_AT, observations: observations() })
  let invoked = false
  Object.defineProperty(snapshot.entries[0].source, 'url', {
    enumerable: true,
    get() { invoked = true; throw new Error('getter must not run') },
  })
  assert.throws(() => verifyScientificV2PriceSnapshot(snapshot, frozen), /SCIENTIFIC_V2_PRICE_DATA_INVALID/)
  assert.equal(invoked, false)
})
