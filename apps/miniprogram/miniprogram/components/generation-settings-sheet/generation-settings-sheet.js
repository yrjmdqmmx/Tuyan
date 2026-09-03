"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const aspect_ratios_1 = require("../../utils/aspect-ratios");
const api_1 = require("../../utils/api");
const ark_verification_1 = require("../../utils/ark-verification");
const constants_1 = require("../../utils/constants");
const model_registry_1 = require("../../utils/model-registry");
const model_routing_1 = require("../../utils/model-routing");
const reference_library_1 = require("../../utils/reference-library");
const PROVIDER_LABELS = {
    gemini: 'Google Gemini API', openai: 'OpenAI', bailian: '阿里百炼', ark: '火山方舟', openrouter: 'OpenRouter',
};
Component({
    options: { styleIsolation: 'apply-shared', multipleSlots: true },
    properties: {
        show: { type: Boolean, value: false, observer(show) { if (show)
                this.resetDraft(); } },
        registry: { type: Object, value: {} },
        settings: { type: Object, value: {} },
        apiKeys: { type: Object, value: {} },
        executionRoles: { type: Array, value: [] },
        manualReferenceIds: { type: Array, value: [] },
        libraryTaskName: { type: String, value: 'diagram' },
    },
    data: {
        draft: null,
        providerOptions: model_registry_1.MODEL_PROVIDER_IDS.map((value) => ({ value, label: PROVIDER_LABELS[value] })),
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
        noop() { },
        resetDraft() {
            const registry = this.properties.registry;
            const incoming = this.properties.settings;
            if (!registry || !incoming) {
                this.setData({ draft: null, error: '模型目录尚未就绪，暂时不能编辑生成设置。' });
                return;
            }
            const draft = cloneDraft(incoming);
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
            const registry = this.properties.registry;
            if (!draft || !registry)
                return;
            const imageEntry = (0, model_registry_1.findRegistryModel)(registry, draft.modelRoutes.image.accessProvider, draft.modelRoutes.image.modelId);
            const ratioAll = (0, aspect_ratios_1.buildAspectRatioOptions)({ capabilities: (imageEntry === null || imageEntry === void 0 ? void 0 : imageEntry.capabilities) || {}, capabilityField: 'aspectRatios', modelLabel: imageEntry === null || imageEntry === void 0 ? void 0 : imageEntry.label });
            const ratioOptions = ratioAll.filter((item) => !item.disabled).map((item) => ({ value: item.value, label: item.label }));
            draft.aspectRatio = (0, aspect_ratios_1.normalizeSelectedAspectRatio)(draft.aspectRatio, ratioAll);
            const resolutionOptions = (0, aspect_ratios_1.buildResolutionOptions)((imageEntry === null || imageEntry === void 0 ? void 0 : imageEntry.capabilities) || {}, 'resolutions');
            if (draft.outputFormat === 'png' && !resolutionOptions.some((item) => item.value === draft.imageSize)) {
                draft.imageSize = ((_a = resolutionOptions[0]) === null || _a === void 0 ? void 0 : _a.value) || '';
            }
            const routeRows = ['main', 'image', 'vision'].map((role) => {
                const route = draft.modelRoutes[role];
                const model = (0, model_registry_1.findRegistryModel)(registry, route.accessProvider, route.modelId);
                return {
                    role, label: role === 'main' ? '主模型' : role === 'image' ? '图像生成模型' : '参考图识别模型',
                    provider: route.accessProvider, providerLabel: PROVIDER_LABELS[route.accessProvider] || route.accessProvider,
                    modelId: route.modelId, modelLabel: (model === null || model === void 0 ? void 0 : model.label) || route.modelId,
                };
            });
            const providers = (0, model_routing_1.uniqueProvidersForRoles)(draft.modelRoutes, normalizeRoles(this.properties.executionRoles));
            const keyFields = providers.map((provider) => ({
                provider, label: PROVIDER_LABELS[provider] || provider, value: this.data.draftKeys[provider] || '',
                placeholder: provider === 'gemini' ? 'AIza...' : provider === 'openrouter' ? 'sk-or-v1-...' : 'sk-...',
            }));
            const probes = (0, model_routing_1.arkProbesForRoles)(draft.modelRoutes, normalizeRoles(this.properties.executionRoles));
            const missing = (0, model_routing_1.missingArkVerifications)(probes, (0, ark_verification_1.getArkVerification)());
            const arkStatus = probes.length ? (missing.length ? `${missing.length} 条 Ark 路线可选验证` : 'Ark 路线已验证') : '';
            this.setData({
                draft, routeRows, ratioOptions, resolutionOptions, keyFields,
                providerIndex: Math.max(0, model_registry_1.MODEL_PROVIDER_IDS.indexOf(draft.simpleProvider)),
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
            if (draft.configurationMode === 'simple')
                draft.modelRoutes = (0, model_routing_1.providerDefaultRoutes)(draft.simpleProvider, this.properties.registry);
            this.setData({ draft });
            this.refreshPresentation();
        },
        onProviderChange(event) {
            const draft = this.data.draft;
            if (!draft)
                return;
            const index = Number(event.detail.value) || 0;
            const provider = model_registry_1.MODEL_PROVIDER_IDS[index] || model_registry_1.MODEL_PROVIDER_IDS[0];
            draft.simpleProvider = provider;
            draft.modelRoutes = (0, model_routing_1.providerDefaultRoutes)(provider, this.properties.registry);
            this.setData({ draft });
            this.refreshPresentation();
        },
        openModelPicker(event) {
            const draft = this.data.draft;
            const role = normalizeRole(event.currentTarget.dataset.role);
            if (!draft || draft.configurationMode !== 'advanced')
                return;
            this.setData({ editingRole: role, showModelPicker: true, pickerProvider: draft.modelRoutes[role].accessProvider, pickerModel: draft.modelRoutes[role].modelId });
        },
        closeModelPicker() { this.setData({ showModelPicker: false }); },
        selectModel(event) {
            const draft = this.data.draft;
            if (!draft)
                return;
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
        },
        onResolutionChange(event) {
            var _a;
            const draft = this.data.draft;
            if (!draft)
                return;
            draft.imageSize = ((_a = this.data.resolutionOptions[Number(event.detail.value) || 0]) === null || _a === void 0 ? void 0 : _a.value) || '';
            this.setData({ draft, resolutionIndex: Number(event.detail.value) || 0 });
        },
        onPipelineChange(event) {
            var _a;
            const draft = this.data.draft;
            if (!draft)
                return;
            draft.pipelineMode = ((_a = this.data.pipelineOptions[Number(event.detail.value) || 0]) === null || _a === void 0 ? void 0 : _a.value) || 'planner_critic';
            this.setData({ draft, pipelineIndex: Number(event.detail.value) || 0 });
        },
        onRetrievalChange(event) {
            var _a;
            const draft = this.data.draft;
            if (!draft)
                return;
            draft.retrievalSetting = ((_a = this.data.retrievalOptions[Number(event.detail.value) || 0]) === null || _a === void 0 ? void 0 : _a.value) || 'none';
            this.setData({ draft, retrievalIndex: Number(event.detail.value) || 0 });
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
        },
        onCriticChange(event) {
            var _a;
            const draft = this.data.draft;
            if (!draft)
                return;
            draft.maxCriticRounds = ((_a = this.data.criticOptions[Number(event.detail.value) || 0]) === null || _a === void 0 ? void 0 : _a.value) || 0;
            this.setData({ draft, criticIndex: Number(event.detail.value) || 0 });
        },
        onKeyInput(event) {
            const provider = String(event.currentTarget.dataset.provider || '');
            if (provider === 'ark' && this.data.draftKeys.ark !== event.detail.value)
                (0, ark_verification_1.clearArkVerification)();
            const draftKeys = { ...this.data.draftKeys, [provider]: event.detail.value };
            this.setData({ draftKeys });
            this.refreshPresentation();
        },
        verifyArkRoutes() {
            const draft = this.data.draft;
            if (!draft || this.data.verifyingArk)
                return;
            const probes = (0, model_routing_1.arkProbesForRoles)(draft.modelRoutes, normalizeRoles(this.properties.executionRoles));
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
            this.setData({ verifyingArk: true, error: '' });
            try {
                const response = await (0, api_1.requestJson)({ action: 'providerAccountCatalog', provider: 'ark', apiKeys: { ark: String(this.data.draftKeys.ark || '').trim() }, probes, confirmPaidImageProbe });
                (0, ark_verification_1.setArkProbeResults)(response.probeResults || []);
                this.refreshPresentation();
                wx.showToast({ title: confirmPaidImageProbe ? '图像路线已验证' : '免费路线已验证', icon: 'success' });
            }
            catch (error) {
                this.setData({ error: (0, api_1.formatError)(error) });
            }
            finally {
                this.setData({ verifyingArk: false });
            }
        },
        cancel() { this.setData({ showModelPicker: false }); this.triggerEvent('close'); },
        save() {
            const draft = this.data.draft;
            if (!draft)
                return;
            if (draft.outputFormat === 'png' && !draft.imageSize) {
                this.setData({ error: '当前图像模型未声明可用清晰度，请更换模型。' });
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
