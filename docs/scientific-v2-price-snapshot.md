# Scientific V2 authoritative price snapshot

Scientific V2 production accepts only price snapshot schema v2. The old
`sourceVerified: true` shape remains part of older benchmark flows, but is not
valid for `codex_scientific_v2` freeze or prepare.

## Trust and hashing boundary

- `deriveScientificV2PriceRequirements()` consumes the frozen canonical
  manifest and emits each unique physical `(provider, modelId, operation)`.
  Generation and direct edit are separate requirements.
- Each route freezes its requested output lane: prefer declared `2K`, use `1K`
  when it is the only declared lane, and use `provider-default` only when the
  endpoint exposes no resolution parameter. Generation is 16:9. Edit also
  binds the fixed 2048x1152 source PNG and source SHA-256.
- Each entry records the provider's original currency and charge lines,
  billing region, official HTTPS source URL, captured byte SHA-256 and capture
  time. OpenRouter entries additionally bind the image models response, full
  endpoint pricing fields and ECB exchange-rate response.
- CNY conversion uses integer 1e-8 CNY atoms and always rounds upward. Entry,
  requirement, preflight and snapshot hashes bind every evidence field.
- The signed outer envelope binds exact code SHA, canonical manifest hash,
  price snapshot hash and capture time. It uses the existing review-signing
  master only after deriving the domain key
  `paperbanana/scientific-v2/price-attestation/v2`; review/report/registry
  signatures cannot be replayed as price attestations.

The host prepare process must obtain the master from its protected runtime
environment. The secret is never a snapshot field, stdout field, Actions
artifact or command-line argument.

## Conservative pricing rules

- Alibaba Model Studio and Volcengine Ark observations must cite the exact
  model, billing region, operation and public official pricing bytes. A model
  name near another price is not sufficient evidence.
- OpenRouter variant selection is derived from the frozen lane. If multiple
  applicable variants remain, the maximum applicable cost is used. A caller
  cannot select a lower variant.
- Edit includes every applicable `input_text`, `input_image`,
  `input_reference` and `output_image` charge. `request` quantity is one. A
  megapixel quantity uses Core-owned 16:9 pixels for fixed 1K/2K lanes; a
  provider-default megapixel route without an official pixel upper bound is
  unresolved.
- Token prices require the captured model API `top_provider` context and
  maximum-completion bounds. Missing bounds are unresolved. Actual output
  pixels remain part of the execution ledger even when pricing is flat or
  token based.
- Every fixed slot is included in baseline. The snapshot also discloses the
  four-attempt worst case. Prepare blocks when baseline exceeds a provider's
  CNY 180 cap. Retries are not prepaid, but each attempt is checked against the
  same runtime cap before dispatch.

Any missing model, operation, input charge, variant, exchange rate, pixel/token
upper bound or drifted captured response makes the whole snapshot unresolved.
There is no partial production batch.

## Public primary sources

The read-only refresh path allows only public GET requests and captures exact
response bytes from:

- Alibaba Model Studio pricing: <https://help.aliyun.com/en/model-studio/model-pricing>
- Volcengine Ark pricing: <https://www.volcengine.com/product/ark>
- OpenRouter image models: <https://openrouter.ai/api/v1/images/models>
- OpenRouter endpoint pricing:
  `https://openrouter.ai/api/v1/images/models/{modelId}/endpoints`
- ECB daily reference rates:
  <https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml>

`refreshScientificV2OfficialPriceSources()` is deliberately secret-free. It
returns a content-addressed capture report and an explicit unresolved list; it
never turns an unparsed page into a trusted price. Offline fixtures use
`buildScientificV2PriceSnapshot()` and the same validator as production.

There is currently no exported production signing function. Until exact
Alibaba, Ark, OpenRouter and ECB extractors deterministically rebuild every
observation from persisted captured bytes and verify `capturesHash`, the
refresh report remains frozen with `resolved:false`; a caller-provided URL,
charge list, or fabricated resolved flag cannot create a production envelope.

## Current read-only audit (2026-08-31)

The five primary source families above returned HTTP 200 without credentials.
The current ECB payload is dated 2026-08-28 and exposes USD/EUR and CNY/EUR
reference rates. OpenRouter currently reports Krea 2 Large, Medium and Medium
Turbo as 1K-capable, with optional `input_references` (`min=0`), but their
endpoint `pricing` arrays are empty. The two Microsoft MAI Image 2.5 endpoints
publish token charge lines and the models API publishes 4096 context / 1024
maximum-completion bounds; these facts must be recaptured with the final
server-attested manifest.

This audit is not a production snapshot. Current production refresh still has
unresolved exact Ark model pricing and OpenRouter routes, including the empty
Krea prices. Therefore no complete price hash or authoritative CNY 180 budget
decision exists yet, and paid execution must remain blocked.
