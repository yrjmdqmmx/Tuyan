import test from 'node:test';
import assert from 'node:assert/strict';
import { createDocument, evaluateRules, PROFILES, validateDocument } from '../src/index.js';

const text = (fontFamily, id = 'label') => ({ id, type: 'text', x: 1, y: 1, width: 50, height: 10, text: 'Research label', fontSize: 6, fontFamily, fontWeight: 400, color: '#000000', role: 'label' });
const check = (doc, id, scope = 'baseline') => evaluateRules(doc)[scope].find((entry) => entry.id === id);

test('Nature preferred font examples pass without claiming an exhaustive official whitelist', () => {
  const doc = createDocument({ elements: [text('Arial'), text('Helvetica', 'second')] });
  assert.equal(check(doc, 'standard-font').status, 'passed');
  assert.match(check(doc, 'standard-font').message, /不是完整字体白名单/);
});

test('Nature unclassified and special-purpose fonts require author review rather than false acceptance or rejection', () => {
  for (const family of ['Courier', 'Symbol', 'Arial Unicode MS', 'Fancy', 'Times New Roman']) {
    const result = check(createDocument({ elements: [text(family)] }), 'standard-font');
    assert.equal(result.status, 'manual', family);
    assert.deepEqual(result.objectIds, ['label']);
    assert.match(result.message, /Courier.*氨基酸.*Symbol.*希腊/);
  }
});

test('explicit working font whitelist is strict while the official interpretation stays independent', () => {
  const doc = createDocument({ elements: [text('Courier')], ruleOverrides: { 'standard-font': { value: ['Courier'] } } });
  assert.equal(check(doc, 'standard-font').status, 'manual');
  assert.equal(check(doc, 'standard-font', 'working').status, 'passed');
  const mismatch = createDocument({ elements: [text('Arial')], ruleOverrides: doc.ruleOverrides });
  assert.equal(check(mismatch, 'standard-font').status, 'passed');
  assert.equal(check(mismatch, 'standard-font', 'working').status, 'problem');
  assert.deepEqual(validateDocument(JSON.parse(JSON.stringify(doc))), doc);
});

test('enabling or disabling a font rule alone does not turn official examples into a whitelist', () => {
  const doc = createDocument({ elements: [text('Fancy')], ruleOverrides: { 'standard-font': { enabled: true } } });
  assert.equal(check(doc, 'standard-font', 'working').status, 'manual');
  doc.ruleOverrides['standard-font'].enabled = false;
  assert.equal(check(doc, 'standard-font', 'working').status, 'unverified');
  assert.equal(check(doc, 'standard-font').status, 'manual');
});

test('custom font lists remain strict independent of Nature example coverage', () => {
  const doc = createDocument({ elements: [text('Arial')], customRules: [{ id: 'own-fonts', label: 'Own font list', kind: 'standard-font', value: ['Helvetica'] }] });
  assert.equal(check(doc, 'own-fonts', 'working').status, 'problem');
  assert.equal(check(doc, 'standard-font').status, 'passed');
});

test('Nature alternative widths are reviewable and explicit working dimensions remain strict', () => {
  for (const widthMm of [89, 183]) assert.equal(check(createDocument({ canvas: { widthMm } }), 'column-width').status, 'passed');
  for (const widthMm of [100, 120, 125, 136]) {
    const doc = createDocument({ canvas: { widthMm } });
    assert.equal(check(doc, 'column-width').status, 'manual');
    assert.match(check(doc, 'column-width').message, /120–136/);
    doc.ruleOverrides['column-width'] = { value: [89, 183] };
    assert.equal(check(doc, 'column-width', 'working').status, 'problem');
  }
});

test('Nature evidence dates, policy conflict and manual line inspection never imply acceptance', () => {
  const profile = PROFILES.find((entry) => entry.id === 'nature-main-final-v1');
  assert.equal(profile.checkedAt, '2026-09-23');
  assert.equal(profile.evidenceVersion, profile.checkedAt);
  assert.ok(profile.sources.includes('https://www.nature.com/nature/for-authors/final-submission'));
  assert.ok(profile.sourceWarnings.some((warning) => /生成式 AI/.test(warning)));
  assert.ok(profile.sourceWarnings.some((warning) => /300 dpi.*450 dpi/.test(warning)));
  const doc = createDocument();
  assert.equal(check(doc, 'ai-policy').status, 'manual');
  assert.match(check(doc, 'ai-policy').message, /不能据此自动允许/);
  assert.equal(check(doc, 'aesthetic-review').status, 'manual');
  assert.match(check(doc, 'aesthetic-review').message, /0\.25–1 pt/);
  assert.equal(PROFILES.some((entry) => /science/i.test(entry.id)), false);
});
