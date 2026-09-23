"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MODEL_CHANNEL_LABELS = exports.MODEL_PRESENTATION = void 0;
exports.orderModelChannels = orderModelChannels;
exports.normalizeModelVersion = normalizeModelVersion;
exports.modelVersionLabel = modelVersionLabel;
exports.modelVersionDetail = modelVersionDetail;
exports.openRouterModelVersion = openRouterModelVersion;
exports.modelLifecycleLabel = modelLifecycleLabel;
exports.modelDeveloperName = modelDeveloperName;
exports.modelDeveloperAliases = modelDeveloperAliases;
exports.modelDeveloper = modelDeveloper;
exports.presentRegistryModel = presentRegistryModel;
exports.validModelReleaseDate = validModelReleaseDate;
exports.sortModelsNewestFirst = sortModelsNewestFirst;
// Generated from packages/types/src/model-presentation.ts and config/model-presentation.json
exports.MODEL_PRESENTATION = require('./model-presentation-data.js');
const presentationAliases = new Map();
for (const [id, vendor] of Object.entries(exports.MODEL_PRESENTATION.vendors)) {
    for (const alias of [id, vendor.label, vendor.labelEn || vendor.label, vendor.labelZh || vendor.label, ...vendor.aliases])
        presentationAliases.set(alias.toLowerCase(), id);
}
const presentationRoutes = exports.MODEL_PRESENTATION.routes.map((rule) => ({ ...rule, regex: new RegExp(rule.pattern, 'i') }));
const presentationFamilies = exports.MODEL_PRESENTATION.families.map((rule) => ({ ...rule, patterns: rule.newestFirst.map((pattern) => new RegExp('(?:' + pattern + ')(?![.p]\\d)', 'i')) }));
const presentationReleases = exports.MODEL_PRESENTATION.releases.map((rule) => ({ ...rule, regex: new RegExp(rule.pattern, 'i') }));
exports.MODEL_CHANNEL_LABELS = exports.MODEL_PRESENTATION.channels;
// Display order only: never use this list to pick a default or replace a route.
function orderModelChannels(channels) {
    // Classify the API service operator, not the developer of a hosted model.
    // TokenDance was already first; retain the previous relative order per group.
    const previous = [...channels.filter(id => id === 'tokendance'), ...channels.filter(id => id !== 'tokendance')];
    return previous.sort((a, b) => modelChannelCategoryOrder(a) - modelChannelCategoryOrder(b));
}
function modelChannelCategoryOrder(channel) {
    const groups = [
        ['tokendance', 'siliconflow', 'tokenhub'],
        ['bailian', 'ark', 'deepseek', 'kimi', 'zhipu', 'minimax', 'xiaomi', 'sensenova', 'stepfun', 'qianfan', 'iflytek', 'longcat'],
        ['gemini', 'openai', 'anthropic', 'recraft', 'xai', 'bfl', 'stability', 'ideogram', 'mistral'],
        ['openrouter', 'together', 'fireworks', 'fal', 'replicate', 'runware'],
    ];
    const index = groups.findIndex(group => group.includes(channel));
    return index < 0 ? groups.length : index;
}
function normalizeModelVersion(value) {
    if (!value || typeof value !== 'object')
        return undefined;
    const v = value;
    if (!['fixed', 'rolling', 'unconfirmed'].includes(String(v.kind)))
        return undefined;
    return { kind: v.kind, id: typeof v.id === 'string' ? v.id : '',
        checkedAt: typeof v.checkedAt === 'string' ? v.checkedAt : '',
        sourceUrl: typeof v.sourceUrl === 'string' && /^https:\/\//.test(v.sourceUrl) ? v.sourceUrl : '' };
}
function modelVersionLabel(model) {
    const version = normalizeModelVersion(model.version);
    return (version === null || version === void 0 ? void 0 : version.kind) === 'fixed' ? '固定版本' : (version === null || version === void 0 ? void 0 : version.kind) === 'rolling' ? '滚动别名' : '版本待确认';
}
function modelVersionDetail(model) {
    const version = normalizeModelVersion(model.version);
    const current = (version === null || version === void 0 ? void 0 : version.id) ? (version.kind === 'unconfirmed' ? '目录版本：' : '已核对版本：') + version.id : '具体版本待确认';
    return [modelVersionLabel(model), current, (version === null || version === void 0 ? void 0 : version.checkedAt) ? '核对于 ' + version.checkedAt : ''].filter(Boolean).join(' · ');
}
// Public catalog identity is not an immutable-weights guarantee. Never copy the
// direct provider's alias mapping into an aggregator or cache a guessed target.
function openRouterModelVersion(id, canonicalSlug, checkedAt, image = false) {
    return { kind: id.startsWith('~') ? 'rolling' : 'unconfirmed',
        id: id.startsWith('~') ? '' : canonicalSlug, checkedAt,
        sourceUrl: 'https://openrouter.ai/api/v1/' + (image ? 'images/' : '') + 'models' };
}
function modelLifecycleLabel(lifecycle) {
    return { stable: '稳定版', preview: '预览版', 'invite-only': '邀测', legacy: '旧版维护', deprecated: '即将下线' }[lifecycle] || '状态未知';
}
function modelDeveloperName(id, locale = 'zh-CN') {
    const vendor = exports.MODEL_PRESENTATION.vendors[id] || { label: '开发方待确认', labelEn: 'Developer unconfirmed', labelZh: '开发方待确认', aliases: [] };
    return (locale === 'en' ? vendor.labelEn : vendor.labelZh) || vendor.label;
}
function modelDeveloperAliases(id) {
    const vendor = exports.MODEL_PRESENTATION.vendors[id] || { label: '开发方待确认', labelEn: 'Developer unconfirmed', labelZh: '开发方待确认', aliases: [] };
    return [id, vendor.label, vendor.labelEn || vendor.label, vendor.labelZh || vendor.label, ...vendor.aliases];
}
function modelDeveloper(provider, model) {
    const route = presentationRoutes.find((rule) => rule.channels.includes(provider) && rule.regex.test(model.id));
    // Only reviewed namespaces are aliases; Pro and deployment paths are never developers.
    const namespace = model.id.replace(/^~/, '').replace(/^Pro\//i, '').split('/')[0].toLowerCase();
    const explicit = presentationAliases.get(String(model.vendorId || model.vendor || '').toLowerCase());
    const id = (route === null || route === void 0 ? void 0 : route.vendorId) || (model.vendorId === 'unconfirmed' ? 'unconfirmed' : presentationAliases.get(String(model.vendorId || '').toLowerCase())) || (model.id.includes('/') ? presentationAliases.get(namespace) : undefined) || explicit || 'unconfirmed';
    return { id, label: modelDeveloperName(id) };
}
function presentRegistryModel(provider, model) {
    const developer = modelDeveloper(provider, model);
    const family = presentationFamilies.find((rule) => rule.vendorId === developer.id && rule.patterns.some((pattern) => pattern.test(model.id)));
    const order = family ? family.patterns.findIndex((pattern) => pattern.test(model.id)) : -1;
    const release = presentationReleases.find((rule) => rule.vendorId === developer.id && (!rule.channels || rule.channels.includes(provider)) && rule.regex.test(model.id));
    return {
        ...model,
        label: modelDisplayLabel(model, developer.id),
        vendor: developer.label,
        vendorId: developer.id,
        serviceTier: /^Pro\//i.test(model.id) ? 'Pro' : model.serviceTier || '',
        releasedAt: release ? validModelReleaseDate(release.releasedAt) || null : validModelReleaseDate(model.releasedAt) || null,
        lifecycle: (release === null || release === void 0 ? void 0 : release.lifecycle) || model.lifecycle,
        releaseKind: (release === null || release === void 0 ? void 0 : release.releaseKind) || model.releaseKind || '',
        releaseSourceUrl: (release === null || release === void 0 ? void 0 : release.source) || model.releaseSourceUrl || '',
        releaseFamily: (family === null || family === void 0 ? void 0 : family.id) || '',
        releaseOrder: order >= 0 ? family.patterns.length - order : 0,
        releaseOrderSourceUrl: (family === null || family === void 0 ? void 0 : family.source) || '',
    };
}
function modelDisplayLabel(model, developerId) {
    const label = String(model.label || model.id);
    if (model.version && label !== model.id)
        return label.replace(/^[^:]+: /, '');
    if (label !== model.id && !label.includes('/'))
        return label.replace(/^[^:]+: /, '');
    // This is display-only. Preserve the original ID, including tier and task suffixes.
    let name = model.id.replace(/^Pro\//i, '').replace(/^accounts\/fireworks\/models\//, '').replace(/^fal-ai\//, '');
    const parts = name.split('/');
    if (parts.length > 1 && (presentationAliases.has(parts[0].toLowerCase())
        || (parts[0].toLowerCase() === 'thudm' && developerId === 'zhipu')))
        parts.shift();
    name = parts.filter((part) => !['text-to-image', 'image-to-image'].includes(part)).join(' · ');
    name = name.replace(/^glm/i, 'GLM').replace(/^deepseek/i, 'DeepSeek').replace(/^qwen/i, 'Qwen').replace(/^kimi/i, 'Kimi').replace(/^gpt/i, 'GPT').replace(/^flux/i, 'FLUX').replace(/^minimax/i, 'MiniMax').replace(/^grok/i, 'Grok').replace(/^gemini/i, 'Gemini').replace(/^claude/i, 'Claude').replace(/^seedream/i, 'Seedream');
    return name;
}
function validModelReleaseDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
        return '';
    const time = Date.parse(value + 'T00:00:00Z');
    return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value ? value : '';
}
// A stable topological order combines known dates with explicit version relations.
// Unlike a pairwise date-or-version comparator, this cannot become non-transitive.
// Official dates win if a version relation conflicts. IDs only break otherwise
// indistinguishable ties, so refreshing a shuffled catalog cannot reorder them.
// IDs and recommendation/selection state never establish version relations.
function sortModelsNewestFirst(models) {
    var _a;
    const nodes = models.map((model, index) => ({ model, index, date: validModelReleaseDate(model.releasedAt), next: new Set(), incoming: 0 }));
    function edge(from, to) {
        if (from !== to && !nodes[from].next.has(to)) {
            nodes[from].next.add(to);
            nodes[to].incoming++;
        }
    }
    const dated = nodes.filter((node) => node.date).sort((a, b) => b.date.localeCompare(a.date));
    const dates = [];
    for (const node of dated) {
        if (((_a = dates[dates.length - 1]) === null || _a === void 0 ? void 0 : _a[0].date) !== node.date)
            dates.push([]);
        dates[dates.length - 1].push(node);
    }
    for (let i = 1; i < dates.length; i++)
        for (const newer of dates[i - 1])
            for (const older of dates[i])
                edge(newer.index, older.index);
    function reaches(from, target, seen = new Set()) {
        if (from === target)
            return true;
        if (seen.has(from))
            return false;
        seen.add(from);
        return [...nodes[from].next].some((next) => reaches(next, target, seen));
    }
    const families = new Map();
    for (const node of nodes)
        if (node.model.releaseFamily && node.model.releaseOrder) {
            const key = (node.model.vendorId || node.model.vendor || '') + '/' + node.model.releaseFamily;
            families.set(key, [...(families.get(key) || []), node]);
        }
    for (const family of families.values()) {
        const versions = [...new Set(family.map((node) => node.model.releaseOrder))].sort((a, b) => b - a);
        for (let i = 1; i < versions.length; i++) {
            for (const newer of family.filter((node) => node.model.releaseOrder === versions[i - 1])) {
                for (const older of family.filter((node) => node.model.releaseOrder === versions[i])) {
                    if (!reaches(older.index, newer.index))
                        edge(newer.index, older.index);
                }
            }
        }
    }
    const result = [];
    const ready = nodes.filter((node) => node.incoming === 0);
    while (ready.length) {
        ready.sort((a, b) => Number(Boolean(b.date)) - Number(Boolean(a.date))
            || b.date.localeCompare(a.date)
            || Number(Boolean(b.model.releaseOrder)) - Number(Boolean(a.model.releaseOrder))
            || (a.model.id < b.model.id ? -1 : a.model.id > b.model.id ? 1 : 0));
        const node = ready.shift();
        result.push(node.model);
        for (const next of node.next)
            if (--nodes[next].incoming === 0)
                ready.push(nodes[next]);
    }
    return result;
}
