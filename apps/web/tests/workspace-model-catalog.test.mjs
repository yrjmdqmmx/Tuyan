import test,{afterEach} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {render,screen,fireEvent,cleanup,waitFor,within} from '@testing-library/react';
import WorkspaceModelCatalog,{catalogRows} from '../src/workspace/WorkspaceModelCatalog.jsx';

afterEach(cleanup);
const registry={providers:{openai:{models:[{id:'shared-v1',label:'Shared model',roles:['main','vision']},{id:'image-v1',label:'Image model',roles:['image']},{id:'retired',label:'Retired model',roles:['main'],selectable:false}]},tokendance:{models:[{id:'shared-v1',label:'Shared model',roles:['main']}]}}};
const library={revision:1,connections:[{id:'direct',label:'Direct',provider:'openai'},{id:'gateway',label:'Gateway',provider:'tokendance'}],models:[]};
const props={models:{registry,library,registryStatus:'ready',ready:true,busy:false,save:async()=>true},onConnection:()=>{}};

test('catalog is visible before connection setup, filters real roles and retains channel identity',()=>{
 render(React.createElement(WorkspaceModelCatalog,{...props,models:{...props.models,library:{connections:[],models:[]}}}));
 assert.equal(screen.getAllByRole('article').length,4);
 fireEvent.change(screen.getByLabelText('搜索模型目录'),{target:{value:'shared-v1'}});
 assert.equal(screen.getAllByRole('article').length,2);
 assert.deepEqual(new Set(catalogRows(registry,{query:'shared-v1'}).map(row=>row.provider)),new Set(['openai','tokendance']));
 fireEvent.change(screen.getByLabelText('模型角色'),{target:{value:'vision'}});
 assert.equal(screen.getAllByRole('article').length,1);
 fireEvent.change(screen.getByLabelText('搜索模型目录'),{target:{value:'no-match'}});
 assert.ok(screen.getByText('没有匹配的模型'));
 fireEvent.click(screen.getByRole('button',{name:'清除筛选'}));assert.equal(screen.getAllByRole('article').length,4);
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
 assert.equal(screen.getByRole('button',{name:'添加 Retired model · OpenAI'}).disabled,true);
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
