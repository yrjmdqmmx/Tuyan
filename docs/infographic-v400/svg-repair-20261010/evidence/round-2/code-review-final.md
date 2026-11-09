# Independent renderer-contract follow-up review

Initial inspected freeze: 23 files in `task-1-final-code-hashes.json`, all hashes independently matched. Checker `903fd892e64ea18a85e9f15a99d281a85afcc9794c8951d93b730e79b8638462`; renderer contract `202cd586c186179ee715582eb2fdf7e82bcf421c3bb2a2e6517d01974e864320`; handler `e264444c0badc2130de5c5920563b9cdd5912477464ff9b5ffb9dd2c99f59d03`. Final-review script was separately inspected at SHA-256 `f41ae2a3c56822b728464a2a64a9df7608b2f3d9e8e25385888edab6d8418353` (outside the 23 production/test freeze).

## Initial finding — P2, preserve failed composite-review critique and current child context

Location: `apps/paperbanana-api/runtime/handler.ts:6316-6324`; downstream consumer `docs/infographic-v400/svg-repair-20261010/final-review.mjs:39-41`.

Composite overall review validates `parseSvgDecision` and the new `validateRendererAudit` before creating history or recording the critic stage. If renderer provenance/schema is invalid, catch changes only status/note. The exact critique, concrete diagnosis, parser error and full child review context are lost. This also makes independent final acceptance fail at “Missing composition review evidence”, even though the current vector/raster and child artifacts exist.

Independently reproduced with two ordinary workflow children, all model calls mocked, real local compilation/rasterization. Child audits pass. Final overall response has correct version/hash and valid visual/code schema with a unique diagnostic, but deliberately quotes `NOT IN ORIGINAL` in rendererAudit. Actual result before fix: job `succeeded`, review `review_failed`, three review calls; `JSON.stringify(job)` does not contain the diagnostic; no overall history or critic stage exists. Only the two successful child critics remain. This is correct fail-closed status but incomplete evidence/recovery behavior.

Reproduction is saved as `reviewer-composite-raw-critique.mjs`; run from `apps/paperbanana-api`:

```sh
node --import tsx ../../.superpowers/sdd/2026-10-10-svg-topology-repair/reviewer-composite-raw-critique.mjs
```

The script now asserts the desired preservation behavior, so it fails before the correction and can independently validate the fix. All provider responses are mocked; no generated artifacts or shared evidence are written by this script.

Required correction: create version/hash-bound history and save raw overall critique plus full current child/context evidence before validating. On invalid audit preserve concrete validation error and non-pass status. The independent acceptance runner must consume that current context even when the previous reviewer response was malformed, without using the previous opinion as new evidence.

## Checks with no additional identified blocker

- Original method/caption/avoid constraints outrank advisory planner/reference styling. Renderer limits explicitly do not cancel original user requirements. Unsupported, unmet or uncertain reported requirements block an ordinary model pass. Capability limits and applied parameters are supplied before fixed-route planning/styling and to actual review.
- Named entries are represented with labels and checked via originalRequiredNodes; named starts cannot become anonymous without separately supported initialEvidence. Unknown node IDs and display-label endpoints are not silently repaired. Initial-marker meaning and completeness of natural-language requirement enumeration still require model judgment; exact quotes are not a semantic proof. This is stated in the report rather than misrepresented as deterministic truth.
- Topology protocol failures do retain raw critique/history and a critic stage. Missing audit and invalid original provenance fail closed. Topology rendererAudit binds actual review version/SVG/PNG hashes, and a layout revision stays unreviewed. Program audit records actual SVG/PNG hashes. Composition model context excludes rendererAudit whose SVG hash differs from the delivered child.
- Program contracts preserve original numeric data and existing renderer mapping. Actual applied plotStyle is reported rather than presenting unsupported advisory prose as an executed change. Fixed-contract injection is guarded away from ordinary unrelated/native SVG routes.
- The final-review script reads the delivered SVG and actually rasterizes it; checks saved SVG/PNG hashes; sends actual PNG plus complete source; calls current parseSvgDecision, validateTopologyAudit and validateRendererAudit; requires per-panel audits; strips prior model conclusions from child review objects. It does not edit SVG or overwrite historical pipeline review status. Its latest prompt requires inspection for actual clipping/crowding/ambiguity rather than presupposing no clipping. The P2 evidence-read dependency above is the remaining identified issue.

## Independent tests and boundaries

- Selected unit tests: named multilingual entry/initial evidence/strict IDs and renderer requirement provenance: **2/2**, exit 0.
- Selected runtime tests: contract in planning/style/observer/review, explicit unsupported requirement overriding a pass/missing audit, and fixed bar immutability/advisory behavior: **3/3**, exit 0.
- Independent composite failure reproduction: job remains review_failed but raw evidence missing before fix, as recorded above.
- These selected tests do not execute the mixed-composition evidence-writing test. No full suites, paid calls, credentials, production edits or shared matrix rewrites were performed by this reviewer. Only independent reviewer test/report files were created.

## Final correction recheck

**Current verdict: P2 closed; no remaining blocking findings identified in this renderer-contract follow-up.** Original historical findings above are retained for traceability. This verdict covers the frozen implementation and offline evidence protocol, not real-provider visual acceptance or deployment.

Final `task-1-final-code-hashes.json` contains **23/23 independently matching files**; manifest SHA-256 `2a63cd312d18815307fe1ede5edc18c2a8d631cf9d9492d60a137bac07c092c4`. Handler is now `1214ee0f20ee0ede5acee3cfd5487e319142205b93b1c8c52c32b1904741aa6c`; runtime test `42b33fe3a5a6596de712b93a3811036636818673b605d1eb068c3622b2aafb16`. Checker/renderer-contract hashes remain as recorded above. All **237/237** protected Mini Program, strict renderer and SVG assets paths independently match baseline.

Correction at `runtime/handler.ts:6300-6334` initializes version/hash-bound failed history before review, retains the returned raw critique before schema validation, saves complete current child/context evidence, and records a precise redacted validation error without claiming success. An intermediate independent rerun correctly failed because the ordinary 12,000-character stage limit truncated the JSON. The final code fixes that with a dedicated complete-text path: at most **256 KiB UTF-8** inline; larger JSON uses the existing object store and a short pointer carrying MIME, byte length, SHA-256 and version/SVG/PNG/submitted-image/round headers. `recordStage` independently rejects oversized complete inline text; ordinary stages retain their original limit. Full returned critique in history follows the existing review-history mechanism; large combined source/context is not embedded unboundedly in the stage.

Independent saved reproduction ran twice on the final code, both **exit 0**:

- Default: full inline JSON stage **18,785 bytes**, valid JSON containing exact raw assessment, current hashes and two child originals.
- `REVIEWER_LARGE_CRITIQUE=1`: large Chinese UTF-8 assessment exercises artifact mode; stage **619 bytes**. Actual object MIME, byte length, SHA-256 and all five duplicated headers were checked before parsing the complete JSON.

Both retained raw assessment and history, remained `review_failed`, preserved the exact delivered SVG and both child SVG hashes, and used exactly three mocked review calls. The exact opinion-free evidence projection used by the independent final-review consumer retained current child source/topology/data but omitted the prior diagnostic marker. The new implementer regression was also independently rerun by name: **1/1, exit 0**, covering inline and artifact variants. These checks supplement the earlier 2 + 3 selected tests; no full suite was rerun by this reviewer.

The latest `final-review.mjs` was read-only reviewed and syntax-checked (**exit 0**), SHA-256 `cdae16bfe417af158af4dc362b1f4f6388a91ef660f712caf2b5ad1a90449e85`. Its artifact reader validates MIME/length/hash and all five headers, then current delivered SVG/PNG/version. The live runner saves every job object by basename (`runner.mjs:81`), matching that reader; runner hash `2e8617dd06e3d534eba63d6e9e0d8ca148a3637035e022fe89736133662e1c5a`. Both scripts remain outside the 23-file product/test freeze. The actual paid entrypoint was never invoked by this reviewer.

Implementer report was re-read and distinguishes final offline validation from controller real calls. It also discloses the earlier unrelated nine-file mock-composition evidence overwrite, retained incident copy, unavailable historical bytes and new temporary-directory test default. This review does not certify restoration of those historical mock files or reuse them as original acceptance evidence.
