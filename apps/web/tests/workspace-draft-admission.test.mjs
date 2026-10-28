import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import useWorkspaceExecution from '../src/workspace/useWorkspaceExecution.js';
import { newWorkspace, workspaceReducer, currentTask, currentDraft, isFormalTask } from '../src/workspace/workspaceState.js';

afterEach(cleanup);
const healthy = {code:0,ok:true,runtime:'gateway',simulation:true,workspaceExecutionContractVersion:1};
const ref = (role, id) => ({libraryModelId:role,connectionId:'c',accessProvider:'openai',modelId:id});
const models = {registryStatus:'ready',summary:{},registry:{routeContractVersion:1,providers:{openai:{models:[{id:'text',roles:['main','vision'],capabilities:{referenceImages:true},selectable:true},{id:'image',roles:['image'],capabilities:{outputFormats:['png'],imageEditing:true},selectable:true}]}}},library:{revision:1,connections:[{id:'c',provider:'openai',scope:'account',hasCredential:true}],models:[{id:'main',connectionId:'c',modelId:'text'},{id:'image',connectionId:'c',modelId:'image'}]}};
function input(ensureSynced = async () => {}) {
  const stateRef = {current:newWorkspace('draft')}, d = currentDraft(stateRef.current);
  stateRef.current = workspaceReducer(stateRef.current, {type:'EDIT_DRAFT',patch:{text:'合成研究流程',settings:{...d.settings,simple:{...d.settings.simple,figureTypeId:'method_framework',models:{main:ref('main','text'),image:ref('image','image')}}}}});
  return {stateRef,dispatch:action => {stateRef.current=workspaceReducer(stateRef.current,action);},sync:{ensureSynced},models,userId:'isolated-test',base:'https://draft-fixture.invalid'};
}

for (const failure of ['local-validation','sync','server-rejection']) test(`${failure} leaves an editable draft and never promotes an unaccepted request`, async t => {
  const options = input(async () => {if(failure === 'sync')throw Error('同步未完成');});
  if(failure === 'local-validation') currentDraft(options.stateRef.current).text = '';
  const actions = [];
  t.mock.method(globalThis,'fetch',async (_url, request) => {
    if(!request?.body)return Response.json(healthy);
    const body=JSON.parse(request.body);actions.push(body.action);
    assert.equal(body.action,'createJob');
    return Response.json({code:400,error:'校验未通过',requestState:'not_sent'},{status:400});
  });
  const {result}=renderHook(() => useWorkspaceExecution(options));
  await waitFor(() => assert.equal(result.current.health?.simulation,true));
  await act(() => result.current.submit());
  assert.equal(isFormalTask(currentTask(options.stateRef.current)),false);
  assert.equal(currentTask(options.stateRef.current).activeRunId,null);
  assert.equal(currentDraft(options.stateRef.current).text,failure==='local-validation'?'':'合成研究流程');
  assert.deepEqual(actions,failure==='server-rejection'?['createJob']:[], result.current.error);
  assert.equal(workspaceReducer(options.stateRef.current,{type:'CREATE_TASK'}).selectedTaskId,'draft');
});

test('actual submit hook waits for the server receipt, accepts queued jobs and keeps later failures for retry', async t => {
  const options=input(),calls=[];
  let receipt, status='queued';
  t.mock.method(globalThis,'fetch',async (_url,request) => {
    if(!request?.body)return Response.json(healthy);
    const body=JSON.parse(request.body);calls.push(body.action);
    if(body.action==='createJob')return new Promise(resolve => {receipt=()=>resolve(Response.json({jobId:'queued-job',status:'queued'}));});
    assert.equal(body.action,'getJob');
    return Response.json({job:{id:'queued-job',status,error:status==='failed'?'合成生成失败':'',result_images:[]}});
  });
  const {result}=renderHook(() => useWorkspaceExecution(options));
  await waitFor(() => assert.equal(result.current.health?.simulation,true));
  let submitting;act(() => {submitting=result.current.submit();});
  await waitFor(() => assert.ok(receipt, result.current.error));
  assert.equal(isFormalTask(currentTask(options.stateRef.current)),false);
  assert.equal(currentDraft(options.stateRef.current).text,'合成研究流程');
  await act(async () => {receipt();await submitting;});
  await waitFor(() => assert.ok(calls.includes('getJob')));
  assert.equal(isFormalTask(currentTask(options.stateRef.current)),true);
  assert.equal(currentTask(options.stateRef.current).runs[0].accepted,true);
  status='failed';await act(() => result.current.refresh());
  assert.equal(currentTask(options.stateRef.current).runs[0].status,'failed');
  assert.equal(isFormalTask(currentTask(options.stateRef.current)),true);
  assert.equal(currentDraft(options.stateRef.current).text,'合成研究流程');
  assert.equal(calls.filter(action => action==='createJob').length,1);
});

test('reopening after a lost receipt recovers server admission without sending another generation', async t => {
  const options=input(),calls=[];
  options.dispatch({type:'BEGIN',runId:'pending-run',execution:{version:1,simulation:true}});
  assert.equal(isFormalTask(currentTask(options.stateRef.current)),false);
  t.mock.method(globalThis,'fetch',async (_url,request) => {
    if(!request?.body)return Response.json(healthy);
    const body=JSON.parse(request.body);calls.push(body.action);
    if(body.action==='workspaceExecutionStatus')return Response.json({execution:{jobId:'accepted-before-reload',status:'queued'}});
    assert.equal(body.action,'getJob');
    return Response.json({job:{id:'accepted-before-reload',status:'failed',error:'已接收后失败',result_images:[]}});
  });
  renderHook(() => useWorkspaceExecution(options));
  await waitFor(() => assert.equal(currentTask(options.stateRef.current).runs[0].status,'failed'));
  assert.equal(isFormalTask(currentTask(options.stateRef.current)),true);
  assert.equal(currentDraft(options.stateRef.current).text,'合成研究流程');
  assert.deepEqual(calls,['workspaceExecutionStatus','getJob']);
});
