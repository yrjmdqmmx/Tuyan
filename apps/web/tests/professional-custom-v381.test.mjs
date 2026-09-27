import assert from 'node:assert/strict'
import {afterEach,test} from 'node:test'
import React from 'react'
import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import App from '../src/App.jsx'
import {STATIC_MODEL_REGISTRY} from '../src/lib/staticModelCatalog.js'
import {emptyUniversalDraft,saveUniversalDrafts,universalRoutes,bindUniversalKey,universalKeyEnvelope} from '../src/lib/universalApi.js'
import {loadRoutingSelection,saveRoutingSelection,mergeProfessionalRoutes,scopedApiKeysForRoles} from '../src/lib/modelRouting.js'
const oldFetch=globalThis.fetch
const presets={main:{accessProvider:'longcat',modelId:'LongCat-2.5-Preview'},vision:{accessProvider:'antling',modelId:'Ling-3.0-flash-VL'},image:{accessProvider:'openai',modelId:'gpt-image-2'}}
const drafts=()=>Object.fromEntries(['main','vision','image'].map(role=>{const d=emptyUniversalDraft(role);d.declared=true;d.modelId=`Exact/${role}`;d.custom.baseUrl=`https://${role}.example.com/v1`;d.custom.capabilities={text:role!=='image',vision:role!=='image',imageGeneration:role==='image',imageEditing:role==='image'};if(role==='image')d.custom.outputSizes=[{resolution:'1K',aspectRatio:'16:9',value:'1536x864'}];return [role,d]}))
afterEach(()=>{cleanup();window.localStorage.clear();globalThis.fetch=oldFetch})
for(const role of ['main','vision','image'])test(`restored custom ${role} preserves the other two provider choices and scopes secrets`,()=>{
 const d=drafts(),selection={...presets,[role]:{accessProvider:'custom',modelId:d[role].modelId}}
 saveUniversalDrafts(d);saveRoutingSelection('advanced',selection)
 const saved=loadRoutingSelection(presets,d),routes=mergeProfessionalRoutes(saved.routes,universalRoutes(d))
 assert.equal(routes[role].custom.baseUrl,d[role].custom.baseUrl)
 for(const other of Object.keys(presets).filter(r=>r!==role))assert.deepEqual(routes[other],presets[other])
 const envelope=universalKeyEnvelope(d,Object.fromEntries(Object.entries(d).map(([r,v])=>[r,bindUniversalKey(v,'fixture-'+r)])))
 const keys=scopedApiKeysForRoles(routes,[role],{custom:envelope,openai:'not-needed'})
 assert.deepEqual(Object.keys(JSON.parse(keys.custom)),['custom_'+role]);assert.equal(keys.openai,undefined)
 assert.doesNotMatch(window.localStorage.getItem('tuyan.model-routing.v1'),/fixture|baseUrl|apiKey/)
})
test('legacy restoration, two modes, per-role channel changes, draft/key retention and explicit save survive remount',async()=>{
 saveUniversalDrafts(drafts());const requests=[]
 globalThis.fetch=async(_url,init={})=>{const b=init.body?JSON.parse(init.body):null;requests.push(b);return Response.json(!b?{code:0,runtime:'gateway'}:b.action==='modelRegistry'?{code:0,routeContractVersion:1,universalApiContractVersion:1,thinkingContractVersion:1,providers:STATIC_MODEL_REGISTRY}:{code:0,jobs:[],references:[]})}
 render(React.createElement(App));await waitFor(()=>assert.ok(requests.some(x=>x?.action==='modelRegistry')))
 fireEvent.click(screen.getByRole('button',{name:'打开完整设置'}))
 assert.equal(within(screen.getByRole('group',{name:'使用模式'})).getAllByRole('button').length,2)
 assert.equal(screen.getByLabelText('主模型 模型 ID').value,'Exact/main')
 fireEvent.change(screen.getByLabelText('主模型 API Key'),{target:{value:'fixture-retained'}})
 for(const [role,channel,model] of [['图像生成模型','OpenAI',/^选择 GPT Image 2 ·/],['参考图识别模型','蚂蚁百灵',/^选择 Ling 3.0-flash-VL/]]){
  fireEvent.click(screen.getByRole('button',{name:role,exact:true}));fireEvent.click(screen.getByRole('button',{name:channel,exact:true}));fireEvent.click(screen.getByRole('button',{name:model,exact:true}))
 }
 assert.equal(document.querySelectorAll('.universal-role').length,1)
 assert.equal(screen.getAllByRole('button',{name:'保存非敏感配置'}).length,1)
 fireEvent.click(screen.getByRole('button',{name:/普通模式/}));fireEvent.click(screen.getByRole('button',{name:/专业模式/}))
 assert.equal(screen.getByLabelText('主模型 API Key').value,'fixture-retained')
 assert.match(document.querySelector('[data-model-role="vision"]').textContent,/蚂蚁百灵/)
 fireEvent.click(screen.getByRole('button',{name:'保存非敏感配置'}))
 assert.doesNotMatch([...Array(window.localStorage.length)].map((_,i)=>window.localStorage.getItem(window.localStorage.key(i))).join(''),/fixture-retained/)
 cleanup();render(React.createElement(App));await waitFor(()=>assert.equal(requests.filter(x=>x?.action==='modelRegistry').length,2));fireEvent.click(screen.getByRole('button',{name:'打开完整设置'}))
 assert.equal(screen.getByLabelText('主模型 模型 ID').value,'Exact/main');assert.equal(screen.getByLabelText('主模型 API Key').value,'')
 assert.match(document.querySelector('[data-model-role="image"]').textContent,/GPT Image 2/)
 assert.match(document.querySelector('[data-model-role="vision"]').textContent,/蚂蚁百灵/)
 assert.equal(requests.some(x=>/createJob|refineImage|universalApiCheck/.test(x?.action)),false)
})
test('input optimization validates the custom main key and sends only its bound credential',async()=>{
 saveUniversalDrafts(drafts());const requests=[]
 globalThis.fetch=async(_url,init={})=>{const b=init.body?JSON.parse(init.body):null;requests.push(b);return Response.json(!b?{code:0,runtime:'gateway'}:b.action==='modelRegistry'?{code:0,routeContractVersion:1,universalApiContractVersion:1,inputOptimizationContractVersion:1,providers:STATIC_MODEL_REGISTRY}:b.action==='optimizeInputs'?{code:0,target:b.target,optimizedText:'优化后的科学描述'}:{code:0,jobs:[],references:[]})}
 render(React.createElement(App));await waitFor(()=>assert.ok(requests.some(x=>x?.action==='modelRegistry')))
 fireEvent.click(screen.getByRole('button',{name:'优化输入：方法栏'}))
 assert.equal(requests.some(x=>x?.action==='optimizeInputs'),false)
 fireEvent.change(screen.getByLabelText('主模型 API Key'),{target:{value:'fixture-main'}})
 fireEvent.change(screen.getByLabelText('图像模型 API Key'),{target:{value:'fixture-image-must-not-send'}})
 fireEvent.click(screen.getByRole('button',{name:'关闭生成设置'}))
 fireEvent.click(screen.getByRole('button',{name:'优化输入：方法栏'}))
 await waitFor(()=>assert.ok(requests.some(x=>x?.action==='optimizeInputs')))
 const body=requests.find(x=>x?.action==='optimizeInputs')
 assert.deepEqual(Object.keys(JSON.parse(body.apiKey)),['custom_main']);assert.doesNotMatch(JSON.stringify(body),/fixture-image-must-not-send/)
})
