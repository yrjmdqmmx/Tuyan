"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveUiSettings = saveUiSettings;
exports.readUiSettings = readUiSettings;
// Persist only presentation preferences. Credentials and identity never belong here.
const FIELDS = ['configurationMode', 'simpleProvider', 'outputFormat', 'imageSize', 'aspectRatio', 'pipelineMode', 'retrievalSetting', 'numCandidates', 'maxCriticRounds'];
function snapshot(value) {
    var _a;
    const result = {};
    for (const name of FIELDS)
        result[name] = value[name];
    result.modelRoutes = Object.fromEntries(['main', 'image', 'vision'].map(role => [role, { accessProvider: value.modelRoutes[role].accessProvider, modelId: value.modelRoutes[role].modelId }]));
    if ((_a = value.providerRegions) === null || _a === void 0 ? void 0 : _a.minimax)
        result.providerRegions = { minimax: value.providerRegions.minimax };
    return result;
}
function saveUiSettings(scope, value) {
    try {
        wx.setStorageSync(`tuyan_ui_settings_v1_${scope}`, snapshot(value));
    }
    catch { /* memory settings remain usable */ }
}
function readUiSettings(scope, fallback) {
    try {
        const value = wx.getStorageSync(`tuyan_ui_settings_v1_${scope}`);
        if (!value || !['simple', 'advanced'].includes(value.configurationMode) || !['png', 'svg'].includes(value.outputFormat))
            return fallback;
        if (!['main', 'image', 'vision'].every(role => { var _a, _b; return typeof ((_b = (_a = value.modelRoutes) === null || _a === void 0 ? void 0 : _a[role]) === null || _b === void 0 ? void 0 : _b.modelId) === 'string' && value.modelRoutes[role].modelId.length <= 200 && typeof value.modelRoutes[role].accessProvider === 'string'; }))
            return fallback;
        for (const field of ['simpleProvider', 'imageSize', 'aspectRatio', 'pipelineMode', 'retrievalSetting'])
            if (typeof value[field] !== 'string' || value[field].length > 100)
                return fallback;
        if (![1, 2, 3].includes(value.numCandidates) || ![0, 1, 2].includes(value.maxCriticRounds))
            return fallback;
        return snapshot(value);
    }
    catch {
        return fallback;
    }
}
