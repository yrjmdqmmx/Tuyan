import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const path = (name) => new URL(name, root);
const read = (name) => readFileSync(path(name), 'utf8');

const scripts = [
  'scripts/bootstrap-host.sh',
  'scripts/install-egress.sh',
  'scripts/install-hk-peer.sh',
  'scripts/smoke.sh',
  'scripts/monitor-health.sh',
  'scripts/install-health-monitor.sh',
  'scripts/uninstall.sh',
];

test('Singapore egress operator assets exist and scripts are executable', () => {
  for (const name of [
    'README.md',
    ...scripts,
    'systemd/paperbanana-hk-egress-health@.service',
    'systemd/paperbanana-hk-egress-health@.timer',
    'tests/squid-policy-validator.mjs',
    'tests/scan-egress-secrets.mjs',
  ]) {
    assert.ok(existsSync(path(name)), `${name} must be committed`);
  }
  for (const name of scripts) {
    assert.equal(statSync(path(name)).mode & 0o111, 0o111, `${name} must be executable`);
  }
  for (const name of ['tests/squid-policy-validator.mjs', 'tests/scan-egress-secrets.mjs']) {
    assert.equal(statSync(path(name)).mode & 0o111, 0o111, `${name} must be independently executable`);
  }
});

test('all mutating operator scripts require an explicit apply gate', () => {
  for (const name of [
    'scripts/bootstrap-host.sh',
    'scripts/install-egress.sh',
    'scripts/install-hk-peer.sh',
    'scripts/install-health-monitor.sh',
    'scripts/uninstall.sh',
  ]) {
    const script = read(name);
    assert.match(script, /set -Eeuo pipefail/);
    assert.match(script, /--apply/);
    assert.match(script, /--dry-run/);
    assert.match(script, /if \[\[ "\$mode" == "--dry-run" \]\]/, `${name} must make dry-run the default`);
  }
});

test('Hong Kong peer installer owns only the fixed pbhk0 tunnel and protects private material', () => {
  const installer = read('scripts/install-hk-peer.sh');

  assert.match(installer, /interface_name="pbhk0"/);
  assert.match(installer, /Address = 10\.77\.0\.1\/30/);
  assert.match(installer, /ListenPort = 51820/);
  assert.match(installer, /AllowedIPs = 10\.77\.0\.2\/32/);
  assert.match(installer, /:51820/);
  assert.match(installer, /SG_WG_PUBLIC_KEY_FILE/);
  assert.match(installer, /SG_WG_ENDPOINT_FILE/);
  assert.match(installer, /stat -c '%F:%u:%a'/);
  assert.match(installer, /wg-quick strip/);
  assert.match(installer, /systemctl (?:reload|enable --now) "wg-quick@\$\{interface_name\}"/);
  assert.match(installer, /10\.77\.0\.1\/30/);
  assert.match(installer, /wg show "\$interface_name" peers/);
  assert.match(installer, /chmod 0600/);
  assert.match(installer, /umask 077/);
  assert.doesNotMatch(installer, /AllowedIPs\s*=\s*(?:0\.0\.0\.0\/0|::\/0)/);
  assert.doesNotMatch(installer, /net\.ipv4\.ip_forward|\biptables\b|\bnft\b|\bufw\b|firewall-cmd|\/etc\/wireguard\/wg0|wg-quick@wg0|interface_name="wg0"/);
  assert.doesNotMatch(installer, /(?:echo|printf)[^\n]*\$hk_private_key/i);
});

test('manual Singapore delivery workflow is isolated, strict-host-keyed and fail-closed', () => {
  const workflowPath = new URL('../../../.github/workflows/deploy-sg-egress.yml', import.meta.url);
  assert.ok(existsSync(workflowPath), 'manual Singapore delivery workflow must be committed');
  const workflow = readFileSync(workflowPath, 'utf8');
  const runBlocks = [...workflow.matchAll(/\n\s+run:\s*\|\n([\s\S]*?)(?=\n\s+(?:- name:|- uses:|[a-zA-Z][a-zA-Z_-]*:)|$)/g)]
    .map((match) => match[1])
    .join('\n');

  assert.match(workflow, /^on:\s*\n\s+workflow_dispatch:/m);
  assert.doesNotMatch(workflow, /^\s+(?:push|pull_request|schedule):/m);
  assert.match(workflow, /permissions:\s*\n\s+contents: read/);
  assert.match(workflow, /group: paperbanana-sg-egress/);
  assert.match(workflow, /environment: paperbanana-sg-egress/);
  assert.match(workflow, /action:[\s\S]*type: choice[\s\S]*- validate[\s\S]*- deploy/);
  assert.match(workflow, /activate_core:[\s\S]*type: boolean[\s\S]*default: false/);
  assert.match(workflow, /jobs:\s*\n\s+validate:/);
  assert.match(workflow, /\n\s+deploy:\s*\n[\s\S]*needs: validate/);
  assert.match(workflow, /StrictHostKeyChecking=yes/);
  assert.match(workflow, /UserKnownHostsFile=/);
  assert.match(workflow, /chmod 0600/);
  assert.match(workflow, /GITHUB_SHA/);
  assert.match(workflow, /scan-egress-secrets\.mjs deploy\/sg-egress/);
  assert.match(workflow, /sudo/);
  assert.doesNotMatch(runBlocks, /\$\{\{\s*secrets\./);
  assert.doesNotMatch(workflow, /switch=\/opt\/paperbanana-sg-egress\/releases\/\$\{GITHUB_SHA\}/);
  for (const name of [
    'ALIYUN_SG_EGRESS_HOST', 'ALIYUN_SG_EGRESS_USER', 'ALIYUN_SG_EGRESS_SSH_PRIVATE_KEY',
    'ALIYUN_SG_EGRESS_SSH_KNOWN_HOSTS', 'ALIYUN_HK_HOST', 'ALIYUN_HK_USER',
    'ALIYUN_HK_SSH_PRIVATE_KEY', 'ALIYUN_HK_SSH_KNOWN_HOSTS',
    'PAPERBANANA_SG_WG_PUBLIC_KEY', 'PAPERBANANA_SG_WG_ENDPOINT',
    'PAPERBANANA_HK_WG_PUBLIC_KEY', 'PAPERBANANA_HK_WG_ENDPOINT',
  ]) assert.match(workflow, new RegExp(`secrets\\.${name}\\b`));
  assert.ok(
    workflow.indexOf('--mode disabled') < workflow.indexOf('scripts/smoke.sh --hk'),
    'Core must enter disabled fail-closed mode before tunnel smoke',
  );
  assert.ok(
    workflow.indexOf('scripts/smoke.sh --hk') < workflow.indexOf('--mode sg-required'),
    'sg-required activation must happen only after tunnel smoke',
  );
  assert.match(workflow, /docker compose[\s\S]*up -d --no-deps --force-recreate paperbanana-api/);
  assert.doesNotMatch(workflow, /(?:rm\s+-rf|git\s+reset\s+--hard|docker\s+(?:compose\s+)?down|systemctl\s+(?:stop|disable)[^\n]*(?:docker|nginx|mongod)|scripts\/uninstall\.sh)/);
  assert.doesNotMatch(workflow, /Authorization:|OPENAI_API_KEY|GEMINI_API_KEY|OPENROUTER_API_KEY|sk-[A-Za-z0-9]/i);
});

test('operator documentation records env semantics, secret placeholders and fail-closed order', () => {
  const coreReadme = readFileSync(new URL('../../../apps/paperbanana-api/README.md', import.meta.url), 'utf8');
  const hkReadme = readFileSync(new URL('../../hk-single-host/README.md', import.meta.url), 'utf8');
  const secretsReadme = readFileSync(new URL('../../hk-single-host/secrets/README.md', import.meta.url), 'utf8');
  const sgReadme = read('README.md');
  const sync = readFileSync(new URL('../../../SYNC.md', import.meta.url), 'utf8');
  const joined = [coreReadme, hkReadme, secretsReadme, sgReadme].join('\n');

  assert.match(coreReadme, /PAPERBANANA_PROVIDER_EGRESS_MODE/);
  assert.match(coreReadme, /disabled[\s\S]*fail-closed|fail-closed[\s\S]*disabled/i);
  assert.match(coreReadme, /PAPERBANANA_SG_PROXY_URL[\s\S]*http:\/\/10\.77\.0\.2:3128/);
  assert.match(hkReadme, /set-provider-egress-mode\.sh/);
  assert.match(hkReadme, /disabled[\s\S]*smoke[\s\S]*sg-required/i);
  assert.match(hkReadme, /recreate only|only.*paperbanana-api/i);
  assert.match(hkReadme, /rollback[\s\S]*disabled[\s\S]*(?:never|not)[\s\S]*(?:direct|直连)/i);
  assert.match(secretsReadme, /core\.env[\s\S]*0600/);
  for (const name of [
    'ALIYUN_SG_EGRESS_HOST', 'ALIYUN_SG_EGRESS_USER', 'ALIYUN_SG_EGRESS_SSH_PRIVATE_KEY',
    'ALIYUN_SG_EGRESS_SSH_KNOWN_HOSTS', 'ALIYUN_HK_HOST', 'ALIYUN_HK_USER',
    'ALIYUN_HK_SSH_PRIVATE_KEY', 'ALIYUN_HK_SSH_KNOWN_HOSTS',
    'PAPERBANANA_SG_WG_PUBLIC_KEY', 'PAPERBANANA_SG_WG_ENDPOINT',
    'PAPERBANANA_HK_WG_PUBLIC_KEY', 'PAPERBANANA_HK_WG_ENDPOINT',
  ]) assert.match(joined, new RegExp(name));
  assert.match(sgReadme, /--remove-peer/);
  assert.match(sgReadme, /monitor[\s\S]*--remove-peer/i);
  assert.match(joined, /providerEgress[\s\S]*degraded[\s\S]*(?:ready|readiness)/i);
  assert.match(sync, /新加坡模型出口交付契约/);
  assert.match(sync, /\[x\].*(?:paperbanana-api|后端)/i);
  assert.match(sync, /\[x\].*(?:部署|运维)/i);
  assert.match(sync, /客户端.*无需|无需.*客户端/);
});

test('CI runs the bounded Singapore delivery and workflow contract suite', () => {
  const workflow = readFileSync(new URL('../../../.github/workflows/ci.yml', import.meta.url), 'utf8');
  assert.match(workflow, /node --test deploy\/sg-egress\/tests\/\*\.test\.mjs/);
});

test('WireGuard and Squid are constrained to the fixed tunnel and approved CONNECT destinations', () => {
  const installer = read('scripts/install-egress.sh');

  assert.match(installer, /10\.77\.0\.0\/30/);
  assert.match(installer, /Address = 10\.77\.0\.2\/30/);
  assert.match(installer, /ListenPort = 51820/);
  assert.match(installer, /interface_name="pbsg0"/);
  assert.match(installer, /AllowedIPs = 10\.77\.0\.1\/32/);
  assert.match(installer, /http_port 10\.77\.0\.2:3128/);
  assert.match(installer, /acl hk src 10\.77\.0\.1\/32/);
  assert.doesNotMatch(installer, /acl sg_health src/);
  assert.match(installer, /acl CONNECT method CONNECT/);
  assert.match(installer, /acl SSL_ports port 443/);
  assert.match(installer, /acl approved dstdomain -n api\.openai\.com generativelanguage\.googleapis\.com openrouter\.ai/);
  assert.doesNotMatch(installer, /acl approved dstdomain \./);
  assert.match(installer, /http_access allow hk CONNECT SSL_ports approved/);
  assert.doesNotMatch(installer, /http_access allow sg_health/);
  assert.match(installer, /http_access deny all/);
  assert.match(installer, /cache deny all/);
  assert.match(installer, /acl literal_ipv4 url_regex/);
  assert.ok(installer.includes('acl literal_ipv6 url_regex -i ^\\[[0-9a-f:.]+\\]:[0-9]+$'));
  assert.match(installer, /acl private_dst dst 0\.0\.0\.0\/8/);
  assert.match(installer, /acl private_dst dst 10\.0\.0\.0\/8/);
  assert.match(installer, /acl private_dst dst ::\/128/);
  assert.match(installer, /acl private_dst dst ::1\/128/);
  assert.match(installer, /acl private_dst dst fc00::\/7/);
  assert.match(installer, /acl private_dst dst fe80::\/10/);
  assert.match(installer, /http_access deny literal_ip/);
  assert.match(installer, /http_access deny private_dst/);
  assert.doesNotMatch(installer, /destination_ipv6 dst ipv6|http_access deny destination_ipv6/);
  assert.match(installer, /Requires=wg-quick@\$\{interface_name\}\.service/);
  assert.match(installer, /After=wg-quick@\$\{interface_name\}\.service/);
  assert.match(installer, /RestrictAddressFamilies=AF_UNIX AF_INET/);
  assert.match(installer, /host_verify_strict on/);
  assert.match(installer, /logformat paperbanana_egress .*%>rd:%>rP/);
  assert.doesNotMatch(installer, /%\{Host\}>h/);
  assert.ok(
    installer.indexOf('squid -f "$squid_candidate" -k parse') < installer.indexOf('mv -f -- "$squid_candidate" "$squid_config"'),
    'Squid must parse the candidate before replacing the live configuration',
  );
  assert.doesNotMatch(installer, /ssl_bump|https_port/);
});

test('egress installation protects peer and server private material', () => {
  const installer = read('scripts/install-egress.sh');
  const readme = read('README.md');

  assert.match(installer, /HK_WG_PUBLIC_KEY/);
  assert.match(installer, /HK_WG_ENDPOINT_FILE/);
  assert.match(installer, /\{43\}=/);
  assert.match(installer, /wg pubkey/);
  assert.match(installer, /stat -c '%a:%u'/);
  assert.match(installer, /600:0/);
  assert.match(installer, /chmod 0600/);
  assert.match(installer, /umask 077/);
  assert.doesNotMatch(installer, /(?:echo|printf)[^\n]*\$sg_private_key/i);
  assert.doesNotMatch(installer, /(?:echo|printf)[^\n]*PrivateKey\s*=/i);
  assert.match(readme, /不得.*Git|must never.*Git/i);
  assert.doesNotMatch([installer, readme].join('\n'), /(?:LTAI[A-Za-z0-9]{12,}|-----BEGIN .*PRIVATE KEY-----)/);
});

test('host bootstrap hardens SSH only after syntax validation and handles HBR narrowly', () => {
  const bootstrap = read('scripts/bootstrap-host.sh');

  assert.match(bootstrap, /VERSION_ID:-\}" != "24\.04"/);
  assert.match(bootstrap, /wireguard squid chrony unattended-upgrades/);
  assert.match(bootstrap, /mktemp "\$\(dirname -- "\$swapfile"\)\/\.swapfile\.paperbanana\.XXXXXX"/);
  assert.match(bootstrap, /fallocate -l 1G "\$swap_candidate"/);
  assert.match(bootstrap, /mkswap "\$swap_candidate"/);
  assert.match(bootstrap, /blkid -o value -s TYPE -- "\$swapfile"/);
  assert.match(bootstrap, /PermitRootLogin no/);
  assert.match(bootstrap, /PasswordAuthentication no/);
  assert.match(bootstrap, /AllowTcpForwarding no/);
  assert.match(bootstrap, /KbdInteractiveAuthentication no/);
  assert.match(bootstrap, /PubkeyAuthentication yes/);
  assert.match(bootstrap, /MaxAuthTries 3/);
  assert.match(bootstrap, /AllowUsers ecs-user/);
  assert.match(bootstrap, /00-paperbanana-sg-egress\.conf/);
  assert.ok(bootstrap.indexOf('id -u ecs-user') < bootstrap.indexOf('PermitRootLogin no'), 'ecs-user must be verified before restricting SSH users');
  assert.ok(bootstrap.indexOf('sshd -t') < bootstrap.indexOf('systemctl reload ssh'), 'sshd must be verified before reload');
  assert.match(bootstrap, /sshd -T/);
  assert.match(bootstrap, /validate_connection root/);
  assert.match(bootstrap, /validate_connection ecs-user/);
  assert.match(bootstrap, /management_source/);
  assert.match(bootstrap, /Match/);
  assert.match(bootstrap, /effective sshd policy/);
  assert.match(bootstrap, /\/opt\/alibabacloud\/hbrclient\/uninstall/);
  assert.match(bootstrap, /hbr/);
  assert.match(bootstrap, /list-unit-files/);
  assert.match(bootstrap, /stat -c %F/);
  assert.match(bootstrap, /stat -c %u/);
  assert.doesNotMatch(bootstrap, /(?:aegis|AliyunDun).*disable|systemctl disable.*aegis/i);
});

test('smoke tests only exercise safe expected statuses and assert the deny boundary', () => {
  const smoke = read('scripts/smoke.sh');

  assert.match(smoke, /api\.openai\.com.*401|401.*api\.openai\.com/s);
  assert.match(smoke, /generativelanguage\.googleapis\.com.*403|403.*generativelanguage\.googleapis\.com/s);
  assert.match(smoke, /openrouter\.ai.*200|200.*openrouter\.ai/s);
  assert.match(smoke, /example\.com/);
  assert.match(smoke, /192\.0\.2\.1/);
  assert.match(smoke, /:444/);
  assert.match(smoke, /http_connect/);
  assert.match(smoke, /--hk/);
  assert.doesNotMatch(smoke, /--sg-monitor/);
  assert.doesNotMatch(smoke, /systemctl is-active --quiet squid/);
  assert.doesNotMatch(smoke, /Authorization:|api[_-]?key=|sk-[A-Za-z0-9]/i);
});

test('health monitor runs only from Hong Kong every five minutes and sends failures to journal', () => {
  const monitor = read('scripts/monitor-health.sh');
  const installer = read('scripts/install-health-monitor.sh');
  const service = read('systemd/paperbanana-hk-egress-health@.service');
  const timer = read('systemd/paperbanana-hk-egress-health@.timer');

  assert.match(monitor, /wg show "\$wg_interface" latest-handshakes/);
  assert.match(monitor, /--host hk/);
  assert.match(monitor, /--wg-interface/);
  assert.match(monitor, /handshake/);
  assert.match(monitor, /logger/);
  assert.doesNotMatch(monitor, /systemctl is-active --quiet squid/);
  assert.doesNotMatch(monitor, /--sg-monitor/);
  assert.match(service, /ExecStart=\/opt\/paperbanana-sg-egress\/scripts\/monitor-health\.sh --host hk --wg-interface %i/);
  assert.doesNotMatch(service, /squid\.service/);
  assert.match(service, /StandardError=journal/);
  assert.match(timer, /OnUnitActiveSec=5m/);
  assert.match(timer, /Persistent=true/);
  assert.match(installer, /--host hk/);
  assert.match(installer, /--wg-interface/);
  assert.match(installer, /10\.77\.0\.1\/30/);
  assert.match(installer, /paperbanana-hk-egress-health@\$\{wg_interface\}\.timer/);
});

test('uninstall is dry-run by default and removes only egress-owned paths', () => {
  const uninstall = read('scripts/uninstall.sh');

  assert.match(uninstall, /--apply/);
  assert.match(uninstall, /\/etc\/wireguard\/pbsg0\.conf/);
  assert.match(uninstall, /\/etc\/squid\/squid\.conf/);
  assert.match(uninstall, /paperbanana-sg-egress-health/);
  assert.match(uninstall, /--host/);
  assert.match(uninstall, /paperbanana-hk-egress-health@/);
  assert.match(uninstall, /--wg-interface/);
  assert.match(uninstall, /\/opt\/paperbanana-sg-egress\/scripts\/monitor-health\.sh/);
  assert.doesNotMatch(uninstall, /rm\s+-rf/);
  assert.doesNotMatch(uninstall, /\|\| true/);
  assert.match(uninstall, /wg-quick@pbsg0/);
  assert.match(uninstall, /LoadState/);
  assert.match(uninstall, /ip link show dev pbsg0/);
  assert.match(uninstall, /sport = :3128/);
  assert.doesNotMatch(uninstall, /\/etc\/ssh/);
  assert.doesNotMatch(uninstall, /userdel|deluser|\/home\//);
});
