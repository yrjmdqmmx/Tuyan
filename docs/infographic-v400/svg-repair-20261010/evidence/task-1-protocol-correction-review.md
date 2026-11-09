# Independent bounded protocol-correction review

Scope: one explicit additional extraction correction after a complete invalid model response; same-version review protocol retry only within existing maxCriticRounds. No paid provider calls, production edits, complete test suite, commit, or shared acceptance-artifact rewriting by this reviewer.

## Findings and behavior

**Final verdict: no remaining blocking finding identified in this bounded-correction scope.** Final frozen hashes were independently verified below. Draft-review findings were corrected before freezing: retry eligibility now requires complete unique node/relation coverage when present; malformed but substantive issue containers also block retry; actual DIAGRAM_LAYOUT_* exceptions receive local layout classification rather than a generic provider/unknown error. The strict topology parser, audit validators and geometry/compiler behavior are unchanged. The topology review prompt additionally clarifies that a named-node provenance quote can be the exact original name, while relation quotes must support the full relation and all quotes remain exact substrings.

- Extraction parsing is separate from compilation. Only an explicit parse-error allowlist can request correction, and the loop permits at most two extraction responses total. Nonempty uncertainties, capacity limits, invented node names, disconnected nodes, terminal/initial relation conflicts and compile/layout errors are excluded. Once parsing succeeds the graph is frozen and goes directly to local compilation; review retries do not regenerate it.
- Each complete extraction response and exact validation failure are saved before the additional request. A separate stage explicitly labels the extra main-model call, its one-call limit and failed raw hash. Complete evidence uses the previously reviewed 256 KiB inline/object-artifact mechanism. Storage exceptions occur outside the protocol-validation eligibility catch and stop progression.
- Same-version review retries preserve raw assessment, exact diagnostic, both history entries and current version/SVG/PNG/submitted-image hashes. They consume the next existing review round. They do not create a new graph/version, append a hidden final inspection, or raise maxCriticRounds. Only stable protocol code/error and previous-round/current-version identity enter the next review, not the old visual opinion. Extraction correction alone includes its invalid raw response as explicitly unaccepted data.
- A response containing both a schema/provenance error and substantive missing/extra/wrong relations, node issues, mismatched graph coverage, reported visual/code problems, original unmet/unsupported/uncertain requirements or uncertainty is ineligible. Wrong version/hash, observed-graph conflicts and contradictory conclusions remain ineligible. Exact quotes are still provenance, not semantic proof.
- Unknown, poll-only, cancellation/stop and fatal provider outcomes do not enter either correction loop. The local requestState=not_sent metadata applies only to local validation failure; it is not an eligibility predicate or evidence that prior completed calls were free. Existing successful provider-call records remain distinct from the local failure.

## Independent execution evidence

1. Saved `reviewer-protocol-classification.mjs`: actual round-3 shortened-node-quote review and duplicated-End extraction remain rejected by strict validation and qualify only for the bounded repair path. Fifteen mutations combining protocol and substantive problems are blocked, as are ambiguity/layout/capacity/relation conflicts. **Exit 0.**
2. Saved `reviewer-protocol-runtime.mjs`: six independently constructed mocked-transport scenarios, real local layout/render. **All passed, exit 0.** Actual topology/review calls respectively: extraction correction succeeds **2/1**; second invalid extraction stops **2/0**; same-version review succeeds **1/2**; mixed missing relation stops **1/1**; unknown response stops **1/0**; failure writing extraction evidence stops **1/0**. At second transport entry, the test queries the actual DB to prove preceding raw/error persistence. The repeated review has identical version/SVG/PNG/submitted-image hashes and no old-opinion marker; both failed and successful history entries remain.
3. New classifier/public-error tests independently rerun: **4/4, exit 0**.
4. New runtime tests independently rerun by name: extraction bound, round bound, mixed substantive/protocol failures, storage failure, unknown/poll/cancellation, immutable composite/bar retry, actual oversized-layout classification, observer protocol budget, preserved complete composite artifact evidence, and durable recovery. All eventual targeted results pass. No old evidence-writing matrix was invoked.

## Durable recovery and cost boundary

The durable recovery test uses actual createProviderWorkflow/journal storage. One definitive rejection is injected inside its operation boundary; no fake memoization is substituted. Four completed text transports (plan, extraction, extraction correction, first review) are replayed locally after resume, so transport count changes only **4 to 5** for the pending second review. Retry descriptors compare byte-for-byte equal. Two additional local reference checkpoints explain the journal complete count **6 to 7**; these are not billable model transports. Unknown claims are not relabelled safe.

Two intermediate test failures are retained honestly: throwing a synthetic rejection at the fetch boundary was wrapped as an unknown transport error by existing fetchWithRetry, which correctly prevented resume; the replacement test initially counted local checkpoints as paid calls. Only test injection/counting changed; production unknown handling was not relaxed. Final independent recovery test **1/1, exit 0**. This establishes same-code durable replay behavior with mocked provider transport, not a live restart test on every channel.

The new extraction request calls the existing callTextModel wrapper, retaining catalog/route checks, credential lookup, withPaidModelCall, providerWorkflow descriptor journaling, request-size/vision checks, channel adapter and provider-call recording. No side transport was added. No prepaid monetary reservation based on expected text-call count was found on this createJob route; benchmark budget machinery is a separate path. TokenDance still uses its existing credential/live-model/request checks and provider rejection handling. Existing TokenDanceCallInfo does not extract complete token usage, so this review does not claim all-channel usage completeness or reconciled billing. The controller's real Bailian runner separately records response usage. No live TokenDance or other-channel call was made.

## Controller runners

Read-only inspection and reverse-normalization prove that both scripts changed only their autonomous session guard from 32 to 40 since the prior reviewed hashes. This is a controller limit, not a user-defined monetary/call budget. Same two input cases and original scientific input source remain intact, with two final-review calls reserved. No full taxonomy expansion.

- runner.mjs SHA-256: `a722c88497e18485d864d11fb8d2e4caa80a94abbf44ad53cd396bda6ac634c0`.
- final-review.mjs SHA-256: `51c68660a2752a3b92f1db039d6059fb246547e5713473fac9bc22d02c18d5a9`.

The generalized complete-evidence writer retains all five composite pointer headers consumed by final-review.mjs. Per-round critic stages are distinct, and its latest-stage selection consumes the current final context. Full JSON hash/length verification and delivered artifact binding remain unchanged.

## Final freeze

Final manifest independently verified: **25/25 files match**, with **237/237** protected Mini Program/strict SVG renderer/assets files matching baseline. Manifest SHA-256 `aacdfe758fefb1e3ed9458418e83d3250860dd8d240a8a9030ccbec262486ff9`.

Changed/new frozen files relative to the prior 23-file prompt freeze:

- `runtime/handler.ts`: `350fc73ca1c028e36ea21c95cfc61d0826358fb7197f27bd13243a24f8dee670`.
- `src/protocol-correction.ts`: `28a82926e9de8497aef3e8b5a3c82af4eec8ea594b8f4af5aa88ff57e54bf0ea`.
- `src/diagram-topology.ts`: `224c760e6f7fd44d72188b145265862d8e92ff76a15b590ca5a67dfd2f6f3270` (review prompt clarification only; parser, validator and compiler unchanged).
- `packages/api/src/execution-errors.ts`: `bef4435d6b0a09a4ecb126d0d223769414aa42b49de2ea811967cb9069ab916f`.
- `tests/diagram-topology-runtime.test.ts`: `ef49201b4e1c8002ecaa9523797513764724c2f7a0f804390552da5d89ce74c6`.
- `tests/protocol-correction.test.ts`: `9769926f97a8791e3e44e207297b0d767775dff9db081eee80d996abd9925aa7`.

The two saved independent reviewer scripts and 4/4 classifier tests were rerun successfully against the final freeze. The ten selected runtime tests have individually passing final results as described above; the 6-case independent runtime script passed again on the exact manifest. Controller/implementer focused `protocol-correction-final-tests.log` reports **61/61** with exit 0 confirmed by `protocol-correction-final-validation-exits.json`; that record also confirms Core check/build and diff-check exit 0. Its scope is broader than this independent selected review. Both runner scripts also pass `node --check` without executing their paid entrypoints.

Prior full-Core results belong to prior freezes and are not claimed as testing this latest behavior change. Real-provider protocol compliance, actual two-input visual acceptance, live cross-channel accounting and deployment remain outside this offline verdict.
