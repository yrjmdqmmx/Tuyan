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
- Reference PUT signatures bind both the declared `Content-Type` and exact `Content-Length`. Existing Web `File`/`Blob` and iOS `Data` uploads must send the exact declared content type and allow their HTTP transport to generate the matching length; client code must not try to set the forbidden `Content-Length` header itself. After PUT, clients call `finalizeReferenceUpload`; partial failures call `abortReferenceUpload`. The service persists upload state, verifies actual OSS metadata before finalization, and keeps task-creation verification as compatibility for older clients. A real Chrome and iOS-to-OSS upload smoke test is required before cutover. If either transport does not emit the signed length, use the planned gateway streaming-upload fallback rather than weakening the signature.
- Before a reference is consumed, the service reads authoritative OSS metadata, compares type/size with the signed declaration and 5 MiB limit, and best-effort deletes mismatches. Reference/refine downloads are streamed with a 5 MiB hard cap even when `Content-Length` is absent or false; provider image downloads use the explicit `PAPERBANANA_MAX_PROVIDER_IMAGE_BYTES` cap (20 MiB by default).
- BYOK remains memory-only: after selecting one provider key, background create/refine DTOs omit the complete `apiKeys` map and receive only the selected key as a separate argument.
- `/health` is process-local and returns the cached dependency state without network I/O. `/ready` performs a deadline-bounded, single-flight Mongo/OSS probe, updates that cache, and returns 503 when either dependency is unavailable. `PAPERBANANA_READINESS_PROBE_TIMEOUT_MS` defaults to 2000 ms.
- `PAPERBANANA_PROVIDER_EGRESS_MODE` is mandatory. `disabled` is the safe fail-closed staging/rollback mode: OpenAI, Gemini, and OpenRouter return `PROVIDER_EGRESS_UNAVAILABLE` and are never sent directly from Hong Kong. `sg-required` sends only those three canonical origins through the Singapore proxy; Bailian, OSS, Plot Worker, signed URLs, and all other origins retain their direct route.
- `PAPERBANANA_SG_PROXY_URL` must be exactly `http://10.77.0.2:3128` when `sg-required` is selected. Keep the fixed value in root-only `core.env`; do not put provider keys or proxy credentials in it (the proxy has neither). `providerEgress: degraded` is observable in `/health` and `/ready`, but `/ready` remains authoritative for MongoDB/OSS and therefore may remain HTTP 200 with `ready:true` while provider egress is degraded.
- Account deletion is a v2 two-phase contract. The read-only `accountDeletionCapability` preflight is required before the gateway can invoke `deleteAccount`. Deletion persists an immutable user-id tombstone, rejects new jobs/uploads/feedback, cancels queued work, waits for active jobs visible in MongoDB, removes job/reference objects, and keeps a periodic Core sweep for delayed presigned PUT completion. Retryable `ACCOUNT_DELETION_WAITING_FOR_UPLOADS` and `ACCOUNT_DELETION_WAITING_FOR_JOBS` responses leave Auth intact.

## Model registry and image protocols

- Public read-only action `modelRegistry` returns `{registryVersion, providers}`. Each provider includes server-owned defaults and model entries with `id`, `label`, `roles`, `capabilities`, `protocol`, and `availabilityNotes`. Clients should render this contract instead of inferring vision/image support from model-name regexes.
- Gemini and Bailian entries are an audited server snapshot. OpenRouter text, vision, and image entries come from its live Models and Image Models APIs and retain the existing bounded cache. Catalog lookup failure never guesses a route.
- OpenRouter image generation is discovered exclusively from `GET /api/v1/images/models` and every listed image model is sent to `POST /api/v1/images`. Image generation never falls back to chat completions; unknown or temporarily unavailable catalog entries fail closed.
- Gemini 3.x text and vision calls omit legacy `temperature`, `topP`, and `topK` overrides so provider defaults remain authoritative. Gemini image calls continue to send only required image generation configuration.
- Current protocol references: [OpenRouter Image Generation](https://openrouter.ai/docs/guides/overview/multimodal/image-generation), [OpenRouter Models API](https://openrouter.ai/docs/guides/overview/models), [Gemini models](https://ai.google.dev/gemini-api/docs/models), [Gemini 3 guide](https://ai.google.dev/gemini-api/docs/generate-content/gemini-3), [Alibaba Cloud Model Studio models](https://help.aliyun.com/en/model-studio/models), and [Alibaba image generation/editing](https://help.aliyun.com/en/model-studio/image-model/).

Copy `.env.example`, set every required value, then run:

```sh
pnpm test
pnpm check
pnpm build
pnpm start
```
