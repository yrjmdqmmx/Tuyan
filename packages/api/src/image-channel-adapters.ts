import { callOfficialImageChannel } from './official-image-channels.js'
import { callQianfanImageChannel } from './qianfan-image-channel.js'
import { auditedChannelContract, assertChannelRequest, assertChannelSourceConstraints } from './audited-channel-contracts.js'
import { IMAGE_CHANNEL_ROUTES } from './image-channel-routes.js'
import { briaStructuredInstruction, refineControlsFor, refineInputIssue, type RefineInputs } from './refine-controls.js'

/** Provider protocols shared with the standalone Core/Laf handler through catalog generation. */
export type ImageChannelInput = {
  provider: string; model: string; region?: 'cn' | 'global'; apiKey: string; prompt: string; aspectRatio: string; resolution: string
  size: {size?: string; width?: number; height?: number}
  edit?: { references?: NonNullable<ImageChannelInput['source']>[]; mask?: NonNullable<ImageChannelInput['source']>; inputs: RefineInputs }
  source?: {base64: string; mimeType: string; dataUrl: string; remoteUrl?: string} | null
}
export type ImageChannelCheckpoint = { provider: string; model: string; taskId?: string; polling?: string; resultUrl?: string; state?: any; result?: {url: string; metadata?: any}; failed?: boolean }
export type ImageChannelTransport = {
  pending?(): Promise<ImageChannelCheckpoint | undefined>
  checkpoint?(value: ImageChannelCheckpoint): Promise<void>
  record?(info: unknown): Promise<void>
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
    const images = [input.source, ...(input.edit?.references || [])]
    if (images.length > 1 && !wire.sourceArray) throw new Error('该接口不接收多张图片，未发起请求。')
    const values = await Promise.all(images.map(image => wire.sourceEncoding === 'base64' ? image.base64 : wire.sourceEncoding === 'public-url' ? io.publicSource(image) : image.dataUrl))
    body[wire.sourceField] = wire.sourceArray ? values : values[0]
  }
  if (input.edit?.mask) body.mask_url = input.edit.mask.dataUrl
  if (input.edit?.inputs.structured) {
    delete body[wire.promptField || 'prompt']
    body.structured_instruction = briaStructuredInstruction(input.edit.inputs.structured, input.prompt)
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

export function buildAuditedRunwareImage(input:ImageChannelInput,taskUUID:string) {
  const c=auditedChannelContract('runware',input.model)
  if(!c||!(input.source?c.editing:c.generation))throw Object.assign(new Error('该型号不支持所选图像操作。'),{localInputFailure:true,requestState:'not_sent'})
  const body:any={taskType:'imageInference',taskUUID,model:input.model,positivePrompt:input.prompt,outputType:'URL',outputFormat:'PNG',deliveryMethod:'async',includeCost:true,numberResults:1}
  if(input.size.width&&input.size.height){body.width=input.size.width;body.height=input.size.height}
  if(input.model==='alibaba:qwen-image-edit@2511'||input.model==='alibaba:qwen-image@2512')body.steps=30
  if(input.source) {
    const images=[input.source,...(input.edit?.references||[])]
    assertChannelSourceConstraints(c,images)
    body.inputs={}
    if(c.sourceField==='referenceImages')body.inputs.referenceImages=images.map(i=>i.dataUrl)
    else {
      body.inputs[c.sourceField]=input.source.dataUrl
      if(images.length>1){if(!c.auxiliaryField)throw new Error('该型号不支持辅助参考图。');body.inputs[c.auxiliaryField]=images.slice(1).map(i=>i.dataUrl)}
    }
    if(input.edit?.mask){if(!c.maskField)throw new Error('该型号未核验遮罩语义。');body.inputs[c.maskField]=input.edit.mask.dataUrl}
  }
  // Sequential output is a separate, potentially billed product operation.
  if(c.schema.properties.settings?.properties.sequential)body.settings={sequential:false}
  assertChannelRequest(c,body)
  return body
}
export async function buildAuditedTokenHubImage(input:ImageChannelInput,io:Pick<ImageChannelTransport,'publicSource'>) {
  const c=auditedChannelContract('tokenhub',input.model)
  if(!c)throw new Error('TokenHub 专用型号契约缺失。')
  if(!input.prompt.trim()||[...input.prompt].length>c.maxPromptLength)throw Object.assign(new Error(`当前型号提示词须为1–${c.maxPromptLength}字；未发送。`),{localInputFailure:true,requestState:'not_sent'})
  const images=input.source?[input.source,...(input.edit?.references||[])]:[]
  if(images.length>Math.min(9,c.maxImages))throw Object.assign(new Error('图片超出型号或产品上限，未发送。'),{localInputFailure:true,requestState:'not_sent'})
  assertChannelSourceConstraints(c,images)
  const model=input.model,prompt=input.prompt,size=input.size.size
  if(c.taskType==='hy35')return {endpoint:'/v1/wand/hunyuan-image/v35-generation',body:{model,messages:[{role:'user',content:[{type:'text',text:prompt},...images.map(i=>({type:'image_url',image_url:{url:i.dataUrl}}))]}],...(size?{size}:{})}}
  if(c.taskType==='seedream')return {endpoint:'/v1/wand/si-image/generation',body:{model,prompt,...(size?{size}:{}),...(images.length?{images:images.map(i=>i.dataUrl)}:{}),output_format:'png',response_format:'url',...(model.endsWith('lite')?{sequential_image_generation:'disabled'}:{})}}
  if(c.taskType==='vidu')return {endpoint:'/v1/wand/vidu-image/generation',pollPrefix:'/v1/wand/vidu-image/tasks/',body:{model,prompt,aspect_ratio:size||'1:1',resolution:input.resolution==='1K'?'1080p':input.resolution,...(images.length?{images:images.map(i=>i.dataUrl)}:{})}}
  if(c.taskType==='vega') {
    const content=await Promise.all(images.map(async i=>({type:'input_image',image_url:await io.publicSource(i)})))
    return {endpoint:'/v1/wand/vega-images/generations',pollPrefix:'/v1/wand/vega-images/tasks/',body:{model,prompt,size,...(images.length?{input:[{content}]}:{})}}
  }
  throw new Error('TokenHub 未支持的专用协议。')
}
async function readImageEventStream(response:Response) {
  const reader=response.body?.getReader();if(!reader)throw new Error('图片响应流为空。')
  let buffer='',bytes=0;const decoder=new TextDecoder();let latest:any={}
  try {while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>80*1024*1024)throw new Error('图片响应过大。');buffer+=decoder.decode(value,{stream:true});let at:number
    while((at=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,at).trim();buffer=buffer.slice(at+1);if(!line.startsWith('data:')||line.slice(5).trim()==='[DONE]')continue;const d=JSON.parse(line.slice(5));if(d.error)throw new Error('TokenHub 返回图像任务错误。');if(d.choices?.some((x:any)=>x.delta?.image?.url))latest=d;else if(d.tokenhub_usage)latest.tokenhub_usage=d.tokenhub_usage}
  }} finally {await reader.cancel().catch(()=>{})}
  if(buffer.trim()&&buffer.trim()!=='data: [DONE]')throw new Error('图片响应流未完整结束。')
  return latest
}
/** Submission is never retried: a lost response may already represent a paid task. */
export async function callExtendedImageChannel(input: ImageChannelInput, io: ImageChannelTransport): Promise<string> {
  if (['runware','tokenhub'].includes(input.provider) && (!io.pending || !io.checkpoint)) throw Object.assign(new Error('当前后端缺少持久任务恢复能力，未发起渠道请求。'), {requestState:'not_sent', localInputFailure:true})
  const issue = refineInputIssue(refineControlsFor(input.provider, input.model), input.edit?.inputs ?? (input.source ? {version:1} : undefined), input.aspectRatio, input.resolution)
  if (issue) throw Object.assign(new Error(issue), {requestState:'not_sent', localInputFailure:true})
  if (input.edit && !input.source) throw new Error('精修控制需要原图。')
  if ((input.edit?.references?.length || 0) !== (input.edit?.inputs.references?.length || 0)) throw new Error('参考图传输数量与输入不一致。')
  if (Boolean(input.edit?.mask) !== Boolean(input.edit?.inputs.mask)) throw new Error('遮罩传输与输入不一致。')
  try {
    if (input.provider==='sensenova'||input.provider==='stepfun') return await callOfficialImageChannel(input,io)
    if (input.provider==='qianfan') return await callQianfanImageChannel(input,io)
    return await executeImageChannel(input, io)
  }
  catch (error: any) {
    if (error?.name === 'ThinkingConfigValidationError' && error?.requestState === 'not_sent') throw error
    const pending = await io.pending?.()
    if (pending && !pending.failed && !error.terminal) {
      throw Object.assign(new Error('已保存原渠道任务；可恢复查询或下载，不会重新生成。'), {name:'ImageChannelError', recoveryAction:'resume', pollOnly:true, uncertain:false, requestState:'unknown'})
    }
    throw error
  }
}
async function executeImageChannel(input: ImageChannelInput, io: ImageChannelTransport): Promise<string> {
  const { provider, model, apiKey, prompt, source, size } = input
  const label = `${provider} image ${model}`
  const headers: Record<string,string> = provider === 'bfl' ? {'x-key':apiKey} : provider === 'ideogram' ? {'Api-Key':apiKey} : {Authorization: `${provider === 'fal' ? 'Key' : 'Bearer'} ${apiKey}`}
  const jsonHeaders = {...headers, 'Content-Type':'application/json'}
  const sourceBytes = source ? Buffer.from(source.base64, 'base64') : null
  if (source && !['image/png','image/jpeg','image/webp'].includes(source.mimeType)) throw new Error(`${provider} accepts PNG, JPEG or WebP source images`)
  if (sourceBytes && sourceBytes.length > 25 * 1024 * 1024) throw new Error('Source image exceeds 25 MB')
  const wire: ImageChannelWire | undefined = IMAGE_CHANNEL_ROUTES[provider + '/' + model]?.[source ? 'editing' : 'generation']
  const previous = await io.pending?.()
  if (previous && (previous.provider !== provider || previous.model !== model || previous.failed)) throw Object.assign(new Error('原渠道任务不可重放，请核对记录。'), {terminal:true})
  let checkpoint = previous
  const save = async (value: Partial<ImageChannelCheckpoint>) => { checkpoint = {...checkpoint, provider, model, ...value}; await io.checkpoint?.(checkpoint) }
  const terminal = async (message: string): Promise<never> => { if (checkpoint) await save({failed:true}); throw Object.assign(new Error(message), {terminal:true}) }
  const read = (response:Response) => response.headers.get('content-type')?.includes('text/event-stream') ? readImageEventStream(response) : io.json(response, 80 * 1024 * 1024, label)
  const submit = async (url:string, body:any, multipart=false) => {
    const response = await io.request(url, {method:'POST', headers:multipart ? headers : jsonHeaders, body:multipart ? body : JSON.stringify(body), redirect:'error', ...(['runware','tokenhub'].includes(provider) ? {signal:AbortSignal.timeout(600000)} : {})}, label, 1)
    if (response.status >= 400 && response.status < 500) { await response.body?.cancel(); return terminal(`${provider} 请求被拒绝（HTTP ${response.status}），请核对密钥、额度、限流与输入；未自动重发。`) }
    return read(response)
  }
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
  const completed = async (url: string, metadata: any = {}) => {
    await save({...(metadata.requestId ? {taskId:metadata.requestId} : {}), result:{url, metadata}})
    await io.record?.({provider, model, requestId:checkpoint?.taskId || null, publicPrice:auditedChannelContract(provider,model)?.price || {source:provider === 'tokenhub' ? 'https://cloud.tencent.com/document/product/1823/130055' : provider === 'runware' ? 'https://runware.ai/pricing' : `https://${provider === 'fal' ? 'fal.ai' : 'replicate.com'}/pricing`, checkedAt:'2026-09-22', amount:null,...(provider === 'tokenhub' && model === 'hy-image-v3' ? {currency:'CNY',unit:'million output tokens',rate:10,example:{outputTokens:20000,amount:0.2},conditions:'Guangzhou online postpaid; hy-image-v3 only; account tariff unverified'} : {})}, estimatedCost:null, reportedCost:metadata.reportedCost ?? null, invoiceCost:null, ...metadata})
    return asset(url)
  }
  if (previous?.result) return completed(previous.result.url, previous.result.metadata)
  if (provider === 'runware') {
    if (!wire) throw new Error('Runware 型号或尺寸契约缺失。')
    if (!prompt.trim() || [...prompt].length > (wire.maxPromptLength || 32000)) throw Object.assign(new Error('Runware 提示词为空或超过型号限制，未发送。'), {localInputFailure:true, requestState:'not_sent'})
    const prepared = buildAuditedRunwareImage(input, previous?.taskId || crypto.randomUUID())
    if (!previous) {
      // UUID is committed BEFORE the potentially billed POST. Even a lost
      // acknowledgment can only lead to getResponse, never a second inference.
      await save({taskId:prepared.taskUUID})
      const data = await submit('https://api.runware.ai/v1', [prepared])
      if (data.errors?.length) return terminal('Runware 拒绝或终止了任务，请核对渠道记录与费用。')
      await save({state:data})
    }
    const deadline = io.now() + (io.pollTimeoutMs ?? 600000)
    let state = checkpoint?.state, attempt = 0
    while (io.now() < deadline) {
      if (state?.errors?.length) return terminal('Runware 原任务失败，请核对渠道记录与费用。')
      const row = state?.data?.find((item:any) => item.taskUUID === checkpoint?.taskId && item.imageURL)
      if (row) return completed(row.imageURL, {reportedCost:typeof row.cost === 'number' && Number.isFinite(row.cost) ? {amount:row.cost,currency:'USD',source:'provider-response'} : null, seed:row.seed ?? null})
      await io.sleep(Math.min(io.pollIntervalMs ?? Math.min(15000,1500 * 2 ** Math.min(attempt++,3)), Math.max(0,deadline-io.now())))
      if (io.now() >= deadline) break
      const response = await io.request('https://api.runware.ai/v1', {method:'POST',headers:jsonHeaders,body:JSON.stringify([{taskType:'getResponse',taskUUID:checkpoint!.taskId}]),redirect:'error',signal:AbortSignal.timeout(Math.max(1,deadline-io.now()))},label+' poll',1)
      if (response.status === 429 || response.status >= 500) { const retry = Number(response.headers.get('retry-after')); await response.body?.cancel(); if (Number.isFinite(retry) && retry > 0) await io.sleep(Math.min(retry*1000,Math.max(0,deadline-io.now()))); continue }
      state = await read(response)
    }
    throw new Error('Runware 原任务仍未确认；仅可恢复查询。')
  }
  if (provider === 'tokenhub') {
    if (!wire) throw new Error('TokenHub 型号契约缺失。')
    const c=auditedChannelContract(provider,model)
    if(!c) {
      if(previous)return terminal('TokenHub 原请求缺少可下载结果，须核对渠道调用记录；未重新提交。')
      const body=await buildImageChannelBody(input,wire,io)
      const data=await submit('https://tokenhub.tencentmaas.com'+wire.endpoint,body)
      if(!data.data?.[0]?.url)throw new Error('TokenHub 未返回图片；结果未知，请核对调用记录，勿重复提交。')
      return completed(data.data[0].url,{requestId:String(data.request_id||data.id||''),usage:data.tokenhub_usage||null,resolvedModel:data.model||null})
    }
    const prepared=await buildAuditedTokenHubImage(input,io)
    const unknown=()=>Object.assign(new Error('TokenHub 提交结果未知且没有可查询任务号；请核对控制台调用记录，不会重新提交。'),{terminal:true,requestState:'unknown',uncertain:true,recoveryAction:'stop'})
    if(previous&&!previous.taskId)throw unknown()
    if(!prepared.pollPrefix) {
      if(previous)throw unknown()
      const data=await submit('https://tokenhub.tencentmaas.com'+prepared.endpoint,prepared.body)
      if(data.error)throw new Error('TokenHub 图片请求失败，请核对渠道记录。')
      const result=c.taskType==='hy35'?data.choices?.find((x:any)=>x.delta?.image?.url)?.delta.image.url:data.data?.[0]?.url
      if(!result)throw unknown()
      return completed(result,{requestId:String(data.request_id||data.id||''),usage:data.tokenhub_usage||data.usage||null,resolvedModel:data.model||null})
    }
    let state=previous?.state
    if(!previous) {
      await save({state:{phase:'submitting'}})
      try {
        state=await submit('https://tokenhub.tencentmaas.com'+prepared.endpoint,prepared.body)
        if(!state.task_id)throw unknown()
        await save({taskId:String(state.task_id),state})
      } catch(error:any) {if(checkpoint?.failed || error?.name === 'ThinkingConfigValidationError' && error?.requestState === 'not_sent')throw error;throw unknown()}
    }
    const deadline=io.now()+(io.pollTimeoutMs??600000)
    while(io.now()<deadline) {
      const status=state?.state||state?.status
      if(['failed','cancelled','incomplete'].includes(status))return terminal('TokenHub 原图像任务失败；未重新提交。')
      if(['success','completed'].includes(status)) {
        const url=c.taskType==='vidu'?state.creations?.[0]?.url:state.data?.[0]?.url
        return completed(url,{requestId:checkpoint!.taskId,usage:state.tokenhub_usage||state.usage||null,responseId:state.request_id||null,resolvedModel:state.model||null})
      }
      await io.sleep(Math.min(io.pollIntervalMs??4000,Math.max(0,deadline-io.now())))
      if(io.now()>=deadline)break
      const response=await io.request('https://tokenhub.tencentmaas.com'+prepared.pollPrefix+encodeURIComponent(checkpoint!.taskId!),{method:'GET',headers,redirect:'error',signal:AbortSignal.timeout(Math.max(1,deadline-io.now()))},label+' poll',1)
      if(response.status===429||response.status>=500){const retry=Number(response.headers.get('retry-after'));await response.body?.cancel();if(Number.isFinite(retry)&&retry>0)await io.sleep(Math.min(retry*1000,Math.max(0,deadline-io.now())));continue}
      state=await read(response);await save({state})
    }
    throw new Error('TokenHub 原图像任务仍未结束；可恢复查询同一任务。')
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
  if (previous?.polling) {
    state=previous.state || {}; polling=imageTaskUrl(previous.polling,provider); resultUrl=previous.resultUrl ? imageTaskUrl(previous.resultUrl,provider) : undefined
  } else if (provider === 'bfl') {
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
  if (!previous) await save({taskId:String(state.request_id || state.id || ''), polling, resultUrl, state})
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
    if (provider==='bfl' && state.status==='Ready') return completed(state.result?.sample)
    if (provider==='replicate' && state.status==='succeeded') {
      const result = state.output?.image || state.output?.images || state.output
      const first = Array.isArray(result) ? result[0] : result
      return completed(first?.url || first, {metrics:state.metrics || null, modelVersion:state.version || null})
    }
    if (provider==='fal' && state.status==='COMPLETED') {
      const result=await readTask(resultUrl!,'result')
      if (result.has_nsfw_concepts?.some(Boolean)) return terminal('fal 图片被安全策略拒绝。')
      return completed(result.images?.[0]?.url || result.image?.url, {structuredInstruction:result.structured_instruction || null, seed:result.seed ?? null})
    }
    const pending=provider==='bfl'?['Pending','Running']:provider==='fal'?['IN_QUEUE','IN_PROGRESS']:['starting','processing']
    // The initial BFL submission has id/polling_url without a status.
    if (state.status && !pending.includes(state.status)) return terminal(`${provider} 原任务终止：${String(state.status).slice(0,100)}；请核对费用。`)
    if (!state.status && provider!=='bfl') throw new Error(`${provider} returned no task status`)
    state=await readTask(polling,'poll')
    if (!state.status) throw new Error(`${provider} returned no task status`)
    if (pending.includes(state.status)) await io.sleep(Math.min(io.pollIntervalMs ?? 1500, Math.max(0,deadline-io.now())))
  }
  throw timeout()
}
