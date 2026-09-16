import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import {
  PB_SCIENTIFIC_FIGURE_V2, SCIENTIFIC_REPLICATE_IMAGE25_MODELS,
  buildScientificV2CanonicalManifest, deriveScientificV2ExecutionCanonicalManifest,
  canonicalHash, buildScientificV2PriceSnapshot, verifyScientificV2PriceSnapshot,
} from '@paperbanana/benchmark-core'
import { buildScientificV2Batch, verifyScientificV2BatchManifest, verifyScientificV2BatchState } from '../src/scientific-v2-manifest.js'
import { runScientificV2Batch, ScientificConfirmedFailureError } from '../src/scientific-v2-runner.js'
import { assertReplicateAutoPriceEvidence, refreshScientificV2OfficialPriceSources, extractScientificV2OfficialPriceObservationsForOperatorUpperBound } from '../src/scientific-v2-price-refresh.js'
import { createScientificV2OfficialSignedPriceSnapshot, verifyScientificV2SignedPriceSnapshot } from '../src/scientific-v2-price-attestation.js'
import { buildScientificV2OperatorPriceAuthorization } from '../src/scientific-v2-price-authorization.js'
import { verifyScientificV2ImportedState } from '../../paperbanana-api/src/scientific-v2-repository.js'
import { createScientificV2RegistryAuthority, verifyScientificV2RegistryAuthority } from '../../paperbanana-api/src/scientific-v2-production-bridge.js'

const at = '2026-09-16T11:00:00.000Z'
const codeSha = 'a'.repeat(40)
const secret = 'x'.repeat(32)
const lockName = '/run/lock/paperbanana-hk-production.lock'
const tier = { criteria: [{ description: 'auto', subtype: 'string', title: 'model variant', type: 'equals', value: 'auto' }], prices: [{ metric: 'image_output_count', type: 'per-unit', price: '$0.25' }] }
const html = Buffer.from(`<script>{"billingConfig":${JSON.stringify({ current_tiers: [tier] })},"other":{"price":"$0.0001 per second"}}</script>`)

async function fixture(modelId: string) {
  const registry = { registryVersion: 'replicate-v1', routeContractVersion: 1, providers: {
    bailian: { models: [] }, ark: { models: [] }, openrouter: { models: [] },
    replicate: { models: [...SCIENTIFIC_REPLICATE_IMAGE25_MODELS, 'unapproved/other'].map(id => ({
      id, label: id, vendor: 'OpenAI', selectable: true, roles: ['image'],
      capabilities: { imageGeneration: true, imageEditMode: 'direct-edit' as const, resolutions: ['auto'] },
    })) },
  } }
  const full = buildScientificV2CanonicalManifest({ registryVersion: registry.registryVersion, registryHash: canonicalHash(registry), registry })
  const expansion = { schemaVersion: 1 as const, kind: 'single_model_expansion' as const,
    baseline: { releaseId: 'previous-release', releaseHash: 'b'.repeat(64), batchId: 'previous-batch', manifestHash: 'c'.repeat(64) }, targetModelId: modelId }
  const projected = deriveScientificV2ExecutionCanonicalManifest(full, expansion)
  const captures = new Map<string, Buffer>()
  const refreshReport = await refreshScientificV2OfficialPriceSources({
    canonicalManifest: projected, capturedAt: at,
    persistCapture: async (capture, bytes) => { captures.set(capture.bytesSha256, Buffer.from(bytes)) },
    fetchImpl: async (url, init) => {
      assert.equal(init?.method, 'GET')
      assert.equal(new Headers(init?.headers).get('Authorization'), null)
      return String(url).includes('ecb.europa.eu')
        ? new Response(`<Cube time='2026-09-16'><Cube currency='USD' rate='1.2'/><Cube currency='CNY' rate='8.4'/></Cube>`, { headers: { 'content-type': 'application/xml' } })
        : new Response(html, { headers: { 'content-type': 'text/html' } })
    },
  })
  const extractionInput = { canonicalManifest: projected, refreshReport, loadCaptureBytes: async (capture: { bytesSha256: string }) => captures.get(capture.bytesSha256)! }
  const extracted = await extractScientificV2OfficialPriceObservationsForOperatorUpperBound(extractionInput)
  const price = buildScientificV2PriceSnapshot({ canonicalManifest: projected, capturedAt: at, observations: extracted.observations })
  const registryBase = { registryVersion: registry.registryVersion, registryHash: canonicalHash(registry), registry }
  const built = buildScientificV2Batch({ canonicalManifest: full, expansion, registrySnapshot: { ...registryBase, snapshotHash: canonicalHash(registryBase) }, suite: PB_SCIENTIFIC_FIGURE_V2, codeSha, priceSnapshot: price, createdAt: at, lockName })
  return { ...built, full, registry, projected, price, extractionInput }
}

for (const id of SCIENTIFIC_REPLICATE_IMAGE25_MODELS) test(`${id}: frozen nine-slot execution, USD pricing and import retain exact provider provenance`, async () => {
  const f = await fixture(id)
  assert.equal(f.full.models.length, 3) // two approved Replicate models plus the existing Codex identity
  assert.equal(f.manifest.models.length, 1)
  assert.equal(f.manifest.executionOrder.length, 9)
  assert.ok(f.manifest.executionOrder.every(slot => slot.provider === 'replicate' && slot.modelId === id && slot.imageSize === 'provider-default'))
  assert.equal(f.manifest.codexLimits.maxToolCalls, 0)
  assert.equal(f.price.entries[0].originalCurrency, 'USD')
  assert.equal(f.price.entries[0].unitCny, 1.75)
  const totals = f.price.preflight.providerTotals.find(item => item.provider === 'replicate')!
  assert.equal(totals.baselineCnyAtoms, '1575000000')
  assert.equal(totals.worstCaseCnyAtoms, totals.baselineCnyAtoms)
  verifyScientificV2BatchManifest(f.manifest)
  const auth = await buildScientificV2OperatorPriceAuthorization({ ...f.extractionInput, codeSha, confirmation: 'authorize-scientific-v2-conservative-upper-bound' })
  assert.deepEqual(auth.authorization.entries, [])
  const authority = await createScientificV2RegistryAuthority({ codeSha, secret, now: () => new Date(at), loadCurrentRegistry: async () => ({ code: 0, ...f.registry }) })
  const signed = await createScientificV2OfficialSignedPriceSnapshot({ ...f.extractionInput, expansion: f.manifest.expansion, registryAuthority: authority, codeSha, secret, operatorAuthorization: auth.authorization, now: () => new Date(at) })
  const verified = verifyScientificV2SignedPriceSnapshot(signed, { canonicalManifest: f.projected, secret, expectedCodeSha: codeSha, now: new Date(at), maxAgeMs: 86400000 })
  assert.equal(verified.entries[0].charges[0].rateDecimal, '0.25')
  assert.equal(verified.operatorAuthorizationHash, null)
  const png = readFileSync(new URL('../../../packages/benchmark-core/assets/scientific-edit-source-v2.png', import.meta.url))
  const calls: string[] = []
  const dependencies = { repository: { async save() {} }, recorder: { async recordAttempt() {}, async recordUnsupported() {} },
    lock: { async acquire() { return 'test-lock' }, async heartbeat() {}, async release() {} },
    executor: { async execute(request: any) { calls.push(request.slotId); return { responseClass: 'succeeded' as const, actualCny: request.estimatedCny, bytes: png } } } }
  const canary = await runScientificV2Batch({ manifest: f.manifest, state: f.state, attestation: { enabled: false, concurrency: 1, lockName, phase: 'canary-only' }, ...dependencies })
  const complete = await runScientificV2Batch({ manifest: f.manifest, state: canary.state, attestation: { enabled: false, concurrency: 1, lockName, phase: 'full' }, ...dependencies })
  assert.equal(calls.length, 9)
  assert.equal(new Set(calls).size, 9)
  assert.equal(complete.state.status, 'completed')
  assert.equal(complete.state.providerSpentCny.replicate, 15.75)
  verifyScientificV2BatchState(complete.state, f.manifest)
  verifyScientificV2ImportedState(complete.state, f.manifest)
  const tampered = structuredClone(f.price)
  tampered.entries[0].charges[0].rateDecimal = '0.01'
  assert.throws(() => verifyScientificV2PriceSnapshot(tampered, f.projected))
})

test('Replicate confirmed failure is recorded once and never retried by the runner', async () => {
  const f = await fixture(SCIENTIFIC_REPLICATE_IMAGE25_MODELS[0])
  let calls = 0
  const result = await runScientificV2Batch({ manifest: f.manifest, state: f.state, attestation: { enabled: false, concurrency: 1, lockName, phase: 'canary-only' },
    repository: { async save() {} }, recorder: { async recordAttempt() {}, async recordUnsupported() {} },
    lock: { async acquire() { return 'test-lock' }, async heartbeat() {}, async release() {} },
    executor: { async execute() { calls += 1; throw new ScientificConfirmedFailureError('failed', { responseClass: 'confirmed_provider_failure', actualCny: 0 }) } },
  })
  assert.equal(calls, 1)
  assert.equal(result.state.status, 'canary_complete')
  assert.equal(result.state.slots[0].status, 'failed')
  assert.equal(result.state.slots[0].attempts.length, 1)
  verifyScientificV2BatchState(result.state, f.manifest)
  verifyScientificV2ImportedState(result.state, f.manifest)
})

test('Replicate price capture rejects changed price, ambiguous tiers and unrelated cheap text', () => {
  assertReplicateAutoPriceEvidence(html)
  assertReplicateAutoPriceEvidence(Buffer.concat([html, html]))
  assert.throws(() => assertReplicateAutoPriceEvidence(Buffer.from(html.toString() + html.toString().replace('$0.25', '$0.50'))), /REPLICATE_PRICE_EVIDENCE_INVALID/)
  for (const bad of [html.toString().replace('$0.25', '$0.50'), '{"billingConfig":{"current_tiers":[]},"price":"$0.25"}', `{"billingConfig":${JSON.stringify({ current_tiers: [tier, tier] })}}`]) {
    assert.throws(() => assertReplicateAutoPriceEvidence(Buffer.from(bad)), /REPLICATE_PRICE_EVIDENCE_INVALID/)
  }
})

test('registry authority retains old three-provider hashes and includes Replicate only when present', async () => {
  const f = await fixture(SCIENTIFIC_REPLICATE_IMAGE25_MODELS[0])
  for (const replicate of [true, false]) {
    const registry = structuredClone(f.registry) as any
    if (!replicate) delete registry.providers.replicate
    const authority = await createScientificV2RegistryAuthority({ codeSha, secret, now: () => new Date(at), loadCurrentRegistry: async () => ({ code: 0, ...registry }) })
    verifyScientificV2RegistryAuthority(authority, { expectedCodeSha: codeSha, secret, now: () => new Date(at) })
    assert.equal(Object.hasOwn(authority.registry.providers as object, 'replicate'), replicate)
    assert.equal(buildScientificV2CanonicalManifest({ registryVersion: registry.registryVersion, registryHash: canonicalHash(registry), registry }).routePriority.length, replicate ? 4 : 3)
  }
})
