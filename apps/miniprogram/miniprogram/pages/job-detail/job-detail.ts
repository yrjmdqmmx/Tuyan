import { openTokenDance } from '../../utils/tokendance'
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
    detached() {
      this.stopPolling()
    },
  },

  pageLifetimes: {
    show() {
      if ((this as any).pollingTimer) return
      const status = this.data.job ? this.data.job.status : ''
      if (this.data.jobId && status !== 'succeeded' && status !== 'failed') {
        this.startPolling()
      }
    },
    hide() {
      this.stopPolling()
    },
  },

  methods: {
    openTokenDance,
    async resumeJob() {
      if (!this.data.job?.recovery?.canResume || (this as any).resuming) return
      ;(this as any).resuming = true
      try { await requestJson({ action: 'tokenDanceResume', jobId: this.data.jobId }); this.startPolling() } catch (error) { this.setData({ error: formatError(error) }) } finally { (this as any).resuming = false }
    },
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
      if (!jobId) return
      try {
        const data = await requestJson<{ job?: unknown }>({ action: 'getJob', jobId })
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
        this.setData({
          error: formatError(error),
          isLoading: false,
        })
      }
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
