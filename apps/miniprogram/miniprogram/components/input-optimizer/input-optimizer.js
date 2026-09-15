"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tokendance_1 = require("../../utils/tokendance");
const session_1 = require("../../utils/session");
const api_1 = require("../../utils/api");
const api_keys_1 = require("../../utils/api-keys");
const model_registry_store_1 = require("../../utils/model-registry-store");
const input_optimization_1 = require("../../utils/input-optimization");
Component({
    options: { styleIsolation: 'apply-shared' },
    properties: {
        target: { type: String, value: 'methodContent' },
        inputs: { type: Object, value: {} },
        mainRoute: { type: Object, value: {} },
        providerRegions: { type: Object, value: {} },
        disabled: { type: Boolean, value: false },
    },
    data: { supported: false, open: false, busy: false, original: '', candidate: '', error: '', hasUndo: false, label: '' },
    lifetimes: {
        attached() {
            var _a;
            let owner = ((_a = (0, session_1.getCurrentUser)()) === null || _a === void 0 ? void 0 : _a.id) || '';
            this.unsubscribeSession = (0, session_1.subscribeSession)(user => {
                if (owner !== ((user === null || user === void 0 ? void 0 : user.id) || '')) {
                    this.cancel();
                    this.undo = undefined;
                    this.setData({ hasUndo: false });
                    owner = (user === null || user === void 0 ? void 0 : user.id) || '';
                }
            });
            this.unsubscribe = (0, model_registry_store_1.subscribeModelRegistry)(state => this.setData({ supported: (0, input_optimization_1.supportsOptimization)(state.registry, this.properties.target) }));
            this.setData({ supported: (0, input_optimization_1.supportsOptimization)((0, model_registry_store_1.getModelRegistryState)().registry, this.properties.target) });
        },
        detached() { var _a, _b, _c, _d; this.cancel(); (_b = (_a = this).unsubscribe) === null || _b === void 0 ? void 0 : _b.call(_a); (_d = (_c = this).unsubscribeSession) === null || _d === void 0 ? void 0 : _d.call(_c); this.undo = undefined; },
    },
    pageLifetimes: { hide() { this.cancel(); } },
    methods: {
        noop() { },
        async optimize() {
            if (this.properties.disabled || this.requestInFlight)
                return;
            const target = this.properties.target;
            let payload;
            try {
                payload = (0, input_optimization_1.buildOptimizationRequest)({ target, inputs: this.properties.inputs, mainRoute: this.properties.mainRoute, providerRegions: this.properties.providerRegions == null ? undefined : this.properties.providerRegions, apiKeys: (0, api_keys_1.getApiKeys)(), tokenDanceConnected: (0, tokendance_1.hasTokenDanceConnection)(), registry: (0, model_registry_store_1.getModelRegistryState)().registry });
            }
            catch (error) {
                this.setData({ error: (0, api_1.formatError)(error) });
                if (/连接观猹 TokenDance/.test((0, api_1.formatError)(error)))
                    (0, tokendance_1.openTokenDance)();
                else if (/主模型|密钥/.test((0, api_1.formatError)(error)))
                    this.triggerEvent('settings');
                return;
            }
            const sequence = Number(this.sequence || 0) + 1;
            this.sequence = sequence;
            this.requestInFlight = true;
            const original = String(this.properties.inputs[target] || '');
            this.setData({ open: true, busy: true, original, candidate: '', error: '', label: input_optimization_1.OPTIMIZATION_LABELS[target] });
            this.triggerEvent('visibility', { open: true });
            this.triggerEvent('busy', { busy: true });
            try {
                const result = await (0, api_1.requestJson)(payload, { timeout: 55000 });
                if (sequence !== this.sequence)
                    return;
                this.setData({ candidate: (0, input_optimization_1.validateOptimizationResult)(target, original, result) });
            }
            catch (error) {
                if (sequence === this.sequence)
                    this.setData({ error: (0, api_1.formatError)(error) });
            }
            finally {
                ;
                this.requestInFlight = false;
                if (sequence === this.sequence) {
                    this.setData({ busy: false });
                    this.triggerEvent('busy', { busy: false });
                }
            }
        },
        cancel() {
            ;
            this.sequence = Number(this.sequence || 0) + 1;
            this.setData({ open: false, busy: false, candidate: '', original: '', error: '' });
            this.triggerEvent('visibility', { open: false });
            this.triggerEvent('busy', { busy: false });
        },
        apply() {
            if (this.data.busy || !this.data.candidate)
                return;
            const target = this.properties.target;
            if (String(this.properties.inputs[target] || '') !== this.data.original) {
                this.setData({ error: '原文已修改，请取消后重新优化。' });
                return;
            }
            ;
            this.undo = { original: this.data.original, applied: this.data.candidate };
            this.triggerEvent('apply', { target, value: this.data.candidate });
            this.cancel();
            this.setData({ hasUndo: true });
        },
        restore() {
            const undo = this.undo;
            if (!undo || this.data.busy || this.properties.disabled)
                return;
            const target = this.properties.target;
            if (String(this.properties.inputs[target] || '') !== undo.applied) {
                this.setData({ error: '内容已修改，已保留当前文本。' });
                return;
            }
            this.triggerEvent('apply', { target, value: undo.original });
            this.undo = undefined;
            this.setData({ hasUndo: false, error: '' });
        },
    },
});
