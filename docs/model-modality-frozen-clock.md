# PR #251: deterministic frozen catalog checks

The R22 execution fixture records `2026-11-09T12:00:00.000Z` (20:00 in
Asia/Shanghai). Frozen presentation comparisons now use that same explicit
instant. It is before the three AntLing models retire at
`2026-11-15T00:00:00+08:00`, and reproduces the lifecycle state captured by the
November 9–10 reports, independently of the host date or timezone.

- `test-support/execution-capability.mjs` exports the existing `FrozenDate` and
  a synchronous `withFrozenClock` scope. Bundled/VM code receives `FrozenDate`;
  ordinary Mini CommonJS dependencies run inside the scope. The previous global
  Date is restored in `finally`, and the scope never spans an `await`.
- `imageInputPresentations` and `collectSourceReview` use this clock for both
  clients. Their callers retain all exact presentation/source assertions and
  committed historical artifacts.
- `prepare-model-card-r12-fixtures` injects the same Date into each archived
  renderer when reconstructing the frozen link fixture.
- The Web R24 seven-notice and R30 dialog tests, Mini R25 seven-badge test, and
  Gateway R22 execution test use Node's per-test Date mock. It fixes both
  `Date.now()` and `new Date()` and is automatically restored after each test.
  The Gateway clock comes directly from the execution fixture.

No external fake-clock environment variable is required. Runtime retirement
logic, catalog data, generated product code, UI, frozen expected values and
size limits are unchanged. Real-date lifecycle/availability tests keep their
existing clocks. This is a test/maintenance repair, with no shared API or
runtime environment contract change and no deployment.
