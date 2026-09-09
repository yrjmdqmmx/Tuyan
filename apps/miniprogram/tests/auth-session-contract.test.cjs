const assert = require('node:assert/strict')

const { toBusinessError } = require('../miniprogram/utils/business-errors.js')

function loadSessionWithAuthRequest(authRequest) {
  const sessionPath = require.resolve('../miniprogram/utils/session.js')
  const apiPath = require.resolve('../miniprogram/utils/api.js')
  delete require.cache[sessionPath]
  require.cache[apiPath] = {
    id: apiPath,
    filename: apiPath,
    loaded: true,
    exports: { authRequest },
  }
  return require('../miniprogram/utils/session.js')
}

async function main() {
  const rateLimited = toBusinessError(429, { error: 'Too many requests' }, { 'X-Retry-After': '12' })
  assert.equal(rateLimited.retryAfterSeconds, 12)
  assert.equal(toBusinessError(429, {}, { 'rEtRy-AfTeR': '7' }).retryAfterSeconds, 7)

  const requests = []
  const session = loadSessionWithAuthRequest(async (path, method, data) => {
    requests.push({ path, method, data })
    return { status: true, emailVerificationRequired: true }
  })
  const result = await session.signUp(' user@example.com ', 'password-123', ' User ')
  assert.deepEqual(result, { status: 'verification-required', email: 'user@example.com' })
  assert.deepEqual(requests, [{
    path: '/sign-up/email',
    method: 'POST',
    data: {
      email: 'user@example.com',
      password: 'password-123',
      name: 'User',
      callbackURL: 'https://www.paperbanana.asia/account/email-verified.html',
    },
  }])

  const authenticatedRequests = []
  const authenticatedSession = loadSessionWithAuthRequest(async (path, method, data) => {
    authenticatedRequests.push({ path, method, data })
    if (path === '/get-session') {
      return { user: { id: 'user-1', email: 'user@example.com', name: 'User', emailVerified: true } }
    }
    return { status: true }
  })
  assert.deepEqual(await authenticatedSession.signIn(' user@example.com ', 'password-123'), {
    status: 'authenticated',
    user: { id: 'user-1', email: 'user@example.com', name: 'User', emailVerified: true },
  })
  assert.deepEqual(authenticatedRequests, [
    {
      path: '/sign-in/email',
      method: 'POST',
      data: {
        email: 'user@example.com',
        password: 'password-123',
        callbackURL: 'https://www.paperbanana.asia/account/email-verified.html',
      },
    },
    { path: '/get-session', method: 'GET', data: undefined },
  ])

  const legacySession = loadSessionWithAuthRequest(async () => ({
    user: { id: 'legacy-user', email: 'legacy@example.com', name: 'Legacy' },
  }))
  assert.deepEqual(await legacySession.refreshSession(), {
    id: 'legacy-user', email: 'legacy@example.com', name: 'Legacy', emailVerified: false,
  })

  const authError = toBusinessError(403, { code: 'EMAIL_NOT_VERIFIED' })
  const rejectedSession = loadSessionWithAuthRequest(async () => { throw authError })
  await assert.rejects(() => rejectedSession.signIn('user@example.com', 'password-123'), (error) => error === authError)

  const securityRequests = []
  const securitySession = loadSessionWithAuthRequest(async (path, method, data) => {
    securityRequests.push({ path, method, data })
    return { status: true }
  })
  await securitySession.sendVerificationEmail(' user@example.com ')
  await securitySession.requestPasswordReset(' user@example.com ')
  await securitySession.changePassword('current-password', 'new-password')
  assert.deepEqual(securityRequests, [
    {
      path: '/send-verification-email', method: 'POST', data: {
        email: 'user@example.com', callbackURL: 'https://www.paperbanana.asia/account/email-verified.html',
      },
    },
    {
      path: '/request-password-reset', method: 'POST', data: {
        email: 'user@example.com', redirectTo: 'https://www.paperbanana.asia/account/reset-password.html',
      },
    },
    {
      path: '/change-password', method: 'POST', data: {
        currentPassword: 'current-password', newPassword: 'new-password', revokeOtherSessions: true,
      },
    },
  ])
}

main().then(() => console.log('auth-session-contract.test.cjs passed'))
