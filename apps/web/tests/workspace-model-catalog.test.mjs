import { changeControl } from './menu-helpers.mjs';
import test,{afterEach} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {render,screen,fireEvent,cleanup,waitFor,within} from '@testing-library/react';
import WorkspaceModelCatalog,{catalogRows} from '../src/workspace/WorkspaceModelCatalog.jsx';
import {WorkspaceModelManager} from '../src/workspace/WorkspaceModelPanels.jsx';
import {STATIC_MODEL_REGISTRY} from '../src/lib/staticModelCatalog.js';
import {filterRegistryModels} from '../src/lib/modelRegistry.js';

afterEach(cleanup);
const registry={providers:{openai:{models:[{id:'shared-v1',label:'Shared model',roles:['main','vision']},{id:'image-v1',label:'Image model',roles:['image']},{id:'retired',label:'Retired model',roles:['main'],selectable:false,lifecycle:'legacy',lifecycleSourceUrl:'https://example.com/retirements',disabledReason:'渠道已确认于 2026-09-10 停用此型号'}]},tokendance:{models:[{id:'shared-v1',label:'Shared model',roles:['main']}]}}};
const library={revision:1,connections:[{id:'direct',label:'Direct',provider:'openai'},{id:'gateway',label:'Gateway',provider:'tokendance'}],models:[]};
const props={models:{registry,library,registryStatus:'ready',ready:true,busy:false,save:async()=>true},onConnection:()=>{}};

test('role changes update channel, manufacturer and catalog counts and resolve incompatible selections without writes',()=>{
 const r={providers:{
  tokendance:{models:[
   {id:'deepseek-text',vendorId:'deepseek',roles:['main']},
   {id:'seedream-image',vendorId:'bytedance',roles:['image']},
   {id:'seedream-image-2',vendorId:'bytedance',roles:['image']},
  ]},
  deepseek:{models:[{id:'direct-text',vendorId:'deepseek',roles:['main']}]},
  openai:{models:[{id:'gpt-image',vendorId:'openai',roles:['image']},{id:'gpt-text',vendorId:'openai',roles:['main']}]},
  fal:{models:[]},
 }};
 const before=structuredClone(library);let writes=0;
 const models={...props.models,registry:r,userId:'fixture',save:()=>{writes++;}};
 const view=render(React.createElement(WorkspaceModelManager,{models}));
 const channels=within(screen.getByRole('complementary',{name:'模型渠道筛选'}));
 const makers=within(screen.getByRole('complementary',{name:'模型厂商筛选'}));
 const tabs=within(screen.getByRole('navigation',{name:'模型管理视图'}));
 const choose=name=>{fireEvent.click(screen.getByRole('combobox',{name:'模型角色'}));fireEvent.click(screen.getByRole('option',{name,exact:true}));};
 assert.ok(tabs.getByRole('button',{name:/模型目录\s*6$/}));
 assert.ok(makers.getByRole('button',{name:/深度求索\s*1$/,pressed:true}));
 choose('绘图模型');
 assert.ok(tabs.getByRole('button',{name:/模型目录\s*3$/}));
 assert.equal(channels.queryByRole('button',{name:/深度求索|fal/}),null);
 assert.ok(channels.getByRole('button',{name:/观猹 TokenDance\s*2$/,pressed:true}));
 assert.ok(channels.getByRole('button',{name:/OpenAI\s*1$/}));
 assert.ok(makers.getByRole('button',{name:/字节跳动\s*2$/,pressed:true}));
 assert.equal(makers.queryByRole('button',{name:/深度求索/}),null);
 assert.equal(screen.getAllByRole('article').length,2);
 choose('主模型');
 fireEvent.click(channels.getByRole('button',{name:/深度求索\s*1$/}));
 choose('绘图模型');
 assert.ok(channels.getByRole('button',{name:/观猹 TokenDance\s*2$/,pressed:true}));
 assert.equal(screen.getAllByRole('article').length,2);
 choose('视觉理解');
 assert.ok(tabs.getByRole('button',{name:/模型目录\s*0$/}));
 assert.equal(channels.queryAllByRole('button').length,0);
 assert.equal(makers.queryAllByRole('button').length,0);
 assert.ok(screen.getByText('没有匹配的模型'));
 fireEvent.click(screen.getByRole('button',{name:'清除筛选'}));
 assert.ok(tabs.getByRole('button',{name:/模型目录\s*6$/}));
 choose('绘图模型');
 view.rerender(React.createElement(WorkspaceModelManager,{models:{...models,registry:{providers:{openai:r.providers.openai}}}}));
 assert.ok(channels.getByRole('button',{name:/OpenAI\s*1$/,pressed:true}));
 assert.ok(tabs.getByRole('button',{name:/模型目录\s*1$/}));
 assert.equal(screen.getAllByRole('article').length,1);
 assert.equal(writes,0);assert.deepEqual(library,before);
});

test('reviewed catalog restores Together, hides fal from current choices and preserves saved entries without writes',t=>{
 t.mock.method(Date,'now',()=>Date.parse('2026-10-28T12:00:00+08:00'));
 const ids={together:'deepseek-ai/DeepSeek-V4-Pro-0813',fal:'imagineart/imagineart-2.0-preview/text-to-image',novita:'ming-image-0.1-design',stability:'sd3.5-flash'};
 const source={providers:Object.fromEntries(Object.entries(ids).map(([p,id])=>[p,{...STATIC_MODEL_REGISTRY[p],models:STATIC_MODEL_REGISTRY[p].models.filter(m=>m.id===id)}]))};
 assert.deepEqual(new Set(catalogRows(source).map(row=>row.provider)),new Set(['together','novita']));
 assert.equal(filterRegistryModels(source.providers.fal.models,{role:'image'}).length,0);
 assert.equal(filterRegistryModels(source.providers.together.models,{role:'main'})[0].id,ids.together);
 const saved={connections:[{id:'fal-old',provider:'fal'}],models:[{id:'history',connectionId:'fal-old',modelId:ids.fal}]},before=structuredClone(saved);let writes=0;
 render(React.createElement(WorkspaceModelCatalog,{...props,models:{...props.models,registry:source,library:saved,save:async()=>{writes++;return true;}}}));
 fireEvent.click(within(screen.getByRole('complementary',{name:'模型渠道筛选'})).getByRole('button',{name:/Together AI/}));
 assert.equal(screen.getByRole('button',{name:/添加 DeepSeek-V4-Pro-0813/}).disabled,false);
 assert.equal(screen.queryByRole('note'),null);
 fireEvent.click(within(screen.getByRole('complementary',{name:'模型渠道筛选'})).getByRole('button',{name:/Novita/}));
 assert.match(screen.getByRole('note').getAttribute('aria-label'),/已确认专用文生图 JSON 协议.*待确认仅限通用目录/);
 assert.equal(writes,0);assert.deepEqual(saved,before);
});

test('catalog is visible before connection setup, filters real roles and retains channel identity',()=>{
 render(React.createElement(WorkspaceModelCatalog,{...props,models:{...props.models,library:{connections:[],models:[]}}}));
 assert.equal(screen.getAllByRole('article').length,1);
 fireEvent.click(within(screen.getByRole('complementary',{name:'模型渠道筛选'})).getByRole('button',{name:/^OpenAI\s*2$/}));
 assert.equal(screen.getAllByRole('article').length,2);
 changeControl(screen.getByLabelText('搜索模型目录'),{target:{value:'shared-v1'}});
 assert.equal(screen.getAllByRole('article').length,1);
 assert.deepEqual(new Set(catalogRows(registry,{query:'shared-v1'}).map(row=>row.provider)),new Set(['openai','tokendance']));
 fireEvent.click(screen.getByRole('combobox',{name:'模型角色'}));
 fireEvent.click(screen.getByRole('option',{name:'视觉理解'}));
 assert.equal(screen.getAllByRole('article').length,1);
 changeControl(screen.getByLabelText('搜索模型目录'),{target:{value:'no-match'}});
 assert.ok(screen.getByText('没有匹配的模型'));
 fireEvent.click(screen.getByRole('button',{name:'清除筛选'}));assert.equal(screen.getAllByRole('article').length,2);
});

test('adding a model binds only to its exact channel connection without replacing existing library',async()=>{
 let saved;
 render(React.createElement(WorkspaceModelCatalog,{...props,models:{...props.models,save:async value=>{saved=value;return true;}}}));
 fireEvent.click(screen.getByRole('button',{name:'添加 Shared model · 观猹 TokenDance'}));
 const dialog=screen.getByRole('dialog');assert.equal(within(dialog).getByLabelText('所属连接').value,'gateway');
 assert.doesNotMatch(within(dialog).getByLabelText('所属连接').textContent,/Direct/);
 fireEvent.click(within(dialog).getByRole('button',{name:'确认添加'}));
 await waitFor(()=>assert.ok(saved));
 assert.equal(saved.models[0].modelId,'shared-v1');assert.equal(saved.models[0].connectionId,'gateway');assert.deepEqual(saved.connections,library.connections);
});

test('unavailable catalog and duplicate exact routes cannot be added',()=>{
 const models={...props.models,library:{...library,models:[{id:'old',connectionId:'direct',modelId:'shared-v1'}]}};
 const view=render(React.createElement(WorkspaceModelCatalog,{...props,models}));
 fireEvent.click(within(screen.getByRole('complementary',{name:'模型渠道筛选'})).getByRole('button',{name:/^OpenAI\s*2$/}));
 assert.equal(screen.queryByRole('button',{name:'添加 Retired model · OpenAI'}),null);
 fireEvent.click(screen.getByRole('button',{name:'添加 Shared model · OpenAI'}));
 assert.equal(screen.getByRole('button',{name:'此连接已添加该型号'}).disabled,true);
 view.rerender(React.createElement(WorkspaceModelCatalog,{...props,models:{...models,registryStatus:'stale'}}));
 assert.ok(screen.getAllByRole('button',{name:/^添加 .* · /}).every(b=>b.disabled));
});

test('missing channel opens its connection setup and never borrows an unrelated connection',()=>{
 let requested,saves=0;
 render(React.createElement(WorkspaceModelCatalog,{models:{...props.models,library:{connections:[library.connections[0]],models:[]},save:async()=>{saves++;return true;}},onConnection:id=>{requested=id;}}));
 fireEvent.click(screen.getByRole('button',{name:'添加 Shared model · 观猹 TokenDance'}));
 assert.equal(screen.queryByRole('button',{name:'确认添加'}),null);
 fireEvent.click(screen.getByRole('button',{name:'配置 观猹 TokenDance'}));
 assert.equal(requested,'tokendance');assert.equal(saves,0);
});


test('retired cards disappear while future retirement, adapter gaps and transient failures remain distinct',t=>{
 t.mock.method(Date,'now',()=>Date.parse('2026-10-26T11:30:00Z'));
 const source='https://example.com/retirements';
 const rows=[
  {id:'expired',expirationDate:'2026-10-26',expirationAt:'2026-10-26T19:30:00+08:00',selectable:true},
  {id:'future',expirationDate:'2026-10-30',expirationAt:'2026-10-30T00:00:00+08:00',lifecycle:'legacy',selectable:false,lifecycleSourceUrl:source,disabledReason:'官方公告此型号于 2026-10-30 停用'},
  {id:'alias-retired',selectable:false,lifecycleSourceUrl:source,disabledReason:'渠道已确认于 2026-09-10 停用此型号'},
  {id:'removed',selectable:false,lifecycleSourceUrl:source,disabledReason:'Runware 完整托管目录已不再提供此型号'},
  {id:'temporary',selectable:false,lifecycle:'legacy',lifecycleSourceUrl:source,disabledReason:'目录读取超时，请重试'},
  {id:'adapter-gap',selectable:false,disabledReason:'接口尚未适配'},
  {id:'unknown-date',expirationDate:'invalid',selectable:true},
  {id:'no-retirement',expirationDate:'2098-01-01',selectable:true},
 ].map(m=>({...m,label:m.id,roles:['main']}));
 const r={providers:{openai:{models:rows}}},before=structuredClone(r);
 assert.deepEqual(catalogRows(r).map(row=>row.model.id),['future','temporary','adapter-gap','unknown-date','no-retirement']);
 assert.equal(catalogRows(r,{query:'alias-retired'}).length,0);
 assert.deepEqual(r,before,'display filtering never deletes historical model IDs');
});

test('cards show three specifications immediately without a disclosure and keep every official source accessible',()=>{
 const sources=['https://example.com/model','https://example.com/limits','https://example.com/api'];
 const r={providers:{openai:{models:[{id:'direct-card',label:'Direct card',roles:['main'],specifications:{version:1,officialInputModalities:['text','image'],officialOutputModalities:['text'],contextWindowTokens:1000000,sourceUrls:sources}}]}}};
 const {container}=render(React.createElement(WorkspaceModelCatalog,{...props,models:{...props.models,registry:r}}));
 const card=screen.getByRole('article');
 assert.equal(card.querySelector('details,summary'),null);
 assert.equal(screen.queryByText('规格与来源'),null);
 assert.deepEqual([...card.querySelectorAll('dt')].map(node=>node.textContent),['输入','输出','上下文窗口']);
 assert.ok(within(card).getByText('1M tokens'));
 assert.deepEqual(within(card).getAllByRole('link').map(link=>link.href),sources);
 assert.ok(container.querySelector('.tw-catalog-card-actions > button'));
});

const manufacturerRegistry={providers:{
 tokendance:{models:[
  {id:'deepseek-route',label:'DeepSeek route',vendorId:'deepseek',roles:['main']},
  {id:'moonshot-route',label:'Kimi route',vendorId:'moonshot',roles:['main','vision']},
  {id:'unknown-route',label:'Unknown route',roles:['main']},
  {id:'expired-route',label:'Expired',vendorId:'deepseek',roles:['main'],expirationAt:'2020-01-01T00:00:00Z',expirationDate:'2020-01-01'},
 ]},
 deepseek:{models:[{id:'deepseek-route',label:'DeepSeek direct',vendorId:'deepseek',roles:['main','vision']}]},
 openai:{models:[{id:'openai-route',label:'GPT route',vendorId:'openai',roles:['main']}]},
}};

test('manufacturer filters span exact channels, intersect search and role, and retain unknown identities',()=>{
 const before=structuredClone(manufacturerRegistry);
 assert.deepEqual(new Set(catalogRows(manufacturerRegistry,{developer:'deepseek'}).map(row=>row.provider)),new Set(['tokendance','deepseek']));
 assert.equal(catalogRows(manufacturerRegistry,{provider:'tokendance',developer:'deepseek',role:'vision'}).length,0);
 assert.equal(catalogRows(manufacturerRegistry,{developer:'deepseek',query:'深度求索',role:'vision'}).length,1);
 assert.deepEqual(catalogRows(manufacturerRegistry,{developer:'unconfirmed'}).map(row=>row.model.id),['unknown-route']);
 assert.deepEqual(manufacturerRegistry,before);
});

test('catalog shows only concrete channels and manufacturers, preserving valid choices on channel changes',()=>{
 render(React.createElement(WorkspaceModelCatalog,{...props,models:{...props.models,registry:manufacturerRegistry}}));
 const channels=within(screen.getByRole('complementary',{name:'模型渠道筛选'}));
 const manufacturers=within(screen.getByRole('complementary',{name:'模型厂商筛选'}));
 assert.equal(screen.queryByRole('button',{name:/全部渠道|全部厂商/}),null);
 assert.ok(channels.getByRole('button',{name:/^观猹 TokenDance\s*3$/,pressed:true}));
 assert.ok(manufacturers.getByRole('button',{name:/^深度求索\s*1$/,pressed:true}));
 assert.equal(screen.getAllByRole('article').length,1);
 assert.ok(screen.getByRole('button',{name:'添加 DeepSeek route · 观猹 TokenDance'}));
 fireEvent.click(manufacturers.getByRole('button',{name:/^月之暗面\s*1$/}));
 assert.ok(screen.getByRole('button',{name:'添加 Kimi route · 观猹 TokenDance'}));
 fireEvent.click(channels.getByRole('button',{name:/^深度求索\s*1$/}));
 assert.ok(manufacturers.getByRole('button',{name:/^深度求索\s*1$/,pressed:true}));
 assert.ok(screen.getByRole('button',{name:'添加 DeepSeek direct · 深度求索'}));
 fireEvent.click(channels.getByRole('button',{name:/^观猹 TokenDance\s*3$/}));
 assert.ok(manufacturers.getByRole('button',{name:/^深度求索\s*1$/,pressed:true}));
 fireEvent.click(channels.getByRole('button',{name:/^OpenAI\s*1$/}));
 assert.ok(manufacturers.getByRole('button',{name:/^OpenAI\s*1$/,pressed:true}));
 changeControl(screen.getByLabelText('搜索模型目录'),{target:{value:'no-match'}});
 fireEvent.click(screen.getByRole('button',{name:'清除筛选'}));
 assert.ok(channels.getByRole('button',{name:/^OpenAI\s*1$/,pressed:true}));
 assert.ok(manufacturers.getByRole('button',{name:/^OpenAI\s*1$/,pressed:true}));
 assert.equal(screen.getAllByRole('article').length,1);
});

test('concrete selection resolves when the catalog loads or the selected channel disappears',()=>{
 const view=render(React.createElement(WorkspaceModelCatalog,{...props,models:{...props.models,registry:null,registryStatus:'loading'}}));
 assert.equal(screen.queryByRole('article'),null);
 view.rerender(React.createElement(WorkspaceModelCatalog,{...props,models:{...props.models,registry:manufacturerRegistry}}));
 const channels=within(screen.getByRole('complementary',{name:'模型渠道筛选'}));
 assert.ok(channels.getByRole('button',{name:/^观猹 TokenDance\s*3$/,pressed:true}));
 fireEvent.click(channels.getByRole('button',{name:/^OpenAI\s*1$/}));
 view.rerender(React.createElement(WorkspaceModelCatalog,{...props,models:{...props.models,registry:{providers:{deepseek:manufacturerRegistry.providers.deepseek}}}}));
 assert.ok(channels.getByRole('button',{name:/^深度求索\s*1$/,pressed:true}));
 assert.ok(within(screen.getByRole('complementary',{name:'模型厂商筛选'})).getByRole('button',{name:/^深度求索\s*1$/,pressed:true}));
 assert.equal(screen.getAllByRole('article').length,1);
});


test('audited absent models stay out of cards, manufacturer counts and search during a catalog outage',()=>{
 const absent={id:'old-deepseek',label:'Historical DeepSeek',vendorId:'deepseek',roles:['main'],selectable:false,disabledReason:'目录读取失败',catalogPresence:{status:'absent',checkedAt:'2026-10-26',sourceUrl:'https://tokendance.space/gateway/v1/models'}};
 const active={id:'current-deepseek',label:'Current DeepSeek',vendorId:'deepseek',roles:['main']};
 const r={providers:{tokendance:{models:[active,absent]}},unavailableProviders:{tokendance:'目录读取失败'}};
 const {rerender}=render(React.createElement(WorkspaceModelCatalog,{...props,models:{...props.models,registry:r}}));
 assert.equal(screen.getAllByRole('article').length,1);
 assert.ok(within(screen.getByRole('complementary',{name:'模型厂商筛选'})).getByRole('button',{name:/深度求索\s*1$/}));
 changeControl(screen.getByLabelText('搜索模型目录'),{target:{value:'old-deepseek'}});
 assert.equal(screen.queryByRole('article'),null);
 const recovered={providers:{tokendance:{models:[active,{...absent,selectable:true,disabledReason:undefined,catalogPresence:{...absent.catalogPresence,status:'listed'}}]}}};
 rerender(React.createElement(WorkspaceModelCatalog,{...props,models:{...props.models,registry:recovered}}));
 assert.equal(screen.getAllByRole('article').length,1);
 assert.ok(screen.getByRole('heading',{name:'Historical DeepSeek'}));
 assert.equal(r.providers.tokendance.models.length,2,'saved identities are not deleted');
});


test('unreviewed tools and unsupported modality discoveries never inflate cards or counts',()=>{
 const r={providers:{fal:{models:[
  {id:'image',roles:['image'],selectable:false,disabledReason:'适配待核对'},
  {id:'fetch',roles:[],catalogDiscovered:true},
  {id:'embedding',roles:['embedding']},
  {id:'audio',roles:['audio']},
  {id:'absent',roles:['image'],selectable:false,disabledReason:'当前渠道的完整公开目录已不再提供此精确型号，已暂停选择与调用；原配置保留，请选择其他型号。'},
 ]}}};
 assert.deepEqual(catalogRows(r).map(row=>row.model.id),['image']);
 assert.equal(r.providers.fal.models.length,5);
});

test('my model cards preserve connection identity, specifications and exact-entry toggles',async()=>{
 let saved;
 const savedLibrary={...library,connections:[...library.connections,{id:'backup',label:'Backup',provider:'tokendance'}],models:[
  {id:'primary-entry',modelId:'shared-v1',connectionId:'gateway'},
  {id:'backup-entry',modelId:'shared-v1',connectionId:'backup',disabled:true},
 ]};
 const view=render(React.createElement(WorkspaceModelCatalog,{...props,mode:'library',models:{...props.models,library:savedLibrary,save:async value=>{saved=value;return true;}}}));
 assert.equal(screen.getAllByRole('article').length,2);
 for(const card of screen.getAllByRole('article')){
  assert.deepEqual([...card.querySelectorAll('dt')].map(node=>node.textContent),['输入','输出','上下文窗口']);
  assert.equal(card.querySelector('details,summary'),null);
 }
 fireEvent.click(screen.getByRole('button',{name:'停用 Shared model · Gateway'}));
 await waitFor(()=>assert.ok(saved));
 assert.equal(saved.models[0].disabled,true);assert.equal(saved.models[1].disabled,true);
 assert.equal(saved.models[0].id,'primary-entry');assert.deepEqual(saved.connections,savedLibrary.connections);
 view.rerender(React.createElement(WorkspaceModelCatalog,{...props,mode:'library',models:{...props.models,library:saved,save:async value=>{saved=value;return true;}}}));
 fireEvent.click(screen.getByRole('button',{name:'启用 Shared model · Backup'}));
 await waitFor(()=>assert.equal(saved.models[1].disabled,false));
 assert.equal(saved.models[0].disabled,true);
 changeControl(screen.getByLabelText('搜索已添加模型'),{target:{value:'Backup'}});
 assert.equal(screen.getAllByRole('article').length,1);
 assert.match(screen.getByRole('article').textContent,/Backup/);
 assert.equal(screen.queryByRole('button',{name:/全部渠道|全部厂商/}),null);
});

test('my models retain offline entries and missing connections without allowing unintended writes',()=>{
 const savedLibrary={connections:library.connections,models:[{id:'orphan',modelId:'custom-id',connectionId:'missing'}, {id:'offline',modelId:'shared-v1',connectionId:'gateway'}]};
 const r={providers:{},unavailableProviders:{tokendance:'网络错误'}};
 render(React.createElement(WorkspaceModelCatalog,{...props,mode:'library',models:{...props.models,registry:r,library:savedLibrary,ready:false}}));
 assert.ok(screen.getByRole('button',{name:'停用 shared-v1 · Gateway'}).disabled);
 fireEvent.click(within(screen.getByRole('complementary',{name:'模型渠道筛选'})).getByRole('button',{name:/自定义/}));
 assert.ok(screen.getByText('连接不存在'));
 assert.ok(screen.getByRole('button',{name:'停用 custom-id · missing'}).disabled);
});

test('pending evidence is visible without reopening expired models or rewriting saved configurations',t=>{
 t.mock.method(Date,'now',()=>Date.parse('2026-10-28T12:00:00+08:00'));
 const review={status:'pending',reason:'官方目录与到期记录冲突，保持原有调用限制。',checkedAt:'2026-10-28',sourceUrls:['https://docs.together.ai/docs/serverless/models']};
 const source={providers:{together:{models:[{id:'conflict',label:'Conflict model',roles:['main'],expirationDate:'2026-09-29',catalogReview:review},{id:'removed',roles:['main'],catalogRemoval:{reason:'official-retirement'},expirationDate:'2026-09-01'}]}}};
 const saved={connections:[{id:'old',provider:'together'}],models:[{id:'kept',connectionId:'old',modelId:'removed'}]};const before=structuredClone(saved);let writes=0;
 assert.deepEqual(catalogRows(source).map(row=>row.model.id),['conflict']);
 render(React.createElement(WorkspaceModelCatalog,{models:{...props.models,registry:source,library:saved,save:async()=>{writes++;return true;}}}));
 assert.match(screen.getByRole('note').getAttribute('aria-label'),/待确认.*官方目录与到期记录冲突/);
 assert.equal(screen.getByRole('button',{name:'添加 Conflict model · Together AI'}).disabled,true);
 assert.equal(writes,0);assert.deepEqual(saved,before);
});
