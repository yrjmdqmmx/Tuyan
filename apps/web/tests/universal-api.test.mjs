import assert from 'node:assert/strict'
import {afterEach,test} from 'node:test'
import React from 'react'
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../src/App.jsx'
import {TokenDanceRecovery} from '../src/components/TokenDancePanel.jsx'
import {emptyUniversalDraft,saveUniversalDrafts,loadUniversalDrafts,universalDraftRoute,updateUniversalDraft,bindUniversalKey,universalKeyEnvelope,missingUniversalKeys} from '../src/lib/universalApi.js'
import {STATIC_MODEL_REGISTRY} from '../src/lib/staticModelCatalog.js'
const oldFetch=globalThis.fetch,oldStorage=globalThis.localStorage
function drafts(){return Object.fromEntries(['main','vision','image'].map(role=>{const d=emptyUniversalDraft(role);d.declared=true;d.modelId='User/Exact-'+role;d.custom.baseUrl=`https://${role}.example.com/service/v1`;d.custom.capabilities={text:role!=='image',vision:role!=='image',imageGeneration:role==='image',imageEditing:role==='image'};if(role==='image')d.custom.outputSizes=[{resolution:'1K',aspectRatio:'16:9',value:'1536x864'}];return[role,d]}))}
function backend(){const requests=[];globalThis.fetch=async(_url,init={})=>{const b=init.body?JSON.parse(init.body):null;requests.push(b);if(!b)return Response.json({code:0,runtime:'laf'});if(b.action==='modelRegistry')return Response.json({code:0,routeContractVersion:1,universalApiContractVersion:1,providers:STATIC_MODEL_REGISTRY});if(b.action==='referenceLibrary')return Response.json({code:0,references:[]});if(b.action==='universalApiCheck')return Response.json({code:0,state:'catalog-visible',models:[{id:b.route.modelId}],warnings:[{row:1,code:'protocols_null'}],message:'已隔离 1 条异常，其余目录可见；未验证真实调用。'});if(b.action==='createJob')return Response.json({code:0,jobId:'custom-fixture',status:'queued'});if(b.action==='getJob')return Response.json({code:0,job:{id:'custom-fixture',status:'succeeded',resultImages:[],stages:[]}});throw Error('Unexpected mock action '+b.action)};return requests}
afterEach(()=>{cleanup();window.localStorage.clear();globalThis.fetch=oldFetch;globalThis.localStorage=oldStorage})
test('metadata persistence excludes keys; changed endpoints reject old bindings; unknown models require declaration',()=>{
 const d=drafts(),key=bindUniversalKey(d.main,'fixture-only-key');saveUniversalDrafts({...d,main:{...d.main,apiKey:'must-not-save'}},window.localStorage)
 assert.doesNotMatch(window.localStorage.getItem('tuyan.universal-api.v1'),/must-not-save|fixture-only-key/)
 assert.equal(loadUniversalDrafts(window.localStorage).main.modelId,d.main.modelId)
 const updated=updateUniversalDraft(d.main,{custom:{baseUrl:'https://other.example.com/v1'}})
 assert.equal(updated.clearKey,true);assert.equal(updated.draft.modelId,d.main.modelId);assert.equal(updated.draft.declared,false)
 assert.deepEqual(missingUniversalKeys({main:universalDraftRoute({...updated.draft,declared:true})},['main'],universalKeyEnvelope({main:updated.draft},{main:key})),['main'])
 assert.throws(()=>universalDraftRoute({...d.main,declared:false}),/能力记录/)
 window.localStorage.setItem('tuyan.universal-api.v1',JSON.stringify({version:1,roles:{main:{modelId:'preserved-ID',declared:true,custom:{capabilities:null,inputLimits:{mimeTypes:null}}}}}))
 const restored=loadUniversalDrafts(window.localStorage).main
 assert.equal(restored.modelId,'preserved-ID');assert.equal(restored.declared,false);assert.ok(Array.isArray(restored.custom.inputLimits.mimeTypes))
})
test('universal mode preserves preset choices and input while address change clears only its key',async()=>{
 globalThis.localStorage=window.localStorage;saveUniversalDrafts(drafts());const requests=backend(),user=userEvent.setup();render(React.createElement(App))
 await waitFor(()=>assert.ok(requests.some(x=>x?.action==='modelRegistry')))
 fireEvent.change(screen.getByLabelText(/论文方法内容/u),{target:{value:'保留这段论文方法，不因模型配置切换而丢失已有输入。'}})
 const before=screen.getByRole('region',{name:'当前生成设置'}).textContent
 await user.click(screen.getByRole('button',{name:'打开完整设置'}));await user.click(screen.getByRole('button',{name:/通用 API.*自有服务/}))
 assert.equal(screen.getByLabelText('主模型 模型 ID').value,'User/Exact-main')
 assert.equal(screen.queryByText(/API 密钥不会发送到用户指定的第三方地址/),null);assert.equal(screen.queryByLabelText('模型可用性说明'),null)
 fireEvent.change(screen.getByLabelText('主模型 API Key'),{target:{value:'old-bound-key'}})
 fireEvent.change(screen.getByLabelText('主模型 Base URL'),{target:{value:'https://changed.example.com/v2'}})
 assert.equal(screen.getByLabelText('主模型 API Key').value,'');assert.equal(screen.getByLabelText('主模型 模型 ID').value,'User/Exact-main')
 await user.click(screen.getByRole('button',{name:/普通模式/}));await user.click(screen.getByRole('button',{name:'关闭生成设置'}))
 assert.equal(screen.getByRole('region',{name:'当前生成设置'}).textContent,before)
 assert.equal(screen.getByLabelText(/论文方法内容/u).value,'保留这段论文方法，不因模型配置切换而丢失已有输入。')
 assert.equal(requests.filter(x=>x?.action==='createJob').length,0)
})
test('custom submit preserves exact IDs and scoped readonly catalog check makes no inference claim',async()=>{
 globalThis.localStorage=window.localStorage;saveUniversalDrafts(drafts());const requests=backend(),user=userEvent.setup();render(React.createElement(App))
 await waitFor(()=>assert.ok(requests.some(x=>x?.action==='modelRegistry')))
 await user.click(screen.getByRole('button',{name:'打开完整设置'}));await user.click(screen.getByRole('button',{name:/通用 API.*自有服务/}))
 for(const label of ['主模型','识图模型','图像模型'])fireEvent.change(screen.getByLabelText(`${label} API Key`),{target:{value:`fixture-key-${['主模型','识图模型','图像模型'].indexOf(label)}`}})
 await user.click(screen.getAllByRole('button',{name:'只读检查模型目录'})[0]);await screen.findByText(/已隔离 1 条异常/)
 assert.equal(Object.keys(JSON.parse(requests.find(x=>x?.action==='universalApiCheck').apiKeys.custom)).length,1)
 fireEvent.change(screen.getByLabelText('主模型 API Key'),{target:{value:'new-account-key'}})
 assert.equal(screen.queryByText(/已隔离 1 条异常/),null)
 await user.click(screen.getByRole('button',{name:'关闭生成设置'}));await user.click(screen.getAllByRole('button',{name:'生成候选图'}).find(x=>x.type==='submit'))
 await waitFor(()=>assert.ok(requests.some(x=>x?.action==='createJob')))
 const b=requests.find(x=>x?.action==='createJob');assert.equal(b.modelRoutes.main.modelId,'User/Exact-main');assert.equal(b.modelRoutes.image.custom.baseUrl,'https://image.example.com/service/v1');assert.equal(b.configurationMode,'advanced');assert.equal(b.provider,'custom');assert.deepEqual(Object.keys(b.apiKeys),['custom'])
})
test('recovery explains not-sent separately from uncertain billed calls without a TokenDance account action',()=>{
 const job={id:'j',status:'failed',recovery:{channel:'custom',canResume:false,message:'输入图片超限',requestState:'not_sent'}}
 const view=render(React.createElement(TokenDanceRecovery,{job,controller:{},onResumed:()=>{}}))
 assert.ok(screen.getByText(/本次失败步骤未发起模型请求/));assert.equal(screen.queryByText(/存在结果不确定/),null);assert.equal(screen.queryByText('前往账户处理'),null)
 view.rerender(React.createElement(TokenDanceRecovery,{job:{...job,recovery:{...job.recovery,requestState:'unknown'}},controller:{}}))
 assert.ok(screen.getByText(/存在结果不确定的调用/))
})
