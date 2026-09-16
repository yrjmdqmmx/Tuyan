/** Old signed batches retain their exact three-provider policy and hashes. */
export type ScientificProductionProvider = 'bailian' | 'ark' | 'openrouter' | 'replicate'
export const SCIENTIFIC_REPLICATE_IMAGE25_MODELS = [
  'openai/gpt-image-2.5-sunburst', 'openai/gpt-image-2.5-flare',
] as const

/** Additional routes are opt-in per signed expansion; historical manifests keep their roster. */
export const SCIENTIFIC_REPLICATE_EXPANSION_MODELS = [
  'openai/gpt-image-2', 'google/nano-banana-2-lite', 'google/nano-banana-2',
  'google/nano-banana-pro', 'google/nano-banana',
] as const

export function scientificReplicatePrice(modelId: string, imageSize: string) {
  const prices: Record<string, { imageSize: string; rate: string; tier: string; criterion: string | null; criterionTitle: string | null }> = {
    'openai/gpt-image-2.5-sunburst': { imageSize: 'provider-default', rate: '0.25', tier: 'quality=auto', criterion: 'auto', criterionTitle: 'model variant' },
    'openai/gpt-image-2.5-flare': { imageSize: 'provider-default', rate: '0.25', tier: 'quality=auto', criterion: 'auto', criterionTitle: 'model variant' },
    'openai/gpt-image-2': { imageSize: 'provider-default', rate: '0.128', tier: 'quality=auto', criterion: 'auto', criterionTitle: 'model variant' },
    'google/nano-banana-2-lite': { imageSize: 'provider-default', rate: '0.034', tier: 'provider-default', criterion: null, criterionTitle: null },
    'google/nano-banana-2': { imageSize: '2K', rate: '0.101', tier: 'resolution=2K', criterion: '2K', criterionTitle: 'target resolution' },
    'google/nano-banana-pro': { imageSize: '2K', rate: '0.15', tier: 'resolution=2K', criterion: '2K', criterionTitle: 'target resolution' },
    'google/nano-banana': { imageSize: 'provider-default', rate: '0.039', tier: 'provider-default', criterion: null, criterionTitle: null },
  }
  const price = Object.hasOwn(prices, modelId) ? prices[modelId] : undefined
  if (!price || imageSize !== price.imageSize) throw new Error('SCIENTIFIC_V2_REPLICATE_PRICE_EVIDENCE_INVALID')
  return price
}

export function scientificProviderOrder(replicate = false): ScientificProductionProvider[] {
  return replicate ? ['bailian', 'ark', 'openrouter', 'replicate'] : ['bailian', 'ark', 'openrouter']
}

export function scientificUsesReplicate(models: readonly {
  generationRoute?: { provider: string } | null
  editRoute?: { provider: string } | null
}[]) {
  return models.some((model) => model.generationRoute?.provider === 'replicate' || model.editRoute?.provider === 'replicate')
}

export function scientificProviderBudgets(replicate = false): Record<string, number> {
  return { bailian: 180, ark: 180, openrouter: 360, ...(replicate ? { replicate: 40 } : {}) }
}

export function scientificProviderZeroes(replicate = false): Record<string, number> {
  return Object.fromEntries(scientificProviderOrder(replicate).map((provider) => [provider, 0]))
}

/** Replicate expansions have nine one-shot slots: no repeat billing after a failure. */
export function scientificMaxAttempts(provider: string | null) {
  return provider === 'replicate' ? 1 : 4
}
