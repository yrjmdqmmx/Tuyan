"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = require("../../utils/api");
const constants_1 = require("../../utils/constants");
const reference_library_1 = require("../../utils/reference-library");
Component({
    options: { styleIsolation: 'apply-shared' },
    properties: {
        taskName: { type: String, value: 'diagram', observer() { this.resetAndLoad(); } },
        selectedIds: { type: Array, value: [], observer() { this.refreshCards(); } },
    },
    data: {
        cards: [], isLoading: false, error: '', query: '', visualCategory: '', researchDomain: '',
        visualOptions: [{ value: '', label: '全部视觉类别' }], domainOptions: [{ value: '', label: '全部研究领域' }],
        visualIndex: 0, domainIndex: 0, page: 1, totalPages: 1, totalItems: 0,
        selectedCount: 0, limit: constants_1.MANUAL_REFERENCE_LIMIT, detail: null,
    },
    lifetimes: { attached() { this.loadLibrary(); } },
    methods: {
        noop() { },
        resetAndLoad() { this.setData({ page: 1 }); this.loadLibrary(); },
        async loadLibrary() {
            const seq = (this.loadSeq || 0) + 1;
            this.loadSeq = seq;
            this.setData({ isLoading: true, error: '' });
            try {
                const response = await (0, api_1.requestJson)((0, reference_library_1.buildReferenceLibraryRequest)({ query: this.data.query, visualCategory: this.data.visualCategory, researchDomain: this.data.researchDomain, taskName: this.properties.taskName, page: this.data.page }), { auth: false });
                if (seq !== this.loadSeq)
                    return;
                const page = (0, reference_library_1.normalizeReferenceLibraryPage)(response);
                this.references = page.references;
                this.setData({
                    page: page.page, totalPages: page.totalPages, totalItems: page.totalItems,
                    visualOptions: [{ value: '', label: '全部视觉类别' }, ...page.facets.visualCategories.map((item) => ({ value: item.value, label: `${item.value} (${item.count})` }))],
                    domainOptions: [{ value: '', label: '全部研究领域' }, ...page.facets.researchDomains.map((item) => ({ value: item.value, label: `${item.value} (${item.count})` }))],
                    isLoading: false,
                });
                this.refreshCards();
            }
            catch (error) {
                if (seq !== this.loadSeq)
                    return;
                this.setData({ error: (0, api_1.formatError)(error), isLoading: false });
            }
        },
        refreshCards() {
            const references = (this.references || []);
            const selectedIds = this.properties.selectedIds;
            this.setData({ cards: references.map((item) => ({ ...item, selected: selectedIds.includes(item.id) })), selectedCount: selectedIds.length });
        },
        onQueryInput(event) { this.setData({ query: event.detail.value }); },
        onSearch() { this.setData({ page: 1 }); this.loadLibrary(); },
        onVisualChange(event) { var _a; const visualIndex = Number(event.detail.value) || 0; this.setData({ visualIndex, visualCategory: ((_a = this.data.visualOptions[visualIndex]) === null || _a === void 0 ? void 0 : _a.value) || '', page: 1 }); this.loadLibrary(); },
        onDomainChange(event) { var _a; const domainIndex = Number(event.detail.value) || 0; this.setData({ domainIndex, researchDomain: ((_a = this.data.domainOptions[domainIndex]) === null || _a === void 0 ? void 0 : _a.value) || '', page: 1 }); this.loadLibrary(); },
        previousPage() { if (this.data.page > 1) {
            this.setData({ page: this.data.page - 1 });
            this.loadLibrary();
        } },
        nextPage() { if (this.data.page < this.data.totalPages) {
            this.setData({ page: this.data.page + 1 });
            this.loadLibrary();
        } },
        onToggle(event) { const id = String(event.currentTarget.dataset.id || ''); if (id)
            this.triggerEvent('toggle', { id }); },
        openDetail(event) { const id = String(event.currentTarget.dataset.id || ''); this.setData({ detail: this.data.cards.find((item) => item.id === id) || null }); },
        closeDetail() { this.setData({ detail: null }); },
        previewDetail() { var _a; if ((_a = this.data.detail) === null || _a === void 0 ? void 0 : _a.imageUrl)
            wx.previewImage({ current: this.data.detail.imageUrl, urls: [this.data.detail.imageUrl] }); },
        onRefresh() { this.loadLibrary(); },
    },
});
