import { CATEGORY_CATALOG, KNOWLEDGE_VERSION, OPERATIONS, VISUAL_CATEGORIES, OUTPUT_FORMATS, LOCALES, PAPERBANANA_BENCH_MANIFEST } from './catalog.js';
import { FIGURE_SPEC_SCHEMA, CRITIQUE_RECORD_SCHEMA, OUTPUT_BUNDLE_SCHEMA, FIGURE_SPEC_V2_SCHEMA, CRITIQUE_RECORD_V2_SCHEMA, OUTPUT_BUNDLE_V2_SCHEMA, WORKFLOW_INPUT_SCHEMA } from './schemas.js';
import { WORKFLOW_CONTRACT, WORKFLOW_TEXT } from './workflow-contract.js';
import { FIGURE_TAXONOMY } from './taxonomy.js';
import { JOURNAL_KNOWLEDGE } from './journals.js';
import { sha256Canonical } from './hash.js';
import { ENGINE_FINGERPRINT } from './engine-fingerprint.js';

// The same complete document is hashed, served and shipped offline. Normalize to
// JSON here so undefined source fields cannot make an unverifiable wire hash.
export const KNOWLEDGE_CONTENT = JSON.parse(JSON.stringify({
  version: KNOWLEDGE_VERSION,
  engines: ENGINE_FINGERPRINT,
  dimensions: { operations: OPERATIONS, visualCategories: VISUAL_CATEGORIES, outputFormats: OUTPUT_FORMATS, locales: LOCALES },
  categories: CATEGORY_CATALOG, taxonomy: FIGURE_TAXONOMY, journals: JOURNAL_KNOWLEDGE,
  workflowContract: WORKFLOW_CONTRACT, workflowText: WORKFLOW_TEXT,
  schemas: { figureSpec: FIGURE_SPEC_V2_SCHEMA, critiqueRecord: CRITIQUE_RECORD_V2_SCHEMA, outputBundle: OUTPUT_BUNDLE_V2_SCHEMA, workflowInput: WORKFLOW_INPUT_SCHEMA },
  legacySchemas: { figureSpec: FIGURE_SPEC_SCHEMA, critiqueRecord: CRITIQUE_RECORD_SCHEMA, outputBundle: OUTPUT_BUNDLE_SCHEMA },
  dataset: PAPERBANANA_BENCH_MANIFEST,
}));
export const KNOWLEDGE_HASH = sha256Canonical(KNOWLEDGE_CONTENT);
