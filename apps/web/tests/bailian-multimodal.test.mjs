import { menuOptions, changeControl } from './menu-helpers.mjs';
import test,{afterEach} from 'node:test';
import assert from 'node:assert/strict';
import React,{useState} from 'react';
import {render,screen,cleanup,fireEvent} from '@testing-library/react';
import {STATIC_MODEL_REGISTRY} from '../src/lib/staticModelCatalog.js';
import {ModelSpecifications} from '../src/components/ModelSpecifications.jsx';
import {modelCardSpecifications} from '../src/lib/modelCardSpecifications.js';
import ThinkingSettings from '../src/components/ThinkingSettings.jsx';
import {reconcileThinkingSettings,buildThinkingSubmission} from '../src/lib/thinkingSettings.js';
import {modelOption} from '../src/workspace/workspaceModels.js';
import {buildModelSubmission} from '../src/lib/modelRouting.js';
const ids=['deepseek-v4.1-flash-1017','MiniMax/MiniMax-M3.1-Flash','xiaomi/mimo-v2.6-pro-ultraspeed'];
afterEach(cleanup);
test('cards show only three official fields while detailed evidence and adapter limits remain recorded',()=>{
 for(const id of ids){
  const model=STATIC_MODEL_REGISTRY.bailian.models.find(m=>m.id===id),before=structuredClone(model);
  const data=modelCardSpecifications('bailian',model);assert.equal(data.inputScope,'渠道');assert.equal(data.checkedAt,'2026-10-26');assert.match(data.productInput,/图像/);
  const {container}=render(React.createElement(ModelSpecifications,{provider:'bailian',model}));
  assert.deepEqual([...container.querySelectorAll('dt')].map(node=>node.textContent),['输入','输出','上下文窗口']);
  assert.ok(screen.getByText(data.context));assert.ok(screen.getAllByRole('link').length);
  assert.doesNotMatch(container.textContent,/图研可用|提交额度|公开价格|真实调用|最大输入|最大输出|资料核查日期/);
  assert.equal(screen.getByRole('group',{name:'输入模态'}).title,`${data.input} · 渠道`);
  if(id===ids[0]){assert.equal(model.specifications.maxOutputTokens,393216);assert.match(data.context,/≈/)}
  if(id===ids[1])assert.ok(data.serviceDetails.some(row=>/未单列最大输入、最大输出/.test(row.value)));
  if(id===ids[2]){assert.equal(model.specifications.maxOutputTokens,131072);assert.match(data.input,/音频/);assert.doesNotMatch(data.productInput,/音频|视频/)}
  assert.deepEqual(model,before);cleanup();
 }
});
test('old workspace backend cannot accept new visual selections; v2 allows both roles with the same configured connection',()=>{
 const bailian={workspaceId:'fixture',region:'cn-beijing'},c={id:'c',provider:'bailian',hasCredential:true,bailian};
 const registry={providers:STATIC_MODEL_REGISTRY,bailianWorkspaceContractVersion:2,routeContractVersion:1};
 for(const modelId of ids){const e={id:'m',connectionId:'c',modelId},library={connections:[c],models:[e]},route={accessProvider:'bailian',modelId,bailian};
  for(const role of ['main','vision']){assert.equal(modelOption(e,library,registry,role,'svg',false).reason,'');assert.match(modelOption(e,library,{...registry,bailianWorkspaceContractVersion:1},role,'svg',false).reason,/后端/)}
  assert.throws(()=>buildModelSubmission({configurationMode:'advanced',registry:{...registry,bailianWorkspaceContractVersion:1},modelRoutes:{main:route},requiredRoles:['main']}),/后端/);
  assert.deepEqual(buildModelSubmission({configurationMode:'advanced',registry,modelRoutes:{main:route,vision:route},requiredRoles:['main','vision']}).modelRoutes,{main:route,vision:route});
 }
});
function Harness({role,capture}){const identities=Object.fromEntries(['main','vision','image'].map(r=>[r,{provider:'bailian',modelId:r==='image'?'':ids[1],protocol:'bailian-openai-chat'}]));const [settings,setSettings]=useState(()=>reconcileThinkingSettings(null,identities));capture(settings);return React.createElement(ThinkingSettings,{role,settings,registry:{thinkingContractVersion:1},operation:'generation',onChange:(r,v)=>setSettings(s=>({...s,roles:{...s.roles,[r]:v}}))})}
test('MiniMax UI offers five efforts and provider default, persists role selection without a disable switch',()=>{
 for(const role of ['main','vision']){let settings;render(React.createElement(Harness,{role,capture:v=>settings=v}));const select=screen.getByRole('combobox');assert.equal(select.value,'');assert.deepEqual([...menuOptions(select)].map(o=>o.value),['','"low"','"medium"','"high"','"xhigh"','"max"']);
  assert.doesNotMatch(select.textContent,/关闭/);changeControl(select,{target:{value:'"xhigh"'}});assert.deepEqual(buildThinkingSubmission(settings,{thinkingContractVersion:1},[role],'generation').thinkingConfig.roles[role].options,{effort:'xhigh'});cleanup();
 }
});
