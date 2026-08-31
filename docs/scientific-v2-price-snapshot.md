# Scientific V2 authoritative price snapshot

Scientific V2 production accepts only signed price snapshot schema v2. A caller-provided URL, price, `sourceVerified` flag, or fabricated resolved flag cannot enter freeze/prepare.

## Evidence and signing boundary

- Requirements are derived from the server-attested canonical registry as unique `(provider, modelId, operation)` routes. Generation and direct edit are distinct requirements.
- The root-only refresh workflow obtains a fresh registry authority from Core, fetches only repository-fixed official URLs with a 4 MiB streaming cap, and stores raw bytes and its report as root-owned, content-addressed protected files. Captures bind URL, media type, time, byte size and SHA-256.
- The root-only signer reopens authority/report/authorization/captures with `O_NOFOLLOW`, verifies root ownership, mode `0600`, `nlink=1`, file identity, hashes, registry HMAC, requirements and a shared 24-hour authority/report freshness window, then writes a content-addressed `0600` envelope. Authority and report must carry the exact same `capturedAt`; exactly 24 hours is accepted and anything later is rejected by both signer and Core freeze. The signing master is read from a protected env file and never enters argv or stdout.
- The snapshot binds `canonicalManifestHash`, `requirementsHash`, `capturesHash`, server `registryAuthorityHash` and, when used, `operatorAuthorizationHash`. CNY uses integer 1e-8 atoms and rounds upward.

The supported host sequence is:

1. `refresh-scientific-v2-price-sources.sh` creates the registry authority, official raw captures and refresh report.
2. The manual `Authorize Scientific V2 Price Snapshot` workflow invokes `authorize-scientific-v2-price-snapshot.sh`. Under the shared host lock it verifies the immutable checkout and both running image digests/provenance, then a root Worker CLI re-verifies the authority/report/capture bytes and constructs `ScientificV2OperatorPriceAuthorization` for exactly the extractor's remaining unresolved requirement hashes using the repository-fixed map. No caller price is accepted.
3. The same locked wrapper calls `create-scientific-v2-price-snapshot.sh` to sign the exact observations plus authorized upper bounds. Only the authorization SHA, signed snapshot SHA, unresolved count, and per-provider baseline/worst-case/cap summary reach stdout.
4. prepare/freeze creates protected manifest/state/admin bundles. Admin attest stores its secret-free response by hash and signs it with the dedicated `paperbanana/scientific-v2/operator-attestation/v1` domain key. `stage-scientific-v2-run-bundle.sh` recomputes its canonical report hash, verifies the domain HMAC and all frozen hashes/gates, then combines those protected inputs with the locally protected signing master and prints only `runBundleHash` and safe bindings.

## Exact observations and conservative authorization

The deterministic extractor currently closes these official raw-byte cases:

- Ark `doubao-seedream-5-0-pro-260628`: first input image free, second and later CNY 0.02; output CNY 0.30 up to 2.61 MP and CNY 0.60 above it.
- Ark `doubao-seedream-5-0-260128`, `doubao-seedream-4-5-251128`, and `doubao-seedream-4-0-250828`: CNY 0.22, 0.25, and 0.20 per output.
- OpenRouter Krea 2 Large/Medium/Medium Turbo: generation USD 0.06/0.03/0.015 and one-reference style edit USD 0.065/0.035/0.0175. Moodboard pricing is parsed but is not applicable.

The parser binds model section, operation, charge/tier and the exact captured bytes. Tests reject swapped prices and removal of Ark's first-input-free rule.

For a requirement not yet closed by an exact extractor, the signer accepts only an `operator_authorized_conservative_upper_bound` entry bound to the canonical manifest, requirements hash, code SHA, capture time, exact unresolved requirement set and authorization hash. It independently rejects a re-hashed authorization whose unit CNY is lower than the repository-fixed exact model/operation map. Unknown models or operations, missing or additional requirements, stale/drifted capture time, malformed refresh hashes, and any capture-byte mismatch fail closed. This is an explicit temporary canary policy; it is not described as exact official extraction.

The fixed map covers the complete 77 requirement routes: Beijing Bailian and Ark request upper bounds, and official OpenRouter Krea, MAI token ceilings, Qwen Image 3, Recraft, Riverflow, Grok and FLUX formulas converted at a conservative `USD * 8 CNY`. Provider-default FLUX output is estimated at 4 MP; Flex edit alone also includes the fixed 2,359,296-pixel source charge. The full fixed-map baseline is approximately CNY 252.66 for OpenRouter before exact extractor substitutions, below its CNY 360 cap.

## Pixel reconciliation and safety gates

- `provider-default` estimates use conservative 2048x1152 (2,359,296 pixels).
- After a confirmed provider success, the original output bytes supply actual width, height and SHA-256. Actual CNY is recalculated from those facts even when artifact spool, OSS or later persistence fails. Seedream 5 Pro crosses from CNY 0.30 to CNY 0.60 above 2.61 MP.
- Only billables actually sent are applicable. The fixed edit path sends one source reference and no font, so `input_font` is not charged.
- Provider budgets are hard-capped at Bailian CNY 180, Ark CNY 180, and OpenRouter CNY 360. Price preflight and every manifest/API/operator/runtime gate bind those provider-specific values. Baseline must fit; four-attempt worst-case is disclosed but does not enlarge authorization. Concurrency is one under the shared production lock. Every dispatch is budget checked. An `UNKNOWN_PROVIDER_OUTCOME` is never retried and pauses reconciliation.

Execution begins with an immutable `executionPhase: "canary-only"` bundle. Only the first formal supported slot for Bailian, Ark, then OpenRouter is executed; success stops that provider immediately. The resulting protected state is `canary_complete`. A separately attested `executionPhase: "full"` bundle must resume that exact state, so the three successful canaries count as their final samples and are not repeated. Unknown or exhausted confirmed failure stops the bounded run under the existing fail-closed state rules.

## Fixed public sources

- Alibaba Model Studio: <https://help.aliyun.com/zh/model-studio/model-pricing>
- Volcengine Ark: <https://docs.volcengine.com/docs/82379/1544106?lang=zh>
- OpenRouter models: <https://openrouter.ai/api/v1/images/models>
- OpenRouter endpoints: `https://openrouter.ai/api/v1/images/models/{author}/{slug}/endpoints`
- Krea model pages: `https://openrouter.ai/krea/krea-2-{large|medium|medium-turbo}`
- ECB FX: <https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml>

## Remaining precision work

Exact deterministic extraction is still incomplete for the full 77-route registry, notably the complete Alibaba table and non-Krea OpenRouter endpoint and MAI token-bound variants. Those routes must remain visibly marked as operator-authorized conservative upper bounds; they must not be reported as exact official prices. This implementation has not deployed, enabled the resident worker, read production secrets, or made any provider/paid call.
