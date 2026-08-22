# PaperBanana Web Mobile Layout Centering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the existing compact mobile width while centering the entire PaperBanana Web workspace on 390px and 430px viewports.

**Architecture:** Fix the single responsive owner, `.app-shell`, instead of compensating individual cards. A source-level CSS contract test locks the centering rule, followed by rendered mobile browser verification and a Pages-only release.

**Tech Stack:** React 19, Vite 7, CSS, Node test runner, in-app Browser, GitHub Actions/Pages.

---

### Task 1: Verify the isolated baseline

**Files:**
- Inspect: `apps/web/src/styles.css`
- Inspect: `apps/web/tests/featured-ui-contract.test.mjs`

- [ ] **Step 1: Confirm linked-worktree isolation and clean state**

Run:

```bash
git rev-parse --git-dir
git rev-parse --git-common-dir
git branch --show-current
git status --short --branch
```

Expected: linked worktree on `codex/center-mobile-layout`, with only the committed design/plan history ahead of `origin/main`.

- [ ] **Step 2: Run the focused baseline test**

Run:

```bash
pnpm --filter @paperbanana/web test -- --test-name-pattern='featured studio, prominent settings, ratios, and guide'
```

Expected: the existing focused UI contract passes before adding the new regression assertion.

### Task 2: Add the regression test and minimal CSS fix

**Files:**
- Modify: `apps/web/tests/featured-ui-contract.test.mjs`
- Modify: `apps/web/src/styles.css:4000-4007`

- [ ] **Step 1: Write the failing centering assertion**

Add this test:

```js
test('mobile app shell remains horizontally centered when capped at 366px', () => {
  const styles = readSource('../src/styles.css')
  const mobileRule = styles.match(/@media\s*\(max-width:\s*520px\)\s*\{[\s\S]*?\.app-shell\s*\{([\s\S]*?)\n\s*\}/u)?.[1] ?? ''
  assert.match(mobileRule, /margin-inline:\s*auto/u)
  assert.doesNotMatch(mobileRule, /margin-(?:left|right):\s*12px/u)
})
```

- [ ] **Step 2: Run the focused test and observe RED**

Run:

```bash
pnpm --filter @paperbanana/web test -- --test-name-pattern='mobile app shell remains horizontally centered'
```

Expected: FAIL because the current rule contains fixed `margin-left/right: 12px` and no `margin-inline: auto`.

- [ ] **Step 3: Apply the minimal implementation**

Change the `≤520px` rule to:

```css
@media (max-width: 520px) {
  .app-shell {
    width: min(calc(100vw - 24px), 366px);
    max-width: min(calc(100vw - 24px), 366px);
    margin-inline: auto;
  }
}
```

- [ ] **Step 4: Run the focused test and observe GREEN**

Run:

```bash
pnpm --filter @paperbanana/web test -- --test-name-pattern='mobile app shell remains horizontally centered'
```

Expected: PASS.

- [ ] **Step 5: Commit the implementation**

```bash
git add apps/web/src/styles.css apps/web/tests/featured-ui-contract.test.mjs
git commit -m "fix(web): center mobile workspace"
```

### Task 3: Verify Web behavior locally

**Files:**
- Verify: `apps/web/src/styles.css`
- Verify: `apps/web/tests/featured-ui-contract.test.mjs`

- [ ] **Step 1: Run full Web tests and build**

Run:

```bash
pnpm --filter @paperbanana/web test
pnpm --filter @paperbanana/web build
git diff --check origin/main...HEAD
```

Expected: all tests pass, Vite production build exits 0, and diff check is clean.

- [ ] **Step 2: Start the local Web server**

Run:

```bash
pnpm --filter @paperbanana/web dev --host 127.0.0.1
```

Expected: Vite reports a local URL without errors.

- [ ] **Step 3: Validate rendered mobile centering**

Using the in-app Browser, load the local URL at 390×844 and 430×932. For each viewport, evaluate `.app-shell.getBoundingClientRect()` and verify `abs(left - (viewportWidth - right)) <= 1`. Also verify meaningful content, no framework overlay, no relevant console error/warning, screenshot evidence, and one tab-navigation interaction.

- [ ] **Step 4: Stop the local server**

Stop the exact Vite process started in Step 2 and verify the port no longer listens.

### Task 4: Land, deploy, and production-verify

**Files:**
- No additional source changes expected.

- [ ] **Step 1: Push and create the PR**

```bash
git push -u origin codex/center-mobile-layout
gh pr create --base main --head codex/center-mobile-layout --title "fix(web): center mobile workspace" --body-file /tmp/paperbanana-mobile-center-pr.md
```

The PR body must summarize the single CSS fix and list focused/full Web tests, build, and 390/430px browser evidence.

- [ ] **Step 2: Wait for required PR checks and merge**

Use `gh pr checks --watch` and merge only after every required check succeeds. Use a normal merge commit; do not force-push or rewrite `main`.

- [ ] **Step 3: Wait for Pages deployment**

Identify the Pages workflow for the merge SHA with `gh run list`, then use `gh run watch <run-id> --exit-status`.

Expected: Pages deployment completes successfully. Core deployment is not triggered for this CSS-only change.

- [ ] **Step 4: Production mobile verification**

Using the in-app Browser, load `https://www.paperbanana.asia/` at 390×844 and 430×932. Repeat the exact geometry, page identity, nonblank, overlay, console, screenshot, and tab-navigation checks from local QA.

- [ ] **Step 5: Record final state**

Report the implementation commit, PR/merge SHA, Pages run URL, production geometry values, and any remaining browser/device risk. Do not claim success without fresh command and browser evidence.
