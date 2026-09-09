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

test('mini account lists all orders, queries the selected order and blocks uncertain duplicate creation', async () => {
  const calls = [];
  const f = pageFixture(async body => {
    calls.push(body);
    if (body.action === 'tokenDancePayments') return { payments: [
      { attemptId: 'one', amount: 10, state: 'paid', session: { amount: 10, status: 'paid' } },
      { attemptId: 'two', amount: 20, state: 'unknown' },
    ] };
    if (body.action === 'tokenDancePaymentStatus') return { session: { amount: 10, status: 'refunded' } };
    throw new Error('unexpected request');
  });
  await f.page.recentPayments();
  assert.equal(f.page.data.payments.length, 2);
  await f.page.createPayment();
  assert.equal(calls.some(body => body.action === 'tokenDancePaymentCreate'), false);
  await f.page.queryHistoryPayment({ currentTarget: { dataset: { attemptId: 'one' } } });
  assert.equal(calls.at(-1).attemptId, 'one');
  assert.equal(f.page.data.payments[0].statusText, '已退款');
  assert.equal(f.page.data.payments[1].state, 'unknown');
  f.close();
});

function componentFrom(file, mocks, extra = {}) {
  let definition
  const filename = require.resolve(file)
  const localRequire = require('node:module').createRequire(filename)
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
    exports: {}, Component(value) { definition = value },
    require(name) { const key = name.split('/').at(-1); return mocks[key] || localRequire(name) },
    ...extra,
  })
  const page = { data: { ...definition.data }, setData(value) { Object.assign(this.data, value) } }
  for (const [name, method] of Object.entries(definition.methods)) page[name] = method.bind(page)
  return { page, definition }
}

test('mini failed-job recovery counts down, rejects an early tap, refreshes after returning and resumes once eligible', async () => {
  let time = Date.now(), serial = 0, resumes = 0, polls = 0
  const timers = new Map()
  const f = componentFrom('../miniprogram/pages/job-detail/job-detail.js', {
    api: { formatError: error => error.message, requestJson: async body => { assert.equal(body.action, 'tokenDanceResume'); resumes++; return { jobId: 'original-job' } } },
    tokendance: { openTokenDance() {} },
  }, { Date: class extends Date { static now() { return time } }, setInterval(fn) { timers.set(++serial, fn); return serial }, clearInterval(id) { timers.delete(id) } })
  f.page.data.jobId = 'original-job'
  f.page.data.job = { status: 'failed', recovery: { canResume: true, retryAt: new Date(time + 5000).toISOString() } }
  f.page.startPolling = () => { polls++ }
  f.page.startRecoveryCountdown()
  assert.equal(f.page.data.retrySeconds, 5)
  await f.page.resumeJob()
  assert.equal(resumes, 0); assert.match(f.page.data.error, /5 秒/)
  f.definition.pageLifetimes.hide.call(f.page); assert.equal(timers.size, 0)
  time += 2000
  f.definition.pageLifetimes.show.call(f.page); assert.equal(f.page.data.retrySeconds, 3)
  time += 3000
  for (const tick of [...timers.values()]) tick()
  assert.equal(f.page.data.retrySeconds, 0); assert.equal(timers.size, 0)
  await f.page.resumeJob()
  assert.equal(resumes, 1); assert.equal(polls, 1); assert.equal(f.page.data.error, '')
  f.definition.lifetimes.detached.call(f.page)
  assert.equal(timers.size, 0)
})

test('mini generation and refinement use the API optimizedText contract and preserve cancelled or changed inputs', async () => {
  for (const [name, field, target] of [['index', 'methodContent', 'methodContent'], ['refine', 'instruction', 'editInstruction']]) {
    const calls = [], modals = [], exports = {}
    let response = { target, optimizedText: '优化后的科研说明' }
    const api = { formatError: error => error.message, requestJson: async body => { calls.push(body); return body.action === 'tokenDanceStatus' ? { connected: true } : response } }
    vm.runInNewContext(fs.readFileSync(require.resolve('../miniprogram/utils/tokendance.js'), 'utf8'), {
      exports, require: key => key === './api' ? api : { getCurrentUser: () => ({ id: 'mini-owner' }), subscribeSession() {} },
    })
    await exports.refreshTokenDanceConnection()
    const { page } = componentFrom(`../miniprogram/pages/${name}/${name}.js`, {
      api, tokendance: exports, 'api-keys': { getApiKeys: () => ({ tokendance: 'must-not-send' }) },
    }, { wx: { showModal(modal) { modals.push(modal) } } })
    page.refreshCanSubmit = () => {}
    page.data.settings = { modelRoutes: { main: { accessProvider: 'tokendance', modelId: 'qwen3.8-flash' } } }
    for (const decision of ['adopt', 'cancel', 'changed']) {
      page.data[field] = '原始科研说明'
      await page.optimizeDescription()
      const modal = modals.at(-1)
      assert.equal(modal.content, response.optimizedText)
      assert.equal(calls.at(-1).target, target); assert.equal(calls.at(-1).apiKey, undefined)
      if (decision === 'changed') page.data[field] = '正在编辑的科研说明'
      modal.success({ confirm: decision !== 'cancel' })
      assert.equal(page.data[field], decision === 'adopt' ? response.optimizedText : decision === 'cancel' ? '原始科研说明' : '正在编辑的科研说明')
    }
    response = { candidate: 'obsolete field' }
    const before = modals.length
    await page.optimizeDescription()
    assert.equal(modals.length, before); assert.match(page.data.error, /优化结果为空/)
    assert.equal(page.data[field], '正在编辑的科研说明')
  }
})
