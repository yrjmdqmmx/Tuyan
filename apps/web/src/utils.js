export function resolveImageUrl(apiBase, url) {
  if (!url) return '';
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  return `${apiBase}${url}`;
}

export function formatErrorMessage(error, context = '') {
  if (!error) return '';
  const code = typeof error === 'object' ? String(error.code || '') : '';
  const status = typeof error === 'object' ? Number(error.status || 0) : 0;
  const message = typeof error === 'string' ? error : String(error.message || error);
  if (code === 'EMAIL_NOT_VERIFIED') return '邮箱尚未验证，请先完成验证。';
  if (code === 'ACCOUNT_EMAIL_RATE_LIMITED' || status === 429) return '请求过于频繁，请稍后重试。';
  if (code === 'ACCOUNT_EMAIL_DELIVERY_FAILED') return '账号邮件暂时无法发送，请稍后重试。';
  if (code === 'PASSWORD_TOO_SHORT') return '密码至少需要 8 位。';
  if (code === 'PASSWORD_TOO_LONG') return '密码不能超过 128 位。';
  if (code === 'INVALID_EMAIL_OR_PASSWORD') return '邮箱或密码不正确。';
  if (code === 'TOKEN_EXPIRED') return '链接已失效，请重新发起操作。';
  if (code === 'TOKEN_USED') return '链接已使用，请重新发起操作。';
  if (code === 'INVALID_TOKEN') return '链接无效，请重新发起操作。';
  if (message.includes('Missing API key')) return '缺少所选模型接口的 API 密钥。';
  if (message.includes('PROVIDER_EGRESS_UNAVAILABLE') || message.includes('海外模型出口暂不可用')) return '海外模型出口暂不可用，请稍后重试。';
  if (message.includes('Failed to fetch')) {
    if (context === 'poll') return '任务状态刷新失败，页面会自动重试。';
    if (context === 'poll-stopped') return '任务状态刷新多次失败，自动重试已暂停。';
    return '网络请求失败，请检查连接后重试。';
  }
  if (message.includes('Please log in') || message.includes('请先登录') || message.includes('Unauthorized')) return '请先登录后再使用生成服务。';
  if (message.includes('INVALID_PASSWORD')) return '密码不正确，请重新输入。';
  if (message.includes('EMAIL_MISMATCH')) return '确认邮箱与当前登录账号不一致。';
  if (message.includes('ACCOUNT_DELETION_WAITING_FOR_UPLOADS')) return '账号已冻结新任务；请在参考图上传链接失效后按提示重试注销。';
  if (message.includes('ACCOUNT_DELETION_WAITING_FOR_JOBS')) return '账号已冻结新任务；正在等待运行中的任务安全结束，请稍后重试注销。';
  if (message.includes('ACCOUNT_DELETION_CONTRACT_UNAVAILABLE')) return '账号注销服务正在升级，请稍后重试。';
  if (message.includes('password')) return '密码至少需要 8 位。';
  if (message.includes('ADMIN_TOKEN is not configured')) return '管理接口未启用：还没有配置 ADMIN_TOKEN。';
  if (message.includes('Admin API disabled')) return '管理接口未启用。';
  if (message.includes('Feedback rate limit exceeded')) return '反馈提交太频繁，请稍后再试。';
  if (message.includes('message exceeds 2000')) return '反馈内容不能超过 2000 字。';
  if (message.includes('message is required')) return '请先填写反馈内容。';
  if (message.includes('Backend is unavailable')) return '后端暂时不可用。';
  if (message.includes('HTTP 503')) return '服务暂时不可用，请稍后重试。';
  return message;
}

export function pollRetryDelay(error, attempt, hidden = false, random = Math.random) {
  const status = Number(error?.code || error?.status || 0)
  if ([400, 401, 403, 404].includes(status)) return null
  const transient = status === 0 || status === 408 || status === 425 || status === 429 || status >= 500
  if (!transient || attempt > 6) return null
  const base = hidden ? 10000 : 3000
  const exponential = Math.min(60000, base * (2 ** Math.max(0, attempt - 1)))
  const jitter = Math.floor(exponential * 0.2 * Math.max(0, Math.min(1, Number(random()) || 0)))
  return Math.min(60000, exponential + jitter)
}

export function shouldClearAuthForJobError(error) {
  return Number(error?.code || error?.status || 0) === 401
}

export function formatConfigurationMode(mode) {
  return mode === 'simple' ? '普通模式' : '专业模式';
}

export function formatOutputFormat(format) {
  if (format === 'svg') return 'SVG 矢量图';
  return 'PNG 图片';
}

export function formatReferenceImageMode(mode) {
  if (mode === 'main_model') return '主模型直读';
  if (mode === 'vision_model') return '独立识别';
  if (mode === 'auto') return '自动选择';
  if (mode === 'none') return '未使用参考图';
  return '未记录';
}

export function formatFeedbackCategory(category) {
  if (category === 'bug') return '问题反馈';
  if (category === 'feature') return '功能建议';
  if (category === 'experience') return '体验意见';
  return '其他';
}

export function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
