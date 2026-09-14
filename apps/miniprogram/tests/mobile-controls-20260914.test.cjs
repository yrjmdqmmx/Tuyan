const test=require('node:test');const assert=require('node:assert/strict');
const {loadComponent}=require('./helpers/component.cjs');
const {normalizeModelRegistry}=require('../miniprogram/utils/model-registry.js');
const {STATIC_MODEL_REGISTRY}=require('../miniprogram/utils/static-model-catalog.js');
const {getModelRegistryState}=require('../miniprogram/utils/model-registry-store.js');
const {providerDefaultRoutes}=require('../miniprogram/utils/model-routing.js');
const {buildCreateJobPayload}=require('../miniprogram/utils/payload.js');
const {getApiKeys,replaceApiKeys}=require('../miniprogram/utils/api-keys.js');
const registry=normalizeModelRegistry({registryVersion:'ui14',routeContractVersion:1,providerRegionContractVersion:1,supportsModelRoutes:true,providers:{...STATIC_MODEL_REGISTRY,openrouter:STATIC_MODEL_REGISTRY.openai}});getModelRegistryState().registry=registry;
const base=()=>({configurationMode:'advanced',simpleProvider:'tokendance',modelRoutes:{...providerDefaultRoutes('tokendance',registry),main:providerDefaultRoutes('gemini',registry).main},outputFormat:'png',imageSize:'1K',aspectRatio:'auto',pipelineMode:'planner_critic',retrievalSetting:'none',numCandidates:1,maxCriticRounds:1});
function sheet(settings,keys={},connected=true){const f=loadComponent('components/generation-settings-sheet/generation-settings-sheet.js',{'../../utils/tokendance':{hasTokenDanceConnection:()=>connected}});const p=f.instance;p.setData=function(patch,cb){Object.assign(this.data,patch);cb?.()};Object.assign(p.properties,{settings,purpose:'create',apiKeys:keys});p.resetDraft();return f}
test('mixed routes identify Google despite connected TD; direct focus, cancel and save keep shared channel keys coherent',()=>{
 const settings=base(),f=sheet(settings),p=f.instance;
 assert.equal(p.data.routeRows.find(r=>r.role==='main').credentialStatus,'缺少 API Key');assert.equal(p.data.routeRows.find(r=>r.role==='image').credentialStatus,'已连接 · 使用观猹账户额度');assert.match(p.data.credentialSummary,/Google.*API Key/);assert.equal(p.data.routeRows.find(r=>r.role==='image').credentialAction,'管理授权');const disconnected=sheet(settings,{},false).instance;assert.equal(disconnected.data.routeRows.find(r=>r.role==='image').credentialAction,'连接账户');assert.equal(disconnected.data.tokenDanceConnected,false);
 p.configureRoleKey({currentTarget:{dataset:{provider:'gemini'}}});assert.equal(p.data.focusedKeyId,'credential-gemini');assert.equal(p.data.autoFocusProvider,'gemini');
 p.onKeyInput({currentTarget:{dataset:{provider:'gemini'}},detail:{value:'fictional-test-google'}});assert.equal(p.data.routeRows[0].credentialStatus,'已配置');assert.equal(p.properties.apiKeys.gemini,undefined);p.cancel();assert.equal(f.events.at(-1).name,'close');
 const saved=sheet(settings).instance;saved.onKeyInput({currentTarget:{dataset:{provider:'gemini'}},detail:{value:'fictional-test-google'}});
 saved.data.editingRole='vision';saved.selectModel({detail:{provider:'gemini',modelId:providerDefaultRoutes('gemini',registry).vision.modelId}});
 assert.equal(saved.data.keyFields.filter(f=>f.provider==='gemini').length,1);assert.equal(saved.data.routeRows.find(r=>r.role==='vision').credentialStatus,'已配置');
 const payload=buildCreateJobPayload({...saved.data.draft,provider:'tokendance',registry,apiKeys:saved.data.draftKeys,categoryId:'method_framework',categoryLabel:'方法框架',methodContent:'测试混合渠道提交参数和共享密钥',caption:'测试图注',referenceImageMode:'vision_model',uploadedReferenceImages:[{objectKey:'fixture',filename:'fixture.png',mimeType:'image/png',size:1}],manualReferenceIds:[]});
 assert.equal(payload.modelRoutes.main.accessProvider,'gemini');assert.equal(payload.modelRoutes.image.accessProvider,'tokendance');assert.deepEqual(payload.apiKeys,{gemini:'fictional-test-google'});assert.equal(payload.apiKey,undefined);
});
test('workbench blocks missing Google and points to it without treating TD as a shared credential',()=>{
 replaceApiKeys({});const f=loadComponent('pages/index/index.js',{'../../utils/tokendance':{hasTokenDanceConnection:()=>true}});const p=f.instance;Object.assign(p.data,{settings:base(),registryReady:true,methodContent:'用于验收混合渠道的研究方法描述，确保长度达到提交要求。',caption:'图一：流程。',referenceModeCanSubmit:true});p.refreshCanSubmit();assert.equal(p.data.canSubmit,false);assert.equal(p.data.missingCredentialProvider,'gemini');assert.match(p.data.submitHint,/Google.*API Key/);
 replaceApiKeys({gemini:'fictional-test-google'});p.refreshCanSubmit();assert.equal(p.data.canSubmit,true);replaceApiKeys({});
});
test('carousel native autoplay pauses on touch/modal/background and never applies templates on change',()=>{
 const f=loadComponent('components/featured-template-studio/featured-template-studio.js');const p=f.instance;p.properties.templates=[{id:'a'},{id:'b'}];f.definition.lifetimes.attached.call(p);assert.equal(p.data.autoplay,true);
 p.onChange({detail:{current:1}});assert.equal(f.events.length,0);p.touchStart();assert.equal(p.data.autoplay,false);p.touchEnd();assert.equal(p.data.autoplay,true);
 p.properties.paused=true;p.updateAutoplay();assert.equal(p.data.autoplay,false);f.definition.pageLifetimes.hide.call(p);p.properties.paused=false;p.updateAutoplay();assert.equal(p.data.autoplay,false);f.definition.pageLifetimes.show.call(p);assert.equal(p.data.autoplay,true);
 p.applyTemplate({currentTarget:{dataset:{id:'b'}}});assert.equal(f.events[0].name,'apply');f.definition.lifetimes.detached.call(p);assert.equal(p.data.autoplay,false);
});
test('MiniMax channel key fields follow region slots and preserve the other regional key',()=>{
 const chosen=base();chosen.modelRoutes.main=providerDefaultRoutes('minimax',registry).main;chosen.providerRegions={minimax:'global'};const p=sheet(chosen,{'minimax:global':'fictional-global','minimax:cn':'fictional-cn'}).instance;
 p.onMiniMaxRegionChange({detail:{value:'1'}});assert.equal(p.data.keyFields.find(f=>f.provider==='minimax').value,'fictional-cn');p.onKeyInput({currentTarget:{dataset:{provider:'minimax'}},detail:{value:'fictional-new-cn'}});assert.equal(p.data.draftKeys['minimax:global'],'fictional-global');assert.equal(p.data.draftKeys['minimax:cn'],'fictional-new-cn');
});
test('missing mini-status route reports undeployed identity bridge without masking the 404',async()=>{
 const fs=require('node:fs'),vm=require('node:vm');const output={};vm.runInNewContext(fs.readFileSync(require.resolve('../miniprogram/utils/watcha.js'),'utf8'),{exports:output,require(name){if(name==='./api')return {authRequest:async()=>{const e=new Error('HTTP 404');e.httpStatus=404;throw e}};if(name==='./config')return {AUTH_BASE:'https://fixture.invalid/api/auth'};throw Error(name)}});
 await assert.rejects(output.watchaRequest('mini-status'),e=>e.code==='WATCHA_MINI_NOT_DEPLOYED'&&e.message.includes('404')&&e.message.includes('消费授权不受'));
});
