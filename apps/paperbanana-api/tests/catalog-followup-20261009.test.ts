import test from 'node:test'
import assert from 'node:assert/strict'
import {callExtendedImageChannel, type ImageChannelTransport} from '../../../packages/api/src/image-channel-adapters.js'
import {tokenDanceChat, tokenDanceChatBody} from '../../../packages/api/src/tokendance.js'
import {compileThinkingSelection, applyThinkingSnapshot} from '../../../packages/api/src/thinking.js'
import {buildAuditedTextBody} from '../../../packages/api/src/text-channel-adapters.js'
import {createRefineRuntime} from '../../../test-support/refine-runtime.mjs'
// @ts-ignore generated independent client data
import {STATIC_MODEL_REGISTRY as catalog} from '../../web/src/lib/staticModelCatalog.js'
const model='ideogram-4-5'
const input={provider:'ideogram',model,apiKey:'fixture-key',prompt:'scientific figure',aspectRatio:'1:1',resolution:'1K',size:{size:'1024x1024',width:1024,height:1024}}
function fixture(respond:(u:string,i:RequestInit)=>Promise<Response>|Response) {
 let pending:any;const calls:any[]=[]
 const io:ImageChannelTransport={pending:async()=>pending,checkpoint:async p=>{pending=structuredClone(p)},request:async(u,i,_l,n)=>{calls.push({url:u,init:i,attempts:n});return respond(u,i)},json:async r=>r.json(),download:async()=> 'png-output',publicSource:async()=>{throw Error('v2 multipart never uploads to a public host')},validate:s=>s,sleep:async()=>{},now:()=>0}
 return {io,calls,pending:()=>pending}
}
function source(width=100,height=100){const b=Buffer.alloc(24);b.writeUInt32BE(0x89504e47,0);b.writeUInt32BE(width,16);b.writeUInt32BE(height,20);return {base64:b.toString('base64'),mimeType:'image/png',dataUrl:'data:image/png;base64,'+b.toString('base64')}}

test('Ideogram v2 generation uses root JSON; precise edit uses multipart and omits output size',async()=>{
 for(const editing of [false,true]){
  const f=fixture(()=>Response.json({generation_id:'original',data:[{url:'https://asset.invalid/figure.png',is_image_safe:true}]}))
  await callExtendedImageChannel({...input,...(editing?{source:source(),aspectRatio:'auto',resolution:'auto',size:{}}:{})},f.io)
  const {url,init,attempts}=f.calls[0];assert.equal(attempts,1)
  assert.equal(url,`https://api.ideogram.ai/v2/image/${editing?'precise-edit':'generate'}/${model}`)
  if(editing){assert.ok(init.body instanceof FormData);assert.equal(init.body.get('prompt'),input.prompt);assert.ok(init.body.get('image') instanceof Blob);assert.equal(new Headers(init.headers).has('Content-Type'),false);for(const key of ['model','size','resolution','aspect_ratio','mask_url'])assert.equal(init.body.has(key),false)}
  else {assert.deepEqual(JSON.parse(init.body),{num_images:1,async:false,prompt:input.prompt,size:'1024x1024'});assert.equal(new Headers(init.headers).get('Content-Type'),'application/json')}
  assert.equal(f.pending().taskId,'original');assert.equal(f.pending().result.url,'https://asset.invalid/figure.png')
 }
})
test('Ideogram v2 rejects unsupported masks, image ratios and explicit edit size before transport',async()=>{
 const f=fixture(()=>{throw Error('must not send')})
 for(const extra of [{source:source(700,100),aspectRatio:'auto',resolution:'auto',size:{}},{source:source(),aspectRatio:'1:1',resolution:'1K'},{source:source(),aspectRatio:'auto',resolution:'auto',edit:{inputs:{version:1 as const,mask:{objectKey:'mask'}},mask:source()}}])await assert.rejects(callExtendedImageChannel({...input,...extra},f.io))
 assert.equal(f.calls.length,0)
})
test('Ideogram v2 lost responses never resubmit; failed downloads only reuse stored result',async()=>{
 const lost=fixture(()=>{throw Error('connection lost')})
 for(let i=0;i<2;i++)await assert.rejects(callExtendedImageChannel(input,lost.io),(e:any)=>e.terminal&&e.uncertain&&e.requestState==='unknown')
 assert.equal(lost.calls.length,1)
 const f=fixture(()=>Response.json({generation_id:'original',data:[{url:'https://asset.invalid/figure.png'}]}));let downloads=0
 f.io.download=async()=>{if(!downloads++)throw Error('download failed');return 'png-output'}
 await assert.rejects(callExtendedImageChannel(input,f.io),(e:any)=>e.pollOnly===true)
 assert.equal(await callExtendedImageChannel(input,f.io),'png-output');assert.equal(f.calls.length,1)
})
test('Ideogram v2 requires durable recovery before submitting and preserves a moderation failure',async()=>{
 const missing=fixture(()=>{throw Error('must not send')})
 for(const field of ['pending','checkpoint'] as const)await assert.rejects(callExtendedImageChannel(input,{...missing.io,[field]:undefined}),(e:any)=>e.localInputFailure&&e.requestState==='not_sent')
 assert.equal(missing.calls.length,0)
 const failedSave=fixture(()=>{throw Error('must not send')});failedSave.io.checkpoint=async()=>{throw Error('storage unavailable')}
 await assert.rejects(callExtendedImageChannel(input,failedSave.io),/storage unavailable/);assert.equal(failedSave.calls.length,0)
 const moderated=fixture(()=>Response.json({data:[{is_image_safe:false}]}))
 await assert.rejects(callExtendedImageChannel(input,moderated.io),(e:any)=>e.terminal)
 assert.equal(moderated.pending().failed,true)
 await assert.rejects(callExtendedImageChannel(input,moderated.io),(e:any)=>e.terminal)
 assert.equal(moderated.calls.length,1)
})
test('TokenDance additions use only documented text route; controls and vision remain gated',async()=>{
 for(const id of ['ling-3.1-flash','mimo-v2.6-pro','mimo-v2.6-flash','mimo-v2.6-ultraspeed']){
  const body=tokenDanceChatBody(id,'system','prompt',[],false)
  assert.equal(body.model,id);assert.equal('reasoning_effort' in body,false)
  assert.throws(()=>tokenDanceChatBody(id,'system','prompt',[{url:'https://asset.invalid/input.png'}]))
  assert.throws(()=>compileThinkingSelection({provider:'tokendance',modelId:id,protocol:'openai-chat-completions',options:{effort:'high'}},'main'))
  const calls:any[]=[]
  const fetcher:typeof fetch=async(u,i)=>{calls.push({url:u,body:JSON.parse(String(i?.body))});return Response.json({choices:[{message:{content:'answer'}}]})}
  const result=await tokenDanceChat(fetcher,id,'fixture-key','system','prompt',[])
  assert.equal(result.text,'answer');assert.equal(calls[0].url,'https://tokendance.space/gateway/v1/chat/completions');assert.equal(calls[0].body.model,id)
  const m=catalog.tokendance.models.find((m:any)=>m.id===id);assert.equal(m.verified,false);assert.deepEqual(m.roles,['main'])
 }
 const ling=catalog.tokendance.models.find((m:any)=>m.id==='ling-3.1-flash');assert.equal(ling.specifications.contextWindowTokens,256000);assert.equal(ling.specifications.contextWindowApproximate,false)
})
test('SenseNova V4.1 has independent vision and effort limits; old ID/default remain',()=>{
 const body=buildAuditedTextBody({provider:'sensenova',model:'deepseek-flash',apiKey:'fixture',system:'system',user:'prompt',images:[{url:'data:image/png;base64,fixture'}]})
 assert.equal(body.model,'deepseek-flash');assert.equal(body.max_tokens,8192);assert.equal(body.messages[1].content[1].type,'image_url')
 for(const effort of ['none','low','high','max']){const snap=compileThinkingSelection({provider:'sensenova',modelId:'deepseek-flash',protocol:'openai-chat-completions',options:{effort}},'vision');assert.equal(applyThinkingSnapshot(body,snap).reasoning_effort,effort)}
 assert.throws(()=>compileThinkingSelection({provider:'sensenova',modelId:'deepseek-flash',protocol:'openai-chat-completions',options:{effort:'medium'}},'main'))
 assert.ok(catalog.sensenova.models.find((m:any)=>m.id==='deepseek-v4-flash'))
 const m=catalog.sensenova.models.find((m:any)=>m.id==='deepseek-flash');assert.equal(m.specifications.maxOutputTokens,393216);assert.ok(m.roles.includes('vision'))
})
test('Core resolves Ideogram operation sizes and dispatches new SenseNova text ID (mock transport)',async()=>{
 const r:any=await createRefineRuntime()
 try{
  assert.equal(r.legacy.resolveModelImageSize('ideogram',model,'1:1','1K').size,'1024x1024')
  assert.equal(r.legacy.resolveModelImageSize('ideogram',model,'1:2','2K').size,'1440x2880')
  assert.throws(()=>r.legacy.resolveModelImageSize('ideogram',model,'16:9','1K'))
  assert.deepEqual(r.legacy.resolveModelImageSize('ideogram',model,'auto','auto',true),{resolution:'auto'})
  r.legacy.configureRuntimeFetch(async(url:any,init:any)=>{assert.equal(String(url),'https://token.sensenova.cn/v1/chat/completions');const b=JSON.parse(init.body);assert.equal(b.model,'deepseek-flash');assert.equal(b.max_tokens,8192);return Response.json({choices:[{finish_reason:'stop',message:{content:'answer'}}]})})
  assert.equal(await r.legacy.callTextModel('sensenova','deepseek-flash','fixture-key','system','prompt'),'answer')
 }finally{await r.close()}
})

test('TokenDance MiMo retirement uses the channel cutoff without replacing saved model IDs',async(t)=>{
 const r:any=await createRefineRuntime();let calls=0
 try{
  r.legacy.configureRuntimeFetch(async()=>{calls++;throw Error('must not call upstream')})
  t.mock.method(Date,'now',()=>Date.parse('2026-10-21T02:00:00Z'))
  for(const id of ['mimo-v2.5','mimo-v2.5-pro']){
   const row=catalog.tokendance.models.find((m:any)=>m.id===id);assert.equal(row.expirationAt,'2026-10-21T10:00:00+08:00')
   await assert.rejects(r.legacy.callTextModel('tokendance',id,'fixture-key','system','prompt'),/停用|到期/)
  }
  assert.equal(calls,0)
 }finally{await r.close()}
})
