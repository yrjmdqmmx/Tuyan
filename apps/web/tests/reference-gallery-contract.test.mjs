import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readSource = (relativePath) => readFileSync(new URL(relativePath, import.meta.url), 'utf8');

test('generic dialog implements modal semantics, topmost Escape, backdrop close, and focus restoration', () => {
  const source = readSource('../src/components/AccessibleDialog.jsx');

  assert.match(source, /role="dialog"/u);
  assert.match(source, /aria-modal="true"/u);
  assert.match(source, /event\.key === 'Escape'/u);
  assert.match(source, /dialogStack\.at\(-1\)/u);
  assert.match(source, /event\.target === event\.currentTarget/u);
  assert.match(source, /previousFocusRef\.current\?\.focus/u);
  assert.match(source, /event\.key [!=]==? 'Tab'/u);
  assert.match(source, /onCloseRef\.current\(\)/u);
  assert.match(source, /\}, \[open\]\);/u);
  assert.match(source, /querySelector\('\[data-autofocus\]'\)\s*\|\|/u);
});

test('large-image preview reuses the generic accessible dialog', () => {
  const source = readSource('../src/components/ImagePreviewDialog.jsx');

  assert.match(source, /<AccessibleDialog/u);
  assert.match(source, /aria-label="关闭大图预览"/u);
  assert.match(source, /<img/u);
  assert.match(source, /item\?\.titleZh/u);
});

test('reference cards separate preview and selection with article and button semantics', () => {
  const source = readSource('../src/components/ReferenceLibraryPanel.jsx');

  assert.match(source, /localizeReferences/u);
  assert.match(source, /<article/u);
  assert.match(source, /aria-pressed=/u);
  assert.match(source, />\s*选用\s*</u);
  assert.match(source, /预览大图/u);
  assert.match(source, /打开参考图库/u);
  assert.match(source, /<ImagePreviewDialog/u);
});

test('App requests the complete gallery and CSS provides wide desktop plus mobile layouts', () => {
  const appSource = readSource('../src/App.jsx');
  const cssSource = readSource('../src/styles.css');

  assert.match(appSource, /referenceLibraryRequest[\s\S]*limit:\s*295/u);
  assert.match(cssSource, /\.reference-gallery-dialog\s*\{[\s\S]*width:\s*min\(1480px,/u);
  assert.match(cssSource, /\.reference-library-grid\s*\{[\s\S]*repeat\(auto-fill,\s*minmax\(260px,\s*1fr\)\)/u);
  assert.match(cssSource, /@media\s*\(max-width:\s*720px\)[\s\S]*\.reference-gallery-dialog/u);
  assert.match(cssSource, /\.image-preview-dialog\s*\{/u);
});
