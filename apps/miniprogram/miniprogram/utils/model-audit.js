"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditedModelSpecs = auditedModelSpecs;
exports.removedModel = removedModel;
exports.removedModelHint = removedModelHint;
exports.auditedModelLifecycle = auditedModelLifecycle;
exports.assertAuditedModelAvailable = assertAuditedModelAvailable;
exports.withModelAudit = withModelAudit;
exports.assertModelLibraryAdditions = assertModelLibraryAdditions;
// Generated from packages/api/src/model-audit.ts
const MODEL_AUDIT_DATA = require('./model-audit-data.js');
function auditedModelSpecs(channel, id) {
    var _a;
    const row = MODEL_AUDIT_DATA.rows[channel + '/' + id];
    const result = {};
    MODEL_AUDIT_DATA.fields.forEach((field, index) => {
        const fact = row ? MODEL_AUDIT_DATA.facts[row[index]] : [null, 'unknown', null, null];
        result[field] = { value: fact[0], state: fact[1], provenance: fact[2], sourceUrl: fact[3] === null ? null : MODEL_AUDIT_DATA.sources[fact[3]], verifiedAt: row ? MODEL_AUDIT_DATA.verifiedAt : null };
    });
    const details = (_a = MODEL_AUDIT_DATA.details) === null || _a === void 0 ? void 0 : _a[channel + '/' + id];
    if (details === null || details === void 0 ? void 0 : details.unknownInputModalities)
        result.inputModalities.unknownModalities = details.unknownInputModalities;
    return { fields: result, unverified: !row || row[4] === 1, verifiedAt: row ? MODEL_AUDIT_DATA.verifiedAt : null, sourceUrl: row && row[5] !== null ? MODEL_AUDIT_DATA.sources[row[5]] : null, sourceUrls: (details === null || details === void 0 ? void 0 : details.sourceUrls) || [], note: (details === null || details === void 0 ? void 0 : details.note) || '' };
}
// Tombstones preserve exact identities for messages and explicit replacement choices, never catalog entries.
function removedModel(channel, id, now = Date.now()) {
    var _a;
    const key = channel + '/' + String(id).trim();
    const removed = (_a = MODEL_AUDIT_DATA.removed) === null || _a === void 0 ? void 0 : _a[key];
    if (removed)
        return removed;
    const notice = MODEL_AUDIT_DATA.notices[key];
    return notice && now >= Date.parse(notice.stopDate)
        ? { stopDate: notice.stopDate, replacementApiId: notice.replacement, sourceUrl: notice.sourceUrl } : null;
}
function removedModelHint(channel, id, now = Date.now()) {
    const removed = removedModel(channel, id, now);
    return removed ? `原型号 ${id} 已不可用${removed.replacementApiId ? `，可改选 ${removed.replacementApiId}` : '，请重新选择'}` : '';
}
// Date-only notices take effect at the start of the stated UTC calendar day.
// Serverless notices apply only to the Fireworks adapter used by this product.
function auditedModelLifecycle(channel, id, now = Date.now()) {
    const notice = MODEL_AUDIT_DATA.notices[channel + '/' + String(id).trim()];
    if (!notice || notice.scope === 'serverless' && channel !== 'fireworks')
        return null;
    const elapsed = now >= Date.parse(notice.stopDate);
    if (elapsed)
        return null;
    const replacement = notice.replacement || null;
    const stopLabel = notice.stopDate.includes('T') ? notice.stopDate.replace('T', ' ').replace(':00+08:00', ' (UTC+8)') : notice.stopDate;
    return { ...notice, replacement, state: 'scheduled', label: '将下线', blocked: false, message: `将于${stopLabel}下线${replacement ? `；可改选 ${replacement}` : ''}` };
}
function assertAuditedModelAvailable(channel, id, now = Date.now()) {
    const removed = removedModel(channel, id, now);
    if (removed)
        throw Object.assign(new Error(`模型 ${id}：${removedModelHint(channel, id, now)}。`), {
            businessCode: 'MODEL_UNAVAILABLE', code: 'MODEL_UNAVAILABLE',
            statusCode: 400, replacement: removed.replacementApiId, sourceUrl: removed.sourceUrl,
            requestState: 'not_sent', localInputFailure: true, retryable: false,
        });
}
function withModelAudit(channel, model, now = Date.now()) {
    const lifecycle = auditedModelLifecycle(channel, model.id, now);
    return { ...model, auditChannel: channel, auditSpecifications: auditedModelSpecs(channel, model.id), auditLifecycle: lifecycle,
        ...(removedModel(channel, model.id, now) ? { selectable: false, disabledReason: removedModelHint(channel, model.id, now) } : {}) };
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
