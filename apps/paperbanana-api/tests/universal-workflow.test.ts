import assert from 'node:assert/strict'
import test from 'node:test'
import {createRefineRuntime} from '../../../test-support/refine-runtime.mjs'
import {createUniversalRuntime} from '../src/universal-adapters.js'
import {normalizeUniversalRoute,UniversalApiError} from '../../../packages/api/src/universal-api.js'
import {universalThinkingIdentity} from '../../../packages/api/src/thinking.js'
import {publicExecutionFailure} from '../../../packages/api/src/execution-errors.js'
function route(role:string, overrides:any={}) {
 return normalizeUniversalRoute({accessProvider:'custom',modelId:'exact/same-ID:KeepCase',custom:{version:1,connectionId:role,protocol:role==='image'?'openai-images':'openai-chat',baseUrl:`https://${role}.example.com/prefix/v1`,auth:'bearer',capabilities:{text:role!=='image',vision:role!=='image',imageGeneration:role==='image',imageEditing:role==='image'},inputLimits:{maxCount:2,maxBytes:5e6,maxTotalBytes:10e6,maxDimension:4096,maxPixels:16e6,requestMaxBytes:32e6,mimeTypes:['image/png']},outputLimits:{maxBytes:10e6,maxDimension:4096,maxPixels:16e6,mimeTypes:['image/png']},outputSizes:role==='image'?[{resolution:'1K',aspectRatio:'1:1',value:'1024x1024'}]:[],...overrides}})
}
function envelope(routes:any, key='fixture-custom-key') {return JSON.stringify(Object.fromEntries(Object.values(routes).filter((r:any)=>r.accessProvider==='custom').map((r:any)=>[r.custom.connectionId,{baseUrl:r.custom.baseUrl,protocol:r.custom.protocol,auth:r.custom.auth,apiKey:key}])))}
async function fixture(pauseImage?:()=>Promise<void>) {
 const runtime=await createRefineRuntime({tokenDance:true}), calls:any[]=[]
 let failure:UniversalApiError|undefined, failureStage='image', imageCalls=0, afterText:(()=>void)|undefined
 const adapter=createUniversalRuntime({transport:{checkUrl:async()=>{},request:async request=>{
  calls.push(request)
  if(request.url.includes('/images/') || JSON.parse(String(request.body||'{}')).tools?.[0]?.type==='image_generation') {imageCalls++;if(pauseImage)await pauseImage();if(failure && (failureStage==='image'||failureStage==='rerender'&&imageCalls>1))throw failure;return {status:200,headers:new Headers(),bytes:Buffer.from(JSON.stringify(request.url.endsWith('/responses')?{status:'completed',output:[{type:'image_generation_call',status:'completed',result:runtime.output.toString('base64')}]}:{data:[{b64_json:runtime.output.toString('base64')}]}))}}
  if(failure&&failureStage==='critic'&&request.url.includes('vision.example.com'))throw failure
  afterText?.()
  return {status:200,headers:new Headers(),bytes:Buffer.from(JSON.stringify({choices:[{finish_reason:'stop',message:{content:'A scientific workflow with input, analysis, planning and output; keep the source labels readable.'}}]}))}
 }}})
 runtime.legacy.configureUniversalRuntime(adapter)
 return {...runtime,calls,afterText(fn:()=>void){afterText=fn},fail(error?:UniversalApiError,stage='image'){failure=error;failureStage=stage}}
}
function body(routes:any) {return {action:'createJob',provider:'custom',configurationMode:'advanced',modelRoutes:routes,apiKeys:{custom:envelope(routes)},methodContent:'研究一种通过输入、分析、规划和输出多个阶段完成科研图示生成的系统。',caption:'图一：科研图示生成系统。',outputFormat:'png',pipelineMode:'planner_critic',retrievalSetting:'none',imageSize:'1K',aspectRatio:'1:1',numCandidates:1,maxCriticRounds:0}}

test('Gateway/Core custom chain keeps exact IDs and per-role endpoints, recovery uses no TokenDance and reuses planner',async()=>{
 const f=await fixture()
 try {
  const routes={main:route('main'),vision:route('vision'),image:route('image')}
  assert.equal((await f.post(body(routes),'anonymous')).status,401)
  f.fail(new UniversalApiError('UPSTREAM_REJECTED','rejected',402))
  const submitted=await f.post(body(routes));assert.equal(submitted.data.code,0,JSON.stringify(submitted))
  await f.legacy.drainJobAdmission()
  const failed=(await f.post({action:'getJob',jobId:submitted.data.jobId})).data.job
  assert.equal(failed.status,'failed',JSON.stringify(failed));assert.equal(failed.recovery.channel,'custom');assert.equal(failed.recovery.canResume,true,JSON.stringify(failed))
  const planner=f.calls.filter(x=>x.url.includes('main.example.com')).length;assert.ok(planner>0)
  assert.equal(f.tokenDanceCalls.length,0)
  const execution=await f.db.collection('paperbanana_provider_executions').findOne({_id:submitted.data.jobId})
  assert.ok(execution.secret);assert.equal(JSON.stringify(execution).includes('fixture-custom-key'),false);assert.equal(JSON.stringify(failed).includes('fixture-custom-key'),false)
  f.fail()
  const resumed=await f.post({action:'providerResume',jobId:submitted.data.jobId,apiKeys:{custom:envelope({image:routes.image},'rotated-key')}})
  assert.equal(resumed.data.jobId,submitted.data.jobId,JSON.stringify(resumed));await f.legacy.drainJobAdmission()
  const done=(await f.post({action:'getJob',jobId:submitted.data.jobId})).data.job
  assert.equal(done.status,'succeeded',JSON.stringify(done));assert.equal(f.calls.filter(x=>x.url.includes('main.example.com')).length,planner)
  assert.equal(f.calls.at(-1).headers.Authorization,'Bearer rotated-key')
  for(const request of f.calls)if(typeof request.body==='string')assert.equal(JSON.parse(request.body).model,'exact/same-ID:KeepCase')
 }finally{await f.close()}
})
test('local capabilities, output budget, key binding and result-unknown refuse calls/replays',async()=>{
 const f=await fixture()
 try {
  const routes={main:route('main'),vision:route('vision'),image:route('image')}
  assert.notEqual((await f.post({...body(routes),apiKeys:{custom:envelope({...routes,image:route('image',{baseUrl:'https://elsewhere.example.com/v1'})})}})).data.code,0);assert.equal(f.calls.length,0)
  assert.notEqual((await f.post({...body(routes),aspectRatio:'16:9'})).data.code,0);assert.equal(f.calls.length,0)
  assert.notEqual((await f.post(body({...routes,vision:route('vision',{capabilities:{text:true,vision:false,imageGeneration:false,imageEditing:false}})}))).data.code,0);assert.equal(f.calls.length,0)
  f.fail(new UniversalApiError('RESULT_UNKNOWN','unknown',504))
  const submitted=await f.post(body(routes));await f.legacy.drainJobAdmission()
  const failed=(await f.post({action:'getJob',jobId:submitted.data.jobId})).data.job
  assert.equal(failed.recovery.canResume,false);assert.equal(failed.failure.billingStatus,'unknown')
  const count=f.calls.length;assert.notEqual((await f.post({action:'providerResume',jobId:submitted.data.jobId})).data.code,0);assert.equal(f.calls.length,count)
 }finally{await f.close()}
})
test('custom image budget sums actual inputs and Chinese errors distinguish local and unknown fees',async()=>{
 const f=await fixture()
 try {
  const main=route('main'), image={url:'data:image/png;base64,'+f.image.toString('base64'),mimeType:'image/png',filename:'ref.png',size:f.image.length,width:120,height:80}
  assert.throws(()=>f.legacy.assertVisionInputBudget('custom',main.modelId,[image,image,image],main.custom),/最多接收 2 张/)
  f.legacy.assertVisionInputBudget('custom',main.modelId,[image,image],main.custom)
  for(const error of [new UniversalApiError('INPUT_LIMIT'),new UniversalApiError('UPSTREAM_REJECTED','rejected',401),new UniversalApiError('RESULT_UNKNOWN','unknown',504)]) {
    const exposed=publicExecutionFailure(error);assert.match(exposed.reason,/[\u4e00-\u9fff]/);assert.match(exposed.suggestion,/[\u4e00-\u9fff]/)
  }
  assert.equal(publicExecutionFailure(new UniversalApiError('INPUT_LIMIT')).billingStatus,'not_called')
 }finally{await f.close()}
})
for (const stage of ['critic','rerender']) test(`custom ${stage} failure cannot be hidden as successful generation`,async()=>{
 const f=await fixture()
 try {
  const routes={main:route('main'),vision:route('vision'),image:route('image')}
  f.fail(new UniversalApiError('RESULT_UNKNOWN','unknown',504),stage)
  const submitted=await f.post({...body(routes),maxCriticRounds:1});await f.legacy.drainJobAdmission()
  const failed=(await f.post({action:'getJob',jobId:submitted.data.jobId})).data.job
  assert.equal(failed.status,'failed',JSON.stringify(failed));assert.equal(failed.recovery.requestState,'unknown');assert.equal(failed.failure.billingStatus,'unknown')
  assert.equal(failed.recovery.canResume,false);assert.ok(failed.stages.some((s:any)=>s.type==='render'))
  const count=f.calls.length;await f.post({action:'providerResume',jobId:submitted.data.jobId});assert.equal(f.calls.length,count)
 }finally{await f.close()}
})

for (const customRole of ['main','vision','image']) test(`professional role mixing: custom ${customRole} with native Ant Ling / LongCat / OpenAI routes`, async()=>{
 const f=await fixture()
 try {
  const routes:any={main:{accessProvider:'antling',modelId:'Ling-3.0-flash'},vision:{accessProvider:'antling',modelId:'Ling-3.0-flash-VL'},image:{accessProvider:'openai',modelId:'gpt-image-2'}}
  if(customRole==='vision')routes.main={accessProvider:'longcat',modelId:'LongCat-2.5-Preview'}
  routes[customRole]=route(customRole)
  const input={...body(routes),provider:routes.main.accessProvider,maxCriticRounds:1,apiKeys:{custom:envelope(routes),antling:'fixture-ant',openai:'fixture-openai',longcat:'fixture-longcat'}}
  const created=await f.post(input);assert.equal(created.data.code,0,JSON.stringify(created.data));await f.legacy.drainJobAdmission()
  const job=(await f.post({action:'getJob',jobId:created.data.jobId})).data.job
  assert.equal(job.status,'succeeded',JSON.stringify(job).slice(0,2500));assert.deepEqual(job.modelRoutes,routes)
  assert.ok(f.calls.some((c:any)=>c.url.includes(customRole+'.example.com')))
  assert.equal(f.tokenDanceCalls.length,0)
  assert.equal(JSON.stringify(job).includes('fixture-custom-key'),false)
  if(customRole!=='vision') {
    const sent=f.providerCalls.filter((c:any)=>c.url==='https://api.ant-ling.com/v1/chat/completions').map((c:any)=>JSON.parse(c.options.body))
    const vision=sent.find((b:any)=>b.model==='Ling-3.0-flash-VL');assert.ok(vision,'critic reaches the independent Ant vision adapter')
    assert.ok(vision.messages.at(-1).content.some((c:any)=>c.type==='image_url'&&c.image_url.url.startsWith('data:image/png;base64,')))
  }
 }finally{await f.close()}
})

for(const main of ['antling','custom']) test(`existing vision route mixes LongCat 2.5 with ${main} planning and Novita Ming rendering`,async()=>{
 const f=await fixture()
 try {
  const routes:any={main:main==='custom'?route('main'):{accessProvider:'antling',modelId:'Ling-3.0-flash'},vision:{accessProvider:'longcat',modelId:'LongCat-2.5-Preview'},image:{accessProvider:'novita',modelId:'ming-image-0.1-design'}}
  const request={...body(routes),provider:main,maxCriticRounds:1,apiKeys:{custom:envelope(routes),antling:'fixture-ant-only',novita:'fixture-novita-only',longcat:'fixture-longcat-only'}}
  const created=await f.post(request);assert.equal(created.data.code,0,JSON.stringify(created.data));await f.legacy.drainJobAdmission()
  const job=(await f.post({action:'getJob',jobId:created.data.jobId})).data.job
  assert.equal(job.status,'succeeded',JSON.stringify(job).slice(0,4000));assert.deepEqual(job.modelRoutes,routes)
  const vision=f.providerCalls.filter((c:any)=>c.url==='https://api.longcat.chat/openai/v1/chat/completions')
  assert.ok(vision.length,'existing critic/vision workflow reached LongCat, no separate feature')
  for(const call of vision){
   assert.equal(new Headers(call.options.headers).get('Authorization'),'Bearer fixture-longcat-only')
   const b=JSON.parse(String(call.options.body));assert.equal(b.model,'LongCat-2.5-Preview');assert.ok(b.messages.at(-1).content.some((c:any)=>c.type==='image_url'&&c.image_url.url.startsWith('data:image/png;base64,')))
  }
  const rendered=f.providerCalls.filter((c:any)=>c.url==='https://api.novita.ai/openai/v1/images/generations');assert.ok(rendered.length)
  for(const call of rendered){assert.equal(new Headers(call.options.headers).get('Authorization'),'Bearer fixture-novita-only');const b=JSON.parse(String(call.options.body));assert.equal(b.model,'ming-image-0.1-design');assert.equal(b.image,undefined);assert.equal(b.images,undefined);assert.equal(b.n,undefined)}
  assert.equal(JSON.stringify(job).includes('fixture-novita-only'),false);assert.equal(f.tokenDanceCalls.length,0)
 }finally{await f.close()}
})

 test('custom thinking snapshot survives encrypted recovery and reuses successful planner without a second charge',async()=>{
 const f=await fixture()
 try {
  const main=route('main',{baseUrl:'https://api.openai.com/v1'});main.modelId='gpt-5'
  const routes={main,vision:route('vision'),image:route('image')},identity=universalThinkingIdentity(main)
  const input={...body(routes),thinkingConfig:{version:1,roles:{main:{...identity,options:{effort:'low'}}}}}
  f.fail(new UniversalApiError('UPSTREAM_REJECTED','rejected',402))
  const created=await f.post(input);assert.equal(created.data.code,0,JSON.stringify(created));await f.legacy.drainJobAdmission()
  const failed=(await f.post({action:'getJob',jobId:created.data.jobId})).data.job
  assert.equal(failed.recovery.canResume,true);assert.equal(failed.thinkingConfig.roles.main.options.effort,'low')
  const planning=f.calls.filter(c=>c.url==='https://api.openai.com/v1/chat/completions');assert.ok(planning.length)
  for(const call of planning)assert.equal(JSON.parse(call.body).reasoning_effort,'low')
  assert.equal(failed.thinkingSnapshot.roles.main.connection.baseUrl,main.custom.baseUrl)
  f.fail();await f.post({action:'providerResume',jobId:created.data.jobId,apiKeys:{custom:envelope({image:routes.image},'rotated')}});await f.legacy.drainJobAdmission()
  assert.equal((await f.post({action:'getJob',jobId:created.data.jobId})).data.job.status,'succeeded')
  assert.equal(f.calls.filter(c=>c.url==='https://api.openai.com/v1/chat/completions').length,planning.length)
 }finally{await f.close()}
})

// No paid calls: the image transport is held locally while independent HTTP
// requests reconnect using only the account and existing job ID.
test('accepted custom job continues without browser polling; reopening reads the same running/completed task',async()=>{
 let release!:()=>void,started!:()=>void
 const held=new Promise<void>(resolve=>release=resolve),entered=new Promise<void>(resolve=>started=resolve)
 const f=await fixture(async()=>{started();await held})
 try {
  const routes={main:route('main'),vision:route('vision'),image:route('image')}
  const submitted=await f.post(body(routes));assert.equal(submitted.data.code,0)
  await entered
  const before=f.calls.length,id=submitted.data.jobId
  const reentered=await f.post({action:'getJob',jobId:id})
  assert.equal(reentered.data.job.status,'running');assert.equal(f.calls.length,before)
  assert.equal(reentered.data.job.recovery, null)
  release();await f.legacy.drainJobAdmission()
  const finished=await f.post({action:'getJob',jobId:id})
  assert.equal(finished.data.job.status,'succeeded');assert.equal(f.calls.length,before)
  assert.equal(f.calls.filter(x=>x.url.includes('/images/')).length,1)
 }finally{release();await f.legacy.drainJobAdmission();await f.close()}
})

 test('queued createJob is acknowledged only after its encrypted recovery snapshot is saved',async()=>{
 let release!:()=>void, started!:()=>void
 const blocked=new Promise<void>(resolve=>{release=resolve}), entered=new Promise<void>(resolve=>{started=resolve})
 const f=await fixture(async()=>{started();await blocked})
 try {
  f.legacy.configureJobAdmission({maxActive:1,maxPending:2,maxPerOwner:3,maxPerIp:3})
  const routes={main:route('main'),vision:route('vision'),image:route('image')}
  const first=await f.post(body(routes));assert.equal(first.data.code,0)
  await entered
  const second=await f.post(body(routes));assert.equal(second.data.code,0,JSON.stringify(second.data))
  const saved=await f.db.collection('paperbanana_provider_executions').findOne({_id:second.data.jobId})
  assert.equal(saved.state,'queued');assert.equal(saved.admissionVersion,1)
  assert.equal(await f.db.collection('paperbanana_provider_steps').countDocuments({jobId:second.data.jobId}),0)
  const snapshot=f.tokenDanceService!.cipher!.open(saved.secret,second.data.jobId)
  assert.deepEqual(snapshot.task.body.modelRoutes,routes)
  assert.equal(snapshot.task.kind,'create');assert.equal(snapshot.task.jobId,second.data.jobId)
  assert.equal(JSON.stringify(saved).includes('fixture-custom-key'),false)
  release();await f.legacy.drainJobAdmission()
  assert.equal((await f.post({action:'getJob',jobId:second.data.jobId})).data.job.status,'succeeded')
 }finally{release();await f.close()}
})

 test('snapshot persistence failure refuses admission before model calls and frees queue capacity',async()=>{
 const f=await fixture()
 try {
  const original=f.workflow!.prepare
  f.legacy.configureProviderWorkflow({...f.workflow!,prepare:async(task:any)=>{await original(task);throw new Error('injected write acknowledgement failure fixture-secret')}})
  const routes={main:route('main'),vision:route('vision'),image:route('image')}
  const rejected=await f.post(body(routes));assert.equal(rejected.data.code,503,JSON.stringify(rejected))
  assert.equal(rejected.data.jobId,undefined);assert.match(rejected.data.error,/未开始模型调用/)
  assert.equal(JSON.stringify(rejected).includes('fixture-secret'),false);assert.equal(f.calls.length,0)
  assert.equal(await f.db.collection('paperbanana_provider_executions').countDocuments({}),0)
  const failed=(await f.db.collection('paperbanana_jobs').find({}).toArray())[0]
  assert.equal(failed.status,'failed');assert.equal(failed.failure.requestState,'not_sent');assert.equal(failed.failure.billingStatus,'not_called')
  f.legacy.configureJobAdmission({maxActive:1,maxPending:1,maxPerOwner:1,maxPerIp:1})
  f.legacy.configureProviderWorkflow(f.workflow!)
  const accepted=await f.post(body(routes));assert.equal(accepted.data.code,0);await f.legacy.drainJobAdmission()
  assert.equal((await f.post({action:'getJob',jobId:accepted.data.jobId})).data.job.status,'succeeded')
 }finally{await f.close()}
})

test('Responses tool traverses real create admission and original-task recovery with frozen parameters',async()=>{
 const f=await fixture()
 try {
  const base=route('image')
  const image=normalizeUniversalRoute({...base,modelId:'gpt-4.1',custom:{...base.custom,protocol:'openai-responses',baseUrl:'https://api.openai.com/v1',imageTool:{provider:'openai',model:'gpt-image-1.5',quality:'high'},outputSizes:[{resolution:'auto',aspectRatio:'auto',value:'auto'}]}})
  const routes={main:route('main'),vision:route('vision'),image}
  f.fail(new UniversalApiError('UPSTREAM_REJECTED','rejected',401))
  const submitted=await f.post({...body(routes),imageSize:'auto',aspectRatio:'auto'});assert.equal(submitted.data.code,0,JSON.stringify(submitted));await f.legacy.drainJobAdmission()
  const failed=(await f.post({action:'getJob',jobId:submitted.data.jobId})).data.job
  assert.equal(failed.recovery.canResume,true,JSON.stringify(failed));const planners=f.calls.filter(x=>x.url.includes('main.example')).length
  f.fail();const resumed=await f.post({action:'providerResume',jobId:submitted.data.jobId,apiKeys:{custom:envelope({image},'renewed-image-role-key')}})
  assert.equal(resumed.data.jobId,submitted.data.jobId,JSON.stringify(resumed));await f.legacy.drainJobAdmission()
  const done=(await f.post({action:'getJob',jobId:submitted.data.jobId})).data.job;assert.equal(done.status,'succeeded',JSON.stringify(done))
  assert.equal(f.calls.filter(x=>x.url.includes('main.example')).length,planners)
  const request=f.calls.filter(x=>x.url.endsWith('/responses')).at(-1),wire=JSON.parse(String(request.body))
  assert.equal(wire.tools[0].quality,'high');assert.equal(wire.tools[0].model,'gpt-image-1.5');assert.equal(wire.model,'gpt-4.1');assert.equal(wire.tools[0].size,undefined);assert.equal(wire.store,false);assert.equal(request.headers.Authorization,'Bearer renewed-image-role-key')
  const before=f.calls.length;assert.notEqual((await f.post({action:'providerResume',jobId:submitted.data.jobId})).data.code,0);assert.equal(f.calls.length,before)
 } finally {await f.close()}
})

test('expiring image token is checked again after a long planner and renewed only for the original safe task',async()=>{
 const f=await fixture(),now=Date.now
 try {
  const image=route('image',{auth:'bearer-expiring'}),routes={main:route('main'),vision:route('vision'),image}
  const credentials=(expiry:number)=>JSON.stringify({...JSON.parse(envelope(routes)),image:{baseUrl:image.custom.baseUrl,protocol:image.custom.protocol,auth:image.custom.auth,apiKey:'fixture-expiring-key',expiresAt:new Date(expiry).toISOString()}})
  const initial=now();f.afterText(()=>{Date.now=()=>initial+120000})
  const submitted=await f.post({...body(routes),apiKeys:{custom:credentials(initial+60000)}});assert.equal(submitted.data.code,0,JSON.stringify(submitted))
  await f.legacy.drainJobAdmission()
  const failed=(await f.post({action:'getJob',jobId:submitted.data.jobId})).data.job
  assert.equal(failed.status,'failed');assert.equal(failed.failure.requestState,'not_sent');assert.match(failed.error||failed.failure.reason,/到期|过期/)
  assert.equal(f.calls.filter(x=>x.url.includes('/images/')).length,0)
  f.afterText(()=>{});const planners=f.calls.length
  const resumed=await f.post({action:'providerResume',jobId:submitted.data.jobId,apiKeys:{custom:credentials(now()+3600000)}})
  assert.equal(resumed.data.jobId,submitted.data.jobId,JSON.stringify(resumed));await f.legacy.drainJobAdmission()
  const done=(await f.post({action:'getJob',jobId:submitted.data.jobId})).data.job;assert.equal(done.status,'succeeded',JSON.stringify(done));assert.equal(f.calls.length,planners+1)
 } finally {Date.now=now;await f.close()}
})
