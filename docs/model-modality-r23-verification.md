# R23 Phase H — verification

**Items 1–7: PASS.** Verified HEAD `7cb520a9ca4d04c966536e9867ea91e45089a492` on `codex/model-modality-audit`; main baseline `8c456709`, pre-fix baseline `42ee9ffd`. All comparisons are offline. No product behavior, pre-existing tests or ledger entries changed. No Git write commands, fetches, paid calls, deployments, image builds or other-worktree changes.

The companion [JSON](model-modality-r23-verification.json) records exact commands, counts, test names, output excerpts and log hashes. New historical assertions: [verify-h.test.mjs](../.audit-input/r23/verify-h.test.mjs). Reproduce the inventory with `node --test .audit-input/r23/verify-h.test.mjs`; reproduce builds/checks with `node .audit-input/r23/validate-h.mjs`. Full suites are listed below.

## 1. Vendor evidence — PASS

Scanned all 1,064 cards on each client. Counts are per rendered card/field/source row, not globally unique URLs. “Added” compares canonical URLs with `42ee9ffd`, so retitling an existing URL is not an added link.

| Client | Cards with 源自原厂 | Vendor fields | Vendor link rows now | Added link rows | Distinct added URLs | Cards gaining links | Missing before → now |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| web | 65 | 166 | 82 | 16 | 6 | 14 | 14 → 0 |
| mini | 65 | 166 | 82 | 39 | 7 | 37 | 37 → 0 |

Both clients have **0 missing vendor fields, 0 duplicate canonical URLs and 0 duplicate labels**. Web tests actually open all evidence dialogs and inspect vendor `href`s. Mini tests invoke every compiled copy dialog and its clipboard callback through the WXML `copySource` binding. **Mini retains its existing tap-to-copy interaction; it does not open external browser anchors.** This is the platform-specific meaning of an actionable source link here, not a new behavior claim.

The 67 verified TokenDance channel pages remain first; seven historical IDs keep their vendor fallback. Descriptive labels and roles are checked across every source row by the title tests in item 4.

### qwen3.6-plus / TokenDance: exact source list

Web and Mini have the same before/after list:

| Snapshot | Ordered label | URL |
| --- | --- | --- |
| 42ee9ffd | 官方文档 · TokenDance · qwen3.6 plus | https://tokendance.space/models/qwen3.6-plus |
| HEAD | 官方文档 · TokenDance · Qwen3.6 Plus | https://tokendance.space/models/qwen3.6-plus |
| HEAD | 原厂规格 · 百炼 · 模型列表 | https://help.aliyun.com/zh/model-studio/models |

- **R23 every vendor field on all 1064 Web cards has its vendor href in the dialog; every visible source is human** — [apps/web/tests/model-card-r23.test.mjs](../apps/web/tests/model-card-r23.test.mjs).
  Command (cwd `apps/web`): `NODE_OPTIONS=--no-experimental-webstorage node --import tsx --import ./tests/dom-setup.mjs --test --test-concurrency=2`.

```text
✔ R23 every vendor field on all 1064 Web cards has its vendor href in the dialog; every visible source is human (7656.400917ms)
ℹ {"cards":1064,"vendorFields":166,"offendingCards":0,"visibleApiLinks":0}
```

- **R23 all 1064 compiled Mini cards link vendor fields and expose no machine source in rows or copy dialogs** — [apps/miniprogram/tests/model-card-r23.test.cjs](../apps/miniprogram/tests/model-card-r23.test.cjs).
  Command (cwd `apps/miniprogram`): `npm test`.

```text
✔ R23 all 1064 compiled Mini cards link vendor fields and expose no machine source in rows or copy dialogs (920.878417ms)
ℹ {"cards":1064,"vendorFields":166,"offendingCards":0,"visibleApiLinks":0}
```

- **R22B all 74 TokenDance cards use rendered evidence; seven histories retain main links and missing evidence has no link** — [apps/web/tests/model-card-r22b.test.mjs](../apps/web/tests/model-card-r22b.test.mjs).
  Command (cwd `apps/web`): `NODE_OPTIONS=--no-experimental-webstorage node --import tsx --import ./tests/dom-setup.mjs --test --test-concurrency=2`.

```text
✔ R22B all 74 TokenDance cards use rendered evidence; seven histories retain main links and missing evidence has no link (362.815542ms)
```

- **R22B Mini uses only verified TokenDance pages and preserves seven main fallbacks** — [apps/miniprogram/tests/model-card-r22b.test.cjs](../apps/miniprogram/tests/model-card-r22b.test.cjs).
  Command (cwd `apps/miniprogram`): `npm test`.

```text
✔ R22B Mini uses only verified TokenDance pages and preserves seven main fallbacks (169.315458ms)
```

## 2. Mini required-channel validation — PASS

The `missingProviders` declaration and its rejection statement are **byte-identical to main `8c456709`**: 219 UTF-8 bytes; SHA-256 `7773843195fda703807f08c676ad222eea97c6e12baa3fa2ea0ccfa08f031ac7`. This compares the validation block, not the entire file (which also has display metadata changes).

```text
  const missingProviders = ['gemini', 'openai', 'bailian', 'ark', 'openrouter'].filter((id) => !providerSource[id])
  if (missingProviders.length) throw new Error('服务端模型目录必须包含五个 API 渠道。')
```

History commands: `git show e4de4f5d -- apps/miniprogram/miniprogram/utils/model-registry.ts apps/miniprogram/tests/model-modality-phase2.test.cjs` and `git show 1dcd8b13 -- apps/miniprogram/miniprogram/utils/model-registry.ts apps/miniprogram/tests/model-modality-phase2.test.cjs`.

`e4de4f5d` changed the filter from `!providerSource[id]` to `!providerSource[id] && !stringValue(asRecord(source.unavailableProviders)[id])`. In the same commit, the new phase-2 test explicitly asserted that its offline Core catalog lacked OpenRouter, then normalized that incomplete catalog as long as an unavailable-provider explanation existed. This paired diff explains the immediate motivation: accommodate partial/offline catalogs in the new full-object projection test. The commit message does not record a separate user requirement to relax the five-channel contract; that motivation is an inference from the code and test added together.

The resulting behavior was observable: with OpenRouter missing but explained, `model-registry-store.ts` stored a non-null partial registry and displayed the unavailability message as a notice. `model-picker.ts` derived channel counts from that registry and filtered out empty channels, so **OpenRouter disappeared from the selectable channel list while the other channels remained usable**, instead of rejecting the catalog with `服务端模型目录必须包含五个 API 渠道。`. This is a code-derived scenario, not a claim about a production incident.

`1dcd8b13` restored main’s strict rejection. The phase-2 fixture now supplies the frozen offline OpenRouter provider before normalization, preserves all 1,061 original live projections, and separately rejects each of the five missing required channels even if `unavailableProviders` explains it. On rejection, the registry store sets `registry: null` and exposes the contract error, as on main.

- **Mini rejects each missing required provider even when unavailableProviders explains it** — [apps/miniprogram/tests/model-modality-phase2.test.cjs](../apps/miniprogram/tests/model-modality-phase2.test.cjs).
  Command (cwd `apps/miniprogram`): `npm test`.

```text
✔ Mini rejects each missing required provider even when unavailableProviders explains it (62.181459ms)
```

- **Phase H required-provider rejection block is byte-identical to main and all picker names match main** — [.audit-input/r23/verify-h.test.mjs](../.audit-input/r23/verify-h.test.mjs).
  Command (cwd `.`): `node --test .audit-input/r23/verify-h.test.mjs`.

```text
✔ Phase H required-provider rejection block is byte-identical to main and all picker names match main (25.94625ms)
```

## 3. Hash independence — PASS

Both runs set the requested read-only `git -c core.abbrev=N` and pass `GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.abbrev GIT_CONFIG_VALUE_0=N` to the Node process, so every Git subprocess spawned by the report receives the same setting. No persistent Git config was written.

Command: `GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.abbrev GIT_CONFIG_VALUE_0=7 git -c core.abbrev=7 -c 'alias.r23-verify=!node scripts/report-changed-tests.mjs --check' r23-verify`

```text
{"files":23,"assertionAndFixtureInputChanges":135,"consumedJsonFixtures":2,"semanticFixtureChanges":616,"justified":750,"unjustifiedRestored":1,"flagged":0}
```

Command: `GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.abbrev GIT_CONFIG_VALUE_0=12 git -c core.abbrev=12 -c 'alias.r23-verify=!node scripts/report-changed-tests.mjs --check' r23-verify`

```text
{"files":23,"assertionAndFixtureInputChanges":135,"consumedJsonFixtures":2,"semanticFixtureChanges":616,"justified":750,"unjustifiedRestored":1,"flagged":0}
```

- **changed-test content hashes and ledger checks are stable at core.abbrev 7 and 12** — [scripts/report-changed-tests.test.mjs](../scripts/report-changed-tests.test.mjs).
  Command (cwd `.`): `node --test scripts/*.test.mjs`.

```text
✔ changed-test content hashes and ledger checks are stable at core.abbrev 7 and 12 (2776.049458ms)
```

## 4. Titles, picker names and historical hints — PASS

All **1,064 Web cards / 2,494 evidence rows / 7 lifecycle dialogs** and **1,064 Mini cards / 1,103 copy dialogs** have **0 heuristic findings**. The four requested examples and known dotted-version/general-page cases pass. Every source row retains a role prefix and has a unique canonical URL and label. Web’s rendered picker-name test preserves all 1,064 main names; the Phase H test independently recomputes both Web and compiled Mini names from main and finds **0 changes**.

Against `42ee9ffd`, existing URLs have **2195 Web + 966 Mini + 3 lifecycle** changed title instances, deduplicated to **1047 distinct before/after pairs** in Appendix A. New rows (16 Web / 39 Mini) and the one removed Web machine link are counted separately, because they have no before/after title pair. The existing Phase F/F3 report uses the later `1dcd8b13` baseline and therefore reports 2,198 / 973 / 3 title changes; those are different baselines, not drift.

Exactly these seven TokenDance IDs show **渠道页无此型号（核实日期 2026-11-09）** in Web tooltips/dialogs and Mini icon dialogs; the remaining 67 TokenDance IDs keep their previous hints:

- `deepseek-v4-flash-vision-exp`
- `deepseek-v4-flash`
- `deepseek-v3.2`
- `deepseek-chat-v3-0324`
- `qwen3.6-max-preview`
- `qwen3-30b-a3b-instruct-2507`
- `qwen3-max`

- **R23F all 1064 rendered Web cards and evidence/notice dialogs pass the title scan without changing URLs or names** — [apps/web/tests/model-card-source-titles-r23.test.mjs](../apps/web/tests/model-card-source-titles-r23.test.mjs).
  Command (cwd `apps/web`): `NODE_OPTIONS=--no-experimental-webstorage node --import tsx --import ./tests/dom-setup.mjs --test --test-concurrency=2`.

```text
✔ R23F all 1064 rendered Web cards and evidence/notice dialogs pass the title scan without changing URLs or names (8329.184166ms)
ℹ {"cards":1064,"renderedRows":2494,"notices":7,"suspicious":0}
```

- **R23F all 1064 compiled Mini cards and copy dialogs pass the title scan; generated titles match the shared helper** — [apps/miniprogram/tests/model-card-source-titles-r23.test.cjs](../apps/miniprogram/tests/model-card-source-titles-r23.test.cjs).
  Command (cwd `apps/miniprogram`): `npm test`.

```text
✔ R23F all 1064 compiled Mini cards and copy dialogs pass the title scan; generated titles match the shared helper (428.870166ms)
ℹ {"cards":1064,"dialogs":1103,"suspicious":0}
```

- **R23F source titles preserve real model names, API subjects and version/date separators** — [apps/web/tests/model-card-source-titles-r23.test.mjs](../apps/web/tests/model-card-source-titles-r23.test.mjs).
  Command (cwd `apps/web`): `NODE_OPTIONS=--no-experimental-webstorage node --import tsx --import ./tests/dom-setup.mjs --test --test-concurrency=2`.

```text
✔ R23F source titles preserve real model names, API subjects and version/date separators (6.987375ms)
```

- **R23F compiled Mini preserves the four title examples and version/date separators** — [apps/miniprogram/tests/model-card-source-titles-r23.test.cjs](../apps/miniprogram/tests/model-card-source-titles-r23.test.cjs).
  Command (cwd `apps/miniprogram`): `npm test`.

```text
✔ R23F compiled Mini preserves the four title examples and version/date separators (218.25ms)
```

- **R21 static picker titles preserve all 1,064 display names from 8c456709** — [apps/web/tests/model-picker-names.test.mjs](../apps/web/tests/model-picker-names.test.mjs).
  Command (cwd `apps/web`): `NODE_OPTIONS=--no-experimental-webstorage node --import tsx --import ./tests/dom-setup.mjs --test --test-concurrency=2`.

```text
✔ R21 static picker titles preserve all 1,064 display names from 8c456709 (583.121833ms)
```

- **R23F only the seven missing TokenDance pages get the historical tooltip and dialog hint** — [apps/web/tests/model-card-source-titles-r23.test.mjs](../apps/web/tests/model-card-source-titles-r23.test.mjs).
  Command (cwd `apps/web`): `NODE_OPTIONS=--no-experimental-webstorage node --import tsx --import ./tests/dom-setup.mjs --test --test-concurrency=2`.

```text
✔ R23F only the seven missing TokenDance pages get the historical tooltip and dialog hint (192.793792ms)
```

- **R23F Mini icon taps show the missing-page hint for exactly seven historical TokenDance ids** — [apps/miniprogram/tests/model-card-source-titles-r23.test.cjs](../apps/miniprogram/tests/model-card-source-titles-r23.test.cjs).
  Command (cwd `apps/miniprogram`): `npm test`.

```text
✔ R23F Mini icon taps show the missing-page hint for exactly seven historical TokenDance ids (12.933833ms)
```

## 5. API/OpenAPI/JSON links — PASS

The recomputed scan covers all 1,064 cards per client, including raw field/source evidence and displayed rows at `42ee9ffd` and HEAD. It found **408 distinct candidate URLs** (API hosts/routes, OpenAPI/Swagger, JSON/YAML). **254 are machine URLs, all hidden**; the other **154 human pages are visible on at least one client**. Appendix B lists every distinct candidate URL, whether hidden, and per-client before/after counts. Raw evidence is retained; a URL appearing only in raw evidence was never necessarily visible. Normalized Replicate schema links point to human model pages instead.

The sole previously visible machine URL was `https://api.stability.ai/v2alpha/openapi` on Web `stability/sd3.5-flash`: **1 Web card → 0**, Mini **0 → 0**. Both clients retain the human Stability API-reference page. No current source list or dialog exposes a machine endpoint.

Human pages containing `/api/` are retained: **96 distinct visible URLs**. Concrete test examples include `https://developers.openai.com/api/docs/models/gpt-6.1-sol`, `https://fal.ai/models/owner/model/api`, and `https://api.volcengine.com/api-docs/view?action=ImageGenerations`. The tests use `test-support/card-sources-r23.mjs` to distinguish human API documentation from machine schemas/endpoints.

- **R23 machine endpoints are filtered while human API documentation remains visible** — [apps/web/tests/model-card-r23.test.mjs](../apps/web/tests/model-card-r23.test.mjs).
  Command (cwd `apps/web`): `NODE_OPTIONS=--no-experimental-webstorage node --import tsx --import ./tests/dom-setup.mjs --test --test-concurrency=2`.

```text
✔ R23 machine endpoints are filtered while human API documentation remains visible (25.169959ms)
```

The two all-card Web/Mini tests named in item 1 also assert zero visible machine URLs in the rendered/copy-dialog paths.

## 6. Frozen execution fixture — PASS

`test-support/fixtures/execution-capability-8c456709.json.gz`: **578,207 bytes**. The original uncompressed JSON is absent; gzip mtime is **0** and headers contain no filename. Recompressing at level 9 produces byte-identical gzip in this run (Node v25.6.1, zlib 1.3.1-e00f703). `freeze-execution-capability.mjs --check` independently regenerates every main field/decision and checks the decompressed bytes.

Exact Git blob-size commands (not `git count-objects`):

```sh
git cat-file -s 42ee9ffd:test-support/fixtures/execution-capability-8c456709.json
git cat-file -s HEAD:test-support/fixtures/execution-capability-8c456709.json.gz
```

```text
13538408
578207
```

Fixture tree-size delta: **-12,960,201 bytes** (saving **12,960,201 bytes**). This measures the fixture blobs at those revisions; it does not claim that historical Git objects disappeared.

Core, Gateway, Web and Mini tests all import `readExecutionFixture()` from `test-support/execution-capability.mjs`; that loader reads the `.json.gz`, calls `gunzipSync`, then parses JSON. All four execution-capability-r22 locks pass. The Core and Gateway tests below use offline/in-memory transports and do not require localhost.

```text
{"providers":32,"coreModels":1064,"staticModels":1064,"check":true,"fixture":"test-support/fixtures/execution-capability-8c456709.json.gz"}
```

- **R23 execution oracle is deterministic gzip and retains all 1064 baseline models** — [scripts/frozen-history.test.mjs](../scripts/frozen-history.test.mjs).
  Command (cwd `.`): `node --test scripts/*.test.mjs`.

```text
✔ R23 execution oracle is deterministic gzip and retains all 1064 baseline models (130.486958ms)
```

- **R22 Core full registry, catalog normalization and every reference-mode decision equal frozen main** — [apps/paperbanana-api/tests/execution-capability-r22.test.ts](../apps/paperbanana-api/tests/execution-capability-r22.test.ts).
  Command (cwd `apps/paperbanana-api`): `node --import tsx --test tests/execution-capability-r22.test.ts tests/model-card-r22b.test.ts tests/model-modality-phase2.test.ts`.

```text
✔ R22 Core full registry, catalog normalization and every reference-mode decision equal frozen main (4080.552791ms)
```

- **R22 Gateway preserves frozen main capability on the registry wire and in its audit decorator** — [apps/auth-gateway/tests/execution-capability-r22.test.js](../apps/auth-gateway/tests/execution-capability-r22.test.js).
  Command (cwd `.`): `node --test apps/auth-gateway/tests/execution-capability-r22.test.js apps/auth-gateway/tests/model-modality-phase2.test.js`.

```text
✔ R22 Gateway preserves frozen main capability on the registry wire and in its audit decorator (3573.305916ms)
```

- **R22 Web static and live capabilities and reference-image consumers equal frozen main** — [apps/web/tests/execution-capability-r22.test.mjs](../apps/web/tests/execution-capability-r22.test.mjs).
  Command (cwd `apps/web`): `NODE_OPTIONS=--no-experimental-webstorage node --import tsx --import ./tests/dom-setup.mjs --test --test-concurrency=2`.

```text
✔ R22 Web static and live capabilities and reference-image consumers equal frozen main (4298.079334ms)
```

- **R22 Mini static/live normalizers, upload policy, settings and index reference decisions equal frozen main** — [apps/miniprogram/tests/execution-capability-r22.test.cjs](../apps/miniprogram/tests/execution-capability-r22.test.cjs).
  Command (cwd `apps/miniprogram`): `npm test`.

```text
✔ R22 Mini static/live normalizers, upload policy, settings and index reference decisions equal frozen main (9196.828ms)
```

## 7. Image-input decision document — PASS

Recomputed all 15 rows of [the decision document](model-modality-image-input-decision.md) and its JSON from main `8c456709` and this HEAD. Exact input facts (JSON representation), display labels, image-icon states and direct-edit flags match; the corresponding Markdown table cells also match. **15/15: main image supported → HEAD image unknown; direct-edit stays true.** No fetch or founder decision was made.

| Identity | Main | HEAD | Direct edit (both) |
| --- | --- | --- | --- |
| fal/blackforestlabs/flux-3/klein/base/text-to-image | 文本、图像; supported | 文本; unknown | true |
| fal/blackforestlabs/flux-3/klein/text-to-image | 文本、图像; supported | 文本; unknown | true |
| fal/blackforestlabs/flux-3/text-to-image | 文本、图像; supported | 文本; unknown | true |
| fal/bytedance/seedream/v5/flash/text-to-image | 文本、图像; supported | 文本; unknown | true |
| fal/bytedance/seedream/v5/pro/text-to-image | 文本、图像; supported | 文本; unknown | true |
| fal/fal-ai/bytedance/seedream/v4.5/text-to-image | 文本、图像; supported | 文本; unknown | true |
| fal/fal-ai/bytedance/seedream/v4/text-to-image | 文本、图像; supported | 文本; unknown | true |
| fal/fal-ai/flux-2-pro | 文本、图像; supported | 文本; unknown | true |
| fal/krea/v3/text-to-image | 文本、图像; supported | 文本; unknown | true |
| fal/meta/muse-image/text-to-image | 文本、图像; supported | 文本; unknown | true |
| fal/openai/gpt-image-2.5/flare/text-to-image | 文本、图像; supported | 文本; unknown | true |
| fal/openai/gpt-image-2.5/sunburst/text-to-image | 文本、图像; supported | 文本; unknown | true |
| fal/xai/grok-imagine-image | 文本、图像; supported | 文本; unknown | true |
| fal/xai/grok-imagine-image/quality/text-to-image | 文本、图像; supported | 文本; unknown | true |
| ideogram/ideogram-v4 | 图像; supported | 文本; unknown | true |

- **Phase H all 15 image-input decision rows match recomputed main and HEAD display state** — [.audit-input/r23/verify-h.test.mjs](../.audit-input/r23/verify-h.test.mjs).
  Command (cwd `.`): `node --test .audit-input/r23/verify-h.test.mjs`.

```text
✔ Phase H all 15 image-input decision rows match recomputed main and HEAD display state (7.859083ms)
```

## Screenshot script — prepared, not run

[shots-m3.mjs](../.audit-input/r23/shots-m3.mjs) uses the requested absolute Playwright import, Chrome channel and headless mode. Its top comment contains exact local fixture Core/Gateway and Web startup commands for `127.0.0.1:8792` / `127.0.0.1:5174`, derived from the existing preview runtime and package/Vite setup. Output directory is `argv[2]`.

The [planned manifest](../.audit-input/r23/shots-m3.manifest.json) specifies **30 images**: the focal TokenDance qwen3.6-plus dialog plus 14 sample cards across **8 channels**, each at widths **1280 and 390**. Every selected card has vendor evidence in both the static inventory and offline Core fixture. The script uses actual catalog/source-dialog selectors, generous waits, dialog scrolling, vendor-link visibility assertions, dialog screenshots with viewport fallback (`fullPage: false`), and writes an output `manifest.json`. It never follows vendor URLs. `node --check .audit-input/r23/shots-m3.mjs` passed. **No browser, localhost service or screenshot script was run.**

- **Phase H screenshot manifest selects 15 Core fixture cards with vendor evidence and 30 unique filenames** — [.audit-input/r23/verify-h.test.mjs](../.audit-input/r23/verify-h.test.mjs).
  Command (cwd `.`): `node --test .audit-input/r23/verify-h.test.mjs`.

```text
✔ Phase H screenshot manifest selects 15 Core fixture cards with vendor evidence and 30 unique filenames (2791.960209ms)
```

## Validation

| Suite | Passed / tests | Failed | Skipped |
| --- | ---: | ---: | ---: |
| web | 1483 / 1483 | 0 | 0 |
| mini | 172 / 172 | 0 | 0 |
| scripts | 58 / 58 | 0 | 0 |
| api | 33 / 33 | 0 | 0 |
| coreTargeted | 4 / 4 | 0 | 0 |
| gatewayTargeted | 2 / 2 | 0 | 0 |
| phaseHInventory | 6 / 6 | 0 | 0 |

Total: **1758 passed**, comprising **1746** requested Web/Mini/scripts/API suite tests, **6** targeted Core/Gateway tests and **6** new audit-only assertions. Core/Gateway **full suites skipped as requested** because they require localhost; the operator runs them.

Web, Mini and Core builds passed. Mini after build: **1,569,424 / 1,572,864 bytes**, **3,440 remaining**; runtime 1,144,004, media 189,978. The unchanged older 1,569,427-byte guard also passes.

**web** (cwd `apps/web`): `NODE_OPTIONS=--no-experimental-webstorage node --import tsx --import ./tests/dom-setup.mjs --test --test-concurrency=2`

```text
ℹ tests 1483
ℹ pass 1483
ℹ fail 0
ℹ skipped 0
ℹ duration_ms 171720.352667
```

**mini** (cwd `apps/miniprogram`): `npm test`

```text
ℹ tests 172
ℹ pass 172
ℹ fail 0
ℹ skipped 0
ℹ duration_ms 24640.540125
```

**scripts** (cwd `.`): `node --test scripts/*.test.mjs`

```text
ℹ tests 58
ℹ pass 58
ℹ fail 0
ℹ skipped 0
ℹ duration_ms 10440.4255
```

**api** (cwd `.`): `node --test packages/api/src/*.test.js`

```text
ℹ tests 33
ℹ pass 33
ℹ fail 0
ℹ skipped 0
ℹ duration_ms 92.668708
```

**coreTargeted** (cwd `apps/paperbanana-api`): `node --import tsx --test tests/execution-capability-r22.test.ts tests/model-card-r22b.test.ts tests/model-modality-phase2.test.ts`

```text
ℹ tests 4
ℹ pass 4
ℹ fail 0
ℹ skipped 0
ℹ duration_ms 5700.158583
```

**gatewayTargeted** (cwd `.`): `node --test apps/auth-gateway/tests/execution-capability-r22.test.js apps/auth-gateway/tests/model-modality-phase2.test.js`

```text
ℹ tests 2
ℹ pass 2
ℹ fail 0
ℹ skipped 0
ℹ duration_ms 5341.087708
```

**phaseHInventory** (cwd `.`): `node --test .audit-input/r23/verify-h.test.mjs`

```text
ℹ tests 6
ℹ pass 6
ℹ fail 0
ℹ skipped 0
ℹ duration_ms 4617.293166
```

| Build | Cwd | Command | Exit |
| --- | --- | --- | ---: |
| web-build | apps/web | npm run build | 0 |
| mini-build | apps/miniprogram | npm run build | 0 |
| core-build | apps/paperbanana-api | npm run build | 0 |

All **11** requested maintenance checks passed (freeze-execution-capability is listed once despite appearing in both task lists):

- `node scripts/sync-model-catalog.mjs --check` — exit 0.
- `node scripts/generate-model-audit.mjs --check` — exit 0.
- `node scripts/report-model-modality-r21.mjs --check` — exit 0.
- `node scripts/report-model-modality-phase2.mjs --check` — exit 0.
- `node scripts/sync-card-display.mjs --check` — exit 0.
- `node scripts/report-model-modality-r22b.mjs --check` — exit 0.
- `node scripts/report-changed-tests.mjs --check` — exit 0.
- `node scripts/freeze-execution-capability.mjs --check` — exit 0.
- `node scripts/check-docker-bundles.mjs --check` — exit 0.
- `node scripts/freeze-audit-sources.mjs --check` — exit 0.
- `node scripts/report-source-titles-r23.mjs --check` — exit 0.

Both abbreviation runs also passed with `flagged: 0`. No verification-proven product defect required a fix; existing tests and the changed-test ledger remain untouched. Audit harness corrections were limited to historical export compatibility and JSON’s omission of an undefined property. `sync-agent-knowledge` and `sync-workflow` remain untouched. Native WeChat rendering and operator browser screenshots remain unverified.

## Appendix A. Distinct changed source-title pairs

Baseline `42ee9ffd` → HEAD. Deduplicated by exact before/after title pair across clients and lifecycle dialogs; counts are row instances. New/removed URLs are excluded.

| Before | After | Web | Mini | Lifecycle |
| --- | --- | ---: | ---: | ---: |
| 官方文档 · DeepSeek · news261017 | 官方文档 · DeepSeek · News261017 | 3 | 0 | 0 |
| 官方文档 · DeepSeek · vision | 官方文档 · DeepSeek · Vision | 3 | 0 | 0 |
| 官方文档 · Hugging Face · DeepSeek V4 Pro 0813 | 官方文档 · Hugging Face · DeepSeek-V4-Pro 0813 | 3 | 2 | 0 |
| 官方文档 · kimi.com · 模型列表 | 官方文档 · Kimi · 模型列表 | 7 | 2 | 0 |
| 官方文档 · kimi.com · kimi k3 quickstart | 官方文档 · Kimi · Kimi K3 Quickstart | 1 | 0 | 0 |
| 官方文档 · kimi.com · get api key | 官方文档 · Kimi · Get API Key | 4 | 0 | 0 |
| 官方文档 · kimi.com · kimi k2 7 code quickstart | 官方文档 · Kimi · Kimi K2.7 Code Quickstart | 2 | 1 | 0 |
| 官方文档 · kimi.com · 模型列表 · www.kimi.com/code/docs/en/kimi-code/models | 官方文档 · Kimi · 模型列表（英文） | 1 | 0 | 0 |
| 官方文档 · kimi.com · 模型列表 · platform.kimi.com/docs/models | 官方文档 · Kimi · 模型列表（文档） | 1 | 0 | 0 |
| 官方文档 · kimi.com · kimi k2 6 quickstart | 官方文档 · Kimi · Kimi K2.6 Quickstart | 1 | 0 | 0 |
| 官方文档 · kimi.com · kimi k3 1 pro quickstart | 官方文档 · Kimi · Kimi K3.1 Pro Quickstart | 2 | 2 | 0 |
| 官方文档 · kimi.com · chat | 官方文档 · Kimi · Chat | 2 | 0 | 0 |
| 官方文档 · bigmodel.cn · glm 5.3 | 官方文档 · 智谱 · GLM-5.3 | 5 | 5 | 0 |
| 官方文档 · bigmodel.cn · model overview | 官方文档 · 智谱 · 模型概览 | 28 | 0 | 0 |
| 官方文档 · bigmodel.cn · glm 5.3 flash | 官方文档 · 智谱 · GLM-5.3-flash | 1 | 1 | 0 |
| 官方文档 · bigmodel.cn · glm 5.3 flash | 官方文档 · 智谱 · GLM 5.3 Flash | 5 | 5 | 0 |
| 官方文档 · bigmodel.cn · glm 5.2 | 官方文档 · 智谱 · GLM 5.2 | 2 | 1 | 0 |
| 官方文档 · bigmodel.cn · glm 5.1 | 官方文档 · 智谱 · GLM-5.1 | 5 | 3 | 0 |
| 官方文档 · bigmodel.cn · glm 5 | 官方文档 · 智谱 · GLM-5 | 4 | 4 | 0 |
| 官方文档 · bigmodel.cn · glm 5 turbo | 官方文档 · 智谱 · GLM-5-turbo | 1 | 1 | 0 |
| 官方文档 · bigmodel.cn · glm 5v turbo | 官方文档 · 智谱 · GLM 5V Turbo | 1 | 1 | 0 |
| 官方文档 · bigmodel.cn · glm 4.7 | 官方文档 · 智谱 · GLM-4.7 | 1 | 1 | 0 |
| 官方文档 · bigmodel.cn · glm 4.7 flash | 官方文档 · 智谱 · GLM-4.7-flash | 1 | 1 | 0 |
| 官方文档 · bigmodel.cn · glm 4.7 | 官方文档 · 智谱 · GLM 4.7 | 1 | 1 | 0 |
| 官方文档 · bigmodel.cn · glm 4.6 | 官方文档 · 智谱 · GLM-4.6 | 1 | 1 | 0 |
| 官方文档 · bigmodel.cn · glm 4.6v | 官方文档 · 智谱 · GLM-4.6v | 1 | 1 | 0 |
| 官方文档 · bigmodel.cn · glm 4.6v flash | 官方文档 · 智谱 · GLM-4.6v-flash | 1 | 1 | 0 |
| 官方文档 · bigmodel.cn · glm 4.6v | 官方文档 · 智谱 · GLM 4.6v | 1 | 1 | 0 |
| 官方文档 · bigmodel.cn · glm 4.5 | 官方文档 · 智谱 · GLM 4.5 | 3 | 3 | 0 |
| 官方文档 · bigmodel.cn · glm 4.5 flash | 官方文档 · 智谱 · GLM-4.5-flash | 1 | 1 | 0 |
| 官方文档 · bigmodel.cn · glm 4.1v thinking flash | 官方文档 · 智谱 · GLM-4.1v-thinking-flash | 1 | 1 | 0 |
| 官方文档 · bigmodel.cn · glm 4.1v thinking | 官方文档 · 智谱 · GLM 4.1v Thinking | 1 | 1 | 0 |
| 官方文档 · bigmodel.cn · glm 4 | 官方文档 · 智谱 · GLM 4 | 2 | 2 | 0 |
| 官方文档 · bigmodel.cn · glm 4 long | 官方文档 · 智谱 · GLM-4-long | 1 | 1 | 0 |
| 官方文档 · bigmodel.cn · glm 4v flash | 官方文档 · 智谱 · GLM-4v-flash | 1 | 1 | 0 |
| 官方文档 · bigmodel.cn · cogview 3 flash | 官方文档 · 智谱 · cogview-3-flash | 1 | 1 | 0 |
| 官方文档 · bigmodel.cn · cogview 4 | 官方文档 · 智谱 · cogview-4 | 2 | 2 | 0 |
| 官方文档 · bigmodel.cn · glm image | 官方文档 · 智谱 · GLM Image | 1 | 1 | 0 |
| 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 | 68 | 1 | 0 |
| 官方文档 · Hugging Face · Hy4 preview | 官方文档 · Hugging Face · Hy4-preview | 1 | 1 | 0 |
| 官方文档 · Hugging Face · Qwen3.8 27B | 官方文档 · Hugging Face · Qwen3.8-27B | 1 | 0 | 0 |
| 官方文档 · Hugging Face · MiniMax M2.5 | 官方文档 · Hugging Face · MiniMax-M2.5 | 4 | 2 | 0 |
| 官方文档 · minimax.io · text openai api | 官方文档 · MiniMax · Text OpenAI API | 14 | 0 | 0 |
| 官方文档 · Hugging Face · Qwen Image Edit 2509 | 官方文档 · Hugging Face · Qwen-Image-Edit-2509 | 1 | 1 | 0 |
| 官方文档 · siliconflow.cn · images generations post | 官方文档 · SiliconFlow · Images Generations Post | 2 | 0 | 0 |
| 官方文档 · Hugging Face · Qwen Image Edit | 官方文档 · Hugging Face · Qwen-Image-Edit | 1 | 1 | 0 |
| 下线公告 · 百炼 · 模型下线公告 | 原厂规格 · 百炼 · 模型下线公告 | 2 | 0 | 0 |
| 官方文档 · Hugging Face · Qwen3.6 27B | 官方文档 · Hugging Face · Qwen3.6-27B | 1 | 1 | 0 |
| 官方文档 · Hugging Face · Qwen3.6 35B A3B | 官方文档 · Hugging Face · Qwen3.6-35B-A3B | 1 | 1 | 0 |
| 官方文档 · Hugging Face · Qwen3.5 122B A10B | 官方文档 · Hugging Face · Qwen3.5-122B-A10B | 2 | 0 | 0 |
| 官方文档 · Hugging Face · Qwen3.5 27B | 官方文档 · Hugging Face · Qwen3.5-27B | 2 | 0 | 0 |
| 官方文档 · Hugging Face · Qwen3.5 35B A3B | 官方文档 · Hugging Face · Qwen3.5-35B-A3B | 2 | 0 | 0 |
| 官方文档 · Hugging Face · Qwen3.5 397B A17B | 官方文档 · Hugging Face · Qwen3.5-397B-A17B | 2 | 2 | 0 |
| 官方文档 · Hugging Face · Qwen3.5 4B | 官方文档 · Hugging Face · Qwen3.5-4B | 1 | 1 | 0 |
| 官方文档 · Hugging Face · Qwen3.5 9B | 官方文档 · Hugging Face · Qwen3.5-9B | 1 | 1 | 0 |
| 官方文档 · Hugging Face · Qwen3 14B | 官方文档 · Hugging Face · Qwen3-14B | 1 | 1 | 0 |
| 官方文档 · Hugging Face · Qwen3 30B A3B Instruct 2507 | 官方文档 · Hugging Face · Qwen3-30B-A3B-Instruct-2507 | 1 | 1 | 0 |
| 官方文档 · Hugging Face · Qwen3 32B | 官方文档 · Hugging Face · Qwen3-32B | 1 | 1 | 0 |
| 官方文档 · Hugging Face · Qwen3 8B | 官方文档 · Hugging Face · Qwen3-8B | 1 | 1 | 0 |
| 官方文档 · Hugging Face · Qwen2.5 7B Instruct | 官方文档 · Hugging Face · Qwen2.5-7B-Instruct | 2 | 2 | 0 |
| 官方文档 · Hugging Face · Qwen2.5 32B Instruct | 官方文档 · Hugging Face · Qwen2.5-32B-Instruct | 1 | 1 | 0 |
| 官方文档 · Hugging Face · Qwen2.5 72B Instruct | 官方文档 · Hugging Face · Qwen2.5-72B-Instruct | 2 | 2 | 0 |
| 官方文档 · siliconflow.cn · chat completions | 官方文档 · SiliconFlow · Chat Completions | 2 | 0 | 0 |
| 官方文档 · siliconflow.cn · overview | 官方文档 · SiliconFlow · Release Notes | 1 | 0 | 0 |
| 官方文档 · Hugging Face · DeepSeek V4 Flash | 官方文档 · Hugging Face · DeepSeek-V4-Flash | 3 | 3 | 0 |
| 官方文档 · Hugging Face · DeepSeek V4 Pro | 官方文档 · Hugging Face · DeepSeek-V4-Pro | 4 | 0 | 0 |
| 官方文档 · Hugging Face · DeepSeek V3.2 | 官方文档 · Hugging Face · DeepSeek-V3.2 | 3 | 3 | 0 |
| 官方文档 · Hugging Face · DeepSeek V3.1 Terminus | 官方文档 · Hugging Face · DeepSeek-V3.1-Terminus | 3 | 3 | 0 |
| 官方文档 · Hugging Face · DeepSeek R1 0528 Qwen3 8B | 官方文档 · Hugging Face · DeepSeek-R1-0528-Qwen3-8B | 1 | 1 | 0 |
| 官方文档 · Hugging Face · Kimi K2.7 Code | 官方文档 · Hugging Face · Kimi-K2.7-Code | 1 | 1 | 0 |
| 官方文档 · siliconflow.cn · vision | 官方文档 · SiliconFlow · Vision | 1 | 0 | 0 |
| 原厂规格 · stepfun.com · list | 原厂规格 · StepFun · List | 2 | 2 | 0 |
| 官方文档 · stepfun.com · step 3.5 flash | 官方文档 · StepFun · Step-3.5-Flash | 1 | 0 | 0 |
| 官方文档 · bigmodel.cn · glm 5.2 | 官方文档 · 智谱 · GLM-5.2 | 6 | 5 | 0 |
| 官方文档 · bigmodel.cn · glm 4.5v | 官方文档 · 智谱 · GLM-4.5V | 1 | 1 | 0 |
| 官方文档 · github.com · README.md | 官方文档 · GitHub · README | 3 | 3 | 0 |
| 官方文档 · Hugging Face · DeepSeek V3 | 官方文档 · Hugging Face · DeepSeek-V3 | 2 | 2 | 0 |
| 官方文档 · Hugging Face · Seed OSS 36B Instruct | 官方文档 · Hugging Face · Seed-OSS-36B-Instruct | 1 | 1 | 0 |
| 官方文档 · Hugging Face · DeepSeek R1 | 官方文档 · Hugging Face · DeepSeek-R1 | 2 | 2 | 0 |
| 官方文档 · Hugging Face · Qwen3 Coder 30B A3B Instruct | 官方文档 · Hugging Face · Qwen3-Coder-30B-A3B-Instruct | 1 | 1 | 0 |
| 官方文档 · Hugging Face · Qwen3 Omni 30B A3B Instruct | 官方文档 · Hugging Face · Qwen3-Omni-30B-A3B-Instruct | 1 | 1 | 0 |
| 官方文档 · Hugging Face · Qwen3 Omni 30B A3B Thinking | 官方文档 · Hugging Face · Qwen3-Omni-30B-A3B-Thinking | 1 | 1 | 0 |
| 官方文档 · Hugging Face · Qwen3 VL 30B A3B Instruct | 官方文档 · Hugging Face · Qwen3-VL-30B-A3B-Instruct | 1 | 1 | 0 |
| 官方文档 · Hugging Face · Qwen3 VL 30B A3B Thinking | 官方文档 · Hugging Face · Qwen3-VL-30B-A3B-Thinking | 1 | 1 | 0 |
| 官方文档 · Hugging Face · Qwen3 VL 32B Instruct | 官方文档 · Hugging Face · Qwen3-VL-32B-Instruct | 1 | 1 | 0 |
| 官方文档 · Hugging Face · Qwen3 VL 32B Thinking | 官方文档 · Hugging Face · Qwen3-VL-32B-Thinking | 1 | 1 | 0 |
| 官方文档 · Hugging Face · Qwen3 VL 8B Instruct | 官方文档 · Hugging Face · Qwen3-VL-8B-Instruct | 1 | 1 | 0 |
| 官方文档 · Hugging Face · Qwen3 VL 8B Thinking | 官方文档 · Hugging Face · Qwen3-VL-8B-Thinking | 1 | 1 | 0 |
| 官方文档 · Hugging Face · Z Image | 官方文档 · Hugging Face · Z-Image | 1 | 1 | 0 |
| 官方文档 · Hugging Face · Z Image Turbo | 官方文档 · Hugging Face · Z-Image-Turbo | 1 | 0 | 0 |
| 官方文档 · Hugging Face · ERNIE Image Turbo | 官方文档 · Hugging Face · ERNIE-Image-Turbo | 1 | 1 | 0 |
| 官方文档 · Hugging Face · Ling flash 2.0 | 官方文档 · Hugging Face · Ling-flash-2.0 | 1 | 1 | 0 |
| 官方文档 · Hugging Face · Ling mini 2.0 | 官方文档 · Hugging Face · Ling-mini-2.0 | 1 | 1 | 0 |
| 官方文档 · Hugging Face · LongCat 2.0 | 官方文档 · Hugging Face · LongCat-2.0 | 1 | 1 | 0 |
| 官方文档 · Hugging Face · Nex N2 Pro | 官方文档 · Hugging Face · Nex-N2-Pro | 1 | 1 | 0 |
| 官方文档 · Hugging Face · Hunyuan A13B Instruct | 官方文档 · Hugging Face · Hunyuan-A13B-Instruct | 1 | 1 | 0 |
| 官方文档 · claude.com · overview | 官方文档 · Claude · Haiku 5-5 | 1 | 1 | 0 |
| 官方文档 · claude.com · overview | 官方文档 · Claude · Sonnet 5-5 | 1 | 1 | 0 |
| 官方文档 · anthropic.com · overview | 官方文档 · Anthropic · 模型列表 | 12 | 2 | 0 |
| 官方文档 · claude.com · overview · platform.claude.com/docs/en/models/overview | 官方文档 · Claude · 模型列表 | 12 | 0 | 0 |
| 官方文档 · claude.com · overview · platform.claude.com/docs/en/models/opus-5-5/overview | 官方文档 · Claude · Opus 5-5 | 1 | 0 | 0 |
| 官方文档 · claude.com · overview · platform.claude.com/docs/en/models/fable-5-1/overview | 官方文档 · Claude · Fable 5-1 | 1 | 0 | 0 |
| 官方文档 · claude.com · overview · platform.claude.com/docs/en/models/opus-5/overview | 官方文档 · Claude · Opus 5 | 1 | 0 | 0 |
| 官方文档 · claude.com · overview · platform.claude.com/docs/en/models/sonnet-5/overview | 官方文档 · Claude · Sonnet 5 | 1 | 0 | 0 |
| 官方文档 · claude.com · overview · platform.claude.com/docs/en/models/fable-5/overview | 官方文档 · Claude · Fable 5 | 1 | 0 | 0 |
| 官方文档 · claude.com · overview · platform.claude.com/docs/en/models/opus-4-8/overview | 官方文档 · Claude · Opus 4-8 | 1 | 0 | 0 |
| 官方文档 · claude.com · overview · platform.claude.com/docs/en/models/opus-4-7/overview | 官方文档 · Claude · Opus 4-7 | 1 | 0 | 0 |
| 官方文档 · claude.com · overview · platform.claude.com/docs/en/models/sonnet-4-6/overview | 官方文档 · Claude · Sonnet 4-6 | 1 | 0 | 0 |
| 官方文档 · claude.com · overview · platform.claude.com/docs/en/models/opus-4-6/overview | 官方文档 · Claude · Opus 4-6 | 1 | 0 | 0 |
| 官方文档 · claude.com · overview · platform.claude.com/docs/en/models/opus-4-5/overview | 官方文档 · Claude · Opus 4-5 | 1 | 0 | 0 |
| 官方文档 · claude.com · overview · platform.claude.com/docs/en/models/sonnet-4-5/overview | 官方文档 · Claude · Sonnet 4-5 | 1 | 0 | 0 |
| 官方文档 · claude.com · overview · platform.claude.com/docs/en/models/haiku-4-5/overview | 官方文档 · Claude · Haiku 4-5 | 1 | 0 | 0 |
| 官方文档 · recraft.ai · recraft v4 1 | 官方文档 · Recraft · Recraft V4.1 | 8 | 8 | 0 |
| 官方文档 · recraft.ai · appendix | 官方文档 · Recraft · Appendix | 18 | 0 | 0 |
| 官方文档 · recraft.ai · image to image | 官方文档 · Recraft · Image To Image | 14 | 0 | 0 |
| 官方文档 · recraft.ai · docs | 官方文档 · Recraft · 文档首页 | 16 | 0 | 0 |
| 官方文档 · recraft.ai · recraft v4 1 flash | 官方文档 · Recraft · Recraft V4.1 Flash | 1 | 1 | 0 |
| 官方文档 · recraft.ai · recraft v4 | 官方文档 · Recraft · recraftv4 | 1 | 1 | 0 |
| 官方文档 · recraft.ai · recraft v4 | 官方文档 · Recraft · Recraft V4 | 3 | 3 | 0 |
| 官方文档 · recraft.ai · recraft v3 | 官方文档 · Recraft · recraftv3 | 1 | 1 | 0 |
| 官方文档 · recraft.ai · recraft v3 | 官方文档 · Recraft · Recraft V3 | 1 | 1 | 0 |
| 官方文档 · recraft.ai · recraft v2 | 官方文档 · Recraft · recraftv2 | 2 | 2 | 0 |
| 官方文档 · x.ai · grok 4.7 | 官方文档 · xAI · Grok 4.7 | 1 | 1 | 0 |
| 官方文档 · x.ai · 模型列表 | 官方文档 · xAI · 模型列表 | 4 | 0 | 0 |
| 官方文档 · x.ai · grok 4.6 | 官方文档 · xAI · Grok 4.6 | 1 | 1 | 0 |
| 官方文档 · x.ai · grok 4.5 | 官方文档 · xAI · Grok-4.5 | 1 | 1 | 0 |
| 官方文档 · x.ai · 模型列表 · docs.x.ai/docs/models | 官方文档 · xAI · 模型列表（文档） | 8 | 0 | 0 |
| 官方文档 · x.ai · 模型列表 · docs.x.ai/developers/models | 官方文档 · xAI · 模型列表（文档 2） | 8 | 0 | 0 |
| 官方文档 · x.ai · grok 4.3 | 官方文档 · xAI · Grok-4.3 | 1 | 1 | 0 |
| 官方文档 · x.ai · grok 4.20 0309 non reasoning | 官方文档 · xAI · Grok-4.20-0309-non-reasoning | 1 | 1 | 0 |
| 官方文档 · x.ai · grok 4.20 0309 reasoning | 官方文档 · xAI · Grok-4.20-0309-reasoning | 1 | 1 | 0 |
| 官方文档 · x.ai · grok 4.20 multi agent 0309 | 官方文档 · xAI · Grok 4.20 Multi Agent 0309 | 1 | 1 | 0 |
| 官方文档 · x.ai · grok 4.20 multi agent 0309 | 官方文档 · xAI · Grok 4.20 Multi-agent 0309 | 1 | 1 | 0 |
| 官方文档 · x.ai · grok imagine image 2.0 | 官方文档 · xAI · Grok Imagine Image 2.0 | 1 | 1 | 0 |
| 官方文档 · x.ai · grok imagine image | 官方文档 · xAI · Grok-imagine-image | 1 | 1 | 0 |
| 官方文档 · x.ai · grok imagine image quality · docs.x.ai/developers/models/grok-imagine-image-quality | 官方文档 · xAI · Grok-imagine-image-quality（文档） | 1 | 0 | 0 |
| 官方文档 · x.ai · grok imagine image quality · docs.x.ai/docs/models/grok-imagine-image-quality | 官方文档 · xAI · Grok-imagine-image-quality（文档 2） | 1 | 0 | 0 |
| 下线公告 · x.ai · imagine image quality nov 2 | 下线公告 · xAI · Imagine Image Quality Nov 2 | 2 | 1 | 0 |
| 官方文档 · x.ai · grok build 0.1 · docs.x.ai/developers/models/grok-build-0.1 | 官方文档 · xAI · Grok-build-0.1（文档） | 1 | 0 | 0 |
| 官方文档 · x.ai · grok build 0.1 · docs.x.ai/docs/models/grok-build-0.1 | 官方文档 · xAI · Grok-build-0.1（文档 2） | 1 | 0 | 0 |
| 官方文档 · ai.google.dev · gemini 4 argon | 官方文档 · Google · Gemini 4 Argon | 1 | 1 | 0 |
| 官方文档 · ai.google.dev · thinking | 官方文档 · Google · Thinking | 21 | 0 | 0 |
| 官方文档 · ai.google.dev · 价格与规格 | 官方文档 · Google · 价格与规格 | 1 | 0 | 0 |
| 官方文档 · ai.google.dev · gemini nano banana 2.1 | 官方文档 · Google · Nano Banana 2.1 | 3 | 1 | 0 |
| 官方文档 · ai.google.dev · image generation | 官方文档 · Google · Image Generation | 6 | 0 | 0 |
| 官方文档 · ai.google.dev · gemini 3.8 flash | 官方文档 · Google · Gemini 3.8 Flash | 1 | 1 | 0 |
| 官方文档 · ai.google.dev · image understanding | 官方文档 · Google · Image Understanding | 14 | 0 | 0 |
| 官方文档 · ai.google.dev · 模型列表 | 官方文档 · Google · 模型列表 | 15 | 0 | 0 |
| 官方文档 · ai.google.dev · gemini 3.7 flash | 官方文档 · Google · Gemini 3.7 Flash | 1 | 1 | 0 |
| 官方文档 · ai.google.dev · gemini 3.6 flash | 官方文档 · Google · Gemini 3.6 Flash | 1 | 1 | 0 |
| 官方文档 · ai.google.dev · gemini 3.5 flash lite | 官方文档 · Google · Gemini 3.5 Flash-Lite | 1 | 1 | 0 |
| 官方文档 · ai.google.dev · gemini 3.1 flash lite image | 官方文档 · Google · Gemini 3.1 Flash Lite Image · Nano Banana 2 Lite | 1 | 1 | 0 |
| 官方文档 · ai.google.dev · gemini 3.1 flash image | 官方文档 · Google · Gemini 3.1 Flash Image · Nano Banana 2 | 1 | 1 | 0 |
| 官方文档 · ai.google.dev · gemini 3 pro image | 官方文档 · Google · Gemini 3 Pro Image · Nano Banana Pro | 1 | 1 | 0 |
| 官方文档 · ai.google.dev · gemini 3.5 flash | 官方文档 · Google · Gemini 3.5 Flash | 1 | 1 | 0 |
| 官方文档 · ai.google.dev · gemini 3.1 flash lite | 官方文档 · Google · Gemini 3.1 Flash-Lite | 1 | 1 | 0 |
| 官方文档 · ai.google.dev · gemini 3.1 pro preview | 官方文档 · Google · Gemini 3.1 Pro Preview | 1 | 1 | 0 |
| 官方文档 · ai.google.dev · gemini 3 flash preview | 官方文档 · Google · Gemini 3 Flash Preview | 2 | 1 | 0 |
| 官方文档 · ai.google.dev · gemini 2.5 flash | 官方文档 · Google · Gemini 2.5 Flash | 1 | 1 | 0 |
| 官方文档 · ai.google.dev · gemini 2.5 flash image | 官方文档 · Google · Gemini 2.5 Flash Image · Nano Banana | 1 | 1 | 0 |
| 官方文档 · ai.google.dev · gemini 2.5 flash lite | 官方文档 · Google · Gemini 2.5 Flash-Lite | 1 | 1 | 0 |
| 官方文档 · ai.google.dev · gemini 2.5 pro | 官方文档 · Google · Gemini 2.5 Pro | 1 | 1 | 0 |
| 官方文档 · 百炼 · DeepSeek-V4.1-Flash 模型页 | 官方文档 · 百炼 · DeepSeek-V4.1-Flash | 1 | 1 | 0 |
| 官方文档 · Hugging Face · DeepSeek V4.1 Flash | 官方文档 · Hugging Face · DeepSeek-V4.1-Flash | 2 | 1 | 0 |
| 官方文档 · 百炼 · qwen3 8 max | 官方文档 · 百炼 · Qwen3.8 Max | 2 | 2 | 0 |
| 官方文档 · 百炼 · vision model | 官方文档 · 百炼 · Vision Model | 2 | 2 | 0 |
| 官方文档 · 百炼 · text generation model | 官方文档 · 百炼 · Text Generation Model | 3 | 1 | 0 |
| 官方文档 · 百炼 · Kimi-K3 模型页 | 官方文档 · 百炼 · Kimi K3 (Bailian hosted) | 1 | 1 | 0 |
| 官方文档 · Hugging Face · Kimi K3 | 官方文档 · Hugging Face · Kimi K3 (Bailian hosted) | 1 | 0 | 0 |
| 官方文档 · 百炼 · qwen3 8 27b | 官方文档 · 百炼 · Qwen3.8 27B | 1 | 1 | 0 |
| 官方文档 · bigmodel.cn · glm 5.3 | 官方文档 · 智谱 · GLM 5.3 | 1 | 0 | 0 |
| 官方文档 · 百炼 · qwen3 8 2 4t a95b | 官方文档 · 百炼 · Qwen3.8 2.4T A95B | 1 | 1 | 0 |
| 官方文档 · 百炼 · 模型列表 · help.aliyun.com/zh/model-studio/models | 官方文档 · 百炼 · 模型列表（文档） | 12 | 0 | 0 |
| 官方文档 · 百炼 · 模型列表 · help.aliyun.com/en/model-studio/models | 官方文档 · 百炼 · 模型列表（英文） | 12 | 0 | 0 |
| 官方文档 · Hugging Face · MiniMax M2.7 | 官方文档 · Hugging Face · MiniMax-M2.7 | 2 | 1 | 0 |
| 官方文档 · 百炼 · deepseek api | 官方文档 · 百炼 · DeepSeek API | 1 | 1 | 0 |
| 官方文档 · 百炼 · rate limit | 官方文档 · 百炼 · Rate Limit | 1 | 0 | 0 |
| 官方文档 · 百炼 · qwen api via openai chat completions | 官方文档 · 百炼 · Qwen API Via OpenAI Chat Completions | 3 | 0 | 0 |
| 官方文档 · 百炼 · context cache | 官方文档 · 百炼 · Context Cache | 1 | 0 | 0 |
| 官方文档 · Hugging Face · DeepSeek V4 Pro 0813 | 官方文档 · Hugging Face · DeepSeek-V4-Pro-0813 | 3 | 3 | 0 |
| 官方文档 · 百炼 · deepseek api by vanchin | 官方文档 · 百炼 · DeepSeek API By Vanchin | 6 | 1 | 0 |
| 官方文档 · 百炼 · qwen image 3 0 | 官方文档 · 百炼 · Qwen Image 3.0 | 1 | 1 | 0 |
| 官方文档 · 百炼 · qwen image generation and editing api reference | 官方文档 · 百炼 · Qwen Image Generation And Editing API Reference | 3 | 0 | 0 |
| 官方文档 · 百炼 · qwen image 3 0 pro | 官方文档 · 百炼 · Qwen Image 3.0 Pro | 1 | 1 | 0 |
| 官方文档 · Hugging Face · DeepSeek V4 Flash 0731 | 官方文档 · Hugging Face · DeepSeek-V4-Flash-0731 | 3 | 3 | 0 |
| 官方文档 · 百炼 · glm 5 2 | 官方文档 · 百炼 · GLM 5.2 | 1 | 1 | 0 |
| 官方文档 · qianwenai.com · glm 5.2 fast preview | 官方文档 · 千问 · GLM-5.2-fast-preview | 1 | 1 | 0 |
| 官方文档 · 百炼 · glm 5 1 | 官方文档 · 百炼 · GLM-5.1 | 1 | 1 | 0 |
| 官方文档 · 百炼 · kimi k2 7 code | 官方文档 · 百炼 · Kimi-k2.7-code | 1 | 1 | 0 |
| 官方文档 · Hugging Face · Kimi K2.7 Code | 官方文档 · Hugging Face · Kimi-k2.7-code | 2 | 0 | 0 |
| 官方文档 · 百炼 · kimi k2 6 | 官方文档 · 百炼 · Kimi-k2.6 | 1 | 1 | 0 |
| 官方文档 · Hugging Face · Kimi K2.6 | 官方文档 · Hugging Face · Kimi-k2.6 | 2 | 0 | 0 |
| 官方文档 · 百炼 · kimi k2 5 | 官方文档 · 百炼 · Kimi-k2.5 | 1 | 1 | 0 |
| 官方文档 · Hugging Face · Kimi K2.5 | 官方文档 · Hugging Face · Kimi-k2.5 | 2 | 1 | 0 |
| 官方文档 · 百炼 · qwen image 2 1 pro | 官方文档 · 百炼 · Qwen Image 2.1 Pro | 1 | 1 | 0 |
| 官方文档 · 百炼 · qwen image 2 1 turbo | 官方文档 · 百炼 · Qwen Image 2.1 Turbo | 1 | 1 | 0 |
| 官方文档 · 百炼 · qwen image 2 0 pro | 官方文档 · 百炼 · Qwen Image 2.0 Pro | 5 | 5 | 0 |
| 官方文档 · 百炼 · qwen image 2 0 | 官方文档 · 百炼 · Qwen Image 2.0 | 3 | 3 | 0 |
| 官方文档 · 百炼 · qwen image api | 官方文档 · 百炼 · Qwen-image API | 1 | 1 | 0 |
| 官方文档 · Hugging Face · Qwen Image | 官方文档 · Hugging Face · Qwen-image | 1 | 0 | 0 |
| 官方文档 · 百炼 · qwen3 7 max | 官方文档 · 百炼 · Qwen3.7-max | 1 | 1 | 0 |
| 官方文档 · 百炼 · qwen3 7 max | 官方文档 · 百炼 · Qwen3.7 Max | 5 | 4 | 0 |
| 官方文档 · 百炼 · qwen3 7 plus | 官方文档 · 百炼 · Qwen3.7 Plus | 4 | 3 | 0 |
| 官方文档 · Hugging Face · Qwen3.6 27B | 官方文档 · Hugging Face · Qwen3.6-27b | 1 | 1 | 0 |
| 官方文档 · Hugging Face · Qwen3.6 35B A3B | 官方文档 · Hugging Face · Qwen3.6-35b-a3b | 1 | 1 | 0 |
| 官方文档 · 百炼 · qwen3 6 plus | 官方文档 · 百炼 · Qwen3.6-plus | 1 | 1 | 0 |
| 官方文档 · 百炼 · qwen3 6 plus | 官方文档 · 百炼 · Qwen3.6 Plus | 2 | 1 | 0 |
| 官方文档 · Hugging Face · Qwen3.5 122B A10B | 官方文档 · Hugging Face · Qwen3.5-122b-a10b | 1 | 0 | 0 |
| 官方文档 · Hugging Face · Qwen3.5 27B | 官方文档 · Hugging Face · Qwen3.5-27b | 1 | 0 | 0 |
| 官方文档 · Hugging Face · Qwen3.5 35B A3B | 官方文档 · Hugging Face · Qwen3.5-35b-a3b | 1 | 0 | 0 |
| 官方文档 · Hugging Face · Qwen3.5 397B A17B | 官方文档 · Hugging Face · Qwen3.5-397b-a17b | 1 | 0 | 0 |
| 官方文档 · 百炼 · qwen3 5 omni flash | 官方文档 · 百炼 · Qwen3.5-omni-flash | 1 | 1 | 0 |
| 官方文档 · 百炼 · qwen3 5 omni flash | 官方文档 · 百炼 · Qwen3.5 Omni Flash | 1 | 1 | 0 |
| 官方文档 · 百炼 · qwen3 5 omni plus | 官方文档 · 百炼 · Qwen3.5 Omni Plus | 2 | 2 | 0 |
| 下线公告 · aliyun.com · 118344 | 下线公告 · 百炼 · 文档 118344 | 2 | 2 | 0 |
| 下线公告 · aliyun.com · 118345 | 下线公告 · 百炼 · 文档 118345 | 3 | 3 | 0 |
| 官方文档 · stepfun.com · step 3.7 flash | 官方文档 · StepFun · step-3.7-flash | 1 | 0 | 0 |
| 官方文档 · 百炼 · wan2 7 image | 官方文档 · 百炼 · Wan 2.7 Image | 1 | 1 | 0 |
| 官方文档 · 百炼 · wan2 7 image pro | 官方文档 · 百炼 · Wan 2.7 Image Pro | 1 | 1 | 0 |
| 官方文档 · 百炼 · wan2 6 image | 官方文档 · 百炼 · wan2.6-image | 1 | 1 | 0 |
| 官方文档 · 百炼 · wan2 6 t2i | 官方文档 · 百炼 · wan2.6-t2i | 1 | 1 | 0 |
| 官方文档 · 百炼 · wan2 2 t2i flash | 官方文档 · 百炼 · wan2.2-t2i-flash | 1 | 1 | 0 |
| 官方文档 · 百炼 · wan2 2 t2i plus | 官方文档 · 百炼 · wan2.2-t2i-plus | 1 | 1 | 0 |
| 官方文档 · 百炼 · minimax m3 1 flash | 官方文档 · 百炼 · MiniMax M3.1 Flash | 1 | 1 | 0 |
| 官方文档 · 百炼 · minimax api by minimax | 官方文档 · 百炼 · MiniMax API By MiniMax | 1 | 0 | 0 |
| 官方文档 · 百炼 · qwen plus | 官方文档 · 百炼 · Qwen Plus | 3 | 3 | 0 |
| 下线公告 · aliyun.com · 118177 | 下线公告 · 百炼 · 文档 118177 | 1 | 1 | 0 |
| 官方文档 · 百炼 · unisound u2 by unisound | 官方文档 · 百炼 · unisound-u2 By Unisound | 1 | 1 | 0 |
| 官方文档 · 百炼 · wanx v1 | 官方文档 · 百炼 · wanx-v1 | 1 | 1 | 0 |
| 官方文档 · 百炼 · wanx2 0 t2i turbo | 官方文档 · 百炼 · wanx2.0-t2i-turbo | 1 | 1 | 0 |
| 官方文档 · 百炼 · wanx image edit api reference | 官方文档 · 百炼 · Wanx Image Edit API Reference | 1 | 1 | 0 |
| 官方文档 · 百炼 · wanx image edit | 官方文档 · 百炼 · Wanx Image Edit | 1 | 0 | 0 |
| 官方文档 · 百炼 · wanx2 1 t2i plus | 官方文档 · 百炼 · wanx2.1-t2i-plus | 1 | 1 | 0 |
| 官方文档 · 百炼 · wanx2 1 t2i turbo | 官方文档 · 百炼 · wanx2.1-t2i-turbo | 1 | 1 | 0 |
| 下线公告 · mimo.mi.com · deprecate | 下线公告 · MiMo · 模型下线公告 | 2 | 2 | 0 |
| 官方文档 · mimo.mi.com · mimo v2.5 pro | 官方文档 · MiMo · mimo-v2.5-pro | 1 | 0 | 0 |
| 原厂规格 · mimo.mi.com · model | 原厂规格 · MiMo · 模型说明 | 2 | 0 | 0 |
| 官方文档 · 百炼 · mimo v2 6 pro ultraspeed | 官方文档 · 百炼 · MiMo V2.6 Pro UltraSpeed | 1 | 1 | 0 |
| 官方文档 · 百炼 · mimo | 官方文档 · 百炼 · MiMo | 1 | 0 | 0 |
| 官方文档 · Hugging Face · Z Image Turbo | 官方文档 · Hugging Face · Z-Image Turbo | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 6.1 sol | 官方文档 · OpenAI · GPT-6.1 Sol | 1 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt 6 luna.md | 官方文档 · OpenAI · GPT-6 Luna（Markdown） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 6 luna | 官方文档 · OpenAI · GPT-6 Luna（文档） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 6 sol.md | 官方文档 · OpenAI · GPT-6 Sol（Markdown） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 6 sol | 官方文档 · OpenAI · GPT-6 Sol（文档） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt image 2.5 flare.md | 官方文档 · OpenAI · GPT Image 2.5 Flare · 2026-09-08（Markdown） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt image 2.5 flare | 官方文档 · OpenAI · GPT Image 2.5 Flare · 2026-09-08（文档） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt image 2.5 flare | 官方文档 · OpenAI · GPT Image 2.5 Flare | 2 | 2 | 0 |
| 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 | 49 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt image 2.5 sunburst.md | 官方文档 · OpenAI · GPT Image 2.5 Sunburst · 2026-09-08（Markdown） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt image 2.5 sunburst | 官方文档 · OpenAI · GPT Image 2.5 Sunburst · 2026-09-08（文档） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt image 2.5 sunburst | 官方文档 · OpenAI · GPT Image 2.5 Sunburst | 2 | 2 | 0 |
| 官方文档 · developers.openai.com · gpt 6 astra.md | 官方文档 · OpenAI · GPT-6 Astra（Markdown） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 6 astra | 官方文档 · OpenAI · GPT-6 Astra（文档） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 5.6 luna.md | 官方文档 · OpenAI · GPT-5.6 Luna（Markdown） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 5.6 luna | 官方文档 · OpenAI · GPT-5.6 Luna（文档） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 5.6 sol.md | 官方文档 · OpenAI · GPT-5.6 Sol | 1 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt daybreak blue latest | 官方文档 · OpenAI · GPT Daybreak Blue Latest | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 5.6 terra.md | 官方文档 · OpenAI · GPT-5.6 Terra（Markdown） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 5.6 terra | 官方文档 · OpenAI · GPT-5.6 Terra（文档） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 5.5.md | 官方文档 · OpenAI · GPT-5.5 · 2026-04-23（Markdown） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 5.5 | 官方文档 · OpenAI · GPT-5.5 · 2026-04-23（文档） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 5.5 pro.md | 官方文档 · OpenAI · GPT-5.5 Pro · 2026-04-23（Markdown） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 5.5 pro | 官方文档 · OpenAI · GPT-5.5 Pro · 2026-04-23（文档） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 5.4.md | 官方文档 · OpenAI · GPT-5.4 · 2026-03-05（Markdown） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 5.4 | 官方文档 · OpenAI · GPT-5.4 · 2026-03-05（文档） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 5.4 mini.md | 官方文档 · OpenAI · GPT-5.4 Mini · 2026-03-17（Markdown） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 5.4 mini | 官方文档 · OpenAI · GPT-5.4 Mini · 2026-03-17（文档） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 5.4 nano.md | 官方文档 · OpenAI · GPT-5.4 Nano · 2026-03-17（Markdown） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 5.4 nano | 官方文档 · OpenAI · GPT-5.4 Nano · 2026-03-17（文档） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 5.4 pro.md | 官方文档 · OpenAI · GPT-5.4 Pro · 2026-03-05（Markdown） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 5.4 pro | 官方文档 · OpenAI · GPT-5.4 Pro · 2026-03-05（文档） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 5.3 codex.md | 官方文档 · OpenAI · GPT-5.3-codex（Markdown） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 5.3 codex | 官方文档 · OpenAI · GPT-5.3-codex（文档） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 5.2.md | 官方文档 · OpenAI · GPT-5.2 · 2025-12-11（Markdown） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 5.2 | 官方文档 · OpenAI · GPT-5.2 · 2025-12-11（文档） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 5.2 | 官方文档 · OpenAI · GPT 5.2 | 1 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt 5.2 pro.md | 官方文档 · OpenAI · GPT-5.2-pro · 2025-12-11（Markdown） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 5.2 pro | 官方文档 · OpenAI · GPT-5.2-pro · 2025-12-11（文档） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 5.1.md | 官方文档 · OpenAI · GPT-5.1 · 2025-11-13（Markdown） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 5.1 | 官方文档 · OpenAI · GPT-5.1 · 2025-11-13（文档） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 5.1 | 官方文档 · OpenAI · GPT-5.1 | 1 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt 5.md | 官方文档 · OpenAI · GPT-5 · 2025-08-07（Markdown） | 1 | 0 | 0 |
| 下线公告 · developers.openai.com · deprecations | 下线公告 · OpenAI · 模型下线公告 | 31 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 5 | 官方文档 · OpenAI · GPT-5 · 2025-08-07（文档） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 5 | 官方文档 · OpenAI · GPT 5 | 1 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt 5 mini.md | 官方文档 · OpenAI · GPT-5-mini · 2025-08-07（Markdown） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 5 mini | 官方文档 · OpenAI · GPT-5-mini · 2025-08-07（文档） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 5 mini | 官方文档 · OpenAI · GPT 5 Mini | 1 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt 5 nano.md | 官方文档 · OpenAI · GPT-5-nano · 2025-08-07（Markdown） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 5 nano | 官方文档 · OpenAI · GPT-5-nano · 2025-08-07（文档） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 5 nano | 官方文档 · OpenAI · GPT 5 Nano | 1 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt 5 pro.md | 官方文档 · OpenAI · GPT-5-pro · 2025-10-06（Markdown） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 5 pro | 官方文档 · OpenAI · GPT-5-pro · 2025-10-06（文档） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 5 pro | 官方文档 · OpenAI · GPT 5 Pro | 1 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt 4.1.md | 官方文档 · OpenAI · GPT-4.1 · 2025-04-14（Markdown） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 4.1 | 官方文档 · OpenAI · GPT-4.1 · 2025-04-14（文档） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 4.1 | 官方文档 · OpenAI · GPT 4.1 | 1 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt 4.1 mini.md | 官方文档 · OpenAI · GPT-4.1 Mini · 2025-04-14（Markdown） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 4.1 mini | 官方文档 · OpenAI · GPT-4.1 Mini · 2025-04-14（文档） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 4.1 mini | 官方文档 · OpenAI · GPT-4.1 Mini | 1 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt 4.1 nano.md | 官方文档 · OpenAI · GPT-4.1-nano · 2025-04-14（Markdown） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 4.1 nano | 官方文档 · OpenAI · GPT-4.1-nano · 2025-04-14（文档） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 4.1 nano | 官方文档 · OpenAI · GPT 4.1 Nano | 1 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt 4o.md | 官方文档 · OpenAI · GPT-4o · 2024-08-06（Markdown） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 4o | 官方文档 · OpenAI · GPT-4o · 2024-08-06（文档） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 4o | 官方文档 · OpenAI · GPT 4o | 3 | 3 | 0 |
| 官方文档 · developers.openai.com · gpt 4o mini.md | 官方文档 · OpenAI · GPT-4o-mini · 2024-07-18（Markdown） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 4o mini | 官方文档 · OpenAI · GPT-4o-mini · 2024-07-18（文档） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 4o mini | 官方文档 · OpenAI · GPT 4o Mini | 1 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt 4 turbo.md | 官方文档 · OpenAI · GPT-4-turbo · 2024-04-09（Markdown） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 4 turbo | 官方文档 · OpenAI · GPT-4-turbo · 2024-04-09（文档） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 4 turbo | 官方文档 · OpenAI · GPT 4 Turbo | 1 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt 4.md | 官方文档 · OpenAI · GPT-4 · 0613（Markdown） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 4 | 官方文档 · OpenAI · GPT-4 · 0613（文档） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 4 | 官方文档 · OpenAI · GPT 4 | 1 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt 4 turbo preview | 官方文档 · OpenAI · GPT 4 Turbo Preview | 1 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt image 2.md | 官方文档 · OpenAI · GPT Image 2 · 2026-04-21（Markdown） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt image 2 | 官方文档 · OpenAI · GPT Image 2 · 2026-04-21（文档） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt image 1.5.md | 官方文档 · OpenAI · GPT-image-1.5 · 2025-12-16（Markdown） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt image 1.5 | 官方文档 · OpenAI · GPT-image-1.5 · 2025-12-16（文档） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt image 1.md | 官方文档 · OpenAI · GPT Image 1（Markdown） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt image 1 | 官方文档 · OpenAI · GPT Image 1（文档） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt image 1 mini.md | 官方文档 · OpenAI · GPT Image 1 Mini（Markdown） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt image 1 mini | 官方文档 · OpenAI · GPT Image 1 Mini（文档） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · chat latest.md | 官方文档 · OpenAI · chat-latest（Markdown） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · chat latest | 官方文档 · OpenAI · chat-latest（文档） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · chatgpt image latest.md | 官方文档 · OpenAI · chatgpt-image-latest（Markdown） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · chatgpt image latest | 官方文档 · OpenAI · chatgpt-image-latest（文档） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 3.5 turbo.md | 官方文档 · OpenAI · GPT-3.5-turbo · 0125（Markdown） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 3.5 turbo | 官方文档 · OpenAI · GPT-3.5-turbo · 0125（文档） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt 3.5 turbo | 官方文档 · OpenAI · GPT 3.5 Turbo | 2 | 2 | 0 |
| 官方文档 · developers.openai.com · gpt image 2.6 flare | 官方文档 · OpenAI · GPT Image 2.6 Flare | 1 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt image 2.6 sunburst | 官方文档 · OpenAI · GPT Image 2.6 Sunburst | 1 | 1 | 0 |
| 官方文档 · developers.openai.com · o1.md | 官方文档 · OpenAI · o1 · 2024-12-17（Markdown） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · o1 | 官方文档 · OpenAI · o1 · 2024-12-17（文档） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · o1 | 官方文档 · OpenAI · o1 | 1 | 1 | 0 |
| 官方文档 · developers.openai.com · o1 pro.md | 官方文档 · OpenAI · o1-pro · 2025-03-19（Markdown） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · o1 pro | 官方文档 · OpenAI · o1-pro · 2025-03-19（文档） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · o1 pro | 官方文档 · OpenAI · O1 Pro | 1 | 1 | 0 |
| 官方文档 · developers.openai.com · o3.md | 官方文档 · OpenAI · o3 · 2025-04-16（Markdown） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · o3 | 官方文档 · OpenAI · o3 · 2025-04-16（文档） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · o3 | 官方文档 · OpenAI · o3 | 1 | 1 | 0 |
| 官方文档 · developers.openai.com · o3 mini.md | 官方文档 · OpenAI · o3-mini · 2025-01-31（Markdown） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · o3 mini | 官方文档 · OpenAI · o3-mini · 2025-01-31（文档） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · o3 mini | 官方文档 · OpenAI · O3 Mini | 1 | 1 | 0 |
| 官方文档 · developers.openai.com · o3 pro.md | 官方文档 · OpenAI · o3-pro · 2025-06-10（Markdown） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · o3 pro | 官方文档 · OpenAI · o3-pro · 2025-06-10（文档） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · o3 pro | 官方文档 · OpenAI · O3 Pro | 1 | 1 | 0 |
| 官方文档 · developers.openai.com · o4 mini.md | 官方文档 · OpenAI · o4-mini · 2025-04-16（Markdown） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · o4 mini | 官方文档 · OpenAI · o4-mini · 2025-04-16（文档） | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · o4 mini | 官方文档 · OpenAI · O4 Mini | 1 | 1 | 0 |
| 官方文档 · volcengine.com · 1330310 | 官方文档 · 火山方舟 · 文档 1330310 | 17 | 28 | 0 |
| 官方文档 · volcengine.com · model release announcement | 官方文档 · 火山方舟 · Model Release Announcement | 6 | 3 | 0 |
| 官方文档 · ark.volcengine.com · DeepSeek-V4.1-Flash 模型页 | 官方文档 · 火山方舟 · DeepSeek V4.1 Flash | 2 | 0 | 0 |
| 官方文档 · volcengine.com · 1159178 | 官方文档 · 火山方舟 · 文档 1159178 | 7 | 0 | 0 |
| 官方文档 · volcengine.com · 1330310 · www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档） | 15 | 0 | 0 |
| 官方文档 · volcengine.com · 1330310 · docs.volcengine.com/docs/82379/1330310?lang=zh | 官方文档 · 火山方舟 · 文档 1330310（文档 2） | 4 | 0 | 0 |
| 官方文档 · volcengine.com · bytedance seed 1 8 | 官方文档 · 火山方舟 · Bytedance Seed 1-8 | 1 | 1 | 0 |
| 官方文档 · volcengine.com · 1330310 · docs.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档 2） | 11 | 0 | 0 |
| 官方文档 · volcengine.com · seedream 4 0 5 0 | 官方文档 · 火山方舟 · Seedream 4-0-5-0 | 6 | 6 | 0 |
| 官方文档 · volcengine.com · image generation api | 官方文档 · 火山方舟 · Image Generation API | 5 | 0 | 0 |
| 官方文档 · volcengine.com · 1824121 | 官方文档 · 火山方舟 · 文档 1824121 | 3 | 0 | 0 |
| 官方文档 · volcengine.com · image generation api · docs.volcengine.com/docs/ark/image-generation-api?lang=en | 官方文档 · 火山方舟 · Image Generation API（英文） | 1 | 0 | 0 |
| 官方文档 · volcengine.com · image generation api · docs.volcengine.com/docs/ark/image-generation-api?lang=zh | 官方文档 · 火山方舟 · Image Generation API（文档） | 1 | 0 | 0 |
| 官方文档 · api.volcengine.com · view | 官方文档 · 火山方舟 · View | 1 | 0 | 0 |
| 官方文档 · volcengine.com · model release announcement 2025 | 官方文档 · 火山方舟 · Model Release Announcement 2025 | 1 | 1 | 0 |
| 官方文档 · developer.volcengine.com · 7577301460712030258 | 官方文档 · 火山方舟 · 文档 7577301460712030258 | 1 | 0 | 0 |
| 官方文档 · volcengine.com · 2549861 | 官方文档 · 火山方舟 · 文档 2549861 | 1 | 0 | 0 |
| 官方文档 · bfl.ml · generate or edit an image with flux2 [flex] | 官方文档 · BFL · FLUX-2-flex | 1 | 1 | 0 |
| 官方文档 · bfl.ai · 文档首页 | 官方文档 · BFL · 文档首页 | 12 | 0 | 0 |
| 官方文档 · bfl.ml · generate or edit an image with flux2 [klein] 4b | 官方文档 · BFL · FLUX-2-klein-4b | 1 | 1 | 0 |
| 官方文档 · bfl.ml · generate or edit an image with flux2 [klein] 9b | 官方文档 · BFL · FLUX-2-klein-9b | 1 | 1 | 0 |
| 官方文档 · bfl.ml · generate or edit an image with flux2 [klein] 9b preview | 官方文档 · BFL · FLUX-2-klein-9b-preview | 1 | 1 | 0 |
| 官方文档 · bfl.ml · generate or edit an image with flux2 [max] | 官方文档 · BFL · FLUX-2-max | 1 | 1 | 0 |
| 官方文档 · bfl.ml · generate or edit an image with flux2 [pro] | 官方文档 · BFL · FLUX-2-pro | 1 | 1 | 0 |
| 官方文档 · bfl.ml · generate or edit an image with flux2 [pro] preview | 官方文档 · BFL · FLUX-2-pro-preview | 1 | 1 | 0 |
| 官方文档 · bfl.ml · edit or create an image with flux1 kontext [max] | 官方文档 · BFL · Edit Or Create An Image With FLUX.1 Kontext [max] | 1 | 1 | 0 |
| 官方文档 · bfl.ml · edit or create an image with flux1 kontext [pro] | 官方文档 · BFL · Edit Or Create An Image With FLUX.1 Kontext [pro] | 1 | 1 | 0 |
| 官方文档 · bfl.ml · generate an image with flux 3 | 官方文档 · BFL · Generate An Image With FLUX 3 | 1 | 1 | 0 |
| 官方文档 · bfl.ml · generate an image with flux 3 klein | 官方文档 · BFL · Generate An Image With FLUX.3 Klein | 1 | 1 | 0 |
| 官方文档 · bfl.ml · generate an image with flux1 [dev] | 官方文档 · BFL · Generate An Image With FLUX.1 [dev] | 1 | 1 | 0 |
| 官方文档 · bfl.ml · generate an image with flux11 [pro] | 官方文档 · BFL · Generate An Image With FLUX.1.1 [pro] | 1 | 1 | 0 |
| 官方文档 · bfl.ml · generate an image with flux11 [pro] ultra mode | 官方文档 · BFL · Generate An Image With FLUX.1.1 [pro] Ultra Mode | 1 | 1 | 0 |
| 官方文档 · stability.ai · api reference | 官方文档 · Stability · API 文档 | 6 | 6 | 0 |
| 官方文档 · stability.ai · 模型列表 | 官方文档 · Stability · 模型列表 | 6 | 0 | 0 |
| 官方文档 · stability.ai · stable diffusion 35 | 官方文档 · Stability · Stable Diffusion 3.5 | 1 | 0 | 0 |
| 官方文档 · stability.ai · 价格与规格 | 官方文档 · Stability · 价格与规格 | 1 | 0 | 0 |
| 官方文档 · developer.ideogram.ai · ideogram 4 | 官方文档 · Ideogram · Ideogram 4 | 1 | 1 | 0 |
| 官方文档 · developer.ideogram.ai · generate v4 · developer.ideogram.ai/v1/api-reference/generate-images/generate-v4 | 官方文档 · Ideogram · Generate V4（文档） | 1 | 0 | 0 |
| 官方文档 · developer.ideogram.ai · 文档首页 | 官方文档 · Ideogram · 文档首页 | 13 | 0 | 0 |
| 官方文档 · developer.ideogram.ai · generate v4 · developer.ideogram.ai/api-reference/generate-images/generate-v4 | 官方文档 · Ideogram · Generate V4（文档 2） | 1 | 0 | 0 |
| 官方文档 · developer.ideogram.ai · ideogram 4 transparent | 官方文档 · Ideogram · Ideogram 4 Transparent | 1 | 1 | 0 |
| 官方文档 · developer.ideogram.ai · generate transparent v4 · developer.ideogram.ai/v1/api-reference/generate-images/generate-transparent-v4 | 官方文档 · Ideogram · Generate Transparent V4（文档） | 1 | 0 | 0 |
| 官方文档 · developer.ideogram.ai · generate transparent v4 · developer.ideogram.ai/api-reference/generate-images/generate-transparent-v4 | 官方文档 · Ideogram · Generate Transparent V4（文档 2） | 1 | 0 | 0 |
| 官方文档 · developer.ideogram.ai · ideogram 3 | 官方文档 · Ideogram · Ideogram 3 | 1 | 1 | 0 |
| 官方文档 · developer.ideogram.ai · generate v3 · developer.ideogram.ai/v1/api-reference/generate-images/generate-v3 | 官方文档 · Ideogram · Generate V3（文档） | 1 | 0 | 0 |
| 官方文档 · developer.ideogram.ai · generate v3 · developer.ideogram.ai/api-reference/generate-images/generate-v3 | 官方文档 · Ideogram · Generate V3（文档 2） | 1 | 0 | 0 |
| 官方文档 · developer.ideogram.ai · ideogram 3 transparent | 官方文档 · Ideogram · Ideogram 3 Transparent | 1 | 1 | 0 |
| 官方文档 · developer.ideogram.ai · generate transparent v3 · developer.ideogram.ai/v1/api-reference/generate-images/generate-transparent-v3 | 官方文档 · Ideogram · Generate Transparent V3（文档） | 1 | 0 | 0 |
| 官方文档 · developer.ideogram.ai · generate transparent v3 · developer.ideogram.ai/api-reference/generate-images/generate-transparent-v3 | 官方文档 · Ideogram · Generate Transparent V3（文档 2） | 1 | 0 | 0 |
| 官方文档 · developer.ideogram.ai · generate · developer.ideogram.ai/v1/api-reference/legacy-endpoints/generate | 官方文档 · Ideogram · Generate（文档） | 7 | 0 | 0 |
| 官方文档 · developer.ideogram.ai · generate · developer.ideogram.ai/api-reference/legacy-endpoints/generate | 官方文档 · Ideogram · Generate（文档 2） | 7 | 0 | 0 |
| 官方文档 · developer.ideogram.ai · ideogram 4 5 · developer.ideogram.ai/v2/api-reference/images/generate/ideogram-4-5 | 官方文档 · Ideogram · Ideogram 4.5（文档） | 1 | 0 | 0 |
| 官方文档 · developer.ideogram.ai · ideogram 4 5 · developer.ideogram.ai/api-reference/images/generate/ideogram-4-5 | 官方文档 · Ideogram · Ideogram 4.5（文档 2） | 1 | 0 | 0 |
| 官方文档 · developer.ideogram.ai · ideogram 4 5 · developer.ideogram.ai/api-reference/images/precise-edit/ideogram-4-5 | 官方文档 · Ideogram · Ideogram 4.5（文档 3） | 1 | 0 | 0 |
| 官方文档 · developer.ideogram.ai · ideogram 4 5 | 官方文档 · Ideogram · Ideogram 4.5 | 1 | 2 | 0 |
| 官方文档 · developer.ideogram.ai · edit with prompt · developer.ideogram.ai/v1/api-reference/edit-images/edit-with-prompt | 官方文档 · Ideogram · Edit With Prompt（文档） | 1 | 0 | 0 |
| 官方文档 · developer.ideogram.ai · edit with prompt · developer.ideogram.ai/api-reference/edit-images/edit-with-prompt | 官方文档 · Ideogram · Edit With Prompt（文档 2） | 1 | 0 | 0 |
| 官方文档 · developer.ideogram.ai · p image ideogram | 官方文档 · Ideogram · p-image-ideogram（文档） | 1 | 0 | 0 |
| 官方文档 · developer.ideogram.ai · generate p image ideogram | 官方文档 · Ideogram · p-image-ideogram（文档 2） | 1 | 0 | 0 |
| 官方文档 · minimax.io · models intro | 官方文档 · MiniMax · Models Intro | 10 | 0 | 0 |
| 官方文档 · minimax.cn · text anthropic api | 官方文档 · MiniMax · Text Anthropic API | 4 | 3 | 0 |
| 官方文档 · minimax.io · text generation | 官方文档 · MiniMax · Text Generation（文档） | 1 | 0 | 0 |
| 官方文档 · minimax.io · text chat openai.md | 官方文档 · MiniMax · Text Chat OpenAI | 1 | 0 | 0 |
| 官方文档 · minimax.io · overview | 官方文档 · MiniMax · 价格与规格 | 1 | 0 | 0 |
| 官方文档 · minimax.cn · text generation | 官方文档 · MiniMax · Text Generation（文档 2） | 1 | 0 | 0 |
| 官方文档 · minimax.io · image generation t2i | 官方文档 · MiniMax · Image Generation T2i | 1 | 1 | 0 |
| 官方文档 · minimax.io · image generation i2i | 官方文档 · MiniMax · Image Generation I2i | 1 | 0 | 0 |
| 官方文档 · minimax.cn · image generation t2i | 官方文档 · MiniMax · Image Generation T2i（文档） | 1 | 0 | 0 |
| 官方文档 · minimax.cn · image generation i2i | 官方文档 · MiniMax · Image Generation I2i | 1 | 0 | 0 |
| 官方文档 · minimaxi.com · image generation t2i | 官方文档 · MiniMax · Image Generation T2i（文档 2） | 1 | 0 | 0 |
| 官方文档 · mistral.ai · mistral large 4 0 | 官方文档 · Mistral · Mistral Large 4-0 | 1 | 1 | 0 |
| 官方文档 · mistral.ai · zai glm 5 3 | 官方文档 · Mistral · zai-glm-5-3 | 1 | 1 | 0 |
| 官方文档 · mistral.ai · models overview | 官方文档 · Mistral · 模型概览 | 16 | 0 | 0 |
| 官方文档 · mistral.ai · mistral medium 3 5 26 04 | 官方文档 · Mistral · Mistral Medium 3-5-26-04 | 3 | 3 | 0 |
| 官方文档 · mistral.ai · zai glm 5 3 flash | 官方文档 · Mistral · GLM 5.3 Flash | 1 | 1 | 0 |
| 官方文档 · mistral.ai · zai glm 5 2 | 官方文档 · Mistral · zai-glm-5-2 | 1 | 1 | 0 |
| 官方文档 · mistral.ai · codestral 25 08 | 官方文档 · Mistral · codestral-2508 | 1 | 1 | 0 |
| 官方文档 · mistral.ai · codestral 25 08 | 官方文档 · Mistral · Codestral · 2508 | 1 | 1 | 0 |
| 官方文档 · mistral.ai · leanstral 1 5 | 官方文档 · Mistral · Leanstral 1-5 | 1 | 1 | 0 |
| 官方文档 · mistral.ai · ministral 3 14b 25 12 | 官方文档 · Mistral · Ministral 3-14b 25-12 | 2 | 2 | 0 |
| 官方文档 · mistral.ai · ministral 3 3b 25 12 | 官方文档 · Mistral · Ministral 3-3b 25-12 | 2 | 2 | 0 |
| 官方文档 · mistral.ai · ministral 3 8b 25 12 | 官方文档 · Mistral · Ministral 3-8b 25-12 | 2 | 2 | 0 |
| 官方文档 · mistral.ai · mistral large 3 25 12 | 官方文档 · Mistral · Mistral Large 3-25-12 | 1 | 1 | 0 |
| 官方文档 · mistral.ai · mistral small 4 0 26 03 | 官方文档 · Mistral · Mistral Small 4-0-26-03 | 1 | 1 | 0 |
| 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models | 48 | 15 | 0 |
| 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 | 53 | 5 | 0 |
| 官方文档 · Hugging Face · MiniMax M3 | 官方文档 · Hugging Face · Minimax M3 | 1 | 1 | 0 |
| 官方文档 · Hugging Face · Qwen3.8 2.4T A95B | 官方文档 · Hugging Face · Qwen3.8-2.4T-A95B | 1 | 0 | 0 |
| 官方文档 · 百炼 · wan2 6 image | 官方文档 · 百炼 · Wan 2.6 Image | 1 | 1 | 0 |
| 官方文档 · bfl.ml · generate or edit an image with flux2 [flex] | 官方文档 · BFL · FLUX.2 \[flex] | 1 | 1 | 0 |
| 官方文档 · together.ai · overview | 官方文档 · Together · Images | 5 | 0 | 0 |
| 官方文档 · together.ai · reference images | 官方文档 · Together · Reference Images | 5 | 0 | 0 |
| 官方文档 · together.ai · parameters | 官方文档 · Together · Parameters | 5 | 0 | 0 |
| 官方文档 · bfl.ml · generate or edit an image with flux2 [pro] | 官方文档 · BFL · FLUX.2 \[pro] | 1 | 1 | 0 |
| 官方文档 · ai.google.dev · gemini 3 pro image | 官方文档 · Google · Gemini 3 Pro Image | 4 | 3 | 0 |
| 原厂规格 · developers.openai.com · gpt image 2.md | 原厂规格 · OpenAI · GPT Image 2 | 1 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt image 2 | 官方文档 · OpenAI · GPT Image 2 | 1 | 0 | 0 |
| 原厂规格 · developers.openai.com · gpt image 1.5.md | 原厂规格 · OpenAI · GPT Image 1.5 | 1 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt image 1.5 | 官方文档 · OpenAI · GPT Image 1.5 | 1 | 0 | 0 |
| 官方文档 · bigmodel.cn · glm 5.3 flash | 官方文档 · 智谱 · GLM-5.3 Flash | 1 | 1 | 0 |
| 官方文档 · Hugging Face · Ternary Bonsai 27B gguf | 官方文档 · Hugging Face · Ternary Bonsai 27B Gguf | 1 | 1 | 0 |
| 官方文档 · bfl.ml · edit or create an image with flux1 kontext [max] | 官方文档 · BFL · Flux.1 Kontext \[max] | 1 | 1 | 0 |
| 官方文档 · bfl.ml · edit or create an image with flux1 kontext [pro] | 官方文档 · BFL · Flux.1 Kontext \[pro] | 1 | 1 | 0 |
| 官方文档 · bfl.ml · generate an image with flux11 [pro] | 官方文档 · BFL · Flux1.1 \[pro] | 1 | 1 | 0 |
| 官方文档 · ai.google.dev · gemini 2.5 flash image | 官方文档 · Google · Gemini 2.5 Flash Image | 4 | 4 | 0 |
| 官方文档 · ai.google.dev · gemini 3.1 flash image | 官方文档 · Google · Gemini 3.1 Flash Image | 4 | 3 | 0 |
| 官方文档 · ai.google.dev · gemini 3.1 flash lite image | 官方文档 · Google · Gemini 3.1 Flash Lite Image | 4 | 3 | 0 |
| 官方文档 · together.ai · llama 3 3 70b | 官方文档 · Together · Llama 3.3 70B | 1 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt oss 120b | 官方文档 · OpenAI · GPT-OSS 120B | 1 | 1 | 0 |
| 官方文档 · fireworks.ai · glm 5p3 | 官方文档 · Fireworks · GLM 5.3（文档） | 1 | 0 | 0 |
| 官方文档 · app.fireworks.ai · glm 5p3 | 官方文档 · Fireworks · GLM 5.3（控制台） | 1 | 0 | 0 |
| 官方文档 · fireworks.ai · glm 5p3 flash | 官方文档 · Fireworks · GLM 5.3 Flash（文档） | 1 | 0 | 0 |
| 官方文档 · app.fireworks.ai · glm 5p3 flash | 官方文档 · Fireworks · GLM 5.3 Flash（控制台） | 1 | 0 | 0 |
| 官方文档 · fireworks.ai · Kimi-K3 模型页 | 官方文档 · Fireworks · Kimi K3（文档） | 1 | 0 | 0 |
| 官方文档 · app.fireworks.ai · Kimi-K3 模型页 | 官方文档 · Fireworks · Kimi K3（控制台） | 1 | 0 | 0 |
| 官方文档 · fireworks.ai · kimi k2p5 | 官方文档 · Fireworks · Kimi K2.5（文档） | 1 | 0 | 0 |
| 官方文档 · app.fireworks.ai · kimi k2p5 | 官方文档 · Fireworks · Kimi K2.5（控制台） | 1 | 0 | 0 |
| 官方文档 · fireworks.ai · minimax m3 | 官方文档 · Fireworks · MiniMax M3（文档） | 1 | 0 | 0 |
| 官方文档 · app.fireworks.ai · minimax m3 | 官方文档 · Fireworks · MiniMax M3（控制台） | 1 | 0 | 0 |
| 官方文档 · fireworks.ai · qwen3p8 max | 官方文档 · Fireworks · Qwen 3.8 Max（文档） | 1 | 0 | 0 |
| 官方文档 · app.fireworks.ai · qwen3p8 max | 官方文档 · Fireworks · Qwen 3.8 Max（控制台） | 1 | 0 | 0 |
| 官方文档 · fireworks.ai · qwen3p7 plus | 官方文档 · Fireworks · Qwen 3.7 Plus（文档） | 1 | 0 | 0 |
| 官方文档 · app.fireworks.ai · qwen3p7 plus | 官方文档 · Fireworks · Qwen 3.7 Plus（控制台） | 1 | 0 | 0 |
| 官方文档 · fireworks.ai · qwen3 8b | 官方文档 · Fireworks · Qwen3 8B（文档） | 1 | 0 | 0 |
| 官方文档 · app.fireworks.ai · qwen3 8b | 官方文档 · Fireworks · Qwen3 8B（控制台） | 1 | 0 | 0 |
| 官方文档 · fireworks.ai · deepseek v4p1 flash | 官方文档 · Fireworks · DeepSeek-V4.1-Flash | 1 | 1 | 0 |
| 官方文档 · fireworks.ai · deepseek v4p1 flash 1017 | 官方文档 · Fireworks · DeepSeek V4.1 Flash 1017 | 1 | 1 | 0 |
| 官方文档 · fireworks.ai · 模型列表 | 官方文档 · Fireworks · 模型列表 | 1 | 0 | 0 |
| 官方文档 · fireworks.ai · gemma 4 31b it | 官方文档 · Fireworks · Gemma 4-31b It（文档） | 1 | 0 | 0 |
| 官方文档 · app.fireworks.ai · gemma 4 31b it | 官方文档 · Fireworks · Gemma 4-31b It（控制台） | 1 | 0 | 0 |
| 官方文档 · fireworks.ai · gpt oss 120b | 官方文档 · Fireworks · GPT-OSS 120B（文档） | 1 | 0 | 0 |
| 官方文档 · app.fireworks.ai · gpt oss 120b | 官方文档 · Fireworks · GPT-OSS 120B（控制台） | 1 | 0 | 0 |
| 官方文档 · fireworks.ai · kimi k3p1 pro | 官方文档 · Fireworks · Kimi K3.1 Pro | 1 | 1 | 0 |
| 官方文档 · fireworks.ai · minimax m3p1 flash | 官方文档 · Fireworks · MiniMax M3.1 Flash | 1 | 1 | 0 |
| 官方文档 · fireworks.ai · muse spark open | 官方文档 · Fireworks · Muse Spark Open | 1 | 1 | 0 |
| 官方文档 · fireworks.ai · nemotron 3 ultra nvfp4 | 官方文档 · Fireworks · Nemotron 3 Ultra Nvfp4（文档） | 1 | 0 | 0 |
| 官方文档 · app.fireworks.ai · nemotron 3 ultra nvfp4 | 官方文档 · Fireworks · Nemotron 3 Ultra Nvfp4（控制台） | 1 | 0 | 0 |
| 官方文档 · fireworks.ai · nemotron lightning 3p5 30b a3b | 官方文档 · Fireworks · Nemotron Lightning 3p5-30b A3b（文档） | 1 | 0 | 0 |
| 官方文档 · app.fireworks.ai · nemotron lightning 3p5 30b a3b | 官方文档 · Fireworks · Nemotron Lightning 3p5-30b A3b（控制台） | 1 | 0 | 0 |
| 官方文档 · fireworks.ai · nvidia nemotron 3 nano omni 30b a3b | 官方文档 · Fireworks · NVIDIA Nemotron 3 Nano Omni 30B A3B（文档） | 1 | 0 | 0 |
| 官方文档 · app.fireworks.ai · nvidia nemotron 3 nano omni 30b a3b | 官方文档 · Fireworks · NVIDIA Nemotron 3 Nano Omni 30B A3B（控制台） | 1 | 0 | 0 |
| 官方文档 · fireworks.ai · qwen3 omni 30b a3b instruct | 官方文档 · Fireworks · Qwen3 Omni 30B A3B Instruct（文档） | 1 | 0 | 0 |
| 官方文档 · app.fireworks.ai · qwen3 omni 30b a3b instruct | 官方文档 · Fireworks · Qwen3 Omni 30B A3B Instruct（控制台） | 1 | 0 | 0 |
| 官方文档 · fireworks.ai · step 3p7 flash nvfp4 | 官方文档 · Fireworks · Step 3.7 Flash · NVFP4（文档） | 1 | 0 | 0 |
| 官方文档 · app.fireworks.ai · step 3p7 flash nvfp4 | 官方文档 · Fireworks · Step 3.7 Flash · NVFP4（控制台） | 1 | 0 | 0 |
| 官方文档 · fal.ai · api | 官方文档 · fal · Qwen-image-3 API 文档 | 1 | 1 | 0 |
| 官方文档 · fal.ai · api · fal.ai/models/bytedance/seedream/v5/flash/text-to-image/api | 官方文档 · fal · Seedream v5 Flash API 文档 | 1 | 0 | 0 |
| 官方文档 · fal.ai · api · fal.ai/models/bytedance/seedream/v5/flash/edit/api | 官方文档 · fal · Seedream v5 Flash Edit API 文档 | 1 | 0 | 0 |
| 官方文档 · fal.ai · api | 官方文档 · fal · Seedream · v5 · pro API 文档 | 1 | 1 | 0 |
| 官方文档 · fal.ai · api | 官方文档 · fal · Seedream · v5 · lite · edit API 文档 | 1 | 1 | 0 |
| 官方文档 · fal.ai · api | 官方文档 · fal · Seedream · v4.5 API 文档 | 1 | 1 | 0 |
| 官方文档 · fal.ai · api | 官方文档 · fal · Seedream · v4 API 文档 | 1 | 1 | 0 |
| 官方文档 · fal.ai · api | 官方文档 · fal · fast-sdxl API 文档 | 1 | 1 | 0 |
| 官方文档 · fal.ai · api | 官方文档 · fal · FLUX-2 API 文档 | 1 | 1 | 0 |
| 官方文档 · fal.ai · api | 官方文档 · fal · FLUX-2-flex API 文档 | 1 | 1 | 0 |
| 官方文档 · fal.ai · api | 官方文档 · fal · FLUX-2-pro API 文档 | 1 | 1 | 0 |
| 官方文档 · fal.ai · api | 官方文档 · fal · FLUX-2 · flash API 文档 | 1 | 1 | 0 |
| 官方文档 · fal.ai · api | 官方文档 · fal · FLUX-2 · klein · 9b API 文档 | 1 | 1 | 0 |
| 官方文档 · fal.ai · api | 官方文档 · fal · FLUX-2 · turbo API 文档 | 1 | 1 | 0 |
| 官方文档 · fal.ai · api | 官方文档 · fal · FLUX-kontext-lora API 文档 | 1 | 1 | 0 |
| 官方文档 · fal.ai · api | 官方文档 · fal · FLUX-pro · kontext API 文档 | 1 | 1 | 0 |
| 官方文档 · fal.ai · api | 官方文档 · fal · FLUX-pro · v1.1 API 文档 | 1 | 1 | 0 |
| 官方文档 · fal.ai · api | 官方文档 · fal · FLUX-pro · v1.1-ultra API 文档 | 1 | 1 | 0 |
| 官方文档 · fal.ai · api · fal.ai/models/blackforestlabs/flux-3/klein/base/text-to-image/api | 官方文档 · fal · FLUX.3 Klein Base API 文档 | 1 | 0 | 0 |
| 官方文档 · fal.ai · api · fal.ai/models/blackforestlabs/flux-3/klein/base/edit-image/api | 官方文档 · fal · FLUX.3 Klein Base Edit Image API 文档 | 1 | 0 | 0 |
| 官方文档 · fal.ai · api · fal.ai/models/blackforestlabs/flux-3/klein/text-to-image/api | 官方文档 · fal · FLUX.3 Klein API 文档 | 1 | 0 | 0 |
| 官方文档 · fal.ai · api · fal.ai/models/blackforestlabs/flux-3/klein/edit-image/api | 官方文档 · fal · FLUX.3 Klein Edit Image API 文档 | 1 | 0 | 0 |
| 官方文档 · fal.ai · api · fal.ai/models/blackforestlabs/flux-3/text-to-image/api | 官方文档 · fal · FLUX.3 API 文档 | 1 | 0 | 0 |
| 官方文档 · fal.ai · api · fal.ai/models/blackforestlabs/flux-3/edit-image/api | 官方文档 · fal · FLUX.3 Edit Image API 文档 | 1 | 0 | 0 |
| 官方文档 · fal.ai · api | 官方文档 · fal · FLUX-1 · schnell API 文档 | 1 | 1 | 0 |
| 官方文档 · fal.ai · api | 官方文档 · fal · FLUX-lora API 文档 | 1 | 1 | 0 |
| 官方文档 · fal.ai · api | 官方文档 · fal · FLUX · dev API 文档 | 1 | 1 | 0 |
| 官方文档 · fal.ai · api | 官方文档 · fal · FLUX · schnell API 文档 | 1 | 1 | 0 |
| 官方文档 · fal.ai · api | 官方文档 · fal · Ideogram V3 API 文档 | 1 | 1 | 0 |
| 官方文档 · fal.ai · api | 官方文档 · fal · nano-banana-2 API 文档 | 1 | 0 | 0 |
| 官方文档 · fal.ai · api | 官方文档 · fal · Qwen-image API 文档 | 1 | 1 | 0 |
| 官方文档 · fal.ai · api | 官方文档 · fal · Recraft V4 Pro API 文档 | 1 | 1 | 0 |
| 官方文档 · fal.ai · api | 官方文档 · fal · Recraft V3 API 文档 | 1 | 1 | 0 |
| 官方文档 · fal.ai · api | 官方文档 · fal · nano-banana-2-lite API 文档 | 1 | 0 | 0 |
| 官方文档 · fal.ai · api | 官方文档 · fal · nano-banana-pro API 文档 | 1 | 0 | 0 |
| 官方文档 · fal.ai · api | 官方文档 · fal · nano-banana API 文档 | 1 | 0 | 0 |
| 官方文档 · fal.ai · api · fal.ai/models/google/nano-banana-2.1/api | 官方文档 · fal · Nano Banana 2.1 API 文档 | 1 | 0 | 0 |
| 官方文档 · fal.ai · api · fal.ai/models/google/nano-banana-2.1/edit/api | 官方文档 · fal · Nano Banana 2.1 Edit API 文档 | 1 | 0 | 0 |
| 官方文档 · fal.ai · api | 官方文档 · fal · GPT Image 2.5 Flare API 文档 | 1 | 1 | 0 |
| 官方文档 · fal.ai · api | 官方文档 · fal · GPT Image 2.5 Sunburst API 文档 | 1 | 1 | 0 |
| 官方文档 · fal.ai · api | 官方文档 · fal · GPT-image-2 API 文档 | 1 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt image 2 | 官方文档 · OpenAI · GPT-image-2 | 2 | 1 | 0 |
| 官方文档 · fal.ai · api | 官方文档 · fal · GPT-image-1.5 API 文档 | 1 | 1 | 0 |
| 官方文档 · fal.ai · api | 官方文档 · fal · Grok-imagine-image · v2.0 API 文档 | 1 | 1 | 0 |
| 官方文档 · fal.ai · api | 官方文档 · fal · Grok-imagine-image API 文档 | 1 | 1 | 0 |
| 官方文档 · fal.ai · api | 官方文档 · fal · Grok-imagine-image · quality API 文档 | 1 | 1 | 0 |
| 官方文档 · fal.ai · api | 官方文档 · fal · fibo-edit-1.5 · edit API 文档 | 1 | 1 | 0 |
| 官方文档 · fal.ai · api | 官方文档 · fal · fibo-gen-1.5 API 文档 | 1 | 1 | 0 |
| 官方文档 · fal.ai · api | 官方文档 · fal · krea-2 · turbo API 文档 | 1 | 1 | 0 |
| 官方文档 · fal.ai · api | 官方文档 · fal · z-image · turbo API 文档 | 1 | 1 | 0 |
| 官方文档 · fal.ai · api · fal.ai/models/ideogram/v4.5/api | 官方文档 · fal · Ideogram 4.5 API 文档 | 1 | 0 | 0 |
| 官方文档 · fal.ai · api · fal.ai/models/ideogram/v4.5/edit/api | 官方文档 · fal · V4.5 Edit API 文档 | 1 | 0 | 0 |
| 官方文档 · fal.ai · api | 官方文档 · fal · imagineart-2.0-preview API 文档 | 1 | 1 | 0 |
| 官方文档 · fal.ai · api | 官方文档 · fal · Krea V2 Large API 文档 | 1 | 1 | 0 |
| 官方文档 · fal.ai · api · fal.ai/models/krea/v3/text-to-image/api | 官方文档 · fal · Krea 3 API 文档 | 1 | 0 | 0 |
| 官方文档 · fal.ai · api · fal.ai/models/krea/v3/edit/api | 官方文档 · fal · V3 Edit API 文档 | 1 | 0 | 0 |
| 官方文档 · fal.ai · api | 官方文档 · fal · muse-image API 文档 | 1 | 1 | 0 |
| 官方文档 · ai.google.dev · gemini 3.5 flash | 官方文档 · Google · gemini-3.5-flash | 1 | 1 | 0 |
| 官方文档 · replicate.com · gemini 3.5 flash | 官方文档 · Replicate · gemini-3.5-flash | 1 | 0 | 0 |
| 官方文档 · Hugging Face · DeepSeek V3.1 | 官方文档 · Hugging Face · deepseek-v3.1 | 1 | 1 | 0 |
| 官方文档 · replicate.com · deepseek v3.1 | 官方文档 · Replicate · deepseek-v3.1 | 1 | 0 | 0 |
| 官方文档 · replicate.com · qwen image 3 | 官方文档 · Replicate · Qwen-image-3 | 1 | 1 | 0 |
| 官方文档 · replicate.com · official | 官方文档 · Replicate · Official | 97 | 0 | 0 |
| 官方文档 · replicate.com · qwen image 3 pro | 官方文档 · Replicate · Qwen-image-3-pro | 1 | 1 | 0 |
| 官方文档 · replicate.com · wan 3 | 官方文档 · Replicate · wan-3 | 1 | 1 | 0 |
| 官方文档 · replicate.com · claude opus 5.5 | 官方文档 · Replicate · Claude Opus 5.5 | 1 | 1 | 0 |
| 官方文档 · replicate.com · flux 2 flex | 官方文档 · Replicate · FLUX-2-flex | 1 | 1 | 0 |
| 官方文档 · replicate.com · flux 2 klein 4b | 官方文档 · Replicate · FLUX-2-klein-4b | 1 | 1 | 0 |
| 官方文档 · replicate.com · flux 2 max | 官方文档 · Replicate · FLUX-2-max | 1 | 1 | 0 |
| 官方文档 · replicate.com · flux 2 pro | 官方文档 · Replicate · FLUX-2-pro | 1 | 1 | 0 |
| 官方文档 · replicate.com · flux kontext dev | 官方文档 · Replicate · FLUX-kontext-dev | 1 | 1 | 0 |
| 官方文档 · replicate.com · flux kontext max | 官方文档 · Replicate · FLUX-kontext-max | 1 | 1 | 0 |
| 官方文档 · replicate.com · flux kontext pro | 官方文档 · Replicate · FLUX-kontext-pro | 1 | 1 | 0 |
| 官方文档 · replicate.com · seedream 5 lite | 官方文档 · Replicate · Seedream-5-lite | 1 | 1 | 0 |
| 官方文档 · replicate.com · seedream 4.5 | 官方文档 · Replicate · Seedream-4.5 | 1 | 1 | 0 |
| 官方文档 · replicate.com · seedream 4 | 官方文档 · Replicate · Seedream-4 | 1 | 1 | 0 |
| 官方文档 · replicate.com · seedream 3 | 官方文档 · Replicate · Seedream-3 | 1 | 1 | 0 |
| 官方文档 · replicate.com · gemini 3 flash | 官方文档 · Replicate · gemini-3-flash | 1 | 1 | 0 |
| 官方文档 · ai.google.dev · gemini 2.5 flash | 官方文档 · Google · gemini-2.5-flash | 1 | 1 | 0 |
| 官方文档 · replicate.com · gemini 2.5 flash | 官方文档 · Replicate · gemini-2.5-flash | 1 | 0 | 0 |
| 原厂规格 · cloud.google.com · 4 0 generate | 原厂规格 · Google Cloud · 4-0 Generate | 3 | 3 | 0 |
| 原厂规格 · cloud.google.com · 3 0 generate | 原厂规格 · Google Cloud · 3-0 Generate | 2 | 2 | 0 |
| 官方文档 · replicate.com · nano banana 2 | 官方文档 · Replicate · nano-banana-2 | 1 | 0 | 0 |
| 官方文档 · replicate.com · nano banana 2 lite | 官方文档 · Replicate · Nano Banana 2 Lite | 1 | 0 | 0 |
| 官方文档 · replicate.com · nano banana pro | 官方文档 · Replicate · nano-banana-pro | 1 | 0 | 0 |
| 官方文档 · replicate.com · nano banana | 官方文档 · Replicate · nano-banana | 1 | 0 | 0 |
| 官方文档 · replicate.com · nano banana 2.1 | 官方文档 · Replicate · Nano Banana 2.1 | 1 | 1 | 0 |
| 官方文档 · replicate.com · ideogram v3 balanced | 官方文档 · Replicate · ideogram-v3-balanced | 1 | 1 | 0 |
| 官方文档 · replicate.com · ideogram v3 quality | 官方文档 · Replicate · ideogram-v3-quality | 1 | 1 | 0 |
| 官方文档 · replicate.com · ideogram v3 turbo | 官方文档 · Replicate · ideogram-v3-turbo | 1 | 1 | 0 |
| 官方文档 · replicate.com · ideogram v2a | 官方文档 · Replicate · ideogram-v2a | 1 | 1 | 0 |
| 官方文档 · replicate.com · ideogram v2a turbo | 官方文档 · Replicate · ideogram-v2a-turbo | 1 | 1 | 0 |
| 官方文档 · replicate.com · ideogram v2 | 官方文档 · Replicate · ideogram-v2 | 1 | 1 | 0 |
| 官方文档 · replicate.com · ideogram v2 turbo | 官方文档 · Replicate · ideogram-v2-turbo | 1 | 1 | 0 |
| 官方文档 · Hugging Face · Kimi K2 Thinking | 官方文档 · Hugging Face · kimi-k2-thinking | 1 | 1 | 0 |
| 官方文档 · replicate.com · kimi k2 thinking | 官方文档 · Replicate · kimi-k2-thinking | 1 | 0 | 0 |
| 官方文档 · replicate.com · gpt image 2.5 flare | 官方文档 · Replicate · GPT Image 2.5 Flare | 1 | 0 | 0 |
| 官方文档 · replicate.com · gpt image 2.5 sunburst | 官方文档 · Replicate · GPT Image 2.5 Sunburst | 1 | 0 | 0 |
| 官方文档 · replicate.com · gpt image 2 | 官方文档 · Replicate · GPT-image-2 | 1 | 0 | 0 |
| 官方文档 · developers.openai.com · gpt image 1.5 | 官方文档 · OpenAI · GPT-image-1.5 | 1 | 1 | 0 |
| 官方文档 · replicate.com · gpt image 1.5 | 官方文档 · Replicate · GPT-image-1.5 | 1 | 0 | 0 |
| 官方文档 · replicate.com · flux kontext fast | 官方文档 · Replicate · FLUX-kontext-fast | 1 | 1 | 0 |
| 官方文档 · replicate.com · flux 1.1 pro | 官方文档 · Replicate · FLUX-1.1-pro | 1 | 1 | 0 |
| 官方文档 · replicate.com · flux 1.1 pro ultra | 官方文档 · Replicate · FLUX-1.1-pro-ultra | 1 | 1 | 0 |
| 官方文档 · replicate.com · flux 3 image | 官方文档 · Replicate · FLUX 3 Image | 1 | 1 | 0 |
| 官方文档 · replicate.com · flux dev | 官方文档 · Replicate · FLUX-dev | 1 | 1 | 0 |
| 官方文档 · replicate.com · flux dev lora | 官方文档 · Replicate · FLUX-dev-lora | 1 | 1 | 0 |
| 官方文档 · replicate.com · flux pro | 官方文档 · Replicate · FLUX-pro | 1 | 1 | 0 |
| 官方文档 · replicate.com · flux schnell | 官方文档 · Replicate · FLUX-schnell | 1 | 1 | 0 |
| 官方文档 · replicate.com · flux fast | 官方文档 · Replicate · FLUX-fast | 1 | 1 | 0 |
| 官方文档 · replicate.com · qwen image | 官方文档 · Replicate · Qwen-image | 1 | 1 | 0 |
| 官方文档 · replicate.com · qwen image edit | 官方文档 · Replicate · Qwen-image-edit | 1 | 1 | 0 |
| 官方文档 · replicate.com · qwen image edit plus | 官方文档 · Replicate · Qwen-image-edit-plus | 1 | 1 | 0 |
| 官方文档 · Hugging Face · Qwen3 235B A22B Instruct 2507 | 官方文档 · Hugging Face · qwen3-235b-a22b-instruct-2507 | 1 | 1 | 0 |
| 官方文档 · replicate.com · qwen3 235b a22b instruct 2507 | 官方文档 · Replicate · qwen3-235b-a22b-instruct-2507 | 1 | 0 | 0 |
| 官方文档 · replicate.com · qwen3 7 plus | 官方文档 · Replicate · Qwen3.7 Plus | 1 | 0 | 0 |
| 官方文档 · replicate.com · recraft v4.1 | 官方文档 · Replicate · recraft-v4.1 | 1 | 1 | 0 |
| 官方文档 · replicate.com · recraft v4 pro | 官方文档 · Replicate · recraft-v4-pro | 1 | 1 | 0 |
| 官方文档 · replicate.com · recraft v3 | 官方文档 · Replicate · recraft-v3 | 1 | 1 | 0 |
| 官方文档 · replicate.com · stable diffusion 3.5 large | 官方文档 · Replicate · stable-diffusion-3.5-large | 1 | 1 | 0 |
| 官方文档 · replicate.com · stable diffusion 3.5 large turbo | 官方文档 · Replicate · stable-diffusion-3.5-large-turbo | 1 | 1 | 0 |
| 官方文档 · replicate.com · stable diffusion 3.5 medium | 官方文档 · Replicate · stable-diffusion-3.5-medium | 1 | 1 | 0 |
| 官方文档 · replicate.com · sdxl | 官方文档 · Replicate · sdxl | 1 | 1 | 0 |
| 官方文档 · replicate.com · stable diffusion | 官方文档 · Replicate · stable-diffusion | 1 | 1 | 0 |
| 官方文档 · replicate.com · wan 2.7 image | 官方文档 · Replicate · wan-2.7-image | 1 | 1 | 0 |
| 官方文档 · replicate.com · wan 2.7 image pro | 官方文档 · Replicate · wan-2.7-image-pro | 1 | 1 | 0 |
| 官方文档 · replicate.com · wan 2.2 image | 官方文档 · Replicate · wan-2.2-image | 1 | 1 | 0 |
| 官方文档 · replicate.com · grok imagine image | 官方文档 · Replicate · Grok-imagine-image | 1 | 1 | 0 |
| 官方文档 · replicate.com · grok imagine image 2 | 官方文档 · Replicate · Grok-imagine-image-2 | 1 | 1 | 0 |
| 官方文档 · replicate.com · realvisxl v3.0 turbo | 官方文档 · Replicate · adirik · realvisxl-v3.0-turbo | 1 | 1 | 0 |
| 官方文档 · replicate.com · kandinsky 2 | 官方文档 · Replicate · kandinsky-2 | 1 | 1 | 0 |
| 官方文档 · replicate.com · kandinsky 2.2 | 官方文档 · Replicate · kandinsky-2.2 | 1 | 1 | 0 |
| 官方文档 · replicate.com · fibo | 官方文档 · Replicate · fibo | 1 | 1 | 0 |
| 官方文档 · replicate.com · fibo edit | 官方文档 · Replicate · fibo-edit | 1 | 1 | 0 |
| 官方文档 · replicate.com · image 3.2 | 官方文档 · Replicate · image-3.2 | 1 | 1 | 0 |
| 官方文档 · replicate.com · bagel | 官方文档 · Replicate · bagel | 1 | 1 | 0 |
| 官方文档 · replicate.com · sdxl lightning 4step | 官方文档 · Replicate · sdxl-lightning-4step | 1 | 1 | 0 |
| 官方文档 · replicate.com · proteus v0.2 | 官方文档 · Replicate · datacte · proteus-v0.2 | 1 | 1 | 0 |
| 官方文档 · replicate.com · proteus v0.3 | 官方文档 · Replicate · datacte · proteus-v0.3 | 1 | 1 | 0 |
| 官方文档 · replicate.com · latent consistency model | 官方文档 · Replicate · fofr · latent-consistency-model | 1 | 1 | 0 |
| 官方文档 · replicate.com · sdxl emoji | 官方文档 · Replicate · fofr · sdxl-emoji | 1 | 1 | 0 |
| 官方文档 · replicate.com · sticker maker | 官方文档 · Replicate · fofr · sticker-maker | 1 | 1 | 0 |
| 官方文档 · replicate.com · ideogram 4 5 | 官方文档 · Replicate · Ideogram 4.5 | 1 | 1 | 0 |
| 官方文档 · replicate.com · ideogram 4 5 precise edit | 官方文档 · Replicate · Ideogram 4.5 Precise Edit | 1 | 1 | 0 |
| 官方文档 · replicate.com · krea 2 medium | 官方文档 · Replicate · krea-2-medium | 1 | 1 | 0 |
| 官方文档 · replicate.com · lucid origin | 官方文档 · Replicate · lucid-origin | 1 | 1 | 0 |
| 官方文档 · replicate.com · dreamshaper xl turbo | 官方文档 · Replicate · lucataco · dreamshaper-xl-turbo | 1 | 1 | 0 |
| 官方文档 · replicate.com · omnigen2 | 官方文档 · Replicate · lucataco · omnigen2 | 1 | 1 | 0 |
| 官方文档 · replicate.com · open dalle v1.1 | 官方文档 · Replicate · lucataco · open-dalle-v1.1 | 1 | 1 | 0 |
| 官方文档 · replicate.com · realistic vision v5.1 | 官方文档 · Replicate · lucataco · realistic-vision-v5.1 | 1 | 1 | 0 |
| 官方文档 · replicate.com · ssd 1b | 官方文档 · Replicate · lucataco · ssd-1b | 1 | 1 | 0 |
| 官方文档 · replicate.com · photon | 官方文档 · Replicate · photon | 1 | 1 | 0 |
| 官方文档 · replicate.com · photon flash | 官方文档 · Replicate · photon-flash | 1 | 1 | 0 |
| 官方文档 · replicate.com · image 01 | 官方文档 · Replicate · image-01 | 1 | 1 | 0 |
| 官方文档 · replicate.com · sana | 官方文档 · Replicate · sana | 1 | 1 | 0 |
| 官方文档 · replicate.com · sana sprint 1.6b | 官方文档 · Replicate · sana-sprint-1.6b | 1 | 1 | 0 |
| 官方文档 · replicate.com · playground v2.5 1024px aesthetic | 官方文档 · Replicate · playground-v2.5-1024px-aesthetic | 1 | 1 | 0 |
| 官方文档 · replicate.com · hidream l1 dev | 官方文档 · Replicate · hidream-l1-dev | 1 | 1 | 0 |
| 官方文档 · replicate.com · hidream l1 fast | 官方文档 · Replicate · hidream-l1-fast | 1 | 1 | 0 |
| 官方文档 · replicate.com · hidream l1 full | 官方文档 · Replicate · hidream-l1-full | 1 | 1 | 0 |
| 官方文档 · replicate.com · p image | 官方文档 · Replicate · p-image | 1 | 1 | 0 |
| 官方文档 · replicate.com · p image edit | 官方文档 · Replicate · p-image-edit | 1 | 1 | 0 |
| 官方文档 · replicate.com · p image ideogram | 官方文档 · Replicate · p-image-ideogram | 1 | 1 | 0 |
| 官方文档 · replicate.com · p image lora | 官方文档 · Replicate · p-image-lora | 1 | 1 | 0 |
| 官方文档 · replicate.com · sdxl lightning | 官方文档 · Replicate · sdxl-lightning | 1 | 1 | 0 |
| 官方文档 · replicate.com · z image turbo | 官方文档 · Replicate · z-image-turbo | 1 | 1 | 0 |
| 官方文档 · replicate.com · riverflow 2.0 pro | 官方文档 · Replicate · riverflow-2.0-pro | 1 | 1 | 0 |
| 官方文档 · replicate.com · hunyuan image 3 | 官方文档 · Replicate · hunyuan-image-3 | 1 | 1 | 0 |
| 官方文档 · replicate.com · material diffusion | 官方文档 · Replicate · tstramer · material-diffusion | 1 | 1 | 0 |
| 官方文档 · replicate.com · step1x edit | 官方文档 · Replicate · zsxkib · step1x-edit | 1 | 1 | 0 |
| 官方文档 · TokenDance · deepseek v4.1 flash | 官方文档 · TokenDance · DeepSeek-V4.1-Flash | 1 | 1 | 0 |
| 官方文档 · TokenDance · deepseek v4.1 flash 1017 | 官方文档 · TokenDance · DeepSeek V4.1 Flash 1017 | 1 | 1 | 0 |
| 原厂规格 · DeepSeek · news260821 | 原厂规格 · DeepSeek · News260821 | 1 | 1 | 0 |
| 官方文档 · TokenDance · deepseek v4 pro 0813 | 官方文档 · TokenDance · DeepSeek-V4-Pro-0813 | 1 | 1 | 0 |
| 官方文档 · TokenDance · deepseek v4 flash 0731 | 官方文档 · TokenDance · DeepSeek-V4-Flash-0731 | 1 | 1 | 0 |
| 原厂规格 · Hugging Face · DeepSeek V4 Flash | 原厂规格 · Hugging Face · DeepSeek-V4-Flash Preview | 1 | 1 | 0 |
| 官方文档 · DeepSeek · news260424 | 官方文档 · DeepSeek · News260424 | 1 | 0 | 0 |
| 官方文档 · TokenDance · deepseek v4 pro | 官方文档 · TokenDance · DeepSeek-V4-Pro Preview | 1 | 1 | 0 |
| 原厂规格 · Hugging Face · DeepSeek V3.2 | 原厂规格 · Hugging Face · DeepSeek-V3.2 | 1 | 1 | 0 |
| 官方文档 · TokenDance · glm 5.3 | 官方文档 · TokenDance · GLM 5.3 | 1 | 1 | 0 |
| 官方文档 · TokenDance · glm 5.3 flash | 官方文档 · TokenDance · GLM 5.3 Flash | 1 | 1 | 0 |
| 官方文档 · TokenDance · glm 5.3 flashx | 官方文档 · TokenDance · GLM 5.3 FlashX | 1 | 1 | 0 |
| 官方文档 · TokenDance · glm 5.2 | 官方文档 · TokenDance · GLM 5.2 | 1 | 1 | 0 |
| 官方文档 · TokenDance · glm 5.1 | 官方文档 · TokenDance · GLM 5.1 | 1 | 1 | 0 |
| 官方文档 · TokenDance · glm 5 | 官方文档 · TokenDance · GLM 5 | 1 | 1 | 0 |
| 官方文档 · TokenDance · glm 5v turbo | 官方文档 · TokenDance · GLM 5V Turbo | 1 | 1 | 0 |
| 官方文档 · TokenDance · glm 4.7 | 官方文档 · TokenDance · GLM 4.7 | 1 | 1 | 0 |
| 官方文档 · TokenDance · glm 4.6v | 官方文档 · TokenDance · GLM 4.6V | 1 | 1 | 0 |
| 官方文档 · TokenDance · glm 4.5 air | 官方文档 · TokenDance · GLM 4.5 Air | 1 | 1 | 0 |
| 官方文档 · TokenDance · hy4 preview | 官方文档 · TokenDance · Hy4 preview | 1 | 1 | 0 |
| 官方文档 · TokenDance · hy3 | 官方文档 · TokenDance · Hy3 | 1 | 1 | 0 |
| 官方文档 · TokenDance · hy3 preview | 官方文档 · TokenDance · Hy3 preview | 1 | 1 | 0 |
| 官方文档 · TokenDance · Kimi-K3 模型页 | 官方文档 · TokenDance · Kimi K3 | 1 | 1 | 0 |
| 官方文档 · TokenDance · kimi k2.7 code | 官方文档 · TokenDance · Kimi K2.7 Code | 1 | 1 | 0 |
| 官方文档 · TokenDance · kimi k2.6 | 官方文档 · TokenDance · Kimi K2.6 | 1 | 1 | 0 |
| 官方文档 · TokenDance · kimi k2.5 | 官方文档 · TokenDance · Kimi K2.5 | 1 | 1 | 0 |
| 官方文档 · TokenDance · minimax m3 | 官方文档 · TokenDance · MiniMax M3 | 1 | 1 | 0 |
| 官方文档 · TokenDance · minimax m2.7 | 官方文档 · TokenDance · MiniMax M2.7 | 1 | 1 | 0 |
| 官方文档 · TokenDance · minimax m2.5 | 官方文档 · TokenDance · MiniMax M2.5 | 1 | 1 | 0 |
| 官方文档 · TokenDance · qwen3.8 flash | 官方文档 · TokenDance · Qwen3.8 Flash | 1 | 1 | 0 |
| 官方文档 · TokenDance · qwen3.8 max | 官方文档 · TokenDance · Qwen3.8 Max | 1 | 1 | 0 |
| 官方文档 · TokenDance · qwen3.8 max 0902 | 官方文档 · TokenDance · Qwen3.8-Max-0902 | 1 | 1 | 0 |
| 官方文档 · TokenDance · qwen3.7 max | 官方文档 · TokenDance · Qwen3.7 Max | 1 | 1 | 0 |
| 官方文档 · TokenDance · qwen3.7 plus | 官方文档 · TokenDance · Qwen3.7 Plus | 1 | 1 | 0 |
| 原厂规格 · 百炼 · qwen3 6 max | 原厂规格 · 百炼 · Qwen3.6 Max | 1 | 1 | 0 |
| 官方文档 · TokenDance · qwen3.6 plus | 官方文档 · TokenDance · Qwen3.6 Plus | 1 | 1 | 0 |
| 官方文档 · TokenDance · qwen3.5 35b a3b | 官方文档 · TokenDance · Qwen3.5-35B-A3B | 1 | 1 | 0 |
| 官方文档 · TokenDance · qwen3.5 flash | 官方文档 · TokenDance · Qwen3.5 Flash | 1 | 1 | 0 |
| 官方文档 · TokenDance · qwen3.5 plus | 官方文档 · TokenDance · Qwen3.5 Plus | 1 | 1 | 0 |
| 官方文档 · TokenDance · seed 2.1 pro | 官方文档 · TokenDance · Seed-2.1-Pro | 1 | 1 | 0 |
| 官方文档 · TokenDance · seed 2.1 turbo | 官方文档 · TokenDance · Seed-2.1-Turbo | 1 | 1 | 0 |
| 官方文档 · TokenDance · seed 2.0 code | 官方文档 · TokenDance · Seed-2.0-Code | 1 | 1 | 0 |
| 官方文档 · TokenDance · seed 2.0 lite | 官方文档 · TokenDance · Seed-2.0-Lite | 1 | 1 | 0 |
| 官方文档 · TokenDance · seed 2.0 mini | 官方文档 · TokenDance · Seed-2.0-Mini | 1 | 1 | 0 |
| 官方文档 · TokenDance · seed 2.0 pro | 官方文档 · TokenDance · Seed-2.0-Pro | 1 | 1 | 0 |
| 官方文档 · TokenDance · seedream 5.0 lite | 官方文档 · TokenDance · Seedream 5.0 lite | 1 | 1 | 0 |
| 官方文档 · TokenDance · seedream 5.0 pro | 官方文档 · TokenDance · Seedream 5.0 Pro | 1 | 1 | 0 |
| 官方文档 · TokenDance · step 5 preview | 官方文档 · TokenDance · Step 5 Preview | 1 | 1 | 0 |
| 官方文档 · TokenDance · step 3.7 flash | 官方文档 · TokenDance · Step 3.7 Flash | 1 | 1 | 0 |
| 官方文档 · TokenDance · step 3.5 flash | 官方文档 · TokenDance · Step 3.5 Flash | 1 | 1 | 0 |
| 官方文档 · TokenDance · cogevol base | 官方文档 · TokenDance · CogEvol Base | 1 | 1 | 0 |
| 官方文档 · TokenDance · cogevol interactive 0828 | 官方文档 · TokenDance · CogEvol Interactive 0828 | 1 | 1 | 0 |
| 官方文档 · TokenDance · cogevol slide 0828 | 官方文档 · TokenDance · CogEvol Slide 0828 | 1 | 1 | 0 |
| 官方文档 · TokenDance · dots 3 note preview | 官方文档 · TokenDance · Dots3-Note Preview（Free） | 1 | 1 | 0 |
| 官方文档 · TokenDance · kimi k3.1 pro | 官方文档 · TokenDance · Kimi K3.1 Pro | 1 | 1 | 0 |
| 官方文档 · TokenDance · ling 3.0 flash | 官方文档 · TokenDance · Ling-3.0-flash | 1 | 1 | 0 |
| 官方文档 · TokenDance · ling 3.1 flash | 官方文档 · TokenDance · Ling 3.1 Flash | 1 | 1 | 0 |
| 官方文档 · TokenDance · longcat 2.0 | 官方文档 · TokenDance · LongCat-2.0 | 1 | 1 | 0 |
| 官方文档 · TokenDance · mimo v2.5 | 官方文档 · TokenDance · MiMo-V2.5 | 1 | 1 | 0 |
| 官方文档 · TokenDance · mimo v2.5 pro | 官方文档 · TokenDance · MiMo-V2.5-Pro | 1 | 1 | 0 |
| 官方文档 · TokenDance · mimo v2.6 flash | 官方文档 · TokenDance · Mimo-V2.6-Flash | 1 | 1 | 0 |
| 官方文档 · TokenDance · mimo v2.6 pro | 官方文档 · TokenDance · Mimo-V2.6-Pro | 1 | 1 | 0 |
| 官方文档 · TokenDance · mimo v2.6 ultraspeed | 官方文档 · TokenDance · MiMo-V2.6-Pro-UltraSpeed | 1 | 1 | 0 |
| 官方文档 · TokenDance · minimax m3.1 flash | 官方文档 · TokenDance · MiniMax M3.1 Flash | 1 | 1 | 0 |
| 官方文档 · TokenDance · qwen3 vl plus | 官方文档 · TokenDance · Qwen3 VL Plus | 1 | 1 | 0 |
| 官方文档 · TokenDance · seed evolving | 官方文档 · TokenDance · Seed-Evolving | 1 | 1 | 0 |
| 官方文档 · TokenDance · spark x2.5 1.7b | 官方文档 · TokenDance · Spark-X2.5-1.7B | 1 | 1 | 0 |
| 官方文档 · TokenDance · spark x2.5 4b | 官方文档 · TokenDance · Spark-X2.5-4B | 1 | 1 | 0 |
| 官方文档 · TokenDance · unifuncs s3 | 官方文档 · TokenDance · Deep Search S3 | 1 | 1 | 0 |
| 官方文档 · TokenDance · unifuncs s3 pro | 官方文档 · TokenDance · Deep Search S3 Pro | 1 | 1 | 0 |
| 官方文档 · TokenDance · unifuncs u3 | 官方文档 · TokenDance · Deep Research U3 | 1 | 1 | 0 |
| 官方文档 · TokenDance · unifuncs u3 pro | 官方文档 · TokenDance · Deep Research U3 Pro | 1 | 1 | 0 |
| 官方文档 · runware.ai · bfl flux 3 image klein | 官方文档 · Runware · FLUX 3 Image Klein | 1 | 1 | 0 |
| 官方文档 · runware.ai · bfl flux 3 image klein base | 官方文档 · Runware · FLUX 3 Image Klein Base | 1 | 1 | 0 |
| 官方文档 · runware.ai · alibaba qwen image 2 1 turbo | 官方文档 · Runware · Qwen-Image-2.1-Turbo | 1 | 1 | 0 |
| 官方文档 · runware.ai · google nano banana 2 1 | 官方文档 · Runware · Runware - Nano Banana 2.1 | 1 | 1 | 0 |
| 官方文档 · ai.google.dev · gemini nano banana 2.1 | 官方文档 · Google · Gemini Nano Banana 2.1 | 1 | 0 | 0 |
| 官方文档 · runware.ai · bfl flux 3 image | 官方文档 · Runware · Runware - FLUX 3 Image | 1 | 1 | 0 |
| 官方文档 · runware.ai · ideogram 4 5 | 官方文档 · Runware · Ideogram 4.5 | 1 | 1 | 0 |
| 官方文档 · runware.ai · ideogram 4 5 precise edit | 官方文档 · Runware · Runware - Ideogram 4.5 Precise Edit | 1 | 1 | 0 |
| 官方文档 · runware.ai · bytedance seedream 5 0 flash | 官方文档 · Runware · Runware - Seedream 5.0 Flash | 1 | 1 | 0 |
| 官方文档 · recraft.ai · recraft v4 1 flash | 官方文档 · Recraft · Runware - Recraft V4.1 Flash | 1 | 1 | 0 |
| 官方文档 · runware.ai · recraft v4 1 flash | 官方文档 · Runware · Runware - Recraft V4.1 Flash | 1 | 0 | 0 |
| 官方文档 · runware.ai · alibaba qwen image 2 1 pro | 官方文档 · Runware · Runware - Qwen-Image-2.1-Pro | 1 | 1 | 0 |
| 官方文档 · runware.ai · openai gpt image 2 5 flare | 官方文档 · Runware · GPT-Image-2.5 Flare | 1 | 1 | 0 |
| 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction | 138 | 0 | 0 |
| 官方文档 · runware.ai · openai gpt image 2 5 sunburst | 官方文档 · Runware · GPT-Image-2.5 Sunburst | 1 | 1 | 0 |
| 官方文档 · runware.ai · xai grok imagine image 2 0 | 官方文档 · Runware · Grok Imagine Image 2.0 | 1 | 1 | 0 |
| 官方文档 · runware.ai · alibaba qwen image 3 0 | 官方文档 · Runware · Qwen-Image-3.0 | 1 | 1 | 0 |
| 官方文档 · runware.ai · alibaba qwen image 3 0 pro | 官方文档 · Runware · Qwen-Image-3.0-Pro | 1 | 1 | 0 |
| 官方文档 · Hugging Face · DeepSeek V4 Flash | 官方文档 · Hugging Face · DeepSeek-V4-Flash-0731 | 1 | 1 | 0 |
| 官方文档 · runware.ai · deepseek v4 flash | 官方文档 · Runware · DeepSeek-V4-Flash-0731 | 1 | 0 | 0 |
| 官方文档 · runware.ai · prunaai p image ideogram | 官方文档 · Runware · P-Image-Ideogram | 1 | 1 | 0 |
| 官方文档 · runware.ai · krea 2 turbo | 官方文档 · Runware · Krea 2 Turbo | 1 | 1 | 0 |
| 官方文档 · runware.ai · bytedance seedream 5 0 pro | 官方文档 · Runware · Seedream 5.0 Pro | 1 | 1 | 0 |
| 官方文档 · runware.ai · meta muse image | 官方文档 · Runware · Muse Image | 1 | 1 | 0 |
| 官方文档 · runware.ai · google nano banana 2 lite | 官方文档 · Runware · Nano Banana 2 Lite | 1 | 1 | 0 |
| 官方文档 · runware.ai · krea 2 raw | 官方文档 · Runware · Krea 2 Raw | 1 | 1 | 0 |
| 官方文档 · runware.ai · rundiffusion juggernaut z fast | 官方文档 · Runware · Juggernaut Z Fast | 1 | 1 | 0 |
| 官方文档 · runware.ai · anthropic claude fable 5 | 官方文档 · Runware · Claude Fable 5 | 1 | 1 | 0 |
| 官方文档 · runware.ai · sourceful riverflow 2 5 fast | 官方文档 · Runware · Riverflow 2.5 Fast | 1 | 1 | 0 |
| 官方文档 · runware.ai · sourceful riverflow 2 5 pro | 官方文档 · Runware · Riverflow 2.5 Pro | 1 | 1 | 0 |
| 官方文档 · runware.ai · ideogram 4 0 | 官方文档 · Runware · Ideogram 4.0 | 1 | 1 | 0 |
| 官方文档 · runware.ai · ideogram 4 0q | 官方文档 · Runware · Ideogram 4.0q | 1 | 1 | 0 |
| 官方文档 · runware.ai · ideogram 4 0 remix | 官方文档 · Runware · Ideogram 4.0 Remix | 1 | 1 | 0 |
| 官方文档 · runware.ai · krea 2 medium turbo | 官方文档 · Runware · Krea 2 Medium Turbo | 1 | 1 | 0 |
| 官方文档 · runware.ai · minimax m3 | 官方文档 · Runware · MiniMax M3 | 1 | 1 | 0 |
| 官方文档 · runware.ai · anthropic claude opus 4 8 | 官方文档 · Runware · Claude Opus 4.8 | 1 | 1 | 0 |
| 官方文档 · runware.ai · krea 2 large | 官方文档 · Runware · Krea 2 Large | 1 | 1 | 0 |
| 官方文档 · runware.ai · krea 2 medium | 官方文档 · Runware · Krea 2 Medium | 1 | 1 | 0 |
| 官方文档 · runware.ai · google gemini 3 5 flash | 官方文档 · Runware · Gemini 3.5 Flash | 1 | 1 | 0 |
| 官方文档 · runware.ai · recraft v4 1 pro | 官方文档 · Runware · Recraft V4.1 Pro | 1 | 1 | 0 |
| 官方文档 · runware.ai · recraft v4 1 utility pro | 官方文档 · Runware · Recraft V4.1 Utility Pro | 1 | 1 | 0 |
| 官方文档 · runware.ai · recraft v4 1 utility | 官方文档 · Runware · Recraft V4.1 Utility | 1 | 1 | 0 |
| 官方文档 · runware.ai · recraft v4 1 | 官方文档 · Runware · Recraft V4.1 | 1 | 1 | 0 |
| 官方文档 · runware.ai · luma uni 1 | 官方文档 · Runware · UNI-1 | 1 | 1 | 0 |
| 官方文档 · runware.ai · luma uni 1 max | 官方文档 · Runware · UNI-1 Max | 1 | 1 | 0 |
| 官方文档 · runware.ai · xai grok 4 3 | 官方文档 · Runware · Grok 4.3 | 1 | 1 | 0 |
| 官方文档 · runware.ai · rundiffusion juggernaut z | 官方文档 · Runware · Juggernaut Z | 1 | 1 | 0 |
| 官方文档 · runware.ai · openai gpt 5 5 | 官方文档 · Runware · GPT-5.5 | 1 | 1 | 0 |
| 官方文档 · runware.ai · openai gpt image 2 | 官方文档 · Runware · GPT Image 2 | 1 | 1 | 0 |
| 官方文档 · runware.ai · anthropic claude opus 4 7 | 官方文档 · Runware · Claude Opus 4.7 | 1 | 1 | 0 |
| 官方文档 · runware.ai · baidu ernie image | 官方文档 · Runware · ERNIE-Image | 1 | 1 | 0 |
| 官方文档 · runware.ai · baidu ernie image turbo | 官方文档 · Runware · ERNIE-Image-Turbo | 1 | 1 | 0 |
| 官方文档 · runware.ai · imagineart 2 0 | 官方文档 · Runware · ImagineArt 2.0 | 1 | 1 | 0 |
| 官方文档 · runware.ai · zai glm 5 1 | 官方文档 · Runware · GLM-5.1 | 1 | 1 | 0 |
| 官方文档 · runware.ai · google gemma 4 31b | 官方文档 · Runware · Gemma 4 31B | 1 | 1 | 0 |
| 官方文档 · runware.ai · alibaba wan2 7 image | 官方文档 · Runware · Wan2.7 Image | 1 | 1 | 0 |
| 官方文档 · runware.ai · alibaba wan2 7 image pro | 官方文档 · Runware · Wan2.7 Image Pro | 1 | 1 | 0 |
| 官方文档 · runware.ai · bfl flux 2 klein 9b kv | 官方文档 · Runware · FLUX.2 [klein] 9B KV | 1 | 1 | 0 |
| 官方文档 · runware.ai · minimax m2 7 | 官方文档 · Runware · MiniMax M2.7 | 1 | 1 | 0 |
| 官方文档 · runware.ai · minimax m2 7 highspeed | 官方文档 · Runware · MiniMax M2.7 Highspeed | 1 | 1 | 0 |
| 官方文档 · runware.ai · openai gpt 5 4 mini | 官方文档 · Runware · GPT-5.4 Mini | 1 | 1 | 0 |
| 官方文档 · runware.ai · openai gpt 5 4 nano | 官方文档 · Runware · GPT-5.4 Nano | 1 | 1 | 0 |
| 官方文档 · runware.ai · openai gpt 5 4 | 官方文档 · Runware · GPT-5.4 | 1 | 1 | 0 |
| 官方文档 · runware.ai · openai gpt 5 4 pro | 官方文档 · Runware · GPT-5.4 Pro | 1 | 1 | 0 |
| 官方文档 · runware.ai · google gemini 3 1 flash lite | 官方文档 · Runware · Gemini 3.1 Flash Lite | 1 | 1 | 0 |
| 官方文档 · runware.ai · google nano banana 2 | 官方文档 · Runware · Nano Banana 2 | 1 | 1 | 0 |
| 官方文档 · runware.ai · bytedance seedream 5 0 lite | 官方文档 · Runware · Seedream 5.0 Lite | 1 | 1 | 0 |
| 官方文档 · runware.ai · google gemini 3 1 pro | 官方文档 · Runware · Gemini 3.1 Pro | 1 | 1 | 0 |
| 官方文档 · runware.ai · compatible apis | 官方文档 · Runware · Compatible Apis | 2 | 0 | 0 |
| 官方文档 · runware.ai · anthropic claude sonnet 4 6 | 官方文档 · Runware · Claude Sonnet 4.6 | 1 | 1 | 0 |
| 官方文档 · runware.ai · recraft v4 pro | 官方文档 · Runware · Recraft V4 Pro | 1 | 1 | 0 |
| 官方文档 · runware.ai · recraft v4 | 官方文档 · Runware · Recraft V4 | 1 | 1 | 0 |
| 官方文档 · runware.ai · alibaba qwen image 2 0 | 官方文档 · Runware · Qwen-Image-2.0 | 1 | 1 | 0 |
| 官方文档 · runware.ai · alibaba qwen image 2 0 pro | 官方文档 · Runware · Qwen-Image-2.0-Pro | 1 | 1 | 0 |
| 官方文档 · runware.ai · klingai image 3 0 | 官方文档 · Runware · Klingai Image 3-0 | 1 | 1 | 0 |
| 官方文档 · runware.ai · klingai image o3 | 官方文档 · Runware · Klingai Image O3 | 1 | 1 | 0 |
| 官方文档 · runware.ai · sourceful riverflow 2 0 fast | 官方文档 · Runware · Riverflow 2.0 Fast | 1 | 1 | 0 |
| 官方文档 · runware.ai · sourceful riverflow 2 0 pro | 官方文档 · Runware · Riverflow 2.0 Pro | 1 | 1 | 0 |
| 官方文档 · runware.ai · xai grok imagine image | 官方文档 · Runware · Grok Imagine Image | 1 | 1 | 0 |
| 官方文档 · runware.ai · alibaba z image | 官方文档 · Runware · Z-Image | 1 | 1 | 0 |
| 官方文档 · runware.ai · bfl flux 2 klein 9b | 官方文档 · Runware · FLUX.2 [klein] 9B | 1 | 1 | 0 |
| 官方文档 · runware.ai · bria fibo 2 0 edit | 官方文档 · Runware · Bria FIBO 2.0 Edit | 1 | 1 | 0 |
| 官方文档 · runware.ai · imagineart 1 5 pro | 官方文档 · Runware · ImagineArt 1.5 Pro | 1 | 1 | 0 |
| 官方文档 · runware.ai · bfl flux 2 klein 9b base | 官方文档 · Runware · FLUX.2 [klein] 9B Base | 1 | 1 | 0 |
| 官方文档 · runware.ai · bfl flux 2 klein 4b | 官方文档 · Runware · FLUX.2 [klein] 4B | 1 | 1 | 0 |
| 官方文档 · runware.ai · bfl flux 2 klein 4b base | 官方文档 · Runware · FLUX.2 [klein] 4B Base | 1 | 1 | 0 |
| 官方文档 · runware.ai · bria fibo lite | 官方文档 · Runware · Bria FIBO Lite | 1 | 1 | 0 |
| 官方文档 · runware.ai · twinflow z image turbo | 官方文档 · Runware · TwinFlow Z-Image-Turbo | 1 | 1 | 0 |
| 官方文档 · runware.ai · alibaba qwen image 2512 | 官方文档 · Runware · Qwen-Image-2512 | 1 | 1 | 0 |
| 官方文档 · runware.ai · google gemini 3 flash | 官方文档 · Runware · Gemini 3 Flash | 1 | 1 | 0 |
| 官方文档 · runware.ai · alibaba wan2 6 image | 官方文档 · Runware · Wan2.6 Image | 1 | 1 | 0 |
| 官方文档 · runware.ai · bfl flux 2 max | 官方文档 · Runware · FLUX.2 [max] | 1 | 1 | 0 |
| 官方文档 · runware.ai · openai gpt image 1 5 | 官方文档 · Runware · GPT Image 1.5 | 1 | 1 | 0 |
| 官方文档 · runware.ai · bytedance seedream 4 5 | 官方文档 · Runware · Seedream 4.5 | 1 | 1 | 0 |
| 官方文档 · runware.ai · klingai image o1 | 官方文档 · Runware · Klingai Image O1 | 1 | 1 | 0 |
| 官方文档 · runware.ai · prunaai p image | 官方文档 · Runware · P-Image | 1 | 1 | 0 |
| 官方文档 · runware.ai · bfl flux 2 pro | 官方文档 · Runware · FLUX.2 [pro] | 1 | 1 | 0 |
| 官方文档 · runware.ai · kandinsky 5 0 image lite | 官方文档 · Runware · Kandinsky 5.0 Image Lite | 1 | 1 | 0 |
| 官方文档 · runware.ai · alibaba z image turbo | 官方文档 · Runware · Z-Image-Turbo | 1 | 1 | 0 |
| 官方文档 · runware.ai · alibaba qwen image edit 2511 | 官方文档 · Runware · Qwen-Image-Edit-2511 | 1 | 1 | 0 |
| 官方文档 · runware.ai · bfl flux 2 flex | 官方文档 · Runware · FLUX.2 [flex] | 1 | 1 | 0 |
| 官方文档 · runware.ai · bfl flux 2 dev | 官方文档 · Runware · FLUX.2 [dev] | 1 | 1 | 0 |
| 官方文档 · runware.ai · google nano banana pro | 官方文档 · Runware · Nano Banana Pro | 1 | 1 | 0 |
| 官方文档 · runware.ai · imagineart 1 5 | 官方文档 · Runware · ImagineArt 1.5 | 1 | 1 | 0 |
| 官方文档 · runware.ai · prunaai p image edit | 官方文档 · Runware · P-Image-Edit | 1 | 1 | 0 |
| 官方文档 · runware.ai · bria fibo 2 0 | 官方文档 · Runware · Bria FIBO 2.0 | 1 | 1 | 0 |
| 官方文档 · runware.ai · anthropic claude haiku 4 5 | 官方文档 · Runware · Claude Haiku 4.5 | 1 | 1 | 0 |
| 官方文档 · runware.ai · alibaba wan2 5 preview image | 官方文档 · Runware · Wan2.5-Preview Image | 1 | 1 | 0 |
| 官方文档 · runware.ai · alibaba qwen image edit plus | 官方文档 · Runware · Qwen-Image-Edit-Plus | 1 | 1 | 0 |
| 官方文档 · runware.ai · bria image replace background | 官方文档 · Runware · Bria Image Replace Background | 1 | 1 | 0 |
| 官方文档 · runware.ai · flux 1 dev srpo | 官方文档 · Runware · FLUX.1 [dev] SRPO | 1 | 1 | 0 |
| 官方文档 · runware.ai · bytedance seedream 4 0 | 官方文档 · Runware · Seedream 4.0 | 1 | 1 | 0 |
| 官方文档 · runware.ai · google nano banana | 官方文档 · Runware · Nano Banana | 1 | 0 | 0 |
| 官方文档 · runware.ai · alibaba qwen image edit | 官方文档 · Runware · Qwen-Image-Edit | 1 | 1 | 0 |
| 官方文档 · runware.ai · runway gen 4 image turbo | 官方文档 · Runware · Runway Gen-4 Image Turbo | 1 | 1 | 0 |
| 官方文档 · runware.ai · openai gpt 5 mini | 官方文档 · Runware · GPT-5 Mini | 1 | 1 | 0 |
| 官方文档 · runware.ai · openai gpt 5 nano | 官方文档 · Runware · GPT-5 Nano | 1 | 1 | 0 |
| 官方文档 · runware.ai · alibaba qwen image | 官方文档 · Runware · Qwen-Image | 1 | 1 | 0 |
| 官方文档 · runware.ai · krea flux 1 krea dev | 官方文档 · Runware · FLUX.1 Krea [dev] | 1 | 1 | 0 |
| 官方文档 · runware.ai · bfl flux 1 kontext pro | 官方文档 · Runware · FLUX.1 Kontext [pro] | 1 | 1 | 0 |
| 官方文档 · runware.ai · bfl flux 1 kontext max | 官方文档 · Runware · FLUX.1 Kontext [max] | 1 | 1 | 0 |
| 官方文档 · runware.ai · bfl flux 1 kontext dev | 官方文档 · Runware · FLUX.1 Kontext [dev] | 1 | 1 | 0 |
| 官方文档 · runware.ai · stabilityai stable diffusion 3 | 官方文档 · Runware · Stable Diffusion 3 | 1 | 1 | 0 |
| 官方文档 · runware.ai · bria 3 2 | 官方文档 · Runware · Bria 3.2 | 1 | 1 | 0 |
| 官方文档 · runware.ai · runway gen 4 image | 官方文档 · Runware · Runway Gen-4 Image | 1 | 1 | 0 |
| 官方文档 · runware.ai · ideogram 3 0 edit | 官方文档 · Runware · Ideogram 3.0 Edit | 1 | 1 | 0 |
| 官方文档 · runware.ai · ideogram 3 0 remix | 官方文档 · Runware · Ideogram 3.0 Remix | 1 | 1 | 0 |
| 官方文档 · runware.ai · openai gpt image 1 mini | 官方文档 · Runware · GPT Image 1 Mini | 1 | 1 | 0 |
| 官方文档 · runware.ai · hidream i1 dev | 官方文档 · Runware · HiDream-I1 Dev | 1 | 1 | 0 |
| 官方文档 · runware.ai · hidream i1 full | 官方文档 · Runware · HiDream-I1 Full | 1 | 1 | 0 |
| 官方文档 · runware.ai · hidream i1 fast | 官方文档 · Runware · HiDream-I1 Fast | 1 | 1 | 0 |
| 官方文档 · runware.ai · vidu q1 image | 官方文档 · Runware · Vidu Q1 | 1 | 1 | 0 |
| 官方文档 · runware.ai · ideogram 3 0 | 官方文档 · Runware · Ideogram 3.0 | 1 | 1 | 0 |
| 官方文档 · runware.ai · ideogram 3 0 replace background | 官方文档 · Runware · Ideogram 3.0 Replace Background | 1 | 1 | 0 |
| 原厂规格 · developers.openai.com · gpt image 1 | 原厂规格 · OpenAI · GPT Image 1 | 1 | 1 | 0 |
| 官方文档 · runware.ai · rundiffusion juggernaut lightning flux | 官方文档 · Runware · Juggernaut Lightning Flux | 1 | 1 | 0 |
| 官方文档 · runware.ai · rundiffusion juggernaut base flux | 官方文档 · Runware · Juggernaut Base Flux | 1 | 1 | 0 |
| 官方文档 · runware.ai · rundiffusion juggernaut pro flux | 官方文档 · Runware · Juggernaut Pro Flux | 1 | 1 | 0 |
| 官方文档 · runware.ai · ideogram 2a | 官方文档 · Runware · Ideogram 2a | 1 | 1 | 0 |
| 官方文档 · runware.ai · ideogram 2a remix | 官方文档 · Runware · Ideogram 2a Remix | 1 | 1 | 0 |
| 官方文档 · runware.ai · bfl flux 1 fill dev | 官方文档 · Runware · FLUX.1 Fill [dev] | 1 | 1 | 0 |
| 官方文档 · runware.ai · bfl flux 1 1 pro ultra | 官方文档 · Runware · FLUX.1.1 [pro] Ultra | 1 | 1 | 0 |
| 官方文档 · runware.ai · bfl flux 1 fill pro | 官方文档 · Runware · FLUX.1 Fill [pro] | 1 | 1 | 0 |
| 官方文档 · runware.ai · ideogram 2 0 remix | 官方文档 · Runware · Ideogram 2.0 Remix | 1 | 1 | 0 |
| 官方文档 · runware.ai · bfl flux 1 1 pro | 官方文档 · Runware · FLUX.1.1 [pro] | 1 | 1 | 0 |
| 官方文档 · runware.ai · ideogram 2 0 | 官方文档 · Runware · Ideogram 2.0 | 1 | 1 | 0 |
| 官方文档 · runware.ai · bfl flux 1 schnell | 官方文档 · Runware · FLUX.1 [schnell] | 1 | 1 | 0 |
| 官方文档 · runware.ai · bfl flux 1 dev | 官方文档 · Runware · FLUX.1 [dev] | 1 | 1 | 0 |
| 官方文档 · runware.ai · meta llava 1 6 mistral 7b | 官方文档 · Runware · LLaVA-1.6-Mistral-7B | 1 | 1 | 0 |
| 官方文档 · runware.ai · alibaba qwen2 5 vl 3b instruct | 官方文档 · Runware · Qwen2.5-VL-3B-Instruct | 1 | 1 | 0 |
| 官方文档 · Hugging Face · Qwen2.5 VL 3B Instruct | 官方文档 · Hugging Face · Qwen2.5-VL-3B-Instruct | 1 | 0 | 0 |
| 官方文档 · runware.ai · alibaba qwen2 5 vl 7b instruct | 官方文档 · Runware · Qwen2.5-VL-7B-Instruct | 1 | 1 | 0 |
| 官方文档 · Hugging Face · Qwen2.5 VL 7B Instruct | 官方文档 · Hugging Face · Qwen2.5-VL-7B-Instruct | 1 | 0 | 0 |
| 官方文档 · runware.ai · stabilityai stable diffusion xl v1 0 vae fix | 官方文档 · Runware · Stable Diffusion XL v1.0 VAE Fix | 1 | 1 | 0 |
| 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 | 49 | 17 | 0 |
| 官方文档 · cloud.tencent.com · 130079 | 官方文档 · 腾讯云 · 文档 130079 | 6 | 0 | 0 |
| 官方文档 · cloud.tencent.com · 130055 | 官方文档 · 腾讯云 · 文档 130055 | 4 | 0 | 0 |
| 官方文档 · DeepSeek · news260821 | 官方文档 · DeepSeek · News260821 | 1 | 1 | 0 |
| 官方文档 · cloud.tencent.com · 132248 | 官方文档 · 腾讯云 · 文档 132248 | 12 | 0 | 0 |
| 官方文档 · Hugging Face · DeepSeek V4 Pro 0813 | 官方文档 · Hugging Face · DeepSeek-V4-Pro 0813 正式版 | 1 | 1 | 0 |
| 官方文档 · Hugging Face · DeepSeek V4 Flash 0731 | 官方文档 · Hugging Face · DeepSeek-V4-Flash 0731 正式版 | 1 | 1 | 0 |
| 官方文档 · Hugging Face · DeepSeek V4 Flash 0731 | 官方文档 · Hugging Face · DeepSeek-V4-Flash 0731 | 1 | 1 | 0 |
| 官方文档 · cloud.tencent.com · 132061 | 官方文档 · 腾讯云 · 文档 132061 | 8 | 0 | 0 |
| 官方文档 · bigmodel.cn · glm 5.3 flash | 官方文档 · 智谱 · GLM-5.3-Flash | 2 | 2 | 0 |
| 官方文档 · bigmodel.cn · glm 5.1 | 官方文档 · 智谱 · GLM-5.1（2026-10-08下线） | 1 | 1 | 0 |
| 官方文档 · bigmodel.cn · glm 5 | 官方文档 · 智谱 · GLM-5（2026-10-08下线） | 1 | 1 | 0 |
| 官方文档 · bigmodel.cn · glm 5 turbo | 官方文档 · 智谱 · GLM-5-Turbo（2026-10-08下线） | 1 | 1 | 0 |
| 官方文档 · bigmodel.cn · glm 5v turbo | 官方文档 · 智谱 · GLM-5V-Turbo（2026-10-30下线） | 1 | 1 | 0 |
| 官方文档 · cloud.tencent.com · 132252 | 官方文档 · 腾讯云 · 文档 132252 | 3 | 1 | 0 |
| 官方文档 · cloud.tencent.com · 132232 | 官方文档 · 腾讯云 · 文档 132232 | 7 | 0 | 0 |
| 官方文档 · Hugging Face · Kimi K2.6 | 官方文档 · Hugging Face · Kimi-K2.6 | 2 | 2 | 0 |
| 官方文档 · Hugging Face · MiniMax M3 | 官方文档 · Hugging Face · MiniMax-M3 | 1 | 1 | 0 |
| 官方文档 · cloud.tencent.com · 132246 | 官方文档 · 腾讯云 · 文档 132246 | 3 | 0 | 0 |
| 官方文档 · stepfun.com · step 5 preview | 官方文档 · StepFun · Step 5 Preview | 2 | 2 | 0 |
| 官方文档 · cloud.tencent.com · 136956 | 官方文档 · 腾讯云 · 文档 136956 | 3 | 0 | 0 |
| 官方文档 · cloud.tencent.com · 135745 | 官方文档 · 腾讯云 · 文档 135745 | 2 | 0 | 0 |
| 官方文档 · mimo.mi.com · mimo v2.5 pro | 官方文档 · MiMo · MiMo-V2.5-Pro | 1 | 0 | 0 |
| 官方文档 · mimo.mi.com · mimo v2.6 flash | 官方文档 · MiMo · MiMo V2.6 Flash | 1 | 1 | 0 |
| 官方文档 · mimo.mi.com · mimo v2.6 pro | 官方文档 · MiMo · MiMo V2.6 Pro | 1 | 1 | 0 |
| 官方文档 · cloud.tencent.com · 136609 | 官方文档 · 腾讯云 · 文档 136609 | 2 | 0 | 0 |
| 官方文档 · cloud.tencent.com · 135746 | 官方文档 · 腾讯云 · 文档 135746 | 1 | 0 | 0 |
| 官方文档 · cloud.tencent.com · 137203 | 官方文档 · 腾讯云 · 文档 137203 | 3 | 0 | 0 |
| 官方文档 · mimo.mi.com · mimo v2.6 flash | 官方文档 · MiMo · MiMo-V2.6-Flash | 1 | 1 | 0 |
| 官方文档 · mimo.mi.com · model | 官方文档 · MiMo · 模型说明 | 3 | 1 | 0 |
| 官方文档 · mimo.mi.com · openai api | 官方文档 · MiMo · OpenAI API | 2 | 0 | 0 |
| 官方文档 · mimo.mi.com · image understanding | 官方文档 · MiMo · Image Understanding | 2 | 0 | 0 |
| 官方文档 · mimo.mi.com · mimo v2.6 pro | 官方文档 · MiMo · MiMo-V2.6-Pro | 1 | 1 | 0 |
| 官方文档 · Hugging Face · DeepSeek V4 Flash | 官方文档 · Hugging Face · DeepSeek V4 Flash 0731 | 1 | 1 | 0 |
| 官方文档 · sensecore.cn · overview | 官方文档 · Sensecore · Nova | 7 | 2 | 0 |
| 官方文档 · sensenova.cn · docs | 官方文档 · SenseNova · 文档首页 | 8 | 1 | 0 |
| 官方文档 · Hugging Face · DeepSeek V4 Pro | 官方文档 · Hugging Face · DeepSeek V4 Pro 0813 | 1 | 0 | 0 |
| 官方文档 · github.com · API.md | 官方文档 · GitHub · API | 1 | 1 | 0 |
| 官方文档 · stepfun.com · list | 官方文档 · StepFun · List | 5 | 1 | 0 |
| 官方文档 · stepfun.com · welcome | 官方文档 · StepFun · 文档首页 | 5 | 0 | 0 |
| 官方文档 · stepfun.com · step 3.7 flash | 官方文档 · StepFun · Step 3.7 Flash | 1 | 1 | 0 |
| 官方文档 · stepfun.com · step 3.5 flash | 官方文档 · StepFun · Step 3.5 Flash | 2 | 2 | 0 |
| 官方文档 · stepfun.com · chat completion create | 官方文档 · StepFun · Chat Completion Create | 1 | 0 | 0 |
| 官方文档 · Hugging Face · DeepSeek V4.1 Flash | 官方文档 · Hugging Face · DeepSeek-V4.1-flash | 1 | 1 | 0 |
| 官方文档 · cloud.baidu.com · klqx7b1i5 | 官方文档 · 百度千帆 · Klqx7b1i5 | 36 | 5 | 0 |
| 官方文档 · cloud.baidu.com · rmh4stp0j | 官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台 | 37 | 11 | 0 |
| 官方文档 · Hugging Face · DeepSeek OCR | 官方文档 · Hugging Face · DeepSeek-OCR | 1 | 1 | 0 |
| 官方文档 · cloud.baidu.com · Jm8r1826a | 官方文档 · 百度千帆 · Jm8r1826a | 1 | 0 | 0 |
| 官方文档 · Hugging Face · InternVL3 38B | 官方文档 · Hugging Face · InternVL3-38B | 1 | 1 | 0 |
| 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 | 32 | 31 | 0 |
| 官方文档 · maas.xfyun.cn · 3.1.1 Chat | 官方文档 · 讯飞星辰 · 3.1.1 Chat | 2 | 2 | 0 |
| 官方文档 · Hugging Face · Qwen2.5 14B Instruct | 官方文档 · Hugging Face · Qwen2.5-14B Instruct | 1 | 1 | 0 |
| 官方文档 · longcat.ai · model params | 官方文档 · LongCat · Model Params | 1 | 1 | 0 |
| 官方文档 · longcat.ai · image video understanding | 官方文档 · LongCat · Image Video Understanding | 1 | 0 | 0 |
| 官方文档 · longcat.chat · chat | 官方文档 · LongCat · Chat | 2 | 0 | 0 |
| 官方文档 · longcat.chat · models | 官方文档 · LongCat · 模型列表 | 1 | 0 | 0 |
| 官方文档 · longcat.chat · change log | 官方文档 · LongCat · Change Log | 1 | 1 | 0 |
| 官方文档 · developer.ant-ling.com · openai · developer.ant-ling.com/zh-CN/docs/api-reference/chat/openai | 官方文档 · 蚂蚁百灵 · OpenAI（文档） | 3 | 0 | 0 |
| 官方文档 · developer.ant-ling.com · ling | 官方文档 · 蚂蚁百灵 · Ling | 6 | 0 | 0 |
| 官方文档 · developer.ant-ling.com · multimodal understanding | 官方文档 · 蚂蚁百灵 · Multimodal Understanding | 5 | 0 | 0 |
| 官方文档 · developer.ant-ling.com · api reference | 官方文档 · 蚂蚁百灵 · API 文档 | 8 | 0 | 0 |
| 官方文档 · developer.ant-ling.com · openai · developer.ant-ling.com/zh-CN/docs/api-reference/openai | 官方文档 · 蚂蚁百灵 · OpenAI（文档 2） | 3 | 0 | 0 |
| 官方文档 · Hugging Face · Ling 3.0 flash VL | 官方文档 · Hugging Face · Ling 3.0-flash-VL | 1 | 0 | 0 |
| 官方文档 · Hugging Face · Ling 3.0 tiny | 官方文档 · Hugging Face · Ling 3.0-tiny | 1 | 0 | 0 |
| 官方文档 · Hugging Face · Ling 3.0 flash | 官方文档 · Hugging Face · Ling 3.0-flash | 1 | 0 | 0 |
| 下线公告 · developer.ant-ling.com · deprecation | 下线公告 · 蚂蚁百灵 · 模型下线公告 | 3 | 3 | 3 |
| 官方文档 · Hugging Face · Ling 2.6 1T | 官方文档 · Hugging Face · Ling 2.6-1T | 1 | 0 | 0 |
| 官方文档 · developer.ant-ling.com · openai | 官方文档 · 蚂蚁百灵 · OpenAI | 5 | 5 | 0 |
| 官方文档 · Hugging Face · Ling 2.6 flash | 官方文档 · Hugging Face · Ling 2.6-flash | 1 | 0 | 0 |
| 官方文档 · Hugging Face · Ring 2.6 1T | 官方文档 · Hugging Face · Ring 2.6-1T | 1 | 0 | 0 |
| 官方文档 · developer.ant-ling.com · ring | 官方文档 · 蚂蚁百灵 · Ring | 1 | 0 | 0 |
| 官方文档 · novita.ai · model apis ming image txt2img | 官方文档 · Novita · Model Apis Ming Image Txt2img | 1 | 1 | 0 |
| 官方文档 · novita.ai · model apis llm list models | 官方文档 · Novita · Model Apis Llm List Models | 1 | 0 | 0 |
| 官方文档 · novita.ai · ming image 0.1 design | 官方文档 · Novita · Ming Image 0.1 Design | 1 | 0 | 0 |
| 官方文档 · Hugging Face · Xing4.0 29B A4B | 官方文档 · Hugging Face · Xing4.0-29B A4B | 0 | 1 | 0 |
| 官方文档 · claude.com · overview | 官方文档 · Claude · Opus 5 | 0 | 1 | 0 |
| 官方文档 · claude.com · overview | 官方文档 · Claude · Sonnet 5 | 0 | 1 | 0 |
| 官方文档 · claude.com · overview | 官方文档 · Claude · Fable 5 | 0 | 1 | 0 |
| 官方文档 · claude.com · overview | 官方文档 · Claude · Opus 4-8 | 0 | 1 | 0 |
| 官方文档 · claude.com · overview | 官方文档 · Claude · Opus 4-7 | 0 | 1 | 0 |
| 官方文档 · claude.com · overview | 官方文档 · Claude · Sonnet 4-6 | 0 | 1 | 0 |
| 官方文档 · claude.com · overview | 官方文档 · Claude · Opus 4-6 | 0 | 1 | 0 |
| 官方文档 · claude.com · overview | 官方文档 · Claude · Opus 4-5 | 0 | 1 | 0 |
| 官方文档 · claude.com · overview | 官方文档 · Claude · Sonnet 4-5 | 0 | 1 | 0 |
| 官方文档 · claude.com · overview | 官方文档 · Claude · Haiku 4-5 | 0 | 1 | 0 |
| 官方文档 · x.ai · grok imagine image quality | 官方文档 · xAI · Grok-imagine-image-quality | 0 | 1 | 0 |
| 官方文档 · x.ai · grok build 0.1 | 官方文档 · xAI · Grok-build-0.1 | 0 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt 6 luna.md | 官方文档 · OpenAI · GPT-6 Luna | 0 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt 6 sol.md | 官方文档 · OpenAI · GPT-6 Sol | 0 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt image 2.5 flare.md | 官方文档 · OpenAI · GPT Image 2.5 Flare · 2026-09-08 | 0 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt image 2.5 sunburst.md | 官方文档 · OpenAI · GPT Image 2.5 Sunburst · 2026-09-08 | 0 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt 6 astra.md | 官方文档 · OpenAI · GPT-6 Astra | 0 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt 5.6 luna.md | 官方文档 · OpenAI · GPT-5.6 Luna | 0 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt 5.6 terra.md | 官方文档 · OpenAI · GPT-5.6 Terra | 0 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt 5.5.md | 官方文档 · OpenAI · GPT-5.5 · 2026-04-23 | 0 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt 5.5 pro.md | 官方文档 · OpenAI · GPT-5.5 Pro · 2026-04-23 | 0 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt 5.4.md | 官方文档 · OpenAI · GPT-5.4 · 2026-03-05 | 0 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt 5.4 mini.md | 官方文档 · OpenAI · GPT-5.4 Mini · 2026-03-17 | 0 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt 5.4 nano.md | 官方文档 · OpenAI · GPT-5.4 Nano · 2026-03-17 | 0 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt 5.4 pro.md | 官方文档 · OpenAI · GPT-5.4 Pro · 2026-03-05 | 0 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt 5.3 codex.md | 官方文档 · OpenAI · GPT-5.3-codex | 0 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt 5.2.md | 官方文档 · OpenAI · GPT-5.2 · 2025-12-11 | 0 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt 5.2 pro.md | 官方文档 · OpenAI · GPT-5.2-pro · 2025-12-11 | 0 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt 5.1.md | 官方文档 · OpenAI · GPT-5.1 · 2025-11-13 | 0 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt 5.md | 官方文档 · OpenAI · GPT-5 · 2025-08-07 | 0 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt 5 mini.md | 官方文档 · OpenAI · GPT-5-mini · 2025-08-07 | 0 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt 5 nano.md | 官方文档 · OpenAI · GPT-5-nano · 2025-08-07 | 0 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt 5 pro.md | 官方文档 · OpenAI · GPT-5-pro · 2025-10-06 | 0 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt 4.1.md | 官方文档 · OpenAI · GPT-4.1 · 2025-04-14 | 0 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt 4.1 mini.md | 官方文档 · OpenAI · GPT-4.1 Mini · 2025-04-14 | 0 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt 4.1 nano.md | 官方文档 · OpenAI · GPT-4.1-nano · 2025-04-14 | 0 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt 4o.md | 官方文档 · OpenAI · GPT-4o · 2024-08-06 | 0 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt 4o mini.md | 官方文档 · OpenAI · GPT-4o-mini · 2024-07-18 | 0 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt 4 turbo.md | 官方文档 · OpenAI · GPT-4-turbo · 2024-04-09 | 0 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt 4.md | 官方文档 · OpenAI · GPT-4 · 0613 | 0 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt image 2.md | 官方文档 · OpenAI · GPT Image 2 · 2026-04-21 | 0 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt image 1.5.md | 官方文档 · OpenAI · GPT-image-1.5 · 2025-12-16 | 0 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt image 1.md | 官方文档 · OpenAI · GPT Image 1 | 0 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt image 1 mini.md | 官方文档 · OpenAI · GPT Image 1 Mini | 0 | 1 | 0 |
| 官方文档 · developers.openai.com · chat latest.md | 官方文档 · OpenAI · chat-latest | 0 | 1 | 0 |
| 官方文档 · developers.openai.com · chatgpt image latest.md | 官方文档 · OpenAI · chatgpt-image-latest | 0 | 1 | 0 |
| 官方文档 · developers.openai.com · gpt 3.5 turbo.md | 官方文档 · OpenAI · GPT-3.5-turbo · 0125 | 0 | 1 | 0 |
| 官方文档 · developers.openai.com · o1.md | 官方文档 · OpenAI · o1 · 2024-12-17 | 0 | 1 | 0 |
| 官方文档 · developers.openai.com · o1 pro.md | 官方文档 · OpenAI · o1-pro · 2025-03-19 | 0 | 1 | 0 |
| 官方文档 · developers.openai.com · o3.md | 官方文档 · OpenAI · o3 · 2025-04-16 | 0 | 1 | 0 |
| 官方文档 · developers.openai.com · o3 mini.md | 官方文档 · OpenAI · o3-mini · 2025-01-31 | 0 | 1 | 0 |
| 官方文档 · developers.openai.com · o3 pro.md | 官方文档 · OpenAI · o3-pro · 2025-06-10 | 0 | 1 | 0 |
| 官方文档 · developers.openai.com · o4 mini.md | 官方文档 · OpenAI · o4-mini · 2025-04-16 | 0 | 1 | 0 |
| 官方文档 · developer.ideogram.ai · generate | 官方文档 · Ideogram · Generate | 0 | 7 | 0 |
| 官方文档 · developer.ideogram.ai · p image ideogram | 官方文档 · Ideogram · p-image-ideogram | 0 | 1 | 0 |
| 官方文档 · minimax.io · text generation | 官方文档 · MiniMax · Text Generation | 0 | 1 | 0 |
| 官方文档 · minimax.cn · image generation t2i | 官方文档 · MiniMax · Image Generation T2i | 0 | 1 | 0 |
| 官方文档 · fireworks.ai · glm 5p3 | 官方文档 · Fireworks · GLM 5.3 | 0 | 1 | 0 |
| 官方文档 · fireworks.ai · glm 5p3 flash | 官方文档 · Fireworks · GLM 5.3 Flash | 0 | 1 | 0 |
| 官方文档 · fireworks.ai · Kimi-K3 模型页 | 官方文档 · Fireworks · Kimi K3 | 0 | 1 | 0 |
| 官方文档 · fireworks.ai · kimi k2p5 | 官方文档 · Fireworks · Kimi K2.5 | 0 | 1 | 0 |
| 官方文档 · fireworks.ai · minimax m3 | 官方文档 · Fireworks · MiniMax M3 | 0 | 1 | 0 |
| 官方文档 · fireworks.ai · qwen3p8 max | 官方文档 · Fireworks · Qwen 3.8 Max | 0 | 1 | 0 |
| 官方文档 · fireworks.ai · qwen3p7 plus | 官方文档 · Fireworks · Qwen 3.7 Plus | 0 | 1 | 0 |
| 官方文档 · fireworks.ai · qwen3 8b | 官方文档 · Fireworks · Qwen3 8B | 0 | 1 | 0 |
| 官方文档 · fireworks.ai · gemma 4 31b it | 官方文档 · Fireworks · Gemma 4-31b It | 0 | 1 | 0 |
| 官方文档 · fireworks.ai · gpt oss 120b | 官方文档 · Fireworks · GPT-OSS 120B | 0 | 1 | 0 |
| 官方文档 · fireworks.ai · nemotron 3 ultra nvfp4 | 官方文档 · Fireworks · Nemotron 3 Ultra Nvfp4 | 0 | 1 | 0 |
| 官方文档 · fireworks.ai · nemotron lightning 3p5 30b a3b | 官方文档 · Fireworks · Nemotron Lightning 3p5-30b A3b | 0 | 1 | 0 |
| 官方文档 · fireworks.ai · nvidia nemotron 3 nano omni 30b a3b | 官方文档 · Fireworks · NVIDIA Nemotron 3 Nano Omni 30B A3B | 0 | 1 | 0 |
| 官方文档 · fireworks.ai · qwen3 omni 30b a3b instruct | 官方文档 · Fireworks · Qwen3 Omni 30B A3B Instruct | 0 | 1 | 0 |
| 官方文档 · fireworks.ai · step 3p7 flash nvfp4 | 官方文档 · Fireworks · Step 3.7 Flash · NVFP4 | 0 | 1 | 0 |
| 官方文档 · fal.ai · api | 官方文档 · fal · Seedream v5 Flash API 文档 | 0 | 1 | 0 |
| 官方文档 · fal.ai · api | 官方文档 · fal · FLUX.3 Klein Base API 文档 | 0 | 1 | 0 |
| 官方文档 · fal.ai · api | 官方文档 · fal · FLUX.3 Klein API 文档 | 0 | 1 | 0 |
| 官方文档 · fal.ai · api | 官方文档 · fal · FLUX.3 API 文档 | 0 | 1 | 0 |
| 官方文档 · fal.ai · api | 官方文档 · fal · Nano Banana 2.1 API 文档 | 0 | 1 | 0 |
| 官方文档 · fal.ai · api | 官方文档 · fal · Ideogram 4.5 API 文档 | 0 | 1 | 0 |
| 官方文档 · fal.ai · api | 官方文档 · fal · Krea 3 API 文档 | 0 | 1 | 0 |

## Appendix B. Every distinct API/OpenAPI/JSON candidate URL

“Hidden” means no exact URL appears in a current Web or Mini source row. W/M counts are cards containing that URL, before (`42ee9ffd`) → HEAD. Candidate scan includes retained raw field evidence as well as visible sources; source filtering/canonicalization is applied before display.

| URL | Type | Hidden now | Web before → now | Mini before → now |
| --- | --- | --- | ---: | ---: |
| https://api.fal.ai/v1/models | Machine | Yes | 0 → 0 | 0 → 0 |
| https://api.stability.ai/v2alpha/openapi | Machine | Yes | 1 → 0 | 0 → 0 |
| https://api.volcengine.com/api-docs/view?action=ImageGenerations&serviceCode=ark&version=2024-01-01 | Human docs | No | 1 → 1 | 0 → 0 |
| https://developers.openai.com/api/docs/deprecations | Human docs | No | 31 → 31 | 0 → 0 |
| https://developers.openai.com/api/docs/models | Human docs | No | 49 → 49 | 0 → 0 |
| https://developers.openai.com/api/docs/models/chat-latest | Human docs | No | 1 → 1 | 0 → 0 |
| https://developers.openai.com/api/docs/models/chat-latest.md | Human docs | No | 1 → 1 | 1 → 1 |
| https://developers.openai.com/api/docs/models/chatgpt-image-latest | Human docs | No | 1 → 1 | 0 → 0 |
| https://developers.openai.com/api/docs/models/chatgpt-image-latest.md | Human docs | No | 1 → 1 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-3.5-turbo | Human docs | No | 3 → 3 | 2 → 2 |
| https://developers.openai.com/api/docs/models/gpt-3.5-turbo.md | Human docs | No | 1 → 1 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-4 | Human docs | No | 2 → 2 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-4-turbo | Human docs | No | 2 → 2 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-4-turbo-preview | Human docs | No | 1 → 1 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-4-turbo.md | Human docs | No | 1 → 1 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-4.1 | Human docs | No | 2 → 2 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-4.1-mini | Human docs | No | 2 → 2 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-4.1-mini.md | Human docs | No | 1 → 1 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-4.1-nano | Human docs | No | 2 → 2 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-4.1-nano.md | Human docs | No | 1 → 1 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-4.1.md | Human docs | No | 1 → 1 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-4.md | Human docs | No | 1 → 1 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-4o | Human docs | No | 4 → 4 | 3 → 3 |
| https://developers.openai.com/api/docs/models/gpt-4o-mini | Human docs | No | 2 → 2 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-4o-mini.md | Human docs | No | 1 → 1 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-4o.md | Human docs | No | 1 → 1 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-5 | Human docs | No | 2 → 2 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-5-mini | Human docs | No | 2 → 2 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-5-mini.md | Human docs | No | 1 → 1 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-5-nano | Human docs | No | 2 → 2 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-5-nano.md | Human docs | No | 1 → 1 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-5-pro | Human docs | No | 2 → 2 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-5-pro.md | Human docs | No | 1 → 1 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-5.1 | Human docs | No | 2 → 2 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-5.1.md | Human docs | No | 1 → 1 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-5.2 | Human docs | No | 2 → 2 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-5.2-pro | Human docs | No | 1 → 1 | 0 → 0 |
| https://developers.openai.com/api/docs/models/gpt-5.2-pro.md | Human docs | No | 1 → 1 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-5.2.md | Human docs | No | 1 → 1 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-5.3-codex | Human docs | No | 1 → 1 | 0 → 0 |
| https://developers.openai.com/api/docs/models/gpt-5.3-codex.md | Human docs | No | 1 → 1 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-5.4 | Human docs | No | 1 → 1 | 0 → 0 |
| https://developers.openai.com/api/docs/models/gpt-5.4-mini | Human docs | No | 1 → 1 | 0 → 0 |
| https://developers.openai.com/api/docs/models/gpt-5.4-mini.md | Human docs | No | 1 → 1 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-5.4-nano | Human docs | No | 1 → 1 | 0 → 0 |
| https://developers.openai.com/api/docs/models/gpt-5.4-nano.md | Human docs | No | 1 → 1 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-5.4-pro | Human docs | No | 1 → 1 | 0 → 0 |
| https://developers.openai.com/api/docs/models/gpt-5.4-pro.md | Human docs | No | 1 → 1 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-5.4.md | Human docs | No | 1 → 1 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-5.5 | Human docs | No | 1 → 1 | 0 → 0 |
| https://developers.openai.com/api/docs/models/gpt-5.5-pro | Human docs | No | 1 → 1 | 0 → 0 |
| https://developers.openai.com/api/docs/models/gpt-5.5-pro.md | Human docs | No | 1 → 1 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-5.5.md | Human docs | No | 1 → 1 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-5.6-luna | Human docs | No | 1 → 1 | 0 → 0 |
| https://developers.openai.com/api/docs/models/gpt-5.6-luna.md | Human docs | No | 1 → 1 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-5.6-sol.md | Human docs | No | 1 → 1 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-5.6-terra | Human docs | No | 1 → 1 | 0 → 0 |
| https://developers.openai.com/api/docs/models/gpt-5.6-terra.md | Human docs | No | 1 → 1 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-5.md | Human docs | No | 1 → 1 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-6-astra | Human docs | No | 1 → 1 | 0 → 0 |
| https://developers.openai.com/api/docs/models/gpt-6-astra.md | Human docs | No | 1 → 1 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-6-luna | Human docs | No | 1 → 1 | 0 → 0 |
| https://developers.openai.com/api/docs/models/gpt-6-luna.md | Human docs | No | 1 → 1 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-6-sol | Human docs | No | 1 → 1 | 0 → 0 |
| https://developers.openai.com/api/docs/models/gpt-6-sol.md | Human docs | No | 1 → 1 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-6.1-sol | Human docs | No | 1 → 1 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-daybreak-blue-latest | Human docs | No | 1 → 1 | 0 → 0 |
| https://developers.openai.com/api/docs/models/gpt-image-1 | Human docs | No | 2 → 2 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-image-1-mini | Human docs | No | 1 → 1 | 0 → 0 |
| https://developers.openai.com/api/docs/models/gpt-image-1-mini.md | Human docs | No | 1 → 1 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-image-1.5 | Human docs | No | 3 → 3 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-image-1.5.md | Human docs | No | 2 → 2 | 2 → 2 |
| https://developers.openai.com/api/docs/models/gpt-image-1.md | Human docs | No | 1 → 1 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-image-2 | Human docs | No | 4 → 4 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-image-2.5-flare | Human docs | No | 3 → 3 | 2 → 2 |
| https://developers.openai.com/api/docs/models/gpt-image-2.5-flare.md | Human docs | No | 1 → 1 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst | Human docs | No | 3 → 3 | 2 → 2 |
| https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst.md | Human docs | No | 1 → 1 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-image-2.6-flare | Human docs | No | 1 → 1 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-image-2.6-sunburst | Human docs | No | 1 → 1 | 1 → 1 |
| https://developers.openai.com/api/docs/models/gpt-image-2.md | Human docs | No | 2 → 2 | 2 → 2 |
| https://developers.openai.com/api/docs/models/gpt-oss-120b | Human docs | No | 1 → 1 | 1 → 1 |
| https://developers.openai.com/api/docs/models/o1 | Human docs | No | 2 → 2 | 1 → 1 |
| https://developers.openai.com/api/docs/models/o1-pro | Human docs | No | 2 → 2 | 1 → 1 |
| https://developers.openai.com/api/docs/models/o1-pro.md | Human docs | No | 1 → 1 | 1 → 1 |
| https://developers.openai.com/api/docs/models/o1.md | Human docs | No | 1 → 1 | 1 → 1 |
| https://developers.openai.com/api/docs/models/o3 | Human docs | No | 2 → 2 | 1 → 1 |
| https://developers.openai.com/api/docs/models/o3-mini | Human docs | No | 2 → 2 | 1 → 1 |
| https://developers.openai.com/api/docs/models/o3-mini.md | Human docs | No | 1 → 1 | 1 → 1 |
| https://developers.openai.com/api/docs/models/o3-pro | Human docs | No | 2 → 2 | 1 → 1 |
| https://developers.openai.com/api/docs/models/o3-pro.md | Human docs | No | 1 → 1 | 1 → 1 |
| https://developers.openai.com/api/docs/models/o3.md | Human docs | No | 1 → 1 | 1 → 1 |
| https://developers.openai.com/api/docs/models/o4-mini | Human docs | No | 2 → 2 | 1 → 1 |
| https://developers.openai.com/api/docs/models/o4-mini.md | Human docs | No | 1 → 1 | 1 → 1 |
| https://docs.siliconflow.cn/docs/api/images-generations-post | Human docs | No | 2 → 2 | 0 → 0 |
| https://fal.ai/models/alibaba/qwen-image-3/text-to-image/api | Human docs | No | 1 → 1 | 1 → 1 |
| https://fal.ai/models/blackforestlabs/flux-3/edit-image/api | Human docs | No | 1 → 1 | 0 → 0 |
| https://fal.ai/models/blackforestlabs/flux-3/klein/base/edit-image/api | Human docs | No | 1 → 1 | 0 → 0 |
| https://fal.ai/models/blackforestlabs/flux-3/klein/base/text-to-image/api | Human docs | No | 1 → 1 | 1 → 1 |
| https://fal.ai/models/blackforestlabs/flux-3/klein/edit-image/api | Human docs | No | 1 → 1 | 0 → 0 |
| https://fal.ai/models/blackforestlabs/flux-3/klein/text-to-image/api | Human docs | No | 1 → 1 | 1 → 1 |
| https://fal.ai/models/blackforestlabs/flux-3/text-to-image/api | Human docs | No | 1 → 1 | 1 → 1 |
| https://fal.ai/models/bria/fibo-edit-1.5/edit/api | Human docs | No | 1 → 1 | 1 → 1 |
| https://fal.ai/models/bria/fibo-gen-1.5/text-to-image/api | Human docs | No | 1 → 1 | 1 → 1 |
| https://fal.ai/models/bytedance/seedream/v5/flash/edit/api | Human docs | No | 1 → 1 | 0 → 0 |
| https://fal.ai/models/bytedance/seedream/v5/flash/text-to-image/api | Human docs | No | 1 → 1 | 1 → 1 |
| https://fal.ai/models/bytedance/seedream/v5/pro/text-to-image/api | Human docs | No | 1 → 1 | 1 → 1 |
| https://fal.ai/models/fal-ai/bytedance/seedream/v4.5/text-to-image/api | Human docs | No | 1 → 1 | 1 → 1 |
| https://fal.ai/models/fal-ai/bytedance/seedream/v4/text-to-image/api | Human docs | No | 1 → 1 | 1 → 1 |
| https://fal.ai/models/fal-ai/bytedance/seedream/v5/lite/edit/api | Human docs | No | 1 → 1 | 1 → 1 |
| https://fal.ai/models/fal-ai/fast-sdxl/api | Human docs | No | 1 → 1 | 1 → 1 |
| https://fal.ai/models/fal-ai/flux-1/schnell/api | Human docs | No | 1 → 1 | 1 → 1 |
| https://fal.ai/models/fal-ai/flux-2-flex/api | Human docs | No | 1 → 1 | 1 → 1 |
| https://fal.ai/models/fal-ai/flux-2-pro/api | Human docs | No | 1 → 1 | 1 → 1 |
| https://fal.ai/models/fal-ai/flux-2/api | Human docs | No | 1 → 1 | 1 → 1 |
| https://fal.ai/models/fal-ai/flux-2/flash/api | Human docs | No | 1 → 1 | 1 → 1 |
| https://fal.ai/models/fal-ai/flux-2/klein/9b/api | Human docs | No | 1 → 1 | 1 → 1 |
| https://fal.ai/models/fal-ai/flux-2/turbo/api | Human docs | No | 1 → 1 | 1 → 1 |
| https://fal.ai/models/fal-ai/flux-kontext-lora/api | Human docs | No | 1 → 1 | 1 → 1 |
| https://fal.ai/models/fal-ai/flux-lora/api | Human docs | No | 1 → 1 | 1 → 1 |
| https://fal.ai/models/fal-ai/flux-pro/kontext/api | Human docs | No | 1 → 1 | 1 → 1 |
| https://fal.ai/models/fal-ai/flux-pro/v1.1-ultra/api | Human docs | No | 1 → 1 | 1 → 1 |
| https://fal.ai/models/fal-ai/flux-pro/v1.1/api | Human docs | No | 1 → 1 | 1 → 1 |
| https://fal.ai/models/fal-ai/flux/dev/api | Human docs | No | 1 → 1 | 1 → 1 |
| https://fal.ai/models/fal-ai/flux/schnell/api | Human docs | No | 1 → 1 | 1 → 1 |
| https://fal.ai/models/fal-ai/gpt-image-1.5/api | Human docs | No | 1 → 1 | 1 → 1 |
| https://fal.ai/models/fal-ai/ideogram/v3/api | Human docs | No | 1 → 1 | 1 → 1 |
| https://fal.ai/models/fal-ai/krea-2/turbo/api | Human docs | No | 1 → 1 | 1 → 1 |
| https://fal.ai/models/fal-ai/nano-banana-2/api | Human docs | No | 1 → 1 | 0 → 0 |
| https://fal.ai/models/fal-ai/nano-banana-pro/api | Human docs | No | 1 → 1 | 0 → 0 |
| https://fal.ai/models/fal-ai/nano-banana/api | Human docs | No | 1 → 1 | 0 → 0 |
| https://fal.ai/models/fal-ai/qwen-image/api | Human docs | No | 1 → 1 | 1 → 1 |
| https://fal.ai/models/fal-ai/recraft/v3/text-to-image/api | Human docs | No | 1 → 1 | 1 → 1 |
| https://fal.ai/models/fal-ai/recraft/v4/pro/text-to-image/api | Human docs | No | 1 → 1 | 1 → 1 |
| https://fal.ai/models/fal-ai/z-image/turbo/api | Human docs | No | 1 → 1 | 1 → 1 |
| https://fal.ai/models/google/nano-banana-2-lite/api | Human docs | No | 1 → 1 | 0 → 0 |
| https://fal.ai/models/google/nano-banana-2.1/api | Human docs | No | 1 → 1 | 1 → 1 |
| https://fal.ai/models/google/nano-banana-2.1/edit/api | Human docs | No | 1 → 1 | 0 → 0 |
| https://fal.ai/models/ideogram/v4.5/api | Human docs | No | 1 → 1 | 1 → 1 |
| https://fal.ai/models/ideogram/v4.5/edit/api | Human docs | No | 1 → 1 | 0 → 0 |
| https://fal.ai/models/imagineart/imagineart-2.0-preview/text-to-image/api | Human docs | No | 1 → 1 | 1 → 1 |
| https://fal.ai/models/krea/v2/large/text-to-image/api | Human docs | No | 1 → 1 | 1 → 1 |
| https://fal.ai/models/krea/v3/edit/api | Human docs | No | 1 → 1 | 0 → 0 |
| https://fal.ai/models/krea/v3/text-to-image/api | Human docs | No | 1 → 1 | 1 → 1 |
| https://fal.ai/models/meta/muse-image/text-to-image/api | Human docs | No | 1 → 1 | 1 → 1 |
| https://fal.ai/models/openai/gpt-image-2.5/flare/text-to-image/api | Human docs | No | 1 → 1 | 1 → 1 |
| https://fal.ai/models/openai/gpt-image-2.5/sunburst/text-to-image/api | Human docs | No | 1 → 1 | 1 → 1 |
| https://fal.ai/models/openai/gpt-image-2/api | Human docs | No | 1 → 1 | 1 → 1 |
| https://fal.ai/models/xai/grok-imagine-image/api | Human docs | No | 1 → 1 | 1 → 1 |
| https://fal.ai/models/xai/grok-imagine-image/quality/text-to-image/api | Human docs | No | 1 → 1 | 1 → 1 |
| https://fal.ai/models/xai/grok-imagine-image/v2.0/text-to-image/api | Human docs | No | 1 → 1 | 1 → 1 |
| https://github.com/OpenSenseNova/SenseNova6.8/blob/main/API.md | Human docs | No | 1 → 1 | 1 → 1 |
| https://huggingface.co/Qwen/Qwen3-Omni-30B-A3B-Instruct/blob/main/config.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://huggingface.co/Qwen/Qwen3-Omni-30B-A3B-Thinking/blob/main/config.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://huggingface.co/deepseek-ai/DeepSeek-V3.1/raw/main/config.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro-0813/blob/main/config.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://huggingface.co/meituan-longcat/LongCat-2.0/blob/main/config.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://huggingface.co/moonshotai/Kimi-K2-Thinking/raw/main/config.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://longcat.ai/platform/docs/zh/api/model-params | Human docs | No | 1 → 1 | 1 → 1 |
| https://longcat.chat/platform/docs/api/chat | Human docs | No | 2 → 2 | 0 → 0 |
| https://longcat.chat/platform/docs/zh/api/models.html | Human docs | No | 1 → 1 | 0 → 0 |
| https://maas.xfyun.cn/api/v1/gpt-finetune/model/base/list-v2?page=1&size=9999 | Machine | Yes | 0 → 0 | 0 → 0 |
| https://mimo.mi.com/docs/zh-CN/api/chat/openai-api | Human docs | No | 2 → 4 | 0 → 2 |
| https://replicate.com/adirik/realvisxl-v3.0-turbo/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/ai-forever/kandinsky-2.2/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/ai-forever/kandinsky-2/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/alibaba/qwen-image-3-pro/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/alibaba/qwen-image-3/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/alibaba/wan-3/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/anthropic/claude-opus-5.5/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/black-forest-labs/flux-1.1-pro-ultra/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/black-forest-labs/flux-1.1-pro/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/black-forest-labs/flux-2-flex/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/black-forest-labs/flux-2-klein-4b/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/black-forest-labs/flux-2-max/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/black-forest-labs/flux-2-pro/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/black-forest-labs/flux-3-image/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/black-forest-labs/flux-dev-lora/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/black-forest-labs/flux-dev/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/black-forest-labs/flux-kontext-dev/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/black-forest-labs/flux-kontext-max/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/black-forest-labs/flux-pro/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/black-forest-labs/flux-schnell/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/bria/fibo-edit/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/bria/fibo/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/bria/image-3.2/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/bytedance/bagel/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/bytedance/sdxl-lightning-4step/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/bytedance/seedream-3/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/bytedance/seedream-4.5/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/bytedance/seedream-4/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/bytedance/seedream-5-lite/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/datacte/proteus-v0.2/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/datacte/proteus-v0.3/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/fofr/latent-consistency-model/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/fofr/sdxl-emoji/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/fofr/sticker-maker/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/google/gemini-3-flash/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/google/imagen-3-fast/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/google/imagen-3/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/google/imagen-4-fast/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/google/imagen-4-ultra/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/google/imagen-4/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/google/nano-banana-2.1/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/ideogram-ai/ideogram-4-5-precise-edit/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/ideogram-ai/ideogram-4-5/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/ideogram-ai/ideogram-v2-turbo/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/ideogram-ai/ideogram-v2/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/ideogram-ai/ideogram-v2a-turbo/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/ideogram-ai/ideogram-v2a/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/ideogram-ai/ideogram-v3-balanced/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/ideogram-ai/ideogram-v3-quality/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/ideogram-ai/ideogram-v3-turbo/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/krea/krea-2-medium/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/leonardoai/lucid-origin/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/lucataco/dreamshaper-xl-turbo/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/lucataco/open-dalle-v1.1/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/lucataco/ssd-1b/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/luma/photon-flash/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/luma/photon/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/minimax/image-01/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/nvidia/sana-sprint-1.6b/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/playgroundai/playground-v2.5-1024px-aesthetic/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/prunaai/flux-fast/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/prunaai/flux-kontext-fast/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/prunaai/hidream-l1-dev/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/prunaai/hidream-l1-fast/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/prunaai/hidream-l1-full/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/prunaai/p-image-edit/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/prunaai/p-image-ideogram/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/prunaai/p-image-lora/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/prunaai/p-image/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/prunaai/sdxl-lightning/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/prunaai/wan-2.2-image/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/prunaai/z-image-turbo/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/qwen/qwen-image-edit-plus/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/qwen/qwen-image-edit/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/qwen/qwen-image/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/qwen/qwen3-235b-a22b-instruct-2507/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/recraft-ai/recraft-v3/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/recraft-ai/recraft-v4-pro/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/recraft-ai/recraft-v4.1/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/sourceful/riverflow-2.0-pro/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/stability-ai/sdxl/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/stability-ai/stable-diffusion-3.5-large-turbo/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/stability-ai/stable-diffusion-3.5-large/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/stability-ai/stable-diffusion-3.5-medium/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/stability-ai/stable-diffusion/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/tencent/hunyuan-image-3/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/tstramer/material-diffusion/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/wan-video/wan-2.7-image-pro/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/wan-video/wan-2.7-image/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/xai/grok-imagine-image-2/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/xai/grok-imagine-image/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://replicate.com/zsxkib/step1x-edit/api/schema | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/alibaba-qwen-image-2-0-pro/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/alibaba-qwen-image-2-0/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/alibaba-qwen-image-2-1-pro/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/alibaba-qwen-image-2-1-turbo/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/alibaba-qwen-image-2512/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/alibaba-qwen-image-3-0-pro/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/alibaba-qwen-image-3-0/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/alibaba-qwen-image-edit-2511/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/alibaba-qwen-image-edit-plus/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/alibaba-qwen-image-edit/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/alibaba-qwen-image/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/alibaba-qwen2-5-vl-3b-instruct/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/alibaba-qwen2-5-vl-7b-instruct/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/alibaba-wan2-5-preview-image/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/alibaba-wan2-6-image/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/alibaba-wan2-7-image-pro/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/alibaba-wan2-7-image/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/alibaba-z-image-turbo/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/alibaba-z-image/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/anthropic-claude-fable-5/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/anthropic-claude-haiku-4-5/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/anthropic-claude-opus-4-7/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/anthropic-claude-opus-4-8/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/anthropic-claude-sonnet-4-6/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/baidu-ernie-image-turbo/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/baidu-ernie-image/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/bfl-flux-1-1-pro-ultra/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/bfl-flux-1-1-pro/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/bfl-flux-1-dev/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/bfl-flux-1-fill-dev/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/bfl-flux-1-fill-pro/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/bfl-flux-1-kontext-dev/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/bfl-flux-1-kontext-max/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/bfl-flux-1-kontext-pro/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/bfl-flux-1-schnell/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/bfl-flux-2-dev/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/bfl-flux-2-flex/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/bfl-flux-2-klein-4b-base/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/bfl-flux-2-klein-4b/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/bfl-flux-2-klein-9b-base/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/bfl-flux-2-klein-9b-kv/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/bfl-flux-2-klein-9b/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/bfl-flux-2-max/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/bfl-flux-2-pro/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/bfl-flux-3-image-klein-base/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/bfl-flux-3-image-klein/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/bfl-flux-3-image/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/bria-3-2/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/bria-fibo-edit/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/bria-fibo-lite/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/bria-fibo/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/bria-image-replace-background/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/bytedance-seedream-4-0/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/bytedance-seedream-4-5/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/bytedance-seedream-5-0-flash/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/bytedance-seedream-5-0-lite/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/bytedance-seedream-5-0-pro/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/flux-1-dev-srpo/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/google-gemini-3-1-flash-lite/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/google-gemini-3-1-pro/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/google-gemini-3-5-flash/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/google-gemini-3-flash/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/google-gemma-4-31b/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/google-nano-banana-2-1/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/google-nano-banana-2-lite/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/google-nano-banana-2/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/google-nano-banana-pro/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/hidream-i1-dev/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/hidream-i1-fast/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/hidream-i1-full/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/ideogram-2-0-remix/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/ideogram-2-0/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/ideogram-2a-remix/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/ideogram-2a/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/ideogram-3-0-edit/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/ideogram-3-0-remix/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/ideogram-3-0-replace-background/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/ideogram-3-0/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/ideogram-4-0-remix/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/ideogram-4-0/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/ideogram-4-0q/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/ideogram-4-5-precise-edit/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/ideogram-4-5/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/imagineart-1-5-pro/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/imagineart-1-5/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/imagineart-2-0/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/kandinsky-5-0-image-lite/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/klingai-image-3-0/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/klingai-image-o1/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/klingai-image-o3/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/krea-2-large/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/krea-2-medium-turbo/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/krea-2-medium/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/krea-2-raw/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/krea-2-turbo/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/krea-flux-1-krea-dev/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/luma-uni-1-max/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/luma-uni-1/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/meta-llava-1-6-mistral-7b/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/meta-muse-image/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/minimax-m2-7-highspeed/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/minimax-m2-7/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/minimax-m3/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/openai-gpt-5-4-mini/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/openai-gpt-5-4-nano/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/openai-gpt-5-4-pro/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/openai-gpt-5-4/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/openai-gpt-5-5/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/openai-gpt-5-mini/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/openai-gpt-5-nano/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/openai-gpt-image-1-5/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/openai-gpt-image-1-mini/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/openai-gpt-image-1/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/openai-gpt-image-2-5-flare/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/openai-gpt-image-2-5-sunburst/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/openai-gpt-image-2/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/prunaai-p-image-edit/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/prunaai-p-image-ideogram/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/prunaai-p-image/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/recraft-v4-1-pro/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/recraft-v4-1-utility-pro/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/recraft-v4-1-utility/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/recraft-v4-1/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/recraft-v4-pro/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/recraft-v4/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/rundiffusion-juggernaut-base-flux/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/rundiffusion-juggernaut-lightning-flux/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/rundiffusion-juggernaut-pro-flux/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/rundiffusion-juggernaut-z-fast/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/rundiffusion-juggernaut-z/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/runway-gen-4-image-turbo/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/runway-gen-4-image/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/sourceful-riverflow-2-0-fast/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/sourceful-riverflow-2-0-pro/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/sourceful-riverflow-2-5-fast/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/sourceful-riverflow-2-5-pro/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/stabilityai-stable-diffusion-3/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/stabilityai-stable-diffusion-xl-v1-0-vae-fix/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/twinflow-z-image-turbo/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/vidu-q1-image/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/xai-grok-4-3/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/xai-grok-imagine-image-2-0/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/xai-grok-imagine-image-quality/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/xai-grok-imagine-image/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://runware.ai/docs/models/zai-glm-5-1/schema.json | Machine | Yes | 0 → 0 | 0 → 0 |
| https://tokendance.space/portal/api/models/cogevol-base | Machine | Yes | 0 → 0 | 0 → 0 |
| https://tokendance.space/portal/api/models/cogevol-interactive-0828 | Machine | Yes | 0 → 0 | 0 → 0 |
| https://tokendance.space/portal/api/models/cogevol-slide-0828 | Machine | Yes | 0 → 0 | 0 → 0 |
| https://tokendance.space/portal/api/models/ling-3.1-flash | Machine | Yes | 0 → 0 | 0 → 0 |
| https://tokendance.space/portal/api/models/ling-3.1-flash/endpoints/stats?window=30m | Machine | Yes | 0 → 0 | 0 → 0 |
| https://tokendance.space/portal/api/models/mimo-v2.6-flash | Machine | Yes | 0 → 0 | 0 → 0 |
| https://tokendance.space/portal/api/models/mimo-v2.6-pro | Machine | Yes | 0 → 0 | 0 → 0 |
| https://tokendance.space/portal/api/models/mimo-v2.6-ultraspeed | Machine | Yes | 0 → 0 | 0 → 0 |


**R23 Phase H2 — PASS (operator HEAD `c75aa00f`).** The two newly failing Core/Gateway R21 source expectations were stale after item 1: `deepseek-v4.1-flash` appends `https://api-docs.deepseek.com/quick_start/pricing/` for vendor `maxOutputTokens` (384K), and `qwen3.6-plus` appends `https://help.aliyun.com/zh/model-studio/models` for vendor `maxOutputTokens` (65,536). Both fields display `源自原厂`; each appended link is human documentation, distinct from the channel page, and labelled `原厂规格`. Expectations now derive appended URLs from vendor fields, retain channel-first order and historical fallbacks, enforce canonical deduplication, and reject portal API/OpenAPI/JSON/YAML evidence. The explicit DeepSeek case is covered in both files. Core and Gateway R21 files pass **3/3 each**; all **four execution locks** pass; **16 selected Web files pass 109/109** (including the Web lock), with all 1,064 cards / 166 vendor fields retaining human links; ledger regression tests pass **2/2**. All **19 applicable maintenance `--check` scripts** and ledger checks with `core.abbrev=7` and `12` pass, without skips. [Both expectation reviews](model-modality-changed-tests.md) and the frozen inventory are updated; no product code changed. Local command/log inventory: `.audit-input/r23/h2/validation.json`.
