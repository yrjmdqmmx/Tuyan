"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_security_1 = require("../../utils/auth-security");
const session_1 = require("../../utils/session");
const VERIFICATION_REQUEST_STATUS = '请求已受理。如账号需要验证，邮件将发送；已有账号请直接登录或找回密码。';
const AUTH_MODE_CONTENT = {
    'sign-in': {
        title: '登录账号',
        note: '使用邮箱登录，继续查看你的任务与结果。',
        submitText: '登录',
        toggleText: '没有账号，去注册',
    },
    'sign-up': {
        title: '创建图研账号',
        note: '注册后请在 1 小时内完成邮箱验证，再回到这里登录。',
        submitText: '注册并验证邮箱',
        toggleText: '已有账号，去登录',
    },
    'forgot-password': {
        title: '找回密码',
        note: '输入注册邮箱，我们会发送 1 小时内有效的重置链接。',
        submitText: '发送重置链接',
        toggleText: '返回登录',
    },
    'pending-verification': {
        title: '检查邮箱或返回登录',
        note: '如需验证，邮件中的链接 1 小时内有效；已有账号可直接返回登录。',
        submitText: '',
        toggleText: '返回登录',
    },
    'recovery-sent': {
        title: '请检查邮箱',
        note: '如该邮箱存在，我们已发送 1 小时内有效的重置链接。请同时检查垃圾邮件。',
        submitText: '',
        toggleText: '返回登录',
    },
};
Component({
    options: {
        styleIsolation: 'apply-shared',
    },
    properties: {
        show: {
            type: Boolean,
            value: false,
            observer(show) {
                if (!show)
                    this.resetAuthPanel();
            },
        },
    },
    data: {
        authMode: 'sign-in',
        authIsSignUp: false,
        authTitle: AUTH_MODE_CONTENT['sign-in'].title,
        authNote: AUTH_MODE_CONTENT['sign-in'].note,
        authSubmitText: AUTH_MODE_CONTENT['sign-in'].submitText,
        authToggleText: AUTH_MODE_CONTENT['sign-in'].toggleText,
        authEmail: '',
        authPassword: '',
        authName: '',
        authError: '',
        authStatus: '',
        authSubmitting: false,
        authCanSubmit: false,
        authCooldownSeconds: 0,
        authResendDisabled: false,
    },
    lifetimes: {
        detached() {
            this.resetAuthPanel();
        },
    },
    methods: {
        close() {
            this.resetAuthPanel();
            this.triggerEvent('close');
        },
        // 拦截点击冒泡，避免点对话框内容触发遮罩层的 close
        noop() { },
        clearAuthCooldown() {
            const timer = this.authCooldownTimer;
            if (timer !== undefined)
                clearInterval(timer);
            this.authCooldownTimer = undefined;
        },
        resetAuthPanel() {
            ;
            this.authOperationEpoch = Number(this.authOperationEpoch || 0) + 1;
            this.clearAuthCooldown();
            const content = AUTH_MODE_CONTENT['sign-in'];
            this.setData({
                authMode: 'sign-in',
                authIsSignUp: false,
                authTitle: content.title,
                authNote: content.note,
                authSubmitText: content.submitText,
                authToggleText: content.toggleText,
                authEmail: '',
                authPassword: '',
                authName: '',
                authError: '',
                authStatus: '',
                authSubmitting: false,
                authCanSubmit: false,
                authCooldownSeconds: 0,
                authResendDisabled: false,
            });
        },
        setAuthMode(mode) {
            ;
            this.authOperationEpoch = Number(this.authOperationEpoch || 0) + 1;
            this.clearAuthCooldown();
            const content = AUTH_MODE_CONTENT[mode];
            this.setData({
                authMode: mode,
                authIsSignUp: mode === 'sign-up',
                authTitle: content.title,
                authNote: content.note,
                authSubmitText: content.submitText,
                authToggleText: content.toggleText,
                authPassword: '',
                authError: '',
                authStatus: '',
                authSubmitting: false,
                authCooldownSeconds: 0,
                authResendDisabled: false,
            });
            this.refreshAuthCanSubmit();
        },
        showSignIn() { this.setAuthMode('sign-in'); },
        showSignUp() { this.setAuthMode('sign-up'); },
        showForgotPassword() { this.setAuthMode('forgot-password'); },
        toggleAuthMode() {
            if (this.data.authMode === 'sign-in')
                this.showSignUp();
            else
                this.showSignIn();
        },
        onAuthEmailInput(event) {
            this.setData({ authEmail: event.detail.value, authError: '', authStatus: '' });
            this.refreshAuthCanSubmit();
        },
        onAuthPasswordInput(event) {
            this.setData({ authPassword: event.detail.value, authError: '' });
            this.refreshAuthCanSubmit();
        },
        onAuthNameInput(event) {
            this.setData({ authName: event.detail.value });
        },
        refreshAuthCanSubmit() {
            const hasEmail = Boolean(this.data.authEmail.trim());
            const formReady = this.data.authMode === 'forgot-password'
                ? hasEmail
                : (this.data.authMode === 'sign-in' || this.data.authMode === 'sign-up')
                    ? hasEmail && (0, auth_security_1.validatePassword)(this.data.authPassword) === ''
                    : false;
            this.setData({
                authCanSubmit: Boolean(formReady && !this.data.authSubmitting && this.data.authCooldownSeconds === 0),
            });
        },
        startAuthCooldown(seconds) {
            this.clearAuthCooldown();
            const cooldown = Math.max(1, Math.ceil(seconds));
            this.setData({ authCooldownSeconds: cooldown, authResendDisabled: true });
            this.refreshAuthCanSubmit();
            this.authCooldownTimer = setInterval(() => {
                const next = Math.max(0, this.data.authCooldownSeconds - 1);
                this.setData({ authCooldownSeconds: next, authResendDisabled: next > 0 });
                if (next === 0)
                    this.clearAuthCooldown();
                this.refreshAuthCanSubmit();
            }, 1000);
        },
        enterPendingVerification(status) {
            this.setAuthMode('pending-verification');
            this.setData({ authPassword: '', authStatus: status });
            this.startAuthCooldown(60);
        },
        async submitAuth() {
            if (!this.data.authCanSubmit || this.data.authSubmitting)
                return;
            const operationEpoch = Number(this.authOperationEpoch || 0);
            const mode = this.data.authMode;
            this.setData({ authSubmitting: true, authError: '', authStatus: '' });
            this.refreshAuthCanSubmit();
            try {
                const email = this.data.authEmail.trim();
                if (mode === 'forgot-password') {
                    await (0, session_1.requestPasswordReset)(email);
                    if (operationEpoch !== Number(this.authOperationEpoch || 0))
                        return;
                    this.setAuthMode('recovery-sent');
                    return;
                }
                const password = this.data.authPassword;
                const result = mode === 'sign-up'
                    ? await (0, session_1.signUp)(email, password, this.data.authName.trim())
                    : await (0, session_1.signIn)(email, password);
                if (operationEpoch !== Number(this.authOperationEpoch || 0))
                    return;
                if (result.status === 'verification-required') {
                    this.enterPendingVerification(VERIFICATION_REQUEST_STATUS);
                    return;
                }
                this.setData({ authPassword: '' });
                wx.showToast({ title: '已登录', icon: 'success' });
                this.triggerEvent('authed', { user: result.user });
            }
            catch (error) {
                if (operationEpoch !== Number(this.authOperationEpoch || 0))
                    return;
                const mapped = (0, auth_security_1.mapAuthError)(error);
                if (mode === 'sign-in' && mapped.code === 'EMAIL_NOT_VERIFIED') {
                    this.enterPendingVerification('邮箱尚未验证，请在 1 小时内完成验证后再登录。');
                    return;
                }
                this.setData({ authPassword: '', authError: mapped.message });
                if (mapped.code === 'RATE_LIMITED')
                    this.startAuthCooldown(mapped.retryAfterSeconds || 60);
            }
            finally {
                if (operationEpoch === Number(this.authOperationEpoch || 0)) {
                    this.setData({ authSubmitting: false });
                    this.refreshAuthCanSubmit();
                }
            }
        },
        async resendVerification() {
            if (!this.data.authEmail.trim() || this.data.authResendDisabled || this.data.authSubmitting)
                return;
            const operationEpoch = Number(this.authOperationEpoch || 0);
            this.setData({ authSubmitting: true, authError: '', authStatus: '' });
            try {
                await (0, session_1.sendVerificationEmail)(this.data.authEmail.trim());
                if (operationEpoch !== Number(this.authOperationEpoch || 0))
                    return;
                this.setData({ authStatus: VERIFICATION_REQUEST_STATUS });
                this.startAuthCooldown(60);
            }
            catch (error) {
                if (operationEpoch !== Number(this.authOperationEpoch || 0))
                    return;
                const mapped = (0, auth_security_1.mapAuthError)(error);
                this.setData({ authError: mapped.message });
                if (mapped.code === 'RATE_LIMITED')
                    this.startAuthCooldown(mapped.retryAfterSeconds || 60);
            }
            finally {
                if (operationEpoch === Number(this.authOperationEpoch || 0))
                    this.setData({ authSubmitting: false });
            }
        },
    },
});
