import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRefineRuntime } from '../../../test-support/refine-runtime.mjs'
import { compileThinkingSelection, applyThinkingSnapshot } from '../../../packages/api/src/thinking.js'
import { callExtendedImageChannel, buildAuditedRunwareImage } from '../../../packages/api/src/image-channel-adapters.js'
import { channelSchemaAccepts } from '../../../packages/api/src/audited-channel-contracts.js'
import { IMAGE_CHANNEL_ROUTES } from '../../../packages/api/src/image-channel-routes.js'
// @ts-ignore independent generated consumer
import { STATIC_MODEL_REGISTRY as catalog, STATIC_MODEL_REGISTRY_VERSION } from '../../web/src/lib/staticModelCatalog.js'
const fixture=(name:string)=>JSON.parse(fs.readFileSync(new URL('./fixtures/catalog-20261016/'+name,import.meta.url),'utf8'))
const added=fixture('added.json'), live=fixture('openrouter.json')

test('new fal selections obey the independently captured per-side, alignment and pixel-area constraints',async()=>{
  const schemas=JSON.parse(fs.readFileSync(new URL('../../../config/model-channel-schemas.json',import.meta.url),'utf8'))
  const r:any=await createRefineRuntime()
  try {
    for(const {provider,modelId}of added.filter((x:any)=>x.provider==='fal')){
      const model=catalog[provider].models.find((m:any)=>m.id===modelId)
      for(const operation of ['generation','editing']){
        const route=(IMAGE_CHANNEL_ROUTES as any)[provider+'/'+modelId][operation]
        const bounds=schemas['fal/'+route.endpoint].input.properties.image_size['x-fal']
        const sizes=model.capabilities[operation==='editing'?'refineAspectRatiosByResolution':'aspectRatiosByResolution']
        for(const [resolution,ratios]of Object.entries(sizes) as [string,string[]][]){
          for(const ratio of ['auto',...ratios]){
            const size=r.legacy.resolveModelImageSize(provider,modelId,ratio,resolution,operation==='editing')
            assert.ok(size.width>=bounds.min_width&&size.width<=bounds.max_width,modelId+' width')
            assert.ok(size.height>=bounds.min_height&&size.height<=bounds.max_height,modelId+' height')
            assert.equal(size.width%bounds.multiple_of,0);assert.equal(size.height%bounds.multiple_of,0)
            assert.ok(size.width*size.height<=bounds.max_area,modelId+' area')
          }
        }
      }
    }
  }finally{await r.close()}
})

test('reviewed TokenDance absences remain blocked and newly discovered specialist models gain no roles',async()=>{
  const r:any=await createRefineRuntime({tokenDance:true});let inferenceCalls=0
  try {
    r.legacy.configureRuntimeFetch(async(input:any)=>{
      if(String(input).endsWith('/models'))return Response.json(fixture('tokendance-live.json'))
      inferenceCalls++;throw Error('absent models must not reach inference')
    })
    for(const id of ['deepseek-v3.2','qwen3-max'])await assert.rejects(r.legacy.callTextModel('tokendance',id,'fixture','system','prompt'),(e:any)=>e.requestState==='not_sent'&&/当前目录未列出/.test(e.message))
    assert.equal(inferenceCalls,0)
    for(const id of ['ateve-jev-v1','bocha-jev-v1','qwen3.7-text-rerank','qwen3.5-ocr','qwen-audio-3.0-asr-flash','qwen-audio-3.1-asr-flash','qwen-audio-3.1-asr-flash-message','yc-song-3.5','yc-song-4.0'])assert.ok(!catalog.tokendance.models.find((m:any)=>m.id===id)?.roles.length,id)
  }finally{await r.close()}
})

test('v32 preserves all channel defaults and exposes 20 exact unverified identities',()=>{
  assert.equal(STATIC_MODEL_REGISTRY_VERSION,'2026-10-16.v34')
  for(const [provider,defaults]of Object.entries(fixture('baseline-defaults.json')))assert.deepEqual(catalog[provider].defaults,defaults)
  assert.equal(added.length,20)
  for(const {provider,modelId}of added){
    const m=catalog[provider].models.find((m:any)=>m.id===modelId)
    assert.ok(m,provider+'/'+modelId);assert.equal(m.verified,false);assert.equal(m.verificationState,'catalog')
    assert.equal(m.specifications.checkedAt,'2026-10-16')
  }
  assert.equal(catalog.tokenhub.models.find((m:any)=>m.id==='deepseek-v4-flash-0731').expirationAt,'2026-10-31T00:00:00+08:00')
  assert.equal(catalog.tokenhub.models.find((m:any)=>m.id==='deepseek/deepseek-v4-flash-0731').expirationAt,undefined,'hosted retirement must not retire the manufacturer-direct ID')
})

test('Argon thinking uses exact GenerateContent fields, rejects off and clears deprecated budgets',()=>{
  const selection={provider:'gemini',modelId:'gemini-4-argon',protocol:'gemini-generate-content',options:{effort:'high'}}
  const snapshot=compileThinkingSelection(selection,'main')
  assert.deepEqual(snapshot.wire,{generationConfig:{thinkingConfig:{thinkingLevel:'high'}}})
  const body=applyThinkingSnapshot({generationConfig:{temperature:0.2,topP:0.9,maxOutputTokens:8192,thinkingConfig:{thinkingBudget:1024}}},snapshot)
  assert.deepEqual(body.generationConfig,{maxOutputTokens:8192,thinkingConfig:{thinkingLevel:'high'}})
  assert.deepEqual(compileThinkingSelection({...selection,options:{}},'main').wire,{})
  assert.throws(()=>compileThinkingSelection({...selection,options:{effort:'minimal'}},'main'))
  assert.throws(()=>compileThinkingSelection({...selection,options:{mode:'disabled'}},'main'))
})

test('new text and vision selections reach exact channel URLs and preserve output ceilings (mock transport)',async()=>{
  const r:any=await createRefineRuntime();let calls:any[]=[],pending:any
  try {
    r.legacy.configureProviderWorkflow({...r.workflow,active:()=>true,call:async(_d:any,fn:any)=>fn(),pending:async()=>pending,checkpoint:async(v:any)=>{pending=v},record:async()=>{}})
    r.legacy.configureRuntimeFetch(async(url:any,init:any={})=>{
      const body=JSON.parse(init.body);calls.push({url:String(url),body})
      if(String(url).includes(':generateContent'))return Response.json({candidates:[{content:{parts:[{thought:true,text:'hidden'},{text:'answer'}]}}]})
      return Response.json({choices:[{finish_reason:'stop',message:{content:'answer'}}]})
    })
    for(const {provider,modelId}of added){
      const entry=catalog[provider].models.find((m:any)=>m.id===modelId)
      if(!entry.roles.includes('main'))continue
      for(const withImage of entry.roles.includes('vision')?[false,true]:[false]){
        calls=[];pending=undefined
        const images=withImage?[{filename:'fixture.png',mimeType:'image/png',url:'data:image/png;base64,'+r.image.toString('base64')}]:[]
        assert.equal(await r.legacy.callTextModel(provider,modelId,'fixture-key','system','prompt',images),'answer',provider+'/'+modelId)
        assert.equal(calls.length,1)
        const {url,body}=calls[0]
        if(provider==='gemini'){
          assert.ok(url.includes('/models/gemini-4-argon:generateContent'))
          assert.equal(body.generationConfig?.temperature,undefined)
          assert.equal(body.contents[0].parts.length,withImage?2:1)
        }else{
          assert.equal(body.model,modelId)
          assert.ok(url.endsWith('/chat/completions'))
          if(['tokenhub','xiaomi'].includes(provider))assert.equal(body.max_tokens||body.max_completion_tokens,8192)
          else {assert.equal(body.max_tokens,undefined);assert.equal(body.max_completion_tokens,undefined,'generic chat keeps its existing provider-default budget policy')}
          if(provider==='tokenhub')assert.equal(new URL(url).hostname,'tokenhub.tencentmaas.com')
          if(provider==='xiaomi')assert.equal(new URL(url).hostname,'api.xiaomimimo.com')
          if(withImage)assert.ok(body.messages.at(-1).content.some((p:any)=>p.type==='image_url'))
        }
      }
    }
  }finally{await r.close()}
})

test('all new image routes build generation and source-edit requests and recover without a second submission',async()=>{
  const r:any=await createRefineRuntime();let pending:any,calls:any[]=[]
  try {
    const source={base64:r.image.toString('base64'),mimeType:'image/png',dataUrl:'data:image/png;base64,'+r.image.toString('base64')}
    const bflSchema=fixture('bfl-klein-input.json')
    for(const {provider,modelId}of added){
      const entry=catalog[provider].models.find((m:any)=>m.id===modelId)
      if(!entry.roles.includes('image')||provider==='bailian')continue
      for(const editing of [false,true]){
        pending=undefined;calls=[]
        const size=r.legacy.resolveModelImageSize(provider,modelId,'1:1','2K',editing)
        const io:any={pending:async()=>pending,checkpoint:async(v:any)=>{pending=structuredClone(v)},request:async(url:string,init:any)=>{
          calls.push({url,init});const body=init.body?JSON.parse(init.body):undefined
          if(provider==='runware')return Response.json({data:[{taskUUID:body[0].taskUUID,imageURL:'https://asset.invalid/output.png'}]})
          if(init.method==='POST')return Response.json(provider==='bfl'?{id:'fixture',polling_url:'https://api.bfl.ai/v1/get_result?id=fixture'}:{request_id:'fixture'})
          if(provider==='bfl')return Response.json({status:'Ready',result:{sample:'https://asset.invalid/output.png'}})
          return Response.json(url.endsWith('/status')?{status:'COMPLETED'}:{images:[{url:'https://asset.invalid/output.png'}]})
        },json:(response:Response)=>response.json(),download:async()=>source.base64,validate:(s:string)=>s,publicSource:async()=>{throw Error('unexpected upload')},sleep:async()=>{},now:()=>0,pollTimeoutMs:1000}
        const input:any={provider,model:modelId,apiKey:'fixture-key',prompt:'Draw a scientific diagram',aspectRatio:'1:1',resolution:'2K',size,source:editing?source:null}
        assert.equal(await callExtendedImageChannel(input,io),source.base64)
        assert.equal(await callExtendedImageChannel(input,io),source.base64)
        assert.equal(calls.filter(c=>c.init.method==='POST').length,1)
        const body=JSON.parse(calls[0].init.body)
        if(provider==='bfl'){
          assert.ok(calls[0].url.endsWith('/v1/flux-3-image-klein'))
          assert.ok(channelSchemaAccepts(bflSchema,body))
          assert.equal(body.output_format,'png');assert.equal(body.resolution,'2k')
          assert.equal(body.grounding,undefined);assert.equal(body.version,undefined)
          assert.deepEqual(body.images,editing?[source.base64]:undefined)
        }else if(provider==='fal'){
          const endpoint=modelId.startsWith('krea/')?'krea/v3/'+(editing?'edit':'text-to-image'):modelId.replace(/text-to-image$/,editing?'edit-image':'text-to-image')
          assert.equal(calls[0].url,'https://queue.fal.run/'+endpoint)
          assert.deepEqual(body.image_size,{width:2048,height:2048});assert.equal(body.output_format,'png')
          assert.deepEqual(body.image_urls,editing?[source.dataUrl]:undefined)
          if(modelId.startsWith('krea/')){assert.equal(body.reasoning_level,'low');assert.equal(body.model,'berry')}
        }else{
          assert.equal(body[0].model,modelId);assert.equal(body[0].numberResults,1);assert.equal(body[0].outputFormat,'PNG')
          assert.deepEqual(body[0].inputs?.referenceImages,editing?[source.dataUrl]:undefined)
          const tooMany={...input,source,edit:{references:Array.from({length:modelId.includes('klein')?4:10},()=>source),inputs:{}}}
          assert.throws(()=>buildAuditedRunwareImage(tooMany,'50fe6560-dfde-43df-a86a-d3a820ba063e'))
        }
      }
    }
    for(const [provider,model]of [['fal','krea/v3/text-to-image'],['runware','alibaba:qwen-image@2.1-turbo'],['bailian','qwen-image-2.1-pro'],['bailian','qwen-image-2.1-turbo']])assert.throws(()=>r.legacy.resolveModelImageSize(provider,model,'1:1','4K',false))
  }finally{await r.close()}
})

test('Qwen 2.1 uses synchronous DashScope, one result and channel-specific pixel sizes',async()=>{
  const r:any=await createRefineRuntime();let calls:any[]=[]
  try {
    r.legacy.configureRuntimeFetch(async(url:any,init:any={})=>{
      if(init.method==='POST'){calls.push({url:String(url),body:JSON.parse(init.body)});return Response.json({output:{choices:[{message:{content:[{image:'https://assets.example.org/fixture.png'}]}}]}})}
      return new Response(new Uint8Array(r.output),{headers:{'content-type':'image/png'}})
    })
    for(const model of ['qwen-image-2.1-pro','qwen-image-2.1-turbo'])for(const editing of [false,true]){
      calls=[]
      assert.ok(await r.legacy.callImageModel('bailian',model,'fixture-key','Draw a diagram','1:1',editing?r.image.toString('base64'):'','2K'))
      assert.equal(calls.length,1)
      const {url,body}=calls[0];assert.ok(url.endsWith('/multimodal-generation/generation'));assert.equal(body.model,model)
      assert.equal(body.parameters.size,'2048*2048');assert.equal(body.parameters.n,1);assert.equal(body.parameters.prompt_extend,true)
      assert.equal(body.input.messages[0].content.filter((p:any)=>p.image).length,editing?1:0)
    }
  }finally{await r.close()}
})

test('current public OpenRouter additions are dynamic; batch and undocumented image formats stay gated',async()=>{
  const r:any=await createRefineRuntime()
  try {
    r.legacy.configureRuntimeFetch(async(url:any)=>Response.json({data:String(url).endsWith('/images/models')?live.images:live.chat}))
    const result=(await r.post({action:'modelRegistry',provider:'openrouter'})).data
    assert.equal(result.code,0)
    const models=result.providers.openrouter.models
    for(const id of ['google/gemini-4-argon','meta/muse-spark-open','nvidia/nemotron-3.5-super-vl','meta/muse-wonder'])assert.ok(models.find((m:any)=>m.id===id)?.roles.includes('main'),id)
    assert.ok(models.filter((m:any)=>m.id.endsWith(':batch')).every((m:any)=>m.selectable===false && m.roles.length===0))
    for(const id of ['black-forest-labs/flux-3-image-klein','krea/k3-edit'])assert.equal(models.find((m:any)=>m.id===id)?.roles.includes('image')||false,false)
  }finally{await r.close()}
})
