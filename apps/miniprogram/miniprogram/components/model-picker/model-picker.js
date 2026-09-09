"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const model_presentation_1 = require("../../utils/model-presentation");
const model_registry_store_1 = require("../../utils/model-registry-store");
const provider_regions_1 = require("../../utils/provider-regions");
const model_registry_1 = require("../../utils/model-registry");
const PROVIDER_LABELS = model_presentation_1.MODEL_CHANNEL_LABELS;
const MODEL_PAGE_SIZE = 30;
Component({
    options: { styleIsolation: 'apply-shared' },
    properties: {
        show: { type: Boolean, value: false, observer(show) { if (show)
                this.resetFlow(); } },
        registryVersion: { type: String, value: '', observer() { if (this.properties.show)
                this.resetFlow(); } },
        providerRegions: { type: Object, value: {} },
        role: { type: String, value: 'main' },
        outputFormat: { type: String, value: 'png' },
        selectedProvider: { type: String, value: '' },
        selectedModel: { type: String, value: '' },
    },
    data: {
        step: 'providers',
        roleLabel: '主模型',
        providerCards: [],
        vendorCards: [],
        compatibleCount: 0,
        visibleCompatibleModels: [],
        activeProvider: '',
        activeProviderLabel: '',
        activeVendor: '',
        activeProviderIsAggregator: false,
        query: '',
        catalogMode: 'all',
        visibleLimit: MODEL_PAGE_SIZE,
        hasMore: false,
        expandedModel: '',
    },
    methods: {
        noop() { },
        getRegistry() { return (0, provider_regions_1.registryForRegions)((0, model_registry_store_1.getModelRegistryState)().registry, this.properties.providerRegions); },
        resetFlow() {
            const registry = this.getRegistry();
            const role = normalizeRole(this.properties.role);
            if (!registry || !registry.providers) {
                this.setData({ step: 'providers', roleLabel: roleLabel(role), providerCards: [], vendorCards: [], compatibleCount: 0, visibleCompatibleModels: [] });
                return;
            }
            const providerCards = (0, model_presentation_1.orderModelChannels)(model_registry_1.MODEL_PROVIDER_IDS).map((id) => {
                const provider = registry.providers[id];
                const partition = (0, model_registry_1.partitionRegistryModels)((provider === null || provider === void 0 ? void 0 : provider.models) || [], { role, outputFormat: String(this.properties.outputFormat || '') });
                return {
                    id,
                    label: PROVIDER_LABELS[id],
                    kindText: (provider === null || provider === void 0 ? void 0 : provider.accessKind) === 'aggregator' ? '聚合渠道' : '官方直连',
                    count: partition.compatible.length,
                };
            }).filter((item) => item.count > 0);
            this.setData({
                step: 'providers', roleLabel: roleLabel(role), providerCards, vendorCards: [], compatibleCount: 0, visibleCompatibleModels: [],
                activeProvider: '', activeProviderLabel: '', activeVendor: '', activeProviderIsAggregator: false, query: '', catalogMode: 'all', visibleLimit: MODEL_PAGE_SIZE,
            });
        },
        selectProvider(event) {
            const providerId = String(event.currentTarget.dataset.provider || '');
            const registry = this.getRegistry();
            const provider = registry === null || registry === void 0 ? void 0 : registry.providers[providerId];
            if (!provider)
                return;
            const role = normalizeRole(this.properties.role);
            const partition = (0, model_registry_1.partitionRegistryModels)((provider === null || provider === void 0 ? void 0 : provider.models) || [], { role, outputFormat: String(this.properties.outputFormat || '') });
            const compatibleIds = new Set(partition.compatible.map((item) => item.id));
            const vendorCards = (0, model_registry_1.groupRegistryModels)(partition.compatible).map((group) => ({
                vendor: group.vendor,
                count: group.models.length,
                compatibleCount: group.models.filter((item) => compatibleIds.has(item.id)).length,
            }));
            const isAggregator = provider.accessKind === 'aggregator';
            this.setData({
                activeProvider: providerId, activeProviderLabel: PROVIDER_LABELS[providerId] || providerId,
                activeProviderIsAggregator: isAggregator, activeVendor: '', vendorCards, query: '', catalogMode: 'all',
                visibleLimit: MODEL_PAGE_SIZE, step: 'vendors',
            });
        },
        selectVendor(event) {
            const vendor = String(event.currentTarget.dataset.vendor || '');
            if (!vendor)
                return;
            this.setData({ activeVendor: vendor, step: 'models', query: '', visibleLimit: MODEL_PAGE_SIZE });
            this.refreshModelLists();
        },
        backStep() {
            if (this.data.step === 'models') {
                this.setData({ step: 'vendors', query: '' });
                return;
            }
            if (this.data.step === 'vendors')
                this.setData({ step: 'providers' });
        },
        refreshModelLists() {
            var _a;
            const registry = this.getRegistry();
            const providerId = this.data.activeProvider;
            const provider = (_a = registry === null || registry === void 0 ? void 0 : registry.providers) === null || _a === void 0 ? void 0 : _a[providerId];
            if (!provider)
                return;
            const role = normalizeRole(this.properties.role);
            const options = { role, query: this.data.query, outputFormat: String(this.properties.outputFormat || ''), recommendedOnly: providerId === 'openrouter' && this.data.catalogMode === 'recommended' };
            let partition = (0, model_registry_1.partitionRegistryModels)((provider === null || provider === void 0 ? void 0 : provider.models) || [], options);
            const inVendor = (model) => (0, model_presentation_1.modelDeveloper)(providerId, model).label === this.data.activeVendor;
            if (options.recommendedOnly && !partition.compatible.some(inVendor)) {
                partition = (0, model_registry_1.partitionRegistryModels)((provider === null || provider === void 0 ? void 0 : provider.models) || [], { ...options, recommendedOnly: false });
                this.setData({ catalogMode: 'all' });
            }
            const compatibleModels = partition.compatible.filter(inVendor).map((model) => presentModel(model, this.properties.selectedProvider, this.properties.selectedModel, providerId));
            const visibleLimit = Math.max(MODEL_PAGE_SIZE, Number(this.data.visibleLimit) || MODEL_PAGE_SIZE);
            this.setData({ compatibleCount: compatibleModels.length, visibleCompatibleModels: compatibleModels.slice(0, visibleLimit), hasMore: visibleLimit < compatibleModels.length });
        },
        onSearch(event) {
            this.setData({ query: event.detail.value, visibleLimit: MODEL_PAGE_SIZE });
            this.refreshModelLists();
        },
        setCatalogMode(event) {
            const catalogMode = event.currentTarget.dataset.mode === 'all' ? 'all' : 'recommended';
            this.setData({ catalogMode, visibleLimit: MODEL_PAGE_SIZE });
            this.refreshModelLists();
        },
        loadMore() {
            this.setData({ visibleLimit: this.data.visibleLimit + MODEL_PAGE_SIZE });
            this.refreshModelLists();
        },
        choose(event) {
            if (event.currentTarget.dataset.disabled)
                return;
            this.triggerEvent('select', { provider: this.data.activeProvider, modelId: String(event.currentTarget.dataset.model || '') });
        },
        copyId(event) { wx.setClipboardData({ data: String(event.currentTarget.dataset.model || '') }); },
        toggleDetails(event) { const id = String(event.currentTarget.dataset.model || ''); this.setData({ expandedModel: this.data.expandedModel === id ? '' : id }); },
        close() { this.triggerEvent('close'); },
    },
});
function normalizeRole(value) { return value === 'image' || value === 'vision' ? value : 'main'; }
function roleLabel(role) { return role === 'image' ? '图像生成模型' : role === 'vision' ? '参考图识别模型' : '主模型'; }
function presentModel(model, selectedProvider, selectedModel, providerId) {
    var _a, _b, _c;
    return {
        id: model.id, label: model.label, recommended: model.recommended, requiresEntitlement: model.requiresEntitlement,
        availabilityNotes: [model.availabilityNotes, ((_a = model.capabilities) === null || _a === void 0 ? void 0 : _a.requiresSourceImage) ? '仅图像编辑' : '', model.expirationDate && !model.expirationDate.startsWith('2098') ? `官方到期日：${model.expirationDate}` : '', model.earliestRetirementDate ? `最早退役日：${model.earliestRetirementDate}，以正式公告为准` : '', model.replacementModelId ? `迁移目标：${model.replacementModelId}` : ''].filter(Boolean).join(' · '),
        serviceTier: model.serviceTier || '',
        capabilityText: [model.roles.includes('main') ? '文本' : '', model.roles.includes('vision') ? '视觉理解' : '', model.roles.includes('image') && !((_b = model.capabilities) === null || _b === void 0 ? void 0 : _b.requiresSourceImage) ? '生图' : '', ((_c = model.capabilities) === null || _c === void 0 ? void 0 : _c.imageEditMode) === 'direct-edit' ? '编辑' : ''].filter(Boolean).join(' · '),
        releaseText: [model.releasedAt || (model.releaseOrder ? '按官方版本排序 · 日期待确认' : '发布日期待确认'), model.releaseKind === 'snapshot' ? '日期快照' : ''].filter(Boolean).join(' · '),
        lifecycleText: (0, model_presentation_1.modelLifecycleLabel)(model.lifecycle),
        verificationText: model.verificationState === 'inference-verified' ? '账号已验证' : model.verificationState === 'catalog' ? '官方目录' : model.verified ? '注册表验证' : '模型目录',
        selected: String(selectedProvider || '') === providerId && String(selectedModel || '') === model.id,
    };
}
