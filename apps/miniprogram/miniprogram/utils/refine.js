"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refineRequestSource = refineRequestSource;
exports.buildRefineJobPayload = buildRefineJobPayload;
const aspect_ratios_1 = require("./aspect-ratios");
const model_routing_1 = require("./model-routing");
function refineRequestSource(source) {
    const objectKey = String(source.objectKey || '').trim();
    if (source.uploaded) {
        if (!objectKey)
            throw new Error('请等待原图上传与校验完成。');
        return { sourceImageUpload: { objectKey } };
    }
    if (objectKey)
        return { sourceImageObjectKey: objectKey };
    const url = String(source.url || '').trim();
    return url ? { sourceImageUrl: url } : {};
}
function buildRefineJobPayload(input) {
    var _a, _b;
    if ((_a = input.registry) === null || _a === void 0 ? void 0 : _a.providers) {
        const route = input.modelRoutes.image;
        const model = (_b = input.registry.providers[route.accessProvider]) === null || _b === void 0 ? void 0 : _b.models.find((model) => model.id === route.modelId);
        const ratios = (0, aspect_ratios_1.buildAspectRatioOptions)({ capabilities: (model === null || model === void 0 ? void 0 : model.capabilities) || {}, capabilityField: 'refineAspectRatios', resolution: input.imageSize });
        if (!ratios.some((option) => option.value === input.aspectRatio && !option.disabled) || !(0, aspect_ratios_1.buildResolutionOptions)((model === null || model === void 0 ? void 0 : model.capabilities) || {}, 'refineResolutions').some(option => option.value === input.imageSize))
            throw new Error('当前精修比例或清晰度不可用，请重新选择。');
    }
    if (!Object.keys(refineRequestSource(input.source)).length)
        throw new Error('请选择精修源图。');
    if (input.editInstruction.trim().length < 3 || input.editInstruction.length > 2000)
        throw new Error('精修指令需要 3 至 2000 字。');
    const modelSubmission = (0, model_routing_1.buildModelSubmission)(input);
    const roles = (0, model_routing_1.requiredRefineRouteRoles)({ refineMode: input.refineMode });
    return {
        action: 'refineImage',
        clientPlatform: 'miniprogram',
        ...modelSubmission,
        apiKeys: (0, model_routing_1.scopedApiKeysForRoles)(input.modelRoutes, roles, input.apiKeys, input.providerRegions),
        ...refineRequestSource(input.source),
        editInstruction: input.editInstruction.trim(),
        aspectRatio: input.aspectRatio,
        imageSize: input.imageSize,
    };
}
