import { PROFILES, CUSTOM_RULE_KINDS } from './profiles.js';
import { validateRasterAsset } from './assets.js';

export const SCHEMA_VERSION = 'tuyan.figure/v1';
export const LIMITS = Object.freeze({ elements: 500, assets: 20, documentBytes: 12 * 1024 * 1024, commands: 100, dimensionMm: 2000, coordinateMm: 4000 });
const RESERVED = new Set(['__proto__', 'prototype', 'constructor']);
const RECT_TYPES = new Set(['rect', 'ellipse', 'panel', 'image']);
const LINE_TYPES = new Set(['line', 'arrow']);
const COMMON = ['id', 'type', 'parentId'];
const BOX = ['x', 'y', 'width', 'height'];
const STYLE = ['fill', 'stroke', 'strokeWidth'];
const ELEMENT_FIELDS = {
  text: [...COMMON, ...BOX, 'text', 'fontSize', 'fontFamily', 'fontWeight', 'color', 'role'],
  rect: [...COMMON, ...BOX, ...STYLE],
  ellipse: [...COMMON, ...BOX, ...STYLE],
  panel: [...COMMON, ...BOX, ...STYLE],
  image: [...COMMON, ...BOX, 'assetId'],
  line: [...COMMON, 'x1', 'y1', 'x2', 'y2', 'stroke', 'strokeWidth', 'fromId', 'toId'],
  arrow: [...COMMON, 'x1', 'y1', 'x2', 'y2', 'stroke', 'strokeWidth', 'fromId', 'toId'],
};

const error = (message) => { throw new Error(message); };
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
function record(value, label) { if (!isRecord(value)) error(`${label}必须是普通对象。`); }
function keys(value, allowed, label) {
  record(value, label);
  for (const key of Object.keys(value)) if (RESERVED.has(key) || !allowed.includes(key)) error(`${label}包含不支持的字段：${key}。`);
}
function str(value, max, label, empty = false) {
  if (typeof value !== 'string' || value.length > max || (!empty && !value.trim()) || /[\x00-\x08\x0b\x0c\x0e-\x1f\ufffe\uffff]/u.test(value) || /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/.test(value)) error(`${label}不是有效文字，或长度超出限制。`);
}
function id(value, label = '对象 ID') {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,95}$/.test(value) || RESERVED.has(value)) error(`${label}无效。`);
}
function num(value, min, max, label) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) error(`${label}必须是 ${min} 到 ${max} 之间的有限数值。`);
}
function color(value, label, allowNone = true) {
  if (typeof value !== 'string' || (!/^#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?$/.test(value) && !(allowNone && value === 'none'))) error(`${label}仅接受 RGB 十六进制颜色${allowNone ? '或 none' : ''}。`);
}
export function copyJsonData(input) {
  const seen = new Set();
  let count = 0;
  function walk(value, depth) {
    if (++count > 25000 || depth > 32) error('文档结构过大或嵌套过深。');
    if (value === null || typeof value === 'boolean' || typeof value === 'string') return;
    if (typeof value === 'number') { if (!Number.isFinite(value)) error('文档不能包含非有限数值。'); return; }
    if (typeof value !== 'object' || (!Array.isArray(value) && !isRecord(value))) error('文档只能包含普通 JSON 数据。');
    if (seen.has(value)) error('文档不能包含循环引用。');
    seen.add(value);
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== 'string' || RESERVED.has(key)) error('文档包含不安全字段。');
      if (Array.isArray(value) && key === 'length') continue;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !own(descriptor, 'value') || !descriptor.enumerable) error('文档只能包含可序列化的数据字段。');
      walk(descriptor.value, depth + 1);
    }
    seen.delete(value);
  }
  walk(input, 0);
  const encoded = JSON.stringify(input);
  if (new TextEncoder().encode(encoded).byteLength > LIMITS.documentBytes) error('文档超过 12 MB 上限。');
  return JSON.parse(encoded);
}

function canvas(value) {
  keys(value, ['widthMm', 'heightMm', 'background'], '画布');
  num(value.widthMm, 1, LIMITS.dimensionMm, '画布宽度');
  num(value.heightMm, 1, LIMITS.dimensionMm, '画布高度');
  color(value.background, '画布背景');
}
function element(value) {
  record(value, '元素');
  if (!own(ELEMENT_FIELDS, value.type)) error('元素类型不受支持。');
  keys(value, ELEMENT_FIELDS[value.type], '元素');
  id(value.id);
  if (own(value, 'parentId')) id(value.parentId, '父面板 ID');
  if (LINE_TYPES.has(value.type)) {
    for (const field of ['x1', 'y1', 'x2', 'y2']) num(value[field], -LIMITS.coordinateMm, LIMITS.coordinateMm, field);
    for (const field of ['fromId', 'toId']) if (own(value, field)) id(value[field], '连接目标 ID');
  } else {
    for (const field of ['x', 'y']) num(value[field], -LIMITS.coordinateMm, LIMITS.coordinateMm, field);
    for (const field of ['width', 'height']) num(value[field], 0.01, LIMITS.dimensionMm, field);
  }
  if (value.type === 'text') {
    str(value.text, 4000, '文字内容', true);
    num(value.fontSize, 1, 200, '文字字号');
    str(value.fontFamily, 100, '字体');
    if (!/^[\p{L}\p{N} ,_-]+$/u.test(value.fontFamily)) error('字体名称包含不支持的字符。');
    if (![400, 700, 'normal', 'bold'].includes(value.fontWeight)) error('字重仅支持 400、700、normal 或 bold。');
    if (!['label', 'panel-label'].includes(value.role)) error('文字角色不受支持。');
    color(value.color, '文字颜色', false);
  } else if (value.type === 'image') id(value.assetId, '位图资产 ID');
  else {
    color(value.stroke, '线条颜色');
    num(value.strokeWidth, 0, 20, '线条粗细');
    if (RECT_TYPES.has(value.type)) color(value.fill, '填充颜色');
  }
}

function ruleValue(kind, value) {
  if (kind === 'text-size') {
    keys(value, ['min', 'max'], '字号规则');
    num(value.min, 1, 200, '最小字号'); num(value.max, value.min, 200, '最大字号');
  } else if (kind === 'panel-label-size') num(value, 1, 200, '标签字号');
  else if (kind === 'max-height') num(value, 1, LIMITS.dimensionMm, '最大高度');
  else if (kind === 'min-dpi') num(value, 1, 2400, '最小 DPI');
  else if (kind === 'column-width') {
    if (!Array.isArray(value) || value.length < 1 || value.length > 10) error('栏宽规则必须包含 1 到 10 个宽度。');
    value.forEach((v) => num(v, 1, LIMITS.dimensionMm, '栏宽'));
  } else if (kind === 'standard-font') {
    if (!Array.isArray(value) || value.length < 1 || value.length > 20) error('字体规则必须包含 1 到 20 个字体。');
    value.forEach((v) => str(v, 100, '规则字体'));
  } else error('这项规则不支持修改阈值。');
}
function rules(doc) {
  const profile = PROFILES.find((item) => item.id === doc.profileId);
  if (!profile) error('不支持的期刊配置版本。');
  if (!Array.isArray(doc.customRules) || doc.customRules.length > 30) error('自定义规则最多 30 项。');
  const byId = new Map(profile.rules.map((rule) => [rule.id, rule]));
  for (const rule of doc.customRules) {
    keys(rule, ['id', 'label', 'kind', 'value', 'enabled', 'message'], '自定义规则');
    id(rule.id, '规则 ID'); str(rule.label, 120, '规则名称');
    if (byId.has(rule.id)) error('规则 ID 重复。');
    if (!CUSTOM_RULE_KINDS.includes(rule.kind)) error('自定义规则类型不受支持。');
    if (own(rule, 'enabled') && typeof rule.enabled !== 'boolean') error('规则启用状态必须为布尔值。');
    if (own(rule, 'message')) str(rule.message, 1000, '规则说明', true);
    if (rule.kind === 'manual') { if (own(rule, 'value')) error('人工规则不支持自动阈值。'); }
    else ruleValue(rule.kind, rule.value);
    byId.set(rule.id, rule);
  }
  record(doc.ruleOverrides, '规则覆盖');
  for (const [ruleId, override] of Object.entries(doc.ruleOverrides)) {
    const rule = byId.get(ruleId);
    if (!rule) error('规则覆盖引用了不存在的规则。');
    keys(override, ['enabled', 'value'], '规则覆盖');
    if (own(override, 'enabled') && typeof override.enabled !== 'boolean') error('规则启用状态必须为布尔值。');
    if (own(override, 'value')) ruleValue(rule.kind, override.value);
  }
}

/** Returns an independent, strictly validated JSON document; never repairs imported sources. */
export function validateDocument(input) {
  const doc = copyJsonData(input);
  keys(doc, ['schemaVersion', 'id', 'revision', 'title', 'canvas', 'elements', 'assets', 'profileId', 'ruleOverrides', 'customRules'], '文档');
  if (doc.schemaVersion !== SCHEMA_VERSION) error('图形源文件版本不受支持。');
  id(doc.id, '文档 ID');
  if (!Number.isSafeInteger(doc.revision) || doc.revision < 0) error('文档版本号必须为非负安全整数。');
  str(doc.title, 300, '图形标题', true); canvas(doc.canvas);
  if (!Array.isArray(doc.elements) || doc.elements.length > LIMITS.elements) error('图形元素最多 500 个。');
  record(doc.assets, '位图资产');
  if (Object.keys(doc.assets).length > LIMITS.assets) error('位图资产最多 20 个。');
  for (const [assetId, asset] of Object.entries(doc.assets)) {
    id(assetId, '资产 ID');
    keys(asset, ['mimeType', 'dataUrl', 'pixelWidth', 'pixelHeight'], '位图资产');
    validateRasterAsset(asset);
  }
  const byId = new Map();
  let renderedAssetBytes = 0;
  for (const item of doc.elements) {
    element(item);
    if (byId.has(item.id)) error(`对象 ID 重复：${item.id}。`);
    byId.set(item.id, item);
  }
  for (const item of doc.elements) {
    if (item.parentId && byId.get(item.parentId)?.type !== 'panel') error(`对象 ${item.id} 的父面板不存在。`);
    const ancestors = new Set([item.id]);
    let parent = item.parentId;
    while (parent) {
      if (ancestors.has(parent)) error('面板父子关系形成循环。');
      ancestors.add(parent); parent = byId.get(parent)?.parentId;
    }
    if (item.type === 'image') {
      if (!own(doc.assets, item.assetId)) error(`对象 ${item.id} 引用的位图不存在。`);
      // Each editable SVG image embeds its own bytes. Bound reuse as well as source size.
      renderedAssetBytes += doc.assets[item.assetId].dataUrl.length;
      if (renderedAssetBytes > LIMITS.documentBytes) error('图片重复放置后的内嵌数据超过 12 MB，请减少图片数量或压缩位图。');
    }
    if (LINE_TYPES.has(item.type)) for (const field of ['fromId', 'toId']) {
      if (item[field] && !RECT_TYPES.has(byId.get(item[field])?.type)) error(`连接线 ${item.id} 的目标不存在或不是矩形类对象。`);
    }
  }
  rules(doc);
  return doc;
}

function defaults(item) {
  record(item, '元素');
  if (item.type === 'text') return { fontSize: 6, fontFamily: 'Arial', fontWeight: 400, color: '#000000', role: 'label', ...item };
  if (LINE_TYPES.has(item.type)) return { stroke: '#555555', strokeWidth: 0.3, ...item };
  if (['rect', 'ellipse', 'panel'].includes(item.type)) return { fill: item.type === 'panel' ? 'none' : '#ffffff', stroke: '#555555', strokeWidth: 0.3, ...item };
  return { ...item };
}

export function createDocument(input = {}) {
  // Copy first so getters/prototypes cannot run while defaults are applied.
  const safe = copyJsonData(input);
  record(safe, '新文档');
  const generatedId = `figure-${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}`;
  const doc = { schemaVersion: SCHEMA_VERSION, id: generatedId, revision: 0, title: '未命名图形', canvas: { widthMm: 183, heightMm: 110, background: '#ffffff' }, elements: [], assets: {}, profileId: PROFILES[0].id, ruleOverrides: {}, customRules: [], ...safe };
  if (own(safe, 'canvas')) { record(safe.canvas, '画布'); doc.canvas = { widthMm: 183, heightMm: 110, background: '#ffffff', ...safe.canvas }; }
  if (Array.isArray(doc.elements)) doc.elements = doc.elements.map(defaults);
  return validateDocument(doc);
}

function descendants(elements, parentId) {
  const removed = new Set([parentId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const item of elements) if (item.parentId && removed.has(item.parentId) && !removed.has(item.id)) { removed.add(item.id); changed = true; }
  }
  return removed;
}
function translate(item, dx, dy) {
  if (LINE_TYPES.has(item.type)) { item.x1 += dx; item.x2 += dx; item.y1 += dy; item.y2 += dy; }
  else { item.x += dx; item.y += dy; }
}

/** All commands are applied to a clone and validated together. Original and revision remain intact on failure. */
export function applyCommands(input, commands, options = {}) {
  const doc = validateDocument(input);
  keys(options, ['baseRevision'], '编辑选项');
  const baseRevision = own(options, 'baseRevision') ? options.baseRevision : doc.revision;
  if (baseRevision !== doc.revision) error('文档版本冲突：请基于当前版本重新应用修改。');
  if (doc.revision === Number.MAX_SAFE_INTEGER) error('文档版本号已达到上限。');
  const safeCommands = copyJsonData(commands);
  if (!Array.isArray(safeCommands) || safeCommands.length < 1 || safeCommands.length > LIMITS.commands) error('每次编辑必须包含 1 到 100 条命令。');
  for (const command of safeCommands) {
    record(command, '编辑命令');
    if (command.type === 'update') {
      keys(command, ['type', 'id', 'patch'], '更新命令');
      const item = doc.elements.find((e) => e.id === command.id);
      if (!item) error('找不到要修改的对象。');
      keys(command.patch, ELEMENT_FIELDS[item.type].filter((field) => !['id', 'type'].includes(field)), '对象修改');
      const before = { ...item };
      for (const [field, value] of Object.entries(command.patch)) {
        if (value === null && ['parentId', 'fromId', 'toId'].includes(field)) delete item[field];
        else item[field] = value;
      }
      element(item);
      if (item.type === 'panel') {
        const dx = item.x - before.x; const dy = item.y - before.y;
        const children = descendants(doc.elements, item.id);
        for (const child of doc.elements) if (child.id !== item.id && children.has(child.id)) translate(child, dx, dy);
      }
    } else if (command.type === 'add') {
      keys(command, ['type', 'element'], '新增命令');
      const item = defaults(command.element); element(item);
      if (doc.elements.some((e) => e.id === item.id)) error('新增对象 ID 已存在。');
      doc.elements.push(item);
    } else if (command.type === 'remove') {
      keys(command, ['type', 'id'], '删除命令');
      if (!doc.elements.some((e) => e.id === command.id)) error('找不到要删除的对象。');
      const removed = descendants(doc.elements, command.id);
      doc.elements = doc.elements.filter((e) => !removed.has(e.id) && !(LINE_TYPES.has(e.type) && (removed.has(e.fromId) || removed.has(e.toId))));
    } else if (command.type === 'canvas') {
      keys(command, ['type', 'patch'], '画布命令');
      keys(command.patch, ['widthMm', 'heightMm', 'background'], '画布修改');
      Object.assign(doc.canvas, command.patch); canvas(doc.canvas);
    } else if (command.type === 'rule') {
      keys(command, ['type', 'id', 'override'], '规则命令'); id(command.id, '规则 ID');
      keys(command.override, ['enabled', 'value'], '规则覆盖');
      doc.ruleOverrides[command.id] = { ...doc.ruleOverrides[command.id], ...command.override };
    } else if (command.type === 'custom-rule') {
      keys(command, ['type', 'rule'], '自定义规则命令');
      record(command.rule, '自定义规则'); id(command.rule.id, '规则 ID');
      if (PROFILES.some((profile) => profile.rules.some((rule) => rule.id === command.rule.id))) error('不能用自定义规则替换官方基线规则。');
      const index = doc.customRules.findIndex((rule) => rule.id === command.rule.id);
      if (index === -1) doc.customRules.push(command.rule);
      else doc.customRules[index] = command.rule;
      delete doc.ruleOverrides[command.rule.id];
    } else if (command.type === 'remove-custom-rule') {
      keys(command, ['type', 'id'], '删除自定义规则命令'); id(command.id, '规则 ID');
      if (!doc.customRules.some((rule) => rule.id === command.id)) error('找不到自定义规则；官方基线规则不能删除。');
      doc.customRules = doc.customRules.filter((rule) => rule.id !== command.id);
      delete doc.ruleOverrides[command.id];
    } else if (command.type === 'rule-preset') {
      keys(command, ['type', 'profileId', 'ruleOverrides', 'customRules'], '规则预设命令');
      if (!own(command, 'profileId') || !own(command, 'ruleOverrides') || !own(command, 'customRules')) error('规则预设必须包含配置 ID、覆盖值和自定义规则。');
      doc.profileId = command.profileId; doc.ruleOverrides = command.ruleOverrides; doc.customRules = command.customRules;
    } else if (command.type === 'title') {
      keys(command, ['type', 'title'], '标题命令'); str(command.title, 300, '标题', true); doc.title = command.title;
    } else if (command.type === 'asset') {
      keys(command, ['type', 'id', 'asset'], '资产命令'); id(command.id, '资产 ID');
      keys(command.asset, ['mimeType', 'dataUrl', 'pixelWidth', 'pixelHeight'], '位图资产'); validateRasterAsset(command.asset);
      if (own(doc.assets, command.id)) error('资产 ID 已存在；替换图片请使用新的资产 ID。');
      doc.assets[command.id] = command.asset;
    } else if (command.type === 'reorder') {
      keys(command, ['type', 'ids'], '排序命令');
      if (!Array.isArray(command.ids) || command.ids.length !== doc.elements.length || new Set(command.ids).size !== doc.elements.length) error('排序必须恰好包含全部对象且不重复。');
      const map = new Map(doc.elements.map((e) => [e.id, e]));
      doc.elements = command.ids.map((key) => { if (!map.has(key)) error('排序包含不存在的对象。'); return map.get(key); });
    } else if (command.type === 'replace-content') {
      keys(command, ['type', 'elements', 'assets', 'title'], '替换图稿内容命令');
      if (!own(command, 'elements') || !own(command, 'assets')) error('替换图稿必须包含完整对象与资产。');
      doc.elements = command.elements; doc.assets = command.assets;
      if (own(command, 'title')) { str(command.title, 300, '标题', true); doc.title = command.title; }
    } else error('不支持的图形编辑命令。');
  }
  doc.revision += 1;
  return validateDocument(doc);
}

/** Bound endpoints are calculated from current geometry; persisted anchors stay unchanged. */
export function connectorEndpoints(line, elements) {
  const byId = new Map(elements.map((e) => [e.id, e]));
  const from = byId.get(line.fromId); const to = byId.get(line.toId);
  const center = (item) => ({ x: item.x + item.width / 2, y: item.y + item.height / 2 });
  const start = from ? center(from) : { x: line.x1, y: line.y1 };
  const end = to ? center(to) : { x: line.x2, y: line.y2 };
  function border(item, target) {
    const origin = center(item); const dx = target.x - origin.x; const dy = target.y - origin.y;
    if (Math.abs(dx) + Math.abs(dy) < 1e-10) return origin;
    const rx = item.width / 2; const ry = item.height / 2;
    const scale = item.type === 'ellipse' ? 1 / Math.sqrt((dx / rx) ** 2 + (dy / ry) ** 2) : 1 / Math.max(Math.abs(dx) / rx, Math.abs(dy) / ry);
    return { x: origin.x + dx * scale, y: origin.y + dy * scale };
  }
  const a = from ? border(from, end) : start; const b = to ? border(to, start) : end;
  return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
}
