import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { createDocument, validateDocument, applyCommands, renderSvg, evaluateRules, PROFILES, documentFromPlan, createExampleDocument, connectorEndpoints } from '../src/index.js';

const rect = (id, extra = {}) => ({ id, type: 'rect', x: 10, y: 10, width: 20, height: 10, fill: '#ffffff', stroke: '#222222', strokeWidth: 0.3, ...extra });
const text = (id, extra = {}) => ({ id, type: 'text', x: 10, y: 10, width: 50, height: 10, text: 'Editable label', fontSize: 6, fontFamily: 'Arial', fontWeight: 400, color: '#000000', role: 'label', ...extra });
const line = (id, extra = {}) => ({ id, type: 'arrow', x1: 20, y1: 15, x2: 80, y2: 15, stroke: '#222222', strokeWidth: 0.3, ...extra });
const source = () => createDocument({ id: 'fixture-doc', title: 'Author content', elements: [rect('a'), text('t'), rect('b', { x: 70 }), line('link', { fromId: 'a', toId: 'b' })] });
const check = (evaluation, id, list = 'baseline') => evaluation[list].find((r) => r.id === id);

function png(width = 1, height = 1) {
  const chunk = (type, bytes) => {
    const data = Buffer.concat([Buffer.from(type), bytes]); let crc = 0xffffffff;
    for (const byte of data) { crc ^= byte; for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); }
    const size = Buffer.alloc(4); size.writeUInt32BE(bytes.length);
    const end = Buffer.alloc(4); end.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([size, data, end]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6;
  const body = Buffer.alloc(height * (width * 4 + 1), 0xff);
  for (let row = 0; row < height; row += 1) body[row * (width * 4 + 1)] = 0;
  const bytes = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(body)), chunk('IEND', Buffer.alloc(0))]);
  return { mimeType: 'image/png', dataUrl: `data:image/png;base64,${bytes.toString('base64')}`, pixelWidth: width, pixelHeight: height };
}

test('source JSON persistence retains identity, revisions, objects, assets and rules', () => {
  const doc = createDocument({ ...source(), assets: { photo: png() }, customRules: [{ id: 'user-height', label: 'Custom height', kind: 'max-height', value: 140 }], ruleOverrides: { 'text-size': { value: { min: 5, max: 9 } } } });
  assert.deepEqual(validateDocument(JSON.parse(JSON.stringify(doc))), doc);
  assert.notEqual(validateDocument(doc).elements, doc.elements);
  const copied = validateDocument(doc); copied.elements[0].x = 40;
  assert.equal(doc.elements[0].x, 10);
});

test('successful edit is atomic, advances once and preserves untargeted content exactly', () => {
  const doc = source(); const before = JSON.stringify(doc);
  const next = applyCommands(doc, [{ type: 'update', id: 't', patch: { text: 'Revised only' } }, { type: 'title', title: 'Revised title' }], { baseRevision: 0 });
  assert.equal(next.revision, 1); assert.equal(JSON.stringify(doc), before);
  assert.deepEqual(next.elements.filter((e) => e.id !== 't'), doc.elements.filter((e) => e.id !== 't'));
  assert.equal(next.id, doc.id);
});

test('failing later command leaves the entire original document untouched', () => {
  const doc = source(); const before = structuredClone(doc);
  assert.throws(() => applyCommands(doc, [{ type: 'update', id: 't', patch: { text: 'Do not persist' } }, { type: 'update', id: 'absent', patch: { x: 3 } }]), /找不到/);
  assert.deepEqual(doc, before);
});

test('rejects stale revisions, numeric legacy options and unsafe revision overflow', () => {
  assert.throws(() => applyCommands(source(), [{ type: 'title', title: 'stale' }], { baseRevision: 1 }), /版本冲突/);
  assert.throws(() => applyCommands(source(), [{ type: 'title', title: 'stale' }], 0), /普通对象/);
  assert.throws(() => applyCommands(createDocument({ revision: Number.MAX_SAFE_INTEGER }), [{ type: 'title', title: 'overflow' }]), /上限/);
});

test('all surfaces reject scripts, unknown fields, raw SVG, arbitrary colors and invalid fonts', () => {
  const doc = source();
  for (const patch of [{ id: 'new' }, { type: 'image' }, { revision: 5 }, { onclick: 'alert(1)' }, { transform: 'rotate(5)' }, { opacity: 0.5 }, { fontFamily: 'Arial" onload="x' }, { color: 'url(https://x)' }]) {
    assert.throws(() => applyCommands(doc, [{ type: 'update', id: 't', patch }]));
  }
  assert.throws(() => createDocument({ rawSvg: '<svg/>' }), /不支持/);
  assert.throws(() => applyCommands(doc, [{ type: 'title', title: 'ok', extra: true }]), /不支持/);
  assert.throws(() => createDocument({ elements: [{ ...rect('r'), fill: 'red' }] }), /RGB/);
});

test('prototype keys, cycles, getters and non-JSON values cannot cross source boundary', () => {
  const polluted = JSON.parse(JSON.stringify(source())); polluted.assets = JSON.parse('{"__proto__":{}}');
  assert.throws(() => validateDocument(polluted), /不安全/);
  assert.throws(() => createDocument({ id: 'constructor' }), /ID/);
  const cyclic = {}; cyclic.self = cyclic;
  assert.throws(() => createDocument(cyclic), /循环/);
  let accessed = false; const getter = {}; Object.defineProperty(getter, 'title', { get() { accessed = true; return 'evil'; }, enumerable: true });
  assert.throws(() => createDocument(getter), /数据字段/); assert.equal(accessed, false);
  assert.throws(() => createDocument({ title: () => 'not json' }), /JSON/);
});

test('invalid geometry, bounds, non-finite values and oversized sources are rejected', () => {
  for (const canvas of [{ widthMm: 0 }, { heightMm: -1 }, { widthMm: 2001 }, { heightMm: Infinity }]) assert.throws(() => createDocument({ canvas }));
  for (const patch of [{ width: 0 }, { height: NaN }, { x: 4001 }, { fontSize: 0 }, { fontSize: 201 }]) assert.throws(() => applyCommands(source(), [{ type: 'update', id: 't', patch }]));
  assert.throws(() => createDocument({ elements: [text('large', { text: 'a'.repeat(4001) })] }), /长度/);
  assert.throws(() => createDocument({ title: 'a'.repeat(13 * 1024 * 1024) }), /12 MB/);
  assert.throws(() => createDocument({ elements: Array.from({ length: 501 }, (_, index) => rect(`r${index}`)) }), /500/);
});

test('import validation is strict and never silently repairs missing required fields', () => {
  const doc = source(); delete doc.elements[0].stroke;
  assert.throws(() => validateDocument(doc), /线条颜色/);
  const badVersion = { ...source(), schemaVersion: 'tuyan.figure/v999' };
  assert.throws(() => validateDocument(badVersion), /版本/);
  assert.throws(() => validateDocument({ ...source(), profileId: 'random-profile' }), /期刊/);
});

test('duplicate IDs, dangling assets, invalid connector refs and parent cycles are rejected', () => {
  assert.throws(() => createDocument({ elements: [rect('same'), rect('same')] }), /重复/);
  assert.throws(() => createDocument({ elements: [{ id: 'image', type: 'image', x: 0, y: 0, width: 10, height: 10, assetId: 'missing' }] }), /位图不存在/);
  assert.throws(() => createDocument({ elements: [text('t'), line('l', { toId: 't' })] }), /不是矩形/);
  assert.throws(() => createDocument({ elements: [rect('r'), text('t', { parentId: 'r' })] }), /父面板/);
  assert.throws(() => createDocument({ elements: [rect('p', { type: 'panel', parentId: 'q' }), rect('q', { type: 'panel', parentId: 'p' })] }), /循环/);
});

test('moving a panel translates all descendants once; resizing does not scale descendants', () => {
  const doc = createDocument({ elements: [rect('p', { type: 'panel', x: 0, y: 0, width: 100, height: 80 }), rect('nested', { type: 'panel', parentId: 'p' }), text('child', { parentId: 'nested', x: 12, y: 13 }), line('inside', { parentId: 'nested' }), rect('outside', { x: 120 }), line('connected', { fromId: 'nested', toId: 'outside' })] });
  const moved = applyCommands(doc, [{ type: 'update', id: 'p', patch: { x: 5, y: 8, width: 120 } }]);
  assert.equal(moved.elements.find((e) => e.id === 'child').x, 17);
  assert.equal(moved.elements.find((e) => e.id === 'child').y, 21);
  assert.equal(moved.elements.find((e) => e.id === 'nested').width, 20);
  assert.equal(moved.elements.find((e) => e.id === 'inside').x1, 25);
  assert.deepEqual(moved.elements.find((e) => e.id === 'outside'), doc.elements.find((e) => e.id === 'outside'));
  assert.notDeepEqual(connectorEndpoints(moved.elements.at(-1), moved.elements), connectorEndpoints(doc.elements.at(-1), doc.elements));
});

test('bound arrow endpoints follow resized/moved targets without editing stored unrelated anchors', () => {
  const doc = source(); const arrow = doc.elements.at(-1);
  assert.deepEqual(connectorEndpoints(arrow, doc.elements), { x1: 30, y1: 15, x2: 70, y2: 15 });
  const next = applyCommands(doc, [{ type: 'update', id: 'a', patch: { x: 20, width: 30 } }]);
  assert.deepEqual(connectorEndpoints(next.elements.at(-1), next.elements), { x1: 50, y1: 15, x2: 70, y2: 15 });
  assert.deepEqual(next.elements.at(-1), arrow);
  assert.match(renderSvg(next), /<line x1="50" y1="15" x2="70" y2="15"/);
});

test('ellipse-bound endpoints are on ellipse perimeter and zero-length arrows remain finite', () => {
  const doc = createDocument({ elements: [rect('e', { type: 'ellipse' }), line('l', { fromId: 'e', x2: 40, y2: 30 }), line('zero', { x1: 0, x2: 0, y1: 0, y2: 0 })] });
  const point = connectorEndpoints(doc.elements[1], doc.elements);
  assert.ok(Math.abs(((point.x1 - 20) / 10) ** 2 + ((point.y1 - 15) / 5) ** 2 - 1) < 1e-8);
  assert.doesNotMatch(renderSvg(doc), /NaN|Infinity/);
});

test('remove cascades through nested panels and all attached connectors, preserving outsiders', () => {
  const doc = createDocument({ elements: [rect('p', { type: 'panel' }), rect('q', { type: 'panel', parentId: 'p' }), rect('r', { parentId: 'q' }), text('t', { parentId: 'p' }), rect('outside'), line('l', { fromId: 'r', toId: 'outside' }), line('free')] });
  const next = applyCommands(doc, [{ type: 'remove', id: 'p' }]);
  assert.deepEqual(next.elements.map((e) => e.id), ['outside', 'free']);
});

test('asset plus image command transaction may resolve forward references in final state', () => {
  const next = applyCommands(createDocument(), [{ type: 'add', element: { id: 'photo', type: 'image', x: 0, y: 0, width: 5, height: 5, assetId: 'raster' } }, { type: 'asset', id: 'raster', asset: png() }]);
  assert.equal(next.revision, 1); assert.equal(next.elements[0].assetId, 'raster');
  assert.match(renderSvg(next), /xlink:href="data:image\/png;base64,/);
  assert.throws(() => applyCommands(next, [{ type: 'asset', id: 'raster', asset: png() }]), /已存在/);
});

test('source asset validation rejects URLs, SVG, MIME spoofing, malformed data and dimension lies', () => {
  const good = png();
  const bad = [
    { ...good, dataUrl: 'https://example.org/photo.png' },
    { ...good, dataUrl: 'data:image/svg+xml;base64,PHN2Zy8+', mimeType: 'image/svg+xml' },
    { ...good, dataUrl: `data:image/png;base64,${Buffer.from('<svg onload="alert(1)"/>').toString('base64')}` },
    { ...good, dataUrl: good.dataUrl.replace(';base64,', ';charset=utf-8;base64,') },
    { ...good, pixelWidth: 400 },
    { ...good, dataUrl: good.dataUrl.slice(0, -4) },
    { ...good, dataUrl: good.dataUrl.replace('image/png', 'image/jpeg'), mimeType: 'image/jpeg' },
  ];
  for (const asset of bad) assert.throws(() => validateDocument({ ...source(), assets: { photo: asset } }), /位图资产/);
  const bytes = Buffer.from(good.dataUrl.split(',')[1], 'base64'); bytes[30] ^= 1;
  assert.throws(() => createDocument({ assets: { corrupt: { ...good, dataUrl: `data:image/png;base64,${bytes.toString('base64')}` } } }), /位图资产/);
});

test('reorder requires complete unique object IDs and preserves every object value', () => {
  const doc = source(); const ids = doc.elements.map((e) => e.id).reverse();
  const next = applyCommands(doc, [{ type: 'reorder', ids }]);
  assert.deepEqual(next.elements, [...doc.elements].reverse());
  for (const bad of [['a'], ['a', 'a', 'b', 'link'], ['a', 't', 'b', 'missing']]) assert.throws(() => applyCommands(doc, [{ type: 'reorder', ids: bad }]), /排序/);
});

test('SVG escapes author text and title, retains text objects and converts points to mm', () => {
  const doc = createDocument({ title: '<script>alert("x")</script>', elements: [text('safe', { text: '<>&"\'中文', fontSize: 6 })] });
  const svg = renderSvg(doc);
  assert.match(svg, /^<\?xml/); assert.match(svg, /width="183mm"/);
  assert.match(svg, /data-element-id="safe"/); assert.match(svg, /font-size="2\.116667"/);
  assert.match(svg, /&lt;&gt;&amp;&quot;&apos;中文/);
  assert.doesNotMatch(svg, /<script|<foreignObject|<path|onload=/);
  assert.match(svg, /<text[^>]+>[\s\S]*<tspan/);
});

test('SVG panel wrappers contain descendant objects with stable identity', () => {
  const doc = createDocument({ elements: [text('child', { parentId: 'panel' }), rect('panel', { type: 'panel' })] });
  const svg = renderSvg(doc);
  assert.match(svg, /data-element-id="panel"[\s\S]*data-element-id="child"[\s\S]*<\/text><\/g><\/g>/);
  assert.equal((svg.match(/data-element-id=/g) ?? []).length, 2);
});

test('overrides cannot change immutable published profile or baseline, even when disabled', () => {
  const doc = createDocument({ elements: [text('too-large', { fontSize: 12 })] });
  const next = applyCommands(doc, [{ type: 'rule', id: 'text-size', override: { enabled: false, value: { min: 1, max: 20 } } }]);
  const before = evaluateRules(doc); const after = evaluateRules(next);
  assert.deepEqual(after.baseline, before.baseline);
  assert.equal(check(after, 'text-size').status, 'problem');
  assert.equal(check(after, 'text-size', 'working').status, 'unverified');
  assert.deepEqual(PROFILES[0].rules[0].value, { min: 5, max: 7 });
  assert.throws(() => { PROFILES[0].rules[0].value.max = 20; }, TypeError);
});

test('working custom rules and thresholds remain separate from journal evidence', () => {
  const doc = createDocument({ elements: [text('label', { fontSize: 9 })], customRules: [{ id: 'own-height', label: 'Project maximum', kind: 'max-height', value: 100 }, { id: 'author-check', label: 'Author confirms', kind: 'manual', message: 'Confirm units.' }] });
  const next = applyCommands(doc, [{ type: 'rule', id: 'text-size', override: { value: { min: 5, max: 10 } } }]);
  const evaluated = evaluateRules(next);
  assert.equal(check(evaluated, 'text-size').status, 'problem');
  assert.equal(check(evaluated, 'text-size', 'working').status, 'passed');
  assert.equal(check(evaluated, 'own-height', 'working').status, 'problem');
  assert.equal(check(evaluated, 'author-check', 'working').status, 'manual');
  assert.equal(check(evaluated, 'own-height'), undefined);
});

test('rejects unknown custom checks, duplicate rules, arbitrary code and invalid thresholds', () => {
  for (const customRules of [[{ id: 'exec', label: 'exec', kind: 'eval', value: 'alert(1)' }], [{ id: 'text-size', label: 'Override', kind: 'manual' }], [{ id: 'bad-size', label: 'Bad', kind: 'text-size', value: { min: 7, max: 5 } }]]) assert.throws(() => createDocument({ customRules }));
  assert.throws(() => applyCommands(source(), [{ type: 'rule', id: 'unknown', override: { enabled: false } }]), /不存在/);
  assert.throws(() => applyCommands(source(), [{ type: 'rule', id: 'ai-policy', override: { value: 1 } }]), /不支持修改/);
});

test('panel label typography, final dimensions and standard fonts are checked', () => {
  const doc = createDocument({ canvas: { widthMm: 100, heightMm: 171 }, elements: [text('panel-label', { role: 'panel-label', text: 'A', fontSize: 8, fontWeight: 400 }), text('custom-font', { fontFamily: 'Fancy' })] });
  const evaluated = evaluateRules(doc);
  for (const id of ['panel-label-size', 'max-height', 'column-width', 'standard-font']) assert.equal(check(evaluated, id).status, 'problem');
  const corrected = applyCommands(doc, [{ type: 'update', id: 'panel-label', patch: { text: 'a', fontWeight: 'bold' } }]);
  assert.equal(check(evaluateRules(corrected), 'panel-label-size').status, 'passed');
});

test('photographic 300/450 dpi ambiguity stays manual; inadequate resolution is flagged', () => {
  const asset = png(20, 20);
  const doc = createDocument({ assets: { raster: asset }, elements: [{ id: 'photo', type: 'image', x: 0, y: 0, width: 1, height: 1, assetId: 'raster' }] });
  assert.equal(check(evaluateRules(doc), 'image-resolution').status, 'manual');
  assert.match(check(evaluateRules(doc), 'image-resolution').message, /300 dpi.*450 dpi/);
  assert.equal(check(evaluateRules(doc), 'rgb').status, 'manual');
  const low = applyCommands(doc, [{ type: 'update', id: 'photo', patch: { width: 20, height: 20 } }]);
  assert.equal(check(evaluateRules(low), 'image-resolution').status, 'problem');
});

test('scientific, policy and external-editor checks never turn into automatic acceptance', () => {
  const evaluated = evaluateRules(createDocument());
  assert.equal(check(evaluated, 'scientific-accuracy').status, 'manual');
  assert.equal(check(evaluated, 'ai-policy').status, 'unverified');
  assert.equal(check(evaluated, 'external-editability').status, 'unverified');
  assert.equal(check(evaluated, 'aesthetic-review').status, 'manual');
});

test('plan layout uses actual editable node text, bound edges and supplied content only', () => {
  const plan = { title: 'Author-defined flow', summary: '已核对的概述', nodes: [{ id: 'n1', label: 'Input A', detail: 'Author detail' }, { id: 'n2', label: 'Measured outcome' }], edges: [{ from: 'n1', to: 'n2', label: 'Recorded transition' }], notes: ['No new values.'] };
  const doc = documentFromPlan(plan);
  const allText = doc.elements.filter((e) => e.type === 'text').map((e) => e.text);
  assert.deepEqual(new Set(allText), new Set([plan.title, plan.summary, ...plan.nodes.flatMap((n) => [n.label, ...(n.detail ? [n.detail] : [])]), plan.edges[0].label, ...plan.notes]));
  assert.equal(doc.elements.filter((e) => e.type === 'image').length, 0);
  assert.equal(doc.elements.find((e) => e.type === 'arrow').fromId, 'node-n1');
  assert.equal(doc.elements.filter((e) => e.type === 'panel').length, 2);
  assert.deepEqual(validateDocument(doc), doc);
});

test('plan rejects unknown nodes, oversize node counts, invalid IDs and injected shape schema', () => {
  const plan = { title: 'Valid', nodes: [{ id: 'a', label: 'A' }], edges: [], notes: [] };
  assert.throws(() => documentFromPlan({ ...plan, edges: [{ from: 'a', to: 'missing' }] }), /不存在/);
  assert.throws(() => documentFromPlan({ ...plan, nodes: Array.from({ length: 13 }, (_, index) => ({ id: `n${index}`, label: 'N' })) }), /12/);
  assert.throws(() => documentFromPlan({ ...plan, nodes: [{ id: '__proto__', label: 'Bad' }] }), /ID/);
  assert.throws(() => documentFromPlan({ ...plan, rawSvg: '<svg/>' }), /结构/);
  assert.throws(() => documentFromPlan(plan, { canvas: { widthMm: 0 } }), /宽度/);
});

test('sample is explicitly labelled as an example and cannot be mistaken for research evidence', () => {
  const doc = createExampleDocument();
  assert.match(doc.title, /示例.*非研究结论/);
  assert.ok(doc.elements.some((e) => e.type === 'text' && /不构成已验证/.test(e.text)));
  assert.equal(doc.revision, 0);
});

test('null patch explicitly detaches optional references without persisting null fields', () => {
  const doc = createDocument({ elements: [rect('parent', { type: 'panel' }), rect('child', { parentId: 'parent' }), line('link', { fromId: 'child', toId: 'parent' })] });
  const changed = applyCommands(doc, [{ type: 'update', id: 'child', patch: { parentId: null } }, { type: 'update', id: 'link', patch: { fromId: null, toId: null } }]);
  assert.equal(Object.hasOwn(changed.elements[1], 'parentId'), false);
  assert.equal(Object.hasOwn(changed.elements[2], 'fromId'), false);
  assert.equal(Object.hasOwn(changed.elements[2], 'toId'), false);
  assert.throws(() => createDocument({ elements: [rect('bad', { parentId: null })] }), /ID/);
  assert.throws(() => applyCommands(doc, [{ type: 'update', id: 'child', patch: { width: null } }]));
});

test('planning retains canvas and user rules, choosing valid working font and size', () => {
  const options = { canvas: { widthMm: 89, heightMm: 150, background: '#fff' }, ruleOverrides: { 'text-size': { value: { min: 8, max: 10 } }, 'standard-font': { value: ['Helvetica'] } }, customRules: [{ id: 'review', kind: 'manual', label: 'Author review' }] };
  const doc = documentFromPlan({ title: 'Re-layout', nodes: [{ id: 'a', label: 'A', detail: 'detail' }] }, options);
  assert.deepEqual(doc.canvas, options.canvas);
  assert.deepEqual(doc.ruleOverrides, options.ruleOverrides);
  assert.deepEqual(doc.customRules, options.customRules);
  assert.ok(doc.elements.filter((e) => e.type === 'text').every((e) => e.fontFamily === 'Helvetica' && e.fontSize >= 8 && e.fontSize <= 10));
  assert.equal(check(evaluateRules(doc), 'text-size').status, 'problem');
  assert.equal(check(evaluateRules(doc), 'text-size', 'working').status, 'passed');
});

test('source strings reject malformed XML surrogate code points but retain emoji', () => {
  assert.throws(() => createDocument({ title: '\ud800' }), /有效文字/);
  assert.throws(() => createDocument({ elements: [text('bad', { text: '\udfff' })] }), /有效文字/);
  assert.match(renderSvg(createDocument({ title: '🧪', elements: [text('valid', { text: '研究 🧪' })] })), /研究 🧪/);
});

test('custom rule commands add, replace and remove user rules while preserving baseline', () => {
  const initial = source(); const baseline = evaluateRules(initial).baseline;
  const added = applyCommands(initial, [{ type: 'custom-rule', rule: { id: 'project-limit', label: '项目高度', kind: 'max-height', value: 100 } }, { type: 'rule', id: 'project-limit', override: { enabled: false } }]);
  assert.equal(check(evaluateRules(added), 'project-limit', 'working').status, 'unverified');
  const replaced = applyCommands(added, [{ type: 'custom-rule', rule: { id: 'project-limit', label: '高度更新', kind: 'max-height', value: 150 } }]);
  assert.equal(replaced.customRules.length, 1);
  assert.equal(replaced.ruleOverrides['project-limit'], undefined);
  assert.equal(check(evaluateRules(replaced), 'project-limit', 'working').status, 'passed');
  const removed = applyCommands(replaced, [{ type: 'remove-custom-rule', id: 'project-limit' }]);
  assert.equal(removed.customRules.length, 0);
  assert.deepEqual(evaluateRules(removed).baseline, baseline);
  assert.throws(() => applyCommands(initial, [{ type: 'custom-rule', rule: { id: 'max-height', label: 'replace official', kind: 'max-height', value: 500 } }]), /官方/);
  assert.throws(() => applyCommands(initial, [{ type: 'remove-custom-rule', id: 'max-height' }]), /官方/);
});

test('rule preset applies atomically, validates every rule and leaves source and official profiles intact', () => {
  const doc = source();
  const preset = { type: 'rule-preset', profileId: 'nature-main-final-v1', ruleOverrides: { 'max-height': { value: 80 } }, customRules: [{ id: 'unit-check', label: '单位检查', kind: 'manual' }] };
  const next = applyCommands(doc, [preset]);
  assert.equal(next.revision, 1);
  assert.deepEqual(next.elements, doc.elements);
  assert.deepEqual(next.canvas, doc.canvas);
  assert.equal(check(evaluateRules(next), 'max-height', 'working').status, 'problem');
  assert.equal(check(evaluateRules(next), 'max-height').status, 'passed');
  const before = structuredClone(doc);
  assert.throws(() => applyCommands(doc, [{ ...preset, customRules: [{ id: 'code', label: 'unsafe', kind: 'javascript', value: 'eval()' }] }]), /不受支持/);
  assert.throws(() => applyCommands(doc, [{ type: 'rule-preset', profileId: 'nature-main-final-v1' }]), /必须包含/);
  assert.deepEqual(doc, before);
  assert.equal(PROFILES[0].rules.find((rule) => rule.id === 'max-height').value, 170);
});

test('real PNG, JPEG, lossy WebP and lossless WebP files retain their embedded source bytes', () => {
  for (const [file, mimeType] of [['raster.png', 'image/png'], ['raster.jpg', 'image/jpeg'], ['raster.webp', 'image/webp'], ['raster-lossless.webp', 'image/webp']]) {
    const bytes = readFileSync(new URL(`./fixtures/${file}`, import.meta.url));
    const asset = { mimeType, pixelWidth: 2, pixelHeight: 2, dataUrl: `data:${mimeType};base64,${bytes.toString('base64')}` };
    const doc = createDocument({ assets: { raster: asset }, elements: [{ id: 'photo', type: 'image', x: 10, y: 10, width: 20, height: 20, assetId: 'raster' }] });
    assert.equal(doc.assets.raster.dataUrl, asset.dataUrl, file);
    assert.ok(renderSvg(doc).includes(asset.dataUrl), file);
    assert.throws(() => createDocument({ assets: { raster: { ...asset, pixelHeight: 3 } } }), /位图资产/, file);
    assert.throws(() => createDocument({ assets: { raster: { ...asset, dataUrl: `data:${mimeType};base64,${bytes.subarray(0, Math.floor(bytes.length / 2)).toString('base64')}` } } }), /位图资产/, file);
  }
});

test('multiple panels with absent or unbound labels cannot pass the panel-label check', () => {
  const doc = createDocument({ elements: [rect('panel-a', { type: 'panel' }), rect('panel-b', { type: 'panel', x: 40 })] });
  const missing = check(evaluateRules(doc), 'panel-label-size');
  assert.equal(missing.status, 'manual');
  assert.deepEqual(missing.objectIds, ['panel-a', 'panel-b']);
  const partial = applyCommands(doc, [{ type: 'add', element: text('label-a', { parentId: 'panel-a', role: 'panel-label', text: 'a', fontSize: 8, fontWeight: 700 }) }]);
  assert.equal(check(evaluateRules(partial), 'panel-label-size').status, 'manual');
  const full = applyCommands(partial, [{ type: 'add', element: text('label-b', { parentId: 'panel-b', role: 'panel-label', text: 'b', fontSize: 8, fontWeight: 700 }) }]);
  assert.equal(check(evaluateRules(full), 'panel-label-size').status, 'passed');
  assert.equal(check(evaluateRules(createExampleDocument()), 'panel-label-size').status, 'manual');
});

test('reused image payloads cannot amplify a small source into an unbounded SVG', () => {
  // A valid large ancillary PNG chunk increases payload without allocating a large bitmap.
  const original = Buffer.from(png().dataUrl.split(',')[1], 'base64');
  const payload = Buffer.concat([Buffer.from('tEXtComment\0'), Buffer.alloc(30000, 65)]);
  let crc = 0xffffffff;
  for (const byte of payload) { crc ^= byte; for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); }
  const length = Buffer.alloc(4); length.writeUInt32BE(payload.length - 4);
  const checksum = Buffer.alloc(4); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  const bytes = Buffer.concat([original.subarray(0, -12), length, payload, checksum, original.subarray(-12)]);
  const asset = { mimeType: 'image/png', dataUrl: `data:image/png;base64,${bytes.toString('base64')}`, pixelWidth: 1, pixelHeight: 1 };
  const elements = Array.from({ length: 400 }, (_, index) => ({ id: `image-${index}`, type: 'image', x: 0, y: 0, width: 1, height: 1, assetId: 'reused' }));
  assert.throws(() => createDocument({ assets: { reused: asset }, elements }), /重复放置/);
});

test('replace-content confirms large plans in one revision while retaining document identity and rules', () => {
  const doc = createDocument({ id: 'author-document', title: 'Original', canvas: { widthMm: 89, heightMm: 170 }, elements: Array.from({ length: 120 }, (_, index) => rect(`old-${index}`)), ruleOverrides: { 'max-height': { value: 150 } }, customRules: [{ id: 'author-check', label: 'Author check', kind: 'manual' }] });
  const elements = Array.from({ length: 130 }, (_, index) => text(`new-${index}`));
  const changed = applyCommands(doc, [{ type: 'replace-content', elements, assets: {}, title: 'Confirmed proposal' }]);
  assert.equal(changed.id, doc.id); assert.equal(changed.revision, doc.revision + 1);
  assert.equal(changed.title, 'Confirmed proposal'); assert.deepEqual(changed.elements, elements);
  assert.deepEqual(changed.canvas, doc.canvas); assert.equal(changed.profileId, doc.profileId);
  assert.deepEqual(changed.ruleOverrides, doc.ruleOverrides); assert.deepEqual(changed.customRules, doc.customRules);
  const before = structuredClone(doc);
  assert.throws(() => applyCommands(doc, [{ type: 'replace-content', elements: [text('duplicate'), text('duplicate')], assets: {} }]), /重复/);
  assert.throws(() => applyCommands(doc, [{ type: 'replace-content', elements, assets: {}, canvas: { widthMm: 100 } }]), /不支持/);
  assert.throws(() => applyCommands(doc, [{ type: 'replace-content', elements }]), /完整/);
  assert.deepEqual(doc, before);
});

test('auxiliary geometry check catches a large plan in a retained small canvas but never certifies aesthetics', () => {
  const plan = { title: 'Author flow', nodes: Array.from({ length: 12 }, (_, index) => ({ id: `node${index}`, label: `Step ${index}`, detail: '作者提供的具体方法与检查事项。' })) };
  const doc = documentFromPlan(plan, { canvas: { widthMm: 89, heightMm: 25 } });
  assert.equal(doc.canvas.heightMm, 25);
  const result = check(evaluateRules(doc), 'aesthetic-review');
  assert.equal(result.status, 'problem');
  assert.ok(result.objectIds.length > 0);
  assert.match(result.message, /图研辅助边界检查/);
  assert.match(result.message, /不是期刊原文/);
  const inBounds = createDocument({ elements: [rect('a'), text('t')] });
  assert.equal(check(evaluateRules(inBounds), 'aesthetic-review').status, 'manual');
  const moved = applyCommands(inBounds, [{ type: 'update', id: 'a', patch: { x: -1 } }]);
  assert.deepEqual(check(evaluateRules(moved), 'aesthetic-review').objectIds, ['a']);
  const connector = createDocument({ elements: [line('edge', { x1: -1, y1: 5, x2: 10, y2: 5 })] });
  assert.deepEqual(check(evaluateRules(connector), 'aesthetic-review').objectIds, ['edge']);
});
