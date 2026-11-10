import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afterEach, test } from 'node:test';
import React from 'react';
import { createAuthClient } from 'better-auth/react';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppLocaleProvider } from '../src/components/BenchmarkLocale.jsx';
import WorkspaceAccount from '../src/workspace/WorkspaceAccount.jsx';
import WorkspaceLogin from '../src/workspace/WorkspaceLogin.jsx';

const nativeFetch = globalThis.fetch;
const nativeMatchMedia = window.matchMedia;
const identity = { user: { id: 'notice-user', email: 'notice@example.test' } };
const cases = [
  [401, '暂时无法检查登录状态，任务与草稿已保留。请确认连接后重试。'],
  [500, '账号服务暂时不可用，尚未确认登录状态。任务与草稿已保留，请稍后重新检查。'],
  [429, '账号检查过于频繁，请稍后重试。任务与草稿已保留。'],
];
afterEach(() => { cleanup(); globalThis.fetch = nativeFetch; window.matchMedia = nativeMatchMedia; });

function mount(client, requireLogin = true) {
  globalThis.fetch = async () => Response.json({ available: false });
  window.matchMedia = query => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} });
  return render(React.createElement(AppLocaleProvider, null,
    React.createElement(WorkspaceAccount, { client, enabled: true, requireLogin, apiBase: 'http://fixture.invalid' }, account =>
      React.createElement('div', null,
        React.createElement('span', null, account.user ? 'Signed in' : 'Guest'),
        React.createElement('button', { onClick: () => account.refreshAccount() }, 'Check account'),
        React.createElement('button', { onClick: account.onSignOut }, 'Sign out')))));
}

function httpClient(status) {
  return createAuthClient({ baseURL: 'http://fixture.invalid', fetchOptions: {
    customFetchImpl: async url => {
      assert.equal(new URL(url).pathname, '/api/auth/get-session');
      // Better Auth getSession returns a non-null error for every HTTP 401.
      // Main's ordinary anonymous session is HTTP 200 with a JSON null body.
      return Response.json(status === 200 ? null : { code: 'SESSION_CHECK_FAILED', message: 'Fixture check failure' }, { status });
    },
  } });
}

test('ordinary logged-out session shows the forced login form without any notice', async () => {
  mount(httpClient(200));
  await screen.findByRole('heading', { name: '登录账号' });
  assert.equal(document.querySelector('.tw-auth-message'), null);
  assert.equal(screen.queryByRole('alert'), null);
});

for (const [status, message] of cases) {
  test(`forced login HTTP ${status} keeps main's literal message inside the dialog before AuthPanel`, async () => {
    mount(httpClient(status));
    await screen.findByRole('heading', { name: '登录账号' });
    const dialog = screen.getByRole('dialog', { name: '登录图研' });
    const notice = within(dialog).getByRole('alert');
    assert.equal(notice.querySelector('span').textContent, message);
    assert.ok(notice.classList.contains('tw-auth-message-inline'));
    assert.equal(document.querySelectorAll('.tw-auth-message:not(.tw-auth-message-inline)').length, 0);
    assert.equal(document.querySelectorAll('.tw-auth-message').length, 1);
    assert.ok(notice.compareDocumentPosition(dialog.querySelector('.auth-panel')) & Node.DOCUMENT_POSITION_FOLLOWING);
    assert.equal(within(notice).getByRole('button', { name: '重新检查' }).disabled, false);
    for (const name of ['隐私政策', '服务条款']) assert.ok(within(dialog).getByRole('link', { name }));
    // Keep #250's explicit native label/control association.
    for (const name of ['邮箱', '密码']) {
      const input = within(dialog).getByLabelText(name);
      assert.ok(input.id);
      assert.equal(input.labels[0].htmlFor, input.id);
      assert.equal(input.labels[0].contains(input), false);
    }
  });
}

test('in-box recheck calls refresh once, shows the disabled pending label, and clears a recovered error', async () => {
  let calls = 0, resolve;
  const client = { getSession: async () => ++calls === 1
    ? { error: { status: 500 } }
    : new Promise(done => { resolve = done; }) };
  const user = userEvent.setup();
  mount(client);
  await user.click(await screen.findByRole('button', { name: '重新检查' }));
  const pending = within(screen.getByRole('dialog')).getByRole('button', { name: '正在检查…' });
  assert.equal(pending.disabled, true);
  assert.equal(calls, 2);
  assert.equal(screen.getByRole('alert').querySelector('span').textContent, cases[1][1]);
  await user.click(pending);
  assert.equal(calls, 2);
  await act(async () => resolve({ data: null }));
  await screen.findByRole('heading', { name: '登录账号' });
  assert.equal(screen.queryByRole('alert'), null);
});

test('in-box recheck clears the local sign-out error before refreshing', async () => {
  let calls = 0, resolve;
  const client = {
    getSession: async () => ++calls === 1 ? { data: identity } : new Promise(done => { resolve = done; }),
    signOut: async () => ({ error: { code: 'REMOTE_SIGNOUT_UNCERTAIN' } }),
  };
  const user = userEvent.setup();
  mount(client);
  await user.click(await screen.findByRole('button', { name: 'Sign out' }));
  const dialog = await screen.findByRole('dialog');
  assert.equal(within(dialog).getByRole('alert').querySelector('span').textContent, '本地已退出，服务器退出状态暂时无法确认。');
  await user.click(within(dialog).getByRole('button', { name: '重新检查' }));
  assert.equal(calls, 2);
  assert.equal(screen.queryByRole('alert'), null);
  assert.ok(within(dialog).getByRole('status'));
  await act(async () => resolve({ error: { status: 500 } }));
  assert.equal(within(dialog).getByRole('alert').querySelector('span').textContent, cases[1][1]);
});

test('non-forced logged-out notice keeps the original fixed-bar markup and recheck', async () => {
  let calls = 0;
  const user = userEvent.setup();
  mount({ getSession: async () => { calls++; return { error: { status: 401 } }; } }, false);
  const notice = await screen.findByRole('alert');
  assert.equal(notice.className, 'tw-auth-message');
  assert.equal(notice.closest('[role="dialog"]'), null);
  assert.equal(notice.querySelector('span').textContent, cases[0][1]);
  await user.click(within(notice).getByRole('button', { name: '重新检查' }));
  assert.equal(calls, 2);
});

for (const requireLogin of [true, false]) {
  test(`logged-in notice keeps the original fixed bar (requireLogin=${requireLogin})`, async () => {
    let calls = 0;
    const user = userEvent.setup();
    mount({ getSession: async () => ++calls === 1 ? { data: identity } : { error: { status: 429 } } }, requireLogin);
    await screen.findByText('Signed in');
    await user.click(screen.getByRole('button', { name: 'Check account' }));
    const notice = await screen.findByRole('alert');
    assert.equal(notice.className, 'tw-auth-message');
    assert.equal(notice.closest('[role="dialog"]'), null);
    assert.equal(notice.querySelector('span').textContent, cases[2][1]);
    assert.ok(within(notice).getByRole('button', { name: '重新检查' }));
    assert.ok(screen.getByText('Signed in'));
  });
}

test('in-box notice hides recheck while signing out', () => {
  window.matchMedia = query => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} });
  render(React.createElement(AppLocaleProvider, null,
    React.createElement(WorkspaceLogin, { pending: true, message: cases[0][1], signingOut: true })));
  const notice = within(screen.getByRole('dialog')).getByRole('alert');
  assert.equal(notice.querySelector('button'), null);
});

test('in-box notice CSS overrides fixed positioning and wraps text within the box', async () => {
  mount({ getSession: async () => ({ error: { status: 500 } }) });
  const notice = await screen.findByRole('alert');
  const style = document.createElement('style');
  style.textContent = readFileSync(new URL('../src/workspace/workspace.css', import.meta.url), 'utf8');
  document.head.append(style);
  try {
    const css = getComputedStyle(notice);
    assert.equal(css.position, 'static');
    assert.equal(css.maxWidth, '100%');
    assert.equal(css.boxSizing, 'border-box');
    assert.equal(css.flexWrap, 'wrap');
    assert.equal(getComputedStyle(notice.querySelector('span')).overflowWrap, 'anywhere');
    const inlineRules = [...style.sheet.cssRules].filter(rule => rule.selectorText?.includes('.tw-auth-message-inline'));
    assert.ok(inlineRules.length);
    assert.ok(inlineRules.every(rule => rule.style.position !== 'fixed'));
    notice.classList.remove('tw-auth-message-inline');
    assert.equal(getComputedStyle(notice).position, 'fixed');
  } finally { style.remove(); }
});
