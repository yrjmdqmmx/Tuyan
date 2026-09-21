# Figure Studio Implementation Plan

> **For agentic workers:** Use executing-plans with bounded subagents and independent specification and quality review. Preserve unrelated work and the existing workbench.

**Goal:** Deliver the first independently routed editable-figure workflow and verify real Inkscape export behavior.

**Architecture:** An engine-independent figure document is the single source of truth. React SVG editing and model-generated commands share validation and revisions; journal baselines stay independent of working overrides. Rendering is deterministic, and export capability and evidence are reported separately.

**Tech Stack:** React 19, Vite 7, shared ES modules, existing Node Core/model transports, Inkscape 1.4.4.

---

## Task 1 — Document, commands, renderer, rules

- [x] Create `packages/figure-core` with `createDocument`, `validateDocument`, `applyCommands`, `renderSvg`, `evaluateRules`, `PROFILES`, `createExampleDocument`, `documentFromPlan` exports.
- [x] Test arbitrary text escaping, asset restrictions, unique IDs, arrow endpoints, immutable patch behavior, revision conflicts, panel label exceptions and disabled overrides against independent baseline.
- [x] Use `node --test packages/figure-core/tests/*.test.js`; all cases must pass before integration acceptance.

## Task 2 — Independent editor page

- [x] Create `apps/web/src/figure-studio` with source persistence, command history, SVG canvas, inspector, material/plan confirmation, journal rules and export controls.
- [x] Add `/figure-studio/` static entry and lazy route in main.jsx. Add peer navigation link without moving workbench controls.
- [x] Editor actions: select, move, resize, text/font/color/line edits, add/remove, panel arrangements, undo/redo. Mobile read-only view and downloads.
- [x] Save a source bundle and reopen it with exact content; bound file parsing and reject invalid documents. Indicate local storage scope; never store model keys.

## Task 3 — Model and export adapters

- [x] Add bounded authenticated planning and object-patch generation using existing model route/credential validation. No automatic paid retries and no silent local substitute for model output.
- [x] Add controlled Inkscape conversion accepting only validated figure documents, not arbitrary SVG/code/URLs. Limit process runtime, bytes and concurrency; clean private temporary files.
- [x] Test unavailable tool, conversion failure, malformed plan/patch and stale revision. Preserve existing job behavior and record shared changes in SYNC.md.

## Task 4 — Real acceptance and review

- [x] Verify Inkscape CLI version, generate representative source/SVG/PDF/EPS, inspect actual text and object preservation, and perform native UI edit/save where possible.
- [x] Run Web tests/build and relevant Core/API checks. Exercise the independent route with browser automation: identity, editing, history, persistence, exports, rule override, mobile read-only, old workbench navigation. Inspect console evidence: one hot-reload createRoot warning occurred, with no new error after a full reload at 13:01:29. The local preview had no backend; online integration remains a separate gate.
- [x] Review specification coverage before code quality. Fix findings before calling the milestone complete. Record exact remaining Illustrator/provider/deployment gates without claiming completion.

## Local milestone status · 2026-09-21

The implementation and bounded local acceptance above are complete. See [local acceptance and exact compatibility limits](../../figure-studio/2026-09-21-local-acceptance.md). Core 37, Web 479, API full 661 and final Figure Studio scoped 16 passed; builds passed. The native SVG edit/save/reopen check passed. PDF/EPS import permits edits but merges some text objects and loses groups; edits were saved as SVG only. PDF scientific-symbol extraction passed; EPS extraction failed despite similar rendered appearance.

- [ ] Exercise the authenticated browser-to-Gateway-to-Core path in a connected environment; local console evidence is recorded with its hot-reload warning and reload boundary.
- [ ] Prepare and separately verify production deployment and optional Inkscape/font runtime; no production release occurred in this milestone.
- [ ] Run separately authorized real provider acceptance; this milestone used mocked model calls only.
- [ ] Verify Illustrator and PDF/EPS same-format edit/save/reopen; external edited-file re-import is a later phase.

These remaining checks are not represented as passed by the completed local implementation tasks.
