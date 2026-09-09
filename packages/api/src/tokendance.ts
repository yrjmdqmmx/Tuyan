import { TOKENDANCE_MODELS } from './tokendance-models.js'

export const TOKENDANCE_APP_URL = 'https://www.paperbanana.asia/'
export const TOKENDANCE_ORIGIN = 'https://tokendance.space'
export const TOKENDANCE_ACTIONS = ['tokenDanceStatus', 'tokenDanceAuthorize', 'tokenDanceExchange', 'tokenDanceCancel', 'tokenDanceDisconnect', 'tokenDanceBalance', 'tokenDancePaymentCreate', 'tokenDancePaymentStatus', 'tokenDancePayments', 'tokenDanceResume'] as const
export type TokenDanceRecovery = 'top_up_balance' | 'reauthorize_api_key' | 'api_key_quota' | 'rate_limit' | 'retry_request' | 'review_request'

export class TokenDanceError extends Error {
  constructor(public status: number, message: string, public recoveryAction?: TokenDanceRecovery, public retryAfterSeconds = 0, public uncertain = false) {
    super(message)
    this.name = 'TokenDanceError'
  }
}

export function tokenDanceFailure(status: number, action = '', retryAfter = '') {
  const messages: Record<string, string> = {
    top_up_balance: '观猹 TokenDance 钱包余额不足，请充值后恢复任务。',
    reauthorize_api_key: '观猹 TokenDance 授权已过期、被禁用或失效，请重新授权。',
    api_key_quota: '观猹 TokenDance Key 的额度已用尽，请调整 Key 限额或重新授权；充值不改变 Key 限额。',
    rate_limit: '观猹 TokenDance 请求频率受限，请稍后恢复。',
  }
  const recovery = Object.hasOwn(messages, action) ? action as TokenDanceRecovery : status === 429 ? 'rate_limit' : status === 401 ? 'reauthorize_api_key' : undefined
  const seconds = /^\d+$/.test(retryAfter) ? Number(retryAfter) : Math.max(0, Math.ceil((Date.parse(retryAfter) - Date.now()) / 1000))
  return new TokenDanceError(status, messages[recovery || ''] || `TokenDance 请求失败（HTTP ${status}）。`, recovery, Math.min(86400, Number.isFinite(seconds) ? seconds : 0), status >= 500)
}

export function tokenDanceAmount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1 || value > 100000) throw new TokenDanceError(400, '充值金额必须为 1 至 100000 元的整数。')
  return value
}

export function tokenDanceBalance(value: any) {
  const balance = value?.balance
  for (const key of ['credits', 'credits_used', 'balance']) {
    if (typeof balance?.[key] !== 'number' || !Number.isSafeInteger(balance[key])) throw new TokenDanceError(502, '观猹 TokenDance 余额格式暂不可识别。')
  }
  return { ...Object.fromEntries(['credits', 'credits_used', 'balance'].map(key => [key, balance[key]])), unit: 'microyuan', microyuanPerYuan: 1_000_000, keyLimit: null, keyLimitStatus: 'not_available' }
}

export async function tokenDanceResponse(fetcher: typeof fetch, path: string, key: string, body?: unknown, signal?: AbortSignal): Promise<Response> {
  if (!path.startsWith('/gateway/') && !path.startsWith('/portal/api/v1/')) throw new TokenDanceError(400, '不受支持的观猹 TokenDance 请求。')
  let response: Response
  try {
    response = await fetcher(TOKENDANCE_ORIGIN + path, {
      method: body === undefined ? 'GET' : 'POST', redirect: 'error',
      headers: { ...(key ? { Authorization: `Bearer ${key}` } : {}), 'Content-Type': 'application/json', 'X-App-URL': TOKENDANCE_APP_URL },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(600_000)]) : AbortSignal.timeout(600_000),
    })
  } catch {
    throw new TokenDanceError(502, body === undefined ? '观猹 TokenDance 暂时无法连接。' : '观猹 TokenDance 请求结果不确定，请先核对调用或订单记录，避免重复扣费。', body === undefined ? undefined : 'review_request', 0, body !== undefined)
  }
  if (!response.ok) {
    // Never include the upstream body: providers may echo credentials or prompts.
    await response.body?.cancel().catch(() => {})
    throw tokenDanceFailure(response.status, response.headers.get('TokenDance-Recovery-Action') || '', response.headers.get('Retry-After') || '')
  }
  return response
}

export async function tokenDanceJson(response: Response, maxBytes = 2 * 1024 * 1024): Promise<any> {
  const reader = response.body?.getReader()
  if (!reader) throw new TokenDanceError(502, '观猹 TokenDance 返回空响应。', 'review_request', 0, true)
  let size = 0, text = ''
  const decoder = new TextDecoder()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maxBytes) throw new Error('size')
      text += decoder.decode(value, { stream: true })
    }
    return JSON.parse(text + decoder.decode())
  } catch {
    await reader.cancel().catch(() => {})
    throw new TokenDanceError(502, '观猹 TokenDance 响应未完整接收，请核对调用记录。', 'review_request', 0, true)
  }
}

export function tokenDanceModel(model: string, role: 'main' | 'vision' | 'image') {
  const entry = TOKENDANCE_MODELS.find(m => m.id === model)
  if (!entry?.roles.includes(role)) throw new TokenDanceError(400, `TokenDance 型号 ${model} 不支持当前角色。`)
  return entry
}

export function tokenDanceChatBody(model: string, system: string, user: string, images: { url: string }[] = [], stream = true) {
  tokenDanceModel(model, images.length ? 'vision' : 'main')
  // Three is Tuyan's reference limit, not a claimed upstream maximum.
  if (images.length > 8) throw new TokenDanceError(400, '本次图像分析输入超过图研的 8 张组合上限。')
  for (const image of images) if (!/^https:\/\//.test(image.url) && !/^data:image\/(png|jpeg|webp);base64,/.test(image.url)) throw new TokenDanceError(400, '观猹 TokenDance 视觉输入需要 HTTPS 图片或受支持的图片数据。')
  return { model, messages: [{ role: 'system', content: system }, { role: 'user', content: images.length ? [{ type: 'text', text: user }, ...images.map(image => ({ type: 'image_url', image_url: { url: image.url } }))] : user }], stream }
}

export type TokenDanceCallInfo = { channel: 'tokendance'; requestedModel: string; actualModel: string | null; requestId: string | null; protocol: string; supplier: null; routing: 'selected-model-auto-provider'; usage?: unknown }
export function tokenDanceCallInfo(response: Response, requestedModel: string, actual: any, protocol: string): TokenDanceCallInfo {
  const safeId = (v: unknown) => typeof v === 'string' && /^[A-Za-z0-9_./:-]{1,180}$/.test(v) ? v : null
  return { channel: 'tokendance', requestedModel, actualModel: safeId(actual?.model), requestId: safeId(response.headers.get('x-request-id') || response.headers.get('request-id') || actual?.id), protocol, supplier: null, routing: 'selected-model-auto-provider' }
}

export async function tokenDanceChat(fetcher: typeof fetch, model: string, key: string, system: string, user: string, images: { url: string }[], signal?: AbortSignal) {
  const response = await tokenDanceResponse(fetcher, '/gateway/v1/chat/completions', key, tokenDanceChatBody(model, system, user, images), signal)
  const type = response.headers.get('content-type') || ''
  if (!type.includes('text/event-stream')) {
    const data = await tokenDanceJson(response)
    const content = data?.choices?.[0]?.message?.content
    if (typeof content !== 'string' || !content.trim()) throw new TokenDanceError(502, '模型未返回可用文本，请核对调用记录。', 'review_request', 0, true)
    return { text: content, call: tokenDanceCallInfo(response, model, data, 'openai:chat-completions') }
  }
  const reader = response.body!.getReader(), decoder = new TextDecoder()
  let buffer = '', output = '', bytes = 0, completed = false, actual: any = {}
  try {
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      bytes += chunk.value.byteLength
      if (bytes > 8 * 1024 * 1024) throw new Error('limit')
      buffer += decoder.decode(chunk.value, { stream: true }).replace(/\r/g, '')
      let end: number
      while ((end = buffer.indexOf('\n\n')) >= 0) {
        const event = buffer.slice(0, end); buffer = buffer.slice(end + 2)
        const payload = event.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).join('\n')
        if (!payload) continue
        if (payload === '[DONE]') { completed = true; break }
        const data = JSON.parse(payload)
        if (data.error) throw new Error('upstream stream error')
        if (data.model) actual.model = data.model
        if (data.id) actual.id = data.id
        const delta = data.choices?.[0]?.delta?.content
        if (typeof delta === 'string') output += delta
      }
      if (completed) break
    }
    if (!completed || !output.trim()) throw new Error('incomplete')
  } catch {
    throw new TokenDanceError(502, '模型流式输出中断或为空，请先核对调用记录，避免重复扣费。', 'review_request', 0, true)
  } finally { await reader.cancel().catch(() => {}) }
  return { text: output, call: tokenDanceCallInfo(response, model, actual, 'openai:chat-completions') }
}

export function tokenDanceImageBody(model: string, prompt: string, size: string, images: string[] = []) {
  tokenDanceModel(model, 'image')
  const pro = model === 'seedream-5.0-pro'
  if (images.length > (pro ? 10 : 14)) throw new TokenDanceError(400, 'Seedream 参考图数量超出该型号限制。')
  const presets = pro ? ['1K', '1.5K', '2K'] : ['2K', '3K', '4K']
  if (!presets.includes(size)) {
    if (!/^\d+x\d+$/.test(size)) throw new TokenDanceError(400, 'Seedream 尺寸格式无效。')
    const [w, h] = size.split('x').map(Number), pixels = w * h
    if (w < 1 || h < 1 || Math.max(w / h, h / w) > 16 || pixels < (pro ? 921600 : 3686400) || pixels > (pro ? 4624220 : 16777216)) throw new TokenDanceError(400, 'Seedream 尺寸超出该型号边界。')
  }
  if (!prompt.trim() || prompt.length > 20000) throw new TokenDanceError(400, 'Seedream 提示词为空或过长。')
  return { model, prompt, size, response_format: 'b64_json', output_format: 'png', watermark: false, ...(pro ? {} : { sequential_image_generation: 'disabled', stream: false }), ...(images.length ? { image: images } : {}) }
}
