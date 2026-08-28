import { buildCanonicalImageModelManifest, selectBenchmarkLane } from '@paperbanana/benchmark-core'

import type { BenchProvider } from './config.js'

interface RegistryModel {
  id: string
  selectable?: boolean
  roles?: string[]
  capabilities?: { imageGeneration?: boolean; resolutions?: string[]; aspectRatios?: string[] }
  developer?: string
  vendor?: string
}

interface RegistrySnapshot {
  providers?: Record<string, { models?: RegistryModel[] }>
}

function isImageModel(model: RegistryModel) {
  return model.selectable !== false && (model.roles?.includes('image') || model.capabilities?.imageGeneration === true)
}

function identity(provider: string, modelId: string) {
  return `${provider}:${modelId}`
}

const executableProviders = new Set<BenchProvider>(['bailian', 'openrouter', 'ark'])

export function detectImageCandidates(previous: RegistrySnapshot, current: RegistrySnapshot, registryHash: string) {
  const known = new Set(Object.entries(previous.providers || {}).flatMap(([provider, registry]) =>
    executableProviders.has(provider as BenchProvider)
      ? (registry?.models || []).filter(isImageModel).map((model) => identity(provider, model.id))
      : []))
  return Object.entries(current.providers || {}).flatMap(([provider, registry]) =>
    executableProviders.has(provider as BenchProvider) ? (registry?.models || [])
      .filter(isImageModel)
      .filter((model) => !known.has(identity(provider, model.id)))
      .map((model) => ({
        candidateId: identity(provider, model.id),
        provider: provider as BenchProvider,
        modelId: model.id,
        developer: model.vendor || model.developer || 'Unknown',
        lane: selectBenchmarkLane(model.capabilities?.resolutions || []),
        aspectRatios: model.capabilities?.aspectRatios || [],
        registryHash,
        state: 'detected' as const,
      })) : [])
    .sort((left, right) => left.candidateId.localeCompare(right.candidateId))
}

export function detectCanonicalImageCandidates(previous: RegistrySnapshot, current: RegistrySnapshot, registryHash: string) {
  const registryVersion = String((current as any).registryVersion || (current as any).version || 'unversioned')
  const currentManifest = buildCanonicalImageModelManifest({ registryVersion, registryHash, registry: current as any })
  const previousManifest = buildCanonicalImageModelManifest({
    registryVersion: String((previous as any).registryVersion || (previous as any).version || 'unversioned'),
    registryHash: String((previous as any).registryHash || 'previous'),
    registry: previous as any,
  })
  const known = new Set(previousManifest.models.map((model) => model.canonicalModelId))
  const candidates = currentManifest.models.filter((model) => !known.has(model.canonicalModelId)).map((model) => {
    const primaryRoute = model.routes[0]
    return {
      candidateId: `${primaryRoute.provider}:${primaryRoute.modelId}`,
      provider: primaryRoute.provider,
      modelId: primaryRoute.modelId,
      canonicalModelId: model.canonicalModelId,
      displayName: model.displayName,
      developer: model.developer,
      primaryAccessProvider: model.primaryAccessProvider,
      alternateAccessProviders: model.alternateAccessProviders,
      alternateRoutes: model.routes.slice(1),
      lane: primaryRoute.lane,
      aspectRatios: primaryRoute.aspectRatios,
      registryHash,
      canonicalManifestHash: currentManifest.manifestHash,
      state: 'detected' as const,
    }
  })
  return { manifest: currentManifest, candidates }
}
