"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tokendance_1 = require("../../utils/tokendance");
const model_presentation_1 = require("../../utils/model-presentation");
const model_registry_store_1 = require("../../utils/model-registry-store");
const provider_regions_1 = require("../../utils/provider-regions");
const aspect_ratios_1 = require("../../utils/aspect-ratios");
const api_1 = require("../../utils/api");
const ark_verification_1 = require("../../utils/ark-verification");
const constants_1 = require("../../utils/constants");
const model_registry_1 = require("../../utils/model-registry");
const model_routing_1 = require("../../utils/model-routing");
const reference_library_1 = require("../../utils/reference-library");
const PROVIDER_LABELS = model_presentation_1.MODEL_CHANNEL_LABELS;
Component({
    options: { styleIsolation: 'apply-shared', multipleSlots: true },
    properties: {
        show: { type: Boolean, value: false, observer(show) { this.epoch = Number(this.epoch || 0) + 1; if (show)
                this.resetDraft();
            else
                this.setData({ draftKeys: {}, keyFields: [], showModelPicker: false, verifyingArk: false }); } },
        purpose: { type: String, value: '' },
        referenceCount: { type: Number, value: 0 },
        referenceImageMode: { type: String, value: 'vision_model' },
        registryVersion: { type: String, value: '', observer() { if (this.properties.show)
                this.refreshPresentation(); } },
        settings: { type: Object, value: {} },
        apiKeys: { type: Object, value: {} },
        executionRoles: { type: Array, value: [] },
        manualReferenceIds: { type: Array, value: [] },
        libraryTaskName: { type: String, value: 'diagram' },
    },
    data: {
        emptyObject: {},
        draft: null,
        minimaxRegionOptions: [{ value: 'global', label: '国际' }, { value: 'cn', label: '中国大陆' }],
        minimaxRegionIndex: 0, minimaxApiBase: '',
        providerOptions: (0, model_presentation_1.orderModelChannels)(model_registry_1.MODEL_PROVIDER_IDS).map((value) => ({ value, label: PROVIDER_LABELS[value] })),
        providerIndex: 0,
        routeRows: [],
        ratioOptions: [],
        ratioIndex: 0,
        resolutionOptions: [],
        resolutionIndex: 0,
        outputOptions: [{ value: 'png', label: 'PNG 图片' }, { value: 'svg', label: 'SVG 矢量图' }],
        outputIndex: 0,
        pipelineOptions: [{ value: 'planner_critic', label: '规划器 + 评审器' }, { value: 'full', label: '完整流程' }, { value: 'vanilla', label: '基础生成' }],
        pipelineIndex: 0,
        retrievalOptions: [{ value: 'none', label: '不使用检索' }, { value: 'auto', label: '自动检索' }, { value: 'random', label: '随机参考' }, { value: 'manual', label: '手动参考' }],
        retrievalIndex: 0,
        candidateOptions: [{ value: 1, label: '1 张' }, { value: 2, label: '2 张' }, { value: 3, label: '3 张' }],
        candidateIndex: 0,
        criticOptions: [{ value: 0, label: '0 轮' }, { value: 1, label: '1 轮' }, { value: 2, label: '2 轮' }],
        criticIndex: 1,
        keyFields: [],
        encryptedRecovery: false,
        draftKeys: {},
        draftManualReferenceIds: [],
        showModelPicker: false,
        editingRole: 'main',
        pickerProvider: '',
        pickerModel: '',
        error: '',
        arkStatus: '',
        verifyingArk: false,
    },
    methods: {
        openTokenDance: tokendance_1.openTokenDance,
        noop() { },
        // Keep full capability metadata in the logic-layer store, outside setData.
        getRegistry() { var _a; return (0, provider_regions_1.registryForRegions)((0, model_registry_store_1.getModelRegistryState)().registry, (_a = this.data.draft) === null || _a === void 0 ? void 0 : _a.providerRegions); },
        effectiveRoles() {
            const draft = this.data.draft;
            if (!draft || !this.properties.purpose)
                return normalizeRoles(this.properties.executionRoles);
            if (this.properties.purpose === 'optimize')
                return ['main'];
            const registry = this.getRegistry();
            const image = (0, model_registry_1.findRegistryModel)(registry, draft.modelRoutes.image.accessProvider, draft.modelRoutes.image.modelId);
            if (this.properties.purpose === 'refine')
                return (0, model_routing_1.requiredRefineRouteRoles)({ refineMode: String((image === null || image === void 0 ? void 0 : image.capabilities.imageEditMode) || 'none') });
            const main = (0, model_registry_1.findRegistryModel)(registry, draft.modelRoutes.main.accessProvider, draft.modelRoutes.main.modelId);
            const referenceMode = draft.configurationMode === 'simple' ? ((main === null || main === void 0 ? void 0 : main.inputModalities.includes('image')) || (main === null || main === void 0 ? void 0 : main.capabilities.referenceImages) === true ? 'main_model' : 'vision_model') : this.properties.referenceImageMode;
            return (0, model_routing_1.requiredCreateRouteRoles)({ ...draft, taskName: this.properties.libraryTaskName, imageRefineMode: image === null || image === void 0 ? void 0 : image.capabilities.imageEditMode, referenceImages: this.properties.referenceCount > 0 ? [{}] : [], referenceImageMode: referenceMode }, draft.maxCriticRounds);
        },
        resetDraft() {
            const registry = (0, model_registry_store_1.getModelRegistryState)().registry;
            const incoming = this.properties.settings;
            if (!registry || !incoming) {
                this.setData({ draft: null, error: '模型目录尚未就绪，暂时不能编辑生成设置。' });
                return;
            }
            const draft = cloneDraft(incoming);
            draft.providerRegions = draft.providerRegions || {};
            this.setData({
                draft,
                draftKeys: { ...(this.properties.apiKeys || {}) },
                draftManualReferenceIds: [...(this.properties.manualReferenceIds || [])],
                error: '',
            });
            this.refreshPresentation();
        },
        refreshPresentation() {
            var _a;
            const draft = this.data.draft;
            const registry = this.getRegistry();
            if (!draft || !registry)
                return;
            const providerOptions = (0, model_presentation_1.orderModelChannels)(model_registry_1.MODEL_PROVIDER_IDS).filter((id) => {
                var _a;
                const defaults = (_a = registry.providers[id]) === null || _a === void 0 ? void 0 : _a.defaults;
                return (defaults === null || defaults === void 0 ? void 0 : defaults.main) && (defaults === null || defaults === void 0 ? void 0 : defaults.image) && (defaults === null || defaults === void 0 ? void 0 : defaults.vision);
            }).map((value) => ({ value, label: PROVIDER_LABELS[value] }));
            const imageEntry = (0, model_registry_1.findRegistryModel)(registry, draft.modelRoutes.image.accessProvider, draft.modelRoutes.image.modelId);
            const refinement = this.properties.purpose === 'refine' || (this.properties.libraryTaskName === 'plot' && (imageEntry === null || imageEntry === void 0 ? void 0 : imageEntry.capabilities.imageEditMode) === 'direct-edit');
            const resolutionOptions = (0, aspect_ratios_1.buildResolutionOptions)((imageEntry === null || imageEntry === void 0 ? void 0 : imageEntry.capabilities) || {}, refinement ? 'refineResolutions' : 'resolutions');
            if (this.properties.purpose !== 'optimize' && draft.outputFormat === 'png' && !resolutionOptions.some((item) => item.value === draft.imageSize)) {
                draft.imageSize = ((_a = resolutionOptions[0]) === null || _a === void 0 ? void 0 : _a.value) || '';
            }
            const ratioAll = (0, aspect_ratios_1.buildAspectRatioOptions)({ capabilities: (imageEntry === null || imageEntry === void 0 ? void 0 : imageEntry.capabilities) || {}, capabilityField: refinement ? 'refineAspectRatios' : 'aspectRatios', modelLabel: imageEntry === null || imageEntry === void 0 ? void 0 : imageEntry.label, resolution: draft.imageSize });
            const ratioOptions = ratioAll.filter((item) => !item.disabled).map((item) => ({ value: item.value, label: item.label }));
            if (this.properties.purpose !== 'optimize')
                draft.aspectRatio = (0, aspect_ratios_1.normalizeSelectedAspectRatio)(draft.aspectRatio, ratioAll);
            const routeRows = (this.properties.purpose === 'optimize' ? ['main'] : ['main', 'image', 'vision']).map((role) => {
                const route = draft.modelRoutes[role];
                const model = (0, model_registry_1.findRegistryModel)(registry, route.accessProvider, route.modelId);
                return {
                    role, label: role === 'main' ? '主模型' : role === 'image' ? '图像生成模型' : '参考图识别模型',
                    provider: route.accessProvider, providerLabel: PROVIDER_LABELS[route.accessProvider] || route.accessProvider,
                    modelId: route.modelId, modelLabel: (model === null || model === void 0 ? void 0 : model.label) || route.modelId,
                };
            });
            const providers = (0, model_routing_1.uniqueProvidersForRoles)(draft.modelRoutes, this.effectiveRoles());
            const keyFields = providers.map((provider) => ({
                provider, label: PROVIDER_LABELS[provider] || provider, value: (0, provider_regions_1.selectRegionApiKeys)(this.data.draftKeys, draft.providerRegions)[provider] || '',
                placeholder: provider === 'gemini' ? 'AIza...' : provider === 'openrouter' ? 'sk-or-v1-...' : 'sk-...',
            }));
            const probes = (0, model_routing_1.arkProbesForRoles)(draft.modelRoutes, this.effectiveRoles());
            const missing = (0, model_routing_1.missingArkVerifications)(probes, (0, ark_verification_1.getArkVerification)());
            const arkStatus = probes.length ? (missing.length ? `${missing.length} 条 Ark 路线可选验证` : 'Ark 路线已验证') : '';
            this.setData({
                draft, routeRows, ratioOptions, resolutionOptions, keyFields, encryptedRecovery: providers.includes('tokendance'),
                providerOptions,
                minimaxRegionIndex: (0, provider_regions_1.minimaxRegion)(draft.providerRegions) === 'cn' ? 1 : 0,
                minimaxApiBase: provider_regions_1.MINIMAX_REGIONS[(0, provider_regions_1.minimaxRegion)(draft.providerRegions)].apiBase,
                providerIndex: Math.max(0, providerOptions.findIndex((item) => item.value === draft.simpleProvider)),
                ratioIndex: Math.max(0, ratioOptions.findIndex((item) => item.value === draft.aspectRatio)),
                resolutionIndex: Math.max(0, resolutionOptions.findIndex((item) => item.value === draft.imageSize)),
                outputIndex: draft.outputFormat === 'svg' ? 1 : 0,
                pipelineIndex: Math.max(0, this.data.pipelineOptions.findIndex((item) => item.value === draft.pipelineMode)),
                retrievalIndex: Math.max(0, this.data.retrievalOptions.findIndex((item) => item.value === draft.retrievalSetting)),
                candidateIndex: Math.max(0, this.data.candidateOptions.findIndex((item) => item.value === draft.numCandidates)),
                criticIndex: Math.max(0, this.data.criticOptions.findIndex((item) => item.value === draft.maxCriticRounds)),
                arkStatus,
            });
        },
        setMode(event) {
            const draft = this.data.draft;
            if (!draft)
                return;
            draft.configurationMode = event.currentTarget.dataset.mode === 'advanced' ? 'advanced' : 'simple';
            const registry = this.getRegistry();
            if (!registry)
                return;
            if (draft.configurationMode === 'simple')
                draft.modelRoutes = (0, model_routing_1.providerDefaultRoutes)(draft.simpleProvider, registry);
            this.setData({ draft });
            this.refreshPresentation();
        },
        onProviderChange(event) {
            var _a;
            const draft = this.data.draft;
            if (!draft)
                return;
            const index = Number(event.detail.value) || 0;
            const provider = (_a = this.data.providerOptions[index]) === null || _a === void 0 ? void 0 : _a.value;
            if (!provider)
                return;
            draft.simpleProvider = provider;
            const registry = this.getRegistry();
            if (!registry)
                return;
            draft.modelRoutes = (0, model_routing_1.providerDefaultRoutes)(provider, registry);
            this.setData({ draft });
            this.refreshPresentation();
        },
        openModelPicker(event) {
            const draft = this.data.draft;
            const role = normalizeRole(event.currentTarget.dataset.role);
            if (!draft || (draft.configurationMode !== 'advanced' && this.properties.purpose !== 'optimize'))
                return;
            this.setData({ editingRole: role, showModelPicker: true, pickerProvider: draft.modelRoutes[role].accessProvider, pickerModel: draft.modelRoutes[role].modelId });
        },
        closeModelPicker() { this.setData({ showModelPicker: false }); },
        selectModel(event) {
            const draft = this.data.draft;
            if (!draft)
                return;
            if (this.properties.purpose === 'optimize')
                draft.configurationMode = 'advanced';
            draft.modelRoutes[this.data.editingRole] = { accessProvider: event.detail.provider, modelId: event.detail.modelId };
            this.setData({ draft, showModelPicker: false });
            this.refreshPresentation();
        },
        onOutputChange(event) {
            const draft = this.data.draft;
            if (!draft)
                return;
            draft.outputFormat = Number(event.detail.value) === 1 ? 'svg' : 'png';
            this.setData({ draft });
            this.refreshPresentation();
        },
        onRatioChange(event) {
            var _a;
            const draft = this.data.draft;
            if (!draft)
                return;
            draft.aspectRatio = ((_a = this.data.ratioOptions[Number(event.detail.value) || 0]) === null || _a === void 0 ? void 0 : _a.value) || 'auto';
            this.setData({ draft, ratioIndex: Number(event.detail.value) || 0 });
            this.refreshPresentation();
        },
        onResolutionChange(event) {
            var _a;
            const draft = this.data.draft;
            if (!draft)
                return;
            draft.imageSize = ((_a = this.data.resolutionOptions[Number(event.detail.value) || 0]) === null || _a === void 0 ? void 0 : _a.value) || '';
            this.setData({ draft, resolutionIndex: Number(event.detail.value) || 0 });
            this.refreshPresentation();
        },
        onPipelineChange(event) {
            var _a;
            const draft = this.data.draft;
            if (!draft)
                return;
            draft.pipelineMode = ((_a = this.data.pipelineOptions[Number(event.detail.value) || 0]) === null || _a === void 0 ? void 0 : _a.value) || 'planner_critic';
            this.setData({ draft, pipelineIndex: Number(event.detail.value) || 0 });
            this.refreshPresentation();
        },
        onRetrievalChange(event) {
            var _a;
            const draft = this.data.draft;
            if (!draft)
                return;
            draft.retrievalSetting = ((_a = this.data.retrievalOptions[Number(event.detail.value) || 0]) === null || _a === void 0 ? void 0 : _a.value) || 'none';
            this.setData({ draft, retrievalIndex: Number(event.detail.value) || 0 });
            this.refreshPresentation();
        },
        selectRetrieval(event) {
            var _a;
            const draft = this.data.draft;
            if (!draft)
                return;
            const value = String(event.currentTarget.dataset.value || 'none');
            const retrievalIndex = Math.max(0, this.data.retrievalOptions.findIndex((item) => item.value === value));
            draft.retrievalSetting = ((_a = this.data.retrievalOptions[retrievalIndex]) === null || _a === void 0 ? void 0 : _a.value) || 'none';
            this.setData({ draft, retrievalIndex });
            this.refreshPresentation();
        },
        onManualReferenceToggle(event) {
            const result = (0, reference_library_1.toggleReferenceSelection)(this.data.draftManualReferenceIds, String(event.detail.id || ''), constants_1.MANUAL_REFERENCE_LIMIT);
            this.setData({ draftManualReferenceIds: result.ids, error: result.error });
        },
        onCandidateChange(event) {
            var _a;
            const draft = this.data.draft;
            if (!draft)
                return;
            draft.numCandidates = ((_a = this.data.candidateOptions[Number(event.detail.value) || 0]) === null || _a === void 0 ? void 0 : _a.value) || 1;
            this.setData({ draft, candidateIndex: Number(event.detail.value) || 0 });
            this.refreshPresentation();
        },
        onCriticChange(event) {
            var _a;
            const draft = this.data.draft;
            if (!draft)
                return;
            draft.maxCriticRounds = ((_a = this.data.criticOptions[Number(event.detail.value) || 0]) === null || _a === void 0 ? void 0 : _a.value) || 0;
            this.setData({ draft, criticIndex: Number(event.detail.value) || 0 });
            this.refreshPresentation();
        },
        onMiniMaxRegionChange(event) {
            var _a;
            const draft = this.data.draft;
            if (!draft)
                return;
            const region = Number(event.detail.value) === 1 ? 'cn' : 'global';
            if (region === 'cn' && !((_a = this.getRegistry()) === null || _a === void 0 ? void 0 : _a.providerRegionContractVersion)) {
                this.setData({ error: '当前服务端尚未支持 MiniMax 国内区域。' });
                return;
            }
            draft.providerRegions = { minimax: region };
            if (region === 'global' && draft.modelRoutes.image.accessProvider === 'minimax' && draft.modelRoutes.image.modelId === 'image-01-live')
                draft.modelRoutes.image.modelId = 'image-01';
            this.setData({ draft, error: '' });
            this.refreshPresentation();
        },
        onKeyInput(event) {
            var _a;
            const provider = String(event.currentTarget.dataset.provider || '');
            if (provider === 'ark' && this.data.draftKeys.ark !== event.detail.value)
                (0, ark_verification_1.clearArkVerification)();
            const draftKeys = { ...this.data.draftKeys, [(0, provider_regions_1.regionApiKeySlot)(provider, (_a = this.data.draft) === null || _a === void 0 ? void 0 : _a.providerRegions)]: event.detail.value };
            this.setData({ draftKeys });
            this.refreshPresentation();
        },
        verifyArkRoutes() {
            const draft = this.data.draft;
            if (!draft || this.data.verifyingArk)
                return;
            const probes = (0, model_routing_1.arkProbesForRoles)(draft.modelRoutes, this.effectiveRoles());
            if (!probes.length)
                return;
            if (!String(this.data.draftKeys.ark || '').trim()) {
                this.setData({ error: '请先填写火山方舟 API Key。' });
                return;
            }
            const freeBatch = (0, model_routing_1.nextArkVerificationBatch)(probes, (0, ark_verification_1.getArkVerification)(), false);
            if (freeBatch.probes.length) {
                void this.runArkProbeBatch(freeBatch.probes, false);
                return;
            }
            const paidBatch = (0, model_routing_1.nextArkVerificationBatch)(probes, (0, ark_verification_1.getArkVerification)(), true);
            if (!paidBatch.probes.length) {
                wx.showToast({ title: 'Ark 路线已验证', icon: 'success' });
                return;
            }
            wx.showModal({ title: '确认付费图像验证', content: '图像路线 probe 会调用一次图片生成接口，可能产生费用。仅在你明确确认后执行。', confirmText: '确认验证', success: (result) => { if (result.confirm)
                    void this.runArkProbeBatch(paidBatch.probes, true); } });
        },
        async runArkProbeBatch(probes, confirmPaidImageProbe) {
            const epoch = this.epoch;
            this.setData({ verifyingArk: true, error: '' });
            try {
                const response = await (0, api_1.requestJson)({ action: 'providerAccountCatalog', provider: 'ark', apiKeys: { ark: String(this.data.draftKeys.ark || '').trim() }, probes, confirmPaidImageProbe });
                if (epoch !== this.epoch)
                    return;
                (0, ark_verification_1.setArkProbeResults)(response.probeResults || []);
                this.refreshPresentation();
                wx.showToast({ title: confirmPaidImageProbe ? '图像路线已验证' : '免费路线已验证', icon: 'success' });
            }
            catch (error) {
                if (epoch === this.epoch)
                    this.setData({ error: (0, api_1.formatError)(error) });
            }
            finally {
                if (epoch === this.epoch)
                    this.setData({ verifyingArk: false });
            }
        },
        cancel() { this.setData({ showModelPicker: false }); this.triggerEvent('close'); },
        save() {
            const draft = this.data.draft;
            if (!draft)
                return;
            if (this.properties.purpose !== 'optimize' && draft.outputFormat === 'png' && !draft.imageSize) {
                this.setData({ error: '当前图像模型未声明可用清晰度，请更换模型。' });
                return;
            }
            try {
                if (this.properties.purpose !== 'optimize')
                    (0, model_routing_1.buildModelSubmission)({ ...draft, registry: this.getRegistry() });
            }
            catch (error) {
                this.setData({ error: (0, api_1.formatError)(error) });
                return;
            }
            this.triggerEvent('save', {
                settings: cloneDraft(draft),
                apiKeys: { ...this.data.draftKeys },
                manualReferenceIds: draft.retrievalSetting === 'manual' ? [...this.data.draftManualReferenceIds] : [],
            });
        },
    },
});
function normalizeRole(value) { return value === 'image' || value === 'vision' ? value : 'main'; }
function normalizeRoles(value) { return Array.isArray(value) ? value.map(normalizeRole) : []; }
function cloneDraft(value) { return JSON.parse(JSON.stringify(value)); }
