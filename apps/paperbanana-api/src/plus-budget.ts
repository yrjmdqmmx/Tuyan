import {createHash} from 'node:crypto'
import {plusResponseFormat} from './plus-response-format.js'
import type {Db} from 'mongodb'
import {PLUS_IMAGE_MODEL,PLUS_PRESETS} from '../../../packages/api/src/plus.mjs'
import {plusBailianUsage} from '../../../packages/api/src/plus-usage.mjs'
import {meterPlusUsage} from '../../../packages/api/src/plus-metering.mjs'
const integer=(n:any):n is number=>Number.isSafeInteger(n)&&n>=0
const deny=(message:string):never=>{throw Object.assign(new Error(message),{localInputFailure:true,requestState:'not_sent',name:'PlusBudgetValidationError'})}
export function boundedPlusTransport(url:string,init:RequestInit|undefined,body:any){
  const policy=body.plusBilling,limits=policy?.limits,tariff=policy?.tariff,preset=PLUS_PRESETS[body.plusPreset?.mode as keyof typeof PLUS_PRESETS]
  if(!preset||!policy||!tariff?.validated||!limits?.validated||!integer(policy.maxCostMicros)||!policy.maxCostMicros)deny('套餐预算尚未核准，未调用模型。')
  const parsed=new URL(url)
  if(parsed.origin!=='https://dashscope.aliyuncs.com'||typeof init?.body!=='string')deny('套餐不允许此模型端点。')
  let request:any;try{request=JSON.parse(init!.body as string)}catch{deny('套餐模型请求格式不受支持。')}
  let items:any[]=[]
  if(parsed.pathname==='/compatible-mode/v1/chat/completions'){
    if(request.model!==preset.mainModel||!Array.isArray(request.messages)||request.tools||request.functions)deny('套餐文本模型请求不匹配。')
    const responseFormat=plusResponseFormat(request)
    if(responseFormat)request.response_format=responseFormat
    let imageCount=0
    const boundedMessages=JSON.stringify(request.messages,(_key,value)=>{
      if(value&&typeof value==='object'&&value.type==='image_url'){imageCount++;return {type:'image_url',image_url:'[IMAGE]'}}
      return value
    })
    const bytes=Buffer.byteLength(boundedMessages,'utf8')+Buffer.byteLength(JSON.stringify(request.response_format||{}),'utf8'),maxOutput=limits.maxOutputTokens
    if(!integer(limits.maxInputBytes)||!integer(limits.maxImages)||!integer(limits.maxImageInputTokens)||!integer(maxOutput)||maxOutput<1||bytes>limits.maxInputBytes||imageCount>limits.maxImages)deny('本次材料超过套餐单次调用预算，未发送。')
    if(request.stream===true)request.stream_options={...request.stream_options,include_usage:true}
    const thinking=request.enable_thinking===false?0:request.thinking_budget
    if(!integer(thinking)||(request.enable_thinking!==false&&thinking<1))deny('套餐思考用量上限缺失，未发送。')
    // Bailian max_tokens caps visible output separately from thinking_budget.
    // Both contribute to the conservative billed-output bound below.
    request.max_tokens=Math.min(integer(request.max_tokens)&&request.max_tokens>0?request.max_tokens:maxOutput,maxOutput)
    if(imageCount&&limits.maxImageInputTokens<1)deny('视觉输入预算尚未核准。')
    const inputBound=bytes+request.messages.length*1024+imageCount*limits.maxImageInputTokens
    items=[{unit:'input_non_cached',quantity:inputBound},{unit:'output_total',quantity:request.max_tokens+thinking}]
  }else if(parsed.pathname==='/api/v1/services/aigc/multimodal-generation/generation'){
    if(request.model!==PLUS_IMAGE_MODEL)deny('套餐绘图模型不匹配。')
    const parameters=request.parameters||{},size=String(parameters.size||'').split('*').map(Number)
    if(size.length!==2||size.some(n=>!integer(n)||n<1)||size[0]*size[1]>4194304)deny('套餐绘图尺寸不受支持。')
    const images=(request.input?.messages||[]).flatMap((m:any)=>m.content||[]).filter((c:any)=>typeof c.image==='string').length
    if(!integer(limits.maxImages)||images>limits.maxImages)deny('输入图片数量超出本次预算。')
    request.parameters={...parameters,n:1,watermark:false,prompt_extend:true,prompt_extend_mode:'direct',enable_thinking:true}
    delete request.parameters.seed // Independent candidates use provider randomness.
    items=[{unit:'qima_input_2k',quantity:images},{unit:'qima_output_2k',quantity:1}]
  }else deny('套餐不允许此模型协议。')
  const measured=meterPlusUsage({calls:[{state:'confirmed',evidence:'provider_usage',receiptId:'upper-bound-only',modelId:request.model,items}],tariff,creditCostMicros:1,maxCredits:Number.MAX_SAFE_INTEGER})
  if(!integer(measured.modelCostMicros)||measured.modelCostMicros>policy.maxCostMicros)deny('单次调用预算超过本任务预留，未发送。')
  return {init:{...init,body:JSON.stringify(request)},upperMicros:measured.modelCostMicros!,modelId:request.model,requestHash:createHash('sha256').update(JSON.stringify(request)).digest('hex')}
}
export function createPlusBudget(db:Db){
  const budgets=db.collection<any>('paperbanana_plus_budgets'),calls=db.collection<any>('paperbanana_plus_calls')
  const settlementKey=(id:string)=>'settled_'+createHash('sha256').update(id).digest('hex')
  async function settleBound(task:any,row:any,costMicros:number){
    if(!integer(costMicros)||!integer(row.upperMicros))throw Error('Invalid Plus budget receipt')
    // One atomic budget-document update is the authority for released capacity.
    // Persisted receipts can be replayed after a crash; the per-step marker makes
    // concurrent/repeated replay harmless. Unknown calls retain their full bound.
    await budgets.updateOne({_id:task.jobId,userId:task.body.userId,[settlementKey(row._id)]:{$exists:false},blocked:{$ne:true}},{$inc:{committedMicros:costMicros-row.upperMicros},$set:{[settlementKey(row._id)]:costMicros,...(costMicros>row.upperMicros?{blocked:true}:{})}})
    if(costMicros>row.upperMicros)throw Object.assign(Error('模型用量超过预留依据，已停止后续调用并等待核对。'),{requestState:'unknown',billingStatus:'unknown'})
  }
  async function reconcileReceipts(task:any){
    if(await budgets.findOne({_id:task.jobId,userId:task.body.userId,blocked:true}))throw Object.assign(Error('本任务用量回执待核对，已停止后续调用。'),{requestState:'unknown',billingStatus:'unknown'})
    const rows=await calls.find({jobId:task.jobId,userId:task.body.userId,$or:[{state:'reported'},{state:'not_sent',reason:'stopped_before_transport'}]}).toArray()
    for(const row of rows){
      if(row.state==='not_sent'){await settleBound(task,row,0);continue}
      const usage=plusBailianUsage(row.receipt)
      if(usage.state!=='confirmed')continue
      const metered=meterPlusUsage({calls:[usage],tariff:task.body.plusBilling.tariff,creditCostMicros:1,maxCredits:Number.MAX_SAFE_INTEGER})
      if(integer(metered.modelCostMicros))await settleBound(task,row,metered.modelCostMicros)
    }
  }
  return {
    async find(userId:string,operationKey:string){const row=await budgets.findOne({userId,operationKey});return row?String(row._id):null},
    async prepare(task:any){
      const policy=task.body.plusBilling;if(!policy)return
      if(!task.body.plusPreset||!integer(policy.maxCostMicros)||policy.maxCostMicros<1||typeof policy.operationKey!=='string')deny('无效套餐执行预算。')
      await budgets.updateOne({_id:task.jobId,userId:task.body.userId,operationKey:policy.operationKey,maxCostMicros:policy.maxCostMicros},{$setOnInsert:{userId:task.body.userId,operationKey:policy.operationKey,maxCostMicros:policy.maxCostMicros,committedMicros:0,pricingVersion:policy.pricingVersion,createdAt:new Date()}},{upsert:true})
    },
    async claim(task:any,stepId:string|undefined,url:string,init:RequestInit|undefined){
      if(!task.body.plusBilling)return init
      if(!stepId)deny('套餐调用缺少持久步骤标识。')
      await reconcileReceipts(task)
      const bounded=boundedPlusTransport(url,init,task.body),id=stepId!
      try{await calls.insertOne({_id:id,userId:task.body.userId,jobId:task.jobId,state:'claiming',modelId:bounded.modelId,upperMicros:bounded.upperMicros,requestHash:bounded.requestHash,createdAt:new Date()})}catch(error:any){if(error.code!==11000)throw error;deny('原调用已登记，不会再次发送。')}
      const updated=await budgets.updateOne({_id:task.jobId,userId:task.body.userId,maxCostMicros:task.body.plusBilling.maxCostMicros,blocked:{$ne:true},committedMicros:{$lte:task.body.plusBilling.maxCostMicros-bounded.upperMicros}},{$inc:{committedMicros:bounded.upperMicros}})
      if(updated.modifiedCount!==1){await calls.updateOne({_id:id},{$set:{state:'not_sent',reason:'budget_limit'}});deny('本任务已达预留上限，未追加模型调用。')}
      await calls.updateOne({_id:id,state:'claiming'},{$set:{state:'submitted'}})
      return bounded.init
    },
    async notSent(task:any,stepId:string|undefined){
      if(!task.body.plusBilling||!stepId)return
      const row=await calls.findOne({_id:stepId,jobId:task.jobId,userId:task.body.userId,state:'submitted'})
      if(!row)return
      const updated=await calls.updateOne({_id:stepId,jobId:task.jobId,state:'submitted'},{$set:{state:'not_sent',reason:'stopped_before_transport'}})
      if(updated.modifiedCount===1)await settleBound(task,row,0)
    },
    async record(task:any,stepId:string|undefined,info:any){
      if(!task.body.plusBilling||!stepId)return
      // Only this workflow can attach provider evidence to its claimed step.
      const usage=info.usage?{...Object.fromEntries(['prompt_tokens','completion_tokens','input_image_count','output_image_count','input_image_type','output_image_type'].filter(k=>info.usage[k]!==undefined).map(k=>[k,info.usage[k]])),...(info.usage.prompt_tokens_details?{prompt_tokens_details:{cached_tokens:info.usage.prompt_tokens_details.cached_tokens}}:{})}:null
      const receipt={provider:info.provider,model:info.model,requestId:info.requestId,usage,workflowStepId:stepId}
      await calls.updateOne({_id:stepId,jobId:task.jobId,userId:task.body.userId,modelId:info.model,state:'submitted'},{$set:{state:'reported',receipt,reportedAt:new Date()}})
      const row=await calls.findOne({_id:stepId,jobId:task.jobId,userId:task.body.userId})
      if(!row){await budgets.updateOne({_id:task.jobId,userId:task.body.userId},{$set:{blocked:true}});throw Object.assign(Error('模型调用登记缺失，已停止并等待核对。'),{requestState:'unknown',billingStatus:'unknown'})}
      if(row.state!=='reported'||JSON.stringify(row.receipt)!==JSON.stringify(receipt)){
        await budgets.updateOne({_id:task.jobId,userId:task.body.userId},{$set:{blocked:true}})
        await calls.updateOne({_id:stepId,jobId:task.jobId},{$set:{state:'receipt_conflict'}})
        throw Object.assign(Error('同一模型调用的用量回执不一致，已停止后续调用。'),{requestState:'unknown',billingStatus:'unknown'})
      }
      await reconcileReceipts(task)
    },
    async summary(jobId:string,userId:string){
      const budget=await budgets.findOne({_id:jobId,userId});if(!budget)return undefined
      const rows=await calls.find({jobId,userId}).toArray(),sent=rows.filter(r=>r.state!=='not_sent')
      return {version:1,operationKey:budget.operationKey,pricingVersion:budget.pricingVersion,complete:!budget.blocked&&sent.every(r=>r.state==='reported'),confirmedUnbilled:!budget.blocked&&sent.length===0,calls:sent.map(r=>r.state==='reported'&&r.receipt||{state:'unknown',workflowStepId:r._id})}
    },
    async indexes(){await calls.createIndex({jobId:1,userId:1});await budgets.createIndex({userId:1,operationKey:1},{unique:true})},
  }
}
