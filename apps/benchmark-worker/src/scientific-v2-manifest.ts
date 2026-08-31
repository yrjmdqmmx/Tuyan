import {
  PB_SCIENTIFIC_FIGURE_V2,
  SCIENTIFIC_BENCHMARK_IDENTITY,
  buildScientificV2CanonicalManifest,
  canonicalHash,
  compareScientificIdentifiers,
  deriveScientificV2PriceRequirements,
  verifyScientificV2PriceSnapshot,
  type ScientificV2AttestedPriceEntry,
  type ScientificV2PriceSnapshotV2,
} from '@paperbanana/benchmark-core'

import {
  SCIENTIFIC_V2_PROVIDERS,
  assertBoundedScientificV2PlainData,
  assertExactScientificV2Keys,
  assertScientificV2Iso,
  deepFreezeScientificV2,
  isScientificV2Hash,
  scientificV2CnyFromUnits,
  scientificV2CnyToUnits,
  scientificV2Error,
  type ScientificV2Operation,
  type ScientificV2Provider,
} from './scientific-v2-common.js'

export type ScientificV2PriceEntry = ScientificV2AttestedPriceEntry

export const SCIENTIFIC_V2_PRODUCTION_LOCK_NAME = '/run/lock/paperbanana-hk-production.lock'

export type ScientificV2PriceSnapshot = ScientificV2PriceSnapshotV2

export interface ScientificV2ExecutionSlot {
  sequence: number
  slotId: string
  canonicalModelId: string
  caseId: string
  provider: ScientificV2Provider | null
  modelId: string | null
  operation: ScientificV2Operation
  imageSize: '1K' | '2K' | 'provider-default' | null
  supported: boolean
  isProviderCanary: boolean
  routeStatus: 'frozen_route' | 'no_direct_edit_route'
}

export interface ScientificV2Attempt {
  attemptIndex: number
  provider: ScientificV2Provider
  model: string
  operation: ScientificV2Operation
  payloadHash: string
  responseClass: string
  estimatedCny: number
  actualCny: number | null
  startedAt: string
  completedAt: string
  rawImageHash: string | null
  byteSize: number | null
  width: number | null
  height: number | null
  format: 'png' | 'jpeg' | 'webp' | null
  sourceHash: string | null
  editedHash: string | null
  attemptHash: string
}

export interface ScientificV2SlotState extends ScientificV2ExecutionSlot {
  status: 'pending' | 'retrying' | 'succeeded' | 'unsupported' | 'awaiting_artifact' | 'unknown' | 'failed' | 'budget_blocked' | 'not_executed' | 'price_reconciliation' | 'artifact_reconciliation'
  costCny: number | null
  attempts: ScientificV2Attempt[]
}

export interface ScientificV2BatchState {
  schemaVersion: 2
  manifestHash: string
  status: 'ready' | 'running' | 'canary_complete' | 'awaiting_artifacts' | 'completed' | 'paused' | 'blocked'
  pauseReason: 'reconciliation_required' | 'price_reconciliation_required' | 'artifact_reconciliation_required' | null
  blockReason: 'provider_budget_exceeded_before_attempt' | 'provider_canary_failed' | null
  createdAt: string
  updatedAt: string
  providerSpentCny: Record<Exclude<ScientificV2Provider, 'codex'>, number>
  providerUnreconciledCny: Record<Exclude<ScientificV2Provider, 'codex'>, number>
  slots: ScientificV2SlotState[]
  stateHash: string
}

type CanonicalManifest = ReturnType<typeof buildScientificV2CanonicalManifest>
export type ScientificV2RegistrySnapshot = Parameters<typeof buildScientificV2CanonicalManifest>[0] & { snapshotHash: string }

export interface ScientificV2BatchManifest {
  schemaVersion: 2
  suiteId: string
  evaluationMode: string
  evaluationEpoch: string
  reviewProtocol: string
  presentationVersion: string
  codeSha: string
  registryVersion: string
  registryHash: string
  registrySnapshotHash: string
  registrySnapshot: ScientificV2RegistrySnapshot
  canonicalManifestHash: string
  suiteHash: string
  priceHash: string
  priceOperatorAuthorizationHash: string | null
  canonicalManifest: CanonicalManifest
  models: CanonicalManifest['models']
  cases: typeof PB_SCIENTIFIC_FIGURE_V2.cases[number][]
  executionOrder: ScientificV2ExecutionSlot[]
  providerOrder: Array<Exclude<ScientificV2Provider, 'codex'>>
  providerBudgetsCny: Record<Exclude<ScientificV2Provider, 'codex'>, number>
  codexLimits: { modelId: 'codex:gpt-image-2'; successfulSlots: 9; maxAttemptsPerSlot: 4; maxToolCalls: 36 }
  concurrency: 1
  lockName: string
  priceSnapshot: ScientificV2PriceSnapshot
  createdAt: string
  manifestHash: string
}

function isScientificV2Provider(value: string): value is ScientificV2Provider {
  return value === 'bailian' || value === 'ark' || value === 'openrouter' || value === 'codex'
}

function assertCoreCanonicalManifest(value: CanonicalManifest) {
  assertExactScientificV2Keys(value, [
    'schemaVersion', 'suiteId', 'evaluationMode', 'evaluationEpoch', 'reviewProtocol', 'presentationVersion',
    'registryVersion', 'registryHash', 'routePriority', 'rawRouteCount', 'canonicalModelCount', 'models', 'manifestHash',
  ], 'SCIENTIFIC_V2_CANONICAL_MANIFEST_SCHEMA_INVALID')
  assertBoundedScientificV2PlainData(value, { maxDepth: 10, maxNodes: 80_000, maxArrayLength: 4_096, maxStringLength: 4_096 }, 'SCIENTIFIC_V2_CANONICAL_MANIFEST_SCHEMA_INVALID')
  const { manifestHash, ...base } = value
  if (!isScientificV2Hash(manifestHash) || canonicalHash(base) !== manifestHash) scientificV2Error('SCIENTIFIC_V2_CANONICAL_MANIFEST_HASH_MISMATCH')
  if (value.schemaVersion !== 2 || !isScientificV2Hash(value.registryHash)
    || typeof value.registryVersion !== 'string' || !value.registryVersion
    || canonicalHash(value.routePriority) !== canonicalHash(['bailian', 'ark', 'openrouter'])
    || Object.entries(SCIENTIFIC_BENCHMARK_IDENTITY).some(([key, expected]) => (value as unknown as Record<string, unknown>)[key] !== expected)
    || !Array.isArray(value.models) || value.models.length !== value.canonicalModelCount) scientificV2Error('SCIENTIFIC_V2_CANONICAL_MANIFEST_SCHEMA_INVALID')
  const routePriority: Record<ScientificV2Provider, number> = { bailian: 0, ark: 1, openrouter: 2, codex: 3 }
  let reconstructedRawRouteCount = 0
  const canonicalModelIds = new Set<string>()
  for (const model of value.models) {
    assertExactScientificV2Keys(model, ['canonicalModelId', 'displayName', 'developer', 'generationRoute', 'editRoute', 'routes'], 'SCIENTIFIC_V2_CANONICAL_MODEL_SCHEMA_INVALID')
    if (typeof model.canonicalModelId !== 'string' || !model.canonicalModelId
      || canonicalModelIds.has(model.canonicalModelId)
      || typeof model.displayName !== 'string' || !model.displayName
      || typeof model.developer !== 'string' || !model.developer) scientificV2Error('SCIENTIFIC_V2_CANONICAL_MODEL_SCHEMA_INVALID')
    canonicalModelIds.add(model.canonicalModelId)
    assertExactScientificV2Keys(model.generationRoute, ['provider', 'modelId'], 'SCIENTIFIC_V2_ROUTE_INVALID')
    if (!isScientificV2Provider(model.generationRoute.provider)
      || typeof model.generationRoute.modelId !== 'string' || !model.generationRoute.modelId) scientificV2Error('SCIENTIFIC_V2_ROUTE_INVALID')
    if (model.editRoute) {
      assertExactScientificV2Keys(model.editRoute, ['provider', 'modelId', 'editMode'], 'SCIENTIFIC_V2_ROUTE_INVALID')
      if (!isScientificV2Provider(model.editRoute.provider) || model.editRoute.editMode !== 'direct-edit'
        || typeof model.editRoute.modelId !== 'string' || !model.editRoute.modelId) scientificV2Error('SCIENTIFIC_V2_ROUTE_INVALID')
    }
    if (!Array.isArray(model.routes)) scientificV2Error('SCIENTIFIC_V2_ROUTE_INVALID')
    const physicalRoutes = new Set<string>()
    for (const route of model.routes) {
      assertExactScientificV2Keys(route, ['provider', 'modelId', 'editMode', 'resolutions'], 'SCIENTIFIC_V2_ROUTE_INVALID')
      const physicalRoute = `${route.provider}\0${route.modelId}`
      if (!isScientificV2Provider(route.provider) || typeof route.modelId !== 'string' || !route.modelId
        || !['direct-edit', 'analyze-redraw', 'none'].includes(route.editMode)
        || !Array.isArray(route.resolutions)
        || route.resolutions.some((resolution) => typeof resolution !== 'string' || !resolution)
        || canonicalHash([...new Set(route.resolutions)].sort(compareScientificIdentifiers)) !== canonicalHash(route.resolutions)
        || physicalRoutes.has(physicalRoute)) scientificV2Error('SCIENTIFIC_V2_ROUTE_INVALID')
      physicalRoutes.add(physicalRoute)
    }
    reconstructedRawRouteCount += model.routes.length
    const derivedRoutes = [...model.routes].sort((left, right) => routePriority[left.provider] - routePriority[right.provider]
      || compareScientificIdentifiers(left.modelId, right.modelId))
    if (canonicalHash(derivedRoutes) !== canonicalHash(model.routes)) scientificV2Error('SCIENTIFIC_V2_CANONICAL_ROUTE_DERIVATION_INVALID')
    const generationRoute = derivedRoutes[0] && { provider: derivedRoutes[0].provider, modelId: derivedRoutes[0].modelId }
    const directEdit = derivedRoutes.find((route) => route.editMode === 'direct-edit')
    const editRoute = directEdit ? { provider: directEdit.provider, modelId: directEdit.modelId, editMode: 'direct-edit' } : null
    if (canonicalHash(generationRoute) !== canonicalHash(model.generationRoute)
      || canonicalHash(editRoute) !== canonicalHash(model.editRoute)) scientificV2Error('SCIENTIFIC_V2_CANONICAL_ROUTE_DERIVATION_INVALID')
  }
  const derivedModelOrder = [...value.models].sort((left, right) => compareScientificIdentifiers(left.canonicalModelId, right.canonicalModelId))
  if (canonicalHash(derivedModelOrder) !== canonicalHash(value.models)) scientificV2Error('SCIENTIFIC_V2_CANONICAL_MODEL_ORDER_DERIVATION_INVALID')
  if (value.rawRouteCount !== reconstructedRawRouteCount || value.canonicalModelCount !== value.models.length) scientificV2Error('SCIENTIFIC_V2_CANONICAL_COUNT_DERIVATION_INVALID')
}

function verifyRegistryAuthority(snapshot: ScientificV2RegistrySnapshot, canonicalManifest: CanonicalManifest) {
  assertBoundedScientificV2PlainData(snapshot, { maxDepth: 8, maxNodes: 20_000, maxArrayLength: 512, maxStringLength: 4_096 }, 'SCIENTIFIC_V2_REGISTRY_SNAPSHOT_INVALID')
  assertExactScientificV2Keys(snapshot, ['registryVersion', 'registryHash', 'registry', 'snapshotHash'], 'SCIENTIFIC_V2_REGISTRY_SNAPSHOT_INVALID')
  const { snapshotHash, ...snapshotBase } = snapshot
  if (!isScientificV2Hash(snapshotHash) || snapshotHash !== canonicalHash(snapshotBase)
    || snapshot.registryVersion !== canonicalManifest.registryVersion || snapshot.registryHash !== canonicalManifest.registryHash) {
    scientificV2Error('SCIENTIFIC_V2_REGISTRY_SNAPSHOT_INVALID')
  }
  let rebuilt: CanonicalManifest
  try {
    rebuilt = buildScientificV2CanonicalManifest(snapshotBase)
  } catch {
    scientificV2Error('SCIENTIFIC_V2_REGISTRY_CANONICAL_REBUILD_MISMATCH')
  }
  if (canonicalHash(rebuilt) !== canonicalHash(canonicalManifest)) scientificV2Error('SCIENTIFIC_V2_REGISTRY_CANONICAL_REBUILD_MISMATCH')
  const codexModels = rebuilt.models.filter((model) => model.canonicalModelId === 'codex:gpt-image-2')
  if (codexModels.length !== 1 || rebuilt.models.length < 2 || rebuilt.models.length > 257) scientificV2Error('SCIENTIFIC_V2_REGISTRY_MODEL_ROSTER_INVALID')
  const physicalRoutes = new Map<string, string>()
  for (const model of rebuilt.models) {
    for (const route of model.routes) {
      const physical = `${route.provider}\0${route.modelId}`
      const existing = physicalRoutes.get(physical)
      if (existing && existing !== model.canonicalModelId) scientificV2Error('SCIENTIFIC_V2_REGISTRY_PHYSICAL_ROUTE_COLLISION')
      physicalRoutes.set(physical, model.canonicalModelId)
    }
  }
}

function stateHash(state: Omit<ScientificV2BatchState, 'stateHash'>) {
  return canonicalHash(state)
}

export function buildScientificV2Batch(input: {
  canonicalManifest: CanonicalManifest
  registrySnapshot: ScientificV2RegistrySnapshot
  suite: typeof PB_SCIENTIFIC_FIGURE_V2
  codeSha: string
  priceSnapshot: ScientificV2PriceSnapshot
  createdAt: string
  lockName: string
}) {
  if (!/^[a-f0-9]{40}$/.test(input.codeSha)) scientificV2Error('SCIENTIFIC_V2_CODE_SHA_INVALID')
  assertScientificV2Iso(input.createdAt, 'SCIENTIFIC_V2_CREATED_AT_INVALID')
  if (input.lockName !== SCIENTIFIC_V2_PRODUCTION_LOCK_NAME) scientificV2Error('SCIENTIFIC_V2_LOCK_INVALID')
  if (input.suite.manifestHash !== PB_SCIENTIFIC_FIGURE_V2.manifestHash) scientificV2Error('SCIENTIFIC_V2_SUITE_MISMATCH')
  assertCoreCanonicalManifest(input.canonicalManifest)
  verifyRegistryAuthority(input.registrySnapshot, input.canonicalManifest)
  if (!isScientificV2Hash(input.canonicalManifest.registryHash) || !isScientificV2Hash(input.canonicalManifest.manifestHash)) {
    scientificV2Error('SCIENTIFIC_V2_REGISTRY_BINDING_INVALID')
  }
  for (const [key, value] of Object.entries(SCIENTIFIC_BENCHMARK_IDENTITY)) {
    if ((input.canonicalManifest as unknown as Record<string, unknown>)[key] !== value) scientificV2Error('SCIENTIFIC_V2_IDENTITY_MISMATCH')
  }

  const models = structuredClone(input.canonicalManifest.models)
  const cases: ScientificV2BatchManifest['cases'] = structuredClone([...PB_SCIENTIFIC_FIGURE_V2.cases])
  const providerRank: Record<ScientificV2Provider, number> = { bailian: 0, ark: 1, openrouter: 2, codex: 3 }
  const priceRequirements = new Map(deriveScientificV2PriceRequirements(input.canonicalManifest)
    .map((requirement) => [`${requirement.provider}\0${requirement.modelId}\0${requirement.operation}`, requirement]))
  const executionOrder: ScientificV2ExecutionSlot[] = []
  const providerCanaries = new Set<string>()
  for (const model of models) {
    if (!isScientificV2Provider(model.generationRoute.provider)
      || (model.editRoute && (!isScientificV2Provider(model.editRoute.provider) || model.editRoute.editMode !== 'direct-edit'))) {
      scientificV2Error('SCIENTIFIC_V2_ROUTE_INVALID')
    }
    for (const scientificCase of cases) {
      const operation = scientificCase.kind
      const route = operation === 'generation' ? model.generationRoute : model.editRoute
      const supported = operation === 'generation' || Boolean(route)
      const provider = route?.provider ?? null
      const modelId = route?.modelId ?? null
      const priceRequirement = provider && provider !== 'codex' && modelId
        ? priceRequirements.get(`${provider}\0${modelId}\0${operation}`)
        : null
      const imageSize = !supported ? null : provider === 'codex' ? '2K' : priceRequirement?.imageSize
      if (supported && !imageSize) scientificV2Error('SCIENTIFIC_V2_PRICE_REQUIREMENT_INVALID')
      executionOrder.push({
        sequence: 0,
        slotId: `${model.canonicalModelId}:${scientificCase.id}`,
        canonicalModelId: model.canonicalModelId,
        caseId: scientificCase.id,
        provider,
        modelId,
        operation,
        imageSize: imageSize || null,
        supported,
        isProviderCanary: false,
        routeStatus: supported ? 'frozen_route' : 'no_direct_edit_route',
      })
    }
  }
  const caseRank = new Map(cases.map((scientificCase, index) => [scientificCase.id, index]))
  executionOrder.sort((left, right) => {
    const leftRank = left.provider === null ? 4 : providerRank[left.provider]
    const rightRank = right.provider === null ? 4 : providerRank[right.provider]
    return leftRank - rightRank
      || compareScientificIdentifiers(left.canonicalModelId, right.canonicalModelId)
      || (caseRank.get(left.caseId)! - caseRank.get(right.caseId)!)
  })
  executionOrder.forEach((slot, index) => {
    slot.sequence = index + 1
    if (slot.supported && slot.provider && slot.provider !== 'codex' && !providerCanaries.has(slot.provider)) {
      slot.isProviderCanary = true
      providerCanaries.add(slot.provider)
    }
  })
  verifyScientificV2PriceSnapshot(input.priceSnapshot, input.canonicalManifest)
  if (input.priceSnapshot.capturedAt !== input.createdAt) scientificV2Error('SCIENTIFIC_V2_PRICE_CAPTURE_DRIFT')
  const base = {
    schemaVersion: 2 as const,
    ...SCIENTIFIC_BENCHMARK_IDENTITY,
    codeSha: input.codeSha,
    registryVersion: input.canonicalManifest.registryVersion,
    registryHash: input.canonicalManifest.registryHash,
    registrySnapshotHash: input.registrySnapshot.snapshotHash,
    registrySnapshot: structuredClone(input.registrySnapshot),
    canonicalManifestHash: input.canonicalManifest.manifestHash,
    suiteHash: PB_SCIENTIFIC_FIGURE_V2.manifestHash,
    priceHash: input.priceSnapshot.snapshotHash,
    priceOperatorAuthorizationHash: input.priceSnapshot.operatorAuthorizationHash,
    canonicalManifest: structuredClone(input.canonicalManifest),
    models,
    cases,
    executionOrder,
    providerOrder: [...SCIENTIFIC_V2_PROVIDERS],
    providerBudgetsCny: { bailian: 180, ark: 180, openrouter: 180 },
    codexLimits: { modelId: 'codex:gpt-image-2' as const, successfulSlots: 9 as const, maxAttemptsPerSlot: 4 as const, maxToolCalls: 36 as const },
    concurrency: 1 as const,
    lockName: input.lockName,
    priceSnapshot: structuredClone(input.priceSnapshot),
    createdAt: input.createdAt,
  }
  const manifest: ScientificV2BatchManifest = deepFreezeScientificV2({ ...base, manifestHash: canonicalHash(base) })
  const stateBase: Omit<ScientificV2BatchState, 'stateHash'> = {
    schemaVersion: 2,
    manifestHash: manifest.manifestHash,
    status: 'ready',
    pauseReason: null,
    blockReason: null,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
    providerSpentCny: { bailian: 0, ark: 0, openrouter: 0 },
    providerUnreconciledCny: { bailian: 0, ark: 0, openrouter: 0 },
    slots: executionOrder.map((slot) => ({ ...slot, status: 'pending', costCny: null, attempts: [] })),
  }
  return { manifest, state: deepFreezeScientificV2({ ...stateBase, stateHash: stateHash(stateBase) }) }
}

export function verifyScientificV2BatchManifest(manifest: ScientificV2BatchManifest) {
  assertExactScientificV2Keys(manifest, [
    'schemaVersion', 'suiteId', 'evaluationMode', 'evaluationEpoch', 'reviewProtocol', 'presentationVersion',
    'codeSha', 'registryVersion', 'registryHash', 'registrySnapshotHash', 'registrySnapshot', 'canonicalManifestHash', 'suiteHash', 'priceHash', 'priceOperatorAuthorizationHash',
    'canonicalManifest', 'models', 'cases', 'executionOrder', 'providerOrder', 'providerBudgetsCny',
    'codexLimits', 'concurrency', 'lockName', 'priceSnapshot', 'createdAt', 'manifestHash',
  ], 'SCIENTIFIC_V2_MANIFEST_SCHEMA_INVALID')
  assertBoundedScientificV2PlainData(manifest, { maxDepth: 14, maxNodes: 200_000, maxArrayLength: 4_096, maxStringLength: 4_096 }, 'SCIENTIFIC_V2_MANIFEST_SCHEMA_INVALID')
  if (!manifest || typeof manifest !== 'object' || !isScientificV2Hash(manifest.manifestHash)) scientificV2Error('SCIENTIFIC_V2_MANIFEST_SCHEMA_INVALID')
  const { manifestHash, ...base } = manifest
  if (canonicalHash(base) !== manifestHash) scientificV2Error('SCIENTIFIC_V2_MANIFEST_HASH_MISMATCH')
  if (!/^[a-f0-9]{40}$/.test(manifest.codeSha)) scientificV2Error('SCIENTIFIC_V2_CODE_SHA_INVALID')
  for (const hash of [manifest.registryHash, manifest.canonicalManifestHash, manifest.suiteHash, manifest.priceHash]) {
    if (!isScientificV2Hash(hash)) scientificV2Error('SCIENTIFIC_V2_MANIFEST_SCHEMA_INVALID')
  }
  if (!(manifest.priceOperatorAuthorizationHash === null || isScientificV2Hash(manifest.priceOperatorAuthorizationHash))
    || manifest.priceOperatorAuthorizationHash !== manifest.priceSnapshot.operatorAuthorizationHash) scientificV2Error('SCIENTIFIC_V2_MANIFEST_SCHEMA_INVALID')
  assertCoreCanonicalManifest(manifest.canonicalManifest)
  verifyRegistryAuthority(manifest.registrySnapshot, manifest.canonicalManifest)
  if (manifest.canonicalManifest.manifestHash !== manifest.canonicalManifestHash) scientificV2Error('SCIENTIFIC_V2_CANONICAL_MANIFEST_HASH_MISMATCH')
  if (manifest.schemaVersion !== 2 || manifest.concurrency !== 1 || manifest.priceSnapshot.snapshotHash !== manifest.priceHash
    || manifest.registrySnapshot.snapshotHash !== manifest.registrySnapshotHash
    || manifest.suiteHash !== PB_SCIENTIFIC_FIGURE_V2.manifestHash
    || manifest.cases.length !== 9
    || canonicalHash(manifest.cases) !== canonicalHash(PB_SCIENTIFIC_FIGURE_V2.cases)
    || canonicalHash(manifest.providerOrder) !== canonicalHash(SCIENTIFIC_V2_PROVIDERS)
    || canonicalHash(manifest.providerBudgetsCny) !== canonicalHash({ bailian: 180, ark: 180, openrouter: 180 })
    || canonicalHash(manifest.codexLimits) !== canonicalHash({ modelId: 'codex:gpt-image-2', successfulSlots: 9, maxAttemptsPerSlot: 4, maxToolCalls: 36 })
    || manifest.lockName !== SCIENTIFIC_V2_PRODUCTION_LOCK_NAME
    || manifest.executionOrder.length !== manifest.models.length * 9
    || manifest.executionOrder.some((slot, index) => slot.sequence !== index + 1)) scientificV2Error('SCIENTIFIC_V2_MANIFEST_SCHEMA_INVALID')
  for (const [key, value] of Object.entries(SCIENTIFIC_BENCHMARK_IDENTITY)) {
    if ((manifest as unknown as Record<string, unknown>)[key] !== value) scientificV2Error('SCIENTIFIC_V2_IDENTITY_MISMATCH')
  }
  const seenCanaries = new Set<string>()
  for (const slot of manifest.executionOrder) {
    if ((slot.provider === 'codex' || slot.provider === null) && slot.isProviderCanary) scientificV2Error('SCIENTIFIC_V2_MANIFEST_SCHEMA_INVALID')
    if (slot.provider !== 'codex' && slot.provider !== null) {
      const shouldBeCanary = slot.supported && !seenCanaries.has(slot.provider)
      if (slot.isProviderCanary !== shouldBeCanary) scientificV2Error('SCIENTIFIC_V2_MANIFEST_SCHEMA_INVALID')
      if (slot.isProviderCanary) seenCanaries.add(slot.provider)
    }
    if (slot.supported && slot.provider !== 'codex' && slot.provider !== null && !slot.modelId) scientificV2Error('SCIENTIFIC_V2_MANIFEST_SCHEMA_INVALID')
  }
  verifyScientificV2PriceSnapshot(manifest.priceSnapshot, manifest.canonicalManifest)
  if (manifest.priceSnapshot.capturedAt !== manifest.createdAt) scientificV2Error('SCIENTIFIC_V2_PRICE_CAPTURE_DRIFT')
  const rebuilt = buildScientificV2Batch({
    canonicalManifest: manifest.canonicalManifest,
    registrySnapshot: manifest.registrySnapshot,
    suite: PB_SCIENTIFIC_FIGURE_V2,
    codeSha: manifest.codeSha,
    priceSnapshot: manifest.priceSnapshot,
    createdAt: manifest.createdAt,
    lockName: manifest.lockName,
  }).manifest
  if (canonicalHash(rebuilt) !== canonicalHash(manifest)) scientificV2Error('SCIENTIFIC_V2_MANIFEST_REBUILD_MISMATCH')
  return manifest
}

export function refreshScientificV2StateHash(state: ScientificV2BatchState) {
  const { stateHash: _ignored, ...base } = state
  state.stateHash = canonicalHash(base)
  return state
}

function expectedAttemptPayloadHash(
  manifest: ScientificV2BatchManifest,
  slot: ScientificV2SlotState,
  scientificCase: ScientificV2BatchManifest['cases'][number],
) {
  if (slot.provider === 'codex') {
    return canonicalHash({ manifestHash: manifest.manifestHash, slotId: slot.slotId, caseManifestHash: scientificCase.manifestHash })
  }
  return canonicalHash({
    route: { provider: slot.provider, modelId: slot.modelId },
    operation: slot.operation,
    imageSize: slot.imageSize,
    caseId: scientificCase.id,
    instruction: scientificCase.instruction,
    ...(scientificCase.kind === 'generation'
      ? { negativePrompt: scientificCase.negativePrompt, aspectRatio: scientificCase.aspectRatio }
      : { sourceHash: scientificCase.sourceHash, region: scientificCase.region }),
  })
}

function addCny(left: number, right: number) {
  return scientificV2CnyFromUnits(scientificV2CnyToUnits(left) + scientificV2CnyToUnits(right))
}

export function verifyScientificV2BatchState(state: ScientificV2BatchState, manifest: ScientificV2BatchManifest) {
  assertExactScientificV2Keys(state, [
    'schemaVersion', 'manifestHash', 'status', 'pauseReason', 'blockReason', 'createdAt', 'updatedAt',
    'providerSpentCny', 'providerUnreconciledCny', 'slots', 'stateHash',
  ], 'SCIENTIFIC_V2_STATE_SCHEMA_INVALID')
  assertBoundedScientificV2PlainData(state, { maxDepth: 10, maxNodes: 160_000, maxArrayLength: 4_096, maxStringLength: 4_096 }, 'SCIENTIFIC_V2_STATE_SCHEMA_INVALID')
  if (!state || typeof state !== 'object' || !isScientificV2Hash(state.stateHash)) scientificV2Error('SCIENTIFIC_V2_STATE_SCHEMA_INVALID')
  const { stateHash: actualStateHash, ...base } = state
  if (canonicalHash(base) !== actualStateHash) scientificV2Error('SCIENTIFIC_V2_STATE_HASH_MISMATCH')
  const batchStatuses = ['ready', 'running', 'canary_complete', 'awaiting_artifacts', 'completed', 'paused', 'blocked']
  const slotStatuses = ['pending', 'retrying', 'succeeded', 'unsupported', 'awaiting_artifact', 'unknown', 'failed', 'budget_blocked', 'not_executed', 'price_reconciliation', 'artifact_reconciliation']
  if (!batchStatuses.includes(state.status) || ![null, 'reconciliation_required', 'price_reconciliation_required', 'artifact_reconciliation_required'].includes(state.pauseReason)
    || ![null, 'provider_budget_exceeded_before_attempt', 'provider_canary_failed'].includes(state.blockReason)) scientificV2Error('SCIENTIFIC_V2_STATE_STATUS_INVALID')
  if (state.schemaVersion !== 2 || state.manifestHash !== manifest.manifestHash
    || state.slots.length !== manifest.executionOrder.length) scientificV2Error('SCIENTIFIC_V2_STATE_SCHEMA_INVALID')
  assertScientificV2Iso(state.createdAt, 'SCIENTIFIC_V2_STATE_SCHEMA_INVALID')
  assertScientificV2Iso(state.updatedAt, 'SCIENTIFIC_V2_STATE_SCHEMA_INVALID')
  const providerTotals = { bailian: 0, ark: 0, openrouter: 0 }
  const providerUnreconciled = { bailian: 0, ark: 0, openrouter: 0 }
  assertExactScientificV2Keys(state.providerSpentCny, ['bailian', 'ark', 'openrouter'], 'SCIENTIFIC_V2_STATE_SCHEMA_INVALID')
  assertExactScientificV2Keys(state.providerUnreconciledCny, ['bailian', 'ark', 'openrouter'], 'SCIENTIFIC_V2_STATE_SCHEMA_INVALID')
  for (let index = 0; index < state.slots.length; index += 1) {
    const slot = state.slots[index]
    const frozen = manifest.executionOrder[index]
    const scientificCase = manifest.cases.find((candidate) => candidate.id === slot.caseId)
    assertExactScientificV2Keys(slot, [
      'sequence', 'slotId', 'canonicalModelId', 'caseId', 'provider', 'modelId', 'operation', 'supported',
      'imageSize', 'isProviderCanary', 'routeStatus', 'status', 'costCny', 'attempts',
    ], 'SCIENTIFIC_V2_STATE_SLOT_INVALID')
    if (slot.sequence !== frozen.sequence || slot.slotId !== frozen.slotId || slot.canonicalModelId !== frozen.canonicalModelId
      || slot.caseId !== frozen.caseId || slot.provider !== frozen.provider || slot.modelId !== frozen.modelId
      || slot.operation !== frozen.operation || slot.supported !== frozen.supported
      || slot.isProviderCanary !== frozen.isProviderCanary
      || slot.routeStatus !== frozen.routeStatus
      || !scientificCase || !slotStatuses.includes(slot.status)
      || !Array.isArray(slot.attempts) || slot.attempts.length > 4) scientificV2Error('SCIENTIFIC_V2_STATE_SLOT_INVALID')
    if (slot.status === 'pending' || slot.status === 'awaiting_artifact' || slot.status === 'not_executed') {
      if (slot.costCny !== null || slot.attempts.length !== 0) scientificV2Error('SCIENTIFIC_V2_STATE_SLOT_INVALID')
      if (slot.status === 'awaiting_artifact' && slot.provider !== 'codex') scientificV2Error('SCIENTIFIC_V2_STATE_SLOT_INVALID')
    } else if (slot.status === 'unsupported') {
      if (slot.supported || slot.provider !== null || slot.modelId !== null || slot.routeStatus !== 'no_direct_edit_route'
        || slot.costCny !== 0 || slot.attempts.length !== 0) scientificV2Error('SCIENTIFIC_V2_STATE_SLOT_INVALID')
    } else if (slot.status === 'succeeded') {
      if (slot.attempts.length === 0 || !Number.isFinite(slot.costCny) || (slot.costCny as number) < 0) scientificV2Error('SCIENTIFIC_V2_STATE_SLOT_INVALID')
      if (!['succeeded', 'succeeded_low_quality'].includes(slot.attempts.at(-1)!.responseClass)) scientificV2Error('SCIENTIFIC_V2_STATE_SLOT_INVALID')
    } else if (slot.status === 'retrying' || slot.status === 'unknown' || slot.status === 'failed') {
      if (slot.attempts.length === 0 || !Number.isFinite(slot.costCny) || (slot.costCny as number) < 0) scientificV2Error('SCIENTIFIC_V2_STATE_SLOT_INVALID')
      const lastClass = slot.attempts.at(-1)!.responseClass
      if ((slot.status === 'unknown' && lastClass !== 'unknown_provider_outcome')
        || (slot.status === 'retrying' && !['confirmed_technical_failure', 'confirmed_provider_failure'].includes(lastClass))
        || (slot.status === 'failed' && (slot.attempts.length !== 4 || !['confirmed_technical_failure', 'confirmed_provider_failure'].includes(lastClass)))
      ) scientificV2Error('SCIENTIFIC_V2_STATE_SLOT_INVALID')
    } else if (slot.status === 'budget_blocked') {
      if (slot.attempts.length === 0 ? slot.costCny !== null : (!Number.isFinite(slot.costCny) || (slot.costCny as number) < 0)) scientificV2Error('SCIENTIFIC_V2_STATE_SLOT_INVALID')
    } else if (slot.status === 'price_reconciliation') {
      if (slot.attempts.length === 0 || slot.attempts.at(-1)!.responseClass !== 'price_reconciliation_required'
        || (slot.costCny !== null && (!Number.isFinite(slot.costCny) || slot.costCny < 0))) scientificV2Error('SCIENTIFIC_V2_STATE_SLOT_INVALID')
    } else if (slot.status === 'artifact_reconciliation') {
      if (slot.attempts.length === 0 || slot.attempts.at(-1)!.responseClass !== 'artifact_reconciliation_required'
        || !Number.isFinite(slot.costCny) || slot.costCny! < 0) scientificV2Error('SCIENTIFIC_V2_STATE_SLOT_INVALID')
    }
    let reconstructedSlotCost = 0
    for (let attemptIndex = 0; attemptIndex < slot.attempts.length; attemptIndex += 1) {
      const attempt = slot.attempts[attemptIndex]
      assertExactScientificV2Keys(attempt, [
        'attemptIndex', 'provider', 'model', 'operation', 'payloadHash', 'responseClass', 'estimatedCny', 'actualCny',
        'startedAt', 'completedAt', 'rawImageHash', 'byteSize', 'width', 'height', 'format', 'sourceHash', 'editedHash', 'attemptHash',
      ], 'SCIENTIFIC_V2_ATTEMPT_SCHEMA_INVALID')
      const { attemptHash, ...attemptBase } = attempt
      if (attempt.attemptIndex !== attemptIndex + 1 || attempt.provider !== slot.provider || attempt.model !== slot.modelId
        || attempt.operation !== slot.operation || attempt.payloadHash !== expectedAttemptPayloadHash(manifest, slot, scientificCase)
        || canonicalHash(attemptBase) !== attemptHash) scientificV2Error('SCIENTIFIC_V2_ATTEMPT_HASH_MISMATCH')
      if (!['succeeded', 'succeeded_low_quality', 'confirmed_technical_failure', 'confirmed_provider_failure', 'unknown_provider_outcome', 'price_reconciliation_required', 'artifact_reconciliation_required'].includes(attempt.responseClass)) {
        scientificV2Error('SCIENTIFIC_V2_ATTEMPT_SCHEMA_INVALID')
      }
      if (attemptIndex < slot.attempts.length - 1 && !['confirmed_technical_failure', 'confirmed_provider_failure'].includes(attempt.responseClass)) {
        scientificV2Error('SCIENTIFIC_V2_ATTEMPT_SCHEMA_INVALID')
      }
      try {
        scientificV2CnyToUnits(attempt.estimatedCny)
        if (attempt.actualCny !== null) scientificV2CnyToUnits(attempt.actualCny)
      } catch {
        scientificV2Error('SCIENTIFIC_V2_ATTEMPT_SCHEMA_INVALID')
      }
      const expectedEstimatedCny = slot.provider === 'codex' ? 0 : manifest.priceSnapshot.entries.find((entry) => entry.provider === slot.provider
        && entry.modelId === slot.modelId && entry.operation === slot.operation)?.unitCny
      if (expectedEstimatedCny === undefined || attempt.estimatedCny !== expectedEstimatedCny) scientificV2Error('SCIENTIFIC_V2_ATTEMPT_SCHEMA_INVALID')
      assertScientificV2Iso(attempt.startedAt, 'SCIENTIFIC_V2_ATTEMPT_SCHEMA_INVALID')
      assertScientificV2Iso(attempt.completedAt, 'SCIENTIFIC_V2_ATTEMPT_SCHEMA_INVALID')
      if (attempt.completedAt < attempt.startedAt) scientificV2Error('SCIENTIFIC_V2_ATTEMPT_SCHEMA_INVALID')
      const imageFacts = [attempt.rawImageHash, attempt.byteSize, attempt.width, attempt.height, attempt.format]
      const hasImage = imageFacts.every((value) => value !== null)
      const noImage = imageFacts.every((value) => value === null)
      const success = attempt.responseClass === 'succeeded' || attempt.responseClass === 'succeeded_low_quality'
      const artifactReconciliation = attempt.responseClass === 'artifact_reconciliation_required'
      const validImage = hasImage && isScientificV2Hash(attempt.rawImageHash)
        && Number.isInteger(attempt.byteSize) && attempt.byteSize! > 0
        && Number.isInteger(attempt.width) && attempt.width! > 0
        && Number.isInteger(attempt.height) && attempt.height! > 0
        && ['png', 'jpeg', 'webp'].includes(attempt.format!)
      const confirmedOrUnknown = ['confirmed_technical_failure', 'confirmed_provider_failure', 'unknown_provider_outcome'].includes(attempt.responseClass)
      if (success && (!validImage || attempt.actualCny === null)) scientificV2Error('SCIENTIFIC_V2_ATTEMPT_IMAGE_INVALID')
      if (artifactReconciliation && (!validImage || attempt.actualCny === null)) scientificV2Error('SCIENTIFIC_V2_ATTEMPT_IMAGE_INVALID')
      if (confirmedOrUnknown && !noImage) scientificV2Error('SCIENTIFIC_V2_ATTEMPT_IMAGE_INVALID')
      if (attempt.responseClass === 'unknown_provider_outcome' && attempt.actualCny !== null) scientificV2Error('SCIENTIFIC_V2_ATTEMPT_SCHEMA_INVALID')
      if (scientificCase.kind === 'generation') {
        if (attempt.sourceHash !== null || attempt.editedHash !== null) scientificV2Error('SCIENTIFIC_V2_ATTEMPT_IMAGE_INVALID')
      } else if (attempt.sourceHash !== scientificCase.sourceHash
        || (hasImage ? attempt.editedHash !== attempt.rawImageHash : attempt.editedHash !== null)) scientificV2Error('SCIENTIFIC_V2_ATTEMPT_IMAGE_INVALID')
      if (attempt.responseClass === 'price_reconciliation_required') {
        if (attempt.actualCny === null || (!validImage && !noImage)) scientificV2Error('SCIENTIFIC_V2_ATTEMPT_SCHEMA_INVALID')
        if (slot.provider && slot.provider !== 'codex') {
          const crossesBudget = scientificV2CnyToUnits(providerTotals[slot.provider]) + scientificV2CnyToUnits(reconstructedSlotCost)
            + scientificV2CnyToUnits(attempt.actualCny) > scientificV2CnyToUnits(manifest.providerBudgetsCny[slot.provider])
          if (scientificV2CnyToUnits(attempt.actualCny) <= scientificV2CnyToUnits(attempt.estimatedCny) && !crossesBudget) scientificV2Error('SCIENTIFIC_V2_ATTEMPT_SCHEMA_INVALID')
          providerUnreconciled[slot.provider] = addCny(providerUnreconciled[slot.provider], attempt.actualCny)
        }
      } else {
        const accounted = attempt.actualCny ?? attempt.estimatedCny
        if (slot.provider && slot.provider !== 'codex'
          && (attempt.actualCny !== null && scientificV2CnyToUnits(attempt.actualCny) > scientificV2CnyToUnits(attempt.estimatedCny)
            || scientificV2CnyToUnits(providerTotals[slot.provider]) + scientificV2CnyToUnits(reconstructedSlotCost)
              + scientificV2CnyToUnits(accounted) > scientificV2CnyToUnits(manifest.providerBudgetsCny[slot.provider]))) {
          scientificV2Error('SCIENTIFIC_V2_ATTEMPT_SCHEMA_INVALID')
        }
        reconstructedSlotCost = addCny(reconstructedSlotCost, accounted)
      }
    }
    const expectedCost: number | null = slot.attempts.length === 0
      ? (slot.status === 'unsupported' ? 0 : null)
      : (slot.status === 'price_reconciliation' && reconstructedSlotCost === 0 ? null : reconstructedSlotCost)
    if (slot.costCny !== expectedCost) scientificV2Error('SCIENTIFIC_V2_STATE_BUDGET_INVALID')
    if (slot.provider && slot.provider !== 'codex') providerTotals[slot.provider] = addCny(providerTotals[slot.provider], reconstructedSlotCost)
  }
  for (const provider of SCIENTIFIC_V2_PROVIDERS) {
    if (scientificV2CnyToUnits(providerTotals[provider]) !== scientificV2CnyToUnits(state.providerSpentCny[provider])
      || scientificV2CnyToUnits(state.providerSpentCny[provider]) > scientificV2CnyToUnits(manifest.providerBudgetsCny[provider])) {
      scientificV2Error('SCIENTIFIC_V2_STATE_BUDGET_INVALID')
    }
    try { scientificV2CnyToUnits(state.providerUnreconciledCny[provider]) } catch { scientificV2Error('SCIENTIFIC_V2_STATE_BUDGET_INVALID') }
    if (scientificV2CnyToUnits(providerUnreconciled[provider]) !== scientificV2CnyToUnits(state.providerUnreconciledCny[provider])) scientificV2Error('SCIENTIFIC_V2_STATE_BUDGET_INVALID')
  }
  const interruptionStatus = state.status === 'blocked'
    ? state.blockReason === 'provider_canary_failed' ? 'failed' : 'budget_blocked'
    : state.status === 'paused' && state.pauseReason === 'reconciliation_required'
      ? 'unknown'
      : state.status === 'paused' && state.pauseReason === 'price_reconciliation_required'
        ? 'price_reconciliation'
        : state.status === 'paused' && state.pauseReason === 'artifact_reconciliation_required'
          ? 'artifact_reconciliation'
        : null
  if (interruptionStatus) {
    const interruptionIndexes = state.slots.flatMap((slot, index) => slot.status === interruptionStatus ? [index] : [])
    if (interruptionIndexes.length !== 1
      || state.slots.slice(0, interruptionIndexes[0]).some((slot) => !['succeeded', 'unsupported', 'failed'].includes(slot.status))
      || state.slots.slice(interruptionIndexes[0] + 1).some((slot) => slot.status !== 'not_executed')) {
      scientificV2Error('SCIENTIFIC_V2_STATE_STATUS_INVALID')
    }
  }
  if ((state.status === 'paused') !== (state.pauseReason !== null)
    || (state.status === 'blocked') !== (state.blockReason !== null)
    || (state.status !== 'paused' && state.pauseReason !== null)
    || (state.status !== 'blocked' && state.blockReason !== null)
    || (state.status === 'paused' && state.pauseReason === 'reconciliation_required' && !state.slots.some((slot) => slot.status === 'unknown'))
    || (state.status === 'paused' && state.pauseReason === 'price_reconciliation_required' && !state.slots.some((slot) => slot.status === 'price_reconciliation'))
    || (state.status === 'paused' && state.pauseReason === 'artifact_reconciliation_required' && !state.slots.some((slot) => slot.status === 'artifact_reconciliation'))
    || (state.status === 'paused' && state.pauseReason === 'reconciliation_required' && state.slots.some((slot) => slot.status === 'price_reconciliation'))
    || (state.status === 'paused' && state.pauseReason === 'price_reconciliation_required' && state.slots.some((slot) => slot.status === 'unknown'))
    || (state.status === 'blocked' && state.blockReason === 'provider_budget_exceeded_before_attempt' && !state.slots.some((slot) => slot.status === 'budget_blocked'))
    || (state.status === 'blocked' && state.blockReason === 'provider_canary_failed' && !state.slots.some((slot) => slot.isProviderCanary && slot.status === 'failed'))
    || (state.status === 'ready' && state.slots.some((slot) => slot.status !== 'pending'))
    || (state.status === 'canary_complete' && (state.slots.some((slot) => slot.isProviderCanary
      ? slot.status !== 'succeeded' : slot.status !== 'pending')
      || state.slots.filter((slot) => slot.isProviderCanary).length !== new Set(manifest.executionOrder
        .filter((slot) => slot.isProviderCanary).map((slot) => slot.provider)).size))
    || (state.status === 'running' && state.slots.some((slot) => ['unknown', 'budget_blocked', 'not_executed', 'price_reconciliation', 'artifact_reconciliation'].includes(slot.status)))
    || (state.status === 'awaiting_artifacts' && (!state.slots.some((slot) => slot.status === 'awaiting_artifact')
      || state.slots.some((slot) => ['pending', 'retrying', 'unknown', 'budget_blocked', 'not_executed', 'price_reconciliation', 'artifact_reconciliation'].includes(slot.status))))
    || (state.status === 'completed' && state.slots.some((slot) => !['succeeded', 'unsupported', 'failed'].includes(slot.status)))
    || (state.status === 'paused' && state.slots.some((slot) => ['pending', 'retrying', 'awaiting_artifact', 'budget_blocked'].includes(slot.status)))
    || (state.status === 'blocked' && state.slots.some((slot) => ['pending', 'retrying', 'awaiting_artifact', 'unknown', 'price_reconciliation', 'artifact_reconciliation'].includes(slot.status)))
  ) scientificV2Error('SCIENTIFIC_V2_STATE_STATUS_INVALID')
  return state
}
