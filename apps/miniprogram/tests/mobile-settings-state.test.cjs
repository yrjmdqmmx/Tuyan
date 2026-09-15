const test = require('node:test')
const assert = require('node:assert/strict')
const { loadComponent } = require('./helpers/component.cjs')
const { normalizeModelRegistry } = require('../miniprogram/utils/model-registry.js')
const { STATIC_MODEL_REGISTRY } = require('../miniprogram/utils/static-model-catalog.js')
const { getModelRegistryState } = require('../miniprogram/utils/model-registry-store.js')
const { providerDefaultRoutes } = require('../miniprogram/utils/model-routing.js')
const { readUiSettings, saveUiSettings } = require('../miniprogram/utils/ui-settings.js')
const { buildCreateJobPayload } = require('../miniprogram/utils/payload.js')
const registry = normalizeModelRegistry({registryVersion:'ui-fixture',routeContractVersion:1,providerRegionContractVersion:1,supportsModelRoutes:true,providers:{...STATIC_MODEL_REGISTRY,openrouter:STATIC_MODEL_REGISTRY.openai}})
getModelRegistryState().registry = registry
const storage = new Map()
global.wx = {getStorageSync:k=>storage.get(k),setStorageSync:(k,v)=>storage.set(k,structuredClone(v))}
const base = () => ({configurationMode:'simple',simpleProvider:'tokendance',modelRoutes:providerDefaultRoutes('tokendance',registry),outputFormat:'png',imageSize:'1K',aspectRatio:'auto',pipelineMode:'planner_critic',retrievalSetting:'none',numCandidates:1,maxCriticRounds:1})
function sheet(settings) {
  const f = loadComponent('components/generation-settings-sheet/generation-settings-sheet.js')
  Object.assign(f.instance.properties,{settings,purpose:'create',executionRoles:[],apiKeys:{},manualReferenceIds:[]})
  f.instance.resetDraft(); return f
}
test('first-use defaults use Pro; explicit Lite survives opening, repeated mode/provider taps, cancel, and reload', () => {
  storage.clear()
  assert.equal(base().modelRoutes.image.modelId,'seedream-5.0-pro')
  const chosen=base(); chosen.modelRoutes.image.modelId='seedream-5.0-lite';chosen.imageSize='2K';chosen.aspectRatio='16:9'
  saveUiSettings('create',chosen)
  const f=sheet(readUiSettings('create',base())), s=f.instance
  s.setMode({currentTarget:{dataset:{mode:'simple'}}});s.onProviderChange({detail:{value:String(s.data.providerIndex)}})
  assert.deepEqual(JSON.parse(JSON.stringify(s.data.draft)),{...chosen,providerRegions:{}})
  s.onResolutionChange({detail:{value:String(s.data.resolutionOptions.findIndex(x=>x.value==='4K'))}});s.cancel()
  assert.equal(f.events.at(-1).name,'close')
  assert.deepEqual(readUiSettings('create',base()),chosen)
  const reopened=sheet(readUiSettings('create',base())).instance
  assert.equal(reopened.data.draft.imageSize,'2K');assert.equal(reopened.data.draft.modelRoutes.image.modelId,'seedream-5.0-lite')
})
test('saving a changed model normalizes incompatible output only in draft and submits the saved choices',()=>{
  storage.clear();const saved=base(); saved.imageSize='1K';const f=sheet(saved),s=f.instance
  s.data.editingRole='image';s.selectModel({detail:{provider:'tokendance',modelId:'seedream-5.0-lite'}})
  assert.equal(s.data.draft.imageSize,'2K');assert.ok(s.data.normalizationNotice);assert.equal(saved.imageSize,'1K')
  s.selectRatio({detail:{value:'16:9'}});s.save()
  const event=f.events.find(e=>e.name==='save');assert.ok(event)
  saveUiSettings('create',event.detail.settings)
  const restored=readUiSettings('create',base())
  const payload=buildCreateJobPayload({...restored,provider:restored.simpleProvider,registry,apiKeys:{},categoryId:'method_framework',categoryLabel:'方法框架图',methodContent:'模型与提交一致性测试',caption:'图注',referenceImageMode:'main_model',uploadedReferenceImages:[],manualReferenceIds:[]})
  assert.equal(payload.modelRoutes.image.modelId,'seedream-5.0-lite');assert.equal(payload.imageSize,'2K');assert.equal(payload.aspectRatio,'16:9')
})
test('preference persistence is scoped and excludes keys, identity, prompt and unknown fields',()=>{
 storage.clear();const chosen={...base(),apiKeys:{secret:'sensitive-fixture'},email:'private-fixture',methodContent:'private-text',unknown:true};chosen.modelRoutes.image.extra='private-extra'
 saveUiSettings('create',chosen);const raw=storage.get('tuyan_ui_settings_v1_create')
 assert.equal(raw.apiKeys,undefined);assert.equal(raw.email,undefined);assert.equal(raw.methodContent,undefined);assert.equal(raw.unknown,undefined);assert.equal(raw.modelRoutes.image.extra,undefined)
 assert.equal(readUiSettings('refine',base()).imageSize,'1K')
 storage.set('tuyan_ui_settings_v1_create',{...raw,modelRoutes:{image:{}}});assert.deepEqual(readUiSettings('create',base()),base())
})
test('refine inline controls, reopened draft, persisted settings and actual submit all agree',async()=>{
 storage.clear();const calls=[];let rejectSubmit=false;const state={registry,error:''}
 const f=loadComponent('pages/refine/refine.js',{
  '../../utils/session':{getCurrentUser:()=>({id:'ui-fixture'}),isSessionChecked:()=>true},
  '../../utils/tokendance':{hasTokenDanceConnection:()=>true},
  '../../utils/model-registry-store':{getModelRegistryState:()=>state,loadModelRegistry:async()=>state},
  '../../utils/api':{formatError:e=>e.message,requestJson:async p=>{calls.push(p);if(rejectSubmit)throw new Error('模拟提交失败');return {jobId:'mock-job'}}}
 },{wx:{showToast(){}}})
 const p=f.instance;p.ownerEpoch=0;p.visible=false;p.data.isLoggedIn=true;p.applyRegistryState(state)
 p.data.source={url:'https://fixture.invalid/source.png',objectKey:'jobs/fixture/result.png',jobId:'fixture'};p.onInstructionInput({detail:{value:'放大标签并保留布局'}})
 p.onResolutionChange({detail:{value:String(p.data.resolutionOptions.findIndex(x=>x.value==='2K'))}});p.selectRatio({detail:{value:'16:9'}})
 p.openSettings();assert.equal(p.data.settings.imageSize,'2K');assert.equal(p.data.settings.aspectRatio,'16:9')
 const draft=sheet(p.data.settings).instance.data.draft;assert.equal(draft.imageSize,'2K');assert.equal(draft.aspectRatio,'16:9')
 await p.submitRefine();assert.equal(calls[0].action,'refineImage');assert.equal(calls[0].imageSize,'2K');assert.equal(calls[0].aspectRatio,'16:9');assert.equal(calls[0].modelRoutes.image.modelId,'seedream-5.0-pro')
 assert.equal(readUiSettings('refine',base()).imageSize,'2K')
 rejectSubmit=true;p.data.job={id:'mock-job',status:'succeeded'};await p.submitRefine();assert.equal(p.data.currentJobId,'');assert.equal(p.data.job,null);assert.equal(p.data.error,'模拟提交失败')
})
test('visual ratios retain selected uncommon ratio, exclude unsupported values and bound extreme shapes',()=>{
 const {instance:p,events}=loadComponent('components/ratio-picker/ratio-picker.js')
 p.properties.options=['auto','1:1','16:9','1:8','8:1'].map(value=>({value,label:value}));p.properties.options.push({value:'2:1',disabled:true});p.properties.value='1:8';p.present()
 assert.ok(p.data.visibleOptions.some(x=>x.value==='1:8'));assert.ok(p.data.hasMore)
 const tall=p.data.visibleOptions.find(x=>x.value==='1:8');assert.equal(tall.width/tall.height,1/8)
 p.select({currentTarget:{dataset:{value:'2:1'}}});p.select({currentTarget:{dataset:{value:'fake'}}});assert.equal(events.length,0)
 p.select({currentTarget:{dataset:{value:'1:8'}}});assert.equal(events[0].detail.value,'1:8');p.properties.disabled=true;p.select({currentTarget:{dataset:{value:'1:1'}}});assert.equal(events.length,1)
})
test('disconnect requires confirmation and rejects confirmation after account switch',async()=>{
 let user={id:'A'},modal;const calls=[]
 const {instance:p}=loadComponent('pages/tokendance/tokendance.js',{'../../utils/session':{getCurrentUser:()=>user},'../../utils/api':{requestJson:async b=>{calls.push(b);return{}},formatError:e=>e.message},'../../utils/tokendance':{invalidateTokenDanceConnection(){}}},{wx:{showModal(o){modal=o}},clearInterval(){}})
 p.epoch=0;p.owner='A';p.data.connected=true
 let pending=p.disconnect();assert.equal(calls.length,0);modal.success({confirm:false});await pending;assert.equal(p.data.connected,true)
 pending=p.disconnect();user={id:'B'};modal.success({confirm:true});await pending;assert.equal(calls.length,0)
 user={id:'A'};pending=p.disconnect();modal.success({confirm:true});await pending;assert.equal(calls[0].action,'tokenDanceDisconnect');assert.equal(p.data.connected,false)
})
test('keyboard inset accounts for resized viewport and clears on close',()=>{
 let height=750,listener,hidden=0,shown=0
 const f=loadComponent('components/generation-settings-sheet/generation-settings-sheet.js',{}, {wx:{getWindowInfo:()=>({windowHeight:height}),hideTabBar(o){hidden++;o.success()},showTabBar(){shown++},onKeyboardHeightChange(fn){listener=fn},offKeyboardHeightChange(){}}})
 const p=f.instance; p.resetDraft=()=>{};p.properties.show=true
 f.definition.lifetimes.attached.call(p);f.definition.properties.show.observer.call(p,true)
 assert.equal(hidden,1);listener({height:300});assert.equal(p.data.keyboardHeight,300);assert.equal(p.data.keyboardOpen,true)
 height=450;listener({height:300});assert.equal(p.data.keyboardHeight,0,'resize plus inset must not double subtract keyboard')
 height=550;listener({height:300});assert.equal(p.data.keyboardHeight,100)
 f.definition.properties.show.observer.call(p,false);assert.equal(p.data.keyboardHeight,0);assert.equal(p.data.keyboardOpen,false);assert.equal(shown,1)
})
test('restored login refreshes consumer authorization on the visible workbench',async()=>{
 let user=null,sessionListener,refreshed=0
 const f=loadComponent('pages/index/index.js',{
  '../../utils/session':{getCurrentUser:()=>user,isSessionChecked:()=>false,subscribeSession(fn){sessionListener=fn;return()=>{}}},
  '../../utils/tokendance':{refreshTokenDanceConnection:async()=>{refreshed++;return{connected:true}}},
  '../../utils/model-registry-store':{subscribeModelRegistry:()=>()=>{},loadModelRegistry:async()=>({registry})}
 },{wx:{getWindowInfo:()=>({windowWidth:390,windowHeight:670})}})
 const p=f.instance;for(const name of ['restoreDraft','checkHealth','loadFeaturedTemplates','refreshCanSubmit','stopPolling'])p[name]=()=>{}
 f.definition.lifetimes.attached.call(p);user={id:'restored-user',email:'fixture@example.invalid'};sessionListener(user)
 await Promise.resolve();assert.equal(refreshed,1);assert.equal(p.data.isLoggedIn,true)
})
