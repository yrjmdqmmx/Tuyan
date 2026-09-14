Component({
  options: { styleIsolation: 'apply-shared' },
  properties: {
    templates: { type: Array, value: [], observer(this: any) { this.updateAutoplay() } },
    loading: { type: Boolean, value: false },
    paused: { type: Boolean, value: false, observer(this: any) { this.updateAutoplay() } },
  },
  data: { current: 0, autoplay: false, touching: false },
  lifetimes: {
    attached() { (this as any).pageVisible = true; this.updateAutoplay() },
    detached() { (this as any).pageVisible = false; this.setData({autoplay: false}) },
  },
  pageLifetimes: {
    show() { (this as any).pageVisible = true; this.updateAutoplay() },
    hide() { (this as any).pageVisible = false; this.setData({touching: false}); this.updateAutoplay() },
  },
  methods: {
    // Native swiper owns the interval and cancels it whenever autoplay is false.
    // No page-level timer can accumulate across show/hide or modal cycles.
    updateAutoplay() {
      const count = this.properties.templates.length
      this.setData({ current: Math.min(this.data.current, Math.max(0, count - 1)), autoplay: Boolean((this as any).pageVisible && !this.properties.paused && !this.data.touching && count > 1) })
    },
    touchStart() { this.setData({touching: true}); this.updateAutoplay() },
    touchEnd() { this.setData({touching: false}); this.updateAutoplay() },
    onChange(event: WechatMiniprogram.CustomEvent<{current:number}>) { this.setData({current: event.detail.current}) },
    applyTemplate(event: WechatMiniprogram.TouchEvent) {
      const id = String(event.currentTarget.dataset.id || '')
      if (id) this.triggerEvent('apply', { id })
    },
  },
})
