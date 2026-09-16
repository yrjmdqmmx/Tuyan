/** Old signed batches retain their exact three-provider policy and hashes. */
export type ScientificProductionProvider = 'bailian' | 'ark' | 'openrouter' | 'replicate'
export const SCIENTIFIC_REPLICATE_IMAGE25_MODELS = [
  'openai/gpt-image-2.5-sunburst', 'openai/gpt-image-2.5-flare',
] as const

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
