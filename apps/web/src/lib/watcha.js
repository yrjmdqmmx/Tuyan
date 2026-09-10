const actions = new Set(['status', 'start', 'email-code', 'complete', 'link', 'unlink', 'delete-confirmation']);
const messages = {
  WATCHA_DISABLED: '观猹登录暂未开放，请使用邮箱登录。',
  WATCHA_UNAVAILABLE: '观猹登录暂时不可用，请稍后重试。',
  WATCHA_PROVIDER_UNAVAILABLE: '暂时无法连接观猹授权服务，请稍后重试。',
  WATCHA_INVALID_STATE: '本次授权已失效，请重新使用观猹登录。',
  WATCHA_PENDING_EXPIRED: '本次授权已过期，请重新使用观猹登录。',
  WATCHA_INVALID_CODE: '验证码不正确、已过期或尝试次数已用完，请检查或重新发送。',
  WATCHA_EMAIL_RATE_LIMITED: '邮件发送过于频繁，请稍后重试。',
  WATCHA_EMAIL_DELIVERY_FAILED: '验证码邮件暂时未能发送，请稍后重试。',
  WATCHA_EXISTING_ACCOUNT: '这个邮箱已有图研账号，请登录原账号后明确绑定观猹。',
  WATCHA_BINDING_CONFLICT: '当前绑定与已有账号冲突，请使用原账号登录并检查绑定。',
  WATCHA_LAST_LOGIN_METHOD: '请先设置图研登录密码，再解绑观猹，避免失去登录方式。',
  WATCHA_EMAIL_UNVERIFIED: '请先验证当前图研邮箱，再继续绑定或账号管理。',
  WATCHA_SIGN_IN_REQUIRED: '请先登录图研账号。',
  WATCHA_SIGN_OUT_REQUIRED: '当前已登录图研，请到账户页绑定观猹。',
  WATCHA_ACCOUNT_CHANGED: '图研账号已发生变化，请重新发起观猹授权。',
  WATCHA_ACCOUNT_UNAVAILABLE: '账号正在注销或暂不可用，不能修改登录方式。',
  WATCHA_INVALID_EMAIL: '请输入有效邮箱。',
  WATCHA_INVALID_ORIGIN: '当前页面暂不支持观猹登录，请从正式图研站点进入。',
  WATCHA_INVALID_REQUEST: '操作信息不完整，请刷新状态后重试。',
  WATCHA_SCOPE_REJECTED: '本次观猹授权的权限不符合要求，请重新授权。',
  WATCHA_SESSION_FAILED: '暂时无法完成图研登录，请重新尝试。',
};

export async function watchaRequest(apiBase, action, body, fetcher = fetch) {
  if (!actions.has(action)) throw new Error('不支持的观猹账号操作。');
  const response = await fetcher(`${String(apiBase || '').replace(/\/$/, '')}/api/auth/watcha/${action}`, {
    method: action === 'status' ? 'GET' : 'POST', credentials: 'include', cache: 'no-store',
    ...(action === 'status' ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) }),
    signal: AbortSignal.timeout(30000),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data || data.error || (action !== 'status' && action !== 'start' && action !== 'delete-confirmation' && data.ok !== true)) {
    const code = typeof data?.code === 'string' ? data.code : typeof data?.error === 'string' ? data.error : '';
    const error = new Error(messages[code] || (response.status === 429 ? '操作过于频繁，请稍后重试。' : response.status === 401 ? messages.WATCHA_SIGN_IN_REQUIRED : '观猹账号操作未完成，请刷新状态后重试。'));
    error.code = code; throw error;
  }
  return data;
}

export function watchaAuthorizeUrl(value) {
  const url = new URL(value);
  if (url.origin !== 'https://watcha.cn' || url.pathname !== '/oauth/authorize' || url.username || url.password || url.hash) throw new Error('观猹授权地址无效，请稍后重试。');
  return url;
}

export function isWatchaCallback(event, popup, origin) {
  return Boolean(popup && event.source === popup && event.origin === origin && event.data?.type === 'tuyan-watcha-complete'
    && ['complete', 'pending', 'error'].includes(event.data.status));
}
