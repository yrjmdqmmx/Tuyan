import {
  CATEGORY_CATALOG,
  KNOWLEDGE_MAJOR,
  KNOWLEDGE_VERSION,
  LOCALES,
  OPERATIONS,
  OUTPUT_FORMATS,
  PAPERBANANA_BENCH_DIAGRAM_IDS,
  PAPERBANANA_BENCH_MANIFEST,
  selectPaperBananaBenchReferences,
  VISUAL_CATEGORIES,
} from './catalog.js';
import { sha256Canonical } from './hash.js';
import {
  CRITIQUE_RECORD_SCHEMA,
  FIGURE_SPEC_SCHEMA,
  OUTPUT_BUNDLE_SCHEMA,
  WORKFLOW_INPUT_SCHEMA,
} from './schemas.js';
import { getWorkflowBundle, validateWorkflowInput, WORKFLOW_CONTRACT, WORKFLOW_TEXT } from './workflows.js';

const knowledgeHash = sha256Canonical({
  version: KNOWLEDGE_VERSION,
  categories: CATEGORY_CATALOG,
  workflowContract: WORKFLOW_CONTRACT,
  workflowText: WORKFLOW_TEXT,
  schemas: { FIGURE_SPEC_SCHEMA, CRITIQUE_RECORD_SCHEMA, OUTPUT_BUNDLE_SCHEMA, WORKFLOW_INPUT_SCHEMA },
  dataset: PAPERBANANA_BENCH_MANIFEST,
});

export const TUYAN_MANIFEST = Object.freeze({
  id: 'tuyan-scientific-figure-knowledge',
  knowledgeMajor: KNOWLEDGE_MAJOR,
  knowledgeVersion: KNOWLEDGE_VERSION,
  knowledgeHash,
  transport: 'anonymous-stateless-streamable-http',
  capabilities: ['tools', 'resources'],
  tools: ['tuyan.get_workflow_bundle'],
  resourceTemplates: ['tuyan://workflows/v1/{locale}/{operation}/{category}/{format}'],
  privacy: {
    acceptsResearchContent: false,
    storesCallerData: false,
    createsSessions: false,
  },
});

const resourceEntries = Object.freeze([
  { uri: 'tuyan://manifest', name: 'Tuyan knowledge manifest', value: TUYAN_MANIFEST },
  { uri: 'tuyan://schemas/figure-spec/v1', name: 'FigureSpec v1 JSON Schema', value: FIGURE_SPEC_SCHEMA },
  { uri: 'tuyan://schemas/critique-record/v1', name: 'CritiqueRecord v1 JSON Schema', value: CRITIQUE_RECORD_SCHEMA },
  { uri: 'tuyan://schemas/output-bundle/v1', name: 'OutputBundle v1 JSON Schema', value: OUTPUT_BUNDLE_SCHEMA },
  { uri: 'tuyan://datasets/paperbanana-bench/v1', name: 'PaperBananaBench v1 manifest', value: PAPERBANANA_BENCH_MANIFEST },
]);

export function listResources() {
  return resourceEntries.map(({ uri, name }) => ({ uri, name, mimeType: 'application/json' }));
}

export function readResource(uri) {
  const exact = resourceEntries.find((entry) => entry.uri === uri);
  if (exact) return exact.value;
  const match = /^tuyan:\/\/workflows\/v1\/(zh-CN|en-US)\/(create|refine|evaluate)\/([^/]+)\/(png|svg)$/.exec(uri);
  if (match && VISUAL_CATEGORIES.includes(match[3])) {
    return getWorkflowBundle({
      locale: match[1],
      operation: match[2],
      visualCategory: match[3],
      outputFormat: match[4],
      knowledgeMajor: 1,
    });
  }
  const error = new RangeError(`RESOURCE_NOT_FOUND: ${uri}`);
  error.code = 'RESOURCE_NOT_FOUND';
  throw error;
}

export function createOfflineSnapshot() {
  return {
    manifest: TUYAN_MANIFEST,
    dimensions: {
      operations: OPERATIONS,
      visualCategories: VISUAL_CATEGORIES,
      outputFormats: OUTPUT_FORMATS,
      locales: LOCALES,
    },
    categories: CATEGORY_CATALOG,
    workflowContract: WORKFLOW_CONTRACT,
    workflowText: WORKFLOW_TEXT,
    schemas: {
      figureSpec: FIGURE_SPEC_SCHEMA,
      critiqueRecord: CRITIQUE_RECORD_SCHEMA,
      outputBundle: OUTPUT_BUNDLE_SCHEMA,
      workflowInput: WORKFLOW_INPUT_SCHEMA,
    },
    dataset: PAPERBANANA_BENCH_MANIFEST,
  };
}

export {
  CATEGORY_CATALOG,
  CRITIQUE_RECORD_SCHEMA,
  FIGURE_SPEC_SCHEMA,
  getWorkflowBundle,
  KNOWLEDGE_MAJOR,
  KNOWLEDGE_VERSION,
  LOCALES,
  OPERATIONS,
  OUTPUT_BUNDLE_SCHEMA,
  OUTPUT_FORMATS,
  PAPERBANANA_BENCH_DIAGRAM_IDS,
  PAPERBANANA_BENCH_MANIFEST,
  selectPaperBananaBenchReferences,
  sha256Canonical,
  validateWorkflowInput,
  VISUAL_CATEGORIES,
  WORKFLOW_CONTRACT,
  WORKFLOW_INPUT_SCHEMA,
};
