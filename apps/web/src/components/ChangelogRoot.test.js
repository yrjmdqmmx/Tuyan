import assert from 'node:assert/strict'
import test, { afterEach } from 'node:test'
import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import ChangelogRoot, { ChangelogPage } from './ChangelogRoot.jsx'
import { LeaderboardSessionProvider } from './LeaderboardRoot.jsx'

afterEach(() => { cleanup(); window.history.replaceState({}, '', '/changelog') })

test('legacy published fragments scroll to the independent product entry', () => {
  const original = HTMLElement.prototype.scrollIntoView
  let target
  HTMLElement.prototype.scrollIntoView = function () { target = this.id }
  try {
    window.history.replaceState({}, '', '/changelog#early-ranking-mai')
    render(React.createElement(ChangelogPage))
    assert.equal(target, 'benchmark-v2-1')
  } finally { HTMLElement.prototype.scrollIntoView = original }
})

test('first load selects the overview and shows every public update in date groups', () => {
  render(React.createElement(ChangelogPage))
  const nav = within(screen.getByRole('navigation', { name: '更新分类' }))
  assert.deepEqual(nav.getAllByRole('link').map(link => link.textContent), ['更新日志', '图研工作台', 'Tuyan Benchmark', 'OpenAcad', '生态事件'])
  assert.equal(nav.getByRole('link', { name: '更新日志', exact: true }).getAttribute('aria-current'), 'page')
  const overview = screen.getByRole('region', { name: '更新日志', exact: true })
  assert.equal(within(overview).getAllByRole('article').length, 25)
  assert.equal(document.querySelectorAll('[id="date-2026-09-07"]').length, 1)
  assert.equal(within(screen.getByRole('region', { name: '2026-09-07' })).getAllByRole('article').length, 5)
  assert.equal(overview.querySelector('time').dateTime, '2026-09-20')
  assert.ok(screen.getByRole('heading', { name: 'Tuyan v3.7.1' }))
  assert.ok(screen.getByRole('heading', { name: 'Tuyan Benchmark v2.5' }))
  assert.ok(screen.getByRole('heading', { name: 'OpenAcad v1.1.0' }))
  const event = document.getElementById('agent-copy-entry')
  assert.equal(within(event).getByRole('heading').textContent, '智能体接入口令')
  assert.equal(event.querySelector('.changelog-summary'), null)
  assert.equal(screen.queryByRole('searchbox'), null)
  assert.equal(document.getElementById('v3-8-0'), null)
  assert.doesNotMatch(document.body.textContent, /时间轴|待发布版本|归属待核实|按版本回顾|按图研版本整理|历史微信公告整理稿|搜索更新日志/)
  const source = document.querySelector('#v3-7-1 summary')
  fireEvent.click(source)
  assert.equal(source.parentElement.open, true)
  assert.equal(screen.getByRole('link', { name: '观猹身份登录与绑定' }).getAttribute('href'), 'https://github.com/yrjmdqmmx/Tuyan/pull/193')
})

test('category selection shows only that category, updates selection and returns to the overview', async () => {
  render(React.createElement(ChangelogPage))
  const nav = within(screen.getByRole('navigation', { name: '更新分类' }))
  for (const [label, count] of [['图研工作台', 12], ['Tuyan Benchmark', 5], ['OpenAcad', 4], ['生态事件', 4], ['更新日志', 25]]) {
    fireEvent.click(nav.getByRole('link', { name: label, exact: true }))
    await waitFor(() => assert.equal(nav.getByRole('link', { name: label, exact: true }).getAttribute('aria-current'), 'page'))
    assert.equal(nav.getAllByRole('link').filter(link => link.hasAttribute('aria-current')).length, 1)
    assert.equal(screen.getAllByRole('article').length, count)
    assert.ok(screen.getByRole('region', { name: label, exact: true }))
    if (label === '图研工作台') assert.match(screen.getByRole('region', { name: label }).textContent, /PaperBanana 是 Tuyan 在 1.x–2.x 的历史品牌/)
  }
})

test('direct category links and browser hash navigation restore the selected view', async () => {
  window.history.replaceState({}, '', '/changelog#openacad')
  render(React.createElement(ChangelogPage))
  const nav = within(screen.getByRole('navigation', { name: '更新分类' }))
  assert.equal(nav.getByRole('link', { name: 'OpenAcad', exact: true }).getAttribute('aria-current'), 'page')
  assert.equal(screen.getAllByRole('article').length, 4)
  window.history.replaceState({}, '', '/changelog#benchmark')
  fireEvent(window, new window.HashChangeEvent('hashchange'))
  await waitFor(() => assert.equal(nav.getByRole('link', { name: 'Tuyan Benchmark', exact: true }).getAttribute('aria-current'), 'page'))
  assert.equal(screen.getAllByRole('article').length, 5)
  window.history.replaceState({}, '', '/changelog#unknown')
  fireEvent(window, new window.HashChangeEvent('hashchange'))
  await waitFor(() => assert.equal(nav.getByRole('link', { name: '更新日志', exact: true }).getAttribute('aria-current'), 'page'))
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
    assert.deepEqual(screen.getAllByRole('link', { name: '更新日志', exact: true }).map(link => link.getAttribute('href')), ['#all'])
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


test('confirmed early releases show published status and 3.0.0 uses its announcement date', () => {
  render(React.createElement(ChangelogPage))
  for (const id of ['v1-0-0', 'v1-1-0', 'v1-3-0']) assert.match(document.getElementById(id).textContent, /已发布 · Web/)
  assert.equal(document.getElementById('v3-0-0').closest('.changelog-date-group').querySelector('time').dateTime, '2026-08-24')
})
