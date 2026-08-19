export function normalizeApiBase(value: string): string {
  const trimmed = (value || '').trim()
  const base = trimmed.length ? trimmed : 'https://yifbnnzrwmxn.sealoshzh.site'
  return base.replace(/\/+$/g, '')
}

export function paperbananaEndpoint(apiBase: string): string {
  const base = normalizeApiBase(apiBase)
  if (base.endsWith('/paperbanana-api')) return base
  return `${base}/paperbanana-api`
}

export function authBase(apiBase: string): string {
  return `${normalizeApiBase(apiBase)}/api/auth`
}

export function statusLabel(status: string): string {
  if (status === 'queued') return '排队中'
  if (status === 'running') return '生成中'
  if (status === 'succeeded') return '已完成'
  if (status === 'failed') return '失败'
  return status || '未知'
}

export function formatClientPlatform(value: string): string {
  if (value === 'web') return 'Web 网页'
  if (value === 'miniprogram') return '微信小程序'
  if (value === 'android') return 'Android'
  if (value === 'ios') return 'iOS'
  if (value === 'windows') return 'Windows'
  if (value === 'macos') return 'macOS'
  if (value === 'harmony') return 'HarmonyOS'
  return '未记录'
}

export function formatDate(value: string | number | undefined): string {
  if (value === undefined || value === null) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hour = `${date.getHours()}`.padStart(2, '0')
  const minute = `${date.getMinutes()}`.padStart(2, '0')
  return `${month}-${day} ${hour}:${minute}`
}

export function formatErrorMessage(error: Object | string | undefined): string {
  const message = error instanceof Error ? error.message : String(error || '')
  if (message.includes('Invalid email or password')) return '邮箱或密码不正确。'
  if (message.includes('User already exists')) return '这个邮箱已经注册，请直接登录。'
  if (message.includes('Missing API key')) return '缺少所选模型接口的 API Key。'
  if (message.includes('Incorrect API key') || message.includes('apikey-error')) return 'API Key 不正确，请确认模型服务和密钥匹配。'
  if (message.includes('Please log in') || message.includes('请先登录') || message.includes('Unauthorized')) return '请先登录后再使用任务记录。'
  if (message.includes('Forbidden')) return '当前账号没有权限查看这个任务。'
  if (message.includes('timeout') || message.includes('2300028')) return '请求超时，请稍后重试。'
  if (message.includes('Network') || message.includes('resolve') || message.includes('connect')) return '无法连接后端，请确认网络可访问 Sealos 网关。'
  if (message.includes('password')) return '密码至少需要 8 位。'
  if (message.includes('Invalid gateway token')) return '后端网关配置异常。'
  return message || '操作失败'
}

export function extensionForMimeType(mimeType: string): string {
  if (mimeType === 'image/svg+xml') return 'svg'
  if (mimeType === 'image/webp') return 'webp'
  if (mimeType === 'image/jpeg') return 'jpg'
  return 'png'
}

export function guessMimeType(uriOrName: string): string {
  const name = uriOrName.toLowerCase()
  if (name.endsWith('.svg')) return 'image/svg+xml'
  if (name.endsWith('.webp')) return 'image/webp'
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg'
  return 'image/png'
}

export function filenameFromUri(uri: string, index: number, mimeType: string): string {
  const clean = uri.split('?')[0]
  const raw = clean.split('/').pop() || ''
  if (raw.includes('.')) return decodeURIComponent(raw)
  return `reference-${index + 1}.${extensionForMimeType(mimeType)}`
}

export function isFinishedStatus(status: string): boolean {
  return status === 'succeeded' || status === 'failed'
}
