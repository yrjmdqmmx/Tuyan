import test from 'node:test';
import assert from 'node:assert/strict';
import { assertRequiredRuntimeChecks, compareExtractedText } from '../scripts/verify-figure-runtime.mjs';

const correct = 'Input 123\nOutput 456\nExplicit α β ≥ 10 μm\n中文注释\nLatin α β ≥ 10 μm\nMixed 中文注释 α β ≥ 10 μm';
const report = (pdf = correct, eps = correct) => ({ sharpWebpToPng: true, formats: Object.fromEntries([['pdf', pdf], ['eps', eps]].map(([format, text]) => {
  const checks = compareExtractedText(text);
  return [format, { parsedAndRendered: true, text: checks, textCompatibilityPassed: Object.values(checks).every(Boolean) }];
})) });

test('runtime acceptance checks exact scientific symbols, values and Chinese rather than visual similarity', () => {
  assert.deepEqual(compareExtractedText(correct), { latin: true, chinese: true, scientificSymbols: true, latinFontScientificSymbols: true, defaultFontMixed: true });
  assert.equal(compareExtractedText(correct.replace('α β ≥', '\u0001 \u0002 \u0003')).scientificSymbols, false);
  assert.equal(compareExtractedText(correct.replace('10 μm', '100 um')).scientificSymbols, false);
  assert.equal(compareExtractedText(correct.replaceAll('文', '⽂')).chinese, false);
});

test('PDF missing text fails runtime acceptance even when parsing and rendering succeeded', () => {
  assert.throws(() => assertRequiredRuntimeChecks(report(correct.replace('μ', '\u0004'))), /PDF scientificSymbols/);
  assert.throws(() => assertRequiredRuntimeChecks(report(correct.replaceAll('中文注释', ''))), /PDF chinese/);
  assert.throws(() => assertRequiredRuntimeChecks(report(correct.replace('Latin α', 'Latin a'))), /PDF latinFontScientificSymbols/);
  assert.throws(() => assertRequiredRuntimeChecks(report(correct.replace('Mixed 中文', 'Mixed 中⽂'))), /PDF defaultFontMixed/);
});

test('known EPS encoding failure remains explicit and cannot be relabeled a compatibility pass', () => {
  const result = report(correct, correct.replace('α β ≥', '\u0001 \u0002 \u0003'));
  assertRequiredRuntimeChecks(result);
  assert.equal(result.formats.eps.textCompatibilityPassed, false);
  result.formats.eps.textCompatibilityPassed = true;
  assert.throws(() => assertRequiredRuntimeChecks(result), /eps compatibility result is inconsistent/);
});

test('EPS parse failure and the existing sharp conversion regression remain blocking', () => {
  const parseFailure = report();
  parseFailure.formats.eps.parsedAndRendered = false;
  assert.throws(() => assertRequiredRuntimeChecks(parseFailure), /EPS parser/);
  const sharpFailure = report();
  sharpFailure.sharpWebpToPng = false;
  assert.throws(() => assertRequiredRuntimeChecks(sharpFailure), /WebP-to-PNG/);
});
