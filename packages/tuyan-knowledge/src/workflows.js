import {getFigureType} from '../../figure-taxonomy/src/index.js';
import { localizedFigureContract } from './taxonomy.js';
import { KNOWLEDGE_HASH } from './content.js';
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

import { WORKFLOW_TEXT, WORKFLOW_CONTRACT } from './workflow-contract.js';
export { WORKFLOW_TEXT, WORKFLOW_CONTRACT } from './workflow-contract.js';

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
  const text = WORKFLOW_TEXT[input.locale];
  const category = CATEGORY_CATALOG[input.locale][input.visualCategory];
  const dataStat = input.visualCategory === 'data_stat' || getFigureType(input.visualCategory)?.kind === 'data';
  const composite = getFigureType(input.visualCategory)?.kind === 'composite';
  const rules = [...text.commonRules, ...category.requiredChecks];
  if (dataStat) rules.push(...text.dataRules);

  const bundle = {
    knowledge: { major: KNOWLEDGE_MAJOR, version: KNOWLEDGE_VERSION, sha256: KNOWLEDGE_HASH },
    workflow: {
      title: text[input.operation].title,
      operation: input.operation,
      locale: input.locale,
      visualCategory: input.visualCategory,
      categoryLabel: category.label,
      categoryDescription: category.description,
      stages: [...text[input.operation].stages],
      rules,
      figureContract: localizedFigureContract(input.visualCategory, input.locale),
    },
    execution: {
      renderer: dataStat ? 'code' : composite ? 'mixed-panels' : input.outputFormat === 'svg' ? 'vector-authoring' : 'agent-image-tool',
      outputFormat: input.outputFormat,
      ...WORKFLOW_CONTRACT.executionDefaults,
      realSvgRequired: dataStat || input.outputFormat === 'svg',
      requiredArtifacts: dataStat
        ? ['source-data', 'plot-code', 'png', 'svg']
        : ['figure-spec', 'prompt', 'drafts', 'critiques', `final-${input.outputFormat}`],
    },
    retriever: { ...WORKFLOW_CONTRACT.retriever, task: dataStat ? 'plot' : composite ? 'per-panel' : 'diagram' },
    evidence: WORKFLOW_CONTRACT.evidence,
    journals: WORKFLOW_CONTRACT.journals,
    stopPolicy: WORKFLOW_CONTRACT.stopPolicy,
    schemas: WORKFLOW_CONTRACT.schemas,
    localOutput: WORKFLOW_CONTRACT.localOutput,
  };
  const document = JSON.parse(JSON.stringify(bundle));
  return Object.freeze({ ...document, contentHash: sha256Canonical(document) });
}
