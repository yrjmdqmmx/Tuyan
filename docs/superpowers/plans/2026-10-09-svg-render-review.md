# SVG 实际画面与代码评审 Implementation Plan

> For agentic workers: use subagent-driven-development for the isolated rendering module and review; execute the integrated workflow tasks in this existing worktree. No commit, production deployment, paid call or Mini Program changes in this task.

**Goal:** SVG 先生成再评审，评审同时覆盖当前文件实际画面与完整代码，最终交付版本与检查证据一致；修订后的新版本明确标记尚未复审。

**Architecture:** 单独的 SVG 验证/渲染模块产出源码 SHA-256 与实际 PNG SHA-256。Core 按候选维护版本与检查历史；每轮一次决策（辅助模式额外一次观察），每轮包含检查与必要修订，预算耗尽可交付最后修订版但明确未复审；修订失败保留最近成功文件。共享策略增加 SVG 视觉门禁、图库真实图片门禁及执行角色选择；Web 展示未评审、通过、有问题、失败。Recraft 使用精确白名单与完整上下文，原生 generation 通过 style_reference_urls 传实际图片，V3/V4/V4.1 修订通过 imageToImage 传上一版，V2 用上一版作风格参考；明确能力限制且不更换路线。

**Tech Stack:** Node 24 / TypeScript, existing Core/Gateway fixture, React, resvg/sharp, object storage, SHA-256.

## Accepted decisions

- User clarified review semantics after the initial specification: one round includes inspecting the current render/code, deciding a complete revision plan, and generating a revised SVG if necessary. R rounds permit at most R inspections and R revisions after initial generation. No hidden inspection follows the last revision.
- A successfully revised version becomes the deliverable with modified_unreviewed status until the next round actually inspects it. A failed revision retains the previous successful SVG and its evidence, with failure status; no pass is inherited across versions.
- Each inspection records version, SVG hash, PNG hash, inspected status and findings. Visual observer receives current PNG/context; decision maker receives SVG/context plus PNG or observer report. Prompts demand explicit visual/code verdicts.
- All reference-library modes, including vanilla, consume actual pictures. Prefer capable main for vanilla reference planning; otherwise require enabled capable observer. No text-only fallback for selected image references.
- Recraft native generation explicitly sets the selected model and passes actual PNG/JPEG/WebP bytes via style_reference_urls (up to 10); this can incur the documented private style creation surcharge. V3/V4/V4.1 revisions pass the exact previous SVG raster via imageToImage; the product explicitly explains this single-source route does not resend initial style references. V2 revisions use original references plus previous raster as style references on generations, explicitly without composition/local-edit guarantees. Unknown/other channels are not promoted to supported. Full context, prompt/count/byte/dimension limits are validated without truncation.
- Recraft final prompt contains plan, full methodology/caption, preservation requirements, avoidance, type, ratio and revision instructions. Validate complete length before send; never truncate. Original references remain identified in revision context; transmission policy and actual previous image are explicit.
- No migration of third-party PaperBananaBench names or API/protocol/path identifiers. Change only own-project prompt prose to 图研.
- Mini Program paused: generators gain explicit skip option and this task only updates Web/shared outputs; SYNC records deferred Mini work.

## Tasks

- [x] Rendering: add `apps/paperbanana-api/src/svg-review.ts` with strict XML/safety validation, bounded rasterization, real font support, source/render hashes and meaningful local tests. Package required parser/fonts/runtime support in Core Docker build. Tests verify actual raster pixel/text difference and malformed/external content refusal.
- [x] Shared policy: update `packages/api/src/workflow.ts`, `packages/types/src/workflow.ts`, `scripts/sync-workflow.mjs`, Web workflow preflight/labels/explanations. New capability handshake prevents new client claiming old text-only workflow compliance.
- [x] Prompts and Recraft: add explicit SVG observer/decision/generation and complete Recraft context helpers; exact provider contract/limits; replace project names in prompt strings only. Add source verification record with official URLs/date and clear real-call gaps.
- [x] Core execution: replace pre-generation text loop with generate → render → inspect → revise loop; bind immutable version artifacts, implement fail-closed inspection parsing and last-successful retention with exact inspection/version binding. Basic and zero-review remain unreviewed. Real reference image preparation for all modes and role-aware credential selection.
- [x] Request-level tests: ordinary SVG direct/assist, Recraft generation/reference/revision, zero/one/two/max-round bounds, malformed/failed code/render/review, version hashes, no hidden calls, reference bytes and complete context, preflight missing visual capability, unsupported/multiple/oversize references.
- [x] Integration: update stale assertions/fixtures, run focused then Core/Web suites, typecheck/build and generator checks with Mini skipped; verify statuses/help in DOM tests. Inspect final diff, update SYNC and validation report, record no production or real inference validation.

## Validation commands

Use `PATH=/Library/Developer/CommandLineTools/usr/bin:/Users/a1-6/.nvm/versions/node/v24.15.0/bin:$PATH`.

```sh
pnpm --filter @paperbanana/paperbanana-api check
pnpm --filter @paperbanana/paperbanana-api test
pnpm --filter @paperbanana/paperbanana-api build
pnpm --filter @paperbanana/web test
pnpm --filter @paperbanana/web build
node scripts/sync-workflow.mjs --check --skip-miniprogram
node scripts/sync-model-catalog.mjs --check --skip-miniprogram
node scripts/sync-thinking.mjs --check
git diff --check
```

New meaningful tests must fail on the prior SVG text-only behavior, assert serialized request images/code/context, and compare delivered hashes against the exact inspected version. No real provider credentials are needed.
