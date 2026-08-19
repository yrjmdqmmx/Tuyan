export type ProviderId = 'bailian' | 'openrouter' | 'gemini' | 'openai';
export type BackendMode = 'gateway' | 'laf' | 'fastapi';
export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | string;
export type ConfigurationMode = 'simple' | 'advanced';
export type AuthMode = 'sign-in' | 'sign-up';
export type ModelOption = readonly [id: string, label: string, group?: string];

export interface ProviderConfig {
  id: ProviderId;
  label: string;
  keyName: ProviderId;
  keyPlaceholder: string;
  mainModel: string;
  imageModel: string;
  mainModels: readonly ModelOption[];
  imageModels: readonly ModelOption[];
  guideUrl: string;
  guideSteps: string[];
}

export interface QuickStartExample {
  id: string;
  label: string;
  title: string;
  category: string;
  caption: string;
  methodContent: string;
  hint: string;
}

export interface HealthInfo {
  code?: number;
  ok?: boolean;
  runtime?: string;
  backendMode?: BackendMode;
  mock_enabled?: boolean;
  laf?: {
    ok?: boolean;
    runtime?: string;
    mock_enabled?: boolean;
  };
}

export interface ResultImage {
  filename: string;
  url: string;
  candidate_id: number;
  mime_type: string;
}

export interface Job {
  id: string;
  status: JobStatus;
  provider: string;
  client_platform: string;
  user_id: string;
  user_email: string;
  configuration_mode: ConfigurationMode | string;
  method_content: string;
  caption: string;
  infographic_category: string;
  main_model_name: string;
  image_gen_model_name: string;
  pipeline_mode: string;
  aspect_ratio: string;
  num_candidates: number;
  max_critic_rounds: number;
  prompt_char_count: number;
  result_image_count: number;
  result_images: ResultImage[];
  logs_tail: string;
  error: string;
  created_at?: string | number;
  updated_at?: string | number;
  started_at?: string | number;
  completed_at?: string | number;
}

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
}

export interface JobPayload {
  configurationMode: ConfigurationMode;
  provider: ProviderId;
  apiKeys: Record<ProviderId, string>;
  taskName: string;
  methodContent: string;
  caption: string;
  infographicCategory: string;
  mainModelName: string;
  imageGenModelName: string;
  pipelineMode: string;
  retrievalSetting: string;
  aspectRatio: string;
  numCandidates: number;
  maxCriticRounds: number;
  mock: boolean;
}
