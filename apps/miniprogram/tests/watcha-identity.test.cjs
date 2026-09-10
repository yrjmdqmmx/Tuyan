const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const { loadComponent } = require('./helpers/component.cjs')
const { EMPTY_WATCHA, watchaLaunchUrl } = require('../miniprogram/utils/watcha.js')
const supported = { ...EMPTY_WATCHA, available: true, miniProgramSupported: true }

function pageFixture(request, initialUser = null) {
  let user = initialUser, listener
  const calls = [], clipboard = []
  const f = loadComponent('pages/watcha/watcha.js', {
    '../../utils/watcha': { EMPTY_WATCHA, watchaLaunchUrl, watchaRequest: async (action, body, valid) => { calls.push({ action, body }); return request(action, body, valid) } },
    '../../utils/session': { getCurrentUser: () => user, subscribeSession(fn) { listener = fn; return () => {} }, refreshSession: async () => user,
      requestPasswordReset: async () => {}, sendVerificationEmail: async () => {} },
  }, { wx: { setClipboardData(o) { clipboard.push(o.data) }, showToast() {} }, setInterval: () => 1, clearInterval() {} })
  f.definition.lifetimes.attached.call(f.instance)
  return { ...f, calls, clipboard, switchUser(next) { user = next; listener(next) } }
}

test('Watcha launch links accept only the gateway handoff route and opaque state', () => {
  const url = 'https://api.paperbanana.asia/api/auth/watcha/mini-launch?state=' + 'A'.repeat(43)
  assert.equal(watchaLaunchUrl(url), url)
  for (const input of [url + '&next=evil', url.replace('api.paperbanana.asia', 'evil.test'), url.replace('https:', 'http:'), url + '#x', 'https://watcha.cn/oauth/authorize']) assert.throws(() => watchaLaunchUrl(input))
})

test('native initiation is unavailable on old gateways and drops a response after A-B-A account switching', async () => {
  let finish
  const f = pageFixture(() => new Promise(resolve => { finish = resolve }))
  await f.instance.start(); assert.equal(f.calls.length, 0)
  f.instance.data.status = supported
  const pending = f.instance.start()
  f.switchUser({ id: 'other', email: 'other@example.test' }); f.switchUser(null)
  finish({ url: 'https://api.paperbanana.asia/api/auth/watcha/mini-launch?state=' + 'A'.repeat(43), expiresAt: Date.now() + 60000 })
  await pending; assert.equal(f.clipboard.length, 0); assert.equal(f.instance.data.awaitingCode, false)
})

test('one-use code stays outside view state, clears before exchange and cannot submit twice', async () => {
  let finish, seenCode
  const f = pageFixture((action, body) => {
    if (action === 'mini-exchange') { seenCode = body.code; assert.equal(f.instance.oneUseCode, ''); return new Promise(resolve => { finish = resolve }) }
    return supported
  })
  f.instance.data.status = supported; f.instance.data.awaitingCode = true
  f.instance.codeInput({ detail: { value: 'B'.repeat(43) } })
  assert.equal(f.instance.data.code, ''); assert.equal(JSON.stringify(f.patches).includes('B'.repeat(43)), false)
  const pending = f.instance.exchange(); await f.instance.exchange()
  assert.equal(f.calls.filter(c => c.action === 'mini-exchange').length, 1); assert.equal(seenCode, 'B'.repeat(43))
  finish({ ok: true, status: 'pending' }); await pending
  assert.equal(f.instance.data.awaitingCode, false)
})

test('pending existing identity is explicitly linked, and last login method cannot be unlinked', async () => {
  const f = pageFixture(async () => ({ ...supported, linked: true, hasPassword: false }), { id: 'owner', email: 'owner@example.test' })
  f.instance.data.status = { ...supported, pending: { nickname: 'Fixture' }, emailVerified: true }
  await f.instance.link(); assert.equal(f.calls[0].action, 'link'); assert.match(f.instance.data.notice, /原账号/)
  f.instance.showUnlink(); assert.equal(f.instance.data.unlinking, false)
  await f.instance.unlink(); assert.equal(f.calls.filter(c => c.action === 'unlink').length, 0)
})

test('email code is purpose-bound, clears on email edits and only sent once during cooldown', async () => {
  const f = pageFixture(async () => ({ ok: true }))
  f.instance.emailInput({ detail: { value: 'new@example.test' } })
  f.instance.mailCodeInput({ detail: { value: '123456' } })
  assert.equal(f.instance.data.mailCode, ''); assert.equal(f.instance.data.hasMailCode, true)
  f.instance.emailInput({ detail: { value: 'next@example.test' } }); assert.equal(f.instance.emailCode, '')
  await f.instance.sendCode(); await f.instance.sendCode()
  assert.equal(f.calls.length, 1); assert.equal(f.calls[0].body.purpose, 'signup'); assert.equal(f.calls[0].body.email, 'next@example.test')
  assert.equal(f.instance.data.cooldown, 60)
})

test('late authentication response cannot replace cookies after cancellation or owner change', async () => {
  let request, active = true; const storage = new Map([['paperbanana_auth_cookie', 'session=current']])
  const exports = {}
  vm.runInNewContext(fs.readFileSync(require.resolve('../miniprogram/utils/api.js'), 'utf8'), {
    exports, require(name) { return require(require.resolve(name, { paths: [require('node:path').dirname(require.resolve('../miniprogram/utils/api.js'))] })) },
    wx: { request(o) { request = o }, getStorageSync: k => storage.get(k), setStorageSync: (k, v) => storage.set(k, v), removeStorageSync: k => storage.delete(k) },
  })
  const pending = exports.authRequest('/watcha/mini-exchange', 'POST', { code: 'fixture' }, { isCurrent: () => active })
  active = false
  request.success({ statusCode: 200, data: { ok: true }, header: { 'set-cookie': 'session=stale' } })
  await assert.rejects(pending, /账号或操作已变化/)
  assert.equal(storage.get('paperbanana_auth_cookie'), 'session=current')
})

test('passwordless deletion exchanges email proof before deletion and drops confirmation after owner changes', async () => {
  let user = { id: 'owner' }, finish, listener
  const calls = []
  const f = loadComponent('components/account-settings/account-settings.js', {
    '../../utils/watcha': { watchaRequest: (action, body) => { calls.push({ action, body }); return new Promise(resolve => { finish = resolve }) } },
    '../../utils/session': { getCurrentUser: () => user, subscribeSession(fn) { listener = fn; return () => {} }, signOut: async () => {} },
    '../../utils/api': { gatewayRequest: async (...args) => { calls.push(args); return { code: 0, ok: true } }, formatError: e => e.message },
  }, { wx: {}, clearInterval() {} })
  f.definition.lifetimes.attached.call(f.instance)
  Object.assign(f.instance.data, { statusLoaded: true, lifecycleState: 'active', passwordless: true, email: 'owner@example.test' })
  f.instance.deletionProofCode = '123456'
  const pending = f.instance.performDelete()
  assert.equal(calls[0].action, 'delete-confirmation'); assert.equal(f.instance.deletionProofCode, '')
  user = { id: 'other' }; listener(user); user = { id: 'owner' }; listener(user)
  finish({ confirmationToken: 'C'.repeat(43) }); await pending
  assert.equal(calls.length, 1, 'no delete request after account changed')
})
