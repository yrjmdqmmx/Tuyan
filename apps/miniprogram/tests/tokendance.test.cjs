const assert = require('node:assert/strict')
const test = require('node:test')
const fs = require('node:fs')
const vm = require('node:vm')
const { scopedApiKeysForRoles, requiredCreateRouteRoles } = require('../miniprogram/utils/model-routing.js')

function connectionFixture() {
  let user = { id: 'owner-a' }
  const listeners = new Set(), requests = [], service = {}
  const session = { getCurrentUser: () => user, subscribeSession(fn) { listeners.add(fn); return () => listeners.delete(fn) } }
  vm.runInNewContext(fs.readFileSync(require.resolve('../miniprogram/utils/tokendance.js'), 'utf8'), {
    exports: service,
    require(name) {
      if (name === './session') return session
      if (name === './api') return { formatError: error => error.message, requestJson: body => new Promise((resolve, reject) => requests.push({ body, resolve, reject })) }
      throw new Error(name)
    },
  })
  return { service, session, requests, switchUser(id) { user = id ? { id } : null; for (const fn of listeners) fn(user) } }
}

test('connection refresh shares concurrent requests and keeps confirmed display state only until the next result', async () => {
  const f = connectionFixture(), s = f.service
  assert.equal(s.getTokenDanceConnectionStatus(), null)
  const first = s.refreshTokenDanceConnection(), concurrent = s.refreshTokenDanceConnection()
  assert.equal(f.requests.length, 1)
  f.requests[0].resolve({ connected: true, available: true }); await Promise.all([first, concurrent])
  assert.equal(s.hasTokenDanceConnection(), true)
  const snapshot = s.getTokenDanceConnectionStatus(); snapshot.connected = false
  assert.equal(s.getTokenDanceConnectionStatus().connected, true)
  const background = s.refreshTokenDanceConnection()
  assert.equal(f.requests.length, 2); assert.equal(s.getTokenDanceConnectionStatus().connected, true)
  f.requests[1].reject(new Error('temporary network error'))
  assert.match((await background).error, /network/)
  assert.equal(s.getTokenDanceConnectionStatus(), null); assert.equal(s.hasTokenDanceConnection(), false)
  const retry = s.refreshTokenDanceConnection()
  f.requests[2].resolve({ connected: false, available: true }); await retry
  assert.equal(s.getTokenDanceConnectionStatus().connected, false)
})

test('connection invalidation and A-B-A account changes reject late successful status replies', async () => {
  for (const invalidate of ['disconnect-or-exchange', 'account-switch']) {
    const f = connectionFixture(), s = f.service
    const old = s.refreshTokenDanceConnection()
    if (invalidate === 'account-switch') { f.switchUser('owner-b'); f.switchUser('owner-a') }
    else s.invalidateTokenDanceConnection()
    const fresh = s.refreshTokenDanceConnection()
    assert.equal(f.requests.length, 2)
    f.requests[1].resolve({ connected: false, available: true }); await fresh
    f.requests[0].resolve({ connected: true, available: true }); await old
    assert.equal(s.hasTokenDanceConnection(), false); assert.equal(s.getTokenDanceConnectionStatus().connected, false)
    f.switchUser(null); assert.equal(s.getTokenDanceConnectionStatus(), null)
  }
})

test('account re-entry renders a confirmed connection during refresh, distinguishes failure and clears it on logout', async () => {
  const f = connectionFixture(), s = f.service
  const initial = s.refreshTokenDanceConnection()
  f.requests[0].resolve({ connected: true, available: true }); await initial
  const { loadComponent } = require('./helpers/component.cjs')
  const c = loadComponent('pages/tokendance/tokendance.js', { '../../utils/session': f.session, '../../utils/tokendance': s })
  const p = c.instance; c.definition.lifetimes.attached.call(p)
  const background = p.refresh()
  assert.equal(p.data.connected, true); assert.equal(p.data.statusLoading, false)
  f.requests[1].reject(new Error('temporary network error')); await background
  assert.equal(p.data.connected, false); assert.equal(p.data.statusFailed, true); assert.equal(p.data.statusLoading, false)
  const retry = p.refresh(); assert.equal(p.data.statusLoading, true)
  f.requests[2].resolve({ connected: false, available: true }); await retry
  assert.equal(p.data.statusFailed, false); assert.equal(p.data.connected, false)
  const revisit = p.refresh(); assert.equal(p.data.statusLoading, false)
  f.switchUser(null)
  f.requests[3].resolve({ connected: true, available: true }); await revisit
  assert.equal(p.data.connected, false); assert.equal(p.data.statusLoading, false)
  c.definition.lifetimes.detached.call(p)
})

test('a background status response cannot undo a completed disconnect or turn it into a query error', async () => {
  const f = connectionFixture(), s = f.service
  const initial = s.refreshTokenDanceConnection()
  f.requests[0].resolve({ connected: true, available: true }); await initial
  const { loadComponent } = require('./helpers/component.cjs')
  const c = loadComponent('pages/tokendance/tokendance.js', {
    '../../utils/session': f.session, '../../utils/tokendance': s,
    '../../utils/api': { formatError: error => error.message, requestJson: async body => { assert.equal(body.action, 'tokenDanceDisconnect'); return {} } },
  }, { wx: { showModal: options => options.success({ confirm: true }) } })
  const p = c.instance; c.definition.lifetimes.attached.call(p)
  const background = p.refresh(); await p.disconnect()
  f.requests[1].resolve({ connected: true, available: true }); await background
  assert.equal(p.data.connected, false); assert.equal(p.data.statusFailed, false)
  assert.equal(p.data.error, ''); assert.match(p.data.notice, /已解除/)
  assert.equal(s.hasTokenDanceConnection(), false)
  c.definition.lifetimes.detached.call(p)
})

function pageFixture(request) {
  let definition, user = { id: 'mini-owner' }, onSession, interval
  const clipboard = []
  vm.runInNewContext(fs.readFileSync(require.resolve('../miniprogram/pages/tokendance/tokendance.js'), 'utf8'), {
    exports: {}, Component(value) { definition = value },
    require(name) {
      if (name.endsWith('/api')) return { formatError: error => error.message, requestJson: request }
      if (name.endsWith('/session')) return { getCurrentUser: () => user, subscribeSession(callback) { onSession = callback; return () => {} } }
      if (name.endsWith('/tokendance')) return { getTokenDanceConnectionStatus: () => null, refreshTokenDanceConnection: async () => ({ connected: Boolean(user) }), invalidateTokenDanceConnection() {}, returnFromTokenDance() {} }
      throw new Error(name)
    },
    wx: { setClipboardData({ data }) { clipboard.push(data) } },
    setInterval(callback) { interval = callback; return 1 }, clearInterval() { interval = null }, Date, Math, Promise, Error,
  })
  const page = { data: { ...definition.data }, setData(value) { Object.assign(this.data, value) } }
  for (const [name, method] of Object.entries(definition.methods)) page[name] = method.bind(page)
  definition.lifetimes.attached.call(page); definition.pageLifetimes.show.call(page)
  return { page, clipboard, tick: () => interval?.(), switchUser(id) { user = id ? { id } : null; onSession(user) }, logout() { user = null; onSession(user) }, close() { definition.lifetimes.detached.call(page) } }
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
  f.page.startPolling = () => { polls++ }; let reloads = 0; f.page.loadJob = async () => { reloads++ }
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
  assert.equal(reloads, 1); assert.equal(resumes, 1); assert.equal(polls, 1); assert.equal(f.page.data.error, '')
  f.definition.lifetimes.detached.call(f.page)
  assert.equal(timers.size, 0)
})

test('mini resumes new provider jobs through their original task without a TokenDance connection', async () => {
  for (const channel of ['custom', 'runware', 'tokenhub', 'xiaomi', 'fal', 'replicate', 'tokendance', undefined]) {
    const requests = []
    const f = componentFrom('../miniprogram/pages/job-detail/job-detail.js', {
      api: { formatError: error => error.message, requestJson: async body => { requests.push(body); return { jobId: 'original-job' } } },
      tokendance: { openTokenDance() { throw new Error('unrelated authorization must not open') } },
    }, { setInterval() { throw new Error('no retry delay') }, clearInterval() {} })
    f.page.data.jobId = 'original-job'
    f.page.data.job = { status: 'failed', recovery: { channel, canResume: true } }
    let polls = 0
    f.page.startPolling = () => { polls++ }
    await f.page.resumeJob()
    assert.equal(requests.length, 1, channel)
    assert.equal(requests[0].jobId, 'original-job', channel)
    assert.equal(requests[0].action, !channel || channel === 'tokendance' ? 'tokenDanceResume' : 'providerResume', channel)
    assert.equal(polls, 1, channel)
    assert.equal(f.page.data.error, '', channel)
  }
})

test('mini blocks submit and repeat selection while original image dimensions are pending', async () => {
  let media, info, chooserCount = 0, requests = 0
  const { page } = componentFrom('../miniprogram/pages/index/index.js', {
    api: { requestJson:async()=>{requests++;throw new Error('must not submit')},formatError:error=>error.message },
    'api-keys': {getApiKeys:()=>({bailian:'fixture-key'})},
  }, {wx:{chooseMedia(options){chooserCount++;media=options},getImageInfo(options){info=options}}})
  page.data.registryReady=true
  page.data.methodContent='A scientific method with enough text for a generation request.'
  page.data.caption='Scientific figure'
  page.data.settings={configurationMode:'simple',outputFormat:'png',imageSize:'2K',pipelineMode:'vanilla',retrievalSetting:'none',maxCriticRounds:0,modelRoutes:{main:{accessProvider:'bailian',modelId:'qwen3.8-flash'},image:{accessProvider:'bailian',modelId:'qwen-image-2.0'},vision:{accessProvider:'bailian',modelId:'qwen3.8-flash'}}}
  page.data.referenceModeCanSubmit=true
  page.activeReferencePolicy=()=>({platform:{maxCount:8,maxBytes:20971520}})
  page.refreshReferenceModeState=()=>{}
  page.refreshRetrievalState=()=>{}
  page.refreshCanSubmit();assert.equal(page.data.canSubmit,true)
  page.chooseReferenceImages()
  const inspecting=media.success({tempFiles:[{tempFilePath:'/tmp/figure.png',size:20971520}]})
  assert.equal(page.data.isInspectingReferences,true);assert.equal(page.data.canSubmit,false)
  page.chooseReferenceImages();page.chooseReferenceSvgFile();page.chooseReferenceFile()
  assert.equal(chooserCount,1)
  page.data.canSubmit=true // the handler also guards stale view state
  await page.submitJob();assert.equal(requests,0)
  info.success({width:3200,height:2000});await inspecting
  assert.equal(page.data.isInspectingReferences,false);assert.equal(page.data.referenceImages.length,1);assert.equal(page.data.canSubmit,true)
  page.chooseReferenceImages()
  const failed=media.success({tempFiles:[{tempFilePath:'/tmp/broken.png',size:10}]})
  info.fail(new Error('invalid'));await failed
  assert.equal(page.data.isInspectingReferences,false);assert.equal(page.data.referenceImages.length,1)
  assert.match(page.data.referenceUploadError,/无法读取/)
})


test('account A-B-A, detached and selected-order changes discard late replies', async () => {
  for (const change of ['switch', 'detach', 'selection']) {
    let finish
    const f = pageFixture(() => new Promise(resolve => { finish = resolve }))
    f.page.data.attemptId = 'first'; f.page.data.payment = { status: 'pending' }
    const pending = f.page.paymentStatus()
    if (change === 'switch') { f.switchUser('other'); f.switchUser('mini-owner') }
    if (change === 'detach') f.close()
    if (change === 'selection') { f.page.data.attemptId = 'second'; f.page.data.payment = { status: 'closed' } }
    finish({ session: { status: 'refunded' } }); await pending
    assert.notEqual(f.page.data.payment?.status, 'refunded')
    f.close()
  }
})
test('one-use codes stay out of view data and are cleared on hide; uncertain creation blocks a retry', async () => {
  let creates = 0
  const f = pageFixture(async body => {
    if (body.action === 'tokenDancePaymentCreate') { creates++; throw new Error('timeout') }
    return { state: 'fixture', authorizationUrl: 'https://tokendance.space/auth' }
  })
  await f.page.authorize(); f.page.codeInput({ detail: { value: 'private-one-use-code' } })
  assert.ok(!JSON.stringify(f.page.data).includes('private-one-use-code'))
  f.page.data.busy = false
  await f.page.createPayment(); await f.page.createPayment()
  assert.equal(creates, 1); assert.equal(f.page.data.paymentUncertain, true)
  f.close(); assert.equal(f.page.oneUseCode, '')
})

test('definite payment rejection permits retry while uncertain server failures remain locked', async () => {
  const { toBusinessError } = require('../miniprogram/utils/business-errors.js')
  for (const failure of [
    toBusinessError(401, { recoveryAction: 'reauthorize_api_key' }),
    toBusinessError(429, { recoveryAction: 'rate_limit' }),
    toBusinessError(409, { uncertain: true }),
    toBusinessError(503, { uncertain: false }),
    toBusinessError(408, {}),
  ]) {
    let creates = 0
    const f = pageFixture(async body => {
      if (body.action === 'tokenDancePaymentCreate') { creates++; if (creates === 1) throw failure; return { session: { status: 'closed' } } }
      return {}
    })
    await f.page.createPayment()
    const uncertain = failure.uncertain || failure.httpStatus >= 500 || failure.httpStatus === 408
    assert.equal(f.page.data.paymentUncertain, uncertain)
    if (!uncertain) assert.equal(f.page.data.uncertainAttemptId, '')
    await f.page.createPayment()
    assert.equal(creates, uncertain ? 1 : 2)
    f.close()
  }
})

test('returning to account from its reopened job detail pops the native stack and keeps the original task', () => {
  const exports = {}, navigation = []
  let pages = [{ route: 'pages/tokendance/tokendance' }, { route: 'pages/job-detail/job-detail', options: { jobId: 'original-job' } }]
  vm.runInNewContext(fs.readFileSync(require.resolve('../miniprogram/utils/tokendance.js'), 'utf8'), { exports,
    require: name => name === './api' ? {} : { getCurrentUser: () => ({ id: 'owner' }), subscribeSession() {} },
    getCurrentPages: () => pages,
    wx: { navigateBack: args => navigation.push(['back', args.delta]), navigateTo: args => navigation.push(['to', args.url]), switchTab: args => { navigation.push(['tab', args.url]); args.success?.() } },
  })
  exports.openTokenDance(); assert.deepEqual(navigation[0], ['back', 1])
  pages = [pages[0]]; exports.returnFromTokenDance()
  assert.deepEqual(navigation[1], ['tab', '/pages/records/records']); assert.deepEqual(navigation[2], ['to', '/pages/job-detail/job-detail?jobId=original-job'])
})


test('TD throttling and uncertain errors retain recovery guidance instead of generic capacity failures', () => {
  const { toBusinessError, businessErrorGuidance } = require('../miniprogram/utils/business-errors.js')
  const limited = toBusinessError(429, { error: 'rate limited', recoveryAction: 'rate_limit', retryAfterSeconds: 7 })
  assert.equal(limited.retryAfterSeconds, 7); assert.match(businessErrorGuidance(limited).message, /等待后恢复原任务/)
  const uncertain = toBusinessError(503, { recoveryAction: 'retry_request', uncertain: true })
  assert.match(businessErrorGuidance(uncertain).message, /尚未确认/)
})
