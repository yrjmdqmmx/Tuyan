"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
        registry: {}, registryReady: false, registryVersion: '等待目录', registryError: '',
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
            ;
            this.unsubscribeRegistry = (0, model_registry_store_1.subscribeModelRegistry)((state) => this.applyRegistryState(state));
            this.unsubscribeSession = (0, session_1.subscribeSession)((user) => {
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
            this.stopPolling();
        },
    },
    pageLifetimes: { show() { this.loadSources(); }, hide() { this.stopPolling(); } },
    methods: {
        applyRegistryState(state) {
            if (!state.registry) {
                this.setData({ registry: {}, registryReady: false, registryError: state.error });
                this.refreshCanSubmit();
                return;
            }
            const current = this.data.settings;
            const settings = current.modelRoutes ? current : defaultSettings(state.registry);
            this.setData({ registry: state.registry, registryReady: true, registryVersion: state.registry.registryVersion, registryError: '', settings });
            this.refreshCapabilities();
            this.refreshCanSubmit();
        },
        async retryRegistry() { await (0, model_registry_store_1.loadModelRegistry)(true); },
        async loadSources() {
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
            const sourceOptions = jobs.flatMap((job) => job.result_images.map((image, index) => sourceOption(job, image, index))).filter((item) => Boolean(item.url || item.objectKey));
            const previous = this.data.source;
            const sourceIndex = Math.max(0, sourceOptions.findIndex((item) => item.jobId === (previous === null || previous === void 0 ? void 0 : previous.jobId) && item.objectKey === (previous === null || previous === void 0 ? void 0 : previous.objectKey)));
            this.setData({ sourceOptions, sourceIndex, source: sourceOptions[sourceIndex] || null });
            this.refreshCanSubmit();
        },
        onSourceChange(event) { const sourceIndex = Number(event.detail.value) || 0; this.setData({ sourceIndex, source: this.data.sourceOptions[sourceIndex] || null }); this.refreshCanSubmit(); },
        onInstructionInput(event) { this.setData({ instruction: event.detail.value }); this.refreshCanSubmit(); },
        onRatioChange(event) { this.setData({ ratioIndex: Number(event.detail.value) || 0 }); this.refreshCanSubmit(); },
        onResolutionChange(event) { this.setData({ resolutionIndex: Number(event.detail.value) || 0 }); this.refreshCanSubmit(); },
        openSettings() { if (this.data.registryReady)
            this.setData({ showSettings: true, apiKeysForSheet: (0, api_keys_1.getApiKeys)(), settingsExecutionRoles: (0, model_routing_1.requiredRefineRouteRoles)({ refineMode: this.data.refineMode }) }); },
        closeSettings() { this.setData({ showSettings: false }); },
        saveSettings(event) { (0, api_keys_1.replaceApiKeys)(event.detail.apiKeys); this.setData({ settings: event.detail.settings, apiKeysForSheet: (0, api_keys_1.getApiKeys)(), showSettings: false }); this.refreshCapabilities(); this.refreshCanSubmit(); },
        refreshCapabilities() {
            const registry = this.data.registryReady ? this.data.registry : null;
            const settings = this.data.settings;
            if (!registry || !settings.modelRoutes)
                return;
            const entry = (0, model_registry_1.findRegistryModel)(registry, settings.modelRoutes.image.accessProvider, settings.modelRoutes.image.modelId);
            const capability = String((entry === null || entry === void 0 ? void 0 : entry.capabilities.imageEditMode) || 'none');
            const refineMode = capability === 'direct-edit' && ((entry === null || entry === void 0 ? void 0 : entry.inputModalities.includes('image')) || (entry === null || entry === void 0 ? void 0 : entry.capabilities.referenceImages) === true) ? 'direct-edit' : (entry === null || entry === void 0 ? void 0 : entry.roles.includes('image')) ? 'analyze-redraw' : 'none';
            const ratioOptions = (0, aspect_ratios_1.buildAspectRatioOptions)({ capabilities: (entry === null || entry === void 0 ? void 0 : entry.capabilities) || {}, capabilityField: 'refineAspectRatios', modelLabel: entry === null || entry === void 0 ? void 0 : entry.label }).filter((item) => !item.disabled).map((item) => ({ value: item.value, label: item.label }));
            const resolutionOptions = (0, aspect_ratios_1.buildResolutionOptions)((entry === null || entry === void 0 ? void 0 : entry.capabilities) || {}, 'refineResolutions');
            this.setData({ refineMode, refineModeLabel: refineMode === 'direct-edit' ? '直接编辑' : refineMode === 'analyze-redraw' ? '分析后重绘' : '不支持精修', ratioOptions, resolutionOptions, ratioIndex: 0, resolutionIndex: 0 });
        },
        refreshCanSubmit() {
            const settings = this.data.settings;
            if (!this.data.registryReady || !settings.modelRoutes) {
                this.setData({ canSubmit: false });
                return;
            }
            const roles = (0, model_routing_1.requiredRefineRouteRoles)({ refineMode: this.data.refineMode });
            const keys = (0, api_keys_1.getApiKeys)();
            const hasKeys = (0, model_routing_1.uniqueProvidersForRoles)(settings.modelRoutes, roles).every((provider) => { var _a; return Boolean((_a = keys[provider]) === null || _a === void 0 ? void 0 : _a.trim()); });
            this.setData({ canSubmit: Boolean(this.data.source && this.data.instruction.trim().length >= 3 && this.data.refineMode !== 'none' && this.data.ratioOptions.length && this.data.resolutionOptions.length && hasKeys && !this.data.isSubmitting) });
        },
        async submitRefine() {
            var _a, _b;
            if (!this.data.canSubmit || this.data.isSubmitting || !this.data.source)
                return;
            this.setData({ isSubmitting: true, error: '', job: null });
            const registryState = await (0, model_registry_store_1.loadModelRegistry)(true);
            const registry = registryState.registry;
            if (!registry) {
                this.setData({ isSubmitting: false, error: '模型目录不可用，已禁止精修任务。' });
                this.refreshCanSubmit();
                return;
            }
            const settings = this.data.settings;
            try {
                const payload = (0, refine_1.buildRefineJobPayload)({ configurationMode: settings.configurationMode, modelRoutes: settings.modelRoutes, registry, apiKeys: (0, api_keys_1.getApiKeys)(), source: { url: this.data.source.url, objectKey: this.data.source.objectKey }, editInstruction: this.data.instruction, aspectRatio: ((_a = this.data.ratioOptions[this.data.ratioIndex]) === null || _a === void 0 ? void 0 : _a.value) || 'auto', imageSize: ((_b = this.data.resolutionOptions[this.data.resolutionIndex]) === null || _b === void 0 ? void 0 : _b.value) || '', refineMode: this.data.refineMode === 'direct-edit' ? 'direct-edit' : 'analyze-redraw' });
                const response = await (0, api_1.requestJson)(payload);
                const jobId = response.jobId || response.id || '';
                if (!jobId)
                    throw new Error('后端没有返回精修任务 ID');
                this.setData({ currentJobId: jobId });
                this.startPolling(jobId);
                wx.showToast({ title: '精修已提交', icon: 'success' });
            }
            catch (error) {
                this.setData({ error: (0, api_1.formatError)(error) });
            }
            finally {
                this.setData({ isSubmitting: false });
                this.refreshCanSubmit();
            }
        },
        async loadJob(jobId) { try {
            const response = await (0, api_1.requestJson)({ action: 'getJob', jobId });
            if (jobId !== this.data.currentJobId)
                return;
            const job = (0, jobs_1.normalizeJob)(response.job);
            this.setData({ job, error: job.status === 'failed' ? (0, api_1.formatError)(job.error || job.business_code) : '' });
            if (job.status === 'succeeded' || job.status === 'failed')
                this.stopPolling();
        }
        catch (error) {
            this.setData({ error: (0, api_1.formatError)(error) });
        } },
        startPolling(jobId) { this.stopPolling(); void this.loadJob(jobId); this.pollingTimer = setInterval(() => { void this.loadJob(jobId); }, 3000); },
        stopPolling() { const timer = this.pollingTimer; if (timer)
            clearInterval(timer); this.pollingTimer = undefined; },
        openAuthPanel() { this.setData({ showAuthPanel: true }); }, closeAuthPanel() { this.setData({ showAuthPanel: false }); }, onAuthed() { this.setData({ showAuthPanel: false }); this.loadSources(); },
        onShareAppMessage() { return { title: '图研Tuyan · 独立精修', path: '/pages/refine/refine' }; },
    },
});
function defaultSettings(registry) { const simpleProvider = 'bailian'; return { configurationMode: 'simple', simpleProvider, modelRoutes: (0, model_routing_1.providerDefaultRoutes)(simpleProvider, registry), outputFormat: 'png', imageSize: '1K', aspectRatio: 'auto', pipelineMode: 'planner_critic', retrievalSetting: 'none', numCandidates: 1, maxCriticRounds: 1 }; }
function sourceOption(job, image, index) { return { label: `${job.caption || job.id} · 结果 ${index + 1}`, jobId: job.id, url: image.url, objectKey: image.object_key }; }
