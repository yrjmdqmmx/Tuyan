import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { test } from 'node:test';

const deployRoot = new URL('../', import.meta.url);
const repositoryRoot = new URL('../../../', import.meta.url);
const readDeploy = (path) => readFileSync(new URL(path, deployRoot), 'utf8');
const readRepository = (path) => readFileSync(new URL(path, repositoryRoot), 'utf8');

test('MongoDB 8 benchmark index migration has an executable hermetic integration harness', () => {
  const harnessUrl = new URL('tests/run-mongo-index-migration-integration.sh', deployRoot);
  const harness = readFileSync(harnessUrl, 'utf8');

  assert.equal(statSync(harnessUrl).mode & 0o111, 0o111);
  assert.match(harness, /mongo:8\.0\.16-noble/);
  assert.match(harness, /--replSet[= ]rs0/);
  assert.match(harness, /run_migration\s*\nrun_migration/);
  assert.match(harness, /phase_sample_unique/);
  assert.match(harness, /automatic_judgment_unique/);
  assert.match(harness, /partialFilterExpression/);
  assert.match(harness, /runId_1_caseId_1_repetition_1/);
  assert.match(harness, /runId_1_sampleId_1_provider_1_judgeEpoch_1/);
  assert.match(harness, /dropIndex/);
  assert.match(harness, /Unauthorized/);
});

test('pull request and push CI execute the MongoDB 8 benchmark index migration harness', () => {
  const workflow = readRepository('.github/workflows/ci.yml');

  assert.match(workflow, /on:\s*\n\s*push:\s*\n\s*pull_request:/);
  assert.match(workflow, /mongo-index-migration:/);
  assert.match(workflow, /run-mongo-index-migration-integration\.sh/);
});

test('integration harness does not expand an empty array under Bash 3.2 nounset', () => {
  const harness = readDeploy('tests/run-mongo-index-migration-integration.sh');

  assert.doesNotMatch(harness, /local -a security_args=\(\)/);
});

test('integration assertions use MongoDB 8 mongosh-compatible primitives', () => {
  const harness = readDeploy('tests/run-mongo-index-migration-integration.sh');

  assert.doesNotMatch(harness, /assert\.eq/);
});
