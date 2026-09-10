"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = require("../../utils/api");
const tokendance_1 = require("../../utils/tokendance");
const session_1 = require("../../utils/session");
function paymentLabel(status) {
    return { pending: '等待支付', paid: '已确认到账', closed: '订单已关闭', failed: '支付失败', refunded: '已退款', creating: '正在确认订单', unknown: '创建结果待核对' }[status] || '状态待查询';
}
Component({
    data: { email: '', isLoggedIn: false, showAuthPanel: false, showAccountSettings: false, payments: [], historyLoaded: false, connected: false, busy: false, statusLoading: false, authorizationPending: false, hasCode: false, code: '', amount: '10', balance: '', error: '', notice: '', payment: null, attemptId: '', paymentUncertain: false, uncertainAttemptId: '' },
    pageLifetimes: {
        show() { this.visible = true; void this.refresh(); this.pollPayment(); },
        hide() { this.visible = false; this.stopPolling(); this.oneUseCode = ''; this.setData({ code: '', hasCode: false, showAuthPanel: false, showAccountSettings: false }); },
    },
    lifetimes: {
        attached() {
            var _a;
            ;
            this.epoch = 0;
            this.owner = ((_a = (0, session_1.getCurrentUser)()) === null || _a === void 0 ? void 0 : _a.id) || '';
            this.unsubscribe = (0, session_1.subscribeSession)(user => {
                if (this.owner !== ((user === null || user === void 0 ? void 0 : user.id) || '')) {
                    this.owner = (user === null || user === void 0 ? void 0 : user.id) || '';
                    this.resetAccount();
                    if (this.visible)
                        void this.refresh();
                }
                this.setData({ email: (user === null || user === void 0 ? void 0 : user.email) || '', isLoggedIn: Boolean(user) });
            });
        },
        detached() { var _a, _b; this.visible = false; this.resetAccount(); (_b = (_a = this).unsubscribe) === null || _b === void 0 ? void 0 : _b.call(_a); },
    },
    methods: {
        resetAccount() {
            ;
            this.epoch++;
            this.stopPolling();
            this.flow = undefined;
            this.oneUseCode = '';
            this.setData({ connected: false, busy: false, statusLoading: false, authorizationPending: false, code: '', hasCode: false, balance: '', email: '', isLoggedIn: false, showAccountSettings: false, showAuthPanel: false, payments: [], historyLoaded: false, error: '', notice: '', payment: null, attemptId: '', paymentUncertain: false, uncertainAttemptId: '' });
        },
        current(epoch) { var _a, _b; return epoch === this.epoch && Boolean((_a = (0, session_1.getCurrentUser)()) === null || _a === void 0 ? void 0 : _a.id) && this.owner === ((_b = (0, session_1.getCurrentUser)()) === null || _b === void 0 ? void 0 : _b.id); },
        async accountRequest(body) {
            const epoch = this.epoch;
            if (!this.current(epoch))
                throw new Error('请先登录图研。');
            const result = await (0, api_1.requestJson)(body);
            if (!this.current(epoch))
                throw new Error('账户已切换，请重新操作。');
            return result;
        },
        openAuthPanel() { this.setData({ showAuthPanel: true }); },
        closeAuthPanel() { this.setData({ showAuthPanel: false }); },
        onAuthed() { this.closeAuthPanel(); void this.refresh(); },
        manageAccount() { if ((0, session_1.getCurrentUser)())
            this.setData({ showAccountSettings: true });
        else
            this.openAuthPanel(); },
        closeAccountSettings() { this.setData({ showAccountSettings: false }); },
        returnToTask: tokendance_1.returnFromTokenDance,
        async refresh() {
            var _a;
            const epoch = this.epoch;
            this.setData({ email: ((_a = (0, session_1.getCurrentUser)()) === null || _a === void 0 ? void 0 : _a.email) || '', isLoggedIn: Boolean((0, session_1.getCurrentUser)()), statusLoading: true });
            const status = await (0, tokendance_1.refreshTokenDanceConnection)();
            if (epoch !== this.epoch)
                return;
            this.setData({ connected: status.connected, statusLoading: false, error: status.error || (status.available === false ? '观猹 TokenDance 暂不可用，请稍后刷新。' : '') });
            const flow = this.flow;
            if (flow && flow.expiresAt <= Date.now()) {
                this.flow = undefined;
                this.setData({ authorizationPending: false, hasCode: false, code: '', notice: '授权链接已过期，请重新连接。' });
            }
        },
        async authorize() {
            if (!(0, session_1.getCurrentUser)()) {
                this.openAuthPanel();
                return;
            }
            if (this.data.busy || this.data.authorizationPending)
                return;
            const epoch = this.epoch;
            this.setData({ busy: true, error: '', code: '', hasCode: false });
            this.oneUseCode = '';
            try {
                const result = await this.accountRequest({ action: 'tokenDanceAuthorize', platform: 'miniprogram' });
                if (!/^https:\/\/tokendance\.space\//.test(result.authorizationUrl || '') || typeof result.state !== 'string')
                    throw new Error('授权链接无效，请稍后重试。');
                this.flow = { state: result.state, url: result.authorizationUrl, expiresAt: Date.parse(result.expiresAt) || Date.now() + 600000 };
                this.setData({ authorizationPending: true, notice: '在系统浏览器打开授权链接，完成后将一次性 code 粘贴回来。请在 10 分钟内完成。' });
                this.copyAuthorization();
            }
            catch (error) {
                if (this.current(epoch))
                    this.setData({ error: (0, api_1.formatError)(error) });
            }
            finally {
                if (this.current(epoch))
                    this.setData({ busy: false });
            }
        },
        copyAuthorization() { const flow = this.flow; if (flow && flow.expiresAt > Date.now())
            wx.setClipboardData({ data: flow.url }); },
        codeInput(event) { this.oneUseCode = event.detail.value.slice(0, 2048); this.setData({ hasCode: Boolean(event.detail.value.trim()) }); },
        amountInput(event) { this.setData({ amount: event.detail.value }); },
        async exchange() {
            const flow = this.flow, code = String(this.oneUseCode || '').trim(), epoch = this.epoch;
            if (this.data.busy || !flow || !code)
                return;
            this.oneUseCode = '';
            this.setData({ busy: true, code: '', hasCode: false, error: '' });
            try {
                if (flow.expiresAt <= Date.now())
                    throw new Error('授权已过期，请取消后重新连接。');
                await this.accountRequest({ action: 'tokenDanceExchange', state: flow.state, code });
                if (this.flow !== flow)
                    return;
                this.flow = undefined;
                this.setData({ authorizationPending: false, notice: '观猹 TokenDance 已连接，可以返回原任务。' });
                await this.refresh();
            }
            catch (error) {
                if (this.current(epoch))
                    this.setData({ error: (0, api_1.formatError)(error) });
            }
            finally {
                if (this.current(epoch))
                    this.setData({ busy: false });
            }
        },
        async cancel() {
            const flow = this.flow, epoch = this.epoch;
            if (!flow)
                return;
            this.flow = undefined;
            this.oneUseCode = '';
            this.setData({ authorizationPending: false, code: '', hasCode: false });
            try {
                await this.accountRequest({ action: 'tokenDanceCancel', state: flow.state });
                this.setData({ notice: '授权已取消。' });
            }
            catch (error) {
                if (this.current(epoch))
                    this.setData({ error: (0, api_1.formatError)(error) });
            }
        },
        async disconnect() {
            if (this.data.busy)
                return;
            const epoch = this.epoch;
            this.setData({ busy: true });
            try {
                await this.accountRequest({ action: 'tokenDanceDisconnect' });
                (0, tokendance_1.invalidateTokenDanceConnection)();
                this.stopPolling();
                this.flow = undefined;
                this.setData({ connected: false, balance: '', payment: null, authorizationPending: false, notice: '已解除图研连接。远端 Key 如需撤销，请到观猹 TokenDance 密钥管理操作。' });
            }
            catch (error) {
                if (this.current(epoch))
                    this.setData({ error: (0, api_1.formatError)(error) });
            }
            finally {
                if (this.current(epoch))
                    this.setData({ busy: false });
            }
        },
        async queryBalance() {
            var _a;
            const epoch = this.epoch;
            try {
                const result = await this.accountRequest({ action: 'tokenDanceBalance' });
                if (!Number.isSafeInteger((_a = result.wallet) === null || _a === void 0 ? void 0 : _a.balance))
                    throw new Error('余额数据暂不可识别，请重试。');
                this.setData({ balance: (result.wallet.balance / 1000000).toFixed(6), error: '' });
            }
            catch (error) {
                if (this.current(epoch))
                    this.setData({ error: (0, api_1.formatError)(error) });
            }
        },
        async createPayment() {
            var _a;
            const amount = Number(this.data.amount);
            if (!Number.isSafeInteger(amount) || amount < 1 || amount > 100000) {
                this.setData({ error: '请输入 1 至 100000 元的整数。' });
                return;
            }
            if (this.data.busy)
                return;
            if (this.data.paymentUncertain || this.data.payments.some(item => { var _a; return ['unknown', 'creating'].includes(item.state) || (((_a = item.session) === null || _a === void 0 ? void 0 : _a.status) === 'pending' && item.session.expired_at * 1000 > Date.now()); }) || (((_a = this.data.payment) === null || _a === void 0 ? void 0 : _a.status) === 'pending' && this.data.payment.expired_at * 1000 > Date.now())) {
                this.setData({ error: '已有待支付或待核对的订单，请先刷新充值记录。' });
                return;
            }
            const epoch = this.epoch, attemptId = `mini-${Date.now()}-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
            this.setData({ busy: true, error: '', attemptId });
            try {
                const result = await this.accountRequest({ action: 'tokenDancePaymentCreate', amount, attemptId });
                this.setData({ payment: result.session });
                this.pollPayment();
            }
            catch (error) {
                if (this.current(epoch))
                    this.setData({ paymentUncertain: true, uncertainAttemptId: attemptId, error: (0, api_1.formatError)(error) + ' 请先刷新充值记录核对，避免重复创建。' });
            }
            finally {
                if (this.current(epoch))
                    this.setData({ busy: false });
            }
        },
        copyAlipay() { var _a; if (/^alipays:\/\/platformapi\/startapp\?/.test(((_a = this.data.payment) === null || _a === void 0 ? void 0 : _a.alipay_url) || '')) {
            wx.setClipboardData({ data: this.data.payment.alipay_url });
            this.setData({ notice: '请将支付宝链接粘贴到系统浏览器，或用图研网页完成充值。返回后查询到账状态。' });
        } },
        openWebWallet() { wx.setClipboardData({ data: 'https://www.paperbanana.asia/?view=account' }); this.setData({ notice: '已复制图研账户入口，请用系统浏览器打开，并登录同一图研账号。' }); },
        async recentPayments() {
            const epoch = this.epoch;
            try {
                const result = await this.accountRequest({ action: 'tokenDancePayments' });
                if (!Array.isArray(result.payments))
                    throw new Error('充值记录暂不可用，请重试。');
                const ownAttempt = result.payments.find((item) => item.attemptId === (this.data.uncertainAttemptId || this.data.attemptId));
                this.setData({ historyLoaded: true, payments: result.payments.map((item) => { var _a; return ({ ...item, statusText: paymentLabel(((_a = item.session) === null || _a === void 0 ? void 0 : _a.status) || item.state), createdText: item.createdAt ? new Date(item.createdAt).toLocaleString('zh-CN', { hour12: false }) : '' }); }), ...(ownAttempt && !['unknown', 'creating'].includes(ownAttempt.state) ? { paymentUncertain: false, uncertainAttemptId: '' } : {}) });
                const row = result.payments.find((item) => { var _a; return ((_a = item.session) === null || _a === void 0 ? void 0 : _a.status) === 'pending'; }) || result.payments.find((item) => item.session);
                if (row) {
                    this.setData({ payment: row.session, attemptId: row.attemptId });
                    this.pollPayment();
                }
                this.setData({ notice: result.payments.length ? '到账以订单状态查询为准，待核对的订单请勿重复创建。' : '暂无充值记录。' });
            }
            catch (error) {
                if (this.current(epoch))
                    this.setData({ error: (0, api_1.formatError)(error) });
            }
        },
        async queryHistoryPayment(event) {
            const row = this.data.payments.find(item => item.attemptId === event.currentTarget.dataset.attemptId);
            if (row === null || row === void 0 ? void 0 : row.session) {
                this.stopPolling();
                this.setData({ payment: row.session, attemptId: row.attemptId });
                await this.paymentStatus();
                this.pollPayment();
            }
        },
        async paymentStatus() {
            if (!this.data.attemptId || this.statusInFlight)
                return;
            const epoch = this.epoch, attemptId = this.data.attemptId;
            this.statusInFlight = true;
            try {
                const result = await this.accountRequest({ action: 'tokenDancePaymentStatus', attemptId });
                if (this.data.attemptId !== attemptId)
                    return;
                this.setData({ payment: result.session, payments: this.data.payments.map(item => item.attemptId === attemptId ? { ...item, session: result.session, statusText: paymentLabel(result.session.status) } : item) });
                if (result.session.status === 'paid') {
                    this.setData({ notice: '充值已确认到账，可以返回原任务继续。' });
                    void this.queryBalance();
                }
                if (result.session.status !== 'pending' || result.session.expired_at * 1000 < Date.now())
                    this.stopPolling();
            }
            catch (error) {
                if (this.current(epoch)) {
                    this.stopPolling();
                    this.setData({ error: (0, api_1.formatError)(error) });
                }
            }
            finally {
                this.statusInFlight = false;
            }
        },
        pollPayment() { var _a; this.stopPolling(); if (this.visible && ((_a = this.data.payment) === null || _a === void 0 ? void 0 : _a.status) === 'pending' && this.data.payment.expired_at * 1000 > Date.now())
            this.paymentTimer = setInterval(() => { void this.paymentStatus(); }, 3000); },
        stopPolling() { if (this.paymentTimer)
            clearInterval(this.paymentTimer); this.paymentTimer = null; },
    },
});
