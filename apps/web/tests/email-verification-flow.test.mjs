import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { render, screen, waitFor, cleanup, fireEvent, act } from '@testing-library/react';
import AuthPanel from '../src/components/AuthPanel.jsx';
import { verificationState } from '../public/account/email-verified.js';

function clientFixture(data = { verificationStatusToken: 'observer-fixture' }) {
  return {
    signUp: { email: async () => ({ data }) },
    signIn: { email: async () => ({ data: {} }) },
    sendVerificationEmail: async () => assert.fail('status checks must never resend email'),
  };
}
async function signup(client, onAuthenticated = () => assert.fail('verification must not sign in')) {
  render(React.createElement(AuthPanel, { client, onAuthenticated }));
  fireEvent.click(screen.getByRole('button', { name: '没有账号，去注册' }));
  fireEvent.change(screen.getByLabelText('邮箱'), { target: { value: 'fixture@163.test' } });
  fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'fixture-password' } });
  fireEvent.click(screen.getByRole('button', { name: '注册并验证邮箱' }));
  await waitFor(() => assert.ok(screen.getByRole('heading', { name: '等待验证' })));
}

test('registration updates after verification in another browser without refreshing or resending', async () => {
  const original = globalThis.fetch;
  let verified = false;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    if (url.endsWith('/identity/capabilities')) return Response.json({ providers: { github: false, google: false } });
    calls.push({ url, init });
    return Response.json({ status: verified ? 'verified' : 'pending' });
  };
  try {
    await signup(clientFixture());
    await waitFor(() => assert.equal(calls.length, 1));
    assert.match(calls[0].url, /\/api\/auth\/verification-status$/);
    assert.deepEqual(JSON.parse(calls[0].init.body), { token: 'observer-fixture' });
    assert.equal(calls[0].init.credentials, 'omit');
    assert.doesNotMatch(calls[0].init.body, /password|163/);
    verified = true;
    fireEvent(window, new Event('focus'));
    await waitFor(() => assert.ok(screen.getByRole('heading', { name: '邮箱验证成功' })));
    assert.equal(screen.queryByRole('button', { name: '重发验证邮件' }), null);
    const count = calls.length;
    fireEvent(window, new Event('focus'));
    assert.equal(calls.length, count, 'stop checking after completion');
    fireEvent.click(screen.getByRole('button', { name: '立即登录' }));
    assert.equal(screen.getByLabelText('邮箱').value, 'fixture@163.test');
    assert.equal(screen.getByLabelText('密码').value, '', 'password is cleared on entering verification wait');
    assert.equal(window.localStorage.length, 0);
    assert.equal(window.sessionStorage.length, 0);
  } finally { cleanup(); globalThis.fetch = original; }
});

test('status outage does not claim failure or success; focus retries and the login escape remains available', async () => {
  const original = globalThis.fetch;
  let outage = true;
  globalThis.fetch = async () => outage ? Response.json({}, { status: 503 }) : Response.json({ status: 'verified' });
  try {
    await signup(clientFixture());
    await waitFor(() => assert.match(screen.getByRole('status').textContent, /暂时无法检查/));
    assert.ok(screen.getByRole('button', { name: '已完成验证？直接登录' }));
    assert.equal(screen.queryByRole('heading', { name: '邮箱验证成功' }), null);
    outage = false;
    fireEvent(window, new Event('focus'));
    await waitFor(() => assert.ok(screen.getByRole('heading', { name: '邮箱验证成功' })));
  } finally { cleanup(); globalThis.fetch = original; }
});

test('old gateway responses still offer direct login without polling an email address', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => assert.fail('no status capability was issued');
  try {
    await signup(clientFixture({}));
    assert.match(screen.getByRole('status').textContent, /只有登录时仍提示未验证/);
    fireEvent.click(screen.getByRole('button', { name: '已完成验证？直接登录' }));
    assert.equal(screen.getByLabelText('密码').value, '');
  } finally { cleanup(); globalThis.fetch = original; }
});

test('leaving the registration panel aborts in-flight status checks', async () => {
  const original = globalThis.fetch;
  let signal;
  globalThis.fetch = async (_url, init) => {
    signal = init.signal;
    return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted'))));
  };
  try {
    await signup(clientFixture());
    await waitFor(() => assert.ok(signal));
    await act(async () => cleanup());
    assert.equal(signal.aborted, true);
  } finally { cleanup(); globalThis.fetch = original; }
});

test('landing states distinguish repeat completion, expiry, invalid links and temporary failure', () => {
  assert.equal(verificationState(null), 'success');
  assert.equal(verificationState('TOKEN_USED'), 'used');
  assert.equal(verificationState('TOKEN_EXPIRED'), 'expired');
  assert.equal(verificationState('VERIFICATION_UNAVAILABLE'), 'unavailable');
  assert.equal(verificationState('INVALID_TOKEN'), 'invalid');
  assert.equal(verificationState('unknown_used_text'), 'invalid');
});

test('ordinary login refreshes the app session instead of redirecting to email-verification success', async () => {
  let payload;
  let authenticated = 0;
  const client = clientFixture();
  client.signIn.email = async (input) => { payload = input; return { data: {} }; };
  try {
    render(React.createElement(AuthPanel, { client, onAuthenticated: () => { authenticated++; } }));
    fireEvent.change(screen.getByLabelText('邮箱'), { target: { value: 'fixture@example.test' } });
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'fixture-password' } });
    fireEvent.click(screen.getByRole('button', { name: '登录', exact: true }));
    await waitFor(() => assert.equal(authenticated, 1));
    assert.deepEqual(payload, { email: 'fixture@example.test', password: 'fixture-password' });
    assert.equal(screen.getByLabelText('密码').value, '');
  } finally { cleanup(); }
});
