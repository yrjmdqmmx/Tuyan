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
 fireEvent.click(screen.getByRole('button',{name:'主模型',exact:true}))
 assert.equal(screen.getByLabelText('主模型 模型 ID').value,'Exact/main')
 fireEvent.change(screen.getByLabelText('主模型 API Key'),{target:{value:'fixture-retained'}})
 fireEvent.click(screen.getByRole('button',{name:'返回生成设置'}))
 for(const [role,channel,model] of [['图像生成模型','OpenAI',/^选择 GPT Image 2 ·/],['视觉模型','蚂蚁百灵',/^选择 Ling 3.0-flash-VL/]]){
  fireEvent.click(screen.getByRole('button',{name:role,exact:true}));fireEvent.click(screen.getByRole('button',{name:channel,exact:true}));fireEvent.click(screen.getByRole('button',{name:model,exact:true}))
 }
 assert.equal(document.querySelectorAll('.universal-role').length,0)
 assert.equal(screen.getAllByRole('button',{name:'保存到此浏览器（不含密钥）'}).length,1)
 fireEvent.click(screen.getByRole('button',{name:/普通模式/}));fireEvent.click(screen.getByRole('button',{name:/专业模式/}))
 fireEvent.click(screen.getByRole('button',{name:'主模型',exact:true}))
 assert.equal(screen.getByLabelText('主模型 API Key').value,'fixture-retained')
 fireEvent.click(screen.getByRole('button',{name:'返回生成设置'}))
 assert.match(document.querySelector('[data-model-role="vision"]').textContent,/蚂蚁百灵/)
 fireEvent.click(screen.getByRole('button',{name:'保存到此浏览器（不含密钥）'}))
 assert.ok(screen.getByText(/已保存到此浏览器；Key 与验证结果不保存/))
 assert.doesNotMatch([...Array(window.localStorage.length)].map((_,i)=>window.localStorage.getItem(window.localStorage.key(i))).join(''),/fixture-retained/)
 cleanup();render(React.createElement(App));await waitFor(()=>assert.equal(requests.filter(x=>x?.action==='modelRegistry').length,2));fireEvent.click(screen.getByRole('button',{name:'打开完整设置'}))
 fireEvent.click(screen.getByRole('button',{name:'主模型',exact:true}))
 assert.ok(screen.getAllByText(/已保存到此浏览器；Key 与验证结果不保存/).length)
 fireEvent.change(screen.getByLabelText('主模型 模型 ID'),{target:{value:'Unsaved/Replacement'}})
 assert.ok(screen.getAllByText(/未保存到浏览器/).length)
 fireEvent.change(screen.getByLabelText('主模型 模型 ID'),{target:{value:'Exact/main'}})
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
 fireEvent.click(screen.getByRole('button',{name:'主模型',exact:true}))
 fireEvent.change(screen.getByLabelText('主模型 API Key'),{target:{value:'fixture-main'}})
 fireEvent.click(screen.getByRole('button',{name:'返回生成设置'}))
 fireEvent.click(screen.getByRole('button',{name:'图像生成模型',exact:true}))
 fireEvent.change(screen.getByLabelText('图像模型 API Key'),{target:{value:'fixture-image-must-not-send'}})
 fireEvent.click(screen.getByRole('button',{name:'返回生成设置'}))
 fireEvent.click(screen.getByRole('button',{name:'关闭生成设置'}))
 fireEvent.click(screen.getByRole('button',{name:'优化输入：方法栏'}))
 await waitFor(()=>assert.ok(requests.some(x=>x?.action==='optimizeInputs')))
 const body=requests.find(x=>x?.action==='optimizeInputs')
 assert.deepEqual(Object.keys(JSON.parse(body.apiKey)),['custom_main']);assert.doesNotMatch(JSON.stringify(body),/fixture-image-must-not-send/)
})

for(const missingTokenDance of [false,true])test(`custom sorts first without changing fresh TokenDance defaults (missing=${missingTokenDance})`,async()=>{
 const registry={...STATIC_MODEL_REGISTRY};if(missingTokenDance)delete registry.tokendance
 globalThis.fetch=async(_url,init={})=>{const b=init.body?JSON.parse(init.body):null;return Response.json(!b?{code:0,runtime:'gateway'}:b.action==='modelRegistry'?{code:0,routeContractVersion:1,universalApiContractVersion:1,providers:registry}:{code:0,jobs:[],references:[]})}
 render(React.createElement(App))
 fireEvent.click(screen.getByRole('button',{name:'打开完整设置'}));fireEvent.click(screen.getByRole('button',{name:/专业模式/}))
 await waitFor(()=>assert.equal(Boolean(document.querySelector('.route-contract-warning, .route-contract-status')),false))
 for(const label of ['主模型','视觉模型','图像生成模型']){
  const trigger=screen.getByRole('button',{name:label,exact:true});assert.match(trigger.textContent,/观猹 TokenDance/)
  fireEvent.click(trigger)
  const rail=within(screen.getByRole('group',{name:'API 接入渠道'}))
  await waitFor(()=>assert.ok(rail.getByRole('button',{name:'通用 API'})))
  assert.equal(rail.getAllByRole('button')[0].getAttribute('aria-label'),'通用 API')
  assert.equal(rail.getByRole('button',{name:'观猹 TokenDance'}).getAttribute('aria-pressed'),'true')
  assert.equal(rail.getByRole('button',{name:'通用 API'}).getAttribute('aria-pressed'),'false')
  fireEvent.click(screen.getByRole('button',{name:'关闭模型选择'}))
  assert.match(trigger.textContent,/观猹 TokenDance/)
 }
})

test('three modal drafts remain isolated across provider switches, close/reopen and explicit non-secret save',async()=>{
 globalThis.fetch=async(_url,init={})=>{const b=init.body?JSON.parse(init.body):null;return Response.json(!b?{code:0,runtime:'gateway'}:b.action==='modelRegistry'?{code:0,routeContractVersion:1,universalApiContractVersion:1,providers:STATIC_MODEL_REGISTRY}:{code:0,jobs:[],references:[]})}
 render(React.createElement(App));fireEvent.click(screen.getByRole('button',{name:'打开完整设置'}));fireEvent.click(screen.getByRole('button',{name:/专业模式/}))
 await waitFor(()=>assert.equal(Boolean(document.querySelector('.route-contract-warning, .route-contract-status')),false))
 const roles=[['主模型','主模型','main'],['视觉模型','视觉模型','vision'],['图像生成模型','图像模型','image']]
 for(const [trigger,label,role] of roles){
  fireEvent.click(screen.getByRole('button',{name:trigger,exact:true}));fireEvent.click(screen.getByRole('button',{name:'通用 API',exact:true}))
  const dialog=screen.getByRole('dialog',{name:trigger+' · API 渠道与模型'})
  assert.ok(within(dialog).getByLabelText(label+' API 协议'))
  assert.equal(within(dialog).queryByRole('group',{name:'模型厂商'}),null)
  assert.equal(within(dialog).queryByRole('region',{name:'具体模型列表'}),null)
  fireEvent.change(screen.getByLabelText(label+' Base URL'),{target:{value:'https://'+role+'.example.com/v1'}})
  fireEvent.change(screen.getByLabelText(label+' 模型 ID'),{target:{value:'Manual/'+role}})
  fireEvent.change(screen.getByLabelText(label+' API Key'),{target:{value:'fixture-'+role+'-secret'}})
  fireEvent.click(screen.getByRole('button',{name:'返回生成设置'}))
  assert.equal(screen.queryByLabelText(label+' 模型 ID'),null)
  assert.match(screen.getByRole('button',{name:trigger,exact:true}).textContent,/密钥已填写/)
 }
 fireEvent.click(screen.getByRole('button',{name:'主模型',exact:true}))
 fireEvent.click(screen.getByRole('button',{name:'OpenAI',exact:true}))
 fireEvent.change(screen.getByRole('searchbox',{name:'搜索主模型'}),{target:{value:'gpt-4.1'}})
 fireEvent.click(screen.getByRole('button',{name:/^选择 GPT-4.1 ·/}))
 assert.equal(screen.getByLabelText('OpenAI 接入密钥').value,'')
 fireEvent.click(screen.getByRole('button',{name:'主模型',exact:true}));fireEvent.click(screen.getByRole('button',{name:'通用 API',exact:true}))
 assert.equal(screen.getByLabelText('主模型 模型 ID').value,'Manual/main')
 assert.equal(screen.getByLabelText('主模型 API Key').value,'fixture-main-secret')
 fireEvent.change(screen.getByLabelText('主模型 Base URL'),{target:{value:'https://changed.example.com/v1'}})
 assert.equal(screen.getByLabelText('主模型 API Key').value,'')
 fireEvent.click(screen.getByRole('button',{name:'返回生成设置'}))
 for(const [trigger,label,role] of roles.slice(1)){
  fireEvent.click(screen.getByRole('button',{name:trigger,exact:true}))
  assert.equal(screen.getByLabelText(label+' 模型 ID').value,'Manual/'+role)
  assert.equal(screen.getByLabelText(label+' API Key').value,'fixture-'+role+'-secret')
  fireEvent.click(screen.getByRole('button',{name:'返回生成设置'}))
 }
 fireEvent.click(screen.getByRole('button',{name:'保存到此浏览器（不含密钥）'}))
 const stored=Object.keys(window.localStorage).map(k=>window.localStorage.getItem(k)).join('')
 assert.doesNotMatch(stored,/fixture-.*-secret/)
 assert.match(stored,/Manual\/vision/)
})
