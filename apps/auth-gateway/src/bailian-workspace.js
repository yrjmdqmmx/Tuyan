// Generated from config/bailian-workspace.json and packages/api/src/bailian-workspace.ts
export const BAILIAN_WORKSPACE_CONTRACT = { "version": 2, "checkedAt": "2026-10-26", "regions": { "cn-beijing": "华北2（北京）", "ap-southeast-1": "新加坡", "us-east-1": "美国（弗吉尼亚）", "eu-central-1": "德国（法兰克福）", "ap-northeast-1": "日本（东京）" }, "models": { "deepseek-v4.1-flash-1017": { "regions": ["cn-beijing", "ap-southeast-1", "us-east-1", "eu-central-1", "ap-northeast-1"], "sourceUrls": ["https://help.aliyun.com/zh/model-studio/deepseek-api", "https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-chat-completions"], "productInputModalities": ["text", "image"], "notes": "文本与图片输入、文本输出；图片经本地读取后使用 Base64 Data URL，图研最多3张、4MiB/张、12MiB合计；音视频和工具未接入。真实调用未验证。" }, "MiniMax/MiniMax-M3.1-Flash": { "regions": ["cn-beijing"], "sourceUrls": ["https://help.aliyun.com/zh/model-studio/minimax-api-by-minimax", "https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-chat-completions"], "productInputModalities": ["text", "image"], "notes": "文本与图片输入、文本输出；图片经本地读取后使用 Base64 Data URL，图研最多3张、4MiB/张、12MiB合计；音视频和工具未接入。真实调用未验证。" }, "xiaomi/mimo-v2.6-pro-ultraspeed": { "regions": ["cn-beijing"], "sourceUrls": ["https://help.aliyun.com/zh/model-studio/mimo", "https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-chat-completions"], "productInputModalities": ["text", "image"], "notes": "文本与图片输入、文本输出；图片经本地读取后使用 Base64 Data URL，图研最多3张、4MiB/张、12MiB合计；音视频和工具未接入。真实调用未验证。" } } };
export const BAILIAN_WORKSPACE_REGIONS = BAILIAN_WORKSPACE_CONTRACT.regions;
export function bailianWorkspaceModel(modelId) {
    return Object.hasOwn(BAILIAN_WORKSPACE_CONTRACT.models, modelId);
}
function bailianConfigurationError(message) {
    return Object.assign(new Error(message), { status: 400, statusCode: 400, businessCode: 'BAILIAN_WORKSPACE_INVALID', publicMessage: true });
}
export function normalizeBailianWorkspace(value) {
    if (value == null)
        return undefined;
    const v = value;
    if (typeof value !== 'object' || Array.isArray(value) || typeof v.workspaceId !== 'string'
        || !/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/.test(v.workspaceId.trim())) {
        throw bailianConfigurationError('请填写有效的百炼业务空间 ID（1～63 位字母、数字或内部连字符，不填写网址）。');
    }
    if (typeof v.region !== 'string' || !Object.hasOwn(BAILIAN_WORKSPACE_REGIONS, v.region)) {
        throw bailianConfigurationError('请选择已支持的百炼服务地区。');
    }
    return { workspaceId: v.workspaceId.trim(), region: v.region };
}
// Only audited new identities opt in. Existing IDs keep their original route,
// even when the same connection also supplies a workspace for new models.
export function bailianRouteFields(provider, modelId, value) {
    if (provider !== 'bailian' || !bailianWorkspaceModel(modelId))
        return {};
    const workspace = normalizeBailianWorkspace(value);
    if (!workspace)
        throw bailianConfigurationError('此型号需要百炼业务空间 ID 和服务地区，请在模型管理中配置连接。');
    const allowed = BAILIAN_WORKSPACE_CONTRACT.models[modelId].regions;
    if (!allowed.includes(workspace.region))
        throw bailianConfigurationError('此百炼型号仅支持：' + allowed.map(region => BAILIAN_WORKSPACE_REGIONS[region]).join('、'));
    return { bailian: workspace };
}
export function bailianWorkspaceIssue(provider, modelId, value) {
    try {
        bailianRouteFields(provider, modelId, value);
        return '';
    }
    catch (error) {
        return error.message;
    }
}
export function bailianTextBaseUrl(modelId, value) {
    const { bailian } = bailianRouteFields('bailian', modelId, value);
    return bailian ? `https://${bailian.workspaceId}.${bailian.region}.maas.aliyuncs.com/compatible-mode/v1`
        : 'https://dashscope.aliyuncs.com/compatible-mode/v1';
}
