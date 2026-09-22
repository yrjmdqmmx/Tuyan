import test from 'node:test'
import assert from 'node:assert/strict'
import {createRefineRuntime} from '../../../test-support/refine-runtime.mjs'
import {THINKING_PROFILES} from '../../../packages/api/src/thinking-data.js'
import {compileThinkingSelection} from '../../../packages/api/src/thinking.js'
// @ts-expect-error Generated browser catalog is the independently checked model oracle.
import {STATIC_MODEL_REGISTRY} from '../../web/src/lib/staticModelCatalog.js'

const valueOf=(value:any)=>value && typeof value==='object' ? value.value : value
function selectedOptions(profile:any) {
  const options:any={}
  for(const c of profile.controls) {
    if(c.key==='budget')continue
    const values=c.values.map(valueOf)
    options[c.key]=['adaptive','enabled',true,'high','medium','low'].find(v=>values.includes(v)) ?? values[0]
  }
  if(profile.requiresBudgetWhenEnabled && options.mode==='enabled')options.budget=profile.controls.find((c:any)=>c.key==='budget').min
  if(!Object.keys(options).length)options.budget=profile.controls[0].min
  return options
}
const get=(body:any,path:string)=>path.split('.').reduce((node,key)=>node?.[key],body)

test('every supported static text/vision identity reaches its actual adapter with the audited fields',async(t)=>{
  const r:any=await createRefineRuntime();let snapshot:any, captured:any[],pending:any
  try {
    r.legacy.configureProviderWorkflow({ ...r.workflow, active:()=>true, call:async(_d:any,fn:any)=>fn(), thinking:()=>snapshot,
      pending:async()=>pending,checkpoint:async(v:any)=>{pending=v},record:async()=>{} })
    r.legacy.configureRuntimeFetch(async(url:any,init:any)=>{
      const body=JSON.parse(init.body);captured.push({url:String(url),body});const task=Array.isArray(body)?body[0]:body
      if(String(url).includes('runware.ai'))return Response.json({data:[{taskUUID:task.taskUUID,text:'Visible answer',finishReason:'stop'}]})
      if(String(url).endsWith('/messages'))return Response.json({content:[{type:'thinking',thinking:'hidden'},{type:'text',text:'Visible answer'}],stop_reason:'end_turn'})
      if(String(url).includes(':generateContent'))return Response.json({candidates:[{content:{parts:[{thought:true,text:'hidden'},{text:'Visible answer'}]}}]})
      if(String(url).endsWith('/responses'))return Response.json({status:'completed',output_text:'Visible answer'})
      return Response.json({choices:[{finish_reason:'stop',message:{content:task.model?.startsWith('magistral')?[{type:'thinking',thinking:[{type:'text',text:'hidden'}]},{type:'text',text:'Visible answer'}]:'Visible answer'}}]})
    })
    let identities=0
    for(const profile of THINKING_PROFILES.filter(p=>p.status==='supported' && p.provider!=='openrouter'))for(const model of profile.modelIds)for(const role of profile.roles.filter((v:string)=>v!=='image')) {
      const entry=(STATIC_MODEL_REGISTRY as any)[profile.provider]?.models.find((m:any)=>m.id===model)
      if(!entry || entry.selectable===false || !entry.roles.includes(role))continue
      const options=selectedOptions(profile)
      snapshot=compileThinkingSelection({provider:profile.provider,modelId:model,protocol:entry.roleProtocols?.[role]||entry.protocol,options,...(profile.provider==='minimax'?{region:'global'}:{})},role)
      captured=[];pending=undefined
      const images=role==='vision'?[{filename:'x.png',mimeType:'image/png',url:`data:image/png;base64,${r.image.toString('base64')}`}]:[]
      try {
        const answer=await r.legacy.callTextModel(profile.provider,model,'fixture-key','system','user',images,{thinkingRole:role})
        assert.equal(answer,'Visible answer')
        const request=Array.isArray(captured[0].body)?captured[0].body[0]:captured[0].body
        for(const c of profile.controls)if(options[c.key]!==undefined)assert.deepEqual(get(request,c.field),options[c.key],c.field)
        assert.equal(captured.length,1,'no inferred or automatic retry')
        snapshot=compileThinkingSelection({...snapshot,options:{}},role)
        captured=[];pending=undefined
        await r.legacy.callTextModel(profile.provider,model,'fixture-key','system','user',images,{thinkingRole:role})
        const defaultRequest=Array.isArray(captured[0].body)?captured[0].body[0]:captured[0].body
        for(const field of profile.clearFields)assert.equal(get(defaultRequest,field),undefined,`provider default must omit ${field}`)
        identities++
      }catch(error:any){assert.fail(`${profile.provider}/${model}/${role}: ${String(error.message).slice(0,350)}`)}
    }
    t.diagnostic(`${identities} text/vision identities: selected values and omitted provider defaults`)
    assert.ok(identities>300,`only ${identities} identities exercised`)
  }finally{await r.close()}
})

test('actual image builders preserve quality/size while injecting documented native image thinking fields',async(t)=>{
  const r:any=await createRefineRuntime();let snapshot:any,captured:any[],pending:any
  try {
    r.legacy.configureProviderWorkflow({...r.workflow,active:()=>true,call:async(_d:any,fn:any)=>fn(),thinking:()=>snapshot,pending:async()=>pending,checkpoint:async(v:any)=>{pending=v},record:async()=>{}})
    r.legacy.configureRuntimeFetch(async(url:any,init:any={})=>{
      const href=String(url)
      if(href==='https://assets.example.org/fixture.png')return new Response(new Uint8Array(r.output),{headers:{'Content-Type':'image/png'}})
      if(init.method==='POST') {
        const body=JSON.parse(init.body);captured.push({url:href,body});const task=Array.isArray(body)?body[0]:body
        if(href.includes('runware.ai'))return Response.json({data:[{taskUUID:task.taskUUID,imageURL:'https://assets.example.org/fixture.png',status:'success'}]})
        if(href.includes('queue.fal.run'))return Response.json({request_id:'fixture',status_url:'https://queue.fal.run/fal-ai/fixture/requests/fixture/status',response_url:'https://queue.fal.run/fal-ai/fixture/requests/fixture'})
        if(href.includes('replicate.com'))return Response.json({id:'fixture',status:'succeeded',output:['https://assets.example.org/fixture.png'],urls:{get:'https://api.replicate.com/v1/predictions/fixture'}})
        if(href.includes('/interactions'))return Response.json({status:'completed',steps:[{type:'model_output',content:[{type:'image',mime_type:'image/png',data:r.output.toString('base64')}]}]})
        return Response.json({output:{choices:[{message:{content:[{image:'https://assets.example.org/fixture.png'}]}}]}})
      }
      return Response.json(href.endsWith('/status')?{status:'COMPLETED'}:{images:[{url:'https://assets.example.org/fixture.png'}]})
    })
    let identities=0,edits=0
    for(const profile of THINKING_PROFILES.filter(p=>p.status==='supported'&&p.roles.includes('image')))for(const model of profile.modelIds) {
      const entry=(STATIC_MODEL_REGISTRY as any)[profile.provider]?.models.find((m:any)=>m.id===model)
      if(!entry || entry.selectable===false)continue
      const options=selectedOptions(profile)
      snapshot=compileThinkingSelection({provider:profile.provider,modelId:model,protocol:entry.roleProtocols?.image||entry.protocol,options},'image')
      captured=[];pending=undefined
      try {
        await r.legacy.callImageModel(profile.provider,model,'fixture-key','Draw a diagram',entry.capabilities?.aspectRatios?.[0] || 'auto','',entry.capabilities?.resolutions?.[0]||'1K')
        const request=Array.isArray(captured[0].body)?captured[0].body[0]:captured[0].body
        for(const c of profile.controls)if(options[c.key]!==undefined)assert.deepEqual(get(request,c.field),options[c.key],c.field)
        assert.equal(captured.length,1)
        if(profile.operations?.includes('editing') && entry.capabilities?.imageEditMode==='direct-edit') {
          captured=[];pending=undefined
          await r.legacy.callImageModel(profile.provider,model,'fixture-key','Edit the labels',entry.capabilities?.refineAspectRatios?.[0]||'auto',r.image.toString('base64'),entry.capabilities?.refineResolutions?.[0]||'1K')
          const editRequest=Array.isArray(captured[0].body)?captured[0].body[0]:captured[0].body
          for(const c of profile.controls)if(options[c.key]!==undefined)assert.deepEqual(get(editRequest,c.field),options[c.key],c.field+' on edit')
          assert.equal(captured.length,1);edits++
        }
        identities++
      }catch(error:any){assert.fail(`${profile.provider}/${model}/image: ${String(error.message).slice(0,350)}`)}
    }
    assert.equal(identities,21)
    t.diagnostic(`${identities} image generation and ${edits} eligible editing identities`)
  }finally{await r.close()}
})

test('Gateway create and refine freeze server-compiled settings, expose metadata, and preserve old admission',async()=>{
  const r:any=await createRefineRuntime({tokenDance:true})
  try {
    const routes={main:{accessProvider:'xiaomi',modelId:'mimo-v2.6-pro'},vision:{accessProvider:'xiaomi',modelId:'mimo-v2.6-pro'},image:{accessProvider:'fal',modelId:'fal-ai/nano-banana-2'}}
    const roles:any={main:{provider:'xiaomi',modelId:'mimo-v2.6-pro',protocol:'openai-chat-completions',options:{mode:'enabled'}},vision:{provider:'xiaomi',modelId:'mimo-v2.6-pro',protocol:'openai-chat-completions',options:{mode:'disabled'}},image:{provider:'fal',modelId:'fal-ai/nano-banana-2',protocol:'provider-images',options:{effort:'minimal'}}}
    const base={provider:'xiaomi',configurationMode:'advanced',modelRoutes:routes,thinkingConfig:{version:1,roles},apiKeys:{xiaomi:'fixture-xiaomi',fal:'fixture-fal'},methodContent:'Build a clear scientific workflow with readable labels and numbered connections.',caption:'A scientific workflow.',outputFormat:'png',pipelineMode:'demo_planner_critic',retrievalSetting:'none',maxCriticRounds:0,numCandidates:1,imageSize:'1K',aspectRatio:'1:1'}
    const created=await r.post({action:'createJob',...base,thinkingSnapshot:{version:1,roles:{main:{wire:{model:'forged'}}}}})
    assert.equal(created.data.code,0,JSON.stringify(created.data).slice(0,500));await r.legacy.drainJobAdmission()
    const job=(await r.post({action:'getJob',jobId:created.data.jobId})).data.job
    assert.equal(job.status,'succeeded',job.error)
    assert.deepEqual(job.thinkingConfig,{version:1,roles})
    assert.deepEqual(job.thinkingSnapshot.roles.main.wire,{thinking:{type:'enabled'}})
    assert.equal(job.thinkingSnapshot.roles.main.wire.model,undefined)
    assert.equal(JSON.stringify(job).includes('fixture-xiaomi'),false)
    const chat=r.providerCalls.find((c:any)=>c.url.includes('xiaomimimo.com'))
    assert.equal(JSON.parse(chat.options.body).thinking.type,'enabled')
    const image=r.providerCalls.find((c:any)=>c.url.includes('queue.fal.run')&&c.options.method==='POST')
    assert.equal(JSON.parse(image.options.body).thinking_level,'minimal')
    const refined=await r.post({action:'refineImage',...base,sourceImageObjectKey:(job.resultImages || job.result_images)[0].objectKey || (job.resultImages || job.result_images)[0].object_key,editInstruction:'Make labels larger',thinkingConfig:{version:1,roles:{image:roles.image}}})
    assert.equal(refined.data.code,0,JSON.stringify(refined.data).slice(0,500));await r.legacy.drainJobAdmission()
    const edited=(await r.post({action:'getJob',jobId:refined.data.jobId})).data.job
    assert.equal(edited.status,'succeeded',edited.error)
    assert.deepEqual(edited.thinkingConfig,{version:1,roles:{image:roles.image}})
    const editCall=r.providerCalls.find((c:any)=>c.url.endsWith('nano-banana-2/edit')&&c.options.method==='POST')
    assert.equal(JSON.parse(editCall.options.body).thinking_level,'minimal')
    const before=r.providerCalls.length
    const rejected=await r.post({action:'createJob',...base,thinkingConfig:{version:1,roles:{main:{...roles.main,modelId:'not-selected'}}}})
    assert.equal(rejected.data.code,400);assert.equal(r.providerCalls.length,before)
    r.legacy.configureProviderWorkflow({...r.workflow,thinkingAvailable:()=>false})
    const disabled=await r.post({action:'createJob',...base})
    assert.equal(disabled.data.code,400);assert.equal(r.providerCalls.length,before)
  }finally{await r.close()}
})
