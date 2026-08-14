# PaperBanana Node API

Internal-only Node 24 runtime for the legacy PaperBanana business handler. The build imports `../laf-functions/paperbanana-api.ts` directly and aliases its `@lafjs/cloud` import to MongoDB and Alibaba Cloud OSS adapters. The Laf source remains unchanged and deployable for rollback.

## Runtime contract

- `GET`, `POST`, and `OPTIONS /paperbanana-api`; `GET /health`; `GET /ready`.
- Every GET/POST business call requires `x-paperbanana-gateway-token`. Client-supplied `gatewayToken` and `adminToken` body fields are discarded; the configured internal token is injected for the legacy handler.
- Business envelopes continue to use HTTP 200. Transport authentication, invalid JSON, and process failures use transport-level HTTP errors.
- `PAPERBANANA_SINGLE_REPLICA=true` is mandatory. Multiple replicas are unsupported until durable job leases are implemented.
- `MONGODB_URI` is provider-neutral and may point to the MongoDB service in the same host's Compose network; no managed MongoDB or VPC peering is required.
- Before readiness, queued/running jobs left by a previous process are marked retryable failures with `errorCode=RUNTIME_RESTARTED_RETRY`. Terminal jobs are unchanged.
- OSS must be a private bucket. The adapter only creates signed URLs and never enables path-style access.

Copy `.env.example`, set every required value, then run:

```sh
pnpm test
pnpm check
pnpm build
pnpm start
```
