# Production secret files

Nothing in this directory is a production credential. The host stores real
values below `/opt/paperbanana/secrets` with mode `0600` and the directory with
mode `0700`.

Required host files:

- `mongo-root-password`, `mongo-auth-password`, `mongo-business-password`, `mongo-bench-password`, `mongo-bench-api-password`
- `mongo-keyfile` (owned by the MongoDB container uid and mode `0400`)
- `gateway.env`, `core.env`, `worker.env`, `bench.env`
- `backup.env` and an OSS utility config limited to the backup bucket prefix
- `monitor.env` containing only the dedicated `cms:PutCustomEvent` RAM key
- GitHub environment secrets `ALIBABA_DIRECTMAIL_ACCESS_KEY_ID` and
  `ALIBABA_DIRECTMAIL_ACCESS_KEY_SECRET` for the dedicated
  `dm:SingleSendMail`-only runtime identity. The manual account-email workflow
  transports them through a mode-0600 temporary file and atomically updates
  `gateway.env`; credential values are never committed or printed.

`core.env` is root-owned mode `0600`. It contains the non-secret routing
contract `PAPERBANANA_PROVIDER_EGRESS_MODE=disabled|sg-required` and the fixed
`PAPERBANANA_SG_PROXY_URL=http://10.77.0.2:3128` alongside existing secrets.
Change those fields only with `scripts/set-provider-egress-mode.sh`; the script
does not source or print the file.

`bench.env` starts with `PAPERBANANA_BENCH_ENABLED=false` and a Mongo user that
can write only `paperbanana_benchmark`. Never append credentials by hand. The
manual `Configure Benchmark Credentials Disabled` workflow stages exactly
`PAPERBANANA_BENCH_{BAILIAN,OPENROUTER,ARK}_API_KEY` plus the six dedicated
`PAPERBANANA_BENCH_OSS_*` settings in a root-readable mode-0600 temporary
bundle. The root-only operator validates and atomically installs them without
loading or printing an env file. Its only mutating flag is
`--apply-disabled`, and it removes an accepted staged bundle on every success
or failure path. Credential activation and normal deployment both hold
`/run/lock/paperbanana-hk-production.lock`; do not bypass the host deployment
wrapper. Do not reuse Core BYOK traffic or the product OSS access key.
Enabling the worker still requires a recorded candidate approval with
generation, Judge and USD caps.

The service is additionally behind the Compose `benchmark` profile. Every
deployment must set exactly one `PAPERBANANA_BENCH_SECRET_MODE` in `.env`.
`discovery-only` rejects all nine credential names. `configured-disabled`
requires all of them, preserves them across explicit future deployments, and
still requires `PAPERBANANA_BENCH_ENABLED=false` with concurrency one. Only
after credentials, judge calibration and a separately recorded budget approval
are ready may a future, separately authorized gate enable paid execution.
Rollback starts by pausing active runs and setting the flag back to `false`;
Mongo and OSS evidence are retained.

Core uses the distinct `paperbanana_benchmark_api` Mongo identity and a
Bench-only OSS signer. Keep `PAPERBANANA_BENCH_API_ENABLED=false` until those
read/admin and signing credentials plus an immutable `PAPERBANANA_CODE_SHA` are
present in `core.env`; the API must never sign Bench objects with the product
bucket identity.

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
