import type { ImageChannelCheckpoint, ImageChannelInput, ImageChannelTransport } from './image-channel-adapters.js'
import { auditedChannelContract, assertChannelRequest } from './audited-channel-contracts.js'

function notSent(message: string): never {
  throw Object.assign(new Error(message), { terminal: true, localInputFailure: true, requestState: 'not_sent' })
}
function identity(input: ImageChannelInput) {
  if (input.provider !== 'novita' || input.model !== 'ming-image-0.1-design') notSent('该 Novita 型号尚未接入，未发送请求。')
}
/** Novita's own contract takes precedence over the Ant cookbook's optional
 * enable_thinking/WebP example. No source image, n, or undocumented flags. */
export function buildNovitaImageRequest(input: ImageChannelInput) {
  identity(input)
  if (!input.apiKey.trim() || /[\r\n]/.test(input.apiKey)) notSent('请填写 Novita 独立 API Key。')
  if (!input.prompt.trim()) notSent('图片提示词不能为空，未发送请求。')
  if (input.source || input.edit) notSent('Ming Design 当前仅接入文生图，不接收原图、参考图或编辑参数。')
  const edge = input.resolution === '1K' ? 1024 : input.resolution === '2K' ? 2048 : 0
  if (!edge || !['auto', '1:1'].includes(input.aspectRatio)) notSent('本次仅接入 Ming 文档明确列出的 1:1、1K / 2K 尺寸。')
  const size = `${edge}x${edge}`
  if (input.size.size && input.size.size !== size || input.size.width !== undefined && input.size.width !== edge || input.size.height !== undefined && input.size.height !== edge) notSent('Ming 输出尺寸与所选比例、分辨率不一致，未发送请求。')
  const contract = auditedChannelContract(input.provider, input.model)
  const body = { model: input.model, prompt: input.prompt, size, output_format: 'png', response_format: 'b64_json' }
  assertChannelRequest(contract, body)
  return { endpoint: contract.imageEndpoint as string, headers: { Authorization: 'Bearer ' + input.apiKey, 'Content-Type': 'application/json' }, body }
}
function unknownSubmission(): Error {
  return Object.assign(new Error('Novita 原图片请求结果未知，已阻止重复提交；请核对渠道记录与费用。'), {
    name: 'ImageChannelError', terminal: true, uncertain: true, pollOnly: false, requestState: 'unknown', recoveryAction: 'inspect_provider',
  })
}
function resultUrl(value: string) {
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.username || url.password || url.port) throw new Error('Invalid Novita result URL')
  return url.href
}
/** Synchronous API: one durable POST; completed data/download can be resumed,
 * an unacknowledged submission cannot. A response id is not a polling API. */
export async function callNovitaImageChannel(input: ImageChannelInput, io: ImageChannelTransport): Promise<string> {
  identity(input)
  if (!io.pending || !io.checkpoint) notSent('当前后端缺少持久任务恢复能力，未发起 Novita 请求。')
  let current: ImageChannelCheckpoint | undefined
  try { current = await io.pending() } catch { notSent('读取 Novita 图片状态失败，未发送请求。') }
  if (current && (current.provider !== input.provider || current.model !== input.model || current.failed)) notSent('原 Novita 图片任务不可重放，请核对记录。')
  const save = async (patch: Partial<ImageChannelCheckpoint>) => {
    const next = { ...current, provider: input.provider, model: input.model, ...patch }
    await io.checkpoint!(next)
    current = next
  }
  const failed = async (message: string, requestState = 'completed'): Promise<never> => {
    try { await save({ failed: true }) } catch { /* The submitting checkpoint still prevents another POST. */ }
    throw Object.assign(new Error(message), { name: 'ImageChannelError', terminal: true, requestState })
  }
  const resumeError = () => Object.assign(new Error('Novita 图片结果已保存，记录或读取未完成；可恢复，不会重新生成。'), {
    name: 'ImageChannelError', recoveryAction: 'resume', pollOnly: true, uncertain: false, requestState: 'completed',
  })
  const readResult = async (): Promise<string> => {
    const metadata = current?.state?.metadata || current?.result?.metadata || {}
    try {
      // Retain usage/resolved model on resumed results, including a previous
      // failure to write the separate call record. Stable metadata lets the
      // job journal deduplicate the same record when result recovery retries.
      await io.record?.({ provider: input.provider, model: input.model, requestId: current?.taskId || null,
        publicPrice: auditedChannelContract(input.provider, input.model).price,
        estimatedCost: null, reportedCost: null, invoiceCost: null, ...metadata })
      if (typeof current?.state?.inlineBase64 === 'string') return io.validate(current.state.inlineBase64)
      return io.validate(await io.download(resultUrl(current!.result!.url)))
    } catch { throw resumeError() }
  }
  if (current?.result?.url || typeof current?.state?.inlineBase64 === 'string') return readResult()
  if (current) throw unknownSubmission()
  const prepared = buildNovitaImageRequest(input)
  try { await save({ state: { submitting: true, operation: 'generation' } }) }
  catch { notSent('保存 Novita 提交状态失败，未发起请求。') }
  let response: Response
  try {
    response = await io.request(prepared.endpoint, { method: 'POST', headers: prepared.headers, body: JSON.stringify(prepared.body), redirect: 'error', signal: AbortSignal.timeout(600000) }, 'novita image ' + input.model, 1)
  } catch { throw unknownSubmission() }
  if (response.status >= 400 && response.status < 500) {
    await response.body?.cancel().catch(() => {})
    return failed(`Novita 拒绝图片请求（HTTP ${response.status}），请核对独立密钥、额度、限流及输入；未自动重发。`, 'rejected')
  }
  if (!response.ok) { await response.body?.cancel().catch(() => {}); throw unknownSubmission() }
  let data: any
  try { data = await io.json(response, 80 * 1024 * 1024, 'Novita image result') } catch { throw unknownSubmission() }
  if (data?.error) return failed('Novita 返回图片任务错误，请核对渠道记录与费用；未自动重发。')
  if (!Array.isArray(data?.data) || data.data.length !== 1 || !data.data[0] || typeof data.data[0] !== 'object') return failed('Novita 未返回单张图片结果；不能将多个图层当成一张图，未自动重发。')
  const row = data.data[0]
  const metadata = { usage: data.usage ?? null, resolvedModel: typeof data.model === 'string' ? data.model : null,
    outputFormat: data.output_format ?? null, size: data.size ?? null }
  const taskId = typeof data.id === 'string' ? data.id : undefined
  let result: ImageChannelCheckpoint['result'], inlineBase64: string | undefined
  if (typeof row.b64_json === 'string' && row.b64_json) {
    try { inlineBase64 = io.validate(row.b64_json) } catch { return failed('Novita 返回的图片内容校验失败，未自动重发。') }
  } else if (typeof row.url === 'string' && row.url) {
    try { result = { url: resultUrl(row.url), metadata } } catch { return failed('Novita 返回的图片地址无效，未自动重发。') }
  } else return failed('Novita 响应缺少图片内容或地址，未自动重发。')
  try { await save({ taskId, ...(result ? { result } : {}), state: { submitting: false, completed: true, operation: 'generation', metadata, ...(inlineBase64 ? { inlineBase64 } : {}) } }) }
  catch { throw unknownSubmission() }
  return readResult()
}
