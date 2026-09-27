# PaperBanana Node API

Internal Node 24 service. `src/main.ts` configures MongoDB, private OSS, controlled provider transport and durable workflows, then loads `runtime/handler.ts`. The handler directly imports canonical modules from `packages/api` and `packages/types`. Benchmark image execution reuses the same handler through `src/image-runtime-entry.ts`. There is no cloud-function SDK, generated copy of shared business modules, or platform rollback entry.

## Request and persistence boundaries

- The public gateway owns login, guest cookies, ownership and immutable admin IDs. Core has no host port. Every business request requires `x-paperbanana-gateway-token`; dedicated admin assertions are checked separately. Caller body credentials are removed before Core supplies its internal tokens. A missing service credential fails closed.
- `/health` is cached liveness. Authenticated `/ready` probes Mongo and the private OSS bucket. Business envelopes keep their existing `code` shape; task fields and historical result/configuration formats remain readable.
- JSON bodies are limited to 1 MiB; reference bytes use signed OSS uploads. PUT signatures bind type/length; finalize verifies metadata. Object reads use bounded internal OSS SDK streams, never a signed-public-URL fallback. Current upload size and pixel limits come from `packages/api/src/reference-upload.ts`, role input policy and provider contracts; user-facing limits must come from these contracts.
- OSS writes must succeed. New outputs never fall back to inline MongoDB data URLs. Existing stored data URLs remain readable because they are user data, not a runtime compatibility target. Internal/public OSS endpoints must be distinct official regional endpoints; V4 signatures and private-bucket readiness are mandatory.
- Admission is bounded before async preflight/persistence: default 1 active, 2 pending, 1 per owner/IP. Node config can adjust validated limits. `PAPERBANANA_SINGLE_REPLICA=true` is required; deployment drains and stops the old process before starting the new one. Hard-interrupted jobs are reconciled on startup; encrypted workflow checkpoints distinguish unsent, submitted/unknown and completed provider operations to prevent duplicate paid submissions.
- SIGTERM stops admission and drains work before Mongo closes. Plot HTTP requests have an aborting 28-second deadline, within the provider transport policy. Cancellation does not prove a remote operation never executed.

## Models and shared contracts

Use `config/model-catalog-updates.json` and `node scripts/sync-model-catalog.mjs --check` as the catalog authority, not an old count in an operations document. Current v27 contains 1,040 static identities plus live catalogs; v3.8.1 remains unreleased. Main, vision and image routes remain independent, with credentials and thinking/configuration tied to exact channel/model/protocol. See [v3.8.1 evidence](../../docs/channel-audit/2026-09-27-v381/REAUDIT.md).

`PAPERBANANA_PROVIDER_EGRESS_MODE=disabled` is fail-closed for controlled overseas destinations. Set `PAPERBANANA_SG_PROXY_URL=http://10.77.0.2:3128` and enable `sg-required` only after the tunnel/proxy smoke passes.

Provider routing is defined in [`src/provider-egress.ts`](src/provider-egress.ts) and the matching SG Squid ACL. MiniMax China and domestic providers retain their direct route; `api.minimax.cn/v1` and `api.minimax.io/v1` have distinct policies. `ark.cn-beijing.volces.com` and the other exact controlled overseas targets use Singapore when `sg-required`; `disabled`, an unavailable proxy or an unapproved origin never triggers direct fallback. Every newly added origin must be present at both layers before release. The 2026-09-27 live SG ACL lacks the unreleased Novita addition.

The image bundle pins `jpeg-js@0.4.4`, `sharp@0.35.3`, `@resvg/resvg-wasm@2.6.2`; Docker builds run a real WebP→PNG self-test. `undici@7.29.0` implements the controlled transport. These are current Node dependencies and remain required.

## Operations and validation

[Current verified architecture](../../docs/operations/current-architecture.md) · [Compose deployment, backup and monitoring](../../deploy/hk-single-host/README.md).

Copy `.env.example` and provide secrets only through the approved local/host environment. Run `pnpm test`, `pnpm check`, `pnpm build` in this package. The CI also builds Core and Benchmark images and runs disposable-Mongo integration tests. Local validation never implies a production deployment or real model call.

## Reference corpus and retrieval

- Public read-only action `referenceLibrary` defaults to `scope: "bench"` and corpus `zh-CN.v2`. The fixed corpus contains exactly 306 image-backed PaperBananaBench cases: 66 diagrams and 240 plots. The four image-less internal style fallbacks are available only through `scope: "fallback"`; they are never included in bench counts or facets.
- The paginated request accepts `scope`, `page`, `pageSize`, `query`, `visualCategory`, `researchDomain`, and optional `taskName`. `pageSize` defaults to 12. Search covers preserved English `title`/`summary` plus Chinese display metadata and keywords. Query and facet filters run before pagination; OSS download URLs are generated only for the current page.
- The response adds `totalItems`, `totalPages`, `page`, `pageSize`, `facets`, and `corpusVersion`. Each reference preserves legacy fields and adds `shortIntroZh`, `detailZh`, `visualCategory`, `researchDomain`, `keywords`, and item `corpusVersion`. Callers that send only `taskName` and `limit` retain the legacy first-page behavior.
- Manual selection supports one to ten unique IDs. The service queries the exact IDs directly with `$in`, independent of the diagram/plot split, preserves request order, and preflights the selection before job admission. Missing or image-less IDs return `code: 422` with `businessCode: "REFERENCE_SELECTION_INVALID"`; more than ten IDs returns `code: 400` with `businessCode: "REFERENCE_SELECTION_LIMIT"`. IDs are never silently dropped.
