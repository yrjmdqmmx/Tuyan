# Production secret files

Nothing in this directory is a production credential. The host stores real
values below `/opt/paperbanana/secrets` with mode `0600` and the directory with
mode `0700`.

Required host files:

- `mongo-root-password`, `mongo-auth-password`, `mongo-business-password`
- `mongo-keyfile` (owned by the MongoDB container uid and mode `0400`)
- `gateway.env`, `core.env`, `worker.env`
- `backup.env` and an OSS utility config limited to the backup bucket prefix
- `monitor.env` containing only the dedicated `cms:PutCustomEvent` RAM key

`core.env` is root-owned mode `0600`. It contains the non-secret routing
contract `PAPERBANANA_PROVIDER_EGRESS_MODE=disabled|sg-required` and the fixed
`PAPERBANANA_SG_PROXY_URL=http://10.77.0.2:3128` alongside existing secrets.
Change those fields only with `scripts/set-provider-egress-mode.sh`; the script
does not source or print the file.

The manual GitHub Environment `paperbanana-sg-egress` uses placeholders with
these exact names (values are never committed):

- `ALIYUN_SG_EGRESS_HOST`, `ALIYUN_SG_EGRESS_USER`,
  `ALIYUN_SG_EGRESS_SSH_PRIVATE_KEY`, `ALIYUN_SG_EGRESS_SSH_KNOWN_HOSTS`
- `ALIYUN_HK_HOST`, `ALIYUN_HK_USER`, `ALIYUN_HK_SSH_PRIVATE_KEY`,
  `ALIYUN_HK_SSH_KNOWN_HOSTS`
- `PAPERBANANA_SG_WG_PUBLIC_KEY`, `PAPERBANANA_SG_WG_ENDPOINT`
- `PAPERBANANA_HK_WG_PUBLIC_KEY`, `PAPERBANANA_HK_WG_ENDPOINT`

Known-host values must be pinned `known_hosts` lines, endpoints are
`host:51820`, and the two WireGuard public values must correspond to the
host-local private keys. No WireGuard private key or provider API key belongs
in GitHub or this repository.

Use long random placeholders while testing, for example
`replace-with-at-least-32-random-bytes`. Never commit access keys, MongoDB
passwords, the Better Auth secret, gateway token, guest-cookie signing key, or
the plot-worker token.
