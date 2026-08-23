import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const firewallUrl = new URL('scripts/install-worker-firewall.sh', root);
const compose = readFileSync(new URL('compose.yaml', root), 'utf8');
const firewall = readFileSync(firewallUrl, 'utf8');
const deploy = readFileSync(new URL('scripts/deploy.sh', root), 'utf8');
const smoke = readFileSync(new URL('scripts/smoke.sh', root), 'utf8');

test('gateway edge permits only refreshed DirectMail HTTPS egress and otherwise fails closed', () => {
  assert.match(compose, /auth-gateway:[\s\S]*networks:[\s\S]*backend:[\s\S]*ipv4_address:\s*172\.28\.0\.10[\s\S]*edge:[\s\S]*ipv4_address:\s*172\.31\.0\.10/);
  assert.match(compose, /edge:\s*\n\s+driver:\s*bridge/);
  assert.doesNotMatch(compose, /edge:\s*\n\s+internal:\s*true/);
  assert.match(firewall, /172\.31\.0\.10\/32/);
  assert.match(firewall, /modprobe br_netfilter/);
  assert.match(firewall, /net\.bridge\.bridge-nf-call-iptables=1/);
  assert.match(firewall, /\/etc\/modules-load\.d\/paperbanana\.conf/);
  assert.match(firewall, /\/etc\/sysctl\.d\/99-paperbanana-bridge\.conf/);
  assert.match(firewall, /directmail_host="dm\.aliyuncs\.com"/);
  assert.match(firewall, /getent ahostsv4/);
  assert.match(firewall, /-s "\$gateway_source" -d "\$directmail_ip" -p tcp --dport 443/);
  assert.match(firewall, /flock -x 9/);
  assert.match(firewall, /PAPERBANANA-EGRESS-A/);
  assert.match(firewall, /PAPERBANANA-EGRESS-B/);
  assert.match(firewall, /iptables -F "\$staging_chain"/);
  assert.match(firewall, /iptables -I DOCKER-USER 1 -j "\$staging_chain"/);
  assert.doesNotMatch(firewall, /iptables -F "\$active_chain"/);
  assert.match(firewall, /--ctstate ESTABLISHED,RELATED -j ACCEPT/);
  assert.match(firewall, /--ctstate NEW -j REJECT/);
  assert.ok(firewall.indexOf('getent ahostsv4') < firewall.indexOf('iptables -F "$staging_chain"'), 'DNS failure must leave the installed firewall intact');

  const timerInstaller = readFileSync(new URL('scripts/install-directmail-egress-timer.sh', root), 'utf8');
  const timerService = readFileSync(new URL('systemd/paperbanana-directmail-egress.service', root), 'utf8');
  const timer = readFileSync(new URL('systemd/paperbanana-directmail-egress.timer', root), 'utf8');
  assert.match(timerService, /install-worker-firewall\.sh --refresh/);
  assert.match(timer, /OnUnitActiveSec=5m/);
  assert.match(timer, /Persistent=true/);
  assert.match(timerInstaller, /systemctl enable --now paperbanana-directmail-egress\.timer/);
  assert.match(deploy, /install-directmail-egress-timer\.sh/);

  assert.match(smoke, /dm\.aliyuncs\.com/);
  assert.match(smoke, /tls\.connect/);
  assert.match(smoke, /1\.1\.1\.1/);
});

test('gateway firewall behavior remains fail-closed across DNS, mutation, cleanup, and concurrency failures', () => {
  const harness = fileURLToPath(new URL('tests/fixtures/firewall-behavior-harness.sh', root));
  const result = spawnSync('bash', [harness, fileURLToPath(firewallUrl)], { encoding: 'utf8' });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});
