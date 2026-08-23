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
    }
}
exports.BusinessError = BusinessError;
function toBusinessError(httpStatus, input) {
    const data = input && typeof input === 'object' ? input : {};
    const businessCode = text(data.businessCode) || (typeof data.code === 'string' ? data.code : '');
    const detail = text(data.detail);
    const message = text(data.error) || text(data.message) || detail || `HTTP ${httpStatus}`;
    return new BusinessError(message, { httpStatus, code: data.code, businessCode, detail });
}
function businessErrorGuidance(error) {
    const mapping = {
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
