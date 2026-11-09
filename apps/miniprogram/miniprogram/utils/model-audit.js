"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditedModelSpecs = auditedModelSpecs;
exports.auditedModelLifecycle = auditedModelLifecycle;
exports.assertAuditedModelAvailable = assertAuditedModelAvailable;
exports.withModelAudit = withModelAudit;
exports.assertModelLibraryAdditions = assertModelLibraryAdditions;
// Generated from packages/api/src/model-audit.ts
const MODEL_AUDIT_DATA = require('./model-audit-data.js');
function auditedModelSpecs(channel, id) {
    const row = MODEL_AUDIT_DATA.rows[channel + '/' + id];
    const result = {};
    MODEL_AUDIT_DATA.fields.forEach((field, index) => {
        const fact = row ? MODEL_AUDIT_DATA.facts[row[index]] : [null, 'unknown', null, null];
        result[field] = { value: fact[0], state: fact[1], provenance: fact[2], sourceUrl: fact[3] === null ? null : MODEL_AUDIT_DATA.sources[fact[3]], verifiedAt: row ? MODEL_AUDIT_DATA.verifiedAt : null };
    });
    return { fields: result, unverified: !row || row[4] === 1, verifiedAt: row ? MODEL_AUDIT_DATA.verifiedAt : null, sourceUrl: row && row[5] !== null ? MODEL_AUDIT_DATA.sources[row[5]] : null };
}
// Date-only notices take effect at the start of the stated UTC calendar day.
// Serverless notices apply only to the Fireworks adapter used by this product.
function auditedModelLifecycle(channel, id, now = Date.now()) {
    var _a;
    const notice = MODEL_AUDIT_DATA.notices[channel + '/' + String(id).trim()];
    if (!notice || notice.scope === 'serverless' && channel !== 'fireworks')
        return null;
    const elapsed = now >= Date.parse(notice.stopDate);
    const state = !elapsed ? 'scheduled' : notice.scope === 'full' ? 'retired' : 'channel-unavailable';
    const label = state === 'retired' ? '已下架' : state === 'channel-unavailable' ? '渠道不可用' : '将下线';
    // Some audit entries contain a family suggestion, not an exact replacement ID.
    const replacement = notice.replacement === 'Dep' ? null : ((_a = notice.replacement) === null || _a === void 0 ? void 0 : _a.replace(/^Dep -> /, '')) || null;
    return { ...notice, replacement, state, label, blocked: elapsed, message: `${state === 'scheduled' ? `将于${notice.stopDate.slice(0, 10)}下线` : label}${replacement ? `；建议替换为 ${replacement}` : ''}` };
}
function assertAuditedModelAvailable(channel, id, now = Date.now()) {
    const lifecycle = auditedModelLifecycle(channel, id, now);
    if (lifecycle === null || lifecycle === void 0 ? void 0 : lifecycle.blocked)
        throw Object.assign(new Error(`模型 ${id} ${lifecycle.message}。原配置已保留，请确认后切换。`), {
            businessCode: lifecycle.state === 'retired' ? 'MODEL_RETIRED' : 'MODEL_CHANNEL_UNAVAILABLE',
            code: lifecycle.state === 'retired' ? 'MODEL_RETIRED' : 'MODEL_CHANNEL_UNAVAILABLE',
            statusCode: 400, replacement: lifecycle.replacement, sourceUrl: lifecycle.sourceUrl,
            requestState: 'not_sent', localInputFailure: true, retryable: false,
        });
}
function withModelAudit(channel, model, now = Date.now()) {
    const lifecycle = auditedModelLifecycle(channel, model.id, now);
    return { ...model, auditChannel: channel, auditSpecifications: auditedModelSpecs(channel, model.id), auditLifecycle: lifecycle,
        ...((lifecycle === null || lifecycle === void 0 ? void 0 : lifecycle.blocked) ? { selectable: false, disabledReason: lifecycle.message } : {}) };
}
function assertModelLibraryAdditions(next, previous, now = Date.now()) {
    var _a, _b, _c;
    for (const model of next.models || []) {
        const channel = (_b = (_a = next.connections) === null || _a === void 0 ? void 0 : _a.find((item) => item.id === model.connectionId)) === null || _b === void 0 ? void 0 : _b.provider;
        const retained = (_c = previous === null || previous === void 0 ? void 0 : previous.models) === null || _c === void 0 ? void 0 : _c.some((old) => {
            var _a, _b;
            return old.id === model.id && old.connectionId === model.connectionId && old.modelId === model.modelId
                && ((_b = (_a = previous.connections) === null || _a === void 0 ? void 0 : _a.find((item) => item.id === old.connectionId)) === null || _b === void 0 ? void 0 : _b.provider) === channel;
        });
        if (!retained)
            assertAuditedModelAvailable(channel, model.modelId, now);
    }
}
