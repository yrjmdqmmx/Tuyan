import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import React, { useReducer } from 'react';
import { act, cleanup, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WorkspaceAccount from '../src/workspace/WorkspaceAccount.jsx';
import TaskWorkspace from '../src/workspace/TaskWorkspace.jsx';
import { AppLocaleProvider } from '../src/components/BenchmarkLocale.jsx';
import { useAuthSession } from '../src/hooks/useAuthSession.js';
import { newWorkspace, workspaceReducer } from '../src/workspace/workspaceState.js';
import { defaultAvatarUrl } from '../src/config.js';

const desktopMedia = query => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} });
window.matchMedia = desktopMedia;
afterEach(() => { cleanup(); window.localStorage.clear(); window.matchMedia = desktopMedia; });
const identity = { user: { id: 'server-user-42', name: '服务器昵称', email: 'account@example.test' } };
function clientFixture(initial = null) {
  let session = initial, logoutError = null;
  return {
    getSession: async () => ({ data: session }),
    signIn: { email: async ({ email, password }) => {
      assert.equal(email, identity.user.email); assert.equal(password, 'fixture-password');
      session = identity; return { data: { user: identity.user } };
    } },
    signOut: async () => { if (logoutError) return { error: logoutError }; session = null; return { data: { success: true } }; },
    failSignOut: error => { logoutError = error; },
  };
}
function Harness({ client }) {
  const [state, dispatch] = useReducer(workspaceReducer, undefined, () => newWorkspace('task'));
  return React.createElement(AppLocaleProvider, null, React.createElement(WorkspaceAccount, { client, enabled: true, productionPreview: true, apiBase: 'https://account.example.test' }, account => React.createElement(TaskWorkspace, { state, dispatch, onFiles() {}, onSubmit() {}, ...account })));
}
test('existing login form refreshes authoritative identity, settings open in place, logout restores default avatar and draft', async () => {
  const client = clientFixture(); const user = userEvent.setup(); const { container } = render(React.createElement(Harness, { client }));
  const trigger = await screen.findByRole('button', { name: '登录图研', exact: true });
  await user.type(screen.getByLabelText('绘图要求'), '保留这份任务草稿');
  await user.click(trigger); await user.click(screen.getByRole('menuitem', { name: '登录 / 注册' }));
  const login = screen.getByRole('dialog', { name: '登录图研' });
  await waitFor(() => assert.equal(document.activeElement === screen.getByRole('button', { name: '关闭登录' }), true));
  await user.type(within(login).getByLabelText('邮箱'), identity.user.email);
  await user.type(within(login).getByLabelText('密码'), 'fixture-password');
  await user.click(within(login).getByRole('button', { name: '登录', exact: true }));
  const account = await screen.findByRole('button', { name: '账户与设置' });
  assert.equal(account.querySelector('strong').textContent, identity.user.name);
  assert.ok(screen.getByRole('heading', { name: `HI！${identity.user.name}，今天想绘制什么？` }));
  assert.equal(account.querySelector('img').getAttribute('src'), defaultAvatarUrl);
  assert.equal(screen.queryByRole('dialog'), null);
  await user.click(account); assert.ok(screen.getByText(identity.user.email));
  await user.click(screen.getByRole('menuitem', { name: '账户设置' }));
  assert.ok(screen.getByRole('dialog', { name: '账号与隐私' }));
  assert.ok(screen.getByText(identity.user.email));
  await user.click(screen.getByRole('button', { name: '关闭账号设置' }));
  await user.click(account); await user.click(screen.getByRole('menuitem', { name: '退出登录' }));
  const signedOut = await screen.findByRole('button', { name: '登录图研', exact: true });
  assert.ok(screen.getByRole('heading', { name: 'HI！今天想绘制什么？' }));
  assert.equal(signedOut.querySelector('img').getAttribute('src'), defaultAvatarUrl);
  assert.equal(screen.queryByText(identity.user.name), null);
  assert.equal(screen.queryByText(identity.user.email), null);
  assert.equal(screen.getByLabelText('绘图要求').value, '保留这份任务草稿');
  assert.equal(container.querySelectorAll('[role=dialog]').length, 0);
  assert.equal(JSON.stringify(window.localStorage).includes(identity.user.id), false);
});
test('settings requested while signed out resumes after login without navigating away', async () => {
  const user = userEvent.setup(); render(React.createElement(Harness, { client: clientFixture() }));
  await user.click(await screen.findByRole('button', { name: '登录图研', exact: true }));
  await user.click(screen.getByRole('menuitem', { name: '账户设置' }));
  await waitFor(() => assert.equal(document.activeElement === screen.getByRole('button', { name: '关闭登录' }), true));
  await user.type(screen.getByLabelText('邮箱'), identity.user.email);
  await user.type(screen.getByLabelText('密码'), 'fixture-password');
  await user.click(screen.getByRole('button', { name: '登录', exact: true }));
  assert.ok(await screen.findByRole('dialog', { name: '账号与隐私' }));
});
test('logout failure preserves account; confirmed retry signs out', async () => {
  const client = clientFixture(identity); client.failSignOut({ code: 'NETWORK_ERROR' });
  const user = userEvent.setup(); render(React.createElement(Harness, { client }));
  await user.click(await screen.findByRole('button', { name: '账户与设置' }));
  await user.click(screen.getByRole('menuitem', { name: '退出登录' }));
  assert.ok(await screen.findByText('退出登录失败，当前账号状态已保留，请重试。'));
  assert.ok(screen.getByRole('button', { name: '账户与设置' }));
  client.failSignOut(null);
  await user.click(screen.getByRole('button', { name: '账户与设置' }));
  await user.click(screen.getByRole('menuitem', { name: '退出登录' }));
  assert.ok(await screen.findByRole('button', { name: '登录图研', exact: true }));
});
test('bridge uncertain remote logout still clears local identity and explains uncertainty', async () => {
  const client = clientFixture(identity); client.failSignOut({ code: 'REMOTE_SIGNOUT_UNCERTAIN' });
  const user = userEvent.setup(); render(React.createElement(Harness, { client }));
  await user.click(await screen.findByRole('button', { name: '账户与设置' }));
  await user.click(screen.getByRole('menuitem', { name: '退出登录' }));
  assert.ok(await screen.findByRole('button', { name: '登录图研', exact: true }));
  assert.ok(screen.getByText('本地已退出，服务器退出状态暂时无法确认。'));
});
test('a late session request cannot restore an account after clear', async () => {
  let resolve;
  const client = { getSession: () => new Promise(r => { resolve = r; }) };
  const { result } = renderHook(() => useAuthSession({ client, enabled: true }));
  assert.equal(result.current.isPending, true);
  act(() => result.current.clear());
  await act(async () => { resolve({ data: identity }); });
  assert.equal(result.current.session, null); assert.equal(result.current.isPending, false);
});
test('mobile account login replaces navigation dialog and Escape returns to the workspace', async () => {
  window.matchMedia = query => ({ ...desktopMedia(query), matches: true });
  const user = userEvent.setup(); render(React.createElement(Harness, { client: clientFixture() }));
  await user.click(screen.getByRole('button', { name: '打开侧边栏' }));
  await waitFor(() => assert.equal(document.activeElement === screen.getByRole('button', { name: '关闭任务导航' }), true));
  await user.click(await screen.findByRole('button', { name: '登录图研', exact: true }));
  await user.click(screen.getByRole('menuitem', { name: '登录 / 注册' }));
  assert.equal(screen.queryByRole('dialog', { name: '任务导航' }), null);
  assert.equal(screen.getAllByRole('dialog').length, 1);
  await waitFor(() => assert.equal(document.activeElement === screen.getByRole('button', { name: '关闭登录' }), true));
  await user.keyboard('{Escape}');
  assert.equal(screen.queryByRole('dialog'), null);
  assert.ok(screen.getByRole('button', { name: '打开侧边栏' }));
});
test('network session failure ends loading and refresh can recover', async () => {
  let offline = true;
  const client = { getSession: async () => { if (offline) throw new Error('offline'); return { data: identity }; } };
  const { result } = renderHook(() => useAuthSession({ client, enabled: true }));
  await waitFor(() => assert.equal(result.current.isPending, false));
  assert.equal(result.current.error.message, 'offline');
  offline = false;
  await act(async () => { await result.current.refresh(); });
  assert.equal(result.current.session.user.id, identity.user.id); assert.equal(result.current.error, null);
});

test('service outage explains retained drafts, prevents duplicate retry and restores the existing account', async () => {
  let calls = 0, resume;
  const client = { getSession: async () => ++calls === 1
    ? { error: { status: 503, code: 'PRODUCTION_AUTH_UNAVAILABLE' } }
    : new Promise(resolve => { resume = resolve; }) };
  const user = userEvent.setup(); render(React.createElement(Harness, { client }));
  assert.ok(await screen.findByText('账号服务暂时不可用，尚未确认登录状态。任务与草稿已保留，请稍后重新检查。'));
  await user.type(screen.getByLabelText('绘图要求'), '保留草稿');
  await user.click(screen.getByRole('button', { name: '重新检查' }));
  const retry = screen.getByRole('button', { name: '正在检查…' });
  assert.equal(retry.disabled, true); await user.click(retry); assert.equal(calls, 2);
  await act(async () => resume({ data: identity }));
  assert.ok(await screen.findByRole('button', { name: '账户与设置' }));
  assert.equal(screen.queryByRole('alert'), null);
  assert.equal(screen.getByLabelText('绘图要求').value, '保留草稿');
});
