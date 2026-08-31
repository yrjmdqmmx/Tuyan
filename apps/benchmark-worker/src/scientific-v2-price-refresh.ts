import { createHash } from 'node:crypto'

import {
  canonicalHash,
  deriveScientificV2PriceRequirements,
  type ScientificV2PriceRequirement,
} from '@paperbanana/benchmark-core'

import { assertScientificV2Iso, scientificV2Error } from './scientific-v2-common.js'

const MAX_CAPTURE_BYTES = 4 * 1024 * 1024
const OFFICIAL_URLS = Object.freeze({
  bailian: 'https://help.aliyun.com/en/model-studio/model-pricing',
  ark: 'https://www.volcengine.com/product/ark',
  openrouterModels: 'https://openrouter.ai/api/v1/images/models',
  ecbFx: 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml',
})

export interface ScientificV2OfficialPriceCapture {
  provider: 'bailian' | 'ark' | 'openrouter' | 'fx'
  kind: 'pricing-page' | 'models-api' | 'endpoints-api' | 'fx-reference'
  url: string
  mediaType: string
  capturedAt: string
  byteSize: number
  bytesSha256: string
}

async function captureOfficialSource(input: {
  provider: ScientificV2OfficialPriceCapture['provider']
  kind: ScientificV2OfficialPriceCapture['kind']
  url: string
  capturedAt: string
  fetchImpl: typeof fetch
}) {
  const response = await input.fetchImpl(input.url, { method: 'GET', headers: { Accept: 'application/json,text/html,application/xml;q=0.9' } })
  if (!response.ok) scientificV2Error('SCIENTIFIC_V2_PRICE_REFRESH_HTTP_FAILED')
  const contentLength = response.headers.get('content-length')
  if (contentLength !== null && (!/^\d+$/.test(contentLength) || Number(contentLength) > MAX_CAPTURE_BYTES)) {
    await response.body?.cancel().catch(() => undefined)
    scientificV2Error('SCIENTIFIC_V2_PRICE_REFRESH_BYTES_EXCEEDED')
  }
  if (!response.body) scientificV2Error('SCIENTIFIC_V2_PRICE_REFRESH_BYTES_EXCEEDED')
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > MAX_CAPTURE_BYTES) {
        await reader.cancel().catch(() => undefined)
        scientificV2Error('SCIENTIFIC_V2_PRICE_REFRESH_BYTES_EXCEEDED')
      }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  if (total === 0) scientificV2Error('SCIENTIFIC_V2_PRICE_REFRESH_BYTES_EXCEEDED')
  const bytes = Buffer.concat(chunks.map((value) => Buffer.from(value)), total)
  return {
    provider: input.provider,
    kind: input.kind,
    url: input.url,
    mediaType: (response.headers.get('content-type') || 'application/octet-stream').split(';')[0].trim().toLowerCase(),
    capturedAt: input.capturedAt,
    byteSize: bytes.length,
    bytesSha256: createHash('sha256').update(bytes).digest('hex'),
  } satisfies ScientificV2OfficialPriceCapture
}

export async function refreshScientificV2OfficialPriceSources(input: {
  canonicalManifest: Parameters<typeof deriveScientificV2PriceRequirements>[0]
  capturedAt: string
  fetchImpl?: typeof fetch
}) {
  assertScientificV2Iso(input.capturedAt, 'SCIENTIFIC_V2_PRICE_REFRESH_CAPTURE_INVALID')
  const fetchImpl = input.fetchImpl || fetch
  const requirements = deriveScientificV2PriceRequirements(input.canonicalManifest)
  const captures: ScientificV2OfficialPriceCapture[] = []
  const providers = new Set(requirements.map((requirement) => requirement.provider))
  if (providers.has('bailian')) captures.push(await captureOfficialSource({
    provider: 'bailian', kind: 'pricing-page', url: OFFICIAL_URLS.bailian, capturedAt: input.capturedAt, fetchImpl,
  }))
  if (providers.has('ark')) captures.push(await captureOfficialSource({
    provider: 'ark', kind: 'pricing-page', url: OFFICIAL_URLS.ark, capturedAt: input.capturedAt, fetchImpl,
  }))
  if (providers.has('openrouter')) {
    captures.push(await captureOfficialSource({
      provider: 'openrouter', kind: 'models-api', url: OFFICIAL_URLS.openrouterModels, capturedAt: input.capturedAt, fetchImpl,
    }))
    for (const modelId of [...new Set(requirements.filter((item) => item.provider === 'openrouter').map((item) => item.modelId))].sort()) {
      captures.push(await captureOfficialSource({
        provider: 'openrouter', kind: 'endpoints-api',
        url: `https://openrouter.ai/api/v1/images/models/${modelId}/endpoints`, capturedAt: input.capturedAt, fetchImpl,
      }))
    }
    captures.push(await captureOfficialSource({
      provider: 'fx', kind: 'fx-reference', url: OFFICIAL_URLS.ecbFx, capturedAt: input.capturedAt, fetchImpl,
    }))
  }
  captures.sort((left, right) => Buffer.compare(Buffer.from(`${left.provider}\0${left.kind}\0${left.url}`), Buffer.from(`${right.provider}\0${right.kind}\0${right.url}`)))
  const unresolved = requirements.map((requirement: ScientificV2PriceRequirement) => ({
    requirementHash: requirement.requirementHash,
    provider: requirement.provider,
    modelId: requirement.modelId,
    operation: requirement.operation,
    reason: requirement.provider === 'openrouter'
      ? 'endpoint_price_resolution_requires_conservative_attested_extraction'
      : 'official_pricing_page_requires_exact_model_region_operation_extraction',
  }))
  const base = {
    schemaVersion: 1 as const,
    mode: 'readonly-official-refresh' as const,
    capturedAt: input.capturedAt,
    requirements,
    requirementsHash: canonicalHash(requirements),
    captures,
    capturesHash: canonicalHash(captures),
    unresolved,
    resolved: false as const,
  }
  return Object.freeze({ ...base, refreshHash: canonicalHash(base) })
}
