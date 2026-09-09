const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadComponent } = require('./helpers/component.cjs')

test('account safety keeps lifecycle status and 202 accepted deletion without claiming completion', async () => {
  const calls = []
  const { instance, events } = loadComponent('components/account-settings/account-settings.js', {
    '../../utils/session': { getCurrentUser: () => ({ id: 'owner-a' }), signOut: async () => calls.push('logout') },
    '../../utils/api': { formatError: e => e.message, gatewayRequest: async (url, method) => {
      calls.push(method)
      return method === 'GET' ? { code: 0, state: 'active' } : { code: 202, accepted: true }
    } },
  })
  instance.properties.show = true
  await instance.refreshLifecycle()
  assert.equal(instance.data.lifecycleState, 'active')
  instance.data.email = 'user@example.com'; instance.data.password = 'test-password'
  await instance.performDelete()
  assert.equal(instance.data.lifecycleState, 'deleting')
  assert.equal(instance.data.password, '')
  assert.equal(events.length, 0)
  assert.ok(!calls.includes('logout'))
})

test('closing account settings invalidates an in-flight lifecycle response', async () => {
  let finish
  const { instance } = loadComponent('components/account-settings/account-settings.js', {
    '../../utils/session': { getCurrentUser: () => ({ id: 'owner-a' }) },
    '../../utils/api': { formatError: e => e.message, gatewayRequest: () => new Promise(resolve => { finish = resolve }) },
  })
  instance.properties.show = true
  const pending = instance.refreshLifecycle()
  instance.close()
  finish({ code: 0, state: 'review_required' }); await pending
  assert.equal(instance.data.lifecycleState, '')
})
