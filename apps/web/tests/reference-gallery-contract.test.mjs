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

test('App requests paginated bench results and CSS provides 3/2/1 responsive layouts', () => {
  const appSource = readSource('../src/App.jsx');
  const cssSource = readSource('../src/styles.css');

  assert.match(appSource, /buildReferencePageRequest/u);
  assert.match(appSource, /referenceLibraryRequest\(apiBaseNormalized, health, \{ \.\.\.request, signal:/u);
  assert.match(cssSource, /\.reference-library-grid\s*\{[\s\S]*repeat\(3,\s*minmax\(0,\s*1fr\)\)/u);
  assert.match(cssSource, /\.reference-library-grid\s*\{[\s\S]*grid-auto-rows:\s*max-content/u);
  assert.match(cssSource, /@media\s*\(max-width:\s*1100px\)[\s\S]*\.reference-library-grid[\s\S]*repeat\(2,/u);
  assert.match(cssSource, /@media\s*\(max-width:\s*720px\)[\s\S]*\.reference-gallery-dialog/u);
  assert.match(cssSource, /@media\s*\(max-width:\s*720px\)[\s\S]*\.reference-library-grid[\s\S]*grid-template-columns:\s*1fr/u);
  assert.match(cssSource, /\.reference-card-image-button img\s*\{[\s\S]*object-fit:\s*contain/u);
  assert.match(cssSource, /\.image-preview-dialog\s*\{/u);
});

test('gallery exposes facets, corpus metadata, persistent tray and complete preview controls', () => {
  const gallery = readSource('../src/components/ReferenceLibraryPanel.jsx');
  const preview = readSource('../src/components/ImagePreviewDialog.jsx');
  assert.match(gallery, /corpusVersion/u);
  assert.match(gallery, /visualCategories/u);
  assert.match(gallery, /researchDomains/u);
  assert.match(gallery, /reference-selection-tray/u);
  assert.match(gallery, /清空/u);
  assert.match(gallery, /确认选择/u);
  assert.match(gallery, /总计.*totalItems/u);
  assert.match(preview, /放大/u);
  assert.match(preview, /缩小/u);
  assert.match(preview, /重置/u);
  assert.match(preview, /onWheel/u);
  assert.match(preview, /detailZh/u);
  assert.match(preview, /keywords/u);
  assert.match(preview, /英文原文/u);
  assert.match(preview, /上一张/u);
  assert.match(preview, /下一张/u);
})
