"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CANONICAL_ASPECT_RATIOS = void 0;
exports.buildAspectRatioOptions = buildAspectRatioOptions;
exports.normalizeSelectedAspectRatio = normalizeSelectedAspectRatio;
exports.buildResolutionOptions = buildResolutionOptions;
// Generated from packages/types/src/aspect-ratios.ts
exports.CANONICAL_ASPECT_RATIOS = ['1:1', '3:2', '2:3', '4:3', '3:4', '16:9', '9:16', '21:9', '1:4', '4:1', '1:2', '2:1', '4:5', '5:4', '1:8', '8:1', '5:2', '2:5', '9:21', '6:10', '14:10', '10:14', '19.5:9', '9:19.5', '20:9', '9:20', '1:3', '3:1', '5:8', '8:5', '9:22', '22:9', '9:23', '23:9', '3:8', '8:3', '5:12', '12:5', '10:16', '16:10', '2.35:1', '7:5', '5:7', '3:5', '5:3'];
function buildAspectRatioOptions(input) {
    const capabilities = input.capabilities || {};
    const byResolution = capabilities[`${input.capabilityField}ByResolution`];
    const resolutionField = input.capabilityField === 'refineAspectRatios' ? 'refineResolutions' : 'resolutions';
    const resolutions = capabilities[resolutionField];
    if (input.resolution && Array.isArray(resolutions) && !resolutions.includes(input.resolution))
        return [];
    // A present but empty map means this operation is unavailable. A missing key
    // means the selected resolution is unavailable, including automatic sizing.
    if (byResolution && (!input.resolution || !Object.prototype.hasOwnProperty.call(byResolution, input.resolution)))
        return [];
    const declared = byResolution ? byResolution[input.resolution] : capabilities[input.capabilityField];
    if (!Array.isArray(declared))
        return [];
    const supported = new Set(declared.map(String));
    return [
        { value: 'auto', label: '自动', disabled: false, reason: '' },
        ...exports.CANONICAL_ASPECT_RATIOS.filter((value) => supported.has(value)).map((value) => ({ value, label: value, disabled: false, reason: '' })),
    ];
}
function normalizeSelectedAspectRatio(value, options) {
    var _a, _b, _c;
    return ((_a = options.find((option) => option.value === value && !option.disabled)) === null || _a === void 0 ? void 0 : _a.value)
        || ((_b = options.find((option) => option.value === 'auto' && !option.disabled)) === null || _b === void 0 ? void 0 : _b.value)
        || ((_c = options.find((option) => !option.disabled)) === null || _c === void 0 ? void 0 : _c.value) || '';
}
function buildResolutionOptions(capabilities, capabilityField) {
    const declared = Array.isArray(capabilities[capabilityField]) ? capabilities[capabilityField] : [];
    const supported = new Set(declared.map(String));
    const labels = { '512': '512（预览）', 'auto': '原生尺寸', '1K': '1K（标准）', '2K': '2K（高清）', '4K': '4K（超清）' };
    return ['512', '1K', '2K', '4K', 'auto']
        .filter((value) => supported.has(value))
        .map((value) => ({ value, label: labels[value] }));
}
