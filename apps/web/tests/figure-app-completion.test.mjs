import {IDBFactory} from 'fake-indexeddb'
import test,{afterEach} from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../src/App.jsx'
import {saveFigureSettings} from '../src/lib/figureSettings.js'
import {syntheticFigureDraft} from '../src/lib/figureInput.js'
const registry={registryVersion:'figure-ui-test',figureTaxonomyVersion:'2026-10-10.v1',figureExecutionVersion:1,workflowContractVersion:2,materialWorkflowVersion:1,materialFileVersion:2,providers:{bailian:{defaults:{main:'main',image:'image',vision:'main'},models:[{id:'main',label:'Main',roles:['main','vision'],selectable:true,capabilities:{referenceImages:true}},{id:'image',label:'Image',roles:['image'],selectable:true,capabilities:{resolutions:['1K'],aspectRatios:['auto','16:9'],outputFormats:['png']}}]}}}
const originalFetch=globalThis.fetch,originalStorage=globalThis.localStorage
const requests=[]
function setup(){globalThis.indexedDB=new IDBFactory();requests.length=0;globalThis.localStorage=window.localStorage;window.localStorage.clear();globalThis.fetch=async(_url,init={})=>{const body=init.body?JSON.parse(String(init.body)):null;requests.push(body);if(!body)return Response.json({code:0,runtime:'gateway'});if(body.action==='modelRegistry')return Response.json({code:0,...registry});if(body.action==='createJob')return Response.json({code:0,jobId:'saved-figure',status:'queued'});if(body.action==='getJob')return Response.json({code:0,job:{id:'saved-figure',status:'succeeded',resultImages:[],stages:[]}});return Response.json({code:0})}}
afterEach(()=>{cleanup();window.localStorage.clear();globalThis.fetch=originalFetch;if(originalStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=originalStorage})

test('App reload retains original input, format and legacy typed drafts without obsolete specialist forms',async()=>{
 setup();const draft=syntheticFigureDraft('qq');draft.optionInputs={mean:'3',sd:'2'}
 saveFigureSettings({figureTypeId:'qq',figureDrafts:{qq:draft},outputFormat:'svg',methodContent:'User supplied analysis and explicit reference distribution',caption:'A custom figure caption',aspectRatio:'3:2'},window.localStorage)
 const user=userEvent.setup();let view=render(React.createElement(App))
 assert.equal(screen.queryByLabelText('分位数比较图数据行 JSON'),null)
 assert.deepEqual(JSON.parse(window.localStorage.getItem('tuyan.figure-settings.v1')).figureDrafts.qq,draft)
 assert.equal(JSON.parse(window.localStorage.getItem('tuyan.figure-settings.v1')).aspectRatio,'3:2')
 assert.equal(screen.getByLabelText(/论文方法内容/).value,'User supplied analysis and explicit reference distribution')
 fireEvent.change(screen.getByLabelText(/论文方法内容/),{target:{value:'Edited original analysis remains across type changes and reload.'}})
 await user.click(screen.getByRole('button',{name:'打开完整设置'}))
 assert.equal(screen.getByLabelText('导出格式').value,'svg')
 await user.click(screen.getByLabelText('信息图类别'))
 fireEvent.change(screen.getByRole('searchbox',{name:'搜索图类'}),{target:{value:'柱形图'}})
 fireEvent.click(screen.getByRole('button',{name:/柱形图 Bar chart/}))
 await user.click(screen.getByLabelText('信息图类别'))
 fireEvent.change(screen.getByRole('searchbox',{name:'搜索图类'}),{target:{value:'分位数比较图'}})
 fireEvent.click(screen.getByRole('button',{name:/^分位数比较图 /}))
 assert.equal(screen.getByLabelText(/论文方法内容/).value,'Edited original analysis remains across type changes and reload.')
 assert.deepEqual(JSON.parse(window.localStorage.getItem('tuyan.figure-settings.v1')).figureDrafts.qq,draft)
 view.unmount();view=render(React.createElement(App))
 assert.equal(screen.getByLabelText(/论文方法内容/).value,'Edited original analysis remains across type changes and reload.')
 assert.deepEqual(JSON.parse(window.localStorage.getItem('tuyan.figure-settings.v1')).figureDrafts.qq,draft)
 await user.click(screen.getByRole('button',{name:'打开完整设置'}));assert.equal(screen.getByLabelText('导出格式').value,'svg')
})

test('App submits model-generated SVG while preserving legacy typed data in the browser',async()=>{
 setup();const draft=syntheticFigureDraft('network');draft.optionInputs={directed:'false'}
 saveFigureSettings({figureTypeId:'network',figureDrafts:{network:draft},outputFormat:'svg',methodContent:'An explicit graph with observed edges and isolates',caption:'Observed network'},window.localStorage)
 const user=userEvent.setup();render(React.createElement(App));await waitFor(()=>assert.ok(requests.some(b=>b?.action==='modelRegistry')))
 await user.click(screen.getByRole('button',{name:'打开完整设置'}));await user.click(screen.getByRole('button',{name:'阿里云百炼'}));await user.type(screen.getByPlaceholderText('sk-...'),'test-only-key')
 await user.click(screen.getAllByRole('button',{name:'生成候选图'}).find(b=>b.type==='submit'))
 await waitFor(()=>assert.ok(requests.some(b=>b?.action==='createJob')))
 const create=requests.find(b=>b?.action==='createJob')
 assert.equal(create.outputFormat,'svg');assert.equal(create.taskName,'diagram');assert.equal(create.generationPath,'model-v1');assert.equal(create.figureTypeId,'network');assert.equal(create.figureData,undefined)
 assert.deepEqual(JSON.parse(window.localStorage.getItem('tuyan.figure-settings.v1')).figureDrafts.network,draft)
 assert.equal(window.localStorage.getItem('tuyan.figure-settings.v1').includes('test-only-key'),false)
})

test('PNG composites reject an edit-only image model instead of silently falling back to programmatic rendering',async()=>{
 setup();const guarded=structuredClone(registry);guarded.providers.bailian.models[1].capabilities.requiresSourceImage=true;
 const base=globalThis.fetch;globalThis.fetch=async(url,init={})=>{const body=init.body?JSON.parse(init.body):null;if(body?.action==='modelRegistry'){requests.push(body);return Response.json({code:0,...guarded})}return base(url,init)};
 saveFigureSettings({figureTypeId:'multipanel',outputFormat:'png',methodContent:'Full study description for a composite figure',caption:'Combined panels'},window.localStorage);
 const user=userEvent.setup();render(React.createElement(App));await waitFor(()=>assert.ok(requests.some(b=>b?.action==='modelRegistry')));
 await user.click(screen.getByRole('button',{name:'打开完整设置'}));await user.click(screen.getByRole('button',{name:'阿里云百炼'}));await user.type(screen.getByPlaceholderText('sk-...'),'test-only-key');await user.click(screen.getByRole('button',{name:'关闭生成设置'}));
 fireEvent.submit(document.querySelector('.generation-form'));
 await screen.findByText(/当前型号仅支持图像编辑|仅支持图像编辑|当前模型不能用于生成/);
 assert.equal(requests.some(b=>b?.action==='createJob'),false);
 assert.equal(screen.getByLabelText(/论文方法内容/).value,'Full study description for a composite figure');
});

test('App rejects Core without the material workflow while preserving saved legacy drafts',async()=>{
 for(const version of [undefined,0]){
  setup();const draft=syntheticFigureDraft('network'),older={...registry}
  if(version===undefined)delete older.materialWorkflowVersion;else older.materialWorkflowVersion=version
  const baseFetch=globalThis.fetch
  globalThis.fetch=async(url,init={})=>{const body=init.body?JSON.parse(init.body):null;if(body?.action==='modelRegistry'){requests.push(body);return Response.json({code:0,...older})}return baseFetch(url,init)}
  saveFigureSettings({figureTypeId:'network',figureDrafts:{network:draft},outputFormat:'svg',methodContent:'Historical complete user methods are still available',caption:'Historical input kept'},window.localStorage)
  const view=render(React.createElement(App))
  await waitFor(()=>assert.ok(requests.some(b=>b?.action==='modelRegistry')))
  await waitFor(()=>assert.equal(screen.getByLabelText('上传文件').disabled,false))
  fireEvent.submit(document.querySelector('.generation-form'))
  await screen.findByText(/当前后端尚未升级到文件与模型绘图流程/)
  assert.equal(requests.some(b=>b?.action==='createJob'),false)
  assert.equal(screen.queryByLabelText('节点连接网络图数据行 JSON'),null)
  assert.equal(screen.getByLabelText(/论文方法内容/).value,'Historical complete user methods are still available')
  assert.equal(JSON.parse(window.localStorage.getItem('tuyan.figure-settings.v1')).figureDrafts.network.rowsJson,draft.rowsJson)
  view.unmount()
 }
})
