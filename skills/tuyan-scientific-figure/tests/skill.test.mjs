import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';

import {
  createOfflineSnapshot,
  KNOWLEDGE_VERSION,
  PAPERBANANA_BENCH_DIAGRAM_IDS,
  PAPERBANANA_BENCH_MANIFEST,
} from '../scripts/knowledge-runtime.mjs';

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

test('skill discovers the complete catalog and bounded stop conditions', async () => {
  const text = await optionalText(join(skillRoot, 'SKILL.md'));
  for (const category of [
    'method_framework', 'workflow', 'system_architecture', 'mechanism',
    'comparison', 'timeline', 'data_stat', 'concept_map',
  ]) assert.match(text, new RegExp(`\\b${category}\\b`));
  assert.match(text, /dimensions.visualCategories/);
  assert.match(text, /execution.renderer/);
  assert.doesNotMatch(text, /every category except/);
  assert.match(text, /no material issue/i);
  assert.match(text, /capability.*unavailable/i);
  assert.match(text, /two consecutive.*no improvement/i);
});

test('dataset download is consent-gated, optional, verified, and non-blocking', async () => {
  const text = await optionalText(join(skillRoot, 'SKILL.md'));
  const reference = await optionalText(join(skillRoot, 'references', 'paperbanana-bench.md'));
  assert.match(text, /ask.*before.*download/is);
  assert.match(text, /skipped.*Retriever|Retriever.*skipped/is);
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
