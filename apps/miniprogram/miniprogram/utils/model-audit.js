"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditedModelSpecs = auditedModelSpecs;
exports.removedModel = removedModel;
exports.modelDisplayName = modelDisplayName;
exports.removedModelHint = removedModelHint;
exports.auditedModelLifecycle = auditedModelLifecycle;
exports.withModelAudit = withModelAudit;
// Generated card helpers from packages/api/src/model-audit.ts
const static_model_catalog_1 = require("./static-model-catalog");
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
    result.totalContextTokens.suffix = details === null || details === void 0 ? void 0 : details.suffix;
    if (details === null || details === void 0 ? void 0 : details.unknownInputModalities)
        result.inputModalities.unknownModalities = details.unknownInputModalities;
    for (const [field, values] of Object.entries((details === null || details === void 0 ? void 0 : details.modalityMasks) || {}))
        result[field].modalityMasks = values;
    for (const [field, values] of Object.entries((details === null || details === void 0 ? void 0 : details.unsupportedModalities) || {}))
        result[field].unsupportedModalities = values;
    for (const field of (details === null || details === void 0 ? void 0 : details.suppressFallback) || [])
        result[field].suppressFallback = true;
    return { fields: result, unverified: !row || row[4] === 1, verifiedAt: row ? MODEL_AUDIT_DATA.verifiedAt : null, sourceUrl: row && row[5] !== null ? MODEL_AUDIT_DATA.sources[row[5]] : null, sourceUrls: (details === null || details === void 0 ? void 0 : details.sourceUrls) || [], sourceLabel: (row === null || row === void 0 ? void 0 : row[6]) || '官方文档', note: (details === null || details === void 0 ? void 0 : details.note) || '' };
}
function removedModel(channel, id, now = Date.now()) {
    var _a;
    const key = channel + '/' + String(id).trim();
    const removed = (_a = MODEL_AUDIT_DATA.removed) === null || _a === void 0 ? void 0 : _a[key];
    if (removed)
        return removed;
    const notice = MODEL_AUDIT_DATA.notices[key];
    return notice && now >= Date.parse(notice.stopDate)
        ? { ...notice, replacementApiId: notice.replacement } : null;
}
function modelDisplayName(channel, id) {
    var _a, _b, _c;
    return ((_a = removedModel(channel, id)) === null || _a === void 0 ? void 0 : _a.displayName)
        || ((_c = (_b = static_model_catalog_1.STATIC_MODEL_REGISTRY[channel]) === null || _b === void 0 ? void 0 : _b.models.find((model) => model.id === id)) === null || _c === void 0 ? void 0 : _c.label)
        || id.replace(/^accounts\/[^/]+\/models\//, '');
}
function removedModelHint(channel, id, now = Date.now()) {
    const removed = removedModel(channel, id, now);
    return removed ? `${removed.displayName}：原型号已不可用，请重新选择。${removed.replacementApiId ? `推荐：${removed.replacementDisplayName}` : ''}` : '';
}
function auditedModelLifecycle(channel, id, now = Date.now()) {
    const notice = MODEL_AUDIT_DATA.notices[channel + '/' + String(id).trim()];
    if (!notice || notice.scope === 'serverless' && channel !== 'fireworks')
        return null;
    const elapsed = now >= Date.parse(notice.stopDate);
    if (elapsed)
        return null;
    const replacement = notice.replacement || null;
    const stopLabel = notice.stopDate.includes('T') ? notice.stopDate.replace('T', ' ').replace(':00+08:00', ' (UTC+8)') : notice.stopDate;
    return { ...notice, replacement, state: 'scheduled', label: '将下线', blocked: false, message: `将于${stopLabel}下线${replacement ? `；可改选 ${notice.replacementDisplayName}` : ''}` };
}
function withModelAudit(channel, model, now = Date.now()) {
    const lifecycle = auditedModelLifecycle(channel, model.id, now);
    return { ...model, auditChannel: channel, auditSpecifications: auditedModelSpecs(channel, model.id), auditLifecycle: lifecycle,
        ...(removedModel(channel, model.id, now) ? { selectable: false, disabledReason: removedModelHint(channel, model.id, now) } : {}) };
}
