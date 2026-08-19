export const INPUT_LIMITS = Object.freeze({
  methodContent: 12000,
  caption: 1000,
  maxCriticRounds: 2,
})

const OFFICIAL_API_BASE = 'https://api.paperbanana.asia'
const TERMINAL_JOB_STATUSES = new Set(['succeeded', 'failed', 'cancelled'])

export function officialApiBase(origin = '') {
  try {
    const host = new URL(origin).hostname.toLowerCase()
    if (host === 'paperbanana.asia' || host === 'www.paperbanana.asia') return OFFICIAL_API_BASE
  } catch {
    // Production builds still fall back to the pinned official endpoint.
  }
  return OFFICIAL_API_BASE
}

export function validateApiBase(value, allowCustom) {
  const normalized = String(value || '').trim().replace(/\/$/, '') || OFFICIAL_API_BASE
  const url = new URL(normalized)
  if (!allowCustom && url.origin !== OFFICIAL_API_BASE) {
    throw new Error('Production builds only allow the official PaperBanana API origin.')
  }
  return normalized
}

export function shouldPollJob(job) {
  return !TERMINAL_JOB_STATUSES.has(String(job?.status || '').toLowerCase())
}
