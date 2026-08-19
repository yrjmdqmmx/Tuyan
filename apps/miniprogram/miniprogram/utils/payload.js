"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCreateJobPayload = buildCreateJobPayload;
const constants_1 = require("./constants");
// createJob 请求体构造，字段与 packages/api/src/jobs.js 的 createJobRequest 白名单逐一对应。
// 纯函数（不依赖 wx），便于 node 单测覆盖 plot / 锁检索 / 手动参考的组合语义。
function buildCreateJobPayload(input) {
    const isAdvancedMode = input.configurationMode === 'advanced';
    const hasUploadedReferences = input.uploadedReferenceImages.length > 0;
    const apiKeys = {
        openrouter: '',
        gemini: '',
        openai: '',
        bailian: '',
    };
    apiKeys[input.provider] = input.apiKey.trim();
    return {
        action: 'createJob',
        clientPlatform: 'miniprogram',
        configurationMode: input.configurationMode,
        provider: input.provider,
        apiKeys,
        taskName: input.categoryId === constants_1.PLOT_CATEGORY_ID ? 'plot' : 'diagram',
        methodContent: input.methodContent.trim(),
        caption: input.caption.trim(),
        infographicCategory: input.categoryLabel,
        outputFormat: input.outputFormat,
        imageSize: input.imageSize,
        mainModelName: input.mainModelName,
        imageModelName: input.imageModelName,
        referenceVisionModelName: input.referenceVisionModelName,
        referenceImageMode: hasUploadedReferences ? input.referenceImageMode : undefined,
        referenceImages: input.uploadedReferenceImages,
        pipelineMode: isAdvancedMode ? input.pipelineMode : 'planner_critic',
        // 上传参考图时以图为唯一风格来源，前端同步关闭检索（后端亦强制，二者一致）。
        retrievalSetting: isAdvancedMode && !hasUploadedReferences ? input.retrievalSetting : 'none',
        manualReferenceIds: isAdvancedMode && input.retrievalSetting === 'manual' && !hasUploadedReferences ? input.manualReferenceIds : [],
        aspectRatio: isAdvancedMode ? input.aspectRatio : '16:9',
        numCandidates: isAdvancedMode ? input.numCandidates : 1,
        maxCriticRounds: isAdvancedMode ? input.maxCriticRounds : 1,
    };
}
