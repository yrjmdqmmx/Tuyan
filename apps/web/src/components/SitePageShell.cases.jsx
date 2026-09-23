import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AppLocaleProvider } from './BenchmarkLocale.jsx';
import SitePageShell, { SiteSessionProvider, useSiteSession } from './SitePageShell.jsx';
import LeaderboardRoot, { LeaderboardSessionProvider, useLeaderboardSession } from './LeaderboardRoot.jsx';

afterEach(cleanup);
const session = (id) => ({ user: { id, email: `${id}@example.com` } });
function deferred() { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; }
const answer = (data = {}) => Response.json({ code: 0, ...data });
function compatibilityConsumer() {
  const shared = useSiteSession(); const legacy = useLeaderboardSession();
  assert.equal(shared, legacy);
  return <output aria-label="shared session">{shared.session?.user?.id || 'anonymous'}</output>;
}
const CompatibilityConsumer = compatibilityConsumer;

test('standalone shell and published leaderboard consumers share exactly one session controller', async () => {
  const previousFetch = globalThis.fetch; let calls = 0; let child;
  globalThis.fetch = async () => answer({ isAdmin: false });
  const client = { getSession: async () => { calls++; return { data: session('reader'), error: null }; } };
  try {
    render(<LeaderboardSessionProvider authEnabled client={client}>
      <SitePageShell section="figure-studio" apiBase="https://gateway.example">{(value) => { child = value; return <main className="figure-studio"><CompatibilityConsumer /></main>; }}</SitePageShell>
    </LeaderboardSessionProvider>);
    await screen.findByTitle('reader@example.com');
    assert.equal(calls, 1); assert.equal(screen.getByLabelText('shared session').textContent, 'reader');
    assert.equal(child.currentUser.id, 'reader'); assert.equal(child.authGeneration, child.auth.generation);
    assert.equal(typeof child.onSignIn, 'function'); assert.equal(typeof child.auth.isCurrentGeneration, 'function');
    assert.equal(document.querySelector('.paper-header').closest('.figure-studio'), null);
  } finally { globalThis.fetch = previousFetch; }
});

test('shared login, account settings and immediate signout work without mounting the workbench', async () => {
  const previousFetch = globalThis.fetch; let signedIn = false; let checks = 0; let signouts = 0;
  globalThis.fetch = async (input) => String(input).endsWith('/api/account/status') ? answer({ state: 'active' }) : answer({ isAdmin: false });
  const client = {
    getSession: async () => { checks++; return { data: signedIn ? session('author') : null, error: null }; },
    signIn: { email: async () => { signedIn = true; return { data: session('author'), error: null }; } },
    signOut: async () => { signouts++; signedIn = false; return { data: null, error: null }; },
  };
  try {
    render(<SitePageShell authEnabled client={client} apiBase="https://gateway.example"><main className="figure-studio">Editor only</main></SitePageShell>);
    await waitFor(() => assert.equal(checks, 1));
    fireEvent.click(screen.getByRole('button', { name: '登录 / 注册' }));
    fireEvent.change(screen.getByLabelText('邮箱'), { target: { value: 'author@example.com' } });
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'example-password' } });
    fireEvent.click(screen.getByRole('button', { name: '登录', exact: true }));
    await screen.findByTitle('author@example.com');
    assert.equal(checks, 2); assert.equal(screen.queryByLabelText('密码'), null);
    fireEvent.click(screen.getByRole('button', { name: 'author@example.com，账户' }));
    // This is the first lazy import of the account dialog in this test worker.
    const account = await screen.findByRole('dialog', { name: '账号与隐私' }, { timeout: 5_000 });
    assert.equal(account.closest('.figure-studio'), null);
    fireEvent.click(screen.getByRole('button', { name: '关闭账号设置' }));
    fireEvent.click(screen.getByRole('button', { name: '退出', exact: true }));
    await waitFor(() => assert.equal(signouts, 1));
    assert.equal(screen.queryByTitle('author@example.com'), null);
    assert.equal(screen.queryByRole('dialog'), null);
  } finally { cleanup(); globalThis.fetch = previousFetch; }
});

test('feedback form values and late success never leak to the next signed-in account', async () => {
  const previousFetch = globalThis.fetch; const feedbackResponse = deferred(); let feedbackCalls = 0; let auth;
  globalThis.fetch = async (_input, options) => {
    const body = JSON.parse(options.body);
    if (body.action === 'adminStatus') return answer({ isAdmin: false });
    if (body.action === 'submitFeedback') { feedbackCalls++; return feedbackResponse.promise; }
    throw new Error(`unexpected ${body.action}`);
  };
  const client = { getSession: async () => ({ data: session('second'), error: null }) };
  try {
    render(<SitePageShell authEnabled client={client} initialSession={session('first')} apiBase="https://gateway.example">{(value) => { auth = value.auth; return <main className="figure-studio" />; }}</SitePageShell>);
    fireEvent.click(screen.getByRole('button', { name: '意见反馈' }));
    fireEvent.change(screen.getByLabelText(/反馈内容/), { target: { value: 'First account private draft' } });
    fireEvent.change(screen.getByLabelText('联系方式'), { target: { value: 'first-private@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: '提交反馈' }));
    await waitFor(() => assert.equal(feedbackCalls, 1));
    act(() => auth.clear());
    assert.equal(screen.queryByRole('dialog'), null);
    await act(async () => { await auth.refresh(); });
    await screen.findByTitle('second@example.com');
    fireEvent.click(screen.getByRole('button', { name: '意见反馈' }));
    assert.equal(screen.getByLabelText(/反馈内容/).value, ''); assert.equal(screen.getByLabelText('联系方式').value, '');
    await act(async () => { feedbackResponse.resolve(answer()); await feedbackResponse.promise; });
    assert.equal(screen.queryByText('反馈已提交，感谢你的意见。'), null);
    assert.equal(screen.getByRole('button', { name: '提交反馈' }).disabled, true);
  } finally { cleanup(); globalThis.fetch = previousFetch; }
});

test('trusted admin status and account/workspace/guide destinations remain available on independent pages', async () => {
  const previousFetch = globalThis.fetch; const destinations = [];
  globalThis.fetch = async () => answer({ isAdmin: true });
  const header = (props) => <nav aria-label="test shell navigation">
    <button onClick={props.onWorkspaceAccount}>wallet</button><button onClick={props.onGuide}>guide</button>
    {props.onAdmin && <button onClick={props.onAdmin}>admin</button>}
  </nav>;
  try {
    render(<SitePageShell authEnabled initialSession={session('admin')} client={{}} apiBase="https://gateway.example" renderHeader={header} navigate={(href) => destinations.push(href)}><main /></SitePageShell>);
    await screen.findByRole('button', { name: 'admin' });
    for (const name of ['wallet', 'guide', 'admin']) fireEvent.click(screen.getByRole('button', { name }));
    assert.deepEqual(destinations, ['/?view=account', '/?view=guide', '/?admin=overview']);
  } finally { cleanup(); globalThis.fetch = previousFetch; }
});

test('late admin privileges from a previous account cannot appear in the shared shell', async () => {
  const previousFetch = globalThis.fetch; const admin = deferred(); let requests = 0; let auth;
  globalThis.fetch = async () => ++requests === 1 ? admin.promise : answer({ isAdmin: false });
  const client = { getSession: async () => ({ data: session('reader'), error: null }) };
  try {
    render(<SitePageShell authEnabled initialSession={session('old-admin')} client={client} apiBase="https://gateway.example"
      renderHeader={(props) => <nav>{props.onAdmin ? <button>admin-only</button> : null}</nav>}>{(value) => { auth = value.auth; return <main />; }}</SitePageShell>);
    await waitFor(() => assert.equal(requests, 1));
    act(() => auth.clear()); await act(async () => { await auth.refresh(); });
    await waitFor(() => assert.equal(requests, 2));
    await act(async () => { admin.resolve(answer({ isAdmin: true })); await admin.promise; });
    assert.equal(auth.session.user.id, 'reader'); assert.equal(screen.queryByRole('button', { name: 'admin-only' }), null);
  } finally { cleanup(); globalThis.fetch = previousFetch; }
});

test('standalone shell preserves document title and the app locale owns the leaderboard title', async () => {
  const previousTitle = document.title;
  document.title = '图研 · 论文画布';
  const shell = render(<SitePageShell authEnabled={false}><main /></SitePageShell>);
  assert.equal(document.title, '图研 · 论文画布');
  fireEvent.click(screen.getByRole('button', { name: '登录 / 注册' }));
  assert.ok(screen.getByRole('heading', { name: '账号服务尚未配置' }));
  shell.unmount();
  try {
    render(<AppLocaleProvider title="图研 Tuyan Benchmark · 科研图示生成与编辑模型基准评测"><SiteSessionProvider authEnabled={false}><LeaderboardRoot apiBase="https://gateway.example" backendMode="gateway" enabled={false} pathname="/leaderboard" route={{}} /></SiteSessionProvider></AppLocaleProvider>);
    await waitFor(() => assert.equal(document.title, '图研 Tuyan Benchmark · 科研图示生成与编辑模型基准评测'));
    fireEvent.click(screen.getByRole('button', { name: 'Switch to English', exact: true }));
    assert.equal(document.title, 'Tuyan Benchmark · Research figure generation and editing');
  } finally { cleanup(); window.localStorage.removeItem('tuyan.benchmark.language.v1'); window.localStorage.removeItem('tuyan.app.language.v1'); document.title = previousTitle; }
});
