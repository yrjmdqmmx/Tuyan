import { changeControl } from './menu-helpers.mjs';
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, screen, cleanup, fireEvent, within, renderHook, act, waitFor } from '@testing-library/react';
import useWorkspaceModels from '../src/workspace/useWorkspaceModels.js';
import WorkspaceModelPicker from '../src/workspace/WorkspaceModelPicker.jsx';
import { WorkspaceModelConfig } from '../src/workspace/WorkspaceModelPanels.jsx';
import WorkspaceDialog from '../src/workspace/WorkspaceDialog.jsx';
import WorkspaceExecutionDetails from '../src/workspace/WorkspaceExecutionDetails.jsx';
import { emptyUniversalDraft, universalDraftRoute } from '../src/lib/universalApi.js';
import { tokenDanceLibraryAddition } from '../src/workspace/tokenDanceLibrary.js';
import { newWorkspace, currentDraft, workspaceReducer } from '../src/workspace/workspaceState.js';
afterEach(cleanup);
const registry = {providers:{tokendance:{models:[
 {id:'qwen-fixture',label:'Qwen fixture',vendorId:'alibaba',roles:['main','vision'],inputModalities:['text','image'],selectable:true},
 {id:'not-added',label:'Never added',vendorId:'alibaba',roles:['main'],selectable:true},
 {id:'draw-fixture',label:'Drawing fixture',vendorId:'alibaba',roles:['image'],capabilities:{outputFormats:['png']},selectable:true},
 {id:'retired',label:'Retired',vendorId:'alibaba',roles:['main'],selectable:false,disabledReason:'已下线'}]}}};
const library = {revision:2,connections:[
 {id:'one',provider:'tokendance',label:'First',scope:'authorization'},
 {id:'two',provider:'tokendance',label:'Second',scope:'authorization'}],models:[
 {id:'m1',connectionId:'one',modelId:'qwen-fixture'},
 {id:'m2',connectionId:'two',modelId:'qwen-fixture'},
 {id:'draw',connectionId:'one',modelId:'draw-fixture'},
 {id:'old',connectionId:'one',modelId:'retired'}]};
const models = {library,registry,summary:{tokenDance:{connected:true}},registryStatus:'ready'};

test('authorization import is additive, idempotent and preserves stopped models and connections', () => {
 let id=0; const next=tokenDanceLibraryAddition(library,registry,()=>`new-${++id}`);
 assert.deepEqual(next.models.slice(0,library.models.length),library.models);
 assert.deepEqual(next.models.at(-1),{id:'new-1',connectionId:'one',modelId:'not-added',disabled:false});
 assert.equal(tokenDanceLibraryAddition(next,registry),null);
 const stopped=structuredClone(next);stopped.models[0].disabled=true;
 assert.equal(tokenDanceLibraryAddition(stopped,registry),null);
 stopped.connections.forEach(c=>c.disabled=true);assert.equal(tokenDanceLibraryAddition(stopped,registry),null);
 assert.equal(library.models.length,4);
});
test('authorization import covers all roles, retains exact IDs and does not silently truncate at capacity', () => {
 let id=0;const next=tokenDanceLibraryAddition({revision:0,connections:[],models:[]},registry,()=>`new-${++id}`);
 assert.equal(next.connections.length,1);assert.equal(next.connections[0].scope,'authorization');
 assert.deepEqual(next.models.map(m=>m.modelId),registry.providers.tokendance.models.map(m=>m.id));
 assert.ok(next.models.every(m=>m.connectionId===next.connections[0].id));
 assert.throws(()=>tokenDanceLibraryAddition({...library,models:Array.from({length:500},(_,i)=>({id:`x${i}`,connectionId:'one',modelId:`x${i}`}))},registry),/容量不足/);
 assert.equal(tokenDanceLibraryAddition(library,{}),null);
});
test('card selection shows only added role models and binds the exact connection, even for same model IDs', () => {
 let selected;render(React.createElement(WorkspaceModelPicker,{models,role:'main',path:'svg',onChange:x=>selected=x,onManage:()=>{}}));
 fireEvent.click(screen.getByRole('button',{name:'主模型',exact:true}));
 assert.equal(screen.getAllByRole('article').length,3);
 assert.equal(screen.queryByText('Never added'),null);assert.equal(screen.queryByText('Drawing fixture'),null);
 assert.ok(screen.getAllByLabelText('官方文档规格').length);
 assert.equal(screen.getByRole('button',{name:'选择 Retired · First · one'}).disabled,true);
 assert.ok(screen.getByRole('dialog').classList.contains('model-route-drawer'));
 assert.equal(document.querySelector('.tw-picker-cards'),null);
 fireEvent.click(screen.getByRole('button',{name:'选择 Qwen fixture · Second · two'}));
 assert.deepEqual(selected,{libraryModelId:'m2',connectionId:'two',accessProvider:'tokendance',modelId:'qwen-fixture'});
 assert.equal(screen.queryByRole('dialog'),null);
});
test('models absent from the live catalogue are hidden without replacing an existing selection', () => {
 const missing={id:'missing-live',label:'Missing live model',vendorId:'alibaba',roles:['main'],selectable:false,disabledReason:'当前目录未列出该模型，已暂停调用；请等待供应商修复或主动选择其他模型。'};
 const next={...models,registry:{...registry,providers:{tokendance:{models:[...registry.providers.tokendance.models,missing]}},catalogHealth:{tokendance:{issues:[{id:missing.id,reason:'missing_live'}]}}},library:{...library,models:[...library.models,{id:'missing-saved',connectionId:'one',modelId:missing.id}]}};
 const current={libraryModelId:'missing-saved',connectionId:'one',accessProvider:'tokendance',modelId:missing.id}, changes=[];
 render(React.createElement(WorkspaceModelPicker,{models:next,role:'main',path:'svg',current,onChange:x=>changes.push(x)}));
 assert.match(screen.getByRole('button',{name:'主模型',exact:true}).textContent,/Missing live model/);
 fireEvent.click(screen.getByRole('button',{name:'主模型',exact:true}));
 assert.equal(within(screen.getByRole('dialog')).queryByText('Missing live model'),null);
 assert.ok(screen.getByRole('button',{name:'选择 Qwen fixture · First · one'}));
 assert.equal(screen.getAllByRole('article').length,3);
 assert.deepEqual(changes,[]);
});
test('stale catalogue cannot select a card and nested Escape only dismisses the picker', () => {
 let closed=0,changes=0;render(React.createElement(WorkspaceDialog,{title:'模型配置',onClose:()=>closed++},React.createElement(WorkspaceModelPicker,{models:{...models,registryStatus:'stale'},role:'vision',path:'svg',onChange:()=>changes++,onManage:()=>{}})));
 fireEvent.click(screen.getByRole('button',{name:'视觉理解',exact:true}));
 fireEvent.click(screen.getByRole('button',{name:'观猹 TokenDance',exact:true}));
 assert.equal(screen.getByRole('button',{name:'选择 Qwen fixture · First · one'}).disabled,true);
 fireEvent.click(screen.getAllByRole('article')[0]);assert.equal(changes,0,'disabled card body cannot bypass credential or registry checks');
 fireEvent.keyDown(window,{key:'Escape'});
 assert.equal(screen.getAllByRole('dialog').length,1);assert.equal(closed,0);
});

test('saved custom models reuse the same cards without opening or mutating the connection editor', () => {
 const draft=emptyUniversalDraft('main');draft.modelId='custom-fixture';draft.declared=true;
 draft.custom.capabilities.text=true;
 const route=universalDraftRoute(draft);
 const connection={id:route.custom.connectionId,provider:'custom',label:'Saved custom',scope:'browser',hasCredential:true,custom:route.custom};
 const customModels={...models,library:{revision:1,connections:[connection],models:[{id:'custom-saved',connectionId:connection.id,modelId:route.modelId,custom:route.custom}]}};
 const changes=[];render(React.createElement(WorkspaceModelPicker,{models:customModels,role:'main',path:'svg',onChange:x=>changes.push(x)}));
 fireEvent.click(screen.getByRole('button',{name:'主模型',exact:true}));
 fireEvent.click(screen.getByRole('button',{name:'通用 API',exact:true}));
 assert.equal(changes.length,0);assert.equal(screen.queryByLabelText('通用 API 配置'),null);
 fireEvent.click(screen.getByRole('button',{name:'选择 custom-fixture',exact:true}));
 assert.deepEqual(changes,[{libraryModelId:'custom-saved',connectionId:connection.id,accessProvider:'custom',modelId:'custom-fixture'}]);
});
test('saved mobile navigation and search preserve exact connection selection', () => {
 const original=window.matchMedia;window.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});
 try {
  let selected;render(React.createElement(WorkspaceModelPicker,{models,role:'main',path:'svg',current:{libraryModelId:'m2',connectionId:'two',accessProvider:'tokendance',modelId:'qwen-fixture'},onChange:x=>selected=x}));
  fireEvent.click(screen.getByRole('button',{name:'主模型',exact:true}));
  assert.ok(screen.getByRole('heading',{name:'选择 API 接入渠道'}));
  fireEvent.click(screen.getByRole('button',{name:'观猹 TokenDance',exact:true}));
  fireEvent.click(screen.getByRole('button',{name:'厂商 阿里巴巴',exact:true}));
  changeControl(screen.getByRole('searchbox',{name:'搜索主模型'}),{target:{value:'qwen'}});
  assert.equal(screen.getAllByRole('article').length,2);
  const selectedCard=document.querySelector('.model-option.active');assert.match(selectedCard.textContent,/Second/);
  fireEvent.click(screen.getByRole('button',{name:'选择 Qwen fixture · First · one'}));
  assert.equal(selected.connectionId,'one');assert.equal(selected.libraryModelId,'m1');
 } finally {cleanup();window.matchMedia=original;}
});

test('execution records retain versions and original inputs without invented manual generation settings', () => {
 let state=newWorkspace('fixture');state=workspaceReducer(state,{type:'SET_PATH',path:'svg'});
 let draft=currentDraft(state);state=workspaceReducer(state,{type:'EDIT_DRAFT',patch:{text:'Original requirement',settings:draft.settings}});
 state=workspaceReducer(state,{type:'BEGIN',runId:'generate'});state=workspaceReducer(state,{type:'ACCEPT',runId:'generate'});
 state=workspaceReducer(state,{type:'RESULT',runId:'generate',candidateId:'a',version:{id:'v1',format:'svg',url:'data:image/svg+xml,<svg/>'}});
 state=workspaceReducer(state,{type:'FINISH',runId:'generate'});
 state=workspaceReducer(state,{type:'SAVE_SVG',parentId:'v1',versionId:'v2',runId:'manual',url:'data:image/svg+xml,<svg/>'});
 const before=structuredClone(state.tasks[0]);let action,viewed;
 const result=render(React.createElement(WorkspaceExecutionDetails,{task:state.tasks[0],dispatch:x=>action=x,onShowVersion:x=>viewed=x}));
 const rows=result.container.querySelectorAll('.tw-execution-record');assert.equal(rows.length,2);assert.equal(rows[0].open,false);
 fireEvent.click(rows[0].querySelector('summary'));assert.equal(rows[0].open,true);
 assert.match(rows[0].textContent,/候选 A · v2/);assert.doesNotMatch(rows[0].textContent,/比例|普通|auto/);
 fireEvent.click(within(rows[0]).getByRole('button',{name:'查看 候选 A · v2'}));assert.equal(viewed,'v2');
 assert.equal(screen.queryByRole('button',{name:'使用本次输入与设置新建任务'}),null);assert.equal(action,undefined);
 fireEvent.click(rows[1].querySelector('summary'));assert.ok(within(rows[1]).getByText('Original requirement'));
 assert.deepEqual(state.tasks[0],before);
});

function hookTransport({failSave=false}={}) {
 let connected=false, puts=0, stored={revision:0,connections:[],models:[]};
 return {
  connect(){connected=true;}, get puts(){return puts;},
  fetch:async(url,options={})=>{
   if(String(url).endsWith('/api/model-library')) {
    if(options.method==='PUT') {
     puts++;if(failSave)return Response.json({error:'fixture conflict'},{status:409});
     const body=JSON.parse(options.body);stored={...body,revision:body.revision+1};
    }
    return Response.json(stored);
   }
   if(String(url).endsWith('/api/workspace-account'))return Response.json({tokenDance:{connected}});
   if(!options.body)return Response.json({runtime:'gateway'});
   const {action}=JSON.parse(options.body);
   if(action==='modelRegistry')return Response.json(registry);
   if(action==='tokenDanceStatus')return Response.json({available:true,connected});
   throw Error(`Unexpected action ${action}`);
  }
 };
}
test('connecting authorization imports once; rerender and refresh never duplicate or rewrite a complete library',async()=>{
 const original=globalThis.fetch,transport=hookTransport();globalThis.fetch=transport.fetch;
 try {
  const hook=renderHook(()=>useWorkspaceModels('owner','https://fixture.test'));
  await waitFor(()=>assert.equal(hook.result.current.registryStatus,'ready'));
  await waitFor(()=>assert.equal(hook.result.current.ready,true));assert.equal(transport.puts,0);
  await act(async()=>{transport.connect();window.dispatchEvent(new window.Event('focus'));});
  await waitFor(()=>assert.equal(hook.result.current.library.models.length,4));assert.equal(transport.puts,1);
  hook.rerender();await act(async()=>{await hook.result.current.refresh();});
  assert.equal(transport.puts,1);assert.equal(hook.result.current.library.revision,1);
  hook.unmount();
 }finally{globalThis.fetch=original;}
});
test('automatic import failure is visible and bounded until an explicit refresh',async()=>{
 const original=globalThis.fetch,transport=hookTransport({failSave:true});transport.connect();globalThis.fetch=transport.fetch;
 try{
  const hook=renderHook(()=>useWorkspaceModels('owner','https://fixture.test'));
  await waitFor(()=>assert.equal(hook.result.current.error,'fixture conflict'));
  assert.equal(transport.puts,1);hook.rerender();await act(async()=>{});assert.equal(transport.puts,1);
  await act(async()=>{await hook.result.current.refresh();});
  await waitFor(()=>assert.equal(transport.puts,2));assert.equal(hook.result.current.library.models.length,0);
  hook.unmount();
 }finally{globalThis.fetch=original;}
});


test('model configuration hides unavailable thinking sections for all three roles without changing saved model choices', () => {
 for (const modelId of ['qwen3.8-flash', 'qwen3-30b-a3b-instruct-2507']) {
  const saved={...models, registry:{thinkingContractVersion:1,providers:{tokendance:{models:[{id:modelId,label:modelId,roles:['main','image','vision'],selectable:true,capabilities:{outputFormats:['png']}}]}}},library:{revision:1,connections:[library.connections[0]],models:[{id:'selected',connectionId:'one',modelId}]}};
  const reference={libraryModelId:'selected',connectionId:'one',accessProvider:'tokendance',modelId};
  const draft=currentDraft(newWorkspace('thinking-visibility'));draft.mode='advanced';
  draft.settings.advanced.models={main:reference,image:reference,vision:reference};
  const before=structuredClone(draft),changes=[];
  const {container}=render(React.createElement(WorkspaceModelConfig,{models:saved,draft,path:'png',editing:false,onChange:value=>changes.push(value),onManage(){}}));
  for (const name of ['主模型','绘图模型','视觉理解']) assert.match(screen.getByRole('button',{name,exact:true}).textContent,new RegExp(modelId,'i'));
  assert.equal(container.querySelector('.model-thinking-controls'),null);
  assert.equal(container.querySelector('.thinking-status'),null);
  assert.equal(container.querySelector('.thinking-evidence'),null);
  assert.doesNotMatch(container.textContent,/尚未核实|接口无可调参数|思考参数官方依据/);
  assert.deepEqual(changes,[]);assert.deepEqual(draft,before);
  cleanup();
 }
});

test('ordinary connection preset retains full review but avoids a duplicate visual model',()=>{
 const configured=structuredClone(models);configured.registry.providers.tokendance.defaults={main:'qwen-fixture',image:'draw-fixture',vision:'qwen-fixture'};
 const draft=currentDraft(newWorkspace('preset'));let changed;
 render(React.createElement(WorkspaceModelConfig,{draft,path:'png',models:configured,onChange:value=>changed=value}));
 changeControl(screen.getByRole('combobox',{name:'普通预设'}),{target:{value:'one'}});
 fireEvent.click(screen.getByRole('button',{name:'应用此连接的默认组合'}));
 assert.equal(changed.models.main.modelId,'qwen-fixture');assert.equal(changed.models.image.modelId,'draw-fixture');assert.equal(changed.models.vision,undefined);assert.equal(changed.reviews,1);
});
