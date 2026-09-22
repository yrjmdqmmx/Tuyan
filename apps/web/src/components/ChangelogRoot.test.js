import assert from 'node:assert/strict'
import test, { afterEach } from 'node:test'
import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import ChangelogRoot, { ChangelogPage } from './ChangelogRoot.jsx'
import { LeaderboardSessionProvider } from './LeaderboardRoot.jsx'

afterEach(cleanup)

test('a direct entry fragment scrolls to its article after the lazy route mounts', () => {
  const original = HTMLElement.prototype.scrollIntoView
  let target
  HTMLElement.prototype.scrollIntoView = function () { target = this.id }
  try {
    window.history.replaceState({}, '', '/changelog#reference-budget')
    render(React.createElement(ChangelogPage))
    assert.equal(target, 'v3-8-0')
  } finally { HTMLElement.prototype.scrollIntoView = original }
})

test('readers can search the archive, recover from no results, and inspect public sources', () => {
  render(React.createElement(ChangelogPage))
  assert.match(screen.getByText(/^按图研版本整理，截至/).textContent, /2026 年 9 月 22 日/)
  assert.ok(screen.getByRole('region', {name:'待发布版本'}))
  assert.ok(screen.getByRole('region', {name:'历史版本'}))
  assert.ok(screen.getByRole('region', {name:'版本归属待核实'}))
  const search = screen.getByRole('searchbox', { name: '搜索更新日志' })
  fireEvent.change(search, { target: { value: '3.8.0 Runware 遮罩' } })
  assert.equal(screen.getAllByRole('article').length, 1)
  assert.equal(screen.getByRole('status').textContent, '找到 1 个版本')
  const source = screen.getByText('查看来源')
  fireEvent.click(source)
  assert.equal(source.parentElement.open, true)
  assert.equal(screen.getByRole('link', { name: '变更 #226' }).getAttribute('href'), 'https://github.com/yrjmdqmmx/Tuyan/pull/226')
  fireEvent.change(search, { target: { value: '不存在的更新' } })
  assert.ok(screen.getByRole('heading', { name: '未找到相关更新' }))
  fireEvent.click(screen.getByRole('button', { name: '查看全部更新' }))
  assert.equal(search.value, '')
  assert.ok(screen.getAllByRole('article').length > 1)
})

test('changelog reuses shared header and account actions with only one session request', async () => {
  let requests = 0
  const client = { async getSession() { requests++; return { data: null, error: null } } }
  render(React.createElement(LeaderboardSessionProvider, { authEnabled: true, client }, React.createElement(ChangelogRoot, { apiBase: 'https://gateway.example', backendMode: 'gateway' })))
  await waitFor(() => assert.equal(requests, 1))
  const nav = screen.getByRole('navigation', { name: '网站导航' })
  const links = [...nav.querySelectorAll('.header-primary-link')]
  assert.deepEqual(links.map(link => link.textContent.trim()), ['工作台', '排行榜', '更新日志'])
  assert.equal(links[2].getAttribute('aria-current'), 'page')
  assert.equal(links.filter(link => link.hasAttribute('aria-current')).length, 1)
  assert.equal(screen.queryByRole('navigation', { name: '排行榜导航' }), null)
  fireEvent.click(screen.getByRole('button', { name: '意见反馈' }))
  assert.ok(screen.getByRole('dialog'))
  assert.equal(requests, 1)
})

test('mobile changelog link appears only inside More and marks the active page', async () => {
  const original = window.matchMedia
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} })
  try {
    render(React.createElement(LeaderboardSessionProvider, { authEnabled: false }, React.createElement(ChangelogRoot, { apiBase: 'https://gateway.example', backendMode: 'gateway' })))
    assert.equal(screen.queryByRole('link', { name: '更新日志', exact: true }), null)
    const more = screen.getByRole('button', { name: '更多', exact: true })
    more.focus()
    fireEvent.click(more)
    const dialog = within(screen.getByRole('dialog', { name: '更多功能' }))
    assert.equal(dialog.getByRole('link', { name: '更新日志', exact: true }).getAttribute('aria-current'), 'page')
    assert.equal(dialog.getByRole('link', { name: '工作台' }).getAttribute('href'), '/')
    assert.equal(dialog.getByRole('link', { name: '排行榜' }).getAttribute('href'), '/leaderboard')
    fireEvent.click(dialog.getByRole('button', { name: '关闭更多功能' }))
    await waitFor(() => assert.equal(document.activeElement, more))
  } finally { cleanup(); window.matchMedia = original }
})


test('unknown dates and mixed client publication remain explicit', () => {
  render(React.createElement(ChangelogPage))
  const oldest = document.getElementById('v1-0-0')
  assert.match(oldest.textContent, /发布信息待核实/)
  assert.match(oldest.textContent, /公告记录 2026-05-14/)
  const next = document.getElementById('v3-8-0')
  assert.match(next.textContent, /正式发布日期待定/)
  assert.match(next.textContent, /本地已验证/)
  assert.match(next.textContent, /此前已上线/)
  assert.match(document.getElementById('v3-7-1').textContent, /已发布 · Web/)
})
