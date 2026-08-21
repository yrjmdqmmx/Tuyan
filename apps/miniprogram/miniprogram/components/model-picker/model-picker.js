"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const model_registry_1 = require("../../utils/model-registry");
const PROVIDER_LABELS = {
    gemini: 'Google Gemini API', openai: 'OpenAI', bailian: '阿里百炼', ark: '火山方舟', openrouter: 'OpenRouter',
};
const MODEL_PAGE_SIZE = 30;
Component({
    options: { styleIsolation: 'apply-shared' },
    properties: {
        show: { type: Boolean, value: false, observer(show) { if (show)
                this.resetFlow(); } },
        registry: { type: Object, value: {} },
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
        compatibleModels: [],
        visibleCompatibleModels: [],
        incompatibleModels: [],
        activeProvider: '',
        activeProviderLabel: '',
        activeVendor: '',
        activeProviderIsAggregator: false,
        query: '',
        catalogMode: 'recommended',
        visibleLimit: MODEL_PAGE_SIZE,
        hasMore: false,
        showIncompatible: false,
    },
    methods: {
        noop() { },
        resetFlow() {
            const registry = this.properties.registry;
            const role = normalizeRole(this.properties.role);
            if (!registry || !registry.providers) {
                this.setData({ step: 'providers', roleLabel: roleLabel(role), providerCards: [], vendorCards: [], compatibleModels: [], visibleCompatibleModels: [] });
                return;
            }
            const providerCards = model_registry_1.MODEL_PROVIDER_IDS.map((id) => {
                const provider = registry.providers[id];
                const partition = (0, model_registry_1.partitionRegistryModels)(provider.models, { role, outputFormat: String(this.properties.outputFormat || '') });
                return { id, label: PROVIDER_LABELS[id], kindText: provider.accessKind === 'aggregator' ? '聚合渠道' : '官方直连', count: partition.compatible.length };
            }).filter((item) => item.count > 0);
            this.setData({
                step: 'providers', roleLabel: roleLabel(role), providerCards, vendorCards: [], compatibleModels: [], visibleCompatibleModels: [], incompatibleModels: [],
                activeProvider: '', activeProviderLabel: '', activeVendor: '', activeProviderIsAggregator: false, query: '', catalogMode: 'recommended', visibleLimit: MODEL_PAGE_SIZE, showIncompatible: false,
            });
        },
        selectProvider(event) {
            const providerId = String(event.currentTarget.dataset.provider || '');
            const registry = this.properties.registry;
            const provider = registry.providers[providerId];
            if (!provider)
                return;
            const role = normalizeRole(this.properties.role);
            const partition = (0, model_registry_1.partitionRegistryModels)(provider.models, { role, outputFormat: String(this.properties.outputFormat || '') });
            const compatibleIds = new Set(partition.compatible.map((item) => item.id));
            const vendorCards = (0, model_registry_1.groupRegistryModels)([...partition.compatible, ...partition.incompatible]).map((group) => ({
                vendor: group.vendor,
                count: group.models.length,
                compatibleCount: group.models.filter((item) => compatibleIds.has(item.id)).length,
            })).filter((item) => item.compatibleCount > 0);
            const isAggregator = provider.accessKind === 'aggregator';
            this.setData({
                activeProvider: providerId, activeProviderLabel: PROVIDER_LABELS[providerId] || providerId,
                activeProviderIsAggregator: isAggregator, activeVendor: '', vendorCards, query: '', catalogMode: 'recommended',
                visibleLimit: MODEL_PAGE_SIZE, showIncompatible: false, step: isAggregator ? 'vendors' : 'models',
            });
            if (!isAggregator)
                this.refreshModelLists();
        },
        selectVendor(event) {
            const vendor = String(event.currentTarget.dataset.vendor || '');
            if (!vendor)
                return;
            this.setData({ activeVendor: vendor, step: 'models', query: '', visibleLimit: MODEL_PAGE_SIZE, showIncompatible: false });
            this.refreshModelLists();
        },
        backStep() {
            if (this.data.step === 'models') {
                this.setData({ step: this.data.activeProviderIsAggregator ? 'vendors' : 'providers', query: '', showIncompatible: false });
                return;
            }
            if (this.data.step === 'vendors')
                this.setData({ step: 'providers' });
        },
        refreshModelLists() {
            var _a;
            const registry = this.properties.registry;
            const providerId = this.data.activeProvider;
            const provider = (_a = registry === null || registry === void 0 ? void 0 : registry.providers) === null || _a === void 0 ? void 0 : _a[providerId];
            if (!provider)
                return;
            const role = normalizeRole(this.properties.role);
            const options = { role, query: this.data.query, outputFormat: String(this.properties.outputFormat || ''), recommendedOnly: providerId === 'openrouter' && this.data.catalogMode === 'recommended' };
            let partition = (0, model_registry_1.partitionRegistryModels)(provider.models, options);
            const inVendor = (model) => !this.data.activeProviderIsAggregator || model.vendor === this.data.activeVendor;
            if (options.recommendedOnly && !partition.compatible.some(inVendor)) {
                partition = (0, model_registry_1.partitionRegistryModels)(provider.models, { ...options, recommendedOnly: false });
                this.setData({ catalogMode: 'all' });
            }
            const compatibleModels = partition.compatible.filter(inVendor).map((model) => presentModel(model, this.properties.selectedProvider, this.properties.selectedModel, providerId));
            const incompatibleModels = partition.incompatible.filter(inVendor).map((model) => presentModel(model, this.properties.selectedProvider, this.properties.selectedModel, providerId));
            const visibleLimit = Math.max(MODEL_PAGE_SIZE, Number(this.data.visibleLimit) || MODEL_PAGE_SIZE);
            this.setData({ compatibleModels, visibleCompatibleModels: compatibleModels.slice(0, visibleLimit), incompatibleModels, hasMore: visibleLimit < compatibleModels.length });
        },
        onSearch(event) {
            this.setData({ query: event.detail.value, visibleLimit: MODEL_PAGE_SIZE, showIncompatible: false });
            this.refreshModelLists();
        },
        setCatalogMode(event) {
            const catalogMode = event.currentTarget.dataset.mode === 'all' ? 'all' : 'recommended';
            this.setData({ catalogMode, visibleLimit: MODEL_PAGE_SIZE, showIncompatible: false });
            this.refreshModelLists();
        },
        loadMore() {
            this.setData({ visibleLimit: this.data.visibleLimit + MODEL_PAGE_SIZE });
            this.refreshModelLists();
        },
        toggleIncompatible() { this.setData({ showIncompatible: !this.data.showIncompatible }); },
        choose(event) {
            if (event.currentTarget.dataset.disabled)
                return;
            this.triggerEvent('select', { provider: this.data.activeProvider, modelId: String(event.currentTarget.dataset.model || '') });
        },
        close() { this.triggerEvent('close'); },
    },
});
function normalizeRole(value) { return value === 'image' || value === 'vision' ? value : 'main'; }
function roleLabel(role) { return role === 'image' ? '图像生成模型' : role === 'vision' ? '参考图识别模型' : '主模型'; }
function presentModel(model, selectedProvider, selectedModel, providerId) {
    return {
        ...model,
        lifecycleText: model.lifecycle === 'stable' ? '稳定版' : model.lifecycle === 'preview' ? '预览版' : model.lifecycle === 'legacy' ? '旧版维护' : '状态未知',
        verificationText: model.verificationState === 'inference-verified' ? '账号已验证' : model.verificationState === 'catalog' ? '目录未实测' : model.verified ? '注册表验证' : '未验证',
        selected: String(selectedProvider || '') === providerId && String(selectedModel || '') === model.id,
    };
}
