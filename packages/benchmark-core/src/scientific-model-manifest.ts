import { canonicalHash } from './hash.js'
import { SCIENTIFIC_BENCHMARK_IDENTITY } from './scientific-contracts.js'

type ProductionProvider = 'bailian' | 'ark' | 'openrouter'
type ScientificAccessProvider = ProductionProvider | 'codex'
type ImageEditMode = 'direct-edit' | 'analyze-redraw' | 'none'

interface ScientificRegistryModel {
  id: string
  label?: string
  vendor?: string
  canonicalModelId?: string
  selectable?: boolean
  roles?: readonly string[]
  capabilities?: {
    imageGeneration?: boolean
    imageEditMode?: ImageEditMode
    resolutions?: readonly string[]
  }
}

interface ScientificManifestRoute {
  provider: ScientificAccessProvider
  modelId: string
  comparisonModelId: string
  canonicalModelId: string
  displayName: string
  developer: string
  editMode: ImageEditMode
  resolutions: string[]
}

const providerOrder: readonly ProductionProvider[] = ['bailian', 'ark', 'openrouter']
const priority: Record<ScientificAccessProvider, number> = { bailian: 0, ark: 1, openrouter: 2, codex: 3 }

export function compareScientificIdentifiers(left: string, right: string) {
  return Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'))
}

const routeAliases: Record<string, string> = {
  'openrouter:google/gemini-3.1-flash-image-preview': 'openrouter:google/gemini-3.1-flash-image',
  'openrouter:google/gemini-3-pro-image-preview': 'openrouter:google/gemini-3-pro-image',
  'openrouter:openai/gpt-5-image': 'openrouter:openai/gpt-image-2',
  'openrouter:openai/gpt-5-image-mini': 'openrouter:openai/gpt-image-1-mini',
}

const sharedIdentities: Record<string, string> = {
  'bailian:qwen-image-3.0-pro': 'qwen-image-3.0-pro',
  'openrouter:qwen/qwen-image-3-pro': 'qwen-image-3.0-pro',
  'ark:doubao-seedream-4-5-251128': 'seedream-4.5',
  'openrouter:bytedance-seed/seedream-4.5': 'seedream-4.5',
  'ark:doubao-seedream-5-0-pro-260628': 'seedream-5.0-pro',
  'openrouter:bytedance-seed/seedream-5-0-pro': 'seedream-5.0-pro',
  'ark:doubao-seedream-5-0-260128': 'seedream-5.0',
  'openrouter:bytedance-seed/seedream-5-0-lite': 'seedream-5.0',
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    Object.values(value as Record<string, unknown>).forEach(deepFreeze)
  }
  return value
}

function normalizeCanonicalModelId(value: unknown) {
  if (typeof value !== 'string') throw new Error('INVALID_SCIENTIFIC_CANONICAL_IDENTITY')
  const normalized = value.trim().toLowerCase()
  if (!normalized
    || !/^[a-z0-9](?:[a-z0-9._+:/-]*[a-z0-9])?$/.test(normalized)
    || /\s|\\|\/\/|::|\/:|:\//.test(normalized)) {
    throw new Error('INVALID_SCIENTIFIC_CANONICAL_IDENTITY')
  }
  return normalized
}

function parseScientificModelId(value: unknown) {
  if (typeof value !== 'string'
    || value !== value.trim()
    || !/^[A-Za-z0-9](?:[A-Za-z0-9._+/-]*[A-Za-z0-9])?$/.test(value)
    || /\/\//.test(value)) {
    throw new Error('INVALID_SCIENTIFIC_MODEL_ID')
  }
  return {
    executionModelId: value,
    comparisonModelId: value.toLowerCase(),
    hasUppercase: /[A-Z]/.test(value),
  }
}

function normalizeResolutions(value: unknown) {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.some((resolution) => typeof resolution !== 'string' || !resolution)) {
    throw new Error('INVALID_SCIENTIFIC_ROUTE_METADATA')
  }
  return [...new Set(value)].sort(compareScientificIdentifiers)
}

function samePhysicalRoute(left: ScientificManifestRoute, right: ScientificManifestRoute) {
  return left.provider === right.provider
    && left.modelId === right.modelId
    && left.canonicalModelId === right.canonicalModelId
    && left.displayName === right.displayName
    && left.developer === right.developer
    && left.editMode === right.editMode
    && left.resolutions.length === right.resolutions.length
    && left.resolutions.every((resolution, index) => resolution === right.resolutions[index])
}

function normalizedIdentity(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function excludedOpenRouterIdentity(model: ScientificRegistryModel, normalizedModelId: string, canonicalModelId: string) {
  const vendor = normalizedIdentity(model.vendor || '')
  const modelNamespace = normalizedIdentity(normalizedModelId.split('/')[0] || '')
  const canonicalNamespace = normalizedIdentity(canonicalModelId.split(/[/:]/)[0] || '')
  return vendor.startsWith('openai') || vendor.startsWith('google')
    || modelNamespace === 'openai' || modelNamespace === 'google'
    || canonicalNamespace === 'openai' || canonicalNamespace === 'google'
}

export function buildScientificV2CanonicalManifest(input: {
  registryVersion: string
  registryHash: string
  registry: { providers?: Partial<Record<ProductionProvider, { models?: readonly ScientificRegistryModel[] }>> }
}) {
  if (!input.registryVersion || !/^[a-f0-9]{64}$/i.test(input.registryHash)) throw new Error('INVALID_SCIENTIFIC_REGISTRY_BINDING')

  let sawUppercaseModelId = false
  const discoveredRoutes: ScientificManifestRoute[] = providerOrder.flatMap((provider) => (input.registry.providers?.[provider]?.models || [])
    .filter((model) => model.selectable === true && model.roles?.includes('image') && model.capabilities?.imageGeneration === true)
    .flatMap((model) => {
      const parsedModelId = parseScientificModelId(model.id)
      sawUppercaseModelId ||= parsedModelId.hasUppercase
      const comparisonRouteId = `${provider}:${parsedModelId.comparisonModelId}`
      const aliasedRouteId = routeAliases[comparisonRouteId]
      const executionModelId = aliasedRouteId
        ? aliasedRouteId.slice(aliasedRouteId.indexOf(':') + 1)
        : parsedModelId.executionModelId
      const comparisonModelId = executionModelId.toLowerCase()
      const normalizedRouteId = `${provider}:${comparisonModelId}`
      const canonicalModelId = normalizeCanonicalModelId(model.canonicalModelId !== undefined
        ? model.canonicalModelId
        : sharedIdentities[normalizedRouteId] || comparisonModelId)
      if (canonicalModelId.startsWith('codex:')) throw new Error('SCIENTIFIC_RESERVED_CANONICAL_IDENTITY')
      if (provider === 'openrouter' && excludedOpenRouterIdentity(model, comparisonModelId, canonicalModelId)) return []
      return [{
        provider,
        modelId: executionModelId,
        comparisonModelId,
        canonicalModelId,
        displayName: model.label || executionModelId,
        developer: model.vendor || 'Unknown',
        editMode: model.capabilities?.imageEditMode || 'none' as ImageEditMode,
        resolutions: normalizeResolutions(model.capabilities?.resolutions),
      }]
    }))

  const physicalRoutes = new Map<string, ScientificManifestRoute>()
  for (const route of discoveredRoutes) {
    const physicalRoute = `${route.provider}:${route.comparisonModelId}`
    const existing = physicalRoutes.get(physicalRoute)
    if (existing && !samePhysicalRoute(existing, route)) throw new Error('SCIENTIFIC_ROUTE_COLLISION')
    if (!existing) physicalRoutes.set(physicalRoute, route)
  }
  if (sawUppercaseModelId) throw new Error('INVALID_SCIENTIFIC_MODEL_ID')
  const routes = [...physicalRoutes.values()]

  routes.push({
    provider: 'codex',
    modelId: 'gpt-image-2',
    comparisonModelId: 'gpt-image-2',
    canonicalModelId: 'codex:gpt-image-2',
    displayName: 'OpenAI GPT Image 2 · Codex 内置渠道',
    developer: 'OpenAI',
    editMode: 'direct-edit',
    resolutions: ['2K'],
  })

  const grouped = new Map<string, ScientificManifestRoute[]>()
  for (const route of routes) {
    const group = grouped.get(route.canonicalModelId) || []
    if (!group.some((candidate) => candidate.provider === route.provider && candidate.modelId === route.modelId)) group.push(route)
    grouped.set(route.canonicalModelId, group)
  }

  const models = [...grouped.entries()].map(([canonicalModelId, groupedRoutes]) => {
    const orderedRoutes = [...groupedRoutes].sort((left, right) => priority[left.provider] - priority[right.provider] || compareScientificIdentifiers(left.modelId, right.modelId))
    const generationRoute = orderedRoutes[0] || null
    const editRoute = orderedRoutes.find((route) => route.editMode === 'direct-edit') || null
    const primary = generationRoute!
    return {
      canonicalModelId,
      displayName: canonicalModelId === 'codex:gpt-image-2' ? 'OpenAI GPT Image 2 · Codex 内置渠道' : primary.displayName,
      developer: primary.developer,
      generationRoute: generationRoute && { provider: generationRoute.provider, modelId: generationRoute.modelId },
      editRoute: editRoute && { provider: editRoute.provider, modelId: editRoute.modelId, editMode: editRoute.editMode },
      routes: orderedRoutes.map((route) => ({
        provider: route.provider,
        modelId: route.modelId,
        editMode: route.editMode,
        resolutions: route.resolutions,
      })),
    }
  }).sort((left, right) => compareScientificIdentifiers(left.canonicalModelId, right.canonicalModelId))

  const base = {
    schemaVersion: 2,
    ...SCIENTIFIC_BENCHMARK_IDENTITY,
    registryVersion: input.registryVersion,
    registryHash: input.registryHash,
    routePriority: [...providerOrder],
    rawRouteCount: routes.length,
    canonicalModelCount: models.length,
    models,
  }
  return deepFreeze({ ...base, manifestHash: canonicalHash(base) })
}
