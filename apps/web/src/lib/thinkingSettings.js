import { thinkingProfile, validateThinkingOptions } from './thinking'

export const THINKING_STORAGE_KEY = 'tuyan.thinking.v1'
export const THINKING_ROLES = ['main', 'vision', 'image']
const selectionKey = (role, value) => JSON.stringify([role,value.provider,value.modelId,value.protocol,value.region || ''])
export function thinkingIdentities(routes, entries, regions) {
  return Object.fromEntries(THINKING_ROLES.map(role => {
    const route = routes[role], entry = entries[role]
    const protocol = route.accessProvider === 'custom' ? route.custom?.protocol || 'unconfirmed'
      : entry?.roleProtocols?.[role] || (route.accessProvider === 'openrouter' ? role === 'image' ? 'openrouter-images' : 'openrouter-chat-completions' : entry?.protocol || 'unconfirmed')
    return [role, { provider: route.accessProvider, modelId: route.modelId, protocol, ...(route.accessProvider === 'minimax' ? {region: regions?.minimax || 'global'} : {}) }]
  }))
}
export function reconcileThinkingSettings(saved, identities) {
  return {version: 1, roles: Object.fromEntries(THINKING_ROLES.map(role => {
    const identity = identities[role], previous = saved?.version === 1 ? saved.savedSelections?.[selectionKey(role,identity)] || saved.roles?.[role] : undefined
    const same = previous && ['provider','modelId','protocol','region'].every(key => previous[key] === identity[key])
    return [role, {...identity, options: same && previous.options && typeof previous.options === 'object' && !Array.isArray(previous.options) ? previous.options : {}}]
  }))}
}
export function rememberThinkingSettings(settings, previous) {
  const entries = {...previous?.savedSelections}
  for (const [role, selection] of Object.entries(previous?.roles || {})) entries[selectionKey(role,selection)] = selection
  for (const [role, selection] of Object.entries(settings.roles)) {
    const key=selectionKey(role,selection); delete entries[key]; entries[key]=selection
  }
  return {...settings,savedSelections:Object.fromEntries(Object.entries(entries).slice(-120))}
}
export function readThinkingSettings(storage = globalThis.localStorage) {
  try { return JSON.parse(storage.getItem(THINKING_STORAGE_KEY)) } catch { return null }
}
export function saveThinkingSettings(value, storage = globalThis.localStorage) {
  try { storage.setItem(THINKING_STORAGE_KEY, JSON.stringify(value)) } catch { /* Storage can be unavailable in private browsing. */ }
}
export function roleThinkingProfile(role, selection) {
  return thinkingProfile(selection.provider, selection.modelId, role, selection.protocol, selection.region)
}
export function buildThinkingSubmission(settings, registry, roles, operation) {
  const hasSettings = Object.values(settings.roles).some(selection => Object.keys(selection.options).length)
  if (!(Number(registry?.thinkingContractVersion) >= 1)) {
    if (hasSettings) throw new Error('当前后端尚不支持思考设置，请升级服务或清除所选参数。')
    return {}
  }
  const selected = Object.fromEntries(roles.map(role => {
    const selection = settings.roles[role], profile = roleThinkingProfile(role, selection)
    validateThinkingOptions(profile, selection.options)
    if (role === 'image' && operation === 'editing' && Object.keys(selection.options).length && !profile?.operations?.includes('editing')) throw new Error('此图片接口只在纯文生图时支持思考设置，精修请使用默认。')
    return [role, selection]
  }))
  return {thinkingConfig: {version: 1, roles: selected}}
}
