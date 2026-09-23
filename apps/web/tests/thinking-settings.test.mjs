import assert from 'node:assert/strict'
import {afterEach, test} from 'node:test'
import React, {useState} from 'react'
import {cleanup, fireEvent, render, screen, within} from '@testing-library/react'
import ThinkingSettings from '../src/components/ThinkingSettings.jsx'
import ModelRoutingSettings from '../src/components/ModelRoutingSettings.jsx'
import {compileThinkingSelection} from '../src/lib/thinking.js'
import {formatErrorMessage} from '../src/utils.js'
import {thinkingIdentities, reconcileThinkingSettings, rememberThinkingSettings, buildThinkingSubmission, saveThinkingSettings, readThinkingSettings} from '../src/lib/thinkingSettings.js'
import {createJobRequest, refineImageRequest} from '../../../packages/api/src/jobs.js'

const identity = {
  main: {provider:'anthropic',modelId:'claude-sonnet-4-6',protocol:'anthropic-messages'},
  vision: {provider:'gemini',modelId:'gemini-3.8-flash',protocol:'gemini-generate-content'},
  image: {provider:'fal',modelId:'fal-ai/nano-banana-2',protocol:'provider-images'},
}
const fresh=()=>reconcileThinkingSettings(null, identity)
afterEach(()=>{cleanup();window.localStorage.clear()})
function Harness({initial=fresh(),available=true,operation='generation'}) {
  const [settings,setSettings]=useState(initial)
  return React.createElement(React.Fragment,null,...['main','image','vision'].map(role=>React.createElement(ThinkingSettings,{key:role,role,settings,registry:{thinkingContractVersion:available?1:0},operation,
    onChange:(role,selection)=>setSettings(current=>({...current,roles:{...current.roles,[role]:selection}}))})))
}
test('all three role controls retain provider default and update independently',()=>{
  render(React.createElement(Harness))
  const main=screen.getByLabelText('主模型 / 规划思考强度'), vision=screen.getByLabelText('视觉识别思考强度'), image=screen.getByLabelText('图像生成 / 编辑思考强度')
  assert.equal(main.value,'');assert.equal(vision.value,'');assert.equal(image.value,'')
  fireEvent.change(main,{target:{value:'"low"'}})
  fireEvent.change(vision,{target:{value:'"high"'}})
  fireEvent.change(image,{target:{value:'"minimal"'}})
  assert.equal(main.value,'"low"');assert.equal(vision.value,'"high"');assert.equal(image.value,'"minimal"')
  fireEvent.change(main,{target:{value:''}})
  assert.equal(main.value,'');assert.equal(vision.value,'"high"')
})
test('default omits explicit options at the request boundary and legacy default wording is normalized',()=>{
  const settings=fresh()
  render(React.createElement(Harness,{initial:settings}))
  for(const select of screen.getAllByRole('combobox')) assert.equal(select.options[0].textContent,'默认')
  assert.equal(screen.queryByText('服务商默认'),null)
  for(const role of ['main','vision','image']) assert.deepEqual(compileThinkingSelection(settings.roles[role],role).wire,{})
  assert.equal(formatErrorMessage(new Error('精修请使用服务商默认。')),'精修请使用默认。')
})
test('mode-only and budget-only models expose their actual controls; unknown identities render nothing',()=>{
  const value=fresh()
  value.roles.main={provider:'kimi',modelId:'kimi-k2.6',protocol:'openai-chat-completions',options:{}}
  value.roles.vision={provider:'gemini',modelId:'gemini-2.5-flash',protocol:'gemini-generate-content',options:{}}
  value.roles.image={provider:'openai',modelId:'unconfirmed-image',protocol:'openai-images',options:{}}
  render(React.createElement(Harness,{initial:value}))
  assert.equal(screen.queryByLabelText('主模型 / 规划思考强度'),null)
  const mode=screen.getByRole('combobox')
  assert.deepEqual([...mode.options].map(x=>[x.textContent,x.value]),[['默认',''],['开启','"enabled"'],['关闭','"disabled"']])
  const budget=screen.getByRole('spinbutton',{name:'视觉识别思考预算（tokens）'})
  assert.equal(budget.placeholder,'默认');assert.equal(budget.min,'-1');assert.equal(budget.max,'24576')
  fireEvent.change(budget,{target:{value:'-1'}});assert.equal(budget.value,'-1')
  fireEvent.change(budget,{target:{value:''}});assert.equal(budget.value,'')
  assert.equal(screen.queryByRole('region',{name:'图像生成 / 编辑思考设置'}),null)
})
test('simple and advanced settings place each supported control immediately after its own model',()=>{
  const settings=fresh(), modelRoutes=Object.fromEntries(Object.entries(identity).map(([role,selection])=>[role,{accessProvider:selection.provider,modelId:selection.modelId}]))
  const registry={routeContractVersion:1,thinkingContractVersion:1,providers:Object.fromEntries(Object.entries(identity).map(([role,selection])=>[selection.provider,{defaults:{[role]:selection.modelId},models:[{id:selection.modelId,label:selection.modelId,roles:[role],selectable:true}]}]))}
  for(const configurationMode of ['simple','advanced']) {
    const {container}=render(React.createElement(ModelRoutingSettings,{configurationMode,modelRoutes,modelRegistry:registry,providerConfigs:{},credentialProviders:[],apiKeys:{},arkProbes:[],arkVerification:{},
      renderThinkingSettings:role=>React.createElement(ThinkingSettings,{role,settings,registry,operation:'generation',onChange(){}})}))
    assert.deepEqual([...container.querySelectorAll('[data-model-role]')].map(x=>x.dataset.modelRole),['main','image','vision'])
    for(const role of ['main','image','vision']) {
      const section=container.querySelector(`[data-model-role="${role}"]`)
      assert.equal(section.lastElementChild.dataset.thinkingRole,role)
      assert.equal(section.children.length,2)
    }
    cleanup()
  }
})
test('budget requirements and adaptive conflict remain visible, and submission refuses them',()=>{
  render(React.createElement(Harness))
  fireEvent.change(screen.getByLabelText('主模型 / 规划思考模式'),{target:{value:'"enabled"'}})
  assert.match(screen.getByRole('alert').textContent,/预算/)
  fireEvent.change(screen.getByLabelText('主模型 / 规划思考预算（tokens）'),{target:{value:'1024'}})
  assert.equal(screen.queryByRole('alert'),null)
  fireEvent.change(screen.getByLabelText('主模型 / 规划思考模式'),{target:{value:'"adaptive"'}})
  assert.match(screen.getByRole('alert').textContent,/自适应/)
  const value=fresh();value.roles.main.options={mode:'adaptive',budget:1024}
  assert.throws(()=>buildThinkingSubmission(value,{thinkingContractVersion:1},['main'],'generation'),/自适应/)
})
test('persist independently; provider/model/protocol/region switches drop stale parameters without selecting maximum',()=>{
  const old=fresh();old.roles.main.options={effort:'low'};old.roles.vision.options={effort:'high'}
  saveThinkingSettings(old,window.localStorage)
  assert.deepEqual(readThinkingSettings(window.localStorage),old)
  for(const patch of [{provider:'openrouter'},{modelId:'claude-opus-4-6'},{protocol:'openai-chat-completions'},{region:'cn'}]) {
    const next=reconcileThinkingSettings(old,{...identity,main:{...identity.main,...patch}})
    assert.deepEqual(next.roles.main.options,{})
    assert.deepEqual(next.roles.vision.options,{effort:'high'})
  }
  assert.deepEqual(reconcileThinkingSettings({version:0},identity),fresh())
  window.localStorage.setItem('tuyan.thinking.v1','{bad');assert.equal(readThinkingSettings(window.localStorage),null)
})
test('unsupported image, wrong operation and older backend are honest and fail closed',()=>{
  const value=fresh();value.roles.image={provider:'replicate',modelId:'wan-video/wan-2.7-image',protocol:'provider-images',options:{mode:true}}
  render(React.createElement(Harness,{initial:value,operation:'editing'}))
  assert.equal(screen.queryByLabelText('图像生成 / 编辑思考开关'),null)
  assert.equal(screen.queryByRole('region',{name:'图像生成 / 编辑思考设置'}),null)
  assert.equal(screen.queryByText(/仅纯文生图支持|暂不支持|尚未核实/),null)
  assert.throws(()=>buildThinkingSubmission(value,{thinkingContractVersion:1},['image'],'editing'),/精修/)
  assert.throws(()=>buildThinkingSubmission(value,{},['image'],'generation'),/后端/)
  assert.deepEqual(buildThinkingSubmission(fresh(),{},['main'],'generation'),{})
  cleanup();render(React.createElement(Harness,{available:false}))
  assert.equal(screen.queryByRole('combobox'),null)
  assert.equal(screen.queryByRole('spinbutton'),null)
})
test('same OpenRouter ID is resolved by role protocol, not the chat thinking options',()=>{
  const routes=Object.fromEntries(['main','vision','image'].map(role=>[role,{accessProvider:'openrouter',modelId:'google/gemini-3.1-flash-image-preview'}]))
  const ids=thinkingIdentities(routes,{},{});assert.equal(ids.main.protocol,'openrouter-chat-completions');assert.equal(ids.image.protocol,'openrouter-images')
})
test('saved exact identities survive initial catalog loading and switching back without carrying to a new model',()=>{
  const configured=fresh();configured.roles.main.options={effort:'low'}
  const otherIdentity={...identity,main:{...identity.main,modelId:'claude-opus-4-6'}}
  const other=rememberThinkingSettings(reconcileThinkingSettings(configured,otherIdentity),configured)
  assert.deepEqual(other.roles.main.options,{})
  saveThinkingSettings(other,window.localStorage)
  assert.deepEqual(reconcileThinkingSettings(readThinkingSettings(window.localStorage),identity).roles.main.options,{effort:'low'})
  assert.equal('savedSelections' in buildThinkingSubmission(other,{thinkingContractVersion:1},['main'],'generation').thinkingConfig,false)
})
test('client job helpers transmit optional settings for create and refine without adding fields to legacy calls',async()=>{
  const calls=[],fetcher=globalThis.fetch
  globalThis.fetch=async(_url,init)=>{calls.push(JSON.parse(init.body));return Response.json({code:0,jobId:'fixture',status:'queued'})}
  try {
    const config=buildThinkingSubmission(fresh(),{thinkingContractVersion:1},['main','vision','image'],'generation')
    for(const fn of [createJobRequest,refineImageRequest]) {
      await fn('http://localhost/mock',{backendMode:'laf'},{provider:'fal',apiKeys:{fal:'fixture'},...config})
      assert.deepEqual(calls.at(-1).thinkingConfig,config.thinkingConfig)
      await fn('http://localhost/mock',{backendMode:'laf'},{provider:'fal'})
      assert.equal('thinkingConfig' in calls.at(-1),false)
    }
  } finally {globalThis.fetch=fetcher}
})

test('September 23 exact models expose only native options and changing identities preserves independent role choices',()=>{
  const ids={main:{provider:'openai',modelId:'gpt-6-sol',protocol:'openai-responses'},vision:{provider:'anthropic',modelId:'claude-opus-5-5',protocol:'anthropic-messages'},image:{provider:'openai',modelId:'gpt-image-2',protocol:'openai-images'}}
  const settings=reconcileThinkingSettings(null,ids)
  render(React.createElement(Harness,{initial:settings}))
  const values=label=>Array.from(screen.getByLabelText(label).options).map(option=>option.value)
  assert.deepEqual(values('主模型 / 规划思考强度'),['','"none"','"low"','"medium"','"high"','"xhigh"','"max"'])
  assert.deepEqual(values('主模型 / 规划思考模式'),['','"standard"','"pro"'])
  assert.deepEqual(values('视觉识别思考强度'),['','"low"','"medium"','"high"','"xhigh"','"max"'])
  assert.equal(screen.queryByLabelText('视觉识别思考模式'),null)
  assert.equal(screen.queryByLabelText('图像生成 / 编辑思考强度'),null)
  for(const c of screen.getAllByRole('combobox'))assert.equal(c.value,'')
  settings.roles.main.options={effort:'low',mode:'pro'};settings.roles.vision.options={effort:'high'}
  const changed=rememberThinkingSettings(reconcileThinkingSettings(settings,{...ids,main:{...ids.main,modelId:'gpt-6-luna'}}),settings)
  assert.deepEqual(changed.roles.main.options,{})
  assert.deepEqual(changed.roles.vision.options,{effort:'high'})
  const back=reconcileThinkingSettings(changed,ids)
  assert.deepEqual(back.roles.main.options,{effort:'low',mode:'pro'})
  assert.deepEqual(compileThinkingSelection(changed.roles.main,'main').wire,{})
})
