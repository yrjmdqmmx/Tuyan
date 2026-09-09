"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessError = void 0;
exports.toBusinessError = toBusinessError;
exports.businessErrorGuidance = businessErrorGuidance;
class BusinessError extends Error {
    constructor(message, input) {
        super(message);
        this.name = 'BusinessError';
        this.httpStatus = input.httpStatus;
        this.code = input.code;
        this.businessCode = input.businessCode;
        this.detail = input.detail;
        this.retryAfterSeconds = input.retryAfterSeconds;
    }
}
exports.BusinessError = BusinessError;
function toBusinessError(httpStatus, input, headers) {
    const data = input && typeof input === 'object' ? input : {};
    const businessCode = text(data.businessCode) || (typeof data.code === 'string' ? data.code : '') || stableErrorIdentifier(data.error);
    const detail = text(data.detail);
    const message = text(data.error) || text(data.message) || detail || `HTTP ${httpStatus}`;
    return new BusinessError(message, { httpStatus, code: data.code, businessCode, detail, retryAfterSeconds: retryAfterFromHeaders(headers) });
}
function businessErrorGuidance(error) {
    const mapping = {
        INPUT_OPTIMIZATION_REQUEST_INVALID: { setting: 'input', message: '待优化内容无效或过长，原文已保留，请调整后重试。' },
        INPUT_OPTIMIZATION_ROUTE_INVALID: { setting: 'model-routing', message: '请选择支持输入优化的主模型。' },
        INPUT_OPTIMIZATION_KEY_REQUIRED: { setting: 'api-key', message: '请填写当前主模型接入渠道与区域的密钥。' },
        INPUT_OPTIMIZATION_PROVIDER_TIMEOUT: { setting: 'retry', message: '优化超时，原文已保留。请稍后手动重试。' },
        INPUT_OPTIMIZATION_PROVIDER_FAILED: { setting: 'retry', message: '优化服务暂时不可用，原文已保留。请检查模型权限或稍后重试。' },
        INPUT_OPTIMIZATION_RESULT_INVALID: { setting: 'retry', message: '优化结果无效，原文已保留。' },
        INPUT_OPTIMIZATION_NO_CHANGE: { setting: 'input', message: '优化结果与原文一致，已保留原文。' },
        REFINE_UPLOAD_INVALID: { setting: 'refine-source', message: '精修原图已失效或校验未通过，请重新上传。' },
        REFINE_IMAGE_SIZE_UNSUPPORTED: { setting: 'refine-resolution', message: '当前模型不支持此精修比例与清晰度组合，请重新选择。' },
        IMAGE_SIZE_UNSUPPORTED: { setting: 'aspect-ratio', message: '当前模型不支持此比例与清晰度组合，请重新选择。' },
        IMAGE_MODEL_EDIT_ONLY: { setting: 'model-routing', message: '当前模型仅支持编辑，请在精修中使用，或改选生图模型。' },
        MODEL_ROUTE_INVALID: { setting: 'model-routing', message: '模型路线已失效，请刷新目录并重新选择。' },
        ACCOUNT_REFERENCE_LIFECYCLE_MISMATCH: { setting: 'refine-source', message: '原图属于此前的账号状态，请重新上传。' },
        MODEL_ROUTE_CONFLICT: { setting: 'model-routing', message: '模型渠道与角色设置冲突，请重新选择模型路线。' },
        INVALID_ASPECT_RATIO: { setting: 'aspect-ratio', message: '图片比例无效，请选择注册表中的规范比例。' },
        ASPECT_RATIO_UNSUPPORTED: { setting: 'aspect-ratio', message: '当前图像模型不支持这个生成比例。' },
        REFERENCE_LIBRARY_REQUEST_INVALID: { setting: 'reference-library', message: '参考图库查询条件无效，请重置筛选。' },
        REFERENCE_LIBRARY_SELECTION_INVALID: { setting: 'reference-library', message: '参考图库选择已失效，请重新选择。' },
        REFERENCE_SELECTION_INVALID: { setting: 'reference-library', message: '参考图片选择无效，请重新选择。' },
        REFERENCE_SELECTION_LIMIT: { setting: 'reference-library', message: '参考图片最多选择 10 项。' },
        REFINE_RESOLUTION_UNSUPPORTED: { setting: 'refine-resolution', message: '当前图像模型不支持这个精修清晰度。' },
        REFINE_ASPECT_RATIO_UNSUPPORTED: { setting: 'refine-aspect-ratio', message: '当前图像模型不支持这个精修比例。' },
        RUNTIME_RESTARTED_RETRY: { setting: 'retry', message: '服务刚刚重启，请检查输入后重新提交。' },
    };
    if (mapping[error.businessCode])
        return mapping[error.businessCode];
    if (error.httpStatus === 429)
        return { setting: 'retry', message: '当前生成容量已满，请稍后重试。' };
    return { setting: '', message: error.message || '操作失败。' };
}
function text(value) {
    return typeof value === 'string' ? value.trim() : '';
}
function stableErrorIdentifier(value) {
    const identifier = text(value);
    return /^[A-Z][A-Z0-9_]*$/.test(identifier) ? identifier : '';
}
function retryAfterFromHeaders(headers) {
    if (!headers || typeof headers !== 'object')
        return undefined;
    const entries = Object.entries(headers);
    for (const preferredName of ['x-retry-after', 'retry-after']) {
        const match = entries.find(([name]) => name.toLocaleLowerCase() === preferredName);
        const value = Array.isArray(match === null || match === void 0 ? void 0 : match[1]) ? match === null || match === void 0 ? void 0 : match[1][0] : match === null || match === void 0 ? void 0 : match[1];
        const seconds = Number(value);
        if (Number.isFinite(seconds) && seconds > 0)
            return Math.ceil(seconds);
    }
    return undefined;
}
