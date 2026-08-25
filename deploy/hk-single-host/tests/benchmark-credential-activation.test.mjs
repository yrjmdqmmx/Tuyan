import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const deployRoot = fileURLToPath(new URL('../', import.meta.url));
const operator = join(deployRoot, 'scripts', 'configure-benchmark-credentials.sh');
const bootstrap = join(deployRoot, 'scripts', 'bootstrap-benchmark.sh');
const workflow = fileURLToPath(new URL('../../../.github/workflows/configure-benchmark-credentials.yml', import.meta.url));
const expectedSha = 'a'.repeat(40);
const nextSha = 'b'.repeat(40);
const managedNames = [
  'PAPERBANANA_BENCH_BAILIAN_API_KEY',
  'PAPERBANANA_BENCH_OPENROUTER_API_KEY',
  'PAPERBANANA_BENCH_ARK_API_KEY',
  'PAPERBANANA_BENCH_OSS_ACCESS_KEY_ID',
  'PAPERBANANA_BENCH_OSS_ACCESS_KEY_SECRET',
  'PAPERBANANA_BENCH_OSS_BUCKET',
  'PAPERBANANA_BENCH_OSS_REGION',
  'PAPERBANANA_BENCH_OSS_INTERNAL_ENDPOINT',
  'PAPERBANANA_BENCH_OSS_PUBLIC_ENDPOINT',
];

const fakeValues = Object.fromEntries(managedNames.map((name, index) => [name, `obvious-fake-bench-value-${index + 1}`]));

function bundleText(overrides = {}) {
  return managedNames.map((name) => `${name}=${overrides[name] ?? fakeValues[name]}`).join('\n') + '\n';
}

function makeFixture() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'paperbanana-bench-activation-')));
  const secretDir = join(root, 'opt', 'paperbanana', 'secrets');
  const deployEnv = join(root, 'opt', 'paperbanana', 'repo', 'deploy', 'hk-single-host', '.env');
  const coreEnv = join(secretDir, 'core.env');
  const benchEnv = join(secretDir, 'bench.env');
  const gatewayEnv = join(secretDir, 'gateway.env');
  const bundle = join(root, 'tmp', 'paperbanana-bench-credentials-obvious-fake');
  const actionLog = join(root, 'actions.log');
  mkdirSync(secretDir, { recursive: true });
  mkdirSync(dirname(deployEnv), { recursive: true });
  mkdirSync(dirname(bundle), { recursive: true });
  writeFileSync(join(root, '.paperbanana-hk-test-root'), 'paperbanana-hk-test-root-v1\n');
  writeFileSync(deployEnv, [
    'PAPERBANANA_GATEWAY_IMAGE=ghcr.io/example/gateway@sha256:' + '1'.repeat(64),
    'PAPERBANANA_BENCH_SECRET_MODE=discovery-only',
    'UNRELATED_DEPLOY_FIELD=preserve-deploy',
    '',
  ].join('\n'));
  writeFileSync(gatewayEnv, [
    'NODE_ENV=production',
    'PAPERBANANA_ADMIN_TRANSPORT_TOKEN=shared-admin-transport-token',
    '',
  ].join('\n'));
  writeFileSync(coreEnv, [
    'NODE_ENV=production',
    `PAPERBANANA_CODE_SHA=${expectedSha}`,
    'UNRELATED_CORE_SECRET=preserve-core-secret',
    'PAPERBANANA_ADMIN_TRANSPORT_TOKEN=shared-admin-transport-token',
    'PAPERBANANA_BENCH_DISCOVERY_TOKEN=shared-discovery-token',
    'PAPERBANANA_BENCH_API_ENABLED=false',
    'PAPERBANANA_BENCH_MONGODB_URI=mongodb://obvious-fake-core-mongo',
    'PAPERBANANA_BENCH_MONGO_DB=paperbanana_benchmark',
    'PAPERBANANA_BENCH_REVIEW_SIGNING_SECRET=obvious-fake-review-signing-secret',
    '',
  ].join('\n'));
  writeFileSync(benchEnv, [
    'NODE_ENV=production',
    `PAPERBANANA_CODE_SHA=${expectedSha}`,
    'UNRELATED_WORKER_SECRET=preserve-worker-secret',
    'PAPERBANANA_BENCH_ENABLED=false',
    'PAPERBANANA_BENCH_MONGODB_URI=mongodb://obvious-fake-worker-mongo',
    'PAPERBANANA_BENCH_MONGO_DB=paperbanana_benchmark',
    'PAPERBANANA_BENCH_DISCOVERY_TOKEN=shared-discovery-token',
    'PAPERBANANA_BENCH_CONCURRENCY=1',
    'PAPERBANANA_BENCH_DETECTION_INTERVAL_MS=21600000',
    '',
  ].join('\n'));
  writeFileSync(bundle, bundleText());
  for (const path of [root, secretDir, dirname(bundle), dirname(deployEnv)]) chmodSync(path, 0o700);
  for (const path of [join(root, '.paperbanana-hk-test-root'), deployEnv, gatewayEnv, coreEnv, benchEnv, bundle]) chmodSync(path, 0o600);

  return {
    root,
    deployEnv,
    gatewayEnv,
    coreEnv,
    benchEnv,
    bundle,
    actionLog,
    run(args = [], extraEnv = {}) {
      return spawnSync(operator, ['--bundle', bundle, '--expected-sha', expectedSha, ...args], {
        encoding: 'utf8',
        env: {
          ...process.env,
          PAPERBANANA_HK_TEST_ROOT: root,
          PAPERBANANA_BENCH_TEST_ACTION_LOG: actionLog,
          ...extraEnv,
        },
      });
    },
    snapshot() {
      return [deployEnv, coreEnv, benchEnv].map((path) => readFileSync(path, 'utf8'));
    },
    rewriteBundle(contents) {
      writeFileSync(bundle, contents);
      chmodSync(bundle, 0o600);
    },
    cleanup() { rmSync(root, { recursive: true, force: true }); },
  };
}

test('benchmark credential operator exists, is executable, and defaults to a non-mutating dry run', () => {
  assert.equal(existsSync(operator), true, 'benchmark credential operator must exist');
  assert.equal(statSync(operator).mode & 0o111, 0o111, 'benchmark credential operator must be executable');
  const fixture = makeFixture();
  try {
    const before = fixture.snapshot();
    const result = fixture.run();
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(fixture.snapshot(), before);
    assert.equal(existsSync(fixture.bundle), true, 'dry-run must not remove the staged bundle');
    assert.equal(existsSync(fixture.actionLog), false, 'dry-run must not recreate services');
    assert.match(result.stdout, /dry-run|would/i);
    assert.doesNotMatch(`${result.stdout}${result.stderr}`, /obvious-fake-bench-value|preserve-(?:core|worker)-secret/);
  } finally {
    fixture.cleanup();
  }
});

test('valid apply is atomic, configured-disabled, 0600, secret-safe, and idempotent', () => {
  const fixture = makeFixture();
  try {
    const first = fixture.run(['--apply']);
    assert.equal(first.status, 0, first.stderr);
    assert.equal(existsSync(fixture.bundle), false, 'successful apply removes the staged bundle');
    for (const path of [fixture.deployEnv, fixture.coreEnv, fixture.benchEnv]) {
      assert.equal(statSync(path).mode & 0o777, 0o600, `${path} must remain 0600`);
    }
    const deploy = readFileSync(fixture.deployEnv, 'utf8');
    const core = readFileSync(fixture.coreEnv, 'utf8');
    const bench = readFileSync(fixture.benchEnv, 'utf8');
    assert.match(deploy, /^PAPERBANANA_BENCH_SECRET_MODE=configured-disabled$/m);
    assert.match(deploy, /^UNRELATED_DEPLOY_FIELD=preserve-deploy$/m);
    assert.match(core, /^UNRELATED_CORE_SECRET=preserve-core-secret$/m);
    assert.match(core, /^PAPERBANANA_BENCH_API_ENABLED=true$/m);
    assert.doesNotMatch(core, /^PAPERBANANA_BENCH_(?:BAILIAN|OPENROUTER|ARK)_API_KEY=/m);
    assert.match(bench, /^UNRELATED_WORKER_SECRET=preserve-worker-secret$/m);
    assert.match(bench, /^PAPERBANANA_BENCH_ENABLED=false$/m);
    assert.match(bench, /^PAPERBANANA_BENCH_CONCURRENCY=1$/m);
    for (const name of managedNames) {
      const target = name.includes('_OSS_') ? core : bench;
      assert.match(target, new RegExp(`^${name}=${fakeValues[name]}$`, 'm'));
      assert.match(bench, new RegExp(`^${name}=${fakeValues[name]}$`, 'm'));
      assert.equal(core.match(new RegExp(`^${name}=`, 'gm'))?.length ?? 0, name.includes('_OSS_') ? 1 : 0);
      assert.equal(bench.match(new RegExp(`^${name}=`, 'gm'))?.length, 1);
    }
    assert.equal(readFileSync(fixture.actionLog, 'utf8'), [
      'recreate paperbanana-api',
      'recreate benchmark-worker',
      'smoke configured-disabled',
      '',
    ].join('\n'));
    assert.doesNotMatch(`${first.stdout}${first.stderr}`, /obvious-fake-bench-value|preserve-(?:core|worker)-secret/);

    const stable = fixture.snapshot();
    fixture.rewriteBundle(bundleText());
    rmSync(fixture.actionLog, { force: true });
    const second = fixture.run(['--apply']);
    assert.equal(second.status, 0, second.stderr);
    assert.deepEqual(fixture.snapshot(), stable);
    assert.equal(existsSync(fixture.bundle), false);
    assert.equal(existsSync(fixture.actionLog), false, 'idempotent apply must not recreate services');
    assert.match(second.stdout, /already|unchanged/i);
  } finally {
    fixture.cleanup();
  }
});

test('bundle validation rejects missing, duplicate, unknown, malformed, CR, and empty entries before mutation', async (t) => {
  const cases = {
    missing: bundleText().split('\n').filter((line) => !line.startsWith(`${managedNames[0]}=`)).join('\n'),
    duplicate: bundleText() + `${managedNames[0]}=second-obvious-fake-value\n`,
    unknown: bundleText() + 'PAPERBANANA_BENCH_UNKNOWN=obvious-fake-value\n',
    malformed: bundleText() + 'NOT AN ENV ENTRY\n',
    carriage_return: bundleText().replace(/\n/g, '\r\n'),
    empty: bundleText({ [managedNames[2]]: '' }),
  };
  for (const [name, contents] of Object.entries(cases)) {
    await t.test(name, () => {
      const fixture = makeFixture();
      try {
        fixture.rewriteBundle(contents);
        const before = fixture.snapshot();
        const result = fixture.run(['--apply']);
        assert.notEqual(result.status, 0);
        assert.deepEqual(fixture.snapshot(), before);
        assert.equal(existsSync(fixture.bundle), true);
        assert.equal(existsSync(fixture.actionLog), false);
        assert.doesNotMatch(`${result.stdout}${result.stderr}`, /obvious-fake-bench-value/);
      } finally {
        fixture.cleanup();
      }
    });
  }
});

test('SHA mismatch is rejected before any mutation or credential installation', () => {
  const fixture = makeFixture();
  try {
    writeFileSync(fixture.benchEnv, readFileSync(fixture.benchEnv, 'utf8').replace(expectedSha, nextSha));
    chmodSync(fixture.benchEnv, 0o600);
    const before = fixture.snapshot();
    const result = fixture.run(['--apply']);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /sha|commit/i);
    assert.deepEqual(fixture.snapshot(), before);
    assert.equal(existsSync(fixture.bundle), true);
    assert.equal(existsSync(fixture.actionLog), false);
  } finally {
    fixture.cleanup();
  }
});

test('operator refuses symlinked protected inputs and targets', async (t) => {
  for (const targetName of ['coreEnv', 'benchEnv', 'deployEnv', 'bundle']) {
    await t.test(targetName, () => {
      const fixture = makeFixture();
      try {
        const target = fixture[targetName];
        const real = `${target}.real`;
        writeFileSync(real, readFileSync(target));
        chmodSync(real, 0o600);
        rmSync(target);
        symlinkSync(real, target);
        const result = fixture.run(['--apply']);
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /symlink|regular file/i);
        assert.ok(lstatSync(target).isSymbolicLink());
      } finally {
        fixture.cleanup();
      }
    });
  }
});

test('failure after partial install restores all files and recreates prior services', () => {
  const fixture = makeFixture();
  try {
    const before = fixture.snapshot();
    const result = fixture.run(['--apply'], { PAPERBANANA_BENCH_TEST_FAIL_STEP: 'after-core-install' });
    assert.notEqual(result.status, 0);
    assert.deepEqual(fixture.snapshot(), before);
    assert.equal(existsSync(fixture.bundle), true, 'failed apply leaves bundle cleanup to the caller trap');
    assert.equal(readFileSync(fixture.actionLog, 'utf8'), [
      'inject failure after-core-install',
      'rollback restore deployment files',
      'rollback recreate paperbanana-api',
      'rollback recreate benchmark-worker',
      '',
    ].join('\n'));
    assert.doesNotMatch(`${result.stdout}${result.stderr}`, /obvious-fake-bench-value|preserve-(?:core|worker)-secret/);
  } finally {
    fixture.cleanup();
  }
});

test('configured-disabled bootstrap preserves credentials, disables execution, and updates only explicit code SHA', () => {
  const fixture = makeFixture();
  try {
    const applied = fixture.run(['--apply']);
    assert.equal(applied.status, 0, applied.stderr);
    for (const name of ['mongo-bench-password', 'mongo-bench-api-password']) {
      writeFileSync(join(dirname(fixture.coreEnv), name), `obvious-fake-${name}\n`);
      chmodSync(join(dirname(fixture.coreEnv), name), 0o600);
    }
    const env = {
      ...process.env,
      PAPERBANANA_BENCH_BOOTSTRAP_TEST_MODE: 'true',
      PAPERBANANA_SECRET_DIR: dirname(fixture.coreEnv),
      PAPERBANANA_CODE_SHA: nextSha,
    };
    const result = spawnSync(bootstrap, ['--configured-disabled'], { encoding: 'utf8', env });
    assert.equal(result.status, 0, result.stderr);
    const core = readFileSync(fixture.coreEnv, 'utf8');
    const bench = readFileSync(fixture.benchEnv, 'utf8');
    assert.match(core, new RegExp(`^PAPERBANANA_CODE_SHA=${nextSha}$`, 'm'));
    assert.match(bench, new RegExp(`^PAPERBANANA_CODE_SHA=${nextSha}$`, 'm'));
    assert.match(core, /^PAPERBANANA_BENCH_API_ENABLED=true$/m);
    assert.match(bench, /^PAPERBANANA_BENCH_ENABLED=false$/m);
    assert.match(bench, /^PAPERBANANA_BENCH_CONCURRENCY=1$/m);
    for (const name of managedNames) assert.match(bench, new RegExp(`^${name}=${fakeValues[name]}$`, 'm'));
    assert.doesNotMatch(`${result.stdout}${result.stderr}`, /obvious-fake-bench-value/);
  } finally {
    fixture.cleanup();
  }
});

test('configured-disabled bootstrap rejects a missing credential or enabled worker before changing code SHA', async (t) => {
  for (const variant of ['missing-provider', 'enabled-worker']) {
    await t.test(variant, () => {
      const fixture = makeFixture();
      try {
        const applied = fixture.run(['--apply']);
        assert.equal(applied.status, 0, applied.stderr);
        for (const name of ['mongo-bench-password', 'mongo-bench-api-password']) {
          writeFileSync(join(dirname(fixture.coreEnv), name), `obvious-fake-${name}\n`);
          chmodSync(join(dirname(fixture.coreEnv), name), 0o600);
        }
        let bench = readFileSync(fixture.benchEnv, 'utf8');
        if (variant === 'missing-provider') {
          bench = bench.split('\n').filter((line) => !line.startsWith('PAPERBANANA_BENCH_ARK_API_KEY=')).join('\n');
        } else {
          bench = bench.replace('PAPERBANANA_BENCH_ENABLED=false', 'PAPERBANANA_BENCH_ENABLED=true');
        }
        writeFileSync(fixture.benchEnv, bench);
        chmodSync(fixture.benchEnv, 0o600);
        const before = [fixture.coreEnv, fixture.benchEnv].map((path) => readFileSync(path, 'utf8'));
        const result = spawnSync(bootstrap, ['--configured-disabled'], {
          encoding: 'utf8',
          env: {
            ...process.env,
            PAPERBANANA_BENCH_BOOTSTRAP_TEST_MODE: 'true',
            PAPERBANANA_SECRET_DIR: dirname(fixture.coreEnv),
            PAPERBANANA_CODE_SHA: nextSha,
          },
        });
        assert.notEqual(result.status, 0);
        assert.deepEqual([fixture.coreEnv, fixture.benchEnv].map((path) => readFileSync(path, 'utf8')), before);
        assert.doesNotMatch(`${result.stdout}${result.stderr}`, /obvious-fake-bench-value/);
      } finally {
        fixture.cleanup();
      }
    });
  }
});

test('manual workflow securely transports exactly the nine dedicated secrets for apply-disabled activation', () => {
  assert.equal(existsSync(workflow), true, 'manual benchmark credential workflow must exist');
  const source = readFileSync(workflow, 'utf8');
  assert.match(source, /workflow_dispatch:/);
  assert.doesNotMatch(source, /\n\s*push:\s*\n/);
  assert.match(source, /environment:\s*paperbanana-production/);
  assert.match(source, /expected_deployed_sha:[\s\S]*required:\s*true/);
  assert.match(source, /configure-benchmark-credentials-disabled/);
  assert.match(source, /configure-benchmark-credentials\.sh/);
  assert.match(source, /--expected-sha[^\n]*EXPECTED_DEPLOYED_SHA/);
  assert.match(source, /--apply/);
  assert.match(source, /install -m 0600|chmod 0600/);
  assert.match(source, /\/tmp\/paperbanana-bench-credentials-\$\{GITHUB_RUN_ID\}/);
  assert.match(source, /trap[^\n]*(?:rm -f|cleanup)/);
  for (const name of managedNames) {
    assert.match(source, new RegExp(`secrets\\.${name}`));
    assert.equal((source.match(new RegExp(`secrets\\.${name}`, 'g')) ?? []).length, 1);
  }
  assert.doesNotMatch(source, /PAPERBANANA_BENCH_ENABLED\s*=\s*true|set -x|printenv|generation|judge/i);
  assert.doesNotMatch(source, /cat\s+[^\n]*(?:bundle|credential)/i);
});

test('deploy and smoke require an exact benchmark secret mode and keep configured credentials disabled', () => {
  const deploy = readFileSync(join(deployRoot, 'scripts', 'deploy.sh'), 'utf8');
  const smoke = readFileSync(join(deployRoot, 'scripts', 'smoke.sh'), 'utf8');
  const deployWorkflow = readFileSync(fileURLToPath(new URL('../../../.github/workflows/deploy-hk.yml', import.meta.url)), 'utf8');
  assert.match(deployWorkflow, /benchmark_secret_mode:[\s\S]*type:\s*choice[\s\S]*options:[\s\S]*discovery-only[\s\S]*configured-disabled/);
  assert.match(deployWorkflow, /PAPERBANANA_BENCH_SECRET_MODE/);
  assert.match(deployWorkflow, /bootstrap-benchmark\.sh[^\n]*BENCHMARK_SECRET_MODE/);
  assert.match(deploy, /PAPERBANANA_BENCH_SECRET_MODE/);
  assert.match(deploy, /discovery-only/);
  assert.match(deploy, /configured-disabled/);
  assert.match(smoke, /PAPERBANANA_BENCH_SECRET_MODE/);
  assert.match(smoke, /benchmark_secret_mode[\s\S]*discovery-only[\s\S]*forbidden/);
  assert.match(smoke, /benchmark_secret_mode[\s\S]*configured-disabled[\s\S]*required/);
  assert.match(smoke, /PAPERBANANA_BENCH_API_ENABLED/);
  assert.match(smoke, /PAPERBANANA_BENCH_ENABLED/);
  assert.match(smoke, /PAPERBANANA_BENCH_CONCURRENCY/);
  assert.doesNotMatch(smoke, /console\.log\(process\.env|printenv PAPERBANANA_BENCH_(?:BAILIAN|OPENROUTER|ARK|OSS)/);
});
