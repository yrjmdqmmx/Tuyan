import { REFERENCE_METADATA_ZH_CN_BY_ID } from './data/reference-metadata.zh-CN.v1.js';

const TOPIC_RULES = [
  [/retriev|matching|cross[- ]modal|multimodal/iu, '跨模态检索'],
  [/agent|reasoning|planning|decision/iu, '智能体推理'],
  [/generat|diffusion|flow matching|gan\b/iu, '生成学习'],
  [/segment|detect|recognition|vision|image/iu, '视觉感知'],
  [/graph|network|node|edge/iu, '图结构学习'],
  [/protein|molecul|medical|clinical|science/iu, '科学应用'],
  [/compress|quantiz|efficient|accelerat/iu, '高效模型'],
  [/3d|4d|spatial|scene|reconstruct/iu, '空间建模'],
];

const cleanText = (value) => String(value || '').replace(/\s+/gu, ' ').trim();
const containsChinese = (value) => /[\u3400-\u9fff]/u.test(value);

function truncate(value, maxLength) {
  const text = cleanText(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…`;
}

function historicalFallback(reference) {
  const title = cleanText(reference.title) || cleanText(reference.id) || '未命名参考';
  const searchableCopy = `${title} ${cleanText(reference.summary)}`;
  const topic = TOPIC_RULES.find(([pattern]) => pattern.test(searchableCopy))?.[1] || '学术图示';
  const titleZh = containsChinese(title) ? title : `历史参考｜${truncate(title, 42)}`;
  const anchor = truncate(title, 26);
  const introZh = truncate(`这是一则${topic}案例，聚焦「${anchor}」的主要模块与信息关系。`, 72);
  return { titleZh, introZh };
}

export function localizeReference(reference = {}) {
  const bundled = REFERENCE_METADATA_ZH_CN_BY_ID.get(cleanText(reference.id));
  const fallback = historicalFallback(reference);
  return {
    ...reference,
    titleZh: cleanText(reference.titleZh || reference.title_zh) || bundled?.titleZh || fallback.titleZh,
    introZh: cleanText(reference.introZh || reference.intro_zh) || bundled?.introZh || fallback.introZh,
  };
}

export function localizeReferences(references = []) {
  return references.map(localizeReference);
}
