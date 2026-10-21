import assert from 'node:assert/strict';
import test from 'node:test';
import { createOfflineSnapshot, getWorkflowBundle, getJournalProfile, readResource, sha256Canonical, TUYAN_MANIFEST, JOURNAL_INDEX } from '../src/index.js';
import { FIGURE_TYPES, FIGURE_GROUPS, figureContract } from '../../figure-taxonomy/src/index.js';
import { JOURNALS, JOURNAL_VERSION, JOURNAL_ARCHIVES } from '../../api/src/journal-catalog.js';
import { activeJournalRules, journalSnapshot } from '../../api/src/journal-rules.js';
import { validateArtifactDocument } from '../src/agent-runtime-entry.js';

test('complete offline content is verifiably hashed, including all type and journal contracts', () => {
  const { manifest, ...content } = createOfflineSnapshot();
  assert.equal(sha256Canonical(content), manifest.knowledgeHash);
  assert.equal(content.taxonomy.groups.length, FIGURE_GROUPS.length);
  assert.equal(content.taxonomy.types.length, FIGURE_TYPES.length);
  for (const type of FIGURE_TYPES) {
    const contract = content.taxonomy.contracts[type.id];
    const original = figureContract({ figureTypeId: type.id });
    for (const field of Object.keys(original)) assert.deepEqual(contract[field], original[field]);
    assert.deepEqual(contract.availableVariants, type.variants);
  }
  assert.deepEqual(content.journals.archives, JSON.parse(JSON.stringify(JOURNAL_ARCHIVES)));
  const altered = structuredClone(content);
  altered.journals.archives[JOURNAL_VERSION].journals[0].rules[0].text += 'changed';
  assert.notEqual(sha256Canonical(altered), manifest.knowledgeHash);
});

test('every type routes by semantics, with English summaries and full canonical evidence', () => {
  for (const type of FIGURE_TYPES) for (const format of ['png', 'svg']) {
    const bundle = getWorkflowBundle({ operation: 'create', visualCategory: type.id, outputFormat: format, locale: 'en-US', knowledgeMajor: 1 });
    assert.equal(bundle.execution.renderer, type.kind === 'data' ? 'code' : type.kind === 'composite' ? 'mixed-panels' : format === 'svg' ? 'vector-authoring' : 'agent-image-tool');
    assert.equal(bundle.retriever.task, type.kind === 'data' ? 'plot' : type.kind === 'composite' ? 'per-panel' : 'diagram');
    assert.doesNotMatch(bundle.workflow.categoryDescription, /[\u3400-\u9fff]/);
    assert.doesNotMatch(JSON.stringify(bundle.workflow.figureContract.reviewRequirements), /[\u3400-\u9fff]/);
    assert.equal(bundle.workflow.figureContract.canonicalSource.id, type.id);
    assert.equal(bundle.knowledge.sha256, TUYAN_MANIFEST.knowledgeHash);
    assert.equal(bundle.evidence.reReviewAfterRegeneration, true);
  }
});

test('public journal resources preserve dates, source records and immutable historic versions', () => {
  assert.equal(JOURNAL_INDEX.journals.length, JOURNALS.length);
  for (const { version, uri, sha256 } of JOURNAL_INDEX.versions) {
    const resource = readResource(uri);
    assert.deepEqual(resource, JSON.parse(JSON.stringify(JOURNAL_ARCHIVES[version])));
    assert.equal(sha256Canonical(resource), sha256);
    assert.equal(TUYAN_MANIFEST.resourceHashes[uri], sha256);
    for (const journal of resource.journals) for (const id of journal.sourceIds) assert.ok(resource.sources[id]);
  }
  assert.throws(() => readResource('tuyan://journals/../../private'), /RESOURCE_NOT_FOUND/);
});

test('local journal selection matches Web applicability for every journal and submission scope', () => {
  for (const journal of JOURNALS) for (const stage of ['initial', 'revision', 'production']) for (const purpose of ['main', 'supplementary', 'graphical_abstract', 'toc', 'cover']) {
    const selection = { journalId: journal.id, version: JOURNAL_VERSION, stage, purpose, contentType: 'data', widthMm: journal.defaults.widthMm, rasterKind: 'color' };
    for (const format of ['png', 'svg']) {
      const profile = getJournalProfile(selection, { format, operation: 'evaluate' });
      assert.deepEqual(profile.rules, JSON.parse(JSON.stringify(activeJournalRules(journalSnapshot(selection), format))));
      assert.equal(profile.blocksExecution, false, 'evaluating an existing file does not authorize or execute generation');
      assert.deepEqual(profile.snapshot.selection, selection);
    }
  }
  const old = getJournalProfile({ journalId: 'plos-one', version: '2026-10-13.v1', stage: 'initial', purpose: 'main', contentType: 'schematic', rasterKind: 'color', widthMm: 89 });
  assert.equal(old.snapshot.version, '2026-10-13.v1');
  assert.throws(() => getJournalProfile({ ...old.snapshot.selection, version: '2099-missing' }), /版本不可用/);
});

test('hashes survive JSON transport when source catalogs contain undefined optional values', () => {
  const original = { a: undefined, b: [undefined, 1], c: { optional: undefined, value: 2 } };
  assert.equal(sha256Canonical(original), sha256Canonical(JSON.parse(JSON.stringify(original))));
  const profile = getJournalProfile({ journalId: 'nature', version: JOURNAL_VERSION, stage: 'initial', purpose: 'main', contentType: 'schematic', rasterKind: 'color', widthMm: 89 });
  const { contentHash, ...value } = JSON.parse(JSON.stringify(profile));
  assert.equal(contentHash, sha256Canonical(value));
});

test('publisher operation restrictions are retained without turning pending rules into permission', () => {
  const selection = { journalId: 'nature', version: JOURNAL_VERSION, stage: 'production', purpose: 'cover', contentType: 'illustration', rasterKind: 'color', widthMm: 89 };
  const generation = getJournalProfile(selection, { operation: 'generate' });
  assert.equal(generation.blocksExecution, true);
  assert.ok(generation.policyIssues.some(issue => issue.blocking));
  assert.equal(getJournalProfile(selection, { operation: 'evaluate' }).blocksExecution, false);
  assert.throws(() => getJournalProfile(selection, { operation: 'anything' }), /INVALID_JOURNAL_OPERATION/);
});

test('v1 schemas remain discoverable while v2 requires real artifact evidence', () => {
  assert.equal(readResource('tuyan://schemas/figure-spec/v1').properties.schemaVersion.const, 'tuyan.figure-spec/v1');
  const record = { schemaVersion: 'tuyan.critique-record/v2', figureSpecSha256: 'a'.repeat(64), round: 1, artifactPath: 'drafts/a.svg', artifactSha256: 'b'.repeat(64), artifactVersion: 'round-1', inspected: ['svg-source'], issues: [], preservationChecks: [], uncertainties: [], decision: 'finalize' };
  assert.throws(() => validateArtifactDocument(record), /ARTIFACT_INVALID/);
  record.inspected.push('svg-render'); record.renderedArtifact = { path: 'drafts/a.png', sha256: 'c'.repeat(64) };
  assert.equal(validateArtifactDocument(record), record);
  assert.throws(() => validateArtifactDocument({ ...record, uncertainties: ['cannot read a label'] }), /ARTIFACT_INVALID/);
  assert.throws(() => validateArtifactDocument({ ...record, preservationChecks: [{ target: 'labels', preserved: false }] }), /ARTIFACT_INVALID/);
});
