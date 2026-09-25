import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createExampleDocument, renderSvg } from '@paperbanana/figure-core';
import { inspectExportedSvg } from './svgInspection.js';

test('downloaded SVG dimensions and native text are inspected independently of the source claims', () => {
  const previous = globalThis.DOMParser;
  globalThis.DOMParser = new JSDOM('').window.DOMParser;
  try {
    const source = createExampleDocument(), svg = renderSvg(source);
    const inspect = value => inspectExportedSvg(value, source);
    assert.ok(inspect(svg).every(row => row.status === 'passed'));
    assert.equal(inspect(svg.replace('width="183mm"', 'width="184mm"')).find(row => row.id === 'file-page-size').status, 'unverified');
    const resized = svg.replace('width="183mm"', 'width="184mm"').replace(/viewBox="0 0 183 /, 'viewBox="0 0 184 ');
    assert.equal(inspect(resized).find(row => row.id === 'file-page-size').status, 'problem');
    const outlined = svg.replace(/<text[^>]*>[\s\S]*?<\/text>/, '<path d="M0 0L1 1"/>');
    assert.equal(inspect(outlined).find(row => row.id === 'svg-independent-objects').status, 'problem');
    assert.equal(inspect(outlined).find(row => row.id === 'file-text-properties').status, 'problem');
    assert.equal(inspect(svg.replace(/font-size="[^"]+"/, 'font-size="40"')).find(row => row.id === 'file-text-properties').status, 'problem');
    assert.equal(inspect(svg.replace('<g', '<g transform="scale(2)"'))[0].status, 'unverified');
    assert.equal(inspect(svg.slice(0, -12))[0].status, 'problem');
  } finally { globalThis.DOMParser = previous; }
});
