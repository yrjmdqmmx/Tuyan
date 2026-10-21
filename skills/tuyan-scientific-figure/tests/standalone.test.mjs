import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { captureKnowledge, verifyKnowledgeEvidence, createOfflineSnapshot, getWorkflowBundle, sha256Canonical, validateArtifactDocument } from '../scripts/knowledge-runtime.mjs';
import { buildOutputManifest } from '../scripts/finalize-output-bundle.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const input = { operation: 'create', visualCategory: 'method_framework', outputFormat: 'svg', locale: 'zh-CN', knowledgeMajor: 1 };
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="green"/></svg>';
// A synthetic pixel fixture, never claimed as a model output or a human review.
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=', 'base64');
async function fixture({ source = 'offline', category = 'method_framework', critique = true } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'tuyan-agent-v2-'));
  for (const dir of ['drafts', 'final', 'critiques', 'data', 'code']) await mkdir(join(root, dir));
  let evidence = captureKnowledge({ source: 'offline', input: { ...input, visualCategory: category } });
  if (source === 'mcp') {
    evidence = structuredClone(evidence); evidence.source = 'mcp';
    evidence.manifest.knowledgeVersion = '1.9.0'; evidence.manifest.knowledgeHash = '9'.repeat(64);
    evidence.workflow.knowledge.version = '1.9.0'; evidence.workflow.knowledge.sha256 = '9'.repeat(64);
    const { contentHash, ...body } = evidence.workflow; evidence.workflow.contentHash = sha256Canonical(body);
  }
  const spec = {
    schemaVersion: 'tuyan.figure-spec/v2', operation: 'create', visualCategory: category, locale: 'zh-CN', intent: 'Synthetic contract validation only.',
    taxonomyVersion: evidence.manifest.taxonomyVersion, canvas: { aspectRatio: '1:1', resolution: '20px' },
    content: { title: 'Fixture', nodes: [], relationships: [], annotations: [] },
    inputEvidence: [{ requirement: 'fixture content', status: 'available', evidence: 'Synthetic fixture.' }],
    output: { format: 'svg', renderer: category === 'bar' ? 'code' : 'vector-authoring' },
  };
  if (category === 'bar') {
    const data = 'label,value\na,1\n';
    await writeFile(join(root, 'data/source.csv'), data);
    await writeFile(join(root, 'code/plot.mjs'), '// synthetic plotting-code fixture\n');
    spec.data = { sourcePath: 'data/source.csv', sourceSha256: sha(data), units: { value: 'dimensionless' } };
  }
  const specBytes = JSON.stringify(spec);
  const record = {
    schemaVersion: 'tuyan.critique-record/v2', figureSpecSha256: sha(specBytes), round: 1,
    artifactPath: 'drafts/round-01.svg', artifactSha256: sha(svg), artifactVersion: 'round-01',
    inspected: ['svg-source', 'svg-render'], renderedArtifact: { path: 'drafts/round-01.png', sha256: sha(png) },
    issues: [], preservationChecks: [], uncertainties: [], decision: 'finalize',
    ...(category === 'bar' ? { numericChecks: [{ target: 'a = 1', status: 'passed', evidence: 'Synthetic source row.' }] } : {}),
  };
  await writeFile(join(root, 'knowledge-used.json'), JSON.stringify(evidence));
  await writeFile(join(root, 'figure-spec.json'), specBytes);
  await writeFile(join(root, 'drafts/round-01.svg'), svg);
  await writeFile(join(root, 'drafts/round-01.png'), png);
  await writeFile(join(root, 'final/figure.svg'), svg);
  if (category === 'bar') await writeFile(join(root, 'final/figure.png'), png);
  if (critique) await writeFile(join(root, 'critiques/round-01.json'), JSON.stringify(record));
  return { root, evidence, spec, record };
}

test('standalone runtime matches its complete snapshot and needs no repo imports', async () => {
  const snapshot = JSON.parse(await readFile(new URL('../references/offline-snapshot.v1.json', import.meta.url), 'utf8'));
  assert.deepEqual(createOfflineSnapshot(), snapshot);
  const { manifest, ...content } = snapshot;
  assert.equal(sha256Canonical(content), manifest.knowledgeHash);
  for (const id of snapshot.dimensions.visualCategories) {
    const bundle = getWorkflowBundle({ ...input, visualCategory: id });
    assert.equal(bundle.knowledge.sha256, manifest.knowledgeHash);
  }
});

test('finalizer records the actual captured online version instead of the installed snapshot', async () => {
  const { root } = await fixture({ source: 'mcp' });
  const manifest = await buildOutputManifest(root, { retrieverStatus: 'skipped' });
  assert.equal(manifest.knowledge.version, '1.9.0');
  assert.equal(manifest.knowledge.sha256, '9'.repeat(64));
  assert.equal(manifest.knowledge.source, 'mcp');
  assert.equal(manifest.reviewSummary[0].status, 'accepted');
});

test('mismatched manifest, altered bundle and mislabeled offline versions fail closed', () => {
  const evidence = captureKnowledge({ source: 'offline', input });
  assert.throws(() => verifyKnowledgeEvidence({ ...evidence, manifest: { ...evidence.manifest, knowledgeVersion: '1.8.0' } }), /KNOWLEDGE_INVALID/);
  const changed = structuredClone(evidence); changed.source = 'mcp'; changed.workflow.execution.renderer = 'invented';
  assert.throws(() => verifyKnowledgeEvidence(changed), /content hash mismatch/);
  assert.throws(() => captureKnowledge({ input }), /KNOWLEDGE_INVALID/);
});

test('review is bound to actual current artifact bytes', async () => {
  const { root } = await fixture();
  assert.equal((await buildOutputManifest(root)).reviewSummary[0].status, 'accepted');
  await writeFile(join(root, 'drafts/round-01.svg'), svg.replace('green', 'red'));
  await assert.rejects(buildOutputManifest(root), /changed evidence file/);
});

test('changing final output never borrows a review for different bytes', async () => {
  const { root } = await fixture();
  await writeFile(join(root, 'final/figure.svg'), svg.replace('green', 'blue'));
  assert.equal((await buildOutputManifest(root)).reviewSummary[0].status, 'unreviewed');
});

test('missing rendered SVG evidence, source changes and fake SVG are rejected', async () => {
  const { root, record } = await fixture({ category: 'bar' });
  await writeFile(join(root, 'critiques/round-01.json'), JSON.stringify({ ...record, inspected: ['svg-source'] }));
  await assert.rejects(buildOutputManifest(root), /ARTIFACT_INVALID/);
  await writeFile(join(root, 'critiques/round-01.json'), JSON.stringify(record));
  await writeFile(join(root, 'data/source.csv'), 'label,value\na,100\n');
  await assert.rejects(buildOutputManifest(root), /changed evidence file/);
  const fake = await fixture({ critique: false });
  await writeFile(join(fake.root, 'final/figure.svg'), '<svg><image href="data:image/png;base64,example"/></svg>');
  await assert.rejects(buildOutputManifest(fake.root), /real vector content/);
});

test('quantitative acceptance requires numeric evidence separate from visual evidence', async () => {
  const { root, record } = await fixture({ category: 'bar' });
  await writeFile(join(root, 'critiques/round-01.json'), JSON.stringify({ ...record, numericChecks: [] }));
  await assert.rejects(buildOutputManifest(root), /numeric evidence/);
});

test('verified SVG and its exact inspected PNG can share a bound review', async () => {
  const { root } = await fixture({ category: 'bar' });
  const manifest = await buildOutputManifest(root);
  assert.deepEqual(manifest.reviewSummary.map(item => item.status), ['accepted', 'accepted']);
});

test('retained old critiques stay with their saved FigureSpec and cannot certify a new revision', async () => {
  const { root, spec, record } = await fixture();
  await mkdir(join(root, 'history'));
  await writeFile(join(root, 'history/spec-01.json'), JSON.stringify(spec));
  await writeFile(join(root, 'critiques/round-01.json'), JSON.stringify({ ...record, figureSpecPath: 'history/spec-01.json' }));
  await writeFile(join(root, 'figure-spec.json'), JSON.stringify({ ...spec, intent: 'A revised task.' }));
  assert.equal((await buildOutputManifest(root)).reviewSummary[0].status, 'unreviewed');
});

test('missing numerical input permits a truthful spec-only stop without invented data', async () => {
  const { spec } = await fixture();
  const stopped = { ...spec, visualCategory: 'bar', output: { format: 'svg', renderer: 'spec-only' }, inputEvidence: [{ requirement: 'source data', status: 'missing', evidence: 'No data supplied.' }] };
  assert.equal(validateArtifactDocument(stopped), stopped);
  assert.throws(() => validateArtifactDocument({ ...stopped, output: { format: 'svg', renderer: 'code' } }), /ARTIFACT_INVALID/);
});

test('uncertainty and missing input cannot silently become accepted outputs', async () => {
  const { root, spec, record } = await fixture();
  assert.throws(() => validateArtifactDocument({ ...record, uncertainties: ['unreadable label'] }), /ARTIFACT_INVALID/);
  spec.inputEvidence[0].status = 'missing';
  const bytes = JSON.stringify(spec); await writeFile(join(root, 'figure-spec.json'), bytes);
  await writeFile(join(root, 'critiques/round-01.json'), JSON.stringify({ ...record, figureSpecSha256: sha(bytes) }));
  assert.equal((await buildOutputManifest(root)).reviewSummary[0].status, 'needs-review');
});

test('unreviewed files and evidence symlinks are not accepted', async () => {
  const { root } = await fixture({ critique: false });
  assert.equal((await buildOutputManifest(root)).reviewSummary[0].status, 'unreviewed');
  await symlink(join(root, 'figure-spec.json'), join(root, 'source-link.json'));
  await assert.rejects(buildOutputManifest(root), /symbolic link/);
});

test('composite contracts require distinct panels and preserve small-multiple semantics', () => {
  const evidence = captureKnowledge({ source: 'offline', input });
  const base = { schemaVersion: 'tuyan.figure-spec/v2', operation: 'create', visualCategory: 'small_multiples', locale: 'zh-CN', intent: 'Fixture', taxonomyVersion: evidence.manifest.taxonomyVersion, canvas: { aspectRatio: '1:1', resolution: '1K' }, content: { title: '', nodes: [], relationships: [], annotations: [] }, inputEvidence: [{ requirement: 'fixture', status: 'available', evidence: 'synthetic' }], output: { format: 'svg', renderer: 'mixed-panels' }, panels: [{ label: 'A', visualCategory: 'workflow', inputEvidence: [{ requirement: 'fixture', status: 'available', evidence: 'synthetic' }], renderer: 'vector-authoring' }, { label: 'B', visualCategory: 'mechanism', inputEvidence: [{ requirement: 'fixture', status: 'available', evidence: 'synthetic' }], renderer: 'vector-authoring' }] };
  assert.throws(() => validateArtifactDocument(base), /one shared type/);
  base.panels[1].visualCategory = 'workflow'; assert.equal(validateArtifactDocument(base), base);
  base.panels[1].label = 'A'; assert.throws(() => validateArtifactDocument(base), /duplicate panel/);
});

test('journal policy operation cannot be bypassed by relabeling creation as evaluation', () => {
  const journalSelection = { journalId: 'nature', version: '2026-10-19.v11', stage: 'production', purpose: 'cover', contentType: 'illustration', rasterKind: 'color', widthMm: 89 };
  const evidence = captureKnowledge({ source: 'offline', input, journalSelection });
  assert.equal(evidence.journalProfile.operation, 'generate');
  assert.equal(evidence.journalProfile.blocksExecution, true);
  assert.throws(() => captureKnowledge({ source: 'offline', input, journalSelection, journalOperation: 'evaluate' }), /does not match/);
});

test('preparation CLI writes explicit source evidence and preserves existing captures', async () => {
  const root = await mkdtemp(join(tmpdir(), 'tuyan-capture-cli-'));
  const script = new URL('../scripts/prepare-knowledge.mjs', import.meta.url);
  const args = [fileURLToPath(script), root, '--source', 'offline', '--operation', 'evaluate', '--category', 'heatmap', '--format', 'png'];
  execFileSync(process.execPath, args, { stdio: 'pipe' });
  const evidence = JSON.parse(await readFile(join(root, 'knowledge-used.json'), 'utf8'));
  assert.equal(evidence.source, 'offline'); assert.equal(evidence.workflow.retriever.task, 'plot');
  assert.throws(() => execFileSync(process.execPath, args, { stdio: 'pipe' }), /EEXIST/);
});
