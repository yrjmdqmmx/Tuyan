import { normalizeUniversalRoute, normalizeUniversalBaseUrl, universalDefaultAuth, universalCredential, universalModelEntry, UniversalApiError } from './universalContract.js'
import { STATIC_MODEL_REGISTRY } from './staticModelCatalog.js'
import { referenceSubmissionPolicy } from './referenceUploadPolicy.js'
import { resolveImageSize } from '../../../../packages/types/src/image-size-contract.ts'
import sizeContracts from '../../../../config/image-size-contracts.json'

export const UNIVERSAL_PROTOCOL_OPTIONS = [
  ['openai-chat', 'OpenAI Chat Completions', 'https://api.openai.com/v1'],
  ['openai-responses', 'OpenAI Responses', 'https://api.openai.com/v1'],
  ['openai-images', 'OpenAI Images', 'https://api.openai.com/v1'],
  ['anthropic-messages', 'Anthropic Messages', 'https://api.anthropic.com/v1'],
  ['gemini-generate-content', 'Gemini GenerateContent', 'https://generativelanguage.googleapis.com/v1beta'],
  ['gemini-interactions', 'Gemini Interactions', 'https://generativelanguage.googleapis.com/v1beta'],
  ['dashscope-multimodal', 'DashScope 原生多模态', 'https://dashscope.aliyuncs.com/api/v1'],
]
const storageKey = 'tuyan.universal-api.v1'
export const UNIVERSAL_PROVIDER = { label: '通用 API', mainModels: [], imageModels: [], visionModels: [], accessKind: 'direct', registryModels: [] }
export function emptyUniversalDraft(role) {
  const protocol = role === 'image' ? 'openai-images' : 'openai-chat'
  return { modelId: '', declared: false, custom: {version: 1, connectionId: `custom_${role}`, protocol, baseUrl: UNIVERSAL_PROTOCOL_OPTIONS.find(x => x[0] === protocol)[2], auth: universalDefaultAuth(protocol), compatibility: 'standard',
    catalogFormat: 'auto', capabilities: {text: false, vision: false, imageGeneration: false, imageEditing: false},
    inputLimits: {maxCount: 1, maxBytes: 5*1024*1024, maxTotalBytes: 10*1024*1024, maxDimension: 4096, maxPixels: 16000000, requestMaxBytes: 32*1024*1024, mimeTypes: ['image/png','image/jpeg','image/webp']},
    outputLimits: {maxBytes: 20*1024*1024, maxDimension: 8192, maxPixels: 32000000, mimeTypes: ['image/png','image/jpeg','image/webp']}, outputSizes: []}}
}
export function loadUniversalDrafts(storage = globalThis.localStorage) {
  const defaults = Object.fromEntries(['main','vision','image'].map(role => [role, emptyUniversalDraft(role)]))
  try {
    const data = JSON.parse(storage?.getItem(storageKey) || 'null')
    if (data?.version === 1) for (const role of Object.keys(defaults)) {
      const d = data.roles?.[role]
      if (d && typeof d.modelId === 'string' && d.custom && typeof d.custom === 'object') {
        // Restore only the known shape. Corrupt drafts remain editable, never silently authorized.
        let repaired = false
        const restore = (template, value) => Object.fromEntries(Object.entries(template).map(([key, fallback]) => {
          const saved = value?.[key]
          if (Array.isArray(fallback)) {
            if (key === 'outputSizes' && Array.isArray(saved) && saved.every(row => row && ['resolution','aspectRatio','value'].every(k => typeof row[k] === 'string'))) return [key, saved.map(({resolution,aspectRatio,value}) => ({resolution,aspectRatio,value}))]
            if (key !== 'outputSizes' && Array.isArray(saved) && saved.every(x => typeof x === 'string')) return [key, saved]
          } else if (fallback && typeof fallback === 'object') return [key, restore(fallback, saved)]
          else if (typeof saved === typeof fallback && (typeof saved !== 'number' || Number.isFinite(saved))) return [key, saved]
          if (key === 'catalogFormat' && saved === undefined) return [key, fallback]
          repaired = true
          return [key, fallback]
        }))
        const custom = restore(defaults[role].custom, d.custom)
        defaults[role] = {modelId:d.modelId, declared:d.declared === true && !repaired, custom:{...custom,connectionId:`custom_${role}`}}
      }
    }
  } catch { /* An invalid saved draft must not break preset channels. */ }
  return defaults
}
export function saveUniversalDrafts(drafts, storage = globalThis.localStorage) {
  // Explicit allowlist. Keys and validation outcomes never enter localStorage.
  const roles = Object.fromEntries(Object.entries(drafts).map(([role,d]) => [role, {modelId: d.modelId, declared: Boolean(d.declared), custom: {
    version: 1, connectionId: `custom_${role}`, protocol: d.custom.protocol, baseUrl: d.custom.baseUrl, auth: d.custom.auth, compatibility: d.custom.compatibility,
    catalogFormat: d.custom.catalogFormat || 'auto', capabilities: d.custom.capabilities, inputLimits: d.custom.inputLimits, outputLimits: d.custom.outputLimits, outputSizes: d.custom.outputSizes,
  }}]))
  try { storage?.setItem(storageKey, JSON.stringify({version:1,roles})); return true } catch { return false }
}
// Audit reuse is exact origin + protocol + model ID, never a name/prefix guess.
export function officialDeclaration(draft) {
  const c = draft.custom
  let base
  try { base = normalizeUniversalBaseUrl(c.baseUrl, c.protocol) } catch { return null }
  const provider = base === 'https://api.openai.com/v1' ? 'openai' : base === 'https://api.anthropic.com/v1' ? 'anthropic' : base === 'https://generativelanguage.googleapis.com/v1beta' ? 'gemini' : ''
  const entry = STATIC_MODEL_REGISTRY[provider]?.models.find(x => x.id === draft.modelId && x.selectable !== false)
  const expected = {'openai-chat':'openai-chat-completions', 'openai-responses':'openai-responses','openai-images':'openai-images','anthropic-messages':'anthropic-messages','gemini-generate-content':'gemini-generate-content','gemini-interactions':'gemini-interactions'}[c.protocol]
  if (!entry || entry.protocol !== expected || c.compatibility !== 'standard' || c.auth !== universalDefaultAuth(c.protocol)) return null
  const policy = referenceSubmissionPolicy(provider, entry.id)
  if (entry.capabilities.referenceImages && policy.status === 'unconfirmed') return null
  const image = entry.capabilities.imageGeneration, editing = entry.capabilities.imageEditMode === 'direct-edit'
  const outputSizes = []
  const route = sizeContracts.routes[`${provider}/${entry.id}`]
  // If generation/edit sizes differ, ask for an explicit connection per use.
  if (image || editing) {
    const profile = sizeContracts.profiles[route?.generation || route?.editing]
    if (!profile) return null
    for (const [resolution,ratios] of Object.entries(entry.capabilities.aspectRatiosByResolution || entry.capabilities.refineAspectRatiosByResolution || {})) for (const aspectRatio of ratios) {
      try { const resolved = resolveImageSize(profile, aspectRatio, resolution); outputSizes.push({resolution,aspectRatio,value:c.protocol.startsWith('gemini-') ? resolution : resolved.size}) } catch { /* Only declared legal combinations. */ }
    }
    if (!outputSizes.length) return null
  }
  return {...c, capabilities:{text:entry.roles.includes('main'),vision:entry.roles.includes('vision'),imageGeneration:Boolean(image),imageEditing:Boolean(editing && (!image || route.generation === route.editing))},
    inputLimits:{...c.inputLimits,...policy,mimeTypes:policy.mimeTypes || c.inputLimits.mimeTypes},outputSizes}
}
export function universalDraftRoute(draft) {
  if (!draft.modelId.trim()) throw new Error('请填写准确模型 ID，或先获取模型并选择。')
  const declared = draft.declared ? draft.custom : officialDeclaration(draft)
  if (!declared) throw new Error('该地址与型号没有可直接采用的精确能力记录，请在「能力与限额」中按服务文档补充并确认。')
  return normalizeUniversalRoute({accessProvider:'custom',modelId:draft.modelId,custom:declared})
}
export function universalDraftConnection(draft) {
  const {version,connectionId,protocol,baseUrl,auth,catalogFormat = 'auto'} = draft.custom
  return {version,connectionId,protocol,baseUrl,auth,catalogFormat}
}
export function universalCheckErrorMessage(error, kind) {
  if (error.localValidation) return error.message
  const code = error.details?.catalogError?.code || (error.name === 'UniversalApiError' ? error.code : error.details?.failure?.code)
  if (code) {
    try { const safe = new UniversalApiError(code); return `${safe.reason}${safe.suggestion}` } catch { /* Unknown upstream content is not UI copy. */ }
  }
  const step = kind === 'catalog' ? '获取模型目录' : '检查配置'
  const status = error.code >= 400 && error.code <= 599 ? error.code : error.status
  if (status === 401) return `${step}失败：图研登录已过期，请重新登录后再试，配置已保留。`
  if (status === 403) return `${step}失败：访问被拒绝，请检查登录状态及账号权限。`
  if (status === 429) return `${step}请求过于频繁，请稍后重试。`
  if (status === 408 || status === 504 || error.name === 'AbortError') return `${step}超时，请检查网络后重新操作。未触发生成。`
  if (status >= 500) return `${step}暂不可用，服务端返回异常，请稍后重试。未触发生成。`
  return `${step}失败：无法获得有效响应，请检查网络及服务地址后重试。配置已保留，未触发生成。`
}
export function validateUniversalCatalogResult(result) {
  const states = ['catalog-visible','catalog-partial','catalog-empty','catalog-invalid','unsupported']
  const validId = id => typeof id === 'string' && id.length > 0 && id.length <= 256 && id.trim() === id && !/[\x00-\x1f\x7f\\]/.test(id)
  if (!result || !states.includes(result.state) || result.verified !== false || result.inferenceVerified !== false
    || typeof result.complete !== 'boolean' || typeof result.truncated !== 'boolean'
    || typeof result.fetchedAt !== 'string' || !Number.isFinite(Date.parse(result.fetchedAt))
    || typeof result.message !== 'string' || !result.message
    || !Array.isArray(result.models) || result.models.length > 10000 || result.models.some(row => !row || !validId(row.id))
    || new Set(result.models.map(row => row.id)).size !== result.models.length
    || !Array.isArray(result.warnings) || result.warnings.some(row => !row || !Number.isInteger(row.row) || typeof row.code !== 'string')
    || result.state === 'catalog-visible' && (!result.models.length || !result.complete || result.truncated || result.warnings.length)
    || ['catalog-empty','catalog-invalid','unsupported'].includes(result.state) && result.models.length
    || result.state === 'catalog-empty' && (!result.complete || result.truncated || result.warnings.length)) throw new UniversalApiError('CATALOG_RESPONSE_INVALID')
  return result
}
export const UNIVERSAL_ROLE_REQUIREMENTS = {
  main: '主模型需要文本生成能力；如果该角色接收参考图，还需确认图片理解和输入限额。',
  vision: '识图模型需要图片理解与文本输出能力，请确认图片数量、格式、大小和请求限额。',
  image: '图像模型需要图片生成能力、输出限额及清晰度与比例映射；直接精修还需图片编辑能力。',
}
export function universalDraftFeedback(draft, role) {
  if (!draft.modelId.trim()) return {tone:'neutral', message:'先获取模型并选择，或手动填写准确模型 ID。'}
  if (!draft.declared && !officialDeclaration(draft)) return {tone:'warning', message:`此协议、地址与准确 ID 暂无已核对的能力记录。请展开「能力与限额」确认。${UNIVERSAL_ROLE_REQUIREMENTS[role]}`}
  const entry = universalDraftEntry(draft)
  if (!entry.selectable) return {tone:'error', message:entry.disabledReason}
  if (!entry.roles.includes(role)) return {tone:'error', message:`当前能力声明不支持此角色。${UNIVERSAL_ROLE_REQUIREMENTS[role]}`}
  return {tone:'success', message:'配置结构完整；地址、账号权限和真实调用仍需分别确认。'}
}
export function universalDraftEntry(draft) {
  try { return universalModelEntry(universalDraftRoute(draft)) }
  catch(error) { return {id:draft.modelId,label:draft.modelId || '待配置',selectable:false,roles:[],capabilities:{},disabledReason:error.message} }
}
export function universalRoutes(drafts) {
  return Object.fromEntries(Object.entries(drafts).map(([role,draft]) => {
    try {return [role,universalDraftRoute(draft)]} catch {return [role,{accessProvider:'custom',modelId:draft.modelId,custom:draft.custom}]}
  }))
}
export function universalKeyEnvelope(drafts, keys) {
  const scoped = {}
  for (const [role,d] of Object.entries(drafts)) {
    const key = keys[role]
    if (!key) continue
    // Bound at entry, independent of later edits or currently selected roles.
    scoped[d.custom.connectionId] = key
  }
  return JSON.stringify(scoped)
}
export function bindUniversalKey(draft, apiKey) {
  const c = draft.custom
  return {baseUrl:c.baseUrl,protocol:c.protocol,auth:c.auth,apiKey}
}
export function missingUniversalKeys(routes, roles, envelope) {
  return roles.filter(role => {try {universalCredential(routes[role],envelope);return false} catch{return true}})
}
export function updateUniversalDraft(draft, patch) {
  const next = {...draft,...patch,custom:{...draft.custom,...patch.custom}}
  const changedBinding = ['baseUrl','protocol','auth'].some(k => draft.custom[k] !== next.custom[k])
  if (next.modelId !== draft.modelId || changedBinding || next.custom.compatibility !== draft.custom.compatibility) next.declared = false
  return {draft:next,clearKey:changedBinding}
}
