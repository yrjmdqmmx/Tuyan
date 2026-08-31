import { createHash } from 'node:crypto'

import {
  canonicalHash,
  deriveScientificV2PriceRequirements,
  type ScientificV2PriceObservation,
  type ScientificV2PriceRequirement,
} from '@paperbanana/benchmark-core'

import { assertScientificV2Iso, scientificV2Error } from './scientific-v2-common.js'

const MAX_CAPTURE_BYTES = 4 * 1024 * 1024
const OFFICIAL_URLS = Object.freeze({
  bailian: 'https://help.aliyun.com/zh/model-studio/model-pricing',
  ark: 'https://docs.volcengine.com/docs/82379/1544106?lang=zh',
  openrouterModels: 'https://openrouter.ai/api/v1/images/models',
  ecbFx: 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml',
})

const KREA_PRICES = Object.freeze({
  'krea/krea-2-large': { generation: '0.06', edit: '0.065', moodboard: '0.07' },
  'krea/krea-2-medium': { generation: '0.03', edit: '0.035', moodboard: '0.04' },
  'krea/krea-2-medium-turbo': { generation: '0.015', edit: '0.0175', moodboard: '0.02' },
})

const ARK_PRICES = Object.freeze({
  'doubao-seedream-5-0-pro-260628': '0.30',
  'doubao-seedream-5-0-260128': '0.22',
  'doubao-seedream-4-5-251128': '0.25',
  'doubao-seedream-4-0-250828': '0.20',
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

export interface ScientificV2OfficialPriceRefreshReport {
  schemaVersion: 1
  mode: 'readonly-official-refresh'
  capturedAt: string
  requirements: ScientificV2PriceRequirement[]
  requirementsHash: string
  captures: ScientificV2OfficialPriceCapture[]
  capturesHash: string
  unresolved: Array<{
    requirementHash: string
    provider: ScientificV2PriceRequirement['provider']
    modelId: string
    operation: ScientificV2PriceRequirement['operation']
    reason: string
  }>
  resolved: false
  refreshHash: string
}

function exactRefreshKeys(value: unknown, expected: readonly string[]) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    scientificV2Error('SCIENTIFIC_V2_PRICE_REFRESH_REPORT_INVALID')
  }
  const actual = Reflect.ownKeys(value).map(String).sort()
  const wanted = [...expected].sort()
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    scientificV2Error('SCIENTIFIC_V2_PRICE_REFRESH_REPORT_INVALID')
  }
}

function initialUnresolved(requirements: ScientificV2PriceRequirement[]) {
  return requirements.map((requirement) => ({
    requirementHash: requirement.requirementHash,
    provider: requirement.provider,
    modelId: requirement.modelId,
    operation: requirement.operation,
    reason: requirement.provider === 'openrouter'
      ? 'endpoint_price_resolution_requires_conservative_attested_extraction'
      : 'official_pricing_page_requires_exact_model_region_operation_extraction',
  }))
}

function expectedCaptureIdentities(requirements: ScientificV2PriceRequirement[]) {
  const providers = new Set(requirements.map((requirement) => requirement.provider))
  const expected: Array<Pick<ScientificV2OfficialPriceCapture, 'provider' | 'kind' | 'url'>> = []
  if (providers.has('bailian')) expected.push({ provider: 'bailian', kind: 'pricing-page', url: OFFICIAL_URLS.bailian })
  if (providers.has('ark')) expected.push({ provider: 'ark', kind: 'pricing-page', url: OFFICIAL_URLS.ark })
  if (providers.has('openrouter')) {
    expected.push({ provider: 'openrouter', kind: 'models-api', url: OFFICIAL_URLS.openrouterModels })
    for (const modelId of [...new Set(requirements.filter((item) => item.provider === 'openrouter').map((item) => item.modelId))].sort()) {
      expected.push({ provider: 'openrouter', kind: 'endpoints-api', url: `https://openrouter.ai/api/v1/images/models/${modelId}/endpoints` })
      if (Object.hasOwn(KREA_PRICES, modelId)) expected.push({ provider: 'openrouter', kind: 'pricing-page', url: `https://openrouter.ai/${modelId}` })
    }
    expected.push({ provider: 'fx', kind: 'fx-reference', url: OFFICIAL_URLS.ecbFx })
  }
  return expected.sort((left, right) => Buffer.compare(Buffer.from(`${left.provider}\0${left.kind}\0${left.url}`), Buffer.from(`${right.provider}\0${right.kind}\0${right.url}`)))
}

export function assertScientificV2OfficialPriceRefreshReport(
  value: ScientificV2OfficialPriceRefreshReport,
  canonicalManifest: Parameters<typeof deriveScientificV2PriceRequirements>[0],
) {
  exactRefreshKeys(value, [
    'schemaVersion', 'mode', 'capturedAt', 'requirements', 'requirementsHash', 'captures', 'capturesHash',
    'unresolved', 'resolved', 'refreshHash',
  ])
  const requirements = deriveScientificV2PriceRequirements(canonicalManifest)
  const { refreshHash, ...base } = value
  if (value.schemaVersion !== 1 || value.mode !== 'readonly-official-refresh' || value.resolved !== false
    || canonicalHash(base) !== refreshHash || canonicalHash(value.requirements) !== canonicalHash(requirements)
    || value.requirementsHash !== canonicalHash(requirements) || value.capturesHash !== canonicalHash(value.captures)
    || canonicalHash(value.unresolved) !== canonicalHash(initialUnresolved(requirements))) {
    scientificV2Error('SCIENTIFIC_V2_PRICE_REFRESH_REPORT_INVALID')
  }
  assertScientificV2Iso(value.capturedAt, 'SCIENTIFIC_V2_PRICE_REFRESH_REPORT_INVALID')
  for (const capture of value.captures) {
    exactRefreshKeys(capture, ['provider', 'kind', 'url', 'mediaType', 'capturedAt', 'byteSize', 'bytesSha256'])
    if (!['bailian', 'ark', 'openrouter', 'fx'].includes(capture.provider)
      || !['pricing-page', 'models-api', 'endpoints-api', 'fx-reference'].includes(capture.kind)
      || capture.capturedAt !== value.capturedAt || typeof capture.mediaType !== 'string' || !capture.mediaType
      || !Number.isSafeInteger(capture.byteSize) || capture.byteSize < 1 || capture.byteSize > MAX_CAPTURE_BYTES
      || !/^[a-f0-9]{64}$/.test(capture.bytesSha256)) scientificV2Error('SCIENTIFIC_V2_PRICE_REFRESH_REPORT_INVALID')
    try {
      const url = new URL(capture.url)
      if (url.protocol !== 'https:' || url.username || url.password || url.toString() !== capture.url) throw new Error()
    } catch { scientificV2Error('SCIENTIFIC_V2_PRICE_REFRESH_REPORT_INVALID') }
  }
  const actualCaptureIdentities = value.captures.map(({ provider, kind, url }) => ({ provider, kind, url }))
  if (canonicalHash(actualCaptureIdentities) !== canonicalHash(expectedCaptureIdentities(requirements))) {
    scientificV2Error('SCIENTIFIC_V2_PRICE_REFRESH_REPORT_INVALID')
  }
  return value
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
  const capture = {
    provider: input.provider,
    kind: input.kind,
    url: input.url,
    mediaType: (response.headers.get('content-type') || 'application/octet-stream').split(';')[0].trim().toLowerCase(),
    capturedAt: input.capturedAt,
    byteSize: bytes.length,
    bytesSha256: createHash('sha256').update(bytes).digest('hex'),
  } satisfies ScientificV2OfficialPriceCapture
  return { capture, bytes }
}

export async function refreshScientificV2OfficialPriceSources(input: {
  canonicalManifest: Parameters<typeof deriveScientificV2PriceRequirements>[0]
  capturedAt: string
  fetchImpl?: typeof fetch
  persistCapture?: (capture: ScientificV2OfficialPriceCapture, bytes: Uint8Array) => Promise<void>
}) {
  assertScientificV2Iso(input.capturedAt, 'SCIENTIFIC_V2_PRICE_REFRESH_CAPTURE_INVALID')
  const fetchImpl = input.fetchImpl || fetch
  const requirements = deriveScientificV2PriceRequirements(input.canonicalManifest)
  const captures: ScientificV2OfficialPriceCapture[] = []
  const providers = new Set(requirements.map((requirement) => requirement.provider))
  const capture = async (source: Parameters<typeof captureOfficialSource>[0]) => {
    const result = await captureOfficialSource(source)
    if (input.persistCapture) await input.persistCapture(result.capture, result.bytes)
    captures.push(result.capture)
  }
  if (providers.has('bailian')) await capture({
    provider: 'bailian', kind: 'pricing-page', url: OFFICIAL_URLS.bailian, capturedAt: input.capturedAt, fetchImpl,
  })
  if (providers.has('ark')) await capture({
    provider: 'ark', kind: 'pricing-page', url: OFFICIAL_URLS.ark, capturedAt: input.capturedAt, fetchImpl,
  })
  if (providers.has('openrouter')) {
    await capture({
      provider: 'openrouter', kind: 'models-api', url: OFFICIAL_URLS.openrouterModels, capturedAt: input.capturedAt, fetchImpl,
    })
    for (const modelId of [...new Set(requirements.filter((item) => item.provider === 'openrouter').map((item) => item.modelId))].sort()) {
      await capture({
        provider: 'openrouter', kind: 'endpoints-api',
        url: `https://openrouter.ai/api/v1/images/models/${modelId}/endpoints`, capturedAt: input.capturedAt, fetchImpl,
      })
      if (Object.hasOwn(KREA_PRICES, modelId)) await capture({
        provider: 'openrouter', kind: 'pricing-page', url: `https://openrouter.ai/${modelId}`,
        capturedAt: input.capturedAt, fetchImpl,
      })
    }
    await capture({
      provider: 'fx', kind: 'fx-reference', url: OFFICIAL_URLS.ecbFx, capturedAt: input.capturedAt, fetchImpl,
    })
  }
  captures.sort((left, right) => Buffer.compare(Buffer.from(`${left.provider}\0${left.kind}\0${left.url}`), Buffer.from(`${right.provider}\0${right.kind}\0${right.url}`)))
  const unresolved = initialUnresolved(requirements)
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

export function refreshScientificV2OfficialPriceSourcesFromAuthority(input: {
  canonicalManifest: Parameters<typeof deriveScientificV2PriceRequirements>[0]
  registryAuthority: { capturedAt: string }
  fetchImpl?: typeof fetch
  persistCapture?: (capture: ScientificV2OfficialPriceCapture, bytes: Uint8Array) => Promise<void>
}) {
  if (!input.registryAuthority || typeof input.registryAuthority !== 'object') {
    scientificV2Error('SCIENTIFIC_V2_PRICE_REFRESH_AUTHORITY_INVALID')
  }
  assertScientificV2Iso(input.registryAuthority.capturedAt, 'SCIENTIFIC_V2_PRICE_REFRESH_AUTHORITY_INVALID')
  return refreshScientificV2OfficialPriceSources({
    canonicalManifest: input.canonicalManifest,
    capturedAt: input.registryAuthority.capturedAt,
    fetchImpl: input.fetchImpl,
    persistCapture: input.persistCapture,
  })
}

function source(capture: ScientificV2OfficialPriceCapture) {
  return {
    url: capture.url, mediaType: capture.mediaType, capturedAt: capture.capturedAt, bytesSha256: capture.bytesSha256,
  }
}

function dimensions(imageSize: ScientificV2PriceRequirement['imageSize']) {
  return imageSize === '1K' ? { outputWidth: 1280, outputHeight: 720 } : { outputWidth: 2048, outputHeight: 1152 }
}

function escaped(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizedOfficialText(bytes: Buffer) {
  return bytes.toString('utf8').replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/\s+/g, ' ').trim()
}

function assertArkPriceEvidence(bytes: Buffer) {
  const text = normalizedOfficialText(bytes)
  const markers = ['doubao-seedream-5-0-pro', 'doubao-seedream-5-0-lite', 'doubao-seedream-4-5', 'doubao-seedream-4-0']
  const windowsFor = (marker: string) => {
    const windows: string[] = []
    let offset = 0
    while (offset < text.length) {
      const position = text.indexOf(marker, offset)
      if (position < 0) break
      windows.push(text.slice(position, position + 4000))
      offset = position + marker.length
    }
    return windows
  }
  const proMatches = windowsFor(markers[0]).some((window) => {
    const free = /首张(?:输入图片|图片)?免费/.test(window)
    const input = /第\s*2\s*张起\s*[：:]?\s*0\.02(?:\s*元)?/.exec(window)?.index ?? -1
    const low = /(?:不超过|≤)\s*261\s*万像素[^；;，,。]{0,120}0\.30(?:\s*元\s*\/\s*张)?/.exec(window)?.index ?? -1
    const high = /(?:超过|大于|>)\s*261\s*万像素[^；;，,。]{0,120}0\.60(?:\s*元\s*\/\s*张)?/.exec(window)?.index ?? -1
    return free && input >= 0 && low > input && high > low
  })
  if (!proMatches) {
    scientificV2Error('SCIENTIFIC_V2_ARK_PRICE_EVIDENCE_INVALID')
  }
  const expected = ['0.22', '0.25', '0.20']
  for (let index = 1; index < markers.length; index += 1) {
    const expectedPrice = expected[index - 1]
    if (!windowsFor(markers[index]).some((window) => new RegExp(
      `(?:^|[^\\d])${escaped(expectedPrice)}(?:\\s*元\\s*\\/\\s*张)?(?=$|[^\\d])`,
    ).test(window))) {
      scientificV2Error('SCIENTIFIC_V2_ARK_PRICE_EVIDENCE_INVALID')
    }
  }
}

function assertKreaPriceEvidence(bytes: Buffer, modelId: keyof typeof KREA_PRICES) {
  const text = normalizedOfficialText(bytes)
  const fixed = KREA_PRICES[modelId]
  const pattern = new RegExp(`${escaped(modelId)}\\s+costs\\s+\\$${escaped(fixed.generation)}\\s*\\/image\\s+for\\s+Image Output,\\s*\\$${escaped(fixed.edit)}\\s*\\/image\\s+for\\s+Image Output\\s*\\(style references\\)\\s+and\\s+\\$${escaped(fixed.moodboard)}\\s*\\/image\\s+for\\s+Image Output\\s*\\(moodboards\\)`, 'i')
  if (!pattern.test(text) || !/Up to\s+1\s+reference image/i.test(text) || !/renders at\s+1K/i.test(text)) {
    scientificV2Error('SCIENTIFIC_V2_OPENROUTER_PRICE_EVIDENCE_INVALID')
  }
}

export async function extractScientificV2OfficialPriceObservations(input: {
  canonicalManifest: Parameters<typeof deriveScientificV2PriceRequirements>[0]
  refreshReport: ScientificV2OfficialPriceRefreshReport
  loadCaptureBytes(capture: ScientificV2OfficialPriceCapture): Promise<Uint8Array>
}) {
  const requirements = deriveScientificV2PriceRequirements(input.canonicalManifest)
  assertScientificV2OfficialPriceRefreshReport(input.refreshReport, input.canonicalManifest)
  const captures = new Map(input.refreshReport.captures.map((item) => [item.url, item]))
  if (captures.size !== input.refreshReport.captures.length) scientificV2Error('SCIENTIFIC_V2_PRICE_REFRESH_REPORT_INVALID')
  const loaded = new Map<string, Buffer>()
  const bytesFor = async (url: string) => {
    const capture = captures.get(url)
    if (!capture) scientificV2Error('SCIENTIFIC_V2_PRICE_CAPTURE_MISSING')
    let bytes = loaded.get(url)
    if (!bytes) {
      bytes = Buffer.from(await input.loadCaptureBytes(capture))
      if (bytes.length !== capture.byteSize || createHash('sha256').update(bytes).digest('hex') !== capture.bytesSha256) {
        scientificV2Error('SCIENTIFIC_V2_PRICE_CAPTURE_HASH_MISMATCH')
      }
      loaded.set(url, bytes)
    }
    return { capture, bytes }
  }
  const observations: ScientificV2PriceObservation[] = []
  const unresolved: ScientificV2OfficialPriceRefreshReport['unresolved'] = []
  let fx: ScientificV2PriceObservation['fxEvidence'] | null = null
  const fxEvidence = async () => {
    if (fx) return fx
    const captured = await bytesFor(OFFICIAL_URLS.ecbFx)
    const xml = captured.bytes.toString('utf8')
    const rateDate = /time=['"](\d{4}-\d{2}-\d{2})['"]/.exec(xml)?.[1]
    const usd = /currency=['"]USD['"]\s+rate=['"](\d+(?:\.\d+)?)['"]/.exec(xml)?.[1]
    const cny = /currency=['"]CNY['"]\s+rate=['"](\d+(?:\.\d+)?)['"]/.exec(xml)?.[1]
    if (!rateDate || !usd || !cny) scientificV2Error('SCIENTIFIC_V2_FX_EVIDENCE_INVALID')
    fx = { source: source(captured.capture), rateDate, baseCurrency: 'EUR', usdPerBaseDecimal: usd, cnyPerBaseDecimal: cny }
    return fx
  }
  for (const requirement of requirements) {
    if (requirement.provider === 'ark' && Object.hasOwn(ARK_PRICES, requirement.modelId)) {
      const captured = await bytesFor(OFFICIAL_URLS.ark)
      assertArkPriceEvidence(captured.bytes)
      const rateDecimal = ARK_PRICES[requirement.modelId as keyof typeof ARK_PRICES]
      const sourceFree = requirement.operation === 'edit' ? 'source1-free;' : ''
      observations.push({
        provider: 'ark', modelId: requirement.modelId, operation: requirement.operation, imageSize: requirement.imageSize,
        billingRegion: 'cn-beijing', ...dimensions(requirement.imageSize),
        charges: [{
          billable: 'output_image', unit: 'image', rateDecimal, quantityDecimal: '1',
          resolutionTier: requirement.modelId === 'doubao-seedream-5-0-pro-260628'
            ? `${sourceFree}pixels<=2610000`
            : `${sourceFree}${requirement.imageSize}`,
        }],
        source: source(captured.capture), openRouterEvidence: null, fxEvidence: null,
      })
      continue
    }
    if (requirement.provider === 'openrouter' && Object.hasOwn(KREA_PRICES, requirement.modelId)) {
      const fixed = KREA_PRICES[requirement.modelId as keyof typeof KREA_PRICES]
      const [models, endpoint, page] = await Promise.all([
        bytesFor(OFFICIAL_URLS.openrouterModels),
        bytesFor(`https://openrouter.ai/api/v1/images/models/${requirement.modelId}/endpoints`),
        bytesFor(`https://openrouter.ai/${requirement.modelId}`),
      ])
      let modelsJson: any
      let endpointJson: any
      try { modelsJson = JSON.parse(models.bytes.toString('utf8')); endpointJson = JSON.parse(endpoint.bytes.toString('utf8')) } catch {
        scientificV2Error('SCIENTIFIC_V2_OPENROUTER_PRICE_EVIDENCE_INVALID')
      }
      if (!Array.isArray(modelsJson?.data) || !modelsJson.data.some((item: any) => item?.id === requirement.modelId)
        || endpointJson?.data?.id !== requirement.modelId || !Array.isArray(endpointJson?.data?.endpoints)
        || endpointJson.data.endpoints.length < 1) {
        scientificV2Error('SCIENTIFIC_V2_OPENROUTER_PRICE_EVIDENCE_INVALID')
      }
      assertKreaPriceEvidence(page.bytes, requirement.modelId as keyof typeof KREA_PRICES)
      const rateDecimal = fixed[requirement.operation]
      const pricingPage = source(page.capture)
      const rawPricing = [{
        billable: 'output_image' as const, unit: 'image' as const, costUsd: rateDecimal,
        variant: requirement.operation === 'edit' ? 'style_reference' : '1k',
      }]
      observations.push({
        provider: 'openrouter', modelId: requirement.modelId, operation: requirement.operation, imageSize: requirement.imageSize,
        billingRegion: 'openrouter-global', ...dimensions(requirement.imageSize),
        charges: [{
          billable: 'output_image', unit: 'image', rateDecimal, quantityDecimal: '1',
          resolutionTier: rawPricing[0].variant,
        }],
        source: pricingPage,
        openRouterEvidence: {
          modelApi: source(models.capture), endpointApi: source(endpoint.capture), pricingPage,
          modelId: requirement.modelId, providerSlug: 'krea', rawPricing, tokenBounds: null,
        },
        fxEvidence: await fxEvidence(),
      })
      continue
    }
    unresolved.push({
      requirementHash: requirement.requirementHash, provider: requirement.provider, modelId: requirement.modelId,
      operation: requirement.operation, reason: 'deterministic_official_price_extractor_unavailable',
    })
  }
  return Object.freeze({
    observations,
    unresolved,
    resolved: unresolved.length === 0,
    observationsHash: canonicalHash(observations),
  })
}

export async function extractScientificV2OfficialPriceObservationsForOperatorUpperBound(
  input: Parameters<typeof extractScientificV2OfficialPriceObservations>[0],
) {
  try {
    return await extractScientificV2OfficialPriceObservations(input)
  } catch (error) {
    const code = error instanceof Error ? error.message : ''
    if (![
      'SCIENTIFIC_V2_ARK_PRICE_EVIDENCE_INVALID',
      'SCIENTIFIC_V2_OPENROUTER_PRICE_EVIDENCE_INVALID',
      'SCIENTIFIC_V2_FX_EVIDENCE_INVALID',
    ].includes(code)) throw error
    const requirements = deriveScientificV2PriceRequirements(input.canonicalManifest)
    const unresolved = input.refreshReport.unresolved
    if (unresolved.length !== requirements.length
      || canonicalHash([...unresolved].map((item) => item.requirementHash).sort())
        !== canonicalHash(requirements.map((item) => item.requirementHash).sort())) throw error
    return Object.freeze({
      observations: [] as ScientificV2PriceObservation[],
      unresolved,
      resolved: false,
      observationsHash: canonicalHash([]),
    })
  }
}
