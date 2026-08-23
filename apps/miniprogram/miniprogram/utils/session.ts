import { authRequest } from './api'
import { AUTH_COOKIE_KEY } from './config'

export interface CurrentUser {
  id: string
  email: string
  name: string
}

export type SessionListener = (user: CurrentUser | null) => void

// 登录态在模块级缓存并广播给各页面；cookie 本身由 utils/api 持久化在 storage，天然跨页共享。
let currentUser: CurrentUser | null = null
let sessionChecked = false
const listeners = new Set<SessionListener>()
// 时序守卫：启动时的慢速 get-session 响应不得覆盖此后 signIn/signOut 产生的新登录态
let sessionEpoch = 0

export function getCurrentUser(): CurrentUser | null {
  return currentUser
}

export function isSessionChecked(): boolean {
  return sessionChecked
}

export function subscribeSession(listener: SessionListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function setCurrentUser(user: CurrentUser | null) {
  currentUser = user
  sessionChecked = true
  listeners.forEach((listener) => listener(currentUser))
}

export async function refreshSession(): Promise<CurrentUser | null> {
  const epoch = ++sessionEpoch
  try {
    // 短超时：启动期的会话探测失败按未登录处理即可，不必等满 60s（也避免控制台超时报错）
    const session = await authRequest<{ user?: { id?: string; email?: string; name?: string } } | null>('/get-session', 'GET', undefined, { timeout: 15000 })
    if (epoch !== sessionEpoch) return currentUser
    const user = session && session.user
    if (user && user.id) {
      setCurrentUser({
        id: String(user.id),
        email: String(user.email || ''),
        name: String(user.name || ''),
      })
    } else {
      setCurrentUser(null)
    }
  } catch {
    if (epoch !== sessionEpoch) return currentUser
    setCurrentUser(null)
  }
  return currentUser
}

export async function signIn(email: string, password: string): Promise<CurrentUser | null> {
  await authRequest('/sign-in/email', 'POST', { email, password })
  return refreshSession()
}

export async function signUp(email: string, password: string, name: string): Promise<CurrentUser | null> {
  await authRequest('/sign-up/email', 'POST', {
    email,
    password,
    name: name || email.split('@')[0] || '图研Tuyan 用户',
  })
  return refreshSession()
}

export async function signOut(): Promise<void> {
  sessionEpoch++
  await authRequest('/sign-out', 'POST').catch(() => undefined)
  wx.removeStorageSync(AUTH_COOKIE_KEY)
  setCurrentUser(null)
}
