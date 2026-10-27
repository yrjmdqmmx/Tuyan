import { changeControl } from './menu-helpers.mjs';
import {IDBFactory} from 'fake-indexeddb';
import test,{afterEach} from 'node:test'
import assert from 'node:assert/strict'
import {File} from 'node:buffer'
import React from 'react'
import {act,render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react'
import App from '../src/App.jsx'
import {STATIC_MODEL_REGISTRY} from '../src/lib/staticModelCatalog.js'
import {TAXONOMY_VERSION} from '../../../packages/figure-taxonomy/src/index.js'
const originalFetch=globalThis.fetch,originalImage=globalThis.Image;
globalThis.DOMParser=window.DOMParser;
globalThis.localStorage=window.localStorage;
afterEach(()=>{cleanup();window.localStorage.clear();globalThis.fetch=originalFetch;globalThis.Image=originalImage})
async function setup(mode='simple'){
 globalThis.indexedDB=new IDBFactory();
 if(mode==='advanced')window.localStorage.setItem('tuyan.model-routing.v1',JSON.stringify({mode:'advanced',roles:{main:{accessProvider:'openai',modelId:'gpt-5.6-sol'},image:{accessProvider:'openai',modelId:'gpt-image-2'},vision:{accessProvider:'openai',modelId:'gpt-4.1'}}}));
 globalThis.Image=class{width=64;height=64;naturalWidth=64;naturalHeight=64;set src(v){queueMicrotask(()=>this.onload?.())}};
 const originals=new Map();let next=0;
 globalThis.fetch=async(_url,init={})=>{
  if(init.method==='PUT')return new Response('');
  const b=init.body?JSON.parse(init.body):null;
  if(b?.action==='prepareMaterialUpload'){const f=b.files[0],id='file-'+(++next);originals.set(id,{id,filename:f.filename,size:f.size,format:f.filename.split('.').pop(),status:'uploaded',sha256:'a'.repeat(64),expiresAt:'2026-11-12T00:00:00Z'});return Response.json({code:0,uploads:[{id,uploadUrl:'https://fixture.test/put/'+id,mimeType:'text/plain'}]})}
  if(b?.action==='listMaterialFiles')return Response.json({code:0,files:[...originals.values()]});
  if(b?.action==='finalizeMaterialUpload'||b?.action==='getMaterial')return Response.json({code:0,file:originals.get(b.materialId)});
  return Response.json(!b?{code:0,runtime:'gateway'}:b.action==='modelRegistry'?{code:0,materialFileVersion:2,materialWorkflowVersion:1,figureTaxonomyVersion:TAXONOMY_VERSION,workflowContractVersion:2,routeContractVersion:1,providers:STATIC_MODEL_REGISTRY}:{code:0,jobs:[],references:[],total:0,page:1,pageSize:12})};
 await act(async()=>{render(React.createElement(App));await new Promise(r=>setTimeout(r,0))});fireEvent.click(screen.getByRole('button',{name:'打开完整设置'}));await waitFor(()=>assert.ok(screen.getByLabelText('检索设置')));
}
for(const mode of ['none','auto','random','manual'])test(`uploads/replacement/removal/save failures preserve ${mode}, and preferences are auto-only`,async()=>{
 await setup();changeControl(screen.getByLabelText('检索设置'),{target:{value:mode}});assert.equal(screen.queryByText('参考图偏好')!==null,mode==='auto');fireEvent.click(screen.getByRole('button',{name:'关闭生成设置'}));
 const input=screen.getByLabelText('上传文件');await waitFor(()=>assert.equal(input.disabled,false));
 changeControl(input,{target:{files:[new File(['group,value\nA,35'],'values.csv',{type:'text/csv'})]}});await waitFor(()=>assert.ok(screen.getByText('已保存到浏览器 · 待读取')));assert.ok(screen.getByText('values.csv'));
 changeControl(screen.getByLabelText('替换 values.csv'),{target:{files:[new File(['{"B":12}'],'replacement.json',{type:'application/json'})]}});await waitFor(()=>assert.ok(screen.getByText('replacement.json')));
 assert.equal(screen.queryByText('已保存的文件',{exact:true}),null);assert.equal(screen.queryByText('暂无可用原件'),null);assert.ok(screen.getByText('最多 10 份文件，每份最大 10 MB，文件先保存在此浏览器，确认成功后仅在提交任务时上传；服务器在任务结束后清理临时材料。'));assert.equal(screen.queryByText('values.csv'),null);assert.ok(screen.getByText('已保存到浏览器 · 待读取'));assert.equal(screen.queryByText('文件与读取详情'),null);
 changeControl(input,{target:{files:[new File(['invalid old deck'],'legacy.ppt',{type:'application/vnd.ms-powerpoint'})]}});await waitFor(()=>assert.ok(screen.getByText('保存失败')));
 changeControl(input,{target:{files:[new File([new Uint8Array([1,2,3])],'visual.png',{type:'image/png'})]}});await waitFor(()=>assert.ok(screen.getByText('visual.png')));
 fireEvent.click(screen.getByRole('button',{name:'打开完整设置'}));assert.equal(screen.getByLabelText('检索设置').value,mode);assert.equal(screen.getByLabelText('检索设置').disabled,false);assert.equal(JSON.parse(window.localStorage.getItem('tuyan.figure-settings.v1')).retrievalSetting,mode);
 fireEvent.click(screen.getByRole('button',{name:'关闭生成设置'}));fireEvent.click(screen.getByRole('button',{name:'移除 visual.png'}));fireEvent.click(screen.getByRole('button',{name:'移除 legacy.ppt'}));fireEvent.click(screen.getByRole('button',{name:'打开完整设置'}));assert.equal(screen.getByLabelText('检索设置').value,mode);
})
test('SVG hides unused image model, retains PNG selection, and no specialized data form is shown',async()=>{
 await setup('advanced');assert.ok(document.querySelector('[data-model-role="image"]'));changeControl(screen.getByLabelText('导出格式'),{target:{value:'svg'}});await waitFor(()=>assert.equal(document.querySelector('[data-model-role="image"]'),null));changeControl(screen.getByLabelText('导出格式'),{target:{value:'png'}});assert.ok(document.querySelector('[data-model-role="image"]'));
})
