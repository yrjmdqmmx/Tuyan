const specifications = 'https://research-figure-guide.nature.com/figures/preparing-figures-our-specifications/';
const panels = 'https://research-figure-guide.nature.com/figures/building-and-exporting-figure-panels/';
const finalSubmission = 'https://www.nature.com/nature/for-authors/final-submission';
const imageIntegrity = 'https://research-figure-guide.nature.com/figures/image-integrity/';
const aiPolicy = 'https://www.nature.com/nature-portfolio/editorial-policies/ai';

function deepFreeze(value) {
  Object.values(value).forEach((child) => {
    if (child && typeof child === 'object') deepFreeze(child);
  });
  return Object.freeze(value);
}

/** Versioned evidence, not a claim of journal acceptance. Overrides live in documents. */
export const PROFILES = deepFreeze([{
  id: 'nature-main-final-v1',
  label: 'Nature 主图 · 最终尺寸',
  scope: 'Nature 主图最终制作；不涵盖 Extended Data 与其他期刊',
  checkedAt: '2026-09-23',
  evidenceVersion: '2026-09-23',
  sources: [specifications, panels, finalSubmission, imageIntegrity, aiPolicy],
  sourceWarnings: [
    '仅适用于 Nature 主图最终制作；final submission 指原稿原则上接收后、编辑要求上传制作文件的阶段，不自动适用于初投、Extended Data、Science 或其他子刊。',
    '官方摄影图段落要求至少 300 dpi，导出段落写至少 450 dpi；按最终放置尺寸检查，并向编辑部确认图种对应要求。',
    'Nature 图件指南禁止在图中使用任何生成式 AI；Nature Portfolio AI 页面采用风险框架。后者不能视作对具体 AI 图件的许可，需按实际用途及投稿日期人工确认。',
    '官方主图文件格式页面存在差异：本配置支持可编辑矢量图稿，不据此确认纯位图主图或所有格式均被接受。',
  ],
  rules: [
    { id: 'text-size', label: '普通文字 5–7 pt', kind: 'text-size', value: { min: 5, max: 7 }, level: 'requirement', sourceUrl: specifications },
    { id: 'panel-label-size', label: '面板标签 8 pt、粗体直立小写', kind: 'panel-label-size', value: 8, level: 'requirement', sourceUrl: specifications },
    { id: 'max-height', label: '主图高度不超过 170 mm', kind: 'max-height', value: 170, level: 'requirement', sourceUrl: panels },
    { id: 'column-width', label: '常用栏宽 89 / 183 mm', kind: 'column-width', value: [89, 183], coverage: 'examples', level: 'recommendation', sourceUrl: finalSubmission },
    { id: 'standard-font', label: '无衬线字体与特殊用途', kind: 'standard-font', value: ['Arial', 'Helvetica'], coverage: 'examples', level: 'requirement', sourceUrl: specifications },
    { id: 'rgb', label: 'RGB 色彩', kind: 'rgb', level: 'recommendation', sourceUrl: specifications },
    { id: 'text-editable', label: '文字保持独立可编辑', kind: 'text-editable', level: 'requirement', sourceUrl: specifications },
    { id: 'image-resolution', label: '位图最终尺寸分辨率', kind: 'image-resolution', level: 'manual', sourceUrl: specifications },
    { id: 'scientific-accuracy', label: '科学内容与因果关系', kind: 'manual', level: 'manual', message: '需作者逐项核对研究内容、数值、单位、图例与因果关系；结构校验不能确认科学正确性。' },
    { id: 'ai-policy', label: '目标期刊 AI 与图像政策', kind: 'manual', level: 'manual', sourceUrl: imageIntegrity, message: '2026-09-23 核对：Nature 图件指南禁止在图中使用任何生成式 AI，包括内容感知编辑；Nature Portfolio AI 页面另采用风险、透明披露与人工责任框架。不能据此自动允许本图，需按实际生成/编辑方式和投稿日期向编辑部确认。技术格式通过不代表 AI 政策通过。' },
    { id: 'aesthetic-review', label: '排版、线宽、可读性与无障碍', kind: 'manual', level: 'manual', sourceUrl: finalSubmission, message: 'Nature final submission 给出的最终线宽为 0.25–1 pt；需人工核验线、箭头、轮廓及导出后的线宽，同时按最终尺寸检查文字重叠、阅读顺序、颜色区分、对比度、比例尺和图例。对象结构可解析不代表这些项目通过。' },
    { id: 'external-editability', label: '外部编辑器保存再打开', kind: 'unverified', level: 'manual', sourceUrl: panels, message: 'SVG 保留独立对象和文字，但仍需在目标编辑器分别验证外观、字体、对象选择、修改及保存后重开。' },
  ],
}]);

export const CUSTOM_RULE_KINDS = Object.freeze(['text-size', 'panel-label-size', 'max-height', 'column-width', 'standard-font', 'min-dpi', 'manual']);
