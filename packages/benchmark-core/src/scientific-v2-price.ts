import { canonicalHash } from './hash.js'
import { SCIENTIFIC_EDIT_SOURCE } from './scientific-edit-source.js'
import { PB_SCIENTIFIC_FIGURE_V2 } from './scientific-suite.js'
import { compareScientificIdentifiers } from './scientific-model-manifest.js'

export const SCIENTIFIC_V2_PRICE_ATOMS_PER_CNY = 100_000_000n
export const SCIENTIFIC_V2_PRICE_IMAGE_SIZES = ['1K', '2K', 'provider-default'] as const
export const SCIENTIFIC_V2_PRICE_ASPECT_RATIO = '16:9' as const
export const SCIENTIFIC_V2_PRICE_MAX_ATTEMPTS_PER_SLOT = 4 as const
export const SCIENTIFIC_V2_PRICE_PROVIDER_BUDGET_CNY = 180 as const
export const SCIENTIFIC_V2_PRICE_PROVIDER_BUDGETS_CNY = Object.freeze({
  bailian: 180,
  ark: 180,
  openrouter: 360,
} as const)

const hash64 = /^[a-f0-9]{64}$/
const providers = ['bailian', 'ark', 'openrouter'] as const
type Provider = typeof providers[number]
type Operation = 'generation' | 'edit'
type PricingUnit = 'image' | 'megapixel' | 'token' | 'request'
type Billable = 'output_image' | 'input_text' | 'input_image' | 'input_reference'

export interface ScientificV2PriceSourceEvidence {
  url: string
  mediaType: string
  capturedAt: string
  bytesSha256: string
}

export interface ScientificV2PriceCharge {
  billable: Billable
  unit: PricingUnit
  rateDecimal: string
  quantityDecimal: string
  resolutionTier: string | null
}

export interface ScientificV2OpenRouterPriceEvidence {
  modelApi: ScientificV2PriceSourceEvidence
  endpointApi: ScientificV2PriceSourceEvidence
  pricingPage: ScientificV2PriceSourceEvidence | null
  modelId: string
  providerSlug: string
  rawPricing: Array<{ billable: Billable; unit: PricingUnit; costUsd: string; variant: string | null }>
  tokenBounds: null | {
    contextLength: number
    maxCompletionTokens: number
    sourceField: 'top_provider.max_completion_tokens'
  }
}

export interface ScientificV2FxEvidence {
  source: ScientificV2PriceSourceEvidence
  rateDate: string
  baseCurrency: 'EUR'
  usdPerBaseDecimal: string
  cnyPerBaseDecimal: string
}

export interface ScientificV2PriceObservation {
  provider: Provider
  modelId: string
  operation: Operation
  imageSize: typeof SCIENTIFIC_V2_PRICE_IMAGE_SIZES[number]
  billingRegion: string
  outputWidth: number
  outputHeight: number
  charges: ScientificV2PriceCharge[]
  source: ScientificV2PriceSourceEvidence
  openRouterEvidence: ScientificV2OpenRouterPriceEvidence | null
  fxEvidence: ScientificV2FxEvidence | null
}

export interface ScientificV2PriceRequirement {
  provider: Provider
  modelId: string
  operation: Operation
  imageSize: typeof SCIENTIFIC_V2_PRICE_IMAGE_SIZES[number]
  canonicalModelIds: string[]
  slotCount: number
  scenario: {
    aspectRatio: '16:9'
    sourceImage: null | { sha256: string; width: number; height: number }
  }
  requirementHash: string
}

export interface ScientificV2AttestedPriceEntry extends ScientificV2PriceObservation {
  schemaVersion: 2
  originalCurrency: 'CNY' | 'USD'
  scenario: ScientificV2PriceRequirement['scenario']
  unitCnyAtoms: string
  unitCny: number
  rounding: 'ceil-to-1e-8-cny'
  entryHash: string
}

export interface ScientificV2PriceSnapshotV2 {
  schemaVersion: 2
  currency: 'CNY'
  imageSize: 'per-route'
  capturedAt: string
  canonicalManifestHash: string
  capturesHash: string
  operatorAuthorizationHash: string | null
  requirements: ScientificV2PriceRequirement[]
  requirementsHash: string
  entries: ScientificV2AttestedPriceEntry[]
  preflight: {
    maxAttemptsPerSlot: 4
    providerBudgetsCnyAtoms: Record<Provider, string>
    routes: Array<{
      provider: Provider
      modelId: string
      operation: Operation
      canonicalModelIds: string[]
      slotCount: number
      unitCnyAtoms: string
      baselineCnyAtoms: string
      worstCaseCnyAtoms: string
      routeHash: string
    }>
    providerTotals: Array<{
      provider: Provider
      providerBudgetCnyAtoms: string
      baselineCnyAtoms: string
      worstCaseCnyAtoms: string
      baselineWithinBudget: boolean
      worstCaseWithinBudget: boolean
    }>
    preflightHash: string
  }
  snapshotHash: string
}

function fail(code: string): never {
  throw new Error(code)
}

function isIso(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false
  return new Date(value).toISOString() === value
}

function exactKeys(value: unknown, expected: readonly string[], code: string): asserts value is Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) fail(code)
  const keys = Reflect.ownKeys(value)
  if (keys.some((key) => typeof key !== 'string')) fail(code)
  const actual = keys.map(String).sort()
  const wanted = [...expected].sort()
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) fail(code)
  for (const key of actual) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) fail(code)
  }
}

function assertSafePriceData(value: unknown) {
  const pending = [value]
  let nodes = 0
  while (pending.length) {
    const current = pending.pop()
    nodes += 1
    if (nodes > 100_000) fail('SCIENTIFIC_V2_PRICE_DATA_INVALID')
    if (current === null || ['string', 'number', 'boolean'].includes(typeof current)) {
      if (typeof current === 'number' && !Number.isFinite(current)) fail('SCIENTIFIC_V2_PRICE_DATA_INVALID')
      continue
    }
    if (!current || typeof current !== 'object') fail('SCIENTIFIC_V2_PRICE_DATA_INVALID')
    const isArray = Array.isArray(current)
    if ((!isArray && Object.getPrototypeOf(current) !== Object.prototype)
      || (isArray && Object.getPrototypeOf(current) !== Array.prototype)) fail('SCIENTIFIC_V2_PRICE_DATA_INVALID')
    const keys = Reflect.ownKeys(current)
    if (keys.some((key) => typeof key !== 'string')) fail('SCIENTIFIC_V2_PRICE_DATA_INVALID')
    for (const key of keys) {
      if (isArray && key === 'length') continue
      const descriptor = Object.getOwnPropertyDescriptor(current, key)
      if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) fail('SCIENTIFIC_V2_PRICE_DATA_INVALID')
      pending.push(descriptor.value)
    }
  }
}

function sourceEvidence(value: unknown, capturedAt: string) {
  exactKeys(value, ['url', 'mediaType', 'capturedAt', 'bytesSha256'], 'SCIENTIFIC_V2_PRICE_SOURCE_EVIDENCE_INVALID')
  let url: URL
  try { url = new URL(value.url) } catch { fail('SCIENTIFIC_V2_PRICE_SOURCE_EVIDENCE_INVALID') }
  if (url.protocol !== 'https:' || url.username || url.password || url.toString() !== value.url
    || typeof value.mediaType !== 'string' || !value.mediaType || value.capturedAt !== capturedAt
    || !hash64.test(String(value.bytesSha256 || ''))) fail('SCIENTIFIC_V2_PRICE_SOURCE_EVIDENCE_INVALID')
}

interface Fraction { numerator: bigint; denominator: bigint }

function decimal(value: unknown, code = 'SCIENTIFIC_V2_PRICE_DECIMAL_INVALID'): Fraction {
  if (typeof value !== 'string' || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) fail(code)
  const [whole, fraction = ''] = value.split('.')
  const denominator = 10n ** BigInt(fraction.length)
  return { numerator: BigInt(`${whole}${fraction}`), denominator }
}

function multiply(left: Fraction, right: Fraction): Fraction {
  return { numerator: left.numerator * right.numerator, denominator: left.denominator * right.denominator }
}

function add(left: Fraction, right: Fraction): Fraction {
  return {
    numerator: left.numerator * right.denominator + right.numerator * left.denominator,
    denominator: left.denominator * right.denominator,
  }
}

function ceilDivide(numerator: bigint, denominator: bigint) {
  if (denominator <= 0n) fail('SCIENTIFIC_V2_PRICE_DECIMAL_INVALID')
  return (numerator + denominator - 1n) / denominator
}

function expectedQuantity(unit: PricingUnit, billable: Billable, observation: ScientificV2PriceObservation) {
  if (unit === 'image') return '1'
  if (unit === 'request') return '1'
  if (unit === 'token') {
    const bounds = observation.openRouterEvidence?.tokenBounds
    if (!bounds) fail('SCIENTIFIC_V2_OPENROUTER_TOKEN_BOUND_UNRESOLVED')
    return String(billable === 'output_image' ? bounds.maxCompletionTokens : bounds.contextLength)
  }
  const dimensions = billable === 'output_image'
    ? [observation.outputWidth, observation.outputHeight]
    : [SCIENTIFIC_EDIT_SOURCE.width, SCIENTIFIC_EDIT_SOURCE.height]
  const pixels = BigInt(dimensions[0]) * BigInt(dimensions[1])
  const whole = pixels / 1_000_000n
  const remainder = (pixels % 1_000_000n).toString().padStart(6, '0').replace(/0+$/, '')
  return remainder ? `${whole}.${remainder}` : whole.toString()
}

function requirementKey(value: { provider: string; modelId: string; operation: string }) {
  return `${value.provider}\0${value.modelId}\0${value.operation}`
}

function compareRequirements(left: { provider: string; modelId: string; operation: string }, right: { provider: string; modelId: string; operation: string }) {
  return compareScientificIdentifiers(requirementKey(left), requirementKey(right))
}

export function deriveScientificV2PriceRequirements(canonicalManifest: {
  models: Array<{
    canonicalModelId: string
    generationRoute: { provider: string; modelId: string }
    editRoute: null | { provider: string; modelId: string; editMode: string }
    routes: Array<{ provider: string; modelId: string; resolutions: string[] }>
  }>
}): ScientificV2PriceRequirement[] {
  const counts = {
    generation: PB_SCIENTIFIC_FIGURE_V2.cases.filter((item) => item.kind === 'generation').length,
    edit: PB_SCIENTIFIC_FIGURE_V2.cases.filter((item) => item.kind === 'edit').length,
  }
  const requirements = new Map<string, Omit<ScientificV2PriceRequirement, 'requirementHash'>>()
  for (const model of canonicalManifest.models) {
    const routes = [
      { operation: 'generation' as const, route: model.generationRoute },
      { operation: 'edit' as const, route: model.editRoute },
    ]
    for (const { operation, route } of routes) {
      if (!route || route.provider === 'codex') continue
      if (!providers.includes(route.provider as Provider) || (operation === 'edit' && route.editMode !== 'direct-edit')) fail('SCIENTIFIC_V2_PRICE_REQUIREMENT_INVALID')
      const key = requirementKey({ ...route, operation })
      const physicalRoute = model.routes.find((candidate) => candidate.provider === route.provider && candidate.modelId === route.modelId)
      if (!physicalRoute) fail('SCIENTIFIC_V2_PRICE_REQUIREMENT_INVALID')
      const imageSize = physicalRoute.resolutions.includes('2K')
        ? '2K' as const
        : physicalRoute.resolutions.length === 1 && physicalRoute.resolutions[0] === '1K'
          ? '1K' as const
          : physicalRoute.resolutions.length === 0
            ? 'provider-default' as const
            : fail('SCIENTIFIC_V2_PRICE_OUTPUT_LANE_UNRESOLVED')
      const existing = requirements.get(key)
      if (existing) {
        if (existing.imageSize !== imageSize) fail('SCIENTIFIC_V2_PRICE_OUTPUT_LANE_UNRESOLVED')
        if (!existing.canonicalModelIds.includes(model.canonicalModelId)) existing.canonicalModelIds.push(model.canonicalModelId)
        continue
      }
      requirements.set(key, {
        provider: route.provider as Provider,
        modelId: route.modelId,
        operation,
        imageSize,
        canonicalModelIds: [model.canonicalModelId],
        slotCount: counts[operation],
        scenario: {
          aspectRatio: SCIENTIFIC_V2_PRICE_ASPECT_RATIO,
          sourceImage: operation === 'edit'
            ? { sha256: SCIENTIFIC_EDIT_SOURCE.sourceHash, width: SCIENTIFIC_EDIT_SOURCE.width, height: SCIENTIFIC_EDIT_SOURCE.height }
            : null,
        },
      })
    }
  }
  return [...requirements.values()]
    .map((item) => ({ ...item, canonicalModelIds: [...item.canonicalModelIds].sort(compareScientificIdentifiers) }))
    .sort(compareRequirements)
    .map((item) => ({ ...item, requirementHash: canonicalHash(item) }))
}

function validateObservation(observation: ScientificV2PriceObservation, requirement: ScientificV2PriceRequirement, capturedAt: string) {
  exactKeys(observation, [
    'provider', 'modelId', 'operation', 'imageSize', 'billingRegion', 'outputWidth', 'outputHeight',
    'charges', 'source', 'openRouterEvidence', 'fxEvidence',
  ], 'SCIENTIFIC_V2_PRICE_OBSERVATION_INVALID')
  if (observation.provider !== requirement.provider || observation.modelId !== requirement.modelId
    || observation.operation !== requirement.operation || observation.imageSize !== requirement.imageSize
    || typeof observation.billingRegion !== 'string' || !observation.billingRegion
    || !Number.isInteger(observation.outputWidth) || observation.outputWidth < 1
    || !Number.isInteger(observation.outputHeight) || observation.outputHeight < 1
    || !Array.isArray(observation.charges) || observation.charges.length < 1) fail('SCIENTIFIC_V2_PRICE_OBSERVATION_INVALID')
  const fixedDimensions = requirement.imageSize === '2K' ? [2048, 1152]
    : requirement.imageSize === '1K' ? [1280, 720]
      : requirement.imageSize === 'provider-default' ? [2048, 1152]
        : null
  if (fixedDimensions && (observation.outputWidth !== fixedDimensions[0] || observation.outputHeight !== fixedDimensions[1])) {
    fail('SCIENTIFIC_V2_PRICE_OUTPUT_DIMENSIONS_INVALID')
  }
  sourceEvidence(observation.source, capturedAt)
  let total: Fraction = { numerator: 0n, denominator: 1n }
  for (const charge of observation.charges) {
    exactKeys(charge, ['billable', 'unit', 'rateDecimal', 'quantityDecimal', 'resolutionTier'], 'SCIENTIFIC_V2_PRICE_CHARGE_INVALID')
    if (!['output_image', 'input_text', 'input_image', 'input_reference'].includes(charge.billable)
      || !['image', 'megapixel', 'token', 'request'].includes(charge.unit)
      || (observation.operation === 'generation' && !['output_image', 'input_text'].includes(charge.billable))
      || charge.quantityDecimal !== expectedQuantity(charge.unit, charge.billable, observation)
      || !(charge.resolutionTier === null || typeof charge.resolutionTier === 'string')) fail('SCIENTIFIC_V2_PRICE_CHARGE_INVALID')
    total = add(total, multiply(decimal(charge.rateDecimal), decimal(charge.quantityDecimal)))
  }
  if (!observation.charges.some((charge) => charge.billable === 'output_image')) fail('SCIENTIFIC_V2_PRICE_CHARGE_INVALID')

  const operatorUpperBound = observation.charges.length === 1
    && observation.charges[0].billable === 'output_image'
    && observation.charges[0].unit === 'request'
    && observation.charges[0].resolutionTier === 'operator_authorized_conservative_upper_bound'
    && observation.billingRegion === 'operator-authorized-upper-bound'
    && observation.source.url === 'https://paperbanana.asia/benchmark/scientific-v2/operator-authorized-conservative-upper-bound'
  if (operatorUpperBound) {
    if (observation.openRouterEvidence !== null || observation.fxEvidence !== null) fail('SCIENTIFIC_V2_PRICE_OBSERVATION_INVALID')
    return { originalCurrency: 'CNY' as const, cnyAtoms: ceilDivide(total.numerator * SCIENTIFIC_V2_PRICE_ATOMS_PER_CNY, total.denominator) }
  }

  if (observation.provider !== 'openrouter') {
    if (observation.openRouterEvidence !== null || observation.fxEvidence !== null
      || observation.charges.some((charge) => charge.billable !== 'output_image')) fail('SCIENTIFIC_V2_PRICE_OBSERVATION_INVALID')
    return { originalCurrency: 'CNY' as const, cnyAtoms: ceilDivide(total.numerator * SCIENTIFIC_V2_PRICE_ATOMS_PER_CNY, total.denominator) }
  }

  const openRouter = observation.openRouterEvidence
  const fx = observation.fxEvidence
  if (!openRouter || !fx) fail('SCIENTIFIC_V2_OPENROUTER_PRICE_EVIDENCE_INVALID')
  exactKeys(openRouter, ['modelApi', 'endpointApi', 'pricingPage', 'modelId', 'providerSlug', 'rawPricing', 'tokenBounds'], 'SCIENTIFIC_V2_OPENROUTER_PRICE_EVIDENCE_INVALID')
  sourceEvidence(openRouter.modelApi, capturedAt)
  sourceEvidence(openRouter.endpointApi, capturedAt)
  if (openRouter.pricingPage !== null) sourceEvidence(openRouter.pricingPage, capturedAt)
  if (openRouter.modelId !== observation.modelId || typeof openRouter.providerSlug !== 'string' || !openRouter.providerSlug
    || canonicalHash(openRouter.pricingPage || openRouter.endpointApi) !== canonicalHash(observation.source)
    || !Array.isArray(openRouter.rawPricing)) {
    fail('SCIENTIFIC_V2_OPENROUTER_PRICE_EVIDENCE_INVALID')
  }
  for (const raw of openRouter.rawPricing) {
    exactKeys(raw, ['billable', 'unit', 'costUsd', 'variant'], 'SCIENTIFIC_V2_OPENROUTER_PRICE_EVIDENCE_INVALID')
    if (!['output_image', 'input_text', 'input_image', 'input_reference'].includes(raw.billable)
      || !['image', 'megapixel', 'token', 'request'].includes(raw.unit)
      || (raw.variant !== null && (typeof raw.variant !== 'string'
        || !/^[A-Za-z0-9_-]{1,80}$/.test(raw.variant)
        || (!/(?:^|[_-])(1k|2k|4k)(?:$|[_-])/i.test(raw.variant)
          && !['style_reference', 'moodboard'].includes(raw.variant))))) {
      fail('SCIENTIFIC_V2_OPENROUTER_PRICE_EVIDENCE_INVALID')
    }
    decimal(raw.costUsd, 'SCIENTIFIC_V2_OPENROUTER_PRICE_EVIDENCE_INVALID')
  }
  if (openRouter.tokenBounds !== null) {
    exactKeys(openRouter.tokenBounds, ['contextLength', 'maxCompletionTokens', 'sourceField'], 'SCIENTIFIC_V2_OPENROUTER_TOKEN_BOUND_UNRESOLVED')
    if (!Number.isInteger(openRouter.tokenBounds.contextLength) || openRouter.tokenBounds.contextLength < 1
      || !Number.isInteger(openRouter.tokenBounds.maxCompletionTokens) || openRouter.tokenBounds.maxCompletionTokens < 1
      || openRouter.tokenBounds.maxCompletionTokens > openRouter.tokenBounds.contextLength
      || openRouter.tokenBounds.sourceField !== 'top_provider.max_completion_tokens') {
      fail('SCIENTIFIC_V2_OPENROUTER_TOKEN_BOUND_UNRESOLVED')
    }
  }
  const relevantBillables: Billable[] = observation.operation === 'edit'
    ? ['output_image', 'input_text', 'input_image', 'input_reference']
    : ['output_image', 'input_text']
  const rawRelevant = openRouter.rawPricing.filter((line) => relevantBillables.includes(line.billable))
  const variantHasResolution = rawRelevant.some((line) => /(?:^|[_-])(1k|2k|4k)(?:$|[_-])/i.test(line.variant || ''))
  const lane = observation.imageSize.toLowerCase()
  const applicableRaw = rawRelevant.filter((line) => {
    if (observation.imageSize === 'provider-default' || !variantHasResolution || line.variant === null) return true
    return new RegExp(`(?:^|[_-])${lane}(?:$|[_-])`, 'i').test(line.variant)
  })
  const derivedCharges: ScientificV2PriceCharge[] = []
  for (const billable of relevantBillables) {
    const candidates = applicableRaw.filter((line) => line.billable === billable)
    if (billable === 'output_image' && candidates.length === 0) fail('SCIENTIFIC_V2_OPENROUTER_PRICE_EVIDENCE_INVALID')
    if (candidates.length === 0) continue
    let selected: ScientificV2PriceCharge | null = null
    let selectedCost: Fraction | null = null
    for (const candidate of candidates) {
      const quantityDecimal = expectedQuantity(candidate.unit, candidate.billable, observation)
      const cost = multiply(decimal(candidate.costUsd), decimal(quantityDecimal))
      if (!selectedCost || cost.numerator * selectedCost.denominator > selectedCost.numerator * cost.denominator) {
        selectedCost = cost
        selected = {
          billable: candidate.billable, unit: candidate.unit, rateDecimal: candidate.costUsd,
          quantityDecimal, resolutionTier: candidate.variant,
        }
      }
    }
    derivedCharges.push(selected!)
  }
  if (canonicalHash(derivedCharges) !== canonicalHash(observation.charges)) fail('SCIENTIFIC_V2_OPENROUTER_PRICE_EVIDENCE_INVALID')

  exactKeys(fx, ['source', 'rateDate', 'baseCurrency', 'usdPerBaseDecimal', 'cnyPerBaseDecimal'], 'SCIENTIFIC_V2_FX_EVIDENCE_INVALID')
  sourceEvidence(fx.source, capturedAt)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fx.rateDate) || fx.baseCurrency !== 'EUR') fail('SCIENTIFIC_V2_FX_EVIDENCE_INVALID')
  const usdPerBase = decimal(fx.usdPerBaseDecimal, 'SCIENTIFIC_V2_FX_EVIDENCE_INVALID')
  const cnyPerBase = decimal(fx.cnyPerBaseDecimal, 'SCIENTIFIC_V2_FX_EVIDENCE_INVALID')
  if (usdPerBase.numerator === 0n || cnyPerBase.numerator === 0n) fail('SCIENTIFIC_V2_FX_EVIDENCE_INVALID')
  const numerator = total.numerator * cnyPerBase.numerator * usdPerBase.denominator * SCIENTIFIC_V2_PRICE_ATOMS_PER_CNY
  const denominator = total.denominator * cnyPerBase.denominator * usdPerBase.numerator
  return { originalCurrency: 'USD' as const, cnyAtoms: ceilDivide(numerator, denominator) }
}

function buildPreflight(requirements: ScientificV2PriceRequirement[], entries: ScientificV2AttestedPriceEntry[]) {
  const routes = requirements.map((requirement) => {
    const entry = entries.find((candidate) => requirementKey(candidate) === requirementKey(requirement))!
    const unit = BigInt(entry.unitCnyAtoms)
    const base = {
      provider: requirement.provider, modelId: requirement.modelId, operation: requirement.operation,
      canonicalModelIds: [...requirement.canonicalModelIds], slotCount: requirement.slotCount,
      unitCnyAtoms: unit.toString(),
      baselineCnyAtoms: (unit * BigInt(requirement.slotCount)).toString(),
      worstCaseCnyAtoms: (unit * BigInt(requirement.slotCount) * BigInt(SCIENTIFIC_V2_PRICE_MAX_ATTEMPTS_PER_SLOT)).toString(),
    }
    return { ...base, routeHash: canonicalHash(base) }
  })
  const providerTotals = providers.map((provider) => {
    const budget = BigInt(SCIENTIFIC_V2_PRICE_PROVIDER_BUDGETS_CNY[provider]) * SCIENTIFIC_V2_PRICE_ATOMS_PER_CNY
    const relevant = routes.filter((route) => route.provider === provider)
    const baseline = relevant.reduce((sum, route) => sum + BigInt(route.baselineCnyAtoms), 0n)
    const worstCase = relevant.reduce((sum, route) => sum + BigInt(route.worstCaseCnyAtoms), 0n)
    return {
      provider, providerBudgetCnyAtoms: budget.toString(), baselineCnyAtoms: baseline.toString(), worstCaseCnyAtoms: worstCase.toString(),
      baselineWithinBudget: baseline <= budget, worstCaseWithinBudget: worstCase <= budget,
    }
  })
  if (providerTotals.some((item) => !item.baselineWithinBudget)) fail('SCIENTIFIC_V2_PROVIDER_BASELINE_BUDGET_EXCEEDED')
  const base = {
    maxAttemptsPerSlot: SCIENTIFIC_V2_PRICE_MAX_ATTEMPTS_PER_SLOT,
    providerBudgetsCnyAtoms: Object.fromEntries(providers.map((provider) => [
      provider,
      (BigInt(SCIENTIFIC_V2_PRICE_PROVIDER_BUDGETS_CNY[provider]) * SCIENTIFIC_V2_PRICE_ATOMS_PER_CNY).toString(),
    ])) as Record<Provider, string>,
    routes, providerTotals,
  }
  return { ...base, preflightHash: canonicalHash(base) }
}

export function buildScientificV2PriceSnapshot(input: {
  canonicalManifest: Parameters<typeof deriveScientificV2PriceRequirements>[0] & { manifestHash: string }
  capturedAt: string
  observations: ScientificV2PriceObservation[]
  capturesHash?: string
  operatorAuthorizationHash?: string | null
}): ScientificV2PriceSnapshotV2 {
  assertSafePriceData(input.observations)
  if (!isIso(input.capturedAt) || !Array.isArray(input.observations)) fail('SCIENTIFIC_V2_PRICE_CAPTURE_INVALID')
  const requirements = deriveScientificV2PriceRequirements(input.canonicalManifest)
  const byKey = new Map<string, ScientificV2PriceObservation>()
  for (const observation of input.observations) {
    const key = requirementKey(observation)
    if (byKey.has(key)) fail('SCIENTIFIC_V2_PRICE_OBSERVATION_DUPLICATE')
    byKey.set(key, observation)
  }
  if (input.observations.length !== requirements.length || requirements.some((requirement) => !byKey.has(requirementKey(requirement)))) {
    fail('SCIENTIFIC_V2_PRICE_UNRESOLVED')
  }
  const entries = requirements.map((requirement) => {
    const observation = structuredClone(byKey.get(requirementKey(requirement))!)
    const converted = validateObservation(observation, requirement, input.capturedAt)
    const unitCny = Number(converted.cnyAtoms) / Number(SCIENTIFIC_V2_PRICE_ATOMS_PER_CNY)
    if (!Number.isSafeInteger(Number(converted.cnyAtoms))) fail('SCIENTIFIC_V2_PRICE_VALUE_OUT_OF_RANGE')
    const base = {
      schemaVersion: 2 as const, ...observation, originalCurrency: converted.originalCurrency,
      scenario: structuredClone(requirement.scenario), unitCnyAtoms: converted.cnyAtoms.toString(), unitCny,
      rounding: 'ceil-to-1e-8-cny' as const,
    }
    return { ...base, entryHash: canonicalHash(base) }
  })
  const requirementsHash = canonicalHash(requirements)
  const evidence = input.observations.flatMap((observation) => [
    observation.source,
    ...(observation.openRouterEvidence ? [
      observation.openRouterEvidence.modelApi,
      observation.openRouterEvidence.endpointApi,
      ...(observation.openRouterEvidence.pricingPage ? [observation.openRouterEvidence.pricingPage] : []),
    ] : []),
    ...(observation.fxEvidence ? [observation.fxEvidence.source] : []),
  ])
  const uniqueEvidence = [...new Map(evidence.map((item) => [canonicalHash(item), item])).values()]
    .sort((left, right) => Buffer.compare(Buffer.from(`${left.url}\0${left.bytesSha256}`), Buffer.from(`${right.url}\0${right.bytesSha256}`)))
  const capturesHash = input.capturesHash || canonicalHash(uniqueEvidence)
  const operatorAuthorizationHash = input.operatorAuthorizationHash ?? null
  const upperBounds = entries.filter((entry) => entry.charges[0]?.resolutionTier === 'operator_authorized_conservative_upper_bound')
  if (!hash64.test(input.canonicalManifest.manifestHash) || !hash64.test(capturesHash)
    || (operatorAuthorizationHash !== null && !hash64.test(operatorAuthorizationHash))
    || (upperBounds.length > 0 && (operatorAuthorizationHash === null
      || upperBounds.some((entry) => entry.source.bytesSha256 !== operatorAuthorizationHash)))
    || (upperBounds.length === 0 && operatorAuthorizationHash !== null)) fail('SCIENTIFIC_V2_PRICE_CAPTURE_INVALID')
  const preflight = buildPreflight(requirements, entries)
  const base = {
    schemaVersion: 2 as const, currency: 'CNY' as const, imageSize: 'per-route' as const,
    capturedAt: input.capturedAt, canonicalManifestHash: input.canonicalManifest.manifestHash, capturesHash, operatorAuthorizationHash,
    requirements, requirementsHash, entries, preflight,
  }
  return { ...base, snapshotHash: canonicalHash(base) }
}

export function verifyScientificV2PriceSnapshot(value: ScientificV2PriceSnapshotV2, canonicalManifest: Parameters<typeof deriveScientificV2PriceRequirements>[0] & { manifestHash: string }) {
  assertSafePriceData(value)
  exactKeys(value, ['schemaVersion', 'currency', 'imageSize', 'capturedAt', 'canonicalManifestHash', 'capturesHash', 'operatorAuthorizationHash', 'requirements', 'requirementsHash', 'entries', 'preflight', 'snapshotHash'], 'SCIENTIFIC_V2_PRICE_SNAPSHOT_INVALID')
  if (value.schemaVersion !== 2 || value.currency !== 'CNY' || value.imageSize !== 'per-route' || !isIso(value.capturedAt)
    || value.canonicalManifestHash !== canonicalManifest.manifestHash || !hash64.test(value.capturesHash)
    || (value.operatorAuthorizationHash !== null && !hash64.test(value.operatorAuthorizationHash))
    || !hash64.test(String(value.snapshotHash || ''))) fail('SCIENTIFIC_V2_PRICE_SNAPSHOT_INVALID')
  const { snapshotHash, ...base } = value
  if (canonicalHash(base) !== snapshotHash) fail('SCIENTIFIC_V2_PRICE_HASH_MISMATCH')
  const expectedRequirements = deriveScientificV2PriceRequirements(canonicalManifest)
  if (canonicalHash(value.requirements) !== value.requirementsHash
    || canonicalHash(value.requirements) !== canonicalHash(expectedRequirements)) fail('SCIENTIFIC_V2_PRICE_REQUIREMENTS_MISMATCH')
  if (!Array.isArray(value.entries) || value.entries.length !== expectedRequirements.length) fail('SCIENTIFIC_V2_PRICE_UNRESOLVED')
  for (const requirement of expectedRequirements) {
    const entry = value.entries.find((candidate) => requirementKey(candidate) === requirementKey(requirement))
    if (!entry) fail('SCIENTIFIC_V2_PRICE_UNRESOLVED')
    const { entryHash, schemaVersion, originalCurrency, scenario, unitCnyAtoms, unitCny, rounding, ...observation } = entry
    if (schemaVersion !== 2 || entryHash !== canonicalHash({ schemaVersion, ...observation, originalCurrency, scenario, unitCnyAtoms, unitCny, rounding })
      || canonicalHash(scenario) !== canonicalHash(requirement.scenario) || rounding !== 'ceil-to-1e-8-cny') fail('SCIENTIFIC_V2_PRICE_HASH_MISMATCH')
    const converted = validateObservation(observation, requirement, value.capturedAt)
    if (converted.originalCurrency !== originalCurrency || converted.cnyAtoms.toString() !== unitCnyAtoms
      || Number(converted.cnyAtoms) / Number(SCIENTIFIC_V2_PRICE_ATOMS_PER_CNY) !== unitCny) fail('SCIENTIFIC_V2_PRICE_CONVERSION_MISMATCH')
  }
  const upperBounds = value.entries.filter((entry) => entry.charges[0]?.resolutionTier === 'operator_authorized_conservative_upper_bound')
  if ((upperBounds.length > 0 && (value.operatorAuthorizationHash === null
    || upperBounds.some((entry) => entry.source.bytesSha256 !== value.operatorAuthorizationHash)))
    || (upperBounds.length === 0 && value.operatorAuthorizationHash !== null)) fail('SCIENTIFIC_V2_PRICE_CAPTURE_INVALID')
  const expectedPreflight = buildPreflight(expectedRequirements, value.entries)
  if (canonicalHash(expectedPreflight) !== canonicalHash(value.preflight)) fail('SCIENTIFIC_V2_PRICE_PREFLIGHT_MISMATCH')
  return value
}

export function reconcileScientificV2ActualPrice(entry: ScientificV2AttestedPriceEntry, actual: {
  width: number
  height: number
  imageHash: string
}) {
  assertSafePriceData(entry)
  assertSafePriceData(actual)
  if (!Number.isInteger(actual.width) || actual.width < 1 || !Number.isInteger(actual.height) || actual.height < 1
    || !hash64.test(actual.imageHash)) fail('SCIENTIFIC_V2_ACTUAL_PRICE_FACTS_INVALID')
  const { entryHash, ...entryBase } = entry
  if (entryHash !== canonicalHash(entryBase)) fail('SCIENTIFIC_V2_PRICE_HASH_MISMATCH')
  let total: Fraction = { numerator: 0n, denominator: 1n }
  for (const charge of entry.charges) {
    const rateDecimal = entry.provider === 'ark' && entry.modelId === 'doubao-seedream-5-0-pro-260628'
      && entry.source.url === 'https://docs.volcengine.com/docs/82379/1544106?lang=zh'
      && charge.billable === 'output_image' && charge.unit === 'image'
      && charge.rateDecimal === '0.30' && charge.resolutionTier?.split(';').at(-1) === 'pixels<=2610000'
      && BigInt(actual.width) * BigInt(actual.height) > 2_610_000n
      ? '0.60'
      : charge.rateDecimal
    const quantity = charge.unit === 'megapixel' && charge.billable === 'output_image'
      ? expectedQuantity(charge.unit, charge.billable, { ...entry, outputWidth: actual.width, outputHeight: actual.height })
      : charge.quantityDecimal
    total = add(total, multiply(decimal(rateDecimal), decimal(quantity)))
  }
  let actualCnyAtoms: bigint
  if (entry.originalCurrency === 'CNY') {
    actualCnyAtoms = ceilDivide(total.numerator * SCIENTIFIC_V2_PRICE_ATOMS_PER_CNY, total.denominator)
  } else {
    if (!entry.fxEvidence) fail('SCIENTIFIC_V2_FX_EVIDENCE_INVALID')
    const usdPerBase = decimal(entry.fxEvidence.usdPerBaseDecimal, 'SCIENTIFIC_V2_FX_EVIDENCE_INVALID')
    const cnyPerBase = decimal(entry.fxEvidence.cnyPerBaseDecimal, 'SCIENTIFIC_V2_FX_EVIDENCE_INVALID')
    actualCnyAtoms = ceilDivide(
      total.numerator * cnyPerBase.numerator * usdPerBase.denominator * SCIENTIFIC_V2_PRICE_ATOMS_PER_CNY,
      total.denominator * cnyPerBase.denominator * usdPerBase.numerator,
    )
  }
  if (!Number.isSafeInteger(Number(actualCnyAtoms))) fail('SCIENTIFIC_V2_PRICE_VALUE_OUT_OF_RANGE')
  const base = {
    schemaVersion: 1 as const,
    entryHash,
    imageHash: actual.imageHash,
    width: actual.width,
    height: actual.height,
    estimateWidth: entry.outputWidth,
    estimateHeight: entry.outputHeight,
    estimatedCnyAtoms: entry.unitCnyAtoms,
    actualCnyAtoms: actualCnyAtoms.toString(),
    actualCny: Number(actualCnyAtoms) / Number(SCIENTIFIC_V2_PRICE_ATOMS_PER_CNY),
    rounding: 'ceil-to-1e-8-cny' as const,
  }
  return { ...base, reconciliationHash: canonicalHash(base) }
}
