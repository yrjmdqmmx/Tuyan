import { IMAGE_CHANNEL_ROUTES } from './image-channel-routes.js'

/** Provider protocols shared with the standalone Core/Laf handler through catalog generation. */
export type ImageChannelInput = {
  provider: string; model: string; region?: 'cn' | 'global'; apiKey: string; prompt: string; aspectRatio: string; resolution: string
  size: {size?: string; width?: number; height?: number}
  source?: {base64: string; mimeType: string; dataUrl: string; remoteUrl?: string} | null
}
export type ImageChannelTransport = {
  request(url: string, init: RequestInit, label: string, attempts: number): Promise<Response>
  json(response: Response, limit: number, label: string): Promise<any>
  download(url: string): Promise<string>
  publicSource(source: NonNullable<ImageChannelInput['source']>): Promise<string>
  validate(base64: string): string
  sleep(ms: number): Promise<void>
  now(): number
  pollIntervalMs?: number
  pollTimeoutMs?: number
}

/** Exact per-channel, per-operation wire contract generated from the audited config. */
export type ImageChannelWire = {
  endpoint: string
  promptField?: string
  sizeMode: 'none' | 'dimensions' | 'object' | 'string' | 'ratio' | 'preset'
  sizeField?: string
  sizeValues?: Record<string, string>
  widthField?: string
  heightField?: string
  ratioSeparator?: string
  ratioPrefix?: string
  resolutionField?: string
  resolutionValues?: Record<string, string>
  sourceField?: string
  sourceArray?: boolean
  sourceEncoding?: 'base64' | 'public-url'
  constants?: Record<string, unknown>
  jsonEnvelope?: string
  version?: string
  maxPromptLength?: number
  maxSourceBytes?: number
}

export async function buildImageChannelBody(input: ImageChannelInput, wire: ImageChannelWire, io: Pick<ImageChannelTransport, 'publicSource'>): Promise<Record<string, unknown>> {
  if (!input.prompt.trim()) throw new Error('Image prompt is empty')
  if (wire.maxPromptLength && [...input.prompt].length > wire.maxPromptLength) throw new Error(`${input.provider} image prompt exceeds ${wire.maxPromptLength} characters`)
  const body: Record<string, unknown> = { ...wire.constants, [wire.promptField || 'prompt']: input.prompt }
  const { size } = input
  if (wire.sizeMode === 'dimensions' || wire.sizeMode === 'object') {
    if (!size.width || !size.height) throw new Error('Missing resolved image dimensions')
    if (wire.sizeMode === 'object') body[wire.sizeField!] = {width: size.width, height: size.height}
    else { body[wire.widthField || 'width'] = size.width; body[wire.heightField || 'height'] = size.height }
  } else if (wire.sizeMode === 'string') {
    if (size.size) body[wire.sizeField!] = size.size
  } else if (wire.sizeMode === 'ratio' || wire.sizeMode === 'preset') {
    // A resolved auto may deliberately omit the ratio or explicitly choose square.
    if (size.size) {
      const ratio = size.size
      const value = wire.sizeMode === 'preset' ? wire.sizeValues?.[ratio] : (wire.ratioPrefix || '') + ratio.replace(':', wire.ratioSeparator || ':')
      if (!value) throw new Error('No wire value for selected aspect ratio')
      body[wire.sizeField!] = value
    }
  }
  if (wire.resolutionField && input.resolution !== 'auto') {
    const value = wire.resolutionValues ? wire.resolutionValues[input.resolution] : input.resolution
    if (!value) throw new Error('No wire value for selected resolution')
    body[wire.resolutionField] = value
  }
  if (input.source) {
    if (!wire.sourceField) throw new Error(`${input.provider} operation does not accept a source image`)
    if (wire.maxSourceBytes && Buffer.from(input.source.base64, 'base64').length > wire.maxSourceBytes) throw new Error(`${input.provider} source image exceeds the channel limit`)
    const value = wire.sourceEncoding === 'base64' ? input.source.base64 : wire.sourceEncoding === 'public-url' ? await io.publicSource(input.source) : input.source.dataUrl
    body[wire.sourceField] = wire.sourceArray ? [value] : value
  }
  return body
}

function imageTaskUrl(value: unknown, provider: string): string {
  if (typeof value !== 'string') throw new Error(`${provider} returned no task URL`)
  const url = new URL(value)
  const allowed = provider === 'bfl' ? (url.hostname === 'api.bfl.ai' || /^api\.[a-z0-9.-]+\.bfl\.ai$/.test(url.hostname))
    : provider === 'fal' ? url.hostname === 'queue.fal.run' : url.hostname === 'api.replicate.com'
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !allowed) throw new Error(`${provider} returned an invalid task URL`)
  return url.href
}

/** Submission is never retried: a lost response may already represent a paid task. */
export async function callExtendedImageChannel(input: ImageChannelInput, io: ImageChannelTransport): Promise<string> {
  const { provider, model, apiKey, prompt, source, size } = input
  const label = `${provider} image ${model}`
  const headers: Record<string,string> = provider === 'bfl' ? {'x-key':apiKey} : provider === 'ideogram' ? {'Api-Key':apiKey} : {Authorization: `${provider === 'fal' ? 'Key' : 'Bearer'} ${apiKey}`}
  const jsonHeaders = {...headers, 'Content-Type':'application/json'}
  const sourceBytes = source ? Buffer.from(source.base64, 'base64') : null
  if (source && !['image/png','image/jpeg','image/webp'].includes(source.mimeType)) throw new Error(`${provider} accepts PNG, JPEG or WebP source images`)
  if (sourceBytes && sourceBytes.length > 25 * 1024 * 1024) throw new Error('Source image exceeds 25 MB')
  const wire: ImageChannelWire | undefined = IMAGE_CHANNEL_ROUTES[provider + '/' + model]?.[source ? 'editing' : 'generation']
  const read = (response:Response) => io.json(response, 80 * 1024 * 1024, label)
  const submit = (url:string, body:any, multipart=false) => io.request(url, {method:'POST', headers:multipart ? headers : jsonHeaders, body:multipart ? body : JSON.stringify(body), redirect:'error'}, label, 1).then(read)
  const asset = async (value:unknown): Promise<string> => {
    if (typeof value !== 'string' || !value) throw new Error(`${provider} completed without an image`)
    if (value.startsWith('data:')) {
      const match = /^data:image\/(?:png|jpeg|webp);base64,([A-Za-z0-9+/=\r\n]+)$/.exec(value)
      if (!match) throw new Error(`${provider} returned invalid image data`)
      return io.validate(match[1])
    }
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error(`${provider} returned an invalid image URL`)
    return io.download(url.href) // Never send API credentials to image hosts.
  }
  const attach = (form:FormData, field='image') => {
    if (source && sourceBytes) form.append(field, new Blob([new Uint8Array(sourceBytes)],{type:source.mimeType}), `source.${source.mimeType.split('/')[1]}`)
  }
  if (provider === 'ideogram') {
    const contract = wire || (model === 'ideogram-v4' ? {endpoint:`/v1/ideogram-v4/${source?'remix':'generate'}`,sizeMode:'string',sizeField:'resolution',promptField:'text_prompt',constants:{rendering_speed:'DEFAULT'},...(source?{sourceField:'image'}:{})} as ImageChannelWire : undefined)
    if (!contract) throw new Error('Unsupported Ideogram image operation')
    const body = await buildImageChannelBody(input, contract, io)
    let data: any
    if (contract.jsonEnvelope) data = await submit('https://api.ideogram.ai' + contract.endpoint, {[contract.jsonEnvelope]:body})
    else {
      const form = new FormData()
      for (const [key,value] of Object.entries(body)) if (key !== contract.sourceField) form.append(key, String(value))
      attach(form, contract.sourceField)
      data = await submit('https://api.ideogram.ai' + contract.endpoint, form, true)
    }
    if (data.data?.[0]?.is_image_safe === false) throw new Error('Ideogram image was moderated')
    return asset(data.data?.[0]?.url)
  }
  if (provider === 'stability') {
    if (prompt.length > 10000) throw new Error('Stability prompt exceeds 10000 characters')
    if (sourceBytes && sourceBytes.length > 9 * 1024 * 1024) throw new Error('Stability source must leave room for multipart fields within the 10 MiB request limit')
    const form = new FormData();form.append('prompt',prompt);form.append('output_format','png')
    const sd35 = /^sd3\.5-(large|large-turbo|medium|flash)$/.test(model)
    if (!sd35 && !['stable-image-ultra','stable-image-core'].includes(model)) throw new Error('Unsupported Stability model')
    if (input.aspectRatio !== 'auto' && !(source && sd35)) form.append('aspect_ratio',input.aspectRatio)
    if (source) { if (model === 'stable-image-core') throw new Error('Stable Image Core has no direct editing'); attach(form);form.append('strength',model==='sd3.5-flash'?'0.95':'0.65') }
    if (sd35) { form.append('model', model); form.append('mode', source?'image-to-image':'text-to-image') }
    const endpoint=sd35?'sd3':model==='stable-image-ultra'?'ultra':'core'
    const response=await io.request(`https://api.stability.ai/v2beta/stable-image/generate/${endpoint}`,{method:'POST',headers:{...headers,Accept:'application/json'},body:form,redirect:'error'},label,1)
    const data=await read(response)
    if (data.finish_reason && data.finish_reason !== 'SUCCESS') throw new Error(`Stability generation ${data.finish_reason}`)
    return io.validate(data.image || '')
  }
  if (provider === 'minimax') {
    if (source) throw new Error('MiniMax character reference is not a general image editor')
    if (prompt.length > 1500) throw new Error('MiniMax image prompt exceeds 1500 characters')
    const region = input.region || 'global'
    if (!['cn','global'].includes(region)) throw new Error('Unsupported MiniMax region')
    if (model !== 'image-01' && !(region === 'cn' && model === 'image-01-live')) throw new Error('MiniMax image model is unavailable in this region')
    const dimensions = model === 'image-01-live' ? {aspect_ratio: input.aspectRatio === 'auto' ? '1:1' : input.aspectRatio} : {width:size.width,height:size.height}
    const data=await submit(`https://${region === 'cn' ? 'api.minimax.cn' : 'api.minimax.io'}/v1/image_generation`,{model,prompt,...dimensions,n:1,response_format:'base64'})
    if (data.base_resp?.status_code !== 0) throw new Error(`MiniMax image error ${data.base_resp?.status_code ?? 'missing status'}`)
    return io.validate(data.data?.image_base64?.[0] || '')
  }
  if (provider === 'together') {
    if (!wire) throw new Error('Unsupported Together image operation')
    const body = await buildImageChannelBody(input, wire, io)
    const data=await submit('https://api.together.ai/v1/images/generations',body)
    const result=data.data?.[0]
    return result?.b64_json ? io.validate(result.b64_json) : asset(result?.url)
  }
  let state:any, polling:string, resultUrl:string|undefined
  if (!wire) throw new Error(`Unsupported ${provider} image operation`)
  const body = await buildImageChannelBody(input, wire, io)
  if (provider === 'bfl') {
    state=await submit('https://api.bfl.ai'+wire.endpoint,body)
    polling=imageTaskUrl(state.polling_url,provider)
  } else if (provider === 'fal') {
    state=await submit('https://queue.fal.run/'+wire.endpoint,body)
    let fallback: string | undefined
    if (state.status_url == null || state.response_url == null) {
      if (typeof state.request_id !== 'string' || !/^[A-Za-z0-9_-]{1,200}$/.test(state.request_id)) throw new Error('fal returned an invalid task ID')
      // Match fal's official SDK: queue reads belong to the app, without /edit or other endpoint paths.
      const parts = wire.endpoint.split('/')
      const app = parts.slice(0, ['workflows','comfy'].includes(parts[0]) ? 3 : 2).join('/')
      fallback = `https://queue.fal.run/${app}/requests/${state.request_id}`
    }
    polling=imageTaskUrl(state.status_url ?? fallback + '/status',provider)
    resultUrl=imageTaskUrl(state.response_url ?? fallback,provider)
    // A successful submission may only acknowledge request_id.
    if (state.status == null) state.status='IN_QUEUE'
  } else if (provider === 'replicate') {
    state=await submit(wire.version ? 'https://api.replicate.com/v1/predictions' : `https://api.replicate.com/v1/models/${wire.endpoint}/predictions`,{...(wire.version?{version:wire.version}:{}),input:body})
    polling=imageTaskUrl(state.urls?.get,provider)
  } else throw new Error(`Unsupported image channel: ${provider}`)
  const deadline=io.now()+(io.pollTimeoutMs ?? 600000)
  const timeout = () => new Error(`${provider} image task timed out; do not submit a duplicate task`)
  const readTask = async (url:string, phase:string): Promise<any> => {
    let retries = 0
    while (io.now() < deadline) {
      const response = await io.request(url,{headers,redirect:'error',signal:AbortSignal.timeout(Math.max(1,deadline-io.now()))},label+' '+phase,2)
      // Transport retries do not inspect HTTP status. Only these read-only requests can be repeated.
      if (response.status !== 408 && response.status !== 429 && response.status < 500) return read(response)
      const retryAfter = response.headers.get('retry-after')
      const instructedDelay = retryAfter == null ? NaN : /^\d+(?:\.\d+)?$/.test(retryAfter)
        ? Number(retryAfter) * 1000 : Date.parse(retryAfter) - io.now()
      await response.body?.cancel().catch(() => {})
      const backoff = Math.min(30000, Math.max(1,io.pollIntervalMs ?? 1500) * 2 ** Math.min(retries++,5))
      const delay = Number.isFinite(instructedDelay) ? Math.max(backoff,instructedDelay) : backoff
      await io.sleep(Math.min(delay,Math.max(0,deadline-io.now())))
    }
    throw timeout()
  }
  while (io.now() < deadline) {
    if (provider==='bfl' && state.status==='Ready') return asset(state.result?.sample)
    if (provider==='replicate' && state.status==='succeeded') {
      const result = state.output?.image || state.output?.images || state.output
      const first = Array.isArray(result) ? result[0] : result
      return asset(first?.url || first)
    }
    if (provider==='fal' && state.status==='COMPLETED') {
      const result=await readTask(resultUrl!,'result')
      if (result.has_nsfw_concepts?.some(Boolean)) throw new Error('fal image was moderated')
      return asset(result.images?.[0]?.url || result.image?.url)
    }
    const pending=provider==='bfl'?['Pending','Running']:provider==='fal'?['IN_QUEUE','IN_PROGRESS']:['starting','processing']
    // The initial BFL submission has id/polling_url without a status.
    if (state.status && !pending.includes(state.status)) throw new Error(`${provider} image task ${String(state.status).slice(0,100)}`)
    if (!state.status && provider!=='bfl') throw new Error(`${provider} returned no task status`)
    state=await readTask(polling,'poll')
    if (!state.status) throw new Error(`${provider} returned no task status`)
    if (pending.includes(state.status)) await io.sleep(Math.min(io.pollIntervalMs ?? 1500, Math.max(0,deadline-io.now())))
  }
  throw timeout()
}
