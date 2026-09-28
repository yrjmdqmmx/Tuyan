import test, {afterEach} from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import {render, screen, fireEvent, cleanup, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {emptyUniversalDraft} from '../src/lib/universalApi.js'
import {readConnectionLibrary, saveConnectionLibrary, mutateConnectionLibrary, connectionFacts, universalImportDiff, exportUniversalConfiguration, importUniversalConfiguration} from '../src/lib/universalProfiles.js'
import {saveThinkingSettings, readThinkingSettings} from '../src/lib/thinkingSettings.js'
import {effectiveLimitSummary} from '../src/lib/universalPresentation.js'
import {migrateUniversalLimitPolicy} from '../src/lib/universalContract.js'
import UniversalConnections from '../src/components/UniversalConnections.jsx'
import ThinkingSettings from '../src/components/ThinkingSettings.jsx'
import TaskRecordsPanel from '../src/components/TaskRecordsPanel.jsx'
import {universalThinkingIdentity} from '../src/lib/thinking.js'
const storage=()=>{let value=null;return {getItem:()=>value,setItem:(_k,v)=>{value=v}}}
const locks=()=>{let tail=Promise.resolve();return {request:(_key,operation)=>{const next=tail.then(operation);tail=next.catch(()=>{});return next}}}
const draft=()=>{const d=emptyUniversalDraft('main');d.modelId='gpt-5';return d}
const profile=id=>({id,name:id,connection:connectionFacts(draft().custom)})
afterEach(()=>{cleanup();window.localStorage.clear()})

test('concurrent tabs preserve unrelated connections; stale updates and deletes cannot overwrite newer records',async()=>{
 const s=storage(),lock=locks(),a=profile('a'),b=profile('b')
 await Promise.all([mutateConnectionLibrary({type:'add',profiles:[a]},s,lock),mutateConnectionLibrary({type:'add',profiles:[b]},s,lock)])
 assert.deepEqual(readConnectionLibrary(s).map(x=>x.id),['a','b'])
 const edited={...a,name:'updated'}
 await mutateConnectionLibrary({type:'update',id:a.id,profile:edited,expected:a},s,lock)
 for(const type of ['update','delete']) await assert.rejects(mutateConnectionLibrary({type,id:a.id,expected:a,profile:{...a,name:'stale'}},s,lock),/其他页面修改/)
 assert.equal(readConnectionLibrary(s)[0].name,'updated')
 await mutateConnectionLibrary({type:'delete',id:a.id,expected:edited},s,lock)
 assert.deepEqual(readConnectionLibrary(s),[b])
})
test('unsafe or unavailable connection persistence fails explicitly and preserves original data',async()=>{
 const s=storage(),p=profile('p');saveConnectionLibrary([p],s)
 await assert.rejects(mutateConnectionLibrary({type:'add',profiles:[profile('q')]},s,{}),/无法安全协调/)
 assert.deepEqual(readConnectionLibrary(s),[p])
 s.setItem('', '{broken')
 await assert.rejects(mutateConnectionLibrary({type:'add',profiles:[profile('q')]},s,locks()),/未覆盖原数据/)
 assert.equal(s.getItem(),'{broken')
})
test('thinking storage failures are observable and retry preserves the same non-sensitive settings',()=>{
 const d=draft(),value={version:1,roles:{main:{...universalThinkingIdentity({modelId:d.modelId,custom:d.custom}),options:{effort:'low'}}}}
 assert.equal(saveThinkingSettings(value,{setItem:()=>{throw Error('quota')}}),false)
 const s=storage();assert.equal(saveThinkingSettings(value,s),true);assert.deepEqual(readThinkingSettings(s),value)
})
test('thinking UI states storage failure and exposes retry without changing options',async()=>{
 const d=draft(),selection={...universalThinkingIdentity({modelId:d.modelId,custom:d.custom}),options:{effort:'low'}};let retried=0
 render(React.createElement(ThinkingSettings,{role:'main',settings:{roles:{main:selection}},registry:{thinkingContractVersion:1,universalThinkingVersion:1},saveState:'error',onRetrySave:()=>retried++,onChange:()=>assert.fail('retry must not change options')}))
 assert.match(screen.getByRole('status').textContent,/保存失败，仅当前页有效/)
 await userEvent.setup().click(screen.getByRole('button',{name:'重试保存思考偏好'}));assert.equal(retried,1);assert.equal(selection.options.effort,'low')
})
test('import diff explains binding/key impact and missing thinking without including secrets',()=>{
 const before=draft(),after=draft();before.apiKey='never-print-this';after.custom.baseUrl='https://custom.example.com/v1';after.modelId='new-model'
 const imported=importUniversalConfiguration(exportUniversalConfiguration('main',after,[]),'main'),diff=universalImportDiff(before,imported)
 assert.equal(diff.clearKey,true);assert.ok(diff.changes.some(x=>x.label==='接口地址'));assert.ok(diff.changes.some(x=>x.label==='型号'));assert.match(diff.thinking,/未包含思考偏好/);assert.doesNotMatch(JSON.stringify(diff),/never-print-this/)
 assert.equal(universalImportDiff(before,importUniversalConfiguration(exportUniversalConfiguration('main',before,[]),'main')).clearKey,false)
})
test('effective limit explanations agree with min/intersection and omit irrelevant image fields',()=>{
 const d=draft(),policy=migrateUniversalLimitPolicy(d.custom);policy.service.input={maxCount:3,mimeTypes:['image/png']};policy.user.input.maxCount=2
 const image=effectiveLimitSummary(policy,{inputImages:true,outputImages:false})
 assert.deepEqual(image.find(x=>x.label==='输入图片'),{label:'输入图片',value:'2 张',source:'用户'})
 assert.equal(image.find(x=>x.label==='输入格式').value,'image/png')
 assert.deepEqual(effectiveLimitSummary(policy,{inputImages:false,outputImages:false}).map(x=>x.label),['完整请求'])
 policy.user.input.maxCount=999
 assert.equal(effectiveLimitSummary(policy,{inputImages:true}).find(x=>x.label==='输入图片').source,'服务方声明')
})
test('older file reads cannot replace the latest import preview',async()=>{
 const d=draft();let resolveFirst,resolveSecond;const a=new Promise(r=>resolveFirst=r),b=new Promise(r=>resolveSecond=r)
 render(React.createElement(UniversalConnections,{role:'main',label:'主模型',draft:d,onChange:()=>assert.fail('preview must not apply')}))
 const input=screen.getByLabelText('主模型 导入文件')
 fireEvent.change(input,{target:{files:[{size:10,text:()=>a}]}});fireEvent.change(input,{target:{files:[{size:10,text:()=>b}]}})
 const second=draft();second.modelId='latest-model';resolveSecond(exportUniversalConfiguration('main',second,[]))
 await waitFor(()=>assert.match(screen.getByLabelText('主模型 导入预览').textContent,/latest-model/))
 resolveFirst(exportUniversalConfiguration('main',d,[]));await new Promise(r=>setTimeout(r,0))
 assert.match(screen.getByLabelText('主模型 导入预览').textContent,/latest-model/)
})
test('reopening an account task views the existing ID without changing state or submitting another task',async()=>{
 const jobs=[{id:'accepted-job',status:'running',created_at:'2026-09-27T00:00:00Z'}],opened=[]
 render(React.createElement(TaskRecordsPanel,{authEnabled:true,currentUser:{id:'owner',email:'fixture@example.test'},jobs,onOpenTask:async id=>{opened.push(id)},onRefresh:()=>{}}))
 assert.ok(screen.getByText(/服务器已接收的任务不会因关闭网页而取消/))
 await userEvent.setup().click(screen.getByRole('button',{name:'查看任务进度'}))
 await waitFor(()=>assert.deepEqual(opened,['accepted-job']));assert.equal(jobs[0].status,'running')
})
test('task details read failure stays on records and offers no automatic generation retry',async()=>{
 render(React.createElement(TaskRecordsPanel,{authEnabled:true,currentUser:{id:'owner'},jobs:[{id:'old',status:'failed'}],onOpenTask:async()=>{throw Error('read-only request failed')}}))
 await userEvent.setup().click(screen.getByRole('button',{name:'查看任务详情'}));await waitFor(()=>assert.match(screen.getByRole('alert').textContent,/read-only request failed/))
 assert.ok(screen.getByRole('button',{name:'查看任务详情'}));assert.equal(screen.queryByText('重新生成'),null)
})
