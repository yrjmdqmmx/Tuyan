import assert from 'node:assert/strict'
import test, { afterEach } from 'node:test'
import fs from 'node:fs'
import React, { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { AppLocaleProvider, BenchmarkLocaleProvider, useAppLocale } from './BenchmarkLocale.jsx'
import { APP_LANGUAGE_KEY, BENCHMARK_LANGUAGE_KEY, benchmarkText, readBenchmarkLocale } from './benchmarkLocale.js'
import LanguageSwitch from './LanguageSwitch.jsx'
import WorkbenchHeader from './WorkbenchHeader.jsx'
import { ChangelogPage } from './ChangelogRoot.jsx'

const h = React.createElement
const data = JSON.parse(fs.readFileSync(new URL('../data/changelog.json', import.meta.url)))
afterEach(() => { cleanup(); window.localStorage.clear(); document.documentElement.lang = 'zh-CN' })
function Draft() {
  const { t, locale } = useAppLocale()
  const [input, setInput] = useState('用户原文')
  const [model, setModel] = useState('model-a')
  return h('section', { 'data-testid': 'draft', lang: locale },
    h('label', null, t('论文方法内容'), h('input', { value: input, onChange: e => setInput(e.target.value) })),
    h('select', { 'aria-label': t('主模型'), value: model, onChange: e => setModel(e.target.value) },
      h('option', { value: 'model-a' }, 'model-a'), h('option', { value: 'model-b' }, 'model-b')))
}

test('one app locale crosses legacy page boundaries without resetting drafts or model IDs', () => {
  render(h(AppLocaleProvider, { title: '图研Tuyan工作台' }, h(LanguageSwitch), h(Draft),
    h(BenchmarkLocaleProvider, null, h(ChangelogPage))))
  fireEvent.change(screen.getByLabelText('论文方法内容'), { target: { value: 'Keep 我的输入 exactly' } })
  fireEvent.change(screen.getByLabelText('主模型'), { target: { value: 'model-b' } })
  fireEvent.click(screen.getByRole('button', { name: 'Switch to English' }))
  assert.equal(screen.getByLabelText('Research methods').value, 'Keep 我的输入 exactly')
  assert.equal(screen.getByLabelText('Main model').value, 'model-b')
  assert.ok(screen.getByRole('heading', { name: 'Changelog', exact: true }))
  assert.equal(document.documentElement.lang, 'en')
  assert.equal(document.title, 'Tuyan Workbench')
  assert.equal(window.localStorage.getItem(APP_LANGUAGE_KEY), 'en')
  assert.equal(window.localStorage.getItem(BENCHMARK_LANGUAGE_KEY), 'en')
  fireEvent.click(screen.getByRole('button', { name: '切换到中文' }))
  assert.equal(screen.getByLabelText('论文方法内容').value, 'Keep 我的输入 exactly')
  assert.equal(screen.getByLabelText('主模型').value, 'model-b')
})

test('legacy preferences migrate, app preference wins, and cross-tab changes update mounted pages', () => {
  window.localStorage.setItem(BENCHMARK_LANGUAGE_KEY, 'en')
  assert.equal(readBenchmarkLocale(), 'en')
  render(h(AppLocaleProvider, null, h(LanguageSwitch), h(Draft)))
  assert.ok(screen.getByLabelText('Research methods'))
  window.localStorage.setItem(APP_LANGUAGE_KEY, 'zh-CN')
  fireEvent(window, new window.StorageEvent('storage', { key: APP_LANGUAGE_KEY, newValue: 'zh-CN' }))
  assert.ok(screen.getByLabelText('论文方法内容'))
  window.localStorage.setItem(APP_LANGUAGE_KEY, 'en')
  fireEvent(window, new window.StorageEvent('storage', { key: APP_LANGUAGE_KEY, newValue: 'en' }))
  assert.ok(screen.getByLabelText('Research methods'))
  assert.equal(readBenchmarkLocale(), 'en')
})

test('all shared headers expose the same language action, including on compact layouts', () => {
  const old = window.matchMedia
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} })
  try {
    for (const section of ['workbench', 'leaderboard', 'changelog']) {
      const { container } = render(h(AppLocaleProvider, null, h(WorkbenchHeader, { section })))
      assert.equal(container.querySelectorAll('.paper-header [data-site-language]').length, 1)
      assert.equal(container.querySelectorAll('.mobile-more-dialog [data-site-language]').length, 0)
      fireEvent.click(screen.getByRole('button', { name: /Switch to English|切换到中文/ }))
      assert.equal(container.querySelectorAll('.paper-header [data-site-language]').length, 1)
      cleanup()
    }
  } finally { window.matchMedia = old }
})

test('every public changelog entry has an English title, summary, notes and changes without altering source data', () => {
  const before = JSON.stringify(data)
  const entries = [...data.entries.filter(e => e.release.status === 'released'), ...data.events.filter(e => e.status === 'recorded')]
  assert.ok(entries.length >= 21)
  for (const entry of entries) {
    for (const text of [entry.title, entry.summary, ...(entry.notes || []), ...entry.changes.map(c => c.text)]) {
      assert.doesNotMatch(benchmarkText('en', text), /[\u4e00-\u9fff]/, `${entry.id}: ${text}`)
    }
  }
  assert.equal(JSON.stringify(data), before)
})
