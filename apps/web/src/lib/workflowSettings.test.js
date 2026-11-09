import test from 'node:test'
import assert from 'node:assert/strict'
import {loadWorkflowSettings, loadGenerationPipeline, saveWorkflowSettings, workflowPreflight, reviewStatusText} from './workflowSettings.js'
import {requiredCreateRouteRoles, requiredRefineRouteRoles, scopedApiKeysForRoles, arkProbesForRoles, buildModelSubmission} from './modelRouting.js'

const storage = () => {const data = new Map();return {getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value)}}
const registry = {workflowContractVersion:2}
const base = {action:'createJob',outputFormat:'png',pipelineMode:'planner_critic',numCandidates:1,maxCriticRounds:1,visionMode:'none'}

test('full generation is the default and legacy preferences migrate without losing counts or vision', () => {
  const store = storage()
  assert.equal(loadGenerationPipeline(store), 'full')
  for (const pipelineMode of ['planner_critic', 'demo_planner_critic', 'vanilla', 'demo_full']) {
    store.setItem('tuyan.workflow-settings.v1', JSON.stringify({version:1,pipelineMode,numCandidates:4,maxCriticRounds:3,visionMode:'assist'}))
    assert.equal(loadGenerationPipeline(store), 'full')
    assert.deepEqual(loadWorkflowSettings(store), {numCandidates:4,maxCriticRounds:3,visionMode:'assist'})
  }
  assert.equal(loadGenerationPipeline({getItem(){throw new Error('blocked')}}), 'full')
})

test('an explicit quick choice persists with review enabled after the default migration', () => {
  const store = storage()
  saveWorkflowSettings({...base,numCandidates:2,maxCriticRounds:3},store)
  assert.equal(loadGenerationPipeline(store),'planner_critic')
  assert.deepEqual(loadWorkflowSettings(store),{numCandidates:2,maxCriticRounds:3,visionMode:'none'})
  saveWorkflowSettings({numCandidates:3,maxCriticRounds:2,visionMode:'assist'},store)
  assert.equal(loadGenerationPipeline(store),'planner_critic')
  saveWorkflowSettings({...base,pipelineMode:'full'},store)
  assert.equal(loadGenerationPipeline(store),'full')
})

test('workflow defaults restore conservatively and valid bounds persist with explicit vision mode', () => {
  const store=storage()
  assert.deepEqual(loadWorkflowSettings(store),{numCandidates:1,maxCriticRounds:1,visionMode:'none'})
  assert.equal(saveWorkflowSettings({numCandidates:6,maxCriticRounds:5,visionMode:'none'},store),true)
  assert.deepEqual(loadWorkflowSettings(store),{numCandidates:6,maxCriticRounds:5,visionMode:'none'})
  saveWorkflowSettings({numCandidates:'',maxCriticRounds:1,visionMode:'assist'},store)
  assert.deepEqual(loadWorkflowSettings(store),{numCandidates:6,maxCriticRounds:5,visionMode:'assist'})
  assert.equal(saveWorkflowSettings(base,{setItem(){throw new Error('disabled')}}),false)
})
test('missing vision preferences default to none while a saved explicit assistant is restored', () => {
  const store=storage()
  store.setItem('tuyan.workflow-settings.v1',JSON.stringify({version:1,numCandidates:2,maxCriticRounds:0}))
  assert.deepEqual(loadWorkflowSettings(store),{numCandidates:2,maxCriticRounds:0,visionMode:'none'})
  saveWorkflowSettings({numCandidates:2,maxCriticRounds:0,visionMode:'assist'},store)
  assert.equal(loadWorkflowSettings(store).visionMode,'assist')
})
test('new workflow preflight rejects old backend and invalid integers before any role call', () => {
  assert.match(workflowPreflight(base,{workflowContractVersion:1},'ready','supported','supported'),/更新后端/)
  assert.match(workflowPreflight(base,{},'ready','supported','supported'),/更新后端/)
  for(const numCandidates of ['',0,-1,1.5,7,NaN,Infinity,'6']) assert.match(workflowPreflight({...base,numCandidates},registry,'ready','supported','supported'),/候选图数量/)
  for(const maxCriticRounds of ['',-1,.5,6,NaN,'5']) assert.match(workflowPreflight({...base,maxCriticRounds},registry,'ready','supported','supported'),/评审轮数/)
  assert.equal(workflowPreflight({...base,numCandidates:6,maxCriticRounds:5},registry,'ready','supported','unknown'),'')
  assert.match(workflowPreflight({...base,numCandidates:6},{...registry,workflowLimits:{maxCandidates:3,maxCriticRounds:5}},'ready','supported','supported'),/1～3/)
})
test('actual task needs distinguish references, visual review, SVG code review and all refinements', () => {
  for(const mainStatus of ['unknown','unsupported']) {
    assert.match(workflowPreflight(base,registry,'ready',mainStatus,'supported'),/视觉评审/)
    assert.equal(workflowPreflight({...base,maxCriticRounds:0},registry,'ready',mainStatus,'unknown'),'')
    assert.match(workflowPreflight({...base,outputFormat:'svg'},registry,'ready',mainStatus,'unknown'),/实际画面和完整代码/)
    assert.equal(workflowPreflight({...base,pipelineMode:'vanilla'},registry,'ready',mainStatus,'unknown'),'')
    assert.match(workflowPreflight({...base,maxCriticRounds:0,referenceImages:[{}]},registry,'ready',mainStatus,'supported'),/上传的参考图片/)
    assert.match(workflowPreflight({...base,action:'refineImage'},registry,'ready',mainStatus,'supported'),/精修方案/)
    assert.match(workflowPreflight({...base,taskName:'plot',outputFormat:'svg'},registry,'ready',mainStatus,'supported'),/视觉评审/)
  }
  assert.equal(workflowPreflight({...base,visionMode:'assist'},registry,'ready','unsupported','supported'),'')
  assert.match(workflowPreflight({...base,visionMode:'assist'},registry,'ready','supported','unknown'),/独立视觉模型/)
})
test('disabled vision drafts stay intact locally but are omitted from submission, credentials and probes', () => {
  const modelRoutes={main:{accessProvider:'openai',modelId:'main'},image:{accessProvider:'ark',modelId:'image'},vision:{accessProvider:'custom',modelId:'',custom:{protocol:'bedrock-converse'}}}
  const originalDraft=structuredClone(modelRoutes)
  const roles=requiredCreateRouteRoles({...base,modelRoutes})
  assert.deepEqual(roles,['main','image'])
  assert.deepEqual(requiredRefineRouteRoles({visionMode:'none',refineMode:'direct-edit'}),['main','image'])
  assert.deepEqual(scopedApiKeysForRoles(modelRoutes,roles,{openai:'main-key',ark:'image-key',custom:'vision-key'}),{openai:'main-key',ark:'image-key'})
  assert.deepEqual(arkProbesForRoles({...modelRoutes,vision:{accessProvider:'ark',modelId:'vision'}},roles),[{role:'image',modelId:'image'}])
  const result=buildModelSubmission({configurationMode:'advanced',modelRoutes,requiredRoles:roles,registry:{routeContractVersion:1}})
  assert.deepEqual(result.modelRoutes,{main:originalDraft.main,image:originalDraft.image})
  assert.equal(Object.hasOwn(result,'referenceVisionModelName'),false)
  assert.deepEqual(modelRoutes,originalDraft)
})
test('enabled vision is validated and submitted for generation and refinement', () => {
  for (const requiredRoles of [requiredCreateRouteRoles,requiredRefineRouteRoles]) {
    const modelRoutes={main:{accessProvider:'openai',modelId:'main'},image:{accessProvider:'ark',modelId:'image'},vision:{accessProvider:'custom',modelId:'',custom:{protocol:'bedrock-converse'}}}
    const roles=requiredRoles({...base,visionMode:'assist',refineMode:'direct-edit'})
    assert.deepEqual(roles,['main','image','vision'])
    const submit=registry=>buildModelSubmission({configurationMode:'advanced',modelRoutes,requiredRoles:roles,registry})
    const routeRegistry={routeContractVersion:1}
    assert.throws(()=>submit(routeRegistry),/模型路线 vision 尚未完整选择/)
    modelRoutes.vision.modelId='vision'
    assert.throws(()=>submit(routeRegistry),/尚未支持通用 API 接入/)
    assert.throws(()=>submit({...routeRegistry,universalApiContractVersion:1}),/尚未支持此图像工具或云接口扩展/)
    const result=submit({...routeRegistry,universalApiContractVersion:1,universalExtensionsVersion:1})
    assert.deepEqual(result.modelRoutes,modelRoutes)
    assert.equal(result.referenceVisionModelName,'vision')
  }
})
test('review presentation never turns an unreviewed revision into passed', () => {
  assert.match(reviewStatusText({status:'modified_unreviewed',mode:'visual',roundsUsed:5,limit:5}),/尚未复审.*5\/5/)
  assert.doesNotMatch(reviewStatusText({status:'modified_unreviewed'}),/已通过/)
  assert.match(reviewStatusText({status:'text_reviewed',mode:'text',roundsUsed:1,limit:1}),/未检查最终画面/)
})
test('blocked localStorage getter cannot crash initial state or setting changes',()=>{
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage')
  Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw new DOMException('blocked','SecurityError')}})
  try {
    assert.deepEqual(loadWorkflowSettings(),{numCandidates:1,maxCriticRounds:1,visionMode:'none'})
    assert.equal(saveWorkflowSettings(base),false)
  }finally{if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else delete globalThis.localStorage}
})

test('version labels match delivered PNG and SVG formats', () => {
  assert.match(reviewStatusText({status:'passed',mode:'visual',deliveredVersion:2}),/PNG v2/)
  assert.doesNotMatch(reviewStatusText({status:'passed',mode:'visual',deliveredVersion:2}),/SVG/)
  assert.match(reviewStatusText({status:'modified_unreviewed',mode:'visual_code',deliveredVersion:2}),/SVG v2/)
})

test('model-authored SVG ignores dormant incompatible Recraft image drafts',()=>{
 assert.equal(workflowPreflight({...base,generationPath:'model-v1',outputFormat:'svg',modelRoutes:{image:{accessProvider:'other',modelId:'recraft-unknown-vector'}}},registry,'ready','supported','unknown'),'')
})
