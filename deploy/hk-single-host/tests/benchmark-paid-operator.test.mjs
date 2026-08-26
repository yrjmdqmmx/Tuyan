import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const deployRoot = fileURLToPath(new URL('../', import.meta.url));
const operatorPath = fileURLToPath(new URL('../scripts/run-benchmark-paid-operator.sh', import.meta.url));
const workerOperatorPath = fileURLToPath(new URL('../../../apps/benchmark-worker/src/operator.ts', import.meta.url));
const calibrationRecoveryPath = fileURLToPath(new URL('../scripts/recover-benchmark-calibration.sh', import.meta.url));
const calibrationRecoveryWorkflowPath = fileURLToPath(new URL('../../../.github/workflows/recover-benchmark-calibration.yml', import.meta.url));
const adminOperatorPath = fileURLToPath(new URL('../scripts/run-benchmark-admin-operator.sh', import.meta.url));
const adminOperatorWorkflowPath = fileURLToPath(new URL('../../../.github/workflows/run-benchmark-admin-operator.yml', import.meta.url));
const adminOssExchangePath = fileURLToPath(new URL('../scripts/benchmark-admin-oss-exchange.cjs', import.meta.url));
const workflowPath = fileURLToPath(new URL('../../../.github/workflows/run-benchmark-paid-operator.yml', import.meta.url));
const diagnosticPath = fileURLToPath(new URL('../scripts/diagnose-benchmark-paid-operator.sh', import.meta.url));
const diagnosticWorkflowPath = fileURLToPath(new URL('../../../.github/workflows/diagnose-benchmark-paid-operator.yml', import.meta.url));
const judgeAccessDiagnosticPath = fileURLToPath(new URL('../scripts/diagnose-benchmark-judge-access.sh', import.meta.url));
const judgeAccessWorkflowPath = fileURLToPath(new URL('../../../.github/workflows/diagnose-benchmark-judge-access.yml', import.meta.url));
const openRouterJudgeProbePath = fileURLToPath(new URL('../scripts/run-openrouter-judge-probe.sh', import.meta.url));
const openRouterJudgeProbeWorkflowPath = fileURLToPath(new URL('../../../.github/workflows/run-openrouter-judge-probe.yml', import.meta.url));
const openRouterGitHubProbeWorkflowPath = fileURLToPath(new URL('../../../.github/workflows/run-openrouter-github-egress-probe.yml', import.meta.url));
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
    runCalibration({ maxUsd = '2.40', judgeUsd = '0.10' } = {}) {
      return spawnSync(operatorPath, [
        '--mode', 'calibration', '--expected-sha', expectedSha,
        '--provider', 'bailian', '--model-id', 'calibration-only', '--lane', '2K-standard',
        '--max-generations', '0', '--max-judge-calls', '24', '--max-estimated-usd', maxUsd,
        '--estimated-per-generation-usd', '0', '--estimated-per-judge-call-usd', judgeUsd,
        '--price-currency', 'USD', '--price-source', 'https://openrouter.ai/google/gemini-3.7-flash', '--price-captured-at', '2026-08-25T08:00:00.000Z',
        '--confirm', 'calibrate-judge-disabled-worker',
      ], { encoding: 'utf8', env: { ...process.env, PAPERBANANA_HK_TEST_ROOT: root } });
    },
    runProbe(extraArgs = []) {
      return spawnSync(openRouterJudgeProbePath, [
        '--kind', 'text_only', '--expected-sha', expectedSha,
        '--max-judge-calls', '1', '--max-estimated-usd', '0.10',
        '--estimated-per-judge-call-usd', '0.10',
        '--price-source', 'https://openrouter.ai/google/gemini-3.7-flash',
        '--price-captured-at', '2026-08-25T08:00:00.000Z',
        '--confirm', 'probe-one-openrouter-judge-disabled-worker', ...extraArgs,
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
  assert.match(source, /docker compose[\s\S]*run[\s\S]*--rm[\s\S]*--no-deps[\s\S]*benchmark-operator/);
  assert.doesNotMatch(source, /run --rm --no-deps benchmark-worker|\n\s+benchmark-worker node dist\/operator\.mjs/);
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

test('Judge dispatch diagnostics use stderr and cannot corrupt the stdout JSON report', () => {
  const hostSource = readFileSync(operatorPath, 'utf8');
  const workerSource = readFileSync(workerOperatorPath, 'utf8');
  assert.match(hostSource, /benchmark-operator node dist\/operator\.mjs >"\$report_file"/);
  assert.match(workerSource, /process\.stderr\.write\(`BENCHMARK_OPERATOR_JUDGE_DISPATCH=\$\{provider\}\\n`\)/);
  assert.doesNotMatch(workerSource, /process\.stdout\.write\(`BENCHMARK_OPERATOR_JUDGE_DISPATCH=/);
});

test('calibration recovery is zero-call, exact-report-bound and keeps the resident Worker disabled', () => {
  assert.equal(existsSync(calibrationRecoveryPath), true);
  assert.equal(statSync(calibrationRecoveryPath).mode & 0o111, 0o111);
  const source = readFileSync(calibrationRecoveryPath, 'utf8');
  assert.match(source, /recover-calibration-disabled-worker/);
  assert.match(source, /dist\/calibration-recovery\.mjs/);
  assert.match(source, /PAPERBANANA_BENCH_ENABLED[\s\S]*false/);
  assert.match(source, /reportObjectKey[\s\S]*operatorReportHash/);
  assert.match(source, /recordJudgeCalibration/);
  assert.match(source, /BENCHMARK_CALIBRATION_RECOVERY_JUDGE_CALLS/);
  assert.doesNotMatch(source, /dist\/operator\.mjs|callBlindJudge|chat\/completions|generate\(/);
  assert.doesNotMatch(source, /set -x|printenv|cat\s+[^\n]*(?:core|gateway|bench)\.env/);
});

test('calibration recovery workflow is manual, protected and exposes no credentials or paid expansion', () => {
  assert.equal(existsSync(calibrationRecoveryWorkflowPath), true);
  const source = readFileSync(calibrationRecoveryWorkflowPath, 'utf8');
  assert.match(source, /workflow_dispatch:/);
  assert.match(source, /environment:\s*paperbanana-production/);
  assert.match(source, /expected_deployed_sha:[\s\S]*required:\s*true/);
  assert.match(source, /not_before:[\s\S]*required:\s*true/);
  assert.match(source, /recover-benchmark-calibration\.sh/);
  assert.match(source, /concurrency:[\s\S]*paperbanana-hk-production[\s\S]*cancel-in-progress:\s*false/);
  assert.doesNotMatch(source, /PAPERBANANA_BENCH_(?:BAILIAN|OPENROUTER|ARK)_API_KEY|OSS_ACCESS_KEY_SECRET/);
});

test('benchmark admin operator exposes only fixed commands and writes one private OSS exchange object', () => {
  assert.equal(existsSync(adminOperatorPath), true);
  assert.equal(statSync(adminOperatorPath).mode & 0o111, 0o111);
  const source = readFileSync(adminOperatorPath, 'utf8');
  assert.match(source, /candidates\|approve_quick\|control_quick\|attest/);
  assert.match(source, /adminBenchmarkCandidates/);
  assert.match(source, /adminBenchmarkApprove/);
  assert.match(source, /adminBenchmarkControl/);
  assert.match(source, /phaseOperatorAttestation/);
  assert.match(source, /PAPERBANANA_BENCH_ENABLED[\s\S]*false/);
  assert.match(source, /--result-object-key/);
  assert.match(source, /bench\/admin-exchange\//);
  assert.match(source, /PAPERBANANA_OPERATOR_RESULT_OBJECT_KEY/);
  assert.match(source, /import\('ali-oss'\)/);
  assert.match(source, /x-oss-forbid-overwrite/);
  assert.match(source, /x-oss-object-acl/);
  assert.match(source, /BENCHMARK_ADMIN_(?:CORE|RESULT)_[A-Z_]+/);
  assert.doesNotMatch(source, /console\.error\([^\n]*(?:result|response)/);
  assert.doesNotMatch(source, /adminBenchmarkPublish|adminBenchmarkReviewImport|adminBenchmarkReviewExport|set -x|printenv/);
});

test('benchmark admin workflow is protected and uses a private, short-lived OSS exchange', () => {
  assert.equal(existsSync(adminOperatorWorkflowPath), true);
  const source = readFileSync(adminOperatorWorkflowPath, 'utf8');
  assert.match(source, /workflow_dispatch:/);
  assert.match(source, /environment:\s*paperbanana-production/);
  assert.match(source, /run-benchmark-admin-operator\.sh/);
  assert.match(source, /ssh[\s\S]*sudo bash -s/);
  assert.match(source, /benchmark-admin-result\.json/);
  assert.match(source, /benchmark-admin-result\.raw/);
  assert.match(source, /sanitize-benchmark-admin-result\.mjs/);
  assert.match(source, /benchmark-admin-oss-exchange\.cjs/);
  assert.match(source, /ali-oss@6\.23\.0/);
  assert.match(source, /openssl rand -hex 12/);
  assert.match(source, /bench\/admin-exchange\//);
  assert.match(source, /client\.cjs" download/);
  assert.match(source, /client\.cjs" delete/);
  for (const secret of ['ACCESS_KEY_ID', 'ACCESS_KEY_SECRET', 'BUCKET', 'REGION', 'INTERNAL_ENDPOINT', 'PUBLIC_ENDPOINT']) {
    assert.match(source, new RegExp(`PAPERBANANA_BENCH_OSS_${secret}`));
  }
  assert.doesNotMatch(source, /\bscp\b|BENCHMARK_ADMIN_REMOTE_RESULT_MISSING|PAPERBANANA_BENCH_(?:BAILIAN|OPENROUTER|ARK)_API_KEY|ADMIN_TOKEN/);
  assert.match(source, /BENCHMARK_ADMIN_REMOTE_OPERATOR_FAILED/);
  assert.match(source, /BENCHMARK_ADMIN_RESULT_SANITIZE_FAILED/);
  assert.match(source, /actions\/upload-artifact@v4/);
  assert.match(source, /retention-days:\s*1/);
  assert.match(source, /if-no-files-found:\s*error/);
  assert.match(source, /concurrency:[\s\S]*paperbanana-hk-production[\s\S]*cancel-in-progress:\s*false/);
  assert.equal(existsSync(adminOssExchangePath), true);
  const helperSource = readFileSync(adminOssExchangePath, 'utf8');
  assert.match(helperSource, /GET_FORBIDDEN[\s\S]*GET_NOT_FOUND[\s\S]*GET_UNREACHABLE/);
  assert.match(helperSource, /BENCHMARK_ADMIN_OSS_EXCHANGE_\$\{reason\}/);
  assert.doesNotMatch(helperSource, /console\.(?:log|error)|JSON\.stringify\(error|error\.(?:message|stack)/);
});

test('benchmark admin exchange proves runner and deployed Core use the same OSS configuration', () => {
  const workflowSource = readFileSync(adminOperatorWorkflowPath, 'utf8');
  const operatorSource = readFileSync(adminOperatorPath, 'utf8');
  assert.match(workflowSource, /oss_config_challenge="\$\(openssl rand -hex 32\)"/);
  assert.match(workflowSource, /oss_config_proof=/);
  assert.match(workflowSource, /--oss-config-challenge %q --expected-oss-config-proof %q/);
  assert.match(operatorSource, /--oss-config-challenge/);
  assert.match(operatorSource, /--expected-oss-config-proof/);
  assert.match(operatorSource, /BENCHMARK_ADMIN_OSS_CONFIG_MISMATCH/);
  assert.match(operatorSource, /timingSafeEqual/);
  assert.doesNotMatch(`${workflowSource}\n${operatorSource}`, /echo [^\n]*(?:oss_config_proof|PAPERBANANA_BENCH_OSS_ACCESS_KEY)/i);
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

test('budget preflight compares decimal prices exactly at the approved cap', () => {
  const fixture = makeFixture();
  try {
    const exact = fixture.runCalibration();
    assert.equal(exact.status, 0, exact.stderr);
    assert.match(exact.stdout, /dry-run/);

    const over = fixture.runCalibration({ maxUsd: '2.39' });
    assert.notEqual(over.status, 0);
    assert.doesNotMatch(`${over.stdout}${over.stderr}`, /docker|provider|judge|api.?key/i);
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
  assert.match(source, /run --rm --no-deps benchmark-operator/);
  assert.doesNotMatch(source, /run --rm --no-deps benchmark-worker/);
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

test('Judge access diagnostic is read-only, fixed-output and uses the isolated operator service', () => {
  assert.equal(existsSync(judgeAccessDiagnosticPath), true);
  assert.equal(statSync(judgeAccessDiagnosticPath).mode & 0o111, 0o111);
  const source = readFileSync(judgeAccessDiagnosticPath, 'utf8');
  assert.match(source, /diagnose-judge-provider-access-disabled-worker/);
  assert.match(source, /run --rm --no-deps benchmark-operator node dist\/judge-provider-diagnostic\.mjs/);
  assert.doesNotMatch(source, /chat\/completions|operator\.mjs|phase-operator\.mjs|curl|wget|set -x|printenv/);
});

test('manual Judge access workflow is environment-protected and has no paid inputs or credentials', () => {
  assert.equal(existsSync(judgeAccessWorkflowPath), true);
  const source = readFileSync(judgeAccessWorkflowPath, 'utf8');
  assert.match(source, /workflow_dispatch:/);
  assert.match(source, /environment:\s*paperbanana-production/);
  assert.match(source, /expected_deployed_sha:[\s\S]*required:\s*true/);
  assert.match(source, /diagnose-benchmark-judge-access\.sh/);
  assert.match(source, /concurrency:[\s\S]*paperbanana-hk-production[\s\S]*cancel-in-progress:\s*false/);
  assert.doesNotMatch(source, /max_generations|max_judge_calls|max_estimated_usd|PAPERBANANA_BENCH_(?:BAILIAN|OPENROUTER|ARK)_API_KEY|OSS_ACCESS_KEY_SECRET/);
});

test('OpenRouter Judge probe is a one-request configured-disabled diagnostic with fixed output', () => {
  assert.equal(existsSync(openRouterJudgeProbePath), true);
  assert.equal(statSync(openRouterJudgeProbePath).mode & 0o111, 0o111);
  const source = readFileSync(openRouterJudgeProbePath, 'utf8');
  assert.match(source, /probe-one-openrouter-judge-disabled-worker/);
  assert.match(source, /PAPERBANANA_BENCH_ENABLED[\s\S]*false/);
  assert.match(source, /max_judge_calls[\s\S]*== 1/);
  assert.match(source, /max_estimated_usd[\s\S]*0[.]10/);
  assert.match(source, /run --rm --no-deps[\s\S]*benchmark-operator[\s\S]*openrouter-judge-probe[.]mjs/);
  assert.doesNotMatch(source, /run --rm --no-deps benchmark-worker|set -x|printenv|cat\s+[^\n]*(?:core|gateway|bench)[.]env/);
  const fixture = makeFixture();
  try {
    const dryRun = fixture.runProbe();
    assert.equal(dryRun.status, 0, dryRun.stderr);
    assert.match(dryRun.stdout, /dry-run/);
    const widened = fixture.runProbe(['--max-judge-calls', '2']);
    assert.notEqual(widened.status, 0);
  } finally {
    fixture.cleanup();
  }
});

test('OpenRouter Judge probe workflow is manual, environment-protected, and explicitly price bounded', () => {
  assert.equal(existsSync(openRouterJudgeProbeWorkflowPath), true);
  const source = readFileSync(openRouterJudgeProbeWorkflowPath, 'utf8');
  assert.match(source, /workflow_dispatch:/);
  assert.match(source, /environment:\s*paperbanana-production/);
  assert.match(source, /probe_kind:[\s\S]*text_only[\s\S]*minimal_image[\s\S]*benchmark_fixture/);
  assert.match(source, /expected_deployed_sha:[\s\S]*required:\s*true/);
  assert.match(source, /max_judge_calls:[\s\S]*required:\s*true/);
  assert.match(source, /max_estimated_usd:[\s\S]*required:\s*true/);
  assert.match(source, /run-openrouter-judge-probe[.]sh/);
  assert.match(source, /concurrency:[\s\S]*paperbanana-hk-production[\s\S]*cancel-in-progress:\s*false/);
  assert.doesNotMatch(source, /PAPERBANANA_BENCH_(?:BAILIAN|OPENROUTER|ARK)_API_KEY|OSS_ACCESS_KEY_SECRET/);
});

test('OpenRouter GitHub-egress probe is one text-only request with fixed secret-free output', () => {
  assert.equal(existsSync(openRouterGitHubProbeWorkflowPath), true);
  const source = readFileSync(openRouterGitHubProbeWorkflowPath, 'utf8');
  assert.match(source, /workflow_dispatch:/);
  assert.match(source, /environment:\s*paperbanana-production/);
  assert.match(source, /expected_deployed_sha:[\s\S]*required:\s*true/);
  assert.match(source, /max_judge_calls:[\s\S]*required:\s*true/);
  assert.match(source, /max_estimated_usd:[\s\S]*required:\s*true/);
  assert.match(source, /probe-one-openrouter-text-github-egress/);
  assert.match(source, /kind:\s*'text_only'/);
  assert.match(source, /runOpenRouterJudgeProbe/);
  assert.match(source, /cd apps\/benchmark-worker/);
  assert.match(source, /node --import tsx --input-type=module/);
  assert.match(source, /from '\.\/src\/openrouter-judge-probe[.]ts'/);
  assert.match(source, /OPENROUTER_GITHUB_EGRESS_PROBE_RESULT/);
  assert.match(source, /PAPERBANANA_BENCH_OPENROUTER_API_KEY:\s*\$\{\{\s*secrets[.]PAPERBANANA_BENCH_OPENROUTER_API_KEY\s*\}\}/);
  assert.match(source, /concurrency:[\s\S]*paperbanana-hk-production[\s\S]*cancel-in-progress:\s*false/);
  assert.doesNotMatch(source, /image_url|benchmark_fixture|minimal_image|curl|wget|set -x|printenv|console[.](?:log|error)\([^\n]*(?:body|error|key)/i);
});
