import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createRefineRuntime} from '../../../test-support/refine-runtime.mjs';
import {workflowCallEstimate} from '../../../packages/api/src/workflow.js';
test('Gateway/Core offline regression: numeric waiver, inactive routes, observer adjudications and existing flow budgets',async()=>{
const directory=await mkdtemp(path.join(tmpdir(),'tuyan-flow-fixes-')),out=path.join(directory,'results.json'),reports:any[]=[];
const r=await createRefineRuntime({tokenDance:true});
let calls:string[]=[],scenario:Record<string,any>={},generated=0,guestCookie='',lastJob:any;
async function post(body:any,user:string){
 if(user!=='anonymous')return r.post(body,user);
 const response=await fetch(r.baseUrl+'/paperbanana-api',{method:'POST',headers:{'Content-Type':'application/json','x-test-user':'anonymous',...(guestCookie?{Cookie:guestCookie}:{})},body:JSON.stringify(body)});
 const cookie=response.headers.get('set-cookie');if(cookie)guestCookie=cookie.split(';')[0];
 return {status:response.status,data:await response.json()};
}
const text=(w:any)=>typeof w.input==='string'?w.input:[...(Array.isArray(w.input)?w.input:[]),...(w.messages||[])].filter((m:any)=>m.role==='user').flatMap((m:any)=>typeof m.content==='string'?[m.content]:m.content.filter((p:any)=>['input_text','text'].includes(p.type)).map((p:any)=>p.text)).join('\n');
const roles={main:{accessProvider:'openai',modelId:'gpt-5.6-sol'},image:{accessProvider:'openai',modelId:'gpt-image-2'},vision:{accessProvider:'openai',modelId:'gpt-4.1'}};
const base={action:'createJob',configurationMode:'advanced',provider:'openai',apiKeys:{openai:'fixture-only',deepseek:'fixture-only'},modelRoutes:roles,visionMode:'none',methodContent:'An input module connects to an output module. Preserve their direction and names.',caption:'Two connected modules.',outputFormat:'png',imageSize:'1K',aspectRatio:'1:1',pipelineMode:'planner_critic',retrievalSetting:'none',numCandidates:1,maxCriticRounds:1};
r.legacy.configureRuntimeFetch(async(url,init={})=>{
 const u=String(url);
 if(u.endsWith('/models'))return Response.json({data:[]});
 if(u.startsWith(r.baseUrl+'/objects/')){const o=r.objects.get(decodeURIComponent(u.slice((r.baseUrl+'/objects/').length)));return new Response(o?new Uint8Array(o.bytes):'',{status:o?200:404,headers:{'Content-Type':o?.mimeType||'image/png'}})}
 assert.ok(/^https:\/\/(api.openai.com|api.deepseek.com)\//.test(u),'Unexpected mock URL; no network fallback: '+u);
 if(u.includes('/images/')){calls.push('image');generated++;if(scenario.failRevision&&generated===2)return Response.json({error:{message:'Fixture revision failed'}},{status:400});return Response.json({data:[{b64_json:(generated===1?r.output:r.image).toString('base64')}]})}
 const w=JSON.parse(init.body),sys=JSON.stringify(w.instructions||w.messages?.filter((m:any)=>m.role==='system')||'');let content='';
 if(sys.includes('visual observer assisting')){calls.push('observer');content=JSON.stringify({content:'Observed modules',actual_text:['Input','Output'],layout:'Left to right',connections:['Input to Output'],problems:scenario.observerContradiction?[{issue:'Required output module missing',location:'right panel',evidence:'No output node visible',suggestion:'Restore output node'}]:[],suggestions:[],uncertainties:scenario.observerContradiction?['Output module presence remains unresolved']:[]})}
 else if(sys.includes('visual review AFTER generation')||sys.includes('SVG visual AND code review')){
  calls.push('review');const c=JSON.parse(text(w)),issues=scenario.alwaysIssues||scenario.revise&&c.version===1||['accept','unresolved'].includes(scenario.adjudication);
  if(scenario.numericContradiction)assert.equal(c.numericReviewContract.applicableRequired,true);
  const visualAdjudications=scenario.adjudication?(c.auxiliaryVisualIssues||[]).map((item:any)=>({id:scenario.adjudication==='stale'?'stale-version-id':item.id,decision:scenario.adjudication==='stale'?'reject':scenario.adjudication,reason:'Explicit fixture decision about the current version',evidence:'Fixture evidence from current source and observer context'})):undefined;
  const finding={issue:'Overlapping node label',location:'right node',evidence:'Label touches connector',suggestion:'Move label above connector'};
  content=scenario.invalidReview?'invalid response':JSON.stringify({visualAdjudications,version:c.version,pngHash:c.pngHash,svgHash:c.svgHash,visual:{status:issues?'issues_found':'passed',findings:issues?[finding]:[]},code:{status:'passed',findings:[]},numericReview:{applicable:false,reason:scenario.numericContradiction?'Only qualitative boxes, despite explicitly requested bar chart':'Process boxes only',checks:[]},uncertainties:[],revised_description:issues?'Complete plan: Input connects to Output; place labels above the connector and retain both nodes.':'No changes needed.'});
 }
 else if(sys.includes('SVG Diagram Agent')){calls.push('svg');generated++;content=scenario.numericContradiction?'<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="400" height="200" fill="white"/><rect x="40" y="40" width="40" height="120"/><rect x="150" y="80" width="40" height="80"/></svg>':`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="400" height="200" fill="white"/><text x="20" y="60">Input to Output v${generated}</text></svg>`}
 else if(sys.includes('Lead Visual Designer'))throw Error('Planner/basic must not invoke Stylist');
 else {calls.push('planner');content=sys.includes('material-aware scientific figure planner')?JSON.stringify({status:'ready',missingInputs:[],plan:'Input and Output are distinct boxes joined left to right. Preserve all required content.'}):'Input and Output are distinct boxes joined left to right. Preserve all required content.'}
 return Response.json({output_text:content,choices:[{message:{content}}]});
});
async function run(name:string,changes:Record<string,any>={},behavior:Record<string,any>={},user='refine-owner'):Promise<any>{
 scenario=behavior;calls=[];generated=0;
 const response=await post({...base,...changes},user);let job:any;
 if(response.data.code===0){await r.legacy.drainJobAdmission();job=(await post({action:'getJob',jobId:response.data.jobId},user)).data.job;}
 lastJob=job;const review=job?.resultImages?.[0]?.review;
 const record={name,code:response.data.code,error:response.data.error,businessCode:response.data.businessCode,taskStatus:job?.status,taskError:job?.error,calls:[...calls],review:review?{status:review.status,roundsUsed:review.roundsUsed,limit:review.limit,deliveredVersion:review.deliveredVersion,reviewedVersion:review.reviewedVersion,note:review.note}:null,results:job?.resultImages?.length||0};
 if(job&&(behavior.numericContradiction||behavior.observerContradiction)){
  await writeFile(path.join(directory,name+'-job.json'),JSON.stringify({request:{...base,...changes,apiKeys:undefined},job},null,2));
  const result=job.resultImages?.[0],bytes=result&&r.objects.get(result.objectKey)?.bytes;
  if(bytes)await writeFile(path.join(directory,name+(changes.outputFormat==='svg'?'.svg':'.png')),bytes);
 }
 reports.push(record);return record;
}
try{
 for(const outputFormat of ['png','svg']){
  const basic=await run('legacy-basic-'+outputFormat,{pipelineMode:'vanilla',outputFormat,maxCriticRounds:5});assert.equal(basic.review.status,'not_requested');assert.equal(basic.calls.filter((c:string)=>c==='review').length,0);
  for(const visionMode of ['none','assist'])for(const behavior of ['pass','revise','invalid','always-issues']){
   const result=await run('new-planner-'+outputFormat+'-'+visionMode+'-'+behavior,{generationPath:'model-v1',figureTypeId:'workflow',figureSpecVersion:'2026-10-10.v1',outputFormat,visionMode},{revise:behavior==='revise',invalidReview:behavior==='invalid',alwaysIssues:behavior==='always-issues'});
   const revised=['revise','always-issues'].includes(behavior);
   assert.equal(result.taskStatus,'succeeded');assert.equal(result.results,1);assert.equal(result.review.status,behavior==='invalid'?'review_failed':revised?'modified_unreviewed':'passed');
   assert.equal(result.calls.filter((c:string)=>c==='review').length,1);assert.equal(result.review.limit,1);assert.equal(result.review.roundsUsed,1);
   assert.equal(result.review.reviewedVersion,behavior==='invalid'?undefined:1);assert.equal(result.review.deliveredVersion,revised?2:1);
   assert.equal(result.calls.filter((c:string)=>c===(outputFormat==='png'?'image':'svg')).length,revised?2:1);
  }
  for(const visionMode of ['none','assist'])for(const maxCriticRounds of [2,5])for(const behavior of ['pass','revise','always-issues']){
   const request={...base,generationPath:'model-v1',outputFormat,visionMode,maxCriticRounds};
   const result=await run(`bounded-rounds-${outputFormat}-${visionMode}-${maxCriticRounds}-${behavior}`,request,{revise:behavior==='revise',alwaysIssues:behavior==='always-issues'});
   const exhausted=behavior==='always-issues',reviews=exhausted?maxCriticRounds:behavior==='revise'?2:1,versions=exhausted?maxCriticRounds+1:reviews;
   assert.equal(result.taskStatus,'succeeded');assert.equal(result.review.status,exhausted?'modified_unreviewed':'passed');
   assert.equal(result.review.limit,maxCriticRounds);assert.equal(result.review.roundsUsed,reviews);
   assert.equal(result.calls.filter((c:string)=>c==='review').length,reviews);
   assert.equal(result.calls.filter((c:string)=>c==='observer').length,visionMode==='assist'?reviews:0);
   assert.equal(result.calls.filter((c:string)=>c===(outputFormat==='png'?'image':'svg')).length,versions);
   assert.equal(result.review.deliveredVersion,versions);assert.equal(result.review.reviewedVersion,reviews);
   const review=lastJob.resultImages[0].review;
   const hashKey=outputFormat==='svg'?'SvgHash':'PngHash';
   assert.match(review['delivered'+hashKey],/^[a-f0-9]{64}$/);assert.match(review['reviewed'+hashKey],/^[a-f0-9]{64}$/);
   if(outputFormat==='svg')assert.equal(review.deliveredSvgHash===review.reviewedSvgHash,!exhausted,'a last-round revision cannot inherit the reviewed SVG hash');
   assert.equal(review.history.at(-1).version,reviews,'review history ends at the version that was actually reviewed');
   const estimate=workflowCallEstimate(request);
   if(exhausted)assert.equal(result.calls.length,estimate.max,'call estimate must not reserve an extra final review');
   if(behavior==='pass')assert.equal(result.calls.length,estimate.min,'a passing first review stops without using remaining rounds');
  }
  for(const changes of [{pipelineMode:'vanilla'},{maxCriticRounds:0}]){const result=await run('new-reject-'+outputFormat+'-'+JSON.stringify(changes),{generationPath:'model-v1',outputFormat,...changes});assert.equal(result.code,400);assert.equal(result.calls.length,0);}
 }
 const mainText={accessProvider:'deepseek',modelId:'deepseek-v4-pro'};
 for(const outputFormat of ['png','svg'])await run('legacy-basic-text-main-'+outputFormat,{pipelineMode:'vanilla',outputFormat,provider:'deepseek',modelRoutes:{...roles,main:mainText},visionMode:'assist'});
 const upload=(await r.post({action:'prepareReferenceUpload',files:[{filename:'reference.png',mimeType:'image/png',size:r.image.length}]})).data;
 assert.equal(upload.code,0);for(const file of upload.uploads)await fetch(file.uploadUrl,{method:'PUT',headers:{'Content-Type':'image/png'},body:new Uint8Array(r.image)});
 assert.equal((await r.post({action:'finalizeReferenceUpload',uploads:upload.uploads})).data.code,0);
 for(const direct of [true,false])await run('legacy-basic-reference-'+(direct?'direct-main':'assisted'),{pipelineMode:'vanilla',provider:direct?'openai':'deepseek',modelRoutes:{...roles,main:direct?roles.main:mainText},visionMode:'assist',referenceImages:upload.uploads});
 const failedRevision=await run('new-planner-PNG-failed-revision',{generationPath:'model-v1'},{revise:true,failRevision:true});
 assert.equal(failedRevision.review.status,'issues_found');assert.equal(failedRevision.review.reviewedVersion,1);assert.equal(failedRevision.review.deliveredVersion,1);
 assert.equal(failedRevision.calls.filter((c:string)=>c==='review').length,1);assert.equal(failedRevision.calls.filter((c:string)=>c==='image').length,2);
 await run('legacy-planner-final-revision-unreviewed',{maxCriticRounds:1},{alwaysIssues:true});
 const textRoute={accessProvider:'deepseek',modelId:'deepseek-v4-pro'};
 await run('legacy-basic-text-main-unused-malformed-vision',{pipelineMode:'vanilla',provider:'deepseek',modelRoutes:{...roles,main:textRoute,vision:{accessProvider:'custom',modelId:''}},visionMode:'assist'});
 await run('new-planner-SVG-unused-malformed-image',{generationPath:'model-v1',outputFormat:'svg',modelRoutes:{...roles,image:{accessProvider:'custom',modelId:''}}});
 await run('new-planner-SVG-legacy-fields-main-only',{generationPath:'model-v1',outputFormat:'svg',modelRoutes:undefined,mainModelName:'gpt-5.6-sol',imageModelName:undefined});
 await run('new-planner-SVG-unused-custom-image-guest',{generationPath:'model-v1',outputFormat:'svg',modelRoutes:{...roles,image:{accessProvider:'custom',modelId:'draft'}}},{},'anonymous');
 for(const outputFormat of ['png','svg'])await run('new-planner-observer-contradiction-'+outputFormat,{generationPath:'model-v1',outputFormat,visionMode:'assist'},{observerContradiction:true});
 await run('new-planner-explicit-bar-numeric-waiver',{generationPath:'model-v1',outputFormat:'svg',figureTypeId:'bar',figureSpecVersion:'2026-10-10.v1',methodContent:'Draw a quantitative bar chart: category A is 35, category B is 12; use a common zero baseline and equal scale.',caption:'A=35 and B=12 bar chart.'},{numericContradiction:true});

 for(const outputFormat of ['png','svg']){
  await run('quantitative-waiver-'+outputFormat,{generationPath:'model-v1',outputFormat,figureTypeId:'bar',figureSpecVersion:'2026-10-10.v1'},{numericContradiction:true});
  for(const adjudication of ['accept','reject','unresolved','stale']){
   const result=await run('adjudication-'+outputFormat+'-'+adjudication,{generationPath:'model-v1',outputFormat,visionMode:'assist'},{observerContradiction:true,adjudication});
   assert.equal(result.review.status,adjudication==='reject'?'passed':adjudication==='stale'?'review_failed':'modified_unreviewed',JSON.stringify(result));
   assert.equal(result.calls.filter((c:string)=>c==='review').length,1);
  }
  const unused=await run('basic-unused-vision-'+outputFormat,{pipelineMode:'vanilla',outputFormat,provider:'deepseek',modelRoutes:{...roles,main:textRoute,vision:{accessProvider:'custom',modelId:''}},visionMode:'assist'});
  assert.equal(unused.review.status,'not_requested',JSON.stringify(unused));assert.ok(!unused.calls.includes('observer'));
 }
 // Core, not a client-supplied referenceImageMode, decides whether an observer is active.
 const vision={accessProvider:'custom',modelId:'fixture-vision',custom:{version:1,connectionId:'vision',protocol:'openai-chat',baseUrl:'https://vision.example.com/v1',auth:'bearer',capabilities:{text:true,vision:true,imageGeneration:false,imageEditing:false},outputSizes:[],outputLimits:{maxBytes:10e6,maxDimension:4096,maxPixels:16e6,mimeTypes:['image/png']},inputLimits:{maxCount:2,maxBytes:5e6,maxTotalBytes:10e6,maxDimension:4096,maxPixels:16e6,requestMaxBytes:32e6,mimeTypes:['image/png']}}};
 const protectedRole=await run('guest-active-custom-observer',{pipelineMode:'vanilla',provider:'deepseek',modelRoutes:{...roles,main:textRoute,vision},visionMode:'assist',referenceImageMode:'main_model',retrievalSetting:'auto'},{},'anonymous');
 assert.equal(protectedRole.code,401,JSON.stringify(protectedRole));assert.deepEqual(protectedRole.calls,[]);
 for(const name of ['legacy-basic-text-main-unused-malformed-vision','new-planner-SVG-unused-malformed-image','new-planner-SVG-legacy-fields-main-only','new-planner-SVG-unused-custom-image-guest']){
  const record=reports.find(x=>x.name===name);assert.equal(record.code,0,JSON.stringify(record));assert.equal(record.taskStatus,'succeeded',JSON.stringify(record));
 }
 for(const record of reports.filter(x=>/observer-contradiction|numeric-waiver|quantitative-waiver/.test(x.name))){
  assert.equal(record.review.status,'review_failed',JSON.stringify(record));assert.equal(record.results,1);assert.equal(record.calls.filter((c:string)=>c==='review').length,1);
 }

 for(const outputFormat of ['png','svg']){
  const result=await run('active-bad-'+outputFormat,{generationPath:'model-v1',outputFormat,visionMode:'assist',modelRoutes:{...roles,[outputFormat==='png'?'image':'vision']:{accessProvider:'custom',modelId:''}}});
  assert.notEqual(result.code,0);assert.deepEqual(result.calls,[]);
 }
 const simple=await run('unused-image-simple-and-thinking',{generationPath:'model-v1',configurationMode:'simple',outputFormat:'svg',modelRoutes:{...roles,image:{accessProvider:'custom',modelId:''}},thinkingConfig:{version:1,roles:{image:{mode:'invalid-draft'}}}});
 assert.equal(simple.code,0,JSON.stringify(simple));assert.equal(simple.review.status,'passed');
 const basicLegacy=await run('legacy-basic-SVG-main-only',{pipelineMode:'vanilla',outputFormat:'svg',modelRoutes:undefined,mainModelName:'gpt-5.6-sol'});
 assert.equal(basicLegacy.code,0,JSON.stringify(basicLegacy));assert.equal(basicLegacy.review.status,'not_requested');

 // Refinement consumes the saved task's original quantitative contract.
 await run('numeric-refine-source',{generationPath:'model-v1',figureTypeId:'bar',figureSpecVersion:'2026-10-10.v1',outputFormat:'png'},{numericContradiction:true});
 let sourceKey=lastJob.resultImages[0].objectKey;
 scenario={numericContradiction:true};calls=[];
 let refined=await r.post({...base,action:'refineImage',sourceImageObjectKey:sourceKey,editInstruction:'Keep source values A=35 and B=12 and improve label spacing.'});
 assert.equal(refined.data.code,0,JSON.stringify(refined.data));await r.legacy.drainJobAdmission();
 let refinedJob=(await r.post({action:'getJob',jobId:refined.data.jobId})).data.job;
 assert.equal(refinedJob.resultImages[0].review.status,'review_failed');assert.equal(calls.filter(c=>c==='review').length,1);
 await run('observer-refine-source',{generationPath:'model-v1',outputFormat:'png'});
 sourceKey=lastJob.resultImages[0].objectKey;scenario={observerContradiction:true};calls=[];
 refined=await r.post({...base,action:'refineImage',visionMode:'assist',sourceImageObjectKey:sourceKey,editInstruction:'Move the Output module upward while preserving all labels.'});
 assert.equal(refined.data.code,0,JSON.stringify(refined.data));await r.legacy.drainJobAdmission();
 refinedJob=(await r.post({action:'getJob',jobId:refined.data.jobId})).data.job;
 assert.equal(refinedJob.resultImages[0].review.status,'review_failed');assert.equal(calls.filter(c=>c==='review').length,1);
 assert.ok(refinedJob.stages.some((stage:any)=>stage.title==='精修观察逐项裁决依据'));
 console.log('WORKFLOW_FLOW_FIXES_EVIDENCE='+directory+' scenarios='+reports.length);
}finally{await writeFile(out,JSON.stringify({simulated:true,realModelOrProductionAcceptance:false,reports},null,2)+'\n');await r.close()}

});
