import { accountLifecycleMessage, buildDeleteAccountPayload, clearAccountClientState, validateDeleteAccountInput } from '../../utils/account'
import { mapAuthError, retryAfterSeconds, validateChangePassword } from '../../utils/auth-security'
import { gatewayRequest, formatError } from '../../utils/api'
import { clearApiKeys } from '../../utils/api-keys'
import { API_BASE } from '../../utils/config'
import { changePassword, sendVerificationEmail, signOut, getCurrentUser } from '../../utils/session'

function changePasswordValidationMessage(code: ReturnType<typeof validateChangePassword>): string {
  switch (code) {
    case 'CURRENT_PASSWORD_REQUIRED': return '请输入当前密码。'
    case 'CURRENT_PASSWORD_TOO_SHORT': return '当前密码至少 8 位。'
    case 'CURRENT_PASSWORD_TOO_LONG': return '当前密码最多 128 位。'
    case 'NEW_PASSWORD_REQUIRED': return '请输入新密码。'
    case 'PASSWORD_TOO_SHORT': return '新密码至少 8 位。'
    case 'PASSWORD_TOO_LONG': return '新密码最多 128 位。'
    case 'PASSWORD_CONFIRMATION_REQUIRED': return '请再次输入新密码。'
    case 'PASSWORD_CONFIRMATION_MISMATCH': return '两次输入的新密码不一致。'
    default: return ''
  }
}

Component({
  options: { styleIsolation: 'apply-shared' },
  properties: {
    show: { type: Boolean, value: false, observer(this: any, show: boolean) { this.reset(); if (show) void this.refreshLifecycle() } },
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
    detached() { this.reset() },
  },
  methods: {
    noop() {},
    async refreshLifecycle() {
      const epoch = Number((this as any).securityOperationEpoch || 0)
      const ownerId = getCurrentUser()?.id
      try {
        const response = await gatewayRequest<{ code?: number; state?: string }>(`${API_BASE}/api/account/status`, 'GET')
        if (epoch !== Number((this as any).securityOperationEpoch || 0) || ownerId !== getCurrentUser()?.id) return
        if (response.code !== 0 || !response.state) throw new Error('账号状态暂时无法获取。')
        this.setData({ statusLoaded: true, lifecycleState: response.state, lifecycleMessage: accountLifecycleMessage(response.state), error: '' })
      } catch (error) {
        if (epoch === Number((this as any).securityOperationEpoch || 0) && ownerId === getCurrentUser()?.id) this.setData({ statusLoaded: false, error: formatError(error) })
      }
    },
    clearResendCooldown() {
      const timer = (this as any).resendCooldownTimer as ReturnType<typeof setInterval> | undefined
      if (timer !== undefined) clearInterval(timer)
      ;(this as any).resendCooldownTimer = undefined
    },
    clearChangePasswordCooldown() {
      const timer = (this as any).changePasswordCooldownTimer as ReturnType<typeof setInterval> | undefined
      if (timer !== undefined) clearInterval(timer)
      ;(this as any).changePasswordCooldownTimer = undefined
    },
    reset() {
      ;(this as any).securityOperationEpoch = Number((this as any).securityOperationEpoch || 0) + 1
      this.clearResendCooldown()
      this.clearChangePasswordCooldown()
      this.setData({
        email: '', password: '', confirmed: false, deleting: false, error: '',
        lifecycleMessage: '', lifecycleState: '', statusLoaded: false,
        currentPassword: '', newPassword: '', confirmPassword: '', changingPassword: false,
        changePasswordError: '', changePasswordCooldownSeconds: 0, changePasswordCooldownDisabled: false,
        securityError: '', securityStatus: '',
        resendCooldownSeconds: 0, resendDisabled: false, resendingVerification: false,
      })
    },
    close() {
      if (this.data.deleting) return
      this.reset()
      this.triggerEvent('close')
    },
    onEmailInput(event: WechatMiniprogram.Input) { this.setData({ email: event.detail.value, error: '' }) },
    onPasswordInput(event: WechatMiniprogram.Input) { this.setData({ password: event.detail.value, error: '' }) },
    onConfirmChange(event: WechatMiniprogram.CheckboxGroupChange) { this.setData({ confirmed: event.detail.value.includes('confirmed'), error: '' }) },
    onCurrentPasswordInput(event: WechatMiniprogram.Input) { this.setData({ currentPassword: event.detail.value, changePasswordError: '', securityStatus: '' }) },
    onNewPasswordInput(event: WechatMiniprogram.Input) { this.setData({ newPassword: event.detail.value, changePasswordError: '', securityStatus: '' }) },
    onConfirmPasswordInput(event: WechatMiniprogram.Input) { this.setData({ confirmPassword: event.detail.value, changePasswordError: '', securityStatus: '' }) },
    async logout() { await signOut(); this.triggerEvent('signedout') },
    startResendCooldown(seconds: number) {
      this.clearResendCooldown()
      const cooldown = Math.max(1, Math.ceil(seconds))
      this.setData({ resendCooldownSeconds: cooldown, resendDisabled: true })
      ;(this as any).resendCooldownTimer = setInterval(() => {
        const next = Math.max(0, this.data.resendCooldownSeconds - 1)
        this.setData({ resendCooldownSeconds: next, resendDisabled: next > 0 })
        if (next === 0) this.clearResendCooldown()
      }, 1000)
    },
    startChangePasswordCooldown(seconds: number) {
      this.clearChangePasswordCooldown()
      const cooldown = Math.max(1, Math.ceil(seconds))
      this.setData({ changePasswordCooldownSeconds: cooldown, changePasswordCooldownDisabled: true })
      ;(this as any).changePasswordCooldownTimer = setInterval(() => {
        const next = Math.max(0, this.data.changePasswordCooldownSeconds - 1)
        this.setData({ changePasswordCooldownSeconds: next, changePasswordCooldownDisabled: next > 0 })
        if (next === 0) this.clearChangePasswordCooldown()
      }, 1000)
    },
    async resendVerification() {
      if (this.properties.emailVerified || this.data.resendDisabled || this.data.resendingVerification) return
      const email = this.properties.currentEmail.trim()
      if (!email) return
      const operationEpoch = Number((this as any).securityOperationEpoch || 0)
      this.setData({ resendingVerification: true, securityError: '', securityStatus: '' })
      try {
        await sendVerificationEmail(email)
        if (operationEpoch !== Number((this as any).securityOperationEpoch || 0)) return
        this.setData({ securityStatus: '请求已受理。如账号仍需验证，邮件将发送，请同时检查垃圾邮件。' })
        this.startResendCooldown(60)
      } catch (error) {
        if (operationEpoch !== Number((this as any).securityOperationEpoch || 0)) return
        const mapped = mapAuthError(error)
        this.setData({ securityError: mapped.message })
        if (mapped.code === 'RATE_LIMITED') this.startResendCooldown(mapped.retryAfterSeconds || 60)
      } finally {
        if (operationEpoch === Number((this as any).securityOperationEpoch || 0)) this.setData({ resendingVerification: false })
      }
    },
    async submitChangePassword() {
      if (this.data.changingPassword || this.data.changePasswordCooldownDisabled) return
      const operationEpoch = Number((this as any).securityOperationEpoch || 0)
      const validation = validateChangePassword({
        currentPassword: this.data.currentPassword,
        newPassword: this.data.newPassword,
        confirmation: this.data.confirmPassword,
      })
      if (validation) {
        this.setData({ changePasswordError: changePasswordValidationMessage(validation), securityStatus: '' })
        return
      }
      this.setData({ changingPassword: true, changePasswordError: '', securityError: '', securityStatus: '' })
      try {
        await changePassword(this.data.currentPassword, this.data.newPassword)
        if (operationEpoch !== Number((this as any).securityOperationEpoch || 0)) return
        this.setData({ currentPassword: '', newPassword: '', confirmPassword: '', securityStatus: '密码已更新，其他设备上的会话已撤销。' })
        wx.showToast({ title: '密码已更新', icon: 'success' })
      } catch (error) {
        if (operationEpoch !== Number((this as any).securityOperationEpoch || 0)) return
        const mapped = mapAuthError(error)
        this.setData({ changePasswordError: mapped.message })
        if (mapped.code === 'RATE_LIMITED') this.startChangePasswordCooldown(retryAfterSeconds(error, 60))
      } finally {
        if (operationEpoch === Number((this as any).securityOperationEpoch || 0)) this.setData({ changingPassword: false })
      }
    },
    deleteAccount() {
      if (!this.data.statusLoaded || this.data.lifecycleState !== 'active' || this.data.deleting) return
      const validation = validateDeleteAccountInput({ currentEmail: this.properties.currentEmail, email: this.data.email, password: this.data.password, confirmed: this.data.confirmed })
      if (validation) { this.setData({ error: validation }); return }
      wx.showModal({
        title: '永久删除账号？', content: '账号、任务记录和对象存储中的个人资产将被永久删除，此操作不可撤销。', confirmText: '永久删除', confirmColor: '#a43f31',
        success: (result) => { if (result.confirm) void this.performDelete() },
      })
    },
    async performDelete() {
      if (!this.data.statusLoaded || this.data.lifecycleState !== 'active' || this.data.deleting) return
      const epoch = Number((this as any).securityOperationEpoch || 0)
      const ownerId = getCurrentUser()?.id
      const payload = buildDeleteAccountPayload(this.data.email, this.data.password)
      this.setData({ deleting: true, error: '' })
      try {
        const response = await gatewayRequest<{ code?: number; ok?: boolean; accepted?: boolean }>(`${API_BASE}/api/account/delete`, 'POST', payload)
        if (epoch !== Number((this as any).securityOperationEpoch || 0) || ownerId !== getCurrentUser()?.id) return
        if (response.code === 202 && response.accepted) {
          this.setData({ password: '', confirmed: false, lifecycleState: 'deleting', lifecycleMessage: accountLifecycleMessage('deleting') })
          return
        }
        if (Number(response.code) !== 0 || response.ok !== true) throw new Error('账号删除未完成。')
        clearAccountClientState((key) => wx.removeStorageSync(key), clearApiKeys)
        await signOut()
        wx.showToast({ title: '账号已删除', icon: 'success' })
        this.triggerEvent('deleted')
      } catch (error) { if (epoch === Number((this as any).securityOperationEpoch || 0) && ownerId === getCurrentUser()?.id) this.setData({ error: formatError(error) }) }
      finally { if (epoch === Number((this as any).securityOperationEpoch || 0)) this.setData({ deleting: false, password: '' }) }
    },
  },
})
