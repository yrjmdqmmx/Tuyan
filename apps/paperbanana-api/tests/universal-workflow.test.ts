import assert from 'node:assert/strict'
import test from 'node:test'
import {createRefineRuntime} from '../../../test-support/refine-runtime.mjs'
import {createUniversalRuntime} from '../src/universal-adapters.js'
import {normalizeUniversalRoute,UniversalApiError} from '../../../packages/api/src/universal-api.js'
import {publicExecutionFailure} from '../../../packages/api/src/execution-errors.js'
function route(role:string, overrides:any={}) {
 return normalizeUniversalRoute({accessProvider:'custom',modelId:'exact/same-ID:KeepCase',custom:{version:1,connectionId:role,protocol:role==='image'?'openai-images':'openai-chat',baseUrl:`https://${role}.example.com/prefix/v1`,auth:'bearer',capabilities:{text:role!=='image',vision:role!=='image',imageGeneration:role==='image',imageEditing:role==='image'},inputLimits:{maxCount:2,maxBytes:5e6,maxTotalBytes:10e6,maxDimension:4096,maxPixels:16e6,requestMaxBytes:32e6,mimeTypes:['image/png']},outputLimits:{maxBytes:10e6,maxDimension:4096,maxPixels:16e6,mimeTypes:['image/png']},outputSizes:role==='image'?[{resolution:'1K',aspectRatio:'1:1',value:'1024x1024'}]:[],...overrides}})
}
function envelope(routes:any, key='fixture-custom-key') {return JSON.stringify(Object.fromEntries(Object.values(routes).map((r:any)=>[r.custom.connectionId,{baseUrl:r.custom.baseUrl,protocol:r.custom.protocol,auth:r.custom.auth,apiKey:key}])))}
async function fixture() {
 const runtime=await createRefineRuntime({tokenDance:true}), calls:any[]=[]
 let failure:UniversalApiError|undefined, failureStage='image', imageCalls=0
 const adapter=createUniversalRuntime({transport:{checkUrl:async()=>{},request:async request=>{
  calls.push(request)
  if(request.url.includes('/images/')) {imageCalls++;if(failure && (failureStage==='image'||failureStage==='rerender'&&imageCalls>1))throw failure;return {status:200,headers:new Headers(),bytes:Buffer.from(JSON.stringify({data:[{b64_json:runtime.output.toString('base64')}]}))}}
  if(failure&&failureStage==='critic'&&request.url.includes('vision.example.com'))throw failure
  return {status:200,headers:new Headers(),bytes:Buffer.from(JSON.stringify({choices:[{finish_reason:'stop',message:{content:'A scientific workflow with input, analysis, planning and output; keep the source labels readable.'}}]}))}
 }}})
 runtime.legacy.configureUniversalRuntime(adapter)
 return {...runtime,calls,fail(error?:UniversalApiError,stage='image'){failure=error;failureStage=stage}}
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
