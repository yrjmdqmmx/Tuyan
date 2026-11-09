import { changeControl } from './menu-helpers.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from '../src/App.jsx';
import { STATIC_MODEL_REGISTRY } from '../src/lib/staticModelCatalog.js';
import { workspaceEntry, selectWorkspaceEntry } from '../src/lib/adminEntry.js';

test('access mode switches retain the complete ordinary preset and allow incomplete custom drafts to be edited', async () => {
  const original=globalThis.fetch, actions=[];
  globalThis.fetch=async(_url,init={})=>{
    if(!init.body)return Response.json({code:0,runtime:'gateway'});
    const {action}=JSON.parse(init.body);actions.push(action);
    if(action==='modelRegistry')return Response.json({code:0,routeContractVersion:1,thinkingContractVersion:1,universalApiContractVersion:1,providers:STATIC_MODEL_REGISTRY});
    return Response.json({code:0,jobs:[],references:[]});
  };
  try {
    render(React.createElement(App));
    await waitFor(()=>assert.ok(actions.includes('modelRegistry')));
    fireEvent.click(screen.getByRole('button',{name:'打开完整设置'}));
    fireEvent.click(screen.getByRole('button',{name:'Google',exact:true}));
    changeControl(screen.getByLabelText('主模型 / 规划思考强度'),{target:{value:'"low"'}});
    fireEvent.click(screen.getByRole('button',{name:/专业模式/}));
    assert.match(screen.getByRole('button',{name:'视觉模型',exact:true}).textContent,/无/);
    fireEvent.click(screen.getByRole('button',{name:'视觉模型',exact:true}));
    fireEvent.click(within(document.querySelector('.model-provider-rail')).getByRole('button',{name:'Google',exact:true}));
    fireEvent.click(screen.getByRole('button',{name:'选择 Gemini 3.7 Flash',exact:true}));
    changeControl(screen.getByLabelText('视觉识别思考强度'),{target:{value:'"high"'}});
    fireEvent.click(screen.getByRole('button',{name:'主模型',exact:true}));
    fireEvent.click(within(document.querySelector('.model-provider-rail')).getByRole('button',{name:'Kimi',exact:true}));
    fireEvent.click(screen.getByRole('button',{name:'选择 Kimi K2.6',exact:true}));
    fireEvent.click(screen.getByRole('button',{name:/普通模式/}));
    assert.equal(screen.getByRole('button',{name:'Google',exact:true}).getAttribute('aria-pressed'),'true');
    assert.equal(screen.getByLabelText('主模型 / 规划思考强度').value,'"low"');
    assert.equal(screen.queryByLabelText('视觉识别思考强度'),null);
    assert.equal(document.querySelectorAll('[data-model-role]').length,2);
    fireEvent.click(screen.getByRole('button',{name:/专业模式/}));
    assert.equal(screen.getByLabelText('视觉识别思考强度').value,'"high"');
    fireEvent.click(screen.getByRole('button',{name:'主模型',exact:true}));
    fireEvent.click(within(document.querySelector('.model-provider-rail')).getByRole('button',{name:'通用 API',exact:true}));
    assert.equal(document.querySelectorAll('.universal-role').length,1);
    assert.equal(document.querySelector('.mode-switch').children.length,2);
    const customModel=document.querySelector('.universal-role input[placeholder="从目录选择，或粘贴服务提供的准确 ID"]');
    changeControl(customModel,{target:{value:'draft-model'}});
    assert.equal(customModel.value,'draft-model');
    fireEvent.click(screen.getByRole('button',{name:/普通模式/}));
    assert.equal(screen.getByRole('button',{name:'Google',exact:true}).getAttribute('aria-pressed'),'true');
    assert.equal(screen.queryByLabelText('视觉识别思考强度'),null);
    assert.equal(screen.getByLabelText('主模型 / 规划思考强度').value,'"low"');
    assert.equal(actions.some(action=>/createJob|refineImage|resume/i.test(action)),false);
  } finally {cleanup();globalThis.fetch=original;window.localStorage.clear();}
});

test('generation waits for a selected original to finish durable browser storage', async () => {
  const original = {fetch:globalThis.fetch,indexedDB:globalThis.indexedDB};
  const {IDBFactory}=await import('fake-indexeddb');
  globalThis.indexedDB=new IDBFactory();
  const actions=[];let release;
  const bytes=new TextEncoder().encode('local selected material');
  const file=new File([bytes],'selected.txt',{type:'text/plain'});
  file.arrayBuffer=()=>new Promise(resolve=>{release=()=>resolve(bytes.buffer)});
  globalThis.fetch=async(_url,init={})=>{
    if(!init.body)return Response.json({code:0,runtime:'gateway'});
    const body=JSON.parse(init.body);actions.push(body.action);
    if(body.action==='modelRegistry')return Response.json({code:0,routeContractVersion:1,providers:STATIC_MODEL_REGISTRY});
    return Response.json({code:0,jobs:[],references:[]});
  };
  try {
    render(React.createElement(App));
    const input=screen.getByLabelText('上传文件');
    await waitFor(()=>assert.equal(input.disabled,false));
    changeControl(input,{target:{files:[file]}});
    await waitFor(()=>assert.equal(typeof release,'function'));
    assert.equal(document.querySelector('.generation-form button[type="submit"]').disabled,true);
    fireEvent.submit(document.querySelector('.generation-form'));
    assert.ok(screen.getByText('请等待文件保存完成。'));
    assert.equal(actions.includes('createJob'),false);
    assert.equal(actions.includes('prepareMaterialUpload'),false);
    await act(async()=>release());
    await waitFor(()=>assert.ok(screen.getByText('已保存到浏览器 · 待读取')));
    assert.ok(screen.getByText('selected.txt'));
    assert.equal(document.querySelector('.generation-form button[type="submit"]').disabled,false);
  } finally {cleanup();globalThis.fetch=original.fetch;globalThis.indexedDB=original.indexedDB;window.localStorage.clear();}
});

test('account entry keeps the actual generation/refine subtree and selected models; history restores the task', async () => {
  const original = globalThis.fetch, scroll = window.scrollTo;
  const actions = [];
  window.scrollTo = () => {};
  globalThis.fetch = async (_url, init = {}) => {
    if (!init.body) return Response.json({ code: 0, runtime: 'gateway' });
    const body = JSON.parse(init.body); actions.push(body.action);
    if (body.action === 'modelRegistry') return Response.json({ code: 0, routeContractVersion: 1, providers: STATIC_MODEL_REGISTRY });
    return Response.json({ code: 0, jobs: [], references: [] });
  };
  try {
    render(React.createElement(App));
    await waitFor(() => assert.ok(actions.includes('modelRegistry')));
    const nav = within(screen.getByRole('navigation', { name: '主导航' }));
    assert.deepEqual(nav.getAllByRole('button').map(button => button.textContent), ['生成候选图', '任务记录', '精修图片', '账户', '使用教程']);
    const method = screen.getByRole('textbox', { name: '论文方法内容', exact: true });
    changeControl(method, { target: { value: '保留研究方法和模型选择。' } });
    fireEvent.click(screen.getByRole('button', { name: '打开完整设置' }));
    const channels = screen.getByRole('group', { name: 'API 接入渠道', exact: true });
    assert.equal(channels.querySelector('button').textContent.trim(), '观猹 TokenDance');
    assert.equal(channels.querySelector('[aria-pressed="true"]').textContent.trim(), '观猹 TokenDance');
    fireEvent.click(screen.getByRole('button', { name: /专业模式/ }));
    fireEvent.click(screen.getByRole('button', { name: '图像生成模型', exact: true }));
    assert.equal(document.querySelector('.model-option.active .model-option-select')?.getAttribute('aria-label'), '选择 Seedream 5.0 Pro');
    fireEvent.click(screen.getByRole('button', { name: '关闭模型选择' }));
    fireEvent.click(screen.getByRole('button', { name: /普通模式/ }));
    fireEvent.click(screen.getByRole('button', { name: '阿里云百炼', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: '关闭生成设置' }));
    const originalImageInput = document.querySelector('input[type="file"]');
    const before = document.querySelector('.generation-settings-facts').textContent;
    fireEvent.click(nav.getByRole('button', { name: '账户', exact: true }));
    assert.equal(nav.getByRole('button', { name: '账户', exact: true }).getAttribute('aria-current'), 'page');
    assert.ok(screen.getByRole('heading', { name: '账户', exact: true }));
    assert.equal(document.querySelector('#method-content'), method, 'keep mounted input and file selection');
    fireEvent.click(nav.getByRole('button', { name: '生成候选图', exact: true }));
    assert.equal(screen.getByRole('textbox', { name: '论文方法内容', exact: true }).value, '保留研究方法和模型选择。');
    assert.equal(document.querySelector('input[type="file"]'), originalImageInput);
    assert.equal(document.querySelector('.generation-settings-facts').textContent, before);
    fireEvent.click(screen.getByRole('button', { name: '打开完整设置' }));
    assert.equal(screen.getByRole('group', { name: 'API 接入渠道', exact: true }).querySelector('[aria-pressed="true"]').textContent.trim(), '阿里云百炼');
    fireEvent.click(screen.getByRole('button', { name: '关闭生成设置' }));
    assert.equal(document.querySelector('.td-recharge'), null, 'wallet only exists on account page');
    fireEvent.click(screen.getByRole('button', { name: '精修图片', exact: true }));
    const instruction = await screen.findByRole('textbox', { name: '精修指令', exact: true });
    changeControl(instruction, { target: { value: '仅放大标签，保留结构。' } });
    const refineImageInput = document.querySelector('input[type="file"]');
    fireEvent.click(nav.getByRole('button', { name: '账户', exact: true }));
    assert.ok(screen.getByRole('button', { name: '返回精修图片' }));
    await act(async () => { window.history.back(); await new Promise(resolve => setTimeout(resolve, 30)); });
    await waitFor(() => assert.equal(screen.getByRole('textbox', { name: '精修指令', exact: true }), instruction));
    assert.equal(instruction.value, '仅放大标签，保留结构。');
    await act(async () => { window.history.forward(); await new Promise(resolve => setTimeout(resolve, 30)); });
    await waitFor(() => assert.ok(screen.getByRole('heading', { name: '账户', exact: true })));
    fireEvent.click(nav.getByRole('button', { name: '精修图片', exact: true }));
    assert.equal(screen.getByRole('textbox', { name: '精修指令', exact: true }), instruction);
    assert.equal(document.querySelector('input[type="file"]'), refineImageInput);
    assert.equal(actions.some(action => /createJob|refineImage|tokenDanceResume|tokenDancePaymentCreate/.test(action)), false);
  } finally { cleanup(); globalThis.fetch = original; window.scrollTo = scroll; }
});

test('catalog refresh preserves a valid channel, preserves a removed channel until the user explicitly changes it, and keeps an explicit Lite model across account navigation', async (t) => {
  const original = globalThis.fetch, scroll = window.scrollTo;
  let providers = structuredClone(STATIC_MODEL_REGISTRY), registryReads = 0;
  let refresh;
  const timeout = globalThis.setTimeout;
  t.mock.method(globalThis, 'setTimeout', (callback, delay, ...args) => {
    const timer = timeout(callback, delay, ...args);
    if (delay === 60_000) refresh = () => { clearTimeout(timer); return callback(...args); };
    return timer;
  });
  window.scrollTo = () => {};
  globalThis.fetch = async (_url, init = {}) => {
    if (!init.body) return Response.json({ code: 0, runtime: 'gateway' });
    const { action } = JSON.parse(init.body);
    if (action === 'modelRegistry') {
      registryReads++;
      return Response.json({ code: 0, routeContractVersion: 1, providers, unavailableProviders: { fixture: '可重试目录' } });
    }
    return Response.json({ code: 0, jobs: [], references: [] });
  };
  const selectedChannel = () => screen.getByRole('group', { name: 'API 接入渠道', exact: true }).querySelector('[aria-pressed="true"]').textContent.trim();
  try {
    render(React.createElement(App));
    await waitFor(() => assert.equal(registryReads, 1));
    fireEvent.click(screen.getByRole('button', { name: '打开完整设置' }));
    fireEvent.click(screen.getByRole('button', { name: 'OpenAI', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: '关闭生成设置' }));
    await act(async () => { assert.ok(refresh); refresh(); });
    await waitFor(() => assert.equal(registryReads, 2));
    fireEvent.click(screen.getByRole('button', { name: '打开完整设置' }));
    assert.equal(selectedChannel(), 'OpenAI');
    fireEvent.click(screen.getByRole('button', { name: '关闭生成设置' }));
    delete providers.openai;
    await act(async () => { assert.ok(refresh); refresh(); });
    await waitFor(() => assert.equal(registryReads, 3));
    fireEvent.click(screen.getByRole('button', { name: '打开完整设置' }));
    await waitFor(() => assert.equal(selectedChannel(), 'OpenAI'));
    assert.equal(screen.getByRole('button', { name: 'OpenAI', exact: true }).disabled, true);
    fireEvent.click(screen.getByRole('button', { name: '观猹 TokenDance', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: /专业模式/ }));
    fireEvent.click(screen.getByRole('button', { name: '图像生成模型', exact: true }));
    assert.equal(document.querySelector('.model-option.active .model-option-select')?.getAttribute('aria-label'), '选择 Seedream 5.0 Pro');
    fireEvent.click(screen.getByRole('button', { name: '选择 Seedream 5.0 lite', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: '关闭生成设置' }));
    const before = document.querySelector('.generation-settings-facts').textContent;
    assert.match(before, /Seedream 5.0 lite/);
    const nav = within(screen.getByRole('navigation', { name: '主导航' }));
    fireEvent.click(nav.getByRole('button', { name: '账户', exact: true }));
    fireEvent.click(nav.getByRole('button', { name: '生成候选图', exact: true }));
    assert.equal(document.querySelector('.generation-settings-facts').textContent, before);
    fireEvent.click(screen.getByRole('button', { name: '打开完整设置' }));
    fireEvent.click(screen.getByRole('button', { name: '图像生成模型', exact: true }));
    assert.equal(document.querySelector('.model-option.active .model-option-select')?.getAttribute('aria-label'), '选择 Seedream 5.0 lite');
  } finally { cleanup(); globalThis.fetch = original; window.scrollTo = scroll; }
});

test('legacy wallet bookmarks open the account and workspace URLs preserve only supported navigation', () => {
  assert.equal(workspaceEntry('?tokendance_wallet=1'), 'account');
  assert.equal(workspaceEntry('?view=refine'), 'refine');
  assert.equal(workspaceEntry('?view=https://outside.test'), 'generate');
  let url;
  selectWorkspaceEntry('refine', { href: 'https://www.paperbanana.asia/?admin=overview&a_tab=users&tokendance_wallet=1&keep=1' }, { pushState(_a, _b, value) { url = value; } });
  assert.equal(url, '/?keep=1&view=refine');
});
