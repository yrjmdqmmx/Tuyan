import test from 'node:test'
import assert from 'node:assert/strict'
import {createRefineRuntime} from '../../../test-support/refine-runtime.mjs'
import {fixturePlusPricing,fixturePlusWorkspace} from '../../../test-support/plus-fixture.mjs'
import {plusModelRequest} from '../../../packages/api/src/plus-request.mjs'
import {createProviderWorkflow} from '../src/provider-workflow.js'
import {plusBailianUsage} from '../../../packages/api/src/plus-usage.mjs'
for(const streaming of [false,true])test(`managed SVG and PNG traverse the real runtime with bounded transport and full receipts ${streaming?'SSE':'JSON'}`,async()=>{
 const r:any=await createRefineRuntime({tokenDance:true});let sequence=0
 try{
  const workflow=createProviderWorkflow({db:r.db,service:r.tokenDanceService,plusEnabled:true});await workflow.ensureIndexes();r.legacy.configureProviderWorkflow(workflow)
  r.legacy.configureRuntimeFetch(async(url:any,init:any={})=>{
   const u=String(url);
   if(u.startsWith(r.baseUrl+'/objects/')){const o=r.objects.get(decodeURIComponent(u.slice((r.baseUrl+'/objects/').length)));return new Response(o?new Uint8Array(o.bytes):'',{status:o?200:404,headers:{'Content-Type':o?.mimeType||'image/png'}})}
   if(u==='https://generated.invalid/plus.png')return new Response(r.image,{headers:{'Content-Type':'image/png'}});
   assert.equal(new URL(u).origin,'https://dashscope.aliyuncs.com');
   r.providerCalls.push({url:u,options:init});
   if(u.endsWith('/multimodal-generation/generation')){const p=JSON.parse(init.body).parameters;assert.equal(p.n,1);assert.equal(p.watermark,false);return Response.json({request_id:'fixture-'+(++sequence),output:{choices:[{message:{content:[{image:'https://generated.invalid/plus.png'}]}}]},usage:{input_image_count:0,output_image_count:1,input_image_type:'qima_input_1k',output_image_type:'qima_output_1k'}});}
   const wire=JSON.parse(init.body),system=JSON.stringify(wire.instructions||wire.messages?.filter((m:any)=>m.role==='system')||'');
   const user=typeof wire.input==='string'?wire.input:[...(Array.isArray(wire.input)?wire.input:[]),...(wire.messages||[])].filter((m:any)=>m.role==='user').flatMap((m:any)=>typeof m.content==='string'?[m.content]:m.content.filter((p:any)=>['text','input_text'].includes(p.type)).map((p:any)=>p.text)).join('\n');
   assert.equal(wire.enable_thinking,true);assert.ok(wire.thinking_budget>0);assert.ok(wire.max_tokens<=16384);
   let content;
   if(system.includes('material-aware scientific figure planner'))content=JSON.stringify({status:'ready',missingInputs:[],plan:{drawing:'A labeled workflow from input to output. Synthetic fixture only.'}});
   else if(system.includes('Lead Visual Designer'))content=JSON.stringify({status:'ready',missingInputs:[],plan:{drawing:'Use a clear left-to-right layout, dark text and aligned boxes.'}});
   else if(system.includes('main model responsible for the scientific diagram'))content='Preserve the Input and Output labels, positions and arrows. Change their color to navy.';
   else if(system.includes('SVG Diagram Agent'))content='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="white"/><text x="30" y="60">Input to output</text></svg>';
   else if(/SVG visual AND code review|PNG visual review AFTER generation/.test(system)){
    const c=JSON.parse(user);content=JSON.stringify({version:c.version,...(c.svgHash?{svgHash:c.svgHash,code:{status:'passed',findings:[]}}:{pngHash:c.pngHash}),numericReview:{applicable:false,reason:'Synthetic workflow contains no quantitative geometry',checks:[]},visual:{status:'passed',findings:[]},uncertainties:[],revised_description:'No changes needed.'});
   }else if(system.includes('visual observer assisting'))content=JSON.stringify({content:'Synthetic workflow',actual_text:['Input','Output'],layout:'left to right',connections:['Input to Output'],problems:[],suggestions:[],uncertainties:[]});
   else throw Error('Unexpected mocked stage '+system.slice(0,100));
   assert.equal(wire.stream_options.include_usage,true);
   const receipt={id:'fixture-'+(++sequence),usage:{prompt_tokens:100,prompt_tokens_details:{cached_tokens:0},completion_tokens:200}};
   if(streaming)return new Response([
    {id:receipt.id,choices:[{index:0,delta:{reasoning_content:'not visible'}}]},
    {id:receipt.id,choices:[{index:0,delta:{content},finish_reason:'stop'}]},
    {...receipt,choices:[]}, {...receipt,choices:[]},
   ].map(e=>'data: '+JSON.stringify(e)+'\n\n').join('')+'data: [DONE]\n\n',{headers:{'Content-Type':'text/event-stream'}});
   return Response.json({...receipt,choices:[{finish_reason:'stop',message:{content}}]});
  });
  for(const variant of ['svg','png','png-edit']){
   const path=variant==='svg'?'svg':'png',kind=variant==='png-edit'?'edit':'generate';
   const operationKey='runtime-'+variant,workspace=fixturePlusWorkspace(path);workspace.runId=operationKey;workspace.request.retrievalSetting='none'
   if(kind==='edit'){
    const prepared=await r.post({action:'prepareMaterialUpload',files:[{filename:'synthetic-source.png',size:r.image.length}]});assert.equal(prepared.data.code,0);const upload=prepared.data.uploads[0];
    const put=await fetch(upload.uploadUrl,{method:'PUT',headers:{'Content-Type':upload.mimeType},body:new Uint8Array(r.image)});assert.ok(put.ok);
    const finalized=await r.post({action:'finalizeMaterialUpload',materialId:upload.id});assert.equal(finalized.data.code,0);
    Object.assign(workspace.request,{action:'refineImage',editInstruction:'Keep the Input and Output labels; change their color to navy.',sourceImageUpload:{materialId:upload.id}});
   }
   const request=plusModelRequest(workspace,{path,kind,mode:'fast',candidates:1,reviews:1,imageSize:'1K',aspectRatio:'1:1'},{apiKey:'fixture-not-a-key',operationKey,budget:{maxCostMicros:5000000,pricingVersion:fixturePlusPricing.version,tariff:fixturePlusPricing.tariff,limits:{...fixturePlusPricing.transportLimits,maxInputBytes:65536}}})
   const response=await r.invoke({...request,userId:'refine-owner'});assert.equal(response.code,0,JSON.stringify(response));await r.legacy.drainJobAdmission()
   const result=await r.invoke({action:'getJob',jobId:response.jobId,userId:'refine-owner'}),job=result.job
   assert.equal(job.status,'succeeded',JSON.stringify({error:job.error,progress:job.candidateProgress,usage:job.plusUsage}));assert.ok(job.resultImages.length);assert.equal(job.plusUsage.complete,true);assert.equal(job.plusUsage.operationKey,operationKey)
   if(kind==='edit'){assert.equal(job.candidateProgress[0].review.status,'passed',JSON.stringify(job.stages));assert.ok(job.plusUsage.calls.length>=5)}
   assert.ok(job.plusUsage.calls.length>=3);assert.ok(job.plusUsage.calls.every((c:any)=>plusBailianUsage(c).state==='confirmed'))
   const recovered=await r.invoke({action:'getPlusOperation',operationKey,userId:'refine-owner'});assert.equal(recovered.job.id,response.jobId)
  }
 }finally{await r.close()}
})

test('SSE captures one final usage receipt before rejecting truncated or filtered output',async()=>{
 const r:any=await createRefineRuntime();try{
  for(const reason of ['length','content_filter']){
   const records:any[]=[];
   const response=new Response([
    {id:'one-call',choices:[{index:0,delta:{content:'partial'},finish_reason:reason}]},
    {id:'one-call',choices:[],usage:{prompt_tokens:100,completion_tokens:200,prompt_tokens_details:{cached_tokens:0}}},
   ].map(e=>'data: '+JSON.stringify(e)+'\n\n').join('')+'data: [DONE]\n\n',{headers:{'Content-Type':'text/event-stream'}});
   await assert.rejects(r.legacy.parseChatModelResponse(response,true,async(data:any)=>{records.push(data)}),new RegExp(reason));
   assert.equal(records.length,1);assert.equal(records[0].usage.completion_tokens,200);
  }
 }finally{await r.close()}
})
