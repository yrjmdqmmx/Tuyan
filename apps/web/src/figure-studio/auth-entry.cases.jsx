import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { useState } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createExampleDocument } from '@paperbanana/figure-core';
import SitePageShell from '../components/SitePageShell.jsx';
import ExportDialog from './ExportDialog.jsx';
import { figureAuthAccess } from './authAccess.js';

const previousFetch = globalThis.fetch;
const previousAnchorClick = window.HTMLAnchorElement.prototype.click;
afterEach(() => { cleanup(); globalThis.fetch = previousFetch; window.HTMLAnchorElement.prototype.click = previousAnchorClick; });
const anonymous = { authEnabled: true, isPending: false };
const capabilities = { formats: { svg: true, pdf: true, eps: true } };
const currentUser = { id: 'fixture-user', email: 'fixture@example.com' };

test('auth access distinguishes disabled service, pending checks, failures and an anonymous visitor', () => {
  assert.equal(figureAuthAccess({ authEnabled: false, isPending: false }, currentUser).state, 'unavailable');
  assert.equal(figureAuthAccess({ authEnabled: true, isPending: true }, currentUser).state, 'pending');
  assert.equal(figureAuthAccess({ ...anonymous, error: new Error('session fixture error') }, currentUser).state, 'error');
  assert.equal(figureAuthAccess(anonymous, null).state, 'anonymous');
  assert.equal(figureAuthAccess({ isPending: false }, currentUser).state, 'authenticated');
  assert.equal(figureAuthAccess(undefined).state, 'pending');
});

for (const format of ['PDF', 'EPS']) test(`anonymous ${format} invokes the shared sign-in exactly once without an export request`, () => {
  let requests = 0, signIns = 0, closes = 0;
  globalThis.fetch = async () => { requests++; return Response.json({}); };
  render(<ExportDialog open document={createExampleDocument()} capabilities={null} auth={anonymous} currentUser={null}
    onSignIn={() => signIns++} onClose={() => closes++} saveSource={() => {}} />);
  const button = screen.getByRole('button', { name: format, exact: true });
  assert.equal(button.disabled, false);
  fireEvent.click(button);
  assert.equal(signIns, 1); assert.equal(closes, 1); assert.equal(requests, 0);
});

test('pending auth blocks server formats despite stale available capabilities while SVG and source remain local', async () => {
  let requests = 0, signIns = 0, sourceSaves = 0, downloads = 0;
  globalThis.fetch = async () => { requests++; return Response.json({}); };
  window.HTMLAnchorElement.prototype.click = () => { downloads++; };
  render(<ExportDialog open document={createExampleDocument()} capabilities={capabilities}
    auth={{ authEnabled: true, isPending: true }} currentUser={currentUser} onSignIn={() => signIns++} onClose={() => {}} saveSource={() => sourceSaves++} />);
  for (const name of ['PDF', 'EPS']) {
    const button = screen.getByRole('button', { name, exact: true });
    assert.equal(button.disabled, true); fireEvent.click(button);
  }
  fireEvent.click(screen.getByRole('button', { name: '源稿', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: 'SVG', exact: true }));
  await screen.findByRole('region', { name: '导出文件检查报告' });
  assert.equal(sourceSaves, 1); assert.equal(downloads, 1); assert.equal(requests, 0); assert.equal(signIns, 0);
});

test('signed-in converter unavailability retains its exact reason and does not reopen login', () => {
  let requests = 0, signIns = 0;
  globalThis.fetch = async () => { requests++; return Response.json({}); };
  render(<ExportDialog open document={createExampleDocument()} capabilities={{ formats: { pdf: false, eps: false }, formatReasons: { pdf: 'Inkscape 转换器不可用', eps: 'EPS 转换服务未安装' } }}
    auth={anonymous} currentUser={currentUser} onSignIn={() => signIns++} onClose={() => {}} saveSource={() => {}} />);
  for (const name of ['PDF', 'EPS']) {
    const button = screen.getByRole('button', { name, exact: true });
    assert.equal(button.disabled, true); fireEvent.click(button);
  }
  assert.ok(screen.getByText('Inkscape 转换器不可用'));
  assert.ok(screen.getByText('EPS 转换服务未安装'));
  assert.equal(requests, 0); assert.equal(signIns, 0);
});

test('a signed-in available export sends one authenticated request only after an explicit click', async () => {
  const requests = [];
  globalThis.fetch = async (_url, options) => { requests.push(options); return Response.json({ code: 503, error: '模拟转换失败' }, { status: 503 }); };
  render(<ExportDialog open document={createExampleDocument()} capabilities={capabilities} auth={anonymous} currentUser={currentUser}
    onSignIn={() => assert.fail('already signed in')} onClose={() => {}} saveSource={() => {}} />);
  assert.equal(requests.length, 0);
  fireEvent.click(screen.getByRole('button', { name: 'PDF', exact: true }));
  assert.match((await screen.findByRole('alert')).textContent, /模拟转换失败/);
  assert.equal(requests.length, 1);
  assert.equal(JSON.parse(requests[0].body).action, 'figureStudioExport');
  assert.equal(requests[0].credentials, 'include');
});

function EditorProbe({ page }) {
  const [materials, setMaterials] = useState('research fixture');
  const [open, setOpen] = useState(false);
  return <main><label>保留研究材料<textarea value={materials} onChange={(event) => setMaterials(event.target.value)} /></label>
    <button onClick={() => setOpen(true)}>打开导出</button><output aria-label="session readiness">{page.auth.isPending ? 'pending' : page.currentUser?.id || 'anonymous'}</output>
    <ExportDialog key={page.authGeneration} open={open} onClose={() => setOpen(false)} document={createExampleDocument()} capabilities={capabilities}
      auth={page.auth} currentUser={page.currentUser} onSignIn={page.onSignIn} saveSource={() => {}} />
  </main>;
}
const fixtureHeader = (header) => <nav><button onClick={header.onSignIn}>顶部登录</button></nav>;

test('header and anonymous export share one modal, cancel preserves materials and login never auto-exports', async () => {
  const actions = []; let signedIn = false;
  globalThis.fetch = async (_url, options = {}) => { actions.push(options.body ? JSON.parse(options.body).action : 'health'); return Response.json({ code: 0, isAdmin: false }); };
  const client = { getSession: async () => ({ data: signedIn ? { user: currentUser } : null, error: null }), signIn: { email: async () => { signedIn = true; return { data: { user: currentUser } }; } } };
  render(<SitePageShell authEnabled client={client} renderHeader={fixtureHeader} apiBase="https://fixture.example">{(page) => <EditorProbe page={page} />}</SitePageShell>);
  await waitFor(() => assert.equal(screen.getByLabelText('session readiness').textContent, 'anonymous'));
  fireEvent.change(screen.getByLabelText('保留研究材料'), { target: { value: 'author materials retained' } });
  fireEvent.click(screen.getByRole('button', { name: '打开导出' }));
  fireEvent.click(screen.getByRole('button', { name: 'PDF', exact: true }));
  assert.equal(screen.getAllByRole('dialog').length, 1);
  assert.ok(screen.getByRole('dialog', { name: '账号登录' }));
  assert.ok(screen.getByLabelText('邮箱'));
  fireEvent.click(screen.getByRole('button', { name: '暂不登录' }));
  assert.equal(screen.queryByRole('dialog'), null);
  assert.equal(screen.getByLabelText('保留研究材料').value, 'author materials retained');
  fireEvent.click(screen.getByRole('button', { name: '顶部登录' }));
  assert.equal(screen.getAllByRole('dialog').length, 1);
  fireEvent.change(screen.getByLabelText('邮箱'), { target: { value: currentUser.email } });
  fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'fixture-password' } });
  fireEvent.click(screen.getByRole('button', { name: '登录', exact: true }));
  await waitFor(() => assert.equal(screen.getByLabelText('session readiness').textContent, currentUser.id));
  assert.equal(screen.queryByRole('dialog'), null);
  assert.equal(screen.getByLabelText('保留研究材料').value, 'author materials retained');
  assert.ok(!actions.includes('figureStudioExport'));
});

test('unconfigured auth from a protected export uses the same unavailable modal as the header', () => {
  let sessionCalls = 0, requests = 0;
  globalThis.fetch = async () => { requests++; return Response.json({}); };
  render(<SitePageShell authEnabled={false} client={{ getSession: () => { sessionCalls++; } }} renderHeader={fixtureHeader}>
    {(page) => <EditorProbe page={page} />}
  </SitePageShell>);
  fireEvent.click(screen.getByRole('button', { name: '打开导出' }));
  assert.ok(screen.getAllByText('账号服务尚未配置，受保护功能暂不可用。').length);
  fireEvent.click(screen.getByRole('button', { name: 'EPS', exact: true }));
  assert.ok(screen.getByRole('dialog', { name: '账号登录' }));
  assert.ok(screen.getByRole('heading', { name: '账号服务尚未配置' }));
  assert.equal(screen.queryByLabelText('邮箱'), null);
  fireEvent.click(screen.getByRole('button', { name: '返回论文画布' }));
  fireEvent.click(screen.getByRole('button', { name: '顶部登录' }));
  assert.ok(screen.getByRole('heading', { name: '账号服务尚未配置' }));
  assert.equal(sessionCalls, 0); assert.equal(requests, 0);
});

test('session-check errors are distinct from anonymous login and retry uses the same controller', async () => {
  let checks = 0;
  const client = { getSession: async () => (++checks === 1 ? { data: null, error: { message: 'fixture session outage' } } : { data: null, error: null }) };
  render(<SitePageShell authEnabled client={client} renderHeader={fixtureHeader}>{(page) => <EditorProbe page={page} />}</SitePageShell>);
  await screen.findByText(/登录状态检查失败：fixture session outage/);
  fireEvent.click(screen.getByRole('button', { name: '打开导出' }));
  fireEvent.click(screen.getByRole('button', { name: 'PDF', exact: true }));
  assert.ok(screen.getByRole('heading', { name: '登录状态检查失败' }));
  assert.equal(screen.queryByLabelText('邮箱'), null);
  fireEvent.click(screen.getByRole('button', { name: '重新检查登录状态' }));
  await waitFor(() => assert.equal(checks, 2));
  await waitFor(() => assert.equal(screen.getByLabelText('session readiness').textContent, 'anonymous'));
  fireEvent.click(screen.getByRole('button', { name: '顶部登录' }));
  assert.ok(screen.getByLabelText('邮箱'));
});

test('a stale user object cannot turn disabled authentication into an export permission or hide its notice', async () => {
  const actions = [];
  globalThis.fetch = async (_url, options = {}) => { actions.push(options.body ? JSON.parse(options.body).action : 'health'); return Response.json({ code: 0, isAdmin: false }); };
  render(<SitePageShell authEnabled={false} initialSession={{ user: currentUser }} renderHeader={fixtureHeader}>
    {(page) => <EditorProbe page={page} />}
  </SitePageShell>);
  fireEvent.click(screen.getByRole('button', { name: '打开导出' }));
  fireEvent.click(screen.getByRole('button', { name: 'PDF', exact: true }));
  assert.ok(screen.getByRole('dialog', { name: '账号登录' }));
  assert.ok(screen.getByRole('heading', { name: '账号服务尚未配置' }));
  assert.ok(!actions.includes('figureStudioExport'));
  await act(async () => {});
});

test('unmount aborts an in-flight protected export without opening a login flow', async () => {
  let signal; let resolve;
  const response = new Promise((done) => { resolve = done; });
  globalThis.fetch = async (_url, options) => { signal = options.signal; return response; };
  const view = render(<ExportDialog open document={createExampleDocument()} capabilities={capabilities} auth={anonymous} currentUser={currentUser}
    onSignIn={() => assert.fail('must not login during export')} onClose={() => {}} saveSource={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'PDF', exact: true }));
  await waitFor(() => assert.ok(signal));
  view.unmount();
  assert.equal(signal.aborted, true);
  await act(async () => { resolve(Response.json({ code: 503, error: 'late error' }, { status: 503 })); await response; });
  assert.equal(screen.queryByRole('alert'), null);
});
