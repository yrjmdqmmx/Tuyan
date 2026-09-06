import assert from 'node:assert/strict'
import test from 'node:test'
import { buildScientificV2CanonicalManifest, canonicalHash } from '@paperbanana/benchmark-core'
import { buildScientificV2OperatorPriceAuthorization } from '../src/scientific-v2-price-authorization.js'
import { refreshScientificV2OfficialPriceSources } from '../src/scientific-v2-price-refresh.js'

const id = 'microsoft/mai-image-2.6'

async function authorize(mutate: (image: any, token: any) => void = () => {}) {
  const registry = { providers: { openrouter: { models: [{
    id, label: 'MAI-Image-2.6', vendor: 'Microsoft', selectable: true, roles: ['image'],
    capabilities: { imageGeneration: true, imageEditMode: 'direct-edit' as const, resolutions: [] },
  }] } } }
  const canonicalManifest = buildScientificV2CanonicalManifest({ registry, registryVersion: 'mai-test', registryHash: canonicalHash(registry) })
  const image = { id, endpoints: [{ provider_slug: 'azure', supported_parameters: { n: { min: 1, max: 1 } }, pricing: [
    { billable: 'input_text', unit: 'token', cost_usd: 0.000005 },
    { billable: 'input_image', unit: 'token', cost_usd: 0.000008 },
    { billable: 'output_image', unit: 'token', cost_usd: 0.000038 },
  ] }] }
  const token = { data: { id, endpoints: [{ model_id: id, tag: 'azure', context_length: 4096, max_completion_tokens: 1024,
    pricing: { prompt: '0.000005', image_output: '0.000038' },
  }] } }
  mutate(image, token)
  const raw = new Map<string, Uint8Array>()
  const refreshReport = await refreshScientificV2OfficialPriceSources({
    canonicalManifest, capturedAt: '2026-09-06T10:00:00.000Z',
    fetchImpl: async (url) => {
      if (String(url).endsWith('/images/models')) return Response.json({ data: registry.providers.openrouter.models })
      if (String(url).includes('/images/models/')) return Response.json(image)
      if (String(url).includes('/api/v1/models/')) return Response.json(token)
      return new Response('<Cube time="2026-09-04"><Cube currency="USD" rate="1.17"/><Cube currency="CNY" rate="8.4"/></Cube>', { headers: { 'content-type': 'text/xml' } })
    },
    persistCapture: async (capture, bytes) => { raw.set(capture.bytesSha256, bytes) },
  })
  return buildScientificV2OperatorPriceAuthorization({
    canonicalManifest, refreshReport, codeSha: 'b'.repeat(40),
    confirmation: 'authorize-scientific-v2-conservative-upper-bound',
    loadCaptureBytes: async (capture) => raw.get(capture.bytesSha256)!,
  })
}

test('MAI 2.6 binds generation and edit conservative allowances to captured Azure rates and token limits', async () => {
  const result = await authorize()
  assert.deepEqual(result.authorization.entries.map((entry) => entry.unitCny).sort(), ['1.591296', '3.639296'])
  assert.deepEqual(result.providerTotals.find((total) => total.provider === 'openrouter'), {
    provider: 'openrouter', capCny: 360, baselineCny: 20.465664, worstCaseCny: 81.862656,
  })
})

test('MAI price drift cannot fall back to the old operator allowance', async () => {
  for (const mutate of [
    (image: any) => { image.endpoints[0].pricing[2].cost_usd = 0.000039 },
    (image: any) => { image.endpoints[0].pricing.push({ billable: 'request', unit: 'request', cost_usd: 0.1 }) },
    (_image: any, token: any) => { token.data.endpoints[0].max_completion_tokens = 2048 },
    (_image: any, token: any) => { delete token.data.endpoints[0].max_completion_tokens },
    (_image: any, token: any) => { token.data.endpoints[0].context_length = 64_000 },
    (image: any) => { image.id = `${id}-flash` },
    (image: any) => { image.endpoints[0].provider_slug = 'other-provider' },
  ]) await assert.rejects(authorize(mutate), /SCIENTIFIC_V2_MAI_PRICE_EVIDENCE_INVALID/)
})
