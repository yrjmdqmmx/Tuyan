# PaperBanana Node API

Internal-only Node 24 runtime for the PaperBanana business handler. The build imports `../laf-functions/paperbanana-api.ts` directly and aliases its `@lafjs/cloud` import to MongoDB and Alibaba Cloud OSS adapters. The shared Laf handler keeps backward-compatible defaults for rollback.

## Runtime contract

- `GET`, `POST`, and `OPTIONS /paperbanana-api`; `GET /health`; `GET /ready`.
- Every GET/POST business call requires `x-paperbanana-gateway-token`. Client-supplied `gatewayToken` and `adminToken` body fields are discarded; the configured internal token is injected for the legacy handler.
- If legacy admin actions are enabled, set `ADMIN_TOKEN` only on the server. After transport authentication the service injects it for the known admin actions; caller body values are never trusted.
- Business envelopes continue to use HTTP 200. Transport authentication, invalid JSON, and process failures use transport-level HTTP errors.
- JSON request bodies are limited to 1 MiB. Reference images must use the existing presigned-upload flow; oversized JSON returns HTTP 413.
- Generation/refine admission is process-wide and bounded before any async preflight or Mongo insert. Defaults are one active job, two pending jobs, and one admitted job per owner and client IP. Saturation returns the legacy HTTP-200 business envelope with `code: 429` and does not insert an orphan job. Limits are configurable within validated safe bounds using `PAPERBANANA_MAX_ACTIVE_JOBS`, `PAPERBANANA_MAX_PENDING_JOBS`, `PAPERBANANA_MAX_JOBS_PER_OWNER`, and `PAPERBANANA_MAX_JOBS_PER_IP`.
- `PAPERBANANA_SINGLE_REPLICA=true` is mandatory. Deploy with Recreate/stop-before-start semantics: even a rolling update that briefly overlaps two one-replica processes is unsupported until durable job leases are implemented.
- On the first SIGTERM/SIGINT, admission stops immediately, the HTTP listener closes, and the process keeps Mongo open until every reserved/queued/running job drains. A second termination signal forces exit; hard-killed work is handled by startup reconciliation.
- `PAPERBANANA_STRICT_OBJECT_STORAGE=true` is mandatory. OSS write failures fail the job instead of persisting `data:` URLs in MongoDB; the Laf runtime keeps its historical fallback only when this switch is unset/false.
- `MONGODB_URI` is provider-neutral and may point to the MongoDB service in the same host's Compose network; no managed MongoDB or VPC peering is required.
- Before readiness, queued/running jobs left by a previous process are marked retryable failures with `errorCode=RUNTIME_RESTARTED_RETRY`. Terminal jobs are unchanged.
- OSS must be a private bucket. `OSS_INTERNAL_ENDPOINT` is required for server-side put/list/stat/get/delete/probe calls and `OSS_PUBLIC_ENDPOINT` is required for client/provider signatures; the endpoints must be distinct official endpoints for `OSS_REGION`. Both clients use V4 virtual-hosted addressing and path-style access is never enabled.
- Reference PUT signatures bind both the declared `Content-Type` and exact `Content-Length`. Existing Web `File`/`Blob` and iOS `Data` uploads must send the exact declared content type and allow their HTTP transport to generate the matching length; client code must not try to set the forbidden `Content-Length` header itself. A real Chrome and iOS-to-OSS upload smoke test is required before cutover. If either transport does not emit the signed length, use the planned gateway streaming-upload fallback rather than weakening the signature.
- Before a reference is consumed, the service reads authoritative OSS metadata, compares type/size with the signed declaration and 5 MiB limit, and best-effort deletes mismatches. Reference/refine downloads are streamed with a 5 MiB hard cap even when `Content-Length` is absent or false; provider image downloads use the explicit `PAPERBANANA_MAX_PROVIDER_IMAGE_BYTES` cap (20 MiB by default).
- BYOK remains memory-only: after selecting one provider key, background create/refine DTOs omit the complete `apiKeys` map and receive only the selected key as a separate argument.
- `/health` is process-local and returns the cached dependency state without network I/O. `/ready` performs a deadline-bounded, single-flight Mongo/OSS probe, updates that cache, and returns 503 when either dependency is unavailable. `PAPERBANANA_READINESS_PROBE_TIMEOUT_MS` defaults to 2000 ms.

Copy `.env.example`, set every required value, then run:

```sh
pnpm test
pnpm check
pnpm build
pnpm start
```
