# Round-five structural prompt and recovery follow-up — independent review

Date: 2026-10-10. Worktree: `/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009`.

**Verdict: pass for the exact local freeze; no remaining blocking finding in this narrow follow-up.** Validators do not accept either captured malformed response, and no model-produced field is silently moved or wrapped. This verdict does not upgrade the round-five pipeline status or certify a future provider response/visual result. Reviewer performed no paid calls, product edits, commits, or full-suite rerun.

## Scope and evidence

The round-five state responses `call-2-topology.json` and `call-3-topology.json` have identical response SHA-256 `7e1c43f3f976c238a4c3a9be6cfc2a7673318f4ccc1273262da4ffba1cad3ec0`. Their `anonymousInitials` is an evidence object rather than the required map, and the initial edge names the container. Program responses `call-8-review.json` and `call-9-review.json` nest both source headers in `rendererAudit`; their roots have only critic_suggestions, revised_description and rendererAudit. All four continue to be rejected. The mixed workflow's correct graph and overall visual/code opinion do not erase the numeric child's review_failed status.

The previous program system prompt combined a strict two-field root example with an additional root schema. Replacing that combination with one complete program root is a reasonable narrow correction. The anonymous-marker text similarly benefits from a complete root/map/endpoint example rather than an isolated evidence value.

## Code assessment

- `diagram-topology.ts` now provides a complete anonymous-marker root template with a keyed map and matching initial endpoint. It still distinguishes named entries from unnamed markers, requires explicit original evidence, retains every original relation, and does not claim the generic template is the user's graph. Resolver acceptance conditions and semantic parser remain unchanged; the failed shape receives an attached structural diagnostic rather than an implicit wrapper.
- `renderer-contract.ts` exports `programRendererReviewPrompt()`. Its one program template contains exactly five root keys: critic_suggestions, revised_description, sourceProtocolVersion, sourceCatalogHash, rendererAudit. Both headers are explicitly root siblings. `handler.ts:6577` uses it only for fixed renderer review; the ordinary main-decision branch is unchanged. The no-argument renderer audit extension remains compatible with the separate SVG decision workflow and controller final reviewer.
- `source-provenance.ts` attaches `SourceDiagnostic` separately from the unchanged stable error message. Paths, expected shape, actual type and optional observed path are local deterministic schema facts. Correction eligibility still uses existing codes and rejects mixed substantive problems. Wrong hash, duplicate keys/depth, uncertainty and scientific conflicts are not relabelled as formatting success.
- `handler.ts:6379–6387` persists raw extraction, raw hash, original catalogue and diagnostic before the single explicit correction call. Program failure persists raw/history plus diagnostic before the next existing review round. Program retries retain the exact SVG/PNG and data hashes; no worker rerender or numeric edit is introduced. Persistent malformed extraction stops after two responses; persistent program failure remains review_failed after the configured rounds.
- `SOURCE_PROMPT_REVISION=1` is persisted in the internal source snapshot. This is necessary because changing prompts changes durable request descriptors. Missing/stale revision is not defaulted or backfilled; the existing full snapshot comparison rejects before operation/enqueue. The public wire remains source protocol v2/catalogue v1, and catalogue hash/ref content is unchanged.
- `provider-workflow.ts:293–294` checks an old execution version before opening its secret. This fixes the independently reported full-Core regression without relaxing either execution-version or source/prompt-version gates. Successful historical call steps remain intact.

## Independent verification on final bytes

Run from `apps/paperbanana-api`:

1. `node --import tsx ../../.superpowers/sdd/2026-10-10-svg-topology-repair/reviewer-structural-prompts.mjs` — **7/7, exit 0**. Replays the four captured bad responses against their actual saved source catalogues; checks precise path/type/observedPath and unchanged raw; validates both complete prompt templates through the actual resolver/parser/renderer validator; confirms mixed unsupported/uncertain content blocks correction; checks missing/stale prompt revision.
2. `node --import tsx ../../.superpowers/sdd/2026-10-10-svg-topology-repair/reviewer-prompt-resume.mjs` — **exit 0**. Actual durable workflow/cipher/journal first records one accepted mocked call and one definitive rejection. A missing prompt revision then fails workflow resume, handler resume and workflow run: **0 new transports, 0 enqueues, prior steps unchanged**. An old workflow-v1 row with an unreadable secret is refused with **0 decryptions**.
3. `node --import tsx --test --test-name-pattern='^(round-five anonymous map hierarchy|fixed program single root contract)' tests/diagram-topology-runtime.test.ts` — **2/2, exit 0**. Actual local runtime/renderer with mocked providers verifies one visible extraction correction; no silent raw normalization; same-version program rereview within budget; exact SVG/PNG/data preservation; one program worker execution; historical malformed replies retained; continuing errors remain non-pass.
4. `node --check docs/infographic-v400/svg-repair-20261010/final-review.mjs` — exit 0. The paid entry point was not executed.

Corresponding `reviewer-structural-prompts.log`, `reviewer-prompt-resume.log` and `reviewer-structural-runtime.log` retain output. `reviewer-structural-validation-exits.json` records the independent exits. Implementation's final `root-template-final-validation-exits.json` and log were inspected: **109/109 focused tests, Core check/build and diff-check all exit 0** on this freeze. These are separate implementation-run evidence; the prior 1254-test full-Core run had one old-version recovery failure, so it must not be reported as an all-pass run. This review directly reproduces the fixed ordering and does not invent a new full-Core result.

## Exact freeze and controller agreement

`task-1-final-code-hashes.json` / `root-template-code-hashes.json`: **30/30 match**. Manifest SHA-256:
`000903ba165f2dbaaee3ba3f2319bd9747975adf73e80668099d15a2effac679`.

- Handler: `b2b6cb28928fe09553fb235ef6ebad72c48c1b4fea487a5761666ea1cfc7f548`
- Source provenance: `3503bfcdbaf2cdbccc2f938c1a7e047ba25e795a6fc99afd5c30b0da1740b80f`
- Provider workflow: `25210528f3d672babc10f11227bbde912f47cf93e4a2f7f9e8cdfbcf857e8869`
- Controller runner: `3a2d80b208788662f2ed8454a367054eedc637ac61d3df215f47fa092f2a91e1`
- Controller final reviewer: `fa2d5c4a9b2ed253bd39951f92bba6afa7e65e53930fb1fb2340172cec0456df`

**238/238 protected hashes match**: original 237 strict-renderer/assets/Mini Program files plus `packages/api/src/svg-workflow.ts`. See `reviewer-structural-freeze-check.json` for exact paths, source changes and hashes.

The controller final reviewer imports the actual exported SOURCE_PROMPT_REVISION and rejects missing/unequal job snapshot revisions before any fetch, in addition to the v2 gate. It does not re-label old tasks. Existing catalogue scope/original/hash, parent/child resolution, delivered-version SVG/PNG and full evidence-artifact checks remain unchanged. The extension prompt API still emits its expected schema. The autonomous guard is now 54, retaining the same two original scenarios; runner stops before consuming the reserved two final-review calls. Historical 40 calls are not a user budget and are not altered by this guard. No claim is made about live cross-channel token/amount reconciliation.

The next live two-case run and rendered-image acceptance remain controller-owned. Complete templates and precise diagnostics improve the contract; they cannot guarantee model compliance or scientific/visual correctness. Old failed responses and their statuses must remain immutable.
