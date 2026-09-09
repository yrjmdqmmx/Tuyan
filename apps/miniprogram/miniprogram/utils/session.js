"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentUser = getCurrentUser;
exports.isSessionChecked = isSessionChecked;
exports.subscribeSession = subscribeSession;
exports.refreshSession = refreshSession;
exports.signIn = signIn;
exports.signUp = signUp;
exports.getVerificationStatus = getVerificationStatus;
exports.sendVerificationEmail = sendVerificationEmail;
exports.requestPasswordReset = requestPasswordReset;
exports.changePassword = changePassword;
exports.signOut = signOut;
const api_keys_1 = require("./api-keys");
const api_1 = require("./api");
const config_1 = require("./config");
const auth_security_1 = require("./auth-security");
// 登录态在模块级缓存并广播给各页面；cookie 本身由 utils/api 持久化在 storage，天然跨页共享。
let currentUser = null;
let sessionChecked = false;
const listeners = new Set();
// 时序守卫：启动时的慢速 get-session 响应不得覆盖此后 signIn/signOut 产生的新登录态
let sessionEpoch = 0;
function getCurrentUser() {
    return currentUser;
}
function isSessionChecked() {
    return sessionChecked;
}
function subscribeSession(listener) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
function setCurrentUser(user) {
    if (currentUser && currentUser.id !== (user === null || user === void 0 ? void 0 : user.id))
        (0, api_keys_1.clearApiKeys)();
    currentUser = user;
    sessionChecked = true;
    listeners.forEach((listener) => listener(currentUser));
}
async function refreshSession() {
    const epoch = ++sessionEpoch;
    try {
        // 短超时：启动期的会话探测失败按未登录处理即可，不必等满 60s（也避免控制台超时报错）
        const session = await (0, api_1.authRequest)('/get-session', 'GET', undefined, { timeout: 15000 });
        if (epoch !== sessionEpoch)
            return currentUser;
        const user = session && session.user;
        if (user && user.id) {
            setCurrentUser({
                id: String(user.id),
                email: String(user.email || ''),
                name: String(user.name || ''),
                emailVerified: user.emailVerified === true,
            });
        }
        else {
            setCurrentUser(null);
        }
    }
    catch {
        if (epoch !== sessionEpoch)
            return currentUser;
        setCurrentUser(null);
    }
    return currentUser;
}
async function signIn(email, password) {
    await (0, api_1.authRequest)('/sign-in/email', 'POST', (0, auth_security_1.buildSignInPayload)(email, password));
    const user = await refreshSession();
    if (!user)
        throw new Error('登录状态校验失败，请重试。');
    return { status: 'authenticated', user };
}
async function signUp(email, password, name) {
    const payload = (0, auth_security_1.buildSignUpPayload)(email, password, name);
    const response = await (0, api_1.authRequest)('/sign-up/email', 'POST', payload);
    const token = typeof (response === null || response === void 0 ? void 0 : response.verificationStatusToken) === 'string' ? response.verificationStatusToken : '';
    return { status: 'verification-required', email: payload.email, ...(token ? { verificationStatusToken: token } : {}) };
}
async function getVerificationStatus(token) {
    const response = await (0, api_1.authRequest)('/verification-status', 'POST', { token }, { auth: false, timeout: 8000 });
    if (response.status !== 'pending' && response.status !== 'verified')
        throw new Error('验证状态暂时无法查询。');
    return response.status;
}
async function sendVerificationEmail(email) {
    await (0, api_1.authRequest)('/send-verification-email', 'POST', (0, auth_security_1.buildSendVerificationPayload)(email));
}
async function requestPasswordReset(email) {
    await (0, api_1.authRequest)('/request-password-reset', 'POST', (0, auth_security_1.buildPasswordResetRequestPayload)(email));
}
async function changePassword(currentPassword, newPassword) {
    await (0, api_1.authRequest)('/change-password', 'POST', (0, auth_security_1.buildChangePasswordPayload)(currentPassword, newPassword));
}
async function signOut() {
    sessionEpoch++;
    await (0, api_1.authRequest)('/sign-out', 'POST').catch(() => undefined);
    wx.removeStorageSync(config_1.AUTH_COOKIE_KEY);
    setCurrentUser(null);
}
