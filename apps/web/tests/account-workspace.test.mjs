import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
    const method = screen.getByRole('textbox', { name: '论文方法内容', exact: true });
    fireEvent.change(method, { target: { value: '保留研究方法和模型选择。' } });
    fireEvent.click(screen.getByRole('button', { name: '打开完整设置' }));
    const channels = screen.getByRole('group', { name: 'API 接入渠道', exact: true });
    assert.equal(channels.querySelector('button').textContent.trim(), '观猹 TokenDance');
    assert.equal(channels.querySelector('[aria-pressed="true"]').textContent.trim(), '阿里云百炼');
    fireEvent.click(screen.getByRole('button', { name: '观猹 TokenDance', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: '关闭生成设置' }));
    const originalImageInput = document.querySelector('input[type="file"]');
    const before = document.querySelector('.generation-settings-facts').textContent;
    fireEvent.click(screen.getByRole('button', { name: '账户与钱包', exact: true }));
    assert.ok(screen.getByRole('heading', { name: '账户', exact: true }));
    assert.equal(document.querySelector('#method-content'), method, 'keep mounted input and file selection');
    fireEvent.click(screen.getByRole('button', { name: '返回工作台' }));
    assert.equal(screen.getByRole('textbox', { name: '论文方法内容', exact: true }).value, '保留研究方法和模型选择。');
    assert.equal(document.querySelector('input[type="file"]'), originalImageInput);
    assert.equal(document.querySelector('.generation-settings-facts').textContent, before);
    assert.equal(document.querySelector('.td-recharge'), null, 'wallet only exists on account page');
    fireEvent.click(screen.getByRole('button', { name: '精修图片', exact: true }));
    const instruction = await screen.findByRole('textbox', { name: '精修指令', exact: true });
    fireEvent.change(instruction, { target: { value: '仅放大标签，保留结构。' } });
    fireEvent.click(screen.getByRole('button', { name: '账户与钱包', exact: true }));
    assert.ok(screen.getByRole('button', { name: '返回精修图片' }));
    await act(async () => { window.history.back(); await new Promise(resolve => setTimeout(resolve, 30)); });
    await waitFor(() => assert.equal(screen.getByRole('textbox', { name: '精修指令', exact: true }), instruction));
    assert.equal(instruction.value, '仅放大标签，保留结构。');
    assert.equal(actions.some(action => /createJob|refineImage|tokenDanceResume|tokenDancePaymentCreate/.test(action)), false);
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
