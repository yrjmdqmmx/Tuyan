import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createDocument, documentFromPlan, evaluateRules, generationContextFromDocument, MAX_GENERATION_CONTEXT_BYTES, PROFILES } from '../src/index.js';

const plan = { title: 'Confirmed flow', nodes: [{ id: 'a', label: 'Input' }, { id: 'b', label: 'Output' }], edges: [{ from: 'a', to: 'b' }] };
const rule = (id, kind, value, extra = {}) => ({ id, label: id, kind, ...(value === undefined ? {} : { value }), ...extra });

test('generation context is document-bound, bounded, detached and contains no source text or raster data', () => {
  const bytes = readFileSync(new URL('./fixtures/raster.png', import.meta.url));
  const source = createDocument({ id: 'context-source', revision: 4, title: 'private source title', assets: { photo: { mimeType: 'image/png', pixelWidth: 2, pixelHeight: 2, dataUrl: `data:image/png;base64,${bytes.toString('base64')}` } }, elements: [{ id: 'private-label', type: 'text', x: 1, y: 1, width: 10, height: 5, text: 'private source label' }] });
  const before = JSON.stringify(source), context = generationContextFromDocument(source);
  assert.equal(context.version, 1); assert.equal(context.scope, 'document');
  assert.deepEqual(context.document, { id: source.id, revision: 4, canvas: source.canvas });
  const serialized = JSON.stringify(context);
  assert.ok(Buffer.byteLength(serialized) <= MAX_GENERATION_CONTEXT_BYTES);
  assert.doesNotMatch(serialized, /base64|private source title|private source label|private-label/);
  context.officialBaseline.rules[0].value.min = 100;
  context.document.canvas.heightMm = 999;
  assert.equal(JSON.stringify(source), before);
  assert.equal(PROFILES[0].rules.find((r) => r.id === 'text-size').value.min, 5);
});

test('overrides, disabled checks and custom rules never overwrite official evidence', () => {
  const source = createDocument({ ruleOverrides: { 'text-size': { enabled: false, value: { min: 9, max: 12 } } }, customRules: [rule('project-text', 'text-size', { min: 10, max: 11 }), rule('review', 'manual', undefined, { message: 'Author confirms units' })] });
  const context = generationContextFromDocument(source);
  assert.deepEqual(context.officialBaseline.rules.find((r) => r.id === 'text-size').value, { min: 5, max: 7 });
  assert.equal(context.officialBaseline.rules.some((r) => r.id === 'review'), false);
  const working = context.working.rules.find((r) => r.id === 'text-size');
  assert.equal(working.enabled, false); assert.equal(working.overridden, true); assert.equal(working.origin, 'official');
  assert.equal(context.working.rules.find((r) => r.id === 'review').origin, 'custom');
  assert.deepEqual(context.constraints.textSizePt, { min: 10, max: 11 });
  assert.ok(context.limitations.some((line) => /科学事实/.test(line)));
});

test('rule intersections reject contradictory typography before generation, including explicit font overrides', () => {
  const cases = [
    { customRules: [rule('large', 'text-size', { min: 10, max: 12 })] },
    { customRules: [rule('panel', 'panel-label-size', 9)] },
    { ruleOverrides: { 'standard-font': { value: ['Arial'] } }, customRules: [rule('font', 'standard-font', ['Helvetica'])] },
    { customRules: [rule('unsafe-font', 'standard-font', ['font;url(bad)'])] },
  ];
  for (const options of cases) assert.throws(() => generationContextFromDocument(createDocument(options)), /生成规则冲突/);
});

test('official examples guide defaults while a custom font can require another font and canvas dimensions stay explicit', () => {
  const options = { canvas: { widthMm: 120, heightMm: 180 }, customRules: [rule('project-font', 'standard-font', ['Times New Roman'])] };
  const context = generationContextFromDocument(createDocument(options));
  assert.equal(context.constraints.fontFamily, 'Times New Roman');
  assert.equal(context.officialBaseline.rules.find((r) => r.id === 'standard-font').coverage, 'examples');
  assert.equal(context.constraints.canvasWarnings.length, 2);
  const doc = documentFromPlan(plan, options);
  assert.equal(doc.canvas.widthMm, 120); assert.equal(doc.canvas.heightMm, 180);
  const conflictingWidths = { ...options, customRules: [rule('width-a', 'column-width', [90]), rule('width-b', 'column-width', [120])] };
  assert.ok(generationContextFromDocument(createDocument(conflictingWidths)).constraints.canvasWarnings.some((message) => /没有交集/.test(message)));
  assert.equal(documentFromPlan(plan, conflictingWidths).canvas.widthMm, 120);
  assert.ok(doc.elements.filter((e) => e.type === 'text').every((e) => e.fontFamily === 'Times New Roman'));
  assert.equal(evaluateRules(doc).baseline.find((c) => c.id === 'max-height').status, 'problem');
});

test('plan layout applies enabled custom text and panel constraints, preserving every supplied label', () => {
  const options = { canvas: { widthMm: 183, heightMm: 110 }, ruleOverrides: { 'text-size': { enabled: false }, 'panel-label-size': { value: 9 } }, customRules: [rule('project-size', 'text-size', { min: 10, max: 11 }), rule('project-font', 'standard-font', ['Helvetica'])] };
  const doc = documentFromPlan(plan, options);
  const labels = doc.elements.filter((e) => e.type === 'text');
  assert.ok(labels.filter((e) => e.role !== 'panel-label').every((e) => e.fontSize >= 10 && e.fontSize <= 11));
  assert.deepEqual(labels.filter((e) => e.role === 'panel-label').map((e) => [e.text, e.fontSize, e.fontWeight]), [['a', 9, 700], ['b', 9, 700]]);
  assert.deepEqual(labels.filter((e) => e.role !== 'panel-label').map((e) => e.text), ['Confirmed flow', 'Input', 'Output']);
  const results = evaluateRules(doc);
  assert.equal(results.baseline.find((c) => c.id === 'text-size').status, 'problem');
  assert.equal(results.working.find((c) => c.id === 'project-size').status, 'passed');
  assert.equal(results.working.find((c) => c.id === 'panel-label-size').status, 'passed');
});

test('unfitting layouts fail without shrinking fonts, changing source canvas or weakening rules', () => {
  const options = { canvas: { widthMm: 89, heightMm: 20 }, ruleOverrides: { 'text-size': { value: { min: 12, max: 12 } } } };
  const before = structuredClone(options);
  assert.throws(() => documentFromPlan(plan, options), /无法容纳/);
  assert.deepEqual(options, before);
  assert.throws(() => documentFromPlan(plan, { customRules: [rule('short', 'max-height', 20)] }), /最大高度/);
  const auto = documentFromPlan(plan, { customRules: [rule('single', 'column-width', [89])] });
  assert.equal(auto.canvas.widthMm, 89); assert.ok(auto.canvas.heightMm <= 170);
});

test('oversized user rule descriptions fail explicitly instead of silently truncating model context', () => {
  const customRules = Array.from({ length: 30 }, (_, i) => rule(`review-${i}`, 'manual', undefined, { message: '字'.repeat(1000) }));
  assert.throws(() => generationContextFromDocument(createDocument({ customRules })), /64 KiB/);
});
