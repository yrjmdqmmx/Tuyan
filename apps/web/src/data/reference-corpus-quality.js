export const PAPERBANANA_BENCH_V2_DIAGRAM_NUMBERS = Object.freeze([
  240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255, 256,
  257, 258, 259, 260, 261, 262, 263, 264, 265, 266, 267, 268, 269, 270, 271, 272, 273,
  274, 275, 276, 278, 279, 280, 281, 282, 283, 285, 286, 287, 288, 289, 290, 291, 292,
  293, 294, 295, 296, 297, 298, 299, 301, 302, 303, 304, 305, 306, 307, 308,
]);

export const PAPERBANANA_BENCH_V2_IDS = Object.freeze([
  ...Array.from({ length: 240 }, (_, index) => `ref_${index}`),
  ...PAPERBANANA_BENCH_V2_DIAGRAM_NUMBERS.map((index) => `ref_${index}`),
]);

const EXPECTED_ID_SET = new Set(PAPERBANANA_BENCH_V2_IDS);
const REQUIRED_TEXT_FIELDS = [
  'id', 'taskName', 'titleZh', 'shortIntroZh', 'detailZh', 'visualCategory', 'researchDomain',
];
const containsChinese = (value) => /[\u3400-\u9fff]/u.test(String(value || ''));
const latinShare = (value) => {
  const text = String(value || '').replace(/\s/gu, '');
  return text ? (text.match(/[A-Za-z]/gu)?.length || 0) / text.length : 0;
};
const looksLikeKeywordProse = (value) => {
  const text = String(value || '').trim();
  return /(?:^#{1,6}\s*|\b(?:as shown in|we (?:propose|present|introduce)|figure\s*\d|table\s*\d|section\s*\d)\b|(?:^|\s)\d+(?:\.\d+)*\s+(?:method|methods|introduction|results?|discussion)\b)/iu.test(text)
    || (text.split(/\s+/u).length > 10 && /[.,;:]/u.test(text));
};

export function normalizeVisibleSentenceStructure(sentence, item) {
  let normalized = String(sentence || '');
  const replacements = [
    [item?.titleZh ? `「${item.titleZh}」` : '', '「标题」'],
    [item?.titleZh || '', '标题'],
    [item?.visualCategory || '', '图类'],
    [item?.researchDomain || '', '领域'],
    ...[...(item?.keywords || [])].sort((left, right) => String(right).length - String(left).length).map((keyword) => [String(keyword), '关键词']),
  ];
  for (const [token, replacement] of replacements) if (token) normalized = normalized.replaceAll(token, replacement);
  return normalized
    .replace(/\b[A-Za-z][A-Za-z0-9_.+/-]*\b/gu, '术语')
    .replace(/\d+(?:\.\d+)?/gu, '数字')
    .replace(/\s+/gu, '')
    .replace(/「标题」以.+?为观察重点，图类结合.+?呈现.+?[。！？]$/u, '「标题」以主题为观察重点，图类结合字段呈现关系。')
    .replace(/源图围绕.+?组织.+?，通过图类的位置、分组与图例设计说明.+?[。！？]$/u, '源图围绕主题组织字段，通过图类说明关系。')
    .replace(/在.+?的表达中，画面将主要差异与辅助信息分层展开.+?[。！？]$/u, '在主题表达中，画面分层展开信息。')
    .replace(/「标题」围绕.+?展开，图类突出.+?及模块间的信息流向[。！？]$/u, '「标题」围绕主题展开，图类突出关系与信息流向。')
    .replace(/源图以.+?为主线，依据原始方法内容将.+?拆解为可跟踪的步骤与模块[。！？]$/u, '源图以主题为主线，将关系拆解为步骤与模块。')
    .replace(/为了说明.+?的实现路径，画面利用分层、连接和强调关系区分.+?[。！？]$/u, '为了说明主题的实现路径，画面用视觉关系区分流程。');
}

export function validateReferenceCorpusV2(corpus) {
  const errors = [];
  if (!Array.isArray(corpus)) return [{ code: 'invalid_corpus', message: 'corpus must be an array' }];

  const frequencies = new Map();
  for (const item of corpus) {
    const id = String(item?.id || '').trim();
    frequencies.set(id, (frequencies.get(id) || 0) + 1);
  }
  for (const id of PAPERBANANA_BENCH_V2_IDS) {
    if (!frequencies.has(id)) errors.push({ code: 'missing_id', id, message: `${id} is missing` });
  }
  for (const [id, count] of frequencies) {
    if (count > 1) errors.push({ code: 'duplicate_id', id, message: `${id} occurs ${count} times` });
    if (id && !EXPECTED_ID_SET.has(id)) errors.push({ code: 'unexpected_id', id, message: `${id} is not part of v2` });
  }

  const introFrequencies = new Map();
  const sentenceFrequencies = new Map();
  const sentenceStructureFrequencies = new Map();
  for (const item of corpus) {
    const id = String(item?.id || '').trim() || '(unknown)';
    for (const field of REQUIRED_TEXT_FIELDS) {
      if (!String(item?.[field] || '').trim()) errors.push({ code: 'empty_facet', id, field, message: `${id}.${field} is empty` });
    }
    if (!String(item?.title || '').trim() || !String(item?.summary || '').trim()) {
      errors.push({ code: 'empty_english', id, message: `${id} must preserve source English title and summary` });
    }
    if (!Array.isArray(item?.keywords) || item.keywords.length < 2 || item.keywords.some((keyword) => !String(keyword).trim())) {
      errors.push({ code: 'empty_keywords', id, message: `${id}.keywords needs at least two nonempty values` });
    } else {
      if (item.keywords.some((keyword) => String(keyword).length > 60)) {
        errors.push({ code: 'long_keyword', id, message: `${id}.keywords must not exceed 60 characters` });
      }
      if (item.keywords.some(looksLikeKeywordProse)) {
        errors.push({ code: 'prose_keyword', id, message: `${id}.keywords cannot contain prose or section excerpts` });
      }
    }
    if (item?.taskName && item.taskName !== 'plot' && item.taskName !== 'diagram') {
      errors.push({ code: 'invalid_task', id, message: `${id}.taskName is invalid` });
    }
    if (item?.taskName === 'plot' && !/^ref_(?:[0-9]|[1-9][0-9]|1[0-9]{2}|2[0-3][0-9])$/u.test(id)) {
      errors.push({ code: 'wrong_split', id, message: `${id} cannot be a plot` });
    }
    if (item?.taskName === 'diagram' && !PAPERBANANA_BENCH_V2_DIAGRAM_NUMBERS.includes(Number(id.slice(4)))) {
      errors.push({ code: 'wrong_split', id, message: `${id} cannot be a diagram` });
    }
    for (const field of ['titleZh', 'shortIntroZh', 'detailZh']) {
      if (item?.[field] && !containsChinese(item[field])) errors.push({ code: 'missing_chinese', id, field, message: `${id}.${field} needs Chinese copy` });
    }
    const shortIntro = String(item?.shortIntroZh || '').trim();
    const detail = String(item?.detailZh || '').trim();
    const title = String(item?.titleZh || '').trim();
    if (title.length > 64) errors.push({ code: 'long_title', id, message: `${id}.titleZh is too long` });
    if (shortIntro.length < 24 || !/[。！？]$/u.test(shortIntro)) errors.push({ code: 'short_intro', id, message: `${id}.shortIntroZh is incomplete` });
    if (shortIntro.length > 120) errors.push({ code: 'long_intro', id, message: `${id}.shortIntroZh is too long` });
    if (detail.length < 64 || !/[。！？]$/u.test(detail)) errors.push({ code: 'short_detail', id, message: `${id}.detailZh is incomplete` });
    if (/^聚焦/u.test(shortIntro)) errors.push({ code: 'focus_prefix', id, message: `${id}.shortIntroZh starts with 聚焦` });
    if (/党与党的|相关数量|并相关行性/u.test(`${shortIntro}${detail}`)) {
      errors.push({ code: 'unnatural_copy', id, message: `${id} contains a known unnatural machine phrase` });
    }
    if (/(?:\.\.\.|…)/u.test(`${item?.titleZh || ''}${shortIntro}${detail}`)) errors.push({ code: 'ellipsis', id, message: `${id} contains an ellipsis placeholder` });
    if (latinShare(title) > 0.45 || latinShare(shortIntro) > 0.35 || latinShare(detail) > 0.25) {
      errors.push({ code: 'latin_leakage', id, message: `${id} leaks excessive source English into visible Chinese copy` });
    }
    if (shortIntro) introFrequencies.set(shortIntro, (introFrequencies.get(shortIntro) || 0) + 1);
    for (const sentence of `${shortIntro}${detail}`.split(/(?<=[。！？])/u).map((value) => value.trim()).filter((value) => value.length >= 12)) {
      sentenceFrequencies.set(sentence, (sentenceFrequencies.get(sentence) || 0) + 1);
      const structure = normalizeVisibleSentenceStructure(sentence, item);
      sentenceStructureFrequencies.set(structure, (sentenceStructureFrequencies.get(structure) || 0) + 1);
    }
  }
  for (const [intro, count] of introFrequencies) {
    if (count > 1) errors.push({ code: 'generic_intro', message: `introduction is reused ${count} times`, value: intro });
  }
  for (const [sentence, count] of sentenceFrequencies) {
    if (count > 2) errors.push({ code: 'generic_sentence', message: `visible sentence is reused ${count} times`, value: sentence });
  }
  for (const [structure, count] of sentenceStructureFrequencies) {
    if (count > 2) errors.push({ code: 'generic_structure', message: `visible sentence structure is reused ${count} times`, value: structure });
  }
  if (corpus.filter(({ taskName }) => taskName === 'plot').length !== 240) {
    errors.push({ code: 'wrong_split_count', taskName: 'plot', message: 'v2 needs exactly 240 plots' });
  }
  if (corpus.filter(({ taskName }) => taskName === 'diagram').length !== 66) {
    errors.push({ code: 'wrong_split_count', taskName: 'diagram', message: 'v2 needs exactly 66 diagrams' });
  }
  return errors;
}
