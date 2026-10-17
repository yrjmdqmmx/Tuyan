export const INPUT_LIMITS = Object.freeze({
  methodContent: 12000,
  caption: 1000,
  negativePrompt: 1000,
  maxCriticRounds: 5,
})

const OFFICIAL_API_BASE = 'https://api.paperbanana.asia'
const NEW_WEB_ORIGIN = 'https://tuyansci.cn'
const OFFICIAL_API_ORIGINS = new Set([OFFICIAL_API_BASE, NEW_WEB_ORIGIN])
const TERMINAL_JOB_STATUSES = new Set(['succeeded', 'failed', 'cancelled'])

export function officialApiBase(origin = '') {
  try {
    const parsed = new URL(origin)
    if (parsed.origin === NEW_WEB_ORIGIN) return NEW_WEB_ORIGIN
    const host = parsed.hostname.toLowerCase()
    if (host === 'paperbanana.asia' || host === 'www.paperbanana.asia') return OFFICIAL_API_BASE
  } catch {
    // Production builds still fall back to the pinned official endpoint.
  }
  return OFFICIAL_API_BASE
}

export function validateApiBase(value, allowCustom) {
  const normalized = String(value || '').trim().replace(/\/$/, '') || OFFICIAL_API_BASE
  const url = new URL(normalized)
  if (!allowCustom && (!OFFICIAL_API_ORIGINS.has(url.origin) || url.username || url.password || url.pathname !== '/' || url.search || url.hash)) {
    throw new Error('Production builds only allow the official PaperBanana API origin.')
  }
  return normalized
}

export function shouldPollJob(job) {
  return !TERMINAL_JOB_STATUSES.has(String(job?.status || '').toLowerCase())
}

export function accountPageUrl(page, origin = globalThis.location?.origin) {
  const base = origin === NEW_WEB_ORIGIN ? NEW_WEB_ORIGIN : 'https://www.paperbanana.asia'
  return new URL(`/account/${page}`, base).toString()
}
