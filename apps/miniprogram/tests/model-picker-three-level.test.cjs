const test=require('node:test');const assert=require('node:assert/strict');
const {loadComponent}=require('./helpers/component.cjs');
const {normalizeModelRegistry,partitionRegistryModels,groupRegistryModels}=require('../miniprogram/utils/model-registry.js');
const {STATIC_MODEL_REGISTRY}=require('../miniprogram/utils/static-model-catalog.js');
const {getModelRegistryState}=require('../miniprogram/utils/model-registry-store.js');
const {modelDeveloper}=require('../miniprogram/utils/model-presentation.js');
const {registryForRegions}=require('../miniprogram/utils/provider-regions.js');
const {providerDefaultRoutes}=require('../miniprogram/utils/model-routing.js');
const {buildCreateJobPayload}=require('../miniprogram/utils/payload.js');
const registry=normalizeModelRegistry({registryVersion:'three-level',supportsModelRoutes:true,routeContractVersion:1,providerRegionContractVersion:1,providers:{...STATIC_MODEL_REGISTRY,openrouter:{...STATIC_MODEL_REGISTRY.openai,accessKind:'aggregator'}}});getModelRegistryState().registry=registry;
const routeFor=(channel,role)=>({accessProvider:channel,modelId:registry.providers[channel].defaults[role]||partitionRegistryModels(registry.providers[channel].models,{role,outputFormat:'png'}).compatible[0].id});
const plain=value=>JSON.parse(JSON.stringify(value));
const tap=(key,value)=>({currentTarget:{dataset:{[key]:value}}});
function picker(role='main',route={}){const f=loadComponent('components/model-picker/model-picker.js');Object.assign(f.instance.properties,{show:true,role,outputFormat:'png',selectedProvider:route.accessProvider||'',selectedModel:route.modelId||''});f.instance.resetFlow();return f;}
test('Kimi single vendor remains an explicit step; reopening restores the full selected path without emitting selection',()=>{
 const route=routeFor('kimi','main');const {instance:p,events}=picker('main',route);
 assert.equal(p.data.step,'providers');assert.equal(p.data.activeProviderLabel,'Kimi');assert.equal(p.data.activeVendor,'月之暗面');assert.ok(p.data.activeModelLabel);
 p.selectProvider(tap('provider','kimi'));assert.equal(p.data.step,'vendors');assert.deepEqual(p.data.vendorCards.map(v=>v.vendor),['月之暗面']);assert.equal(p.data.visibleCompatibleModels.length,0);
 p.selectVendor(tap('vendor','月之暗面'));assert.equal(p.data.step,'models');assert.equal(p.data.visibleCompatibleModels.find(m=>m.id===route.modelId).selected,true);
 p.onSearch({detail:{value:route.modelId}});p.toggleDetails(tap('model',route.modelId));assert.equal(events.length,0);
 p.backStep();assert.equal(p.data.step,'vendors');assert.equal(p.data.query,'');p.backStep();assert.equal(p.data.step,'providers');p.showModels();assert.equal(p.data.step,'models');assert.equal(events.length,0);
 p.close();p.resetFlow();assert.equal(events.at(-1).name,'close');assert.equal(p.data.expandedModel,'');assert.equal(p.data.activeVendor,'月之暗面');
});
test('aggregator vendor boundaries, backtracking and channel switching clear stale lower lists',()=>{
 const {instance:p,events}=picker();p.selectProvider(tap('provider','tokendance'));assert.equal(p.data.step,'vendors');assert.ok(p.data.vendorCards.length>1);
 const a=p.data.vendorCards[0].vendor,b=p.data.vendorCards[1].vendor;
 p.selectVendor(tap('vendor',a));const aId=p.data.visibleCompatibleModels[0].id;p.onSearch({detail:{value:'no-match-qa'}});assert.equal(p.data.compatibleCount,0);assert.equal(p.data.activeVendor,a);
 p.backStep();p.selectVendor(tap('vendor',b));assert.ok(p.data.compatibleCount>0);assert.equal(p.data.query,'');p.choose(tap('model',aId));assert.equal(events.length,0);
 p.showProviders();p.selectProvider(tap('provider','kimi'));assert.equal(p.data.step,'vendors');assert.equal(p.data.activeVendor,'');assert.equal(p.data.activeModelLabel,'');assert.equal(p.data.visibleCompatibleModels.length,0);assert.equal(p.data.hasMore,false);
 p.selectVendor(tap('vendor',a));p.showModels();assert.equal(p.data.step,'vendors');assert.equal(events.length,0);p.selectVendor(tap('vendor','月之暗面'));p.choose(tap('model',p.data.visibleCompatibleModels[0].id));assert.equal(events.length,1);assert.equal(events[0].detail.provider,'kimi');
});
test('every role and region uses exact compatible channel-vendor-model membership, including format filters',()=>{
 for(const role of ['main','image','vision'])for(const region of ['global','cn'])for(const format of ['png','svg']){
  const {instance:p,events}=picker(role);p.properties.providerRegions={minimax:region};p.properties.outputFormat=format;p.resetFlow();const scoped=registryForRegions(registry,p.properties.providerRegions);
  const expected=Object.entries(scoped.providers).filter(([,e])=>partitionRegistryModels(e.models,{role,outputFormat:format}).compatible.length).map(([id])=>id).sort();assert.deepEqual(p.data.providerCards.map(c=>c.id).sort(),expected);
  for(const card of p.data.providerCards){p.selectProvider(tap('provider',card.id));assert.equal(p.data.step,'vendors');const groups=groupRegistryModels(partitionRegistryModels(scoped.providers[card.id].models,{role,outputFormat:format}).compatible);assert.deepEqual(p.data.vendorCards.map(v=>[v.vendor,v.count]),groups.map(g=>[g.vendor,g.models.length]));
   for(const group of groups){p.selectVendor(tap('vendor',group.vendor));while(p.data.hasMore)p.loadMore();assert.deepEqual(p.data.visibleCompatibleModels.map(m=>m.id),group.models.map(m=>m.id));p.backStep();}
  }assert.equal(events.length,0);
 }
});
test('each role selects only into its draft; save payload matches channel and ID, cancel restores, credentials stay separate',()=>{
 const original={configurationMode:'advanced',simpleProvider:'tokendance',modelRoutes:providerDefaultRoutes('tokendance',registry),outputFormat:'png',imageSize:'1K',aspectRatio:'auto',pipelineMode:'planner_critic',retrievalSetting:'none',numCandidates:1,maxCriticRounds:1};
 const cases=[['main','kimi'],['image','gemini'],['vision','openai']];
 for(const [role,channel]of cases){const f=loadComponent('components/generation-settings-sheet/generation-settings-sheet.js',{'../../utils/tokendance':{hasTokenDanceConnection:()=>true}});const s=f.instance;Object.assign(s.properties,{show:true,settings:structuredClone(original),apiKeys:{[channel]:'fictional-only'},purpose:'create',executionRoles:['main','image','vision']});s.resetDraft();s.openModelPicker(tap('role',role));
  const route=routeFor(channel,role), model=registry.providers[channel].models.find(m=>m.id===route.modelId);const pf=picker(role,original.modelRoutes[role]),p=pf.instance;p.selectProvider(tap('provider',channel));p.selectVendor(tap('vendor',modelDeveloper(channel,model).label));p.choose(tap('model',route.modelId));s.selectModel({detail:pf.events.at(-1).detail});
  assert.deepEqual(s.properties.settings,original);for(const other of ['main','image','vision'].filter(r=>r!==role))assert.deepEqual(plain(s.data.draft.modelRoutes[other]),original.modelRoutes[other]);assert.equal(s.properties.apiKeys[channel],'fictional-only');
  s.save();const saved=f.events.find(e=>e.name==='save').detail;assert.deepEqual(plain(saved.settings.modelRoutes[role]),route);
  const payload=buildCreateJobPayload({...saved.settings,provider:'tokendance',registry,apiKeys:saved.apiKeys,categoryId:'method_framework',categoryLabel:'方法框架',methodContent:'验证三级目录选择与提交渠道和模型参数的一致性。',caption:'图一：测试流程。',referenceImageMode:'vision_model',uploadedReferenceImages:[{objectKey:'fixture',filename:'fixture.png',mimeType:'image/png',size:1}],manualReferenceIds:[]});
  assert.deepEqual(plain(payload.modelRoutes[role]),route);assert.deepEqual(payload.apiKeys,{[channel]:'fictional-only'});assert.equal(payload.apiKey,undefined);
  s.cancel();s.resetDraft();assert.deepEqual(plain(s.data.draft.modelRoutes),original.modelRoutes);
 }
});
test('role and directory changes reset stale browse state; incompatible saved routes never become selectable',()=>{
 const f=picker('main',routeFor('kimi','main')),p=f.instance;p.selectProvider(tap('provider','kimi'));p.selectVendor(tap('vendor','月之暗面'));p.properties.role='image';f.definition.observers['show, registryVersion, providerRegions, role, outputFormat, selectedProvider, selectedModel'].call(p);assert.equal(p.data.step,'providers');assert.equal(p.data.activeProvider,'');assert.equal(p.data.activeVendor,'');assert.equal(p.data.activeModelLabel,'');p.choose(tap('model','kimi-k3'));assert.equal(f.events.length,0);
 const old=getModelRegistryState().registry;getModelRegistryState().registry=null;p.resetFlow();assert.equal(p.data.providerCards.length,0);assert.equal(p.data.visibleCompatibleModels.length,0);getModelRegistryState().registry=old;
});
