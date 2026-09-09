import { requestJson } from './api'
import { getCurrentUser, subscribeSession } from './session'
let connectedUser = ''
subscribeSession(() => { connectedUser = '' })
export function hasTokenDanceConnection() { return Boolean(connectedUser && connectedUser === getCurrentUser()?.id) }
export async function refreshTokenDanceConnection() {
  const id = getCurrentUser()?.id
  if (!id) { connectedUser = ''; return { connected: false } }
  try {
    const result = await requestJson<{ connected: boolean; available: boolean }>({ action: 'tokenDanceStatus' })
    if (getCurrentUser()?.id !== id) return { connected: false }
    connectedUser = result.connected ? id : ''
    return result
  } catch { if (getCurrentUser()?.id === id) connectedUser = ''; return { connected: false } }
}
export function openTokenDance() { wx.navigateTo({ url: '/pages/tokendance/tokendance' }) }
export async function optimizeTokenDanceInput(input: { mainRoute: { accessProvider: string; modelId: string }; apiKey?: string; target: string; inputs: Record<string, string>; providerRegions?: unknown }) {
  return requestJson<{ candidate: string }>({ action: 'optimizeInputs', ...input, ...(input.mainRoute.accessProvider === 'tokendance' ? { apiKey: undefined } : {}) })
}
