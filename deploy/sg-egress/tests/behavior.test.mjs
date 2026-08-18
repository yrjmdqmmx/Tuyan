import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

const deployRoot = fileURLToPath(new URL('../', import.meta.url));
const scripts = join(deployRoot, 'scripts');
const validPublicKey = 'AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE=';
const zeroPublicKey = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

function writeExecutable(path, body) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body, 'utf8');
  chmodSync(path, 0o755);
}

function makeFixture(overrides = {}) {
  const root = mkdtempSync(join(tmpdir(), 'paperbanana-sg-egress-'));
  const bin = join(root, 'bin');
  const commandLog = join(root, 'commands.log');
  const sshdOutput = join(root, 'sshd-effective.txt');
  mkdirSync(bin, { recursive: true });
  mkdirSync(join(root, 'etc', 'ssh', 'sshd_config.d'), { recursive: true });
  mkdirSync(join(root, 'etc', 'wireguard'), { recursive: true });
  mkdirSync(join(root, 'etc', 'squid'), { recursive: true });
  mkdirSync(join(root, 'opt', 'paperbanana-sg-egress'), { recursive: true });
  writeFileSync(join(root, 'etc', 'os-release'), 'ID=ubuntu\nVERSION_ID="24.04"\n');
  writeFileSync(join(root, 'etc', 'ssh', 'sshd_config'), 'Include /etc/ssh/sshd_config.d/*.conf\n');
  writeFileSync(join(root, 'etc', 'squid', 'squid.conf'), '# package squid configuration\n');
  writeFileSync(join(root, 'etc', 'fstab'), '');
  writeFileSync(sshdOutput, [
    'permitrootlogin no',
    'passwordauthentication no',
    'pubkeyauthentication yes',
    'kbdinteractiveauthentication no',
    'allowtcpforwarding no',
    'maxauthtries 3',
    'allowusers ecs-user',
  ].join('\n'));

  const stub = (name, body) => writeExecutable(join(bin, name), `#!/bin/sh\nset -eu\nprintf '%s %s\\n' '${name}' "$*" >> "${commandLog}"\n${body}\n`);
  stub('apt-get', 'exit 0');
  stub('id', 'test "$1" = "-u" && test "$2" = "ecs-user"');
  stub('fallocate', 'mkdir -p "$(dirname "$3")"; : > "$3"');
  stub('mkswap', 'exit 0');
  stub('swapon', 'exit 0');
  stub('stat', `
if test "$1" = "-c"; then
  case "$2" in
    %a:%u) printf '%s\\n' "${overrides.keyMetadata ?? '600:0'}" ;;
    %s) printf '%s\\n' "${overrides.swapSize ?? '1073741824'}" ;;
    %a) printf '%s\\n' "${overrides.swapMode ?? '600'}" ;;
    %F) printf '%s\\n' "${overrides.swapType ?? 'regular file'}" ;;
    %u) printf '%s\\n' "${overrides.swapOwner ?? '0'}" ;;
  esac
fi`);
  stub('sshd', `
case " $* " in
  *' -T '*) cat "${sshdOutput}"; exit ${overrides.sshdTestExit ?? 0} ;;
  *' -t '*) exit ${overrides.sshdSyntaxExit ?? 0} ;;
esac
exit 0`);
  stub('systemctl', `
case " $* " in
  *' is-active --quiet hbrclient.service '*) exit ${overrides.hbrClientActive ? 0 : 3} ;;
  *' is-active --quiet hbrclientupdater.service '*) exit ${overrides.hbrUpdaterActive ? 0 : 3} ;;
  *' list-unit-files --no-legend '*) test ${overrides.hbrUnitListed ? 1 : 0} = 1 && printf '%s\\n' 'hbrclient.service enabled'; exit 0 ;;
  *' is-active --quiet wg-quick@pbsg0 '*) exit ${overrides.pbsg0Active ? 0 : 3} ;;
  *' reload ssh '*)
    if test ${overrides.failSshReloadOnce ? 1 : 0} = 1 && test ! -e "${root}/reload-once"; then : > "${root}/reload-once"; exit 1; fi
    exit ${overrides.failSshReload ? 1 : 0} ;;
  *' disable --now wg-quick@pbsg0 '*) exit ${overrides.failWgStop ? 1 : 0} ;;
  *' disable --now squid '*) exit ${overrides.failSquidStop ? 1 : 0} ;;
esac
exit 0`);
  stub('wg', `
case "$1" in
  genkey) printf '%s\\n' 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=' ;;
  pubkey) cat >/dev/null; exit ${overrides.wgPubkeyExit ?? 0} ;;
  show) exit 0 ;;
esac`);
  stub('squid', `
for arg in "$@"; do
  case "$arg" in
    *.conf) test -r "$arg" || exit 1 ;;
  esac
done
exit ${overrides.squidParseExit ?? 0}`);
  stub('ss', `
printf '%s\\n' 'LISTEN 0 4096 10.77.0.2:3128 0.0.0.0:*'
${overrides.extraProxyListener ? "printf '%s\\n' 'LISTEN 0 4096 0.0.0.0:3128 0.0.0.0:*'" : ''}`);
  stub('logger', 'exit 0');
  stub('curl', `
last=''
for arg in "$@"; do last="$arg"; done
case "$last" in
  *:444*) printf '000:403'; exit ${overrides.deniedExit ?? 56} ;;
  *api.openai.com*) printf '401:200'; exit ${overrides.openAiExit ?? 0} ;;
  *generativelanguage.googleapis.com*) printf '403:200'; exit ${overrides.geminiExit ?? 0} ;;
  *openrouter.ai*) printf '200:200'; exit ${overrides.openRouterExit ?? 0} ;;
  *) printf '000:403'; exit ${overrides.deniedExit ?? 56} ;;
esac`);

  const env = {
    ...process.env,
    PATH: `${bin}:${process.env.PATH}`,
    PAPERBANANA_SG_EGRESS_TEST_ROOT: root,
    HK_WG_PUBLIC_KEY_FILE: join(root, 'root', 'hk-wg-public.key'),
    HK_WG_ENDPOINT: 'hk-egress.example.invalid:51820',
  };
  mkdirSync(dirname(env.HK_WG_PUBLIC_KEY_FILE), { recursive: true });
  writeFileSync(env.HK_WG_PUBLIC_KEY_FILE, validPublicKey);

  return {
    root,
    env,
    commandLog,
    sshdOutput,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

function run(fixture, script, args = []) {
  return spawnSync(join(scripts, script), args, {
    encoding: 'utf8',
    env: fixture.env,
  });
}

function commandLog(fixture) {
  return existsSync(fixture.commandLog) ? readFileSync(fixture.commandLog, 'utf8') : '';
}

test('dry-run gates execute without writes in a temporary host root', () => {
  const fixture = makeFixture();
  try {
    const before = readdirSync(join(fixture.root, 'etc', 'wireguard'));
    for (const script of ['bootstrap-host.sh', 'install-egress.sh', 'install-health-monitor.sh', 'uninstall.sh']) {
      const result = run(fixture, script);
      assert.equal(result.status, 0, `${script}: ${result.stderr}`);
    }
    assert.deepEqual(readdirSync(join(fixture.root, 'etc', 'wireguard')), before);
    assert.equal(commandLog(fixture), '');
  } finally {
    fixture.cleanup();
  }
});

test('bootstrap fails when HBR is active even without its uninstaller', () => {
  const fixture = makeFixture({ hbrClientActive: true });
  try {
    const result = run(fixture, 'bootstrap-host.sh', ['--apply']);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /hbrclient/i);
    assert.doesNotMatch(commandLog(fixture), /systemctl reload ssh/);
  } finally {
    fixture.cleanup();
  }
});

test('bootstrap rejects an installed HBR unit even when it is inactive and lacks an uninstaller', () => {
  const fixture = makeFixture({ hbrUnitListed: true });
  try {
    const result = run(fixture, 'bootstrap-host.sh', ['--apply']);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /hbrclient.*installed|installed.*hbrclient/i);
    assert.doesNotMatch(commandLog(fixture), /systemctl reload ssh/);
  } finally {
    fixture.cleanup();
  }
});

test('bootstrap restores the prior SSH drop-in when effective sshd policy is unsafe', () => {
  const fixture = makeFixture();
  try {
    const dropIn = join(fixture.root, 'etc', 'ssh', 'sshd_config.d', '00-paperbanana-sg-egress.conf');
    writeFileSync(dropIn, '# previous safe operator content\n');
    writeFileSync(fixture.sshdOutput, 'permitrootlogin no\npasswordauthentication yes\n');
    const result = run(fixture, 'bootstrap-host.sh', ['--apply']);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /effective sshd policy/i);
    assert.equal(readFileSync(dropIn, 'utf8'), '# previous safe operator content\n');
    assert.doesNotMatch(commandLog(fixture), /systemctl reload ssh/);
  } finally {
    fixture.cleanup();
  }
});

test('bootstrap validates the ecs-user Match-effective SSH policy and retains public-key access', () => {
  const fixture = makeFixture();
  try {
    const result = run(fixture, 'bootstrap-host.sh', ['--apply']);
    assert.equal(result.status, 0, result.stderr);
    const log = commandLog(fixture);
    assert.match(log, /sshd -T -C user=ecs-user,host=localhost,addr=127\.0\.0\.1/);
    const dropIn = readFileSync(join(fixture.root, 'etc', 'ssh', 'sshd_config.d', '00-paperbanana-sg-egress.conf'), 'utf8');
    assert.match(dropIn, /PubkeyAuthentication yes/);
  } finally {
    fixture.cleanup();
  }
});

test('bootstrap restores the prior SSH drop-in when SSH reload fails', () => {
  const fixture = makeFixture({ failSshReload: true });
  try {
    const dropIn = join(fixture.root, 'etc', 'ssh', 'sshd_config.d', '00-paperbanana-sg-egress.conf');
    writeFileSync(dropIn, '# previous safe operator content\n');
    const result = run(fixture, 'bootstrap-host.sh', ['--apply']);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /reload ssh failed/i);
    assert.equal(readFileSync(dropIn, 'utf8'), '# previous safe operator content\n');
  } finally {
    fixture.cleanup();
  }
});

test('bootstrap restores and reloads the prior SSH policy after a transient reload failure', () => {
  const fixture = makeFixture({ failSshReloadOnce: true });
  try {
    const dropIn = join(fixture.root, 'etc', 'ssh', 'sshd_config.d', '00-paperbanana-sg-egress.conf');
    writeFileSync(dropIn, '# previous safe operator content\n');
    const result = run(fixture, 'bootstrap-host.sh', ['--apply']);
    assert.notEqual(result.status, 0);
    assert.equal(readFileSync(dropIn, 'utf8'), '# previous safe operator content\n');
    assert.equal((commandLog(fixture).match(/systemctl reload ssh/g) ?? []).length, 2);
  } finally {
    fixture.cleanup();
  }
});

test('bootstrap rejects an existing swapfile that is not root-owned regular mode-0600 storage', () => {
  const fixture = makeFixture({ swapOwner: '501' });
  try {
    writeFileSync(join(fixture.root, 'swapfile'), 'fixture');
    const result = run(fixture, 'bootstrap-host.sh', ['--apply']);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /root-owned regular file/i);
  } finally {
    fixture.cleanup();
  }
});

test('install refuses to overwrite a non-PaperBanana project WireGuard interface', () => {
  const fixture = makeFixture();
  try {
    const config = join(fixture.root, 'etc', 'wireguard', 'pbsg0.conf');
    writeFileSync(config, '# another operator owns this interface\n');
    const result = run(fixture, 'install-egress.sh', ['--apply']);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /pbsg0.*managed/i);
    assert.equal(readFileSync(config, 'utf8'), '# another operator owns this interface\n');
  } finally {
    fixture.cleanup();
  }
});

test('install rejects an all-zero WireGuard peer public key', () => {
  const fixture = makeFixture();
  try {
    writeFileSync(fixture.env.HK_WG_PUBLIC_KEY_FILE, zeroPublicKey);
    const result = run(fixture, 'install-egress.sh', ['--apply']);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /all-zero|invalid WireGuard public key/i);
  } finally {
    fixture.cleanup();
  }
});

test('install parses the Squid candidate before replacing the live configuration', () => {
  const fixture = makeFixture({ squidParseExit: 1 });
  try {
    const squidConfig = join(fixture.root, 'etc', 'squid', 'squid.conf');
    const original = readFileSync(squidConfig, 'utf8');
    const result = run(fixture, 'install-egress.sh', ['--apply']);
    assert.notEqual(result.status, 0);
    assert.equal(readFileSync(squidConfig, 'utf8'), original);
  } finally {
    fixture.cleanup();
  }
});

test('uninstall removes only marked egress configuration when the Squid package backup is absent', () => {
  const fixture = makeFixture();
  try {
    const wgConfig = join(fixture.root, 'etc', 'wireguard', 'pbsg0.conf');
    const wgKey = join(fixture.root, 'etc', 'wireguard', 'paperbanana-sg-egress.private');
    const squidConfig = join(fixture.root, 'etc', 'squid', 'squid.conf');
    writeFileSync(wgConfig, '# Managed by PaperBanana Singapore egress\n');
    writeFileSync(wgKey, 'private-material-not-real\n');
    writeFileSync(squidConfig, '# Managed by PaperBanana Singapore egress\n');
    const result = run(fixture, 'uninstall.sh', ['--apply']);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(existsSync(wgConfig), false);
    assert.equal(existsSync(wgKey), false);
    assert.equal(existsSync(squidConfig), false);
  } finally {
    fixture.cleanup();
  }
});

test('uninstall fails closed when pbsg0 remains active without a marked configuration', () => {
  const fixture = makeFixture({ pbsg0Active: true });
  try {
    const result = run(fixture, 'uninstall.sh', ['--apply']);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /pbsg0.*active.*configuration|active.*pbsg0/i);
  } finally {
    fixture.cleanup();
  }
});

test('HK smoke accepts explicit proxy 403 after curl exits nonzero and rejects only exact 403', () => {
  const fixture = makeFixture({ deniedExit: 22 });
  try {
    const success = run(fixture, 'smoke.sh', ['--hk']);
    assert.equal(success.status, 0, success.stderr);

    const wrongStatusFixture = makeFixture({ deniedExit: 22 });
    try {
      writeExecutable(join(wrongStatusFixture.root, 'bin', 'curl'), `#!/bin/sh
last=''
for arg in "$@"; do last="$arg"; done
case "$last" in
  https://api.openai.com:444/|https://example.com/|https://1.1.1.1/) printf '500:200'; exit 0 ;;
  https://api.openai.com/v1/models) printf '401:200' ;;
  https://generativelanguage.googleapis.com/v1beta/models) printf '403:200' ;;
  https://openrouter.ai/api/v1/models) printf '200:200' ;;
esac
`);
      const failure = run(wrongStatusFixture, 'smoke.sh', ['--hk']);
      assert.notEqual(failure.status, 0);
      assert.match(failure.stderr, /expected proxy rejection 403/i);
    } finally {
      wrongStatusFixture.cleanup();
    }
  } finally {
    fixture.cleanup();
  }
});

test('SG health monitor probes the three unauthenticated provider status contracts through its proxy', () => {
  const fixture = makeFixture();
  try {
    const result = run(fixture, 'monitor-health.sh');
    assert.equal(result.status, 0, result.stderr);
    const log = commandLog(fixture);
    assert.match(log, /curl .*--interface pbsg0 .*api\.openai\.com/);
    assert.match(log, /curl .*api\.openai\.com/);
    assert.match(log, /curl .*generativelanguage\.googleapis\.com/);
    assert.match(log, /curl .*openrouter\.ai/);
  } finally {
    fixture.cleanup();
  }
});

test('SG health monitor fails when Squid has any additional 3128 listener', () => {
  const fixture = makeFixture({ extraProxyListener: true });
  try {
    const result = run(fixture, 'monitor-health.sh');
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /not restricted to 10\.77\.0\.2:3128/i);
  } finally {
    fixture.cleanup();
  }
});
