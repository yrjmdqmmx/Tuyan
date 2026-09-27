"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLIENT_VERSION = exports.AUTH_COOKIE_KEY = exports.LOCAL_JOBS_KEY = exports.AUTH_BASE = exports.API_ENDPOINT = exports.API_BASE = void 0;
// 后端统一走 auth-gateway 网关域名（SYNC.md：客户端只访问网关，身份动作必须通过认证边界）。
exports.API_BASE = 'https://api.paperbanana.asia';
exports.API_ENDPOINT = `${exports.API_BASE}/paperbanana-api`;
exports.AUTH_BASE = `${exports.API_BASE}/api/auth`;
exports.LOCAL_JOBS_KEY = 'paperbanana_mini_jobs';
exports.AUTH_COOKIE_KEY = 'paperbanana_auth_cookie';
exports.CLIENT_VERSION = 'miniprogram-3.5.5';
