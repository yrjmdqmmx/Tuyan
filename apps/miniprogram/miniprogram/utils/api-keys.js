"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getApiKeys = getApiKeys;
exports.setApiKey = setApiKey;
exports.replaceApiKeys = replaceApiKeys;
exports.clearApiKeys = clearApiKeys;
const keys = {};
function getApiKeys() {
    return { ...keys };
}
function setApiKey(provider, value) {
    const key = String(value || '').trim();
    if (key)
        keys[provider] = key;
    else
        delete keys[provider];
}
function replaceApiKeys(input) {
    clearApiKeys();
    for (const [provider, value] of Object.entries(input)) {
        if (isProvider(provider))
            setApiKey(provider, value);
    }
}
function clearApiKeys() {
    for (const provider of Object.keys(keys))
        delete keys[provider];
}
function isProvider(value) {
    return value === 'gemini' || value === 'openai' || value === 'bailian' || value === 'ark' || value === 'openrouter';
}
