# PaperBanana Singapore provider egress

This is a deliberately small, single-purpose egress host. The PaperBanana application, database, user content, API keys, and Hong Kong public API stay in Hong Kong. The Singapore Ubuntu 24.04 host runs only native WireGuard, a restricted Squid CONNECT proxy, and a systemd health timer. It does not run Docker or any PaperBanana business service and must not hold user data or provider credentials.

## Topology and fixed boundary

```text
Hong Kong PaperBanana host (pbsg0, 10.77.0.1) -- WireGuard UDP/51820 -- Singapore egress host (pbsg0, 10.77.0.2)
Hong Kong PaperBanana host -- HTTP CONNECT over 10.77.0.2:3128 --> approved provider HTTPS endpoints
```

Squid listens only on `10.77.0.2:3128`. It accepts `10.77.0.1` (Hong Kong) plus `10.77.0.2` only for the local health timer, only CONNECT on port 443, and only the exact hosts `api.openai.com`, `generativelanguage.googleapis.com`, and `openrouter.ai`. This local exception does not add a listener or public port. IPv4/IPv6 literals (including bracketed authorities), private, loopback, link-local and all other destinations are denied; approved name matching disables reverse DNS/PTR lookup. Squid does not decrypt TLS, does not cache, and logs only time, source, status, duration, bytes, and parsed CONNECT target `host:port`.

## Before deployment

Create cloud firewall/security-group rules before running these scripts:

- SSH: TCP 22 only from the nominated administrator IP range.
- WireGuard: UDP 51820 only from the Hong Kong host's public IP.
- Do **not** expose TCP 80, 443, or 3128 publicly.

Prepare these values out of band. They must never be committed to Git: the Hong Kong WireGuard public key (in a root-owned `0600` file) and the Hong Kong WireGuard endpoint (`host:51820`). No private key, API key, token, or real public IP belongs in this repository. The Singapore script refuses to replace any existing `pbsg0` configuration that lacks its PaperBanana ownership marker; it never touches a generic `wg0`.

The host runtime directory is `/opt/paperbanana-sg-egress`. Copy this `deploy/sg-egress` directory there with a trusted administrator account, then use `sudo` to run its scripts. Keep the directory root-owned and do not place user data or application secrets in it.

## Deployment order

1. Confirm the security-group rules and a current console/recovery path; use an administrator source that remains allowed by the proposed SSH rule.
2. Copy the assets to `/opt/paperbanana-sg-egress`, owned by root, and create the root-only Hong Kong peer public-key file.
3. On the Singapore host, run `sudo scripts/bootstrap-host.sh --dry-run`, inspect its output, then run `sudo scripts/bootstrap-host.sh --apply`. This removes HBR only when its narrowly named uninstall command exists; it deliberately leaves Aegis installed.
4. Set `HK_WG_PUBLIC_KEY_FILE` and `HK_WG_ENDPOINT` in the root shell (or accept the documented key-file default), run `sudo scripts/install-egress.sh --dry-run`, then `sudo scripts/install-egress.sh --apply`. The Singapore private key is generated locally with restrictive permissions and never printed.
5. From the Hong Kong host, configure its matching `pbsg0` peer, route only `10.77.0.2/32` to WireGuard, and point the approved lightweight provider requests at `http://10.77.0.2:3128` over the tunnel. Do not route unrelated traffic through this host.
6. Run `sudo scripts/install-health-monitor.sh --apply` on Singapore, then **from the Hong Kong host** run `scripts/smoke.sh --hk`. The smoke script verifies its local WireGuard peer and reaches Singapore only through the proxy; it intentionally does not test a local Squid process. The Singapore five-minute timer separately runs `smoke.sh --sg-monitor` through the tunnel-bound proxy as `10.77.0.2`; this is limited by the same three-host CONNECT ACL and does not create a public listener. The requests are unauthenticated endpoint checks only: they do not use a real API key and do not submit a paid generation request.

All mutating scripts default to dry-run. Pass `--apply` only after reviewing the resulting plan.

## Smoke and health

`scripts/smoke.sh --hk` checks WireGuard and the remote proxy, expects OpenAI 401, Gemini 403, and OpenRouter 200 without credentials, and requires an explicit proxy 403 for `example.com`, an IP literal, and a non-443 port. `scripts/monitor-health.sh` is run by `paperbanana-sg-egress-health.timer` every five minutes; it checks `pbsg0`, Squid's tunnel-only listener, and those same three no-key status codes through the local proxy exception. Failures are written to the system journal.

## Uninstall and rollback order

1. On Hong Kong, stop sending provider traffic to the proxy and restore the previous direct/provider-routing setting. Verify no new requests depend on the egress path.
2. Preserve the Hong Kong primary stack; this egress host has no application state to migrate back.
3. On Singapore, inspect `sudo scripts/uninstall.sh --dry-run`, then run `sudo scripts/uninstall.sh --apply`. It stops/removes only egress-owned units and marked `pbsg0`/Squid configuration; a stop failure aborts before configuration deletion. It restores the package Squid configuration when a backup exists, and does not weaken SSH or delete user data.
4. Remove the UDP 51820 security-group rule only after `pbsg0` is down. Keep SSH access until the host is intentionally decommissioned through the cloud console process.
