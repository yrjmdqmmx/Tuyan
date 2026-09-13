interface Ratio { value: string; label: string; disabled?: boolean }
const COMMON = ['auto', '1:1', '3:2', '2:3', '4:3', '3:4', '16:9', '9:16']
Component({
  properties: {
    options: { type: Array, value: [] as Ratio[] },
    value: { type: String, value: 'auto' },
    disabled: { type: Boolean, value: false },
  },
  data: { expanded: false, visibleOptions: [] as any[], total: 0, hasMore: false },
  observers: { 'options, value, expanded'() { this.present() } },
  methods: {
    present() {
      const options = (this.properties.options as Ratio[]).filter(item => !item.disabled)
      const common = options.filter(item => COMMON.includes(item.value) || item.value === this.properties.value)
      const visible = this.data.expanded ? options : common.length ? common : options.slice(0, 8)
      this.setData({ total: options.length, hasMore: options.length > (common.length || Math.min(8, options.length)), visibleOptions: visible.map(item => {
        const [w, h] = item.value.split(':').map(Number), ratio = w > 0 && h > 0 ? w / h : 1
        return { ...item, auto: item.value === 'auto', width: ratio >= 1 ? 32 : Math.max(3, 32 * ratio), height: ratio >= 1 ? Math.max(3, 32 / ratio) : 32 }
      }) })
    },
    toggle() { this.setData({ expanded: !this.data.expanded }) },
    select(event: WechatMiniprogram.TouchEvent) {
      const value = String(event.currentTarget.dataset.value)
      if (!this.properties.disabled && (this.properties.options as Ratio[]).some(item => item.value === value && !item.disabled)) this.triggerEvent('change', { value })
    },
  },
})
