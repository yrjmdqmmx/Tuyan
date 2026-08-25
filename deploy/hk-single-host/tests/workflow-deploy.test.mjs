import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const deployRoot = fileURLToPath(new URL('../', import.meta.url));
const workflowPath = fileURLToPath(new URL('../../../.github/workflows/deploy-hk.yml', import.meta.url));
const credentialWorkflowPath = fileURLToPath(new URL('../../../.github/workflows/configure-benchmark-credentials.yml', import.meta.url));
const wrapperPath = join(deployRoot, 'scripts', 'apply-staged-deployment.sh');
const deployScriptPath = join(deployRoot, 'scripts', 'deploy.sh');
const credentialOperatorPath = join(deployRoot, 'scripts', 'configure-benchmark-credentials.sh');
const workflow = readFileSync(workflowPath, 'utf8');

test('deployment allocates an unpredictable remote image-lock path and delegates the locked transition to a host wrapper', () => {
  assert.doesNotMatch(workflow, /paperbanana-image-lock-\$\{GITHUB_RUN_ID\}/);
  assert.match(workflow, /REMOTE_LOCK="\$\(ssh[^\n]*mktemp \/tmp\/paperbanana-image-lock\.X{6,}/);
  assert.match(workflow, /\[\[ "\$REMOTE_LOCK" =~ \^\/tmp\/paperbanana-image-lock/);
  assert.match(workflow, /scp\s+"\$image_lock"\s+"\$DEPLOY_USER@\$DEPLOY_HOST:\$REMOTE_LOCK"/);
  assert.match(workflow, /chmod 0600 '\$REMOTE_LOCK'/);
  assert.match(workflow, /apply-staged-deployment\.sh[^\n]*--staged-image-lock[^\n]*--code-sha[^\n]*--apply/);
  assert.match(workflow, /cleanup\(\)[\s\S]*rm -f "\$image_lock"[\s\S]*rm -f -- '\$REMOTE_LOCK'/);
  assert.match(workflow, /trap cleanup EXIT/);
  assert.doesNotMatch(workflow, /install -m 0600 '\$REMOTE_LOCK' deploy\/hk-single-host\/\.env/);
  assert.doesNotMatch(workflow, /bootstrap-benchmark\.sh[^\n]*&& deploy\/hk-single-host\/scripts\/deploy\.sh/);
});

test('normal deploy and credential activation share one exact production host lock and workflow concurrency group', () => {
  assert.equal(existsSync(wrapperPath), true, 'host deployment wrapper must exist');
  assert.equal(statSync(wrapperPath).mode & 0o111, 0o111, 'host deployment wrapper must be executable');
  const wrapper = readFileSync(wrapperPath, 'utf8');
  const credentialOperator = readFileSync(credentialOperatorPath, 'utf8');
  const deployWorkflow = readFileSync(workflowPath, 'utf8');
  const credentialWorkflow = readFileSync(credentialWorkflowPath, 'utf8');
  const wrapperLock = wrapper.match(/shared_lock_path="([^"]+)"/)?.[1];
  const credentialLock = credentialOperator.match(/shared_lock_path="([^"]+)"/)?.[1];
  assert.equal(wrapperLock, '/run/lock/paperbanana-hk-production.lock');
  assert.equal(credentialLock, wrapperLock);
  assert.match(wrapper, /exec \{shared_lock_fd\}>"\$shared_lock_path"[\s\S]*flock -x "?\$shared_lock_fd"?/);
  assert.match(wrapper, /PAPERBANANA_HK_SHARED_LOCK_FD/);
  assert.doesNotMatch(wrapper, /flock -u/);
  assert.ok(wrapper.indexOf('flock -x 9') < wrapper.indexOf('install -m 0600'));
  assert.ok(wrapper.indexOf('install -m 0600') < wrapper.indexOf('bootstrap-benchmark.sh'));
  const deployApplyIndex = wrapper.search(/deploy\.sh" --apply/);
  assert.ok(deployApplyIndex > -1);
  assert.ok(wrapper.indexOf('bootstrap-benchmark.sh') < deployApplyIndex);
  const deployGroup = deployWorkflow.match(/concurrency:\s*\n\s*group:\s*([^\s]+)/)?.[1];
  const credentialGroup = credentialWorkflow.match(/concurrency:\s*\n\s*group:\s*([^\s]+)/)?.[1];
  assert.equal(deployGroup, credentialGroup);
  assert.equal(deployGroup, 'paperbanana-hk-production');
  assert.match(deployWorkflow, /cancel-in-progress:\s*false/);
  assert.match(credentialWorkflow, /cancel-in-progress:\s*false/);
});

test('deploy apply guard runs before deployment inputs or Compose and dry-run points to the host wrapper', () => {
  const deploy = readFileSync(deployScriptPath, 'utf8');
  assert.match(deploy, /PAPERBANANA_HK_SHARED_LOCK_FD/);
  assert.match(deploy, /flock -n "?\$shared_lock_fd"?/);
  assert.ok(deploy.indexOf('PAPERBANANA_HK_SHARED_LOCK_FD') < deploy.indexOf('required=('));
  assert.match(deploy, /apply-staged-deployment\.sh/);
  assert.doesNotMatch(deploy, /Run with --apply to enter maintenance mode/);
});

function makeWrapperFixture() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'paperbanana-staged-deploy-')));
  const deployEnv = join(root, 'opt', 'paperbanana', 'repo', 'deploy', 'hk-single-host', '.env');
  const staged = join(root, 'tmp', 'paperbanana-image-lock.abcdef');
  const actionLog = join(root, 'actions.log');
  mkdirSync(dirname(deployEnv), { recursive: true });
  mkdirSync(dirname(staged), { recursive: true });
  writeFileSync(join(root, '.paperbanana-hk-test-root'), 'paperbanana-hk-test-root-v1\n');
  writeFileSync(deployEnv, 'PREVIOUS_DEPLOY_FIELD=preserve-before-install\n');
  writeFileSync(staged, [
    `PAPERBANANA_GATEWAY_IMAGE=ghcr.io/example/paperbanana-auth-gateway@sha256:${'1'.repeat(64)}`,
    `PAPERBANANA_CORE_IMAGE=ghcr.io/example/paperbanana-core-api@sha256:${'2'.repeat(64)}`,
    `PAPERBANANA_PLOT_WORKER_IMAGE=ghcr.io/example/paperbanana-plot-worker@sha256:${'3'.repeat(64)}`,
    `PAPERBANANA_MONGODB_IMAGE=mongo:8.0.14-noble@sha256:${'4'.repeat(64)}`,
    `PAPERBANANA_BENCH_WORKER_IMAGE=ghcr.io/example/paperbanana-benchmark-worker@sha256:${'5'.repeat(64)}`,
    'PAPERBANANA_BENCH_SECRET_MODE=discovery-only',
    'COMPOSE_PROFILES=benchmark',
    '',
  ].join('\n'));
  for (const path of [root, dirname(staged), dirname(deployEnv)]) chmodSync(path, 0o700);
  for (const path of [join(root, '.paperbanana-hk-test-root'), deployEnv, staged]) chmodSync(path, 0o600);
  return {
    root,
    deployEnv,
    staged,
    actionLog,
    run(extraEnv = {}) {
      return spawnSync(wrapperPath, [
        '--staged-image-lock', staged,
        '--code-sha', 'a'.repeat(40),
        '--apply',
      ], {
        encoding: 'utf8',
        env: {
          ...process.env,
          PAPERBANANA_HK_DEPLOY_TEST_ROOT: root,
          PAPERBANANA_HK_DEPLOY_TEST_ACTION_LOG: actionLog,
          ...extraEnv,
        },
      });
    },
    cleanup() { rmSync(root, { recursive: true, force: true }); },
  };
}

test('host wrapper owns the staged lock and holds one lock across install, bootstrap, deploy, and cleanup', () => {
  const fixture = makeWrapperFixture();
  try {
    const stagedContents = readFileSync(fixture.staged, 'utf8');
    const result = fixture.run();
    assert.equal(result.status, 0, result.stderr);
    assert.equal(readFileSync(fixture.deployEnv, 'utf8'), stagedContents);
    assert.equal(statSync(fixture.deployEnv).mode & 0o777, 0o600);
    assert.equal(existsSync(fixture.staged), false);
    assert.equal(readFileSync(fixture.actionLog, 'utf8'), [
      'lock acquired /run/lock/paperbanana-hk-production.lock',
      'install staged image lock',
      'bootstrap benchmark discovery-only',
      'deploy apply',
      'cleanup staged image lock',
      '',
    ].join('\n'));
  } finally {
    fixture.cleanup();
  }
});

test('host wrapper deletes its staged image lock after a failure inside the locked transition', () => {
  const fixture = makeWrapperFixture();
  try {
    const result = fixture.run({ PAPERBANANA_HK_DEPLOY_TEST_FAIL_STEP: 'after-bootstrap' });
    assert.notEqual(result.status, 0);
    assert.equal(existsSync(fixture.staged), false);
    assert.match(readFileSync(fixture.actionLog, 'utf8'), /bootstrap benchmark discovery-only[\s\S]*cleanup staged image lock/);
  } finally {
    fixture.cleanup();
  }
});

test('host wrapper deletes an accepted staged image lock when content validation fails', () => {
  const fixture = makeWrapperFixture();
  try {
    writeFileSync(fixture.staged, 'UNKNOWN_DEPLOY_FIELD=obvious-fake-value\n');
    chmodSync(fixture.staged, 0o600);
    const result = fixture.run();
    assert.notEqual(result.status, 0);
    assert.equal(existsSync(fixture.staged), false);
    assert.doesNotMatch(`${result.stdout}${result.stderr}`, /obvious-fake-value/);
  } finally {
    fixture.cleanup();
  }
});

test('direct deploy apply without an inherited shared-lock FD fails before deployment preflight', () => {
  const result = spawnSync(deployScriptPath, ['--apply'], {
    encoding: 'utf8',
    env: { ...process.env, PAPERBANANA_HK_SHARED_LOCK_FD: '' },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /shared.*lock|wrapper/i);
  assert.doesNotMatch(result.stderr, /missing required deployment file|compose/i);
});

test('deploy apply rejects an inherited FD that points at the wrong path', () => {
  const fixture = makeWrapperFixture();
  const wrongLock = join(fixture.root, 'wrong-production.lock');
  try {
    const command = 'exec 8>"$1"; export PAPERBANANA_HK_SHARED_LOCK_FD=8; exec "$2" --apply';
    const result = spawnSync('bash', ['-c', command, 'deploy-guard-test', wrongLock, deployScriptPath], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PAPERBANANA_HK_DEPLOY_TEST_ROOT: fixture.root,
        PAPERBANANA_HK_DEPLOY_GUARD_TEST_MODE: 'true',
      },
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /shared.*lock|descriptor|path/i);
  } finally {
    fixture.cleanup();
  }
});
