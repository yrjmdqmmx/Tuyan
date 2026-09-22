import { auditedChannelContract, assertChannelRequest } from './audited-channel-contracts.js'
import type { ImageChannelTransport, ImageChannelCheckpoint } from './image-channel-adapters.js'
export type NewTextInput = {provider:'xiaomi'|'tokenhub'|'runware'|'sensenova'|'stepfun'|'qianfan'|'iflytek'|'longcat'; model:string; apiKey:string; system:string; user:string; images:{url:string}[]; signal?:AbortSignal}
function textPublicPrice(provider:string,model:string) { return auditedChannelContract(provider,model)?.price || {source:'',checkedAt:'2026-09-22',amount:null,status:'待确认'} }
export function buildAuditedTextBody(input:NewTextInput,taskId?:string) {
  const {provider,model,system,user,images}=input
  const contract=auditedChannelContract(provider,model)
  if(!contract||!contract.roles?.some((r:string)=>r==='main'||r==='vision')||images.length>(contract.maxImages||0)||images.length<(contract.minImages||0))throw Object.assign(new Error('所选型号不支持此文本/图片输入，未发送。'),{localInputFailure:true,requestState:'not_sent'})
  let body:any
  if(provider==='runware') {
    if(contract.taskType==='caption')body={model,taskType:'caption',taskUUID:taskId,prompt:system+'\n'+user,inputs:{image:images[0].url},deliveryMethod:'async',includeCost:true}
    else body={model,taskType:'textInference',taskUUID:taskId,messages:[{role:'user',content:contract.systemInSettings?user:system+'\n\n'+user}],settings:{...(contract.systemInSettings?{systemPrompt:system}:{}),maxTokens:contract.maxTokens},...(images.length?{inputs:{images:images.map(i=>i.url)}}:{}),outputFormat:'TEXT',deliveryMethod:'async',includeCost:true,includeUsage:true,numberResults:1}
  } else {
    if((provider==='tokenhub'&&model==='kimi-k3'||contract.requireDataUrl)&&images.some(i=>!i.url.startsWith('data:image/')))throw Object.assign(new Error('Kimi K3 图片需要 Base64 Data URI；未发送。'),{localInputFailure:true,requestState:'not_sent'})
    const prompt=contract.systemMode==='user-prefix'?system+'\n\n'+user:user
    const content=images.length?[{type:'text',text:prompt},...images.map(image=>({type:'image_url',image_url:{url:image.url}}))]:prompt
    body=contract.textProtocol==='anthropic-messages' ? {model,system,messages:[{role:'user',content:prompt}],max_tokens:8192,...contract.request} : {model,messages:[...(contract.systemMode==='user-prefix'?[]:[{role:'system',content:system}]),{role:'user',content}],stream:false,...contract.request}
    if(contract.maxCombinedImageBytes && images.reduce((n,i)=>n+(i.url.startsWith('data:')?Buffer.from(i.url.split(',')[1]||'','base64').length:0),0)>contract.maxCombinedImageBytes)throw Object.assign(new Error('图片总大小超过该型号上限，未发送。'),{localInputFailure:true,requestState:'not_sent'})
  }
  assertChannelRequest(contract,body)
  return body
}

/** Consume a bounded, complete SSE response. A truncated stream is never a
 * successful plan and cannot trigger a second billable submission. */
async function auditedTextResponse(response:Response, contract:any, io:Pick<ImageChannelTransport,'json'>, label:string) {
  if (!contract.request?.stream || !response.ok || !response.headers.get('content-type')?.includes('text/event-stream')) return io.json(response,8*1024*1024,label)
  const reader=response.body?.getReader();if(!reader)throw new Error('渠道响应流为空。')
  const decoder=new TextDecoder();let wire='',bytes=0
  try {while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>8*1024*1024)throw new Error('渠道文本响应超过限制。');wire+=decoder.decode(value,{stream:true})}wire+=decoder.decode()}finally{await reader.cancel().catch(()=>{})}
  let text='',finished=false,done=false;const result:any={}
  for(const event of wire.replace(/\r\n/g,'\n').split(/\n\n/)) {
    const payload=event.split('\n').filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trimStart()).join('\n')
    if(!payload)continue;if(payload==='[DONE]'){done=true;continue}
    const data=JSON.parse(payload);if(data.error||data.code)throw new Error('渠道文本响应流失败；未重新提交。')
    for(const key of ['id','request_id','model','usage'])if(data[key]!==undefined)result[key]=data[key]
    const choice=data.choices?.find((c:any)=>c.index===0)||data.choices?.[0]
    if(typeof choice?.delta?.content==='string')text+=choice.delta.content
    if(choice?.finish_reason){if(choice.finish_reason!=='stop')throw new Error('渠道文本未完整结束；未重新提交。');finished=true}
  }
  if(!finished||!done)throw new Error('渠道响应流未完整结束；请核对原请求，未重新提交。')
  return {...result,choices:[{finish_reason:'stop',message:{content:text}}]}
}
/** Explicit audited fields; neither an ID in a catalog nor generic compatibility
 * enables arbitrary models. No inference POST is retried. */
export async function callNewTextChannel(input:NewTextInput, io:Pick<ImageChannelTransport,'request'|'json'|'sleep'|'now'|'pending'|'checkpoint'|'record'|'pollIntervalMs'|'pollTimeoutMs'>):Promise<string> {
  const {provider,model,apiKey,system,user,images}=input
  const signal=input.signal ? AbortSignal.any([input.signal,AbortSignal.timeout(600000)]) : AbortSignal.timeout(600000)
  const contract=auditedChannelContract(provider,model)
  const prepared=buildAuditedTextBody(input,crypto.randomUUID())
  const headers={'Authorization':`Bearer ${apiKey}`,'Content-Type':'application/json',...(contract.textProtocol==='anthropic-messages'?{'anthropic-version':'2023-06-01'}:{})}
  const label=`${provider} text ${model}`
  let pending=await io.pending?.()
  if(pending&&(pending.provider!==provider||pending.model!==model||pending.failed))throw new Error('原文本任务与当前型号不匹配，未重新提交。')
  const save=async(value:Partial<ImageChannelCheckpoint>)=>{pending={...pending,provider,model,...value};await io.checkpoint?.(pending)}
  const record=async(data:any,requestId:string)=>io.record?.({provider,model,requestId,operation:images.length?'vision':'text',resolvedModel:data.model || null,usage:data.usage || data.tokenhub_usage || null,reportedCost:provider==='runware'&&Number.isFinite(data.cost)?{amount:data.cost,currency:'USD',source:'provider-response'}:null,publicPrice:textPublicPrice(provider,model),estimatedCost:null,invoiceCost:null})
  if(provider!=='runware') {
    if (pending) throw new Error('原同步文本任务结果待确认，不能重新提交。')
    const body=prepared
    const endpoint=contract.textEndpoint || (provider==='xiaomi'?'https://api.xiaomimimo.com/v1/chat/completions':'https://tokenhub.tencentmaas.com/v1/chat/completions')
    if(!['xiaomi','tokenhub'].includes(provider)&&!contract.textEndpoint)throw Object.assign(new Error('所选渠道缺少已核对文本端点，未发送。'),{localInputFailure:true,requestState:'not_sent'})
    await save({state:{submitting:true}})
    const response=await io.request(endpoint,{method:'POST',headers,body:JSON.stringify(body),redirect:'error',...(signal?{signal}:{})},label,1)
    const data=await auditedTextResponse(response,contract,io,label)
    if(!response.ok || data.error || data.code)throw new Error(`${provider} 返回错误，请核对调用记录；未自动重发。`)
    await record(data,String(data.id || data.request_id || response.headers.get('x-request-id') || ''))
    if(contract.textProtocol==='anthropic-messages'){
      const content=Array.isArray(data.content)?data.content.filter((b:any)=>b.type==='text'&&typeof b.text==='string').map((b:any)=>b.text).join(''):''
      if(data.stop_reason!=='end_turn'||!content.trim())throw new Error(`${provider} 未返回完整文本，请核对渠道记录；未重新提交。`)
      return content
    }
    const choice=data.choices?.[0]
    if(choice?.finish_reason!=='stop'||typeof choice?.message?.content!=='string'||!choice.message.content.trim())throw new Error(`${provider} 未返回完整文本（${choice?.finish_reason || 'unknown'}），请核对渠道记录；未重新提交。`)
    return choice.message.content
  }
  const finished=async(data:any)=>{
    await record(data,pending?.taskId || '')
    if((contract.taskType!=='caption'&&data.finishReason!=='stop')||typeof data.text!=='string'||!data.text.trim()) {await save({failed:true});throw new Error('Runware 文本未完整结束，未重新提交。')}
    return data.text
  }
  try {
    if(pending?.state?.finishedText)return finished(pending.state.finishedText)
    if(!pending) {
      await save({taskId:prepared.taskUUID})
      const response=await io.request('https://api.runware.ai/v1',{method:'POST',headers,body:JSON.stringify([prepared]),redirect:'error',...(signal?{signal}:{})},label,1)
      if(response.status>=400&&response.status<500) {await save({failed:true});await response.body?.cancel();throw new Error(`Runware 拒绝文本请求（HTTP ${response.status}），未自动重发。`)}
      await save({state:await io.json(response,8*1024*1024,label)})
    }
    const deadline=io.now()+(io.pollTimeoutMs??600000)
    let state=pending?.state,attempt=0
    while(io.now()<deadline) {
      if(signal?.aborted)throw new Error('文本等待已取消；原任务可能继续执行。')
      if(state?.errors?.length){await save({failed:true});throw new Error('Runware 原文本任务失败，请核对渠道记录。')}
      const row=state?.data?.find((item:any)=>item.taskUUID===pending?.taskId&&typeof item.text==='string')
      if(row){await save({state:{finishedText:row}});return finished(row)}
      await io.sleep(Math.min(io.pollIntervalMs??Math.min(15000,1500*2**Math.min(attempt++,3)),Math.max(0,deadline-io.now())))
      if(io.now()>=deadline)break
      const response=await io.request('https://api.runware.ai/v1',{method:'POST',headers,body:JSON.stringify([{taskType:'getResponse',taskUUID:pending!.taskId}]),redirect:'error',signal:signal || AbortSignal.timeout(Math.max(1,deadline-io.now()))},label+' poll',1)
      if(response.status===429||response.status>=500){const retry=Number(response.headers.get('retry-after'));await response.body?.cancel();if(Number.isFinite(retry)&&retry>0)await io.sleep(Math.min(retry*1000,Math.max(0,deadline-io.now())));continue}
      state=await io.json(response,8*1024*1024,label)
    }
    throw new Error('Runware 文本任务结果待确认。')
  } catch(error: any) {
    if (error?.name === 'ThinkingConfigValidationError' && error?.requestState === 'not_sent') throw error
    if(io.checkpoint&&pending&&!pending.failed)throw Object.assign(new Error('原文本任务已保存，可恢复查询；不会重新生成。'),{pollOnly:true,recoveryAction:'resume',requestState:'unknown',uncertain:false})
    throw error
  }
}
