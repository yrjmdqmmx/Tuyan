import assert from 'node:assert/strict'
import {afterEach,test} from 'node:test'
import {readFileSync} from 'node:fs'
import React,{useState} from 'react'
import {act,cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UniversalApiSettings from '../src/components/UniversalApiSettings.jsx'
import {emptyUniversalDraft,bindUniversalKey,updateUniversalDraft,universalDraftFeedback,universalDraftRoute,universalCheckErrorMessage,saveUniversalDrafts,loadUniversalDrafts} from '../src/lib/universalApi.js'
import AspectRatioPicker from '../src/components/AspectRatioPicker.jsx'
const originalFetch=globalThis.fetch
const blank=()=>Object.fromEntries(['main','vision','image'].map(role=>[role,emptyUniversalDraft(role)]))
function Harness(){
 const [drafts,setDrafts]=useState(blank),[keys,setKeys]=useState({})
 return React.createElement(UniversalApiSettings,{drafts,keys,contractSupported:true,health:{backendMode:'laf'},apiBase:'https://api.example.com',
  onChange:(role,patch)=>{const result=updateUniversalDraft(drafts[role],patch);setDrafts(d=>({...d,[role]:result.draft}));if(result.clearKey)setKeys(k=>({...k,[role]:undefined}))},
  onKeyChange:(role,value)=>setKeys(k=>({...k,[role]:bindUniversalKey(drafts[role],value)})),
  onCopy:(role)=>{setDrafts(d=>({...d,[role]:{...d[role],custom:{...d[role].custom,protocol:d.main.custom.protocol,baseUrl:d.main.custom.baseUrl,auth:d.main.custom.auth}}}));setKeys(k=>({...k,[role]:k.main?{...k.main}:undefined}))},onSave:()=>true})
}
const main=()=>within(screen.getByRole('group',{name:'主模型'}))
function mockCatalog(result){const calls=[];globalThis.fetch=async(url,init)=>{const b=JSON.parse(init.body);calls.push(b);const value=typeof result==='function'?result(b):result;return Response.json({code:0,...value,...(value.code?{error:value.message}:{})})};return calls}
const catalog=(models=['Vendor/Exact-v1','Vendor/Other'])=>({state:'catalog-visible',models:models.map(id=>({id})),warnings:[],fetchedAt:'2026-09-20T10:00:00Z',complete:true,truncated:false,verified:false,inferenceVerified:false,message:'目录获取成功，未验证真实调用。'})
afterEach(()=>{cleanup();globalThis.fetch=originalFetch;window.localStorage.clear()})
test('empty fields and typing use guidance; unknown capability notice waits for blur and known capabilities do not require key',async()=>{
 render(React.createElement(Harness));const user=userEvent.setup()
 assert.equal(screen.queryAllByRole('alert').length,0)
 assert.equal(screen.queryByText(/暂无已核对的能力记录/),null)
 assert.ok(main().getByText(/先获取模型并选择/))
 const input=screen.getByLabelText('主模型 模型 ID');await user.type(input,'Private/Exact-v1')
 assert.equal(screen.queryByText(/暂无已核对的能力记录/),null)
 await user.tab();assert.ok(main().getByText(/主模型需要文本生成能力/))
 assert.equal(input.closest('fieldset').querySelector('details[open]'),null)
 await user.click(input);await user.type(input,'2');assert.equal(screen.queryByText(/暂无已核对的能力记录/),null)
 const known=emptyUniversalDraft('main');known.modelId='gpt-4.1'
 assert.equal(universalDraftFeedback(known,'main').tone,'success')
 assert.equal(universalDraftRoute(known).modelId,'gpt-4.1')
 const changed=updateUniversalDraft(known,{custom:{baseUrl:'https://other.example.com/v1'}}).draft
 assert.equal(universalDraftFeedback(changed,'main').tone,'warning')
})
test('directory fetch needs connection and key only; search and explicit selection preserve exact IDs and manual entry',async()=>{
 const calls=mockCatalog(catalog());render(React.createElement(Harness));const user=userEvent.setup()
 fireEvent.change(screen.getByLabelText('主模型 API Key'),{target:{value:'fixture-key'}})
 await user.click(main().getByRole('button',{name:'获取模型'}));await screen.findByLabelText('主模型 搜索模型')
 assert.equal(calls[0].route,undefined);assert.equal(calls[0].connection.protocol,'openai-chat');assert.equal(calls[0].selectedModelId,undefined)
 assert.equal(screen.getByLabelText('主模型 模型 ID').value,'')
 assert.equal(Object.keys(JSON.parse(calls[0].apiKeys.custom)).length,1)
 fireEvent.change(screen.getByLabelText('主模型 搜索模型'),{target:{value:'exact'}})
 assert.equal(main().queryByRole('button',{name:/Vendor\/Other/}),null)
 await user.click(main().getByRole('button',{name:/Vendor\/Exact-v1/}))
 assert.equal(screen.getByLabelText('主模型 模型 ID').value,'Vendor/Exact-v1')
 assert.ok(main().getByText(/暂无已核对的能力记录/));assert.ok(main().getByLabelText('主模型 搜索模型'))
 fireEvent.change(screen.getByLabelText('主模型 模型 ID'),{target:{value:'Manual/Exact-v2'}})
 assert.ok(main().getByText(/Manual\/Exact-v2.*已保留/))
 await user.click(main().getByRole('button',{name:'重新获取模型'}))
 await waitFor(()=>assert.equal(calls.length,2));assert.equal(screen.getByLabelText('主模型 模型 ID').value,'Manual/Exact-v2')
 assert.ok(screen.getAllByText(/目录可见不代表能力、权限或真实调用/).length)
})
test('unknown services remain manual until an explicit documented catalog rule is chosen',async()=>{
 const calls=mockCatalog(catalog());render(React.createElement(Harness));const user=userEvent.setup()
 fireEvent.change(screen.getByLabelText('主模型 Base URL'),{target:{value:'https://custom.example.com/prefix/v1'}})
 fireEvent.change(screen.getByLabelText('主模型 API Key'),{target:{value:'scoped-key'}})
 assert.equal(main().getByRole('button',{name:'获取模型'}).disabled,true)
 fireEvent.change(screen.getByLabelText('主模型 目录接口规则'),{target:{value:'openai'}})
 await user.click(main().getByRole('button',{name:'获取模型'}));await screen.findByLabelText('主模型 搜索模型')
 assert.equal(calls[0].connection.catalogFormat,'openai');assert.equal(calls[0].connection.baseUrl,'https://custom.example.com/prefix/v1')
})
test('late catalog from a previous key, address, protocol or A-B-A sequence cannot overwrite new config',async()=>{
 let resolveOld;const calls=[];globalThis.fetch=async(_url,init)=>{calls.push(JSON.parse(init.body));if(calls.length===1)return new Promise(resolve=>{resolveOld=resolve});return Response.json({code:0,...catalog(['Current/Model'])})}
 render(React.createElement(Harness));const user=userEvent.setup()
 fireEvent.change(screen.getByLabelText('主模型 API Key'),{target:{value:'key-old'}})
 await user.click(main().getByRole('button',{name:'获取模型'}))
 assert.ok(main().getByRole('button',{name:/正在获取/}).disabled)
 fireEvent.change(screen.getByLabelText('主模型 Base URL'),{target:{value:'https://new.example.com/v1'}})
 assert.equal(screen.getByLabelText('主模型 API Key').value,'')
 fireEvent.change(screen.getByLabelText('主模型 Base URL'),{target:{value:'https://api.openai.com/v1'}})
 fireEvent.change(screen.getByLabelText('主模型 API Key'),{target:{value:'key-new'}})
 await user.click(main().getByRole('button',{name:'获取模型'}));await screen.findByRole('button',{name:/Current\/Model/})
 await act(async()=>resolveOld(Response.json({code:0,...catalog(['Stale/Model'])})))
 assert.equal(screen.queryByRole('button',{name:/Stale\/Model/}),null);assert.ok(screen.getByRole('button',{name:/Current\/Model/}))
 fireEvent.change(screen.getByLabelText('主模型 API Key'),{target:{value:'another-key'}})
 assert.equal(screen.queryByRole('button',{name:/Current\/Model/}),null)
 fireEvent.change(screen.getByLabelText('主模型 API 协议'),{target:{value:'anthropic-messages'}})
 assert.equal(screen.getByLabelText('主模型 API Key').value,'')
})
test('partial, empty, all-invalid and permission errors remain distinct, preserve manual model and never infer',async()=>{
 let response={...catalog(['Valid/ID']),state:'catalog-partial',warnings:[{row:2,code:'invalid_id'}],message:'部分条目异常，正常条目可选择。'}
 const calls=mockCatalog(()=>response);render(React.createElement(Harness));const user=userEvent.setup()
 fireEvent.change(screen.getByLabelText('主模型 模型 ID'),{target:{value:'Manual/ID'}})
 fireEvent.change(screen.getByLabelText('主模型 API Key'),{target:{value:'key'}})
 for(const next of [response,{...catalog([]),state:'catalog-empty',message:'渠道返回空目录。'},{...catalog([]),state:'catalog-invalid',warnings:[{row:0,code:'id_null'}],message:'目录全部条目异常。'},{code:403,message:'获取模型目录失败：访问被拒绝，请检查登录状态及账号权限。'}]){
  response=next;await user.click(main().getByRole('button',{name:/^(获取模型|重新获取模型)$/}));await screen.findByText(next.message)
  assert.equal(screen.getByLabelText('主模型 模型 ID').value,'Manual/ID')
 }
 assert.equal(calls.every(x=>x.action==='universalApiCheck'&&x.check==='catalog'),true)
 assert.ok(main().getByRole('alert'))
})
test('unconfigured aspect ratio and persisted optional catalog rules have neutral guidance',()=>{
 render(React.createElement(AspectRatioPicker,{label:'画面比例',value:'16:9',options:[],emptyMessage:'配置图像模型后可选择画面比例。'}))
 assert.ok(screen.getByText('配置图像模型后可选择画面比例。'))
 const d=blank();d.main.custom.catalogFormat='openai';saveUniversalDrafts(d,window.localStorage)
 assert.equal(loadUniversalDrafts(window.localStorage).main.custom.catalogFormat,'openai')
})
test('three mode cards and every custom action use explicit responsive styles',()=>{
 const css=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8')
 assert.match(css,/\.mode-switch\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/)
 assert.match(css,/\.universal-button\s*\{[^}]*border-radius:\s*8px/)
 assert.match(css,/\.universal-button:disabled/);assert.match(css,/prefers-reduced-motion/)
 render(React.createElement(Harness))
 for(const button of screen.getAllByRole('button'))assert.ok(button.classList.contains('universal-button'),button.textContent)
})

test('network failures and untrusted proxy errors use Chinese safe copy without secrets',()=>{
 const leaked=new Error('upstream rejected sk-fixture-secret https://key@example.com');leaked.status=502
 const msg=universalCheckErrorMessage(leaked,'catalog');assert.match(msg,/获取模型目录暂不可用/);assert.doesNotMatch(msg,/sk-fixture|example.com|upstream/)
 assert.match(universalCheckErrorMessage(new TypeError('Failed to fetch'),'catalog'),/检查网络/)
 assert.match(universalCheckErrorMessage({details:{catalogError:{code:'CATALOG_PERMISSION_DENIED'}},status:403},'catalog'),/权限/)
})

test('HTTP 200 HTML, empty objects, malformed models and contradictory states are errors instead of an empty directory',async()=>{
 let response='<html>maintenance-secret</html>';globalThis.fetch=async()=>typeof response==='string'?new Response(response):Response.json(response)
 render(React.createElement(Harness));const user=userEvent.setup();fireEvent.change(screen.getByLabelText('主模型 API Key'),{target:{value:'fixture'}})
 for(const value of ['<html>maintenance-secret</html>',{}, {...catalog(),models:[{id:null}]},{...catalog(),models:[{id:'same'},{id:'same'}]},{...catalog(),state:'catalog-empty'}]) {
  response=value;await user.click(main().getByRole('button',{name:'获取模型'}));await waitFor(()=>assert.match(main().getByRole('alert').textContent,/目录.*格式/))
  assert.equal(main().queryByText(/本次获取 0 个/),null);assert.doesNotMatch(main().getByRole('alert').textContent,/maintenance-secret/)
 }
})
test('official Gemini catalog resource ID reuses exact capabilities but stays unchanged in requests; compatible origins do not inherit them',()=>{
 const d=emptyUniversalDraft('main');d.custom.protocol='gemini-generate-content';d.custom.auth='x-goog-api-key';d.custom.baseUrl='https://generativelanguage.googleapis.com/v1beta';d.modelId='models/gemini-3.8-flash'
 assert.equal(universalDraftFeedback(d,'main').tone,'success');assert.equal(universalDraftRoute(d).modelId,d.modelId)
 assert.equal(universalDraftFeedback({...d,modelId:'models/models/gemini-3.8-flash'},'main').tone,'warning')
 assert.equal(universalDraftFeedback({...d,custom:{...d.custom,baseUrl:'https://google-proxy.example.com/v1beta'}},'main').tone,'warning')
})
