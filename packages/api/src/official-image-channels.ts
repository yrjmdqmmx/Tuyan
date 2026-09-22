import type { ImageChannelCheckpoint, ImageChannelInput, ImageChannelTransport } from './image-channel-adapters.js'

/** Audited 2026-09-22: new SenseNova Token API and StepFun China ordinary API.
 * The provider only announced a date. Midnight China time is our conservative
 * product cutoff, not a provider-published retirement timestamp. */
export const STEP_IMAGE_SUBMISSION_CUTOFF = '2026-10-09T16:00:00Z'
const SENSE_MODELS = new Set(['sensenova-u1.5-lite', 'sensenova-u1.5-fast'])
const STEP_MODELS = new Set(['step-2x-large', 'step-image-edit-2'])
const STEP_2X_SIZES = new Set(['256x256', '512x512', '768x768', '1024x1024', '1280x800', '800x1280'])
const STEP_EDIT_2_SIZES = new Set(['1024x1024', '768x1360', '896x1184', '1360x768', '1184x896'])

export type OfficialImageRequest = {
  endpoint: string
  method: 'POST'
  headers: Record<string, string>
  body: Record<string, unknown> | FormData
  multipart: boolean
}
type FrozenImage = { bytes: Buffer; width: number; height: number; dataUrl: string }

function notSent(message: string): never {
  throw Object.assign(new Error(message), { terminal: true, localInputFailure: true, requestState: 'not_sent' })
}
function checkIdentity(input: ImageChannelInput) {
  if (input.provider !== 'sensenova' && input.provider !== 'stepfun') notSent('未核验此官方图片渠道，未发送请求。')
  if (!(input.provider === 'sensenova' ? SENSE_MODELS : STEP_MODELS).has(input.model)) notSent('该官方图片型号不在已核验目录中，未发送请求。')
  if (input.region && input.region !== 'cn') notSent('当前仅接入已核验的中国普通 API，请核对地区与密钥。')
}
/** The shared upload layer freezes all sources as PNG. Read its real header,
 * never a remote URL or a separately supplied, potentially different Data URL. */
function frozenPng(source: NonNullable<ImageChannelInput['source']>): FrozenImage {
  if (source.mimeType !== 'image/png' || !/^[A-Za-z0-9+/]+={0,2}$/.test(source.base64)) notSent('原图与参考图须为已冻结的 PNG，未发送请求。')
  const bytes = Buffer.from(source.base64, 'base64')
  if (bytes.toString('base64').replace(/=+$/, '') !== source.base64.replace(/=+$/, '') ||
      bytes.length < 24 || !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
      bytes.toString('ascii', 12, 16) !== 'IHDR') notSent('原图或参考图的 PNG 内容无效，未发送请求。')
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20)
  if (!width || !height) notSent('原图或参考图缺少有效像素尺寸，未发送请求。')
  return { bytes, width, height, dataUrl: 'data:image/png;base64,' + bytes.toString('base64') }
}
function dimensions(input: ImageChannelInput): { width: number; height: number } | undefined {
  const { width, height, size } = input.size
  let resolved: { width: number; height: number } | undefined
  if (width !== undefined || height !== undefined) {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width! <= 0 || height! <= 0) notSent('图片宽高须为正整数，未发送请求。')
    resolved = { width: width!, height: height! }
  }
  if (size && size !== 'auto') {
    const match = /^(\d+)x(\d+)$/.exec(size)
    if (!match) notSent('图片尺寸必须先解析为实际宽高，未发送请求。')
    const named = { width: Number(match[1]), height: Number(match[2]) }
    if (!Number.isSafeInteger(named.width) || !Number.isSafeInteger(named.height) || !named.width || !named.height) notSent('图片尺寸无效，未发送请求。')
    if (resolved && (resolved.width !== named.width || resolved.height !== named.height)) notSent('图片尺寸字段不一致，未发送请求。')
    resolved = named
  }
  return resolved
}

/** Pure request preparation. size.width/height and size.size always describe
 * actual W/H; only this adapter converts Step Image Edit 2's HxW wire format. */
export function buildOfficialImageRequest(input: ImageChannelInput): OfficialImageRequest {
  checkIdentity(input)
  if (!input.apiKey.trim() || /[\r\n]/.test(input.apiKey)) notSent('请填写所选中国渠道的有效 API Key。')
  if (!input.prompt.trim()) notSent('图片提示词不能为空，未发送请求。')
  if (input.edit && !input.source) notSent('图片编辑控制需要原图，未发送请求。')
  if ((input.edit?.references?.length || 0) !== (input.edit?.inputs.references?.length || 0)) notSent('辅助参考图与输入记录数量不一致，未发送请求。')
  if (input.edit?.mask || input.edit?.inputs.mask) notSent('该型号未核验遮罩编辑协议，未发送请求。')
  if (input.edit?.inputs.structured) notSent('该型号不支持结构化编辑字段，请使用编辑提示词。')
  const images = input.source ? [input.source, ...(input.edit?.references || [])].map(frozenPng) : []
  const maximum = input.provider === 'sensenova' ? 5 : 1
  if (images.length > maximum) notSent(`该型号最多接收 ${maximum} 张图片（包含原图），未发送请求。`)
  const resolved = dimensions(input)
  const headers: Record<string, string> = { Authorization: 'Bearer ' + input.apiKey }
  const base = input.provider === 'sensenova' ? 'https://token.sensenova.cn/v1' : 'https://api.stepfun.com/v1'
  const json = (path: string, body: Record<string, unknown>): OfficialImageRequest => ({
    endpoint: base + path, method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body, multipart: false,
  })
  if (input.provider === 'sensenova') {
    if (resolved && (resolved.width < 512 || resolved.height < 512 || resolved.width > 4096 || resolved.height > 4096 ||
        resolved.width % 32 || resolved.height % 32 || resolved.width / resolved.height < 1 / 3 || resolved.width / resolved.height > 3)) {
      notSent('商汤图片每边须为 512–4096 像素、32 的倍数，比例须在 1:3 至 3:1，未发送请求。')
    }
    return json(images.length ? '/images/edits' : '/images/generations', {
      model: input.model, prompt: input.prompt, n: 1, size: resolved ? `${resolved.width}x${resolved.height}` : 'auto',
      output_format: 'png', response_format: 'url', watermark: true, prompt_extend: false,
      ...(images.length ? { images: images.map(image => ({ image_url: image.dataUrl })) } : {}),
    })
  }
  const maxPromptLength = input.model === 'step-2x-large' && images.length ? 1024 : 512
  if ([...input.prompt].length > maxPromptLength) notSent(`该型号当前操作的提示词最多 ${maxPromptLength} 个字符，未发送请求。`)
  if (input.model === 'step-2x-large') {
    if (images.some(image => image.bytes.length > 10 * 1024 * 1024 || image.width > 2048 || image.height > 2048)) {
      notSent('Step 2x 原图须不超过 10 MB、2048×2048 像素；未压缩或裁切，未发送请求。')
    }
    const size = resolved ? `${resolved.width}x${resolved.height}` : '1024x1024'
    if (!STEP_2X_SIZES.has(size)) notSent('Step 2x 不支持所选输出尺寸，未发送请求。')
    return json(images.length ? '/images/image2image' : '/images/generations', {
      model: input.model, prompt: input.prompt, n: 1, size, response_format: 'url', steps: 50, cfg_scale: 6,
      // Required by the API; 0.5 is our explicit product choice from its example.
      ...(images.length ? { source_url: images[0].dataUrl, source_weight: 0.5 } : {}),
    })
  }
  if (!images.length) {
    const size = resolved ? `${resolved.height}x${resolved.width}` : '1024x1024'
    if (!STEP_EDIT_2_SIZES.has(size)) notSent('Step Image Edit 2 不支持所选输出尺寸，未发送请求。')
    return json('/images/generations', {
      model: input.model, prompt: input.prompt, n: 1, size, response_format: 'url', steps: 8, cfg_scale: 1,
    })
  }
  const image = images[0]
  if (image.width > 4096 || image.height > 4096) notSent('Step Image Edit 2 原图每边最多 4096 像素，未发送请求。')
  if (resolved && (resolved.width !== image.width || resolved.height !== image.height)) notSent('Step Image Edit 2 编辑仅保持原图尺寸，不能改为所选尺寸；未发送请求。')
  if (!resolved && (input.aspectRatio !== 'auto' || input.resolution !== 'auto')) notSent('Step Image Edit 2 编辑须选择自动保留原图尺寸，或明确选择与原图相同的宽高。')
  const form = new FormData()
  form.set('model', input.model)
  form.set('prompt', input.prompt)
  form.set('image', new Blob([new Uint8Array(image.bytes)], { type: 'image/png' }), 'source.png')
  form.set('response_format', 'url')
  form.set('steps', '8')
  form.set('cfg_scale', '1')
  // size is ignored by the provider; n and mask are not documented edit fields.
  return { endpoint: base + '/images/edits', method: 'POST', headers, body: form, multipart: true }
}

function unknownSubmission(): Error {
  return Object.assign(new Error('原同步图片请求结果未知，已阻止重复提交；请核对渠道记录与费用。'), {
    name: 'ImageChannelError', terminal: true, uncertain: true, pollOnly: false, requestState: 'unknown', recoveryAction: 'inspect_provider',
  })
}
function resultUrl(value: unknown): string {
  if (typeof value !== 'string' || !value) throw new Error('invalid result URL')
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.username || url.password || url.port) throw new Error('invalid result URL')
  return url.href
}

/** One durable submission, with download-only recovery. No sync task ID can
 * make a new inference safe: neither provider documents a query endpoint. */
export async function callOfficialImageChannel(input: ImageChannelInput, io: ImageChannelTransport): Promise<string> {
  checkIdentity(input)
  if (!io.pending || !io.checkpoint) notSent('当前后端缺少持久任务恢复能力，未发起渠道请求。')
  let current: ImageChannelCheckpoint | undefined
  try { current = await io.pending() } catch { notSent('读取原图片任务状态失败，未发起渠道请求。') }
  if (current && (current.provider !== input.provider || current.model !== input.model || current.failed ||
      (current.state?.region && current.state.region !== 'cn'))) {
    throw Object.assign(new Error('原渠道图片任务不可重放，请核对记录。'), { terminal: true, requestState: 'not_sent' })
  }
  const save = async (patch: Partial<ImageChannelCheckpoint>) => {
    const next = { ...current, provider: input.provider, model: input.model, ...patch }
    await io.checkpoint!(next)
    current = next
  }
  const failed = async (message: string, requestState = 'completed'): Promise<never> => {
    try { await save({ failed: true }) } catch { /* Existing submitting state still prohibits resubmission. */ }
    throw Object.assign(new Error(message), { name: 'ImageChannelError', terminal: true, requestState })
  }
  const download = async (url: string): Promise<string> => {
    try {
      // download() owns URL safety and redirect checks and accepts no credentials.
      return io.validate(await io.download(resultUrl(url)))
    } catch {
      throw Object.assign(new Error('原图片结果已保存，下载或校验未完成；可恢复下载，不会重新生成。'), {
        name: 'ImageChannelError', recoveryAction: 'resume', pollOnly: true, uncertain: false, requestState: 'completed',
      })
    }
  }
  const record = async (metadata: Record<string, unknown>) => {
    await io.record?.({
      provider: input.provider, model: input.model, requestId: current?.taskId || null,
      publicPrice: input.provider === 'stepfun'
        ? { amount: input.model === 'step-2x-large' ? 0.1 : 0.02, currency: 'CNY', unit: 'image', source: 'https://platform.stepfun.com/docs/zh/guides/pricing/details', checkedAt: '2026-09-22' }
        : { amount: null, currency: null, unit: 'points', source: 'https://platform.sensenova.cn/docs', checkedAt: '2026-09-22' },
      estimatedCost: null, reportedCost: null, invoiceCost: null, ...metadata,
    })
  }
  const existingUrl = current?.result?.url || current?.resultUrl
  if (existingUrl) return download(existingUrl)
  if (typeof current?.state?.inlineBase64 === 'string') {
    try { return io.validate(current.state.inlineBase64) } catch { return failed('原渠道图片内容校验失败；不会重新生成。') }
  }
  if (current) throw unknownSubmission()
  if (input.provider === 'stepfun' && io.now() >= Date.parse(STEP_IMAGE_SUBMISSION_CUTOFF)) {
    notSent('所选阶跃图片型号已到停服日期；原配置已保留，请手动选择其他型号。')
  }
  const prepared = buildOfficialImageRequest(input)
  try {
    await save({ state: { submitting: true, region: 'cn', operation: input.source ? 'editing' : 'generation' } })
  } catch { notSent('保存图片提交状态失败，未发起渠道请求。') }
  let response: Response
  try {
    response = await io.request(prepared.endpoint, {
      method: prepared.method, headers: prepared.headers,
      body: prepared.multipart ? prepared.body as FormData : JSON.stringify(prepared.body),
      redirect: 'error', signal: AbortSignal.timeout(600000),
    }, input.provider + ' image ' + input.model, 1)
  } catch { throw unknownSubmission() }
  if (response.status >= 400 && response.status < 500) {
    await response.body?.cancel().catch(() => {})
    return failed(`渠道拒绝图片请求（HTTP ${response.status}），请核对密钥、额度、限流及输入；未自动重发。`, 'rejected')
  }
  if (!response.ok) {
    await response.body?.cancel().catch(() => {})
    throw unknownSubmission()
  }
  let data: any
  try { data = await io.json(response, 80 * 1024 * 1024, input.provider + ' image result') } catch { throw unknownSubmission() }
  if (data?.error) return failed('渠道返回图片任务错误；请核对渠道记录与费用，未自动重发。')
  if (!Array.isArray(data?.data) || data.data.length !== 1 || !data.data[0] || typeof data.data[0] !== 'object') {
    return failed('渠道没有返回有效的单张图片结果；未自动重发。')
  }
  const row = data.data[0]
  if (row.finish_reason && row.finish_reason !== 'success') return failed('渠道图片任务未成功或输出被过滤；未自动重发。')
  const metadata = { usage: data.usage ?? null, seed: row.seed ?? null, finishReason: row.finish_reason ?? null }
  const requestId = typeof data.id === 'string' ? data.id : typeof data.request_id === 'string' ? data.request_id : undefined
  if (typeof row.url === 'string' && row.url) {
    let url: string
    try { url = resultUrl(row.url) } catch { return failed('渠道返回的图片地址无效；未自动重发。') }
    try { await save({ taskId: requestId, result: { url, metadata }, state: { region: 'cn', operation: input.source ? 'editing' : 'generation', submitting: false, completed: true } }) } catch { throw unknownSubmission() }
    try { await record(metadata) } catch {
      throw Object.assign(new Error('图片结果已保存，调用记录保存失败；可恢复下载，不会重新生成。'), { recoveryAction: 'resume', pollOnly: true, uncertain: false, requestState: 'completed' })
    }
    return download(url)
  }
  if (typeof row.b64_json === 'string' && row.b64_json) {
    let validated: string
    try { validated = io.validate(row.b64_json) } catch { return failed('渠道返回的图片内容校验失败；未自动重发。') }
    try { await save({ taskId: requestId, state: { region: 'cn', operation: input.source ? 'editing' : 'generation', submitting: false, completed: true, inlineBase64: validated } }) } catch { throw unknownSubmission() }
    try { await record(metadata) } catch {
      throw Object.assign(new Error('图片结果已保存，调用记录保存失败；可恢复读取，不会重新生成。'), { recoveryAction: 'resume', pollOnly: true, uncertain: false, requestState: 'completed' })
    }
    return validated
  }
  return failed('渠道响应缺少图片地址或图片内容；未自动重发。')
}
