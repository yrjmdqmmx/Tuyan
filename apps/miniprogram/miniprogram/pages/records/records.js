"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = require("../../utils/api");
const constants_1 = require("../../utils/constants");
const jobs_1 = require("../../utils/jobs");
const media_1 = require("../../utils/media");
const session_1 = require("../../utils/session");
Component({
    data: {
        isLoggedIn: false,
        isAuthChecking: true,
        currentUserEmail: '',
        accountJobs: [],
        accountJobsError: '',
        accountJobsLoading: false,
        localJobs: [],
        showAuthPanel: false,
        showAccountSettings: false,
    },
    lifetimes: {
        attached() {
            const unsubscribe = (0, session_1.subscribeSession)((user) => {
                const wasLoggedIn = this.data.isLoggedIn;
                this.setData({
                    isLoggedIn: Boolean(user),
                    currentUserEmail: user ? user.email : '',
                    isAuthChecking: false,
                });
                if (user && !wasLoggedIn) {
                    this.loadAccountJobs();
                }
                if (!user) {
                    this.setData({ accountJobs: [] });
                }
            });
            this.unsubscribeSession = unsubscribe;
            const user = (0, session_1.getCurrentUser)();
            this.setData({
                isLoggedIn: Boolean(user),
                currentUserEmail: user ? user.email : '',
                isAuthChecking: !(0, session_1.isSessionChecked)(),
            });
        },
        detached() {
            const unsubscribe = this.unsubscribeSession;
            if (unsubscribe)
                unsubscribe();
        },
    },
    pageLifetimes: {
        show() {
            this.setData({ localJobs: (0, jobs_1.readLocalJobs)() });
            if (this.data.isLoggedIn) {
                this.loadAccountJobs({ silent: this.data.accountJobs.length > 0 });
            }
        },
    },
    methods: {
        async loadAccountJobs(options) {
            if (!this.data.isLoggedIn)
                return;
            // 在途响应只对发起请求时的账号有效：登出/换号后丢弃，避免旧账号任务列表跨账号泄露
            const requestUser = (0, session_1.getCurrentUser)();
            const requestUserId = requestUser ? requestUser.id : '';
            if (!options || !options.silent) {
                this.setData({ accountJobsLoading: true, accountJobsError: '' });
            }
            try {
                const data = await (0, api_1.requestJson)({ action: 'myJobs', limit: 50 });
                const jobs = await (0, jobs_1.hydrateRecordJobs)((data.jobs || []).map(jobs_1.normalizeJob));
                const currentUser = (0, session_1.getCurrentUser)();
                if ((currentUser ? currentUser.id : '') !== requestUserId)
                    return;
                this.setData({
                    accountJobs: jobs.map(jobs_1.toRecordJobSummary),
                    accountJobsError: '',
                    accountJobsLoading: false,
                });
            }
            catch (error) {
                const currentUser = (0, session_1.getCurrentUser)();
                if ((currentUser ? currentUser.id : '') !== requestUserId)
                    return;
                this.setData({
                    accountJobsError: (0, api_1.formatError)(error),
                    accountJobsLoading: false,
                });
            }
        },
        refreshAccountJobs() {
            this.loadAccountJobs();
        },
        openJob(event) {
            const jobId = String(event.currentTarget.dataset.id || '');
            if (!jobId)
                return;
            wx.navigateTo({ url: `/pages/job-detail/job-detail?jobId=${jobId}` });
        },
        openRefine() { wx.switchTab({ url: '/pages/refine/refine' }); },
        clearLocal() {
            (0, jobs_1.clearLocalJobs)();
            this.setData({ localJobs: [] });
        },
        previewRecordImage(event) {
            const url = String(event.currentTarget.dataset.url || '');
            const canPreview = (0, constants_1.readDatasetBoolean)(event.currentTarget.dataset.canPreview, true);
            if (!url)
                return;
            if (!canPreview) {
                (0, media_1.downloadShareFile)(url);
                return;
            }
            wx.previewImage({ current: url, urls: [url] });
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
        openAuthPanel() {
            this.setData({ showAuthPanel: true });
        },
        closeAuthPanel() {
            this.setData({ showAuthPanel: false });
        },
        onAuthed() {
            this.setData({ showAuthPanel: false });
            this.loadAccountJobs();
        },
        async signOut() {
            await (0, session_1.signOut)();
            wx.showToast({ title: '已退出', icon: 'success' });
        },
        openAccountSettings() { this.setData({ showAccountSettings: true }); },
        closeAccountSettings() { this.setData({ showAccountSettings: false }); },
        onAccountSignedOut() { this.setData({ showAccountSettings: false, accountJobs: [] }); },
        onAccountDeleted() { this.setData({ showAccountSettings: false, accountJobs: [], localJobs: [] }); },
        onShareAppMessage() { return { title: '图研Tuyan · 任务记录', path: '/pages/records/records' }; },
    },
});
