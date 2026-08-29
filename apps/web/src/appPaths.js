const META_ENV = import.meta.env || {}
const EXTERNAL_OR_FRAGMENT = /^(?:[a-z][a-z\d+.-]*:|\/\/|#|\?)/i

export function normalizeAppBase(base = '/') {
  const value = String(base || '/').trim() || '/'
  const rooted = value.startsWith('/') ? value : `/${value}`
  return rooted.endsWith('/') ? rooted : `${rooted}/`
}

export const APP_BASE_URL = normalizeAppBase(META_ENV.BASE_URL || '/')

export function appPath(path = '/', base = APP_BASE_URL) {
  const value = String(path || '/')
  if (EXTERNAL_OR_FRAGMENT.test(value)) return value
  const normalizedBase = normalizeAppBase(base)
  const relative = value.replace(/^\/+/, '')
  return relative ? `${normalizedBase}${relative}` : normalizedBase
}

export function appRelativePath(pathname, base = APP_BASE_URL) {
  const value = String(pathname || '')
  const normalizedBase = normalizeAppBase(base)
  if (normalizedBase === '/') return value.startsWith('/') ? value : null
  const baseWithoutSlash = normalizedBase.slice(0, -1)
  if (value === baseWithoutSlash || value === normalizedBase) return '/'
  if (!value.startsWith(normalizedBase)) return null
  return `/${value.slice(normalizedBase.length)}`
}

export function appRelativeLocation(location = {}, base = APP_BASE_URL) {
  const pathname = appRelativePath(location.pathname, base)
  return {
    pathname: pathname ?? String(location.pathname || ''),
    search: String(location.search || ''),
    hash: String(location.hash || ''),
  }
}
