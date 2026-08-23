const assert = require('node:assert/strict')
const { afterEach, test } = require('node:test')

const { toBusinessError } = require('../miniprogram/utils/business-errors.js')

const originalSetInterval = global.setInterval
const originalClearInterval = global.clearInterval

afterEach(() => {
  global.setInterval = originalSetInterval
  global.clearInterval = originalClearInterval
})

function loadAuthPanel(sessionOverrides = {}) {
  const panelPath = require.resolve('../miniprogram/components/auth-panel/auth-panel.js')
  const sessionPath = require.resolve('../miniprogram/utils/session.js')
  delete require.cache[panelPath]
  require.cache[sessionPath] = {
    id: sessionPath,
    filename: sessionPath,
    loaded: true,
    exports: {
      signIn: async () => ({ status: 'authenticated', user: { id: 'user-1' } }),
      signUp: async () => ({ status: 'verification-required', email: 'user@example.com' }),
      sendVerificationEmail: async () => undefined,
      requestPasswordReset: async () => undefined,
      ...sessionOverrides,
    },
  }
  let definition
  global.Component = (value) => { definition = value }
  require('../miniprogram/components/auth-panel/auth-panel.js')
  return definition
}

function createTimerHarness() {
  const callbacks = new Map()
  const cleared = []
  let nextId = 1
  global.setInterval = (callback) => {
    const id = nextId++
    callbacks.set(id, callback)
    return id
  }
  global.clearInterval = (id) => {
    callbacks.delete(id)
    cleared.push(id)
  }
  return {
    tick() {
      for (const callback of [...callbacks.values()]) callback()
    },
    activeCount() { return callbacks.size },
    cleared,
  }
}

function createInstance(definition, data = {}) {
  const events = []
  const instance = {
    ...definition.methods,
    data: { ...definition.data, ...data },
    properties: { show: true },
    setData(patch) { Object.assign(this.data, patch) },
    triggerEvent(name, detail) { events.push({ name, detail }) },
  }
  return { instance, events }
}

function installWx() {
  const toasts = []
  global.wx = {
    showLoading() {},
    hideLoading() {},
    showToast(options) { toasts.push(options) },
  }
  return toasts
}

test('sign-in authenticates, clears the password, and emits authed', async () => {
  installWx()
  const calls = []
  const definition = loadAuthPanel({
    signIn: async (email, password) => {
      calls.push({ email, password })
      return { status: 'authenticated', user: { id: 'user-1', email } }
    },
  })
  const { instance, events } = createInstance(definition, {
    authEmail: ' user@example.com ', authPassword: 'password-123', authCanSubmit: true,
  })

  await instance.submitAuth()

  assert.deepEqual(calls, [{ email: 'user@example.com', password: 'password-123' }])
  assert.equal(instance.data.authPassword, '')
  assert.equal(events.filter((event) => event.name === 'authed').length, 1)
})

test('EMAIL_NOT_VERIFIED enters pending verification without retaining a password or authenticating', async () => {
  installWx()
  const timers = createTimerHarness()
  const definition = loadAuthPanel({
    signIn: async () => { throw toBusinessError(403, { code: 'EMAIL_NOT_VERIFIED' }) },
  })
  const { instance, events } = createInstance(definition, {
    authEmail: 'user@example.com', authPassword: 'password-123', authCanSubmit: true,
  })

  await instance.submitAuth()

  assert.equal(instance.data.authMode, 'pending-verification')
  assert.equal(instance.data.authPassword, '')
  assert.equal(instance.data.authCooldownSeconds, 60)
  assert.equal(instance.data.authTitle, '验证你的邮箱')
  assert.equal(events.some((event) => event.name === 'authed'), false)
  assert.equal(timers.activeCount(), 1)
})

test('sign-up verification-required enters pending state and never emits authed', async () => {
  installWx()
  createTimerHarness()
  const definition = loadAuthPanel({
    signUp: async () => ({ status: 'verification-required', email: 'user@example.com' }),
  })
  const { instance, events } = createInstance(definition, {
    authMode: 'sign-up', authIsSignUp: true, authEmail: 'user@example.com',
    authPassword: 'password-123', authName: 'User', authCanSubmit: true,
  })

  await instance.submitAuth()

  assert.equal(instance.data.authMode, 'pending-verification')
  assert.equal(instance.data.authPassword, '')
  assert.equal(events.some((event) => event.name === 'authed'), false)
})

test('sign-up remains compatible with an authenticated result', async () => {
  installWx()
  const definition = loadAuthPanel({
    signUp: async () => ({ status: 'authenticated', user: { id: 'compat-user' } }),
  })
  const { instance, events } = createInstance(definition, {
    authMode: 'sign-up', authIsSignUp: true, authEmail: 'user@example.com',
    authPassword: 'password-123', authCanSubmit: true,
  })

  await instance.submitAuth()

  assert.equal(instance.data.authPassword, '')
  assert.deepEqual(events.find((event) => event.name === 'authed').detail, { user: { id: 'compat-user' } })
})

test('forgot-password accepts email only and always shows generic recovery guidance on success', async () => {
  installWx()
  const calls = []
  const definition = loadAuthPanel({ requestPasswordReset: async (email) => { calls.push(email) } })
  const { instance, events } = createInstance(definition, {
    authEmail: ' user@example.com ', authPassword: 'must-not-survive', authError: 'old error',
  })

  instance.showForgotPassword()
  assert.equal(instance.data.authPassword, '')
  instance.refreshAuthCanSubmit()
  assert.equal(instance.data.authCanSubmit, true)
  await instance.submitAuth()

  assert.deepEqual(calls, ['user@example.com'])
  assert.equal(instance.data.authMode, 'recovery-sent')
  assert.match(instance.data.authNote, /如该邮箱存在/)
  assert.match(instance.data.authNote, /1 小时/)
  assert.equal(events.some((event) => event.name === 'authed'), false)
})

test('unknown-email password reset success uses the same generic recovery state', async () => {
  installWx()
  const requestedEmails = []
  const definition = loadAuthPanel({
    requestPasswordReset: async (email) => { requestedEmails.push(email) },
  })
  const { instance, events } = createInstance(definition, {
    authMode: 'forgot-password', authEmail: 'unknown@example.com', authCanSubmit: true,
  })

  await instance.submitAuth()

  assert.deepEqual(requestedEmails, ['unknown@example.com'])
  assert.equal(instance.data.authMode, 'recovery-sent')
  assert.match(instance.data.authNote, /如该邮箱存在/)
  assert.equal(events.some((event) => event.name === 'authed'), false)
})

test('verification resend honors retry-after and exposes a disabled countdown', async () => {
  installWx()
  const timers = createTimerHarness()
  const definition = loadAuthPanel({
    sendVerificationEmail: async () => { throw toBusinessError(429, {}, { 'X-Retry-After': '3' }) },
  })
  const { instance } = createInstance(definition, {
    authMode: 'pending-verification', authEmail: 'user@example.com', authCooldownSeconds: 0,
  })

  await instance.resendVerification()

  assert.equal(instance.data.authCooldownSeconds, 3)
  assert.equal(instance.data.authResendDisabled, true)
  assert.match(instance.data.authError, /请求过于频繁/)
  timers.tick()
  assert.equal(instance.data.authCooldownSeconds, 2)
  timers.tick()
  timers.tick()
  assert.equal(instance.data.authCooldownSeconds, 0)
  assert.equal(instance.data.authResendDisabled, false)
  assert.equal(timers.activeCount(), 0)
})

test('mode changes, close, and detach clear secrets, messages, and timers', () => {
  installWx()
  const timers = createTimerHarness()
  const definition = loadAuthPanel()
  const { instance, events } = createInstance(definition, {
    authPassword: 'secret-password', authError: 'error', authStatus: 'status', authCooldownSeconds: 5,
  })
  instance.startAuthCooldown(5)

  instance.showSignUp()
  assert.equal(instance.data.authPassword, '')
  assert.equal(instance.data.authError, '')
  assert.equal(instance.data.authStatus, '')
  assert.equal(timers.activeCount(), 0)

  instance.setData({ authPassword: 'another-secret', authError: 'error', authStatus: 'status' })
  instance.close()
  assert.equal(instance.data.authPassword, '')
  assert.equal(instance.data.authError, '')
  assert.equal(instance.data.authStatus, '')
  assert.equal(events.at(-1).name, 'close')

  instance.setData({ authPassword: 'detached-secret' })
  definition.lifetimes.detached.call(instance)
  assert.equal(instance.data.authPassword, '')
})

test('closing the panel invalidates an in-flight authentication result', async () => {
  installWx()
  let resolveSignIn
  const definition = loadAuthPanel({
    signIn: () => new Promise((resolve) => { resolveSignIn = resolve }),
  })
  const { instance, events } = createInstance(definition, {
    authEmail: 'user@example.com', authPassword: 'password-123', authCanSubmit: true,
  })

  const submission = instance.submitAuth()
  instance.close()
  resolveSignIn({ status: 'authenticated', user: { id: 'late-user' } })
  await submission

  assert.equal(instance.data.authMode, 'sign-in')
  assert.equal(instance.data.authStatus, '')
  assert.equal(events.some((event) => event.name === 'authed'), false)
})

test('auth submit, close, and stale completion never use the global loading HUD', async () => {
  let showCalls = 0
  let hideCalls = 0
  global.wx = {
    showLoading() { showCalls++ },
    hideLoading() { hideCalls++ },
    showToast() {},
  }
  const pending = []
  const definition = loadAuthPanel({
    signIn: () => new Promise((resolve) => { pending.push(resolve) }),
  })
  const { instance } = createInstance(definition, {
    authEmail: 'first@example.com', authPassword: 'password-123', authCanSubmit: true,
  })

  const requestA = instance.submitAuth()
  instance.close()

  instance.setData({ authEmail: 'second@example.com', authPassword: 'password-456', authCanSubmit: true })
  const requestB = instance.submitAuth()
  pending[0]({ status: 'authenticated', user: { id: 'stale-user' } })
  await requestA

  pending[1]({ status: 'authenticated', user: { id: 'current-user' } })
  await requestB

  assert.equal(showCalls, 0)
  assert.equal(hideCalls, 0)
})
