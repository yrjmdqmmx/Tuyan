import { mapAuthError, validatePassword } from '../../utils/auth-security'
import { getVerificationStatus, requestPasswordReset, sendVerificationEmail, signIn, signUp } from '../../utils/session'
import { createVerificationObserver, type VerificationStatus } from '../../utils/verification-observer'

const VERIFICATION_REQUEST_STATUS = '请求已受理。如账号需要验证，邮件将发送；已有账号请直接登录或找回密码。'

type AuthMode = 'sign-in' | 'sign-up' | 'forgot-password' | 'pending-verification' | 'recovery-sent'

interface AuthModeContent {
  title: string
  note: string
  submitText: string
  toggleText: string
}

const AUTH_MODE_CONTENT: Record<AuthMode, AuthModeContent> = {
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
}

Component({
  options: {
    styleIsolation: 'apply-shared',
  },

  properties: {
    show: {
      type: Boolean,
      value: false,
      observer(this: any, show: boolean) {
        if (!show) this.resetAuthPanel()
      },
    },
  },

  data: {
    authMode: 'sign-in' as AuthMode,
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
    verificationObserved: false, verificationConfirmed: false, verificationState: '',
  },

  lifetimes: {
    detached() {
      this.resetAuthPanel()
    },
  },
  pageLifetimes: {
    hide() { (this as any).verificationObserver?.pause() },
    show() { if (this.properties.show) void (this as any).verificationObserver?.resume() },
  },

  methods: {
    close() {
      this.resetAuthPanel()
      this.triggerEvent('close')
    },

    // 拦截点击冒泡，避免点对话框内容触发遮罩层的 close
    noop() {},
    stopVerificationObserver() {
      ;(this as any).verificationObserver?.stop()
      ;(this as any).verificationObserver = undefined
    },
    observeVerification(token: string) {
      this.stopVerificationObserver()
      this.setData({ verificationObserved: true })
      const observer = createVerificationObserver({ query: () => getVerificationStatus(token), onStatus: (status: VerificationStatus) => {
        if (this.data.authMode !== 'pending-verification') return
        this.setData({ verificationState: status })
        if (status === 'verified') {
          this.clearAuthCooldown()
          this.setData({ verificationConfirmed: true, authCooldownSeconds: 0, authResendDisabled: true, authTitle: '邮箱已验证', authStatus: '邮箱验证已完成，请返回登录。', authNote: '请使用邮箱和密码登录，验证不会自动建立会话。', authError: '' })
        } else if (status === 'unavailable') this.setData({ authError: '暂时无法检查验证状态，可稍后刷新或返回登录。' })
        else if (status === 'expired') this.setData({ authError: '本次状态查询已过期，请返回登录；如仍未验证可重新发起。' })
        else this.setData({ authError: '' })
      } })
      ;(this as any).verificationObserver = observer
      void observer.resume()
    },
    refreshVerification() { void (this as any).verificationObserver?.refresh() },

    clearAuthCooldown() {
      const timer = (this as any).authCooldownTimer as ReturnType<typeof setInterval> | undefined
      if (timer !== undefined) clearInterval(timer)
      ;(this as any).authCooldownTimer = undefined
    },

    resetAuthPanel() {
      this.stopVerificationObserver()
      ;(this as any).authOperationEpoch = Number((this as any).authOperationEpoch || 0) + 1
      this.clearAuthCooldown()
      const content = AUTH_MODE_CONTENT['sign-in']
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
        verificationObserved: false, verificationConfirmed: false, verificationState: '',
      })
    },

    setAuthMode(mode: AuthMode) {
      this.stopVerificationObserver()
      ;(this as any).authOperationEpoch = Number((this as any).authOperationEpoch || 0) + 1
      this.clearAuthCooldown()
      const content = AUTH_MODE_CONTENT[mode]
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
        verificationObserved: false, verificationConfirmed: false, verificationState: '',
      })
      this.refreshAuthCanSubmit()
    },

    showSignIn() { this.setAuthMode('sign-in') },
    showSignUp() { this.setAuthMode('sign-up') },
    showForgotPassword() { this.setAuthMode('forgot-password') },

    toggleAuthMode() {
      if (this.data.authMode === 'sign-in') this.showSignUp()
      else this.showSignIn()
    },

    onAuthEmailInput(event: WechatMiniprogram.Input) {
      this.setData({ authEmail: event.detail.value, authError: '', authStatus: '' })
      this.refreshAuthCanSubmit()
    },

    onAuthPasswordInput(event: WechatMiniprogram.Input) {
      this.setData({ authPassword: event.detail.value, authError: '' })
      this.refreshAuthCanSubmit()
    },

    onAuthNameInput(event: WechatMiniprogram.Input) {
      this.setData({ authName: event.detail.value })
    },

    refreshAuthCanSubmit() {
      const hasEmail = Boolean(this.data.authEmail.trim())
      const formReady = this.data.authMode === 'forgot-password'
        ? hasEmail
        : (this.data.authMode === 'sign-in' || this.data.authMode === 'sign-up')
          ? hasEmail && validatePassword(this.data.authPassword) === ''
          : false
      this.setData({
        authCanSubmit: Boolean(formReady && !this.data.authSubmitting && this.data.authCooldownSeconds === 0),
      })
    },

    startAuthCooldown(seconds: number) {
      this.clearAuthCooldown()
      const cooldown = Math.max(1, Math.ceil(seconds))
      this.setData({ authCooldownSeconds: cooldown, authResendDisabled: true })
      this.refreshAuthCanSubmit()
      ;(this as any).authCooldownTimer = setInterval(() => {
        const next = Math.max(0, this.data.authCooldownSeconds - 1)
        this.setData({ authCooldownSeconds: next, authResendDisabled: next > 0 })
        if (next === 0) this.clearAuthCooldown()
        this.refreshAuthCanSubmit()
      }, 1000)
    },

    enterPendingVerification(status: string) {
      this.setAuthMode('pending-verification')
      this.setData({ authPassword: '', authStatus: status })
      this.startAuthCooldown(60)
    },

    async submitAuth() {
      if (!this.data.authCanSubmit || this.data.authSubmitting) return
      const operationEpoch = Number((this as any).authOperationEpoch || 0)
      const mode = this.data.authMode
      this.setData({ authSubmitting: true, authError: '', authStatus: '' })
      this.refreshAuthCanSubmit()
      try {
        const email = this.data.authEmail.trim()
        if (mode === 'forgot-password') {
          await requestPasswordReset(email)
          if (operationEpoch !== Number((this as any).authOperationEpoch || 0)) return
          this.setAuthMode('recovery-sent')
          return
        }

        const password = this.data.authPassword
        const result = mode === 'sign-up'
          ? await signUp(email, password, this.data.authName.trim()) as
              | { status: 'verification-required'; email: string; verificationStatusToken?: string }
              | { status: 'authenticated'; user: unknown }
          : await signIn(email, password)
        if (operationEpoch !== Number((this as any).authOperationEpoch || 0)) return
        if (result.status === 'verification-required') {
          this.enterPendingVerification(VERIFICATION_REQUEST_STATUS)
          if (result.verificationStatusToken) this.observeVerification(result.verificationStatusToken)
          return
        }

        this.setData({ authPassword: '' })
        wx.showToast({ title: '已登录', icon: 'success' })
        this.triggerEvent('authed', { user: result.user })
      } catch (error) {
        if (operationEpoch !== Number((this as any).authOperationEpoch || 0)) return
        const mapped = mapAuthError(error)
        if (mode === 'sign-in' && mapped.code === 'EMAIL_NOT_VERIFIED') {
          this.enterPendingVerification('邮箱尚未验证，请在 1 小时内完成验证后再登录。')
          return
        }
        this.setData({ authPassword: '', authError: mapped.message })
        if (mapped.code === 'RATE_LIMITED') this.startAuthCooldown(mapped.retryAfterSeconds || 60)
      } finally {
        if (operationEpoch === Number((this as any).authOperationEpoch || 0)) {
          this.setData({ authSubmitting: false })
          this.refreshAuthCanSubmit()
        }
      }
    },

    async resendVerification() {
      if (this.data.verificationConfirmed) return
      if (!this.data.authEmail.trim() || this.data.authResendDisabled || this.data.authSubmitting) return
      const operationEpoch = Number((this as any).authOperationEpoch || 0)
      this.setData({ authSubmitting: true, authError: '', authStatus: '' })
      try {
        await sendVerificationEmail(this.data.authEmail.trim())
        if (operationEpoch !== Number((this as any).authOperationEpoch || 0)) return
        this.setData({ authStatus: VERIFICATION_REQUEST_STATUS })
        this.startAuthCooldown(60)
      } catch (error) {
        if (operationEpoch !== Number((this as any).authOperationEpoch || 0)) return
        const mapped = mapAuthError(error)
        this.setData({ authError: mapped.message })
        if (mapped.code === 'RATE_LIMITED') this.startAuthCooldown(mapped.retryAfterSeconds || 60)
      } finally {
        if (operationEpoch === Number((this as any).authOperationEpoch || 0)) this.setData({ authSubmitting: false })
      }
    },
  },
})
