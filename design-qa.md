# PaperBanana Arena 式排行榜设计 QA

## Comparison target

- Source visual truth: `/var/folders/j9/mr21v8tx3nqf_yd0sfxvvrk80000gn/T/codex-clipboard-a5fe7d3f-f242-4fda-b1f7-7eb0cb2b7ba8.png`
- Source size: `2786 × 1386` px.
- Rendered implementation: `http://localhost:5173/leaderboard`
- Desktop screenshot: `/tmp/paperbanana-leaderboard-desktop-viewport-real.png` (PNG, `1440 × 1000` px, CSS viewport `1440 × 1000`, device scale factor 1).
- Matrix screenshot: `/tmp/paperbanana-leaderboard-matrix-real.png` (PNG, `1440 × 1000` px, same viewport after scrolling to the matrix).
- Mobile screenshots: `/tmp/paperbanana-leaderboard-430-real.png` (PNG, `430 × 932`) and `/tmp/paperbanana-leaderboard-390-real.png` (PNG, `390 × 844`).
- Combined focused comparison: `/tmp/paperbanana-design-compare.png` (`2424 × 597`). The reference was normalized to `1200 × 597`; the implementation matrix region was cropped from `y=175`, `1440 × 716`, then normalized to `1200 × 597` and placed beside it.
- State: published `codex_single` leaderboard projection rendered with the 31 successful models from the final reviewed result source; no paid provider or Judge request was made.

## Full-view comparison evidence

- The desktop implementation keeps the Arena reference's dense, low-decoration information hierarchy while using PaperBanana's warm paper background, dark navigation, banana-yellow accents, and existing brand mark.
- The required page sequence is visible: hero, compact methodology disclosure, seven Top10 cards, then the full Overall matrix.
- All seven cards use consistent row height, rank badges, model identity, score bars, two-decimal scores, and a complete-ranking link. The seventh singleton card remains the same width and is centered.
- The implementation does not reproduce Arena branding or confidence intervals. It adds the requested numeric score beside every rank.

## Focused matrix comparison evidence

- Both source and implementation use a sticky model identity column followed by Overall and seven sortable metric columns.
- Thin grid lines and compact rows preserve the source's scanning density. PaperBanana adds canonical model IDs as restrained secondary text without displacing the primary model name.
- First, second, and third place cells use low-saturation gold, silver, and bronze backgrounds. Other cells remain neutral, so the color treatment does not overpower the data.
- Scores use two decimals and appear beside competition ranks (`#1 · 9.32`). The rendered table contains no confidence interval values or labels.

## Responsive and interaction evidence

- At `430px`: document `scrollWidth=430`, matrix `clientWidth=408`, matrix `scrollWidth=1120`, sticky model column active, page overflow false.
- At `390px`: document `scrollWidth=390`, matrix `clientWidth=368`, matrix `scrollWidth=1120`, sticky model column active, page overflow false.
- Model search reduced the 31-row matrix to the exact matching row. Selecting 美观度 moved `aria-sort="descending"` to that column and re-sorted by its raw score.
- “查看完整排名” navigated to `/leaderboard/aesthetics`, rendered 31 rows, and retained the same visual system.
- Page title, nonblank DOM, loading completion, route identity, and primary interactions passed. Browser console contained no errors or warnings in the desktop or mobile checks.

## Required fidelity surfaces

- Fonts and typography: passed. Existing system Chinese/Latin stacks produce crisp dense-table text, with clear display, heading, body, label, and monospace score hierarchy.
- Spacing and layout rhythm: passed. Hero, methodology, card grid, centered seventh card, matrix controls, and table rows align consistently at desktop and mobile sizes.
- Colors and visual tokens: passed. Warm neutrals, dark ink, muted blue score bars, and restrained podium fills match the approved PaperBanana adaptation of the Arena structure.
- Image quality and asset fidelity: passed. The existing PaperBanana logo is reused; no placeholder, generated decoration, fake brand asset, or rasterized UI text was introduced.
- Copy and content: passed. The page states the four-task lightweight method, Codex two-pass review, equal weighting, cross-resolution caveat, and sample limitation without old no-overall or confidence-interval claims.

## Findings

- No actionable P0, P1, or P2 findings remain.
- P3 follow-up: none required for this release.

## Comparison history

- Initial implementation review found direct-route static hosting gaps, trailing-slash handling, methodology order, sort semantics, keyboard focus visibility, and non-root base-path issues.
- Fixes added explicit static entries plus a scoped 404 fallback, trailing-slash normalization, correct section order, `aria-sort`, visible focus outlines, base-aware internal paths, canonical fallback cleanup, and focusable horizontal-scroll regions.
- Post-fix screenshots and DOM measurements confirm the issues are closed at desktop, `430px`, and `390px`.

## Implementation checklist

- [x] Arena-style seven-dimension overview cards.
- [x] Overall plus seven-dimension matrix with rank and score.
- [x] Full dimension routes, search, sorting, and canonical fallback behavior.
- [x] Desktop and mobile overflow containment.
- [x] Console, title, DOM, accessibility state, and interaction checks.

final result: passed
