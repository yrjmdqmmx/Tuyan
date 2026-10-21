import test,{afterEach} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import {svgRecoveryTask,mergeSvgRecovery} from '../src/workspace/workspaceSvgRecovery.js';
import {newWorkspace,workspaceReducer,selectedVersion,versionLabel} from '../src/workspace/workspaceState.js';
import WorkspaceApiSetup from '../src/workspace/WorkspaceApiSetup.jsx';
import WorkspaceRunEvidence from '../src/workspace/WorkspaceRunEvidence.jsx';
import {emptyUniversalDraft,saveUniversalDrafts} from '../src/lib/universalApi.js';
import {sampleSvg} from '../src/workspace/previewFixtures.js';
import WorkspaceLeaderboard from '../src/workspace/WorkspaceLeaderboard.jsx';
import {createWorkspaceClient} from '../src/workspace/workspaceSync.js';
import {cleanWorkspace} from '../../../packages/api/src/workspace-sync.mjs';
const originalFetch=globalThis.fetch;
afterEach(()=>{cleanup();globalThis.fetch=originalFetch;window.localStorage.clear();});
const draft={key:JSON.stringify(['http://api.test','owner','legacy-job',0]),taskId:'legacy-job',candidateId:0,svg:sampleSvg('A'),updatedAt:100};
test('browser SVG recovery deduplicates content, preserves edits and never fabricates an execution',async()=>{
 const before=newWorkspace('existing');before.tasks[0].branches.png.draft.text='Protected draft';
 const task=await svgRecoveryTask(draft,'http://api.test','owner');
 const first=mergeSvgRecovery(before,task), second=mergeSvgRecovery(first,await svgRecoveryTask({...draft,updatedAt:200},'http://api.test','owner'));
 assert.equal(second.tasks.length,2);assert.deepEqual(second.tasks[1],before.tasks[0]);assert.equal(second.tasks[0].runs[0].execution,undefined);assert.equal(second.tasks[0].runs[0].kind,'edit');assert.equal(second.tasks[0].activeRunId,null);
 const edited=workspaceReducer(second,{type:'RENAME',title:'My recovered version'});
 assert.equal(mergeSvgRecovery(edited,task).tasks[0].title,'My recovered version');
 assert.notEqual((await svgRecoveryTask({...draft,svg:sampleSvg('B')},'http://api.test','owner')).id,task.id);
 assert.equal(draft.svg,sampleSvg('A'));
 assert.match(versionLabel(selectedVersion(first),true),/手工绘图/);
 assert.doesNotMatch(versionLabel(selectedVersion(first),true),/次生成/);
});
test('advanced API import saves a separate connection without copying old credentials or changing task selection',async()=>{
 const drafts=Object.fromEntries(['main','image','vision'].map(role=>[role,emptyUniversalDraft(role)]));
 drafts.main={...drafts.main,modelId:'fixture-main',declared:true,apiKey:'never-import-this',custom:{...drafts.main.custom,baseUrl:'https://api.example.com/v1',capabilities:{text:true,vision:false,imageGeneration:false,imageEditing:false}}};
 saveUniversalDrafts(drafts,window.localStorage);
 const library={revision:1,connections:[{id:'existing',provider:'custom'}],models:[{id:'existing-model',connectionId:'existing',modelId:'original'}]},before=structuredClone(library),saves=[];
 let used=0,saved=0;
 render(React.createElement(WorkspaceApiSetup,{models:{ready:true,userId:'fixture',registry:{universalApiContractVersion:1},library,save:async(...args)=>{saves.push(args);return true;}},onSaved:()=>saved++,onUse:()=>used++}));
 fireEvent.click(screen.getByRole('button',{name:'读取旧工作台此角色配置（不含密钥）'}));
 assert.equal(screen.getByLabelText('主模型 API Key').value,'');
 assert.equal(screen.getByLabelText('主模型 模型 ID').value,'fixture-main');
 fireEvent.click(screen.getByLabelText('我已核对能力与已知服务限制；未知字段按平台及我的限制执行'));
 fireEvent.change(screen.getByLabelText('新连接名称'),{target:{value:'Imported configuration'}});
 fireEvent.click(screen.getByRole('button',{name:'保存为新连接与模型'}));
 await waitFor(()=>assert.equal(saved,1));
 assert.equal(used,0);assert.deepEqual(library,before);
 assert.equal(saves[0][0].connections.length,2);assert.equal(saves[0][0].models.length,2);
 assert.equal(saves[0][0].connections[1].scope,'browser');assert.equal(saves[0][1].value,'');
 assert.equal(JSON.stringify(saves).includes('never-import-this'),false);
});
test('advanced API save validates roles and clears a newly typed key when its binding changes',async()=>{
 const saves=[];let used;
 render(React.createElement(WorkspaceApiSetup,{models:{ready:true,userId:'fixture',registry:{universalApiContractVersion:1},library:{connections:[],models:[]},save:async(...args)=>{saves.push(args);return true;}},onSaved:()=>{},onUse:value=>{used=value;}}));
 fireEvent.change(screen.getByLabelText('新连接名称'),{target:{value:'Explicit connection'}});
 fireEvent.click(screen.getByRole('button',{name:'保存为新连接与模型'}));
 assert.equal(saves.length,0);
 fireEvent.change(screen.getByLabelText('主模型 模型 ID'),{target:{value:'gpt-4.1'}});
 fireEvent.change(screen.getByLabelText('主模型 API Key'),{target:{value:'fixture-only-key'}});
 fireEvent.change(screen.getByLabelText('主模型 Base URL'),{target:{value:'https://other.example.com/v1'}});
 assert.equal(screen.getByLabelText('主模型 API Key').value,'');
 fireEvent.change(screen.getByLabelText('主模型 Base URL'),{target:{value:'https://api.openai.com/v1'}});
 fireEvent.change(screen.getByLabelText('密钥保存位置'),{target:{value:'account'}});
 fireEvent.click(screen.getByRole('button',{name:'保存并用于当前任务的专业模式'}));
 await waitFor(()=>assert.equal(saves.length,1));
 assert.equal(saves[0][0].connections[0].scope,'account');assert.equal(saves[0][1].value,'');
 assert.equal(used.role,'main');assert.equal(used.reference.modelId,'gpt-4.1');
 assert.equal(used.reference.connectionId,saves[0][0].connections[0].id);
});
test('SVG recovery rejects another owner, service and unsafe SVG',async()=>{
 await assert.rejects(svgRecoveryTask(draft,'http://api.test','other'),/当前账号/);
 await assert.rejects(svgRecoveryTask(draft,'http://other.test','owner'),/当前账号/);
 await assert.rejects(svgRecoveryTask({...draft,svg:'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'},'http://api.test','owner'));
});
test('recovered SVG serializes through existing account sync, without source original or credentials',async()=>{
 const task=await svgRecoveryTask(draft,'http://api.test','owner');
 const calls=[];
 const client=createWorkspaceClient({baseUrl:'http://api.test',userId:'owner',fetcher:async(url,options)=>{calls.push([url,options]);return new Response(JSON.stringify({resultId:'a'.repeat(64)}),{headers:{'Content-Type':'application/json'}});}});
 const state={schema:1,selectedTaskId:task.id,tasks:[task]};
 // wire accepts inlined saved result bytes but never attachment originals.
 const wire=await client.wire(state);
 assert.equal(cleanWorkspace(wire).tasks.length,1);
 assert.equal(wire.tasks[0].branches.svg.groups[0].candidates[0].versions[0].resultId,'a'.repeat(64));
 assert.equal(wire.tasks[0].runs[0].input.attachments.length,0);
});
test('leaderboard exposes community submission and guest login stays inside the workspace',async()=>{
 const requests=[];globalThis.fetch=async(url)=>{requests.push(String(url));return new Response(JSON.stringify({error:'Fixture unavailable'}),{status:503,headers:{'Content-Type':'application/json'}});};
 let login=0,returned=0;
 render(React.createElement(WorkspaceLeaderboard,{account:{onSignIn:()=>login++},onReturn:()=>returned++}));
 fireEvent.click(screen.getByRole('button',{name:'提交评估题'}));
 await screen.findByRole('heading',{name:'登录后提交评估题'});
 fireEvent.click(screen.getByRole('link',{name:'前往工作台登录'}));
 assert.equal(login,1);assert.equal(returned,0);assert.equal(requests.some(s=>s.includes('get-session')),false);
 assert.equal(!!screen.queryByRole('button',{name:'社区评估题审核'}),false);
});
test('signed-in leaderboard opens original submission form and admin entry without mutation',async()=>{
 let admin=0;globalThis.fetch=async()=>new Response(JSON.stringify({error:'Fixture unavailable'}),{status:503,headers:{'Content-Type':'application/json'}});
 render(React.createElement(WorkspaceLeaderboard,{account:{user:{id:'fixture'}},isAdmin:true,onAdmin:()=>admin++}));
 fireEvent.click(screen.getByRole('button',{name:'提交评估题'}));
 assert.ok(screen.getByRole('heading',{name:'提交评估提示词'}));
 assert.equal(!!screen.queryByRole('heading',{name:'登录后提交评估题'}),false);
 fireEvent.click(screen.getByRole('button',{name:'社区评估题审核'}));assert.equal(admin,1);
});
test('existing execution details preserve reference, candidate failure and legacy review evidence without retrying',async()=>{
 let reads=0;
 const run={id:'run',execution:{taskId:'original',jobId:'job'}};
 render(React.createElement(WorkspaceRunEvidence,{taskId:'copy',userId:'fixture',run,read:async()=>{reads++;return {
  error:'partial failure',failure:{message:'候选部分失败',billingMessage:'已有结果不会再次扣费'},
  candidateProgress:[{candidate_id:2,status:'failed',error:{message:'模拟候选失败'}}],
  referenceSelection:{selectedCount:1,imageCount:1,mode:'images'},
  reference_images:[{url:'data:image/png;base64,AA==',filename:'existing-reference.png'}],
  results:[{candidate:'2',review:'历史标签需复核'}]
 };}}));
 assert.equal(reads,0);fireEvent.click(screen.getByRole('button',{name:'查看渠道与评审记录'}));
 await screen.findByText('历史标签需复核');
 assert.ok(screen.getByText('候选 C · 历史评审记录'));
 assert.ok(screen.getByText('已有结果不会再次扣费'));
 assert.ok(screen.getByText('候选 3 · 失败：模拟候选失败'));
 assert.ok(screen.getByText('本次采用的参考'));
 assert.equal(reads,1);assert.equal(!!screen.queryByRole('button',{name:/重新生成|重试执行/}),false);
});
