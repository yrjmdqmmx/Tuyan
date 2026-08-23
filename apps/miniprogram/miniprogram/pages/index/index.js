"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = require("../../utils/api");
const constants_1 = require("../../utils/constants");
const jobs_1 = require("../../utils/jobs");
const media_1 = require("../../utils/media");
const payload_1 = require("../../utils/payload");
const api_keys_1 = require("../../utils/api-keys");
const ark_verification_1 = require("../../utils/ark-verification");
const featured_templates_1 = require("../../utils/featured-templates");
const model_registry_1 = require("../../utils/model-registry");
const model_registry_store_1 = require("../../utils/model-registry-store");
const model_routing_1 = require("../../utils/model-routing");
const reference_files_1 = require("../../utils/reference-files");
const reference_mode_1 = require("../../utils/reference-mode");
const session_1 = require("../../utils/session");
const DRAFT_STORAGE_KEY = 'paperbanana_mini_draft';
Component({
    data: {
        logoSrc: '/images/logo.png',
        providers: constants_1.PROVIDERS,
        providerIndex: 0,
        providerLabel: constants_1.PROVIDERS[0].label,
        providerMainModel: constants_1.PROVIDERS[0].mainModel,
        providerImageModel: constants_1.PROVIDERS[0].imageModel,
        providerGuideSteps: constants_1.PROVIDERS[0].guideSteps,
        mainModelOptions: constants_1.PROVIDERS[0].mainModels,
        mainModelIndex: (0, constants_1.getModelIndex)(constants_1.PROVIDERS[0].mainModels, constants_1.PROVIDERS[0].mainModel),
        mainModelLabel: (0, constants_1.getModelLabel)(constants_1.PROVIDERS[0].mainModels, constants_1.PROVIDERS[0].mainModel),
        imageModelOptions: constants_1.PROVIDERS[0].imageModels,
        imageModelIndex: (0, constants_1.getModelIndex)(constants_1.PROVIDERS[0].imageModels, constants_1.PROVIDERS[0].imageModel),
        imageModelLabel: (0, constants_1.getModelLabel)(constants_1.PROVIDERS[0].imageModels, constants_1.PROVIDERS[0].imageModel),
        referenceVisionModelOptions: constants_1.PROVIDERS[0].visionModels,
        referenceVisionModelIndex: (0, constants_1.getModelIndex)(constants_1.PROVIDERS[0].visionModels, constants_1.PROVIDERS[0].visionModel),
        referenceVisionModelLabel: (0, constants_1.getModelLabel)(constants_1.PROVIDERS[0].visionModels, constants_1.PROVIDERS[0].visionModel),
        configurationMode: 'simple',
        isAdvancedMode: false,
        pipelineOptions: constants_1.PIPELINE_OPTIONS,
        pipelineIndex: 0,
        pipelineLabel: String(constants_1.PIPELINE_OPTIONS[0].label),
        aspectRatioOptions: constants_1.ASPECT_RATIO_OPTIONS,
        aspectRatioIndex: 0,
        aspectRatioLabel: String(constants_1.ASPECT_RATIO_OPTIONS[0].label),
        candidateOptions: constants_1.CANDIDATE_OPTIONS,
        candidateIndex: 0,
        candidateLabel: String(constants_1.CANDIDATE_OPTIONS[0].label),
        criticRoundOptions: constants_1.CRITIC_ROUND_OPTIONS,
        criticRoundIndex: 1,
        criticRoundLabel: String(constants_1.CRITIC_ROUND_OPTIONS[1].label),
        outputFormatOptions: constants_1.OUTPUT_FORMATS,
        outputFormat: 'png',
        outputFormatIndex: 0,
        outputFormatLabel: constants_1.OUTPUT_FORMATS[0].label,
        // 输出清晰度：1K 仅基础渲染；2K/4K 出图后自动精修放大。选项按 provider/图像模型过滤。
        resolutionOptions: constants_1.RESOLUTION_OPTIONS.filter((option) => (0, constants_1.supportedResolutions)(constants_1.PROVIDERS[0].id, constants_1.PROVIDERS[0].imageModel).indexOf(option.value) >= 0),
        resolutionIndex: 0,
        imageSize: '1K',
        imageSizeLabel: constants_1.RESOLUTION_OPTIONS[0].label,
        // 检索设置（专业模式）：上传参考图后锁为不检索
        retrievalOptions: constants_1.RETRIEVAL_OPTIONS,
        retrievalIndex: 0,
        retrievalSetting: 'none',
        retrievalLabel: constants_1.RETRIEVAL_OPTIONS[0].label,
        manualReferenceIds: [],
        showReferenceLibrary: false,
        libraryTaskName: 'diagram',
        referenceImageModeOptions: constants_1.REFERENCE_IMAGE_MODES,
        referenceImageMode: (0, reference_mode_1.defaultReferenceImageMode)((0, constants_1.mainModelCanReadImages)(constants_1.PROVIDERS[0].id, constants_1.PROVIDERS[0].mainModel)),
        referenceImages: [],
        referenceImageCount: 0,
        referenceCanAddImage: true,
        referenceModeNote: '',
        referenceModeCanSubmit: true,
        referenceNeedsVisionModel: false,
        shouldShowReferenceModeSelector: false,
        canSelectMainModelDirect: (0, constants_1.mainModelCanReadImages)(constants_1.PROVIDERS[0].id, constants_1.PROVIDERS[0].mainModel),
        referenceUploadError: '',
        isUploadingReferences: false,
        mainModelName: constants_1.PROVIDERS[0].mainModel,
        imageModelName: constants_1.PROVIDERS[0].imageModel,
        referenceVisionModelName: constants_1.PROVIDERS[0].visionModel,
        apiKey: '',
        apiKeyPlaceholder: constants_1.PROVIDERS[0].keyPlaceholder,
        categories: constants_1.INFOGRAPHIC_CATEGORIES,
        categoryIndex: 0,
        categoryLabel: constants_1.INFOGRAPHIC_CATEGORIES[0].label,
        categoryDescription: constants_1.INFOGRAPHIC_CATEGORIES[0].description,
        isPlotCategory: false,
        plotNote: constants_1.PLOT_NOTE,
        methodContent: constants_1.QUICK_START_EXAMPLES[0].methodContent,
        caption: constants_1.QUICK_START_EXAMPLES[0].caption,
        quickStartExamples: constants_1.QUICK_START_EXAMPLES,
        featuredTemplates: (0, featured_templates_1.attachFeaturedTemplateImages)([]),
        featuredTemplatesLoading: true,
        registry: {},
        registryReady: false,
        registryVersion: '等待服务端目录',
        registryError: '',
        settings: {},
        settingsSummary: '正在读取服务端默认路线…',
        settingsSummaryDetails: [],
        showGenerationSettings: false,
        apiKeysForSheet: {},
        settingsExecutionRoles: [],
        negativePrompt: '',
        inputDirty: false,
        healthText: '检测中',
        healthOk: false,
        healthChecked: false,
        canSubmit: false,
        isSubmitting: false,
        currentJobId: '',
        job: null,
        error: '',
        statusLabel: '',
        resultImages: [],
        currentUserEmail: '',
        isLoggedIn: false,
        isAuthChecking: true,
        showAuthPanel: false,
        showFeedbackPanel: false,
        // 反馈悬浮按钮初始位置（px，attached 时按屏幕尺寸算到右下角）
        fabX: 0,
        fabY: 0,
    },
    lifetimes: {
        attached() {
            ;
            this.isPageVisible = true;
            this.restoreDraft();
            // 悬浮反馈按钮放到右下角（movable-view 的 x/y 是相对 movable-area 左上角的 px 值）
            try {
                // getSystemInfoSync 已废弃；优先用 getWindowInfo（基础库 2.20.1+），旧环境回退
                const getWindowInfo = wx.getWindowInfo;
                const info = typeof getWindowInfo === 'function' ? getWindowInfo() : wx.getSystemInfoSync();
                const rpx = info.windowWidth / 750;
                this.setData({
                    fabX: Math.max(0, info.windowWidth - 144 * rpx - 24 * rpx),
                    fabY: Math.max(0, info.windowHeight - 76 * rpx - 48 * rpx),
                });
            }
            catch {
                // 取不到屏幕信息时停留在默认位置，可手动拖动
            }
            const unsubscribe = (0, session_1.subscribeSession)((user) => {
                this.setData({
                    isLoggedIn: Boolean(user),
                    currentUserEmail: user ? user.email : '',
                    isAuthChecking: false,
                });
            });
            this.unsubscribeSession = unsubscribe;
            const user = (0, session_1.getCurrentUser)();
            this.setData({
                isLoggedIn: Boolean(user),
                currentUserEmail: user ? user.email : '',
                isAuthChecking: !(0, session_1.isSessionChecked)(),
            });
            this.refreshCanSubmit();
            this.checkHealth();
            const unsubscribeRegistry = (0, model_registry_store_1.subscribeModelRegistry)((state) => this.applyRegistryState(state));
            this.unsubscribeRegistry = unsubscribeRegistry;
            void (0, model_registry_store_1.loadModelRegistry)();
            void this.loadFeaturedTemplates();
        },
        detached() {
            this.stopPolling();
            const draftTimer = this.draftTimer;
            if (draftTimer)
                clearTimeout(draftTimer);
            this.persistDraft();
            const unsubscribe = this.unsubscribeSession;
            if (unsubscribe)
                unsubscribe();
            const unsubscribeRegistry = this.unsubscribeRegistry;
            if (unsubscribeRegistry)
                unsubscribeRegistry();
        },
    },
    pageLifetimes: {
        show() {
            ;
            this.isPageVisible = true;
            // tabBar 页不销毁：回到本页时若任务未到终态则恢复轮询
            if (this.pollingTimer)
                return;
            const status = this.data.job ? this.data.job.status : '';
            if (this.data.currentJobId && status !== 'succeeded' && status !== 'failed') {
                this.startPolling(this.data.currentJobId);
            }
        },
        hide() {
            ;
            this.isPageVisible = false;
            this.stopPolling();
        },
    },
    methods: {
        restoreDraft() {
            try {
                const draft = wx.getStorageSync(DRAFT_STORAGE_KEY);
                if (!draft || typeof draft !== 'object')
                    return;
                const categoryIndex = Number(draft.categoryIndex);
                const category = constants_1.INFOGRAPHIC_CATEGORIES[Number.isInteger(categoryIndex) ? categoryIndex : 0] || constants_1.INFOGRAPHIC_CATEGORIES[0];
                this.setData({
                    categoryIndex: constants_1.INFOGRAPHIC_CATEGORIES.indexOf(category), categoryLabel: category.label, categoryDescription: category.description,
                    isPlotCategory: category.id === constants_1.PLOT_CATEGORY_ID, libraryTaskName: category.id === constants_1.PLOT_CATEGORY_ID ? 'plot' : 'diagram',
                    methodContent: typeof draft.methodContent === 'string' ? draft.methodContent.slice(0, 12000) : this.data.methodContent,
                    caption: typeof draft.caption === 'string' ? draft.caption.slice(0, 1000) : this.data.caption,
                    negativePrompt: typeof draft.negativePrompt === 'string' ? draft.negativePrompt.slice(0, 1000) : '',
                    inputDirty: draft.inputDirty === true,
                });
            }
            catch { /* 损坏草稿忽略 */ }
        },
        schedulePersistDraft() {
            const previous = this.draftTimer;
            if (previous)
                clearTimeout(previous);
            this.draftTimer = setTimeout(() => this.persistDraft(), 300);
        },
        persistDraft() {
            wx.setStorageSync(DRAFT_STORAGE_KEY, { categoryIndex: this.data.categoryIndex, methodContent: this.data.methodContent, caption: this.data.caption, negativePrompt: this.data.negativePrompt, inputDirty: this.data.inputDirty });
        },
        applyRegistryState(state) {
            if (!state.registry) {
                this.setData({ registry: {}, registryReady: false, registryVersion: '目录不可用', registryError: state.error });
                this.refreshCanSubmit();
                return;
            }
            const current = this.data.settings;
            const settings = current.modelRoutes ? current : defaultGenerationSettings(state.registry);
            this.setData({
                registry: state.registry,
                registryReady: true,
                registryVersion: state.registry.registryVersion,
                registryError: '',
                settings,
                settingsSummary: formatSettingsSummary(settings),
                settingsSummaryDetails: formatSettingsSummaryDetails(settings),
            });
            this.syncLegacySettings(settings);
            this.refreshCanSubmit();
            this.schedulePersistDraft();
        },
        async retryRegistry() { await (0, model_registry_store_1.loadModelRegistry)(true); },
        async loadFeaturedTemplates() {
            this.setData({ featuredTemplatesLoading: true });
            try {
                const response = await (0, api_1.requestJson)({ action: 'referenceLibrary', ...(0, featured_templates_1.featuredTemplateRequest)() }, { auth: false });
                this.setData({ featuredTemplates: (0, featured_templates_1.attachFeaturedTemplateImages)(response.references || []), featuredTemplatesLoading: false });
            }
            catch {
                this.setData({ featuredTemplates: (0, featured_templates_1.attachFeaturedTemplateImages)([]), featuredTemplatesLoading: false });
            }
        },
        openGenerationSettings() {
            if (!this.data.registryReady) {
                wx.showToast({ title: '模型目录不可用', icon: 'none' });
                return;
            }
            const settings = this.data.settings;
            this.setData({ showGenerationSettings: true, apiKeysForSheet: (0, api_keys_1.getApiKeys)(), settingsExecutionRoles: this.createExecutionRoles(settings) });
        },
        closeGenerationSettings() { this.setData({ showGenerationSettings: false }); },
        saveGenerationSettings(event) {
            const settings = event.detail.settings;
            (0, api_keys_1.replaceApiKeys)(event.detail.apiKeys);
            const manualReferenceIds = settings.retrievalSetting === 'manual' ? event.detail.manualReferenceIds || [] : [];
            if (this.data.referenceImages.length && settings.retrievalSetting !== 'none')
                settings.retrievalSetting = 'none';
            this.setData({
                settings,
                settingsSummary: formatSettingsSummary(settings),
                settingsSummaryDetails: formatSettingsSummaryDetails(settings),
                manualReferenceIds: settings.retrievalSetting === 'manual' ? manualReferenceIds : [],
                showGenerationSettings: false,
                apiKeysForSheet: (0, api_keys_1.getApiKeys)(),
            });
            this.syncLegacySettings(settings);
            this.refreshCanSubmit();
        },
        syncLegacySettings(settings) {
            const main = settings.modelRoutes.main;
            const image = settings.modelRoutes.image;
            const vision = settings.modelRoutes.vision;
            this.setData({
                configurationMode: settings.configurationMode,
                isAdvancedMode: settings.configurationMode === 'advanced',
                mainModelName: main.modelId,
                imageModelName: image.modelId,
                referenceVisionModelName: vision.modelId,
                outputFormat: settings.outputFormat,
                imageSize: settings.imageSize,
                retrievalSetting: settings.retrievalSetting,
                showReferenceLibrary: settings.retrievalSetting === 'manual' && this.data.referenceImages.length === 0,
            });
            this.refreshReferenceModeState();
        },
        createExecutionRoles(settings) {
            const category = constants_1.INFOGRAPHIC_CATEGORIES[this.data.categoryIndex] || constants_1.INFOGRAPHIC_CATEGORIES[0];
            return (0, model_routing_1.requiredCreateRouteRoles)({ outputFormat: settings.outputFormat, taskName: category.id === constants_1.PLOT_CATEGORY_ID ? 'plot' : 'diagram', pipelineMode: settings.pipelineMode, retrievalSetting: settings.retrievalSetting, imageSize: settings.imageSize, referenceImages: this.data.referenceImages, referenceImageMode: this.data.referenceImageMode }, settings.maxCriticRounds);
        },
        onFeaturedTemplateApply(event) {
            const template = featured_templates_1.FEATURED_TEMPLATES.find((item) => item.id === event.detail.id);
            if (!template)
                return;
            if (!this.data.inputDirty) {
                this.applyFeaturedTemplate(template);
                return;
            }
            wx.showModal({
                title: '替换当前内容？',
                content: '你已经修改了类别、方法、图注或负向提示词。套用模板会替换这些内容。',
                confirmText: '继续套用',
                success: (result) => { if (result.confirm)
                    this.applyFeaturedTemplate(template); },
            });
        },
        applyFeaturedTemplate(template) {
            const categoryIndex = Math.max(0, constants_1.INFOGRAPHIC_CATEGORIES.findIndex((item) => item.id === template.category));
            const category = constants_1.INFOGRAPHIC_CATEGORIES[categoryIndex];
            this.setData({
                categoryIndex, categoryLabel: category.label, categoryDescription: category.description,
                isPlotCategory: category.id === constants_1.PLOT_CATEGORY_ID, libraryTaskName: category.id === constants_1.PLOT_CATEGORY_ID ? 'plot' : 'diagram',
                methodContent: template.methodContent, caption: template.caption, negativePrompt: template.negativePrompt,
                inputDirty: false, manualReferenceIds: [],
            });
            this.refreshCanSubmit();
            this.persistDraft();
            wx.showToast({ title: '模板已套用', icon: 'success' });
        },
        onProviderChange(event) {
            const providerIndex = (0, constants_1.readPickerIndex)(event.detail.value, constants_1.PROVIDERS.length);
            const provider = constants_1.PROVIDERS[providerIndex] || constants_1.PROVIDERS[0];
            this.setData({
                providerIndex,
                providerLabel: provider.label,
                providerMainModel: provider.mainModel,
                providerImageModel: provider.imageModel,
                providerGuideSteps: provider.guideSteps,
                mainModelOptions: provider.mainModels,
                mainModelIndex: (0, constants_1.getModelIndex)(provider.mainModels, provider.mainModel),
                mainModelLabel: (0, constants_1.getModelLabel)(provider.mainModels, provider.mainModel),
                imageModelOptions: provider.imageModels,
                imageModelIndex: (0, constants_1.getModelIndex)(provider.imageModels, provider.imageModel),
                imageModelLabel: (0, constants_1.getModelLabel)(provider.imageModels, provider.imageModel),
                referenceVisionModelOptions: provider.visionModels,
                referenceVisionModelIndex: (0, constants_1.getModelIndex)(provider.visionModels, provider.visionModel),
                referenceVisionModelLabel: (0, constants_1.getModelLabel)(provider.visionModels, provider.visionModel),
                mainModelName: provider.mainModel,
                imageModelName: provider.imageModel,
                referenceVisionModelName: provider.visionModel,
                referenceImageMode: (0, reference_mode_1.defaultReferenceImageMode)((0, constants_1.mainModelCanReadImages)(provider.id, provider.mainModel)),
                apiKeyPlaceholder: provider.keyPlaceholder,
            });
            this.refreshResolutionOptions();
            this.refreshReferenceModeState();
            this.refreshCanSubmit();
        },
        switchConfigurationMode(event) {
            const requestedMode = String(event.currentTarget.dataset.mode || 'simple');
            const configurationMode = requestedMode === 'advanced' ? 'advanced' : 'simple';
            const isAdvancedMode = configurationMode === 'advanced';
            this.setData({
                configurationMode,
                isAdvancedMode,
            });
            this.refreshResolutionOptions();
            this.refreshReferenceModeState();
            this.refreshRetrievalState();
            this.refreshCanSubmit();
        },
        onPipelineChange(event) {
            const pipelineIndex = (0, constants_1.readPickerIndex)(event.detail.value, constants_1.PIPELINE_OPTIONS.length);
            const option = constants_1.PIPELINE_OPTIONS[pipelineIndex];
            this.setData({
                pipelineIndex,
                pipelineLabel: option.label,
            });
        },
        onAspectRatioChange(event) {
            const aspectRatioIndex = (0, constants_1.readPickerIndex)(event.detail.value, constants_1.ASPECT_RATIO_OPTIONS.length);
            const option = constants_1.ASPECT_RATIO_OPTIONS[aspectRatioIndex];
            this.setData({
                aspectRatioIndex,
                aspectRatioLabel: option.label,
            });
        },
        onCandidateChange(event) {
            const candidateIndex = (0, constants_1.readPickerIndex)(event.detail.value, constants_1.CANDIDATE_OPTIONS.length);
            const option = constants_1.CANDIDATE_OPTIONS[candidateIndex];
            this.setData({
                candidateIndex,
                candidateLabel: option.label,
            });
        },
        onCriticRoundChange(event) {
            const criticRoundIndex = (0, constants_1.readPickerIndex)(event.detail.value, constants_1.CRITIC_ROUND_OPTIONS.length);
            const option = constants_1.CRITIC_ROUND_OPTIONS[criticRoundIndex];
            this.setData({
                criticRoundIndex,
                criticRoundLabel: option.label,
            });
        },
        onOutputFormatChange(event) {
            const outputFormatIndex = (0, constants_1.readPickerIndex)(event.detail.value, constants_1.OUTPUT_FORMATS.length);
            const option = constants_1.OUTPUT_FORMATS[outputFormatIndex] || constants_1.OUTPUT_FORMATS[0];
            this.setData({
                outputFormatIndex,
                outputFormat: option.value,
                outputFormatLabel: option.label,
            });
        },
        onResolutionChange(event) {
            const options = this.data.resolutionOptions;
            const resolutionIndex = (0, constants_1.readPickerIndex)(event.detail.value, options.length);
            const option = options[resolutionIndex] || options[0];
            this.setData({
                resolutionIndex,
                imageSize: option.value,
                imageSizeLabel: option.label,
            });
        },
        // provider / 图像生成模型 / 模式切换时重算清晰度可选项；当前档位不被支持时收敛到第一档
        refreshResolutionOptions() {
            const provider = constants_1.PROVIDERS[this.data.providerIndex] || constants_1.PROVIDERS[0];
            const activeImageModel = this.data.isAdvancedMode
                ? this.data.imageModelName.trim() || provider.imageModel
                : provider.imageModel;
            const supported = (0, constants_1.supportedResolutions)(provider.id, activeImageModel);
            const resolutionOptions = constants_1.RESOLUTION_OPTIONS.filter((option) => supported.indexOf(option.value) >= 0);
            let imageSize = this.data.imageSize;
            if (supported.indexOf(imageSize) < 0) {
                imageSize = supported[0];
            }
            const resolutionIndex = Math.max(0, resolutionOptions.findIndex((option) => option.value === imageSize));
            const option = resolutionOptions[resolutionIndex] || resolutionOptions[0];
            this.setData({
                resolutionOptions,
                resolutionIndex,
                imageSize: option.value,
                imageSizeLabel: option.label,
            });
        },
        onRetrievalChange(event) {
            if (this.data.referenceImageCount > 0)
                return;
            const retrievalIndex = (0, constants_1.readPickerIndex)(event.detail.value, constants_1.RETRIEVAL_OPTIONS.length);
            const option = constants_1.RETRIEVAL_OPTIONS[retrievalIndex] || constants_1.RETRIEVAL_OPTIONS[0];
            this.setData({
                retrievalIndex,
                retrievalSetting: option.value,
                retrievalLabel: option.label,
            });
            this.refreshRetrievalState();
            this.refreshCanSubmit();
        },
        refreshRetrievalState() {
            this.setData({
                showReferenceLibrary: this.data.isAdvancedMode &&
                    this.data.retrievalSetting === 'manual' &&
                    this.data.referenceImages.length === 0,
            });
        },
        onManualReferenceToggle(event) {
            const id = String(event.detail.id || '');
            if (!id)
                return;
            const current = this.data.manualReferenceIds;
            let next;
            if (current.indexOf(id) >= 0) {
                next = current.filter((item) => item !== id);
            }
            else if (current.length >= constants_1.MANUAL_REFERENCE_LIMIT) {
                wx.showToast({ title: `最多选择 ${constants_1.MANUAL_REFERENCE_LIMIT} 个案例`, icon: 'none' });
                return;
            }
            else {
                next = [...current, id];
            }
            this.setData({ manualReferenceIds: next });
            this.refreshCanSubmit();
        },
        onMainModelChange(event) {
            const provider = constants_1.PROVIDERS[this.data.providerIndex] || constants_1.PROVIDERS[0];
            const mainModelIndex = (0, constants_1.readPickerIndex)(event.detail.value, provider.mainModels.length);
            const option = provider.mainModels[mainModelIndex] || provider.mainModels[0];
            this.setData({
                mainModelIndex,
                mainModelLabel: option.label,
                mainModelName: option.value,
                // 参考图模式按固定能力重新派生（与 web 行为一致），之后仍可手动切换
                referenceImageMode: (0, reference_mode_1.defaultReferenceImageMode)((0, constants_1.mainModelCanReadImages)(provider.id, option.value)),
            });
            this.refreshReferenceModeState();
            this.refreshCanSubmit();
        },
        onImageModelChange(event) {
            const provider = constants_1.PROVIDERS[this.data.providerIndex] || constants_1.PROVIDERS[0];
            const imageModelIndex = (0, constants_1.readPickerIndex)(event.detail.value, provider.imageModels.length);
            const option = provider.imageModels[imageModelIndex] || provider.imageModels[0];
            this.setData({
                imageModelIndex,
                imageModelLabel: option.label,
                imageModelName: option.value,
            });
            this.refreshResolutionOptions();
            this.refreshCanSubmit();
        },
        onReferenceVisionModelChange(event) {
            const provider = constants_1.PROVIDERS[this.data.providerIndex] || constants_1.PROVIDERS[0];
            const referenceVisionModelIndex = (0, constants_1.readPickerIndex)(event.detail.value, provider.visionModels.length);
            const option = provider.visionModels[referenceVisionModelIndex] || provider.visionModels[0];
            this.setData({
                referenceVisionModelIndex,
                referenceVisionModelLabel: option.label,
                referenceVisionModelName: option.value,
            });
            this.refreshCanSubmit();
            this.schedulePersistDraft();
        },
        onApiKeyInput(event) {
            this.setData({ apiKey: event.detail.value });
            this.refreshCanSubmit();
        },
        onCategoryChange(event) {
            const categoryIndex = Number(event.detail.value || 0);
            const category = constants_1.INFOGRAPHIC_CATEGORIES[categoryIndex] || constants_1.INFOGRAPHIC_CATEGORIES[0];
            const isPlotCategory = category.id === constants_1.PLOT_CATEGORY_ID;
            const libraryTaskName = isPlotCategory ? 'plot' : 'diagram';
            this.setData({
                categoryIndex,
                categoryLabel: category.label,
                categoryDescription: category.description,
                isPlotCategory,
                libraryTaskName,
                // diagram/plot 是两个不同参考库，类别切换后清空已选，避免把错库的 id 发给后端
                manualReferenceIds: libraryTaskName === this.data.libraryTaskName ? this.data.manualReferenceIds : [],
                inputDirty: true,
            });
            this.refreshCanSubmit();
            this.schedulePersistDraft();
        },
        onMethodInput(event) {
            this.setData({ methodContent: event.detail.value, inputDirty: true });
            this.refreshCanSubmit();
            this.schedulePersistDraft();
        },
        onCaptionInput(event) {
            this.setData({ caption: event.detail.value, inputDirty: true });
            this.refreshCanSubmit();
            this.schedulePersistDraft();
        },
        onNegativePromptInput(event) {
            this.setData({ negativePrompt: event.detail.value, inputDirty: true });
            this.refreshCanSubmit();
            this.schedulePersistDraft();
        },
        applyExample(event) {
            const exampleId = String(event.currentTarget.dataset.id || '');
            const example = constants_1.QUICK_START_EXAMPLES.find((item) => item.id === exampleId);
            if (!example)
                return;
            const categoryIndex = constants_1.INFOGRAPHIC_CATEGORIES.findIndex((item) => item.id === example.category);
            const normalizedCategoryIndex = categoryIndex >= 0 ? categoryIndex : 0;
            const category = constants_1.INFOGRAPHIC_CATEGORIES[normalizedCategoryIndex];
            const isPlotCategory = category.id === constants_1.PLOT_CATEGORY_ID;
            const libraryTaskName = isPlotCategory ? 'plot' : 'diagram';
            this.setData({
                categoryIndex: normalizedCategoryIndex,
                categoryLabel: category.label,
                categoryDescription: category.description,
                isPlotCategory,
                libraryTaskName,
                manualReferenceIds: libraryTaskName === this.data.libraryTaskName ? this.data.manualReferenceIds : [],
                methodContent: example.methodContent,
                caption: example.caption,
            });
            this.refreshCanSubmit();
            this.persistDraft();
            wx.showToast({ title: '已填入案例', icon: 'success' });
        },
        chooseReferenceFile() {
            if (!this.data.referenceCanAddImage || this.data.isSubmitting || this.data.isUploadingReferences)
                return;
            wx.showActionSheet({
                itemList: ['图片 / 相册 / 拍照', 'SVG 文件'],
                success: (res) => {
                    if (res.tapIndex === 0) {
                        this.chooseReferenceImages();
                        return;
                    }
                    if (res.tapIndex === 1) {
                        this.chooseReferenceSvgFile();
                    }
                },
            });
        },
        chooseReferenceImages() {
            const remaining = constants_1.REFERENCE_IMAGE_LIMITS.maxCount - this.data.referenceImages.length;
            if (remaining <= 0) {
                this.setData({ referenceUploadError: `最多只能上传 ${constants_1.REFERENCE_IMAGE_LIMITS.maxCount} 张参考图。` });
                return;
            }
            wx.chooseMedia({
                count: remaining,
                mediaType: ['image'],
                sourceType: ['album', 'camera'],
                sizeType: ['compressed'],
                success: (res) => {
                    const accepted = [];
                    let error = '';
                    res.tempFiles.forEach((file, index) => {
                        const path = file.tempFilePath;
                        const size = Number(file.size || 0);
                        const mimeType = (0, reference_files_1.mimeTypeFromPath)(path);
                        if (constants_1.REFERENCE_IMAGE_LIMITS.mimeTypes.indexOf(mimeType) < 0) {
                            error = '参考图仅支持 PNG、JPG、WebP 或 SVG。';
                            return;
                        }
                        if (!size || size > constants_1.REFERENCE_IMAGE_LIMITS.maxBytes) {
                            error = '单张参考图不能超过 5MB。';
                            return;
                        }
                        accepted.push((0, reference_files_1.buildReferenceImage)({
                            id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
                            path,
                            filename: (0, reference_files_1.filenameFromPath)(path, accepted.length + this.data.referenceImages.length + 1, mimeType),
                            mimeType,
                            size,
                        }));
                    });
                    this.appendReferenceImages(accepted, error);
                },
            });
        },
        chooseReferenceSvgFile() {
            const remaining = constants_1.REFERENCE_IMAGE_LIMITS.maxCount - this.data.referenceImages.length;
            if (remaining <= 0) {
                this.setData({ referenceUploadError: `最多只能上传 ${constants_1.REFERENCE_IMAGE_LIMITS.maxCount} 张参考图。` });
                return;
            }
            wx.chooseMessageFile({
                count: remaining,
                type: 'file',
                extension: ['svg'],
                success: (res) => {
                    const accepted = [];
                    let error = '';
                    res.tempFiles.forEach((file, index) => {
                        const path = String(file.path || '');
                        const size = Number(file.size || 0);
                        const filename = (0, reference_files_1.sanitizeLocalFilename)(String(file.name || ''), path, accepted.length + this.data.referenceImages.length + 1, 'image/svg+xml');
                        const mimeType = (0, reference_files_1.normalizeReferenceFileMimeType)('image/svg+xml', filename);
                        if (!path || mimeType !== 'image/svg+xml') {
                            error = '请选择 .svg 文件。';
                            return;
                        }
                        if (!size || size > constants_1.REFERENCE_IMAGE_LIMITS.maxBytes) {
                            error = '单张参考图不能超过 5MB。';
                            return;
                        }
                        accepted.push((0, reference_files_1.buildReferenceImage)({
                            id: `${Date.now()}-svg-${index}-${Math.random().toString(36).slice(2, 8)}`,
                            path,
                            filename,
                            mimeType,
                            size,
                        }));
                    });
                    this.appendReferenceImages(accepted, error);
                },
            });
        },
        appendReferenceImages(accepted, error) {
            if (accepted.length) {
                const referenceImages = [...this.data.referenceImages, ...accepted].slice(0, constants_1.REFERENCE_IMAGE_LIMITS.maxCount);
                this.setData({
                    referenceImages,
                    referenceImageCount: referenceImages.length,
                    referenceCanAddImage: referenceImages.length < constants_1.REFERENCE_IMAGE_LIMITS.maxCount,
                    referenceUploadError: error,
                });
                this.refreshReferenceModeState();
                this.refreshRetrievalState();
                this.refreshCanSubmit();
            }
            else if (error) {
                this.setData({ referenceUploadError: error });
            }
        },
        removeReferenceImage(event) {
            const id = String(event.currentTarget.dataset.id || '');
            const referenceImages = this.data.referenceImages.filter((image) => image.id !== id);
            this.setData({
                referenceImages,
                referenceImageCount: referenceImages.length,
                referenceCanAddImage: referenceImages.length < constants_1.REFERENCE_IMAGE_LIMITS.maxCount,
                referenceUploadError: '',
            });
            this.refreshReferenceModeState();
            this.refreshRetrievalState();
            this.refreshCanSubmit();
        },
        previewReferenceImage(event) {
            const path = String(event.currentTarget.dataset.path || '');
            if (!path)
                return;
            const current = this.data.referenceImages.find((image) => image.path === path);
            if (!current || !current.canPreview) {
                wx.showToast({ title: 'SVG 参考图会在服务端解析', icon: 'none' });
                return;
            }
            const urls = this.data.referenceImages.filter((image) => image.canPreview).map((image) => image.path);
            wx.previewImage({ current: path, urls: urls.length ? urls : [path] });
        },
        onReferenceModeTap(event) {
            const mode = (0, reference_mode_1.normalizeReferenceImageMode)(String(event.currentTarget.dataset.mode || ''), this.data.referenceImageMode);
            if (mode === 'main_model' && !this.data.canSelectMainModelDirect) {
                wx.showToast({ title: '当前主模型不支持直读', icon: 'none' });
                return;
            }
            this.setData({ referenceImageMode: mode });
            this.refreshReferenceModeState();
            this.refreshCanSubmit();
        },
        refreshReferenceModeState() {
            var _a;
            const settings = this.data.settings;
            const mainRoute = (_a = settings.modelRoutes) === null || _a === void 0 ? void 0 : _a.main;
            const mainEntry = mainRoute && this.data.registryReady
                ? (0, model_registry_1.findRegistryModel)(this.data.registry, mainRoute.accessProvider, mainRoute.modelId)
                : null;
            const mainCanRead = Boolean(mainEntry && (mainEntry.inputModalities.includes('image') || mainEntry.capabilities.referenceImages === true));
            const modeState = (0, reference_mode_1.buildReferenceModeState)({
                hasReferenceImages: this.data.referenceImages.length > 0,
                isAdvancedMode: this.data.isAdvancedMode,
                requestedMode: this.data.referenceImageMode,
                mainModelCanRead: mainCanRead,
            });
            this.setData({
                referenceModeCanSubmit: modeState.referenceModeCanSubmit,
                referenceModeNote: this.data.referenceImages.length ? modeState.referenceModeNote : '',
                shouldShowReferenceModeSelector: this.data.referenceImages.length > 0 && modeState.shouldShowReferenceModeSelector,
                canSelectMainModelDirect: modeState.canSelectMainModelDirect,
                referenceNeedsVisionModel: this.data.referenceImages.length > 0 && modeState.needsVisionModel,
            });
        },
        async uploadReferencesForJob() {
            if (!this.data.referenceImages.length)
                return [];
            this.setData({
                isUploadingReferences: true,
                referenceUploadError: '',
            });
            this.refreshCanSubmit();
            let preparedUploads = [];
            try {
                const files = this.data.referenceImages.map((image) => ({
                    clientId: `${image.id}:original`,
                    role: 'original',
                    filename: image.filename,
                    mimeType: image.mimeType,
                    size: image.size,
                }));
                const prepared = await (0, api_1.requestJson)({
                    action: 'prepareReferenceUpload',
                    files,
                });
                preparedUploads = prepared.uploads || [];
                const uploadMap = new Map(preparedUploads.map((upload) => [upload.clientId, upload]));
                for (const image of this.data.referenceImages) {
                    const upload = uploadMap.get(`${image.id}:original`);
                    if (!upload || !upload.uploadUrl)
                        throw new Error('参考图上传地址创建失败。');
                    await (0, api_1.uploadReferenceFile)(image.path, upload.uploadUrl, image.mimeType);
                }
                const uploaded = this.data.referenceImages.map((image) => {
                    const upload = uploadMap.get(`${image.id}:original`);
                    if (!upload)
                        throw new Error('参考图上传结果缺少原图记录。');
                    return {
                        filename: image.filename,
                        mimeType: image.mimeType,
                        size: image.size,
                        objectKey: upload.objectKey,
                        uploadToken: upload.uploadToken,
                    };
                });
                await (0, api_1.requestJson)({ action: 'finalizeReferenceUpload', uploads: uploaded });
                return uploaded;
            }
            catch (error) {
                if (preparedUploads.length) {
                    await (0, api_1.requestJson)({ action: 'abortReferenceUpload', uploads: preparedUploads }).catch(() => undefined);
                }
                const message = (0, api_1.formatError)(error);
                this.setData({ referenceUploadError: message });
                throw new Error(message);
            }
            finally {
                this.setData({ isUploadingReferences: false });
                this.refreshCanSubmit();
            }
        },
        async checkHealth() {
            try {
                const data = await (0, api_1.requestJson)({ action: 'health' }, 
                // 启动期探测用短超时：失败只影响警示条展示，避免 60s 超时在控制台报 Error: timeout
                { timeout: 15000 });
                const laf = data.laf || {};
                const ok = Boolean(data.ok || laf.ok || data.code === 0);
                this.setData({
                    healthOk: ok,
                    healthChecked: true,
                    healthText: ok ? '后端可用' : '后端异常，生成功能可能暂不可用',
                });
            }
            catch (error) {
                this.setData({
                    healthOk: false,
                    healthChecked: true,
                    healthText: `后端异常：${(0, api_1.formatError)(error)}`,
                });
            }
        },
        async submitJob() {
            if (!this.data.canSubmit || this.data.isSubmitting)
                return;
            // 生产目录是每次付费任务的唯一真相。提交前强制重新读取，失败时在任何上传或任务写入前停止。
            this.setData({ isSubmitting: true, error: '' });
            const registryState = await (0, model_registry_store_1.loadModelRegistry)(true);
            const registry = registryState.registry;
            if (!registry) {
                this.setData({ isSubmitting: false, error: '模型目录不可用，已禁止新建任务。' });
                this.refreshCanSubmit();
                return;
            }
            // 先停掉上一个任务的轮询，避免旧任务在途响应污染"提交中"状态（见 loadJob 的 jobId 校验）
            this.stopPolling();
            const settings = this.data.settings;
            if (!settings.modelRoutes) {
                this.setData({ isSubmitting: false, error: '模型设置不完整，请重新打开设置。' });
                this.refreshCanSubmit();
                return;
            }
            const category = constants_1.INFOGRAPHIC_CATEGORIES[this.data.categoryIndex] || constants_1.INFOGRAPHIC_CATEGORIES[0];
            const mainRoute = settings.modelRoutes.main;
            const mainEntry = (0, model_registry_1.findRegistryModel)(registry, mainRoute.accessProvider, mainRoute.modelId);
            const mainCanRead = Boolean(mainEntry && (mainEntry.inputModalities.includes('image') || mainEntry.capabilities.referenceImages === true));
            const activeReferenceImageMode = settings.configurationMode === 'advanced'
                ? this.data.referenceImageMode
                : (0, reference_mode_1.defaultReferenceImageMode)(mainCanRead);
            this.setData({
                isSubmitting: true,
                error: '',
                job: null,
                resultImages: [],
                statusLabel: '',
            });
            wx.showLoading({ title: '提交中' });
            try {
                const uploadedReferenceImages = await this.uploadReferencesForJob();
                const payload = (0, payload_1.buildCreateJobPayload)({
                    configurationMode: settings.configurationMode,
                    provider: mainRoute.accessProvider,
                    registry,
                    modelRoutes: settings.modelRoutes,
                    apiKeys: (0, api_keys_1.getApiKeys)(),
                    categoryId: category.id,
                    categoryLabel: category.label,
                    methodContent: this.data.methodContent,
                    caption: this.data.caption,
                    negativePrompt: this.data.negativePrompt,
                    outputFormat: settings.outputFormat,
                    imageSize: settings.imageSize,
                    referenceImageMode: activeReferenceImageMode,
                    uploadedReferenceImages,
                    pipelineMode: settings.pipelineMode,
                    retrievalSetting: settings.retrievalSetting,
                    manualReferenceIds: this.data.manualReferenceIds,
                    aspectRatio: settings.aspectRatio,
                    numCandidates: settings.numCandidates,
                    maxCriticRounds: settings.maxCriticRounds,
                });
                const data = await (0, api_1.requestJson)(payload);
                const jobId = data.jobId || data.id || '';
                if (!jobId)
                    throw new Error('后端没有返回任务 ID');
                this.setData({
                    currentJobId: jobId,
                    statusLabel: constants_1.STATUS_LABELS[data.status || 'queued'] || String(data.status || '排队中'),
                });
                wx.hideLoading();
                wx.showToast({ title: '任务已提交', icon: 'success' });
                // 提交等待期间用户可能已切到别的 tab：隐藏时不起 timer，回到本页由 pageLifetimes.show 恢复
                if (this.isPageVisible !== false) {
                    this.startPolling(jobId);
                }
            }
            catch (error) {
                this.setData({ error: (0, api_1.formatError)(error) });
                wx.hideLoading();
                wx.showToast({ title: '提交失败', icon: 'none' });
            }
            finally {
                this.setData({ isSubmitting: false });
                this.refreshCanSubmit();
            }
        },
        async refreshCurrentJob() {
            if (!this.data.currentJobId)
                return;
            await this.loadJob(this.data.currentJobId);
        },
        async loadJob(jobId) {
            try {
                const data = await (0, api_1.requestJson)({
                    action: 'getJob',
                    jobId,
                });
                // 在途响应可能晚于新任务提交落地：只接受当前任务的响应，避免旧任务覆盖状态/误停新轮询
                if (jobId !== this.data.currentJobId)
                    return;
                const job = (0, jobs_1.normalizeJob)(data.job);
                this.setData({
                    job: (0, jobs_1.toCurrentJobSummary)(job),
                    statusLabel: constants_1.STATUS_LABELS[job.status] || job.status || '未知',
                    resultImages: job.result_images,
                    error: job.status === 'failed' ? (0, api_1.formatError)(job.error || job.logs_tail || '生成失败') : '',
                });
                (0, jobs_1.appendLocalJob)(job);
                if (job.status === 'succeeded' || job.status === 'failed') {
                    this.stopPolling();
                }
            }
            catch (error) {
                if (jobId !== this.data.currentJobId)
                    return;
                this.setData({ error: (0, api_1.formatError)(error) });
            }
        },
        startPolling(jobId) {
            this.stopPolling();
            this.loadJob(jobId);
            const timer = setInterval(() => {
                this.loadJob(jobId);
            }, 3000);
            this.pollingTimer = timer;
        },
        stopPolling() {
            const timer = this.pollingTimer;
            if (timer)
                clearInterval(timer);
            this.pollingTimer = undefined;
        },
        previewImage(event) {
            const url = String(event.currentTarget.dataset.url || '');
            const canPreview = (0, constants_1.readDatasetBoolean)(event.currentTarget.dataset.canPreview, true);
            if (!url)
                return;
            if (!canPreview) {
                (0, media_1.downloadShareFile)(url);
                return;
            }
            const urls = this.data.resultImages.filter((image) => image.can_preview).map((image) => image.url).filter(Boolean);
            wx.previewImage({
                current: url,
                urls: urls.length ? urls : [url],
            });
        },
        handleImageAction(event) {
            const url = String(event.currentTarget.dataset.url || '');
            const canPreview = (0, constants_1.readDatasetBoolean)(event.currentTarget.dataset.canPreview, true);
            if (!url)
                return;
            if (!canPreview) {
                (0, media_1.downloadShareFile)(url);
                return;
            }
            (0, media_1.saveImageToAlbum)(url);
        },
        copyJobId() {
            if (!this.data.currentJobId)
                return;
            wx.setClipboardData({ data: this.data.currentJobId });
        },
        openJobDetail() {
            if (!this.data.currentJobId)
                return;
            wx.navigateTo({ url: `/pages/job-detail/job-detail?jobId=${this.data.currentJobId}` });
        },
        refreshCanSubmit() {
            const settings = this.data.settings;
            if (!this.data.registryReady || !settings.modelRoutes) {
                this.setData({ canSubmit: false });
                return;
            }
            const hasManualReferences = settings.configurationMode !== 'advanced' ||
                this.data.referenceImages.length > 0 ||
                settings.retrievalSetting !== 'manual' ||
                this.data.manualReferenceIds.length > 0;
            const category = constants_1.INFOGRAPHIC_CATEGORIES[this.data.categoryIndex] || constants_1.INFOGRAPHIC_CATEGORIES[0];
            const roles = (0, model_routing_1.requiredCreateRouteRoles)({
                outputFormat: settings.outputFormat,
                taskName: category.id === constants_1.PLOT_CATEGORY_ID ? 'plot' : 'diagram',
                pipelineMode: settings.pipelineMode,
                retrievalSetting: settings.retrievalSetting,
                imageSize: settings.imageSize,
                referenceImages: this.data.referenceImages,
                referenceImageMode: this.data.referenceImageMode,
            }, settings.maxCriticRounds);
            const apiKeys = (0, api_keys_1.getApiKeys)();
            const hasRequiredKeys = (0, model_routing_1.uniqueProvidersForRoles)(settings.modelRoutes, roles).every((provider) => { var _a; return Boolean((_a = apiKeys[provider]) === null || _a === void 0 ? void 0 : _a.trim()); });
            const hasArkVerification = (0, model_routing_1.missingArkVerifications)((0, model_routing_1.arkProbesForRoles)(settings.modelRoutes, roles), (0, ark_verification_1.getArkVerification)()).length === 0;
            const canSubmit = Boolean(hasRequiredKeys &&
                hasArkVerification &&
                this.data.methodContent.trim().length >= 20 &&
                this.data.caption.trim().length >= 3 &&
                this.data.negativePrompt.length <= 1000 &&
                (settings.outputFormat === 'svg' || Boolean(settings.imageSize)) &&
                hasManualReferences &&
                this.data.referenceModeCanSubmit &&
                !this.data.isUploadingReferences &&
                !this.data.isSubmitting);
            this.setData({ canSubmit });
        },
        openAuthPanel() {
            this.setData({ showAuthPanel: true });
        },
        closeAuthPanel() {
            this.setData({ showAuthPanel: false });
        },
        onAuthed() {
            this.setData({ showAuthPanel: false });
        },
        async signOut() {
            await (0, session_1.signOut)();
            wx.showToast({ title: '已退出', icon: 'success' });
        },
        openFeedbackPanel() {
            this.setData({ showFeedbackPanel: true });
        },
        closeFeedbackPanel() {
            this.setData({ showFeedbackPanel: false });
        },
        onShareAppMessage() {
            return { title: '图研Tuyan · 开源学术图示工作台', path: '/pages/index/index' };
        },
    },
});
function defaultGenerationSettings(registry) {
    const simpleProvider = 'bailian';
    return {
        configurationMode: 'simple',
        simpleProvider,
        modelRoutes: (0, model_routing_1.providerDefaultRoutes)(simpleProvider, registry),
        outputFormat: 'png',
        imageSize: '1K',
        aspectRatio: 'auto',
        pipelineMode: 'planner_critic',
        retrievalSetting: 'none',
        numCandidates: 1,
        maxCriticRounds: 1,
    };
}
function formatSettingsSummary(settings) {
    const routes = settings.modelRoutes;
    return `主 ${routes.main.modelId} · 图 ${routes.image.modelId} · 识 ${routes.vision.modelId}`;
}
function formatSettingsSummaryDetails(settings) {
    const pipelineLabels = { planner_critic: '规划器 + 评审器', full: '完整流程', vanilla: '基础生成' };
    const retrievalLabels = { none: '不检索', auto: '自动检索', random: '随机参考', manual: '手动参考' };
    return [
        `${settings.aspectRatio === 'auto' ? '自动比例' : settings.aspectRatio} · ${settings.outputFormat.toUpperCase()}${settings.outputFormat === 'png' ? ` · ${settings.imageSize}` : ''}`,
        `${pipelineLabels[settings.pipelineMode] || settings.pipelineMode} · ${retrievalLabels[settings.retrievalSetting] || settings.retrievalSetting}`,
        `${settings.numCandidates} 张候选 · ${settings.maxCriticRounds} 轮评审`,
    ];
}
