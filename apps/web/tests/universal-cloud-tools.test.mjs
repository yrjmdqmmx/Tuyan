import test,{afterEach} from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import {cleanup,render,screen,fireEvent} from '@testing-library/react'
import {emptyUniversalDraft,updateUniversalDraft,universalDraftRoute,serializeUniversalDrafts,loadUniversalDrafts,bindUniversalKey,universalKeyEnvelope} from '../src/lib/universalApi.js'
import {CONNECTION_TEMPLATES,templatePatch,protocolPatch,copyUniversalConnection} from '../src/lib/universalPresentation.js'
import {exportUniversalConfiguration,importUniversalConfiguration,universalImportDiff} from '../src/lib/universalProfiles.js'
import {universalCredential} from '../src/lib/universalContract.js'
import {buildModelSubmission,DEFAULT_WEB_PROVIDER} from '../src/lib/modelRouting.js'
import {universalThinkingIdentity,compileThinkingSelection} from '../src/lib/thinking.js'
import {thinkingIdentities,reconcileThinkingSettings,rememberThinkingSettings,buildThinkingSubmission} from '../src/lib/thinkingSettings.js'
import UniversalExtensions from '../src/components/UniversalExtensions.jsx'
const draft=(id,role='image')=>updateUniversalDraft(emptyUniversalDraft(role),templatePatch(CONNECTION_TEMPLATES.find(x=>x.id===id),role)).draft
afterEach(cleanup)
test('cloud/tool templates preserve TokenDance default and independent role data',()=>{
 assert.equal(DEFAULT_WEB_PROVIDER,'tokendance')
 const main=emptyUniversalDraft('main'),image=draft('openai-image-tool'),before=structuredClone(main)
 const route=universalDraftRoute(image);assert.equal(route.custom.protocol,'openai-responses');assert.equal(route.modelId,'gpt-4.1');assert.equal(route.custom.imageTool.model,'gpt-image-1.5');assert.deepEqual(main,before)
 const xai=universalDraftRoute(draft('xai-image-tool'));assert.deepEqual(xai.custom.outputSizes,[{resolution:'auto',aspectRatio:'auto',value:'auto'}])
 const bedrock=universalDraftRoute(draft('bedrock-text','vision'));assert.equal(bedrock.custom.capabilities.vision,true);assert.equal(bedrock.custom.capabilities.imageGeneration,false)
})
test('extensions survive browser/file round-trip with no keys or validation; imported capabilities require review',()=>{
 const d=draft('openai-image-tool');d.modelId='gpt-5';d.custom.imageTool.quality='high'
 const think={...universalThinkingIdentity(universalDraftRoute(d)),options:{effort:'low'}}
 const key=bindUniversalKey(d,'never-persist'),saved=serializeUniversalDrafts({image:d})
 assert.doesNotMatch(saved,/never-persist|apiKey|verified/)
 const restored=loadUniversalDrafts({getItem:()=>saved}).image;assert.deepEqual(restored.custom.imageTool,d.custom.imageTool)
 const file=exportUniversalConfiguration('image',d,[],think),imported=importUniversalConfiguration(file,'image')
 assert.deepEqual(imported.draft.custom.imageTool,d.custom.imageTool);assert.equal(imported.draft.declared,false);assert.equal(imported.draft.ui.capabilityMode,'manual');assert.equal(imported.thinking.options.effort,'low')
 assert.ok(universalImportDiff(emptyUniversalDraft('image'),imported).changes.some(x=>x.label==='Responses 图像工具'))
 assert.equal(JSON.parse(universalKeyEnvelope({image:d},{image:key})).custom_image.apiKey,'never-persist')
})
test('old backend cannot silently ignore tool/cloud extensions',()=>{
 const image=universalDraftRoute(draft('xai-image-tool')),r={main:{accessProvider:'openai',modelId:'gpt-4.1'},vision:{accessProvider:'openai',modelId:'gpt-4.1'},image}
 const input={configurationMode:'advanced',modelRoutes:r,registry:{routeContractVersion:1,universalApiContractVersion:1}}
 assert.throws(()=>buildModelSubmission(input),/尚未支持/);assert.equal(buildModelSubmission({...input,registry:{...input.registry,universalExtensionsVersion:1}}).modelRoutes.image,image)
})
test('protocol switch retains incompatible drafts, clears only bound key, and explicit copy never imports model/tool',()=>{
 const d=draft('openai-image-tool');d.ui.baseUrlSource='user'
 const change=updateUniversalDraft(d,protocolPatch(d,'openai-images'));assert.equal(change.clearKey,true);assert.deepEqual(change.draft.custom.imageTool,d.custom.imageTool);assert.equal(change.draft.custom.baseUrl,d.custom.baseUrl);assert.throws(()=>universalDraftRoute(change.draft))
 const copy=copyUniversalConnection(emptyUniversalDraft('main'),d,bindUniversalKey(d,'secret'),false);assert.equal(copy.copiedKey,undefined);assert.equal(copy.draft.custom.imageTool,undefined);assert.equal(copy.draft.modelId,'')
})
test('expiring tokens bind expiry in current page only and cannot be used after expiry',()=>{
 const d=draft('bedrock-text','main'),expiresAt=new Date(Date.now()+3600000).toISOString(),key=bindUniversalKey(d,{apiKey:'bedrock-secret',expiresAt})
 const env=universalKeyEnvelope({main:d},{main:key});assert.equal(universalCredential(universalDraftRoute(d),env),'bedrock-secret')
 assert.doesNotMatch(serializeUniversalDrafts({main:d}),/bedrock-secret|expiresAt/)
 assert.throws(()=>universalCredential(universalDraftRoute(d),universalKeyEnvelope({main:d},{main:{...key,expiresAt:'2000-01-01'}})))
})
test('tool UI displays only applicable fields and explicit unsupported-service recovery',()=>{
 let patch;const d=draft('xai-image-tool'),v=render(React.createElement(UniversalExtensions,{draft:d,role:'image',onChange:p=>patch=p}))
 assert.equal(screen.queryByLabelText('图像工具质量'),null);assert.equal(screen.queryByLabelText('图像工具格式'),null)
 v.rerender(React.createElement(UniversalExtensions,{draft:draft('openai-image-tool'),role:'image',onChange:p=>patch=p}));fireEvent.change(screen.getByLabelText('图像工具格式'),{target:{value:'jpeg'}});assert.equal(patch.custom.imageTool.format,'jpeg')
 const b=draft('bedrock-image');b.modelId='stability.sd3-5-large-v1:0';v.rerender(React.createElement(UniversalExtensions,{draft:b,role:'image',onChange:p=>patch=p}));fireEvent.change(screen.getByLabelText('Bedrock 重绘强度'),{target:{value:'0.65'}});assert.equal(patch.custom.bedrock.strength,0.65)
})
test('image orchestration thinking supports editing and restores by exact tool identity',()=>{
 const d=draft('openai-image-tool');d.modelId='gpt-5';const r=universalDraftRoute(d),routes={main:r,vision:r,image:r},ids=thinkingIdentities(routes,{},{}),settings=reconcileThinkingSettings(null,ids);settings.roles.image.options={effort:'low'}
 const snapshot=compileThinkingSelection(settings.roles.image,'image');assert.equal(snapshot.wire.reasoning.effort,'low')
 assert.equal(buildThinkingSubmission(settings,{thinkingContractVersion:1,universalThinkingVersion:1},['image'],'editing').thinkingConfig.roles.image.options.effort,'low')
 const changed=structuredClone(r);changed.custom.imageTool.model='gpt-image-1';const other=thinkingIdentities({...routes,image:changed},{},{})
 const saved=rememberThinkingSettings(settings,null),newSettings=reconcileThinkingSettings(saved,other);assert.deepEqual(newSettings.roles.image.options,{})
 assert.equal(reconcileThinkingSettings(rememberThinkingSettings(newSettings,saved),ids).roles.image.options.effort,'low')
})
