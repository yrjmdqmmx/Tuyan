import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRefineRuntime } from '../../../test-support/refine-runtime.mjs'
import { readProviderCatalog, isCatalogRequestAllowed } from '../../../packages/api/src/provider-catalog.js'
// @ts-ignore independent generated consumer
import { STATIC_MODEL_REGISTRY as catalog } from '../../web/src/lib/staticModelCatalog.js'

test('SenseNova uses the current key on its fixed GET endpoint, never the old JWT',async()=>{
 let calls=0
 const fetcher:typeof fetch=async(input,init)=>{
  calls++;assert.equal(String(input),'https://token.sensenova.cn/v1/models');assert.equal(init?.method,'GET')
  assert.equal(new Headers(init?.headers).get('authorization'),'Bearer current-key');assert.ok(isCatalogRequestAllowed(String(input),init))
  return Response.json({data:[{id:'sensenova-6.8-flash-lite',input_modalities:['text','image'],output_modalities:['text'],context_length:262144,max_output_length:65536}]})
 }
 assert.equal((await readProviderCatalog('sensenova',{catalogCredentials:{token:'old-jwt'},fetcher})).state,'needs-key');assert.equal(calls,0)
 const result=await readProviderCatalog('sensenova',{apiKey:'current-key',catalogCredentials:{token:'old-jwt'},fetcher})
 assert.equal(result.state,'ready');assert.equal(calls,1);assert.equal(result.models[0].specifications.maxOutputTokens,65536)
 assert.doesNotMatch(JSON.stringify(result),/current-key|old-jwt/)
 assert.equal(isCatalogRequestAllowed('https://api.sensenova.cn/v1/llm/models'),false)
 assert.equal(isCatalogRequestAllowed('https://token.sensenova.cn/v1/models',{method:'POST'}),false)
 assert.equal(isCatalogRequestAllowed('https://token.sensenova.cn/v1/chat/completions'),false)
})

test('Together corrected identity stays available through account refresh and sends the exact ID to a mock transport',async t=>{
 t.mock.method(Date,'now',()=>Date.parse('2026-10-28T12:00:00+08:00'))
 const r:any=await createRefineRuntime(),id='deepseek-ai/DeepSeek-V4-Pro-0813';let posts=0
 try{
  r.legacy.configureRuntimeFetch(async(input:any,init:any)=>{
   if(init?.method==='GET'){
    assert.equal(String(input),'https://api.together.ai/v1/models')
    return Response.json([{id,type:'chat'}])
   }
   posts++;assert.equal(String(input),'https://api.together.ai/v1/chat/completions')
   assert.equal(init?.method,'POST');assert.equal(JSON.parse(init.body).model,id)
   return Response.json({choices:[{message:{content:'fixture-only'}}]})
  })
  const result=await r.legacy.readAccountModelCatalog({provider:'together',apiKeys:{together:'fixture'}})
  const current=result.providerRegistry.models.find((m:any)=>m.id===id)
  assert.equal(current.selectable,true);assert.equal(current.expirationDate,null);assert.equal(current.expirationAt,undefined)
  assert.equal(current.catalogReview,undefined);assert.equal(current.replacementModelId,'');assert.equal(current.verified,false)
  assert.deepEqual(current.roles,['main']);assert.equal(current.protocol,'openai-chat-completions')
  assert.equal(await r.legacy.callTextModel('together',id,'fixture','system','prompt'),'fixture-only')
  assert.equal(posts,1);assert.equal(r.legacy.normalizeModelName('together',id),id)
 }finally{await r.close()}
})

test('audited fal removal survives cold failure and stale discovery, and saved routes never reach transport',async t=>{
 t.mock.method(Date,'now',()=>Date.parse('2026-10-28T12:00:00+08:00'))
 const r:any=await createRefineRuntime(),id='imagineart/imagineart-2.0-preview/text-to-image';let requests=0,mode='error'
 const saved={modelRoutes:{image:{accessProvider:'fal',modelId:id}},library:{connections:[{id:'c',provider:'fal'}],models:[{id:'saved',connectionId:'c',modelId:id}]}}
 const before=structuredClone(saved)
 try{
  r.legacy.configureRuntimeFetch(async(input:any,init:any)=>{
   requests++;assert.equal(init?.method,'GET');assert.ok(String(input).startsWith('https://api.fal.ai/v1/models'))
   if(mode==='error')throw Error('fixture offline')
   const ids=new URL(String(input)).searchParams.getAll('endpoint_id')
   return Response.json({models:(ids.length?ids:catalog.fal.models.map((m:any)=>m.id)).map((endpoint_id:string)=>({endpoint_id})),has_more:false})
  })
  const historical=catalog.fal.models.find((m:any)=>m.id===id)
  assert.equal(historical.catalogRemoval.reason,'public-catalog-unavailable');assert.equal(historical.selectable,false)
  assert.equal(historical.expirationDate,null);assert.equal(historical.expirationAt,undefined)
  for(mode of ['error','listed']){
   const publicResult=await r.legacy.modelRegistry({provider:'fal',refreshCatalog:true})
   const accountResult=await r.legacy.readAccountModelCatalog({provider:'fal',apiKeys:{fal:'fixture'}})
   assert.equal(publicResult.providers.fal.models.some((m:any)=>m.id===id),false)
   assert.equal(accountResult.providerRegistry.models.some((m:any)=>m.id===id),false)
   const retained=catalog.fal.models.filter((m:any)=>m.id!==id).map((m:any)=>m.id).sort()
   assert.equal(retained.length,48)
   assert.deepEqual(publicResult.providers.fal.models.map((m:any)=>m.id).sort(),retained)
   assert.deepEqual(accountResult.providerRegistry.models.map((m:any)=>m.id).sort(),retained)
   assert.equal(catalog.fal.models.length,49,'the removed exact identity remains in history')
   assert.deepEqual(publicResult.providers.fal.defaults,catalog.fal.defaults)
   const count=requests
   await assert.rejects(r.legacy.callImageModel('fal',saved.modelRoutes.image.modelId,'fixture','prompt','1:1'),
    (e:any)=>e.requestState==='not_sent'&&e.localInputFailure===true&&e.retryable===false&&/当前公开目录不可用/.test(e.message))
   assert.equal(requests,count,'no catalog or paid request is needed to reject the saved route')
  }
  assert.deepEqual(saved,before);assert.equal(r.legacy.normalizeModelName('fal',id),id)
 }finally{await r.close()}
})

test('Novita narrows pending metadata without importing generic chat modalities; Stability is excluded but its historical identity remains',async()=>{
 const r:any=await createRefineRuntime(),id='ming-image-0.1-design'
 try{
  r.legacy.configureRuntimeFetch(async(input:any,init:any)=>{
   assert.equal(String(input),'https://api.novita.ai/v3/openai/models');assert.equal(init?.method,'GET')
   return Response.json({data:[{id,type:'chat',context_length:0,input_modalities:['text','image','video','audio'],output_modalities:['text','image','video','audio']}]})
  })
  const account=await r.legacy.readAccountModelCatalog({provider:'novita'})
  const m=account.providerRegistry.models.find((m:any)=>m.id===id),historical=catalog.novita.models.find((m:any)=>m.id===id)
  assert.deepEqual(m.roles,['image']);assert.deepEqual(m.roleProtocols,{image:'novita-images-json'})
  assert.deepEqual(m.inputModalities,['text']);assert.deepEqual(m.outputModalities,['image'])
  assert.equal(m.selectable,true);assert.equal(m.verified,false);assert.equal(m.capabilities.imageEditing,false)
  assert.deepEqual(m.capabilities.resolutions,historical.capabilities.resolutions);assert.deepEqual(m.capabilities.aspectRatios,['1:1'])
  assert.match(m.catalogReview.reason,/已确认专用文生图 JSON 协议/);assert.match(m.catalogReview.reason,/待确认仅限通用目录/)
  assert.ok(m.catalogReview.sourceUrls.includes('https://docs.novita.ai/api-reference/model-apis-ming-image-txt2img'))
  const stability=(await r.legacy.modelRegistry({provider:'stability'})).providers.stability.models.find((m:any)=>m.id==='sd3.5-flash')
  assert.equal(stability,undefined)
  const historicalStability=catalog.stability.models.find((m:any)=>m.id==='sd3.5-flash')
  assert.equal(historicalStability.catalogReview.status,'pending');assert.equal(historicalStability.catalogRemoval.reason,'official-metadata-conflict');assert.equal(historicalStability.expirationDate,null)
  assert.ok(historicalStability.catalogReview.sourceUrls.includes('https://docs.stability.ai/openapi.json'))
 }finally{await r.close()}
})


test('Stability conflict removal excludes only Flash and blocks saved routes before transport without rewriting history',async()=>{
 const r:any=await createRefineRuntime(),id='sd3.5-flash';let requests=0
 const saved={connections:[{id:'stability-old',provider:'stability'}],models:[{id:'saved-flash',connectionId:'stability-old',modelId:id}],modelRoutes:{image:{accessProvider:'stability',modelId:id}}}
 const before=structuredClone(saved)
 try{
  r.legacy.configureRuntimeFetch(async()=>{requests++;throw Error('external transport forbidden')})
  const expected=catalog.stability.models.filter((m:any)=>m.id!==id).map((m:any)=>m.id).sort()
  for(const result of [(await r.legacy.modelRegistry({provider:'stability',refreshCatalog:true})).providers.stability, (await r.legacy.readAccountModelCatalog({provider:'stability'})).providerRegistry]){
   assert.deepEqual(result.models.map((m:any)=>m.id).sort(),expected)
   assert.deepEqual(result.defaults,catalog.stability.defaults)
  }
  assert.equal(expected.length,5);assert.equal(catalog.stability.models.length,6)
  assert.equal(r.legacy.normalizeModelName('stability',id),id)
  await assert.rejects(r.legacy.callImageModel('stability',id,'fixture','prompt','1:1'),(e:any)=>e.requestState==='not_sent'&&e.localInputFailure===true&&e.retryable===false)
  assert.equal(requests,0);assert.deepEqual(saved,before)
 }finally{await r.close()}
})
