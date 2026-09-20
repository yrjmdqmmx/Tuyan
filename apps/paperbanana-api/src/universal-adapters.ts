import sharp from 'sharp'
import { randomBytes } from 'node:crypto'
import { normalizeUniversalRoute, UniversalApiError, universalModelEntry, type UniversalRoute, type UniversalInputLimits, type UniversalOutputLimits } from '../../../packages/api/src/universal-api.js'
import { createUniversalTransport, type UniversalTransport, type UniversalTransportOptions, type UniversalTransportRequest } from './universal-transport.js'

export interface UniversalInputImage { data?: Uint8Array | string; base64?: string; mimeType: string; width?: number; height?: number }
export interface UniversalTextInput { systemPrompt?: string; prompt: string; images?: UniversalInputImage[]; temperature?: number; maxTokens?: number; signal?: AbortSignal }
export interface UniversalImageInput { prompt: string; sourceImages?: UniversalInputImage[]; aspectRatio: string; imageSize: string; signal?: AbortSignal }
interface UniversalImageBytes { base64: string; mimeType: string; bytes: Uint8Array }
export interface UniversalRuntimeOptions extends UniversalTransportOptions { transport?: UniversalTransport }
export interface UniversalCatalogResult { state: 'catalog-visible' | 'catalog-empty' | 'catalog-invalid' | 'unsupported'; verified: false; selectedModelVisible: boolean | null; models: { id: string }[]; warnings: { row: number; code: string }[]; message: string }
const universalOutputMime: Record<string, string> = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' }
function universalInvalidResponse(code: 'RESPONSE_INVALID' | 'ASYNC_UNSUPPORTED' | 'RESPONSE_LIMIT' = 'RESPONSE_INVALID'): never { throw new UniversalApiError(code, 'unknown') }
function universalBase64(value: unknown, limit: number, output = false): Uint8Array {
  const invalid = (): never => { if (output) universalInvalidResponse(); throw new UniversalApiError('IMAGE_INVALID') }
  const tooLarge = (): never => { if (output) universalInvalidResponse('RESPONSE_LIMIT'); throw new UniversalApiError('INPUT_LIMIT') }
  if (typeof value !== 'string' || !value || value.length % 4 !== 0) return invalid()
  if (value.length > Math.ceil(limit / 3) * 4) return tooLarge()
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0
  const dataLength = value.length - padding, decodedLength = value.length / 4 * 3 - padding
  if (decodedLength < 1) return invalid()
  // A repeated-group regexp over multi-MiB base64 can exhaust V8's regexp
  // stack. Check each ASCII sextet once with constant auxiliary memory.
  let lastSextet = 0
  for (let index = 0; index < dataLength; index++) {
    const code = value.charCodeAt(index)
    if (code >= 65 && code <= 90) lastSextet = code - 65
    else if (code >= 97 && code <= 122) lastSextet = code - 71
    else if (code >= 48 && code <= 57) lastSextet = code + 4
    else if (code === 43) lastSextet = 62
    else if (code === 47) lastSextet = 63
    else return invalid()
  }
  // '=' may occur only in the final one or two positions; unused bits must
  // also be zero, so noncanonical encodings cannot disguise altered tails.
  if (padding === 2 && (lastSextet & 15) !== 0 || padding === 1 && (lastSextet & 3) !== 0) return invalid()
  if (decodedLength > limit) return tooLarge()
  const bytes = Buffer.from(value, 'base64')
  if (bytes.length !== decodedLength) return invalid()
  return bytes
}
async function universalValidateImage(bytes: Uint8Array, mimeType: string | undefined, limits: UniversalInputLimits | UniversalOutputLimits, output = false): Promise<UniversalImageBytes> {
  try {
    if (bytes.byteLength > limits.maxBytes) throw new UniversalApiError(output ? 'RESPONSE_LIMIT' : 'INPUT_LIMIT', output ? 'unknown' : 'not_sent')
    const metadata = await sharp(bytes, { limitInputPixels: limits.maxPixels, failOn: 'error' }).metadata()
    const actualMime = universalOutputMime[metadata.format || '']
    if (!actualMime || mimeType && actualMime !== mimeType || !limits.mimeTypes.includes(actualMime) || !metadata.width || !metadata.height || (metadata.pages || 1) > 1) throw new Error()
    if (metadata.width > limits.maxDimension || metadata.height > limits.maxDimension || metadata.width * metadata.height > limits.maxPixels) throw new UniversalApiError(output ? 'RESPONSE_LIMIT' : 'INPUT_LIMIT', output ? 'unknown' : 'not_sent')
    // Decode once as well: metadata alone can accept a truncated or corrupt pixel stream.
    await sharp(bytes, { limitInputPixels: limits.maxPixels, failOn: 'error' }).stats()
    return { bytes, base64: Buffer.from(bytes).toString('base64'), mimeType: actualMime }
  } catch (error) {
    if (error instanceof UniversalApiError) throw error
    throw new UniversalApiError(output ? 'RESPONSE_INVALID' : 'IMAGE_INVALID', output ? 'unknown' : 'not_sent')
  }
}
async function universalImages(images: UniversalInputImage[] | undefined, route: UniversalRoute): Promise<UniversalImageBytes[]> {
  const limits = route.custom.inputLimits
  if (images !== undefined && !Array.isArray(images) || (images?.length || 0) > limits.maxCount) throw new UniversalApiError('INPUT_LIMIT')
  const result: UniversalImageBytes[] = []; let total = 0
  for (const image of images || []) {
    if (!image || !limits.mimeTypes.includes(image.mimeType)) throw new UniversalApiError('IMAGE_INVALID')
    const data = image.data ?? image.base64
    const bytes = data instanceof Uint8Array ? data : universalBase64(data, limits.maxBytes)
    total += bytes.byteLength
    if (total > limits.maxTotalBytes) throw new UniversalApiError('INPUT_LIMIT')
    result.push(await universalValidateImage(bytes, image.mimeType, limits))
  }
  return result
}
function universalDataUrl(image: UniversalImageBytes) { return `data:${image.mimeType};base64,${image.base64}` }
function universalHeaders(route: UniversalRoute, key: string): Record<string, string> {
  if (typeof key !== 'string' || !key || key.length > 16384 || /[^\x21-\x7e]/.test(key)) throw new UniversalApiError('CREDENTIAL_MISMATCH')
  const c = route.custom
  return { ...(c.auth === 'bearer' ? { Authorization: `Bearer ${key}` } : { [c.auth]: key }), ...(c.protocol === 'anthropic-messages' ? { 'anthropic-version': '2023-06-01' } : {}) }
}
function universalPrompt(value: unknown): asserts value is string { if (typeof value !== 'string' || !value.trim()) throw new UniversalApiError('CONFIG_INVALID') }
function universalTokens(value: number | undefined) { if (value !== undefined && (!Number.isSafeInteger(value) || value < 1 || value > 1000000)) throw new UniversalApiError('CONFIG_INVALID'); return value }
function universalEndpoint(route: UniversalRoute, suffix: string) { return `${route.custom.baseUrl}/${suffix}` }
function universalGeminiEndpoint(route: UniversalRoute) { return universalEndpoint(route, `models/${encodeURIComponent(route.modelId.startsWith('models/') ? route.modelId.slice(7) : route.modelId)}:generateContent`) }
function universalJson(route: UniversalRoute, key: string, suffix: string, body: unknown, signal?: AbortSignal): UniversalTransportRequest {
  const encoded = JSON.stringify(body)
  if (Buffer.byteLength(encoded) > route.custom.inputLimits.requestMaxBytes) throw new UniversalApiError('INPUT_LIMIT')
  return { url: suffix === ':generateContent' ? universalGeminiEndpoint(route) : universalEndpoint(route, suffix), method: 'POST', headers: { ...universalHeaders(route, key), 'Content-Type': 'application/json' }, body: encoded, maxRequestBytes: route.custom.inputLimits.requestMaxBytes, maxResponseBytes: Math.max(1024 * 1024, Math.ceil(route.custom.outputLimits.maxBytes * 4 / 3) + 1024 * 1024), signal, kind: 'inference' }
}
function universalParts(images: UniversalImageBytes[], kind: 'chat' | 'responses' | 'anthropic' | 'gemini' | 'interactions' | 'dashscope'): any[] {
  return images.map(image => kind === 'chat' ? { type: 'image_url', image_url: { url: universalDataUrl(image) } }
    : kind === 'responses' ? { type: 'input_image', image_url: universalDataUrl(image) }
      : kind === 'anthropic' ? { type: 'image', source: { type: 'base64', media_type: image.mimeType, data: image.base64 } }
        : kind === 'gemini' ? { inlineData: { mimeType: image.mimeType, data: image.base64 } }
          : kind === 'interactions' ? { type: 'image', mime_type: image.mimeType, data: image.base64 }
            : { image: universalDataUrl(image) })
}
function universalTextRequest(route: UniversalRoute, key: string, input: UniversalTextInput, images: UniversalImageBytes[]) {
  const { protocol } = route.custom, model = route.modelId, maxTokens = universalTokens(input.maxTokens)
  const system = input.systemPrompt
  if (system !== undefined && typeof system !== 'string') throw new UniversalApiError('CONFIG_INVALID')
  if (protocol === 'openai-chat') return universalJson(route, key, 'chat/completions', { model, stream: false, messages: [...(system ? [{ role: 'system', content: system }] : []), { role: 'user', content: [{ type: 'text', text: input.prompt }, ...universalParts(images, 'chat')] }], ...(maxTokens ? { max_completion_tokens: maxTokens } : {}) }, input.signal)
  if (protocol === 'openai-responses') return universalJson(route, key, 'responses', { model, stream: false, store: false, ...(system ? { instructions: system } : {}), input: [{ role: 'user', content: [{ type: 'input_text', text: input.prompt }, ...universalParts(images, 'responses')] }], ...(maxTokens ? { max_output_tokens: maxTokens } : {}) }, input.signal)
  if (protocol === 'anthropic-messages') return universalJson(route, key, 'messages', { model, stream: false, ...(system ? { system } : {}), max_tokens: maxTokens || 4096, messages: [{ role: 'user', content: [...universalParts(images, 'anthropic'), { type: 'text', text: input.prompt }] }] }, input.signal)
  if (protocol === 'gemini-generate-content') return universalJson(route, key, ':generateContent', { ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}), contents: [{ role: 'user', parts: [{ text: input.prompt }, ...universalParts(images, 'gemini')] }], ...(maxTokens ? { generationConfig: { maxOutputTokens: maxTokens } } : {}) }, input.signal)
  if (protocol === 'gemini-interactions') return universalJson(route, key, 'interactions', { model, store: false, stream: false, ...(system ? { system_instruction: system } : {}), input: [{ type: 'text', text: input.prompt }, ...universalParts(images, 'interactions')], ...(maxTokens ? { generation_config: { max_output_tokens: maxTokens } } : {}) }, input.signal)
  if (protocol === 'dashscope-multimodal') return universalJson(route, key, 'services/aigc/multimodal-generation/generation', { model, input: { messages: [...(system ? [{ role: 'system', content: [{ text: system }] }] : []), { role: 'user', content: [...universalParts(images, 'dashscope'), { text: input.prompt }] }] }, parameters: { ...(maxTokens ? { max_tokens: maxTokens } : {}) } }, input.signal)
  throw new UniversalApiError('CAPABILITY_UNSUPPORTED')
}
function universalSize(route: UniversalRoute, input: UniversalImageInput): string {
  const size = route.custom.outputSizes?.find(x => x.resolution === input.imageSize && x.aspectRatio === input.aspectRatio)
  if (!size) throw new UniversalApiError('OUTPUT_SIZE_UNSUPPORTED')
  const dimensions = /^(\d+)[x*](\d+)$/.exec(size.value)
  if (dimensions) {
    const width = Number(dimensions[1]), height = Number(dimensions[2]), limits = route.custom.outputLimits
    if (width < 1 || height < 1 || width > limits.maxDimension || height > limits.maxDimension || width * height > limits.maxPixels) throw new UniversalApiError('OUTPUT_SIZE_UNSUPPORTED')
  }
  return size.value
}
function universalMultipart(route: UniversalRoute, key: string, input: UniversalImageInput, images: UniversalImageBytes[], size: string): UniversalTransportRequest {
  const boundary = `tuyan-${randomBytes(18).toString('hex')}`, parts: Buffer[] = []
  for (const [name, value] of Object.entries({ model: route.modelId, prompt: input.prompt, size, n: '1' })) parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`))
  for (const [index, image] of images.entries()) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${images.length === 1 ? 'image' : 'image[]'}"; filename="source-${index}.${image.mimeType.split('/')[1]}"\r\nContent-Type: ${image.mimeType}\r\n\r\n`), Buffer.from(image.bytes), Buffer.from('\r\n'))
  }
  parts.push(Buffer.from(`--${boundary}--\r\n`))
  const body = Buffer.concat(parts)
  if (body.length > route.custom.inputLimits.requestMaxBytes) throw new UniversalApiError('INPUT_LIMIT')
  return { url: universalEndpoint(route, 'images/edits'), method: 'POST', headers: { ...universalHeaders(route, key), 'Content-Type': `multipart/form-data; boundary=${boundary}` }, body, maxRequestBytes: route.custom.inputLimits.requestMaxBytes, maxResponseBytes: Math.ceil(route.custom.outputLimits.maxBytes * 4 / 3) + 1024 * 1024, signal: input.signal, kind: 'inference' }
}
function universalImageRequest(route: UniversalRoute, key: string, input: UniversalImageInput, images: UniversalImageBytes[]) {
  const c = route.custom, model = route.modelId, size = universalSize(route, input), ratio = input.aspectRatio === 'auto' ? undefined : input.aspectRatio
  if (c.protocol === 'openai-images') {
    if (c.compatibility === 'ark-images') return universalJson(route, key, 'images/generations', { model, prompt: input.prompt, size, response_format: 'b64_json', ...(images.length ? { image: images.length === 1 ? universalDataUrl(images[0]) : images.map(universalDataUrl) } : {}) }, input.signal)
    return images.length ? universalMultipart(route, key, input, images, size) : universalJson(route, key, 'images/generations', { model, prompt: input.prompt, size, n: 1 }, input.signal)
  }
  if (c.protocol === 'openai-chat' && c.compatibility === 'openrouter-image') return universalJson(route, key, 'chat/completions', { model, stream: false, modalities: ['image', 'text'], messages: [{ role: 'user', content: [{ type: 'text', text: input.prompt }, ...universalParts(images, 'chat')] }], image_config: { image_size: size, ...(ratio ? { aspect_ratio: ratio } : {}) } }, input.signal)
  if (c.protocol === 'gemini-generate-content') return universalJson(route, key, ':generateContent', { contents: [{ role: 'user', parts: [{ text: input.prompt }, ...universalParts(images, 'gemini')] }], generationConfig: { responseModalities: ['IMAGE'], imageConfig: { imageSize: size, ...(ratio ? { aspectRatio: ratio } : {}) } } }, input.signal)
  if (c.protocol === 'gemini-interactions') return universalJson(route, key, 'interactions', { model, store: false, stream: false, input: [{ type: 'text', text: input.prompt }, ...universalParts(images, 'interactions')], response_format: { type: 'image', mime_type: c.outputLimits.mimeTypes[0], image_size: size, ...(ratio ? { aspect_ratio: ratio } : {}) } }, input.signal)
  if (c.protocol === 'dashscope-multimodal') return universalJson(route, key, 'services/aigc/multimodal-generation/generation', { model, input: { messages: [{ role: 'user', content: [...universalParts(images, 'dashscope'), { text: input.prompt }] }] }, parameters: { n: 1, size } }, input.signal)
  throw new UniversalApiError('CAPABILITY_UNSUPPORTED')
}
function universalObject(value: any) { return value && typeof value === 'object' && !Array.isArray(value) }
// This synchronous adapter never executes tools. Check the whole response before
// selecting any text/image, including other choices and mixed tool + final text.
function universalToolFields(value: any): boolean {
  if (!universalObject(value)) return false
  return ['tool_calls', 'tool_call', 'toolCall', 'tool_response', 'toolResponse', 'function_call', 'functionCall', 'function_response', 'functionResponse', 'executableCode', 'executable_code', 'codeExecutionResult', 'code_execution_result']
    .some(key => value[key] != null && (!Array.isArray(value[key]) || value[key].length > 0))
}
function universalToolPart(value: any): boolean {
  return universalToolFields(value) || typeof value?.type === 'string' && /(?:^|_)(?:tool|function|search|computer|code_execution|code_interpreter|mcp|shell|apply_patch)(?:_|$)|_call(?:_|$)|_result$/.test(value.type)
}
function universalHasUnhandledTools(data: any, protocol: UniversalRoute['custom']['protocol']): boolean {
  if (universalToolFields(data)) return true
  const array = (value: any): any[] => Array.isArray(value) ? value : []
  const messageHasTools = (message: any) => universalToolFields(message) || array(message?.content).some(universalToolPart)
  if (protocol === 'openai-chat') return array(data.choices).some(choice => messageHasTools(choice?.message))
  if (protocol === 'openai-responses') return array(data.output).some(item =>
    // Fail closed for all builtin/custom/future action items, rather than
    // treating status=completed as proof that this adapter handled the tool.
    !['message', 'reasoning'].includes(item?.type) || universalToolFields(item) || array(item?.content).some(universalToolPart))
  if (protocol === 'anthropic-messages') return array(data.content).some(part => universalToolPart(part) || !['text', 'thinking', 'redacted_thinking'].includes(part?.type))
  if (protocol === 'gemini-generate-content') return array(data.candidates).some(candidate => array(candidate?.content?.parts).some(universalToolPart))
  if (protocol === 'gemini-interactions') return array(data.steps).some(step =>
    !['model_output', 'model_thought', 'thought'].includes(step?.type) || universalToolFields(step) || array(step?.content).some(universalToolPart) || array(step?.summary).some(universalToolPart))
  if (protocol === 'dashscope-multimodal') return universalToolFields(data.output) || array(data.output?.choices).some(choice => messageHasTools(choice?.message))
  return array(data.data).some(universalToolPart)
}
function universalComplete(data: any, route: UniversalRoute) {
  if (!universalObject(data) || data.error || data.code) universalInvalidResponse()
  if (['queued', 'pending', 'running', 'in_progress', 'incomplete', 'processing'].includes(String(data.status || data.output?.task_status || '').toLowerCase()) || data.task_id || data.output?.task_id) universalInvalidResponse('ASYNC_UNSUPPORTED')
  const status = String(data.status || data.output?.task_status || '').toLowerCase()
  if (status && !['completed', 'succeeded', 'success'].includes(status)) universalInvalidResponse()
  const protocol = route.custom.protocol
  if (universalHasUnhandledTools(data, protocol)) universalInvalidResponse()
  if (protocol === 'openai-responses' && data.status !== 'completed' || protocol === 'gemini-interactions' && data.status !== 'completed') universalInvalidResponse()
  if (protocol === 'openai-chat' && data.choices?.[0]?.finish_reason !== 'stop') universalInvalidResponse()
  if (protocol === 'anthropic-messages' && !['end_turn', 'stop_sequence'].includes(data.stop_reason)) universalInvalidResponse()
  if (protocol === 'gemini-generate-content' && data.candidates?.[0]?.finishReason !== 'STOP') universalInvalidResponse()
  if (protocol === 'dashscope-multimodal' && data.output?.choices?.[0]?.finish_reason && data.output.choices[0].finish_reason !== 'stop') universalInvalidResponse()
}
function universalInteractionParts(data: any): any[] { return (Array.isArray(data.steps) ? data.steps : []).filter((s: any) => s?.type === 'model_output').flatMap((s: any) => Array.isArray(s.content) ? s.content : []) }
function universalTextContent(content: any, typed?: string): string { return typeof content === 'string' ? content : Array.isArray(content) ? content.filter(p => universalObject(p) && (!typed || p.type === typed) && typeof p.text === 'string').map(p => p.text).join('') : '' }
function universalParseText(route: UniversalRoute, data: any): string {
  universalComplete(data, route)
  const p = route.custom.protocol
  const result = p === 'openai-chat' ? universalTextContent(data.choices?.[0]?.message?.content, 'text')
    : p === 'openai-responses' ? (Array.isArray(data.output) ? data.output : []).filter((x: any) => x.type === 'message' && (!x.status || x.status === 'completed')).map((x: any) => universalTextContent(x.content, 'output_text')).join('')
      : p === 'anthropic-messages' ? universalTextContent(data.content, 'text')
        : p === 'gemini-generate-content' ? universalTextContent(data.candidates?.[0]?.content?.parts?.filter((p: any) => !p.thought))
          : p === 'gemini-interactions' ? universalTextContent(universalInteractionParts(data), 'text')
            : p === 'dashscope-multimodal' ? universalTextContent(data.output?.choices?.[0]?.message?.content) : ''
  if (!result.trim()) universalInvalidResponse()
  if (Buffer.byteLength(result) > route.custom.outputLimits.maxBytes) universalInvalidResponse('RESPONSE_LIMIT')
  return result
}
function universalImageDescriptor(route: UniversalRoute, data: any): { base64?: string; mimeType?: string; url?: string } {
  universalComplete(data, route)
  const p = route.custom.protocol
  if (p === 'openai-images') {
    const item = data.data?.[0]
    if (typeof item?.b64_json === 'string') return { base64: item.b64_json }
    if (typeof item?.url === 'string') return { url: item.url }
  }
  if (p === 'openai-chat') {
    const image = data.choices?.[0]?.message?.images?.[0] || data.choices?.[0]?.message?.content?.find?.((part: any) => part?.type === 'image_url')
    const url = image?.image_url?.url
    if (typeof url === 'string') return { url }
  }
  if (p === 'gemini-generate-content') {
    const parts = data.candidates?.[0]?.content?.parts
    // Gemini may emit intermediate images flagged as thought before the final image.
    const part = Array.isArray(parts) ? parts.find((part: any) => part && !part.thought && (part.inlineData || part.inline_data)) : null
    const blob = part?.inlineData || part?.inline_data
    if (typeof blob?.data === 'string') return { base64: blob.data, mimeType: blob.mimeType || blob.mime_type }
  }
  if (p === 'gemini-interactions') {
    const image = universalInteractionParts(data).find((x: any) => x?.type === 'image')
    if (typeof image?.data === 'string') return { base64: image.data, mimeType: image.mime_type }
    if (typeof image?.uri === 'string' || typeof image?.url === 'string') return { url: image.uri || image.url }
  }
  if (p === 'dashscope-multimodal') {
    const parts = data.output?.choices?.[0]?.message?.content
    const image = Array.isArray(parts) ? parts.find((x: any) => typeof x?.image === 'string') : null
    if (image) return { url: image.image }
  }
  return universalInvalidResponse()
}
/** Isolate malformed catalog rows; directory visibility never grants model capabilities. */
export function universalCatalogRows(data: unknown, protocol: UniversalRoute['custom']['protocol']): Pick<UniversalCatalogResult, 'models' | 'warnings'> {
  if (!universalObject(data)) throw new UniversalApiError('RESPONSE_INVALID')
  const raw = protocol.startsWith('gemini-') ? (data as any).models : (data as any).data
  if (!Array.isArray(raw) || raw.length > 10000) throw new UniversalApiError('RESPONSE_INVALID')
  const warnings: UniversalCatalogResult['warnings'] = [], candidates: { id: string; row: number }[] = []
  const counts = new Map<string, number>()
  for (const row of raw) { const id = protocol.startsWith('gemini-') ? row?.name : row?.id; if (typeof id === 'string') counts.set(id, (counts.get(id) || 0) + 1) }
  raw.forEach((value, row) => {
    if (value === null) { warnings.push({ row, code: 'row_null' }); return }
    if (!universalObject(value)) { warnings.push({ row, code: 'row_type' }); return }
    const id = protocol.startsWith('gemini-') ? value.name : value.id
    if (id === undefined) { warnings.push({ row, code: 'id_missing' }); return }
    if (id === null) { warnings.push({ row, code: 'id_null' }); return }
    if (typeof id !== 'string' || !id || id !== id.trim() || id.length > 256 || /[\x00-\x1f\x7f]/.test(id)) { warnings.push({ row, code: 'id_type' }); return }
    if ('supported_protocols' in value && (!Array.isArray(value.supported_protocols) || !value.supported_protocols.length || value.supported_protocols.some((x: any) => typeof x !== 'string' || !x))) { warnings.push({ row, code: value.supported_protocols === null ? 'protocol_null' : 'protocol_type' }); return }
    if (Array.isArray(value.supported_protocols) && value.supported_protocols.some((p: string) => !['openai-chat', 'openai-responses', 'openai-images', 'anthropic-messages', 'gemini-generate-content', 'gemini-interactions', 'dashscope-multimodal', 'openai:chat-completions', 'openai:responses', 'openai:images', 'ark:image-generations', 'anthropic:messages', 'gemini:generate-content', 'gemini:interactions'].includes(p))) { warnings.push({ row, code: 'protocol_unsupported' }); return }
    const matchingProtocols: Record<string, string[]> = { 'openai-chat': ['openai-chat', 'openai:chat-completions'], 'openai-responses': ['openai-responses', 'openai:responses'], 'openai-images': ['openai-images', 'openai:images', 'ark:image-generations'], 'anthropic-messages': ['anthropic-messages', 'anthropic:messages'], 'gemini-generate-content': ['gemini-generate-content', 'gemini:generate-content'], 'gemini-interactions': ['gemini-interactions', 'gemini:interactions'], 'dashscope-multimodal': ['dashscope-multimodal'] }
    if (Array.isArray(value.supported_protocols) && !value.supported_protocols.some((p: string) => matchingProtocols[protocol].includes(p))) { warnings.push({ row, code: 'protocol_mismatch' }); return }
    candidates.push({ id, row })
  })
  return { models: candidates.filter(row => { if (counts.get(row.id)! > 1) { warnings.push({ row: row.row, code: 'id_duplicate' }); return false } return true }).map(({ id }) => ({ id })), warnings }
}
export function createUniversalRuntime(options: UniversalRuntimeOptions = {}) {
  const transport = options.transport || createUniversalTransport(options)
  async function send(request: UniversalTransportRequest) {
    const response = await transport.request(request)
    if (response.status === 202) universalInvalidResponse('ASYNC_UNSUPPORTED')
    let data: any
    try { data = JSON.parse(Buffer.from(response.bytes).toString('utf8')) } catch { universalInvalidResponse() }
    return data
  }
  return {
    async checkConfig(value: unknown) {
      const route = normalizeUniversalRoute(value)
      await transport.checkUrl(route.custom.baseUrl)
      return { state: 'configuration-valid' as const, verified: false as const, route, model: universalModelEntry(route) }
    },
    async text(value: unknown, key: string, input: UniversalTextInput): Promise<string> {
      const route = normalizeUniversalRoute(value)
      universalPrompt(input.prompt)
      if (!route.custom.capabilities.text || input.images?.length && !route.custom.capabilities.vision) throw new UniversalApiError('CAPABILITY_UNSUPPORTED')
      const images = await universalImages(input.images, route)
      const request = universalTextRequest(route, key, input, images)
      return universalParseText(route, await send(request))
    },
    async image(value: unknown, key: string, input: UniversalImageInput): Promise<{ base64: string; mimeType: string }> {
      const route = normalizeUniversalRoute(value)
      universalPrompt(input.prompt)
      if (input.sourceImages?.length ? !route.custom.capabilities.imageEditing : !route.custom.capabilities.imageGeneration) throw new UniversalApiError('CAPABILITY_UNSUPPORTED')
      const images = await universalImages(input.sourceImages, route)
      const data = await send(universalImageRequest(route, key, input, images))
      const descriptor = universalImageDescriptor(route, data), limits = route.custom.outputLimits
      let bytes: Uint8Array, mimeType = descriptor.mimeType
      if (descriptor.base64) bytes = universalBase64(descriptor.base64, limits.maxBytes, true)
      else if (descriptor.url?.startsWith('data:')) {
        const comma = descriptor.url.indexOf(',')
        const prefix = comma >= 0 && comma <= 40 ? descriptor.url.slice(0, comma) : ''
        const knownPrefixes: Record<string, string> = { 'data:image/png;base64': 'image/png', 'data:image/jpeg;base64': 'image/jpeg', 'data:image/webp;base64': 'image/webp' }
        mimeType = knownPrefixes[prefix]
        if (!mimeType) universalInvalidResponse()
        bytes = universalBase64(descriptor.url.slice(comma + 1), limits.maxBytes, true)
      } else if (descriptor.url) {
        try {
          const response = await transport.request({ url: descriptor.url, method: 'GET', maxResponseBytes: limits.maxBytes, signal: input.signal, kind: 'asset' })
          bytes = response.bytes; const contentType = response.headers.get('content-type')?.split(';')[0]; mimeType = contentType?.startsWith('image/') ? contentType : undefined
        } catch (error) {
          if (error instanceof UniversalApiError) throw new UniversalApiError(error.code, 'unknown', error.status)
          throw new UniversalApiError('RESULT_UNKNOWN', 'unknown')
        }
      } else return universalInvalidResponse()
      const image = await universalValidateImage(bytes!, mimeType, limits, true)
      return { base64: image.base64, mimeType: image.mimeType }
    },
    async catalog(value: unknown, key: string): Promise<UniversalCatalogResult> {
      const route = normalizeUniversalRoute(value)
      if (route.custom.protocol === 'dashscope-multimodal') return { state: 'unsupported', verified: false, selectedModelVisible: null, models: [], warnings: [], message: new UniversalApiError('CATALOG_UNSUPPORTED').reason }
      const response = await transport.request({ url: universalEndpoint(route, 'models'), method: 'GET', headers: universalHeaders(route, key), maxResponseBytes: 4 * 1024 * 1024, kind: 'catalog' })
      let data: unknown
      try { data = JSON.parse(Buffer.from(response.bytes).toString('utf8')) } catch { throw new UniversalApiError('RESPONSE_INVALID') }
      const rows = universalCatalogRows(data, route.custom.protocol)
      const selectedModelVisible = rows.models.some(model => model.id === route.modelId)
      return { state: rows.models.length ? 'catalog-visible' : rows.warnings.length ? 'catalog-invalid' : 'catalog-empty', verified: false, selectedModelVisible, ...rows, message: rows.models.length ? selectedModelVisible ? '账号目录中可见当前模型；能力和限额仍须手动声明，尚未验证真实调用。' : '账号目录可见，但当前页未找到所选模型；不能据此确认模型可用或无权限。' : rows.warnings.length ? '目录记录全部未通过格式校验，无法确认当前模型；尚未发送模型请求。' : '渠道返回空目录，无法确认当前模型；尚未发送模型请求。' }
    },
  }
}
