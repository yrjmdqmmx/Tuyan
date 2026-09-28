/** Versioned, user-declared BYOK contract. No model-name or vendor-name inference. */
export const UNIVERSAL_TEXT_OUTPUT_TOKENS = 4096
export const UNIVERSAL_PROTOCOLS = ['openai-chat', 'openai-responses', 'openai-images', 'anthropic-messages', 'gemini-generate-content', 'gemini-interactions', 'dashscope-multimodal', 'bedrock-converse', 'bedrock-invoke'] as const
export type UniversalProtocol = typeof UNIVERSAL_PROTOCOLS[number]
export type UniversalAuth = 'bearer' | 'x-api-key' | 'x-goog-api-key' | 'api-key' | 'bearer-expiring'
export type UniversalRequestState = 'not_sent' | 'rejected' | 'unknown'
export type UniversalErrorCode = 'CREDENTIAL_EXPIRED' | 'CREDENTIAL_EXPIRY_REQUIRED' | 'CONFIG_INVALID' | 'ENDPOINT_UNSAFE' | 'CREDENTIAL_MISMATCH' | 'CAPABILITY_UNSUPPORTED' | 'INPUT_LIMIT' | 'IMAGE_INVALID' | 'OUTPUT_SIZE_UNSUPPORTED' | 'UPSTREAM_REJECTED' | 'RESULT_UNKNOWN' | 'ASYNC_UNSUPPORTED' | 'RESPONSE_INVALID' | 'RESPONSE_LIMIT' | 'CATALOG_UNSUPPORTED' | 'DNS_RESOLUTION_FAILED' | 'NETWORK_ERROR' | 'REQUEST_TIMEOUT' | 'UPSTREAM_FAILURE' | 'ENDPOINT_NOT_FOUND' | 'MODEL_NOT_FOUND' | 'CATALOG_CONFIG_INVALID' | 'CATALOG_AUTH_FAILED' | 'CATALOG_PERMISSION_DENIED' | 'CATALOG_RATE_LIMITED' | 'CATALOG_TIMEOUT' | 'CATALOG_NETWORK_ERROR' | 'CATALOG_PROVIDER_ERROR' | 'CATALOG_RESPONSE_INVALID' | 'CATALOG_RESPONSE_LIMIT' | 'CATALOG_ENDPOINT_NOT_FOUND'
const universalErrorMessages: Record<UniversalErrorCode, [string, string, string]> = {
  CREDENTIAL_EXPIRED: ['authentication','当前连接令牌已到期或剩余不足 30 秒，尚未发送请求。','请更新当前角色的令牌和到期时间，再主动恢复可继续的原任务；结果未知的调用不会重发。'],
  CREDENTIAL_EXPIRY_REQUIRED: ['authentication','当前连接需要有效的令牌到期时间，尚未发送请求。','请填写服务方给出的实际到期时间；不会把临时令牌当成永久 Key。'],
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
    if (!code.startsWith('CATALOG_') && !['CREDENTIAL_EXPIRED','CREDENTIAL_EXPIRY_REQUIRED'].includes(code) && (status === 401 || status === 403)) { this.category = 'authentication'; this.reason = '渠道拒绝了密钥或当前模型的访问权限。'; this.suggestion = '请更新当前连接密钥，并核对账号中的模型访问权益。' }
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
export interface UniversalLimitLayer { input?: Partial<UniversalInputLimits>; output?: Partial<UniversalOutputLimits> }
export interface UniversalLimitPolicy {
  version: 1; service: UniversalLimitLayer; user: UniversalLimitLayer
}
export interface UniversalCatalogMetadata {
  version: 1
  source: { kind: 'official-api' | 'verified-service'; provider: string; baseUrl: string; protocol: string; auth: string; modelId: string; fetchedAt: string; checkedAt: string; url: string }
  facts: { imageInput?: boolean; textOutput?: boolean; imageOutput?: boolean; thinking?: boolean; inputTokenLimit?: number; contextWindowTokens?: number; outputTokenLimit?: number; supportedParameters?: string[]; generationMethods?: string[]; reasoningEfforts?: string[]; thinkingModes?: string[]; reasoningMandatory?: boolean; reasoningBudget?: boolean }
}
export interface UniversalImageTool {
  provider: 'openai' | 'xai' | 'azure'; model?: string; deployment?: string
  quality?: 'auto' | 'low' | 'medium' | 'high' | 'xhigh' | 'max'; format?: 'png' | 'jpeg' | 'webp'
}
export interface UniversalCustomConfig {
  version: 1; connectionId: string; protocol: UniversalProtocol; baseUrl: string; auth: UniversalAuth
  compatibility?: 'standard' | 'openrouter-image' | 'ark-images'
  capabilities: { text: boolean; vision: boolean; imageGeneration: boolean; imageEditing: boolean }
  imageTool?: UniversalImageTool
  azure?: { deploymentModel: string }
  bedrock?: { strength?: number }
  limitPolicy?: UniversalLimitPolicy
  inputLimits: UniversalInputLimits; outputLimits: UniversalOutputLimits; outputSizes?: UniversalOutputSize[]
}
export interface UniversalRoute { accessProvider: 'custom'; modelId: string; custom: UniversalCustomConfig }
export const UNIVERSAL_PLATFORM_LIMITS = { maxCount: 8, maxBytes: 20 * 1024 * 1024, maxTotalBytes: 80 * 1024 * 1024, maxDimension: 16384, maxPixels: 32000000, requestMaxBytes: 120 * 1024 * 1024 }
const universalMimeTypes = ['image/png', 'image/jpeg', 'image/webp']
function universalRecord(value: unknown): value is Record<string, any> { return value !== null && typeof value === 'object' && !Array.isArray(value) }
function universalString(value: unknown, max = 256): value is string { return typeof value === 'string' && value.length > 0 && value.length <= max && value.trim() === value && !/[\x00-\x1f\x7f]/.test(value) }
export function universalDefaultAuth(protocol: UniversalProtocol): UniversalAuth { return protocol.startsWith('bedrock-') ? 'bearer-expiring' : protocol === 'anthropic-messages' ? 'x-api-key' : protocol.startsWith('gemini-') ? 'x-goog-api-key' : 'bearer' }
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
  const prefix = protocol.startsWith('bedrock-') ? '' : protocol.startsWith('gemini-') ? '/v1beta' : protocol === 'dashscope-multimodal' ? '/api/v1' : '/v1'
  return url.origin + (path || prefix)
}
/** A directory belongs to a connection, independent of any inference model or capabilities. */
export function normalizeUniversalConnection(value: unknown): UniversalConnection {
  if (!universalRecord(value) || value.version !== 1 || !universalString(value.connectionId, 80) || !/^[a-zA-Z0-9_-]+$/.test(value.connectionId) || !UNIVERSAL_PROTOCOLS.includes(value.protocol)) throw new UniversalApiError('CATALOG_CONFIG_INVALID')
  const auth = value.auth === undefined ? universalDefaultAuth(value.protocol) : value.auth
  const catalogFormat = value.catalogFormat === undefined ? 'auto' : value.catalogFormat
  if (!['bearer', 'x-api-key', 'x-goog-api-key', 'api-key', 'bearer-expiring'].includes(auth) || !['auto', 'openai', 'anthropic', 'gemini', 'none'].includes(catalogFormat)) throw new UniversalApiError('CATALOG_CONFIG_INVALID')
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
  // Normalize the allowlisted error contract across Core/transport module boundaries.
  // Never propagate the raw provider message or arbitrary error codes.
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
/** Missing service facts remain unknown. v1 values migrate to user ceilings, never to vendor evidence. */
export function normalizeUniversalLimitPolicy(value: unknown): UniversalLimitPolicy {
  if (!universalRecord(value) || value.version !== 1) throw new UniversalApiError('CONFIG_INVALID')
  const layer = (raw: unknown): UniversalLimitLayer => {
    if (!universalRecord(raw)) throw new UniversalApiError('CONFIG_INVALID')
    const result: UniversalLimitLayer = {}
    for (const scope of ['input', 'output'] as const) {
      if (raw[scope] === undefined) continue
      if (!universalRecord(raw[scope])) throw new UniversalApiError('CONFIG_INVALID')
      const allowed = scope === 'input' ? ['maxCount','maxBytes','maxTotalBytes','maxDimension','maxPixels','requestMaxBytes','mimeTypes'] : ['maxBytes','maxDimension','maxPixels','mimeTypes']
      const fields: any = {}
      for (const key of Object.keys(raw[scope])) {
        if (!allowed.includes(key)) throw new UniversalApiError('CONFIG_INVALID')
        const v = raw[scope][key]
        if (v === null || v === undefined) continue
        if (key === 'mimeTypes') fields[key] = universalMimes(v)
        else { if (!Number.isSafeInteger(v) || v < (key === 'maxCount' ? 0 : 1) || v > Number.MAX_SAFE_INTEGER) throw new UniversalApiError('CONFIG_INVALID'); fields[key] = v }
      }
      result[scope] = fields
    }
    return result
  }
  return {version:1, service:layer(value.service), user:layer(value.user)}
}
export function migrateUniversalLimitPolicy(c: Pick<UniversalCustomConfig, 'inputLimits' | 'outputLimits' | 'limitPolicy'>): UniversalLimitPolicy {
  return c.limitPolicy ? normalizeUniversalLimitPolicy(c.limitPolicy) : normalizeUniversalLimitPolicy({version:1,service:{},user:{input:c.inputLimits,output:c.outputLimits}})
}
export function effectiveUniversalLimits(policy: UniversalLimitPolicy) {
  const p = normalizeUniversalLimitPolicy(policy)
  const effective = (scope: 'input' | 'output') => {
    const hard: Record<string, any> = scope === 'input' ? {...UNIVERSAL_PLATFORM_LIMITS,mimeTypes:universalMimeTypes} : {maxBytes:UNIVERSAL_PLATFORM_LIMITS.maxBytes,maxDimension:UNIVERSAL_PLATFORM_LIMITS.maxDimension,maxPixels:UNIVERSAL_PLATFORM_LIMITS.maxPixels,mimeTypes:universalMimeTypes}
    for (const [key, cap] of Object.entries(hard)) {
      const a = (p.service[scope] as any)?.[key], b = (p.user[scope] as any)?.[key]
      hard[key] = key === 'mimeTypes' ? cap.filter((x: string) => (!a || a.includes(x)) && (!b || b.includes(x))) : Math.min(cap, a ?? cap, b ?? cap)
      if (key === 'mimeTypes' && !hard[key].length) throw new UniversalApiError('CONFIG_INVALID')
    }
    return hard
  }
  return {inputLimits:effective('input') as UniversalInputLimits, outputLimits:effective('output') as UniversalOutputLimits}
}
/** Only known endpoint/auth/protocol combinations can contribute catalog metadata. */
export function universalMetadataSource(connection: UniversalConnection) {
  const c = normalizeUniversalConnection(connection)
  const matches: [string,string,string,string,string[]][] = [
    ['anthropic','https://api.anthropic.com/v1','x-api-key','https://platform.claude.com/docs/en/api/models/list',['anthropic-messages']],
    ['gemini','https://generativelanguage.googleapis.com/v1beta','x-goog-api-key','https://ai.google.dev/api/models',['gemini-generate-content','gemini-interactions']],
    ['openrouter','https://openrouter.ai/api/v1','bearer','https://openrouter.ai/docs/api/api-reference/models/list-all-models-and-their-properties',['openai-chat']],
  ]
  const match = matches.find(([,base,auth,,protocols]) => c.baseUrl === base && c.auth === auth && protocols.includes(c.protocol))
  return match ? {provider:match[0],kind:match[0] === 'openrouter' ? 'verified-service' as const : 'official-api' as const,url:match[3]} : undefined
}
export function parseUniversalCatalogMetadata(row: any, connection: UniversalConnection, modelId: string, fetchedAt: string): {metadata?: UniversalCatalogMetadata; invalid: boolean} {
  connection = normalizeUniversalConnection(connection)
  const source = universalMetadataSource(connection)
  if (!source) return {invalid:false}
  const facts: UniversalCatalogMetadata['facts'] = {}; let invalid = false
  const boolean = (key: 'imageInput'|'textOutput'|'imageOutput'|'thinking'|'reasoningMandatory'|'reasoningBudget', value: unknown) => {if (value == null) return; if (typeof value === 'boolean') facts[key] = value; else invalid = true}
  const number = (key: 'inputTokenLimit'|'contextWindowTokens'|'outputTokenLimit', value: unknown) => {if (value == null) return; if (Number.isSafeInteger(value) && (value as number) > 0 && (value as number) <= 100000000) facts[key] = value as number; else invalid = true}
  const strings = (value: unknown): string[] | undefined => {if (value == null) return; if (Array.isArray(value) && value.length <= 64 && value.every(x => universalString(x,80))) return [...new Set(value)]; invalid = true}
  for (const key of (source.provider === 'anthropic' ? ['capabilities'] : source.provider === 'openrouter' ? ['architecture','top_provider','reasoning'] : [])) if (row[key] != null && !universalRecord(row[key])) invalid = true
  if (source.provider === 'anthropic') {
    boolean('imageInput',row.capabilities?.image_input?.supported); boolean('thinking',row.capabilities?.thinking?.supported)
    if (universalRecord(row.capabilities?.thinking?.types)) { const modes=['adaptive','enabled'].filter(k=>row.capabilities.thinking.types[k]?.supported === true); if(modes.length)facts.thinkingModes=modes }
    if (universalRecord(row.capabilities?.effort)) { const efforts=['low','medium','high','xhigh','max'].filter(k=>row.capabilities.effort[k]?.supported === true); if(efforts.length)facts.reasoningEfforts=efforts }
    number('inputTokenLimit',row.max_input_tokens); number('outputTokenLimit',row.max_tokens)
  } else if (source.provider === 'gemini') {
    number('inputTokenLimit',row.inputTokenLimit); number('outputTokenLimit',row.outputTokenLimit); boolean('thinking',row.thinking)
    const methods = strings(row.supportedGenerationMethods); if (methods) facts.generationMethods = methods.filter(x => ['generateContent','countTokens','predict','embedContent','batchEmbedContents'].includes(x))
  } else {
    const input = strings(row.architecture?.input_modalities), output = strings(row.architecture?.output_modalities)
    if (input) facts.imageInput = input.includes('image')
    if (output) {facts.textOutput = output.includes('text'); facts.imageOutput = output.includes('image')}
    number('contextWindowTokens',row.context_length); number('outputTokenLimit',row.top_provider?.max_completion_tokens)
    const efforts = strings(row.reasoning?.supported_efforts); if(efforts)facts.reasoningEfforts=efforts.filter(x=>['none','minimal','low','medium','high','xhigh','max'].includes(x))
    boolean('reasoningMandatory',row.reasoning?.mandatory); boolean('reasoningBudget',row.reasoning?.supports_max_tokens)
    const params = strings(row.supported_parameters); if (params) facts.supportedParameters = params.filter(x=>['reasoning','reasoning_effort','max_tokens','max_completion_tokens'].includes(x))
  }
  return {invalid, ...(Object.keys(facts).length ? {metadata:{version:1 as const,source:{...source,baseUrl:connection.baseUrl,protocol:connection.protocol,auth:connection.auth,modelId,fetchedAt,checkedAt:'2026-09-27'},facts}} : {})}
}
export function normalizeUniversalRoute(value: unknown): UniversalRoute {
  if (!universalRecord(value) || value.accessProvider !== 'custom' || !universalString(value.modelId) || /(?:^|\/)\.\.?(?:\/|$)|\\/.test(value.modelId) || !universalRecord(value.custom)) throw new UniversalApiError('CONFIG_INVALID')
  const c = value.custom
  if (c.version !== 1 || !universalString(c.connectionId, 80) || !/^[a-zA-Z0-9_-]+$/.test(c.connectionId) || !UNIVERSAL_PROTOCOLS.includes(c.protocol)) throw new UniversalApiError('CONFIG_INVALID')
  const auth = c.auth === undefined ? universalDefaultAuth(c.protocol) : c.auth
  if (!['bearer', 'x-api-key', 'x-goog-api-key', 'api-key', 'bearer-expiring'].includes(auth)) throw new UniversalApiError('CONFIG_INVALID')
  const compatibility = c.compatibility === undefined ? 'standard' : c.compatibility
  if (!['standard', 'openrouter-image', 'ark-images'].includes(compatibility)
    || compatibility === 'openrouter-image' && c.protocol !== 'openai-chat'
    || compatibility === 'ark-images' && c.protocol !== 'openai-images') throw new UniversalApiError('CONFIG_INVALID')
  if (!universalRecord(c.capabilities) || ['text', 'vision', 'imageGeneration', 'imageEditing'].some(k => typeof c.capabilities[k] !== 'boolean')) throw new UniversalApiError('CONFIG_INVALID')
  const capabilities = { text: c.capabilities.text, vision: c.capabilities.vision, imageGeneration: c.capabilities.imageGeneration, imageEditing: c.capabilities.imageEditing }
  if (!Object.values(capabilities).some(Boolean) || capabilities.vision && !capabilities.text) throw new UniversalApiError('CONFIG_INVALID')
  const textOnly = c.protocol === 'anthropic-messages' || c.protocol === 'bedrock-converse' || c.protocol === 'openai-responses' && !c.imageTool || c.protocol === 'openai-chat' && compatibility !== 'openrouter-image'
  if (textOnly && (capabilities.imageGeneration || capabilities.imageEditing) || ['openai-images','bedrock-invoke'].includes(c.protocol) && (capabilities.text || capabilities.vision)) throw new UniversalApiError('CAPABILITY_UNSUPPORTED')
  if (!universalRecord(c.inputLimits) || !universalRecord(c.outputLimits)) throw new UniversalApiError('CONFIG_INVALID')
  const limitPolicy = c.limitPolicy === undefined ? undefined : normalizeUniversalLimitPolicy(c.limitPolicy)
  const effective = limitPolicy ? effectiveUniversalLimits(limitPolicy) : c
  const i = effective.inputLimits, o = effective.outputLimits, caps = UNIVERSAL_PLATFORM_LIMITS
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
  const extensions = normalizeUniversalExtensions(c, value.modelId)
  if(c.protocol==='bedrock-converse') {
    inputLimits.maxBytes=Math.min(inputLimits.maxBytes,3750000);inputLimits.maxDimension=Math.min(inputLimits.maxDimension,8000)
  }
  if(c.protocol.startsWith('bedrock-'))inputLimits.requestMaxBytes=Math.min(inputLimits.requestMaxBytes,25000000)
  if(extensions.imageTool?.provider==='xai'||c.protocol==='bedrock-invoke')inputLimits.maxCount=Math.min(inputLimits.maxCount,1)
  return { accessProvider: 'custom', modelId: value.modelId, custom: { version: 1, connectionId: c.connectionId, protocol: c.protocol, baseUrl: normalizeUniversalBaseUrl(c.baseUrl, c.protocol), auth, compatibility, ...extensions, capabilities, inputLimits, outputLimits, ...(limitPolicy ? {limitPolicy} : {}), ...(outputSizes ? { outputSizes } : {}) } }
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
  if (c.auth === 'bearer-expiring') {
    if(typeof entry.expiresAt !== 'string' || !Number.isFinite(Date.parse(entry.expiresAt)))throw new UniversalApiError('CREDENTIAL_EXPIRY_REQUIRED','not_sent',401)
    if(Date.parse(entry.expiresAt)<=Date.now()+30000)throw new UniversalApiError('CREDENTIAL_EXPIRED','not_sent',401)
  }
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
    capabilities: { refineControls: universalRefineControls(route), referenceImages: c.capabilities.vision || c.capabilities.imageEditing, maxReferenceImages: c.capabilities.vision || c.capabilities.imageEditing ? c.inputLimits.maxCount : 0, imageGeneration: c.capabilities.imageGeneration, imageEditing: c.capabilities.imageEditing, imageEditMode: c.capabilities.imageEditing ? 'direct-edit' : 'none', resolutions: [...new Set(c.outputSizes?.map(x => x.resolution) || [])], aspectRatios: [...new Set(c.outputSizes?.map(x => x.aspectRatio) || [])], refineResolutions: c.capabilities.imageEditing ? [...new Set(c.outputSizes?.map(x => x.resolution) || [])] : [], refineAspectRatios: c.capabilities.imageEditing ? [...new Set(c.outputSizes?.map(x => x.aspectRatio) || [])] : [], aspectRatiosByResolution: Object.fromEntries([...new Set(c.outputSizes?.map(x => x.resolution) || [])].map(resolution => [resolution, c.outputSizes!.filter(x => x.resolution === resolution).map(x => x.aspectRatio)])), refineAspectRatiosByResolution: c.capabilities.imageEditing ? Object.fromEntries([...new Set(c.outputSizes?.map(x => x.resolution) || [])].map(resolution => [resolution, c.outputSizes!.filter(x => x.resolution === resolution).map(x => x.aspectRatio)])) : {}, outputFormats: ['png'] } }
}

/** Audited extensions v1 (2026-09-28). Exact origin + protocol + model, never catalog-name inference. */
export const UNIVERSAL_EXTENSIONS_VERSION = 1
export const RESPONSES_IMAGE_MODELS = ['gpt-image-1', 'gpt-image-1-mini', 'gpt-image-1.5', 'gpt-image-2', 'gpt-image-2.5-sunburst', 'gpt-image-2.5-flare']
export const RESPONSES_CALL_MODELS = ['gpt-4.1','gpt-4.1-mini','gpt-4.1-nano','gpt-4o','gpt-4o-mini','gpt-5','gpt-5-nano','gpt-5.2','gpt-5.4-mini','gpt-5.4-nano','gpt-5.5','o3']
// Independently audited against Azure Responses supported-models + reasoning docs on 2026-09-28.
// Do not inherit later additions to the OpenAI direct allowlist.
export const AZURE_CALL_MODELS = ['gpt-4.1','gpt-4.1-mini','gpt-4.1-nano','gpt-4o','gpt-4o-mini','gpt-5','gpt-5-nano','gpt-5.2','gpt-5.4-mini','gpt-5.4-nano','gpt-5.5','o3']
export const BEDROCK_TEXT_MODEL = 'us.anthropic.claude-sonnet-4-5-20250929-v1:0'
export const BEDROCK_IMAGE_MODELS = ['stability.stable-image-core-v1:1','stability.sd3-5-large-v1:0']
export function isAzureV1(base: string) { return /^https:\/\/[a-z0-9][a-z0-9-]{1,62}\.(?:openai\.azure\.com|services\.ai\.azure\.com)\/openai\/v1$/.test(base) }
export function universalExtensionIdentity(c: UniversalCustomConfig): string | undefined {
  return c.imageTool || c.azure || c.bedrock ? JSON.stringify({imageTool:c.imageTool,azure:c.azure,bedrock:c.bedrock}) : undefined
}
export function normalizeUniversalExtensions(c: any, modelId: string): Pick<UniversalCustomConfig,'imageTool'|'azure'|'bedrock'> {
  const base = normalizeUniversalBaseUrl(c.baseUrl,c.protocol), out: Pick<UniversalCustomConfig,'imageTool'|'azure'|'bedrock'> = {}
  const invalid = (): never => {throw new UniversalApiError('CAPABILITY_UNSUPPORTED')}
  if (c.azure !== undefined) {
    if (base.includes('your-resource.') || !isAzureV1(base) || !['openai-chat','openai-responses','openai-images'].includes(c.protocol) || !['api-key','bearer-expiring'].includes(c.auth) || !universalRecord(c.azure) || Object.keys(c.azure).some(k=>k!=='deploymentModel') || !(c.protocol==='openai-images'?['gpt-image-1','gpt-image-1-mini','gpt-image-1.5']:AZURE_CALL_MODELS).includes(c.azure.deploymentModel) || !/^[a-zA-Z0-9_.-]{1,128}$/.test(modelId)) invalid()
    out.azure = {deploymentModel:c.azure.deploymentModel}
  }
  if (c.imageTool !== undefined) {
    const t = c.imageTool
    if (c.protocol !== 'openai-responses' || c.compatibility && c.compatibility !== 'standard' || !universalRecord(t) || Object.keys(t).some(k=>!['provider','model','deployment','quality','format'].includes(k))) invalid()
    if (t.provider === 'openai') {
      if (base !== 'https://api.openai.com/v1' || c.auth !== 'bearer' || !RESPONSES_CALL_MODELS.includes(modelId) || !RESPONSES_IMAGE_MODELS.includes(t.model) || t.deployment !== undefined) invalid()
    } else if (t.provider === 'xai') {
      if (base !== 'https://api.x.ai/v1' || c.auth !== 'bearer' || modelId !== 'grok-4.7' || ['model','deployment','quality','format'].some(k=>t[k]!==undefined)) invalid()
    } else if (t.provider === 'azure') {
      if (!out.azure || !['gpt-image-1','gpt-image-1-mini','gpt-image-1.5'].includes(t.model) || !universalString(t.deployment,128) || !/^[a-zA-Z0-9_.-]+$/.test(t.deployment)) invalid()
    } else invalid()
    if (t.quality !== undefined && !(['gpt-image-2.5-sunburst','gpt-image-2.5-flare'].includes(t.model) ? ['auto','low','medium','high','xhigh','max'] : ['auto','low','medium','high']).includes(t.quality)) invalid()
    if (t.format !== undefined && !['png','jpeg','webp'].includes(t.format)) invalid()
    out.imageTool = {provider:t.provider,...(t.model ? {model:t.model}:{}),...(t.deployment ? {deployment:t.deployment}:{}),...(t.quality ? {quality:t.quality}:{}),...(t.format ? {format:t.format}:{})}
  }
  if (c.protocol.startsWith('bedrock-')) {
    const region = /^https:\/\/bedrock-runtime\.(us-east-1|us-east-2|us-west-2)\.amazonaws\.com$/.exec(base)?.[1]
    if (!region || c.auth !== 'bearer-expiring' || c.compatibility && c.compatibility !== 'standard' || c.azure || c.imageTool) invalid()
    if (c.protocol === 'bedrock-converse' && (modelId !== BEDROCK_TEXT_MODEL || c.bedrock !== undefined)) invalid()
    if (c.protocol === 'bedrock-invoke') {
      if (region !== 'us-west-2' || !BEDROCK_IMAGE_MODELS.includes(modelId)) invalid()
      if (c.bedrock !== undefined && (!universalRecord(c.bedrock) || Object.keys(c.bedrock).some(k=>k!=='strength') || c.bedrock.strength !== undefined && (modelId !== 'stability.sd3-5-large-v1:0' || typeof c.bedrock.strength !== 'number' || !Number.isFinite(c.bedrock.strength) || c.bedrock.strength < 0 || c.bedrock.strength > 1))) invalid()
      if(c.bedrock) out.bedrock = c.bedrock.strength === undefined ? {} : {strength:c.bedrock.strength}
      if (c.capabilities?.imageEditing && modelId !== 'stability.sd3-5-large-v1:0') invalid()
    }
  } else if (c.bedrock !== undefined) invalid()
  if (c.outputSizes && (out.imageTool || out.azure && c.protocol==='openai-images' || c.protocol === 'bedrock-invoke')) {
    const allowed = out.imageTool?.provider === 'xai' || c.protocol === 'bedrock-invoke' ? ['auto'] : ['auto','1024x1024','1536x1024','1024x1536']
    if (c.outputSizes.some((x:any)=>!allowed.includes(x.value) || allowed.length===1 && (x.resolution!=='auto'||x.aspectRatio!=='auto'))) invalid()
  }
  return out
}
/** Conservative local ceilings are not all claimed to be vendor limits. */
export function universalExtensionDeclaration(c: UniversalCustomConfig, modelId: string) {
  const ext = normalizeUniversalExtensions({...c,outputSizes:undefined},modelId)
  if (!ext.imageTool && !ext.azure && !c.protocol.startsWith('bedrock-')) return null
  const image = Boolean(ext.imageTool || ext.azure && c.protocol==='openai-images' || c.protocol==='bedrock-invoke')
  const editing = Boolean(ext.imageTool || ext.azure && c.protocol==='openai-images' || modelId==='stability.sd3-5-large-v1:0')
  const maxCount = ext.imageTool?.provider==='xai'||c.protocol==='bedrock-invoke' ? 1 : 8
  const maxBytes = c.protocol==='bedrock-converse' ? 3750000 : 5*1024*1024
  const outputSizes = image ? ((ext.imageTool && ext.imageTool.provider!=='xai' || ext.azure && c.protocol==='openai-images') ? [
    {resolution:'auto',aspectRatio:'auto',value:'auto'}, {resolution:'1K',aspectRatio:'1:1',value:'1024x1024'}, {resolution:'1K',aspectRatio:'3:2',value:'1536x1024'}, {resolution:'1K',aspectRatio:'2:3',value:'1024x1536'},
  ] : [{resolution:'auto',aspectRatio:'auto',value:'auto'}]) : []
  return {...c,...ext,capabilities:{text:!image,vision:!image,imageGeneration:image,imageEditing:editing},inputLimits:{...c.inputLimits,maxCount:editing||!image?Math.min(c.inputLimits.maxCount,maxCount):0,maxBytes:Math.min(c.inputLimits.maxBytes,maxBytes),maxTotalBytes:Math.min(c.inputLimits.maxTotalBytes,20*1024*1024),maxDimension:Math.min(c.inputLimits.maxDimension,c.protocol==='bedrock-converse'?8000:4096),requestMaxBytes:Math.min(c.inputLimits.requestMaxBytes,c.protocol.startsWith('bedrock-')?25000000:120*1024*1024)},outputSizes}
}

/** Existing refine-input contract; source is image 1, references follow in their supplied order. */
export function universalRefineControls(routeValue: unknown) {
  const route=normalizeUniversalRoute(routeValue),c=route.custom
  if((!c.imageTool && !(c.azure&&c.protocol==='openai-images'))||!c.capabilities.imageEditing)return null
  return {version:1 as const,sourceCounts:true as const,maxImages:Math.min(c.inputLimits.maxCount,c.imageTool?.provider==='xai'?1:8),mask:false,maskWithReferences:false,structured:null,checkedAt:'2026-09-28',source:c.imageTool?.provider==='openai'?'https://developers.openai.com/api/docs/guides/tools-image-generation':c.imageTool?.provider==='xai'?'https://docs.x.ai/developers/tools/image-generation':'https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/responses'}
}
