import type { ModelRoutes } from './model-routing'

// Persist only presentation preferences. Credentials and identity never belong here.
const FIELDS = ['configurationMode', 'simpleProvider', 'outputFormat', 'imageSize', 'aspectRatio', 'pipelineMode', 'retrievalSetting', 'numCandidates', 'maxCriticRounds'] as const
function snapshot(value: any): any {
  const result: any = {}
  for (const name of FIELDS) result[name] = value[name]
  result.modelRoutes = Object.fromEntries(['main', 'image', 'vision'].map(role => [role, { accessProvider: value.modelRoutes[role].accessProvider, modelId: value.modelRoutes[role].modelId }]))
  if (value.providerRegions?.minimax) result.providerRegions = { minimax: value.providerRegions.minimax }
  return result
}
export function saveUiSettings(scope: 'create' | 'refine', value: { modelRoutes: ModelRoutes }): void {
  try { wx.setStorageSync(`tuyan_ui_settings_v1_${scope}`, snapshot(value)) } catch { /* memory settings remain usable */ }
}
export function readUiSettings<T extends { modelRoutes: ModelRoutes }>(scope: 'create' | 'refine', fallback: T): T {
  try {
    const value = wx.getStorageSync(`tuyan_ui_settings_v1_${scope}`)
    if (!value || !['simple', 'advanced'].includes(value.configurationMode) || !['png', 'svg'].includes(value.outputFormat)) return fallback
    if (!['main', 'image', 'vision'].every(role => typeof value.modelRoutes?.[role]?.modelId === 'string' && value.modelRoutes[role].modelId.length <= 200 && typeof value.modelRoutes[role].accessProvider === 'string')) return fallback
    for (const field of ['simpleProvider', 'imageSize', 'aspectRatio', 'pipelineMode', 'retrievalSetting']) if (typeof value[field] !== 'string' || value[field].length > 100) return fallback
    if (![1, 2, 3].includes(value.numCandidates) || ![0, 1, 2].includes(value.maxCriticRounds)) return fallback
    return snapshot(value) as T
  } catch { return fallback }
}
