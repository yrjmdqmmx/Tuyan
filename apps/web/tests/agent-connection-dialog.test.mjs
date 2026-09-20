import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AgentConnectionDialog from '../src/components/AgentConnectionDialog.jsx';
import { AGENT_CONNECTION_PROMPT, AGENT_INSTALLATION_URL } from '../src/lib/agentAccess.js';

const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
afterEach(() => {
  cleanup();
  if (clipboardDescriptor) Object.defineProperty(navigator, 'clipboard', clipboardDescriptor);
  else delete navigator.clipboard;
});
function clipboard(writeText) {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
}

test('copies the complete public prompt and reports copy only, with readable manual documentation', async () => {
  let copied;
  clipboard(async (text) => { copied = text; });
  render(React.createElement(AgentConnectionDialog, { open: true, onClose() {} }));
  const prompt = screen.getByRole('textbox', { name: '接入口令' });
  assert.equal(prompt.value, AGENT_CONNECTION_PROMPT);
  assert.equal(prompt.readOnly, true);
  assert.equal(screen.getByRole('link', { name: '官方接入说明' }).href, AGENT_INSTALLATION_URL);
  fireEvent.click(screen.getByRole('button', { name: '复制接入口令' }));
  await waitFor(() => assert.match(screen.getByRole('status').textContent, /口令已复制/u));
  assert.equal(copied, prompt.value);
  assert.match(copied, /仅做只读验证/u);
  assert.match(screen.getByRole('status').textContent, /配置和验证由 Agent 继续完成/u);
  assert.doesNotMatch(screen.getByRole('status').textContent, /已接入|接入成功|配置已完成|接入已验证/u);
});

test('clipboard rejection keeps the complete prompt selected for manual copy and supports retry', async () => {
  clipboard(async () => { throw new Error('Denied'); });
  render(React.createElement(AgentConnectionDialog, { open: true, onClose() {} }));
  // Let the modal finish its initial focus before testing fallback focus.
  await new Promise((resolve) => window.requestAnimationFrame(resolve));
  fireEvent.click(screen.getByRole('button', { name: '复制接入口令' }));
  await waitFor(() => assert.match(screen.getByRole('status').textContent, /复制失败/u));
  const prompt = screen.getByRole('textbox', { name: '接入口令' });
  assert.equal(document.activeElement, prompt);
  assert.equal(prompt.selectionStart, 0);
  assert.equal(prompt.selectionEnd, AGENT_CONNECTION_PROMPT.length);
  clipboard(async () => {});
  fireEvent.click(screen.getByRole('button', { name: '复制接入口令' }));
  await waitFor(() => assert.match(screen.getByRole('status').textContent, /口令已复制/u));
});

test('a late clipboard result cannot report success after closing and reopening the dialog', async () => {
  let resolveCopy;
  clipboard(() => new Promise((resolve) => { resolveCopy = resolve; }));
  const props = { open: true, onClose() {} };
  const view = render(React.createElement(AgentConnectionDialog, props));
  fireEvent.click(screen.getByRole('button', { name: '复制接入口令' }));
  assert.equal(screen.getByRole('button', { name: '复制中…' }).disabled, true);
  view.rerender(React.createElement(AgentConnectionDialog, { ...props, open: false }));
  view.rerender(React.createElement(AgentConnectionDialog, props));
  await act(async () => resolveCopy());
  assert.equal(screen.getByRole('status').textContent, '');
  assert.ok(screen.getByRole('button', { name: '复制接入口令' }));
});
