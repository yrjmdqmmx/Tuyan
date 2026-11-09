import test from 'node:test'
import assert from 'node:assert/strict'
import {compileThinkingSelection,applyThinkingSnapshot,thinkingProfile} from '../../../packages/api/src/thinking.js'
import {referenceSubmissionPolicy} from '../../../packages/api/src/reference-upload.js'
import {createRefineRuntime} from '../../../test-support/refine-runtime.mjs'
const ids=['deepseek-v4.1-flash-1017','MiniMax/MiniMax-M3.1-Flash','xiaomi/mimo-v2.6-pro-ultraspeed']
const bailian={workspaceId:'fixture-workspace',region:'cn-beijing'}
const identity=(modelId:string)=>({provider:'bailian',modelId,protocol:'bailian-openai-chat'})
test('MiniMax five explicit efforts work for both roles, cannot disable or inherit another model controls',()=>{
 for(const role of ['main','vision'] as const){
  const body={model:ids[1],messages:[],stream:true,max_tokens:8192}
  assert.equal(thinkingProfile('bailian',ids[1],role,'bailian-openai-chat').controls[0].default,'max')
  for(const effort of ['low','medium','high','xhigh','max'])assert.deepEqual(applyThinkingSnapshot(body,compileThinkingSelection({...identity(ids[1]),options:{effort}},role)),{...body,reasoning_effort:effort})
  assert.deepEqual(applyThinkingSnapshot(body,compileThinkingSelection({...identity(ids[1]),options:{}},role)),body)
  for(const options of [{mode:false},{mode:'disabled'},{effort:'none'},{budget:8192}] as Record<string,string|number|boolean>[] )assert.throws(()=>compileThinkingSelection({...identity(ids[1]),options},role))
  for(const id of [ids[0],ids[2]]){assert.deepEqual(compileThinkingSelection({...identity(id),options:{}},role).wire,{});assert.throws(()=>compileThinkingSelection({...identity(id),options:{effort:'max'}},role))}
 }
})
test('all three exact models receive identical private picture bytes via text and vision, and one failed request never falls back',async()=>{
 const r:any=await createRefineRuntime();let calls:any[]=[],snapshot:any,fail=false;const descriptors:any[]=[]
 try{
  r.legacy.configureProviderWorkflow({...r.workflow,active:()=>true,thinking:()=>snapshot,call:async(d:any,fn:any)=>{descriptors.push(d);return fn()}})
  r.legacy.configureRuntimeFetch(async(url:any,init:any)=>{calls.push({url:String(url),...init,body:JSON.parse(init.body)});return fail?Response.json({error:{message:'image_url unsupported'}},{status:400}):Response.json({choices:[{finish_reason:'stop',message:{content:'observed fixture',reasoning_content:'hidden'}}]})})
  const key='private-bailian-fixture.png';r.objects.set(key,{bytes:r.image,mimeType:'image/png'})
  const image={url:'https://private.invalid/not-for-provider',objectKey:key,mimeType:'image/png'}
  for(const id of ids)for(const role of ['main','vision'] as const){
   snapshot=compileThinkingSelection({...identity(id),options:id===ids[1]?{effort:'low'}:{}},role);calls=[]
   const invoke=()=>role==='main'?r.legacy.callTextModel('bailian',id,'fixture','s','u',[image],{bailian,thinkingRole:role}):r.legacy.callVisionModel('bailian',id,'fixture','m','c',[image],undefined,undefined,role,bailian)
   assert.equal(await invoke(),'observed fixture');assert.equal(calls.length,1)
   const request=calls[0];assert.equal(request.url,'https://fixture-workspace.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions');assert.equal(request.redirect,'error');assert.equal(request.body.model,id)
   assert.equal(request.body.messages[1].content[1].image_url.url,`data:image/png;base64,${r.image.toString('base64')}`)
   assert.equal(request.body.reasoning_effort,id===ids[1]?'low':undefined);assert.equal(request.body.enable_thinking,undefined);assert.equal(request.body.max_tokens,undefined)
   assert.doesNotMatch(JSON.stringify(request.body),/private.invalid|hidden/)
   fail=true;calls=[];await assert.rejects(invoke());assert.equal(calls.length,1);assert.equal(calls[0].body.model,id);fail=false
  }
  assert.ok(descriptors.filter(d=>d[0]==='vision').every(d=>JSON.stringify(d).includes('fixture-workspace')))
 }finally{await r.close()}
})
test('exact image count, bytes, type and request-size limits stop locally before model POST',async()=>{
 const r:any=await createRefineRuntime();let calls=0
 try{
  r.legacy.configureProviderWorkflow({...r.workflow,active:()=>true,call:async(_d:any,fn:any)=>fn()})
  r.legacy.configureRuntimeFetch(async()=>{calls++;throw Error('must not send')})
  const png={mimeType:'image/png',url:`data:image/png;base64,${r.image.toString('base64')}`}
  for(const id of ids){
   const p=referenceSubmissionPolicy('bailian',id);assert.equal(p.maxCount,3);assert.equal(p.maxBytes,4194304)
   for(const images of [Array(4).fill(png),[{...png,width:4097,height:10}],[{mimeType:'image/png',url:`data:image/png;base64,${Buffer.alloc(4194305).toString('base64')}`}],[{...png,mimeType:'image/jpeg'}]])await assert.rejects(r.legacy.callTextModel('bailian',id,'fixture','s','u',images,{bailian}))
   assert.throws(()=>r.legacy.checkedReferenceRequest('bailian',id,{text:'x'.repeat(p.requestMaxBytes)}),/上限/)
  }
  assert.equal(calls,0)
 }finally{await r.close()}
})

test('uploaded image and document optimization uses each selected workspace model with owned original materials',async()=>{
 const r:any=await createRefineRuntime();const calls:any[]=[]
 async function upload(filename:string,bytes:Buffer){const p=await r.post({action:'prepareMaterialUpload',files:[{filename,size:bytes.length}]});assert.equal(p.data.code,0,JSON.stringify(p.data));const u=p.data.uploads[0];await fetch(u.uploadUrl,{method:'PUT',headers:{'Content-Type':u.mimeType},body:new Uint8Array(bytes)});const f=await r.post({action:'finalizeMaterialUpload',materialId:u.id});assert.equal(f.data.code,0,JSON.stringify(f.data));return {id:u.id}}
 try{
  const materialFiles=[await upload('evidence.txt',Buffer.from('BAILIAN_ORIGINAL_FACT: alpha has 35 observations.')),await upload('diagram.png',r.image)]
  r.legacy.configureRuntimeFetch(async(url:any,init:any)=>{calls.push({url:String(url),body:JSON.parse(init.body)});return Response.json({choices:[{finish_reason:'stop',message:{content:'Optimized original evidence'}}]})})
  for(const modelId of ids){const body={action:'optimizeInputs',target:'methodContent',inputs:{methodContent:'',caption:'',negativePrompt:''},mainRoute:{accessProvider:'bailian',modelId,bailian},apiKey:'fixture',materialFiles};calls.length=0;const result=await r.post(body);assert.equal(result.data.code,0,JSON.stringify(result.data));assert.equal(calls.length,1);assert.equal(calls[0].body.model,modelId);assert.match(calls[0].url,/fixture-workspace.cn-beijing.maas.aliyuncs.com/);assert.match(JSON.stringify(calls[0].body),/BAILIAN_ORIGINAL_FACT/);assert.match(JSON.stringify(calls[0].body),/data:image\/png;base64/);assert.equal((await r.post(body,'other-owner')).data.code,404);assert.equal(calls.length,1)}
 }finally{await r.close()}
})
