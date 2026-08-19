import assert from 'node:assert/strict';
import test from 'node:test';

import { localizeReference } from '../src/referenceLocalization.js';

const containsChinese = (value) => /[\u3400-\u9fff]/u.test(String(value || ''));

test('known PaperBananaBench IDs use versioned Chinese metadata without replacing English search fields', () => {
  const localized = localizeReference({
    id: 'ref_1',
    title: 'English title for search',
    summary: 'English summary for search',
  });

  assert.equal(localized.title, 'English title for search');
  assert.equal(localized.summary, 'English summary for search');
  assert.match(localized.titleZh, /epsilon-Seg/u);
  assert.ok(containsChinese(localized.introZh));
});

test('server-provided Chinese metadata takes precedence over the bundled version', () => {
  const localized = localizeReference({
    id: 'ref_1',
    title: 'English title',
    summary: 'English summary',
    titleZh: '服务端中文标题',
    introZh: '服务端中文简介。',
  });

  assert.equal(localized.titleZh, '服务端中文标题');
  assert.equal(localized.introZh, '服务端中文简介。');
});

test('historical unknown IDs receive concise deterministic Chinese fallback copy', () => {
  const reference = {
    id: 'legacy-42',
    title: 'Cross-modal Retrieval Pipeline',
    summary: 'A staged architecture for matching image and text representations.',
  };
  const first = localizeReference(reference);
  const second = localizeReference(reference);

  assert.deepEqual(first, second);
  assert.ok(containsChinese(first.titleZh));
  assert.ok(containsChinese(first.introZh));
  assert.ok(first.introZh.length <= 72);
  assert.equal(first.title, reference.title);
  assert.equal(first.summary, reference.summary);
});
