/** Versioned, user-declared BYOK contract. No model-name or vendor-name inference. */
export const UNIVERSAL_PROTOCOLS = ['openai-chat', 'openai-responses', 'openai-images', 'anthropic-messages', 'gemini-generate-content', 'gemini-interactions', 'dashscope-multimodal'] as const
export type UniversalProtocol = typeof UNIVERSAL_PROTOCOLS[number]
export type UniversalAuth = 'bearer' | 'x-api-key' | 'x-goog-api-key'
export type UniversalRequestState = 'not_sent' | 'rejected' | 'unknown'
export type UniversalErrorCode = 'CONFIG_INVALID' | 'ENDPOINT_UNSAFE' | 'CREDENTIAL_MISMATCH' | 'CAPABILITY_UNSUPPORTED' | 'INPUT_LIMIT' | 'IMAGE_INVALID' | 'OUTPUT_SIZE_UNSUPPORTED' | 'UPSTREAM_REJECTED' | 'RESULT_UNKNOWN' | 'ASYNC_UNSUPPORTED' | 'RESPONSE_INVALID' | 'RESPONSE_LIMIT' | 'CATALOG_UNSUPPORTED' | 'DNS_RESOLUTION_FAILED' | 'NETWORK_ERROR' | 'REQUEST_TIMEOUT' | 'UPSTREAM_FAILURE' | 'ENDPOINT_NOT_FOUND' | 'MODEL_NOT_FOUND' | 'CATALOG_CONFIG_INVALID' | 'CATALOG_AUTH_FAILED' | 'CATALOG_PERMISSION_DENIED' | 'CATALOG_RATE_LIMITED' | 'CATALOG_TIMEOUT' | 'CATALOG_NETWORK_ERROR' | 'CATALOG_PROVIDER_ERROR' | 'CATALOG_RESPONSE_INVALID' | 'CATALOG_RESPONSE_LIMIT' | 'CATALOG_ENDPOINT_NOT_FOUND'
const universalErrorMessages: Record<UniversalErrorCode, [string, string, string]> = {
  DNS_RESOLUTION_FAILED: ['network', '无法解析 API 地址，尚未发送模型请求。', '请检查域名拼写和 DNS 服务，再重新检查连接。'],
  NETWORK_ERROR: ['network', '模型请求发送过程中连接中断，结果尚未确认。', '请检查连接，并先到渠道核对本次请求与费用；系统不会自动重发。'],
  REQUEST_TIMEOUT: ['timeout', '连接检查或模型请求超时。', '若请求状态为未发送，可重新检查连接；若结果未知，请先到渠道核对请求与费用。'],
  UPSTREAM_FAILURE: ['provider', '渠道服务异常，已发送请求的结果尚未确认。', '请先到渠道核对本次请求与费用，待渠道恢复后再决定是否手动重试。'],
  ENDPOINT_NOT_FOUND: ['configuration', '渠道未找到当前操作地址，或该地址不提供此模型。', '请核对 API 基础地址、协议和准确模型 ID。'],
  MODEL_NOT_FOUND: ['configuration', '渠道未找到当前模型，或此账号没有该模型权益。', '请从当前账号目录核对准确模型 ID 与访问权益。'],
  CONFIG_INVALID: ['configuration', '通用 API 配置不完整或字段无效。', '请明确填写协议、准确模型 ID、能力和输入输出限额。'],
  ENDPOINT_UNSAFE: ['security', 'API 地址未通过公网 HTTPS 安全校验。', '请使用公网 HTTPS 443 基础地址；不要填写内网、完整操作端点或重定向地址。'],
  CREDENTIAL_MISMATCH: ['authentication', '此密钥未绑定当前连接地址、协议和鉴权方式。', '请在当前连接中重新保存密钥。'],
  CAPABILITY_UNSUPPORTED: ['capability', '此连接未声明或当前协议不支持本步骤所需能力。', '请选择支持该步骤的协议与模型，核对文字、识图、生图或编辑能力。'],
  INPUT_LIMIT: ['input', '本次输入超过已声明的数量、大小、尺寸或请求额度。', '请减少输入或图片，或核对当前型号的实际限额。'],
  IMAGE_INVALID: ['input', '图片内容、格式或尺寸无效。', '请重新导出 PNG、JPEG 或 WebP 图片后再试。'],
  OUTPUT_SIZE_UNSUPPORTED: ['capability', '当前连接未声明所选分辨率和比例的输出尺寸。', '请补充准确的尺寸映射，或选择已声明的尺寸。'],
  UPSTREAM_REJECTED: ['provider', '模型渠道拒绝了本次请求。', '请核对模型 ID、账号权益、额度与协议配置后再手动重试。'],
  RESULT_UNKNOWN: ['provider', '请求已发出，但结果未确认，可能已产生费用。', '请先到渠道核对请求和费用；系统不会自动重发。'],
  ASYNC_UNSUPPORTED: ['provider', '渠道返回异步任务或未完成结果，当前同步模式无法确认产物。', '请到渠道核对任务和费用；系统不会重新提交任务。'],
  RESPONSE_INVALID: ['provider', '渠道响应不符合当前协议的完整产物格式。', '请核对协议与兼容选项，并到渠道确认结果和费用。'],
  RESPONSE_LIMIT: ['provider', '渠道响应或产物超过已声明的安全额度。', '请核对输出限额，并到渠道确认已有结果；不要直接重复提交。'],
  CATALOG_UNSUPPORTED: ['capability', '当前连接未启用已支持的只读目录格式。', '请按服务文档选择目录格式，或手动填写准确模型 ID；目录可见不代表真实调用已验证。'],
  CATALOG_CONFIG_INVALID: ['configuration', '目录连接配置不完整或字段无效。', '请核对连接 ID、协议、服务地址、鉴权方式与目录格式；读取目录无需填写模型 ID 或能力。'],
  CATALOG_AUTH_FAILED: ['authentication', '目录服务拒绝了当前密钥。', '请更新当前连接密钥后重新读取目录；本次未发送生成请求。'],
  CATALOG_PERMISSION_DENIED: ['authentication', '当前密钥没有读取此目录的权限。', '请在服务方核对目录访问权限；也可按服务文档手动填写模型 ID。'],
  CATALOG_RATE_LIMITED: ['rate_limit', '目录请求受到频率或配额限制。', '请稍后手动刷新目录，并核对服务方的目录请求额度；本次未发送生成请求。'],
  CATALOG_TIMEOUT: ['timeout', '读取模型目录超时。', '请检查连接后手动刷新目录；本次未发送生成请求。'],
  CATALOG_NETWORK_ERROR: ['network', '无法连接目录服务或目录连接中断。', '请核对域名、网络和服务地址后手动刷新目录；本次未发送生成请求。'],
  CATALOG_PROVIDER_ERROR: ['provider', '目录服务暂不可用或拒绝了目录请求。', '请核对目录地址与账号状态，待服务恢复后手动刷新；本次未发送生成请求。'],
  CATALOG_RESPONSE_INVALID: ['provider', '目录响应格式或分页信息不符合所选目录格式。', '请按服务文档核对目录格式；保留手动填写准确模型 ID 的方式。'],
  CATALOG_RESPONSE_LIMIT: ['provider', '模型目录超过本次读取的安全大小上限。', '请查看服务方目录或手动填写准确模型 ID；本次未发送生成请求。'],
  CATALOG_ENDPOINT_NOT_FOUND: ['configuration', '服务地址没有提供所选格式的模型目录。', '请核对 Base URL 和目录格式，或手动填写准确模型 ID。'],
}
export class UniversalApiError extends Error {
  readonly category: string; readonly reason: string; readonly suggestion: string; readonly uncertain: boolean; readonly status: number; readonly recoveryAction: string; readonly publicReason: string
  constructor(readonly code: UniversalErrorCode, readonly requestState: UniversalRequestState = 'not_sent', status?: number) {
    const [category, reason, suggestion] = universalErrorMessages[code]
    super(reason); this.name = 'UniversalApiError'; this.category = category; this.reason = reason; this.suggestion = suggestion; this.uncertain = requestState === 'unknown'
    this.status = status ?? (code === 'DNS_RESOLUTION_FAILED' ? 503 : code === 'REQUEST_TIMEOUT' ? 504 : requestState === 'not_sent' ? 400 : 502)
    this.recoveryAction = requestState === 'unknown' ? 'reconcile_provider' : status === 401 || status === 403 ? 'reauthorize_api_key' : status === 402 ? 'top_up_balance' : status === 429 ? 'rate_limit' : 'review_configuration'
    if (!code.startsWith('CATALOG_') && (status === 401 || status === 403)) { this.category = 'authentication'; this.reason = '渠道拒绝了密钥或当前模型的访问权限。'; this.suggestion = '请更新当前连接密钥，并核对账号中的模型访问权益。' }
    if (!code.startsWith('CATALOG_') && status === 402) { this.category = 'billing'; this.reason = '渠道余额或计费状态不允许本次请求。'; this.suggestion = '请在渠道核对余额与计费状态后手动重试。' }
    if (!code.startsWith('CATALOG_') && status === 429) { this.category = 'rate_limit'; this.reason = '渠道请求频率或当前额度已达到上限。'; this.suggestion = '请在渠道核对频率与额度，稍后手动重试。' }
    this.message = this.reason; this.publicReason = this.reason
  }
  toJSON() { return { code: this.code, message: this.message, category: this.category, reason: this.reason, suggestion: this.suggestion, requestState: this.requestState, uncertain: this.uncertain, recoveryAction: this.recoveryAction, ...(this.status ? { status: this.status } : {}) } }
}
export interface UniversalInputLimits {
  maxCount: number; maxBytes: number; maxTotalBytes: number; maxDimension: number; maxPixels: number; requestMaxBytes: number; mimeTypes: string[]
}
export type UniversalCatalogFormat = 'auto' | 'openai' | 'anthropic' | 'gemini' | 'none'
export interface UniversalConnection {
  version: 1; connectionId: string; protocol: UniversalProtocol; baseUrl: string; auth: UniversalAuth; catalogFormat: UniversalCatalogFormat
}
export interface UniversalCatalogStrategy {
  supported: boolean; format: 'openai' | 'anthropic' | 'gemini' | null; source: 'official' | 'explicit' | 'unsupported'; message: string
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
export const UNIVERSAL_PLATFORM_LIMITS = { maxCount: 8, maxBytes: 20 * 1024 * 1024, maxTotalBytes: 80 * 1024 * 1024, maxDimension: 16384, maxPixels: 32000000, requestMaxBytes: 120 * 1024 * 1024 }
const universalMimeTypes = ['image/png', 'image/jpeg', 'image/webp']
function universalRecord(value: unknown): value is Record<string, any> { return value !== null && typeof value === 'object' && !Array.isArray(value) }
function universalString(value: unknown, max = 256): value is string { return typeof value === 'string' && value.length > 0 && value.length <= max && value.trim() === value && !/[\x00-\x1f\x7f]/.test(value) }
export function universalDefaultAuth(protocol: UniversalProtocol): UniversalAuth { return protocol === 'anthropic-messages' ? 'x-api-key' : protocol.startsWith('gemini-') ? 'x-goog-api-key' : 'bearer' }
export function normalizeUniversalBaseUrl(value: unknown, protocol: UniversalProtocol): string {
  if (!UNIVERSAL_PROTOCOLS.includes(protocol) || !universalString(value, 2048) || /[^\x21-\x7e]|\\|%/u.test(value)) throw new UniversalApiError('ENDPOINT_UNSAFE')
  let url: URL
  try { url = new URL(value) } catch { throw new UniversalApiError('ENDPOINT_UNSAFE') }
  const host = url.hostname.toLowerCase()
  if (url.protocol !== 'https:' || url.port && url.port !== '443' || url.username || url.password || url.search || url.hash
    || !host || host.endsWith('.') || host === 'localhost' || /\.(localhost|local|internal|test|invalid)$/.test(host)
    || /\/(?:\.\.?)(?:\/|$)/.test(value) || /\/{2}/.test(url.pathname)) throw new UniversalApiError('ENDPOINT_UNSAFE')
  const path = url.pathname.replace(/\/+$/, '')
  if (/(?:\/chat\/completions|\/responses|\/images\/(?:generations|edits)|\/messages|\/interactions|:generateContent|\/multimodal-generation\/generation|\/models)$/i.test(path)) throw new UniversalApiError('ENDPOINT_UNSAFE')
  const prefix = protocol.startsWith('gemini-') ? '/v1beta' : protocol === 'dashscope-multimodal' ? '/api/v1' : '/v1'
  return url.origin + (path || prefix)
}
/** A directory belongs to a connection, independent of any inference model or capabilities. */
export function normalizeUniversalConnection(value: unknown): UniversalConnection {
  if (!universalRecord(value) || value.version !== 1 || !universalString(value.connectionId, 80) || !/^[a-zA-Z0-9_-]+$/.test(value.connectionId) || !UNIVERSAL_PROTOCOLS.includes(value.protocol)) throw new UniversalApiError('CATALOG_CONFIG_INVALID')
  const auth = value.auth === undefined ? universalDefaultAuth(value.protocol) : value.auth
  const catalogFormat = value.catalogFormat === undefined ? 'auto' : value.catalogFormat
  if (!['bearer', 'x-api-key', 'x-goog-api-key'].includes(auth) || !['auto', 'openai', 'anthropic', 'gemini', 'none'].includes(catalogFormat)) throw new UniversalApiError('CATALOG_CONFIG_INVALID')
  return { version: 1, connectionId: value.connectionId, protocol: value.protocol, baseUrl: normalizeUniversalBaseUrl(value.baseUrl, value.protocol), auth, catalogFormat }
}
/** Auto is an audited origin/path/protocol mapping, never a guess from an inference protocol. */
export function resolveUniversalCatalogStrategy(value: unknown): UniversalCatalogStrategy {
  const c = normalizeUniversalConnection(value)
  if (c.catalogFormat === 'none') return { supported: false, format: null, source: 'unsupported', message: '此连接使用手动填写模型 ID；不会请求模型目录。' }
  if (c.catalogFormat !== 'auto') return { supported: true, format: c.catalogFormat, source: 'explicit', message: `按您确认的 ${c.catalogFormat} 目录格式读取 Base URL 下的 /models；目录可见不代表模型能力或权限已验证。` }
  let format: UniversalCatalogStrategy['format'] = null
  if (c.baseUrl === 'https://api.openai.com/v1' && c.protocol.startsWith('openai-') && c.auth === 'bearer') format = 'openai'
  if (c.baseUrl === 'https://openrouter.ai/api/v1' && c.protocol.startsWith('openai-') && c.auth === 'bearer') format = 'openai'
  if (c.baseUrl === 'https://api.anthropic.com/v1' && c.protocol === 'anthropic-messages' && c.auth === 'x-api-key') format = 'anthropic'
  if (c.baseUrl === 'https://generativelanguage.googleapis.com/v1beta' && c.protocol.startsWith('gemini-') && c.auth === 'x-goog-api-key') format = 'gemini'
  return format ? { supported: true, format, source: 'official', message: '使用已核对官方文档的只读目录；目录可见不代表此账号具有模型调用权限或所需能力。' }
    : { supported: false, format: null, source: 'unsupported', message: '尚未核对这个地址的目录约定。请按服务文档明确选择目录格式，或手动填写准确模型 ID。' }
}
/** Catalog errors must never imply a charged inference request or uncertain generation. */
export function universalCatalogError(error: unknown): UniversalApiError {
  // Laf embeds this contract; accept its sibling error class by allowlisted fields, never raw text.
  const known = universalRecord(error) && error.name === 'UniversalApiError' && typeof error.code === 'string' && Object.prototype.hasOwnProperty.call(universalErrorMessages, error.code)
    ? new UniversalApiError(error.code as UniversalErrorCode, 'not_sent', Number.isInteger(error.status) && error.status >= 400 && error.status <= 599 ? error.status : undefined) : undefined
  if (known && (known.code.startsWith('CATALOG_') || ['ENDPOINT_UNSAFE', 'CREDENTIAL_MISMATCH'].includes(known.code))) return known
  const code: UniversalErrorCode = known?.code === 'CONFIG_INVALID' ? 'CATALOG_CONFIG_INVALID' : known?.status === 401 ? 'CATALOG_AUTH_FAILED' : known?.status === 403 ? 'CATALOG_PERMISSION_DENIED'
    : known?.status === 429 ? 'CATALOG_RATE_LIMITED' : known?.code === 'REQUEST_TIMEOUT' ? 'CATALOG_TIMEOUT'
      : known?.code === 'DNS_RESOLUTION_FAILED' || known?.code === 'NETWORK_ERROR' ? 'CATALOG_NETWORK_ERROR'
        : known?.code === 'RESPONSE_LIMIT' ? 'CATALOG_RESPONSE_LIMIT' : known?.code === 'ENDPOINT_NOT_FOUND' || known?.status === 404 ? 'CATALOG_ENDPOINT_NOT_FOUND'
          : known?.code === 'RESPONSE_INVALID' || known?.code === 'ASYNC_UNSUPPORTED' ? 'CATALOG_RESPONSE_INVALID' : 'CATALOG_PROVIDER_ERROR'
  return new UniversalApiError(code, 'not_sent', known?.status ?? 502)
}
function universalPositive(value: unknown, cap: number, zero = false): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < (zero ? 0 : 1)) throw new UniversalApiError('CONFIG_INVALID')
  return Math.min(value, cap)
}
function universalMimes(value: unknown): string[] {
  if (!Array.isArray(value) || !value.length || value.some(x => !universalMimeTypes.includes(x)) || new Set(value).size !== value.length) throw new UniversalApiError('CONFIG_INVALID')
  return [...value]
}
export function normalizeUniversalRoute(value: unknown): UniversalRoute {
  if (!universalRecord(value) || value.accessProvider !== 'custom' || !universalString(value.modelId) || /(?:^|\/)\.\.?(?:\/|$)|\\/.test(value.modelId) || !universalRecord(value.custom)) throw new UniversalApiError('CONFIG_INVALID')
  const c = value.custom
  if (c.version !== 1 || !universalString(c.connectionId, 80) || !/^[a-zA-Z0-9_-]+$/.test(c.connectionId) || !UNIVERSAL_PROTOCOLS.includes(c.protocol)) throw new UniversalApiError('CONFIG_INVALID')
  const auth = c.auth === undefined ? universalDefaultAuth(c.protocol) : c.auth
  if (!['bearer', 'x-api-key', 'x-goog-api-key'].includes(auth)) throw new UniversalApiError('CONFIG_INVALID')
  const compatibility = c.compatibility === undefined ? 'standard' : c.compatibility
  if (!['standard', 'openrouter-image', 'ark-images'].includes(compatibility)
    || compatibility === 'openrouter-image' && c.protocol !== 'openai-chat'
    || compatibility === 'ark-images' && c.protocol !== 'openai-images') throw new UniversalApiError('CONFIG_INVALID')
  if (!universalRecord(c.capabilities) || ['text', 'vision', 'imageGeneration', 'imageEditing'].some(k => typeof c.capabilities[k] !== 'boolean')) throw new UniversalApiError('CONFIG_INVALID')
  const capabilities = { text: c.capabilities.text, vision: c.capabilities.vision, imageGeneration: c.capabilities.imageGeneration, imageEditing: c.capabilities.imageEditing }
  if (!Object.values(capabilities).some(Boolean) || capabilities.vision && !capabilities.text) throw new UniversalApiError('CONFIG_INVALID')
  const textOnly = c.protocol === 'anthropic-messages' || c.protocol === 'openai-responses' || c.protocol === 'openai-chat' && compatibility !== 'openrouter-image'
  if (textOnly && (capabilities.imageGeneration || capabilities.imageEditing) || c.protocol === 'openai-images' && (capabilities.text || capabilities.vision)) throw new UniversalApiError('CAPABILITY_UNSUPPORTED')
  if (!universalRecord(c.inputLimits) || !universalRecord(c.outputLimits)) throw new UniversalApiError('CONFIG_INVALID')
  const i = c.inputLimits, o = c.outputLimits, caps = UNIVERSAL_PLATFORM_LIMITS
  const inputLimits: UniversalInputLimits = {
    maxCount: universalPositive(i.maxCount, caps.maxCount, true), maxBytes: universalPositive(i.maxBytes, caps.maxBytes), maxTotalBytes: universalPositive(i.maxTotalBytes, caps.maxTotalBytes),
    maxDimension: universalPositive(i.maxDimension, caps.maxDimension), maxPixels: universalPositive(i.maxPixels, caps.maxPixels), requestMaxBytes: universalPositive(i.requestMaxBytes, caps.requestMaxBytes), mimeTypes: universalMimes(i.mimeTypes),
  }
  const outputLimits: UniversalOutputLimits = { maxBytes: universalPositive(o.maxBytes, caps.maxBytes), maxDimension: universalPositive(o.maxDimension, caps.maxDimension), maxPixels: universalPositive(o.maxPixels, caps.maxPixels), mimeTypes: universalMimes(o.mimeTypes) }
  if ((capabilities.vision || capabilities.imageEditing) && inputLimits.maxCount < 1) throw new UniversalApiError('CONFIG_INVALID')
  let outputSizes: UniversalOutputSize[] | undefined
  if (c.outputSizes !== undefined) {
    if (!Array.isArray(c.outputSizes) || c.outputSizes.length > 256) throw new UniversalApiError('CONFIG_INVALID')
    outputSizes = c.outputSizes.map((s: any) => {
      if (!universalRecord(s) || !universalString(s.resolution, 24) || !universalString(s.aspectRatio, 24) || !universalString(s.value, 40)
        || !/^(?:auto|\d+(?:\.\d+)?:\d+(?:\.\d+)?)$/.test(s.aspectRatio)
        || !/^[a-zA-Z0-9.*_-]+$/.test(s.value)) throw new UniversalApiError('CONFIG_INVALID')
      return { resolution: s.resolution, aspectRatio: s.aspectRatio, value: s.value }
    })
    if (new Set(outputSizes!.map(x => `${x.resolution}|${x.aspectRatio}`)).size !== outputSizes!.length) throw new UniversalApiError('CONFIG_INVALID')
  }
  if ((capabilities.imageGeneration || capabilities.imageEditing) && !outputSizes?.length) throw new UniversalApiError('CONFIG_INVALID')
  return { accessProvider: 'custom', modelId: value.modelId, custom: { version: 1, connectionId: c.connectionId, protocol: c.protocol, baseUrl: normalizeUniversalBaseUrl(c.baseUrl, c.protocol), auth, compatibility, capabilities, inputLimits, outputLimits, ...(outputSizes ? { outputSizes } : {}) } }
}
/** Credential envelopes are request-only; never persist them with task records. */
export function universalCredential(routeValue: unknown, serializedCustomKeys: unknown): string {
  return universalConnectionCredential(normalizeUniversalRoute(routeValue).custom, serializedCustomKeys)
}
export function universalConnectionCredential(connectionValue: unknown, serializedCustomKeys: unknown): string {
  const c = normalizeUniversalConnection(connectionValue)
  let keys: unknown
  try { keys = typeof serializedCustomKeys === 'string' && serializedCustomKeys.length <= 256 * 1024 ? JSON.parse(serializedCustomKeys) : null } catch { throw new UniversalApiError('CREDENTIAL_MISMATCH') }
  const entry = universalRecord(keys) && Object.prototype.hasOwnProperty.call(keys, c.connectionId) ? keys[c.connectionId] : null
  if (!universalRecord(entry) || entry.protocol !== c.protocol || (entry.auth ?? universalDefaultAuth(c.protocol)) !== c.auth
    || !universalString(entry.apiKey, 16384) || /[^\x21-\x7e]/.test(entry.apiKey)) throw new UniversalApiError('CREDENTIAL_MISMATCH')
  try { if (normalizeUniversalBaseUrl(entry.baseUrl, c.protocol) !== c.baseUrl) throw new Error() } catch { throw new UniversalApiError('CREDENTIAL_MISMATCH') }
  return entry.apiKey
}
export function universalReferencePolicy(routeValue: unknown) {
  const c = normalizeUniversalRoute(routeValue).custom
  return { ...c.inputLimits, maxCount: c.capabilities.vision || c.capabilities.imageEditing ? c.inputLimits.maxCount : 0, minDimension: 1, maxAspectRatio: 200, status: 'user-declared' as const, source: 'user', note: '用户明确声明的型号限额，已受平台上限约束；未验证真实模型调用。' }
}
export function universalModelEntry(routeValue: unknown) {
  const route = normalizeUniversalRoute(routeValue), c = route.custom, image = c.capabilities.imageGeneration || c.capabilities.imageEditing
  const roles = [...(c.capabilities.text ? ['main'] : []), ...(c.capabilities.vision ? ['vision'] : []), ...(image ? ['image'] : [])]
  const protocol = c.protocol === 'openai-chat' ? c.compatibility === 'openrouter-image' ? 'openrouter-images' : 'openai-chat-completions' : c.protocol === 'dashscope-multimodal' ? 'bailian-multimodal-generation' : c.protocol
  return { id: route.modelId, label: route.modelId, vendor: '自定义连接', lifecycle: 'stable', releaseKind: '', lifecycleSourceUrl: '', recommended: false, requiresEntitlement: true, entitlement: '请自行核对该连接中的模型权益与计费。',
    inputModalities: c.capabilities.vision || c.capabilities.imageEditing ? ['text', 'image'] : ['text'], outputModalities: [...(c.capabilities.text ? ['text'] : []), ...(image ? ['image'] : [])],
    verified: false, verificationState: 'user-declared', selectable: true, releasedAt: null, expirationDate: null, earliestRetirementDate: null, roles, protocol, roleProtocols: Object.fromEntries(roles.map(role => [role, protocol])), officialSourceUrl: '', availabilityNotes: '配置已校验；能力与限额来自用户声明，尚未验证真实调用。',
    capabilities: { referenceImages: c.capabilities.vision || c.capabilities.imageEditing, maxReferenceImages: c.capabilities.vision || c.capabilities.imageEditing ? c.inputLimits.maxCount : 0, imageGeneration: c.capabilities.imageGeneration, imageEditing: c.capabilities.imageEditing, imageEditMode: c.capabilities.imageEditing ? 'direct-edit' : 'none', resolutions: [...new Set(c.outputSizes?.map(x => x.resolution) || [])], aspectRatios: [...new Set(c.outputSizes?.map(x => x.aspectRatio) || [])], refineResolutions: c.capabilities.imageEditing ? [...new Set(c.outputSizes?.map(x => x.resolution) || [])] : [], refineAspectRatios: c.capabilities.imageEditing ? [...new Set(c.outputSizes?.map(x => x.aspectRatio) || [])] : [], aspectRatiosByResolution: Object.fromEntries([...new Set(c.outputSizes?.map(x => x.resolution) || [])].map(resolution => [resolution, c.outputSizes!.filter(x => x.resolution === resolution).map(x => x.aspectRatio)])), refineAspectRatiosByResolution: c.capabilities.imageEditing ? Object.fromEntries([...new Set(c.outputSizes?.map(x => x.resolution) || [])].map(resolution => [resolution, c.outputSizes!.filter(x => x.resolution === resolution).map(x => x.aspectRatio)])) : {}, outputFormats: ['png'] } }
}
