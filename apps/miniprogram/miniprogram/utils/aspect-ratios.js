"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CANONICAL_ASPECT_RATIOS = void 0;
exports.buildAspectRatioOptions = buildAspectRatioOptions;
exports.normalizeSelectedAspectRatio = normalizeSelectedAspectRatio;
exports.buildResolutionOptions = buildResolutionOptions;
exports.CANONICAL_ASPECT_RATIOS = ['1:1', '3:2', '2:3', '4:3', '3:4', '16:9', '9:16', '21:9', '1:4', '4:1', '1:2', '2:1', '4:5', '5:4', '1:8', '8:1', '5:2', '2:5', '9:21', '6:10', '14:10', '10:14', '19.5:9', '9:19.5', '20:9', '9:20', '1:3', '3:1', '5:8', '8:5', '9:22', '22:9', '9:23', '23:9', '3:8', '8:3', '5:12', '12:5', '10:16', '16:10', '2.35:1', '7:5', '5:7', '3:5', '5:3'];
function buildAspectRatioOptions(input) {
    const byResolution = input.capabilities[`${input.capabilityField}ByResolution`];
    const declared = byResolution && input.resolution ? (byResolution[input.resolution] || []) : Array.isArray(input.capabilities[input.capabilityField])
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
    const labels = { '512': '512（预览）', 'auto': '原生尺寸', '1K': '1K（标准）', '2K': '2K（高清）', '4K': '4K（超清）' };
    return ['512', '1K', '2K', '4K', 'auto']
        .filter((value) => supported.has(value))
        .map((value) => ({ value, label: labels[value] }));
}
