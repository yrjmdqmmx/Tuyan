import { PLOT_CATEGORY_ID } from '../constants/AppConstants'
import { CreateJobInput, UploadedReferenceImage } from '../models/Types'

export const CLIENT_PLATFORM: string = 'harmony'

export interface ApiKeysPayload {
  openrouter: string
  gemini: string
  openai: string
  bailian: string
}

export interface CreateJobPayload {
  action: string
  clientPlatform: string
  configurationMode: string
  provider: string
  apiKeys: ApiKeysPayload
  taskName: string
  methodContent: string
  caption: string
  infographicCategory: string
  outputFormat: string
  imageSize: string
  mainModelName: string
  imageModelName: string
  referenceVisionModelName: string
  referenceImageMode?: string
  referenceImages: UploadedReferenceImage[]
  pipelineMode: string
  retrievalSetting: string
  manualReferenceIds: string[]
  aspectRatio: string
  numCandidates: number
  maxCriticRounds: number
}

export function buildCreateJobPayload(input: CreateJobInput): CreateJobPayload {
  const isAdvancedMode = input.configurationMode === 'advanced'
  const hasUploadedReferences = input.uploadedReferenceImages.length > 0
  const apiKeys: ApiKeysPayload = {
    openrouter: '',
    gemini: '',
    openai: '',
    bailian: '',
  }
  if (input.provider === 'openrouter') apiKeys.openrouter = input.apiKey.trim()
  if (input.provider === 'gemini') apiKeys.gemini = input.apiKey.trim()
  if (input.provider === 'openai') apiKeys.openai = input.apiKey.trim()
  if (input.provider === 'bailian') apiKeys.bailian = input.apiKey.trim()

  return {
    action: 'createJob',
    clientPlatform: CLIENT_PLATFORM,
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
    retrievalSetting: isAdvancedMode && !hasUploadedReferences ? input.retrievalSetting : 'none',
    manualReferenceIds: isAdvancedMode && input.retrievalSetting === 'manual' && !hasUploadedReferences ? input.manualReferenceIds : [],
    aspectRatio: isAdvancedMode ? input.aspectRatio : '16:9',
    numCandidates: isAdvancedMode ? input.numCandidates : 1,
    maxCriticRounds: isAdvancedMode ? input.maxCriticRounds : 1,
  }
}
