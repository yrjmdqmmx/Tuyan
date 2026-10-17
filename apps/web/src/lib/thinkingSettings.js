import { selectionThinkingProfile, universalThinkingIdentity, sameThinkingConnection, validateThinkingOptions } from './thinking'

export const THINKING_STORAGE_KEY = 'tuyan.thinking.v1'
export const THINKING_ROLES = ['main', 'vision', 'image']
const selectionKey = (role, value) => JSON.stringify([role,value.provider,value.modelId,value.protocol,value.region || '',...(value.connection?[value.connection]:[])])
// between_tools still enables reasoning during tool use; it is not an Off mode.
// The simplified On control uses adaptive when the exact profile supports it.
const onModes = [true, 'enabled', 'adaptive', 'between_tools']
const offModes = [false, 'disabled', 'none', 'off']
export function thinkingModeSwitch(profile) {
  const control = profile?.controls?.find(control => control.key === 'mode')
  const values = control?.values?.map(entry => typeof entry === 'object' ? entry.value : entry)
  if (!values?.length || !values.every(value => [...onModes, ...offModes].includes(value))) return null
  const on = values.includes('adaptive') ? 'adaptive' : values.find(value => onModes.includes(value))
  const off = values.find(value => offModes.includes(value))
  return {control, on, off, initial: onModes.includes(control.default) ? on : off ?? on}
}
export function requiresThinkingBudget(profile, options) {
  return profile?.status === 'supported' && profile.requiresBudgetWhenEnabled && options?.mode === 'enabled'
}
// Keep an explicit budget only when the current mode requires it.
function cleanSelection(role, selection, fillMode = false) {
  const options = {...selection.options}
  const profile = roleThinkingProfile(role, selection)
  const toggle = profile?.status === 'supported' && thinkingModeSwitch(profile)
  if (toggle) {
    if (onModes.includes(options.mode) && toggle.on !== undefined) options.mode = toggle.on
    else if (offModes.includes(options.mode) && toggle.off !== undefined) options.mode = toggle.off
    else if (fillMode && options.mode === undefined) options.mode = toggle.initial
    if (options.mode === undefined) delete options.mode
    if (offModes.includes(options.mode) && !profile.allowEffortWithoutThinking) delete options.effort
  }
  if (!requiresThinkingBudget(profile, options)) delete options.budget
  return {...selection, options}
}
export function thinkingUiSelection(role, selection) { return cleanSelection(role, selection, true) }
export function thinkingRequestSelection(role, selection) {
  // Displayed vendor defaults are not an explicit image override. Materializing
  // them blocks reference-based iteration on generation-only thinking APIs.
  return role === 'image' ? cleanSelection(role, selection) : thinkingUiSelection(role, selection)
}
function cleanStoredSettings(value) {
  if (value?.version !== 1 || !value.roles) return value
  const roles = Object.fromEntries(Object.entries(value.roles).map(([role, selection]) => [role, cleanSelection(role, selection)]))
  const savedSelections = value.savedSelections && Object.fromEntries(Object.entries(value.savedSelections).map(([key, selection]) => {
    let role
    try { role = JSON.parse(key)[0] } catch { return [key, selection] }
    return [key, cleanSelection(role, selection)]
  }))
  return {...value, roles, ...(savedSelections ? {savedSelections} : {})}
}
export function thinkingIdentities(routes, entries, regions) {
  return Object.fromEntries(THINKING_ROLES.map(role => {
    const route = routes[role], entry = entries[role]
    if (route.accessProvider === 'custom' && route.custom) { try { return [role, universalThinkingIdentity(route)] } catch { /* Incomplete drafts remain editable. */ } }
    const protocol = route.accessProvider === 'custom' ? route.custom?.protocol || 'unconfirmed'
      : entry?.roleProtocols?.[role] || (route.accessProvider === 'openrouter' ? role === 'image' ? 'openrouter-images' : 'openrouter-chat-completions' : entry?.protocol || 'unconfirmed')
    return [role, { provider: route.accessProvider, modelId: route.modelId, protocol, ...(route.accessProvider === 'minimax' ? {region: regions?.minimax || 'global'} : {}) }]
  }))
}
export function reconcileThinkingSettings(saved, identities) {
  return {version: 1, roles: Object.fromEntries(THINKING_ROLES.map(role => {
    const identity = identities[role], previous = saved?.version === 1 ? saved.savedSelections?.[selectionKey(role,identity)] || saved.roles?.[role] : undefined
    const same = previous && ['provider','modelId','protocol','region'].every(key => previous[key] === identity[key]) && sameThinkingConnection(previous?.connection, identity.connection)
    return [role, cleanSelection(role, {...identity, options: same && previous.options && typeof previous.options === 'object' && !Array.isArray(previous.options) ? previous.options : {}})]
  }))}
}
export function rememberThinkingSettings(settings, previous) {
  const entries = {...previous?.savedSelections}
  for (const [role, selection] of Object.entries(previous?.roles || {})) entries[selectionKey(role,selection)] = selection
  for (const [role, selection] of Object.entries(settings.roles)) {
    const key=selectionKey(role,selection); delete entries[key]; entries[key]=selection
  }
  return cleanStoredSettings({...settings,savedSelections:Object.fromEntries(Object.entries(entries).slice(-120))})
}
export function readThinkingSettings(storage) {
  try { return cleanStoredSettings(JSON.parse((storage ?? globalThis.localStorage).getItem(THINKING_STORAGE_KEY))) } catch { return null }
}
export function saveThinkingSettings(value, storage) {
  try { (storage ?? globalThis.localStorage).setItem(THINKING_STORAGE_KEY, JSON.stringify(cleanStoredSettings(value))); return true } catch { return false }
}
export function roleThinkingProfile(role, selection) {
  return selectionThinkingProfile(selection, role)
}
export function buildThinkingSubmission(settings, registry, roles, operation) {
  const hasSettings = roles.some(role => Object.keys(cleanSelection(role, settings.roles[role]).options).length)
  if (!(Number(registry?.thinkingContractVersion) >= 1)) {
    if (hasSettings) throw new Error('当前后端尚不支持思考设置，请升级服务或清除所选参数。')
    return {}
  }
  const selected = Object.fromEntries(roles.map(role => {
    const saved = settings.roles[role], profile = roleThinkingProfile(role, saved)
    const canAdjust = !(role === 'image' && operation === 'editing' && !profile?.operations?.includes('editing'))
      && !(saved.provider === 'custom' && !(Number(registry?.universalThinkingVersion) >= 1))
    const selection = canAdjust ? thinkingRequestSelection(role, saved) : cleanSelection(role, saved)
    if (selection.provider === 'custom' && Object.keys(selection.options).length && !(Number(registry?.universalThinkingVersion) >= 1)) throw new Error('当前后端尚未支持通用 API 思考参数，草稿已保留；请升级后端或恢复服务商默认。')
    validateThinkingOptions(profile, selection.options)
    if (role === 'image' && operation === 'editing' && Object.keys(selection.options).length && !profile?.operations?.includes('editing')) throw new Error('此图片接口只在纯文生图时支持思考设置，精修请使用默认。')
    return [role, selection.provider === 'custom' && !(Number(registry?.universalThinkingVersion) >= 1) ? {...selection, connection:undefined} : selection]
  }))
  return {thinkingConfig: {version: 1, roles: selected}}
}
