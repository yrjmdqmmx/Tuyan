# Independent prompt-contract clarification review

Scope: clarify the two real round-2 protocol failures without modifying parsers, validators or rendering behavior. No paid calls, production edits or complete suites were performed by this reviewer.

## Code and protocol verdict

No blocking finding identified. Comparing both complete source files against reviewer-captured pre-change bytes shows that removing only `topologyExtractionPrompt` and `rendererReviewPrompt`, respectively, makes each remainder exactly identical. The change cannot normalize, discard or accept an illegal model field in the parser. Named starts retain their literal label; anonymous initial dots require the exact initial shape/role/evidence union. Original requirements remain authoritative; unsupported/unmet/uncertain requirements must remain non-pass. Metadata constraints are still inspected in visual/code findings, rather than wrongly asserted as original user quotes.

The complete renderer audit example explicitly has synthetic example-only originals and warns against copying example quotes or satisfied verdicts into the real task. The node templates describe the two variants and explicitly require replacing placeholders from actual original input. Empty node arrays in the envelope are a construction template, not a valid finished response; the unchanged node-count bounds still apply.

## Independent reproductions

Saved runnable regression: `reviewer-prompt-contract.mjs`, run from `apps/paperbanana-api` with `node --import tsx ../../.superpowers/sdd/2026-10-10-svg-topology-repair/reviewer-prompt-contract.mjs` — **exit 0**.

- Directly replayed the preserved round-2 `state-diagram-svg/call-2-topology.json` response against the unchanged parser: its empty-label terminal node is still rejected.
- Directly replayed the preserved mixed workflow/bar `call-5-review.json`, `call-7-review.json` and `call-8-review.json` responses against the unchanged validator with the correct child/overall original body: all three remain rejected for invalid original provenance. No invalid entries are filtered out.
- Extracted actual `renderer_audit_example_input` and `renderer_audit_example` JSON from the new prompt and validated them successfully. Mutating each verdict to unmet/unsupported/uncertain still gives non-pass. Adding each forbidden metadata source to an otherwise-valid audit still throws.
- Extracted actual `node_templates_json`; filled only its documented source placeholders from synthetic originals. Explicit unnamed initial and named Start variants parse successfully. Wrong terminal shape or missing initialEvidence still throws.

These are offline syntax/contract checks. They demonstrate correct legal examples and unchanged fail-closed handling, not that a model will now always comply or that arbitrary prose inference is semantically correct.

## Runner scope

Both runners were read only and syntax-checked successfully. Replacing the new ceiling literal 32 back with 24 exactly reproduces each previously reviewed SHA-256, proving there are no other changes since the previous review. The input/scenario list, original-input source, actual provider route, per-run limit and two-final-review reservation remain unchanged.

- `runner.mjs`: `77a25c24131fe582be80dac7d199458ada16828a187909ffe1aef94cc61bbf95`.
- `final-review.mjs`: `0cc9ac03a15b2be1e1c489fc09508683139ef3518fb510f1970faa783950608f`.

## Final freeze

**Final verdict: approved within this prompt-only review scope; no identified blocker.** Independently verified **23/23** frozen files and **237/237** protected files. Manifest SHA-256 `52a53a186ef1e85c977d6901d2bfb9a29e747727ed2f4e0360b7bf98420e4563`. Exactly three files changed relative to the P2 freeze:

- `diagram-topology.ts`: `8a2982bf2a6fa0d2d4e4ee7a4fc4958620136f866771dfab14c9773d74a9edfa`.
- `renderer-contract.ts`: `aac40087a8d5b85e6ef6df9801ac4f0dac0650754242d387e591b0050f276f6b`.
- `diagram-topology.test.ts`: `6cbafd445b1b140c3a20ab394f03eb71568749b9a5dfc86b31dc9c148f74b6e0`.

Reviewer independently reran the two new captured-response/template tests: **2/2, exit 0**. Implementer reports focused **39/39**, contract **2/2**, Core typecheck/build **exit 0**, recorded separately in `round3-prompt-final-validation-exits.json`. The prior P2 complete-Core 1228/1228 result is controller evidence for the previous freeze; it is not relabelled as a full suite of this new prompt freeze. Real-provider compliance and visual acceptance remain controller-owned.
