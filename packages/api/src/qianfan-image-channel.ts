import type { ImageChannelCheckpoint, ImageChannelInput, ImageChannelTransport } from './image-channel-adapters.js'

const BASE = 'https://qianfan.baidubce.com/v2'
const PRICE_SOURCE = 'https://cloud.baidu.com/doc/qianfan/s/wmh4sv6ya'
const MUSE_SIZES = new Set(['1024x1024', '1280x720', '720x1280', '1152x864', '864x1152', '1328x1328', '1664x928', '928x1664', '1472x1104', '1104x1472'])
const CONTRACTS = {
  'musesteamer-air-image': { endpoint: '/musesteamer/images/generations', maxPrompt: 1000, amount: 0.05, scope: '1024x1024' },
  'qwen-image': { endpoint: '/images/generations', maxPrompt: 800, amount: 0.25, scope: '1024x1024' },
  'qwen-image-edit': { endpoint: '/images/edits', maxPrompt: 800, amount: 0.3, scope: 'per image' },
} as const
type QianfanImageModel = keyof typeof CONTRACTS

function invalid(message: string): never {
  throw Object.assign(new Error(message), { localInputFailure: true, requestState: 'not_sent' })
}
function unknownResult(): Error {
  return Object.assign(new Error('千帆同步图片请求结果未知；没有可核验的查询接口，不会重新提交。请核对原渠道记录。'), {
    name: 'ImageChannelError', terminal: true, uncertain: true, requestState: 'unknown', recoveryAction: 'stop',
  })
}
function terminal(message: string): Error {
  return Object.assign(new Error(message), { name: 'ImageChannelError', terminal: true, uncertain: false, requestState: 'rejected', recoveryAction: 'stop' })
}
function isModel(model: string): model is QianfanImageModel {
  return Object.prototype.hasOwnProperty.call(CONTRACTS, model)
}

function resolvedSize(input: ImageChannelInput): string {
  const supplied = input.size || {}
  let width: number | undefined, height: number | undefined
  if (supplied.size !== undefined) {
    if (typeof supplied.size !== 'string' || !/^[1-9]\d*x[1-9]\d*$/.test(supplied.size)) invalid('千帆图片尺寸须为已解析的宽x高。')
    ;[width, height] = supplied.size.split('x').map(Number)
  }
  if (supplied.width !== undefined || supplied.height !== undefined) {
    if (!Number.isSafeInteger(supplied.width) || !Number.isSafeInteger(supplied.height) || supplied.width! <= 0 || supplied.height! <= 0) invalid('千帆图片尺寸须同时提供整数宽高。')
    if (width !== undefined && (width !== supplied.width || height !== supplied.height)) invalid('千帆图片尺寸字段不一致。')
    width = supplied.width; height = supplied.height
  }
  if (width === undefined) {
    if (input.aspectRatio !== 'auto' || input.resolution !== 'auto') invalid('千帆所选比例或清晰度尚未解析为图片尺寸。')
    width = height = 1024
  }
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height)) invalid('千帆图片尺寸无效。')
  const size = `${width}x${height}`
  if (input.model === 'musesteamer-air-image') {
    if (!MUSE_SIZES.has(size)) invalid('MuseSteamer 不支持所选尺寸；未接受服务端自动回退尺寸。')
  } else if (width! < 512 || height! < 512 || width! > 2048 || height! > 2048) invalid('千帆 Qwen 输出图片宽高须分别在 512–2048 像素之间。')
  return size
}

/** Core freezes uploads as lossless PNG before this adapter. Do not infer dimensions from user metadata. */
function sourceDataUrl(source: NonNullable<ImageChannelInput['source']>): string {
  if (!source || typeof source !== 'object' || source.mimeType !== 'image/png' || typeof source.base64 !== 'string' || source.base64.length > 4 * Math.ceil(10 * 1024 * 1024 / 3)) invalid('千帆精修需要小于 10 MB 的规范化 PNG 原图。')
  const bytes = Buffer.from(source.base64, 'base64')
  if (bytes.toString('base64') !== source.base64 || bytes.length >= 10 * 1024 * 1024 || bytes.length < 33 || !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) || bytes.readUInt32BE(8) !== 13 || bytes.toString('ascii', 12, 16) !== 'IHDR') invalid('千帆精修原图未符合冻结 PNG 契约。')
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20)
  if (Math.min(width, height) < 128 || Math.max(width, height) / Math.min(width, height) > 4) invalid('千帆精修原图短边须至少 128 像素，长短边比例不超过 4。')
  const url = `data:image/png;base64,${source.base64}`
  if (source.dataUrl !== url) invalid('千帆精修原图字节与 Data URL 不一致。')
  return url
}

/** Ordinary mainland API only. Coding/Token Plan and internal Qianfan-Image are separate products. */
export function buildQianfanImageRequest(input: ImageChannelInput): { endpoint: string; body: Record<string, unknown> } {
  if (input.provider !== 'qianfan' || !isModel(input.model)) invalid('千帆图片型号尚未核验，未发起请求。')
  if (input.region && input.region !== 'cn') invalid('千帆普通图片接口不能使用国际站账号或端点。')
  const contract = CONTRACTS[input.model]
  if (typeof input.prompt !== 'string' || !input.prompt.trim() || [...input.prompt].length > contract.maxPrompt) invalid(`千帆当前型号提示词须为 1–${contract.maxPrompt} 字符。`)
  const editing = input.model === 'qwen-image-edit'
  if (!editing && (input.source || input.edit)) invalid('千帆当前生成型号不接收原图或精修参数。')
  if (editing && !input.source) invalid('千帆 Qwen 图片编辑必须提供原图。')
  if (input.edit) {
    const values = input.edit.inputs
    if (!values || values.version !== 1 || Object.keys(values).some(key => !['version', 'references', 'mask', 'structured'].includes(key))) invalid('千帆精修输入契约无效。')
    if (input.edit.mask || values.mask || values.structured) invalid('千帆 Qwen 图片编辑不支持遮罩或原生结构化编辑。')
    if ((input.edit.references !== undefined && !Array.isArray(input.edit.references)) || (values.references !== undefined && !Array.isArray(values.references))) invalid('千帆辅助参考图必须为列表。')
    if ((input.edit.references?.length || 0) !== (values.references?.length || 0)) invalid('千帆参考图传输数量与输入不一致。')
  }
  const size = resolvedSize(input)
  const body: Record<string, unknown> = { model: input.model, prompt: input.prompt, size, prompt_extend: false }
  if (input.model === 'musesteamer-air-image') body.response_format = 'url'
  else { body.n = 1; body.watermark = false }
  if (editing) {
    const images = [input.source!, ...(input.edit?.references || [])]
    if (images.length > 3) invalid('千帆 Qwen 图片编辑最多接收 3 张图片，包含原图。')
    const urls = images.map(sourceDataUrl)
    body.image = urls.length === 1 ? urls[0] : urls
  }
  return { endpoint: BASE + contract.endpoint, body }
}

function resultUrl(value: unknown): string {
  if (typeof value !== 'string' || !value) throw unknownResult()
  let url: URL
  try { url = new URL(value) } catch { throw unknownResult() }
  // Official examples use HTTP BOS signed URLs. Changing only the scheme preserves the signature.
  if (url.protocol === 'http:' && /^[a-z0-9.-]+\.bcebos\.com$/.test(url.hostname) && !url.port) url.protocol = 'https:'
  if (url.protocol !== 'https:' || url.username || url.password || url.port) throw unknownResult()
  return url.href
}

function usageEvidence(value: unknown): Record<string, number> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const clean: Record<string, number> = {}
  for (const field of ['prompt_tokens', 'completion_tokens', 'total_tokens', 'input_tokens', 'output_tokens', 'image_count', 'images']) {
    const amount = (value as Record<string, unknown>)[field]
    if (typeof amount === 'number' && Number.isFinite(amount) && amount >= 0) clean[field] = amount
  }
  return Object.keys(clean).length ? clean : null
}

function evidence(input: ImageChannelInput, metadata: any = {}) {
  const contract = isModel(input.model) ? CONTRACTS[input.model] : null
  return {
    provider: 'qianfan', model: input.model,
    requestId: typeof metadata.requestId === 'string' && /^[\w-]{1,256}$/.test(metadata.requestId) ? metadata.requestId : null,
    requestIdType: 'diagnostic-only', usage: usageEvidence(metadata.usage),
    publicPrice: { source: PRICE_SOURCE, checkedAt: '2026-09-22', amount: contract?.amount ?? null, currency: 'CNY', unit: 'image', scope: contract?.scope ?? null, billingVerified: false },
    estimatedCost: null, reportedCost: null, invoiceCost: null,
  }
}

/** A synchronous request is sent once. Diagnostic IDs do not imply a resumable provider task. */
export async function callQianfanImageChannel(input: ImageChannelInput, io: ImageChannelTransport): Promise<string> {
  if (!io.pending || !io.checkpoint) invalid('当前后端缺少持久任务恢复能力，未发起千帆图片请求。')
  const previous = await io.pending()
  if (previous && (previous.provider !== input.provider || previous.model !== input.model)) throw terminal('原千帆图片记录与所选渠道或型号不一致，不会重新提交。')
  if (previous?.failed) throw terminal('原千帆图片请求已被拒绝或失败，不会重新提交。')
  const download = async (value: unknown, metadata?: any): Promise<string> => {
    const url = resultUrl(value)
    try {
      await io.record?.(evidence(input, metadata))
      return await io.download(url) // Asset download never receives the API key or authorization headers.
    } catch {
      throw Object.assign(new Error('已保存千帆图片结果，可恢复原链接下载；不会重新生成。'), {
        name: 'ImageChannelError', recoveryAction: 'resume', pollOnly: true, uncertain: false, requestState: 'unknown',
      })
    }
  }
  // Recovery precedes source, key and prompt validation: these are not needed to download an existing result.
  if (previous?.result || previous?.resultUrl) return download(previous.result?.url ?? previous.resultUrl, previous.result?.metadata)
  if (previous) throw unknownResult()
  const prepared = buildQianfanImageRequest(input)
  if (typeof input.apiKey !== 'string' || !input.apiKey.trim() || /[\r\n]/.test(input.apiKey)) invalid('千帆普通 API Key 无效。')
  const checkpoint: ImageChannelCheckpoint = { provider: input.provider, model: input.model, state: { phase: 'submitting', protocol: 'synchronous', submittedAt: io.now() } }
  await io.checkpoint(checkpoint) // Must finish durably BEFORE the potentially billed request.
  let data: any
  try {
    const response = await io.request(prepared.endpoint, {
      method: 'POST', headers: { Authorization: `Bearer ${input.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(prepared.body), redirect: 'error', signal: AbortSignal.timeout(600000),
    }, `qianfan image ${input.model}`, 1)
    if (response.status >= 400 && response.status < 500 && response.status !== 408) {
      await response.body?.cancel()
      await io.checkpoint({ ...checkpoint, failed: true, state: { ...checkpoint.state, phase: 'rejected', httpStatus: response.status } })
      throw terminal(`千帆图片请求被拒绝（HTTP ${response.status}），未自动重发；实际费用需核对账单。`)
    }
    if (!response.ok) { await response.body?.cancel(); throw unknownResult() }
    data = await io.json(response, 1024 * 1024, `qianfan image ${input.model}`)
    if (data?.error || (data?.code !== undefined && data.code !== 0 && data.code !== '0') || data?.data?.[0]?.task_status === 'FAILED') {
      await io.checkpoint({ ...checkpoint, failed: true, state: { ...checkpoint.state, phase: 'rejected' } })
      throw terminal('千帆图片请求返回失败；不会重新提交，实际费用需核对账单。')
    }
    if (!Array.isArray(data?.data) || data.data.length !== 1) throw unknownResult()
    const url = resultUrl(data.data[0]?.url)
    const metadata = evidence(input, { requestId: data.id, usage: data.usage })
    await io.checkpoint({ ...checkpoint, state: { ...checkpoint.state, phase: 'completed' }, result: { url, metadata } })
    return await download(url, metadata)
  } catch (error: any) {
    if (error?.name === 'ImageChannelError') throw error
    throw unknownResult()
  }
}
