import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import React from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import QRCode from 'qrcode';
import TokenDancePanel, { TokenDanceRecovery, formatTokenDanceMoney } from '../src/components/TokenDancePanel.jsx';
import { captureTokenDanceCallback, useTokenDance } from '../src/hooks/useTokenDance.js';
import TaskRecordsPanel from '../src/components/TaskRecordsPanel.jsx';

afterEach(cleanup);
const media = mobile => { window.matchMedia = () => ({ matches: mobile, addEventListener() {}, removeEventListener() {} }); };
const controller = overrides => ({ userId: 'fixture-owner', connection: { connected: true, available: true }, wallet: { balance: 1_234_567 }, payment: null, busy: false, authorize() {}, disconnect() {}, balance() {}, recoverPayment() {}, ...overrides });
const session = { amount: 10, status: 'pending', expired_at: Math.floor(Date.now() / 1000) + 600, payment_url: 'https://pay.example.com/fixture', alipay_url: 'alipays://platformapi/startapp?appId=fixture' };

test('callback code is captured once and removed before ordinary rendering without deleting unrelated parameters', () => {
  let replaced;
  const callback = captureTokenDanceCallback({ href: 'https://www.paperbanana.asia/?tokendance_callback=1&state=fixture&code=one-use&keep=1#view' }, { replaceState(_a, _b, url) { replaced = url; } });
  assert.deepEqual(callback, { state: 'fixture', code: 'one-use', cancelled: false });
  assert.equal(replaced, '/?keep=1#view');
  assert.equal(captureTokenDanceCallback({ href: 'https://www.paperbanana.asia/?keep=1' }, {}), null);
});

test('desktop renders only a locally generated QR and mobile exposes only the user-click Alipay link', async () => {
  const original = QRCode.toDataURL; let qrCalls = 0;
  QRCode.toDataURL = async value => { assert.equal(value, session.payment_url); qrCalls++; return 'data:image/png;base64,fixture'; };
  try {
    media(false);
    const desktop = render(React.createElement(TokenDancePanel, { controller: controller({ payment: { session } }) }));
    await screen.findByRole('img', { name: /充值二维码/ });
    assert.equal(screen.queryByRole('link', { name: /支付宝支付/ }), null);
    assert.equal(document.querySelector(`a[href="${session.payment_url}"]`), null);
    desktop.unmount(); media(true);
    render(React.createElement(TokenDancePanel, { controller: controller({ payment: { session } }) }));
    assert.equal(screen.queryByRole('img', { name: /充值二维码/ }), null);
    assert.equal(screen.getByRole('link', { name: '支付宝支付 ¥10' }).getAttribute('href'), session.alipay_url);
    assert.equal(qrCalls, 1);
  } finally { QRCode.toDataURL = original; }
});

test('wallet uses microyuan while payment submits integer yuan and rejects fractional amounts', () => {
  media(true); const amounts = [];
  render(React.createElement(TokenDancePanel, { controller: controller({ createPayment(amount) { amounts.push(amount); } }) }));
  assert.equal(formatTokenDanceMoney(1_234_567), '1.234567');
  assert.ok(screen.getByText(/Key 额度需在观猹 TokenDance/));
  const input = screen.getByRole('spinbutton', { name: '观猹 TokenDance 充值金额' });
  fireEvent.change(input, { target: { value: '1.5' } });
  assert.equal(screen.getByRole('button', { name: '创建 ¥1.5 充值单' }).disabled, true);
  fireEvent.change(input, { target: { value: '10' } });
  fireEvent.click(screen.getByRole('button', { name: '创建 ¥10 充值单' }));
  assert.deepEqual(amounts, [10]);
});

test('a late wallet response after an account switch cannot appear in the new account', async () => {
  const original = globalThis.fetch; let finish;
  globalThis.fetch = async (_url, init) => JSON.parse(init.body).action === 'tokenDanceBalance'
    ? new Promise(resolve => { finish = resolve; }) : Response.json({ connected: true, available: true });
  try {
    const hook = renderHook(({ user }) => useTokenDance('https://gateway.example.com', user, true), { initialProps: { user: 'account-a' } });
    await waitFor(() => assert.equal(hook.result.current.connection.connected, true));
    let pending;
    act(() => { pending = hook.result.current.balance(); });
    hook.rerender({ user: 'account-b' });
    await act(async () => { finish(Response.json({ wallet: { balance: 99_000_000 } })); await pending; });
    assert.equal(hook.result.current.wallet, null);
    assert.equal(hook.result.current.payment, null);
    assert.equal(hook.result.current.error, '');
    hook.unmount();
  } finally { globalThis.fetch = original; }
});

test('recovery reenables after Retry-After and resumes the original job ID', async () => {
  media(true); const resumed = [];
  const td = controller({ connection: { connected: false }, async perform(fn) { return fn(); }, async request(action, body) { assert.equal(action, 'tokenDanceResume'); assert.deepEqual(body, { jobId: 'original-job' }); return { jobId: 'original-job' }; } });
  render(React.createElement(TokenDanceRecovery, { job: { id: 'original-job', recovery: { canResume: true, message: 'rate limit', retryAt: new Date(Date.now() + 150).toISOString() } }, controller: td, onResumed: id => resumed.push(id) }));
  const button = screen.getByRole('button', { name: '从已完成步骤继续' });
  assert.equal(button.disabled, true);
  await waitFor(() => assert.equal(button.disabled, false));
  fireEvent.click(button);
  await waitFor(() => assert.deepEqual(resumed, ['original-job']));
});

test('a task loaded from account history exposes saved-step recovery and actual call records after a page reload', async () => {
  media(true);
  const resumed = [];
  const job = { id: 'persisted-job', status: 'failed', error: 'upstream error', recovery: { canResume: true, message: '钱包余额不足' }, providerCalls: [{ requestedModel: 'qwen3.8-flash', actualModel: 'qwen3.8-flash', requestId: 'fixture-request' }] };
  const td = controller({ connection: { connected: false }, async perform(fn) { return fn(); }, async request(action, body) {
    assert.equal(action, 'tokenDanceResume'); assert.deepEqual(body, { jobId: job.id }); return { jobId: job.id };
  } });
  const props = { currentUser: { id: 'fixture-owner' }, jobs: [job], renderRecovery: item => React.createElement(TokenDanceRecovery, { job: item, controller: td, onResumed: id => resumed.push(id) }) };
  const page = render(React.createElement(TaskRecordsPanel, props));
  assert.ok(screen.getByText(/fixture-request/));
  fireEvent.click(screen.getByRole('button', { name: '从已完成步骤继续' }));
  await waitFor(() => assert.deepEqual(resumed, ['persisted-job']));
  page.rerender(React.createElement(TaskRecordsPanel, { ...props, jobs: [{ ...job, status: 'running' }] }));
  assert.equal(screen.queryByRole('button', { name: '从已完成步骤继续' }), null);
  assert.ok(screen.getByRole('status'));
});

test('account history keeps each order and blocks another purchase while creation is uncertain', async () => {
  media(true);
  render(React.createElement(TokenDancePanel, { controller: controller({ historyLoaded: true, payments: [
    { attemptId: 'paid', amount: 20, state: 'paid', session: { ...session, amount: 20, status: 'paid' } },
    { attemptId: 'unknown', amount: 10, state: 'unknown' },
  ] }) }));
  assert.equal(document.querySelectorAll('.td-payment-history li').length, 2);
  assert.ok(screen.getByText('已确认到账'));
  assert.ok(screen.getByText('创建结果待核对'));
  assert.equal(screen.getByRole('button', { name: '创建 ¥10 充值单' }).disabled, true);
});

test('late history and stale account callbacks never populate or busy-lock the next user', async () => {
  const original = globalThis.fetch; let finish;
  globalThis.fetch = async (_url, init) => JSON.parse(init.body).action === 'tokenDancePayments'
    ? new Promise(resolve => { finish = resolve; }) : Response.json({ connected: true, available: true });
  try {
    const hook = renderHook(({ user }) => useTokenDance('https://gateway.example.test', user, true), { initialProps: { user: 'a' } });
    await waitFor(() => assert.ok(hook.result.current.connection.connected));
    const previous = hook.result.current; let pending;
    act(() => { pending = previous.recoverPayment(); });
    hook.rerender({ user: 'b' });
    await act(async () => { finish(Response.json({ payments: [{ attemptId: 'private-order-a', amount: 10 }] })); await pending; await previous.balance(); });
    assert.deepEqual(hook.result.current.payments, []);
    assert.equal(hook.result.current.busy, false);
    assert.equal(hook.result.current.error, '');
    hook.unmount();
  } finally { globalThis.fetch = original; }
});

test('account entry keeps a failed balance explanation instead of clearing it with a history refresh', async () => {
  const original = globalThis.fetch, calls = [];
  globalThis.fetch = async (_url, init) => {
    const action = JSON.parse(init.body).action; calls.push(action);
    if (action === 'tokenDanceStatus') return Response.json({ connected: true, available: true });
    if (action === 'tokenDanceBalance') return Response.json({ error: '授权已失效，请重新授权。' }, { status: 403 });
    throw new Error('unexpected request');
  };
  function Page() { return React.createElement(TokenDancePanel, { controller: useTokenDance('https://gateway.example.test', 'fixture-owner', true) }); }
  try {
    render(React.createElement(Page));
    await waitFor(() => assert.match(screen.getByRole('alert').textContent, /授权已失效/));
    assert.equal(calls.includes('tokenDancePayments'), false);
    assert.equal(screen.getByRole('button', { name: '重新授权' }).disabled, false);
  } finally { globalThis.fetch = original; }
});
