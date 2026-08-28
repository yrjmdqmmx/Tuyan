import { selectBenchmarkLane } from './contracts.js'
import { canonicalHash } from './hash.js'

type Provider = 'bailian' | 'ark' | 'openrouter'
type RegistryModel = {
  id: string
  label?: string
  vendor?: string
  selectable?: boolean
  roles?: string[]
  capabilities?: { imageGeneration?: boolean; resolutions?: string[]; aspectRatios?: string[] }
}

const routeAliases: Record<string, string> = {
  'openrouter:google/gemini-3.1-flash-image-preview': 'openrouter:google/gemini-3.1-flash-image',
  'openrouter:google/gemini-3-pro-image-preview': 'openrouter:google/gemini-3-pro-image',
  'openrouter:openai/gpt-5-image': 'openrouter:openai/gpt-image-2',
  'openrouter:openai/gpt-5-image-mini': 'openrouter:openai/gpt-image-1-mini',
}

const sharedModelIdentities: Record<string, string> = {
  'bailian:qwen-image-3.0-pro': 'qwen-image-3.0-pro',
  'openrouter:qwen/qwen-image-3-pro': 'qwen-image-3.0-pro',
  'ark:doubao-seedream-4-5-251128': 'seedream-4.5',
  'openrouter:bytedance-seed/seedream-4.5': 'seedream-4.5',
  'ark:doubao-seedream-5-0-pro-260628': 'seedream-5.0-pro',
  'openrouter:bytedance-seed/seedream-5-0-pro': 'seedream-5.0-pro',
}

function providerPriority(provider: Provider) {
  return provider === 'openrouter' ? 1 : 0
}

export function buildCanonicalImageModelManifest(input: {
  registryVersion: string
  registryHash: string
  registry: { providers?: Partial<Record<Provider, { models?: RegistryModel[] }>> }
}) {
  const rawRoutes = (['bailian', 'ark', 'openrouter'] as const).flatMap((provider) =>
    (input.registry.providers?.[provider]?.models || [])
      .filter((model) => model.selectable === true && model.roles?.includes('image') && model.capabilities?.imageGeneration === true)
      .map((model) => {
        const rawKey = `${provider}:${model.id}`
        const normalizedKey = routeAliases[rawKey] || rawKey
        const normalizedModelId = normalizedKey.slice(normalizedKey.indexOf(':') + 1)
        return {
          provider,
          rawModelId: model.id,
          modelId: normalizedModelId,
          canonicalModelId: sharedModelIdentities[normalizedKey] || normalizedModelId,
          label: model.label || normalizedModelId,
          developer: model.vendor || 'Unknown',
          resolutions: [...(model.capabilities?.resolutions || [])],
          aspectRatios: [...(model.capabilities?.aspectRatios || [])],
          lane: selectBenchmarkLane(model.capabilities?.resolutions || []),
          isAlias: normalizedKey !== rawKey,
        }
      }))
  const groups = new Map<string, typeof rawRoutes>()
  for (const route of rawRoutes) groups.set(route.canonicalModelId, [...(groups.get(route.canonicalModelId) || []), route])
  const models = [...groups.entries()].map(([canonicalModelId, grouped]) => {
    const routes = [...new Map(grouped.map((route) => [`${route.provider}:${route.modelId}`, route])).values()]
      .sort((left, right) => providerPriority(left.provider) - providerPriority(right.provider) || left.modelId.localeCompare(right.modelId))
    const primary = routes[0]
    return {
      canonicalModelId,
      displayName: primary.label,
      developer: primary.developer,
      primaryAccessProvider: primary.provider,
      primaryModelId: primary.modelId,
      alternateAccessProviders: [...new Set(routes.slice(1).map((route) => route.provider))],
      routes: routes.map(({ provider, modelId, resolutions, aspectRatios, lane }) => ({ provider, modelId, resolutions, aspectRatios, lane })),
      aliases: grouped.filter((route) => route.isAlias || route.rawModelId !== primary.modelId).map((route) => `${route.provider}:${route.rawModelId}`).sort(),
    }
  }).sort((left, right) => left.canonicalModelId.localeCompare(right.canonicalModelId))
  const base = {
    schemaVersion: 1,
    registryVersion: input.registryVersion,
    registryHash: input.registryHash,
    evaluationMode: 'codex_single' as const,
    suiteId: 'pb-image-light-v1',
    rawRouteCount: rawRoutes.length,
    rawRoutes: rawRoutes.map(({ provider, rawModelId, modelId, canonicalModelId, label, developer, resolutions, aspectRatios, lane, isAlias }) => ({
      provider, rawModelId, modelId, canonicalModelId, label, developer, resolutions, aspectRatios, lane, isAlias,
    })),
    canonicalModelCount: models.length,
    models,
  }
  return Object.freeze({ ...base, manifestHash: canonicalHash(base) })
}
