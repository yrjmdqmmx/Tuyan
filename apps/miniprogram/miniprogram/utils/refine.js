"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refineRequestSource = refineRequestSource;
exports.buildRefineJobPayload = buildRefineJobPayload;
const model_routing_1 = require("./model-routing");
function refineRequestSource(source) {
    const objectKey = String(source.objectKey || '').trim();
    if (objectKey)
        return { sourceImageObjectKey: objectKey };
    const url = String(source.url || '').trim();
    return url ? { sourceImageUrl: url } : {};
}
function buildRefineJobPayload(input) {
    const modelSubmission = (0, model_routing_1.buildModelSubmission)(input);
    const roles = (0, model_routing_1.requiredRefineRouteRoles)({ refineMode: input.refineMode });
    return {
        action: 'refineImage',
        clientPlatform: 'miniprogram',
        ...modelSubmission,
        apiKeys: (0, model_routing_1.scopedApiKeysForRoles)(input.modelRoutes, roles, input.apiKeys),
        ...refineRequestSource(input.source),
        editInstruction: input.editInstruction.trim(),
        aspectRatio: input.aspectRatio,
        imageSize: input.imageSize,
    };
}
