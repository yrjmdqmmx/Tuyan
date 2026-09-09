"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const session_1 = require("../../utils/session");
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
    },
    lifetimes: {
        attached() {
            var _a;
            let owner = ((_a = (0, session_1.getCurrentUser)()) === null || _a === void 0 ? void 0 : _a.id) || '';
            this.epoch = 0;
            this.unsubscribeSession = (0, session_1.subscribeSession)(user => {
                if (owner !== ((user === null || user === void 0 ? void 0 : user.id) || '')) {
                    ;
                    this.epoch++;
                    owner = (user === null || user === void 0 ? void 0 : user.id) || '';
                    this.stopPolling();
                    this.setData({ job: null, jobId: '', error: '账号已切换，请从任务记录重新打开。', isLoading: false });
                }
            });
        },
        detached() {
            var _a, _b;
            ;
            this.epoch++;
            (_b = (_a = this).unsubscribeSession) === null || _b === void 0 ? void 0 : _b.call(_a);
            this.stopPolling();
        },
    },
    pageLifetimes: {
        show() {
            if (this.pollingTimer)
                return;
            const status = this.data.job ? this.data.job.status : '';
            if (this.data.jobId && ['succeeded', 'failed'].includes(status))
                void this.loadJob();
            if (this.data.jobId && status !== 'succeeded' && status !== 'failed') {
                this.startPolling();
            }
        },
        hide() {
            this.stopPolling();
        },
    },
    methods: {
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
        },
        async loadJob() {
            const jobId = this.data.jobId;
            if (!jobId || this.loadingRequest)
                return;
            const epoch = this.epoch;
            this.loadingRequest = true;
            const current = () => epoch === this.epoch && jobId === this.data.jobId;
            try {
                const data = await (0, api_1.requestJson)({ action: 'getJob', jobId });
                if (!current())
                    return;
                const job = (0, jobs_1.normalizeJob)(data.job);
                this.setData({
                    job,
                    error: '',
                    isLoading: false,
                });
                if (job.status === 'succeeded' || job.status === 'failed') {
                    this.stopPolling();
                }
            }
            catch (error) {
                if (!current())
                    return;
                this.setData({
                    error: (0, api_1.formatError)(error),
                    isLoading: false,
                });
            }
            finally {
                this.loadingRequest = false;
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
