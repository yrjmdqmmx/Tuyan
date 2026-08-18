import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

const deployRoot = fileURLToPath(new URL('../', import.meta.url));
const scripts = join(deployRoot, 'scripts');
const policyValidator = join(deployRoot, 'tests', 'squid-policy-validator.mjs');
const secretScanner = join(deployRoot, 'tests', 'scan-egress-secrets.mjs');
const validPublicKey = ['AQEBAQEBAQEBAQEBAQEBAQ', 'EBAQEBAQEBAQEBAQEBAQE='].join('');
const zeroPublicKey = `${'A'.repeat(43)}=`;
const validSshPublicKey = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBf9m5RJJPnGczaTU6Fxrn2WiyqaiThvgfHjeWpCVNe1 paperbanana-fixture';
const fixtureUid = process.getuid?.();
const fixtureRoots = new Set();

function cleanupFixtureRoots() {
  for (const root of fixtureRoots) rmSync(root, { recursive: true, force: true });
  fixtureRoots.clear();
}

process.once('exit', cleanupFixtureRoots);
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    cleanupFixtureRoots();
    process.exit(signal === 'SIGINT' ? 130 : 143);
  });
}

function writeExecutable(path, body) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body, 'utf8');
  chmodSync(path, 0o755);
}

function makeFixture(overrides = {}) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'paperbanana-sg-egress-')));
  fixtureRoots.add(root);
  const bin = join(root, 'bin');
  const commandLog = join(root, 'commands.log');
  const sshdOutput = join(root, 'sshd-effective.txt');
  const rootSshdOutput = join(root, 'sshd-root-effective.txt');
  const ecsHome = join(root, 'home', 'ecs-user');
  const ecsSshDir = join(ecsHome, '.ssh');
  const ecsAuthorizedKeys = join(ecsSshDir, 'authorized_keys');
  const exactSquidPid = overrides.exactSquidPid === true ? 123 : overrides.exactSquidPid;
  const state = {
    wgActive: join(root, 'state-wg-active'),
    wgInterface: join(root, 'state-wg-interface'),
    wgLoaded: join(root, 'state-wg-loaded'),
    wgConfigPresentOnStop: join(root, 'state-wg-config-present-on-stop'),
    squidActive: join(root, 'state-squid-active'),
    squidProcess: join(root, 'state-squid-process'),
    squidLoaded: join(root, 'state-squid-loaded'),
    proxyListener: join(root, 'state-project-proxy-listener'),
    healthTimerActive: join(root, 'state-health-timer-active'),
    healthTimerLoaded: join(root, 'state-health-timer-loaded'),
    healthServiceActive: join(root, 'state-health-service-active'),
    healthServiceLoaded: join(root, 'state-health-service-loaded'),
    hkHealthTimerActive: join(root, 'state-hk-health-timer-active'),
    hkHealthTimerEnabled: join(root, 'state-hk-health-timer-enabled'),
    hkHealthTimerLoaded: join(root, 'state-hk-health-timer-loaded'),
    hkHealthServiceActive: join(root, 'state-hk-health-service-active'),
    hkHealthServiceLoaded: join(root, 'state-hk-health-service-loaded'),
  };
  mkdirSync(bin, { recursive: true });
  mkdirSync(join(root, 'etc', 'ssh', 'sshd_config.d'), { recursive: true });
  mkdirSync(join(root, 'etc', 'wireguard'), { recursive: true });
  mkdirSync(join(root, 'etc', 'squid'), { recursive: true });
  mkdirSync(join(root, 'opt', 'paperbanana-sg-egress', 'scripts'), { recursive: true });
  mkdirSync(join(root, 'unit-source'), { recursive: true });
  mkdirSync(ecsSshDir, { recursive: true });
  writeFileSync(join(root, '.paperbanana-sg-egress-test-root'), 'paperbanana-sg-egress-test-root-v1\n');
  chmodSync(root, 0o700);
  chmodSync(join(root, '.paperbanana-sg-egress-test-root'), 0o600);
  writeFileSync(join(root, 'etc', 'os-release'), 'ID=ubuntu\nVERSION_ID="24.04"\n');
  writeFileSync(join(root, 'etc', 'ssh', 'sshd_config'), 'Include /etc/ssh/sshd_config.d/*.conf\n');
  writeFileSync(join(root, 'etc', 'squid', 'squid.conf'), '# package squid configuration\n');
  writeFileSync(join(root, 'etc', 'fstab'), '');
  writeFileSync(join(root, 'opt', 'paperbanana-sg-egress', 'scripts', 'monitor-health.sh'), '#!/usr/bin/env bash\n');
  writeFileSync(join(root, 'opt', 'paperbanana-sg-egress', 'scripts', 'smoke.sh'), '#!/usr/bin/env bash\n');
  writeFileSync(join(root, 'unit-source', 'paperbanana-hk-egress-health@.service'), '# Managed by PaperBanana Singapore egress\n[Service]\n');
  writeFileSync(join(root, 'unit-source', 'paperbanana-hk-egress-health@.timer'), '# Managed by PaperBanana Singapore egress\n[Timer]\n');
  chmodSync(join(root, 'opt', 'paperbanana-sg-egress', 'scripts', 'monitor-health.sh'), 0o750);
  chmodSync(join(root, 'opt', 'paperbanana-sg-egress', 'scripts', 'smoke.sh'), 0o750);
  writeFileSync(ecsAuthorizedKeys, `${validSshPublicKey}\n`);
  chmodSync(ecsHome, 0o750);
  chmodSync(ecsSshDir, 0o700);
  chmodSync(ecsAuthorizedKeys, 0o600);
  writeFileSync(sshdOutput, [
    'permitrootlogin no',
    'passwordauthentication no',
    'pubkeyauthentication yes',
    'kbdinteractiveauthentication no',
    'allowtcpforwarding no',
    'maxauthtries 3',
    'allowusers ecs-user',
  ].join('\n'));
  writeFileSync(rootSshdOutput, overrides.rootSshdOutput ?? readFileSync(sshdOutput, 'utf8'));

  const touchState = (path, enabled) => {
    if (enabled) writeFileSync(path, '1');
  };
  touchState(state.wgActive, overrides.pbsg0Active);
  touchState(state.wgInterface, overrides.pbsg0Interface ?? overrides.pbsg0Active);
  touchState(state.wgLoaded, overrides.pbsg0Loaded ?? overrides.pbsg0Active);
  touchState(state.squidActive, overrides.squidActive);
  touchState(state.squidProcess, overrides.squidProcess ?? overrides.squidActive);
  touchState(state.squidLoaded, overrides.squidLoaded ?? overrides.squidActive);
  touchState(state.proxyListener, overrides.projectProxyListener);
  touchState(state.healthTimerActive, overrides.healthTimerActive);
  touchState(state.healthTimerLoaded, overrides.healthTimerLoaded ?? overrides.healthTimerActive);
  touchState(state.healthServiceActive, overrides.healthServiceActive);
  touchState(state.healthServiceLoaded, overrides.healthServiceLoaded ?? overrides.healthServiceActive);
  touchState(state.hkHealthTimerActive, overrides.hkHealthTimerActive);
  touchState(state.hkHealthTimerEnabled, overrides.hkHealthTimerEnabled ?? overrides.hkHealthTimerActive);
  touchState(state.hkHealthTimerLoaded, overrides.hkHealthTimerLoaded ?? overrides.hkHealthTimerActive);
  touchState(state.hkHealthServiceActive, overrides.hkHealthServiceActive);
  touchState(state.hkHealthServiceLoaded, overrides.hkHealthServiceLoaded ?? overrides.hkHealthServiceActive);

  const stub = (name, body) => writeExecutable(join(bin, name), `#!/bin/sh\nset -eu\nprintf '%s %s\\n' '${name}' "$*" >> "${commandLog}"\n${body}\n`);
  stub('apt-get', overrides.stallAptGet ? 'exec sleep 2' : 'exit 0');
  stub('id', `
test "$1" = "-u" && test "$2" = "ecs-user" || exit 1
printf '%s\\n' '${overrides.ecsUserId ?? '1001'}'`);
  stub('getent', `
test "$1" = passwd && test "$2" = ecs-user || exit 2
exit_code='${overrides.getentExit ?? 0}'
test "$exit_code" = 0 || exit "$exit_code"
printf '%s\\n' 'ecs-user:x:${overrides.ecsUserId ?? '1001'}:1001::${ecsHome}:/bin/bash'`);
  stub('fallocate', 'mkdir -p "$(dirname "$3")"; : > "$3"');
  stub('mkswap', 'exit 0');
  stub('swapon', 'exit 0');
  stub('stat', `
if test "$1" = "-c"; then
  path="$3"
  test "$path" = -- && path="$4"
  case "$2" in
    %a:%u) printf '%s\\n' "${overrides.keyMetadata ?? '600:0'}" ;;
    %s) printf '%s\\n' "${overrides.swapSize ?? '1073741824'}" ;;
    %a) printf '%s\\n' "${overrides.swapMode ?? '600'}" ;;
    %F) printf '%s\\n' "${overrides.swapType ?? 'regular file'}" ;;
    %u) printf '%s\\n' "${overrides.swapOwner ?? '0'}" ;;
    %F:%u:%a)
      case "$path" in
        "${root}") printf '%s\\n' "${overrides.testRootDirectoryMetadata ?? `directory:${fixtureUid}:700`}" ;;
        "${root}/.paperbanana-sg-egress-test-root") printf '%s\\n' "${overrides.testRootMarkerMetadata ?? `regular file:${fixtureUid}:600`}" ;;
        */wireguard/pbsg0.conf) printf '%s\\n' "${overrides.wgConfigMetadata ?? 'regular file:0:600'}" ;;
        */unit-source/paperbanana-hk-egress-health@.service|*/unit-source/paperbanana-hk-egress-health@.timer) printf '%s\\n' "${overrides.unitSourceMetadata ?? 'regular file:0:644'}" ;;
        */unit-source) printf '%s\\n' "${overrides.unitSourceDirectoryMetadata ?? 'directory:0:755'}" ;;
        "${ecsHome}") printf '%s\\n' "${overrides.ecsHomeMetadata ?? `directory:${overrides.ecsUserId ?? '1001'}:750`}" ;;
        "${ecsSshDir}") printf '%s\\n' "${overrides.ecsSshDirectoryMetadata ?? `directory:${overrides.ecsUserId ?? '1001'}:700`}" ;;
        "${ecsAuthorizedKeys}") printf '%s\\n' "${overrides.ecsAuthorizedKeysMetadata ?? `regular file:${overrides.ecsUserId ?? '1001'}:600`}" ;;
        */monitor-health.sh) printf '%s\\n' "${overrides.runtimeMonitorMetadata ?? 'regular file:0:750'}" ;;
        */smoke.sh) printf '%s\\n' "${overrides.runtimeSmokeMetadata ?? 'regular file:0:750'}" ;;
        *) printf '%s\\n' "${overrides.runtimeDirectoryMetadata ?? 'directory:0:750'}" ;;
      esac ;;
  esac
fi`);
  stub('sshd', `
case " $* " in
  *' -T '*'user=root'*) cat "${rootSshdOutput}"; exit ${overrides.sshdTestExit ?? 0} ;;
  *' -T '*) cat "${sshdOutput}"; exit ${overrides.sshdTestExit ?? 0} ;;
  *' -t '*) exit ${overrides.sshdSyntaxExit ?? 0} ;;
esac
exit 0`);
  stub('systemctl', `
case " $* " in
  *' is-active --quiet hbrclient.service '*) test ${overrides.hbrClientQueryExit ?? 3} = 3 || exit ${overrides.hbrClientQueryExit ?? 3}; exit ${overrides.hbrClientActive ? 0 : 3} ;;
  *' is-active --quiet hbrclientupdater.service '*) test ${overrides.hbrUpdaterQueryExit ?? 3} = 3 || exit ${overrides.hbrUpdaterQueryExit ?? 3}; exit ${overrides.hbrUpdaterActive ? 0 : 3} ;;
  *' list-unit-files --no-legend '*) test ${overrides.hbrUnitListed ? 1 : 0} = 1 && printf '%s\\n' 'hbrclient.service enabled'; exit 0 ;;
  *' enable --now wg-quick@pbsg0 '*) : > "${state.wgActive}"; : > "${state.wgInterface}"; : > "${state.wgLoaded}"; exit 0 ;;
  *' enable --now squid '*) : > "${state.squidActive}"; : > "${state.squidProcess}"; : > "${state.squidLoaded}"; : > "${state.proxyListener}"; exit 0 ;;
  *' enable --now paperbanana-hk-egress-health@pbhk0.timer '*) : > "${state.hkHealthTimerActive}"; : > "${state.hkHealthTimerEnabled}"; : > "${state.hkHealthTimerLoaded}"; exit 0 ;;
  *' enable paperbanana-hk-egress-health@pbhk0.timer '*) : > "${state.hkHealthTimerEnabled}"; : > "${state.hkHealthTimerLoaded}"; exit 0 ;;
  *' start paperbanana-hk-egress-health@pbhk0.timer '*) : > "${state.hkHealthTimerActive}"; : > "${state.hkHealthTimerLoaded}"; exit 0 ;;
  *' start paperbanana-hk-egress-health@pbhk0.service '*)
    test ${overrides.failHkServiceStart ? 1 : 0} = 1 && exit 1
    test ${overrides.hkServiceStartsInactive ? 1 : 0} = 1 || : > "${state.hkHealthServiceActive}"
    : > "${state.hkHealthServiceLoaded}"; exit 0 ;;
  *' is-active --quiet wg-quick@pbsg0 '*) test -e "${state.wgActive}" && exit 0 || exit 3 ;;
  *' is-active --quiet squid '*) test -e "${state.squidActive}" && exit 0 || exit 3 ;;
  *' reload wg-quick@pbsg0 '*)
    test ${overrides.failWgReload ? 1 : 0} = 1 && exit 1
    if test ${overrides.failWgReloadOnce ? 1 : 0} = 1 && test ! -e "${root}/wg-reload-once"; then : > "${root}/wg-reload-once"; exit 1; fi
    : > "${state.wgActive}"; : > "${state.wgInterface}"; : > "${state.wgLoaded}"; exit 0 ;;
  *' restart squid '*)
    test ${overrides.failSquidRestart ? 1 : 0} = 1 && exit 1
    if test ${overrides.failSquidRestartOnce ? 1 : 0} = 1 && test ! -e "${root}/squid-restart-once"; then : > "${root}/squid-restart-once"; exit 1; fi
    : > "${state.squidActive}"; : > "${state.squidProcess}"; : > "${state.squidLoaded}"; : > "${state.proxyListener}"; exit 0 ;;
  *' is-active --quiet paperbanana-sg-egress-health.timer '*) test -e "${state.healthTimerActive}" && exit 0 || exit 3 ;;
  *' is-active --quiet paperbanana-sg-egress-health.service '*) test -e "${state.healthServiceActive}" && exit 0 || exit 3 ;;
  *' is-active --quiet paperbanana-hk-egress-health@pbhk0.timer '*) test ${overrides.failHkTimerStateQuery ? 1 : 0} = 1 && exit 1; test -e "${state.hkHealthTimerActive}" && exit 0 || exit 3 ;;
  *' is-enabled paperbanana-hk-egress-health@pbhk0.timer '*)
    test ${overrides.failHkTimerEnabledQuery ? 1 : 0} = 1 && exit 1
    if test -e "${state.hkHealthTimerEnabled}"; then printf '%s\\n' enabled; exit 0; fi
    printf '%s\\n' disabled; exit 1 ;;
  *' is-active --quiet paperbanana-hk-egress-health@pbhk0.service '*) test -e "${state.hkHealthServiceActive}" && exit 0 || exit 3 ;;
  *' show --property=Result --value paperbanana-hk-egress-health@pbhk0.service '*) printf '%s\\n' '${overrides.hkServiceResult ?? 'success'}'; exit 0 ;;
  *' show --property=ExecMainStatus --value paperbanana-hk-egress-health@pbhk0.service '*) printf '%s\\n' '${overrides.hkServiceExecMainStatus ?? '0'}'; exit 0 ;;
  *' show --property=LoadState --value wg-quick@pbsg0 '*) test -e "${state.wgLoaded}" && printf '%s\\n' loaded || printf '%s\\n' not-found; exit 0 ;;
  *' show --property=LoadState --value squid '*) test -e "${state.squidLoaded}" && printf '%s\\n' loaded || printf '%s\\n' not-found; exit 0 ;;
  *' show --property=LoadState --value paperbanana-sg-egress-health.timer '*) test -e "${state.healthTimerLoaded}" && printf '%s\\n' loaded || printf '%s\\n' not-found; exit 0 ;;
  *' show --property=LoadState --value paperbanana-sg-egress-health.service '*) test -e "${state.healthServiceLoaded}" && printf '%s\\n' loaded || printf '%s\\n' not-found; exit 0 ;;
  *' show --property=LoadState --value paperbanana-hk-egress-health@pbhk0.timer '*) test ${overrides.failHkTimerStateQuery ? 1 : 0} = 1 && exit 1; test -e "${state.hkHealthTimerLoaded}" && printf '%s\\n' loaded || printf '%s\\n' not-found; exit 0 ;;
  *' show --property=LoadState --value paperbanana-hk-egress-health@pbhk0.service '*) test -e "${state.hkHealthServiceLoaded}" && printf '%s\\n' loaded || printf '%s\\n' not-found; exit 0 ;;
  *' reload ssh '*)
    if test ${overrides.failSshReloadOnce ? 1 : 0} = 1 && test ! -e "${root}/reload-once"; then : > "${root}/reload-once"; exit 1; fi
    exit ${overrides.failSshReload ? 1 : 0} ;;
  *' disable --now wg-quick@pbsg0 '*|*' stop wg-quick@pbsg0 '*)
    test ${overrides.failWgStop ? 1 : 0} = 1 && exit 1
    if test ${overrides.recordWgConfigOnStop ? 1 : 0} = 1 && test -e "${root}/etc/wireguard/pbsg0.conf"; then : > "${state.wgConfigPresentOnStop}"; fi
    rm -f -- "${state.wgActive}" "${state.wgLoaded}" "${state.wgInterface}"
    exit 0 ;;
  *' disable --now squid '*|*' stop squid '*)
    test ${overrides.failSquidStop ? 1 : 0} = 1 && exit 1
    rm -f -- "${state.squidActive}" "${state.squidLoaded}" "${state.squidProcess}" "${state.proxyListener}"
    exit 0 ;;
  *' disable --now paperbanana-sg-egress-health.timer '*|*' stop paperbanana-sg-egress-health.timer '*)
    rm -f -- "${state.healthTimerActive}" "${state.healthTimerLoaded}"
    exit 0 ;;
  *' disable --now paperbanana-sg-egress-health.service '*|*' stop paperbanana-sg-egress-health.service '*)
    rm -f -- "${state.healthServiceActive}" "${state.healthServiceLoaded}"
    exit 0 ;;
  *' disable --now paperbanana-hk-egress-health@pbhk0.timer '*|*' stop paperbanana-hk-egress-health@pbhk0.timer '*)
    test ${overrides.failHkTimerStop ? 1 : 0} = 1 && exit 1
    test ${overrides.leaveHkTimerActive ? 1 : 0} = 1 && exit 0
    rm -f -- "${state.hkHealthTimerActive}" "${state.hkHealthTimerEnabled}" "${state.hkHealthTimerLoaded}"
    exit 0 ;;
  *' disable --now paperbanana-hk-egress-health@pbhk0.service '*|*' stop paperbanana-hk-egress-health@pbhk0.service '*)
    test ${overrides.failHkServiceStop ? 1 : 0} = 1 && exit 1
    test ${overrides.leaveHkServiceActive ? 1 : 0} = 1 && exit 0
    rm -f -- "${state.hkHealthServiceActive}" "${state.hkHealthServiceLoaded}"
    exit 0 ;;
esac
exit 0`);
  stub('wg', `
case "$1" in
  genkey) printf '%s=' "$(printf 'B%.0s' $(seq 1 43))"; printf '\\n' ;;
  pubkey) cat >/dev/null; exit ${overrides.wgPubkeyExit ?? 0} ;;
  show)
    if test "\${2:-}" = pbsg0 && test "\${3:-}" = peers; then printf '%s\\n' '${overrides.livePeerKey ?? validPublicKey}'; exit 0; fi
    if test "\${2:-}" = pbsg0 && test "\${3:-}" = endpoints; then printf '%s\\t%s\\n' '${overrides.livePeerKey ?? validPublicKey}' '${overrides.liveEndpoint ?? 'hk-egress.example.invalid:51820'}'; exit 0; fi
    if test "\${2:-}" = pbhk0 && test "\${3:-}" = latest-handshakes; then
      printf '%s %s\\n' "$(printf 'C%.0s' $(seq 1 43))=" '${overrides.latestHandshake ?? Math.floor(Date.now() / 1000)}'
    fi
    exit 0 ;;
esac`);
  stub('wg-quick', `
test "$1" = strip && test -r "$2" || exit 1
if test ${overrides.wgQuickRequiresInterfaceBasename ? 1 : 0} = 1; then test "$(basename "$2")" = pbsg0.conf || exit 1; fi
exit 0`);
  stub('squid', `
for arg in "$@"; do
  case "$arg" in
    *.conf) test -r "$arg" || exit 1 ;;
  esac
done
exit ${overrides.squidParseExit ?? 0}`);
  stub('systemd-analyze', `test ${overrides.systemdAnalyzeExit ?? 0} = 0`);
  stub('ss', `
test ${overrides.ssQueryExit ?? 0} = 0 || exit ${overrides.ssQueryExit ?? 0}
if test -e "${state.proxyListener}"; then
  if test ${exactSquidPid ? 1 : 0} = 1 && case " $* " in *' -p '*) true;; *) false;; esac; then
    printf '%s\\n' 'LISTEN 0 4096 10.77.0.2:3128 0.0.0.0:* users:(("squid",pid=${exactSquidPid},fd=8))'
  else
    printf '%s\\n' 'LISTEN 0 4096 10.77.0.2:3128 0.0.0.0:*'
  fi
fi
${overrides.extraProxyListener ? "printf '%s\\n' 'LISTEN 0 4096 0.0.0.0:3128 0.0.0.0:*'" : ''}`);
  stub('ip', `
case " $* " in
  *' -4 addr show dev pbhk0 '*) printf '%s\\n' '7: pbhk0: <POINTOPOINT,UP> mtu 1420' '    inet 10.77.0.1/30 scope global pbhk0'; exit 0 ;;
  *' -4 addr show dev pbsg0 '*) printf '%s\\n' '7: pbsg0: <POINTOPOINT,UP> mtu 1420' '    inet 10.77.0.2/30 scope global pbsg0'; exit 0 ;;
  *' -4 -o addr show dev pbsg0 '*) printf '%s\\n' '7: pbsg0    inet 10.77.0.2/30 scope global pbsg0'; exit 0 ;;
  *' link show dev pbsg0 '*) test ${overrides.ipLinkQueryExit ?? 0} = 0 || exit ${overrides.ipLinkQueryExit ?? 0}; test -e "${state.wgInterface}" && printf '%s\\n' '7: pbsg0: <POINTOPOINT,UP> mtu 1420'; exit $? ;;
  *' link delete dev pbsg0 '*) rm -f -- "${state.wgInterface}"; exit 0 ;;
esac
exit 1`);
  stub('pgrep', `
test ${overrides.pgrepQueryExit ?? 0} = 0 || exit ${overrides.pgrepQueryExit ?? 0}
if test "$1" = -x && test "$2" = squid && test -e "${state.squidProcess}"; then
  printf '%s\\n' 123
  exit 0
fi
exit 1`);
  stub('ps', `
if test "$1" = -p && test "$2" = ${exactSquidPid ?? 0} && test ${exactSquidPid ? 1 : 0} = 1; then printf '%s\\n' squid; exit 0; fi
exit 1`);
  stub('kill', `
if test "$1" = -TERM && test "$2" = ${exactSquidPid ?? 0}; then rm -f -- "${state.proxyListener}" "${state.squidProcess}"; exit 0; fi
exit 1`);
  stub('date', `
if test "$1" = +%s; then
  printf '%s\\n' '${overrides.now ?? Math.floor(Date.now() / 1000)}'
  exit 0
fi
exit 1`);
  stub('hostname', `
printf '%s\\n' '${overrides.hostname ?? 'sg-admin.example.invalid'}'`);
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
    PAPERBANANA_SG_EGRESS_TEST_UNIT_DIR: join(root, 'unit-source'),
    SSH_CONNECTION: overrides.sshConnection ?? '198.51.100.77 51515 10.77.0.2 22',
  };
  mkdirSync(dirname(env.HK_WG_PUBLIC_KEY_FILE), { recursive: true });
  writeFileSync(env.HK_WG_PUBLIC_KEY_FILE, validPublicKey);

  return {
    root,
    ecsHome,
    ecsSshDir,
    ecsAuthorizedKeys,
    env,
    commandLog,
    sshdOutput,
    rootSshdOutput,
    state,
    cleanup: () => {
      fixtureRoots.delete(root);
      rmSync(root, { recursive: true, force: true });
    },
  };
}

function run(fixture, script, args = [], options = {}) {
  return spawnSync(join(scripts, script), args, {
    encoding: 'utf8',
    env: fixture.env,
    timeout: options.timeout ?? 30_000,
    killSignal: 'SIGTERM',
  });
}

function commandLog(fixture) {
  return existsSync(fixture.commandLog) ? readFileSync(fixture.commandLog, 'utf8') : '';
}

function assertEcsUserKeyPreflightFailure(fixture) {
  const dropIn = join(fixture.root, 'etc', 'ssh', 'sshd_config.d', '00-paperbanana-sg-egress.conf');
  const priorDropIn = '# previous safe operator content\n';
  writeFileSync(dropIn, priorDropIn);

  const result = run(fixture, 'bootstrap-host.sh', ['--apply']);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /ecs-user.*authorized_keys|authorized_keys.*ecs-user/i);
  assert.equal(readFileSync(dropIn, 'utf8'), priorDropIn);
  assert.doesNotMatch(commandLog(fixture), /sshd (?:-t|-T)/);
  assert.doesNotMatch(commandLog(fixture), /systemctl reload ssh/);
}

function writeHkMonitorAssets(fixture) {
  const unitDir = join(fixture.root, 'etc', 'systemd', 'system');
  const runtimeScripts = join(fixture.root, 'opt', 'paperbanana-sg-egress', 'scripts');
  mkdirSync(unitDir, { recursive: true });
  writeFileSync(join(unitDir, 'paperbanana-hk-egress-health@.service'), '# Managed by PaperBanana Singapore egress\n');
  writeFileSync(join(unitDir, 'paperbanana-hk-egress-health@.timer'), '# Managed by PaperBanana Singapore egress\n');
  writeFileSync(join(runtimeScripts, 'monitor-health.sh'), '#!/usr/bin/env bash\n# Managed by PaperBanana Singapore egress\n');
  writeFileSync(join(runtimeScripts, 'smoke.sh'), '#!/usr/bin/env bash\n# Managed by PaperBanana Singapore egress\n');
  return {
    service: join(unitDir, 'paperbanana-hk-egress-health@.service'),
    timer: join(unitDir, 'paperbanana-hk-egress-health@.timer'),
    monitor: join(runtimeScripts, 'monitor-health.sh'),
    smoke: join(runtimeScripts, 'smoke.sh'),
  };
}

function writeSgEgressAssets(fixture) {
  const wireguardDir = join(fixture.root, 'etc', 'wireguard');
  const squidDir = join(fixture.root, 'etc', 'squid');
  const assets = {
    wgConfig: join(wireguardDir, 'pbsg0.conf'),
    wgKey: join(wireguardDir, 'paperbanana-sg-egress.private'),
    squidConfig: join(squidDir, 'squid.conf'),
    squidBackup: join(squidDir, 'squid.conf.paperbanana-sg-egress.backup'),
  };
  writeFileSync(assets.wgConfig, '# Managed by PaperBanana Singapore egress\n');
  writeFileSync(assets.wgKey, 'private-material-not-real\n');
  writeFileSync(assets.squidConfig, '# Managed by PaperBanana Singapore egress\n');
  writeFileSync(assets.squidBackup, '# package squid configuration\n');
  return assets;
}

test('fixture command runner returns a bounded timeout instead of allowing a child script to hang', () => {
  const fixture = makeFixture({ stallAptGet: true });
  try {
    const result = run(fixture, 'bootstrap-host.sh', ['--apply'], { timeout: 100 });
    assert.equal(result.error?.code, 'ETIMEDOUT');
  } finally {
    fixture.cleanup();
  }
});

test('dry-run gates execute without writes in a temporary host root', () => {
  const fixture = makeFixture();
  try {
    const before = readdirSync(join(fixture.root, 'etc', 'wireguard'));
    for (const [script, args] of [
      ['bootstrap-host.sh', []],
      ['install-egress.sh', []],
      ['install-health-monitor.sh', ['--host', 'hk', '--wg-interface', 'pbhk0']],
      ['uninstall.sh', []],
    ]) {
      const result = run(fixture, script, args);
      assert.equal(result.status, 0, `${script}: ${result.stderr}`);
    }
    assert.deepEqual(readdirSync(join(fixture.root, 'etc', 'wireguard')), before);
    assert.doesNotMatch(commandLog(fixture), /apt-get|systemctl|fallocate|mkswap|swapon/);
  } finally {
    fixture.cleanup();
  }
});

test('test-root hook rejects symlinked paths instead of resolving host operations through an alias', () => {
  const fixture = makeFixture();
  const alias = `${fixture.root}-alias`;
  try {
    symlinkSync(fixture.root, alias);
    fixture.env.PAPERBANANA_SG_EGRESS_TEST_ROOT = alias;
    const result = run(fixture, 'install-egress.sh', ['--apply']);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /canonical|symlink|fixture/i);
    assert.doesNotMatch(commandLog(fixture), /systemctl|ip |ss |pgrep|kill /);
  } finally {
    unlinkSync(alias);
    fixture.cleanup();
  }
});

test('test-root hook rejects a dot-dot path before it can address a host path', () => {
  const fixture = makeFixture();
  try {
    fixture.env.PAPERBANANA_SG_EGRESS_TEST_ROOT = `${fixture.root}/..`;
    const result = run(fixture, 'bootstrap-host.sh', ['--apply']);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /canonical|test root/i);
    assert.doesNotMatch(commandLog(fixture), /apt-get|systemctl|fallocate|mkswap|swapon/);
  } finally {
    fixture.cleanup();
  }
});

test('test-root hook requires its unique non-root-owned fixture marker', () => {
  const fixture = makeFixture({ testRootMarkerMetadata: 'regular file:0:600' });
  try {
    const result = run(fixture, 'uninstall.sh', ['--apply']);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /marker|owner|fixture/i);
    assert.doesNotMatch(commandLog(fixture), /systemctl|ip |ss |pgrep|kill /);
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

test('bootstrap fails closed when HBR systemctl state queries error instead of proving absence', () => {
  for (const overrides of [{ hbrClientQueryExit: 1 }, { hbrUpdaterQueryExit: 1 }]) {
    const fixture = makeFixture(overrides);
    try {
      const result = run(fixture, 'bootstrap-host.sh', ['--apply']);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /HBR.*query|query.*hbr/i);
      assert.doesNotMatch(commandLog(fixture), /apt-get /);
    } finally {
      fixture.cleanup();
    }
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

test('bootstrap validates ecs-user and root against actual management and loopback connection matrices', () => {
  const fixture = makeFixture();
  try {
    const result = run(fixture, 'bootstrap-host.sh', ['--apply']);
    assert.equal(result.status, 0, result.stderr);
    const log = commandLog(fixture);
    assert.match(log, /sshd -T -C user=ecs-user,host=sg-admin\.example\.invalid,addr=198\.51\.100\.77/);
    assert.match(log, /sshd -T -C user=root,host=sg-admin\.example\.invalid,addr=198\.51\.100\.77/);
    assert.match(log, /sshd -T -C user=ecs-user,host=sg-admin\.example\.invalid,addr=127\.0\.0\.1/);
    assert.match(log, /sshd -T -C user=root,host=sg-admin\.example\.invalid,addr=127\.0\.0\.1/);
    const dropIn = readFileSync(join(fixture.root, 'etc', 'ssh', 'sshd_config.d', '00-paperbanana-sg-egress.conf'), 'utf8');
    assert.match(dropIn, /PubkeyAuthentication yes/);
  } finally {
    fixture.cleanup();
  }
});

test('bootstrap refuses SSH hardening when ecs-user authorized_keys is missing', () => {
  const fixture = makeFixture();
  try {
    unlinkSync(fixture.ecsAuthorizedKeys);
    assertEcsUserKeyPreflightFailure(fixture);
  } finally {
    fixture.cleanup();
  }
});

test('bootstrap refuses SSH hardening when ecs-user authorized_keys is empty or comment-only', () => {
  for (const contents of ['', '# operator key pending\n\n']) {
    const fixture = makeFixture();
    try {
      writeFileSync(fixture.ecsAuthorizedKeys, contents);
      assertEcsUserKeyPreflightFailure(fixture);
    } finally {
      fixture.cleanup();
    }
  }
});

test('bootstrap refuses SSH hardening when ecs-user authorized_keys cannot be parsed by ssh-keygen', () => {
  const fixture = makeFixture();
  try {
    writeFileSync(fixture.ecsAuthorizedKeys, 'ssh-ed25519 not-a-public-key\n');
    assertEcsUserKeyPreflightFailure(fixture);
  } finally {
    fixture.cleanup();
  }
});

test('bootstrap refuses SSH hardening when ecs-user key path ownership is unsafe', () => {
  const fixture = makeFixture({ ecsAuthorizedKeysMetadata: 'regular file:2002:600' });
  try {
    assertEcsUserKeyPreflightFailure(fixture);
  } finally {
    fixture.cleanup();
  }
});

test('bootstrap refuses SSH hardening when ecs-user key path permissions are unsafe', () => {
  for (const overrides of [
    { ecsHomeMetadata: 'directory:1001:770' },
    { ecsSshDirectoryMetadata: 'directory:1001:770' },
    { ecsAuthorizedKeysMetadata: 'regular file:1001:640' },
  ]) {
    const fixture = makeFixture(overrides);
    try {
      assertEcsUserKeyPreflightFailure(fixture);
    } finally {
      fixture.cleanup();
    }
  }
});

test('bootstrap refuses SSH hardening when ecs-user authorized_keys is a symlink', () => {
  const fixture = makeFixture();
  try {
    const alternateKeyFile = join(fixture.root, 'alternate-authorized-keys');
    writeFileSync(alternateKeyFile, `${validSshPublicKey}\n`);
    unlinkSync(fixture.ecsAuthorizedKeys);
    symlinkSync(alternateKeyFile, fixture.ecsAuthorizedKeys);
    assertEcsUserKeyPreflightFailure(fixture);
  } finally {
    fixture.cleanup();
  }
});

test('bootstrap rejects a later Match User root security override and restores the prior drop-in', () => {
  const fixture = makeFixture({
    rootSshdOutput: [
      'permitrootlogin yes',
      'passwordauthentication yes',
      'pubkeyauthentication yes',
      'kbdinteractiveauthentication no',
      'allowtcpforwarding yes',
      'maxauthtries 3',
      'allowusers ecs-user',
    ].join('\n'),
  });
  try {
    const dropIn = join(fixture.root, 'etc', 'ssh', 'sshd_config.d', '00-paperbanana-sg-egress.conf');
    writeFileSync(dropIn, '# previous safe operator content\n');
    writeFileSync(join(fixture.root, 'etc', 'ssh', 'sshd_config'), [
      'Include /etc/ssh/sshd_config.d/*.conf',
      'Match User root',
      '  PermitRootLogin yes',
      '  PasswordAuthentication yes',
      '  AllowTcpForwarding yes',
    ].join('\n'));
    const result = run(fixture, 'bootstrap-host.sh', ['--apply']);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Match.*security|security.*Match|effective sshd policy/i);
    assert.equal(readFileSync(dropIn, 'utf8'), '# previous safe operator content\n');
    assert.doesNotMatch(commandLog(fixture), /systemctl reload ssh/);
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

test('install validates the WireGuard candidate from a private pbsg0.conf basename', () => {
  const fixture = makeFixture({ wgQuickRequiresInterfaceBasename: true });
  try {
    const result = run(fixture, 'install-egress.sh', ['--apply']);
    assert.equal(result.status, 0, result.stderr);
    assert.match(commandLog(fixture), /wg-quick strip .*\/pbsg0\.conf/);
  } finally {
    fixture.cleanup();
  }
});

test('install reloads an active pbsg0 and restores its prior managed configuration when rotation reload fails', () => {
  const fixture = makeFixture({ pbsg0Active: true, pbsg0Loaded: true, pbsg0Interface: true, failWgReload: true });
  try {
    const config = join(fixture.root, 'etc', 'wireguard', 'pbsg0.conf');
    const previous = '# Managed by PaperBanana Singapore egress\n# last-good-wireguard\n';
    writeFileSync(config, previous);
    const result = run(fixture, 'install-egress.sh', ['--apply']);
    assert.notEqual(result.status, 0);
    assert.match(commandLog(fixture), /systemctl reload wg-quick@pbsg0/);
    assert.equal(readFileSync(config, 'utf8'), previous);
  } finally {
    fixture.cleanup();
  }
});

test('install rejects active pbsg0 without a readable marked configuration before candidate mutation', () => {
  const fixture = makeFixture({ pbsg0Active: true, pbsg0Loaded: true, pbsg0Interface: true });
  try {
    const config = join(fixture.root, 'etc', 'wireguard', 'pbsg0.conf');
    const key = join(fixture.root, 'etc', 'wireguard', 'paperbanana-sg-egress.private');
    const result = run(fixture, 'install-egress.sh', ['--apply']);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /active.*pbsg0|pbsg0.*active|configuration.*missing/i);
    assert.equal(existsSync(config), false);
    assert.equal(existsSync(key), false);
    assert.equal(existsSync(fixture.state.wgInterface), true);
    assert.doesNotMatch(commandLog(fixture), /wg genkey|wg-quick strip|systemctl reload wg-quick@pbsg0/);
  } finally {
    fixture.cleanup();
  }
});

test('install restores the prior active WireGuard configuration after a one-time reload failure', () => {
  const fixture = makeFixture({ pbsg0Active: true, pbsg0Loaded: true, pbsg0Interface: true, failWgReloadOnce: true });
  try {
    const config = join(fixture.root, 'etc', 'wireguard', 'pbsg0.conf');
    const previous = '# Managed by PaperBanana Singapore egress\n# live-before-rotation\n';
    writeFileSync(config, previous);
    const result = run(fixture, 'install-egress.sh', ['--apply']);
    assert.notEqual(result.status, 0);
    assert.equal(readFileSync(config, 'utf8'), previous);
    assert.equal((commandLog(fixture).match(/systemctl reload wg-quick@pbsg0/g) ?? []).length, 2);
  } finally {
    fixture.cleanup();
  }
});

test('fresh WireGuard verification rollback stops the candidate before deleting its configuration', () => {
  const fixture = makeFixture({ livePeerKey: zeroPublicKey, recordWgConfigOnStop: true });
  try {
    const config = join(fixture.root, 'etc', 'wireguard', 'pbsg0.conf');
    const result = run(fixture, 'install-egress.sh', ['--apply']);
    assert.notEqual(result.status, 0);
    assert.ok(existsSync(fixture.state.wgConfigPresentOnStop), 'candidate config must exist while the candidate service is stopped');
    assert.equal(existsSync(fixture.state.wgInterface), false);
    assert.equal(existsSync(config), false);
  } finally {
    fixture.cleanup();
  }
});

test('install rolls back a replacement Squid configuration and restarts the prior service when activation fails', () => {
  const fixture = makeFixture({ squidActive: true, squidLoaded: true, squidProcess: true, projectProxyListener: true, failSquidRestart: true });
  try {
    const config = join(fixture.root, 'etc', 'squid', 'squid.conf');
    const previous = '# package last-good squid configuration\n';
    writeFileSync(config, previous);
    const result = run(fixture, 'install-egress.sh', ['--apply']);
    assert.notEqual(result.status, 0);
    assert.equal(readFileSync(config, 'utf8'), previous);
    assert.match(commandLog(fixture), /systemctl restart squid/);
  } finally {
    fixture.cleanup();
  }
});

test('install restarts the prior active Squid configuration after a one-time candidate restart failure', () => {
  const fixture = makeFixture({ squidActive: true, squidLoaded: true, squidProcess: true, projectProxyListener: true, failSquidRestartOnce: true });
  try {
    const config = join(fixture.root, 'etc', 'squid', 'squid.conf');
    const previous = '# package squid before candidate\n';
    writeFileSync(config, previous);
    const result = run(fixture, 'install-egress.sh', ['--apply']);
    assert.notEqual(result.status, 0);
    assert.equal(readFileSync(config, 'utf8'), previous);
    assert.equal((commandLog(fixture).match(/systemctl restart squid/g) ?? []).length, 2);
  } finally {
    fixture.cleanup();
  }
});

test('uninstall removes only marked egress configuration when the Squid package backup is absent', () => {
  const fixture = makeFixture({
    pbsg0Active: true,
    pbsg0Interface: true,
    squidActive: true,
    squidProcess: true,
    projectProxyListener: true,
  });
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

test('uninstall stops project runtime state even when WireGuard and Squid markers are already missing', () => {
  const fixture = makeFixture({
    pbsg0Active: true,
    pbsg0Interface: true,
    pbsg0Loaded: true,
    squidActive: true,
    squidProcess: true,
    squidLoaded: true,
    projectProxyListener: true,
    healthTimerActive: true,
    healthServiceActive: true,
  });
  try {
    const result = run(fixture, 'uninstall.sh', ['--apply']);
    assert.equal(result.status, 0, result.stderr);
    assert.match(commandLog(fixture), /systemctl disable --now wg-quick@pbsg0/);
    assert.match(commandLog(fixture), /systemctl disable --now squid/);
    assert.equal(existsSync(fixture.state.wgInterface), false);
    assert.equal(existsSync(fixture.state.proxyListener), false);
    assert.equal(existsSync(fixture.state.healthTimerActive), false);
    assert.equal(existsSync(fixture.state.healthServiceActive), false);
  } finally {
    fixture.cleanup();
  }
});

test('uninstall directly deletes the exact pbsg0 interface when its unit metadata was lost', () => {
  const fixture = makeFixture({ pbsg0Interface: true, pbsg0Active: false, pbsg0Loaded: false });
  try {
    const result = run(fixture, 'uninstall.sh', ['--apply']);
    assert.equal(result.status, 0, result.stderr);
    assert.match(commandLog(fixture), /ip link delete dev pbsg0/);
    assert.doesNotMatch(commandLog(fixture), /systemctl disable --now wg-quick@pbsg0/);
    assert.equal(existsSync(fixture.state.wgInterface), false);
  } finally {
    fixture.cleanup();
  }
});

test('uninstall terminates only the Squid PID owning the exact project listener after unit metadata loss', () => {
  const fixture = makeFixture({ projectProxyListener: true, squidProcess: true, squidActive: false, squidLoaded: false, exactSquidPid: true });
  try {
    const result = run(fixture, 'uninstall.sh', ['--apply']);
    assert.equal(result.status, 0, result.stderr);
    assert.match(commandLog(fixture), /ss -lntH -p sport = :3128/);
    assert.match(commandLog(fixture), /ps -p 123 -o comm=/);
    assert.match(commandLog(fixture), /kill -TERM 123/);
    assert.doesNotMatch(commandLog(fixture), /systemctl disable --now squid/);
  } finally {
    fixture.cleanup();
  }
});

test('uninstall returns nonzero when a live pbsg0 stop fails after its marker is lost', () => {
  const fixture = makeFixture({ pbsg0Active: true, pbsg0Interface: true, failWgStop: true });
  try {
    const result = run(fixture, 'uninstall.sh', ['--apply']);
    assert.notEqual(result.status, 0);
    assert.match(commandLog(fixture), /systemctl disable --now wg-quick@pbsg0/);
    assert.equal(existsSync(fixture.state.wgInterface), true);
  } finally {
    fixture.cleanup();
  }
});

test('uninstall returns nonzero when a project Squid listener stop fails after its marker is lost', () => {
  const fixture = makeFixture({
    squidActive: true,
    squidProcess: true,
    squidLoaded: true,
    projectProxyListener: true,
    failSquidStop: true,
  });
  try {
    const result = run(fixture, 'uninstall.sh', ['--apply']);
    assert.notEqual(result.status, 0);
    assert.match(commandLog(fixture), /systemctl disable --now squid/);
    assert.equal(existsSync(fixture.state.proxyListener), true);
  } finally {
    fixture.cleanup();
  }
});

test('uninstall stops an active loaded Squid unit even when its project marker and listener are gone', () => {
  const fixture = makeFixture({ squidActive: true, squidLoaded: true, squidProcess: false, projectProxyListener: false });
  try {
    const result = run(fixture, 'uninstall.sh', ['--apply']);
    assert.equal(result.status, 0, result.stderr);
    assert.match(commandLog(fixture), /systemctl disable --now squid/);
    assert.equal(existsSync(fixture.state.squidActive), false);
  } finally {
    fixture.cleanup();
  }
});

test('uninstall fails closed and preserves assets when pbsg0 interface query exits 2', () => {
  const fixture = makeFixture({ ipLinkQueryExit: 2 });
  try {
    const assets = writeSgEgressAssets(fixture);
    const result = run(fixture, 'uninstall.sh', ['--apply']);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /cannot determine.*pbsg0|pbsg0.*query/i);
    for (const path of Object.values(assets)) assert.equal(existsSync(path), true, `${path} must remain after an ip query failure`);
    assert.doesNotMatch(commandLog(fixture), /systemctl disable --now/);
  } finally {
    fixture.cleanup();
  }
});

test('uninstall fails closed and preserves assets when Squid listener query exits 2', () => {
  const fixture = makeFixture({ ssQueryExit: 2 });
  try {
    const assets = writeSgEgressAssets(fixture);
    const result = run(fixture, 'uninstall.sh', ['--apply']);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /cannot determine.*Squid listener|Squid listener.*query/i);
    for (const path of Object.values(assets)) assert.equal(existsSync(path), true, `${path} must remain after an ss query failure`);
    assert.doesNotMatch(commandLog(fixture), /systemctl disable --now/);
  } finally {
    fixture.cleanup();
  }
});

test('uninstall fails closed and preserves assets when Squid process query exits 2', () => {
  const fixture = makeFixture({ pgrepQueryExit: 2 });
  try {
    const assets = writeSgEgressAssets(fixture);
    const result = run(fixture, 'uninstall.sh', ['--apply']);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /cannot determine.*Squid process|Squid process.*query/i);
    for (const path of Object.values(assets)) assert.equal(existsSync(path), true, `${path} must remain after a pgrep query failure`);
    assert.doesNotMatch(commandLog(fixture), /systemctl disable --now/);
  } finally {
    fixture.cleanup();
  }
});

test('Hong Kong uninstall separately stops active monitor instances and removes only HK monitoring assets', () => {
  const fixture = makeFixture({ hkHealthTimerActive: true, hkHealthServiceActive: true });
  try {
    const assets = writeHkMonitorAssets(fixture);
    const result = run(fixture, 'uninstall.sh', ['--host', 'hk', '--wg-interface', 'pbhk0', '--apply']);
    assert.equal(result.status, 0, result.stderr);
    assert.match(commandLog(fixture), /systemctl disable --now paperbanana-hk-egress-health@pbhk0\.timer/);
    assert.match(commandLog(fixture), /systemctl disable --now paperbanana-hk-egress-health@pbhk0\.service/);
    assert.equal(existsSync(fixture.state.hkHealthTimerActive), false);
    assert.equal(existsSync(fixture.state.hkHealthServiceActive), false);
    for (const path of Object.values(assets)) assert.equal(existsSync(path), false, `${path} must be removed on Hong Kong`);
  } finally {
    fixture.cleanup();
  }
});

test('Hong Kong uninstall fails closed when an active monitor timer cannot be stopped', () => {
  const fixture = makeFixture({ hkHealthTimerActive: true, failHkTimerStop: true });
  try {
    const assets = writeHkMonitorAssets(fixture);
    const result = run(fixture, 'uninstall.sh', ['--host', 'hk', '--wg-interface', 'pbhk0', '--apply']);
    assert.notEqual(result.status, 0);
    assert.match(commandLog(fixture), /systemctl disable --now paperbanana-hk-egress-health@pbhk0\.timer/);
    assert.equal(existsSync(fixture.state.hkHealthTimerActive), true);
    assert.equal(existsSync(assets.timer), true, 'assets must remain when the stop fails');
  } finally {
    fixture.cleanup();
  }
});

test('Hong Kong uninstall rejects a monitor timer that remains active after a successful stop command', () => {
  const fixture = makeFixture({ hkHealthTimerActive: true, leaveHkTimerActive: true });
  try {
    const assets = writeHkMonitorAssets(fixture);
    const result = run(fixture, 'uninstall.sh', ['--host', 'hk', '--wg-interface', 'pbhk0', '--apply']);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /paperbanana-hk-egress-health@pbhk0\.timer remains active/i);
    assert.equal(existsSync(fixture.state.hkHealthTimerActive), true);
    for (const path of Object.values(assets)) assert.equal(existsSync(path), true, `${path} must remain when the timer still runs`);
  } finally {
    fixture.cleanup();
  }
});

test('Hong Kong uninstall fails closed without deleting assets when timer state cannot be queried', () => {
  const fixture = makeFixture({ hkHealthTimerActive: true, failHkTimerStateQuery: true });
  try {
    const assets = writeHkMonitorAssets(fixture);
    const result = run(fixture, 'uninstall.sh', ['--host', 'hk', '--wg-interface', 'pbhk0', '--apply']);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /cannot determine.*paperbanana-hk-egress-health@pbhk0\.timer|state.*query/i);
    for (const path of Object.values(assets)) assert.equal(existsSync(path), true, `${path} must remain when state inspection fails`);
    assert.doesNotMatch(commandLog(fixture), /systemctl disable --now paperbanana-hk-egress-health@pbhk0\.timer/);
  } finally {
    fixture.cleanup();
  }
});

test('Singapore uninstall does not remove Hong Kong timer templates or monitoring assets', () => {
  const fixture = makeFixture();
  try {
    const assets = writeHkMonitorAssets(fixture);
    const result = run(fixture, 'uninstall.sh', ['--apply']);
    assert.equal(result.status, 0, result.stderr);
    for (const path of Object.values(assets)) assert.equal(existsSync(path), true, `${path} must remain on Singapore`);
    assert.doesNotMatch(commandLog(fixture), /paperbanana-hk-egress-health@pbhk0/);
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
  https://api.openai.com:444/|https://example.com/|https://192.0.2.1/) printf '500:200'; exit 0 ;;
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

test('Hong Kong health monitor verifies a recent pbhk0 handshake and probes provider statuses through Singapore', () => {
  const fixture = makeFixture();
  try {
    const result = run(fixture, 'monitor-health.sh', ['--host', 'hk', '--wg-interface', 'pbhk0']);
    assert.equal(result.status, 0, result.stderr);
    const log = commandLog(fixture);
    assert.match(log, /wg show pbhk0 latest-handshakes/);
    assert.match(log, /wg show pbhk0/);
    assert.match(log, /curl .*api\.openai\.com/);
    assert.match(log, /curl .*generativelanguage\.googleapis\.com/);
    assert.match(log, /curl .*openrouter\.ai/);
  } finally {
    fixture.cleanup();
  }
});

test('Hong Kong health monitor rejects a stale WireGuard handshake before reporting success', () => {
  const fixture = makeFixture({ now: 1_700_000_000, latestHandshake: 1_699_999_000 });
  try {
    const result = run(fixture, 'monitor-health.sh', ['--host', 'hk', '--wg-interface', 'pbhk0']);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /handshake.*stale|stale.*handshake/i);
  } finally {
    fixture.cleanup();
  }
});

test('Hong Kong health monitor refuses a Singapore-addressed interface even when passed --host hk', () => {
  const fixture = makeFixture();
  try {
    const result = run(fixture, 'monitor-health.sh', ['--host', 'hk', '--wg-interface', 'pbsg0']);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /10\.77\.0\.1\/30.*Hong Kong|Hong Kong.*10\.77\.0\.1\/30/i);
  } finally {
    fixture.cleanup();
  }
});

test('health monitor installation requires an explicit Hong Kong host and WireGuard interface', () => {
  const fixture = makeFixture();
  try {
    const result = run(fixture, 'install-health-monitor.sh', ['--host', 'hk', '--wg-interface', 'pbhk0', '--apply']);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(existsSync(join(fixture.root, 'etc', 'systemd', 'system', 'paperbanana-hk-egress-health@.service')));
    assert.ok(existsSync(join(fixture.root, 'etc', 'systemd', 'system', 'paperbanana-hk-egress-health@.timer')));
    assert.match(commandLog(fixture), /systemctl enable --now paperbanana-hk-egress-health@pbhk0\.timer/);
  } finally {
    fixture.cleanup();
  }
});

test('health monitor installation refuses a writable or non-root-owned runtime script tree before enabling root timer', () => {
  const fixture = makeFixture({ runtimeMonitorMetadata: `regular file:${fixtureUid}:777` });
  try {
    const result = run(fixture, 'install-health-monitor.sh', ['--host', 'hk', '--wg-interface', 'pbhk0', '--apply']);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /root-owned|group- or world-writable|secure runtime/i);
    assert.doesNotMatch(commandLog(fixture), /systemctl enable --now paperbanana-hk-egress-health@pbhk0\.timer/);
  } finally {
    fixture.cleanup();
  }
});

test('health monitor installation refuses unsafe systemd template sources before copying them', () => {
  for (const overrides of [
    { unitSourceMetadata: 'regular file:501:644' },
    { unitSourceMetadata: 'regular file:0:666' },
  ]) {
    const fixture = makeFixture(overrides);
    try {
      const result = run(fixture, 'install-health-monitor.sh', ['--host', 'hk', '--wg-interface', 'pbhk0', '--apply']);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /systemd|template|root-owned|secure/i);
      assert.equal(existsSync(join(fixture.root, 'etc', 'systemd', 'system', 'paperbanana-hk-egress-health@.service')), false);
      assert.doesNotMatch(commandLog(fixture), /systemctl start paperbanana-hk-egress-health@pbhk0\.service/);
    } finally {
      fixture.cleanup();
    }
  }
});

test('health monitor installation refuses a symlinked systemd template source', () => {
  const fixture = makeFixture();
  const source = join(fixture.root, 'unit-source', 'paperbanana-hk-egress-health@.service');
  const alternate = join(fixture.root, 'unit-source', 'alternate.service');
  try {
    writeFileSync(alternate, '# Managed by PaperBanana Singapore egress\n[Service]\n');
    unlinkSync(source);
    symlinkSync(alternate, source);
    const result = run(fixture, 'install-health-monitor.sh', ['--host', 'hk', '--wg-interface', 'pbhk0', '--apply']);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /template|secure|root-owned/i);
    assert.equal(existsSync(join(fixture.root, 'etc', 'systemd', 'system', 'paperbanana-hk-egress-health@.service')), false);
  } finally {
    fixture.cleanup();
  }
});

test('health monitor installation starts the exact service before enabling its timer and rolls back copied units on failure', () => {
  const fixture = makeFixture({ failHkServiceStart: true });
  try {
    const result = run(fixture, 'install-health-monitor.sh', ['--host', 'hk', '--wg-interface', 'pbhk0', '--apply']);
    assert.notEqual(result.status, 0);
    assert.match(commandLog(fixture), /systemctl start paperbanana-hk-egress-health@pbhk0\.service/);
    assert.doesNotMatch(commandLog(fixture), /systemctl enable --now paperbanana-hk-egress-health@pbhk0\.timer/);
    assert.equal(existsSync(join(fixture.root, 'etc', 'systemd', 'system', 'paperbanana-hk-egress-health@.service')), false);
    assert.equal(existsSync(join(fixture.root, 'etc', 'systemd', 'system', 'paperbanana-hk-egress-health@.timer')), false);
  } finally {
    fixture.cleanup();
  }
});

test('failed Hong Kong monitor upgrade restores an already enabled and active timer', () => {
  const fixture = makeFixture({ hkHealthTimerActive: true, hkHealthTimerEnabled: true, failHkServiceStart: true });
  try {
    writeHkMonitorAssets(fixture);
    const result = run(fixture, 'install-health-monitor.sh', ['--host', 'hk', '--wg-interface', 'pbhk0', '--apply']);
    assert.notEqual(result.status, 0);
    assert.equal(existsSync(fixture.state.hkHealthTimerActive), true);
    assert.match(commandLog(fixture), /systemctl enable --now paperbanana-hk-egress-health@pbhk0\.timer/);
  } finally {
    fixture.cleanup();
  }
});

test('health monitor installation fails closed when prior timer enablement cannot be queried', () => {
  const fixture = makeFixture({ failHkTimerEnabledQuery: true });
  try {
    const result = run(fixture, 'install-health-monitor.sh', ['--host', 'hk', '--wg-interface', 'pbhk0', '--apply']);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /enabled|cannot determine/i);
    assert.equal(existsSync(join(fixture.root, 'etc', 'systemd', 'system', 'paperbanana-hk-egress-health@.service')), false);
    assert.doesNotMatch(commandLog(fixture), /systemctl start paperbanana-hk-egress-health@pbhk0\.service/);
  } finally {
    fixture.cleanup();
  }
});

test('health monitor installation accepts a successful inactive Type=oneshot service by its Result and exit status', () => {
  const fixture = makeFixture({ hkServiceStartsInactive: true });
  try {
    const result = run(fixture, 'install-health-monitor.sh', ['--host', 'hk', '--wg-interface', 'pbhk0', '--apply']);
    assert.equal(result.status, 0, result.stderr);
    const log = commandLog(fixture);
    assert.match(log, /systemctl start paperbanana-hk-egress-health@pbhk0\.service/);
    assert.match(log, /systemctl show --property=Result --value paperbanana-hk-egress-health@pbhk0\.service/);
    assert.match(log, /systemctl show --property=ExecMainStatus --value paperbanana-hk-egress-health@pbhk0\.service/);
    assert.match(log, /systemctl enable --now paperbanana-hk-egress-health@pbhk0\.timer/);
  } finally {
    fixture.cleanup();
  }
});

test('generated Squid policy permits only Hong Kong approved CONNECT traffic', () => {
  const fixture = makeFixture();
  try {
    const install = run(fixture, 'install-egress.sh', ['--apply']);
    assert.equal(install.status, 0, install.stderr);
    const policy = join(fixture.root, 'etc', 'squid', 'squid.conf');
    const cases = [
      ['OpenAI from Hong Kong', { source: '10.77.0.1', authority: 'api.openai.com:443', resolved: '198.51.100.10' }, 'allow'],
      ['Gemini from Hong Kong', { source: '10.77.0.1', authority: 'generativelanguage.googleapis.com:443', resolved: '198.51.100.10' }, 'allow'],
      ['OpenRouter from Hong Kong', { source: '10.77.0.1', authority: 'openrouter.ai:443', resolved: '198.51.100.10' }, 'allow'],
      ['Singapore source', { source: '10.77.0.2', authority: 'api.openai.com:443', resolved: '198.51.100.10' }, 'deny'],
      ['IPv4 authority', { source: '10.77.0.1', authority: '192.0.2.1:443', resolved: '192.0.2.1' }, 'deny'],
      ['IPv6 authority', { source: '10.77.0.1', authority: '[2001:db8::1]:443', resolved: '2001:db8::1' }, 'deny'],
      ['native IPv6 DNS result', { source: '10.77.0.1', authority: 'api.openai.com:443', resolved: '2001:4860:4860::8888' }, 'deny'],
      ['IPv4-mapped literal authority', { source: '10.77.0.1', authority: '[::ffff:8.8.8.8]:443', resolved: '::ffff:0808:0808' }, 'deny'],
      ['IPv4 unspecified resolved address', { source: '10.77.0.1', authority: 'api.openai.com:443', resolved: '0.0.0.0' }, 'deny'],
      ['IPv6 unspecified resolved address', { source: '10.77.0.1', authority: 'api.openai.com:443', resolved: '::' }, 'deny'],
      ['IPv4-mapped loopback resolved address', { source: '10.77.0.1', authority: 'api.openai.com:443', resolved: '::ffff:7f00:1' }, 'deny'],
      ['IPv4-mapped private resolved address', { source: '10.77.0.1', authority: 'api.openai.com:443', resolved: '::ffff:0a00:8' }, 'deny'],
      ['IPv4-mapped dotted loopback resolved address', { source: '10.77.0.1', authority: 'api.openai.com:443', resolved: '::ffff:127.0.0.1' }, 'deny'],
      ['IPv4-mapped dotted private resolved address', { source: '10.77.0.1', authority: 'api.openai.com:443', resolved: '::ffff:10.0.0.8' }, 'deny'],
      ['private resolved address', { source: '10.77.0.1', authority: 'api.openai.com:443', resolved: '10.0.0.8' }, 'deny'],
      ['PTR cannot bless an unapproved name', { source: '10.77.0.1', authority: 'unapproved.invalid:443', resolved: '198.51.100.10', ptr: 'api.openai.com' }, 'deny'],
      ['non-443 port', { source: '10.77.0.1', authority: 'api.openai.com:444', resolved: '198.51.100.10' }, 'deny'],
      ['other hostname', { source: '10.77.0.1', authority: 'example.com:443', resolved: '198.51.100.10' }, 'deny'],
    ];
    for (const [label, request, expected] of cases) {
      const result = spawnSync(process.execPath, [policyValidator, policy, JSON.stringify(request)], { encoding: 'utf8' });
      assert.equal(result.status, 0, `${label}: ${result.stderr}`);
      assert.equal(result.stdout.trim(), expected, label);
    }
  } finally {
    fixture.cleanup();
  }
});

test('recursive egress secret scan fails a leaked fixture and accepts deploy assets', () => {
  const fixture = makeFixture();
  const leakRoot = mkdtempSync(join(tmpdir(), 'paperbanana-sg-egress-leak-'));
  try {
    mkdirSync(join(leakRoot, 'scripts'), { recursive: true });
    mkdirSync(join(leakRoot, 'systemd'), { recursive: true });
    mkdirSync(join(leakRoot, 'docs'), { recursive: true });
    const leakedIpv4 = ['8', '8', '8', '8'].join('.');
    const leakedIpv6 = ['2001', '4860', '4860', '', '8888'].join(':');
    writeFileSync(join(leakRoot, 'README.md'), [
      ['-----', 'BEGIN PRIVATE KEY-----'].join(''),
      ['LTAI', '1234567890abcdef'].join(''),
      ['AIza', 'FixtureSecretValue'].join(''),
      ['Bearer', 'fixture-secret-value'].join(' '),
      `${'C'.repeat(43)}=`,
    ].join('\n'));
    writeFileSync(join(leakRoot, 'scripts', 'leak.sh'), `export TOKEN=${['sk', 'fixture-secret'].join('-')}\n`);
    writeFileSync(join(leakRoot, 'systemd', 'fixture.service'), `Environment=PUBLIC=${leakedIpv4}\n`);
    writeFileSync(join(leakRoot, 'docs', 'leak.md'), [
      ['Bearer', 'docs-fixture-secret'].join(' '), '192.0.0.1', '192.0.1.1', '192.2.1.1', '198.51.42.7', '203.0.5.7', leakedIpv6,
      ['2001', '4860', '', '10.0.0.1'].join(':'), ['::ffff', '0808', '0808'].join(':'), ['::ffff', '0a00', '8'].join(':'),
    ].join('\n'));
    const leak = spawnSync(process.execPath, [secretScanner, leakRoot], { encoding: 'utf8' });
    assert.notEqual(leak.status, 0);
    const leakReport = `${leak.stdout}\n${leak.stderr}`;
    for (const expected of ['PEM private key', 'Alibaba access key', 'Gemini secret', 'Bearer token', 'WireGuard key-shaped literal', 'OpenAI secret', leakedIpv4]) {
      assert.match(leakReport, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
    assert.match(leakReport, /docs\/leak\.md: Bearer token/);
    assert.match(leakReport, /non-reserved public IPv4 198\.51\.42\.7/);
    assert.match(leakReport, /non-reserved public IPv4 203\.0\.5\.7/);
    assert.match(leakReport, /non-reserved public IPv4 192\.0\.1\.1/);
    assert.match(leakReport, /non-reserved public IPv4 192\.2\.1\.1/);
    assert.doesNotMatch(leakReport, /non-reserved public IPv4 192\.0\.0\.1/);
    assert.match(leakReport, new RegExp(`non-reserved public IPv6 ${leakedIpv6}`));
    assert.match(leakReport, /non-reserved public IPv6 2001:4860::10\.0\.0\.1/);
    assert.match(leakReport, /non-reserved public IPv6 ::ffff:0808:0808/);
    assert.doesNotMatch(leakReport, /non-reserved public IPv6 ::ffff:0a00:8/);

    const clean = spawnSync(process.execPath, [secretScanner, deployRoot], { encoding: 'utf8' });
    assert.equal(clean.status, 0, clean.stderr);
    const realCredentialFixture = join(deployRoot, 'tests', '.scanner-real-credential-fixture.txt');
    writeFileSync(realCredentialFixture, `${['sk', 'real-credential-under-tests'].join('-')}\n`);
    try {
      const realCredential = spawnSync(process.execPath, [secretScanner, deployRoot], { encoding: 'utf8' });
      assert.notEqual(realCredential.status, 0);
      assert.match(`${realCredential.stdout}\n${realCredential.stderr}`, /OpenAI secret/);
    } finally {
      rmSync(realCredentialFixture, { force: true });
    }
  } finally {
    fixture.cleanup();
    rmSync(leakRoot, { recursive: true, force: true });
  }
});
