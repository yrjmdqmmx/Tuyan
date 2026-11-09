# R21 phase 1: TokenDance channel modality audit

Completed offline from `main` baseline `8c456709`. No network, inference, paid calls, Git writes, deployment, or writes to other worktrees. The old `tokendance-catalog-snapshot-20261109.json` is unchanged. Raw historical/base facts remain in `provider-model-details.ts` and the earlier evidence manifests.

## Evidence and directory diff

New fixture: [`tokendance-catalog-snapshot-20261109b.json`](../config/channel-audit/tokendance-catalog-snapshot-20261109b.json). The gateway capture was **2026-11-09 15:54:02Z / 23:54:02 UTC+8**; each of the 119 portal responses retains its own `status`, `checkedAt`, evidence `sourceUrl`, and architecture input/output lists and modality string. This is **public unauthenticated GET; audit evidence only**. Gateway records retain only ID, name, context length, protocols and description presence. Raw zero context lengths are preserved as evidence and never interpreted as known limits.

Compared with the old gateway capture at 11:43Z / 19:43 UTC+8:

| Check | Result |
| --- | --- |
| Gateway IDs | 119 → 119; added 0; missing 0 |
| Name | 0 changes |
| Context length | 0 changes |
| Supported protocols, exact array | 5 changed models, below |
| Supported protocols, set membership | Only `kimi-k3` changed: added Responses and Anthropic Messages |
| Description presence | New capture: 119 present, 0 absent. Old compact fixture omitted description for all 119, so prior presence is **unknown**, not absent; no upstream description change can be claimed. |
| Portal structured architecture | 119/119 captured responses are 200. The supplied R21 portal file contains only the 119 gateway IDs. |

| Model | Previous protocols | New protocols | Interpretation |
| --- | --- | --- | --- |
| `kimi-k3.1-pro` | chat-completions, anthropic:messages, responses | chat-completions, responses, anthropic:messages | Ordering only |
| `deepseek-v4.1-flash-1017` | chat-completions, responses, anthropic:messages | chat-completions, anthropic:messages, responses | Ordering only |
| `deepseek-v4-flash-0731` | chat-completions, anthropic:messages, responses | chat-completions, responses, anthropic:messages | Ordering only |
| `kimi-k3` | chat-completions | chat-completions, responses, anthropic:messages | Two protocol declarations added |
| `deepseek-v4-pro-0813` | chat-completions, responses, anthropic:messages | chat-completions, anthropic:messages, responses | Ordering only |

`chat-completions` and `responses` abbreviate `openai:chat-completions` and `openai:responses`. This audit does not enable new execution protocols.

### Catalog IDs absent from the gateway capture

The complete Core registry contains 74 TokenDance identities. These **7** are not in the new gateway list:

- `deepseek-v4-flash-vision-exp`
- `deepseek-v4-flash`
- `deepseek-v3.2`
- `deepseek-chat-v3-0324`
- `qwen3.6-max-preview`
- `qwen3-30b-a3b-instruct-2507`
- `qwen3-max`

There is no R21 portal capture for these seven IDs. The supplied earlier `r20-portal-compare.json` recorded portal 404 for them; it has no per-response `checkedAt`, so it is not relabeled as a fresh R21 response. **404 is never delisting proof.** Existing gateway presence, hidden/history behavior and selection rules are retained; this change adds no removals or lifecycle declarations.

## Decisions and implementation

- All TokenDance visible card links resolve to `https://tokendance.space/models/<id>`, including historical cards. A navigation link is not proof that a historical page currently renders a model. `/portal/api/` is explicitly rejected by the shared API/JSON link classifier, including encoded paths and redirects. The seven historical vendor fallback links remain in audit history but are superseded for visible navigation by the PM decision.
- `qwen3.6-plus` now declares text → text: image and video input render **不支持**. Its vendor/base image and video facts remain intact in the original exact-specification archive.
- `kimi-k3.1-pro` image/video input, `minimax-m3.1-flash` image input, and `deepseek-v4.1-flash-1017` image input render **支持** with `provenance=channel`, the exact TokenDance model page, and `verifiedAt=2026-11-09`.
- `scripts/lib/model-audit-supplement.mjs` applies the structured snapshot to every adapted TokenDance identity, including 10 identities previously missing from the generated audit. Explicit lists suppress fallback and exclude omitted icon modalities. Token/context facts are not inferred from these lists.
- `packages/api/src/provider-catalog.ts` overlays channel modality facts on exact/base specifications without mutating the base archive, keeps per-field provenance in `modalityFacts`, and prevents catalog row unions from restoring excluded modalities. Keeping unrelated specification `sourceUrls` preserves their original context/token provenance; modality consumers use the new per-field facts.
- Core's `enrichSpecificPages` carries the same facts through both specifications objects and top-level modality arrays. Web's `catalogCardFacts` honors explicit channel facts ahead of detailed/reviewed/manufacturer fallback; `mergeCardFacts` never unions a base list into an explicit channel declaration or a suppressed unknown. Product role/image floors cannot override either case.
- Gateway's generated audit module exposes the same facts; Gateway forwards Core model objects and has no separate modality union. Mini's generated display projection uses the same merge logic, keeps exclusions/unknown suppression, and prevents its runtime role floor from adding image back. Mini packs optional details alongside existing ordered rows to retain all display facts without duplicating identity keys.
- For the **7** identities without structured channel evidence, **14** modality fields are unknown with null values and no claimed channel source. Of these, 5 cards / 10 fields previously inherited base-only values; 2 cards / 4 fields were already unknown. No zero, infinity, inferred modality, or vendor-confirmed value is presented as channel-verified.

## Full-object recomputation

The modified path was executed as actual offline **Core `modelRegistry({})` → full model object → Web `modelCardSpecifications` → `modalityIconStates` → React `ModelSpecifications` rendering**, with fetch/http/https/net transport denied. No ID-only shortcut was used. Baseline cards were captured before edits using the supplied R20 scripts, retargeted only to this worktree and `/tmp`; their projected values/provenance/icons are retained in [`tokendance-card-before-r21.json`](../config/channel-audit/tokendance-card-before-r21.json).

After execution:

| Metric | Result |
| --- | ---: |
| Complete TokenDance registry identities / rendered cards | 74 / 74 |
| Current visible TokenDance cards | 65 |
| Cards with R21 channel architecture / matching values and provenance | 67 / 67 |
| Structured-data mismatches | 0 |
| No-current-capture exceptions | 7, all unknown as listed above |
| R20's 54 cards with non-TokenDance modality sources | 49 now channel-confirmed; 5 now unknown |
| Provenance changed | 144 input/output fields |
| Semantic value changes (ignoring list order) | 18 fields |
| Exact array changes (including order) | 27 fields |
| React icon state mismatches vs resolved facts | 0 |

The 67 confirmed cards include `mimo-v2.5` and `mimo-v2.5-pro`, whose existing lifecycle state keeps them hidden; this explains 67 confirmed versus 65 visible. All 54 originally mis-sourced cards are accounted for; no base-only support remains mislabeled as channel evidence. The four GLM input lists also drop inherited `file` support because the channel lists text/image/video only.

Across the 592 rendered input/output icons: 204 supported → supported, 326 unknown → unsupported, 11 supported → unknown, 4 unknown → supported, 2 supported → unsupported, and 45 unknown → unknown. The four promoted icons are the requested Kimi image/video, MiniMax image, and DeepSeek image; the two newly unsupported icons are Qwen image/video.

Full before/after field facts, scopes, source URLs and icon states are in [`model-modality-audit-20261109-results.json`](model-modality-audit-20261109-results.json). The table below contains every one of the 148 input/output field comparisons, not just changed values. Token limits retain their existing behavior and are also retained in the JSON for inspection.

## Validation and reproduction

The flow under test is: full registry or static catalog → TokenDance card/picker → channel-confirmed supported/unsupported icons, unknown historical fields, and a model-page link.

| Check | Result |
| --- | --- |
| Core affected offline suites (audit, provider catalog, TokenDance catalog/reconciliation) | 70/70 passed |
| Broader Core run including TokenDance HTTP integration | 86 passed / 89; 3 socket-based integration cases blocked by sandbox `listen EPERM` |
| Core R21 dedicated cases | 3/3 passed, including actual full `modelRegistry` objects; zero provider calls |
| Gateway affected suites | 9/9 passed |
| Web affected card/audit/specification/registry suites | 116/116 passed |
| Mini complete suite | 157/157 passed |
| Generator/report/packing suites | 24/24 passed |
| Core typecheck | Passed |
| Web build | Passed; existing large-chunk advisory |
| Mini typecheck and build | Passed |
| Audit/catalog/reference generation drift checks | Passed |
| Original Mini source/runtime/media budget tests | 2/2 passed; limits unchanged |
| Mini source / runtime / media | 1,569,288 / 1,145,146 / 189,978 bytes |
| Mini source headroom under 1,572,864-byte limit | 3,576 bytes; source is 99 bytes below the initial 1,569,387 |
| Browser screenshots / native WeChat scan | Not performed. Browser plugin absent; local Playwright command unavailable. React DOM/SSR and compiled picker checks passed. |

The three Core socket cases are `real legacy adapters dispatch every eligible text and vision ID plus both Seedream generation/edit protocols`, `real Gateway/Core compose login, authorization, generation, balance failure, payment and same-job recovery without recharging the planner`, and `catalog preflight failures resume the original workflow after retryAt without repeating completed steps or ambiguous paid transport`. Their failures occurred while binding localhost, before the assertions under test; no assertion was weakened or skipped. They require an environment allowing local listeners. No online model validation was attempted in this offline phase.

Historical R10/R11/R12 reports and HTTP fixtures retain their original results. Their reproduction scripts now support `--frozen-head` to load the archived resolver/data using read-only `git show 8c456709:<path>` in memory. Historical regression tests still check the original exact counts. Current TokenDance assertions separately check all 74 identities and the new policy; old link tests retain all archived HTTP checks and validate the explicit seven-link policy changes rather than claiming a new HTTP success.

```sh
node scripts/report-model-modality-r21.mjs /tmp/tuyan-r21-after
node scripts/report-model-modality-r21.mjs /tmp/tuyan-r21-after --check
node scripts/count-model-catalog.mjs --tokendance-snapshot config/channel-audit/tokendance-catalog-snapshot-20261109b.json
node scripts/generate-model-audit.mjs --check
node scripts/sync-model-catalog.mjs --check
node scripts/sync-reference-upload.mjs --check
node scripts/report-model-card-r11.mjs --frozen-main --frozen-head --check
node scripts/report-model-card-r10.mjs --frozen-head --check
node scripts/report-model-card-r12.mjs --frozen-head --check
```

The general catalog counter, using the new gateway fixture, reports 1,064 static / 1,061 mock-registry / 984 visible / 943 selectable cards. No capability roles, adapters, permissions, paid-call routing, protocol enablement or production state was changed.

## All TokenDance modality fields: before and after

<!-- R21 TABLE START -->
| id | field | before | after | provenance |
| --- | --- | --- | --- | --- |
| `deepseek-v4.1-flash` | inputModalities | text: supported, image: supported, audio: unknown, video: unknown | text: supported, image: supported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash → channel · 2026-11-09 · https://tokendance.space/models/deepseek-v4.1-flash |
| `deepseek-v4.1-flash` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | vendor · 2026-11-09 · https://api-docs.deepseek.com/quick_start/pricing/ → channel · 2026-11-09 · https://tokendance.space/models/deepseek-v4.1-flash |
| `deepseek-v4.1-flash-1017` | inputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: supported, audio: unsupported, video: unsupported | catalog · 2026-11-09 · https://tokendance.space/gateway/v1/models → channel · 2026-11-09 · https://tokendance.space/models/deepseek-v4.1-flash-1017 |
| `deepseek-v4.1-flash-1017` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-11-09 · https://tokendance.space/gateway/v1/models → channel · 2026-11-09 · https://tokendance.space/models/deepseek-v4.1-flash-1017 |
| `deepseek-v4-flash-vision-exp` | inputModalities | text: supported, image: supported, audio: unknown, video: unknown | text: unknown, image: unknown, audio: unknown, video: unknown | catalog · 2026-10-16 · https://api-docs.deepseek.com/news/news260821/ → unknown · no channel evidence |
| `deepseek-v4-flash-vision-exp` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: unknown, image: unknown, audio: unknown, video: unknown | vendor · 2026-11-09 · https://api-docs.deepseek.com/quick_start/pricing/ → unknown · no channel evidence |
| `deepseek-v4-pro-0813` | inputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro-0813 → channel · 2026-11-09 · https://tokendance.space/models/deepseek-v4-pro-0813 |
| `deepseek-v4-pro-0813` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro-0813 → channel · 2026-11-09 · https://tokendance.space/models/deepseek-v4-pro-0813 |
| `deepseek-v4-flash-0731` | inputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://tokendance.space/models/deepseek-v4-flash-0731 → channel · 2026-11-09 · https://tokendance.space/models/deepseek-v4-flash-0731 |
| `deepseek-v4-flash-0731` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://tokendance.space/models/deepseek-v4-flash-0731 → channel · 2026-11-09 · https://tokendance.space/models/deepseek-v4-flash-0731 |
| `deepseek-v4-flash` | inputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: unknown, image: unknown, audio: unknown, video: unknown | catalog · 2026-10-16 · https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash → unknown · no channel evidence |
| `deepseek-v4-flash` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: unknown, image: unknown, audio: unknown, video: unknown | vendor · 2026-11-09 · https://api-docs.deepseek.com/quick_start/pricing/ → unknown · no channel evidence |
| `deepseek-v4-pro` | inputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | vendor · 2026-11-09 · https://api-docs.deepseek.com/quick_start/pricing/ → channel · 2026-11-09 · https://tokendance.space/models/deepseek-v4-pro |
| `deepseek-v4-pro` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | vendor · 2026-11-09 · https://api-docs.deepseek.com/quick_start/pricing/ → channel · 2026-11-09 · https://tokendance.space/models/deepseek-v4-pro |
| `deepseek-v3.2` | inputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: unknown, image: unknown, audio: unknown, video: unknown | catalog · 2026-10-16 · https://huggingface.co/deepseek-ai/DeepSeek-V3.2 → unknown · no channel evidence |
| `deepseek-v3.2` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: unknown, image: unknown, audio: unknown, video: unknown | catalog · 2026-10-16 · https://huggingface.co/deepseek-ai/DeepSeek-V3.2 → unknown · no channel evidence |
| `deepseek-chat-v3-0324` | inputModalities | text: unknown, image: unknown, audio: unknown, video: unknown | text: unknown, image: unknown, audio: unknown, video: unknown | unknown · no channel evidence → unknown · no channel evidence |
| `deepseek-chat-v3-0324` | outputModalities | text: unknown, image: unknown, audio: unknown, video: unknown | text: unknown, image: unknown, audio: unknown, video: unknown | unknown · no channel evidence → unknown · no channel evidence |
| `glm-5.3` | inputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://docs.bigmodel.cn/cn/guide/models/text/glm-5.3 → channel · 2026-11-09 · https://tokendance.space/models/glm-5.3 |
| `glm-5.3` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://docs.bigmodel.cn/cn/guide/models/text/glm-5.3 → channel · 2026-11-09 · https://tokendance.space/models/glm-5.3 |
| `glm-5.3-flash` | inputModalities | text: supported, image: supported, audio: unknown, video: supported, file: supported | text: supported, image: supported, audio: unsupported, video: supported | catalog · 2026-10-16 · https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5.3-flash → channel · 2026-11-09 · https://tokendance.space/models/glm-5.3-flash |
| `glm-5.3-flash` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5.3-flash → channel · 2026-11-09 · https://tokendance.space/models/glm-5.3-flash |
| `glm-5.3-flashx` | inputModalities | text: supported, image: supported, audio: unknown, video: supported, file: supported | text: supported, image: supported, audio: unsupported, video: supported | catalog · 2026-10-16 · https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5.3-flash → channel · 2026-11-09 · https://tokendance.space/models/glm-5.3-flashx |
| `glm-5.3-flashx` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5.3-flash → channel · 2026-11-09 · https://tokendance.space/models/glm-5.3-flashx |
| `glm-5.2` | inputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://docs.bigmodel.cn/cn/guide/models/text/glm-5.2 → channel · 2026-11-09 · https://tokendance.space/models/glm-5.2 |
| `glm-5.2` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://docs.bigmodel.cn/cn/guide/models/text/glm-5.2 → channel · 2026-11-09 · https://tokendance.space/models/glm-5.2 |
| `glm-5.1` | inputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://docs.bigmodel.cn/cn/guide/models/text/glm-5.1 → channel · 2026-11-09 · https://tokendance.space/models/glm-5.1 |
| `glm-5.1` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://docs.bigmodel.cn/cn/guide/models/text/glm-5.1 → channel · 2026-11-09 · https://tokendance.space/models/glm-5.1 |
| `glm-5` | inputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://docs.bigmodel.cn/cn/guide/models/text/glm-5 → channel · 2026-11-09 · https://tokendance.space/models/glm-5 |
| `glm-5` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://docs.bigmodel.cn/cn/guide/models/text/glm-5 → channel · 2026-11-09 · https://tokendance.space/models/glm-5 |
| `glm-5v-turbo` | inputModalities | text: supported, image: supported, audio: unknown, video: supported, file: supported | text: supported, image: supported, audio: unsupported, video: supported | catalog · 2026-10-16 · https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5v-turbo → channel · 2026-11-09 · https://tokendance.space/models/glm-5v-turbo |
| `glm-5v-turbo` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5v-turbo → channel · 2026-11-09 · https://tokendance.space/models/glm-5v-turbo |
| `glm-4.7` | inputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://docs.bigmodel.cn/cn/guide/models/text/glm-4.7 → channel · 2026-11-09 · https://tokendance.space/models/glm-4.7 |
| `glm-4.7` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://docs.bigmodel.cn/cn/guide/models/text/glm-4.7 → channel · 2026-11-09 · https://tokendance.space/models/glm-4.7 |
| `glm-4.6v` | inputModalities | text: supported, image: supported, audio: unknown, video: supported, file: supported | text: supported, image: supported, audio: unsupported, video: supported | catalog · 2026-10-16 · https://docs.bigmodel.cn/cn/guide/models/vlm/glm-4.6v → channel · 2026-11-09 · https://tokendance.space/models/glm-4.6v |
| `glm-4.6v` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://docs.bigmodel.cn/cn/guide/models/vlm/glm-4.6v → channel · 2026-11-09 · https://tokendance.space/models/glm-4.6v |
| `glm-4.5-air` | inputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://docs.bigmodel.cn/cn/guide/models/text/glm-4.5 → channel · 2026-11-09 · https://tokendance.space/models/glm-4.5-air |
| `glm-4.5-air` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://docs.bigmodel.cn/cn/guide/models/text/glm-4.5 → channel · 2026-11-09 · https://tokendance.space/models/glm-4.5-air |
| `hy4-preview` | inputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://huggingface.co/tencent/Hy4-preview → channel · 2026-11-09 · https://tokendance.space/models/hy4-preview |
| `hy4-preview` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://huggingface.co/tencent/Hy4-preview → channel · 2026-11-09 · https://tokendance.space/models/hy4-preview |
| `hy3` | inputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://tokendance.space/models/hy3 → channel · 2026-11-09 · https://tokendance.space/models/hy3 |
| `hy3` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://tokendance.space/models/hy3 → channel · 2026-11-09 · https://tokendance.space/models/hy3 |
| `hy3-preview` | inputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://tokendance.space/models/hy3-preview → channel · 2026-11-09 · https://tokendance.space/models/hy3-preview |
| `hy3-preview` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://tokendance.space/models/hy3-preview → channel · 2026-11-09 · https://tokendance.space/models/hy3-preview |
| `kimi-k3` | inputModalities | text: supported, image: supported, audio: unknown, video: supported | text: supported, image: supported, audio: unsupported, video: supported | catalog · 2026-10-16 · https://huggingface.co/moonshotai/Kimi-K3 → channel · 2026-11-09 · https://tokendance.space/models/kimi-k3 |
| `kimi-k3` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://huggingface.co/moonshotai/Kimi-K3 → channel · 2026-11-09 · https://tokendance.space/models/kimi-k3 |
| `kimi-k2.7-code` | inputModalities | text: supported, image: supported, audio: unknown, video: supported | text: supported, image: supported, audio: unsupported, video: supported | catalog · 2026-10-16 · https://huggingface.co/moonshotai/Kimi-K2.7-Code → channel · 2026-11-09 · https://tokendance.space/models/kimi-k2.7-code |
| `kimi-k2.7-code` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://huggingface.co/moonshotai/Kimi-K2.7-Code → channel · 2026-11-09 · https://tokendance.space/models/kimi-k2.7-code |
| `kimi-k2.6` | inputModalities | text: supported, image: supported, audio: unknown, video: supported | text: supported, image: supported, audio: unsupported, video: supported | catalog · 2026-10-16 · https://huggingface.co/moonshotai/Kimi-K2.6 → channel · 2026-11-09 · https://tokendance.space/models/kimi-k2.6 |
| `kimi-k2.6` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://huggingface.co/moonshotai/Kimi-K2.6 → channel · 2026-11-09 · https://tokendance.space/models/kimi-k2.6 |
| `kimi-k2.5` | inputModalities | text: supported, image: supported, audio: unknown, video: supported | text: supported, image: supported, audio: unsupported, video: supported | catalog · 2026-10-16 · https://huggingface.co/moonshotai/Kimi-K2.5 → channel · 2026-11-09 · https://tokendance.space/models/kimi-k2.5 |
| `kimi-k2.5` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://huggingface.co/moonshotai/Kimi-K2.5 → channel · 2026-11-09 · https://tokendance.space/models/kimi-k2.5 |
| `minimax-m3` | inputModalities | text: supported, image: supported, audio: unknown, video: supported | text: supported, image: supported, audio: unsupported, video: supported | catalog · 2026-10-16 · https://huggingface.co/MiniMaxAI/MiniMax-M3 → channel · 2026-11-09 · https://tokendance.space/models/minimax-m3 |
| `minimax-m3` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://huggingface.co/MiniMaxAI/MiniMax-M3 → channel · 2026-11-09 · https://tokendance.space/models/minimax-m3 |
| `minimax-m2.7` | inputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://huggingface.co/MiniMaxAI/MiniMax-M2.7 → channel · 2026-11-09 · https://tokendance.space/models/minimax-m2.7 |
| `minimax-m2.7` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://huggingface.co/MiniMaxAI/MiniMax-M2.7 → channel · 2026-11-09 · https://tokendance.space/models/minimax-m2.7 |
| `minimax-m2.5` | inputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://huggingface.co/MiniMaxAI/MiniMax-M2.5 → channel · 2026-11-09 · https://tokendance.space/models/minimax-m2.5 |
| `minimax-m2.5` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://huggingface.co/MiniMaxAI/MiniMax-M2.5 → channel · 2026-11-09 · https://tokendance.space/models/minimax-m2.5 |
| `qwen3.8-flash` | inputModalities | text: supported, image: supported, audio: unknown, video: supported | text: supported, image: supported, audio: unsupported, video: supported | catalog · 2026-10-16 · https://help.aliyun.com/zh/model-studio/vision-model → channel · 2026-11-09 · https://tokendance.space/models/qwen3.8-flash |
| `qwen3.8-flash` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | vendor · 2026-11-09 · https://help.aliyun.com/zh/model-studio/models → channel · 2026-11-09 · https://tokendance.space/models/qwen3.8-flash |
| `qwen3.8-max` | inputModalities | text: supported, image: supported, audio: unknown, video: supported | text: supported, image: supported, audio: unsupported, video: supported | catalog · 2026-10-16 · https://help.aliyun.com/zh/model-studio/qwen3-8-max → channel · 2026-11-09 · https://tokendance.space/models/qwen3.8-max |
| `qwen3.8-max` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | vendor · 2026-11-09 · https://help.aliyun.com/zh/model-studio/models → channel · 2026-11-09 · https://tokendance.space/models/qwen3.8-max |
| `qwen3.8-max-0902` | inputModalities | text: supported, image: supported, audio: unknown, video: supported | text: supported, image: supported, audio: unsupported, video: supported | vendor · 2026-11-09 · https://help.aliyun.com/zh/model-studio/models → channel · 2026-11-09 · https://tokendance.space/models/qwen3.8-max-0902 |
| `qwen3.8-max-0902` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | vendor · 2026-11-09 · https://help.aliyun.com/zh/model-studio/models → channel · 2026-11-09 · https://tokendance.space/models/qwen3.8-max-0902 |
| `qwen3.7-max` | inputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | vendor · 2026-11-09 · https://help.aliyun.com/zh/model-studio/models → channel · 2026-11-09 · https://tokendance.space/models/qwen3.7-max |
| `qwen3.7-max` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | vendor · 2026-11-09 · https://help.aliyun.com/zh/model-studio/models → channel · 2026-11-09 · https://tokendance.space/models/qwen3.7-max |
| `qwen3.7-plus` | inputModalities | text: supported, image: supported, audio: unknown, video: supported | text: supported, image: supported, audio: unsupported, video: supported | vendor · 2026-11-09 · https://help.aliyun.com/zh/model-studio/models → channel · 2026-11-09 · https://tokendance.space/models/qwen3.7-plus |
| `qwen3.7-plus` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | vendor · 2026-11-09 · https://help.aliyun.com/zh/model-studio/models → channel · 2026-11-09 · https://tokendance.space/models/qwen3.7-plus |
| `qwen3.6-max-preview` | inputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: unknown, image: unknown, audio: unknown, video: unknown | catalog · 2026-10-16 · https://help.aliyun.com/zh/model-studio/qwen3-6-max → unknown · no channel evidence |
| `qwen3.6-max-preview` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: unknown, image: unknown, audio: unknown, video: unknown | catalog · 2026-10-16 · https://help.aliyun.com/zh/model-studio/qwen3-6-max → unknown · no channel evidence |
| `qwen3.6-plus` | inputModalities | text: supported, image: supported, audio: unknown, video: supported | text: supported, image: unsupported, audio: unsupported, video: unsupported | vendor · 2026-11-09 · https://help.aliyun.com/zh/model-studio/models → channel · 2026-11-09 · https://tokendance.space/models/qwen3.6-plus |
| `qwen3.6-plus` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | vendor · 2026-11-09 · https://help.aliyun.com/zh/model-studio/models → channel · 2026-11-09 · https://tokendance.space/models/qwen3.6-plus |
| `qwen3.5-35b-a3b` | inputModalities | text: supported, image: supported, audio: unknown, video: supported | text: supported, image: supported, audio: unsupported, video: supported | vendor · 2026-11-09 · https://help.aliyun.com/zh/model-studio/models → channel · 2026-11-09 · https://tokendance.space/models/qwen3.5-35b-a3b |
| `qwen3.5-35b-a3b` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | vendor · 2026-11-09 · https://help.aliyun.com/zh/model-studio/models → channel · 2026-11-09 · https://tokendance.space/models/qwen3.5-35b-a3b |
| `qwen3.5-flash` | inputModalities | text: supported, image: supported, audio: unknown, video: supported | text: supported, image: supported, audio: unsupported, video: supported | vendor · 2026-11-09 · https://help.aliyun.com/zh/model-studio/models → channel · 2026-11-09 · https://tokendance.space/models/qwen3.5-flash |
| `qwen3.5-flash` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | vendor · 2026-11-09 · https://help.aliyun.com/zh/model-studio/models → channel · 2026-11-09 · https://tokendance.space/models/qwen3.5-flash |
| `qwen3.5-plus` | inputModalities | text: supported, image: supported, audio: unknown, video: supported | text: supported, image: supported, audio: unsupported, video: supported | vendor · 2026-11-09 · https://help.aliyun.com/zh/model-studio/model-depreciation → channel · 2026-11-09 · https://tokendance.space/models/qwen3.5-plus |
| `qwen3.5-plus` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | vendor · 2026-11-09 · https://help.aliyun.com/zh/model-studio/model-depreciation → channel · 2026-11-09 · https://tokendance.space/models/qwen3.5-plus |
| `qwen3-30b-a3b-instruct-2507` | inputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: unknown, image: unknown, audio: unknown, video: unknown | catalog · 2026-10-16 · https://huggingface.co/Qwen/Qwen3-30B-A3B-Instruct-2507 → unknown · no channel evidence |
| `qwen3-30b-a3b-instruct-2507` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: unknown, image: unknown, audio: unknown, video: unknown | catalog · 2026-10-16 · https://huggingface.co/Qwen/Qwen3-30B-A3B-Instruct-2507 → unknown · no channel evidence |
| `qwen3-max` | inputModalities | text: unknown, image: unknown, audio: unknown, video: unknown | text: unknown, image: unknown, audio: unknown, video: unknown | unknown · no channel evidence → unknown · no channel evidence |
| `qwen3-max` | outputModalities | text: unknown, image: unknown, audio: unknown, video: unknown | text: unknown, image: unknown, audio: unknown, video: unknown | unknown · no channel evidence → unknown · no channel evidence |
| `seed-2.1-pro` | inputModalities | text: supported, image: supported, audio: unknown, video: supported | text: supported, image: supported, audio: unsupported, video: supported | catalog · 2026-10-16 · https://tokendance.space/models/seed-2.1-pro → channel · 2026-11-09 · https://tokendance.space/models/seed-2.1-pro |
| `seed-2.1-pro` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://tokendance.space/models/seed-2.1-pro → channel · 2026-11-09 · https://tokendance.space/models/seed-2.1-pro |
| `seed-2.1-turbo` | inputModalities | text: supported, image: supported, audio: unknown, video: supported | text: supported, image: supported, audio: unsupported, video: supported | catalog · 2026-10-16 · https://www.volcengine.com/docs/82379/1330310 → channel · 2026-11-09 · https://tokendance.space/models/seed-2.1-turbo |
| `seed-2.1-turbo` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://www.volcengine.com/docs/82379/1330310 → channel · 2026-11-09 · https://tokendance.space/models/seed-2.1-turbo |
| `seed-2.0-code` | inputModalities | text: supported, image: supported, audio: unknown, video: supported | text: supported, image: supported, audio: unsupported, video: supported | catalog · 2026-10-16 · https://tokendance.space/models/seed-2.0-code → channel · 2026-11-09 · https://tokendance.space/models/seed-2.0-code |
| `seed-2.0-code` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://tokendance.space/models/seed-2.0-code → channel · 2026-11-09 · https://tokendance.space/models/seed-2.0-code |
| `seed-2.0-lite` | inputModalities | text: supported, image: supported, audio: unknown, video: supported | text: supported, image: supported, audio: unsupported, video: supported | catalog · 2026-10-16 · https://www.volcengine.com/docs/82379/1330310 → channel · 2026-11-09 · https://tokendance.space/models/seed-2.0-lite |
| `seed-2.0-lite` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://www.volcengine.com/docs/82379/1330310 → channel · 2026-11-09 · https://tokendance.space/models/seed-2.0-lite |
| `seed-2.0-mini` | inputModalities | text: supported, image: supported, audio: unknown, video: supported | text: supported, image: supported, audio: unsupported, video: supported | catalog · 2026-10-16 · https://www.volcengine.com/docs/82379/1330310 → channel · 2026-11-09 · https://tokendance.space/models/seed-2.0-mini |
| `seed-2.0-mini` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://www.volcengine.com/docs/82379/1330310 → channel · 2026-11-09 · https://tokendance.space/models/seed-2.0-mini |
| `seed-2.0-pro` | inputModalities | text: supported, image: supported, audio: unknown, video: supported | text: supported, image: supported, audio: unsupported, video: supported | catalog · 2026-10-16 · https://www.volcengine.com/docs/82379/1330310 → channel · 2026-11-09 · https://tokendance.space/models/seed-2.0-pro |
| `seed-2.0-pro` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://www.volcengine.com/docs/82379/1330310 → channel · 2026-11-09 · https://tokendance.space/models/seed-2.0-pro |
| `seedream-5.0-lite` | inputModalities | text: supported, image: supported, audio: unknown, video: unknown | text: supported, image: supported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://tokendance.space/models/seedream-5.0-lite → channel · 2026-11-09 · https://tokendance.space/models/seedream-5.0-lite |
| `seedream-5.0-lite` | outputModalities | text: unknown, image: supported, audio: unknown, video: unknown | text: unsupported, image: supported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://tokendance.space/models/seedream-5.0-lite → channel · 2026-11-09 · https://tokendance.space/models/seedream-5.0-lite |
| `seedream-5.0-pro` | inputModalities | text: supported, image: supported, audio: unknown, video: unknown | text: supported, image: supported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://tokendance.space/models/seedream-5.0-pro → channel · 2026-11-09 · https://tokendance.space/models/seedream-5.0-pro |
| `seedream-5.0-pro` | outputModalities | text: unknown, image: supported, audio: unknown, video: unknown | text: unsupported, image: supported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://tokendance.space/models/seedream-5.0-pro → channel · 2026-11-09 · https://tokendance.space/models/seedream-5.0-pro |
| `step-5-preview` | inputModalities | text: supported, image: supported, audio: unknown, video: supported | text: supported, image: supported, audio: unsupported, video: supported | vendor · 2026-11-09 · https://platform.stepfun.com/docs/zh/guides/models/list → channel · 2026-11-09 · https://tokendance.space/models/step-5-preview |
| `step-5-preview` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | vendor · 2026-11-09 · https://platform.stepfun.com/docs/zh/guides/models/list → channel · 2026-11-09 · https://tokendance.space/models/step-5-preview |
| `step-3.7-flash` | inputModalities | text: supported, image: supported, audio: unknown, video: supported | text: supported, image: supported, audio: unsupported, video: supported | vendor · 2026-11-09 · https://platform.stepfun.com/docs/zh/guides/models/list → channel · 2026-11-09 · https://tokendance.space/models/step-3.7-flash |
| `step-3.7-flash` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://platform.stepfun.com/docs/zh/guides/models/step-3.7-flash → channel · 2026-11-09 · https://tokendance.space/models/step-3.7-flash |
| `step-3.5-flash` | inputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | vendor · 2026-11-09 · https://platform.stepfun.com/docs/zh/guides/models/list → channel · 2026-11-09 · https://tokendance.space/models/step-3.5-flash |
| `step-3.5-flash` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | vendor · 2026-11-09 · https://platform.stepfun.com/docs/zh/guides/models/list → channel · 2026-11-09 · https://tokendance.space/models/step-3.5-flash |
| `cogevol-base` | inputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-11-09 · https://tokendance.space/models/cogevol-base → channel · 2026-11-09 · https://tokendance.space/models/cogevol-base |
| `cogevol-base` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-11-09 · https://tokendance.space/models/cogevol-base → channel · 2026-11-09 · https://tokendance.space/models/cogevol-base |
| `cogevol-interactive-0828` | inputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-11-09 · https://tokendance.space/models/cogevol-interactive-0828 → channel · 2026-11-09 · https://tokendance.space/models/cogevol-interactive-0828 |
| `cogevol-interactive-0828` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-11-09 · https://tokendance.space/models/cogevol-interactive-0828 → channel · 2026-11-09 · https://tokendance.space/models/cogevol-interactive-0828 |
| `cogevol-slide-0828` | inputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-11-09 · https://tokendance.space/models/cogevol-slide-0828 → channel · 2026-11-09 · https://tokendance.space/models/cogevol-slide-0828 |
| `cogevol-slide-0828` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-11-09 · https://tokendance.space/models/cogevol-slide-0828 → channel · 2026-11-09 · https://tokendance.space/models/cogevol-slide-0828 |
| `dots-3-note-preview` | inputModalities | text: supported, image: supported, audio: supported, video: supported | text: supported, image: supported, audio: supported, video: supported | catalog · 2026-10-16 · https://github.com/studio-dots-ai/dots3-note-prev → channel · 2026-11-09 · https://tokendance.space/models/dots-3-note-preview |
| `dots-3-note-preview` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://github.com/studio-dots-ai/dots3-note-prev → channel · 2026-11-09 · https://tokendance.space/models/dots-3-note-preview |
| `kimi-k3.1-pro` | inputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: supported, audio: unsupported, video: supported | catalog · 2026-11-09 · https://tokendance.space/gateway/v1/models → channel · 2026-11-09 · https://tokendance.space/models/kimi-k3.1-pro |
| `kimi-k3.1-pro` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-11-09 · https://tokendance.space/gateway/v1/models → channel · 2026-11-09 · https://tokendance.space/models/kimi-k3.1-pro |
| `ling-3.0-flash` | inputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://huggingface.co/inclusionAI/Ling-3.0-flash → channel · 2026-11-09 · https://tokendance.space/models/ling-3.0-flash |
| `ling-3.0-flash` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://huggingface.co/inclusionAI/Ling-3.0-flash → channel · 2026-11-09 · https://tokendance.space/models/ling-3.0-flash |
| `ling-3.1-flash` | inputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-11-09 · https://tokendance.space/models/ling-3.1-flash → channel · 2026-11-09 · https://tokendance.space/models/ling-3.1-flash |
| `ling-3.1-flash` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-11-09 · https://tokendance.space/models/ling-3.1-flash → channel · 2026-11-09 · https://tokendance.space/models/ling-3.1-flash |
| `longcat-2.0` | inputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://huggingface.co/meituan-longcat/LongCat-2.0 → channel · 2026-11-09 · https://tokendance.space/models/longcat-2.0 |
| `longcat-2.0` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://huggingface.co/meituan-longcat/LongCat-2.0 → channel · 2026-11-09 · https://tokendance.space/models/longcat-2.0 |
| `mimo-v2.5` | inputModalities | text: supported, image: supported, audio: supported, video: supported | text: supported, image: supported, audio: supported, video: supported | vendor · 2026-11-09 · https://mimo.mi.com/docs/zh-CN/updates/deprecate → channel · 2026-11-09 · https://tokendance.space/models/mimo-v2.5 |
| `mimo-v2.5` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://mimo.mi.com/models/en-US/mimo-v2.5 → channel · 2026-11-09 · https://tokendance.space/models/mimo-v2.5 |
| `mimo-v2.5-pro` | inputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | vendor · 2026-11-09 · https://mimo.mi.com/docs/zh-CN/updates/deprecate → channel · 2026-11-09 · https://tokendance.space/models/mimo-v2.5-pro |
| `mimo-v2.5-pro` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://mimo.mi.com/models/en-US/mimo-v2.5-pro → channel · 2026-11-09 · https://tokendance.space/models/mimo-v2.5-pro |
| `mimo-v2.6-flash` | inputModalities | text: supported, image: supported, audio: supported, video: supported | text: supported, image: supported, audio: supported, video: supported | catalog · 2026-10-16 · https://mimo.mi.com/models/en-US/mimo-v2.6-flash → channel · 2026-11-09 · https://tokendance.space/models/mimo-v2.6-flash |
| `mimo-v2.6-flash` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://mimo.mi.com/models/en-US/mimo-v2.6-flash → channel · 2026-11-09 · https://tokendance.space/models/mimo-v2.6-flash |
| `mimo-v2.6-pro` | inputModalities | text: supported, image: supported, audio: supported, video: supported | text: supported, image: supported, audio: supported, video: supported | catalog · 2026-10-16 · https://mimo.mi.com/models/en-US/mimo-v2.6-pro → channel · 2026-11-09 · https://tokendance.space/models/mimo-v2.6-pro |
| `mimo-v2.6-pro` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://mimo.mi.com/models/en-US/mimo-v2.6-pro → channel · 2026-11-09 · https://tokendance.space/models/mimo-v2.6-pro |
| `mimo-v2.6-ultraspeed` | inputModalities | text: supported, image: supported, audio: supported, video: supported | text: supported, image: supported, audio: supported, video: supported | catalog · 2026-10-16 · https://mimo.mi.com/models/zh-CN/mimo-v2.6-pro-ultraspeed → channel · 2026-11-09 · https://tokendance.space/models/mimo-v2.6-ultraspeed |
| `mimo-v2.6-ultraspeed` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://mimo.mi.com/models/zh-CN/mimo-v2.6-pro-ultraspeed → channel · 2026-11-09 · https://tokendance.space/models/mimo-v2.6-ultraspeed |
| `minimax-m3.1-flash` | inputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: supported, audio: unsupported, video: unsupported | catalog · 2026-11-09 · https://tokendance.space/gateway/v1/models → channel · 2026-11-09 · https://tokendance.space/models/minimax-m3.1-flash |
| `minimax-m3.1-flash` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-11-09 · https://tokendance.space/gateway/v1/models → channel · 2026-11-09 · https://tokendance.space/models/minimax-m3.1-flash |
| `qwen3-vl-plus` | inputModalities | text: supported, image: supported, audio: unknown, video: supported | text: supported, image: supported, audio: unsupported, video: supported | catalog · 2026-10-16 · https://platform.qianwenai.com/docs/developer-guides/getting-started/vision-models → channel · 2026-11-09 · https://tokendance.space/models/qwen3-vl-plus |
| `qwen3-vl-plus` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://platform.qianwenai.com/docs/developer-guides/getting-started/vision-models → channel · 2026-11-09 · https://tokendance.space/models/qwen3-vl-plus |
| `seed-evolving` | inputModalities | text: supported, image: supported, audio: unknown, video: supported | text: supported, image: supported, audio: unsupported, video: supported | catalog · 2026-10-16 · https://www.volcengine.com/docs/82379/1330310 → channel · 2026-11-09 · https://tokendance.space/models/seed-evolving |
| `seed-evolving` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://www.volcengine.com/docs/82379/1330310 → channel · 2026-11-09 · https://tokendance.space/models/seed-evolving |
| `spark-x2.5-1.7b` | inputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://maas.xfyun.cn/api/v1/gpt-finetune/model/base/list-v2?page=1&size=9999 → channel · 2026-11-09 · https://tokendance.space/models/spark-x2.5-1.7b |
| `spark-x2.5-1.7b` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://maas.xfyun.cn/api/v1/gpt-finetune/model/base/list-v2?page=1&size=9999 → channel · 2026-11-09 · https://tokendance.space/models/spark-x2.5-1.7b |
| `spark-x2.5-4b` | inputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://maas.xfyun.cn/api/v1/gpt-finetune/model/base/list-v2?page=1&size=9999 → channel · 2026-11-09 · https://tokendance.space/models/spark-x2.5-4b |
| `spark-x2.5-4b` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://maas.xfyun.cn/api/v1/gpt-finetune/model/base/list-v2?page=1&size=9999 → channel · 2026-11-09 · https://tokendance.space/models/spark-x2.5-4b |
| `unifuncs-s3` | inputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://tokendance.space/models/unifuncs-s3 → channel · 2026-11-09 · https://tokendance.space/models/unifuncs-s3 |
| `unifuncs-s3` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://tokendance.space/models/unifuncs-s3 → channel · 2026-11-09 · https://tokendance.space/models/unifuncs-s3 |
| `unifuncs-s3-pro` | inputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://tokendance.space/models/unifuncs-s3-pro → channel · 2026-11-09 · https://tokendance.space/models/unifuncs-s3-pro |
| `unifuncs-s3-pro` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://tokendance.space/models/unifuncs-s3-pro → channel · 2026-11-09 · https://tokendance.space/models/unifuncs-s3-pro |
| `unifuncs-u3` | inputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://tokendance.space/models/unifuncs-u3 → channel · 2026-11-09 · https://tokendance.space/models/unifuncs-u3 |
| `unifuncs-u3` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://tokendance.space/models/unifuncs-u3 → channel · 2026-11-09 · https://tokendance.space/models/unifuncs-u3 |
| `unifuncs-u3-pro` | inputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://tokendance.space/models/unifuncs-u3-pro → channel · 2026-11-09 · https://tokendance.space/models/unifuncs-u3-pro |
| `unifuncs-u3-pro` | outputModalities | text: supported, image: unknown, audio: unknown, video: unknown | text: supported, image: unsupported, audio: unsupported, video: unsupported | catalog · 2026-10-16 · https://tokendance.space/models/unifuncs-u3-pro → channel · 2026-11-09 · https://tokendance.space/models/unifuncs-u3-pro |
<!-- R21 TABLE END -->

## Phase 2

Completed in the same checkout from Phase 1 `d1fe6ff6`, in priority order **2, 1, 3, 4**. No Git writes, other-worktree writes, inference, paid calls, sign-in, credentials, deployment, or account-entitlement checks. Network access was limited to public unauthenticated **GET** requests for official HTML documentation/model pages, with the browser User-Agent recorded in the evidence config. All new captures below are dated **2026-11-09**; final status, redirect destination, timestamp, SHA-256 and exact excerpts are retained. A 200 HTML shell does not establish support or availability. A 404 does not establish delisting.

Versioned evidence: [`model-modality-phase2-20261109.json`](../config/channel-audit/model-modality-phase2-20261109.json). The generator validates channel host, HTTPS, capture date/status/hash, nonempty exact excerpts, table identity/value agreement, and retained-model availability evidence. Positive-only schema evidence cannot establish an unsupported modality. Partial silence masks only the reviewed modality after the other display layers merge, preserving unrelated supported facts. Vendor/base records remain unchanged.

Before values and the original 20-card membership are frozen in [`model-modality-phase2-before-20261109.json`](../config/channel-audit/model-modality-phase2-before-20261109.json). The current full Core recount and every resulting field are in [`model-modality-audit-20261109-phase2-results.json`](model-modality-audit-20261109-phase2-results.json), reproducible with `node scripts/report-model-modality-phase2.mjs --check`.

| Item | Scope | Result |
| --- | --- | --- |
| 2: Bailian tables | Original 20 static cards; 34 complete Core cards, 22 channel URLs | All 34 / 68 input-output fields applied as channel facts. Four-icon states: 104 supported, 168 explicitly unsupported, 0 unknown. |
| 1: Misleading modalities | 27 cards / 30 modality entries, 20 channel URLs | 2 supported, 28 unknown, 0 inferred unsupported. All 30 were previously shown as supported. |
| 3: Dead channel links | 5 Replicate Imagen + 2 Runware identities | 7 retained, 7 availability unverified, 0 delisted, 0 newly verified exact channel pages. Existing verified vendor fallbacks retained. |
| 4: Complete object resolution | 1,061 full Core models, plus 1,064 generated static cards | Full-vs-resolved ID first-link differences 0; modality differences 0; all fields with supplied registry 0; Core-to-Mini projection differences 0. |

### Item 2 — Bailian explicit tables

Each row was re-opened today. `20` marks the original static list; `full` marks the additional 14 identities found in the complete Core registry. States are ordered **text / image / audio / video**: **S = 支持**, **N = 不支持**, **U = 未知**. Before is the full Phase 1 card, not the historical ID-only rendering. Missing entries become N only because these are explicit structured 输入模态 / 输出模态 tables. Snapshot/alias identities are matched separately through exact ID excerpts in the versioned config; no family-prefix inference is used.

| Bailian model ID | Scope | Input before → after | Output before → after | Exact table quote | Official source / HTTP / date |
| --- | --- | --- | --- | --- | --- |
| `deepseek-v4.1-flash` | 20 | S/S/U/U → S/S/N/N | S/U/U/U → S/N/N/N | 输入模态 Text、Image 输出模态 Text | [channel page](https://help.aliyun.com/zh/model-studio/deepseek-v4-1-flash) · 200 · 2026-11-09 |
| `qwen3.8-27b` | 20 | S/S/U/S → S/S/N/S | S/U/U/U → S/N/N/N | 输入模态 Image Text Video 输出模态 Text | [channel page](https://help.aliyun.com/zh/model-studio/qwen3-8-27b) · 200 · 2026-11-09 |
| `qwen3.8-2.4t-a95b` | 20 | S/U/U/U → S/N/N/N | S/U/U/U → S/N/N/N | 输入模态 Text 输出模态 Text | [channel page](https://help.aliyun.com/zh/model-studio/qwen3-8-2-4t-a95b) · 200 · 2026-11-09 |
| `qwen-image-3.0` | full | S/S/U/U → S/S/N/N | U/S/U/U → N/S/N/N | 输入模态 Image Text 输出模态 Image | [channel page](https://help.aliyun.com/zh/model-studio/qwen-image-3-0) · 200 · 2026-11-09 |
| `qwen-image-3.0-pro` | full | S/S/U/U → S/S/N/N | U/S/U/U → N/S/N/N | 输入模态 Image Text 输出模态 Image | [channel page](https://help.aliyun.com/zh/model-studio/qwen-image-3-0-pro) · 200 · 2026-11-09 |
| `glm-5.2` | 20 | S/U/U/U → S/N/N/N | S/U/U/U → S/N/N/N | 输入模态 Text 输出模态 Text | [channel page](https://help.aliyun.com/zh/model-studio/glm-5-2) · 200 · 2026-11-09 |
| `glm-5.1` | 20 | S/U/U/U → S/N/N/N | S/U/U/U → S/N/N/N | 输入模态 Text 输出模态 Text | [channel page](https://help.aliyun.com/zh/model-studio/glm-5-1) · 200 · 2026-11-09 |
| `kimi-k2.7-code` | 20 | S/S/U/S → S/S/N/S | S/U/U/U → S/N/N/N | 输入模态 Text Image Video 输出模态 Text | [channel page](https://help.aliyun.com/zh/model-studio/kimi-k2-7-code) · 200 · 2026-11-09 |
| `kimi-k2.6` | 20 | S/S/U/S → S/S/N/S | S/U/U/U → S/N/N/N | 输入模态 Image Text Video 输出模态 Text | [channel page](https://help.aliyun.com/zh/model-studio/kimi-k2-6) · 200 · 2026-11-09 |
| `kimi-k2.5` | 20 | S/S/U/S → S/S/N/S | S/U/U/U → S/N/N/N | 输入模态 Text Image Video 输出模态 Text | [channel page](https://help.aliyun.com/zh/model-studio/kimi-k2-5) · 200 · 2026-11-09 |
| `qwen-image-2.0-pro-2026-06-22` | full | S/S/U/U → S/S/N/N | U/S/U/U → N/S/N/N | 输入模态 Text Image 输出模态 Image | [channel page](https://help.aliyun.com/zh/model-studio/qwen-image-2-0-pro) · 200 · 2026-11-09 |
| `qwen-image-2.0` | 20 | S/S/U/U → S/S/N/N | U/S/U/U → N/S/N/N | 输入模态 Text Image 输出模态 Image | [channel page](https://help.aliyun.com/zh/model-studio/qwen-image-2-0) · 200 · 2026-11-09 |
| `qwen-image-2.0-2026-03-03` | full | S/S/U/U → S/S/N/N | U/S/U/U → N/S/N/N | 输入模态 Text Image 输出模态 Image | [channel page](https://help.aliyun.com/zh/model-studio/qwen-image-2-0) · 200 · 2026-11-09 |
| `qwen-image-2.0-pro` | 20 | S/S/U/U → S/S/N/N | U/S/U/U → N/S/N/N | 输入模态 Text Image 输出模态 Image | [channel page](https://help.aliyun.com/zh/model-studio/qwen-image-2-0-pro) · 200 · 2026-11-09 |
| `qwen-image-2.0-pro-2026-03-03` | full | S/S/U/U → S/S/N/N | U/S/U/U → N/S/N/N | 输入模态 Text Image 输出模态 Image | [channel page](https://help.aliyun.com/zh/model-studio/qwen-image-2-0-pro) · 200 · 2026-11-09 |
| `qwen-image-2.0-pro-2026-04-22` | full | S/S/U/U → S/S/N/N | U/S/U/U → N/S/N/N | 输入模态 Image Text 输出模态 Image | [channel page](https://help.aliyun.com/zh/model-studio/qwen-image-2-0-pro) · 200 · 2026-11-09 |
| `qwen3.7-max` | full | S/U/U/U → S/N/N/N | S/U/U/U → S/N/N/N | 输入模态 Text 输出模态 Text | [channel page](https://help.aliyun.com/zh/model-studio/qwen3-7-max) · 200 · 2026-11-09 |
| `qwen3.7-max-2026-05-17` | full | S/U/U/U → S/N/N/N | S/U/U/U → S/N/N/N | 输入模态 Text 输出模态 Text | [channel page](https://help.aliyun.com/zh/model-studio/qwen3-7-max) · 200 · 2026-11-09 |
| `qwen3.7-max-2026-05-20` | full | S/U/U/U → S/N/N/N | S/U/U/U → S/N/N/N | 输入模态 Text 输出模态 Text | [channel page](https://help.aliyun.com/zh/model-studio/qwen3-7-max) · 200 · 2026-11-09 |
| `qwen3.7-max-2026-06-08` | 20 | S/S/U/S → S/S/N/S | S/U/U/U → S/N/N/N | 输入模态 Image Text Video 输出模态 Text | [channel page](https://help.aliyun.com/zh/model-studio/qwen3-7-max) · 200 · 2026-11-09 |
| `qwen3.7-max-preview` | full | S/U/U/U → S/N/N/N | S/U/U/U → S/N/N/N | 输入模态 Text 输出模态 Text | [channel page](https://help.aliyun.com/zh/model-studio/qwen3-7-max) · 200 · 2026-11-09 |
| `qwen3.7-plus` | 20 | S/S/U/S → S/S/N/S | S/U/U/U → S/N/N/N | 输入模态 Image Text Video 输出模态 Text | [channel page](https://help.aliyun.com/zh/model-studio/qwen3-7-plus) · 200 · 2026-11-09 |
| `qwen3.7-plus-2026-05-26` | full | S/S/U/S → S/S/N/S | S/U/U/U → S/N/N/N | 输入模态 Image Text Video 输出模态 Text | [channel page](https://help.aliyun.com/zh/model-studio/qwen3-7-plus) · 200 · 2026-11-09 |
| `wan2.7-image` | full | S/S/U/U → S/S/N/N | U/S/U/U → N/S/N/N | 输入模态 Image Text 输出模态 Image | [channel page](https://help.aliyun.com/zh/model-studio/wan2-7-image) · 200 · 2026-11-09 |
| `wan2.7-image-pro` | full | S/S/U/U → S/S/N/N | U/S/U/U → N/S/N/N | 输入模态 Image Text 输出模态 Image | [channel page](https://help.aliyun.com/zh/model-studio/wan2-7-image-pro) · 200 · 2026-11-09 |
| `wan2.6-image` | 20 | S/S/U/U → S/S/N/N | S/S/U/U → S/S/N/N | 输入模态 Text Image 输出模态 Image Text | [channel page](https://help.aliyun.com/zh/model-studio/wan2-6-image) · 200 · 2026-11-09 |
| `MiniMax/MiniMax-M3.1-Flash` | 20 | S/S/U/S → S/S/N/S | S/U/U/U → S/N/N/N | 输入模态 Image Text Video 输出模态 Text | [channel page](https://help.aliyun.com/zh/model-studio/minimax-m3-1-flash) · 200 · 2026-11-09 |
| `qwen-plus-2025-01-25` | 20 | S/U/U/U → S/N/N/N | S/U/U/U → S/N/N/N | 输入模态 Text 输出模态 Text | [channel page](https://help.aliyun.com/zh/model-studio/qwen-plus) · 200 · 2026-11-09 |
| `qwen-plus-2025-04-28` | 20 | S/U/U/U → S/N/N/N | S/U/U/U → S/N/N/N | 输入模态 Text 输出模态 Text | [channel page](https://help.aliyun.com/zh/model-studio/qwen-plus) · 200 · 2026-11-09 |
| `qwen-plus-2025-07-14` | 20 | S/U/U/U → S/N/N/N | S/U/U/U → S/N/N/N | 输入模态 Text 输出模态 Text | [channel page](https://help.aliyun.com/zh/model-studio/qwen-plus) · 200 · 2026-11-09 |
| `unisound/unisound-u2` | 20 | S/U/U/U → S/N/N/N | S/U/U/U → S/N/N/N | 输入模态 Text 输出模态 Text | [channel page](https://help.aliyun.com/zh/model-studio/unisound-u2-by-unisound) · 200 · 2026-11-09 |
| `xiaomi/mimo-v2.6-pro-ultraspeed` | 20 | S/S/S/S → S/S/S/S | S/U/U/U → S/N/N/N | 输入模态 Text Image Video Audio 输出模态 Text | [channel page](https://help.aliyun.com/zh/model-studio/mimo-v2-6-pro-ultraspeed) · 200 · 2026-11-09 |
| `qwen3.8-max` | 20 | S/S/U/S → S/S/N/S | S/U/U/U → S/N/N/N | 输入模态 Image Text Video 输出模态 Text | [channel page](https://help.aliyun.com/zh/model-studio/qwen3-8-max) · 200 · 2026-11-09 |
| `qwen3.8-max-0902` | full | S/S/U/S → S/S/N/S | S/U/U/U → S/N/N/N | 输入模态 Image Text Video 输出模态 Text | [channel page](https://help.aliyun.com/zh/model-studio/qwen3-8-max) · 200 · 2026-11-09 |

### Item 1 — all 27 cards / 30 modality entries

Quotes below establish only what they say. A prompt field does not rule out image input; an image-output schema does not rule out text output; a model-list identity or app-shell title supplies no modality claim. These silent cases are explicitly unknown, and product image-input requirements cannot re-add them. The two supported exceptions are fal Nano Banana’s explicit description output and Replicate Pruna’s explicit image input. Replicate schema pages contain the quoted embedded model JSON; no inference endpoint was called. Additional prompt quotes supporting retained text input are stored alongside the main excerpt.

| Channel / exact model ID | Modality | Before → after | Exact quote | Official source / HTTP / date |
| --- | --- | --- | --- | --- |
| `fal/blackforestlabs/flux-3/klein/base/text-to-image` | input/image | 支持 → 未知 | Input# prompt string* required The prompt to generate an image from.  | [channel page](https://fal.ai/models/blackforestlabs/flux-3/klein/base/text-to-image/api) · 200 · 2026-11-09 |
| `fal/blackforestlabs/flux-3/klein/text-to-image` | input/image | 支持 → 未知 | Input# prompt string* required The prompt to generate an image from.  | [channel page](https://fal.ai/models/blackforestlabs/flux-3/klein/text-to-image/api) · 200 · 2026-11-09 |
| `fal/blackforestlabs/flux-3/text-to-image` | input/image | 支持 → 未知 | Input# prompt string* required The prompt to generate an image from. | [channel page](https://fal.ai/models/blackforestlabs/flux-3/text-to-image/api) · 200 · 2026-11-09 |
| `fal/bytedance/seedream/v5/flash/text-to-image` | input/image | 支持 → 未知 | Input# prompt string* required The text prompt used to generate the image. | [channel page](https://fal.ai/models/bytedance/seedream/v5/flash/text-to-image/api) · 200 · 2026-11-09 |
| `fal/bytedance/seedream/v5/pro/text-to-image` | input/image | 支持 → 未知 | Input# prompt string* required The text prompt used to generate the image. | [channel page](https://fal.ai/models/bytedance/seedream/v5/pro/text-to-image/api) · 200 · 2026-11-09 |
| `fal/fal-ai/bytedance/seedream/v4.5/text-to-image` | input/image | 支持 → 未知 | Input# prompt string* required The text prompt used to generate the image | [channel page](https://fal.ai/models/fal-ai/bytedance/seedream/v4.5/text-to-image/api) · 200 · 2026-11-09 |
| `fal/fal-ai/bytedance/seedream/v4/text-to-image` | input/image | 支持 → 未知 | Input# prompt string* required The text prompt used to generate the image | [channel page](https://fal.ai/models/fal-ai/bytedance/seedream/v4/text-to-image/api) · 200 · 2026-11-09 |
| `fal/fal-ai/flux-2-pro` | input/image | 支持 → 未知 | Input# prompt string* required The prompt to generate an image from. | [channel page](https://fal.ai/models/fal-ai/flux-2-pro/api) · 200 · 2026-11-09 |
| `fal/google/nano-banana-2.1` | output/text | 支持 → 支持 | Output# images list<ImageFile>* required The generated images. description string* required The description of the generated images. | [channel page](https://fal.ai/models/google/nano-banana-2.1/api) · 200 · 2026-11-09 |
| `fal/krea/v3/text-to-image` | input/image | 支持 → 未知 | Input# prompt string* required Description of the image to generate. | [channel page](https://fal.ai/models/krea/v3/text-to-image/api) · 200 · 2026-11-09 |
| `fal/meta/muse-image/text-to-image` | input/image | 支持 → 未知 | Input# prompt string* required The text prompt used to generate or edit the image. | [channel page](https://fal.ai/models/meta/muse-image/text-to-image/api) · 200 · 2026-11-09 |
| `fal/openai/gpt-image-2.5/flare/text-to-image` | input/image | 支持 → 未知 | Input# prompt string* required The prompt for image generation | [channel page](https://fal.ai/models/openai/gpt-image-2.5/flare/text-to-image/api) · 200 · 2026-11-09 |
| `fal/openai/gpt-image-2.5/sunburst/text-to-image` | input/image | 支持 → 未知 | Input# prompt string* required The prompt for image generation | [channel page](https://fal.ai/models/openai/gpt-image-2.5/sunburst/text-to-image/api) · 200 · 2026-11-09 |
| `fal/xai/grok-imagine-image` | input/image | 支持 → 未知 | Input# prompt string* required Text description of the desired image. | [channel page](https://fal.ai/models/xai/grok-imagine-image/api) · 200 · 2026-11-09 |
| `fal/xai/grok-imagine-image/quality/text-to-image` | input/image | 支持 → 未知 | Input# prompt string* required Text description of the desired image. | [channel page](https://fal.ai/models/xai/grok-imagine-image/quality/text-to-image/api) · 200 · 2026-11-09 |
| `ideogram/ideogram-v4` | input/image | 支持 → 未知 | Generate images with Ideogram 4.0 from a natural-language or structured JSON prompt. | [channel page](https://developer.ideogram.ai/v2/api-reference/images/generate/ideogram-4) · 200 · 2026-11-09 |
| `qianfan/ernie-5.0-thinking-exp` | input/image | 支持 → 未知 | 模型列表 | [channel page](https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j) · 200 · 2026-11-09 |
| `qianfan/glm-5.3-flash` | input/video | 支持 → 未知 | glm-5.3-flash | [channel page](https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j) · 200 · 2026-11-09 |
| `qianfan/internvl3-38b` | input/video | 支持 → 未知 | internvl3-38b | [channel page](https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j) · 200 · 2026-11-09 |
| `qianfan/kimi-k2.6` | input/image | 支持 → 未知 | kimi-k2.6 | [channel page](https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j) · 200 · 2026-11-09 |
| `qianfan/kimi-k2.6` | input/video | 支持 → 未知 | kimi-k2.6 | [channel page](https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j) · 200 · 2026-11-09 |
| `qianfan/qwen3.5-122b-a10b` | input/video | 支持 → 未知 | qwen3.5-122b-a10b | [channel page](https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j) · 200 · 2026-11-09 |
| `qianfan/qwen3.5-27b` | input/video | 支持 → 未知 | qwen3.5-27b | [channel page](https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j) · 200 · 2026-11-09 |
| `qianfan/qwen3.5-35b-a3b` | input/video | 支持 → 未知 | qwen3.5-35b-a3b | [channel page](https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j) · 200 · 2026-11-09 |
| `qianfan/qwen3.5-397b-a17b` | input/video | 支持 → 未知 | qwen3.5-397b-a17b | [channel page](https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j) · 200 · 2026-11-09 |
| `replicate/google/nano-banana-2.1` | input/file | 支持 → 未知 | Input images to transform or use as reference (supports up to 14 images) | [channel page](https://replicate.com/google/nano-banana-2.1/api/schema) · 200 · 2026-11-09 |
| `replicate/google/nano-banana-2.1` | input/video | 支持 → 未知 | Input images to transform or use as reference (supports up to 14 images) | [channel page](https://replicate.com/google/nano-banana-2.1/api/schema) · 200 · 2026-11-09 |
| `replicate/google/nano-banana-2.1` | output/text | 支持 → 未知 | Google's fast image generation and editing model, with sharp text rendering, multi-image editing, and up to 4K output. | [channel page](https://replicate.com/google/nano-banana-2.1/api/schema) · 200 · 2026-11-09 |
| `replicate/prunaai/flux-kontext-fast` | input/image | 支持 → 支持 | Input image for image to image mode. The aspect ratio of your output will match this image | [channel page](https://replicate.com/prunaai/flux-kontext-fast/api/schema) · 200 · 2026-11-09 |
| `sensenova/kimi-k3` | input/video | 支持 → 未知 | SenseNova · LLM API 服务平台 | [channel page](https://platform.sensenova.cn/docs) · 200 · 2026-11-09 |

### Item 3 — all seven dead-link identities

The exact channel pages below returned 404. Replicate’s public Google owner page and official collection returned 200 but did not verify these exact Imagen identities. Runware’s Grok image sibling returned 200 and says `Grok Imagine Imagexai:grok-imagine@image`; that AIR differs from `xai:grok-imagine@image-quality`. Neither directory silence nor a sibling model can verify availability. All alternative URL attempts, including redirect destinations and exact quotes, are retained in the config and result JSON.

| Channel / exact model ID | Exact channel page / final status | Exact excerpt | Availability / action | Visible link retained |
| --- | --- | --- | --- | --- |
| `replicate/google/imagen-3` | [channel page](https://replicate.com/google/imagen-3) · 404 · 2026-11-09 | Page not found | unverified; keep model | [existing vendor fallback](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/3-0-generate#3.0-generate-002) |
| `replicate/google/imagen-3-fast` | [channel page](https://replicate.com/google/imagen-3-fast) · 404 · 2026-11-09 | Page not found | unverified; keep model | [existing vendor fallback](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/3-0-generate#3.0-fast-generate-001) |
| `replicate/google/imagen-4` | [channel page](https://replicate.com/google/imagen-4) · 404 · 2026-11-09 | Page not found | unverified; keep model | [existing vendor fallback](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/4-0-generate#4.0-generate-001) |
| `replicate/google/imagen-4-fast` | [channel page](https://replicate.com/google/imagen-4-fast) · 404 · 2026-11-09 | Page not found | unverified; keep model | [existing vendor fallback](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/4-0-generate#4.0-fast-generate-001) |
| `replicate/google/imagen-4-ultra` | [channel page](https://replicate.com/google/imagen-4-ultra) · 404 · 2026-11-09 | Page not found | unverified; keep model | [existing vendor fallback](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/4-0-generate#4.0-ultra-generate-001) |
| `runware/openai:1@1` | [channel page](https://runware.ai/models/openai-1) · 404 · 2026-11-09 | Runware &#124; AI Infrastructure Rebuilt to Cost Less | unverified; keep model | [existing vendor fallback](https://developers.openai.com/api/docs/models/gpt-image-1) |
| `runware/xai:grok-imagine@image-quality` | [channel page](https://runware.ai/models/grok-imagine-image-quality) · 404 · 2026-11-09 | Runware &#124; AI Infrastructure Rebuilt to Cost Less | unverified; keep model | [existing vendor fallback](https://docs.x.ai/developers/migration/imagine-image-quality-nov-2) |

### Item 4 — product path inventory and recount

The earlier 389 static / 623 full-object numbers describe earlier audit stages. Frozen pre-Phase-1 R10 rules now reproduce 698/1,061 on their preserved fixture. The immediate Phase 1 baseline used for this change is **659/1,061** differing cards (616 first-source, 575 modality; overlapping counts). All denominators and baselines are explicit; historical reports are preserved.

| Product path | Resolution / preservation | Regression coverage |
| --- | --- | --- |
| Web `ModelPicker` → `ModelSpecifications` | Picker options preserve complete registry models; the shared card resolver resolves legacy ID-only objects against an explicit registry, then the enriched static registry. Full live specifications take precedence. | All 1,061 `modelOption` outputs retain the original object; full vs saved-ID cards deep-equal with supplied registry. |
| Web `WorkspaceModelCatalog` (`catalogRows`, `libraryRows`) | Catalog and saved-library rows carry the complete model into the same card resolver. | Every resulting card has the same fields as its full Core model. |
| Web unavailable-model labels / `modelCardName` | ID-only historical labels use the same exact-ID resolver; curated names retain precedence. | Existing unavailable-picker/name regressions plus all-card resolution. |
| Core `modelRegistry` enrichment | Exact channel tables precede base records; the pure display helper computes optional `cardSpecifications` from each full model. The field contains fields/sourceUrl/sourceLabel/note and grants no execution permission. | 34 tables, 30 review entries, 7 retained models; base records unchanged; all 1,061 projections match Web. |
| Gateway registry relay | Relays complete Core objects without reducing them to IDs. | Real in-memory Express middleware round-trips the full 1,061-model response unchanged; no listening socket or sign-in. |
| Mini registry normalization → compiled picker | Preserves Core `cardSpecifications` and renders it first. Offline ID lookup reads facts generated from full static objects. A required provider may be omitted only with an explicit nonempty unavailable-provider reason. | Actual full Core response, compiled normalizer and presenter for all 1,061 cards; unexplained provider omissions still reject; all 1,064 offline projections checked. |

| Comparison | Before | After |
| --- | ---: | ---: |
| Full Core vs ID-only/resolved: first source | 616 | 0 |
| Full Core vs ID-only/resolved: modality icons | 575 | 0 |
| Either first source or modality | 659 | 0 |
| All four fields, full object vs ID resolved with the same registry | Not previously counted | 0 |
| Full Core display projection vs Web | No projection before | 0 |

The zero for all four fields uses the same complete registry on both sides. Offline static fallback cannot refresh live context lengths and is not claimed to reproduce account/live metadata; its first source and modality icons match all 1,061 audited full objects. Unknown values are preserved. Three static-only historical identities remain outside the 1,061 denominator.

R13’s historical 50 full/static notice-first cards and Mini’s 34 static notice-first cards are still asserted against archived code and inputs. Current static cards now use the full-object source priority: 16 notice-first cards in each representation. Notice links and labels remain available in Web secondary sources; the seven item-3 vendor fallbacks are unchanged. Historical R10/R11/R12 reports use frozen code and, for R12, frozen static input objects.

Full-model first-source changes caused by the new channel facts (six), plus one static-only alignment to an existing full specification:

| Exact identity | Before | After |
| --- | --- | --- |
| `bailian/deepseek-v4.1-flash` | [previous](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash) | [current](https://help.aliyun.com/zh/model-studio/deepseek-v4-1-flash) |
| `bailian/qwen-image-3.0` | [previous](https://help.aliyun.com/zh/model-studio/qwen-image-generation-and-editing-api-reference) | [current](https://help.aliyun.com/zh/model-studio/qwen-image-3-0) |
| `bailian/MiniMax/MiniMax-M3.1-Flash` | [previous](https://help.aliyun.com/zh/model-studio/minimax-api-by-minimax) | [current](https://help.aliyun.com/zh/model-studio/minimax-m3-1-flash) |
| `bailian/xiaomi/mimo-v2.6-pro-ultraspeed` | [previous](https://help.aliyun.com/zh/model-studio/mimo) | [current](https://help.aliyun.com/zh/model-studio/mimo-v2-6-pro-ultraspeed) |
| `fal/google/nano-banana-2.1` | [previous](https://ai.google.dev/gemini-api/docs/models/gemini-nano-banana-2.1) | [current](https://fal.ai/models/google/nano-banana-2.1/api) |
| `replicate/google/nano-banana-2.1` | [previous](https://ai.google.dev/gemini-api/docs/models/gemini-nano-banana-2.1) | [current](https://replicate.com/google/nano-banana-2.1) |
| `stability/sd3.5-flash` (static-only) | [previous](https://docs.stability.ai/api-reference/generate/stable-diffusion-35) | [current](https://platform.stability.ai/docs/api-reference#tag/Generate/paths/~1v2beta~1stable-image~1generate~1sd3/post) |

The six channel destinations were fetched with 200 responses today; the Replicate visible model page has its own capture. The static-only Stability link is inherited from its existing full specification. A separate 200 capture shows only a documentation-relocation notice, **not** fresh capability/availability evidence; its previous metadata is not re-certified by this audit.

### Validation and size

| Check | Result |
| --- | --- |
| Core affected tests | 35/35; `model-modality-phase2`, `model-modality-r21`, `model-audit`, `provider-catalog`; TypeScript check and local production bundle build pass. The dependency-graph regression verifies every local bundle input is covered by Core Docker COPY instructions. |
| Gateway affected tests | 17/17; generated audit, both modality audits, complete-object relay, and R14/R17 catalog relay. |
| Web affected tests | 121/122. The only failure is unchanged `provider-catalogs.test.mjs:28`, reproduced by loading Phase 1 `d1fe6ff6`: expected 图研既有核实, actual 渠道 for TokenDance Qwen3.8 Max. Both versions show the same input and 1M context. The assertion remains unchanged. Focused R6A/R12/R13/Phase-2 checks: 28/28. |
| Mini complete suite | 159/159, including budget and stricter R15 size regression; build and TypeScript check pass. |
| Script suite | 42/42; generation provenance rejects missing quotes, wrong channel/date, mismatched table identities/values and invalid availability evidence; codec round trips include nested array deltas and literal reference-prefix strings. |
| Web / Core builds | Pass locally; existing bundle-size advisories remain. Core Docker build inputs now include the two pure Web display modules and three evidence JSON files. No Docker image was built or deployed. |
| Generation / sync `--check` | Audit, model catalog, reference upload, thinking, agent knowledge and model version report pass. Frozen R10/R11/R12 and both R21 reports pass. |
| Allowed sync exception | `sync-workflow.mjs --check`: pre-existing `apps/miniprogram/miniprogram/utils/workflow.ts` drift, left unchanged as instructed. `sync-agent-distributions` requires an independent target repository and is inapplicable to this one-worktree task. |

**Mini source: 1,569,244 bytes**; unchanged limit **1,572,864**; headroom **3,620**. Runtime **1,144,677**; media **189,978**. Source is 44 bytes smaller than Phase 1. Lossless positional-array deltas and compact dictionary references fund the added facts. The generator preflights prospective generated TypeScript and compiled JavaScript before writing Mini outputs; neither the budget nor its tests were relaxed.

All requested implementation and per-item evidence work is complete. The seven channel availabilities remain unverified because public pages did not establish the exact identities. The unrelated pre-existing Web expectation and allowed workflow drift remain visible above. Production, account access, paid inference, real browser screenshots and WeChat native scanning were not performed; existing external acceptance work remains pending.

Reproduction (all commands run in this checkout; tests use injected offline transports):

```sh
node scripts/generate-model-audit.mjs --check
node scripts/sync-model-catalog.mjs --check
node scripts/sync-reference-upload.mjs --check
node scripts/sync-thinking.mjs --check
node scripts/sync-agent-knowledge.mjs --check
node scripts/sync-model-version-report.mjs --check
node scripts/report-model-card-r10.mjs --frozen-head --check
node scripts/report-model-card-r11.mjs --frozen-head --frozen-main --check
node scripts/report-model-card-r12.mjs --frozen-head --check
node scripts/report-model-modality-r21.mjs --check
node scripts/report-model-modality-phase2.mjs --check
node --test scripts/*.test.mjs
# In apps/paperbanana-api:
node --import tsx --test tests/model-modality-phase2.test.ts tests/model-modality-r21.test.ts tests/model-audit.test.ts tests/provider-catalog.test.ts
pnpm check
pnpm build
# In apps/auth-gateway:
node --test tests/model-audit.test.js tests/model-modality-r21.test.js tests/model-modality-phase2.test.js tests/tokendance-catalog.test.js
# In apps/web:
pnpm test tests/model-audit*.test.mjs tests/model-modality*.test.mjs tests/provider-catalogs.test.mjs tests/model-picker-unavailable.test.mjs tests/workspace-model-picker.test.mjs
pnpm build
# In apps/miniprogram:
pnpm build
pnpm check
pnpm test
```

## Phase 3 — full-suite Web regressions

The name regression starts in Phase 2: static enrichment copied `specificModelSpecifications.resolvedModel`, while `modelCardName` began resolving ID-only objects and prioritizing curated names over explicit live version names. Read-only `git show` comparisons confirm `8c456709` and `d1fe6ff6` agree on all 1,064 static picker names; `e4de4f5d` changes three (DeepSeek, SiliconFlow and TokenHub). Static enrichment now omits only the newly copied name override, and name resolution restores the earlier rules. Modality facts, source URLs, live explicit alias names and submitted IDs remain intact. Regenerated Web catalog changes are confined to those name overrides on six objects; Mini output is unchanged.

The frozen `model-picker-names-8c456709.json` fixture comes from the archived catalog and presentation functions. New tests render all **31 providers / 1,064 picker titles**, exercise option labels and submitted IDs for DeepSeek/Bailian/TokenDance, and protect explicit live-name precedence. `rendered-interactions.test.mjs` is unchanged; the pre-existing `provider-catalogs.test.mjs` channel-precedence edit is retained.

For Bailian, the exact `MiniMax/MiniMax-M3.1-Flash` and `xiaomi/mimo-v2.6-pro-ultraspeed` tables in `config/channel-audit/model-modality-phase2-20261109.json` justify **渠道**. There is no exact table for `deepseek-v4.1-flash-1017`; it retains **图研既有核实**, without borrowing the undated alias table. Only that conditional scope assertion and its evidence comment changed; image, context, maximum output, product-input and audio assertions are unchanged.

| Validation | Result |
| --- | --- |
| Full Web suite | **1,466/1,466**, zero failures/skips, using `NODE_OPTIONS=--no-experimental-webstorage node --import tsx --import ./tests/dom-setup.mjs --test --test-concurrency=2` in `apps/web`. |
| Mini / scripts | 159/159 / 42/42. |
| Web build | Pass; existing large-chunk advisory remains. |
| Phase 2 / R21 / catalog sync / audit generation `--check` | All four pass; full-vs-ID modality/source differences remain zero. |
| Mini source budget | **1,569,244 ≤ 1,572,864 bytes**, unchanged; **3,620 bytes** spare. |

All work and validation are local: no Git writes, network, paid calls, other-worktree changes or deployment.


## R22 Phase A

PM review of PR #251, items 1 and 4 only. Work stayed in this checkout on `codex/model-modality-audit`; HEAD remains `c84c159c`, with read-only comparison to `8c456709`. No git write commands, other worktrees, network access, secrets, paid calls, deployments or container image builds were used.

### Execution capability restored

The offline before/after comparison found **54 changed top-level modality fields on 47 registry models** at PR HEAD (45 input arrays, 9 output arrays). Channel counts by changed field were TokenDance 21, Bailian 17, fal 15 and Ideogram 1. `enrichSpecificPages` now leaves top-level execution fields intact. `normalizeCatalogModel` also uses the original exact/base archive to derive execution modalities, applying reviewed channel overlays only to display specifications; the frozen normalization comparison covers **113 identities** that previously differed under at least one input scenario.

Channel facts remain in `specifications` (`officialInputModalities`, `officialOutputModalities`, `modalityFacts`), `specificModelSpecifications`, audit display facts and `cardSpecifications`. Existing TokenDance/Bailian icons, links, provenance and all **1,064 static picker names** are retained. No model roles, selection/verification state, adapters, protocols, reference-image flags or limits were promoted or removed by this fix.

The audit checked `provider-catalog.ts`, `model-card-projection.mjs`, Web static/catalog facts, `sync-model-catalog.mjs`, Mini's decoded static catalog/normalizer/decoder/upload policy/picker, and Gateway's audit decorator. The generated Web and Mini execution projections already match main; their encoding and display-only differences remain. Running the catalog generator produced no additional generated-file changes. Core's two PR-added modality tests now assert the display specification fields rather than requiring top-level execution capability to equal display facts.

### Frozen main oracle and per-end tests

The checked-in artifact is [`test-support/fixtures/execution-capability-8c456709.json`](../test-support/fixtures/execution-capability-8c456709.json). Generate or verify it offline with:

```sh
node scripts/freeze-execution-capability.mjs
node scripts/freeze-execution-capability.mjs --check
```

The generator uses `git show 8c456709:<path>` through an in-memory loader. Historical product modules are bundled/evaluated without a checkout, temporary worktree or repository Git mutation. Both sides use the fixed clock `2026-11-09T12:00:00.000Z`, an empty product environment, the pre-existing main TokenDance metadata snapshot and synthetic metadata for the three OpenRouter defaults. Other public catalogs return a mocked 503. Database, storage, image processing and real transport are disabled. This is an execution-parity oracle, not a claim about current live catalog availability.

Coverage:

- **31 static providers / 1,064 static models**, preserving model order and every non-display property, including complete nested capabilities, reference policies, roles, protocols, availability and limits. The projection excludes only `specifications`, `specificModelSpecifications`, `cardSpecifications` and `auditSpecifications`.
- **32 full-registry providers / 1,064 returned models** in the deterministic offline scenario: 1,061 original Core entries plus three synthetic OpenRouter entries. The three static-only identities omitted by main's lifecycle processing remain omitted by current Core.
- **8,512 actual Core `resolveReferenceImageMode` decisions**: every returned model × vanilla/planner-critic × none/assist vision × references absent/present.
- **2,128 catalog-normalization cases**: every static identity with absent and explicitly supplied modality metadata. Exact-ID aliases, source pointers and all other returned execution fields are compared too.
- Web checks all static and live registry projections, `mainModelCanReadImages`, `workflowModelVisionStatus`, `workflowVisionError` and `modelRefinePresentation` used by the application.
- Mini checks decoded static data, static/live `normalizeModelRegistry`, the exact decoded `audited-input-policy`, static reference defaults, and the real compiled `generation-settings-sheet.effectiveRoles`, `index.refreshReferenceModeState` and `index.submitJob` methods. The static normalization scenario includes the same three synthetic OpenRouter rows to satisfy main's mandatory-provider contract (1,067 rows); live normalization covers 1,064. Submission is stopped at mocked infrastructure/payload boundaries; no task or upload is created.
- Gateway checks its actual in-memory registry HTTP response against main and verifies `withModelAudit` does not mutate capability or the input model.

Each endpoint owns a new `execution-capability-r22.test.*` test in its test directory. Display assertions and the 1,064-name picker test run alongside these checks.

### Complete changed-expectation review

[`model-modality-changed-tests.md`](model-modality-changed-tests.md) and its [JSON manifest](model-modality-changed-tests.json) enumerate **14 pre-existing test files**, **68 assertion or test-input changes**, and **615 semantic per-model changes** in the one changed, pre-existing consumed JSON fixture (`config/model-audit.generated.json`). The classification is **682 JUSTIFIED**, **1 UNJUSTIFIED / RESTORED**, **0 FLAGGED**. Existing historical JSON under `tests/fixtures` is unchanged; PR-added fixtures are explicitly distinguished.

The unjustified change was R6A's blanket allowance for any baseline modality loss whenever archived full-object output also omitted it. That general exemption is removed. Original positive-retention assertions apply to all unreviewed entries, with only **12 explicit omissions across nine exact Replicate/Runware schema identities** pinned to their already-existing source/date/complete array in `r22-exact-schema-expectations.json`. Unknown schema omissions are never asserted as unsupported. The earlier channel-specific table and portal changes remain justified by their exact evidence.

```sh
node scripts/report-changed-tests.mjs --check
```

This recomputes the changed pre-existing test-file set from `git diff 8c456709 -- '*test*' '*tests*'`, detects directly consumed changed JSON fixtures, verifies diff hashes, counts, evidence paths and Markdown/JSON agreement. A negative regression removes one file from the manifest and requires the check to fail.

### Validation

| Check | Result |
| --- | --- |
| Web full suite: `cd apps/web && NODE_OPTIONS=--no-experimental-webstorage node --import tsx --import ./tests/dom-setup.mjs --test --test-concurrency=2` | **1,467 passed, 0 failed** |
| Web `npm run build` | Passed; existing large-chunk advisory only |
| Mini `npm test` / `npm run build` | **160 passed, 0 failed** / passed |
| `node --test scripts/*.test.mjs` | **43 passed, 0 failed** |
| Gateway `npm test` | **203 passed, 87 environment binding failures, 1 skipped** |
| Core `node --import tsx --test tests/*model*.test.ts tests/provider-catalog.test.ts tests/reference-selection.test.ts tests/reference-upload-policy.test.ts` | **60 passed, 19 environment binding failures** |
| Core new/touched tests: `node --import tsx --test tests/execution-capability-r22.test.ts tests/model-modality-r21.test.ts tests/model-modality-phase2.test.ts` | **6 passed, 0 failed** |
| Core `npm run check` | Passed |
| `sync-model-catalog`, `generate-model-audit`, `report-model-modality-r21`, `report-model-modality-phase2`, `freeze-execution-capability`, `report-changed-tests` with `--check` | All passed |
| `git diff --check` | Passed |

Mini source is **1,569,244 bytes**, runtime excluding `.ts` is **1,144,677 bytes**. The original source limit remains **1,572,864 bytes**, leaving **3,620 bytes**. The frozen execution oracle lives outside the Mini package. No package-budget or binding-test assertion was relaxed.

### Environment-only localhost failures

Every failure below reports exactly `listen EPERM: operation not permitted 127.0.0.1`; there were no other failure categories in either broader run. They remain unmodified and need a localhost-enabled environment. Gateway's one pre-existing skip is reported separately by its runner. All new per-end parity checks use in-memory infrastructure and pass here.

| Endpoint / file:line | Test | Failure |
| --- | --- | --- |
| Core / `apps/paperbanana-api/tests/model-material-workflow.test.ts:1:2247` | gateway/Core: formats x retrieval x uploads; data and mixed types; revised-version review | `listen EPERM` |
| Core / `apps/paperbanana-api/tests/reference-selection.test.ts:1:2463` | production regression: 10 auto results fit the actual main or observer budget, then reach generation | `listen EPERM` |
| Core / `apps/paperbanana-api/tests/reference-selection.test.ts:1:4863` | no useful references or fewer references than budget never causes quota filling | `listen EPERM` |
| Core / `apps/paperbanana-api/tests/reference-selection.test.ts:1:6257` | uploaded and retrieved images share the actual planner budget; corrupted, duplicate bytes and overlarge refs are skipped | `listen EPERM` |
| Core / `apps/paperbanana-api/tests/reference-selection.test.ts:1:10170` | text-only main cannot consume gallery metadata alone; basic and assist both read images | `listen EPERM` |
| Core / `apps/paperbanana-api/tests/reference-selection.test.ts:1:12334` | historical 10-vs-8 task gets a read-only Chinese explanation without rewriting uncertain charges | `listen EPERM` |
| Core / `apps/paperbanana-api/tests/reference-selection.test.ts:1:15387` | reference selection, prepared bytes and completed planner survive balance recovery without repeated calls | `listen EPERM` |
| Core / `apps/paperbanana-api/tests/reference-selection.test.ts:1:16998` | plot rendering and optional enhancement success or fallback remain separate visible stages | `listen EPERM` |
| Core / `apps/paperbanana-api/tests/reference-selection.test.ts:1:19251` | SVG generation failure reports rendering after a successful saved plan | `listen EPERM` |
| Core / `apps/paperbanana-api/tests/reference-upload-policy.test.ts:1:1403` | 8 real uploads, >5MiB originals, processing and vanilla main-model analysis reach generation | `listen EPERM` |
| Core / `apps/paperbanana-api/tests/reference-upload-policy.test.ts:1:4055` | 100 MB actual storage roundtrip; ten-file and 10 MB byte ceilings cannot be bypassed | `listen EPERM` |
| Core / `apps/paperbanana-api/tests/reference-upload-policy.test.ts:1:4864` | decode bounds, lossless failure, actual Base64 request budget, and processing concurrency reject before providers | `listen EPERM` |
| Core / `apps/paperbanana-api/tests/reference-upload-policy.test.ts:1:6580` | supported photographic WebP is retained before PNG expansion, and Bailian includes its VL fallback bounds | `listen EPERM` |
| Core / `apps/paperbanana-api/tests/reference-upload-policy.test.ts:1:7977` | Bailian compatibility retry receives derivatives within the actual fallback model budget | `listen EPERM` |
| Core / `apps/paperbanana-api/tests/reference-upload-policy.test.ts:1:9612` | owned extensionless JPEG sources keep working through Gateway and the real refine adapter | `listen EPERM` |
| Core / `apps/paperbanana-api/tests/reference-upload-policy.test.ts:1:10975` | SVG retains vector detail at model size and refuses silent text loss; HTTP busy finalize is retryable | `listen EPERM` |
| Core / `apps/paperbanana-api/tests/reference-upload-policy.test.ts:1:12723` | processed aggregate budget stops a real multi-image batch before a paid transport | `listen EPERM` |
| Core / `apps/paperbanana-api/tests/reference-upload-policy.test.ts:1:13285` | TokenDance invalid reference bytes fail with actionable input errors before any paid call | `listen EPERM` |
| Core / `apps/paperbanana-api/tests/reference-upload-policy.test.ts:1:15269` | Seedream 14px is rejected before queueing and 15px reaches the exact refine adapter | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/account-profile.test.js:78:1` | HTTP profile requires current account, trusted write origin and JSON; activity never accepts a body identity | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/app.test.js:155:1` | allows exact WeChat origins and rejects lookalike domains | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/app.test.js:212:1` | Better Auth receives bounded request bodies through the Web handler bridge | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/app.test.js:227:1` | Better Auth rejects bodies larger than 1 MiB with the stable envelope | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/app.test.js:241:1` | Better Auth counts chunked bytes instead of trusting Content-Length | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/app.test.js:256:1` | Better Auth still receives a valid chunked body below the limit | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/app.test.js:269:1` | keeps HTTP-200 business envelopes including public saturation code 429 | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/app.test.js:278:1` | relays a real upstream HTTP status and envelope unchanged | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/app.test.js:287:1` | optimizeInputs relays the business envelope with an exact anonymous DTO and dedicated timeout | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/app.test.js:337:1` | maintenance blocks optimizeInputs before it reaches the backend | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/app.test.js:347:1` | modelRegistry is a public read-only backend action | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/app.test.js:364:1` | large public registries negotiate gzip and preserve every catalog field on the wire | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/app.test.js:406:1` | registry errors and other public responses are not compressed by the registry path | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/app.test.js:420:1` | benchmark public actions are anonymous read-only backend actions | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/app.test.js:435:1` | benchmark prompt submissions require an account and replace forged identity | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/app.test.js:453:1` | benchmark admin actions require immutable admin identity before forwarding | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/app.test.js:468:1` | benchmark prompt moderation actions use the existing immutable admin transport | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/app.test.js:484:1` | anonymous writes receive a stable guest owner while raw forwarding headers are not relayed | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/app.test.js:509:1` | logged-in writes use the account identity and never create a guest cookie | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/app.test.js:522:1` | create and refine preserve explicit mixed routes and legacy fields without top-provider rewrites | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/app.test.js:585:1` | providerAccountCatalog receives the same authenticated-or-guest write principal as jobs | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/app.test.js:613:1` | getJob allows a matching guest owner and rejects missing or mismatched ownership | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/app.test.js:636:1` | getJob rejects historical email-only ownership and accepts immutable-id admins | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/app.test.js:652:1` | matching an admin email or caller token never grants admin access | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/app.test.js:681:1` | getJob rotates a valid previous-key guest cookie while preserving access | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/app.test.js:715:1` | guest identity never enables myJobs, admin lists, or account deletion | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/app.test.js:734:1` | refine checks source job ownership before dispatch and prefers the object key | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/app.test.js:760:1` | refine rejects cross-owner object keys and external URLs before dispatch | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/app.test.js:784:1` | maintenance mode dynamically blocks the exact mutating set but preserves reads and auth | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/app.test.js:810:1` | health is cached liveness, ready probes dependencies, and public routes expose the Node backend | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/app.test.js:841:1` | ready returns 503 if either auth or backend is unavailable | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/app.test.js:850:1` | account deletion mutates auth only after semantic backend success | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/app.test.js:875:1` | account deletion preflights the v3 contract before any destructive backend call | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/app.test.js:897:1` | concurrent account deletion requests share one destructive operation | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/app.test.js:939:1` | account deletion succeeds after commit even when cookie clearing fails | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/app.test.js:965:1` | account deletion treats password-store failures as internal errors, not bad passwords | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/app.test.js:984:1` | unexpected internal failures return a generic 500 and log only redacted detail | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/app.test.js:1016:1` | route-shaped multi-key failures keep every BYOK secret out of logs and the public 500 | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/app.test.js:1044:1` | account deletion persists retry on business failure or incomplete success without deleting Auth | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/app.test.js:1061:1` | account deletion refuses a legacy cleanup response that cannot prove complete object deletion | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/app.test.js:1076:1` | maintenance blocks account deletion before password or backend calls | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/app.test.js:1091:1` | returns a stable 1 MiB JSON body error envelope | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/app.test.js:1104:1` | account status uses the session identity and internal deletion actions are not public | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/app.test.js:1117:1` | a durable deletion blocks new work even before Core first accepts the cleanup request | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/app.test.js:1128:1` | maintenance blocks Watcha mutations and OAuth callback while allowing status and email sign-in | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/app.test.js:1152:1` | account deletion confirmation replaces only password reauthentication and keeps email matching | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/app.test.js:1170:1` | metadata catalog forwards only the selected channel key and explicit directory credentials | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/app.test.js:1183:1` | production workspace execution is advertised only with all durable stores mounted | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/app.test.js:1197:1` | production requires login before any task, upload, export or paid helper can be dispatched | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/bailian-workspace.test.js:29:1` | paused workspace execution cannot resume against a newly selected business space or region | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/ecosystem.test.js:20:1` | ecosystem requires live account and trusted origin before parsing and forwarding | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/ecosystem.test.js:32:1` | unconfigured or maintained service fails closed, never touching Core or worker | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/ecosystem.test.js:37:1` | malformed and excessive payloads never reach the worker | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/ecosystem.test.js:45:1` | gateway preserves duplicate JSON properties for strict worker rejection | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/ecosystem.test.js:53:1` | worker errors are bounded and hidden; expired sessions cannot receive results | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/ecosystem.test.js:62:1` | concurrent account renders are rejected, then released after completion | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/ecosystem.test.js:69:1` | worker timeout aborts the request and rate window bounds repeated renders | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/image-library.test.js:7:1` | image HTTP routes require session, origin and account; map only live tasks and never trust supplied ownership | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/mcp.test.js:98:1` | initialize advertises only tools and resources without creating state | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/mcp.test.js:119:1` | tools/list exposes one read-only closed-schema tool | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/mcp.test.js:138:1` | tool calls return the selected public workflow without forwarding arguments | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/mcp.test.js:160:1` | tool calls reject free text, extra fields, invalid versions, and invalid enums | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/mcp.test.js:185:1` | resources list in stable order and dynamic workflow resources can be read | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/mcp.test.js:210:1` | MCP has an independent 64 KiB request ceiling | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/mcp.test.js:221:1` | anonymous journal and taxonomy resources retain their wire hashes without business calls | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/mcp.test.js:236:1` | MCP limits each client IP to 60 requests per minute | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/mcp.test.js:248:1` | MCP operational logs exclude arguments and user-controlled values | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/mcp.test.js:270:1` | MCP logs normalize unknown method names instead of recording arbitrary text | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/mcp.test.js:281:1` | stateless MCP serves concurrent read requests without sessions | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/model-library.test.js:25:1` | library writes require current identity and trusted Origin; lifecycle closure cannot leave a late write | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/model-library.test.js:33:1` | malformed JSON never reflects a credential fragment in its error | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/ops-agent.test.js:76:1` | authentication excludes anonymous, cookie, query, expired keys and browser requests | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/ops-agent.test.js:89:1` | HTTP responses and audits use fixed projections, scopes, methods and bounded queries | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/ops-agent.test.js:119:1` | MCP initialize/discovery/parallel tool calls work statelessly with no write tools | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/ops-agent.test.js:141:1` | bounded per-credential rate limit and body limit | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/ops-agent.test.js:213:1` | actual Gateway mounts private ops before public CORS/auth and keeps public MCP separate | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/plus-access.test.js:7:1` | every Plus route rejects ordinary or forged admin requests before payment or ledger access | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/plus-access.test.js:31:1` | admin-only router fails closed when no admin checker is wired | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/workspace-deletion.test.js:27:1` | HTTP deletion authenticates account and origin; cleanup failure is durable and GET retries without rerunning any model | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/workspace-execution.test.js:17:1` | HTTP envelope preserves normal downstream route; credentials are resolved only for selected roles, no replay after lost response | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/workspace-execution.test.js:44:1` | input optimization resolves only main credentials and shares the task execution lock | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/workspace-execution.test.js:55:1` | paused execution resumes only its original job and binding; duplicate resume never dispatches twice | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/workspace-execution.test.js:65:1` | a stale competing run cannot dispatch after the previous task lock is released | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/workspace-execution.test.js:72:1` | workspace is rechecked after slow routing and atomic claim before dispatch | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/workspace-history.test.js:6:1` | history route authenticates, binds pagination to session identity and rejects foreign jobs even for administrators | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/workspace-sync.test.js:35:1` | HTTP routes require live identity, matching account header and trusted write origin | `listen EPERM` |
| Gateway / `apps/auth-gateway/tests/workspace-sync.test.js:72:1` | revision-only reads work across trusted origins with the same account and preserve CAS | `listen EPERM` |

## R22 Phase B

Items 2, 5 and 6 plus the Docker bundle regression are addressed on `codex/model-modality-audit`, starting at `c76e9c2a`; the execution/name baseline remains `8c456709`. No Git writes, other-worktree access, image builds, inference, authenticated requests, deployment, or secret reads were used. External traffic was limited to unauthenticated public GETs for TokenDance model documentation and the SPA assets/data needed to render those pages.

### Item 2 — rendered TokenDance pages

The new [capture](../config/channel-audit/tokendance-rendered-pages-20261110.json) covers **74/74** identities: HTML **74 HTTP 200** SPA shells; exact portal JSON **67 HTTP 200 / 7 HTTP 404**; rendered content **67 real model pages / 7 “Model not found”**. Audit date is **2026-11-10, Asia/Shanghai**; raw UTC acquisition timestamps remain in every response (2026-11-09 18:24–18:25 UTC). Each row preserves HTML, portal JSON, rendered text, per-body SHA-256, and a combined evidence hash. Public model-page stats/timeseries dependencies and 22 actual JavaScript assets have recorded hashes as well.

The requested headless Chrome launch failed before navigation with `SIGABRT` / `kill EPERM`. The successful fallback evaluates the actual downloaded SPA ES modules in separate JSDOM contexts, replaying each exact captured model response and allowing only public page dependencies. A real-page decision requires the exact portal slug and matching rendered model heading, with no “Model not found” text. This is rendered DOM/text evidence, not Chrome layout or screenshot QA. Analytics, login, CAPTCHA, and other unrelated API requests are not loaded.

`model-card-sources.mjs` admits a TokenDance URL only through the date/hash-backed exact-ID allowlist. An uncaptured identity with no retained vendor/original source renders **官方文档待确认** without an anchor. All seven historical identities have an original main source, captured with the actual main resolver through read-only `git show`; none needs the no-link fallback:

| Historical ID | Restored first link from main |
| --- | --- |
| `deepseek-v4-flash-vision-exp` | https://api-docs.deepseek.com/news/news260821/ |
| `deepseek-v4-flash` | https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash |
| `deepseek-v3.2` | https://huggingface.co/deepseek-ai/DeepSeek-V3.2 |
| `deepseek-chat-v3-0324` | https://api-docs.deepseek.com/news/news250325 |
| `qwen3.6-max-preview` | https://help.aliyun.com/zh/model-studio/qwen3-6-max |
| `qwen3-30b-a3b-instruct-2507` | https://huggingface.co/Qwen/Qwen3-30B-A3B-Instruct-2507 |
| `qwen3-max` | https://help.aliyun.com/zh/model-studio/models |

The seven model records and their unknown modality facts remain present. A missing page is not a delisting or execution-capability decision. Web tests exercise ID-only and full static cards, Core tests inspect complete registry projections, Gateway tests relay those projections, and compiled Mini tests inspect both links and visible cards. All four ends retain the earlier execution locks.

### Item 5 — named and deduplicated sources

The shared [presentation helper](../packages/api/src/card-presentation.mjs) uses a stored page title where meaningful (the DeepSeek V3-0324 release title), curated subjects for common pages, and readable path subjects otherwise. Role prefixes such as **官方文档**, **原厂规格**, and **下线公告** remain separate from the page name. Bailian DeepSeek-V4.1-Flash now shows **官方文档 · 百炼 · DeepSeek-V4.1-Flash 模型页**; its list source is **官方文档 · 百炼 · 模型列表**. Colliding subjects receive a path/host distinction.

URL identity ignores trailing slashes, fragments and tracking parameters (`utm_*`, `ref`, `referrer`, `fbclid`, `gclid`, `msclkid`), sorts other query parameters, and preserves meaningful query differences. The first original navigation URL is retained; evidence archives are not normalized in place. Across **1,064 cards**, duplicate canonical URL rows fall **13 → 0**, and repeated role-plus-host visible labels fall **974 → 0**. Total source rows are **2,489 → 2,479**: dedupe removes 13 and restored historical vendor lists add three secondary rows. The dialog’s prose no longer repeats its link list. The Bailian example has four distinct named links, each appearing once.

Mini retains its established one-primary-source card/copy-dialog footprint and uses the same title helper. All 1,064 Mini cards have unique URL/label rows; the live Core primary link and offline compact primary link agree. Source rendering does not modify provenance, dates, or selection state.

### Item 6 — modality order, vendor attribution, and the vision tag

Display order is **text, image, video, audio**, followed by any other modalities. Icons, Chinese lists, icon tooltips, and Mini supported/unsupported/unknown lists use this order. Sorting operates on copies; stored modality arrays and execution decisions remain exactly equal to main.

The provenance rule is **retain independently known vendor values and visibly label them 源自原厂 beside the value**. Qwen3.6 Plus keeps its exact vendor value `65536` and compact `≈ 66K tokens`, now with the visible vendor label. Applied uniformly to TokenDance, this labels **20 token fields across 18 cards** (16 max-output fields and four context fields). **63 token fields remain unknown** (58 outputs, five contexts). Four previously `catalog` fallbacks whose sources are exclusively vendor pages (two historical Qwen contexts and two MiMo outputs) are classified `vendor` at the display merge boundary; source URLs, values, verification dates and original archives remain intact. Channel modality facts are unchanged. No unknown becomes zero or infinity.

**视觉理解 is execution-based.** `ModelPicker.jsx` maps `model.roles` to tags; the workspace catalog filters and renders the same roles via `ROLE_NAMES`; Mini checks `model.roles.includes('vision')`. TokenDance `kimi-k3.1-pro` has `roles: ['main']` at the frozen baseline. Its image/video input display facts therefore coexist with no vision execution tag. That rule and role list were deliberately preserved.

### Docker layout and shared data

Core’s card projection no longer imports Web files or `config` across package boundaries. Pure rules live in `packages/api/src/catalog-card-facts.mjs`, `model-card-sources.mjs`, and `card-presentation.mjs`; package-local `card-data/*.json` is generated from canonical evidence by `sync-card-display.mjs --check`. The existing Web paths re-export the shared rules. Core’s four compensating Web/config COPY instructions are removed. The benchmark-worker Dockerfile already copies `packages/api/src`, so its embedded Core build now has the same complete dependency tree. Gateway’s production import graph needs no added COPY.

Both Core and benchmark build stages use `/workspace`; Core runs from `/workspace/apps/paperbanana-api`. At Phase A, Core had compensating Web/config COPY instructions, but the benchmark image invokes that same Core build without those files. The earlier Core-only source reachability check did not exercise actual destination layout or the benchmark image’s embedded Core build. The new [Docker-context simulator](../scripts/check-docker-bundles.mjs) parses actual COPY/WORKDIR/stage instructions, applies `.dockerignore`, reconstructs their destinations in a temporary tree, and executes the exact package esbuild commands with installed dependencies. Workspace dependency links point into the copied tree, so original-checkout sources cannot hide missing COPY entries. It resolves **4 Core bundles, 16 bundles in the benchmark-worker layout (4 Core + 12 worker), and Gateway’s complete local runtime imports**. No Docker command, image, dependency install, server start or network is involved.

### Preservation, size and expectation review

The [current Phase B report](model-modality-r22b-results.json) verifies all **1,064 picker names equal main**, all **1,061 full Core cards** agree with Web fields, and full-vs-static first-source differences remain **zero**. Historical R10/R11/R12/R21/Phase 2 evidence and report files remain unchanged; their check commands explicitly use archived source versions. Current behavior has independent Phase B tests/report coverage.

Mini’s lossless catalog codec now encodes delta references with a single-character `^` tag, escaping literal prefixes and retaining legacy tag-5 decoding. Roundtrip, digest, independent-container ownership and both byte-budget assertions remain enforced; no model field was removed. Reference-upload policy data was regenerated through its existing sync script to use the same encoding.

The [changed-test ledger](model-modality-changed-tests.md) retains Phase A decisions and adds explicit Phase B transitions against `c76e9c2a`. Whole-file diff hashes and pre-existing file inventory still use main. Current totals: **20 test files, 110 assertion/input review rows, 615 semantic fixture rows, 724 justified, one previously restored unjustified change, zero flagged**. Changes cover only verified-link fallbacks, page-subject labels, display order and the lossless wire-tag assertion; roles, availability, upload/execution locks, unknown states and package budgets are retained.

Mini source: **1,564,986 / 1,572,864 bytes**, runtime excluding `.ts`: **1,139,989 bytes**, media: **189,978 bytes**, remaining source budget: **7,878 bytes**. The stricter R15 ceiling of 1,569,427 bytes also passes. Mini deployment remains paused.

### Final validation

Exact commands, counts and log hashes are in [validation JSON](model-modality-r22b-validation.json).

| Check | Result |
| --- | --- |
| Web full suite, required command with concurrency 2 | **1,472 / 1,472 pass** |
| Mini `npm test` | **163 / 163 pass** |
| `node --test scripts/*.test.mjs` | **48 / 48 pass** |
| Core touched/new tests plus R21/Phase 2/execution lock | **7 / 7 pass** |
| Gateway R21/Phase 2/execution lock, including verified-link relay | **5 / 5 pass** |
| Web build; Mini build; Core `pnpm --filter @paperbanana/paperbanana-api build`; Core typecheck | **All pass** |
| Docker COPY-layout simulation | **Core, benchmark and Gateway pass; no images built** |
| Catalog, audit, R21, Phase 2, changed-test ledger, frozen execution and all new Phase B `--check` commands | **All pass** |
| Reference upload, thinking, agent knowledge, model version, archived R10/R11/R12 checks | **All pass** |
| `sync-workflow.mjs --check` | **Existing drift** in `apps/miniprogram/miniprogram/utils/workflow.ts`; both generator and target are unchanged from Phase A. Kept intact. |
| `sync-agent-distributions.mjs --check` | **Not applicable**: usage requires `skill|mcp <existing-independent-repo>`. Guard exits before any target access; other worktrees are forbidden for this task. |

The R10/R12 commands use `--frozen-head`; R11 additionally uses `--frozen-main` to avoid a sibling checkout. Seventeen applicable generator/report/layout checks pass, one unrelated pre-existing workflow check reports drift, and the independent-repository distribution command is outside scope. No touched Core/Gateway test encountered localhost EPERM. The older Phase A socket failure list above remains an environmental follow-up, not a newly passed suite. Chrome visual rendering and native WeChat scanning remain unperformed; the 74-page rendered-text evidence and compiled Mini template tests have the boundaries described above.

Reproduce the new checks without network:

```sh
node scripts/capture-tokendance-pages.mjs --check
node scripts/sync-card-display.mjs --check
node scripts/check-docker-bundles.mjs --check
node scripts/report-model-modality-r22b.mjs --check
node scripts/report-changed-tests.mjs --check
```

A fresh public capture, if needed in a later authorized documentation audit, uses `node --experimental-vm-modules scripts/capture-tokendance-pages.mjs --capture`; it is not part of offline validation. Run `sync-card-display`, then `sync-model-catalog` and `sync-reference-upload` after changing the source evidence or lossless codec.


## R22 Phase C

PM review of PR #251, item 3. Base remains `main 8c456709`; this phase starts from `2550c736` on `codex/model-modality-audit` in this checkout. This is a display change. Execution-capability facts and decisions, all 1,064 picker names, captured TokenDance links, deduplicated descriptive source rows, visible vendor provenance, and text → image → video → audio display order remain covered by the existing tests.

### State → visual → wording

| Evidence state / provenance | Web and Mini visual | Accessible wording, using image as the example |
| --- | --- | --- |
| Supported / known positive | Existing solid Lucide glyph in the normal text colour | `图像：支持` |
| Explicit omission from an exhaustive channel list (`provenance: channel` with `unsupportedModalities`, or a channel `unsupported` fact) | Muted glyph with a separate 2px diagonal strike | `图像：渠道未开放` |
| Explicit exclusion from model/vendor evidence | The same muted glyph and diagonal strike | `图像：不支持` |
| Unknown / unconfirmed / masked by a channel review | Muted dashed treatment with a small `?` badge; no strike | `图像：未知` |
| Legacy non-exhaustive text-only omission (`unlisted`) | The uncertainty visual, never the exclusion strike | Existing `图像：官方未列支持` qualification remains |
| Existing conditional support | Existing glyph with `*` | Existing `有条件支持` qualification remains |

An omitted item in a non-exhaustive list is never promoted to an exclusion. Channel omission does not establish a limitation of the underlying model. The `unsupported` machine state is retained for compatibility; provenance controls its user-facing wording. The same pure helper supplies Web and the generated Mini presentation data. No source fact or execution field is rewritten.

Regular Web and Mini glyphs retain a **20 × 20px** footprint; compact Web catalog cards retain their existing **18 × 18px** footprint and 7px gap. Marks are absolutely positioned within the footprint, so state changes add no row or legend. Web uses `--ink`, `--muted`, `--ink-soft` and `--surface`; Mini reuses its existing `#213b2f` / `#68786d` colours and embeds the same Lucide Type/Image/Video/AudioLines SVG paths as CSS masks, with no new image files. Web uncertainty uses dashed SVG strokes; Mini uses an inset dashed outline. The question mark and exclusion line remain distinct in monochrome. Calculated distinguishing-mark contrast on active card, selected-card and dialog backgrounds is at least **4.26:1**; disabled-card opacity remains subject to the existing disabled presentation.

### Original evidence and details

`sync-card-display.mjs` generates `packages/api/src/card-data/modality-evidence.json` from the existing local captures. TokenDance quotes come from `tokendance-catalog-snapshot-20261109b.json` and are limited to the 67 verified exact pages already established in Phase B. The generator asserts `architecture.modality` equals the stored input/output arrays joined by `→`; only the modality labels and comma separators are localized. Original ordering is retained in the quote even when the display icons use text/image/video/audio order. The verification date is the November 9 portal capture, not the later rendered-page check.

Qwen3.6 Plus uses **`渠道标注：文本→文本（2026-11-09）`** on both input and output icons. Its omitted image/video/audio labels say **渠道未开放**, and no TokenDance card presentation says 不支持. The seven unknown historical identities retain unknown state and `渠道未标注此模态（核实日期 2026-11-09）`.

Bailian uses the literal stored `quote` for all 34 Phase 2 identities, including English `Text` / `Image` / `Video` / `Audio`, plus Kimi K3's original R10 pipe-delimited table quote. Keys include the exact model ID as well as the source page: different variants on the same page retain their individual quotes. All channel-derived exclusion icons have an original captured quote and date. Other positive facts show their source subject/provenance and stored date. Unknowns show `渠道未标注此模态（核实日期 …）` for channel evidence/review masks, or `暂无官方资料` where no official modality evidence is available; no capability wording is invented from roles or model names.

Web preserves per-icon `role="img"` names, hides decorative marks from assistive technology, and makes the existing modality row a keyboard/touch trigger for the existing evidence dialog. The trigger also includes each state in its accessible name. The same dialog works in compact cards and without an available source link. Source-link touch behavior remains available. Mini binds `aria-label`, `data-state`, and the same evidence text to each icon; its tap modal does not change the selected model or copy an empty link.

### Tests, package budget and expectation review

New tests cover three distinct classes/data states, accessible names, exact Qwen and per-identity Bailian quotes, all 74 TokenDance cards, vendor exclusions, unknown evidence, strike/question/dashed structure, immutable facts, Mini modal interaction and shared/generated-helper parity across all 1,064 identities. DOM interaction tests cover 1280 and 390 viewport settings plus compact variants, including no-source cards. Contrast tests read the actual CSS tokens and check active backgrounds against 3:1.

The existing R21 Qwen labels change from 不支持 to 渠道未开放. The existing R22B icon-order assertion now reads accessible names rather than titles because titles carry evidence; the order stays unchanged. These two tests were introduced after main and are separately hashed against `2550c736` in the [changed-test ledger](model-modality-changed-tests.md). Five main-existing test files also update presentation-only expectations: the Kimi K3 channel wording, three tests prohibiting question badges, explicit keyboard traversal of the two evidence controls between model selections, and the library test selecting its Backup action by name now that evidence buttons exist. Fact, unknown-state, source, execution and selection assertions remain intact; every change is recorded with its reason. The ledger also covers the Mini `build` script's post-tsc compaction. `report-changed-tests.mjs --check` validates both inventories and their diff hashes.

To stay within both pre-existing byte ceilings, the Mini build compacts **only** the picker component's generated JavaScript using the existing esbuild dependency. TypeScript stays readable; identifiers are retained; `sync-card-display --check` independently reproduces the artifact from TypeScript. UTF-8 output and grouped evidence avoid shipping the capture archives. No package-budget assertion is relaxed.

| Validation | Result |
| --- | --- |
| Web full | **1,477/1,477 pass**, zero failures/skips |
| Mini full | **166/166 pass**, zero failures/skips |
| Scripts full | **50/50 pass**, zero failures/skips |
| Core regression and execution lock | **7/7 pass**, zero failures/skips |
| Gateway regression and execution lock | **5/5 pass**, zero failures/skips |
| Web and Mini builds; Core build/typecheck | All pass |
| 17 applicable generator/report/layout checks, including every requested `--check` | All pass |
| Docker COPY import checks | 4 Core, 16 benchmark-image and 1 Gateway bundle resolve; no images built |
| Changed-test ledger; `git diff --check` | Pass |

**Mini source: 1,568,957 / 1,572,864 bytes**, leaving **3,907 bytes**. Runtime excluding `.ts`: **1,143,962 bytes**; media **189,978 bytes**. The older **1,569,427-byte** ceiling also passes, with **470 bytes** spare. Compared with Phase B, source grows by **3,971 bytes**. Commands, counts and log hashes are recorded in [Phase C validation](model-modality-r22c-validation.json).

Final full-suite validation includes the revised expectations and keyboard traversal. An intermediate scripts run overlapped the Mini compiler before its compaction step and measured temporary JS output; the completed build and subsequent standalone scripts suite pass without any budget changes.

### Validation limits

The offline Playwright CLI was launched with the update notifier disabled and an offline browser context. Chrome exited with **SIGABRT / kill EPERM** before opening the review page, reproducing the previous environment restriction. Consequently, no real-browser 1280/390 screenshots or native WeChat screenshots are claimed. DOM/CSS, interaction and numerical contrast checks are evidence for structure and behavior, not a substitute for native visual acceptance.

The prior broader Core/Gateway socket failures and unrelated `sync-workflow` drift remain recorded in Phases A/B; those files and expectations are untouched. No production deployment, paid/inference request, image build, other-worktree operation, or git write command is part of Phase C. Mini deployment remains paused.


## R22 Phase D

CI's `actions/checkout@v4` keeps its default depth of one. Tests now work without
historical Git objects or even a `.git` directory. This phase starts from
`89f548a0` on `codex/model-modality-audit` in this checkout.

### Frozen artifacts and unchanged assertions

`test-support/execution-capability.mjs` executes current product code using
committed `execution-inputs-8c456709.json`: the original public TokenDance
snapshot and the three original OpenRouter defaults. It reads no historical
source when invoked by tests. All four endpoint execution locks still compare
the complete **1,064-model** execution output and reference-image decisions
against `execution-capability-8c456709.json`. That fixture is now minified:
**13,579,648 → 13,538,408 bytes**. A deep comparison against its starting-HEAD
version confirmed no semantic change; the full-history generator independently
recomputed and verified every value.

Older card tests still execute their original resolvers and static catalog
objects. `test-support/archive/model-card-sources.json.gz` stores exactly their
**18 commit/path source entries** for `8c456709` and `d1fe6ff6`, losslessly
compressed to **334,238 bytes**. The readable manifest records each original
byte length and SHA-256. `scripts/freeze-audit-sources.mjs --check` discovers the
dependency graphs again and compares every decompressed source byte with
`git show`; no archived Core runtime or extra historical worktree is needed.

No existing test assertion, test input expectation, picker name, verified link,
icon, product code or package budget was changed. The changed-test Markdown/JSON
remain byte-identical. Their checker uses a new **7,796-byte** frozen inventory
to validate file membership, file content hashes, diff hashes recorded in the
review, review rows/counts, evidence paths and Markdown even without history.
With history, it additionally recomputes the original complete changed-file
inventory and all Git diff hashes. Discovering newly changed pre-existing files
outside that frozen inventory still requires the full-history check.

### Maintenance and missing-history behavior

`git show` is confined to the maintenance reader in
`scripts/lib/git-history.mjs`, explicitly supplied to generators/reports.
Before historical work, each command probes `git cat-file -e <commit>^{commit}`.
An unavailable commit in `--check` mode prints an explicit `SKIP` and exits zero;
normal generation fails rather than silently emitting incomplete artifacts.
The changed-test command skips only Git-dependent verification and still runs
all frozen checks. When commits exist, no historical verification is skipped.

This covers execution freezing, source archiving, changed-test review, frozen
R10/R11/R12 reports, R21, Phase 2, R22B and the older R12 link-fixture generator.
The last command now has a real read-only `--check`; it also freezes its static
catalog input to `8c456709`, so today's richer display objects cannot rewrite
the older fixture. Its existing output remains unchanged.

Four new regression tests validate archive integrity, execute the Core/card
loaders with a Git command that always fails (and assert it was never invoked),
exercise every maintenance skip, and reject a tampered ledger hash without
history. The existing missing-ledger-entry negative test also remains active.

### Validation method

The CI simulation copied the **current working-tree bytes**, including all new
files, into `/tmp/r22d-ci`. A read-only `git ls-files` inventory selected tracked
and non-ignored new files for `rsync`; no Git metadata, ignored credentials,
dependencies or build caches were copied. Root and installed workspace
`node_modules` directories were symlinked from this checkout as requested.
`git cat-file -e 8c456709^{commit}` failed there before testing.

To obey **NO git write commands**, the simulation deliberately used no
`git init`, commit, clone, checkout or other Git mutation. The copy had no `.git`
at all, a stricter history-availability condition than depth one. It is an
offline dependency-sharing simulation, not a fresh dependency installation or
a claim of a real GitHub Actions run. All seven requested full-suite commands
were run both here and in the copy; the results and socket-failure names are
recorded below and in [Phase D validation](model-modality-r22d-validation.json).

### Full-suite results and retained failures

| Requested suite | This checkout: pass / fail / skip | History-free copy: pass / fail / skip |
| --- | ---: | ---: |
| Gateway | 203 / 87 / 1 | 203 / 87 / 1 |
| Core (`pnpm test`) | 1,347 / 270 / 1 | 1,346 / 271 / 1 |
| Web (required command, concurrency 2) | **1,477 / 0 / 0** | **1,477 / 0 / 0** |
| Mini | **166 / 0 / 0** | **166 / 0 / 0** |
| Scripts | **54 / 0 / 0** | **54 / 0 / 0** |
| Shared API | **33 / 0 / 0** | **33 / 0 / 0** |
| Root contracts | 27 / 5 / 0 | 27 / 5 / 0 |

**Zero missing-history failures. All four R22 execution locks passed in both
runs.** The 1,064 picker names, original archived-card counts, verified links and
icon assertions also passed. All ten maintenance checks passed with history;
without history they printed explicit skips, with the changed-test frozen checks
still passing. `git diff --check` passes.

Every failure is listed by exact test name, source location and error in the
validation JSON's `failureCatalog`; each run references its complete list by
`failureIds`. The 270 Core failures present in both runs consist of **266 localhost
`listen EPERM` failures**, **three missing-LibreOffice conversion failures**, and
**one xAI fixture using a service whose recorded end date is 2026-11-02**. All
**87 Gateway failures** are localhost `listen EPERM`. These are retained failures,
not passes or newly introduced skips.

The copy's one additional Core failure was the Docker COPY dependency-path
assertion: the requested dependency-directory symlink resolved
`@paperbanana/benchmark-core` back outside the copy. A temporary dependency
overlay redirected that workspace link into the copied package. The complete
`model-modality-phase2.test.ts` file then passed **2/2**, including the COPY check.
No image was built and no source/assertion changed. The table retains the initial
full-run result rather than combining it with the targeted rerun.

The five root contract failures are identical in both runs and are unrelated to
history loading. Their source/config/product dependencies were not changed:

- `every original audit row has an explicit implementation or exclusion decision`:
  `siliconflow/baidu/ERNIE-Image-Turbo` has no matching decision.
- `760 historical identities and capabilities remain unchanged except the explicitly added refine controls`:
  the count is 761 versus the retained expectation of 760.
- `every static ID carries reviewed version metadata through Web, Mini normalization, and repeated presentation`:
  missing reviewed version metadata for `siliconflow/deepseek-ai/DeepSeek-V4.1-Flash`.
- `DeepSeek direct and hosted IDs have distinct versions without alias substitution`:
  the retained test expects the pending-confirmation label, while the current name is `DeepSeek-V4-Pro`.
- `rolling pointers use documented defaults, not the newest snapshot or a date heuristic`:
  the retained test expects `具体版本待确认`, while the current label says `具体版本未知`.

No pre-existing expectation was weakened to make these suites green. The full
commands, counts, log hashes, failure inventory and dependency-overlay follow-up
are in the validation JSON. `/tmp/r22d-ci` was deleted after validation, including
its temporary dependency links. The starting branch/HEAD and all prior product
work are preserved; no Git write command, network lookup, paid request,
production action, other-worktree operation or image build was performed.

## R23 Phase E

PM re-review of PR #251, starting head `42ee9ffd`, branch `codex/model-modality-audit`, frozen main `8c456709`. Scope: items 1, 2, 3, 5 and 6. All work stayed in this checkout, offline; no Git writes/config-file edits, secrets, paid calls, deployment or image builds. `sync-agent-knowledge` and `sync-workflow` were not touched.

- **Item 1 — vendor links:** verified TokenDance pages remain first; each field's human vendor evidence is appended and canonically deduplicated. Appended rows use the `原厂规格` role prefix and descriptive subjects. Existing notice labels remain; Mini explicitly records `role: vendor` for the two MiMo URLs that serve as both the primary retirement notice and vendor input evidence. Core's display-only `cardSpecifications.vendorSources` array carries these links to Mini; its static projection carries the same evidence. Across all **1,064 cards / 166 vendor-attributed fields** per client, missing field-linked vendor URLs fall from **14 to 0 on Web** (the reported TokenDance set) and **37 to 0 on Mini** (the broader single-source limitation). Web tests open every actual React evidence dialog and inspect `<a href>`; Mini tests inspect compiled `specSources`, WXML bindings and every copy-dialog/clipboard callback. Verified links, primary order, deduplication, icons, raw provenance and names are preserved.
- **Item 2 — registry acceptance:** restored the exact main `missingProviders` expression in Mini TS and rebuilt JS. Both phase-2 tests now supply the frozen main OpenRouter provider solely to satisfy the existing contract; their original **1,061 Core card comparisons** remain unchanged. A positive complete-catalog control and five independent negative cases require the exact main error even when `unavailableProviders` explains the missing provider.
- **Item 3 — ledger stability:** `diffSha256` now hashes length-delimited old/new file contents, with no diff headers or abbreviated object IDs. Regenerated Markdown/JSON and the frozen inventory. Both `GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.abbrev GIT_CONFIG_VALUE_0=7` and `...=12` pass `node scripts/report-changed-tests.mjs --check`; the script suite exercises both settings. History-free inventory/content/tamper checks remain active. The ledger records the expanded source-row expectations, three exact additional vendor-notice identities, and contract-valid phase-2 fixtures; no execution or picker-name expectation was weakened.
- **Item 5 — machine links:** the complete before/after scan found **one visible machine URL on one Web card**, `stability/sd3.5-flash` → `https://api.stability.ai/v2alpha/openapi`; Mini already omitted that secondary link. After filtering, **0 visible API/JSON links on both clients**. Stability keeps its existing human API-reference page. OpenAPI/Swagger, JSON/YAML suffixes, machine API hosts/routes, MIME types and redirects are covered by concrete tests; human fal and documentation `/api` pages remain valid. Existing explicit model-list endpoint detection is retained. See [all before/after links](model-card-api-links-r23.md).
- **Item 6 — compressed oracle:** replaced the **13,538,408-byte** JSON with [`execution-capability-8c456709.json.gz`](../test-support/fixtures/execution-capability-8c456709.json.gz), **578,207 bytes**, saving **12,960,201 bytes**. Node `gzipSync(..., {level: 9})` has mtime 0 and no filename header. The shared loader uses `gunzipSync`; all four execution locks still compare every model and decision against the same frozen values. Full-history `--check` regenerates main and compares decompressed bytes; unavailable history skips cleanly and committed-fixture tests continue. The other fixtures are at most 410,091 bytes and have existing readers; none required another compression migration.

Validation (final counts are also recorded in `model-modality-r23-validation.json`):

| Check | Result |
| --- | --- |
| Web full suite: `cd apps/web && NODE_OPTIONS=--no-experimental-webstorage node --import tsx --import ./tests/dom-setup.mjs --test --test-concurrency=2` | **1,479/1,479** |
| Web `npm run build` | Pass |
| Mini `npm test` and `npm run build` | 168/168; build passes |
| Mini source / runtime / media bytes | **1,569,099 / 1,143,762 / 189,978**; source limit **1,572,864**, 3,765 bytes remaining; older 1,569,427-byte guard also passes |
| `node --test scripts/*.test.mjs` | 56/56 |
| `node --test packages/api/src/*.test.js` | 33/33 |
| Core execution, R22B projection and phase-2 tests | 4/4 |
| Gateway execution and phase-2 tests | 2/2 |
| All four execution-capability-r22 tests and picker-name lock | All 1,064 models and names match frozen main |
| Ten requested `--check` scripts | Pass: sync-model-catalog, generate-model-audit, report-model-modality-r21, report-model-modality-phase2, sync-card-display, report-model-modality-r22b, report-changed-tests, freeze-execution-capability, check-docker-bundles, freeze-audit-sources |
| Ledger with core.abbrev 7 and 12 | Both pass, via environment injection only |
| Git whitespace/error check | Pass |

Mini retains readable TS; only the generated picker and its audit helper are compacted after tsc, preserving both existing package ceilings. The R22B current report was regenerated for its additional source rows and Mini rule; historical evidence and R21/phase-2 reports remain intact.

The flow checked is model card → evidence dialog → vendor source link or copy action. Browser plugin is unavailable; the local browser-test server fails with `listen EPERM: operation not permitted 127.0.0.1:5183`. Browser screenshots/native WeChat rendering therefore remain unverified. DOM and compiled Mini interaction checks pass. No Core/Gateway test in the targeted run has a localhost EPERM failure; broader previously documented socket-suite failures were outside this run. An initial Core command at repository root could not resolve package-local `tsx`; the corrected command runs from `apps/paperbanana-api` and passes. Early regression failures (single-source assumptions and incomplete phase-2 registries) are fixed and listed in the ledger.

Repository file-byte totals: **546,786,785 before → 533,872,981 after**, a **12,913,804-byte reduction**, including all seven new intended files without staging. Existing tracked paths alone total **533,279,693 bytes** after the deletion; the new intended files add **593,288 bytes**. Method: sum file sizes from `git ls-files -z`, omit deleted paths, and add `git ls-files --others --exclude-standard -z`; exclude `.git`, dependencies and ignored build outputs.


## R23 Phase F

PM re-review of PR #251, item 4, resumed from `1dcd8b13` and the uncommitted title/hint edits. Frozen main remains `8c456709`. Work stayed in this checkout, offline, with no Git write commands, network, secrets, paid calls, deployment or image builds. `sync-agent-knowledge` and `sync-workflow` are untouched.

Source-link titles now use the unchanged curated card/picker name for the model's own page, captured human titles for general pages, then readable path subjects. Numeric separators and release codes survive, including 3.5, 3.8, 4.1, v2.6, 2507 and 0813. The Stability legacy `35` and BFL `flux11` spellings receive their explicit dotted subjects. fal API pages retain the model subject and append `API 文档`. Human format/language qualifiers distinguish colliding labels without appending raw hosts or paths. Role prefixes, ordered URL lists and canonical URL deduplication remain unchanged. Saved-ID resolution uses the resolved model's name for titles, retaining the existing full-object equality assertion and the separate main picker-name lock.

The [complete source-title scan](model-card-source-titles-r23.md) lists every changed card, URL, before title and after title, plus each retained curated spelling, release code or opaque document identifier with its justification. The before inventory is frozen in `test-support/fixtures/source-titles-1dcd8b13.json.gz`; a digest check and all 1,064 identities/names per client run without Git history.

| Surface | Cards | Scanned source rows | Changed titles | Changed cards | Unresolved heuristic findings |
| --- | ---: | ---: | ---: | ---: | ---: |
| Web card links, tooltips and evidence dialogs | 1,064 | 2,494 | 2,193 | 1,031 | 0 |
| Compiled Mini rows and copy dialogs | 1,064 | 1,103 | 969 | 962 | 0 |
| Web lifecycle dialogs | 7 | 7 | 3 | 3 | 0 |

Tests open every Web evidence dialog and scheduled lifecycle dialog, compare actual anchors and full tooltip labels, and invoke all 1,103 Mini copy dialogs and clipboard callbacks. Scans reject collapsed/split versions, raw hosts/paths, API-only prefixes, mismatched curated case/punctuation, leftover slug separators, truncation and repeated words/phrases. Negative controls exercise these defects. Exact curated spellings and documented date codes are deliberately retained. All Mini row titles also match the shared helper.

Exactly seven historical TokenDance IDs now show **渠道页无此型号（核实日期 2026-11-09）** for unknown modalities: `deepseek-v4-flash-vision-exp`, `deepseek-v4-flash`, `deepseek-v3.2`, `deepseek-chat-v3-0324`, `qwen3.6-max-preview`, `qwen3-30b-a3b-instruct-2507`, and `qwen3-max`. Tests cover Web tooltips/evidence dialogs and Mini icon-tap dialogs, while the other 67 TokenDance cards and existing nonhistorical unknown-hint controls retain their wording and states. No execution capabilities, model IDs/names, actions, environment variables, provider routing, modality decisions, provenance, source destinations or evidence captures change.

The resumed **1,575,037-byte** Mini source is reduced to **1,568,946 bytes**, saving **6,091 bytes** and leaving **3,918 bytes** below the unchanged **1,572,864-byte** ceiling. It is also **153 bytes smaller than HEAD** (1,569,099) and **481 bytes below the older 1,569,427-byte guard**. Runtime source is **1,143,434 bytes**; media stays **189,978 bytes**. Both guards pass unchanged.

The size reduction is confined to this PR's generated display data/helper compaction: `sync-card-display.mjs` compiles captured-title lookup entries against referenced card inputs, and Mini against its complete source projection, including vendor/field links. Capture-only authentication/protocol page titles remain in the original evidence files. Existing picker/audit-helper esbuild compaction now also minifies local identifiers, with CommonJS scope compaction for the audit helper; `card-presentation.js` remains generated and fully compacted. Readable TypeScript is retained, no feature is removed, and all 1,064 Mini cards, execution locks and copy interactions pass. No pre-existing main code path or package budget was altered to achieve the reduction.

The changed-test ledger adds **14 reviewed assertion blocks across 10 test files** for curated subjects, readable versions and the historical hint. Branch-added Mini R22B/R22C expectations use `1dcd8b13` as their follow-up comparison base. Original URL/role/value/layout assertions remain; the saved-ID/full-object equality test was fixed in production code and is unchanged. The content-based ledger, frozen inventory and history-free tamper checks remain intact; there are **0 flagged** expectations. The current R22B source-label report was regenerated; earlier evidence and R21/phase-2 reports are unchanged.

Validation (machine-readable commands and counts: [Phase F validation](model-modality-r23f-validation.json)):

| Check | Result |
| --- | --- |
| Web full suite, requested command and concurrency | **1,482/1,482** |
| Mini `npm test` | 171/171 |
| `node --test scripts/*.test.mjs` | 58/58 |
| `node --test packages/api/src/*.test.js` | 33/33 |
| Targeted Core execution, R22B projection and phase-2 tests | 4/4 |
| Targeted Gateway execution and phase-2 tests | 2/2 |
| Web and Mini builds | Pass |
| Four execution locks; main picker-name lock | All 1,064 models/names preserved |
| Ten requested maintenance `--check` commands | All pass |
| New source-title inventory `--check` | Pass |
| Ledger, including core.abbrev 7 and 12 | Pass via existing script-suite checks |
| Git whitespace/error check | Pass |

The final scan also reruns after strengthening the host/duplicate-phrase negative controls. Earlier initial-run failures were the obsolete source-label/historical-hint expectations, the saved-ID title-resolution mismatch fixed above, and a new DOM test comparing encoded `href` properties to literal Unicode URLs (corrected to the actual `href` attribute). All changed expectations are recorded in the ledger. Browser screenshots and native WeChat rendering remain unverified from the earlier environment boundary; this phase validates DOM and compiled Mini interactions, with no new browser/native or production claim. Mini deployment remains paused.


## R23 Phase F3

Item 4 follow-up from committed Phase F `fd29cf36`; the complete title inventory still compares against pre-F `1dcd8b13`, with frozen main `8c456709` retained for names and execution. Work stayed offline in this checkout. No Git write commands, network requests, secrets, paid calls, deployment, image builds or other-worktree changes; `sync-agent-knowledge` and `sync-workflow` remain untouched.

The shared title generator now indexes catalog IDs and display-name prefixes after separator normalization. Exact card matches retain their curated display name; shared family pages and general/quickstart pages recover known punctuation across providers, while keeping surrounding page words. Known dotted spellings outrank slug spellings. Parameter and release hyphens remain valid, including `Qwen3.8-27B`, `Qwen3-8B` and `DeepSeek-R1-0528`. Short IDs cannot rename an unrelated family, and BFL bracketed subjects retain complete brackets and `FLUX.1.1` punctuation without copying Markdown escapes from other catalog labels. Package-local generated name data keeps the Core Docker layout independent of Web; Mini reads its already-shipped registry instead of adding another catalog copy.

The requested cases now read **Qwen3.6 Max, Qwen3.8 Max, Qwen3.7 Plus, Qwen3.6 Plus, Qwen3.5 Omni Flash / Plus, Kimi K2.6 Quickstart, Kimi K2.7 Code Quickstart, Kimi K3.1 Pro Quickstart, Recraft V4.1 and DeepSeek V4.1 Flash**. **Stable Diffusion 3.5** is explicitly verified on the actual Web `stability/sd3.5-flash` source row and against all four `sd3.5-*` models in the Mini helper. Mini still exposes their original generic API-reference link, whose subject remains `API 文档`. The committed BFL picker name is `FLUX-2-klein-4b`; its own-page title stays exact. A shared/Mini regression also supplies `FLUX.2 [klein] 4B` and requires that exact curated spelling. Two Web source rows and one Mini row for Replicate's unchanged picker label `qwen3-7-plus` now use the known dotted title `Qwen3.7 Plus`.

The independent scan reads all catalog IDs/names plus the current card ID/name and rejects letter/version tokens such as `Qwen3-8`, `K2-7` and `V4-1` when the dotted counterpart is known. Exact curated names no longer exempt this defect. Negative controls use unrelated cards, and a separate custom-ID control proves that the current ID participates. Genuine known hyphens and parameter tokens such as `31B` are distinguished from lost/split versions. Both clients run **19 additional title cases**, retain every Phase F assertion, and still exercise the rendered Web evidence/notice dialogs and compiled Mini copy callbacks.

| Surface | Cards | Source rows | Changed titles vs 1dcd8b13 | Changed cards | Findings |
| --- | ---: | ---: | ---: | ---: | ---: |
| Web | 1,064 | 2,494 | 2,198 | 1,031 | 0 |
| Mini | 1,064 | 1,103 | 973 | 966 | 0 |
| Web lifecycle dialogs | 7 | 7 | 3 | 3 | 0 |

The [regenerated complete before/after list](model-card-source-titles-r23.md#r23-f3-corrections) includes **3,174 changed title instances** against `1dcd8b13` and a short F3 corrections section. Compared with committed Phase F, this follow-up changes **59 Web and 48 Mini title instances**. All 1,064 card identities and picker names per client, ordered URLs, role prefixes, deduplication, historical hints and execution locks remain unchanged. The current R22B source-label inventory is regenerated as well.

Mini source is **1,569,424 / 1,572,864 bytes**, leaving **3,440 bytes**; runtime is **1,144,004 bytes**, media **189,978 bytes**. This is a **478-byte increase** from Phase F. The unchanged older **1,569,427-byte** test also passes, with three bytes remaining. The generated helper uses explicit CommonJS exports and compact declaration whitespace/parameter identifiers; the public types/exports, readable shared implementation and both byte limits are preserved. No feature or evidence was removed to meet the limits.

The [changed-test ledger](model-modality-changed-tests.md) records three F3 follow-up entries against `fd29cf36` for the Web test, Mini test and independent heuristic. Existing expectations are retained; the heuristic's known-name and parameter-token exceptions are explicitly reviewed. Content hashes, frozen inventory, history-independent execution fixtures and `core.abbrev` 7/12 checks remain intact, with **0 flagged** expectations.

Validation results are recorded in [the F3 validation JSON](model-modality-r23f3-validation.json). Browser screenshots and native WeChat rendering remain outside this offline DOM/compiled-client validation; Mini deployment remains paused.

| Final validation | Result |
| --- | --- |
| Web full suite with the requested NODE_OPTIONS/imports/concurrency | **1,483/1,483** |
| Mini `npm test` | **172/172** |
| `node --test scripts/*.test.mjs` | **58/58** |
| `node --test packages/api/src/*.test.js` | **33/33** |
| Targeted Core execution/projection/phase-2 tests | **4/4** |
| Targeted Gateway execution/phase-2 tests | **2/2** |
| Web / Mini `npm run build` | Both pass |
| Mini package and older R15 size guards | Both pass unchanged |
| All ten TASK_F maintenance scripts plus `report-source-titles-r23 --check` | **11/11 pass** |
| Changed-test ledger, including `core.abbrev` 7/12 | Pass |
| Git whitespace/error check | Pass |

The initial full suites passed before final manual review found BFL bracket-prefix artifacts. Those were fixed and covered, then both builds and every requested suite/check were rerun on the final implementation. Earlier targeted failures for the unknown `v2.6` suffix and the older Mini byte ceiling were resolved in code/generated compaction; no existing expectation or limit was loosened.


## R23 Phase H (verification)

Verified `7cb520a9` on `codex/model-modality-audit` against main `8c456709` and pre-fix `42ee9ffd`. **Items 1–7 PASS.** The [verification report](model-modality-r23-verification.md) and [JSON](model-modality-r23-verification.json) contain exact test files/names, command excerpts, complete distinct title pairs and API URL visibility counts.

- Vendor evidence: all 1,064 cards per client; 65 cards / 166 vendor-attributed fields; zero missing vendor URLs or duplicate URLs/labels. Web added 16 vendor-link rows across 14 cards; Mini added 39 across 37. Verified TokenDance pages remain first. Mini retains its source copy-dialog interaction.
- Registry and hashes: Mini required-provider rejection block is byte-identical to main; all five missing-channel cases reject even with an explanation. The historical partial-catalog relaxation and its user-visible effect are documented. Ledger checks pass with core.abbrev 7 and 12, including Git subprocesses.
- Titles: 2,494 Web rows, seven lifecycle dialogs and 1,103 Mini copy dialogs have zero findings; all 1,064 names per client match main; exactly seven historical TokenDance IDs show 渠道页无此型号. The compact title inventory has 1,047 distinct before/after pairs against 42ee9ffd.
- API links: 408 distinct candidates in raw card evidence and sources; all 254 machine URLs hidden, zero visible machine links. All 154 human candidates remain visible on at least one client, including 96 distinct /api/ path pages.
- Fixture: 578,207 bytes; original JSON absent; gzip mtime 0 and deterministic recompression; main regeneration and all four execution locks pass. Git blob sizes are 13,538,408 before versus 578,207 now, a 12,960,201-byte reduction. Historical Git objects are not removed.
- Item 7: all 15 image-input decision rows match recomputed main and HEAD, including supported → unknown image input and retained direct-edit capability. No fetch or founder decision.
- Validation: Web 1,483/1,483; Mini 172/172; scripts 58/58; API 33/33; targeted Core 4/4 and Gateway 2/2; six audit-only assertions, for 1,758 passes with zero failures/skips within those suites. Web, Mini and Core builds and all 11 maintenance checks pass. Mini source 1,569,424 / 1,572,864 bytes (3,440 remaining); runtime 1,144,004, media 189,978.
- Screenshots: `.audit-input/r23/shots-m3.mjs` plus its manifest plan 30 images (1280/390), covering qwen3.6-plus and 14 other cards across eight channels. Exact local fixture server commands are included. Syntax and all selected cards pass offline verification. The script was **not run**, and no screenshot is claimed.

No verification-proven product defect required a fix. Existing tests and the changed-test ledger remain unchanged; new audit-only assertions verify historical comparisons and screenshot selection. Core/Gateway full suites are explicitly skipped for the operator because they need localhost. Browser/native WeChat validation remains outstanding, and Mini deployment stays paused. No Git write commands, network, secrets, paid calls, deployments, image builds or other-worktree changes. `sync-agent-knowledge` and `sync-workflow` remain untouched.


**R23 Phase H2 — stale Core/Gateway expectations corrected (HEAD `c75aa00f`, not deployed).** The operator logs exposed two channel-only assertions left behind by item 1. The extra DeepSeek pricing URL and Aliyun model-table URL are exactly the `maxOutputTokens` vendor sources labelled `源自原厂` on `deepseek-v4.1-flash` and `qwen3.6-plus`, respectively; neither is a portal API/JSON link or duplicate. Both tests now derive expected appended URLs from vendor fields and assert channel-first order, deduplication, machine-link exclusion and `原厂规格` row labels, with explicit DeepSeek examples. Two follow-up reviews and frozen hashes are recorded in `docs/model-modality-changed-tests.{md,json}` and `test-support/fixtures/changed-tests-inventory.json`; comparison base `fd29cf36` has byte-identical pre-edit test files to operator HEAD. Validation: Core R21 **3/3**, Gateway R21 **3/3**, all **four execution locks**, selected Web **109/109** across 16 files (including its lock), ledger regressions **2/2**, all **19 applicable maintenance checks**, and ledger `core.abbrev=7` / `12` — all pass, zero skips. Checks include the 11 Phase H checks plus offline page captures, reference-upload, thinking, version reports, frozen R10/R11/R12 reports and R12 fixture verification; `sync-agent-knowledge` / `sync-workflow` remain untouched and independent-repository distribution checks are out of scope. [Verification details](model-modality-r23-verification.md); local command/log inventory `.audit-input/r23/h2/validation.json`. Product code and execution behavior are unchanged; no Git writes, network, secrets, paid calls, deployment, image builds or other-worktree changes.


## R24 Phase I1

PM third review of PR #251, starting at `4e18513c` on `codex/model-modality-audit`, with main baseline `8c456709`. Items **2, 3a, 5 and 6** are implemented. No Git write commands were used.

- **Item 2:** added an accurate adjacent `card-presentation.d.mts` covering every export; `AuditFact` includes optional plural source URLs, and the Core test narrows nullable URLs with a string predicate. Core `tsc --noEmit` has zero errors. Core/benchmark Docker layouts already COPY the entire API source directory; the offline bundle check now explicitly verifies declaration bytes in each copied layout. Core, Mini, benchmark-worker and benchmark-core typechecks pass; Gateway and tuyan-knowledge syntax-check scripts pass. Web has no check/typecheck script or tsconfig; its production build passes.
- **Item 3a:** secondary vendor links retain specific page roles. The three reported cards now show **下线公告 · 百炼 · 模型下线公告** for the Alibaba notice URL in Web dialogs and Mini copy dialogs. All 1,064 cards per client are scanned, covering **51 Web / 19 Mini retirement rows**, with no wrong retirement labels. Non-generic role labels are preserved. Ordered source URLs, vendor attribution and picker names are unchanged. The title report's baseline guard permits only the three reviewed card/URL role corrections per client.
- **Item 5:** the shared historical-ID set derives from the audited TokenDance page map (`verified:false`), replacing the hardcoded pipe-delimited IDs. Mini derives the same status from already-shipped catalog identities and primary audit URLs; the generator compares every one of the 74 statuses to captured evidence and fails on a mismatch. Both clients show **渠道页无此型号** for exactly the seven historical IDs. A synthetic eighth historical fixture receives the same hint, a synthetic verified page does not, and all unknown states remain unknown.
- **Item 6:** R9's expected source row no longer calls the production formatter. It compares each of 297 channel-backed cards to committed literal URL/label objects, with complete fixture coverage. R10 requires the literal **官方文档 · 百炼 · Kimi K3 (Bailian hosted)** for both minimal and live objects. Existing URL, modality, provenance and date assertions remain intact.

Changed pre-existing expectations in seven test files are recorded in [the Markdown ledger](model-modality-changed-tests.md), [JSON ledger](model-modality-changed-tests.json) and frozen inventory, including the older generic-vendor-label assertions corrected for this review. The new retirement/historical tests use fixed fixtures. The initial full suites found only those obsolete label assertions; they were updated to exact retirement URL/label expectations, with all URL/provenance checks retained. No byte ceiling or execution assertion was weakened.

Mini source is **1,569,424 bytes**, unchanged from the starting checkout, with **3,440 bytes** below the user limit **1,572,864**. The older **1,569,427** assertion also remains unchanged and passes. To offset the helper/type additions, generated TokenDance quote subjects reference the existing catalog IDs by index and decode to the same strings; no evidence wording, dates, exports, features or model identities were removed.

### pending real-browser verification

The selected vendor fact for `tokendance/qwen3.5-plus` still stores **65536**, provenance **vendor**, and URL [model-depreciation](https://help.aliyun.com/zh/model-studio/model-depreciation). Its current HTTP 200 article is titled **“模型下线机制说明”** and contains no qwen3.5-plus or 65536 passage. It cannot substantiate this maximum-output value in the captured response.

The archived R6A integer review instead cites [qwen3-5-plus](https://help.aliyun.com/zh/model-studio/qwen3-5-plus). The fresh HTTP 200 HTML contains the heading **“qwen3.5-plus”** and exact table passage **“最大输出长度65536”**, including the normal/thinking sections for the base model and two snapshots. The selected fact URL has not been silently changed. Full trace through channel input, canonical/vendor records, provider-model-details (no matching entry), curated C0178 card specifications, and the resolved card is in [.audit-input/r24/qwen35plus-evidence.md](../.audit-input/r24/qwen35plus-evidence.md) and its fact-chain JSON.

The eight public unauthenticated curl GETs include both direct attribution pages, the two curated vendor table URLs, the TokenDance model page, its advertised llms.txt index/full Markdown, and a guessed per-model Markdown URL (404). Every response has requested/final URL, HTTP status, UTC/Asia-Shanghai fetch times, raw-body SHA-256 and exact relevant excerpts. The TokenDance model HTML is a JS shell. Its full public Markdown mentions Qwen3.5 Plus retirement; its sole 65536 example belongs to DeepSeek, not Qwen. No gateway/portal/catalog API endpoint was fetched.

A real browser must still inspect the rendered TokenDance page and both direct vendor pages, capture dated screenshots, and reconcile the selected retirement-source URL with the R6A integer source. No browser/native rendering or account/model-quality result is claimed. The numeric value, all four execution locks, all 1,064 picker names and the founder's 15-model image-input decision remain unchanged. No secrets, inference/paid calls, deployment, Docker/image builds, other-worktree changes, or reads from `~/.codex`; `sync-agent-knowledge` and `sync-workflow` remain untouched.

### R24 Phase I1 validation

All final runs pass. [Machine-readable commands, exits, log hashes and initial/final attempts](model-modality-r24-validation.json) preserve the evidence; raw logs are in `.audit-input/r24/verification-logs/`.

| Check | Final result |
| --- | --- |
| Full Web suite, requested NODE_OPTIONS/imports/concurrency | **1,485/1,485** |
| Mini npm test | **173/173** |
| scripts/*.test.mjs | **58/58** |
| packages/api/src/*.test.js | **33/33** |
| Targeted Core R21, execution lock, card projection and phase 2 | **7/7** |
| Targeted Gateway R21, execution lock and phase 2 | **5/5** |
| Main picker-name and 15-model decision invariants | **2/2** |
| Web / Mini / Core builds | **3/3** |
| Workspaces with check/typecheck scripts | **6/6**; Core/Mini/benchmark-worker/benchmark-core TypeScript and Gateway/tuyan-knowledge syntax checks |
| Requested maintenance --check scripts | **11/11** |
| Changed-test ledger | Green; 0 flagged |
| Mini bytes / user limit | **1,569,424 / 1,572,864**; 3,440 remaining |

This is **1,761 suite tests plus two invariant tests**, with zero final failures or skips in those runs. The four execution locks remain equal to main; the founder decision Markdown/JSON are byte-identical to the starting checkout. The 11 maintenance checks are sync-model-catalog, generate-model-audit, report-model-modality-r21, report-model-modality-phase2, sync-card-display, report-model-modality-r22b, report-changed-tests, freeze-execution-capability, check-docker-bundles, freeze-audit-sources and report-source-titles-r23. The Docker check only simulates COPY layouts and runs local esbuild; no Docker process or image build was performed.

## R24 Phase I2

Starting HEAD: `cd72eace3d35088a7509d9bf55bc444a50c00396` on `codex/model-modality-audit`. Items 1, 3b, 3c and 4 are display-only changes. The 15-model image-input decision, qwen3.5-plus 65,536, every picker name and execution fields remain unchanged. No Git write commands, network requests, secrets, inference/paid requests, deployment, Docker/image builds or other-worktree changes were used.

### Item 1 — identifiable source links

Web evidence and lifecycle dialog anchors reuse the model-card footer's `var(--accent, #267f68)` and the same 13px Lucide `ExternalLink` component. Underlines, hover, keyboard focus and wrapping remain visible for long labels. The new DOM/CSS test opens all 1,064 evidence dialogs plus seven lifecycle dialogs, checks the class/icon hooks, and compares computed colour with the footer (jsdom retains the identical `var()` expression where custom properties are unresolved).

Mini source buttons in the model-picker dialog retain the existing green `model-copy` class and add a small `复制链接` hint with wrapping. The native copy confirmation uses that same existing green for its action. Tests check the WXML/WXSS hooks, invoke every copy confirmation and confirm each clipboard URL. Native WeChat rendering has not been visually verified; Mini deployment remains paused.

### Items 3b / 3c — corrected titles and independent strict scan

Every source row now has `role · site · page`. Captured titles lose site suffixes; opaque Qianfan IDs use a readable model-list fallback; DeepSeek news IDs become dated update-log titles unless a captured release name exists. Picker labels remain untouched. All ordered URLs and roles are checked against a frozen starting-HEAD fixture, and label deduplication remains enforced.

| Surface | Cards/dialogs | Source rows | Changed titles | Strict title findings before → after |
| --- | ---: | ---: | ---: | ---: |
| Web cards/evidence dialogs | 1,064 | 2,494 | 365 | 523 → 0 |
| Mini cards/copy dialogs | 1,064 | 1,103 | 239 | 341 → 0 |
| Web lifecycle dialogs | 7 | 7 | 0 | 0 → 0 |

The strict rule rejects missing role/site/page segments, opaque letter/digit IDs, captured site suffixes, news/anchor fragments, lowercase and kebab/snake slugs, raw hostnames/API paths, leftover separators, repeated page brands, and damaged dotted versions. Brand/version tokens, parameter tokens, genuine model/date hyphens and documented API abbreviations such as `Txt2img` are distinguished from random IDs. Negative tests exercise each defect class. The old R23 scan accepted raw captured titles and explicitly exempted opaque IDs/curated slugs; its earlier “0 bad titles” claim was wrong and is withdrawn in the linked R23 report.

The full **604 source-title changes**, exact rule, per-rule counts and complete dialog/tooltip changes are in [R24 Markdown](model-card-source-titles-r24.md) and [R24 JSON](model-card-source-titles-r24.json). The baseline gzip has SHA-256 `40cd35c47a9f8d8c30423b8620c969471c44667a927f807fa72b1625c915d721`, pinned by a test. Both the report and actual client-dialog tests cover all 1,064 cards per client.

### Item 4 — consistent public copy

Unknown modalities keep their available field attribution instead of following it with 暂无官方资料; absent attribution still shows 暂无官方资料. Modality states and evidence values are unchanged. Conflict copy is now `渠道资料与此前记录不一致，已保留确认过的模态；未确认的项显示为未知。` The explicit-exclusion variant says `渠道资料与此前记录不一致，以渠道明确说明的模态范围为准。` Identical dialog lines are emitted once, and dated catalog attribution replaces its undated duplicate.

Web findings: source/no-source contradictions **728 → 0**, internal wording **102 → 0**, duplicate lines **1,028 → 0**. Mini findings remain **0 → 0** for each category. Checks inspect actual rendered details, all modality tooltips, every compiled Mini icon/copy dialog and notice copy; they distinguish separate input/output fields.

### Mini budget, review ledger and screenshot recipe

Mini source is **1,563,042 / 1,572,864 bytes**, leaving **9,822 bytes**; runtime source is **1,137,435 bytes**. This saves **6,382 bytes** against I1. Captured-title trimming and existing esbuild compaction of generated catalog decoding/presentation helpers preserve readable TS, exports and data. The build compiles into a temporary directory, compacts before checking the complete source size, and writes shrinking outputs first. The display generator also preflights all Mini writes. Both the original budget test and the stricter **1,569,427-byte** historical assertion remain unchanged.

The changed-test ledger records the two vendor-tooltip expectations, the source-only R23 normalization rule, two DeepSeek release-title literals, the staged build command, and all **84 changed literals out of 297** in the R9 fixture. R9 still compares to fixed literal objects. No self-derived assertions were introduced. The regenerated R22B report changes only three source labels.

`.audit-input/r24/shots-m4.mjs` and its manifest were prepared and syntax/identity checked **without execution**. They specify four shots at widths **1280/390**: `desktop|mobile-51-source-dialog-qwen3.6-plus-m4.png` and `desktop|mobile-52-source-dialog-qianfan-deepseek-v3.2-think-m4.png`. The Qianfan card previously showed `Klqx7b1i5`. Both channel/developer selectors use `^Label(\s*\d+)?$`, and the open-dialog recipe checks link icons and source visibility. Browser/native visual acceptance remains an operator task.

Final validation commands, exit codes, timestamps and log paths are recorded in [R24 I2 validation](model-modality-r24-i2-validation.json).

### Final I2 validation

| Check | Result |
| --- | --- |
| Web full suite, `NODE_OPTIONS=--no-experimental-webstorage` | **1,487/1,487** |
| Mini full suite | **175/175** |
| `node --test scripts/*.test.mjs` | **64/64**, including the staged-build oversize refusal test |
| `node --test packages/api/src/*.test.js` | **33/33** |
| Targeted Core / Gateway suites | **7/7**, **5/5**, including all four execution locks |
| Offline invariants (names, 15-model decision, source coverage, archive, prior recipe) | **6/6** |
| Web / Mini / Core builds | **3/3** |
| Workspace check scripts | **6/6** |
| Explicit Core `npx tsc --noEmit` | **0 errors** |
| Maintenance `--check` commands | **12/12**, the 11 I1 commands plus `report-source-titles-r24` |
| Changed-test ledger | **0 flagged**, current content hashes and frozen inventory pass |

Total: **1,777 tests**, zero failures/skips. The staged-build regression injects oversized compiler output only into a temporary directory, verifies the exact **1,572,875-byte** rejection message, and proves that the original source file remains byte-identical with no new source files. The actual Mini package stays at **1,563,042 bytes**. All three builds were completed before final acceptance suites. The final working HEAD remains `cd72eace3d35088a7509d9bf55bc444a50c00396`; no commit, checkout, reset, staging or push was performed.


## R24 Phase I3

Starting HEAD: `9a7128d613c339a999dad1e7dad50affe1ea230d` (I2 committed). The operator's Chrome check showed the later `.tw-shell a, .tw-dialog a` reset beating I2's equal-specificity source selectors. Dialog links now use `.tw-dialog.model-evidence-dialog a.model-evidence-source` (specificity 0,3,1); card-bottom links use `.model-card-specifications .model-spec-sources a` (0,2,1). Both outrank the reset (0,1,1) independently of load order. Dialog underlines, hover/focus-visible outlines, wrapping and Lucide external icons are retained with the existing `var(--accent, #267f68)` token. No `!important` is added.

The new Web test parses `styles.css` imports in place, followed by the CSS imports of the lazy `WorkspaceRoot.jsx`, including `workspace.css`. Its independent cascade oracle computes selector specificity (including :is/:not/:has/:where), declaration order and source order. It demonstrates the old equal-specificity failure, then checks both clients' link rules with the actual reset and reversed order. Mini's existing `.model-panel .model-copy` already outranks applicable app WXSS, and its hint inherits the button accent; a new test checks both WXSS orders. No Mini WXSS change was needed. This is offline cascade/DOM verification, not new Chrome screenshots or native WeChat acceptance.

I2's title heuristic explicitly stripped its generated 文档/Markdown/counter suffixes before scanning, so its zero claim missed those defects. I3 rejects counter-only and format-only qualifiers (including arbitrary numbered descriptions), raw Markdown/MDX/llms links, and all previously rejected slug/site/version cases. Actual model aliases and date codes are allowed only when independently present in the card name/ID. Meaningful path sections, API interface versions, languages and console/product entry points distinguish collisions; no numeric counter fallback remains.

Three public documentation GET captures resolve missing page subjects. `qianfan-docs/s/Jm8r1826a` is **价格**, labelled **AI 应用开发入门：价格**. The WENXINWORKSHOP URL redirects to the platform index, labelled **千帆 ModelBuilder 旧版入口（平台首页）**. Volcengine `82379/1330310` redirects to `ark/model-list?lang=zh`, labelled **模型列表**. [Capture metadata](../config/channel-audit/source-titles-r24-i3.json) records original/final URLs, UTC time, response status, body hash and captured title (the Volcengine HTML title is empty, so its final path supplies the subject). These are display-title captures; they do not update model capabilities or token values. There were also three Web-tool opens of the same public pages, two unavailable; no authenticated or model-service request was made.

The human URL projection uses 42 literal OpenAI Markdown/HTML pairs across 44 cards on each client. Web removes 43 duplicate Markdown rows and one raw MiniMax Markdown row, while one OpenAI primary gains its HTML counterpart without duplicate removal. Mini retains all 1,103 source rows through the 44 HTML replacements. GitHub/Hugging Face blob Markdown URLs are already HTML readers and remain visible. Raw evidence stays intact. The two Together HTML rows inherit their merged primary **原厂规格** role; specific retirement roles stay unchanged.

| Check | Web | Mini |
| --- | ---: | ---: |
| Cards scanned | 1,064 | 1,064 |
| Source rows before → after | 2,494 → 2,450 | 1,103 → 1,103 |
| Strict title/link findings before → after | 318 → 0 | 44 → 0 |
| Changed row instances | 310 | 77 |
| Vendor-attributed cards / fields | 65 / 166 | 65 / 166 |
| Missing vendor links | 0 | 0 |
| Duplicate URL/label findings | 0 | 0 |
| Dialog/tooltip copy findings | 0 | 0 |

Seven Web lifecycle dialogs also pass. The [full I3 before/after inventory](model-card-source-titles-r24.md#r24-phase-i3) and [JSON I3 section](model-card-source-titles-r24.json) preserve the I2 report verbatim and append the new starting-HEAD comparison. All 297 independent R9 literal expectations remain, with 44 updated source objects; the [changed-expectation ledger](model-modality-changed-tests.md) records the new HTML projection, stronger CSS hooks and scanner rule. The old local Phase H audit harness remains unchanged; the I3 copy adapts only raw-link matching to the literal HTML mapping and keeps all six assertions, including all 15 screenshot-card identities (screenshots are not run).

Mini source is **1,564,737 bytes**, **8,127 below 1,572,864** and **4,690 below the existing 1,569,427-byte guard**. The source grew 1,695 bytes from I2; staged build/preflight guards remain intact. All 1,064 picker names per client and all four execution locks match the reviewed main baseline `8c456709`; the qwen3.5-plus **65,536** value and all **15** image-input decisions remain untouched.

Final validation: **1,783 tests, 0 failures** — Web **1,489/1,489** with `NODE_OPTIONS=--no-experimental-webstorage`; Mini **176/176**; scripts **67/67**; packages/api **33/33**; targeted Core **7/7**; Gateway **5/5**; local I3 audit **6/6**. Web, Mini and Core builds pass. All **six workspace checks** and the explicit Core `npx tsc --noEmit` pass with **0 errors**. All **12 maintenance checks** pass, including generated-source drift, Docker COPY-layout resolution (no image build), frozen evidence/execution locks, changed-test ledger, modality reports and both title reports.

Validation results are recorded in [the I3 command log](model-modality-r24-i3-validation.json). No Git write commands, secret reads, paid/inference calls, deployment, Docker/image builds or other-worktree changes were performed. `sync-agent-knowledge` and `sync-workflow` are unchanged; Mini deployment remains paused. Operator Chrome/native visual acceptance remains pending.

## R24 Phase I4

Starting HEAD: `f8ff7648bc02a5576b1e2deae323791ecfac54e5`. The operator's **2026-11-10 ~07:05 Asia/Shanghai real-browser verification** resolves I1's pending attribution question. [Full browser findings, exact quotes, eight public curl captures and all Task 2 decisions](model-card-qwen35plus-evidence-r24.md#real-browser-verification-2026-11-10) are recorded in the dated [canonical review](../config/channel-audit/review-r24-20261110.json). Four earlier raw captures are also SHA-256 verified and cited.

TokenDance Qwen3.5 Plus keeps **65,536**, now sourced to `https://help.aliyun.com/zh/model-studio/qwen3-5-plus` with **vendor / 原厂规格**, field date **2026-11-10**, and the same visible note in Web/Mini: **沿用百炼同一 API ID 的原厂记录；TokenDance 模型页未标注最大输出**. Its separate retirement citation is `https://tokendance.space/llms-full.txt`, labelled **下线公告 · TokenDance · Qwen3.5 Plus 下线（2027-01-19）**. The generic Bailian retirement page is absent from this card's sources. Only this exact human-readable text document bypasses the machine-document filter. It establishes the retirement fact, never the output limit.

The **1,064-card** scan found **19** retirement/specification citations on **eight** cards. Thirteen Qwen3.5 facts retain their values and receive the exact specification URL; both Qianfan and SiliconFlow Qwen Image Edit cards lose their unsupported context/output N/A claims and now show **未知**, with null values and fallback suppressed. Two MiMo text-input citations remain because the notice explicitly says **mimo-v2.5-pro 仅支持文本输入**. Both clients now have **two quote-supported exceptions and zero unsupported retirement/spec citations**. Three Bailian Plus public retirement anchors are also removed: neither the generic mechanism page nor the empty fetched 118728 article confirms the individual model IDs. Existing execution lifecycle records/cutoffs remain unchanged; display projections suppress unsupported anchors. The original TokenDance card had no audited cutoff date; the new dated citation does not create an execution cutoff.

Shared display projections now carry separate `retirementSources`; reviewed field dates/URLs survive Mini compaction. Core/Gateway source tests verify the same specification and retirement separation. `generate-model-audit`, `sync-model-catalog` and `sync-card-display` regenerate derived data; no generated file is hand-edited. Actual Web badge tests cover unsupported-link suppression even when callers pass the preserved raw lifecycle object. The all-card retirement/spec scan has negative controls for a wrong MiMo value and 65536 on the generic notice. Generation also rejects values not contained in recorded excerpts.

| Acceptance scan | Web | Mini |
| --- | ---: | ---: |
| Cards | 1,064 | 1,064 |
| Source rows | 2,449 | 1,102 |
| Cards with changed source rows | 6 | 6 |
| Supported retirement/spec field citations | 2 | 2 |
| Unsupported retirement/spec field citations | 0 | 0 |
| Strict title/copy findings | 0 | 0 |
| Missing vendor links / duplicate URLs / duplicate labels | 0 / 0 / 0 | 0 / 0 / 0 |

Seven existing lifecycle schedules remain; four have public notice anchors after removing the three unsupported Bailian links. I2/I3 source reports are preserved in a deterministic frozen artifact; [I4 appends the exact starting-HEAD comparison](model-card-source-titles-r24.md#r24-phase-i4), including six independent literal source corrections per client and three removed badge links. Every modified prior test/fixture/helper expectation is recorded in the [ledger](model-modality-changed-tests.md), with the frozen inventory regenerated and `report-changed-tests --check` green. The historical 397 HTTP captures remain unchanged.

Mini source is **1,566,769 / 1,572,864 bytes**, leaving **6,095 bytes**; the unchanged older **1,569,427-byte** guard also passes (2,658 remaining). Starting size was 1,564,737, so this phase adds **2,032 bytes**. Source writes use the existing projected-size/staged-build guards. All four execution locks, all 1,064 picker names and all 15 deferred image-input decisions remain equal to the reviewed main baseline `8c456709` (`origin/main` in this checkout). No Git write commands, secrets, paid/inference requests, deployment, Docker/image builds or other-worktree changes were performed. Network was restricted to eight public unauthenticated HTTPS documentation GETs with curl. `sync-agent-knowledge` and `sync-workflow` remain untouched; Mini deployment stays paused.

Final validation: **1,793 tests, zero failures/skips** — Web **1,492/1,492** with `NODE_OPTIONS=--no-experimental-webstorage`; Mini **178/178**; scripts **70/70**; packages/api **33/33**; targeted Core **8/8**; Gateway **6/6**; local I4 invariants **6/6**. Web, Mini and Core builds pass. All six workspace check scripts, explicit Core `npx tsc --noEmit` (**0 errors**) and all **12 maintenance checks** pass. [Exact commands, timestamps, counts and logs](model-modality-r24-i4-validation.json). The actual client interactions are tested offline (Web DOM and compiled Mini dialogs); the operator's page verification is attributed separately, and native WeChat rendering was not repeated.
