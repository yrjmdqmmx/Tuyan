// Explicit, separately billed, read-only final acceptance; never edits the SVG
// or replaces the pipeline's historical review status.
import {readFile,writeFile,unlink,stat,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.cwd(),[secretPath,runName='round-1',selected='both']=process.argv.slice(2);
if(!secretPath||!/^round-[\w-]+$/.test(runName)||!['both','state-diagram-svg','mixed-workflow-bar-svg'].includes(selected))throw Error('Invalid final-review arguments');
if(((await stat(secretPath)).mode&0o077)!==0)throw Error('Private credential file required');
let key=(await readFile(secretPath,'utf8')).trim();await unlink(secretPath);
const clean=v=>JSON.parse(JSON.stringify(v,(_k,x)=>typeof x==='string'?x.split(key).join('[REDACTED]'):x));
const hash=v=>createHash('sha256').update(v).digest('hex');
const mod=rel=>import(pathToFileURL(path.join(root,rel)));
const {svgDecisionPrompt,svgReviewContext,parseSvgDecision}=await mod('packages/api/src/svg-workflow.ts');
const {topologyReviewPrompt,validateTopologyAudit,inspectTopologySvg,topologyRendererContract}=await mod('apps/paperbanana-api/src/diagram-topology.ts');
const {rendererContext,rendererReviewPrompt,validateRendererAudit}=await mod('apps/paperbanana-api/src/renderer-contract.ts');
const {SOURCE_PROMPT_REVISION,buildSourceCatalog,validateSourceCatalog,sourceScope,resolveReviewSourceRefs,sourceReferenceReviewPrompt}=await mod('apps/paperbanana-api/src/source-provenance.ts');
const {renderProgrammaticSvg}=await mod('apps/paperbanana-api/src/programmatic-svg.ts');
const directory=path.join(root,'docs/infographic-v400/svg-repair-20261010/evidence',runName);
const summary=JSON.parse(await readFile(path.join(directory,'summary.json'),'utf8'));
let sessionRequests=0;
for(const name of await readdir(path.dirname(directory))){if(!/^round-/.test(name))continue;const previous=path.join(path.dirname(directory),name);try{sessionRequests+=JSON.parse(await readFile(path.join(previous,'summary.json'),'utf8')).requests||0;for(const child of await readdir(previous)){try{await stat(path.join(previous,child,'final-review.json'));sessionRequests++;}catch{}}}catch{}}
let failed=false;
try{
 for(const run of summary.runs){
  if(selected!=='both'&&run.scenario!==selected)continue;
  const dir=path.join(directory,run.scenario),recordPath=path.join(dir,'final-review.json');
  try{await stat(recordPath);throw Error('Final review already exists; preserve immutable evidence')}catch(e){if(e.code!=='ENOENT')throw e;}
  const job=JSON.parse(await readFile(path.join(dir,'job.json'),'utf8')),input=JSON.parse(await readFile(path.join(dir,'input.json'),'utf8')),result=job.resultImages?.[0];
  if(!result)throw Error('No delivered artifact to inspect');
  if(job.sourceProtocol?.protocolVersion!==2)throw Error('This final-review runner requires a new source-protocol v2 task; old paid evidence is immutable');
  if(job.sourceProtocol.promptRevision!==SOURCE_PROMPT_REVISION)throw Error('This final-review runner requires the current prompt revision; old task evidence cannot be relabelled');
  const review=result.review,svg=await readFile(path.join(dir,path.basename(result.filename||result.objectKey)),'utf8'),rendered=await renderProgrammaticSvg(svg);
  if(rendered.svgHash!==review.deliveredSvgHash||rendered.pngHash!==review.deliveredPngHash)throw Error('Delivered artifact hash does not match pipeline record');
  const original=input.methodContent+'\n'+input.caption;
  const readContext=async(stage)=>{
   if(!stage)throw Error('Missing current review context');
   let context=JSON.parse(stage.text);
   if(context.evidenceArtifact){
    const pointer=context.evidenceArtifact;
    if(pointer.mimeType!=='application/json'||!pointer.filename||!Number.isSafeInteger(pointer.byteLength)||pointer.byteLength<1)throw Error('Invalid evidence pointer');
    const full=await readFile(path.join(dir,path.basename(pointer.filename)));
    if(full.byteLength!==pointer.byteLength||hash(full)!==pointer.sha256)throw Error('Evidence artifact identity mismatch');
    const restored=JSON.parse(full.toString('utf8'));
    for(const field of ['version','svgHash','pngHash','submittedImageHash','round'])if(restored[field]!==context[field])throw Error('Evidence header mismatch: '+field);
    context=restored;
   }
   if(context.svgHash!==rendered.svgHash||context.pngHash!==rendered.pngHash||context.version!==review.deliveredVersion)throw Error('Evidence does not match delivered version');
   return context;
  };
  const checkedCatalog=(saved,originalBody,panelIndex)=>{
   if(!saved){if(job.sourceProtocol?.protocolVersion===2)throw Error('Missing source catalogue for v2 task');return undefined;}
   const scope=sourceScope(job.id||job._id,panelIndex);
   validateSourceCatalog(saved,originalBody,scope);
   const rebuilt=buildSourceCatalog(originalBody,scope);
   if(rebuilt.catalogHash!==saved.catalogHash||!job.sourceProtocol?.catalogs?.some(c=>c.scope===scope&&c.catalogHash===saved.catalogHash&&c.originalHash===saved.originalHash))throw Error('Catalogue is not bound to saved task snapshot');
   return saved;
  };
  const evidence={version:review.deliveredVersion,svgHash:rendered.svgHash,pngHash:rendered.pngHash,submittedImageHash:hash(rendered.png),fullSvgCode:svg,acceptancePurpose:'Independent read-only review of exact delivered version. Do not assume any previous decision is correct; no automatic revision follows.'};
  let system=svgDecisionPrompt()+rendererReviewPrompt(),localPassed=true,childTopologies=[],contract,sourceCatalog;
  if(review.topology){
   const currentContext=await readContext([...job.stages].reverse().find(s=>s.type==='critic'&&s.title.includes('画面、代码与原始关系评审')));
   sourceCatalog=checkedCatalog(currentContext.sourceCatalog,input);
   const t=review.topology,geometry=inspectTopologySvg(svg,t.topology,t.layout.viewport.minFontPx);
   contract=topologyRendererContract();Object.assign(evidence,{topology:t.topology,topologyHash:t.topologyHash,nodeIdentityMap:t.topology.nodes.map(n=>({id:n.id,label:n.label,initialEvidence:n.initialEvidence})),localGeometryCheck:geometry,layout:t.layout,actualLayout:t.layout});system+=topologyReviewPrompt();localPassed=geometry.passed;
  }else{
   const contextStage=[...job.stages].reverse().find(s=>s.type==='critic'&&s.title==='组合画面与子图检查汇总');
   if(!contextStage)throw Error('Missing composition review evidence');
   const context=await readContext(contextStage);sourceCatalog=checkedCatalog(context.sourceCatalog,input);
   const validation={...review.composition,panels:review.composition.panels.map(p=>({...p,review:{topology:p.review?.topology,dataValidation:p.review?.dataValidation}}))};
   Object.assign(evidence,{panelValidation:validation,childOriginals:context.childOriginals.map((p,i)=>({...p,sourceCatalog:checkedCatalog(p.sourceCatalog,{methodContent:p.methodology,caption:p.caption,negativePrompt:p.avoid||input.negativePrompt},i+1),nodeIdentityMap:p.review?.topology?.topology.nodes.map(n=>({id:n.id,label:n.label,initialEvidence:n.initialEvidence})),review:{topology:p.review?.topology,dataValidation:p.review?.dataValidation}})),localGeometryCheck:context.localGeometryCheck});
   contract={kind:'composition',panels:evidence.childOriginals.map(p=>({label:p.label,rendererScope:p.rendererScope}))};
   childTopologies=evidence.childOriginals.filter(p=>p.review.topology);
   localPassed=review.composition.layout.passed;
   for(const p of childTopologies){const t=p.review.topology;const g=inspectTopologySvg(p.fullSvgCode,t.topology,t.layout.viewport.minFontPx);if(!g.passed||g.svgHash!==t.svgHash)localPassed=false;}
   system+='\nIndependently review all childOriginals against the actual assembled raster and complete code. Panel values are immutable; use program validation for numerical values. A horizontal bar chart is supported unless original user explicitly requested vertical. Inspect the actual raster for clipping, crowding and ambiguous connectors, including problems not caught by conservative bounds checks. Return panelRendererAudits keyed by EVERY panel label, each following rendererAudit schema, using that child methodology, caption as visualIntent, and avoid. Keep rendererAudit for the original overall task separately. Return panelTopologyAudits keyed by panel label for each child carrying review.topology. Use the child topologyHash, nodeIdentityMap and child original methodology/caption; preserve ordinary overall visual/code decision.\n'+topologyReviewPrompt().replace('Return additional topologyAudit:', 'For EACH such child return panelTopologyAudits[panelLabel]:');
  }
  if(sourceCatalog){
   evidence.sourceCatalog=sourceCatalog;system+=sourceReferenceReviewPrompt();
   if(evidence.childOriginals)system+='\nFor EVERY panelRendererAudits and panelTopologyAudits provenance item use only sourceRef from that childOriginals sourceCatalog, never the overall catalogue. Return panelSourceCatalogHashes keyed by EVERY panel label, copying the exact child catalogHash. All parent and child audits use source protocol version 2; keep the root sourceCatalogHash for the overall task. Independently check child originals and images; a catalogue ref is not semantic proof.';
  }
  const wire={model:'qwen3.7-plus',enable_thinking:false,max_tokens:10000,stream:true,stream_options:{include_usage:true},messages:[{role:'system',content:system},{role:'user',content:[{type:'text',text:rendererContext(input,'',contract,{reviewMode:'visual_and_code',...evidence})},{type:'image_url',image_url:{url:'data:image/png;base64,'+rendered.png.toString('base64')}}]}]};
  const record={date:'2026-10-10',realProvider:true,readOnly:true,scenario:run.scenario,model:wire.model,version:review.deliveredVersion,svgHash:rendered.svgHash,pngHash:rendered.pngHash,localPassed,sourceProtocolVersion:sourceCatalog?2:1,sourceCatalogHash:sourceCatalog?.catalogHash,request:{...wire,messages:[wire.messages[0],{role:'user',content:[wire.messages[1].content[0],{type:'image_url',image_url:{sha256:hash(rendered.png)}}]}]},status:'in_progress',startedAt:new Date().toISOString()};
  if(sessionRequests>=54)throw Error('Explicit session request ceiling reached');sessionRequests++;
  await writeFile(recordPath,JSON.stringify(clean(record),null,2)+'\n');
  await writeFile(path.join(dir,'final-review-input.png'),rendered.png);
  console.log('FINAL REVIEW',run.scenario,record.version,record.svgHash);
  try{
   const response=await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},body:JSON.stringify(wire),signal:AbortSignal.timeout(180000),redirect:'error'});
   const raw=await response.text(),parts=[];record.httpStatus=response.status;
   for(const line of raw.split('\n'))if(line.startsWith('data: ')&&!line.includes('[DONE]')){let d;try{d=JSON.parse(line.slice(6))}catch{continue}if(d.usage)record.usage=d.usage;if(d.id)record.requestId=d.id;if(d.choices?.[0]?.delta?.content)parts.push(d.choices[0].delta.content);}
   record.responseText=parts.join('');if(!response.ok)throw Error(raw.slice(0,2000));
   const resolution=sourceCatalog?resolveReviewSourceRefs(record.responseText,sourceCatalog,review.topology?.topology):{resolvedRaw:record.responseText,mode:'legacy_quote',trace:[]};
   if(sourceCatalog&&resolution.mode!=='source_ref')throw Error('Independent v2 acceptance requires explicit source references');
   record.resolvedResponseText=resolution.resolvedRaw;record.sourceResolution={mode:resolution.mode,trace:resolution.trace};
   const decision=parseSvgDecision(resolution.resolvedRaw,review.deliveredVersion,rendered.svgHash);record.decision=JSON.parse(decision.assessment);
   record.rendererCheck=validateRendererAudit(resolution.resolvedRaw,input);let semanticsPassed=record.rendererCheck.passed;
   if(review.topology){record.semanticCheck=validateTopologyAudit(resolution.resolvedRaw,review.topology.topology,original);semanticsPassed=semanticsPassed&&record.semanticCheck.passed;}
   else{
    record.semanticChecks={};record.panelRendererChecks={};record.panelSourceResolutions={};
    for(const p of evidence.childOriginals){
     let panelRaw=JSON.stringify({rendererAudit:record.decision.panelRendererAudits?.[p.label],...(p.review.topology?{topologyAudit:record.decision.panelTopologyAudits?.[p.label]}:{})});
     if(p.sourceCatalog){
      const catalogueHash=record.decision.panelSourceCatalogHashes?.[p.label];
      if(catalogueHash!==p.sourceCatalog.catalogHash)throw Error('Child catalogue identity mismatch: '+p.label);
      panelRaw=JSON.stringify({...JSON.parse(panelRaw),sourceProtocolVersion:2,sourceCatalogHash:catalogueHash});
      const resolved=resolveReviewSourceRefs(panelRaw,p.sourceCatalog,p.review.topology?.topology);
      if(resolved.mode!=='source_ref')throw Error('Child explicit source references required: '+p.label);
      record.panelSourceResolutions[p.label]=resolved;panelRaw=resolved.resolvedRaw;
     }
     const checked=validateRendererAudit(panelRaw,{methodContent:p.methodology,caption:p.caption,negativePrompt:p.avoid||input.negativePrompt});record.panelRendererChecks[p.label]=checked;semanticsPassed=semanticsPassed&&checked.passed;
     if(p.review.topology){const checked=validateTopologyAudit(panelRaw,p.review.topology.topology,p.methodology+'\n'+p.caption);record.semanticChecks[p.label]=checked;semanticsPassed=semanticsPassed&&checked.passed;}
    }
   }
   record.status=decision.passed&&semanticsPassed&&localPassed?'passed':'issues_found';
  }catch(e){record.status='review_failed';record.error=String(e.message).split(key).join('[REDACTED]');failed=true;}
  record.elapsedMs=Date.now()-Date.parse(record.startedAt);
  await writeFile(recordPath,JSON.stringify(clean(record),null,2)+'\n');
  console.log('FINAL RESULT',run.scenario,record.status,JSON.stringify(record.usage||{}));
  if(failed)break;
 }
}finally{key='';}
if(failed)process.exitCode=1;
