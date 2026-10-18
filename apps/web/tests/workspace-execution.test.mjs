import test from 'node:test';
import assert from 'node:assert/strict';
import {buildWorkspaceRequest,startWorkspaceRun,workspaceExecutionIssue,resumeWorkspaceRun} from '../src/workspace/workspaceExecution.js';
import {newWorkspace,workspaceReducer,currentDraft} from '../src/workspace/workspaceState.js';
import {cleanWorkspace} from '../../../packages/api/src/workspace-sync.mjs';
import {IDBFactory} from 'fake-indexeddb';
import {File as NodeFile} from 'node:buffer';
import {saveBrowserMaterial,browserFile} from '../src/lib/browserMaterials.js';
import {ORIGINAL_SCOPE} from '../src/workspace/workspaceSync.js';
const ref=(role,id)=>({libraryModelId:role,connectionId:'c',accessProvider:'openai',modelId:id});
const models={registryStatus:'ready',summary:{},registry:{routeContractVersion:1,providers:{openai:{models:[{id:'text',roles:['main','vision'],capabilities:{referenceImages:true},selectable:true},{id:'image',roles:['image'],capabilities:{outputFormats:['png'],imageEditing:true},selectable:true}]}}},library:{revision:1,connections:[{id:'c',provider:'openai',scope:'account',hasCredential:true}],models:[{id:'main',connectionId:'c',modelId:'text'},{id:'image',connectionId:'c',modelId:'image'}]}};
test('real execution requires explicit service opt-in and enforces the declared channel and small-run limits',()=>{
 const health={workspaceExecutionContractVersion:1,executionEnabled:true,allowedProviders:['tokendance'],maxCandidates:1,maxReviews:1};const request={modelRoutes:{main:{accessProvider:'tokendance'}},numCandidates:1,maxCriticRounds:1};
 assert.match(workspaceExecutionIssue({workspaceExecutionContractVersion:1}),/未明确开放/);assert.equal(workspaceExecutionIssue(health,request),'');assert.match(workspaceExecutionIssue(health,{...request,numCandidates:2}),/一个候选/);assert.match(workspaceExecutionIssue(health,{...request,modelRoutes:{main:{accessProvider:'openai'}}}),/TokenDance/);assert.equal(workspaceExecutionIssue({workspaceExecutionContractVersion:1,simulation:true},{...request,numCandidates:3}),'');
});
function setup(path='png'){let s=newWorkspace('task');s=workspaceReducer(s,{type:'SET_PATH',path});let d=currentDraft(s);s=workspaceReducer(s,{type:'EDIT_DRAFT',patch:{text:'绘制研究流程图',settings:{...d.settings,simple:{...d.settings.simple,figureTypeId:'method_framework',models:{main:ref('main','text'),image:ref('image','image')}}}}});s=workspaceReducer(s,{type:'BEGIN',runId:'run',execution:{version:1,simulation:true}});return s;}
test('unified text has no hidden caption requirement; path and actual workflow choose roles',()=>{for(const path of ['png','svg']){const s=setup(path),task=s.tasks[0],run=task.runs[0],request=buildWorkspaceRequest({task,run,models});assert.equal(request.requirements,'绘制研究流程图');assert.equal(request.caption,'');assert.equal(request.outputFormat,path);assert.deepEqual(Object.keys(request.modelRoutes),path==='png'?['main','image']:['main']);assert.equal(request.visionMode,'none');}});
test('simulation uses real shared transport but never reads or sends account/browser keys or original bytes',async()=>{const s=setup(),task=s.tasks[0],run=task.runs[0],original=globalThis.fetch;let wire;globalThis.fetch=async(url,options)=>{wire=JSON.parse(options.body);assert.equal(options.headers['X-Workspace-Account'],'A');return Response.json({jobId:'job',status:'running'});};try{const created=await startWorkspaceRun({base:'http://localhost',userId:'A',task,run,models,simulation:true});assert.equal(created.id,'job');assert.equal(wire.action,'createJob');assert.deepEqual(wire.workspaceExecution.browserCredentials,{});assert.deepEqual(wire.materialFiles,[]);assert.equal(wire.workspaceExecution.simulation.format,'png');assert.equal(wire.requirements,run.input.text);}finally{globalThis.fetch=original;}});
test('a real browser-stored original stays local during simulation; missing originals stop before any submission',async()=>{
 const previous={indexedDB:globalThis.indexedDB,File:globalThis.File,fetch:globalThis.fetch};Object.assign(globalThis,{indexedDB:new IDBFactory(),File:NodeFile});let calls=[];
 try{const material=await saveBrowserMaterial(ORIGINAL_SCOPE,new NodeFile(['private-fixture-original'],'research.txt',{type:'text/plain'}));const s=setup(),task=s.tasks[0],run=task.runs[0];run.input.attachments=[{...material,purpose:'research'}];globalThis.fetch=async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return Response.json({jobId:'job'});};
 await startWorkspaceRun({base:'http://localhost',userId:'A',task,run,models,simulation:true});assert.equal(calls.length,1);assert.doesNotMatch(JSON.stringify(calls),/private-fixture-original/);assert.equal(calls[0].body.workspaceExecution.simulation.materialCount,1);assert.deepEqual(calls[0].body.materialFiles,[]);assert.equal(await(await browserFile(ORIGINAL_SCOPE,material)).text(),'private-fixture-original');
 run.input.attachments[0].clientFileId='missing-original';await assert.rejects(startWorkspaceRun({base:'http://localhost',userId:'A',task,run,models,simulation:true}),e=>e.beforeDispatch&&/原件/.test(e.message));assert.equal(calls.length,1);
 }finally{Object.assign(globalThis,previous);}
});
test('manual SVG save appends an immutable child without altering source or draft; sync preserves editor lineage and execution identity',()=>{let s=setup('svg');s=workspaceReducer(s,{type:'ACCEPT',runId:'run'});s=workspaceReducer(s,{type:'RESULT',runId:'run',candidateId:'a',version:{id:'v1',format:'svg',url:'data:image/svg+xml,<svg/>'}});s=workspaceReducer(s,{type:'FINISH',runId:'run'});s=workspaceReducer(s,{type:'EDIT_DRAFT',patch:{text:'Next draft'}});const source=structuredClone(s.tasks[0].branches.svg.groups[0].candidates[0].versions[0]);s=workspaceReducer(s,{type:'SAVE_SVG',parentId:'v1',versionId:'v2',runId:'manual',url:'data:image/svg+xml,<svg><text/></svg>'});const versions=s.tasks[0].branches.svg.groups[0].candidates[0].versions;assert.deepEqual(versions[0],source);assert.equal(versions[1].parentId,'v1');assert.equal(versions[1].origin,'手工编辑');assert.equal(currentDraft(s).text,'Next draft');for(const v of versions)v.resultId='a'.repeat(64);const clean=cleanWorkspace(s);assert.equal(clean.tasks[0].runs[1].kind,'edit');assert.equal(clean.tasks[0].runs[0].execution.simulation,true);});
test('data figure route, source SVG count and existing review floor are preserved',()=>{
 const s=setup('svg'),task=s.tasks[0],run=task.runs[0];run.input.settings.simple.figureTypeId='bar';
 assert.equal(buildWorkspaceRequest({task,run,models}).taskName,'plot');
 run.input.attachments=[{id:'source',purpose:'source',format:'svg'}];run.input.settings.simple.candidates=4;
 assert.equal(buildWorkspaceRequest({task,run,models}).numCandidates,1);
 run.input.settings.simple.reviews=0;assert.throws(()=>buildWorkspaceRequest({task,run,models}),/至少需要一轮/);
});
test('PNG refinement requires explicit reference purpose and follows the exact model image limit',()=>{
 const s=setup(),task=s.tasks[0],run=task.runs[0];run.input.attachments=[{id:'source',purpose:'source',format:'png'},{id:'ref',purpose:'reference',format:'png'}];
 const m=structuredClone(models);m.registry.providers.openai.models[1].capabilities.refineControls={version:1,maxImages:2,sourceCounts:true};
 assert.throws(()=>buildWorkspaceRequest({task,run,models:m}),/参考图用于/);
 run.input.attachments[1].referencePurpose='color';const request=buildWorkspaceRequest({task,run,models:m});assert.equal(request.action,'refineImage');assert.equal(request.numCandidates,1);
 m.registry.providers.openai.models[1].capabilities.refineControls.maxImages=1;assert.throws(()=>buildWorkspaceRequest({task,run,models:m}),/最多接收 0/);
});
test('returning to a background task selects its first result without changing a viewed version',()=>{
 let s=setup();s=workspaceReducer(s,{type:'ACCEPT',runId:'run'});s=workspaceReducer(s,{type:'CREATE_TASK',id:'other'});s=workspaceReducer(s,{type:'RESULT',taskId:'task',runId:'run',candidateId:'a',version:{id:'first',format:'png',url:'data:image/png;base64,iVBORw0KGgo='}});s=workspaceReducer(s,{type:'SELECT_TASK',id:'task'});assert.equal(s.tasks.find(t=>t.id==='task').branches.png.versionId,'first');
});
test('signed result bytes are saved by actual format, without cross-origin cookies or redirects',async()=>{
 const {workspaceResultDataUrl}=await import('../src/workspace/workspaceResultAsset.js');const original=globalThis.fetch;let sent;
 globalThis.fetch=async(url,options)=>{sent=options;return new Response(new Uint8Array([137,80,78,71,13,10,26,10]));};
 try{assert.match(await workspaceResultDataUrl('https://cdn.example/signed','png','https://api.example'),/^data:image\/png;base64,/);assert.equal(sent.credentials,'omit');assert.equal(sent.redirect,'error');globalThis.fetch=async()=>new Response('<html>Expired</html>');await assert.rejects(workspaceResultDataUrl('https://cdn.example/expired','png','https://api.example'),/不是 PNG/);}finally{globalThis.fetch=original;}
});
test('manual references and refinement masks obey exact capabilities and source identity',()=>{
 const s=setup(),task=s.tasks[0],run=task.runs[0],settings=run.input.settings.simple;
 settings.retrievalSetting='manual';assert.throws(()=>buildWorkspaceRequest({task,run,models}),/至少选择/);
 settings.manualReferenceIds=['case-1'];settings.referencePreferences={discipline:'biology',density:'sparse'};
 const req=buildWorkspaceRequest({task,run,models});assert.deepEqual(req.manualReferenceIds,['case-1']);assert.equal(req.figureAnalysis.referencePreferences.discipline,'biology');
 run.input.attachments=[{id:'source',purpose:'source',format:'png'}];settings.refineMask={sourceId:'other'};assert.throws(()=>buildWorkspaceRequest({task,run,models}),/另一张/);
 settings.refineMask.sourceId='source';const m=structuredClone(models);m.registry.providers.openai.models[1].capabilities.refineControls={version:1,maxImages:1,sourceCounts:true,mask:false};assert.throws(()=>buildWorkspaceRequest({task,run,models:m}),/遮罩/);
 m.registry.providers.openai.models[1].capabilities.refineControls.mask=true;assert.equal(buildWorkspaceRequest({task,run,models:m}).action,'refineImage');
});
test('applying a template creates a separate task and preserves every existing task byte for byte',()=>{
 const state=setup(),before=structuredClone(state.tasks);const next=workspaceReducer(state,{type:'APPLY_TEMPLATE',id:'template-task',template:{title:'Template',methodContent:'Study',caption:'Fig 1',negativePrompt:'No logos'}});
 assert.deepEqual(next.tasks.slice(1),before);assert.equal(next.selectedTaskId,'template-task');assert.equal(currentDraft(next).text,'Study');assert.equal(next.tasks[0].runs.length,0);
});

test('copying historical execution input creates a new task without overwriting current drafts or results',()=>{
 const state=setup('svg'),original=structuredClone(state.tasks);const next=workspaceReducer(state,{type:'COPY_RUN',runId:'run',id:'copy'});
 assert.deepEqual(next.tasks.slice(1),original);assert.deepEqual(currentDraft(next).settings,original[0].runs[0].input.settings);assert.equal(next.tasks[0].runs.length,0);assert.equal(next.tasks[0].activeRunId,null);
});

test('resume checks the saved job then uses the same execution identity, never a new generation',async()=>{
 const s=setup('svg'),task=s.tasks[0],run=task.runs[0];run.execution.jobId='job';const original=globalThis.fetch,calls=[];
 globalThis.fetch=async(url,options)=>{const body=JSON.parse(options.body);calls.push(body);return body.action==='getJob'?Response.json({job:{id:'job',status:'awaiting_provider',recovery:{canResume:true,channel:'tokendance'}}}):Response.json({jobId:'job',status:'running'});};
 try{await resumeWorkspaceRun({base:'http://localhost',userId:'A',task,run,models});assert.deepEqual(calls.map(c=>c.action),['getJob','tokenDanceResume']);assert.equal(calls[1].workspaceExecution.runId,'run');assert.equal(calls[1].jobId,'job');assert.deepEqual(task.runs.map(r=>r.id),['run']);}finally{globalThis.fetch=original;}
});

test('historical recovery adopts the original identity without applying new settings or requiring a new model library',async()=>{
 const {historyJob}=await import('../../../packages/api/src/workspace-history.mjs');
 const {mergeAccountHistory}=await import('../src/workspace/workspaceHistory.js');
 const original=newWorkspace('untouched'),state=mergeAccountHistory(original,[historyJob({id:'old-svg',userId:'A',status:'awaiting_provider',outputFormat:'svg',methodContent:'old input',resultImages:[{filename:'old.svg'}]},'server','A')]);
 const task=state.tasks[1],run=task.runs[0],before=structuredClone(task),previous=globalThis.fetch,calls=[];let adopted;
 globalThis.fetch=async(url,options)=>{const body=JSON.parse(options.body);calls.push(body);return body.action==='workspaceAdoptHistory'?Response.json({execution:{jobId:'old-svg'}}):body.action==='getJob'?Response.json({job:{id:'old-svg',status:'awaiting_provider',recovery:{canResume:true,channel:'tokendance'}}}):Response.json({jobId:'old-svg',status:'running'});};
 try{
  await resumeWorkspaceRun({base:'http://localhost',userId:'A',task,run,models:{library:{connections:[],models:[]}},onAdopted:e=>{adopted=e;}});
  assert.deepEqual(calls.map(c=>c.action),['workspaceAdoptHistory','getJob','tokenDanceResume']);
  assert.equal(adopted.jobId,'old-svg');assert.equal(calls[2].workspaceExecution.runId,run.id);assert.equal(calls[2].modelRoutes,undefined);assert.equal(calls[2].requirements,undefined);assert.deepEqual(task,before);
  const withExecution=structuredClone(state);withExecution.tasks[1].runs[0].execution=adopted;
  const updated=mergeAccountHistory(withExecution,[historyJob({id:'old-svg',userId:'A',status:'completed',outputFormat:'svg',resultImages:[{filename:'old.svg'},{filename:'next.svg'}]},'production','A')]);
  assert.equal(updated.tasks.length,2);assert.equal(updated.tasks[1].runs.length,1);assert.equal(updated.tasks[1].branches.svg.groups.length,1);assert.equal(updated.tasks[1].branches.svg.groups[0].candidates.length,2);assert.equal(updated.tasks[1].activeRunId,null);assert.deepEqual(updated.tasks[1].branches.svg.draft,before.branches.svg.draft);assert.deepEqual(updated.tasks[0],original.tasks[0]);
 }finally{globalThis.fetch=previous;}
});

test('missing historical originals block resume before upload, model dispatch or draft changes',async()=>{
 const {historyJob}=await import('../../../packages/api/src/workspace-history.mjs');const {mergeAccountHistory}=await import('../src/workspace/workspaceHistory.js');
 const state=mergeAccountHistory(newWorkspace('draft'),[historyJob({id:'old-png',userId:'A',status:'awaiting_provider',outputFormat:'png',resultImages:[]},'server','A')]);
 const task=state.tasks[1],run=task.runs[0],before=structuredClone(task),previous=globalThis.fetch,calls=[];
 globalThis.fetch=async(_url,options)=>{const b=JSON.parse(options.body);calls.push(b.action);if(b.action==='workspaceAdoptHistory')return Response.json({execution:{jobId:'old-png'}});if(b.action==='getJob')return Response.json({job:{id:'old-png',status:'awaiting_provider',recovery:{canResume:true},materialFiles:[{id:'expired-original',clientFileId:'old-browser-file',sha256:'a'.repeat(64)}]}});return Response.json({code:410,error:'原文件已过期'},{status:410});};
 try{await assert.rejects(resumeWorkspaceRun({base:'http://localhost',userId:'A',task,run,models:{},simulation:true}),/原件/);assert.deepEqual(calls,['workspaceAdoptHistory','getJob','getMaterial']);assert.deepEqual(task,before);}finally{globalThis.fetch=previous;}
});


test('production execution uses exact catalog validation without local TokenDance-only restrictions', () => {
  const request = { modelRoutes: { main: { accessProvider: 'openai' } }, numCandidates: 3, maxCriticRounds: 2 };
  assert.equal(workspaceExecutionIssue({workspaceExecutionContractVersion:1, executionMode:'production', executionEnabled:true}, request), '');
  assert.match(workspaceExecutionIssue({workspaceExecutionContractVersion:1, executionMode:'production', executionEnabled:false}, request), /未明确开放/);
});
