import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import React, { useReducer } from 'react';
import { cleanup, render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TaskWorkspace from '../src/workspace/TaskWorkspace.jsx';
import { AppLocaleProvider } from '../src/components/BenchmarkLocale.jsx';
import { APP_LANGUAGE_KEY } from '../src/components/benchmarkLocale.js';
import { newWorkspace, workspaceReducer } from '../src/workspace/workspaceState.js';

const desktopMedia = query => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} });
window.matchMedia = desktopMedia;
afterEach(() => { cleanup(); window.localStorage.clear(); window.matchMedia = desktopMedia; });
function Harness(props) {
  const [state, dispatch] = useReducer(workspaceReducer, undefined, () => newWorkspace('a'));
  return React.createElement(AppLocaleProvider, null, React.createElement(TaskWorkspace, { state, dispatch, onFiles() {}, onSubmit() {}, ...props }));
}

test('signed-out preview shows settings destination and persists language choice', async () => {
  const user = userEvent.setup(); render(React.createElement(Harness));
  await user.click(screen.getByRole('button', { name: '登录图研', exact: true }));
  const menu = screen.getByRole('menu', { name: '账户菜单' });
  assert.equal(screen.queryByRole('dialog'), null);
  assert.ok(screen.getByText('未登录'));
  assert.equal(within(menu).getByRole('menuitem', { name: '登录 / 注册' }).disabled, true);
  assert.ok(screen.getByText('本地预览未连接账号服务，登录暂不可用。'));
  assert.equal(within(menu).getByRole('menuitem', { name: '账户设置' }).getAttribute('href'), '/?view=account');
  await user.click(within(menu).getByRole('menuitem', { name: /语言\s*简体中文/ }));
  assert.equal(within(menu).getByRole('menuitemradio', { name: '简体中文' }).getAttribute('aria-checked'), 'true');
  await user.click(within(menu).getByRole('menuitemradio', { name: 'English' }));
  assert.equal(window.localStorage.getItem(APP_LANGUAGE_KEY), 'en');
  assert.equal(screen.queryByRole('menuitemradio'), null);
  assert.equal(document.activeElement === within(menu).getByRole('menuitem', { name: /语言\s*English/ }), true);
  await user.click(within(menu).getByRole('menuitem', { name: /语言\s*English/ }));
  assert.equal(within(menu).getByRole('menuitemradio', { name: 'English' }).getAttribute('aria-checked'), 'true');
});

test('signed-in identity exposes settings and sign-out host callbacks', async () => {
  let settings = 0, signOut = 0;
  const user = userEvent.setup();
  render(React.createElement(Harness, { user: { name: '测试用户', email: 'fixture@example.test' }, onAccountSettings: () => settings++, onSignOut: () => signOut++ }));
  const trigger = screen.getByRole('button', { name: '账户与设置' });
  await user.click(trigger);
  assert.ok(screen.getByText('fixture@example.test'));
  assert.equal(screen.queryByRole('menuitem', { name: '登录 / 注册' }), null);
  await user.click(screen.getByRole('menuitem', { name: '账户设置' }));
  assert.equal(settings, 1); assert.equal(screen.queryByRole('menu'), null);
  await user.click(trigger);
  await user.click(screen.getByRole('menuitem', { name: '退出登录' }));
  assert.equal(signOut, 1); assert.equal(screen.queryByRole('menu'), null);
  assert.equal(document.activeElement === trigger, true);
});

test('signed-out account delegates login without assuming authentication success', async () => {
  let logins = 0; const user = userEvent.setup();
  render(React.createElement(Harness, { onSignIn: () => logins++ }));
  await user.click(screen.getByRole('button', { name: '登录图研', exact: true }));
  await user.click(screen.getByRole('menuitem', { name: '登录 / 注册' }));
  assert.equal(logins, 1); assert.equal(screen.queryByRole('menu'), null);
  assert.ok(screen.getByRole('button', { name: '登录图研', exact: true }));
});

test('both sidebar widths support account menu keyboard, outside and Tab dismissal', async () => {
  const user = userEvent.setup(); const { container } = render(React.createElement(Harness));
  for (const compact of [false, true]) {
    if (compact) await user.click(screen.getByRole('button', { name: '收起侧边栏' }));
    const trigger = screen.getByRole('button', { name: '登录图研', exact: true });
    await user.click(trigger);
    assert.equal(trigger.getAttribute('aria-haspopup'), 'menu');
    assert.equal(trigger.getAttribute('aria-expanded'), 'true');
    assert.equal(document.activeElement === screen.getByRole('menuitem', { name: '账户设置' }), true);
    await user.keyboard('{ArrowDown}');
    assert.equal(document.activeElement === screen.getByRole('menuitem', { name: /语言\s*简体中文/ }), true);
    await user.keyboard('{Escape}');
    assert.equal(screen.queryByRole('menu'), null); assert.equal(document.activeElement === trigger, true);
    await user.click(trigger); fireEvent.pointerDown(container.querySelector('main'));
    assert.equal(screen.queryByRole('menu'), null);
    await user.click(trigger); await user.keyboard('{Tab}');
    assert.equal(screen.queryByRole('menu'), null);
    assert.equal(document.activeElement === screen.getByRole('button', { name: '图像创作' }), true);
  }
});

test('mobile account menu belongs to navigation accessibility tree; Escape retains navigation', async () => {
  window.matchMedia = query => ({ ...desktopMedia(query), matches: true });
  const user = userEvent.setup(); render(React.createElement(Harness));
  await user.click(screen.getByRole('button', { name: '打开侧边栏' }));
  const navigation = screen.getByRole('dialog', { name: '任务导航' });
  await waitFor(() => assert.equal(document.activeElement === screen.getByRole('button', { name: '关闭任务导航' }), true));
  const trigger = within(navigation).getByRole('button', { name: '登录图研', exact: true });
  await user.click(trigger);
  assert.ok(within(navigation).getByRole('menu', { name: '账户菜单' }));
  await user.keyboard('{Escape}');
  assert.equal(screen.queryByRole('menu'), null); assert.ok(screen.getByRole('dialog', { name: '任务导航' }));
  assert.equal(document.activeElement === trigger, true);
  await user.click(trigger); await user.keyboard('{Tab}');
  assert.equal(screen.queryByRole('menu'), null);
  assert.equal(document.activeElement === screen.getByRole('button', { name: '关闭任务导航' }), true);
  await user.keyboard('{Escape}');
  assert.equal(screen.queryByRole('dialog'), null);
});
