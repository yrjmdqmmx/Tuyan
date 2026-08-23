"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MODEL_ROUTE_ROLES = void 0;
exports.providerDefaultRoutes = providerDefaultRoutes;
exports.buildModelSubmission = buildModelSubmission;
exports.requiredCreateRouteRoles = requiredCreateRouteRoles;
exports.requiredRefineRouteRoles = requiredRefineRouteRoles;
exports.uniqueProvidersForRoles = uniqueProvidersForRoles;
exports.scopedApiKeysForRoles = scopedApiKeysForRoles;
exports.arkProbesForRoles = arkProbesForRoles;
exports.arkVerificationKey = arkVerificationKey;
exports.missingArkVerifications = missingArkVerifications;
exports.nextArkVerificationBatch = nextArkVerificationBatch;
exports.MODEL_ROUTE_ROLES = ['main', 'image', 'vision'];
function providerDefaultRoutes(provider, registry) {
    var _a;
    const providers = registry === null || registry === void 0 ? void 0 : registry.providers;
    const defaults = (_a = providers === null || providers === void 0 ? void 0 : providers[provider]) === null || _a === void 0 ? void 0 : _a.defaults;
    if (!(defaults === null || defaults === void 0 ? void 0 : defaults.main) || !defaults.image || !defaults.vision)
        throw new Error('当前 API 渠道没有完整默认路由。');
    return {
        main: { accessProvider: provider, modelId: defaults.main },
        image: { accessProvider: provider, modelId: defaults.image },
        vision: { accessProvider: provider, modelId: defaults.vision },
    };
}
function buildModelSubmission(input) {
    assertCompleteRoutes(input.modelRoutes);
    if (!input.registry || Number(input.registry.routeContractVersion || 0) < 1) {
        throw new Error('服务端模型目录不可用，已禁止新建付费任务。');
    }
    return {
        configurationMode: input.configurationMode,
        provider: input.modelRoutes.main.accessProvider,
        modelRoutes: input.modelRoutes,
        mainModelName: input.modelRoutes.main.modelId,
        imageModelName: input.modelRoutes.image.modelId,
        referenceVisionModelName: input.modelRoutes.vision.modelId,
    };
}
function requiredCreateRouteRoles(body, maxCriticRounds) {
    const roles = [];
    const outputFormat = body.outputFormat === 'svg' ? 'svg' : 'png';
    const taskName = body.taskName === 'plot' ? 'plot' : 'diagram';
    const pipelineMode = typeof body.pipelineMode === 'string' ? body.pipelineMode : 'planner_critic';
    if (outputFormat === 'svg' || taskName === 'plot' || pipelineMode !== 'vanilla' || body.retrievalSetting === 'auto')
        roles.push('main');
    if (outputFormat === 'png' && taskName !== 'plot')
        roles.push('image');
    const references = Array.isArray(body.referenceImages) ? body.referenceImages : [];
    if (references.length)
        roles.push(body.referenceImageMode === 'main_model' ? 'main' : 'vision');
    if (maxCriticRounds > 0 && (taskName === 'plot' || (outputFormat === 'png' && pipelineMode !== 'vanilla')))
        roles.push('vision');
    return orderedUniqueRoles(roles);
}
function requiredRefineRouteRoles(body) {
    return body.refineMode === 'direct-edit' ? ['image'] : ['vision', 'image'];
}
function uniqueProvidersForRoles(modelRoutes, roles) {
    var _a;
    const providers = [];
    for (const role of orderedUniqueRoles(roles)) {
        const provider = (_a = modelRoutes[role]) === null || _a === void 0 ? void 0 : _a.accessProvider;
        if (provider && !providers.includes(provider))
            providers.push(provider);
    }
    return providers;
}
function scopedApiKeysForRoles(modelRoutes, roles, apiKeys) {
    return Object.fromEntries(uniqueProvidersForRoles(modelRoutes, roles).map((provider) => [provider, apiKeys[provider] || '']));
}
function arkProbesForRoles(modelRoutes, roles) {
    return orderedUniqueRoles(roles)
        .filter((role) => { var _a; return ((_a = modelRoutes[role]) === null || _a === void 0 ? void 0 : _a.accessProvider) === 'ark'; })
        .map((role) => ({ role, modelId: modelRoutes[role].modelId }));
}
function arkVerificationKey(probe) {
    return `${probe.role}:${probe.modelId}`;
}
function missingArkVerifications(probes, verification) {
    return probes.filter((probe) => verification[arkVerificationKey(probe)] !== 'verified');
}
function nextArkVerificationBatch(probes, verification, confirmPaidImageProbe) {
    const unverified = missingArkVerifications(probes, verification);
    const freeProbes = unverified.filter((probe) => probe.role !== 'image');
    if (freeProbes.length)
        return { probes: freeProbes, confirmPaidImageProbe: false };
    const imageProbes = confirmPaidImageProbe ? unverified.filter((probe) => probe.role === 'image') : [];
    return { probes: imageProbes, confirmPaidImageProbe: imageProbes.length > 0 };
}
function orderedUniqueRoles(roles) {
    const requested = new Set(roles);
    return exports.MODEL_ROUTE_ROLES.filter((role) => requested.has(role));
}
function assertCompleteRoutes(routes) {
    var _a, _b;
    for (const role of exports.MODEL_ROUTE_ROLES) {
        if (!((_a = routes[role]) === null || _a === void 0 ? void 0 : _a.accessProvider) || !((_b = routes[role]) === null || _b === void 0 ? void 0 : _b.modelId))
            throw new Error(`模型路线 ${role} 尚未完整选择。`);
    }
}
