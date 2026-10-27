import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {render,screen,cleanup,fireEvent,waitFor} from '@testing-library/react';
import {WorkspaceModelManager} from '../src/workspace/WorkspaceModelPanels.jsx';
import {modelOption,browserCredentialKey,workspaceModelRoute} from '../src/workspace/workspaceModels.js';
import {buildModelSubmission} from '../src/lib/modelRouting.js';
import {buildWorkspaceRequest} from '../src/workspace/workspaceExecution.js';
import {newWorkspace,workspaceReducer,currentDraft} from '../src/workspace/workspaceState.js';
const modelId='deepseek-v4.1-flash-1017',bailian={workspaceId:'fixture-workspace',region:'cn-beijing'};
const connection={id:'c',provider:'bailian',label:'百炼连接',scope:'browser',region:'global',hasCredential:true,bailian};
const entry={id:'m',connectionId:'c',modelId};
const registry={bailianWorkspaceContractVersion:2,routeContractVersion:1,providers:{bailian:{models:[{id:modelId,label:'DeepSeek 1017',selectable:true,roles:['main'],capabilities:{referenceImages:false}}]}}};
const library={revision:1,connections:[connection],models:[entry]};
test('new workspace routes require connection config and backend support, browser credentials remain isolated',()=>{
 const selected=workspaceModelRoute(connection,entry);assert.deepEqual(selected,{accessProvider:'bailian',modelId,bailian});
 assert.equal(modelOption(entry,library,registry,'main','svg',false).reason,'');
 assert.match(modelOption(entry,library,{...registry,bailianWorkspaceContractVersion:0},'main','svg',false).reason,/后端/);
 assert.match(modelOption(entry,{...library,connections:[{...connection,bailian:undefined}]},registry,'main','svg',false).reason,/业务空间/);
 const key=browserCredentialKey('local','A',connection);
 for(const config of [{...bailian,workspaceId:'other'},{...bailian,region:'us-east-1'}])assert.notEqual(key,browserCredentialKey('local','A',{...connection,bailian:config}));
 assert.equal(browserCredentialKey('local','A',{...connection,bailian:undefined}),'tuyan.workspace-connection.v1:local:A:c:bailian:global');
 assert.throws(()=>buildModelSubmission({configurationMode:'simple',modelRoutes:{main:selected},registry:{...registry,bailianWorkspaceContractVersion:0},requiredRoles:['main']}),/后端/);
});
test('workspace submission includes immutable endpoint configuration along with explicit role routes',()=>{
 let s=newWorkspace('task');s=workspaceReducer(s,{type:'SET_PATH',path:'svg'});let d=currentDraft(s);
 const vision={id:'v',connectionId:'v',modelId:'gpt-4.1'},visionConnection={id:'v',provider:'openai',hasCredential:true,scope:'account'};
 const models={registryStatus:'ready',summary:{},registry:{...registry,providers:{...registry.providers,openai:{models:[{id:'gpt-4.1',selectable:true,roles:['main','vision'],capabilities:{referenceImages:true}}]}}},library:{...library,connections:[connection,visionConnection],models:[entry,vision]}};
 const ref=(e,c)=>({libraryModelId:e.id,connectionId:c.id,accessProvider:c.provider,modelId:e.modelId});
 s=workspaceReducer(s,{type:'EDIT_DRAFT',patch:{text:'绘制研究流程',mode:'advanced',settings:{...d.settings,advanced:{...d.settings.advanced,figureTypeId:'workflow',models:{main:ref(entry,connection),vision:ref(vision,visionConnection)}}}}});
 s=workspaceReducer(s,{type:'BEGIN',runId:'r'});const task=s.tasks[0],run=task.runs[0];
 assert.deepEqual(buildWorkspaceRequest({task,run,models}).modelRoutes.main,workspaceModelRoute(connection,entry));
});
test('connection form saves workspace metadata only, and changing region requires a new explicit credential',async()=>{
 let saved;
 const models={library,registry,registryStatus:'ready',summary:{},ready:true,busy:false,userId:'A',refresh:()=>{},retry:()=>{},save:async(value,credential)=>{saved={value,credential};return true}};
 render(React.createElement(WorkspaceModelManager,{models}));
 try{
  fireEvent.click(screen.getByRole('button',{name:/渠道连接/}));fireEvent.click(screen.getByRole('button',{name:'配置',exact:true}));
  assert.equal(screen.getByLabelText('百炼业务空间 ID').value,bailian.workspaceId);
  fireEvent.change(screen.getByLabelText('百炼服务地区'),{target:{value:'us-east-1'}});
  fireEvent.click(screen.getByRole('button',{name:'保存连接'}));assert.match(screen.getByRole('alert').textContent,/重新输入/);assert.equal(saved,undefined);
  fireEvent.change(screen.getByLabelText(/API 密钥/),{target:{value:'fixture-new-key'}});
  fireEvent.click(screen.getByRole('button',{name:'保存连接'}));await waitFor(()=>assert.ok(saved));
  assert.deepEqual(saved.value.connections[0].bailian,{...bailian,region:'us-east-1'});assert.doesNotMatch(JSON.stringify(saved.value),/fixture-new-key/);assert.equal(saved.credential.value,'fixture-new-key');
 }finally{cleanup()}
});
