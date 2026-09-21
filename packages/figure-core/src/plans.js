import { createDocument, copyJsonData } from './document.js';
import { PROFILES } from './profiles.js';

const fail = (message) => { throw new Error(message); };
const plain = (value) => value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
function fields(value, allowed, label) {
  if (!plain(value) || Object.keys(value).some((key) => !allowed.includes(key))) fail(`${label}结构无效。`);
}
function text(value, max, label, optional = false) {
  if (optional && value === undefined) return '';
  if (typeof value !== 'string' || value.length > max || (!optional && !value.trim())) fail(`${label}为空或超出长度限制。`);
  return value;
}
const estimatedHeight = (value, width, font = 6) => {
  const fontMm = font * 25.4 / 72;
  // Use the widest glyph advance; overestimation keeps multilingual labels within their boxes.
  return value.split(/\r\n|\r|\n/).reduce((sum, line) => sum + Math.max(1, Math.ceil([...line].length * fontMm / width)), 0) * fontMm * 1.25 + 1;
};
const label = (id, value, x, y, width, height, extra = {}) => ({ id, type: 'text', x, y, width, height, text: value, fontSize: 6, fontFamily: 'Arial', fontWeight: 400, color: '#000000', role: 'label', ...extra });

/** Lays out only supplied labels, details, edges and notes; no inferred scientific claims. */
export function documentFromPlan(plan, options = {}) {
  plan = copyJsonData(plan);
  options = copyJsonData(options);
  fields(plan, ['title', 'summary', 'nodes', 'edges', 'notes'], '图形规划');
  fields(options, ['id', 'title', 'profileId', 'canvas', 'ruleOverrides', 'customRules'], '排版选项');
  const template = createDocument(options);
  const workingRules = PROFILES.find((profile) => profile.id === template.profileId).rules.map((rule) => ({ ...rule, ...template.ruleOverrides[rule.id] }));
  const typeRule = workingRules.find((rule) => rule.kind === 'text-size');
  const typeRange = typeRule?.enabled === false ? { min: 5, max: 7 } : typeRule.value;
  const fontRule = workingRules.find((rule) => rule.kind === 'standard-font');
  const fontFamily = fontRule?.enabled === false || fontRule.value.includes('Arial') ? 'Arial' : fontRule.value[0];
  const bodyFont = Math.max(typeRange.min, Math.min(typeRange.max, 6));
  const detailFont = Math.max(typeRange.min, Math.min(typeRange.max, 5.5));
  const titleFont = Math.max(typeRange.min, Math.min(typeRange.max, 7));
  const makeLabel = (id, value, x, y, width, height, extra = {}) => label(id, value, x, y, width, height, { fontSize: bodyFont, fontFamily, ...extra });
  const title = text(plan.title, 300, '规划标题');
  const summary = text(plan.summary, 2000, '规划概述', true);
  if (!Array.isArray(plan.nodes) || plan.nodes.length < 1 || plan.nodes.length > 12) fail('规划必须包含 1 到 12 个节点。');
  const ids = new Set();
  for (const node of plan.nodes) {
    fields(node, ['id', 'label', 'detail'], '规划节点');
    if (typeof node.id !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,63}$/.test(node.id) || ['__proto__', 'prototype', 'constructor'].includes(node.id) || ids.has(node.id)) fail('规划节点 ID 无效或重复。');
    ids.add(node.id); text(node.label, 240, '节点名称'); text(node.detail, 1000, '节点说明', true);
  }
  const edges = plan.edges ?? []; const notes = plan.notes ?? [];
  if (!Array.isArray(edges) || edges.length > 36) fail('规划连线最多 36 条。');
  for (const edge of edges) {
    fields(edge, ['from', 'to', 'label'], '规划连线');
    if (!ids.has(edge.from) || !ids.has(edge.to)) fail('规划连线引用了不存在的节点。');
    text(edge.label, 120, '连线标签', true);
  }
  if (!Array.isArray(notes) || notes.length > 10) fail('规划备注最多 10 条。');
  notes.forEach((note) => text(note, 1000, '规划备注'));

  const width = options.canvas?.widthMm ?? 183;
  if (typeof width !== 'number' || !Number.isFinite(width) || width < 60 || width > 400) fail('自动排版宽度须为 60 到 400 mm。');
  const margin = 8; const gap = 12; const columns = width >= 150 ? 3 : width >= 110 ? 2 : 1;
  const boxWidth = (width - margin * 2 - gap * (columns - 1)) / columns;
  let y = 7;
  const elements = [];
  const titleHeight = estimatedHeight(title, width - margin * 2, titleFont);
  elements.push(makeLabel('plan-title', title, margin, y, width - margin * 2, titleHeight, { fontSize: titleFont, fontWeight: 700 }));
  y += titleHeight + 3;
  if (summary) {
    const height = estimatedHeight(summary, width - margin * 2, bodyFont);
    elements.push(makeLabel('plan-summary', summary, margin, y, width - margin * 2, height)); y += height + 5;
  }
  const nodeMap = new Map();
  for (let offset = 0; offset < plan.nodes.length; offset += columns) {
    const row = plan.nodes.slice(offset, offset + columns);
    const heights = row.map((node) => 6 + estimatedHeight(node.label, boxWidth - 6, bodyFont) + (node.detail ? estimatedHeight(node.detail, boxWidth - 6, detailFont) + 2 : 0));
    const rowHeight = Math.max(18, ...heights);
    row.forEach((node, column) => {
      const x = margin + column * (boxWidth + gap); const nodeId = `node-${node.id}`;
      const panel = { id: nodeId, type: 'panel', x, y, width: boxWidth, height: rowHeight, fill: '#f4f7f8', stroke: '#416879', strokeWidth: 0.3 };
      elements.push(panel); nodeMap.set(node.id, panel);
      const height = estimatedHeight(node.label, boxWidth - 6, bodyFont);
      elements.push(makeLabel(`label-${node.id}`, node.label, x + 3, y + 3, boxWidth - 6, height, { parentId: nodeId, fontWeight: 700 }));
      if (node.detail) elements.push(makeLabel(`detail-${node.id}`, node.detail, x + 3, y + 3 + height + 2, boxWidth - 6, rowHeight - height - 7, { parentId: nodeId, fontSize: detailFont }));
    });
    y += rowHeight + gap;
  }
  // Arrows form independent objects behind panels. Each binds to current node borders.
  const connectors = [];
  edges.forEach((edge, index) => {
    const from = nodeMap.get(edge.from); const to = nodeMap.get(edge.to);
    const x1 = from.x + from.width / 2; const y1 = from.y + from.height / 2;
    const x2 = to.x + to.width / 2; const y2 = to.y + to.height / 2;
    connectors.push({ id: `edge-${index + 1}`, type: 'arrow', x1, y1, x2, y2, fromId: from.id, toId: to.id, stroke: '#416879', strokeWidth: 0.35 });
    if (edge.label) {
      const labelWidth = Math.min(40, width - margin * 2);
      elements.push(makeLabel(`edge-label-${index + 1}`, edge.label, Math.max(margin, Math.min(width - margin - labelWidth, (x1 + x2) / 2 - labelWidth / 2)), (y1 + y2) / 2 - 4, labelWidth, estimatedHeight(edge.label, labelWidth, detailFont), { fontSize: detailFont }));
    }
  });
  for (let i = 0; i < notes.length; i += 1) {
    const height = estimatedHeight(notes[i], width - margin * 2, detailFont);
    elements.push(makeLabel(`note-${i + 1}`, notes[i], margin, y, width - margin * 2, height, { fontSize: detailFont })); y += height + 2;
  }
  const chosenHeight = options.canvas?.heightMm ?? Math.max(70, Math.ceil(y + margin));
  return createDocument({ ...options, title: options.title ?? title, canvas: { widthMm: width, heightMm: chosenHeight, background: '#ffffff', ...options.canvas }, elements: [...connectors, ...elements] });
}

export function createExampleDocument() {
  return documentFromPlan({
    title: '结构示例 · 非研究结论',
    summary: '此示例仅演示可编辑对象、连接线和面板分组；请用作者确认的研究内容替换。',
    nodes: [
      { id: 'input', label: '研究输入', detail: '填写已确认的材料、装置或观察条件。' },
      { id: 'method', label: '处理过程', detail: '填写实际采用的方法与步骤。' },
      { id: 'output', label: '研究输出', detail: '填写有原始证据支持的观察结果。' },
    ],
    edges: [{ from: 'input', to: 'method' }, { from: 'method', to: 'output' }],
    notes: ['示例连接仅表示阅读顺序，不构成已验证的科学因果关系。'],
  });
}
