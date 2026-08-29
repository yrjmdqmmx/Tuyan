import { APP_BASE_URL, appPath, appRelativePath } from './appPaths.js'

const LEADERBOARD_FALLBACK_PATH = /^\/(?:leaderboard|bench)(?:\/|$)/

export function leaderboardFallbackTarget(location, base = APP_BASE_URL) {
  const pathname = appRelativePath(location?.pathname, base)
  if (!pathname) return null
  if (!LEADERBOARD_FALLBACK_PATH.test(pathname)) return null
  const query = new URLSearchParams(location?.search || '')
  query.set('__route', pathname)
  return `${appPath('/leaderboard', base)}?${query.toString()}${location?.hash || ''}`
}

export function configureFallbackHomeLink(document = globalThis.document, base = APP_BASE_URL) {
  document?.querySelector('[data-app-home]')?.setAttribute('href', appPath('/', base))
}

export function redirectLeaderboardFallback(location = globalThis.location, base = APP_BASE_URL) {
  const target = leaderboardFallbackTarget(location, base)
  if (target) location.replace(target)
  return target
}

configureFallbackHomeLink()
redirectLeaderboardFallback()
