import { accountLifecycleMessage, buildDeleteAccountPayload, clearAccountClientState, validateDeleteAccountInput } from '../../utils/account'
import { gatewayRequest, formatError } from '../../utils/api'
import { clearApiKeys } from '../../utils/api-keys'
import { API_BASE } from '../../utils/config'
import { signOut } from '../../utils/session'

Component({
  options: { styleIsolation: 'apply-shared' },
  properties: {
    show: { type: Boolean, value: false, observer(this: any, show: boolean) { if (show) this.reset() } },
    currentEmail: { type: String, value: '' },
  },
  data: { email: '', password: '', confirmed: false, deleting: false, error: '', lifecycleMessage: '', lifecycleState: '', statusLoaded: false },
  methods: {
    noop() {},
    reset() { this.setData({ email: '', password: '', confirmed: false, deleting: false, error: '', lifecycleMessage: '', statusLoaded: false }); void this.refreshLifecycle() },
    async refreshLifecycle() {
      try {
        const response = await gatewayRequest<{ code?: number; state?: string }>(`${API_BASE}/api/account/status`, 'GET')
        if (response.code !== 0) throw new Error('账号状态暂时无法获取。')
        this.setData({ statusLoaded: true, lifecycleState: response.state, lifecycleMessage: accountLifecycleMessage(response.state || '') })
      } catch (error) { this.setData({ error: formatError(error) }) }
    },
    close() { if (!this.data.deleting) this.triggerEvent('close') },
    onEmailInput(event: WechatMiniprogram.Input) { this.setData({ email: event.detail.value }) },
    onPasswordInput(event: WechatMiniprogram.Input) { this.setData({ password: event.detail.value }) },
    onConfirmChange(event: WechatMiniprogram.CheckboxGroupChange) { this.setData({ confirmed: event.detail.value.includes('confirmed') }) },
    async logout() { await signOut(); this.triggerEvent('signedout') },
    deleteAccount() {
      if (!this.data.statusLoaded || this.data.lifecycleState !== 'active') return
      const validation = validateDeleteAccountInput({ currentEmail: this.properties.currentEmail, email: this.data.email, password: this.data.password, confirmed: this.data.confirmed })
      if (validation) { this.setData({ error: validation }); return }
      wx.showModal({
        title: '永久删除账号？', content: '账号、任务记录和对象存储中的个人资产将被永久删除，此操作不可撤销。', confirmText: '永久删除', confirmColor: '#a43f31',
        success: (result) => { if (result.confirm) void this.performDelete() },
      })
    },
    async performDelete() {
      this.setData({ deleting: true, error: '' })
      try {
        const response = await gatewayRequest<{ code?: number; ok?: boolean; accepted?: boolean }>(`${API_BASE}/api/account/delete`, 'POST', buildDeleteAccountPayload(this.data.email, this.data.password))
        if (response.code === 202 && response.accepted) { this.setData({ password: '', confirmed: false, lifecycleState: 'deleting', lifecycleMessage: accountLifecycleMessage('deleting') }); return }
        if (Number(response.code) !== 0 || response.ok !== true) throw new Error('账号删除未完成。')
        clearAccountClientState((key) => wx.removeStorageSync(key), clearApiKeys)
        await signOut()
        wx.showToast({ title: '账号已删除', icon: 'success' })
        this.triggerEvent('deleted')
      } catch (error) { this.setData({ error: formatError(error) }) }
      finally { this.setData({ deleting: false }) }
    },
  },
})
