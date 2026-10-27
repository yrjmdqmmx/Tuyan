import { changeControl, menuOptions, chooseMenuOption } from './menu-helpers.mjs';
import test, {afterEach} from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react'
import WorkflowOptions, {workflowExplanation} from '../src/components/WorkflowOptions.jsx'
import ModelPicker from '../src/components/ModelPicker.jsx'
import JobStatus from '../src/components/JobStatus.jsx'
import ResultFigure from '../src/components/ResultFigure.jsx'

afterEach(cleanup)
test('workflow cards support selection, keyboard focus, Escape, hover and tap help', () => {
  let selected=''
  render(React.createElement(WorkflowOptions,{value:'full',onChange:value=>selected=value,body:{generationPath:'model-v1',maxCriticRounds:1,visionMode:'none'}}))
  fireEvent.click(screen.getByRole('radio',{name:/快速生成/}))
  assert.equal(selected,'planner_critic')
  const help=screen.getByRole('button',{name:'快速生成说明'})
  fireEvent.focus(help)
  assert.equal(help.getAttribute('aria-expanded'),'true')
  assert.ok(screen.getByRole('region',{name:'快速生成说明'}).textContent.includes('最多评审 1 次'))
  fireEvent.keyDown(help,{key:'Escape'})
  assert.equal(help.getAttribute('aria-expanded'),'false')
  fireEvent.mouseEnter(help.parentElement)
  assert.equal(help.getAttribute('aria-expanded'),'true')
  fireEvent.mouseLeave(help.parentElement)
  assert.equal(help.getAttribute('aria-expanded'),'false')
  fireEvent.click(help)
  assert.equal(help.getAttribute('aria-expanded'),'true')
  fireEvent.click(help)
  assert.equal(help.getAttribute('aria-expanded'),'false')
})
test('workflow explanations differentiate visual assistance, rendered SVG and plot rerender', () => {
  assert.match(workflowExplanation('demo_full',{maxCriticRounds:5,visionMode:'assist',referenceImages:[{}]}).join(' '),/视觉模型观察.*风格.*最多 5 轮.*主模型.*上一张图/)
  assert.match(workflowExplanation('demo_planner_critic',{maxCriticRounds:2,visionMode:'none',outputFormat:'svg'}).join(' '),/先生成 SVG.*实际画面与完整代码.*每轮包含检查.*不追加最终复审/)
  assert.match(workflowExplanation('demo_planner_critic',{maxCriticRounds:2,visionMode:'none',taskName:'plot'}).join(' '),/主模型直接读图.*重写绘图代码/)
})
test('vision none is a role choice and does not send a fake model route', () => {
  let mode='assist', routeCalls=0
  render(React.createElement(ModelPicker,{label:'视觉模型',role:'vision',allowCustom:true,visionMode:mode,onVisionModeChange:value=>mode=value,onRouteChange:()=>routeCalls++,route:{accessProvider:'example',modelId:'saved-model'},registry:{providers:{example:{models:[{id:'saved-model',label:'Saved Model',roles:['vision'],selectable:true,capabilities:{}}]}}}}))
  fireEvent.click(screen.getByRole('button',{name:'视觉模型'}))
  const choices=[...document.querySelectorAll('.model-provider-rail > button')]
  assert.deepEqual(choices.slice(0,2).map(button=>button.getAttribute('aria-label')),['无','通用 API'])
  fireEvent.click(screen.getByRole('button',{name:'无'}))
  assert.equal(mode,'none')
  assert.equal(routeCalls,0)
})
for (const accessProvider of ['custom','openai']) test(`disabled vision opens a neutral view and preserves its ${accessProvider} draft`, () => {
  const route={accessProvider,modelId:'saved-model'}, changes=[]
  render(React.createElement(ModelPicker,{label:'视觉模型',role:'vision',allowCustom:true,visionMode:'none',onVisionModeChange:value=>changes.push(value),onRouteChange:value=>changes.push(value),route,registry:{providers:{openai:{models:[{id:'saved-model',label:'Saved Model',roles:['vision'],selectable:true,capabilities:{}}]}}},renderCustomSettings:()=>React.createElement('p',null,'Custom editor')}))
  fireEvent.click(screen.getByRole('button',{name:'视觉模型'}))
  assert.ok(screen.getByRole('region',{name:'视觉模型未启用'}))
  assert.equal(screen.queryByRole('region',{name:'通用 API 配置'}),null)
  assert.equal(screen.queryByRole('region',{name:'具体模型列表'}),null)
  assert.equal(screen.queryByText('Custom editor'),null)
  assert.deepEqual(changes,[])
  fireEvent.click(screen.getByRole('button',{name:'关闭模型选择'}))
  fireEvent.click(screen.getByRole('button',{name:'视觉模型'}))
  assert.ok(screen.getByRole('region',{name:'视觉模型未启用'}))
  assert.deepEqual(changes,[])
  fireEvent.click(screen.getByRole('button',{name:'通用 API'}))
  assert.ok(screen.getByText('Custom editor'))
  assert.deepEqual(changes,[{accessProvider:'custom',modelId:accessProvider==='custom'?'saved-model':''}])
  assert.deepEqual(route,{accessProvider,modelId:'saved-model'})
  fireEvent.click(screen.getByRole('button',{name:'无'}))
  fireEvent.click(screen.getByRole('button',{name:'视觉模型'}))
  assert.ok(screen.getByRole('region',{name:'视觉模型未启用'}))
  assert.equal(screen.queryByText('Custom editor'),null)
})
test('mobile disabled vision opens the option list and resizing does not expose the saved custom editor', () => {
  const previous=window.matchMedia
  let resize
  window.matchMedia=()=>({matches:true,addEventListener(_event,handler){resize=handler},removeEventListener(){}})
  try {
    render(React.createElement(ModelPicker,{label:'视觉模型',role:'vision',allowCustom:true,visionMode:'none',onVisionModeChange(){},route:{accessProvider:'custom',modelId:'saved-custom'},registry:{providers:{}},renderCustomSettings:()=>React.createElement('p',null,'Custom editor')}))
    fireEvent.click(screen.getByRole('button',{name:'视觉模型'}))
    const choices=[...document.querySelectorAll('.model-provider-rail > button')]
    assert.deepEqual(choices.slice(0,2).map(button=>button.getAttribute('aria-label')),['无','通用 API'])
    assert.equal(choices[0].getAttribute('aria-pressed'),'true')
    assert.equal(screen.queryByText('Custom editor'),null)
    act(()=>resize({matches:false}))
    assert.ok(screen.getByRole('region',{name:'视觉模型未启用'}))
    assert.equal(screen.queryByText('Custom editor'),null)
  } finally {cleanup();window.matchMedia=previous}
})
test('failed job preserves partial result and error without a normal final-revision warning', () => {
  render(React.createElement(JobStatus,{apiBase:'https://example.com',job:{id:'partial',status:'failed',output_format:'svg',num_candidates:2,result_images:[{filename:'first.png',url:'https://example.com/first.png',mime_type:'image/png',candidate_id:0,review:{limit:5,roundsUsed:5,mode:'visual',status:'modified_unreviewed'}}],candidateProgress:[{candidateId:0,status:'succeeded'},{candidateId:1,status:'failed',error:{message:'provider unavailable'}}]}}))
  assert.ok(screen.getByText(/已完成的候选图仍可查看/))
  assert.ok(screen.getByText('候选图 1 · PNG'))
  assert.equal(screen.queryByText(/已修改，尚未复审/),null)
  assert.ok(screen.getByText(/provider unavailable/))
  assert.ok(screen.getByRole('button',{name:'下载候选图 1'}))
})

test('last-round revisions remain downloadable without a warning or an invented review pass', () => {
  for(const rounds of [1,5])for(const format of ['png','svg']){
    const review={limit:rounds,roundsUsed:rounds,status:'modified_unreviewed',mode:format==='svg'?'visual_code':'visual',reviewedVersion:rounds,deliveredVersion:rounds+1,note:'最后一轮生成的新版尚未复审。'};
    const original=structuredClone(review);
    const view=render(React.createElement(ResultFigure,{apiBase:'https://fixture.test',image:{url:'https://fixture.test/result.'+format,mime_type:'image/'+(format==='svg'?'svg+xml':format),candidate_id:0,review}}));
    assert.equal(screen.queryByRole('status'),null);
    assert.equal(screen.queryByText(/已修改，尚未复审|已通过评审|最后一轮生成的新版/),null);
    assert.ok(screen.getByRole('button',{name:'下载候选图 1'}));assert.ok(screen.getByAltText('候选图 1'));
    assert.deepEqual(review,original,'hiding a normal completion warning must not rewrite stored review evidence');
    view.unmount();
  }
})

test('interrupted revisions, failed reviews and actual review passes retain their status', () => {
  for(const [status,expected] of [['modified_unreviewed','已修改，尚未复审'],['review_failed','评审失败'],['issues_found','已检查，仍有问题'],['passed','已通过评审']]){
    const view=render(React.createElement(ResultFigure,{apiBase:'https://fixture.test',image:{url:'https://fixture.test/result.png',mime_type:'image/png',review:{limit:5,roundsUsed:1,status,mode:'visual',note:'Fixture review evidence'}}}));
    assert.ok(screen.getByRole('status').textContent.includes(expected));assert.ok(screen.getByRole('status').textContent.includes('Fixture review evidence'));
    view.unmount();
  }
})

test('App submits and restores numeric workflow settings while none keeps the vision draft and omits its credentials', async () => {
  const {default: App}=await import('../src/App.jsx')
  const {default:userEvent}=await import('@testing-library/user-event')
  const {waitFor}=await import('@testing-library/react')
  const user=userEvent.setup(), requests=[], originalFetch=globalThis.fetch
  const routes={main:{accessProvider:'openai',modelId:'main'},image:{accessProvider:'openai',modelId:'image'},vision:{accessProvider:'ark',modelId:'saved-disabled-vision'}}
  window.localStorage.setItem('tuyan.model-routing.v1',JSON.stringify({version:1,mode:'advanced',roles:routes}))
  window.localStorage.setItem('tuyan.workflow-settings.v1',JSON.stringify({version:1,numCandidates:1,maxCriticRounds:1,visionMode:'none'}))
  const registry={figureTaxonomyVersion:'2026-10-10.v1',figureExecutionVersion:1,materialWorkflowVersion:1,materialFileVersion:2,workflowContractVersion:2,routeContractVersion:1,providers:{openai:{defaults:{main:'main',image:'image',vision:'main'},models:[{id:'main',label:'Main',roles:['main','vision'],selectable:true,capabilities:{referenceImages:true}},{id:'image',label:'Image',roles:['image'],selectable:true,capabilities:{aspectRatios:['16:9'],resolutions:['1K'],outputFormats:['png']}}]}}}
  globalThis.fetch=async(_input,init={})=>{
    const body=init.body?JSON.parse(init.body):null
    if(body)requests.push(body)
    if(!body)return Response.json({code:0,runtime:'gateway'})
    if(body.action==='modelRegistry')return Response.json({code:0,...registry})
    if(body.action==='referenceLibrary')return Response.json({code:0,references:[]})
    if(body.action==='createJob')return Response.json({code:0,jobId:'workflow-test',status:'queued'})
    if(body.action==='getJob')return Response.json({code:0,job:{id:'workflow-test',status:'succeeded',resultImages:[]}})
    throw new Error('Unexpected action '+body.action)
  }
  try {
    const app=render(React.createElement(App))
    await waitFor(()=>assert.ok(requests.some(body=>body.action==='modelRegistry')))
    await user.click(screen.getByRole('button',{name:'打开完整设置'}))
    assert.equal(screen.queryByText(/正常完成约 .*次模型调用/),null)
    assert.equal(screen.queryByText(/默认 1 张 \/ 1 轮。评审为 0 时不复核结果/),null)
    assert.equal(screen.getByRole('radio',{name:/完整生成/}).checked,true)
    assert.equal(screen.getAllByRole('radio').filter(radio=>['full','planner_critic'].includes(radio.value)).length,2)
    assert.equal(screen.queryByRole('radio',{name:/规划器 \+ 评审器|基础生成|完整流程/}),null)
    await user.click(screen.getByRole('button',{name:/普通模式/}))
    assert.equal(screen.getByRole('radio',{name:/完整生成/}).checked,true)
    await user.click(screen.getByRole('button',{name:/专业模式/}))
    assert.equal(screen.getByRole('radio',{name:/完整生成/}).checked,true)
    changeControl(screen.getByLabelText('候选图数量'),{target:{value:'6'}})
    changeControl(screen.getByLabelText('评审轮数'),{target:{value:'5'}})
    assert.equal(screen.queryByLabelText('火山方舟 接入密钥'),null)
    await user.type(screen.getByLabelText('OpenAI 接入密钥'),'fixture-key')
    await user.click(screen.getByRole('button',{name:'关闭生成设置'}))
    await user.click(screen.getAllByRole('button',{name:'生成候选图'}).find(button=>button.type==='submit'))
    await waitFor(()=>assert.ok(requests.some(body=>body.action==='createJob')))
    const payload=requests.find(body=>body.action==='createJob')
    assert.equal(payload.pipelineMode,'full');assert.equal(payload.visionMode,'none');assert.equal(payload.numCandidates,6);assert.equal(payload.maxCriticRounds,5)
    assert.equal(payload.modelRoutes.vision,undefined);assert.deepEqual(JSON.parse(window.localStorage.getItem('tuyan.model-routing.v1')).roles.vision,routes.vision);assert.deepEqual(payload.apiKeys,{openai:'fixture-key'})
    app.unmount()
    render(React.createElement(App))
    await user.click(screen.getByRole('button',{name:'打开完整设置'}))
    assert.equal(screen.getByLabelText('候选图数量').value,'6');assert.equal(screen.getByLabelText('评审轮数').value,'5')
    assert.equal(screen.getByRole('radio',{name:/完整生成/}).checked,true)
    assert.ok(screen.getByRole('button',{name:'视觉模型'}).textContent.includes('无'))
    assert.doesNotMatch(window.localStorage.getItem('tuyan.workflow-settings.v1'),/fixture-key/)
  } finally {cleanup();window.localStorage.clear();globalThis.fetch=originalFetch}
})

test('App blocks an older workflow backend before submission and preserves the input', async () => {
  const {default:App}=await import('../src/App.jsx')
  const {waitFor}=await import('@testing-library/react')
  const {STATIC_MODEL_REGISTRY}=await import('../src/lib/staticModelCatalog.js')
  const originalFetch=globalThis.fetch,requests=[]
  globalThis.fetch=async(_input,init={})=>{const body=init.body?JSON.parse(init.body):null;if(body)requests.push(body);return Response.json(body?.action==='modelRegistry'?{code:0,providers:STATIC_MODEL_REGISTRY,routeContractVersion:1}:body?.action==='referenceLibrary'?{code:0,references:[]}:{code:0,runtime:'gateway'})}
  try {
    render(React.createElement(App))
    await waitFor(()=>assert.ok(requests.some(body=>body.action==='modelRegistry')))
    const method=screen.getByLabelText(/论文方法内容/)
    changeControl(method,{target:{value:'保留输入：模型尚未调用，后端不支持新版工作流。'}})
    fireEvent.click(screen.getAllByRole('button',{name:'生成候选图'}).find(button=>button.type==='submit'))
    assert.ok(screen.getAllByRole('alert').some(alert=>alert.textContent.includes('更新后端')))
    assert.equal(method.value,'保留输入：模型尚未调用，后端不支持新版工作流。')
    assert.equal(requests.some(body=>body.action==='createJob'),false)
  } finally {cleanup();window.localStorage.clear();globalThis.fetch=originalFetch}
})


test('failed job marks unstarted or interrupted candidates stopped instead of waiting', () => {
  render(React.createElement(JobStatus,{apiBase:'https://example.com',job:{id:'stopped',status:'failed',num_candidates:3,result_images:[],candidateProgress:[{candidateId:0,status:'failed',error:'Submission status unknown'},{candidateId:1,status:'queued'},{candidateId:2,status:'running'}]}}))
  assert.ok(screen.getByText('候选图 2 · 已停止'))
  assert.ok(screen.getByText('候选图 3 · 已停止'))
  assert.equal(screen.queryByText(/候选图.*等待中|候选图.*生成中/),null)
})

test('model-v1 SVG data figure omits an unused editing-only image route credential', async () => {
  const {default:App}=await import('../src/App.jsx')
  const {default:userEvent}=await import('@testing-library/user-event')
  const {waitFor}=await import('@testing-library/react')
  const user=userEvent.setup(),requests=[],originalFetch=globalThis.fetch
  const routes={main:{accessProvider:'openai',modelId:'main'},image:{accessProvider:'fal',modelId:'edit-only'},vision:{accessProvider:'openai',modelId:'main'}}
  window.localStorage.setItem('tuyan.model-routing.v1',JSON.stringify({version:1,mode:'advanced',roles:routes}))
  window.localStorage.setItem('tuyan.workflow-settings.v1',JSON.stringify({version:1,numCandidates:1,maxCriticRounds:0,visionMode:'none'}))
  const registry={figureTaxonomyVersion:'2026-10-10.v1',figureExecutionVersion:1,materialWorkflowVersion:1,materialFileVersion:2,workflowContractVersion:2,routeContractVersion:1,providers:{openai:{defaults:{main:'main',image:'image',vision:'main'},models:[{id:'main',label:'Main',roles:['main','vision'],selectable:true,capabilities:{referenceImages:true}}]},fal:{models:[{id:'edit-only',label:'Editing only',roles:['image'],selectable:true,capabilities:{requiresSourceImage:true,imageEditMode:'direct-edit',aspectRatios:['16:9'],resolutions:['1K'],outputFormats:['png']}}]}}}
  globalThis.fetch=async(_input,init={})=>{
    const body=init.body?JSON.parse(init.body):null
    if(body)requests.push(body)
    if(!body)return Response.json({code:0,runtime:'gateway'})
    if(body.action==='modelRegistry')return Response.json({code:0,...registry})
    if(body.action==='referenceLibrary')return Response.json({code:0,references:[]})
    if(body.action==='createJob')return Response.json({code:0,jobId:'worker-plot',status:'queued'})
    if(body.action==='getJob')return Response.json({code:0,job:{id:'worker-plot',status:'succeeded',resultImages:[]}})
    throw new Error('Unexpected action '+body.action)
  }
  try {
    render(React.createElement(App))
    await waitFor(()=>assert.ok(requests.some(body=>body.action==='modelRegistry')))
    await user.click(screen.getByRole('button',{name:'打开完整设置'}))
    await user.click(document.querySelector('.figure-type-trigger'))
    changeControl(screen.getByLabelText('搜索图类'),{target:{value:'柱形图'}})
    await user.click(screen.getByRole('button',{name:/柱形图 Bar chart/}))
    assert.deepEqual([...menuOptions(screen.getByLabelText('导出格式'))].map(option=>option.value),['png','svg'])
    await chooseMenuOption(screen.getByLabelText('导出格式'),'svg')
    await waitFor(()=>assert.equal(document.querySelector('[data-model-role="image"]'),null))
    await user.click(screen.getByRole('button',{name:'关闭生成设置'}))
    assert.equal(screen.queryByLabelText('柱形图数据表'),null)
    changeControl(screen.getByLabelText(/论文方法内容/),{target:{value:'柱形图数据：A=2，B=4，单位 count；来源为模拟测试数据。'}})
    await user.click(screen.getByRole('button',{name:'打开完整设置'}))
    assert.equal(screen.queryByLabelText('fal 接入密钥'),null)
    await user.type(screen.getByLabelText('OpenAI 接入密钥'),'fixture-main-only')
    await user.click(screen.getByRole('button',{name:'关闭生成设置'}))
    await user.click(screen.getAllByRole('button',{name:'生成候选图'}).find(button=>button.type==='submit'))
    await waitFor(()=>assert.ok(requests.some(body=>body.action==='createJob')))
    const payload=requests.find(body=>body.action==='createJob')
    assert.equal(payload.taskName,'diagram');assert.equal(payload.generationPath,'model-v1');assert.equal(payload.figureTypeId,'bar');assert.equal(payload.outputFormat,'svg');assert.equal(payload.maxCriticRounds,1)
    assert.deepEqual(payload.apiKeys,{openai:'fixture-main-only'})
    assert.equal(payload.modelRoutes.image,undefined)
    assert.deepEqual(JSON.parse(window.localStorage.getItem('tuyan.model-routing.v1')).roles.image,routes.image)
  } finally {cleanup();window.localStorage.clear();globalThis.fetch=originalFetch}
})
