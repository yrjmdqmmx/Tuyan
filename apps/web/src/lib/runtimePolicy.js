export const INPUT_LIMITS = Object.freeze({
  methodContent: 12000,
  caption: 1000,
  negativePrompt: 1000,
  maxCriticRounds: 5,
})

const OFFICIAL_API_BASE = 'https://tuyansci.cn'
const OFFICIAL_API_ORIGINS = new Set([OFFICIAL_API_BASE, 'https://api.paperbanana.asia'])
const TERMINAL_JOB_STATUSES = new Set(['succeeded', 'failed', 'cancelled'])

export function officialApiBase() {
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

export function accountPageUrl(page) {
  return new URL(`/account/${page}`, OFFICIAL_API_BASE).toString()
}
