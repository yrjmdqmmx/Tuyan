import test,{afterEach} from 'node:test'
import assert from 'node:assert/strict'
import React,{useState} from 'react'
import {cleanup,render,screen,fireEvent,within,waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {emptyUniversalDraft,serializeUniversalDrafts,loadUniversalDrafts,updateUniversalDraft,universalDraftRoute,catalogMetadataForDraft,catalogCapabilityPatch} from '../src/lib/universalApi.js'
import {parseUniversalCatalogMetadata,migrateUniversalLimitPolicy,effectiveUniversalLimits} from '../src/lib/universalContract.js'
import {exportUniversalConfiguration,importUniversalConfiguration,saveConnectionLibrary,readConnectionLibrary,profilePatch,connectionFacts} from '../src/lib/universalProfiles.js'
import {thinkingIdentities,reconcileThinkingSettings,rememberThinkingSettings,buildThinkingSubmission} from '../src/lib/thinkingSettings.js'
import {universalThinkingIdentity} from '../src/lib/thinking.js'
import UniversalConnections from '../src/components/UniversalConnections.jsx'
import UniversalCapabilities from '../src/components/UniversalCapabilities.jsx'
import ModelPicker from '../src/components/ModelPicker.jsx'
import ThinkingSettings from '../src/components/ThinkingSettings.jsx'
const storage=()=>{const map=new Map();return {getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)}}
const main=()=>{const d=emptyUniversalDraft('main');d.modelId='gpt-5';return d}
afterEach(()=>{cleanup();window.localStorage.clear()})
test('secret-free export/import roundtrip retains limits/sizes/thinking but requires capability review',()=>{
 const d=main();d.declared=true;d.custom.capabilities.text=true;d.custom.limitPolicy=migrateUniversalLimitPolicy(d.custom);d.custom.limitPolicy.service.input={maxCount:2};d.custom.outputSizes=[{resolution:'legacy',aspectRatio:'7:5',value:'1433x1024'}]
 d.apiKey='top-secret';d.custom.capabilities.apiKey='nested-secret';d.custom.inputLimits.apiKey='limit-secret';d.verified=true
 const thinking={...universalThinkingIdentity({modelId:d.modelId,custom:d.custom}),options:{effort:'low'}}
 const profile={id:'p',name:'My connection',connection:{...connectionFacts(d.custom),apiKey:'profile-secret'}}
 const text=exportUniversalConfiguration('main',d,[profile],thinking);assert.doesNotMatch(text,/top-secret|nested-secret|limit-secret|profile-secret|verified|apiKey/)
 const imported=importUniversalConfiguration(text,'main');assert.equal(imported.draft.declared,false);assert.equal(imported.draft.ui.capabilityMode,'manual');assert.deepEqual(imported.draft.custom.limitPolicy,d.custom.limitPolicy);assert.deepEqual(imported.draft.custom.outputSizes,d.custom.outputSizes);assert.equal(imported.thinking.options.effort,'low');assert.equal(imported.profiles.length,1)
 const vision=importUniversalConfiguration(text,'vision');assert.equal(vision.draft.custom.connectionId,'custom_vision');assert.equal(vision.thinking.options.effort,'low')
 for(const key of ['apiKey','headers','credentials','thinkingSnapshot','verified','recoveryToken']){const value=JSON.parse(text);value[key]='secret';assert.throws(()=>importUniversalConfiguration(JSON.stringify(value),'main'),/不允许/)}
 for(const raw of ['{','x'.repeat(128*1024+1),JSON.stringify({schema:'tuyan.universal',version:99})])assert.throws(()=>importUniversalConfiguration(raw,'main'))
 const bad=JSON.parse(text);bad.thinking.connection.baseUrl='https://evil.example.com/v1';assert.throws(()=>importUniversalConfiguration(JSON.stringify(bad),'main'),/不匹配/)
 const old=importUniversalConfiguration(JSON.stringify({version:1,roles:{main:JSON.parse(serializeUniversalDrafts({main:d})).roles.main}}),'main');assert.equal(old.draft.modelId,d.modelId)
})
test('connection profile updates/deletes leave role snapshots isolated and key clearing follows binding',()=>{
 const s=storage(),d=main(),profile={id:'p',name:'One',connection:connectionFacts(d.custom)}
 saveConnectionLibrary([profile],s);const before=structuredClone(d),applied=updateUniversalDraft(d,profilePatch(profile));assert.deepEqual(d,before)
 saveConnectionLibrary([{...profile,connection:{...profile.connection,baseUrl:'https://other.example.com/v1'}}],s);assert.equal(applied.draft.custom.baseUrl,d.custom.baseUrl)
 const changed=updateUniversalDraft(d,profilePatch(readConnectionLibrary(s)[0]));assert.equal(changed.clearKey,true);assert.equal(changed.draft.modelId,d.modelId)
 saveConnectionLibrary([],s);assert.equal(changed.draft.custom.baseUrl,'https://other.example.com/v1');assert.deepEqual(readConnectionLibrary(s),[])
})
test('metadata conflict is explicit, stale/wrong origin rejected and same-name proxy never inherits authority',()=>{
 const d=main();d.custom={...d.custom,protocol:'anthropic-messages',baseUrl:'https://api.anthropic.com/v1',auth:'x-api-key',capabilities:{text:true,vision:false,imageGeneration:false,imageEditing:false}};d.modelId='claude-sonnet-4-6'
 const m=parseUniversalCatalogMetadata({capabilities:{image_input:{supported:true}},max_tokens:1000},{...d.custom,catalogFormat:'auto'},d.modelId,new Date().toISOString()).metadata
 assert.ok(catalogMetadataForDraft(m,d));const p=catalogCapabilityPatch(m,d);assert.equal(p.custom.capabilities.vision,true);assert.equal(d.custom.capabilities.vision,false);assert.equal(p.declared,false);assert.equal(p.custom.capabilities.imageEditing,false)
 assert.equal(catalogMetadataForDraft({...m,source:{...m.source,fetchedAt:'2020-01-01'}},d),null)
 assert.equal(catalogMetadataForDraft(m,{...d,custom:{...d.custom,baseUrl:'https://proxy.example.com/v1'}}),null)
 assert.equal(catalogMetadataForDraft({...m,facts:{inputTokenLimit:NaN}},d),null)
})
test('layered controls permit unknown vendor limits without changing platform caps or legacy user limits',async()=>{
 let latest;const d=main();d.declared=true;d.custom.capabilities.text=true;d.ui.capabilityMode='manual'
 const view=render(React.createElement(UniversalCapabilities,{draft:d,role:'main',label:'主模型',onChange:p=>latest=p}));assert.equal(screen.queryByLabelText('主模型 单图 MiB'),null)
 assert.equal(screen.getByLabelText('主模型 完整请求 MiB 服务方').value,'');assert.equal(screen.getByLabelText('主模型 完整请求 MiB').value,'32')
 fireEvent.change(screen.getByLabelText('主模型 完整请求 MiB 服务方'),{target:{value:'20'}});assert.equal(latest.custom.inputLimits.requestMaxBytes,20*1024*1024);assert.equal(latest.custom.limitPolicy.user.input.requestMaxBytes,32*1024*1024)
 view.rerender(React.createElement(UniversalCapabilities,{draft:updateUniversalDraft(d,latest).draft,role:'main',label:'主模型',onChange:p=>latest=p}));fireEvent.change(screen.getByLabelText('主模型 完整请求 MiB 服务方'),{target:{value:''}});assert.equal(latest.custom.inputLimits.requestMaxBytes,32*1024*1024)
 assert.equal(effectiveUniversalLimits({version:1,service:{},user:{input:{requestMaxBytes:500*1024*1024}}}).inputLimits.requestMaxBytes,120*1024*1024)
})
test('custom thinking UI and submission share exact identity; changing connection restores independent preferences',()=>{
 const d=main(),r=universalDraftRoute(d),routes={main:r,vision:r,image:r},ids=thinkingIdentities(routes,{},{}),settings=reconcileThinkingSettings(null,ids);settings.roles.main.options={effort:'low'}
 const saved=rememberThinkingSettings(settings,null),other=reconcileThinkingSettings(saved,{...ids,main:{...ids.main,connection:{...ids.main.connection,baseUrl:'https://proxy.example.com/v1'}}});assert.deepEqual(other.roles.main.options,{})
 const restored=reconcileThinkingSettings(rememberThinkingSettings(other,saved),ids);assert.equal(restored.roles.main.options.effort,'low')
 assert.throws(()=>buildThinkingSubmission(restored,{thinkingContractVersion:1},['main'],'generation'),/尚未支持/)
 const payload=buildThinkingSubmission(restored,{thinkingContractVersion:1,universalThinkingVersion:1},['main'],'generation');assert.equal(payload.thinkingConfig.roles.main.connection.baseUrl,d.custom.baseUrl)
 render(React.createElement(ThinkingSettings,{role:'main',settings:restored,registry:{thinkingContractVersion:1,universalThinkingVersion:1},onChange:()=>{}}));assert.equal(screen.getByRole('combobox').value,'"low"')
})
test('named connection UI makes persistence and impact explicit',async()=>{
 globalThis.localStorage=window.localStorage
 Object.defineProperty(globalThis.navigator,'locks',{configurable:true,value:{request:async(_name,callback)=>callback()}})
 const d=main();let patch
 render(React.createElement(UniversalConnections,{role:'main',label:'主模型',draft:d,onChange:p=>patch=p}))
 const u=userEvent.setup();await u.click(screen.getByText('已命名连接与无密钥配置文件'));fireEvent.change(screen.getByLabelText('主模型 连接名称'),{target:{value:'Research'}});await u.click(screen.getByRole('button',{name:'将当前连接另存到浏览器'}));assert.equal(readConnectionLibrary().length,1)
 await u.click(screen.getByRole('button',{name:'应用连接到主模型（不含密钥）'}));assert.equal(patch.custom.protocol,'openai-chat');assert.equal(patch.modelId,undefined)
 await u.click(screen.getByRole('button',{name:'删除连接条目'}));assert.equal(readConnectionLibrary().length,0)
})

test('native historical thinking identity keys still restore after custom binding extension',()=>{
 const id={provider:'openai',modelId:'gpt-5',protocol:'openai-chat-completions'},oldKey=JSON.stringify(['main','openai','gpt-5','openai-chat-completions',''])
 const restored=reconcileThinkingSettings({version:1,roles:{},savedSelections:{[oldKey]:{...id,options:{effort:'low'}}}},{main:id,vision:id,image:id})
 assert.equal(restored.roles.main.options.effort,'low')
})

test('damaged layered history stays editable without silently enabling an official fallback',()=>{
 const d=main();d.declared=true;d.custom.limitPolicy={version:1,service:{input:{maxCount:'broken'}},user:{}};const s=storage();s.setItem('tuyan.universal-api.v1',JSON.stringify({version:1,roles:{main:d}}))
 const restored=loadUniversalDrafts(s).main;assert.equal(restored.modelId,'gpt-5');assert.equal(restored.declared,false);assert.equal(restored.ui.capabilityMode,'manual');assert.throws(()=>universalDraftRoute(restored));assert.equal(restored.custom.limitPolicy.user.input.maxCount,d.custom.inputLimits.maxCount)
})

test('closing the editor captures live keyboard scroll even before a scroll event fires',async()=>{
 render(React.createElement(ModelPicker,{label:'主模型',role:'main',route:{accessProvider:'custom',modelId:'x'},registry:{providers:{}},allowCustom:true,renderCustomSettings:()=>React.createElement('p',null,'draft')}))
 const u=userEvent.setup();await u.click(screen.getByRole('button',{name:'主模型',exact:true}));const editor=document.querySelector('.model-custom-editor');editor.scrollTop=348
 fireEvent.keyDown(window,{key:'Escape'});await waitFor(()=>assert.equal(screen.queryByRole('dialog'),null));await u.click(screen.getByRole('button',{name:'主模型',exact:true}));await waitFor(()=>assert.equal(document.querySelector('.model-custom-editor').scrollTop,348))
})
