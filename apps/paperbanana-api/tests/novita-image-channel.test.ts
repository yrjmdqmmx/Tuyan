import assert from 'node:assert/strict'
import test from 'node:test'
import { buildNovitaImageRequest, callNovitaImageChannel } from '../../../packages/api/src/novita-image-channel.js'
import { callExtendedImageChannel, type ImageChannelInput, type ImageChannelCheckpoint, type ImageChannelTransport } from '../../../packages/api/src/image-channel-adapters.js'
// @ts-ignore generated client catalog oracle
import { STATIC_MODEL_REGISTRY as catalog } from '../../web/src/lib/staticModelCatalog.js'
import { compileThinkingSelection } from '../../../packages/api/src/thinking.js'
const input = (extra: Partial<ImageChannelInput> = {}): ImageChannelInput => ({ provider:'novita',model:'ming-image-0.1-design',apiKey:'novita-fixture',prompt:'科学流程图',aspectRatio:'1:1',resolution:'1K',size:{size:'1024x1024',width:1024,height:1024},...extra })
const output = {id:'fixture-result',model:'Ming-Image-0.1-Design-StressTest',data:[{b64_json:'valid-image'}],output_format:'png',size:null,usage:{total_tokens:53,output_tokens_details:{image_tokens:40,text_tokens:3}}}
function fixture(respond:()=>Response|Promise<Response> = ()=>Response.json(output)) {
 let state:ImageChannelCheckpoint|undefined
 const calls:any[]=[],records:any[]=[],downloads:string[]=[]
 const io:ImageChannelTransport = {
  pending:async()=>state,checkpoint:async v=>{state=structuredClone(v)},record:async v=>{records.push(v)},
  request:async(url,init,_label,attempts)=>{assert.equal(state?.state.submitting,true);calls.push({url,init,attempts});return respond()},
  json:async r=>r.json(),download:async url=>{downloads.push(url);return 'valid-image'},
  validate:v=>{assert.equal(v,'valid-image');return v},publicSource:async()=>{throw Error('no image inputs')},sleep:async()=>{throw Error('no polling')},now:()=>Date.now(),
 }
 return {io,calls,records,downloads,seed(v:ImageChannelCheckpoint){state=v},state:()=>state}
}
test('Novita catalog has one separate image-only identity with no direct edit or thinking toggle',()=>{
 const entry=catalog.novita;assert.equal(entry.accessKind,'aggregator');assert.equal(entry.models.length,1)
 const m=entry.models[0];assert.deepEqual(m.roles,['image']);assert.equal(m.capabilities.imageGeneration,true);assert.equal(m.capabilities.imageEditing,false);assert.equal(m.capabilities.maxReferenceImages,0)
 assert.deepEqual(m.capabilities.resolutions,['1K','2K']);assert.ok(m.capabilities.aspectRatios.every((r:string)=>['auto','1:1'].includes(r)))
 assert.throws(()=>compileThinkingSelection({provider:'novita',modelId:m.id,protocol:m.protocol,options:{mode:'enabled'}} as any,'image'))
})
test('Novita exact generation body: independent Bearer key, explicit size, no n/enable_thinking/source, one durable POST',async()=>{
 for(const resolution of ['1K','2K']){
  const edge=resolution==='1K'?1024:2048,request=input({resolution,size:{size:`${edge}x${edge}`,width:edge,height:edge}}),f=fixture()
  assert.equal(await callExtendedImageChannel(request,f.io),'valid-image');assert.equal(f.calls.length,1)
  const sent=f.calls[0];assert.equal(sent.url,'https://api.novita.ai/openai/v1/images/generations');assert.equal(sent.attempts,1);assert.equal(sent.init.redirect,'error')
  assert.equal(new Headers(sent.init.headers).get('Authorization'),'Bearer novita-fixture')
  assert.deepEqual(JSON.parse(sent.init.body),{model:request.model,prompt:request.prompt,size:`${edge}x${edge}`,output_format:'png',response_format:'b64_json'})
  assert.equal(f.records[0].outputFormat,'png');assert.equal(f.records[0].resolvedModel,output.model);assert.deepEqual(f.records[0].usage,output.usage);assert.equal(f.records[0].invoiceCost,null);assert.equal(f.records[0].estimatedCost,null)
  assert.equal(JSON.stringify(f.state()).includes('novita-fixture'),false)
  await callNovitaImageChannel(request,f.io);assert.equal(f.calls.length,1,'inline restore never resubmits')
 }
})
test('Novita rejects wrong identities, edit inputs and unsupported/inconsistent dimensions before checkpoint or transport',async()=>{
 const source={base64:'x',mimeType:'image/png',dataUrl:'data:image/png;base64,x'}
 for(const extra of [{provider:'antling'},{model:'ming-image-0.1-design-layer'},{model:'Ming-Image-0.1-Design'},{apiKey:''},{apiKey:'a\nb'},{prompt:' '},{source},{edit:{inputs:{version:1}}},{aspectRatio:'16:9'},{resolution:'4K'},{size:{size:'2048x2048'}},{size:{width:512,height:1024}}] as Partial<ImageChannelInput>[]){
  const f=fixture();await assert.rejects(callNovitaImageChannel(input(extra),f.io),(e:any)=>e.localInputFailure&&e.requestState==='not_sent');assert.equal(f.calls.length,0);assert.equal(f.state(),undefined)
 }
 const f=fixture();await assert.rejects(callNovitaImageChannel(input(),{...f.io,checkpoint:undefined}),/持久/);assert.equal(f.calls.length,0)
})
test('Novita response loss, 5xx and checkpoint loss cannot cause another charged POST',async()=>{
 for(const respond of [()=>{throw Error('connection lost')},()=>new Response('bad gateway',{status:502}),()=>new Response('truncated',{headers:{'Content-Type':'application/json'}})]){
  const f=fixture(respond);await assert.rejects(callNovitaImageChannel(input(),f.io),(e:any)=>e.requestState==='unknown');await assert.rejects(callNovitaImageChannel(input(),f.io),(e:any)=>e.requestState==='unknown');assert.equal(f.calls.length,1)
 }
 const f=fixture();await assert.rejects(callNovitaImageChannel(input(),{...f.io,checkpoint:async()=>{throw Error('disk')}}),(e:any)=>e.requestState==='not_sent');assert.equal(f.calls.length,0)
})
test('Novita known URL downloads resume without credentials or POST, including call-record failure',async()=>{
 const f=fixture(()=>Response.json({...output,data:[{url:'https://cdn.example.org/result.png'}]}));let fail=true
 const io={...f.io,record:async(v:unknown)=>{if(fail)throw Error('record unavailable');await f.io.record!(v)}}
 await assert.rejects(callNovitaImageChannel(input(),io),(e:any)=>e.requestState==='completed'&&e.recoveryAction==='resume')
 fail=false;assert.equal(await callNovitaImageChannel(input(),io),'valid-image');assert.equal(f.calls.length,1);assert.deepEqual(f.downloads,['https://cdn.example.org/result.png']);assert.equal(f.records[0].resolvedModel,output.model)
})
test('Novita refuses malformed, multi-layer or rejected responses without silent success or replay',async()=>{
 for(const data of [{data:[]},{data:[{b64_json:'valid-image'},{b64_json:'valid-image'}]},{data:[{url:'http://untrusted.example/a.png'}]},{data:[{b64_json:'broken'}]},{error:{message:'provider error'}}]){
  const f=fixture(()=>Response.json(data));await assert.rejects(callNovitaImageChannel(input(),f.io),(e:any)=>e.requestState==='completed');assert.equal(f.state()?.failed,true);await assert.rejects(callNovitaImageChannel(input(),f.io));assert.equal(f.calls.length,1)
 }
 const f=fixture(()=>new Response('',{status:401}));await assert.rejects(callNovitaImageChannel(input(),f.io),(e:any)=>e.requestState==='rejected');assert.equal(f.calls.length,1)
})
