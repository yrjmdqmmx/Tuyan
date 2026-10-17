import { auditedChannelContract, assertChannelRequest } from './audited-channel-contracts.js'
import type { ImageChannelCheckpoint, ImageChannelTransport } from './image-channel-adapters.js'

export type ReplicateTextInput = {provider:'replicate';model:string;apiKey:string;system:string;user:string;images:{url:string}[];signal?:AbortSignal}
type TextIO = Pick<ImageChannelTransport,'request'|'json'|'pending'|'checkpoint'|'record'|'sleep'|'now'|'pollTimeoutMs'|'pollIntervalMs'>
const inputFailure = (message:string) => Object.assign(new Error(message),{localInputFailure:true,requestState:'not_sent'})

/** Exact pinned schemas, not the image prediction decoder. No audio/video or tools. */
export function buildReplicateTextBody(input:ReplicateTextInput) {
  const c=auditedChannelContract('replicate',input.model)
  if(c?.taskType!=='text-prediction'||!c.roles?.includes(input.images.length?'vision':'main')||!c.version)throw inputFailure('此Replicate型号未适配当前文本/视觉角色。')
  if(!input.user.trim()||input.images.length>c.maxImages)throw inputFailure('文本为空或图片数量超过当前型号限制。')
  for(const image of input.images) {
    if(!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(image.url))throw inputFailure('Replicate视觉输入需经图研校验的PNG/JPEG/WebP数据。')
    if(Buffer.from(image.url.split(',')[1],'base64').length>7_000_000)throw inputFailure('Replicate单张图片超过7MB，未发送。')
  }
  const props=c.schema.properties
  const systemField=props.system_instruction?'system_instruction':props.system_prompt?'system_prompt':undefined
  const body:any={prompt:systemField?input.user:input.system+'\n\n'+input.user}
  if(systemField)body[systemField]=input.system
  if(input.images.length)body.images=input.images.map(i=>i.url)
  const outputField=props.max_output_tokens?'max_output_tokens':'max_tokens'
  body[outputField]=Math.min(8192,props[outputField]?.maximum??8192)
  if(props.dynamic_thinking)body.dynamic_thinking=false
  assertChannelRequest(c,body)
  return {version:c.version,input:body}
}

export async function callReplicateTextChannel(input:ReplicateTextInput,io:TextIO):Promise<string> {
  if(!io.pending||!io.checkpoint)throw inputFailure('当前后端缺少持久任务恢复能力，未提交Replicate文本任务。')
  const body=buildReplicateTextBody(input)
  if(input.signal?.aborted)throw inputFailure('文本任务已取消，未提交。')
  let pending=await io.pending()
  if(pending&&(pending.provider!=='replicate'||pending.model!==input.model||pending.failed))throw Object.assign(new Error('原文本任务身份不匹配或已失败，未重新提交。'),{terminal:true})
  const save=async(value:Partial<ImageChannelCheckpoint>)=>{const next={...pending,provider:'replicate',model:input.model,...value};await io.checkpoint!(next);pending=next}
  const terminal=async(message:string):Promise<never>=>{await save({failed:true});throw Object.assign(new Error(message),{terminal:true,requestState:'rejected'})}
  const uncertain=()=>Object.assign(new Error('Replicate提交结果未知，缺少原任务ID；请核对渠道记录，不会重新提交。'),{terminal:true,requestState:'unknown',uncertain:true,recoveryAction:'reconcile_provider'})
  const taskUrl=(id:unknown)=>{
    if(typeof id!=='string'||!/^[A-Za-z0-9_-]{1,200}$/.test(id))throw new Error('Replicate返回的任务ID无效。')
    return 'https://api.replicate.com/v1/predictions/'+id
  }
  const headers={Authorization:'Bearer '+input.apiKey,'Content-Type':'application/json'}
  const signal=input.signal?AbortSignal.any([input.signal,AbortSignal.timeout(600000)]):AbortSignal.timeout(600000)
  const record=async(state:any)=>io.record?.({provider:'replicate',model:input.model,requestId:pending?.taskId,operation:input.images.length?'vision':'text',modelVersion:state.version||body.version,metrics:state.metrics||null,usage:null,reportedCost:null,estimatedCost:null,invoiceCost:null})
  try {
    if(pending&&!pending.polling)throw uncertain()
    if(pending?.polling!==undefined&&pending.polling!==taskUrl(pending.taskId))throw Object.assign(new Error('已保存任务地址无效，未发送。'),{terminal:true})
    if(!pending) {
      await save({state:{phase:'submitting'}})
      const response=await io.request('https://api.replicate.com/v1/predictions',{method:'POST',headers,body:JSON.stringify(body),redirect:'error',signal},'replicate text submit',1)
      if(response.status>=400&&response.status<500){await response.body?.cancel();return terminal('Replicate拒绝文本提交，未自动重发。')}
      if(!response.ok){await response.body?.cancel();throw uncertain()}
      const state=await io.json(response,8*1024*1024,'replicate text submit')
      const polling=taskUrl(state.id)
      // Construct the documented task URL from the ID, never trust a supplied redirect/asset URL.
      await save({taskId:state.id,polling,state})
    }
    const deadline=io.now()+(io.pollTimeoutMs??600000)
    while(io.now()<deadline) {
      if(signal.aborted)throw new Error('文本等待已取消，原任务可能继续执行。')
      const state=pending!.state
      if(state?.version&&state.version!==body.version)return terminal('Replicate返回版本与固定审核版本不一致，未重新提交。')
      if(state?.status==='succeeded') {
        if(!Array.isArray(state.output)||!state.output.every((s:unknown)=>typeof s==='string'))return terminal('Replicate未返回schema约定的文本数组，未当作图片下载或成功答案。')
        const text=state.output.join('')
        if(!text.trim()||Buffer.byteLength(text)>8*1024*1024)return terminal('Replicate文本结果为空或超过本地响应限制。')
        // State was checkpointed before returning; record/output failures resume this same result.
        await record(state)
        return text
      }
      if(!['starting','processing'].includes(state?.status))return terminal('Replicate文本任务失败或状态无效，未重新提交。')
      await io.sleep(Math.min(io.pollIntervalMs??1500,Math.max(0,deadline-io.now())))
      if(io.now()>=deadline)break
      const response=await io.request(pending!.polling!,{method:'GET',headers,redirect:'error',signal},'replicate text poll',1)
      if(response.status===429||response.status>=500){await response.body?.cancel();continue}
      if(!response.ok){await response.body?.cancel();throw new Error('暂时无法查询原Replicate任务。')}
      const next=await io.json(response,8*1024*1024,'replicate text poll')
      if(next.id!==pending!.taskId)throw new Error('Replicate查询结果ID与原任务不一致。')
      await save({state:next})
    }
    throw new Error('Replicate文本任务等待超时。')
  } catch(error:any) {
    if(error?.requestState==='not_sent'||error?.terminal)throw error
    if(pending?.polling&&!pending.failed)throw Object.assign(new Error('原Replicate文本任务已保存，可继续查询；不会重新提交。'),{pollOnly:true,recoveryAction:'resume',requestState:'unknown',uncertain:false})
    if(pending&&!pending.failed)throw uncertain()
    throw error
  }
}
