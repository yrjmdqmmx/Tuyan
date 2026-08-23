"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CANONICAL_ASPECT_RATIOS = void 0;
exports.buildAspectRatioOptions = buildAspectRatioOptions;
exports.normalizeSelectedAspectRatio = normalizeSelectedAspectRatio;
exports.buildResolutionOptions = buildResolutionOptions;
exports.CANONICAL_ASPECT_RATIOS = ['1:1', '3:2', '2:3', '4:3', '3:4', '16:9', '9:16', '21:9', '1:4', '4:1'];
function buildAspectRatioOptions(input) {
    const declared = Array.isArray(input.capabilities[input.capabilityField])
        ? input.capabilities[input.capabilityField]
        : [];
    const supported = new Set(declared.map(String));
    const modelLabel = input.modelLabel || '当前图像模型';
    return [
        { value: 'auto', label: '自动', disabled: false, reason: '' },
        ...exports.CANONICAL_ASPECT_RATIOS.map((value) => ({
            value,
            label: value,
            disabled: !supported.has(value),
            reason: supported.has(value) ? '' : `${modelLabel} 不支持 ${value} 比例`,
        })),
    ];
}
function normalizeSelectedAspectRatio(value, options) {
    if (value === 'auto')
        return 'auto';
    const option = options.find((item) => item.value === value);
    return option && !option.disabled ? option.value : 'auto';
}
function buildResolutionOptions(capabilities, capabilityField) {
    const declared = Array.isArray(capabilities[capabilityField]) ? capabilities[capabilityField] : [];
    const supported = new Set(declared.map(String));
    const labels = { '1K': '1K（标准）', '2K': '2K（高清）', '4K': '4K（超清）' };
    return ['1K', '2K', '4K']
        .filter((value) => supported.has(value))
        .map((value) => ({ value, label: labels[value] }));
}
