import { JOURNAL_ARCHIVES, JOURNAL_VERSION, VERIFIED_ON } from '../../api/src/journal-catalog.js';
import { activeJournalRules, journalSnapshot, journalPolicyIssues, JOURNAL_STAGES, JOURNAL_PURPOSES, JOURNAL_CONTENT, JOURNAL_LEVELS } from '../../api/src/journal-rules.js';
import { sha256Canonical } from './hash.js';

// Public, immutable source records. No user selections or research inputs are accepted by MCP.
export const JOURNAL_KNOWLEDGE = {
  version: JOURNAL_VERSION,
  verifiedOn: VERIFIED_ON,
  sourceLocale: 'zh-CN',
  selectionFields: {
    stages: Object.keys(JOURNAL_STAGES), purposes: Object.keys(JOURNAL_PURPOSES),
    contentTypes: Object.keys(JOURNAL_CONTENT), rasterKinds: ['color', 'grayscale', 'lineart'],
    requirementLevels: Object.keys(JOURNAL_LEVELS),
  },
  archives: JSON.parse(JSON.stringify(JOURNAL_ARCHIVES)),
  interpretation: [
    'Keep journal version, source IDs, verification dates, applicability and requirement levels intact.',
    'Pending or conflicting policy is neither a verified prohibition nor permission. Disclosure is not authorization.',
    'Generative refinement is not non-generative editing. Determine the actual operation before applying AI policies.',
    'Do not silently upgrade a saved journal selection. Missing archived rules require explicit resolution.',
    'Inspect final dimensions, fonts, raster resolution and export format separately from scientific and numeric fidelity.',
    'Publisher acceptance and scientific correctness cannot be certified by visual review, format conversion or DPI metadata.',
    'Original source wording and Chinese curatorial notes are retained; the Agent may translate for display without changing scope.',
  ],
};

export const JOURNAL_INDEX = {
  version: JOURNAL_VERSION, verifiedOn: VERIFIED_ON,
  selectionFields: JOURNAL_KNOWLEDGE.selectionFields,
  interpretation: JOURNAL_KNOWLEDGE.interpretation,
  versions: Object.keys(JOURNAL_KNOWLEDGE.archives).map(version => ({ version, uri: `tuyan://journals/${version}`, sha256: sha256Canonical(JOURNAL_KNOWLEDGE.archives[version]) })),
  journals: JOURNAL_ARCHIVES[JOURNAL_VERSION].journals.map(({ id, name, publisher, status, version, verifiedOn, defaults, summary }) => ({ id, name, publisher, status, version, verifiedOn, defaults, summary })),
};

// Local-only helper, intentionally not an MCP tool. Uses the same selection and policy logic as Web.
export function getJournalProfile(selection, { format = 'png', operation = 'evaluate' } = {}) {
  if (!['png', 'svg'].includes(format) || !['generate', 'generative-refine', 'non-generative-edit', 'evaluate'].includes(operation)) {
    throw new TypeError('INVALID_JOURNAL_OPERATION');
  }
  const snapshot = journalSnapshot(selection);
  if (!snapshot) return null;
  const rules = activeJournalRules(snapshot, format);
  let policyIssues = journalPolicyIssues(snapshot, operation);
  if (operation === 'non-generative-edit') {
    policyIssues = activeJournalRules(snapshot).filter(rule => rule.aiPolicy?.operation === operation).map(rule => ({
      code: `policy-${rule.id}`, blocking: rule.aiPolicy.status === 'prohibited',
      kind: rule.aiPolicy.status === 'conflict' ? 'conflict' : 'manual',
      text: rule.text, operation, policyStatus: rule.aiPolicy.status, sourceIds: rule.sourceIds,
    }));
    if (!policyIssues.length) policyIssues.push({ code: 'operation-unverified', blocking: false, kind: 'pending', text: 'No verified operation-specific permission; do not infer authorization.' });
  }
  const value = JSON.parse(JSON.stringify({ snapshot, format, operation, rules, policyIssues, blocksExecution: operation !== 'evaluate' && policyIssues.some(issue => issue.blocking), interpretation: JOURNAL_KNOWLEDGE.interpretation }));
  return { ...value, contentHash: sha256Canonical(value) };
}
