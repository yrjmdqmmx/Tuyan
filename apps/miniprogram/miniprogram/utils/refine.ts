import { buildAspectRatioOptions } from './aspect-ratios'
import type { ModelRegistry, ModelProviderId } from './model-registry'
import type { ProviderRegions } from './provider-regions'
import {
  buildModelSubmission,
  requiredRefineRouteRoles,
  scopedApiKeysForRoles,
  type ModelRoutes,
} from './model-routing'

export interface RefineSource { url?: string; objectKey?: string }

export function refineRequestSource(source: RefineSource): { sourceImageObjectKey?: string; sourceImageUrl?: string } {
  const objectKey = String(source.objectKey || '').trim()
  if (objectKey) return { sourceImageObjectKey: objectKey }
  const url = String(source.url || '').trim()
  return url ? { sourceImageUrl: url } : {}
}

export function buildRefineJobPayload(input: {
  providerRegions?: ProviderRegions
  configurationMode: 'simple' | 'advanced'
  modelRoutes: ModelRoutes
  registry: { routeContractVersion?: number; providerRegionContractVersion?: number; providers?: ModelRegistry['providers'] } | null
  apiKeys: Record<string, string>
  source: RefineSource
  editInstruction: string
  aspectRatio: string
  imageSize: string
  refineMode: 'direct-edit' | 'analyze-redraw'
}): Record<string, unknown> {
  if (input.registry?.providers) {
    const route = input.modelRoutes.image
    const model = input.registry.providers[route.accessProvider as ModelProviderId]?.models.find((model) => model.id === route.modelId)
    const ratios = buildAspectRatioOptions({ capabilities: model?.capabilities || {}, capabilityField: 'refineAspectRatios', resolution: input.imageSize })
    if (!ratios.some((option) => option.value === input.aspectRatio)) throw new Error('当前精修比例或清晰度不可用，请重新选择。')
  }
  const modelSubmission = buildModelSubmission(input)
  const roles = requiredRefineRouteRoles({ refineMode: input.refineMode })
  return {
    action: 'refineImage',
    clientPlatform: 'miniprogram',
    ...modelSubmission,
    apiKeys: scopedApiKeysForRoles(input.modelRoutes, roles, input.apiKeys, input.providerRegions),
    ...refineRequestSource(input.source),
    editInstruction: input.editInstruction.trim(),
    aspectRatio: input.aspectRatio,
    imageSize: input.imageSize,
  }
}
