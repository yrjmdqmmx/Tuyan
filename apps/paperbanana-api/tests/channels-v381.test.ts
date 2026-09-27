import test from 'node:test'
import assert from 'node:assert/strict'
import {buildAuditedTextBody,callNewTextChannel} from '../../../packages/api/src/text-channel-adapters.js'
import {compileThinkingSelection} from '../../../packages/api/src/thinking.js'
import {referenceSubmissionPolicy} from '../../../packages/api/src/reference-upload.js'
// @ts-ignore generated client oracle
import {STATIC_MODEL_REGISTRY as catalog,EXTENDED_MODEL_CHANNELS} from '../../web/src/lib/staticModelCatalog.js'
const antIds=['Ling-3.0-flash-VL','Ling-3.0-flash','Ling-3.0-tiny','Ling-2.6-1T','Ling-2.6-flash','Ring-2.6-1T']
const input=(model:string,images:any[]=[])=>({provider:(model.startsWith('LongCat')?'longcat':'antling') as 'longcat'|'antling',model,apiKey:'fixture-key',system:'Keep labels',user:'Explain the figure',images})
test('v3.8.1 exact identities, admitted roles, history, defaults and evidence boundary',()=>{
 assert.deepEqual(catalog.antling.models.map((m:any)=>m.id).sort(),[...antIds].sort())
 assert.deepEqual(catalog.longcat.models.map((m:any)=>m.id).sort(),['LongCat-2.0','LongCat-2.5-Preview'])
 assert.equal(EXTENDED_MODEL_CHANNELS.longcat.defaults.main,'LongCat-2.0')
 for(const provider of ['antling','longcat']) for(const m of catalog[provider].models){
  assert.deepEqual(m.roles,m.id==='Ling-3.0-flash-VL'?['main','vision']:['main'])
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
  if(model.startsWith('Ling')&&!model.endsWith('-VL')||model.startsWith('Ring'))assert.equal(body.max_tokens,undefined,'do not invent undocumented output fields')
  return Response.json({id:'mock',model,usage:{prompt_tokens:7,completion_tokens:3},choices:[{finish_reason:'stop',message:{content:'Visible answer'}}]})
 }}
 assert.equal(await callNewTextChannel(i,io),'Visible answer');assert.equal(calls,1);assert.equal(records[0].invoiceCost,null);assert.equal(records[0].publicPrice.billedAmount,null)
 if(model==='Ling-3.0-tiny')assert.equal(records[0].publicPrice.CNY,null)
 await assert.rejects(()=>callNewTextChannel(i,io),/不能重新提交/);assert.equal(calls,1)
})
test('vision restrictions and whole encoded request size reject before a provider request',()=>{
 for(const images of [[{url:'https://example.com/x.png'}],[{url:'data:image/webp;base64,YQ=='}],Array(4).fill({url:'data:image/png;base64,YQ=='})])assert.throws(()=>buildAuditedTextBody(input('Ling-3.0-flash-VL',images)),(e:any)=>e.requestState==='not_sent')
 assert.throws(()=>buildAuditedTextBody({...input('Ling-3.0-flash-VL'),user:'中'.repeat(10666667)}),(e:any)=>e.requestState==='not_sent')
 assert.throws(()=>buildAuditedTextBody(input('LongCat-2.5-Preview',[{url:'data:image/png;base64,YQ=='}])),(e:any)=>e.localInputFailure)
})
test('thinking uses model-specific fields and only documented values',()=>{
 for(const [provider,modelId,options,wire] of [['antling','Ling-3.0-flash',{mode:'disabled'},{thinking:{type:'disabled'}}],['antling','Ring-2.6-1T',{effort:'xhigh'},{reasoning:{effort:'xhigh'}}],['longcat','LongCat-2.5-Preview',{mode:'enabled'},{thinking:{type:'enabled'}}]] as any[]){
  assert.deepEqual(compileThinkingSelection({provider,modelId,protocol:'openai-chat-completions',options},'main').wire,wire)
  assert.deepEqual(compileThinkingSelection({provider,modelId,protocol:'openai-chat-completions',options:{}},'main').wire,{})
 }
 for(const [modelId,options] of [['Ring-2.6-1T',{effort:'low'}],['Ling-3.0-flash-VL',{mode:'disabled'}]])assert.throws(()=>compileThinkingSelection({provider:'antling',modelId,protocol:'openai-chat-completions',options} as any,'main'))
})
