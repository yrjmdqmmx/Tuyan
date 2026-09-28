import assert from 'node:assert/strict'
import {test,afterEach} from 'node:test'
import React,{useState} from 'react'
import {render,screen,within,fireEvent,cleanup,waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UniversalApiSettings from '../src/components/UniversalApiSettings.jsx'
import UniversalCapabilities from '../src/components/UniversalCapabilities.jsx'
import {emptyUniversalDraft,updateUniversalDraft,bindUniversalKey,saveUniversalDrafts,loadUniversalDrafts,officialDeclaration,universalDraftRoute} from '../src/lib/universalApi.js'
import {CONNECTION_TEMPLATES,templatePatch,protocolPatch,copyUniversalConnection} from '../src/lib/universalPresentation.js'
const originalFetch=globalThis.fetch
const blank=()=>Object.fromEntries(['main','vision','image'].map(r=>[r,emptyUniversalDraft(r)]))
const storage=()=>{const values=new Map();return {getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)}}
function Harness({initial=blank(),initialKeys={},onLogin=()=>{}}){
 const [drafts,setDrafts]=useState(initial),[keys,setKeys]=useState(initialKeys)
 return React.createElement(UniversalApiSettings,{drafts,keys,contractSupported:true,apiBase:'https://api.example.com',health:{backendMode:'gateway'},onOpenLogin:onLogin,
 onChange:(r,p)=>{const update=updateUniversalDraft(drafts[r],p);setDrafts(d=>({...d,[r]:update.draft}));if(update.clearKey)setKeys(k=>({...k,[r]:undefined}))},
 onKeyChange:(r,k)=>setKeys(keys=>({...keys,[r]:bindUniversalKey(drafts[r],k)})),
 onCopy:(r,source,include)=>{const result=copyUniversalConnection(drafts[r],drafts[source],keys[source],include);setDrafts(d=>({...d,[r]:result.draft}));if(include||result.clearKey)setKeys(k=>({...k,[r]:result.copiedKey}))},onSave:()=>true})
}
const main=()=>within(screen.getByRole('group',{name:'主模型'}))
afterEach(()=>{cleanup();globalThis.fetch=originalFetch})
test('protocol changes distinguish typed official URL from prefill; legacy addresses are user-owned across persistence',()=>{
 let d=emptyUniversalDraft('main');assert.equal(protocolPatch(d,'anthropic-messages').custom.baseUrl,'https://api.anthropic.com/v1')
 d=updateUniversalDraft(d,{custom:{baseUrl:d.custom.baseUrl}}).draft
 assert.equal(protocolPatch(d,'anthropic-messages').custom.baseUrl,undefined)
 const store=storage();saveUniversalDrafts({main:d},store);assert.equal(protocolPatch(loadUniversalDrafts(store).main,'anthropic-messages').custom.baseUrl,undefined)
 const legacy={...d};delete legacy.ui;store.setItem('tuyan.universal-api.v1',JSON.stringify({version:1,roles:{main:legacy}}));assert.equal(loadUniversalDrafts(store).main.ui.baseUrlSource,'user')
})
test('connection templates never copy model capabilities or guess unknown provider abilities',()=>{
 for(const template of CONNECTION_TEMPLATES.filter(x=>!x.modelId&&!x.imageTool)){const d=emptyUniversalDraft('main');d.modelId='gpt-4.1';const changed=updateUniversalDraft(d,templatePatch(template,'main')).draft;assert.deepEqual(changed.custom.capabilities,d.custom.capabilities);assert.equal(changed.modelId,d.modelId);assert.equal(changed.custom.connectionId,'custom_main');if(template.id==='openrouter')assert.equal(officialDeclaration(changed),null)}
})
test('pure text hides image limits without mutating them; image input remains visible on main and reference generation',()=>{
 let d=emptyUniversalDraft('main');d.declared=true;d.custom.capabilities.text=true
 const before=structuredClone(d.custom);const view=render(React.createElement(UniversalCapabilities,{draft:d,role:'main',label:'主模型',onChange:()=>{}}))
 assert.equal(screen.queryByLabelText('主模型 单图 MiB'),null);assert.equal(screen.queryByLabelText('主模型 输出单图 MiB'),null);assert.deepEqual(d.custom,before)
 d=structuredClone(d);d.custom.capabilities.vision=true;view.rerender(React.createElement(UniversalCapabilities,{draft:d,role:'main',label:'主模型',onChange:()=>{}}));assert.ok(screen.getByLabelText('主模型 单图 MiB'));assert.equal(screen.queryByLabelText('主模型 输出单图 MiB'),null)
 d.custom.protocol='gemini-generate-content';d.custom.capabilities.imageGeneration=true;view.rerender(React.createElement(UniversalCapabilities,{draft:d,role:'image',label:'图像模型',onChange:()=>{}}));assert.ok(screen.getByLabelText('图像模型 单图 MiB'));assert.ok(screen.getByLabelText('图像模型 输出单图 MiB'))
 d.custom.capabilities.vision=false;d.custom.capabilities.imageEditing=true;view.rerender(React.createElement(UniversalCapabilities,{draft:d,role:'image',label:'图像模型',onChange:()=>{}}));assert.ok(screen.getByLabelText('图像模型 单图 MiB'))
})
test('legacy limit objects, raw sizes and confirmed capability declarations round-trip exactly, without keys or verification',()=>{
 const ds=blank();for(const [role,d] of Object.entries(ds)){d.modelId='Legacy/'+role;d.declared=true;d.custom.inputLimits.maxCount=3;d.custom.outputSizes=[{resolution:'custom-2',aspectRatio:'7:5',value:'1433x1024'}];d.validation={verified:true};d.apiKey='not-persistent';delete d.ui}
 const store=storage();saveUniversalDrafts(ds,store);const restored=loadUniversalDrafts(store)
 for(const r of Object.keys(ds)){const {limitPolicy,...restoredCustom}=restored[r].custom;assert.deepEqual(restoredCustom,ds[r].custom);assert.deepEqual(limitPolicy.user,{input:ds[r].custom.inputLimits,output:ds[r].custom.outputLimits});assert.deepEqual(limitPolicy.service,{});assert.equal(restored[r].modelId,ds[r].modelId);assert.equal(restored[r].declared,true)}
 assert.doesNotMatch(store.getItem('tuyan.universal-api.v1'),/not-persistent|validation|verified/)
})
test('explicit connection-only copy excludes key and all model declarations; key copy preserves target connection ID',()=>{
 const source=emptyUniversalDraft('main'),target=emptyUniversalDraft('image');source.custom.baseUrl='https://private.example.com/v1';target.modelId='My/Image';target.declared=true
 const key=bindUniversalKey(source,'source-fixture');const no=copyUniversalConnection(target,source,key,false);assert.equal(no.copiedKey,undefined);assert.equal(no.clearKey,true);assert.equal(no.draft.modelId,'My/Image');assert.deepEqual(no.draft.custom.capabilities,target.custom.capabilities);assert.deepEqual(no.draft.custom.inputLimits,target.custom.inputLimits);assert.equal(no.draft.declared,false)
 const yes=copyUniversalConnection(target,source,key,true);assert.equal(yes.copiedKey.apiKey,key.apiKey);assert.equal(yes.draft.custom.connectionId,'custom_image');assert.equal(copyUniversalConnection(target,source,{...key,baseUrl:'https://stale.example.com'},true).copiedKey,undefined)
})
test('typed address survives protocol change; clear-key reason and explicit reset are visible',async()=>{
 render(React.createElement(Harness));const u=userEvent.setup();await u.click(main().getByText(/^连接详情/))
 fireEvent.change(screen.getByLabelText('主模型 Base URL'),{target:{value:'https://custom.example.com/v1'}})
 fireEvent.change(screen.getByLabelText('主模型 API Key'),{target:{value:'fixture'}})
 fireEvent.change(screen.getByLabelText('主模型 API 协议'),{target:{value:'anthropic-messages'}})
 assert.equal(screen.getByLabelText('主模型 Base URL').value,'https://custom.example.com/v1');assert.equal(screen.getByLabelText('主模型 API Key').value,'');assert.match(main().getByText(/已清除当前角色的旧 Key/).textContent,/API 协议.*认证方式/)
 await u.click(main().getByRole('button',{name:'恢复此协议官方连接参数'}));assert.equal(screen.getByLabelText('主模型 Base URL').value,'https://api.anthropic.com/v1')
})
test('incompatible declarations survive protocol switches and have an explicit repair action',async()=>{
 const ds=blank();ds.main.custom.capabilities={text:true,vision:true,imageGeneration:true,imageEditing:true};ds.main.custom.protocol='gemini-generate-content';ds.main.custom.baseUrl='https://other.example.com/v1beta';ds.main.custom.auth='x-goog-api-key';ds.main.custom.outputSizes=[{resolution:'1K',aspectRatio:'1:1',value:'1K'}]
 render(React.createElement(Harness,{initial:ds}));const u=userEvent.setup();fireEvent.change(screen.getByLabelText('主模型 API 协议'),{target:{value:'anthropic-messages'}});await u.click(main().getByText('能力与限额',{exact:true}));assert.equal(main().getByLabelText('生成图片').checked,true);assert.ok(main().getByText(/当前协议无法使用/));await u.click(main().getByRole('button',{name:'取消以上不兼容能力'}));assert.equal(main().queryByLabelText('生成图片'),null);assert.equal(main().getByLabelText('接收图片并理解内容').checked,true)
})
const errors=[['CATALOG_AUTH_FAILED','重新填写 Key'],['CATALOG_PERMISSION_DENIED','手动填写模型 ID'],['CATALOG_ENDPOINT_NOT_FOUND','修改接口地址'],['CATALOG_RATE_LIMITED','重试读取目录'],['CATALOG_TIMEOUT','修改接口地址'],['CATALOG_RESPONSE_INVALID','调整目录规则']]
for(const [code,button] of errors)test(`catalog ${code} exposes recovery and preserves manual ID without inference`,async()=>{
 const calls=[];globalThis.fetch=async(url,init)=>{calls.push(JSON.parse(init.body));return Response.json({code:400,error:'safe fixture',catalogError:{code}})}
 render(React.createElement(Harness));const u=userEvent.setup();fireEvent.change(screen.getByLabelText('主模型 API Key'),{target:{value:'fixture'}});fireEvent.change(screen.getByLabelText('主模型 模型 ID'),{target:{value:'Manual/Keep'}});await u.click(main().getByRole('button',{name:'获取模型'}));await waitFor(()=>assert.ok(main().getByRole('alert')))
 assert.ok(main().getByRole('button',{name:button,exact:true}));assert.equal(screen.getByLabelText('主模型 模型 ID').value,'Manual/Keep');assert.equal(calls.length,1);assert.equal(calls[0].check,'catalog')
 await u.click(main().getByRole('button',{name:'手动填写模型 ID',exact:true}));await waitFor(()=>assert.equal(document.activeElement?.getAttribute('aria-label'),'主模型 模型 ID'))
 assert.ok(main().getByText('未验证 · 本表单不执行模型调用'))
})
test('configuration structure, safe address, directory and inference remain separate; config check sends no key',async()=>{
 const calls=[];globalThis.fetch=async(url,init)=>{calls.push(JSON.parse(init.body));return Response.json({code:0,state:'configuration-valid',inferenceVerified:false})}
 render(React.createElement(Harness));const u=userEvent.setup();fireEvent.change(screen.getByLabelText('主模型 模型 ID'),{target:{value:'gpt-4.1'}});fireEvent.change(screen.getByLabelText('主模型 API Key'),{target:{value:'fixture-secret'}})
 assert.ok(main().getByText('已填写 · 未验证 · 仅当前页有效'));await u.click(main().getByRole('button',{name:'检查配置与地址'}));await main().findByText('已通过安全检查');assert.ok(main().getByText('尚未获取模型'));assert.ok(main().getByText('未验证 · 本表单不执行模型调用'));assert.doesNotMatch(JSON.stringify(calls),/fixture-secret/)
})
test('audited size chips use exact mappings; custom hosts never receive same-named official choices',async()=>{
 const d=emptyUniversalDraft('image');d.modelId='gpt-image-1.5';const audit=officialDeclaration(d);assert.ok(audit?.outputSizes.length)
 let current={...d,ui:{...d.ui,capabilityMode:'manual'},custom:{...audit,outputSizes:[]}},latest
 const view=render(React.createElement(UniversalCapabilities,{draft:current,role:'image',label:'图像模型',onChange:p=>{latest=p}}));const group=screen.getByRole('group',{name:'图像模型 已核对尺寸选择'});const row=audit.outputSizes[0];await userEvent.setup().click(within(group).getAllByRole('button')[0]);assert.deepEqual(latest.custom.outputSizes,[row])
 current={...current,custom:{...current.custom,baseUrl:'https://other.example.com/v1'}};view.rerender(React.createElement(UniversalCapabilities,{draft:current,role:'image',label:'图像模型',onChange:()=>{}}));assert.equal(screen.queryByRole('group',{name:'图像模型 已核对尺寸选择'}),null);assert.ok(screen.getByText('高级手动编辑尺寸与输出限制'))
})

test('copy scopes are explicit before action and leave target role model and capability fields independent',async()=>{
 const ds=blank();ds.main.custom.baseUrl='https://shared.example.com/v1';ds.main.modelId='Source/Main';ds.vision.modelId='Target/Vision';ds.image.modelId='Target/Image'
 render(React.createElement(Harness,{initial:ds,initialKeys:{main:bindUniversalKey(ds.main,'source-fixture'),vision:bindUniversalKey(ds.vision,'old-vision')}}));const u=userEvent.setup();const vision=within(screen.getByRole('group',{name:'视觉模型'}))
 await u.click(vision.getByText('从主模型复制连接',{exact:true}));assert.ok(vision.getByText(/不复制型号、能力、限额或尺寸/))
 await u.click(vision.getByRole('button',{name:'仅复制连接（不含密钥）',exact:true}));assert.equal(screen.getByLabelText('视觉模型 API Key').value,'');assert.equal(screen.getByLabelText('视觉模型 模型 ID').value,'Target/Vision')
 await u.click(vision.getByRole('button',{name:'复制连接与当前页密钥',exact:true}));assert.equal(screen.getByLabelText('视觉模型 API Key').value,'source-fixture');assert.equal(screen.getByLabelText('图像模型 API Key').value,'');assert.equal(screen.getByLabelText('图像模型 模型 ID').value,'Target/Image')
})
test('saved incompatible compatibility variant is retained with a visible repair, and raw dimension conflicts are not silently replaced',async()=>{
 const ds=blank();ds.main.custom.compatibility='openrouter-image';ds.main.custom.protocol='anthropic-messages';ds.main.custom.auth='x-api-key'
 render(React.createElement(Harness,{initial:ds}));const u=userEvent.setup();await u.click(main().getByText('认证与兼容选项',{exact:true}));await u.click(main().getByRole('button',{name:'改为标准兼容模式（保留能力草稿）'}));assert.equal(main().queryByRole('button',{name:'改为标准兼容模式（保留能力草稿）'}),null)
 cleanup();const d=emptyUniversalDraft('image');d.modelId='gpt-image-1.5';const audit=officialDeclaration(d),row=audit.outputSizes[0];d.ui.capabilityMode='manual';d.custom={...audit,outputSizes:[{...row,value:'user-mapping'}]};render(React.createElement(UniversalCapabilities,{draft:d,role:'image',label:'图像模型',onChange:()=>{throw Error('must not silently replace custom size')}}));const first=within(screen.getByRole('group',{name:'图像模型 已核对尺寸选择'})).getAllByRole('button')[0];assert.equal(first.disabled,true);assert.match(first.title,/已有不同接口值/)
})

test('locally invalid configuration never claims an address check and no request is sent',async()=>{
 const calls=[];globalThis.fetch=async(...args)=>{calls.push(args);throw Error('must not be called')}
 render(React.createElement(Harness));await userEvent.setup().click(main().getByRole('button',{name:'检查配置与地址'}));assert.equal(calls.length,0);assert.ok(main().getByText('尚未检查（先修正配置）',{exact:true}));assert.ok(main().getByText('未验证 · 本表单不执行模型调用'))
})

test('using audited capabilities temporarily never replaces the retained manual limits or incompatible capability draft',async()=>{
 let draft=emptyUniversalDraft('main');draft.modelId='gpt-4.1';draft.custom.capabilities={text:true,vision:false,imageGeneration:true,imageEditing:false};draft.custom.inputLimits.maxBytes=1234567;draft.ui={...draft.ui,manualDraftPresent:true,capabilityMode:'auto'}
 let patch;render(React.createElement(UniversalCapabilities,{draft,role:'main',label:'主模型',onChange:value=>{patch=value}}));await userEvent.setup().click(screen.getByRole('button',{name:'恢复手动草稿'}));assert.equal(patch.custom,undefined);const restored=updateUniversalDraft(draft,patch).draft;assert.deepEqual(restored.custom,draft.custom);assert.equal(restored.ui.capabilityMode,'manual');assert.throws(()=>universalDraftRoute(restored),/没有可直接采用/)
})
