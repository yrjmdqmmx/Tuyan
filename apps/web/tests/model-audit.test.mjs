import test, {afterEach} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {render,screen,cleanup,fireEvent,waitFor} from '@testing-library/react';
import {catalogRows,libraryRows} from '../src/workspace/WorkspaceModelCatalog.jsx';
import WorkspaceModelPicker from '../src/workspace/WorkspaceModelPicker.jsx';
import ModelReplacement from '../src/workspace/ModelReplacement.jsx';
import {WorkspaceModelConfig} from '../src/workspace/WorkspaceModelPanels.jsx';
import {modelOption} from '../src/workspace/workspaceModels.js';
import {ModelSpecifications} from '../src/components/ModelSpecifications.jsx';
import {STATIC_MODEL_REGISTRY} from '../src/lib/staticModelCatalog.js';
import {MODEL_AUDIT_DATA,auditedModelLifecycle,auditedModelSpecs} from '../src/lib/modelAudit.js';
import {modalityIconStates} from '../src/lib/modelModalityIcons.js';

afterEach(cleanup);
const registry={providers:STATIC_MODEL_REGISTRY};
const library={connections:[{id:'c',provider:'xiaomi',label:'小米连接',hasCredential:true}],models:[{id:'old',connectionId:'c',modelId:'mimo-v2.5'}]};
const setup=()=>({registry,library:structuredClone(library),ready:true,busy:false,registryStatus:'ready',save:async()=>true});

test('all 61 retired and seven serverless identities are hidden from catalog, retained in saved library even if absent from registry',()=>{
  const now=Date.parse('2026-11-09'),visible=new Set(catalogRows(registry).map(row=>row.provider+'/'+row.model.id));
  for(const key of Object.keys(MODEL_AUDIT_DATA.notices)){
    const split=key.indexOf('/'),provider=key.slice(0,split),modelId=key.slice(split+1);
    if(!auditedModelLifecycle(provider,modelId,now)?.blocked)continue;
    assert.equal(visible.has(key),false,key);
    const saved={connections:[{id:'c',provider}],models:[{id:'old',connectionId:'c',modelId}]},before=structuredClone(saved);
    assert.equal(libraryRows(saved,{providers:{[provider]:{models:[]}}}).length,1);
    assert.deepEqual(saved,before);
  }
});
test('retired saved selection remains on trigger but cannot be chosen for new tasks or presets',()=>{
  const models=setup(),before=structuredClone(models.library),entry=models.library.models[0];
  assert.match(modelOption(entry,models.library,registry,'main','svg',false).reason,/已下架/);
  render(React.createElement(WorkspaceModelPicker,{models,role:'main',path:'svg',current:{libraryModelId:'old',modelId:entry.modelId,accessProvider:'xiaomi'},onChange:()=>assert.fail('No automatic switch')}));
  assert.match(screen.getByRole('button',{name:'主模型'}).textContent,/MiMo|mimo/i);
  fireEvent.click(screen.getByRole('button',{name:'主模型'}));
  assert.equal(screen.queryByRole('button',{name:/选择.*mimo-v2.5/}),null);
  assert.deepEqual(models.library,before);
});
test('replacement requires confirmation, retains original, and only switches the explicitly selected preset',async()=>{
  const models=setup(),before=structuredClone(models.library);let writes=0,saved,selected;
  models.save=async value=>{writes++;saved=value;return true;};
  const view=render(React.createElement(ModelReplacement,{provider:'xiaomi',modelId:'mimo-v2.5',models,entry:models.library.models[0],onReplace:value=>{selected=value;}}));
  fireEvent.click(screen.getByRole('button',{name:/切换到/}));assert.equal(writes,0);assert.deepEqual(models.library,before);
  fireEvent.click(screen.getByRole('button',{name:'确认切换'}));
  await waitFor(()=>assert.equal(writes,1));
  assert.equal(saved.models.find(item=>item.id==='old').modelId,'mimo-v2.5');
  assert.equal(saved.models.find(item=>item.id==='old').disabled,true);
  assert.equal(selected.modelId,'mimo-v2.6-flash');assert.equal(selected.connectionId,'c');
  assert.deepEqual(models.library,before);view.unmount();
});
test('saved presets still show lifecycle and replacement when their library binding is absent',t=>{
  t.mock.method(Date,'now',()=>Date.parse('2026-11-09'));
  const models=setup();models.library.models=[];
  for(const [provider,modelId,label,replacement] of [['xiaomi','mimo-v2.5','已下架','mimo-v2.6-flash'],['bailian','qwen3.5-plus','将于2027-01-19下线','qwen3.8-flash']]){
    const draft={mode:'simple',settings:{simple:{models:{main:{libraryModelId:'missing',accessProvider:provider,modelId}}}}},before=structuredClone(draft);
    const view=render(React.createElement(WorkspaceModelConfig,{models,draft,path:'svg',onChange:()=>assert.fail('No automatic preset rewrite')}));
    assert.ok(screen.getByText(text=>text.includes(label)&&text.includes(replacement)));
    assert.deepEqual(draft,before);view.unmount();
  }
});
test('scheduled status stays selectable before deadline and flips without rewriting stored data',t=>{
  const model=STATIC_MODEL_REGISTRY.bailian.models.find(m=>m.id==='qwen3.5-plus'),r={providers:{bailian:{models:[model]}}},before=structuredClone(model);
  t.mock.method(Date,'now',()=>Date.parse('2027-01-18T23:59:59Z'));
  assert.equal(catalogRows(r).length,1);
  render(React.createElement(ModelSpecifications,{provider:'bailian',model}));
  assert.ok(screen.getByText('将于2027-01-19下线'));assert.ok(screen.getByText(/qwen3.8-flash/));
  Date.now.mock.mockImplementation(()=>Date.parse('2027-01-19'));
  assert.equal(catalogRows(r).length,0);assert.deepEqual(model,before);
});
test('unknown and explicitly unsupported modalities differ, with no invented token limits',()=>{
  const unknown=auditedModelSpecs('custom','looks-like-gpt-5-128k');
  assert.deepEqual(modalityIconStates('未知',unknown.fields.inputModalities).map(x=>x.state),Array(4).fill('unknown'));
  assert.deepEqual(modalityIconStates('不支持',{state:'unsupported',value:null}).map(x=>x.state),Array(4).fill('unsupported'));
  const model=STATIC_MODEL_REGISTRY.openai.models.find(m=>m.id==='gpt-image-2.6-flare');
  const {container}=render(React.createElement(ModelSpecifications,{provider:'openai',model}));
  assert.equal(screen.getAllByText('不适用').length,2);assert.ok(screen.getByText('未核实'));
  assert.equal(container.querySelectorAll('.is-unsupported').length,5);
  assert.doesNotMatch([...container.querySelectorAll('dd')].map(n=>n.textContent).join(' '),/tokens|∞|unlimited|\b0\b/);
});
test('unverified account catalogs preserve availability and provenance never crosses channel',()=>{
  const model=STATIC_MODEL_REGISTRY.openai.models.find(m=>m.id==='gpt-5.1');
  assert.equal(auditedModelSpecs('openai',model.id).unverified,true);
  assert.ok(catalogRows({providers:{openai:{models:[model]}}}).length);
  const vendor=auditedModelSpecs('tokendance','deepseek-v4-pro');
  assert.equal(vendor.fields.maxOutputTokens.provenance,'vendor');
  assert.equal(vendor.fields.totalContextTokens.provenance,'channel');
  assert.equal(auditedModelSpecs('custom','deepseek-v4-pro').fields.totalContextTokens.value,null);
});
