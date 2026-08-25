# PaperBanana Benchmark Worker

Private, portless execution worker for `pb-image-diagnostic-v1`. It shares the
Core `callImageModel` bundle, uses a dedicated Mongo database and a private OSS
`bench/` prefix, and starts in discovery-only mode.

## Safe startup

- `PAPERBANANA_BENCH_ENABLED=false` is the required deployment default.
- Candidate discovery runs every six hours and never calls a model.
- A paid run needs an immutable-admin approval with entitlement, price snapshot,
  generation count, Judge count and USD caps before its state can run.
- Provider credentials must use the `PAPERBANANA_BENCH_*` namespace. Product BYOK
  keys are ignored.
- Missing fixed aspect-ratio support is a capability gap, not a failed generation.
- A provider timeout after dispatch pauses the run as an unknown outcome and is
  never automatically re-dispatched.

## Dedicated secrets

Discovery-only needs `PAPERBANANA_BENCH_MONGODB_URI`, `PAPERBANANA_API_URL` and
the read-only `PAPERBANANA_BENCH_DISCOVERY_TOKEN`. Core accepts that token only
for `modelRegistry`; it cannot invoke user or administrator actions. Paid
execution additionally requires:

- `PAPERBANANA_BENCH_BAILIAN_API_KEY`
- `PAPERBANANA_BENCH_OPENROUTER_API_KEY`
- `PAPERBANANA_BENCH_ARK_API_KEY` when testing Ark
- `PAPERBANANA_BENCH_OSS_REGION`, `PAPERBANANA_BENCH_OSS_ACCESS_KEY_ID`,
  `PAPERBANANA_BENCH_OSS_ACCESS_KEY_SECRET`, `PAPERBANANA_BENCH_OSS_BUCKET`, and
  `PAPERBANANA_BENCH_OSS_INTERNAL_ENDPOINT`

Do not put these values in Mongo, logs, object metadata, review packets, the Web
bundle or public API responses.

## Verification

```bash
pnpm --filter @paperbanana/benchmark-worker test
pnpm --filter @paperbanana/benchmark-worker check
pnpm --filter @paperbanana/benchmark-worker build
```

The image publish workflow records an immutable GHCR digest but never deploys it.
