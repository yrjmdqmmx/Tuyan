"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = require("../../utils/api");
const tokendance_1 = require("../../utils/tokendance");
const session_1 = require("../../utils/session");
// Drop a response if its owner signed out or switched accounts while it was in flight.
async function accountRequest(body) {
    var _a, _b;
    const owner = (_a = (0, session_1.getCurrentUser)()) === null || _a === void 0 ? void 0 : _a.id;
    if (!owner)
        throw new Error('请先登录图研。');
    const result = await (0, api_1.requestJson)(body);
    if (owner !== ((_b = (0, session_1.getCurrentUser)()) === null || _b === void 0 ? void 0 : _b.id))
        throw new Error('账户已切换，请重新操作。');
    return result;
}
function paymentLabel(status) {
    return { pending: '等待支付', paid: '已确认到账', closed: '订单已关闭', failed: '支付失败', refunded: '已退款', creating: '正在确认订单', unknown: '创建结果待核对' }[status] || '状态待查询';
}
Component({
    data: { email: '', showAccountSettings: false, payments: [], historyLoaded: false, connected: false, busy: false, state: '', code: '', authorizationUrl: '', amount: '10', balance: '', error: '', notice: '', payment: null, attemptId: '' },
    pageLifetimes: { show() { var _a; this.visible = true; void this.refresh(); if (((_a = this.data.payment) === null || _a === void 0 ? void 0 : _a.status) === 'pending')
            this.pollPayment(); }, hide() { this.visible = false; this.stopPolling(); } },
    lifetimes: {
        attached() { this.unsubscribe = (0, session_1.subscribeSession)(() => { this.stopPolling(); this.setData({ connected: false, busy: false, state: '', code: '', authorizationUrl: '', balance: '', email: '', payments: [], historyLoaded: false, error: '', notice: '', payment: null, attemptId: '' }); }); },
        detached() { var _a, _b; this.visible = false; this.stopPolling(); (_b = (_a = this).unsubscribe) === null || _b === void 0 ? void 0 : _b.call(_a); },
    },
    methods: {
        manageAccount() { this.setData({ showAccountSettings: true }); },
        closeAccountSettings() { this.setData({ showAccountSettings: false }); },
        returnToTask() { wx.navigateBack({ delta: 1 }); },
        async refresh() { var _a; const status = await (0, tokendance_1.refreshTokenDanceConnection)(); this.setData({ connected: status.connected, email: ((_a = (0, session_1.getCurrentUser)()) === null || _a === void 0 ? void 0 : _a.email) || '' }); if (!(0, session_1.getCurrentUser)())
            this.setData({ error: '请先返回生成页登录图研。' }); },
        async authorize() {
            if (this.data.busy)
                return;
            this.setData({ busy: true, error: '', code: '' });
            try {
                const result = await accountRequest({ action: 'tokenDanceAuthorize', platform: 'miniprogram' });
                this.setData({ state: result.state, authorizationUrl: result.authorizationUrl, notice: '在系统浏览器打开已复制的授权链接，完成授权后复制一次性 code，返回这里粘贴。请在 10 分钟内完成。' });
                wx.setClipboardData({ data: result.authorizationUrl });
            }
            catch (error) {
                this.setData({ error: (0, api_1.formatError)(error) });
            }
            finally {
                this.setData({ busy: false });
            }
        },
        codeInput(event) { this.setData({ code: event.detail.value }); },
        amountInput(event) { this.setData({ amount: event.detail.value }); },
        async exchange() {
            if (this.data.busy || !this.data.state || !this.data.code.trim())
                return;
            const code = this.data.code.trim();
            this.setData({ busy: true, code: '', error: '' });
            try {
                await accountRequest({ action: 'tokenDanceExchange', state: this.data.state, code });
                this.setData({ state: '', authorizationUrl: '', notice: '观猹 TokenDance 已连接，返回生成或精修页即可使用。' });
                await this.refresh();
            }
            catch (error) {
                this.setData({ error: (0, api_1.formatError)(error) });
            }
            finally {
                this.setData({ busy: false });
            }
        },
        async cancel() { try {
            await accountRequest({ action: 'tokenDanceCancel', state: this.data.state });
            this.setData({ state: '', code: '', authorizationUrl: '', notice: '授权已取消。' });
        }
        catch (error) {
            this.setData({ error: (0, api_1.formatError)(error) });
        } },
        async disconnect() { try {
            await accountRequest({ action: 'tokenDanceDisconnect' });
            this.setData({ connected: false, balance: '', payment: null, notice: '已解除图研连接。远端 Key 如需撤销，请到观猹 TokenDance 密钥管理操作。' });
            await this.refresh();
        }
        catch (error) {
            this.setData({ error: (0, api_1.formatError)(error) });
        } },
        async queryBalance() {
            try {
                const result = await accountRequest({ action: 'tokenDanceBalance' });
                this.setData({ balance: (result.wallet.balance / 1000000).toFixed(6), error: '' });
            }
            catch (error) {
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
            if (this.data.payments.some(item => ['unknown', 'creating'].includes(item.state)) || (((_a = this.data.payment) === null || _a === void 0 ? void 0 : _a.status) === 'pending' && this.data.payment.expired_at * 1000 > Date.now())) {
                this.setData({ error: '已有待支付或待核对的订单，请先查看充值记录。' });
                return;
            }
            this.setData({ busy: true, error: '' });
            const attemptId = `mini-${Date.now()}-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
            try {
                const result = await accountRequest({ action: 'tokenDancePaymentCreate', amount, attemptId });
                this.setData({ payment: result.session, attemptId });
                this.pollPayment();
            }
            catch (error) {
                this.setData({ error: (0, api_1.formatError)(error) });
            }
            finally {
                this.setData({ busy: false });
            }
        },
        copyAlipay() { var _a; if ((_a = this.data.payment) === null || _a === void 0 ? void 0 : _a.alipay_url) {
            wx.setClipboardData({ data: this.data.payment.alipay_url });
            this.setData({ notice: '微信小程序无法直接唤起支付宝。请将已复制的支付宝链接粘贴到系统浏览器，或用图研网页完成充值。返回后查询到账状态。' });
        } },
        openWebWallet() { wx.setClipboardData({ data: 'https://www.paperbanana.asia/?tokendance_wallet=1' }); this.setData({ notice: '已复制图研账户入口，请用系统浏览器打开，登录同一图研账号后使用支付宝充值。' }); },
        async recentPayments() {
            try {
                const result = await accountRequest({ action: 'tokenDancePayments' });
                this.setData({ historyLoaded: true, payments: result.payments.map(item => { var _a; return ({ ...item, statusText: paymentLabel(((_a = item.session) === null || _a === void 0 ? void 0 : _a.status) || item.state), createdText: item.createdAt ? new Date(item.createdAt).toLocaleString('zh-CN', { hour12: false }) : '' }); }) });
                const row = result.payments.find(item => { var _a; return ((_a = item.session) === null || _a === void 0 ? void 0 : _a.status) === 'pending'; }) || result.payments.find(item => item.session);
                if (row) {
                    this.setData({ payment: row.session, attemptId: row.attemptId });
                    this.pollPayment();
                }
                else
                    this.setData({ notice: result.payments.length ? '订单创建结果尚未确认，请到观猹 TokenDance 核对后再操作。' : '暂无充值记录。' });
            }
            catch (error) {
                this.setData({ error: (0, api_1.formatError)(error) });
            }
        },
        async queryHistoryPayment(event) {
            const row = this.data.payments.find(item => item.attemptId === event.currentTarget.dataset.attemptId);
            if (row === null || row === void 0 ? void 0 : row.session) {
                this.setData({ payment: row.session, attemptId: row.attemptId });
                await this.paymentStatus();
            }
        },
        async paymentStatus() {
            if (!this.data.attemptId || this.statusInFlight)
                return;
            this.statusInFlight = true;
            try {
                const result = await accountRequest({ action: 'tokenDancePaymentStatus', attemptId: this.data.attemptId });
                this.setData({ payment: result.session, payments: this.data.payments.map(item => item.attemptId === this.data.attemptId ? { ...item, session: result.session, statusText: paymentLabel(result.session.status) } : item) });
                if (result.session.status === 'paid') {
                    this.setData({ notice: '充值已确认到账，可以返回原任务继续。' });
                    void this.queryBalance();
                }
                if (result.session.status !== 'pending' || result.session.expired_at * 1000 < Date.now())
                    this.stopPolling();
            }
            catch (error) {
                this.stopPolling();
                this.setData({ error: (0, api_1.formatError)(error) });
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
