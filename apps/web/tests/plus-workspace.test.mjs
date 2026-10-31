import test,{afterEach} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {cleanup,render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {newWorkspace,workspaceReducer,currentDraft} from '../src/workspace/workspaceState.js';
import {cleanWorkspace} from '../../../packages/api/src/workspace-sync.mjs';
import {buildWorkspaceRequest,startWorkspaceRun} from '../src/workspace/workspaceExecution.js';
import {submitPlusWorkspace} from '../src/plus/plusWorkspace.js';
import PlusTaskConfirm from '../src/plus/PlusTaskConfirm.jsx';
afterEach(cleanup);
function fixture(){let state=newWorkspace('plus-task');state=workspaceReducer(state,{type:'SET_PATH',path:'svg'});const draft=currentDraft(state);state=workspaceReducer(state,{type:'EDIT_DRAFT',patch:{text:'绘制本地测试科研流程',settings:{...draft.settings,simple:{...draft.settings.simple,plusMode:'balanced',figureTypeId:'method_framework'}}}});state=workspaceReducer(state,{type:'BEGIN',runId:'plus-run',execution:{version:1,simulation:true,billing:'plus'}});const task=state.tasks[0],run=task.runs[0];return {state,task,run};}
test('Plus workbench builds fixed-path input without personal credentials and survives account sync',async()=>{
 const {state,task,run}=fixture();assert.throws(()=>buildWorkspaceRequest({task,run,models:{}}),/尚未开放/);
 const body=buildWorkspaceRequest({task,run,models:{},plus:true});assert.equal(body.pipelineMode,'full');assert.equal(body.visionMode,'assist');assert.equal(body.modelRoutes,undefined);
 const clean=cleanWorkspace(state);assert.equal(clean.tasks[0].runs[0].execution.billing,'plus');assert.equal(clean.tasks[0].runs[0].input.settings.simple.plusMode,'balanced');
 let prepared;await startWorkspaceRun({base:'',userId:'local-user',task,run,models:{},simulation:false,request:body,dispatchPrepared:async value=>{prepared=value;return {id:'local-only'};}});assert.equal(prepared.apiKeys,undefined);assert.deepEqual(prepared.materialFiles,[]);
});
test('cancel and validation failures occur before submission; timeout never creates a second request',async()=>{
 const {task,run}=fixture(),prepared=buildWorkspaceRequest({task,run,models:{},plus:true}),calls=[];
 const request=async(path,body)=>{calls.push({path,body});if(path==='/quote')return {token:'signed-fixture',credits:120};throw Error('timeout');};
 await assert.rejects(submitPlusWorkspace({request,taskId:task.id,run,prepared,confirm:async()=>false}),e=>e.beforeDispatch===true);assert.equal(calls.filter(c=>c.path==='/jobs').length,0);
 await assert.rejects(submitPlusWorkspace({request,taskId:task.id,run,prepared,confirm:async()=>true}),/timeout/);assert.equal(calls.filter(c=>c.path==='/jobs').length,1);assert.equal(calls.at(-1).body.key,run.id);assert.equal(calls.at(-1).body.workspace.request.workspaceAccount,undefined);
});
test('credit dialog states the reservation and simulation boundary, with explicit confirmation',async()=>{
 let accepted=0,cancelled=0;render(React.createElement(PlusTaskConfirm,{value:{spec:{path:'svg',mode:'balanced',candidates:1,reviews:1},quote:{simulation:true,credits:120}},onConfirm:()=>accepted++,onCancel:()=>cancelled++}));
 assert.ok(screen.getByText('最多预留 120 积分'));assert.ok(screen.getByText(/不作为正式扣分标准/));await userEvent.click(screen.getByRole('button',{name:'确认模拟执行'}));assert.equal(accepted,1);await userEvent.click(screen.getByRole('button',{name:'取消'}));assert.equal(cancelled,1);
});

test('expired confirmation never submits; server rejection is closed only with atomic not-sent proof',async()=>{
 const {task,run}=fixture(),prepared=buildWorkspaceRequest({task,run,models:{},plus:true});let paths=[];
 await assert.rejects(submitPlusWorkspace({request:async path=>{paths.push(path);return {token:'expired',expiresAt:1}},taskId:task.id,run,prepared,confirm:async()=>true}),e=>e.beforeDispatch&&/过期/.test(e.message));assert.deepEqual(paths,['/quote']);
 for(const cancellationUnknown of [false,true]){paths=[];const request=async path=>{paths.push(path);if(path==='/quote')return {token:'fresh'};if(path.endsWith('/cancel')){if(cancellationUnknown)throw Error('timeout');return {status:'released',settlement:{kind:'not_sent'}};}throw Object.assign(Error('expired'),{code:'PLUS_QUOTE_EXPIRED'});};
 await assert.rejects(submitPlusWorkspace({request,taskId:task.id,run,prepared,confirm:async()=>true}),e=>Boolean(e.beforeDispatch)===!cancellationUnknown);assert.deepEqual(paths,['/quote','/jobs','/jobs/'+run.id+'/cancel']);}
});
