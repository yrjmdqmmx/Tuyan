import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react'
import AccountSettingsDialog from '../src/components/AccountSettingsDialog.jsx'

for (const state of ['review_required', 'deleting']) {
  test(`account settings display ${state} and prevent a second destructive request`, async () => {
    const original = globalThis.fetch
    const requests = []
    globalThis.fetch = async (url, init) => { requests.push({ url, init }); return Response.json({ code: 0, state }) }
    try {
      render(React.createElement(AccountSettingsDialog, { apiBase: 'https://api.example.test', email: 'fixture@example.test', onClose() {}, onDeleted: () => assert.fail('not completed') }))
      await waitFor(() => assert.match(screen.getByRole('status').textContent, state === 'deleting' ? /后台将继续处理/ : /需要核对/))
      assert.equal(screen.getByRole('button', { name: '永久删除账号' }).disabled, true)
      assert.equal(requests.length, 1)
      assert.match(requests[0].url, /\/api\/account\/status$/)
    } finally { cleanup(); globalThis.fetch = original }
  })
}

test('202 acceptance clears the password but does not claim deletion or clear local account data', async () => {
  const original = globalThis.fetch
  let deleted = false
  let posts = 0
  globalThis.fetch = async (_url, init) => {
    if (init?.method === 'POST') { posts++; return Response.json({ code: 202, accepted: true, phase: 'business' }, { status: 202 }) }
    return Response.json({ code: 0, state: 'active' })
  }
  try {
    render(React.createElement(AccountSettingsDialog, { apiBase: '', email: 'fixture@example.test', onClose() {}, onDeleted() { deleted = true } }))
    await waitFor(() => assert.ok(screen.getByLabelText('当前登录密码')))
    fireEvent.change(screen.getByLabelText('当前登录密码'), { target: { value: 'fixture-password' } })
    fireEvent.change(screen.getByLabelText('输入“删除账号”确认'), { target: { value: '删除账号' } })
    await waitFor(() => assert.equal(screen.getByRole('button', { name: '永久删除账号' }).disabled, false))
    fireEvent.click(screen.getByRole('button', { name: '永久删除账号' }))
    await waitFor(() => assert.match(screen.getByRole('status').textContent, /申请已受理/))
    assert.equal(posts, 1)
    assert.equal(deleted, false)
    assert.equal(screen.getByLabelText('当前登录密码').value, '')
    assert.equal(screen.getByRole('button', { name: '永久删除账号' }).disabled, true)
  } finally { cleanup(); globalThis.fetch = original }
})
