# PaperBanana Hong Kong single-host production

This deployment intentionally uses the existing 4 vCPU / 16 GiB Aliyun Hong
Kong Lightweight server. It does not require a second ECS, managed MongoDB, or
VPC peering.

## Topology

- Host Nginx terminates `api.paperbanana.asia` TLS and proxies only to
  `127.0.0.1:13005`.
- `auth-gateway`, `paperbanana-api`, a single-member MongoDB replica set, and
  `plot-worker` run under Compose project `paperbanana-hk`.
- MongoDB, core API and plot worker publish no host ports.
- The core alone joins an outbound network for OSS and BYOK providers.
- The plot worker joins only an internal bridge, runs under gVisor, uses a
  read-only root filesystem/tmpfs, and is blocked from initiating connections
  by a persistent `DOCKER-USER` rule.
- The gateway also joins a dedicated routable edge bridge so Docker can publish
  its loopback-only port; `DOCKER-USER` allows only TLS to the currently
  resolved public IPv4 addresses for `dm.aliyuncs.com`, blocks all other
  gateway-initiated egress, and still allows established replies to host Nginx.
  A five-minute systemd timer refreshes that destination set without changing
  the fail-closed policy when DNS is unavailable.
- Existing `openvac-production-*` containers and port `3010` are outside this
  Compose project and are health-checked before and after maintenance.

## Host layout

Runtime state lives under `/opt/paperbanana`: `data/mongodb`, `secrets`,
`control`, and `backups`. The repository checkout may be replaced independently
because no database or credential is stored in it.

All scripts default to a read-only or dry-run behavior where applicable. Run
`bootstrap-host.sh --apply` once. Do not run `install-gvisor.sh --apply` until
the Aliyun snapshot is complete and its ID has been written to
`/opt/paperbanana/control/pre-change-snapshot-id`.

`generate-runtime-secrets.sh` deliberately requires three pre-staged root-only
files: the existing Better Auth secret and the two scoped OSS access-key JSON
documents. It refuses to overwrite an initialized environment.

## Deployment and recovery

1. Build images with immutable commit tags and record those tags in a root-only
   staged image lock.
   Set exactly one `PAPERBANANA_BENCH_SECRET_MODE`: use `discovery-only` for
   the credential-free default, or `configured-disabled` only after the
   dedicated Bench credential gate has completed. Missing or unknown modes
   fail closed.
2. Validate through the manual deploy workflow or run the host wrapper with a
   randomized `/tmp/paperbanana-image-lock.*` path, the exact 40-character
   commit, and `--apply`. `scripts/apply-staged-deployment.sh` owns and deletes
   the staged file, and holds `/run/lock/paperbanana-hk-production.lock`
   continuously across `.env` installation, benchmark bootstrap, deploy,
   smoke, and cleanup. Direct `deploy.sh --apply` rejects requests without the
   wrapper's inherited descriptor for that exact locked path; its dry-run no
   longer advertises direct apply.
3. The apply path creates the maintenance marker, recreates only this Compose
   project, waits up to 30 minutes for graceful core drain, runs isolation and
   OpenVac smoke checks, and clears maintenance only after success.
4. Install the bootstrap HTTP vhost, switch DNS, issue the certificate using
   the webroot `/var/www/letsencrypt`, then install the TLS vhost.
5. Run `backup-mongo.sh`; pass that archive to `restore-drill.sh` before
   accepting production writes.
6. Run `scripts/install-backup-timer.sh` first as a dry run and then as root
   with `--apply`. It schedules a persistent daily backup at 03:17 China time
   with up to 15 minutes of jitter and prevents overlapping backup processes.

The deploy apply path runs `scripts/sync-reference-metadata.sh` before smoke
testing. It updates exactly the 306 image-backed `paperbanana-bench` documents
by business `id`, preserves English search fields and image/job/selection data,
and fails closed unless all required `zh-CN.v2` metadata and image fields pass
the postcondition. The four `paperbanana-fallback` records are outside this
count and are never modified. Metadata rollback must be coordinated: first
deploy the pre-`zh-CN.v2` legacy Core image, then run
`scripts/sync-reference-metadata.sh --rollback --legacy-core-active`. The
explicit acknowledgement prevents an active v2 Core (which intentionally
queries only `zh-CN.v2`) from losing its reference library. Rollback restores
the prior v1 copy where available and removes v2-only metadata without deleting
reference documents, images, jobs, or saved selections.

Check the schedule with `systemctl list-timers paperbanana-backup.timer` and
inspect each result with `systemctl status paperbanana-backup.service` plus the
corresponding `backups/mongo/<UTC timestamp>/` objects in the backup bucket.

## Benchmark credential staging

The default deployment mode is `discovery-only`: Core Bench API access and the
Worker remain disabled, and no Provider or Bench OSS credential may be present.
The manual `Configure Benchmark Credentials Disabled` workflow is the only
repository-supported transition to `configured-disabled`. It requires the
exact deployed 40-character commit, transports the three dedicated Provider
keys plus all six dedicated Bench OSS settings through an owner-only temporary
bundle, and invokes `scripts/configure-benchmark-credentials.sh --apply-disabled`.

The operator validates all inputs before mutation, takes an exclusive host
lock shared with normal deployment, atomically updates `core.env`, `bench.env`,
and `.env`, and recreates only
`paperbanana-api` and `benchmark-worker`. Core receives the Bench-only OSS
signer and `PAPERBANANA_BENCH_API_ENABLED=true`; the Worker receives its
dedicated Provider/OSS credentials but remains
`PAPERBANANA_BENCH_ENABLED=false` with concurrency one. Failed installation,
recreate, or smoke restores all three prior files and recreates the prior
services. An accepted staged bundle is operator-owned for `--apply-disabled`
and is removed after success, validation failure, or rollback; the workflow
cleanup remains defense in depth. This stage does not authorize generation,
judging, a canary, or any paid request.

Verified publication treats `bench/objects/<sha256>.png` as immutable after a
successful hash read. The Worker OSS RAM policy must not grant `DeleteObject`
or any overwrite capability, and every Worker write uses
`x-oss-forbid-overwrite: true`. Core HMAC-attests canonical run facts plus the
complete full sample/automatic-judgment review manifest. It verifies every OSS
object outside Mongo with an ali-oss operation timeout and shared abortable
batch, then the short snapshot transaction compares only the attested DB facts
and manifest hash before inserting a release.

## Benchmark paid operator

Judge calibration and the two-image canary use the manual
`Run Benchmark Paid Operator` workflow after `configured-disabled` has passed.
The workflow invokes `scripts/run-benchmark-paid-operator.sh`, which holds the
same production host lock as deployment, revalidates the exact deployed SHA,
and requires the daemon Worker to remain disabled with concurrency one. It
starts only a disposable Compose `benchmark-worker` container and never edits
`bench.env`.

Calibration permits zero generations and 12–24 Judge dispatches. Canary is
fixed at exactly two generations and at most six Judge dispatches. Both require
conservative per-call price snapshots with a public HTTPS source, capture time,
and an estimated dispatch ceiling no greater than USD 3. Provider billing is
authoritative and may differ from the estimate. Before dispatch, the script
checks the SHA baked into both immutable Core and Worker images in addition to
the runtime environment SHA.
The complete content-addressed report is stored under the private
`bench/operator-reports/` prefix; workflow output contains only the report hash,
counts and estimated spend. Passing calibration is recorded through Core's
existing internal admin transport using an immutable configured administrator
ID. Core boundedly reloads that private OSS report and recomputes the report,
authorization, and price hashes before immutably recording its derived result,
price, and usage facts; caller-supplied hash-shaped values are not trusted.
The operator still requires a separate explicit user budget authorization and
does not publish a profile.

## Singapore provider egress activation

`paperbanana-api` receives `PAPERBANANA_PROVIDER_EGRESS_MODE` and
`PAPERBANANA_SG_PROXY_URL` only through the existing root-only
`/opt/paperbanana/secrets/core.env` `env_file`. Generated environments start at
`disabled` with the fixed proxy placeholder `http://10.77.0.2:3128`.
`disabled` is fail-closed for OpenAI, Gemini, and OpenRouter; it never restores
Hong Kong direct access to those providers. `sg-required` is permitted only
after the reviewed Singapore/Hong Kong tunnel smoke succeeds.

Delivery order is strict: deploy the new Core image while mode remains
`disabled`; dry-run/apply the SG host and `pbhk0` assets; install the HK monitor;
run `scripts/smoke.sh --hk --wg-interface pbhk0`; then optionally run
`scripts/set-provider-egress-mode.sh --mode sg-required --dry-run` followed by
`--apply`. After either mode change, recreate only `paperbanana-api`:

```sh
docker compose --project-name paperbanana-hk --project-directory . --env-file .env -f compose.yaml \
  up -d --no-deps --force-recreate paperbanana-api
```

The switcher requires root, validates the existing env without sourcing it,
preserves every unrelated line plus owner/mode, and atomically replaces only
the two routing fields. Rollback always sets `disabled` and recreates only
`paperbanana-api`; rollback never uses Hong Kong direct provider access.

The production health monitor requires a root-only
`/opt/paperbanana/secrets/monitor.env` containing a dedicated RAM user's
`ALIBABA_CLOUD_ACCESS_KEY_ID` and `ALIBABA_CLOUD_ACCESS_KEY_SECRET`. That user
must be limited to `cms:PutCustomEvent`. Run
`scripts/install-health-monitor.sh --apply` after the CMS custom-event rule and
contact group exist. Every five minutes it checks public health/readiness,
OpenVac, all PaperBanana containers, Mongo connectivity and stuck jobs, backup
freshness, TLS lifetime, and new Nginx 5xx responses. It reports state changes
and hourly reminders through `PaperBananaProductionHealthFailure`.
Core `providerEgress: degraded` remains an explicit health signal but does not
make `/ready` fail when MongoDB and OSS are ready; the separate HK egress timer
is authoritative for tunnel/provider-path alerting.

## Legacy hostname compatibility window

Through 2026-09-14, the existing Sealos application for
`yifbnnzrwmxn.sealoshzh.site` is a credential-free reverse proxy to
`https://api.paperbanana.asia`. It uses the immutable image
`caddy@sha256:4c6e91c6ed0e2fa03efd5b44747b625fec79bc9cd06ac5235a779726618e530d`
with `/bin/sh -c` and an `env -i` command that starts `caddy reverse-proxy` on
port 3005. The production monitor checks this legacy hostname while the window
is active. Do not restore the old Auth Gateway image or resume Laf. On or after
the deadline, first confirm that no distributed client still uses the legacy
hostname, then pause the proxy; resource deletion still requires a separate
explicit approval.

Rollback is an explicit image-tag change followed by the same project-scoped
deploy script. After the new MongoDB accepts writes, do not point clients back
to the old Laf database without first entering maintenance and reconciling the
new records and objects.
