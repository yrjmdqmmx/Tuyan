// Bundled into the standalone Skill. There are no network or model calls here.
export * from './index.js';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { FIGURE_SPEC_V2_SCHEMA, CRITIQUE_RECORD_V2_SCHEMA, OUTPUT_BUNDLE_V2_SCHEMA } from './schemas.js';
import { TUYAN_MANIFEST, getWorkflowBundle, getJournalProfile, sha256Canonical } from './index.js';

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validators = new Map([FIGURE_SPEC_V2_SCHEMA, CRITIQUE_RECORD_V2_SCHEMA, OUTPUT_BUNDLE_V2_SCHEMA].map(schema => [schema.properties.schemaVersion.const, ajv.compile(schema)]));
export function validateArtifactDocument(document) {
  const validate = validators.get(document?.schemaVersion);
  if (!validate || !validate(document)) throw new Error(`ARTIFACT_INVALID: ${document?.schemaVersion}: ${JSON.stringify(validate?.errors || 'unsupported schema')}`);
  if (document.schemaVersion === 'tuyan.figure-spec/v2' && document.panels) {
    if (new Set(document.panels.map(panel => panel.label)).size !== document.panels.length) throw new Error('ARTIFACT_INVALID: duplicate panel labels');
    if (document.visualCategory === 'small_multiples' && new Set(document.panels.map(panel => panel.visualCategory)).size !== 1) throw new Error('ARTIFACT_INVALID: small multiples require one shared type');
  }
  return document;
}

export function verifyKnowledgeEvidence(evidence) {
  const { source, manifest, workflow, journalProfile } = evidence || {};
  if (!['mcp', 'offline'].includes(source) || manifest?.knowledgeMajor !== 1 || manifest.localArtifactSchemaMajor !== 2 || !/^1\.\d+\.\d+$/.test(manifest.knowledgeVersion) || !/^[a-f0-9]{64}$/.test(manifest.knowledgeHash)) throw new Error('KNOWLEDGE_INVALID: explicit source and captured manifest required');
  if (source === 'offline' && (manifest.knowledgeVersion !== TUYAN_MANIFEST.knowledgeVersion || manifest.knowledgeHash !== TUYAN_MANIFEST.knowledgeHash)) throw new Error('KNOWLEDGE_INVALID: offline snapshot and runtime differ; update the complete Skill');
  if (workflow?.knowledge?.version !== manifest.knowledgeVersion || workflow?.knowledge?.sha256 !== manifest.knowledgeHash) throw new Error('KNOWLEDGE_INVALID: workflow and manifest version/hash mismatch');
  const { contentHash, ...content } = workflow;
  if (contentHash !== sha256Canonical(content)) throw new Error('KNOWLEDGE_INVALID: workflow content hash mismatch');
  if (manifest.knowledgeHash === TUYAN_MANIFEST.knowledgeHash) {
    const expected = getWorkflowBundle({ operation: workflow.workflow.operation, visualCategory: workflow.workflow.visualCategory, outputFormat: workflow.execution.outputFormat, locale: workflow.workflow.locale, knowledgeMajor: 1 });
    if (expected.contentHash !== contentHash) throw new Error('KNOWLEDGE_INVALID: workflow differs from the declared public knowledge version');
  }
  if (journalProfile) {
    const { contentHash: journalHash, ...journalContent } = journalProfile;
    if (journalHash !== sha256Canonical(journalContent)) throw new Error('KNOWLEDGE_INVALID: journal profile content hash mismatch');
    // Profiles are resolved using the identical versioned local rules, never relabeled.
    if (manifest.knowledgeHash !== TUYAN_MANIFEST.knowledgeHash) throw new Error('KNOWLEDGE_INVALID: update Skill before resolving another knowledge version locally');
    const expected = getJournalProfile(journalProfile.snapshot.selection, { format: journalProfile.format, operation: journalProfile.operation });
    if (sha256Canonical(journalProfile) !== sha256Canonical(expected)) throw new Error('KNOWLEDGE_INVALID: journal profile does not match the selected archived rules');
  }
  return evidence;
}

export function captureKnowledge({ source, input, manifest, workflow, journalSelection, journalOperation }) {
  if (source === 'offline') { manifest = TUYAN_MANIFEST; workflow = getWorkflowBundle(input); }
  const evidence = { source, manifest, workflow };
  const operation = workflow?.workflow?.operation;
  const policyOperation = journalOperation || ({ create: 'generate', refine: 'generative-refine', evaluate: 'evaluate' })[operation];
  if (journalSelection) {
    if (policyOperation !== ({ create: 'generate', refine: 'generative-refine', evaluate: 'evaluate' })[operation] && !(operation === 'refine' && policyOperation === 'non-generative-edit' && ['code', 'vector-authoring'].includes(workflow.execution.renderer))) throw new Error('KNOWLEDGE_INVALID: policy operation does not match the requested workflow');
    evidence.journalProfile = getJournalProfile(journalSelection, { format: workflow?.execution?.outputFormat, operation: policyOperation });
  }
  return verifyKnowledgeEvidence(evidence);
}
