// Generated from packages/types/src/provider-regions.ts
export const MINIMAX_REGIONS = {
    global: { label: '国际', apiBase: 'https://api.minimax.io/v1', keyUrl: 'https://platform.minimax.io/user-center/basic-information/interface-key' },
    cn: { label: '中国大陆', apiBase: 'https://api.minimax.cn/v1', keyUrl: 'https://platform.minimaxi.com/user-center/basic-information/interface-key' },
};
export function normalizeProviderRegions(value) {
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
export function minimaxRegion(regions) {
    return normalizeProviderRegions(regions).minimax || 'global';
}
export function regionApiKeySlot(provider, regions) {
    return provider === 'minimax' ? `minimax:${minimaxRegion(regions)}` : provider;
}
/** Legacy unscoped MiniMax credentials belong only to the international API. */
export function selectRegionApiKeys(keys, regions) {
    const selected = Object.fromEntries(Object.entries(keys).filter(([key]) => !key.includes(':')));
    const region = minimaxRegion(regions);
    selected.minimax = keys[`minimax:${region}`] ?? (region === 'global' ? keys.minimax || '' : '');
    return selected;
}
export function modelAvailableInRegion(provider, model, regions) {
    if (provider !== 'minimax')
        return true;
    const region = minimaxRegion(regions);
    // Old unscoped catalog entries described only the international endpoint.
    return model.regions?.includes(region) || (region === 'global' && (!model.regions?.length || model.regions.includes('global-endpoint'))) || false;
}
/** The selected region projects the same catalog used for admission and execution. */
export function registryForRegions(registry, regions) {
    const entry = registry?.providers?.minimax;
    if (!entry)
        return registry;
    const models = entry.models.filter((model) => modelAvailableInRegion('minimax', model, regions));
    return { ...registry, providers: { ...registry.providers, minimax: { ...entry, models } } };
}
