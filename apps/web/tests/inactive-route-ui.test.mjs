import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App.jsx';
test('SVG submission excludes an unfinished custom image route while retaining the local draft',async()=>{
 const original=globalThis.fetch,requests=[],user=userEvent.setup();
 window.localStorage.setItem('tuyan.model-routing.v1',JSON.stringify({version:1,mode:'advanced',roles:{main:{accessProvider:'openai',modelId:'gpt-5.6-sol'},image:{accessProvider:'custom',modelId:'saved-image-draft'},vision:{accessProvider:'openai',modelId:'gpt-4.1'}}}));
 window.localStorage.setItem('tuyan.workflow-settings.v1',JSON.stringify({version:2,pipelineMode:'planner_critic',numCandidates:1,maxCriticRounds:1,visionMode:'none'}));
 const registry={figureTaxonomyVersion:'2026-10-10.v1',figureExecutionVersion:1,materialWorkflowVersion:1,materialFileVersion:2,workflowContractVersion:2,routeContractVersion:1,universalApiContractVersion:1,providers:{openai:{defaults:{main:'gpt-5.6-sol',image:'gpt-image-2',vision:'gpt-4.1'},models:[{id:'gpt-5.6-sol',roles:['main','vision'],label:'Main',selectable:true,capabilities:{referenceImages:true}},{id:'gpt-image-2',label:'Image',roles:['image'],selectable:true,capabilities:{outputFormats:['png'],aspectRatios:['1:1'],resolutions:['1K']}}]}}};
 globalThis.fetch=async(_url,init={})=>{const b=init.body?JSON.parse(init.body):null;if(b)requests.push(b);return Response.json(!b?{code:0,runtime:'gateway'}:b.action==='modelRegistry'?{code:0,...registry}:b.action==='referenceLibrary'?{code:0,references:[]}:b.action==='createJob'?{code:0,jobId:'svg-fixture',status:'queued'}:{code:0,jobs:[]})};
 try{
  render(React.createElement(App));await waitFor(()=>assert.ok(requests.some(b=>b.action==='modelRegistry')));
  await user.click(screen.getByRole('button',{name:'打开完整设置'}));
  fireEvent.change(screen.getByLabelText('导出格式'),{target:{value:'svg'}});
  await waitFor(()=>assert.equal(document.querySelector('[data-model-role="image"]'),null));
  await user.type(screen.getByLabelText('OpenAI 接入密钥'),'fixture-only');
  await user.click(screen.getByRole('button',{name:'关闭生成设置'}));
  await user.click(screen.getAllByRole('button',{name:'生成候选图'}).find(b=>b.type==='submit'));
  await waitFor(()=>assert.ok(requests.some(b=>b.action==='createJob')));
  const sent=requests.find(b=>b.action==='createJob');
  assert.equal(sent.outputFormat,'svg');assert.equal(sent.pipelineMode,'planner_critic');assert.equal(sent.modelRoutes.image,undefined);assert.equal(sent.modelRoutes.vision,undefined);assert.deepEqual(Object.keys(sent.apiKeys),['openai']);
  assert.equal(JSON.parse(window.localStorage.getItem('tuyan.model-routing.v1')).roles.image.accessProvider,'custom');
  await user.click(screen.getByRole('button',{name:'打开完整设置'}));
  fireEvent.change(screen.getByLabelText('导出格式'),{target:{value:'png'}});
  await waitFor(()=>assert.ok(document.querySelector('[data-model-role="image"]')));
  assert.equal(JSON.parse(window.localStorage.getItem('tuyan.model-routing.v1')).roles.image.accessProvider,'custom');
 }finally{cleanup();window.localStorage.clear();globalThis.fetch=original;}
});
