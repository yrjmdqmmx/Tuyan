// 后端统一走 auth-gateway 网关域名（SYNC.md：客户端只访问网关，身份动作必须通过认证边界）。
export const API_BASE = 'https://api.paperbanana.asia'
export const API_ENDPOINT = `${API_BASE}/paperbanana-api`
export const AUTH_BASE = `${API_BASE}/api/auth`

export const LOCAL_JOBS_KEY = 'paperbanana_mini_jobs'
export const AUTH_COOKIE_KEY = 'paperbanana_auth_cookie'

export const CLIENT_VERSION = 'miniprogram-3.5.5'
