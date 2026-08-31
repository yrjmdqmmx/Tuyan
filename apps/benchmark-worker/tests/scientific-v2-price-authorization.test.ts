import assert from 'node:assert/strict'
import { createHash, createHmac } from 'node:crypto'
import test from 'node:test'

import { buildScientificV2CanonicalManifest, canonicalHash } from '@paperbanana/benchmark-core'
import {
  buildScientificV2OperatorPriceAuthorization,
  scientificV2ConservativeUnitCny,
} from '../src/scientific-v2-price-authorization.js'
import { refreshScientificV2OfficialPriceSources } from '../src/scientific-v2-price-refresh.js'

const CODE_SHA = 'a'.repeat(40)
const SECRET = 'scientific-v2-price-authorization-test-secret'
const CAPTURED_AT = '2026-08-31T07:00:00.000Z'

test('fixed conservative map covers every authorized exact model-operation price without undercutting the approved CNY bounds', () => {
  const expected = new Map<string, string>([
    ['bailian\0qwen-image-2.0\0generation', '0.20'],
    ['bailian\0qwen-image-2.0\0edit', '0.20'],
    ['bailian\0qwen-image-2.0-pro\0generation', '0.50'],
    ['bailian\0qwen-image-2.0-pro\0edit', '0.50'],
    ['bailian\0qwen-image-3.0-pro\0generation', '0.50'],
    ['bailian\0qwen-image-3.0-pro\0edit', '0.52'],
    ['bailian\0wan2.7-image\0generation', '0.20'],
    ['bailian\0wan2.7-image\0edit', '0.20'],
    ['bailian\0wan2.7-image-pro\0generation', '0.50'],
    ['bailian\0wan2.7-image-pro\0edit', '0.50'],
    ['bailian\0z-image-turbo\0generation', '0.20'],
    ['ark\0doubao-seedream-4-0-250828\0generation', '0.20'],
    ['ark\0doubao-seedream-4-0-250828\0edit', '0.20'],
    ['ark\0doubao-seedream-4-5-251128\0generation', '0.25'],
    ['ark\0doubao-seedream-4-5-251128\0edit', '0.25'],
    ['ark\0doubao-seedream-5-0-260128\0generation', '0.22'],
    ['ark\0doubao-seedream-5-0-260128\0edit', '0.22'],
    ['ark\0doubao-seedream-5-0-pro-260628\0generation', '0.60'],
    ['ark\0doubao-seedream-5-0-pro-260628\0edit', '0.60'],
    ['openrouter\0krea/krea-2-large\0generation', '0.48'],
    ['openrouter\0krea/krea-2-large\0edit', '0.52'],
    ['openrouter\0krea/krea-2-medium\0generation', '0.24'],
    ['openrouter\0krea/krea-2-medium\0edit', '0.28'],
    ['openrouter\0krea/krea-2-medium-turbo\0generation', '0.12'],
    ['openrouter\0krea/krea-2-medium-turbo\0edit', '0.14'],
    ['openrouter\0microsoft/mai-image-2.5\0generation', '0.548864'],
    ['openrouter\0microsoft/mai-image-2.5\0edit', '0.811008'],
    ['openrouter\0microsoft/mai-image-2.5-pro\0generation', '1.048576'],
    ['openrouter\0microsoft/mai-image-2.5-pro\0edit', '1.31072'],
    ['openrouter\0qwen/qwen-image-3\0generation', '0.24'],
    ['openrouter\0qwen/qwen-image-3\0edit', '0.264'],
    ['openrouter\0black-forest-labs/flux.2-flex\0generation', '1.92'],
    ['openrouter\0black-forest-labs/flux.2-flex\0edit', '3.05246208'],
    ['openrouter\0black-forest-labs/flux.2-klein-4b\0generation', '0.448'],
    ['openrouter\0black-forest-labs/flux.2-klein-4b\0edit', '0.448'],
    ['openrouter\0black-forest-labs/flux.2-max\0generation', '2.24'],
    ['openrouter\0black-forest-labs/flux.2-max\0edit', '2.24'],
    ['openrouter\0black-forest-labs/flux.2-pro\0generation', '0.96'],
    ['openrouter\0black-forest-labs/flux.2-pro\0edit', '0.96'],
    ['openrouter\0sourceful/riverflow-v2-fast\0generation', '0.32'],
    ['openrouter\0sourceful/riverflow-v2-fast\0edit', '1.92'],
    ['openrouter\0sourceful/riverflow-v2-pro\0generation', '1.20'],
    ['openrouter\0sourceful/riverflow-v2-pro\0edit', '2.80'],
    ['openrouter\0sourceful/riverflow-v2.5-fast\0generation', '0.168'],
    ['openrouter\0sourceful/riverflow-v2.5-fast\0edit', '0.168'],
    ['openrouter\0sourceful/riverflow-v2.5-pro\0generation', '1.20'],
    ['openrouter\0sourceful/riverflow-v2.5-pro\0edit', '1.20'],
    ['openrouter\0x-ai/grok-imagine-image-2.0\0generation', '0.64'],
    ['openrouter\0x-ai/grok-imagine-image-2.0\0edit', '0.72'],
    ['openrouter\0x-ai/grok-imagine-image-quality\0generation', '0.56'],
    ['openrouter\0x-ai/grok-imagine-image-quality\0edit', '0.64'],
    ['openrouter\0recraft/recraft-v3\0generation', '0.32'],
    ['openrouter\0recraft/recraft-v3\0edit', '0.32'],
    ['openrouter\0recraft/recraft-v4\0generation', '0.32'],
    ['openrouter\0recraft/recraft-v4\0edit', '0.32'],
    ['openrouter\0recraft/recraft-v4-pro\0generation', '2.00'],
    ['openrouter\0recraft/recraft-v4-pro\0edit', '2.00'],
    ['openrouter\0recraft/recraft-v4-pro-vector\0generation', '2.40'],
    ['openrouter\0recraft/recraft-v4-pro-vector\0edit', '2.40'],
    ['openrouter\0recraft/recraft-v4-styles-pro-vector\0generation', '0.96'],
    ['openrouter\0recraft/recraft-v4-styles-pro-vector\0edit', '1.00'],
    ['openrouter\0recraft/recraft-v4-styles-vector\0generation', '0.40'],
    ['openrouter\0recraft/recraft-v4-styles-vector\0edit', '0.44'],
    ['openrouter\0recraft/recraft-v4-vector\0generation', '0.64'],
    ['openrouter\0recraft/recraft-v4-vector\0edit', '0.64'],
    ['openrouter\0recraft/recraft-v4.1\0generation', '0.28'],
    ['openrouter\0recraft/recraft-v4.1\0edit', '0.28'],
    ['openrouter\0recraft/recraft-v4.1-pro\0generation', '1.68'],
    ['openrouter\0recraft/recraft-v4.1-pro\0edit', '1.68'],
    ['openrouter\0recraft/recraft-v4.1-pro-vector\0generation', '2.40'],
    ['openrouter\0recraft/recraft-v4.1-pro-vector\0edit', '2.40'],
    ['openrouter\0recraft/recraft-v4.1-utility\0generation', '0.28'],
    ['openrouter\0recraft/recraft-v4.1-utility\0edit', '0.28'],
    ['openrouter\0recraft/recraft-v4.1-utility-pro\0generation', '1.68'],
    ['openrouter\0recraft/recraft-v4.1-utility-pro\0edit', '1.68'],
    ['openrouter\0recraft/recraft-v4.1-vector\0generation', '0.64'],
    ['openrouter\0recraft/recraft-v4.1-vector\0edit', '0.64'],
  ])
  for (const [key, value] of expected) {
    const [provider, modelId, operation] = key.split('\0')
    assert.equal(scientificV2ConservativeUnitCny({ provider, modelId, operation }), value, key)
  }
  for (const requirement of [
    { provider: 'openrouter', modelId: 'vendor/unknown', operation: 'generation' },
    { provider: 'bailian', modelId: 'z-image-turbo', operation: 'edit' },
    { provider: 'ark', modelId: 'doubao-seedream-5-0-pro-260628', operation: 'analyze-redraw' },
  ]) assert.throws(() => scientificV2ConservativeUnitCny(requirement), /SCIENTIFIC_V2_PRICE_OPERATOR_MAP_UNAVAILABLE/)
})

async function unresolvedFixture() {
  const registry = {
    registryVersion: 'authorization-builder-v1', routeContractVersion: 1,
    providers: { bailian: { models: [{
      id: 'wan2.7-image', canonicalModelId: 'wan2.7-image', selectable: true, roles: ['image'],
      capabilities: { imageGeneration: true, imageEditMode: 'direct-edit' as const, resolutions: ['2K'] },
    }] } },
  }
  const canonicalManifest = buildScientificV2CanonicalManifest({
    registryVersion: registry.registryVersion, registryHash: canonicalHash(registry), registry,
  })
  const authorityBase = {
    schemaVersion: 1 as const, codeSha: CODE_SHA, capturedAt: CAPTURED_AT, registryVersion: registry.registryVersion,
    registryBytesHash: createHash('sha256').update(JSON.stringify(registry)).digest('hex'), registry,
  }
  const snapshotHash = canonicalHash(authorityBase)
  const key = createHmac('sha256', SECRET).update('paperbanana/scientific-v2/registry-authority/v1').digest()
  const registryAuthority = { ...authorityBase, snapshotHash, attestationHash: createHmac('sha256', key).update(snapshotHash).digest('hex') }
  const rawByHash = new Map<string, Buffer>()
  const refreshReport = await refreshScientificV2OfficialPriceSources({
    canonicalManifest, capturedAt: CAPTURED_AT,
    persistCapture: async (capture, bytes) => { rawByHash.set(capture.bytesSha256, Buffer.from(bytes)) },
    fetchImpl: async () => new Response('fixed official bytes without deterministic rows', {
      status: 200, headers: { 'content-type': 'text/html' },
    }),
  })
  return { canonicalManifest, registryAuthority, refreshReport, rawByHash }
}

test('builder derives the exact unresolved set from bound capture bytes and emits no caller-selected prices', async () => {
  const fixture = await unresolvedFixture()
  const result = await buildScientificV2OperatorPriceAuthorization({
    canonicalManifest: fixture.canonicalManifest,
    refreshReport: fixture.refreshReport,
    codeSha: CODE_SHA,
    confirmation: 'authorize-scientific-v2-conservative-upper-bound',
    loadCaptureBytes: async (capture) => fixture.rawByHash.get(capture.bytesSha256)!,
  })
  assert.equal(result.authorization.entries.length, 2)
  assert.deepEqual(result.authorization.entries.map((entry) => entry.unitCny), ['0.20', '0.20'])
  assert.equal(result.authorization.authorizationHash, canonicalHash(Object.fromEntries(
    Object.entries(result.authorization).filter(([key]) => key !== 'authorizationHash'),
  )))
  assert.deepEqual(result.providerTotals, [
    { provider: 'bailian', capCny: 180, baselineCny: 1.8, worstCaseCny: 7.2 },
    { provider: 'ark', capCny: 180, baselineCny: 0, worstCaseCny: 0 },
    { provider: 'openrouter', capCny: 360, baselineCny: 0, worstCaseCny: 0 },
  ])

  const missing: any = structuredClone(fixture.refreshReport)
  missing.unresolved.pop()
  missing.refreshHash = canonicalHash(Object.fromEntries(Object.entries(missing).filter(([key]) => key !== 'refreshHash')))
  await assert.rejects(buildScientificV2OperatorPriceAuthorization({
    canonicalManifest: fixture.canonicalManifest, refreshReport: missing, codeSha: CODE_SHA,
    confirmation: 'authorize-scientific-v2-conservative-upper-bound',
    loadCaptureBytes: async (capture) => fixture.rawByHash.get(capture.bytesSha256)!,
  }), /SCIENTIFIC_V2_PRICE_REFRESH_REPORT_INVALID/)

  const drifted: any = structuredClone(fixture.refreshReport)
  drifted.capturedAt = '2026-08-31T07:00:00.001Z'
  drifted.refreshHash = canonicalHash(Object.fromEntries(Object.entries(drifted).filter(([key]) => key !== 'refreshHash')))
  await assert.rejects(buildScientificV2OperatorPriceAuthorization({
    canonicalManifest: fixture.canonicalManifest, refreshReport: drifted, codeSha: CODE_SHA,
    confirmation: 'authorize-scientific-v2-conservative-upper-bound',
    loadCaptureBytes: async (capture) => fixture.rawByHash.get(capture.bytesSha256)!,
  }), /SCIENTIFIC_V2_PRICE_REFRESH_REPORT_INVALID/)
})
