import { ImageAsset, Job, JobStage, JobStageImage, RetrievedReference } from '../models/Types'

function asRecord(value: Object | undefined): Record<string, Object> {
  return (value || {}) as Record<string, Object>
}

export function stringValue(value: Object | string | number | boolean | undefined, fallback: string = ''): string {
  if (value === undefined || value === null) return fallback
  return String(value)
}

export function numberValue(value: Object | string | number | undefined, fallback: number = 0): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function dateValue(primary: Object | string | number | undefined, secondary?: Object | string | number | undefined): string | number | undefined {
  const value = primary !== undefined && primary !== null ? primary : secondary
  if (typeof value === 'string' || typeof value === 'number') return value
  return undefined
}

export function arrayValue(value: Object | undefined): Object[] {
  return Array.isArray(value) ? value as Object[] : []
}

export function stringArrayValue(value: Object | undefined): string[] {
  if (!Array.isArray(value)) return []
  return (value as Object[]).map((item: Object) => stringValue(item))
}

export function normalizeImageAsset(input: Object, index: number): ImageAsset {
  const item = asRecord(input)
  return {
    filename: stringValue(item.filename || item.url, `image-${index + 1}`),
    url: stringValue(item.url),
    storage: stringValue(item.storage),
    candidate_id: numberValue(item.candidate_id || item.candidateId, index),
    mime_type: stringValue(item.mime_type || item.mimeType),
    object_key: stringValue(item.object_key || item.objectKey),
    size: numberValue(item.size, 0),
  }
}

export function normalizeRetrievedReference(input: Object): RetrievedReference {
  const item = asRecord(input)
  return {
    id: stringValue(item.id || item._id),
    task_name: stringValue(item.task_name || item.taskName, 'diagram'),
    title: stringValue(item.title || item.visualIntent || item.caption),
    summary: stringValue(item.summary || item.content || item.methodExcerpt),
    image_url: stringValue(item.image_url || item.imageUrl || item.url),
    image_object_key: stringValue(item.image_object_key || item.imageObjectKey || item.objectKey),
    source: stringValue(item.source, 'paperbanana-bench'),
  }
}

export function normalizeStageImage(input: Object): JobStageImage {
  const image = asRecord(input)
  return {
    filename: stringValue(image.filename || image.url),
    url: stringValue(image.url),
    storage: stringValue(image.storage),
    mime_type: stringValue(image.mime_type || image.mimeType),
  }
}

export function normalizeJobStage(input: Object, index: number): JobStage {
  const stage = asRecord(input)
  const imageValue = stage.image
  const normalized: JobStage = {
    id: stringValue(stage.id || stage._id, `stage-${index}`),
    candidate_id: numberValue(stage.candidate_id || stage.candidateId, 0),
    type: stringValue(stage.type),
    title: stringValue(stage.title),
    round: numberValue(stage.round, 0),
    text: stringValue(stage.text || stage.description || stage.message),
    suggestion: stringValue(stage.suggestion || stage.criticSuggestion),
    started_at: dateValue(stage.started_at, stage.startedAt),
    completed_at: dateValue(stage.completed_at, stage.completedAt),
    duration_ms: numberValue(stage.duration_ms || stage.durationMs, 0),
    error: stringValue(stage.error),
  }
  if (imageValue !== undefined && imageValue !== null) {
    normalized.image = normalizeStageImage(imageValue)
  }
  return normalized
}

export function normalizeJob(input: Object | undefined): Job {
  const job = asRecord(input)
  const rawResultImages = arrayValue(job.result_images || job.resultImages)
  const rawReferenceImages = arrayValue(job.reference_images || job.referenceImages)
  const stages = arrayValue(job.stages).map((stage: Object, index: number) => normalizeJobStage(stage, index))
  const retrievedReferences = arrayValue(job.retrieved_references || job.retrievedReferences)
    .map((item: Object) => normalizeRetrievedReference(item))

  return {
    id: stringValue(job.id || job._id),
    status: stringValue(job.status, 'queued'),
    provider: stringValue(job.provider),
    client_platform: normalizeClientPlatform(job.client_platform || job.clientPlatform),
    job_type: stringValue(job.job_type || job.jobType, 'generate'),
    user_id: stringValue(job.user_id || job.userId),
    user_email: stringValue(job.user_email || job.userEmail),
    configuration_mode: stringValue(job.configuration_mode || job.configurationMode, 'advanced'),
    method_content: stringValue(job.method_content || job.methodContent),
    caption: stringValue(job.caption),
    infographic_category: stringValue(job.infographic_category || job.infographicCategory, '方法框架图'),
    output_format: stringValue(job.output_format || job.outputFormat, 'png'),
    main_model_name: stringValue(job.main_model_name || job.mainModelName),
    image_gen_model_name: stringValue(job.image_gen_model_name || job.imageModelName),
    reference_vision_model_name: stringValue(job.reference_vision_model_name || job.referenceVisionModelName),
    reference_image_mode: stringValue(job.reference_image_mode || job.referenceImageMode || (rawReferenceImages.length ? 'vision_model' : '')),
    reference_image_mode_used: stringValue(job.reference_image_mode_used || job.referenceImageModeUsed || (rawReferenceImages.length ? 'vision_model' : 'none')),
    pipeline_mode: stringValue(job.pipeline_mode || job.pipelineMode),
    task_name: stringValue(job.task_name || job.taskName, 'diagram'),
    retrieval_setting: stringValue(job.retrieval_setting || job.retrievalSetting, 'none'),
    retrieved_reference_ids: stringArrayValue(job.retrieved_reference_ids || job.retrievedReferenceIds),
    retrieved_references: retrievedReferences,
    stages,
    critic_mode: stringValue(job.critic_mode || job.criticMode),
    aspect_ratio: stringValue(job.aspect_ratio || job.aspectRatio),
    image_size: stringValue(job.image_size || job.imageSize),
    num_candidates: numberValue(job.num_candidates || job.numCandidates, 0),
    max_critic_rounds: numberValue(job.max_critic_rounds || job.maxCriticRounds, 0),
    prompt_char_count: numberValue(job.prompt_char_count || job.promptCharCount, 0),
    result_image_count: numberValue(job.result_image_count || job.resultImageCount, rawResultImages.length),
    result_images: rawResultImages.map((image: Object, index: number) => normalizeImageAsset(image, index)),
    reference_image_count: numberValue(job.reference_image_count || job.referenceImageCount, rawReferenceImages.length),
    reference_images: rawReferenceImages.map((image: Object, index: number) => normalizeImageAsset(image, index)),
    logs_tail: stringValue(job.logs_tail),
    error: stringValue(job.error),
    created_at: dateValue(job.created_at, job.createdAt),
    updated_at: dateValue(job.updated_at, job.updatedAt),
    started_at: dateValue(job.started_at, job.startedAt),
    completed_at: dateValue(job.completed_at, job.completedAt),
  }
}

function normalizeClientPlatform(value: Object | string | number | boolean | undefined): string {
  const platform = stringValue(value).trim().toLowerCase()
  if (platform === 'web' || platform === 'miniprogram' || platform === 'android' || platform === 'ios' ||
    platform === 'windows' || platform === 'macos' || platform === 'harmony') return platform
  return ''
}

export function normalizeJobList(value: Object | undefined): Job[] {
  return arrayValue(value).map((item: Object) => normalizeJob(item)).filter((job: Job) => job.id.length > 0)
}
