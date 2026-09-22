import assert from 'node:assert/strict'
import test from 'node:test'
import { callNewTextChannel, type NewTextInput } from '../../../packages/api/src/text-channel-adapters.js'
import { createRefineRuntime } from '../../../test-support/refine-runtime.mjs'

const base: NewTextInput = {provider:'xiaomi',model:'mimo-v2.6-flash',apiKey:'fixture-key',system:'保留科学结论',user:'说明节点关系',images:[]}
function fixture(respond:(body:any)=>Response|Promise<Response>) {
  const calls:any[]=[],records:any[]=[]
  let now=0,pending:any
  const io={
    request:async(url:string,init:RequestInit,_label:string,attempts?:number)=>{const body=JSON.parse(String(init.body));calls.push({url,init,body,attempts});return respond(body)},
    json:async(response:Response)=>{if(!response.ok)throw new Error('HTTP '+response.status);return response.json()},
    now:()=>now,sleep:async(ms:number)=>{now+=ms},pollIntervalMs:1,pollTimeoutMs:4,
    pending:async()=>pending,checkpoint:async(value:any)=>{pending=structuredClone(value)},record:async(value:any)=>{records.push(value)},
  }
  return {io,calls,records}
}

test('MiMo V2.6 and Tencent use exact text/vision fields and preserve images without model substitution',async()=>{
  for(const [provider,model] of [['xiaomi','mimo-v2.6-pro'],['xiaomi','mimo-v2.6-flash'],['tokenhub','hy3'],['tokenhub','hy-vision-2.0-instruct']] as const) {
    const images=model==='hy3'?[]:[{url:'data:image/png;base64,cGljdHVyZQ=='}]
    const f=fixture(()=>Response.json({id:'id',model,choices:[{finish_reason:'stop',message:{content:'完整规划'}}],usage:{prompt_tokens:10,completion_tokens:4}}))
    assert.equal(await callNewTextChannel({...base,provider,model,images},f.io),'完整规划')
    assert.equal(f.calls.length,1);assert.equal(f.calls[0].attempts,1)
    assert.equal(new Headers(f.calls[0].init.headers).get('Authorization'),'Bearer fixture-key')
    assert.equal(f.calls[0].body.model,model);assert.equal(f.calls[0].body.stream,false)
    if(images.length)assert.deepEqual(f.calls[0].body.messages[1].content[1],{type:'image_url',image_url:images[0]})
    if(provider==='xiaomi'){assert.deepEqual(f.calls[0].body.thinking,{type:'disabled'});assert.equal(f.calls[0].body.max_completion_tokens,8192)}
    else assert.equal(f.calls[0].body.max_tokens,8192)
    assert.equal(f.records[0].resolvedModel,model);assert.equal(f.records[0].invoiceCost,null);assert.equal(f.records[0].reportedCost,null)
    assert.equal(f.records[0].publicPrice.checkedAt,'2026-09-22')
  }
  const f=fixture(()=>{throw new Error('must not be called')})
  await assert.rejects(callNewTextChannel({...base,provider:'tokenhub',model:'hy3',images:[{url:'data:image/png;base64,eA=='}]},f.io),/不支持/)
  await assert.rejects(callNewTextChannel({...base,model:'mimo-v2.6-pro-ultraspeed'},f.io),/不支持/)
  assert.equal(f.calls.length,0)
})

test('synchronous errors, incomplete output and lost acknowledgements never resubmit',async()=>{
  for(const response of [()=>Response.json({error:'rate limited'},{status:429}),()=>Response.json({choices:[{finish_reason:'length',message:{content:'截断文本'}}]}),()=>{throw new Error('response lost')}]) {
    const f=fixture(response)
    await assert.rejects(callNewTextChannel(base,f.io))
    assert.equal(f.calls.length,1);assert.equal(f.calls[0].attempts,1)
  }
})

test('Runware native text/vision resumes the same UUID, including lost submission reply and polling 429',async()=>{
  let failed=true,polls=0
  const f=fixture(body=>{
    const task=body[0]
    if(task.taskType==='textInference')throw new Error('ack lost after submit')
    polls++
    if(failed)return new Response('',{status:429,headers:{'Retry-After':'1'}})
    return Response.json({data:[{taskUUID:task.taskUUID,text:'完整识图结果',finishReason:'stop',usage:{totalTokens:30},cost:.0003}]})
  })
  const input={...base,provider:'runware' as const,model:'google:gemini@3.1-flash-lite',images:[{url:'data:image/png;base64,eA=='}]}
  await assert.rejects(callNewTextChannel(input,f.io),(e:any)=>e.pollOnly===true)
  await assert.rejects(callNewTextChannel(input,f.io),(e:any)=>e.pollOnly===true)
  failed=false
  assert.equal(await callNewTextChannel(input,f.io),'完整识图结果')
  assert.equal(f.calls.filter(x=>x.body[0].taskType==='textInference').length,1)
  assert.ok(polls>=2);assert.equal(new Set(f.calls.map(x=>x.body[0].taskUUID)).size,1)
  const submitted=f.calls[0].body[0]
  assert.deepEqual(submitted.inputs.images,input.images.map(i=>i.url))
  assert.deepEqual(submitted.settings,{systemPrompt:base.system,maxTokens:8192})
  assert.equal(submitted.deliveryMethod,'async');assert.equal(submitted.includeUsage,true)
  assert.equal(f.records[0].reportedCost.amount,.0003);assert.equal(f.records[0].invoiceCost,null)
  const count=f.calls.length
  assert.equal(await callNewTextChannel(input,f.io),'完整识图结果')
  assert.equal(f.calls.length,count,'saved result requires neither polling nor a paid request')
})

test('Core dispatch reaches every new main and vision adapter with exact catalog IDs',async()=>{
  const f=await createRefineRuntime({tokenDance:true})
  try {
    // Use the same normalized input shape as generation after upload processing.
    const images=[{url:'data:image/png;base64,'+f.image.toString('base64'),filename:'ref.png',mimeType:'image/png',size:f.image.length,width:120,height:80}]
    for(const [provider,model] of [['xiaomi','mimo-v2.6-pro'],['xiaomi','mimo-v2.6-flash'],['tokenhub','hy3'],['tokenhub','hy-vision-2.0-instruct'],['runware','google:gemini@3.1-flash-lite']]) {
      assert.ok(await f.legacy.callTextModel(provider,model,'fixture-key','科学规划','简要说明'))
      if(model!=='hy3')assert.ok(await f.legacy.callVisionModel(provider,model,'fixture-key','方法','标题',images))
    }
    const inference=f.providerCalls.filter(c=>c.url.includes('/chat/completions')||c.url.includes('runware')&&JSON.parse(String(c.options.body))[0].taskType==='textInference')
    assert.equal(inference.length,9)
    assert.equal(f.tokenDanceCalls.length,0)
  } finally {await f.close()}
})

function generation(provider:string,main:string,vision=main) {
  return {action:'createJob',provider,configurationMode:'advanced',modelRoutes:{main:{accessProvider:provider,modelId:main},vision:{accessProvider:provider,modelId:vision},image:{accessProvider:'openai',modelId:'gpt-image-2'}},apiKeys:{[provider]:'fixture-key',openai:'fixture-image-key'},methodContent:'研究一种通过输入、分析、规划和输出多个阶段完成科研图示生成的系统。',caption:'图一：科研图示生成系统。',outputFormat:'png',pipelineMode:'planner_critic',retrievalSetting:'none',imageSize:'1K',aspectRatio:'1:1',numCandidates:1,maxCriticRounds:0}
}

for(const [provider,main,vision] of [['xiaomi','mimo-v2.6-pro','mimo-v2.6-flash'],['tokenhub','hy3','hy-vision-2.0-instruct'],['runware','google:gemini@3.1-flash-lite','google:gemini@3.1-flash-lite']]) test(`${provider}: gateway generation uses separate main and vision routes, records costs and keeps image route`,async()=>{
  const f=await createRefineRuntime({tokenDance:true})
  try {
    const prepared=await f.post({action:'prepareReferenceUpload',files:[{filename:'ref.png',mimeType:'image/png',size:f.image.length}]})
    const file=prepared.data.uploads[0]
    await fetch(file.uploadUrl,{method:'PUT',headers:{'Content-Type':'image/png'},body:new Uint8Array(f.image)})
    assert.equal((await f.post({action:'finalizeReferenceUpload',uploads:[file]})).data.code,0)
    const created=await f.post({...generation(provider,main,vision),referenceImages:[file],referenceImageMode:'vision_model'})
    assert.equal(created.data.code,0,JSON.stringify(created));await f.legacy.drainJobAdmission()
    const done=(await f.post({action:'getJob',jobId:created.data.jobId})).data.job
    assert.equal(done.status,'succeeded',JSON.stringify(done))
    assert.ok(done.providerCalls.some((c:any)=>c.model===vision&&c.operation==='vision'))
    assert.ok(done.providerCalls.some((c:any)=>c.model===main&&c.operation==='text'))
    assert.ok(f.providerCalls.some(c=>c.url==='https://api.openai.com/v1/images/generations'))
    for(const cost of done.providerCalls){assert.equal(cost.invoiceCost,null);assert.equal(cost.estimatedCost,null)}
    assert.equal(JSON.stringify(done).includes('fixture-key'),false);assert.equal(f.tokenDanceCalls.length,0)
  } finally {await f.close()}
})

for(const [provider,main,vision] of [['xiaomi','mimo-v2.6-flash','mimo-v2.6-flash'],['tokenhub','hy3','hy-vision-2.0-instruct'],['runware','google:gemini@3.1-flash-lite','google:gemini@3.1-flash-lite']]) test(`${provider}: lost planning reply cannot duplicate an accepted inference`,async()=>{
  const f=await createRefineRuntime({tokenDance:true})
  try {
    f.setChannelFailure('lost-submit')
    const created=await f.post(generation(provider,main,vision))
    assert.equal(created.data.code,0,JSON.stringify(created));await f.legacy.drainJobAdmission()
    const failed=(await f.post({action:'getJob',jobId:created.data.jobId})).data.job
    assert.equal(failed.status,'failed',JSON.stringify(failed));assert.equal(failed.recovery.canResume,provider==='runware')
    const count=f.providerCalls.length
    f.setChannelFailure('')
    const resumed=await f.post({action:'providerResume',jobId:created.data.jobId})
    if(provider==='runware') {
      assert.equal(resumed.data.jobId,created.data.jobId);await f.legacy.drainJobAdmission()
      assert.equal((await f.post({action:'getJob',jobId:created.data.jobId})).data.job.status,'succeeded')
      const submissions=f.providerCalls.filter(c=>c.url.includes('runware')).map(c=>JSON.parse(String(c.options.body))[0]).filter(c=>c.taskType==='textInference')
      assert.equal(new Set(submissions.map(c=>c.taskUUID)).size,submissions.length)
    } else {assert.notEqual(resumed.data.code,0);assert.equal(f.providerCalls.length,count)}
  } finally {await f.close()}
})
