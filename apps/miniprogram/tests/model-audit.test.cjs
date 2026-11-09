const test = require('node:test');
const assert = require('node:assert/strict');
const {removedModel,removedModelHint,auditedModelLifecycle,auditedModelSpecs,withModelAudit} = require('../miniprogram/utils/model-audit.js');
test('mini program shares exact channel lifecycle and independently sourced output limits',()=>{
  const old={id:'mimo-v2.5',selectable:true},before={...old};
  assert.equal(withModelAudit('xiaomi',old).selectable,false);
  assert.match(removedModelHint('xiaomi',old.id),/原型号 mimo-v2.5 已不可用，可改选 mimo-v2.6-flash/);assert.deepEqual(old,before);
  assert.equal(auditedModelLifecycle('bailian','qwen3.5-plus',Date.parse('2027-01-18')).state,'scheduled');
  assert.equal(removedModel('bailian','qwen3.5-plus',Date.parse('2027-01-19')).replacementApiId,'qwen3.8-flash');
  const spec=auditedModelSpecs('tokendance','deepseek-v4-pro');
  assert.ok(spec.fields.totalContextTokens.value>0);assert.equal(spec.fields.maxOutputTokens.provenance,'vendor');
  assert.equal(auditedModelSpecs('antling','Ling-3.2-flash').fields.totalContextTokens.value,'1M');
  assert.equal(auditedModelSpecs('custom','deepseek-v4-pro').fields.maxOutputTokens.value,null);
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
  assert.equal(card.specRows[0].unknownText,'音频?');
  assert.equal(card.specRows[1].unknownText,'图像?、音频?、视频?');
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
  assert.equal(p.data.removedHint,'原型号 mimo-v2.5 已不可用，可改选 mimo-v2.6-flash');
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
  assert.equal(p.data.routeRows[0].removedHint,'原型号 mimo-v2.5 已不可用，可改选 mimo-v2.6-flash');
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
