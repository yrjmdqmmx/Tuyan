import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import path from 'node:path';
test('full/refine repair matrix: actual gateway/Core with synthetic provider responses',async()=>{
const root=fileURLToPath(new URL('../../../',import.meta.url));
const out=await mkdtemp(path.join(tmpdir(),'tuyan-full-refine-fixes-'));
console.log('FULL_REFINE_FIXES_EVIDENCE='+out);
const {createRefineRuntime}=await import(root+'/test-support/refine-runtime.mjs');
const {createUniversalRuntime}=await import(root+'/apps/paperbanana-api/src/universal-adapters.ts');
const req=createRequire(root+'/apps/paperbanana-api/package.json'),sharp=req('sharp');
const r=await createRefineRuntime({tokenDance:true});
const hash=(b:any)=>createHash('sha256').update(b).digest('hex');
const user=(w:any)=>typeof w.input==='string'?w.input:[...(Array.isArray(w.input)?w.input:[]),...(w.messages||[])].filter((m:any)=>m.role==='user').flatMap((m:any)=>typeof m.content==='string'?[m.content]:m.content.filter((p:any)=>['input_text','text'].includes(p.type)).map((p:any)=>p.text)).join('\n');
const imgs=(w:any)=>[...(Array.isArray(w.input)?w.input:[]),...(w.messages||[])].flatMap((m:any)=>Array.isArray(m.content)?m.content:[]).filter((p:any)=>['input_image','image_url'].includes(p.type));
const sanitized=(v:any):any=>typeof v==='string'&&v.startsWith('data:')?{dataUrlHash:hash(Buffer.from(v.slice(v.indexOf(',')+1),'base64'))}:Array.isArray(v)?v.map(sanitized):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,sanitized(x)])):v;
let calls:any[]=[],behavior:any={},generated=0;
function respond(w:any,url:string){
 const sys=JSON.stringify(w.instructions||w.messages?.filter((m:any)=>m.role==='system')||''),text=user(w);let kind='',content='';
 if(sys.includes('main model reading original research files')){
  kind='material';const c=JSON.parse(text);const next=c.files.find((f:any)=>!c.results.some((q:any)=>q.materialId===f.id&&['render','read'].includes(q.operation?.op)));
  content=next?JSON.stringify({action:'read',fileId:next.id,operation:next.format==='pdf'?{op:'render',pages:behavior.singlePage?[1]:[1,3]}:{op:'read'}}):JSON.stringify({action:'done',claims:[{text:'Original evidence fixture: Input → Check → Output. Keep the Output label.',sourceIds:c.currentSources.map((s:any)=>s.sourceId)}],limitations:['Offline simulated interpretation only'],sufficient:true});
 }else if(/visual review AFTER generation|SVG visual AND code review/.test(sys)){
  kind='review';const c=JSON.parse(text),issue=behavior.revise&&c.version===1||behavior.issue||behavior.editUncertain||behavior.batchUncertainty;
  const editChecks=behavior.missingEditChecks?undefined:(c.editRequirements||[]).map((q:any)=>({id:q.id,status:behavior.editUncertain?'uncertain':'passed',evidence:'Synthetic per-requirement comparison against supplied inputs'}));
  const visualAdjudications=(c.auxiliaryVisualIssues||[]).map((q:any)=>({id:q.id,decision:behavior.batchUncertainty?'unresolved':'reject',reason:'Synthetic current-version determination',evidence:'Separate observed input evidence from this exact request'}));
  content=behavior.invalidReview?'invalid response':JSON.stringify({editChecks,visualAdjudications,version:c.version,pngHash:c.pngHash,svgHash:c.svgHash,visual:{status:issue?'issues_found':'passed',findings:issue?[{issue:'Output position incorrect',location:'Output',evidence:'Fixture issue',suggestion:'Move Output right'}]:[]},code:{status:'passed',findings:[]},numericReview:{applicable:false,reason:'Qualitative workflow only',checks:[]},uncertainties:[],revised_description:issue?'Input → Check → Output; move Output right and keep all labels.':'No changes needed.'});
 }else if(/visual observer assisting|attached current PNG|attached PNG rendered from/.test(sys)){
  kind='observation';if(behavior.failBatch&&text.includes('original_material')&&JSON.parse(text).pages?.includes(3))throw Error('Simulated second material batch failure');content=behavior.invalidPlanningObserver&&text.includes('refine_input_understanding')?'Legacy unstructured observation':JSON.stringify({content:'Input and Output',actual_text:['Input','Output'],layout:'left to right',connections:['Input to Output'],problems:[],suggestions:[],uncertainties:behavior.batchUncertainty&&text.includes('refine_review_evidence')?['Mask comparison not resolved in this separate batch']:[]});
 }else if(sys.includes('SVG Diagram Agent')){
  kind='svg';generated++;content=`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="400" height="200" fill="white"/><text x="20" y="${50+generated*10}">Input to Output v${generated}</text></svg>`;
 }else if(sys.includes('Lead Visual Designer')){
  kind='style';content=behavior.emptyStyle?'':behavior.badStyle?JSON.stringify({status:'needs_input',missingInputs:['Explicit missing fixture data'],plan:''}):behavior.malformedStyle?'No changes needed.':JSON.stringify({status:'ready',missingInputs:[],plan:'Styled complete plan: Input → Check → Output; preserve labels and apply clear blue boxes.'});
 }else if(sys.includes('material-aware scientific figure planner')){
  kind='plan';content=JSON.stringify({status:'ready',missingInputs:[],plan:'Input → Check → Output; preserve source labels and all arrows.'});
 }else if(sys.includes('main model responsible for the scientific diagram')){
  kind='refine-plan';content='Complete plan: move Output right; retain Input and all existing labels.';
 }else throw Error('Unexpected mocked system: '+sys.slice(0,130));
 calls.push({kind,url,images:imgs(w).length,user:text,wire:sanitized(w)});
 return {output_text:content,choices:[{finish_reason:'stop',message:{content}}]};
}
r.legacy.configureRuntimeFetch(async(url:any,init:any={})=>{
 const u=String(url);
 if(u.endsWith('/models'))return Response.json({data:[]});
 if(u.startsWith(r.baseUrl+'/objects/')){const o=r.objects.get(decodeURIComponent(u.slice((r.baseUrl+'/objects/').length)));return new Response(o?new Uint8Array(o.bytes):'',{status:o?200:404,headers:{'Content-Type':o?.mimeType||'image/png'}});}
 if(u==='https://fixture-audit.invalid/render.png')return new Response(new Uint8Array(r.output),{headers:{'Content-Type':'image/png'}});
 if(u.startsWith('https://queue.fal.run/')){
  if(init.method==='POST'){calls.push({kind:'image',url:u,wire:sanitized(JSON.parse(init.body))});generated++;return Response.json({request_id:'fixture-edit'});}
  if(u.endsWith('/status'))return Response.json({status:'COMPLETED'});
  return Response.json({image:{url:'https://fixture-audit.invalid/render.png'}});
 }
 assert.ok(/^https:\/\/(api.openai.com|api.deepseek.com)\//.test(u),'No external fallback: '+u);
 if(u.includes('/images/')){const prompt=init.body instanceof FormData?init.body.get('prompt'):JSON.parse(init.body).prompt;calls.push({kind:'image',url:u,prompt});generated++;return Response.json({data:[{b64_json:(generated===1?r.output:r.image).toString('base64')}]});}
 return Response.json(respond(JSON.parse(init.body),u));
});
r.legacy.configureUniversalRuntime(createUniversalRuntime({transport:{checkUrl:async()=>{},request:async (request:any)=>({status:200,headers:new Headers(),bytes:Buffer.from(JSON.stringify(respond(JSON.parse(request.body),request.url)))})}}));
const roles={main:{accessProvider:'openai',modelId:'gpt-5.6-sol'},image:{accessProvider:'openai',modelId:'gpt-image-2'},vision:{accessProvider:'openai',modelId:'gpt-4.1'}};
const base={action:'createJob',configurationMode:'advanced',provider:'openai',apiKeys:{openai:'fixture-only',deepseek:'fixture-only',fal:'fixture-only'},modelRoutes:roles,visionMode:'none',generationPath:'model-v1',methodContent:'Draw Input → Check → Output. Retain direction and all labels.',caption:'Qualitative workflow',figureTypeId:'workflow',figureSpecVersion:'2026-10-10.v1',outputFormat:'png',imageSize:'1K',aspectRatio:'1:1',pipelineMode:'full',retrievalSetting:'none',numCandidates:1,maxCriticRounds:1};
async function uploadReference(bytes:any,name='fixture.png'){
 const p=await r.post({action:'prepareReferenceUpload',files:[{filename:name,mimeType:'image/png',size:bytes.length}]});assert.equal(p.data.code,0,JSON.stringify(p.data));const u=p.data.uploads[0];await fetch(u.uploadUrl,{method:'PUT',headers:{'Content-Type':'image/png'},body:new Uint8Array(bytes)});assert.equal((await r.post({action:'finalizeReferenceUpload',uploads:[u]})).data.code,0);return u;
}
async function uploadMaterial(name:string){
 const bytes=await readFile(root+'/docs/material-reader-20261012/fixtures/'+name),p=await r.post({action:'prepareMaterialUpload',files:[{filename:name,size:bytes.length}]});assert.equal(p.data.code,0,JSON.stringify(p.data));const u=p.data.uploads[0];await fetch(u.uploadUrl,{method:'PUT',headers:{'Content-Type':u.mimeType},body:new Uint8Array(bytes)});const f=await r.post({action:'finalizeMaterialUpload',materialId:u.id});assert.equal(f.data.code,0,JSON.stringify(f.data));return f.data.file;
}
const results:any[]=[];
async function run(name:string,change:any={},b:any={}){
 calls=[];behavior=b;generated=0;
 const request={...base,...change,provider:(change.modelRoutes||base.modelRoutes).main.accessProvider},response=await r.post(request);let job:any;
 if(response.data.code===0){await r.legacy.drainJobAdmission();job=(await r.post({action:'getJob',jobId:response.data.jobId})).data.job;}
 const record={name,code:response.data.code,error:response.data.error,status:job?.status,taskError:job?.error,review:job?.resultImages?.[0]?.review,callKinds:calls.map(c=>c.kind),imageCounts:calls.map(c=>({kind:c.kind,images:c.images})),request:{...request,apiKeys:undefined},calls,job};
 await writeFile(out+'/'+name+'.json',JSON.stringify(record,null,2));results.push({...record,request:undefined,calls:undefined,job:undefined});return record;
}
function limited(role:string){return {accessProvider:'custom',modelId:'fixture-one-image',custom:{version:1,connectionId:role,protocol:'openai-chat',baseUrl:`https://${role}.example.com/v1`,auth:'bearer',capabilities:{text:true,vision:true,imageGeneration:false,imageEditing:false},inputLimits:{maxCount:1,maxBytes:5e6,maxTotalBytes:10e6,maxDimension:4096,maxPixels:16e6,requestMaxBytes:32e6,mimeTypes:['image/png']},outputLimits:{maxBytes:10e6,maxDimension:4096,maxPixels:16e6,mimeTypes:['image/png']},outputSizes:[]}};}
function withCustom(roles:any){return {...base.apiKeys,custom:JSON.stringify(Object.fromEntries(Object.values(roles).filter((r:any)=>r.accessProvider==='custom').map((r:any)=>[r.custom.connectionId,{baseUrl:r.custom.baseUrl,protocol:r.custom.protocol,auth:r.custom.auth,apiKey:'fixture-only'}])))}}
try{
 for(const outputFormat of ['png','svg'])for(const visionMode of ['none','assist'])for(const revise of [false,true])for(const maxCriticRounds of [1,2]){
  const x=await run(`full-${outputFormat}-${visionMode}-${revise}-${maxCriticRounds}`,{outputFormat,visionMode,maxCriticRounds,materialFiles:[await uploadMaterial('mixed-research.pdf')]},{revise});
  const unreviewed=revise&&maxCriticRounds===1,reviews=revise?maxCriticRounds:1;
  assert.equal(x.status,'succeeded');assert.equal(x.review.status,unreviewed?'modified_unreviewed':'passed');assert.equal(x.callKinds.filter(c=>c==='style').length,1);assert.equal(x.callKinds.filter(c=>c==='review').length,reviews);
  assert.equal(x.review.limit,maxCriticRounds);assert.equal(x.review.roundsUsed,reviews);assert.equal(x.review.deliveredVersion,revise?2:1);assert.equal(x.review.reviewedVersion,reviews);
  const review=JSON.parse(x.calls.find((c:any)=>c.kind==='review').user);assert.equal(review.originalMaterialComparison.sourcePages.length,2);
 }
 for(const [name,behavior] of Object.entries({needsInput:{badStyle:true},malformed:{malformedStyle:true},empty:{emptyStyle:true}})){
  const x=await run('style-invalid-'+name,{},behavior);assert.equal(x.status,'failed');assert.ok(!x.callKinds.includes('image'));assert.ok(x.job.stages.some((s:any)=>s.type==='stylist')||name==='empty');if(name!=='empty'){assert.equal(x.job.failure.stage,'styling');assert.equal(x.job.failure.requestState,'not_sent');}
 }
 const source=await uploadReference(r.image),reference=await uploadReference(await sharp(r.image).negate().png().toBuffer(),'reference.png');
 const mask=await uploadReference(await sharp({create:{width:120,height:80,channels:3,background:'#000'}}).composite([{input:await sharp({create:{width:60,height:80,channels:3,background:'#fff'}}).png().toBuffer(),left:60,top:0}]).png().toBuffer(),'mask.png');
 const refine={action:'refineImage',sourceImageUpload:{objectKey:source.objectKey},materialFiles:[],editInstruction:'CURRENT_EDIT_ONLY: move Output right; preserve Input.',modelRoutes:{...roles,image:{accessProvider:'fal',modelId:'bria/fibo-edit-1.5/edit'}},imageSize:'auto',aspectRatio:'auto'};
 const edits={version:1,mask:{objectKey:mask.objectKey},structured:{object:'STRUCTURED_ONLY_TARGET',attributes:'STRUCTURED_ONLY_PURPLE_BORDER',relationship:'STRUCTURED_ONLY_KEEP_ARROW',preserve:'STRUCTURED_ONLY_KEEP_INPUT'}};
 for(const visionMode of ['none','assist'])for(const controls of ['reference','mask']){
  const refineInputs=controls==='mask'?edits:{version:1,references:[{objectKey:reference.objectKey,purpose:'color',note:'REFERENCE_ONLY_CYAN'}]};
  const x=await run(`refine-${controls}-${visionMode}`,{...refine,visionMode,refineInputs});assert.equal(x.review.status,'passed');
  const review=x.calls.find((c:any)=>c.kind==='review'),c=JSON.parse(review.user);assert.equal(review.images,visionMode==='none'?3:0);assert.ok(c.editRequirements.length);assert.ok(c.refineInputEvidence.flatMap((b:any)=>b.images).some((i:any)=>i.id===(controls==='mask'?'mask':'reference-1')));
  if(visionMode==='none')for(const [index,item] of c.imageOrder.entries())assert.ok(JSON.stringify(imgs(review.wire)[index]).includes(item.submittedImageHash),'review hash binds exactly the actual submitted image at this index');
  const planning=x.calls.find((q:any)=>q.kind==='refine-plan');assert.match(planning.user,controls==='mask'?/white-edit-black-preserve/:/REFERENCE_ONLY_CYAN/);assert.equal(planning.images,visionMode==='none'?2:0);
  assert.ok(review.user.includes(controls==='mask'?'STRUCTURED_ONLY_TARGET':'REFERENCE_ONLY_CYAN'));
  const draw=x.calls.find((c:any)=>c.kind==='image').wire;assert.equal(draw.image_urls.length,controls==='mask'?1:2);if(controls==='mask'){assert.ok(draw.mask_url);assert.equal(draw.structured_instruction.objects[0].description,'STRUCTURED_ONLY_TARGET');}
 }
 for(const [name,behavior] of Object.entries({missing:{missingEditChecks:true},uncertain:{editUncertain:true},invalid:{invalidReview:true}})){
  const x=await run('refine-check-'+name,{...refine,refineInputs:edits},behavior);assert.equal(x.review.status,name==='uncertain'?'issues_found':'review_failed');assert.equal(x.job.resultImages.length,1);assert.equal(x.callKinds.filter(c=>c==='image').length,1);
 }
 const invalidObserver=await run('new-refine-invalid-initial-observer',{...refine,visionMode:'assist',refineInputs:edits},{invalidPlanningObserver:true});assert.equal(invalidObserver.status,'failed');assert.ok(!invalidObserver.callKinds.includes('image'));
 const smallVision=limited('vision'),textMain={accessProvider:'deepseek',modelId:'deepseek-v4-pro'},limitedRoles={...roles,main:textMain,vision:smallVision};
 for(const action of ['createJob','refineImage']){
  const routes=action==='createJob'?limitedRoles:{...refine.modelRoutes,main:textMain,vision:smallVision};
  const x=await run('one-image-pages-'+action,{...(action==='refineImage'?refine:{}),action,modelRoutes:routes,apiKeys:withCustom(routes),visionMode:'assist',materialFiles:[await uploadMaterial('mixed-research.pdf')]});
  assert.equal(x.review.status,'passed',JSON.stringify(x.job.failure));assert.ok(x.calls.every((c:any)=>c.images===undefined||c.images<=1));
  const observations=x.calls.filter((c:any)=>c.kind==='observation'&&c.user.includes('original_material'));assert.equal(observations.length,4);assert.deepEqual(observations.map((c:any)=>JSON.parse(c.user).pages),[[1],[3],[1],[3]]);
  if(action==='refineImage')for(const c of observations)assert.match(c.user,/CURRENT_EDIT_ONLY/);
  for(const observed of observations){const c=JSON.parse(observed.user);assert.ok(JSON.stringify(imgs(observed.wire)[0]).includes(c.sourcePages[0].submittedImageHash),'page provenance hash matches actual observed bytes');}
  assert.equal(x.job.materialReads.filter((e:any)=>e.type==='vision_batch_received').length,4);
 }
 for(const visionMode of ['none','assist']){
  const routes={...refine.modelRoutes,...(visionMode==='none'?{main:limited('main')}:{main:textMain,vision:smallVision})};
  for(const uncertain of [false,true]){
   const x=await run(`one-image-mask-${visionMode}-${uncertain}`,{...refine,refineInputs:edits,modelRoutes:routes,apiKeys:withCustom(routes),visionMode},{batchUncertainty:uncertain});
   assert.equal(x.review.status,uncertain?'issues_found':'passed');assert.ok(x.calls.every((c:any)=>c.images===undefined||c.images<=1));
   const c=JSON.parse(x.calls.find((c:any)=>c.kind==='review').user);assert.deepEqual(c.refineInputEvidence.flatMap((b:any)=>b.images.map((i:any)=>i.id)),['current','original','mask']);assert.equal(c.separateInputObservations.length,2);assert.ok(c.separateInputObservations.every((b:any)=>b.images.every((i:any)=>/^[a-f0-9]{64}$/.test(i.submittedImageHash))));
   if(uncertain)assert.ok(c.auxiliaryVisualIssues.length);
  }
 }
 const failed=await run('second-page-batch-failure',{modelRoutes:limitedRoles,apiKeys:withCustom(limitedRoles),visionMode:'assist',materialFiles:[await uploadMaterial('mixed-research.pdf')]},{failBatch:true});assert.equal(failed.status,'failed');assert.ok(!failed.callKinds.includes('image'));assert.ok(!failed.job.materialReads.some((e:any)=>e.type==='completion'));
 const mainRoles={...roles,main:limited('main')};const control=await run('single-image-main-control',{modelRoutes:mainRoles,apiKeys:withCustom(mainRoles),materialFiles:[await uploadMaterial('mixed-research.pdf')]});assert.equal(control.review.status,'passed');
}finally{await writeFile(out+'/results.json',JSON.stringify({simulatedProviders:true,realQualityVerified:false,results},null,2));await r.close();}
});
