export const KNOWLEDGE_VERSION = '1.0.0';
export const KNOWLEDGE_MAJOR = 1;

export const VISUAL_CATEGORIES = Object.freeze([
  'method_framework',
  'workflow',
  'system_architecture',
  'mechanism',
  'comparison',
  'timeline',
  'data_stat',
  'concept_map',
]);

export const OPERATIONS = Object.freeze(['create', 'refine', 'evaluate']);
export const OUTPUT_FORMATS = Object.freeze(['png', 'svg']);
export const LOCALES = Object.freeze(['zh-CN', 'en-US']);

export const PAPERBANANA_BENCH_DIAGRAM_IDS = Object.freeze([
  240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255, 256,
  257, 258, 259, 260, 261, 262, 263, 264, 265, 266, 267, 268, 269, 270, 271, 272, 273,
  274, 275, 276, 278, 279, 280, 281, 282, 283, 285, 286, 287, 288, 289, 290, 291, 292,
  293, 294, 295, 296, 297, 298, 299, 301, 302, 303, 304, 305, 306, 307, 308,
].map((index) => `ref_${index}`));

const zhCN = {
  method_framework: {
    label: '方法框架图',
    description: '呈现研究问题、核心模块、信息流与贡献之间的整体方法结构。',
    requiredChecks: ['模块层级清晰', '箭头语义一致', '论文术语准确'],
  },
  workflow: {
    label: '流程图',
    description: '按时间或决策顺序呈现步骤、分支、输入和输出。',
    requiredChecks: ['起止点明确', '步骤顺序无歧义', '分支条件完整'],
  },
  system_architecture: {
    label: '系统架构图',
    description: '呈现组件边界、部署层次、接口以及数据或控制流。',
    requiredChecks: ['组件边界明确', '接口方向准确', '层次与部署关系一致'],
  },
  mechanism: {
    label: '机制示意图',
    description: '解释实体、过程和因果机制如何共同产生研究现象。',
    requiredChecks: ['因果方向准确', '实体标注一致', '机制链条完整'],
  },
  comparison: {
    label: '对比图',
    description: '在共同维度下并列比较方法、条件、阶段或结果。',
    requiredChecks: ['比较维度对齐', '视觉权重公平', '差异结论可追溯'],
  },
  timeline: {
    label: '时间线',
    description: '按可核验的时间顺序呈现事件、阶段、里程碑或演进。',
    requiredChecks: ['时间顺序准确', '时间尺度一致', '里程碑标签可读'],
  },
  data_stat: {
    label: '数据统计图',
    description: '以可复现代码将结构化数据渲染为定量图表。',
    requiredChecks: ['数值逐项一致', '单位与坐标准确', '图例映射无误'],
  },
  concept_map: {
    label: '概念关系图',
    description: '呈现概念之间的分类、依赖、包含或语义关系。',
    requiredChecks: ['关系类型明确', '概念层级稳定', '交叉连接可辨认'],
  },
};

const enUS = {
  method_framework: {
    label: 'Method framework',
    description: 'Shows the research problem, core modules, information flow, and contributions as one method structure.',
    requiredChecks: ['Clear module hierarchy', 'Consistent arrow semantics', 'Exact paper terminology'],
  },
  workflow: {
    label: 'Workflow',
    description: 'Shows steps, branches, inputs, and outputs in temporal or decision order.',
    requiredChecks: ['Explicit start and end', 'Unambiguous step order', 'Complete branch conditions'],
  },
  system_architecture: {
    label: 'System architecture',
    description: 'Shows component boundaries, deployment layers, interfaces, and data or control flow.',
    requiredChecks: ['Explicit component boundaries', 'Correct interface direction', 'Consistent layers and deployment'],
  },
  mechanism: {
    label: 'Mechanism illustration',
    description: 'Explains how entities, processes, and causal mechanisms produce the studied phenomenon.',
    requiredChecks: ['Correct causal direction', 'Consistent entity labels', 'Complete mechanism chain'],
  },
  comparison: {
    label: 'Comparison figure',
    description: 'Compares methods, conditions, stages, or outcomes against shared dimensions.',
    requiredChecks: ['Aligned comparison dimensions', 'Balanced visual weight', 'Traceable differences'],
  },
  timeline: {
    label: 'Timeline',
    description: 'Shows events, phases, milestones, or evolution in a verifiable chronological order.',
    requiredChecks: ['Correct chronology', 'Consistent time scale', 'Readable milestone labels'],
  },
  data_stat: {
    label: 'Statistical chart',
    description: 'Renders structured data as a quantitative chart with reproducible code.',
    requiredChecks: ['Exact numeric values', 'Correct units and axes', 'Accurate legend mapping'],
  },
  concept_map: {
    label: 'Concept map',
    description: 'Shows classification, dependency, containment, or semantic relationships among concepts.',
    requiredChecks: ['Explicit relationship types', 'Stable concept hierarchy', 'Legible cross-links'],
  },
};

export const CATEGORY_CATALOG = Object.freeze({ 'zh-CN': Object.freeze(zhCN), 'en-US': Object.freeze(enUS) });

export const PAPERBANANA_BENCH_MANIFEST = Object.freeze({
  id: 'paperbanana-bench',
  version: 1,
  upstream: 'https://huggingface.co/datasets/dwzhu/PaperBananaBench',
  revision: 'a876264bcd1e826a0320f805f8fb1cd705cf510f',
  archivePath: 'PaperBananaBench.zip',
  archiveBytes: 265846711,
  archiveSha256: 'a980d23954c0cb47017cdaa8a9029dbea3598791fd269a457482033821927e37',
  expectedReferenceCount: 306,
  sourceCounts: Object.freeze({ diagram: 298, plot: 240 }),
  expectedCounts: Object.freeze({ diagram: 66, plot: 240 }),
  selection: Object.freeze({
    plotIds: 'ref_0..ref_239',
    diagramIds: PAPERBANANA_BENCH_DIAGRAM_IDS,
  }),
  licenseDeclared: false,
});

function datasetInvalid(reason) {
  const error = new Error(`DATASET_VALIDATION_FAILED: ${reason}`);
  error.code = 'DATASET_VALIDATION_FAILED';
  throw error;
}

function rowsById(rows, label, expectedCount) {
  if (!Array.isArray(rows) || rows.length !== expectedCount) {
    datasetInvalid(`${label} source must contain exactly ${expectedCount} records`);
  }
  const index = new Map();
  for (const row of rows) {
    const id = String(row?.id || '');
    if (!id || index.has(id)) datasetInvalid(`${label} source contains a missing or duplicate id`);
    index.set(id, row);
  }
  return index;
}

export function selectPaperBananaBenchReferences({ plotRows, diagramRows } = {}) {
  const plots = rowsById(plotRows, 'plot', 240);
  const diagrams = rowsById(diagramRows, 'diagram', 298);
  const plotIds = Array.from({ length: 240 }, (_, index) => `ref_${index}`);
  const missing = [
    ...plotIds.filter((id) => !plots.has(id)),
    ...PAPERBANANA_BENCH_DIAGRAM_IDS.filter((id) => !diagrams.has(id)),
  ];
  if (missing.length) datasetInvalid(`missing selected ids: ${missing.join(', ')}`);
  return [
    ...plotIds.map((id) => ({ ...plots.get(id), taskName: 'plot' })),
    ...PAPERBANANA_BENCH_DIAGRAM_IDS.map((id) => ({ ...diagrams.get(id), taskName: 'diagram' })),
  ];
}
