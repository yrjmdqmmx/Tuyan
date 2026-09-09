"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OPTIMIZATION_LABELS = void 0;
exports.supportsOptimization = supportsOptimization;
exports.buildOptimizationRequest = buildOptimizationRequest;
exports.validateOptimizationResult = validateOptimizationResult;
const model_registry_1 = require("./model-registry");
const provider_regions_1 = require("./provider-regions");
exports.OPTIMIZATION_LABELS = { methodContent: '研究方法与流程', caption: '目标图注', negativePrompt: '负向提示词', editInstruction: '精修指令' };
const LIMITS = { methodContent: 12000, caption: 1000, negativePrompt: 1000, editInstruction: 2000 };
function supportsOptimization(registry, target) {
    return Number(registry === null || registry === void 0 ? void 0 : registry.inputOptimizationContractVersion) >= 1
        && ((registry === null || registry === void 0 ? void 0 : registry.inputOptimizationTargets) || ['methodContent', 'caption', 'negativePrompt']).includes(target);
}
function buildOptimizationRequest(input) {
    var _a, _b;
    if (!supportsOptimization(input.registry, input.target))
        throw new Error('当前服务端尚未提供此项输入优化。');
    const { mainRoute, registry } = input;
    const model = (0, model_registry_1.findRegistryModel)(registry, mainRoute === null || mainRoute === void 0 ? void 0 : mainRoute.accessProvider, mainRoute === null || mainRoute === void 0 ? void 0 : mainRoute.modelId);
    if (!model || model.selectable !== true || !model.roles.includes('main') || !(0, provider_regions_1.modelAvailableInRegion)(mainRoute.accessProvider, model, input.providerRegions))
        throw new Error('请先在设置中选择可用的主模型。');
    const regions = (0, provider_regions_1.normalizeProviderRegions)(input.providerRegions);
    if (mainRoute.accessProvider === 'minimax' && regions.minimax === 'cn' && !(registry === null || registry === void 0 ? void 0 : registry.providerRegionContractVersion))
        throw new Error('当前服务端尚未支持 MiniMax 国内区域。');
    const apiKey = (_a = (0, provider_regions_1.selectRegionApiKeys)(input.apiKeys, regions)[mainRoute.accessProvider]) === null || _a === void 0 ? void 0 : _a.trim();
    if (!apiKey)
        throw new Error('请先在设置中填写当前主模型接入渠道的密钥。');
    const inputs = input.target === 'editInstruction'
        ? { editInstruction: String(input.inputs.editInstruction || '') }
        : { methodContent: String(input.inputs.methodContent || ''), caption: String(input.inputs.caption || ''), negativePrompt: String(input.inputs.negativePrompt || '') };
    for (const key of Object.keys(inputs)) {
        if (inputs[key].length > LIMITS[key])
            throw new Error(`${exports.OPTIMIZATION_LABELS[key]}内容过长，请缩短后重试。`);
    }
    if (input.target !== 'negativePrompt' && !((_b = inputs[input.target]) === null || _b === void 0 ? void 0 : _b.trim()))
        throw new Error('请先填写需要优化的内容。');
    if (input.target === 'negativePrompt' && !Object.values(inputs).some(value => value.trim()))
        throw new Error('请先填写方法或图注，再优化负向提示词。');
    return { action: 'optimizeInputs', target: input.target, inputs, mainRoute: { ...mainRoute }, apiKey, ...(mainRoute.accessProvider === 'minimax' ? { providerRegions: regions } : {}) };
}
function validateOptimizationResult(target, original, result) {
    const candidate = typeof (result === null || result === void 0 ? void 0 : result.optimizedText) === 'string' ? result.optimizedText.trim() : '';
    if ((result === null || result === void 0 ? void 0 : result.target) !== target || !candidate || candidate.length > LIMITS[target])
        throw new Error('优化结果无效，原文已保留，请重试。');
    if (candidate === original.trim())
        throw new Error('优化结果与原文一致，已保留原文。');
    return candidate;
}
