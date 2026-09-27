import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import {normalizeUniversalRoute,normalizeUniversalConnection,migrateUniversalLimitPolicy,effectiveUniversalLimits,UNIVERSAL_PLATFORM_LIMITS,parseUniversalCatalogMetadata} from '../../../packages/api/src/universal-api.js'
import {universalThinkingIdentity,compileThinkingSelection,normalizeThinkingConfiguration} from '../../../packages/api/src/thinking.js'
import {createUniversalRuntime,universalCatalogRows} from '../src/universal-adapters.js'
const png=await sharp({create:{width:2,height:2,channels:3,background:'#123456'}}).png().toBuffer()
function route(protocol='openai-chat',model='gpt-5',base='https://api.openai.com/v1',role='main'):any{return normalizeUniversalRoute({accessProvider:'custom',modelId:model,custom:{version:1,connectionId:'custom_'+role,protocol,baseUrl:base,compatibility:'standard',capabilities:{text:role!=='image',vision:role==='vision',imageGeneration:role==='image',imageEditing:role==='image'},inputLimits:{maxCount:2,maxBytes:5e6,maxTotalBytes:1e7,maxDimension:4096,maxPixels:16e6,requestMaxBytes:32e6,mimeTypes:['image/png']},outputLimits:{maxBytes:5e6,maxDimension:4096,maxPixels:16e6,mimeTypes:['image/png']},outputSizes:role==='image'?[{resolution:'1K',aspectRatio:'1:1',value:'1K'}]:[]}})}
const connection=(baseUrl:string,protocol:string,auth:string):any=>normalizeUniversalConnection({version:1,connectionId:'c',baseUrl,protocol,auth})
test('v1 ceilings migrate without relaxing runtime or claiming service evidence; known limits intersect',()=>{
 const r=route(),p=migrateUniversalLimitPolicy(r.custom);assert.deepEqual(p.service,{})
 assert.deepEqual(effectiveUniversalLimits(p),{inputLimits:r.custom.inputLimits,outputLimits:r.custom.outputLimits})
 const normalized=normalizeUniversalRoute({...r,custom:{...r.custom,limitPolicy:p}}),old=structuredClone(normalized);delete old.custom.limitPolicy
 assert.deepEqual(normalizeUniversalRoute(old).custom.inputLimits,normalized.custom.inputLimits)
 const e=effectiveUniversalLimits({version:1,service:{input:{maxCount:100,maxBytes:6e6,mimeTypes:['image/png','image/jpeg']}},user:{input:{maxCount:3,maxBytes:4e6,mimeTypes:['image/png']}}});assert.equal(e.inputLimits.maxCount,3);assert.equal(e.inputLimits.maxBytes,4e6);assert.equal(e.inputLimits.requestMaxBytes,UNIVERSAL_PLATFORM_LIMITS.requestMaxBytes);assert.deepEqual(e.inputLimits.mimeTypes,['image/png'])
 assert.equal(effectiveUniversalLimits({version:1,service:{},user:{}}).inputLimits.maxCount,8)
 assert.throws(()=>effectiveUniversalLimits({version:1,service:{input:{mimeTypes:['image/jpeg']}},user:{input:{mimeTypes:['image/png']}}}))
 for(const v of [-1,Infinity,'3',1.5])assert.throws(()=>effectiveUniversalLimits({version:1,service:{input:{maxCount:v as any}},user:{}}))
})
test('catalog metadata is bounded and endpoint-bound; missing facts do not imply image editing or limits',()=>{
 const a=connection('https://api.anthropic.com/v1','anthropic-messages','x-api-key'),time='2026-09-27T00:00:00Z'
 const row={id:'claude-sonnet-4-6',max_input_tokens:200000,max_tokens:64000,capabilities:{image_input:{supported:true},thinking:{supported:true,types:{adaptive:{supported:true}}}}}
 const info=parseUniversalCatalogMetadata(row,a,row.id,time).metadata!;assert.equal(info.source.kind,'official-api');assert.equal(info.facts.imageInput,true);assert.deepEqual(info.facts.thinkingModes,['adaptive']);assert.equal((info.facts as any).imageEditing,undefined);assert.equal((info.facts as any).maxCount,undefined)
 for(const change of [{baseUrl:'https://proxy.example.com/v1'},{auth:'bearer'}])assert.equal(parseUniversalCatalogMetadata(row,{...a,...change},row.id,time).metadata,undefined)
 const bad=universalCatalogRows({data:[{...row,max_tokens:0},null,{id:'good',max_tokens:512}]},a.protocol,'anthropic',a,time);assert.equal(bad.models.length,2);assert.ok(bad.warnings.some(x=>x.code==='metadata_invalid'));assert.equal(bad.models[0].metadata?.facts.outputTokenLimit,undefined)
 const gem=connection('https://generativelanguage.googleapis.com/v1beta','gemini-generate-content','x-goog-api-key'),g=parseUniversalCatalogMetadata({thinking:true,inputTokenLimit:1000000,supportedGenerationMethods:['generateContent']},gem,'models/x',time).metadata!;assert.equal(g.facts.imageInput,undefined);assert.equal(g.facts.imageOutput,undefined)
 const or=connection('https://openrouter.ai/api/v1','openai-chat','bearer'),o=parseUniversalCatalogMetadata({architecture:{input_modalities:['text','image'],output_modalities:['text']},reasoning:{supported_efforts:['low','high'],mandatory:true},supported_parameters:['reasoning','arbitrary-secret']},or,'x',time).metadata!;assert.equal(o.source.kind,'verified-service');assert.deepEqual(o.facts.supportedParameters,['reasoning']);assert.deepEqual(o.facts.reasoningEfforts,['low','high']);assert.equal(o.facts.reasoningMandatory,true)
 assert.equal(parseUniversalCatalogMetadata({architecture:'invalid',context_length:-1},or,'x',time).invalid,true)
})
const cases:any[]=[
 ['openai-chat','gpt-5','https://api.openai.com/v1','main',{effort:'low'},['reasoning_effort'],'low'],
 ['openai-responses','gpt-6-sol','https://api.openai.com/v1','vision',{effort:'high',mode:'pro'},['reasoning','effort'],'high'],
 ['anthropic-messages','claude-sonnet-4-6','https://api.anthropic.com/v1','main',{mode:'enabled',budget:1024},['thinking','budget_tokens'],1024],
 ['gemini-generate-content','gemini-2.5-flash','https://generativelanguage.googleapis.com/v1beta','vision',{budget:1024},['generationConfig','thinkingConfig','thinkingBudget'],1024],
 ['openai-chat','openai/gpt-5','https://openrouter.ai/api/v1','main',{effort:'low'},['reasoning','effort'],'low'],
 ['gemini-interactions','gemini-3.1-flash-image','https://generativelanguage.googleapis.com/v1beta','image',{effort:'high'},['generation_config','thinking_level'],'high'],
 ['dashscope-multimodal','wan2.7-image','https://dashscope.aliyuncs.com/api/v1','image',{mode:true},['parameters','thinking_mode'],true],
]
for(const [protocol,model,base,role,options,path,expected] of cases)test(`custom ${protocol} ${role}: final wire mapping, default omitted, binding isolated`,async()=>{
 const r=route(protocol,model,base,role),identity=universalThinkingIdentity(r),calls:any[]=[]
 const thinking=compileThinkingSelection({...identity,options},role)
 const response=protocol==='openai-responses'?{status:'completed',output:[{type:'message',status:'completed',content:[{type:'output_text',text:'ok'}]}]}:protocol==='anthropic-messages'?{stop_reason:'end_turn',content:[{type:'text',text:'ok'}]}:protocol==='gemini-generate-content'?{candidates:[{finishReason:'STOP',content:{parts:[{text:'ok'}]}}]}:role==='image'&&protocol==='gemini-interactions'?{status:'completed',steps:[{type:'model_output',content:[{type:'image',mime_type:'image/png',data:png.toString('base64')}]}]}:role==='image'?{output:{choices:[{finish_reason:'stop',message:{content:[{image:'data:image/png;base64,'+png.toString('base64')}]}}]}}:{choices:[{finish_reason:'stop',message:{content:'ok'}}]}
 const runtime=createUniversalRuntime({transport:{checkUrl:async()=>{},request:async request=>{calls.push(request);return {status:200,headers:new Headers(),bytes:Buffer.from(JSON.stringify(response))}}}})
 const run=(snapshot:any)=>role==='image'?runtime.image(r,'fixture',{prompt:'draw',aspectRatio:'1:1',imageSize:'1K',thinking:snapshot}):runtime.text(r,'fixture',{prompt:'read',thinking:snapshot,...(role==='vision'?{images:[{base64:png.toString('base64'),mimeType:'image/png'}]}:{})})
 await run(thinking);assert.equal(path.reduce((v:any,k:string)=>v?.[k],JSON.parse(calls[0].body)),expected)
 await run(compileThinkingSelection({...identity,options:{}},role));assert.equal(path.reduce((v:any,k:string)=>v?.[k],JSON.parse(calls[1].body)),undefined)
 const other={...r,custom:{...r.custom,baseUrl:'https://proxy.example.com/v1'}};assert.throws(()=>compileThinkingSelection({...universalThinkingIdentity(other),options},role));await assert.rejects(()=>runtime.text(other,'fixture',{prompt:'no',thinking}));assert.equal(calls.length,2)
})
test('forged bindings, range and mode conflicts reject before send; budget must leave room for actual output',async()=>{
 const r=route('anthropic-messages','claude-sonnet-4-6','https://api.anthropic.com/v1'),id=universalThinkingIdentity(r)
 const make=(options:any,conn:any=id.connection)=>({version:1,roles:{main:{...id,connection:conn,options}}})
 for(const options of [{mode:'adaptive',budget:1024},{mode:'enabled'},{mode:'enabled',budget:1},{effort:'nonsense'}])assert.throws(()=>normalizeThinkingConfiguration(make(options),{main:id}))
 assert.throws(()=>normalizeThinkingConfiguration(make({mode:'adaptive'},{...id.connection,baseUrl:'https://other.example.com/v1'}),{main:id}))
 const old:any=make({});delete old.roles.main.connection;assert.ok(normalizeThinkingConfiguration(old,{main:id}).thinkingSnapshot)
 let calls=0;const runtime=createUniversalRuntime({transport:{checkUrl:async()=>{},request:async()=>{calls++;throw Error('must not send')}}})
 assert.throws(()=>compileThinkingSelection({...id,options:{mode:'enabled',budget:4096}},'main'));await assert.rejects(()=>runtime.text(r,'fixture',{prompt:'no',maxTokens:1024,thinking:compileThinkingSelection({...id,options:{mode:'enabled',budget:1024}},'main')}),/预算须小于/);assert.equal(calls,0)
 const image=route('dashscope-multimodal','wan2.7-image','https://dashscope.aliyuncs.com/api/v1','image')
 await assert.rejects(()=>runtime.image(image,'fixture',{prompt:'edit',aspectRatio:'1:1',imageSize:'1K',sourceImages:[{base64:png.toString('base64'),mimeType:'image/png'}],thinking:compileThinkingSelection({...universalThinkingIdentity(image),options:{mode:true}},'image')}));assert.equal(calls,0)
})

test('documented DashScope workspace regions bind exactly; lookalike domains never inherit parameters',()=>{
 for(const base of ['https://demo.cn-beijing.maas.aliyuncs.com/api/v1','https://demo.ap-southeast-1.maas.aliyuncs.com/api/v1','https://dashscope-intl.aliyuncs.com/api/v1']){
 const r=route('dashscope-multimodal','wan2.7-image',base,'image');assert.equal((compileThinkingSelection({...universalThinkingIdentity(r),options:{mode:true}},'image').wire as any).parameters.thinking_mode,true)
 }
 const fake=route('dashscope-multimodal','wan2.7-image','https://demo.cn-beijing.maas.aliyuncs.com.evil.example.com/api/v1','image');assert.throws(()=>compileThinkingSelection({...universalThinkingIdentity(fake),options:{mode:true}},'image'))
})
