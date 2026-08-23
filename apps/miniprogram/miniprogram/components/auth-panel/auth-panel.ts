import { formatError } from '../../utils/api'
import { signIn, signUp } from '../../utils/session'

type AuthMode = 'sign-in' | 'sign-up'

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
    authMode: 'sign-in' as AuthMode,
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
      this.setData({ authError: '' })
      this.triggerEvent('close')
    },

    // 拦截点击冒泡，避免点对话框内容触发遮罩层的 close
    noop() {},

    toggleAuthMode() {
      const nextMode: AuthMode = this.data.authMode === 'sign-in' ? 'sign-up' : 'sign-in'
      const isSignUp = nextMode === 'sign-up'
      this.setData({
        authMode: nextMode,
        authIsSignUp: isSignUp,
        authTitle: isSignUp ? '注册账号' : '登录账号',
        authSubmitText: isSignUp ? '注册并登录' : '登录',
        authToggleText: isSignUp ? '已有账号，去登录' : '没有账号，去注册',
        authError: '',
      })
      this.refreshAuthCanSubmit()
    },

    onAuthEmailInput(event: WechatMiniprogram.Input) {
      this.setData({ authEmail: event.detail.value })
      this.refreshAuthCanSubmit()
    },

    onAuthPasswordInput(event: WechatMiniprogram.Input) {
      this.setData({ authPassword: event.detail.value })
      this.refreshAuthCanSubmit()
    },

    onAuthNameInput(event: WechatMiniprogram.Input) {
      this.setData({ authName: event.detail.value })
    },

    refreshAuthCanSubmit() {
      this.setData({
        authCanSubmit: Boolean(this.data.authEmail.trim() && this.data.authPassword.length >= 8 && !this.data.authSubmitting),
      })
    },

    async submitAuth() {
      if (!this.data.authCanSubmit || this.data.authSubmitting) return
      this.setData({ authSubmitting: true, authError: '' })
      wx.showLoading({ title: this.data.authIsSignUp ? '注册中' : '登录中' })
      try {
        const email = this.data.authEmail.trim()
        const password = this.data.authPassword
        const result = this.data.authIsSignUp
          ? await signUp(email, password, this.data.authName.trim())
          : await signIn(email, password)
        if (result.status === 'verification-required') {
          this.setData({ authPassword: '', authError: '验证邮件已发送，请完成邮箱验证后再登录。' })
          wx.hideLoading()
          return
        }
        const user = result.user
        this.setData({ authPassword: '' })
        wx.hideLoading()
        wx.showToast({ title: '已登录', icon: 'success' })
        this.triggerEvent('authed', { user })
      } catch (error) {
        this.setData({ authError: formatError(error) })
        wx.hideLoading()
      } finally {
        this.setData({ authSubmitting: false })
        this.refreshAuthCanSubmit()
      }
    },
  },
})
