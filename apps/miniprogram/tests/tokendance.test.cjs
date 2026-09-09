const assert = require('node:assert/strict')
const test = require('node:test')
const fs = require('node:fs')
const vm = require('node:vm')
const { scopedApiKeysForRoles, requiredCreateRouteRoles } = require('../miniprogram/utils/model-routing.js')

function pageFixture(request) {
  let definition, user = { id: 'mini-owner' }, onSession, interval
  const clipboard = []
  vm.runInNewContext(fs.readFileSync(require.resolve('../miniprogram/pages/tokendance/tokendance.js'), 'utf8'), {
    exports: {}, Component(value) { definition = value },
    require(name) {
      if (name.endsWith('/api')) return { formatError: error => error.message, requestJson: request }
      if (name.endsWith('/session')) return { getCurrentUser: () => user, subscribeSession(callback) { onSession = callback; return () => {} } }
      if (name.endsWith('/tokendance')) return { refreshTokenDanceConnection: async () => ({ connected: Boolean(user) }) }
      throw new Error(name)
    },
    wx: { setClipboardData({ data }) { clipboard.push(data) } },
    setInterval(callback) { interval = callback; return 1 }, clearInterval() { interval = null }, Date, Math, Promise, Error,
  })
  const page = { data: { ...definition.data }, setData(value) { Object.assign(this.data, value) } }
  for (const [name, method] of Object.entries(definition.methods)) page[name] = method.bind(page)
  definition.lifetimes.attached.call(page); definition.pageLifetimes.show.call(page)
  return { page, clipboard, tick: () => interval?.(), logout() { user = null; onSession() }, close() { definition.lifetimes.detached.call(page) } }
}

test('mini uses headless PKCE flow and clears the one-use code before exchange', async () => {
  const calls = []
  const f = pageFixture(async body => { calls.push(body); if (body.action === 'tokenDanceAuthorize') return { state: 'fixture-state', authorizationUrl: 'https://tokendance.space/auth?fixture' }; assert.equal(f.page.data.code, ''); return { connected: true } })
  await f.page.authorize()
  assert.equal(calls[0].platform, 'miniprogram')
  assert.equal(f.clipboard[0], 'https://tokendance.space/auth?fixture')
  f.page.codeInput({ detail: { value: 'one-use-fixture' } })
  await f.page.exchange()
  assert.equal(calls[1].code, 'one-use-fixture'); assert.equal(f.page.data.code, '')
  f.close()
})

test('mini rejects fractional yuan and drops a payment reply after logout', async () => {
  let resolve, count = 0
  const f = pageFixture(() => { count++; return new Promise(done => { resolve = done }) })
  f.page.data.amount = '1.5'; await f.page.createPayment(); assert.equal(count, 0)
  f.page.data.amount = '10'; const pending = f.page.createPayment()
  f.logout(); resolve({ session: { status: 'pending', amount: 10 } }); await pending
  assert.equal(f.page.data.payment, null); assert.equal(f.page.data.connected, false)
  f.close()
})

test('mini payment polling never overlaps and server-owned TD keys are omitted from generation payloads', async () => {
  let finish, calls = 0
  const f = pageFixture(() => { calls++; return new Promise(resolve => { finish = resolve }) })
  f.page.data.attemptId = 'fixture-attempt'; f.page.data.payment = { status: 'pending', expired_at: Date.now() / 1000 + 600 }
  f.page.pollPayment(); const first = f.page.paymentStatus(); await f.page.paymentStatus(); f.tick()
  assert.equal(calls, 1)
  finish({ session: { status: 'closed' } }); await first; f.close()
  const routes = { main: { accessProvider: 'tokendance' }, image: { accessProvider: 'tokendance' }, vision: { accessProvider: 'openai' } }
  assert.deepEqual(scopedApiKeysForRoles(routes, ['main', 'image', 'vision'], { tokendance: 'must-not-send', openai: 'fixture-openai' }), { openai: 'fixture-openai' })
  assert.deepEqual(requiredCreateRouteRoles({ taskName: 'plot', imageSize: '3K', imageRefineMode: 'direct-edit' }, 0), ['main', 'image'])
})
