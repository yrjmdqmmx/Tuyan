import { AUTH_BASE_DEFAULT } from '../config';

const messages = {
  IDENTITY_EMAIL_CONFLICT: '此邮箱已关联其他账号。请先用原账号的登录方式登录，再到账号设置绑定；账号不会自动合并。',
  IDENTITY_CONFLICT: '此登录方式已属于其他账号。请先登录原账号核对身份，账号数据不会自动合并。',
  IDENTITY_WRONG_ACCOUNT: '授权的账号与当前绑定账号不同，请选择原来的账号重新验证。',
  IDENTITY_ALREADY_LINKED: '已绑定此类登录方式。如需更换，请先添加其他可用方式，再解绑原方式。',
  IDENTITY_LAST_METHOD: '至少需要保留一种可用登录方式。请先绑定并验证另一种方式。',
  IDENTITY_REAUTH_REQUIRED: '请先重新验证当前账号身份，再继续操作。验证有效期为 5 分钟。',
  IDENTITY_SESSION_CHANGED: '登录状态已改变，请从当前页面重新发起授权。',
  IDENTITY_CODE_INVALID: '验证码不正确，请检查后重试。',
  IDENTITY_CODE_EXPIRED: '验证码已过期、已使用或尝试次数过多，请重新验证身份并获取验证码。',
  IDENTITY_EMAIL_UNAVAILABLE: '验证邮件暂时无法发送，请稍后重新验证身份并重试。',
  IDENTITY_INVALID_EMAIL: '请输入有效邮箱地址。',
  IDENTITY_RATE_LIMITED: '操作过于频繁，请等待提示时间后重试。',
  IDENTITY_PROVIDER_NOT_CONFIGURED: '此登录方式暂未开放，请使用其他方式。',
  IDENTITY_ORIGIN_REJECTED: '请求来源无法验证，请回到图研页面重试。',
  ACCOUNT_LIFECYCLE_CLOSED: '此账号正在注销或已失效，请重新登录后检查账号状态。',
  INVALID_PASSWORD: '当前密码不正确，请重试。',
  OAUTH_STATE_INVALID: '授权已过期或无法验证，请从图研重新开始登录。',
  OAUTH_CANCELLED: '已取消授权，可以重试或使用邮箱登录。',
  OAUTH_AUTHORIZATION_FAILED: '第三方授权未完成或服务暂不可用，请重试或使用其他登录方式。',
};
export const identityMessage = (error) => messages[typeof error === 'string' ? error : error?.code] || '账号服务暂不可用，请稍后重试。';
export const isIdentityError = (value) => Object.hasOwn(messages, value || '');
export function readIdentityResult(search = window.location.search) {
  const result = new URLSearchParams(search).get('auth_result') || '';
  return isIdentityError(result) || ['signed-in', 'linked', 'verified-manage', 'verified-delete'].includes(result) ? result : '';
}
export function clearIdentityResult() {
  const url = new URL(window.location.href); url.searchParams.delete('auth_result');
  window.history.replaceState(window.history.state, '', url.toString());
}

export async function identityRequest(path, body, base = AUTH_BASE_DEFAULT, fetchImpl = fetch) {
  const response = await fetchImpl(`${String(base || '').replace(/\/$/, '')}/api/auth/identity/${path}`, {
    method: body === undefined ? 'GET' : 'POST', credentials: 'include',
    ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(identityMessage(data)), { code: data.code, retryAfterSeconds: Number(response.headers.get('retry-after') || data.retryAfterSeconds || 60) });
  return data;
}
export async function startOAuth(provider, intent, purpose, base) {
  const result = await identityRequest('oauth/start', { provider, intent, ...(purpose ? { purpose } : {}) }, base);
  // The Gateway constructs this URL from fixed provider endpoints.
  const url = new URL(result.url);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Invalid authorization URL');
  window.location.assign(url.toString());
}
