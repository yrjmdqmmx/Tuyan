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
const setter = join(deployRoot, 'scripts', 'set-account-email-config.sh');
const workflow = fileURLToPath(new URL('../../../.github/workflows/configure-account-email.yml', import.meta.url));

function makeFixture() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'paperbanana-account-email-')));
  const envPath = join(root, 'opt', 'paperbanana', 'secrets', 'gateway.env');
  const credentialsPath = join(root, 'directmail-access-key.json');
  mkdirSync(dirname(envPath), { recursive: true });
  writeFileSync(join(root, '.paperbanana-hk-test-root'), 'paperbanana-hk-test-root-v1\n');
  writeFileSync(envPath, [
    'NODE_ENV=production',
    'BETTER_AUTH_SECRET=preserve-existing-secret',
    'AUTH_EMAIL_DELIVERY_ENABLED=false',
    'AUTH_REQUIRE_EMAIL_VERIFICATION=false',
    '',
  ].join('\n'));
  writeFileSync(credentialsPath, JSON.stringify({
    AccessKey: {
      AccessKeyId: 'dedicated-directmail-id',
      AccessKeySecret: 'dedicated-directmail-secret',
    },
  }));
  chmodSync(root, 0o700);
  chmodSync(join(root, '.paperbanana-hk-test-root'), 0o600);
  chmodSync(envPath, 0o600);
  chmodSync(credentialsPath, 0o400);
  return {
    root,
    envPath,
    credentialsPath,
    run(extra = []) {
      return spawnSync(setter, [
        '--credentials', credentialsPath,
        '--delivery', 'enabled',
        '--verification', 'optional',
        ...extra,
      ], {
        encoding: 'utf8',
        env: { ...process.env, PAPERBANANA_HK_TEST_ROOT: root },
      });
    },
    cleanup() { rmSync(root, { recursive: true, force: true }); },
  };
}

test('account email setter exists and defaults to a secret-free non-mutating dry run', () => {
  assert.equal(existsSync(setter), true, 'account email setter must exist');
  const fixture = makeFixture();
  try {
    const before = readFileSync(fixture.envPath, 'utf8');
    const result = fixture.run();
    assert.equal(result.status, 0, result.stderr);
    assert.equal(readFileSync(fixture.envPath, 'utf8'), before);
    assert.match(result.stdout, /dry-run|would/i);
    assert.doesNotMatch(`${result.stdout}${result.stderr}`, /preserve-existing-secret|dedicated-directmail-(?:id|secret)/);
  } finally {
    fixture.cleanup();
  }
});

test('account email setter atomically enables delivery with optional verification and is idempotent', () => {
  const fixture = makeFixture();
  try {
    const first = fixture.run(['--apply']);
    assert.equal(first.status, 0, first.stderr);
    assert.equal(statSync(fixture.envPath).mode & 0o777, 0o600);
    const contents = readFileSync(fixture.envPath, 'utf8');
    assert.match(contents, /^BETTER_AUTH_SECRET=preserve-existing-secret$/m);
    assert.match(contents, /^AUTH_EMAIL_DELIVERY_ENABLED=true$/m);
    assert.match(contents, /^AUTH_REQUIRE_EMAIL_VERIFICATION=false$/m);
    assert.match(contents, /^AUTH_VERIFICATION_CALLBACK_URL=https:\/\/www\.paperbanana\.asia\/account\/email-verified\.html$/m);
    assert.match(contents, /^AUTH_PASSWORD_RESET_URL=https:\/\/www\.paperbanana\.asia\/account\/reset-password\.html$/m);
    assert.match(contents, /^ALIBABA_DIRECTMAIL_REGION_ID=cn-hangzhou$/m);
    assert.match(contents, /^ALIBABA_DIRECTMAIL_ENDPOINT=dm\.aliyuncs\.com$/m);
    assert.match(contents, /^ALIBABA_DIRECTMAIL_ACCOUNT_NAME=account@mail\.paperbanana\.asia$/m);
    assert.match(contents, /^ALIBABA_DIRECTMAIL_FROM_ALIAS=图研 Tuyan$/m);
    assert.match(contents, /^ALIBABA_DIRECTMAIL_ACCESS_KEY_ID=dedicated-directmail-id$/m);
    assert.match(contents, /^ALIBABA_DIRECTMAIL_ACCESS_KEY_SECRET=dedicated-directmail-secret$/m);
    for (const key of ['AUTH_EMAIL_DELIVERY_ENABLED', 'AUTH_REQUIRE_EMAIL_VERIFICATION', 'ALIBABA_DIRECTMAIL_ACCESS_KEY_ID', 'ALIBABA_DIRECTMAIL_ACCESS_KEY_SECRET']) {
      assert.equal(contents.match(new RegExp(`^${key}=`, 'gm'))?.length, 1, `${key} must be unique`);
    }
    assert.doesNotMatch(`${first.stdout}${first.stderr}`, /preserve-existing-secret|dedicated-directmail-(?:id|secret)/);

    const second = fixture.run(['--apply']);
    assert.equal(second.status, 0, second.stderr);
    assert.equal(readFileSync(fixture.envPath, 'utf8'), contents);
    assert.match(second.stdout, /already|unchanged/i);
  } finally {
    fixture.cleanup();
  }
});

test('account email setter rejects malformed credentials without changing gateway.env', () => {
  const fixture = makeFixture();
  try {
    chmodSync(fixture.credentialsPath, 0o600);
    writeFileSync(fixture.credentialsPath, '{"AccessKey":{"AccessKeyId":"only-id"}}');
    chmodSync(fixture.credentialsPath, 0o400);
    const before = readFileSync(fixture.envPath, 'utf8');
    const result = fixture.run(['--apply']);
    assert.notEqual(result.status, 0);
    assert.equal(readFileSync(fixture.envPath, 'utf8'), before);
  } finally {
    fixture.cleanup();
  }
});

test('manual production workflow transports credentials without printing them and restarts only auth-gateway', () => {
  assert.equal(existsSync(workflow), true, 'manual account email workflow must exist');
  const source = readFileSync(workflow, 'utf8');
  assert.match(source, /workflow_dispatch:/);
  assert.doesNotMatch(source, /\n\s*push:\s*\n/);
  assert.match(source, /environment:\s*paperbanana-production/);
  assert.match(source, /secrets\.ALIBABA_DIRECTMAIL_ACCESS_KEY_ID/);
  assert.match(source, /secrets\.ALIBABA_DIRECTMAIL_ACCESS_KEY_SECRET/);
  assert.match(source, /set-account-email-config\.sh/);
  assert.match(source, /--delivery enabled --verification optional --apply/);
  assert.match(source, /up -d --no-deps --force-recreate auth-gateway/);
  assert.match(source, /https:\/\/api\.paperbanana\.asia\/ready/);
  assert.doesNotMatch(source, /set -x|echo .*ACCESS_KEY|cat .*directmail/i);
});
