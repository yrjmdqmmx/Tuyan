# PaperBanana Singapore provider egress

This is a deliberately small, single-purpose egress host. The PaperBanana application, database, user content, API keys, and Hong Kong public API stay in Hong Kong. The Singapore Ubuntu 24.04 host runs only native WireGuard, a restricted Squid CONNECT proxy, and a systemd health timer. It does not run Docker or any PaperBanana business service and must not hold user data or provider credentials.

## Topology and fixed boundary

```text
Hong Kong PaperBanana host (pbhk0, 10.77.0.1) -- WireGuard UDP/51820 -- Singapore egress host (pbsg0, 10.77.0.2)
Hong Kong PaperBanana host -- HTTP CONNECT over 10.77.0.2:3128 --> approved provider HTTPS endpoints
```

Squid listens only on `10.77.0.2:3128`. Its **only** allowed client source is `10.77.0.1` (Hong Kong), with CONNECT on port 443 only and these four exact hosts: `api.openai.com`, `generativelanguage.googleapis.com`, `openrouter.ai`, and `ark.cn-beijing.volces.com`. Singapore itself has no loopback, WireGuard-self, or local health exception. IPv4/IPv6 literals (including bracketed authorities), private, loopback, link-local and all other destinations are denied. An approved dual-stack name may resolve to both A and AAAA records, but any private answer fails closed; the marker-owned Squid systemd drop-in orders Squid after `wg-quick@pbsg0` and limits its socket families to `AF_INET` and `AF_UNIX`, so provider connections use IPv4 without TLS interception. Squid normalizes IPv4-mapped addresses to IPv4, so mapped private/loopback answers are denied by the IPv4 CIDRs and mapped literal authorities are denied syntactically; this avoids the unsafe `::ffff:0:0/96` ACL, which would also block every ordinary IPv4 provider address. Approved name matching disables reverse DNS/PTR lookup. Squid does not decrypt TLS, does not cache, and logs only time, source, status, duration, bytes, and parsed CONNECT target `host:port`.

The managed Squid configuration uses the fixed public resolvers `1.1.1.1` and `223.5.5.5` for provider lookups instead of inheriting the host resolver. This keeps the narrowly scoped provider proxy available when the Alibaba VPC-provided resolver is unreachable; exact destination ACLs, private-address rejection and end-to-end provider TLS remain authoritative.

## Before deployment

Create cloud firewall/security-group rules before running these scripts:

- SSH: TCP 22 only from the nominated administrator IP range.
- WireGuard: UDP 51820 only from the Hong Kong host's public IP.
- Do **not** expose TCP 80, 443, or 3128 publicly.

Prepare both peer public keys and both `host:51820` endpoints out of band. They must never be committed to Git. Store peer public keys/endpoints as root-owned `0600` files under `/root/.config/paperbanana-sg-egress/`; local private keys stay on their respective hosts and are never printed. The Singapore script refuses to replace any existing `pbsg0` configuration that lacks its PaperBanana ownership marker; the Hong Kong installer applies the same rule to `pbhk0`; neither touches a generic `wg0`.

The host runtime directory is `/opt/paperbanana-sg-egress`. Copy this `deploy/sg-egress` directory there with a trusted administrator account, then use `sudo` to run its scripts. Keep `/opt`, the runtime directory, its `scripts/` directory, and the HK timer's `monitor-health.sh`/`smoke.sh` root-owned and not group/world-writable; the HK installer enforces this before enabling its root timer. Do not place user data or application secrets in it.

## Deployment order

1. Confirm the security-group rules and a current console/recovery path; use an administrator source that remains allowed by the proposed SSH rule.
2. Deploy the reviewed Core image on Hong Kong with `PAPERBANANA_PROVIDER_EGRESS_MODE=disabled` and fixed `PAPERBANANA_SG_PROXY_URL=http://10.77.0.2:3128`; recreate only `paperbanana-api`. Disabled is fail-closed, never Hong Kong direct provider access. Copy the commit-scoped assets to `/opt/paperbanana-sg-egress`, owned by root, and create the root-only peer public-key/endpoint files.
3. On the Singapore host, run `sudo scripts/bootstrap-host.sh --dry-run`, inspect its output, then run `sudo scripts/bootstrap-host.sh --apply`. Run it from the actual administrator SSH session so it can validate that source address; a console-only run must supply a verified `PAPERBANANA_SG_EGRESS_MANAGEMENT_SOURCE_IP`. The script writes an early `00-` SSH drop-in, rejects conditional `Match` policy or nonstandard includes that could override it, validates both `ecs-user` and `root` for the real hostname, management source and loopback, then reloads. This removes HBR only when its narrowly named uninstall command exists; it deliberately leaves Aegis installed.
4. On Hong Kong run `sudo scripts/install-hk-peer.sh --dry-run`, then `--apply`. It owns only `pbhk0`, `10.77.0.1/30`, the SG peer `10.77.0.2/32`, and its marked local key. Candidate validation, reload/start verification and rollback are transactional; it adds no default route, forwarding or broad firewall rule.
5. On Singapore set `HK_WG_PUBLIC_KEY_FILE` plus root-only `HK_WG_ENDPOINT_FILE` (or accept their defaults), run `sudo scripts/install-egress.sh --dry-run`, then `--apply`. The Singapore private key is generated locally with restrictive permissions and never printed. A rerun validates candidate WireGuard/Squid configuration before replacement. If `pbsg0` is already active it reloads `wg-quick@pbsg0`, verifies the live peer, tunnel address and endpoint port, and restores both the prior file and live configuration on any failure. A newly generated project key is removed on every pre-commit failure. Squid likewise restores and restarts its last-good configuration and its marked systemd dependency drop-in on daemon-reload, enable/restart, or active-check failure.
6. Copy these monitoring assets to the same root-owned `/opt/paperbanana-sg-egress` path on **Hong Kong** (do not run Singapore bootstrap/install there). On Hong Kong, run `sudo scripts/install-health-monitor.sh --host hk --wg-interface pbhk0 --dry-run`, then the identical command with `--apply`. The installer verifies that `pbhk0` owns `10.77.0.1/30`, validates root-owned non-symlink runtime and systemd template sources, runs `systemd-analyze verify` when available, synchronously starts the exact oneshot service, and only then enables the timer. It rolls back copied units if validation or startup fails. Then run `scripts/smoke.sh --hk --wg-interface pbhk0` from Hong Kong. The requests are unauthenticated endpoint checks only: they do not use a real API key and do not submit a paid generation request.
7. Only after smoke, explicitly switch Core to `sg-required` with `deploy/hk-single-host/scripts/set-provider-egress-mode.sh` and recreate only `paperbanana-api`. Core may report `providerEgress: degraded` while `/ready` remains healthy for Mongo/OSS; the HK timer is the separate path-health alarm.

The manual-only `.github/workflows/deploy-sg-egress.yml` has `validate` and `deploy` actions in the independent `paperbanana-sg-egress` GitHub Environment. Deployment stages by commit SHA, pins StrictHostKeyChecking, performs every dry-run before apply, leaves Core disabled by default, and requires the separate `activate_core` input to select `sg-required`. Configure exactly the Environment secrets documented in `deploy/hk-single-host/secrets/README.md`: `ALIYUN_SG_EGRESS_HOST`, `ALIYUN_SG_EGRESS_USER`, `ALIYUN_SG_EGRESS_SSH_PRIVATE_KEY`, `ALIYUN_SG_EGRESS_SSH_KNOWN_HOSTS`, `ALIYUN_HK_HOST`, `ALIYUN_HK_USER`, `ALIYUN_HK_SSH_PRIVATE_KEY`, `ALIYUN_HK_SSH_KNOWN_HOSTS`, `PAPERBANANA_SG_WG_PUBLIC_KEY`, `PAPERBANANA_SG_WG_ENDPOINT`, `PAPERBANANA_HK_WG_PUBLIC_KEY`, and `PAPERBANANA_HK_WG_ENDPOINT`.

All mutating scripts default to dry-run. Pass `--apply` only after reviewing the resulting plan.

## Smoke and health

`scripts/smoke.sh --hk --wg-interface pbhk0` runs on Hong Kong, checks the matching peer and remote proxy, expects OpenAI 401, Gemini 403, OpenRouter 200, and Ark `GET /api/v3/models` 401 without credentials. The Ark probe is read-only and non-billable; it never calls `/chat/completions`. The smoke also requires an explicit proxy 403 for `example.com`, an IP literal, and a non-443 port. `paperbanana-hk-egress-health@pbhk0.timer` runs on Hong Kong every five minutes: it requires exactly one recent WireGuard handshake (default maximum age: 600 seconds) and then runs the same proxy smoke through `10.77.0.2:3128`. Failures are written to the Hong Kong system journal.

Singapore has no local provider health request or Squid ACL exception. Its package-managed WireGuard/Squid services are supervised by systemd; `install-egress.sh` parses the candidate Squid configuration before it replaces the live file, so a parse failure leaves the previous configuration intact.

## Uninstall and rollback order

1. On Hong Kong first set Core to `disabled` and recreate only `paperbanana-api`; this fail-closed rollback never restores HK direct access. Inspect `sudo scripts/uninstall.sh --host hk --wg-interface pbhk0 --dry-run`, then run it with `--apply` to remove the monitor only. If the peer/key must also be removed, use `--remove-peer` in both dry-run and apply commands. The script always removes and verifies the HK monitor before it stops only marked `pbhk0`/key state; unmarked state fails closed. It never touches generic `wg0`, the application stack, or Singapore services.
2. Preserve the Hong Kong primary stack; this egress host has no application state to migrate back.
3. On Singapore, inspect `sudo scripts/uninstall.sh --host sg --dry-run`, then run `sudo scripts/uninstall.sh --host sg --apply`. This SG mode never removes Hong Kong monitor assets. It stops project units by loaded/active state; if `wg-quick@pbsg0` metadata is already gone but the exact `pbsg0` interface remains, it deletes only that interface. If the Squid unit is gone but the exact `10.77.0.2:3128` listener remains, it only terminates the listener's verified `squid` PID; an unattributable listener or unrelated generic Squid process fails closed. Any stop failure aborts before configuration deletion; only marked configuration is removed. It restores the package Squid configuration when a backup exists, and does not weaken SSH or delete user data.
4. Remove the UDP 51820 security-group rule only after `pbsg0` is down. Keep SSH access until the host is intentionally decommissioned through the cloud console process.
