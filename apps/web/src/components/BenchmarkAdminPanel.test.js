import assert from 'node:assert/strict'
import test from 'node:test'

import { render, screen } from '@testing-library/react'
import React from 'react'

import BenchmarkAdminPanel from './BenchmarkAdminPanel.jsx'

test('admin panel keeps candidate approval, run control, audit exchange and publishing outside public bench', () => {
  const { container } = render(React.createElement(BenchmarkAdminPanel, { apiBase: 'https://gateway.example', health: { backendMode: 'gateway' }, disabled: true }))
  for (const text of ['候选与预算审批', '运行控制', 'Codex 审核包', '发布控制']) {
    assert.ok(screen.getByText(text))
  }
  assert.ok(screen.getByText('临时集'))
  assert.ok(screen.getByText('正式集'))
  assert.ok(screen.getByText(/纳入公开精选/))
  assert.match(container.textContent, /未配置 Bench 凭据的 Provider 显示为未评测/)
})
