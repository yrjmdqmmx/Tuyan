// Generated shared history types; configuration and execution are Web/Core-only.
/** Versioned, user-declared BYOK contract. No model-name or vendor-name inference. */
export const UNIVERSAL_TEXT_OUTPUT_TOKENS = 4096
export const UNIVERSAL_PROTOCOLS = ['openai-chat', 'openai-responses', 'openai-images', 'anthropic-messages', 'gemini-generate-content', 'gemini-interactions', 'dashscope-multimodal', 'bedrock-converse', 'bedrock-invoke'] as const
export type UniversalProtocol = typeof UNIVERSAL_PROTOCOLS[number]
export type UniversalAuth = 'bearer' | 'x-api-key' | 'x-goog-api-key' | 'api-key' | 'bearer-expiring'
export type UniversalRequestState = 'not_sent' | 'rejected' | 'unknown'
export type UniversalErrorCode = 'CREDENTIAL_EXPIRED' | 'CREDENTIAL_EXPIRY_REQUIRED' | 'CONFIG_INVALID' | 'ENDPOINT_UNSAFE' | 'CREDENTIAL_MISMATCH' | 'CAPABILITY_UNSUPPORTED' | 'INPUT_LIMIT' | 'IMAGE_INVALID' | 'OUTPUT_SIZE_UNSUPPORTED' | 'UPSTREAM_REJECTED' | 'RESULT_UNKNOWN' | 'ASYNC_UNSUPPORTED' | 'RESPONSE_INVALID' | 'RESPONSE_LIMIT' | 'CATALOG_UNSUPPORTED' | 'DNS_RESOLUTION_FAILED' | 'NETWORK_ERROR' | 'REQUEST_TIMEOUT' | 'UPSTREAM_FAILURE' | 'ENDPOINT_NOT_FOUND' | 'MODEL_NOT_FOUND' | 'CATALOG_CONFIG_INVALID' | 'CATALOG_AUTH_FAILED' | 'CATALOG_PERMISSION_DENIED' | 'CATALOG_RATE_LIMITED' | 'CATALOG_TIMEOUT' | 'CATALOG_NETWORK_ERROR' | 'CATALOG_PROVIDER_ERROR' | 'CATALOG_RESPONSE_INVALID' | 'CATALOG_RESPONSE_LIMIT' | 'CATALOG_ENDPOINT_NOT_FOUND'
export interface UniversalInputLimits {
  maxCount: number; maxBytes: number; maxTotalBytes: number; maxDimension: number; maxPixels: number; requestMaxBytes: number; mimeTypes: string[]
}
export type UniversalCatalogFormat = 'auto' | 'openai' | 'anthropic' | 'gemini' | 'none'
export interface UniversalConnection {
  version: 1; connectionId: string; protocol: UniversalProtocol; baseUrl: string; auth: UniversalAuth; catalogFormat: UniversalCatalogFormat
}
export interface UniversalCatalogStrategy {
  supported: boolean; format: 'openai' | 'anthropic' | 'gemini' | null; source: 'official' | 'explicit' | 'unsupported'; message: string
}
export interface UniversalOutputLimits { maxBytes: number; maxDimension: number; maxPixels: number; mimeTypes: string[] }
export interface UniversalOutputSize { resolution: string; aspectRatio: string; value: string }
export interface UniversalLimitLayer { input?: Partial<UniversalInputLimits>; output?: Partial<UniversalOutputLimits> }
export interface UniversalLimitPolicy {
  version: 1; service: UniversalLimitLayer; user: UniversalLimitLayer
}
export interface UniversalCatalogMetadata {
  version: 1
  source: { kind: 'official-api' | 'verified-service'; provider: string; baseUrl: string; protocol: string; auth: string; modelId: string; fetchedAt: string; checkedAt: string; url: string }
  facts: { imageInput?: boolean; textOutput?: boolean; imageOutput?: boolean; thinking?: boolean; inputTokenLimit?: number; contextWindowTokens?: number; outputTokenLimit?: number; supportedParameters?: string[]; generationMethods?: string[]; reasoningEfforts?: string[]; thinkingModes?: string[]; reasoningMandatory?: boolean; reasoningBudget?: boolean }
}
export interface UniversalImageTool {
  provider: 'openai' | 'xai' | 'azure'; model?: string; deployment?: string
  quality?: 'auto' | 'low' | 'medium' | 'high' | 'xhigh' | 'max'; format?: 'png' | 'jpeg' | 'webp'
}
export interface UniversalCustomConfig {
  version: 1; connectionId: string; protocol: UniversalProtocol; baseUrl: string; auth: UniversalAuth
  compatibility?: 'standard' | 'openrouter-image' | 'ark-images'
  capabilities: { text: boolean; vision: boolean; imageGeneration: boolean; imageEditing: boolean }
  imageTool?: UniversalImageTool
  azure?: { deploymentModel: string }
  bedrock?: { strength?: number }
  limitPolicy?: UniversalLimitPolicy
  inputLimits: UniversalInputLimits; outputLimits: UniversalOutputLimits; outputSizes?: UniversalOutputSize[]
}
export interface UniversalRoute { accessProvider: 'custom'; modelId: string; custom: UniversalCustomConfig }
