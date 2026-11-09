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
  FIGURE_SPEC_V2_SCHEMA, CRITIQUE_RECORD_V2_SCHEMA, OUTPUT_BUNDLE_V2_SCHEMA,
} from './schemas.js';
import { getWorkflowBundle, validateWorkflowInput, WORKFLOW_CONTRACT, WORKFLOW_TEXT } from './workflows.js';
import { KNOWLEDGE_CONTENT, KNOWLEDGE_HASH } from './content.js';
import { JOURNAL_INDEX, JOURNAL_KNOWLEDGE } from './journals.js';
export { getJournalProfile, JOURNAL_INDEX, JOURNAL_KNOWLEDGE } from './journals.js';
export { FIGURE_TAXONOMY } from './taxonomy.js';
export { FIGURE_SPEC_V2_SCHEMA, CRITIQUE_RECORD_V2_SCHEMA, OUTPUT_BUNDLE_V2_SCHEMA } from './schemas.js';

const knowledgeHash = KNOWLEDGE_HASH;

export const TUYAN_MANIFEST = Object.freeze({
  id: 'tuyan-scientific-figure-knowledge',
  knowledgeMajor: KNOWLEDGE_MAJOR,
  knowledgeVersion: KNOWLEDGE_VERSION,
  knowledgeHash,
  taxonomyVersion: KNOWLEDGE_CONTENT.taxonomy.version,
  journalVersion: JOURNAL_KNOWLEDGE.version,
  localArtifactSchemaMajor: 2,
  resourceHashes: {
    'tuyan://figures/taxonomy/v1': sha256Canonical(KNOWLEDGE_CONTENT.taxonomy),
    'tuyan://journals/index/v1': sha256Canonical(JOURNAL_INDEX),
    ...Object.fromEntries(Object.entries(JOURNAL_KNOWLEDGE.archives).map(([version, value]) => [`tuyan://journals/${version}`, sha256Canonical(value)])),
  },
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
  { uri: 'tuyan://schemas/figure-spec/v2', name: 'FigureSpec v2 JSON Schema', value: FIGURE_SPEC_V2_SCHEMA },
  { uri: 'tuyan://schemas/critique-record/v2', name: 'CritiqueRecord v2 JSON Schema', value: CRITIQUE_RECORD_V2_SCHEMA },
  { uri: 'tuyan://schemas/output-bundle/v2', name: 'OutputBundle v2 JSON Schema', value: OUTPUT_BUNDLE_V2_SCHEMA },
  { uri: 'tuyan://figures/taxonomy/v1', name: 'Complete figure taxonomy and contracts', value: KNOWLEDGE_CONTENT.taxonomy },
  { uri: 'tuyan://journals/index/v1', name: 'Journal catalog and immutable rule versions', value: JOURNAL_INDEX },
  ...Object.entries(JOURNAL_KNOWLEDGE.archives).map(([version, value]) => ({ uri: `tuyan://journals/${version}`, name: `Journal rules ${version}`, value })),
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
    ...KNOWLEDGE_CONTENT,
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
