"use strict";
Component({
    options: { styleIsolation: 'apply-shared' },
    properties: {
        templates: { type: Array, value: [], observer() { this.updateAutoplay(); } },
        loading: { type: Boolean, value: false },
        paused: { type: Boolean, value: false, observer() { this.updateAutoplay(); } },
    },
    data: { current: 0, autoplay: false, touching: false },
    lifetimes: {
        attached() { this.pageVisible = true; this.updateAutoplay(); },
        detached() { this.pageVisible = false; this.setData({ autoplay: false }); },
    },
    pageLifetimes: {
        show() { this.pageVisible = true; this.updateAutoplay(); },
        hide() { this.pageVisible = false; this.setData({ touching: false }); this.updateAutoplay(); },
    },
    methods: {
        // Native swiper owns the interval and cancels it whenever autoplay is false.
        // No page-level timer can accumulate across show/hide or modal cycles.
        updateAutoplay() {
            const count = this.properties.templates.length;
            this.setData({ current: Math.min(this.data.current, Math.max(0, count - 1)), autoplay: Boolean(this.pageVisible && !this.properties.paused && !this.data.touching && count > 1) });
        },
        touchStart() { this.setData({ touching: true }); this.updateAutoplay(); },
        touchEnd() { this.setData({ touching: false }); this.updateAutoplay(); },
        onChange(event) { this.setData({ current: event.detail.current }); },
        applyTemplate(event) {
            const id = String(event.currentTarget.dataset.id || '');
            if (id)
                this.triggerEvent('apply', { id });
        },
    },
});
