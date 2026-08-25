import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const deployRoot = fileURLToPath(new URL('../', import.meta.url));
const operatorPath = fileURLToPath(new URL('../scripts/run-benchmark-paid-operator.sh', import.meta.url));
const workflowPath = fileURLToPath(new URL('../../../.github/workflows/run-benchmark-paid-operator.yml', import.meta.url));
const diagnosticPath = fileURLToPath(new URL('../scripts/diagnose-benchmark-paid-operator.sh', import.meta.url));
const diagnosticWorkflowPath = fileURLToPath(new URL('../../../.github/workflows/diagnose-benchmark-paid-operator.yml', import.meta.url));
const expectedSha = 'a'.repeat(40);

function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), 'paperbanana-paid-operator-'));
  const deployDir = join(root, 'opt', 'paperbanana', 'repo', 'deploy', 'hk-single-host');
  const secretDir = join(root, 'opt', 'paperbanana', 'secrets');
  mkdirSync(deployDir, { recursive: true });
  mkdirSync(secretDir, { recursive: true });
  writeFileSync(join(root, '.paperbanana-hk-test-root'), 'paperbanana-hk-test-root-v1\n', { mode: 0o600 });
  writeFileSync(join(deployDir, '.env'), 'PAPERBANANA_BENCH_SECRET_MODE=configured-disabled\n', { mode: 0o600 });
  writeFileSync(join(secretDir, 'core.env'), `PAPERBANANA_CODE_SHA=${expectedSha}\n`, { mode: 0o600 });
  writeFileSync(join(secretDir, 'bench.env'), [
    `PAPERBANANA_CODE_SHA=${expectedSha}`,
    'PAPERBANANA_BENCH_ENABLED=false',
    'PAPERBANANA_BENCH_CONCURRENCY=1',
    '',
  ].join('\n'), { mode: 0o600 });
  writeFileSync(join(secretDir, 'gateway.env'), 'ADMIN_USER_IDS=immutable-admin-id\n', { mode: 0o600 });
  for (const path of [root, deployDir, secretDir]) chmodSync(path, 0o700);
  return {
    root,
    benchEnv: join(secretDir, 'bench.env'),
    run(extraArgs = []) {
      return spawnSync(operatorPath, [
        '--mode', 'canary', '--expected-sha', expectedSha,
        '--provider', 'ark', '--model-id', 'doubao-seedream-test', '--lane', '2K-standard',
        '--max-generations', '2', '--max-judge-calls', '6', '--max-estimated-usd', '3',
        '--estimated-per-generation-usd', '0.05', '--estimated-per-judge-call-usd', '0.01',
        '--price-currency', 'USD', '--price-source', 'https://openrouter.ai/api/v1/models', '--price-captured-at', '2026-08-25T08:00:00.000Z',
        '--confirm', 'run-two-image-canary-disabled-worker', ...extraArgs,
      ], { encoding: 'utf8', env: { ...process.env, PAPERBANANA_HK_TEST_ROOT: root } });
    },
    cleanup() { rmSync(root, { recursive: true, force: true }); },
  };
}

test('paid benchmark operator is executable, lock-scoped and keeps the daemon disabled', () => {
  assert.equal(existsSync(operatorPath), true);
  assert.equal(statSync(operatorPath).mode & 0o111, 0o111);
  const source = readFileSync(operatorPath, 'utf8');
  assert.match(source, /set -Eeuo pipefail/);
  assert.match(source, /\/run\/lock\/paperbanana-hk-production\.lock/);
  assert.match(source, /PAPERBANANA_BENCH_SECRET_MODE[\s\S]*configured-disabled/);
  assert.match(source, /PAPERBANANA_BENCH_ENABLED[\s\S]*false/);
  assert.match(source, /PAPERBANANA_BENCH_CONCURRENCY[\s\S]*1/);
  assert.match(source, /PAPERBANANA_CODE_SHA/);
  assert.match(source, /build-provenance\.json/);
  assert.match(source, /operator\.mjs/);
  assert.match(source, /docker compose[\s\S]*run[\s\S]*--rm[\s\S]*--no-deps[\s\S]*benchmark-worker/);
  assert.match(source, /mktemp/);
  assert.match(source, /chmod 0600|install -m 0600/);
  assert.match(source, /cleanup\(\)[\s\S]*rm -f/);
  assert.match(source, /trap cleanup EXIT/);
  assert.match(source, /operatorReportHash[\s\S]*createHash\('sha256'\)/);
  assert.match(source, /PAPERBANANA_OPERATOR_REPORT_HASH/);
  assert.match(source, /PAPERBANANA_OPERATOR_AUTHORIZATION_HASH/);
  assert.match(source, /PAPERBANANA_OPERATOR_PRICE_HASH/);
  assert.match(source, /PAPERBANANA_OPERATOR_PRICE_SNAPSHOT/);
  assert.match(source, /PAPERBANANA_OPERATOR_USAGE/);
  assert.doesNotMatch(source, /PAPERBANANA_BENCH_ENABLED\s*=\s*true/);
  assert.doesNotMatch(source, /source\s+[^\n]*(?:core|gateway|bench)\.env|set -x|printenv|cat\s+[^\n]*(?:core|gateway|bench)\.env/);
  assert.ok(
    source.indexOf('flock -x 9') < source.indexOf('for path in "$deploy_env"'),
    'shared production lock must be acquired before reading protected deployment inputs',
  );
});

test('operator enforces exact calibration and two-image canary caps before any paid command', () => {
  const source = readFileSync(operatorPath, 'utf8');
  assert.match(source, /calibration/);
  assert.match(source, /canary/);
  assert.match(source, /calibrate-judge-disabled-worker/);
  assert.match(source, /run-two-image-canary-disabled-worker/);
  assert.match(source, /max-generations[\s\S]*2/);
  assert.match(source, /max-judge-calls[\s\S]*6/);
  assert.match(source, /max-estimated-usd/);
  assert.match(source, /3(?:\.0+)?/);
  assert.match(source, /expected-sha/);
});

test('dry-run executes real configured-disabled, SHA and budget preflight in a marked temporary root', () => {
  const fixture = makeFixture();
  try {
    const result = fixture.run();
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /dry-run/);
    assert.doesNotMatch(`${result.stdout}${result.stderr}`, /immutable-admin-id/);

    writeFileSync(fixture.benchEnv, readFileSync(fixture.benchEnv, 'utf8').replace('PAPERBANANA_BENCH_ENABLED=false', 'PAPERBANANA_BENCH_ENABLED=true'), { mode: 0o600 });
    const rejected = fixture.run();
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stderr, /must remain false/);
  } finally {
    fixture.cleanup();
  }
});

test('manual paid operator workflow requires explicit immutable provenance and budget inputs', () => {
  assert.equal(existsSync(workflowPath), true);
  const source = readFileSync(workflowPath, 'utf8');
  assert.match(source, /workflow_dispatch:/);
  assert.doesNotMatch(source, /\n\s*push:\s*\n/);
  assert.match(source, /environment:\s*paperbanana-production/);
  assert.match(source, /expected_deployed_sha:[\s\S]*required:\s*true/);
  assert.match(source, /mode:[\s\S]*type:\s*choice[\s\S]*calibration[\s\S]*canary/);
  assert.match(source, /provider:[\s\S]*type:\s*choice[\s\S]*bailian[\s\S]*openrouter[\s\S]*ark/);
  assert.match(source, /model_id:[\s\S]*required:\s*true/);
  assert.match(source, /lane:[\s\S]*type:\s*choice[\s\S]*1K-standard[\s\S]*2K-standard[\s\S]*4K-standard/);
  for (const input of ['max_generations', 'max_judge_calls', 'max_estimated_usd', 'estimated_per_generation_usd', 'estimated_per_judge_call_usd', 'price_currency', 'price_source', 'price_captured_at', 'confirm']) {
    assert.match(source, new RegExp(`${input}:[\\s\\S]*required:\\s*true`));
  }
  assert.match(source, /PRICE_CURRENCY[\s\S]*PRICE_SOURCE[\s\S]*PRICE_CAPTURED_AT/);
  assert.match(source, /run-benchmark-paid-operator\.sh/);
  assert.match(source, /concurrency:[\s\S]*paperbanana-hk-production[\s\S]*cancel-in-progress:\s*false/);
  assert.doesNotMatch(source, /PAPERBANANA_BENCH_(?:BAILIAN|OPENROUTER|ARK)_API_KEY|PAPERBANANA_BENCH_OSS_ACCESS_KEY_SECRET/);
});

test('paid operator diagnostics are fixed-stage, secret-free and make zero Provider or Judge calls', () => {
  assert.equal(existsSync(diagnosticPath), true);
  assert.equal(statSync(diagnosticPath).mode & 0o111, 0o111);
  const source = readFileSync(diagnosticPath, 'utf8');
  for (const stage of [
    'host-inputs-ok',
    'core-provenance-ok',
    'resident-worker-disabled',
    'oneoff-worker-provenance-ok',
    'dedicated-config-present',
    'local-calibration-render-ok',
    'diagnostic-complete',
  ]) assert.match(source, new RegExp(`PAID_DIAG_STAGE=${stage}`), stage);
  assert.match(source, /configured-disabled/);
  assert.match(source, /PAPERBANANA_BENCH_ENABLED[\s\S]*false/);
  assert.match(source, /PAPERBANANA_CODE_SHA/);
  assert.match(source, /calibration-snapshot\.mjs/);
  assert.doesNotMatch(source, /node\s+dist\/operator\.mjs|callBlindJudge|imageRuntime|runtime\.generate|curl|wget|set -x|printenv/);
  assert.doesNotMatch(source, /source\s+[^\n]*(?:core|gateway|bench)\.env|cat\s+[^\n]*(?:core|gateway|bench)\.env/);
});

test('manual paid diagnostic workflow binds the deployed SHA and exposes no paid inputs or credentials', () => {
  assert.equal(existsSync(diagnosticWorkflowPath), true);
  const source = readFileSync(diagnosticWorkflowPath, 'utf8');
  assert.match(source, /workflow_dispatch:/);
  assert.match(source, /environment:\s*paperbanana-production/);
  assert.match(source, /expected_deployed_sha:[\s\S]*required:\s*true/);
  assert.match(source, /diagnose-benchmark-paid-operator\.sh/);
  assert.match(source, /diagnose-paid-operator-disabled-worker/);
  assert.match(source, /concurrency:[\s\S]*paperbanana-hk-production[\s\S]*cancel-in-progress:\s*false/);
  assert.doesNotMatch(source, /max_generations|max_judge_calls|max_estimated_usd|price_source|PAPERBANANA_BENCH_(?:BAILIAN|OPENROUTER|ARK)_API_KEY|PAPERBANANA_BENCH_OSS_ACCESS_KEY_SECRET/);
});
