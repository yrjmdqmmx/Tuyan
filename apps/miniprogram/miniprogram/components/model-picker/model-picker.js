"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const model_registry_1 = require("../../utils/model-registry");
const PROVIDER_LABELS = {
    gemini: 'Google Gemini API', openai: 'OpenAI', bailian: '阿里百炼', ark: '火山方舟', openrouter: 'OpenRouter',
};
Component({
    options: { styleIsolation: 'apply-shared' },
    properties: {
        show: { type: Boolean, value: false, observer() { this.refresh(); } },
        registry: { type: Object, value: {}, observer() { this.refresh(); } },
        role: { type: String, value: 'main', observer() { this.refresh(); } },
        outputFormat: { type: String, value: 'png', observer() { this.refresh(); } },
        selectedProvider: { type: String, value: '' },
        selectedModel: { type: String, value: '' },
    },
    data: {
        query: '',
        channels: [],
        roleLabel: '主模型',
    },
    methods: {
        noop() { },
        refresh() {
            const registry = this.properties.registry;
            const role = normalizeRole(this.properties.role);
            const query = this.data.query;
            if (!registry || !registry.providers) {
                this.setData({ channels: [], roleLabel: roleLabel(role) });
                return;
            }
            const channels = model_registry_1.MODEL_PROVIDER_IDS.map((providerId) => {
                const partition = (0, model_registry_1.partitionRegistryModels)(registry.providers[providerId].models, {
                    role, query, outputFormat: String(this.properties.outputFormat || ''),
                });
                return {
                    id: providerId,
                    label: PROVIDER_LABELS[providerId],
                    compatible: (0, model_registry_1.groupRegistryModels)(partition.compatible),
                    incompatible: (0, model_registry_1.groupRegistryModels)(partition.incompatible),
                };
            }).filter((channel) => channel.compatible.length || channel.incompatible.length);
            this.setData({ channels, roleLabel: roleLabel(role) });
        },
        onSearch(event) {
            this.setData({ query: event.detail.value });
            this.refresh();
        },
        choose(event) {
            if (event.currentTarget.dataset.disabled)
                return;
            this.triggerEvent('select', {
                provider: String(event.currentTarget.dataset.provider || ''),
                modelId: String(event.currentTarget.dataset.model || ''),
            });
        },
        close() { this.triggerEvent('close'); },
    },
});
function normalizeRole(value) {
    return value === 'image' || value === 'vision' ? value : 'main';
}
function roleLabel(role) {
    return role === 'image' ? '图像生成模型' : role === 'vision' ? '参考图识别模型' : '主模型';
}
