"use strict";
Component({
    options: { styleIsolation: 'apply-shared' },
    properties: {
        templates: { type: Array, value: [] },
        loading: { type: Boolean, value: false },
    },
    methods: {
        applyTemplate(event) {
            const id = String(event.currentTarget.dataset.id || '');
            if (id)
                this.triggerEvent('apply', { id });
        },
    },
});
