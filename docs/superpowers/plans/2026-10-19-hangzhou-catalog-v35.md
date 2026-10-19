# Hangzhou model catalog v35 implementation plan

> **For agentic workers:** Execute the approved local integration in this session. No deployment, paid inference, Mini Program changes, or generation-flow optimization.

**Goal:** Bring the reviewed v35 catalog into the Hangzhou production worktree using the existing model cards and channel/vendor/model picker.

**Architecture:** Import only the weekly catalog delta whose source hash and destination preimage match the 2026-10-19 verification manifest. Regenerate Web/Core/shared consumers in this worktree; never copy the old worktree's full runtime handler or SYNC. Preserve default selections, historical IDs, current production fixes, and the existing UI components.

**Tech Stack:** TypeScript, React/Vite, Node 24, pnpm, the existing model-catalog generator and offline tests.

## Approved scope

- Together Beam 1.0; Fireworks, Qianfan, and TokenDance DeepSeek V4.1 Flash 1017 identities, with channel-specific roles.
- Twenty Ark lifecycle corrections, exact DeepSeek service mappings, schema/specification updates, and Reflection brand metadata.
- No adaptation of pending TokenDance image protocols, Fireworks dedicated deployments, or other pending providers.
- Performance work is analysis only, using the two completed BlueHeron acceptance jobs and current code.

## Implementation and verification

- [x] Verify clean `codex/hangzhou-production@d23fbab0`, source report, source after-hashes, destination before-hashes, and v34 generated consistency.
- [x] Copy matching source/configuration/test/brand/document files from the weekly manifest; exclude `SYNC.md`, `runtime/handler.ts`, and reproducible generated consumers.
- [x] Run `node scripts/sync-model-catalog.mjs --skip-miniprogram`, then the same command with `--check`. Expect 1103 entries and no drift.
- [x] Add focused integration coverage using actual v35 records in the existing workspace model cards and picker: exact connection binding, main/vision separation, additive TokenDance import, and retired-model disablement.
- [x] Run Core catalog/channel/lifecycle tests and Web catalog/workspace tests with the existing external-network guard. Run Core typecheck and Web build. Expect zero failed checks and no external model requests.
- [x] Inspect the rendered existing UI locally if a verified preview can be used without live-account or model actions.
- [x] Verify runtime changes are confined to the generated catalog region and catalog version, existing picker components and generation files are unchanged, and Mini Program hashes remain unchanged.
- [x] Write SYNC integration status and a report with checks, evidence, and performance analysis. Leave all changes local for review.

## Performance analysis boundaries

Measure explicit stage durations separately from timestamp intervals; intervals also include persistence and rendering. Do not claim provider latency, token throughput, or a speedup without corresponding evidence. Compare prompt duplication and stage dependencies, and distinguish low-risk input deduplication from changes to generation/review semantics.
