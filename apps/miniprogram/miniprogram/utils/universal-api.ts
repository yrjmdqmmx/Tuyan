// Generated shared history types; configuration and execution are Web/Core-only.
/** Versioned, user-declared BYOK contract. No model-name or vendor-name inference. */
export const UNIVERSAL_PROTOCOLS = ['openai-chat', 'openai-responses', 'openai-images', 'anthropic-messages', 'gemini-generate-content', 'gemini-interactions', 'dashscope-multimodal'] as const
export type UniversalProtocol = typeof UNIVERSAL_PROTOCOLS[number]
export type UniversalAuth = 'bearer' | 'x-api-key' | 'x-goog-api-key'
export type UniversalRequestState = 'not_sent' | 'rejected' | 'unknown'
export type UniversalErrorCode = 'CONFIG_INVALID' | 'ENDPOINT_UNSAFE' | 'CREDENTIAL_MISMATCH' | 'CAPABILITY_UNSUPPORTED' | 'INPUT_LIMIT' | 'IMAGE_INVALID' | 'OUTPUT_SIZE_UNSUPPORTED' | 'UPSTREAM_REJECTED' | 'RESULT_UNKNOWN' | 'ASYNC_UNSUPPORTED' | 'RESPONSE_INVALID' | 'RESPONSE_LIMIT' | 'CATALOG_UNSUPPORTED' | 'DNS_RESOLUTION_FAILED' | 'NETWORK_ERROR' | 'REQUEST_TIMEOUT' | 'UPSTREAM_FAILURE' | 'ENDPOINT_NOT_FOUND' | 'MODEL_NOT_FOUND'
export interface UniversalInputLimits {
  maxCount: number; maxBytes: number; maxTotalBytes: number; maxDimension: number; maxPixels: number; requestMaxBytes: number; mimeTypes: string[]
}
export interface UniversalOutputLimits { maxBytes: number; maxDimension: number; maxPixels: number; mimeTypes: string[] }
export interface UniversalOutputSize { resolution: string; aspectRatio: string; value: string }
export interface UniversalCustomConfig {
  version: 1; connectionId: string; protocol: UniversalProtocol; baseUrl: string; auth: UniversalAuth
  compatibility?: 'standard' | 'openrouter-image' | 'ark-images'
  capabilities: { text: boolean; vision: boolean; imageGeneration: boolean; imageEditing: boolean }
  inputLimits: UniversalInputLimits; outputLimits: UniversalOutputLimits; outputSizes?: UniversalOutputSize[]
}
export interface UniversalRoute { accessProvider: 'custom'; modelId: string; custom: UniversalCustomConfig }
