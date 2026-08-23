import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

test('operator scripts are committed as executables', () => {
  for (const path of [
    'scripts/backup-mongo.sh',
    'scripts/bootstrap-host.sh',
    'scripts/build-images.sh',
    'scripts/deploy.sh',
    'scripts/generate-runtime-secrets.sh',
    'scripts/init-mongo.sh',
    'scripts/install-gvisor.sh',
    'scripts/install-backup-timer.sh',
    'scripts/install-health-monitor.sh',
    'scripts/install-directmail-egress-timer.sh',
    'scripts/install-worker-firewall.sh',
    'scripts/monitor-health.sh',
    'scripts/report-cms-event.py',
    'scripts/restore-drill.sh',
    'scripts/set-account-email-config.sh',
    'scripts/smoke.sh',
    'scripts/transaction-smoke.sh',
  ]) {
    assert.equal(statSync(new URL(path, root)).mode & 0o111, 0o111, `${path} must be executable`);
  }
});

test('daily Mongo backup timer is persistent, bounded and installed explicitly', () => {
  const service = read('systemd/paperbanana-backup.service');
  const timer = read('systemd/paperbanana-backup.timer');
  const installer = read('scripts/install-backup-timer.sh');

  assert.match(service, /Type=oneshot/);
  assert.match(service, /ExecStart=\/usr\/bin\/flock -n \/run\/lock\/paperbanana-mongo-backup\.lock \/opt\/paperbanana\/repo\/deploy\/hk-single-host\/scripts\/backup-mongo\.sh/);
  assert.match(service, /TimeoutStartSec=2h/);
  assert.match(service, /UMask=0077/);
  assert.match(timer, /OnCalendar=\*-\*-\* 19:17:00 UTC/);
  assert.match(timer, /RandomizedDelaySec=15m/);
  assert.match(timer, /Persistent=true/);
  assert.match(installer, /systemctl daemon-reload/);
  assert.match(installer, /systemctl enable --now paperbanana-backup\.timer/);
  assert.match(installer, /install -m 0644/);
});

test('production health monitor covers application, data, backup, TLS and 5xx signals', () => {
  const monitor = read('scripts/monitor-health.sh');
  const reporter = read('scripts/report-cms-event.py');
  const service = read('systemd/paperbanana-health-monitor.service');
  const timer = read('systemd/paperbanana-health-monitor.timer');
  const installer = read('scripts/install-health-monitor.sh');

  assert.match(monitor, /https:\/\/api\.paperbanana\.asia\/health/);
  assert.match(monitor, /https:\/\/api\.paperbanana\.asia\/ready/);
  assert.match(monitor, /\.backend\.data\.ready == true/);
  assert.match(monitor, /https:\/\/yifbnnzrwmxn\.sealoshzh\.site\/health/);
  assert.match(monitor, /127\.0\.0\.1:3010\/api\/health/);
  assert.match(monitor, /countDocuments/);
  assert.match(monitor, /getCollection\("paperbanana_jobs"\)/);
  assert.match(monitor, /queued/);
  assert.match(monitor, /running/);
  assert.match(monitor, /paperbanana-backup\.service/);
  assert.match(monitor, /paperbanana-backup\.timer/);
  assert.match(monitor, /openssl x509 -checkend/);
  assert.match(monitor, /paperbanana-api\.access\.log/);
  assert.match(monitor, /PaperBananaProductionHealthFailure/);
  assert.match(reporter, /cms:PutCustomEvent|PutCustomEvent/);
  assert.match(reporter, /ALIBABA_CLOUD_ACCESS_KEY_ID/);
  assert.match(reporter, /ALIBABA_CLOUD_ACCESS_KEY_SECRET/);
  assert.match(reporter, /HMAC-SHA1/);
  assert.match(service, /EnvironmentFile=\/opt\/paperbanana\/secrets\/monitor\.env/);
  assert.match(timer, /OnUnitActiveSec=5m/);
  assert.match(timer, /Persistent=true/);
  assert.match(installer, /systemctl enable --now paperbanana-health-monitor\.timer/);
});

test('compose keeps the public edge on loopback and all data services private', () => {
  const compose = read('compose.yaml');

  assert.match(compose, /name:\s*paperbanana-hk/);
  assert.match(compose, /127\.0\.0\.1:13005:3005/);
  assert.doesNotMatch(compose, /(?:^|\n)\s+ports:\s*\n(?:(?!127\.0\.0\.1:13005:3005)[\s\S])*?(?:paperbanana-api|mongodb|plot-worker)/);
  assert.match(compose, /PAPERBANANA_API_URL:\s*http:\/\/paperbanana-api:3000\/paperbanana-api/);
  assert.match(compose, /PAPERBANANA_MAINTENANCE_FILE:\s*\/opt\/paperbanana\/control\/maintenance/);
  assert.match(compose, /stop_grace_period:\s*30m/);
  assert.match(compose, /PAPERBANANA_SINGLE_REPLICA:\s*["']?true["']?/);
  assert.match(compose, /PAPERBANANA_STRICT_OBJECT_STORAGE:\s*["']?true["']?/);
});

test('plot worker has a gVisor, filesystem, process, resource and network boundary', () => {
  const compose = read('compose.yaml');

  assert.match(compose, /runtime:\s*runsc/);
  assert.match(compose, /read_only:\s*true/);
  assert.match(compose, /no-new-privileges:true/);
  assert.match(compose, /cap_drop:\s*\n\s*- ALL/);
  assert.match(compose, /pids_limit:\s*96/);
  assert.match(compose, /PLOT_WORKER_REQUIRE_TOKEN:\s*["']?true["']?/);
  assert.match(compose, /ipv4_address:\s*172\.29\.0\.30/);
  assert.match(compose, /worker:\s*\n\s+internal:\s*true/);
  assert.match(compose, /tmpfs:\s*\n\s*- \/tmp:rw,noexec,nosuid,nodev,size=128m/);
});

test('nginx overwrites forwarding headers and enforces the JSON body limit', () => {
  const nginx = read('nginx/api.paperbanana.asia.conf');

  assert.match(nginx, /server_name\s+api\.paperbanana\.asia;/);
  assert.match(nginx, /proxy_pass\s+http:\/\/127\.0\.0\.1:13005;/);
  assert.match(nginx, /client_max_body_size\s+1100k;/);
  assert.match(nginx, /proxy_set_header\s+X-Forwarded-For\s+\$remote_addr;/);
  assert.match(nginx, /proxy_set_header\s+X-Real-IP\s+\$remote_addr;/);
  assert.match(nginx, /access_log\s+\/var\/log\/nginx\/paperbanana-api\.access\.log;/);
  assert.doesNotMatch(nginx, /\$proxy_add_x_forwarded_for/);
});

test('worker firewall permits replies but rejects worker-initiated connections', () => {
  const firewall = read('scripts/install-worker-firewall.sh');

  assert.match(firewall, /172\.29\.0\.30\/32/);
  assert.match(firewall, /--ctstate ESTABLISHED,RELATED -j ACCEPT/);
  assert.match(firewall, /--ctstate NEW -j REJECT/);
  assert.match(firewall, /DOCKER-USER/);
});

test('operations are project-scoped and avoid broad destructive Docker commands', () => {
  for (const path of [
    'scripts/deploy.sh',
    'scripts/backup-mongo.sh',
    'scripts/restore-drill.sh',
    'scripts/smoke.sh',
  ]) {
    const script = read(path);
    assert.match(script, /set -Eeuo pipefail/);
    assert.doesNotMatch(script, /docker\s+(?:system\s+)?prune/);
    assert.doesNotMatch(script, /docker\s+compose\s+down/);
    assert.doesNotMatch(script, /rm\s+-rf/);
  }

  const deploy = read('scripts/deploy.sh');
  assert.match(deploy, /--project-name\s+paperbanana-hk/);
  assert.match(deploy, /control_dir="\/opt\/paperbanana\/control"/);
  assert.match(deploy, /maintenance_file="\$control_dir\/maintenance"/);
  assert.match(deploy, /install -d -m 0750 -o 0 -g 1000 "\$control_dir"/);
  assert.match(deploy, /install -m 0640 -o 0 -g 1000 \/dev\/null "\$maintenance_file"/);
  assert.match(deploy, /--remove-orphans/);
  assert.ok(
    deploy.indexOf('install-worker-firewall.sh') < deploy.indexOf('up -d --remove-orphans'),
    'worker firewall must be installed before the worker starts',
  );
});

test('bootstrap HTTP vhost serves ACME only and never proxies plaintext API traffic', () => {
  const bootstrap = read('nginx/api.paperbanana.asia.bootstrap.conf');
  assert.match(bootstrap, /\.well-known\/acme-challenge/);
  assert.match(bootstrap, /location \/ \{\s*return 503;/);
  assert.doesNotMatch(bootstrap, /proxy_pass/);
});

test('backup and restore drill use compressed archives and an external OSS target', () => {
  const backup = read('scripts/backup-mongo.sh');
  const restore = read('scripts/restore-drill.sh');
  const bootstrap = read('scripts/bootstrap-host.sh');
  const secrets = read('scripts/generate-runtime-secrets.sh');

  assert.match(backup, /mongodump/);
  assert.match(backup, /--archive/);
  assert.match(backup, /--gzip/);
  assert.match(backup, /--oplog/);
  assert.match(backup, /sha256sum/);
  assert.match(backup, /ossutil\s+-c\s+"\$OSSUTIL_CONFIG_FILE"\s+cp/);
  assert.match(backup, /backups\/mongo/);
  assert.match(bootstrap, /ossutil_version="2\.3\.0"/);
  assert.match(bootstrap, /ossutil_name="ossutil-\$\{ossutil_version\}-linux-amd64"/);
  assert.match(bootstrap, /3ae4d9fc85a7a6e9f5654d1599766f1a3a42a3692870887b5ae9338d582ef65a/);
  assert.match(bootstrap, /install\s+-m\s+0755[\s\S]*\/usr\/local\/bin\/ossutil/);
  assert.match(secrets, /endpoint=https:\/\/oss-cn-hongkong-internal\.aliyuncs\.com/);
  assert.match(restore, /mongorestore/);
  assert.match(restore, /--archive/);
  assert.match(restore, /--gzip/);
  assert.match(restore, /--nsFrom/);
  assert.match(restore, /--nsTo/);
  assert.match(restore, /--nsInclude="paperbanana_auth\.\*"/);
  assert.match(restore, /--nsInclude="paperbanana_business\.\*"/);
  assert.match(restore, /--stopOnError/);
});

test('runtime secrets generator includes exact Web and WeChat origins', () => {
  const script = read('scripts/generate-runtime-secrets.sh');

  assert.match(
    script,
    /FRONTEND_ORIGINS=https:\/\/www\.paperbanana\.asia,https:\/\/paperbanana\.asia,https:\/\/servicewechat\.com,https:\/\/developers\.weixin\.qq\.com/,
  );
  assert.doesNotMatch(script, /FRONTEND_ORIGINS=.*\*/);
});

test('transaction smoke runs in the secret-bearing init service', () => {
  const transactionSmoke = read('scripts/transaction-smoke.sh');

  assert.match(transactionSmoke, /run\s+--rm\s+--no-deps\s+-T\s+mongo-init/);
  assert.doesNotMatch(transactionSmoke, /exec\s+-T\s+mongodb/);
  assert.match(transactionSmoke, /\/run\/secrets\/mongo_auth_password/);
  assert.match(transactionSmoke, /getCollection\("_migration_transaction_smoke"\)\.drop\(\)/);
});

test('repository templates contain placeholders, never concrete credentials', () => {
  const template = read('secrets/README.md');
  assert.doesNotMatch(template, /LTAI[A-Za-z0-9]{12,}/);
  assert.doesNotMatch(template, /-----BEGIN (?:OPENSSH|RSA) PRIVATE KEY-----/);
});

test('legacy production workflows cannot auto-deploy from a main push', () => {
  const workflows = [
    '../../.github/workflows/deploy-pages.yml',
    '../../.github/workflows/build-auth-gateway.yml',
    '../../.github/workflows/build-plot-worker.yml',
    '../../.github/workflows/deploy-laf-functions.yml',
  ].map(read);

  for (const workflow of workflows) {
    assert.doesNotMatch(workflow, /\n\s*push:\s*\n/);
  }
  assert.doesNotMatch(workflows[1], /kubectl\s+set\s+image/);
  assert.doesNotMatch(workflows[2], /kubectl\s+set\s+image/);
  assert.match(workflows[0], /VITE_API_BASE:\s*https:\/\/api\.paperbanana\.asia/);
  assert.match(workflows[0], /VITE_AUTH_BASE:\s*https:\/\/api\.paperbanana\.asia/);
});

test('legacy Laf rollback remains verification-only until the console dependency can be checked', () => {
  const workflow = read('../../.github/workflows/deploy-laf-functions.yml');
  const lafReadme = read('../../apps/laf-functions/README.md');
  const coreReadme = read('../../apps/paperbanana-api/README.md');
  const sync = read('../../SYNC.md');

  assert.doesNotMatch(workflow, /\blaf\s+func\s+push\b/i);
  assert.doesNotMatch(workflow, /\blaf\s+(?:login|app\s+init)\b|LAF_(?:PAT|APPID)/i);
  assert.match(workflow, /environment:\s*legacy-sealos/);
  assert.match(workflow, /verification[- ]only/i);
  assert.match(workflow, /manual(?:ly)?[^\n]*Laf console|Laf console[^\n]*manual/i);
  assert.doesNotMatch(workflow, /(?:npm|pnpm|yarn)\s+(?:install|add)[^\n]*jpeg-js|laf\s+(?:dependency|deps?)\s+/i);
  assert.match(lafReadme, /^# .*rollback only/im);
  assert.match(lafReadme, /jpeg-js@0\.4\.4/);
  assert.match(lafReadme, /sharp@0\.35\.3/);
  assert.match(lafReadme, /custom dependency/i);
  assert.match(lafReadme, /manual(?:ly)?[^\n]*Laf console|Laf console[^\n]*manual|仅能[^\n]*Laf 控制台/i);
  assert.match(coreReadme, /verification[- ]only/i);
  assert.match(coreReadme, /sharp@0\.35\.3/);
  assert.match(coreReadme, /manual(?:ly)?[^\n]*Laf console|Laf console[^\n]*manual|手动[^\n]*Laf 控制台/i);
  assert.match(sync, /jpeg-js@0\.4\.4/);
  assert.match(sync, /sharp@0\.35\.3/);
  assert.match(sync, /仅验证[^\n]*不含[^\n]*push|仅能[^\n]*控制台手动/);
  assert.match(workflow, /sharp/);
});

test('Core operations documentation includes Ark in the four-origin Singapore egress contract', () => {
  const coreReadme = read('../../apps/paperbanana-api/README.md');

  assert.match(coreReadme, /OpenAI, Gemini, OpenRouter, and Ark/);
  assert.match(coreReadme, /four canonical origins/);
  assert.match(coreReadme, /ark\.cn-beijing\.volces\.com/);
  assert.doesNotMatch(coreReadme, /only those three canonical origins/);
  assert.doesNotMatch(coreReadme, /does not yet classify the Ark origin/);
});

test('shipping Web and iOS clients default to the Aliyun production edge', () => {
  const clientFiles = [
    '../../apps/ios/PaperBanana/Core/AppDefaults.swift',
    '../../apps/ios/Scripts/e2e-gateway-smoke.mjs',
    '../../apps/ios/README.md',
    '../../apps/web/.env.example',
  ].map(read);

  for (const file of clientFiles) {
    assert.match(file, /https:\/\/api\.paperbanana\.asia/);
    assert.doesNotMatch(file, /yifbnnzrwmxn\.sealoshzh\.site/);
  }
});
