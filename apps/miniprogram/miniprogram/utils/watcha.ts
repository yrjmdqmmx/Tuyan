import { authRequest } from './api'
import { AUTH_BASE } from './config'

export interface WatchaStatus {
  available: boolean; miniProgramSupported: boolean; linked: boolean; hasPassword: boolean; emailVerified: boolean
  pending: { nickname: string } | null
}
export const EMPTY_WATCHA: WatchaStatus = { available: false, miniProgramSupported: false, linked: false, hasPassword: true, emailVerified: false, pending: null }
const messages: Record<string, string> = {
  WATCHA_DISABLED: '观猹登录暂未开放，可继续使用邮箱登录。',
  WATCHA_UNAVAILABLE: '观猹登录暂时不可用，请稍后重试。',
  WATCHA_PROVIDER_UNAVAILABLE: '暂时无法连接观猹授权服务，请稍后重试。',
  WATCHA_PENDING_EXPIRED: '接续码无效、已使用或授权已过期，请重新授权。',
  WATCHA_INVALID_CODE: '邮箱验证码不正确、已过期或尝试次数已用完。',
  WATCHA_EMAIL_RATE_LIMITED: '验证码发送过于频繁，请稍后重试。',
  WATCHA_EMAIL_DELIVERY_FAILED: '验证码邮件未能发送，请稍后重试。',
  WATCHA_EXISTING_ACCOUNT: '这个邮箱已有图研账号，请先登录原账号，再确认绑定观猹。',
  WATCHA_BINDING_CONFLICT: '观猹与已有账号的绑定冲突，请使用原账号检查绑定。',
  WATCHA_LAST_LOGIN_METHOD: '请先通过“忘记密码”设置图研密码，再解绑观猹。',
  WATCHA_EMAIL_UNVERIFIED: '请先验证当前图研邮箱，再继续操作。',
  WATCHA_SIGN_IN_REQUIRED: '请先登录图研账号。',
  WATCHA_SIGN_OUT_REQUIRED: '当前已登录图研，请使用“绑定观猹账号”。',
  WATCHA_ACCOUNT_CHANGED: '账号已变化，请重新发起观猹授权。',
  WATCHA_ACCOUNT_UNAVAILABLE: '账号正在注销或暂不可用。',
  WATCHA_INVALID_ORIGIN: '当前登录服务尚未支持小程序接续，可先使用邮箱登录。',
  WATCHA_INVALID_EMAIL: '请输入有效邮箱。',
}
type Action = 'mini-status' | 'mini-start' | 'mini-exchange' | 'mini-cancel' | 'email-code' | 'complete' | 'link' | 'unlink' | 'delete-confirmation'
export async function watchaRequest<T = any>(action: Action, body?: WechatMiniprogram.IAnyObject, isCurrent: () => boolean = () => true): Promise<T> {
  try {
    const result = await authRequest<any>(`/watcha/${action}`, action === 'mini-status' ? 'GET' : 'POST', body || {}, { timeout: 30000, isCurrent })
    if (!result || (action === 'mini-status' ? result.miniProgramSupported !== true : action === 'mini-start' ? typeof result.url !== 'string' : action === 'delete-confirmation' ? typeof result.confirmationToken !== 'string' : result.ok !== true)) throw new Error('WATCHA_INVALID_RESPONSE')
    return result
  } catch (error) {
    const raw = String((error as any)?.businessCode || '') + ' ' + String((error as any)?.message || '')
    const key = Object.keys(messages).find(code => raw.includes(code))
    const mapped = new Error(key ? messages[key] : '观猹账号操作暂未完成，请刷新状态重试；也可使用邮箱登录。')
    ;(mapped as any).code = key || 'WATCHA_UNAVAILABLE'
    throw mapped
  }
}
export function watchaLaunchUrl(value: string): string {
  // WeChat JS runtime need not provide WHATWG URL. Match the exact gateway route.
  const prefix = `${AUTH_BASE}/watcha/mini-launch?state=`
  if (!value.startsWith(prefix) || !/^[A-Za-z0-9_-]{43}$/.test(value.slice(prefix.length))) throw new Error('观猹授权地址无效，请重新尝试。')
  return value
}
