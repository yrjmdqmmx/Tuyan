import { scientificV2Error } from './scientific-v2-common.js'

const fixed = new Map<string, string>()
const set = (provider: string, modelId: string, generation: string, edit?: string) => {
  fixed.set(`${provider}\0${modelId}\0generation`, generation)
  if (edit !== undefined) fixed.set(`${provider}\0${modelId}\0edit`, edit)
}

set('bailian', 'qwen-image-2.0', '0.20', '0.20')
set('bailian', 'qwen-image-2.0-pro', '0.50', '0.50')
set('bailian', 'qwen-image-3.0-pro', '0.50', '0.52')
set('bailian', 'wan2.7-image', '0.20', '0.20')
set('bailian', 'wan2.7-image-pro', '0.50', '0.50')
set('bailian', 'z-image-turbo', '0.20')

set('ark', 'doubao-seedream-4-0-250828', '0.20', '0.20')
set('ark', 'doubao-seedream-4-5-251128', '0.25', '0.25')
set('ark', 'doubao-seedream-5-0-260128', '0.22', '0.22')
set('ark', 'doubao-seedream-5-0-pro-260628', '0.60', '0.60')

set('openrouter', 'krea/krea-2-large', '0.48', '0.52')
set('openrouter', 'krea/krea-2-medium', '0.24', '0.28')
set('openrouter', 'krea/krea-2-medium-turbo', '0.12', '0.14')
set('openrouter', 'microsoft/mai-image-2.5', '0.548864', '0.811008')
set('openrouter', 'microsoft/mai-image-2.5-pro', '1.048576', '1.31072')
set('openrouter', 'qwen/qwen-image-3', '0.24', '0.264')
set('openrouter', 'black-forest-labs/flux.2-flex', '1.92', '3.05246208')
set('openrouter', 'black-forest-labs/flux.2-klein-4b', '0.448', '0.448')
set('openrouter', 'black-forest-labs/flux.2-max', '2.24', '2.24')
set('openrouter', 'black-forest-labs/flux.2-pro', '0.96', '0.96')
set('openrouter', 'sourceful/riverflow-v2-fast', '0.32', '1.92')
set('openrouter', 'sourceful/riverflow-v2-pro', '1.20', '2.80')
set('openrouter', 'sourceful/riverflow-v2.5-fast', '0.168', '0.168')
set('openrouter', 'sourceful/riverflow-v2.5-pro', '1.20', '1.20')
set('openrouter', 'x-ai/grok-imagine-image-2.0', '0.64', '0.72')
set('openrouter', 'x-ai/grok-imagine-image-quality', '0.56', '0.64')
set('openrouter', 'recraft/recraft-v3', '0.32', '0.32')
set('openrouter', 'recraft/recraft-v4', '0.32', '0.32')
set('openrouter', 'recraft/recraft-v4-pro', '2.00', '2.00')
set('openrouter', 'recraft/recraft-v4-pro-vector', '2.40', '2.40')
set('openrouter', 'recraft/recraft-v4-styles-pro-vector', '0.96', '1.00')
set('openrouter', 'recraft/recraft-v4-styles-vector', '0.40', '0.44')
set('openrouter', 'recraft/recraft-v4-vector', '0.64', '0.64')
set('openrouter', 'recraft/recraft-v4.1', '0.28', '0.28')
set('openrouter', 'recraft/recraft-v4.1-pro', '1.68', '1.68')
set('openrouter', 'recraft/recraft-v4.1-pro-vector', '2.40', '2.40')
set('openrouter', 'recraft/recraft-v4.1-utility', '0.28', '0.28')
set('openrouter', 'recraft/recraft-v4.1-utility-pro', '1.68', '1.68')
set('openrouter', 'recraft/recraft-v4.1-vector', '0.64', '0.64')

export function scientificV2ConservativeUnitCny(requirement: { provider: unknown; modelId: unknown; operation: unknown }) {
  if (typeof requirement.provider !== 'string' || typeof requirement.modelId !== 'string' || typeof requirement.operation !== 'string') {
    scientificV2Error('SCIENTIFIC_V2_PRICE_OPERATOR_MAP_UNAVAILABLE')
  }
  const value = fixed.get(`${requirement.provider}\0${requirement.modelId}\0${requirement.operation}`)
  if (!value) scientificV2Error('SCIENTIFIC_V2_PRICE_OPERATOR_MAP_UNAVAILABLE')
  return value
}
