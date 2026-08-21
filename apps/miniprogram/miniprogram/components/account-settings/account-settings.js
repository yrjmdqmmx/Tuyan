"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const account_1 = require("../../utils/account");
const api_1 = require("../../utils/api");
const api_keys_1 = require("../../utils/api-keys");
const config_1 = require("../../utils/config");
const session_1 = require("../../utils/session");
Component({
    options: { styleIsolation: 'apply-shared' },
    properties: {
        show: { type: Boolean, value: false, observer(show) { if (show)
                this.reset(); } },
        currentEmail: { type: String, value: '' },
    },
    data: { email: '', password: '', confirmed: false, deleting: false, error: '' },
    methods: {
        noop() { },
        reset() { this.setData({ email: '', password: '', confirmed: false, deleting: false, error: '' }); },
        close() { if (!this.data.deleting)
            this.triggerEvent('close'); },
        onEmailInput(event) { this.setData({ email: event.detail.value }); },
        onPasswordInput(event) { this.setData({ password: event.detail.value }); },
        onConfirmChange(event) { this.setData({ confirmed: event.detail.value.includes('confirmed') }); },
        async logout() { await (0, session_1.signOut)(); this.triggerEvent('signedout'); },
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
