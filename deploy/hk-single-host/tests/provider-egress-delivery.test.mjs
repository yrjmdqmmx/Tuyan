import assert from 'node:assert/strict';
import {
  chmodSync,
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
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

const deployRoot = fileURLToPath(new URL('../', import.meta.url));
const switcher = join(deployRoot, 'scripts', 'set-provider-egress-mode.sh');
const readDeploy = (path) => readFileSync(join(deployRoot, path), 'utf8');

test('generated Core env starts in explicit fail-closed disabled mode with the fixed proxy ready', () => {
  const generator = readDeploy('scripts/generate-runtime-secrets.sh');
  assert.match(generator, /^PAPERBANANA_PROVIDER_EGRESS_MODE=disabled$/m);
  assert.match(generator, /^PAPERBANANA_SG_PROXY_URL=http:\/\/10\.77\.0\.2:3128$/m);
  assert.doesNotMatch(generator, /(?:echo|printf)[^\n]*PAPERBANANA_(?:PROVIDER_EGRESS_MODE|SG_PROXY_URL).*\$/i);
});

test('Core receives routing values only through the root-only env file', () => {
  const compose = readDeploy('compose.yaml');
  const coreService = compose.slice(compose.indexOf('  paperbanana-api:'), compose.indexOf('  auth-gateway:'));
  assert.match(coreService, /env_file:\s*\n\s+- \/opt\/paperbanana\/secrets\/core\.env/);
  assert.doesNotMatch(coreService, /^\s+PAPERBANANA_PROVIDER_EGRESS_MODE:/m);
  assert.doesNotMatch(coreService, /^\s+PAPERBANANA_SG_PROXY_URL:/m);
});

test('Hong Kong smoke and monitor treat provider egress degradation as observable but not readiness-fatal', () => {
  const smoke = readDeploy('scripts/smoke.sh');
  const monitor = readDeploy('scripts/monitor-health.sh');
  assert.match(smoke, /providerEgress/);
  assert.match(smoke, /degraded/);
  assert.match(monitor, /providerEgress/);
  assert.match(monitor, /ready.*degraded|degraded.*ready/s);
});

function makeFixture(contents = [
  'NODE_ENV=production',
  'TOP_SECRET=do-not-print-this-value',
  'PAPERBANANA_PROVIDER_EGRESS_MODE=disabled',
  'PAPERBANANA_SG_PROXY_URL=http://10.77.0.2:3128',
  'TAIL_SECRET=preserve-me',
  '',
].join('\n')) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'paperbanana-hk-egress-mode-')));
  const envPath = join(root, 'opt', 'paperbanana', 'secrets', 'core.env');
  mkdirSync(dirname(envPath), { recursive: true });
  writeFileSync(join(root, '.paperbanana-hk-test-root'), 'paperbanana-hk-test-root-v1\n');
  chmodSync(root, 0o700);
  chmodSync(join(root, '.paperbanana-hk-test-root'), 0o600);
  writeFileSync(envPath, contents);
  chmodSync(envPath, 0o600);
  return {
    root,
    envPath,
    run(args = []) {
      return spawnSync(switcher, args, {
        encoding: 'utf8',
        env: { ...process.env, PAPERBANANA_HK_TEST_ROOT: root },
      });
    },
    cleanup() { rmSync(root, { recursive: true, force: true }); },
  };
}

test('provider egress switch defaults to a non-mutating dry run without printing secrets', () => {
  const fixture = makeFixture();
  try {
    const before = readFileSync(fixture.envPath, 'utf8');
    const result = fixture.run(['--mode', 'sg-required']);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(readFileSync(fixture.envPath, 'utf8'), before);
    assert.match(result.stdout, /dry-run|would/i);
    assert.doesNotMatch(`${result.stdout}${result.stderr}`, /do-not-print-this-value|preserve-me/);
  } finally {
    fixture.cleanup();
  }
});

test('provider egress switch atomically changes only fixed routing fields and is idempotent', () => {
  const fixture = makeFixture();
  try {
    const before = statSync(fixture.envPath);
    const first = fixture.run(['--mode', 'sg-required', '--apply']);
    assert.equal(first.status, 0, first.stderr);
    assert.equal(readFileSync(fixture.envPath, 'utf8'), [
      'NODE_ENV=production',
      'TOP_SECRET=do-not-print-this-value',
      'PAPERBANANA_PROVIDER_EGRESS_MODE=sg-required',
      'PAPERBANANA_SG_PROXY_URL=http://10.77.0.2:3128',
      'TAIL_SECRET=preserve-me',
      '',
    ].join('\n'));
    const after = statSync(fixture.envPath);
    assert.equal(after.mode & 0o777, before.mode & 0o777);
    assert.equal(after.uid, before.uid);
    assert.equal(after.gid, before.gid);
    assert.doesNotMatch(`${first.stdout}${first.stderr}`, /do-not-print-this-value|preserve-me/);

    const firstContents = readFileSync(fixture.envPath, 'utf8');
    const second = fixture.run(['--mode', 'sg-required', '--apply']);
    assert.equal(second.status, 0, second.stderr);
    assert.equal(readFileSync(fixture.envPath, 'utf8'), firstContents);
    assert.match(second.stdout, /already|unchanged/i);

    const rollback = fixture.run(['--mode', 'disabled', '--apply']);
    assert.equal(rollback.status, 0, rollback.stderr);
    assert.match(readFileSync(fixture.envPath, 'utf8'), /^PAPERBANANA_PROVIDER_EGRESS_MODE=disabled$/m);
    assert.match(readFileSync(fixture.envPath, 'utf8'), /^PAPERBANANA_SG_PROXY_URL=http:\/\/10\.77\.0\.2:3128$/m);
  } finally {
    fixture.cleanup();
  }
});

test('provider egress switch rejects an invalid existing env without replacing it', () => {
  const fixture = makeFixture('NODE_ENV=production\nBROKEN ENV LINE\nPAPERBANANA_PROVIDER_EGRESS_MODE=disabled\n');
  try {
    const before = readFileSync(fixture.envPath, 'utf8');
    const result = fixture.run(['--mode', 'sg-required', '--apply']);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /invalid.*core\.env|core\.env.*invalid/i);
    assert.equal(readFileSync(fixture.envPath, 'utf8'), before);
  } finally {
    fixture.cleanup();
  }
});

test('provider egress switch refuses a symlinked core.env target', () => {
  const fixture = makeFixture();
  try {
    const realEnv = `${fixture.envPath}.real`;
    writeFileSync(realEnv, readFileSync(fixture.envPath));
    rmSync(fixture.envPath);
    symlinkSync(realEnv, fixture.envPath);
    const result = fixture.run(['--mode', 'sg-required', '--apply']);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /symlink|regular file/i);
    assert.ok(lstatSync(fixture.envPath).isSymbolicLink());
  } finally {
    fixture.cleanup();
  }
});
