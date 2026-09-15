import { requestJson, formatError } from './api'
import { getCurrentUser, subscribeSession } from './session'
type ConnectionStatus = { connected: boolean; available: boolean; error: string }
let connectedUser = '', owner = getCurrentUser()?.id || '', epoch = 0
let confirmedStatus: ConnectionStatus | null = null
let pending: { id: string; epoch: number; promise: Promise<ConnectionStatus> } | null = null
let returnPage = '/pages/index/index', returnOwner = ''
subscribeSession(user => { if (owner !== (user?.id || '')) { owner = user?.id || ''; invalidateTokenDanceConnection(); returnPage = '/pages/index/index'; returnOwner = '' } })
export function hasTokenDanceConnection() { return Boolean(connectedUser && connectedUser === getCurrentUser()?.id) }
// Only a successful status response is reusable for display; never persist identity or credentials.
export function getTokenDanceConnectionStatus(): ConnectionStatus | null {
  return owner && owner === getCurrentUser()?.id && confirmedStatus ? { ...confirmedStatus } : null
}
export function invalidateTokenDanceConnection() { connectedUser = ''; confirmedStatus = null; pending = null; epoch++ }
export async function refreshTokenDanceConnection(): Promise<ConnectionStatus> {
  const id = getCurrentUser()?.id, currentEpoch = epoch
  if (!id) { connectedUser = ''; confirmedStatus = null; return { connected: false, available: true, error: '' } }
  if (pending?.id === id && pending.epoch === currentEpoch) return pending.promise
  const promise = (async () => {
    try {
      const result = await requestJson<{ connected: boolean; available: boolean }>({ action: 'tokenDanceStatus' })
      if (getCurrentUser()?.id !== id || epoch !== currentEpoch) return { connected: false, available: false, error: '' }
      connectedUser = result.connected ? id : ''
      confirmedStatus = { ...result, error: '' }
      return { ...confirmedStatus }
    } catch (error) {
      if (getCurrentUser()?.id === id && epoch === currentEpoch) { connectedUser = ''; confirmedStatus = null }
      return { connected: false, available: false, error: formatError(error) }
    }
  })()
  pending = { id, epoch: currentEpoch, promise }
  try { return await promise } finally { if (pending?.promise === promise) pending = null }
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
