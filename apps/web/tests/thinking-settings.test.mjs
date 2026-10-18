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
test('thinking preferences save quietly while failures retain the retry action',()=>{
  let retries=0
  const props={role:'main',settings:fresh(),registry:{thinkingContractVersion:1},operation:'generation',onChange(){},onRetrySave(){retries++}}
  const view=render(React.createElement(ThinkingSettings,{...props,saveState:'saved'}))
  assert.equal(screen.queryByRole('status'),null)
  assert.ok(screen.getByLabelText('主模型 / 规划思考强度'))
  view.rerender(React.createElement(ThinkingSettings,{...props,saveState:'error'}))
  assert.match(screen.getByRole('status').textContent,/保存失败/)
  fireEvent.click(screen.getByRole('button',{name:'重试保存思考偏好'}))
  assert.equal(retries,1)
})
test('effort defaults identify the exact profile value and omit explicit effort at submission',()=>{
  const settings=fresh()
  render(React.createElement(Harness,{initial:settings}))
  assert.equal(screen.getByLabelText('主模型 / 规划思考强度').options[0].textContent,'默认（高）')
  assert.equal(screen.getByLabelText('视觉识别思考强度').options[0].textContent,'默认（中）')
  assert.equal(screen.queryByText('服务商默认'),null)
  for(const role of ['main','vision','image']) assert.deepEqual(compileThinkingSelection(settings.roles[role],role).wire,{})
  assert.equal(formatErrorMessage(new Error('精修请使用服务商默认。')),'精修请使用默认。')
})
test('mode has only on and off; budget-only and unknown models expose no budget controls',()=>{
  const value=fresh()
  value.roles.main={provider:'kimi',modelId:'kimi-k2.6',protocol:'openai-chat-completions',options:{}}
  value.roles.vision={provider:'gemini',modelId:'gemini-2.5-flash',protocol:'gemini-generate-content',options:{}}
  value.roles.image={provider:'openai',modelId:'unconfirmed-image',protocol:'openai-images',options:{}}
  render(React.createElement(Harness,{initial:value}))
  assert.equal(screen.queryByLabelText('主模型 / 规划思考强度'),null)
  const mode=screen.getByRole('combobox')
  assert.deepEqual([...mode.options].map(x=>[x.textContent,x.value]),[['开启','"enabled"'],['关闭','"disabled"']])
  assert.equal(mode.value,'"enabled"')
  fireEvent.change(mode,{target:{value:'"disabled"'}})
  assert.equal(mode.value,'"disabled"')
  assert.equal(screen.queryByRole('spinbutton'),null)
  assert.equal(Boolean(screen.queryByRole('region',{name:'视觉识别思考设置'})),false)
  assert.equal(Boolean(screen.queryByRole('region',{name:'图像生成 / 编辑思考设置'})), false)
})
test('simple and advanced settings place each supported control immediately after its own model',()=>{
  const settings=fresh(), modelRoutes=Object.fromEntries(Object.entries(identity).map(([role,selection])=>[role,{accessProvider:selection.provider,modelId:selection.modelId}]))
  const registry={routeContractVersion:1,thinkingContractVersion:1,providers:Object.fromEntries(Object.entries(identity).map(([role,selection])=>[selection.provider,{defaults:{[role]:selection.modelId},models:[{id:selection.modelId,label:selection.modelId,roles:[role],selectable:true}]}]))}
  for(const configurationMode of ['simple','advanced']) {
    const {container}=render(React.createElement(ModelRoutingSettings,{configurationMode,executionRouteRoles:['main','image','vision'],outputFormat:'png',modelRoutes,modelRegistry:registry,providerConfigs:{},credentialProviders:[],apiKeys:{},arkProbes:[],arkVerification:{},
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
test('on maps to adaptive where supported and obsolete budgets cannot leak into requests',()=>{
  render(React.createElement(Harness))
  assert.deepEqual([...screen.getByLabelText('主模型 / 规划思考模式').options].map(x=>x.textContent),['开启','关闭'])
  fireEvent.change(screen.getByLabelText('主模型 / 规划思考模式'),{target:{value:'"adaptive"'}})
  assert.equal(screen.queryByRole('alert'),null)
  assert.equal(screen.queryByRole('spinbutton'),null)
  const value=fresh();value.roles.main.options={mode:'enabled',budget:8192}
  const selected=buildThinkingSubmission(value,{thinkingContractVersion:1},['main'],'generation').thinkingConfig.roles.main
  assert.deepEqual(selected.options,{mode:'adaptive'})
  assert.deepEqual(compileThinkingSelection(selected,'main').wire,{thinking:{type:'adaptive'}})
})
test('new Claude 5.5 profiles preserve the simplified switch without inventing a Sonnet Off mode',()=>{
  for(const [modelId,options,labels,defaultEffort] of [
    ['claude-sonnet-5-5',{mode:'between_tools'},['开启'],'默认（高）'],
    ['claude-haiku-5-5',{mode:'adaptive',effort:'high'},['开启','关闭'],'默认（中）'],
  ]) {
    const value=fresh();value.roles.main={provider:'anthropic',modelId,protocol:'anthropic-messages',options}
    render(React.createElement(Harness,{initial:value}))
    assert.deepEqual([...screen.getByLabelText('主模型 / 规划思考模式').options].map(x=>x.textContent),labels)
    assert.equal(screen.getByLabelText('主模型 / 规划思考强度').options[0].textContent,defaultEffort)
    assert.equal(screen.queryByRole('spinbutton'),null)
    const selected=buildThinkingSubmission(value,{thinkingContractVersion:1},['main'],'generation').thinkingConfig.roles.main
    assert.equal(compileThinkingSelection(selected,'main').wire.thinking.type,'adaptive')
    if(modelId==='claude-haiku-5-5') {
      value.roles.main.options={mode:'disabled',effort:'max',budget:8192}
      assert.throws(()=>buildThinkingSubmission(value,{thinkingContractVersion:1},['main'],'generation'),/仅支持 low、medium、high/)
      value.roles.main.options={mode:'disabled',budget:8192}
      const off=buildThinkingSubmission(value,{thinkingContractVersion:1},['main'],'generation').thinkingConfig.roles.main
      assert.deepEqual(off.options,{mode:'disabled'})
      assert.deepEqual(compileThinkingSelection(off,'main').wire,{thinking:{type:'disabled'}})
    }
    cleanup()
  }
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
test('Bailian on/off display and request agree, and off clears dependent effort',()=>{
  const value=fresh()
  value.roles.main={provider:'bailian',modelId:'qwen3.8-max-0902',protocol:'bailian-openai-chat',options:{budget:9000}}
  render(React.createElement(Harness,{initial:value}))
  const mode=screen.getByLabelText('主模型 / 规划思考模式'),effort=screen.getByLabelText('主模型 / 规划思考强度')
  assert.equal(mode.value,'true')
  assert.equal(effort.options[0].textContent,'默认（更高）')
  assert.equal(screen.queryByRole('spinbutton'),null)
  const submit=()=>buildThinkingSubmission(value,{thinkingContractVersion:1},['main'],'generation').thinkingConfig.roles.main
  assert.deepEqual(compileThinkingSelection(submit(),'main').wire,{enable_thinking:true})
  fireEvent.change(effort,{target:{value:'"low"'}})
  fireEvent.change(mode,{target:{value:'false'}})
  assert.equal(effort.disabled,true)
  assert.equal(effort.value,'')
  value.roles.main.options={mode:false,effort:'low',budget:9000}
  assert.deepEqual(compileThinkingSelection(submit(),'main').wire,{enable_thinking:false})
})
test('required manual budgets persist by identity and are sent unchanged; disabling omits them',()=>{
  const value=fresh()
  value.roles.main={provider:'anthropic',modelId:'claude-opus-4-5-20251101',protocol:'anthropic-messages',options:{mode:'enabled',budget:12000}}
  const remembered=rememberThinkingSettings(value,value)
  saveThinkingSettings(remembered,window.localStorage)
  const restored=readThinkingSettings(window.localStorage)
  assert.deepEqual(restored.roles.main.options,{mode:'enabled',budget:12000})
  for(const operation of ['generation','editing']) {
    const selected=buildThinkingSubmission(restored,{thinkingContractVersion:1},['main'],operation).thinkingConfig.roles.main
    assert.deepEqual(compileThinkingSelection(selected,'main').wire,{thinking:{type:'enabled',budget_tokens:12000}})
  }
  render(React.createElement(Harness,{initial:restored}))
  assert.equal(screen.queryByRole('alert'),null)
  const budget=screen.getByRole('spinbutton',{name:'主模型 / 规划思考预算（tokens）'})
  assert.equal(budget.value,'12000')
  assert.equal(budget.required,true)
  fireEvent.change(screen.getByLabelText('主模型 / 规划思考模式'),{target:{value:'"disabled"'}})
  assert.equal(screen.queryByRole('spinbutton'),null)
  value.roles.main.options={mode:'disabled',budget:12000}
  const selected=buildThinkingSubmission(value,{thinkingContractVersion:1},['main'],'generation').thinkingConfig.roles.main
  assert.deepEqual(compileThinkingSelection(selected,'main').wire,{thinking:{type:'disabled'}})
})
test('required budget begins empty, enforces bounds and uses the exact custom connection limit',()=>{
  const value=fresh()
  value.roles.main={provider:'anthropic',modelId:'claude-opus-4-5-20251101',protocol:'anthropic-messages',options:{mode:'enabled'}}
  render(React.createElement(Harness,{initial:value}))
  const budget=screen.getByRole('spinbutton',{name:'主模型 / 规划思考预算（tokens）'})
  assert.equal(budget.value,'')
  assert.equal(budget.placeholder,'必填')
  assert.match(screen.getByRole('alert').textContent,/需要同时填写思考预算/)
  assert.throws(()=>buildThinkingSubmission(value,{thinkingContractVersion:1},['main'],'generation'),/需要同时填写思考预算/)
  fireEvent.change(budget,{target:{value:'4096'}})
  assert.equal(screen.queryByRole('alert'),null)
  fireEvent.change(budget,{target:{value:''}})
  assert.match(screen.getByRole('alert').textContent,/需要同时填写思考预算/)
  for(const amount of [0,1023,16384,1024.5]) {
    value.roles.main.options.budget=amount
    assert.throws(()=>buildThinkingSubmission(value,{thinkingContractVersion:1},['main'],'generation'),/整数/)
  }
  for(const amount of [1024,16383]) {
    value.roles.main.options.budget=amount
    assert.equal(buildThinkingSubmission(value,{thinkingContractVersion:1},['main'],'generation').thinkingConfig.roles.main.options.budget,amount)
  }
  cleanup()
  value.roles.main={...value.roles.main,provider:'custom',connection:{baseUrl:'https://api.anthropic.com/v1',auth:'x-api-key',compatibility:'standard'},options:{mode:'enabled',budget:4095}}
  render(React.createElement(ThinkingSettings,{role:'main',settings:value,registry:{thinkingContractVersion:1,universalThinkingVersion:1},operation:'generation',onChange(){}}))
  assert.equal(screen.getByRole('spinbutton').max,'4095')
  assert.equal(buildThinkingSubmission(value,{thinkingContractVersion:1,universalThinkingVersion:1},['main'],'generation').thinkingConfig.roles.main.options.budget,4095)
  value.roles.main.options.budget=4096
  assert.throws(()=>buildThinkingSubmission(value,{thinkingContractVersion:1,universalThinkingVersion:1},['main'],'generation'),/整数/)
})
test('unknown mode defaults resolve explicitly to off and unknown effort defaults are labelled honestly',()=>{
  const value=fresh()
  value.roles.main={provider:'siliconflow',modelId:'Pro/deepseek-ai/DeepSeek-V3.2',protocol:'openai-chat-completions',options:{}}
  render(React.createElement(Harness,{initial:value}))
  const mode=screen.getByLabelText('主模型 / 规划思考模式')
  assert.equal(mode.value,'false')
  const selected=buildThinkingSubmission(value,{thinkingContractVersion:1},['main'],'generation').thinkingConfig.roles.main
  assert.equal(compileThinkingSelection(selected,'main').wire.enable_thinking,false)
  cleanup()
  value.roles.main={provider:'bailian',modelId:'glm-5.2',protocol:'bailian-openai-chat',options:{}}
  render(React.createElement(Harness,{initial:value}))
  assert.equal(screen.getByLabelText('主模型 / 规划思考强度').options[0].textContent,'默认（未确认）')
})
test('unsupported image, wrong operation and older backend are honest and fail closed',()=>{
  const value=fresh();value.roles.image={provider:'replicate',modelId:'wan-video/wan-2.7-image',protocol:'provider-images',options:{mode:true}}
  render(React.createElement(Harness,{initial:value,operation:'editing'}))
  assert.equal(screen.queryByLabelText('图像生成 / 编辑思考开关'),null)
  assert.match(screen.getByRole('region',{name:'图像生成 / 编辑思考设置'}).textContent,/当前编辑不支持已保存的思考参数/)
  assert.throws(()=>buildThinkingSubmission(value,{thinkingContractVersion:1},['image'],'editing'),/精修/)
  assert.throws(()=>buildThinkingSubmission(value,{},['image'],'generation'),/后端/)
  assert.deepEqual(buildThinkingSubmission(fresh(),{},['main'],'generation'),{})
  cleanup();render(React.createElement(Harness,{available:false}))
  assert.equal(screen.queryByRole('combobox'),null)
  assert.equal(screen.queryByRole('spinbutton'),null)
})
test('only verified adjustable contracts render a thinking section',()=>{
  for(const [provider,modelId,label,hasControl] of [
    ['siliconflow','Qwen/Qwen3-14B','可调',true],
    ['tokendance','kimi-k2.7-code','固定模式',false],
    ['tokendance','qwen3-30b-a3b-instruct-2507','接口无可调参数',false],
    ['tokendance','qwen3.8-flash','尚未核实',false],
  ]) {
    const settings={roles:{main:{provider,modelId,protocol:'openai-chat-completions',options:{}}}}
    render(React.createElement(ThinkingSettings,{role:'main',settings,registry:{thinkingContractVersion:1},onChange(){}}))
    if (label === '可调') {
      assert.ok(screen.getByText(`思考 · ${label}`))
      assert.match(screen.getByText(/思考参数官方依据/).textContent,/2026-10-17/)
    } else {
      assert.equal(Boolean(screen.queryByRole('region')), false)
      assert.equal(screen.queryByText(/思考参数官方依据/),null)
    }
    assert.equal(Boolean(screen.queryByRole('combobox')),hasControl)
    assert.equal(screen.queryByRole('alert'),null)
    assert.equal(screen.queryByRole('status'),null)
    cleanup()
  }
})
test('unsupported saved options can be cleared without changing the selected model',()=>{
  const value=fresh();value.roles.main={provider:'tokendance',modelId:'qwen3.8-flash',protocol:'openai-chat-completions',options:{effort:'high'}}
  render(React.createElement(Harness,{initial:value}))
  assert.ok(screen.getByRole('alert'))
  fireEvent.click(screen.getByRole('button',{name:'清除已保存的思考参数，使用渠道默认'}))
  assert.equal(screen.queryByRole('alert'),null)
  assert.equal(Boolean(screen.queryByRole('region',{name:'主模型 / 规划思考设置'})), false)
})
test('TokenDance unavailable contracts hide their whole explanation and evidence section',()=>{
  for(const [modelId,description] of [
    ['deepseek-v3.2','当前公开目录未收录此调用 ID，思考参数仍待渠道确认。'],
    ['hy3','渠道介绍提到了思考开关或档位，但没有完整的请求字段与取值说明。'],
    ['deepseek-v4-flash-0731','已找到此型号在其他接口的思考说明，当前接口的参数规则仍待确认。'],
  ]) {
    const settings={roles:{main:{provider:'tokendance',modelId,protocol:'openai-chat-completions',options:{}}}}
    render(React.createElement(ThinkingSettings,{role:'main',settings,registry:{thinkingContractVersion:1},onChange(){}}))
    assert.equal(Boolean(screen.queryByRole('region')), false)
    assert.equal(screen.queryByText(description),null)
    assert.equal(screen.queryByRole('combobox'),null)
    assert.equal(screen.queryByRole('link'),null)
    cleanup()
  }
})
test('native Xiaomi UltraSpeed control saves on/off without adding unsupported effort or budgets',()=>{
  const value=fresh();value.roles.main={provider:'xiaomi',modelId:'mimo-v2.6-pro-ultraspeed',protocol:'openai-chat-completions',options:{}}
  render(React.createElement(Harness,{initial:value}))
  const section=within(screen.getByRole('region',{name:'主模型 / 规划思考设置'}))
  assert.ok(section.getByText('思考 · 可调'))
  const mode=section.getByRole('combobox')
  assert.equal(mode.value,'"enabled"')
  fireEvent.change(mode,{target:{value:'"disabled"'}})
  assert.equal(mode.value,'"disabled"');assert.equal(section.queryByRole('spinbutton'),null)
  value.roles.main.options={mode:'disabled'}
  const submitted=buildThinkingSubmission(value,{thinkingContractVersion:1},['main'],'generation').thinkingConfig.roles.main
  assert.deepEqual(compileThinkingSelection(submitted,'main').wire,{thinking:{type:'disabled'}})
})
test('new image controls preserve implicit defaults and compile explicit choices for their own channel',()=>{
  for(const [provider,modelId,protocol,wire] of [
    ['bailian','qwen-image-3.0-pro','bailian-multimodal-generation',{parameters:{enable_thinking:false}}],
    ['runware','alibaba:qwen-image@2.1-pro','provider-images',{settings:{thinking:false}}],
  ]) {
    const value=fresh();value.roles.image={provider,modelId,protocol,options:{}}
    const submit=()=>buildThinkingSubmission(value,{thinkingContractVersion:1},['image'],'editing').thinkingConfig.roles.image
    assert.deepEqual(compileThinkingSelection(submit(),'image').wire,{})
    render(React.createElement(Harness,{initial:value,operation:'editing'}))
    assert.ok(screen.getByLabelText('图像生成 / 编辑思考模式'))
    value.roles.image.options={mode:false}
    assert.deepEqual(compileThinkingSelection(submit(),'image').wire,wire)
    cleanup()
  }
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
      await fn('http://localhost/mock',{backendMode:'gateway'},{provider:'fal',apiKeys:{fal:'fixture'},...config})
      assert.deepEqual(calls.at(-1).thinkingConfig,config.thinkingConfig)
      await fn('http://localhost/mock',{backendMode:'gateway'},{provider:'fal'})
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
  assert.deepEqual(values('主模型 / 规划推理档位'),['','"standard"','"pro"'])
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

test('untouched image defaults do not become explicit generation-only overrides that block later editing',()=>{
 const value=fresh();value.roles.image={provider:'bailian',modelId:'wan2.7-image-pro',protocol:'bailian-multimodal-generation',options:{}};
 for(const operation of ['generation','editing'])assert.deepEqual(buildThinkingSubmission(value,{thinkingContractVersion:1},['image'],operation).thinkingConfig.roles.image.options,{});
 value.roles.image.options={mode:true};assert.equal(buildThinkingSubmission(value,{thinkingContractVersion:1},['image'],'generation').thinkingConfig.roles.image.options.mode,true);
 assert.throws(()=>buildThinkingSubmission(value,{thinkingContractVersion:1},['image'],'editing'),/精修/);
})

test('Together GLM 5.3 offers only audited effort levels and persists the explicit choice without a budget',()=>{
  for(const modelId of ['zai-org/GLM-5.3','zai-org/GLM-5.3-Flash']) {
    const initial=fresh();initial.roles.main={provider:'together',modelId,protocol:'openai-chat-completions',options:{}}
    render(React.createElement(Harness,{initial}))
    const region=screen.getByRole('region',{name:'主模型 / 规划思考设置'})
    const effort=within(region).getByLabelText('主模型 / 规划思考强度')
    assert.deepEqual([...effort.options].map(x=>x.value),['','"low"','"medium"','"high"','"max"'])
    assert.equal(effort.value,'');assert.equal(within(region).queryByLabelText('主模型 / 规划思考模式'),null)
    assert.equal(within(region).queryByRole('spinbutton'),null)
    fireEvent.change(effort,{target:{value:'"medium"'}});assert.equal(effort.value,'"medium"')
    const value={...initial,roles:{...initial.roles,main:{...initial.roles.main,options:{effort:'medium'}}}}
    assert.equal(saveThinkingSettings(rememberThinkingSettings(value),window.localStorage),true)
    const selected=buildThinkingSubmission(readThinkingSettings(window.localStorage),{thinkingContractVersion:1},['main'],'generation').thinkingConfig.roles.main
    assert.deepEqual(compileThinkingSelection(selected,'main').wire,{reasoning_effort:'medium'})
    cleanup()
  }
})

test('Mistral Large 4 explains none accurately and SiliconFlow retired evidence does not expose controls',()=>{
  const initial=fresh();initial.roles.main={provider:'mistral',modelId:'mistral-large-4',protocol:'openai-chat-completions',options:{}}
  render(React.createElement(Harness,{initial}))
  const effort=screen.getByLabelText('主模型 / 规划思考强度')
  assert.deepEqual([...effort.options].map(x=>x.textContent),['默认（未确认）','最少思考','高'])
  assert.match(screen.getByRole('region',{name:'主模型 / 规划思考设置'}).textContent,/不代表完全关闭思考/)
  fireEvent.change(effort,{target:{value:'"none"'}});assert.equal(effort.value,'"none"')
  cleanup()
  initial.roles.main={provider:'siliconflow',modelId:'MiniMaxAI/MiniMax-M2.5',protocol:'openai-chat-completions',options:{}}
  render(React.createElement(Harness,{initial}))
  assert.equal(Boolean(screen.queryByRole('region',{name:'主模型 / 规划思考设置'})), false)
})

test('Together integer effort stays optional, validates boundaries, and restores independently from enum models',()=>{
  const initial=fresh();initial.roles.main={provider:'together',modelId:'deepseek-ai/DeepSeek-V4.1-Flash',protocol:'openai-chat-completions',options:{}}
  render(React.createElement(Harness,{initial}))
  const region=screen.getByRole('region',{name:'主模型 / 规划思考设置'})
  const input=within(region).getByRole('spinbutton',{name:'主模型 / 规划思考强度'})
  assert.equal(input.value,'');assert.equal(input.min,'1');assert.equal(input.max,'100');assert.equal(input.step,'1');assert.equal(input.required,false)
  assert.match(region.textContent,/范围：1–100 的整数/)
  fireEvent.change(input,{target:{value:'101'}});assert.match(within(region).getByRole('alert').textContent,/1–100/)
  fireEvent.change(input,{target:{value:'50'}});assert.equal(within(region).queryByRole('alert'),null)
  const configured={...initial,roles:{...initial.roles,main:{...initial.roles.main,options:{effort:50}}}}
  const otherIds={...identity,main:{...initial.roles.main,modelId:'Qwen/Qwen3.8-Flash'}}
  const changed=rememberThinkingSettings(reconcileThinkingSettings(configured,otherIds),configured)
  assert.deepEqual(changed.roles.main.options,{})
  saveThinkingSettings(changed,window.localStorage)
  const restored=reconcileThinkingSettings(readThinkingSettings(window.localStorage),{...identity,main:initial.roles.main})
  assert.deepEqual(compileThinkingSelection(buildThinkingSubmission(restored,{thinkingContractVersion:1},['main'],'generation').thinkingConfig.roles.main,'main').wire,{reasoning_effort:50})
  fireEvent.change(input,{target:{value:''}});assert.equal(input.value,'');assert.equal(within(region).queryByRole('alert'),null)
})

test('Z-Image preserves actionable editing recovery while retired thinking sections stay hidden',()=>{
  const initial=fresh();initial.roles.image={provider:'bailian',modelId:'z-image-turbo',protocol:'bailian-multimodal-generation',options:{}}
  initial.roles.main={provider:'ark',modelId:'doubao-seed-1-6-250615',protocol:'ark-openai-chat',options:{}}
  const view=render(React.createElement(Harness,{initial}))
  const control=screen.getByLabelText('图像生成 / 编辑智能提示词改写（含思考）')
  assert.equal(control.value,'false')
  assert.match(screen.getByRole('region',{name:'图像生成 / 编辑思考设置'}).textContent,/默认关闭；开启会增加费用/)
  assert.equal(Boolean(screen.queryByRole('region',{name:'主模型 / 规划思考设置'})), false)
  assert.deepEqual(buildThinkingSubmission(initial,{thinkingContractVersion:1},['image'],'generation').thinkingConfig.roles.image.options,{})
  fireEvent.change(control,{target:{value:'true'}});assert.equal(control.value,'true')
  view.rerender(React.createElement(Harness,{initial,operation:'editing'}))
  assert.equal(screen.queryByLabelText('图像生成 / 编辑智能提示词改写（含思考）'),null)
  assert.match(screen.getByRole('region',{name:'图像生成 / 编辑思考设置'}).textContent,/当前编辑不支持已保存的思考参数/)
})

test('Qianfan image contracts show no independent thinking controls and let users clear obsolete preferences',()=>{
  for(const modelId of ['qwen-image','qwen-image-edit','musesteamer-air-image']) {
    for(const operation of ['generation','editing']) {
      const initial=fresh()
      initial.roles.image={provider:'qianfan',modelId,protocol:'qianfan-images',options:{effort:'high'}}
      render(React.createElement(Harness,{initial,operation}))
      const region=screen.getByRole('region',{name:'图像生成 / 编辑思考设置'})
      assert.equal(within(region).queryByText('思考 · 接口无可调参数'),null)
      assert.equal(within(region).queryByRole('combobox'),null)
      assert.equal(within(region).queryByRole('spinbutton'),null)
      assert.ok(within(region).getByRole('alert'))
      fireEvent.click(within(region).getByRole('button',{name:'清除已保存的思考参数，使用渠道默认'}))
      assert.equal(Boolean(screen.queryByRole('region',{name:'图像生成 / 编辑思考设置'})), false)
      assert.deepEqual(compileThinkingSelection({...initial.roles.image,options:{}},'image',operation).wire,{})
      cleanup()
    }
  }
})
