import { buildDeleteAccountPayload, clearAccountClientState, validateDeleteAccountInput } from '../../utils/account'
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
  data: { email: '', password: '', confirmed: false, deleting: false, error: '' },
  methods: {
    noop() {},
    reset() { this.setData({ email: '', password: '', confirmed: false, deleting: false, error: '' }) },
    close() { if (!this.data.deleting) this.triggerEvent('close') },
    onEmailInput(event: WechatMiniprogram.Input) { this.setData({ email: event.detail.value }) },
    onPasswordInput(event: WechatMiniprogram.Input) { this.setData({ password: event.detail.value }) },
    onConfirmChange(event: WechatMiniprogram.CheckboxGroupChange) { this.setData({ confirmed: event.detail.value.includes('confirmed') }) },
    async logout() { await signOut(); this.triggerEvent('signedout') },
    deleteAccount() {
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
        const response = await gatewayRequest<{ code?: number; ok?: boolean }>(`${API_BASE}/api/account/delete`, 'POST', buildDeleteAccountPayload(this.data.email, this.data.password))
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
