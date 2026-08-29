# Leaderboard Methodology Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the methodology summary from the leaderboard and publish a standalone, reproducible methodology page with the exact four generation prompts and rubrics.

**Architecture:** Extend the existing public `benchmarkMethodology` action with a deep-cloned allowlist projection of `PB_IMAGE_LIGHT_V1`; do not duplicate prompts in Web. Add a dedicated Web route and static entry that fetches this action and renders the full method. Historical release responses remain unchanged.

**Tech Stack:** TypeScript, React 19, Vite multi-page build, Node test runner, Testing Library.

---

### Task 1: Public methodology contract

**Files:**
- Modify: `apps/paperbanana-api/src/benchmark-service.ts`
- Modify: `apps/paperbanana-api/tests/benchmark-service.test.ts`

- [ ] **Step 1: Write failing API tests**

Assert that a published `codex_single` methodology response contains an exact deep-cloned suite projection:

```ts
assert.equal(result.suite.id, 'pb-image-light-v1')
assert.equal(result.suite.cases.length, 4)
assert.equal(result.suite.cases[0].renderPrompt, PB_IMAGE_LIGHT_V1.cases[0].renderPrompt)
assert.deepEqual(result.scoring, { scoreMin: 0, scoreMax: 10, minimumReviewedSamples: 3, overallFormula: 'equal_weight_mean_v1', tieMethod: 'competition', redLinePolicy: 'confirmed_axis_cap' })
```

Also mutate returned prompt/rubric arrays and assert `PB_IMAGE_LIGHT_V1` remains unchanged; assert historical verified methodology has no `suite` or `scoring` additions.

- [ ] **Step 2: Verify red**

Run `pnpm --filter @paperbanana/paperbanana-api test` and confirm the new assertions fail because `suite` and `scoring` are absent.

- [ ] **Step 3: Implement the projection**

Import `PB_IMAGE_LIGHT_V1`, allowlist the documented suite/case keys, deep clone nested values, and add them only inside the existing Arena release gate. Return release-specific review metadata and fixed scoring metadata without changing stored releases.

- [ ] **Step 4: Verify green and commit**

Run API tests and `pnpm --filter @paperbanana/paperbanana-api check`; commit as `feat(bench): publish reproducible methodology`.

### Task 2: Standalone methodology route and page

**Files:**
- Modify: `apps/web/src/components/BenchmarkPage.jsx`
- Modify: `apps/web/src/components/BenchmarkPage.test.js`
- Modify: `apps/web/src/components/benchmark.css`
- Modify: `apps/web/src/leaderboardRoutes.js`
- Modify: `apps/web/src/leaderboardRoutes.test.js`
- Modify: `apps/web/vite.config.js`
- Modify: `apps/web/tests/leaderboard-build-entry-contract.test.mjs`
- Create: `apps/web/leaderboard/methodology/index.html`

- [ ] **Step 1: Write failing rendered and route tests**

Require `resolveLeaderboardRoute('/leaderboard/methodology')` and its trailing slash to return `{ methodology: true }`; require the overview DOM to omit `.bench-methodology`; require the new page to render all four exact prompts, negative prompts, constraint groups, seven rubrics, scoring method, hashes, limitations, and a return link.

Mock `navigator.clipboard.writeText`, click a prompt copy button, and assert the exact prompt plus an accessible success status. Reject method loading with a mocked API error and assert a retry button reissues `benchmarkMethodologyRequest`.

- [ ] **Step 2: Verify red**

Run the focused BenchmarkPage and route tests; confirm failures are caused by the missing route/page and the still-present homepage methodology section.

- [ ] **Step 3: Implement the page**

Use `benchmarkMethodologyRequest` only on the methodology route. Render focused module-level components for pipeline steps, case prompt cards, constraint lists, rubric table, scoring/review disclosure, limitations, and license. Link every leaderboard nav to `appPath('/leaderboard/methodology')`; leave ranking data fetches unchanged.

- [ ] **Step 4: Add static routing and responsive styles**

Add the methodology HTML input to Vite and existing build-contract fixtures. Keep prompt blocks wrap-safe with `overflow-wrap:anywhere`; at 390/430px use one column and prevent document overflow.

- [ ] **Step 5: Verify green and commit**

Run Web tests and build; commit as `feat(web): add leaderboard methodology page`.

### Task 3: Contract record and visual verification

**Files:**
- Modify: `SYNC.md`
- Modify: `design-qa.md`

- [ ] **Step 1: Record the shared contract**

Add a newest-first SYNC entry describing the additive `benchmarkMethodology` suite/scoring fields, history isolation, route, full prompt transparency, and no paid calls.

- [ ] **Step 2: Run integrated verification**

Run API tests/check/build, Web tests/build, and `git diff --check`. Verify the static method entry exists under root and non-root base builds.

- [ ] **Step 3: Browser QA**

Verify leaderboard homepage no longer contains the old section; open `/leaderboard/methodology`, exercise prompt copying and return navigation, inspect console, and capture desktop plus 430/390 screenshots. Update `design-qa.md` with the new evidence and `final result: passed` only if no P0/P1/P2 issues remain.

- [ ] **Step 4: Commit**

Commit documentation as `docs(sync): record public benchmark methodology`.
