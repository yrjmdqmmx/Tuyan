import test from 'node:test'
import assert from 'node:assert/strict'
import {buildAuditedTextBody,callNewTextChannel} from '../../../packages/api/src/text-channel-adapters.js'
import {compileThinkingSelection} from '../../../packages/api/src/thinking.js'
import {referenceSubmissionPolicy} from '../../../packages/api/src/reference-upload.js'
import {auditedChannelContract, assertChannelRequest} from '../../../packages/api/src/audited-channel-contracts.js'
// @ts-ignore generated client oracle
import {STATIC_MODEL_REGISTRY as catalog,EXTENDED_MODEL_CHANNELS} from '../../web/src/lib/staticModelCatalog.js'
const antIds=['Ling-3.0-flash-VL','Ling-3.0-flash','Ling-3.0-tiny','Ling-2.6-1T','Ling-2.6-flash','Ring-2.6-1T']
const input=(model:string,images:any[]=[])=>({provider:(model.startsWith('LongCat')?'longcat':'antling') as 'longcat'|'antling',model,apiKey:'fixture-key',system:'Keep labels',user:'Explain the figure',images})
test('v3.8.1 exact identities, admitted roles, history, defaults and evidence boundary',()=>{
 assert.deepEqual(catalog.antling.models.map((m:any)=>m.id).sort(),[...antIds].sort())
 assert.deepEqual(catalog.longcat.models.map((m:any)=>m.id).sort(),['LongCat-2.0','LongCat-2.5-Preview'])
 assert.equal(EXTENDED_MODEL_CHANNELS.longcat.defaults.main,'LongCat-2.0')
 assert.equal(EXTENDED_MODEL_CHANNELS.longcat.defaults.vision,'LongCat-2.5-Preview')
 for(const provider of ['antling','longcat']) for(const m of catalog[provider].models){
  assert.deepEqual(m.roles,['Ling-3.0-flash-VL','LongCat-2.5-Preview'].includes(m.id)?['main','vision']:['main'])
  assert.equal(m.verified,false);assert.equal(m.verificationState,'catalog');assert.equal(m.capabilities.imageGeneration,false)
 }
 assert.equal(catalog.longcat.models.find((m:any)=>m.id==='LongCat-2.5-Preview').lifecycle,'preview')
 const p=referenceSubmissionPolicy('antling','Ling-3.0-flash-VL')
 assert.deepEqual(p.mimeTypes,['image/png','image/jpeg']);assert.equal(p.maxCount,3);assert.ok(p.maxPixels<=12845056);assert.ok(p.requestMaxBytes<=32000000)
})
for(const model of [...antIds,'LongCat-2.5-Preview']) test(model+': exact wire, one POST, complete response, usage separated from billing',async()=>{
 let calls=0,pending:any;const records:any[]=[]
 const i=input(model,model.endsWith('-VL')?[{url:'data:image/png;base64,c2NpZW5jZQ=='}]:[])
 const io={now:()=>0,sleep:async()=>{},json:async(r:Response)=>r.json(),pending:async()=>pending,checkpoint:async(v:any)=>{pending=v},record:async(v:any)=>{records.push(v)},request:async(url:string,init:any,_label:string,attempts:number)=>{
  calls++;assert.ok(pending.state.submitting);assert.equal(attempts,1);assert.equal(url,i.provider==='antling'?'https://api.ant-ling.com/v1/chat/completions':'https://api.longcat.chat/openai/v1/chat/completions')
  assert.equal(init.headers.Authorization,'Bearer fixture-key');assert.equal(init.redirect,'error')
  const body=JSON.parse(init.body);assert.equal(body.model,model);assert.equal(body.stream,false);assert.equal(body.thinking,undefined);assert.equal(body.reasoning,undefined)
  if(model.endsWith('-VL')){assert.equal(body.messages[1].content[1].image_url.detail,undefined);assert.equal(body.max_completion_tokens,8192)}
  if(model==='Ling-3.0-flash')assert.equal(body.max_tokens,8192,'documented SDK field, bounded Tuyan output budget')
  else if(model.startsWith('Ling')&&!model.endsWith('-VL')||model.startsWith('Ring'))assert.equal(body.max_tokens,undefined,'do not propagate Flash-only evidence to other IDs')
  return Response.json({id:'mock',model,usage:{prompt_tokens:7,completion_tokens:3},choices:[{finish_reason:'stop',message:{content:'Visible answer'}}]})
 }}
 assert.equal(await callNewTextChannel(i,io),'Visible answer');assert.equal(calls,1);assert.equal(records[0].invoiceCost,null);assert.equal(records[0].publicPrice.billedAmount,null)
 if(model==='Ling-3.0-tiny')assert.equal(records[0].publicPrice.CNY,null)
 await assert.rejects(()=>callNewTextChannel(i,io),/不能重新提交/);assert.equal(calls,1)
})
test('LongCat visual tutorial enables the existing image_url path and preserves provider versus product limits',async()=>{
 const contract=auditedChannelContract('longcat','LongCat-2.5-Preview')
 assert.equal(contract.providerMaxImages,50);assert.equal(contract.providerMaxImagesTentative,true)
 const model=catalog.longcat.models.find((m:any)=>m.id==='LongCat-2.5-Preview')
 assert.equal(model.capabilities.providerMaxReferenceImages,50);assert.equal(model.capabilities.maxReferenceImages,3)
 const images=['png','jpeg','webp'].map(mime=>({url:`data:image/${mime};base64,YQ==`}))
 let posts=0,checkpoint:any
 const result=await callNewTextChannel(input('LongCat-2.5-Preview',images),{
  now:()=>0,sleep:async()=>{},json:async(r:Response)=>r.json(),checkpoint:async v=>{checkpoint=v},request:async(url,init)=>{
   posts++;assert.ok(checkpoint.state.submitting);assert.equal(url,'https://api.longcat.chat/openai/v1/chat/completions')
   const body=JSON.parse(String(init.body));assert.deepEqual(body.messages[1].content,[{type:'text',text:'Explain the figure'},...images.map(i=>({type:'image_url',image_url:{url:i.url}}))])
   assert.equal(body.max_tokens,8192);assert.equal(body.thinking,undefined)
   return Response.json({choices:[{finish_reason:'stop',message:{content:'Image analysis'}}]})
  },
 });assert.equal(result,'Image analysis');assert.equal(posts,1)
 const policy=referenceSubmissionPolicy('longcat','LongCat-2.5-Preview');assert.equal(policy.maxCount,3);assert.equal(policy.maxAspectRatio,200);assert.match(policy.note,/暂定50/)
 assert.deepEqual(compileThinkingSelection({provider:'longcat',modelId:'LongCat-2.5-Preview',protocol:'openai-chat-completions',options:{mode:'enabled'}},'vision').wire,{thinking:{type:'enabled'}})
})
test('rechecked LongCat parameters reject unsupported wire values and reject unadmitted video blocks',()=>{
 const contract=auditedChannelContract('longcat','LongCat-2.5-Preview')
 const body=buildAuditedTextBody(input('LongCat-2.5-Preview'))
 for(const values of [{temperature:1.1},{temperature:-.1},{max_tokens:131073},{max_tokens:0},{max_tokens:1.2},{thinking:{type:'auto'}},{messages:[{role:'user',content:[{type:'video_url',video_url:{url:'https://example.com/v.mp4'}}]}]}])
  assert.throws(()=>assertChannelRequest(contract,{...body,...values}),(e:any)=>e.localInputFailure&&e.requestState==='not_sent')
 for(const values of [{temperature:0},{temperature:1},{max_tokens:131072},{thinking:{type:'disabled'}}])assert.doesNotThrow(()=>assertChannelRequest(contract,{...body,...values}))
})
test('vision restrictions and whole encoded request size reject before a provider request',()=>{
 for(const images of [[{url:'https://example.com/x.png'}],[{url:'data:image/webp;base64,YQ=='}],Array(4).fill({url:'data:image/png;base64,YQ=='})])assert.throws(()=>buildAuditedTextBody(input('Ling-3.0-flash-VL',images)),(e:any)=>e.requestState==='not_sent')
 assert.throws(()=>buildAuditedTextBody({...input('Ling-3.0-flash-VL'),user:'中'.repeat(10666667)}),(e:any)=>e.requestState==='not_sent')
 for(const images of [Array(4).fill({url:'data:image/png;base64,YQ=='}),[{url:'data:image/gif;base64,YQ=='}],[{url:'https://example.com/source.png'}]])assert.throws(()=>buildAuditedTextBody(input('LongCat-2.5-Preview',images)),(e:any)=>e.localInputFailure)
 assert.throws(()=>buildAuditedTextBody({...input('LongCat-2.5-Preview'),user:'中'.repeat(6666667)}),(e:any)=>e.requestState==='not_sent')
})
test('thinking uses model-specific fields and only documented values',()=>{
 for(const [provider,modelId,options,wire] of [['antling','Ling-3.0-flash',{mode:'disabled'},{thinking:{type:'disabled'}}],['antling','Ring-2.6-1T',{effort:'xhigh'},{reasoning:{effort:'xhigh'}}],['longcat','LongCat-2.5-Preview',{mode:'enabled'},{thinking:{type:'enabled'}}]] as any[]){
  assert.deepEqual(compileThinkingSelection({provider,modelId,protocol:'openai-chat-completions',options},'main').wire,wire)
  assert.deepEqual(compileThinkingSelection({provider,modelId,protocol:'openai-chat-completions',options:{}},'main').wire,{})
 }
 for(const [modelId,options] of [['Ring-2.6-1T',{effort:'low'}],['Ling-3.0-flash-VL',{mode:'disabled'}]])assert.throws(()=>compileThinkingSelection({provider:'antling',modelId,protocol:'openai-chat-completions',options} as any,'main'))
})
