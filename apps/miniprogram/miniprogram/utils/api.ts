import { API_ENDPOINT, AUTH_BASE, AUTH_COOKIE_KEY } from './config'
import { BusinessError, businessErrorGuidance, toBusinessError } from './business-errors'

export interface WxRequestResult<T> {
  data: T
  statusCode: number
  header: WechatMiniprogram.IAnyObject
  cookies?: string[]
}

export interface RequestOptions {
  auth?: boolean
  timeout?: number
}

export function requestJson<T>(body: WechatMiniprogram.IAnyObject, options: RequestOptions = {}): Promise<T> {
  return postJson<T>(API_ENDPOINT, body, options)
}

// 防御解析：wx.request 严格 JSON.parse 失败时 res.data 会退化为字符串（如网关/代理异常时
// 返回的 HTML 错误页、或上游响应被意外破坏），导致轮询拿不到 job。这里清洗 0x00–0x1F 后
// 重试解析（换行/制表符替换为空格），仍失败才原样返回交给错误处理。属通用兜底，非已知后端缺陷。
export function coerceJsonResponse<T>(data: unknown): T {
  if (typeof data !== 'string') return data as T
  const text = data
  try {
    return JSON.parse(text) as T
  } catch {
    // fall through to sanitized retry
  }
  try {
    const sanitized = text.replace(/[\u0000-\u001f]/g, (ch) => (ch === '\n' || ch === '\r' || ch === '\t' ? ' ' : ''))
    return JSON.parse(sanitized) as T
  } catch {
    return data as T
  }
}

export function authRequest<T>(path: string, method: 'GET' | 'POST', data?: WechatMiniprogram.IAnyObject, options: RequestOptions = {}): Promise<T> {
  return gatewayRequest<T>(`${AUTH_BASE}${path}`, method, data, options)
}

export function gatewayRequest<T>(url: string, method: 'GET' | 'POST', data?: WechatMiniprogram.IAnyObject, options: RequestOptions = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    const header = requestHeader(true)
    wx.request({
      url,
      method,
      timeout: options.timeout || 60000,
      header,
      data,
      success(res: WxRequestResult<T & { message?: string; code?: string; error?: string }>) {
        persistCookies(res)
        const responseData = coerceJsonResponse<T & { message?: string; code?: string; error?: string }>(res.data)
        if (res.statusCode < 200 || res.statusCode >= 300) {
          const body = responseData || ({} as T & { message?: string; code?: string; error?: string })
          reject(toBusinessError(res.statusCode, body))
          return
        }
        resolve(responseData as T)
      },
      fail(error) {
        reject(new Error(error.errMsg || '网络请求失败'))
      },
    })
  })
}

export function postJson<T>(url: string, body: WechatMiniprogram.IAnyObject, options: RequestOptions = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: 'POST',
      timeout: options.timeout || 60000,
      header: requestHeader(options.auth !== false),
      data: body,
      success(res: WxRequestResult<T & { code?: number; error?: string; detail?: string }>) {
        persistCookies(res)
        const data = coerceJsonResponse<T & { code?: number; error?: string; detail?: string }>(res.data) || ({} as T & { code?: number; error?: string; detail?: string })
        if (res.statusCode < 200 || res.statusCode >= 300 || (data.code && data.code !== 0)) {
          reject(toBusinessError(res.statusCode, data))
          return
        }
        resolve(data)
      },
      fail(error) {
        reject(new Error(error.errMsg || '网络请求失败'))
      },
    })
  })
}

export function uploadReferenceFile(filePath: string, uploadUrl: string, mimeType: string): Promise<void> {
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().readFile({
      filePath,
      success(readResult) {
        wx.request({
          url: uploadUrl,
          method: 'PUT',
          timeout: 60000,
          header: {
            'Content-Type': mimeType,
          },
          data: readResult.data,
          success(res) {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve()
              return
            }
            reject(new Error(`参考图上传失败：HTTP ${res.statusCode}`))
          },
          fail(error) {
            reject(new Error(error.errMsg || '参考图上传失败'))
          },
        })
      },
      fail(error) {
        reject(new Error(error.errMsg || '读取参考图失败'))
      },
    })
  })
}

export function requestHeader(includeAuth: boolean): WechatMiniprogram.IAnyObject {
  const header: WechatMiniprogram.IAnyObject = {
    'content-type': 'application/json',
  }
  const cookie = wx.getStorageSync(AUTH_COOKIE_KEY)
  if (includeAuth && typeof cookie === 'string' && cookie) {
    header.Cookie = cookie
  }
  return header
}

export function persistCookies<T>(res: WxRequestResult<T>) {
  const cookieLines: string[] = []
  if (Array.isArray(res.cookies)) {
    cookieLines.push(...res.cookies)
  }

  const header = res.header || {}
  const setCookie = header['Set-Cookie'] || header['set-cookie']
  if (Array.isArray(setCookie)) {
    cookieLines.push(...setCookie)
  } else if (typeof setCookie === 'string') {
    cookieLines.push(...splitSetCookieHeader(setCookie))
  }

  if (!cookieLines.length) return

  const cookieMap = parseCookieHeader(wx.getStorageSync(AUTH_COOKIE_KEY) || '')
  cookieLines.forEach((line) => {
    const pair = String(line).split(';')[0]
    const index = pair.indexOf('=')
    if (index <= 0) return
    const name = pair.slice(0, index).trim()
    const value = pair.slice(index + 1).trim()
    if (!value) {
      cookieMap.delete(name)
    } else {
      cookieMap.set(name, value)
    }
  })

  const nextCookie = Array.from(cookieMap.entries()).map(([name, value]) => `${name}=${value}`).join('; ')
  if (nextCookie) {
    wx.setStorageSync(AUTH_COOKIE_KEY, nextCookie)
  } else {
    wx.removeStorageSync(AUTH_COOKIE_KEY)
  }
}

function splitSetCookieHeader(header: string): string[] {
  return header.split(/,(?=\s*[^;,=\s]+=[^;,]*)/g).map((item) => item.trim()).filter(Boolean)
}

function parseCookieHeader(header: string): Map<string, string> {
  const cookieMap = new Map<string, string>()
  header.split(';').forEach((part) => {
    const pair = part.trim()
    const index = pair.indexOf('=')
    if (index <= 0) return
    cookieMap.set(pair.slice(0, index), pair.slice(index + 1))
  })
  return cookieMap
}

export function formatError(error: unknown): string {
  if (error instanceof BusinessError) return businessErrorGuidance(error).message
  const message = error instanceof Error ? error.message : String(error || '')
  if (message.includes('Invalid email or password')) return '邮箱或密码不正确。'
  if (message.includes('Invalid origin') || message.includes('Origin not allowed')) {
    return '登录请求被后端来源校验拦截。需要在网关的 FRONTEND_ORIGINS / Better Auth trustedOrigins 放行微信小程序来源后重新部署。'
  }
  if (message.includes('User already exists')) return '这个邮箱已经注册，请直接登录。'
  if (message.includes('Missing API key')) return '缺少所选模型接口的 API Key。'
  if (message.includes('Incorrect API key') || message.includes('apikey-error')) {
    return 'API Key 不正确。请确认当前选择的模型服务和填写的密钥匹配；如果选择阿里百炼，需要填写百炼控制台创建的 sk- 开头 API Key。'
  }
  if (message.includes('Please log in') || message.includes('请先登录') || message.includes('Unauthorized')) return '请先登录后再使用任务记录。'
  if (message.includes('Forbidden')) return '当前账号没有权限查看这个任务。'
  if (message.includes('url not in domain list')) return '请先在小程序后台配置 request 合法域名。'
  if (message.includes('timeout')) return '请求超时，请稍后重试。'
  if (message.includes('Invalid gateway token')) return '后端网关配置异常。'
  if (message.includes('password')) return '密码至少需要 8 位。'
  return message || '操作失败'
}
