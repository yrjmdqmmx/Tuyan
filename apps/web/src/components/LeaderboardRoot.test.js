import assert from 'node:assert/strict'
import test, { afterEach } from 'node:test'

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'

import { BenchmarkPromptAdminPage, BenchmarkPromptSubmissionPage } from './BenchmarkEvidencePages.jsx'
import { BenchmarkSiteHeader, LeaderboardSessionProvider, useLeaderboardSession } from './LeaderboardRoot.jsx'

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

test('benchmark header preserves the five nav labels, hrefs, external target, and active semantics', () => {
  render(React.createElement(LeaderboardSessionProvider, { authEnabled: false },
    React.createElement(BenchmarkSiteHeader, { route: { methodology: true }, onFeedback() {}, onLogin() {}, onAccount() {}, onSignOut() {} }),
  ))
  const nav = screen.getByRole('navigation', { name: '排行榜导航' })
  const labels = [...nav.children].map((item) => item.textContent)
  assert.deepEqual(labels, ['工作台', '排行榜', '方法说明', '提交评估题', 'GitHub'])
  assert.equal(screen.getByText('方法说明').getAttribute('aria-current'), 'page')
  assert.equal(screen.getByRole('link', { name: '工作台' }).getAttribute('href'), '/')
  assert.equal(screen.getByRole('link', { name: '排行榜' }).getAttribute('href'), '/leaderboard')
  assert.equal(screen.getByRole('link', { name: '提交评估题' }).getAttribute('href'), '/leaderboard/submit-prompt')
  const github = screen.getByRole('link', { name: 'GitHub' })
  assert.equal(github.getAttribute('href'), 'https://github.com/zdywrnm/PaperBanana-clients')
  assert.equal(github.getAttribute('target'), '_blank')
})

test('benchmark header exposes a dedicated feedback action for narrow responsive layouts', () => {
  render(React.createElement(LeaderboardSessionProvider, { authEnabled: false },
    React.createElement(BenchmarkSiteHeader, { route: {}, onFeedback() {}, onLogin() {}, onAccount() {}, onSignOut() {} }),
  ))
  assert.equal(screen.getByRole('button', { name: '意见反馈' }).classList.contains('benchmark-feedback-action'), true)
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
    if (body.action === 'adminBenchmarkPromptQueue') {
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
    await waitFor(() => assert.equal(queueOperations.length, 3))
    fireEvent.click(screen.getByRole('button', { name: '清除排行榜会话' }))
    await act(async () => {
      queueOperations.forEach((operation, index) => operation.resolve(new Response(JSON.stringify({ code: 0, submissions: [{ submissionId: `late-${index}`, status: 'pending', prompt: '迟到数据', capability: 'race' }] }), { status: 200 })))
      await Promise.all(queueOperations.map((operation) => operation.promise))
    })
    assert.equal(screen.queryByText('迟到数据'), null)
    assert.ok(screen.getByText('需要站长账号才能访问。'))
  } finally {
    globalThis.fetch = previousFetch
  }
})
