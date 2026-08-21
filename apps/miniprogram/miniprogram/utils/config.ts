// 后端统一走 auth-gateway 网关域名（SYNC.md：禁止直连 Laf 域名，身份动作会被拒）。
export const API_BASE = 'https://api.paperbanana.asia'
export const API_ENDPOINT = `${API_BASE}/paperbanana-api`
export const AUTH_BASE = `${API_BASE}/api/auth`

export const LOCAL_JOBS_KEY = 'paperbanana_mini_jobs'
export const AUTH_COOKIE_KEY = 'paperbanana_auth_cookie'

export const CLIENT_VERSION = 'miniprogram-1.0.0'
