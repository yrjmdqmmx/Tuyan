"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getModelRegistryState = getModelRegistryState;
exports.subscribeModelRegistry = subscribeModelRegistry;
exports.loadModelRegistry = loadModelRegistry;
const api_1 = require("./api");
const model_registry_1 = require("./model-registry");
let state = { registry: null, loading: false, error: '' };
let currentRequest = null;
const listeners = new Set();
function getModelRegistryState() {
    return state;
}
function subscribeModelRegistry(listener) {
    listeners.add(listener);
    listener(state);
    return () => listeners.delete(listener);
}
function loadModelRegistry(force = false) {
    if (!force && state.registry)
        return Promise.resolve(state);
    if (!force && currentRequest)
        return currentRequest;
    setState({ ...state, loading: true, error: '' });
    currentRequest = (0, api_1.requestJson)({ action: 'modelRegistry' }, { auth: false })
        .then((response) => {
        const registry = (0, model_registry_1.normalizeModelRegistry)(response);
        setState({ registry, loading: false, error: '' });
        return state;
    })
        .catch((error) => {
        const message = error instanceof Error ? error.message : String(error || '模型目录不可用');
        setState({ registry: null, loading: false, error: message });
        return state;
    })
        .finally(() => {
        currentRequest = null;
    });
    return currentRequest;
}
function setState(next) {
    state = next;
    listeners.forEach((listener) => listener(state));
}
