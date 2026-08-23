import { formatError, requestJson } from '../../utils/api'
import { MANUAL_REFERENCE_LIMIT } from '../../utils/constants'
import { buildReferenceLibraryRequest, normalizeReferenceLibraryPage, type ReferenceLibraryItem } from '../../utils/reference-library'

interface LibraryCard extends ReferenceLibraryItem { selected: boolean }

Component({
  options: { styleIsolation: 'apply-shared' },
  properties: {
    taskName: { type: String, value: 'diagram', observer(this: any) { this.resetAndLoad() } },
    selectedIds: { type: Array, value: [] as string[], observer(this: any) { this.refreshCards() } },
  },
  data: {
    cards: [] as LibraryCard[], isLoading: false, error: '', query: '', visualCategory: '', researchDomain: '',
    visualOptions: [{ value: '', label: '全部视觉类别' }], domainOptions: [{ value: '', label: '全部研究领域' }],
    visualIndex: 0, domainIndex: 0, page: 1, totalPages: 1, totalItems: 0,
    selectedCount: 0, limit: MANUAL_REFERENCE_LIMIT, detail: null as ReferenceLibraryItem | null,
  },
  lifetimes: { attached() { this.loadLibrary() } },
  methods: {
    noop() {},
    resetAndLoad() { this.setData({ page: 1 }); this.loadLibrary() },
    async loadLibrary() {
      const seq = (((this as any).loadSeq as number) || 0) + 1
      ;(this as any).loadSeq = seq
      this.setData({ isLoading: true, error: '' })
      try {
        const response = await requestJson<unknown>(buildReferenceLibraryRequest({ query: this.data.query, visualCategory: this.data.visualCategory, researchDomain: this.data.researchDomain, taskName: this.properties.taskName, page: this.data.page }), { auth: false })
        if (seq !== (this as any).loadSeq) return
        const page = normalizeReferenceLibraryPage(response)
        ;(this as any).references = page.references
        this.setData({
          page: page.page, totalPages: page.totalPages, totalItems: page.totalItems,
          visualOptions: [{ value: '', label: '全部视觉类别' }, ...page.facets.visualCategories.map((item) => ({ value: item.value, label: `${item.value} (${item.count})` }))],
          domainOptions: [{ value: '', label: '全部研究领域' }, ...page.facets.researchDomains.map((item) => ({ value: item.value, label: `${item.value} (${item.count})` }))],
          isLoading: false,
        })
        this.refreshCards()
      } catch (error) {
        if (seq !== (this as any).loadSeq) return
        this.setData({ error: formatError(error), isLoading: false })
      }
    },
    refreshCards() {
      const references = ((this as any).references || []) as ReferenceLibraryItem[]
      const selectedIds = this.properties.selectedIds as string[]
      this.setData({ cards: references.map((item) => ({ ...item, selected: selectedIds.includes(item.id) })), selectedCount: selectedIds.length })
    },
    onQueryInput(event: WechatMiniprogram.Input) { this.setData({ query: event.detail.value }) },
    onSearch() { this.setData({ page: 1 }); this.loadLibrary() },
    onVisualChange(event: WechatMiniprogram.PickerChange) { const visualIndex = Number(event.detail.value) || 0; this.setData({ visualIndex, visualCategory: this.data.visualOptions[visualIndex]?.value || '', page: 1 }); this.loadLibrary() },
    onDomainChange(event: WechatMiniprogram.PickerChange) { const domainIndex = Number(event.detail.value) || 0; this.setData({ domainIndex, researchDomain: this.data.domainOptions[domainIndex]?.value || '', page: 1 }); this.loadLibrary() },
    previousPage() { if (this.data.page > 1) { this.setData({ page: this.data.page - 1 }); this.loadLibrary() } },
    nextPage() { if (this.data.page < this.data.totalPages) { this.setData({ page: this.data.page + 1 }); this.loadLibrary() } },
    onToggle(event: WechatMiniprogram.TouchEvent) { const id = String(event.currentTarget.dataset.id || ''); if (id) this.triggerEvent('toggle', { id }) },
    openDetail(event: WechatMiniprogram.TouchEvent) { const id = String(event.currentTarget.dataset.id || ''); this.setData({ detail: (this.data.cards as LibraryCard[]).find((item) => item.id === id) || null }) },
    closeDetail() { this.setData({ detail: null }) },
    previewDetail() { if (this.data.detail?.imageUrl) wx.previewImage({ current: this.data.detail.imageUrl, urls: [this.data.detail.imageUrl] }) },
    onRefresh() { this.loadLibrary() },
  },
})
