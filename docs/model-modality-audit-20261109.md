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
