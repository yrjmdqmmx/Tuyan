import assert from 'node:assert/strict';
import test from 'node:test';

import {
  REFERENCE_METADATA_ZH_CN,
  REFERENCE_METADATA_ZH_CN_VERSION,
} from '../src/data/reference-metadata.zh-CN.v1.js';

const containsChinese = (value) => /[\u3400-\u9fff]/u.test(String(value || ''));

test('zh-CN v1 metadata covers every one of the 295 PaperBananaBench diagram references', () => {
  assert.equal(REFERENCE_METADATA_ZH_CN_VERSION, '2026-08-19.v1');
  assert.equal(REFERENCE_METADATA_ZH_CN.length, 295);

  const ids = REFERENCE_METADATA_ZH_CN.map((item) => item.id);
  assert.equal(new Set(ids).size, 295, 'reference IDs must be unique');

  for (const item of REFERENCE_METADATA_ZH_CN) {
    assert.ok(item.id.trim(), 'every item needs a stable ID');
    assert.ok(containsChinese(item.titleZh), `${item.id} needs a Chinese title`);
    assert.ok(containsChinese(item.introZh), `${item.id} needs a Chinese introduction`);
    assert.ok(item.introZh.length <= 72, `${item.id} introduction must stay concise`);
  }
});

test('Chinese introductions are item-specific rather than one generic repeated sentence', () => {
  const intros = REFERENCE_METADATA_ZH_CN.map((item) => item.introZh.trim());
  const frequencies = new Map();
  for (const intro of intros) frequencies.set(intro, (frequencies.get(intro) || 0) + 1);

  assert.ok(new Set(intros).size >= 280, 'at least 280 of 295 intros must be distinct');
  assert.ok(Math.max(...frequencies.values()) <= 2, 'no intro may be reused more than twice');
});
