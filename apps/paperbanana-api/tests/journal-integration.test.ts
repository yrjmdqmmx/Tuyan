import assert from 'node:assert/strict';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {defaultJournalSelection,journalSnapshot,JOURNAL_VERSION} from '../../../packages/api/src/journal-rules.js';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const cases=[
 {ruleVersion:JOURNAL_VERSION,journalId:'nature',ruleId:'nature-generate'},
 ...['2026-10-13.v1','2026-10-13.v2','2026-10-13.v5',JOURNAL_VERSION].map(ruleVersion=>({ruleVersion,journalId:'frontiers-ai',ruleId:'frontiers-stroke'})),
 ...['2026-10-13.v3','2026-10-13.v4'].map(ruleVersion=>({ruleVersion,journalId:'scientific-reports',ruleId:'srep-generate'})),
 ...['hssc','sage-open','cell-reports'].map(journalId=>({ruleVersion:'2026-10-14.v6',journalId,ruleId:journalId==='hssc'?'hssc-generate':journalId==='sage-open'?'sage-generate':'cell-generate'})),
 ...['hssc','cell-reports'].map(journalId=>({ruleVersion:'2026-10-14.v7',journalId,ruleId:journalId==='hssc'?'hssc-generate':'cell-generate'})),
 ...['hssc','cell-reports'].map(journalId=>({ruleVersion:'2026-10-14.v8',journalId,ruleId:journalId==='hssc'?'hssc-generate':'cell-generate'})),
 ...['hssc','cell-reports'].map(journalId=>({ruleVersion:'2026-10-14.v9',journalId,ruleId:journalId==='hssc'?'hssc-generate':'cell-generate'})),
 ...['population-research','acta-psychologica-sinica','advances-psychological-science','library-information-service'].map(journalId=>({ruleVersion:JOURNAL_VERSION,journalId,ruleId:`${journalId}-generate`})),
 ...Object.entries({'ieee-access':'ieee-generate','scientific-reports':'srep-generate','cell-reports':'cell-generate','jingjixuejia':'economist-generate','caijing-luncong':'cjlc-generate','shanxi-finance-economics':'sxufe-generate','social-sciences-in-china':'css-generate','sage-open':'sage-generate','hssc':'hssc-generate'}).map(([journalId,ruleId])=>({ruleVersion:JOURNAL_VERSION,journalId,ruleId})),
];
for(const {ruleVersion,journalId,ruleId} of cases)test(`journal ${journalId} ${ruleVersion} through actual gateway/Core, frozen job, refine, owned export and history; providers are synthetic`,async()=>{
 const {createRefineRuntime}=await import(root+'test-support/refine-runtime.mjs');
 const r=await createRefineRuntime({tokenDance:true});
 const calls:any[]=[];
 r.legacy.configureRuntimeFetch(async(url:any,init:any={})=>{
  const u=String(url);
  if(u.startsWith(r.baseUrl+'/objects/')){const o=r.objects.get(decodeURIComponent(u.slice((r.baseUrl+'/objects/').length)));assert.ok(o);return new Response(new Uint8Array(o.bytes),{headers:{'Content-Type':o.mimeType}});}
  assert.ok(u.startsWith('https://api.openai.com/'),'Unexpected network blocked: '+u);
  if(u.endsWith('/models'))return Response.json({data:[]});
  if(u.includes('/images/')){const prompt=init.body instanceof FormData?init.body.get('prompt'):JSON.parse(init.body).prompt;calls.push({kind:'image',text:prompt});return Response.json({data:[{b64_json:r.output.toString('base64')}]});}
  const w=JSON.parse(init.body),sys=JSON.stringify(w.instructions||w.messages?.filter((m:any)=>m.role==='system')||'');
  const text=typeof w.input==='string'?w.input:[...(Array.isArray(w.input)?w.input:[]),...(w.messages||[])].filter((m:any)=>m.role==='user').flatMap((m:any)=>typeof m.content==='string'?[m.content]:m.content.filter((p:any)=>['input_text','text'].includes(p.type)).map((p:any)=>p.text)).join('\n');
  calls.push({kind:'text',text,sys});let content;
  if(/visual review AFTER generation|SVG visual AND code review/.test(sys)){const c=JSON.parse(text);content=JSON.stringify({version:c.version,pngHash:c.pngHash,svgHash:c.svgHash,code:{status:'passed',findings:[]},visual:{status:'passed',findings:[]},numericReview:{applicable:false,reason:'Qualitative workflow only',checks:[]},uncertainties:[],revised_description:'No changes needed.',editChecks:(c.editRequirements||[]).map((q:any)=>({id:q.id,status:'passed',evidence:'Synthetic original vs edited comparison'})),visualAdjudications:(c.auxiliaryVisualIssues||[]).map((q:any)=>({id:q.id,decision:'reject',reason:'Fixture determination',evidence:'Synthetic evidence'}))});}
  else if(sys.includes('SVG Diagram Agent'))content='<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="400" height="200" fill="white"/><text x="20" y="60" font-family="Noto Sans">Input to Output</text></svg>';
  else if(sys.includes('Lead Visual Designer')||sys.includes('material-aware scientific figure planner'))content=JSON.stringify({status:'ready',missingInputs:[],plan:'Input → Check → Output. Preserve labels, 8 pt minimum text, 2 pt lines and (A) panel label outside image.'});
  else if(sys.includes('main model responsible for the scientific diagram'))content='Move Output right. Retain Input, labels, 8 pt text and 2 pt lines.';
  else throw Error('Unexpected fixture call '+sys.slice(0,150));
  return Response.json({output_text:content,choices:[{finish_reason:'stop',message:{content}}]});
 });
 try{
  const selection={...defaultJournalSelection(journalId),version:ruleVersion,stage:'production',contentSource:'figure-type',figureTypeId:'workflow'};
  if(journalId==='hssc'&&ruleVersion===JOURNAL_VERSION)selection.widthMm=88;
  const routes={main:{accessProvider:'openai',modelId:'gpt-5.6-sol'},image:{accessProvider:'openai',modelId:'gpt-image-2'},vision:{accessProvider:'openai',modelId:'gpt-4.1'}};
  const base={action:'createJob',configurationMode:'advanced',provider:'openai',apiKeys:{openai:'fixture-only'},modelRoutes:routes,visionMode:'none',generationPath:'model-v1',methodContent:'Draw Input → Check → Output. Retain direction and all labels.',caption:'Qualitative workflow',figureTypeId:'workflow',figureSpecVersion:'2026-10-10.v1',outputFormat:'png',imageSize:'1K',aspectRatio:'1:1',pipelineMode:'full',retrievalSetting:'none',numCandidates:1,maxCriticRounds:1,journalSelection:selection};
  for(const bad of [{...selection,version:'forged'}, {...selection,contentType:'primary'}, {...defaultJournalSelection('acs-omega'),purpose:'toc'},...(['2026-10-13.v1','2026-10-13.v2'].includes(ruleVersion)?[{...defaultJournalSelection('cell-reports'),version:ruleVersion}]:[])]){const res=await r.post({...base,journalSelection:bad,outputFormat:'svg'});assert.equal(res.data.code,400,JSON.stringify(res));}
  if(journalId==='cell-reports'&&['2026-10-14.v8','2026-10-14.v9',JOURNAL_VERSION].includes(ruleVersion)){
   for(const purpose of ['graphical_abstract','cover']){
    assert.equal((await r.post({...base,journalSelection:{...selection,purpose}})).data.code,400);
   }
  }
  assert.equal(calls.length,0,'Policy failures must precede all model calls');
  const submitted=await r.post({...base,journalSelection:{...selection,contentType:'data',figureTypeId:'bar'},journalProfile:{name:'forged',rules:[]}});assert.equal(submitted.data.code,0,JSON.stringify(submitted));await r.legacy.drainJobAdmission();
  const job=(await r.post({action:'getJob',jobId:submitted.data.jobId})).data.job;assert.equal(job.status,'succeeded',JSON.stringify(job.error));assert.equal(job.journalProfile.name,journalSnapshot(selection)?.name);assert.deepEqual(job.journalSelection,selection);assert.equal(job.journalProfile.version,ruleVersion);
  assert.ok(calls.filter(c=>c.kind==='image').every(c=>c.text.includes(ruleVersion)&&c.text.includes(ruleId)));
  assert.ok(calls.filter(c=>c.kind==='text').every(c=>c.text.includes(ruleId)),'Planning, styling and review carry rules');
  const file=job.resultImages[0];assert.equal(file.journalCheck.ruleVersion,ruleVersion);if(journalId==='frontiers-ai')assert.ok(file.journalCheck.checks.some((c:any)=>c.id==='frontiers-dpi'&&c.status==='checked'));else {const policy=file.journalCheck.policy.find((i:any)=>i.code===`policy-${ruleId}`);assert.equal(policy.blocking,false);assert.equal(policy.kind,journalId==='scientific-reports'?(ruleVersion==='2026-10-13.v3'?'conflict':'manual'):(['nature','sage-open','hssc'].includes(journalId)||journalId==='cell-reports'&&['2026-10-14.v8','2026-10-14.v9',JOURNAL_VERSION].includes(ruleVersion))?'manual':'pending');assert.equal(file.journalCheck.checks.find((c:any)=>c.id===ruleId).status,policy.kind==='manual'?'uncheckable':'pending');}
  const inspected=await r.post({action:'journalFigureExport',jobId:job.id,candidateId:0,format:'original',download:true,journalProfile:{rules:[]},url:'https://untrusted.invalid/payload'});
  assert.equal(inspected.data.code,0,JSON.stringify(inspected.data));assert.equal(inspected.data.report.ruleVersion,ruleVersion);assert.equal(inspected.data.report.exportSha256,createHash('sha256').update(Buffer.from(inspected.data.file.base64,'base64')).digest('hex'));
  const tiff=await r.post({action:'journalFigureExport',jobId:job.id,candidateId:0,format:'tiff',flattenWhite:true,download:true});assert.equal(tiff.data.code,0,JSON.stringify(tiff.data));assert.equal(tiff.data.report.facts.compression,5);assert.equal(tiff.data.report.facts.width,1024);
  if(journalId==='hssc'&&ruleVersion===JOURNAL_VERSION)for(const report of [inspected.data.report,tiff.data.report])assert.equal(report.checks.find((c:any)=>c.id==='hssc-width').status,'checked');
  if(journalId==='shanxi-finance-economics'){
   assert.equal(inspected.data.report.checks.find((c:any)=>c.id==='sxufe-color').status,'unmet','The actual synthetic PNG contains colour');
   const colour=tiff.data.report.checks.find((c:any)=>c.id==='sxufe-color');
   assert.equal(colour.status,'uncheckable','Core TIFF decoder restrictions remain intact');
   assert.match(colour.text,/无法解码此 TIFF 文件的实际像素/);
  }
  assert.equal((await r.post({action:'journalFigureExport',jobId:job.id,candidateId:0,format:'original'},'other-owner')).status,403);
  assert.equal((await r.post({action:'journalFigureExport',jobId:job.id,candidateId:99,format:'original'})).data.code,404);
  assert.equal((await r.post({action:'journalFigureExport',jobId:job.id,candidateId:0,format:'pdf'})).data.code,400);
  const before=calls.length;
  const deniedRefine=await r.post({...base,action:'refineImage',sourceImageObjectKey:file.objectKey,editInstruction:'Move Output right.',materialFiles:[],journalSelection:{...selection,contentType:'primary'}});assert.equal(deniedRefine.data.code,400);assert.equal(calls.length,before);
  const refine=await r.post({...base,action:'refineImage',sourceImageObjectKey:file.objectKey,editInstruction:'Move Output right.',materialFiles:[],journalSelection:undefined});assert.equal(refine.data.code,0,JSON.stringify(refine.data));await r.legacy.drainJobAdmission();
  const refined=(await r.post({action:'getJob',jobId:refine.data.jobId})).data.job;assert.equal(refined.status,'succeeded',refined.error);assert.deepEqual(refined.journalProfile,job.journalProfile);assert.deepEqual(refined.generationContext.journalSelection,selection);assert.ok(refined.resultImages[0].journalCheck.checks.length);
  assert.ok(calls.slice(before).every(c=>c.text.includes(ruleVersion)),'Refine stages carry inherited snapshot');
  if(journalId==='cell-reports'&&['2026-10-14.v9',JOURNAL_VERSION].includes(ruleVersion))assert.equal(refined.resultImages[0].journalCheck.policy.find((p:any)=>p.code==='policy-cell-refine').policyStatus,ruleVersion===JOURNAL_VERSION?'conditional':'unspecified');
  const beforeExport=calls.length;
  const refinedExport=await r.post({action:'journalFigureExport',jobId:refined.id,candidateId:0,format:'tiff',flattenWhite:true,download:true});
  assert.equal(refinedExport.data.code,0,JSON.stringify(refinedExport.data));
  assert.deepEqual(refinedExport.data.report.selection,selection);
  assert.equal(refinedExport.data.report.sourceSha256,refined.resultImages[0].journalCheck.sourceSha256);
  assert.equal(refinedExport.data.report.exportSha256,createHash('sha256').update(Buffer.from(refinedExport.data.file.base64,'base64')).digest('hex'));
  assert.equal(calls.length,beforeExport,'Exporting the refined file must not invoke a model');
  assert.equal(refined.sourceContentType,'schematic');
  assert.equal(refined.generationContext.figureTypeId,'workflow');
  // Uploaded originals are a separate identity, even if a client also carries a stale result key.
  const upload=async(bytes:Buffer,user='refine-owner')=>{
   const p=await r.post({action:'prepareMaterialUpload',files:[{filename:'original.png',size:bytes.length}]},user);
   assert.equal(p.data.code,0,JSON.stringify(p.data));const u=p.data.uploads[0];
   assert.equal((await fetch(u.uploadUrl,{method:'PUT',headers:{'Content-Type':u.mimeType},body:new Uint8Array(bytes)})).status,200);
   const f=await r.post({action:'finalizeMaterialUpload',materialId:u.id},user);
   assert.equal(f.data.code,0,JSON.stringify(f.data));return f.data.file;
  };
  const uploaded=await upload(r.image);
  const refineBody={...base,action:'refineImage',sourceImageUpload:{materialId:uploaded.id},editInstruction:'Move Output right.',materialFiles:[],sourceContentType:'schematic'};
  let boundary=calls.length;
  if(journalId==='cell-reports'&&['2026-10-14.v8','2026-10-14.v9',JOURNAL_VERSION].includes(ruleVersion)){
   const blocked=await r.post({...refineBody,sourceContentType:'data',journalSelection:{...selection,contentType:'data',contentSource:undefined,figureTypeId:undefined}});
   assert.equal(blocked.data.code,400,JSON.stringify(blocked.data));assert.match(JSON.stringify(blocked.data),/模型重绘/);assert.equal(calls.length,boundary);
   for(const purpose of ['graphical_abstract','cover']){
    const special=await r.post({...refineBody,journalSelection:{...selection,purpose}});
    assert.equal(special.data.code,400,JSON.stringify(special.data));assert.match(JSON.stringify(special.data),/通用生成式|本刊禁止/);assert.equal(calls.length,boundary);
   }
  }
  const primary=await r.post({...refineBody,journalSelection:null,sourceContentType:'primary'});
  assert.equal(primary.data.code,400);assert.equal(calls.length,boundary);
  const fresh=await r.post({...refineBody,sourceImageObjectKey:file.objectKey,journalSelection:undefined});
  assert.equal(fresh.data.code,0,JSON.stringify(fresh.data));await r.legacy.drainJobAdmission();
  const freshJob=(await r.post({action:'getJob',jobId:fresh.data.jobId})).data.job;
  assert.equal(freshJob.status,'succeeded',freshJob.error);
  assert.equal(freshJob.journalSelection,null,'New uploads must not inherit the stale result key journal');
  assert.equal(freshJob.generationContext.figureTypeId,undefined);
  assert.equal(freshJob.sourceContentType,'schematic');
  const secondOriginal=await upload(r.image);
  const withRules=await r.post({...refineBody,sourceImageUpload:{materialId:secondOriginal.id}});
  assert.equal(withRules.data.code,0,JSON.stringify(withRules.data));await r.legacy.drainJobAdmission();
  const originalJob=(await r.post({action:'getJob',jobId:withRules.data.jobId})).data.job;
  assert.equal(originalJob.status,'succeeded',originalJob.error);
  assert.equal(originalJob.taskSourceMaterial.sha256,secondOriginal.sha256);
  const sameBytes=await upload(r.image),wrongBytes=await upload(r.output),otherBytes=await upload(r.image,'other-owner');
  const restoreBody={...refineBody,sourceTaskId:originalJob.id,sourceImageUpload:{materialId:sameBytes.id},journalSelection:undefined,sourceContentType:undefined};
  boundary=calls.length;
  assert.equal((await r.post({...restoreBody,sourceImageUpload:{materialId:wrongBytes.id}})).data.code,409);
  assert.equal((await r.post({...restoreBody,sourceImageUpload:{materialId:otherBytes.id}},'other-owner')).data.code,403);
  assert.equal((await r.post({...restoreBody,sourceImageUpload:undefined,sourceImageObjectKey:file.objectKey})).data.code,400);
  assert.equal(calls.length,boundary,'Hash mismatch, cross-owner and invalid association fail before paid work');
  const restored=await r.post(restoreBody);assert.equal(restored.data.code,0,JSON.stringify(restored.data));await r.legacy.drainJobAdmission();
  const restoredJob=(await r.post({action:'getJob',jobId:restored.data.jobId})).data.job;
  assert.equal(restoredJob.status,'succeeded',restoredJob.error);
  assert.deepEqual(restoredJob.journalSelection,originalJob.journalSelection);
  assert.equal(restoredJob.sourceTaskId,originalJob.id);
  assert.equal(restoredJob.sourceContentType,'schematic');
  assert.equal(restoredJob.generationContext.sourceContentType,'schematic');
  const restoredExport=await r.post({action:'journalFigureExport',jobId:restoredJob.id,candidateId:0,format:'tiff',flattenWhite:true,download:true});
  assert.equal(restoredExport.data.code,0,JSON.stringify(restoredExport.data));
  assert.deepEqual(restoredExport.data.report.selection,selection);
  assert.equal(restoredExport.data.report.exportSha256,createHash('sha256').update(Buffer.from(restoredExport.data.file.base64,'base64')).digest('hex'));
  const history=await r.post({action:'myJobs'});assert.equal(history.data.code,0);assert.ok(history.data.jobs.some((j:any)=>j.id===refined.id&&j.journalProfile.version===ruleVersion));
  assert.ok(history.data.jobs.some((j:any)=>j.id===restoredJob.id&&j.sourceTaskId===originalJob.id&&j.sourceContentType==='schematic'));
  const imageCallCount=calls.filter(c=>c.kind==='image').length;
  const vector=await r.post({...base,outputFormat:'svg'});assert.equal(vector.data.code,0,JSON.stringify(vector.data));await r.legacy.drainJobAdmission();
  const vectorJob=(await r.post({action:'getJob',jobId:vector.data.jobId})).data.job;assert.equal(vectorJob.status,'succeeded',vectorJob.error);assert.equal(calls.filter(c=>c.kind==='image').length,imageCallCount,'SVG keeps the main-model path');
  assert.equal(vectorJob.resultImages[0].journalCheck.facts.format,'svg');assert.ok(calls.filter(c=>c.sys?.includes('SVG Diagram Agent')).every(c=>c.text.includes(ruleVersion)));
  if(journalId==='frontiers-ai')assert.equal(vectorJob.resultImages[0].journalCheck.checks.find((c:any)=>c.field==='format').status,'unmet');else assert.ok(vectorJob.resultImages[0].journalCheck.policy.some((i:any)=>i.code===`policy-${ruleId}`));
  console.log(JSON.stringify({generated:job.id,refined:refined.id,ruleVersion,syntheticCalls:calls.length,tiffSha256:tiff.data.report.exportSha256,realModelCalls:0}));
 }finally{await r.close();}
});
