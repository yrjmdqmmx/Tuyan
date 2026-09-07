/** Region identity is public routing data; API keys remain in client memory. */
export type ProviderRegions = { minimax?: 'global' | 'cn' }
export const MINIMAX_REGIONS = {
  global: { label: '国际', apiBase: 'https://api.minimax.io/v1', keyUrl: 'https://platform.minimax.io/user-center/basic-information/interface-key' },
  cn: { label: '中国大陆', apiBase: 'https://api.minimax.cn/v1', keyUrl: 'https://platform.minimaxi.com/user-center/basic-information/interface-key' },
} as const

export function normalizeProviderRegions(value?: unknown): ProviderRegions {
  if (value === undefined) return {}
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid provider region configuration')
  const input = value as Record<string, unknown>
  if (Object.keys(input).some(key => key !== 'minimax')) throw new Error('Unsupported provider region configuration')
  if (input.minimax !== undefined && input.minimax !== 'global' && input.minimax !== 'cn') throw new Error('Unsupported MiniMax region')
  return input.minimax === undefined ? {} : { minimax: input.minimax }
}

export function minimaxRegion(regions?: unknown): 'global' | 'cn' {
  return normalizeProviderRegions(regions).minimax || 'global'
}

export function regionApiKeySlot(provider: string, regions?: unknown): string {
  return provider === 'minimax' ? `minimax:${minimaxRegion(regions)}` : provider
}

/** Legacy unscoped MiniMax credentials belong only to the international API. */
export function selectRegionApiKeys(keys: Record<string, string>, regions?: unknown): Record<string, string> {
  const selected = Object.fromEntries(Object.entries(keys).filter(([key]) => !key.includes(':')))
  const region = minimaxRegion(regions)
  selected.minimax = keys[`minimax:${region}`] ?? (region === 'global' ? keys.minimax || '' : '')
  return selected
}

export function modelAvailableInRegion(provider: string, model: { regions?: string[] }, regions?: unknown): boolean {
  if (provider !== 'minimax') return true
  const region = minimaxRegion(regions)
  // Old unscoped catalog entries described only the international endpoint.
  return model.regions?.includes(region) || (region === 'global' && (!model.regions?.length || model.regions.includes('global-endpoint'))) || false
}

/** The selected region projects the same catalog used for admission and execution. */
export function registryForRegions<T extends { providers?: Record<string, any> }>(registry: T | null, regions?: unknown): T | null {
  const entry = registry?.providers?.minimax
  if (!entry) return registry
  const models = entry.models.filter((model: { regions?: string[] }) => modelAvailableInRegion('minimax', model, regions))
  return { ...registry!, providers: { ...registry!.providers, minimax: { ...entry, models } } }
}
