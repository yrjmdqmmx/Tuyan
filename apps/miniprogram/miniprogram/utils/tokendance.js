"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasTokenDanceConnection = hasTokenDanceConnection;
exports.refreshTokenDanceConnection = refreshTokenDanceConnection;
exports.openTokenDance = openTokenDance;
exports.optimizeTokenDanceInput = optimizeTokenDanceInput;
const api_1 = require("./api");
const session_1 = require("./session");
let connectedUser = '';
(0, session_1.subscribeSession)(() => { connectedUser = ''; });
function hasTokenDanceConnection() { var _a; return Boolean(connectedUser && connectedUser === ((_a = (0, session_1.getCurrentUser)()) === null || _a === void 0 ? void 0 : _a.id)); }
async function refreshTokenDanceConnection() {
    var _a, _b, _c;
    const id = (_a = (0, session_1.getCurrentUser)()) === null || _a === void 0 ? void 0 : _a.id;
    if (!id) {
        connectedUser = '';
        return { connected: false };
    }
    try {
        const result = await (0, api_1.requestJson)({ action: 'tokenDanceStatus' });
        if (((_b = (0, session_1.getCurrentUser)()) === null || _b === void 0 ? void 0 : _b.id) !== id)
            return { connected: false };
        connectedUser = result.connected ? id : '';
        return result;
    }
    catch {
        if (((_c = (0, session_1.getCurrentUser)()) === null || _c === void 0 ? void 0 : _c.id) === id)
            connectedUser = '';
        return { connected: false };
    }
}
function openTokenDance() { wx.navigateTo({ url: '/pages/tokendance/tokendance' }); }
async function optimizeTokenDanceInput(input) {
    return (0, api_1.requestJson)({ action: 'optimizeInputs', ...input, ...(input.mainRoute.accessProvider === 'tokendance' ? { apiKey: undefined } : {}) });
}
