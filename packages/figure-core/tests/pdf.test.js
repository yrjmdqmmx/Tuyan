import test from 'node:test';
import assert from 'node:assert/strict';
import { createDocument, renderPdfSvg, renderSvg } from '../src/index.js';

test('PDF conversion input isolates labels at the unchanged page boundary without changing source SVG', () => {
  const doc = createDocument({ canvas: { widthMm: 89, heightMm: 70, background: '#ffffff' }, elements: [
    { id: 'box', type: 'panel', x: 0, y: 0, width: 89, height: 70 },
    { id: 'left', type: 'text', parentId: 'box', x: -2, y: 0, width: 25, height: 6, text: '中文 α β ≥ 10 μm', fontSize: 6 },
    { id: 'right', type: 'text', x: 82, y: 66, width: 20, height: 6, text: 'Edge & value', fontSize: 7 },
  ] });
  const before = JSON.stringify(doc), canonical = renderSvg(doc), pdf = renderPdfSvg(doc);
  assert.equal(JSON.stringify(doc), before);
  assert.equal(renderSvg(doc), canonical);
  assert.doesNotMatch(canonical, /clipPath|clip-path/);
  assert.match(pdf, /width="89mm" height="70mm" viewBox="0 0 89 70"/);
  assert.match(pdf, /<clipPath id="tuyan-pdf-page-boundary" clipPathUnits="userSpaceOnUse"><rect x="0" y="0" width="89" height="70"\/>/);
  assert.equal((pdf.match(/clip-path="url\(#tuyan-pdf-page-boundary\)"/g) || []).length, 2);
  for (const id of ['left', 'right']) assert.ok(pdf.includes(`<g clip-path="url(#tuyan-pdf-page-boundary)"><g id="object-${id}"`));
  assert.match(pdf, /中文 α β ≥ 10 μm/);
  assert.match(pdf, /Edge &amp; value/);
  assert.match(pdf, /<rect x="0" y="0" width="89" height="70" fill="#ffffff"\/>/);
  assert.doesNotMatch(pdf, /<path\b|<image\b/);
});

test('PDF rendering keeps the same document validation boundary, including unsupported transforms', () => {
  const doc = createDocument({ elements: [{ id: 'label', type: 'text', x: 0, y: 0, width: 20, height: 6, text: 'label' }] });
  assert.throws(() => renderPdfSvg({ ...doc, elements: [{ ...doc.elements[0], transform: 'rotate(45)' }] }));
});
