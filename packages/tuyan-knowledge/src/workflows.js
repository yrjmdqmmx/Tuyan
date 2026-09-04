import {
  CATEGORY_CATALOG,
  KNOWLEDGE_MAJOR,
  KNOWLEDGE_VERSION,
  LOCALES,
  OPERATIONS,
  OUTPUT_FORMATS,
  VISUAL_CATEGORIES,
} from './catalog.js';
import { sha256Canonical } from './hash.js';

const workflowText = {
  'zh-CN': {
    create: {
      title: '创建科研图示',
      stages: ['本地读取研究材料', '确认视觉类别', '编写 FigureSpec', '可选本地检索参考案例', '生成或代码渲染', '定性评审与精修', '写入本地可复现包'],
    },
    refine: {
      title: '精修科研图示',
      stages: ['本地检查现有图与 FigureSpec', '记录目标修改和非目标保持项', '可选本地检索参考案例', '执行局部编辑', '核对保持项', '定性评审', '写入本地可复现包'],
    },
    evaluate: {
      title: '评审科研图示',
      stages: ['本地读取图示与 FigureSpec', '核对内容忠实度', '核对逻辑与可读性', '核对布局与视觉层级', '记录定性问题和证据', '给出继续、完成或停止结论'],
    },
    commonRules: [
      '论文、图片、提示词和产物不得发送到图研 MCP。',
      '论文术语、逻辑关系和标签必须可追溯到本地输入。',
      '优先保证忠实、清晰和可读，再优化视觉风格。',
      '位图不得改后缀或包裹后伪装成 SVG。',
    ],
    dataRules: ['逐项核对数值，不得改写原始数据。', '单位、坐标范围、刻度和图例映射必须准确。', '同时保存原始数据、绘图代码、PNG 和真 SVG。'],
  },
  'en-US': {
    create: {
      title: 'Create a scientific figure',
      stages: ['Read research material locally', 'Confirm the visual category', 'Write FigureSpec', 'Optionally retrieve local references', 'Generate or render with code', 'Run qualitative critique and refinement', 'Write the local reproducibility bundle'],
    },
    refine: {
      title: 'Refine a scientific figure',
      stages: ['Inspect the existing figure and FigureSpec locally', 'Record target changes and non-target preservation', 'Optionally retrieve local references', 'Apply a localized edit', 'Verify preservation', 'Run qualitative critique', 'Write the local reproducibility bundle'],
    },
    evaluate: {
      title: 'Evaluate a scientific figure',
      stages: ['Read the figure and FigureSpec locally', 'Check content fidelity', 'Check logic and legibility', 'Check layout and visual hierarchy', 'Record qualitative issues with evidence', 'Decide whether to continue, finalize, or stop'],
    },
    commonRules: [
      'Never send papers, images, prompts, or artifacts to the Tuyan MCP.',
      'Paper terminology, logical relationships, and labels must trace to local inputs.',
      'Prioritize fidelity, clarity, and legibility before visual style.',
      'Never disguise a bitmap as SVG by renaming or wrapping it.',
    ],
    dataRules: ['Verify every numeric value without rewriting source data.', 'Keep units, axis ranges, ticks, and legend mappings exact.', 'Save source data, plotting code, PNG, and true SVG together.'],
  },
};

export const WORKFLOW_CONTRACT = Object.freeze({
  executionDefaults: Object.freeze({
    defaultAspectRatio: '16:9',
    defaultResolution: '1K',
    bitmapAsSvgForbidden: true,
    noImageCapabilityFallback: 'figure-spec-only',
  }),
  retriever: Object.freeze({
    optional: true,
    consentRequiredBeforeFirstDownload: true,
    failureIsBlocking: false,
    datasetResource: 'tuyan://datasets/paperbanana-bench/v1',
    selectionCount: 'agent-decides',
  }),
  stopPolicy: Object.freeze({
    critiqueRounds: 'agent-decides',
    stopWhen: Object.freeze(['no-material-issue', 'capability-unavailable', 'two-rounds-no-improvement']),
    consecutiveNoImprovementRounds: 2,
  }),
  schemas: Object.freeze({
    figureSpec: 'tuyan://schemas/figure-spec/v1',
    critiqueRecord: 'tuyan://schemas/critique-record/v1',
    outputBundle: 'tuyan://schemas/output-bundle/v1',
  }),
  localOutput: './tuyan-output/<timestamp>-<slug>/',
});

function invalid(reason) {
  const error = new TypeError(`INVALID_WORKFLOW_INPUT: ${reason}`);
  error.code = 'INVALID_WORKFLOW_INPUT';
  throw error;
}

export function validateWorkflowInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) invalid('object required');
  const expectedKeys = ['knowledgeMajor', 'locale', 'operation', 'outputFormat', 'visualCategory'];
  const keys = Object.keys(input).sort();
  if (keys.length !== expectedKeys.length || keys.some((key, index) => key !== expectedKeys[index])) {
    invalid('exact fields required');
  }
  if (!OPERATIONS.includes(input.operation)) invalid('unknown operation');
  if (!VISUAL_CATEGORIES.includes(input.visualCategory)) invalid('unknown visual category');
  if (!OUTPUT_FORMATS.includes(input.outputFormat)) invalid('unknown output format');
  if (!LOCALES.includes(input.locale)) invalid('unknown locale');
  if (input.knowledgeMajor !== KNOWLEDGE_MAJOR) invalid('unsupported knowledge major');
  return { ...input };
}

export function getWorkflowBundle(rawInput) {
  const input = validateWorkflowInput(rawInput);
  const text = workflowText[input.locale];
  const category = CATEGORY_CATALOG[input.locale][input.visualCategory];
  const dataStat = input.visualCategory === 'data_stat';
  const rules = [...text.commonRules, ...category.requiredChecks];
  if (dataStat) rules.push(...text.dataRules);

  const bundle = {
    knowledge: { major: KNOWLEDGE_MAJOR, version: KNOWLEDGE_VERSION },
    workflow: {
      title: text[input.operation].title,
      operation: input.operation,
      visualCategory: input.visualCategory,
      categoryLabel: category.label,
      categoryDescription: category.description,
      stages: [...text[input.operation].stages],
      rules,
    },
    execution: {
      renderer: dataStat ? 'code' : 'agent-image-tool',
      outputFormat: input.outputFormat,
      ...WORKFLOW_CONTRACT.executionDefaults,
      realSvgRequired: dataStat || input.outputFormat === 'svg',
      requiredArtifacts: dataStat
        ? ['source-data', 'plot-code', 'png', 'svg']
        : ['figure-spec', 'prompt', 'drafts', 'critiques', `final-${input.outputFormat}`],
    },
    retriever: WORKFLOW_CONTRACT.retriever,
    stopPolicy: WORKFLOW_CONTRACT.stopPolicy,
    schemas: WORKFLOW_CONTRACT.schemas,
    localOutput: WORKFLOW_CONTRACT.localOutput,
  };
  return Object.freeze({ ...bundle, contentHash: sha256Canonical(bundle) });
}

export const WORKFLOW_TEXT = Object.freeze(workflowText);
