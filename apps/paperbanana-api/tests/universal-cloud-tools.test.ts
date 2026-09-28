import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import {createUniversalRuntime} from '../src/universal-adapters.js'
import {normalizeUniversalRoute, universalExtensionDeclaration, universalCredential, BEDROCK_TEXT_MODEL} from '../../../packages/api/src/universal-api.js'
import {compileThinkingSelection,universalThinkingIdentity} from '../../../packages/api/src/thinking.js'
import {createRefineRuntime} from '../../../test-support/refine-runtime.mjs'

const png=await sharp({create:{width:64,height:64,channels:3,background:'red'}}).png().toBuffer()
const image={base64:png.toString('base64'),mimeType:'image/png'}
const call=(result=image.base64)=>({type:'image_generation_call',status:'completed',result})
const response=(output:any[]=[call()])=>({status:'completed',output})
function draft(provider='openai'):any {
  const c:any={version:1,connectionId:'custom_image',protocol:'openai-responses',baseUrl:'https://api.openai.com/v1',auth:'bearer',compatibility:'standard',imageTool:{provider:'openai',model:'gpt-image-1.5'},capabilities:{text:false,vision:false,imageGeneration:true,imageEditing:true},inputLimits:{maxCount:8,maxBytes:5000000,maxTotalBytes:20000000,maxDimension:4096,maxPixels:16000000,requestMaxBytes:30000000,mimeTypes:['image/png','image/jpeg','image/webp']},outputLimits:{maxBytes:5000000,maxDimension:8192,maxPixels:32000000,mimeTypes:['image/png','image/jpeg','image/webp']},outputSizes:[]}
  let modelId='gpt-4.1'
  if(provider==='xai'){c.baseUrl='https://api.x.ai/v1';c.imageTool={provider:'xai'};modelId='grok-4.7'}
  if(provider==='azure'){c.baseUrl='https://example-resource.openai.azure.com/openai/v1';c.auth='api-key';c.azure={deploymentModel:'gpt-4.1'};c.imageTool={provider:'azure',model:'gpt-image-1.5',deployment:'image-deployment'};modelId='text-deployment'}
  if(provider.startsWith('bedrock')) {delete c.imageTool;c.baseUrl='https://bedrock-runtime.us-west-2.amazonaws.com';c.protocol=provider;c.auth='bearer-expiring';modelId=provider==='bedrock-converse'?BEDROCK_TEXT_MODEL:'stability.sd3-5-large-v1:0';if(provider==='bedrock-invoke')c.bedrock={strength:0.65}}
  return {accessProvider:'custom',modelId,custom:universalExtensionDeclaration(c,modelId)!}
}
function mock(data:any=response()){
  const requests:any[]=[]
  return {requests,runtime:createUniversalRuntime({transport:{checkUrl:async()=>{},request:async r=>{requests.push(r);return {status:200,headers:new Headers({'content-type':'application/json'}),bytes:Buffer.from(JSON.stringify(data))}}}})}
}
const input={prompt:'scientific figure',imageSize:'auto',aspectRatio:'auto'}
test('Responses OpenAI generate/edit use own orchestration/image identities and omit defaults',async()=>{
  for(const sourceImages of [[],[image,image]]) {
    const f=mock(response([{type:'message',status:'completed',content:[{type:'output_text',text:'caption'}]},call(),call()]))
    assert.equal((await f.runtime.image(draft(),'image-role-key',{...input,sourceImages})).base64,image.base64)
    const b=JSON.parse(f.requests[0].body)
    assert.equal(b.model,'gpt-4.1');assert.deepEqual(b.tools,[{type:'image_generation',model:'gpt-image-1.5',action:sourceImages.length?'edit':'generate'}])
    assert.deepEqual(b.tool_choice,{type:'image_generation'});assert.equal(b.store,false);assert.equal(b.stream,false);assert.equal(b.previous_response_id,undefined)
    assert.equal(b.input[0].content.length,sourceImages.length+1);assert.equal(f.requests[0].headers.Authorization,'Bearer image-role-key')
    assert.equal(f.requests.length,1)
  }
})
test('Responses explicit OpenAI output options and last completed artifact selection',async()=>{
  const jpeg=await sharp(png).jpeg().toBuffer(),r=draft();r.custom.imageTool.quality='high';r.custom.imageTool.format='jpeg'
  const f=mock(response([call(),call(jpeg.toString('base64'))]))
  const output=await f.runtime.image(r,'key',{...input,imageSize:'1K',aspectRatio:'3:2'})
  assert.equal(output.mimeType,'image/jpeg');assert.equal(output.base64,jpeg.toString('base64'))
  assert.deepEqual(JSON.parse(f.requests[0].body).tools[0],{type:'image_generation',action:'generate',model:'gpt-image-1.5',size:'1536x1024',quality:'high',output_format:'jpeg'})
})
test('xAI only sends its own confirmed fields and refuses unsupported options/multiple input before send',async()=>{
  const f=mock(),r=draft('xai');await f.runtime.image(r,'xai-key',{...input,sourceImages:[image]})
  assert.deepEqual(JSON.parse(f.requests[0].body).tools,[{type:'image_generation',action:'edit'}])
  for(const changed of [{quality:'high'},{model:'gpt-image-1.5'},{format:'png'}]){const r=draft('xai');Object.assign(r.custom.imageTool,changed);assert.throws(()=>normalizeUniversalRoute(r))}
  const g=mock();await assert.rejects(g.runtime.image(r,'key',{...input,sourceImages:[image,image]}));assert.equal(g.requests.length,0)
})
test('Responses mixed tool, refusal, partial failure, malformed and empty output fail without resubmitting',async()=>{
  const bad=[response([]),response([call(),{type:'web_search_call',status:'completed'}]),response([call(),{type:'function_call',status:'completed'}]),response([call(),{type:'message',content:[{type:'refusal',refusal:'no'}]}]),response([call(),{...call(),status:'failed'}]),response([call('invalid'),call()]),{...response(),status:'incomplete'},response(Array.from({length:5},()=>call()))]
  for(const data of bad){const f=mock(data);await assert.rejects(f.runtime.image(draft(),'key',input),(e:any)=>e.requestState==='unknown');assert.equal(f.requests.length,1)}
  const r=draft();r.custom.capabilities.text=true
  await assert.rejects(mock().runtime.text(r,'key',{prompt:'text'})) // Tool allowance never leaks into text operation.
})
test('tool contracts never transfer to another service or unrecognized orchestrator',()=>{
  for(const mutate of [(r:any)=>r.custom.baseUrl='https://compatible.example.com/v1',(r:any)=>r.modelId='unknown',(r:any)=>r.custom.imageTool.extra=true,(r:any)=>r.custom.protocol='openai-chat']){const r=draft();mutate(r);assert.throws(()=>normalizeUniversalRoute(r))}
})
test('Azure v1 uses own deployment names and api-key header; no legacy api-version query',async()=>{
  const r=draft('azure'),f=mock();await f.runtime.image(r,'azure-key',input)
  assert.equal(f.requests[0].url,'https://example-resource.openai.azure.com/openai/v1/responses')
  assert.equal(f.requests[0].headers['api-key'],'azure-key');assert.equal(f.requests[0].headers.Authorization,undefined)
  assert.equal(f.requests[0].headers['x-ms-oai-image-generation-deployment'],'image-deployment')
  const b=JSON.parse(f.requests[0].body);assert.equal(b.model,'text-deployment');assert.equal(b.tools[0].model,undefined)
  const g=mock({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'ok'}]}]});delete r.custom.imageTool;r.custom.capabilities={text:true,vision:true,imageGeneration:false,imageEditing:false}
  r.custom.auth='bearer-expiring';await g.runtime.text(r,'token',{prompt:'vision',images:[image]});assert.equal(g.requests[0].headers.Authorization,'Bearer token')
})
test('Bedrock Converse native multimodal shape and existing thinking budget mapping',async()=>{
  const r=draft('bedrock-converse'),f=mock({stopReason:'end_turn',output:{message:{role:'assistant',content:[{reasoningContent:{reasoningText:{text:'hidden'}}},{text:'ok'}]}}})
  const snapshot=compileThinkingSelection({...universalThinkingIdentity(r),options:{mode:'enabled',budget:1024}},'vision')
  assert.equal(await f.runtime.text(r,'key',{prompt:'describe',images:[image],thinking:snapshot}),'ok')
  const b=JSON.parse(f.requests[0].body);assert.equal(b.model,undefined);assert.equal(b.messages[0].content[1].image.source.bytes,image.base64)
  assert.deepEqual(b.additionalModelRequestFields,{thinking:{type:'enabled',budget_tokens:1024}});assert.equal(b.inferenceConfig.maxTokens,4096)
  assert.match(f.requests[0].url,/\/model\/us\.anthropic.*%3A0\/converse$/)
  const def=mock({stopReason:'end_turn',output:{message:{content:[{text:'ok'}]}}});await def.runtime.text(r,'key',{prompt:'hi',thinking:compileThinkingSelection({...universalThinkingIdentity(r),options:{}},'main')});assert.equal(JSON.parse(def.requests[0].body).additionalModelRequestFields,undefined)
  await assert.rejects(f.runtime.text(r,'key',{prompt:'hi',maxTokens:1024,thinking:snapshot}))
  const over=mock();await assert.rejects(over.runtime.text(r,'key',{prompt:'hi',maxTokens:64001}));assert.equal(over.requests.length,0)
})
test('Bedrock InvokeModel uses model-specific generation and image-to-image schema',async()=>{
  const r=draft('bedrock-invoke'),f=mock({images:[image.base64],finish_reasons:[null]})
  await f.runtime.image(r,'key',input);await f.runtime.image(r,'key',{...input,sourceImages:[image]})
  assert.deepEqual(JSON.parse(f.requests[0].body),{prompt:input.prompt,output_format:'png',mode:'text-to-image'})
  assert.deepEqual(JSON.parse(f.requests[1].body),{prompt:input.prompt,output_format:'png',mode:'image-to-image',image:image.base64,strength:0.65})
  assert.match(f.requests[0].url,/\/model\/stability\.sd3-5-large-v1%3A0\/invoke$/)
  delete r.custom.bedrock;const g=mock();await assert.rejects(g.runtime.image(r,'key',{...input,sourceImages:[image]}));assert.equal(g.requests.length,0)
  r.custom.bedrock={strength:2};assert.throws(()=>normalizeUniversalRoute(r))
  r.custom.bedrock={strength:0.4};r.custom.baseUrl='https://bedrock-runtime.eu-west-1.amazonaws.com';assert.throws(()=>normalizeUniversalRoute(r))
})
test('Bedrock moderation and foreign tools are not accepted as success',async()=>{
  await assert.rejects(mock({images:[image.base64],finish_reasons:['Filter reason: prompt']}).runtime.image(draft('bedrock-invoke'),'key',input))
  await assert.rejects(mock({stopReason:'end_turn',output:{message:{content:[{text:'ok'},{toolUse:{name:'shell'}}]}}}).runtime.text(draft('bedrock-converse'),'key',{prompt:'hi'}))
})
test('Expiring BYOK binds exact connection, requires expiry, and preserves it through encrypted-secret selection',async()=>{
  const r=draft('bedrock-converse'),expiresAt=new Date(Date.now()+3600000).toISOString()
  const key={baseUrl:r.custom.baseUrl,protocol:r.custom.protocol,auth:r.custom.auth,apiKey:'fixture-token',expiresAt}
  const envelope=(x:any)=>JSON.stringify({custom_image:x})
  assert.equal(universalCredential(r,envelope(key)),'fixture-token')
  for(const expiresAt of [undefined,'bad',new Date(Date.now()-1).toISOString()])assert.throws(()=>universalCredential(r,envelope({...key,expiresAt})))
  const f=await createRefineRuntime()
  try { const selected=(f.legacy as any).selectRequiredRouteSecrets({main:r,vision:r,image:r},{custom:envelope(key)},['main']);assert.equal(JSON.parse(selected.custom).custom_image.expiresAt,expiresAt) } finally {await f.close()}
})
test('OpenAI image thinking maps to orchestration model and cannot follow a different tool identity',async()=>{
  const r=draft();r.modelId='gpt-5';const identity=universalThinkingIdentity(r)
  const snapshot=compileThinkingSelection({...identity,options:{effort:'low'}},'image'),f=mock()
  await f.runtime.image(r,'key',{...input,thinking:snapshot});assert.deepEqual(JSON.parse(f.requests[0].body).reasoning,{effort:'low'})
  r.custom.imageTool.model='gpt-image-1';const g=mock();await assert.rejects(g.runtime.image(r,'key',{...input,thinking:snapshot}));assert.equal(g.requests.length,0)
})

test('Azure Images v1 uses explicit preview version, deployment model and multipart edit',async()=>{
  const r=draft('azure');delete r.custom.imageTool;r.custom.protocol='openai-images';r.custom.azure.deploymentModel='gpt-image-1.5';r.modelId='image-deployment'
  const f=mock({data:[{b64_json:image.base64}]});await f.runtime.image(r,'key',input);await f.runtime.image(r,'key',{...input,sourceImages:[image,image]})
  assert.match(f.requests[0].url,/images\/generations\?api-version=preview$/);assert.equal(JSON.parse(f.requests[0].body).model,'image-deployment')
  assert.match(f.requests[1].url,/images\/edits\?api-version=preview$/);assert.match(Buffer.from(f.requests[1].body).toString(),/name="image\[\]"/)
})

test('Azure thinking uses current deployment identity and protocol mapping across main, vision and image roles',async()=>{
 for(const [protocol,role] of [['openai-chat','main'],['openai-responses','vision'],['openai-responses','image']] as const) {
  const r=draft('azure');r.custom.azure.deploymentModel='gpt-5';r.custom.protocol=protocol;r.modelId='reasoning-deployment'
  if(role!=='image'){delete r.custom.imageTool;r.custom.capabilities={text:true,vision:true,imageGeneration:false,imageEditing:false}}
  const data=role==='image'?response():protocol==='openai-chat'?{choices:[{finish_reason:'stop',message:{content:'ok'}}]}:{status:'completed',output:[{type:'message',content:[{type:'output_text',text:'ok'}]}]}
  const f=mock(data),thinking=compileThinkingSelection({...universalThinkingIdentity(r),options:{effort:'low'}},role)
  if(role==='image')await f.runtime.image(r,'key',{...input,thinking});else await f.runtime.text(r,'key',{prompt:'test',thinking})
  const wire=JSON.parse(f.requests[0].body);assert.equal(wire.model,'reasoning-deployment');assert.equal(protocol==='openai-chat'?wire.reasoning_effort:wire.reasoning.effort,'low')
  r.modelId='different-deployment';const other=mock(data);await assert.rejects(other.runtime.text(r,'key',{prompt:'test',thinking}));assert.equal(other.requests.length,0)
 }
})
