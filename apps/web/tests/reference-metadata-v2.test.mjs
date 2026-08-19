import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PAPERBANANA_BENCH_COMMIT,
  REFERENCE_METADATA_ZH_CN_V2,
  REFERENCE_METADATA_ZH_CN_V2_BY_ID,
  REFERENCE_METADATA_ZH_CN_V2_VERSION,
} from '../src/data/reference-metadata.zh-CN.v2.js';
import { validateReferenceCorpusV2 } from '../src/data/reference-corpus-quality.js';
import { buildReferenceCorpusV2, renderReferenceCorpusModule } from '../scripts/build-reference-metadata-zh-CN-v2.mjs';

const DIAGRAM_NUMBERS = [
  240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255, 256,
  257, 258, 259, 260, 261, 262, 263, 264, 265, 266, 267, 268, 269, 270, 271, 272, 273,
  274, 275, 276, 278, 279, 280, 281, 282, 283, 285, 286, 287, 288, 289, 290, 291, 292,
  293, 294, 295, 296, 297, 298, 299, 301, 302, 303, 304, 305, 306, 307, 308,
];
const EXPECTED_IDS = [
  ...Array.from({ length: 240 }, (_, index) => `ref_${index}`),
  ...DIAGRAM_NUMBERS.map((index) => `ref_${index}`),
];
const PREVIOUSLY_MISSING_IDS = [
  'ref_169', 'ref_158', 'ref_148', 'ref_147', 'ref_78', 'ref_71',
  'ref_63', 'ref_56', 'ref_46', 'ref_37', 'ref_0',
];
const containsChinese = (value) => /[\u3400-\u9fff]/u.test(String(value || ''));
const latinShare = (value) => {
  const text = String(value || '').replace(/\s/gu, '');
  return text ? (text.match(/[A-Za-z]/gu)?.length || 0) / text.length : 0;
};
const visibleSentences = (item) => `${item.shortIntroZh}${item.detailZh}`
  .split(/(?<=[。！？])/u)
  .map((sentence) => sentence.trim())
  .filter((sentence) => sentence.length >= 12);

test('zh-CN v2 materializes the exact fixed 306-case PaperBananaBench corpus', () => {
  assert.equal(REFERENCE_METADATA_ZH_CN_V2_VERSION, 'zh-CN.v2');
  assert.equal(PAPERBANANA_BENCH_COMMIT, 'a876264bcd1e826a0320f805f8fb1cd705cf510f');
  assert.equal(REFERENCE_METADATA_ZH_CN_V2.length, 306);
  assert.equal(REFERENCE_METADATA_ZH_CN_V2_BY_ID.size, 306);

  const ids = REFERENCE_METADATA_ZH_CN_V2.map(({ id }) => id);
  assert.equal(new Set(ids).size, 306, 'reference IDs must be unique');
  assert.deepEqual(ids, EXPECTED_IDS, 'IDs and ordering must match the fixed production corpus');
  for (const id of PREVIOUSLY_MISSING_IDS) assert.ok(REFERENCE_METADATA_ZH_CN_V2_BY_ID.has(id), `${id} must be restored`);

  assert.equal(REFERENCE_METADATA_ZH_CN_V2.filter(({ taskName }) => taskName === 'plot').length, 240);
  assert.equal(REFERENCE_METADATA_ZH_CN_V2.filter(({ taskName }) => taskName === 'diagram').length, 66);
});

test('every entry has complete Chinese copy and useful nonempty facets', () => {
  const intros = new Map();
  for (const item of REFERENCE_METADATA_ZH_CN_V2) {
    for (const field of ['id', 'taskName', 'titleZh', 'shortIntroZh', 'detailZh', 'visualCategory', 'researchDomain']) {
      assert.ok(String(item[field] || '').trim(), `${item.id}.${field} must be nonempty`);
    }
    assert.ok(Array.isArray(item.keywords) && item.keywords.length >= 2, `${item.id}.keywords needs at least two facets`);
    assert.ok(item.keywords.every((keyword) => String(keyword).trim()), `${item.id}.keywords cannot contain blanks`);
    assert.ok(containsChinese(item.titleZh), `${item.id}.titleZh must contain Chinese`);
    assert.ok(containsChinese(item.shortIntroZh), `${item.id}.shortIntroZh must contain Chinese`);
    assert.ok(containsChinese(item.detailZh), `${item.id}.detailZh must contain Chinese`);
    assert.ok(item.shortIntroZh.length >= 24, `${item.id}.shortIntroZh is truncated`);
    assert.ok(item.titleZh.length <= 64, `${item.id}.titleZh is too long for gallery UI`);
    assert.ok(item.shortIntroZh.length <= 120, `${item.id}.shortIntroZh is not short`);
    assert.ok(item.detailZh.length >= 64, `${item.id}.detailZh is truncated`);
    assert.match(item.shortIntroZh, /[。！？]$/u, `${item.id}.shortIntroZh must be a complete sentence`);
    assert.match(item.detailZh, /[。！？]$/u, `${item.id}.detailZh must be a complete sentence`);
    assert.doesNotMatch(item.shortIntroZh, /^聚焦/u, `${item.id}.shortIntroZh cannot begin with “聚焦”`);
    assert.doesNotMatch(`${item.titleZh}${item.shortIntroZh}${item.detailZh}`, /(?:\.\.\.|…)/u, `${item.id} cannot contain ellipsis placeholders`);
    assert.ok(latinShare(item.titleZh) <= 0.45, `${item.id}.titleZh leaks too much source English`);
    assert.ok(latinShare(item.shortIntroZh) <= 0.35, `${item.id}.shortIntroZh leaks too much source English`);
    assert.ok(latinShare(item.detailZh) <= 0.25, `${item.id}.detailZh leaks too much source English`);
    intros.set(item.shortIntroZh, (intros.get(item.shortIntroZh) || 0) + 1);
  }
  assert.equal(Math.max(...intros.values()), 1, 'short introductions must remain item-specific');
});

test('quality validator rejects corpus mutations that would weaken v2', () => {
  const clone = () => REFERENCE_METADATA_ZH_CN_V2.map((item) => ({ ...item, keywords: [...item.keywords] }));
  assert.deepEqual(validateReferenceCorpusV2(clone()), []);

  const mutations = [
    ['missing_id', (items) => items.slice(1)],
    ['duplicate_id', (items) => [...items, { ...items[0] }]],
    ['short_intro', (items) => items.map((item, index) => index ? item : { ...item, shortIntroZh: '过短。' })],
    ['short_detail', (items) => items.map((item, index) => index ? item : { ...item, detailZh: '过短。' })],
    ['empty_facet', (items) => items.map((item, index) => index ? item : { ...item, visualCategory: '' })],
    ['empty_keywords', (items) => items.map((item, index) => index ? item : { ...item, keywords: [] })],
    ['long_title', (items) => items.map((item, index) => index ? item : { ...item, titleZh: '过长标题'.repeat(20) })],
    ['latin_leakage', (items) => items.map((item, index) => index ? item : { ...item, detailZh: `${'English template leakage '.repeat(10)}中文结尾。` })],
    ['generic_sentence', (items) => items.map((item, index) => index < 3 ? { ...item, detailZh: `这是一句被多个条目复用的通用模板文案。${item.detailZh}` } : item)],
  ];
  for (const [expectedCode, mutate] of mutations) {
    const codes = validateReferenceCorpusV2(mutate(clone())).map(({ code }) => code);
    assert.ok(codes.includes(expectedCode), `mutation must trigger ${expectedCode}; received ${codes.join(', ')}`);
  }
});

test('visible copy does not hide generic repeated sentences inside unique paragraphs', () => {
  const frequencies = new Map();
  for (const item of REFERENCE_METADATA_ZH_CN_V2) {
    for (const sentence of visibleSentences(item)) frequencies.set(sentence, (frequencies.get(sentence) || 0) + 1);
  }
  const repeated = [...frequencies].filter(([, count]) => count > 2);
  assert.deepEqual(repeated, [], `visible sentences reused more than twice: ${JSON.stringify(repeated.slice(0, 5))}`);
});

test('builder is deterministic and keeps source English alongside generated Chinese metadata', () => {
  const plot = [{
    id: 'ref_0',
    content: { Year: ['2025'], Revenue: [10] },
    visual_intent: 'A line chart titled Annual Revenue Trend',
    original_category: 'line',
    category: 'business',
  }];
  const diagram = [{
    id: 'ref_240',
    content: '# Method\nA two-stage encoder and decoder.',
    visual_intent: 'Figure 1: An encoder-decoder research pipeline.',
    category: 'vision_perception',
    additional_info: { file_name: 'Reliable Vision Pipeline.pdf' },
  }];
  const legacy = [{ id: 'ref_240', titleZh: '可靠视觉流水线', introZh: '聚焦「可靠视觉流水线」，展示编码器与解码器的两阶段协作。' }];
  const options = { plotReferences: plot, diagramReferences: diagram, diagramIds: ['ref_240'], legacyMetadata: legacy };
  const first = buildReferenceCorpusV2(options);
  const second = buildReferenceCorpusV2(options);

  assert.deepEqual(first, second);
  assert.equal(first[0].taskName, 'plot');
  assert.equal(first[1].taskName, 'diagram');
  assert.equal(first[1].titleZh, '可靠视觉流水线');
  assert.doesNotMatch(first[1].shortIntroZh, /^聚焦/u);
  assert.equal(first[0].title, 'Annual Revenue Trend');
  assert.equal(first[0].summary, plot[0].visual_intent);
  assert.equal(renderReferenceCorpusModule(first), renderReferenceCorpusModule(second));
});
