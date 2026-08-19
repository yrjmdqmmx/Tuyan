export type ProviderId = 'bailian' | 'openrouter' | 'gemini' | 'openai'
export type ConfigurationMode = 'simple' | 'advanced'
export type OutputFormat = 'png' | 'svg'
export type ImageSize = '1K' | '2K' | '4K'
export type RetrievalSetting = 'none' | 'auto' | 'random' | 'manual'
export type ReferenceImageMode = 'main_model' | 'vision_model'
export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | string
export type FeedbackCategory = 'bug' | 'feature' | 'experience' | 'other'

export interface SelectOption {
  label: string
  value: string
  description?: string
}

export interface ModelOption {
  label: string
  value: string
  group: string
}

export interface ProviderConfig {
  id: ProviderId
  label: string
  keyPlaceholder: string
  mainModel: string
  imageModel: string
  visionModel: string
  mainModels: ModelOption[]
  imageModels: ModelOption[]
  visionModels: ModelOption[]
  guideSteps: string[]
}

export interface InfographicCategory {
  id: string
  label: string
  description: string
}

export interface QuickStartExample {
  id: string
  label: string
  title: string
  category: string
  caption: string
  methodContent: string
  hint: string
}

export interface CurrentUser {
  id: string
  email: string
  name: string
}

export interface HealthInfo {
  code?: number
  ok?: boolean
  runtime?: string
  backendMode?: string
  auth?: string
  laf?: HealthInfo
  mock_enabled?: boolean
}

export interface ImageAsset {
  filename: string
  url: string
  storage: string
  candidate_id: number
  mime_type: string
  object_key: string
  size: number
}

export interface ReferenceImageUpload {
  id: string
  uri: string
  filename: string
  mimeType: string
  size: number
  objectKey?: string
  uploadToken?: string
}

export interface UploadedReferenceImage {
  filename: string
  mimeType: string
  size: number
  objectKey: string
  uploadToken: string
}

export interface RetrievedReference {
  id: string
  task_name: string
  title: string
  summary: string
  image_url: string
  image_object_key: string
  source: string
}

export interface JobStageImage {
  filename: string
  url: string
  storage: string
  mime_type: string
}

export interface JobStage {
  id: string
  candidate_id: number
  type: string
  title: string
  round: number
  text: string
  suggestion: string
  image?: JobStageImage
  started_at?: string | number
  completed_at?: string | number
  duration_ms: number
  error: string
}

export interface Job {
  id: string
  status: JobStatus
  provider: string
  client_platform: string
  job_type: string
  user_id: string
  user_email: string
  configuration_mode: string
  method_content: string
  caption: string
  infographic_category: string
  output_format: string
  main_model_name: string
  image_gen_model_name: string
  reference_vision_model_name: string
  reference_image_mode: string
  reference_image_mode_used: string
  pipeline_mode: string
  task_name: string
  retrieval_setting: string
  retrieved_reference_ids: string[]
  retrieved_references: RetrievedReference[]
  stages: JobStage[]
  critic_mode: string
  aspect_ratio: string
  image_size: string
  num_candidates: number
  max_critic_rounds: number
  prompt_char_count: number
  result_image_count: number
  result_images: ImageAsset[]
  reference_image_count: number
  reference_images: ImageAsset[]
  logs_tail: string
  error: string
  created_at?: string | number
  updated_at?: string | number
  started_at?: string | number
  completed_at?: string | number
}

export interface CreateJobInput {
  configurationMode: ConfigurationMode
  provider: ProviderId
  apiKey: string
  categoryId: string
  categoryLabel: string
  methodContent: string
  caption: string
  outputFormat: OutputFormat
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

export interface UploadPrepareFile {
  clientId: string
  role: string
  filename: string
  mimeType: string
  size: number
}

export interface PreparedUpload {
  clientId: string
  objectKey: string
  uploadToken: string
  uploadUrl: string
}

export interface CreateJobResult {
  id: string
  status: string
}
