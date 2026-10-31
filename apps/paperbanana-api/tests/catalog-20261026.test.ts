import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRefineRuntime } from '../../../test-support/refine-runtime.mjs'
import { exactModelDetails } from '../../../packages/api/src/provider-catalog.js'
import { buildReplicateTextBody, callReplicateTextChannel } from '../../../packages/api/src/replicate-text-channel.js'
import { buildAuditedRunwareImage } from '../../../packages/api/src/image-channel-adapters.js'
import { channelSchemaAccepts, auditedChannelContract } from '../../../packages/api/src/audited-channel-contracts.js'
// @ts-ignore independent generated consumer
import { STATIC_MODEL_REGISTRY as catalog, STATIC_MODEL_REGISTRY_VERSION } from '../../web/src/lib/staticModelCatalog.js'
const additions=JSON.parse(fs.readFileSync(new URL('./fixtures/catalog-20261026/additions.json',import.meta.url),'utf8'))
const endpoints:Record<string,string>={kimi:'https://api.moonshot.cn/v1/chat/completions',minimax:'https://api.minimax.io/v1/chat/completions',mistral:'https://api.mistral.ai/v1/chat/completions',together:'https://api.together.ai/v1/chat/completions',fireworks:'https://api.fireworks.ai/inference/v1/chat/completions',ark:'https://ark.cn-beijing.volces.com/api/v3/chat/completions',tokenhub:'https://tokenhub.tencentmaas.com/v1/chat/completions',iflytek:'https://maas-api.cn-huabei-1.xf-yun.com/v2/chat/completions',tokendance:'https://tokendance.space/gateway/v1/chat/completions'}
test('weekly 19 identities preserve defaults and keep unsupported protocol paths closed',()=>{
 assert.equal(STATIC_MODEL_REGISTRY_VERSION,'2026-10-31.v42')
 assert.equal(Object.values(catalog).reduce((n:number,p:any)=>n+p.models.length,0),1125)
 const defaults=JSON.parse(fs.readFileSync(new URL('./fixtures/catalog-20261016/baseline-defaults.json',import.meta.url),'utf8'))
 for(const [p,v] of Object.entries(defaults))assert.deepEqual(catalog[p].defaults,v)
 for(const {provider,id,vision}of additions){const m=catalog[provider].models.find((m:any)=>m.id===id);assert.ok(m.selectable,id);assert.equal(m.verified,false);assert.equal(m.verificationState,'catalog');assert.equal(m.roles.includes('vision'),vision);assert.equal(m.capabilities.referenceImages,vision)}
 for(const id of ['deepseek-v4.1-flash-1017','MiniMax/MiniMax-M3.1-Flash','xiaomi/mimo-v2.6-pro-ultraspeed'])assert.equal(catalog.bailian.models.some((m:any)=>m.id===id),true) // Follow-up workspace adapter, tested separately.
 for(const id of ['moonshotai/kimi-k3.1-pro','minimax/minimax-m3.1-flash'])assert.equal(catalog.novita.models.some((m:any)=>m.id===id),false)
 const sf=exactModelDetails('siliconflow','deepseek-ai/DeepSeek-V4.1-Flash')!.specifications
 assert.equal(sf.resolvedModel.modelId,'deepseek-v4.1-flash-1017');assert.equal(sf.contextWindowTokens,1048576)
 assert.equal(auditedChannelContract('iflytek','spark-x2.5').price.input,0.96)
 assert.equal(catalog.runware.models.find((m:any)=>m.id==='bria:20@1').label,'Bria FIBO 2.0')
})
test('every added route submits one exact mocked request, preserving channel parameter differences',async()=>{
 const r:any=await createRefineRuntime();let pending:any,calls:any[]=[]
 try{
 r.legacy.configureProviderWorkflow({...r.workflow,active:()=>true,key:async()=> 'fixture-key',call:async(_d:any,fn:any)=>fn(),pending:async()=>pending,checkpoint:async(v:any)=>{pending=v},record:async()=>{}})
 r.legacy.configureRuntimeFetch(async(input:any,init:any={})=>{
  const url=String(input)
  if(url==='https://tokendance.space/gateway/v1/models')return Response.json({data:additions.filter((x:any)=>x.provider==='tokendance').map((x:any)=>({id:x.id,supported_protocols:['openai:chat-completions']}))})
  assert.equal(init.method,'POST');calls.push({url,body:JSON.parse(init.body)})
  return Response.json({choices:[{finish_reason:'stop',message:{content:'fixture final',reasoning_content:'private fixture reasoning'}}]})
 })
 for(const {provider,id,vision}of additions.filter((x:any)=>x.provider!=='replicate'))for(const image of vision?[false,true]:[false]){
  pending=undefined;calls=[]
  const images=image?[{filename:'fixture.png',mimeType:'image/png',url:'data:image/png;base64,'+r.image.toString('base64')}]:[]
  assert.equal(await r.legacy.callTextModel(provider,id,'fixture-key','system','prompt',images),'fixture final',provider+'/'+id)
  assert.equal(calls.length,1);assert.equal(calls[0].url,endpoints[provider]);const b=calls[0].body;assert.equal(b.model,id)
  if(provider==='tokenhub'&&id.startsWith('kimi')){assert.equal(b.max_completion_tokens,16384);assert.equal(b.reasoning_effort,'low');assert.equal(b.max_tokens,undefined)}
  else assert.equal(b.reasoning_effort,undefined)
  if(provider==='minimax'||provider==='tokenhub'&&id.startsWith('minimax'))assert.equal(b.reasoning_split,true)
  if(provider==='iflytek'){assert.equal(b.max_completion_tokens,2048);assert.equal(b.max_tokens,undefined)}
  if(provider==='ark'&&id.startsWith('deepseek'))assert.deepEqual(b.thinking,{type:'disabled'})
  else assert.equal(b.thinking,undefined)
  if(image)assert.ok(b.messages[1].content.some((x:any)=>x.type==='image_url'))
 }
 }finally{await r.close()}
})
test('new retirement metadata retains identities and date-only evidence; effective expiries block without a transport',async()=>{
 const r:any=await createRefineRuntime(),now=Date.now;let calls=0
 try{
  r.legacy.configureRuntimeFetch(async()=>{calls++;throw Error('no transport allowed')})
  for(const [p,id,date]of [['openai','gpt-5.1-2025-11-13','2027-04-01'],['tokenhub','minimax-m2.7','2026-11-17'],['tokenhub','hy-image-v3','2026-11-12'],['tokenhub','seedream-image-v5.0-lite','2026-11-24']]){
   const m=catalog[p].models.find((x:any)=>x.id===id);assert.ok(m);assert.equal(m.expirationDate,date);assert.equal(m.expirationAt,undefined)
  }
  Date.now=()=>Date.parse('2026-10-26T12:00:00+08:00')
  for(const [p,id]of [['xiaomi','mimo-v2.5'],['xiaomi','mimo-v2.5-pro'],['ark','doubao-seed-2-0-lite-260215'],['ark','doubao-seed-2-0-mini-260215']]){
   assert.equal((await r.legacy.modelRegistry({provider:p})).providers[p].models.find((m:any)=>m.id===id).selectable,false)
   await assert.rejects(r.legacy.callTextModel(p,id,'fixture','system','prompt'))
  }
  Date.now=()=>Date.parse('2027-04-03T12:00:00+08:00')
  for(const [p,id]of [['openai','gpt-5.1-2025-11-13'],['tokenhub','minimax-m2.7']])await assert.rejects(r.legacy.callTextModel(p,id,'fixture','system','prompt'))
  assert.equal(calls,0)
 }finally{Date.now=now;await r.close()}
})

test('unchanged FIBO image requests fit independently captured 2.0 schemas without obsolete fields',()=>{
 const schemas=JSON.parse(fs.readFileSync(new URL('./fixtures/catalog-20261026/runware-schemas.json',import.meta.url),'utf8'))
 for(const id of ['bria:20@1','bria:21@1']) {
  const source={base64:'aGVsbG8=',dataUrl:'data:image/png;base64,aGVsbG8=',mimeType:'image/png'}
  for(const edited of id==='bria:20@1'?[false,true]:[true]){
   const b=buildAuditedRunwareImage({provider:'runware',model:id,prompt:'fixture prompt',source:edited?source:null,size:id==='bria:20@1'?{width:1024,height:1024}:{}} as any,'00000000-0000-4000-8000-000000000001')
   assert.ok(channelSchemaAccepts(schemas['runware/'+id].schema,b));assert.equal(b.steps,undefined);assert.equal(b.CFGScale,undefined)
   assert.equal(channelSchemaAccepts(schemas['runware/'+id].schema,{...b,steps:30}),false)
  }
 }
})

test('Replicate Opus pins the official version, preserves 8192 budget and resumes its text-array result',async()=>{
 const f=JSON.parse(fs.readFileSync(new URL('./fixtures/catalog-20261026/replicate-schema.json',import.meta.url),'utf8'))
 const input={provider:'replicate' as const,model:'anthropic/claude-opus-5.5',apiKey:'fixture',system:'system',user:'prompt',images:[]}
 const body=buildReplicateTextBody(input);assert.equal(body.version,f.version);assert.equal(body.input.max_tokens,8192);assert.ok(channelSchemaAccepts(f.input,body.input))
 assert.throws(()=>buildReplicateTextBody({...input,images:[{url:'data:image/png;base64,aGVsbG8='}]}))
 let pending:any,calls=0
 const io:any={pending:async()=>pending,checkpoint:async(v:any)=>{pending=v},record:async()=>{},now:()=>0,sleep:async()=>{},json:async(r:Response)=>r.json(),request:async(url:string,init:any)=>{calls++;assert.equal(url,'https://api.replicate.com/v1/predictions');assert.equal(init.method,'POST');assert.equal(JSON.parse(init.body).version,f.version);return Response.json({id:'fixture-task',version:f.version,status:'succeeded',output:['final ','answer']})}}
 assert.equal(await callReplicateTextChannel(input,io),'final answer');assert.equal(await callReplicateTextChannel(input,io),'final answer');assert.equal(calls,1)
})
