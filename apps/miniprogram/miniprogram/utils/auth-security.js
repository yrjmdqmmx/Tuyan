"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PASSWORD_RESET_CALLBACK_URL = exports.EMAIL_VERIFICATION_CALLBACK_URL = void 0;
exports.buildSignInPayload = buildSignInPayload;
exports.buildSignUpPayload = buildSignUpPayload;
exports.buildSendVerificationPayload = buildSendVerificationPayload;
exports.buildPasswordResetRequestPayload = buildPasswordResetRequestPayload;
exports.buildChangePasswordPayload = buildChangePasswordPayload;
exports.validatePassword = validatePassword;
exports.validateChangePassword = validateChangePassword;
exports.extractAuthErrorCode = extractAuthErrorCode;
exports.retryAfterSeconds = retryAfterSeconds;
exports.mapAuthError = mapAuthError;
const business_errors_1 = require("./business-errors");
exports.EMAIL_VERIFICATION_CALLBACK_URL = 'https://www.paperbanana.asia/account/email-verified.html';
exports.PASSWORD_RESET_CALLBACK_URL = 'https://www.paperbanana.asia/account/reset-password.html';
function buildSignInPayload(email, password) {
    return { email: email.trim(), password, callbackURL: exports.EMAIL_VERIFICATION_CALLBACK_URL };
}
function buildSignUpPayload(email, password, name) {
    const normalizedEmail = email.trim();
    return {
        email: normalizedEmail,
        password,
        name: name.trim() || normalizedEmail.split('@')[0] || '图研Tuyan 用户',
        callbackURL: exports.EMAIL_VERIFICATION_CALLBACK_URL,
    };
}
function buildSendVerificationPayload(email) {
    return { email: email.trim(), callbackURL: exports.EMAIL_VERIFICATION_CALLBACK_URL };
}
function buildPasswordResetRequestPayload(email) {
    return { email: email.trim(), redirectTo: exports.PASSWORD_RESET_CALLBACK_URL };
}
function buildChangePasswordPayload(currentPassword, newPassword) {
    return { currentPassword, newPassword, revokeOtherSessions: true };
}
function validatePassword(password) {
    if (password.length < 8)
        return 'PASSWORD_TOO_SHORT';
    if (password.length > 128)
        return 'PASSWORD_TOO_LONG';
    return '';
}
function validateChangePassword(input) {
    if (!input.currentPassword)
        return 'CURRENT_PASSWORD_REQUIRED';
    if (input.currentPassword.length < 8)
        return 'CURRENT_PASSWORD_TOO_SHORT';
    if (input.currentPassword.length > 128)
        return 'CURRENT_PASSWORD_TOO_LONG';
    if (!input.newPassword)
        return 'NEW_PASSWORD_REQUIRED';
    const passwordError = validatePassword(input.newPassword);
    if (passwordError)
        return passwordError;
    if (!input.confirmation)
        return 'PASSWORD_CONFIRMATION_REQUIRED';
    if (input.newPassword !== input.confirmation)
        return 'PASSWORD_CONFIRMATION_MISMATCH';
    return '';
}
function extractAuthErrorCode(error) {
    const source = error instanceof business_errors_1.BusinessError
        ? { httpStatus: error.httpStatus, businessCode: error.businessCode, code: error.code, message: error.message }
        : error && typeof error === 'object'
            ? error
            : {};
    const httpStatus = Number(source.httpStatus || source.status || 0);
    if (httpStatus === 429)
        return 'RATE_LIMITED';
    for (const candidate of [source.businessCode, source.code, source.error, source.message]) {
        const code = normalizeAuthErrorCode(candidate);
        if (code)
            return code;
    }
    return '';
}
function normalizeAuthErrorCode(candidate) {
    const normalized = typeof candidate === 'string' ? candidate.trim() : '';
    switch (normalized) {
        case 'EMAIL_NOT_VERIFIED':
        case 'INVALID_TOKEN':
        case 'TOKEN_EXPIRED':
        case 'TOKEN_USED':
        case 'INVALID_EMAIL_OR_PASSWORD':
        case 'INVALID_PASSWORD':
            return normalized;
        case 'INVALID_CREDENTIALS':
        case 'Invalid email or password':
            return 'INVALID_EMAIL_OR_PASSWORD';
        case 'INVALID_CURRENT_PASSWORD':
        case 'Invalid password':
            return 'INVALID_PASSWORD';
        default:
            return '';
    }
}
function retryAfterSeconds(error, fallback = 60) {
    const value = error instanceof business_errors_1.BusinessError
        ? error.retryAfterSeconds
        : error && typeof error === 'object'
            ? error.retryAfterSeconds
            : undefined;
    const seconds = Number(value);
    if (Number.isFinite(seconds) && seconds > 0)
        return Math.ceil(seconds);
    const safeFallback = Number(fallback);
    return Number.isFinite(safeFallback) && safeFallback > 0 ? Math.ceil(safeFallback) : 60;
}
function mapAuthError(error) {
    const code = extractAuthErrorCode(error);
    const messages = {
        EMAIL_NOT_VERIFIED: '邮箱尚未验证，请先完成验证。',
        INVALID_TOKEN: '链接无效，请重新发起操作。',
        TOKEN_EXPIRED: '链接已失效，请重新发起操作。',
        TOKEN_USED: '链接已使用，请重新发起操作。',
        INVALID_EMAIL_OR_PASSWORD: '邮箱或密码不正确。',
        INVALID_PASSWORD: '当前密码不正确。',
        RATE_LIMITED: '请求过于频繁，请稍后重试。',
    };
    return {
        code,
        message: code ? messages[code] : '操作失败，请稍后重试。',
        ...(code === 'RATE_LIMITED' ? { retryAfterSeconds: retryAfterSeconds(error) } : {}),
    };
}
