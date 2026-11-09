# R23 Phase F / F3 — source title scan

**R24 correction:** the earlier zero-bad-titles claim was incorrect. This older heuristic exempted opaque identifiers and curated slugs, and accepted captured titles with site suffixes. The stricter rule, starting-HEAD findings and complete Phase I2 changes are in [R24 source-title review](model-card-source-titles-r24.md) and its JSON. This report remains the cumulative comparison to pre-F, not the current acceptance scan.

Baseline: `1dcd8b13` (pre-F), frozen in `test-support/fixtures/source-titles-1dcd8b13.json.gz`. The fixture contains every Web/Mini card name, URL and label; tests require all 1,064 identities, names and ordered URL lists per client to remain identical. No network or Git writes.

| Client | Cards | Source rows | Changed titles | Changed cards | Unresolved heuristic findings |
| --- | ---: | ---: | ---: | ---: | ---: |
| web | 1064 | 2494 | 2196 | 1031 | 0 |
| mini | 1064 | 1103 | 974 | 965 | 0 |

Also scanned **7 Web lifecycle dialogs**; **3** changed titles are listed separately below. Web tests open every rendered evidence dialog, check the card link/tooltip, and compare every anchor. Mini tests invoke every copy dialog and clipboard callback. Shared-helper parity is checked on all Mini rows.

Heuristics cover collapsed/split numeric versions, hyphens replacing known dotted versions (letter/version tokens such as Qwen3-8, K2-7 and V4-1), raw hosts/paths, API-prefix subjects, case/punctuation differing from the curated name, leftover slug separators, trailing ellipses and repeated words. The dotted-version oracle independently reads every catalog ID/name, plus the current card ID/name. Genuine parameter/release hyphens such as Qwen3-8B, Qwen3.8-27B and DeepSeek-R1-0528 remain valid. Zero duplicate URLs/labels; source ordering is unchanged. R24 restores 下线公告 on the three explicitly reviewed vendor notice rows per client; every other role prefix remains unchanged.

Title priority: curated card/picker name for its own model page, correcting a known dotted version even if its picker label encodes a slug; captured human page title for a general page; longest separator-normalized catalog name/ID match, including family prefixes and quickstart suffixes; readable path fallback. API documentation uses its model subject plus API 文档. Colliding labels get human format/language qualifiers, never a URL suffix. Mini reuses its existing catalog; package-local shared name data is generated from the same registry. Original captures remain unchanged.

## R23 F3 corrections

Shared/general pages now recover version dots from known model identities across providers, even when the current card is a dated or different model. Surrounding page words remain readable. These regression cases run against both shared Web and compiled Mini helpers:

| Page slug | Corrected subject |
| --- | --- |
| qwen3-6-max | Qwen3.6 Max |
| qwen3-8-max | Qwen3.8 Max |
| qwen3-7-plus | Qwen3.7 Plus |
| qwen3-6-plus | Qwen3.6 Plus |
| qwen3-5-omni-flash | Qwen3.5 Omni Flash |
| qwen3-5-omni-plus | Qwen3.5 Omni Plus |
| kimi-k2-6-quickstart | Kimi K2.6 Quickstart |
| kimi-k2-7-code-quickstart | Kimi K2.7 Code Quickstart |
| kimi-k3-1-pro-quickstart | Kimi K3.1 Pro Quickstart |
| recraft-v4-1 | Recraft V4.1 |
| deepseek-v4-1-flash | DeepSeek V4.1 Flash |
| deepseek-r1-0528 | DeepSeek-R1-0528 |

**Stability confirmed:** `stable diffusion 35` → `Stable Diffusion 3.5`. The actual Web `stability/sd3.5-flash` row at `https://docs.stability.ai/api-reference/generate/stable-diffusion-35` is listed below; Mini tests also exercise that page with all four `sd3.5-*` cards. Mini currently exposes the existing generic API-reference link for those cards, so its generic title remains `API 文档`.

**BFL casing:** the committed picker name is `FLUX-2-klein-4b`, so that own-page title stays exact. A separate shared/Mini regression supplies the curated name `FLUX.2 [klein] 4B` and requires that exact punctuation/casing. All 1,064 picker names remain unchanged. The two Replicate source rows whose picker name is `qwen3-7-plus` now say `Qwen3.7 Plus`; the picker itself remains unchanged.

Historical unknown hints: exactly these seven TokenDance IDs show **渠道页无此型号** with the existing verification date in Web tooltips/dialogs and Mini icon dialogs: `deepseek-v4-flash-vision-exp`, `deepseek-v4-flash`, `deepseek-v3.2`, `deepseek-chat-v3-0324`, `qwen3.6-max-preview`, `qwen3-30b-a3b-instruct-2507`, `qwen3-max`. Other hints and all modality states remain unchanged.

## R24 Phase I1 role corrections

The retirement notice at https://help.aliyun.com/zh/model-studio/model-depreciation retains 下线公告 on tokendance/qwen3.5-plus, qianfan/qwen-image-edit and siliconflow/Qwen/Qwen-Image-Edit in both clients. Vendor provenance and links remain intact. The role guard permits only these three card/URL pairs to differ from the frozen baseline. New R24 tests scan all 1,064 cards per client and require every retirement source to keep its role.

## Every changed title

| Client | Card | URL | Before | After |
| --- | --- | --- | --- | --- |
| web | deepseek/deepseek-flash | https://api-docs.deepseek.com/news/news261017/ | 官方文档 · DeepSeek · news261017 | 官方文档 · DeepSeek · 更新日志 2026-10-17 |
| web | deepseek/deepseek-v4-flash-vision-exp | https://api-docs.deepseek.com/guides/vision/ | 官方文档 · DeepSeek · vision | 官方文档 · DeepSeek · Vision |
| web | deepseek/deepseek-v4-flash-vision-exp | https://api-docs.deepseek.com/news/news261017/ | 官方文档 · DeepSeek · news261017 | 官方文档 · DeepSeek · 更新日志 2026-10-17 |
| web | deepseek/deepseek-v4-pro | https://api-docs.deepseek.com/guides/vision/ | 官方文档 · DeepSeek · vision | 官方文档 · DeepSeek · Vision |
| web | deepseek/deepseek-v4-pro | https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro-0813 | 官方文档 · Hugging Face · DeepSeek V4 Pro 0813 | 官方文档 · Hugging Face · DeepSeek-V4-Pro 0813 |
| web | deepseek/deepseek-v4-flash | https://api-docs.deepseek.com/guides/vision/ | 官方文档 · DeepSeek · vision | 官方文档 · DeepSeek · Vision |
| web | deepseek/deepseek-v4-flash | https://api-docs.deepseek.com/news/news261017/ | 官方文档 · DeepSeek · news261017 | 官方文档 · DeepSeek · 更新日志 2026-10-17 |
| web | kimi/kimi-k3 | https://platform.kimi.com/docs/models | 官方文档 · kimi.com · 模型列表 | 官方文档 · Kimi · 模型列表 |
| web | kimi/kimi-k3 | https://platform.kimi.com/docs/guide/kimi-k3-quickstart | 官方文档 · kimi.com · kimi k3 quickstart | 官方文档 · Kimi · Kimi K3 Quickstart |
| web | kimi/kimi-k3 | https://platform.kimi.com/docs/get-api-key | 官方文档 · kimi.com · get api key | 官方文档 · Kimi · Get API Key |
| web | kimi/kimi-k2.7-code | https://platform.kimi.com/docs/models | 官方文档 · kimi.com · 模型列表 | 官方文档 · Kimi · 模型列表 |
| web | kimi/kimi-k2.7-code | https://platform.kimi.com/docs/guide/kimi-k2-7-code-quickstart | 官方文档 · kimi.com · kimi k2 7 code quickstart | 官方文档 · Kimi · Kimi K2.7 Code Quickstart |
| web | kimi/kimi-k2.7-code | https://platform.kimi.com/docs/get-api-key | 官方文档 · kimi.com · get api key | 官方文档 · Kimi · Get API Key |
| web | kimi/kimi-k2.7-code-highspeed | https://platform.kimi.com/docs/guide/kimi-k2-7-code-quickstart | 官方文档 · kimi.com · kimi k2 7 code quickstart | 官方文档 · Kimi · Kimi K2.7 Code Quickstart |
| web | kimi/kimi-k2.7-code-highspeed | https://www.kimi.com/code/docs/en/kimi-code/models | 官方文档 · kimi.com · 模型列表 · www.kimi.com/code/docs/en/kimi-code/models | 官方文档 · Kimi · 模型列表（英文） |
| web | kimi/kimi-k2.7-code-highspeed | https://platform.kimi.com/docs/models | 官方文档 · kimi.com · 模型列表 · platform.kimi.com/docs/models | 官方文档 · Kimi · 模型列表（文档） |
| web | kimi/kimi-k2.7-code-highspeed | https://platform.kimi.com/docs/get-api-key | 官方文档 · kimi.com · get api key | 官方文档 · Kimi · Get API Key |
| web | kimi/kimi-k2.6 | https://platform.kimi.com/docs/models | 官方文档 · kimi.com · 模型列表 | 官方文档 · Kimi · 模型列表 |
| web | kimi/kimi-k2.6 | https://platform.kimi.com/docs/guide/kimi-k2-6-quickstart | 官方文档 · kimi.com · kimi k2 6 quickstart | 官方文档 · Kimi · Kimi K2.6 Quickstart |
| web | kimi/kimi-k2.6 | https://platform.kimi.com/docs/get-api-key | 官方文档 · kimi.com · get api key | 官方文档 · Kimi · Get API Key |
| web | kimi/kimi-k3.1-pro | https://platform.kimi.com/docs/guide/kimi-k3-1-pro-quickstart | 官方文档 · kimi.com · kimi k3 1 pro quickstart | 官方文档 · Kimi · Kimi K3.1 Pro Quickstart |
| web | kimi/kimi-k3.1-pro | https://platform.kimi.com/docs/models | 官方文档 · kimi.com · 模型列表 | 官方文档 · Kimi · 模型列表 |
| web | kimi/kimi-k3.1-pro | https://platform.kimi.com/docs/pricing/chat | 官方文档 · kimi.com · chat | 官方文档 · Kimi · Chat |
| web | kimi/kimi-k3.1-pro-highspeed | https://platform.kimi.com/docs/guide/kimi-k3-1-pro-quickstart | 官方文档 · kimi.com · kimi k3 1 pro quickstart | 官方文档 · Kimi · Kimi K3.1 Pro Quickstart |
| web | kimi/kimi-k3.1-pro-highspeed | https://platform.kimi.com/docs/models | 官方文档 · kimi.com · 模型列表 | 官方文档 · Kimi · 模型列表 |
| web | kimi/kimi-k3.1-pro-highspeed | https://platform.kimi.com/docs/pricing/chat | 官方文档 · kimi.com · chat | 官方文档 · Kimi · Chat |
| web | zhipu/glm-5.3 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.3 | 官方文档 · bigmodel.cn · glm 5.3 | 官方文档 · 智谱 · GLM-5.3 |
| web | zhipu/glm-5.3 | https://docs.bigmodel.cn/cn/guide/start/model-overview | 官方文档 · bigmodel.cn · model overview | 官方文档 · 智谱 · 模型概览 |
| web | zhipu/glm-5.3-flash | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5.3-flash | 官方文档 · bigmodel.cn · glm 5.3 flash | 官方文档 · 智谱 · GLM 5.3 Flash |
| web | zhipu/glm-5.3-flash | https://docs.bigmodel.cn/cn/guide/start/model-overview | 官方文档 · bigmodel.cn · model overview | 官方文档 · 智谱 · 模型概览 |
| web | zhipu/glm-5.3-flashx | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5.3-flash | 官方文档 · bigmodel.cn · glm 5.3 flash | 官方文档 · 智谱 · GLM 5.3 Flash |
| web | zhipu/glm-5.3-flashx | https://docs.bigmodel.cn/cn/guide/start/model-overview | 官方文档 · bigmodel.cn · model overview | 官方文档 · 智谱 · 模型概览 |
| web | zhipu/glm-5.2 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.2 | 官方文档 · bigmodel.cn · glm 5.2 | 官方文档 · 智谱 · GLM 5.2 |
| web | zhipu/glm-5.2 | https://docs.bigmodel.cn/cn/guide/start/model-overview | 官方文档 · bigmodel.cn · model overview | 官方文档 · 智谱 · 模型概览 |
| web | zhipu/glm-5.1 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.1 | 官方文档 · bigmodel.cn · glm 5.1 | 官方文档 · 智谱 · GLM-5.1 |
| web | zhipu/glm-5.1 | https://docs.bigmodel.cn/cn/guide/start/model-overview | 官方文档 · bigmodel.cn · model overview | 官方文档 · 智谱 · 模型概览 |
| web | zhipu/glm-5 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5 | 官方文档 · bigmodel.cn · glm 5 | 官方文档 · 智谱 · GLM-5 |
| web | zhipu/glm-5 | https://docs.bigmodel.cn/cn/guide/start/model-overview | 官方文档 · bigmodel.cn · model overview | 官方文档 · 智谱 · 模型概览 |
| web | zhipu/glm-5-turbo | https://docs.bigmodel.cn/cn/guide/models/text/glm-5-turbo | 官方文档 · bigmodel.cn · glm 5 turbo | 官方文档 · 智谱 · GLM 5 Turbo |
| web | zhipu/glm-5-turbo | https://docs.bigmodel.cn/cn/guide/start/model-overview | 官方文档 · bigmodel.cn · model overview | 官方文档 · 智谱 · 模型概览 |
| web | zhipu/glm-5v-turbo | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5v-turbo | 官方文档 · bigmodel.cn · glm 5v turbo | 官方文档 · 智谱 · GLM 5V Turbo |
| web | zhipu/glm-5v-turbo | https://docs.bigmodel.cn/cn/guide/start/model-overview | 官方文档 · bigmodel.cn · model overview | 官方文档 · 智谱 · 模型概览 |
| web | zhipu/glm-4.7 | https://docs.bigmodel.cn/cn/guide/models/text/glm-4.7 | 官方文档 · bigmodel.cn · glm 4.7 | 官方文档 · 智谱 · GLM-4.7 |
| web | zhipu/glm-4.7 | https://docs.bigmodel.cn/cn/guide/start/model-overview | 官方文档 · bigmodel.cn · model overview | 官方文档 · 智谱 · 模型概览 |
| web | zhipu/glm-4.7-flash | https://docs.bigmodel.cn/cn/guide/models/free/glm-4.7-flash | 官方文档 · bigmodel.cn · glm 4.7 flash | 官方文档 · 智谱 · GLM 4.7 Flash |
| web | zhipu/glm-4.7-flash | https://docs.bigmodel.cn/cn/guide/start/model-overview | 官方文档 · bigmodel.cn · model overview | 官方文档 · 智谱 · 模型概览 |
| web | zhipu/glm-4.7-flashx | https://docs.bigmodel.cn/cn/guide/models/text/glm-4.7 | 官方文档 · bigmodel.cn · glm 4.7 | 官方文档 · 智谱 · GLM 4.7 |
| web | zhipu/glm-4.7-flashx | https://docs.bigmodel.cn/cn/guide/start/model-overview | 官方文档 · bigmodel.cn · model overview | 官方文档 · 智谱 · 模型概览 |
| web | zhipu/glm-4.6 | https://docs.bigmodel.cn/cn/guide/models/text/glm-4.6 | 官方文档 · bigmodel.cn · glm 4.6 | 官方文档 · 智谱 · GLM-4.6 |
| web | zhipu/glm-4.6 | https://docs.bigmodel.cn/cn/guide/start/model-overview | 官方文档 · bigmodel.cn · model overview | 官方文档 · 智谱 · 模型概览 |
| web | zhipu/glm-4.6v | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-4.6v | 官方文档 · bigmodel.cn · glm 4.6v | 官方文档 · 智谱 · GLM-4.6v |
| web | zhipu/glm-4.6v | https://docs.bigmodel.cn/cn/guide/start/model-overview | 官方文档 · bigmodel.cn · model overview | 官方文档 · 智谱 · 模型概览 |
| web | zhipu/glm-4.6v-flash | https://docs.bigmodel.cn/cn/guide/models/free/glm-4.6v-flash | 官方文档 · bigmodel.cn · glm 4.6v flash | 官方文档 · 智谱 · GLM 4.6v Flash |
| web | zhipu/glm-4.6v-flash | https://docs.bigmodel.cn/cn/guide/start/model-overview | 官方文档 · bigmodel.cn · model overview | 官方文档 · 智谱 · 模型概览 |
| web | zhipu/glm-4.6v-flashx | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-4.6v | 官方文档 · bigmodel.cn · glm 4.6v | 官方文档 · 智谱 · GLM 4.6v |
| web | zhipu/glm-4.6v-flashx | https://docs.bigmodel.cn/cn/guide/start/model-overview | 官方文档 · bigmodel.cn · model overview | 官方文档 · 智谱 · 模型概览 |
| web | zhipu/glm-4.5-air | https://docs.bigmodel.cn/cn/guide/models/text/glm-4.5 | 官方文档 · bigmodel.cn · glm 4.5 | 官方文档 · 智谱 · GLM 4.5 |
| web | zhipu/glm-4.5-air | https://docs.bigmodel.cn/cn/guide/start/model-overview | 官方文档 · bigmodel.cn · model overview | 官方文档 · 智谱 · 模型概览 |
| web | zhipu/glm-4.5-airx | https://docs.bigmodel.cn/cn/guide/models/text/glm-4.5 | 官方文档 · bigmodel.cn · glm 4.5 | 官方文档 · 智谱 · GLM 4.5 |
| web | zhipu/glm-4.5-airx | https://docs.bigmodel.cn/cn/guide/start/model-overview | 官方文档 · bigmodel.cn · model overview | 官方文档 · 智谱 · 模型概览 |
| web | zhipu/glm-4.5-flash | https://docs.bigmodel.cn/cn/guide/models/free/glm-4.5-flash | 官方文档 · bigmodel.cn · glm 4.5 flash | 官方文档 · 智谱 · GLM 4.5 Flash |
| web | zhipu/glm-4.5-flash | https://docs.bigmodel.cn/cn/guide/start/model-overview | 官方文档 · bigmodel.cn · model overview | 官方文档 · 智谱 · 模型概览 |
| web | zhipu/glm-4.1v-thinking-flash | https://docs.bigmodel.cn/cn/guide/models/free/glm-4.1v-thinking-flash | 官方文档 · bigmodel.cn · glm 4.1v thinking flash | 官方文档 · 智谱 · GLM 4.1v Thinking Flash |
| web | zhipu/glm-4.1v-thinking-flash | https://docs.bigmodel.cn/cn/guide/start/model-overview | 官方文档 · bigmodel.cn · model overview | 官方文档 · 智谱 · 模型概览 |
| web | zhipu/glm-4.1v-thinking-flashx | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-4.1v-thinking | 官方文档 · bigmodel.cn · glm 4.1v thinking | 官方文档 · 智谱 · GLM 4.1v Thinking |
| web | zhipu/glm-4.1v-thinking-flashx | https://docs.bigmodel.cn/cn/guide/start/model-overview | 官方文档 · bigmodel.cn · model overview | 官方文档 · 智谱 · 模型概览 |
| web | zhipu/glm-4-flash-250414 | https://docs.bigmodel.cn/cn/guide/models/text/glm-4 | 官方文档 · bigmodel.cn · glm 4 | 官方文档 · 智谱 · GLM 4 |
| web | zhipu/glm-4-flash-250414 | https://docs.bigmodel.cn/cn/guide/start/model-overview | 官方文档 · bigmodel.cn · model overview | 官方文档 · 智谱 · 模型概览 |
| web | zhipu/glm-4-flashx-250414 | https://docs.bigmodel.cn/cn/guide/models/text/glm-4 | 官方文档 · bigmodel.cn · glm 4 | 官方文档 · 智谱 · GLM 4 |
| web | zhipu/glm-4-flashx-250414 | https://docs.bigmodel.cn/cn/guide/start/model-overview | 官方文档 · bigmodel.cn · model overview | 官方文档 · 智谱 · 模型概览 |
| web | zhipu/glm-4-long | https://docs.bigmodel.cn/cn/guide/models/text/glm-4-long | 官方文档 · bigmodel.cn · glm 4 long | 官方文档 · 智谱 · GLM 4 Long |
| web | zhipu/glm-4-long | https://docs.bigmodel.cn/cn/guide/start/model-overview | 官方文档 · bigmodel.cn · model overview | 官方文档 · 智谱 · 模型概览 |
| web | zhipu/glm-4v-flash | https://docs.bigmodel.cn/cn/guide/models/free/glm-4v-flash | 官方文档 · bigmodel.cn · glm 4v flash | 官方文档 · 智谱 · GLM 4v Flash |
| web | zhipu/glm-4v-flash | https://docs.bigmodel.cn/cn/guide/start/model-overview | 官方文档 · bigmodel.cn · model overview | 官方文档 · 智谱 · 模型概览 |
| web | zhipu/cogview-3-flash | https://docs.bigmodel.cn/cn/guide/models/free/cogview-3-flash | 官方文档 · bigmodel.cn · cogview 3 flash | 官方文档 · 智谱 · CogView 3 Flash |
| web | zhipu/cogview-3-flash | https://docs.bigmodel.cn/cn/guide/start/model-overview | 官方文档 · bigmodel.cn · model overview | 官方文档 · 智谱 · 模型概览 |
| web | zhipu/cogview-4 | https://docs.bigmodel.cn/cn/guide/models/image-generation/cogview-4 | 官方文档 · bigmodel.cn · cogview 4 | 官方文档 · 智谱 · CogView 4 |
| web | zhipu/cogview-4 | https://docs.bigmodel.cn/cn/guide/start/model-overview | 官方文档 · bigmodel.cn · model overview | 官方文档 · 智谱 · 模型概览 |
| web | zhipu/cogview-4-250304 | https://docs.bigmodel.cn/cn/guide/models/image-generation/cogview-4 | 官方文档 · bigmodel.cn · cogview 4 | 官方文档 · 智谱 · CogView 4 |
| web | zhipu/cogview-4-250304 | https://docs.bigmodel.cn/cn/guide/start/model-overview | 官方文档 · bigmodel.cn · model overview | 官方文档 · 智谱 · 模型概览 |
| web | zhipu/glm-image | https://docs.bigmodel.cn/cn/guide/models/image-generation/glm-image | 官方文档 · bigmodel.cn · glm image | 官方文档 · 智谱 · GLM Image |
| web | zhipu/glm-image | https://docs.bigmodel.cn/cn/guide/start/model-overview | 官方文档 · bigmodel.cn · model overview | 官方文档 · 智谱 · 模型概览 |
| web | siliconflow/XingChenAGI/Xing4.0-29B | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/tencent/Hy4-preview | https://huggingface.co/tencent/Hy4-preview | 官方文档 · Hugging Face · Hy4 preview | 官方文档 · Hugging Face · Hy4 Preview |
| web | siliconflow/tencent/Hy4-preview | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/Qwen/Qwen3.8-27B | https://huggingface.co/Qwen/Qwen3.8-27B | 官方文档 · Hugging Face · Qwen3.8 27B | 官方文档 · Hugging Face · Qwen3.8-27B |
| web | siliconflow/Qwen/Qwen3.8-27B | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/MiniMaxAI/MiniMax-M2.5 | https://huggingface.co/MiniMaxAI/MiniMax-M2.5 | 官方文档 · Hugging Face · MiniMax M2.5 | 官方文档 · Hugging Face · MiniMax-M2.5 |
| web | siliconflow/MiniMaxAI/MiniMax-M2.5 | https://platform.minimax.io/docs/api-reference/text-openai-api | 官方文档 · minimax.io · text openai api | 官方文档 · MiniMax · Text OpenAI API |
| web | siliconflow/MiniMaxAI/MiniMax-M2.5 | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/Pro/MiniMaxAI/MiniMax-M2.5 | https://huggingface.co/MiniMaxAI/MiniMax-M2.5 | 官方文档 · Hugging Face · MiniMax M2.5 | 官方文档 · Hugging Face · MiniMax-M2.5 |
| web | siliconflow/Pro/MiniMaxAI/MiniMax-M2.5 | https://platform.minimax.io/docs/api-reference/text-openai-api | 官方文档 · minimax.io · text openai api | 官方文档 · MiniMax · Text OpenAI API |
| web | siliconflow/Pro/MiniMaxAI/MiniMax-M2.5 | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/Qwen/Qwen-Image-Edit-2509 | https://huggingface.co/Qwen/Qwen-Image-Edit-2509 | 官方文档 · Hugging Face · Qwen Image Edit 2509 | 官方文档 · Hugging Face · Qwen-Image-Edit-2509 |
| web | siliconflow/Qwen/Qwen-Image-Edit-2509 | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/Qwen/Qwen-Image | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/Qwen/Qwen-Image | https://docs.siliconflow.cn/docs/api/images-generations-post | 官方文档 · siliconflow.cn · images generations post | 官方文档 · SiliconFlow · Images Generations Post |
| web | siliconflow/Qwen/Qwen-Image-Edit | https://huggingface.co/Qwen/Qwen-Image-Edit | 官方文档 · Hugging Face · Qwen Image Edit | 官方文档 · Hugging Face · Qwen-Image-Edit |
| web | siliconflow/Qwen/Qwen-Image-Edit | https://help.aliyun.com/zh/model-studio/model-depreciation | 原厂规格 · 百炼 · 模型下线公告 | 下线公告 · 百炼 · 模型下线公告 |
| web | siliconflow/Qwen/Qwen-Image-Edit | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/Qwen/Qwen3.6-27B | https://huggingface.co/Qwen/Qwen3.6-27B | 官方文档 · Hugging Face · Qwen3.6 27B | 官方文档 · Hugging Face · Qwen3.6-27B |
| web | siliconflow/Qwen/Qwen3.6-27B | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/Qwen/Qwen3.6-35B-A3B | https://huggingface.co/Qwen/Qwen3.6-35B-A3B | 官方文档 · Hugging Face · Qwen3.6 35B A3B | 官方文档 · Hugging Face · Qwen3.6-35B-A3B |
| web | siliconflow/Qwen/Qwen3.6-35B-A3B | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/Qwen/Qwen3.5-122B-A10B | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/Qwen/Qwen3.5-122B-A10B | https://huggingface.co/Qwen/Qwen3.5-122B-A10B | 官方文档 · Hugging Face · Qwen3.5 122B A10B | 官方文档 · Hugging Face · Qwen3.5-122B-A10B |
| web | siliconflow/Qwen/Qwen3.5-27B | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/Qwen/Qwen3.5-27B | https://huggingface.co/Qwen/Qwen3.5-27B | 官方文档 · Hugging Face · Qwen3.5 27B | 官方文档 · Hugging Face · Qwen3.5-27B |
| web | siliconflow/Qwen/Qwen3.5-35B-A3B | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/Qwen/Qwen3.5-35B-A3B | https://huggingface.co/Qwen/Qwen3.5-35B-A3B | 官方文档 · Hugging Face · Qwen3.5 35B A3B | 官方文档 · Hugging Face · Qwen3.5-35B-A3B |
| web | siliconflow/Qwen/Qwen3.5-397B-A17B | https://huggingface.co/Qwen/Qwen3.5-397B-A17B | 官方文档 · Hugging Face · Qwen3.5 397B A17B | 官方文档 · Hugging Face · Qwen3.5-397B-A17B |
| web | siliconflow/Qwen/Qwen3.5-397B-A17B | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/Qwen/Qwen3.5-4B | https://huggingface.co/Qwen/Qwen3.5-4B | 官方文档 · Hugging Face · Qwen3.5 4B | 官方文档 · Hugging Face · Qwen3.5-4B |
| web | siliconflow/Qwen/Qwen3.5-4B | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/Qwen/Qwen3.5-9B | https://huggingface.co/Qwen/Qwen3.5-9B | 官方文档 · Hugging Face · Qwen3.5 9B | 官方文档 · Hugging Face · Qwen3.5-9B |
| web | siliconflow/Qwen/Qwen3.5-9B | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/Qwen/Qwen3-14B | https://huggingface.co/Qwen/Qwen3-14B | 官方文档 · Hugging Face · Qwen3 14B | 官方文档 · Hugging Face · Qwen3-14B |
| web | siliconflow/Qwen/Qwen3-14B | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/Qwen/Qwen3-30B-A3B-Instruct-2507 | https://huggingface.co/Qwen/Qwen3-30B-A3B-Instruct-2507 | 官方文档 · Hugging Face · Qwen3 30B A3B Instruct 2507 | 官方文档 · Hugging Face · Qwen3-30B-A3B-Instruct-2507 |
| web | siliconflow/Qwen/Qwen3-30B-A3B-Instruct-2507 | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/Qwen/Qwen3-32B | https://huggingface.co/Qwen/Qwen3-32B | 官方文档 · Hugging Face · Qwen3 32B | 官方文档 · Hugging Face · Qwen3-32B |
| web | siliconflow/Qwen/Qwen3-32B | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/Qwen/Qwen3-8B | https://huggingface.co/Qwen/Qwen3-8B | 官方文档 · Hugging Face · Qwen3 8B | 官方文档 · Hugging Face · Qwen3-8B |
| web | siliconflow/Qwen/Qwen3-8B | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/Pro/Qwen/Qwen2.5-7B-Instruct | https://huggingface.co/Qwen/Qwen2.5-7B-Instruct | 官方文档 · Hugging Face · Qwen2.5 7B Instruct | 官方文档 · Hugging Face · Qwen2.5-7B-Instruct |
| web | siliconflow/Pro/Qwen/Qwen2.5-7B-Instruct | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/Qwen/Qwen2.5-32B-Instruct | https://huggingface.co/Qwen/Qwen2.5-32B-Instruct | 官方文档 · Hugging Face · Qwen2.5 32B Instruct | 官方文档 · Hugging Face · Qwen2.5-32B-Instruct |
| web | siliconflow/Qwen/Qwen2.5-32B-Instruct | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/Qwen/Qwen2.5-72B-Instruct | https://huggingface.co/Qwen/Qwen2.5-72B-Instruct | 官方文档 · Hugging Face · Qwen2.5 72B Instruct | 官方文档 · Hugging Face · Qwen2.5-72B-Instruct |
| web | siliconflow/Qwen/Qwen2.5-72B-Instruct | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/Qwen/Qwen2.5-72B-Instruct-128K | https://huggingface.co/Qwen/Qwen2.5-72B-Instruct | 官方文档 · Hugging Face · Qwen2.5 72B Instruct | 官方文档 · Hugging Face · Qwen2.5-72B-Instruct |
| web | siliconflow/Qwen/Qwen2.5-72B-Instruct-128K | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/Qwen/Qwen2.5-7B-Instruct | https://huggingface.co/Qwen/Qwen2.5-7B-Instruct | 官方文档 · Hugging Face · Qwen2.5 7B Instruct | 官方文档 · Hugging Face · Qwen2.5-7B-Instruct |
| web | siliconflow/Qwen/Qwen2.5-7B-Instruct | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/deepseek-ai/DeepSeek-V4.1-Flash | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/deepseek-ai/DeepSeek-V4.1-Flash | https://docs.siliconflow.cn/cn/api-reference/chat-completions/chat-completions | 官方文档 · siliconflow.cn · chat completions | 官方文档 · SiliconFlow · Chat Completions |
| web | siliconflow/deepseek-ai/DeepSeek-V4.1-Flash | https://docs.siliconflow.cn/docs/release-notes/overview | 官方文档 · siliconflow.cn · overview | 官方文档 · SiliconFlow · Release Notes |
| web | siliconflow/deepseek-ai/DeepSeek-V4-Flash | https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash | 官方文档 · Hugging Face · DeepSeek V4 Flash | 官方文档 · Hugging Face · DeepSeek-V4-Flash |
| web | siliconflow/deepseek-ai/DeepSeek-V4-Flash | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/deepseek-ai/DeepSeek-V4-Pro | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/deepseek-ai/DeepSeek-V4-Pro | https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro | 官方文档 · Hugging Face · DeepSeek V4 Pro | 官方文档 · Hugging Face · DeepSeek-V4-Pro |
| web | siliconflow/Pro/deepseek-ai/DeepSeek-V3.2 | https://huggingface.co/deepseek-ai/DeepSeek-V3.2 | 官方文档 · Hugging Face · DeepSeek V3.2 | 官方文档 · Hugging Face · DeepSeek-V3.2 |
| web | siliconflow/Pro/deepseek-ai/DeepSeek-V3.2 | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/deepseek-ai/DeepSeek-V3.2 | https://huggingface.co/deepseek-ai/DeepSeek-V3.2 | 官方文档 · Hugging Face · DeepSeek V3.2 | 官方文档 · Hugging Face · DeepSeek-V3.2 |
| web | siliconflow/deepseek-ai/DeepSeek-V3.2 | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/Pro/deepseek-ai/DeepSeek-V3.1-Terminus | https://huggingface.co/deepseek-ai/DeepSeek-V3.1-Terminus | 官方文档 · Hugging Face · DeepSeek V3.1 Terminus | 官方文档 · Hugging Face · DeepSeek-V3.1-Terminus |
| web | siliconflow/Pro/deepseek-ai/DeepSeek-V3.1-Terminus | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/deepseek-ai/DeepSeek-V3.1-Terminus | https://huggingface.co/deepseek-ai/DeepSeek-V3.1-Terminus | 官方文档 · Hugging Face · DeepSeek V3.1 Terminus | 官方文档 · Hugging Face · DeepSeek-V3.1-Terminus |
| web | siliconflow/deepseek-ai/DeepSeek-V3.1-Terminus | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/deepseek-ai/DeepSeek-R1-0528-Qwen3-8B | https://huggingface.co/deepseek-ai/DeepSeek-R1-0528-Qwen3-8B | 官方文档 · Hugging Face · DeepSeek R1 0528 Qwen3 8B | 官方文档 · Hugging Face · DeepSeek-R1-0528-Qwen3-8B |
| web | siliconflow/deepseek-ai/DeepSeek-R1-0528-Qwen3-8B | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/moonshotai/Kimi-K2.7-Code | https://huggingface.co/moonshotai/Kimi-K2.7-Code | 官方文档 · Hugging Face · Kimi K2.7 Code | 官方文档 · Hugging Face · Kimi-K2.7-Code |
| web | siliconflow/moonshotai/Kimi-K2.7-Code | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/Pro/moonshotai/Kimi-K2.6 | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/Pro/moonshotai/Kimi-K2.6 | https://docs.siliconflow.cn/docs/userguide/capabilities/vision | 官方文档 · siliconflow.cn · vision | 官方文档 · SiliconFlow · Vision |
| web | siliconflow/stepfun-ai/Step-3.5-Flash | https://platform.stepfun.com/docs/zh/guides/models/list | 原厂规格 · stepfun.com · list | 原厂规格 · StepFun · List |
| web | siliconflow/stepfun-ai/Step-3.5-Flash | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/stepfun-ai/Step-3.5-Flash | https://platform.stepfun.com/docs/zh/guides/models/step-3.5-flash | 官方文档 · stepfun.com · step 3.5 flash | 官方文档 · StepFun · Step-3.5-Flash |
| web | siliconflow/zai-org/GLM-5.3 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.3 | 官方文档 · bigmodel.cn · glm 5.3 | 官方文档 · 智谱 · GLM-5.3 |
| web | siliconflow/zai-org/GLM-5.3 | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/zai-org/GLM-5.3-Flash | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5.3-flash | 官方文档 · bigmodel.cn · glm 5.3 flash | 官方文档 · 智谱 · GLM 5.3 Flash |
| web | siliconflow/zai-org/GLM-5.3-Flash | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/zai-org/GLM-5.3-Flash | https://docs.siliconflow.cn/cn/api-reference/chat-completions/chat-completions | 官方文档 · siliconflow.cn · chat completions | 官方文档 · SiliconFlow · Chat Completions |
| web | siliconflow/zai-org/GLM-5.2 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.2 | 官方文档 · bigmodel.cn · glm 5.2 | 官方文档 · 智谱 · GLM-5.2 |
| web | siliconflow/zai-org/GLM-5.2 | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/Pro/zai-org/GLM-5.1 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.1 | 官方文档 · bigmodel.cn · glm 5.1 | 官方文档 · 智谱 · GLM-5.1 |
| web | siliconflow/Pro/zai-org/GLM-5.1 | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/zai-org/GLM-4.5-Air | https://docs.bigmodel.cn/cn/guide/models/text/glm-4.5 | 官方文档 · bigmodel.cn · glm 4.5 | 官方文档 · 智谱 · GLM 4.5 |
| web | siliconflow/zai-org/GLM-4.5-Air | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/zai-org/GLM-4.5V | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-4.5v | 官方文档 · bigmodel.cn · glm 4.5v | 官方文档 · 智谱 · GLM-4.5V |
| web | siliconflow/zai-org/GLM-4.5V | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/THUDM/GLM-4-32B-0414 | https://github.com/zai-org/GLM-4/blob/main/README.md | 官方文档 · github.com · README.md | 官方文档 · GitHub · README |
| web | siliconflow/THUDM/GLM-4-32B-0414 | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/THUDM/GLM-4-9B-0414 | https://github.com/zai-org/GLM-4/blob/main/README.md | 官方文档 · github.com · README.md | 官方文档 · GitHub · README |
| web | siliconflow/THUDM/GLM-4-9B-0414 | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/THUDM/GLM-Z1-9B-0414 | https://github.com/zai-org/GLM-4/blob/main/README.md | 官方文档 · github.com · README.md | 官方文档 · GitHub · README |
| web | siliconflow/THUDM/GLM-Z1-9B-0414 | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/Pro/deepseek-ai/DeepSeek-V3 | https://huggingface.co/deepseek-ai/DeepSeek-V3 | 官方文档 · Hugging Face · DeepSeek V3 | 官方文档 · Hugging Face · DeepSeek-V3 |
| web | siliconflow/Pro/deepseek-ai/DeepSeek-V3 | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/deepseek-ai/DeepSeek-V3 | https://huggingface.co/deepseek-ai/DeepSeek-V3 | 官方文档 · Hugging Face · DeepSeek V3 | 官方文档 · Hugging Face · DeepSeek-V3 |
| web | siliconflow/deepseek-ai/DeepSeek-V3 | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/ByteDance-Seed/Seed-OSS-36B-Instruct | https://huggingface.co/ByteDance-Seed/Seed-OSS-36B-Instruct | 官方文档 · Hugging Face · Seed OSS 36B Instruct | 官方文档 · Hugging Face · Seed-OSS-36B-Instruct |
| web | siliconflow/ByteDance-Seed/Seed-OSS-36B-Instruct | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/Kwai-Kolors/Kolors | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/Kwai-Kolors/Kolors | https://docs.siliconflow.cn/docs/api/images-generations-post | 官方文档 · siliconflow.cn · images generations post | 官方文档 · SiliconFlow · Images Generations Post |
| web | siliconflow/Pro/deepseek-ai/DeepSeek-R1 | https://huggingface.co/deepseek-ai/DeepSeek-R1 | 官方文档 · Hugging Face · DeepSeek R1 | 官方文档 · Hugging Face · DeepSeek-R1 |
| web | siliconflow/Pro/deepseek-ai/DeepSeek-R1 | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/Qwen/Qwen3-Coder-30B-A3B-Instruct | https://huggingface.co/Qwen/Qwen3-Coder-30B-A3B-Instruct | 官方文档 · Hugging Face · Qwen3 Coder 30B A3B Instruct | 官方文档 · Hugging Face · Qwen3-Coder-30B-A3B-Instruct |
| web | siliconflow/Qwen/Qwen3-Coder-30B-A3B-Instruct | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/Qwen/Qwen3-Omni-30B-A3B-Instruct | https://huggingface.co/Qwen/Qwen3-Omni-30B-A3B-Instruct | 官方文档 · Hugging Face · Qwen3 Omni 30B A3B Instruct | 官方文档 · Hugging Face · Qwen3-Omni-30B-A3B-Instruct |
| web | siliconflow/Qwen/Qwen3-Omni-30B-A3B-Instruct | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/Qwen/Qwen3-Omni-30B-A3B-Thinking | https://huggingface.co/Qwen/Qwen3-Omni-30B-A3B-Thinking | 官方文档 · Hugging Face · Qwen3 Omni 30B A3B Thinking | 官方文档 · Hugging Face · Qwen3-Omni-30B-A3B-Thinking |
| web | siliconflow/Qwen/Qwen3-Omni-30B-A3B-Thinking | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/Qwen/Qwen3-VL-30B-A3B-Instruct | https://huggingface.co/Qwen/Qwen3-VL-30B-A3B-Instruct | 官方文档 · Hugging Face · Qwen3 VL 30B A3B Instruct | 官方文档 · Hugging Face · Qwen3-VL-30B-A3B-Instruct |
| web | siliconflow/Qwen/Qwen3-VL-30B-A3B-Instruct | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/Qwen/Qwen3-VL-30B-A3B-Thinking | https://huggingface.co/Qwen/Qwen3-VL-30B-A3B-Thinking | 官方文档 · Hugging Face · Qwen3 VL 30B A3B Thinking | 官方文档 · Hugging Face · Qwen3-VL-30B-A3B-Thinking |
| web | siliconflow/Qwen/Qwen3-VL-30B-A3B-Thinking | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/Qwen/Qwen3-VL-32B-Instruct | https://huggingface.co/Qwen/Qwen3-VL-32B-Instruct | 官方文档 · Hugging Face · Qwen3 VL 32B Instruct | 官方文档 · Hugging Face · Qwen3-VL-32B-Instruct |
| web | siliconflow/Qwen/Qwen3-VL-32B-Instruct | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/Qwen/Qwen3-VL-32B-Thinking | https://huggingface.co/Qwen/Qwen3-VL-32B-Thinking | 官方文档 · Hugging Face · Qwen3 VL 32B Thinking | 官方文档 · Hugging Face · Qwen3-VL-32B-Thinking |
| web | siliconflow/Qwen/Qwen3-VL-32B-Thinking | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/Qwen/Qwen3-VL-8B-Instruct | https://huggingface.co/Qwen/Qwen3-VL-8B-Instruct | 官方文档 · Hugging Face · Qwen3 VL 8B Instruct | 官方文档 · Hugging Face · Qwen3-VL-8B-Instruct |
| web | siliconflow/Qwen/Qwen3-VL-8B-Instruct | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/Qwen/Qwen3-VL-8B-Thinking | https://huggingface.co/Qwen/Qwen3-VL-8B-Thinking | 官方文档 · Hugging Face · Qwen3 VL 8B Thinking | 官方文档 · Hugging Face · Qwen3-VL-8B-Thinking |
| web | siliconflow/Qwen/Qwen3-VL-8B-Thinking | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/Tongyi-MAI/Z-Image | https://huggingface.co/Tongyi-MAI/Z-Image | 官方文档 · Hugging Face · Z Image | 官方文档 · Hugging Face · Z-Image |
| web | siliconflow/Tongyi-MAI/Z-Image | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/Tongyi-MAI/Z-Image-Turbo | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/Tongyi-MAI/Z-Image-Turbo | https://huggingface.co/Tongyi-MAI/Z-Image-Turbo | 官方文档 · Hugging Face · Z Image Turbo | 官方文档 · Hugging Face · Z-Image-Turbo |
| web | siliconflow/baidu/ERNIE-Image-Turbo | https://huggingface.co/baidu/ERNIE-Image-Turbo | 官方文档 · Hugging Face · ERNIE Image Turbo | 官方文档 · Hugging Face · ERNIE-Image-Turbo |
| web | siliconflow/baidu/ERNIE-Image-Turbo | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/deepseek-ai/DeepSeek-R1 | https://huggingface.co/deepseek-ai/DeepSeek-R1 | 官方文档 · Hugging Face · DeepSeek R1 | 官方文档 · Hugging Face · DeepSeek-R1 |
| web | siliconflow/deepseek-ai/DeepSeek-R1 | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/inclusionAI/Ling-flash-2.0 | https://huggingface.co/inclusionAI/Ling-flash-2.0 | 官方文档 · Hugging Face · Ling flash 2.0 | 官方文档 · Hugging Face · Ling Flash 2.0 |
| web | siliconflow/inclusionAI/Ling-flash-2.0 | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/inclusionAI/Ling-mini-2.0 | https://huggingface.co/inclusionAI/Ling-mini-2.0 | 官方文档 · Hugging Face · Ling mini 2.0 | 官方文档 · Hugging Face · Ling Mini 2.0 |
| web | siliconflow/inclusionAI/Ling-mini-2.0 | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/meituan-longcat/LongCat-2.0 | https://huggingface.co/meituan-longcat/LongCat-2.0 | 官方文档 · Hugging Face · LongCat 2.0 | 官方文档 · Hugging Face · LongCat-2.0 |
| web | siliconflow/meituan-longcat/LongCat-2.0 | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/nex-agi/Nex-N2-Pro | https://huggingface.co/nex-agi/Nex-N2-Pro | 官方文档 · Hugging Face · Nex N2 Pro | 官方文档 · Hugging Face · Nex-N2-Pro |
| web | siliconflow/nex-agi/Nex-N2-Pro | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | siliconflow/tencent/Hunyuan-A13B-Instruct | https://huggingface.co/tencent/Hunyuan-A13B-Instruct | 官方文档 · Hugging Face · Hunyuan A13B Instruct | 官方文档 · Hugging Face · Hunyuan-A13B-Instruct |
| web | siliconflow/tencent/Hunyuan-A13B-Instruct | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| web | anthropic/claude-haiku-5-5 | https://platform.claude.com/docs/en/models/haiku-5-5/overview | 官方文档 · claude.com · overview | 官方文档 · Claude · Haiku 5-5 |
| web | anthropic/claude-sonnet-5-5 | https://platform.claude.com/docs/en/models/sonnet-5-5/overview | 官方文档 · claude.com · overview | 官方文档 · Claude · Sonnet 5-5 |
| web | anthropic/claude-opus-5-5 | https://docs.anthropic.com/en/docs/about-claude/models/overview | 官方文档 · anthropic.com · overview | 官方文档 · Anthropic · 模型列表 |
| web | anthropic/claude-opus-5-5 | https://platform.claude.com/docs/en/models/overview | 官方文档 · claude.com · overview · platform.claude.com/docs/en/models/overview | 官方文档 · Claude · 模型列表 |
| web | anthropic/claude-opus-5-5 | https://platform.claude.com/docs/en/models/opus-5-5/overview | 官方文档 · claude.com · overview · platform.claude.com/docs/en/models/opus-5-5/overview | 官方文档 · Claude · Opus 5-5 |
| web | anthropic/claude-fable-5-1 | https://docs.anthropic.com/en/docs/about-claude/models/overview | 官方文档 · anthropic.com · overview | 官方文档 · Anthropic · 模型列表 |
| web | anthropic/claude-fable-5-1 | https://platform.claude.com/docs/en/models/overview | 官方文档 · claude.com · overview · platform.claude.com/docs/en/models/overview | 官方文档 · Claude · 模型列表 |
| web | anthropic/claude-fable-5-1 | https://platform.claude.com/docs/en/models/fable-5-1/overview | 官方文档 · claude.com · overview · platform.claude.com/docs/en/models/fable-5-1/overview | 官方文档 · Claude · Fable 5-1 |
| web | anthropic/claude-opus-5 | https://platform.claude.com/docs/en/models/opus-5/overview | 官方文档 · claude.com · overview · platform.claude.com/docs/en/models/opus-5/overview | 官方文档 · Claude · Opus 5 |
| web | anthropic/claude-opus-5 | https://docs.anthropic.com/en/docs/about-claude/models/overview | 官方文档 · anthropic.com · overview | 官方文档 · Anthropic · 模型列表 |
| web | anthropic/claude-opus-5 | https://platform.claude.com/docs/en/models/overview | 官方文档 · claude.com · overview · platform.claude.com/docs/en/models/overview | 官方文档 · Claude · 模型列表 |
| web | anthropic/claude-sonnet-5 | https://platform.claude.com/docs/en/models/sonnet-5/overview | 官方文档 · claude.com · overview · platform.claude.com/docs/en/models/sonnet-5/overview | 官方文档 · Claude · Sonnet 5 |
| web | anthropic/claude-sonnet-5 | https://docs.anthropic.com/en/docs/about-claude/models/overview | 官方文档 · anthropic.com · overview | 官方文档 · Anthropic · 模型列表 |
| web | anthropic/claude-sonnet-5 | https://platform.claude.com/docs/en/models/overview | 官方文档 · claude.com · overview · platform.claude.com/docs/en/models/overview | 官方文档 · Claude · 模型列表 |
| web | anthropic/claude-fable-5 | https://platform.claude.com/docs/en/models/fable-5/overview | 官方文档 · claude.com · overview · platform.claude.com/docs/en/models/fable-5/overview | 官方文档 · Claude · Fable 5 |
| web | anthropic/claude-fable-5 | https://docs.anthropic.com/en/docs/about-claude/models/overview | 官方文档 · anthropic.com · overview | 官方文档 · Anthropic · 模型列表 |
| web | anthropic/claude-fable-5 | https://platform.claude.com/docs/en/models/overview | 官方文档 · claude.com · overview · platform.claude.com/docs/en/models/overview | 官方文档 · Claude · 模型列表 |
| web | anthropic/claude-opus-4-8 | https://platform.claude.com/docs/en/models/opus-4-8/overview | 官方文档 · claude.com · overview · platform.claude.com/docs/en/models/opus-4-8/overview | 官方文档 · Claude · Opus 4-8 |
| web | anthropic/claude-opus-4-8 | https://docs.anthropic.com/en/docs/about-claude/models/overview | 官方文档 · anthropic.com · overview | 官方文档 · Anthropic · 模型列表 |
| web | anthropic/claude-opus-4-8 | https://platform.claude.com/docs/en/models/overview | 官方文档 · claude.com · overview · platform.claude.com/docs/en/models/overview | 官方文档 · Claude · 模型列表 |
| web | anthropic/claude-opus-4-7 | https://platform.claude.com/docs/en/models/opus-4-7/overview | 官方文档 · claude.com · overview · platform.claude.com/docs/en/models/opus-4-7/overview | 官方文档 · Claude · Opus 4-7 |
| web | anthropic/claude-opus-4-7 | https://docs.anthropic.com/en/docs/about-claude/models/overview | 官方文档 · anthropic.com · overview | 官方文档 · Anthropic · 模型列表 |
| web | anthropic/claude-opus-4-7 | https://platform.claude.com/docs/en/models/overview | 官方文档 · claude.com · overview · platform.claude.com/docs/en/models/overview | 官方文档 · Claude · 模型列表 |
| web | anthropic/claude-sonnet-4-6 | https://platform.claude.com/docs/en/models/sonnet-4-6/overview | 官方文档 · claude.com · overview · platform.claude.com/docs/en/models/sonnet-4-6/overview | 官方文档 · Claude · Sonnet 4-6 |
| web | anthropic/claude-sonnet-4-6 | https://docs.anthropic.com/en/docs/about-claude/models/overview | 官方文档 · anthropic.com · overview | 官方文档 · Anthropic · 模型列表 |
| web | anthropic/claude-sonnet-4-6 | https://platform.claude.com/docs/en/models/overview | 官方文档 · claude.com · overview · platform.claude.com/docs/en/models/overview | 官方文档 · Claude · 模型列表 |
| web | anthropic/claude-opus-4-6 | https://platform.claude.com/docs/en/models/opus-4-6/overview | 官方文档 · claude.com · overview · platform.claude.com/docs/en/models/opus-4-6/overview | 官方文档 · Claude · Opus 4-6 |
| web | anthropic/claude-opus-4-6 | https://docs.anthropic.com/en/docs/about-claude/models/overview | 官方文档 · anthropic.com · overview | 官方文档 · Anthropic · 模型列表 |
| web | anthropic/claude-opus-4-6 | https://platform.claude.com/docs/en/models/overview | 官方文档 · claude.com · overview · platform.claude.com/docs/en/models/overview | 官方文档 · Claude · 模型列表 |
| web | anthropic/claude-opus-4-5-20251101 | https://platform.claude.com/docs/en/models/opus-4-5/overview | 官方文档 · claude.com · overview · platform.claude.com/docs/en/models/opus-4-5/overview | 官方文档 · Claude · Opus 4-5 |
| web | anthropic/claude-opus-4-5-20251101 | https://docs.anthropic.com/en/docs/about-claude/models/overview | 官方文档 · anthropic.com · overview | 官方文档 · Anthropic · 模型列表 |
| web | anthropic/claude-opus-4-5-20251101 | https://platform.claude.com/docs/en/models/overview | 官方文档 · claude.com · overview · platform.claude.com/docs/en/models/overview | 官方文档 · Claude · 模型列表 |
| web | anthropic/claude-sonnet-4-5-20250929 | https://platform.claude.com/docs/en/models/sonnet-4-5/overview | 官方文档 · claude.com · overview · platform.claude.com/docs/en/models/sonnet-4-5/overview | 官方文档 · Claude · Sonnet 4-5 |
| web | anthropic/claude-sonnet-4-5-20250929 | https://docs.anthropic.com/en/docs/about-claude/models/overview | 官方文档 · anthropic.com · overview | 官方文档 · Anthropic · 模型列表 |
| web | anthropic/claude-sonnet-4-5-20250929 | https://platform.claude.com/docs/en/models/overview | 官方文档 · claude.com · overview · platform.claude.com/docs/en/models/overview | 官方文档 · Claude · 模型列表 |
| web | anthropic/claude-haiku-4-5-20251001 | https://platform.claude.com/docs/en/models/haiku-4-5/overview | 官方文档 · claude.com · overview · platform.claude.com/docs/en/models/haiku-4-5/overview | 官方文档 · Claude · Haiku 4-5 |
| web | anthropic/claude-haiku-4-5-20251001 | https://docs.anthropic.com/en/docs/about-claude/models/overview | 官方文档 · anthropic.com · overview | 官方文档 · Anthropic · 模型列表 |
| web | anthropic/claude-haiku-4-5-20251001 | https://platform.claude.com/docs/en/models/overview | 官方文档 · claude.com · overview · platform.claude.com/docs/en/models/overview | 官方文档 · Claude · 模型列表 |
| web | recraft/recraftv4_1 | https://www.recraft.ai/docs/api-reference/models/recraft-v4-1 | 官方文档 · recraft.ai · recraft v4 1 | 官方文档 · Recraft · Recraft V4.1 |
| web | recraft/recraftv4_1 | https://www.recraft.ai/docs/api-reference/appendix | 官方文档 · recraft.ai · appendix | 官方文档 · Recraft · Appendix |
| web | recraft/recraftv4_1 | https://www.recraft.ai/docs/api-reference/tools/image-to-image | 官方文档 · recraft.ai · image to image | 官方文档 · Recraft · Image To Image |
| web | recraft/recraftv4_1 | https://www.recraft.ai/docs | 官方文档 · recraft.ai · docs | 官方文档 · Recraft · 文档首页 |
| web | recraft/recraftv4_1_flash | https://www.recraft.ai/docs/api-reference/models/recraft-v4-1-flash | 官方文档 · recraft.ai · recraft v4 1 flash | 官方文档 · Recraft · Recraft V4.1 Flash |
| web | recraft/recraftv4_1_flash | https://www.recraft.ai/docs/api-reference/appendix | 官方文档 · recraft.ai · appendix | 官方文档 · Recraft · Appendix |
| web | recraft/recraftv4_1_pro | https://www.recraft.ai/docs/api-reference/models/recraft-v4-1 | 官方文档 · recraft.ai · recraft v4 1 | 官方文档 · Recraft · Recraft V4.1 |
| web | recraft/recraftv4_1_pro | https://www.recraft.ai/docs/api-reference/appendix | 官方文档 · recraft.ai · appendix | 官方文档 · Recraft · Appendix |
| web | recraft/recraftv4_1_pro | https://www.recraft.ai/docs/api-reference/tools/image-to-image | 官方文档 · recraft.ai · image to image | 官方文档 · Recraft · Image To Image |
| web | recraft/recraftv4_1_pro | https://www.recraft.ai/docs | 官方文档 · recraft.ai · docs | 官方文档 · Recraft · 文档首页 |
| web | recraft/recraftv4_1_pro_vector | https://www.recraft.ai/docs/api-reference/models/recraft-v4-1 | 官方文档 · recraft.ai · recraft v4 1 | 官方文档 · Recraft · Recraft V4.1 |
| web | recraft/recraftv4_1_pro_vector | https://www.recraft.ai/docs/api-reference/appendix | 官方文档 · recraft.ai · appendix | 官方文档 · Recraft · Appendix |
| web | recraft/recraftv4_1_pro_vector | https://www.recraft.ai/docs/api-reference/tools/image-to-image | 官方文档 · recraft.ai · image to image | 官方文档 · Recraft · Image To Image |
| web | recraft/recraftv4_1_pro_vector | https://www.recraft.ai/docs | 官方文档 · recraft.ai · docs | 官方文档 · Recraft · 文档首页 |
| web | recraft/recraftv4_1_utility | https://www.recraft.ai/docs/api-reference/models/recraft-v4-1 | 官方文档 · recraft.ai · recraft v4 1 | 官方文档 · Recraft · Recraft V4.1 |
| web | recraft/recraftv4_1_utility | https://www.recraft.ai/docs/api-reference/appendix | 官方文档 · recraft.ai · appendix | 官方文档 · Recraft · Appendix |
| web | recraft/recraftv4_1_utility | https://www.recraft.ai/docs/api-reference/tools/image-to-image | 官方文档 · recraft.ai · image to image | 官方文档 · Recraft · Image To Image |
| web | recraft/recraftv4_1_utility | https://www.recraft.ai/docs | 官方文档 · recraft.ai · docs | 官方文档 · Recraft · 文档首页 |
| web | recraft/recraftv4_1_utility_pro | https://www.recraft.ai/docs/api-reference/models/recraft-v4-1 | 官方文档 · recraft.ai · recraft v4 1 | 官方文档 · Recraft · Recraft V4.1 |
| web | recraft/recraftv4_1_utility_pro | https://www.recraft.ai/docs/api-reference/appendix | 官方文档 · recraft.ai · appendix | 官方文档 · Recraft · Appendix |
| web | recraft/recraftv4_1_utility_pro | https://www.recraft.ai/docs/api-reference/tools/image-to-image | 官方文档 · recraft.ai · image to image | 官方文档 · Recraft · Image To Image |
| web | recraft/recraftv4_1_utility_pro | https://www.recraft.ai/docs | 官方文档 · recraft.ai · docs | 官方文档 · Recraft · 文档首页 |
| web | recraft/recraftv4_1_utility_pro_vector | https://www.recraft.ai/docs/api-reference/models/recraft-v4-1 | 官方文档 · recraft.ai · recraft v4 1 | 官方文档 · Recraft · Recraft V4.1 |
| web | recraft/recraftv4_1_utility_pro_vector | https://www.recraft.ai/docs/api-reference/appendix | 官方文档 · recraft.ai · appendix | 官方文档 · Recraft · Appendix |
| web | recraft/recraftv4_1_utility_pro_vector | https://www.recraft.ai/docs/api-reference/tools/image-to-image | 官方文档 · recraft.ai · image to image | 官方文档 · Recraft · Image To Image |
| web | recraft/recraftv4_1_utility_pro_vector | https://www.recraft.ai/docs | 官方文档 · recraft.ai · docs | 官方文档 · Recraft · 文档首页 |
| web | recraft/recraftv4_1_utility_vector | https://www.recraft.ai/docs/api-reference/models/recraft-v4-1 | 官方文档 · recraft.ai · recraft v4 1 | 官方文档 · Recraft · Recraft V4.1 |
| web | recraft/recraftv4_1_utility_vector | https://www.recraft.ai/docs/api-reference/appendix | 官方文档 · recraft.ai · appendix | 官方文档 · Recraft · Appendix |
| web | recraft/recraftv4_1_utility_vector | https://www.recraft.ai/docs/api-reference/tools/image-to-image | 官方文档 · recraft.ai · image to image | 官方文档 · Recraft · Image To Image |
| web | recraft/recraftv4_1_utility_vector | https://www.recraft.ai/docs | 官方文档 · recraft.ai · docs | 官方文档 · Recraft · 文档首页 |
| web | recraft/recraftv4_1_vector | https://www.recraft.ai/docs/api-reference/models/recraft-v4-1 | 官方文档 · recraft.ai · recraft v4 1 | 官方文档 · Recraft · Recraft V4.1 |
| web | recraft/recraftv4_1_vector | https://www.recraft.ai/docs/api-reference/appendix | 官方文档 · recraft.ai · appendix | 官方文档 · Recraft · Appendix |
| web | recraft/recraftv4_1_vector | https://www.recraft.ai/docs/api-reference/tools/image-to-image | 官方文档 · recraft.ai · image to image | 官方文档 · Recraft · Image To Image |
| web | recraft/recraftv4_1_vector | https://www.recraft.ai/docs | 官方文档 · recraft.ai · docs | 官方文档 · Recraft · 文档首页 |
| web | recraft/recraftv4 | https://www.recraft.ai/docs/api-reference/models/recraft-v4 | 官方文档 · recraft.ai · recraft v4 | 官方文档 · Recraft · Recraft V4 |
| web | recraft/recraftv4 | https://www.recraft.ai/docs/api-reference/appendix | 官方文档 · recraft.ai · appendix | 官方文档 · Recraft · Appendix |
| web | recraft/recraftv4 | https://www.recraft.ai/docs/api-reference/tools/image-to-image | 官方文档 · recraft.ai · image to image | 官方文档 · Recraft · Image To Image |
| web | recraft/recraftv4 | https://www.recraft.ai/docs | 官方文档 · recraft.ai · docs | 官方文档 · Recraft · 文档首页 |
| web | recraft/recraftv4_pro | https://www.recraft.ai/docs/api-reference/models/recraft-v4 | 官方文档 · recraft.ai · recraft v4 | 官方文档 · Recraft · Recraft V4 |
| web | recraft/recraftv4_pro | https://www.recraft.ai/docs/api-reference/appendix | 官方文档 · recraft.ai · appendix | 官方文档 · Recraft · Appendix |
| web | recraft/recraftv4_pro | https://www.recraft.ai/docs/api-reference/tools/image-to-image | 官方文档 · recraft.ai · image to image | 官方文档 · Recraft · Image To Image |
| web | recraft/recraftv4_pro | https://www.recraft.ai/docs | 官方文档 · recraft.ai · docs | 官方文档 · Recraft · 文档首页 |
| web | recraft/recraftv4_pro_vector | https://www.recraft.ai/docs/api-reference/models/recraft-v4 | 官方文档 · recraft.ai · recraft v4 | 官方文档 · Recraft · Recraft V4 |
| web | recraft/recraftv4_pro_vector | https://www.recraft.ai/docs/api-reference/appendix | 官方文档 · recraft.ai · appendix | 官方文档 · Recraft · Appendix |
| web | recraft/recraftv4_pro_vector | https://www.recraft.ai/docs/api-reference/tools/image-to-image | 官方文档 · recraft.ai · image to image | 官方文档 · Recraft · Image To Image |
| web | recraft/recraftv4_pro_vector | https://www.recraft.ai/docs | 官方文档 · recraft.ai · docs | 官方文档 · Recraft · 文档首页 |
| web | recraft/recraftv4_vector | https://www.recraft.ai/docs/api-reference/models/recraft-v4 | 官方文档 · recraft.ai · recraft v4 | 官方文档 · Recraft · Recraft V4 |
| web | recraft/recraftv4_vector | https://www.recraft.ai/docs/api-reference/appendix | 官方文档 · recraft.ai · appendix | 官方文档 · Recraft · Appendix |
| web | recraft/recraftv4_vector | https://www.recraft.ai/docs/api-reference/tools/image-to-image | 官方文档 · recraft.ai · image to image | 官方文档 · Recraft · Image To Image |
| web | recraft/recraftv4_vector | https://www.recraft.ai/docs | 官方文档 · recraft.ai · docs | 官方文档 · Recraft · 文档首页 |
| web | recraft/recraftv3 | https://www.recraft.ai/docs/api-reference/models/recraft-v3 | 官方文档 · recraft.ai · recraft v3 | 官方文档 · Recraft · Recraft V3 |
| web | recraft/recraftv3 | https://www.recraft.ai/docs/api-reference/appendix | 官方文档 · recraft.ai · appendix | 官方文档 · Recraft · Appendix |
| web | recraft/recraftv3 | https://www.recraft.ai/docs/api-reference/tools/image-to-image | 官方文档 · recraft.ai · image to image | 官方文档 · Recraft · Image To Image |
| web | recraft/recraftv3 | https://www.recraft.ai/docs | 官方文档 · recraft.ai · docs | 官方文档 · Recraft · 文档首页 |
| web | recraft/recraftv3_vector | https://www.recraft.ai/docs/api-reference/models/recraft-v3 | 官方文档 · recraft.ai · recraft v3 | 官方文档 · Recraft · Recraft V3 |
| web | recraft/recraftv3_vector | https://www.recraft.ai/docs/api-reference/appendix | 官方文档 · recraft.ai · appendix | 官方文档 · Recraft · Appendix |
| web | recraft/recraftv3_vector | https://www.recraft.ai/docs/api-reference/tools/image-to-image | 官方文档 · recraft.ai · image to image | 官方文档 · Recraft · Image To Image |
| web | recraft/recraftv3_vector | https://www.recraft.ai/docs | 官方文档 · recraft.ai · docs | 官方文档 · Recraft · 文档首页 |
| web | recraft/recraftv2 | https://www.recraft.ai/docs/api-reference/models/recraft-v2 | 官方文档 · recraft.ai · recraft v2 | 官方文档 · Recraft · Recraft V2 |
| web | recraft/recraftv2 | https://www.recraft.ai/docs/api-reference/appendix | 官方文档 · recraft.ai · appendix | 官方文档 · Recraft · Appendix |
| web | recraft/recraftv2 | https://www.recraft.ai/docs | 官方文档 · recraft.ai · docs | 官方文档 · Recraft · 文档首页 |
| web | recraft/recraftv2_vector | https://www.recraft.ai/docs/api-reference/models/recraft-v2 | 官方文档 · recraft.ai · recraft v2 | 官方文档 · Recraft · Recraft V2 |
| web | recraft/recraftv2_vector | https://www.recraft.ai/docs/api-reference/appendix | 官方文档 · recraft.ai · appendix | 官方文档 · Recraft · Appendix |
| web | recraft/recraftv2_vector | https://www.recraft.ai/docs | 官方文档 · recraft.ai · docs | 官方文档 · Recraft · 文档首页 |
| web | xai/grok-4.7 | https://docs.x.ai/developers/models/grok-4.7 | 官方文档 · x.ai · grok 4.7 | 官方文档 · xAI · Grok 4.7 |
| web | xai/grok-4.7 | https://docs.x.ai/docs/models | 官方文档 · x.ai · 模型列表 | 官方文档 · xAI · 模型列表 |
| web | xai/grok-4.6 | https://docs.x.ai/developers/models/grok-4.6 | 官方文档 · x.ai · grok 4.6 | 官方文档 · xAI · Grok 4.6 |
| web | xai/grok-4.6 | https://docs.x.ai/docs/models | 官方文档 · x.ai · 模型列表 | 官方文档 · xAI · 模型列表 |
| web | xai/grok-4.5 | https://docs.x.ai/developers/models/grok-4.5 | 官方文档 · x.ai · grok 4.5 | 官方文档 · xAI · Grok-4.5 |
| web | xai/grok-4.5 | https://docs.x.ai/docs/models | 官方文档 · x.ai · 模型列表 · docs.x.ai/docs/models | 官方文档 · xAI · 模型列表（文档） |
| web | xai/grok-4.5 | https://docs.x.ai/developers/models | 官方文档 · x.ai · 模型列表 · docs.x.ai/developers/models | 官方文档 · xAI · 模型列表（文档 2） |
| web | xai/grok-4.3 | https://docs.x.ai/developers/models/grok-4.3 | 官方文档 · x.ai · grok 4.3 | 官方文档 · xAI · Grok-4.3 |
| web | xai/grok-4.3 | https://docs.x.ai/docs/models | 官方文档 · x.ai · 模型列表 · docs.x.ai/docs/models | 官方文档 · xAI · 模型列表（文档） |
| web | xai/grok-4.3 | https://docs.x.ai/developers/models | 官方文档 · x.ai · 模型列表 · docs.x.ai/developers/models | 官方文档 · xAI · 模型列表（文档 2） |
| web | xai/grok-4.20-0309-non-reasoning | https://docs.x.ai/developers/models/grok-4.20-0309-non-reasoning | 官方文档 · x.ai · grok 4.20 0309 non reasoning | 官方文档 · xAI · Grok 4.20-0309 Non Reasoning |
| web | xai/grok-4.20-0309-non-reasoning | https://docs.x.ai/docs/models | 官方文档 · x.ai · 模型列表 · docs.x.ai/docs/models | 官方文档 · xAI · 模型列表（文档） |
| web | xai/grok-4.20-0309-non-reasoning | https://docs.x.ai/developers/models | 官方文档 · x.ai · 模型列表 · docs.x.ai/developers/models | 官方文档 · xAI · 模型列表（文档 2） |
| web | xai/grok-4.20-0309-reasoning | https://docs.x.ai/developers/models/grok-4.20-0309-reasoning | 官方文档 · x.ai · grok 4.20 0309 reasoning | 官方文档 · xAI · Grok 4.20-0309 Reasoning |
| web | xai/grok-4.20-0309-reasoning | https://docs.x.ai/docs/models | 官方文档 · x.ai · 模型列表 · docs.x.ai/docs/models | 官方文档 · xAI · 模型列表（文档） |
| web | xai/grok-4.20-0309-reasoning | https://docs.x.ai/developers/models | 官方文档 · x.ai · 模型列表 · docs.x.ai/developers/models | 官方文档 · xAI · 模型列表（文档 2） |
| web | xai/grok-4.20-multi-agent | https://docs.x.ai/developers/models/grok-4.20-multi-agent-0309 | 官方文档 · x.ai · grok 4.20 multi agent 0309 | 官方文档 · xAI · Grok 4.20 Multi Agent 0309 |
| web | xai/grok-4.20-multi-agent | https://docs.x.ai/docs/models | 官方文档 · x.ai · 模型列表 · docs.x.ai/docs/models | 官方文档 · xAI · 模型列表（文档） |
| web | xai/grok-4.20-multi-agent | https://docs.x.ai/developers/models | 官方文档 · x.ai · 模型列表 · docs.x.ai/developers/models | 官方文档 · xAI · 模型列表（文档 2） |
| web | xai/grok-4.20-multi-agent-0309 | https://docs.x.ai/developers/models/grok-4.20-multi-agent-0309 | 官方文档 · x.ai · grok 4.20 multi agent 0309 | 官方文档 · xAI · Grok 4.20 Multi Agent 0309 |
| web | xai/grok-4.20-multi-agent-0309 | https://docs.x.ai/docs/models | 官方文档 · x.ai · 模型列表 · docs.x.ai/docs/models | 官方文档 · xAI · 模型列表（文档） |
| web | xai/grok-4.20-multi-agent-0309 | https://docs.x.ai/developers/models | 官方文档 · x.ai · 模型列表 · docs.x.ai/developers/models | 官方文档 · xAI · 模型列表（文档 2） |
| web | xai/grok-imagine-image-2.0 | https://docs.x.ai/developers/models/grok-imagine-image-2.0 | 官方文档 · x.ai · grok imagine image 2.0 | 官方文档 · xAI · Grok Imagine Image 2.0 |
| web | xai/grok-imagine-image-2.0 | https://docs.x.ai/docs/models | 官方文档 · x.ai · 模型列表 · docs.x.ai/docs/models | 官方文档 · xAI · 模型列表（文档） |
| web | xai/grok-imagine-image-2.0 | https://docs.x.ai/developers/models | 官方文档 · x.ai · 模型列表 · docs.x.ai/developers/models | 官方文档 · xAI · 模型列表（文档 2） |
| web | xai/grok-imagine-image | https://docs.x.ai/developers/models/grok-imagine-image | 官方文档 · x.ai · grok imagine image | 官方文档 · xAI · Grok Imagine Image |
| web | xai/grok-imagine-image | https://docs.x.ai/docs/models | 官方文档 · x.ai · 模型列表 · docs.x.ai/docs/models | 官方文档 · xAI · 模型列表（文档） |
| web | xai/grok-imagine-image | https://docs.x.ai/developers/models | 官方文档 · x.ai · 模型列表 · docs.x.ai/developers/models | 官方文档 · xAI · 模型列表（文档 2） |
| web | xai/grok-imagine-image-quality | https://docs.x.ai/developers/models/grok-imagine-image-quality | 官方文档 · x.ai · grok imagine image quality · docs.x.ai/developers/models/grok-imagine-image-quality | 官方文档 · xAI · Grok Imagine Image Quality（文档） |
| web | xai/grok-imagine-image-quality | https://docs.x.ai/docs/models | 官方文档 · x.ai · 模型列表 | 官方文档 · xAI · 模型列表 |
| web | xai/grok-imagine-image-quality | https://docs.x.ai/docs/models/grok-imagine-image-quality | 官方文档 · x.ai · grok imagine image quality · docs.x.ai/docs/models/grok-imagine-image-quality | 官方文档 · xAI · Grok Imagine Image Quality（文档 2） |
| web | xai/grok-imagine-image-quality | https://docs.x.ai/developers/migration/imagine-image-quality-nov-2 | 下线公告 · x.ai · imagine image quality nov 2 | 下线公告 · xAI · Imagine Image Quality Nov 2 |
| web | xai/grok-build-0.1 | https://docs.x.ai/developers/models/grok-build-0.1 | 官方文档 · x.ai · grok build 0.1 · docs.x.ai/developers/models/grok-build-0.1 | 官方文档 · xAI · Grok Build 0.1（文档） |
| web | xai/grok-build-0.1 | https://docs.x.ai/docs/models | 官方文档 · x.ai · 模型列表 | 官方文档 · xAI · 模型列表 |
| web | xai/grok-build-0.1 | https://docs.x.ai/docs/models/grok-build-0.1 | 官方文档 · x.ai · grok build 0.1 · docs.x.ai/docs/models/grok-build-0.1 | 官方文档 · xAI · Grok Build 0.1（文档 2） |
| web | gemini/gemini-4-argon | https://ai.google.dev/gemini-api/docs/models/gemini-4-argon | 官方文档 · ai.google.dev · gemini 4 argon | 官方文档 · Google · Gemini 4 Argon |
| web | gemini/gemini-4-argon | https://ai.google.dev/gemini-api/docs/generate-content/thinking | 官方文档 · ai.google.dev · thinking | 官方文档 · Google · Thinking |
| web | gemini/gemini-4-argon | https://ai.google.dev/gemini-api/docs/pricing | 官方文档 · ai.google.dev · 价格与规格 | 官方文档 · Google · 价格与规格 |
| web | gemini/gemini-nano-banana-2.1 | https://ai.google.dev/gemini-api/docs/models/gemini-nano-banana-2.1 | 官方文档 · ai.google.dev · gemini nano banana 2.1 | 官方文档 · Google · Nano Banana 2.1 |
| web | gemini/gemini-nano-banana-2.1 | https://ai.google.dev/gemini-api/docs/image-generation | 官方文档 · ai.google.dev · image generation | 官方文档 · Google · Image Generation |
| web | gemini/gemini-nano-banana-2.1 | https://ai.google.dev/gemini-api/docs/generate-content/thinking | 官方文档 · ai.google.dev · thinking | 官方文档 · Google · Thinking |
| web | gemini/gemini-3.8-flash | https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash | 官方文档 · ai.google.dev · gemini 3.8 flash | 官方文档 · Google · Gemini 3.8 Flash |
| web | gemini/gemini-3.8-flash | https://ai.google.dev/gemini-api/docs/generate-content/image-understanding | 官方文档 · ai.google.dev · image understanding | 官方文档 · Google · Image Understanding |
| web | gemini/gemini-3.8-flash | https://ai.google.dev/gemini-api/docs/generate-content/thinking | 官方文档 · ai.google.dev · thinking | 官方文档 · Google · Thinking |
| web | gemini/gemini-3.8-flash | https://ai.google.dev/gemini-api/docs/models | 官方文档 · ai.google.dev · 模型列表 | 官方文档 · Google · 模型列表 |
| web | gemini/gemini-3.7-flash | https://ai.google.dev/gemini-api/docs/models/gemini-3.7-flash | 官方文档 · ai.google.dev · gemini 3.7 flash | 官方文档 · Google · Gemini 3.7 Flash |
| web | gemini/gemini-3.7-flash | https://ai.google.dev/gemini-api/docs/generate-content/image-understanding | 官方文档 · ai.google.dev · image understanding | 官方文档 · Google · Image Understanding |
| web | gemini/gemini-3.7-flash | https://ai.google.dev/gemini-api/docs/generate-content/thinking | 官方文档 · ai.google.dev · thinking | 官方文档 · Google · Thinking |
| web | gemini/gemini-3.7-flash | https://ai.google.dev/gemini-api/docs/models | 官方文档 · ai.google.dev · 模型列表 | 官方文档 · Google · 模型列表 |
| web | gemini/gemini-3.6-flash | https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash | 官方文档 · ai.google.dev · gemini 3.6 flash | 官方文档 · Google · Gemini 3.6 Flash |
| web | gemini/gemini-3.6-flash | https://ai.google.dev/gemini-api/docs/generate-content/image-understanding | 官方文档 · ai.google.dev · image understanding | 官方文档 · Google · Image Understanding |
| web | gemini/gemini-3.6-flash | https://ai.google.dev/gemini-api/docs/generate-content/thinking | 官方文档 · ai.google.dev · thinking | 官方文档 · Google · Thinking |
| web | gemini/gemini-3.6-flash | https://ai.google.dev/gemini-api/docs/models | 官方文档 · ai.google.dev · 模型列表 | 官方文档 · Google · 模型列表 |
| web | gemini/gemini-3.5-flash-lite | https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite | 官方文档 · ai.google.dev · gemini 3.5 flash lite | 官方文档 · Google · Gemini 3.5 Flash-Lite |
| web | gemini/gemini-3.5-flash-lite | https://ai.google.dev/gemini-api/docs/generate-content/image-understanding | 官方文档 · ai.google.dev · image understanding | 官方文档 · Google · Image Understanding |
| web | gemini/gemini-3.5-flash-lite | https://ai.google.dev/gemini-api/docs/generate-content/thinking | 官方文档 · ai.google.dev · thinking | 官方文档 · Google · Thinking |
| web | gemini/gemini-3.5-flash-lite | https://ai.google.dev/gemini-api/docs/models | 官方文档 · ai.google.dev · 模型列表 | 官方文档 · Google · 模型列表 |
| web | gemini/gemini-3.1-flash-lite-image | https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite-image | 官方文档 · ai.google.dev · gemini 3.1 flash lite image | 官方文档 · Google · Gemini 3.1 Flash Lite Image（Nano Banana 2 Lite） |
| web | gemini/gemini-3.1-flash-lite-image | https://ai.google.dev/gemini-api/docs/models | 官方文档 · ai.google.dev · 模型列表 | 官方文档 · Google · 模型列表 |
| web | gemini/gemini-3.1-flash-lite-image | https://ai.google.dev/gemini-api/docs/image-generation | 官方文档 · ai.google.dev · image generation | 官方文档 · Google · Image Generation |
| web | gemini/gemini-3.1-flash-lite-image | https://ai.google.dev/gemini-api/docs/generate-content/thinking | 官方文档 · ai.google.dev · thinking | 官方文档 · Google · Thinking |
| web | gemini/gemini-3.1-flash-image | https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-image | 官方文档 · ai.google.dev · gemini 3.1 flash image | 官方文档 · Google · Gemini 3.1 Flash Image（Nano Banana 2） |
| web | gemini/gemini-3.1-flash-image | https://ai.google.dev/gemini-api/docs/models | 官方文档 · ai.google.dev · 模型列表 | 官方文档 · Google · 模型列表 |
| web | gemini/gemini-3.1-flash-image | https://ai.google.dev/gemini-api/docs/image-generation | 官方文档 · ai.google.dev · image generation | 官方文档 · Google · Image Generation |
| web | gemini/gemini-3.1-flash-image | https://ai.google.dev/gemini-api/docs/generate-content/thinking | 官方文档 · ai.google.dev · thinking | 官方文档 · Google · Thinking |
| web | gemini/gemini-3-pro-image | https://ai.google.dev/gemini-api/docs/models/gemini-3-pro-image | 官方文档 · ai.google.dev · gemini 3 pro image | 官方文档 · Google · Gemini 3 Pro Image（Nano Banana Pro） |
| web | gemini/gemini-3-pro-image | https://ai.google.dev/gemini-api/docs/models | 官方文档 · ai.google.dev · 模型列表 | 官方文档 · Google · 模型列表 |
| web | gemini/gemini-3-pro-image | https://ai.google.dev/gemini-api/docs/image-generation | 官方文档 · ai.google.dev · image generation | 官方文档 · Google · Image Generation |
| web | gemini/gemini-3-pro-image | https://ai.google.dev/gemini-api/docs/generate-content/thinking | 官方文档 · ai.google.dev · thinking | 官方文档 · Google · Thinking |
| web | gemini/gemini-3.5-flash | https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash | 官方文档 · ai.google.dev · gemini 3.5 flash | 官方文档 · Google · Gemini 3.5 Flash |
| web | gemini/gemini-3.5-flash | https://ai.google.dev/gemini-api/docs/generate-content/image-understanding | 官方文档 · ai.google.dev · image understanding | 官方文档 · Google · Image Understanding |
| web | gemini/gemini-3.5-flash | https://ai.google.dev/gemini-api/docs/generate-content/thinking | 官方文档 · ai.google.dev · thinking | 官方文档 · Google · Thinking |
| web | gemini/gemini-3.5-flash | https://ai.google.dev/gemini-api/docs/models | 官方文档 · ai.google.dev · 模型列表 | 官方文档 · Google · 模型列表 |
| web | gemini/gemini-3.1-flash-lite | https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite | 官方文档 · ai.google.dev · gemini 3.1 flash lite | 官方文档 · Google · Gemini 3.1 Flash-Lite |
| web | gemini/gemini-3.1-flash-lite | https://ai.google.dev/gemini-api/docs/generate-content/image-understanding | 官方文档 · ai.google.dev · image understanding | 官方文档 · Google · Image Understanding |
| web | gemini/gemini-3.1-flash-lite | https://ai.google.dev/gemini-api/docs/generate-content/thinking | 官方文档 · ai.google.dev · thinking | 官方文档 · Google · Thinking |
| web | gemini/gemini-3.1-flash-lite | https://ai.google.dev/gemini-api/docs/models | 官方文档 · ai.google.dev · 模型列表 | 官方文档 · Google · 模型列表 |
| web | gemini/gemini-3.1-pro-preview | https://ai.google.dev/gemini-api/docs/models/gemini-3.1-pro-preview | 官方文档 · ai.google.dev · gemini 3.1 pro preview | 官方文档 · Google · Gemini 3.1 Pro Preview |
| web | gemini/gemini-3.1-pro-preview | https://ai.google.dev/gemini-api/docs/generate-content/image-understanding | 官方文档 · ai.google.dev · image understanding | 官方文档 · Google · Image Understanding |
| web | gemini/gemini-3.1-pro-preview | https://ai.google.dev/gemini-api/docs/generate-content/thinking | 官方文档 · ai.google.dev · thinking | 官方文档 · Google · Thinking |
| web | gemini/gemini-3.1-pro-preview | https://ai.google.dev/gemini-api/docs/models | 官方文档 · ai.google.dev · 模型列表 | 官方文档 · Google · 模型列表 |
| web | gemini/gemini-3-flash-preview | https://ai.google.dev/gemini-api/docs/models/gemini-3-flash-preview | 官方文档 · ai.google.dev · gemini 3 flash preview | 官方文档 · Google · Gemini 3 Flash Preview |
| web | gemini/gemini-3-flash-preview | https://ai.google.dev/gemini-api/docs/generate-content/image-understanding | 官方文档 · ai.google.dev · image understanding | 官方文档 · Google · Image Understanding |
| web | gemini/gemini-3-flash-preview | https://ai.google.dev/gemini-api/docs/generate-content/thinking | 官方文档 · ai.google.dev · thinking | 官方文档 · Google · Thinking |
| web | gemini/gemini-3-flash-preview | https://ai.google.dev/gemini-api/docs/models | 官方文档 · ai.google.dev · 模型列表 | 官方文档 · Google · 模型列表 |
| web | gemini/gemini-2.5-flash | https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash | 官方文档 · ai.google.dev · gemini 2.5 flash | 官方文档 · Google · Gemini 2.5 Flash |
| web | gemini/gemini-2.5-flash | https://ai.google.dev/gemini-api/docs/generate-content/image-understanding | 官方文档 · ai.google.dev · image understanding | 官方文档 · Google · Image Understanding |
| web | gemini/gemini-2.5-flash | https://ai.google.dev/gemini-api/docs/generate-content/thinking | 官方文档 · ai.google.dev · thinking | 官方文档 · Google · Thinking |
| web | gemini/gemini-2.5-flash | https://ai.google.dev/gemini-api/docs/models | 官方文档 · ai.google.dev · 模型列表 | 官方文档 · Google · 模型列表 |
| web | gemini/gemini-2.5-flash-image | https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-image | 官方文档 · ai.google.dev · gemini 2.5 flash image | 官方文档 · Google · Gemini 2.5 Flash Image（Nano Banana） |
| web | gemini/gemini-2.5-flash-image | https://ai.google.dev/gemini-api/docs/models | 官方文档 · ai.google.dev · 模型列表 | 官方文档 · Google · 模型列表 |
| web | gemini/gemini-2.5-flash-image | https://ai.google.dev/gemini-api/docs/image-generation | 官方文档 · ai.google.dev · image generation | 官方文档 · Google · Image Generation |
| web | gemini/gemini-2.5-flash-image | https://ai.google.dev/gemini-api/docs/generate-content/thinking | 官方文档 · ai.google.dev · thinking | 官方文档 · Google · Thinking |
| web | gemini/gemini-2.5-flash-lite | https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-lite | 官方文档 · ai.google.dev · gemini 2.5 flash lite | 官方文档 · Google · Gemini 2.5 Flash-Lite |
| web | gemini/gemini-2.5-flash-lite | https://ai.google.dev/gemini-api/docs/generate-content/image-understanding | 官方文档 · ai.google.dev · image understanding | 官方文档 · Google · Image Understanding |
| web | gemini/gemini-2.5-flash-lite | https://ai.google.dev/gemini-api/docs/generate-content/thinking | 官方文档 · ai.google.dev · thinking | 官方文档 · Google · Thinking |
| web | gemini/gemini-2.5-flash-lite | https://ai.google.dev/gemini-api/docs/models | 官方文档 · ai.google.dev · 模型列表 | 官方文档 · Google · 模型列表 |
| web | gemini/gemini-2.5-pro | https://ai.google.dev/gemini-api/docs/models/gemini-2.5-pro | 官方文档 · ai.google.dev · gemini 2.5 pro | 官方文档 · Google · Gemini 2.5 Pro |
| web | gemini/gemini-2.5-pro | https://ai.google.dev/gemini-api/docs/generate-content/image-understanding | 官方文档 · ai.google.dev · image understanding | 官方文档 · Google · Image Understanding |
| web | gemini/gemini-2.5-pro | https://ai.google.dev/gemini-api/docs/generate-content/thinking | 官方文档 · ai.google.dev · thinking | 官方文档 · Google · Thinking |
| web | gemini/gemini-2.5-pro | https://ai.google.dev/gemini-api/docs/models | 官方文档 · ai.google.dev · 模型列表 | 官方文档 · Google · 模型列表 |
| web | bailian/deepseek-v4.1-flash | https://help.aliyun.com/zh/model-studio/deepseek-v4-1-flash | 官方文档 · 百炼 · DeepSeek-V4.1-Flash 模型页 | 官方文档 · 百炼 · DeepSeek-V4.1-Flash |
| web | bailian/deepseek-v4.1-flash | https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash | 官方文档 · Hugging Face · DeepSeek V4.1 Flash | 官方文档 · Hugging Face · DeepSeek-V4.1-Flash |
| web | bailian/qwen3.8-max-0902 | https://help.aliyun.com/zh/model-studio/qwen3-8-max | 官方文档 · 百炼 · qwen3 8 max | 官方文档 · 百炼 · Qwen3.8 Max |
| web | bailian/ZHIPU/GLM-5.3-Flash | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5.3-flash | 官方文档 · bigmodel.cn · glm 5.3 flash | 官方文档 · 智谱 · GLM 5.3 Flash |
| web | bailian/qwen3.8-flash | https://help.aliyun.com/zh/model-studio/vision-model | 官方文档 · 百炼 · vision model | 官方文档 · 百炼 · Vision Model |
| web | bailian/qwen3.8-flash | https://help.aliyun.com/zh/model-studio/text-generation-model | 官方文档 · 百炼 · text generation model | 官方文档 · 百炼 · Text Generation Model |
| web | bailian/kimi-k3 | https://help.aliyun.com/zh/model-studio/kimi-k3 | 官方文档 · 百炼 · Kimi-K3 模型页 | 官方文档 · 百炼 · Kimi K3 (Bailian hosted) |
| web | bailian/kimi-k3 | https://huggingface.co/moonshotai/Kimi-K3 | 官方文档 · Hugging Face · Kimi K3 | 官方文档 · Hugging Face · Kimi K3 (Bailian hosted) |
| web | bailian/qwen3.8-27b | https://help.aliyun.com/zh/model-studio/qwen3-8-27b | 官方文档 · 百炼 · qwen3 8 27b | 官方文档 · 百炼 · Qwen3.8 27B |
| web | bailian/ZHIPU/GLM-5.3 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.3 | 官方文档 · bigmodel.cn · glm 5.3 | 官方文档 · 智谱 · GLM 5.3 |
| web | bailian/qwen3.8-2.4t-a95b | https://help.aliyun.com/zh/model-studio/qwen3-8-2-4t-a95b | 官方文档 · 百炼 · qwen3 8 2 4t a95b | 官方文档 · 百炼 · Qwen3.8 2.4T A95B |
| web | bailian/MiniMax/MiniMax-M3 | https://help.aliyun.com/zh/model-studio/models | 官方文档 · 百炼 · 模型列表 · help.aliyun.com/zh/model-studio/models | 官方文档 · 百炼 · 模型列表（文档） |
| web | bailian/MiniMax/MiniMax-M3 | https://help.aliyun.com/en/model-studio/models | 官方文档 · 百炼 · 模型列表 · help.aliyun.com/en/model-studio/models | 官方文档 · 百炼 · 模型列表（英文） |
| web | bailian/MiniMax/MiniMax-M2.7 | https://huggingface.co/MiniMaxAI/MiniMax-M2.7 | 官方文档 · Hugging Face · MiniMax M2.7 | 官方文档 · Hugging Face · MiniMax-M2.7 |
| web | bailian/MiniMax/MiniMax-M2.7 | https://platform.minimax.io/docs/api-reference/text-openai-api | 官方文档 · minimax.io · text openai api | 官方文档 · MiniMax · Text OpenAI API |
| web | bailian/MiniMax-M2.5 | https://huggingface.co/MiniMaxAI/MiniMax-M2.5 | 官方文档 · Hugging Face · MiniMax M2.5 | 官方文档 · Hugging Face · MiniMax-M2.5 |
| web | bailian/MiniMax-M2.5 | https://platform.minimax.io/docs/api-reference/text-openai-api | 官方文档 · minimax.io · text openai api | 官方文档 · MiniMax · Text OpenAI API |
| web | bailian/MiniMax/MiniMax-M2.5 | https://huggingface.co/MiniMaxAI/MiniMax-M2.5 | 官方文档 · Hugging Face · MiniMax M2.5 | 官方文档 · Hugging Face · MiniMax-M2.5 |
| web | bailian/MiniMax/MiniMax-M2.5 | https://platform.minimax.io/docs/api-reference/text-openai-api | 官方文档 · minimax.io · text openai api | 官方文档 · MiniMax · Text OpenAI API |
| web | bailian/ZHIPU/GLM-5.3-FlashX | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5.3-flash | 官方文档 · bigmodel.cn · glm 5.3 flash | 官方文档 · 智谱 · GLM 5.3 Flash |
| web | bailian/ZHIPU/GLM-5.2 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.2 | 官方文档 · bigmodel.cn · glm 5.2 | 官方文档 · 智谱 · GLM-5.2 |
| web | bailian/deepseek-v4.1-flash-1017 | https://help.aliyun.com/zh/model-studio/deepseek-api | 官方文档 · 百炼 · deepseek api | 官方文档 · 百炼 · DeepSeek API |
| web | bailian/deepseek-v4.1-flash-1017 | https://help.aliyun.com/zh/model-studio/rate-limit | 官方文档 · 百炼 · rate limit | 官方文档 · 百炼 · Rate Limit |
| web | bailian/deepseek-v4.1-flash-1017 | https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-chat-completions | 官方文档 · 百炼 · qwen api via openai chat completions | 官方文档 · 百炼 · Qwen API Via OpenAI Chat Completions |
| web | bailian/deepseek-v4.1-flash-1017 | https://help.aliyun.com/zh/model-studio/context-cache | 官方文档 · 百炼 · context cache | 官方文档 · 百炼 · Context Cache |
| web | bailian/deepseek-v4-pro-0813 | https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro-0813 | 官方文档 · Hugging Face · DeepSeek V4 Pro 0813 | 官方文档 · Hugging Face · DeepSeek-V4-Pro-0813 |
| web | bailian/vanchin/deepseek-v4-pro-0813 | https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro-0813 | 官方文档 · Hugging Face · DeepSeek V4 Pro 0813 | 官方文档 · Hugging Face · DeepSeek-V4-Pro 0813 |
| web | bailian/vanchin/deepseek-v4-pro-0813 | https://help.aliyun.com/zh/model-studio/deepseek-api-by-vanchin | 官方文档 · 百炼 · deepseek api by vanchin | 官方文档 · 百炼 · DeepSeek API By Vanchin |
| web | bailian/qwen-image-3.0 | https://help.aliyun.com/zh/model-studio/qwen-image-3-0 | 官方文档 · 百炼 · qwen image 3 0 | 官方文档 · 百炼 · Qwen Image 3.0 |
| web | bailian/qwen-image-3.0 | https://help.aliyun.com/zh/model-studio/qwen-image-generation-and-editing-api-reference | 官方文档 · 百炼 · qwen image generation and editing api reference | 官方文档 · 百炼 · Qwen Image Generation And Editing API Reference |
| web | bailian/qwen-image-3.0-pro | https://help.aliyun.com/zh/model-studio/qwen-image-3-0-pro | 官方文档 · 百炼 · qwen image 3 0 pro | 官方文档 · 百炼 · Qwen Image 3.0 Pro |
| web | bailian/qwen-image-3.0-pro | https://help.aliyun.com/zh/model-studio/models | 官方文档 · 百炼 · 模型列表 · help.aliyun.com/zh/model-studio/models | 官方文档 · 百炼 · 模型列表（文档） |
| web | bailian/qwen-image-3.0-pro | https://help.aliyun.com/en/model-studio/models | 官方文档 · 百炼 · 模型列表 · help.aliyun.com/en/model-studio/models | 官方文档 · 百炼 · 模型列表（英文） |
| web | bailian/qwen3.8-max | https://help.aliyun.com/zh/model-studio/qwen3-8-max | 官方文档 · 百炼 · qwen3 8 max | 官方文档 · 百炼 · Qwen3.8 Max |
| web | bailian/deepseek-v4-flash-0731 | https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731 | 官方文档 · Hugging Face · DeepSeek V4 Flash 0731 | 官方文档 · Hugging Face · DeepSeek-V4-Flash-0731 |
| web | bailian/qwen3.7-flash | https://help.aliyun.com/zh/model-studio/models | 官方文档 · 百炼 · 模型列表 · help.aliyun.com/zh/model-studio/models | 官方文档 · 百炼 · 模型列表（文档） |
| web | bailian/qwen3.7-flash | https://help.aliyun.com/en/model-studio/models | 官方文档 · 百炼 · 模型列表 · help.aliyun.com/en/model-studio/models | 官方文档 · 百炼 · 模型列表（英文） |
| web | bailian/deepseek-v4-pro | https://help.aliyun.com/zh/model-studio/models | 官方文档 · 百炼 · 模型列表 · help.aliyun.com/zh/model-studio/models | 官方文档 · 百炼 · 模型列表（文档） |
| web | bailian/deepseek-v4-pro | https://help.aliyun.com/en/model-studio/models | 官方文档 · 百炼 · 模型列表 · help.aliyun.com/en/model-studio/models | 官方文档 · 百炼 · 模型列表（英文） |
| web | bailian/deepseek-v4-pro | https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro | 官方文档 · Hugging Face · DeepSeek V4 Pro | 官方文档 · Hugging Face · DeepSeek-V4-Pro |
| web | bailian/glm-5.2 | https://help.aliyun.com/zh/model-studio/glm-5-2 | 官方文档 · 百炼 · glm 5 2 | 官方文档 · 百炼 · GLM 5.2 |
| web | bailian/glm-5.2 | https://help.aliyun.com/zh/model-studio/models | 官方文档 · 百炼 · 模型列表 · help.aliyun.com/zh/model-studio/models | 官方文档 · 百炼 · 模型列表（文档） |
| web | bailian/glm-5.2 | https://help.aliyun.com/en/model-studio/models | 官方文档 · 百炼 · 模型列表 · help.aliyun.com/en/model-studio/models | 官方文档 · 百炼 · 模型列表（英文） |
| web | bailian/glm-5.2 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.2 | 官方文档 · bigmodel.cn · glm 5.2 | 官方文档 · 智谱 · GLM 5.2 |
| web | bailian/glm-5.2-fast-preview | https://www.qianwenai.com/models/glm-5.2-fast-preview | 官方文档 · qianwenai.com · glm 5.2 fast preview | 官方文档 · 千问 · GLM 5.2 Fast Preview |
| web | bailian/ZHIPU/GLM-5.1 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.1 | 官方文档 · bigmodel.cn · glm 5.1 | 官方文档 · 智谱 · GLM-5.1 |
| web | bailian/glm-5.1 | https://help.aliyun.com/zh/model-studio/glm-5-1 | 官方文档 · 百炼 · glm 5 1 | 官方文档 · 百炼 · GLM-5.1 |
| web | bailian/glm-5.1 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.1 | 官方文档 · bigmodel.cn · glm 5.1 | 官方文档 · 智谱 · GLM-5.1 |
| web | bailian/ZHIPU/GLM-5 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5 | 官方文档 · bigmodel.cn · glm 5 | 官方文档 · 智谱 · GLM-5 |
| web | bailian/glm-5 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5 | 官方文档 · bigmodel.cn · glm 5 | 官方文档 · 智谱 · GLM-5 |
| web | bailian/kimi/kimi-k3 | https://help.aliyun.com/zh/model-studio/models | 官方文档 · 百炼 · 模型列表 · help.aliyun.com/zh/model-studio/models | 官方文档 · 百炼 · 模型列表（文档） |
| web | bailian/kimi/kimi-k3 | https://help.aliyun.com/en/model-studio/models | 官方文档 · 百炼 · 模型列表 · help.aliyun.com/en/model-studio/models | 官方文档 · 百炼 · 模型列表（英文） |
| web | bailian/kimi-k2.7-code | https://help.aliyun.com/zh/model-studio/kimi-k2-7-code | 官方文档 · 百炼 · kimi k2 7 code | 官方文档 · 百炼 · Kimi K2.7 Code |
| web | bailian/kimi-k2.6 | https://help.aliyun.com/zh/model-studio/kimi-k2-6 | 官方文档 · 百炼 · kimi k2 6 | 官方文档 · 百炼 · Kimi-k2.6 |
| web | bailian/kimi-k2.6 | https://huggingface.co/moonshotai/Kimi-K2.6 | 官方文档 · Hugging Face · Kimi K2.6 | 官方文档 · Hugging Face · Kimi-k2.6 |
| web | bailian/kimi/kimi-k2.6 | https://huggingface.co/moonshotai/Kimi-K2.6 | 官方文档 · Hugging Face · Kimi K2.6 | 官方文档 · Hugging Face · Kimi-k2.6 |
| web | bailian/kimi-k2.5 | https://help.aliyun.com/zh/model-studio/kimi-k2-5 | 官方文档 · 百炼 · kimi k2 5 | 官方文档 · 百炼 · Kimi-k2.5 |
| web | bailian/kimi-k2.5 | https://huggingface.co/moonshotai/Kimi-K2.5 | 官方文档 · Hugging Face · Kimi K2.5 | 官方文档 · Hugging Face · Kimi-k2.5 |
| web | bailian/kimi/kimi-k2.5 | https://huggingface.co/moonshotai/Kimi-K2.5 | 官方文档 · Hugging Face · Kimi K2.5 | 官方文档 · Hugging Face · Kimi-k2.5 |
| web | bailian/qwen-image-2.1-pro | https://help.aliyun.com/zh/model-studio/qwen-image-2-1-pro | 官方文档 · 百炼 · qwen image 2 1 pro | 官方文档 · 百炼 · Qwen Image 2.1 Pro |
| web | bailian/qwen-image-2.1-pro | https://help.aliyun.com/zh/model-studio/qwen-image-generation-and-editing-api-reference | 官方文档 · 百炼 · qwen image generation and editing api reference | 官方文档 · 百炼 · Qwen Image Generation And Editing API Reference |
| web | bailian/qwen-image-2.1-turbo | https://help.aliyun.com/zh/model-studio/qwen-image-2-1-turbo | 官方文档 · 百炼 · qwen image 2 1 turbo | 官方文档 · 百炼 · Qwen Image 2.1 Turbo |
| web | bailian/qwen-image-2.1-turbo | https://help.aliyun.com/zh/model-studio/qwen-image-generation-and-editing-api-reference | 官方文档 · 百炼 · qwen image generation and editing api reference | 官方文档 · 百炼 · Qwen Image Generation And Editing API Reference |
| web | bailian/qwen-image-2.0-pro-2026-06-22 | https://help.aliyun.com/zh/model-studio/qwen-image-2-0-pro | 官方文档 · 百炼 · qwen image 2 0 pro | 官方文档 · 百炼 · Qwen Image 2.0 Pro |
| web | bailian/qwen-image-2.0 | https://help.aliyun.com/zh/model-studio/qwen-image-2-0 | 官方文档 · 百炼 · qwen image 2 0 | 官方文档 · 百炼 · Qwen Image 2.0 |
| web | bailian/qwen-image-2.0 | https://help.aliyun.com/zh/model-studio/models | 官方文档 · 百炼 · 模型列表 · help.aliyun.com/zh/model-studio/models | 官方文档 · 百炼 · 模型列表（文档） |
| web | bailian/qwen-image-2.0 | https://help.aliyun.com/en/model-studio/models | 官方文档 · 百炼 · 模型列表 · help.aliyun.com/en/model-studio/models | 官方文档 · 百炼 · 模型列表（英文） |
| web | bailian/qwen-image-2.0-2026-03-03 | https://help.aliyun.com/zh/model-studio/qwen-image-2-0 | 官方文档 · 百炼 · qwen image 2 0 | 官方文档 · 百炼 · Qwen Image 2.0 |
| web | bailian/qwen-image-2.0-pro | https://help.aliyun.com/zh/model-studio/qwen-image-2-0-pro | 官方文档 · 百炼 · qwen image 2 0 pro | 官方文档 · 百炼 · Qwen Image 2.0 Pro |
| web | bailian/qwen-image-2.0-pro | https://help.aliyun.com/zh/model-studio/models | 官方文档 · 百炼 · 模型列表 · help.aliyun.com/zh/model-studio/models | 官方文档 · 百炼 · 模型列表（文档） |
| web | bailian/qwen-image-2.0-pro | https://help.aliyun.com/en/model-studio/models | 官方文档 · 百炼 · 模型列表 · help.aliyun.com/en/model-studio/models | 官方文档 · 百炼 · 模型列表（英文） |
| web | bailian/qwen-image-2.0-pro-2026-03-03 | https://help.aliyun.com/zh/model-studio/qwen-image-2-0-pro | 官方文档 · 百炼 · qwen image 2 0 pro | 官方文档 · 百炼 · Qwen Image 2.0 Pro |
| web | bailian/qwen-image-2.0-pro-2026-04-22 | https://help.aliyun.com/zh/model-studio/qwen-image-2-0-pro | 官方文档 · 百炼 · qwen image 2 0 pro | 官方文档 · 百炼 · Qwen Image 2.0 Pro |
| web | bailian/qwen-image | https://help.aliyun.com/zh/model-studio/qwen-image-api | 官方文档 · 百炼 · qwen image api | 官方文档 · 百炼 · Qwen Image API |
| web | bailian/qwen3.7-max | https://help.aliyun.com/zh/model-studio/qwen3-7-max | 官方文档 · 百炼 · qwen3 7 max | 官方文档 · 百炼 · Qwen3.7 Max |
| web | bailian/qwen3.7-max-2026-05-17 | https://help.aliyun.com/zh/model-studio/qwen3-7-max | 官方文档 · 百炼 · qwen3 7 max | 官方文档 · 百炼 · Qwen3.7 Max |
| web | bailian/qwen3.7-max-2026-05-20 | https://help.aliyun.com/zh/model-studio/qwen3-7-max | 官方文档 · 百炼 · qwen3 7 max | 官方文档 · 百炼 · Qwen3.7 Max |
| web | bailian/qwen3.7-max-2026-06-08 | https://help.aliyun.com/zh/model-studio/qwen3-7-max | 官方文档 · 百炼 · qwen3 7 max | 官方文档 · 百炼 · Qwen3.7 Max |
| web | bailian/qwen3.7-max-preview | https://help.aliyun.com/zh/model-studio/qwen3-7-max | 官方文档 · 百炼 · qwen3 7 max | 官方文档 · 百炼 · Qwen3.7 Max |
| web | bailian/qwen3.7-plus | https://help.aliyun.com/zh/model-studio/qwen3-7-plus | 官方文档 · 百炼 · qwen3 7 plus | 官方文档 · 百炼 · Qwen3.7 Plus |
| web | bailian/qwen3.7-plus | https://help.aliyun.com/zh/model-studio/models | 官方文档 · 百炼 · 模型列表 · help.aliyun.com/zh/model-studio/models | 官方文档 · 百炼 · 模型列表（文档） |
| web | bailian/qwen3.7-plus | https://help.aliyun.com/en/model-studio/models | 官方文档 · 百炼 · 模型列表 · help.aliyun.com/en/model-studio/models | 官方文档 · 百炼 · 模型列表（英文） |
| web | bailian/qwen3.7-plus-2026-05-26 | https://help.aliyun.com/zh/model-studio/qwen3-7-plus | 官方文档 · 百炼 · qwen3 7 plus | 官方文档 · 百炼 · Qwen3.7 Plus |
| web | bailian/qwen3.6-27b | https://huggingface.co/Qwen/Qwen3.6-27B | 官方文档 · Hugging Face · Qwen3.6 27B | 官方文档 · Hugging Face · Qwen3.6-27b |
| web | bailian/qwen3.6-35b-a3b | https://huggingface.co/Qwen/Qwen3.6-35B-A3B | 官方文档 · Hugging Face · Qwen3.6 35B A3B | 官方文档 · Hugging Face · Qwen3.6-35b-a3b |
| web | bailian/qwen3.6-plus | https://help.aliyun.com/zh/model-studio/qwen3-6-plus | 官方文档 · 百炼 · qwen3 6 plus | 官方文档 · 百炼 · Qwen3.6 Plus |
| web | bailian/qwen3.6-plus-2026-04-02 | https://help.aliyun.com/zh/model-studio/qwen3-6-plus | 官方文档 · 百炼 · qwen3 6 plus | 官方文档 · 百炼 · Qwen3.6 Plus |
| web | bailian/qwen3.5-122b-a10b | https://huggingface.co/Qwen/Qwen3.5-122B-A10B | 官方文档 · Hugging Face · Qwen3.5 122B A10B | 官方文档 · Hugging Face · Qwen3.5-122b-a10b |
| web | bailian/qwen3.5-27b | https://huggingface.co/Qwen/Qwen3.5-27B | 官方文档 · Hugging Face · Qwen3.5 27B | 官方文档 · Hugging Face · Qwen3.5-27b |
| web | bailian/qwen3.5-35b-a3b | https://huggingface.co/Qwen/Qwen3.5-35B-A3B | 官方文档 · Hugging Face · Qwen3.5 35B A3B | 官方文档 · Hugging Face · Qwen3.5-35b-a3b |
| web | bailian/qwen3.5-397b-a17b | https://huggingface.co/Qwen/Qwen3.5-397B-A17B | 官方文档 · Hugging Face · Qwen3.5 397B A17B | 官方文档 · Hugging Face · Qwen3.5-397b-a17b |
| web | bailian/qwen3.5-omni-flash | https://help.aliyun.com/zh/model-studio/qwen3-5-omni-flash | 官方文档 · 百炼 · qwen3 5 omni flash | 官方文档 · 百炼 · Qwen3.5 Omni Flash |
| web | bailian/qwen3.5-omni-flash-2026-03-15 | https://help.aliyun.com/zh/model-studio/qwen3-5-omni-flash | 官方文档 · 百炼 · qwen3 5 omni flash | 官方文档 · 百炼 · Qwen3.5 Omni Flash |
| web | bailian/qwen3.5-omni-plus | https://help.aliyun.com/zh/model-studio/qwen3-5-omni-plus | 官方文档 · 百炼 · qwen3 5 omni plus | 官方文档 · 百炼 · Qwen3.5 Omni Plus |
| web | bailian/qwen3.5-omni-plus-2026-03-15 | https://help.aliyun.com/zh/model-studio/qwen3-5-omni-plus | 官方文档 · 百炼 · qwen3 5 omni plus | 官方文档 · 百炼 · Qwen3.5 Omni Plus |
| web | bailian/qwen3-max | https://www.aliyun.com/notice/118344 | 下线公告 · aliyun.com · 118344 | 下线公告 · 百炼 · 文档 118344 |
| web | bailian/qwen3-max-2025-09-23 | https://www.aliyun.com/notice/118345 | 下线公告 · aliyun.com · 118345 | 下线公告 · 百炼 · 文档 118345 |
| web | bailian/qwen3-max-2026-01-23 | https://www.aliyun.com/notice/118345 | 下线公告 · aliyun.com · 118345 | 下线公告 · 百炼 · 文档 118345 |
| web | bailian/qwen3-max-preview | https://www.aliyun.com/notice/118344 | 下线公告 · aliyun.com · 118344 | 下线公告 · 百炼 · 文档 118344 |
| web | bailian/stepfun/step-3.7-flash | https://platform.stepfun.com/docs/zh/guides/models/list | 原厂规格 · stepfun.com · list | 原厂规格 · StepFun · List |
| web | bailian/stepfun/step-3.7-flash | https://platform.stepfun.com/docs/zh/guides/models/step-3.7-flash | 官方文档 · stepfun.com · step 3.7 flash | 官方文档 · StepFun · Step 3.7 Flash |
| web | bailian/vanchin/deepseek-v4-pro | https://help.aliyun.com/zh/model-studio/deepseek-api-by-vanchin | 官方文档 · 百炼 · deepseek api by vanchin | 官方文档 · 百炼 · DeepSeek API By Vanchin |
| web | bailian/vanchin/deepseek-v3.2-think | https://help.aliyun.com/zh/model-studio/deepseek-api-by-vanchin | 官方文档 · 百炼 · deepseek api by vanchin | 官方文档 · 百炼 · DeepSeek API By Vanchin |
| web | bailian/vanchin/deepseek-v3.1-terminus | https://huggingface.co/deepseek-ai/DeepSeek-V3.1-Terminus | 官方文档 · Hugging Face · DeepSeek V3.1 Terminus | 官方文档 · Hugging Face · DeepSeek-V3.1-Terminus |
| web | bailian/vanchin/deepseek-v3.1-terminus | https://help.aliyun.com/zh/model-studio/deepseek-api-by-vanchin | 官方文档 · 百炼 · deepseek api by vanchin | 官方文档 · 百炼 · DeepSeek API By Vanchin |
| web | bailian/vanchin/deepseek-v3 | https://help.aliyun.com/zh/model-studio/deepseek-api-by-vanchin | 官方文档 · 百炼 · deepseek api by vanchin | 官方文档 · 百炼 · DeepSeek API By Vanchin |
| web | bailian/wan2.7-image | https://help.aliyun.com/zh/model-studio/wan2-7-image | 官方文档 · 百炼 · wan2 7 image | 官方文档 · 百炼 · Wan 2.7 Image |
| web | bailian/wan2.7-image | https://help.aliyun.com/zh/model-studio/models | 官方文档 · 百炼 · 模型列表 · help.aliyun.com/zh/model-studio/models | 官方文档 · 百炼 · 模型列表（文档） |
| web | bailian/wan2.7-image | https://help.aliyun.com/en/model-studio/models | 官方文档 · 百炼 · 模型列表 · help.aliyun.com/en/model-studio/models | 官方文档 · 百炼 · 模型列表（英文） |
| web | bailian/wan2.7-image-pro | https://help.aliyun.com/zh/model-studio/wan2-7-image-pro | 官方文档 · 百炼 · wan2 7 image pro | 官方文档 · 百炼 · Wan 2.7 Image Pro |
| web | bailian/wan2.7-image-pro | https://help.aliyun.com/zh/model-studio/models | 官方文档 · 百炼 · 模型列表 · help.aliyun.com/zh/model-studio/models | 官方文档 · 百炼 · 模型列表（文档） |
| web | bailian/wan2.7-image-pro | https://help.aliyun.com/en/model-studio/models | 官方文档 · 百炼 · 模型列表 · help.aliyun.com/en/model-studio/models | 官方文档 · 百炼 · 模型列表（英文） |
| web | bailian/wan2.6-image | https://help.aliyun.com/zh/model-studio/wan2-6-image | 官方文档 · 百炼 · wan2 6 image | 官方文档 · 百炼 · Wan2.6 Image |
| web | bailian/wan2.6-t2i | https://help.aliyun.com/zh/model-studio/wan2-6-t2i | 官方文档 · 百炼 · wan2 6 t2i | 官方文档 · 百炼 · Wan2.6 T2i |
| web | bailian/wan2.2-t2i-flash | https://help.aliyun.com/zh/model-studio/wan2-2-t2i-flash | 官方文档 · 百炼 · wan2 2 t2i flash | 官方文档 · 百炼 · Wan2.2 T2i Flash |
| web | bailian/wan2.2-t2i-plus | https://help.aliyun.com/zh/model-studio/wan2-2-t2i-plus | 官方文档 · 百炼 · wan2 2 t2i plus | 官方文档 · 百炼 · Wan2.2 T2i Plus |
| web | bailian/MiniMax/MiniMax-M3.1-Flash | https://help.aliyun.com/zh/model-studio/minimax-m3-1-flash | 官方文档 · 百炼 · minimax m3 1 flash | 官方文档 · 百炼 · MiniMax M3.1 Flash |
| web | bailian/MiniMax/MiniMax-M3.1-Flash | https://help.aliyun.com/zh/model-studio/minimax-api-by-minimax | 官方文档 · 百炼 · minimax api by minimax | 官方文档 · 百炼 · MiniMax API |
| web | bailian/MiniMax/MiniMax-M3.1-Flash | https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-chat-completions | 官方文档 · 百炼 · qwen api via openai chat completions | 官方文档 · 百炼 · Qwen API Via OpenAI Chat Completions |
| web | bailian/qwen-max | https://help.aliyun.com/zh/model-studio/text-generation-model | 官方文档 · 百炼 · text generation model | 官方文档 · 百炼 · Text Generation Model |
| web | bailian/qwen-plus-2025-01-25 | https://help.aliyun.com/zh/model-studio/qwen-plus | 官方文档 · 百炼 · qwen plus | 官方文档 · 百炼 · Qwen Plus |
| web | bailian/qwen-plus-2025-04-28 | https://help.aliyun.com/zh/model-studio/qwen-plus | 官方文档 · 百炼 · qwen plus | 官方文档 · 百炼 · Qwen Plus |
| web | bailian/qwen-plus-2025-07-14 | https://help.aliyun.com/zh/model-studio/qwen-plus | 官方文档 · 百炼 · qwen plus | 官方文档 · 百炼 · Qwen Plus |
| web | bailian/qwen-turbo | https://www.aliyun.com/notice/118177 | 下线公告 · aliyun.com · 118177 | 下线公告 · 百炼 · 文档 118177 |
| web | bailian/qwen3-coder-next | https://www.aliyun.com/notice/118345 | 下线公告 · aliyun.com · 118345 | 下线公告 · 百炼 · 文档 118345 |
| web | bailian/unisound/unisound-u2 | https://help.aliyun.com/zh/model-studio/unisound-u2-by-unisound | 官方文档 · 百炼 · unisound u2 by unisound | 官方文档 · 百炼 · Unisound U2 |
| web | bailian/vanchin/deepseek-r1 | https://help.aliyun.com/zh/model-studio/deepseek-api-by-vanchin | 官方文档 · 百炼 · deepseek api by vanchin | 官方文档 · 百炼 · DeepSeek API By Vanchin |
| web | bailian/wanx-v1 | https://help.aliyun.com/zh/model-studio/wanx-v1 | 官方文档 · 百炼 · wanx v1 | 官方文档 · 百炼 · Wanx V1 |
| web | bailian/wanx2.0-t2i-turbo | https://help.aliyun.com/zh/model-studio/wanx2-0-t2i-turbo | 官方文档 · 百炼 · wanx2 0 t2i turbo | 官方文档 · 百炼 · Wanx2.0 T2i Turbo |
| web | bailian/wanx2.1-imageedit | https://help.aliyun.com/zh/model-studio/wanx-image-edit-api-reference | 官方文档 · 百炼 · wanx image edit api reference | 官方文档 · 百炼 · Wanx Image Edit API Reference |
| web | bailian/wanx2.1-imageedit | https://help.aliyun.com/zh/model-studio/wanx-image-edit | 官方文档 · 百炼 · wanx image edit | 官方文档 · 百炼 · Wanx Image Edit |
| web | bailian/wanx2.1-t2i-plus | https://help.aliyun.com/zh/model-studio/wanx2-1-t2i-plus | 官方文档 · 百炼 · wanx2 1 t2i plus | 官方文档 · 百炼 · Wanx2.1 T2i Plus |
| web | bailian/wanx2.1-t2i-turbo | https://help.aliyun.com/zh/model-studio/wanx2-1-t2i-turbo | 官方文档 · 百炼 · wanx2 1 t2i turbo | 官方文档 · 百炼 · Wanx2.1 T2i Turbo |
| web | bailian/xiaomi/mimo-v2.5-pro | https://mimo.mi.com/docs/zh-CN/updates/deprecate | 下线公告 · mimo.mi.com · deprecate | 下线公告 · MiMo · 模型下线公告 |
| web | bailian/xiaomi/mimo-v2.5-pro | https://mimo.mi.com/models/en-US/mimo-v2.5-pro | 官方文档 · mimo.mi.com · mimo v2.5 pro | 官方文档 · MiMo · MiMo V2.5 Pro |
| web | bailian/xiaomi/mimo-v2.5-pro | https://mimo.mi.com/docs/zh-CN/quick-start/summary/model | 原厂规格 · mimo.mi.com · model | 原厂规格 · MiMo · 模型说明 |
| web | bailian/xiaomi/mimo-v2.6-pro-ultraspeed | https://help.aliyun.com/zh/model-studio/mimo-v2-6-pro-ultraspeed | 官方文档 · 百炼 · mimo v2 6 pro ultraspeed | 官方文档 · 百炼 · MiMo V2.6 Pro UltraSpeed |
| web | bailian/xiaomi/mimo-v2.6-pro-ultraspeed | https://help.aliyun.com/zh/model-studio/mimo | 官方文档 · 百炼 · mimo | 官方文档 · 百炼 · MiMo |
| web | bailian/xiaomi/mimo-v2.6-pro-ultraspeed | https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-chat-completions | 官方文档 · 百炼 · qwen api via openai chat completions | 官方文档 · 百炼 · Qwen API Via OpenAI Chat Completions |
| web | bailian/z-image-turbo | https://help.aliyun.com/zh/model-studio/models | 官方文档 · 百炼 · 模型列表 · help.aliyun.com/zh/model-studio/models | 官方文档 · 百炼 · 模型列表（文档） |
| web | bailian/z-image-turbo | https://help.aliyun.com/en/model-studio/models | 官方文档 · 百炼 · 模型列表 · help.aliyun.com/en/model-studio/models | 官方文档 · 百炼 · 模型列表（英文） |
| web | bailian/z-image-turbo | https://huggingface.co/Tongyi-MAI/Z-Image-Turbo | 官方文档 · Hugging Face · Z Image Turbo | 官方文档 · Hugging Face · Z-Image Turbo |
| web | openai/gpt-6.1-sol | https://developers.openai.com/api/docs/models/gpt-6.1-sol | 官方文档 · developers.openai.com · gpt 6.1 sol | 官方文档 · OpenAI · GPT-6.1 Sol |
| web | openai/gpt-6-luna | https://developers.openai.com/api/docs/models/gpt-6-luna.md | 官方文档 · developers.openai.com · gpt 6 luna.md | 官方文档 · OpenAI · GPT-6 Luna（Markdown） |
| web | openai/gpt-6-luna | https://developers.openai.com/api/docs/models/gpt-6-luna | 官方文档 · developers.openai.com · gpt 6 luna | 官方文档 · OpenAI · GPT-6 Luna（文档） |
| web | openai/gpt-6-sol | https://developers.openai.com/api/docs/models/gpt-6-sol.md | 官方文档 · developers.openai.com · gpt 6 sol.md | 官方文档 · OpenAI · GPT-6 Sol（Markdown） |
| web | openai/gpt-6-sol | https://developers.openai.com/api/docs/models/gpt-6-sol | 官方文档 · developers.openai.com · gpt 6 sol | 官方文档 · OpenAI · GPT-6 Sol（文档） |
| web | openai/gpt-image-2.5-flare | https://developers.openai.com/api/docs/models/gpt-image-2.5-flare.md | 官方文档 · developers.openai.com · gpt image 2.5 flare.md | 官方文档 · OpenAI · GPT Image 2.5 Flare（2026-09-08）（Markdown） |
| web | openai/gpt-image-2.5-flare | https://developers.openai.com/api/docs/models/gpt-image-2.5-flare | 官方文档 · developers.openai.com · gpt image 2.5 flare | 官方文档 · OpenAI · GPT Image 2.5 Flare（2026-09-08）（文档） |
| web | openai/gpt-image-2.5-flare-2026-09-08 | https://developers.openai.com/api/docs/models/gpt-image-2.5-flare | 官方文档 · developers.openai.com · gpt image 2.5 flare | 官方文档 · OpenAI · GPT Image 2.5 Flare |
| web | openai/gpt-image-2.5-flare-2026-09-08 | https://developers.openai.com/api/docs/models | 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 |
| web | openai/gpt-image-2.5-sunburst | https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst.md | 官方文档 · developers.openai.com · gpt image 2.5 sunburst.md | 官方文档 · OpenAI · GPT Image 2.5 Sunburst（2026-09-08）（Markdown） |
| web | openai/gpt-image-2.5-sunburst | https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst | 官方文档 · developers.openai.com · gpt image 2.5 sunburst | 官方文档 · OpenAI · GPT Image 2.5 Sunburst（2026-09-08）（文档） |
| web | openai/gpt-image-2.5-sunburst-2026-09-08 | https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst | 官方文档 · developers.openai.com · gpt image 2.5 sunburst | 官方文档 · OpenAI · GPT Image 2.5 Sunburst |
| web | openai/gpt-image-2.5-sunburst-2026-09-08 | https://developers.openai.com/api/docs/models | 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 |
| web | openai/gpt-6-astra | https://developers.openai.com/api/docs/models/gpt-6-astra.md | 官方文档 · developers.openai.com · gpt 6 astra.md | 官方文档 · OpenAI · GPT-6 Astra（Markdown） |
| web | openai/gpt-6-astra | https://developers.openai.com/api/docs/models/gpt-6-astra | 官方文档 · developers.openai.com · gpt 6 astra | 官方文档 · OpenAI · GPT-6 Astra（文档） |
| web | openai/gpt-5.6-luna | https://developers.openai.com/api/docs/models/gpt-5.6-luna.md | 官方文档 · developers.openai.com · gpt 5.6 luna.md | 官方文档 · OpenAI · GPT-5.6 Luna（Markdown） |
| web | openai/gpt-5.6-luna | https://developers.openai.com/api/docs/models | 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 |
| web | openai/gpt-5.6-luna | https://developers.openai.com/api/docs/models/gpt-5.6-luna | 官方文档 · developers.openai.com · gpt 5.6 luna | 官方文档 · OpenAI · GPT-5.6 Luna（文档） |
| web | openai/gpt-5.6-sol | https://developers.openai.com/api/docs/models/gpt-5.6-sol.md | 官方文档 · developers.openai.com · gpt 5.6 sol.md | 官方文档 · OpenAI · GPT-5.6 Sol |
| web | openai/gpt-5.6-sol | https://developers.openai.com/api/docs/models | 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 |
| web | openai/gpt-5.6-sol | https://developers.openai.com/api/docs/models/gpt-daybreak-blue-latest | 官方文档 · developers.openai.com · gpt daybreak blue latest | 官方文档 · OpenAI · GPT Daybreak Blue Latest |
| web | openai/gpt-5.6-terra | https://developers.openai.com/api/docs/models/gpt-5.6-terra.md | 官方文档 · developers.openai.com · gpt 5.6 terra.md | 官方文档 · OpenAI · GPT-5.6 Terra（Markdown） |
| web | openai/gpt-5.6-terra | https://developers.openai.com/api/docs/models | 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 |
| web | openai/gpt-5.6-terra | https://developers.openai.com/api/docs/models/gpt-5.6-terra | 官方文档 · developers.openai.com · gpt 5.6 terra | 官方文档 · OpenAI · GPT-5.6 Terra（文档） |
| web | openai/gpt-5.5 | https://developers.openai.com/api/docs/models/gpt-5.5.md | 官方文档 · developers.openai.com · gpt 5.5.md | 官方文档 · OpenAI · GPT-5.5（2026-04-23）（Markdown） |
| web | openai/gpt-5.5 | https://developers.openai.com/api/docs/models | 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 |
| web | openai/gpt-5.5 | https://developers.openai.com/api/docs/models/gpt-5.5 | 官方文档 · developers.openai.com · gpt 5.5 | 官方文档 · OpenAI · GPT-5.5（2026-04-23）（文档） |
| web | openai/gpt-5.5-pro | https://developers.openai.com/api/docs/models/gpt-5.5-pro.md | 官方文档 · developers.openai.com · gpt 5.5 pro.md | 官方文档 · OpenAI · GPT-5.5 Pro（2026-04-23）（Markdown） |
| web | openai/gpt-5.5-pro | https://developers.openai.com/api/docs/models | 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 |
| web | openai/gpt-5.5-pro | https://developers.openai.com/api/docs/models/gpt-5.5-pro | 官方文档 · developers.openai.com · gpt 5.5 pro | 官方文档 · OpenAI · GPT-5.5 Pro（2026-04-23）（文档） |
| web | openai/gpt-5.4 | https://developers.openai.com/api/docs/models/gpt-5.4.md | 官方文档 · developers.openai.com · gpt 5.4.md | 官方文档 · OpenAI · GPT-5.4（2026-03-05）（Markdown） |
| web | openai/gpt-5.4 | https://developers.openai.com/api/docs/models | 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 |
| web | openai/gpt-5.4 | https://developers.openai.com/api/docs/models/gpt-5.4 | 官方文档 · developers.openai.com · gpt 5.4 | 官方文档 · OpenAI · GPT-5.4（2026-03-05）（文档） |
| web | openai/gpt-5.4-mini | https://developers.openai.com/api/docs/models/gpt-5.4-mini.md | 官方文档 · developers.openai.com · gpt 5.4 mini.md | 官方文档 · OpenAI · GPT-5.4 Mini（2026-03-17）（Markdown） |
| web | openai/gpt-5.4-mini | https://developers.openai.com/api/docs/models | 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 |
| web | openai/gpt-5.4-mini | https://developers.openai.com/api/docs/models/gpt-5.4-mini | 官方文档 · developers.openai.com · gpt 5.4 mini | 官方文档 · OpenAI · GPT-5.4 Mini（2026-03-17）（文档） |
| web | openai/gpt-5.4-nano | https://developers.openai.com/api/docs/models/gpt-5.4-nano.md | 官方文档 · developers.openai.com · gpt 5.4 nano.md | 官方文档 · OpenAI · GPT-5.4 Nano（2026-03-17）（Markdown） |
| web | openai/gpt-5.4-nano | https://developers.openai.com/api/docs/models | 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 |
| web | openai/gpt-5.4-nano | https://developers.openai.com/api/docs/models/gpt-5.4-nano | 官方文档 · developers.openai.com · gpt 5.4 nano | 官方文档 · OpenAI · GPT-5.4 Nano（2026-03-17）（文档） |
| web | openai/gpt-5.4-pro | https://developers.openai.com/api/docs/models/gpt-5.4-pro.md | 官方文档 · developers.openai.com · gpt 5.4 pro.md | 官方文档 · OpenAI · GPT-5.4 Pro（2026-03-05）（Markdown） |
| web | openai/gpt-5.4-pro | https://developers.openai.com/api/docs/models | 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 |
| web | openai/gpt-5.4-pro | https://developers.openai.com/api/docs/models/gpt-5.4-pro | 官方文档 · developers.openai.com · gpt 5.4 pro | 官方文档 · OpenAI · GPT-5.4 Pro（2026-03-05）（文档） |
| web | openai/gpt-5.3-codex | https://developers.openai.com/api/docs/models/gpt-5.3-codex.md | 官方文档 · developers.openai.com · gpt 5.3 codex.md | 官方文档 · OpenAI · GPT 5.3 Codex（Markdown） |
| web | openai/gpt-5.3-codex | https://developers.openai.com/api/docs/models | 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 |
| web | openai/gpt-5.3-codex | https://developers.openai.com/api/docs/models/gpt-5.3-codex | 官方文档 · developers.openai.com · gpt 5.3 codex | 官方文档 · OpenAI · GPT 5.3 Codex（文档） |
| web | openai/gpt-5.2 | https://developers.openai.com/api/docs/models/gpt-5.2.md | 官方文档 · developers.openai.com · gpt 5.2.md | 官方文档 · OpenAI · GPT-5.2（2025-12-11）（Markdown） |
| web | openai/gpt-5.2 | https://developers.openai.com/api/docs/models | 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 |
| web | openai/gpt-5.2 | https://developers.openai.com/api/docs/models/gpt-5.2 | 官方文档 · developers.openai.com · gpt 5.2 | 官方文档 · OpenAI · GPT-5.2（2025-12-11）（文档） |
| web | openai/gpt-5.2-2025-12-11 | https://developers.openai.com/api/docs/models/gpt-5.2 | 官方文档 · developers.openai.com · gpt 5.2 | 官方文档 · OpenAI · GPT 5.2 |
| web | openai/gpt-5.2-2025-12-11 | https://developers.openai.com/api/docs/models | 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 |
| web | openai/gpt-5.2-pro | https://developers.openai.com/api/docs/models/gpt-5.2-pro.md | 官方文档 · developers.openai.com · gpt 5.2 pro.md | 官方文档 · OpenAI · GPT 5.2 Pro（2025-12-11）（Markdown） |
| web | openai/gpt-5.2-pro | https://developers.openai.com/api/docs/models | 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 |
| web | openai/gpt-5.2-pro | https://developers.openai.com/api/docs/models/gpt-5.2-pro | 官方文档 · developers.openai.com · gpt 5.2 pro | 官方文档 · OpenAI · GPT 5.2 Pro（2025-12-11）（文档） |
| web | openai/gpt-5.1 | https://developers.openai.com/api/docs/models/gpt-5.1.md | 官方文档 · developers.openai.com · gpt 5.1.md | 官方文档 · OpenAI · GPT-5.1（2025-11-13）（Markdown） |
| web | openai/gpt-5.1 | https://developers.openai.com/api/docs/models | 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 |
| web | openai/gpt-5.1 | https://developers.openai.com/api/docs/models/gpt-5.1 | 官方文档 · developers.openai.com · gpt 5.1 | 官方文档 · OpenAI · GPT-5.1（2025-11-13）（文档） |
| web | openai/gpt-5.1-2025-11-13 | https://developers.openai.com/api/docs/models/gpt-5.1 | 官方文档 · developers.openai.com · gpt 5.1 | 官方文档 · OpenAI · GPT-5.1 |
| web | openai/gpt-5.1-2025-11-13 | https://developers.openai.com/api/docs/models | 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 |
| web | openai/gpt-5 | https://developers.openai.com/api/docs/models/gpt-5.md | 官方文档 · developers.openai.com · gpt 5.md | 官方文档 · OpenAI · GPT-5（2025-08-07）（Markdown） |
| web | openai/gpt-5 | https://developers.openai.com/api/docs/deprecations | 下线公告 · developers.openai.com · deprecations | 下线公告 · OpenAI · 模型下线公告 |
| web | openai/gpt-5 | https://developers.openai.com/api/docs/models/gpt-5 | 官方文档 · developers.openai.com · gpt 5 | 官方文档 · OpenAI · GPT-5（2025-08-07）（文档） |
| web | openai/gpt-5-2025-08-07 | https://developers.openai.com/api/docs/models/gpt-5 | 官方文档 · developers.openai.com · gpt 5 | 官方文档 · OpenAI · GPT 5 |
| web | openai/gpt-5-2025-08-07 | https://developers.openai.com/api/docs/models | 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 |
| web | openai/gpt-5-2025-08-07 | https://developers.openai.com/api/docs/deprecations | 下线公告 · developers.openai.com · deprecations | 下线公告 · OpenAI · 模型下线公告 |
| web | openai/gpt-5-mini | https://developers.openai.com/api/docs/models/gpt-5-mini.md | 官方文档 · developers.openai.com · gpt 5 mini.md | 官方文档 · OpenAI · GPT 5 Mini（2025-08-07）（Markdown） |
| web | openai/gpt-5-mini | https://developers.openai.com/api/docs/deprecations | 下线公告 · developers.openai.com · deprecations | 下线公告 · OpenAI · 模型下线公告 |
| web | openai/gpt-5-mini | https://developers.openai.com/api/docs/models/gpt-5-mini | 官方文档 · developers.openai.com · gpt 5 mini | 官方文档 · OpenAI · GPT 5 Mini（2025-08-07）（文档） |
| web | openai/gpt-5-mini-2025-08-07 | https://developers.openai.com/api/docs/models/gpt-5-mini | 官方文档 · developers.openai.com · gpt 5 mini | 官方文档 · OpenAI · GPT 5 Mini |
| web | openai/gpt-5-mini-2025-08-07 | https://developers.openai.com/api/docs/models | 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 |
| web | openai/gpt-5-mini-2025-08-07 | https://developers.openai.com/api/docs/deprecations | 下线公告 · developers.openai.com · deprecations | 下线公告 · OpenAI · 模型下线公告 |
| web | openai/gpt-5-nano | https://developers.openai.com/api/docs/models/gpt-5-nano.md | 官方文档 · developers.openai.com · gpt 5 nano.md | 官方文档 · OpenAI · GPT 5 Nano（2025-08-07）（Markdown） |
| web | openai/gpt-5-nano | https://developers.openai.com/api/docs/deprecations | 下线公告 · developers.openai.com · deprecations | 下线公告 · OpenAI · 模型下线公告 |
| web | openai/gpt-5-nano | https://developers.openai.com/api/docs/models/gpt-5-nano | 官方文档 · developers.openai.com · gpt 5 nano | 官方文档 · OpenAI · GPT 5 Nano（2025-08-07）（文档） |
| web | openai/gpt-5-nano-2025-08-07 | https://developers.openai.com/api/docs/models/gpt-5-nano | 官方文档 · developers.openai.com · gpt 5 nano | 官方文档 · OpenAI · GPT 5 Nano |
| web | openai/gpt-5-nano-2025-08-07 | https://developers.openai.com/api/docs/models | 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 |
| web | openai/gpt-5-nano-2025-08-07 | https://developers.openai.com/api/docs/deprecations | 下线公告 · developers.openai.com · deprecations | 下线公告 · OpenAI · 模型下线公告 |
| web | openai/gpt-5-pro | https://developers.openai.com/api/docs/models/gpt-5-pro.md | 官方文档 · developers.openai.com · gpt 5 pro.md | 官方文档 · OpenAI · GPT 5 Pro（2025-10-06）（Markdown） |
| web | openai/gpt-5-pro | https://developers.openai.com/api/docs/deprecations | 下线公告 · developers.openai.com · deprecations | 下线公告 · OpenAI · 模型下线公告 |
| web | openai/gpt-5-pro | https://developers.openai.com/api/docs/models/gpt-5-pro | 官方文档 · developers.openai.com · gpt 5 pro | 官方文档 · OpenAI · GPT 5 Pro（2025-10-06）（文档） |
| web | openai/gpt-5-pro-2025-10-06 | https://developers.openai.com/api/docs/models/gpt-5-pro | 官方文档 · developers.openai.com · gpt 5 pro | 官方文档 · OpenAI · GPT 5 Pro |
| web | openai/gpt-5-pro-2025-10-06 | https://developers.openai.com/api/docs/models | 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 |
| web | openai/gpt-5-pro-2025-10-06 | https://developers.openai.com/api/docs/deprecations | 下线公告 · developers.openai.com · deprecations | 下线公告 · OpenAI · 模型下线公告 |
| web | openai/gpt-4.1 | https://developers.openai.com/api/docs/models/gpt-4.1.md | 官方文档 · developers.openai.com · gpt 4.1.md | 官方文档 · OpenAI · GPT-4.1（2025-04-14）（Markdown） |
| web | openai/gpt-4.1 | https://developers.openai.com/api/docs/models | 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 |
| web | openai/gpt-4.1 | https://developers.openai.com/api/docs/models/gpt-4.1 | 官方文档 · developers.openai.com · gpt 4.1 | 官方文档 · OpenAI · GPT-4.1（2025-04-14）（文档） |
| web | openai/gpt-4.1-2025-04-14 | https://developers.openai.com/api/docs/models/gpt-4.1 | 官方文档 · developers.openai.com · gpt 4.1 | 官方文档 · OpenAI · GPT 4.1 |
| web | openai/gpt-4.1-2025-04-14 | https://developers.openai.com/api/docs/models | 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 |
| web | openai/gpt-4.1-mini | https://developers.openai.com/api/docs/models/gpt-4.1-mini.md | 官方文档 · developers.openai.com · gpt 4.1 mini.md | 官方文档 · OpenAI · GPT-4.1 Mini（2025-04-14）（Markdown） |
| web | openai/gpt-4.1-mini | https://developers.openai.com/api/docs/models | 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 |
| web | openai/gpt-4.1-mini | https://developers.openai.com/api/docs/models/gpt-4.1-mini | 官方文档 · developers.openai.com · gpt 4.1 mini | 官方文档 · OpenAI · GPT-4.1 Mini（2025-04-14）（文档） |
| web | openai/gpt-4.1-mini-2025-04-14 | https://developers.openai.com/api/docs/models/gpt-4.1-mini | 官方文档 · developers.openai.com · gpt 4.1 mini | 官方文档 · OpenAI · GPT-4.1 Mini |
| web | openai/gpt-4.1-mini-2025-04-14 | https://developers.openai.com/api/docs/models | 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 |
| web | openai/gpt-4.1-nano | https://developers.openai.com/api/docs/models/gpt-4.1-nano.md | 官方文档 · developers.openai.com · gpt 4.1 nano.md | 官方文档 · OpenAI · GPT 4.1 Nano（2025-04-14）（Markdown） |
| web | openai/gpt-4.1-nano | https://developers.openai.com/api/docs/deprecations | 下线公告 · developers.openai.com · deprecations | 下线公告 · OpenAI · 模型下线公告 |
| web | openai/gpt-4.1-nano | https://developers.openai.com/api/docs/models/gpt-4.1-nano | 官方文档 · developers.openai.com · gpt 4.1 nano | 官方文档 · OpenAI · GPT 4.1 Nano（2025-04-14）（文档） |
| web | openai/gpt-4.1-nano-2025-04-14 | https://developers.openai.com/api/docs/models/gpt-4.1-nano | 官方文档 · developers.openai.com · gpt 4.1 nano | 官方文档 · OpenAI · GPT 4.1 Nano |
| web | openai/gpt-4.1-nano-2025-04-14 | https://developers.openai.com/api/docs/models | 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 |
| web | openai/gpt-4.1-nano-2025-04-14 | https://developers.openai.com/api/docs/deprecations | 下线公告 · developers.openai.com · deprecations | 下线公告 · OpenAI · 模型下线公告 |
| web | openai/gpt-4o | https://developers.openai.com/api/docs/models/gpt-4o.md | 官方文档 · developers.openai.com · gpt 4o.md | 官方文档 · OpenAI · GPT-4o（2024-08-06）（Markdown） |
| web | openai/gpt-4o | https://developers.openai.com/api/docs/models | 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 |
| web | openai/gpt-4o | https://developers.openai.com/api/docs/models/gpt-4o | 官方文档 · developers.openai.com · gpt 4o | 官方文档 · OpenAI · GPT-4o（2024-08-06）（文档） |
| web | openai/gpt-4o-2024-05-13 | https://developers.openai.com/api/docs/models/gpt-4o | 官方文档 · developers.openai.com · gpt 4o | 官方文档 · OpenAI · GPT 4o |
| web | openai/gpt-4o-2024-05-13 | https://developers.openai.com/api/docs/models | 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 |
| web | openai/gpt-4o-2024-05-13 | https://developers.openai.com/api/docs/deprecations | 下线公告 · developers.openai.com · deprecations | 下线公告 · OpenAI · 模型下线公告 |
| web | openai/gpt-4o-2024-08-06 | https://developers.openai.com/api/docs/models/gpt-4o | 官方文档 · developers.openai.com · gpt 4o | 官方文档 · OpenAI · GPT 4o |
| web | openai/gpt-4o-2024-08-06 | https://developers.openai.com/api/docs/models | 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 |
| web | openai/gpt-4o-2024-11-20 | https://developers.openai.com/api/docs/models/gpt-4o | 官方文档 · developers.openai.com · gpt 4o | 官方文档 · OpenAI · GPT 4o |
| web | openai/gpt-4o-2024-11-20 | https://developers.openai.com/api/docs/models | 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 |
| web | openai/gpt-4o-mini | https://developers.openai.com/api/docs/models/gpt-4o-mini.md | 官方文档 · developers.openai.com · gpt 4o mini.md | 官方文档 · OpenAI · GPT 4o Mini（2024-07-18）（Markdown） |
| web | openai/gpt-4o-mini | https://developers.openai.com/api/docs/models | 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 |
| web | openai/gpt-4o-mini | https://developers.openai.com/api/docs/models/gpt-4o-mini | 官方文档 · developers.openai.com · gpt 4o mini | 官方文档 · OpenAI · GPT 4o Mini（2024-07-18）（文档） |
| web | openai/gpt-4o-mini-2024-07-18 | https://developers.openai.com/api/docs/models/gpt-4o-mini | 官方文档 · developers.openai.com · gpt 4o mini | 官方文档 · OpenAI · GPT 4o Mini |
| web | openai/gpt-4o-mini-2024-07-18 | https://developers.openai.com/api/docs/models | 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 |
| web | openai/gpt-4-turbo | https://developers.openai.com/api/docs/models/gpt-4-turbo.md | 官方文档 · developers.openai.com · gpt 4 turbo.md | 官方文档 · OpenAI · GPT 4 Turbo（2024-04-09）（Markdown） |
| web | openai/gpt-4-turbo | https://developers.openai.com/api/docs/deprecations | 下线公告 · developers.openai.com · deprecations | 下线公告 · OpenAI · 模型下线公告 |
| web | openai/gpt-4-turbo | https://developers.openai.com/api/docs/models/gpt-4-turbo | 官方文档 · developers.openai.com · gpt 4 turbo | 官方文档 · OpenAI · GPT 4 Turbo（2024-04-09）（文档） |
| web | openai/gpt-4-turbo-2024-04-09 | https://developers.openai.com/api/docs/models/gpt-4-turbo | 官方文档 · developers.openai.com · gpt 4 turbo | 官方文档 · OpenAI · GPT 4 Turbo |
| web | openai/gpt-4-turbo-2024-04-09 | https://developers.openai.com/api/docs/models | 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 |
| web | openai/gpt-4-turbo-2024-04-09 | https://developers.openai.com/api/docs/deprecations | 下线公告 · developers.openai.com · deprecations | 下线公告 · OpenAI · 模型下线公告 |
| web | openai/gpt-4 | https://developers.openai.com/api/docs/models/gpt-4.md | 官方文档 · developers.openai.com · gpt 4.md | 官方文档 · OpenAI · GPT-4（0613）（Markdown） |
| web | openai/gpt-4 | https://developers.openai.com/api/docs/deprecations | 下线公告 · developers.openai.com · deprecations | 下线公告 · OpenAI · 模型下线公告 |
| web | openai/gpt-4 | https://developers.openai.com/api/docs/models/gpt-4 | 官方文档 · developers.openai.com · gpt 4 | 官方文档 · OpenAI · GPT-4（0613）（文档） |
| web | openai/gpt-4-0613 | https://developers.openai.com/api/docs/models/gpt-4 | 官方文档 · developers.openai.com · gpt 4 | 官方文档 · OpenAI · GPT 4 |
| web | openai/gpt-4-0613 | https://developers.openai.com/api/docs/models | 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 |
| web | openai/gpt-4-0613 | https://developers.openai.com/api/docs/deprecations | 下线公告 · developers.openai.com · deprecations | 下线公告 · OpenAI · 模型下线公告 |
| web | openai/gpt-4-1106-preview | https://developers.openai.com/api/docs/models/gpt-4-turbo-preview | 官方文档 · developers.openai.com · gpt 4 turbo preview | 官方文档 · OpenAI · GPT 4 Turbo Preview |
| web | openai/gpt-4-1106-preview | https://developers.openai.com/api/docs/models | 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 |
| web | openai/gpt-4-1106-preview | https://developers.openai.com/api/docs/deprecations | 下线公告 · developers.openai.com · deprecations | 下线公告 · OpenAI · 模型下线公告 |
| web | openai/gpt-image-2 | https://developers.openai.com/api/docs/models/gpt-image-2.md | 官方文档 · developers.openai.com · gpt image 2.md | 官方文档 · OpenAI · GPT Image 2（2026-04-21）（Markdown） |
| web | openai/gpt-image-2 | https://developers.openai.com/api/docs/models | 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 |
| web | openai/gpt-image-2 | https://developers.openai.com/api/docs/models/gpt-image-2 | 官方文档 · developers.openai.com · gpt image 2 | 官方文档 · OpenAI · GPT Image 2（2026-04-21）（文档） |
| web | openai/gpt-image-1.5 | https://developers.openai.com/api/docs/models/gpt-image-1.5.md | 官方文档 · developers.openai.com · gpt image 1.5.md | 官方文档 · OpenAI · GPT Image 1.5（2025-12-16）（Markdown） |
| web | openai/gpt-image-1.5 | https://developers.openai.com/api/docs/models | 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 |
| web | openai/gpt-image-1.5 | https://developers.openai.com/api/docs/models/gpt-image-1.5 | 官方文档 · developers.openai.com · gpt image 1.5 | 官方文档 · OpenAI · GPT Image 1.5（2025-12-16）（文档） |
| web | openai/gpt-image-1 | https://developers.openai.com/api/docs/models/gpt-image-1.md | 官方文档 · developers.openai.com · gpt image 1.md | 官方文档 · OpenAI · GPT Image 1（Markdown） |
| web | openai/gpt-image-1 | https://developers.openai.com/api/docs/models | 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 |
| web | openai/gpt-image-1 | https://developers.openai.com/api/docs/models/gpt-image-1 | 官方文档 · developers.openai.com · gpt image 1 | 官方文档 · OpenAI · GPT Image 1（文档） |
| web | openai/gpt-image-1-mini | https://developers.openai.com/api/docs/models/gpt-image-1-mini.md | 官方文档 · developers.openai.com · gpt image 1 mini.md | 官方文档 · OpenAI · GPT Image 1 Mini（Markdown） |
| web | openai/gpt-image-1-mini | https://developers.openai.com/api/docs/models | 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 |
| web | openai/gpt-image-1-mini | https://developers.openai.com/api/docs/models/gpt-image-1-mini | 官方文档 · developers.openai.com · gpt image 1 mini | 官方文档 · OpenAI · GPT Image 1 Mini（文档） |
| web | openai/chat-latest | https://developers.openai.com/api/docs/models/chat-latest.md | 官方文档 · developers.openai.com · chat latest.md | 官方文档 · OpenAI · Chat Latest（Markdown） |
| web | openai/chat-latest | https://developers.openai.com/api/docs/models | 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 |
| web | openai/chat-latest | https://developers.openai.com/api/docs/models/chat-latest | 官方文档 · developers.openai.com · chat latest | 官方文档 · OpenAI · Chat Latest（文档） |
| web | openai/chatgpt-image-latest | https://developers.openai.com/api/docs/models/chatgpt-image-latest.md | 官方文档 · developers.openai.com · chatgpt image latest.md | 官方文档 · OpenAI · ChatGPT Image Latest（Markdown） |
| web | openai/chatgpt-image-latest | https://developers.openai.com/api/docs/models | 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 |
| web | openai/chatgpt-image-latest | https://developers.openai.com/api/docs/models/chatgpt-image-latest | 官方文档 · developers.openai.com · chatgpt image latest | 官方文档 · OpenAI · ChatGPT Image Latest（文档） |
| web | openai/gpt-3.5-turbo | https://developers.openai.com/api/docs/models/gpt-3.5-turbo.md | 官方文档 · developers.openai.com · gpt 3.5 turbo.md | 官方文档 · OpenAI · GPT 3.5 Turbo（0125）（Markdown） |
| web | openai/gpt-3.5-turbo | https://developers.openai.com/api/docs/deprecations | 下线公告 · developers.openai.com · deprecations | 下线公告 · OpenAI · 模型下线公告 |
| web | openai/gpt-3.5-turbo | https://developers.openai.com/api/docs/models/gpt-3.5-turbo | 官方文档 · developers.openai.com · gpt 3.5 turbo | 官方文档 · OpenAI · GPT 3.5 Turbo（0125）（文档） |
| web | openai/gpt-3.5-turbo-0125 | https://developers.openai.com/api/docs/models/gpt-3.5-turbo | 官方文档 · developers.openai.com · gpt 3.5 turbo | 官方文档 · OpenAI · GPT 3.5 Turbo |
| web | openai/gpt-3.5-turbo-0125 | https://developers.openai.com/api/docs/models | 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 |
| web | openai/gpt-3.5-turbo-0125 | https://developers.openai.com/api/docs/deprecations | 下线公告 · developers.openai.com · deprecations | 下线公告 · OpenAI · 模型下线公告 |
| web | openai/gpt-3.5-turbo-1106 | https://developers.openai.com/api/docs/models/gpt-3.5-turbo | 官方文档 · developers.openai.com · gpt 3.5 turbo | 官方文档 · OpenAI · GPT 3.5 Turbo |
| web | openai/gpt-3.5-turbo-1106 | https://developers.openai.com/api/docs/models | 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 |
| web | openai/gpt-3.5-turbo-1106 | https://developers.openai.com/api/docs/deprecations | 下线公告 · developers.openai.com · deprecations | 下线公告 · OpenAI · 模型下线公告 |
| web | openai/gpt-image-2.6-flare | https://developers.openai.com/api/docs/models/gpt-image-2.6-flare | 官方文档 · developers.openai.com · gpt image 2.6 flare | 官方文档 · OpenAI · GPT Image 2.6 Flare |
| web | openai/gpt-image-2.6-sunburst | https://developers.openai.com/api/docs/models/gpt-image-2.6-sunburst | 官方文档 · developers.openai.com · gpt image 2.6 sunburst | 官方文档 · OpenAI · GPT Image 2.6 Sunburst |
| web | openai/o1 | https://developers.openai.com/api/docs/models/o1.md | 官方文档 · developers.openai.com · o1.md | 官方文档 · OpenAI · O1（2024-12-17）（Markdown） |
| web | openai/o1 | https://developers.openai.com/api/docs/deprecations | 下线公告 · developers.openai.com · deprecations | 下线公告 · OpenAI · 模型下线公告 |
| web | openai/o1 | https://developers.openai.com/api/docs/models/o1 | 官方文档 · developers.openai.com · o1 | 官方文档 · OpenAI · O1（2024-12-17）（文档） |
| web | openai/o1-2024-12-17 | https://developers.openai.com/api/docs/models/o1 | 官方文档 · developers.openai.com · o1 | 官方文档 · OpenAI · O1 |
| web | openai/o1-2024-12-17 | https://developers.openai.com/api/docs/models | 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 |
| web | openai/o1-2024-12-17 | https://developers.openai.com/api/docs/deprecations | 下线公告 · developers.openai.com · deprecations | 下线公告 · OpenAI · 模型下线公告 |
| web | openai/o1-pro | https://developers.openai.com/api/docs/models/o1-pro.md | 官方文档 · developers.openai.com · o1 pro.md | 官方文档 · OpenAI · O1 Pro（2025-03-19）（Markdown） |
| web | openai/o1-pro | https://developers.openai.com/api/docs/deprecations | 下线公告 · developers.openai.com · deprecations | 下线公告 · OpenAI · 模型下线公告 |
| web | openai/o1-pro | https://developers.openai.com/api/docs/models/o1-pro | 官方文档 · developers.openai.com · o1 pro | 官方文档 · OpenAI · O1 Pro（2025-03-19）（文档） |
| web | openai/o1-pro-2025-03-19 | https://developers.openai.com/api/docs/models/o1-pro | 官方文档 · developers.openai.com · o1 pro | 官方文档 · OpenAI · O1 Pro |
| web | openai/o1-pro-2025-03-19 | https://developers.openai.com/api/docs/models | 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 |
| web | openai/o1-pro-2025-03-19 | https://developers.openai.com/api/docs/deprecations | 下线公告 · developers.openai.com · deprecations | 下线公告 · OpenAI · 模型下线公告 |
| web | openai/o3 | https://developers.openai.com/api/docs/models/o3.md | 官方文档 · developers.openai.com · o3.md | 官方文档 · OpenAI · O3（2025-04-16）（Markdown） |
| web | openai/o3 | https://developers.openai.com/api/docs/deprecations | 下线公告 · developers.openai.com · deprecations | 下线公告 · OpenAI · 模型下线公告 |
| web | openai/o3 | https://developers.openai.com/api/docs/models/o3 | 官方文档 · developers.openai.com · o3 | 官方文档 · OpenAI · O3（2025-04-16）（文档） |
| web | openai/o3-2025-04-16 | https://developers.openai.com/api/docs/models/o3 | 官方文档 · developers.openai.com · o3 | 官方文档 · OpenAI · O3 |
| web | openai/o3-2025-04-16 | https://developers.openai.com/api/docs/models | 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 |
| web | openai/o3-2025-04-16 | https://developers.openai.com/api/docs/deprecations | 下线公告 · developers.openai.com · deprecations | 下线公告 · OpenAI · 模型下线公告 |
| web | openai/o3-mini | https://developers.openai.com/api/docs/models/o3-mini.md | 官方文档 · developers.openai.com · o3 mini.md | 官方文档 · OpenAI · O3 Mini（2025-01-31）（Markdown） |
| web | openai/o3-mini | https://developers.openai.com/api/docs/deprecations | 下线公告 · developers.openai.com · deprecations | 下线公告 · OpenAI · 模型下线公告 |
| web | openai/o3-mini | https://developers.openai.com/api/docs/models/o3-mini | 官方文档 · developers.openai.com · o3 mini | 官方文档 · OpenAI · O3 Mini（2025-01-31）（文档） |
| web | openai/o3-mini-2025-01-31 | https://developers.openai.com/api/docs/models/o3-mini | 官方文档 · developers.openai.com · o3 mini | 官方文档 · OpenAI · O3 Mini |
| web | openai/o3-mini-2025-01-31 | https://developers.openai.com/api/docs/models | 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 |
| web | openai/o3-mini-2025-01-31 | https://developers.openai.com/api/docs/deprecations | 下线公告 · developers.openai.com · deprecations | 下线公告 · OpenAI · 模型下线公告 |
| web | openai/o3-pro | https://developers.openai.com/api/docs/models/o3-pro.md | 官方文档 · developers.openai.com · o3 pro.md | 官方文档 · OpenAI · O3 Pro（2025-06-10）（Markdown） |
| web | openai/o3-pro | https://developers.openai.com/api/docs/deprecations | 下线公告 · developers.openai.com · deprecations | 下线公告 · OpenAI · 模型下线公告 |
| web | openai/o3-pro | https://developers.openai.com/api/docs/models/o3-pro | 官方文档 · developers.openai.com · o3 pro | 官方文档 · OpenAI · O3 Pro（2025-06-10）（文档） |
| web | openai/o3-pro-2025-06-10 | https://developers.openai.com/api/docs/models/o3-pro | 官方文档 · developers.openai.com · o3 pro | 官方文档 · OpenAI · O3 Pro |
| web | openai/o3-pro-2025-06-10 | https://developers.openai.com/api/docs/models | 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 |
| web | openai/o3-pro-2025-06-10 | https://developers.openai.com/api/docs/deprecations | 下线公告 · developers.openai.com · deprecations | 下线公告 · OpenAI · 模型下线公告 |
| web | openai/o4-mini | https://developers.openai.com/api/docs/models/o4-mini.md | 官方文档 · developers.openai.com · o4 mini.md | 官方文档 · OpenAI · O4 Mini（2025-04-16）（Markdown） |
| web | openai/o4-mini | https://developers.openai.com/api/docs/deprecations | 下线公告 · developers.openai.com · deprecations | 下线公告 · OpenAI · 模型下线公告 |
| web | openai/o4-mini | https://developers.openai.com/api/docs/models/o4-mini | 官方文档 · developers.openai.com · o4 mini | 官方文档 · OpenAI · O4 Mini（2025-04-16）（文档） |
| web | openai/o4-mini-2025-04-16 | https://developers.openai.com/api/docs/models/o4-mini | 官方文档 · developers.openai.com · o4 mini | 官方文档 · OpenAI · O4 Mini |
| web | openai/o4-mini-2025-04-16 | https://developers.openai.com/api/docs/models | 官方文档 · developers.openai.com · 模型列表 | 官方文档 · OpenAI · 模型列表 |
| web | openai/o4-mini-2025-04-16 | https://developers.openai.com/api/docs/deprecations | 下线公告 · developers.openai.com · deprecations | 下线公告 · OpenAI · 模型下线公告 |
| web | ark/deepseek-v4-1-flash-260910 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 | 官方文档 · 火山方舟 · 文档 1330310 |
| web | ark/deepseek-v4-1-flash-260910 | https://docs.volcengine.com/docs/ark/model-release-announcement?lang=zh | 官方文档 · volcengine.com · model release announcement | 官方文档 · 火山方舟 · Model Release Announcement |
| web | ark/deepseek-v4-1-flash-261017 | https://docs.volcengine.com/docs/ark/model-release-announcement?lang=zh | 官方文档 · volcengine.com · model release announcement | 官方文档 · 火山方舟 · Model Release Announcement |
| web | ark/deepseek-v4-1-flash-261017 | https://ark.volcengine.com/region:cn-beijing/docs/deepseek-v4-1-flash | 官方文档 · ark.volcengine.com · DeepSeek-V4.1-Flash 模型页 | 官方文档 · 火山方舟 · DeepSeek V4.1 Flash |
| web | ark/deepseek-v4-1-flash-economy-261017 | https://docs.volcengine.com/docs/ark/model-release-announcement?lang=zh | 官方文档 · volcengine.com · model release announcement | 官方文档 · 火山方舟 · Model Release Announcement |
| web | ark/deepseek-v4-1-flash-economy-261017 | https://ark.volcengine.com/region:cn-beijing/docs/deepseek-v4-1-flash | 官方文档 · ark.volcengine.com · DeepSeek-V4.1-Flash 模型页 | 官方文档 · 火山方舟 · DeepSeek V4.1 Flash |
| web | ark/deepseek-v4-flash-260425 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 | 官方文档 · 火山方舟 · 文档 1330310 |
| web | ark/deepseek-v4-flash-260425 | https://docs.volcengine.com/docs/82379/1159178?lang=zh | 官方文档 · volcengine.com · 1159178 | 官方文档 · 火山方舟 · 文档 1159178 |
| web | ark/deepseek-v4-flash-ga-260731 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 | 官方文档 · 火山方舟 · 文档 1330310 |
| web | ark/deepseek-v4-flash-ga-260731 | https://docs.volcengine.com/docs/82379/1159178?lang=zh | 官方文档 · volcengine.com · 1159178 | 官方文档 · 火山方舟 · 文档 1159178 |
| web | ark/deepseek-v4-pro-260425 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 | 官方文档 · 火山方舟 · 文档 1330310 |
| web | ark/deepseek-v4-pro-260425 | https://docs.volcengine.com/docs/82379/1159178?lang=zh | 官方文档 · volcengine.com · 1159178 | 官方文档 · 火山方舟 · 文档 1159178 |
| web | ark/deepseek-v4-pro-ga-260813 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 | 官方文档 · 火山方舟 · 文档 1330310 |
| web | ark/deepseek-v4-pro-ga-260813 | https://docs.volcengine.com/docs/82379/1159178?lang=zh | 官方文档 · volcengine.com · 1159178 | 官方文档 · 火山方舟 · 文档 1159178 |
| web | ark/doubao-seed-2-1-pro-260628 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 | 官方文档 · 火山方舟 · 文档 1330310 |
| web | ark/doubao-seed-2-1-pro-260628 | https://docs.volcengine.com/docs/82379/1159178?lang=zh | 官方文档 · volcengine.com · 1159178 | 官方文档 · 火山方舟 · 文档 1159178 |
| web | ark/doubao-seed-2-1-pro-260915 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 | 官方文档 · 火山方舟 · 文档 1330310 |
| web | ark/doubao-seed-2-1-pro-260915 | https://docs.volcengine.com/docs/ark/model-release-announcement?lang=zh | 官方文档 · volcengine.com · model release announcement | 官方文档 · 火山方舟 · Model Release Announcement |
| web | ark/doubao-seed-2-1-turbo-260628 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 | 官方文档 · 火山方舟 · 文档 1330310 |
| web | ark/doubao-seed-2-1-turbo-260628 | https://docs.volcengine.com/docs/82379/1159178?lang=zh | 官方文档 · volcengine.com · 1159178 | 官方文档 · 火山方舟 · 文档 1159178 |
| web | ark/doubao-seed-2-0-code-preview-260215 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 · www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档） |
| web | ark/doubao-seed-2-0-code-preview-260215 | https://docs.volcengine.com/docs/82379/1330310?lang=zh | 官方文档 · volcengine.com · 1330310 · docs.volcengine.com/docs/82379/1330310?lang=zh | 官方文档 · 火山方舟 · 文档 1330310（文档 2） |
| web | ark/doubao-seed-2-0-lite-260215 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 · www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档） |
| web | ark/doubao-seed-2-0-lite-260215 | https://docs.volcengine.com/docs/82379/1330310?lang=zh | 官方文档 · volcengine.com · 1330310 · docs.volcengine.com/docs/82379/1330310?lang=zh | 官方文档 · 火山方舟 · 文档 1330310（文档 2） |
| web | ark/doubao-seed-2-0-lite-260428 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 | 官方文档 · 火山方舟 · 文档 1330310 |
| web | ark/doubao-seed-2-0-mini-260215 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 · www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档） |
| web | ark/doubao-seed-2-0-mini-260215 | https://docs.volcengine.com/docs/82379/1330310?lang=zh | 官方文档 · volcengine.com · 1330310 · docs.volcengine.com/docs/82379/1330310?lang=zh | 官方文档 · 火山方舟 · 文档 1330310（文档 2） |
| web | ark/doubao-seed-2-0-mini-260428 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 | 官方文档 · 火山方舟 · 文档 1330310 |
| web | ark/doubao-seed-2-0-pro-260215 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 · www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档） |
| web | ark/doubao-seed-2-0-pro-260215 | https://docs.volcengine.com/docs/82379/1330310?lang=zh | 官方文档 · volcengine.com · 1330310 · docs.volcengine.com/docs/82379/1330310?lang=zh | 官方文档 · 火山方舟 · 文档 1330310（文档 2） |
| web | ark/doubao-seed-1-8-251228 | https://docs.volcengine.com/docs/ark/bytedance-seed-1-8?lang=zh | 官方文档 · volcengine.com · bytedance seed 1 8 | 官方文档 · 火山方舟 · Bytedance Seed 1-8 |
| web | ark/doubao-seed-1-8-251228 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 · www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档） |
| web | ark/doubao-seed-1-8-251228 | https://docs.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 · docs.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档 2） |
| web | ark/doubao-seed-1-6-250615 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 · www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档） |
| web | ark/doubao-seed-1-6-250615 | https://docs.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 · docs.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档 2） |
| web | ark/doubao-seed-1-6-251015 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 · www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档） |
| web | ark/doubao-seed-1-6-251015 | https://docs.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 · docs.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档 2） |
| web | ark/doubao-seed-1-6-flash-250615 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 · www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档） |
| web | ark/doubao-seed-1-6-flash-250615 | https://docs.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 · docs.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档 2） |
| web | ark/doubao-seed-1-6-flash-250828 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 · www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档） |
| web | ark/doubao-seed-1-6-flash-250828 | https://docs.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 · docs.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档 2） |
| web | ark/doubao-seed-1-6-vision-250815 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 · www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档） |
| web | ark/doubao-seed-1-6-vision-250815 | https://docs.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 · docs.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档 2） |
| web | ark/doubao-1-5-lite-32k-250115 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 · www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档） |
| web | ark/doubao-1-5-lite-32k-250115 | https://docs.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 · docs.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档 2） |
| web | ark/doubao-1-5-pro-32k-250115 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 · www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档） |
| web | ark/doubao-1-5-pro-32k-250115 | https://docs.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 · docs.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档 2） |
| web | ark/doubao-1-5-vision-pro-32k-250115 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 · www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档） |
| web | ark/doubao-1-5-vision-pro-32k-250115 | https://docs.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 · docs.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档 2） |
| web | ark/doubao-seedream-5-0-260128 | https://docs.volcengine.com/docs/ark/seedream-4-0-5-0?lang=zh | 官方文档 · volcengine.com · seedream 4 0 5 0 | 官方文档 · 火山方舟 · Seedream 4-0-5-0 |
| web | ark/doubao-seedream-5-0-260128 | https://docs.volcengine.com/docs/ark/image-generation-api?lang=en | 官方文档 · volcengine.com · image generation api | 官方文档 · 火山方舟 · Image Generation API |
| web | ark/doubao-seedream-5-0-260128 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 | 官方文档 · 火山方舟 · 文档 1330310 |
| web | ark/doubao-seedream-5-0-260128 | https://docs.volcengine.com/docs/82379/1824121?lang=zh | 官方文档 · volcengine.com · 1824121 | 官方文档 · 火山方舟 · 文档 1824121 |
| web | ark/doubao-seedream-5-0-flash-260915 | https://docs.volcengine.com/docs/ark/seedream-4-0-5-0?lang=zh | 官方文档 · volcengine.com · seedream 4 0 5 0 | 官方文档 · 火山方舟 · Seedream 4-0-5-0 |
| web | ark/doubao-seedream-5-0-flash-260915 | https://docs.volcengine.com/docs/ark/image-generation-api?lang=en | 官方文档 · volcengine.com · image generation api · docs.volcengine.com/docs/ark/image-generation-api?lang=en | 官方文档 · 火山方舟 · Image Generation API（英文） |
| web | ark/doubao-seedream-5-0-flash-260915 | https://docs.volcengine.com/docs/ark/image-generation-api?lang=zh | 官方文档 · volcengine.com · image generation api · docs.volcengine.com/docs/ark/image-generation-api?lang=zh | 官方文档 · 火山方舟 · Image Generation API（文档） |
| web | ark/doubao-seedream-5-0-pro-260628 | https://docs.volcengine.com/docs/ark/seedream-4-0-5-0?lang=zh | 官方文档 · volcengine.com · seedream 4 0 5 0 | 官方文档 · 火山方舟 · Seedream 4-0-5-0 |
| web | ark/doubao-seedream-5-0-pro-260628 | https://docs.volcengine.com/docs/ark/image-generation-api?lang=en | 官方文档 · volcengine.com · image generation api | 官方文档 · 火山方舟 · Image Generation API |
| web | ark/doubao-seedream-5-0-pro-260628 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 | 官方文档 · 火山方舟 · 文档 1330310 |
| web | ark/doubao-seedream-5-0-pro-260628 | https://docs.volcengine.com/docs/82379/1824121?lang=zh | 官方文档 · volcengine.com · 1824121 | 官方文档 · 火山方舟 · 文档 1824121 |
| web | ark/doubao-seedream-4-5-251128 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 | 官方文档 · 火山方舟 · 文档 1330310 |
| web | ark/doubao-seedream-4-5-251128 | https://docs.volcengine.com/docs/82379/1824121?lang=zh | 官方文档 · volcengine.com · 1824121 | 官方文档 · 火山方舟 · 文档 1824121 |
| web | ark/doubao-seedream-4-0-250828 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 | 官方文档 · 火山方舟 · 文档 1330310 |
| web | ark/doubao-seedream-4-0-250828 | https://api.volcengine.com/api-docs/view?action=ImageGenerations&serviceCode=ark&version=2024-01-01 | 官方文档 · api.volcengine.com · view | 官方文档 · 火山方舟 · View |
| web | ark/glm-5-3-flash-260828 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 | 官方文档 · 火山方舟 · 文档 1330310 |
| web | ark/glm-5-3-flash-260828 | https://docs.volcengine.com/docs/ark/model-release-announcement?lang=zh | 官方文档 · volcengine.com · model release announcement | 官方文档 · 火山方舟 · Model Release Announcement |
| web | ark/glm-5-2-260617 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 | 官方文档 · 火山方舟 · 文档 1330310 |
| web | ark/glm-5-2-260617 | https://docs.volcengine.com/docs/82379/1159178?lang=zh | 官方文档 · volcengine.com · 1159178 | 官方文档 · 火山方舟 · 文档 1159178 |
| web | ark/kimi-k3-1-pro-261024 | https://docs.volcengine.com/docs/ark/model-release-announcement?lang=zh | 官方文档 · volcengine.com · model release announcement | 官方文档 · 火山方舟 · Model Release Announcement |
| web | ark/doubao-seed-code-preview-251028 | https://docs.volcengine.com/docs/ark/model-release-announcement-2025?lang=en | 官方文档 · volcengine.com · model release announcement 2025 | 官方文档 · 火山方舟 · Model Release Announcement 2025 |
| web | ark/doubao-seed-code-preview-251028 | https://developer.volcengine.com/articles/7577301460712030258 | 官方文档 · developer.volcengine.com · 7577301460712030258 | 官方文档 · 火山方舟 · 文档 7577301460712030258 |
| web | ark/doubao-seed-code-preview-251028 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 · www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档） |
| web | ark/doubao-seed-code-preview-251028 | https://docs.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 · docs.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档 2） |
| web | ark/doubao-seed-evolving | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 | 官方文档 · 火山方舟 · 文档 1330310 |
| web | ark/doubao-seed-evolving | https://docs.volcengine.com/docs/82379/2549861?lang=zh | 官方文档 · volcengine.com · 2549861 | 官方文档 · 火山方舟 · 文档 2549861 |
| web | ark/glm-4-7-251222 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 · www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档） |
| web | ark/glm-4-7-251222 | https://docs.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 · docs.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档 2） |
| web | bfl/flux-2-flex | https://docs.bfl.ml/api-reference/models/generate-or-edit-an-image-with-flux2-[flex] | 官方文档 · bfl.ml · generate or edit an image with flux2 [flex] | 官方文档 · BFL · FLUX 2 Flex |
| web | bfl/flux-2-flex | https://docs.bfl.ai/ | 官方文档 · bfl.ai · 文档首页 | 官方文档 · BFL · 文档首页 |
| web | bfl/flux-2-klein-4b | https://docs.bfl.ml/api-reference/models/generate-or-edit-an-image-with-flux2-[klein]-4b | 官方文档 · bfl.ml · generate or edit an image with flux2 [klein] 4b | 官方文档 · BFL · FLUX 2 Klein 4b |
| web | bfl/flux-2-klein-4b | https://docs.bfl.ai/ | 官方文档 · bfl.ai · 文档首页 | 官方文档 · BFL · 文档首页 |
| web | bfl/flux-2-klein-9b | https://docs.bfl.ml/api-reference/models/generate-or-edit-an-image-with-flux2-[klein]-9b | 官方文档 · bfl.ml · generate or edit an image with flux2 [klein] 9b | 官方文档 · BFL · FLUX 2 Klein 9b |
| web | bfl/flux-2-klein-9b | https://docs.bfl.ai/ | 官方文档 · bfl.ai · 文档首页 | 官方文档 · BFL · 文档首页 |
| web | bfl/flux-2-klein-9b-preview | https://docs.bfl.ml/api-reference/models/generate-or-edit-an-image-with-flux2-[klein]-9b-preview | 官方文档 · bfl.ml · generate or edit an image with flux2 [klein] 9b preview | 官方文档 · BFL · FLUX 2 Klein 9b Preview |
| web | bfl/flux-2-klein-9b-preview | https://docs.bfl.ai/ | 官方文档 · bfl.ai · 文档首页 | 官方文档 · BFL · 文档首页 |
| web | bfl/flux-2-max | https://docs.bfl.ml/api-reference/models/generate-or-edit-an-image-with-flux2-[max] | 官方文档 · bfl.ml · generate or edit an image with flux2 [max] | 官方文档 · BFL · FLUX 2 Max |
| web | bfl/flux-2-max | https://docs.bfl.ai/ | 官方文档 · bfl.ai · 文档首页 | 官方文档 · BFL · 文档首页 |
| web | bfl/flux-2-pro | https://docs.bfl.ml/api-reference/models/generate-or-edit-an-image-with-flux2-[pro] | 官方文档 · bfl.ml · generate or edit an image with flux2 [pro] | 官方文档 · BFL · FLUX 2 Pro |
| web | bfl/flux-2-pro | https://docs.bfl.ai/ | 官方文档 · bfl.ai · 文档首页 | 官方文档 · BFL · 文档首页 |
| web | bfl/flux-2-pro-preview | https://docs.bfl.ml/api-reference/models/generate-or-edit-an-image-with-flux2-[pro]-preview | 官方文档 · bfl.ml · generate or edit an image with flux2 [pro] preview | 官方文档 · BFL · FLUX 2 Pro Preview |
| web | bfl/flux-2-pro-preview | https://docs.bfl.ai/ | 官方文档 · bfl.ai · 文档首页 | 官方文档 · BFL · 文档首页 |
| web | bfl/flux-kontext-max | https://docs.bfl.ml/api-reference/models/edit-or-create-an-image-with-flux1-kontext-[max] | 官方文档 · bfl.ml · edit or create an image with flux1 kontext [max] | 官方文档 · BFL · Edit Or Create An Image With FLUX.1 Kontext [max] |
| web | bfl/flux-kontext-max | https://docs.bfl.ai/ | 官方文档 · bfl.ai · 文档首页 | 官方文档 · BFL · 文档首页 |
| web | bfl/flux-kontext-pro | https://docs.bfl.ml/api-reference/models/edit-or-create-an-image-with-flux1-kontext-[pro] | 官方文档 · bfl.ml · edit or create an image with flux1 kontext [pro] | 官方文档 · BFL · Edit Or Create An Image With FLUX.1 Kontext [pro] |
| web | bfl/flux-kontext-pro | https://docs.bfl.ai/ | 官方文档 · bfl.ai · 文档首页 | 官方文档 · BFL · 文档首页 |
| web | bfl/flux-3-image | https://docs.bfl.ml/api-reference/utility/generate-an-image-with-flux-3 | 官方文档 · bfl.ml · generate an image with flux 3 | 官方文档 · BFL · Generate An Image With FLUX 3 |
| web | bfl/flux-3-image-klein | https://docs.bfl.ml/api-reference/utility/generate-an-image-with-flux-3-klein | 官方文档 · bfl.ml · generate an image with flux 3 klein | 官方文档 · BFL · Generate An Image With FLUX.3 Klein |
| web | bfl/flux-dev | https://docs.bfl.ml/api-reference/models/generate-an-image-with-flux1-[dev] | 官方文档 · bfl.ml · generate an image with flux1 [dev] | 官方文档 · BFL · Generate An Image With FLUX.1 [dev] |
| web | bfl/flux-dev | https://docs.bfl.ai/ | 官方文档 · bfl.ai · 文档首页 | 官方文档 · BFL · 文档首页 |
| web | bfl/flux-pro-1.1 | https://docs.bfl.ml/api-reference/models/generate-an-image-with-flux11-[pro] | 官方文档 · bfl.ml · generate an image with flux11 [pro] | 官方文档 · BFL · Generate An Image With FLUX.1.1 [pro] |
| web | bfl/flux-pro-1.1 | https://docs.bfl.ai/ | 官方文档 · bfl.ai · 文档首页 | 官方文档 · BFL · 文档首页 |
| web | bfl/flux-pro-1.1-ultra | https://docs.bfl.ml/api-reference/models/generate-an-image-with-flux11-[pro]-ultra-mode | 官方文档 · bfl.ml · generate an image with flux11 [pro] ultra mode | 官方文档 · BFL · Generate An Image With FLUX.1.1 [pro] Ultra Mode |
| web | bfl/flux-pro-1.1-ultra | https://docs.bfl.ai/ | 官方文档 · bfl.ai · 文档首页 | 官方文档 · BFL · 文档首页 |
| web | stability/sd3.5-flash | https://platform.stability.ai/docs/api-reference#tag/Generate/paths/~1v2beta~1stable-image~1generate~1sd3/post | 官方文档 · stability.ai · api reference | 官方文档 · Stability · API 文档 |
| web | stability/sd3.5-flash | https://platform.stability.ai/docs/getting-started/models | 官方文档 · stability.ai · 模型列表 | 官方文档 · Stability · 模型列表 |
| web | stability/sd3.5-flash | https://docs.stability.ai/api-reference/generate/stable-diffusion-35 | 官方文档 · stability.ai · stable diffusion 35 | 官方文档 · Stability · Stable Diffusion 3.5 |
| web | stability/sd3.5-flash | https://docs.stability.ai/pricing | 官方文档 · stability.ai · 价格与规格 | 官方文档 · Stability · 价格与规格 |
| web | stability/sd3.5-large | https://platform.stability.ai/docs/api-reference#tag/Generate/paths/~1v2beta~1stable-image~1generate~1sd3/post | 官方文档 · stability.ai · api reference | 官方文档 · Stability · API 文档 |
| web | stability/sd3.5-large | https://platform.stability.ai/docs/getting-started/models | 官方文档 · stability.ai · 模型列表 | 官方文档 · Stability · 模型列表 |
| web | stability/sd3.5-large-turbo | https://platform.stability.ai/docs/api-reference#tag/Generate/paths/~1v2beta~1stable-image~1generate~1sd3/post | 官方文档 · stability.ai · api reference | 官方文档 · Stability · API 文档 |
| web | stability/sd3.5-large-turbo | https://platform.stability.ai/docs/getting-started/models | 官方文档 · stability.ai · 模型列表 | 官方文档 · Stability · 模型列表 |
| web | stability/sd3.5-medium | https://platform.stability.ai/docs/api-reference#tag/Generate/paths/~1v2beta~1stable-image~1generate~1sd3/post | 官方文档 · stability.ai · api reference | 官方文档 · Stability · API 文档 |
| web | stability/sd3.5-medium | https://platform.stability.ai/docs/getting-started/models | 官方文档 · stability.ai · 模型列表 | 官方文档 · Stability · 模型列表 |
| web | stability/stable-image-core | https://platform.stability.ai/docs/api-reference#tag/Generate/paths/~1v2beta~1stable-image~1generate~1core/post | 官方文档 · stability.ai · api reference | 官方文档 · Stability · API 文档 |
| web | stability/stable-image-core | https://platform.stability.ai/docs/getting-started/models | 官方文档 · stability.ai · 模型列表 | 官方文档 · Stability · 模型列表 |
| web | stability/stable-image-ultra | https://platform.stability.ai/docs/api-reference#tag/Generate/paths/~1v2beta~1stable-image~1generate~1ultra/post | 官方文档 · stability.ai · api reference | 官方文档 · Stability · API 文档 |
| web | stability/stable-image-ultra | https://platform.stability.ai/docs/getting-started/models | 官方文档 · stability.ai · 模型列表 | 官方文档 · Stability · 模型列表 |
| web | ideogram/ideogram-v4 | https://developer.ideogram.ai/v2/api-reference/images/generate/ideogram-4 | 官方文档 · developer.ideogram.ai · ideogram 4 | 官方文档 · Ideogram · Ideogram 4 |
| web | ideogram/ideogram-v4 | https://developer.ideogram.ai/v1/api-reference/generate-images/generate-v4 | 官方文档 · developer.ideogram.ai · generate v4 · developer.ideogram.ai/v1/api-reference/generate-images/generate-v4 | 官方文档 · Ideogram · Generate V4（文档） |
| web | ideogram/ideogram-v4 | https://developer.ideogram.ai/ | 官方文档 · developer.ideogram.ai · 文档首页 | 官方文档 · Ideogram · 文档首页 |
| web | ideogram/ideogram-v4 | https://developer.ideogram.ai/api-reference/generate-images/generate-v4 | 官方文档 · developer.ideogram.ai · generate v4 · developer.ideogram.ai/api-reference/generate-images/generate-v4 | 官方文档 · Ideogram · Generate V4（文档 2） |
| web | ideogram/ideogram-v4-transparent | https://developer.ideogram.ai/v2/api-reference/images/generate/ideogram-4-transparent | 官方文档 · developer.ideogram.ai · ideogram 4 transparent | 官方文档 · Ideogram · Ideogram 4 Transparent |
| web | ideogram/ideogram-v4-transparent | https://developer.ideogram.ai/v1/api-reference/generate-images/generate-transparent-v4 | 官方文档 · developer.ideogram.ai · generate transparent v4 · developer.ideogram.ai/v1/api-reference/generate-images/generate-transparent-v4 | 官方文档 · Ideogram · Generate Transparent V4（文档） |
| web | ideogram/ideogram-v4-transparent | https://developer.ideogram.ai/ | 官方文档 · developer.ideogram.ai · 文档首页 | 官方文档 · Ideogram · 文档首页 |
| web | ideogram/ideogram-v4-transparent | https://developer.ideogram.ai/api-reference/generate-images/generate-transparent-v4 | 官方文档 · developer.ideogram.ai · generate transparent v4 · developer.ideogram.ai/api-reference/generate-images/generate-transparent-v4 | 官方文档 · Ideogram · Generate Transparent V4（文档 2） |
| web | ideogram/ideogram-v3 | https://developer.ideogram.ai/v2/api-reference/images/generate/ideogram-3 | 官方文档 · developer.ideogram.ai · ideogram 3 | 官方文档 · Ideogram · Ideogram 3 |
| web | ideogram/ideogram-v3 | https://developer.ideogram.ai/v1/api-reference/generate-images/generate-v3 | 官方文档 · developer.ideogram.ai · generate v3 · developer.ideogram.ai/v1/api-reference/generate-images/generate-v3 | 官方文档 · Ideogram · Generate V3（文档） |
| web | ideogram/ideogram-v3 | https://developer.ideogram.ai/ | 官方文档 · developer.ideogram.ai · 文档首页 | 官方文档 · Ideogram · 文档首页 |
| web | ideogram/ideogram-v3 | https://developer.ideogram.ai/api-reference/generate-images/generate-v3 | 官方文档 · developer.ideogram.ai · generate v3 · developer.ideogram.ai/api-reference/generate-images/generate-v3 | 官方文档 · Ideogram · Generate V3（文档 2） |
| web | ideogram/ideogram-v3-transparent | https://developer.ideogram.ai/v2/api-reference/images/generate/ideogram-3-transparent | 官方文档 · developer.ideogram.ai · ideogram 3 transparent | 官方文档 · Ideogram · Ideogram 3 Transparent |
| web | ideogram/ideogram-v3-transparent | https://developer.ideogram.ai/v1/api-reference/generate-images/generate-transparent-v3 | 官方文档 · developer.ideogram.ai · generate transparent v3 · developer.ideogram.ai/v1/api-reference/generate-images/generate-transparent-v3 | 官方文档 · Ideogram · Generate Transparent V3（文档） |
| web | ideogram/ideogram-v3-transparent | https://developer.ideogram.ai/ | 官方文档 · developer.ideogram.ai · 文档首页 | 官方文档 · Ideogram · 文档首页 |
| web | ideogram/ideogram-v3-transparent | https://developer.ideogram.ai/api-reference/generate-images/generate-transparent-v3 | 官方文档 · developer.ideogram.ai · generate transparent v3 · developer.ideogram.ai/api-reference/generate-images/generate-transparent-v3 | 官方文档 · Ideogram · Generate Transparent V3（文档 2） |
| web | ideogram/V_2A | https://developer.ideogram.ai/v1/api-reference/legacy-endpoints/generate | 官方文档 · developer.ideogram.ai · generate · developer.ideogram.ai/v1/api-reference/legacy-endpoints/generate | 官方文档 · Ideogram · Generate（文档） |
| web | ideogram/V_2A | https://developer.ideogram.ai/ | 官方文档 · developer.ideogram.ai · 文档首页 | 官方文档 · Ideogram · 文档首页 |
| web | ideogram/V_2A | https://developer.ideogram.ai/api-reference/legacy-endpoints/generate | 官方文档 · developer.ideogram.ai · generate · developer.ideogram.ai/api-reference/legacy-endpoints/generate | 官方文档 · Ideogram · Generate（文档 2） |
| web | ideogram/V_2A_TURBO | https://developer.ideogram.ai/v1/api-reference/legacy-endpoints/generate | 官方文档 · developer.ideogram.ai · generate · developer.ideogram.ai/v1/api-reference/legacy-endpoints/generate | 官方文档 · Ideogram · Generate（文档） |
| web | ideogram/V_2A_TURBO | https://developer.ideogram.ai/ | 官方文档 · developer.ideogram.ai · 文档首页 | 官方文档 · Ideogram · 文档首页 |
| web | ideogram/V_2A_TURBO | https://developer.ideogram.ai/api-reference/legacy-endpoints/generate | 官方文档 · developer.ideogram.ai · generate · developer.ideogram.ai/api-reference/legacy-endpoints/generate | 官方文档 · Ideogram · Generate（文档 2） |
| web | ideogram/V_2 | https://developer.ideogram.ai/v1/api-reference/legacy-endpoints/generate | 官方文档 · developer.ideogram.ai · generate · developer.ideogram.ai/v1/api-reference/legacy-endpoints/generate | 官方文档 · Ideogram · Generate（文档） |
| web | ideogram/V_2 | https://developer.ideogram.ai/ | 官方文档 · developer.ideogram.ai · 文档首页 | 官方文档 · Ideogram · 文档首页 |
| web | ideogram/V_2 | https://developer.ideogram.ai/api-reference/legacy-endpoints/generate | 官方文档 · developer.ideogram.ai · generate · developer.ideogram.ai/api-reference/legacy-endpoints/generate | 官方文档 · Ideogram · Generate（文档 2） |
| web | ideogram/V_2_TURBO | https://developer.ideogram.ai/v1/api-reference/legacy-endpoints/generate | 官方文档 · developer.ideogram.ai · generate · developer.ideogram.ai/v1/api-reference/legacy-endpoints/generate | 官方文档 · Ideogram · Generate（文档） |
| web | ideogram/V_2_TURBO | https://developer.ideogram.ai/ | 官方文档 · developer.ideogram.ai · 文档首页 | 官方文档 · Ideogram · 文档首页 |
| web | ideogram/V_2_TURBO | https://developer.ideogram.ai/api-reference/legacy-endpoints/generate | 官方文档 · developer.ideogram.ai · generate · developer.ideogram.ai/api-reference/legacy-endpoints/generate | 官方文档 · Ideogram · Generate（文档 2） |
| web | ideogram/V_1 | https://developer.ideogram.ai/v1/api-reference/legacy-endpoints/generate | 官方文档 · developer.ideogram.ai · generate · developer.ideogram.ai/v1/api-reference/legacy-endpoints/generate | 官方文档 · Ideogram · Generate（文档） |
| web | ideogram/V_1 | https://developer.ideogram.ai/ | 官方文档 · developer.ideogram.ai · 文档首页 | 官方文档 · Ideogram · 文档首页 |
| web | ideogram/V_1 | https://developer.ideogram.ai/api-reference/legacy-endpoints/generate | 官方文档 · developer.ideogram.ai · generate · developer.ideogram.ai/api-reference/legacy-endpoints/generate | 官方文档 · Ideogram · Generate（文档 2） |
| web | ideogram/V_1_TURBO | https://developer.ideogram.ai/v1/api-reference/legacy-endpoints/generate | 官方文档 · developer.ideogram.ai · generate · developer.ideogram.ai/v1/api-reference/legacy-endpoints/generate | 官方文档 · Ideogram · Generate（文档） |
| web | ideogram/V_1_TURBO | https://developer.ideogram.ai/ | 官方文档 · developer.ideogram.ai · 文档首页 | 官方文档 · Ideogram · 文档首页 |
| web | ideogram/V_1_TURBO | https://developer.ideogram.ai/api-reference/legacy-endpoints/generate | 官方文档 · developer.ideogram.ai · generate · developer.ideogram.ai/api-reference/legacy-endpoints/generate | 官方文档 · Ideogram · Generate（文档 2） |
| web | ideogram/AUTO | https://developer.ideogram.ai/v1/api-reference/legacy-endpoints/generate | 官方文档 · developer.ideogram.ai · generate · developer.ideogram.ai/v1/api-reference/legacy-endpoints/generate | 官方文档 · Ideogram · Generate（文档） |
| web | ideogram/AUTO | https://developer.ideogram.ai/ | 官方文档 · developer.ideogram.ai · 文档首页 | 官方文档 · Ideogram · 文档首页 |
| web | ideogram/AUTO | https://developer.ideogram.ai/api-reference/legacy-endpoints/generate | 官方文档 · developer.ideogram.ai · generate · developer.ideogram.ai/api-reference/legacy-endpoints/generate | 官方文档 · Ideogram · Generate（文档 2） |
| web | ideogram/ideogram-4-5 | https://developer.ideogram.ai/v2/api-reference/images/generate/ideogram-4-5 | 官方文档 · developer.ideogram.ai · ideogram 4 5 · developer.ideogram.ai/v2/api-reference/images/generate/ideogram-4-5 | 官方文档 · Ideogram · Ideogram 4.5（文档） |
| web | ideogram/ideogram-4-5 | https://developer.ideogram.ai/api-reference/images/generate/ideogram-4-5 | 官方文档 · developer.ideogram.ai · ideogram 4 5 · developer.ideogram.ai/api-reference/images/generate/ideogram-4-5 | 官方文档 · Ideogram · Ideogram 4.5（文档 2） |
| web | ideogram/ideogram-4-5 | https://developer.ideogram.ai/api-reference/images/precise-edit/ideogram-4-5 | 官方文档 · developer.ideogram.ai · ideogram 4 5 · developer.ideogram.ai/api-reference/images/precise-edit/ideogram-4-5 | 官方文档 · Ideogram · Ideogram 4.5（文档 3） |
| web | ideogram/ideogram-edit | https://developer.ideogram.ai/v2/api-reference/images/precise-edit/ideogram-4-5 | 官方文档 · developer.ideogram.ai · ideogram 4 5 | 官方文档 · Ideogram · Ideogram 4.5 |
| web | ideogram/ideogram-edit | https://developer.ideogram.ai/v1/api-reference/edit-images/edit-with-prompt | 官方文档 · developer.ideogram.ai · edit with prompt · developer.ideogram.ai/v1/api-reference/edit-images/edit-with-prompt | 官方文档 · Ideogram · Edit With Prompt（文档） |
| web | ideogram/ideogram-edit | https://developer.ideogram.ai/ | 官方文档 · developer.ideogram.ai · 文档首页 | 官方文档 · Ideogram · 文档首页 |
| web | ideogram/ideogram-edit | https://developer.ideogram.ai/api-reference/edit-images/edit-with-prompt | 官方文档 · developer.ideogram.ai · edit with prompt · developer.ideogram.ai/api-reference/edit-images/edit-with-prompt | 官方文档 · Ideogram · Edit With Prompt（文档 2） |
| web | ideogram/p-image-ideogram | https://developer.ideogram.ai/v2/api-reference/images/generate/p-image-ideogram | 官方文档 · developer.ideogram.ai · p image ideogram | 官方文档 · Ideogram · P Image Ideogram（文档） |
| web | ideogram/p-image-ideogram | https://developer.ideogram.ai/ | 官方文档 · developer.ideogram.ai · 文档首页 | 官方文档 · Ideogram · 文档首页 |
| web | ideogram/p-image-ideogram | https://developer.ideogram.ai/api-reference/generate-images/generate-p-image-ideogram | 官方文档 · developer.ideogram.ai · generate p image ideogram | 官方文档 · Ideogram · P Image Ideogram（文档 2） |
| web | minimax/MiniMax-M3 | https://platform.minimax.io/docs/guides/models-intro | 官方文档 · minimax.io · models intro | 官方文档 · MiniMax · Models Intro |
| web | minimax/MiniMax-M3 | https://platform.minimax.io/docs/api-reference/text-openai-api | 官方文档 · minimax.io · text openai api | 官方文档 · MiniMax · Text OpenAI API |
| web | minimax/MiniMax-M2.7 | https://platform.minimax.io/docs/api-reference/text-openai-api | 官方文档 · minimax.io · text openai api | 官方文档 · MiniMax · Text OpenAI API |
| web | minimax/MiniMax-M2.7 | https://platform.minimax.io/docs/guides/models-intro | 官方文档 · minimax.io · models intro | 官方文档 · MiniMax · Models Intro |
| web | minimax/MiniMax-M2.7-highspeed | https://platform.minimax.cn/docs/api-reference/text-anthropic-api | 官方文档 · minimax.cn · text anthropic api | 官方文档 · MiniMax · Text Anthropic API |
| web | minimax/MiniMax-M2.7-highspeed | https://platform.minimax.io/docs/guides/models-intro | 官方文档 · minimax.io · models intro | 官方文档 · MiniMax · Models Intro |
| web | minimax/MiniMax-M2.7-highspeed | https://platform.minimax.io/docs/api-reference/text-openai-api | 官方文档 · minimax.io · text openai api | 官方文档 · MiniMax · Text OpenAI API |
| web | minimax/MiniMax-M2.5 | https://platform.minimax.io/docs/api-reference/text-openai-api | 官方文档 · minimax.io · text openai api | 官方文档 · MiniMax · Text OpenAI API |
| web | minimax/MiniMax-M2.5 | https://platform.minimax.io/docs/guides/models-intro | 官方文档 · minimax.io · models intro | 官方文档 · MiniMax · Models Intro |
| web | minimax/MiniMax-M2.5-highspeed | https://platform.minimax.cn/docs/api-reference/text-anthropic-api | 官方文档 · minimax.cn · text anthropic api | 官方文档 · MiniMax · Text Anthropic API |
| web | minimax/MiniMax-M2.5-highspeed | https://platform.minimax.io/docs/guides/models-intro | 官方文档 · minimax.io · models intro | 官方文档 · MiniMax · Models Intro |
| web | minimax/MiniMax-M2.5-highspeed | https://platform.minimax.io/docs/api-reference/text-openai-api | 官方文档 · minimax.io · text openai api | 官方文档 · MiniMax · Text OpenAI API |
| web | minimax/MiniMax-M2.1 | https://platform.minimax.io/docs/api-reference/text-openai-api | 官方文档 · minimax.io · text openai api | 官方文档 · MiniMax · Text OpenAI API |
| web | minimax/MiniMax-M2.1 | https://platform.minimax.io/docs/guides/models-intro | 官方文档 · minimax.io · models intro | 官方文档 · MiniMax · Models Intro |
| web | minimax/MiniMax-M2.1-highspeed | https://platform.minimax.cn/docs/api-reference/text-anthropic-api | 官方文档 · minimax.cn · text anthropic api | 官方文档 · MiniMax · Text Anthropic API |
| web | minimax/MiniMax-M2.1-highspeed | https://platform.minimax.io/docs/guides/models-intro | 官方文档 · minimax.io · models intro | 官方文档 · MiniMax · Models Intro |
| web | minimax/MiniMax-M2.1-highspeed | https://platform.minimax.io/docs/api-reference/text-openai-api | 官方文档 · minimax.io · text openai api | 官方文档 · MiniMax · Text OpenAI API |
| web | minimax/MiniMax-M2 | https://platform.minimax.io/docs/api-reference/text-openai-api | 官方文档 · minimax.io · text openai api | 官方文档 · MiniMax · Text OpenAI API |
| web | minimax/MiniMax-M2 | https://platform.minimax.io/docs/guides/models-intro | 官方文档 · minimax.io · models intro | 官方文档 · MiniMax · Models Intro |
| web | minimax/MiniMax-M3.1-Flash | https://platform.minimax.io/docs/guides/text-generation | 官方文档 · minimax.io · text generation | 官方文档 · MiniMax · Text Generation（文档） |
| web | minimax/MiniMax-M3.1-Flash | https://platform.minimax.io/docs/api-reference/text-chat-openai.md | 官方文档 · minimax.io · text chat openai.md | 官方文档 · MiniMax · Text Chat OpenAI |
| web | minimax/MiniMax-M3.1-Flash | https://platform.minimax.io/docs/pricing/overview | 官方文档 · minimax.io · overview | 官方文档 · MiniMax · 价格与规格 |
| web | minimax/MiniMax-M3.1-Flash | https://platform.minimax.cn/docs/guides/text-generation | 官方文档 · minimax.cn · text generation | 官方文档 · MiniMax · Text Generation（文档 2） |
| web | minimax/image-01 | https://platform.minimax.io/docs/api-reference/image-generation-t2i | 官方文档 · minimax.io · image generation t2i | 官方文档 · MiniMax · Image Generation T2i |
| web | minimax/image-01 | https://platform.minimax.io/docs/api-reference/image-generation-i2i | 官方文档 · minimax.io · image generation i2i | 官方文档 · MiniMax · Image Generation I2i |
| web | minimax/image-01 | https://platform.minimax.io/docs/guides/models-intro | 官方文档 · minimax.io · models intro | 官方文档 · MiniMax · Models Intro |
| web | minimax/image-01-live | https://platform.minimax.cn/docs/api-reference/image-generation-t2i | 官方文档 · minimax.cn · image generation t2i | 官方文档 · MiniMax · Image Generation T2i（文档） |
| web | minimax/image-01-live | https://platform.minimax.cn/docs/api-reference/image-generation-i2i | 官方文档 · minimax.cn · image generation i2i | 官方文档 · MiniMax · Image Generation I2i |
| web | minimax/image-01-live | https://platform.minimax.io/docs/guides/models-intro | 官方文档 · minimax.io · models intro | 官方文档 · MiniMax · Models Intro |
| web | minimax/image-01-live | https://platform.minimaxi.com/docs/api-reference/image-generation-t2i | 官方文档 · minimaxi.com · image generation t2i | 官方文档 · MiniMax · Image Generation T2i（文档 2） |
| web | mistral/mistral-large-4 | https://docs.mistral.ai/models/mistral-large-4-0 | 官方文档 · mistral.ai · mistral large 4 0 | 官方文档 · Mistral · Mistral Large 4-0 |
| web | mistral/zai-glm-5-3 | https://docs.mistral.ai/models/zai-glm-5-3 | 官方文档 · mistral.ai · zai glm 5 3 | 官方文档 · Mistral · Zai GLM 5-3 |
| web | mistral/zai-glm-5-3 | https://docs.mistral.ai/getting-started/models/models_overview/ | 官方文档 · mistral.ai · models overview | 官方文档 · Mistral · 模型概览 |
| web | mistral/mistral-medium-3-5 | https://docs.mistral.ai/models/mistral-medium-3-5-26-04 | 官方文档 · mistral.ai · mistral medium 3 5 26 04 | 官方文档 · Mistral · Mistral Medium 3-5-26-04 |
| web | mistral/mistral-medium-3-5 | https://docs.mistral.ai/getting-started/models/models_overview/ | 官方文档 · mistral.ai · models overview | 官方文档 · Mistral · 模型概览 |
| web | mistral/mistral-medium-3 | https://docs.mistral.ai/models/mistral-medium-3-5-26-04 | 官方文档 · mistral.ai · mistral medium 3 5 26 04 | 官方文档 · Mistral · Mistral Medium 3-5-26-04 |
| web | mistral/mistral-medium-3 | https://docs.mistral.ai/getting-started/models/models_overview/ | 官方文档 · mistral.ai · models overview | 官方文档 · Mistral · 模型概览 |
| web | mistral/zai-glm-5-3-flash | https://docs.mistral.ai/models/zai-glm-5-3-flash | 官方文档 · mistral.ai · zai glm 5 3 flash | 官方文档 · Mistral · GLM 5.3 Flash |
| web | mistral/zai-glm-5-2 | https://docs.mistral.ai/models/zai-glm-5-2 | 官方文档 · mistral.ai · zai glm 5 2 | 官方文档 · Mistral · Zai GLM 5-2 |
| web | mistral/zai-glm-5-2 | https://docs.mistral.ai/getting-started/models/models_overview/ | 官方文档 · mistral.ai · models overview | 官方文档 · Mistral · 模型概览 |
| web | mistral/codestral-2508 | https://docs.mistral.ai/models/codestral-25-08 | 官方文档 · mistral.ai · codestral 25 08 | 官方文档 · Mistral · Codestral 2508 |
| web | mistral/codestral-2508 | https://docs.mistral.ai/getting-started/models/models_overview/ | 官方文档 · mistral.ai · models overview | 官方文档 · Mistral · 模型概览 |
| web | mistral/codestral-latest | https://docs.mistral.ai/models/codestral-25-08 | 官方文档 · mistral.ai · codestral 25 08 | 官方文档 · Mistral · Codestral（2508） |
| web | mistral/codestral-latest | https://docs.mistral.ai/getting-started/models/models_overview/ | 官方文档 · mistral.ai · models overview | 官方文档 · Mistral · 模型概览 |
| web | mistral/labs-leanstral-1-5 | https://docs.mistral.ai/models/leanstral-1-5 | 官方文档 · mistral.ai · leanstral 1 5 | 官方文档 · Mistral · Leanstral 1-5 |
| web | mistral/labs-leanstral-1-5 | https://docs.mistral.ai/getting-started/models/models_overview/ | 官方文档 · mistral.ai · models overview | 官方文档 · Mistral · 模型概览 |
| web | mistral/ministral-14b-2512 | https://docs.mistral.ai/models/ministral-3-14b-25-12 | 官方文档 · mistral.ai · ministral 3 14b 25 12 | 官方文档 · Mistral · Ministral 3-14b 25-12 |
| web | mistral/ministral-14b-2512 | https://docs.mistral.ai/getting-started/models/models_overview/ | 官方文档 · mistral.ai · models overview | 官方文档 · Mistral · 模型概览 |
| web | mistral/ministral-14b-latest | https://docs.mistral.ai/models/ministral-3-14b-25-12 | 官方文档 · mistral.ai · ministral 3 14b 25 12 | 官方文档 · Mistral · Ministral 3-14b 25-12 |
| web | mistral/ministral-14b-latest | https://docs.mistral.ai/getting-started/models/models_overview/ | 官方文档 · mistral.ai · models overview | 官方文档 · Mistral · 模型概览 |
| web | mistral/ministral-3b-2512 | https://docs.mistral.ai/models/ministral-3-3b-25-12 | 官方文档 · mistral.ai · ministral 3 3b 25 12 | 官方文档 · Mistral · Ministral 3-3b 25-12 |
| web | mistral/ministral-3b-2512 | https://docs.mistral.ai/getting-started/models/models_overview/ | 官方文档 · mistral.ai · models overview | 官方文档 · Mistral · 模型概览 |
| web | mistral/ministral-3b-latest | https://docs.mistral.ai/models/ministral-3-3b-25-12 | 官方文档 · mistral.ai · ministral 3 3b 25 12 | 官方文档 · Mistral · Ministral 3-3b 25-12 |
| web | mistral/ministral-3b-latest | https://docs.mistral.ai/getting-started/models/models_overview/ | 官方文档 · mistral.ai · models overview | 官方文档 · Mistral · 模型概览 |
| web | mistral/ministral-8b-2512 | https://docs.mistral.ai/models/ministral-3-8b-25-12 | 官方文档 · mistral.ai · ministral 3 8b 25 12 | 官方文档 · Mistral · Ministral 3-8b 25-12 |
| web | mistral/ministral-8b-2512 | https://docs.mistral.ai/getting-started/models/models_overview/ | 官方文档 · mistral.ai · models overview | 官方文档 · Mistral · 模型概览 |
| web | mistral/ministral-8b-latest | https://docs.mistral.ai/models/ministral-3-8b-25-12 | 官方文档 · mistral.ai · ministral 3 8b 25 12 | 官方文档 · Mistral · Ministral 3-8b 25-12 |
| web | mistral/ministral-8b-latest | https://docs.mistral.ai/getting-started/models/models_overview/ | 官方文档 · mistral.ai · models overview | 官方文档 · Mistral · 模型概览 |
| web | mistral/mistral-large-2512 | https://docs.mistral.ai/models/mistral-large-3-25-12 | 官方文档 · mistral.ai · mistral large 3 25 12 | 官方文档 · Mistral · Mistral Large 3-25-12 |
| web | mistral/mistral-large-2512 | https://docs.mistral.ai/getting-started/models/models_overview/ | 官方文档 · mistral.ai · models overview | 官方文档 · Mistral · 模型概览 |
| web | mistral/mistral-medium-latest | https://docs.mistral.ai/models/mistral-medium-3-5-26-04 | 官方文档 · mistral.ai · mistral medium 3 5 26 04 | 官方文档 · Mistral · Mistral Medium 3-5-26-04 |
| web | mistral/mistral-medium-latest | https://docs.mistral.ai/getting-started/models/models_overview/ | 官方文档 · mistral.ai · models overview | 官方文档 · Mistral · 模型概览 |
| web | mistral/mistral-small-2603 | https://docs.mistral.ai/models/mistral-small-4-0-26-03 | 官方文档 · mistral.ai · mistral small 4 0 26 03 | 官方文档 · Mistral · Mistral Small 4-0-26-03 |
| web | mistral/mistral-small-2603 | https://docs.mistral.ai/getting-started/models/models_overview/ | 官方文档 · mistral.ai · models overview | 官方文档 · Mistral · 模型概览 |
| web | together/ByteDance/Seedream-5.0-lite | https://docs.volcengine.com/docs/ark/seedream-4-0-5-0?lang=zh | 官方文档 · volcengine.com · seedream 4 0 5 0 | 官方文档 · 火山方舟 · Seedream 4-0-5-0 |
| web | together/ByteDance/Seedream-5.0-lite | https://docs.volcengine.com/docs/ark/image-generation-api?lang=en | 官方文档 · volcengine.com · image generation api | 官方文档 · 火山方舟 · Image Generation API |
| web | together/ByteDance/Seedream-5.0-lite | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| web | together/ByteDance/Seedream-5.0-lite | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/MiniMaxAI/MiniMax-M3 | https://huggingface.co/MiniMaxAI/MiniMax-M3 | 官方文档 · Hugging Face · MiniMax M3 | 官方文档 · Hugging Face · Minimax M3 |
| web | together/MiniMaxAI/MiniMax-M3 | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| web | together/MiniMaxAI/MiniMax-M3 | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/Qwen/Qwen-Image-2.0 | https://help.aliyun.com/zh/model-studio/qwen-image-2-0 | 官方文档 · 百炼 · qwen image 2 0 | 官方文档 · 百炼 · Qwen Image 2.0 |
| web | together/Qwen/Qwen-Image-2.0 | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| web | together/Qwen/Qwen-Image-2.0 | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/Qwen/Qwen-Image-2.0-Pro | https://help.aliyun.com/zh/model-studio/qwen-image-2-0-pro | 官方文档 · 百炼 · qwen image 2 0 pro | 官方文档 · 百炼 · Qwen Image 2.0 Pro |
| web | together/Qwen/Qwen-Image-2.0-Pro | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| web | together/Qwen/Qwen-Image-2.0-Pro | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/Qwen/Qwen-Image | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| web | together/Qwen/Qwen-Image | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/Qwen/Qwen3.8-2.4T-A95B | https://huggingface.co/Qwen/Qwen3.8-2.4T-A95B | 官方文档 · Hugging Face · Qwen3.8 2.4T A95B | 官方文档 · Hugging Face · Qwen3.8-2.4T-A95B |
| web | together/Qwen/Qwen3.8-2.4T-A95B | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| web | together/Qwen/Qwen3.8-2.4T-A95B | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/Qwen/Qwen3.8-Flash | https://help.aliyun.com/zh/model-studio/vision-model | 官方文档 · 百炼 · vision model | 官方文档 · 百炼 · Vision Model |
| web | together/Qwen/Qwen3.8-Flash | https://help.aliyun.com/zh/model-studio/text-generation-model | 官方文档 · 百炼 · text generation model | 官方文档 · 百炼 · Text Generation Model |
| web | together/Qwen/Qwen3.8-Flash | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| web | together/Qwen/Qwen3.8-Flash | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/Qwen/Qwen3.7-Max | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| web | together/Qwen/Qwen3.7-Max | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/Qwen/Qwen3.7-Max | https://help.aliyun.com/zh/model-studio/qwen3-7-max | 官方文档 · 百炼 · qwen3 7 max | 官方文档 · 百炼 · Qwen3.7 Max |
| web | together/Qwen/Qwen3.7-Plus | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| web | together/Qwen/Qwen3.7-Plus | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/Qwen/Qwen3.7-Plus | https://help.aliyun.com/zh/model-studio/qwen3-7-plus | 官方文档 · 百炼 · qwen3 7 plus | 官方文档 · 百炼 · Qwen3.7 Plus |
| web | together/Qwen/Qwen3.6-Plus | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| web | together/Qwen/Qwen3.6-Plus | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/Qwen/Qwen3.6-Plus | https://help.aliyun.com/zh/model-studio/qwen3-6-plus | 官方文档 · 百炼 · qwen3 6 plus | 官方文档 · 百炼 · Qwen3.6 Plus |
| web | together/Qwen/Qwen3.5-9B | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| web | together/Qwen/Qwen3.5-9B | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/Wan-AI/Wan2.6-image | https://help.aliyun.com/zh/model-studio/wan2-6-image | 官方文档 · 百炼 · wan2 6 image | 官方文档 · 百炼 · Wan 2.6 Image |
| web | together/Wan-AI/Wan2.6-image | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| web | together/Wan-AI/Wan2.6-image | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/black-forest-labs/FLUX.2-dev | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| web | together/black-forest-labs/FLUX.2-dev | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/black-forest-labs/FLUX.2-flex | https://docs.bfl.ml/api-reference/models/generate-or-edit-an-image-with-flux2-[flex] | 官方文档 · bfl.ml · generate or edit an image with flux2 [flex] | 官方文档 · BFL · FLUX.2 \[flex] |
| web | together/black-forest-labs/FLUX.2-flex | https://docs.together.ai/docs/inference/images/overview | 官方文档 · together.ai · overview | 官方文档 · Together · Images |
| web | together/black-forest-labs/FLUX.2-flex | https://docs.together.ai/docs/inference/images/reference-images | 官方文档 · together.ai · reference images | 官方文档 · Together · Reference Images |
| web | together/black-forest-labs/FLUX.2-flex | https://docs.together.ai/docs/inference/images/parameters | 官方文档 · together.ai · parameters | 官方文档 · Together · Parameters |
| web | together/black-forest-labs/FLUX.2-flex | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| web | together/black-forest-labs/FLUX.2-flex | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/black-forest-labs/FLUX.2-max | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| web | together/black-forest-labs/FLUX.2-max | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/black-forest-labs/FLUX.2-pro | https://docs.bfl.ml/api-reference/models/generate-or-edit-an-image-with-flux2-[pro] | 官方文档 · bfl.ml · generate or edit an image with flux2 [pro] | 官方文档 · BFL · FLUX.2 \[pro] |
| web | together/black-forest-labs/FLUX.2-pro | https://docs.together.ai/docs/inference/images/overview | 官方文档 · together.ai · overview | 官方文档 · Together · Images |
| web | together/black-forest-labs/FLUX.2-pro | https://docs.together.ai/docs/inference/images/reference-images | 官方文档 · together.ai · reference images | 官方文档 · Together · Reference Images |
| web | together/black-forest-labs/FLUX.2-pro | https://docs.together.ai/docs/inference/images/parameters | 官方文档 · together.ai · parameters | 官方文档 · Together · Parameters |
| web | together/black-forest-labs/FLUX.2-pro | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| web | together/black-forest-labs/FLUX.2-pro | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/deepseek-ai/DeepSeek-V4.1-Flash | https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash | 官方文档 · Hugging Face · DeepSeek V4.1 Flash | 官方文档 · Hugging Face · DeepSeek-V4.1-Flash |
| web | together/deepseek-ai/DeepSeek-V4.1-Flash | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| web | together/deepseek-ai/DeepSeek-V4.1-Flash | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/deepseek-ai/DeepSeek-V4.1-Flash-1017 | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/deepseek-ai/DeepSeek-V4-Pro-0813 | https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro-0813 | 官方文档 · Hugging Face · DeepSeek V4 Pro 0813 | 官方文档 · Hugging Face · DeepSeek-V4-Pro-0813 |
| web | together/deepseek-ai/DeepSeek-V4-Pro-0813 | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| web | together/deepseek-ai/DeepSeek-V4-Pro-0813 | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/deepseek-ai/DeepSeek-V4-Flash-0731 | https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731 | 官方文档 · Hugging Face · DeepSeek V4 Flash 0731 | 官方文档 · Hugging Face · DeepSeek-V4-Flash-0731 |
| web | together/deepseek-ai/DeepSeek-V4-Flash-0731 | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| web | together/deepseek-ai/DeepSeek-V4-Flash-0731 | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/google/gemini-3-pro-image | https://ai.google.dev/gemini-api/docs/models/gemini-3-pro-image | 官方文档 · ai.google.dev · gemini 3 pro image | 官方文档 · Google · Gemini 3 Pro Image |
| web | together/google/gemini-3-pro-image | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| web | together/google/gemini-3-pro-image | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/moonshotai/Kimi-K3 | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| web | together/moonshotai/Kimi-K3 | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/openai/gpt-image-2 | https://developers.openai.com/api/docs/models/gpt-image-2.md | 原厂规格 · developers.openai.com · gpt image 2.md | 原厂规格 · OpenAI · GPT Image 2 |
| web | together/openai/gpt-image-2 | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| web | together/openai/gpt-image-2 | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/openai/gpt-image-2 | https://developers.openai.com/api/docs/models/gpt-image-2 | 官方文档 · developers.openai.com · gpt image 2 | 官方文档 · OpenAI · GPT Image 2 |
| web | together/openai/gpt-image-1.5 | https://developers.openai.com/api/docs/models/gpt-image-1.5.md | 原厂规格 · developers.openai.com · gpt image 1.5.md | 原厂规格 · OpenAI · GPT Image 1.5 |
| web | together/openai/gpt-image-1.5 | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| web | together/openai/gpt-image-1.5 | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/openai/gpt-image-1.5 | https://developers.openai.com/api/docs/models/gpt-image-1.5 | 官方文档 · developers.openai.com · gpt image 1.5 | 官方文档 · OpenAI · GPT Image 1.5 |
| web | together/stabilityai/stable-diffusion-xl-base-1.0 | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| web | together/stabilityai/stable-diffusion-xl-base-1.0 | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/zai-org/GLM-5.3 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.3 | 官方文档 · bigmodel.cn · glm 5.3 | 官方文档 · 智谱 · GLM-5.3 |
| web | together/zai-org/GLM-5.3 | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| web | together/zai-org/GLM-5.3 | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/zai-org/GLM-5.3-Flash | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5.3-flash | 官方文档 · bigmodel.cn · glm 5.3 flash | 官方文档 · 智谱 · GLM-5.3 Flash |
| web | together/zai-org/GLM-5.3-Flash | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| web | together/zai-org/GLM-5.3-Flash | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/zai-org/GLM-5.2 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.2 | 官方文档 · bigmodel.cn · glm 5.2 | 官方文档 · 智谱 · GLM-5.2 |
| web | together/zai-org/GLM-5.2 | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| web | together/zai-org/GLM-5.2 | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/ByteDance-Seed/Seedream-3.0 | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| web | together/ByteDance-Seed/Seedream-3.0 | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/ByteDance-Seed/Seedream-4.0 | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| web | together/ByteDance-Seed/Seedream-4.0 | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/MiniMaxAI/MiniMax-M3.1-Flash | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/Prism-ML/Ternary-Bonsai-27B | https://huggingface.co/prism-ml/Ternary-Bonsai-27B-gguf | 官方文档 · Hugging Face · Ternary Bonsai 27B gguf | 官方文档 · Hugging Face · Ternary Bonsai 27B Gguf |
| web | together/Prism-ML/Ternary-Bonsai-27B | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| web | together/Prism-ML/Ternary-Bonsai-27B | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/RunDiffusion/Juggernaut-pro-flux | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| web | together/RunDiffusion/Juggernaut-pro-flux | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/Rundiffusion/Juggernaut-Lightning-Flux | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| web | together/Rundiffusion/Juggernaut-Lightning-Flux | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/black-forest-labs/FLUX.1-kontext-max | https://docs.bfl.ml/api-reference/models/edit-or-create-an-image-with-flux1-kontext-[max] | 官方文档 · bfl.ml · edit or create an image with flux1 kontext [max] | 官方文档 · BFL · Flux.1 Kontext \[max] |
| web | together/black-forest-labs/FLUX.1-kontext-max | https://docs.together.ai/docs/inference/images/overview | 官方文档 · together.ai · overview | 官方文档 · Together · Images |
| web | together/black-forest-labs/FLUX.1-kontext-max | https://docs.together.ai/docs/inference/images/reference-images | 官方文档 · together.ai · reference images | 官方文档 · Together · Reference Images |
| web | together/black-forest-labs/FLUX.1-kontext-max | https://docs.together.ai/docs/inference/images/parameters | 官方文档 · together.ai · parameters | 官方文档 · Together · Parameters |
| web | together/black-forest-labs/FLUX.1-kontext-max | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| web | together/black-forest-labs/FLUX.1-kontext-max | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/black-forest-labs/FLUX.1-kontext-pro | https://docs.bfl.ml/api-reference/models/edit-or-create-an-image-with-flux1-kontext-[pro] | 官方文档 · bfl.ml · edit or create an image with flux1 kontext [pro] | 官方文档 · BFL · Flux.1 Kontext \[pro] |
| web | together/black-forest-labs/FLUX.1-kontext-pro | https://docs.together.ai/docs/inference/images/overview | 官方文档 · together.ai · overview | 官方文档 · Together · Images |
| web | together/black-forest-labs/FLUX.1-kontext-pro | https://docs.together.ai/docs/inference/images/reference-images | 官方文档 · together.ai · reference images | 官方文档 · Together · Reference Images |
| web | together/black-forest-labs/FLUX.1-kontext-pro | https://docs.together.ai/docs/inference/images/parameters | 官方文档 · together.ai · parameters | 官方文档 · Together · Parameters |
| web | together/black-forest-labs/FLUX.1-kontext-pro | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| web | together/black-forest-labs/FLUX.1-kontext-pro | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/black-forest-labs/FLUX.1.1-pro | https://docs.bfl.ml/api-reference/models/generate-an-image-with-flux11-[pro] | 官方文档 · bfl.ml · generate an image with flux11 [pro] | 官方文档 · BFL · Flux1.1 \[pro] |
| web | together/black-forest-labs/FLUX.1.1-pro | https://docs.together.ai/docs/inference/images/overview | 官方文档 · together.ai · overview | 官方文档 · Together · Images |
| web | together/black-forest-labs/FLUX.1.1-pro | https://docs.together.ai/docs/inference/images/reference-images | 官方文档 · together.ai · reference images | 官方文档 · Together · Reference Images |
| web | together/black-forest-labs/FLUX.1.1-pro | https://docs.together.ai/docs/inference/images/parameters | 官方文档 · together.ai · parameters | 官方文档 · Together · Parameters |
| web | together/black-forest-labs/FLUX.1.1-pro | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| web | together/black-forest-labs/FLUX.1.1-pro | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/google/flash-image-2.5 | https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-image | 官方文档 · ai.google.dev · gemini 2.5 flash image | 官方文档 · Google · Gemini 2.5 Flash Image |
| web | together/google/flash-image-2.5 | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| web | together/google/flash-image-2.5 | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/google/flash-image-3.1 | https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-image | 官方文档 · ai.google.dev · gemini 3.1 flash image | 官方文档 · Google · Gemini 3.1 Flash Image |
| web | together/google/flash-image-3.1 | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| web | together/google/flash-image-3.1 | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/google/flash-image-3.1-lite | https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite-image | 官方文档 · ai.google.dev · gemini 3.1 flash lite image | 官方文档 · Google · Gemini 3.1 Flash Lite Image |
| web | together/google/flash-image-3.1-lite | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| web | together/google/flash-image-3.1-lite | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/google/imagen-4.0-fast | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| web | together/google/imagen-4.0-fast | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/google/imagen-4.0-preview | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| web | together/google/imagen-4.0-preview | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/google/imagen-4.0-ultra | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| web | together/google/imagen-4.0-ultra | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/ideogram/ideogram-3.0 | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| web | together/ideogram/ideogram-3.0 | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/ideogram/ideogram-4.0 | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| web | together/ideogram/ideogram-4.0 | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/meta-llama/Llama-3.3-70B-Instruct-Turbo | https://www.together.ai/models/llama-3-3-70b | 官方文档 · together.ai · llama 3 3 70b | 官方文档 · Together · Llama 3.3 70B |
| web | together/meta-llama/Llama-3.3-70B-Instruct-Turbo | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| web | together/meta-llama/Llama-3.3-70B-Instruct-Turbo | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/meta-models/Muse-Glimmer-30B | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| web | together/meta-models/Muse-Glimmer-30B | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/meta-models/Muse-Spark-Open-816B-A42B | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/nvidia/NVIDIA-Nemotron-3.5-Super-VL | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/openai/gpt-oss-120b | https://developers.openai.com/api/docs/models/gpt-oss-120b | 官方文档 · developers.openai.com · gpt oss 120b | 官方文档 · OpenAI · GPT-OSS 120B |
| web | together/openai/gpt-oss-120b | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| web | together/openai/gpt-oss-120b | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/prunaai/p-image-ideogram | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| web | together/prunaai/p-image-ideogram | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/reflection/Beam-1.0-501B-A23B | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | together/thinkingmachines/Inkling | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| web | together/thinkingmachines/Inkling | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| web | fireworks/accounts/fireworks/models/glm-5p3 | https://fireworks.ai/models/fireworks/glm-5p3 | 官方文档 · fireworks.ai · glm 5p3 | 官方文档 · Fireworks · GLM 5.3（文档） |
| web | fireworks/accounts/fireworks/models/glm-5p3 | https://app.fireworks.ai/models/fireworks/glm-5p3 | 官方文档 · app.fireworks.ai · glm 5p3 | 官方文档 · Fireworks · GLM 5.3（控制台） |
| web | fireworks/accounts/fireworks/models/glm-5p3-flash | https://fireworks.ai/models/fireworks/glm-5p3-flash | 官方文档 · fireworks.ai · glm 5p3 flash | 官方文档 · Fireworks · GLM 5.3 Flash（文档） |
| web | fireworks/accounts/fireworks/models/glm-5p3-flash | https://app.fireworks.ai/models/fireworks/glm-5p3-flash | 官方文档 · app.fireworks.ai · glm 5p3 flash | 官方文档 · Fireworks · GLM 5.3 Flash（控制台） |
| web | fireworks/accounts/fireworks/models/kimi-k3 | https://fireworks.ai/models/fireworks/kimi-k3 | 官方文档 · fireworks.ai · Kimi-K3 模型页 | 官方文档 · Fireworks · Kimi K3（文档） |
| web | fireworks/accounts/fireworks/models/kimi-k3 | https://app.fireworks.ai/models/fireworks/kimi-k3 | 官方文档 · app.fireworks.ai · Kimi-K3 模型页 | 官方文档 · Fireworks · Kimi K3（控制台） |
| web | fireworks/accounts/fireworks/models/kimi-k2p5 | https://fireworks.ai/models/fireworks/kimi-k2p5 | 官方文档 · fireworks.ai · kimi k2p5 | 官方文档 · Fireworks · Kimi K2.5（文档） |
| web | fireworks/accounts/fireworks/models/kimi-k2p5 | https://app.fireworks.ai/models/fireworks/kimi-k2p5 | 官方文档 · app.fireworks.ai · kimi k2p5 | 官方文档 · Fireworks · Kimi K2.5（控制台） |
| web | fireworks/accounts/fireworks/models/minimax-m3 | https://fireworks.ai/models/fireworks/minimax-m3 | 官方文档 · fireworks.ai · minimax m3 | 官方文档 · Fireworks · MiniMax M3（文档） |
| web | fireworks/accounts/fireworks/models/minimax-m3 | https://app.fireworks.ai/models/fireworks/minimax-m3 | 官方文档 · app.fireworks.ai · minimax m3 | 官方文档 · Fireworks · MiniMax M3（控制台） |
| web | fireworks/accounts/fireworks/models/qwen3p8-max | https://fireworks.ai/models/fireworks/qwen3p8-max | 官方文档 · fireworks.ai · qwen3p8 max | 官方文档 · Fireworks · Qwen 3.8 Max（文档） |
| web | fireworks/accounts/fireworks/models/qwen3p8-max | https://app.fireworks.ai/models/fireworks/qwen3p8-max | 官方文档 · app.fireworks.ai · qwen3p8 max | 官方文档 · Fireworks · Qwen 3.8 Max（控制台） |
| web | fireworks/accounts/fireworks/models/qwen3p7-plus | https://fireworks.ai/models/fireworks/qwen3p7-plus | 官方文档 · fireworks.ai · qwen3p7 plus | 官方文档 · Fireworks · Qwen 3.7 Plus（文档） |
| web | fireworks/accounts/fireworks/models/qwen3p7-plus | https://app.fireworks.ai/models/fireworks/qwen3p7-plus | 官方文档 · app.fireworks.ai · qwen3p7 plus | 官方文档 · Fireworks · Qwen 3.7 Plus（控制台） |
| web | fireworks/accounts/fireworks/models/qwen3-8b | https://fireworks.ai/models/fireworks/qwen3-8b | 官方文档 · fireworks.ai · qwen3 8b | 官方文档 · Fireworks · Qwen3 8B（文档） |
| web | fireworks/accounts/fireworks/models/qwen3-8b | https://app.fireworks.ai/models/fireworks/qwen3-8b | 官方文档 · app.fireworks.ai · qwen3 8b | 官方文档 · Fireworks · Qwen3 8B（控制台） |
| web | fireworks/accounts/fireworks/models/deepseek-v4p1-flash | https://fireworks.ai/models/deepseek-ai/deepseek-v4p1-flash | 官方文档 · fireworks.ai · deepseek v4p1 flash | 官方文档 · Fireworks · DeepSeek-V4.1-Flash |
| web | fireworks/accounts/fireworks/models/deepseek-v4p1-flash-1017 | https://fireworks.ai/models/deepseek-ai/deepseek-v4p1-flash-1017 | 官方文档 · fireworks.ai · deepseek v4p1 flash 1017 | 官方文档 · Fireworks · DeepSeek V4.1 Flash 1017 |
| web | fireworks/accounts/fireworks/models/deepseek-v4p1-flash-1017 | https://fireworks.ai/models | 官方文档 · fireworks.ai · 模型列表 | 官方文档 · Fireworks · 模型列表 |
| web | fireworks/accounts/fireworks/models/gemma-4-31b-it | https://fireworks.ai/models/fireworks/gemma-4-31b-it | 官方文档 · fireworks.ai · gemma 4 31b it | 官方文档 · Fireworks · Gemma 4-31b It（文档） |
| web | fireworks/accounts/fireworks/models/gemma-4-31b-it | https://app.fireworks.ai/models/fireworks/gemma-4-31b-it | 官方文档 · app.fireworks.ai · gemma 4 31b it | 官方文档 · Fireworks · Gemma 4-31b It（控制台） |
| web | fireworks/accounts/fireworks/models/gpt-oss-120b | https://fireworks.ai/models/fireworks/gpt-oss-120b | 官方文档 · fireworks.ai · gpt oss 120b | 官方文档 · Fireworks · GPT-OSS 120B（文档） |
| web | fireworks/accounts/fireworks/models/gpt-oss-120b | https://app.fireworks.ai/models/fireworks/gpt-oss-120b | 官方文档 · app.fireworks.ai · gpt oss 120b | 官方文档 · Fireworks · GPT-OSS 120B（控制台） |
| web | fireworks/accounts/fireworks/models/kimi-k3p1-pro | https://fireworks.ai/models/fireworks/kimi-k3p1-pro | 官方文档 · fireworks.ai · kimi k3p1 pro | 官方文档 · Fireworks · Kimi K3.1 Pro |
| web | fireworks/accounts/fireworks/models/minimax-m3p1-flash | https://fireworks.ai/models/fireworks/minimax-m3p1-flash | 官方文档 · fireworks.ai · minimax m3p1 flash | 官方文档 · Fireworks · MiniMax M3.1 Flash |
| web | fireworks/accounts/fireworks/models/muse-spark-open | https://fireworks.ai/models/fireworks/muse-spark-open | 官方文档 · fireworks.ai · muse spark open | 官方文档 · Fireworks · Muse Spark Open |
| web | fireworks/accounts/fireworks/models/nemotron-3-ultra-nvfp4 | https://fireworks.ai/models/fireworks/nemotron-3-ultra-nvfp4 | 官方文档 · fireworks.ai · nemotron 3 ultra nvfp4 | 官方文档 · Fireworks · Nemotron 3 Ultra Nvfp4（文档） |
| web | fireworks/accounts/fireworks/models/nemotron-3-ultra-nvfp4 | https://app.fireworks.ai/models/fireworks/nemotron-3-ultra-nvfp4 | 官方文档 · app.fireworks.ai · nemotron 3 ultra nvfp4 | 官方文档 · Fireworks · Nemotron 3 Ultra Nvfp4（控制台） |
| web | fireworks/accounts/fireworks/models/nemotron-lightning-3p5-30b-a3b | https://fireworks.ai/models/fireworks/nemotron-lightning-3p5-30b-a3b | 官方文档 · fireworks.ai · nemotron lightning 3p5 30b a3b | 官方文档 · Fireworks · Nemotron Lightning 3p5-30b A3b（文档） |
| web | fireworks/accounts/fireworks/models/nemotron-lightning-3p5-30b-a3b | https://app.fireworks.ai/models/fireworks/nemotron-lightning-3p5-30b-a3b | 官方文档 · app.fireworks.ai · nemotron lightning 3p5 30b a3b | 官方文档 · Fireworks · Nemotron Lightning 3p5-30b A3b（控制台） |
| web | fireworks/accounts/fireworks/models/nvidia-nemotron-3-nano-omni-30b-a3b | https://fireworks.ai/models/fireworks/nvidia-nemotron-3-nano-omni-30b-a3b | 官方文档 · fireworks.ai · nvidia nemotron 3 nano omni 30b a3b | 官方文档 · Fireworks · NVIDIA Nemotron 3 Nano Omni 30B A3B（文档） |
| web | fireworks/accounts/fireworks/models/nvidia-nemotron-3-nano-omni-30b-a3b | https://app.fireworks.ai/models/fireworks/nvidia-nemotron-3-nano-omni-30b-a3b | 官方文档 · app.fireworks.ai · nvidia nemotron 3 nano omni 30b a3b | 官方文档 · Fireworks · NVIDIA Nemotron 3 Nano Omni 30B A3B（控制台） |
| web | fireworks/accounts/fireworks/models/qwen3-omni-30b-a3b-instruct | https://fireworks.ai/models/fireworks/qwen3-omni-30b-a3b-instruct | 官方文档 · fireworks.ai · qwen3 omni 30b a3b instruct | 官方文档 · Fireworks · Qwen3 Omni 30B A3B Instruct（文档） |
| web | fireworks/accounts/fireworks/models/qwen3-omni-30b-a3b-instruct | https://app.fireworks.ai/models/fireworks/qwen3-omni-30b-a3b-instruct | 官方文档 · app.fireworks.ai · qwen3 omni 30b a3b instruct | 官方文档 · Fireworks · Qwen3 Omni 30B A3B Instruct（控制台） |
| web | fireworks/accounts/fireworks/models/step-3p7-flash-nvfp4 | https://fireworks.ai/models/fireworks/step-3p7-flash-nvfp4 | 官方文档 · fireworks.ai · step 3p7 flash nvfp4 | 官方文档 · Fireworks · Step 3.7 Flash（NVFP4）（文档） |
| web | fireworks/accounts/fireworks/models/step-3p7-flash-nvfp4 | https://app.fireworks.ai/models/fireworks/step-3p7-flash-nvfp4 | 官方文档 · app.fireworks.ai · step 3p7 flash nvfp4 | 官方文档 · Fireworks · Step 3.7 Flash（NVFP4）（控制台） |
| web | fal/alibaba/qwen-image-3/text-to-image | https://fal.ai/models/alibaba/qwen-image-3/text-to-image/api | 官方文档 · fal.ai · api | 官方文档 · fal · Qwen Image 3 API 文档 |
| web | fal/bytedance/seedream/v5/flash/text-to-image | https://fal.ai/models/bytedance/seedream/v5/flash/text-to-image/api | 官方文档 · fal.ai · api · fal.ai/models/bytedance/seedream/v5/flash/text-to-image/api | 官方文档 · fal · Seedream v5 Flash API 文档 |
| web | fal/bytedance/seedream/v5/flash/text-to-image | https://fal.ai/models/bytedance/seedream/v5/flash/edit/api | 官方文档 · fal.ai · api · fal.ai/models/bytedance/seedream/v5/flash/edit/api | 官方文档 · fal · Seedream v5 Flash Edit API 文档 |
| web | fal/bytedance/seedream/v5/pro/text-to-image | https://fal.ai/models/bytedance/seedream/v5/pro/text-to-image/api | 官方文档 · fal.ai · api | 官方文档 · fal · Seedream（v5，pro） API 文档 |
| web | fal/fal-ai/bytedance/seedream/v5/lite/edit | https://fal.ai/models/fal-ai/bytedance/seedream/v5/lite/edit/api | 官方文档 · fal.ai · api | 官方文档 · fal · Seedream（v5，lite，edit） API 文档 |
| web | fal/fal-ai/bytedance/seedream/v4.5/text-to-image | https://fal.ai/models/fal-ai/bytedance/seedream/v4.5/text-to-image/api | 官方文档 · fal.ai · api | 官方文档 · fal · Seedream（v4.5） API 文档 |
| web | fal/fal-ai/bytedance/seedream/v4/text-to-image | https://fal.ai/models/fal-ai/bytedance/seedream/v4/text-to-image/api | 官方文档 · fal.ai · api | 官方文档 · fal · Seedream（v4） API 文档 |
| web | fal/fal-ai/fast-sdxl | https://fal.ai/models/fal-ai/fast-sdxl/api | 官方文档 · fal.ai · api | 官方文档 · fal · Fast SDXL API 文档 |
| web | fal/fal-ai/flux-2 | https://fal.ai/models/fal-ai/flux-2/api | 官方文档 · fal.ai · api | 官方文档 · fal · FLUX-2 API 文档 |
| web | fal/fal-ai/flux-2-flex | https://fal.ai/models/fal-ai/flux-2-flex/api | 官方文档 · fal.ai · api | 官方文档 · fal · FLUX 2 Flex API 文档 |
| web | fal/fal-ai/flux-2-pro | https://fal.ai/models/fal-ai/flux-2-pro/api | 官方文档 · fal.ai · api | 官方文档 · fal · FLUX 2 Pro API 文档 |
| web | fal/fal-ai/flux-2/flash | https://fal.ai/models/fal-ai/flux-2/flash/api | 官方文档 · fal.ai · api | 官方文档 · fal · FLUX-2（flash） API 文档 |
| web | fal/fal-ai/flux-2/klein/9b | https://fal.ai/models/fal-ai/flux-2/klein/9b/api | 官方文档 · fal.ai · api | 官方文档 · fal · FLUX-2（klein，9b） API 文档 |
| web | fal/fal-ai/flux-2/turbo | https://fal.ai/models/fal-ai/flux-2/turbo/api | 官方文档 · fal.ai · api | 官方文档 · fal · FLUX-2（turbo） API 文档 |
| web | fal/fal-ai/flux-kontext-lora | https://fal.ai/models/fal-ai/flux-kontext-lora/api | 官方文档 · fal.ai · api | 官方文档 · fal · FLUX Kontext LoRA API 文档 |
| web | fal/fal-ai/flux-pro/kontext | https://fal.ai/models/fal-ai/flux-pro/kontext/api | 官方文档 · fal.ai · api | 官方文档 · fal · FLUX Pro（Kontext） API 文档 |
| web | fal/fal-ai/flux-pro/v1.1 | https://fal.ai/models/fal-ai/flux-pro/v1.1/api | 官方文档 · fal.ai · api | 官方文档 · fal · FLUX Pro（V1.1） API 文档 |
| web | fal/fal-ai/flux-pro/v1.1-ultra | https://fal.ai/models/fal-ai/flux-pro/v1.1-ultra/api | 官方文档 · fal.ai · api | 官方文档 · fal · FLUX Pro（V1.1 Ultra） API 文档 |
| web | fal/blackforestlabs/flux-3/klein/base/text-to-image | https://fal.ai/models/blackforestlabs/flux-3/klein/base/text-to-image/api | 官方文档 · fal.ai · api · fal.ai/models/blackforestlabs/flux-3/klein/base/text-to-image/api | 官方文档 · fal · FLUX.3 Klein Base API 文档 |
| web | fal/blackforestlabs/flux-3/klein/base/text-to-image | https://fal.ai/models/blackforestlabs/flux-3/klein/base/edit-image/api | 官方文档 · fal.ai · api · fal.ai/models/blackforestlabs/flux-3/klein/base/edit-image/api | 官方文档 · fal · FLUX.3 Klein Base Edit Image API 文档 |
| web | fal/blackforestlabs/flux-3/klein/text-to-image | https://fal.ai/models/blackforestlabs/flux-3/klein/text-to-image/api | 官方文档 · fal.ai · api · fal.ai/models/blackforestlabs/flux-3/klein/text-to-image/api | 官方文档 · fal · FLUX.3 Klein API 文档 |
| web | fal/blackforestlabs/flux-3/klein/text-to-image | https://fal.ai/models/blackforestlabs/flux-3/klein/edit-image/api | 官方文档 · fal.ai · api · fal.ai/models/blackforestlabs/flux-3/klein/edit-image/api | 官方文档 · fal · FLUX.3 Klein Edit Image API 文档 |
| web | fal/blackforestlabs/flux-3/text-to-image | https://fal.ai/models/blackforestlabs/flux-3/text-to-image/api | 官方文档 · fal.ai · api · fal.ai/models/blackforestlabs/flux-3/text-to-image/api | 官方文档 · fal · FLUX.3 API 文档 |
| web | fal/blackforestlabs/flux-3/text-to-image | https://fal.ai/models/blackforestlabs/flux-3/edit-image/api | 官方文档 · fal.ai · api · fal.ai/models/blackforestlabs/flux-3/edit-image/api | 官方文档 · fal · FLUX.3 Edit Image API 文档 |
| web | fal/fal-ai/flux-1/schnell | https://fal.ai/models/fal-ai/flux-1/schnell/api | 官方文档 · fal.ai · api | 官方文档 · fal · FLUX-1（schnell） API 文档 |
| web | fal/fal-ai/flux-lora | https://fal.ai/models/fal-ai/flux-lora/api | 官方文档 · fal.ai · api | 官方文档 · fal · FLUX LoRA API 文档 |
| web | fal/fal-ai/flux/dev | https://fal.ai/models/fal-ai/flux/dev/api | 官方文档 · fal.ai · api | 官方文档 · fal · FLUX（dev） API 文档 |
| web | fal/fal-ai/flux/schnell | https://fal.ai/models/fal-ai/flux/schnell/api | 官方文档 · fal.ai · api | 官方文档 · fal · FLUX（schnell） API 文档 |
| web | fal/fal-ai/ideogram/v3 | https://fal.ai/models/fal-ai/ideogram/v3/api | 官方文档 · fal.ai · api | 官方文档 · fal · Ideogram V3 API 文档 |
| web | fal/fal-ai/nano-banana-2 | https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-image | 官方文档 · ai.google.dev · gemini 3.1 flash image | 官方文档 · Google · Gemini 3.1 Flash Image |
| web | fal/fal-ai/nano-banana-2 | https://fal.ai/models/fal-ai/nano-banana-2/api | 官方文档 · fal.ai · api | 官方文档 · fal · Nano Banana 2 API 文档 |
| web | fal/fal-ai/qwen-image | https://fal.ai/models/fal-ai/qwen-image/api | 官方文档 · fal.ai · api | 官方文档 · fal · Qwen Image API 文档 |
| web | fal/fal-ai/recraft/v4/pro/text-to-image | https://fal.ai/models/fal-ai/recraft/v4/pro/text-to-image/api | 官方文档 · fal.ai · api | 官方文档 · fal · Recraft V4 Pro API 文档 |
| web | fal/fal-ai/recraft/v3/text-to-image | https://fal.ai/models/fal-ai/recraft/v3/text-to-image/api | 官方文档 · fal.ai · api | 官方文档 · fal · Recraft V3 API 文档 |
| web | fal/google/nano-banana-2-lite | https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite-image | 官方文档 · ai.google.dev · gemini 3.1 flash lite image | 官方文档 · Google · Gemini 3.1 Flash Lite Image |
| web | fal/google/nano-banana-2-lite | https://fal.ai/models/google/nano-banana-2-lite/api | 官方文档 · fal.ai · api | 官方文档 · fal · Nano Banana 2 Lite API 文档 |
| web | fal/fal-ai/nano-banana-pro | https://ai.google.dev/gemini-api/docs/models/gemini-3-pro-image | 官方文档 · ai.google.dev · gemini 3 pro image | 官方文档 · Google · Gemini 3 Pro Image |
| web | fal/fal-ai/nano-banana-pro | https://fal.ai/models/fal-ai/nano-banana-pro/api | 官方文档 · fal.ai · api | 官方文档 · fal · Nano Banana Pro API 文档 |
| web | fal/fal-ai/nano-banana | https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-image | 官方文档 · ai.google.dev · gemini 2.5 flash image | 官方文档 · Google · Gemini 2.5 Flash Image |
| web | fal/fal-ai/nano-banana | https://fal.ai/models/fal-ai/nano-banana/api | 官方文档 · fal.ai · api | 官方文档 · fal · Nano Banana API 文档 |
| web | fal/google/nano-banana-2.1 | https://fal.ai/models/google/nano-banana-2.1/api | 官方文档 · fal.ai · api · fal.ai/models/google/nano-banana-2.1/api | 官方文档 · fal · Nano Banana 2.1 API 文档 |
| web | fal/google/nano-banana-2.1 | https://ai.google.dev/gemini-api/docs/models/gemini-nano-banana-2.1 | 官方文档 · ai.google.dev · gemini nano banana 2.1 | 官方文档 · Google · Nano Banana 2.1 |
| web | fal/google/nano-banana-2.1 | https://fal.ai/models/google/nano-banana-2.1/edit/api | 官方文档 · fal.ai · api · fal.ai/models/google/nano-banana-2.1/edit/api | 官方文档 · fal · Nano Banana 2.1 Edit API 文档 |
| web | fal/openai/gpt-image-2.5/flare/text-to-image | https://fal.ai/models/openai/gpt-image-2.5/flare/text-to-image/api | 官方文档 · fal.ai · api | 官方文档 · fal · GPT Image 2.5 Flare API 文档 |
| web | fal/openai/gpt-image-2.5/sunburst/text-to-image | https://fal.ai/models/openai/gpt-image-2.5/sunburst/text-to-image/api | 官方文档 · fal.ai · api | 官方文档 · fal · GPT Image 2.5 Sunburst API 文档 |
| web | fal/openai/gpt-image-2 | https://fal.ai/models/openai/gpt-image-2/api | 官方文档 · fal.ai · api | 官方文档 · fal · GPT Image 2 API 文档 |
| web | fal/openai/gpt-image-2 | https://developers.openai.com/api/docs/models/gpt-image-2 | 官方文档 · developers.openai.com · gpt image 2 | 官方文档 · OpenAI · GPT Image 2 |
| web | fal/fal-ai/gpt-image-1.5 | https://fal.ai/models/fal-ai/gpt-image-1.5/api | 官方文档 · fal.ai · api | 官方文档 · fal · GPT Image 1.5 API 文档 |
| web | fal/xai/grok-imagine-image/v2.0/text-to-image | https://fal.ai/models/xai/grok-imagine-image/v2.0/text-to-image/api | 官方文档 · fal.ai · api | 官方文档 · fal · Grok Imagine Image（V2.0） API 文档 |
| web | fal/xai/grok-imagine-image | https://fal.ai/models/xai/grok-imagine-image/api | 官方文档 · fal.ai · api | 官方文档 · fal · Grok Imagine Image API 文档 |
| web | fal/xai/grok-imagine-image/quality/text-to-image | https://fal.ai/models/xai/grok-imagine-image/quality/text-to-image/api | 官方文档 · fal.ai · api | 官方文档 · fal · Grok Imagine Image（Quality） API 文档 |
| web | fal/bria/fibo-edit-1.5/edit | https://fal.ai/models/bria/fibo-edit-1.5/edit/api | 官方文档 · fal.ai · api | 官方文档 · fal · Fibo Edit 1.5（Edit） API 文档 |
| web | fal/bria/fibo-gen-1.5/text-to-image | https://fal.ai/models/bria/fibo-gen-1.5/text-to-image/api | 官方文档 · fal.ai · api | 官方文档 · fal · Fibo Gen 1.5 API 文档 |
| web | fal/fal-ai/krea-2/turbo | https://fal.ai/models/fal-ai/krea-2/turbo/api | 官方文档 · fal.ai · api | 官方文档 · fal · Krea 2（Turbo） API 文档 |
| web | fal/fal-ai/z-image/turbo | https://fal.ai/models/fal-ai/z-image/turbo/api | 官方文档 · fal.ai · api | 官方文档 · fal · Z Image（Turbo） API 文档 |
| web | fal/ideogram/v4.5 | https://fal.ai/models/ideogram/v4.5/api | 官方文档 · fal.ai · api · fal.ai/models/ideogram/v4.5/api | 官方文档 · fal · Ideogram 4.5 API 文档 |
| web | fal/ideogram/v4.5 | https://fal.ai/models/ideogram/v4.5/edit/api | 官方文档 · fal.ai · api · fal.ai/models/ideogram/v4.5/edit/api | 官方文档 · fal · V4.5 Edit API 文档 |
| web | fal/imagineart/imagineart-2.0-preview/text-to-image | https://fal.ai/models/imagineart/imagineart-2.0-preview/text-to-image/api | 官方文档 · fal.ai · api | 官方文档 · fal · Imagineart 2.0 Preview API 文档 |
| web | fal/krea/v2/large/text-to-image | https://fal.ai/models/krea/v2/large/text-to-image/api | 官方文档 · fal.ai · api | 官方文档 · fal · Krea V2 Large API 文档 |
| web | fal/krea/v3/text-to-image | https://fal.ai/models/krea/v3/text-to-image/api | 官方文档 · fal.ai · api · fal.ai/models/krea/v3/text-to-image/api | 官方文档 · fal · Krea 3 API 文档 |
| web | fal/krea/v3/text-to-image | https://fal.ai/models/krea/v3/edit/api | 官方文档 · fal.ai · api · fal.ai/models/krea/v3/edit/api | 官方文档 · fal · V3 Edit API 文档 |
| web | fal/meta/muse-image/text-to-image | https://fal.ai/models/meta/muse-image/text-to-image/api | 官方文档 · fal.ai · api | 官方文档 · fal · Muse Image API 文档 |
| web | replicate/google/gemini-3.5-flash | https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash | 官方文档 · ai.google.dev · gemini 3.5 flash | 官方文档 · Google · Gemini 3.5 Flash |
| web | replicate/google/gemini-3.5-flash | https://ai.google.dev/gemini-api/docs/generate-content/image-understanding | 官方文档 · ai.google.dev · image understanding | 官方文档 · Google · Image Understanding |
| web | replicate/google/gemini-3.5-flash | https://ai.google.dev/gemini-api/docs/generate-content/thinking | 官方文档 · ai.google.dev · thinking | 官方文档 · Google · Thinking |
| web | replicate/google/gemini-3.5-flash | https://replicate.com/google/gemini-3.5-flash | 官方文档 · replicate.com · gemini 3.5 flash | 官方文档 · Replicate · Gemini 3.5 Flash |
| web | replicate/deepseek-ai/deepseek-v3.1 | https://replicate.com/deepseek-ai/deepseek-v3.1 | 官方文档 · replicate.com · deepseek v3.1 | 官方文档 · Replicate · DeepSeek V3.1 |
| web | replicate/alibaba/qwen-image-3 | https://replicate.com/alibaba/qwen-image-3 | 官方文档 · replicate.com · qwen image 3 | 官方文档 · Replicate · Qwen Image 3 |
| web | replicate/alibaba/qwen-image-3 | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/alibaba/qwen-image-3-pro | https://replicate.com/alibaba/qwen-image-3-pro | 官方文档 · replicate.com · qwen image 3 pro | 官方文档 · Replicate · Qwen Image 3 Pro |
| web | replicate/alibaba/qwen-image-3-pro | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/alibaba/wan-3 | https://replicate.com/alibaba/wan-3 | 官方文档 · replicate.com · wan 3 | 官方文档 · Replicate · Wan 3 |
| web | replicate/alibaba/wan-3 | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/anthropic/claude-opus-5.5 | https://replicate.com/anthropic/claude-opus-5.5 | 官方文档 · replicate.com · claude opus 5.5 | 官方文档 · Replicate · Claude Opus 5.5 |
| web | replicate/black-forest-labs/flux-2-flex | https://replicate.com/black-forest-labs/flux-2-flex | 官方文档 · replicate.com · flux 2 flex | 官方文档 · Replicate · FLUX 2 Flex |
| web | replicate/black-forest-labs/flux-2-flex | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/black-forest-labs/flux-2-klein-4b | https://replicate.com/black-forest-labs/flux-2-klein-4b | 官方文档 · replicate.com · flux 2 klein 4b | 官方文档 · Replicate · FLUX 2 Klein 4b |
| web | replicate/black-forest-labs/flux-2-klein-4b | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/black-forest-labs/flux-2-max | https://replicate.com/black-forest-labs/flux-2-max | 官方文档 · replicate.com · flux 2 max | 官方文档 · Replicate · FLUX 2 Max |
| web | replicate/black-forest-labs/flux-2-max | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/black-forest-labs/flux-2-pro | https://replicate.com/black-forest-labs/flux-2-pro | 官方文档 · replicate.com · flux 2 pro | 官方文档 · Replicate · FLUX 2 Pro |
| web | replicate/black-forest-labs/flux-2-pro | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/black-forest-labs/flux-kontext-dev | https://replicate.com/black-forest-labs/flux-kontext-dev | 官方文档 · replicate.com · flux kontext dev | 官方文档 · Replicate · FLUX Kontext Dev |
| web | replicate/black-forest-labs/flux-kontext-dev | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/black-forest-labs/flux-kontext-max | https://replicate.com/black-forest-labs/flux-kontext-max | 官方文档 · replicate.com · flux kontext max | 官方文档 · Replicate · FLUX Kontext Max |
| web | replicate/black-forest-labs/flux-kontext-max | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/black-forest-labs/flux-kontext-pro | https://replicate.com/black-forest-labs/flux-kontext-pro | 官方文档 · replicate.com · flux kontext pro | 官方文档 · Replicate · FLUX Kontext Pro |
| web | replicate/black-forest-labs/flux-kontext-pro | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/bytedance/seedream-5-lite | https://replicate.com/bytedance/seedream-5-lite | 官方文档 · replicate.com · seedream 5 lite | 官方文档 · Replicate · Seedream 5 Lite |
| web | replicate/bytedance/seedream-5-lite | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/bytedance/seedream-4.5 | https://replicate.com/bytedance/seedream-4.5 | 官方文档 · replicate.com · seedream 4.5 | 官方文档 · Replicate · Seedream-4.5 |
| web | replicate/bytedance/seedream-4.5 | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/bytedance/seedream-4 | https://replicate.com/bytedance/seedream-4 | 官方文档 · replicate.com · seedream 4 | 官方文档 · Replicate · Seedream-4 |
| web | replicate/bytedance/seedream-4 | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/bytedance/seedream-3 | https://replicate.com/bytedance/seedream-3 | 官方文档 · replicate.com · seedream 3 | 官方文档 · Replicate · Seedream-3 |
| web | replicate/bytedance/seedream-3 | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/google/gemini-3-flash | https://replicate.com/google/gemini-3-flash | 官方文档 · replicate.com · gemini 3 flash | 官方文档 · Replicate · Gemini 3 Flash |
| web | replicate/google/gemini-3-flash | https://ai.google.dev/gemini-api/docs/models/gemini-3-flash-preview | 官方文档 · ai.google.dev · gemini 3 flash preview | 官方文档 · Google · Gemini 3 Flash Preview |
| web | replicate/google/gemini-3-flash | https://ai.google.dev/gemini-api/docs/generate-content/image-understanding | 官方文档 · ai.google.dev · image understanding | 官方文档 · Google · Image Understanding |
| web | replicate/google/gemini-3-flash | https://ai.google.dev/gemini-api/docs/generate-content/thinking | 官方文档 · ai.google.dev · thinking | 官方文档 · Google · Thinking |
| web | replicate/google/gemini-2.5-flash | https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash | 官方文档 · ai.google.dev · gemini 2.5 flash | 官方文档 · Google · Gemini 2.5 Flash |
| web | replicate/google/gemini-2.5-flash | https://ai.google.dev/gemini-api/docs/generate-content/image-understanding | 官方文档 · ai.google.dev · image understanding | 官方文档 · Google · Image Understanding |
| web | replicate/google/gemini-2.5-flash | https://ai.google.dev/gemini-api/docs/generate-content/thinking | 官方文档 · ai.google.dev · thinking | 官方文档 · Google · Thinking |
| web | replicate/google/gemini-2.5-flash | https://replicate.com/google/gemini-2.5-flash | 官方文档 · replicate.com · gemini 2.5 flash | 官方文档 · Replicate · Gemini 2.5 Flash |
| web | replicate/google/imagen-4 | https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/4-0-generate#4.0-generate-001 | 原厂规格 · cloud.google.com · 4 0 generate | 原厂规格 · Google Cloud · 4-0 Generate |
| web | replicate/google/imagen-4 | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/google/imagen-4-fast | https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/4-0-generate#4.0-fast-generate-001 | 原厂规格 · cloud.google.com · 4 0 generate | 原厂规格 · Google Cloud · 4-0 Generate |
| web | replicate/google/imagen-4-fast | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/google/imagen-4-ultra | https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/4-0-generate#4.0-ultra-generate-001 | 原厂规格 · cloud.google.com · 4 0 generate | 原厂规格 · Google Cloud · 4-0 Generate |
| web | replicate/google/imagen-4-ultra | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/google/imagen-3 | https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/3-0-generate#3.0-generate-002 | 原厂规格 · cloud.google.com · 3 0 generate | 原厂规格 · Google Cloud · 3-0 Generate |
| web | replicate/google/imagen-3 | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/google/imagen-3-fast | https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/3-0-generate#3.0-fast-generate-001 | 原厂规格 · cloud.google.com · 3 0 generate | 原厂规格 · Google Cloud · 3-0 Generate |
| web | replicate/google/imagen-3-fast | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/google/nano-banana-2 | https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-image | 官方文档 · ai.google.dev · gemini 3.1 flash image | 官方文档 · Google · Gemini 3.1 Flash Image |
| web | replicate/google/nano-banana-2 | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/google/nano-banana-2 | https://replicate.com/google/nano-banana-2 | 官方文档 · replicate.com · nano banana 2 | 官方文档 · Replicate · Nano Banana 2 |
| web | replicate/google/nano-banana-2-lite | https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite-image | 官方文档 · ai.google.dev · gemini 3.1 flash lite image | 官方文档 · Google · Gemini 3.1 Flash Lite Image |
| web | replicate/google/nano-banana-2-lite | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/google/nano-banana-2-lite | https://replicate.com/google/nano-banana-2-lite | 官方文档 · replicate.com · nano banana 2 lite | 官方文档 · Replicate · Nano Banana 2 Lite |
| web | replicate/google/nano-banana-pro | https://ai.google.dev/gemini-api/docs/models/gemini-3-pro-image | 官方文档 · ai.google.dev · gemini 3 pro image | 官方文档 · Google · Gemini 3 Pro Image |
| web | replicate/google/nano-banana-pro | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/google/nano-banana-pro | https://replicate.com/google/nano-banana-pro | 官方文档 · replicate.com · nano banana pro | 官方文档 · Replicate · Nano Banana Pro |
| web | replicate/google/nano-banana | https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-image | 官方文档 · ai.google.dev · gemini 2.5 flash image | 官方文档 · Google · Gemini 2.5 Flash Image |
| web | replicate/google/nano-banana | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/google/nano-banana | https://replicate.com/google/nano-banana | 官方文档 · replicate.com · nano banana | 官方文档 · Replicate · Nano Banana |
| web | replicate/google/nano-banana-2.1 | https://replicate.com/google/nano-banana-2.1 | 官方文档 · replicate.com · nano banana 2.1 | 官方文档 · Replicate · Nano Banana 2.1 |
| web | replicate/google/nano-banana-2.1 | https://ai.google.dev/gemini-api/docs/models/gemini-nano-banana-2.1 | 官方文档 · ai.google.dev · gemini nano banana 2.1 | 官方文档 · Google · Nano Banana 2.1 |
| web | replicate/google/nano-banana-2.1 | https://ai.google.dev/gemini-api/docs/image-generation | 官方文档 · ai.google.dev · image generation | 官方文档 · Google · Image Generation |
| web | replicate/google/nano-banana-2.1 | https://ai.google.dev/gemini-api/docs/generate-content/thinking | 官方文档 · ai.google.dev · thinking | 官方文档 · Google · Thinking |
| web | replicate/ideogram-ai/ideogram-v3-balanced | https://replicate.com/ideogram-ai/ideogram-v3-balanced | 官方文档 · replicate.com · ideogram v3 balanced | 官方文档 · Replicate · Ideogram V3 Balanced |
| web | replicate/ideogram-ai/ideogram-v3-balanced | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/ideogram-ai/ideogram-v3-quality | https://replicate.com/ideogram-ai/ideogram-v3-quality | 官方文档 · replicate.com · ideogram v3 quality | 官方文档 · Replicate · Ideogram V3 Quality |
| web | replicate/ideogram-ai/ideogram-v3-quality | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/ideogram-ai/ideogram-v3-turbo | https://replicate.com/ideogram-ai/ideogram-v3-turbo | 官方文档 · replicate.com · ideogram v3 turbo | 官方文档 · Replicate · Ideogram V3 Turbo |
| web | replicate/ideogram-ai/ideogram-v3-turbo | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/ideogram-ai/ideogram-v2a | https://replicate.com/ideogram-ai/ideogram-v2a | 官方文档 · replicate.com · ideogram v2a | 官方文档 · Replicate · Ideogram V2a |
| web | replicate/ideogram-ai/ideogram-v2a | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/ideogram-ai/ideogram-v2a-turbo | https://replicate.com/ideogram-ai/ideogram-v2a-turbo | 官方文档 · replicate.com · ideogram v2a turbo | 官方文档 · Replicate · Ideogram V2a Turbo |
| web | replicate/ideogram-ai/ideogram-v2a-turbo | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/ideogram-ai/ideogram-v2 | https://replicate.com/ideogram-ai/ideogram-v2 | 官方文档 · replicate.com · ideogram v2 | 官方文档 · Replicate · Ideogram V2 |
| web | replicate/ideogram-ai/ideogram-v2 | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/ideogram-ai/ideogram-v2-turbo | https://replicate.com/ideogram-ai/ideogram-v2-turbo | 官方文档 · replicate.com · ideogram v2 turbo | 官方文档 · Replicate · Ideogram V2 Turbo |
| web | replicate/ideogram-ai/ideogram-v2-turbo | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/moonshotai/kimi-k2-thinking | https://replicate.com/moonshotai/kimi-k2-thinking | 官方文档 · replicate.com · kimi k2 thinking | 官方文档 · Replicate · Kimi K2 Thinking |
| web | replicate/openai/gpt-image-2.5-flare | https://developers.openai.com/api/docs/models/gpt-image-2.5-flare | 官方文档 · developers.openai.com · gpt image 2.5 flare | 官方文档 · OpenAI · GPT Image 2.5 Flare |
| web | replicate/openai/gpt-image-2.5-flare | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/openai/gpt-image-2.5-flare | https://replicate.com/openai/gpt-image-2.5-flare | 官方文档 · replicate.com · gpt image 2.5 flare | 官方文档 · Replicate · GPT Image 2.5 Flare |
| web | replicate/openai/gpt-image-2.5-sunburst | https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst | 官方文档 · developers.openai.com · gpt image 2.5 sunburst | 官方文档 · OpenAI · GPT Image 2.5 Sunburst |
| web | replicate/openai/gpt-image-2.5-sunburst | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/openai/gpt-image-2.5-sunburst | https://replicate.com/openai/gpt-image-2.5-sunburst | 官方文档 · replicate.com · gpt image 2.5 sunburst | 官方文档 · Replicate · GPT Image 2.5 Sunburst |
| web | replicate/openai/gpt-image-2 | https://developers.openai.com/api/docs/models/gpt-image-2 | 官方文档 · developers.openai.com · gpt image 2 | 官方文档 · OpenAI · GPT Image 2 |
| web | replicate/openai/gpt-image-2 | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/openai/gpt-image-2 | https://replicate.com/openai/gpt-image-2 | 官方文档 · replicate.com · gpt image 2 | 官方文档 · Replicate · GPT Image 2 |
| web | replicate/openai/gpt-image-1.5 | https://developers.openai.com/api/docs/models/gpt-image-1.5 | 官方文档 · developers.openai.com · gpt image 1.5 | 官方文档 · OpenAI · GPT Image 1.5 |
| web | replicate/openai/gpt-image-1.5 | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/openai/gpt-image-1.5 | https://replicate.com/openai/gpt-image-1.5 | 官方文档 · replicate.com · gpt image 1.5 | 官方文档 · Replicate · GPT Image 1.5 |
| web | replicate/prunaai/flux-kontext-fast | https://replicate.com/prunaai/flux-kontext-fast | 官方文档 · replicate.com · flux kontext fast | 官方文档 · Replicate · FLUX Kontext Fast |
| web | replicate/prunaai/flux-kontext-fast | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/black-forest-labs/flux-1.1-pro | https://replicate.com/black-forest-labs/flux-1.1-pro | 官方文档 · replicate.com · flux 1.1 pro | 官方文档 · Replicate · FLUX 1.1 Pro |
| web | replicate/black-forest-labs/flux-1.1-pro | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/black-forest-labs/flux-1.1-pro-ultra | https://replicate.com/black-forest-labs/flux-1.1-pro-ultra | 官方文档 · replicate.com · flux 1.1 pro ultra | 官方文档 · Replicate · FLUX 1.1 Pro Ultra |
| web | replicate/black-forest-labs/flux-1.1-pro-ultra | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/black-forest-labs/flux-3-image | https://replicate.com/black-forest-labs/flux-3-image | 官方文档 · replicate.com · flux 3 image | 官方文档 · Replicate · FLUX 3 Image |
| web | replicate/black-forest-labs/flux-dev | https://replicate.com/black-forest-labs/flux-dev | 官方文档 · replicate.com · flux dev | 官方文档 · Replicate · FLUX Dev |
| web | replicate/black-forest-labs/flux-dev | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/black-forest-labs/flux-dev-lora | https://replicate.com/black-forest-labs/flux-dev-lora | 官方文档 · replicate.com · flux dev lora | 官方文档 · Replicate · FLUX Dev LoRA |
| web | replicate/black-forest-labs/flux-dev-lora | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/black-forest-labs/flux-pro | https://replicate.com/black-forest-labs/flux-pro | 官方文档 · replicate.com · flux pro | 官方文档 · Replicate · FLUX Pro |
| web | replicate/black-forest-labs/flux-pro | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/black-forest-labs/flux-schnell | https://replicate.com/black-forest-labs/flux-schnell | 官方文档 · replicate.com · flux schnell | 官方文档 · Replicate · FLUX Schnell |
| web | replicate/black-forest-labs/flux-schnell | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/prunaai/flux-fast | https://replicate.com/prunaai/flux-fast | 官方文档 · replicate.com · flux fast | 官方文档 · Replicate · FLUX Fast |
| web | replicate/prunaai/flux-fast | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/qwen/qwen-image | https://replicate.com/qwen/qwen-image | 官方文档 · replicate.com · qwen image | 官方文档 · Replicate · Qwen Image |
| web | replicate/qwen/qwen-image | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/qwen/qwen-image-edit | https://replicate.com/qwen/qwen-image-edit | 官方文档 · replicate.com · qwen image edit | 官方文档 · Replicate · Qwen Image Edit |
| web | replicate/qwen/qwen-image-edit | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/qwen/qwen-image-edit-plus | https://replicate.com/qwen/qwen-image-edit-plus | 官方文档 · replicate.com · qwen image edit plus | 官方文档 · Replicate · Qwen Image Edit Plus |
| web | replicate/qwen/qwen-image-edit-plus | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/qwen/qwen3-235b-a22b-instruct-2507 | https://huggingface.co/Qwen/Qwen3-235B-A22B-Instruct-2507 | 官方文档 · Hugging Face · Qwen3 235B A22B Instruct 2507 | 官方文档 · Hugging Face · Qwen3-235b A22b Instruct 2507 |
| web | replicate/qwen/qwen3-235b-a22b-instruct-2507 | https://replicate.com/qwen/qwen3-235b-a22b-instruct-2507 | 官方文档 · replicate.com · qwen3 235b a22b instruct 2507 | 官方文档 · Replicate · Qwen3-235b A22b Instruct 2507 |
| web | replicate/qwen/qwen3-7-plus | https://help.aliyun.com/zh/model-studio/qwen3-7-plus | 官方文档 · 百炼 · qwen3 7 plus | 官方文档 · 百炼 · Qwen3.7 Plus |
| web | replicate/qwen/qwen3-7-plus | https://replicate.com/qwen/qwen3-7-plus | 官方文档 · replicate.com · qwen3 7 plus | 官方文档 · Replicate · Qwen3.7 Plus |
| web | replicate/recraft-ai/recraft-v4.1 | https://replicate.com/recraft-ai/recraft-v4.1 | 官方文档 · replicate.com · recraft v4.1 | 官方文档 · Replicate · Recraft V4.1 |
| web | replicate/recraft-ai/recraft-v4.1 | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/recraft-ai/recraft-v4-pro | https://replicate.com/recraft-ai/recraft-v4-pro | 官方文档 · replicate.com · recraft v4 pro | 官方文档 · Replicate · Recraft V4 Pro |
| web | replicate/recraft-ai/recraft-v4-pro | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/recraft-ai/recraft-v3 | https://replicate.com/recraft-ai/recraft-v3 | 官方文档 · replicate.com · recraft v3 | 官方文档 · Replicate · Recraft V3 |
| web | replicate/recraft-ai/recraft-v3 | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/stability-ai/stable-diffusion-3.5-large | https://replicate.com/stability-ai/stable-diffusion-3.5-large | 官方文档 · replicate.com · stable diffusion 3.5 large | 官方文档 · Replicate · Stable Diffusion 3.5 Large |
| web | replicate/stability-ai/stable-diffusion-3.5-large | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/stability-ai/stable-diffusion-3.5-large-turbo | https://replicate.com/stability-ai/stable-diffusion-3.5-large-turbo | 官方文档 · replicate.com · stable diffusion 3.5 large turbo | 官方文档 · Replicate · Stable Diffusion 3.5 Large Turbo |
| web | replicate/stability-ai/stable-diffusion-3.5-large-turbo | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/stability-ai/stable-diffusion-3.5-medium | https://replicate.com/stability-ai/stable-diffusion-3.5-medium | 官方文档 · replicate.com · stable diffusion 3.5 medium | 官方文档 · Replicate · Stable Diffusion 3.5 Medium |
| web | replicate/stability-ai/stable-diffusion-3.5-medium | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/stability-ai/sdxl | https://replicate.com/stability-ai/sdxl | 官方文档 · replicate.com · sdxl | 官方文档 · Replicate · SDXL |
| web | replicate/stability-ai/sdxl | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/stability-ai/stable-diffusion | https://replicate.com/stability-ai/stable-diffusion | 官方文档 · replicate.com · stable diffusion | 官方文档 · Replicate · Stable Diffusion |
| web | replicate/stability-ai/stable-diffusion | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/wan-video/wan-2.7-image | https://replicate.com/wan-video/wan-2.7-image | 官方文档 · replicate.com · wan 2.7 image | 官方文档 · Replicate · Wan 2.7 Image |
| web | replicate/wan-video/wan-2.7-image | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/wan-video/wan-2.7-image-pro | https://replicate.com/wan-video/wan-2.7-image-pro | 官方文档 · replicate.com · wan 2.7 image pro | 官方文档 · Replicate · Wan 2.7 Image Pro |
| web | replicate/wan-video/wan-2.7-image-pro | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/prunaai/wan-2.2-image | https://replicate.com/prunaai/wan-2.2-image | 官方文档 · replicate.com · wan 2.2 image | 官方文档 · Replicate · Wan 2.2 Image |
| web | replicate/prunaai/wan-2.2-image | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/xai/grok-imagine-image | https://replicate.com/xai/grok-imagine-image | 官方文档 · replicate.com · grok imagine image | 官方文档 · Replicate · Grok Imagine Image |
| web | replicate/xai/grok-imagine-image | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/xai/grok-imagine-image-2 | https://replicate.com/xai/grok-imagine-image-2 | 官方文档 · replicate.com · grok imagine image 2 | 官方文档 · Replicate · Grok Imagine Image 2 |
| web | replicate/xai/grok-imagine-image-2 | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/adirik/realvisxl-v3.0-turbo | https://replicate.com/adirik/realvisxl-v3.0-turbo | 官方文档 · replicate.com · realvisxl v3.0 turbo | 官方文档 · Replicate · Adirik（Realvisxl V3.0 Turbo） |
| web | replicate/adirik/realvisxl-v3.0-turbo | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/ai-forever/kandinsky-2 | https://replicate.com/ai-forever/kandinsky-2 | 官方文档 · replicate.com · kandinsky 2 | 官方文档 · Replicate · Kandinsky 2 |
| web | replicate/ai-forever/kandinsky-2 | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/ai-forever/kandinsky-2.2 | https://replicate.com/ai-forever/kandinsky-2.2 | 官方文档 · replicate.com · kandinsky 2.2 | 官方文档 · Replicate · Kandinsky 2.2 |
| web | replicate/ai-forever/kandinsky-2.2 | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/bria/fibo | https://replicate.com/bria/fibo | 官方文档 · replicate.com · fibo | 官方文档 · Replicate · Fibo |
| web | replicate/bria/fibo | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/bria/fibo-edit | https://replicate.com/bria/fibo-edit | 官方文档 · replicate.com · fibo edit | 官方文档 · Replicate · Fibo Edit |
| web | replicate/bria/fibo-edit | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/bria/image-3.2 | https://replicate.com/bria/image-3.2 | 官方文档 · replicate.com · image 3.2 | 官方文档 · Replicate · Image 3.2 |
| web | replicate/bria/image-3.2 | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/bytedance/bagel | https://replicate.com/bytedance/bagel | 官方文档 · replicate.com · bagel | 官方文档 · Replicate · Bagel |
| web | replicate/bytedance/bagel | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/bytedance/sdxl-lightning-4step | https://replicate.com/bytedance/sdxl-lightning-4step | 官方文档 · replicate.com · sdxl lightning 4step | 官方文档 · Replicate · SDXL Lightning 4step |
| web | replicate/bytedance/sdxl-lightning-4step | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/datacte/proteus-v0.2 | https://replicate.com/datacte/proteus-v0.2 | 官方文档 · replicate.com · proteus v0.2 | 官方文档 · Replicate · Datacte（Proteus V0.2） |
| web | replicate/datacte/proteus-v0.2 | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/datacte/proteus-v0.3 | https://replicate.com/datacte/proteus-v0.3 | 官方文档 · replicate.com · proteus v0.3 | 官方文档 · Replicate · Datacte（Proteus V0.3） |
| web | replicate/datacte/proteus-v0.3 | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/fofr/latent-consistency-model | https://replicate.com/fofr/latent-consistency-model | 官方文档 · replicate.com · latent consistency model | 官方文档 · Replicate · Fofr（Latent Consistency Model） |
| web | replicate/fofr/latent-consistency-model | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/fofr/sdxl-emoji | https://replicate.com/fofr/sdxl-emoji | 官方文档 · replicate.com · sdxl emoji | 官方文档 · Replicate · Fofr（SDXL Emoji） |
| web | replicate/fofr/sdxl-emoji | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/fofr/sticker-maker | https://replicate.com/fofr/sticker-maker | 官方文档 · replicate.com · sticker maker | 官方文档 · Replicate · Fofr（Sticker Maker） |
| web | replicate/fofr/sticker-maker | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/ideogram-ai/ideogram-4-5 | https://replicate.com/ideogram-ai/ideogram-4-5 | 官方文档 · replicate.com · ideogram 4 5 | 官方文档 · Replicate · Ideogram 4.5 |
| web | replicate/ideogram-ai/ideogram-4-5-precise-edit | https://replicate.com/ideogram-ai/ideogram-4-5-precise-edit | 官方文档 · replicate.com · ideogram 4 5 precise edit | 官方文档 · Replicate · Ideogram 4.5 Precise Edit |
| web | replicate/krea/krea-2-medium | https://replicate.com/krea/krea-2-medium | 官方文档 · replicate.com · krea 2 medium | 官方文档 · Replicate · Krea 2 Medium |
| web | replicate/krea/krea-2-medium | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/leonardoai/lucid-origin | https://replicate.com/leonardoai/lucid-origin | 官方文档 · replicate.com · lucid origin | 官方文档 · Replicate · Lucid Origin |
| web | replicate/leonardoai/lucid-origin | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/lucataco/dreamshaper-xl-turbo | https://replicate.com/lucataco/dreamshaper-xl-turbo | 官方文档 · replicate.com · dreamshaper xl turbo | 官方文档 · Replicate · Lucataco（Dreamshaper Xl Turbo） |
| web | replicate/lucataco/dreamshaper-xl-turbo | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/lucataco/omnigen2 | https://replicate.com/lucataco/omnigen2 | 官方文档 · replicate.com · omnigen2 | 官方文档 · Replicate · Lucataco（Omnigen2） |
| web | replicate/lucataco/omnigen2 | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/lucataco/open-dalle-v1.1 | https://replicate.com/lucataco/open-dalle-v1.1 | 官方文档 · replicate.com · open dalle v1.1 | 官方文档 · Replicate · Lucataco（Open Dalle V1.1） |
| web | replicate/lucataco/open-dalle-v1.1 | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/lucataco/realistic-vision-v5.1 | https://replicate.com/lucataco/realistic-vision-v5.1 | 官方文档 · replicate.com · realistic vision v5.1 | 官方文档 · Replicate · Lucataco（Realistic Vision V5.1） |
| web | replicate/lucataco/realistic-vision-v5.1 | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/lucataco/ssd-1b | https://replicate.com/lucataco/ssd-1b | 官方文档 · replicate.com · ssd 1b | 官方文档 · Replicate · Lucataco（Ssd 1b） |
| web | replicate/lucataco/ssd-1b | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/luma/photon | https://replicate.com/luma/photon | 官方文档 · replicate.com · photon | 官方文档 · Replicate · Photon |
| web | replicate/luma/photon | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/luma/photon-flash | https://replicate.com/luma/photon-flash | 官方文档 · replicate.com · photon flash | 官方文档 · Replicate · Photon Flash |
| web | replicate/luma/photon-flash | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/minimax/image-01 | https://replicate.com/minimax/image-01 | 官方文档 · replicate.com · image 01 | 官方文档 · Replicate · Image 01 |
| web | replicate/minimax/image-01 | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/nvidia/sana | https://replicate.com/nvidia/sana | 官方文档 · replicate.com · sana | 官方文档 · Replicate · Sana |
| web | replicate/nvidia/sana | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/nvidia/sana-sprint-1.6b | https://replicate.com/nvidia/sana-sprint-1.6b | 官方文档 · replicate.com · sana sprint 1.6b | 官方文档 · Replicate · Sana Sprint 1.6b |
| web | replicate/nvidia/sana-sprint-1.6b | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/playgroundai/playground-v2.5-1024px-aesthetic | https://replicate.com/playgroundai/playground-v2.5-1024px-aesthetic | 官方文档 · replicate.com · playground v2.5 1024px aesthetic | 官方文档 · Replicate · Playground V2.5-1024px Aesthetic |
| web | replicate/playgroundai/playground-v2.5-1024px-aesthetic | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/prunaai/hidream-l1-dev | https://replicate.com/prunaai/hidream-l1-dev | 官方文档 · replicate.com · hidream l1 dev | 官方文档 · Replicate · Hidream L1 Dev |
| web | replicate/prunaai/hidream-l1-dev | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/prunaai/hidream-l1-fast | https://replicate.com/prunaai/hidream-l1-fast | 官方文档 · replicate.com · hidream l1 fast | 官方文档 · Replicate · Hidream L1 Fast |
| web | replicate/prunaai/hidream-l1-fast | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/prunaai/hidream-l1-full | https://replicate.com/prunaai/hidream-l1-full | 官方文档 · replicate.com · hidream l1 full | 官方文档 · Replicate · Hidream L1 Full |
| web | replicate/prunaai/hidream-l1-full | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/prunaai/p-image | https://replicate.com/prunaai/p-image | 官方文档 · replicate.com · p image | 官方文档 · Replicate · P Image |
| web | replicate/prunaai/p-image | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/prunaai/p-image-edit | https://replicate.com/prunaai/p-image-edit | 官方文档 · replicate.com · p image edit | 官方文档 · Replicate · P Image Edit |
| web | replicate/prunaai/p-image-edit | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/prunaai/p-image-ideogram | https://replicate.com/prunaai/p-image-ideogram | 官方文档 · replicate.com · p image ideogram | 官方文档 · Replicate · P Image Ideogram |
| web | replicate/prunaai/p-image-ideogram | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/prunaai/p-image-lora | https://replicate.com/prunaai/p-image-lora | 官方文档 · replicate.com · p image lora | 官方文档 · Replicate · P Image LoRA |
| web | replicate/prunaai/p-image-lora | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/prunaai/sdxl-lightning | https://replicate.com/prunaai/sdxl-lightning | 官方文档 · replicate.com · sdxl lightning | 官方文档 · Replicate · SDXL Lightning |
| web | replicate/prunaai/sdxl-lightning | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/prunaai/z-image-turbo | https://replicate.com/prunaai/z-image-turbo | 官方文档 · replicate.com · z image turbo | 官方文档 · Replicate · Z Image Turbo |
| web | replicate/prunaai/z-image-turbo | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/sourceful/riverflow-2.0-pro | https://replicate.com/sourceful/riverflow-2.0-pro | 官方文档 · replicate.com · riverflow 2.0 pro | 官方文档 · Replicate · Riverflow 2.0 Pro |
| web | replicate/sourceful/riverflow-2.0-pro | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/tencent/hunyuan-image-3 | https://replicate.com/tencent/hunyuan-image-3 | 官方文档 · replicate.com · hunyuan image 3 | 官方文档 · Replicate · Hunyuan Image 3 |
| web | replicate/tencent/hunyuan-image-3 | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/tstramer/material-diffusion | https://replicate.com/tstramer/material-diffusion | 官方文档 · replicate.com · material diffusion | 官方文档 · Replicate · Tstramer（Material Diffusion） |
| web | replicate/tstramer/material-diffusion | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | replicate/zsxkib/step1x-edit | https://replicate.com/zsxkib/step1x-edit | 官方文档 · replicate.com · step1x edit | 官方文档 · Replicate · Zsxkib（Step1x Edit） |
| web | replicate/zsxkib/step1x-edit | https://replicate.com/collections/official | 官方文档 · replicate.com · official | 官方文档 · Replicate · Official |
| web | tokendance/deepseek-v4.1-flash | https://tokendance.space/models/deepseek-v4.1-flash | 官方文档 · TokenDance · deepseek v4.1 flash | 官方文档 · TokenDance · DeepSeek-V4.1-Flash |
| web | tokendance/deepseek-v4.1-flash-1017 | https://tokendance.space/models/deepseek-v4.1-flash-1017 | 官方文档 · TokenDance · deepseek v4.1 flash 1017 | 官方文档 · TokenDance · DeepSeek V4.1 Flash 1017 |
| web | tokendance/deepseek-v4-flash-vision-exp | https://api-docs.deepseek.com/news/news260821/ | 原厂规格 · DeepSeek · news260821 | 原厂规格 · DeepSeek · 更新日志 2026-08-21 |
| web | tokendance/deepseek-v4-pro-0813 | https://tokendance.space/models/deepseek-v4-pro-0813 | 官方文档 · TokenDance · deepseek v4 pro 0813 | 官方文档 · TokenDance · DeepSeek-V4-Pro-0813 |
| web | tokendance/deepseek-v4-flash-0731 | https://tokendance.space/models/deepseek-v4-flash-0731 | 官方文档 · TokenDance · deepseek v4 flash 0731 | 官方文档 · TokenDance · DeepSeek-V4-Flash-0731 |
| web | tokendance/deepseek-v4-flash | https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash | 原厂规格 · Hugging Face · DeepSeek V4 Flash | 原厂规格 · Hugging Face · DeepSeek-V4-Flash Preview |
| web | tokendance/deepseek-v4-flash | https://api-docs.deepseek.com/news/news260424/ | 官方文档 · DeepSeek · news260424 | 官方文档 · DeepSeek · 更新日志 2026-04-24 |
| web | tokendance/deepseek-v4-pro | https://tokendance.space/models/deepseek-v4-pro | 官方文档 · TokenDance · deepseek v4 pro | 官方文档 · TokenDance · DeepSeek-V4-Pro Preview |
| web | tokendance/deepseek-v3.2 | https://huggingface.co/deepseek-ai/DeepSeek-V3.2 | 原厂规格 · Hugging Face · DeepSeek V3.2 | 原厂规格 · Hugging Face · DeepSeek-V3.2 |
| web | tokendance/deepseek-chat-v3-0324 | https://api-docs.deepseek.com/news/news250325 | 原厂规格 · V3-0324 Release &#124; DeepSeek API Docs | 原厂规格 · DeepSeek · V3-0324 Release |
| web | tokendance/glm-5.3 | https://tokendance.space/models/glm-5.3 | 官方文档 · TokenDance · glm 5.3 | 官方文档 · TokenDance · GLM 5.3 |
| web | tokendance/glm-5.3-flash | https://tokendance.space/models/glm-5.3-flash | 官方文档 · TokenDance · glm 5.3 flash | 官方文档 · TokenDance · GLM 5.3 Flash |
| web | tokendance/glm-5.3-flashx | https://tokendance.space/models/glm-5.3-flashx | 官方文档 · TokenDance · glm 5.3 flashx | 官方文档 · TokenDance · GLM 5.3 FlashX |
| web | tokendance/glm-5.2 | https://tokendance.space/models/glm-5.2 | 官方文档 · TokenDance · glm 5.2 | 官方文档 · TokenDance · GLM 5.2 |
| web | tokendance/glm-5.1 | https://tokendance.space/models/glm-5.1 | 官方文档 · TokenDance · glm 5.1 | 官方文档 · TokenDance · GLM 5.1 |
| web | tokendance/glm-5 | https://tokendance.space/models/glm-5 | 官方文档 · TokenDance · glm 5 | 官方文档 · TokenDance · GLM 5 |
| web | tokendance/glm-5v-turbo | https://tokendance.space/models/glm-5v-turbo | 官方文档 · TokenDance · glm 5v turbo | 官方文档 · TokenDance · GLM 5V Turbo |
| web | tokendance/glm-4.7 | https://tokendance.space/models/glm-4.7 | 官方文档 · TokenDance · glm 4.7 | 官方文档 · TokenDance · GLM 4.7 |
| web | tokendance/glm-4.6v | https://tokendance.space/models/glm-4.6v | 官方文档 · TokenDance · glm 4.6v | 官方文档 · TokenDance · GLM 4.6V |
| web | tokendance/glm-4.5-air | https://tokendance.space/models/glm-4.5-air | 官方文档 · TokenDance · glm 4.5 air | 官方文档 · TokenDance · GLM 4.5 Air |
| web | tokendance/hy4-preview | https://tokendance.space/models/hy4-preview | 官方文档 · TokenDance · hy4 preview | 官方文档 · TokenDance · Hy4 preview |
| web | tokendance/hy3 | https://tokendance.space/models/hy3 | 官方文档 · TokenDance · hy3 | 官方文档 · TokenDance · Hy3 |
| web | tokendance/hy3-preview | https://tokendance.space/models/hy3-preview | 官方文档 · TokenDance · hy3 preview | 官方文档 · TokenDance · Hy3 preview |
| web | tokendance/kimi-k3 | https://tokendance.space/models/kimi-k3 | 官方文档 · TokenDance · Kimi-K3 模型页 | 官方文档 · TokenDance · Kimi K3 |
| web | tokendance/kimi-k2.7-code | https://tokendance.space/models/kimi-k2.7-code | 官方文档 · TokenDance · kimi k2.7 code | 官方文档 · TokenDance · Kimi K2.7 Code |
| web | tokendance/kimi-k2.6 | https://tokendance.space/models/kimi-k2.6 | 官方文档 · TokenDance · kimi k2.6 | 官方文档 · TokenDance · Kimi K2.6 |
| web | tokendance/kimi-k2.5 | https://tokendance.space/models/kimi-k2.5 | 官方文档 · TokenDance · kimi k2.5 | 官方文档 · TokenDance · Kimi K2.5 |
| web | tokendance/minimax-m3 | https://tokendance.space/models/minimax-m3 | 官方文档 · TokenDance · minimax m3 | 官方文档 · TokenDance · MiniMax M3 |
| web | tokendance/minimax-m2.7 | https://tokendance.space/models/minimax-m2.7 | 官方文档 · TokenDance · minimax m2.7 | 官方文档 · TokenDance · MiniMax M2.7 |
| web | tokendance/minimax-m2.5 | https://tokendance.space/models/minimax-m2.5 | 官方文档 · TokenDance · minimax m2.5 | 官方文档 · TokenDance · MiniMax M2.5 |
| web | tokendance/qwen3.8-flash | https://tokendance.space/models/qwen3.8-flash | 官方文档 · TokenDance · qwen3.8 flash | 官方文档 · TokenDance · Qwen3.8 Flash |
| web | tokendance/qwen3.8-max | https://tokendance.space/models/qwen3.8-max | 官方文档 · TokenDance · qwen3.8 max | 官方文档 · TokenDance · Qwen3.8 Max |
| web | tokendance/qwen3.8-max-0902 | https://tokendance.space/models/qwen3.8-max-0902 | 官方文档 · TokenDance · qwen3.8 max 0902 | 官方文档 · TokenDance · Qwen3.8-Max-0902 |
| web | tokendance/qwen3.7-max | https://tokendance.space/models/qwen3.7-max | 官方文档 · TokenDance · qwen3.7 max | 官方文档 · TokenDance · Qwen3.7 Max |
| web | tokendance/qwen3.7-plus | https://tokendance.space/models/qwen3.7-plus | 官方文档 · TokenDance · qwen3.7 plus | 官方文档 · TokenDance · Qwen3.7 Plus |
| web | tokendance/qwen3.6-max-preview | https://help.aliyun.com/zh/model-studio/qwen3-6-max | 原厂规格 · 百炼 · qwen3 6 max | 原厂规格 · 百炼 · Qwen3.6 Max |
| web | tokendance/qwen3.6-plus | https://tokendance.space/models/qwen3.6-plus | 官方文档 · TokenDance · qwen3.6 plus | 官方文档 · TokenDance · Qwen3.6 Plus |
| web | tokendance/qwen3.5-35b-a3b | https://tokendance.space/models/qwen3.5-35b-a3b | 官方文档 · TokenDance · qwen3.5 35b a3b | 官方文档 · TokenDance · Qwen3.5-35B-A3B |
| web | tokendance/qwen3.5-flash | https://tokendance.space/models/qwen3.5-flash | 官方文档 · TokenDance · qwen3.5 flash | 官方文档 · TokenDance · Qwen3.5 Flash |
| web | tokendance/qwen3.5-plus | https://tokendance.space/models/qwen3.5-plus | 官方文档 · TokenDance · qwen3.5 plus | 官方文档 · TokenDance · Qwen3.5 Plus |
| web | tokendance/qwen3.5-plus | https://help.aliyun.com/zh/model-studio/model-depreciation | 原厂规格 · 百炼 · 模型下线公告 | 下线公告 · 百炼 · 模型下线公告 |
| web | tokendance/seed-2.1-pro | https://tokendance.space/models/seed-2.1-pro | 官方文档 · TokenDance · seed 2.1 pro | 官方文档 · TokenDance · Seed-2.1-Pro |
| web | tokendance/seed-2.1-turbo | https://tokendance.space/models/seed-2.1-turbo | 官方文档 · TokenDance · seed 2.1 turbo | 官方文档 · TokenDance · Seed-2.1-Turbo |
| web | tokendance/seed-2.0-code | https://tokendance.space/models/seed-2.0-code | 官方文档 · TokenDance · seed 2.0 code | 官方文档 · TokenDance · Seed-2.0-Code |
| web | tokendance/seed-2.0-lite | https://tokendance.space/models/seed-2.0-lite | 官方文档 · TokenDance · seed 2.0 lite | 官方文档 · TokenDance · Seed-2.0-Lite |
| web | tokendance/seed-2.0-mini | https://tokendance.space/models/seed-2.0-mini | 官方文档 · TokenDance · seed 2.0 mini | 官方文档 · TokenDance · Seed-2.0-Mini |
| web | tokendance/seed-2.0-pro | https://tokendance.space/models/seed-2.0-pro | 官方文档 · TokenDance · seed 2.0 pro | 官方文档 · TokenDance · Seed-2.0-Pro |
| web | tokendance/seedream-5.0-lite | https://tokendance.space/models/seedream-5.0-lite | 官方文档 · TokenDance · seedream 5.0 lite | 官方文档 · TokenDance · Seedream 5.0 lite |
| web | tokendance/seedream-5.0-pro | https://tokendance.space/models/seedream-5.0-pro | 官方文档 · TokenDance · seedream 5.0 pro | 官方文档 · TokenDance · Seedream 5.0 Pro |
| web | tokendance/step-5-preview | https://tokendance.space/models/step-5-preview | 官方文档 · TokenDance · step 5 preview | 官方文档 · TokenDance · Step 5 Preview |
| web | tokendance/step-5-preview | https://platform.stepfun.com/docs/zh/guides/models/step-5-preview | 原厂规格 · stepfun.com · step 5 preview | 原厂规格 · StepFun · Step 5 Preview |
| web | tokendance/step-3.7-flash | https://tokendance.space/models/step-3.7-flash | 官方文档 · TokenDance · step 3.7 flash | 官方文档 · TokenDance · Step 3.7 Flash |
| web | tokendance/step-3.5-flash | https://tokendance.space/models/step-3.5-flash | 官方文档 · TokenDance · step 3.5 flash | 官方文档 · TokenDance · Step 3.5 Flash |
| web | tokendance/cogevol-base | https://tokendance.space/models/cogevol-base | 官方文档 · TokenDance · cogevol base | 官方文档 · TokenDance · CogEvol Base |
| web | tokendance/cogevol-interactive-0828 | https://tokendance.space/models/cogevol-interactive-0828 | 官方文档 · TokenDance · cogevol interactive 0828 | 官方文档 · TokenDance · CogEvol Interactive 0828 |
| web | tokendance/cogevol-slide-0828 | https://tokendance.space/models/cogevol-slide-0828 | 官方文档 · TokenDance · cogevol slide 0828 | 官方文档 · TokenDance · CogEvol Slide 0828 |
| web | tokendance/dots-3-note-preview | https://tokendance.space/models/dots-3-note-preview | 官方文档 · TokenDance · dots 3 note preview | 官方文档 · TokenDance · Dots3-Note Preview（Free） |
| web | tokendance/kimi-k3.1-pro | https://tokendance.space/models/kimi-k3.1-pro | 官方文档 · TokenDance · kimi k3.1 pro | 官方文档 · TokenDance · Kimi K3.1 Pro |
| web | tokendance/ling-3.0-flash | https://tokendance.space/models/ling-3.0-flash | 官方文档 · TokenDance · ling 3.0 flash | 官方文档 · TokenDance · Ling 3.0 Flash |
| web | tokendance/ling-3.1-flash | https://tokendance.space/models/ling-3.1-flash | 官方文档 · TokenDance · ling 3.1 flash | 官方文档 · TokenDance · Ling 3.1 Flash |
| web | tokendance/longcat-2.0 | https://tokendance.space/models/longcat-2.0 | 官方文档 · TokenDance · longcat 2.0 | 官方文档 · TokenDance · LongCat-2.0 |
| web | tokendance/mimo-v2.5 | https://tokendance.space/models/mimo-v2.5 | 官方文档 · TokenDance · mimo v2.5 | 官方文档 · TokenDance · MiMo-V2.5 |
| web | tokendance/mimo-v2.5-pro | https://tokendance.space/models/mimo-v2.5-pro | 官方文档 · TokenDance · mimo v2.5 pro | 官方文档 · TokenDance · MiMo-V2.5-Pro |
| web | tokendance/mimo-v2.6-flash | https://tokendance.space/models/mimo-v2.6-flash | 官方文档 · TokenDance · mimo v2.6 flash | 官方文档 · TokenDance · Mimo-V2.6-Flash |
| web | tokendance/mimo-v2.6-flash | https://mimo.mi.com/docs/zh-CN/api/chat/openai-api | 原厂规格 · mimo.mi.com · openai api | 原厂规格 · MiMo · OpenAI API |
| web | tokendance/mimo-v2.6-flash | https://mimo.mi.com/docs/zh-CN/usage-guide/multimodal-understanding/image-understanding | 原厂规格 · mimo.mi.com · image understanding | 原厂规格 · MiMo · Image Understanding |
| web | tokendance/mimo-v2.6-pro | https://tokendance.space/models/mimo-v2.6-pro | 官方文档 · TokenDance · mimo v2.6 pro | 官方文档 · TokenDance · Mimo-V2.6-Pro |
| web | tokendance/mimo-v2.6-pro | https://mimo.mi.com/docs/zh-CN/api/chat/openai-api | 原厂规格 · mimo.mi.com · openai api | 原厂规格 · MiMo · OpenAI API |
| web | tokendance/mimo-v2.6-pro | https://mimo.mi.com/docs/zh-CN/usage-guide/multimodal-understanding/image-understanding | 原厂规格 · mimo.mi.com · image understanding | 原厂规格 · MiMo · Image Understanding |
| web | tokendance/mimo-v2.6-ultraspeed | https://tokendance.space/models/mimo-v2.6-ultraspeed | 官方文档 · TokenDance · mimo v2.6 ultraspeed | 官方文档 · TokenDance · MiMo-V2.6-Pro-UltraSpeed |
| web | tokendance/minimax-m3.1-flash | https://tokendance.space/models/minimax-m3.1-flash | 官方文档 · TokenDance · minimax m3.1 flash | 官方文档 · TokenDance · MiniMax M3.1 Flash |
| web | tokendance/qwen3-vl-plus | https://tokendance.space/models/qwen3-vl-plus | 官方文档 · TokenDance · qwen3 vl plus | 官方文档 · TokenDance · Qwen3 VL Plus |
| web | tokendance/seed-evolving | https://tokendance.space/models/seed-evolving | 官方文档 · TokenDance · seed evolving | 官方文档 · TokenDance · Seed-Evolving |
| web | tokendance/spark-x2.5-1.7b | https://tokendance.space/models/spark-x2.5-1.7b | 官方文档 · TokenDance · spark x2.5 1.7b | 官方文档 · TokenDance · Spark-X2.5-1.7B |
| web | tokendance/spark-x2.5-4b | https://tokendance.space/models/spark-x2.5-4b | 官方文档 · TokenDance · spark x2.5 4b | 官方文档 · TokenDance · Spark-X2.5-4B |
| web | tokendance/unifuncs-s3 | https://tokendance.space/models/unifuncs-s3 | 官方文档 · TokenDance · unifuncs s3 | 官方文档 · TokenDance · Deep Search S3 |
| web | tokendance/unifuncs-s3-pro | https://tokendance.space/models/unifuncs-s3-pro | 官方文档 · TokenDance · unifuncs s3 pro | 官方文档 · TokenDance · Deep Search S3 Pro |
| web | tokendance/unifuncs-u3 | https://tokendance.space/models/unifuncs-u3 | 官方文档 · TokenDance · unifuncs u3 | 官方文档 · TokenDance · Deep Research U3 |
| web | tokendance/unifuncs-u3-pro | https://tokendance.space/models/unifuncs-u3-pro | 官方文档 · TokenDance · unifuncs u3 pro | 官方文档 · TokenDance · Deep Research U3 Pro |
| web | runware/bfl:flux@3-image-klein | https://runware.ai/docs/models/bfl-flux-3-image-klein | 官方文档 · runware.ai · bfl flux 3 image klein | 官方文档 · Runware · FLUX 3 Image Klein |
| web | runware/bfl:flux@3-image-klein-base | https://runware.ai/docs/models/bfl-flux-3-image-klein-base | 官方文档 · runware.ai · bfl flux 3 image klein base | 官方文档 · Runware · FLUX 3 Image Klein Base |
| web | runware/alibaba:qwen-image@2.1-turbo | https://runware.ai/docs/models/alibaba-qwen-image-2-1-turbo | 官方文档 · runware.ai · alibaba qwen image 2 1 turbo | 官方文档 · Runware · Qwen-Image-2.1-Turbo |
| web | runware/google:nano-banana@2.1 | https://runware.ai/docs/models/google-nano-banana-2-1 | 官方文档 · runware.ai · google nano banana 2 1 | 官方文档 · Runware · Runware |
| web | runware/google:nano-banana@2.1 | https://ai.google.dev/gemini-api/docs/models/gemini-nano-banana-2.1 | 官方文档 · ai.google.dev · gemini nano banana 2.1 | 官方文档 · Google · Gemini Nano Banana 2.1 |
| web | runware/bfl:flux@3-image | https://runware.ai/docs/models/bfl-flux-3-image | 官方文档 · runware.ai · bfl flux 3 image | 官方文档 · Runware · Runware |
| web | runware/ideogram:4.5@0 | https://runware.ai/docs/models/ideogram-4-5 | 官方文档 · runware.ai · ideogram 4 5 | 官方文档 · Runware · Ideogram 4.5 |
| web | runware/ideogram:4.5@precise-edit | https://runware.ai/docs/models/ideogram-4-5-precise-edit | 官方文档 · runware.ai · ideogram 4 5 precise edit | 官方文档 · Runware · Runware |
| web | runware/bytedance:seedream@5.0-flash | https://runware.ai/docs/models/bytedance-seedream-5-0-flash | 官方文档 · runware.ai · bytedance seedream 5 0 flash | 官方文档 · Runware · Runware |
| web | runware/recraft:v4.1@flash | https://www.recraft.ai/docs/api-reference/models/recraft-v4-1-flash | 官方文档 · recraft.ai · recraft v4 1 flash | 官方文档 · Recraft · Runware |
| web | runware/recraft:v4.1@flash | https://www.recraft.ai/docs/api-reference/appendix | 官方文档 · recraft.ai · appendix | 官方文档 · Recraft · Appendix |
| web | runware/recraft:v4.1@flash | https://runware.ai/docs/models/recraft-v4-1-flash | 官方文档 · runware.ai · recraft v4 1 flash | 官方文档 · Runware · Runware |
| web | runware/alibaba:qwen-image@2.1-pro | https://runware.ai/docs/models/alibaba-qwen-image-2-1-pro | 官方文档 · runware.ai · alibaba qwen image 2 1 pro | 官方文档 · Runware · Runware |
| web | runware/openai:gpt-image@2.5-flare | https://runware.ai/docs/models/openai-gpt-image-2-5-flare | 官方文档 · runware.ai · openai gpt image 2 5 flare | 官方文档 · Runware · GPT-Image-2.5 Flare |
| web | runware/openai:gpt-image@2.5-flare | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/openai:gpt-image@2.5-sunburst | https://runware.ai/docs/models/openai-gpt-image-2-5-sunburst | 官方文档 · runware.ai · openai gpt image 2 5 sunburst | 官方文档 · Runware · GPT-Image-2.5 Sunburst |
| web | runware/openai:gpt-image@2.5-sunburst | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/xai:grok-imagine@image-2.0 | https://runware.ai/docs/models/xai-grok-imagine-image-2-0 | 官方文档 · runware.ai · xai grok imagine image 2 0 | 官方文档 · Runware · Grok Imagine Image 2.0 |
| web | runware/xai:grok-imagine@image-2.0 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/alibaba:qwen-image@3.0 | https://runware.ai/docs/models/alibaba-qwen-image-3-0 | 官方文档 · runware.ai · alibaba qwen image 3 0 | 官方文档 · Runware · Qwen-Image-3.0 |
| web | runware/alibaba:qwen-image@3.0 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/alibaba:qwen-image@3.0-pro | https://runware.ai/docs/models/alibaba-qwen-image-3-0-pro | 官方文档 · runware.ai · alibaba qwen image 3 0 pro | 官方文档 · Runware · Qwen-Image-3.0-Pro |
| web | runware/alibaba:qwen-image@3.0-pro | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/deepseek:v4@flash | https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash | 官方文档 · Hugging Face · DeepSeek V4 Flash | 官方文档 · Hugging Face · DeepSeek-V4-Flash-0731 |
| web | runware/deepseek:v4@flash | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/deepseek:v4@flash | https://runware.ai/docs/models/deepseek-v4-flash | 官方文档 · runware.ai · deepseek v4 flash | 官方文档 · Runware · DeepSeek-V4-Flash-0731 |
| web | runware/prunaai:p-image@ideogram | https://runware.ai/docs/models/prunaai-p-image-ideogram | 官方文档 · runware.ai · prunaai p image ideogram | 官方文档 · Runware · P-Image-Ideogram |
| web | runware/prunaai:p-image@ideogram | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/krea:krea@2-turbo | https://runware.ai/docs/models/krea-2-turbo | 官方文档 · runware.ai · krea 2 turbo | 官方文档 · Runware · Krea 2 Turbo |
| web | runware/krea:krea@2-turbo | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/bytedance:seedream@5.0-pro | https://runware.ai/docs/models/bytedance-seedream-5-0-pro | 官方文档 · runware.ai · bytedance seedream 5 0 pro | 官方文档 · Runware · Seedream 5.0 Pro |
| web | runware/bytedance:seedream@5.0-pro | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/meta:muse@image | https://runware.ai/docs/models/meta-muse-image | 官方文档 · runware.ai · meta muse image | 官方文档 · Runware · Muse Image |
| web | runware/meta:muse@image | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/google:nano-banana@2-lite | https://runware.ai/docs/models/google-nano-banana-2-lite | 官方文档 · runware.ai · google nano banana 2 lite | 官方文档 · Runware · Nano Banana 2 Lite |
| web | runware/google:nano-banana@2-lite | https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite-image | 官方文档 · ai.google.dev · gemini 3.1 flash lite image | 官方文档 · Google · Gemini 3.1 Flash Lite Image |
| web | runware/google:nano-banana@2-lite | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/krea:krea@2-raw | https://runware.ai/docs/models/krea-2-raw | 官方文档 · runware.ai · krea 2 raw | 官方文档 · Runware · Krea 2 Raw |
| web | runware/krea:krea@2-raw | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/rundiffusion:300@100 | https://runware.ai/docs/models/rundiffusion-juggernaut-z-fast | 官方文档 · runware.ai · rundiffusion juggernaut z fast | 官方文档 · Runware · Juggernaut Z Fast |
| web | runware/rundiffusion:300@100 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/anthropic:claude@fable-5 | https://runware.ai/docs/models/anthropic-claude-fable-5 | 官方文档 · runware.ai · anthropic claude fable 5 | 官方文档 · Runware · Claude Fable 5 |
| web | runware/anthropic:claude@fable-5 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/sourceful:riverflow-2.5@fast | https://runware.ai/docs/models/sourceful-riverflow-2-5-fast | 官方文档 · runware.ai · sourceful riverflow 2 5 fast | 官方文档 · Runware · Riverflow 2.5 Fast |
| web | runware/sourceful:riverflow-2.5@fast | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/sourceful:riverflow-2.5@pro | https://runware.ai/docs/models/sourceful-riverflow-2-5-pro | 官方文档 · runware.ai · sourceful riverflow 2 5 pro | 官方文档 · Runware · Riverflow 2.5 Pro |
| web | runware/sourceful:riverflow-2.5@pro | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/ideogram:4@0 | https://runware.ai/docs/models/ideogram-4-0 | 官方文档 · runware.ai · ideogram 4 0 | 官方文档 · Runware · Ideogram 4.0 |
| web | runware/ideogram:4@0 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/ideogram:4@q | https://runware.ai/docs/models/ideogram-4-0q | 官方文档 · runware.ai · ideogram 4 0q | 官方文档 · Runware · Ideogram 4.0q |
| web | runware/ideogram:4@q | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/ideogram:4@remix | https://runware.ai/docs/models/ideogram-4-0-remix | 官方文档 · runware.ai · ideogram 4 0 remix | 官方文档 · Runware · Ideogram 4.0 Remix |
| web | runware/ideogram:4@remix | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/krea:krea@2-medium-turbo | https://runware.ai/docs/models/krea-2-medium-turbo | 官方文档 · runware.ai · krea 2 medium turbo | 官方文档 · Runware · Krea 2 Medium Turbo |
| web | runware/krea:krea@2-medium-turbo | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/minimax:m3@0 | https://runware.ai/docs/models/minimax-m3 | 官方文档 · runware.ai · minimax m3 | 官方文档 · Runware · MiniMax M3 |
| web | runware/minimax:m3@0 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/anthropic:claude@opus-4.8 | https://runware.ai/docs/models/anthropic-claude-opus-4-8 | 官方文档 · runware.ai · anthropic claude opus 4 8 | 官方文档 · Runware · Claude Opus 4.8 |
| web | runware/anthropic:claude@opus-4.8 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/krea:krea@2-large | https://runware.ai/docs/models/krea-2-large | 官方文档 · runware.ai · krea 2 large | 官方文档 · Runware · Krea 2 Large |
| web | runware/krea:krea@2-large | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/krea:krea@2-medium | https://runware.ai/docs/models/krea-2-medium | 官方文档 · runware.ai · krea 2 medium | 官方文档 · Runware · Krea 2 Medium |
| web | runware/krea:krea@2-medium | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/google:gemini@3.5-flash | https://runware.ai/docs/models/google-gemini-3-5-flash | 官方文档 · runware.ai · google gemini 3 5 flash | 官方文档 · Runware · Gemini 3.5 Flash |
| web | runware/google:gemini@3.5-flash | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/recraft:v4.1-pro@0 | https://runware.ai/docs/models/recraft-v4-1-pro | 官方文档 · runware.ai · recraft v4 1 pro | 官方文档 · Runware · Recraft V4.1 Pro |
| web | runware/recraft:v4.1-pro@0 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/recraft:v4.1-utility-pro@0 | https://runware.ai/docs/models/recraft-v4-1-utility-pro | 官方文档 · runware.ai · recraft v4 1 utility pro | 官方文档 · Runware · Recraft V4.1 Utility Pro |
| web | runware/recraft:v4.1-utility-pro@0 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/recraft:v4.1-utility@0 | https://runware.ai/docs/models/recraft-v4-1-utility | 官方文档 · runware.ai · recraft v4 1 utility | 官方文档 · Runware · Recraft V4.1 Utility |
| web | runware/recraft:v4.1-utility@0 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/recraft:v4.1@0 | https://runware.ai/docs/models/recraft-v4-1 | 官方文档 · runware.ai · recraft v4 1 | 官方文档 · Runware · Recraft V4.1 |
| web | runware/recraft:v4.1@0 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/xai:grok-imagine@image-quality | https://docs.x.ai/developers/migration/imagine-image-quality-nov-2 | 下线公告 · x.ai · imagine image quality nov 2 | 下线公告 · xAI · Imagine Image Quality Nov 2 |
| web | runware/xai:grok-imagine@image-quality | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/luma:uni@1 | https://runware.ai/docs/models/luma-uni-1 | 官方文档 · runware.ai · luma uni 1 | 官方文档 · Runware · UNI-1 |
| web | runware/luma:uni@1 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/luma:uni@1-max | https://runware.ai/docs/models/luma-uni-1-max | 官方文档 · runware.ai · luma uni 1 max | 官方文档 · Runware · UNI-1 Max |
| web | runware/luma:uni@1-max | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/xai:grok@4.3 | https://runware.ai/docs/models/xai-grok-4-3 | 官方文档 · runware.ai · xai grok 4 3 | 官方文档 · Runware · Grok 4.3 |
| web | runware/xai:grok@4.3 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/rundiffusion:200@100 | https://runware.ai/docs/models/rundiffusion-juggernaut-z | 官方文档 · runware.ai · rundiffusion juggernaut z | 官方文档 · Runware · Juggernaut Z |
| web | runware/rundiffusion:200@100 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/openai:gpt@5.5 | https://runware.ai/docs/models/openai-gpt-5-5 | 官方文档 · runware.ai · openai gpt 5 5 | 官方文档 · Runware · GPT-5.5 |
| web | runware/openai:gpt@5.5 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/openai:gpt-image@2 | https://runware.ai/docs/models/openai-gpt-image-2 | 官方文档 · runware.ai · openai gpt image 2 | 官方文档 · Runware · GPT Image 2 |
| web | runware/openai:gpt-image@2 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/anthropic:claude@opus-4.7 | https://runware.ai/docs/models/anthropic-claude-opus-4-7 | 官方文档 · runware.ai · anthropic claude opus 4 7 | 官方文档 · Runware · Claude Opus 4.7 |
| web | runware/anthropic:claude@opus-4.7 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/baidu:ernie-image@0 | https://runware.ai/docs/models/baidu-ernie-image | 官方文档 · runware.ai · baidu ernie image | 官方文档 · Runware · ERNIE-Image |
| web | runware/baidu:ernie-image@0 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/baidu:ernie-image@turbo | https://runware.ai/docs/models/baidu-ernie-image-turbo | 官方文档 · runware.ai · baidu ernie image turbo | 官方文档 · Runware · ERNIE-Image-Turbo |
| web | runware/baidu:ernie-image@turbo | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/imagineart:2.0@0 | https://runware.ai/docs/models/imagineart-2-0 | 官方文档 · runware.ai · imagineart 2 0 | 官方文档 · Runware · ImagineArt 2.0 |
| web | runware/imagineart:2.0@0 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/zai:glm@5.1 | https://runware.ai/docs/models/zai-glm-5-1 | 官方文档 · runware.ai · zai glm 5 1 | 官方文档 · Runware · GLM-5.1 |
| web | runware/zai:glm@5.1 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/google:gemma@4-31b | https://runware.ai/docs/models/google-gemma-4-31b | 官方文档 · runware.ai · google gemma 4 31b | 官方文档 · Runware · Gemma 4 31B |
| web | runware/google:gemma@4-31b | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/alibaba:wan@2.7-image | https://runware.ai/docs/models/alibaba-wan2-7-image | 官方文档 · runware.ai · alibaba wan2 7 image | 官方文档 · Runware · Wan2.7 Image |
| web | runware/alibaba:wan@2.7-image | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/alibaba:wan@2.7-image-pro | https://runware.ai/docs/models/alibaba-wan2-7-image-pro | 官方文档 · runware.ai · alibaba wan2 7 image pro | 官方文档 · Runware · Wan2.7 Image Pro |
| web | runware/alibaba:wan@2.7-image-pro | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/runware:400@6 | https://runware.ai/docs/models/bfl-flux-2-klein-9b-kv | 官方文档 · runware.ai · bfl flux 2 klein 9b kv | 官方文档 · Runware · FLUX.2 [klein] 9B KV |
| web | runware/runware:400@6 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/minimax:m2.7@0 | https://runware.ai/docs/models/minimax-m2-7 | 官方文档 · runware.ai · minimax m2 7 | 官方文档 · Runware · MiniMax M2.7 |
| web | runware/minimax:m2.7@0 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/minimax:m2.7@highspeed | https://runware.ai/docs/models/minimax-m2-7-highspeed | 官方文档 · runware.ai · minimax m2 7 highspeed | 官方文档 · Runware · MiniMax M2.7 Highspeed |
| web | runware/minimax:m2.7@highspeed | https://platform.minimax.cn/docs/api-reference/text-anthropic-api | 官方文档 · minimax.cn · text anthropic api | 官方文档 · MiniMax · Text Anthropic API |
| web | runware/minimax:m2.7@highspeed | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/openai:gpt@5.4-mini | https://runware.ai/docs/models/openai-gpt-5-4-mini | 官方文档 · runware.ai · openai gpt 5 4 mini | 官方文档 · Runware · GPT-5.4 Mini |
| web | runware/openai:gpt@5.4-mini | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/openai:gpt@5.4-nano | https://runware.ai/docs/models/openai-gpt-5-4-nano | 官方文档 · runware.ai · openai gpt 5 4 nano | 官方文档 · Runware · GPT-5.4 Nano |
| web | runware/openai:gpt@5.4-nano | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/openai:gpt@5.4 | https://runware.ai/docs/models/openai-gpt-5-4 | 官方文档 · runware.ai · openai gpt 5 4 | 官方文档 · Runware · GPT-5.4 |
| web | runware/openai:gpt@5.4 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/openai:gpt@5.4-pro | https://runware.ai/docs/models/openai-gpt-5-4-pro | 官方文档 · runware.ai · openai gpt 5 4 pro | 官方文档 · Runware · GPT-5.4 Pro |
| web | runware/openai:gpt@5.4-pro | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/google:gemini@3.1-flash-lite | https://runware.ai/docs/models/google-gemini-3-1-flash-lite | 官方文档 · runware.ai · google gemini 3 1 flash lite | 官方文档 · Runware · Gemini 3.1 Flash Lite |
| web | runware/google:gemini@3.1-flash-lite | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/google:4@3 | https://runware.ai/docs/models/google-nano-banana-2 | 官方文档 · runware.ai · google nano banana 2 | 官方文档 · Runware · Nano Banana 2 |
| web | runware/google:4@3 | https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-image | 官方文档 · ai.google.dev · gemini 3.1 flash image | 官方文档 · Google · Gemini 3.1 Flash Image |
| web | runware/google:4@3 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/bytedance:seedream@5.0-lite | https://runware.ai/docs/models/bytedance-seedream-5-0-lite | 官方文档 · runware.ai · bytedance seedream 5 0 lite | 官方文档 · Runware · Seedream 5.0 Lite |
| web | runware/bytedance:seedream@5.0-lite | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/google:gemini@3.1-pro | https://runware.ai/docs/models/google-gemini-3-1-pro | 官方文档 · runware.ai · google gemini 3 1 pro | 官方文档 · Runware · Gemini 3.1 Pro |
| web | runware/google:gemini@3.1-pro | https://runware.ai/docs/tools/compatible-apis | 官方文档 · runware.ai · compatible apis | 官方文档 · Runware · Compatible Apis |
| web | runware/google:gemini@3.1-pro | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/anthropic:claude@sonnet-4.6 | https://runware.ai/docs/models/anthropic-claude-sonnet-4-6 | 官方文档 · runware.ai · anthropic claude sonnet 4 6 | 官方文档 · Runware · Claude Sonnet 4.6 |
| web | runware/anthropic:claude@sonnet-4.6 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/recraft:v4-pro@0 | https://runware.ai/docs/models/recraft-v4-pro | 官方文档 · runware.ai · recraft v4 pro | 官方文档 · Runware · Recraft V4 Pro |
| web | runware/recraft:v4-pro@0 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/recraft:v4@0 | https://runware.ai/docs/models/recraft-v4 | 官方文档 · runware.ai · recraft v4 | 官方文档 · Runware · Recraft V4 |
| web | runware/recraft:v4@0 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/alibaba:qwen-image@2.0 | https://runware.ai/docs/models/alibaba-qwen-image-2-0 | 官方文档 · runware.ai · alibaba qwen image 2 0 | 官方文档 · Runware · Qwen-Image-2.0 |
| web | runware/alibaba:qwen-image@2.0 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/alibaba:qwen-image@2.0-pro | https://runware.ai/docs/models/alibaba-qwen-image-2-0-pro | 官方文档 · runware.ai · alibaba qwen image 2 0 pro | 官方文档 · Runware · Qwen-Image-2.0-Pro |
| web | runware/alibaba:qwen-image@2.0-pro | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/klingai:kling-image@3 | https://runware.ai/docs/models/klingai-image-3-0 | 官方文档 · runware.ai · klingai image 3 0 | 官方文档 · Runware · Klingai Image 3-0 |
| web | runware/klingai:kling-image@3 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/klingai:kling-image@o3 | https://runware.ai/docs/models/klingai-image-o3 | 官方文档 · runware.ai · klingai image o3 | 官方文档 · Runware · Klingai Image O3 |
| web | runware/klingai:kling-image@o3 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/sourceful:riverflow-2.0@fast | https://runware.ai/docs/models/sourceful-riverflow-2-0-fast | 官方文档 · runware.ai · sourceful riverflow 2 0 fast | 官方文档 · Runware · Riverflow 2.0 Fast |
| web | runware/sourceful:riverflow-2.0@fast | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/sourceful:riverflow-2.0@pro | https://runware.ai/docs/models/sourceful-riverflow-2-0-pro | 官方文档 · runware.ai · sourceful riverflow 2 0 pro | 官方文档 · Runware · Riverflow 2.0 Pro |
| web | runware/sourceful:riverflow-2.0@pro | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/xai:grok-imagine@image | https://runware.ai/docs/models/xai-grok-imagine-image | 官方文档 · runware.ai · xai grok imagine image | 官方文档 · Runware · Grok Imagine Image |
| web | runware/xai:grok-imagine@image | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/runware:z-image@0 | https://runware.ai/docs/models/alibaba-z-image | 官方文档 · runware.ai · alibaba z image | 官方文档 · Runware · Z-Image |
| web | runware/runware:z-image@0 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/runware:400@2 | https://runware.ai/docs/models/bfl-flux-2-klein-9b | 官方文档 · runware.ai · bfl flux 2 klein 9b | 官方文档 · Runware · FLUX.2 [klein] 9B |
| web | runware/runware:400@2 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/bria:21@1 | https://runware.ai/docs/models/bria-fibo-2-0-edit | 官方文档 · runware.ai · bria fibo 2 0 edit | 官方文档 · Runware · Bria FIBO 2.0 Edit |
| web | runware/bria:21@1 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/imagineart:1.5-pro@0 | https://runware.ai/docs/models/imagineart-1-5-pro | 官方文档 · runware.ai · imagineart 1 5 pro | 官方文档 · Runware · ImagineArt 1.5 Pro |
| web | runware/imagineart:1.5-pro@0 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/runware:400@3 | https://runware.ai/docs/models/bfl-flux-2-klein-9b-base | 官方文档 · runware.ai · bfl flux 2 klein 9b base | 官方文档 · Runware · FLUX.2 [klein] 9B Base |
| web | runware/runware:400@3 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/runware:400@4 | https://runware.ai/docs/models/bfl-flux-2-klein-4b | 官方文档 · runware.ai · bfl flux 2 klein 4b | 官方文档 · Runware · FLUX.2 [klein] 4B |
| web | runware/runware:400@4 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/runware:400@5 | https://runware.ai/docs/models/bfl-flux-2-klein-4b-base | 官方文档 · runware.ai · bfl flux 2 klein 4b base | 官方文档 · Runware · FLUX.2 [klein] 4B Base |
| web | runware/runware:400@5 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/bria:20@3 | https://runware.ai/docs/models/bria-fibo-lite | 官方文档 · runware.ai · bria fibo lite | 官方文档 · Runware · Bria FIBO Lite |
| web | runware/bria:20@3 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/runware:twinflow-z-image-turbo@0 | https://runware.ai/docs/models/twinflow-z-image-turbo | 官方文档 · runware.ai · twinflow z image turbo | 官方文档 · Runware · TwinFlow Z-Image-Turbo |
| web | runware/runware:twinflow-z-image-turbo@0 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/alibaba:qwen-image@2512 | https://runware.ai/docs/models/alibaba-qwen-image-2512 | 官方文档 · runware.ai · alibaba qwen image 2512 | 官方文档 · Runware · Qwen-Image-2512 |
| web | runware/alibaba:qwen-image@2512 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/google:gemini@3-flash | https://runware.ai/docs/models/google-gemini-3-flash | 官方文档 · runware.ai · google gemini 3 flash | 官方文档 · Runware · Gemini 3 Flash |
| web | runware/google:gemini@3-flash | https://runware.ai/docs/tools/compatible-apis | 官方文档 · runware.ai · compatible apis | 官方文档 · Runware · Compatible Apis |
| web | runware/google:gemini@3-flash | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/alibaba:wan@2.6-image | https://runware.ai/docs/models/alibaba-wan2-6-image | 官方文档 · runware.ai · alibaba wan2 6 image | 官方文档 · Runware · Wan2.6 Image |
| web | runware/alibaba:wan@2.6-image | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/bfl:7@1 | https://runware.ai/docs/models/bfl-flux-2-max | 官方文档 · runware.ai · bfl flux 2 max | 官方文档 · Runware · FLUX.2 [max] |
| web | runware/bfl:7@1 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/openai:4@1 | https://runware.ai/docs/models/openai-gpt-image-1-5 | 官方文档 · runware.ai · openai gpt image 1 5 | 官方文档 · Runware · GPT Image 1.5 |
| web | runware/openai:4@1 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/bytedance:seedream@4.5 | https://runware.ai/docs/models/bytedance-seedream-4-5 | 官方文档 · runware.ai · bytedance seedream 4 5 | 官方文档 · Runware · Seedream 4.5 |
| web | runware/bytedance:seedream@4.5 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/klingai:kling-image@o1 | https://runware.ai/docs/models/klingai-image-o1 | 官方文档 · runware.ai · klingai image o1 | 官方文档 · Runware · Klingai Image O1 |
| web | runware/klingai:kling-image@o1 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/prunaai:1@1 | https://runware.ai/docs/models/prunaai-p-image | 官方文档 · runware.ai · prunaai p image | 官方文档 · Runware · P-Image |
| web | runware/prunaai:1@1 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/bfl:5@1 | https://runware.ai/docs/models/bfl-flux-2-pro | 官方文档 · runware.ai · bfl flux 2 pro | 官方文档 · Runware · FLUX.2 [pro] |
| web | runware/bfl:5@1 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/runware:kandinsky-5.0-image-lite@1 | https://runware.ai/docs/models/kandinsky-5-0-image-lite | 官方文档 · runware.ai · kandinsky 5 0 image lite | 官方文档 · Runware · Kandinsky 5.0 Image Lite |
| web | runware/runware:kandinsky-5.0-image-lite@1 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/runware:z-image@turbo | https://runware.ai/docs/models/alibaba-z-image-turbo | 官方文档 · runware.ai · alibaba z image turbo | 官方文档 · Runware · Z-Image-Turbo |
| web | runware/runware:z-image@turbo | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/alibaba:qwen-image-edit@2511 | https://runware.ai/docs/models/alibaba-qwen-image-edit-2511 | 官方文档 · runware.ai · alibaba qwen image edit 2511 | 官方文档 · Runware · Qwen-Image-Edit-2511 |
| web | runware/alibaba:qwen-image-edit@2511 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/bfl:6@1 | https://runware.ai/docs/models/bfl-flux-2-flex | 官方文档 · runware.ai · bfl flux 2 flex | 官方文档 · Runware · FLUX.2 [flex] |
| web | runware/bfl:6@1 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/runware:400@1 | https://runware.ai/docs/models/bfl-flux-2-dev | 官方文档 · runware.ai · bfl flux 2 dev | 官方文档 · Runware · FLUX.2 [dev] |
| web | runware/runware:400@1 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/google:4@2 | https://runware.ai/docs/models/google-nano-banana-pro | 官方文档 · runware.ai · google nano banana pro | 官方文档 · Runware · Nano Banana Pro |
| web | runware/google:4@2 | https://ai.google.dev/gemini-api/docs/models/gemini-3-pro-image | 官方文档 · ai.google.dev · gemini 3 pro image | 官方文档 · Google · Gemini 3 Pro Image |
| web | runware/google:4@2 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/imagineart:1@5 | https://runware.ai/docs/models/imagineart-1-5 | 官方文档 · runware.ai · imagineart 1 5 | 官方文档 · Runware · ImagineArt 1.5 |
| web | runware/imagineart:1@5 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/prunaai:2@1 | https://runware.ai/docs/models/prunaai-p-image-edit | 官方文档 · runware.ai · prunaai p image edit | 官方文档 · Runware · P-Image-Edit |
| web | runware/prunaai:2@1 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/bria:20@1 | https://runware.ai/docs/models/bria-fibo-2-0 | 官方文档 · runware.ai · bria fibo 2 0 | 官方文档 · Runware · Bria FIBO 2.0 |
| web | runware/bria:20@1 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/anthropic:claude@haiku-4.5 | https://runware.ai/docs/models/anthropic-claude-haiku-4-5 | 官方文档 · runware.ai · anthropic claude haiku 4 5 | 官方文档 · Runware · Claude Haiku 4.5 |
| web | runware/anthropic:claude@haiku-4.5 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/runware:201@10 | https://runware.ai/docs/models/alibaba-wan2-5-preview-image | 官方文档 · runware.ai · alibaba wan2 5 preview image | 官方文档 · Runware · Wan2.5-Preview Image |
| web | runware/runware:201@10 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/runware:108@22 | https://runware.ai/docs/models/alibaba-qwen-image-edit-plus | 官方文档 · runware.ai · alibaba qwen image edit plus | 官方文档 · Runware · Qwen-Image-Edit-Plus |
| web | runware/runware:108@22 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/bria:11@1 | https://runware.ai/docs/models/bria-image-replace-background | 官方文档 · runware.ai · bria image replace background | 官方文档 · Runware · Bria Image Replace Background |
| web | runware/bria:11@1 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/runware:111@1 | https://runware.ai/docs/models/flux-1-dev-srpo | 官方文档 · runware.ai · flux 1 dev srpo | 官方文档 · Runware · FLUX.1 [dev] SRPO |
| web | runware/runware:111@1 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/bytedance:5@0 | https://runware.ai/docs/models/bytedance-seedream-4-0 | 官方文档 · runware.ai · bytedance seedream 4 0 | 官方文档 · Runware · Seedream 4.0 |
| web | runware/bytedance:5@0 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/google:4@1 | https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-image | 官方文档 · ai.google.dev · gemini 2.5 flash image | 官方文档 · Google · Gemini 2.5 Flash Image |
| web | runware/google:4@1 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/google:4@1 | https://runware.ai/docs/models/google-nano-banana | 官方文档 · runware.ai · google nano banana | 官方文档 · Runware · Nano Banana |
| web | runware/runware:108@20 | https://runware.ai/docs/models/alibaba-qwen-image-edit | 官方文档 · runware.ai · alibaba qwen image edit | 官方文档 · Runware · Qwen-Image-Edit |
| web | runware/runware:108@20 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/runway:4@2 | https://runware.ai/docs/models/runway-gen-4-image-turbo | 官方文档 · runware.ai · runway gen 4 image turbo | 官方文档 · Runware · Runway Gen-4 Image Turbo |
| web | runware/runway:4@2 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/openai:gpt@5-mini | https://runware.ai/docs/models/openai-gpt-5-mini | 官方文档 · runware.ai · openai gpt 5 mini | 官方文档 · Runware · GPT-5 Mini |
| web | runware/openai:gpt@5-mini | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/openai:gpt@5-nano | https://runware.ai/docs/models/openai-gpt-5-nano | 官方文档 · runware.ai · openai gpt 5 nano | 官方文档 · Runware · GPT-5 Nano |
| web | runware/openai:gpt@5-nano | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/runware:108@1 | https://runware.ai/docs/models/alibaba-qwen-image | 官方文档 · runware.ai · alibaba qwen image | 官方文档 · Runware · Qwen-Image |
| web | runware/runware:108@1 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/runware:107@1 | https://runware.ai/docs/models/krea-flux-1-krea-dev | 官方文档 · runware.ai · krea flux 1 krea dev | 官方文档 · Runware · FLUX.1 Krea [dev] |
| web | runware/runware:107@1 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/bfl:3@1 | https://runware.ai/docs/models/bfl-flux-1-kontext-pro | 官方文档 · runware.ai · bfl flux 1 kontext pro | 官方文档 · Runware · FLUX.1 Kontext [pro] |
| web | runware/bfl:3@1 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/bfl:4@1 | https://runware.ai/docs/models/bfl-flux-1-kontext-max | 官方文档 · runware.ai · bfl flux 1 kontext max | 官方文档 · Runware · FLUX.1 Kontext [max] |
| web | runware/bfl:4@1 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/runware:106@1 | https://runware.ai/docs/models/bfl-flux-1-kontext-dev | 官方文档 · runware.ai · bfl flux 1 kontext dev | 官方文档 · Runware · FLUX.1 Kontext [dev] |
| web | runware/runware:106@1 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/runware:5@1 | https://runware.ai/docs/models/stabilityai-stable-diffusion-3 | 官方文档 · runware.ai · stabilityai stable diffusion 3 | 官方文档 · Runware · Stable Diffusion 3 |
| web | runware/runware:5@1 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/bria:10@1 | https://runware.ai/docs/models/bria-3-2 | 官方文档 · runware.ai · bria 3 2 | 官方文档 · Runware · Bria 3.2 |
| web | runware/bria:10@1 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/runway:4@1 | https://runware.ai/docs/models/runway-gen-4-image | 官方文档 · runware.ai · runway gen 4 image | 官方文档 · Runware · Runway Gen-4 Image |
| web | runware/runway:4@1 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/ideogram:4@3 | https://runware.ai/docs/models/ideogram-3-0-edit | 官方文档 · runware.ai · ideogram 3 0 edit | 官方文档 · Runware · Ideogram 3.0 Edit |
| web | runware/ideogram:4@3 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/ideogram:4@2 | https://runware.ai/docs/models/ideogram-3-0-remix | 官方文档 · runware.ai · ideogram 3 0 remix | 官方文档 · Runware · Ideogram 3.0 Remix |
| web | runware/ideogram:4@2 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/openai:1@2 | https://runware.ai/docs/models/openai-gpt-image-1-mini | 官方文档 · runware.ai · openai gpt image 1 mini | 官方文档 · Runware · GPT Image 1 Mini |
| web | runware/openai:1@2 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/runware:97@2 | https://runware.ai/docs/models/hidream-i1-dev | 官方文档 · runware.ai · hidream i1 dev | 官方文档 · Runware · HiDream-I1 Dev |
| web | runware/runware:97@2 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/runware:97@1 | https://runware.ai/docs/models/hidream-i1-full | 官方文档 · runware.ai · hidream i1 full | 官方文档 · Runware · HiDream-I1 Full |
| web | runware/runware:97@1 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/runware:97@3 | https://runware.ai/docs/models/hidream-i1-fast | 官方文档 · runware.ai · hidream i1 fast | 官方文档 · Runware · HiDream-I1 Fast |
| web | runware/runware:97@3 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/vidu:q1@image | https://runware.ai/docs/models/vidu-q1-image | 官方文档 · runware.ai · vidu q1 image | 官方文档 · Runware · Vidu Q1 |
| web | runware/vidu:q1@image | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/ideogram:4@1 | https://runware.ai/docs/models/ideogram-3-0 | 官方文档 · runware.ai · ideogram 3 0 | 官方文档 · Runware · Ideogram 3.0 |
| web | runware/ideogram:4@1 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/ideogram:4@5 | https://runware.ai/docs/models/ideogram-3-0-replace-background | 官方文档 · runware.ai · ideogram 3 0 replace background | 官方文档 · Runware · Ideogram 3.0 Replace Background |
| web | runware/ideogram:4@5 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/openai:1@1 | https://developers.openai.com/api/docs/models/gpt-image-1 | 原厂规格 · developers.openai.com · gpt image 1 | 原厂规格 · OpenAI · GPT Image 1 |
| web | runware/openai:1@1 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/rundiffusion:110@101 | https://runware.ai/docs/models/rundiffusion-juggernaut-lightning-flux | 官方文档 · runware.ai · rundiffusion juggernaut lightning flux | 官方文档 · Runware · Juggernaut Lightning Flux |
| web | runware/rundiffusion:110@101 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/rundiffusion:120@100 | https://runware.ai/docs/models/rundiffusion-juggernaut-base-flux | 官方文档 · runware.ai · rundiffusion juggernaut base flux | 官方文档 · Runware · Juggernaut Base Flux |
| web | runware/rundiffusion:120@100 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/rundiffusion:130@100 | https://runware.ai/docs/models/rundiffusion-juggernaut-pro-flux | 官方文档 · runware.ai · rundiffusion juggernaut pro flux | 官方文档 · Runware · Juggernaut Pro Flux |
| web | runware/rundiffusion:130@100 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/ideogram:2@1 | https://runware.ai/docs/models/ideogram-2a | 官方文档 · runware.ai · ideogram 2a | 官方文档 · Runware · Ideogram 2a |
| web | runware/ideogram:2@1 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/ideogram:2@2 | https://runware.ai/docs/models/ideogram-2a-remix | 官方文档 · runware.ai · ideogram 2a remix | 官方文档 · Runware · Ideogram 2a Remix |
| web | runware/ideogram:2@2 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/runware:102@1 | https://runware.ai/docs/models/bfl-flux-1-fill-dev | 官方文档 · runware.ai · bfl flux 1 fill dev | 官方文档 · Runware · FLUX.1 Fill [dev] |
| web | runware/runware:102@1 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/bfl:2@2 | https://runware.ai/docs/models/bfl-flux-1-1-pro-ultra | 官方文档 · runware.ai · bfl flux 1 1 pro ultra | 官方文档 · Runware · FLUX.1.1 [pro] Ultra |
| web | runware/bfl:2@2 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/bfl:1@2 | https://runware.ai/docs/models/bfl-flux-1-fill-pro | 官方文档 · runware.ai · bfl flux 1 fill pro | 官方文档 · Runware · FLUX.1 Fill [pro] |
| web | runware/bfl:1@2 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/ideogram:3@2 | https://runware.ai/docs/models/ideogram-2-0-remix | 官方文档 · runware.ai · ideogram 2 0 remix | 官方文档 · Runware · Ideogram 2.0 Remix |
| web | runware/ideogram:3@2 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/bfl:2@1 | https://runware.ai/docs/models/bfl-flux-1-1-pro | 官方文档 · runware.ai · bfl flux 1 1 pro | 官方文档 · Runware · FLUX.1.1 [pro] |
| web | runware/bfl:2@1 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/ideogram:3@1 | https://runware.ai/docs/models/ideogram-2-0 | 官方文档 · runware.ai · ideogram 2 0 | 官方文档 · Runware · Ideogram 2.0 |
| web | runware/ideogram:3@1 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/runware:100@1 | https://runware.ai/docs/models/bfl-flux-1-schnell | 官方文档 · runware.ai · bfl flux 1 schnell | 官方文档 · Runware · FLUX.1 [schnell] |
| web | runware/runware:100@1 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/runware:101@1 | https://runware.ai/docs/models/bfl-flux-1-dev | 官方文档 · runware.ai · bfl flux 1 dev | 官方文档 · Runware · FLUX.1 [dev] |
| web | runware/runware:101@1 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/runware:150@2 | https://runware.ai/docs/models/meta-llava-1-6-mistral-7b | 官方文档 · runware.ai · meta llava 1 6 mistral 7b | 官方文档 · Runware · LLaVA-1.6-Mistral-7B |
| web | runware/runware:150@2 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/runware:152@1 | https://runware.ai/docs/models/alibaba-qwen2-5-vl-3b-instruct | 官方文档 · runware.ai · alibaba qwen2 5 vl 3b instruct | 官方文档 · Runware · Qwen2.5-VL-3B-Instruct |
| web | runware/runware:152@1 | https://huggingface.co/Qwen/Qwen2.5-VL-3B-Instruct | 官方文档 · Hugging Face · Qwen2.5 VL 3B Instruct | 官方文档 · Hugging Face · Qwen2.5-VL-3B-Instruct |
| web | runware/runware:152@1 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/runware:152@2 | https://runware.ai/docs/models/alibaba-qwen2-5-vl-7b-instruct | 官方文档 · runware.ai · alibaba qwen2 5 vl 7b instruct | 官方文档 · Runware · Qwen2.5-VL-7B-Instruct |
| web | runware/runware:152@2 | https://huggingface.co/Qwen/Qwen2.5-VL-7B-Instruct | 官方文档 · Hugging Face · Qwen2.5 VL 7B Instruct | 官方文档 · Hugging Face · Qwen2.5-VL-7B-Instruct |
| web | runware/runware:152@2 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | runware/civitai:101055@128078 | https://runware.ai/docs/models/stabilityai-stable-diffusion-xl-v1-0-vae-fix | 官方文档 · runware.ai · stabilityai stable diffusion xl v1 0 vae fix | 官方文档 · Runware · Stable Diffusion XL v1.0 VAE Fix |
| web | runware/civitai:101055@128078 | https://runware.ai/docs/en/getting-started/introduction | 官方文档 · runware.ai · introduction | 官方文档 · Runware · Introduction |
| web | tokenhub/deepseek-v4.1-flash | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| web | tokenhub/deepseek-v4.1-flash | https://cloud.tencent.com/document/product/1823/130079 | 官方文档 · cloud.tencent.com · 130079 | 官方文档 · 腾讯云 · 文档 130079 |
| web | tokenhub/deepseek-v4.1-flash-1017 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| web | tokenhub/deepseek-v4.1-flash-1017 | https://cloud.tencent.com/document/product/1823/130079 | 官方文档 · cloud.tencent.com · 130079 | 官方文档 · 腾讯云 · 文档 130079 |
| web | tokenhub/deepseek-v4.1-flash-1017 | https://cloud.tencent.com/document/product/1823/130055 | 官方文档 · cloud.tencent.com · 130055 | 官方文档 · 腾讯云 · 文档 130055 |
| web | tokenhub/deepseek/deepseek-v4-flash-vision-exp | https://api-docs.deepseek.com/news/news260821/ | 官方文档 · DeepSeek · news260821 | 官方文档 · DeepSeek · 更新日志 2026-08-21 |
| web | tokenhub/deepseek/deepseek-v4-flash-vision-exp | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| web | tokenhub/deepseek/deepseek-v4-flash-vision-exp | https://cloud.tencent.com/document/product/1823/132248 | 官方文档 · cloud.tencent.com · 132248 | 官方文档 · 腾讯云 · 文档 132248 |
| web | tokenhub/deepseek-v4-pro-0813 | https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro-0813 | 官方文档 · Hugging Face · DeepSeek V4 Pro 0813 | 官方文档 · Hugging Face · DeepSeek-V4-Pro 0813 正式版 |
| web | tokenhub/deepseek-v4-pro-0813 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| web | tokenhub/deepseek-v4-pro-0813 | https://cloud.tencent.com/document/product/1823/132248 | 官方文档 · cloud.tencent.com · 132248 | 官方文档 · 腾讯云 · 文档 132248 |
| web | tokenhub/deepseek/deepseek-v4-pro-0813 | https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro-0813 | 官方文档 · Hugging Face · DeepSeek V4 Pro 0813 | 官方文档 · Hugging Face · DeepSeek-V4-Pro 0813 |
| web | tokenhub/deepseek/deepseek-v4-pro-0813 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| web | tokenhub/deepseek/deepseek-v4-pro-0813 | https://cloud.tencent.com/document/product/1823/132248 | 官方文档 · cloud.tencent.com · 132248 | 官方文档 · 腾讯云 · 文档 132248 |
| web | tokenhub/deepseek-v4-flash-0731 | https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731 | 官方文档 · Hugging Face · DeepSeek V4 Flash 0731 | 官方文档 · Hugging Face · DeepSeek-V4-Flash 0731 正式版 |
| web | tokenhub/deepseek-v4-flash-0731 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| web | tokenhub/deepseek-v4-flash-0731 | https://cloud.tencent.com/document/product/1823/132248 | 官方文档 · cloud.tencent.com · 132248 | 官方文档 · 腾讯云 · 文档 132248 |
| web | tokenhub/deepseek/deepseek-v4-flash-0731 | https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731 | 官方文档 · Hugging Face · DeepSeek V4 Flash 0731 | 官方文档 · Hugging Face · DeepSeek-V4-Flash 0731 |
| web | tokenhub/deepseek/deepseek-v4-flash-0731 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| web | tokenhub/deepseek/deepseek-v4-flash-0731 | https://cloud.tencent.com/document/product/1823/132248 | 官方文档 · cloud.tencent.com · 132248 | 官方文档 · 腾讯云 · 文档 132248 |
| web | tokenhub/deepseek-v4-flash | https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash | 官方文档 · Hugging Face · DeepSeek V4 Flash | 官方文档 · Hugging Face · DeepSeek-V4-Flash |
| web | tokenhub/deepseek-v4-flash | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| web | tokenhub/deepseek-v4-flash | https://cloud.tencent.com/document/product/1823/132248 | 官方文档 · cloud.tencent.com · 132248 | 官方文档 · 腾讯云 · 文档 132248 |
| web | tokenhub/deepseek-v4-flash-202605 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| web | tokenhub/deepseek-v4-flash-202605 | https://cloud.tencent.com/document/product/1823/132248 | 官方文档 · cloud.tencent.com · 132248 | 官方文档 · 腾讯云 · 文档 132248 |
| web | tokenhub/deepseek-v4-pro | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| web | tokenhub/deepseek-v4-pro | https://cloud.tencent.com/document/product/1823/132248 | 官方文档 · cloud.tencent.com · 132248 | 官方文档 · 腾讯云 · 文档 132248 |
| web | tokenhub/deepseek-v4-pro | https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro | 官方文档 · Hugging Face · DeepSeek V4 Pro | 官方文档 · Hugging Face · DeepSeek-V4-Pro |
| web | tokenhub/deepseek-v4-pro-202606 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| web | tokenhub/deepseek-v4-pro-202606 | https://cloud.tencent.com/document/product/1823/132248 | 官方文档 · cloud.tencent.com · 132248 | 官方文档 · 腾讯云 · 文档 132248 |
| web | tokenhub/deepseek/deepseek-v4-flash | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| web | tokenhub/deepseek/deepseek-v4-flash | https://cloud.tencent.com/document/product/1823/132248 | 官方文档 · cloud.tencent.com · 132248 | 官方文档 · 腾讯云 · 文档 132248 |
| web | tokenhub/deepseek/deepseek-v4-pro | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| web | tokenhub/deepseek/deepseek-v4-pro | https://cloud.tencent.com/document/product/1823/132248 | 官方文档 · cloud.tencent.com · 132248 | 官方文档 · 腾讯云 · 文档 132248 |
| web | tokenhub/glm-5.3 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.3 | 官方文档 · bigmodel.cn · glm 5.3 | 官方文档 · 智谱 · GLM-5.3 |
| web | tokenhub/glm-5.3 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| web | tokenhub/glm-5.3 | https://cloud.tencent.com/document/product/1823/132061 | 官方文档 · cloud.tencent.com · 132061 | 官方文档 · 腾讯云 · 文档 132061 |
| web | tokenhub/glm-5.3-flash | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5.3-flash | 官方文档 · bigmodel.cn · glm 5.3 flash | 官方文档 · 智谱 · GLM-5.3-Flash |
| web | tokenhub/glm-5.3-flash | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| web | tokenhub/glm-5.3-flash | https://cloud.tencent.com/document/product/1823/132061 | 官方文档 · cloud.tencent.com · 132061 | 官方文档 · 腾讯云 · 文档 132061 |
| web | tokenhub/glm-5.3-flashx | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5.3-flash | 官方文档 · bigmodel.cn · glm 5.3 flash | 官方文档 · 智谱 · GLM 5.3 Flash |
| web | tokenhub/glm-5.3-flashx | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| web | tokenhub/glm-5.3-flashx | https://cloud.tencent.com/document/product/1823/132061 | 官方文档 · cloud.tencent.com · 132061 | 官方文档 · 腾讯云 · 文档 132061 |
| web | tokenhub/glm-5.2 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.2 | 官方文档 · bigmodel.cn · glm 5.2 | 官方文档 · 智谱 · GLM-5.2 |
| web | tokenhub/glm-5.2 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| web | tokenhub/glm-5.2 | https://cloud.tencent.com/document/product/1823/132061 | 官方文档 · cloud.tencent.com · 132061 | 官方文档 · 腾讯云 · 文档 132061 |
| web | tokenhub/glm-5.1 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.1 | 官方文档 · bigmodel.cn · glm 5.1 | 官方文档 · 智谱 · GLM-5.1（2026-10-08下线） |
| web | tokenhub/glm-5.1 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| web | tokenhub/glm-5.1 | https://cloud.tencent.com/document/product/1823/132061 | 官方文档 · cloud.tencent.com · 132061 | 官方文档 · 腾讯云 · 文档 132061 |
| web | tokenhub/glm-5 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5 | 官方文档 · bigmodel.cn · glm 5 | 官方文档 · 智谱 · GLM-5（2026-10-08下线） |
| web | tokenhub/glm-5 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| web | tokenhub/glm-5 | https://cloud.tencent.com/document/product/1823/132061 | 官方文档 · cloud.tencent.com · 132061 | 官方文档 · 腾讯云 · 文档 132061 |
| web | tokenhub/glm-5-turbo | https://docs.bigmodel.cn/cn/guide/models/text/glm-5-turbo | 官方文档 · bigmodel.cn · glm 5 turbo | 官方文档 · 智谱 · GLM-5-Turbo（2026-10-08下线） |
| web | tokenhub/glm-5-turbo | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| web | tokenhub/glm-5-turbo | https://cloud.tencent.com/document/product/1823/132061 | 官方文档 · cloud.tencent.com · 132061 | 官方文档 · 腾讯云 · 文档 132061 |
| web | tokenhub/glm-5v-turbo | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5v-turbo | 官方文档 · bigmodel.cn · glm 5v turbo | 官方文档 · 智谱 · GLM-5V-Turbo（2026-10-30下线） |
| web | tokenhub/glm-5v-turbo | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| web | tokenhub/glm-5v-turbo | https://cloud.tencent.com/document/product/1823/132061 | 官方文档 · cloud.tencent.com · 132061 | 官方文档 · 腾讯云 · 文档 132061 |
| web | tokenhub/hy4 | https://cloud.tencent.com/document/product/1823/132252 | 官方文档 · cloud.tencent.com · 132252 | 官方文档 · 腾讯云 · 文档 132252 |
| web | tokenhub/hy4-preview | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| web | tokenhub/hy4-preview | https://cloud.tencent.com/document/product/1823/132252 | 官方文档 · cloud.tencent.com · 132252 | 官方文档 · 腾讯云 · 文档 132252 |
| web | tokenhub/hy3 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| web | tokenhub/hy3 | https://cloud.tencent.com/document/product/1823/132252 | 官方文档 · cloud.tencent.com · 132252 | 官方文档 · 腾讯云 · 文档 132252 |
| web | tokenhub/kimi-k3 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| web | tokenhub/kimi-k3 | https://cloud.tencent.com/document/product/1823/132232 | 官方文档 · cloud.tencent.com · 132232 | 官方文档 · 腾讯云 · 文档 132232 |
| web | tokenhub/kimi-k2.7-code | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| web | tokenhub/kimi-k2.7-code | https://cloud.tencent.com/document/product/1823/132232 | 官方文档 · cloud.tencent.com · 132232 | 官方文档 · 腾讯云 · 文档 132232 |
| web | tokenhub/kimi-k2.7-code-highspeed | https://www.kimi.com/code/docs/en/kimi-code/models | 官方文档 · kimi.com · 模型列表 | 官方文档 · Kimi · 模型列表 |
| web | tokenhub/kimi-k2.7-code-highspeed | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| web | tokenhub/kimi-k2.7-code-highspeed | https://cloud.tencent.com/document/product/1823/132232 | 官方文档 · cloud.tencent.com · 132232 | 官方文档 · 腾讯云 · 文档 132232 |
| web | tokenhub/kimi-k2.6 | https://huggingface.co/moonshotai/Kimi-K2.6 | 官方文档 · Hugging Face · Kimi K2.6 | 官方文档 · Hugging Face · Kimi-K2.6 |
| web | tokenhub/kimi-k2.6 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| web | tokenhub/kimi-k2.6 | https://cloud.tencent.com/document/product/1823/132232 | 官方文档 · cloud.tencent.com · 132232 | 官方文档 · 腾讯云 · 文档 132232 |
| web | tokenhub/minimax-m3 | https://huggingface.co/MiniMaxAI/MiniMax-M3 | 官方文档 · Hugging Face · MiniMax M3 | 官方文档 · Hugging Face · MiniMax-M3 |
| web | tokenhub/minimax-m3 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| web | tokenhub/minimax-m3 | https://cloud.tencent.com/document/product/1823/132246 | 官方文档 · cloud.tencent.com · 132246 | 官方文档 · 腾讯云 · 文档 132246 |
| web | tokenhub/minimax-m2.7 | https://huggingface.co/MiniMaxAI/MiniMax-M2.7 | 官方文档 · Hugging Face · MiniMax M2.7 | 官方文档 · Hugging Face · MiniMax-M2.7 |
| web | tokenhub/minimax-m2.7 | https://platform.minimax.io/docs/api-reference/text-openai-api | 官方文档 · minimax.io · text openai api | 官方文档 · MiniMax · Text OpenAI API |
| web | tokenhub/minimax-m2.7 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| web | tokenhub/minimax-m2.7 | https://cloud.tencent.com/document/product/1823/132246 | 官方文档 · cloud.tencent.com · 132246 | 官方文档 · 腾讯云 · 文档 132246 |
| web | tokenhub/step-5-preview | https://platform.stepfun.com/docs/zh/guides/models/step-5-preview | 官方文档 · stepfun.com · step 5 preview | 官方文档 · StepFun · Step 5 Preview |
| web | tokenhub/step-5-preview | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| web | tokenhub/step-5-preview | https://cloud.tencent.com/document/product/1823/130079 | 官方文档 · cloud.tencent.com · 130079 | 官方文档 · 腾讯云 · 文档 130079 |
| web | tokenhub/deepseek/deepseek-flash | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| web | tokenhub/deepseek/deepseek-flash | https://cloud.tencent.com/document/product/1823/132248 | 官方文档 · cloud.tencent.com · 132248 | 官方文档 · 腾讯云 · 文档 132248 |
| web | tokenhub/hunyuan-t1-vision-20250916 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| web | tokenhub/hunyuan-t1-vision-20250916 | https://cloud.tencent.com/document/product/1823/136956 | 官方文档 · cloud.tencent.com · 136956 | 官方文档 · 腾讯云 · 文档 136956 |
| web | tokenhub/hy-image-v3 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| web | tokenhub/hy-image-v3 | https://cloud.tencent.com/document/product/1823/135745 | 官方文档 · cloud.tencent.com · 135745 | 官方文档 · 腾讯云 · 文档 135745 |
| web | tokenhub/hy-image-v3.5-preview | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| web | tokenhub/hy-image-v3.5-preview | https://cloud.tencent.com/document/product/1823/135745 | 官方文档 · cloud.tencent.com · 135745 | 官方文档 · 腾讯云 · 文档 135745 |
| web | tokenhub/hy-vision-2.0-instruct | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| web | tokenhub/hy-vision-2.0-instruct | https://cloud.tencent.com/document/product/1823/136956 | 官方文档 · cloud.tencent.com · 136956 | 官方文档 · 腾讯云 · 文档 136956 |
| web | tokenhub/kimi-k2.8-preview | https://www.kimi.com/code/docs/en/kimi-code/models | 官方文档 · kimi.com · 模型列表 | 官方文档 · Kimi · 模型列表 |
| web | tokenhub/kimi-k2.8-preview | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| web | tokenhub/kimi-k2.8-preview | https://cloud.tencent.com/document/product/1823/132232 | 官方文档 · cloud.tencent.com · 132232 | 官方文档 · 腾讯云 · 文档 132232 |
| web | tokenhub/kimi-k3.1-pro | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| web | tokenhub/kimi-k3.1-pro | https://cloud.tencent.com/document/product/1823/132232 | 官方文档 · cloud.tencent.com · 132232 | 官方文档 · 腾讯云 · 文档 132232 |
| web | tokenhub/kimi-k3.1-pro | https://cloud.tencent.com/document/product/1823/130055 | 官方文档 · cloud.tencent.com · 130055 | 官方文档 · 腾讯云 · 文档 130055 |
| web | tokenhub/kimi-k3.1-pro-highspeed | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| web | tokenhub/kimi-k3.1-pro-highspeed | https://cloud.tencent.com/document/product/1823/132232 | 官方文档 · cloud.tencent.com · 132232 | 官方文档 · 腾讯云 · 文档 132232 |
| web | tokenhub/kimi-k3.1-pro-highspeed | https://cloud.tencent.com/document/product/1823/130055 | 官方文档 · cloud.tencent.com · 130055 | 官方文档 · 腾讯云 · 文档 130055 |
| web | tokenhub/mimo-v2.5-pro | https://mimo.mi.com/docs/zh-CN/updates/deprecate | 下线公告 · mimo.mi.com · deprecate | 下线公告 · MiMo · 模型下线公告 |
| web | tokenhub/mimo-v2.5-pro | https://mimo.mi.com/models/en-US/mimo-v2.5-pro | 官方文档 · mimo.mi.com · mimo v2.5 pro | 官方文档 · MiMo · MiMo-V2.5-Pro |
| web | tokenhub/mimo-v2.5-pro | https://mimo.mi.com/docs/zh-CN/quick-start/summary/model | 原厂规格 · mimo.mi.com · model | 原厂规格 · MiMo · 模型说明 |
| web | tokenhub/mimo-v2.5-pro | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| web | tokenhub/mimo-v2.5-pro | https://cloud.tencent.com/document/product/1823/130079 | 官方文档 · cloud.tencent.com · 130079 | 官方文档 · 腾讯云 · 文档 130079 |
| web | tokenhub/mimo-v2.6-flash | https://mimo.mi.com/models/en-US/mimo-v2.6-flash | 官方文档 · mimo.mi.com · mimo v2.6 flash | 官方文档 · MiMo · MiMo V2.6 Flash |
| web | tokenhub/mimo-v2.6-flash | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| web | tokenhub/mimo-v2.6-flash | https://cloud.tencent.com/document/product/1823/130079 | 官方文档 · cloud.tencent.com · 130079 | 官方文档 · 腾讯云 · 文档 130079 |
| web | tokenhub/mimo-v2.6-pro | https://mimo.mi.com/models/en-US/mimo-v2.6-pro | 官方文档 · mimo.mi.com · mimo v2.6 pro | 官方文档 · MiMo · MiMo V2.6 Pro |
| web | tokenhub/mimo-v2.6-pro | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| web | tokenhub/mimo-v2.6-pro | https://cloud.tencent.com/document/product/1823/130079 | 官方文档 · cloud.tencent.com · 130079 | 官方文档 · 腾讯云 · 文档 130079 |
| web | tokenhub/minimax-m3.1-flash | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| web | tokenhub/minimax-m3.1-flash | https://cloud.tencent.com/document/product/1823/132246 | 官方文档 · cloud.tencent.com · 132246 | 官方文档 · 腾讯云 · 文档 132246 |
| web | tokenhub/minimax-m3.1-flash | https://cloud.tencent.com/document/product/1823/130055 | 官方文档 · cloud.tencent.com · 130055 | 官方文档 · 腾讯云 · 文档 130055 |
| web | tokenhub/seedream-image-v5.0-lite | https://docs.volcengine.com/docs/ark/seedream-4-0-5-0?lang=zh | 官方文档 · volcengine.com · seedream 4 0 5 0 | 官方文档 · 火山方舟 · Seedream 4-0-5-0 |
| web | tokenhub/seedream-image-v5.0-lite | https://docs.volcengine.com/docs/ark/image-generation-api?lang=en | 官方文档 · volcengine.com · image generation api | 官方文档 · 火山方舟 · Image Generation API |
| web | tokenhub/seedream-image-v5.0-lite | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| web | tokenhub/seedream-image-v5.0-lite | https://cloud.tencent.com/document/product/1823/136609 | 官方文档 · cloud.tencent.com · 136609 | 官方文档 · 腾讯云 · 文档 136609 |
| web | tokenhub/seedream-image-v5.0-pro | https://docs.volcengine.com/docs/ark/seedream-4-0-5-0?lang=zh | 官方文档 · volcengine.com · seedream 4 0 5 0 | 官方文档 · 火山方舟 · Seedream 4-0-5-0 |
| web | tokenhub/seedream-image-v5.0-pro | https://docs.volcengine.com/docs/ark/image-generation-api?lang=en | 官方文档 · volcengine.com · image generation api | 官方文档 · 火山方舟 · Image Generation API |
| web | tokenhub/seedream-image-v5.0-pro | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| web | tokenhub/seedream-image-v5.0-pro | https://cloud.tencent.com/document/product/1823/136609 | 官方文档 · cloud.tencent.com · 136609 | 官方文档 · 腾讯云 · 文档 136609 |
| web | tokenhub/vidu-image-q2 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| web | tokenhub/vidu-image-q2 | https://cloud.tencent.com/document/product/1823/135746 | 官方文档 · cloud.tencent.com · 135746 | 官方文档 · 腾讯云 · 文档 135746 |
| web | tokenhub/wand-vega-image-flash | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| web | tokenhub/wand-vega-image-flash | https://cloud.tencent.com/document/product/1823/137203 | 官方文档 · cloud.tencent.com · 137203 | 官方文档 · 腾讯云 · 文档 137203 |
| web | tokenhub/wand-vega-image-lite | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| web | tokenhub/wand-vega-image-lite | https://cloud.tencent.com/document/product/1823/137203 | 官方文档 · cloud.tencent.com · 137203 | 官方文档 · 腾讯云 · 文档 137203 |
| web | tokenhub/wand-vega-image-pro | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| web | tokenhub/wand-vega-image-pro | https://cloud.tencent.com/document/product/1823/137203 | 官方文档 · cloud.tencent.com · 137203 | 官方文档 · 腾讯云 · 文档 137203 |
| web | tokenhub/youtu-vita | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| web | tokenhub/youtu-vita | https://cloud.tencent.com/document/product/1823/136956 | 官方文档 · cloud.tencent.com · 136956 | 官方文档 · 腾讯云 · 文档 136956 |
| web | xiaomi/mimo-v2.6-flash | https://mimo.mi.com/models/en-US/mimo-v2.6-flash | 官方文档 · mimo.mi.com · mimo v2.6 flash | 官方文档 · MiMo · MiMo-V2.6-Flash |
| web | xiaomi/mimo-v2.6-flash | https://mimo.mi.com/docs/zh-CN/quick-start/summary/model | 官方文档 · mimo.mi.com · model | 官方文档 · MiMo · 模型说明 |
| web | xiaomi/mimo-v2.6-flash | https://mimo.mi.com/docs/zh-CN/api/chat/openai-api | 官方文档 · mimo.mi.com · openai api | 官方文档 · MiMo · OpenAI API |
| web | xiaomi/mimo-v2.6-flash | https://mimo.mi.com/docs/zh-CN/usage-guide/multimodal-understanding/image-understanding | 官方文档 · mimo.mi.com · image understanding | 官方文档 · MiMo · Image Understanding |
| web | xiaomi/mimo-v2.6-pro | https://mimo.mi.com/models/en-US/mimo-v2.6-pro | 官方文档 · mimo.mi.com · mimo v2.6 pro | 官方文档 · MiMo · MiMo-V2.6-Pro |
| web | xiaomi/mimo-v2.6-pro | https://mimo.mi.com/docs/zh-CN/quick-start/summary/model | 官方文档 · mimo.mi.com · model | 官方文档 · MiMo · 模型说明 |
| web | xiaomi/mimo-v2.6-pro | https://mimo.mi.com/docs/zh-CN/api/chat/openai-api | 官方文档 · mimo.mi.com · openai api | 官方文档 · MiMo · OpenAI API |
| web | xiaomi/mimo-v2.6-pro | https://mimo.mi.com/docs/zh-CN/usage-guide/multimodal-understanding/image-understanding | 官方文档 · mimo.mi.com · image understanding | 官方文档 · MiMo · Image Understanding |
| web | xiaomi/mimo-v2.6-pro-ultraspeed | https://mimo.mi.com/docs/zh-CN/quick-start/summary/model | 官方文档 · mimo.mi.com · model | 官方文档 · MiMo · 模型说明 |
| web | sensenova/deepseek-v4-flash | https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash | 官方文档 · Hugging Face · DeepSeek V4 Flash | 官方文档 · Hugging Face · DeepSeek V4 Flash 0731 |
| web | sensenova/deepseek-v4-flash | https://www.sensecore.cn/help/docs/model-as-a-service/nova/overview | 官方文档 · sensecore.cn · overview | 官方文档 · Sensecore · Nova |
| web | sensenova/deepseek-v4-flash | https://platform.sensenova.cn/docs | 官方文档 · sensenova.cn · docs | 官方文档 · SenseNova · 文档首页 |
| web | sensenova/deepseek-v4-pro | https://www.sensecore.cn/help/docs/model-as-a-service/nova/overview | 官方文档 · sensecore.cn · overview | 官方文档 · Sensecore · Nova |
| web | sensenova/deepseek-v4-pro | https://platform.sensenova.cn/docs | 官方文档 · sensenova.cn · docs | 官方文档 · SenseNova · 文档首页 |
| web | sensenova/deepseek-v4-pro | https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro | 官方文档 · Hugging Face · DeepSeek V4 Pro | 官方文档 · Hugging Face · DeepSeek V4 Pro 0813 |
| web | sensenova/glm-5.2 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.2 | 官方文档 · bigmodel.cn · glm 5.2 | 官方文档 · 智谱 · GLM-5.2 |
| web | sensenova/glm-5.2 | https://www.sensecore.cn/help/docs/model-as-a-service/nova/overview | 官方文档 · sensecore.cn · overview | 官方文档 · Sensecore · Nova |
| web | sensenova/glm-5.2 | https://platform.sensenova.cn/docs | 官方文档 · sensenova.cn · docs | 官方文档 · SenseNova · 文档首页 |
| web | sensenova/kimi-k3 | https://www.sensecore.cn/help/docs/model-as-a-service/nova/overview | 官方文档 · sensecore.cn · overview | 官方文档 · Sensecore · Nova |
| web | sensenova/kimi-k3 | https://platform.sensenova.cn/docs | 官方文档 · sensenova.cn · docs | 官方文档 · SenseNova · 文档首页 |
| web | sensenova/deepseek-flash | https://platform.sensenova.cn/docs | 官方文档 · sensenova.cn · docs | 官方文档 · SenseNova · 文档首页 |
| web | sensenova/sensenova-6.8-flash-lite | https://github.com/OpenSenseNova/SenseNova6.8/blob/main/API.md | 官方文档 · github.com · API.md | 官方文档 · GitHub · API |
| web | sensenova/sensenova-6.8-flash-lite | https://www.sensecore.cn/help/docs/model-as-a-service/nova/overview | 官方文档 · sensecore.cn · overview | 官方文档 · Sensecore · Nova |
| web | sensenova/sensenova-6.8-flash-lite | https://platform.sensenova.cn/docs | 官方文档 · sensenova.cn · docs | 官方文档 · SenseNova · 文档首页 |
| web | sensenova/sensenova-u1.5-fast | https://www.sensecore.cn/help/docs/model-as-a-service/nova/overview | 官方文档 · sensecore.cn · overview | 官方文档 · Sensecore · Nova |
| web | sensenova/sensenova-u1.5-fast | https://platform.sensenova.cn/docs | 官方文档 · sensenova.cn · docs | 官方文档 · SenseNova · 文档首页 |
| web | sensenova/sensenova-u1.5-lite | https://www.sensecore.cn/help/docs/model-as-a-service/nova/overview | 官方文档 · sensecore.cn · overview | 官方文档 · Sensecore · Nova |
| web | sensenova/sensenova-u1.5-lite | https://platform.sensenova.cn/docs | 官方文档 · sensenova.cn · docs | 官方文档 · SenseNova · 文档首页 |
| web | stepfun/step-5-preview | https://platform.stepfun.com/docs/zh/guides/models/step-5-preview | 官方文档 · stepfun.com · step 5 preview | 官方文档 · StepFun · Step 5 Preview |
| web | stepfun/step-5-preview | https://platform.stepfun.com/docs/zh/guides/models/list | 官方文档 · stepfun.com · list | 官方文档 · StepFun · List |
| web | stepfun/step-5-preview | https://platform.stepfun.com/docs/zh/welcome | 官方文档 · stepfun.com · welcome | 官方文档 · StepFun · 文档首页 |
| web | stepfun/step-3.7-flash | https://platform.stepfun.com/docs/zh/guides/models/step-3.7-flash | 官方文档 · stepfun.com · step 3.7 flash | 官方文档 · StepFun · Step 3.7 Flash |
| web | stepfun/step-3.7-flash | https://platform.stepfun.com/docs/zh/guides/models/list | 官方文档 · stepfun.com · list | 官方文档 · StepFun · List |
| web | stepfun/step-3.7-flash | https://platform.stepfun.com/docs/zh/welcome | 官方文档 · stepfun.com · welcome | 官方文档 · StepFun · 文档首页 |
| web | stepfun/step-3.5-flash | https://platform.stepfun.com/docs/zh/guides/models/step-3.5-flash | 官方文档 · stepfun.com · step 3.5 flash | 官方文档 · StepFun · Step 3.5 Flash |
| web | stepfun/step-3.5-flash | https://platform.stepfun.com/docs/zh/guides/models/list | 官方文档 · stepfun.com · list | 官方文档 · StepFun · List |
| web | stepfun/step-3.5-flash | https://platform.stepfun.com/docs/zh/welcome | 官方文档 · stepfun.com · welcome | 官方文档 · StepFun · 文档首页 |
| web | stepfun/step-3.5-flash-2603 | https://platform.stepfun.com/docs/zh/guides/models/step-3.5-flash | 官方文档 · stepfun.com · step 3.5 flash | 官方文档 · StepFun · Step 3.5 Flash |
| web | stepfun/step-3.5-flash-2603 | https://platform.stepfun.com/docs/zh/guides/models/list | 官方文档 · stepfun.com · list | 官方文档 · StepFun · List |
| web | stepfun/step-3.5-flash-2603 | https://platform.stepfun.com/docs/zh/welcome | 官方文档 · stepfun.com · welcome | 官方文档 · StepFun · 文档首页 |
| web | stepfun/step-3.5-flash-2603 | https://platform.stepfun.com/docs/zh/api-reference/chat/chat-completion-create | 官方文档 · stepfun.com · chat completion create | 官方文档 · StepFun · Chat Completion Create |
| web | stepfun/step-1o-turbo-vision | https://platform.stepfun.com/docs/zh/guides/models/list | 官方文档 · stepfun.com · list | 官方文档 · StepFun · List |
| web | stepfun/step-1o-turbo-vision | https://platform.stepfun.com/docs/zh/welcome | 官方文档 · stepfun.com · welcome | 官方文档 · StepFun · 文档首页 |
| web | qianfan/deepseek-v4.1-flash | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · cloud.baidu.com · klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/deepseek-v4.1-flash | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · cloud.baidu.com · rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/deepseek-v4.1-flash-1017 | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · cloud.baidu.com · rmh4stp0j | 官方文档 · 百度千帆 · 模型列表 |
| web | qianfan/deepseek-v4-pro-0813 | https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro-0813 | 官方文档 · Hugging Face · DeepSeek V4 Pro 0813 | 官方文档 · Hugging Face · DeepSeek-V4-Pro-0813 |
| web | qianfan/deepseek-v4-pro-0813 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · cloud.baidu.com · klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/deepseek-v4-pro-0813 | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · cloud.baidu.com · rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/deepseek-v4-flash-0731 | https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731 | 官方文档 · Hugging Face · DeepSeek V4 Flash 0731 | 官方文档 · Hugging Face · DeepSeek-V4-Flash-0731 |
| web | qianfan/deepseek-v4-flash-0731 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · cloud.baidu.com · klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/deepseek-v4-flash-0731 | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · cloud.baidu.com · rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/deepseek-v4-flash | https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash | 官方文档 · Hugging Face · DeepSeek V4 Flash | 官方文档 · Hugging Face · DeepSeek-V4-Flash |
| web | qianfan/deepseek-v4-flash | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · cloud.baidu.com · klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/deepseek-v4-flash | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · cloud.baidu.com · rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/deepseek-v4-pro | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · cloud.baidu.com · klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/deepseek-v4-pro | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · cloud.baidu.com · rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/deepseek-v4-pro | https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro | 官方文档 · Hugging Face · DeepSeek V4 Pro | 官方文档 · Hugging Face · DeepSeek-V4-Pro |
| web | qianfan/deepseek-v3.2 | https://huggingface.co/deepseek-ai/DeepSeek-V3.2 | 官方文档 · Hugging Face · DeepSeek V3.2 | 官方文档 · Hugging Face · DeepSeek-V3.2 |
| web | qianfan/deepseek-v3.2 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · cloud.baidu.com · klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/deepseek-v3.2 | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · cloud.baidu.com · rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/deepseek-v3.2-think | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · cloud.baidu.com · klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/deepseek-v3.2-think | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · cloud.baidu.com · rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/glm-5.3 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.3 | 官方文档 · bigmodel.cn · glm 5.3 | 官方文档 · 智谱 · GLM-5.3 |
| web | qianfan/glm-5.3 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · cloud.baidu.com · klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/glm-5.3 | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · cloud.baidu.com · rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/glm-5.3-flash | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5.3-flash | 官方文档 · bigmodel.cn · glm 5.3 flash | 官方文档 · 智谱 · GLM-5.3-Flash |
| web | qianfan/glm-5.3-flash | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · cloud.baidu.com · klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/glm-5.3-flash | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · cloud.baidu.com · rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/glm-5.2 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.2 | 官方文档 · bigmodel.cn · glm 5.2 | 官方文档 · 智谱 · GLM-5.2 |
| web | qianfan/glm-5.2 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · cloud.baidu.com · klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/glm-5.2 | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · cloud.baidu.com · rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/glm-5.1 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.1 | 官方文档 · bigmodel.cn · glm 5.1 | 官方文档 · 智谱 · GLM-5.1 |
| web | qianfan/glm-5.1 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · cloud.baidu.com · klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/glm-5.1 | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · cloud.baidu.com · rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/glm-5 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5 | 官方文档 · bigmodel.cn · glm 5 | 官方文档 · 智谱 · GLM-5 |
| web | qianfan/glm-5 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · cloud.baidu.com · klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/glm-5 | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · cloud.baidu.com · rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/kimi-k2.6 | https://huggingface.co/moonshotai/Kimi-K2.6 | 官方文档 · Hugging Face · Kimi K2.6 | 官方文档 · Hugging Face · Kimi-K2.6 |
| web | qianfan/kimi-k2.6 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · cloud.baidu.com · klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/kimi-k2.6 | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · cloud.baidu.com · rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/qwen-image | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · cloud.baidu.com · klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/qwen-image | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · cloud.baidu.com · rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/qwen-image-edit | https://help.aliyun.com/zh/model-studio/model-depreciation | 原厂规格 · 百炼 · 模型下线公告 | 下线公告 · 百炼 · 模型下线公告 |
| web | qianfan/qwen-image-edit | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · cloud.baidu.com · klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/qwen-image-edit | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · cloud.baidu.com · rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/qwen3.5-122b-a10b | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · cloud.baidu.com · klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/qwen3.5-122b-a10b | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · cloud.baidu.com · rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/qwen3.5-122b-a10b | https://huggingface.co/Qwen/Qwen3.5-122B-A10B | 官方文档 · Hugging Face · Qwen3.5 122B A10B | 官方文档 · Hugging Face · Qwen3.5-122B-A10B |
| web | qianfan/qwen3.5-27b | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · cloud.baidu.com · klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/qwen3.5-27b | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · cloud.baidu.com · rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/qwen3.5-27b | https://huggingface.co/Qwen/Qwen3.5-27B | 官方文档 · Hugging Face · Qwen3.5 27B | 官方文档 · Hugging Face · Qwen3.5-27B |
| web | qianfan/qwen3.5-35b-a3b | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · cloud.baidu.com · klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/qwen3.5-35b-a3b | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · cloud.baidu.com · rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/qwen3.5-35b-a3b | https://huggingface.co/Qwen/Qwen3.5-35B-A3B | 官方文档 · Hugging Face · Qwen3.5 35B A3B | 官方文档 · Hugging Face · Qwen3.5-35B-A3B |
| web | qianfan/qwen3.5-397b-a17b | https://huggingface.co/Qwen/Qwen3.5-397B-A17B | 官方文档 · Hugging Face · Qwen3.5 397B A17B | 官方文档 · Hugging Face · Qwen3.5-397B-A17B |
| web | qianfan/qwen3.5-397b-a17b | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · cloud.baidu.com · klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/qwen3.5-397b-a17b | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · cloud.baidu.com · rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/deepseek-flash | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · cloud.baidu.com · klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/deepseek-flash | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · cloud.baidu.com · rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/deepseek-ocr | https://huggingface.co/deepseek-ai/DeepSeek-OCR | 官方文档 · Hugging Face · DeepSeek OCR | 官方文档 · Hugging Face · DeepSeek-OCR |
| web | qianfan/deepseek-ocr | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · cloud.baidu.com · rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/deepseek-ocr | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · cloud.baidu.com · klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/ernie-4.5-turbo-128k | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · cloud.baidu.com · rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/ernie-4.5-turbo-128k | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · cloud.baidu.com · klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/ernie-4.5-turbo-20260402 | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · cloud.baidu.com · rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/ernie-4.5-turbo-20260402 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · cloud.baidu.com · klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/ernie-4.5-turbo-32k | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · cloud.baidu.com · rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/ernie-4.5-turbo-32k | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · cloud.baidu.com · klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/ernie-4.5-turbo-vl | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · cloud.baidu.com · rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/ernie-4.5-turbo-vl | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · cloud.baidu.com · klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/ernie-4.5-turbo-vl-32k | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · cloud.baidu.com · rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/ernie-4.5-turbo-vl-32k | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · cloud.baidu.com · klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/ernie-5.0 | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · cloud.baidu.com · rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/ernie-5.0 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · cloud.baidu.com · klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/ernie-5.0-thinking-exp | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · cloud.baidu.com · rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/ernie-5.0-thinking-exp | https://cloud.baidu.com/doc/qianfan-docs/s/Jm8r1826a | 官方文档 · cloud.baidu.com · Jm8r1826a | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/ernie-5.0-thinking-exp | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · cloud.baidu.com · klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档 3） |
| web | qianfan/ernie-5.0-thinking-latest | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · cloud.baidu.com · rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/ernie-5.0-thinking-latest | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · cloud.baidu.com · klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/ernie-5.0-thinking-preview | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · cloud.baidu.com · klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/ernie-5.0-thinking-preview | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · cloud.baidu.com · rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/ernie-5.1 | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · cloud.baidu.com · rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/ernie-5.1 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · cloud.baidu.com · klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/ernie-x1.1 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · cloud.baidu.com · klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/ernie-x1.1 | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · cloud.baidu.com · rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/ernie-x1.1-preview | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · cloud.baidu.com · klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/ernie-x1.1-preview | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · cloud.baidu.com · rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/internvl3-38b | https://huggingface.co/OpenGVLab/InternVL3-38B | 官方文档 · Hugging Face · InternVL3 38B | 官方文档 · Hugging Face · InternVL3-38B |
| web | qianfan/internvl3-38b | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · cloud.baidu.com · rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/internvl3-38b | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · cloud.baidu.com · klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/musesteamer-air-image | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · cloud.baidu.com · klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/musesteamer-air-image | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · cloud.baidu.com · rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/qianfan-ocr | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · cloud.baidu.com · rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/qianfan-ocr | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · cloud.baidu.com · klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | iflytek/xop3qwen30b | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| web | iflytek/xop3qwen32b | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| web | iflytek/xop3qwen32bvl | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| web | iflytek/xopqwen35397b | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| web | iflytek/xopqwen36v35b | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| web | iflytek/xop35qwen2b | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| web | iflytek/spark-x2.5 | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| web | iflytek/spark-x2.5-1.7b | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| web | iflytek/spark-x2.5-4b | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| web | iflytek/spark-x2.6 | https://maas.xfyun.cn/doc/guide/3%E3%80%81API%20%E6%8E%A5%E5%8F%A3/3.1%20%E6%98%9F%E7%81%AB%E6%A8%A1%E5%9E%8B%20API/3.1.1%20Chat.html | 官方文档 · maas.xfyun.cn · 3.1.1 Chat | 官方文档 · 讯飞星辰 · 3.1.1 Chat |
| web | iflytek/spark-x2.6-4b | https://maas.xfyun.cn/doc/guide/3%E3%80%81API%20%E6%8E%A5%E5%8F%A3/3.1%20%E6%98%9F%E7%81%AB%E6%A8%A1%E5%9E%8B%20API/3.1.1%20Chat.html | 官方文档 · maas.xfyun.cn · 3.1.1 Chat | 官方文档 · 讯飞星辰 · 3.1.1 Chat |
| web | iflytek/xdeepseekr1qwen32b | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| web | iflytek/xminimaxm25 | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| web | iflytek/xop3qwen0b6 | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| web | iflytek/xop3qwen14b | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| web | iflytek/xop3qwen4b | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| web | iflytek/xop3qwen80bnext | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| web | iflytek/xop3qwen8b | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| web | iflytek/xopdeepseekv4flash | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| web | iflytek/xopdeepseekv4flash0731 | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| web | iflytek/xopdeepseekv4pro | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| web | iflytek/xopdeepseekv4pro0813 | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| web | iflytek/xopglm51 | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| web | iflytek/xopglm52 | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| web | iflytek/xopglm53 | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| web | iflytek/xopglmv47flash | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| web | iflytek/xopkimik25 | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| web | iflytek/xopkimik26 | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| web | iflytek/xopkimik27code | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| web | iflytek/xqwen14bchat | https://huggingface.co/Qwen/Qwen2.5-14B-Instruct | 官方文档 · Hugging Face · Qwen2.5 14B Instruct | 官方文档 · Hugging Face · Qwen2.5-14B Instruct |
| web | iflytek/xqwen14bchat | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| web | iflytek/xspark13b6k | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| web | iflytek/xsparkprox | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| web | iflytek/xsparkx2 | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| web | iflytek/xsparkx2flash | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| web | longcat/LongCat-2.5-Preview | https://longcat.ai/platform/docs/zh/api/model-params | 官方文档 · longcat.ai · model params | 官方文档 · LongCat · Model Params |
| web | longcat/LongCat-2.5-Preview | https://longcat.ai/platform/docs/zh/image-video-understanding | 官方文档 · longcat.ai · image video understanding | 官方文档 · LongCat · Image Video Understanding |
| web | longcat/LongCat-2.5-Preview | https://longcat.chat/platform/docs/api/chat | 官方文档 · longcat.chat · chat | 官方文档 · LongCat · Chat |
| web | longcat/LongCat-2.0 | https://longcat.chat/platform/docs/api/chat | 官方文档 · longcat.chat · chat | 官方文档 · LongCat · Chat |
| web | longcat/LongCat-2.0 | https://longcat.chat/platform/docs/zh/api/models.html | 官方文档 · longcat.chat · models | 官方文档 · LongCat · 模型列表 |
| web | longcat/LongCat-2.5 | https://longcat.chat/platform/docs/change-log | 官方文档 · longcat.chat · change log | 官方文档 · LongCat · Change Log |
| web | antling/Ling-3.0-flash-VL | https://developer.ant-ling.com/zh-CN/docs/api-reference/chat/openai/ | 官方文档 · developer.ant-ling.com · openai · developer.ant-ling.com/zh-CN/docs/api-reference/chat/openai | 官方文档 · 蚂蚁百灵 · OpenAI（文档） |
| web | antling/Ling-3.0-flash-VL | https://developer.ant-ling.com/zh-CN/docs/models/ling/ | 官方文档 · developer.ant-ling.com · ling | 官方文档 · 蚂蚁百灵 · Ling |
| web | antling/Ling-3.0-flash-VL | https://developer.ant-ling.com/zh-CN/docs/tutorials/multimodal-understanding/ | 官方文档 · developer.ant-ling.com · multimodal understanding | 官方文档 · 蚂蚁百灵 · Multimodal Understanding |
| web | antling/Ling-3.0-flash-VL | https://developer.ant-ling.com/zh-CN/docs/api-reference/ | 官方文档 · developer.ant-ling.com · api reference | 官方文档 · 蚂蚁百灵 · API 文档 |
| web | antling/Ling-3.0-flash-VL | https://developer.ant-ling.com/zh-CN/docs/api-reference/openai/ | 官方文档 · developer.ant-ling.com · openai · developer.ant-ling.com/zh-CN/docs/api-reference/openai | 官方文档 · 蚂蚁百灵 · OpenAI（文档 2） |
| web | antling/Ling-3.0-flash-VL | https://huggingface.co/inclusionAI/Ling-3.0-flash-VL | 官方文档 · Hugging Face · Ling 3.0 flash VL | 官方文档 · Hugging Face · Ling 3.0 Flash VL |
| web | antling/Ling-3.0-tiny | https://developer.ant-ling.com/zh-CN/docs/api-reference/chat/openai/ | 官方文档 · developer.ant-ling.com · openai · developer.ant-ling.com/zh-CN/docs/api-reference/chat/openai | 官方文档 · 蚂蚁百灵 · OpenAI（文档） |
| web | antling/Ling-3.0-tiny | https://developer.ant-ling.com/zh-CN/docs/models/ling/ | 官方文档 · developer.ant-ling.com · ling | 官方文档 · 蚂蚁百灵 · Ling |
| web | antling/Ling-3.0-tiny | https://developer.ant-ling.com/zh-CN/docs/tutorials/multimodal-understanding/ | 官方文档 · developer.ant-ling.com · multimodal understanding | 官方文档 · 蚂蚁百灵 · Multimodal Understanding |
| web | antling/Ling-3.0-tiny | https://developer.ant-ling.com/zh-CN/docs/api-reference/ | 官方文档 · developer.ant-ling.com · api reference | 官方文档 · 蚂蚁百灵 · API 文档 |
| web | antling/Ling-3.0-tiny | https://developer.ant-ling.com/zh-CN/docs/api-reference/openai/ | 官方文档 · developer.ant-ling.com · openai · developer.ant-ling.com/zh-CN/docs/api-reference/openai | 官方文档 · 蚂蚁百灵 · OpenAI（文档 2） |
| web | antling/Ling-3.0-tiny | https://huggingface.co/inclusionAI/Ling-3.0-tiny | 官方文档 · Hugging Face · Ling 3.0 tiny | 官方文档 · Hugging Face · Ling 3.0 Tiny |
| web | antling/Ling-3.0-flash | https://developer.ant-ling.com/zh-CN/docs/api-reference/chat/openai/ | 官方文档 · developer.ant-ling.com · openai · developer.ant-ling.com/zh-CN/docs/api-reference/chat/openai | 官方文档 · 蚂蚁百灵 · OpenAI（文档） |
| web | antling/Ling-3.0-flash | https://developer.ant-ling.com/zh-CN/docs/models/ling/ | 官方文档 · developer.ant-ling.com · ling | 官方文档 · 蚂蚁百灵 · Ling |
| web | antling/Ling-3.0-flash | https://developer.ant-ling.com/zh-CN/docs/tutorials/multimodal-understanding/ | 官方文档 · developer.ant-ling.com · multimodal understanding | 官方文档 · 蚂蚁百灵 · Multimodal Understanding |
| web | antling/Ling-3.0-flash | https://developer.ant-ling.com/zh-CN/docs/api-reference/ | 官方文档 · developer.ant-ling.com · api reference | 官方文档 · 蚂蚁百灵 · API 文档 |
| web | antling/Ling-3.0-flash | https://developer.ant-ling.com/zh-CN/docs/api-reference/openai/ | 官方文档 · developer.ant-ling.com · openai · developer.ant-ling.com/zh-CN/docs/api-reference/openai | 官方文档 · 蚂蚁百灵 · OpenAI（文档 2） |
| web | antling/Ling-3.0-flash | https://huggingface.co/inclusionAI/Ling-3.0-flash | 官方文档 · Hugging Face · Ling 3.0 flash | 官方文档 · Hugging Face · Ling 3.0 Flash |
| web | antling/Ling-2.6-1T | https://developer.ant-ling.com/zh-CN/docs/models/deprecation/ | 下线公告 · developer.ant-ling.com · deprecation | 下线公告 · 蚂蚁百灵 · 模型下线公告 |
| web | antling/Ling-2.6-1T | https://huggingface.co/inclusionAI/Ling-2.6-1T | 官方文档 · Hugging Face · Ling 2.6 1T | 官方文档 · Hugging Face · Ling 2.6-1T |
| web | antling/Ling-2.6-1T | https://developer.ant-ling.com/zh-CN/docs/models/ling/#ling-26-1t | 官方文档 · developer.ant-ling.com · ling | 官方文档 · 蚂蚁百灵 · Ling |
| web | antling/Ling-2.6-1T | https://developer.ant-ling.com/zh-CN/docs/api-reference/ | 官方文档 · developer.ant-ling.com · api reference | 官方文档 · 蚂蚁百灵 · API 文档 |
| web | antling/Ling-2.6-1T | https://developer.ant-ling.com/zh-CN/docs/api-reference/openai/ | 官方文档 · developer.ant-ling.com · openai | 官方文档 · 蚂蚁百灵 · OpenAI |
| web | antling/Ling-2.6-flash | https://developer.ant-ling.com/zh-CN/docs/models/deprecation/ | 下线公告 · developer.ant-ling.com · deprecation | 下线公告 · 蚂蚁百灵 · 模型下线公告 |
| web | antling/Ling-2.6-flash | https://huggingface.co/inclusionAI/Ling-2.6-flash | 官方文档 · Hugging Face · Ling 2.6 flash | 官方文档 · Hugging Face · Ling 2.6 Flash |
| web | antling/Ling-2.6-flash | https://developer.ant-ling.com/zh-CN/docs/api-reference/ | 官方文档 · developer.ant-ling.com · api reference | 官方文档 · 蚂蚁百灵 · API 文档 |
| web | antling/Ling-2.6-flash | https://developer.ant-ling.com/zh-CN/docs/api-reference/openai/ | 官方文档 · developer.ant-ling.com · openai | 官方文档 · 蚂蚁百灵 · OpenAI |
| web | antling/Ling-3.1-flash | https://developer.ant-ling.com/zh-CN/docs/api-reference/chat/openai/ | 官方文档 · developer.ant-ling.com · openai | 官方文档 · 蚂蚁百灵 · OpenAI |
| web | antling/Ling-3.1-flash | https://developer.ant-ling.com/zh-CN/docs/models/ling/ | 官方文档 · developer.ant-ling.com · ling | 官方文档 · 蚂蚁百灵 · Ling |
| web | antling/Ling-3.1-flash | https://developer.ant-ling.com/zh-CN/docs/tutorials/multimodal-understanding/ | 官方文档 · developer.ant-ling.com · multimodal understanding | 官方文档 · 蚂蚁百灵 · Multimodal Understanding |
| web | antling/Ling-3.1-flash | https://developer.ant-ling.com/zh-CN/docs/api-reference/ | 官方文档 · developer.ant-ling.com · api reference | 官方文档 · 蚂蚁百灵 · API 文档 |
| web | antling/Ling-3.2-flash | https://developer.ant-ling.com/zh-CN/docs/api-reference/chat/openai/ | 官方文档 · developer.ant-ling.com · openai | 官方文档 · 蚂蚁百灵 · OpenAI |
| web | antling/Ling-3.2-flash | https://developer.ant-ling.com/zh-CN/docs/models/ling/ | 官方文档 · developer.ant-ling.com · ling | 官方文档 · 蚂蚁百灵 · Ling |
| web | antling/Ling-3.2-flash | https://developer.ant-ling.com/zh-CN/docs/tutorials/multimodal-understanding/ | 官方文档 · developer.ant-ling.com · multimodal understanding | 官方文档 · 蚂蚁百灵 · Multimodal Understanding |
| web | antling/Ling-3.2-flash | https://developer.ant-ling.com/zh-CN/docs/api-reference/ | 官方文档 · developer.ant-ling.com · api reference | 官方文档 · 蚂蚁百灵 · API 文档 |
| web | antling/Ring-2.6-1T | https://developer.ant-ling.com/zh-CN/docs/models/deprecation/ | 下线公告 · developer.ant-ling.com · deprecation | 下线公告 · 蚂蚁百灵 · 模型下线公告 |
| web | antling/Ring-2.6-1T | https://huggingface.co/inclusionAI/Ring-2.6-1T | 官方文档 · Hugging Face · Ring 2.6 1T | 官方文档 · Hugging Face · Ring 2.6-1T |
| web | antling/Ring-2.6-1T | https://developer.ant-ling.com/zh-CN/docs/models/ring/#ring-26-1t | 官方文档 · developer.ant-ling.com · ring | 官方文档 · 蚂蚁百灵 · Ring |
| web | antling/Ring-2.6-1T | https://developer.ant-ling.com/zh-CN/docs/api-reference/ | 官方文档 · developer.ant-ling.com · api reference | 官方文档 · 蚂蚁百灵 · API 文档 |
| web | antling/Ring-2.6-1T | https://developer.ant-ling.com/zh-CN/docs/api-reference/openai/ | 官方文档 · developer.ant-ling.com · openai | 官方文档 · 蚂蚁百灵 · OpenAI |
| web | novita/ming-image-0.1-design | https://docs.novita.ai/api-reference/model-apis-ming-image-txt2img | 官方文档 · novita.ai · model apis ming image txt2img | 官方文档 · Novita · Model Apis Ming Image Txt2img |
| web | novita/ming-image-0.1-design | https://docs.novita.ai/api-reference/model-apis-llm-list-models | 官方文档 · novita.ai · model apis llm list models | 官方文档 · Novita · Model Apis Llm List Models |
| web | novita/ming-image-0.1-design | https://novita.ai/models/model-detail/ming-image-0.1-design | 官方文档 · novita.ai · ming image 0.1 design | 官方文档 · Novita · Ming Image 0.1 Design |
| mini | kimi/kimi-k2.7-code-highspeed | https://platform.kimi.com/docs/guide/kimi-k2-7-code-quickstart | 官方文档 · kimi.com · kimi k2 7 code quickstart | 官方文档 · Kimi · Kimi K2.7 Code Quickstart |
| mini | kimi/kimi-k3.1-pro | https://platform.kimi.com/docs/guide/kimi-k3-1-pro-quickstart | 官方文档 · kimi.com · kimi k3 1 pro quickstart | 官方文档 · Kimi · Kimi K3.1 Pro Quickstart |
| mini | kimi/kimi-k3.1-pro-highspeed | https://platform.kimi.com/docs/guide/kimi-k3-1-pro-quickstart | 官方文档 · kimi.com · kimi k3 1 pro quickstart | 官方文档 · Kimi · Kimi K3.1 Pro Quickstart |
| mini | zhipu/glm-5.3 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.3 | 官方文档 · bigmodel.cn · glm 5.3 | 官方文档 · 智谱 · GLM-5.3 |
| mini | zhipu/glm-5.3-flash | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5.3-flash | 官方文档 · bigmodel.cn · glm 5.3 flash | 官方文档 · 智谱 · GLM 5.3 Flash |
| mini | zhipu/glm-5.3-flashx | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5.3-flash | 官方文档 · bigmodel.cn · glm 5.3 flash | 官方文档 · 智谱 · GLM 5.3 Flash |
| mini | zhipu/glm-5.2 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.2 | 官方文档 · bigmodel.cn · glm 5.2 | 官方文档 · 智谱 · GLM 5.2 |
| mini | zhipu/glm-5.1 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.1 | 官方文档 · bigmodel.cn · glm 5.1 | 官方文档 · 智谱 · GLM-5.1 |
| mini | zhipu/glm-5 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5 | 官方文档 · bigmodel.cn · glm 5 | 官方文档 · 智谱 · GLM-5 |
| mini | zhipu/glm-5-turbo | https://docs.bigmodel.cn/cn/guide/models/text/glm-5-turbo | 官方文档 · bigmodel.cn · glm 5 turbo | 官方文档 · 智谱 · GLM 5 Turbo |
| mini | zhipu/glm-5v-turbo | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5v-turbo | 官方文档 · bigmodel.cn · glm 5v turbo | 官方文档 · 智谱 · GLM 5V Turbo |
| mini | zhipu/glm-4.7 | https://docs.bigmodel.cn/cn/guide/models/text/glm-4.7 | 官方文档 · bigmodel.cn · glm 4.7 | 官方文档 · 智谱 · GLM-4.7 |
| mini | zhipu/glm-4.7-flash | https://docs.bigmodel.cn/cn/guide/models/free/glm-4.7-flash | 官方文档 · bigmodel.cn · glm 4.7 flash | 官方文档 · 智谱 · GLM 4.7 Flash |
| mini | zhipu/glm-4.7-flashx | https://docs.bigmodel.cn/cn/guide/models/text/glm-4.7 | 官方文档 · bigmodel.cn · glm 4.7 | 官方文档 · 智谱 · GLM 4.7 |
| mini | zhipu/glm-4.6 | https://docs.bigmodel.cn/cn/guide/models/text/glm-4.6 | 官方文档 · bigmodel.cn · glm 4.6 | 官方文档 · 智谱 · GLM-4.6 |
| mini | zhipu/glm-4.6v | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-4.6v | 官方文档 · bigmodel.cn · glm 4.6v | 官方文档 · 智谱 · GLM-4.6v |
| mini | zhipu/glm-4.6v-flash | https://docs.bigmodel.cn/cn/guide/models/free/glm-4.6v-flash | 官方文档 · bigmodel.cn · glm 4.6v flash | 官方文档 · 智谱 · GLM 4.6v Flash |
| mini | zhipu/glm-4.6v-flashx | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-4.6v | 官方文档 · bigmodel.cn · glm 4.6v | 官方文档 · 智谱 · GLM 4.6v |
| mini | zhipu/glm-4.5-air | https://docs.bigmodel.cn/cn/guide/models/text/glm-4.5 | 官方文档 · bigmodel.cn · glm 4.5 | 官方文档 · 智谱 · GLM 4.5 |
| mini | zhipu/glm-4.5-airx | https://docs.bigmodel.cn/cn/guide/models/text/glm-4.5 | 官方文档 · bigmodel.cn · glm 4.5 | 官方文档 · 智谱 · GLM 4.5 |
| mini | zhipu/glm-4.5-flash | https://docs.bigmodel.cn/cn/guide/models/free/glm-4.5-flash | 官方文档 · bigmodel.cn · glm 4.5 flash | 官方文档 · 智谱 · GLM 4.5 Flash |
| mini | zhipu/glm-4.1v-thinking-flash | https://docs.bigmodel.cn/cn/guide/models/free/glm-4.1v-thinking-flash | 官方文档 · bigmodel.cn · glm 4.1v thinking flash | 官方文档 · 智谱 · GLM 4.1v Thinking Flash |
| mini | zhipu/glm-4.1v-thinking-flashx | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-4.1v-thinking | 官方文档 · bigmodel.cn · glm 4.1v thinking | 官方文档 · 智谱 · GLM 4.1v Thinking |
| mini | zhipu/glm-4-flash-250414 | https://docs.bigmodel.cn/cn/guide/models/text/glm-4 | 官方文档 · bigmodel.cn · glm 4 | 官方文档 · 智谱 · GLM 4 |
| mini | zhipu/glm-4-flashx-250414 | https://docs.bigmodel.cn/cn/guide/models/text/glm-4 | 官方文档 · bigmodel.cn · glm 4 | 官方文档 · 智谱 · GLM 4 |
| mini | zhipu/glm-4-long | https://docs.bigmodel.cn/cn/guide/models/text/glm-4-long | 官方文档 · bigmodel.cn · glm 4 long | 官方文档 · 智谱 · GLM 4 Long |
| mini | zhipu/glm-4v-flash | https://docs.bigmodel.cn/cn/guide/models/free/glm-4v-flash | 官方文档 · bigmodel.cn · glm 4v flash | 官方文档 · 智谱 · GLM 4v Flash |
| mini | zhipu/cogview-3-flash | https://docs.bigmodel.cn/cn/guide/models/free/cogview-3-flash | 官方文档 · bigmodel.cn · cogview 3 flash | 官方文档 · 智谱 · CogView 3 Flash |
| mini | zhipu/cogview-4 | https://docs.bigmodel.cn/cn/guide/models/image-generation/cogview-4 | 官方文档 · bigmodel.cn · cogview 4 | 官方文档 · 智谱 · CogView 4 |
| mini | zhipu/cogview-4-250304 | https://docs.bigmodel.cn/cn/guide/models/image-generation/cogview-4 | 官方文档 · bigmodel.cn · cogview 4 | 官方文档 · 智谱 · CogView 4 |
| mini | zhipu/glm-image | https://docs.bigmodel.cn/cn/guide/models/image-generation/glm-image | 官方文档 · bigmodel.cn · glm image | 官方文档 · 智谱 · GLM Image |
| mini | siliconflow/XingChenAGI/Xing4.0-29B | https://huggingface.co/XingChen-AGI/Xing4.0-29B-A4B | 官方文档 · Hugging Face · Xing4.0 29B A4B | 官方文档 · Hugging Face · Xing4.0-29B A4B |
| mini | siliconflow/tencent/Hy4-preview | https://huggingface.co/tencent/Hy4-preview | 官方文档 · Hugging Face · Hy4 preview | 官方文档 · Hugging Face · Hy4 Preview |
| mini | siliconflow/MiniMaxAI/MiniMax-M2.5 | https://huggingface.co/MiniMaxAI/MiniMax-M2.5 | 官方文档 · Hugging Face · MiniMax M2.5 | 官方文档 · Hugging Face · MiniMax-M2.5 |
| mini | siliconflow/Pro/MiniMaxAI/MiniMax-M2.5 | https://huggingface.co/MiniMaxAI/MiniMax-M2.5 | 官方文档 · Hugging Face · MiniMax M2.5 | 官方文档 · Hugging Face · MiniMax-M2.5 |
| mini | siliconflow/Qwen/Qwen-Image-Edit-2509 | https://huggingface.co/Qwen/Qwen-Image-Edit-2509 | 官方文档 · Hugging Face · Qwen Image Edit 2509 | 官方文档 · Hugging Face · Qwen-Image-Edit-2509 |
| mini | siliconflow/Qwen/Qwen-Image-Edit | https://huggingface.co/Qwen/Qwen-Image-Edit | 官方文档 · Hugging Face · Qwen Image Edit | 官方文档 · Hugging Face · Qwen-Image-Edit |
| mini | siliconflow/Qwen/Qwen-Image-Edit | https://help.aliyun.com/zh/model-studio/model-depreciation | 原厂规格 · 百炼 · 模型下线公告 | 下线公告 · 百炼 · 模型下线公告 |
| mini | siliconflow/Qwen/Qwen3.6-27B | https://huggingface.co/Qwen/Qwen3.6-27B | 官方文档 · Hugging Face · Qwen3.6 27B | 官方文档 · Hugging Face · Qwen3.6-27B |
| mini | siliconflow/Qwen/Qwen3.6-35B-A3B | https://huggingface.co/Qwen/Qwen3.6-35B-A3B | 官方文档 · Hugging Face · Qwen3.6 35B A3B | 官方文档 · Hugging Face · Qwen3.6-35B-A3B |
| mini | siliconflow/Qwen/Qwen3.5-397B-A17B | https://huggingface.co/Qwen/Qwen3.5-397B-A17B | 官方文档 · Hugging Face · Qwen3.5 397B A17B | 官方文档 · Hugging Face · Qwen3.5-397B-A17B |
| mini | siliconflow/Qwen/Qwen3.5-4B | https://huggingface.co/Qwen/Qwen3.5-4B | 官方文档 · Hugging Face · Qwen3.5 4B | 官方文档 · Hugging Face · Qwen3.5-4B |
| mini | siliconflow/Qwen/Qwen3.5-9B | https://huggingface.co/Qwen/Qwen3.5-9B | 官方文档 · Hugging Face · Qwen3.5 9B | 官方文档 · Hugging Face · Qwen3.5-9B |
| mini | siliconflow/Qwen/Qwen3-14B | https://huggingface.co/Qwen/Qwen3-14B | 官方文档 · Hugging Face · Qwen3 14B | 官方文档 · Hugging Face · Qwen3-14B |
| mini | siliconflow/Qwen/Qwen3-30B-A3B-Instruct-2507 | https://huggingface.co/Qwen/Qwen3-30B-A3B-Instruct-2507 | 官方文档 · Hugging Face · Qwen3 30B A3B Instruct 2507 | 官方文档 · Hugging Face · Qwen3-30B-A3B-Instruct-2507 |
| mini | siliconflow/Qwen/Qwen3-32B | https://huggingface.co/Qwen/Qwen3-32B | 官方文档 · Hugging Face · Qwen3 32B | 官方文档 · Hugging Face · Qwen3-32B |
| mini | siliconflow/Qwen/Qwen3-8B | https://huggingface.co/Qwen/Qwen3-8B | 官方文档 · Hugging Face · Qwen3 8B | 官方文档 · Hugging Face · Qwen3-8B |
| mini | siliconflow/Pro/Qwen/Qwen2.5-7B-Instruct | https://huggingface.co/Qwen/Qwen2.5-7B-Instruct | 官方文档 · Hugging Face · Qwen2.5 7B Instruct | 官方文档 · Hugging Face · Qwen2.5-7B-Instruct |
| mini | siliconflow/Qwen/Qwen2.5-32B-Instruct | https://huggingface.co/Qwen/Qwen2.5-32B-Instruct | 官方文档 · Hugging Face · Qwen2.5 32B Instruct | 官方文档 · Hugging Face · Qwen2.5-32B-Instruct |
| mini | siliconflow/Qwen/Qwen2.5-72B-Instruct | https://huggingface.co/Qwen/Qwen2.5-72B-Instruct | 官方文档 · Hugging Face · Qwen2.5 72B Instruct | 官方文档 · Hugging Face · Qwen2.5-72B-Instruct |
| mini | siliconflow/Qwen/Qwen2.5-72B-Instruct-128K | https://huggingface.co/Qwen/Qwen2.5-72B-Instruct | 官方文档 · Hugging Face · Qwen2.5 72B Instruct | 官方文档 · Hugging Face · Qwen2.5-72B-Instruct |
| mini | siliconflow/Qwen/Qwen2.5-7B-Instruct | https://huggingface.co/Qwen/Qwen2.5-7B-Instruct | 官方文档 · Hugging Face · Qwen2.5 7B Instruct | 官方文档 · Hugging Face · Qwen2.5-7B-Instruct |
| mini | siliconflow/deepseek-ai/DeepSeek-V4.1-Flash | https://www.siliconflow.cn/models | 官方文档 · siliconflow.cn · 模型列表 | 官方文档 · SiliconFlow · 模型列表 |
| mini | siliconflow/deepseek-ai/DeepSeek-V4-Flash | https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash | 官方文档 · Hugging Face · DeepSeek V4 Flash | 官方文档 · Hugging Face · DeepSeek-V4-Flash |
| mini | siliconflow/Pro/deepseek-ai/DeepSeek-V3.2 | https://huggingface.co/deepseek-ai/DeepSeek-V3.2 | 官方文档 · Hugging Face · DeepSeek V3.2 | 官方文档 · Hugging Face · DeepSeek-V3.2 |
| mini | siliconflow/deepseek-ai/DeepSeek-V3.2 | https://huggingface.co/deepseek-ai/DeepSeek-V3.2 | 官方文档 · Hugging Face · DeepSeek V3.2 | 官方文档 · Hugging Face · DeepSeek-V3.2 |
| mini | siliconflow/Pro/deepseek-ai/DeepSeek-V3.1-Terminus | https://huggingface.co/deepseek-ai/DeepSeek-V3.1-Terminus | 官方文档 · Hugging Face · DeepSeek V3.1 Terminus | 官方文档 · Hugging Face · DeepSeek-V3.1-Terminus |
| mini | siliconflow/deepseek-ai/DeepSeek-V3.1-Terminus | https://huggingface.co/deepseek-ai/DeepSeek-V3.1-Terminus | 官方文档 · Hugging Face · DeepSeek V3.1 Terminus | 官方文档 · Hugging Face · DeepSeek-V3.1-Terminus |
| mini | siliconflow/deepseek-ai/DeepSeek-R1-0528-Qwen3-8B | https://huggingface.co/deepseek-ai/DeepSeek-R1-0528-Qwen3-8B | 官方文档 · Hugging Face · DeepSeek R1 0528 Qwen3 8B | 官方文档 · Hugging Face · DeepSeek-R1-0528-Qwen3-8B |
| mini | siliconflow/moonshotai/Kimi-K2.7-Code | https://huggingface.co/moonshotai/Kimi-K2.7-Code | 官方文档 · Hugging Face · Kimi K2.7 Code | 官方文档 · Hugging Face · Kimi-K2.7-Code |
| mini | siliconflow/stepfun-ai/Step-3.5-Flash | https://platform.stepfun.com/docs/zh/guides/models/list | 原厂规格 · stepfun.com · list | 原厂规格 · StepFun · List |
| mini | siliconflow/zai-org/GLM-5.3 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.3 | 官方文档 · bigmodel.cn · glm 5.3 | 官方文档 · 智谱 · GLM-5.3 |
| mini | siliconflow/zai-org/GLM-5.3-Flash | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5.3-flash | 官方文档 · bigmodel.cn · glm 5.3 flash | 官方文档 · 智谱 · GLM 5.3 Flash |
| mini | siliconflow/zai-org/GLM-5.2 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.2 | 官方文档 · bigmodel.cn · glm 5.2 | 官方文档 · 智谱 · GLM-5.2 |
| mini | siliconflow/Pro/zai-org/GLM-5.1 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.1 | 官方文档 · bigmodel.cn · glm 5.1 | 官方文档 · 智谱 · GLM-5.1 |
| mini | siliconflow/zai-org/GLM-4.5-Air | https://docs.bigmodel.cn/cn/guide/models/text/glm-4.5 | 官方文档 · bigmodel.cn · glm 4.5 | 官方文档 · 智谱 · GLM 4.5 |
| mini | siliconflow/zai-org/GLM-4.5V | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-4.5v | 官方文档 · bigmodel.cn · glm 4.5v | 官方文档 · 智谱 · GLM-4.5V |
| mini | siliconflow/THUDM/GLM-4-32B-0414 | https://github.com/zai-org/GLM-4/blob/main/README.md | 官方文档 · github.com · README.md | 官方文档 · GitHub · README |
| mini | siliconflow/THUDM/GLM-4-9B-0414 | https://github.com/zai-org/GLM-4/blob/main/README.md | 官方文档 · github.com · README.md | 官方文档 · GitHub · README |
| mini | siliconflow/THUDM/GLM-Z1-9B-0414 | https://github.com/zai-org/GLM-4/blob/main/README.md | 官方文档 · github.com · README.md | 官方文档 · GitHub · README |
| mini | siliconflow/Pro/deepseek-ai/DeepSeek-V3 | https://huggingface.co/deepseek-ai/DeepSeek-V3 | 官方文档 · Hugging Face · DeepSeek V3 | 官方文档 · Hugging Face · DeepSeek-V3 |
| mini | siliconflow/deepseek-ai/DeepSeek-V3 | https://huggingface.co/deepseek-ai/DeepSeek-V3 | 官方文档 · Hugging Face · DeepSeek V3 | 官方文档 · Hugging Face · DeepSeek-V3 |
| mini | siliconflow/ByteDance-Seed/Seed-OSS-36B-Instruct | https://huggingface.co/ByteDance-Seed/Seed-OSS-36B-Instruct | 官方文档 · Hugging Face · Seed OSS 36B Instruct | 官方文档 · Hugging Face · Seed-OSS-36B-Instruct |
| mini | siliconflow/Pro/deepseek-ai/DeepSeek-R1 | https://huggingface.co/deepseek-ai/DeepSeek-R1 | 官方文档 · Hugging Face · DeepSeek R1 | 官方文档 · Hugging Face · DeepSeek-R1 |
| mini | siliconflow/Qwen/Qwen3-Coder-30B-A3B-Instruct | https://huggingface.co/Qwen/Qwen3-Coder-30B-A3B-Instruct | 官方文档 · Hugging Face · Qwen3 Coder 30B A3B Instruct | 官方文档 · Hugging Face · Qwen3-Coder-30B-A3B-Instruct |
| mini | siliconflow/Qwen/Qwen3-Omni-30B-A3B-Instruct | https://huggingface.co/Qwen/Qwen3-Omni-30B-A3B-Instruct | 官方文档 · Hugging Face · Qwen3 Omni 30B A3B Instruct | 官方文档 · Hugging Face · Qwen3-Omni-30B-A3B-Instruct |
| mini | siliconflow/Qwen/Qwen3-Omni-30B-A3B-Thinking | https://huggingface.co/Qwen/Qwen3-Omni-30B-A3B-Thinking | 官方文档 · Hugging Face · Qwen3 Omni 30B A3B Thinking | 官方文档 · Hugging Face · Qwen3-Omni-30B-A3B-Thinking |
| mini | siliconflow/Qwen/Qwen3-VL-30B-A3B-Instruct | https://huggingface.co/Qwen/Qwen3-VL-30B-A3B-Instruct | 官方文档 · Hugging Face · Qwen3 VL 30B A3B Instruct | 官方文档 · Hugging Face · Qwen3-VL-30B-A3B-Instruct |
| mini | siliconflow/Qwen/Qwen3-VL-30B-A3B-Thinking | https://huggingface.co/Qwen/Qwen3-VL-30B-A3B-Thinking | 官方文档 · Hugging Face · Qwen3 VL 30B A3B Thinking | 官方文档 · Hugging Face · Qwen3-VL-30B-A3B-Thinking |
| mini | siliconflow/Qwen/Qwen3-VL-32B-Instruct | https://huggingface.co/Qwen/Qwen3-VL-32B-Instruct | 官方文档 · Hugging Face · Qwen3 VL 32B Instruct | 官方文档 · Hugging Face · Qwen3-VL-32B-Instruct |
| mini | siliconflow/Qwen/Qwen3-VL-32B-Thinking | https://huggingface.co/Qwen/Qwen3-VL-32B-Thinking | 官方文档 · Hugging Face · Qwen3 VL 32B Thinking | 官方文档 · Hugging Face · Qwen3-VL-32B-Thinking |
| mini | siliconflow/Qwen/Qwen3-VL-8B-Instruct | https://huggingface.co/Qwen/Qwen3-VL-8B-Instruct | 官方文档 · Hugging Face · Qwen3 VL 8B Instruct | 官方文档 · Hugging Face · Qwen3-VL-8B-Instruct |
| mini | siliconflow/Qwen/Qwen3-VL-8B-Thinking | https://huggingface.co/Qwen/Qwen3-VL-8B-Thinking | 官方文档 · Hugging Face · Qwen3 VL 8B Thinking | 官方文档 · Hugging Face · Qwen3-VL-8B-Thinking |
| mini | siliconflow/Tongyi-MAI/Z-Image | https://huggingface.co/Tongyi-MAI/Z-Image | 官方文档 · Hugging Face · Z Image | 官方文档 · Hugging Face · Z-Image |
| mini | siliconflow/baidu/ERNIE-Image-Turbo | https://huggingface.co/baidu/ERNIE-Image-Turbo | 官方文档 · Hugging Face · ERNIE Image Turbo | 官方文档 · Hugging Face · ERNIE-Image-Turbo |
| mini | siliconflow/deepseek-ai/DeepSeek-R1 | https://huggingface.co/deepseek-ai/DeepSeek-R1 | 官方文档 · Hugging Face · DeepSeek R1 | 官方文档 · Hugging Face · DeepSeek-R1 |
| mini | siliconflow/inclusionAI/Ling-flash-2.0 | https://huggingface.co/inclusionAI/Ling-flash-2.0 | 官方文档 · Hugging Face · Ling flash 2.0 | 官方文档 · Hugging Face · Ling Flash 2.0 |
| mini | siliconflow/inclusionAI/Ling-mini-2.0 | https://huggingface.co/inclusionAI/Ling-mini-2.0 | 官方文档 · Hugging Face · Ling mini 2.0 | 官方文档 · Hugging Face · Ling Mini 2.0 |
| mini | siliconflow/meituan-longcat/LongCat-2.0 | https://huggingface.co/meituan-longcat/LongCat-2.0 | 官方文档 · Hugging Face · LongCat 2.0 | 官方文档 · Hugging Face · LongCat-2.0 |
| mini | siliconflow/nex-agi/Nex-N2-Pro | https://huggingface.co/nex-agi/Nex-N2-Pro | 官方文档 · Hugging Face · Nex N2 Pro | 官方文档 · Hugging Face · Nex-N2-Pro |
| mini | siliconflow/tencent/Hunyuan-A13B-Instruct | https://huggingface.co/tencent/Hunyuan-A13B-Instruct | 官方文档 · Hugging Face · Hunyuan A13B Instruct | 官方文档 · Hugging Face · Hunyuan-A13B-Instruct |
| mini | anthropic/claude-haiku-5-5 | https://platform.claude.com/docs/en/models/haiku-5-5/overview | 官方文档 · claude.com · overview | 官方文档 · Claude · Haiku 5-5 |
| mini | anthropic/claude-sonnet-5-5 | https://platform.claude.com/docs/en/models/sonnet-5-5/overview | 官方文档 · claude.com · overview | 官方文档 · Claude · Sonnet 5-5 |
| mini | anthropic/claude-opus-5-5 | https://docs.anthropic.com/en/docs/about-claude/models/overview | 官方文档 · anthropic.com · overview | 官方文档 · Anthropic · 模型列表 |
| mini | anthropic/claude-fable-5-1 | https://docs.anthropic.com/en/docs/about-claude/models/overview | 官方文档 · anthropic.com · overview | 官方文档 · Anthropic · 模型列表 |
| mini | anthropic/claude-opus-5 | https://platform.claude.com/docs/en/models/opus-5/overview | 官方文档 · claude.com · overview | 官方文档 · Claude · Opus 5 |
| mini | anthropic/claude-sonnet-5 | https://platform.claude.com/docs/en/models/sonnet-5/overview | 官方文档 · claude.com · overview | 官方文档 · Claude · Sonnet 5 |
| mini | anthropic/claude-fable-5 | https://platform.claude.com/docs/en/models/fable-5/overview | 官方文档 · claude.com · overview | 官方文档 · Claude · Fable 5 |
| mini | anthropic/claude-opus-4-8 | https://platform.claude.com/docs/en/models/opus-4-8/overview | 官方文档 · claude.com · overview | 官方文档 · Claude · Opus 4-8 |
| mini | anthropic/claude-opus-4-7 | https://platform.claude.com/docs/en/models/opus-4-7/overview | 官方文档 · claude.com · overview | 官方文档 · Claude · Opus 4-7 |
| mini | anthropic/claude-sonnet-4-6 | https://platform.claude.com/docs/en/models/sonnet-4-6/overview | 官方文档 · claude.com · overview | 官方文档 · Claude · Sonnet 4-6 |
| mini | anthropic/claude-opus-4-6 | https://platform.claude.com/docs/en/models/opus-4-6/overview | 官方文档 · claude.com · overview | 官方文档 · Claude · Opus 4-6 |
| mini | anthropic/claude-opus-4-5-20251101 | https://platform.claude.com/docs/en/models/opus-4-5/overview | 官方文档 · claude.com · overview | 官方文档 · Claude · Opus 4-5 |
| mini | anthropic/claude-sonnet-4-5-20250929 | https://platform.claude.com/docs/en/models/sonnet-4-5/overview | 官方文档 · claude.com · overview | 官方文档 · Claude · Sonnet 4-5 |
| mini | anthropic/claude-haiku-4-5-20251001 | https://platform.claude.com/docs/en/models/haiku-4-5/overview | 官方文档 · claude.com · overview | 官方文档 · Claude · Haiku 4-5 |
| mini | recraft/recraftv4_1 | https://www.recraft.ai/docs/api-reference/models/recraft-v4-1 | 官方文档 · recraft.ai · recraft v4 1 | 官方文档 · Recraft · Recraft V4.1 |
| mini | recraft/recraftv4_1_flash | https://www.recraft.ai/docs/api-reference/models/recraft-v4-1-flash | 官方文档 · recraft.ai · recraft v4 1 flash | 官方文档 · Recraft · Recraft V4.1 Flash |
| mini | recraft/recraftv4_1_pro | https://www.recraft.ai/docs/api-reference/models/recraft-v4-1 | 官方文档 · recraft.ai · recraft v4 1 | 官方文档 · Recraft · Recraft V4.1 |
| mini | recraft/recraftv4_1_pro_vector | https://www.recraft.ai/docs/api-reference/models/recraft-v4-1 | 官方文档 · recraft.ai · recraft v4 1 | 官方文档 · Recraft · Recraft V4.1 |
| mini | recraft/recraftv4_1_utility | https://www.recraft.ai/docs/api-reference/models/recraft-v4-1 | 官方文档 · recraft.ai · recraft v4 1 | 官方文档 · Recraft · Recraft V4.1 |
| mini | recraft/recraftv4_1_utility_pro | https://www.recraft.ai/docs/api-reference/models/recraft-v4-1 | 官方文档 · recraft.ai · recraft v4 1 | 官方文档 · Recraft · Recraft V4.1 |
| mini | recraft/recraftv4_1_utility_pro_vector | https://www.recraft.ai/docs/api-reference/models/recraft-v4-1 | 官方文档 · recraft.ai · recraft v4 1 | 官方文档 · Recraft · Recraft V4.1 |
| mini | recraft/recraftv4_1_utility_vector | https://www.recraft.ai/docs/api-reference/models/recraft-v4-1 | 官方文档 · recraft.ai · recraft v4 1 | 官方文档 · Recraft · Recraft V4.1 |
| mini | recraft/recraftv4_1_vector | https://www.recraft.ai/docs/api-reference/models/recraft-v4-1 | 官方文档 · recraft.ai · recraft v4 1 | 官方文档 · Recraft · Recraft V4.1 |
| mini | recraft/recraftv4 | https://www.recraft.ai/docs/api-reference/models/recraft-v4 | 官方文档 · recraft.ai · recraft v4 | 官方文档 · Recraft · Recraft V4 |
| mini | recraft/recraftv4_pro | https://www.recraft.ai/docs/api-reference/models/recraft-v4 | 官方文档 · recraft.ai · recraft v4 | 官方文档 · Recraft · Recraft V4 |
| mini | recraft/recraftv4_pro_vector | https://www.recraft.ai/docs/api-reference/models/recraft-v4 | 官方文档 · recraft.ai · recraft v4 | 官方文档 · Recraft · Recraft V4 |
| mini | recraft/recraftv4_vector | https://www.recraft.ai/docs/api-reference/models/recraft-v4 | 官方文档 · recraft.ai · recraft v4 | 官方文档 · Recraft · Recraft V4 |
| mini | recraft/recraftv3 | https://www.recraft.ai/docs/api-reference/models/recraft-v3 | 官方文档 · recraft.ai · recraft v3 | 官方文档 · Recraft · Recraft V3 |
| mini | recraft/recraftv3_vector | https://www.recraft.ai/docs/api-reference/models/recraft-v3 | 官方文档 · recraft.ai · recraft v3 | 官方文档 · Recraft · Recraft V3 |
| mini | recraft/recraftv2 | https://www.recraft.ai/docs/api-reference/models/recraft-v2 | 官方文档 · recraft.ai · recraft v2 | 官方文档 · Recraft · Recraft V2 |
| mini | recraft/recraftv2_vector | https://www.recraft.ai/docs/api-reference/models/recraft-v2 | 官方文档 · recraft.ai · recraft v2 | 官方文档 · Recraft · Recraft V2 |
| mini | xai/grok-4.7 | https://docs.x.ai/developers/models/grok-4.7 | 官方文档 · x.ai · grok 4.7 | 官方文档 · xAI · Grok 4.7 |
| mini | xai/grok-4.6 | https://docs.x.ai/developers/models/grok-4.6 | 官方文档 · x.ai · grok 4.6 | 官方文档 · xAI · Grok 4.6 |
| mini | xai/grok-4.5 | https://docs.x.ai/developers/models/grok-4.5 | 官方文档 · x.ai · grok 4.5 | 官方文档 · xAI · Grok-4.5 |
| mini | xai/grok-4.3 | https://docs.x.ai/developers/models/grok-4.3 | 官方文档 · x.ai · grok 4.3 | 官方文档 · xAI · Grok-4.3 |
| mini | xai/grok-4.20-0309-non-reasoning | https://docs.x.ai/developers/models/grok-4.20-0309-non-reasoning | 官方文档 · x.ai · grok 4.20 0309 non reasoning | 官方文档 · xAI · Grok 4.20-0309 Non Reasoning |
| mini | xai/grok-4.20-0309-reasoning | https://docs.x.ai/developers/models/grok-4.20-0309-reasoning | 官方文档 · x.ai · grok 4.20 0309 reasoning | 官方文档 · xAI · Grok 4.20-0309 Reasoning |
| mini | xai/grok-4.20-multi-agent | https://docs.x.ai/developers/models/grok-4.20-multi-agent-0309 | 官方文档 · x.ai · grok 4.20 multi agent 0309 | 官方文档 · xAI · Grok 4.20 Multi Agent 0309 |
| mini | xai/grok-4.20-multi-agent-0309 | https://docs.x.ai/developers/models/grok-4.20-multi-agent-0309 | 官方文档 · x.ai · grok 4.20 multi agent 0309 | 官方文档 · xAI · Grok 4.20 Multi Agent 0309 |
| mini | xai/grok-imagine-image-2.0 | https://docs.x.ai/developers/models/grok-imagine-image-2.0 | 官方文档 · x.ai · grok imagine image 2.0 | 官方文档 · xAI · Grok Imagine Image 2.0 |
| mini | xai/grok-imagine-image | https://docs.x.ai/developers/models/grok-imagine-image | 官方文档 · x.ai · grok imagine image | 官方文档 · xAI · Grok Imagine Image |
| mini | xai/grok-imagine-image-quality | https://docs.x.ai/developers/models/grok-imagine-image-quality | 官方文档 · x.ai · grok imagine image quality | 官方文档 · xAI · Grok Imagine Image Quality |
| mini | xai/grok-build-0.1 | https://docs.x.ai/developers/models/grok-build-0.1 | 官方文档 · x.ai · grok build 0.1 | 官方文档 · xAI · Grok Build 0.1 |
| mini | gemini/gemini-4-argon | https://ai.google.dev/gemini-api/docs/models/gemini-4-argon | 官方文档 · ai.google.dev · gemini 4 argon | 官方文档 · Google · Gemini 4 Argon |
| mini | gemini/gemini-nano-banana-2.1 | https://ai.google.dev/gemini-api/docs/models/gemini-nano-banana-2.1 | 官方文档 · ai.google.dev · gemini nano banana 2.1 | 官方文档 · Google · Nano Banana 2.1 |
| mini | gemini/gemini-3.8-flash | https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash | 官方文档 · ai.google.dev · gemini 3.8 flash | 官方文档 · Google · Gemini 3.8 Flash |
| mini | gemini/gemini-3.7-flash | https://ai.google.dev/gemini-api/docs/models/gemini-3.7-flash | 官方文档 · ai.google.dev · gemini 3.7 flash | 官方文档 · Google · Gemini 3.7 Flash |
| mini | gemini/gemini-3.6-flash | https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash | 官方文档 · ai.google.dev · gemini 3.6 flash | 官方文档 · Google · Gemini 3.6 Flash |
| mini | gemini/gemini-3.5-flash-lite | https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite | 官方文档 · ai.google.dev · gemini 3.5 flash lite | 官方文档 · Google · Gemini 3.5 Flash-Lite |
| mini | gemini/gemini-3.1-flash-lite-image | https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite-image | 官方文档 · ai.google.dev · gemini 3.1 flash lite image | 官方文档 · Google · Gemini 3.1 Flash Lite Image（Nano Banana 2 Lite） |
| mini | gemini/gemini-3.1-flash-image | https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-image | 官方文档 · ai.google.dev · gemini 3.1 flash image | 官方文档 · Google · Gemini 3.1 Flash Image（Nano Banana 2） |
| mini | gemini/gemini-3-pro-image | https://ai.google.dev/gemini-api/docs/models/gemini-3-pro-image | 官方文档 · ai.google.dev · gemini 3 pro image | 官方文档 · Google · Gemini 3 Pro Image（Nano Banana Pro） |
| mini | gemini/gemini-3.5-flash | https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash | 官方文档 · ai.google.dev · gemini 3.5 flash | 官方文档 · Google · Gemini 3.5 Flash |
| mini | gemini/gemini-3.1-flash-lite | https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite | 官方文档 · ai.google.dev · gemini 3.1 flash lite | 官方文档 · Google · Gemini 3.1 Flash-Lite |
| mini | gemini/gemini-3.1-pro-preview | https://ai.google.dev/gemini-api/docs/models/gemini-3.1-pro-preview | 官方文档 · ai.google.dev · gemini 3.1 pro preview | 官方文档 · Google · Gemini 3.1 Pro Preview |
| mini | gemini/gemini-3-flash-preview | https://ai.google.dev/gemini-api/docs/models/gemini-3-flash-preview | 官方文档 · ai.google.dev · gemini 3 flash preview | 官方文档 · Google · Gemini 3 Flash Preview |
| mini | gemini/gemini-2.5-flash | https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash | 官方文档 · ai.google.dev · gemini 2.5 flash | 官方文档 · Google · Gemini 2.5 Flash |
| mini | gemini/gemini-2.5-flash-image | https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-image | 官方文档 · ai.google.dev · gemini 2.5 flash image | 官方文档 · Google · Gemini 2.5 Flash Image（Nano Banana） |
| mini | gemini/gemini-2.5-flash-lite | https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-lite | 官方文档 · ai.google.dev · gemini 2.5 flash lite | 官方文档 · Google · Gemini 2.5 Flash-Lite |
| mini | gemini/gemini-2.5-pro | https://ai.google.dev/gemini-api/docs/models/gemini-2.5-pro | 官方文档 · ai.google.dev · gemini 2.5 pro | 官方文档 · Google · Gemini 2.5 Pro |
| mini | bailian/deepseek-v4.1-flash | https://help.aliyun.com/zh/model-studio/deepseek-v4-1-flash | 官方文档 · 百炼 · DeepSeek-V4.1-Flash 模型页 | 官方文档 · 百炼 · DeepSeek-V4.1-Flash |
| mini | bailian/qwen3.8-max-0902 | https://help.aliyun.com/zh/model-studio/qwen3-8-max | 官方文档 · 百炼 · qwen3 8 max | 官方文档 · 百炼 · Qwen3.8 Max |
| mini | bailian/ZHIPU/GLM-5.3-Flash | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5.3-flash | 官方文档 · bigmodel.cn · glm 5.3 flash | 官方文档 · 智谱 · GLM 5.3 Flash |
| mini | bailian/qwen3.8-flash | https://help.aliyun.com/zh/model-studio/vision-model | 官方文档 · 百炼 · vision model | 官方文档 · 百炼 · Vision Model |
| mini | bailian/kimi-k3 | https://help.aliyun.com/zh/model-studio/kimi-k3 | 官方文档 · 百炼 · Kimi-K3 模型页 | 官方文档 · 百炼 · Kimi K3 (Bailian hosted) |
| mini | bailian/qwen3.8-27b | https://help.aliyun.com/zh/model-studio/qwen3-8-27b | 官方文档 · 百炼 · qwen3 8 27b | 官方文档 · 百炼 · Qwen3.8 27B |
| mini | bailian/qwen3.8-2.4t-a95b | https://help.aliyun.com/zh/model-studio/qwen3-8-2-4t-a95b | 官方文档 · 百炼 · qwen3 8 2 4t a95b | 官方文档 · 百炼 · Qwen3.8 2.4T A95B |
| mini | bailian/ZHIPU/GLM-5.3-FlashX | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5.3-flash | 官方文档 · bigmodel.cn · glm 5.3 flash | 官方文档 · 智谱 · GLM 5.3 Flash |
| mini | bailian/deepseek-v4.1-flash-1017 | https://help.aliyun.com/zh/model-studio/deepseek-api | 官方文档 · 百炼 · deepseek api | 官方文档 · 百炼 · DeepSeek API |
| mini | bailian/deepseek-v4-pro-0813 | https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro-0813 | 官方文档 · Hugging Face · DeepSeek V4 Pro 0813 | 官方文档 · Hugging Face · DeepSeek-V4-Pro-0813 |
| mini | bailian/vanchin/deepseek-v4-pro-0813 | https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro-0813 | 官方文档 · Hugging Face · DeepSeek V4 Pro 0813 | 官方文档 · Hugging Face · DeepSeek-V4-Pro 0813 |
| mini | bailian/qwen-image-3.0 | https://help.aliyun.com/zh/model-studio/qwen-image-3-0 | 官方文档 · 百炼 · qwen image 3 0 | 官方文档 · 百炼 · Qwen Image 3.0 |
| mini | bailian/qwen-image-3.0-pro | https://help.aliyun.com/zh/model-studio/qwen-image-3-0-pro | 官方文档 · 百炼 · qwen image 3 0 pro | 官方文档 · 百炼 · Qwen Image 3.0 Pro |
| mini | bailian/qwen3.8-max | https://help.aliyun.com/zh/model-studio/qwen3-8-max | 官方文档 · 百炼 · qwen3 8 max | 官方文档 · 百炼 · Qwen3.8 Max |
| mini | bailian/deepseek-v4-flash-0731 | https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731 | 官方文档 · Hugging Face · DeepSeek V4 Flash 0731 | 官方文档 · Hugging Face · DeepSeek-V4-Flash-0731 |
| mini | bailian/glm-5.2 | https://help.aliyun.com/zh/model-studio/glm-5-2 | 官方文档 · 百炼 · glm 5 2 | 官方文档 · 百炼 · GLM 5.2 |
| mini | bailian/glm-5.2-fast-preview | https://www.qianwenai.com/models/glm-5.2-fast-preview | 官方文档 · qianwenai.com · glm 5.2 fast preview | 官方文档 · 千问 · GLM 5.2 Fast Preview |
| mini | bailian/glm-5.1 | https://help.aliyun.com/zh/model-studio/glm-5-1 | 官方文档 · 百炼 · glm 5 1 | 官方文档 · 百炼 · GLM-5.1 |
| mini | bailian/ZHIPU/GLM-5 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5 | 官方文档 · bigmodel.cn · glm 5 | 官方文档 · 智谱 · GLM-5 |
| mini | bailian/glm-5 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5 | 官方文档 · bigmodel.cn · glm 5 | 官方文档 · 智谱 · GLM-5 |
| mini | bailian/kimi-k2.7-code | https://help.aliyun.com/zh/model-studio/kimi-k2-7-code | 官方文档 · 百炼 · kimi k2 7 code | 官方文档 · 百炼 · Kimi K2.7 Code |
| mini | bailian/kimi-k2.6 | https://help.aliyun.com/zh/model-studio/kimi-k2-6 | 官方文档 · 百炼 · kimi k2 6 | 官方文档 · 百炼 · Kimi-k2.6 |
| mini | bailian/kimi-k2.5 | https://help.aliyun.com/zh/model-studio/kimi-k2-5 | 官方文档 · 百炼 · kimi k2 5 | 官方文档 · 百炼 · Kimi-k2.5 |
| mini | bailian/kimi/kimi-k2.5 | https://huggingface.co/moonshotai/Kimi-K2.5 | 官方文档 · Hugging Face · Kimi K2.5 | 官方文档 · Hugging Face · Kimi-k2.5 |
| mini | bailian/qwen-image-2.1-pro | https://help.aliyun.com/zh/model-studio/qwen-image-2-1-pro | 官方文档 · 百炼 · qwen image 2 1 pro | 官方文档 · 百炼 · Qwen Image 2.1 Pro |
| mini | bailian/qwen-image-2.1-turbo | https://help.aliyun.com/zh/model-studio/qwen-image-2-1-turbo | 官方文档 · 百炼 · qwen image 2 1 turbo | 官方文档 · 百炼 · Qwen Image 2.1 Turbo |
| mini | bailian/qwen-image-2.0-pro-2026-06-22 | https://help.aliyun.com/zh/model-studio/qwen-image-2-0-pro | 官方文档 · 百炼 · qwen image 2 0 pro | 官方文档 · 百炼 · Qwen Image 2.0 Pro |
| mini | bailian/qwen-image-2.0 | https://help.aliyun.com/zh/model-studio/qwen-image-2-0 | 官方文档 · 百炼 · qwen image 2 0 | 官方文档 · 百炼 · Qwen Image 2.0 |
| mini | bailian/qwen-image-2.0-2026-03-03 | https://help.aliyun.com/zh/model-studio/qwen-image-2-0 | 官方文档 · 百炼 · qwen image 2 0 | 官方文档 · 百炼 · Qwen Image 2.0 |
| mini | bailian/qwen-image-2.0-pro | https://help.aliyun.com/zh/model-studio/qwen-image-2-0-pro | 官方文档 · 百炼 · qwen image 2 0 pro | 官方文档 · 百炼 · Qwen Image 2.0 Pro |
| mini | bailian/qwen-image-2.0-pro-2026-03-03 | https://help.aliyun.com/zh/model-studio/qwen-image-2-0-pro | 官方文档 · 百炼 · qwen image 2 0 pro | 官方文档 · 百炼 · Qwen Image 2.0 Pro |
| mini | bailian/qwen-image-2.0-pro-2026-04-22 | https://help.aliyun.com/zh/model-studio/qwen-image-2-0-pro | 官方文档 · 百炼 · qwen image 2 0 pro | 官方文档 · 百炼 · Qwen Image 2.0 Pro |
| mini | bailian/qwen-image | https://help.aliyun.com/zh/model-studio/qwen-image-api | 官方文档 · 百炼 · qwen image api | 官方文档 · 百炼 · Qwen Image API |
| mini | bailian/qwen3.7-max | https://help.aliyun.com/zh/model-studio/qwen3-7-max | 官方文档 · 百炼 · qwen3 7 max | 官方文档 · 百炼 · Qwen3.7 Max |
| mini | bailian/qwen3.7-max-2026-05-17 | https://help.aliyun.com/zh/model-studio/qwen3-7-max | 官方文档 · 百炼 · qwen3 7 max | 官方文档 · 百炼 · Qwen3.7 Max |
| mini | bailian/qwen3.7-max-2026-05-20 | https://help.aliyun.com/zh/model-studio/qwen3-7-max | 官方文档 · 百炼 · qwen3 7 max | 官方文档 · 百炼 · Qwen3.7 Max |
| mini | bailian/qwen3.7-max-2026-06-08 | https://help.aliyun.com/zh/model-studio/qwen3-7-max | 官方文档 · 百炼 · qwen3 7 max | 官方文档 · 百炼 · Qwen3.7 Max |
| mini | bailian/qwen3.7-max-preview | https://help.aliyun.com/zh/model-studio/qwen3-7-max | 官方文档 · 百炼 · qwen3 7 max | 官方文档 · 百炼 · Qwen3.7 Max |
| mini | bailian/qwen3.7-plus | https://help.aliyun.com/zh/model-studio/qwen3-7-plus | 官方文档 · 百炼 · qwen3 7 plus | 官方文档 · 百炼 · Qwen3.7 Plus |
| mini | bailian/qwen3.7-plus-2026-05-26 | https://help.aliyun.com/zh/model-studio/qwen3-7-plus | 官方文档 · 百炼 · qwen3 7 plus | 官方文档 · 百炼 · Qwen3.7 Plus |
| mini | bailian/qwen3.6-27b | https://huggingface.co/Qwen/Qwen3.6-27B | 官方文档 · Hugging Face · Qwen3.6 27B | 官方文档 · Hugging Face · Qwen3.6-27b |
| mini | bailian/qwen3.6-35b-a3b | https://huggingface.co/Qwen/Qwen3.6-35B-A3B | 官方文档 · Hugging Face · Qwen3.6 35B A3B | 官方文档 · Hugging Face · Qwen3.6-35b-a3b |
| mini | bailian/qwen3.6-plus | https://help.aliyun.com/zh/model-studio/qwen3-6-plus | 官方文档 · 百炼 · qwen3 6 plus | 官方文档 · 百炼 · Qwen3.6 Plus |
| mini | bailian/qwen3.6-plus-2026-04-02 | https://help.aliyun.com/zh/model-studio/qwen3-6-plus | 官方文档 · 百炼 · qwen3 6 plus | 官方文档 · 百炼 · Qwen3.6 Plus |
| mini | bailian/qwen3.5-omni-flash | https://help.aliyun.com/zh/model-studio/qwen3-5-omni-flash | 官方文档 · 百炼 · qwen3 5 omni flash | 官方文档 · 百炼 · Qwen3.5 Omni Flash |
| mini | bailian/qwen3.5-omni-flash-2026-03-15 | https://help.aliyun.com/zh/model-studio/qwen3-5-omni-flash | 官方文档 · 百炼 · qwen3 5 omni flash | 官方文档 · 百炼 · Qwen3.5 Omni Flash |
| mini | bailian/qwen3.5-omni-plus | https://help.aliyun.com/zh/model-studio/qwen3-5-omni-plus | 官方文档 · 百炼 · qwen3 5 omni plus | 官方文档 · 百炼 · Qwen3.5 Omni Plus |
| mini | bailian/qwen3.5-omni-plus-2026-03-15 | https://help.aliyun.com/zh/model-studio/qwen3-5-omni-plus | 官方文档 · 百炼 · qwen3 5 omni plus | 官方文档 · 百炼 · Qwen3.5 Omni Plus |
| mini | bailian/qwen3-max | https://www.aliyun.com/notice/118344 | 下线公告 · aliyun.com · 118344 | 下线公告 · 百炼 · 文档 118344 |
| mini | bailian/qwen3-max-2025-09-23 | https://www.aliyun.com/notice/118345 | 下线公告 · aliyun.com · 118345 | 下线公告 · 百炼 · 文档 118345 |
| mini | bailian/qwen3-max-2026-01-23 | https://www.aliyun.com/notice/118345 | 下线公告 · aliyun.com · 118345 | 下线公告 · 百炼 · 文档 118345 |
| mini | bailian/qwen3-max-preview | https://www.aliyun.com/notice/118344 | 下线公告 · aliyun.com · 118344 | 下线公告 · 百炼 · 文档 118344 |
| mini | bailian/stepfun/step-3.7-flash | https://platform.stepfun.com/docs/zh/guides/models/list | 原厂规格 · stepfun.com · list | 原厂规格 · StepFun · List |
| mini | bailian/vanchin/deepseek-v3.2-think | https://help.aliyun.com/zh/model-studio/deepseek-api-by-vanchin | 官方文档 · 百炼 · deepseek api by vanchin | 官方文档 · 百炼 · DeepSeek API By Vanchin |
| mini | bailian/vanchin/deepseek-v3.1-terminus | https://huggingface.co/deepseek-ai/DeepSeek-V3.1-Terminus | 官方文档 · Hugging Face · DeepSeek V3.1 Terminus | 官方文档 · Hugging Face · DeepSeek-V3.1-Terminus |
| mini | bailian/wan2.7-image | https://help.aliyun.com/zh/model-studio/wan2-7-image | 官方文档 · 百炼 · wan2 7 image | 官方文档 · 百炼 · Wan 2.7 Image |
| mini | bailian/wan2.7-image-pro | https://help.aliyun.com/zh/model-studio/wan2-7-image-pro | 官方文档 · 百炼 · wan2 7 image pro | 官方文档 · 百炼 · Wan 2.7 Image Pro |
| mini | bailian/wan2.6-image | https://help.aliyun.com/zh/model-studio/wan2-6-image | 官方文档 · 百炼 · wan2 6 image | 官方文档 · 百炼 · Wan2.6 Image |
| mini | bailian/wan2.6-t2i | https://help.aliyun.com/zh/model-studio/wan2-6-t2i | 官方文档 · 百炼 · wan2 6 t2i | 官方文档 · 百炼 · Wan2.6 T2i |
| mini | bailian/wan2.2-t2i-flash | https://help.aliyun.com/zh/model-studio/wan2-2-t2i-flash | 官方文档 · 百炼 · wan2 2 t2i flash | 官方文档 · 百炼 · Wan2.2 T2i Flash |
| mini | bailian/wan2.2-t2i-plus | https://help.aliyun.com/zh/model-studio/wan2-2-t2i-plus | 官方文档 · 百炼 · wan2 2 t2i plus | 官方文档 · 百炼 · Wan2.2 T2i Plus |
| mini | bailian/MiniMax/MiniMax-M3.1-Flash | https://help.aliyun.com/zh/model-studio/minimax-m3-1-flash | 官方文档 · 百炼 · minimax m3 1 flash | 官方文档 · 百炼 · MiniMax M3.1 Flash |
| mini | bailian/qwen-max | https://help.aliyun.com/zh/model-studio/text-generation-model | 官方文档 · 百炼 · text generation model | 官方文档 · 百炼 · Text Generation Model |
| mini | bailian/qwen-plus-2025-01-25 | https://help.aliyun.com/zh/model-studio/qwen-plus | 官方文档 · 百炼 · qwen plus | 官方文档 · 百炼 · Qwen Plus |
| mini | bailian/qwen-plus-2025-04-28 | https://help.aliyun.com/zh/model-studio/qwen-plus | 官方文档 · 百炼 · qwen plus | 官方文档 · 百炼 · Qwen Plus |
| mini | bailian/qwen-plus-2025-07-14 | https://help.aliyun.com/zh/model-studio/qwen-plus | 官方文档 · 百炼 · qwen plus | 官方文档 · 百炼 · Qwen Plus |
| mini | bailian/qwen-turbo | https://www.aliyun.com/notice/118177 | 下线公告 · aliyun.com · 118177 | 下线公告 · 百炼 · 文档 118177 |
| mini | bailian/qwen3-coder-next | https://www.aliyun.com/notice/118345 | 下线公告 · aliyun.com · 118345 | 下线公告 · 百炼 · 文档 118345 |
| mini | bailian/unisound/unisound-u2 | https://help.aliyun.com/zh/model-studio/unisound-u2-by-unisound | 官方文档 · 百炼 · unisound u2 by unisound | 官方文档 · 百炼 · Unisound U2 |
| mini | bailian/wanx-v1 | https://help.aliyun.com/zh/model-studio/wanx-v1 | 官方文档 · 百炼 · wanx v1 | 官方文档 · 百炼 · Wanx V1 |
| mini | bailian/wanx2.0-t2i-turbo | https://help.aliyun.com/zh/model-studio/wanx2-0-t2i-turbo | 官方文档 · 百炼 · wanx2 0 t2i turbo | 官方文档 · 百炼 · Wanx2.0 T2i Turbo |
| mini | bailian/wanx2.1-imageedit | https://help.aliyun.com/zh/model-studio/wanx-image-edit-api-reference | 官方文档 · 百炼 · wanx image edit api reference | 官方文档 · 百炼 · Wanx Image Edit API Reference |
| mini | bailian/wanx2.1-t2i-plus | https://help.aliyun.com/zh/model-studio/wanx2-1-t2i-plus | 官方文档 · 百炼 · wanx2 1 t2i plus | 官方文档 · 百炼 · Wanx2.1 T2i Plus |
| mini | bailian/wanx2.1-t2i-turbo | https://help.aliyun.com/zh/model-studio/wanx2-1-t2i-turbo | 官方文档 · 百炼 · wanx2 1 t2i turbo | 官方文档 · 百炼 · Wanx2.1 T2i Turbo |
| mini | bailian/xiaomi/mimo-v2.5-pro | https://mimo.mi.com/docs/zh-CN/updates/deprecate | 下线公告 · mimo.mi.com · deprecate | 下线公告 · MiMo · 模型下线公告 |
| mini | bailian/xiaomi/mimo-v2.5-pro | https://mimo.mi.com/docs/zh-CN/quick-start/summary/model | 原厂规格 · mimo.mi.com · model | 原厂规格 · MiMo · 模型说明 |
| mini | bailian/xiaomi/mimo-v2.6-pro-ultraspeed | https://help.aliyun.com/zh/model-studio/mimo-v2-6-pro-ultraspeed | 官方文档 · 百炼 · mimo v2 6 pro ultraspeed | 官方文档 · 百炼 · MiMo V2.6 Pro UltraSpeed |
| mini | openai/gpt-6.1-sol | https://developers.openai.com/api/docs/models/gpt-6.1-sol | 官方文档 · developers.openai.com · gpt 6.1 sol | 官方文档 · OpenAI · GPT-6.1 Sol |
| mini | openai/gpt-6-luna | https://developers.openai.com/api/docs/models/gpt-6-luna.md | 官方文档 · developers.openai.com · gpt 6 luna.md | 官方文档 · OpenAI · GPT-6 Luna |
| mini | openai/gpt-6-sol | https://developers.openai.com/api/docs/models/gpt-6-sol.md | 官方文档 · developers.openai.com · gpt 6 sol.md | 官方文档 · OpenAI · GPT-6 Sol |
| mini | openai/gpt-image-2.5-flare | https://developers.openai.com/api/docs/models/gpt-image-2.5-flare.md | 官方文档 · developers.openai.com · gpt image 2.5 flare.md | 官方文档 · OpenAI · GPT Image 2.5 Flare（2026-09-08） |
| mini | openai/gpt-image-2.5-flare-2026-09-08 | https://developers.openai.com/api/docs/models/gpt-image-2.5-flare | 官方文档 · developers.openai.com · gpt image 2.5 flare | 官方文档 · OpenAI · GPT Image 2.5 Flare |
| mini | openai/gpt-image-2.5-sunburst | https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst.md | 官方文档 · developers.openai.com · gpt image 2.5 sunburst.md | 官方文档 · OpenAI · GPT Image 2.5 Sunburst（2026-09-08） |
| mini | openai/gpt-image-2.5-sunburst-2026-09-08 | https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst | 官方文档 · developers.openai.com · gpt image 2.5 sunburst | 官方文档 · OpenAI · GPT Image 2.5 Sunburst |
| mini | openai/gpt-6-astra | https://developers.openai.com/api/docs/models/gpt-6-astra.md | 官方文档 · developers.openai.com · gpt 6 astra.md | 官方文档 · OpenAI · GPT-6 Astra |
| mini | openai/gpt-5.6-luna | https://developers.openai.com/api/docs/models/gpt-5.6-luna.md | 官方文档 · developers.openai.com · gpt 5.6 luna.md | 官方文档 · OpenAI · GPT-5.6 Luna |
| mini | openai/gpt-5.6-sol | https://developers.openai.com/api/docs/models/gpt-5.6-sol.md | 官方文档 · developers.openai.com · gpt 5.6 sol.md | 官方文档 · OpenAI · GPT-5.6 Sol |
| mini | openai/gpt-5.6-terra | https://developers.openai.com/api/docs/models/gpt-5.6-terra.md | 官方文档 · developers.openai.com · gpt 5.6 terra.md | 官方文档 · OpenAI · GPT-5.6 Terra |
| mini | openai/gpt-5.5 | https://developers.openai.com/api/docs/models/gpt-5.5.md | 官方文档 · developers.openai.com · gpt 5.5.md | 官方文档 · OpenAI · GPT-5.5（2026-04-23） |
| mini | openai/gpt-5.5-pro | https://developers.openai.com/api/docs/models/gpt-5.5-pro.md | 官方文档 · developers.openai.com · gpt 5.5 pro.md | 官方文档 · OpenAI · GPT-5.5 Pro（2026-04-23） |
| mini | openai/gpt-5.4 | https://developers.openai.com/api/docs/models/gpt-5.4.md | 官方文档 · developers.openai.com · gpt 5.4.md | 官方文档 · OpenAI · GPT-5.4（2026-03-05） |
| mini | openai/gpt-5.4-mini | https://developers.openai.com/api/docs/models/gpt-5.4-mini.md | 官方文档 · developers.openai.com · gpt 5.4 mini.md | 官方文档 · OpenAI · GPT-5.4 Mini（2026-03-17） |
| mini | openai/gpt-5.4-nano | https://developers.openai.com/api/docs/models/gpt-5.4-nano.md | 官方文档 · developers.openai.com · gpt 5.4 nano.md | 官方文档 · OpenAI · GPT-5.4 Nano（2026-03-17） |
| mini | openai/gpt-5.4-pro | https://developers.openai.com/api/docs/models/gpt-5.4-pro.md | 官方文档 · developers.openai.com · gpt 5.4 pro.md | 官方文档 · OpenAI · GPT-5.4 Pro（2026-03-05） |
| mini | openai/gpt-5.3-codex | https://developers.openai.com/api/docs/models/gpt-5.3-codex.md | 官方文档 · developers.openai.com · gpt 5.3 codex.md | 官方文档 · OpenAI · GPT 5.3 Codex |
| mini | openai/gpt-5.2 | https://developers.openai.com/api/docs/models/gpt-5.2.md | 官方文档 · developers.openai.com · gpt 5.2.md | 官方文档 · OpenAI · GPT-5.2（2025-12-11） |
| mini | openai/gpt-5.2-2025-12-11 | https://developers.openai.com/api/docs/models/gpt-5.2 | 官方文档 · developers.openai.com · gpt 5.2 | 官方文档 · OpenAI · GPT 5.2 |
| mini | openai/gpt-5.2-pro | https://developers.openai.com/api/docs/models/gpt-5.2-pro.md | 官方文档 · developers.openai.com · gpt 5.2 pro.md | 官方文档 · OpenAI · GPT 5.2 Pro（2025-12-11） |
| mini | openai/gpt-5.1 | https://developers.openai.com/api/docs/models/gpt-5.1.md | 官方文档 · developers.openai.com · gpt 5.1.md | 官方文档 · OpenAI · GPT-5.1（2025-11-13） |
| mini | openai/gpt-5.1-2025-11-13 | https://developers.openai.com/api/docs/models/gpt-5.1 | 官方文档 · developers.openai.com · gpt 5.1 | 官方文档 · OpenAI · GPT-5.1 |
| mini | openai/gpt-5 | https://developers.openai.com/api/docs/models/gpt-5.md | 官方文档 · developers.openai.com · gpt 5.md | 官方文档 · OpenAI · GPT-5（2025-08-07） |
| mini | openai/gpt-5-2025-08-07 | https://developers.openai.com/api/docs/models/gpt-5 | 官方文档 · developers.openai.com · gpt 5 | 官方文档 · OpenAI · GPT 5 |
| mini | openai/gpt-5-mini | https://developers.openai.com/api/docs/models/gpt-5-mini.md | 官方文档 · developers.openai.com · gpt 5 mini.md | 官方文档 · OpenAI · GPT 5 Mini（2025-08-07） |
| mini | openai/gpt-5-mini-2025-08-07 | https://developers.openai.com/api/docs/models/gpt-5-mini | 官方文档 · developers.openai.com · gpt 5 mini | 官方文档 · OpenAI · GPT 5 Mini |
| mini | openai/gpt-5-nano | https://developers.openai.com/api/docs/models/gpt-5-nano.md | 官方文档 · developers.openai.com · gpt 5 nano.md | 官方文档 · OpenAI · GPT 5 Nano（2025-08-07） |
| mini | openai/gpt-5-nano-2025-08-07 | https://developers.openai.com/api/docs/models/gpt-5-nano | 官方文档 · developers.openai.com · gpt 5 nano | 官方文档 · OpenAI · GPT 5 Nano |
| mini | openai/gpt-5-pro | https://developers.openai.com/api/docs/models/gpt-5-pro.md | 官方文档 · developers.openai.com · gpt 5 pro.md | 官方文档 · OpenAI · GPT 5 Pro（2025-10-06） |
| mini | openai/gpt-5-pro-2025-10-06 | https://developers.openai.com/api/docs/models/gpt-5-pro | 官方文档 · developers.openai.com · gpt 5 pro | 官方文档 · OpenAI · GPT 5 Pro |
| mini | openai/gpt-4.1 | https://developers.openai.com/api/docs/models/gpt-4.1.md | 官方文档 · developers.openai.com · gpt 4.1.md | 官方文档 · OpenAI · GPT-4.1（2025-04-14） |
| mini | openai/gpt-4.1-2025-04-14 | https://developers.openai.com/api/docs/models/gpt-4.1 | 官方文档 · developers.openai.com · gpt 4.1 | 官方文档 · OpenAI · GPT 4.1 |
| mini | openai/gpt-4.1-mini | https://developers.openai.com/api/docs/models/gpt-4.1-mini.md | 官方文档 · developers.openai.com · gpt 4.1 mini.md | 官方文档 · OpenAI · GPT-4.1 Mini（2025-04-14） |
| mini | openai/gpt-4.1-mini-2025-04-14 | https://developers.openai.com/api/docs/models/gpt-4.1-mini | 官方文档 · developers.openai.com · gpt 4.1 mini | 官方文档 · OpenAI · GPT-4.1 Mini |
| mini | openai/gpt-4.1-nano | https://developers.openai.com/api/docs/models/gpt-4.1-nano.md | 官方文档 · developers.openai.com · gpt 4.1 nano.md | 官方文档 · OpenAI · GPT 4.1 Nano（2025-04-14） |
| mini | openai/gpt-4.1-nano-2025-04-14 | https://developers.openai.com/api/docs/models/gpt-4.1-nano | 官方文档 · developers.openai.com · gpt 4.1 nano | 官方文档 · OpenAI · GPT 4.1 Nano |
| mini | openai/gpt-4o | https://developers.openai.com/api/docs/models/gpt-4o.md | 官方文档 · developers.openai.com · gpt 4o.md | 官方文档 · OpenAI · GPT-4o（2024-08-06） |
| mini | openai/gpt-4o-2024-05-13 | https://developers.openai.com/api/docs/models/gpt-4o | 官方文档 · developers.openai.com · gpt 4o | 官方文档 · OpenAI · GPT 4o |
| mini | openai/gpt-4o-2024-08-06 | https://developers.openai.com/api/docs/models/gpt-4o | 官方文档 · developers.openai.com · gpt 4o | 官方文档 · OpenAI · GPT 4o |
| mini | openai/gpt-4o-2024-11-20 | https://developers.openai.com/api/docs/models/gpt-4o | 官方文档 · developers.openai.com · gpt 4o | 官方文档 · OpenAI · GPT 4o |
| mini | openai/gpt-4o-mini | https://developers.openai.com/api/docs/models/gpt-4o-mini.md | 官方文档 · developers.openai.com · gpt 4o mini.md | 官方文档 · OpenAI · GPT 4o Mini（2024-07-18） |
| mini | openai/gpt-4o-mini-2024-07-18 | https://developers.openai.com/api/docs/models/gpt-4o-mini | 官方文档 · developers.openai.com · gpt 4o mini | 官方文档 · OpenAI · GPT 4o Mini |
| mini | openai/gpt-4-turbo | https://developers.openai.com/api/docs/models/gpt-4-turbo.md | 官方文档 · developers.openai.com · gpt 4 turbo.md | 官方文档 · OpenAI · GPT 4 Turbo（2024-04-09） |
| mini | openai/gpt-4-turbo-2024-04-09 | https://developers.openai.com/api/docs/models/gpt-4-turbo | 官方文档 · developers.openai.com · gpt 4 turbo | 官方文档 · OpenAI · GPT 4 Turbo |
| mini | openai/gpt-4 | https://developers.openai.com/api/docs/models/gpt-4.md | 官方文档 · developers.openai.com · gpt 4.md | 官方文档 · OpenAI · GPT-4（0613） |
| mini | openai/gpt-4-0613 | https://developers.openai.com/api/docs/models/gpt-4 | 官方文档 · developers.openai.com · gpt 4 | 官方文档 · OpenAI · GPT 4 |
| mini | openai/gpt-4-1106-preview | https://developers.openai.com/api/docs/models/gpt-4-turbo-preview | 官方文档 · developers.openai.com · gpt 4 turbo preview | 官方文档 · OpenAI · GPT 4 Turbo Preview |
| mini | openai/gpt-image-2 | https://developers.openai.com/api/docs/models/gpt-image-2.md | 官方文档 · developers.openai.com · gpt image 2.md | 官方文档 · OpenAI · GPT Image 2（2026-04-21） |
| mini | openai/gpt-image-1.5 | https://developers.openai.com/api/docs/models/gpt-image-1.5.md | 官方文档 · developers.openai.com · gpt image 1.5.md | 官方文档 · OpenAI · GPT Image 1.5（2025-12-16） |
| mini | openai/gpt-image-1 | https://developers.openai.com/api/docs/models/gpt-image-1.md | 官方文档 · developers.openai.com · gpt image 1.md | 官方文档 · OpenAI · GPT Image 1 |
| mini | openai/gpt-image-1-mini | https://developers.openai.com/api/docs/models/gpt-image-1-mini.md | 官方文档 · developers.openai.com · gpt image 1 mini.md | 官方文档 · OpenAI · GPT Image 1 Mini |
| mini | openai/chat-latest | https://developers.openai.com/api/docs/models/chat-latest.md | 官方文档 · developers.openai.com · chat latest.md | 官方文档 · OpenAI · Chat Latest |
| mini | openai/chatgpt-image-latest | https://developers.openai.com/api/docs/models/chatgpt-image-latest.md | 官方文档 · developers.openai.com · chatgpt image latest.md | 官方文档 · OpenAI · ChatGPT Image Latest |
| mini | openai/gpt-3.5-turbo | https://developers.openai.com/api/docs/models/gpt-3.5-turbo.md | 官方文档 · developers.openai.com · gpt 3.5 turbo.md | 官方文档 · OpenAI · GPT 3.5 Turbo（0125） |
| mini | openai/gpt-3.5-turbo-0125 | https://developers.openai.com/api/docs/models/gpt-3.5-turbo | 官方文档 · developers.openai.com · gpt 3.5 turbo | 官方文档 · OpenAI · GPT 3.5 Turbo |
| mini | openai/gpt-3.5-turbo-1106 | https://developers.openai.com/api/docs/models/gpt-3.5-turbo | 官方文档 · developers.openai.com · gpt 3.5 turbo | 官方文档 · OpenAI · GPT 3.5 Turbo |
| mini | openai/gpt-image-2.6-flare | https://developers.openai.com/api/docs/models/gpt-image-2.6-flare | 官方文档 · developers.openai.com · gpt image 2.6 flare | 官方文档 · OpenAI · GPT Image 2.6 Flare |
| mini | openai/gpt-image-2.6-sunburst | https://developers.openai.com/api/docs/models/gpt-image-2.6-sunburst | 官方文档 · developers.openai.com · gpt image 2.6 sunburst | 官方文档 · OpenAI · GPT Image 2.6 Sunburst |
| mini | openai/o1 | https://developers.openai.com/api/docs/models/o1.md | 官方文档 · developers.openai.com · o1.md | 官方文档 · OpenAI · O1（2024-12-17） |
| mini | openai/o1-2024-12-17 | https://developers.openai.com/api/docs/models/o1 | 官方文档 · developers.openai.com · o1 | 官方文档 · OpenAI · O1 |
| mini | openai/o1-pro | https://developers.openai.com/api/docs/models/o1-pro.md | 官方文档 · developers.openai.com · o1 pro.md | 官方文档 · OpenAI · O1 Pro（2025-03-19） |
| mini | openai/o1-pro-2025-03-19 | https://developers.openai.com/api/docs/models/o1-pro | 官方文档 · developers.openai.com · o1 pro | 官方文档 · OpenAI · O1 Pro |
| mini | openai/o3 | https://developers.openai.com/api/docs/models/o3.md | 官方文档 · developers.openai.com · o3.md | 官方文档 · OpenAI · O3（2025-04-16） |
| mini | openai/o3-2025-04-16 | https://developers.openai.com/api/docs/models/o3 | 官方文档 · developers.openai.com · o3 | 官方文档 · OpenAI · O3 |
| mini | openai/o3-mini | https://developers.openai.com/api/docs/models/o3-mini.md | 官方文档 · developers.openai.com · o3 mini.md | 官方文档 · OpenAI · O3 Mini（2025-01-31） |
| mini | openai/o3-mini-2025-01-31 | https://developers.openai.com/api/docs/models/o3-mini | 官方文档 · developers.openai.com · o3 mini | 官方文档 · OpenAI · O3 Mini |
| mini | openai/o3-pro | https://developers.openai.com/api/docs/models/o3-pro.md | 官方文档 · developers.openai.com · o3 pro.md | 官方文档 · OpenAI · O3 Pro（2025-06-10） |
| mini | openai/o3-pro-2025-06-10 | https://developers.openai.com/api/docs/models/o3-pro | 官方文档 · developers.openai.com · o3 pro | 官方文档 · OpenAI · O3 Pro |
| mini | openai/o4-mini | https://developers.openai.com/api/docs/models/o4-mini.md | 官方文档 · developers.openai.com · o4 mini.md | 官方文档 · OpenAI · O4 Mini（2025-04-16） |
| mini | openai/o4-mini-2025-04-16 | https://developers.openai.com/api/docs/models/o4-mini | 官方文档 · developers.openai.com · o4 mini | 官方文档 · OpenAI · O4 Mini |
| mini | ark/deepseek-v4-1-flash-260910 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 | 官方文档 · 火山方舟 · 文档 1330310 |
| mini | ark/deepseek-v4-1-flash-261017 | https://docs.volcengine.com/docs/ark/model-release-announcement?lang=zh | 官方文档 · volcengine.com · model release announcement | 官方文档 · 火山方舟 · Model Release Announcement |
| mini | ark/deepseek-v4-1-flash-economy-261017 | https://docs.volcengine.com/docs/ark/model-release-announcement?lang=zh | 官方文档 · volcengine.com · model release announcement | 官方文档 · 火山方舟 · Model Release Announcement |
| mini | ark/deepseek-v4-flash-260425 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 | 官方文档 · 火山方舟 · 文档 1330310 |
| mini | ark/deepseek-v4-flash-ga-260731 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 | 官方文档 · 火山方舟 · 文档 1330310 |
| mini | ark/deepseek-v4-pro-260425 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 | 官方文档 · 火山方舟 · 文档 1330310 |
| mini | ark/deepseek-v4-pro-ga-260813 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 | 官方文档 · 火山方舟 · 文档 1330310 |
| mini | ark/doubao-seed-2-1-pro-260628 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 | 官方文档 · 火山方舟 · 文档 1330310 |
| mini | ark/doubao-seed-2-1-pro-260915 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 | 官方文档 · 火山方舟 · 文档 1330310 |
| mini | ark/doubao-seed-2-1-turbo-260628 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 | 官方文档 · 火山方舟 · 文档 1330310 |
| mini | ark/doubao-seed-2-0-code-preview-260215 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 | 官方文档 · 火山方舟 · 文档 1330310 |
| mini | ark/doubao-seed-2-0-lite-260215 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 | 官方文档 · 火山方舟 · 文档 1330310 |
| mini | ark/doubao-seed-2-0-lite-260428 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 | 官方文档 · 火山方舟 · 文档 1330310 |
| mini | ark/doubao-seed-2-0-mini-260215 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 | 官方文档 · 火山方舟 · 文档 1330310 |
| mini | ark/doubao-seed-2-0-mini-260428 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 | 官方文档 · 火山方舟 · 文档 1330310 |
| mini | ark/doubao-seed-2-0-pro-260215 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 | 官方文档 · 火山方舟 · 文档 1330310 |
| mini | ark/doubao-seed-1-8-251228 | https://docs.volcengine.com/docs/ark/bytedance-seed-1-8?lang=zh | 官方文档 · volcengine.com · bytedance seed 1 8 | 官方文档 · 火山方舟 · Bytedance Seed 1-8 |
| mini | ark/doubao-seed-1-6-250615 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 | 官方文档 · 火山方舟 · 文档 1330310 |
| mini | ark/doubao-seed-1-6-251015 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 | 官方文档 · 火山方舟 · 文档 1330310 |
| mini | ark/doubao-seed-1-6-flash-250615 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 | 官方文档 · 火山方舟 · 文档 1330310 |
| mini | ark/doubao-seed-1-6-flash-250828 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 | 官方文档 · 火山方舟 · 文档 1330310 |
| mini | ark/doubao-seed-1-6-vision-250815 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 | 官方文档 · 火山方舟 · 文档 1330310 |
| mini | ark/doubao-1-5-lite-32k-250115 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 | 官方文档 · 火山方舟 · 文档 1330310 |
| mini | ark/doubao-1-5-pro-32k-250115 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 | 官方文档 · 火山方舟 · 文档 1330310 |
| mini | ark/doubao-1-5-vision-pro-32k-250115 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 | 官方文档 · 火山方舟 · 文档 1330310 |
| mini | ark/doubao-seedream-5-0-260128 | https://docs.volcengine.com/docs/ark/seedream-4-0-5-0?lang=zh | 官方文档 · volcengine.com · seedream 4 0 5 0 | 官方文档 · 火山方舟 · Seedream 4-0-5-0 |
| mini | ark/doubao-seedream-5-0-flash-260915 | https://docs.volcengine.com/docs/ark/seedream-4-0-5-0?lang=zh | 官方文档 · volcengine.com · seedream 4 0 5 0 | 官方文档 · 火山方舟 · Seedream 4-0-5-0 |
| mini | ark/doubao-seedream-5-0-pro-260628 | https://docs.volcengine.com/docs/ark/seedream-4-0-5-0?lang=zh | 官方文档 · volcengine.com · seedream 4 0 5 0 | 官方文档 · 火山方舟 · Seedream 4-0-5-0 |
| mini | ark/doubao-seedream-4-5-251128 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 | 官方文档 · 火山方舟 · 文档 1330310 |
| mini | ark/doubao-seedream-4-0-250828 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 | 官方文档 · 火山方舟 · 文档 1330310 |
| mini | ark/glm-5-3-flash-260828 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 | 官方文档 · 火山方舟 · 文档 1330310 |
| mini | ark/glm-5-2-260617 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 | 官方文档 · 火山方舟 · 文档 1330310 |
| mini | ark/kimi-k3-1-pro-261024 | https://docs.volcengine.com/docs/ark/model-release-announcement?lang=zh | 官方文档 · volcengine.com · model release announcement | 官方文档 · 火山方舟 · Model Release Announcement |
| mini | ark/doubao-seed-code-preview-251028 | https://docs.volcengine.com/docs/ark/model-release-announcement-2025?lang=en | 官方文档 · volcengine.com · model release announcement 2025 | 官方文档 · 火山方舟 · Model Release Announcement 2025 |
| mini | ark/doubao-seed-evolving | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 | 官方文档 · 火山方舟 · 文档 1330310 |
| mini | ark/glm-4-7-251222 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · volcengine.com · 1330310 | 官方文档 · 火山方舟 · 文档 1330310 |
| mini | bfl/flux-2-flex | https://docs.bfl.ml/api-reference/models/generate-or-edit-an-image-with-flux2-[flex] | 官方文档 · bfl.ml · generate or edit an image with flux2 [flex] | 官方文档 · BFL · FLUX 2 Flex |
| mini | bfl/flux-2-klein-4b | https://docs.bfl.ml/api-reference/models/generate-or-edit-an-image-with-flux2-[klein]-4b | 官方文档 · bfl.ml · generate or edit an image with flux2 [klein] 4b | 官方文档 · BFL · FLUX 2 Klein 4b |
| mini | bfl/flux-2-klein-9b | https://docs.bfl.ml/api-reference/models/generate-or-edit-an-image-with-flux2-[klein]-9b | 官方文档 · bfl.ml · generate or edit an image with flux2 [klein] 9b | 官方文档 · BFL · FLUX 2 Klein 9b |
| mini | bfl/flux-2-klein-9b-preview | https://docs.bfl.ml/api-reference/models/generate-or-edit-an-image-with-flux2-[klein]-9b-preview | 官方文档 · bfl.ml · generate or edit an image with flux2 [klein] 9b preview | 官方文档 · BFL · FLUX 2 Klein 9b Preview |
| mini | bfl/flux-2-max | https://docs.bfl.ml/api-reference/models/generate-or-edit-an-image-with-flux2-[max] | 官方文档 · bfl.ml · generate or edit an image with flux2 [max] | 官方文档 · BFL · FLUX 2 Max |
| mini | bfl/flux-2-pro | https://docs.bfl.ml/api-reference/models/generate-or-edit-an-image-with-flux2-[pro] | 官方文档 · bfl.ml · generate or edit an image with flux2 [pro] | 官方文档 · BFL · FLUX 2 Pro |
| mini | bfl/flux-2-pro-preview | https://docs.bfl.ml/api-reference/models/generate-or-edit-an-image-with-flux2-[pro]-preview | 官方文档 · bfl.ml · generate or edit an image with flux2 [pro] preview | 官方文档 · BFL · FLUX 2 Pro Preview |
| mini | bfl/flux-kontext-max | https://docs.bfl.ml/api-reference/models/edit-or-create-an-image-with-flux1-kontext-[max] | 官方文档 · bfl.ml · edit or create an image with flux1 kontext [max] | 官方文档 · BFL · Edit Or Create An Image With FLUX.1 Kontext [max] |
| mini | bfl/flux-kontext-pro | https://docs.bfl.ml/api-reference/models/edit-or-create-an-image-with-flux1-kontext-[pro] | 官方文档 · bfl.ml · edit or create an image with flux1 kontext [pro] | 官方文档 · BFL · Edit Or Create An Image With FLUX.1 Kontext [pro] |
| mini | bfl/flux-3-image | https://docs.bfl.ml/api-reference/utility/generate-an-image-with-flux-3 | 官方文档 · bfl.ml · generate an image with flux 3 | 官方文档 · BFL · Generate An Image With FLUX 3 |
| mini | bfl/flux-3-image-klein | https://docs.bfl.ml/api-reference/utility/generate-an-image-with-flux-3-klein | 官方文档 · bfl.ml · generate an image with flux 3 klein | 官方文档 · BFL · Generate An Image With FLUX.3 Klein |
| mini | bfl/flux-dev | https://docs.bfl.ml/api-reference/models/generate-an-image-with-flux1-[dev] | 官方文档 · bfl.ml · generate an image with flux1 [dev] | 官方文档 · BFL · Generate An Image With FLUX.1 [dev] |
| mini | bfl/flux-pro-1.1 | https://docs.bfl.ml/api-reference/models/generate-an-image-with-flux11-[pro] | 官方文档 · bfl.ml · generate an image with flux11 [pro] | 官方文档 · BFL · Generate An Image With FLUX.1.1 [pro] |
| mini | bfl/flux-pro-1.1-ultra | https://docs.bfl.ml/api-reference/models/generate-an-image-with-flux11-[pro]-ultra-mode | 官方文档 · bfl.ml · generate an image with flux11 [pro] ultra mode | 官方文档 · BFL · Generate An Image With FLUX.1.1 [pro] Ultra Mode |
| mini | stability/sd3.5-flash | https://platform.stability.ai/docs/api-reference#tag/Generate/paths/~1v2beta~1stable-image~1generate~1sd3/post | 官方文档 · stability.ai · api reference | 官方文档 · Stability · API 文档 |
| mini | stability/sd3.5-large | https://platform.stability.ai/docs/api-reference#tag/Generate/paths/~1v2beta~1stable-image~1generate~1sd3/post | 官方文档 · stability.ai · api reference | 官方文档 · Stability · API 文档 |
| mini | stability/sd3.5-large-turbo | https://platform.stability.ai/docs/api-reference#tag/Generate/paths/~1v2beta~1stable-image~1generate~1sd3/post | 官方文档 · stability.ai · api reference | 官方文档 · Stability · API 文档 |
| mini | stability/sd3.5-medium | https://platform.stability.ai/docs/api-reference#tag/Generate/paths/~1v2beta~1stable-image~1generate~1sd3/post | 官方文档 · stability.ai · api reference | 官方文档 · Stability · API 文档 |
| mini | stability/stable-image-core | https://platform.stability.ai/docs/api-reference#tag/Generate/paths/~1v2beta~1stable-image~1generate~1core/post | 官方文档 · stability.ai · api reference | 官方文档 · Stability · API 文档 |
| mini | stability/stable-image-ultra | https://platform.stability.ai/docs/api-reference#tag/Generate/paths/~1v2beta~1stable-image~1generate~1ultra/post | 官方文档 · stability.ai · api reference | 官方文档 · Stability · API 文档 |
| mini | ideogram/ideogram-v4 | https://developer.ideogram.ai/v2/api-reference/images/generate/ideogram-4 | 官方文档 · developer.ideogram.ai · ideogram 4 | 官方文档 · Ideogram · Ideogram 4 |
| mini | ideogram/ideogram-v4-transparent | https://developer.ideogram.ai/v2/api-reference/images/generate/ideogram-4-transparent | 官方文档 · developer.ideogram.ai · ideogram 4 transparent | 官方文档 · Ideogram · Ideogram 4 Transparent |
| mini | ideogram/ideogram-v3 | https://developer.ideogram.ai/v2/api-reference/images/generate/ideogram-3 | 官方文档 · developer.ideogram.ai · ideogram 3 | 官方文档 · Ideogram · Ideogram 3 |
| mini | ideogram/ideogram-v3-transparent | https://developer.ideogram.ai/v2/api-reference/images/generate/ideogram-3-transparent | 官方文档 · developer.ideogram.ai · ideogram 3 transparent | 官方文档 · Ideogram · Ideogram 3 Transparent |
| mini | ideogram/V_2A | https://developer.ideogram.ai/v1/api-reference/legacy-endpoints/generate | 官方文档 · developer.ideogram.ai · generate | 官方文档 · Ideogram · Generate |
| mini | ideogram/V_2A_TURBO | https://developer.ideogram.ai/v1/api-reference/legacy-endpoints/generate | 官方文档 · developer.ideogram.ai · generate | 官方文档 · Ideogram · Generate |
| mini | ideogram/V_2 | https://developer.ideogram.ai/v1/api-reference/legacy-endpoints/generate | 官方文档 · developer.ideogram.ai · generate | 官方文档 · Ideogram · Generate |
| mini | ideogram/V_2_TURBO | https://developer.ideogram.ai/v1/api-reference/legacy-endpoints/generate | 官方文档 · developer.ideogram.ai · generate | 官方文档 · Ideogram · Generate |
| mini | ideogram/V_1 | https://developer.ideogram.ai/v1/api-reference/legacy-endpoints/generate | 官方文档 · developer.ideogram.ai · generate | 官方文档 · Ideogram · Generate |
| mini | ideogram/V_1_TURBO | https://developer.ideogram.ai/v1/api-reference/legacy-endpoints/generate | 官方文档 · developer.ideogram.ai · generate | 官方文档 · Ideogram · Generate |
| mini | ideogram/AUTO | https://developer.ideogram.ai/v1/api-reference/legacy-endpoints/generate | 官方文档 · developer.ideogram.ai · generate | 官方文档 · Ideogram · Generate |
| mini | ideogram/ideogram-4-5 | https://developer.ideogram.ai/v2/api-reference/images/generate/ideogram-4-5 | 官方文档 · developer.ideogram.ai · ideogram 4 5 | 官方文档 · Ideogram · Ideogram 4.5 |
| mini | ideogram/ideogram-edit | https://developer.ideogram.ai/v2/api-reference/images/precise-edit/ideogram-4-5 | 官方文档 · developer.ideogram.ai · ideogram 4 5 | 官方文档 · Ideogram · Ideogram 4.5 |
| mini | ideogram/p-image-ideogram | https://developer.ideogram.ai/v2/api-reference/images/generate/p-image-ideogram | 官方文档 · developer.ideogram.ai · p image ideogram | 官方文档 · Ideogram · P Image Ideogram |
| mini | minimax/MiniMax-M2.7-highspeed | https://platform.minimax.cn/docs/api-reference/text-anthropic-api | 官方文档 · minimax.cn · text anthropic api | 官方文档 · MiniMax · Text Anthropic API |
| mini | minimax/MiniMax-M2.5-highspeed | https://platform.minimax.cn/docs/api-reference/text-anthropic-api | 官方文档 · minimax.cn · text anthropic api | 官方文档 · MiniMax · Text Anthropic API |
| mini | minimax/MiniMax-M2.1-highspeed | https://platform.minimax.cn/docs/api-reference/text-anthropic-api | 官方文档 · minimax.cn · text anthropic api | 官方文档 · MiniMax · Text Anthropic API |
| mini | minimax/MiniMax-M3.1-Flash | https://platform.minimax.io/docs/guides/text-generation | 官方文档 · minimax.io · text generation | 官方文档 · MiniMax · Text Generation |
| mini | minimax/image-01 | https://platform.minimax.io/docs/api-reference/image-generation-t2i | 官方文档 · minimax.io · image generation t2i | 官方文档 · MiniMax · Image Generation T2i |
| mini | minimax/image-01-live | https://platform.minimax.cn/docs/api-reference/image-generation-t2i | 官方文档 · minimax.cn · image generation t2i | 官方文档 · MiniMax · Image Generation T2i |
| mini | mistral/mistral-large-4 | https://docs.mistral.ai/models/mistral-large-4-0 | 官方文档 · mistral.ai · mistral large 4 0 | 官方文档 · Mistral · Mistral Large 4-0 |
| mini | mistral/zai-glm-5-3 | https://docs.mistral.ai/models/zai-glm-5-3 | 官方文档 · mistral.ai · zai glm 5 3 | 官方文档 · Mistral · Zai GLM 5-3 |
| mini | mistral/mistral-medium-3-5 | https://docs.mistral.ai/models/mistral-medium-3-5-26-04 | 官方文档 · mistral.ai · mistral medium 3 5 26 04 | 官方文档 · Mistral · Mistral Medium 3-5-26-04 |
| mini | mistral/mistral-medium-3 | https://docs.mistral.ai/models/mistral-medium-3-5-26-04 | 官方文档 · mistral.ai · mistral medium 3 5 26 04 | 官方文档 · Mistral · Mistral Medium 3-5-26-04 |
| mini | mistral/zai-glm-5-3-flash | https://docs.mistral.ai/models/zai-glm-5-3-flash | 官方文档 · mistral.ai · zai glm 5 3 flash | 官方文档 · Mistral · GLM 5.3 Flash |
| mini | mistral/zai-glm-5-2 | https://docs.mistral.ai/models/zai-glm-5-2 | 官方文档 · mistral.ai · zai glm 5 2 | 官方文档 · Mistral · Zai GLM 5-2 |
| mini | mistral/codestral-2508 | https://docs.mistral.ai/models/codestral-25-08 | 官方文档 · mistral.ai · codestral 25 08 | 官方文档 · Mistral · Codestral 2508 |
| mini | mistral/codestral-latest | https://docs.mistral.ai/models/codestral-25-08 | 官方文档 · mistral.ai · codestral 25 08 | 官方文档 · Mistral · Codestral（2508） |
| mini | mistral/labs-leanstral-1-5 | https://docs.mistral.ai/models/leanstral-1-5 | 官方文档 · mistral.ai · leanstral 1 5 | 官方文档 · Mistral · Leanstral 1-5 |
| mini | mistral/ministral-14b-2512 | https://docs.mistral.ai/models/ministral-3-14b-25-12 | 官方文档 · mistral.ai · ministral 3 14b 25 12 | 官方文档 · Mistral · Ministral 3-14b 25-12 |
| mini | mistral/ministral-14b-latest | https://docs.mistral.ai/models/ministral-3-14b-25-12 | 官方文档 · mistral.ai · ministral 3 14b 25 12 | 官方文档 · Mistral · Ministral 3-14b 25-12 |
| mini | mistral/ministral-3b-2512 | https://docs.mistral.ai/models/ministral-3-3b-25-12 | 官方文档 · mistral.ai · ministral 3 3b 25 12 | 官方文档 · Mistral · Ministral 3-3b 25-12 |
| mini | mistral/ministral-3b-latest | https://docs.mistral.ai/models/ministral-3-3b-25-12 | 官方文档 · mistral.ai · ministral 3 3b 25 12 | 官方文档 · Mistral · Ministral 3-3b 25-12 |
| mini | mistral/ministral-8b-2512 | https://docs.mistral.ai/models/ministral-3-8b-25-12 | 官方文档 · mistral.ai · ministral 3 8b 25 12 | 官方文档 · Mistral · Ministral 3-8b 25-12 |
| mini | mistral/ministral-8b-latest | https://docs.mistral.ai/models/ministral-3-8b-25-12 | 官方文档 · mistral.ai · ministral 3 8b 25 12 | 官方文档 · Mistral · Ministral 3-8b 25-12 |
| mini | mistral/mistral-large-2512 | https://docs.mistral.ai/models/mistral-large-3-25-12 | 官方文档 · mistral.ai · mistral large 3 25 12 | 官方文档 · Mistral · Mistral Large 3-25-12 |
| mini | mistral/mistral-medium-latest | https://docs.mistral.ai/models/mistral-medium-3-5-26-04 | 官方文档 · mistral.ai · mistral medium 3 5 26 04 | 官方文档 · Mistral · Mistral Medium 3-5-26-04 |
| mini | mistral/mistral-small-2603 | https://docs.mistral.ai/models/mistral-small-4-0-26-03 | 官方文档 · mistral.ai · mistral small 4 0 26 03 | 官方文档 · Mistral · Mistral Small 4-0-26-03 |
| mini | together/ByteDance/Seedream-5.0-lite | https://docs.volcengine.com/docs/ark/seedream-4-0-5-0?lang=zh | 官方文档 · volcengine.com · seedream 4 0 5 0 | 官方文档 · 火山方舟 · Seedream 4-0-5-0 |
| mini | together/MiniMaxAI/MiniMax-M3 | https://huggingface.co/MiniMaxAI/MiniMax-M3 | 官方文档 · Hugging Face · MiniMax M3 | 官方文档 · Hugging Face · Minimax M3 |
| mini | together/Qwen/Qwen-Image-2.0 | https://help.aliyun.com/zh/model-studio/qwen-image-2-0 | 官方文档 · 百炼 · qwen image 2 0 | 官方文档 · 百炼 · Qwen Image 2.0 |
| mini | together/Qwen/Qwen-Image-2.0-Pro | https://help.aliyun.com/zh/model-studio/qwen-image-2-0-pro | 官方文档 · 百炼 · qwen image 2 0 pro | 官方文档 · 百炼 · Qwen Image 2.0 Pro |
| mini | together/Qwen/Qwen3.8-Flash | https://help.aliyun.com/zh/model-studio/vision-model | 官方文档 · 百炼 · vision model | 官方文档 · 百炼 · Vision Model |
| mini | together/Wan-AI/Wan2.6-image | https://help.aliyun.com/zh/model-studio/wan2-6-image | 官方文档 · 百炼 · wan2 6 image | 官方文档 · 百炼 · Wan 2.6 Image |
| mini | together/black-forest-labs/FLUX.2-dev | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| mini | together/black-forest-labs/FLUX.2-flex | https://docs.bfl.ml/api-reference/models/generate-or-edit-an-image-with-flux2-[flex] | 官方文档 · bfl.ml · generate or edit an image with flux2 [flex] | 官方文档 · BFL · FLUX.2 \[flex] |
| mini | together/black-forest-labs/FLUX.2-max | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| mini | together/black-forest-labs/FLUX.2-pro | https://docs.bfl.ml/api-reference/models/generate-or-edit-an-image-with-flux2-[pro] | 官方文档 · bfl.ml · generate or edit an image with flux2 [pro] | 官方文档 · BFL · FLUX.2 \[pro] |
| mini | together/deepseek-ai/DeepSeek-V4.1-Flash | https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash | 官方文档 · Hugging Face · DeepSeek V4.1 Flash | 官方文档 · Hugging Face · DeepSeek-V4.1-Flash |
| mini | together/deepseek-ai/DeepSeek-V4.1-Flash-1017 | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| mini | together/deepseek-ai/DeepSeek-V4-Pro-0813 | https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro-0813 | 官方文档 · Hugging Face · DeepSeek V4 Pro 0813 | 官方文档 · Hugging Face · DeepSeek-V4-Pro-0813 |
| mini | together/deepseek-ai/DeepSeek-V4-Flash-0731 | https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731 | 官方文档 · Hugging Face · DeepSeek V4 Flash 0731 | 官方文档 · Hugging Face · DeepSeek-V4-Flash-0731 |
| mini | together/google/gemini-3-pro-image | https://ai.google.dev/gemini-api/docs/models/gemini-3-pro-image | 官方文档 · ai.google.dev · gemini 3 pro image | 官方文档 · Google · Gemini 3 Pro Image |
| mini | together/openai/gpt-image-2 | https://developers.openai.com/api/docs/models/gpt-image-2.md | 原厂规格 · developers.openai.com · gpt image 2.md | 原厂规格 · OpenAI · GPT Image 2 |
| mini | together/openai/gpt-image-1.5 | https://developers.openai.com/api/docs/models/gpt-image-1.5.md | 原厂规格 · developers.openai.com · gpt image 1.5.md | 原厂规格 · OpenAI · GPT Image 1.5 |
| mini | together/stabilityai/stable-diffusion-xl-base-1.0 | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| mini | together/zai-org/GLM-5.3 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.3 | 官方文档 · bigmodel.cn · glm 5.3 | 官方文档 · 智谱 · GLM-5.3 |
| mini | together/zai-org/GLM-5.3-Flash | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5.3-flash | 官方文档 · bigmodel.cn · glm 5.3 flash | 官方文档 · 智谱 · GLM-5.3 Flash |
| mini | together/zai-org/GLM-5.2 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.2 | 官方文档 · bigmodel.cn · glm 5.2 | 官方文档 · 智谱 · GLM-5.2 |
| mini | together/ByteDance-Seed/Seedream-3.0 | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| mini | together/ByteDance-Seed/Seedream-4.0 | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| mini | together/MiniMaxAI/MiniMax-M3.1-Flash | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| mini | together/Prism-ML/Ternary-Bonsai-27B | https://huggingface.co/prism-ml/Ternary-Bonsai-27B-gguf | 官方文档 · Hugging Face · Ternary Bonsai 27B gguf | 官方文档 · Hugging Face · Ternary Bonsai 27B Gguf |
| mini | together/RunDiffusion/Juggernaut-pro-flux | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| mini | together/Rundiffusion/Juggernaut-Lightning-Flux | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| mini | together/black-forest-labs/FLUX.1-kontext-max | https://docs.bfl.ml/api-reference/models/edit-or-create-an-image-with-flux1-kontext-[max] | 官方文档 · bfl.ml · edit or create an image with flux1 kontext [max] | 官方文档 · BFL · Flux.1 Kontext \[max] |
| mini | together/black-forest-labs/FLUX.1-kontext-pro | https://docs.bfl.ml/api-reference/models/edit-or-create-an-image-with-flux1-kontext-[pro] | 官方文档 · bfl.ml · edit or create an image with flux1 kontext [pro] | 官方文档 · BFL · Flux.1 Kontext \[pro] |
| mini | together/black-forest-labs/FLUX.1.1-pro | https://docs.bfl.ml/api-reference/models/generate-an-image-with-flux11-[pro] | 官方文档 · bfl.ml · generate an image with flux11 [pro] | 官方文档 · BFL · Flux1.1 \[pro] |
| mini | together/google/flash-image-2.5 | https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-image | 官方文档 · ai.google.dev · gemini 2.5 flash image | 官方文档 · Google · Gemini 2.5 Flash Image |
| mini | together/google/flash-image-3.1 | https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-image | 官方文档 · ai.google.dev · gemini 3.1 flash image | 官方文档 · Google · Gemini 3.1 Flash Image |
| mini | together/google/flash-image-3.1-lite | https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite-image | 官方文档 · ai.google.dev · gemini 3.1 flash lite image | 官方文档 · Google · Gemini 3.1 Flash Lite Image |
| mini | together/google/imagen-4.0-fast | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| mini | together/google/imagen-4.0-preview | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| mini | together/google/imagen-4.0-ultra | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| mini | together/ideogram/ideogram-3.0 | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| mini | together/ideogram/ideogram-4.0 | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| mini | together/meta-llama/Llama-3.3-70B-Instruct-Turbo | https://www.together.ai/models/llama-3-3-70b | 官方文档 · together.ai · llama 3 3 70b | 官方文档 · Together · Llama 3.3 70B |
| mini | together/meta-models/Muse-Glimmer-30B | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| mini | together/meta-models/Muse-Spark-Open-816B-A42B | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| mini | together/nvidia/NVIDIA-Nemotron-3.5-Super-VL | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| mini | together/openai/gpt-oss-120b | https://developers.openai.com/api/docs/models/gpt-oss-120b | 官方文档 · developers.openai.com · gpt oss 120b | 官方文档 · OpenAI · GPT-OSS 120B |
| mini | together/prunaai/p-image-ideogram | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| mini | together/reflection/Beam-1.0-501B-A23B | https://docs.together.ai/docs/serverless/models | 官方文档 · together.ai · 模型列表 | 官方文档 · Together · 模型列表 |
| mini | together/thinkingmachines/Inkling | https://docs.together.ai/docs/serverless-models | 官方文档 · together.ai · serverless models | 官方文档 · Together · Serverless Models |
| mini | fireworks/accounts/fireworks/models/glm-5p3 | https://fireworks.ai/models/fireworks/glm-5p3 | 官方文档 · fireworks.ai · glm 5p3 | 官方文档 · Fireworks · GLM 5.3 |
| mini | fireworks/accounts/fireworks/models/glm-5p3-flash | https://fireworks.ai/models/fireworks/glm-5p3-flash | 官方文档 · fireworks.ai · glm 5p3 flash | 官方文档 · Fireworks · GLM 5.3 Flash |
| mini | fireworks/accounts/fireworks/models/kimi-k3 | https://fireworks.ai/models/fireworks/kimi-k3 | 官方文档 · fireworks.ai · Kimi-K3 模型页 | 官方文档 · Fireworks · Kimi K3 |
| mini | fireworks/accounts/fireworks/models/kimi-k2p5 | https://fireworks.ai/models/fireworks/kimi-k2p5 | 官方文档 · fireworks.ai · kimi k2p5 | 官方文档 · Fireworks · Kimi K2.5 |
| mini | fireworks/accounts/fireworks/models/minimax-m3 | https://fireworks.ai/models/fireworks/minimax-m3 | 官方文档 · fireworks.ai · minimax m3 | 官方文档 · Fireworks · MiniMax M3 |
| mini | fireworks/accounts/fireworks/models/qwen3p8-max | https://fireworks.ai/models/fireworks/qwen3p8-max | 官方文档 · fireworks.ai · qwen3p8 max | 官方文档 · Fireworks · Qwen 3.8 Max |
| mini | fireworks/accounts/fireworks/models/qwen3p7-plus | https://fireworks.ai/models/fireworks/qwen3p7-plus | 官方文档 · fireworks.ai · qwen3p7 plus | 官方文档 · Fireworks · Qwen 3.7 Plus |
| mini | fireworks/accounts/fireworks/models/qwen3-8b | https://fireworks.ai/models/fireworks/qwen3-8b | 官方文档 · fireworks.ai · qwen3 8b | 官方文档 · Fireworks · Qwen3 8B |
| mini | fireworks/accounts/fireworks/models/deepseek-v4p1-flash | https://fireworks.ai/models/deepseek-ai/deepseek-v4p1-flash | 官方文档 · fireworks.ai · deepseek v4p1 flash | 官方文档 · Fireworks · DeepSeek-V4.1-Flash |
| mini | fireworks/accounts/fireworks/models/deepseek-v4p1-flash-1017 | https://fireworks.ai/models/deepseek-ai/deepseek-v4p1-flash-1017 | 官方文档 · fireworks.ai · deepseek v4p1 flash 1017 | 官方文档 · Fireworks · DeepSeek V4.1 Flash 1017 |
| mini | fireworks/accounts/fireworks/models/gemma-4-31b-it | https://fireworks.ai/models/fireworks/gemma-4-31b-it | 官方文档 · fireworks.ai · gemma 4 31b it | 官方文档 · Fireworks · Gemma 4-31b It |
| mini | fireworks/accounts/fireworks/models/gpt-oss-120b | https://fireworks.ai/models/fireworks/gpt-oss-120b | 官方文档 · fireworks.ai · gpt oss 120b | 官方文档 · Fireworks · GPT-OSS 120B |
| mini | fireworks/accounts/fireworks/models/kimi-k3p1-pro | https://fireworks.ai/models/fireworks/kimi-k3p1-pro | 官方文档 · fireworks.ai · kimi k3p1 pro | 官方文档 · Fireworks · Kimi K3.1 Pro |
| mini | fireworks/accounts/fireworks/models/minimax-m3p1-flash | https://fireworks.ai/models/fireworks/minimax-m3p1-flash | 官方文档 · fireworks.ai · minimax m3p1 flash | 官方文档 · Fireworks · MiniMax M3.1 Flash |
| mini | fireworks/accounts/fireworks/models/muse-spark-open | https://fireworks.ai/models/fireworks/muse-spark-open | 官方文档 · fireworks.ai · muse spark open | 官方文档 · Fireworks · Muse Spark Open |
| mini | fireworks/accounts/fireworks/models/nemotron-3-ultra-nvfp4 | https://fireworks.ai/models/fireworks/nemotron-3-ultra-nvfp4 | 官方文档 · fireworks.ai · nemotron 3 ultra nvfp4 | 官方文档 · Fireworks · Nemotron 3 Ultra Nvfp4 |
| mini | fireworks/accounts/fireworks/models/nemotron-lightning-3p5-30b-a3b | https://fireworks.ai/models/fireworks/nemotron-lightning-3p5-30b-a3b | 官方文档 · fireworks.ai · nemotron lightning 3p5 30b a3b | 官方文档 · Fireworks · Nemotron Lightning 3p5-30b A3b |
| mini | fireworks/accounts/fireworks/models/nvidia-nemotron-3-nano-omni-30b-a3b | https://fireworks.ai/models/fireworks/nvidia-nemotron-3-nano-omni-30b-a3b | 官方文档 · fireworks.ai · nvidia nemotron 3 nano omni 30b a3b | 官方文档 · Fireworks · NVIDIA Nemotron 3 Nano Omni 30B A3B |
| mini | fireworks/accounts/fireworks/models/qwen3-omni-30b-a3b-instruct | https://fireworks.ai/models/fireworks/qwen3-omni-30b-a3b-instruct | 官方文档 · fireworks.ai · qwen3 omni 30b a3b instruct | 官方文档 · Fireworks · Qwen3 Omni 30B A3B Instruct |
| mini | fireworks/accounts/fireworks/models/step-3p7-flash-nvfp4 | https://fireworks.ai/models/fireworks/step-3p7-flash-nvfp4 | 官方文档 · fireworks.ai · step 3p7 flash nvfp4 | 官方文档 · Fireworks · Step 3.7 Flash（NVFP4） |
| mini | fal/alibaba/qwen-image-3/text-to-image | https://fal.ai/models/alibaba/qwen-image-3/text-to-image/api | 官方文档 · fal.ai · api | 官方文档 · fal · Qwen Image 3 API 文档 |
| mini | fal/bytedance/seedream/v5/flash/text-to-image | https://fal.ai/models/bytedance/seedream/v5/flash/text-to-image/api | 官方文档 · fal.ai · api | 官方文档 · fal · Seedream v5 Flash API 文档 |
| mini | fal/bytedance/seedream/v5/pro/text-to-image | https://fal.ai/models/bytedance/seedream/v5/pro/text-to-image/api | 官方文档 · fal.ai · api | 官方文档 · fal · Seedream（v5，pro） API 文档 |
| mini | fal/fal-ai/bytedance/seedream/v5/lite/edit | https://fal.ai/models/fal-ai/bytedance/seedream/v5/lite/edit/api | 官方文档 · fal.ai · api | 官方文档 · fal · Seedream（v5，lite，edit） API 文档 |
| mini | fal/fal-ai/bytedance/seedream/v4.5/text-to-image | https://fal.ai/models/fal-ai/bytedance/seedream/v4.5/text-to-image/api | 官方文档 · fal.ai · api | 官方文档 · fal · Seedream（v4.5） API 文档 |
| mini | fal/fal-ai/bytedance/seedream/v4/text-to-image | https://fal.ai/models/fal-ai/bytedance/seedream/v4/text-to-image/api | 官方文档 · fal.ai · api | 官方文档 · fal · Seedream（v4） API 文档 |
| mini | fal/fal-ai/fast-sdxl | https://fal.ai/models/fal-ai/fast-sdxl/api | 官方文档 · fal.ai · api | 官方文档 · fal · Fast SDXL API 文档 |
| mini | fal/fal-ai/flux-2 | https://fal.ai/models/fal-ai/flux-2/api | 官方文档 · fal.ai · api | 官方文档 · fal · FLUX-2 API 文档 |
| mini | fal/fal-ai/flux-2-flex | https://fal.ai/models/fal-ai/flux-2-flex/api | 官方文档 · fal.ai · api | 官方文档 · fal · FLUX 2 Flex API 文档 |
| mini | fal/fal-ai/flux-2-pro | https://fal.ai/models/fal-ai/flux-2-pro/api | 官方文档 · fal.ai · api | 官方文档 · fal · FLUX 2 Pro API 文档 |
| mini | fal/fal-ai/flux-2/flash | https://fal.ai/models/fal-ai/flux-2/flash/api | 官方文档 · fal.ai · api | 官方文档 · fal · FLUX-2（flash） API 文档 |
| mini | fal/fal-ai/flux-2/klein/9b | https://fal.ai/models/fal-ai/flux-2/klein/9b/api | 官方文档 · fal.ai · api | 官方文档 · fal · FLUX-2（klein，9b） API 文档 |
| mini | fal/fal-ai/flux-2/turbo | https://fal.ai/models/fal-ai/flux-2/turbo/api | 官方文档 · fal.ai · api | 官方文档 · fal · FLUX-2（turbo） API 文档 |
| mini | fal/fal-ai/flux-kontext-lora | https://fal.ai/models/fal-ai/flux-kontext-lora/api | 官方文档 · fal.ai · api | 官方文档 · fal · FLUX Kontext LoRA API 文档 |
| mini | fal/fal-ai/flux-pro/kontext | https://fal.ai/models/fal-ai/flux-pro/kontext/api | 官方文档 · fal.ai · api | 官方文档 · fal · FLUX Pro（Kontext） API 文档 |
| mini | fal/fal-ai/flux-pro/v1.1 | https://fal.ai/models/fal-ai/flux-pro/v1.1/api | 官方文档 · fal.ai · api | 官方文档 · fal · FLUX Pro（V1.1） API 文档 |
| mini | fal/fal-ai/flux-pro/v1.1-ultra | https://fal.ai/models/fal-ai/flux-pro/v1.1-ultra/api | 官方文档 · fal.ai · api | 官方文档 · fal · FLUX Pro（V1.1 Ultra） API 文档 |
| mini | fal/blackforestlabs/flux-3/klein/base/text-to-image | https://fal.ai/models/blackforestlabs/flux-3/klein/base/text-to-image/api | 官方文档 · fal.ai · api | 官方文档 · fal · FLUX.3 Klein Base API 文档 |
| mini | fal/blackforestlabs/flux-3/klein/text-to-image | https://fal.ai/models/blackforestlabs/flux-3/klein/text-to-image/api | 官方文档 · fal.ai · api | 官方文档 · fal · FLUX.3 Klein API 文档 |
| mini | fal/blackforestlabs/flux-3/text-to-image | https://fal.ai/models/blackforestlabs/flux-3/text-to-image/api | 官方文档 · fal.ai · api | 官方文档 · fal · FLUX.3 API 文档 |
| mini | fal/fal-ai/flux-1/schnell | https://fal.ai/models/fal-ai/flux-1/schnell/api | 官方文档 · fal.ai · api | 官方文档 · fal · FLUX-1（schnell） API 文档 |
| mini | fal/fal-ai/flux-lora | https://fal.ai/models/fal-ai/flux-lora/api | 官方文档 · fal.ai · api | 官方文档 · fal · FLUX LoRA API 文档 |
| mini | fal/fal-ai/flux/dev | https://fal.ai/models/fal-ai/flux/dev/api | 官方文档 · fal.ai · api | 官方文档 · fal · FLUX（dev） API 文档 |
| mini | fal/fal-ai/flux/schnell | https://fal.ai/models/fal-ai/flux/schnell/api | 官方文档 · fal.ai · api | 官方文档 · fal · FLUX（schnell） API 文档 |
| mini | fal/fal-ai/ideogram/v3 | https://fal.ai/models/fal-ai/ideogram/v3/api | 官方文档 · fal.ai · api | 官方文档 · fal · Ideogram V3 API 文档 |
| mini | fal/fal-ai/nano-banana-2 | https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-image | 官方文档 · ai.google.dev · gemini 3.1 flash image | 官方文档 · Google · Gemini 3.1 Flash Image |
| mini | fal/fal-ai/qwen-image | https://fal.ai/models/fal-ai/qwen-image/api | 官方文档 · fal.ai · api | 官方文档 · fal · Qwen Image API 文档 |
| mini | fal/fal-ai/recraft/v4/pro/text-to-image | https://fal.ai/models/fal-ai/recraft/v4/pro/text-to-image/api | 官方文档 · fal.ai · api | 官方文档 · fal · Recraft V4 Pro API 文档 |
| mini | fal/fal-ai/recraft/v3/text-to-image | https://fal.ai/models/fal-ai/recraft/v3/text-to-image/api | 官方文档 · fal.ai · api | 官方文档 · fal · Recraft V3 API 文档 |
| mini | fal/google/nano-banana-2-lite | https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite-image | 官方文档 · ai.google.dev · gemini 3.1 flash lite image | 官方文档 · Google · Gemini 3.1 Flash Lite Image |
| mini | fal/fal-ai/nano-banana-pro | https://ai.google.dev/gemini-api/docs/models/gemini-3-pro-image | 官方文档 · ai.google.dev · gemini 3 pro image | 官方文档 · Google · Gemini 3 Pro Image |
| mini | fal/fal-ai/nano-banana | https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-image | 官方文档 · ai.google.dev · gemini 2.5 flash image | 官方文档 · Google · Gemini 2.5 Flash Image |
| mini | fal/google/nano-banana-2.1 | https://fal.ai/models/google/nano-banana-2.1/api | 官方文档 · fal.ai · api | 官方文档 · fal · Nano Banana 2.1 API 文档 |
| mini | fal/openai/gpt-image-2.5/flare/text-to-image | https://fal.ai/models/openai/gpt-image-2.5/flare/text-to-image/api | 官方文档 · fal.ai · api | 官方文档 · fal · GPT Image 2.5 Flare API 文档 |
| mini | fal/openai/gpt-image-2.5/sunburst/text-to-image | https://fal.ai/models/openai/gpt-image-2.5/sunburst/text-to-image/api | 官方文档 · fal.ai · api | 官方文档 · fal · GPT Image 2.5 Sunburst API 文档 |
| mini | fal/openai/gpt-image-2 | https://fal.ai/models/openai/gpt-image-2/api | 官方文档 · fal.ai · api | 官方文档 · fal · GPT Image 2 API 文档 |
| mini | fal/fal-ai/gpt-image-1.5 | https://fal.ai/models/fal-ai/gpt-image-1.5/api | 官方文档 · fal.ai · api | 官方文档 · fal · GPT Image 1.5 API 文档 |
| mini | fal/xai/grok-imagine-image/v2.0/text-to-image | https://fal.ai/models/xai/grok-imagine-image/v2.0/text-to-image/api | 官方文档 · fal.ai · api | 官方文档 · fal · Grok Imagine Image（V2.0） API 文档 |
| mini | fal/xai/grok-imagine-image | https://fal.ai/models/xai/grok-imagine-image/api | 官方文档 · fal.ai · api | 官方文档 · fal · Grok Imagine Image API 文档 |
| mini | fal/xai/grok-imagine-image/quality/text-to-image | https://fal.ai/models/xai/grok-imagine-image/quality/text-to-image/api | 官方文档 · fal.ai · api | 官方文档 · fal · Grok Imagine Image（Quality） API 文档 |
| mini | fal/bria/fibo-edit-1.5/edit | https://fal.ai/models/bria/fibo-edit-1.5/edit/api | 官方文档 · fal.ai · api | 官方文档 · fal · Fibo Edit 1.5（Edit） API 文档 |
| mini | fal/bria/fibo-gen-1.5/text-to-image | https://fal.ai/models/bria/fibo-gen-1.5/text-to-image/api | 官方文档 · fal.ai · api | 官方文档 · fal · Fibo Gen 1.5 API 文档 |
| mini | fal/fal-ai/krea-2/turbo | https://fal.ai/models/fal-ai/krea-2/turbo/api | 官方文档 · fal.ai · api | 官方文档 · fal · Krea 2（Turbo） API 文档 |
| mini | fal/fal-ai/z-image/turbo | https://fal.ai/models/fal-ai/z-image/turbo/api | 官方文档 · fal.ai · api | 官方文档 · fal · Z Image（Turbo） API 文档 |
| mini | fal/ideogram/v4.5 | https://fal.ai/models/ideogram/v4.5/api | 官方文档 · fal.ai · api | 官方文档 · fal · Ideogram 4.5 API 文档 |
| mini | fal/imagineart/imagineart-2.0-preview/text-to-image | https://fal.ai/models/imagineart/imagineart-2.0-preview/text-to-image/api | 官方文档 · fal.ai · api | 官方文档 · fal · Imagineart 2.0 Preview API 文档 |
| mini | fal/krea/v2/large/text-to-image | https://fal.ai/models/krea/v2/large/text-to-image/api | 官方文档 · fal.ai · api | 官方文档 · fal · Krea V2 Large API 文档 |
| mini | fal/krea/v3/text-to-image | https://fal.ai/models/krea/v3/text-to-image/api | 官方文档 · fal.ai · api | 官方文档 · fal · Krea 3 API 文档 |
| mini | fal/meta/muse-image/text-to-image | https://fal.ai/models/meta/muse-image/text-to-image/api | 官方文档 · fal.ai · api | 官方文档 · fal · Muse Image API 文档 |
| mini | replicate/google/gemini-3.5-flash | https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash | 官方文档 · ai.google.dev · gemini 3.5 flash | 官方文档 · Google · Gemini 3.5 Flash |
| mini | replicate/alibaba/qwen-image-3 | https://replicate.com/alibaba/qwen-image-3 | 官方文档 · replicate.com · qwen image 3 | 官方文档 · Replicate · Qwen Image 3 |
| mini | replicate/alibaba/qwen-image-3-pro | https://replicate.com/alibaba/qwen-image-3-pro | 官方文档 · replicate.com · qwen image 3 pro | 官方文档 · Replicate · Qwen Image 3 Pro |
| mini | replicate/alibaba/wan-3 | https://replicate.com/alibaba/wan-3 | 官方文档 · replicate.com · wan 3 | 官方文档 · Replicate · Wan 3 |
| mini | replicate/anthropic/claude-opus-5.5 | https://replicate.com/anthropic/claude-opus-5.5 | 官方文档 · replicate.com · claude opus 5.5 | 官方文档 · Replicate · Claude Opus 5.5 |
| mini | replicate/black-forest-labs/flux-2-flex | https://replicate.com/black-forest-labs/flux-2-flex | 官方文档 · replicate.com · flux 2 flex | 官方文档 · Replicate · FLUX 2 Flex |
| mini | replicate/black-forest-labs/flux-2-klein-4b | https://replicate.com/black-forest-labs/flux-2-klein-4b | 官方文档 · replicate.com · flux 2 klein 4b | 官方文档 · Replicate · FLUX 2 Klein 4b |
| mini | replicate/black-forest-labs/flux-2-max | https://replicate.com/black-forest-labs/flux-2-max | 官方文档 · replicate.com · flux 2 max | 官方文档 · Replicate · FLUX 2 Max |
| mini | replicate/black-forest-labs/flux-2-pro | https://replicate.com/black-forest-labs/flux-2-pro | 官方文档 · replicate.com · flux 2 pro | 官方文档 · Replicate · FLUX 2 Pro |
| mini | replicate/black-forest-labs/flux-kontext-dev | https://replicate.com/black-forest-labs/flux-kontext-dev | 官方文档 · replicate.com · flux kontext dev | 官方文档 · Replicate · FLUX Kontext Dev |
| mini | replicate/black-forest-labs/flux-kontext-max | https://replicate.com/black-forest-labs/flux-kontext-max | 官方文档 · replicate.com · flux kontext max | 官方文档 · Replicate · FLUX Kontext Max |
| mini | replicate/black-forest-labs/flux-kontext-pro | https://replicate.com/black-forest-labs/flux-kontext-pro | 官方文档 · replicate.com · flux kontext pro | 官方文档 · Replicate · FLUX Kontext Pro |
| mini | replicate/bytedance/seedream-5-lite | https://replicate.com/bytedance/seedream-5-lite | 官方文档 · replicate.com · seedream 5 lite | 官方文档 · Replicate · Seedream 5 Lite |
| mini | replicate/bytedance/seedream-4.5 | https://replicate.com/bytedance/seedream-4.5 | 官方文档 · replicate.com · seedream 4.5 | 官方文档 · Replicate · Seedream-4.5 |
| mini | replicate/bytedance/seedream-4 | https://replicate.com/bytedance/seedream-4 | 官方文档 · replicate.com · seedream 4 | 官方文档 · Replicate · Seedream-4 |
| mini | replicate/bytedance/seedream-3 | https://replicate.com/bytedance/seedream-3 | 官方文档 · replicate.com · seedream 3 | 官方文档 · Replicate · Seedream-3 |
| mini | replicate/google/gemini-3-flash | https://replicate.com/google/gemini-3-flash | 官方文档 · replicate.com · gemini 3 flash | 官方文档 · Replicate · Gemini 3 Flash |
| mini | replicate/google/gemini-2.5-flash | https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash | 官方文档 · ai.google.dev · gemini 2.5 flash | 官方文档 · Google · Gemini 2.5 Flash |
| mini | replicate/google/imagen-4 | https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/4-0-generate#4.0-generate-001 | 原厂规格 · cloud.google.com · 4 0 generate | 原厂规格 · Google Cloud · 4-0 Generate |
| mini | replicate/google/imagen-4-fast | https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/4-0-generate#4.0-fast-generate-001 | 原厂规格 · cloud.google.com · 4 0 generate | 原厂规格 · Google Cloud · 4-0 Generate |
| mini | replicate/google/imagen-4-ultra | https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/4-0-generate#4.0-ultra-generate-001 | 原厂规格 · cloud.google.com · 4 0 generate | 原厂规格 · Google Cloud · 4-0 Generate |
| mini | replicate/google/imagen-3 | https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/3-0-generate#3.0-generate-002 | 原厂规格 · cloud.google.com · 3 0 generate | 原厂规格 · Google Cloud · 3-0 Generate |
| mini | replicate/google/imagen-3-fast | https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/3-0-generate#3.0-fast-generate-001 | 原厂规格 · cloud.google.com · 3 0 generate | 原厂规格 · Google Cloud · 3-0 Generate |
| mini | replicate/google/nano-banana-2 | https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-image | 官方文档 · ai.google.dev · gemini 3.1 flash image | 官方文档 · Google · Gemini 3.1 Flash Image |
| mini | replicate/google/nano-banana-2-lite | https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite-image | 官方文档 · ai.google.dev · gemini 3.1 flash lite image | 官方文档 · Google · Gemini 3.1 Flash Lite Image |
| mini | replicate/google/nano-banana-pro | https://ai.google.dev/gemini-api/docs/models/gemini-3-pro-image | 官方文档 · ai.google.dev · gemini 3 pro image | 官方文档 · Google · Gemini 3 Pro Image |
| mini | replicate/google/nano-banana | https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-image | 官方文档 · ai.google.dev · gemini 2.5 flash image | 官方文档 · Google · Gemini 2.5 Flash Image |
| mini | replicate/google/nano-banana-2.1 | https://replicate.com/google/nano-banana-2.1 | 官方文档 · replicate.com · nano banana 2.1 | 官方文档 · Replicate · Nano Banana 2.1 |
| mini | replicate/ideogram-ai/ideogram-v3-balanced | https://replicate.com/ideogram-ai/ideogram-v3-balanced | 官方文档 · replicate.com · ideogram v3 balanced | 官方文档 · Replicate · Ideogram V3 Balanced |
| mini | replicate/ideogram-ai/ideogram-v3-quality | https://replicate.com/ideogram-ai/ideogram-v3-quality | 官方文档 · replicate.com · ideogram v3 quality | 官方文档 · Replicate · Ideogram V3 Quality |
| mini | replicate/ideogram-ai/ideogram-v3-turbo | https://replicate.com/ideogram-ai/ideogram-v3-turbo | 官方文档 · replicate.com · ideogram v3 turbo | 官方文档 · Replicate · Ideogram V3 Turbo |
| mini | replicate/ideogram-ai/ideogram-v2a | https://replicate.com/ideogram-ai/ideogram-v2a | 官方文档 · replicate.com · ideogram v2a | 官方文档 · Replicate · Ideogram V2a |
| mini | replicate/ideogram-ai/ideogram-v2a-turbo | https://replicate.com/ideogram-ai/ideogram-v2a-turbo | 官方文档 · replicate.com · ideogram v2a turbo | 官方文档 · Replicate · Ideogram V2a Turbo |
| mini | replicate/ideogram-ai/ideogram-v2 | https://replicate.com/ideogram-ai/ideogram-v2 | 官方文档 · replicate.com · ideogram v2 | 官方文档 · Replicate · Ideogram V2 |
| mini | replicate/ideogram-ai/ideogram-v2-turbo | https://replicate.com/ideogram-ai/ideogram-v2-turbo | 官方文档 · replicate.com · ideogram v2 turbo | 官方文档 · Replicate · Ideogram V2 Turbo |
| mini | replicate/openai/gpt-image-2.5-flare | https://developers.openai.com/api/docs/models/gpt-image-2.5-flare | 官方文档 · developers.openai.com · gpt image 2.5 flare | 官方文档 · OpenAI · GPT Image 2.5 Flare |
| mini | replicate/openai/gpt-image-2.5-sunburst | https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst | 官方文档 · developers.openai.com · gpt image 2.5 sunburst | 官方文档 · OpenAI · GPT Image 2.5 Sunburst |
| mini | replicate/openai/gpt-image-2 | https://developers.openai.com/api/docs/models/gpt-image-2 | 官方文档 · developers.openai.com · gpt image 2 | 官方文档 · OpenAI · GPT Image 2 |
| mini | replicate/openai/gpt-image-1.5 | https://developers.openai.com/api/docs/models/gpt-image-1.5 | 官方文档 · developers.openai.com · gpt image 1.5 | 官方文档 · OpenAI · GPT Image 1.5 |
| mini | replicate/prunaai/flux-kontext-fast | https://replicate.com/prunaai/flux-kontext-fast | 官方文档 · replicate.com · flux kontext fast | 官方文档 · Replicate · FLUX Kontext Fast |
| mini | replicate/black-forest-labs/flux-1.1-pro | https://replicate.com/black-forest-labs/flux-1.1-pro | 官方文档 · replicate.com · flux 1.1 pro | 官方文档 · Replicate · FLUX 1.1 Pro |
| mini | replicate/black-forest-labs/flux-1.1-pro-ultra | https://replicate.com/black-forest-labs/flux-1.1-pro-ultra | 官方文档 · replicate.com · flux 1.1 pro ultra | 官方文档 · Replicate · FLUX 1.1 Pro Ultra |
| mini | replicate/black-forest-labs/flux-3-image | https://replicate.com/black-forest-labs/flux-3-image | 官方文档 · replicate.com · flux 3 image | 官方文档 · Replicate · FLUX 3 Image |
| mini | replicate/black-forest-labs/flux-dev | https://replicate.com/black-forest-labs/flux-dev | 官方文档 · replicate.com · flux dev | 官方文档 · Replicate · FLUX Dev |
| mini | replicate/black-forest-labs/flux-dev-lora | https://replicate.com/black-forest-labs/flux-dev-lora | 官方文档 · replicate.com · flux dev lora | 官方文档 · Replicate · FLUX Dev LoRA |
| mini | replicate/black-forest-labs/flux-pro | https://replicate.com/black-forest-labs/flux-pro | 官方文档 · replicate.com · flux pro | 官方文档 · Replicate · FLUX Pro |
| mini | replicate/black-forest-labs/flux-schnell | https://replicate.com/black-forest-labs/flux-schnell | 官方文档 · replicate.com · flux schnell | 官方文档 · Replicate · FLUX Schnell |
| mini | replicate/prunaai/flux-fast | https://replicate.com/prunaai/flux-fast | 官方文档 · replicate.com · flux fast | 官方文档 · Replicate · FLUX Fast |
| mini | replicate/qwen/qwen-image | https://replicate.com/qwen/qwen-image | 官方文档 · replicate.com · qwen image | 官方文档 · Replicate · Qwen Image |
| mini | replicate/qwen/qwen-image-edit | https://replicate.com/qwen/qwen-image-edit | 官方文档 · replicate.com · qwen image edit | 官方文档 · Replicate · Qwen Image Edit |
| mini | replicate/qwen/qwen-image-edit-plus | https://replicate.com/qwen/qwen-image-edit-plus | 官方文档 · replicate.com · qwen image edit plus | 官方文档 · Replicate · Qwen Image Edit Plus |
| mini | replicate/qwen/qwen3-235b-a22b-instruct-2507 | https://huggingface.co/Qwen/Qwen3-235B-A22B-Instruct-2507 | 官方文档 · Hugging Face · Qwen3 235B A22B Instruct 2507 | 官方文档 · Hugging Face · Qwen3-235b A22b Instruct 2507 |
| mini | replicate/qwen/qwen3-7-plus | https://help.aliyun.com/zh/model-studio/qwen3-7-plus | 官方文档 · 百炼 · qwen3 7 plus | 官方文档 · 百炼 · Qwen3.7 Plus |
| mini | replicate/recraft-ai/recraft-v4.1 | https://replicate.com/recraft-ai/recraft-v4.1 | 官方文档 · replicate.com · recraft v4.1 | 官方文档 · Replicate · Recraft V4.1 |
| mini | replicate/recraft-ai/recraft-v4-pro | https://replicate.com/recraft-ai/recraft-v4-pro | 官方文档 · replicate.com · recraft v4 pro | 官方文档 · Replicate · Recraft V4 Pro |
| mini | replicate/recraft-ai/recraft-v3 | https://replicate.com/recraft-ai/recraft-v3 | 官方文档 · replicate.com · recraft v3 | 官方文档 · Replicate · Recraft V3 |
| mini | replicate/stability-ai/stable-diffusion-3.5-large | https://replicate.com/stability-ai/stable-diffusion-3.5-large | 官方文档 · replicate.com · stable diffusion 3.5 large | 官方文档 · Replicate · Stable Diffusion 3.5 Large |
| mini | replicate/stability-ai/stable-diffusion-3.5-large-turbo | https://replicate.com/stability-ai/stable-diffusion-3.5-large-turbo | 官方文档 · replicate.com · stable diffusion 3.5 large turbo | 官方文档 · Replicate · Stable Diffusion 3.5 Large Turbo |
| mini | replicate/stability-ai/stable-diffusion-3.5-medium | https://replicate.com/stability-ai/stable-diffusion-3.5-medium | 官方文档 · replicate.com · stable diffusion 3.5 medium | 官方文档 · Replicate · Stable Diffusion 3.5 Medium |
| mini | replicate/stability-ai/sdxl | https://replicate.com/stability-ai/sdxl | 官方文档 · replicate.com · sdxl | 官方文档 · Replicate · SDXL |
| mini | replicate/stability-ai/stable-diffusion | https://replicate.com/stability-ai/stable-diffusion | 官方文档 · replicate.com · stable diffusion | 官方文档 · Replicate · Stable Diffusion |
| mini | replicate/wan-video/wan-2.7-image | https://replicate.com/wan-video/wan-2.7-image | 官方文档 · replicate.com · wan 2.7 image | 官方文档 · Replicate · Wan 2.7 Image |
| mini | replicate/wan-video/wan-2.7-image-pro | https://replicate.com/wan-video/wan-2.7-image-pro | 官方文档 · replicate.com · wan 2.7 image pro | 官方文档 · Replicate · Wan 2.7 Image Pro |
| mini | replicate/prunaai/wan-2.2-image | https://replicate.com/prunaai/wan-2.2-image | 官方文档 · replicate.com · wan 2.2 image | 官方文档 · Replicate · Wan 2.2 Image |
| mini | replicate/xai/grok-imagine-image | https://replicate.com/xai/grok-imagine-image | 官方文档 · replicate.com · grok imagine image | 官方文档 · Replicate · Grok Imagine Image |
| mini | replicate/xai/grok-imagine-image-2 | https://replicate.com/xai/grok-imagine-image-2 | 官方文档 · replicate.com · grok imagine image 2 | 官方文档 · Replicate · Grok Imagine Image 2 |
| mini | replicate/adirik/realvisxl-v3.0-turbo | https://replicate.com/adirik/realvisxl-v3.0-turbo | 官方文档 · replicate.com · realvisxl v3.0 turbo | 官方文档 · Replicate · Adirik（Realvisxl V3.0 Turbo） |
| mini | replicate/ai-forever/kandinsky-2 | https://replicate.com/ai-forever/kandinsky-2 | 官方文档 · replicate.com · kandinsky 2 | 官方文档 · Replicate · Kandinsky 2 |
| mini | replicate/ai-forever/kandinsky-2.2 | https://replicate.com/ai-forever/kandinsky-2.2 | 官方文档 · replicate.com · kandinsky 2.2 | 官方文档 · Replicate · Kandinsky 2.2 |
| mini | replicate/bria/fibo | https://replicate.com/bria/fibo | 官方文档 · replicate.com · fibo | 官方文档 · Replicate · Fibo |
| mini | replicate/bria/fibo-edit | https://replicate.com/bria/fibo-edit | 官方文档 · replicate.com · fibo edit | 官方文档 · Replicate · Fibo Edit |
| mini | replicate/bria/image-3.2 | https://replicate.com/bria/image-3.2 | 官方文档 · replicate.com · image 3.2 | 官方文档 · Replicate · Image 3.2 |
| mini | replicate/bytedance/bagel | https://replicate.com/bytedance/bagel | 官方文档 · replicate.com · bagel | 官方文档 · Replicate · Bagel |
| mini | replicate/bytedance/sdxl-lightning-4step | https://replicate.com/bytedance/sdxl-lightning-4step | 官方文档 · replicate.com · sdxl lightning 4step | 官方文档 · Replicate · SDXL Lightning 4step |
| mini | replicate/datacte/proteus-v0.2 | https://replicate.com/datacte/proteus-v0.2 | 官方文档 · replicate.com · proteus v0.2 | 官方文档 · Replicate · Datacte（Proteus V0.2） |
| mini | replicate/datacte/proteus-v0.3 | https://replicate.com/datacte/proteus-v0.3 | 官方文档 · replicate.com · proteus v0.3 | 官方文档 · Replicate · Datacte（Proteus V0.3） |
| mini | replicate/fofr/latent-consistency-model | https://replicate.com/fofr/latent-consistency-model | 官方文档 · replicate.com · latent consistency model | 官方文档 · Replicate · Fofr（Latent Consistency Model） |
| mini | replicate/fofr/sdxl-emoji | https://replicate.com/fofr/sdxl-emoji | 官方文档 · replicate.com · sdxl emoji | 官方文档 · Replicate · Fofr（SDXL Emoji） |
| mini | replicate/fofr/sticker-maker | https://replicate.com/fofr/sticker-maker | 官方文档 · replicate.com · sticker maker | 官方文档 · Replicate · Fofr（Sticker Maker） |
| mini | replicate/ideogram-ai/ideogram-4-5 | https://replicate.com/ideogram-ai/ideogram-4-5 | 官方文档 · replicate.com · ideogram 4 5 | 官方文档 · Replicate · Ideogram 4.5 |
| mini | replicate/ideogram-ai/ideogram-4-5-precise-edit | https://replicate.com/ideogram-ai/ideogram-4-5-precise-edit | 官方文档 · replicate.com · ideogram 4 5 precise edit | 官方文档 · Replicate · Ideogram 4.5 Precise Edit |
| mini | replicate/krea/krea-2-medium | https://replicate.com/krea/krea-2-medium | 官方文档 · replicate.com · krea 2 medium | 官方文档 · Replicate · Krea 2 Medium |
| mini | replicate/leonardoai/lucid-origin | https://replicate.com/leonardoai/lucid-origin | 官方文档 · replicate.com · lucid origin | 官方文档 · Replicate · Lucid Origin |
| mini | replicate/lucataco/dreamshaper-xl-turbo | https://replicate.com/lucataco/dreamshaper-xl-turbo | 官方文档 · replicate.com · dreamshaper xl turbo | 官方文档 · Replicate · Lucataco（Dreamshaper Xl Turbo） |
| mini | replicate/lucataco/omnigen2 | https://replicate.com/lucataco/omnigen2 | 官方文档 · replicate.com · omnigen2 | 官方文档 · Replicate · Lucataco（Omnigen2） |
| mini | replicate/lucataco/open-dalle-v1.1 | https://replicate.com/lucataco/open-dalle-v1.1 | 官方文档 · replicate.com · open dalle v1.1 | 官方文档 · Replicate · Lucataco（Open Dalle V1.1） |
| mini | replicate/lucataco/realistic-vision-v5.1 | https://replicate.com/lucataco/realistic-vision-v5.1 | 官方文档 · replicate.com · realistic vision v5.1 | 官方文档 · Replicate · Lucataco（Realistic Vision V5.1） |
| mini | replicate/lucataco/ssd-1b | https://replicate.com/lucataco/ssd-1b | 官方文档 · replicate.com · ssd 1b | 官方文档 · Replicate · Lucataco（Ssd 1b） |
| mini | replicate/luma/photon | https://replicate.com/luma/photon | 官方文档 · replicate.com · photon | 官方文档 · Replicate · Photon |
| mini | replicate/luma/photon-flash | https://replicate.com/luma/photon-flash | 官方文档 · replicate.com · photon flash | 官方文档 · Replicate · Photon Flash |
| mini | replicate/minimax/image-01 | https://replicate.com/minimax/image-01 | 官方文档 · replicate.com · image 01 | 官方文档 · Replicate · Image 01 |
| mini | replicate/nvidia/sana | https://replicate.com/nvidia/sana | 官方文档 · replicate.com · sana | 官方文档 · Replicate · Sana |
| mini | replicate/nvidia/sana-sprint-1.6b | https://replicate.com/nvidia/sana-sprint-1.6b | 官方文档 · replicate.com · sana sprint 1.6b | 官方文档 · Replicate · Sana Sprint 1.6b |
| mini | replicate/playgroundai/playground-v2.5-1024px-aesthetic | https://replicate.com/playgroundai/playground-v2.5-1024px-aesthetic | 官方文档 · replicate.com · playground v2.5 1024px aesthetic | 官方文档 · Replicate · Playground V2.5-1024px Aesthetic |
| mini | replicate/prunaai/hidream-l1-dev | https://replicate.com/prunaai/hidream-l1-dev | 官方文档 · replicate.com · hidream l1 dev | 官方文档 · Replicate · Hidream L1 Dev |
| mini | replicate/prunaai/hidream-l1-fast | https://replicate.com/prunaai/hidream-l1-fast | 官方文档 · replicate.com · hidream l1 fast | 官方文档 · Replicate · Hidream L1 Fast |
| mini | replicate/prunaai/hidream-l1-full | https://replicate.com/prunaai/hidream-l1-full | 官方文档 · replicate.com · hidream l1 full | 官方文档 · Replicate · Hidream L1 Full |
| mini | replicate/prunaai/p-image | https://replicate.com/prunaai/p-image | 官方文档 · replicate.com · p image | 官方文档 · Replicate · P Image |
| mini | replicate/prunaai/p-image-edit | https://replicate.com/prunaai/p-image-edit | 官方文档 · replicate.com · p image edit | 官方文档 · Replicate · P Image Edit |
| mini | replicate/prunaai/p-image-ideogram | https://replicate.com/prunaai/p-image-ideogram | 官方文档 · replicate.com · p image ideogram | 官方文档 · Replicate · P Image Ideogram |
| mini | replicate/prunaai/p-image-lora | https://replicate.com/prunaai/p-image-lora | 官方文档 · replicate.com · p image lora | 官方文档 · Replicate · P Image LoRA |
| mini | replicate/prunaai/sdxl-lightning | https://replicate.com/prunaai/sdxl-lightning | 官方文档 · replicate.com · sdxl lightning | 官方文档 · Replicate · SDXL Lightning |
| mini | replicate/prunaai/z-image-turbo | https://replicate.com/prunaai/z-image-turbo | 官方文档 · replicate.com · z image turbo | 官方文档 · Replicate · Z Image Turbo |
| mini | replicate/sourceful/riverflow-2.0-pro | https://replicate.com/sourceful/riverflow-2.0-pro | 官方文档 · replicate.com · riverflow 2.0 pro | 官方文档 · Replicate · Riverflow 2.0 Pro |
| mini | replicate/tencent/hunyuan-image-3 | https://replicate.com/tencent/hunyuan-image-3 | 官方文档 · replicate.com · hunyuan image 3 | 官方文档 · Replicate · Hunyuan Image 3 |
| mini | replicate/tstramer/material-diffusion | https://replicate.com/tstramer/material-diffusion | 官方文档 · replicate.com · material diffusion | 官方文档 · Replicate · Tstramer（Material Diffusion） |
| mini | replicate/zsxkib/step1x-edit | https://replicate.com/zsxkib/step1x-edit | 官方文档 · replicate.com · step1x edit | 官方文档 · Replicate · Zsxkib（Step1x Edit） |
| mini | tokendance/deepseek-v4.1-flash | https://tokendance.space/models/deepseek-v4.1-flash | 官方文档 · TokenDance · deepseek v4.1 flash | 官方文档 · TokenDance · DeepSeek-V4.1-Flash |
| mini | tokendance/deepseek-v4.1-flash-1017 | https://tokendance.space/models/deepseek-v4.1-flash-1017 | 官方文档 · TokenDance · deepseek v4.1 flash 1017 | 官方文档 · TokenDance · DeepSeek V4.1 Flash 1017 |
| mini | tokendance/deepseek-v4-flash-vision-exp | https://api-docs.deepseek.com/news/news260821/ | 原厂规格 · DeepSeek · news260821 | 原厂规格 · DeepSeek · 更新日志 2026-08-21 |
| mini | tokendance/deepseek-v4-pro-0813 | https://tokendance.space/models/deepseek-v4-pro-0813 | 官方文档 · TokenDance · deepseek v4 pro 0813 | 官方文档 · TokenDance · DeepSeek-V4-Pro-0813 |
| mini | tokendance/deepseek-v4-flash-0731 | https://tokendance.space/models/deepseek-v4-flash-0731 | 官方文档 · TokenDance · deepseek v4 flash 0731 | 官方文档 · TokenDance · DeepSeek-V4-Flash-0731 |
| mini | tokendance/deepseek-v4-flash | https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash | 原厂规格 · Hugging Face · DeepSeek V4 Flash | 原厂规格 · Hugging Face · DeepSeek-V4-Flash Preview |
| mini | tokendance/deepseek-v4-pro | https://tokendance.space/models/deepseek-v4-pro | 官方文档 · TokenDance · deepseek v4 pro | 官方文档 · TokenDance · DeepSeek-V4-Pro Preview |
| mini | tokendance/deepseek-v3.2 | https://huggingface.co/deepseek-ai/DeepSeek-V3.2 | 原厂规格 · Hugging Face · DeepSeek V3.2 | 原厂规格 · Hugging Face · DeepSeek-V3.2 |
| mini | tokendance/deepseek-chat-v3-0324 | https://api-docs.deepseek.com/news/news250325 | 原厂规格 · V3-0324 Release &#124; DeepSeek API Docs | 原厂规格 · DeepSeek · V3-0324 Release |
| mini | tokendance/glm-5.3 | https://tokendance.space/models/glm-5.3 | 官方文档 · TokenDance · glm 5.3 | 官方文档 · TokenDance · GLM 5.3 |
| mini | tokendance/glm-5.3-flash | https://tokendance.space/models/glm-5.3-flash | 官方文档 · TokenDance · glm 5.3 flash | 官方文档 · TokenDance · GLM 5.3 Flash |
| mini | tokendance/glm-5.3-flashx | https://tokendance.space/models/glm-5.3-flashx | 官方文档 · TokenDance · glm 5.3 flashx | 官方文档 · TokenDance · GLM 5.3 FlashX |
| mini | tokendance/glm-5.2 | https://tokendance.space/models/glm-5.2 | 官方文档 · TokenDance · glm 5.2 | 官方文档 · TokenDance · GLM 5.2 |
| mini | tokendance/glm-5.1 | https://tokendance.space/models/glm-5.1 | 官方文档 · TokenDance · glm 5.1 | 官方文档 · TokenDance · GLM 5.1 |
| mini | tokendance/glm-5 | https://tokendance.space/models/glm-5 | 官方文档 · TokenDance · glm 5 | 官方文档 · TokenDance · GLM 5 |
| mini | tokendance/glm-5v-turbo | https://tokendance.space/models/glm-5v-turbo | 官方文档 · TokenDance · glm 5v turbo | 官方文档 · TokenDance · GLM 5V Turbo |
| mini | tokendance/glm-4.7 | https://tokendance.space/models/glm-4.7 | 官方文档 · TokenDance · glm 4.7 | 官方文档 · TokenDance · GLM 4.7 |
| mini | tokendance/glm-4.6v | https://tokendance.space/models/glm-4.6v | 官方文档 · TokenDance · glm 4.6v | 官方文档 · TokenDance · GLM 4.6V |
| mini | tokendance/glm-4.5-air | https://tokendance.space/models/glm-4.5-air | 官方文档 · TokenDance · glm 4.5 air | 官方文档 · TokenDance · GLM 4.5 Air |
| mini | tokendance/hy4-preview | https://tokendance.space/models/hy4-preview | 官方文档 · TokenDance · hy4 preview | 官方文档 · TokenDance · Hy4 preview |
| mini | tokendance/hy3 | https://tokendance.space/models/hy3 | 官方文档 · TokenDance · hy3 | 官方文档 · TokenDance · Hy3 |
| mini | tokendance/hy3-preview | https://tokendance.space/models/hy3-preview | 官方文档 · TokenDance · hy3 preview | 官方文档 · TokenDance · Hy3 preview |
| mini | tokendance/kimi-k3 | https://tokendance.space/models/kimi-k3 | 官方文档 · TokenDance · Kimi-K3 模型页 | 官方文档 · TokenDance · Kimi K3 |
| mini | tokendance/kimi-k2.7-code | https://tokendance.space/models/kimi-k2.7-code | 官方文档 · TokenDance · kimi k2.7 code | 官方文档 · TokenDance · Kimi K2.7 Code |
| mini | tokendance/kimi-k2.6 | https://tokendance.space/models/kimi-k2.6 | 官方文档 · TokenDance · kimi k2.6 | 官方文档 · TokenDance · Kimi K2.6 |
| mini | tokendance/kimi-k2.5 | https://tokendance.space/models/kimi-k2.5 | 官方文档 · TokenDance · kimi k2.5 | 官方文档 · TokenDance · Kimi K2.5 |
| mini | tokendance/minimax-m3 | https://tokendance.space/models/minimax-m3 | 官方文档 · TokenDance · minimax m3 | 官方文档 · TokenDance · MiniMax M3 |
| mini | tokendance/minimax-m2.7 | https://tokendance.space/models/minimax-m2.7 | 官方文档 · TokenDance · minimax m2.7 | 官方文档 · TokenDance · MiniMax M2.7 |
| mini | tokendance/minimax-m2.5 | https://tokendance.space/models/minimax-m2.5 | 官方文档 · TokenDance · minimax m2.5 | 官方文档 · TokenDance · MiniMax M2.5 |
| mini | tokendance/qwen3.8-flash | https://tokendance.space/models/qwen3.8-flash | 官方文档 · TokenDance · qwen3.8 flash | 官方文档 · TokenDance · Qwen3.8 Flash |
| mini | tokendance/qwen3.8-max | https://tokendance.space/models/qwen3.8-max | 官方文档 · TokenDance · qwen3.8 max | 官方文档 · TokenDance · Qwen3.8 Max |
| mini | tokendance/qwen3.8-max-0902 | https://tokendance.space/models/qwen3.8-max-0902 | 官方文档 · TokenDance · qwen3.8 max 0902 | 官方文档 · TokenDance · Qwen3.8-Max-0902 |
| mini | tokendance/qwen3.7-max | https://tokendance.space/models/qwen3.7-max | 官方文档 · TokenDance · qwen3.7 max | 官方文档 · TokenDance · Qwen3.7 Max |
| mini | tokendance/qwen3.7-plus | https://tokendance.space/models/qwen3.7-plus | 官方文档 · TokenDance · qwen3.7 plus | 官方文档 · TokenDance · Qwen3.7 Plus |
| mini | tokendance/qwen3.6-max-preview | https://help.aliyun.com/zh/model-studio/qwen3-6-max | 原厂规格 · 百炼 · qwen3 6 max | 原厂规格 · 百炼 · Qwen3.6 Max |
| mini | tokendance/qwen3.6-plus | https://tokendance.space/models/qwen3.6-plus | 官方文档 · TokenDance · qwen3.6 plus | 官方文档 · TokenDance · Qwen3.6 Plus |
| mini | tokendance/qwen3.5-35b-a3b | https://tokendance.space/models/qwen3.5-35b-a3b | 官方文档 · TokenDance · qwen3.5 35b a3b | 官方文档 · TokenDance · Qwen3.5-35B-A3B |
| mini | tokendance/qwen3.5-flash | https://tokendance.space/models/qwen3.5-flash | 官方文档 · TokenDance · qwen3.5 flash | 官方文档 · TokenDance · Qwen3.5 Flash |
| mini | tokendance/qwen3.5-plus | https://tokendance.space/models/qwen3.5-plus | 官方文档 · TokenDance · qwen3.5 plus | 官方文档 · TokenDance · Qwen3.5 Plus |
| mini | tokendance/qwen3.5-plus | https://help.aliyun.com/zh/model-studio/model-depreciation | 原厂规格 · 百炼 · 模型下线公告 | 下线公告 · 百炼 · 模型下线公告 |
| mini | tokendance/seed-2.1-pro | https://tokendance.space/models/seed-2.1-pro | 官方文档 · TokenDance · seed 2.1 pro | 官方文档 · TokenDance · Seed-2.1-Pro |
| mini | tokendance/seed-2.1-turbo | https://tokendance.space/models/seed-2.1-turbo | 官方文档 · TokenDance · seed 2.1 turbo | 官方文档 · TokenDance · Seed-2.1-Turbo |
| mini | tokendance/seed-2.0-code | https://tokendance.space/models/seed-2.0-code | 官方文档 · TokenDance · seed 2.0 code | 官方文档 · TokenDance · Seed-2.0-Code |
| mini | tokendance/seed-2.0-lite | https://tokendance.space/models/seed-2.0-lite | 官方文档 · TokenDance · seed 2.0 lite | 官方文档 · TokenDance · Seed-2.0-Lite |
| mini | tokendance/seed-2.0-mini | https://tokendance.space/models/seed-2.0-mini | 官方文档 · TokenDance · seed 2.0 mini | 官方文档 · TokenDance · Seed-2.0-Mini |
| mini | tokendance/seed-2.0-pro | https://tokendance.space/models/seed-2.0-pro | 官方文档 · TokenDance · seed 2.0 pro | 官方文档 · TokenDance · Seed-2.0-Pro |
| mini | tokendance/seedream-5.0-lite | https://tokendance.space/models/seedream-5.0-lite | 官方文档 · TokenDance · seedream 5.0 lite | 官方文档 · TokenDance · Seedream 5.0 lite |
| mini | tokendance/seedream-5.0-pro | https://tokendance.space/models/seedream-5.0-pro | 官方文档 · TokenDance · seedream 5.0 pro | 官方文档 · TokenDance · Seedream 5.0 Pro |
| mini | tokendance/step-5-preview | https://tokendance.space/models/step-5-preview | 官方文档 · TokenDance · step 5 preview | 官方文档 · TokenDance · Step 5 Preview |
| mini | tokendance/step-5-preview | https://platform.stepfun.com/docs/zh/guides/models/step-5-preview | 原厂规格 · stepfun.com · step 5 preview | 原厂规格 · StepFun · Step 5 Preview |
| mini | tokendance/step-3.7-flash | https://tokendance.space/models/step-3.7-flash | 官方文档 · TokenDance · step 3.7 flash | 官方文档 · TokenDance · Step 3.7 Flash |
| mini | tokendance/step-3.5-flash | https://tokendance.space/models/step-3.5-flash | 官方文档 · TokenDance · step 3.5 flash | 官方文档 · TokenDance · Step 3.5 Flash |
| mini | tokendance/cogevol-base | https://tokendance.space/models/cogevol-base | 官方文档 · TokenDance · cogevol base | 官方文档 · TokenDance · CogEvol Base |
| mini | tokendance/cogevol-interactive-0828 | https://tokendance.space/models/cogevol-interactive-0828 | 官方文档 · TokenDance · cogevol interactive 0828 | 官方文档 · TokenDance · CogEvol Interactive 0828 |
| mini | tokendance/cogevol-slide-0828 | https://tokendance.space/models/cogevol-slide-0828 | 官方文档 · TokenDance · cogevol slide 0828 | 官方文档 · TokenDance · CogEvol Slide 0828 |
| mini | tokendance/dots-3-note-preview | https://tokendance.space/models/dots-3-note-preview | 官方文档 · TokenDance · dots 3 note preview | 官方文档 · TokenDance · Dots3-Note Preview（Free） |
| mini | tokendance/kimi-k3.1-pro | https://tokendance.space/models/kimi-k3.1-pro | 官方文档 · TokenDance · kimi k3.1 pro | 官方文档 · TokenDance · Kimi K3.1 Pro |
| mini | tokendance/ling-3.0-flash | https://tokendance.space/models/ling-3.0-flash | 官方文档 · TokenDance · ling 3.0 flash | 官方文档 · TokenDance · Ling 3.0 Flash |
| mini | tokendance/ling-3.1-flash | https://tokendance.space/models/ling-3.1-flash | 官方文档 · TokenDance · ling 3.1 flash | 官方文档 · TokenDance · Ling 3.1 Flash |
| mini | tokendance/longcat-2.0 | https://tokendance.space/models/longcat-2.0 | 官方文档 · TokenDance · longcat 2.0 | 官方文档 · TokenDance · LongCat-2.0 |
| mini | tokendance/mimo-v2.5 | https://tokendance.space/models/mimo-v2.5 | 官方文档 · TokenDance · mimo v2.5 | 官方文档 · TokenDance · MiMo-V2.5 |
| mini | tokendance/mimo-v2.5-pro | https://tokendance.space/models/mimo-v2.5-pro | 官方文档 · TokenDance · mimo v2.5 pro | 官方文档 · TokenDance · MiMo-V2.5-Pro |
| mini | tokendance/mimo-v2.6-flash | https://tokendance.space/models/mimo-v2.6-flash | 官方文档 · TokenDance · mimo v2.6 flash | 官方文档 · TokenDance · Mimo-V2.6-Flash |
| mini | tokendance/mimo-v2.6-flash | https://mimo.mi.com/docs/zh-CN/api/chat/openai-api | 原厂规格 · mimo.mi.com · openai api | 原厂规格 · MiMo · OpenAI API |
| mini | tokendance/mimo-v2.6-flash | https://mimo.mi.com/docs/zh-CN/usage-guide/multimodal-understanding/image-understanding | 原厂规格 · mimo.mi.com · image understanding | 原厂规格 · MiMo · Image Understanding |
| mini | tokendance/mimo-v2.6-pro | https://tokendance.space/models/mimo-v2.6-pro | 官方文档 · TokenDance · mimo v2.6 pro | 官方文档 · TokenDance · Mimo-V2.6-Pro |
| mini | tokendance/mimo-v2.6-pro | https://mimo.mi.com/docs/zh-CN/api/chat/openai-api | 原厂规格 · mimo.mi.com · openai api | 原厂规格 · MiMo · OpenAI API |
| mini | tokendance/mimo-v2.6-pro | https://mimo.mi.com/docs/zh-CN/usage-guide/multimodal-understanding/image-understanding | 原厂规格 · mimo.mi.com · image understanding | 原厂规格 · MiMo · Image Understanding |
| mini | tokendance/mimo-v2.6-ultraspeed | https://tokendance.space/models/mimo-v2.6-ultraspeed | 官方文档 · TokenDance · mimo v2.6 ultraspeed | 官方文档 · TokenDance · MiMo-V2.6-Pro-UltraSpeed |
| mini | tokendance/minimax-m3.1-flash | https://tokendance.space/models/minimax-m3.1-flash | 官方文档 · TokenDance · minimax m3.1 flash | 官方文档 · TokenDance · MiniMax M3.1 Flash |
| mini | tokendance/qwen3-vl-plus | https://tokendance.space/models/qwen3-vl-plus | 官方文档 · TokenDance · qwen3 vl plus | 官方文档 · TokenDance · Qwen3 VL Plus |
| mini | tokendance/seed-evolving | https://tokendance.space/models/seed-evolving | 官方文档 · TokenDance · seed evolving | 官方文档 · TokenDance · Seed-Evolving |
| mini | tokendance/spark-x2.5-1.7b | https://tokendance.space/models/spark-x2.5-1.7b | 官方文档 · TokenDance · spark x2.5 1.7b | 官方文档 · TokenDance · Spark-X2.5-1.7B |
| mini | tokendance/spark-x2.5-4b | https://tokendance.space/models/spark-x2.5-4b | 官方文档 · TokenDance · spark x2.5 4b | 官方文档 · TokenDance · Spark-X2.5-4B |
| mini | tokendance/unifuncs-s3 | https://tokendance.space/models/unifuncs-s3 | 官方文档 · TokenDance · unifuncs s3 | 官方文档 · TokenDance · Deep Search S3 |
| mini | tokendance/unifuncs-s3-pro | https://tokendance.space/models/unifuncs-s3-pro | 官方文档 · TokenDance · unifuncs s3 pro | 官方文档 · TokenDance · Deep Search S3 Pro |
| mini | tokendance/unifuncs-u3 | https://tokendance.space/models/unifuncs-u3 | 官方文档 · TokenDance · unifuncs u3 | 官方文档 · TokenDance · Deep Research U3 |
| mini | tokendance/unifuncs-u3-pro | https://tokendance.space/models/unifuncs-u3-pro | 官方文档 · TokenDance · unifuncs u3 pro | 官方文档 · TokenDance · Deep Research U3 Pro |
| mini | runware/bfl:flux@3-image-klein | https://runware.ai/docs/models/bfl-flux-3-image-klein | 官方文档 · runware.ai · bfl flux 3 image klein | 官方文档 · Runware · FLUX 3 Image Klein |
| mini | runware/bfl:flux@3-image-klein-base | https://runware.ai/docs/models/bfl-flux-3-image-klein-base | 官方文档 · runware.ai · bfl flux 3 image klein base | 官方文档 · Runware · FLUX 3 Image Klein Base |
| mini | runware/alibaba:qwen-image@2.1-turbo | https://runware.ai/docs/models/alibaba-qwen-image-2-1-turbo | 官方文档 · runware.ai · alibaba qwen image 2 1 turbo | 官方文档 · Runware · Qwen-Image-2.1-Turbo |
| mini | runware/google:nano-banana@2.1 | https://runware.ai/docs/models/google-nano-banana-2-1 | 官方文档 · runware.ai · google nano banana 2 1 | 官方文档 · Runware · Runware |
| mini | runware/bfl:flux@3-image | https://runware.ai/docs/models/bfl-flux-3-image | 官方文档 · runware.ai · bfl flux 3 image | 官方文档 · Runware · Runware |
| mini | runware/ideogram:4.5@0 | https://runware.ai/docs/models/ideogram-4-5 | 官方文档 · runware.ai · ideogram 4 5 | 官方文档 · Runware · Ideogram 4.5 |
| mini | runware/ideogram:4.5@precise-edit | https://runware.ai/docs/models/ideogram-4-5-precise-edit | 官方文档 · runware.ai · ideogram 4 5 precise edit | 官方文档 · Runware · Runware |
| mini | runware/bytedance:seedream@5.0-flash | https://runware.ai/docs/models/bytedance-seedream-5-0-flash | 官方文档 · runware.ai · bytedance seedream 5 0 flash | 官方文档 · Runware · Runware |
| mini | runware/recraft:v4.1@flash | https://www.recraft.ai/docs/api-reference/models/recraft-v4-1-flash | 官方文档 · recraft.ai · recraft v4 1 flash | 官方文档 · Recraft · Runware |
| mini | runware/alibaba:qwen-image@2.1-pro | https://runware.ai/docs/models/alibaba-qwen-image-2-1-pro | 官方文档 · runware.ai · alibaba qwen image 2 1 pro | 官方文档 · Runware · Runware |
| mini | runware/openai:gpt-image@2.5-flare | https://runware.ai/docs/models/openai-gpt-image-2-5-flare | 官方文档 · runware.ai · openai gpt image 2 5 flare | 官方文档 · Runware · GPT-Image-2.5 Flare |
| mini | runware/openai:gpt-image@2.5-sunburst | https://runware.ai/docs/models/openai-gpt-image-2-5-sunburst | 官方文档 · runware.ai · openai gpt image 2 5 sunburst | 官方文档 · Runware · GPT-Image-2.5 Sunburst |
| mini | runware/xai:grok-imagine@image-2.0 | https://runware.ai/docs/models/xai-grok-imagine-image-2-0 | 官方文档 · runware.ai · xai grok imagine image 2 0 | 官方文档 · Runware · Grok Imagine Image 2.0 |
| mini | runware/alibaba:qwen-image@3.0 | https://runware.ai/docs/models/alibaba-qwen-image-3-0 | 官方文档 · runware.ai · alibaba qwen image 3 0 | 官方文档 · Runware · Qwen-Image-3.0 |
| mini | runware/alibaba:qwen-image@3.0-pro | https://runware.ai/docs/models/alibaba-qwen-image-3-0-pro | 官方文档 · runware.ai · alibaba qwen image 3 0 pro | 官方文档 · Runware · Qwen-Image-3.0-Pro |
| mini | runware/deepseek:v4@flash | https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash | 官方文档 · Hugging Face · DeepSeek V4 Flash | 官方文档 · Hugging Face · DeepSeek-V4-Flash-0731 |
| mini | runware/prunaai:p-image@ideogram | https://runware.ai/docs/models/prunaai-p-image-ideogram | 官方文档 · runware.ai · prunaai p image ideogram | 官方文档 · Runware · P-Image-Ideogram |
| mini | runware/krea:krea@2-turbo | https://runware.ai/docs/models/krea-2-turbo | 官方文档 · runware.ai · krea 2 turbo | 官方文档 · Runware · Krea 2 Turbo |
| mini | runware/bytedance:seedream@5.0-pro | https://runware.ai/docs/models/bytedance-seedream-5-0-pro | 官方文档 · runware.ai · bytedance seedream 5 0 pro | 官方文档 · Runware · Seedream 5.0 Pro |
| mini | runware/meta:muse@image | https://runware.ai/docs/models/meta-muse-image | 官方文档 · runware.ai · meta muse image | 官方文档 · Runware · Muse Image |
| mini | runware/google:nano-banana@2-lite | https://runware.ai/docs/models/google-nano-banana-2-lite | 官方文档 · runware.ai · google nano banana 2 lite | 官方文档 · Runware · Nano Banana 2 Lite |
| mini | runware/krea:krea@2-raw | https://runware.ai/docs/models/krea-2-raw | 官方文档 · runware.ai · krea 2 raw | 官方文档 · Runware · Krea 2 Raw |
| mini | runware/rundiffusion:300@100 | https://runware.ai/docs/models/rundiffusion-juggernaut-z-fast | 官方文档 · runware.ai · rundiffusion juggernaut z fast | 官方文档 · Runware · Juggernaut Z Fast |
| mini | runware/anthropic:claude@fable-5 | https://runware.ai/docs/models/anthropic-claude-fable-5 | 官方文档 · runware.ai · anthropic claude fable 5 | 官方文档 · Runware · Claude Fable 5 |
| mini | runware/sourceful:riverflow-2.5@fast | https://runware.ai/docs/models/sourceful-riverflow-2-5-fast | 官方文档 · runware.ai · sourceful riverflow 2 5 fast | 官方文档 · Runware · Riverflow 2.5 Fast |
| mini | runware/sourceful:riverflow-2.5@pro | https://runware.ai/docs/models/sourceful-riverflow-2-5-pro | 官方文档 · runware.ai · sourceful riverflow 2 5 pro | 官方文档 · Runware · Riverflow 2.5 Pro |
| mini | runware/ideogram:4@0 | https://runware.ai/docs/models/ideogram-4-0 | 官方文档 · runware.ai · ideogram 4 0 | 官方文档 · Runware · Ideogram 4.0 |
| mini | runware/ideogram:4@q | https://runware.ai/docs/models/ideogram-4-0q | 官方文档 · runware.ai · ideogram 4 0q | 官方文档 · Runware · Ideogram 4.0q |
| mini | runware/ideogram:4@remix | https://runware.ai/docs/models/ideogram-4-0-remix | 官方文档 · runware.ai · ideogram 4 0 remix | 官方文档 · Runware · Ideogram 4.0 Remix |
| mini | runware/krea:krea@2-medium-turbo | https://runware.ai/docs/models/krea-2-medium-turbo | 官方文档 · runware.ai · krea 2 medium turbo | 官方文档 · Runware · Krea 2 Medium Turbo |
| mini | runware/minimax:m3@0 | https://runware.ai/docs/models/minimax-m3 | 官方文档 · runware.ai · minimax m3 | 官方文档 · Runware · MiniMax M3 |
| mini | runware/anthropic:claude@opus-4.8 | https://runware.ai/docs/models/anthropic-claude-opus-4-8 | 官方文档 · runware.ai · anthropic claude opus 4 8 | 官方文档 · Runware · Claude Opus 4.8 |
| mini | runware/krea:krea@2-large | https://runware.ai/docs/models/krea-2-large | 官方文档 · runware.ai · krea 2 large | 官方文档 · Runware · Krea 2 Large |
| mini | runware/krea:krea@2-medium | https://runware.ai/docs/models/krea-2-medium | 官方文档 · runware.ai · krea 2 medium | 官方文档 · Runware · Krea 2 Medium |
| mini | runware/google:gemini@3.5-flash | https://runware.ai/docs/models/google-gemini-3-5-flash | 官方文档 · runware.ai · google gemini 3 5 flash | 官方文档 · Runware · Gemini 3.5 Flash |
| mini | runware/recraft:v4.1-pro@0 | https://runware.ai/docs/models/recraft-v4-1-pro | 官方文档 · runware.ai · recraft v4 1 pro | 官方文档 · Runware · Recraft V4.1 Pro |
| mini | runware/recraft:v4.1-utility-pro@0 | https://runware.ai/docs/models/recraft-v4-1-utility-pro | 官方文档 · runware.ai · recraft v4 1 utility pro | 官方文档 · Runware · Recraft V4.1 Utility Pro |
| mini | runware/recraft:v4.1-utility@0 | https://runware.ai/docs/models/recraft-v4-1-utility | 官方文档 · runware.ai · recraft v4 1 utility | 官方文档 · Runware · Recraft V4.1 Utility |
| mini | runware/recraft:v4.1@0 | https://runware.ai/docs/models/recraft-v4-1 | 官方文档 · runware.ai · recraft v4 1 | 官方文档 · Runware · Recraft V4.1 |
| mini | runware/xai:grok-imagine@image-quality | https://docs.x.ai/developers/migration/imagine-image-quality-nov-2 | 下线公告 · x.ai · imagine image quality nov 2 | 下线公告 · xAI · Imagine Image Quality Nov 2 |
| mini | runware/luma:uni@1 | https://runware.ai/docs/models/luma-uni-1 | 官方文档 · runware.ai · luma uni 1 | 官方文档 · Runware · UNI-1 |
| mini | runware/luma:uni@1-max | https://runware.ai/docs/models/luma-uni-1-max | 官方文档 · runware.ai · luma uni 1 max | 官方文档 · Runware · UNI-1 Max |
| mini | runware/xai:grok@4.3 | https://runware.ai/docs/models/xai-grok-4-3 | 官方文档 · runware.ai · xai grok 4 3 | 官方文档 · Runware · Grok 4.3 |
| mini | runware/rundiffusion:200@100 | https://runware.ai/docs/models/rundiffusion-juggernaut-z | 官方文档 · runware.ai · rundiffusion juggernaut z | 官方文档 · Runware · Juggernaut Z |
| mini | runware/openai:gpt@5.5 | https://runware.ai/docs/models/openai-gpt-5-5 | 官方文档 · runware.ai · openai gpt 5 5 | 官方文档 · Runware · GPT-5.5 |
| mini | runware/openai:gpt-image@2 | https://runware.ai/docs/models/openai-gpt-image-2 | 官方文档 · runware.ai · openai gpt image 2 | 官方文档 · Runware · GPT Image 2 |
| mini | runware/anthropic:claude@opus-4.7 | https://runware.ai/docs/models/anthropic-claude-opus-4-7 | 官方文档 · runware.ai · anthropic claude opus 4 7 | 官方文档 · Runware · Claude Opus 4.7 |
| mini | runware/baidu:ernie-image@0 | https://runware.ai/docs/models/baidu-ernie-image | 官方文档 · runware.ai · baidu ernie image | 官方文档 · Runware · ERNIE-Image |
| mini | runware/baidu:ernie-image@turbo | https://runware.ai/docs/models/baidu-ernie-image-turbo | 官方文档 · runware.ai · baidu ernie image turbo | 官方文档 · Runware · ERNIE-Image-Turbo |
| mini | runware/imagineart:2.0@0 | https://runware.ai/docs/models/imagineart-2-0 | 官方文档 · runware.ai · imagineart 2 0 | 官方文档 · Runware · ImagineArt 2.0 |
| mini | runware/zai:glm@5.1 | https://runware.ai/docs/models/zai-glm-5-1 | 官方文档 · runware.ai · zai glm 5 1 | 官方文档 · Runware · GLM-5.1 |
| mini | runware/google:gemma@4-31b | https://runware.ai/docs/models/google-gemma-4-31b | 官方文档 · runware.ai · google gemma 4 31b | 官方文档 · Runware · Gemma 4 31B |
| mini | runware/alibaba:wan@2.7-image | https://runware.ai/docs/models/alibaba-wan2-7-image | 官方文档 · runware.ai · alibaba wan2 7 image | 官方文档 · Runware · Wan2.7 Image |
| mini | runware/alibaba:wan@2.7-image-pro | https://runware.ai/docs/models/alibaba-wan2-7-image-pro | 官方文档 · runware.ai · alibaba wan2 7 image pro | 官方文档 · Runware · Wan2.7 Image Pro |
| mini | runware/runware:400@6 | https://runware.ai/docs/models/bfl-flux-2-klein-9b-kv | 官方文档 · runware.ai · bfl flux 2 klein 9b kv | 官方文档 · Runware · FLUX.2 [klein] 9B KV |
| mini | runware/minimax:m2.7@0 | https://runware.ai/docs/models/minimax-m2-7 | 官方文档 · runware.ai · minimax m2 7 | 官方文档 · Runware · MiniMax M2.7 |
| mini | runware/minimax:m2.7@highspeed | https://runware.ai/docs/models/minimax-m2-7-highspeed | 官方文档 · runware.ai · minimax m2 7 highspeed | 官方文档 · Runware · MiniMax M2.7 Highspeed |
| mini | runware/openai:gpt@5.4-mini | https://runware.ai/docs/models/openai-gpt-5-4-mini | 官方文档 · runware.ai · openai gpt 5 4 mini | 官方文档 · Runware · GPT-5.4 Mini |
| mini | runware/openai:gpt@5.4-nano | https://runware.ai/docs/models/openai-gpt-5-4-nano | 官方文档 · runware.ai · openai gpt 5 4 nano | 官方文档 · Runware · GPT-5.4 Nano |
| mini | runware/openai:gpt@5.4 | https://runware.ai/docs/models/openai-gpt-5-4 | 官方文档 · runware.ai · openai gpt 5 4 | 官方文档 · Runware · GPT-5.4 |
| mini | runware/openai:gpt@5.4-pro | https://runware.ai/docs/models/openai-gpt-5-4-pro | 官方文档 · runware.ai · openai gpt 5 4 pro | 官方文档 · Runware · GPT-5.4 Pro |
| mini | runware/google:gemini@3.1-flash-lite | https://runware.ai/docs/models/google-gemini-3-1-flash-lite | 官方文档 · runware.ai · google gemini 3 1 flash lite | 官方文档 · Runware · Gemini 3.1 Flash Lite |
| mini | runware/google:4@3 | https://runware.ai/docs/models/google-nano-banana-2 | 官方文档 · runware.ai · google nano banana 2 | 官方文档 · Runware · Nano Banana 2 |
| mini | runware/bytedance:seedream@5.0-lite | https://runware.ai/docs/models/bytedance-seedream-5-0-lite | 官方文档 · runware.ai · bytedance seedream 5 0 lite | 官方文档 · Runware · Seedream 5.0 Lite |
| mini | runware/google:gemini@3.1-pro | https://runware.ai/docs/models/google-gemini-3-1-pro | 官方文档 · runware.ai · google gemini 3 1 pro | 官方文档 · Runware · Gemini 3.1 Pro |
| mini | runware/anthropic:claude@sonnet-4.6 | https://runware.ai/docs/models/anthropic-claude-sonnet-4-6 | 官方文档 · runware.ai · anthropic claude sonnet 4 6 | 官方文档 · Runware · Claude Sonnet 4.6 |
| mini | runware/recraft:v4-pro@0 | https://runware.ai/docs/models/recraft-v4-pro | 官方文档 · runware.ai · recraft v4 pro | 官方文档 · Runware · Recraft V4 Pro |
| mini | runware/recraft:v4@0 | https://runware.ai/docs/models/recraft-v4 | 官方文档 · runware.ai · recraft v4 | 官方文档 · Runware · Recraft V4 |
| mini | runware/alibaba:qwen-image@2.0 | https://runware.ai/docs/models/alibaba-qwen-image-2-0 | 官方文档 · runware.ai · alibaba qwen image 2 0 | 官方文档 · Runware · Qwen-Image-2.0 |
| mini | runware/alibaba:qwen-image@2.0-pro | https://runware.ai/docs/models/alibaba-qwen-image-2-0-pro | 官方文档 · runware.ai · alibaba qwen image 2 0 pro | 官方文档 · Runware · Qwen-Image-2.0-Pro |
| mini | runware/klingai:kling-image@3 | https://runware.ai/docs/models/klingai-image-3-0 | 官方文档 · runware.ai · klingai image 3 0 | 官方文档 · Runware · Klingai Image 3-0 |
| mini | runware/klingai:kling-image@o3 | https://runware.ai/docs/models/klingai-image-o3 | 官方文档 · runware.ai · klingai image o3 | 官方文档 · Runware · Klingai Image O3 |
| mini | runware/sourceful:riverflow-2.0@fast | https://runware.ai/docs/models/sourceful-riverflow-2-0-fast | 官方文档 · runware.ai · sourceful riverflow 2 0 fast | 官方文档 · Runware · Riverflow 2.0 Fast |
| mini | runware/sourceful:riverflow-2.0@pro | https://runware.ai/docs/models/sourceful-riverflow-2-0-pro | 官方文档 · runware.ai · sourceful riverflow 2 0 pro | 官方文档 · Runware · Riverflow 2.0 Pro |
| mini | runware/xai:grok-imagine@image | https://runware.ai/docs/models/xai-grok-imagine-image | 官方文档 · runware.ai · xai grok imagine image | 官方文档 · Runware · Grok Imagine Image |
| mini | runware/runware:z-image@0 | https://runware.ai/docs/models/alibaba-z-image | 官方文档 · runware.ai · alibaba z image | 官方文档 · Runware · Z-Image |
| mini | runware/runware:400@2 | https://runware.ai/docs/models/bfl-flux-2-klein-9b | 官方文档 · runware.ai · bfl flux 2 klein 9b | 官方文档 · Runware · FLUX.2 [klein] 9B |
| mini | runware/bria:21@1 | https://runware.ai/docs/models/bria-fibo-2-0-edit | 官方文档 · runware.ai · bria fibo 2 0 edit | 官方文档 · Runware · Bria FIBO 2.0 Edit |
| mini | runware/imagineart:1.5-pro@0 | https://runware.ai/docs/models/imagineart-1-5-pro | 官方文档 · runware.ai · imagineart 1 5 pro | 官方文档 · Runware · ImagineArt 1.5 Pro |
| mini | runware/runware:400@3 | https://runware.ai/docs/models/bfl-flux-2-klein-9b-base | 官方文档 · runware.ai · bfl flux 2 klein 9b base | 官方文档 · Runware · FLUX.2 [klein] 9B Base |
| mini | runware/runware:400@4 | https://runware.ai/docs/models/bfl-flux-2-klein-4b | 官方文档 · runware.ai · bfl flux 2 klein 4b | 官方文档 · Runware · FLUX.2 [klein] 4B |
| mini | runware/runware:400@5 | https://runware.ai/docs/models/bfl-flux-2-klein-4b-base | 官方文档 · runware.ai · bfl flux 2 klein 4b base | 官方文档 · Runware · FLUX.2 [klein] 4B Base |
| mini | runware/bria:20@3 | https://runware.ai/docs/models/bria-fibo-lite | 官方文档 · runware.ai · bria fibo lite | 官方文档 · Runware · Bria FIBO Lite |
| mini | runware/runware:twinflow-z-image-turbo@0 | https://runware.ai/docs/models/twinflow-z-image-turbo | 官方文档 · runware.ai · twinflow z image turbo | 官方文档 · Runware · TwinFlow Z-Image-Turbo |
| mini | runware/alibaba:qwen-image@2512 | https://runware.ai/docs/models/alibaba-qwen-image-2512 | 官方文档 · runware.ai · alibaba qwen image 2512 | 官方文档 · Runware · Qwen-Image-2512 |
| mini | runware/google:gemini@3-flash | https://runware.ai/docs/models/google-gemini-3-flash | 官方文档 · runware.ai · google gemini 3 flash | 官方文档 · Runware · Gemini 3 Flash |
| mini | runware/alibaba:wan@2.6-image | https://runware.ai/docs/models/alibaba-wan2-6-image | 官方文档 · runware.ai · alibaba wan2 6 image | 官方文档 · Runware · Wan2.6 Image |
| mini | runware/bfl:7@1 | https://runware.ai/docs/models/bfl-flux-2-max | 官方文档 · runware.ai · bfl flux 2 max | 官方文档 · Runware · FLUX.2 [max] |
| mini | runware/openai:4@1 | https://runware.ai/docs/models/openai-gpt-image-1-5 | 官方文档 · runware.ai · openai gpt image 1 5 | 官方文档 · Runware · GPT Image 1.5 |
| mini | runware/bytedance:seedream@4.5 | https://runware.ai/docs/models/bytedance-seedream-4-5 | 官方文档 · runware.ai · bytedance seedream 4 5 | 官方文档 · Runware · Seedream 4.5 |
| mini | runware/klingai:kling-image@o1 | https://runware.ai/docs/models/klingai-image-o1 | 官方文档 · runware.ai · klingai image o1 | 官方文档 · Runware · Klingai Image O1 |
| mini | runware/prunaai:1@1 | https://runware.ai/docs/models/prunaai-p-image | 官方文档 · runware.ai · prunaai p image | 官方文档 · Runware · P-Image |
| mini | runware/bfl:5@1 | https://runware.ai/docs/models/bfl-flux-2-pro | 官方文档 · runware.ai · bfl flux 2 pro | 官方文档 · Runware · FLUX.2 [pro] |
| mini | runware/runware:kandinsky-5.0-image-lite@1 | https://runware.ai/docs/models/kandinsky-5-0-image-lite | 官方文档 · runware.ai · kandinsky 5 0 image lite | 官方文档 · Runware · Kandinsky 5.0 Image Lite |
| mini | runware/runware:z-image@turbo | https://runware.ai/docs/models/alibaba-z-image-turbo | 官方文档 · runware.ai · alibaba z image turbo | 官方文档 · Runware · Z-Image-Turbo |
| mini | runware/alibaba:qwen-image-edit@2511 | https://runware.ai/docs/models/alibaba-qwen-image-edit-2511 | 官方文档 · runware.ai · alibaba qwen image edit 2511 | 官方文档 · Runware · Qwen-Image-Edit-2511 |
| mini | runware/bfl:6@1 | https://runware.ai/docs/models/bfl-flux-2-flex | 官方文档 · runware.ai · bfl flux 2 flex | 官方文档 · Runware · FLUX.2 [flex] |
| mini | runware/runware:400@1 | https://runware.ai/docs/models/bfl-flux-2-dev | 官方文档 · runware.ai · bfl flux 2 dev | 官方文档 · Runware · FLUX.2 [dev] |
| mini | runware/google:4@2 | https://runware.ai/docs/models/google-nano-banana-pro | 官方文档 · runware.ai · google nano banana pro | 官方文档 · Runware · Nano Banana Pro |
| mini | runware/imagineart:1@5 | https://runware.ai/docs/models/imagineart-1-5 | 官方文档 · runware.ai · imagineart 1 5 | 官方文档 · Runware · ImagineArt 1.5 |
| mini | runware/prunaai:2@1 | https://runware.ai/docs/models/prunaai-p-image-edit | 官方文档 · runware.ai · prunaai p image edit | 官方文档 · Runware · P-Image-Edit |
| mini | runware/bria:20@1 | https://runware.ai/docs/models/bria-fibo-2-0 | 官方文档 · runware.ai · bria fibo 2 0 | 官方文档 · Runware · Bria FIBO 2.0 |
| mini | runware/anthropic:claude@haiku-4.5 | https://runware.ai/docs/models/anthropic-claude-haiku-4-5 | 官方文档 · runware.ai · anthropic claude haiku 4 5 | 官方文档 · Runware · Claude Haiku 4.5 |
| mini | runware/runware:201@10 | https://runware.ai/docs/models/alibaba-wan2-5-preview-image | 官方文档 · runware.ai · alibaba wan2 5 preview image | 官方文档 · Runware · Wan2.5-Preview Image |
| mini | runware/runware:108@22 | https://runware.ai/docs/models/alibaba-qwen-image-edit-plus | 官方文档 · runware.ai · alibaba qwen image edit plus | 官方文档 · Runware · Qwen-Image-Edit-Plus |
| mini | runware/bria:11@1 | https://runware.ai/docs/models/bria-image-replace-background | 官方文档 · runware.ai · bria image replace background | 官方文档 · Runware · Bria Image Replace Background |
| mini | runware/runware:111@1 | https://runware.ai/docs/models/flux-1-dev-srpo | 官方文档 · runware.ai · flux 1 dev srpo | 官方文档 · Runware · FLUX.1 [dev] SRPO |
| mini | runware/bytedance:5@0 | https://runware.ai/docs/models/bytedance-seedream-4-0 | 官方文档 · runware.ai · bytedance seedream 4 0 | 官方文档 · Runware · Seedream 4.0 |
| mini | runware/google:4@1 | https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-image | 官方文档 · ai.google.dev · gemini 2.5 flash image | 官方文档 · Google · Gemini 2.5 Flash Image |
| mini | runware/runware:108@20 | https://runware.ai/docs/models/alibaba-qwen-image-edit | 官方文档 · runware.ai · alibaba qwen image edit | 官方文档 · Runware · Qwen-Image-Edit |
| mini | runware/runway:4@2 | https://runware.ai/docs/models/runway-gen-4-image-turbo | 官方文档 · runware.ai · runway gen 4 image turbo | 官方文档 · Runware · Runway Gen-4 Image Turbo |
| mini | runware/openai:gpt@5-mini | https://runware.ai/docs/models/openai-gpt-5-mini | 官方文档 · runware.ai · openai gpt 5 mini | 官方文档 · Runware · GPT-5 Mini |
| mini | runware/openai:gpt@5-nano | https://runware.ai/docs/models/openai-gpt-5-nano | 官方文档 · runware.ai · openai gpt 5 nano | 官方文档 · Runware · GPT-5 Nano |
| mini | runware/runware:108@1 | https://runware.ai/docs/models/alibaba-qwen-image | 官方文档 · runware.ai · alibaba qwen image | 官方文档 · Runware · Qwen-Image |
| mini | runware/runware:107@1 | https://runware.ai/docs/models/krea-flux-1-krea-dev | 官方文档 · runware.ai · krea flux 1 krea dev | 官方文档 · Runware · FLUX.1 Krea [dev] |
| mini | runware/bfl:3@1 | https://runware.ai/docs/models/bfl-flux-1-kontext-pro | 官方文档 · runware.ai · bfl flux 1 kontext pro | 官方文档 · Runware · FLUX.1 Kontext [pro] |
| mini | runware/bfl:4@1 | https://runware.ai/docs/models/bfl-flux-1-kontext-max | 官方文档 · runware.ai · bfl flux 1 kontext max | 官方文档 · Runware · FLUX.1 Kontext [max] |
| mini | runware/runware:106@1 | https://runware.ai/docs/models/bfl-flux-1-kontext-dev | 官方文档 · runware.ai · bfl flux 1 kontext dev | 官方文档 · Runware · FLUX.1 Kontext [dev] |
| mini | runware/runware:5@1 | https://runware.ai/docs/models/stabilityai-stable-diffusion-3 | 官方文档 · runware.ai · stabilityai stable diffusion 3 | 官方文档 · Runware · Stable Diffusion 3 |
| mini | runware/bria:10@1 | https://runware.ai/docs/models/bria-3-2 | 官方文档 · runware.ai · bria 3 2 | 官方文档 · Runware · Bria 3.2 |
| mini | runware/runway:4@1 | https://runware.ai/docs/models/runway-gen-4-image | 官方文档 · runware.ai · runway gen 4 image | 官方文档 · Runware · Runway Gen-4 Image |
| mini | runware/ideogram:4@3 | https://runware.ai/docs/models/ideogram-3-0-edit | 官方文档 · runware.ai · ideogram 3 0 edit | 官方文档 · Runware · Ideogram 3.0 Edit |
| mini | runware/ideogram:4@2 | https://runware.ai/docs/models/ideogram-3-0-remix | 官方文档 · runware.ai · ideogram 3 0 remix | 官方文档 · Runware · Ideogram 3.0 Remix |
| mini | runware/openai:1@2 | https://runware.ai/docs/models/openai-gpt-image-1-mini | 官方文档 · runware.ai · openai gpt image 1 mini | 官方文档 · Runware · GPT Image 1 Mini |
| mini | runware/runware:97@2 | https://runware.ai/docs/models/hidream-i1-dev | 官方文档 · runware.ai · hidream i1 dev | 官方文档 · Runware · HiDream-I1 Dev |
| mini | runware/runware:97@1 | https://runware.ai/docs/models/hidream-i1-full | 官方文档 · runware.ai · hidream i1 full | 官方文档 · Runware · HiDream-I1 Full |
| mini | runware/runware:97@3 | https://runware.ai/docs/models/hidream-i1-fast | 官方文档 · runware.ai · hidream i1 fast | 官方文档 · Runware · HiDream-I1 Fast |
| mini | runware/vidu:q1@image | https://runware.ai/docs/models/vidu-q1-image | 官方文档 · runware.ai · vidu q1 image | 官方文档 · Runware · Vidu Q1 |
| mini | runware/ideogram:4@1 | https://runware.ai/docs/models/ideogram-3-0 | 官方文档 · runware.ai · ideogram 3 0 | 官方文档 · Runware · Ideogram 3.0 |
| mini | runware/ideogram:4@5 | https://runware.ai/docs/models/ideogram-3-0-replace-background | 官方文档 · runware.ai · ideogram 3 0 replace background | 官方文档 · Runware · Ideogram 3.0 Replace Background |
| mini | runware/openai:1@1 | https://developers.openai.com/api/docs/models/gpt-image-1 | 原厂规格 · developers.openai.com · gpt image 1 | 原厂规格 · OpenAI · GPT Image 1 |
| mini | runware/rundiffusion:110@101 | https://runware.ai/docs/models/rundiffusion-juggernaut-lightning-flux | 官方文档 · runware.ai · rundiffusion juggernaut lightning flux | 官方文档 · Runware · Juggernaut Lightning Flux |
| mini | runware/rundiffusion:120@100 | https://runware.ai/docs/models/rundiffusion-juggernaut-base-flux | 官方文档 · runware.ai · rundiffusion juggernaut base flux | 官方文档 · Runware · Juggernaut Base Flux |
| mini | runware/rundiffusion:130@100 | https://runware.ai/docs/models/rundiffusion-juggernaut-pro-flux | 官方文档 · runware.ai · rundiffusion juggernaut pro flux | 官方文档 · Runware · Juggernaut Pro Flux |
| mini | runware/ideogram:2@1 | https://runware.ai/docs/models/ideogram-2a | 官方文档 · runware.ai · ideogram 2a | 官方文档 · Runware · Ideogram 2a |
| mini | runware/ideogram:2@2 | https://runware.ai/docs/models/ideogram-2a-remix | 官方文档 · runware.ai · ideogram 2a remix | 官方文档 · Runware · Ideogram 2a Remix |
| mini | runware/runware:102@1 | https://runware.ai/docs/models/bfl-flux-1-fill-dev | 官方文档 · runware.ai · bfl flux 1 fill dev | 官方文档 · Runware · FLUX.1 Fill [dev] |
| mini | runware/bfl:2@2 | https://runware.ai/docs/models/bfl-flux-1-1-pro-ultra | 官方文档 · runware.ai · bfl flux 1 1 pro ultra | 官方文档 · Runware · FLUX.1.1 [pro] Ultra |
| mini | runware/bfl:1@2 | https://runware.ai/docs/models/bfl-flux-1-fill-pro | 官方文档 · runware.ai · bfl flux 1 fill pro | 官方文档 · Runware · FLUX.1 Fill [pro] |
| mini | runware/ideogram:3@2 | https://runware.ai/docs/models/ideogram-2-0-remix | 官方文档 · runware.ai · ideogram 2 0 remix | 官方文档 · Runware · Ideogram 2.0 Remix |
| mini | runware/bfl:2@1 | https://runware.ai/docs/models/bfl-flux-1-1-pro | 官方文档 · runware.ai · bfl flux 1 1 pro | 官方文档 · Runware · FLUX.1.1 [pro] |
| mini | runware/ideogram:3@1 | https://runware.ai/docs/models/ideogram-2-0 | 官方文档 · runware.ai · ideogram 2 0 | 官方文档 · Runware · Ideogram 2.0 |
| mini | runware/runware:100@1 | https://runware.ai/docs/models/bfl-flux-1-schnell | 官方文档 · runware.ai · bfl flux 1 schnell | 官方文档 · Runware · FLUX.1 [schnell] |
| mini | runware/runware:101@1 | https://runware.ai/docs/models/bfl-flux-1-dev | 官方文档 · runware.ai · bfl flux 1 dev | 官方文档 · Runware · FLUX.1 [dev] |
| mini | runware/runware:150@2 | https://runware.ai/docs/models/meta-llava-1-6-mistral-7b | 官方文档 · runware.ai · meta llava 1 6 mistral 7b | 官方文档 · Runware · LLaVA-1.6-Mistral-7B |
| mini | runware/runware:152@1 | https://runware.ai/docs/models/alibaba-qwen2-5-vl-3b-instruct | 官方文档 · runware.ai · alibaba qwen2 5 vl 3b instruct | 官方文档 · Runware · Qwen2.5-VL-3B-Instruct |
| mini | runware/runware:152@2 | https://runware.ai/docs/models/alibaba-qwen2-5-vl-7b-instruct | 官方文档 · runware.ai · alibaba qwen2 5 vl 7b instruct | 官方文档 · Runware · Qwen2.5-VL-7B-Instruct |
| mini | runware/civitai:101055@128078 | https://runware.ai/docs/models/stabilityai-stable-diffusion-xl-v1-0-vae-fix | 官方文档 · runware.ai · stabilityai stable diffusion xl v1 0 vae fix | 官方文档 · Runware · Stable Diffusion XL v1.0 VAE Fix |
| mini | tokenhub/deepseek-v4.1-flash-1017 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| mini | tokenhub/deepseek/deepseek-v4-flash-vision-exp | https://api-docs.deepseek.com/news/news260821/ | 官方文档 · DeepSeek · news260821 | 官方文档 · DeepSeek · 更新日志 2026-08-21 |
| mini | tokenhub/deepseek-v4-pro-0813 | https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro-0813 | 官方文档 · Hugging Face · DeepSeek V4 Pro 0813 | 官方文档 · Hugging Face · DeepSeek-V4-Pro 0813 正式版 |
| mini | tokenhub/deepseek/deepseek-v4-pro-0813 | https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro-0813 | 官方文档 · Hugging Face · DeepSeek V4 Pro 0813 | 官方文档 · Hugging Face · DeepSeek-V4-Pro 0813 |
| mini | tokenhub/deepseek-v4-flash-0731 | https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731 | 官方文档 · Hugging Face · DeepSeek V4 Flash 0731 | 官方文档 · Hugging Face · DeepSeek-V4-Flash 0731 正式版 |
| mini | tokenhub/deepseek/deepseek-v4-flash-0731 | https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731 | 官方文档 · Hugging Face · DeepSeek V4 Flash 0731 | 官方文档 · Hugging Face · DeepSeek-V4-Flash 0731 |
| mini | tokenhub/deepseek-v4-flash | https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash | 官方文档 · Hugging Face · DeepSeek V4 Flash | 官方文档 · Hugging Face · DeepSeek-V4-Flash |
| mini | tokenhub/deepseek-v4-flash-202605 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| mini | tokenhub/deepseek-v4-pro-202606 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| mini | tokenhub/glm-5.3 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.3 | 官方文档 · bigmodel.cn · glm 5.3 | 官方文档 · 智谱 · GLM-5.3 |
| mini | tokenhub/glm-5.3-flash | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5.3-flash | 官方文档 · bigmodel.cn · glm 5.3 flash | 官方文档 · 智谱 · GLM-5.3-Flash |
| mini | tokenhub/glm-5.3-flashx | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5.3-flash | 官方文档 · bigmodel.cn · glm 5.3 flash | 官方文档 · 智谱 · GLM 5.3 Flash |
| mini | tokenhub/glm-5.2 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.2 | 官方文档 · bigmodel.cn · glm 5.2 | 官方文档 · 智谱 · GLM-5.2 |
| mini | tokenhub/glm-5.1 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.1 | 官方文档 · bigmodel.cn · glm 5.1 | 官方文档 · 智谱 · GLM-5.1（2026-10-08下线） |
| mini | tokenhub/glm-5 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5 | 官方文档 · bigmodel.cn · glm 5 | 官方文档 · 智谱 · GLM-5（2026-10-08下线） |
| mini | tokenhub/glm-5-turbo | https://docs.bigmodel.cn/cn/guide/models/text/glm-5-turbo | 官方文档 · bigmodel.cn · glm 5 turbo | 官方文档 · 智谱 · GLM-5-Turbo（2026-10-08下线） |
| mini | tokenhub/glm-5v-turbo | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5v-turbo | 官方文档 · bigmodel.cn · glm 5v turbo | 官方文档 · 智谱 · GLM-5V-Turbo（2026-10-30下线） |
| mini | tokenhub/hy4 | https://cloud.tencent.com/document/product/1823/132252 | 官方文档 · cloud.tencent.com · 132252 | 官方文档 · 腾讯云 · 文档 132252 |
| mini | tokenhub/hy3 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| mini | tokenhub/kimi-k2.7-code-highspeed | https://www.kimi.com/code/docs/en/kimi-code/models | 官方文档 · kimi.com · 模型列表 | 官方文档 · Kimi · 模型列表 |
| mini | tokenhub/kimi-k2.6 | https://huggingface.co/moonshotai/Kimi-K2.6 | 官方文档 · Hugging Face · Kimi K2.6 | 官方文档 · Hugging Face · Kimi-K2.6 |
| mini | tokenhub/minimax-m3 | https://huggingface.co/MiniMaxAI/MiniMax-M3 | 官方文档 · Hugging Face · MiniMax M3 | 官方文档 · Hugging Face · MiniMax-M3 |
| mini | tokenhub/minimax-m2.7 | https://huggingface.co/MiniMaxAI/MiniMax-M2.7 | 官方文档 · Hugging Face · MiniMax M2.7 | 官方文档 · Hugging Face · MiniMax-M2.7 |
| mini | tokenhub/step-5-preview | https://platform.stepfun.com/docs/zh/guides/models/step-5-preview | 官方文档 · stepfun.com · step 5 preview | 官方文档 · StepFun · Step 5 Preview |
| mini | tokenhub/deepseek/deepseek-flash | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| mini | tokenhub/hunyuan-t1-vision-20250916 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| mini | tokenhub/hy-image-v3 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| mini | tokenhub/hy-image-v3.5-preview | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| mini | tokenhub/hy-vision-2.0-instruct | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| mini | tokenhub/kimi-k2.8-preview | https://www.kimi.com/code/docs/en/kimi-code/models | 官方文档 · kimi.com · 模型列表 | 官方文档 · Kimi · 模型列表 |
| mini | tokenhub/kimi-k3.1-pro | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| mini | tokenhub/kimi-k3.1-pro-highspeed | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| mini | tokenhub/mimo-v2.5-pro | https://mimo.mi.com/docs/zh-CN/updates/deprecate | 下线公告 · mimo.mi.com · deprecate | 下线公告 · MiMo · 模型下线公告 |
| mini | tokenhub/mimo-v2.5-pro | https://mimo.mi.com/docs/zh-CN/quick-start/summary/model | 原厂规格 · mimo.mi.com · model | 原厂规格 · MiMo · 模型说明 |
| mini | tokenhub/mimo-v2.6-flash | https://mimo.mi.com/models/en-US/mimo-v2.6-flash | 官方文档 · mimo.mi.com · mimo v2.6 flash | 官方文档 · MiMo · MiMo V2.6 Flash |
| mini | tokenhub/mimo-v2.6-pro | https://mimo.mi.com/models/en-US/mimo-v2.6-pro | 官方文档 · mimo.mi.com · mimo v2.6 pro | 官方文档 · MiMo · MiMo V2.6 Pro |
| mini | tokenhub/minimax-m3.1-flash | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| mini | tokenhub/seedream-image-v5.0-lite | https://docs.volcengine.com/docs/ark/seedream-4-0-5-0?lang=zh | 官方文档 · volcengine.com · seedream 4 0 5 0 | 官方文档 · 火山方舟 · Seedream 4-0-5-0 |
| mini | tokenhub/seedream-image-v5.0-pro | https://docs.volcengine.com/docs/ark/seedream-4-0-5-0?lang=zh | 官方文档 · volcengine.com · seedream 4 0 5 0 | 官方文档 · 火山方舟 · Seedream 4-0-5-0 |
| mini | tokenhub/vidu-image-q2 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| mini | tokenhub/wand-vega-image-flash | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| mini | tokenhub/wand-vega-image-lite | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| mini | tokenhub/wand-vega-image-pro | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| mini | tokenhub/youtu-vita | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · cloud.tencent.com · 130051 | 官方文档 · 腾讯云 · 文档 130051 |
| mini | xiaomi/mimo-v2.6-flash | https://mimo.mi.com/models/en-US/mimo-v2.6-flash | 官方文档 · mimo.mi.com · mimo v2.6 flash | 官方文档 · MiMo · MiMo-V2.6-Flash |
| mini | xiaomi/mimo-v2.6-pro | https://mimo.mi.com/models/en-US/mimo-v2.6-pro | 官方文档 · mimo.mi.com · mimo v2.6 pro | 官方文档 · MiMo · MiMo-V2.6-Pro |
| mini | xiaomi/mimo-v2.6-pro-ultraspeed | https://mimo.mi.com/docs/zh-CN/quick-start/summary/model | 官方文档 · mimo.mi.com · model | 官方文档 · MiMo · 模型说明 |
| mini | sensenova/deepseek-v4-flash | https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash | 官方文档 · Hugging Face · DeepSeek V4 Flash | 官方文档 · Hugging Face · DeepSeek V4 Flash 0731 |
| mini | sensenova/glm-5.2 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.2 | 官方文档 · bigmodel.cn · glm 5.2 | 官方文档 · 智谱 · GLM-5.2 |
| mini | sensenova/deepseek-flash | https://platform.sensenova.cn/docs | 官方文档 · sensenova.cn · docs | 官方文档 · SenseNova · 文档首页 |
| mini | sensenova/sensenova-6.8-flash-lite | https://github.com/OpenSenseNova/SenseNova6.8/blob/main/API.md | 官方文档 · github.com · API.md | 官方文档 · GitHub · API |
| mini | sensenova/sensenova-u1.5-fast | https://www.sensecore.cn/help/docs/model-as-a-service/nova/overview | 官方文档 · sensecore.cn · overview | 官方文档 · Sensecore · Nova |
| mini | sensenova/sensenova-u1.5-lite | https://www.sensecore.cn/help/docs/model-as-a-service/nova/overview | 官方文档 · sensecore.cn · overview | 官方文档 · Sensecore · Nova |
| mini | stepfun/step-5-preview | https://platform.stepfun.com/docs/zh/guides/models/step-5-preview | 官方文档 · stepfun.com · step 5 preview | 官方文档 · StepFun · Step 5 Preview |
| mini | stepfun/step-3.7-flash | https://platform.stepfun.com/docs/zh/guides/models/step-3.7-flash | 官方文档 · stepfun.com · step 3.7 flash | 官方文档 · StepFun · Step 3.7 Flash |
| mini | stepfun/step-3.5-flash | https://platform.stepfun.com/docs/zh/guides/models/step-3.5-flash | 官方文档 · stepfun.com · step 3.5 flash | 官方文档 · StepFun · Step 3.5 Flash |
| mini | stepfun/step-3.5-flash-2603 | https://platform.stepfun.com/docs/zh/guides/models/step-3.5-flash | 官方文档 · stepfun.com · step 3.5 flash | 官方文档 · StepFun · Step 3.5 Flash |
| mini | stepfun/step-1o-turbo-vision | https://platform.stepfun.com/docs/zh/guides/models/list | 官方文档 · stepfun.com · list | 官方文档 · StepFun · List |
| mini | qianfan/deepseek-v4.1-flash-1017 | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · cloud.baidu.com · rmh4stp0j | 官方文档 · 百度千帆 · 模型列表 |
| mini | qianfan/deepseek-v4-pro-0813 | https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro-0813 | 官方文档 · Hugging Face · DeepSeek V4 Pro 0813 | 官方文档 · Hugging Face · DeepSeek-V4-Pro-0813 |
| mini | qianfan/deepseek-v4-flash-0731 | https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731 | 官方文档 · Hugging Face · DeepSeek V4 Flash 0731 | 官方文档 · Hugging Face · DeepSeek-V4-Flash-0731 |
| mini | qianfan/deepseek-v4-flash | https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash | 官方文档 · Hugging Face · DeepSeek V4 Flash | 官方文档 · Hugging Face · DeepSeek-V4-Flash |
| mini | qianfan/deepseek-v3.2 | https://huggingface.co/deepseek-ai/DeepSeek-V3.2 | 官方文档 · Hugging Face · DeepSeek V3.2 | 官方文档 · Hugging Face · DeepSeek-V3.2 |
| mini | qianfan/deepseek-v3.2-think | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · cloud.baidu.com · klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表 |
| mini | qianfan/glm-5.3 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.3 | 官方文档 · bigmodel.cn · glm 5.3 | 官方文档 · 智谱 · GLM-5.3 |
| mini | qianfan/glm-5.3-flash | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5.3-flash | 官方文档 · bigmodel.cn · glm 5.3 flash | 官方文档 · 智谱 · GLM-5.3-Flash |
| mini | qianfan/glm-5.2 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.2 | 官方文档 · bigmodel.cn · glm 5.2 | 官方文档 · 智谱 · GLM-5.2 |
| mini | qianfan/glm-5.1 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.1 | 官方文档 · bigmodel.cn · glm 5.1 | 官方文档 · 智谱 · GLM-5.1 |
| mini | qianfan/glm-5 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5 | 官方文档 · bigmodel.cn · glm 5 | 官方文档 · 智谱 · GLM-5 |
| mini | qianfan/kimi-k2.6 | https://huggingface.co/moonshotai/Kimi-K2.6 | 官方文档 · Hugging Face · Kimi K2.6 | 官方文档 · Hugging Face · Kimi-K2.6 |
| mini | qianfan/qwen-image-edit | https://help.aliyun.com/zh/model-studio/model-depreciation | 原厂规格 · 百炼 · 模型下线公告 | 下线公告 · 百炼 · 模型下线公告 |
| mini | qianfan/qwen3.5-397b-a17b | https://huggingface.co/Qwen/Qwen3.5-397B-A17B | 官方文档 · Hugging Face · Qwen3.5 397B A17B | 官方文档 · Hugging Face · Qwen3.5-397B-A17B |
| mini | qianfan/deepseek-ocr | https://huggingface.co/deepseek-ai/DeepSeek-OCR | 官方文档 · Hugging Face · DeepSeek OCR | 官方文档 · Hugging Face · DeepSeek-OCR |
| mini | qianfan/ernie-4.5-turbo-128k | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · cloud.baidu.com · rmh4stp0j | 官方文档 · 百度千帆 · 模型列表 |
| mini | qianfan/ernie-4.5-turbo-20260402 | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · cloud.baidu.com · rmh4stp0j | 官方文档 · 百度千帆 · 模型列表 |
| mini | qianfan/ernie-4.5-turbo-32k | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · cloud.baidu.com · rmh4stp0j | 官方文档 · 百度千帆 · 模型列表 |
| mini | qianfan/ernie-4.5-turbo-vl | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · cloud.baidu.com · rmh4stp0j | 官方文档 · 百度千帆 · 模型列表 |
| mini | qianfan/ernie-4.5-turbo-vl-32k | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · cloud.baidu.com · rmh4stp0j | 官方文档 · 百度千帆 · 模型列表 |
| mini | qianfan/ernie-5.0 | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · cloud.baidu.com · rmh4stp0j | 官方文档 · 百度千帆 · 模型列表 |
| mini | qianfan/ernie-5.0-thinking-exp | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · cloud.baidu.com · rmh4stp0j | 官方文档 · 百度千帆 · 模型列表 |
| mini | qianfan/ernie-5.0-thinking-latest | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · cloud.baidu.com · rmh4stp0j | 官方文档 · 百度千帆 · 模型列表 |
| mini | qianfan/ernie-5.0-thinking-preview | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · cloud.baidu.com · klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表 |
| mini | qianfan/ernie-5.1 | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · cloud.baidu.com · rmh4stp0j | 官方文档 · 百度千帆 · 模型列表 |
| mini | qianfan/ernie-x1.1 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · cloud.baidu.com · klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表 |
| mini | qianfan/ernie-x1.1-preview | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · cloud.baidu.com · klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表 |
| mini | qianfan/internvl3-38b | https://huggingface.co/OpenGVLab/InternVL3-38B | 官方文档 · Hugging Face · InternVL3 38B | 官方文档 · Hugging Face · InternVL3-38B |
| mini | qianfan/musesteamer-air-image | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · cloud.baidu.com · klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表 |
| mini | qianfan/qianfan-ocr | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · cloud.baidu.com · rmh4stp0j | 官方文档 · 百度千帆 · 模型列表 |
| mini | iflytek/xop3qwen30b | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| mini | iflytek/xop3qwen32b | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| mini | iflytek/xop3qwen32bvl | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| mini | iflytek/xopqwen35397b | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| mini | iflytek/xopqwen36v35b | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| mini | iflytek/xop35qwen2b | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| mini | iflytek/spark-x2.5 | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| mini | iflytek/spark-x2.5-1.7b | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| mini | iflytek/spark-x2.5-4b | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| mini | iflytek/spark-x2.6 | https://maas.xfyun.cn/doc/guide/3%E3%80%81API%20%E6%8E%A5%E5%8F%A3/3.1%20%E6%98%9F%E7%81%AB%E6%A8%A1%E5%9E%8B%20API/3.1.1%20Chat.html | 官方文档 · maas.xfyun.cn · 3.1.1 Chat | 官方文档 · 讯飞星辰 · 3.1.1 Chat |
| mini | iflytek/spark-x2.6-4b | https://maas.xfyun.cn/doc/guide/3%E3%80%81API%20%E6%8E%A5%E5%8F%A3/3.1%20%E6%98%9F%E7%81%AB%E6%A8%A1%E5%9E%8B%20API/3.1.1%20Chat.html | 官方文档 · maas.xfyun.cn · 3.1.1 Chat | 官方文档 · 讯飞星辰 · 3.1.1 Chat |
| mini | iflytek/xdeepseekr1qwen32b | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| mini | iflytek/xminimaxm25 | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| mini | iflytek/xop3qwen0b6 | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| mini | iflytek/xop3qwen14b | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| mini | iflytek/xop3qwen4b | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| mini | iflytek/xop3qwen80bnext | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| mini | iflytek/xop3qwen8b | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| mini | iflytek/xopdeepseekv4flash | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| mini | iflytek/xopdeepseekv4flash0731 | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| mini | iflytek/xopdeepseekv4pro | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| mini | iflytek/xopdeepseekv4pro0813 | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| mini | iflytek/xopglm51 | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| mini | iflytek/xopglm52 | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| mini | iflytek/xopglm53 | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| mini | iflytek/xopglmv47flash | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| mini | iflytek/xopkimik25 | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| mini | iflytek/xopkimik26 | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| mini | iflytek/xopkimik27code | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| mini | iflytek/xqwen14bchat | https://huggingface.co/Qwen/Qwen2.5-14B-Instruct | 官方文档 · Hugging Face · Qwen2.5 14B Instruct | 官方文档 · Hugging Face · Qwen2.5-14B Instruct |
| mini | iflytek/xspark13b6k | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| mini | iflytek/xsparkprox | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| mini | iflytek/xsparkx2 | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| mini | iflytek/xsparkx2flash | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 官方文档 · xfyun.cn · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 |
| mini | longcat/LongCat-2.5-Preview | https://longcat.ai/platform/docs/zh/api/model-params | 官方文档 · longcat.ai · model params | 官方文档 · LongCat · Model Params |
| mini | longcat/LongCat-2.5 | https://longcat.chat/platform/docs/change-log | 官方文档 · longcat.chat · change log | 官方文档 · LongCat · Change Log |
| mini | antling/Ling-3.0-flash-VL | https://developer.ant-ling.com/zh-CN/docs/api-reference/chat/openai/ | 官方文档 · developer.ant-ling.com · openai | 官方文档 · 蚂蚁百灵 · OpenAI |
| mini | antling/Ling-3.0-tiny | https://developer.ant-ling.com/zh-CN/docs/api-reference/chat/openai/ | 官方文档 · developer.ant-ling.com · openai | 官方文档 · 蚂蚁百灵 · OpenAI |
| mini | antling/Ling-3.0-flash | https://developer.ant-ling.com/zh-CN/docs/api-reference/chat/openai/ | 官方文档 · developer.ant-ling.com · openai | 官方文档 · 蚂蚁百灵 · OpenAI |
| mini | antling/Ling-2.6-1T | https://developer.ant-ling.com/zh-CN/docs/models/deprecation/ | 下线公告 · developer.ant-ling.com · deprecation | 下线公告 · 蚂蚁百灵 · 模型下线公告 |
| mini | antling/Ling-2.6-flash | https://developer.ant-ling.com/zh-CN/docs/models/deprecation/ | 下线公告 · developer.ant-ling.com · deprecation | 下线公告 · 蚂蚁百灵 · 模型下线公告 |
| mini | antling/Ling-3.1-flash | https://developer.ant-ling.com/zh-CN/docs/api-reference/chat/openai/ | 官方文档 · developer.ant-ling.com · openai | 官方文档 · 蚂蚁百灵 · OpenAI |
| mini | antling/Ling-3.2-flash | https://developer.ant-ling.com/zh-CN/docs/api-reference/chat/openai/ | 官方文档 · developer.ant-ling.com · openai | 官方文档 · 蚂蚁百灵 · OpenAI |
| mini | antling/Ring-2.6-1T | https://developer.ant-ling.com/zh-CN/docs/models/deprecation/ | 下线公告 · developer.ant-ling.com · deprecation | 下线公告 · 蚂蚁百灵 · 模型下线公告 |
| mini | novita/ming-image-0.1-design | https://docs.novita.ai/api-reference/model-apis-ming-image-txt2img | 官方文档 · novita.ai · model apis ming image txt2img | 官方文档 · Novita · Model Apis Ming Image Txt2img |
| Web notice dialog | antling/Ling-2.6-1T | https://developer.ant-ling.com/zh-CN/docs/models/deprecation/ | 下线公告 · developer.ant-ling.com · deprecation | 下线公告 · 蚂蚁百灵 · 模型下线公告 |
| Web notice dialog | antling/Ling-2.6-flash | https://developer.ant-ling.com/zh-CN/docs/models/deprecation/ | 下线公告 · developer.ant-ling.com · deprecation | 下线公告 · 蚂蚁百灵 · 模型下线公告 |
| Web notice dialog | antling/Ring-2.6-1T | https://developer.ant-ling.com/zh-CN/docs/models/deprecation/ | 下线公告 · developer.ant-ling.com · deprecation | 下线公告 · 蚂蚁百灵 · 模型下线公告 |

## Retained spelling and opaque identifiers

The following **634** source-row instances merit manual explanation but are not unresolved defects. These are exact curated spellings, release codes, or page identifiers with no captured human title; changing their model names would violate the picker-name lock.

| Client | Card | URL | Retained title | Justification |
| --- | --- | --- | --- | --- |
| web | zhipu/glm-5.3 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.3 | 官方文档 · 智谱 · GLM-5.3 | Exact curated picker name; required to retain its spelling and separators. |
| web | zhipu/glm-5.1 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.1 | 官方文档 · 智谱 · GLM-5.1 | Exact curated picker name; required to retain its spelling and separators. |
| web | zhipu/glm-5 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5 | 官方文档 · 智谱 · GLM-5 | Exact curated picker name; required to retain its spelling and separators. |
| web | zhipu/glm-4.7 | https://docs.bigmodel.cn/cn/guide/models/text/glm-4.7 | 官方文档 · 智谱 · GLM-4.7 | Exact curated picker name; required to retain its spelling and separators. |
| web | zhipu/glm-4.6 | https://docs.bigmodel.cn/cn/guide/models/text/glm-4.6 | 官方文档 · 智谱 · GLM-4.6 | Exact curated picker name; required to retain its spelling and separators. |
| web | zhipu/glm-4.6v | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-4.6v | 官方文档 · 智谱 · GLM-4.6v | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/Qwen/Qwen3.8-27B | https://huggingface.co/Qwen/Qwen3.8-27B | 官方文档 · Hugging Face · Qwen3.8-27B | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/MiniMaxAI/MiniMax-M2.5 | https://huggingface.co/MiniMaxAI/MiniMax-M2.5 | 官方文档 · Hugging Face · MiniMax-M2.5 | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/Pro/MiniMaxAI/MiniMax-M2.5 | https://huggingface.co/MiniMaxAI/MiniMax-M2.5 | 官方文档 · Hugging Face · MiniMax-M2.5 | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/Qwen/Qwen-Image-Edit-2509 | https://huggingface.co/Qwen/Qwen-Image-Edit-2509 | 官方文档 · Hugging Face · Qwen-Image-Edit-2509 | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/Qwen/Qwen-Image-Edit | https://huggingface.co/Qwen/Qwen-Image-Edit | 官方文档 · Hugging Face · Qwen-Image-Edit | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/Qwen/Qwen3.6-27B | https://huggingface.co/Qwen/Qwen3.6-27B | 官方文档 · Hugging Face · Qwen3.6-27B | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/Qwen/Qwen3.6-35B-A3B | https://huggingface.co/Qwen/Qwen3.6-35B-A3B | 官方文档 · Hugging Face · Qwen3.6-35B-A3B | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/Qwen/Qwen3.5-122B-A10B | https://huggingface.co/Qwen/Qwen3.5-122B-A10B | 官方文档 · Hugging Face · Qwen3.5-122B-A10B | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/Qwen/Qwen3.5-27B | https://huggingface.co/Qwen/Qwen3.5-27B | 官方文档 · Hugging Face · Qwen3.5-27B | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/Qwen/Qwen3.5-35B-A3B | https://huggingface.co/Qwen/Qwen3.5-35B-A3B | 官方文档 · Hugging Face · Qwen3.5-35B-A3B | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/Qwen/Qwen3.5-397B-A17B | https://huggingface.co/Qwen/Qwen3.5-397B-A17B | 官方文档 · Hugging Face · Qwen3.5-397B-A17B | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/Qwen/Qwen3.5-4B | https://huggingface.co/Qwen/Qwen3.5-4B | 官方文档 · Hugging Face · Qwen3.5-4B | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/Qwen/Qwen3.5-9B | https://huggingface.co/Qwen/Qwen3.5-9B | 官方文档 · Hugging Face · Qwen3.5-9B | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/Qwen/Qwen3-14B | https://huggingface.co/Qwen/Qwen3-14B | 官方文档 · Hugging Face · Qwen3-14B | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/Qwen/Qwen3-30B-A3B-Instruct-2507 | https://huggingface.co/Qwen/Qwen3-30B-A3B-Instruct-2507 | 官方文档 · Hugging Face · Qwen3-30B-A3B-Instruct-2507 | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/Qwen/Qwen3-32B | https://huggingface.co/Qwen/Qwen3-32B | 官方文档 · Hugging Face · Qwen3-32B | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/Qwen/Qwen3-8B | https://huggingface.co/Qwen/Qwen3-8B | 官方文档 · Hugging Face · Qwen3-8B | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/Pro/Qwen/Qwen2.5-7B-Instruct | https://huggingface.co/Qwen/Qwen2.5-7B-Instruct | 官方文档 · Hugging Face · Qwen2.5-7B-Instruct | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/Qwen/Qwen2.5-32B-Instruct | https://huggingface.co/Qwen/Qwen2.5-32B-Instruct | 官方文档 · Hugging Face · Qwen2.5-32B-Instruct | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/Qwen/Qwen2.5-72B-Instruct | https://huggingface.co/Qwen/Qwen2.5-72B-Instruct | 官方文档 · Hugging Face · Qwen2.5-72B-Instruct | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/Qwen/Qwen2.5-7B-Instruct | https://huggingface.co/Qwen/Qwen2.5-7B-Instruct | 官方文档 · Hugging Face · Qwen2.5-7B-Instruct | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/deepseek-ai/DeepSeek-V4-Flash | https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash | 官方文档 · Hugging Face · DeepSeek-V4-Flash | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/deepseek-ai/DeepSeek-V4-Pro | https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro | 官方文档 · Hugging Face · DeepSeek-V4-Pro | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/Pro/deepseek-ai/DeepSeek-V3.2 | https://huggingface.co/deepseek-ai/DeepSeek-V3.2 | 官方文档 · Hugging Face · DeepSeek-V3.2 | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/deepseek-ai/DeepSeek-V3.2 | https://huggingface.co/deepseek-ai/DeepSeek-V3.2 | 官方文档 · Hugging Face · DeepSeek-V3.2 | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/Pro/deepseek-ai/DeepSeek-V3.1-Terminus | https://huggingface.co/deepseek-ai/DeepSeek-V3.1-Terminus | 官方文档 · Hugging Face · DeepSeek-V3.1-Terminus | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/deepseek-ai/DeepSeek-V3.1-Terminus | https://huggingface.co/deepseek-ai/DeepSeek-V3.1-Terminus | 官方文档 · Hugging Face · DeepSeek-V3.1-Terminus | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/deepseek-ai/DeepSeek-R1-0528-Qwen3-8B | https://huggingface.co/deepseek-ai/DeepSeek-R1-0528-Qwen3-8B | 官方文档 · Hugging Face · DeepSeek-R1-0528-Qwen3-8B | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/moonshotai/Kimi-K2.7-Code | https://huggingface.co/moonshotai/Kimi-K2.7-Code | 官方文档 · Hugging Face · Kimi-K2.7-Code | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/stepfun-ai/Step-3.5-Flash | https://platform.stepfun.com/docs/zh/guides/models/step-3.5-flash | 官方文档 · StepFun · Step-3.5-Flash | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/zai-org/GLM-5.3 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.3 | 官方文档 · 智谱 · GLM-5.3 | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/zai-org/GLM-5.2 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.2 | 官方文档 · 智谱 · GLM-5.2 | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/Pro/zai-org/GLM-5.1 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.1 | 官方文档 · 智谱 · GLM-5.1 | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/zai-org/GLM-4.5V | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-4.5v | 官方文档 · 智谱 · GLM-4.5V | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/Pro/deepseek-ai/DeepSeek-V3 | https://huggingface.co/deepseek-ai/DeepSeek-V3 | 官方文档 · Hugging Face · DeepSeek-V3 | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/deepseek-ai/DeepSeek-V3 | https://huggingface.co/deepseek-ai/DeepSeek-V3 | 官方文档 · Hugging Face · DeepSeek-V3 | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/ByteDance-Seed/Seed-OSS-36B-Instruct | https://huggingface.co/ByteDance-Seed/Seed-OSS-36B-Instruct | 官方文档 · Hugging Face · Seed-OSS-36B-Instruct | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/Pro/deepseek-ai/DeepSeek-R1 | https://huggingface.co/deepseek-ai/DeepSeek-R1 | 官方文档 · Hugging Face · DeepSeek-R1 | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/Qwen/Qwen3-Coder-30B-A3B-Instruct | https://huggingface.co/Qwen/Qwen3-Coder-30B-A3B-Instruct | 官方文档 · Hugging Face · Qwen3-Coder-30B-A3B-Instruct | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/Qwen/Qwen3-Omni-30B-A3B-Instruct | https://huggingface.co/Qwen/Qwen3-Omni-30B-A3B-Instruct | 官方文档 · Hugging Face · Qwen3-Omni-30B-A3B-Instruct | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/Qwen/Qwen3-Omni-30B-A3B-Thinking | https://huggingface.co/Qwen/Qwen3-Omni-30B-A3B-Thinking | 官方文档 · Hugging Face · Qwen3-Omni-30B-A3B-Thinking | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/Qwen/Qwen3-VL-30B-A3B-Instruct | https://huggingface.co/Qwen/Qwen3-VL-30B-A3B-Instruct | 官方文档 · Hugging Face · Qwen3-VL-30B-A3B-Instruct | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/Qwen/Qwen3-VL-30B-A3B-Thinking | https://huggingface.co/Qwen/Qwen3-VL-30B-A3B-Thinking | 官方文档 · Hugging Face · Qwen3-VL-30B-A3B-Thinking | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/Qwen/Qwen3-VL-32B-Instruct | https://huggingface.co/Qwen/Qwen3-VL-32B-Instruct | 官方文档 · Hugging Face · Qwen3-VL-32B-Instruct | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/Qwen/Qwen3-VL-32B-Thinking | https://huggingface.co/Qwen/Qwen3-VL-32B-Thinking | 官方文档 · Hugging Face · Qwen3-VL-32B-Thinking | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/Qwen/Qwen3-VL-8B-Instruct | https://huggingface.co/Qwen/Qwen3-VL-8B-Instruct | 官方文档 · Hugging Face · Qwen3-VL-8B-Instruct | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/Qwen/Qwen3-VL-8B-Thinking | https://huggingface.co/Qwen/Qwen3-VL-8B-Thinking | 官方文档 · Hugging Face · Qwen3-VL-8B-Thinking | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/Tongyi-MAI/Z-Image | https://huggingface.co/Tongyi-MAI/Z-Image | 官方文档 · Hugging Face · Z-Image | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/Tongyi-MAI/Z-Image-Turbo | https://huggingface.co/Tongyi-MAI/Z-Image-Turbo | 官方文档 · Hugging Face · Z-Image-Turbo | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/baidu/ERNIE-Image-Turbo | https://huggingface.co/baidu/ERNIE-Image-Turbo | 官方文档 · Hugging Face · ERNIE-Image-Turbo | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/deepseek-ai/DeepSeek-R1 | https://huggingface.co/deepseek-ai/DeepSeek-R1 | 官方文档 · Hugging Face · DeepSeek-R1 | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/meituan-longcat/LongCat-2.0 | https://huggingface.co/meituan-longcat/LongCat-2.0 | 官方文档 · Hugging Face · LongCat-2.0 | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/nex-agi/Nex-N2-Pro | https://huggingface.co/nex-agi/Nex-N2-Pro | 官方文档 · Hugging Face · Nex-N2-Pro | Exact curated picker name; required to retain its spelling and separators. |
| web | siliconflow/tencent/Hunyuan-A13B-Instruct | https://huggingface.co/tencent/Hunyuan-A13B-Instruct | 官方文档 · Hugging Face · Hunyuan-A13B-Instruct | Exact curated picker name; required to retain its spelling and separators. |
| web | xai/grok-4.5 | https://docs.x.ai/developers/models/grok-4.5 | 官方文档 · xAI · Grok-4.5 | Exact curated picker name; required to retain its spelling and separators. |
| web | xai/grok-4.3 | https://docs.x.ai/developers/models/grok-4.3 | 官方文档 · xAI · Grok-4.3 | Exact curated picker name; required to retain its spelling and separators. |
| web | gemini/gemini-3.5-flash-lite | https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite | 官方文档 · Google · Gemini 3.5 Flash-Lite | Exact curated picker name; required to retain its spelling and separators. |
| web | gemini/gemini-3.1-flash-lite | https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite | 官方文档 · Google · Gemini 3.1 Flash-Lite | Exact curated picker name; required to retain its spelling and separators. |
| web | gemini/gemini-2.5-flash-lite | https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-lite | 官方文档 · Google · Gemini 2.5 Flash-Lite | Exact curated picker name; required to retain its spelling and separators. |
| web | bailian/deepseek-v4.1-flash | https://help.aliyun.com/zh/model-studio/deepseek-v4-1-flash | 官方文档 · 百炼 · DeepSeek-V4.1-Flash | Exact curated picker name; required to retain its spelling and separators. |
| web | bailian/deepseek-v4.1-flash | https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash | 官方文档 · Hugging Face · DeepSeek-V4.1-Flash | Exact curated picker name; required to retain its spelling and separators. |
| web | bailian/MiniMax/MiniMax-M2.7 | https://huggingface.co/MiniMaxAI/MiniMax-M2.7 | 官方文档 · Hugging Face · MiniMax-M2.7 | Exact curated picker name; required to retain its spelling and separators. |
| web | bailian/MiniMax-M2.5 | https://huggingface.co/MiniMaxAI/MiniMax-M2.5 | 官方文档 · Hugging Face · MiniMax-M2.5 | Exact curated picker name; required to retain its spelling and separators. |
| web | bailian/MiniMax/MiniMax-M2.5 | https://huggingface.co/MiniMaxAI/MiniMax-M2.5 | 官方文档 · Hugging Face · MiniMax-M2.5 | Exact curated picker name; required to retain its spelling and separators. |
| web | bailian/ZHIPU/GLM-5.2 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.2 | 官方文档 · 智谱 · GLM-5.2 | Exact curated picker name; required to retain its spelling and separators. |
| web | bailian/deepseek-v4-pro-0813 | https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro-0813 | 官方文档 · Hugging Face · DeepSeek-V4-Pro-0813 | Exact curated picker name; required to retain its spelling and separators. |
| web | bailian/deepseek-v4-flash-0731 | https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731 | 官方文档 · Hugging Face · DeepSeek-V4-Flash-0731 | Exact curated picker name; required to retain its spelling and separators. |
| web | bailian/deepseek-v4-pro | https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro | 官方文档 · Hugging Face · DeepSeek-V4-Pro | Exact curated picker name; required to retain its spelling and separators. |
| web | bailian/ZHIPU/GLM-5.1 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.1 | 官方文档 · 智谱 · GLM-5.1 | Exact curated picker name; required to retain its spelling and separators. |
| web | bailian/glm-5.1 | https://help.aliyun.com/zh/model-studio/glm-5-1 | 官方文档 · 百炼 · GLM-5.1 | Exact curated picker name; required to retain its spelling and separators. |
| web | bailian/glm-5.1 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.1 | 官方文档 · 智谱 · GLM-5.1 | Exact curated picker name; required to retain its spelling and separators. |
| web | bailian/ZHIPU/GLM-5 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5 | 官方文档 · 智谱 · GLM-5 | Exact curated picker name; required to retain its spelling and separators. |
| web | bailian/glm-5 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5 | 官方文档 · 智谱 · GLM-5 | Exact curated picker name; required to retain its spelling and separators. |
| web | bailian/kimi-k2.6 | https://help.aliyun.com/zh/model-studio/kimi-k2-6 | 官方文档 · 百炼 · Kimi-k2.6 | Exact curated picker name; required to retain its spelling and separators. |
| web | bailian/kimi-k2.6 | https://huggingface.co/moonshotai/Kimi-K2.6 | 官方文档 · Hugging Face · Kimi-k2.6 | Exact curated picker name; required to retain its spelling and separators. |
| web | bailian/kimi/kimi-k2.6 | https://huggingface.co/moonshotai/Kimi-K2.6 | 官方文档 · Hugging Face · Kimi-k2.6 | Exact curated picker name; required to retain its spelling and separators. |
| web | bailian/kimi-k2.5 | https://help.aliyun.com/zh/model-studio/kimi-k2-5 | 官方文档 · 百炼 · Kimi-k2.5 | Exact curated picker name; required to retain its spelling and separators. |
| web | bailian/kimi-k2.5 | https://huggingface.co/moonshotai/Kimi-K2.5 | 官方文档 · Hugging Face · Kimi-k2.5 | Exact curated picker name; required to retain its spelling and separators. |
| web | bailian/kimi/kimi-k2.5 | https://huggingface.co/moonshotai/Kimi-K2.5 | 官方文档 · Hugging Face · Kimi-k2.5 | Exact curated picker name; required to retain its spelling and separators. |
| web | bailian/qwen3.6-27b | https://huggingface.co/Qwen/Qwen3.6-27B | 官方文档 · Hugging Face · Qwen3.6-27b | Exact curated picker name; required to retain its spelling and separators. |
| web | bailian/qwen3.6-35b-a3b | https://huggingface.co/Qwen/Qwen3.6-35B-A3B | 官方文档 · Hugging Face · Qwen3.6-35b-a3b | Exact curated picker name; required to retain its spelling and separators. |
| web | bailian/qwen3.5-122b-a10b | https://huggingface.co/Qwen/Qwen3.5-122B-A10B | 官方文档 · Hugging Face · Qwen3.5-122b-a10b | Exact curated picker name; required to retain its spelling and separators. |
| web | bailian/qwen3.5-27b | https://huggingface.co/Qwen/Qwen3.5-27B | 官方文档 · Hugging Face · Qwen3.5-27b | Exact curated picker name; required to retain its spelling and separators. |
| web | bailian/qwen3.5-35b-a3b | https://huggingface.co/Qwen/Qwen3.5-35B-A3B | 官方文档 · Hugging Face · Qwen3.5-35b-a3b | Exact curated picker name; required to retain its spelling and separators. |
| web | bailian/qwen3.5-397b-a17b | https://huggingface.co/Qwen/Qwen3.5-397B-A17B | 官方文档 · Hugging Face · Qwen3.5-397b-a17b | Exact curated picker name; required to retain its spelling and separators. |
| web | bailian/qwen3-max | https://www.aliyun.com/notice/118344 | 下线公告 · 百炼 · 文档 118344 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | bailian/qwen3-max-2025-09-23 | https://www.aliyun.com/notice/118345 | 下线公告 · 百炼 · 文档 118345 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | bailian/qwen3-max-2026-01-23 | https://www.aliyun.com/notice/118345 | 下线公告 · 百炼 · 文档 118345 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | bailian/qwen3-max-preview | https://www.aliyun.com/notice/118344 | 下线公告 · 百炼 · 文档 118344 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | bailian/qwen-turbo | https://www.aliyun.com/notice/118177 | 下线公告 · 百炼 · 文档 118177 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | bailian/qwen3-coder-next | https://www.aliyun.com/notice/118345 | 下线公告 · 百炼 · 文档 118345 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | bailian/z-image-turbo | https://huggingface.co/Tongyi-MAI/Z-Image-Turbo | 官方文档 · Hugging Face · Z-Image Turbo | Exact curated picker name; required to retain its spelling and separators. |
| web | openai/gpt-6.1-sol | https://developers.openai.com/api/docs/models/gpt-6.1-sol | 官方文档 · OpenAI · GPT-6.1 Sol | Exact curated picker name; required to retain its spelling and separators. |
| web | openai/gpt-6-luna | https://developers.openai.com/api/docs/models/gpt-6-luna.md | 官方文档 · OpenAI · GPT-6 Luna（Markdown） | Exact curated picker name; required to retain its spelling and separators. |
| web | openai/gpt-6-luna | https://developers.openai.com/api/docs/models/gpt-6-luna | 官方文档 · OpenAI · GPT-6 Luna（文档） | Exact curated picker name; required to retain its spelling and separators. |
| web | openai/gpt-6-sol | https://developers.openai.com/api/docs/models/gpt-6-sol.md | 官方文档 · OpenAI · GPT-6 Sol（Markdown） | Exact curated picker name; required to retain its spelling and separators. |
| web | openai/gpt-6-sol | https://developers.openai.com/api/docs/models/gpt-6-sol | 官方文档 · OpenAI · GPT-6 Sol（文档） | Exact curated picker name; required to retain its spelling and separators. |
| web | openai/gpt-6-astra | https://developers.openai.com/api/docs/models/gpt-6-astra.md | 官方文档 · OpenAI · GPT-6 Astra（Markdown） | Exact curated picker name; required to retain its spelling and separators. |
| web | openai/gpt-6-astra | https://developers.openai.com/api/docs/models/gpt-6-astra | 官方文档 · OpenAI · GPT-6 Astra（文档） | Exact curated picker name; required to retain its spelling and separators. |
| web | openai/gpt-5.6-luna | https://developers.openai.com/api/docs/models/gpt-5.6-luna.md | 官方文档 · OpenAI · GPT-5.6 Luna（Markdown） | Exact curated picker name; required to retain its spelling and separators. |
| web | openai/gpt-5.6-luna | https://developers.openai.com/api/docs/models/gpt-5.6-luna | 官方文档 · OpenAI · GPT-5.6 Luna（文档） | Exact curated picker name; required to retain its spelling and separators. |
| web | openai/gpt-5.6-sol | https://developers.openai.com/api/docs/models/gpt-5.6-sol.md | 官方文档 · OpenAI · GPT-5.6 Sol | Exact curated picker name; required to retain its spelling and separators. |
| web | openai/gpt-5.6-terra | https://developers.openai.com/api/docs/models/gpt-5.6-terra.md | 官方文档 · OpenAI · GPT-5.6 Terra（Markdown） | Exact curated picker name; required to retain its spelling and separators. |
| web | openai/gpt-5.6-terra | https://developers.openai.com/api/docs/models/gpt-5.6-terra | 官方文档 · OpenAI · GPT-5.6 Terra（文档） | Exact curated picker name; required to retain its spelling and separators. |
| web | openai/o1-2024-12-17 | https://developers.openai.com/api/docs/models/o1 | 官方文档 · OpenAI · O1 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | openai/o3-2025-04-16 | https://developers.openai.com/api/docs/models/o3 | 官方文档 · OpenAI · O3 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/deepseek-v4-1-flash-260910 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/deepseek-v4-flash-260425 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/deepseek-v4-flash-260425 | https://docs.volcengine.com/docs/82379/1159178?lang=zh | 官方文档 · 火山方舟 · 文档 1159178 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/deepseek-v4-flash-ga-260731 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/deepseek-v4-flash-ga-260731 | https://docs.volcengine.com/docs/82379/1159178?lang=zh | 官方文档 · 火山方舟 · 文档 1159178 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/deepseek-v4-pro-260425 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/deepseek-v4-pro-260425 | https://docs.volcengine.com/docs/82379/1159178?lang=zh | 官方文档 · 火山方舟 · 文档 1159178 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/deepseek-v4-pro-ga-260813 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/deepseek-v4-pro-ga-260813 | https://docs.volcengine.com/docs/82379/1159178?lang=zh | 官方文档 · 火山方舟 · 文档 1159178 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/doubao-seed-2-1-pro-260628 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/doubao-seed-2-1-pro-260628 | https://docs.volcengine.com/docs/82379/1159178?lang=zh | 官方文档 · 火山方舟 · 文档 1159178 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/doubao-seed-2-1-pro-260915 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/doubao-seed-2-1-turbo-260628 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/doubao-seed-2-1-turbo-260628 | https://docs.volcengine.com/docs/82379/1159178?lang=zh | 官方文档 · 火山方舟 · 文档 1159178 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/doubao-seed-2-0-code-preview-260215 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档） | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/doubao-seed-2-0-code-preview-260215 | https://docs.volcengine.com/docs/82379/1330310?lang=zh | 官方文档 · 火山方舟 · 文档 1330310（文档 2） | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/doubao-seed-2-0-lite-260215 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档） | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/doubao-seed-2-0-lite-260215 | https://docs.volcengine.com/docs/82379/1330310?lang=zh | 官方文档 · 火山方舟 · 文档 1330310（文档 2） | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/doubao-seed-2-0-lite-260428 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/doubao-seed-2-0-mini-260215 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档） | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/doubao-seed-2-0-mini-260215 | https://docs.volcengine.com/docs/82379/1330310?lang=zh | 官方文档 · 火山方舟 · 文档 1330310（文档 2） | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/doubao-seed-2-0-mini-260428 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/doubao-seed-2-0-pro-260215 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档） | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/doubao-seed-2-0-pro-260215 | https://docs.volcengine.com/docs/82379/1330310?lang=zh | 官方文档 · 火山方舟 · 文档 1330310（文档 2） | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/doubao-seed-1-8-251228 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档） | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/doubao-seed-1-8-251228 | https://docs.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档 2） | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/doubao-seed-1-6-250615 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档） | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/doubao-seed-1-6-250615 | https://docs.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档 2） | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/doubao-seed-1-6-251015 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档） | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/doubao-seed-1-6-251015 | https://docs.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档 2） | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/doubao-seed-1-6-flash-250615 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档） | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/doubao-seed-1-6-flash-250615 | https://docs.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档 2） | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/doubao-seed-1-6-flash-250828 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档） | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/doubao-seed-1-6-flash-250828 | https://docs.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档 2） | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/doubao-seed-1-6-vision-250815 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档） | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/doubao-seed-1-6-vision-250815 | https://docs.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档 2） | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/doubao-1-5-lite-32k-250115 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档） | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/doubao-1-5-lite-32k-250115 | https://docs.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档 2） | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/doubao-1-5-pro-32k-250115 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档） | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/doubao-1-5-pro-32k-250115 | https://docs.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档 2） | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/doubao-1-5-vision-pro-32k-250115 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档） | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/doubao-1-5-vision-pro-32k-250115 | https://docs.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档 2） | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/doubao-seedream-5-0-260128 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/doubao-seedream-5-0-260128 | https://docs.volcengine.com/docs/82379/1824121?lang=zh | 官方文档 · 火山方舟 · 文档 1824121 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/doubao-seedream-5-0-pro-260628 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/doubao-seedream-5-0-pro-260628 | https://docs.volcengine.com/docs/82379/1824121?lang=zh | 官方文档 · 火山方舟 · 文档 1824121 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/doubao-seedream-4-5-251128 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/doubao-seedream-4-5-251128 | https://docs.volcengine.com/docs/82379/1824121?lang=zh | 官方文档 · 火山方舟 · 文档 1824121 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/doubao-seedream-4-0-250828 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/glm-5-3-flash-260828 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/glm-5-2-260617 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/glm-5-2-260617 | https://docs.volcengine.com/docs/82379/1159178?lang=zh | 官方文档 · 火山方舟 · 文档 1159178 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/doubao-seed-code-preview-251028 | https://developer.volcengine.com/articles/7577301460712030258 | 官方文档 · 火山方舟 · 文档 7577301460712030258 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/doubao-seed-code-preview-251028 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档） | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/doubao-seed-code-preview-251028 | https://docs.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档 2） | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/doubao-seed-evolving | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/doubao-seed-evolving | https://docs.volcengine.com/docs/82379/2549861?lang=zh | 官方文档 · 火山方舟 · 文档 2549861 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/glm-4-7-251222 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档） | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | ark/glm-4-7-251222 | https://docs.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档 2） | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | mistral/codestral-2508 | https://docs.mistral.ai/models/codestral-25-08 | 官方文档 · Mistral · Codestral 2508 | 2508 is the curated release code; the page spells that date code 25-08. No model version was collapsed. |
| web | mistral/codestral-latest | https://docs.mistral.ai/models/codestral-25-08 | 官方文档 · Mistral · Codestral（2508） | 2508 is the curated release code; the page spells that date code 25-08. No model version was collapsed. |
| web | together/Qwen/Qwen3.8-2.4T-A95B | https://huggingface.co/Qwen/Qwen3.8-2.4T-A95B | 官方文档 · Hugging Face · Qwen3.8-2.4T-A95B | Exact curated picker name; required to retain its spelling and separators. |
| web | together/deepseek-ai/DeepSeek-V4.1-Flash | https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash | 官方文档 · Hugging Face · DeepSeek-V4.1-Flash | Exact curated picker name; required to retain its spelling and separators. |
| web | together/deepseek-ai/DeepSeek-V4-Pro-0813 | https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro-0813 | 官方文档 · Hugging Face · DeepSeek-V4-Pro-0813 | Exact curated picker name; required to retain its spelling and separators. |
| web | together/deepseek-ai/DeepSeek-V4-Flash-0731 | https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731 | 官方文档 · Hugging Face · DeepSeek-V4-Flash-0731 | Exact curated picker name; required to retain its spelling and separators. |
| web | together/zai-org/GLM-5.3 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.3 | 官方文档 · 智谱 · GLM-5.3 | Exact curated picker name; required to retain its spelling and separators. |
| web | together/zai-org/GLM-5.3-Flash | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5.3-flash | 官方文档 · 智谱 · GLM-5.3 Flash | Exact curated picker name; required to retain its spelling and separators. |
| web | together/zai-org/GLM-5.2 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.2 | 官方文档 · 智谱 · GLM-5.2 | Exact curated picker name; required to retain its spelling and separators. |
| web | together/openai/gpt-oss-120b | https://developers.openai.com/api/docs/models/gpt-oss-120b | 官方文档 · OpenAI · GPT-OSS 120B | Exact curated picker name; required to retain its spelling and separators. |
| web | fireworks/accounts/fireworks/models/deepseek-v4p1-flash | https://fireworks.ai/models/deepseek-ai/deepseek-v4p1-flash | 官方文档 · Fireworks · DeepSeek-V4.1-Flash | Exact curated picker name; required to retain its spelling and separators. |
| web | fal/fal-ai/flux-2 | https://fal.ai/models/fal-ai/flux-2/api | 官方文档 · fal · FLUX-2 API 文档 | Exact curated picker name; required to retain its spelling and separators. |
| web | replicate/bytedance/seedream-4.5 | https://replicate.com/bytedance/seedream-4.5 | 官方文档 · Replicate · Seedream-4.5 | Exact curated picker name; required to retain its spelling and separators. |
| web | replicate/bytedance/seedream-4 | https://replicate.com/bytedance/seedream-4 | 官方文档 · Replicate · Seedream-4 | Exact curated picker name; required to retain its spelling and separators. |
| web | replicate/bytedance/seedream-3 | https://replicate.com/bytedance/seedream-3 | 官方文档 · Replicate · Seedream-3 | Exact curated picker name; required to retain its spelling and separators. |
| web | tokendance/deepseek-v4.1-flash | https://tokendance.space/models/deepseek-v4.1-flash | 官方文档 · TokenDance · DeepSeek-V4.1-Flash | Exact curated picker name; required to retain its spelling and separators. |
| web | tokendance/deepseek-v4-pro-0813 | https://tokendance.space/models/deepseek-v4-pro-0813 | 官方文档 · TokenDance · DeepSeek-V4-Pro-0813 | Exact curated picker name; required to retain its spelling and separators. |
| web | tokendance/deepseek-v4-flash-0731 | https://tokendance.space/models/deepseek-v4-flash-0731 | 官方文档 · TokenDance · DeepSeek-V4-Flash-0731 | Exact curated picker name; required to retain its spelling and separators. |
| web | tokendance/deepseek-v4-flash | https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash | 原厂规格 · Hugging Face · DeepSeek-V4-Flash Preview | Exact curated picker name; required to retain its spelling and separators. |
| web | tokendance/deepseek-v4-pro | https://tokendance.space/models/deepseek-v4-pro | 官方文档 · TokenDance · DeepSeek-V4-Pro Preview | Exact curated picker name; required to retain its spelling and separators. |
| web | tokendance/deepseek-v3.2 | https://huggingface.co/deepseek-ai/DeepSeek-V3.2 | 原厂规格 · Hugging Face · DeepSeek-V3.2 | Exact curated picker name; required to retain its spelling and separators. |
| web | tokendance/qwen3.8-max-0902 | https://tokendance.space/models/qwen3.8-max-0902 | 官方文档 · TokenDance · Qwen3.8-Max-0902 | Exact curated picker name; required to retain its spelling and separators. |
| web | tokendance/qwen3.5-35b-a3b | https://tokendance.space/models/qwen3.5-35b-a3b | 官方文档 · TokenDance · Qwen3.5-35B-A3B | Exact curated picker name; required to retain its spelling and separators. |
| web | tokendance/seed-2.1-pro | https://tokendance.space/models/seed-2.1-pro | 官方文档 · TokenDance · Seed-2.1-Pro | Exact curated picker name; required to retain its spelling and separators. |
| web | tokendance/seed-2.1-turbo | https://tokendance.space/models/seed-2.1-turbo | 官方文档 · TokenDance · Seed-2.1-Turbo | Exact curated picker name; required to retain its spelling and separators. |
| web | tokendance/seed-2.0-code | https://tokendance.space/models/seed-2.0-code | 官方文档 · TokenDance · Seed-2.0-Code | Exact curated picker name; required to retain its spelling and separators. |
| web | tokendance/seed-2.0-lite | https://tokendance.space/models/seed-2.0-lite | 官方文档 · TokenDance · Seed-2.0-Lite | Exact curated picker name; required to retain its spelling and separators. |
| web | tokendance/seed-2.0-mini | https://tokendance.space/models/seed-2.0-mini | 官方文档 · TokenDance · Seed-2.0-Mini | Exact curated picker name; required to retain its spelling and separators. |
| web | tokendance/seed-2.0-pro | https://tokendance.space/models/seed-2.0-pro | 官方文档 · TokenDance · Seed-2.0-Pro | Exact curated picker name; required to retain its spelling and separators. |
| web | tokendance/dots-3-note-preview | https://tokendance.space/models/dots-3-note-preview | 官方文档 · TokenDance · Dots3-Note Preview（Free） | Exact curated picker name; required to retain its spelling and separators. |
| web | tokendance/longcat-2.0 | https://tokendance.space/models/longcat-2.0 | 官方文档 · TokenDance · LongCat-2.0 | Exact curated picker name; required to retain its spelling and separators. |
| web | tokendance/mimo-v2.5 | https://tokendance.space/models/mimo-v2.5 | 官方文档 · TokenDance · MiMo-V2.5 | Exact curated picker name; required to retain its spelling and separators. |
| web | tokendance/mimo-v2.5-pro | https://tokendance.space/models/mimo-v2.5-pro | 官方文档 · TokenDance · MiMo-V2.5-Pro | Exact curated picker name; required to retain its spelling and separators. |
| web | tokendance/mimo-v2.6-flash | https://tokendance.space/models/mimo-v2.6-flash | 官方文档 · TokenDance · Mimo-V2.6-Flash | Exact curated picker name; required to retain its spelling and separators. |
| web | tokendance/mimo-v2.6-pro | https://tokendance.space/models/mimo-v2.6-pro | 官方文档 · TokenDance · Mimo-V2.6-Pro | Exact curated picker name; required to retain its spelling and separators. |
| web | tokendance/mimo-v2.6-ultraspeed | https://tokendance.space/models/mimo-v2.6-ultraspeed | 官方文档 · TokenDance · MiMo-V2.6-Pro-UltraSpeed | Exact curated picker name; required to retain its spelling and separators. |
| web | tokendance/seed-evolving | https://tokendance.space/models/seed-evolving | 官方文档 · TokenDance · Seed-Evolving | Exact curated picker name; required to retain its spelling and separators. |
| web | tokendance/spark-x2.5-1.7b | https://tokendance.space/models/spark-x2.5-1.7b | 官方文档 · TokenDance · Spark-X2.5-1.7B | Exact curated picker name; required to retain its spelling and separators. |
| web | tokendance/spark-x2.5-4b | https://tokendance.space/models/spark-x2.5-4b | 官方文档 · TokenDance · Spark-X2.5-4B | Exact curated picker name; required to retain its spelling and separators. |
| web | runware/alibaba:qwen-image@2.1-turbo | https://runware.ai/docs/models/alibaba-qwen-image-2-1-turbo | 官方文档 · Runware · Qwen-Image-2.1-Turbo | Exact curated picker name; required to retain its spelling and separators. |
| web | runware/openai:gpt-image@2.5-flare | https://runware.ai/docs/models/openai-gpt-image-2-5-flare | 官方文档 · Runware · GPT-Image-2.5 Flare | Exact curated picker name; required to retain its spelling and separators. |
| web | runware/openai:gpt-image@2.5-sunburst | https://runware.ai/docs/models/openai-gpt-image-2-5-sunburst | 官方文档 · Runware · GPT-Image-2.5 Sunburst | Exact curated picker name; required to retain its spelling and separators. |
| web | runware/alibaba:qwen-image@3.0 | https://runware.ai/docs/models/alibaba-qwen-image-3-0 | 官方文档 · Runware · Qwen-Image-3.0 | Exact curated picker name; required to retain its spelling and separators. |
| web | runware/alibaba:qwen-image@3.0-pro | https://runware.ai/docs/models/alibaba-qwen-image-3-0-pro | 官方文档 · Runware · Qwen-Image-3.0-Pro | Exact curated picker name; required to retain its spelling and separators. |
| web | runware/deepseek:v4@flash | https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash | 官方文档 · Hugging Face · DeepSeek-V4-Flash-0731 | Exact curated picker name; required to retain its spelling and separators. |
| web | runware/deepseek:v4@flash | https://runware.ai/docs/models/deepseek-v4-flash | 官方文档 · Runware · DeepSeek-V4-Flash-0731 | Exact curated picker name; required to retain its spelling and separators. |
| web | runware/prunaai:p-image@ideogram | https://runware.ai/docs/models/prunaai-p-image-ideogram | 官方文档 · Runware · P-Image-Ideogram | Exact curated picker name; required to retain its spelling and separators. |
| web | runware/luma:uni@1 | https://runware.ai/docs/models/luma-uni-1 | 官方文档 · Runware · UNI-1 | Exact curated picker name; required to retain its spelling and separators. |
| web | runware/luma:uni@1-max | https://runware.ai/docs/models/luma-uni-1-max | 官方文档 · Runware · UNI-1 Max | Exact curated picker name; required to retain its spelling and separators. |
| web | runware/openai:gpt@5.5 | https://runware.ai/docs/models/openai-gpt-5-5 | 官方文档 · Runware · GPT-5.5 | Exact curated picker name; required to retain its spelling and separators. |
| web | runware/baidu:ernie-image@0 | https://runware.ai/docs/models/baidu-ernie-image | 官方文档 · Runware · ERNIE-Image | Exact curated picker name; required to retain its spelling and separators. |
| web | runware/baidu:ernie-image@turbo | https://runware.ai/docs/models/baidu-ernie-image-turbo | 官方文档 · Runware · ERNIE-Image-Turbo | Exact curated picker name; required to retain its spelling and separators. |
| web | runware/zai:glm@5.1 | https://runware.ai/docs/models/zai-glm-5-1 | 官方文档 · Runware · GLM-5.1 | Exact curated picker name; required to retain its spelling and separators. |
| web | runware/openai:gpt@5.4-mini | https://runware.ai/docs/models/openai-gpt-5-4-mini | 官方文档 · Runware · GPT-5.4 Mini | Exact curated picker name; required to retain its spelling and separators. |
| web | runware/openai:gpt@5.4-nano | https://runware.ai/docs/models/openai-gpt-5-4-nano | 官方文档 · Runware · GPT-5.4 Nano | Exact curated picker name; required to retain its spelling and separators. |
| web | runware/openai:gpt@5.4 | https://runware.ai/docs/models/openai-gpt-5-4 | 官方文档 · Runware · GPT-5.4 | Exact curated picker name; required to retain its spelling and separators. |
| web | runware/openai:gpt@5.4-pro | https://runware.ai/docs/models/openai-gpt-5-4-pro | 官方文档 · Runware · GPT-5.4 Pro | Exact curated picker name; required to retain its spelling and separators. |
| web | runware/alibaba:qwen-image@2.0 | https://runware.ai/docs/models/alibaba-qwen-image-2-0 | 官方文档 · Runware · Qwen-Image-2.0 | Exact curated picker name; required to retain its spelling and separators. |
| web | runware/alibaba:qwen-image@2.0-pro | https://runware.ai/docs/models/alibaba-qwen-image-2-0-pro | 官方文档 · Runware · Qwen-Image-2.0-Pro | Exact curated picker name; required to retain its spelling and separators. |
| web | runware/runware:z-image@0 | https://runware.ai/docs/models/alibaba-z-image | 官方文档 · Runware · Z-Image | Exact curated picker name; required to retain its spelling and separators. |
| web | runware/runware:twinflow-z-image-turbo@0 | https://runware.ai/docs/models/twinflow-z-image-turbo | 官方文档 · Runware · TwinFlow Z-Image-Turbo | Exact curated picker name; required to retain its spelling and separators. |
| web | runware/alibaba:qwen-image@2512 | https://runware.ai/docs/models/alibaba-qwen-image-2512 | 官方文档 · Runware · Qwen-Image-2512 | Exact curated picker name; required to retain its spelling and separators. |
| web | runware/prunaai:1@1 | https://runware.ai/docs/models/prunaai-p-image | 官方文档 · Runware · P-Image | Exact curated picker name; required to retain its spelling and separators. |
| web | runware/runware:z-image@turbo | https://runware.ai/docs/models/alibaba-z-image-turbo | 官方文档 · Runware · Z-Image-Turbo | Exact curated picker name; required to retain its spelling and separators. |
| web | runware/alibaba:qwen-image-edit@2511 | https://runware.ai/docs/models/alibaba-qwen-image-edit-2511 | 官方文档 · Runware · Qwen-Image-Edit-2511 | Exact curated picker name; required to retain its spelling and separators. |
| web | runware/prunaai:2@1 | https://runware.ai/docs/models/prunaai-p-image-edit | 官方文档 · Runware · P-Image-Edit | Exact curated picker name; required to retain its spelling and separators. |
| web | runware/runware:201@10 | https://runware.ai/docs/models/alibaba-wan2-5-preview-image | 官方文档 · Runware · Wan2.5-Preview Image | Exact curated picker name; required to retain its spelling and separators. |
| web | runware/runware:108@22 | https://runware.ai/docs/models/alibaba-qwen-image-edit-plus | 官方文档 · Runware · Qwen-Image-Edit-Plus | Exact curated picker name; required to retain its spelling and separators. |
| web | runware/runware:108@20 | https://runware.ai/docs/models/alibaba-qwen-image-edit | 官方文档 · Runware · Qwen-Image-Edit | Exact curated picker name; required to retain its spelling and separators. |
| web | runware/runway:4@2 | https://runware.ai/docs/models/runway-gen-4-image-turbo | 官方文档 · Runware · Runway Gen-4 Image Turbo | Exact curated picker name; required to retain its spelling and separators. |
| web | runware/openai:gpt@5-mini | https://runware.ai/docs/models/openai-gpt-5-mini | 官方文档 · Runware · GPT-5 Mini | Exact curated picker name; required to retain its spelling and separators. |
| web | runware/openai:gpt@5-nano | https://runware.ai/docs/models/openai-gpt-5-nano | 官方文档 · Runware · GPT-5 Nano | Exact curated picker name; required to retain its spelling and separators. |
| web | runware/runware:108@1 | https://runware.ai/docs/models/alibaba-qwen-image | 官方文档 · Runware · Qwen-Image | Exact curated picker name; required to retain its spelling and separators. |
| web | runware/runway:4@1 | https://runware.ai/docs/models/runway-gen-4-image | 官方文档 · Runware · Runway Gen-4 Image | Exact curated picker name; required to retain its spelling and separators. |
| web | runware/runware:97@2 | https://runware.ai/docs/models/hidream-i1-dev | 官方文档 · Runware · HiDream-I1 Dev | Exact curated picker name; required to retain its spelling and separators. |
| web | runware/runware:97@1 | https://runware.ai/docs/models/hidream-i1-full | 官方文档 · Runware · HiDream-I1 Full | Exact curated picker name; required to retain its spelling and separators. |
| web | runware/runware:97@3 | https://runware.ai/docs/models/hidream-i1-fast | 官方文档 · Runware · HiDream-I1 Fast | Exact curated picker name; required to retain its spelling and separators. |
| web | runware/runware:150@2 | https://runware.ai/docs/models/meta-llava-1-6-mistral-7b | 官方文档 · Runware · LLaVA-1.6-Mistral-7B | Exact curated picker name; required to retain its spelling and separators. |
| web | runware/runware:152@1 | https://runware.ai/docs/models/alibaba-qwen2-5-vl-3b-instruct | 官方文档 · Runware · Qwen2.5-VL-3B-Instruct | Exact curated picker name; required to retain its spelling and separators. |
| web | runware/runware:152@1 | https://huggingface.co/Qwen/Qwen2.5-VL-3B-Instruct | 官方文档 · Hugging Face · Qwen2.5-VL-3B-Instruct | Exact curated picker name; required to retain its spelling and separators. |
| web | runware/runware:152@2 | https://runware.ai/docs/models/alibaba-qwen2-5-vl-7b-instruct | 官方文档 · Runware · Qwen2.5-VL-7B-Instruct | Exact curated picker name; required to retain its spelling and separators. |
| web | runware/runware:152@2 | https://huggingface.co/Qwen/Qwen2.5-VL-7B-Instruct | 官方文档 · Hugging Face · Qwen2.5-VL-7B-Instruct | Exact curated picker name; required to retain its spelling and separators. |
| web | tokenhub/deepseek-v4.1-flash | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/deepseek-v4.1-flash | https://cloud.tencent.com/document/product/1823/130079 | 官方文档 · 腾讯云 · 文档 130079 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/deepseek-v4.1-flash-1017 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/deepseek-v4.1-flash-1017 | https://cloud.tencent.com/document/product/1823/130079 | 官方文档 · 腾讯云 · 文档 130079 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/deepseek-v4.1-flash-1017 | https://cloud.tencent.com/document/product/1823/130055 | 官方文档 · 腾讯云 · 文档 130055 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/deepseek/deepseek-v4-flash-vision-exp | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/deepseek/deepseek-v4-flash-vision-exp | https://cloud.tencent.com/document/product/1823/132248 | 官方文档 · 腾讯云 · 文档 132248 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/deepseek-v4-pro-0813 | https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro-0813 | 官方文档 · Hugging Face · DeepSeek-V4-Pro 0813 正式版 | Exact curated picker name; required to retain its spelling and separators. |
| web | tokenhub/deepseek-v4-pro-0813 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/deepseek-v4-pro-0813 | https://cloud.tencent.com/document/product/1823/132248 | 官方文档 · 腾讯云 · 文档 132248 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/deepseek/deepseek-v4-pro-0813 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/deepseek/deepseek-v4-pro-0813 | https://cloud.tencent.com/document/product/1823/132248 | 官方文档 · 腾讯云 · 文档 132248 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/deepseek-v4-flash-0731 | https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731 | 官方文档 · Hugging Face · DeepSeek-V4-Flash 0731 正式版 | Exact curated picker name; required to retain its spelling and separators. |
| web | tokenhub/deepseek-v4-flash-0731 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/deepseek-v4-flash-0731 | https://cloud.tencent.com/document/product/1823/132248 | 官方文档 · 腾讯云 · 文档 132248 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/deepseek/deepseek-v4-flash-0731 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/deepseek/deepseek-v4-flash-0731 | https://cloud.tencent.com/document/product/1823/132248 | 官方文档 · 腾讯云 · 文档 132248 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/deepseek-v4-flash | https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash | 官方文档 · Hugging Face · DeepSeek-V4-Flash | Exact curated picker name; required to retain its spelling and separators. |
| web | tokenhub/deepseek-v4-flash | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/deepseek-v4-flash | https://cloud.tencent.com/document/product/1823/132248 | 官方文档 · 腾讯云 · 文档 132248 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/deepseek-v4-flash-202605 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/deepseek-v4-flash-202605 | https://cloud.tencent.com/document/product/1823/132248 | 官方文档 · 腾讯云 · 文档 132248 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/deepseek-v4-pro | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/deepseek-v4-pro | https://cloud.tencent.com/document/product/1823/132248 | 官方文档 · 腾讯云 · 文档 132248 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/deepseek-v4-pro | https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro | 官方文档 · Hugging Face · DeepSeek-V4-Pro | Exact curated picker name; required to retain its spelling and separators. |
| web | tokenhub/deepseek-v4-pro-202606 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/deepseek-v4-pro-202606 | https://cloud.tencent.com/document/product/1823/132248 | 官方文档 · 腾讯云 · 文档 132248 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/deepseek/deepseek-v4-flash | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/deepseek/deepseek-v4-flash | https://cloud.tencent.com/document/product/1823/132248 | 官方文档 · 腾讯云 · 文档 132248 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/deepseek/deepseek-v4-pro | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/deepseek/deepseek-v4-pro | https://cloud.tencent.com/document/product/1823/132248 | 官方文档 · 腾讯云 · 文档 132248 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/glm-5.3 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.3 | 官方文档 · 智谱 · GLM-5.3 | Exact curated picker name; required to retain its spelling and separators. |
| web | tokenhub/glm-5.3 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/glm-5.3 | https://cloud.tencent.com/document/product/1823/132061 | 官方文档 · 腾讯云 · 文档 132061 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/glm-5.3-flash | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5.3-flash | 官方文档 · 智谱 · GLM-5.3-Flash | Exact curated picker name; required to retain its spelling and separators. |
| web | tokenhub/glm-5.3-flash | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/glm-5.3-flash | https://cloud.tencent.com/document/product/1823/132061 | 官方文档 · 腾讯云 · 文档 132061 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/glm-5.3-flashx | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/glm-5.3-flashx | https://cloud.tencent.com/document/product/1823/132061 | 官方文档 · 腾讯云 · 文档 132061 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/glm-5.2 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.2 | 官方文档 · 智谱 · GLM-5.2 | Exact curated picker name; required to retain its spelling and separators. |
| web | tokenhub/glm-5.2 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/glm-5.2 | https://cloud.tencent.com/document/product/1823/132061 | 官方文档 · 腾讯云 · 文档 132061 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/glm-5.1 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.1 | 官方文档 · 智谱 · GLM-5.1（2026-10-08下线） | Exact curated picker name; required to retain its spelling and separators. |
| web | tokenhub/glm-5.1 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/glm-5.1 | https://cloud.tencent.com/document/product/1823/132061 | 官方文档 · 腾讯云 · 文档 132061 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/glm-5 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5 | 官方文档 · 智谱 · GLM-5（2026-10-08下线） | Exact curated picker name; required to retain its spelling and separators. |
| web | tokenhub/glm-5 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/glm-5 | https://cloud.tencent.com/document/product/1823/132061 | 官方文档 · 腾讯云 · 文档 132061 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/glm-5-turbo | https://docs.bigmodel.cn/cn/guide/models/text/glm-5-turbo | 官方文档 · 智谱 · GLM-5-Turbo（2026-10-08下线） | Exact curated picker name; required to retain its spelling and separators. |
| web | tokenhub/glm-5-turbo | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/glm-5-turbo | https://cloud.tencent.com/document/product/1823/132061 | 官方文档 · 腾讯云 · 文档 132061 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/glm-5v-turbo | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5v-turbo | 官方文档 · 智谱 · GLM-5V-Turbo（2026-10-30下线） | Exact curated picker name; required to retain its spelling and separators. |
| web | tokenhub/glm-5v-turbo | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/glm-5v-turbo | https://cloud.tencent.com/document/product/1823/132061 | 官方文档 · 腾讯云 · 文档 132061 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/hy4 | https://cloud.tencent.com/document/product/1823/132252 | 官方文档 · 腾讯云 · 文档 132252 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/hy4-preview | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/hy4-preview | https://cloud.tencent.com/document/product/1823/132252 | 官方文档 · 腾讯云 · 文档 132252 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/hy3 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/hy3 | https://cloud.tencent.com/document/product/1823/132252 | 官方文档 · 腾讯云 · 文档 132252 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/kimi-k3 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/kimi-k3 | https://cloud.tencent.com/document/product/1823/132232 | 官方文档 · 腾讯云 · 文档 132232 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/kimi-k2.7-code | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/kimi-k2.7-code | https://cloud.tencent.com/document/product/1823/132232 | 官方文档 · 腾讯云 · 文档 132232 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/kimi-k2.7-code-highspeed | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/kimi-k2.7-code-highspeed | https://cloud.tencent.com/document/product/1823/132232 | 官方文档 · 腾讯云 · 文档 132232 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/kimi-k2.6 | https://huggingface.co/moonshotai/Kimi-K2.6 | 官方文档 · Hugging Face · Kimi-K2.6 | Exact curated picker name; required to retain its spelling and separators. |
| web | tokenhub/kimi-k2.6 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/kimi-k2.6 | https://cloud.tencent.com/document/product/1823/132232 | 官方文档 · 腾讯云 · 文档 132232 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/minimax-m3 | https://huggingface.co/MiniMaxAI/MiniMax-M3 | 官方文档 · Hugging Face · MiniMax-M3 | Exact curated picker name; required to retain its spelling and separators. |
| web | tokenhub/minimax-m3 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/minimax-m3 | https://cloud.tencent.com/document/product/1823/132246 | 官方文档 · 腾讯云 · 文档 132246 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/minimax-m2.7 | https://huggingface.co/MiniMaxAI/MiniMax-M2.7 | 官方文档 · Hugging Face · MiniMax-M2.7 | Exact curated picker name; required to retain its spelling and separators. |
| web | tokenhub/minimax-m2.7 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/minimax-m2.7 | https://cloud.tencent.com/document/product/1823/132246 | 官方文档 · 腾讯云 · 文档 132246 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/step-5-preview | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/step-5-preview | https://cloud.tencent.com/document/product/1823/130079 | 官方文档 · 腾讯云 · 文档 130079 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/deepseek/deepseek-flash | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/deepseek/deepseek-flash | https://cloud.tencent.com/document/product/1823/132248 | 官方文档 · 腾讯云 · 文档 132248 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/hunyuan-t1-vision-20250916 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/hunyuan-t1-vision-20250916 | https://cloud.tencent.com/document/product/1823/136956 | 官方文档 · 腾讯云 · 文档 136956 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/hy-image-v3 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/hy-image-v3 | https://cloud.tencent.com/document/product/1823/135745 | 官方文档 · 腾讯云 · 文档 135745 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/hy-image-v3.5-preview | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/hy-image-v3.5-preview | https://cloud.tencent.com/document/product/1823/135745 | 官方文档 · 腾讯云 · 文档 135745 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/hy-vision-2.0-instruct | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/hy-vision-2.0-instruct | https://cloud.tencent.com/document/product/1823/136956 | 官方文档 · 腾讯云 · 文档 136956 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/kimi-k2.8-preview | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/kimi-k2.8-preview | https://cloud.tencent.com/document/product/1823/132232 | 官方文档 · 腾讯云 · 文档 132232 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/kimi-k3.1-pro | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/kimi-k3.1-pro | https://cloud.tencent.com/document/product/1823/132232 | 官方文档 · 腾讯云 · 文档 132232 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/kimi-k3.1-pro | https://cloud.tencent.com/document/product/1823/130055 | 官方文档 · 腾讯云 · 文档 130055 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/kimi-k3.1-pro-highspeed | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/kimi-k3.1-pro-highspeed | https://cloud.tencent.com/document/product/1823/132232 | 官方文档 · 腾讯云 · 文档 132232 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/kimi-k3.1-pro-highspeed | https://cloud.tencent.com/document/product/1823/130055 | 官方文档 · 腾讯云 · 文档 130055 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/mimo-v2.5-pro | https://mimo.mi.com/models/en-US/mimo-v2.5-pro | 官方文档 · MiMo · MiMo-V2.5-Pro | Exact curated picker name; required to retain its spelling and separators. |
| web | tokenhub/mimo-v2.5-pro | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/mimo-v2.5-pro | https://cloud.tencent.com/document/product/1823/130079 | 官方文档 · 腾讯云 · 文档 130079 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/mimo-v2.6-flash | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/mimo-v2.6-flash | https://cloud.tencent.com/document/product/1823/130079 | 官方文档 · 腾讯云 · 文档 130079 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/mimo-v2.6-pro | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/mimo-v2.6-pro | https://cloud.tencent.com/document/product/1823/130079 | 官方文档 · 腾讯云 · 文档 130079 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/minimax-m3.1-flash | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/minimax-m3.1-flash | https://cloud.tencent.com/document/product/1823/132246 | 官方文档 · 腾讯云 · 文档 132246 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/minimax-m3.1-flash | https://cloud.tencent.com/document/product/1823/130055 | 官方文档 · 腾讯云 · 文档 130055 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/seedream-image-v5.0-lite | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/seedream-image-v5.0-lite | https://cloud.tencent.com/document/product/1823/136609 | 官方文档 · 腾讯云 · 文档 136609 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/seedream-image-v5.0-pro | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/seedream-image-v5.0-pro | https://cloud.tencent.com/document/product/1823/136609 | 官方文档 · 腾讯云 · 文档 136609 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/vidu-image-q2 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/vidu-image-q2 | https://cloud.tencent.com/document/product/1823/135746 | 官方文档 · 腾讯云 · 文档 135746 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/wand-vega-image-flash | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/wand-vega-image-flash | https://cloud.tencent.com/document/product/1823/137203 | 官方文档 · 腾讯云 · 文档 137203 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/wand-vega-image-lite | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/wand-vega-image-lite | https://cloud.tencent.com/document/product/1823/137203 | 官方文档 · 腾讯云 · 文档 137203 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/wand-vega-image-pro | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/wand-vega-image-pro | https://cloud.tencent.com/document/product/1823/137203 | 官方文档 · 腾讯云 · 文档 137203 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/youtu-vita | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | tokenhub/youtu-vita | https://cloud.tencent.com/document/product/1823/136956 | 官方文档 · 腾讯云 · 文档 136956 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | xiaomi/mimo-v2.6-flash | https://mimo.mi.com/models/en-US/mimo-v2.6-flash | 官方文档 · MiMo · MiMo-V2.6-Flash | Exact curated picker name; required to retain its spelling and separators. |
| web | xiaomi/mimo-v2.6-pro | https://mimo.mi.com/models/en-US/mimo-v2.6-pro | 官方文档 · MiMo · MiMo-V2.6-Pro | Exact curated picker name; required to retain its spelling and separators. |
| web | sensenova/glm-5.2 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.2 | 官方文档 · 智谱 · GLM-5.2 | Exact curated picker name; required to retain its spelling and separators. |
| web | qianfan/deepseek-v4-pro-0813 | https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro-0813 | 官方文档 · Hugging Face · DeepSeek-V4-Pro-0813 | Exact curated picker name; required to retain its spelling and separators. |
| web | qianfan/deepseek-v4-flash-0731 | https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731 | 官方文档 · Hugging Face · DeepSeek-V4-Flash-0731 | Exact curated picker name; required to retain its spelling and separators. |
| web | qianfan/deepseek-v4-flash | https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash | 官方文档 · Hugging Face · DeepSeek-V4-Flash | Exact curated picker name; required to retain its spelling and separators. |
| web | qianfan/deepseek-v4-pro | https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro | 官方文档 · Hugging Face · DeepSeek-V4-Pro | Exact curated picker name; required to retain its spelling and separators. |
| web | qianfan/deepseek-v3.2 | https://huggingface.co/deepseek-ai/DeepSeek-V3.2 | 官方文档 · Hugging Face · DeepSeek-V3.2 | Exact curated picker name; required to retain its spelling and separators. |
| web | qianfan/glm-5.3 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.3 | 官方文档 · 智谱 · GLM-5.3 | Exact curated picker name; required to retain its spelling and separators. |
| web | qianfan/glm-5.3-flash | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5.3-flash | 官方文档 · 智谱 · GLM-5.3-Flash | Exact curated picker name; required to retain its spelling and separators. |
| web | qianfan/glm-5.2 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.2 | 官方文档 · 智谱 · GLM-5.2 | Exact curated picker name; required to retain its spelling and separators. |
| web | qianfan/glm-5.1 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.1 | 官方文档 · 智谱 · GLM-5.1 | Exact curated picker name; required to retain its spelling and separators. |
| web | qianfan/glm-5 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5 | 官方文档 · 智谱 · GLM-5 | Exact curated picker name; required to retain its spelling and separators. |
| web | qianfan/kimi-k2.6 | https://huggingface.co/moonshotai/Kimi-K2.6 | 官方文档 · Hugging Face · Kimi-K2.6 | Exact curated picker name; required to retain its spelling and separators. |
| web | qianfan/qwen3.5-122b-a10b | https://huggingface.co/Qwen/Qwen3.5-122B-A10B | 官方文档 · Hugging Face · Qwen3.5-122B-A10B | Exact curated picker name; required to retain its spelling and separators. |
| web | qianfan/qwen3.5-27b | https://huggingface.co/Qwen/Qwen3.5-27B | 官方文档 · Hugging Face · Qwen3.5-27B | Exact curated picker name; required to retain its spelling and separators. |
| web | qianfan/qwen3.5-35b-a3b | https://huggingface.co/Qwen/Qwen3.5-35B-A3B | 官方文档 · Hugging Face · Qwen3.5-35B-A3B | Exact curated picker name; required to retain its spelling and separators. |
| web | qianfan/qwen3.5-397b-a17b | https://huggingface.co/Qwen/Qwen3.5-397B-A17B | 官方文档 · Hugging Face · Qwen3.5-397B-A17B | Exact curated picker name; required to retain its spelling and separators. |
| web | qianfan/deepseek-ocr | https://huggingface.co/deepseek-ai/DeepSeek-OCR | 官方文档 · Hugging Face · DeepSeek-OCR | Exact curated picker name; required to retain its spelling and separators. |
| web | qianfan/internvl3-38b | https://huggingface.co/OpenGVLab/InternVL3-38B | 官方文档 · Hugging Face · InternVL3-38B | Exact curated picker name; required to retain its spelling and separators. |
| web | iflytek/spark-x2.6 | https://maas.xfyun.cn/doc/guide/3%E3%80%81API%20%E6%8E%A5%E5%8F%A3/3.1%20%E6%98%9F%E7%81%AB%E6%A8%A1%E5%9E%8B%20API/3.1.1%20Chat.html | 官方文档 · 讯飞星辰 · 3.1.1 Chat | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | iflytek/spark-x2.6-4b | https://maas.xfyun.cn/doc/guide/3%E3%80%81API%20%E6%8E%A5%E5%8F%A3/3.1%20%E6%98%9F%E7%81%AB%E6%A8%A1%E5%9E%8B%20API/3.1.1%20Chat.html | 官方文档 · 讯飞星辰 · 3.1.1 Chat | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| web | antling/Ling-2.6-1T | https://huggingface.co/inclusionAI/Ling-2.6-1T | 官方文档 · Hugging Face · Ling 2.6-1T | Exact curated picker name; required to retain its spelling and separators. |
| web | antling/Ring-2.6-1T | https://huggingface.co/inclusionAI/Ring-2.6-1T | 官方文档 · Hugging Face · Ring 2.6-1T | Exact curated picker name; required to retain its spelling and separators. |
| mini | zhipu/glm-5.3 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.3 | 官方文档 · 智谱 · GLM-5.3 | Exact curated picker name; required to retain its spelling and separators. |
| mini | zhipu/glm-5.1 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.1 | 官方文档 · 智谱 · GLM-5.1 | Exact curated picker name; required to retain its spelling and separators. |
| mini | zhipu/glm-5 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5 | 官方文档 · 智谱 · GLM-5 | Exact curated picker name; required to retain its spelling and separators. |
| mini | zhipu/glm-4.7 | https://docs.bigmodel.cn/cn/guide/models/text/glm-4.7 | 官方文档 · 智谱 · GLM-4.7 | Exact curated picker name; required to retain its spelling and separators. |
| mini | zhipu/glm-4.6 | https://docs.bigmodel.cn/cn/guide/models/text/glm-4.6 | 官方文档 · 智谱 · GLM-4.6 | Exact curated picker name; required to retain its spelling and separators. |
| mini | zhipu/glm-4.6v | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-4.6v | 官方文档 · 智谱 · GLM-4.6v | Exact curated picker name; required to retain its spelling and separators. |
| mini | siliconflow/MiniMaxAI/MiniMax-M2.5 | https://huggingface.co/MiniMaxAI/MiniMax-M2.5 | 官方文档 · Hugging Face · MiniMax-M2.5 | Exact curated picker name; required to retain its spelling and separators. |
| mini | siliconflow/Pro/MiniMaxAI/MiniMax-M2.5 | https://huggingface.co/MiniMaxAI/MiniMax-M2.5 | 官方文档 · Hugging Face · MiniMax-M2.5 | Exact curated picker name; required to retain its spelling and separators. |
| mini | siliconflow/Qwen/Qwen-Image-Edit-2509 | https://huggingface.co/Qwen/Qwen-Image-Edit-2509 | 官方文档 · Hugging Face · Qwen-Image-Edit-2509 | Exact curated picker name; required to retain its spelling and separators. |
| mini | siliconflow/Qwen/Qwen-Image-Edit | https://huggingface.co/Qwen/Qwen-Image-Edit | 官方文档 · Hugging Face · Qwen-Image-Edit | Exact curated picker name; required to retain its spelling and separators. |
| mini | siliconflow/Qwen/Qwen3.6-27B | https://huggingface.co/Qwen/Qwen3.6-27B | 官方文档 · Hugging Face · Qwen3.6-27B | Exact curated picker name; required to retain its spelling and separators. |
| mini | siliconflow/Qwen/Qwen3.6-35B-A3B | https://huggingface.co/Qwen/Qwen3.6-35B-A3B | 官方文档 · Hugging Face · Qwen3.6-35B-A3B | Exact curated picker name; required to retain its spelling and separators. |
| mini | siliconflow/Qwen/Qwen3.5-397B-A17B | https://huggingface.co/Qwen/Qwen3.5-397B-A17B | 官方文档 · Hugging Face · Qwen3.5-397B-A17B | Exact curated picker name; required to retain its spelling and separators. |
| mini | siliconflow/Qwen/Qwen3.5-4B | https://huggingface.co/Qwen/Qwen3.5-4B | 官方文档 · Hugging Face · Qwen3.5-4B | Exact curated picker name; required to retain its spelling and separators. |
| mini | siliconflow/Qwen/Qwen3.5-9B | https://huggingface.co/Qwen/Qwen3.5-9B | 官方文档 · Hugging Face · Qwen3.5-9B | Exact curated picker name; required to retain its spelling and separators. |
| mini | siliconflow/Qwen/Qwen3-14B | https://huggingface.co/Qwen/Qwen3-14B | 官方文档 · Hugging Face · Qwen3-14B | Exact curated picker name; required to retain its spelling and separators. |
| mini | siliconflow/Qwen/Qwen3-30B-A3B-Instruct-2507 | https://huggingface.co/Qwen/Qwen3-30B-A3B-Instruct-2507 | 官方文档 · Hugging Face · Qwen3-30B-A3B-Instruct-2507 | Exact curated picker name; required to retain its spelling and separators. |
| mini | siliconflow/Qwen/Qwen3-32B | https://huggingface.co/Qwen/Qwen3-32B | 官方文档 · Hugging Face · Qwen3-32B | Exact curated picker name; required to retain its spelling and separators. |
| mini | siliconflow/Qwen/Qwen3-8B | https://huggingface.co/Qwen/Qwen3-8B | 官方文档 · Hugging Face · Qwen3-8B | Exact curated picker name; required to retain its spelling and separators. |
| mini | siliconflow/Pro/Qwen/Qwen2.5-7B-Instruct | https://huggingface.co/Qwen/Qwen2.5-7B-Instruct | 官方文档 · Hugging Face · Qwen2.5-7B-Instruct | Exact curated picker name; required to retain its spelling and separators. |
| mini | siliconflow/Qwen/Qwen2.5-32B-Instruct | https://huggingface.co/Qwen/Qwen2.5-32B-Instruct | 官方文档 · Hugging Face · Qwen2.5-32B-Instruct | Exact curated picker name; required to retain its spelling and separators. |
| mini | siliconflow/Qwen/Qwen2.5-72B-Instruct | https://huggingface.co/Qwen/Qwen2.5-72B-Instruct | 官方文档 · Hugging Face · Qwen2.5-72B-Instruct | Exact curated picker name; required to retain its spelling and separators. |
| mini | siliconflow/Qwen/Qwen2.5-7B-Instruct | https://huggingface.co/Qwen/Qwen2.5-7B-Instruct | 官方文档 · Hugging Face · Qwen2.5-7B-Instruct | Exact curated picker name; required to retain its spelling and separators. |
| mini | siliconflow/deepseek-ai/DeepSeek-V4-Flash | https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash | 官方文档 · Hugging Face · DeepSeek-V4-Flash | Exact curated picker name; required to retain its spelling and separators. |
| mini | siliconflow/Pro/deepseek-ai/DeepSeek-V3.2 | https://huggingface.co/deepseek-ai/DeepSeek-V3.2 | 官方文档 · Hugging Face · DeepSeek-V3.2 | Exact curated picker name; required to retain its spelling and separators. |
| mini | siliconflow/deepseek-ai/DeepSeek-V3.2 | https://huggingface.co/deepseek-ai/DeepSeek-V3.2 | 官方文档 · Hugging Face · DeepSeek-V3.2 | Exact curated picker name; required to retain its spelling and separators. |
| mini | siliconflow/Pro/deepseek-ai/DeepSeek-V3.1-Terminus | https://huggingface.co/deepseek-ai/DeepSeek-V3.1-Terminus | 官方文档 · Hugging Face · DeepSeek-V3.1-Terminus | Exact curated picker name; required to retain its spelling and separators. |
| mini | siliconflow/deepseek-ai/DeepSeek-V3.1-Terminus | https://huggingface.co/deepseek-ai/DeepSeek-V3.1-Terminus | 官方文档 · Hugging Face · DeepSeek-V3.1-Terminus | Exact curated picker name; required to retain its spelling and separators. |
| mini | siliconflow/deepseek-ai/DeepSeek-R1-0528-Qwen3-8B | https://huggingface.co/deepseek-ai/DeepSeek-R1-0528-Qwen3-8B | 官方文档 · Hugging Face · DeepSeek-R1-0528-Qwen3-8B | Exact curated picker name; required to retain its spelling and separators. |
| mini | siliconflow/moonshotai/Kimi-K2.7-Code | https://huggingface.co/moonshotai/Kimi-K2.7-Code | 官方文档 · Hugging Face · Kimi-K2.7-Code | Exact curated picker name; required to retain its spelling and separators. |
| mini | siliconflow/zai-org/GLM-5.3 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.3 | 官方文档 · 智谱 · GLM-5.3 | Exact curated picker name; required to retain its spelling and separators. |
| mini | siliconflow/zai-org/GLM-5.2 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.2 | 官方文档 · 智谱 · GLM-5.2 | Exact curated picker name; required to retain its spelling and separators. |
| mini | siliconflow/Pro/zai-org/GLM-5.1 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.1 | 官方文档 · 智谱 · GLM-5.1 | Exact curated picker name; required to retain its spelling and separators. |
| mini | siliconflow/zai-org/GLM-4.5V | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-4.5v | 官方文档 · 智谱 · GLM-4.5V | Exact curated picker name; required to retain its spelling and separators. |
| mini | siliconflow/Pro/deepseek-ai/DeepSeek-V3 | https://huggingface.co/deepseek-ai/DeepSeek-V3 | 官方文档 · Hugging Face · DeepSeek-V3 | Exact curated picker name; required to retain its spelling and separators. |
| mini | siliconflow/deepseek-ai/DeepSeek-V3 | https://huggingface.co/deepseek-ai/DeepSeek-V3 | 官方文档 · Hugging Face · DeepSeek-V3 | Exact curated picker name; required to retain its spelling and separators. |
| mini | siliconflow/ByteDance-Seed/Seed-OSS-36B-Instruct | https://huggingface.co/ByteDance-Seed/Seed-OSS-36B-Instruct | 官方文档 · Hugging Face · Seed-OSS-36B-Instruct | Exact curated picker name; required to retain its spelling and separators. |
| mini | siliconflow/Pro/deepseek-ai/DeepSeek-R1 | https://huggingface.co/deepseek-ai/DeepSeek-R1 | 官方文档 · Hugging Face · DeepSeek-R1 | Exact curated picker name; required to retain its spelling and separators. |
| mini | siliconflow/Qwen/Qwen3-Coder-30B-A3B-Instruct | https://huggingface.co/Qwen/Qwen3-Coder-30B-A3B-Instruct | 官方文档 · Hugging Face · Qwen3-Coder-30B-A3B-Instruct | Exact curated picker name; required to retain its spelling and separators. |
| mini | siliconflow/Qwen/Qwen3-Omni-30B-A3B-Instruct | https://huggingface.co/Qwen/Qwen3-Omni-30B-A3B-Instruct | 官方文档 · Hugging Face · Qwen3-Omni-30B-A3B-Instruct | Exact curated picker name; required to retain its spelling and separators. |
| mini | siliconflow/Qwen/Qwen3-Omni-30B-A3B-Thinking | https://huggingface.co/Qwen/Qwen3-Omni-30B-A3B-Thinking | 官方文档 · Hugging Face · Qwen3-Omni-30B-A3B-Thinking | Exact curated picker name; required to retain its spelling and separators. |
| mini | siliconflow/Qwen/Qwen3-VL-30B-A3B-Instruct | https://huggingface.co/Qwen/Qwen3-VL-30B-A3B-Instruct | 官方文档 · Hugging Face · Qwen3-VL-30B-A3B-Instruct | Exact curated picker name; required to retain its spelling and separators. |
| mini | siliconflow/Qwen/Qwen3-VL-30B-A3B-Thinking | https://huggingface.co/Qwen/Qwen3-VL-30B-A3B-Thinking | 官方文档 · Hugging Face · Qwen3-VL-30B-A3B-Thinking | Exact curated picker name; required to retain its spelling and separators. |
| mini | siliconflow/Qwen/Qwen3-VL-32B-Instruct | https://huggingface.co/Qwen/Qwen3-VL-32B-Instruct | 官方文档 · Hugging Face · Qwen3-VL-32B-Instruct | Exact curated picker name; required to retain its spelling and separators. |
| mini | siliconflow/Qwen/Qwen3-VL-32B-Thinking | https://huggingface.co/Qwen/Qwen3-VL-32B-Thinking | 官方文档 · Hugging Face · Qwen3-VL-32B-Thinking | Exact curated picker name; required to retain its spelling and separators. |
| mini | siliconflow/Qwen/Qwen3-VL-8B-Instruct | https://huggingface.co/Qwen/Qwen3-VL-8B-Instruct | 官方文档 · Hugging Face · Qwen3-VL-8B-Instruct | Exact curated picker name; required to retain its spelling and separators. |
| mini | siliconflow/Qwen/Qwen3-VL-8B-Thinking | https://huggingface.co/Qwen/Qwen3-VL-8B-Thinking | 官方文档 · Hugging Face · Qwen3-VL-8B-Thinking | Exact curated picker name; required to retain its spelling and separators. |
| mini | siliconflow/Tongyi-MAI/Z-Image | https://huggingface.co/Tongyi-MAI/Z-Image | 官方文档 · Hugging Face · Z-Image | Exact curated picker name; required to retain its spelling and separators. |
| mini | siliconflow/baidu/ERNIE-Image-Turbo | https://huggingface.co/baidu/ERNIE-Image-Turbo | 官方文档 · Hugging Face · ERNIE-Image-Turbo | Exact curated picker name; required to retain its spelling and separators. |
| mini | siliconflow/deepseek-ai/DeepSeek-R1 | https://huggingface.co/deepseek-ai/DeepSeek-R1 | 官方文档 · Hugging Face · DeepSeek-R1 | Exact curated picker name; required to retain its spelling and separators. |
| mini | siliconflow/meituan-longcat/LongCat-2.0 | https://huggingface.co/meituan-longcat/LongCat-2.0 | 官方文档 · Hugging Face · LongCat-2.0 | Exact curated picker name; required to retain its spelling and separators. |
| mini | siliconflow/nex-agi/Nex-N2-Pro | https://huggingface.co/nex-agi/Nex-N2-Pro | 官方文档 · Hugging Face · Nex-N2-Pro | Exact curated picker name; required to retain its spelling and separators. |
| mini | siliconflow/tencent/Hunyuan-A13B-Instruct | https://huggingface.co/tencent/Hunyuan-A13B-Instruct | 官方文档 · Hugging Face · Hunyuan-A13B-Instruct | Exact curated picker name; required to retain its spelling and separators. |
| mini | xai/grok-4.5 | https://docs.x.ai/developers/models/grok-4.5 | 官方文档 · xAI · Grok-4.5 | Exact curated picker name; required to retain its spelling and separators. |
| mini | xai/grok-4.3 | https://docs.x.ai/developers/models/grok-4.3 | 官方文档 · xAI · Grok-4.3 | Exact curated picker name; required to retain its spelling and separators. |
| mini | gemini/gemini-3.5-flash-lite | https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite | 官方文档 · Google · Gemini 3.5 Flash-Lite | Exact curated picker name; required to retain its spelling and separators. |
| mini | gemini/gemini-3.1-flash-lite | https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite | 官方文档 · Google · Gemini 3.1 Flash-Lite | Exact curated picker name; required to retain its spelling and separators. |
| mini | gemini/gemini-2.5-flash-lite | https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-lite | 官方文档 · Google · Gemini 2.5 Flash-Lite | Exact curated picker name; required to retain its spelling and separators. |
| mini | bailian/deepseek-v4.1-flash | https://help.aliyun.com/zh/model-studio/deepseek-v4-1-flash | 官方文档 · 百炼 · DeepSeek-V4.1-Flash | Exact curated picker name; required to retain its spelling and separators. |
| mini | bailian/deepseek-v4-pro-0813 | https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro-0813 | 官方文档 · Hugging Face · DeepSeek-V4-Pro-0813 | Exact curated picker name; required to retain its spelling and separators. |
| mini | bailian/deepseek-v4-flash-0731 | https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731 | 官方文档 · Hugging Face · DeepSeek-V4-Flash-0731 | Exact curated picker name; required to retain its spelling and separators. |
| mini | bailian/glm-5.1 | https://help.aliyun.com/zh/model-studio/glm-5-1 | 官方文档 · 百炼 · GLM-5.1 | Exact curated picker name; required to retain its spelling and separators. |
| mini | bailian/ZHIPU/GLM-5 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5 | 官方文档 · 智谱 · GLM-5 | Exact curated picker name; required to retain its spelling and separators. |
| mini | bailian/glm-5 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5 | 官方文档 · 智谱 · GLM-5 | Exact curated picker name; required to retain its spelling and separators. |
| mini | bailian/kimi-k2.6 | https://help.aliyun.com/zh/model-studio/kimi-k2-6 | 官方文档 · 百炼 · Kimi-k2.6 | Exact curated picker name; required to retain its spelling and separators. |
| mini | bailian/kimi-k2.5 | https://help.aliyun.com/zh/model-studio/kimi-k2-5 | 官方文档 · 百炼 · Kimi-k2.5 | Exact curated picker name; required to retain its spelling and separators. |
| mini | bailian/kimi/kimi-k2.5 | https://huggingface.co/moonshotai/Kimi-K2.5 | 官方文档 · Hugging Face · Kimi-k2.5 | Exact curated picker name; required to retain its spelling and separators. |
| mini | bailian/qwen3.6-27b | https://huggingface.co/Qwen/Qwen3.6-27B | 官方文档 · Hugging Face · Qwen3.6-27b | Exact curated picker name; required to retain its spelling and separators. |
| mini | bailian/qwen3.6-35b-a3b | https://huggingface.co/Qwen/Qwen3.6-35B-A3B | 官方文档 · Hugging Face · Qwen3.6-35b-a3b | Exact curated picker name; required to retain its spelling and separators. |
| mini | bailian/qwen3-max | https://www.aliyun.com/notice/118344 | 下线公告 · 百炼 · 文档 118344 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | bailian/qwen3-max-2025-09-23 | https://www.aliyun.com/notice/118345 | 下线公告 · 百炼 · 文档 118345 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | bailian/qwen3-max-2026-01-23 | https://www.aliyun.com/notice/118345 | 下线公告 · 百炼 · 文档 118345 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | bailian/qwen3-max-preview | https://www.aliyun.com/notice/118344 | 下线公告 · 百炼 · 文档 118344 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | bailian/qwen-turbo | https://www.aliyun.com/notice/118177 | 下线公告 · 百炼 · 文档 118177 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | bailian/qwen3-coder-next | https://www.aliyun.com/notice/118345 | 下线公告 · 百炼 · 文档 118345 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | openai/gpt-6.1-sol | https://developers.openai.com/api/docs/models/gpt-6.1-sol | 官方文档 · OpenAI · GPT-6.1 Sol | Exact curated picker name; required to retain its spelling and separators. |
| mini | openai/gpt-6-luna | https://developers.openai.com/api/docs/models/gpt-6-luna.md | 官方文档 · OpenAI · GPT-6 Luna | Exact curated picker name; required to retain its spelling and separators. |
| mini | openai/gpt-6-sol | https://developers.openai.com/api/docs/models/gpt-6-sol.md | 官方文档 · OpenAI · GPT-6 Sol | Exact curated picker name; required to retain its spelling and separators. |
| mini | openai/gpt-6-astra | https://developers.openai.com/api/docs/models/gpt-6-astra.md | 官方文档 · OpenAI · GPT-6 Astra | Exact curated picker name; required to retain its spelling and separators. |
| mini | openai/gpt-5.6-luna | https://developers.openai.com/api/docs/models/gpt-5.6-luna.md | 官方文档 · OpenAI · GPT-5.6 Luna | Exact curated picker name; required to retain its spelling and separators. |
| mini | openai/gpt-5.6-sol | https://developers.openai.com/api/docs/models/gpt-5.6-sol.md | 官方文档 · OpenAI · GPT-5.6 Sol | Exact curated picker name; required to retain its spelling and separators. |
| mini | openai/gpt-5.6-terra | https://developers.openai.com/api/docs/models/gpt-5.6-terra.md | 官方文档 · OpenAI · GPT-5.6 Terra | Exact curated picker name; required to retain its spelling and separators. |
| mini | openai/o1-2024-12-17 | https://developers.openai.com/api/docs/models/o1 | 官方文档 · OpenAI · O1 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | openai/o3-2025-04-16 | https://developers.openai.com/api/docs/models/o3 | 官方文档 · OpenAI · O3 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | ark/deepseek-v4-1-flash-260910 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | ark/deepseek-v4-flash-260425 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | ark/deepseek-v4-flash-ga-260731 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | ark/deepseek-v4-pro-260425 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | ark/deepseek-v4-pro-ga-260813 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | ark/doubao-seed-2-1-pro-260628 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | ark/doubao-seed-2-1-pro-260915 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | ark/doubao-seed-2-1-turbo-260628 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | ark/doubao-seed-2-0-code-preview-260215 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | ark/doubao-seed-2-0-lite-260215 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | ark/doubao-seed-2-0-lite-260428 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | ark/doubao-seed-2-0-mini-260215 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | ark/doubao-seed-2-0-mini-260428 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | ark/doubao-seed-2-0-pro-260215 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | ark/doubao-seed-1-6-250615 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | ark/doubao-seed-1-6-251015 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | ark/doubao-seed-1-6-flash-250615 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | ark/doubao-seed-1-6-flash-250828 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | ark/doubao-seed-1-6-vision-250815 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | ark/doubao-1-5-lite-32k-250115 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | ark/doubao-1-5-pro-32k-250115 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | ark/doubao-1-5-vision-pro-32k-250115 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | ark/doubao-seedream-4-5-251128 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | ark/doubao-seedream-4-0-250828 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | ark/glm-5-3-flash-260828 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | ark/glm-5-2-260617 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | ark/doubao-seed-evolving | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | ark/glm-4-7-251222 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | mistral/codestral-2508 | https://docs.mistral.ai/models/codestral-25-08 | 官方文档 · Mistral · Codestral 2508 | 2508 is the curated release code; the page spells that date code 25-08. No model version was collapsed. |
| mini | mistral/codestral-latest | https://docs.mistral.ai/models/codestral-25-08 | 官方文档 · Mistral · Codestral（2508） | 2508 is the curated release code; the page spells that date code 25-08. No model version was collapsed. |
| mini | together/deepseek-ai/DeepSeek-V4.1-Flash | https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash | 官方文档 · Hugging Face · DeepSeek-V4.1-Flash | Exact curated picker name; required to retain its spelling and separators. |
| mini | together/deepseek-ai/DeepSeek-V4-Pro-0813 | https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro-0813 | 官方文档 · Hugging Face · DeepSeek-V4-Pro-0813 | Exact curated picker name; required to retain its spelling and separators. |
| mini | together/deepseek-ai/DeepSeek-V4-Flash-0731 | https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731 | 官方文档 · Hugging Face · DeepSeek-V4-Flash-0731 | Exact curated picker name; required to retain its spelling and separators. |
| mini | together/zai-org/GLM-5.3 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.3 | 官方文档 · 智谱 · GLM-5.3 | Exact curated picker name; required to retain its spelling and separators. |
| mini | together/zai-org/GLM-5.3-Flash | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5.3-flash | 官方文档 · 智谱 · GLM-5.3 Flash | Exact curated picker name; required to retain its spelling and separators. |
| mini | together/zai-org/GLM-5.2 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.2 | 官方文档 · 智谱 · GLM-5.2 | Exact curated picker name; required to retain its spelling and separators. |
| mini | together/openai/gpt-oss-120b | https://developers.openai.com/api/docs/models/gpt-oss-120b | 官方文档 · OpenAI · GPT-OSS 120B | Exact curated picker name; required to retain its spelling and separators. |
| mini | fireworks/accounts/fireworks/models/deepseek-v4p1-flash | https://fireworks.ai/models/deepseek-ai/deepseek-v4p1-flash | 官方文档 · Fireworks · DeepSeek-V4.1-Flash | Exact curated picker name; required to retain its spelling and separators. |
| mini | fal/fal-ai/flux-2 | https://fal.ai/models/fal-ai/flux-2/api | 官方文档 · fal · FLUX-2 API 文档 | Exact curated picker name; required to retain its spelling and separators. |
| mini | replicate/bytedance/seedream-4.5 | https://replicate.com/bytedance/seedream-4.5 | 官方文档 · Replicate · Seedream-4.5 | Exact curated picker name; required to retain its spelling and separators. |
| mini | replicate/bytedance/seedream-4 | https://replicate.com/bytedance/seedream-4 | 官方文档 · Replicate · Seedream-4 | Exact curated picker name; required to retain its spelling and separators. |
| mini | replicate/bytedance/seedream-3 | https://replicate.com/bytedance/seedream-3 | 官方文档 · Replicate · Seedream-3 | Exact curated picker name; required to retain its spelling and separators. |
| mini | tokendance/deepseek-v4.1-flash | https://tokendance.space/models/deepseek-v4.1-flash | 官方文档 · TokenDance · DeepSeek-V4.1-Flash | Exact curated picker name; required to retain its spelling and separators. |
| mini | tokendance/deepseek-v4-pro-0813 | https://tokendance.space/models/deepseek-v4-pro-0813 | 官方文档 · TokenDance · DeepSeek-V4-Pro-0813 | Exact curated picker name; required to retain its spelling and separators. |
| mini | tokendance/deepseek-v4-flash-0731 | https://tokendance.space/models/deepseek-v4-flash-0731 | 官方文档 · TokenDance · DeepSeek-V4-Flash-0731 | Exact curated picker name; required to retain its spelling and separators. |
| mini | tokendance/deepseek-v4-flash | https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash | 原厂规格 · Hugging Face · DeepSeek-V4-Flash Preview | Exact curated picker name; required to retain its spelling and separators. |
| mini | tokendance/deepseek-v4-pro | https://tokendance.space/models/deepseek-v4-pro | 官方文档 · TokenDance · DeepSeek-V4-Pro Preview | Exact curated picker name; required to retain its spelling and separators. |
| mini | tokendance/deepseek-v3.2 | https://huggingface.co/deepseek-ai/DeepSeek-V3.2 | 原厂规格 · Hugging Face · DeepSeek-V3.2 | Exact curated picker name; required to retain its spelling and separators. |
| mini | tokendance/qwen3.8-max-0902 | https://tokendance.space/models/qwen3.8-max-0902 | 官方文档 · TokenDance · Qwen3.8-Max-0902 | Exact curated picker name; required to retain its spelling and separators. |
| mini | tokendance/qwen3.5-35b-a3b | https://tokendance.space/models/qwen3.5-35b-a3b | 官方文档 · TokenDance · Qwen3.5-35B-A3B | Exact curated picker name; required to retain its spelling and separators. |
| mini | tokendance/seed-2.1-pro | https://tokendance.space/models/seed-2.1-pro | 官方文档 · TokenDance · Seed-2.1-Pro | Exact curated picker name; required to retain its spelling and separators. |
| mini | tokendance/seed-2.1-turbo | https://tokendance.space/models/seed-2.1-turbo | 官方文档 · TokenDance · Seed-2.1-Turbo | Exact curated picker name; required to retain its spelling and separators. |
| mini | tokendance/seed-2.0-code | https://tokendance.space/models/seed-2.0-code | 官方文档 · TokenDance · Seed-2.0-Code | Exact curated picker name; required to retain its spelling and separators. |
| mini | tokendance/seed-2.0-lite | https://tokendance.space/models/seed-2.0-lite | 官方文档 · TokenDance · Seed-2.0-Lite | Exact curated picker name; required to retain its spelling and separators. |
| mini | tokendance/seed-2.0-mini | https://tokendance.space/models/seed-2.0-mini | 官方文档 · TokenDance · Seed-2.0-Mini | Exact curated picker name; required to retain its spelling and separators. |
| mini | tokendance/seed-2.0-pro | https://tokendance.space/models/seed-2.0-pro | 官方文档 · TokenDance · Seed-2.0-Pro | Exact curated picker name; required to retain its spelling and separators. |
| mini | tokendance/dots-3-note-preview | https://tokendance.space/models/dots-3-note-preview | 官方文档 · TokenDance · Dots3-Note Preview（Free） | Exact curated picker name; required to retain its spelling and separators. |
| mini | tokendance/longcat-2.0 | https://tokendance.space/models/longcat-2.0 | 官方文档 · TokenDance · LongCat-2.0 | Exact curated picker name; required to retain its spelling and separators. |
| mini | tokendance/mimo-v2.5 | https://tokendance.space/models/mimo-v2.5 | 官方文档 · TokenDance · MiMo-V2.5 | Exact curated picker name; required to retain its spelling and separators. |
| mini | tokendance/mimo-v2.5-pro | https://tokendance.space/models/mimo-v2.5-pro | 官方文档 · TokenDance · MiMo-V2.5-Pro | Exact curated picker name; required to retain its spelling and separators. |
| mini | tokendance/mimo-v2.6-flash | https://tokendance.space/models/mimo-v2.6-flash | 官方文档 · TokenDance · Mimo-V2.6-Flash | Exact curated picker name; required to retain its spelling and separators. |
| mini | tokendance/mimo-v2.6-pro | https://tokendance.space/models/mimo-v2.6-pro | 官方文档 · TokenDance · Mimo-V2.6-Pro | Exact curated picker name; required to retain its spelling and separators. |
| mini | tokendance/mimo-v2.6-ultraspeed | https://tokendance.space/models/mimo-v2.6-ultraspeed | 官方文档 · TokenDance · MiMo-V2.6-Pro-UltraSpeed | Exact curated picker name; required to retain its spelling and separators. |
| mini | tokendance/seed-evolving | https://tokendance.space/models/seed-evolving | 官方文档 · TokenDance · Seed-Evolving | Exact curated picker name; required to retain its spelling and separators. |
| mini | tokendance/spark-x2.5-1.7b | https://tokendance.space/models/spark-x2.5-1.7b | 官方文档 · TokenDance · Spark-X2.5-1.7B | Exact curated picker name; required to retain its spelling and separators. |
| mini | tokendance/spark-x2.5-4b | https://tokendance.space/models/spark-x2.5-4b | 官方文档 · TokenDance · Spark-X2.5-4B | Exact curated picker name; required to retain its spelling and separators. |
| mini | runware/alibaba:qwen-image@2.1-turbo | https://runware.ai/docs/models/alibaba-qwen-image-2-1-turbo | 官方文档 · Runware · Qwen-Image-2.1-Turbo | Exact curated picker name; required to retain its spelling and separators. |
| mini | runware/openai:gpt-image@2.5-flare | https://runware.ai/docs/models/openai-gpt-image-2-5-flare | 官方文档 · Runware · GPT-Image-2.5 Flare | Exact curated picker name; required to retain its spelling and separators. |
| mini | runware/openai:gpt-image@2.5-sunburst | https://runware.ai/docs/models/openai-gpt-image-2-5-sunburst | 官方文档 · Runware · GPT-Image-2.5 Sunburst | Exact curated picker name; required to retain its spelling and separators. |
| mini | runware/alibaba:qwen-image@3.0 | https://runware.ai/docs/models/alibaba-qwen-image-3-0 | 官方文档 · Runware · Qwen-Image-3.0 | Exact curated picker name; required to retain its spelling and separators. |
| mini | runware/alibaba:qwen-image@3.0-pro | https://runware.ai/docs/models/alibaba-qwen-image-3-0-pro | 官方文档 · Runware · Qwen-Image-3.0-Pro | Exact curated picker name; required to retain its spelling and separators. |
| mini | runware/deepseek:v4@flash | https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash | 官方文档 · Hugging Face · DeepSeek-V4-Flash-0731 | Exact curated picker name; required to retain its spelling and separators. |
| mini | runware/prunaai:p-image@ideogram | https://runware.ai/docs/models/prunaai-p-image-ideogram | 官方文档 · Runware · P-Image-Ideogram | Exact curated picker name; required to retain its spelling and separators. |
| mini | runware/luma:uni@1 | https://runware.ai/docs/models/luma-uni-1 | 官方文档 · Runware · UNI-1 | Exact curated picker name; required to retain its spelling and separators. |
| mini | runware/luma:uni@1-max | https://runware.ai/docs/models/luma-uni-1-max | 官方文档 · Runware · UNI-1 Max | Exact curated picker name; required to retain its spelling and separators. |
| mini | runware/openai:gpt@5.5 | https://runware.ai/docs/models/openai-gpt-5-5 | 官方文档 · Runware · GPT-5.5 | Exact curated picker name; required to retain its spelling and separators. |
| mini | runware/baidu:ernie-image@0 | https://runware.ai/docs/models/baidu-ernie-image | 官方文档 · Runware · ERNIE-Image | Exact curated picker name; required to retain its spelling and separators. |
| mini | runware/baidu:ernie-image@turbo | https://runware.ai/docs/models/baidu-ernie-image-turbo | 官方文档 · Runware · ERNIE-Image-Turbo | Exact curated picker name; required to retain its spelling and separators. |
| mini | runware/zai:glm@5.1 | https://runware.ai/docs/models/zai-glm-5-1 | 官方文档 · Runware · GLM-5.1 | Exact curated picker name; required to retain its spelling and separators. |
| mini | runware/openai:gpt@5.4-mini | https://runware.ai/docs/models/openai-gpt-5-4-mini | 官方文档 · Runware · GPT-5.4 Mini | Exact curated picker name; required to retain its spelling and separators. |
| mini | runware/openai:gpt@5.4-nano | https://runware.ai/docs/models/openai-gpt-5-4-nano | 官方文档 · Runware · GPT-5.4 Nano | Exact curated picker name; required to retain its spelling and separators. |
| mini | runware/openai:gpt@5.4 | https://runware.ai/docs/models/openai-gpt-5-4 | 官方文档 · Runware · GPT-5.4 | Exact curated picker name; required to retain its spelling and separators. |
| mini | runware/openai:gpt@5.4-pro | https://runware.ai/docs/models/openai-gpt-5-4-pro | 官方文档 · Runware · GPT-5.4 Pro | Exact curated picker name; required to retain its spelling and separators. |
| mini | runware/alibaba:qwen-image@2.0 | https://runware.ai/docs/models/alibaba-qwen-image-2-0 | 官方文档 · Runware · Qwen-Image-2.0 | Exact curated picker name; required to retain its spelling and separators. |
| mini | runware/alibaba:qwen-image@2.0-pro | https://runware.ai/docs/models/alibaba-qwen-image-2-0-pro | 官方文档 · Runware · Qwen-Image-2.0-Pro | Exact curated picker name; required to retain its spelling and separators. |
| mini | runware/runware:z-image@0 | https://runware.ai/docs/models/alibaba-z-image | 官方文档 · Runware · Z-Image | Exact curated picker name; required to retain its spelling and separators. |
| mini | runware/runware:twinflow-z-image-turbo@0 | https://runware.ai/docs/models/twinflow-z-image-turbo | 官方文档 · Runware · TwinFlow Z-Image-Turbo | Exact curated picker name; required to retain its spelling and separators. |
| mini | runware/alibaba:qwen-image@2512 | https://runware.ai/docs/models/alibaba-qwen-image-2512 | 官方文档 · Runware · Qwen-Image-2512 | Exact curated picker name; required to retain its spelling and separators. |
| mini | runware/prunaai:1@1 | https://runware.ai/docs/models/prunaai-p-image | 官方文档 · Runware · P-Image | Exact curated picker name; required to retain its spelling and separators. |
| mini | runware/runware:z-image@turbo | https://runware.ai/docs/models/alibaba-z-image-turbo | 官方文档 · Runware · Z-Image-Turbo | Exact curated picker name; required to retain its spelling and separators. |
| mini | runware/alibaba:qwen-image-edit@2511 | https://runware.ai/docs/models/alibaba-qwen-image-edit-2511 | 官方文档 · Runware · Qwen-Image-Edit-2511 | Exact curated picker name; required to retain its spelling and separators. |
| mini | runware/prunaai:2@1 | https://runware.ai/docs/models/prunaai-p-image-edit | 官方文档 · Runware · P-Image-Edit | Exact curated picker name; required to retain its spelling and separators. |
| mini | runware/runware:201@10 | https://runware.ai/docs/models/alibaba-wan2-5-preview-image | 官方文档 · Runware · Wan2.5-Preview Image | Exact curated picker name; required to retain its spelling and separators. |
| mini | runware/runware:108@22 | https://runware.ai/docs/models/alibaba-qwen-image-edit-plus | 官方文档 · Runware · Qwen-Image-Edit-Plus | Exact curated picker name; required to retain its spelling and separators. |
| mini | runware/runware:108@20 | https://runware.ai/docs/models/alibaba-qwen-image-edit | 官方文档 · Runware · Qwen-Image-Edit | Exact curated picker name; required to retain its spelling and separators. |
| mini | runware/runway:4@2 | https://runware.ai/docs/models/runway-gen-4-image-turbo | 官方文档 · Runware · Runway Gen-4 Image Turbo | Exact curated picker name; required to retain its spelling and separators. |
| mini | runware/openai:gpt@5-mini | https://runware.ai/docs/models/openai-gpt-5-mini | 官方文档 · Runware · GPT-5 Mini | Exact curated picker name; required to retain its spelling and separators. |
| mini | runware/openai:gpt@5-nano | https://runware.ai/docs/models/openai-gpt-5-nano | 官方文档 · Runware · GPT-5 Nano | Exact curated picker name; required to retain its spelling and separators. |
| mini | runware/runware:108@1 | https://runware.ai/docs/models/alibaba-qwen-image | 官方文档 · Runware · Qwen-Image | Exact curated picker name; required to retain its spelling and separators. |
| mini | runware/runway:4@1 | https://runware.ai/docs/models/runway-gen-4-image | 官方文档 · Runware · Runway Gen-4 Image | Exact curated picker name; required to retain its spelling and separators. |
| mini | runware/runware:97@2 | https://runware.ai/docs/models/hidream-i1-dev | 官方文档 · Runware · HiDream-I1 Dev | Exact curated picker name; required to retain its spelling and separators. |
| mini | runware/runware:97@1 | https://runware.ai/docs/models/hidream-i1-full | 官方文档 · Runware · HiDream-I1 Full | Exact curated picker name; required to retain its spelling and separators. |
| mini | runware/runware:97@3 | https://runware.ai/docs/models/hidream-i1-fast | 官方文档 · Runware · HiDream-I1 Fast | Exact curated picker name; required to retain its spelling and separators. |
| mini | runware/runware:150@2 | https://runware.ai/docs/models/meta-llava-1-6-mistral-7b | 官方文档 · Runware · LLaVA-1.6-Mistral-7B | Exact curated picker name; required to retain its spelling and separators. |
| mini | runware/runware:152@1 | https://runware.ai/docs/models/alibaba-qwen2-5-vl-3b-instruct | 官方文档 · Runware · Qwen2.5-VL-3B-Instruct | Exact curated picker name; required to retain its spelling and separators. |
| mini | runware/runware:152@2 | https://runware.ai/docs/models/alibaba-qwen2-5-vl-7b-instruct | 官方文档 · Runware · Qwen2.5-VL-7B-Instruct | Exact curated picker name; required to retain its spelling and separators. |
| mini | tokenhub/deepseek-v4.1-flash-1017 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | tokenhub/deepseek-v4-pro-0813 | https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro-0813 | 官方文档 · Hugging Face · DeepSeek-V4-Pro 0813 正式版 | Exact curated picker name; required to retain its spelling and separators. |
| mini | tokenhub/deepseek-v4-flash-0731 | https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731 | 官方文档 · Hugging Face · DeepSeek-V4-Flash 0731 正式版 | Exact curated picker name; required to retain its spelling and separators. |
| mini | tokenhub/deepseek-v4-flash | https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash | 官方文档 · Hugging Face · DeepSeek-V4-Flash | Exact curated picker name; required to retain its spelling and separators. |
| mini | tokenhub/deepseek-v4-flash-202605 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | tokenhub/deepseek-v4-pro-202606 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | tokenhub/glm-5.3 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.3 | 官方文档 · 智谱 · GLM-5.3 | Exact curated picker name; required to retain its spelling and separators. |
| mini | tokenhub/glm-5.3-flash | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5.3-flash | 官方文档 · 智谱 · GLM-5.3-Flash | Exact curated picker name; required to retain its spelling and separators. |
| mini | tokenhub/glm-5.2 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.2 | 官方文档 · 智谱 · GLM-5.2 | Exact curated picker name; required to retain its spelling and separators. |
| mini | tokenhub/glm-5.1 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.1 | 官方文档 · 智谱 · GLM-5.1（2026-10-08下线） | Exact curated picker name; required to retain its spelling and separators. |
| mini | tokenhub/glm-5 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5 | 官方文档 · 智谱 · GLM-5（2026-10-08下线） | Exact curated picker name; required to retain its spelling and separators. |
| mini | tokenhub/glm-5-turbo | https://docs.bigmodel.cn/cn/guide/models/text/glm-5-turbo | 官方文档 · 智谱 · GLM-5-Turbo（2026-10-08下线） | Exact curated picker name; required to retain its spelling and separators. |
| mini | tokenhub/glm-5v-turbo | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5v-turbo | 官方文档 · 智谱 · GLM-5V-Turbo（2026-10-30下线） | Exact curated picker name; required to retain its spelling and separators. |
| mini | tokenhub/hy4 | https://cloud.tencent.com/document/product/1823/132252 | 官方文档 · 腾讯云 · 文档 132252 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | tokenhub/hy3 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | tokenhub/kimi-k2.6 | https://huggingface.co/moonshotai/Kimi-K2.6 | 官方文档 · Hugging Face · Kimi-K2.6 | Exact curated picker name; required to retain its spelling and separators. |
| mini | tokenhub/minimax-m3 | https://huggingface.co/MiniMaxAI/MiniMax-M3 | 官方文档 · Hugging Face · MiniMax-M3 | Exact curated picker name; required to retain its spelling and separators. |
| mini | tokenhub/minimax-m2.7 | https://huggingface.co/MiniMaxAI/MiniMax-M2.7 | 官方文档 · Hugging Face · MiniMax-M2.7 | Exact curated picker name; required to retain its spelling and separators. |
| mini | tokenhub/deepseek/deepseek-flash | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | tokenhub/hunyuan-t1-vision-20250916 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | tokenhub/hy-image-v3 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | tokenhub/hy-image-v3.5-preview | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | tokenhub/hy-vision-2.0-instruct | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | tokenhub/kimi-k3.1-pro | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | tokenhub/kimi-k3.1-pro-highspeed | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | tokenhub/minimax-m3.1-flash | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | tokenhub/vidu-image-q2 | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | tokenhub/wand-vega-image-flash | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | tokenhub/wand-vega-image-lite | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | tokenhub/wand-vega-image-pro | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | tokenhub/youtu-vita | https://cloud.tencent.com/document/product/1823/130051 | 官方文档 · 腾讯云 · 文档 130051 | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | xiaomi/mimo-v2.6-flash | https://mimo.mi.com/models/en-US/mimo-v2.6-flash | 官方文档 · MiMo · MiMo-V2.6-Flash | Exact curated picker name; required to retain its spelling and separators. |
| mini | xiaomi/mimo-v2.6-pro | https://mimo.mi.com/models/en-US/mimo-v2.6-pro | 官方文档 · MiMo · MiMo-V2.6-Pro | Exact curated picker name; required to retain its spelling and separators. |
| mini | sensenova/glm-5.2 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.2 | 官方文档 · 智谱 · GLM-5.2 | Exact curated picker name; required to retain its spelling and separators. |
| mini | qianfan/deepseek-v4-pro-0813 | https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro-0813 | 官方文档 · Hugging Face · DeepSeek-V4-Pro-0813 | Exact curated picker name; required to retain its spelling and separators. |
| mini | qianfan/deepseek-v4-flash-0731 | https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731 | 官方文档 · Hugging Face · DeepSeek-V4-Flash-0731 | Exact curated picker name; required to retain its spelling and separators. |
| mini | qianfan/deepseek-v4-flash | https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash | 官方文档 · Hugging Face · DeepSeek-V4-Flash | Exact curated picker name; required to retain its spelling and separators. |
| mini | qianfan/deepseek-v3.2 | https://huggingface.co/deepseek-ai/DeepSeek-V3.2 | 官方文档 · Hugging Face · DeepSeek-V3.2 | Exact curated picker name; required to retain its spelling and separators. |
| mini | qianfan/glm-5.3 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.3 | 官方文档 · 智谱 · GLM-5.3 | Exact curated picker name; required to retain its spelling and separators. |
| mini | qianfan/glm-5.3-flash | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5.3-flash | 官方文档 · 智谱 · GLM-5.3-Flash | Exact curated picker name; required to retain its spelling and separators. |
| mini | qianfan/glm-5.2 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.2 | 官方文档 · 智谱 · GLM-5.2 | Exact curated picker name; required to retain its spelling and separators. |
| mini | qianfan/glm-5.1 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.1 | 官方文档 · 智谱 · GLM-5.1 | Exact curated picker name; required to retain its spelling and separators. |
| mini | qianfan/glm-5 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5 | 官方文档 · 智谱 · GLM-5 | Exact curated picker name; required to retain its spelling and separators. |
| mini | qianfan/kimi-k2.6 | https://huggingface.co/moonshotai/Kimi-K2.6 | 官方文档 · Hugging Face · Kimi-K2.6 | Exact curated picker name; required to retain its spelling and separators. |
| mini | qianfan/qwen3.5-397b-a17b | https://huggingface.co/Qwen/Qwen3.5-397B-A17B | 官方文档 · Hugging Face · Qwen3.5-397B-A17B | Exact curated picker name; required to retain its spelling and separators. |
| mini | qianfan/deepseek-ocr | https://huggingface.co/deepseek-ai/DeepSeek-OCR | 官方文档 · Hugging Face · DeepSeek-OCR | Exact curated picker name; required to retain its spelling and separators. |
| mini | qianfan/internvl3-38b | https://huggingface.co/OpenGVLab/InternVL3-38B | 官方文档 · Hugging Face · InternVL3-38B | Exact curated picker name; required to retain its spelling and separators. |
| mini | iflytek/spark-x2.6 | https://maas.xfyun.cn/doc/guide/3%E3%80%81API%20%E6%8E%A5%E5%8F%A3/3.1%20%E6%98%9F%E7%81%AB%E6%A8%A1%E5%9E%8B%20API/3.1.1%20Chat.html | 官方文档 · 讯飞星辰 · 3.1.1 Chat | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |
| mini | iflytek/spark-x2.6-4b | https://maas.xfyun.cn/doc/guide/3%E3%80%81API%20%E6%8E%A5%E5%8F%A3/3.1%20%E6%98%9F%E7%81%AB%E6%A8%A1%E5%9E%8B%20API/3.1.1%20Chat.html | 官方文档 · 讯飞星辰 · 3.1.1 Chat | Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject. |

Reproduce: `node scripts/report-source-titles-r23.mjs --check`; both client `model-card-source-titles-r23` tests exercise the actual render/copy-dialog paths.
