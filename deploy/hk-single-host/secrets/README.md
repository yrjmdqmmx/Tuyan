# Production secret files

Nothing in this directory is a production credential. The host stores real
values below `/opt/paperbanana/secrets` with mode `0600` and the directory with
mode `0700`.

Required host files:

- `mongo-root-password`, `mongo-auth-password`, `mongo-business-password`
- `mongo-keyfile` (owned by the MongoDB container uid and mode `0400`)
- `gateway.env`, `core.env`, `worker.env`
- `backup.env` and an OSS utility config limited to the backup bucket prefix

Use long random placeholders while testing, for example
`replace-with-at-least-32-random-bytes`. Never commit access keys, MongoDB
passwords, the Better Auth secret, gateway token, guest-cookie signing key, or
the plot-worker token.
