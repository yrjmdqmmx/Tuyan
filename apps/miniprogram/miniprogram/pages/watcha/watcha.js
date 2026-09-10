"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const watcha_1 = require("../../utils/watcha");
const session_1 = require("../../utils/session");
Component({
    data: { status: { ...watcha_1.EMPTY_WATCHA }, loaded: false, busy: false, email: '', loggedIn: false,
        awaitingCode: false, code: '', hasCode: false, signupEmail: '', mailCode: '', hasMailCode: false,
        unlinking: false, cooldown: 0, notice: '', error: '', showAuthPanel: false },
    lifetimes: {
        attached() {
            var _a;
            ;
            this.epoch = 0;
            this.owner = ((_a = (0, session_1.getCurrentUser)()) === null || _a === void 0 ? void 0 : _a.id) || '';
            this.unsubscribe = (0, session_1.subscribeSession)(user => {
                if (this.owner !== ((user === null || user === void 0 ? void 0 : user.id) || '')) {
                    this.reset();
                    this.owner = (user === null || user === void 0 ? void 0 : user.id) || '';
                }
                this.setData({ email: (user === null || user === void 0 ? void 0 : user.email) || '', loggedIn: Boolean(user) });
                if (this.visible)
                    void this.refresh();
            });
        },
        detached() { var _a, _b; (_b = (_a = this).unsubscribe) === null || _b === void 0 ? void 0 : _b.call(_a); this.reset(); },
    },
    pageLifetimes: {
        show() { this.visible = true; void this.refresh(); },
        hide() { this.visible = false; this.epoch++; this.clearCodes(); this.setData({ busy: false }); },
    },
    methods: {
        current(epoch) { var _a; return epoch === this.epoch && (((_a = (0, session_1.getCurrentUser)()) === null || _a === void 0 ? void 0 : _a.id) || '') === this.owner; },
        clearCodes() { this.oneUseCode = ''; this.emailCode = ''; this.setData({ code: '', mailCode: '', hasCode: false, hasMailCode: false }); },
        reset() {
            ;
            this.epoch = Number(this.epoch || 0) + 1;
            this.flow = undefined;
            clearInterval(this.timer);
            this.clearCodes();
            this.setData({ status: { ...watcha_1.EMPTY_WATCHA }, loaded: false, busy: false, awaitingCode: false, unlinking: false, cooldown: 0, signupEmail: '', error: '', notice: '' });
        },
        async refresh() {
            var _a, _b;
            const epoch = this.epoch, serial = this.refreshSerial = Number(this.refreshSerial || 0) + 1;
            this.setData({ email: ((_a = (0, session_1.getCurrentUser)()) === null || _a === void 0 ? void 0 : _a.email) || '', loggedIn: Boolean((0, session_1.getCurrentUser)()) });
            const valid = () => this.current(epoch) && serial === this.refreshSerial;
            try {
                const status = await (0, watcha_1.watchaRequest)('mini-status', undefined, valid);
                if (valid())
                    this.setData({ status, loaded: true, error: '' });
            }
            catch (error) {
                if (valid())
                    this.setData({ loaded: true, error: error.message });
            }
            if (valid() && ((_b = this.flow) === null || _b === void 0 ? void 0 : _b.expiresAt) <= Date.now()) {
                ;
                this.flow = undefined;
                this.clearCodes();
                this.setData({ awaitingCode: false, notice: '授权链接已过期，请重新发起。' });
            }
        },
        async run(action) {
            if (this.data.busy)
                return;
            const epoch = this.epoch;
            this.refreshSerial = Number(this.refreshSerial || 0) + 1;
            this.setData({ busy: true, error: '', notice: '' });
            try {
                await action(() => this.current(epoch));
            }
            catch (error) {
                if (this.current(epoch))
                    this.setData({ error: error.message });
            }
            finally {
                if (this.current(epoch))
                    this.setData({ busy: false });
            }
        },
        start() {
            if (!this.data.status.available || !this.data.status.miniProgramSupported)
                return;
            return this.run(async (valid) => {
                const flow = await (0, watcha_1.watchaRequest)('mini-start', { intent: (0, session_1.getCurrentUser)() ? 'link' : 'login' }, valid);
                if (!valid())
                    return;
                const url = (0, watcha_1.watchaLaunchUrl)(flow.url);
                if (!Number.isFinite(flow.expiresAt) || flow.expiresAt <= Date.now())
                    throw new Error('授权链接已过期，请重新发起。');
                this.flow = { url, expiresAt: flow.expiresAt };
                this.clearCodes();
                this.setData({ awaitingCode: true, notice: '在系统浏览器打开链接，授权后复制接续码回到这里。请在 10 分钟内完成。' });
                this.copyLink();
            });
        },
        copyLink() {
            const flow = this.flow;
            if (flow && flow.expiresAt > Date.now())
                wx.setClipboardData({ data: flow.url, fail: () => this.setData({ error: '复制失败，请再次点击复制授权链接。' }) });
        },
        codeInput(event) { this.oneUseCode = event.detail.value.trim().slice(0, 128); this.setData({ hasCode: /^[A-Za-z0-9_-]{43}$/.test(this.oneUseCode) }); },
        emailInput(event) { this.clearCodes(); this.setData({ signupEmail: event.detail.value.slice(0, 254) }); },
        mailCodeInput(event) { this.emailCode = event.detail.value.replace(/\D/g, '').slice(0, 6); this.setData({ hasMailCode: /^\d{6}$/.test(this.emailCode) }); },
        exchange() {
            if (!this.data.awaitingCode || !this.data.hasCode)
                return;
            const code = this.oneUseCode;
            this.clearCodes();
            return this.run(async (valid) => {
                const result = await (0, watcha_1.watchaRequest)('mini-exchange', { code }, valid);
                if (!valid())
                    return;
                this.flow = undefined;
                this.setData({ awaitingCode: false });
                if (result.status === 'complete')
                    await this.finishLogin();
                else if (result.status === 'pending')
                    await this.refresh();
                else
                    throw new Error('授权结果未确认，请刷新状态。');
            });
        },
        async finishLogin() {
            const user = await (0, session_1.refreshSession)();
            if (!user)
                throw new Error('登录状态尚未确认，请刷新后重试。');
            this.setData({ email: user.email, loggedIn: true, notice: '已登录图研，可以返回原页面继续。', showAuthPanel: false });
            await this.refresh();
            wx.showToast({ title: '已登录图研', icon: 'success' });
        },
        cancel() {
            return this.run(async (valid) => {
                await (0, watcha_1.watchaRequest)('mini-cancel', {}, valid);
                if (!valid())
                    return;
                this.flow = undefined;
                this.clearCodes();
                this.setData({ awaitingCode: false, unlinking: false, notice: '已取消本次授权。' });
                await this.refresh();
            });
        },
        startCooldown() {
            clearInterval(this.timer);
            this.setData({ cooldown: 60 });
            this.timer = setInterval(() => { this.setData({ cooldown: Math.max(0, this.data.cooldown - 1) }); if (!this.data.cooldown)
                clearInterval(this.timer); }, 1000);
        },
        sendCode() {
            if (this.data.cooldown > 0)
                return;
            const purpose = this.data.unlinking ? 'unlink' : 'signup', email = this.data.signupEmail.trim();
            if (purpose === 'signup' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                this.setData({ error: '请输入有效邮箱。' });
                return;
            }
            return this.run(async (valid) => {
                await (0, watcha_1.watchaRequest)('email-code', { purpose, ...(purpose === 'signup' ? { email } : {}) }, valid);
                if (valid()) {
                    this.clearCodes();
                    this.startCooldown();
                    this.setData({ notice: '验证码已发送，5 分钟内有效。' });
                }
            });
        },
        complete() {
            if (!this.data.hasMailCode || (0, session_1.getCurrentUser)())
                return;
            const code = this.emailCode, email = this.data.signupEmail.trim();
            this.clearCodes();
            return this.run(async (valid) => { await (0, watcha_1.watchaRequest)('complete', { email, code }, valid); if (valid())
                await this.finishLogin(); });
        },
        link() { return this.run(async (valid) => { await (0, watcha_1.watchaRequest)('link', {}, valid); if (valid()) {
            await this.refresh();
            this.setData({ notice: '已绑定观猹，原账号的任务和渠道连接保持不变。' });
        } }); },
        showUnlink() { if (!this.data.status.hasPassword)
            return; this.clearCodes(); this.setData({ unlinking: true }); },
        cancelUnlink() { if (this.data.busy)
            return; this.clearCodes(); this.setData({ unlinking: false }); },
        unlink() {
            if (!this.data.unlinking || !this.data.status.hasPassword || !this.data.hasMailCode)
                return;
            const code = this.emailCode;
            this.clearCodes();
            return this.run(async (valid) => { await (0, watcha_1.watchaRequest)('unlink', { code }, valid); if (valid()) {
                this.setData({ unlinking: false });
                await this.refresh();
                this.setData({ notice: '已解绑观猹，可使用邮箱和密码登录。' });
            } });
        },
        sendVerification() { if (this.data.cooldown)
            return; return this.run(async (valid) => { await (0, session_1.sendVerificationEmail)(this.data.email); if (valid()) {
            this.startCooldown();
            this.setData({ notice: '请在邮件中验证邮箱，再刷新账号状态。' });
        } }); },
        setPassword() { if (this.data.cooldown)
            return; return this.run(async (valid) => { await (0, session_1.requestPasswordReset)(this.data.email); if (valid()) {
            this.startCooldown();
            this.setData({ notice: '请按邮箱中的重置说明设置密码，完成后重新登录。' });
        } }); },
        refreshIdentity() { return this.run(async (valid) => { await (0, session_1.refreshSession)(); if (valid())
            await this.refresh(); }); },
        openEmailLogin() { if (!this.data.busy)
            this.setData({ showAuthPanel: true }); },
        closeAuth() { this.setData({ showAuthPanel: false }); },
        onAuthed() { this.setData({ showAuthPanel: false }); void this.refresh(); },
        back() { if (!this.data.busy)
            wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/tokendance/tokendance' }) }); },
    },
});
