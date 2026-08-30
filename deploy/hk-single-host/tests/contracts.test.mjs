import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

test('operator scripts are committed as executables', () => {
  for (const path of [
    'scripts/backup-mongo.sh',
    'scripts/apply-staged-deployment.sh',
    'scripts/bootstrap-host.sh',
    'scripts/build-images.sh',
    'scripts/configure-benchmark-credentials.sh',
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

test('benchmark worker is opt-in, portless and disabled by its secret-file default', () => {
  const compose = read('compose.yaml');
  const secrets = read('scripts/generate-runtime-secrets.sh');
  assert.match(compose, /benchmark-worker:[\s\S]*?profiles:\s*\n\s+- benchmark/);
  assert.match(compose, /PAPERBANANA_BENCH_WORKER_IMAGE:-paperbanana-benchmark-worker:unconfigured/);
  assert.doesNotMatch(compose, /benchmark-worker:[\s\S]*?PAPERBANANA_BENCH_ENABLED:\s*["']?true/);
  assert.match(secrets, /PAPERBANANA_BENCH_ENABLED=false/);
  assert.match(compose, /benchmark-worker:[\s\S]*?networks:\s*\n\s+backend:[\s\S]*?egress:/);
});

test('paid benchmark one-offs use a distinct dynamic-address operator service', () => {
  const compose = read('compose.yaml');
  const operator = compose.match(/\n  benchmark-operator:\n([\s\S]*?)\n  auth-gateway:/)?.[1] || '';
  assert.ok(operator, 'benchmark-operator service is missing');
  assert.match(operator, /profiles:\s*\n\s+- benchmark-operator/);
  assert.match(operator, /PAPERBANANA_BENCH_WORKER_IMAGE/);
  assert.match(operator, /env_file:\s*\n\s+- \/opt\/paperbanana\/secrets\/bench\.env/);
  assert.match(operator, /networks:\s*\n\s+backend:\s*\{\}\s*\n\s+egress:\s*\{\}/);
  assert.doesNotMatch(operator, /ipv4_address|ports:|restart:\s*unless-stopped|healthcheck:/);
});

test('only Core and benchmark runtimes use the explicit configurable public DNS pair', () => {
  const compose = read('compose.yaml');
  const serviceBlock = (name) => {
    const start = compose.indexOf(`\n  ${name}:\n`);
    assert.ok(start >= 0, `${name} service is missing`);
    const tail = compose.slice(start + 1);
    const next = tail.slice(1).search(/\n  [a-z][a-z0-9-]*:\n/);
    return next < 0 ? tail : tail.slice(0, next + 1);
  };
  const dnsContract = [
    'dns:',
    '- ${PAPERBANANA_BENCH_DNS_PRIMARY:-223.5.5.5}',
    '- ${PAPERBANANA_BENCH_DNS_SECONDARY:-1.1.1.1}',
  ];
  for (const name of ['paperbanana-api', 'benchmark-worker', 'benchmark-operator']) {
    const block = serviceBlock(name);
    for (const line of dnsContract) assert.ok(block.includes(line), `${name} must include ${line}`);
  }
  for (const name of ['mongodb', 'mongo-init', 'plot-worker', 'auth-gateway']) {
    assert.doesNotMatch(serviceBlock(name), /\n\s+dns:/, `${name} must keep Docker's existing DNS configuration`);
  }
  assert.equal(compose.match(/PAPERBANANA_BENCH_DNS_PRIMARY/g)?.length, 3);
  assert.equal(compose.match(/PAPERBANANA_BENCH_DNS_SECONDARY/g)?.length, 3);
});

test('mongo-init performs the phase index migration before defining a drop-free worker role', () => {
  const initMongo = read('scripts/init-mongo.sh');
  const privilegeLines = initMongo.split('\n').filter((line) => line.includes('paperbanana_benchmark_worker_role') || line.includes('paperbanana_benchmark_'));
  for (const collection of ['paperbanana_benchmark_models', 'paperbanana_benchmark_runs', 'paperbanana_benchmark_samples', 'paperbanana_benchmark_judgments']) {
    const privilege = privilegeLines.find((line) => line.includes(`collection: "${collection}"`)) || '';
    assert.doesNotMatch(privilege, /"dropIndex"/, `${collection} must not gain dropIndex`);
  }
  const createPosition = initMongo.indexOf('phase_sample_unique');
  const legacyDropPosition = initMongo.indexOf('runId_1_caseId_1_repetition_1');
  const rolePosition = initMongo.indexOf('paperbanana_benchmark_worker_role');
  assert.ok(createPosition >= 0 && legacyDropPosition > createPosition && rolePosition > legacyDropPosition);
  assert.match(initMongo, /phaseIndex[\s\S]*unique !== true[\s\S]*throw/);
  assert.match(initMongo, /if \(legacySampleIndex\)[\s\S]*dropIndex/);
  const dispatchPrivilege = privilegeLines.find((line) => line.includes('collection: "paperbanana_benchmark_dispatches"')) || '';
  assert.match(dispatchPrivilege, /actions: \["find", "insert"\]/);
  assert.doesNotMatch(dispatchPrivilege, /"update"|"remove"|"createIndex"/);
  const dispatchPrivileges = privilegeLines.filter((line) => line.includes('collection: "paperbanana_benchmark_dispatches"'));
  assert.equal(dispatchPrivileges.length, 2);
  assert.match(dispatchPrivileges[1], /actions: \["find"\]/);
  const judgmentPrivilege = privilegeLines.find((line) => line.includes('collection: "paperbanana_benchmark_judgments"')) || '';
  assert.doesNotMatch(judgmentPrivilege, /"remove"/);
});

test('worker runtime creates or verifies phase indexes but never performs index migration', () => {
  const repository = read('../../apps/benchmark-worker/src/mongo-repository.ts');
  const processRun = read('../../apps/benchmark-worker/src/process-run.ts');
  assert.match(repository, /phase_sample_unique/);
  assert.doesNotMatch(repository, /\.dropIndex\(/);
  assert.doesNotMatch(repository, /dispatches\.(?:delete|update)/);
  assert.doesNotMatch(repository, /cancelJudgeDispatch/);
  const reserve = processRun.indexOf("reserveBudget(run._id, workerId, run.leaseToken, run.state, 'judgeCall'");
  const marker = processRun.indexOf('beginJudgeDispatch', reserve);
  assert.ok(reserve >= 0 && marker > reserve, 'dispatch budget must be reserved before the append-only marker insert');
  assert.doesNotMatch(processRun, /cancelJudgeDispatch/);
});

test('verified evidence TOCTOU boundary requires immutable content-addressed Worker OSS writes', () => {
  const worker = read('../../apps/benchmark-worker/src/process-run.ts');
  const readme = read('README.md');
  assert.match(worker, /x-oss-forbid-overwrite['"]?:\s*['"]true/);
  assert.match(readme, /Worker OSS RAM policy[^.]*must not grant[^.]*DeleteObject[^.]*overwrite/is);
});

test('benchmark worker image pins CJK glyph support and renders calibration snapshots during build', () => {
  const dockerfile = read('../../apps/benchmark-worker/Dockerfile');
  const packageJson = read('../../apps/benchmark-worker/package.json');
  assert.match(dockerfile, /PAPERBANANA_BENCH_CJK_FONT_VERSION/);
  assert.match(dockerfile, /fonts-noto-cjk=\$\{PAPERBANANA_BENCH_CJK_FONT_VERSION\}/);
  assert.match(dockerfile, /fc-match[\s\S]*Noto Sans CJK/);
  assert.match(dockerfile, /node dist\/calibration-snapshot\.mjs/);
  assert.match(packageJson, /src\/calibration-snapshot\.ts[\s\S]*dist\/calibration-snapshot\.mjs/);
});

test('the ESM resident Worker keeps sharp native loading external to the bundle', () => {
  const packageJson = JSON.parse(read('../../apps/benchmark-worker/package.json'));
  const residentBuild = String(packageJson.scripts.build).split('&&')[0];
  assert.match(residentBuild, /src\/main\.ts/);
  assert.match(residentBuild, /--external:sharp/);
});

test('Core and Worker images bake non-overridable commit provenance and publishing passes the checked-out SHA', () => {
  const coreDockerfile = read('../../apps/paperbanana-api/Dockerfile');
  const workerDockerfile = read('../../apps/benchmark-worker/Dockerfile');
  const corePublish = read('../../.github/workflows/publish-core-api.yml');
  const workerPublish = read('../../.github/workflows/build-benchmark-worker.yml');
  const ci = read('../../.github/workflows/ci.yml');
  for (const dockerfile of [coreDockerfile, workerDockerfile]) {
    assert.match(dockerfile, /ARG PAPERBANANA_CODE_SHA/);
    assert.match(dockerfile, /build-provenance\.json/);
  }
  assert.match(corePublish, /Resolve checked-out source SHA/);
  assert.match(corePublish, /PAPERBANANA_CODE_SHA=\$\{\{ steps\.source\.outputs\.sha \}\}/);
  assert.match(workerPublish, /PAPERBANANA_CODE_SHA=\$\{\{ steps\.source\.outputs\.sha \}\}/);
  assert.match(read('../../apps/benchmark-worker/package.json'), /judge-provider-diagnostic\.mjs/);
  assert.equal((ci.match(/PAPERBANANA_CODE_SHA=\$\{\{ github\.sha \}\}/g) || []).length >= 2, true);
});

test('Hong Kong deploy makes the disabled benchmark credential mode explicit with an immutable image', () => {
  const workflow = read('../../.github/workflows/deploy-hk.yml');
  const bootstrapUrl = new URL('scripts/bootstrap-benchmark.sh', root);
  assert.equal(existsSync(bootstrapUrl), true, 'benchmark bootstrap script must exist');
  const bootstrap = read('scripts/bootstrap-benchmark.sh');
  const deploy = read('scripts/deploy.sh');
  const deployWrapper = read('scripts/apply-staged-deployment.sh');
  const smoke = read('scripts/smoke.sh');

  assert.match(workflow, /benchmark_image:[\s\S]*required:\s*true/);
  assert.match(workflow, /PAPERBANANA_BENCH_WORKER_IMAGE/);
  assert.match(workflow, /paperbanana-benchmark-worker\$\{digest\}/);
  assert.match(workflow, /COMPOSE_PROFILES=benchmark/);
  assert.match(workflow, /default:\s*discovery-only/);
  assert.match(workflow, /configured-disabled/);
  assert.match(workflow, /apply-staged-deployment\.sh/);
  assert.match(deployWrapper, /bootstrap-benchmark\.sh[^\n]*benchmark_secret_mode/);

  assert.match(bootstrap, /set_env_value "\$bench_env" PAPERBANANA_BENCH_ENABLED false/);
  assert.match(bootstrap, /mongo-bench-password/);
  assert.match(bootstrap, /mongo-bench-api-password/);
  assert.match(bootstrap, /PAPERBANANA_BENCH_DISCOVERY_TOKEN/);
  assert.match(bootstrap, /PAPERBANANA_BENCH_REVIEW_SIGNING_SECRET/);
  assert.match(bootstrap, /PAPERBANANA_ADMIN_TRANSPORT_TOKEN/);
  assert.match(bootstrap, /PAPERBANANA_BENCH_(?:BAILIAN|OPENROUTER|ARK)_API_KEY/);
  assert.match(bootstrap, /set_env_value "\$core_env" PAPERBANANA_BENCH_API_ENABLED true/);
  assert.match(bootstrap, /configured-disabled/);
  assert.doesNotMatch(bootstrap, /source\s+[^\n]*(?:core|gateway|bench)\.env/);

  assert.match(deploy, /grep[^\n]*COMPOSE_PROFILES[^\n]*benchmark[^\n]*"\$deploy_dir\/\.env"/);
  assert.match(deploy, /benchmark_enabled[\s\S]*bench\.env/);
  assert.match(deploy, /benchmark_enabled[\s\S]*mongo-bench-password/);
  assert.match(deploy, /benchmark_enabled[\s\S]*mongo-bench-api-password/);
  assert.match(smoke, /benchmark_enabled[\s\S]*ps --status running benchmark-worker/);
  assert.match(smoke, /process\.env\.PAPERBANANA_BENCH_ENABLED !== "false"/);
  assert.match(smoke, /process\.env\.PAPERBANANA_BENCH_CONCURRENCY !== "1"/);
  assert.match(smoke, /PAPERBANANA_BENCH_OPENROUTER_API_KEY/);
  assert.match(smoke, /PAPERBANANA_BENCH_OSS_ACCESS_KEY_SECRET/);
  assert.match(smoke, /process\.env\[name\]/);
});

test('Mongo least-privilege roles cover public evidence and prompt storage before Core startup', () => {
  const initMongo = read('scripts/init-mongo.sh');
  const apiCollectionsSource = initMongo.match(/const apiWritableCollections = (\[[^\n]+\])/);
  assert.ok(apiCollectionsSource, 'API writable collection allowlist must be explicit');
  const apiCollections = JSON.parse(apiCollectionsSource[1]);
  for (const collection of [
    'paperbanana_benchmark_public_evidence',
    'paperbanana_benchmark_prompt_submissions',
    'paperbanana_benchmark_prompt_digests',
  ]) assert.ok(apiCollections.includes(collection), `${collection} must be writable by the Core API role`);

  const workerRole = initMongo.match(/role: "paperbanana_benchmark_worker_role",[\s\S]*?\n\s*},\n\s*{\n\s*role: "paperbanana_benchmark_api_role"/)?.[0] || '';
  assert.match(workerRole, /collection: "paperbanana_benchmark_public_evidence"[\s\S]*actions: \["find", "insert", "update"\]/);
  assert.match(workerRole, /collection: "paperbanana_benchmark_releases"[\s\S]*actions: \["find"\]/);
});

test('benchmark discovery bootstrap rejects paid credentials before mutating host secrets', () => {
  const secretDir = mkdtempSync(join(tmpdir(), 'paperbanana-bench-paid-'));
  const gatewayPath = join(secretDir, 'gateway.env');
  const corePath = join(secretDir, 'core.env');
  const benchPath = join(secretDir, 'bench.env');
  writeFileSync(gatewayPath, 'EXISTING_GATEWAY_VALUE=keep\n', { mode: 0o600 });
  writeFileSync(corePath, 'EXISTING_CORE_VALUE=keep\n', { mode: 0o600 });
  writeFileSync(benchPath, 'PAPERBANANA_BENCH_OPENROUTER_API_KEY=must-not-enter-discovery\nPAPERBANANA_BENCH_OSS_ACCESS_KEY_SECRET=must-not-enter-discovery\n', { mode: 0o600 });
  const before = [gatewayPath, corePath, benchPath].map((path) => readFileSync(path, 'utf8'));

  try {
    assert.throws(() => execFileSync(fileURLToPath(new URL('scripts/bootstrap-benchmark.sh', root)), ['--discovery-only'], {
      env: { ...process.env, PAPERBANANA_BENCH_BOOTSTRAP_TEST_MODE: 'true', PAPERBANANA_SECRET_DIR: secretDir, PAPERBANANA_CODE_SHA: 'b'.repeat(40) },
      stdio: 'pipe',
    }), /Command failed/);
    assert.deepEqual([gatewayPath, corePath, benchPath].map((path) => readFileSync(path, 'utf8')), before);
    assert.equal(existsSync(join(secretDir, 'mongo-bench-password')), false);
  } finally {
    rmSync(secretDir, { recursive: true, force: true });
  }
});

test('benchmark discovery bootstrap rejects mismatched discovery tokens before mutation', () => {
  const secretDir = mkdtempSync(join(tmpdir(), 'paperbanana-bench-token-'));
  const gatewayPath = join(secretDir, 'gateway.env');
  const corePath = join(secretDir, 'core.env');
  const benchPath = join(secretDir, 'bench.env');
  writeFileSync(gatewayPath, 'EXISTING_GATEWAY_VALUE=keep\n', { mode: 0o600 });
  writeFileSync(corePath, 'PAPERBANANA_BENCH_DISCOVERY_TOKEN=core-token\n', { mode: 0o600 });
  writeFileSync(benchPath, 'PAPERBANANA_BENCH_DISCOVERY_TOKEN=worker-token\n', { mode: 0o600 });
  const before = [gatewayPath, corePath, benchPath].map((path) => readFileSync(path, 'utf8'));

  try {
    assert.throws(() => execFileSync(fileURLToPath(new URL('scripts/bootstrap-benchmark.sh', root)), ['--discovery-only'], {
      env: { ...process.env, PAPERBANANA_BENCH_BOOTSTRAP_TEST_MODE: 'true', PAPERBANANA_SECRET_DIR: secretDir, PAPERBANANA_CODE_SHA: 'c'.repeat(40) },
      stdio: 'pipe',
    }), /Command failed/);
    assert.deepEqual([gatewayPath, corePath, benchPath].map((path) => readFileSync(path, 'utf8')), before);
    assert.equal(existsSync(join(secretDir, 'mongo-bench-password')), false);
  } finally {
    rmSync(secretDir, { recursive: true, force: true });
  }
});

test('benchmark discovery bootstrap is idempotent and preserves existing production secrets', () => {
  const secretDir = mkdtempSync(join(tmpdir(), 'paperbanana-bench-bootstrap-'));
  const gatewayPath = join(secretDir, 'gateway.env');
  const corePath = join(secretDir, 'core.env');
  writeFileSync(gatewayPath, 'EXISTING_GATEWAY_VALUE=keep\n', { mode: 0o600 });
  writeFileSync(corePath, 'EXISTING_CORE_VALUE=keep\n', { mode: 0o600 });
  const env = {
    ...process.env,
    PAPERBANANA_BENCH_BOOTSTRAP_TEST_MODE: 'true',
    PAPERBANANA_SECRET_DIR: secretDir,
    PAPERBANANA_CODE_SHA: 'a'.repeat(40),
  };

  try {
    const bootstrapPath = fileURLToPath(new URL('scripts/bootstrap-benchmark.sh', root));
    execFileSync(bootstrapPath, ['--discovery-only'], { env, stdio: 'pipe' });
    const firstGateway = readFileSync(gatewayPath, 'utf8');
    const firstCore = readFileSync(corePath, 'utf8');
    const firstBench = readFileSync(join(secretDir, 'bench.env'), 'utf8');

    assert.match(firstGateway, /^EXISTING_GATEWAY_VALUE=keep$/m);
    assert.match(firstCore, /^EXISTING_CORE_VALUE=keep$/m);
    assert.match(firstCore, /^PAPERBANANA_BENCH_API_ENABLED=false$/m);
    assert.match(firstBench, /^PAPERBANANA_BENCH_ENABLED=false$/m);
    assert.doesNotMatch(firstBench, /PAPERBANANA_BENCH_(?:BAILIAN|OPENROUTER|ARK)_API_KEY/);
    assert.equal(statSync(join(secretDir, 'bench.env')).mode & 0o077, 0);

    execFileSync(bootstrapPath, ['--discovery-only'], { env, stdio: 'pipe' });
    assert.equal(readFileSync(gatewayPath, 'utf8'), firstGateway);
    assert.equal(readFileSync(corePath, 'utf8'), firstCore);
    assert.equal(readFileSync(join(secretDir, 'bench.env'), 'utf8'), firstBench);
  } finally {
    rmSync(secretDir, { recursive: true, force: true });
  }
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
    '../../.github/workflows/build-benchmark-worker.yml',
    '../../.github/workflows/deploy-laf-functions.yml',
  ].map(read);

  for (const workflow of workflows) {
    assert.doesNotMatch(workflow, /\n\s*push:\s*\n/);
  }
  assert.doesNotMatch(workflows[1], /kubectl\s+set\s+image/);
  assert.doesNotMatch(workflows[2], /kubectl\s+set\s+image/);
  assert.doesNotMatch(workflows[3], /kubectl\s+set\s+image/);
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
