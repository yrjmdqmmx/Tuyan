import assert from 'node:assert/strict'
import test, { afterEach } from 'node:test'

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'

import { BenchmarkPromptAdminPage, BenchmarkPromptSubmissionPage } from './BenchmarkEvidencePages.jsx'
import LeaderboardRoot, { BenchmarkSiteHeader, LeaderboardSessionProvider, useLeaderboardSession } from './LeaderboardRoot.jsx'

afterEach(cleanup)

function SessionConsumer({ label }) {
  const auth = useLeaderboardSession()
  return React.createElement('output', { 'aria-label': label }, auth.isPending ? 'pending' : auth.session?.user?.email || 'anonymous')
}

test('one provider performs exactly one session request for header and multiple route consumers', async () => {
  let requests = 0
  const client = {
    async getSession() {
      requests += 1
      return { data: { user: { id: 'user-1', email: 'reader@example.com' } }, error: null }
    },
  }
  render(React.createElement(LeaderboardSessionProvider, { authEnabled: true, client },
    React.createElement(BenchmarkSiteHeader, { route: {}, onFeedback() {}, onLogin() {}, onAccount() {}, onSignOut() {} }),
    React.createElement(SessionConsumer, { label: 'submission session' }),
    React.createElement(SessionConsumer, { label: 'admin session' }),
  ))
  await screen.findByTitle('reader@example.com')
  assert.equal(screen.getByLabelText('submission session').textContent, 'reader@example.com')
  assert.equal(screen.getByLabelText('admin session').textContent, 'reader@example.com')
  assert.equal(requests, 1)
})

test('benchmark header preserves nav labels, hrefs, external targets, and active semantics', () => {
  render(React.createElement(LeaderboardSessionProvider, { authEnabled: false },
    React.createElement(BenchmarkSiteHeader, { route: { methodology: true }, onFeedback() {}, onLogin() {}, onAccount() {}, onSignOut() {} }),
  ))
  const nav = screen.getByRole('navigation', { name: '排行榜导航' })
  const labels = [...nav.children].map((item) => item.textContent)
  assert.deepEqual(labels, ['排行榜', '方法说明', '提交评估题'])
  assert.equal(screen.getByText('方法说明').getAttribute('aria-current'), 'page')
  assert.equal(screen.getByRole('link', { name: '工作台' }).getAttribute('href'), '/')
  assert.equal(nav.querySelector('a').getAttribute('href'), '/leaderboard')
  assert.equal(screen.getByRole('link', { name: '提交评估题' }).getAttribute('href'), '/leaderboard/submit-prompt')
  const github = screen.getByRole('link', { name: 'GitHub' })
  assert.equal(github.getAttribute('href'), 'https://github.com/yrjmdqmmx/Tuyan')
  assert.equal(github.getAttribute('target'), '_blank')
  const openacad = screen.getByRole('link', { name: 'openacad' })
  assert.equal(openacad.getAttribute('href'), 'https://openacad.xyz/')
  assert.equal(openacad.getAttribute('target'), '_blank')
})

test('benchmark header exposes a dedicated feedback action for narrow responsive layouts', () => {
  render(React.createElement(LeaderboardSessionProvider, { authEnabled: false },
    React.createElement(BenchmarkSiteHeader, { route: {}, onFeedback() {}, onLogin() {}, onAccount() {}, onSignOut() {} }),
  ))
  assert.equal(screen.getByRole('button', { name: '意见反馈' }).classList.contains('header-feedback-button'), true)
})

test('submission page consumes the provider session instead of fetching a second session', () => {
  render(React.createElement(LeaderboardSessionProvider, { authEnabled: true, initialSession: { user: { id: 'user-1', email: 'reader@example.com' } } },
    React.createElement(BenchmarkPromptSubmissionPage, { apiBase: 'https://gateway.example', backendMode: 'gateway', showNavigation: false }),
  ))
  assert.ok(screen.getByRole('button', { name: '提交候选提示词' }))
  assert.equal(screen.queryByText('登录后提交评估题'), null)
})

function ClearSessionButton() {
  const auth = useLeaderboardSession()
  return React.createElement('button', { type: 'button', onClick: auth.clear }, '清除排行榜会话')
}

function deferred() {
  let resolve
  const promise = new Promise((done) => { resolve = done })
  return { promise, resolve }
}

test('clearing session immediately clears admin rows and ignores late queue responses', async () => {
  const previousFetch = globalThis.fetch
  const queueOperations = []
  globalThis.fetch = async (_input, options = {}) => {
    const body = JSON.parse(options.body)
    if (body.action === 'adminStatus') return new Response(JSON.stringify({ code: 0, isAdmin: true }), { status: 200 })
    if (body.action === 'adminCommunityList') {
      const operation = deferred()
      queueOperations.push(operation)
      return operation.promise
    }
    throw new Error(`unexpected ${body.action}`)
  }
  try {
    render(React.createElement(LeaderboardSessionProvider, { authEnabled: true, initialSession: { user: { id: 'admin-1', email: 'admin@example.com' } } },
      React.createElement(ClearSessionButton),
      React.createElement(BenchmarkPromptAdminPage, { apiBase: 'https://gateway.example', backendMode: 'gateway', showNavigation: false }),
    ))
    await waitFor(() => assert.equal(queueOperations.length, 1))
    fireEvent.click(screen.getByRole('button', { name: '清除排行榜会话' }))
    await act(async () => {
      queueOperations.forEach((operation, index) => operation.resolve(new Response(JSON.stringify({ code: 0, pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 }, rows: [{ submissionId: `late-${index}`, status: 'pending', prompt: '迟到数据', capability: 'race' }] }), { status: 200 })))
      await Promise.all(queueOperations.map((operation) => operation.promise))
    })
    assert.equal(screen.queryByText('迟到数据'), null)
    assert.ok(screen.getByText('需要站长账号才能访问。'))
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('phone header separates three page links from the shared More menu and preserves account actions', async () => {
  const previousMedia = window.matchMedia
  const listeners = new Set()
  const media = { matches: true, addEventListener: (_, fn) => listeners.add(fn), removeEventListener: (_, fn) => listeners.delete(fn) }
  window.matchMedia = () => media
  const actions = []
  try {
    render(React.createElement(LeaderboardSessionProvider, { authEnabled: true, initialSession: { user: { id: 'user-1', email: 'reader@example.com' } } },
      React.createElement(BenchmarkSiteHeader, { route: {}, onFeedback: () => actions.push('feedback'), onLogin() {}, onAccount: () => actions.push('account'), onSignOut: () => actions.push('signout'),
        onWorkspaceAccount: () => actions.push('wallet'), onGuide: () => actions.push('guide'), onContact: () => actions.push('contact'), onMiniProgram: () => actions.push('mini'), onAgentConnection: () => actions.push('agent') }),
    ))
    const more = screen.getByRole('button', { name: '更多', exact: true })
    assert.deepEqual([...screen.getByRole('navigation', { name: '排行榜导航' }).children].map(item => item.textContent), ['排行榜', '方法说明', '提交评估题'])
    assert.equal(screen.queryByRole('link', { name: 'GitHub' }), null)
    more.focus()
    fireEvent.click(more)
    assert.ok(screen.getByRole('link', { name: '提交评估题' }))
    assert.equal(screen.getByRole('link', { name: 'GitHub' }).getAttribute('target'), '_blank')
    fireEvent.click(screen.getByRole('button', { name: '意见反馈' }))
    assert.deepEqual(actions, ['feedback'])
    assert.equal(screen.queryByRole('dialog'), null)
    await waitFor(() => assert.equal(document.activeElement, more))
    fireEvent.click(screen.getByRole('button', { name: '账户', exact: true }))
    assert.deepEqual(actions, ['feedback', 'account'])
    fireEvent.click(more)
    fireEvent.click(screen.getByRole('button', { name: '退出', exact: true }))
    assert.deepEqual(actions, ['feedback', 'account', 'signout'])
    for (const [name, action] of [['账户与钱包', 'wallet'], ['使用教程', 'guide'], ['联系作者', 'contact'], ['微信小程序', 'mini'], ['智能体接入', 'agent']]) {
      fireEvent.click(more)
      fireEvent.click(screen.getByRole('button', { name, exact: true }))
      assert.equal(actions.at(-1), action)
      assert.equal(screen.queryByRole('dialog'), null)
    }
    fireEvent.click(more)
    act(() => { media.matches = false; listeners.forEach(fn => fn()) })
    assert.equal(screen.queryByRole('dialog'), null)
    assert.equal(screen.getByRole('navigation', { name: '排行榜导航' }).children.length, 3)
    assert.equal(document.body.style.overflow, '')
  } finally { cleanup(); window.matchMedia = previousMedia }
})

test('phone More ignores an admin-status response that arrives after the session was cleared', async () => {
  const previousMedia = window.matchMedia, previousFetch = globalThis.fetch
  const response = deferred()
  let requests = 0
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} })
  globalThis.fetch = async (_input, options = {}) => {
    assert.equal(JSON.parse(options.body).action, 'adminStatus')
    requests += 1
    return response.promise
  }
  try {
    render(React.createElement(LeaderboardSessionProvider, { authEnabled: true, initialSession: { user: { id: 'admin-1', email: 'admin@example.com' } } },
      React.createElement(ClearSessionButton),
      React.createElement(LeaderboardRoot, { apiBase: 'https://gateway.example', backendMode: 'gateway', enabled: false, pathname: '/leaderboard', route: {} }),
    ))
    await waitFor(() => assert.equal(requests, 1))
    fireEvent.click(screen.getByRole('button', { name: '更多', exact: true }))
    assert.equal(screen.queryByRole('button', { name: '站长', exact: true }), null)
    fireEvent.click(screen.getByRole('button', { name: '清除排行榜会话' }))
    await act(async () => { response.resolve(new Response(JSON.stringify({ code: 0, isAdmin: true }), { status: 200 })); await response.promise })
    assert.equal(screen.queryByRole('button', { name: '站长', exact: true }), null)
    assert.ok(screen.getByRole('button', { name: '登录 / 注册', exact: true }))
  } finally { cleanup(); window.matchMedia = previousMedia; globalThis.fetch = previousFetch }
})

for (const [route, active] of [[{}, '排行榜'], [{ dimensionId: 'scientific-faithfulness' }, '排行榜'], [{ modelProfileId: 'model' }, '排行榜'], [{ methodology: true }, '方法说明'], [{ promptSubmission: true }, '提交评估题'], [{ promptAdmin: true }, '提交评估题']]) {
  test(`page navigation highlights ${active} for ${JSON.stringify(route)}`, () => {
    render(React.createElement(LeaderboardSessionProvider, { authEnabled: false }, React.createElement(BenchmarkSiteHeader, { route })));
    const nav = screen.getByRole('navigation', { name: '排行榜导航' });
    assert.equal(nav.querySelectorAll('[aria-current="page"]').length, 1);
    assert.equal(nav.querySelector('[aria-current="page"]').textContent, active);
    const globalNav = screen.getByRole('navigation', { name: '网站导航' });
    assert.ok(globalNav.querySelector('a[href="/"]'));
    assert.deepEqual([...globalNav.querySelectorAll('.header-primary-link')].map(link => link.textContent.trim()), ['工作台', '论文画布', '排行榜', '更新日志']);
    assert.equal(globalNav.querySelector('a[href="/"]').getAttribute('aria-current'), null);
    assert.equal(globalNav.querySelector('a[href="/leaderboard"]').getAttribute('aria-current'), 'page');
  });
}

test('signed-in desktop account remains accessible through the shared email control', () => {
  let opened = 0;
  render(React.createElement(LeaderboardSessionProvider, { authEnabled: true, initialSession: { user: { id: 'user-1', email: 'reader@example.com' } } },
    React.createElement(BenchmarkSiteHeader, { route: {}, onAccount: () => opened++ }),
  ));
  fireEvent.click(screen.getByRole('button', { name: 'reader@example.com，账户' }));
  assert.equal(opened, 1);
});
