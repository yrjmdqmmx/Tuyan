import { changeControl } from './menu-helpers.mjs';
import {IDBFactory} from 'fake-indexeddb';
import {saveBrowserMaterial,browserFile,listBrowserMaterials} from '../src/lib/browserMaterials.js';
import test,{afterEach} from 'node:test'
import assert from 'node:assert/strict'
import {registerHooks} from 'node:module'
import React from 'react'
import {act,render,screen,fireEvent,cleanup,waitFor,within} from '@testing-library/react'
import {saveFigureSettings} from '../src/lib/figureSettings.js'
import {defaultJournalSelection,journalSnapshot,JOURNAL_SETTINGS_KEY} from '../../../packages/api/src/journal-rules.js'
const originalFetch=globalThis.fetch,originalStorage=globalThis.localStorage,originalScroll=window.scrollTo,originalImage=globalThis.Image
let fixtureFetch=async()=>Response.json(null)
globalThis.fetch=(...args)=>fixtureFetch(...args)
// Exercise real authenticated App behavior in this isolated test worker. Production configuration is unchanged.
const hooks=registerHooks({load(url,context,nextLoad){
 const result=nextLoad(url,context)
 if(url.split('?')[0].endsWith('/src/config.js')) {
  const fixture="({VITE_AUTH_ENABLED:'true',VITE_AUTH_BASE:'https://paperbanana.asia',VITE_API_BASE:'https://paperbanana.asia'})"
  return {...result,source:String(result.source).replace('import.meta.env || {}',fixture).replace('import.meta.env||{}',fixture)}
 }
 return result
}})
const {default:App}=await import('../src/App.jsx')
const config=await import('../src/config.js')
assert.equal(config.AUTH_ENABLED,true,'auth fixture config must enable the real auth path')
hooks.deregister()
let originals=new Map(),uploadBodies=[];
let sessionUser={id:'old-user',email:'old@example.test',name:'Old account'},resolveJob,actions=[],pendingJobs=new Map(),listedJobs
const oldJob={id:'old-task',status:'succeeded',figureTypeId:'bar',figureData:{rows:[{label:'PRIVATE OLD USER',value:777}],source:'PRIVATE OLD STUDY',units:{value:'mg'},options:{}},methodContent:'PRIVATE OLD USER METHODS',caption:'PRIVATE OLD USER CAPTION',outputFormat:'svg'}
function setup(){
 globalThis.indexedDB=new IDBFactory();
 pendingJobs=new Map();listedJobs=[oldJob];resolveJob=undefined;
 window.scrollTo=()=>{}
 globalThis.localStorage=window.localStorage;window.localStorage.clear();actions=[];originals=new Map();uploadBodies=[];sessionUser={id:'old-user',email:'old@example.test',name:'Old account'}
 fixtureFetch=async(input,init={})=>{
  const url=String(input?.url||input)
  if(url==='https://fixture.test/input.png')return new Response(new Uint8Array([1,2,3]),{headers:{'Content-Type':'image/png'}})
  if(url==='https://fixture.test/result.svg')return new Response('<svg xmlns="http://www.w3.org/2000/svg"><text>ORIGINAL SVG LABEL</text></svg>',{headers:{'Content-Type':'image/svg+xml'}})
  if(url.includes('/get-session'))return Response.json(sessionUser?{user:sessionUser,session:{id:'session',userId:sessionUser.id,expiresAt:'2099-01-01T00:00:00.000Z'}}:null)
  if(url.includes('/sign-out')){sessionUser=null;return Response.json({success:true})}
  if(init.method==='PUT'){uploadBodies.push(await init.body.text());return new Response('');}
  const body=init.body?JSON.parse(String(init.body)):null
  if(!body)return Response.json({code:0,runtime:'gateway'})
  actions.push(body.action)
  if(body.action==='modelRegistry')return Response.json({code:0,figureTaxonomyVersion:'2026-10-10.v1',figureExecutionVersion:1,workflowContractVersion:2,materialFileVersion:2,refineUpload:{version:1,mimeTypes:['image/png'],maxBytes:10000000,maxDimension:16384,maxPixels:40000000},providers:{}})
  if(body.action==='prepareMaterialUpload'){const f=body.files[0],id='original-'+originals.size;originals.set(id,{id,filename:f.filename,size:f.size,format:f.filename.split('.').pop(),sha256:'a'.repeat(64),status:'uploaded',expiresAt:'2026-11-12T00:00:00Z'});return Response.json({code:0,uploads:[{id,uploadUrl:'https://fixture.test/upload',mimeType:'text/plain'}]})}
  if(['finalizeMaterialUpload','getMaterial'].includes(body.action))return Response.json({code:0,file:originals.get(body.materialId)});
  if(body.action==='getJob')return new Promise(resolve=>{resolveJob=resolve;pendingJobs.set(body.jobId,resolve)})
  if(['myJobs','userJobs'].includes(body.action))return Response.json({code:0,jobs:listedJobs})
  return Response.json({code:0,jobs:[],references:[]})
 }
 globalThis.fetch=(...args)=>fixtureFetch(...args)
 saveFigureSettings({figureTypeId:'bar',figureDrafts:{bar:{csv:'label,value\nCurrent,1',source:'Current draft',units:{value:'mg'}}},methodContent:'Current safe draft methods',caption:'Current safe caption'},window.localStorage)
}
afterEach(()=>{cleanup();globalThis.Image=originalImage;window.scrollTo=originalScroll;window.localStorage.clear();globalThis.fetch=originalFetch;if(originalStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=originalStorage})
test('logging out invalidates pending saved-record restore before a late reply can write UI or browser storage',async()=>{
 setup();render(React.createElement(App))
 await waitFor(()=>assert.ok(screen.getAllByText('old@example.test').length))
 fireEvent.click(within(screen.getByRole('navigation',{name:'主导航'})).getByRole('button',{name:'任务记录'}))
 const restore=await screen.findByRole('button',{name:'恢复图型与完整输入'})
 fireEvent.click(restore);await waitFor(()=>assert.ok(resolveJob))
 fireEvent.click(within(screen.getByRole('navigation',{name:'主导航'})).getByRole('button',{name:'账户',exact:true}))
 fireEvent.click(await screen.findByRole('button',{name:'退出登录'}))
 await waitFor(()=>assert.ok(screen.queryByText('old@example.test')===null,'Expected no matching DOM element'))
 await act(async()=>{resolveJob(Response.json({code:0,job:oldJob}));await new Promise(resolve=>setTimeout(resolve,0))})
 const stored=window.localStorage.getItem('tuyan.figure-settings.v1')
 assert.equal(stored.includes('PRIVATE OLD'),false)
 assert.equal(JSON.parse(stored).figureDrafts.bar,undefined)
 assert.equal(screen.getByLabelText(/论文方法内容/).value.includes('PRIVATE OLD'),false)
 assert.ok(screen.queryByText('历史任务数据.json')===null,'Expected no matching DOM element')
 assert.ok(screen.queryByText(/PRIVATE OLD STUDY/)===null,'Expected no matching DOM element')
 assert.equal(actions.filter(action=>action==='getJob').length,1)
})

test('SVG result edit restores original inputs and editable source into SVG generation, without entering image refinement',async()=>{
 setup();
 globalThis.Image=class{width=64;height=64;naturalWidth=64;naturalHeight=64;set src(v){queueMicrotask(()=>this.onload?.())}};
 oldJob.referenceImages=[{filename:'original-input.png',mimeType:'image/png',url:'https://fixture.test/input.png',size:3}];oldJob.retrievalSetting='manual';oldJob.manualReferenceIds=['paper-original'];
 oldJob.resultImages=[{filename:'old-task/result.svg',objectKey:'old-task/result.svg',url:'https://fixture.test/result.svg',mimeType:'image/svg+xml'}];
 render(React.createElement(App));await waitFor(()=>assert.ok(screen.getAllByText('old@example.test').length));
 fireEvent.click(within(screen.getByRole('navigation',{name:'主导航'})).getByRole('button',{name:'任务记录'}));
 fireEvent.click(await screen.findByRole('button',{name:'修改 SVG 1'}));await waitFor(()=>assert.ok(resolveJob));
 await act(async()=>{resolveJob(Response.json({code:0,job:oldJob}));});
 await screen.findByText('待修改的SVG源码.txt');
 assert.ok(screen.getByText('历史任务数据.json'));assert.ok(screen.getByText('original-input.png'));
 assert.equal(uploadBodies.length,0);const stored=await listBrowserMaterials(JSON.stringify(['https://api.paperbanana.asia','old-user']));assert.ok(await(await browserFile(JSON.stringify(['https://api.paperbanana.asia','old-user']),stored.find(f=>f.filename==='待修改的SVG源码.txt'))).text().then(t=>t.includes('ORIGINAL SVG LABEL')));assert.ok(screen.getAllByText('已保存到浏览器 · 待读取').length);
 assert.equal(screen.getByLabelText(/论文方法内容/).value,'PRIVATE OLD USER METHODS');
 fireEvent.click(screen.getByRole('button',{name:'打开完整设置'}));
 assert.equal(screen.getByLabelText('导出格式').value,'svg');assert.equal(screen.getByLabelText('检索设置').value,'manual');
 assert.equal(document.querySelector('[data-model-role="image"]'),null);
 assert.equal(actions.filter(a=>a==='refineImage'||a==='createJob').length,0);
 delete oldJob.resultImages;delete oldJob.referenceImages;delete oldJob.retrievalSetting;delete oldJob.manualReferenceIds;
})

test('saved task restores canonical originals, journal version and read records without changing retrieval',async()=>{
 setup();const local=await saveBrowserMaterial(JSON.stringify(['https://api.paperbanana.asia','old-user']),new File(['original PPTX bytes'],'saved-research.pptx'));
 const f={...local,id:'saved-original',clientFileId:local.id,status:'uploaded'};
 const journalSelection={...defaultJournalSelection('frontiers-ai'),version:'2026-10-13.v1',stage:'production',widthMm:180};
 const saved={...oldJob,journalSelection,journalProfile:journalSnapshot(journalSelection),pipelineMode:'demo_full',generationPath:'model-v1',materialFiles:[f],materialReads:[{type:'read',materialId:f.id,recordId:'reading-1',operation:{op:'render',pages:[2]},status:'partial',warnings:['字体替换已记录']}],retrievalSetting:'random'}
 render(React.createElement(App));await waitFor(()=>assert.ok(screen.getAllByText('old@example.test').length));fireEvent.click(within(screen.getByRole('navigation',{name:'主导航'})).getByRole('button',{name:'任务记录'}));fireEvent.click(await screen.findByRole('button',{name:'恢复图型与完整输入'}));await waitFor(()=>assert.ok(resolveJob));await act(async()=>{resolveJob(Response.json({code:0,job:saved}));});await screen.findByText('saved-research.pptx');assert.ok(screen.queryByText('文件与读取详情')===null,'Expected no matching DOM element');assert.equal(await(await browserFile(JSON.stringify(['https://api.paperbanana.asia','old-user']),f)).text(),'original PPTX bytes');assert.ok(screen.getAllByText(/部分读取/).length);fireEvent.click(screen.getByRole('button',{name:'打开完整设置'}));assert.equal(screen.getByLabelText('检索设置').value,'random');assert.equal(screen.getByRole('radio',{name:/完整生成/}).checked,true);assert.ok(!actions.includes('getMaterial'))
 assert.ok(screen.getByRole('button',{name:/Frontiers in Artificial Intelligence.*录用后制作.*180 mm.*2026-10-13.v1/}));
 assert.deepEqual(JSON.parse(window.localStorage.getItem(JOURNAL_SETTINGS_KEY)),journalSelection);
})

test('App reuses chart settings, saves classification changes, and restores the task-specific binding',async()=>{
 setup();
 const journalSelection={...defaultJournalSelection('plos-one'),contentSource:'figure-type',figureTypeId:'bar',contentType:'data'};
 window.localStorage.setItem(JOURNAL_SETTINGS_KEY,JSON.stringify(journalSelection));
 render(React.createElement(App));await waitFor(()=>assert.ok(screen.getAllByText('old@example.test').length));
 fireEvent.click(screen.getByRole('button',{name:'打开完整设置'}));
 fireEvent.click(screen.getByRole('button',{name:'信息图类别'}));
 changeControl(screen.getByRole('searchbox',{name:'搜索图类'}),{target:{value:'流程图'}});
 fireEvent.click(screen.getByRole('button',{name:/^流程图 Flowchart/}));
 await waitFor(()=>assert.equal(JSON.parse(window.localStorage.getItem(JOURNAL_SETTINGS_KEY)).contentType,'schematic'));
 assert.equal(JSON.parse(window.localStorage.getItem(JOURNAL_SETTINGS_KEY)).figureTypeId,'workflow');
 fireEvent.click(screen.getByRole('button',{name:/PLOS ONE.*初次投稿/}));
 fireEvent.click(within(screen.getByRole('navigation',{name:'期刊列表'})).getByRole('button',{name:/PLOS ONE/}));
 assert.ok(screen.getByText(/沿用信息图类别：流程图/));
 fireEvent.click(screen.getAllByRole('button',{name:'返回书架'})[0]);
 fireEvent.click(screen.getByRole('button',{name:/ACS Omega/}));fireEvent.click(screen.getByRole('button',{name:'关闭期刊规则'}));await waitFor(()=>assert.equal(screen.queryByRole('dialog',{name:'期刊规则'}),null));
 assert.equal(JSON.parse(window.localStorage.getItem(JOURNAL_SETTINGS_KEY)).journalId,'plos-one');
 fireEvent.click(screen.getByRole('button',{name:'关闭生成设置'}));
 fireEvent.click(within(screen.getByRole('navigation',{name:'主导航'})).getByRole('button',{name:'精修图片'}));
 assert.equal(JSON.parse(window.localStorage.getItem(JOURNAL_SETTINGS_KEY)).figureTypeId,'workflow','Tab switching must not revive the old category');
 fireEvent.click(within(screen.getByRole('navigation',{name:'主导航'})).getByRole('button',{name:'任务记录'}));
 fireEvent.click(await screen.findByRole('button',{name:'恢复图型与完整输入'}));
 const saved={...oldJob,journalSelection,journalProfile:journalSnapshot(journalSelection)};
 await act(async()=>{resolveJob(Response.json({code:0,job:saved}));});
 await waitFor(()=>assert.deepEqual(JSON.parse(window.localStorage.getItem(JOURNAL_SETTINGS_KEY)),journalSelection));
 assert.equal(saved.journalProfile.selection.figureTypeId,'bar');
 assert.equal(actions.filter(a=>a==='createJob'||a==='refineImage').length,0);
})

test('refining a task reuses its figure and journal; replacing the source discards its judgment and late responses',async()=>{
 setup();
 globalThis.Image=class{naturalWidth=120;naturalHeight=80;set src(v){queueMicrotask(()=>this.onload?.())}};
 const generationSelection={...defaultJournalSelection('plos-one'),contentSource:'figure-type',figureTypeId:'bar',contentType:'data'};
 window.localStorage.setItem(JOURNAL_SETTINGS_KEY,JSON.stringify(generationSelection));
 const saved={...oldJob,id:'source-a',outputFormat:'png',figureTypeId:'workflow',figureData:undefined,journalSelection:{...defaultJournalSelection('frontiers-ai'),version:'2026-10-13.v1',stage:'production',widthMm:180},resultImages:[{candidateId:0,objectKey:'source-a/result.png',url:'https://fixture.test/input.png',mimeType:'image/png'}]};
 listedJobs=[saved];render(React.createElement(App));
 await waitFor(()=>assert.ok(screen.getAllByText('old@example.test').length));
 const records=()=>fireEvent.click(within(screen.getByRole('navigation',{name:'主导航'})).getByRole('button',{name:'任务记录'}));
 records();fireEvent.click(await screen.findByRole('button',{name:'精修结果图 1'}));
 await waitFor(()=>assert.ok(pendingJobs.has('source-a')));
 await act(async()=>{pendingJobs.get('source-a')(Response.json({code:0,job:saved}));});
 await screen.findByText(/沿用原任务：流程图 · Frontiers/);
 assert.ok(screen.queryByLabelText('原图性质')===null,'Expected no matching DOM element');
 fireEvent.click(screen.getByRole('button',{name:'精修设置',exact:true}));
 fireEvent.click(screen.getByRole('button',{name:/Frontiers in Artificial Intelligence.*180 mm/}));
 fireEvent.click(within(screen.getByRole('navigation',{name:'期刊列表'})).getByRole('button',{name:/Frontiers in Artificial Intelligence/}));
 assert.ok(within(screen.getByRole('dialog',{name:'期刊规则'})).getByText(/沿用原任务：流程图/));
 assert.ok(screen.queryByRole('combobox',{name:'内容类型'})===null,'Expected no matching DOM element');
 fireEvent.click(screen.getByRole('button',{name:'关闭期刊规则'}));await waitFor(()=>assert.equal(screen.queryByRole('dialog',{name:'期刊规则'}),null));
 fireEvent.click(screen.getByRole('button',{name:'关闭生成设置'}));
 assert.deepEqual(JSON.parse(window.localStorage.getItem(JOURNAL_SETTINGS_KEY)),generationSelection);
 // A second task read is still pending when a new upload becomes the active original.
 records();fireEvent.click(await screen.findByRole('button',{name:'精修结果图 1'}));
 await waitFor(()=>assert.equal(actions.filter(a=>a==='getJob').length,2));
 const late=pendingJobs.get('source-a');
 changeControl(screen.getByLabelText('上传精修原图'),{target:{files:[new File(['new bytes'],'replacement.png',{type:'image/png'})]}});
 await screen.findByLabelText('原图性质');
 changeControl(screen.getByLabelText('原图性质'),{target:{value:'illustration'}});
 await act(async()=>{late(Response.json({code:0,job:saved}));});
 await screen.findByText('原图已保存到浏览器 · 提交时上传');
 assert.equal(screen.getByLabelText('原图性质').value,'illustration');
 assert.match(screen.getByRole('img',{name:'待精修原图'}).src,/^blob:/);
 assert.ok(screen.queryByText(/沿用原任务：流程图/)===null,'Expected no matching DOM element');
 fireEvent.click(screen.getByRole('button',{name:'精修设置',exact:true}));
 assert.ok(screen.getByRole('button',{name:/不指定期刊/}));
 fireEvent.click(screen.getByRole('button',{name:'关闭生成设置'}));
 changeControl(screen.getByLabelText('上传精修原图'),{target:{files:[new File(['other'],'other.png',{type:'image/png'})]}});
 assert.equal(screen.getByLabelText('原图性质').value,'');
 assert.deepEqual(JSON.parse(window.localStorage.getItem(JOURNAL_SETTINGS_KEY)),generationSelection);
 assert.equal(actions.filter(a=>a==='refineImage'||a==='createJob').length,0);
});

test('restored refinement browser original carries the saved source task, figure and rule version without another confirmation',async()=>{
 setup();globalThis.Image=class{naturalWidth=120;naturalHeight=80;set src(v){queueMicrotask(()=>this.onload?.())}};
 const scope=JSON.stringify(['https://api.paperbanana.asia','old-user']);
 const source=await saveBrowserMaterial(scope,new File(['saved bytes'],'saved-original.png',{type:'image/png'}));
 const selection={...defaultJournalSelection('plos-one'),contentType:'data'};
 const saved={...oldJob,refineMode:true,sourceContentType:'data',outputFormat:'png',generationContext:{figureTypeId:'bar'},journalSelection:selection,taskSourceMaterial:{...source,id:'server-source',clientFileId:source.id}};
 listedJobs=[saved];render(React.createElement(App));
 await waitFor(()=>assert.ok(screen.getAllByText('old@example.test').length));
 fireEvent.click(within(screen.getByRole('navigation',{name:'主导航'})).getByRole('button',{name:'任务记录'}));
 fireEvent.click(await screen.findByRole('button',{name:'恢复图型与完整输入'}));
 await waitFor(()=>assert.ok(resolveJob));
 await act(async()=>{resolveJob(Response.json({code:0,job:saved}));});
 await screen.findByText(/沿用原任务：柱形图 · PLOS ONE/);
 assert.ok(screen.getByText('已完成'),'Restoring the source must not erase the historical result state');
 assert.ok(screen.queryByLabelText('原图性质')===null,'Expected no matching DOM element');
 const {getBrowserRecord}=await import('../src/lib/browserMaterials.js');
 const draft=await getBrowserRecord(scope,'draft:refine-source');
 assert.equal(draft.settings.sourceTaskId,oldJob.id);
 assert.equal(draft.settings.contentType,'data');
 assert.deepEqual(draft.settings.journalSelection,selection);
 assert.equal(draft.ref.sha256,source.sha256);
});
