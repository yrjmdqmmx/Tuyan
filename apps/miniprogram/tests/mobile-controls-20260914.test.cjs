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
function sheet(settings,keys={},connected=true,wx={}){const f=loadComponent('components/generation-settings-sheet/generation-settings-sheet.js',{'../../utils/tokendance':{hasTokenDanceConnection:()=>connected}},{wx});const p=f.instance;p.setData=function(patch,cb){Object.assign(this.data,patch);cb?.()};Object.assign(p.properties,{settings,purpose:'create',apiKeys:keys});p.resetDraft();return f}
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

test('each keyed channel shows its own guide; copying cannot alter keys or routes and TD requires no key guide',()=>{
 const {PROVIDERS}=require('../miniprogram/utils/constants.js');
 const clipboard=[],toasts=[];
 const wx={setClipboardData(o){clipboard.push(o.data);o.success()},showToast(o){toasts.push(o.title)}};
 for(const config of PROVIDERS.filter(c=>c.id!=='tokendance')){
  assert.equal(config.guideSteps.length,3,config.id);assert.match(config.guideUrl,/^https:\/\//,config.id);
  const chosen=base();const role=['main','image','vision'].find(role=>registry.providers[config.id]?.models.some(m=>m.roles.includes(role)&&m.selectable!==false));assert.ok(role,config.id);
  chosen.modelRoutes[role]={accessProvider:config.id,modelId:registry.providers[config.id].models.find(m=>m.roles.includes(role)&&m.selectable!==false).id};
  const p=sheet(chosen,{[config.id]:'fictional-secret'},true,wx).instance;
  const before=JSON.stringify({draft:p.data.draft,keys:p.data.draftKeys});const field=p.data.keyFields.find(f=>f.provider===config.id);assert.ok(field?.guideSteps.length&&field.guideHost,config.id);
  p.copyKeyGuide({currentTarget:{dataset:{provider:config.id}}});assert.equal(clipboard.at(-1),field.guideUrl);assert.ok(!clipboard.at(-1).includes('fictional-secret'));assert.equal(JSON.stringify({draft:p.data.draft,keys:p.data.draftKeys}),before);
 }
 const p=sheet(base(),{},true,wx).instance;const count=clipboard.length;assert.equal(p.data.keyFields.find(f=>f.provider==='tokendance').guideUrl,'');
 for(const provider of ['tokendance','unavailable'])p.copyKeyGuide({currentTarget:{dataset:{provider}}});assert.equal(clipboard.length,count);assert.equal(toasts.length,21);
});
test('MiniMax guide and copied link follow draft region, including switching back without saving',()=>{
 const chosen=base();chosen.modelRoutes.main=providerDefaultRoutes('minimax',registry).main;const copied=[];
 const f=sheet(chosen,{},true,{setClipboardData(o){copied.push(o.data)},showToast(){}});const p=f.instance;
 p.onMiniMaxRegionChange({detail:{value:'1'}});let field=p.data.keyFields.find(f=>f.provider==='minimax');assert.match(field.guideUrl,/platform.minimaxi.com/);assert.match(field.guideSteps[0],/中国大陆/);p.copyKeyGuide({currentTarget:{dataset:{provider:'minimax'}}});assert.equal(copied.at(-1),field.guideUrl);
 p.onMiniMaxRegionChange({detail:{value:'0'}});field=p.data.keyFields.find(f=>f.provider==='minimax');assert.match(field.guideUrl,/platform.minimax.io/);assert.match(field.guideSteps[0],/国际/);p.cancel();assert.equal(f.events.at(-1).name,'close');assert.equal(chosen.providerRegions,undefined);
});
