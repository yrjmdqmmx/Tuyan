import { getCurrentUser, subscribeSession } from '../../utils/session'
import { formatError, requestJson } from '../../utils/api'
import { readDatasetBoolean } from '../../utils/constants'
import { normalizeJob, type Job } from '../../utils/jobs'
import { downloadShareFile, saveImageToAlbum } from '../../utils/media'

Component({
  data: {
    jobId: '',
    job: null as Job | null,
    error: '',
    isLoading: true,
  },

  lifetimes: {
    attached() {
      let owner = getCurrentUser()?.id || ''
      ;(this as any).epoch = 0
      ;(this as any).unsubscribeSession = subscribeSession(user => {
        if (owner !== (user?.id || '')) {
          ;(this as any).epoch++
          owner = user?.id || ''
          this.stopPolling(); this.setData({ job: null, jobId: '', error: '账号已切换，请从任务记录重新打开。', isLoading: false })
        }
      })
    },
    detached() {
      ;(this as any).epoch++; (this as any).unsubscribeSession?.()
      this.stopPolling()
    },
  },

  pageLifetimes: {
    show() {
      if ((this as any).pollingTimer) return
      const status = this.data.job ? this.data.job.status : ''
      if (this.data.jobId && ['succeeded', 'failed'].includes(status)) void this.loadJob()
      if (this.data.jobId && status !== 'succeeded' && status !== 'failed') {
        this.startPolling()
      }
    },
    hide() {
      this.stopPolling()
    },
  },

  methods: {
    onLoad(options: Record<string, string | undefined>) {
      const jobId = String(options.jobId || '')
      if (!jobId) {
        this.setData({ error: '缺少任务 ID', isLoading: false })
        return
      }
      this.setData({ jobId })
      this.startPolling()
    },

    onUnload() {
      this.stopPolling()
    },

    async loadJob() {
      const jobId = this.data.jobId
      if (!jobId || (this as any).loadingRequest) return
      const epoch = (this as any).epoch
      ;(this as any).loadingRequest = true
      const current = () => epoch === (this as any).epoch && jobId === this.data.jobId
      try {
        const data = await requestJson<{ job?: unknown }>({ action: 'getJob', jobId })
        if (!current()) return
        const job = normalizeJob(data.job)
        this.setData({
          job,
          error: '',
          isLoading: false,
        })
        if (job.status === 'succeeded' || job.status === 'failed') {
          this.stopPolling()
        }
      } catch (error) {
        if (!current()) return
        this.setData({
          error: formatError(error),
          isLoading: false,
        })
      } finally { (this as any).loadingRequest = false }
    },

    startPolling() {
      this.stopPolling()
      this.loadJob()
      const timer = setInterval(() => {
        this.loadJob()
      }, 3000)
      ;(this as any).pollingTimer = timer
    },

    stopPolling() {
      const timer = (this as any).pollingTimer as number | undefined
      if (timer) clearInterval(timer)
      ;(this as any).pollingTimer = undefined
    },

    refresh() {
      this.loadJob()
    },

    copyJobId() {
      if (!this.data.jobId) return
      wx.setClipboardData({ data: this.data.jobId })
    },

    previewImage(event: WechatMiniprogram.TouchEvent) {
      const url = String(event.currentTarget.dataset.url || '')
      const canPreview = readDatasetBoolean(event.currentTarget.dataset.canPreview, true)
      if (!url) return
      if (!canPreview) {
        downloadShareFile(url)
        return
      }
      const job = this.data.job
      const urls = job ? job.result_images.filter((image) => image.can_preview).map((image) => image.url).filter(Boolean) : []
      wx.previewImage({ current: url, urls: urls.indexOf(url) >= 0 ? urls : [url] })
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
  },
})
