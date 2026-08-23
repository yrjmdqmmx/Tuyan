const assert = require('node:assert/strict')

function loadAuthPanel({ signIn, signUp }) {
  const panelPath = require.resolve('../miniprogram/components/auth-panel/auth-panel.js')
  const apiPath = require.resolve('../miniprogram/utils/api.js')
  const sessionPath = require.resolve('../miniprogram/utils/session.js')
  delete require.cache[panelPath]
  require.cache[apiPath] = { id: apiPath, filename: apiPath, loaded: true, exports: { formatError: (error) => String(error) } }
  require.cache[sessionPath] = { id: sessionPath, filename: sessionPath, loaded: true, exports: { signIn, signUp } }
  let definition
  global.Component = (value) => { definition = value }
  require('../miniprogram/components/auth-panel/auth-panel.js')
  return definition
}

async function main() {
  const toastCalls = []
  global.wx = {
    showLoading() {},
    hideLoading() {},
    showToast(options) { toastCalls.push(options) },
  }
  const definition = loadAuthPanel({
    signIn: async () => ({ status: 'authenticated', user: { id: 'user-1' } }),
    signUp: async () => ({ status: 'verification-required', email: 'user@example.com' }),
  })
  const events = []
  const instance = {
    ...definition.methods,
    data: {
      ...definition.data,
      authIsSignUp: true,
      authCanSubmit: true,
      authEmail: 'user@example.com',
      authPassword: 'password-123',
      authName: 'User',
    },
    setData(patch) { Object.assign(this.data, patch) },
    triggerEvent(name, detail) { events.push({ name, detail }) },
  }

  await instance.submitAuth()

  assert.equal(instance.data.authPassword, '')
  assert.equal(instance.data.authError, '验证邮件已发送，请完成邮箱验证后再登录。')
  assert.equal(events.some((event) => event.name === 'authed'), false)
  assert.equal(toastCalls.some((toast) => toast.title === '已登录'), false)
}

main().then(() => console.log('auth-panel-auth-contract.test.cjs passed'))
