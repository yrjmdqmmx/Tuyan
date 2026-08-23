"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLIENT_VERSION = exports.AUTH_COOKIE_KEY = exports.LOCAL_JOBS_KEY = exports.AUTH_BASE = exports.API_ENDPOINT = exports.API_BASE = void 0;
// 后端统一走 auth-gateway 网关域名（SYNC.md：禁止直连 Laf 域名，身份动作会被拒）。
exports.API_BASE = 'https://api.paperbanana.asia';
exports.API_ENDPOINT = `${exports.API_BASE}/paperbanana-api`;
exports.AUTH_BASE = `${exports.API_BASE}/api/auth`;
exports.LOCAL_JOBS_KEY = 'paperbanana_mini_jobs';
exports.AUTH_COOKIE_KEY = 'paperbanana_auth_cookie';
exports.CLIENT_VERSION = 'miniprogram-1.0.0';
