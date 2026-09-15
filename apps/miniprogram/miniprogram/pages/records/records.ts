import { rememberWorkPage } from '../../utils/tokendance'
import { formatError, requestJson } from '../../utils/api'
import { readDatasetBoolean } from '../../utils/constants'
import {
  clearLocalJobs,
  hydrateRecordJobs,
  normalizeJob,
  readLocalJobs,
  toRecordJobSummary,
  type Job,
} from '../../utils/jobs'
import { downloadShareFile, saveImageToAlbum } from '../../utils/media'
import { getCurrentUser, isSessionChecked, signOut as sessionSignOut, subscribeSession } from '../../utils/session'

Component({
  data: {
    isLoggedIn: false,
    isAuthChecking: true,
    currentUserEmail: '',
    currentUserEmailVerified: false,
    accountJobs: [] as Job[],
    accountJobsError: '',
    accountJobsLoading: false,
    localJobs: [] as Job[],
    showAuthPanel: false,
    showAccountSettings: false,
  },

  lifetimes: {
    attached() {
      ;(this as any).ownerId = getCurrentUser()?.id || ''
      ;(this as any).requestSequence = 0
      const unsubscribe = subscribeSession((user) => {
        const changed = (this as any).ownerId !== (user?.id || '')
        ;(this as any).ownerId = user?.id || ''
        if (changed) { (this as any).requestSequence++; this.setData({ accountJobs: [], accountJobsError: '', accountJobsLoading: false, localJobs: readLocalJobs() }) }
        this.setData({
          isLoggedIn: Boolean(user),
          currentUserEmail: user ? user.email : '',
          currentUserEmailVerified: user ? user.emailVerified : false,
          isAuthChecking: false,
        })
        if (user && changed) {
          this.loadAccountJobs()
        }
        if (!user) {
          this.setData({ accountJobs: [] })
        }
      })
      ;(this as any).unsubscribeSession = unsubscribe
      const user = getCurrentUser()
      this.setData({
        isLoggedIn: Boolean(user),
        currentUserEmail: user ? user.email : '',
        currentUserEmailVerified: user ? user.emailVerified : false,
        isAuthChecking: !isSessionChecked(),
      })
    },
    detached() {
      ;(this as any).requestSequence++
      const unsubscribe = (this as any).unsubscribeSession as (() => void) | undefined
      if (unsubscribe) unsubscribe()
    },
  },

  pageLifetimes: {
    show() { rememberWorkPage('/pages/records/records');
      this.setData({ localJobs: readLocalJobs() })
      if (this.data.isLoggedIn) {
        this.loadAccountJobs({ silent: this.data.accountJobs.length > 0 })
      }
    },
  },

  methods: {
    async loadAccountJobs(options?: { silent?: boolean }) {
      if (!this.data.isLoggedIn) return
      // 在途响应只对发起请求时的账号有效：登出/换号后丢弃，避免旧账号任务列表跨账号泄露
      const requestUser = getCurrentUser()
      const requestUserId = requestUser ? requestUser.id : ''
      const sequence = (this as any).requestSequence = Number((this as any).requestSequence || 0) + 1
      if (!options || !options.silent) {
        this.setData({ accountJobsLoading: true, accountJobsError: '' })
      }
      try {
        const data = await requestJson<{ jobs?: unknown[] }>({ action: 'myJobs', limit: 50 })
        if ((getCurrentUser()?.id || '') !== requestUserId || sequence !== (this as any).requestSequence) return
        const jobs = await hydrateRecordJobs((data.jobs || []).map(normalizeJob), () => (getCurrentUser()?.id || '') === requestUserId && sequence === (this as any).requestSequence)
        const currentUser = getCurrentUser()
        if ((currentUser ? currentUser.id : '') !== requestUserId || sequence !== (this as any).requestSequence) return
        this.setData({
          accountJobs: jobs.map(toRecordJobSummary),
          accountJobsError: '',
          accountJobsLoading: false,
        })
      } catch (error) {
        const currentUser = getCurrentUser()
        if ((currentUser ? currentUser.id : '') !== requestUserId || sequence !== (this as any).requestSequence) return
        this.setData({
          accountJobsError: formatError(error),
          accountJobsLoading: false,
        })
      }
    },

    refreshAccountJobs() {
      this.loadAccountJobs()
    },

    openJob(event: WechatMiniprogram.TouchEvent) {
      const jobId = String(event.currentTarget.dataset.id || '')
      if (!jobId) return
      wx.navigateTo({ url: `/pages/job-detail/job-detail?jobId=${jobId}` })
    },
    openRefine() { wx.switchTab({ url: '/pages/refine/refine' }) },

    clearLocal() {
      clearLocalJobs()
      this.setData({ localJobs: [] })
    },

    previewRecordImage(event: WechatMiniprogram.TouchEvent) {
      const url = String(event.currentTarget.dataset.url || '')
      const canPreview = readDatasetBoolean(event.currentTarget.dataset.canPreview, true)
      if (!url) return
      if (!canPreview) {
        downloadShareFile(url)
        return
      }
      wx.previewImage({ current: url, urls: [url] })
    },

    handleImageAction(event: WechatMiniprogram.TouchEvent) {
      const url = String(event.currentTarget.dataset.url || '')
      const canPreview = readDatasetBoolean(event.currentTarget.dataset.canPreview, true)
      if (!url) return
      if (!canPreview) {
        downloadShareFile(url)
        return
      }
      saveImageToAlbum(url)
    },

    openAuthPanel() {
      this.setData({ showAuthPanel: true })
    },

    closeAuthPanel() {
      this.setData({ showAuthPanel: false })
    },

    onAuthed() {
      this.setData({ showAuthPanel: false })
      this.loadAccountJobs()
    },

    async signOut() {
      await sessionSignOut()
      wx.showToast({ title: '已退出', icon: 'success' })
    },
    openAccountSettings() { this.setData({ showAccountSettings: true }) },
    closeAccountSettings() { this.setData({ showAccountSettings: false }) },
    onAccountSignedOut() { this.setData({ showAccountSettings: false, accountJobs: [] }) },
    onAccountDeleted() { this.setData({ showAccountSettings: false, accountJobs: [], localJobs: [] }) },
    onShareAppMessage() { return { title: '图研Tuyan · 任务记录', path: '/pages/records/records' } },
  },
})
