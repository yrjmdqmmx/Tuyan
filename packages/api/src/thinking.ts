import type { ThinkingOptions, ThinkingSelection, ThinkingConfiguration, ThinkingSnapshotRole, ThinkingSnapshot } from '../../types/src/thinking.js'
import { THINKING_PROFILES } from './thinking-data.js'

const thinkingRoles = ['main', 'vision', 'image'] as const
const ownRecord = (v: any): v is Record<string, any> => Boolean(v && typeof v === 'object' && !Array.isArray(v))
function thinkingError(message: string): never {
  throw Object.assign(new Error(message), { name: 'ThinkingConfigValidationError', statusCode: 400, businessCode: 'THINKING_CONFIG_INVALID', localInputFailure: true, requestState: 'not_sent' })
}
export function thinkingProfile(provider: string, modelId: string, role: string, protocol: string, region?: string): any {
  return THINKING_PROFILES.find((p: any) => p.provider === provider && p.modelIds.includes(modelId) && p.roles.includes(role) && p.protocols.includes(protocol) && (!p.regions || p.regions.includes(region || 'global')))
}
export function validateThinkingOptions(profile: any, value: unknown): ThinkingOptions {
  if (!ownRecord(value) || Object.keys(value).length > 8) thinkingError('思考设置必须是有效的参数对象。')
  const options = { ...value }
  if (!Object.keys(options).length) return options
  if (!profile || profile.status !== 'supported') thinkingError('此渠道、型号与接口尚未核实可调思考参数，请使用服务商默认。')
  for (const [key, option] of Object.entries(options)) {
    const control = profile.controls.find((c: any) => c.key === key)
    if (!control) thinkingError('所选型号不支持此思考参数。')
    if (control.type === 'integer') {
      if (!Number.isSafeInteger(option) || !(control.allowedSpecialValues || []).includes(option) && (option < control.min || option > control.max)) thinkingError(`${control.label}须为 ${control.min}–${control.max} 的整数${control.allowedSpecialValues?.length ? `，或特殊值 ${control.allowedSpecialValues.join('、')}` : ''}。`)
    } else if (!control.values.some((entry: any) => (ownRecord(entry) ? entry.value : entry) === option)) thinkingError(`${control.label}的取值不适用于当前型号。`)
  }
  const disabled = ['disabled', 'none', 'off', false].includes(options.mode as any)
  if (disabled && (options.budget !== undefined || !profile.allowEffortWithoutThinking && options.effort !== undefined && !(profile.disabledEffortValues || ['none','off']).includes(options.effort))) thinkingError('关闭思考不能同时指定思考强度或预算。')
  const effectiveMode = options.mode ?? profile.controls.find((c: any) => c.key === 'mode')?.default ?? (profile.thinkingCannotDisable ? 'enabled' : undefined)
  if ((profile.effortRequiresThinking && options.effort !== undefined || profile.budgetRequiresThinking && options.budget !== undefined) && ![true, 'enabled', 'adaptive'].includes(effectiveMode)) thinkingError('此参数需要先明确开启思考。')
  if (options.mode === 'adaptive' && options.budget !== undefined) thinkingError('自适应思考不能同时指定固定思考预算。')
  if (profile.exclusiveEffortBudget && options.effort !== undefined && options.budget !== undefined) thinkingError('此接口的思考强度与思考预算不能同时设置。')
  if (profile.requiresBudgetWhenEnabled && options.mode === 'enabled' && options.budget === undefined) thinkingError('启用此型号的思考需要同时填写思考预算。')
  if (profile.budgetRequiresEnabled && options.budget !== undefined && options.mode !== 'enabled') thinkingError('固定思考预算仅适用于启用思考模式。')
  for (const rule of profile.invalidCombinations || []) {
    if (Object.entries(rule.when).every(([key, allowed]: [string, any]) => (Array.isArray(allowed) ? allowed : [allowed]).includes(options[key]))) thinkingError(rule.message || '思考参数组合不受此型号支持。')
  }
  return options
}
function thinkingPath(path: string): string[] {
  const parts = path.split('.')
  if (!parts.length || parts.some(p => !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(p) || ['__proto__', 'prototype', 'constructor'].includes(p))) thinkingError('思考字段路径无效。')
  return parts
}
function setThinkingPath(body: any, path: string, value: unknown) {
  const parts = thinkingPath(path); let node = body
  for (const part of parts.slice(0, -1)) { if (!ownRecord(node[part])) node[part] = {}; node = node[part] }
  node[parts.at(-1)!] = value
}
function deleteThinkingPath(body: any, path: string) {
  const parts = thinkingPath(path)
  const remove = (node: any, index: number) => {
    if (!ownRecord(node)) return
    const key = parts[index]
    if (index === parts.length - 1) delete node[key]
    else { remove(node[key], index + 1); if (ownRecord(node[key]) && !Object.keys(node[key]).length) delete node[key] }
  }
  remove(body, 0)
}
function getThinkingPath(body: any, path: string) { return thinkingPath(path).reduce((value, key) => value?.[key], body) }
export function compileThinkingSelection(selection: ThinkingSelection, role: 'main' | 'vision' | 'image'): ThinkingSnapshotRole {
  const profile = thinkingProfile(selection.provider, selection.modelId, role, selection.protocol, selection.region)
  const options = validateThinkingOptions(profile, selection.options)
  const wire: Record<string, unknown> = {}
  for (const control of profile?.controls || []) if (options[control.key] !== undefined) {
    const raw = options[control.key]
    const value = control.wireValues?.[String(raw)] ?? raw
    setThinkingPath(wire, control.field, value)
  }
  const mode = options.mode ?? profile?.controls.find((c: any) => c.key === 'mode')?.default
  const effort = options.effort ?? profile?.controls.find((c: any) => c.key === 'effort')?.default
  const thinkingOn = !['disabled', 'none', 'off', false].includes(mode as any) && !(profile?.disabledEffortValues || ['none','off']).includes(effort)
  return { ...selection, options, role, profileId: profile?.id || 'unconfirmed', checkedAt: profile?.checkedAt || '2026-09-22', wire,
    clearFields: [...new Set<string>([...(profile?.clearFields || []), ...(profile?.controls || []).map((c: any) => c.field)])],
    dropSampling: Boolean(profile?.dropSamplingAlways || profile?.dropSamplingWhenThinking && thinkingOn || profile?.dropSamplingOnProviderDefault && !Object.keys(options).length),
    samplingFields: profile?.samplingFields, operations: profile?.operations,
    requiresNoInputImages: profile?.requiresNoInputImages, requiresNonSequentialGeneration: profile?.requiresNonSequentialGeneration,
    endpointAliases: profile?.transport?.endpointAliases, pinnedSchemaVersion: profile?.transport?.pinnedSchemaVersion,
    ...(profile?.budgetRelation ? { budgetRelation: profile.budgetRelation, budgetField: profile.controls.find((c: any) => c.key === 'budget')?.field, budgetOutputField: profile.budgetOutputField || 'max_tokens' } : {}),
  }
}
/** Validate against the resolved server routes; never accept a client-provided wire snapshot. */
export function normalizeThinkingConfiguration(input: unknown, identities: Record<string, Omit<ThinkingSelection, 'options'>>): { thinkingConfig?: ThinkingConfiguration; thinkingSnapshot?: ThinkingSnapshot } {
  if (input === undefined) return {}
  if (!ownRecord(input) || input.version !== 1 || !ownRecord(input.roles) || Object.keys(input).some(k => !['version', 'roles'].includes(k))) thinkingError('思考设置版本或格式不受支持。')
  const roles: ThinkingConfiguration['roles'] = {}, snapshots: ThinkingSnapshot['roles'] = {}
  for (const [role, raw] of Object.entries(input.roles)) {
    if (!thinkingRoles.includes(role as any) || !ownRecord(raw) || Object.keys(raw).some(k => !['provider', 'modelId', 'protocol', 'region', 'options'].includes(k))) thinkingError('思考设置角色或字段无效。')
    const expected = identities[role]
    if (!expected || ['provider', 'modelId', 'protocol', 'region'].some(key => (raw[key] || '') !== ((expected as any)[key] || ''))) thinkingError('思考参数不属于当前渠道、型号、协议或地区，请重新选择。')
    const selection = { ...expected, options: raw.options } as ThinkingSelection
    const snapshot = compileThinkingSelection(selection, role as any)
    roles[role as keyof typeof roles] = { ...selection, options: snapshot.options }
    snapshots[role as keyof typeof snapshots] = snapshot
  }
  return { thinkingConfig: { version: 1, roles }, thinkingSnapshot: { version: 1, roles: snapshots } }
}
/** Apply the immutable, server-compiled task snapshot after ordinary request construction. */
export function applyThinkingSnapshot(body: any, snapshot?: ThinkingSnapshotRole): any {
  if (!snapshot) return body
  const result = structuredClone(body)
  for (const field of snapshot.clearFields) deleteThinkingPath(result, field)
  const merge = (target: any, patch: any) => { for (const [key, value] of Object.entries(patch)) { if (ownRecord(value)) { if (!ownRecord(target[key])) target[key] = {}; merge(target[key], value) } else target[key] = value } }
  merge(result, snapshot.wire)
  if (snapshot.dropSampling) for (const key of snapshot.samplingFields || ['temperature', 'top_p', 'top_k']) deleteThinkingPath(result, key)
  if (snapshot.role === 'image' && Object.keys(snapshot.options).length) {
    const hasImages = (node: any): boolean => {
      if (!node || typeof node !== 'object') return false
      if (node.type === 'image' || node.type === 'image_url') return true
      return Object.entries(node).some(([key,value]) => ['images','image','image_url','image_urls','input_image','input_images','referenceImages','inlineData','inline_data'].includes(key) && Boolean(Array.isArray(value) ? value.length : value) || typeof value === 'object' && hasImages(value))
    }
    if (snapshot.requiresNoInputImages && hasImages(result)) thinkingError('此图片接口仅纯文生图支持思考参数；带图请求请使用服务商默认。')
    if (snapshot.requiresNonSequentialGeneration && (result.parameters?.enable_sequential || result.input?.image_set_mode || result.settings?.sequential)) thinkingError('此图片接口不支持序列生图与思考参数组合。')
  }
  if (snapshot.budgetRelation === 'inclusive' && snapshot.budgetField) {
    const budget = getThinkingPath(result, snapshot.budgetField), output = getThinkingPath(result, snapshot.budgetOutputField || 'max_tokens')
    if (typeof budget === 'number' && budget > 0 && typeof output === 'number' && budget >= output) thinkingError('思考预算须小于此请求的总输出额度；不会自动增加输出长度。')
  }
  return result
}
export function applyThinkingTransport(url: string, options: RequestInit | undefined, snapshot?: ThinkingSnapshotRole): RequestInit | undefined {
  if (!snapshot || options?.method?.toUpperCase() !== 'POST' || typeof options.body !== 'string') return options
  if (!snapshot.clearFields.length && !Object.keys(snapshot.wire).length) return options
  let payload: any
  try { payload = JSON.parse(options.body) } catch { return options }
  const requests = Array.isArray(payload) ? payload : [payload]
  let changed = false
  const body = requests.map(request => {
    const parsed = new URL(url)
    let model = request?.model || (/\/models\/([^/:]+):generateContent/.exec(parsed.pathname)?.[1])
    if (snapshot.provider === 'fal' && parsed.hostname === 'queue.fal.run') {
      const endpoint = parsed.pathname.slice(1)
      if (endpoint.includes('/requests/')) return request
      if (!(snapshot.endpointAliases || [snapshot.modelId]).includes(endpoint)) thinkingError('图片请求端点与任务保存的思考配置不一致。')
      model = snapshot.modelId
    }
    if (snapshot.provider === 'replicate' && parsed.hostname === 'api.replicate.com') {
      model = /^\/v1\/models\/(.+)\/predictions$/.exec(parsed.pathname)?.[1]
      if (parsed.pathname === '/v1/predictions') {
        if (!snapshot.pinnedSchemaVersion || request.version !== snapshot.pinnedSchemaVersion) thinkingError('Replicate 版本与已核实思考参数的版本不一致。')
        model = snapshot.modelId
      }
    }
    if (!model) return request // Uploads, task polling and asset requests are never inference settings targets.
    if (model !== snapshot.modelId) thinkingError('实际请求型号与任务中保存的思考配置不一致，已阻止自动替换。')
    const path = parsed.pathname
    const matchesProtocol = ['openai-chat-completions','openai:chat-completions','bailian-openai-chat','ark-openai-chat','openrouter-chat-completions'].includes(snapshot.protocol) ? path.endsWith('/chat/completions')
      : snapshot.protocol === 'openai-responses' ? path.endsWith('/responses')
      : snapshot.protocol === 'anthropic-messages' ? path.endsWith('/messages')
      : snapshot.protocol === 'gemini-generate-content' ? path.endsWith(':generateContent')
      : snapshot.protocol === 'gemini-interactions' ? path.endsWith('/interactions')
      : snapshot.protocol === 'bailian-multimodal-generation' ? path.endsWith('/multimodal-generation/generation')
      : snapshot.protocol === 'runware-text' ? ['textInference','caption'].includes(request.taskType)
      : ['provider-images','replicate-predictions'].includes(snapshot.protocol) && snapshot.role === 'image'
        ? snapshot.provider === 'fal' ? parsed.hostname === 'queue.fal.run'
          : snapshot.provider === 'replicate' ? parsed.hostname === 'api.replicate.com'
          : snapshot.provider === 'runware' && request.taskType === 'imageInference'
        : false
    if (!matchesProtocol) thinkingError('实际接口协议与原任务思考配置不一致，未发送请求。')
    changed = true
    return applyThinkingSnapshot(request, snapshot)
  })
  return changed ? { ...options, body: JSON.stringify(Array.isArray(payload) ? body : body[0]) } : options
}

export function validateThinkingTask(snapshot: ThinkingSnapshot | undefined, task: any) {
  const image = snapshot?.roles.image
  if (!image || !Object.keys(image.options).length) return
  if (task.action === 'refineImage' && !image.operations?.includes('editing')) thinkingError('此图片接口的思考设置仅支持纯文生图，精修请使用服务商默认。')
  if (image.requiresNoInputImages && ((task.referenceImages || []).length || task.retrievalSetting && task.retrievalSetting !== 'none')) thinkingError('此图片接口的思考设置不能与参考图或检索图片组合，请使用服务商默认或关闭参考图。')
}
