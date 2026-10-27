import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRefineRuntime } from '../../../test-support/refine-runtime.mjs'
import { exactModelDetails } from '../../../packages/api/src/provider-catalog.js'
import { thinkingProfile } from '../../../packages/api/src/thinking.js'
import { IMAGE_CHANNEL_ROUTES } from '../../../packages/api/src/image-channel-routes.js'
// @ts-ignore independent generated Web consumer
import { STATIC_MODEL_REGISTRY as catalog, STATIC_MODEL_REGISTRY_VERSION } from '../../web/src/lib/staticModelCatalog.js'
const current=JSON.parse(fs.readFileSync(new URL('../../../config/model-catalog-updates.json',import.meta.url),'utf8'))
const added=[
 ['together','reflection/Beam-1.0-501B-A23B','https://api.together.ai/v1/chat/completions',false],
 ['fireworks','accounts/fireworks/models/deepseek-v4p1-flash-1017','https://api.fireworks.ai/inference/v1/chat/completions',true],
 ['qianfan','deepseek-v4.1-flash-1017','https://qianfan.baidubce.com/v2/chat/completions',true],
 ['tokendance','deepseek-v4.1-flash-1017','https://tokendance.space/gateway/v1/chat/completions',false],
] as const

test('weekly additions preserve all prior defaults, remain unverified and keep unadapted discoveries closed',()=>{
 assert.equal(STATIC_MODEL_REGISTRY_VERSION,'2026-10-26.v39')
 assert.equal(Object.values(catalog).reduce((n:number,p:any)=>n+p.models.length,0),1125)
 const defaults=JSON.parse(fs.readFileSync(new URL('./fixtures/catalog-20261016/baseline-defaults.json',import.meta.url),'utf8'))
 for(const [provider,expected]of Object.entries(defaults))assert.deepEqual(catalog[provider].defaults,expected)
 for(const [provider,id,,vision]of added){const m=catalog[provider].models.find((m:any)=>m.id===id);assert.ok(m.selectable);assert.equal(m.verified,false);assert.equal(m.verificationState,'catalog');assert.deepEqual(m.roles,vision?['main','vision']:['main'])}
 for(const [provider,id,,vision]of added)for(const role of vision?['main','vision']:['main']){const profile=thinkingProfile(provider,id,role as 'main'|'vision','openai-chat-completions');assert.equal(profile?.status,'unconfirmed');assert.deepEqual(profile?.controls,[])}
 for(const id of ['qwen-image-2.1-pro','qwen-image-2.1-turbo','seedream-5.0-flash'])assert.equal(catalog.tokendance.models.some((m:any)=>m.id===id),false)
 for(const id of ['beam-1p0-501b-a23b','step-5-preview-fp8','muse-spark-open-nvfp4'])assert.equal(catalog.fireworks.models.some((m:any)=>m.id==='accounts/fireworks/models/'+id),false)
 assert.equal(catalog.qianfan.models.find((m:any)=>m.id==='deepseek-v4.1-flash-1017').specifications.maxOutputTokens,393216)
})

test('new channel identities use existing exact endpoints, roles, response parser and one submission',async()=>{
 const r:any=await createRefineRuntime();let calls:any[]=[],pending:any
 try{
  r.legacy.configureProviderWorkflow({...r.workflow,active:()=>true,key:async()=> 'fixture-key',call:async(_d:any,fn:any)=>fn(),pending:async()=>pending,checkpoint:async(v:any)=>{pending=v},record:async()=>{}})
  r.legacy.configureRuntimeFetch(async(input:any,init:any={})=>{
   const url=String(input)
   if(url==='https://tokendance.space/gateway/v1/models')return Response.json({data:[{id:'deepseek-v4.1-flash-1017',supported_protocols:['openai:chat-completions']}]})
   assert.equal(init.method,'POST');const body=JSON.parse(init.body);calls.push({url,body})
   return Response.json({choices:[{finish_reason:'stop',message:{content:'fixture final answer'}}]})
  })
  for(const [provider,id,endpoint,vision]of added)for(const withImage of vision?[false,true]:[false]){
   calls=[];pending=undefined
   const images=withImage?[{filename:'fixture.png',mimeType:'image/png',url:'data:image/png;base64,'+r.image.toString('base64')}]:[]
   assert.equal(await r.legacy.callTextModel(provider,id,'fixture-key','system','prompt',images),'fixture final answer')
   assert.equal(calls.length,1);assert.equal(calls[0].url,endpoint);assert.equal(calls[0].body.model,id)
   if(provider==='qianfan')assert.equal(calls[0].body.max_tokens,8192,'official maximum must not increase the application request budget')
   assert.equal(calls[0].body.reasoning_effort,undefined);assert.equal(calls[0].body.enable_thinking,undefined)
   if(withImage)assert.ok(calls[0].body.messages[1].content.some((x:any)=>x.type==='image_url'))
  }
 }finally{await r.close()}
})

test('native and TokenHub Flash service-version updates do not change wire IDs or other channels',()=>{
 for(const id of ['deepseek-flash','deepseek-v4-flash','deepseek-v4-flash-vision-exp'])assert.equal(exactModelDetails('deepseek',id)?.specifications.resolvedModel.modelId,'deepseek-v4.1-flash-1017')
 assert.equal(exactModelDetails('tokenhub','deepseek/deepseek-flash')?.specifications.resolvedModel.modelId,'deepseek-v4.1-flash-1017')
 assert.notEqual(exactModelDetails('tokenhub','deepseek-v4.1-flash')?.specifications.resolvedModel?.modelId,'deepseek-v4.1-flash-1017')
 for(const id of ['deepseek-v4-flash','deepseek-v4-flash-vision-exp'])assert.equal(current.lifecycle.deepseek[id].selectable,false)
})

test('Krea vendor defaults are medium while existing explicit application requests stay low',()=>{
 const schemas=JSON.parse(fs.readFileSync(new URL('../../../config/model-channel-schemas.json',import.meta.url),'utf8'))
 for(const id of ['krea/v3/text-to-image','krea/v3/edit'])assert.equal(schemas['fal/'+id].input.properties.reasoning_level.default,'medium')
 const route=IMAGE_CHANNEL_ROUTES['fal/krea/v3/text-to-image']
 assert.equal(route.generation.constants.reasoning_level,'low');assert.equal(route.editing.constants.reasoning_level,'low')
})


test('Ark official EOS disables historical IDs and honors both future UTC+8 boundaries without transport',async()=>{
 const r:any=await createRefineRuntime(),now=Date.now;let transports=0
 try{
  r.legacy.configureRuntimeFetch(async()=>{transports++;throw new Error('no network expected')})
  const entries=Object.entries(current.lifecycle.ark) as [string,any][]
  assert.equal(entries.length,20)
  Date.now=()=>Date.parse('2026-10-19T00:00:00+08:00')
  const models=(await r.legacy.modelRegistry({provider:'ark'})).providers.ark.models
  for(const [id,m]of entries){
   assert.ok(catalog.ark.models.some((x:any)=>x.id===id),'retain historical ID')
   assert.equal(models.find((x:any)=>x.id===id).selectable,m.expirationDate!=='2026-09-21')
  }
  await assert.rejects(r.legacy.callTextModel('ark','deepseek-v4-flash-260425','fixture','system','prompt'),(e:any)=>/官方服务已于.*到期/.test(e.message))
  for(const id of ['doubao-seed-2-0-lite-260215','doubao-seed-2-0-mini-260215','deepseek-v4-pro-260425']){
   const cutoff=Date.parse(current.lifecycle.ark[id].expirationAt)
   Date.now=()=>cutoff-1
   assert.equal((await r.legacy.modelRegistry({provider:'ark'})).providers.ark.models.find((m:any)=>m.id===id).selectable,true)
   Date.now=()=>cutoff
   assert.equal((await r.legacy.modelRegistry({provider:'ark'})).providers.ark.models.find((m:any)=>m.id===id).selectable,false)
   await assert.rejects(r.legacy.callTextModel('ark',id,'fixture','system','prompt'),(e:any)=>/官方服务已于.*到期/.test(e.message))
  }
  assert.equal(transports,0)
 }finally{Date.now=now;await r.close()}
})
