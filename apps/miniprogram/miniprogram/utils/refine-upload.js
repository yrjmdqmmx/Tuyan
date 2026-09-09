"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRefineFile = validateRefineFile;
exports.uploadRefineSource = uploadRefineSource;
const api_1 = require("./api");
function validateRefineFile(file, limits, route) {
    var _a, _b;
    if (!((_a = limits === null || limits === void 0 ? void 0 : limits.mimeTypes) === null || _a === void 0 ? void 0 : _a.length) || limits.version !== 1)
        throw new Error('当前服务端尚未提供精修上传能力，请稍后重试。');
    if (!limits.mimeTypes.includes(file.mimeType))
        throw new Error('请选择 PNG、JPG 或 WebP 图片。');
    const maxBytes = Math.min(limits.maxBytes, ((_b = limits.modelMaxBytes) === null || _b === void 0 ? void 0 : _b[`${route.accessProvider}/${route.modelId}`]) || Infinity);
    if (!Number.isFinite(file.size) || file.size <= 0 || file.size > maxBytes)
        throw new Error(`图片不能为空，且不能超过 ${(maxBytes / 1024 / 1024).toFixed(1)} MB。`);
    if (![file.width, file.height].every(n => Number.isInteger(n) && n > 0 && n <= limits.maxDimension) || file.width * file.height > limits.maxPixels)
        throw new Error(`图片尺寸超限：单边最多 ${limits.maxDimension} 像素，总像素不超过 ${limits.maxPixels / 1000000} MP。`);
}
async function uploadRefineSource(file, options) {
    var _a, _b;
    validateRefineFile(file, options.limits, options.route);
    const request = options.request || api_1.requestJson;
    const put = options.put || api_1.uploadReferenceFile;
    let uploads = [];
    let cleaned = false;
    const check = () => { if (!options.isCurrent())
        throw new Error('已取消上传。'); };
    const cleanup = async () => {
        if (cleaned || !uploads.length || !options.canCleanup())
            return;
        cleaned = true;
        await request({ action: 'abortReferenceUpload', uploads }).catch(() => undefined);
    };
    try {
        check();
        options.onStage('preparing');
        const prepared = await request({ action: 'prepareReferenceUpload', files: [{ clientId: 'refine-source', filename: file.filename, mimeType: file.mimeType, size: file.size }] });
        const raw = Array.isArray(prepared === null || prepared === void 0 ? void 0 : prepared.uploads) ? prepared.uploads : [];
        uploads = raw.map(({ objectKey, uploadToken, filename, mimeType, size }) => ({ objectKey, uploadToken, filename, mimeType, size }));
        check();
        if (raw.length !== 1 || !raw[0].uploadUrl || !raw[0].objectKey || !raw[0].uploadToken)
            throw new Error('无法获取图片上传地址，请重试。');
        options.onStage('uploading');
        await put(file.path, raw[0].uploadUrl, file.mimeType);
        check();
        options.onStage('checking');
        const finalized = await request({ action: 'finalizeReferenceUpload', uploads, purpose: 'refine' });
        check();
        const dimensions = { width: Number((_a = finalized === null || finalized === void 0 ? void 0 : finalized.source) === null || _a === void 0 ? void 0 : _a.width), height: Number((_b = finalized === null || finalized === void 0 ? void 0 : finalized.source) === null || _b === void 0 ? void 0 : _b.height) };
        validateRefineFile({ ...file, ...dimensions }, options.limits, options.route);
        options.onStage('ready');
        const source = { ...file, ...dimensions, url: file.path, objectKey: uploads[0].objectKey, uploaded: true };
        return { source, cleanup };
    }
    catch (error) {
        await cleanup();
        throw error;
    }
}
