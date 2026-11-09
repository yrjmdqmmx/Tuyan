"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const model_audit_1 = require("../../utils/model-audit");
const model_presentation_1 = require("../../utils/model-presentation");
const model_registry_store_1 = require("../../utils/model-registry-store");
const provider_regions_1 = require("../../utils/provider-regions");
const model_registry_1 = require("../../utils/model-registry");
const PROVIDER_LABELS = model_presentation_1.MODEL_CHANNEL_LABELS;
const MODEL_PAGE_SIZE = 30;
Component({
    options: { styleIsolation: 'apply-shared' },
    properties: {
        show: { type: Boolean, value: false },
        registryVersion: { type: String, value: '' },
        providerRegions: { type: Object, value: {} },
        role: { type: String, value: 'main' },
        outputFormat: { type: String, value: 'png' },
        selectedProvider: { type: String, value: '' },
        selectedModel: { type: String, value: '' },
    },
    observers: {
        'show, registryVersion, providerRegions, role, outputFormat, selectedProvider, selectedModel'() {
            if (this.properties.show)
                this.resetFlow();
        },
    },
    data: {
        savedLifecycle: '',
        removedHint: '',
        savedReplacement: '',
        replacementLabel: '',
        expandedModel: '',
        step: 'providers',
        roleLabel: '主模型',
        providerCards: [],
        vendorCards: [],
        compatibleCount: 0,
        visibleCompatibleModels: [],
        activeProvider: '',
        activeProviderLabel: '',
        activeVendor: '',
        activeModelLabel: '',
        query: '',
        catalogMode: 'all',
        visibleLimit: MODEL_PAGE_SIZE,
        hasMore: false,
    },
    methods: {
        noop() { },
        getRegistry() { return (0, provider_regions_1.registryForRegions)((0, model_registry_store_1.getModelRegistryState)().registry, this.properties.providerRegions == null ? undefined : this.properties.providerRegions); },
        compatibleModels(providerId) {
            var _a, _b, _c;
            return (0, model_registry_1.partitionRegistryModels)(((_c = (_b = (_a = this.getRegistry()) === null || _a === void 0 ? void 0 : _a.providers) === null || _b === void 0 ? void 0 : _b[providerId]) === null || _c === void 0 ? void 0 : _c.models) || [], {
                role: normalizeRole(this.properties.role), outputFormat: String(this.properties.outputFormat || ''),
            }).compatible;
        },
        vendorsFor(providerId) {
            return (0, model_registry_1.groupRegistryModels)(this.compatibleModels(providerId)).map(group => ({ vendor: group.vendor, count: group.models.length }));
        },
        selectedModelLabel(providerId, vendor) {
            var _a;
            if (providerId !== this.properties.selectedProvider || !vendor)
                return '';
            return ((_a = this.compatibleModels(providerId).find(model => model.id === this.properties.selectedModel && (0, model_presentation_1.modelDeveloper)(providerId, model).label === vendor)) === null || _a === void 0 ? void 0 : _a.label) || '';
        },
        resetFlow() {
            const registry = this.getRegistry();
            const providerCards = (0, model_presentation_1.orderModelChannels)(model_registry_1.MODEL_PROVIDER_IDS).map(id => {
                var _a;
                return ({
                    id, label: PROVIDER_LABELS[id], kindText: ((_a = registry === null || registry === void 0 ? void 0 : registry.providers[id]) === null || _a === void 0 ? void 0 : _a.accessKind) === 'aggregator' ? '聚合渠道' : '官方直连',
                    count: this.compatibleModels(id).length,
                });
            }).filter(item => item.count > 0);
            const lifecycle = (0, model_audit_1.auditedModelLifecycle)(String(this.properties.selectedProvider), String(this.properties.selectedModel));
            const removed = (0, model_audit_1.removedModel)(String(this.properties.selectedProvider), String(this.properties.selectedModel));
            const replacement = this.compatibleModels(String(this.properties.selectedProvider)).find(model => model.id === ((removed === null || removed === void 0 ? void 0 : removed.replacementApiId) || (lifecycle === null || lifecycle === void 0 ? void 0 : lifecycle.replacement)));
            this.setData({ removedHint: (0, model_audit_1.removedModelHint)(String(this.properties.selectedProvider), String(this.properties.selectedModel)), savedLifecycle: (lifecycle === null || lifecycle === void 0 ? void 0 : lifecycle.message) || '', savedReplacement: (replacement === null || replacement === void 0 ? void 0 : replacement.id) || '', replacementLabel: (replacement === null || replacement === void 0 ? void 0 : replacement.label) || '' });
            const selectedProvider = String(this.properties.selectedProvider || '');
            const activeProvider = providerCards.some(item => item.id === selectedProvider) ? selectedProvider : '';
            const vendorCards = activeProvider ? this.vendorsFor(activeProvider) : [];
            const selected = this.compatibleModels(activeProvider).find(model => model.id === this.properties.selectedModel);
            const activeVendor = selected ? (0, model_presentation_1.modelDeveloper)(activeProvider, selected).label : '';
            this.setData({
                step: 'providers', roleLabel: roleLabel(normalizeRole(this.properties.role)), providerCards, vendorCards,
                activeProvider, activeProviderLabel: activeProvider ? PROVIDER_LABELS[activeProvider] : '', activeVendor,
                activeModelLabel: (selected === null || selected === void 0 ? void 0 : selected.label) || '',
                query: '', expandedModel: '', catalogMode: 'all', visibleLimit: MODEL_PAGE_SIZE, compatibleCount: 0, visibleCompatibleModels: [], hasMore: false,
            });
        },
        selectProvider(event) {
            const providerId = String(event.currentTarget.dataset.provider || '');
            if (!this.data.providerCards.some(item => item.id === providerId))
                return;
            const vendorCards = this.vendorsFor(providerId);
            if (!vendorCards.length)
                return;
            const activeVendor = providerId === this.data.activeProvider && vendorCards.some(item => item.vendor === this.data.activeVendor) ? this.data.activeVendor : '';
            this.setData({
                activeProvider: providerId, activeProviderLabel: PROVIDER_LABELS[providerId] || providerId,
                activeVendor, activeModelLabel: this.selectedModelLabel(providerId, activeVendor), vendorCards,
                step: 'vendors', query: '', expandedModel: '', catalogMode: 'all', visibleLimit: MODEL_PAGE_SIZE,
                compatibleCount: 0, visibleCompatibleModels: [], hasMore: false,
            });
        },
        showProviders() { this.setData({ step: 'providers', query: '', expandedModel: '' }); },
        showVendors() {
            if (!this.data.activeProvider)
                return;
            this.setData({ step: 'vendors', vendorCards: this.vendorsFor(this.data.activeProvider), query: '', expandedModel: '' });
        },
        showModels() {
            if (!this.data.activeVendor || !this.vendorsFor(this.data.activeProvider).some(item => item.vendor === this.data.activeVendor))
                return;
            this.setData({ step: 'models', query: '', expandedModel: '', visibleLimit: MODEL_PAGE_SIZE });
            this.refreshModelLists();
        },
        selectVendor(event) {
            const vendor = String(event.currentTarget.dataset.vendor || '');
            if (!this.vendorsFor(this.data.activeProvider).some(item => item.vendor === vendor))
                return;
            this.setData({ activeVendor: vendor, activeModelLabel: this.selectedModelLabel(this.data.activeProvider, vendor) });
            this.showModels();
        },
        backStep() {
            if (this.data.step === 'models')
                this.showVendors();
            else if (this.data.step === 'vendors')
                this.showProviders();
        },
        refreshModelLists() {
            var _a, _b;
            const providerId = this.data.activeProvider;
            const provider = (_b = (_a = this.getRegistry()) === null || _a === void 0 ? void 0 : _a.providers) === null || _b === void 0 ? void 0 : _b[providerId];
            if (!provider || !this.data.activeVendor) {
                this.setData({ compatibleCount: 0, visibleCompatibleModels: [], hasMore: false });
                return;
            }
            const options = { role: normalizeRole(this.properties.role), query: this.data.query, outputFormat: String(this.properties.outputFormat || ''), recommendedOnly: providerId === 'openrouter' && this.data.catalogMode === 'recommended' };
            let partition = (0, model_registry_1.partitionRegistryModels)(provider.models, options);
            const inVendor = (model) => (0, model_presentation_1.modelDeveloper)(providerId, model).label === this.data.activeVendor;
            if (options.recommendedOnly && !partition.compatible.some(inVendor)) {
                partition = (0, model_registry_1.partitionRegistryModels)(provider.models, { ...options, recommendedOnly: false });
                this.setData({ catalogMode: 'all' });
            }
            const compatibleModels = partition.compatible.filter(inVendor).map(model => presentModel(model, this.properties.selectedProvider, this.properties.selectedModel, providerId));
            const visibleLimit = Math.max(MODEL_PAGE_SIZE, Number(this.data.visibleLimit) || MODEL_PAGE_SIZE);
            this.setData({ compatibleCount: compatibleModels.length, visibleCompatibleModels: compatibleModels.slice(0, visibleLimit), hasMore: visibleLimit < compatibleModels.length });
        },
        onSearch(event) {
            this.setData({ query: event.detail.value, visibleLimit: MODEL_PAGE_SIZE });
            this.refreshModelLists();
        },
        setCatalogMode(event) {
            this.setData({ catalogMode: event.currentTarget.dataset.mode === 'all' ? 'all' : 'recommended', visibleLimit: MODEL_PAGE_SIZE });
            this.refreshModelLists();
        },
        loadMore() { this.setData({ visibleLimit: this.data.visibleLimit + MODEL_PAGE_SIZE }); this.refreshModelLists(); },
        choose(event) {
            if (this.data.step !== 'models' || !this.data.activeVendor || event.currentTarget.dataset.disabled)
                return;
            const modelId = String(event.currentTarget.dataset.model || '');
            if (!this.compatibleModels(this.data.activeProvider).some(model => model.id === modelId && (0, model_presentation_1.modelDeveloper)(this.data.activeProvider, model).label === this.data.activeVendor))
                return;
            this.triggerEvent('select', { provider: this.data.activeProvider, modelId });
        },
        confirmReplacement() {
            const replacement = this.data.savedReplacement;
            if (!replacement || !this.compatibleModels(String(this.properties.selectedProvider)).some(model => model.id === replacement))
                return;
            wx.showModal({ title: '确认切换模型', content: `${(0, model_audit_1.modelDisplayName)(String(this.properties.selectedProvider), String(this.properties.selectedModel))} → ${(0, model_audit_1.modelDisplayName)(String(this.properties.selectedProvider), replacement)}。只修改当前选择，其他预设与历史记录保持不变。`, success: result => {
                    if (result.confirm && this.compatibleModels(String(this.properties.selectedProvider)).some(model => model.id === replacement))
                        this.triggerEvent('select', { provider: this.properties.selectedProvider, modelId: replacement });
                } });
        },
        copySource(event) { wx.showModal({ title: '官方文档', content: [event.currentTarget.dataset.notice, event.currentTarget.dataset.source].filter(Boolean).join('\n'), confirmText: '复制链接', success: result => { if (result.confirm)
                wx.setClipboardData({ data: String(event.currentTarget.dataset.url || '') }); } }); },
        copyId(event) { wx.setClipboardData({ data: String(event.currentTarget.dataset.model || '') }); },
        toggleDetails(event) { const id = String(event.currentTarget.dataset.model || ''); this.setData({ expandedModel: this.data.expandedModel === id ? '' : id }); },
        close() { this.triggerEvent('close'); },
    },
});
function normalizeRole(value) { return value === 'image' || value === 'vision' ? value : 'main'; }
function roleLabel(role) { return role === 'image' ? '图像生成模型' : role === 'vision' ? '参考图识别模型' : '主模型'; }
function presentModel(model, selectedProvider, selectedModel, providerId) {
    var _a, _b, _c;
    const audit = (0, model_audit_1.auditedModelSpecs)(providerId, model.id), lifecycle = (0, model_audit_1.auditedModelLifecycle)(providerId, model.id);
    const names = { text: '文本', image: '图像', audio: '音频', video: '视频', file: '文件', document: '文件' };
    const display = (fact) => fact.state === 'known' ? Array.isArray(fact.value) ? fact.value.map(x => names[x]).join('、') : `${typeof fact.value === 'string' ? fact.value : (0, model_presentation_1.formatContextLimit)(Number(fact.value))} tokens${fact.suffix || ''}` : fact.state === 'unsupported' ? '不支持' : fact.state === 'not-applicable' ? '不适用' : '未知';
    const origin = (fact) => fact.provenance === 'catalog' ? '图研既有核实' : fact.provenance === 'product' ? '图研输入要求' : '';
    const image = model.roles.includes('image') && !(audit.fields.outputModalities.value || []).includes('text') && !['totalContextTokens', 'maxOutputTokens'].some(k => audit.fields[k].state === 'known');
    return {
        scheduled: (lifecycle === null || lifecycle === void 0 ? void 0 : lifecycle.state) === 'scheduled',
        vendorLabel: (0, model_presentation_1.modelDeveloper)(providerId, model).label, channelLabel: PROVIDER_LABELS[providerId],
        specRows: [['inputModalities', '输入'], ['outputModalities', '输出'], ['totalContextTokens', '上下文窗口'], ['maxOutputTokens', '最大输出']].map(([key, label]) => ({ label, value: image && key.endsWith('Tokens') && audit.fields[key].state === 'unknown' ? '不适用' : key.endsWith('Modalities') && audit.fields[key].state === 'unknown' ? '模态未知' : display(audit.fields[key]), origin: origin(audit.fields[key]), unknown: audit.fields[key].state === 'unknown', unknownText: (key.endsWith('Modalities') && audit.fields[key].state === 'known' && Array.isArray(audit.fields[key].value) ? ['text', 'image', 'audio', 'video'].filter(x => !audit.fields[key].value.includes(x)) : []).map(x => names[x]).join('、') })),
        specSources: [...new Set([lifecycle === null || lifecycle === void 0 ? void 0 : lifecycle.sourceUrl, ...Object.values(audit.fields).map(f => f.sourceUrl), audit.sourceUrl].filter((url) => Boolean(url)))].map(url => ({ url, label: `${url === (lifecycle === null || lifecycle === void 0 ? void 0 : lifecycle.sourceUrl) ? '下线公告' : '官方文档'} · ${url.split('/')[2]}` })),
        auditMessage: [lifecycle === null || lifecycle === void 0 ? void 0 : lifecycle.message, audit.note, ...Object.entries(audit.fields).filter(([, f]) => origin(f)).map(([key, f]) => `${{ inputModalities: '输入', outputModalities: '输出', totalContextTokens: '上下文窗口', maxOutputTokens: '最大输出' }[key]}：${origin(f)}`), ...[['totalContextTokens', '上下文窗口'], ['maxOutputTokens', '最大输出']].map(([key, label]) => audit.fields[key].state === 'known' ? `${label}：${audit.fields[key].value} tokens` : '')].filter(Boolean).join('\n'),
        id: model.id, label: model.label,
        availabilityNotes: [model.availabilityNotes, ((_a = model.capabilities) === null || _a === void 0 ? void 0 : _a.requiresSourceImage) ? '仅图像编辑' : '', model.expirationDate && !model.expirationDate.startsWith('2098') ? `官方到期日：${model.expirationDate}` : '', model.earliestRetirementDate ? `最早退役日：${model.earliestRetirementDate}，以正式公告为准` : '', model.replacementModelId ? `迁移目标：${model.replacementModelId}` : ''].filter(Boolean).join(' · '),
        versionLabel: (0, model_presentation_1.modelVersionLabel)(model), versionText: (0, model_presentation_1.modelVersionDetail)(model), apiIdentifier: model.apiIdentifier || model.id,
        capabilityText: [model.roles.includes('main') ? '文本' : '', model.roles.includes('vision') ? '视觉理解' : '', model.roles.includes('image') && !((_b = model.capabilities) === null || _b === void 0 ? void 0 : _b.requiresSourceImage) ? '生图' : '', ((_c = model.capabilities) === null || _c === void 0 ? void 0 : _c.imageEditMode) === 'direct-edit' ? '编辑' : ''].filter(Boolean).join(' · '),
        selected: String(selectedProvider || '') === providerId && String(selectedModel || '') === model.id,
    };
}
