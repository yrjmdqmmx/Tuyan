"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tokendance_1 = require("../../utils/tokendance");
const api_1 = require("../../utils/api");
const constants_1 = require("../../utils/constants");
const jobs_1 = require("../../utils/jobs");
const media_1 = require("../../utils/media");
Component({
    data: {
        jobId: '',
        job: null,
        error: '',
        isLoading: true,
        retrySeconds: 0,
    },
    lifetimes: {
        detached() {
            this.stopPolling();
            this.stopRecoveryCountdown();
        },
    },
    pageLifetimes: {
        show() {
            this.startRecoveryCountdown();
            if (this.pollingTimer)
                return;
            const status = this.data.job ? this.data.job.status : '';
            if (this.data.jobId && status !== 'succeeded' && status !== 'failed') {
                this.startPolling();
            }
        },
        hide() {
            this.stopPolling();
            this.stopRecoveryCountdown();
        },
    },
    methods: {
        openTokenDance: tokendance_1.openTokenDance,
        async resumeJob() {
            var _a, _b;
            if (!((_b = (_a = this.data.job) === null || _a === void 0 ? void 0 : _a.recovery) === null || _b === void 0 ? void 0 : _b.canResume) || this.resuming)
                return;
            this.startRecoveryCountdown();
            if (this.data.retrySeconds > 0) {
                this.setData({ error: `请等待 ${this.data.retrySeconds} 秒后恢复原任务。` });
                return;
            }
            ;
            this.resuming = true;
            this.setData({ error: '' });
            try {
                await (0, api_1.requestJson)({ action: 'tokenDanceResume', jobId: this.data.jobId });
                this.startPolling();
            }
            catch (error) {
                this.setData({ error: (0, api_1.formatError)(error) });
            }
            finally {
                this.resuming = false;
            }
        },
        startRecoveryCountdown() {
            this.stopRecoveryCountdown();
            const update = () => {
                var _a;
                const recovery = (_a = this.data.job) === null || _a === void 0 ? void 0 : _a.recovery;
                const retryAt = (recovery === null || recovery === void 0 ? void 0 : recovery.canResume) ? Date.parse(recovery.retryAt || '') : 0;
                const retrySeconds = Number.isFinite(retryAt) ? Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)) : 0;
                this.setData({ retrySeconds });
                if (!retrySeconds)
                    this.stopRecoveryCountdown();
            };
            update();
            if (this.data.retrySeconds > 0)
                this.recoveryTimer = setInterval(update, 1000);
        },
        stopRecoveryCountdown() {
            const timer = this.recoveryTimer;
            if (timer)
                clearInterval(timer);
            this.recoveryTimer = undefined;
        },
        onLoad(options) {
            const jobId = String(options.jobId || '');
            if (!jobId) {
                this.setData({ error: '缺少任务 ID', isLoading: false });
                return;
            }
            this.setData({ jobId });
            this.startPolling();
        },
        onUnload() {
            this.stopPolling();
            this.stopRecoveryCountdown();
        },
        async loadJob() {
            const jobId = this.data.jobId;
            if (!jobId)
                return;
            try {
                const data = await (0, api_1.requestJson)({ action: 'getJob', jobId });
                const job = (0, jobs_1.normalizeJob)(data.job);
                this.setData({
                    job,
                    error: '',
                    isLoading: false,
                });
                if (job.status === 'succeeded' || job.status === 'failed') {
                    this.stopPolling();
                }
                this.startRecoveryCountdown();
            }
            catch (error) {
                this.setData({
                    error: (0, api_1.formatError)(error),
                    isLoading: false,
                });
            }
        },
        startPolling() {
            this.stopPolling();
            this.loadJob();
            const timer = setInterval(() => {
                this.loadJob();
            }, 3000);
            this.pollingTimer = timer;
        },
        stopPolling() {
            const timer = this.pollingTimer;
            if (timer)
                clearInterval(timer);
            this.pollingTimer = undefined;
        },
        refresh() {
            this.loadJob();
        },
        copyJobId() {
            if (!this.data.jobId)
                return;
            wx.setClipboardData({ data: this.data.jobId });
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
            const job = this.data.job;
            const urls = job ? job.result_images.filter((image) => image.can_preview).map((image) => image.url).filter(Boolean) : [];
            wx.previewImage({ current: url, urls: urls.indexOf(url) >= 0 ? urls : [url] });
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
    },
});
