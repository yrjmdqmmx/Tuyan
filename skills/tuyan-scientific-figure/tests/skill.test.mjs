import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';

import {
  createOfflineSnapshot,
  PAPERBANANA_BENCH_DIAGRAM_IDS,
  PAPERBANANA_BENCH_MANIFEST,
} from '../../../packages/tuyan-knowledge/src/index.js';

const skillRoot = resolve(import.meta.dirname, '..');

async function optionalText(path) {
  try { return await readFile(path, 'utf8'); } catch { return ''; }
}

async function optionalJson(path) {
  const text = await optionalText(path);
  try { return JSON.parse(text); } catch { return null; }
}

async function optionalModule(path) {
  try { return await import(path); } catch { return {}; }
}

test('SKILL.md uses standard minimal frontmatter and focused triggers', async () => {
  const text = await optionalText(join(skillRoot, 'SKILL.md'));
  assert.ok(text, 'SKILL.md must exist');
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
  assert.ok(match, 'frontmatter must exist');
  const lines = match[1].split('\n').filter(Boolean);
  assert.deepEqual(lines.map((line) => line.split(':', 1)[0]), ['name', 'description']);
  assert.equal(lines[0], 'name: tuyan-scientific-figure');
  assert.match(lines[1], /create, refine, or evaluate/i);
  assert.match(lines[1], /科研图|scientific figure/i);
});

test('skill keeps research inputs local and sends only enums to the MCP', async () => {
  const text = await optionalText(join(skillRoot, 'SKILL.md'));
  assert.match(text, /tuyan\.get_workflow_bundle/);
  assert.match(text, /operation.*visualCategory.*outputFormat.*locale.*knowledgeMajor/s);
  assert.match(text, /Never send.*paper.*image.*prompt.*credential.*MCP/is);
  assert.match(text, /MCP.*unavailable.*offline-snapshot\.v1\.json/is);
  assert.doesNotMatch(text, /upload (?:the )?(?:paper|image|prompt)/i);
});

test('skill covers the exact categories and bounded stop conditions', async () => {
  const text = await optionalText(join(skillRoot, 'SKILL.md'));
  for (const category of [
    'method_framework', 'workflow', 'system_architecture', 'mechanism',
    'comparison', 'timeline', 'data_stat', 'concept_map',
  ]) assert.match(text, new RegExp(`\\b${category}\\b`));
  assert.match(text, /no material issue/i);
  assert.match(text, /capability.*unavailable/i);
  assert.match(text, /two consecutive.*no improvement/i);
});

test('dataset download is consent-gated, optional, verified, and non-blocking', async () => {
  const text = await optionalText(join(skillRoot, 'SKILL.md'));
  const reference = await optionalText(join(skillRoot, 'references', 'paperbanana-bench.md'));
  assert.match(text, /ask.*before.*download/is);
  assert.match(text, /skip.*Retriever/is);
  assert.match(text, /download.*fail.*Retriever/is);
  assert.match(reference, new RegExp(PAPERBANANA_BENCH_MANIFEST.revision));
  assert.match(reference, new RegExp(PAPERBANANA_BENCH_MANIFEST.archiveSha256));
  assert.match(reference, /license.*not.*declared/is);
  assert.match(reference, /version.*update/is);
});

test('offline snapshot is byte-equivalent to the canonical knowledge export', async () => {
  const snapshot = await optionalJson(join(skillRoot, 'references', 'offline-snapshot.v1.json'));
  assert.deepEqual(snapshot, createOfflineSnapshot());
});

test('dataset verifier selects the fixed 306 references and rejects drift', async () => {
  const module = await optionalModule(new URL('../scripts/verify-paperbanana-bench.mjs', import.meta.url));
  const plots = Array.from({ length: 240 }, (_, index) => ({ id: `ref_${index}` }));
  const diagrams = [
    ...PAPERBANANA_BENCH_DIAGRAM_IDS.map((id) => ({ id })),
    ...Array.from({ length: 232 }, (_, index) => ({ id: `other_${index}` })),
  ];
  const selected = module.validateReferenceRows?.({ plotRows: plots, diagramRows: diagrams });
  assert.equal(selected?.length, 306);
  assert.throws(
    () => module.validateReferenceRows({ plotRows: plots.slice(1), diagramRows: diagrams }),
    /DATASET_VALIDATION_FAILED/,
  );
});

test('local retriever ranks relevant references without a fixed result count', async () => {
  const module = await optionalModule(new URL('../scripts/retrieve-paperbanana-bench.mjs', import.meta.url));
  const rows = [
    { id: 'ref_a', content: 'graph neural network message passing architecture', visual_intent: 'node aggregation' },
    { id: 'ref_b', content: 'protein folding mechanism and molecular interactions', visual_intent: 'causal pathway' },
    { id: 'ref_c', content: 'training workflow with data preprocessing', visual_intent: 'pipeline' },
  ];
  const results = module.rankReferences?.(rows, { query: 'protein molecular mechanism', limit: 2 });
  assert.equal(results?.length, 2);
  assert.equal(results?.[0].id, 'ref_b');
  assert.ok(results?.every(({ retrieval }) => Number.isFinite(retrieval.score)));
});

test('output finalizer records local files, knowledge, and retriever state', async () => {
  const module = await optionalModule(new URL('../scripts/finalize-output-bundle.mjs', import.meta.url));
  const directory = await mkdtemp(join(tmpdir(), 'tuyan-output-test-'));
  await mkdir(join(directory, 'prompts'));
  await writeFile(join(directory, 'figure-spec.json'), '{"schemaVersion":"tuyan.figure-spec/v1"}\n');
  await writeFile(join(directory, 'prompts', 'round-01.txt'), 'local prompt\n');
  const manifest = await module.buildOutputManifest?.(directory, {
    retrieverStatus: 'skipped',
    datasetRevision: null,
    createdAt: '2026-09-04T00:00:00.000Z',
  });
  assert.equal(manifest?.schemaVersion, 'tuyan.output-bundle/v1');
  assert.equal(manifest?.knowledge.version, '1.0.0');
  assert.equal(manifest?.retriever.status, 'skipped');
  assert.deepEqual(manifest?.files.map(({ path }) => path), ['figure-spec.json', 'prompts/round-01.txt']);
  assert.ok(manifest?.files.every(({ sha256 }) => /^[a-f0-9]{64}$/.test(sha256)));
});

test('skill defines spec-only, reproducible plot, and local refinement paths', async () => {
  const text = await optionalText(join(skillRoot, 'SKILL.md'));
  assert.match(text, /no image.*FigureSpec.*stop/is);
  assert.match(text, /data_stat.*source data.*plotting code.*PNG.*true SVG/is);
  assert.match(text, /retrieve-paperbanana-bench\.mjs/);
  assert.match(text, /target changes.*non-target.*preserv/is);
  assert.match(text, /\.\/tuyan-output\/<timestamp>-<slug>\//);
});

test('client guide provides standard Codex, OpenClaw, and Hermes setup without acceptance claims', async () => {
  const text = await optionalText(join(skillRoot, 'references', 'client-installation.md'));
  assert.match(text, /Codex/);
  assert.match(text, /\.agents\/skills/);
  assert.match(text, /openclaw skills install/);
  assert.match(text, /hermes skills install/);
  assert.match(text, /hermes mcp add.*--url https:\/\/api\.paperbanana\.asia\/mcp/s);
  assert.match(text, /not.*end-to-end.*validated/is);
});
