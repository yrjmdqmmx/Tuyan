"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const account_1 = require("../../utils/account");
const auth_security_1 = require("../../utils/auth-security");
const api_1 = require("../../utils/api");
const api_keys_1 = require("../../utils/api-keys");
const config_1 = require("../../utils/config");
const session_1 = require("../../utils/session");
function changePasswordValidationMessage(code) {
    switch (code) {
        case 'CURRENT_PASSWORD_REQUIRED': return '请输入当前密码。';
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
        show: { type: Boolean, value: false, observer() { this.reset(); } },
        currentEmail: { type: String, value: '' },
        emailVerified: { type: Boolean, value: false },
    },
    data: {
        // 删除账号状态与改密状态刻意分离，防止一个流程读取或清理另一个流程的密码。
        email: '',
        password: '',
        confirmed: false,
        deleting: false,
        error: '',
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
        detached() { this.reset(); },
    },
    methods: {
        noop() { },
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
            this.setData({
                email: '', password: '', confirmed: false, deleting: false, error: '',
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
                this.setData({ securityStatus: '验证邮件已发送，请在 1 小时内完成验证。' });
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
            const validation = (0, account_1.validateDeleteAccountInput)({ currentEmail: this.properties.currentEmail, email: this.data.email, password: this.data.password, confirmed: this.data.confirmed });
            if (validation) {
                this.setData({ error: validation });
                return;
            }
            wx.showModal({
                title: '永久删除账号？', content: '账号、任务记录和对象存储中的个人资产将被永久删除，此操作不可撤销。', confirmText: '永久删除', confirmColor: '#a43f31',
                success: (result) => { if (result.confirm)
                    void this.performDelete(); },
            });
        },
        async performDelete() {
            this.setData({ deleting: true, error: '' });
            try {
                const response = await (0, api_1.gatewayRequest)(`${config_1.API_BASE}/api/account/delete`, 'POST', (0, account_1.buildDeleteAccountPayload)(this.data.email, this.data.password));
                if (Number(response.code) !== 0 || response.ok !== true)
                    throw new Error('账号删除未完成。');
                (0, account_1.clearAccountClientState)((key) => wx.removeStorageSync(key), api_keys_1.clearApiKeys);
                await (0, session_1.signOut)();
                wx.showToast({ title: '账号已删除', icon: 'success' });
                this.triggerEvent('deleted');
            }
            catch (error) {
                this.setData({ error: (0, api_1.formatError)(error) });
            }
            finally {
                this.setData({ deleting: false });
            }
        },
    },
});
