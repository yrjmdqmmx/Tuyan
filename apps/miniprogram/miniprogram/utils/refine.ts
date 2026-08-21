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
  configurationMode: 'simple' | 'advanced'
  modelRoutes: ModelRoutes
  registry: { routeContractVersion?: number } | null
  apiKeys: Record<string, string>
  source: RefineSource
  editInstruction: string
  aspectRatio: string
  imageSize: string
  refineMode: 'direct-edit' | 'analyze-redraw'
}): Record<string, unknown> {
  const modelSubmission = buildModelSubmission(input)
  const roles = requiredRefineRouteRoles({ refineMode: input.refineMode })
  return {
    action: 'refineImage',
    clientPlatform: 'miniprogram',
    ...modelSubmission,
    apiKeys: scopedApiKeysForRoles(input.modelRoutes, roles, input.apiKeys),
    ...refineRequestSource(input.source),
    editInstruction: input.editInstruction.trim(),
    aspectRatio: input.aspectRatio,
    imageSize: input.imageSize,
  }
}
