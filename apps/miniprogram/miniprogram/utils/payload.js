"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCreateJobPayload = buildCreateJobPayload;
const aspect_ratios_1 = require("./aspect-ratios");
const constants_1 = require("./constants");
const model_routing_1 = require("./model-routing");
// createJob 请求体构造，字段与 packages/api/src/jobs.js 的 createJobRequest 白名单逐一对应。
// 纯函数（不依赖 wx），便于 node 单测覆盖 plot / 锁检索 / 手动参考的组合语义。
function buildCreateJobPayload(input) {
    var _a, _b;
    const hasUploadedReferences = input.uploadedReferenceImages.length > 0;
    const modelRoutes = input.modelRoutes || {
        main: { accessProvider: input.provider, modelId: String(input.mainModelName || '') },
        image: { accessProvider: input.provider, modelId: String(input.imageModelName || '') },
        vision: { accessProvider: input.provider, modelId: String(input.referenceVisionModelName || '') },
    };
    const modelSubmission = (0, model_routing_1.buildModelSubmission)({
        providerRegions: input.providerRegions,
        configurationMode: input.configurationMode,
        modelRoutes,
        registry: input.registry || null,
    });
    const pipelineMode = input.pipelineMode;
    const retrievalSetting = !hasUploadedReferences ? input.retrievalSetting : 'none';
    const taskName = input.categoryId === constants_1.PLOT_CATEGORY_ID ? 'plot' : 'diagram';
    const maxCriticRounds = input.maxCriticRounds;
    const routeRoles = (0, model_routing_1.requiredCreateRouteRoles)({
        modelRoutes,
        outputFormat: input.outputFormat,
        taskName,
        pipelineMode,
        retrievalSetting,
        imageSize: input.imageSize,
        referenceImages: input.uploadedReferenceImages,
        referenceImageMode: input.referenceImageMode,
    }, maxCriticRounds);
    if (routeRoles.includes('image') && ((_a = input.registry) === null || _a === void 0 ? void 0 : _a.providers)) {
        const route = modelRoutes.image;
        const model = (_b = input.registry.providers[route.accessProvider]) === null || _b === void 0 ? void 0 : _b.models.find((model) => model.id === route.modelId);
        const ratios = (0, aspect_ratios_1.buildAspectRatioOptions)({ capabilities: (model === null || model === void 0 ? void 0 : model.capabilities) || {}, capabilityField: 'aspectRatios', resolution: input.imageSize });
        if (!ratios.some((option) => option.value === input.aspectRatio))
            throw new Error('当前比例或清晰度不可用，请重新选择生成设置。');
    }
    const providedKeys = Object.fromEntries(Object.entries(input.apiKeys || {}).map(([provider, key]) => [provider, String(key || '').trim()]));
    if (input.apiKey && !providedKeys[input.provider])
        providedKeys[input.provider] = input.apiKey.trim();
    return {
        action: 'createJob',
        clientPlatform: 'miniprogram',
        ...modelSubmission,
        apiKeys: (0, model_routing_1.scopedApiKeysForRoles)(modelRoutes, routeRoles, providedKeys, input.providerRegions),
        taskName,
        methodContent: input.methodContent.trim(),
        caption: input.caption.trim(),
        negativePrompt: String(input.negativePrompt || '').trim(),
        infographicCategory: input.categoryLabel,
        outputFormat: input.outputFormat,
        imageSize: input.imageSize,
        referenceImageMode: hasUploadedReferences ? input.referenceImageMode : undefined,
        referenceImages: input.uploadedReferenceImages,
        pipelineMode,
        // 上传参考图时以图为唯一风格来源，前端同步关闭检索（后端亦强制，二者一致）。
        retrievalSetting,
        manualReferenceIds: input.retrievalSetting === 'manual' && !hasUploadedReferences ? input.manualReferenceIds : [],
        aspectRatio: input.aspectRatio,
        numCandidates: input.numCandidates,
        maxCriticRounds,
    };
}
