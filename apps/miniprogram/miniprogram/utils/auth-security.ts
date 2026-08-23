import { BusinessError } from './business-errors'

export const EMAIL_VERIFICATION_CALLBACK_URL = 'https://www.paperbanana.asia/account/email-verified.html'
export const PASSWORD_RESET_CALLBACK_URL = 'https://www.paperbanana.asia/account/reset-password.html'

export type PasswordValidationCode = 'PASSWORD_TOO_SHORT' | 'PASSWORD_TOO_LONG'
export type ChangePasswordValidationCode = PasswordValidationCode | 'CURRENT_PASSWORD_REQUIRED' | 'NEW_PASSWORD_REQUIRED' | 'PASSWORD_CONFIRMATION_REQUIRED' | 'PASSWORD_CONFIRMATION_MISMATCH'
export type StableAuthErrorCode = 'EMAIL_NOT_VERIFIED' | 'INVALID_TOKEN' | 'TOKEN_EXPIRED' | 'TOKEN_USED' | 'INVALID_EMAIL_OR_PASSWORD' | 'INVALID_PASSWORD' | 'RATE_LIMITED'

export function buildSignInPayload(email: string, password: string): { email: string; password: string; callbackURL: string } {
  return { email: email.trim(), password, callbackURL: EMAIL_VERIFICATION_CALLBACK_URL }
}

export function buildSignUpPayload(email: string, password: string, name: string): { email: string; password: string; name: string; callbackURL: string } {
  const normalizedEmail = email.trim()
  return {
    email: normalizedEmail,
    password,
    name: name.trim() || normalizedEmail.split('@')[0] || '图研Tuyan 用户',
    callbackURL: EMAIL_VERIFICATION_CALLBACK_URL,
  }
}

export function buildSendVerificationPayload(email: string): { email: string; callbackURL: string } {
  return { email: email.trim(), callbackURL: EMAIL_VERIFICATION_CALLBACK_URL }
}

export function buildPasswordResetRequestPayload(email: string): { email: string; redirectTo: string } {
  return { email: email.trim(), redirectTo: PASSWORD_RESET_CALLBACK_URL }
}

export function buildChangePasswordPayload(currentPassword: string, newPassword: string): { currentPassword: string; newPassword: string; revokeOtherSessions: true } {
  return { currentPassword, newPassword, revokeOtherSessions: true }
}

export function validatePassword(password: string): PasswordValidationCode | '' {
  if (password.length < 8) return 'PASSWORD_TOO_SHORT'
  if (password.length > 128) return 'PASSWORD_TOO_LONG'
  return ''
}

export function validateChangePassword(input: { currentPassword: string; newPassword: string; confirmation: string }): ChangePasswordValidationCode | '' {
  if (!input.currentPassword) return 'CURRENT_PASSWORD_REQUIRED'
  if (!input.newPassword) return 'NEW_PASSWORD_REQUIRED'
  const passwordError = validatePassword(input.newPassword)
  if (passwordError) return passwordError
  if (!input.confirmation) return 'PASSWORD_CONFIRMATION_REQUIRED'
  if (input.newPassword !== input.confirmation) return 'PASSWORD_CONFIRMATION_MISMATCH'
  return ''
}

export function extractAuthErrorCode(error: unknown): StableAuthErrorCode | '' {
  const source = error instanceof BusinessError
    ? { httpStatus: error.httpStatus, businessCode: error.businessCode, code: error.code, message: error.message }
    : error && typeof error === 'object'
      ? error as { httpStatus?: unknown; status?: unknown; businessCode?: unknown; code?: unknown; error?: unknown; message?: unknown }
      : {}
  const httpStatus = Number(source.httpStatus || source.status || 0)
  if (httpStatus === 429) return 'RATE_LIMITED'
  for (const candidate of [source.businessCode, source.code, source.error, source.message]) {
    const code = normalizeAuthErrorCode(candidate)
    if (code) return code
  }
  return ''
}

function normalizeAuthErrorCode(candidate: unknown): StableAuthErrorCode | '' {
  const normalized = typeof candidate === 'string' ? candidate.trim() : ''
  switch (normalized) {
    case 'EMAIL_NOT_VERIFIED':
    case 'INVALID_TOKEN':
    case 'TOKEN_EXPIRED':
    case 'TOKEN_USED':
    case 'INVALID_EMAIL_OR_PASSWORD':
    case 'INVALID_PASSWORD':
      return normalized as StableAuthErrorCode
    case 'INVALID_CREDENTIALS':
    case 'Invalid email or password':
      return 'INVALID_EMAIL_OR_PASSWORD'
    case 'INVALID_CURRENT_PASSWORD':
    case 'Invalid password':
      return 'INVALID_PASSWORD'
    default:
      return ''
  }
}

export function retryAfterSeconds(error: unknown, fallback = 60): number {
  const value = error instanceof BusinessError
    ? error.retryAfterSeconds
    : error && typeof error === 'object'
      ? (error as { retryAfterSeconds?: unknown }).retryAfterSeconds
      : undefined
  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds > 0) return Math.ceil(seconds)
  const safeFallback = Number(fallback)
  return Number.isFinite(safeFallback) && safeFallback > 0 ? Math.ceil(safeFallback) : 60
}

export function mapAuthError(error: unknown): { code: StableAuthErrorCode | ''; message: string; retryAfterSeconds?: number } {
  const code = extractAuthErrorCode(error)
  const messages: Record<StableAuthErrorCode, string> = {
    EMAIL_NOT_VERIFIED: '邮箱尚未验证，请先完成验证。',
    INVALID_TOKEN: '链接无效，请重新发起操作。',
    TOKEN_EXPIRED: '链接已失效，请重新发起操作。',
    TOKEN_USED: '链接已使用，请重新发起操作。',
    INVALID_EMAIL_OR_PASSWORD: '邮箱或密码不正确。',
    INVALID_PASSWORD: '当前密码不正确。',
    RATE_LIMITED: '请求过于频繁，请稍后重试。',
  }
  return {
    code,
    message: code ? messages[code] : '操作失败，请稍后重试。',
    ...(code === 'RATE_LIMITED' ? { retryAfterSeconds: retryAfterSeconds(error) } : {}),
  }
}
