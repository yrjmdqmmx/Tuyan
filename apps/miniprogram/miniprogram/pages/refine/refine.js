"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const refine_upload_1 = require("../../utils/refine-upload");
const media_1 = require("../../utils/media");
const provider_regions_1 = require("../../utils/provider-regions");
const api_1 = require("../../utils/api");
const api_keys_1 = require("../../utils/api-keys");
const aspect_ratios_1 = require("../../utils/aspect-ratios");
const model_registry_1 = require("../../utils/model-registry");
const model_registry_store_1 = require("../../utils/model-registry-store");
const model_routing_1 = require("../../utils/model-routing");
const jobs_1 = require("../../utils/jobs");
const refine_1 = require("../../utils/refine");
const session_1 = require("../../utils/session");
Component({
    data: {
        emptyObject: {},
        settingsPurpose: 'refine',
        uploadEnabled: false, uploadBusy: false, uploadStage: '', uploadError: '', canRetryUpload: false,
        optimizationBusy: false, optimizationInputs: { editInstruction: '' },
        registryReady: false, registryVersion: '等待目录', registryError: '',
        settings: {}, showSettings: false, apiKeysForSheet: {},
        settingsExecutionRoles: [],
        sourceOptions: [], sourceIndex: 0, source: null,
        instruction: '', ratioOptions: [], ratioIndex: 0,
        resolutionOptions: [], resolutionIndex: 0, refineMode: 'none', refineModeLabel: '暂不可用',
        canSubmit: false, isSubmitting: false, error: '', currentJobId: '', job: null,
        isLoggedIn: false, isAuthChecking: true, showAuthPanel: false,
    },
    lifetimes: {
        attached() {
            var _a;
            ;
            this.ownerId = ((_a = (0, session_1.getCurrentUser)()) === null || _a === void 0 ? void 0 : _a.id) || '';
            this.ownerEpoch = 0;
            this.visible = true;
            this.unsubscribeRegistry = (0, model_registry_store_1.subscribeModelRegistry)((state) => this.applyRegistryState(state));
            this.unsubscribeSession = (0, session_1.subscribeSession)((user) => {
                if (this.ownerId !== ((user === null || user === void 0 ? void 0 : user.id) || '')) {
                    ;
                    this.ownerEpoch++;
                    this.ownerId = (user === null || user === void 0 ? void 0 : user.id) || '';
                    this.stopPolling();
                    this.resetUpload();
                    this.setData({ sourceOptions: [], source: null, currentJobId: '', job: null, error: '', instruction: '', isSubmitting: false, apiKeysForSheet: {}, showSettings: false });
                }
                this.setData({ isLoggedIn: Boolean(user), isAuthChecking: false });
                this.loadSources();
            });
            this.setData({ isLoggedIn: Boolean((0, session_1.getCurrentUser)()), isAuthChecking: !(0, session_1.isSessionChecked)() });
            void (0, model_registry_store_1.loadModelRegistry)();
            this.loadSources();
        },
        detached() {
            const registry = this.unsubscribeRegistry;
            if (registry)
                registry();
            const session = this.unsubscribeSession;
            if (session)
                session();
            this.detached = true;
            this.stopPolling();
            this.resetUpload();
        },
    },
    pageLifetimes: {
        show() { var _a; this.visible = true; this.loadSources(); if (this.data.currentJobId && !['succeeded', 'failed'].includes(((_a = this.data.job) === null || _a === void 0 ? void 0 : _a.status) || ''))
            this.startPolling(this.data.currentJobId); },
        hide() { this.visible = false; this.stopPolling(); },
    },
    methods: {
        applyRegistryState(state) {
            var _a;
            if (!state.registry) {
                this.setData({ registryReady: false, registryError: state.error, uploadEnabled: false });
                this.refreshCanSubmit();
                return;
            }
            const current = this.data.settings;
            const settings = current.modelRoutes ? current : defaultSettings(state.registry);
            this.setData({ registryReady: true, registryVersion: state.registry.registryVersion, registryError: '', settings, uploadEnabled: ((_a = state.registry.refineUpload) === null || _a === void 0 ? void 0 : _a.version) === 1 });
            this.refreshCapabilities();
            this.refreshCanSubmit();
        },
        async retryRegistry() { await (0, model_registry_store_1.loadModelRegistry)(true); },
        async loadSources() {
            var _a, _b;
            const owner = ((_a = (0, session_1.getCurrentUser)()) === null || _a === void 0 ? void 0 : _a.id) || '';
            const epoch = this.ownerEpoch;
            const sequence = this.sourcesSequence = Number(this.sourcesSequence || 0) + 1;
            let jobs = (0, jobs_1.readLocalJobs)();
            if (this.data.isLoggedIn) {
                try {
                    const response = await (0, api_1.requestJson)({ action: 'myJobs', limit: 50 });
                    const accountJobs = (response.jobs || []).map(jobs_1.normalizeJob);
                    const known = new Set(jobs.map((job) => job.id));
                    jobs = [...jobs, ...accountJobs.filter((job) => !known.has(job.id))];
                }
                catch { /* 本机来源仍可用 */ }
            }
            if (owner !== (((_b = (0, session_1.getCurrentUser)()) === null || _b === void 0 ? void 0 : _b.id) || '') || epoch !== this.ownerEpoch || sequence !== this.sourcesSequence || this.detached)
                return;
            const sourceOptions = jobs.flatMap((job) => job.result_images.filter(image => image.can_preview).map((image, index) => sourceOption(job, image, index))).filter((item) => Boolean(item.url || item.objectKey));
            const previous = this.data.source;
            const sourceIndex = Math.max(0, sourceOptions.findIndex((item) => item.jobId === (previous === null || previous === void 0 ? void 0 : previous.jobId) && item.objectKey === (previous === null || previous === void 0 ? void 0 : previous.objectKey)));
            this.setData({ sourceOptions, sourceIndex, source: (previous === null || previous === void 0 ? void 0 : previous.uploaded) || this.data.uploadBusy ? previous : sourceOptions[sourceIndex] || null });
            this.refreshCanSubmit();
        },
        onSourceChange(event) { this.resetUpload(); const sourceIndex = Number(event.detail.value) || 0; this.setData({ sourceIndex, source: this.data.sourceOptions[sourceIndex] || null }); this.refreshCanSubmit(); },
        onInstructionInput(event) { this.setData({ instruction: event.detail.value, optimizationInputs: { editInstruction: event.detail.value } }); this.refreshCanSubmit(); },
        onOptimizationBusy(event) { this.setData({ optimizationBusy: event.detail.busy }); this.refreshCanSubmit(); },
        onOptimizationApply(event) { if (event.detail.target === 'editInstruction') {
            this.setData({ instruction: event.detail.value, optimizationInputs: { editInstruction: event.detail.value } });
            this.refreshCanSubmit();
        } },
        openOptimizationSettings() { this.setData({ settingsPurpose: 'optimize', showSettings: true, apiKeysForSheet: (0, api_keys_1.getApiKeys)(), settingsExecutionRoles: ['main'] }); },
        resetUpload() {
            var _a, _b, _c, _d;
            ;
            this.uploadSequence = Number(this.uploadSequence || 0) + 1;
            (_b = (_a = this.uploadTask) === null || _a === void 0 ? void 0 : _a.abort) === null || _b === void 0 ? void 0 : _b.call(_a);
            this.uploadTask = undefined;
            void ((_d = (_c = this).uploadCleanup) === null || _d === void 0 ? void 0 : _d.call(_c));
            this.uploadCleanup = undefined;
            this.uploadFile = undefined;
            this.setData({ uploadBusy: false, uploadStage: '', uploadError: '', canRetryUpload: false });
        },
        removeSource() { this.resetUpload(); this.setData({ source: null }); this.refreshCanSubmit(); },
        chooseSourceFile() {
            if (!this.data.isLoggedIn) {
                this.openAuthPanel();
                return;
            }
            if (!this.data.uploadEnabled || this.data.isSubmitting || this.data.optimizationBusy)
                return;
            wx.showActionSheet({ itemList: ['从相册选择原图', '从聊天文件选择'], success: result => {
                    if (result.tapIndex === 0)
                        wx.chooseMedia({ count: 1, mediaType: ['image'], sourceType: ['album'], sizeType: ['original'], success: result => {
                                const file = result.tempFiles[0];
                                if (file)
                                    void this.inspectSourceFile(file.tempFilePath, file.size);
                            } });
                    else
                        wx.chooseMessageFile({ count: 1, type: 'file', extension: ['png', 'jpg', 'jpeg', 'webp'], success: result => {
                                const file = result.tempFiles[0];
                                if (file)
                                    void this.inspectSourceFile(file.path, file.size, file.name);
                            } });
                } });
        },
        async inspectSourceFile(path, size, filename) {
            var _a;
            const epoch = this.ownerEpoch;
            try {
                const info = await new Promise((resolve, reject) => wx.getImageInfo({ src: path, success: resolve, fail: reject }));
                if (epoch !== this.ownerEpoch || this.detached)
                    return;
                const extension = String(info.type).toLowerCase().replace('jpeg', 'jpg');
                const mimeType = extension === 'jpg' ? 'image/jpeg' : `image/${extension}`;
                const file = { path, size, filename: filename || `refine-source.${extension}`, mimeType, width: info.width, height: info.height };
                (0, refine_upload_1.validateRefineFile)(file, (_a = (0, model_registry_store_1.getModelRegistryState)().registry) === null || _a === void 0 ? void 0 : _a.refineUpload, this.data.settings.modelRoutes.image);
                await this.uploadSource(file);
            }
            catch (error) {
                if (epoch === this.ownerEpoch)
                    this.setData({ uploadError: (0, api_1.formatError)(error) });
            }
        },
        async uploadSource(file) {
            var _a, _b;
            this.resetUpload();
            const sequence = this.uploadSequence;
            const epoch = this.ownerEpoch;
            const owner = ((_a = (0, session_1.getCurrentUser)()) === null || _a === void 0 ? void 0 : _a.id) || '';
            const sameOwner = () => { var _a; return Boolean(owner && owner === (((_a = (0, session_1.getCurrentUser)()) === null || _a === void 0 ? void 0 : _a.id) || '') && epoch === this.ownerEpoch); };
            const isCurrent = () => sameOwner() && sequence === this.uploadSequence && !this.detached;
            this.uploadFile = file;
            this.setData({ source: null, uploadBusy: true, uploadError: '', canRetryUpload: false });
            this.refreshCanSubmit();
            try {
                const result = await (0, refine_upload_1.uploadRefineSource)(file, {
                    limits: (_b = (0, model_registry_store_1.getModelRegistryState)().registry) === null || _b === void 0 ? void 0 : _b.refineUpload, route: this.data.settings.modelRoutes.image,
                    isCurrent, canCleanup: sameOwner,
                    onStage: stage => { if (isCurrent())
                        this.setData({ uploadStage: { preparing: '准备上传', uploading: '正在上传原图', checking: '校验图片', ready: '原图已就绪' }[stage] }); },
                    put: (path, url, mime) => (0, api_1.uploadReferenceFile)(path, url, mime, task => { var _a; if (isCurrent())
                        this.uploadTask = task;
                    else
                        (_a = task.abort) === null || _a === void 0 ? void 0 : _a.call(task); }),
                });
                if (!isCurrent()) {
                    await result.cleanup();
                    return;
                }
                ;
                this.uploadCleanup = result.cleanup;
                this.setData({ source: { ...result.source, jobId: '', label: result.source.filename } });
            }
            catch (error) {
                if (isCurrent())
                    this.setData({ uploadError: (0, api_1.formatError)(error), canRetryUpload: true, uploadStage: '上传未完成' });
            }
            finally {
                if (isCurrent()) {
                    this.uploadTask = undefined;
                    this.setData({ uploadBusy: false });
                    this.refreshCanSubmit();
                }
            }
        },
        retryUpload() { const file = this.uploadFile; if (file && !this.data.uploadBusy)
            void this.uploadSource(file); },
        onRatioChange(event) { this.setData({ ratioIndex: Number(event.detail.value) || 0 }); this.refreshCanSubmit(); },
        onResolutionChange(event) { this.setData({ resolutionIndex: Number(event.detail.value) || 0 }); this.refreshRatioOptions(); this.refreshCanSubmit(); },
        refreshRatioOptions() {
            var _a, _b;
            const registry = (0, model_registry_store_1.getModelRegistryState)().registry;
            const settings = this.data.settings;
            if (!registry || !settings.modelRoutes)
                return;
            const route = settings.modelRoutes.image;
            const entry = (0, model_registry_1.findRegistryModel)(registry, route.accessProvider, route.modelId);
            const resolution = (_a = this.data.resolutionOptions[this.data.resolutionIndex]) === null || _a === void 0 ? void 0 : _a.value;
            const previous = (_b = this.data.ratioOptions[this.data.ratioIndex]) === null || _b === void 0 ? void 0 : _b.value;
            const ratioOptions = (0, aspect_ratios_1.buildAspectRatioOptions)({ capabilities: (entry === null || entry === void 0 ? void 0 : entry.capabilities) || {}, capabilityField: 'refineAspectRatios', resolution }).filter(item => !item.disabled).map(item => ({ value: item.value, label: item.label }));
            this.setData({ ratioOptions, ratioIndex: Math.max(0, ratioOptions.findIndex(item => item.value === previous)) });
        },
        openSettings() { if (this.data.registryReady && !this.data.isSubmitting && !this.data.uploadBusy)
            this.setData({ settingsPurpose: 'refine', showSettings: true, apiKeysForSheet: (0, api_keys_1.getApiKeys)(), settingsExecutionRoles: (0, model_routing_1.requiredRefineRouteRoles)({ refineMode: this.data.refineMode }) }); },
        closeSettings() { this.setData({ showSettings: false }); },
        saveSettings(event) { (0, api_keys_1.replaceApiKeys)(event.detail.apiKeys); this.setData({ settings: event.detail.settings, apiKeysForSheet: (0, api_keys_1.getApiKeys)(), showSettings: false }); this.refreshCapabilities(); this.refreshCanSubmit(); },
        refreshCapabilities() {
            const registry = this.data.registryReady ? (0, model_registry_store_1.getModelRegistryState)().registry : null;
            const settings = this.data.settings;
            if (!registry || !settings.modelRoutes)
                return;
            const entry = (0, model_registry_1.findRegistryModel)(registry, settings.modelRoutes.image.accessProvider, settings.modelRoutes.image.modelId);
            const capability = String((entry === null || entry === void 0 ? void 0 : entry.capabilities.imageEditMode) || 'none');
            const refineMode = capability === 'direct-edit' || capability === 'analyze-redraw' ? capability : 'none';
            const ratioOptions = (0, aspect_ratios_1.buildAspectRatioOptions)({ capabilities: (entry === null || entry === void 0 ? void 0 : entry.capabilities) || {}, capabilityField: 'refineAspectRatios', modelLabel: entry === null || entry === void 0 ? void 0 : entry.label, resolution: settings.imageSize }).filter((item) => !item.disabled).map((item) => ({ value: item.value, label: item.label }));
            const resolutionOptions = (0, aspect_ratios_1.buildResolutionOptions)((entry === null || entry === void 0 ? void 0 : entry.capabilities) || {}, 'refineResolutions');
            const resolutionIndex = Math.max(0, resolutionOptions.findIndex(item => item.value === settings.imageSize));
            this.setData({ refineMode, refineModeLabel: refineMode === 'direct-edit' ? '直接编辑' : refineMode === 'analyze-redraw' ? '分析后重绘' : '不支持精修', ratioOptions, resolutionOptions, ratioIndex: Math.max(0, ratioOptions.findIndex(item => item.value === settings.aspectRatio)), resolutionIndex });
            this.refreshRatioOptions();
        },
        refreshCanSubmit() {
            this.setData({ optimizationInputs: { editInstruction: this.data.instruction } });
            const settings = this.data.settings;
            if (!this.data.registryReady || !settings.modelRoutes) {
                this.setData({ canSubmit: false });
                return;
            }
            const roles = (0, model_routing_1.requiredRefineRouteRoles)({ refineMode: this.data.refineMode });
            const keys = (0, provider_regions_1.selectRegionApiKeys)((0, api_keys_1.getApiKeys)(), settings.providerRegions);
            const hasKeys = (0, model_routing_1.uniqueProvidersForRoles)(settings.modelRoutes, roles).every((provider) => { var _a; return Boolean((_a = keys[provider]) === null || _a === void 0 ? void 0 : _a.trim()); });
            this.setData({ canSubmit: Boolean(this.data.source && this.data.instruction.trim().length >= 3 && this.data.refineMode !== 'none' && this.data.ratioOptions.length && this.data.resolutionOptions.length && hasKeys && this.data.isLoggedIn && !this.data.uploadBusy && !this.data.optimizationBusy && !this.data.isSubmitting) });
        },
        async submitRefine() {
            var _a, _b;
            if (!this.data.canSubmit || this.data.isSubmitting || !this.data.source)
                return;
            const epoch = this.ownerEpoch;
            const source = this.data.source;
            this.setData({ isSubmitting: true, error: '', job: null });
            this.stopPolling();
            const registryState = await (0, model_registry_store_1.loadModelRegistry)(true);
            const registry = registryState.registry;
            if (epoch !== this.ownerEpoch || this.detached)
                return;
            if (!registry) {
                this.setData({ isSubmitting: false, error: '模型目录不可用，已禁止精修任务。' });
                this.refreshCanSubmit();
                return;
            }
            const settings = this.data.settings;
            try {
                if (source.uploaded)
                    (0, refine_upload_1.validateRefineFile)(source, registry.refineUpload, settings.modelRoutes.image);
                const payload = (0, refine_1.buildRefineJobPayload)({ providerRegions: settings.providerRegions, configurationMode: settings.configurationMode, modelRoutes: settings.modelRoutes, registry, apiKeys: (0, api_keys_1.getApiKeys)(), source, editInstruction: this.data.instruction, aspectRatio: ((_a = this.data.ratioOptions[this.data.ratioIndex]) === null || _a === void 0 ? void 0 : _a.value) || 'auto', imageSize: ((_b = this.data.resolutionOptions[this.data.resolutionIndex]) === null || _b === void 0 ? void 0 : _b.value) || '', refineMode: this.data.refineMode === 'direct-edit' ? 'direct-edit' : 'analyze-redraw' });
                const response = await (0, api_1.requestJson)(payload);
                if (epoch !== this.ownerEpoch || this.detached)
                    return;
                // The accepted task owns the uploaded object now; removal must not abort it.
                if (source.uploaded) {
                    this.uploadCleanup = undefined;
                    this.uploadFile = undefined;
                    this.setData({ source: null, uploadStage: '' });
                }
                const jobId = response.jobId || response.id || '';
                if (!jobId)
                    throw new Error('后端没有返回精修任务 ID');
                this.setData({ currentJobId: jobId });
                if (this.visible !== false)
                    this.startPolling(jobId);
                wx.showToast({ title: '精修已提交', icon: 'success' });
            }
            catch (error) {
                if (epoch === this.ownerEpoch)
                    this.setData({ error: (0, api_1.formatError)(error) });
            }
            finally {
                if (epoch === this.ownerEpoch) {
                    this.setData({ isSubmitting: false });
                    this.refreshCanSubmit();
                }
            }
        },
        async loadJob(jobId) {
            const epoch = this.ownerEpoch;
            const key = `${epoch}:${jobId}`;
            if (this.pollingRequest === key)
                return;
            this.pollingRequest = key;
            const current = () => epoch === this.ownerEpoch && jobId === this.data.currentJobId && !this.detached;
            try {
                const response = await (0, api_1.requestJson)({ action: 'getJob', jobId });
                if (!current())
                    return;
                const job = (0, jobs_1.normalizeJob)(response.job);
                (0, jobs_1.appendLocalJob)(job);
                this.setData({ job, error: job.status === 'failed' ? (0, api_1.formatError)(job.business_code || job.error) : '' });
                if (job.status === 'succeeded' || job.status === 'failed')
                    this.stopPolling();
            }
            catch (error) {
                if (current())
                    this.setData({ error: (0, api_1.formatError)(error) });
            }
            finally {
                if (this.pollingRequest === key)
                    this.pollingRequest = undefined;
            }
        },
        refreshCurrentJob() { if (this.data.currentJobId)
            void this.loadJob(this.data.currentJobId); },
        openJobDetail() { if (this.data.currentJobId)
            wx.navigateTo({ url: `/pages/job-detail/job-detail?jobId=${this.data.currentJobId}` }); },
        previewImage(event) { var _a; const url = String(event.currentTarget.dataset.url || ''); if (url)
            wx.previewImage({ current: url, urls: ((_a = this.data.job) === null || _a === void 0 ? void 0 : _a.result_images.filter(image => image.can_preview).map(image => image.url)) || [url] }); },
        saveImage(event) { const url = String(event.currentTarget.dataset.url || ''); if (url)
            void (0, media_1.saveImageToAlbum)(url); },
        shareImage(event) { const url = String(event.currentTarget.dataset.url || ''); if (url)
            void (0, media_1.downloadShareFile)(url); },
        startPolling(jobId) { this.stopPolling(); void this.loadJob(jobId); this.pollingTimer = setInterval(() => { void this.loadJob(jobId); }, 3000); },
        stopPolling() { const timer = this.pollingTimer; if (timer)
            clearInterval(timer); this.pollingTimer = undefined; },
        openAuthPanel() { this.setData({ showAuthPanel: true }); }, closeAuthPanel() { this.setData({ showAuthPanel: false }); }, onAuthed() { this.setData({ showAuthPanel: false }); this.loadSources(); },
        onShareAppMessage() { return { title: '图研Tuyan · 独立精修', path: '/pages/refine/refine' }; },
    },
});
function defaultSettings(registry) { const simpleProvider = 'bailian'; return { configurationMode: 'simple', simpleProvider, modelRoutes: (0, model_routing_1.providerDefaultRoutes)(simpleProvider, registry), outputFormat: 'png', imageSize: '1K', aspectRatio: 'auto', pipelineMode: 'planner_critic', retrievalSetting: 'none', numCandidates: 1, maxCriticRounds: 1 }; }
function sourceOption(job, image, index) { return { label: `${job.caption || job.id} · 结果 ${index + 1}`, jobId: job.id, url: image.url, objectKey: image.object_key }; }
