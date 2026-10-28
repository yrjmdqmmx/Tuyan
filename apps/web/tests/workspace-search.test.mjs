import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import React, { useReducer } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import ResearchEcosystem from '../src/ecosystem/ResearchEcosystem.jsx';
import { ECOSYSTEM_TOOLS } from '../src/ecosystem/catalog.js';
import TaskWorkspace from '../src/workspace/TaskWorkspace.jsx';
import WorkspaceDrawingSettings from '../src/workspace/WorkspaceDrawingSettings.jsx';
import { WorkspaceModelManager } from '../src/workspace/WorkspaceModelPanels.jsx';
import { SEARCH_ENTRIES, RESOURCE_ENTRIES, indexSearchTasks, searchDestinations, searchTasks } from '../src/workspace/workspaceSearch.js';
import { currentDraft, newWorkspace, workspaceReducer } from '../src/workspace/workspaceState.js';

afterEach(cleanup);
const settle = () => act(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const models = {library:{connections:[],models:[]},registry:{providers:{}},summary:{},registryStatus:'ready',ready:true};
const fixture = () => workspaceReducer(newWorkspace('search'), {type:'EDIT_DRAFT',patch:{text:'需要保留的实验流程图'}});
let latest, actions, effects, destinations;
function Harness({mobile = true, isAdmin = false, actualModels = false, actualSettings = false, actualEcosystem = false} = {}) {
  window.matchMedia = query => ({matches:mobile && query.includes('767px'),media:query,addEventListener(){},removeEventListener(){}});
  const [state, dispatch] = useReducer(workspaceReducer, undefined, fixture);
  latest = state;
  return React.createElement(TaskWorkspace, {state, isAdmin, dispatch:action => {actions.push(action);dispatch(action);}, onSubmit:() => effects.push('submit'), onFiles:() => effects.push('files'),
    renderOptimize:child => child({start:() => effects.push('optimize')}),
    renderSvgEditor:() => React.createElement('p', null, 'SVG 编辑入口'),
    renderModels:({management,initialView}) => {destinations.models={management,initialView}; return actualModels && management
      ? React.createElement(WorkspaceModelManager,{initialView,models:{...models,save:() => effects.push('save'),refresh:() => effects.push('refresh'),retry:() => effects.push('retry')},onUseApi:() => effects.push('use-api')})
      : React.createElement('p',null,management ? `模型管理 ${initialView || 'catalog'}` : '任务模型配置');},
    renderSettings:({focusSection} = {}) => {destinations.section=focusSection;return actualSettings
      ? React.createElement(WorkspaceDrawingSettings,{focusSection,models,draft:currentDraft(state),path:'png',onChange:() => effects.push('settings')})
      : React.createElement('p',null,'绘图设置入口');},
    renderAccount:() => React.createElement('p',null,'账户页面'),
    renderPage:(page, _close, _navigate, options) => {destinations.page=page;destinations.tool=options?.initialTool;return actualEcosystem && page === '他山科研生态' ? React.createElement(ResearchEcosystem,{...options,account:{user:{id:'fixture'}},request:() => effects.push('render')}) : React.createElement('p',null,`页面内容 ${page}`);},
  });
}
function setup(props) { actions=[];effects=[];destinations={};return render(React.createElement(Harness,props)); }
async function openSearch(mobile = true) {
  if (mobile) fireEvent.click(screen.getByRole('button',{name:'打开侧边栏'}));
  fireEvent.click(screen.getByRole('button',{name:'搜索',exact:true}));
  await settle();
  return screen.getByRole('dialog',{name:'搜索',exact:true});
}

test('search matches names, common aliases, keywords, multiword queries, casing and fullwidth input', () => {
  for (const [query,id] of [['模型管理','models'],['模型库','models'],['API Key','connections'],['ＡＰＩ　ＫＥＹ','connections'],['base-url','custom-api'],['mcp','agents'],['期刊规范','journals'],['Nature','journals'],['SVG 编辑器','svg'],['图型','figure-types'],['热力图','account'],['新手入门','guide']]) {
    assert.ok(searchDestinations(query).some(entry => entry.id === id), `${query} must reach ${id}`);
  }
  assert.equal(searchDestinations('模型管理')[0].id,'models');
  assert.deepEqual(searchDestinations('不存在的功能xyz'),[]);
  assert.ok(RESOURCE_ENTRIES.every(resource => SEARCH_ENTRIES.includes(resource)));
  assert.equal(new Set(SEARCH_ENTRIES.map(entry => entry.id)).size, SEARCH_ENTRIES.length);
  assert.equal(searchDestinations('admin').length,0);
  assert.equal(searchDestinations('admin',{isAdmin:true})[0].id,'admin');
  assert.equal(searchDestinations('API',{models:false}).length,0);
  assert.equal(searchDestinations('期刊',{settings:false}).length,0);
  assert.equal(searchDestinations('手工稿',{pages:false}).length,0);
  assert.equal(searchDestinations('OpenAcad').length,0,'external links are not internal destinations');
});

test('task search includes title and drafts, scopes archive filter to tasks, and leaves source untouched', () => {
  const state=fixture();
  state.tasks.push({...structuredClone(state.tasks[0]),id:'archived',title:'归档结果',archived:true});
  state.tasks.push({...structuredClone(state.tasks[0]),id:'deleted',title:'删除结果',deleted:true});
  const before=JSON.stringify(state), index=indexSearchTasks(state.tasks);
  assert.equal(searchTasks(index,'实验 流程图').length,1);
  assert.equal(searchTasks(index,'实验 流程图',true).length,3);
  assert.equal(searchTasks(index,'归档结果',true)[0].id,'archived');
  assert.equal(JSON.stringify(state),before);
});

test('task, draft, function and tool groups render; typing and cancelling keep navigation expansion, scroll, and task content', async () => {
  setup();const before=JSON.stringify(latest);
  fireEvent.click(screen.getByRole('button',{name:'打开侧边栏'}));
  fireEvent.click(screen.getByRole('button',{name:'资源与帮助'}));
  const sidebar=screen.getByRole('dialog',{name:'任务导航'}), scroll=sidebar.querySelector('.tw-sidebar-content');scroll.scrollTop=180;
  const trigger=screen.getByRole('button',{name:'搜索',exact:true});fireEvent.click(trigger);await settle();
  const dialog=screen.getByRole('dialog',{name:'搜索',exact:true});
  for (const group of ['任务','功能','工具']) assert.ok(within(dialog).getByRole('region',{name:new RegExp(`^${group}`)}));
  const input=within(dialog).getByRole('textbox',{name:'搜索任务、功能和工具'});
  assert.equal(input.placeholder,'搜索任务、功能和工具');
  fireEvent.change(input,{target:{value:'根本不存在xyz'}});
  assert.match(within(dialog).getByRole('status').textContent,/没有匹配/);
  fireEvent.keyDown(window,{key:'Escape'});await settle();
  assert.equal(screen.getByRole('dialog',{name:'任务导航'}),sidebar);
  assert.equal(screen.getByRole('button',{name:'资源与帮助'}).getAttribute('aria-expanded'),'true');
  assert.equal(scroll.scrollTop,180);assert.equal(document.activeElement,trigger);
  assert.equal(JSON.stringify(latest),before);assert.deepEqual(actions,[]);assert.deepEqual(effects,[]);
});

for (const entry of SEARCH_ENTRIES) test(`search destination ${entry.name} opens its existing location without execution`, async () => {
  const {container}=setup({isAdmin:true});const before=structuredClone(latest);
  const dialog=await openSearch();
  fireEvent.click(within(dialog).getByRole('button',{name:`${entry.name} ${entry.description}`,exact:true}));await settle();
  assert.equal(screen.queryByRole('dialog',{name:'搜索',exact:true}),null);
  assert.equal(container.querySelector('.tw-mobile-nav-open'),null);
  const {target}=entry;
  if (target.composer) assert.equal(document.activeElement.dataset.composerAction, target.composer);
  if (target.panel) {
    assert.ok(screen.getByRole('dialog',{name:target.panel === 'models' ? '模型配置' : '绘图设置'}));
    if(target.section)assert.equal(destinations.section,target.section);
  } else if (target.page === 'models') assert.deepEqual(destinations.models,{management:true,initialView:target.view || null});
  else if (target.page) assert.ok(screen.getByRole('heading',{level:1,name:target.page}));
  if(target.path) {
    assert.equal(latest.tasks[0].path,target.path);
    for(const path of ['png','svg']) {
      for(const field of ['draft','refinements','groups']) assert.deepEqual(latest.tasks[0].branches[path][field],before.tasks[0].branches[path][field]);
    }
    assert.deepEqual(latest.tasks[0].runs,before.tasks[0].runs);
    assert.ok(actions.every(action => action.type === 'SET_PATH'));
  } else {assert.deepEqual(latest,before);assert.deepEqual(actions,[]);}
  assert.deepEqual(effects,[]);
});

test('model search opens real tabs and the API editor without saving or probing', async () => {
  for(const [query,id,view] of [['我的模型','saved-models','library'],['API Key','connections','connections'],['自定义 API','custom-api','api']]) {
    setup({actualModels:true});const before=JSON.stringify(latest);const dialog=await openSearch();
    fireEvent.change(within(dialog).getByRole('textbox'),{target:{value:query}});
    const entry=SEARCH_ENTRIES.find(entry=>entry.id===id);
    fireEvent.click(within(dialog).getByRole('button',{name:`${entry.name} ${entry.description}`}));await settle();
    if(view==='api')assert.ok(screen.getByRole('dialog',{name:'自定义 API 高级配置'}));
    else assert.equal(screen.getByRole('button',{name:view==='library'?/我的模型/:/渠道连接/}).getAttribute('aria-pressed'),'true');
    assert.deepEqual(effects,[]);assert.equal(JSON.stringify(latest),before);cleanup();
  }
});

test('journal and figure search focus the real settings entry without selecting a value', async () => {
  for(const [query,selector] of [['期刊规范','.journal-entry'],['图型','.figure-type-trigger']]) {
    setup({actualSettings:true});const before=JSON.stringify(latest);const dialog=await openSearch();
    fireEvent.change(within(dialog).getByRole('textbox'),{target:{value:query}});
    fireEvent.keyDown(within(dialog).getByRole('textbox'),{key:'Enter'});await settle();
    assert.ok(document.activeElement.querySelector(selector));
    assert.equal(screen.getAllByRole('dialog').length,1);
    assert.equal(JSON.stringify(latest),before);assert.deepEqual(effects,[]);cleanup();
  }
});

test('reselecting the same model search destination resets its tab and reopens the API editor', async () => {
  setup({actualModels:true});const before=JSON.stringify(latest);
  for(const [query,id] of [['我的模型','saved-models'],['我的模型','saved-models'],['自定义 API','custom-api'],['自定义 API','custom-api']]) {
    const dialog=await openSearch();const entry=SEARCH_ENTRIES.find(entry=>entry.id===id);
    fireEvent.change(within(dialog).getByRole('textbox'),{target:{value:query}});
    fireEvent.click(within(dialog).getByRole('button',{name:`${entry.name} ${entry.description}`}));await settle();
    if(id==='saved-models') {
      assert.equal(screen.getByRole('button',{name:/我的模型/}).getAttribute('aria-pressed'),'true');
      fireEvent.click(screen.getByRole('button',{name:/渠道连接/}));
    } else {
      assert.ok(screen.getByRole('dialog',{name:'自定义 API 高级配置'}));
      fireEvent.click(screen.getByRole('button',{name:'关闭自定义 API 高级配置'}));
    }
  }
  assert.deepEqual(effects,[]);assert.deepEqual(actions,[]);assert.equal(JSON.stringify(latest),before);
});

test('desktop collapsed navigation and shortcut support safe Enter selection and cancellation', async () => {
  setup({mobile:false});const before=JSON.stringify(latest);
  fireEvent.click(screen.getByRole('button',{name:'收起侧边栏'}));
  const trigger=screen.getByRole('button',{name:'搜索',exact:true});act(()=>trigger.focus());
  fireEvent.keyDown(window,{key:'k',ctrlKey:true});await settle();
  fireEvent.change(screen.getByRole('textbox',{name:'搜索任务、功能和工具'}),{target:{value:'不存在xyz'}});
  fireEvent.keyDown(screen.getByRole('textbox',{name:'搜索任务、功能和工具'}),{key:'Enter'});
  assert.ok(screen.getByRole('dialog',{name:'搜索'}));
  fireEvent.keyDown(window,{key:'Escape'});await settle();assert.equal(document.activeElement,trigger);
  assert.ok(screen.getByRole('complementary',{name:'快捷导航'}));
  assert.deepEqual(effects,[]);assert.deepEqual(actions,[]);assert.equal(JSON.stringify(latest),before);
});


test('ecosystem search resolves shared names, engine aliases and research keywords', () => {
  for (const tool of ECOSYSTEM_TOOLS) for (const query of [tool.name, ...tool.aliases, ...tool.keywords]) {
    assert.ok(searchDestinations(query).some(entry => entry.target.tool === tool.id), `${query} reaches ${tool.id}`);
  }
  assert.equal(searchDestinations('他山科研生态')[0].id, 'research-ecosystem');
  assert.equal(searchDestinations('VTK')[0].target.tool, 'viznoir');
  assert.equal(searchDestinations('仪表盘')[0].target.tool, 'dataviz');
});

test('search directly opens each ecosystem tool and repeated selection without rendering or editing tasks', async () => {
  setup({actualEcosystem:true});const before=JSON.stringify(latest);
  for (const query of ['桑基图','VTK','仪表盘','Semiotic','Semiotic']) {
    const dialog=await openSearch();
    fireEvent.change(within(dialog).getByRole('textbox',{name:'搜索任务、功能和工具'}),{target:{value:query}});
    const entry=searchDestinations(query).find(entry => entry.target.tool);
    fireEvent.click(within(dialog).getByRole('button',{name:`${entry.name} ${entry.description}`,exact:true}));await settle();
    assert.ok(screen.getByRole('heading',{name:entry.name,exact:true}));
    assert.equal(destinations.tool,entry.target.tool);
    assert.equal(screen.queryByRole('dialog',{name:'搜索',exact:true}),null);
    assert.equal(screen.queryByRole('dialog',{name:'任务导航',exact:true}),null);
    assert.deepEqual(effects,[]);assert.deepEqual(actions,[]);assert.equal(JSON.stringify(latest),before);
    fireEvent.click(screen.getByRole('button',{name:'全部工具'}));
  }
});

test("standalone browser drafts are not exposed as a navigation destination",()=>{assert.equal(searchDestinations("浏览器手工稿").length,0);});
