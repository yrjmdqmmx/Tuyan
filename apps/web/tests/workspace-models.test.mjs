import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {render,screen,cleanup,fireEvent} from '@testing-library/react';
import WorkspaceDrawingSettings from '../src/workspace/WorkspaceDrawingSettings.jsx';
import { defaultJournalSelection, JOURNALS } from '../../../packages/api/src/journal-rules.js';
import { WorkspaceModelConfig } from '../src/workspace/WorkspaceModelPanels.jsx';
import {modelOption,selectedModelReference,browserCredentialKey} from '../src/workspace/workspaceModels.js';
import {cleanWorkspace} from '../../../packages/api/src/workspace-sync.mjs';
import {newWorkspace,currentDraft,workspaceReducer} from '../src/workspace/workspaceState.js';
const registry={providers:{channel:{models:[{id:'text',label:'Text',roles:['main','vision'],inputModalities:['text','image'],selectable:true},{id:'image',label:'Image',roles:['image'],capabilities:{outputFormats:['png']},selectable:true},{id:'retired',roles:['main'],selectable:false,disabledReason:'Retired'}]}}};
const library={connections:[{id:'one',label:'Browser one',provider:'channel',scope:'browser',hasCredential:true},{id:'two',label:'Browser two',provider:'channel',scope:'browser',hasCredential:false}],models:[{id:'main',connectionId:'one',modelId:'text'},{id:'missing',connectionId:'two',modelId:'text'},{id:'draw',connectionId:'one',modelId:'image'},{id:'old',connectionId:'one',modelId:'retired'}]};
test('same-named routes keep connection identity; role/path/unavailable credentials never broaden selection',()=>{
 const a=modelOption(library.models[0],library,registry,'main','png',false);assert.equal(a.reason,'');assert.equal(selectedModelReference(a).connectionId,'one');
 assert.match(modelOption(library.models[1],library,registry,'main','png',false).reason,/缺少/);
 assert.ok(modelOption(library.models[2],library,registry,'main','png',false).reason);
 assert.ok(modelOption(library.models[2],library,registry,'image','svg',false).reason);
 assert.equal(modelOption(library.models[3],library,registry,'main','png',false).reason,'Retired');
});
test('task DTO stores only model references; snapshots survive changes without secrets',()=>{
 let s=newWorkspace('t'),d=currentDraft(s);const ref=selectedModelReference(modelOption(library.models[0],library,registry,'main','png',false));
 s=workspaceReducer(s,{type:'EDIT_DRAFT',patch:{text:'Requirements',settings:{...d.settings,simple:{...d.settings.simple,models:{main:{...ref,apiKey:'NEVER_SYNC'}},credentials:'NEVER_SYNC'}}}});
 const clean=cleanWorkspace(s);assert.equal(currentDraft(clean).settings.simple.models.main.connectionId,'one');assert.doesNotMatch(JSON.stringify(clean),/NEVER_SYNC|apiKey/);
 s=workspaceReducer(s,{type:'BEGIN',runId:'run'});d=currentDraft(s);s=workspaceReducer(s,{type:'EDIT_DRAFT',patch:{settings:{...d.settings,simple:{...d.settings.simple,models:{}}}}});assert.equal(s.tasks[0].runs[0].input.settings.simple.models.main.modelId,'text');
});
test('advanced roles show only added eligible models, preserve unavailable selection and omit SVG image role',()=>{
 const d=currentDraft(newWorkspace('t'));d.mode='advanced';d.settings.advanced.models={main:{libraryModelId:'missing',modelId:'text'}};
 const models={library,registry,summary:{},registryStatus:'ready'};
 render(React.createElement(WorkspaceModelConfig,{models,draft:d,path:'svg',onChange:()=>{},onManage:()=>{}}));
 assert.equal(screen.queryByRole('heading',{name:'绘图模型'}),null);assert.match(screen.getByRole('button',{name:'主模型',exact:true}).textContent,/Browser two/);assert.match(screen.getByRole('status').textContent,/当前浏览器缺少/);cleanup();
});

test('drawing preferences persist independently for modes and paths and freeze per execution',()=>{
 let s=newWorkspace('drawing');let d=currentDraft(s);
 const settings={...d.settings,advanced:{...d.settings.advanced,figureTypeId:'method-framework',journalSelection:defaultJournalSelection(JOURNALS[0].id),imageSize:'2K',retrievalSetting:'none',pipelineMode:'planner_critic'}};
 s=workspaceReducer(s,{type:'EDIT_DRAFT',patch:{text:'A drawing',mode:'advanced',settings}});
 const before=cleanWorkspace(s).tasks[0].branches.png.draft.settings.advanced;
 s=workspaceReducer(s,{type:'BEGIN',runId:'drawing-run'});
 s=workspaceReducer(s,{type:'EDIT_DRAFT',patch:{settings:{...settings,advanced:{...settings.advanced,imageSize:'1K',journalSelection:null}}}});
 const clean=cleanWorkspace(s);
 assert.equal(clean.tasks[0].runs[0].input.settings.advanced.imageSize,'2K');
 assert.deepEqual(clean.tasks[0].runs[0].input.settings.advanced.journalSelection,before.journalSelection);
 assert.equal(clean.tasks[0].branches.png.draft.settings.advanced.imageSize,'1K');
 assert.equal(clean.tasks[0].branches.png.draft.settings.simple.imageSize,undefined);
 assert.equal(clean.tasks[0].branches.svg.draft.settings.advanced.journalSelection,undefined);
});
test('refinement settings retain usable journal entry and hide generation-only controls',()=>{
 const draft=currentDraft(newWorkspace('settings'));draft.mode='advanced';
 render(React.createElement(WorkspaceDrawingSettings,{draft,path:'svg',editing:true,models:{registry},onChange:()=>{}}));
 assert.equal(screen.getByRole('button',{name:/不指定期刊/}).disabled,false);
 assert.equal(screen.queryByRole('combobox',{name:'清晰度'}),null);
 assert.equal(screen.queryByRole('combobox',{name:'候选数量'}),null);
 assert.equal(screen.queryByRole('combobox',{name:'图库检索'}),null);
 assert.ok(screen.getByRole('combobox',{name:'评审轮数'}));cleanup();
});

test('browser credential storage identity separates accounts, providers and regions',()=>{
 const c={id:'connection',provider:'minimax',region:'global'};
 const key=browserCredentialKey('local','A',c);
 assert.notEqual(key,browserCredentialKey('local','B',c));
 assert.notEqual(key,browserCredentialKey('local','A',{...c,region:'cn'}));
 assert.notEqual(key,browserCredentialKey('local','A',{...c,provider:'other'}));
});
test('custom form edits retain the universal draft shape, saves a confirmed route and remains eligible for task roles',async()=>{
 const {default:CustomModel}=await import('../src/workspace/WorkspaceCustomModel.jsx');
 const connection={id:'custom-test',provider:'custom',label:'Fixture',scope:'browser',hasCredential:true,custom:{version:1,connectionId:'custom-test',baseUrl:'https://fixture.example/v1',protocol:'openai-chat',auth:'bearer',catalogFormat:'none'}};
 let saved;const models={busy:false,library:{connections:[connection],models:[]},save:async value=>{saved=value;return true;}};
 render(React.createElement(CustomModel,{connection,role:'main',models}));
 try{
  fireEvent.change(screen.getByLabelText('精确模型 ID'),{target:{value:'fixture-v1'}});
  fireEvent.click(screen.getByLabelText('生成文字'));fireEvent.click(screen.getByLabelText('接收图片并理解内容'));
  fireEvent.click(screen.getByLabelText('我已核对能力与已知服务限制；未知字段按平台及我的限制执行'));
  fireEvent.click(screen.getByRole('button',{name:'校验配置并添加模型'}));
  await new Promise(r=>setTimeout(r,0));assert.equal(saved.models[0].modelId,'fixture-v1');
  assert.equal(modelOption(saved.models[0],saved,{},'main','svg',false).reason,'');
  assert.equal(modelOption(saved.models[0],saved,{},'vision','svg',false).reason,'');
  const changed={...saved,connections:[{...connection,custom:{...connection.custom,baseUrl:'https://other.example/v1'}}]};
  assert.match(modelOption(saved.models[0],changed,{},'main','svg',false).reason,/连接已改变/);
 }finally{cleanup();}
});
