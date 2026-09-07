"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MINIMAX_REGIONS = void 0;
exports.normalizeProviderRegions = normalizeProviderRegions;
exports.minimaxRegion = minimaxRegion;
exports.regionApiKeySlot = regionApiKeySlot;
exports.selectRegionApiKeys = selectRegionApiKeys;
exports.modelAvailableInRegion = modelAvailableInRegion;
exports.registryForRegions = registryForRegions;
exports.MINIMAX_REGIONS = {
    global: { label: '国际', apiBase: 'https://api.minimax.io/v1', keyUrl: 'https://platform.minimax.io/user-center/basic-information/interface-key' },
    cn: { label: '中国大陆', apiBase: 'https://api.minimax.cn/v1', keyUrl: 'https://platform.minimaxi.com/user-center/basic-information/interface-key' },
};
function normalizeProviderRegions(value) {
    if (value === undefined)
        return {};
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new Error('Invalid provider region configuration');
    const input = value;
    if (Object.keys(input).some(key => key !== 'minimax'))
        throw new Error('Unsupported provider region configuration');
    if (input.minimax !== undefined && input.minimax !== 'global' && input.minimax !== 'cn')
        throw new Error('Unsupported MiniMax region');
    return input.minimax === undefined ? {} : { minimax: input.minimax };
}
function minimaxRegion(regions) {
    return normalizeProviderRegions(regions).minimax || 'global';
}
function regionApiKeySlot(provider, regions) {
    return provider === 'minimax' ? `minimax:${minimaxRegion(regions)}` : provider;
}
/** Legacy unscoped MiniMax credentials belong only to the international API. */
function selectRegionApiKeys(keys, regions) {
    var _a;
    const selected = Object.fromEntries(Object.entries(keys).filter(([key]) => !key.includes(':')));
    const region = minimaxRegion(regions);
    selected.minimax = (_a = keys[`minimax:${region}`]) !== null && _a !== void 0 ? _a : (region === 'global' ? keys.minimax || '' : '');
    return selected;
}
function modelAvailableInRegion(provider, model, regions) {
    var _a, _b;
    if (provider !== 'minimax')
        return true;
    const region = minimaxRegion(regions);
    // Old unscoped catalog entries described only the international endpoint.
    return ((_a = model.regions) === null || _a === void 0 ? void 0 : _a.includes(region)) || (region === 'global' && (!((_b = model.regions) === null || _b === void 0 ? void 0 : _b.length) || model.regions.includes('global-endpoint'))) || false;
}
/** The selected region projects the same catalog used for admission and execution. */
function registryForRegions(registry, regions) {
    var _a;
    const entry = (_a = registry === null || registry === void 0 ? void 0 : registry.providers) === null || _a === void 0 ? void 0 : _a.minimax;
    if (!entry)
        return registry;
    const models = entry.models.filter((model) => modelAvailableInRegion('minimax', model, regions));
    return { ...registry, providers: { ...registry.providers, minimax: { ...entry, models } } };
}
