import { requestJson, formatError } from './api'
import { getCurrentUser, subscribeSession } from './session'
let connectedUser = '', owner = getCurrentUser()?.id || '', epoch = 0
let returnPage = '/pages/index/index', returnOwner = ''
subscribeSession(user => { if (owner !== (user?.id || '')) { owner = user?.id || ''; connectedUser = ''; epoch++; returnPage = '/pages/index/index'; returnOwner = '' } })
export function hasTokenDanceConnection() { return Boolean(connectedUser && connectedUser === getCurrentUser()?.id) }
export function invalidateTokenDanceConnection() { connectedUser = ''; epoch++ }
export async function refreshTokenDanceConnection() {
  const id = getCurrentUser()?.id, currentEpoch = epoch
  if (!id) { connectedUser = ''; return { connected: false, available: true, error: '' } }
  try {
    const result = await requestJson<{ connected: boolean; available: boolean }>({ action: 'tokenDanceStatus' })
    if (getCurrentUser()?.id !== id || epoch !== currentEpoch) return { connected: false, available: false, error: '' }
    connectedUser = result.connected ? id : ''
    return { ...result, error: '' }
  } catch (error) { if (getCurrentUser()?.id === id && epoch === currentEpoch) connectedUser = ''; return { connected: false, available: false, error: formatError(error) } }
}
export function rememberWorkPage(url: string) { returnPage = url; returnOwner = getCurrentUser()?.id || '' }
export function openTokenDance() {
  if (typeof getCurrentPages === 'function') {
    const pages = getCurrentPages(), page = pages.slice(-1)[0]
    if (page && page.route !== 'pages/tokendance/tokendance') {
      const jobId = (page as any).options?.jobId
      rememberWorkPage('/' + page.route + (page.route === 'pages/job-detail/job-detail' && jobId ? `?jobId=${encodeURIComponent(jobId)}` : ''))
    }
    const accountIndex = pages.findIndex(item => item.route === 'pages/tokendance/tokendance')
    if (accountIndex >= 0 && accountIndex < pages.length - 1) { wx.navigateBack({ delta: pages.length - accountIndex - 1 }); return }
  }
  wx.switchTab({ url: '/pages/tokendance/tokendance' })
}
export function returnFromTokenDance() {
  const url = returnOwner === (getCurrentUser()?.id || '') ? returnPage : '/pages/index/index'
  if (url.startsWith('/pages/job-detail/')) {
    // Reopen details above the records tab; an account-rooted detail stack can
    // leave the native tab controller on the same target during the next return.
    wx.switchTab({ url: '/pages/records/records', success: () => wx.navigateTo({ url }) })
  }
  else wx.switchTab({ url })
}
