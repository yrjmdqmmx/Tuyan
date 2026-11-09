import test from 'node:test';
import assert from 'node:assert/strict';
import {plusWorkspaceRequest,plusModelRequest} from '../../../packages/api/src/plus-request.mjs';
import {createPlusCoreExecutor} from '../src/plus-executor.js';
import {validatePlusPricing} from '../src/plus-pricing.js';
import {fixturePlusPricing as pricing,fixturePlusWorkspace} from '../../../test-support/plus-fixture.mjs';
const spec={path:'svg',mode:'extreme',kind:'generate',candidates:1,reviews:1},workspace=fixturePlusWorkspace();
test('managed request pins models and keeps browser controls outside billing authority',()=>{
 for(const key of ['provider','apiKeys','thinkingConfig','plusBilling'])assert.throws(()=>plusWorkspaceRequest({...workspace,request:{...workspace.request,[key]:'forged'}},spec));
 assert.throws(()=>plusWorkspaceRequest({...workspace,request:{action:'refineImage',outputFormat:'png',editInstruction:'x'.repeat(2001)}},{...spec,path:'png',kind:'edit'}),/PLUS_EDIT_INSTRUCTION_TOO_LONG/);
 const request=plusModelRequest(workspace,spec,{apiKey:'fixture-secret',operationKey:'fixture-run',budget:{maxCostMicros:400000}});
 assert.equal(request.mainModelName,'qwen3.8-max-0902');assert.equal(request.modelRoutes.vision.modelId,request.mainModelName);assert.equal(request.plusPreset.mode,'extreme');assert.equal(request.apiKeys.bailian,'fixture-secret');
 assert.equal(request.thinkingConfig.roles.main.options.budget,4096);assert.equal(request.pipelineMode,'full');
});
test('Core adapter requires owned active run and capability, and meters only its bound manifest',async()=>{
 const calls=[],backend={call:async body=>{calls.push(body);if(body.action==='health')return {status:200,data:{plusManagedContractVersion:1}};if(body.action==='createJob')return {status:200,data:{code:0,jobId:'core-fixture'}};return {status:200,data:{code:0,job:{id:'core-fixture',userId:'fixture-owner',status:'succeeded',resultImages:[{candidateId:2,mimeType:'image/svg+xml',filename:'fixture.svg',url:'https://example.invalid/fixture.svg',libraryId:'fixture-library'}],plusUsage:{version:1,complete:true,operationKey:'fixture-run',pricingVersion:pricing.version,calls:[{provider:'bailian',model:'qwen3.8-max-0902',workflowStepId:'step-1',requestId:'receipt-1',usage:{prompt_tokens:100,prompt_tokens_details:{cached_tokens:0},completion_tokens:200}}]}}}};}};
 const workspaceStore={get:async()=>({state:{tasks:[{id:'fixture-task',activeRunId:'fixture-run',runs:[{id:'fixture-run',status:'submitting'}]}]}})},executor=createPlusCoreExecutor({backend,workspaceStore,config:{modelExecutionEnabled:true,bailianApiKey:'fixture-secret'}});
 await executor.preflight({userId:'fixture-owner',workspace,pricing});await assert.rejects(executor.preflight({userId:'fixture-owner',workspace:{...workspace,runId:'other-run'},pricing}),/WORKSPACE_CHANGED/);
 const result=await executor.submit({userId:'fixture-owner',operationKey:'fixture-run',spec,workspace,credits:400,pricing});assert.equal(result.id,'core-fixture');assert.equal(calls[1].plusBilling.tariff.version,pricing.tariff.version);
 const measured=await executor.get({userId:'fixture-owner',id:result.id,spec,credits:400,pricing,operationKey:'fixture-run'});assert.equal(measured.actualCredits,1);assert.equal(measured.modelCostMicros,500);assert.equal(measured.status,'completed');assert.equal(measured.result_images[0].candidate_id,2);assert.equal(measured.result_images[0].mime_type,'image/svg+xml');assert.equal(measured.result_images[0].library_id,'fixture-library');
 assert.equal((await executor.get({userId:'fixture-owner',id:result.id,spec,credits:400,pricing,operationKey:'wrong'})).billing,'unknown');await assert.rejects(executor.get({userId:'different-user',id:result.id,spec,credits:400,pricing}),/PENDING/);
 assert.ok(validatePlusPricing(pricing));assert.throws(()=>validatePlusPricing({...pricing,creditCostMicros:Number.MAX_SAFE_INTEGER}));assert.throws(()=>validatePlusPricing({...pricing,transportLimits:{validated:false}}));
});
