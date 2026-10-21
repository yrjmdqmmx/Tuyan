import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import React, { useReducer } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { resolveWorkspaceLocation, workspacePageHref } from '../src/workspace/workspaceRoutes.js';
import useWorkspaceNavigation from '../src/workspace/useWorkspaceNavigation.js';
import TaskWorkspace from '../src/workspace/TaskWorkspace.jsx';
import WorkspacePages from '../src/workspace/WorkspacePages.jsx';
import WorkspaceAccount from '../src/workspace/WorkspaceAccount.jsx';
import { newWorkspace, workspaceReducer } from '../src/workspace/workspaceState.js';
import changelog from '../src/data/changelog.json';

window.matchMedia = query => ({matches:false, media:query, addEventListener(){}, removeEventListener(){}});
window.scrollTo = () => {};
window.HTMLElement.prototype.scrollTo = function({top = 0} = {}) { this.scrollTop = top; };
window.HTMLElement.prototype.scrollIntoView = function() { this.dataset.scrolled = 'true'; };
const originalFetch = globalThis.fetch;
afterEach(() => { cleanup(); globalThis.fetch = originalFetch; });
const url = path => new URL(path, 'https://paperbanana.asia');

test('all published paths, index documents and query entries resolve to workspace destinations without changing URLs', () => {
  for (const base of ['/', '/Tuyan/']) {
    for (const [path, page, publicPage] of [
      ['', 'workspace', false], ['?view=legacy', 'workspace', false], ['?view=generate', 'workspace', false],
      ['?view=records', '任务记录', false], ['?view=refine', 'workspace', false],
      ['?view=account', '账户设置', false], ['?tokendance_wallet=1', '账户设置', false],
      ['?view=guide', '使用教程', true], ['?admin=users&a_id=42', '站长页', false],
      ['changelog', '更新日志', true], ['changelog/index.html', '更新日志', true],
      ['leaderboard/', '排行榜', true], ['leaderboard/index.html', '排行榜', true],
      ['leaderboard/methodology/index.html', '排行榜', true],
      ['leaderboard/submit-prompt', '排行榜', true],
      ['leaderboard/admin/prompt-submissions/', '社区评估题审核', false],
      ['unknown', '页面未找到', true],
    ]) {
      const location = url(base + path), before = location.href;
      const route = resolveWorkspaceLocation(location, base);
      assert.equal(route.page, page, path); assert.equal(route.publicPage, publicPage, path);
      assert.equal(location.href, before);
    }
    for (const path of ['leaderboard', 'bench']) {
      assert.equal(resolveWorkspaceLocation(url(`${base}${path}/models/provider%2Fmodel?view=pareto#evidence`), base).leaderboardPath, '/leaderboard/models/provider%2Fmodel');
      const route = resolveWorkspaceLocation(url(`${base}leaderboard?__route=%2F${path}%2Fmethodology&keep=1#scores`), base);
      assert.equal(route.leaderboardPath, '/leaderboard/methodology');
      assert.equal(route.hash, '#scores'); assert.match(route.search, /keep=1/);
    }
  }
  assert.equal(resolveWorkspaceLocation(url('/?view=refine')).composerAction, 'attachments');
  assert.equal(resolveWorkspaceLocation(url('/?tokendance_wallet=1')).accountSection, 'account');
  assert.equal(resolveWorkspaceLocation(url('/leaderboard?__route=https%3A%2F%2Fevil.test')).leaderboardPath, '/leaderboard');
});

test('every current and legacy version/event anchor reopens the changelog from both original and workspace URLs', () => {
  for (const entry of [...changelog.entries, ...changelog.events]) for (const anchor of [entry.id, ...(entry.legacyAnchors || [])]) {
    for (const prefix of ['/', '/changelog', '/changelog/', '/changelog/index.html']) {
      const route = resolveWorkspaceLocation(url(`${prefix}#${anchor}`));
      assert.equal(route.page, '更新日志', `${prefix}#${anchor}`);
      assert.equal(route.hash, `#${anchor}`);
    }
  }
  for (const filter of ['all', 'tuyan', 'benchmark', 'openacad', 'ecosystem']) assert.equal(resolveWorkspaceLocation(url(`/#${filter}`)).page, '更新日志');
  assert.equal(resolveWorkspaceLocation(url('/#token=private')).page, 'workspace');
  for (const view of ['constructor', '__proto__', 'toString']) assert.equal(resolveWorkspaceLocation(url('/?view=' + view)).page, 'workspace');
});

test('page navigation clears only obsolete route hints and keeps project-base URLs valid', () => {
  const from = url('/Tuyan/changelog?view=legacy&__route=x&admin=users&a_id=4&keep=1#v4-0-0');
  assert.equal(workspacePageHref('排行榜', from, '/Tuyan/'), '/Tuyan/leaderboard?keep=1');
  assert.equal(workspacePageHref('workspace', from, '/Tuyan/'), '/Tuyan/?keep=1');
  assert.equal(workspacePageHref('账户设置', from, '/Tuyan/'), '/Tuyan/?keep=1&view=account');
});

const client = {getSession: async () => ({data:null})};
function Harness({ gated = false, initialState = newWorkspace('route-test') }) {
  const navigation = useWorkspaceNavigation();
  const [state, dispatch] = useReducer(workspaceReducer, initialState);
  return React.createElement(WorkspaceAccount, {client, enabled:false, requireLogin:gated && !navigation.route.publicPage},
    account => React.createElement(TaskWorkspace, {state, dispatch, ...account, navigation,
      onSubmit:() => assert.fail('navigation must not generate'), onFiles:() => assert.fail('navigation must not upload'),
      renderPage:(page,onClose,onNavigate,options) => React.createElement(WorkspacePages, {key:page, ...options, page, onClose, onNavigate, account, models:{}})}));

}
async function navigate(path) {
  await act(async () => { window.history.pushState(null, '', path); window.dispatchEvent(new window.PopStateEvent('popstate')); });
}

test('direct changelog link has one new workspace shell, scrolls to the version and follows back/forward and category hashes', async () => {
  window.history.replaceState(null, '', '/changelog/index.html?keep=1#v4-0-0');
  render(React.createElement(Harness));
  await screen.findByRole('article', {name:'Tuyan v4.0.0'});
  assert.ok(screen.getByRole('complementary', {name:'任务侧边栏'}));
  assert.equal(document.querySelectorAll('.tw-shell').length, 1);
  assert.equal(document.querySelector('.site-page-shell,.workbench-header'), null);
  assert.equal(document.getElementById('v4-0-0').dataset.scrolled, 'true');
  await navigate('/?view=guide');
  assert.ok(screen.getByRole('heading', {name:'使用教程', level:1}));
  await act(async () => { window.history.back(); });
  await waitFor(() => assert.ok(screen.getByRole('heading', {name:'更新日志', level:1})));
  await screen.findByRole('article', {name:'Tuyan v4.0.0'});
  assert.equal(window.location.hash, '#v4-0-0');
  await act(async () => { window.history.forward(); });
  await waitFor(() => assert.ok(screen.getByRole('heading', {name:'使用教程', level:1})));
  await navigate('/changelog#ecosystem');
  await waitFor(() => assert.equal(screen.getByRole('link', {name:'生态事件', exact:true}).getAttribute('aria-current'), 'page'));
  assert.equal(screen.queryByRole('article', {name:'Tuyan v4.0.0'}), null);
});

test('URL navigation keeps the current draft and opens retained history without generating or overwriting content', async () => {
  render(React.createElement(Harness));
  fireEvent.change(screen.getByLabelText('绘图要求'), {target:{value:'保留未提交草稿'}});
  await navigate('/changelog#v4-0-0');
  await screen.findByRole('article', {name:'Tuyan v4.0.0'});
  fireEvent.click(screen.getByRole('button', {name:'返回任务', exact:true}));
  assert.equal(screen.getByLabelText('绘图要求').value, '保留未提交草稿');
  assert.equal(window.location.pathname, '/'); assert.equal(window.location.hash, '');
  await navigate('/?view=records');
  const records = screen.getByRole('region', {name:'任务记录'});
  fireEvent.click(within(records).getByRole('button'));
  assert.equal(screen.getByLabelText('绘图要求').value, '保留未提交草稿');
  await navigate('/?view=refine');
  await waitFor(() => assert.equal(document.activeElement?.getAttribute('data-composer-action'), 'attachments'));
  assert.equal(screen.getByLabelText('绘图要求').value, '保留未提交草稿');
});

test('anonymous public navigation stays accessible, while workbench and administration still require login', async () => {
  window.history.replaceState(null, '', '/changelog#v4-0-0');
  render(React.createElement(Harness,{gated:true}));
  await screen.findByRole('article', {name:'Tuyan v4.0.0'});
  await navigate('/?admin=users&a_id=42');
  await screen.findByRole('heading', {name:'登录图研'});
  assert.equal(screen.queryByRole('navigation', {name:'后台导航'}), null);
  assert.equal(screen.queryByLabelText('绘图要求'), null);
  await navigate('/?view=guide');
  assert.ok(screen.getByRole('heading', {name:'使用教程', level:1}));
  await navigate('/?view=legacy');
  await screen.findByRole('heading', {name:'登录图研'});
  assert.equal(screen.queryByLabelText('绘图要求'), null);
});

test('leaderboard deep routes and navigation use browser history; signed-out submission offers login without posting', async () => {
  const requests = [];
  globalThis.fetch = async (url, options) => { requests.push({url:String(url), body:options?.body}); return Response.json({code:0, release:null, profile:null}); };
  window.history.replaceState(null, '', '/leaderboard?__route=%2Fleaderboard%2Fmodels%2Ffixture%252Fmodel');
  render(React.createElement(Harness));
  await waitFor(() => assert.ok(requests.some(request => JSON.stringify(request).includes('fixture'))));
  const nav = screen.getByRole('navigation', {name:'排行榜页面'});
  fireEvent.click(within(nav).getByRole('button', {name:'评估方法'}));
  assert.equal(window.location.pathname, '/leaderboard/methodology');
  fireEvent.click(within(nav).getByRole('button', {name:'提交评估题'}));
  await screen.findByRole('heading', {name:'登录后提交评估题'});
  assert.equal(window.location.pathname, '/leaderboard/submit-prompt');
  await act(async () => { window.history.back(); });
  await waitFor(() => assert.equal(within(nav).getByRole('button', {name:'评估方法'}).getAttribute('aria-current'), 'page'));
  assert.ok(requests.every(request => !/generate|refine|submitPrompt|promptSubmission/.test(request.body || '')));
});
