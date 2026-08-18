import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const path = (name) => new URL(name, root);
const read = (name) => readFileSync(path(name), 'utf8');

const scripts = [
  'scripts/bootstrap-host.sh',
  'scripts/install-egress.sh',
  'scripts/smoke.sh',
  'scripts/monitor-health.sh',
  'scripts/install-health-monitor.sh',
  'scripts/uninstall.sh',
];

test('Singapore egress operator assets exist and scripts are executable', () => {
  for (const name of ['README.md', ...scripts, 'systemd/paperbanana-sg-egress-health.service', 'systemd/paperbanana-sg-egress-health.timer']) {
    assert.ok(existsSync(path(name)), `${name} must be committed`);
  }
  for (const name of scripts) {
    assert.equal(statSync(path(name)).mode & 0o111, 0o111, `${name} must be executable`);
  }
});

test('all mutating operator scripts require an explicit apply gate', () => {
  for (const name of [
    'scripts/bootstrap-host.sh',
    'scripts/install-egress.sh',
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

test('WireGuard and Squid are constrained to the fixed tunnel and approved CONNECT destinations', () => {
  const installer = read('scripts/install-egress.sh');

  assert.match(installer, /10\.77\.0\.0\/30/);
  assert.match(installer, /Address = 10\.77\.0\.2\/30/);
  assert.match(installer, /ListenPort = 51820/);
  assert.match(installer, /AllowedIPs = 10\.77\.0\.1\/32/);
  assert.match(installer, /http_port 10\.77\.0\.2:3128/);
  assert.match(installer, /acl hk src 10\.77\.0\.1\/32/);
  assert.match(installer, /acl CONNECT method CONNECT/);
  assert.match(installer, /acl SSL_ports port 443/);
  assert.match(installer, /acl approved dstdomain api\.openai\.com generativelanguage\.googleapis\.com openrouter\.ai/);
  assert.doesNotMatch(installer, /acl approved dstdomain \./);
  assert.match(installer, /http_access allow hk CONNECT SSL_ports approved/);
  assert.match(installer, /http_access deny all/);
  assert.match(installer, /cache deny all/);
  assert.ok(installer.includes('acl literal_ip url_regex -i ^https?://[0-9a-f:.]+'));
  assert.ok(installer.includes('acl literal_ip url_regex -i ^[0-9a-f:.]+:'));
  assert.match(installer, /acl private_dst dst 10\.0\.0\.0\/8/);
  assert.match(installer, /http_access deny literal_ip/);
  assert.match(installer, /http_access deny private_dst/);
  assert.doesNotMatch(installer, /ssl_bump|https_port/);
});

test('egress installation protects peer and server private material', () => {
  const installer = read('scripts/install-egress.sh');
  const readme = read('README.md');

  assert.match(installer, /HK_WG_PUBLIC_KEY/);
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
  assert.match(bootstrap, /fallocate -l 1G \/swapfile/);
  assert.match(bootstrap, /PermitRootLogin no/);
  assert.match(bootstrap, /PasswordAuthentication no/);
  assert.match(bootstrap, /AllowTcpForwarding no/);
  assert.match(bootstrap, /MaxAuthTries 3/);
  assert.match(bootstrap, /AllowUsers ecs-user/);
  assert.ok(bootstrap.indexOf('id -u ecs-user') < bootstrap.indexOf('PermitRootLogin no'), 'ecs-user must be verified before restricting SSH users');
  assert.ok(bootstrap.indexOf('sshd -t') < bootstrap.indexOf('systemctl reload ssh'), 'sshd must be verified before reload');
  assert.match(bootstrap, /\/opt\/alibabacloud\/hbrclient\/uninstall/);
  assert.match(bootstrap, /hbr/);
  assert.doesNotMatch(bootstrap, /(?:aegis|AliyunDun).*disable|systemctl disable.*aegis/i);
});

test('smoke tests only exercise safe expected statuses and assert the deny boundary', () => {
  const smoke = read('scripts/smoke.sh');

  assert.match(smoke, /api\.openai\.com.*401|401.*api\.openai\.com/s);
  assert.match(smoke, /generativelanguage\.googleapis\.com.*403|403.*generativelanguage\.googleapis\.com/s);
  assert.match(smoke, /openrouter\.ai.*200|200.*openrouter\.ai/s);
  assert.match(smoke, /example\.com/);
  assert.match(smoke, /1\.1\.1\.1/);
  assert.match(smoke, /:444/);
  assert.doesNotMatch(smoke, /Authorization:|api[_-]?key=|sk-[A-Za-z0-9]/i);
});

test('health monitor runs every five minutes and sends failures to journal', () => {
  const monitor = read('scripts/monitor-health.sh');
  const installer = read('scripts/install-health-monitor.sh');
  const service = read('systemd/paperbanana-sg-egress-health.service');
  const timer = read('systemd/paperbanana-sg-egress-health.timer');

  assert.match(monitor, /wg show wg0/);
  assert.match(monitor, /squid/);
  assert.match(monitor, /logger/);
  assert.match(service, /ExecStart=\/opt\/paperbanana-sg-egress\/scripts\/monitor-health\.sh/);
  assert.match(service, /StandardError=journal/);
  assert.match(timer, /OnUnitActiveSec=5m/);
  assert.match(timer, /Persistent=true/);
  assert.match(installer, /systemctl enable --now paperbanana-sg-egress-health\.timer/);
});

test('uninstall is dry-run by default and removes only egress-owned paths', () => {
  const uninstall = read('scripts/uninstall.sh');

  assert.match(uninstall, /--apply/);
  assert.match(uninstall, /\/etc\/wireguard\/wg0\.conf/);
  assert.match(uninstall, /\/etc\/squid\/squid\.conf/);
  assert.match(uninstall, /paperbanana-sg-egress-health/);
  assert.doesNotMatch(uninstall, /rm\s+-rf/);
  assert.doesNotMatch(uninstall, /\/etc\/ssh/);
  assert.doesNotMatch(uninstall, /userdel|deluser|\/home\//);
});
