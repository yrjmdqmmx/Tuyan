// Generated from packages/api/src/universal-api.ts
/** Versioned, user-declared BYOK contract. No model-name or vendor-name inference. */
export const UNIVERSAL_PROTOCOLS = ['openai-chat', 'openai-responses', 'openai-images', 'anthropic-messages', 'gemini-generate-content', 'gemini-interactions', 'dashscope-multimodal'];
const universalErrorMessages = {
    DNS_RESOLUTION_FAILED: ['network', '无法解析 API 地址，尚未发送模型请求。', '请检查域名拼写和 DNS 服务，再重新检查连接。'],
    NETWORK_ERROR: ['network', '模型请求发送过程中连接中断，结果尚未确认。', '请检查连接，并先到渠道核对本次请求与费用；系统不会自动重发。'],
    REQUEST_TIMEOUT: ['timeout', '连接检查或模型请求超时。', '若请求状态为未发送，可重新检查连接；若结果未知，请先到渠道核对请求与费用。'],
    UPSTREAM_FAILURE: ['provider', '渠道服务异常，已发送请求的结果尚未确认。', '请先到渠道核对本次请求与费用，待渠道恢复后再决定是否手动重试。'],
    ENDPOINT_NOT_FOUND: ['configuration', '渠道未找到当前操作地址，或该地址不提供此模型。', '请核对 API 基础地址、协议和准确模型 ID。'],
    MODEL_NOT_FOUND: ['configuration', '渠道未找到当前模型，或此账号没有该模型权益。', '请从当前账号目录核对准确模型 ID 与访问权益。'],
    CONFIG_INVALID: ['configuration', '通用 API 配置不完整或字段无效。', '请明确填写协议、准确模型 ID、能力和输入输出限额。'],
    ENDPOINT_UNSAFE: ['security', 'API 地址未通过公网 HTTPS 安全校验。', '请使用公网 HTTPS 443 基础地址；不要填写内网、完整操作端点或重定向地址。'],
    CREDENTIAL_MISMATCH: ['authentication', '此密钥未绑定当前连接地址、协议和鉴权方式。', '请在当前连接中重新保存密钥。'],
    CAPABILITY_UNSUPPORTED: ['capability', '此连接未声明或当前协议不支持本步骤所需能力。', '请选择支持该步骤的协议与模型，核对文字、识图、生图或编辑能力。'],
    INPUT_LIMIT: ['input', '本次输入超过已声明的数量、大小、尺寸或请求额度。', '请减少输入或图片，或核对当前型号的实际限额。'],
    IMAGE_INVALID: ['input', '图片内容、格式或尺寸无效。', '请重新导出 PNG、JPEG 或 WebP 图片后再试。'],
    OUTPUT_SIZE_UNSUPPORTED: ['capability', '当前连接未声明所选分辨率和比例的输出尺寸。', '请补充准确的尺寸映射，或选择已声明的尺寸。'],
    UPSTREAM_REJECTED: ['provider', '模型渠道拒绝了本次请求。', '请核对模型 ID、账号权益、额度与协议配置后再手动重试。'],
    RESULT_UNKNOWN: ['provider', '请求已发出，但结果未确认，可能已产生费用。', '请先到渠道核对请求和费用；系统不会自动重发。'],
    ASYNC_UNSUPPORTED: ['provider', '渠道返回异步任务或未完成结果，当前同步模式无法确认产物。', '请到渠道核对任务和费用；系统不会重新提交任务。'],
    RESPONSE_INVALID: ['provider', '渠道响应不符合当前协议的完整产物格式。', '请核对协议与兼容选项，并到渠道确认结果和费用。'],
    RESPONSE_LIMIT: ['provider', '渠道响应或产物超过已声明的安全额度。', '请核对输出限额，并到渠道确认已有结果；不要直接重复提交。'],
    CATALOG_UNSUPPORTED: ['capability', '该协议暂未提供可安全使用的只读目录检查。', '可手动填写准确模型 ID；配置通过不代表模型调用已验证。'],
};
export class UniversalApiError extends Error {
    code;
    requestState;
    category;
    reason;
    suggestion;
    uncertain;
    status;
    recoveryAction;
    publicReason;
    constructor(code, requestState = 'not_sent', status) {
        const [category, reason, suggestion] = universalErrorMessages[code];
        super(reason);
        this.code = code;
        this.requestState = requestState;
        this.name = 'UniversalApiError';
        this.category = category;
        this.reason = reason;
        this.suggestion = suggestion;
        this.uncertain = requestState === 'unknown';
        this.status = status ?? (code === 'DNS_RESOLUTION_FAILED' ? 503 : code === 'REQUEST_TIMEOUT' ? 504 : requestState === 'not_sent' ? 400 : 502);
        this.recoveryAction = requestState === 'unknown' ? 'reconcile_provider' : status === 401 || status === 403 ? 'reauthorize_api_key' : status === 402 ? 'top_up_balance' : status === 429 ? 'rate_limit' : 'review_configuration';
        if (status === 401 || status === 403) {
            this.category = 'authentication';
            this.reason = '渠道拒绝了密钥或当前模型的访问权限。';
            this.suggestion = '请更新当前连接密钥，并核对账号中的模型访问权益。';
        }
        if (status === 402) {
            this.category = 'billing';
            this.reason = '渠道余额或计费状态不允许本次请求。';
            this.suggestion = '请在渠道核对余额与计费状态后手动重试。';
        }
        if (status === 429) {
            this.category = 'rate_limit';
            this.reason = '渠道请求频率或当前额度已达到上限。';
            this.suggestion = '请在渠道核对频率与额度，稍后手动重试。';
        }
        this.message = this.reason;
        this.publicReason = this.reason;
    }
    toJSON() { return { code: this.code, message: this.message, category: this.category, reason: this.reason, suggestion: this.suggestion, requestState: this.requestState, uncertain: this.uncertain, recoveryAction: this.recoveryAction, ...(this.status ? { status: this.status } : {}) }; }
}
export const UNIVERSAL_PLATFORM_LIMITS = { maxCount: 8, maxBytes: 20 * 1024 * 1024, maxTotalBytes: 80 * 1024 * 1024, maxDimension: 16384, maxPixels: 32000000, requestMaxBytes: 120 * 1024 * 1024 };
const universalMimeTypes = ['image/png', 'image/jpeg', 'image/webp'];
function universalRecord(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function universalString(value, max = 256) { return typeof value === 'string' && value.length > 0 && value.length <= max && value.trim() === value && !/[\x00-\x1f\x7f]/.test(value); }
export function universalDefaultAuth(protocol) { return protocol === 'anthropic-messages' ? 'x-api-key' : protocol.startsWith('gemini-') ? 'x-goog-api-key' : 'bearer'; }
export function normalizeUniversalBaseUrl(value, protocol) {
    if (!UNIVERSAL_PROTOCOLS.includes(protocol) || !universalString(value, 2048) || /[^\x21-\x7e]|\\|%/u.test(value))
        throw new UniversalApiError('ENDPOINT_UNSAFE');
    let url;
    try {
        url = new URL(value);
    }
    catch {
        throw new UniversalApiError('ENDPOINT_UNSAFE');
    }
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || url.port && url.port !== '443' || url.username || url.password || url.search || url.hash
        || !host || host.endsWith('.') || host === 'localhost' || /\.(localhost|local|internal|test|invalid)$/.test(host)
        || /\/(?:\.\.?)(?:\/|$)/.test(value) || /\/{2}/.test(url.pathname))
        throw new UniversalApiError('ENDPOINT_UNSAFE');
    const path = url.pathname.replace(/\/+$/, '');
    if (/(?:\/chat\/completions|\/responses|\/images\/(?:generations|edits)|\/messages|\/interactions|:generateContent|\/multimodal-generation\/generation|\/models)$/i.test(path))
        throw new UniversalApiError('ENDPOINT_UNSAFE');
    const prefix = protocol.startsWith('gemini-') ? '/v1beta' : protocol === 'dashscope-multimodal' ? '/api/v1' : '/v1';
    return url.origin + (path || prefix);
}
function universalPositive(value, cap, zero = false) {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < (zero ? 0 : 1))
        throw new UniversalApiError('CONFIG_INVALID');
    return Math.min(value, cap);
}
function universalMimes(value) {
    if (!Array.isArray(value) || !value.length || value.some(x => !universalMimeTypes.includes(x)) || new Set(value).size !== value.length)
        throw new UniversalApiError('CONFIG_INVALID');
    return [...value];
}
export function normalizeUniversalRoute(value) {
    if (!universalRecord(value) || value.accessProvider !== 'custom' || !universalString(value.modelId) || /(?:^|\/)\.\.?(?:\/|$)|\\/.test(value.modelId) || !universalRecord(value.custom))
        throw new UniversalApiError('CONFIG_INVALID');
    const c = value.custom;
    if (c.version !== 1 || !universalString(c.connectionId, 80) || !/^[a-zA-Z0-9_-]+$/.test(c.connectionId) || !UNIVERSAL_PROTOCOLS.includes(c.protocol))
        throw new UniversalApiError('CONFIG_INVALID');
    const auth = c.auth === undefined ? universalDefaultAuth(c.protocol) : c.auth;
    if (!['bearer', 'x-api-key', 'x-goog-api-key'].includes(auth))
        throw new UniversalApiError('CONFIG_INVALID');
    const compatibility = c.compatibility === undefined ? 'standard' : c.compatibility;
    if (!['standard', 'openrouter-image', 'ark-images'].includes(compatibility)
        || compatibility === 'openrouter-image' && c.protocol !== 'openai-chat'
        || compatibility === 'ark-images' && c.protocol !== 'openai-images')
        throw new UniversalApiError('CONFIG_INVALID');
    if (!universalRecord(c.capabilities) || ['text', 'vision', 'imageGeneration', 'imageEditing'].some(k => typeof c.capabilities[k] !== 'boolean'))
        throw new UniversalApiError('CONFIG_INVALID');
    const capabilities = { text: c.capabilities.text, vision: c.capabilities.vision, imageGeneration: c.capabilities.imageGeneration, imageEditing: c.capabilities.imageEditing };
    if (!Object.values(capabilities).some(Boolean) || capabilities.vision && !capabilities.text)
        throw new UniversalApiError('CONFIG_INVALID');
    const textOnly = c.protocol === 'anthropic-messages' || c.protocol === 'openai-responses' || c.protocol === 'openai-chat' && compatibility !== 'openrouter-image';
    if (textOnly && (capabilities.imageGeneration || capabilities.imageEditing) || c.protocol === 'openai-images' && (capabilities.text || capabilities.vision))
        throw new UniversalApiError('CAPABILITY_UNSUPPORTED');
    if (!universalRecord(c.inputLimits) || !universalRecord(c.outputLimits))
        throw new UniversalApiError('CONFIG_INVALID');
    const i = c.inputLimits, o = c.outputLimits, caps = UNIVERSAL_PLATFORM_LIMITS;
    const inputLimits = {
        maxCount: universalPositive(i.maxCount, caps.maxCount, true), maxBytes: universalPositive(i.maxBytes, caps.maxBytes), maxTotalBytes: universalPositive(i.maxTotalBytes, caps.maxTotalBytes),
        maxDimension: universalPositive(i.maxDimension, caps.maxDimension), maxPixels: universalPositive(i.maxPixels, caps.maxPixels), requestMaxBytes: universalPositive(i.requestMaxBytes, caps.requestMaxBytes), mimeTypes: universalMimes(i.mimeTypes),
    };
    const outputLimits = { maxBytes: universalPositive(o.maxBytes, caps.maxBytes), maxDimension: universalPositive(o.maxDimension, caps.maxDimension), maxPixels: universalPositive(o.maxPixels, caps.maxPixels), mimeTypes: universalMimes(o.mimeTypes) };
    if ((capabilities.vision || capabilities.imageEditing) && inputLimits.maxCount < 1)
        throw new UniversalApiError('CONFIG_INVALID');
    let outputSizes;
    if (c.outputSizes !== undefined) {
        if (!Array.isArray(c.outputSizes) || c.outputSizes.length > 256)
            throw new UniversalApiError('CONFIG_INVALID');
        outputSizes = c.outputSizes.map((s) => {
            if (!universalRecord(s) || !universalString(s.resolution, 24) || !universalString(s.aspectRatio, 24) || !universalString(s.value, 40)
                || !/^(?:auto|\d+(?:\.\d+)?:\d+(?:\.\d+)?)$/.test(s.aspectRatio)
                || !/^[a-zA-Z0-9.*_-]+$/.test(s.value))
                throw new UniversalApiError('CONFIG_INVALID');
            return { resolution: s.resolution, aspectRatio: s.aspectRatio, value: s.value };
        });
        if (new Set(outputSizes.map(x => `${x.resolution}|${x.aspectRatio}`)).size !== outputSizes.length)
            throw new UniversalApiError('CONFIG_INVALID');
    }
    if ((capabilities.imageGeneration || capabilities.imageEditing) && !outputSizes?.length)
        throw new UniversalApiError('CONFIG_INVALID');
    return { accessProvider: 'custom', modelId: value.modelId, custom: { version: 1, connectionId: c.connectionId, protocol: c.protocol, baseUrl: normalizeUniversalBaseUrl(c.baseUrl, c.protocol), auth, compatibility, capabilities, inputLimits, outputLimits, ...(outputSizes ? { outputSizes } : {}) } };
}
/** Credential envelopes are request-only; never persist them with task records. */
export function universalCredential(routeValue, serializedCustomKeys) {
    const route = normalizeUniversalRoute(routeValue), c = route.custom;
    let keys;
    try {
        keys = typeof serializedCustomKeys === 'string' && serializedCustomKeys.length <= 256 * 1024 ? JSON.parse(serializedCustomKeys) : null;
    }
    catch {
        throw new UniversalApiError('CREDENTIAL_MISMATCH');
    }
    const entry = universalRecord(keys) && Object.prototype.hasOwnProperty.call(keys, c.connectionId) ? keys[c.connectionId] : null;
    if (!universalRecord(entry) || entry.protocol !== c.protocol || (entry.auth ?? universalDefaultAuth(c.protocol)) !== c.auth
        || !universalString(entry.apiKey, 16384) || /[^\x21-\x7e]/.test(entry.apiKey))
        throw new UniversalApiError('CREDENTIAL_MISMATCH');
    try {
        if (normalizeUniversalBaseUrl(entry.baseUrl, c.protocol) !== c.baseUrl)
            throw new Error();
    }
    catch {
        throw new UniversalApiError('CREDENTIAL_MISMATCH');
    }
    return entry.apiKey;
}
export function universalReferencePolicy(routeValue) {
    const c = normalizeUniversalRoute(routeValue).custom;
    return { ...c.inputLimits, maxCount: c.capabilities.vision || c.capabilities.imageEditing ? c.inputLimits.maxCount : 0, minDimension: 1, maxAspectRatio: 200, status: 'user-declared', source: 'user', note: '用户明确声明的型号限额，已受平台上限约束；未验证真实模型调用。' };
}
export function universalModelEntry(routeValue) {
    const route = normalizeUniversalRoute(routeValue), c = route.custom, image = c.capabilities.imageGeneration || c.capabilities.imageEditing;
    const roles = [...(c.capabilities.text ? ['main'] : []), ...(c.capabilities.vision ? ['vision'] : []), ...(image ? ['image'] : [])];
    const protocol = c.protocol === 'openai-chat' ? c.compatibility === 'openrouter-image' ? 'openrouter-images' : 'openai-chat-completions' : c.protocol === 'dashscope-multimodal' ? 'bailian-multimodal-generation' : c.protocol;
    return { id: route.modelId, label: route.modelId, vendor: '自定义连接', lifecycle: 'stable', releaseKind: '', lifecycleSourceUrl: '', recommended: false, requiresEntitlement: true, entitlement: '请自行核对该连接中的模型权益与计费。',
        inputModalities: c.capabilities.vision || c.capabilities.imageEditing ? ['text', 'image'] : ['text'], outputModalities: [...(c.capabilities.text ? ['text'] : []), ...(image ? ['image'] : [])],
        verified: false, verificationState: 'user-declared', selectable: true, releasedAt: null, expirationDate: null, earliestRetirementDate: null, roles, protocol, roleProtocols: Object.fromEntries(roles.map(role => [role, protocol])), officialSourceUrl: '', availabilityNotes: '配置已校验；能力与限额来自用户声明，尚未验证真实调用。',
        capabilities: { referenceImages: c.capabilities.vision || c.capabilities.imageEditing, maxReferenceImages: c.capabilities.vision || c.capabilities.imageEditing ? c.inputLimits.maxCount : 0, imageGeneration: c.capabilities.imageGeneration, imageEditing: c.capabilities.imageEditing, imageEditMode: c.capabilities.imageEditing ? 'direct-edit' : 'none', resolutions: [...new Set(c.outputSizes?.map(x => x.resolution) || [])], aspectRatios: [...new Set(c.outputSizes?.map(x => x.aspectRatio) || [])], refineResolutions: c.capabilities.imageEditing ? [...new Set(c.outputSizes?.map(x => x.resolution) || [])] : [], refineAspectRatios: c.capabilities.imageEditing ? [...new Set(c.outputSizes?.map(x => x.aspectRatio) || [])] : [], aspectRatiosByResolution: Object.fromEntries([...new Set(c.outputSizes?.map(x => x.resolution) || [])].map(resolution => [resolution, c.outputSizes.filter(x => x.resolution === resolution).map(x => x.aspectRatio)])), refineAspectRatiosByResolution: c.capabilities.imageEditing ? Object.fromEntries([...new Set(c.outputSizes?.map(x => x.resolution) || [])].map(resolution => [resolution, c.outputSizes.filter(x => x.resolution === resolution).map(x => x.aspectRatio)])) : {}, outputFormats: ['png'] } };
}
