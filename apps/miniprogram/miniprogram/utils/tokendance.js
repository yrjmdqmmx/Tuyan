"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasTokenDanceConnection = hasTokenDanceConnection;
exports.getTokenDanceConnectionStatus = getTokenDanceConnectionStatus;
exports.invalidateTokenDanceConnection = invalidateTokenDanceConnection;
exports.refreshTokenDanceConnection = refreshTokenDanceConnection;
exports.rememberWorkPage = rememberWorkPage;
exports.openTokenDance = openTokenDance;
exports.returnFromTokenDance = returnFromTokenDance;
const api_1 = require("./api");
const session_1 = require("./session");
let connectedUser = '', owner = ((_a = (0, session_1.getCurrentUser)()) === null || _a === void 0 ? void 0 : _a.id) || '', epoch = 0;
let confirmedStatus = null;
let pending = null;
let returnPage = '/pages/index/index', returnOwner = '';
(0, session_1.subscribeSession)(user => { if (owner !== ((user === null || user === void 0 ? void 0 : user.id) || '')) {
    owner = (user === null || user === void 0 ? void 0 : user.id) || '';
    invalidateTokenDanceConnection();
    returnPage = '/pages/index/index';
    returnOwner = '';
} });
function hasTokenDanceConnection() { var _a; return Boolean(connectedUser && connectedUser === ((_a = (0, session_1.getCurrentUser)()) === null || _a === void 0 ? void 0 : _a.id)); }
// Only a successful status response is reusable for display; never persist identity or credentials.
function getTokenDanceConnectionStatus() {
    var _a;
    return owner && owner === ((_a = (0, session_1.getCurrentUser)()) === null || _a === void 0 ? void 0 : _a.id) && confirmedStatus ? { ...confirmedStatus } : null;
}
function invalidateTokenDanceConnection() { connectedUser = ''; confirmedStatus = null; pending = null; epoch++; }
async function refreshTokenDanceConnection() {
    var _a;
    const id = (_a = (0, session_1.getCurrentUser)()) === null || _a === void 0 ? void 0 : _a.id, currentEpoch = epoch;
    if (!id) {
        connectedUser = '';
        confirmedStatus = null;
        return { connected: false, available: true, error: '' };
    }
    if ((pending === null || pending === void 0 ? void 0 : pending.id) === id && pending.epoch === currentEpoch)
        return pending.promise;
    const promise = (async () => {
        var _a, _b;
        try {
            const result = await (0, api_1.requestJson)({ action: 'tokenDanceStatus' });
            if (((_a = (0, session_1.getCurrentUser)()) === null || _a === void 0 ? void 0 : _a.id) !== id || epoch !== currentEpoch)
                return { connected: false, available: false, error: '' };
            connectedUser = result.connected ? id : '';
            confirmedStatus = { ...result, error: '' };
            return { ...confirmedStatus };
        }
        catch (error) {
            if (((_b = (0, session_1.getCurrentUser)()) === null || _b === void 0 ? void 0 : _b.id) === id && epoch === currentEpoch) {
                connectedUser = '';
                confirmedStatus = null;
            }
            return { connected: false, available: false, error: (0, api_1.formatError)(error) };
        }
    })();
    pending = { id, epoch: currentEpoch, promise };
    try {
        return await promise;
    }
    finally {
        if ((pending === null || pending === void 0 ? void 0 : pending.promise) === promise)
            pending = null;
    }
}
function rememberWorkPage(url) { var _a; returnPage = url; returnOwner = ((_a = (0, session_1.getCurrentUser)()) === null || _a === void 0 ? void 0 : _a.id) || ''; }
function openTokenDance() {
    var _a;
    if (typeof getCurrentPages === 'function') {
        const pages = getCurrentPages(), page = pages.slice(-1)[0];
        if (page && page.route !== 'pages/tokendance/tokendance') {
            const jobId = (_a = page.options) === null || _a === void 0 ? void 0 : _a.jobId;
            rememberWorkPage('/' + page.route + (page.route === 'pages/job-detail/job-detail' && jobId ? `?jobId=${encodeURIComponent(jobId)}` : ''));
        }
        const accountIndex = pages.findIndex(item => item.route === 'pages/tokendance/tokendance');
        if (accountIndex >= 0 && accountIndex < pages.length - 1) {
            wx.navigateBack({ delta: pages.length - accountIndex - 1 });
            return;
        }
    }
    wx.switchTab({ url: '/pages/tokendance/tokendance' });
}
function returnFromTokenDance() {
    var _a;
    const url = returnOwner === (((_a = (0, session_1.getCurrentUser)()) === null || _a === void 0 ? void 0 : _a.id) || '') ? returnPage : '/pages/index/index';
    if (url.startsWith('/pages/job-detail/')) {
        // Reopen details above the records tab; an account-rooted detail stack can
        // leave the native tab controller on the same target during the next return.
        wx.switchTab({ url: '/pages/records/records', success: () => wx.navigateTo({ url }) });
    }
    else
        wx.switchTab({ url });
}
