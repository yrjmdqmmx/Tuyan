# Web language preference and localization

Updated locally on 2026-09-22. This document is implementation and local QA evidence, not a release record.

## Shared behavior

- `main.jsx` owns one `AppLocaleProvider` for the workbench, leaderboard (including subpages) and changelog. Existing `BenchmarkLocaleProvider` imports remain compatible; a nested wrapper reuses the parent state.
- `tuyan.language.v1` stores `zh-CN` or `en`. When absent, the previous `tuyan.benchmark.language.v1` preference is read. New choices write both keys for compatibility. A storage event updates other open tabs. Blocked storage still permits in-page switching.
- `LanguageSwitch.jsx` is rendered by the shared header. Desktop uses a compact language pill in the top navigation. Mobile keeps a 44px-high action beside account and More, with no duplicate inside More.
- Language changes do not key/remount the workspace or modify drafts, credentials, selected IDs, task records or request payloads. Page titles and document language follow the same preference.

## Text maintenance

- Existing benchmark dictionaries are retained. Workbench UI translations live in `apps/web/src/i18n/workbench.en.json`; published changelog translations live in `apps/web/src/i18n/changelog.en.json`.
- Use `useAppLocale().t()` at display boundaries. The Chinese source text remains the default and untranslated keys fall back to that source. Interpolation uses named placeholders, e.g. `t('精修固定输出 PNG；清晰度（{size}）与目标比例（{ratio}）请在精修面板设置。', {size, ratio})`.
- Do not translate provider/model IDs, protocol values, API fields, user inputs, generated task content, connection instructions copied to agents, or historical source records. Source document titles and upstream explanations may retain their original language.
- Changelog versions, dates, release state, source links and ordering remain solely in `data/changelog.json`; its content is translated only for display. New public entries also need English text. `appLocalization.test.js` checks titles, summaries, notes and changes for every public version/event.
- This pass covers the shared header, workbench generation/settings/editing/history/guide and common account controls, plus the changelog. Some deep account-privacy and reference-library dialogs, administrator pages and raw upstream diagnostic/capability notes retain their original text; this is not a claim of complete repository-wide translation coverage.
- The guide's obsolete blanket claim that API keys are never stored was corrected to match the existing encrypted, expiring task-recovery behavior; no credential handling changed.

## Local acceptance

Chrome/Playwright at `http://127.0.0.1:5177`, with anonymous localhost fixtures and external traffic blocked. The local leaderboard feature flag is disabled; this verifies its shared shell and language behavior, not real ranking data or live login.

- Two live tabs synchronize language. Research text, captions and figure type survive switching; component tests also preserve model IDs across nested legacy wrappers.
- Workbench, leaderboard, methodology and changelog preserve language across navigation and reload, with correct route titles.
- 21 public product versions and 4 ecosystem events retain their exact IDs, dates and order across languages.
- At 320px, 390px and 760px, all three pages expose a single top-level language control at least 44px high, with no horizontal overflow or duplicate in More.
- Screenshot review covers desktop English and mobile Chinese/English. No browser page errors or external requests were recorded. No generation, recovery, paid inference, payment, deployment or WeChat publication was performed.

Artifacts: `/Users/a1-6/.codex/visualizations/2026/09/22/tuyan-global-language/` (`qa.mjs`, `checks.json`, desktop and mobile screenshots).

Validation: full Web suite 514/514 passed; final locale/changelog/thinking regression 11/11 passed; production build passed. Existing bundle-size advisory remains. No shared API/schema/backend contract changed, so no SYNC.md entry is required for this Web-only change.
