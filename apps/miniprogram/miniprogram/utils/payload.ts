import { PLOT_CATEGORY_ID, type ImageSize, type ProviderId, type RetrievalSetting } from './constants'
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
  apiKey: string
  categoryId: string
  categoryLabel: string
  methodContent: string
  caption: string
  outputFormat: string
  imageSize: ImageSize
  mainModelName: string
  imageModelName: string
  referenceVisionModelName: string
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
  const apiKeys: Record<string, string> = {
    openrouter: '',
    gemini: '',
    openai: '',
    bailian: '',
  }
  apiKeys[input.provider] = input.apiKey.trim()

  return {
    action: 'createJob',
    clientPlatform: 'miniprogram',
    configurationMode: input.configurationMode,
    provider: input.provider,
    apiKeys,
    taskName: input.categoryId === PLOT_CATEGORY_ID ? 'plot' : 'diagram',
    methodContent: input.methodContent.trim(),
    caption: input.caption.trim(),
    infographicCategory: input.categoryLabel,
    outputFormat: input.outputFormat,
    imageSize: input.imageSize,
    mainModelName: input.mainModelName,
    imageModelName: input.imageModelName,
    referenceVisionModelName: input.referenceVisionModelName,
    referenceImageMode: hasUploadedReferences ? input.referenceImageMode : undefined,
    referenceImages: input.uploadedReferenceImages,
    pipelineMode: isAdvancedMode ? input.pipelineMode : 'planner_critic',
    // 上传参考图时以图为唯一风格来源，前端同步关闭检索（后端亦强制，二者一致）。
    retrievalSetting: isAdvancedMode && !hasUploadedReferences ? input.retrievalSetting : 'none',
    manualReferenceIds: isAdvancedMode && input.retrievalSetting === 'manual' && !hasUploadedReferences ? input.manualReferenceIds : [],
    aspectRatio: isAdvancedMode ? input.aspectRatio : '16:9',
    numCandidates: isAdvancedMode ? input.numCandidates : 1,
    maxCriticRounds: isAdvancedMode ? input.maxCriticRounds : 1,
  }
}
