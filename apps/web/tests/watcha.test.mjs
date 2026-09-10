import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { watchaRequest, watchaAuthorizeUrl, isWatchaCallback } from '../src/lib/watcha.js';
import { useWatcha } from '../src/hooks/useWatcha.js';
import WatchaIdentityPanel from '../src/components/WatchaIdentityPanel.jsx';
import AccountSettingsDialog from '../src/components/AccountSettingsDialog.jsx';
import AuthPanel from '../src/components/AuthPanel.jsx';

test('status failures keep a visible retry and preserve the pending signup form', async () => {
  const originalFetch = globalThis.fetch;
  let failed = true;
  globalThis.fetch = async () => failed ? Response.json({ code: 'WATCHA_UNAVAILABLE' }, { status: 503 }) : Response.json({ available: true, linked: false, pending: { nickname: '观猹测试' } });
  function Fixture() { const c = useWatcha('', null, true, () => {}); return React.createElement(WatchaIdentityPanel, { controller: c }); }
  try {
    render(React.createElement(Fixture));
    await waitFor(() => assert.ok(screen.getByRole('alert')));
    assert.ok(screen.getByRole('button', { name: '刷新登录状态' }));
    assert.equal(screen.queryByRole('button', { name: '使用观猹登录' }), null);
    failed = false;
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '刷新登录状态' })));
    fireEvent.change(screen.getByLabelText('接收验证的邮箱'), { target: { value: 'keep@example.test' } });
    fireEvent.change(screen.getByLabelText('邮箱验证码'), { target: { value: '123456' } });
    failed = true;
    await act(async () => window.dispatchEvent(new window.Event('focus')));
    assert.ok(screen.getByRole('alert'));
    assert.equal(screen.getByLabelText('接收验证的邮箱').value, 'keep@example.test');
    assert.equal(screen.getByLabelText('邮箱验证码').value, '123456');
    failed = false;
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '刷新登录状态' })));
    assert.equal(screen.queryByRole('alert'), null);
    assert.equal(screen.getByLabelText('接收验证的邮箱').value, 'keep@example.test');
  } finally { cleanup(); globalThis.fetch = originalFetch; }
});

test('focus recovers a completed pending authorization when the provider severs opener without closing the window', async () => {
  const original = { fetch: globalThis.fetch, open: window.open };
  try {
    for (const user of [null, { id: 'existing-user', email: 'existing@example.test' }]) {
      let pending = null, authenticated = 0;
      const popup = { closed: false, close() { this.closed = true; }, location: { replace() {} } };
      window.open = () => popup;
      globalThis.fetch = async url => String(url).endsWith('/start')
        ? Response.json({ url: 'https://watcha.cn/oauth/authorize?state=fixture' })
        : Response.json({ available: true, linked: false, emailVerified: Boolean(user), pending });
      function Fixture() { const c = useWatcha('', user?.id, true, async () => { authenticated++; }); return React.createElement(WatchaIdentityPanel, { controller: c, user }); }
      render(React.createElement(Fixture));
      await waitFor(() => assert.ok(screen.getByRole('button', { name: user ? '绑定观猹账号' : '使用观猹登录' })));
      await act(async () => fireEvent.click(screen.getByRole('button', { name: user ? '绑定观猹账号' : '使用观猹登录' })));
      assert.equal(popup.closed, false);
      pending = { nickname: '观猹测试' };
      await act(async () => window.dispatchEvent(new window.Event('focus')));
      assert.equal(popup.closed, true);
      assert.equal(authenticated, 0);
      if (user) assert.equal(screen.getByRole('button', { name: '确认绑定当前图研账号' }).disabled, false);
      else {
        fireEvent.change(screen.getByLabelText('接收验证的邮箱'), { target: { value: 'signup@example.test' } });
        assert.equal(screen.getByRole('button', { name: '发送验证码' }).disabled, false);
      }
      cleanup();
    }
  } finally { cleanup(); globalThis.fetch = original.fetch; window.open = original.open; }
});

test('disabled login is hidden and unverified existing users can verify before binding', () => {
  try {
    const { rerender } = render(React.createElement(WatchaIdentityPanel, { controller: { status: { available: false } } }));
    assert.equal(screen.queryByRole('region', { name: '观猹身份登录' }), null);
    rerender(React.createElement(WatchaIdentityPanel, { user: { id: 'u1', email: 'old@example.test' }, controller: { status: { available: true, linked: false, emailVerified: false } } }));
    assert.ok(screen.getByRole('button', { name: '发送图研邮箱验证邮件' }));
    assert.equal(screen.queryByRole('button', { name: '绑定观猹账号' }), null);
  } finally { cleanup(); }
});

test('passwordless deletion verifies a purpose-specific code and submits only its one-use confirmation', async () => {
  const originalFetch = globalThis.fetch, calls = [];
  globalThis.fetch = async (url, options) => {
    if (String(url).endsWith('/status')) return Response.json({ code: 0, state: 'active' });
    calls.push(['delete', JSON.parse(options.body)]);
    return Response.json({ code: 0, ok: true });
  };
  const watcha = { status: { available: true, linked: true, hasPassword: false }, busy: false,
    requestCode: async (...args) => { calls.push(['code', ...args]); return true; },
    deletionConfirmation: async (...args) => { calls.push(['confirm', ...args]); return { confirmationToken: 'one-use-test-proof' }; } };
  try {
    render(React.createElement(AccountSettingsDialog, { apiBase: '', email: 'person@example.test', watcha, onClose() {}, onDeleted: async () => calls.push(['deleted']) }));
    await waitFor(() => assert.equal(screen.getByRole('button', { name: '发送注销验证码' }).disabled, false));
    assert.equal(screen.queryByLabelText('当前登录密码'), null);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '发送注销验证码' })));
    fireEvent.change(screen.getByLabelText('注销邮箱验证码'), { target: { value: '123456' } });
    assert.equal(screen.getByRole('button', { name: '永久删除账号' }).disabled, true);
    fireEvent.change(screen.getByLabelText('输入“删除账号”确认'), { target: { value: '删除账号' } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '永久删除账号' })));
    assert.deepEqual(calls, [['code', 'delete'], ['confirm', '123456'], ['delete', { email: 'person@example.test', confirmationToken: 'one-use-test-proof' }], ['deleted']]);
  } finally { cleanup(); globalThis.fetch = originalFetch; }
});

test('choosing an existing account returns to email sign-in and never implicitly links', async () => {
  const calls = [];
  const watcha = { status: { available: true, pending: { nickname: '观猹用户' } }, busy: false, link: () => calls.push('link') };
  try {
    render(React.createElement(AuthPanel, { watcha, client: { signIn: { email: async data => { calls.push(data); return { data: {} }; } } }, onAuthenticated: async () => calls.push('authenticated') }));
    assert.equal(screen.queryByLabelText('密码'), null);
    fireEvent.click(screen.getByRole('button', { name: '登录已有图研账号并绑定' }));
    fireEvent.change(screen.getByLabelText('邮箱'), { target: { value: 'existing@example.test' } });
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'test-password' } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '登录' })));
    assert.deepEqual(calls, [{ email: 'existing@example.test', password: 'test-password' }, 'authenticated']);
  } finally { cleanup(); }
});

test('popup notifications cannot authenticate until the server confirms the linked session', async () => {
  const original = { fetch: globalThis.fetch, open: window.open };
  let linked = false, authenticated = 0;
  const popup = { closed: false, close() { this.closed = true; }, location: { replace() {} } };
  window.open = () => popup;
  globalThis.fetch = async url => String(url).endsWith('/start')
    ? Response.json({ url: 'https://watcha.cn/oauth/authorize?state=fixture' })
    : Response.json({ available: true, linked, pending: null });
  function Fixture() { const c = useWatcha('', null, true, async () => { authenticated++; }); return React.createElement(WatchaIdentityPanel, { controller: c }); }
  try {
    render(React.createElement(Fixture));
    await waitFor(() => assert.ok(screen.getByRole('button', { name: '使用观猹登录' })));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '使用观猹登录' })));
    await act(async () => window.dispatchEvent(new window.MessageEvent('message', { origin: window.location.origin, source: {}, data: { type: 'tuyan-watcha-complete', status: 'complete' } })));
    assert.equal(authenticated, 0);
    await act(async () => window.dispatchEvent(new window.MessageEvent('message', { origin: window.location.origin, source: popup, data: { type: 'tuyan-watcha-complete', status: 'complete' } })));
    assert.equal(authenticated, 0);
    popup.closed = false;
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '使用观猹登录' })));
    linked = true;
    await act(async () => window.dispatchEvent(new window.MessageEvent('message', { origin: window.location.origin, source: popup, data: { type: 'tuyan-watcha-complete', status: 'complete' } })));
    assert.equal(authenticated, 1);
  } finally { cleanup(); globalThis.fetch = original.fetch; window.open = original.open; }
});

test('identity requests use authenticated Gateway endpoints and never expose server errors', async () => {
  let request;
  await watchaRequest('https://api.paperbanana.asia/', 'complete', { email: 'new@example.test', code: '123456' }, async (...args) => { request = args; return Response.json({ ok: true }); });
  assert.equal(request[0], 'https://api.paperbanana.asia/api/auth/watcha/complete');
  assert.equal(request[1].credentials, 'include');
  assert.deepEqual(JSON.parse(request[1].body), { email: 'new@example.test', code: '123456' });
  await assert.rejects(watchaRequest('', 'link', {}, async () => Response.json({ message: 'raw upstream secret', code: 'UNEXPECTED' }, { status: 500 })), (err) => !err.message.includes('raw upstream'));
  await assert.rejects(watchaRequest('', '../other', {}));
});

test('authorization and callback validation pin origin, path and the actual opened window', () => {
  assert.equal(watchaAuthorizeUrl('https://watcha.cn/oauth/authorize?state=fixture').origin, 'https://watcha.cn');
  for (const url of ['javascript:alert(1)', 'https://watcha.cn.evil.test/oauth/authorize', 'https://watcha.cn/other', 'https://user:secret@watcha.cn/oauth/authorize']) assert.throws(() => watchaAuthorizeUrl(url));
  const popup = {};
  const event = { origin: window.location.origin, source: popup, data: { type: 'tuyan-watcha-complete', status: 'pending' } };
  assert.equal(isWatchaCallback(event, popup, window.location.origin), true);
  assert.equal(isWatchaCallback({ ...event, source: {} }, popup, window.location.origin), false);
  assert.equal(isWatchaCallback({ ...event, origin: 'https://evil.test' }, popup, window.location.origin), false);
});

test('pending identity signup and existing-account choice require explicit actions', async () => {
  const calls = [];
  const controller = { status: { available: true, pending: { nickname: '观猹用户' }, linked: false }, busy: false, error: '', notice: '', requestCode: async (...args) => { calls.push(['code', ...args]); return true; }, complete: async (...args) => calls.push(['complete', ...args]) };
  try {
    render(React.createElement(WatchaIdentityPanel, { controller, onSignIn: () => calls.push(['signin']) }));
    assert.ok(screen.getByText('观猹授权已完成'));
    fireEvent.change(screen.getByLabelText('接收验证的邮箱'), { target: { value: 'new@example.test' } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '发送验证码' })));
    assert.deepEqual(calls[0], ['code', 'signup', 'new@example.test']);
    fireEvent.change(screen.getByLabelText('邮箱验证码'), { target: { value: '123456' } });
    await act(async () => fireEvent.submit(screen.getByRole('form', { name: '验证邮箱并创建图研账号' })));
    assert.deepEqual(calls[1], ['complete', 'new@example.test', '123456']);
    fireEvent.click(screen.getByRole('button', { name: '登录已有图研账号并绑定' }));
    assert.deepEqual(calls[2], ['signin']);
  } finally { cleanup(); }
});

test('linked passwordless accounts cannot unlink their only sign-in method', () => {
  try {
    render(React.createElement(WatchaIdentityPanel, { user: { id: 'u1' }, controller: { status: { available: true, linked: true, hasPassword: false }, busy: false } }));
    assert.ok(screen.getByText('已绑定观猹'));
    assert.equal(screen.queryByRole('button', { name: '确认解绑' }), null);
    assert.ok(screen.getByText(/设置密码后才能解绑/));
  } finally { cleanup(); }
});

test('popup blocking causes no server transaction or navigation and preserves local workspace input', async () => {
  const original = { fetch: globalThis.fetch, open: window.open };
  const actions = [];
  globalThis.fetch = async (url) => { actions.push(String(url)); return Response.json({ available: true, linked: false, pending: null }); };
  window.open = () => null;
  function Fixture() {
    const c = useWatcha('', null, true, async () => {});
    return React.createElement('div', null, React.createElement('textarea', { 'aria-label': '工作台内容', defaultValue: '保留我的科研内容' }), React.createElement(WatchaIdentityPanel, { controller: c }));
  }
  try {
    render(React.createElement(Fixture));
    await waitFor(() => assert.ok(screen.getByRole('button', { name: '使用观猹登录' })));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '使用观猹登录' })));
    assert.ok(screen.getByRole('alert').textContent.includes('弹窗'));
    assert.equal(actions.some(url => url.endsWith('/start')), false);
    assert.equal(screen.getByLabelText('工作台内容').value, '保留我的科研内容');
  } finally { cleanup(); globalThis.fetch = original.fetch; window.open = original.open; }
});
