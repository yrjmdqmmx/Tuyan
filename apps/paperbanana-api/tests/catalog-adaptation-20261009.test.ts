import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import Ajv2020 from 'ajv/dist/2020.js'
import {buildReplicateTextBody,callReplicateTextChannel} from '../../../packages/api/src/replicate-text-channel.js'
import {buildImageChannelBody,callExtendedImageChannel,type ImageChannelTransport} from '../../../packages/api/src/image-channel-adapters.js'
import {compileThinkingSelection,applyThinkingTransport} from '../../../packages/api/src/thinking.js'
import {tokenDanceChatBody,tokenDanceChat} from '../../../packages/api/src/tokendance.js'
import {resolveImageSize,imageAspectRatiosByResolution} from '../../../packages/types/src/image-size-contract.js'
import {CANONICAL_ASPECT_RATIOS} from '../../../packages/types/src/aspect-ratios.js'
import {createRefineRuntime} from '../../../test-support/refine-runtime.mjs'
// @ts-ignore generated independent client catalog
import {STATIC_MODEL_REGISTRY as catalog} from '../../web/src/lib/staticModelCatalog.js'
const read=(p:string)=>JSON.parse(fs.readFileSync(new URL('../../../'+p,import.meta.url),'utf8'))
const evidence=read('docs/model-catalog/2026-10-09-research-evidence.json'),sizes=read('config/image-size-contracts.json'),routes=read('config/image-channel-routes.json')
const png=(w=1024,h=1024)=>{const b=Buffer.alloc(24);b.writeUInt32BE(0x89504e47,0);b.writeUInt32BE(w,16);b.writeUInt32BE(h,20);return {base64:b.toString('base64'),dataUrl:'data:image/png;base64,'+b.toString('base64'),mimeType:'image/png'}}
function fixture(respond:(url:string,init:RequestInit)=>Response|Promise<Response>) {
 let pending:any,now=0;const calls:any[]=[]
 const io:ImageChannelTransport={pending:async()=>pending,checkpoint:async value=>{pending=structuredClone(value)},request:async(url,init,_label,attempts)=>{calls.push({url,init,attempts});return respond(url,init)},json:async r=>r.json(),sleep:async ms=>{now+=ms},now:()=>now,download:async()=> 'png',validate:s=>s,publicSource:async()=> 'https://fixtures.invalid/source.png',pollTimeoutMs:100,pollIntervalMs:1}
 return {io,calls,pending:()=>pending}
}
const textInput={provider:'replicate' as const,model:'google/gemini-3.5-flash',apiKey:'fixture',system:'science',user:'draw a plan',images:[] as {url:string}[]}
const version=evidence.replicateSchemas[textInput.model].version
const success=(output:unknown=['one',' two'])=>({id:'original',version,status:'succeeded',output})
function deref(s:any,doc:any):any {if(Array.isArray(s))return s.map(x=>deref(x,doc));if(!s||typeof s!=='object')return s;if(s.$ref){let x=doc;for(const k of s.$ref.split('/').slice(1))x=x[k];return deref(x,doc)}return Object.fromEntries(Object.entries(s).map(([k,v])=>[k,deref(v,doc)]))}
test('new fal size/body combinations satisfy independent OpenAPI',async t=>{
 const ajv=new (Ajv2020 as any)({strict:false,validateFormats:false});let checked=0
 for(const id of ['blackforestlabs/flux-3/text-to-image','ideogram/v4.5','bytedance/seedream/v5/flash/text-to-image'])for(const op of ['generation','editing']) {
  const key='fal/'+id,wire=routes[key][op],profile=sizes.profiles[sizes.routes[key][op]],doc=evidence.falSchemas[wire.endpoint].schema
  const schema=deref(Object.entries(doc.components.schemas).find(([k])=>k.endsWith('Input'))![1],doc);schema.additionalProperties=false;const valid=ajv.compile(schema)
  const combos=imageAspectRatiosByResolution(profile,CANONICAL_ASPECT_RATIOS)
  for(const resolution of Object.keys(combos))for(const ratio of ['auto',...combos[resolution]]) {
   const body=await buildImageChannelBody({provider:'fal',model:id,apiKey:'fixture',prompt:'figure',aspectRatio:ratio,resolution,size:resolveImageSize(profile,ratio,resolution),...(op==='editing'?{source:png()}: {})},wire,{publicSource:async()=> 'https://fixtures.invalid/ref.png'})
   assert.ok(valid(body),`${wire.endpoint} ${resolution} ${ratio}: ${JSON.stringify(valid.errors)}`);checked++
  }
 }
 t.diagnostic(`${checked} operation/size bodies validated`)
})
test('fal rejects small inputs before POST and resumes its original queue task; 4MP is not a hard upload maximum',async()=>{
 const input={provider:'fal',model:'blackforestlabs/flux-3/text-to-image',apiKey:'fixture',prompt:'figure',aspectRatio:'1:1',resolution:'1K',size:{size:'1:1'},source:png(255,256)}
 const bad=fixture(()=>{throw Error('must not submit')});await assert.rejects(callExtendedImageChannel(input,bad.io),(e:any)=>e.requestState==='not_sent');assert.equal(bad.calls.length,0)
 let fail=true;const f=fixture((u,i)=>i.method==='POST'?Response.json({request_id:'original',status:'IN_QUEUE',status_url:'https://queue.fal.run/blackforestlabs/flux-3/requests/original/status',response_url:'https://queue.fal.run/blackforestlabs/flux-3/requests/original'}):u.endsWith('/status')?(fail?(fail=false,Promise.reject(Error('lost poll'))):Response.json({status:'COMPLETED'})):Response.json({images:[{url:'https://fixtures.invalid/out.png'}]}))
 await assert.rejects(callExtendedImageChannel({...input,source:png(3000,3000)},f.io),(e:any)=>e.pollOnly)
 assert.equal(await callExtendedImageChannel({...input,source:png(3000,3000)},f.io),'png');assert.equal(f.calls.filter(x=>x.init.method==='POST').length,1)
})
test('Wan3 saved identity survives; all new image or text calls reject locally',async()=>{
 const m=catalog.replicate.models.find((m:any)=>m.id==='alibaba/wan-3');assert.ok(m);assert.equal(m.selectable,false);assert.deepEqual(m.roles,[]);assert.deepEqual(m.outputModalities,['video']);assert.equal(m.capabilities.imageEditing,false)
 const f=fixture(()=>{throw Error('must not call')})
 for(const source of [undefined,png()])await assert.rejects(callExtendedImageChannel({provider:'replicate',model:m.id,apiKey:'fixture',prompt:'figure',aspectRatio:'1:1',resolution:'auto',size:{},source},f.io),(e:any)=>e.requestState==='not_sent')
 assert.equal(f.calls.length,0)
 const r:any=await createRefineRuntime();try{assert.equal(r.legacy.normalizeModelName('replicate',m.id),m.id);await assert.rejects(r.legacy.callTextModel('replicate',m.id,'fixture','s','p'),/视频|图像任务/)}finally{await r.close()}
})
test('Cogevol uses text-only Chat and does not mix reasoning into final text',async()=>{
 for(const id of ['cogevol-base','cogevol-interactive-0828','cogevol-slide-0828']) {
  assert.equal(tokenDanceChatBody(id,'system','prompt').model,id);assert.throws(()=>tokenDanceChatBody(id,'s','p',[{url:png().dataUrl}]))
  let posts=0;const result=await tokenDanceChat(async()=>{posts++;return new Response('data: {"choices":[{"delta":{"reasoning_content":"reasoning"}}]}\n\ndata: {"choices":[{"delta":{"content":"answer"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n',{headers:{'content-type':'text/event-stream'}})},id,'fixture','s','p',[])
  assert.equal(result.text,'answer');assert.equal(posts,1)
 }
})
test('Kimi exact mappings clear incompatible controls and sampling; fixed models cannot disable thinking',()=>{
 for(const [id,options,expected] of [['kimi-k3',{effort:'high'},{reasoning_effort:'high'}],['kimi-k2.6',{mode:'disabled'},{thinking:{type:'disabled'}}],['kimi-k2.5',{mode:'enabled'},{thinking:{type:'enabled'}}]] as const){
  const snap=compileThinkingSelection({provider:'tokendance',modelId:id,protocol:'openai-chat-completions',options},'main')
  const body=JSON.parse(String(applyThinkingTransport('https://tokendance.space/gateway/v1/chat/completions',{method:'POST',body:JSON.stringify({model:id,thinking:{type:'disabled',keep:'all'},reasoning_effort:'max',temperature:.1,top_p:.9,n:1})},snap)!.body));assert.deepEqual(body,{model:id,...expected})
 }
 for(const id of ['kimi-k3','kimi-k2.7-code'])assert.throws(()=>compileThinkingSelection({provider:'tokendance',modelId:id,protocol:'openai-chat-completions',options:{mode:'disabled'}},'main'))
})
test('seven pinned text models obey independent Replicate schemas; vision stays limited',()=>{
 const ajv=new (Ajv2020 as any)({strict:false,validateFormats:false});let count=0
 for(const m of catalog.replicate.models.filter((m:any)=>m.roles.includes('main'))) {
  const b=buildReplicateTextBody({...textInput,model:m.id,images:m.roles.includes('vision')?[{url:png().dataUrl}]:[]});const e=evidence.replicateSchemas[m.id]
  assert.equal(b.version,e.version);assert.ok(ajv.compile(e.input)(b.input),m.id);assert.equal(m.verified,false);count++
 }
 assert.equal(count,7);assert.throws(()=>buildReplicateTextBody({...textInput,images:[{url:'https://unvalidated.invalid/image'}]}));assert.throws(()=>buildReplicateTextBody({...textInput,model:'qwen/qwen3-7-plus',images:[{url:png().dataUrl}]}))
 const snap=compileThinkingSelection({provider:'replicate',modelId:textInput.model,protocol:'replicate-predictions',options:{effort:'high'}},'main')
 const changed=JSON.parse(String(applyThinkingTransport('https://api.replicate.com/v1/predictions',{method:'POST',body:JSON.stringify(buildReplicateTextBody(textInput))},snap)!.body));assert.equal(changed.input.thinking_level,'high');assert.equal(changed.input.max_output_tokens,8192)
 assert.throws(()=>applyThinkingTransport('https://api.replicate.com/v1/predictions',{method:'POST',body:JSON.stringify({...changed,version:'wrong'})},snap))
})
test('Replicate text decodes text chunks and reuses checkpointed results without image downloads',async()=>{
 const f=fixture(()=>Response.json(success()));f.io.download=async()=>{throw Error('not an image')}
 assert.equal(await callReplicateTextChannel(textInput,f.io),'one two');assert.equal(await callReplicateTextChannel(textInput,f.io),'one two');assert.equal(f.calls.length,1);assert.equal(f.calls[0].attempts,1)
})
test('Replicate lost submission, persistence failures, poll interruption, malformed output and cancel never resubmit',async()=>{
 const lost=fixture(()=>{throw Error('lost response')});for(let i=0;i<2;i++)await assert.rejects(callReplicateTextChannel(textInput,lost.io),(e:any)=>e.uncertain&&e.terminal);assert.equal(lost.calls.length,1)
 const storage=fixture(()=>{throw Error('must not submit')});storage.io.checkpoint=async()=>{throw Error('save failed')};await assert.rejects(callReplicateTextChannel(textInput,storage.io));assert.equal(storage.calls.length,0)
 const missing=fixture(()=>{throw Error('must not submit')});await assert.rejects(callReplicateTextChannel(textInput,{...missing.io,checkpoint:undefined}),(e:any)=>e.requestState==='not_sent')
 let interrupted=true;const f=fixture((_u,i)=>i.method==='POST'?Response.json({id:'original',version,status:'processing'}):interrupted?(interrupted=false,Promise.reject(Error('poll disconnected'))):Response.json(success()))
 await assert.rejects(callReplicateTextChannel(textInput,f.io),(e:any)=>e.pollOnly);assert.equal(await callReplicateTextChannel(textInput,f.io),'one two');assert.equal(f.calls.filter(x=>x.init.method==='POST').length,1)
 for(const output of [[],{url:'https://fixtures.invalid/image'}]){const bad=fixture(()=>Response.json(success(output)));await assert.rejects(callReplicateTextChannel(textInput,bad.io),(e:any)=>e.terminal);await assert.rejects(callReplicateTextChannel(textInput,bad.io));assert.equal(bad.calls.length,1)}
 const canceled=fixture(()=>{throw Error('must not submit')});await assert.rejects(callReplicateTextChannel({...textInput,signal:AbortSignal.abort()},canceled.io),(e:any)=>e.requestState==='not_sent');assert.equal(canceled.calls.length,0)
})

test('Gateway/Core executes Replicate main and vision through the durable workflow with separate text results',async()=>{
 const r:any=await createRefineRuntime({tokenDance:true});const calls:any[]=[]
 try {
  r.legacy.configureRuntimeFetch(async(url:unknown,init:RequestInit={})=>{
   const href=String(url)
   if(href.startsWith(r.baseUrl+'/objects/')){const object=r.objects.get(decodeURIComponent(href.slice((r.baseUrl+'/objects/').length)));return new Response(object.bytes,{headers:{'Content-Type':object.mimeType}})}
   const body=JSON.parse(String(init.body));calls.push({url:href,body})
   if(href==='https://api.replicate.com/v1/predictions')return Response.json({id:'fixture-'+calls.length,version:body.version,status:'succeeded',output:['Preserve the labels. ','Draw a clear workflow.'],metrics:{predict_time:1}})
   if(href==='https://api.openai.com/v1/images/generations')return Response.json({data:[{b64_json:r.output.toString('base64')}]})
   throw Error('Unexpected fixture endpoint: '+href)
  })
  const prepared=await r.post({action:'prepareReferenceUpload',files:[{filename:'ref.png',mimeType:'image/png',size:r.image.length}]});const file=prepared.data.uploads[0]
  await fetch(file.uploadUrl,{method:'PUT',headers:{'Content-Type':'image/png'},body:new Uint8Array(r.image)})
  assert.equal((await r.post({action:'finalizeReferenceUpload',uploads:[file]})).data.code,0)
  const created=await r.post({action:'createJob',provider:'replicate',configurationMode:'advanced',modelRoutes:{main:{accessProvider:'replicate',modelId:'moonshotai/kimi-k2-thinking'},vision:{accessProvider:'replicate',modelId:textInput.model},image:{accessProvider:'openai',modelId:'gpt-image-2'}},apiKeys:{replicate:'fixture-replicate',openai:'fixture-openai'},methodContent:'研究一种由输入、分析、规划和输出阶段构成的科研图示生成系统。',caption:'科研图示生成系统。',outputFormat:'png',pipelineMode:'planner_critic',retrievalSetting:'none',imageSize:'1K',aspectRatio:'1:1',numCandidates:1,maxCriticRounds:0,visionMode:'assist',referenceImages:[file],referenceImageMode:'vision_model'})
  assert.equal(created.data.code,0,JSON.stringify(created));await r.legacy.drainJobAdmission()
  const done=(await r.post({action:'getJob',jobId:created.data.jobId})).data.job
  assert.equal(done.status,'succeeded',done.error)
  for(const [model,operation] of [[textInput.model,'vision'],['moonshotai/kimi-k2-thinking','text']])assert.ok(done.providerCalls.some((c:any)=>c.model===model&&c.operation===operation))
  const textCalls=calls.filter(c=>c.url==='https://api.replicate.com/v1/predictions')
  assert.equal(textCalls.length,2);assert.ok(textCalls.some(c=>c.body.input.images?.[0].startsWith('data:image/png;base64,')));assert.ok(textCalls.every(c=>typeof c.body.version==='string'))
  assert.equal(calls.filter(c=>c.url==='https://api.openai.com/v1/images/generations').length,1)
  assert.equal(JSON.stringify(done).includes('fixture-replicate'),false)
  for(const c of done.providerCalls)assert.equal(c.invoiceCost,null)
 }finally{await r.close()}
})
