const specifications = 'https://research-figure-guide.nature.com/figures/preparing-figures-our-specifications/';
const panels = 'https://research-figure-guide.nature.com/figures/building-and-exporting-figure-panels/';

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
  checkedAt: '2026-09-21',
  sources: [specifications, panels],
  rules: [
    { id: 'text-size', label: '普通文字 5–7 pt', kind: 'text-size', value: { min: 5, max: 7 }, level: 'requirement', sourceUrl: specifications },
    { id: 'panel-label-size', label: '面板标签 8 pt、粗体小写', kind: 'panel-label-size', value: 8, level: 'requirement', sourceUrl: specifications },
    { id: 'max-height', label: '主图高度不超过 170 mm', kind: 'max-height', value: 170, level: 'requirement', sourceUrl: panels },
    { id: 'column-width', label: '单栏 89 / 双栏 183 mm', kind: 'column-width', value: [89, 183], level: 'recommendation', sourceUrl: panels },
    { id: 'standard-font', label: '标准字体', kind: 'standard-font', value: ['Arial', 'Helvetica', 'Courier', 'Symbol'], level: 'requirement', sourceUrl: specifications },
    { id: 'rgb', label: 'RGB 色彩', kind: 'rgb', level: 'recommendation', sourceUrl: specifications },
    { id: 'text-editable', label: '文字保持独立可编辑', kind: 'text-editable', level: 'requirement', sourceUrl: specifications },
    { id: 'image-resolution', label: '位图最终尺寸分辨率', kind: 'image-resolution', level: 'manual', sourceUrl: specifications },
    { id: 'scientific-accuracy', label: '科学内容与因果关系', kind: 'manual', level: 'manual', message: '需作者逐项核对研究内容、数值、单位、图例与因果关系；结构校验不能确认科学正确性。' },
    { id: 'ai-policy', label: '目标期刊 AI 与图像政策', kind: 'unverified', level: 'manual', message: '尚未核验目标期刊在投稿日期适用的 AI 使用、披露和图像政策。此格式配置不能代替政策核对。' },
    { id: 'aesthetic-review', label: '排版、可读性与无障碍', kind: 'manual', level: 'manual', sourceUrl: panels, message: '需按最终印刷尺寸检查文字重叠、阅读顺序、颜色区分、对比度、比例尺和图例。' },
    { id: 'external-editability', label: '外部编辑器保存再打开', kind: 'unverified', level: 'manual', sourceUrl: panels, message: 'SVG 保留独立对象和文字，但仍需在目标编辑器分别验证外观、字体、对象选择、修改及保存后重开。' },
  ],
}]);

export const CUSTOM_RULE_KINDS = Object.freeze(['text-size', 'panel-label-size', 'max-height', 'column-width', 'standard-font', 'min-dpi', 'manual']);
