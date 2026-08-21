import { PLOT_CATEGORY_ID, type ImageSize, type ProviderId, type RetrievalSetting } from './constants'
import {
  buildModelSubmission,
  requiredCreateRouteRoles,
  scopedApiKeysForRoles,
  type ModelRoutes,
} from './model-routing'
import type { ReferenceImageMode } from './reference-mode'

export interface UploadedReferenceImage {
  filename: string
  mimeType: string
  size: number
  objectKey: string
  uploadToken: string
}

export interface CreateJobInput {
  configurationMode: 'simple' | 'advanced'
  provider: ProviderId
  registry?: { routeContractVersion?: number } | null
  modelRoutes?: ModelRoutes
  apiKeys?: Record<string, string>
  apiKey?: string
  categoryId: string
  categoryLabel: string
  methodContent: string
  caption: string
  negativePrompt?: string
  outputFormat: string
  imageSize: ImageSize
  mainModelName?: string
  imageModelName?: string
  referenceVisionModelName?: string
  referenceImageMode: ReferenceImageMode
  uploadedReferenceImages: UploadedReferenceImage[]
  pipelineMode: string
  retrievalSetting: RetrievalSetting
  manualReferenceIds: string[]
  aspectRatio: string
  numCandidates: number
  maxCriticRounds: number
}

// createJob 请求体构造，字段与 packages/api/src/jobs.js 的 createJobRequest 白名单逐一对应。
// 纯函数（不依赖 wx），便于 node 单测覆盖 plot / 锁检索 / 手动参考的组合语义。
export function buildCreateJobPayload(input: CreateJobInput): Record<string, unknown> {
  const isAdvancedMode = input.configurationMode === 'advanced'
  const hasUploadedReferences = input.uploadedReferenceImages.length > 0
  const modelRoutes = input.modelRoutes || {
    main: { accessProvider: input.provider, modelId: String(input.mainModelName || '') },
    image: { accessProvider: input.provider, modelId: String(input.imageModelName || '') },
    vision: { accessProvider: input.provider, modelId: String(input.referenceVisionModelName || '') },
  }
  const modelSubmission = buildModelSubmission({
    configurationMode: input.configurationMode,
    modelRoutes,
    registry: input.registry || null,
  })
  const pipelineMode = isAdvancedMode ? input.pipelineMode : 'planner_critic'
  const retrievalSetting = isAdvancedMode && !hasUploadedReferences ? input.retrievalSetting : 'none'
  const taskName = input.categoryId === PLOT_CATEGORY_ID ? 'plot' : 'diagram'
  const maxCriticRounds = isAdvancedMode ? input.maxCriticRounds : 1
  const routeRoles = requiredCreateRouteRoles({
    outputFormat: input.outputFormat,
    taskName,
    pipelineMode,
    retrievalSetting,
    imageSize: input.imageSize,
    referenceImages: input.uploadedReferenceImages,
    referenceImageMode: input.referenceImageMode,
  }, maxCriticRounds)
  const providedKeys = Object.fromEntries(Object.entries(input.apiKeys || {}).map(([provider, key]) => [provider, String(key || '').trim()]))
  if (input.apiKey && !providedKeys[input.provider]) providedKeys[input.provider] = input.apiKey.trim()

  return {
    action: 'createJob',
    clientPlatform: 'miniprogram',
    ...modelSubmission,
    apiKeys: scopedApiKeysForRoles(modelRoutes, routeRoles, providedKeys),
    taskName,
    methodContent: input.methodContent.trim(),
    caption: input.caption.trim(),
    negativePrompt: String(input.negativePrompt || '').trim(),
    infographicCategory: input.categoryLabel,
    outputFormat: input.outputFormat,
    imageSize: input.imageSize,
    referenceImageMode: hasUploadedReferences ? input.referenceImageMode : undefined,
    referenceImages: input.uploadedReferenceImages,
    pipelineMode,
    // 上传参考图时以图为唯一风格来源，前端同步关闭检索（后端亦强制，二者一致）。
    retrievalSetting,
    manualReferenceIds: isAdvancedMode && input.retrievalSetting === 'manual' && !hasUploadedReferences ? input.manualReferenceIds : [],
    aspectRatio: input.aspectRatio,
    numCandidates: isAdvancedMode ? input.numCandidates : 1,
    maxCriticRounds,
  }
}
