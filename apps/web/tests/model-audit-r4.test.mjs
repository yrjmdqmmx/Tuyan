import test, {afterEach} from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import {render,renderHook,act,waitFor,cleanup,screen,fireEvent} from '@testing-library/react'
import {modelCardSpecifications} from '../src/lib/modelCardSpecifications.js'
import {STATIC_MODEL_REGISTRY} from '../src/lib/staticModelCatalog.js'
import {ModelSpecifications} from '../src/components/ModelSpecifications.jsx'
import WorkspaceModelCatalog from '../src/workspace/WorkspaceModelCatalog.jsx'
import useWorkspaceModels from '../src/workspace/useWorkspaceModels.js'
import WorkspaceModelPicker from '../src/workspace/WorkspaceModelPicker.jsx'
Object.defineProperty(globalThis,'localStorage',{value:window.localStorage,configurable:true})
afterEach(cleanup)

test('missing audit values preserve exact verified catalog facts with accessible provenance',()=>{
  const model=STATIC_MODEL_REGISTRY.kimi.models.find(m=>m.id==='kimi-k3')
  const before=structuredClone(model), card=modelCardSpecifications('kimi',model)
  assert.deepEqual(card.fields.inputModalities.value,['text','image'])
  assert.equal(card.fields.totalContextTokens.value,1000000)
  assert.equal(card.inputFact.provenance,'catalog');assert.equal(card.fields.totalContextTokens.provenance,'catalog');assert.equal(card.context,'1M tokens')
  render(React.createElement(ModelSpecifications,{provider:'kimi',model}))
  assert.match(screen.getByRole('link').title,/图研既有核实/)
  assert.deepEqual(model,before)
})

test('audit disagreements are recorded, and the unverified Kimi output cannot fall back to context',()=>{
  const model={id:'deepseek-v4-pro',specifications:{version:1,contextWindowTokens:42,sourceUrls:['https://example.com/catalog']}}
  const card=modelCardSpecifications('tokendance',model)
  assert.equal(card.fields.totalContextTokens.value,1048576)
  assert.ok(card.conflicts.some(row=>row.field==='totalContextTokens'&&row.existingValue===42&&row.sources.includes('https://example.com/catalog')))
  const kimi={id:'kimi/kimi-k2.7-code-highspeed',specifications:{version:1,maxOutputTokens:262144,sourceUrls:['https://help.aliyun.com/zh/model-studio/models']}}
  const uncertain=modelCardSpecifications('bailian',kimi)
  assert.equal(uncertain.maxOutput,'未知');assert.equal(uncertain.fields.maxOutputTokens.value,null)
  assert.match(uncertain.note,/待核实：官方页面需浏览器渲染核对/)
})

test('same-channel saved cards show both connection label and connection ID',()=>{
  const provider='antling',modelId='Ling-3.0-flash-VL'
  const library={connections:['first','second'].map(id=>({id,provider,label:'团队连接'})),models:['first','second'].map(connectionId=>({id:connectionId,connectionId,modelId}))}
  const models={library,registry:{providers:STATIC_MODEL_REGISTRY},ready:true,registryStatus:'ready',busy:false}
  const {container}=render(React.createElement(WorkspaceModelCatalog,{models,mode:'library'}))
  const cards=[...container.querySelectorAll('.tw-catalog-card')]
  assert.equal(cards.length,2)
  for (const [i, id] of ['first', 'second'].entries()) {
    const subtitle = cards[i].querySelector('.tw-catalog-card-head p');
    assert.match(subtitle.textContent,/团队连接/); assert.ok(!subtitle.textContent.includes(id));
    assert.ok(subtitle.title.includes(`团队连接 · ${id}`));
  }
})

test('picker restores thinking status and the connection description on each saved choice',()=>{
  const library={connections:['first','second'].map(id=>({id,provider:'openai',label:'同名连接',hasCredential:true})),models:['first','second'].map(connectionId=>({id:connectionId,connectionId,modelId:'gpt-6.1-sol'}))}
  const models={library,registry:{providers:STATIC_MODEL_REGISTRY},ready:true,registryStatus:'ready',busy:false}
  render(React.createElement(WorkspaceModelPicker,{models,role:'main',path:'svg',current:{libraryModelId:'first',modelId:'gpt-6.1-sol',accessProvider:'openai'},onChange:()=>assert.fail('Viewing is not selecting')}))
  fireEvent.click(screen.getByRole('button',{name:'主模型'}))
  const dialog=screen.getByRole('dialog')
  assert.equal(dialog.querySelectorAll('.thinking-status[data-thinking-status="supported"]').length,2)
  assert.deepEqual([...dialog.querySelectorAll('.model-option-note')].map(n=>n.textContent),['同名连接','同名连接'])
  assert.deepEqual([...dialog.querySelectorAll('.model-option-note')].map(n=>n.title),['同名连接 · first','同名连接 · second'])
})

test('first sync and import save historical bindings; an explicit new removed binding is rejected locally',async()=>{
  const original=globalThis.fetch;let stored={revision:0,connections:[],models:[]},puts=0
  globalThis.fetch=async(url,options={})=>{
    if(String(url).endsWith('/api/model-library')) {
      if(options.method==='PUT'){puts++;const input=JSON.parse(options.body);stored={...input,revision:input.revision+1}}
      return Response.json(stored)
    }
    const action=options.body&&JSON.parse(options.body).action
    return Response.json(action==='modelRegistry'?{providers:STATIC_MODEL_REGISTRY}:action==='tokenDanceStatus'?{available:false,connected:false}:{runtime:'gateway'})
  }
  try {
    const hook=renderHook(()=>useWorkspaceModels('owner','https://r4.fixture'))
    await waitFor(()=>assert.equal(hook.result.current.ready,true))
    const history={...stored,connections:[{id:'c',provider:'xiaomi',label:'导入',scope:'browser'}],models:[{id:'old',connectionId:'c',modelId:'mimo-v2.5'}]}
    await act(async()=>assert.equal(await hook.result.current.save(history),true))
    assert.equal(puts,1);assert.equal(hook.result.current.library.models[0].modelId,'mimo-v2.5')
    await act(async()=>assert.equal(await hook.result.current.save({...hook.result.current.library,models:[...history.models,{id:'imported',connectionId:'c',modelId:'mimo-v2.5-pro'}]},undefined,{intent:'import'}),true))
    assert.equal(puts,2);assert.equal(stored.intent,'import')
    await act(async()=>assert.equal(await hook.result.current.save({...hook.result.current.library,models:[...stored.models,{id:'new',connectionId:'c',modelId:'mimo-v2.5'}]},undefined,{intent:'add'}),false))
    assert.equal(puts,2);assert.match(hook.result.current.error,/mimo-v2.6-flash/)
    assert.deepEqual(stored.models.map(m=>m.modelId),['mimo-v2.5','mimo-v2.5-pro'])
  } finally {globalThis.fetch=original}
})
