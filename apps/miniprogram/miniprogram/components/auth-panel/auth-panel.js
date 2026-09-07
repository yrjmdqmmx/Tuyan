"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = require("../../utils/api");
const session_1 = require("../../utils/session");
Component({
    options: {
        styleIsolation: 'apply-shared',
    },
    properties: {
        show: {
            type: Boolean,
            value: false,
        },
    },
    data: {
        authMode: 'sign-in',
        authIsSignUp: false,
        authTitle: '登录账号',
        authSubmitText: '登录',
        authToggleText: '没有账号，去注册',
        authEmail: '',
        authPassword: '',
        authName: '',
        authError: '',
        authSubmitting: false,
        authCanSubmit: false,
    },
    methods: {
        close() {
            this.setData({ authError: '' });
            this.triggerEvent('close');
        },
        // 拦截点击冒泡，避免点对话框内容触发遮罩层的 close
        noop() { },
        toggleAuthMode() {
            const nextMode = this.data.authMode === 'sign-in' ? 'sign-up' : 'sign-in';
            const isSignUp = nextMode === 'sign-up';
            this.setData({
                authMode: nextMode,
                authIsSignUp: isSignUp,
                authTitle: isSignUp ? '注册账号' : '登录账号',
                authSubmitText: isSignUp ? '注册并登录' : '登录',
                authToggleText: isSignUp ? '已有账号，去登录' : '没有账号，去注册',
                authError: '',
            });
            this.refreshAuthCanSubmit();
        },
        onAuthEmailInput(event) {
            this.setData({ authEmail: event.detail.value });
            this.refreshAuthCanSubmit();
        },
        onAuthPasswordInput(event) {
            this.setData({ authPassword: event.detail.value });
            this.refreshAuthCanSubmit();
        },
        onAuthNameInput(event) {
            this.setData({ authName: event.detail.value });
        },
        refreshAuthCanSubmit() {
            this.setData({
                authCanSubmit: Boolean(this.data.authEmail.trim() && this.data.authPassword.length >= 8 && !this.data.authSubmitting),
            });
        },
        async submitAuth() {
            if (!this.data.authCanSubmit || this.data.authSubmitting)
                return;
            this.setData({ authSubmitting: true, authError: '' });
            wx.showLoading({ title: this.data.authIsSignUp ? '注册中' : '登录中' });
            try {
                const email = this.data.authEmail.trim();
                const password = this.data.authPassword;
                const user = this.data.authIsSignUp
                    ? await (0, session_1.signUp)(email, password, this.data.authName.trim())
                    : await (0, session_1.signIn)(email, password);
                if (this.data.authIsSignUp) {
                    this.setData({ authPassword: '', authIsSignUp: false, authError: '注册请求已受理；如需验证，请查收邮件。已有账号请直接登录或找回密码，此提示不代表创建了新账号。' });
                    wx.hideLoading();
                    return;
                }
                if (!user)
                    throw new Error('登录状态校验失败，请重试。');
                this.setData({ authPassword: '' });
                wx.hideLoading();
                wx.showToast({ title: '已登录', icon: 'success' });
                this.triggerEvent('authed', { user });
            }
            catch (error) {
                this.setData({ authError: (0, api_1.formatError)(error) });
                wx.hideLoading();
            }
            finally {
                this.setData({ authSubmitting: false });
                this.refreshAuthCanSubmit();
            }
        },
    },
});
