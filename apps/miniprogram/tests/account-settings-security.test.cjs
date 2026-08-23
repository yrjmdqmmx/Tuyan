const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { afterEach, test } = require('node:test')

const { toBusinessError } = require('../miniprogram/utils/business-errors.js')

const originalSetInterval = global.setInterval
const originalClearInterval = global.clearInterval

afterEach(() => {
  global.setInterval = originalSetInterval
  global.clearInterval = originalClearInterval
})

function loadAccountSettings(sessionOverrides = {}) {
  const componentPath = require.resolve('../miniprogram/components/account-settings/account-settings.js')
  const sessionPath = require.resolve('../miniprogram/utils/session.js')
  delete require.cache[componentPath]
  require.cache[sessionPath] = {
    id: sessionPath,
    filename: sessionPath,
    loaded: true,
    exports: {
      signOut: async () => undefined,
      sendVerificationEmail: async () => undefined,
      changePassword: async () => undefined,
      ...sessionOverrides,
    },
  }
  let definition
  global.Component = (value) => { definition = value }
  require('../miniprogram/components/account-settings/account-settings.js')
  return definition
}

function createTimerHarness() {
  const callbacks = new Map()
  let nextId = 1
  global.setInterval = (callback) => {
    const id = nextId++
    callbacks.set(id, callback)
    return id
  }
  global.clearInterval = (id) => callbacks.delete(id)
  return {
    tick() { for (const callback of [...callbacks.values()]) callback() },
    activeCount() { return callbacks.size },
  }
}

function createInstance(definition, { data = {}, properties = {} } = {}) {
  const events = []
  const instance = {
    ...definition.methods,
    data: { ...definition.data, ...data },
    properties: { show: true, currentEmail: 'user@example.com', emailVerified: false, ...properties },
    setData(patch) { Object.assign(this.data, patch) },
    triggerEvent(name, detail) { events.push({ name, detail }) },
  }
  return { instance, events }
}

function installWx() {
  const toasts = []
  global.wx = {
    showToast(options) { toasts.push(options) },
    showModal() {},
    removeStorageSync() {},
  }
  return toasts
}

test('account security exposes verified state and parent wiring contracts', () => {
  const definition = loadAccountSettings()
  assert.equal(definition.properties.emailVerified.type, Boolean)
  assert.equal(definition.properties.emailVerified.value, false)

  const wxml = fs.readFileSync(path.join(__dirname, '../miniprogram/components/account-settings/account-settings.wxml'), 'utf8')
  const recordsWxml = fs.readFileSync(path.join(__dirname, '../miniprogram/pages/records/records.wxml'), 'utf8')
  assert.match(wxml, /已验证/)
  assert.match(wxml, /待验证/)
  assert.match(wxml, /wx:if="\{\{!emailVerified\}\}"/)
  assert.match(wxml, /changePasswordCooldownSeconds > 0/)
  assert.match(wxml, /disabled="\{\{changingPassword \|\| changePasswordCooldownSeconds > 0\}\}"/)
  assert.match(wxml, /password maxlength="128" value="\{\{currentPassword\}\}" placeholder="当前密码（8–128 位）"/)
  assert.match(recordsWxml, /email-verified="\{\{currentUserEmailVerified\}\}"/)
})

test('unverified account can resend and retry-after starts a visible cooldown', async () => {
  installWx()
  const timers = createTimerHarness()
  let attempts = 0
  const definition = loadAccountSettings({
    sendVerificationEmail: async () => {
      attempts++
      if (attempts === 1) throw toBusinessError(429, {}, { 'retry-after': '2' })
    },
  })
  const { instance } = createInstance(definition)

  await instance.resendVerification()
  assert.equal(instance.data.resendCooldownSeconds, 2)
  assert.equal(instance.data.resendDisabled, true)
  assert.match(instance.data.securityError, /请求过于频繁/)
  timers.tick()
  timers.tick()
  assert.equal(instance.data.resendDisabled, false)

  await instance.resendVerification()
  assert.equal(attempts, 2)
  assert.equal(instance.data.resendCooldownSeconds, 60)
  assert.match(instance.data.securityStatus, /验证邮件已发送/)
})

test('change-password validates required, 8/128 boundaries, and confirmation mismatch', async () => {
  installWx()
  const calls = []
  const definition = loadAccountSettings({ changePassword: async (...args) => { calls.push(args) } })
  const { instance } = createInstance(definition)

  await instance.submitChangePassword()
  assert.match(instance.data.changePasswordError, /当前密码/)

  instance.setData({ currentPassword: 'current-secret', newPassword: '1234567', confirmPassword: '1234567' })
  await instance.submitChangePassword()
  assert.match(instance.data.changePasswordError, /至少 8 位/)

  instance.setData({ newPassword: '12345678', confirmPassword: '87654321' })
  await instance.submitChangePassword()
  assert.match(instance.data.changePasswordError, /两次输入/)

  instance.setData({ newPassword: 'a'.repeat(129), confirmPassword: 'a'.repeat(129) })
  await instance.submitChangePassword()
  assert.match(instance.data.changePasswordError, /最多 128 位/)
  assert.equal(calls.length, 0)

  instance.setData({ newPassword: 'a'.repeat(8), confirmPassword: 'a'.repeat(8) })
  await instance.submitChangePassword()
  instance.setData({ currentPassword: 'current-secret', newPassword: 'b'.repeat(128), confirmPassword: 'b'.repeat(128) })
  await instance.submitChangePassword()
  assert.deepEqual(calls, [
    ['current-secret', 'a'.repeat(8)],
    ['current-secret', 'b'.repeat(128)],
  ])
})

test('change-password validates current password at 8 and 128 character boundaries', async () => {
  installWx()
  const calls = []
  const definition = loadAccountSettings({ changePassword: async (...args) => { calls.push(args) } })
  const { instance } = createInstance(definition, {
    data: { newPassword: 'new-secret-123', confirmPassword: 'new-secret-123' },
  })

  instance.setData({ currentPassword: 'a'.repeat(7) })
  await instance.submitChangePassword()
  assert.equal(instance.data.changePasswordError, '当前密码至少 8 位。')

  instance.setData({ currentPassword: 'a'.repeat(129) })
  await instance.submitChangePassword()
  assert.equal(instance.data.changePasswordError, '当前密码最多 128 位。')
  assert.equal(calls.length, 0)

  instance.setData({ currentPassword: 'a'.repeat(8) })
  await instance.submitChangePassword()
  instance.setData({ currentPassword: 'b'.repeat(128), newPassword: 'new-secret-123', confirmPassword: 'new-secret-123' })
  await instance.submitChangePassword()
  assert.deepEqual(calls, [
    ['a'.repeat(8), 'new-secret-123'],
    ['b'.repeat(128), 'new-secret-123'],
  ])
})

test('successful password change clears only change-password secrets and preserves delete flow state', async () => {
  const toasts = installWx()
  const definition = loadAccountSettings({ changePassword: async () => undefined })
  const { instance } = createInstance(definition, {
    data: {
      email: 'user@example.com', password: 'delete-secret', confirmed: true,
      currentPassword: 'current-secret', newPassword: 'new-secret-123', confirmPassword: 'new-secret-123',
    },
  })

  await instance.submitChangePassword()

  assert.equal(instance.data.currentPassword, '')
  assert.equal(instance.data.newPassword, '')
  assert.equal(instance.data.confirmPassword, '')
  assert.equal(instance.data.email, 'user@example.com')
  assert.equal(instance.data.password, 'delete-secret')
  assert.equal(instance.data.confirmed, true)
  assert.match(instance.data.securityStatus, /密码已更新/)
  assert.equal(toasts.some((toast) => toast.title === '密码已更新'), true)
})

test('change-password errors use stable auth mapping', async () => {
  installWx()
  const definition = loadAccountSettings({
    changePassword: async () => { throw toBusinessError(401, { code: 'INVALID_PASSWORD' }) },
  })
  const { instance } = createInstance(definition, {
    data: { currentPassword: 'wrong-current', newPassword: 'new-secret-123', confirmPassword: 'new-secret-123' },
  })

  await instance.submitChangePassword()

  assert.equal(instance.data.changePasswordError, '当前密码不正确。')
})

test('change-password 429 starts an independent cooldown and blocks repeat submission', async () => {
  installWx()
  const timers = createTimerHarness()
  let calls = 0
  const definition = loadAccountSettings({
    changePassword: async () => {
      calls++
      throw toBusinessError(429, {}, { 'retry-after': '4' })
    },
  })
  const { instance } = createInstance(definition, {
    data: { currentPassword: 'current-secret', newPassword: 'new-secret-123', confirmPassword: 'new-secret-123' },
  })

  await instance.submitChangePassword()

  assert.equal(calls, 1)
  assert.equal(instance.data.changePasswordCooldownSeconds, 4)
  assert.equal(instance.data.changePasswordCooldownDisabled, true)
  assert.equal(instance.data.resendCooldownSeconds, 0)
  assert.match(instance.data.changePasswordError, /请求过于频繁/)

  await instance.submitChangePassword()
  assert.equal(calls, 1)
  timers.tick()
  assert.equal(instance.data.changePasswordCooldownSeconds, 3)

  instance.reset()
  assert.equal(instance.data.changePasswordCooldownSeconds, 0)
  assert.equal(instance.data.changePasswordCooldownDisabled, false)
  assert.equal(instance.data.currentPassword, '')
  assert.equal(instance.data.newPassword, '')
  assert.equal(instance.data.confirmPassword, '')
  assert.equal(timers.activeCount(), 0)
})

test('reset, close, and detach clear both password domains and cooldown timers', () => {
  installWx()
  const timers = createTimerHarness()
  const definition = loadAccountSettings()
  const { instance, events } = createInstance(definition, {
    data: {
      password: 'delete-secret', currentPassword: 'current-secret', newPassword: 'new-secret',
      confirmPassword: 'new-secret', error: 'delete error', securityError: 'security error',
    },
  })
  instance.startResendCooldown(10)
  assert.equal(timers.activeCount(), 1)

  instance.close()
  assert.equal(instance.data.password, '')
  assert.equal(instance.data.currentPassword, '')
  assert.equal(instance.data.newPassword, '')
  assert.equal(instance.data.confirmPassword, '')
  assert.equal(timers.activeCount(), 0)
  assert.equal(events.at(-1).name, 'close')

  instance.setData({ password: 'delete-secret', currentPassword: 'current-secret' })
  definition.lifetimes.detached.call(instance)
  assert.equal(instance.data.password, '')
  assert.equal(instance.data.currentPassword, '')
})

test('closing account settings invalidates an in-flight password change result', async () => {
  installWx()
  let resolveChange
  const definition = loadAccountSettings({
    changePassword: () => new Promise((resolve) => { resolveChange = resolve }),
  })
  const { instance } = createInstance(definition, {
    data: { currentPassword: 'current-secret', newPassword: 'new-secret-123', confirmPassword: 'new-secret-123' },
  })

  const submission = instance.submitChangePassword()
  instance.close()
  resolveChange()
  await submission

  assert.equal(instance.data.currentPassword, '')
  assert.equal(instance.data.securityStatus, '')
})
