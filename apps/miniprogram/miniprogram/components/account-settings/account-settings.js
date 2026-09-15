"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const watcha_1 = require("../../utils/watcha");
const account_1 = require("../../utils/account");
const auth_security_1 = require("../../utils/auth-security");
const api_1 = require("../../utils/api");
const api_keys_1 = require("../../utils/api-keys");
const config_1 = require("../../utils/config");
const session_1 = require("../../utils/session");
function changePasswordValidationMessage(code) {
    switch (code) {
        case 'CURRENT_PASSWORD_REQUIRED': return '请输入当前密码。';
        case 'CURRENT_PASSWORD_TOO_SHORT': return '当前密码至少 8 位。';
        case 'CURRENT_PASSWORD_TOO_LONG': return '当前密码最多 128 位。';
        case 'NEW_PASSWORD_REQUIRED': return '请输入新密码。';
        case 'PASSWORD_TOO_SHORT': return '新密码至少 8 位。';
        case 'PASSWORD_TOO_LONG': return '新密码最多 128 位。';
        case 'PASSWORD_CONFIRMATION_REQUIRED': return '请再次输入新密码。';
        case 'PASSWORD_CONFIRMATION_MISMATCH': return '两次输入的新密码不一致。';
        default: return '';
    }
}
Component({
    options: { styleIsolation: 'apply-shared' },
    properties: {
        show: { type: Boolean, value: false, observer(show) { this.reset(); if (show) {
                void this.refreshLifecycle();
                void this.refreshWatcha();
            } } },
        currentEmail: { type: String, value: '' },
        emailVerified: { type: Boolean, value: false },
    },
    data: {
        // 删除账号状态与改密状态刻意分离，防止一个流程读取或清理另一个流程的密码。
        watchaLoaded: false, passwordless: false, deletionCode: '', hasDeletionCode: false, deletionCodeSent: false, sendingDeletionCode: false, deletionCooldown: 0,
        email: '',
        password: '',
        confirmed: false,
        deleting: false,
        error: '',
        lifecycleMessage: '', lifecycleState: '', statusLoaded: false,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        changingPassword: false,
        changePasswordError: '',
        changePasswordCooldownSeconds: 0,
        changePasswordCooldownDisabled: false,
        securityError: '',
        securityStatus: '',
        resendCooldownSeconds: 0,
        resendDisabled: false,
        resendingVerification: false,
    },
    lifetimes: {
        attached() {
            var _a;
            let owner = ((_a = (0, session_1.getCurrentUser)()) === null || _a === void 0 ? void 0 : _a.id) || '';
            this.unsubscribeSecurity = session_1.subscribeSession === null || session_1.subscribeSession === void 0 ? void 0 : (0, session_1.subscribeSession)(user => {
                if (owner !== ((user === null || user === void 0 ? void 0 : user.id) || '')) {
                    owner = (user === null || user === void 0 ? void 0 : user.id) || '';
                    this.reset();
                    if (this.properties.show) {
                        void this.refreshLifecycle();
                        void this.refreshWatcha();
                    }
                }
            });
        },
        detached() { var _a, _b; (_b = (_a = this).unsubscribeSecurity) === null || _b === void 0 ? void 0 : _b.call(_a); this.reset(); },
    },
    methods: {
        noop() { },
        async refreshWatcha() {
            var _a;
            const epoch = Number(this.securityOperationEpoch || 0), owner = (_a = (0, session_1.getCurrentUser)()) === null || _a === void 0 ? void 0 : _a.id;
            const valid = () => { var _a; return epoch === Number(this.securityOperationEpoch || 0) && owner === ((_a = (0, session_1.getCurrentUser)()) === null || _a === void 0 ? void 0 : _a.id); };
            try {
                const status = await (0, watcha_1.watchaRequest)('mini-status', undefined, valid);
                if (valid())
                    this.setData({ watchaLoaded: true, passwordless: status.available && status.linked && !status.hasPassword });
            }
            catch {
                if (valid())
                    this.setData({ watchaLoaded: false });
            }
        },
        onDeletionCodeInput(event) { this.deletionProofCode = event.detail.value.replace(/\D/g, '').slice(0, 6); this.setData({ hasDeletionCode: /^\d{6}$/.test(this.deletionProofCode) }); },
        async sendDeletionCode() {
            var _a;
            if (!this.data.passwordless || this.data.deletionCooldown > 0 || this.data.sendingDeletionCode || this.data.deleting || this.data.lifecycleState !== 'active')
                return;
            const epoch = Number(this.securityOperationEpoch || 0), owner = (_a = (0, session_1.getCurrentUser)()) === null || _a === void 0 ? void 0 : _a.id;
            const valid = () => { var _a; return epoch === Number(this.securityOperationEpoch || 0) && owner === ((_a = (0, session_1.getCurrentUser)()) === null || _a === void 0 ? void 0 : _a.id); };
            this.setData({ sendingDeletionCode: true, error: '' });
            try {
                await (0, watcha_1.watchaRequest)('email-code', { purpose: 'delete' }, valid);
                if (!valid())
                    return;
                this.deletionProofCode = '';
                this.setData({ deletionCodeSent: true, deletionCode: '', hasDeletionCode: false, deletionCooldown: 60 });
                clearInterval(this.deletionTimer);
                this.deletionTimer = setInterval(() => { this.setData({ deletionCooldown: Math.max(0, this.data.deletionCooldown - 1) }); if (!this.data.deletionCooldown)
                    clearInterval(this.deletionTimer); }, 1000);
            }
            catch (error) {
                if (valid())
                    this.setData({ error: error.message });
            }
            finally {
                if (valid())
                    this.setData({ sendingDeletionCode: false });
            }
        },
        async setupPassword() {
            var _a, _b;
            if (this.data.resendCooldownSeconds || this.data.resendingVerification)
                return;
            const epoch = Number(this.securityOperationEpoch || 0), owner = (_a = (0, session_1.getCurrentUser)()) === null || _a === void 0 ? void 0 : _a.id;
            this.setData({ resendingVerification: true, securityError: '' });
            try {
                await (0, session_1.requestPasswordReset)(this.properties.currentEmail);
                if (epoch === Number(this.securityOperationEpoch || 0) && owner === ((_b = (0, session_1.getCurrentUser)()) === null || _b === void 0 ? void 0 : _b.id)) {
                    this.startResendCooldown(60);
                    this.setData({ securityStatus: '请按邮箱中的重置说明设置图研密码，完成后重新登录。' });
                }
            }
            catch (error) {
                if (epoch === Number(this.securityOperationEpoch || 0))
                    this.setData({ securityError: (0, api_1.formatError)(error) });
            }
            finally {
                if (epoch === Number(this.securityOperationEpoch || 0))
                    this.setData({ resendingVerification: false });
            }
        },
        async refreshLifecycle() {
            var _a, _b, _c;
            const epoch = Number(this.securityOperationEpoch || 0);
            const ownerId = (_a = (0, session_1.getCurrentUser)()) === null || _a === void 0 ? void 0 : _a.id;
            try {
                const response = await (0, api_1.gatewayRequest)(`${config_1.API_BASE}/api/account/status`, 'GET');
                if (epoch !== Number(this.securityOperationEpoch || 0) || ownerId !== ((_b = (0, session_1.getCurrentUser)()) === null || _b === void 0 ? void 0 : _b.id))
                    return;
                if (response.code !== 0 || !response.state)
                    throw new Error('账号状态暂时无法获取。');
                this.setData({ statusLoaded: true, lifecycleState: response.state, lifecycleMessage: (0, account_1.accountLifecycleMessage)(response.state), error: '' });
            }
            catch (error) {
                if (epoch === Number(this.securityOperationEpoch || 0) && ownerId === ((_c = (0, session_1.getCurrentUser)()) === null || _c === void 0 ? void 0 : _c.id))
                    this.setData({ statusLoaded: false, error: (0, api_1.formatError)(error) });
            }
        },
        clearResendCooldown() {
            const timer = this.resendCooldownTimer;
            if (timer !== undefined)
                clearInterval(timer);
            this.resendCooldownTimer = undefined;
        },
        clearChangePasswordCooldown() {
            const timer = this.changePasswordCooldownTimer;
            if (timer !== undefined)
                clearInterval(timer);
            this.changePasswordCooldownTimer = undefined;
        },
        reset() {
            ;
            this.securityOperationEpoch = Number(this.securityOperationEpoch || 0) + 1;
            this.clearResendCooldown();
            this.clearChangePasswordCooldown();
            clearInterval(this.deletionTimer);
            this.deletionProofCode = '';
            this.setData({
                watchaLoaded: false, passwordless: false, deletionCode: '', hasDeletionCode: false, deletionCodeSent: false, sendingDeletionCode: false, deletionCooldown: 0,
                email: '', password: '', confirmed: false, deleting: false, error: '',
                lifecycleMessage: '', lifecycleState: '', statusLoaded: false,
                currentPassword: '', newPassword: '', confirmPassword: '', changingPassword: false,
                changePasswordError: '', changePasswordCooldownSeconds: 0, changePasswordCooldownDisabled: false,
                securityError: '', securityStatus: '',
                resendCooldownSeconds: 0, resendDisabled: false, resendingVerification: false,
            });
        },
        close() {
            if (this.data.deleting)
                return;
            this.reset();
            this.triggerEvent('close');
        },
        onEmailInput(event) { this.setData({ email: event.detail.value, error: '' }); },
        onPasswordInput(event) { this.setData({ password: event.detail.value, error: '' }); },
        onConfirmChange(event) { this.setData({ confirmed: event.detail.value.includes('confirmed'), error: '' }); },
        onCurrentPasswordInput(event) { this.setData({ currentPassword: event.detail.value, changePasswordError: '', securityStatus: '' }); },
        onNewPasswordInput(event) { this.setData({ newPassword: event.detail.value, changePasswordError: '', securityStatus: '' }); },
        onConfirmPasswordInput(event) { this.setData({ confirmPassword: event.detail.value, changePasswordError: '', securityStatus: '' }); },
        async logout() { await (0, session_1.signOut)(); this.triggerEvent('signedout'); },
        startResendCooldown(seconds) {
            this.clearResendCooldown();
            const cooldown = Math.max(1, Math.ceil(seconds));
            this.setData({ resendCooldownSeconds: cooldown, resendDisabled: true });
            this.resendCooldownTimer = setInterval(() => {
                const next = Math.max(0, this.data.resendCooldownSeconds - 1);
                this.setData({ resendCooldownSeconds: next, resendDisabled: next > 0 });
                if (next === 0)
                    this.clearResendCooldown();
            }, 1000);
        },
        startChangePasswordCooldown(seconds) {
            this.clearChangePasswordCooldown();
            const cooldown = Math.max(1, Math.ceil(seconds));
            this.setData({ changePasswordCooldownSeconds: cooldown, changePasswordCooldownDisabled: true });
            this.changePasswordCooldownTimer = setInterval(() => {
                const next = Math.max(0, this.data.changePasswordCooldownSeconds - 1);
                this.setData({ changePasswordCooldownSeconds: next, changePasswordCooldownDisabled: next > 0 });
                if (next === 0)
                    this.clearChangePasswordCooldown();
            }, 1000);
        },
        async resendVerification() {
            if (this.properties.emailVerified || this.data.resendDisabled || this.data.resendingVerification)
                return;
            const email = this.properties.currentEmail.trim();
            if (!email)
                return;
            const operationEpoch = Number(this.securityOperationEpoch || 0);
            this.setData({ resendingVerification: true, securityError: '', securityStatus: '' });
            try {
                await (0, session_1.sendVerificationEmail)(email);
                if (operationEpoch !== Number(this.securityOperationEpoch || 0))
                    return;
                this.setData({ securityStatus: '请求已受理。如账号仍需验证，邮件将发送，请同时检查垃圾邮件。' });
                this.startResendCooldown(60);
            }
            catch (error) {
                if (operationEpoch !== Number(this.securityOperationEpoch || 0))
                    return;
                const mapped = (0, auth_security_1.mapAuthError)(error);
                this.setData({ securityError: mapped.message });
                if (mapped.code === 'RATE_LIMITED')
                    this.startResendCooldown(mapped.retryAfterSeconds || 60);
            }
            finally {
                if (operationEpoch === Number(this.securityOperationEpoch || 0))
                    this.setData({ resendingVerification: false });
            }
        },
        async submitChangePassword() {
            if (this.data.changingPassword || this.data.changePasswordCooldownDisabled)
                return;
            const operationEpoch = Number(this.securityOperationEpoch || 0);
            const validation = (0, auth_security_1.validateChangePassword)({
                currentPassword: this.data.currentPassword,
                newPassword: this.data.newPassword,
                confirmation: this.data.confirmPassword,
            });
            if (validation) {
                this.setData({ changePasswordError: changePasswordValidationMessage(validation), securityStatus: '' });
                return;
            }
            this.setData({ changingPassword: true, changePasswordError: '', securityError: '', securityStatus: '' });
            try {
                await (0, session_1.changePassword)(this.data.currentPassword, this.data.newPassword);
                if (operationEpoch !== Number(this.securityOperationEpoch || 0))
                    return;
                this.setData({ currentPassword: '', newPassword: '', confirmPassword: '', securityStatus: '密码已更新，其他设备上的会话已撤销。' });
                wx.showToast({ title: '密码已更新', icon: 'success' });
            }
            catch (error) {
                if (operationEpoch !== Number(this.securityOperationEpoch || 0))
                    return;
                const mapped = (0, auth_security_1.mapAuthError)(error);
                this.setData({ changePasswordError: mapped.message });
                if (mapped.code === 'RATE_LIMITED')
                    this.startChangePasswordCooldown((0, auth_security_1.retryAfterSeconds)(error, 60));
            }
            finally {
                if (operationEpoch === Number(this.securityOperationEpoch || 0))
                    this.setData({ changingPassword: false });
            }
        },
        deleteAccount() {
            var _a;
            if (!this.data.statusLoaded || this.data.lifecycleState !== 'active' || this.data.deleting)
                return;
            const validation = this.data.passwordless
                ? this.data.email.trim().toLowerCase() !== this.properties.currentEmail.trim().toLowerCase() ? '请输入当前账号邮箱。' : !this.data.deletionCodeSent || !this.data.hasDeletionCode ? '请输入本次注销的邮箱验证码。' : !this.data.confirmed ? '请完成二次确认。' : ''
                : (0, account_1.validateDeleteAccountInput)({ currentEmail: this.properties.currentEmail, email: this.data.email, password: this.data.password, confirmed: this.data.confirmed });
            if (validation) {
                this.setData({ error: validation });
                return;
            }
            const epoch = Number(this.securityOperationEpoch || 0), owner = (_a = (0, session_1.getCurrentUser)()) === null || _a === void 0 ? void 0 : _a.id;
            wx.showModal({
                title: '永久删除账号？', content: '账号、任务记录和对象存储中的个人资产将被永久删除，此操作不可撤销。', confirmText: '永久删除', confirmColor: '#a43f31',
                success: (result) => { var _a; if (result.confirm && epoch === Number(this.securityOperationEpoch || 0) && owner === ((_a = (0, session_1.getCurrentUser)()) === null || _a === void 0 ? void 0 : _a.id))
                    void this.performDelete(); },
            });
        },
        async performDelete() {
            var _a, _b, _c, _d;
            if (!this.data.statusLoaded || this.data.lifecycleState !== 'active' || this.data.deleting)
                return;
            const epoch = Number(this.securityOperationEpoch || 0);
            const ownerId = (_a = (0, session_1.getCurrentUser)()) === null || _a === void 0 ? void 0 : _a.id;
            let payload = (0, account_1.buildDeleteAccountPayload)(this.data.email, this.data.password);
            this.setData({ deleting: true, error: '' });
            try {
                if (this.data.passwordless) {
                    const code = this.deletionProofCode;
                    this.deletionProofCode = '';
                    this.setData({ deletionCode: '', hasDeletionCode: false, deletionCodeSent: false });
                    const proof = await (0, watcha_1.watchaRequest)('delete-confirmation', { code }, () => { var _a; return epoch === Number(this.securityOperationEpoch || 0) && ownerId === ((_a = (0, session_1.getCurrentUser)()) === null || _a === void 0 ? void 0 : _a.id); });
                    if (epoch !== Number(this.securityOperationEpoch || 0) || ownerId !== ((_b = (0, session_1.getCurrentUser)()) === null || _b === void 0 ? void 0 : _b.id))
                        return;
                    if (!/^[A-Za-z0-9_-]{43}$/.test(proof.confirmationToken))
                        throw new Error('注销确认未完成，请重新发送验证码。');
                    payload = { email: this.data.email.trim(), confirmationToken: proof.confirmationToken };
                }
                const response = await (0, api_1.gatewayRequest)(`${config_1.API_BASE}/api/account/delete`, 'POST', payload);
                if (epoch !== Number(this.securityOperationEpoch || 0) || ownerId !== ((_c = (0, session_1.getCurrentUser)()) === null || _c === void 0 ? void 0 : _c.id))
                    return;
                if (response.code === 202 && response.accepted) {
                    this.setData({ password: '', confirmed: false, lifecycleState: 'deleting', lifecycleMessage: (0, account_1.accountLifecycleMessage)('deleting') });
                    return;
                }
                if (Number(response.code) !== 0 || response.ok !== true)
                    throw new Error('账号删除未完成。');
                (0, account_1.clearAccountClientState)((key) => wx.removeStorageSync(key), api_keys_1.clearApiKeys);
                await (0, session_1.signOut)();
                wx.showToast({ title: '账号已删除', icon: 'success' });
                this.triggerEvent('deleted');
            }
            catch (error) {
                if (epoch === Number(this.securityOperationEpoch || 0) && ownerId === ((_d = (0, session_1.getCurrentUser)()) === null || _d === void 0 ? void 0 : _d.id))
                    this.setData({ error: (0, api_1.formatError)(error) });
            }
            finally {
                if (epoch === Number(this.securityOperationEpoch || 0))
                    this.setData({ deleting: false, password: '' });
            }
        },
    },
});
