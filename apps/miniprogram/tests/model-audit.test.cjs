const {sourceTitle}=require('../miniprogram/utils/card-presentation.js')
const test = require('node:test');
const assert = require('node:assert/strict');
const {removedModel,removedModelHint,auditedModelLifecycle,auditedModelSpecs,withModelAudit} = require('../miniprogram/utils/model-audit.js');
test('mini program shares exact channel lifecycle and independently sourced output limits',()=>{
  const old={id:'mimo-v2.5',selectable:true},before={...old};
  assert.equal(withModelAudit('xiaomi',old).selectable,false);
  assert.equal(removedModelHint('xiaomi',old.id),'MiMo-v2.5：原型号已不可用，请重新选择。推荐：MiMo-V2.6-Flash');assert.deepEqual(old,before);
  assert.equal(auditedModelLifecycle('bailian','qwen3.5-plus',Date.parse('2027-01-18')).state,'scheduled');
  assert.equal(removedModel('bailian','qwen3.5-plus',Date.parse('2027-01-19')).replacementApiId,'qwen3.8-flash');
  const spec=auditedModelSpecs('tokendance','deepseek-v4-pro');
  assert.ok(spec.fields.totalContextTokens.value>0);assert.equal(spec.fields.maxOutputTokens.provenance,'vendor');
  assert.equal(auditedModelSpecs('antling','Ling-3.2-flash').fields.totalContextTokens.value,'1M');
  assert.equal(auditedModelSpecs('custom','deepseek-v4-pro').fields.maxOutputTokens.value,null);
});

test('R8 mini notices use exact main display names for removed entries',()=>{
  for(const [provider,id,expected] of [
    ['xiaomi','mimo-v2.5','MiMo-v2.5：原型号已不可用，请重新选择。推荐：MiMo-V2.6-Flash'],
    ['fireworks','accounts/fireworks/models/glm-5p2','GLM 5.2：原型号已不可用，请重新选择。推荐：GLM 5.3'],
    ['stepfun','step-2x-large','Step 2x Large：原型号已不可用，请重新选择。'],
    ['antling','Ling-2.6-flash','Ling 2.6-flash：原型号已不可用，请重新选择。推荐：Ling-3.1-flash'],
  ]) {
    assert.equal(removedModelHint(provider,id,Date.parse('2026-11-16')),expected);
    assert.equal(withModelAudit(provider,{id},Date.parse('2026-11-16')).disabledReason,expected);
  }
  assert.equal(removedModelHint('xiaomi','mimo-v2.6-flash'),'');
});

test('R7 a single removed model without replacement names the original in picker and role helper',()=>{
  const {loadComponent}=require('./helpers/component.cjs');
  const {STATIC_MODEL_REGISTRY}=require('../miniprogram/utils/static-model-catalog.js');
  const {getModelRegistryState}=require('../miniprogram/utils/model-registry-store.js');
  const registry={providers:STATIC_MODEL_REGISTRY};
  getModelRegistryState().registry=registry;
  const f=loadComponent('components/model-picker/model-picker.js');
  const p=f.instance;p.getRegistry=()=>registry;
  Object.assign(p.properties,{selectedProvider:'stepfun',selectedModel:'step-2x-large',role:'main',outputFormat:'svg'});
  p.resetFlow();
  assert.equal(p.data.removedHint,'Step 2x Large：原型号已不可用，请重新选择。');
  assert.equal(p.data.savedReplacement,'');assert.equal(f.events.length,0);
  const sheet=loadComponent('components/generation-settings-sheet/generation-settings-sheet.js');
  const initial={configurationMode:'advanced',simpleProvider:'stepfun',modelRoutes:{main:{accessProvider:'stepfun',modelId:'step-2x-large'},image:{accessProvider:'bailian',modelId:'wan2.7-image-pro'},vision:{accessProvider:'',modelId:''}},outputFormat:'svg',imageSize:'2K',aspectRatio:'1:1',providerRegions:{}};
  const before=structuredClone(initial);
  Object.assign(sheet.instance.properties,{settings:initial,purpose:'create',executionRoles:[],apiKeys:{},manualReferenceIds:[]});
  sheet.instance.resetDraft();
  assert.equal(sheet.instance.data.routeRows[0].removedHint,'Step 2x Large：原型号已不可用，请重新选择。');
  assert.equal(sheet.instance.data.routeRows[0].modelLabel,'请选择');
  assert.deepEqual(initial,before);assert.equal(sheet.events.length,0);
});

test('mini Ling deadlines use the UTC+8 boundary and production compact tokens',()=>{
  const {formatContextLimit}=require('../miniprogram/utils/model-presentation.js');
  assert.equal(formatContextLimit(1048576),'≈ 1M');assert.equal(formatContextLimit(262144),'≈ 262K');
  for(const id of ['Ling-2.6-1T','Ling-2.6-flash','Ring-2.6-1T']) {
    assert.equal(auditedModelLifecycle('antling',id,Date.parse('2026-11-14T15:59:59.999Z')).state,'scheduled');
    assert.equal(removedModel('antling',id,Date.parse('2026-11-14T16:00:00Z')).replacementApiId,'Ling-3.1-flash');
  }
});

test('mini cards keep unlisted modalities neutral and preserve availability notes',()=>{
  const {loadComponent}=require('./helpers/component.cjs');
  const {STATIC_MODEL_REGISTRY}=require('../miniprogram/utils/static-model-catalog.js');
  const {modelDeveloper}=require('../miniprogram/utils/model-presentation.js');
  const fixture=loadComponent('components/model-picker/model-picker.js');
  const picker=fixture.instance;picker.getRegistry=()=>({providers:STATIC_MODEL_REGISTRY});
  Object.assign(picker.properties,{role:'main',outputFormat:'svg'});
  const model=STATIC_MODEL_REGISTRY.antling.models.find(m=>m.id==='Ling-3.0-flash-VL');
  Object.assign(picker.data,{activeProvider:'antling',activeVendor:modelDeveloper('antling',model).label});
  picker.refreshModelLists();
  const card=picker.data.visibleCompatibleModels.find(m=>m.id===model.id);
  assert.equal(card.specRows[0].unknownText,'音频');
  assert.equal(card.specRows[1].unknownText,'图像、视频、音频');
  assert.doesNotMatch(JSON.stringify(card.specRows),/不支持/);
  assert.ok(card.availabilityNotes.includes(model.availabilityNotes));
});

test('compiled picker preserves official labels and shows Gemini output tokens',()=>{
  const {loadComponent}=require('./helpers/component.cjs');
  const {STATIC_MODEL_REGISTRY}=require('../miniprogram/utils/static-model-catalog.js');
  const {modelDeveloper}=require('../miniprogram/utils/model-presentation.js');
  for(const [provider,id,role,expectedContext,expectedOutput,exact] of [
    ['deepseek','deepseek-flash','main','1M tokens','384K tokens','384K tokens'],
    ['gemini','gemini-nano-banana-2.1','image','未知','≈ 33K tokens','32768 tokens'],
  ]) {
    const picker=loadComponent('components/model-picker/model-picker.js').instance;
    picker.getRegistry=()=>({providers:STATIC_MODEL_REGISTRY});
    const model=STATIC_MODEL_REGISTRY[provider].models.find(m=>m.id===id);
    Object.assign(picker.properties,{role,outputFormat:role==='image'?'png':'svg'});
    Object.assign(picker.data,{activeProvider:provider,activeVendor:modelDeveloper(provider,model).label});
    picker.refreshModelLists();
    const card=picker.data.visibleCompatibleModels.find(m=>m.id===id);
    assert.equal(card.specRows[2].value,expectedContext);
    assert.equal(card.specRows[3].value,expectedOutput);
    assert.ok(card.auditMessage.includes(exact));
  }
});

test('mini removed picker offers explicit confirmation only for a compatible replacement',()=>{
  const {loadComponent}=require('./helpers/component.cjs');
  const {STATIC_MODEL_REGISTRY}=require('../miniprogram/utils/static-model-catalog.js');
  let modal;
  const f=loadComponent('components/model-picker/model-picker.js',{}, {wx:{showModal:options=>{modal=options;}}});
  const p=f.instance;p.getRegistry=()=>({providers:STATIC_MODEL_REGISTRY});
  Object.assign(p.properties,{selectedProvider:'xiaomi',selectedModel:'mimo-v2.5',role:'main',outputFormat:'svg'});
  p.resetFlow();assert.equal(f.events.length,0);
  assert.equal(p.data.removedHint,'MiMo-v2.5：原型号已不可用，请重新选择。推荐：MiMo-V2.6-Flash');
  assert.equal(p.data.savedReplacement,'mimo-v2.6-flash');
  p.confirmReplacement();modal.success({confirm:false});assert.equal(f.events.length,0);
  p.confirmReplacement();modal.success({confirm:true});assert.equal(f.events[0].detail.modelId,'mimo-v2.6-flash');
  p.properties.role='image';p.resetFlow();assert.equal(p.data.savedReplacement,'');
});

test('mini removed role uses a placeholder and changes only that role after confirmation',()=>{
  const {loadComponent}=require('./helpers/component.cjs');
  const {STATIC_MODEL_REGISTRY}=require('../miniprogram/utils/static-model-catalog.js');
  const {getModelRegistryState}=require('../miniprogram/utils/model-registry-store.js');
  getModelRegistryState().registry={providers:STATIC_MODEL_REGISTRY};
  let modal;
  const f=loadComponent('components/generation-settings-sheet/generation-settings-sheet.js',{}, {wx:{showModal:options=>{modal=options;}}});
  const p=f.instance;
  const initial={configurationMode:'advanced',simpleProvider:'xiaomi',modelRoutes:{main:{accessProvider:'xiaomi',modelId:'mimo-v2.5'},image:{accessProvider:'bailian',modelId:'wan2.7-image-pro'},vision:{accessProvider:'xiaomi',modelId:'mimo-v2.5'}},outputFormat:'svg',imageSize:'2K',aspectRatio:'1:1',providerRegions:{}};
  Object.assign(p.properties,{settings:initial,purpose:'create',executionRoles:[],apiKeys:{},manualReferenceIds:[]});
  p.resetDraft();const before=JSON.stringify(p.data.draft.modelRoutes);
  assert.equal(p.data.routeRows[0].modelLabel,'请选择');
  assert.equal(p.data.routeRows[0].removedHint,'MiMo-v2.5：原型号已不可用，请重新选择。推荐：MiMo-V2.6-Flash');
  p.replaceRemoved({currentTarget:{dataset:{role:'main'}}});modal.success({confirm:false});assert.equal(JSON.stringify(p.data.draft.modelRoutes),before);
  p.replaceRemoved({currentTarget:{dataset:{role:'main'}}});
  getModelRegistryState().registry={providers:{xiaomi:{models:[]}}};modal.success({confirm:true});
  assert.equal(JSON.stringify(p.data.draft.modelRoutes),before);
  getModelRegistryState().registry={providers:STATIC_MODEL_REGISTRY};
  p.replaceRemoved({currentTarget:{dataset:{role:'main'}}});modal.success({confirm:true});
  assert.equal(p.data.draft.modelRoutes.main.modelId,'mimo-v2.6-flash');
  assert.equal(p.data.draft.modelRoutes.vision.modelId,'mimo-v2.5');assert.equal(initial.modelRoutes.main.modelId,'mimo-v2.5');
  assert.equal(f.events.length,0);
});

test('R6B compiled picker keeps all nine token qualifiers after the unit and sources named by domain',()=>{
  const {loadComponent}=require('./helpers/component.cjs');
  const {STATIC_MODEL_REGISTRY}=require('../miniprogram/utils/static-model-catalog.js');
  const {modelDeveloper}=require('../miniprogram/utils/model-presentation.js');
  const counts={};
  for(const [provider,channel] of Object.entries(STATIC_MODEL_REGISTRY)) for(const model of channel.models) {
    const suffix=auditedModelSpecs(provider,model.id).fields.totalContextTokens.suffix;
    if(!suffix) continue;
    counts[provider]=(counts[provider]||0)+1;
    const p=loadComponent('components/model-picker/model-picker.js').instance;
    p.getRegistry=()=>({providers:STATIC_MODEL_REGISTRY});
    Object.assign(p.properties,{role:model.roles[0],outputFormat:'svg'});
    Object.assign(p.data,{activeProvider:provider,activeVendor:modelDeveloper(provider,model).label});p.refreshModelLists();
    const card=p.data.visibleCompatibleModels.find(m=>m.id===model.id);
    assert.ok(card,model.id);assert.match(card.specRows[2].value,/ tokens（[^）]+）$/);
    for(const source of card.specSources) assert.equal(source.label,'官方文档 · '+sourceTitle(source.url));
    assert.doesNotMatch(card.specRows.map(r=>r.unknownText).join(''),/\?/);
  }
  assert.deepEqual(counts,{siliconflow:6,runware:2,iflytek:1});
});

test('R6B native replacement confirmation uses short labels and source modal uses domain with copy target preserved',()=>{
  const {loadComponent}=require('./helpers/component.cjs');
  const {STATIC_MODEL_REGISTRY}=require('../miniprogram/utils/static-model-catalog.js');
  let modal,copy;
  const p=loadComponent('components/model-picker/model-picker.js',{}, {wx:{showModal:options=>{modal=options;},setClipboardData:options=>{copy=options.data;}}}).instance;
  p.getRegistry=()=>({providers:STATIC_MODEL_REGISTRY});
  Object.assign(p.properties,{selectedProvider:'fireworks',selectedModel:'accounts/fireworks/models/glm-5p2',role:'main',outputFormat:'svg'});
  p.resetFlow();assert.equal(p.data.removedHint,'GLM 5.2：原型号已不可用，请重新选择。推荐：GLM 5.3');
  p.confirmReplacement();assert.match(modal.content,/→ GLM 5.3/);assert.doesNotMatch(modal.content,/accounts\/fireworks\/models\/glm-5p3/);
  const url='https://example.com/long/deprecation/path';
  p.copySource({currentTarget:{dataset:{url,source:'下线公告 · example.com',notice:'将于明日下线'}}});
  assert.match(modal.content,/下线公告 · example.com/);assert.doesNotMatch(modal.content,/https:\/\//);
  modal.success({confirm:true});assert.equal(copy,url);
  const fs=require('node:fs'),path=require('node:path');
  const template=fs.readFileSync(path.join(__dirname,'../miniprogram/components/model-picker/model-picker.wxml'),'utf8');
  assert.match(template,/class="secondary-button" bindtap="confirmReplacement">改选/);
  assert.match(template,/!compatibleCount && !removedHint/);
  assert.match(template,/!providerCards.length && !removedHint/);
});
