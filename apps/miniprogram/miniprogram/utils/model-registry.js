"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MODEL_PROVIDER_IDS = void 0;
exports.normalizeModelRegistry = normalizeModelRegistry;
exports.modelAvailabilityPresentation = modelAvailabilityPresentation;
exports.partitionRegistryModels = partitionRegistryModels;
exports.groupRegistryModels = groupRegistryModels;
exports.findRegistryModel = findRegistryModel;
exports.MODEL_PROVIDER_IDS = ['gemini', 'openai', 'bailian', 'ark', 'openrouter'];
function normalizeModelRegistry(input) {
    const source = asRecord(input);
    const registryVersion = stringValue(source.registryVersion);
    const routeContractVersion = numberValue(source.routeContractVersion);
    if (!registryVersion)
        throw new Error('服务端模型目录缺少版本。');
    if (routeContractVersion < 1 || source.supportsModelRoutes !== true) {
        throw new Error('服务端模型路由契约不可用。');
    }
    const providerSource = asRecord(source.providers);
    const missingProviders = exports.MODEL_PROVIDER_IDS.filter((id) => !providerSource[id]);
    if (missingProviders.length)
        throw new Error('服务端模型目录必须包含五个 API 渠道。');
    const providers = {};
    for (const providerId of exports.MODEL_PROVIDER_IDS) {
        providers[providerId] = normalizeProvider(providerId, providerSource[providerId]);
    }
    return { registryVersion, routeContractVersion, supportsModelRoutes: true, providers };
}
function normalizeProvider(providerId, input) {
    const source = asRecord(input);
    const defaultsSource = asRecord(source.defaults);
    const modelsSource = Array.isArray(source.models) ? source.models : [];
    if (!modelsSource.length)
        throw new Error(`${providerId} 模型目录为空。`);
    const models = modelsSource.map(normalizeModel);
    const uniqueIds = new Set(models.map((model) => model.id));
    if (uniqueIds.size !== models.length)
        throw new Error(`${providerId} 模型目录包含重复 ID。`);
    const defaults = {
        main: stringValue(defaultsSource.main),
        image: stringValue(defaultsSource.image),
        vision: stringValue(defaultsSource.vision),
    };
    const labels = { main: '主模型', image: '图像模型', vision: '识别模型' };
    for (const role of ['main', 'image', 'vision']) {
        const entry = models.find((model) => model.id === defaults[role]);
        if (!entry || entry.selectable === false || !entry.roles.includes(role)) {
            throw new Error(`${providerId} 默认${labels[role]}无效。`);
        }
    }
    return {
        accessKind: stringValue(source.accessKind) || 'direct',
        routeContractVersion: numberValue(source.routeContractVersion) || 1,
        accountCatalogRequired: source.accountCatalogRequired === true,
        defaults,
        models,
    };
}
function normalizeModel(input) {
    const source = asRecord(input);
    const id = stringValue(source.id);
    if (!id)
        throw new Error('模型目录包含空 ID。');
    const roles = stringArray(source.roles).filter(isModelRole);
    const roleReasonsSource = asRecord(source.roleReasons);
    return {
        id,
        label: stringValue(source.label) || id,
        vendor: stringValue(source.vendor) || '其他',
        lifecycle: stringValue(source.lifecycle) || 'unknown',
        recommended: source.recommended === true,
        requiresEntitlement: source.requiresEntitlement === true,
        entitlement: stringValue(source.entitlement),
        verified: source.verified === true,
        verificationState: stringValue(source.verificationState) || 'unverified',
        selectable: source.selectable !== false,
        disabledReason: stringValue(source.disabledReason),
        roles,
        roleReasons: {
            main: stringValue(roleReasonsSource.main),
            image: stringValue(roleReasonsSource.image),
            vision: stringValue(roleReasonsSource.vision),
        },
        inputModalities: stringArray(source.inputModalities),
        outputModalities: stringArray(source.outputModalities),
        protocol: stringValue(source.protocol),
        availabilityNotes: stringValue(source.availabilityNotes),
        releasedAt: validReleasedAt(source.releasedAt),
        capabilities: asRecord(source.capabilities),
    };
}
function modelAvailabilityPresentation(model) {
    const lifecycleLabel = model.lifecycle === 'stable'
        ? '稳定'
        : model.lifecycle === 'preview'
            ? '预览'
            : model.lifecycle === 'deprecated'
                ? '即将下线'
                : '生命周期未知';
    const state = stringValue(model.verificationState);
    return {
        lifecycleLabel,
        verificationLabel: state === 'inference-verified'
            ? '当前账号实测可用'
            : state === 'registry' && model.verified === true
                ? '注册表已验证'
                : state === 'catalog'
                    ? '目录可见，尚未实测'
                    : '尚未验证当前账号',
        verifiedForAccount: state === 'inference-verified',
    };
}
function partitionRegistryModels(models, options) {
    const query = stringValue(options.query).toLocaleLowerCase('zh-CN');
    const annotated = models
        .filter((model) => model.roles.includes(options.role) || Boolean(model.roleReasons[options.role]))
        .filter((model) => !options.recommendedOnly || (model.recommended && model.lifecycle === 'stable'))
        .filter((model) => !query || modelSearchValues(model).some((value) => value.toLocaleLowerCase('zh-CN').includes(query)))
        .map((model) => annotateModel(model, options.role, stringValue(options.outputFormat)))
        .sort(compareModels);
    return {
        compatible: annotated.filter((model) => !model.selectionDisabled),
        incompatible: annotated.filter((model) => Boolean(model.selectionDisabled)),
    };
}
function groupRegistryModels(models) {
    const groups = new Map();
    for (const model of models) {
        const current = groups.get(model.vendor) || [];
        current.push(model);
        groups.set(model.vendor, current);
    }
    return [...groups.entries()]
        .sort(([left], [right]) => vendorIndex(left) - vendorIndex(right) || left.localeCompare(right, 'zh-CN'))
        .map(([vendor, vendorModels]) => ({ vendor, models: vendorModels.sort(compareReleasedAt) }));
}
function findRegistryModel(registry, provider, modelId) {
    if (!registry || !exports.MODEL_PROVIDER_IDS.includes(provider))
        return null;
    return registry.providers[provider].models.find((model) => model.id === modelId) || null;
}
function annotateModel(model, role, outputFormat) {
    const capabilities = model.capabilities || {};
    const formats = stringArray(capabilities.outputFormats);
    const roleMismatch = !model.roles.includes(role);
    const formatMismatch = role === 'image' && Boolean(outputFormat) && formats.length > 0 && !formats.includes(outputFormat);
    return {
        ...model,
        selectionDisabled: !model.selectable || roleMismatch || formatMismatch,
        selectionDisabledReason: model.disabledReason
            || (roleMismatch ? model.roleReasons[role] || '服务端未授权该模型用于当前角色' : '')
            || (formatMismatch ? `该模型不支持 ${outputFormat.toUpperCase()} 输出` : ''),
    };
}
function modelSearchValues(model) {
    return [model.id, model.label, model.vendor, model.protocol, model.availabilityNotes, model.disabledReason, ...model.roles];
}
const VENDOR_ORDER = ['OpenAI', 'Google', 'Anthropic', 'Alibaba Qwen', 'Alibaba Wan', 'ByteDance Doubao', 'ByteDance Seedream'];
function vendorIndex(vendor) {
    const index = VENDOR_ORDER.indexOf(vendor);
    return index < 0 ? 999 : index;
}
function compareModels(left, right) {
    return vendorIndex(left.vendor) - vendorIndex(right.vendor)
        || left.vendor.localeCompare(right.vendor, 'zh-CN')
        || compareReleasedAt(left, right);
}
function compareReleasedAt(left, right) {
    if (left.releasedAt && right.releasedAt)
        return right.releasedAt.localeCompare(left.releasedAt);
    if (left.releasedAt)
        return -1;
    if (right.releasedAt)
        return 1;
    return 0;
}
function validReleasedAt(value) {
    const text = stringValue(value);
    return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
}
function isModelRole(value) {
    return value === 'main' || value === 'image' || value === 'vision';
}
function asRecord(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}
function stringArray(value) {
    return Array.isArray(value) ? value.map(stringValue).filter(Boolean) : [];
}
function stringValue(value) {
    return typeof value === 'string' ? value.trim() : '';
}
function numberValue(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}
