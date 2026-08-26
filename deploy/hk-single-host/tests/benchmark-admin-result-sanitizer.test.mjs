import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const sanitizerPath = fileURLToPath(new URL('../scripts/sanitize-benchmark-admin-result.mjs', import.meta.url));

function envelope(operation = 'candidates', data = { candidates: [] }) {
  return { schemaVersion: 1, operation, workerEnabled: false, data };
}

function run(raw, operation = 'candidates') {
  const root = mkdtempSync(join(tmpdir(), 'paperbanana-bench-admin-result-'));
  const rawPath = join(root, 'result.raw');
  const resultPath = join(root, 'result.json');
  writeFileSync(rawPath, raw, { mode: 0o600 });
  const result = spawnSync(process.execPath, [sanitizerPath, rawPath, resultPath, operation], { encoding: 'utf8' });
  const output = result.status === 0 ? JSON.parse(readFileSync(resultPath, 'utf8')) : null;
  rmSync(root, { recursive: true, force: true });
  return { ...result, output };
}

test('sanitizer accepts one exact bounded admin envelope', () => {
  const value = envelope();
  const result = run(`${JSON.stringify(value)}\n`);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.output, value);
});

test('sanitizer extracts one envelope from fixed SSH or Compose line noise', () => {
  const value = envelope('candidates', { candidates: [{ candidateId: 'bailian:qwen-image-2.0-pro' }] });
  const result = run(`remote banner\ncompose-prefix ${JSON.stringify(value)} compose-suffix\n`);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.output, value);
});

test('sanitizer fails closed on multiple distinct envelopes', () => {
  const first = envelope();
  const second = envelope('candidates', { candidates: [{ candidateId: 'second' }] });
  const result = run(`${JSON.stringify(first)}\n${JSON.stringify(second)}\n`);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /^BENCHMARK_ADMIN_RESULT_AMBIGUOUS\n$/);
});

test('sanitizer rejects sensitive keys without echoing their values', () => {
  const marker = 'must-never-appear';
  const result = run(`${JSON.stringify(envelope('candidates', { accessKeySecret: marker }))}\n`);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /^BENCHMARK_ADMIN_RESULT_FORBIDDEN_KEY\n$/);
  assert.doesNotMatch(`${result.stdout}${result.stderr}`, new RegExp(marker));
});

test('sanitizer classifies empty and unparseable streams without content disclosure', () => {
  const empty = run('');
  assert.notEqual(empty.status, 0);
  assert.match(empty.stderr, /^BENCHMARK_ADMIN_RESULT_EMPTY\n$/);
  const invalid = run('not-json and no object braces\n');
  assert.notEqual(invalid.status, 0);
  assert.match(invalid.stderr, /^BENCHMARK_ADMIN_RESULT_NO_ENVELOPE\n$/);
});
