"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentUser = getCurrentUser;
exports.isSessionChecked = isSessionChecked;
exports.subscribeSession = subscribeSession;
exports.refreshSession = refreshSession;
exports.signIn = signIn;
exports.signUp = signUp;
exports.signOut = signOut;
const api_1 = require("./api");
const config_1 = require("./config");
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
    await (0, api_1.authRequest)('/sign-in/email', 'POST', { email, password });
    return refreshSession();
}
async function signUp(email, password, name) {
    await (0, api_1.authRequest)('/sign-up/email', 'POST', {
        email,
        password,
        name: name || email.split('@')[0] || '图研Tuyan 用户',
    });
    return refreshSession();
}
async function signOut() {
    sessionEpoch++;
    await (0, api_1.authRequest)('/sign-out', 'POST').catch(() => undefined);
    wx.removeStorageSync(config_1.AUTH_COOKIE_KEY);
    setCurrentUser(null);
}
