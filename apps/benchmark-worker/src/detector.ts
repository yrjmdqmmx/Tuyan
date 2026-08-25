import { selectBenchmarkLane } from '@paperbanana/benchmark-core'

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
