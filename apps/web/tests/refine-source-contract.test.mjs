import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../src/components/RefinePanel.jsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const refineSource = readFileSync(new URL('../src/lib/refineSource.js', import.meta.url), 'utf8');

test('refine uses a file uploader or owned results instead of arbitrary URL input', () => {
  assert.doesNotMatch(source, /<input[^>]+value=\{sourceUrl\}/u);
  assert.doesNotMatch(source, /https:\/\/\.\.\.|data:image/u);
  assert.match(source, /type="file"/u);
  assert.match(source, /onDrop=/u);
  assert.match(source, /onOpenRecords/u);
  assert.match(source, /onOpenGenerate/u);
  assert.match(source, /<img[^>]+src=\{source.url\}/u);
});

test('refine submits the authoritative object key and displays server model capability', () => {
  assert.match(app, /normalizeRefineSource\(url, image\)/u);
  assert.match(app, /refineRequestSource/u);
  assert.match(refineSource, /sourceImageObjectKey/u);
  assert.match(source, /直接编辑/u);
  assert.match(source, /分析后重绘/u);
  assert.match(source, /capability/u);
});

test('private workspace cleanup clears the complete refine source without a removed setter', () => {
  assert.match(app, /setRefineSource\(\{ url: '', objectKey: '' \}\)/u);
  assert.doesNotMatch(app, /setRefineSourceUrl/u);
});
