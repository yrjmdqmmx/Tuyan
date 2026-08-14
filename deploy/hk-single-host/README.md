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
  its loopback-only port; `DOCKER-USER` blocks gateway-initiated egress while
  allowing established replies to host Nginx.
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

1. Build images with immutable commit tags and record those tags in `.env`.
2. Run `scripts/deploy.sh` first without arguments, then with `--apply`.
3. The apply path creates the maintenance marker, recreates only this Compose
   project, waits up to 30 minutes for graceful core drain, runs isolation and
   OpenVac smoke checks, and clears maintenance only after success.
4. Install the bootstrap HTTP vhost, switch DNS, issue the certificate using
   the webroot `/var/www/letsencrypt`, then install the TLS vhost.
5. Run `backup-mongo.sh`; pass that archive to `restore-drill.sh` before
   accepting production writes.

Rollback is an explicit image-tag change followed by the same project-scoped
deploy script. After the new MongoDB accepts writes, do not point clients back
to the old Laf database without first entering maintenance and reconciling the
new records and objects.
