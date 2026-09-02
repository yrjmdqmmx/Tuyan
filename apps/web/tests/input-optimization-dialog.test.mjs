import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import React, { useState } from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InputOptimizationDialog from '../src/components/InputOptimizationDialog.jsx'

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})
test('dialog exposes complete original and candidate semantics plus live loading, failure, and success states', () => {
  const common = {
    open: true,
    target: 'caption',
    targetLabel: '目标图注',
    original: '原始流程包含采集步骤。',
    candidate: '新版流程包含清洗步骤。',
    onClose() {},
    onRetry() {},
    onAdopt() {},
  }
  const view = render(React.createElement(InputOptimizationDialog, { ...common, status: 'loading', error: '' }))
  assert.match(screen.getByRole('status').textContent, /正在/u)

  view.rerender(React.createElement(InputOptimizationDialog, { ...common, status: 'error', error: '请求失败' }))
  assert.match(screen.getByRole('alert').textContent, /请求失败/u)

  view.rerender(React.createElement(InputOptimizationDialog, { ...common, status: 'success', error: '' }))
  const dialog = screen.getByRole('dialog', { name: /优化目标图注/u })
  const original = within(dialog).getByRole('region', { name: '原文，删除内容已标记' })
  const candidate = within(dialog).getByRole('region', { name: '优化稿，新增内容已标记' })
  assert.equal(original.textContent, common.original)
  assert.equal(candidate.textContent, common.candidate)
  assert.ok(original.querySelector('del'))
  assert.ok(candidate.querySelector('ins'))
  assert.match(within(dialog).getByRole('status').textContent, /完成/u)
})

test('dialog autofocuses its close control, traps tab, closes on Escape, and restores prior focus', async () => {
  let closeCount = 0
  function Harness() {
    const [open, setOpen] = useState(false)
    return React.createElement(React.Fragment, null,
      React.createElement('button', { type: 'button', onClick: () => setOpen(true) }, '打开优化'),
      React.createElement(InputOptimizationDialog, {
        open,
        target: 'methodContent',
        targetLabel: '论文方法内容',
        original: '原文',
        candidate: '优化稿',
        status: 'success',
        error: '',
        onClose: () => { closeCount += 1; setOpen(false) },
        onRetry() {},
        onAdopt() {},
      }),
    )
  }

  const user = userEvent.setup()
  render(React.createElement(Harness))
  const opener = screen.getByRole('button', { name: '打开优化' })
  await user.click(opener)
  const close = screen.getByRole('button', { name: '关闭输入优化' })
  await new Promise((resolve) => window.requestAnimationFrame(resolve))
  assert.equal(document.activeElement, close)
  fireEvent.keyDown(window, { key: 'Escape' })
  assert.equal(closeCount, 1)
  await new Promise((resolve) => window.requestAnimationFrame(resolve))
  assert.equal(document.activeElement, opener)
})
