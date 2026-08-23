const assert = require('node:assert/strict')

const {
  EMAIL_VERIFICATION_CALLBACK_URL,
  PASSWORD_RESET_CALLBACK_URL,
  buildSignInPayload,
  buildSignUpPayload,
  buildSendVerificationPayload,
  buildPasswordResetRequestPayload,
  buildChangePasswordPayload,
  validatePassword,
  validateChangePassword,
  extractAuthErrorCode,
  mapAuthError,
  retryAfterSeconds,
} = require('../miniprogram/utils/auth-security.js')
const { toBusinessError } = require('../miniprogram/utils/business-errors.js')

assert.equal(EMAIL_VERIFICATION_CALLBACK_URL, 'https://www.paperbanana.asia/account/email-verified.html')
assert.equal(PASSWORD_RESET_CALLBACK_URL, 'https://www.paperbanana.asia/account/reset-password.html')
assert.deepEqual(buildSignInPayload(' user@example.com ', 'password-123'), {
  email: 'user@example.com', password: 'password-123', callbackURL: EMAIL_VERIFICATION_CALLBACK_URL,
})
assert.deepEqual(buildSignUpPayload(' user@example.com ', 'password-123', ' User '), {
  email: 'user@example.com', password: 'password-123', name: 'User', callbackURL: EMAIL_VERIFICATION_CALLBACK_URL,
})
assert.deepEqual(buildSignUpPayload('user@example.com', 'password-123', ''), {
  email: 'user@example.com', password: 'password-123', name: 'user', callbackURL: EMAIL_VERIFICATION_CALLBACK_URL,
})
assert.deepEqual(buildSendVerificationPayload(' user@example.com '), {
  email: 'user@example.com', callbackURL: EMAIL_VERIFICATION_CALLBACK_URL,
})
assert.deepEqual(buildPasswordResetRequestPayload(' user@example.com '), {
  email: 'user@example.com', redirectTo: PASSWORD_RESET_CALLBACK_URL,
})
assert.deepEqual(buildChangePasswordPayload('current-password', 'new-password'), {
  currentPassword: 'current-password', newPassword: 'new-password', revokeOtherSessions: true,
})

assert.equal(validatePassword('a'.repeat(7)), 'PASSWORD_TOO_SHORT')
assert.equal(validatePassword('a'.repeat(8)), '')
assert.equal(validatePassword('a'.repeat(128)), '')
assert.equal(validatePassword('a'.repeat(129)), 'PASSWORD_TOO_LONG')
assert.equal(validateChangePassword({ currentPassword: '', newPassword: 'password-123', confirmation: 'password-123' }), 'CURRENT_PASSWORD_REQUIRED')
assert.equal(validateChangePassword({ currentPassword: 'current', newPassword: '', confirmation: '' }), 'NEW_PASSWORD_REQUIRED')
assert.equal(validateChangePassword({ currentPassword: 'current', newPassword: 'short', confirmation: 'short' }), 'PASSWORD_TOO_SHORT')
assert.equal(validateChangePassword({ currentPassword: 'current', newPassword: 'password-123', confirmation: '' }), 'PASSWORD_CONFIRMATION_REQUIRED')
assert.equal(validateChangePassword({ currentPassword: 'current', newPassword: 'password-123', confirmation: 'password-456' }), 'PASSWORD_CONFIRMATION_MISMATCH')
assert.equal(validateChangePassword({ currentPassword: 'current', newPassword: 'password-123', confirmation: 'password-123' }), '')

for (const code of ['EMAIL_NOT_VERIFIED', 'INVALID_TOKEN', 'TOKEN_EXPIRED', 'TOKEN_USED', 'INVALID_EMAIL_OR_PASSWORD', 'INVALID_PASSWORD']) {
  assert.equal(extractAuthErrorCode(toBusinessError(400, { code })), code)
  assert.equal(mapAuthError(toBusinessError(400, { code })).code, code)
}
const numericEnvelope = toBusinessError(403, { code: 403, error: 'EMAIL_NOT_VERIFIED' })
assert.equal(extractAuthErrorCode(numericEnvelope), 'EMAIL_NOT_VERIFIED')
assert.equal(mapAuthError(numericEnvelope).code, 'EMAIL_NOT_VERIFIED')
assert.equal(extractAuthErrorCode(toBusinessError(401, { code: 401, error: 'INVALID_CREDENTIALS' })), 'INVALID_EMAIL_OR_PASSWORD')
assert.equal(mapAuthError(toBusinessError(401, { code: 401, error: 'INVALID_CREDENTIALS' })).code, 'INVALID_EMAIL_OR_PASSWORD')
assert.equal(extractAuthErrorCode(toBusinessError(401, { code: 401, error: 'INVALID_PASSWORD' })), 'INVALID_PASSWORD')
assert.equal(mapAuthError(toBusinessError(401, { code: 401, error: 'INVALID_PASSWORD' })).code, 'INVALID_PASSWORD')
assert.equal(extractAuthErrorCode(toBusinessError(401, { code: 401, error: 'INVALID_CURRENT_PASSWORD' })), 'INVALID_PASSWORD')
assert.equal(mapAuthError(toBusinessError(401, { code: 401, error: 'INVALID_CURRENT_PASSWORD' })).code, 'INVALID_PASSWORD')
assert.equal(extractAuthErrorCode(toBusinessError(429, { error: 'Too many requests' })), 'RATE_LIMITED')
assert.equal(mapAuthError(toBusinessError(429, { error: 'Too many requests' })).code, 'RATE_LIMITED')
assert.equal(extractAuthErrorCode({ businessCode: 'UNRELATED', code: 'EMAIL_NOT_VERIFIED' }), 'EMAIL_NOT_VERIFIED')
assert.equal(extractAuthErrorCode(toBusinessError(400, { code: 'NOT_A_STABLE_AUTH_CODE' })), '')
assert.equal(retryAfterSeconds(toBusinessError(429, {}, { 'x-retry-after': '45' })), 45)
assert.equal(retryAfterSeconds(toBusinessError(429, {}, { 'Retry-After': '0' }), 30), 30)
assert.equal(retryAfterSeconds(new Error('network'), 30), 30)

console.log('auth-security.test.cjs passed')
