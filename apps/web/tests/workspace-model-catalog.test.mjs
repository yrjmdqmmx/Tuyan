import test,{afterEach} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {render,screen,fireEvent,cleanup,waitFor,within} from '@testing-library/react';
import WorkspaceModelCatalog,{catalogRows} from '../src/workspace/WorkspaceModelCatalog.jsx';

afterEach(cleanup);
const registry={providers:{openai:{models:[{id:'shared-v1',label:'Shared model',roles:['main','vision']},{id:'image-v1',label:'Image model',roles:['image']},{id:'retired',label:'Retired model',roles:['main'],selectable:false,lifecycle:'legacy',lifecycleSourceUrl:'https://example.com/retirements',disabledReason:'渠道已确认于 2026-09-10 停用此型号'}]},tokendance:{models:[{id:'shared-v1',label:'Shared model',roles:['main']}]}}};
const library={revision:1,connections:[{id:'direct',label:'Direct',provider:'openai'},{id:'gateway',label:'Gateway',provider:'tokendance'}],models:[]};
const props={models:{registry,library,registryStatus:'ready',ready:true,busy:false,save:async()=>true},onConnection:()=>{}};

test('catalog is visible before connection setup, filters real roles and retains channel identity',()=>{
 render(React.createElement(WorkspaceModelCatalog,{...props,models:{...props.models,library:{connections:[],models:[]}}}));
 assert.equal(screen.getAllByRole('article').length,1);
 fireEvent.click(within(screen.getByRole('complementary',{name:'模型渠道筛选'})).getByRole('button',{name:/^OpenAI\s*2$/}));
 assert.equal(screen.getAllByRole('article').length,2);
 fireEvent.change(screen.getByLabelText('搜索模型目录'),{target:{value:'shared-v1'}});
 assert.equal(screen.getAllByRole('article').length,1);
 assert.deepEqual(new Set(catalogRows(registry,{query:'shared-v1'}).map(row=>row.provider)),new Set(['openai','tokendance']));
 fireEvent.change(screen.getByLabelText('模型角色'),{target:{value:'vision'}});
 assert.equal(screen.getAllByRole('article').length,1);
 fireEvent.change(screen.getByLabelText('搜索模型目录'),{target:{value:'no-match'}});
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
 fireEvent.change(screen.getByLabelText('搜索模型目录'),{target:{value:'no-match'}});
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
 fireEvent.change(screen.getByLabelText('搜索模型目录'),{target:{value:'old-deepseek'}});
 assert.equal(screen.queryByRole('article'),null);
 const recovered={providers:{tokendance:{models:[active,{...absent,selectable:true,disabledReason:undefined,catalogPresence:{...absent.catalogPresence,status:'listed'}}]}}};
 rerender(React.createElement(WorkspaceModelCatalog,{...props,models:{...props.models,registry:recovered}}));
 assert.equal(screen.getAllByRole('article').length,1);
 assert.ok(screen.getByRole('heading',{name:'Historical DeepSeek'}));
 assert.equal(r.providers.tokendance.models.length,2,'saved identities are not deleted');
});
