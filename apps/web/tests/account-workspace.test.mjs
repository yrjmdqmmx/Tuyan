import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from '../src/App.jsx';
import { STATIC_MODEL_REGISTRY } from '../src/lib/staticModelCatalog.js';
import { workspaceEntry, selectWorkspaceEntry } from '../src/lib/adminEntry.js';

test('account entry keeps the actual generation/refine subtree and selected models; history restores the task', async () => {
  const original = globalThis.fetch, scroll = window.scrollTo;
  const actions = [];
  window.scrollTo = () => {};
  globalThis.fetch = async (_url, init = {}) => {
    if (!init.body) return Response.json({ code: 0, runtime: 'laf' });
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
    fireEvent.change(method, { target: { value: '保留研究方法和模型选择。' } });
    fireEvent.click(screen.getByRole('button', { name: '打开完整设置' }));
    const channels = screen.getByRole('group', { name: 'API 接入渠道', exact: true });
    assert.equal(channels.querySelector('button').textContent.trim(), '观猹 TokenDance');
    assert.equal(channels.querySelector('[aria-pressed="true"]').textContent.trim(), '观猹 TokenDance');
    fireEvent.click(screen.getByRole('button', { name: /专业模式/ }));
    fireEvent.click(screen.getByRole('button', { name: '图像生成模型', exact: true }));
    assert.equal(document.querySelector('.model-option.active code')?.textContent, 'seedream-5.0-pro');
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
    fireEvent.change(instruction, { target: { value: '仅放大标签，保留结构。' } });
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

test('catalog refresh preserves a valid channel, falls back to TokenDance for a removed channel, and keeps an explicit Lite model across account navigation', async () => {
  const original = globalThis.fetch, scroll = window.scrollTo;
  let providers = structuredClone(STATIC_MODEL_REGISTRY), registryReads = 0;
  window.scrollTo = () => {};
  globalThis.fetch = async (_url, init = {}) => {
    if (!init.body) return Response.json({ code: 0, runtime: 'laf' });
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
    fireEvent.click(screen.getByRole('button', { name: '重试目录' }));
    await waitFor(() => assert.equal(registryReads, 2));
    fireEvent.click(screen.getByRole('button', { name: '打开完整设置' }));
    assert.equal(selectedChannel(), 'OpenAI');
    fireEvent.click(screen.getByRole('button', { name: '关闭生成设置' }));
    delete providers.openai;
    fireEvent.click(screen.getByRole('button', { name: '重试目录' }));
    await waitFor(() => assert.equal(registryReads, 3));
    fireEvent.click(screen.getByRole('button', { name: '打开完整设置' }));
    await waitFor(() => assert.equal(selectedChannel(), '观猹 TokenDance'));
    fireEvent.click(screen.getByRole('button', { name: /专业模式/ }));
    fireEvent.click(screen.getByRole('button', { name: '图像生成模型', exact: true }));
    assert.equal(document.querySelector('.model-option.active code').textContent, 'seedream-5.0-pro');
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
    assert.equal(document.querySelector('.model-option.active code').textContent, 'seedream-5.0-lite');
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
