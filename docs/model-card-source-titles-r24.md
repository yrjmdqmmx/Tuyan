# R24 Phase I2 — complete source-title and dialog review

Baseline: **cd72eace3d35088a7509d9bf55bc444a50c00396**, the clean HEAD at the start of I2. The lossless gzip fixture freezes every name, ordered URL, title, dialog detail and modality tooltip. No historical reconstruction, network access or Git writes are needed to rerun this report.

## Strict acceptance rule

Require role · curated site · readable page. Reject opaque mixed letter/digit IDs, news/anchor fragments, site suffixes, lowercase or kebab/snake slugs, raw hosts/API paths, empty or leftover separators, repeated page brands, missing segments, and collapsed/split/hyphenated dotted versions. Genuine model/version/date hyphens remain valid; picker spelling is not an exemption for source slugs.

The scanner checks all source rows used by card footers and evidence dialogs, every Mini copy dialog, every modality tooltip, and seven Web lifecycle notice dialogs. Web tests additionally open all 1,064 actual DOM dialogs and check their anchors; Mini tests invoke all compiled copy callbacks and icon dialogs. No URL, role, picker name or execution field changes.

## Why the previous zero claim was wrong

R23 returned captured titles before applying a site/page format. Its heuristic did not require three segments, detect site suffixes, recognize News identifiers, or reject opaque mixed-letter/digit tokens. It explicitly listed opaque identifiers as acceptable retained spellings and exempted exact picker names even when those names were source slugs. Those exemptions hid the Qianfan IDs and raw captured titles. The previous “0 bad titles” claim is withdrawn; the corrected before counts below apply the same strict rule to the frozen I1 output.

## Counts

| Client | Cards | Source rows | Changed titles | Title findings before → after | Dialog findings before → after |
| --- | ---: | ---: | ---: | ---: | ---: |
| web | 1064 | 2494 | 365 | 523 → 0 | 1858 → 0 |
| mini | 1064 | 1103 | 239 | 341 → 0 | 0 → 0 |
| notices | 7 | 7 | 0 | 0 → 0 | 0 → 0 |

Findings count rule violations, so one row may have more than one. JSON includes affected-card counts and per-rule totals. Dialog violations count each independently rendered tooltip/detail/copy dialog. Missing-source contradictions are checked within the same input/output field section, not across unrelated fields. Duplicate lines are exact nonempty trimmed lines. Internal-copy checks reject 审计, 回退, 未核实值 and provenance/field keys including catalog/channel/vendor.

## Display choices

Captured page names are stripped of site tails at build time, with their original evidence retained. Qianfan opaque pages without a usable captured title use 模型列表. DeepSeek news IDs use 更新日志 YYYY-MM-DD unless a captured release title exists. Source-only slug cleanup preserves known version dots, genuine model/date hyphens and model names in the pickers. Human format/language qualifiers disambiguate label collisions without adding URL text.

Known field sources remain visible for unknown modalities; this does not change the unknown state or claim that the source confirms that modality. Fields with no attribution continue to say 暂无官方资料. Identical dialog lines are emitted once, and dated catalog attribution replaces its undated duplicate. Conflict copy now says 渠道资料与此前记录不一致，已保留确认过的模态；未确认的项显示为未知。 Explicit channel exclusions use 渠道资料与此前记录不一致，以渠道明确说明的模态范围为准。

## Every changed source title

| Client | Card | URL | Before | After |
| --- | --- | --- | --- | --- |
| web | deepseek/deepseek-flash | https://api-docs.deepseek.com/news/news261017/ | 官方文档 · DeepSeek · News261017 | 官方文档 · DeepSeek · 更新日志 2026-10-17 |
| web | deepseek/deepseek-v4-flash-vision-exp | https://api-docs.deepseek.com/news/news261017/ | 官方文档 · DeepSeek · News261017 | 官方文档 · DeepSeek · 更新日志 2026-10-17 |
| web | deepseek/deepseek-v4-flash | https://api-docs.deepseek.com/news/news261017/ | 官方文档 · DeepSeek · News261017 | 官方文档 · DeepSeek · 更新日志 2026-10-17 |
| web | zhipu/glm-5.3-flash | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5.3-flash | 官方文档 · 智谱 · GLM-5.3-flash | 官方文档 · 智谱 · GLM 5.3 Flash |
| web | zhipu/glm-5-turbo | https://docs.bigmodel.cn/cn/guide/models/text/glm-5-turbo | 官方文档 · 智谱 · GLM-5-turbo | 官方文档 · 智谱 · GLM 5 Turbo |
| web | zhipu/glm-4.7-flash | https://docs.bigmodel.cn/cn/guide/models/free/glm-4.7-flash | 官方文档 · 智谱 · GLM-4.7-flash | 官方文档 · 智谱 · GLM 4.7 Flash |
| web | zhipu/glm-4.6v-flash | https://docs.bigmodel.cn/cn/guide/models/free/glm-4.6v-flash | 官方文档 · 智谱 · GLM-4.6v-flash | 官方文档 · 智谱 · GLM 4.6v Flash |
| web | zhipu/glm-4.5-flash | https://docs.bigmodel.cn/cn/guide/models/free/glm-4.5-flash | 官方文档 · 智谱 · GLM-4.5-flash | 官方文档 · 智谱 · GLM 4.5 Flash |
| web | zhipu/glm-4.1v-thinking-flash | https://docs.bigmodel.cn/cn/guide/models/free/glm-4.1v-thinking-flash | 官方文档 · 智谱 · GLM-4.1v-thinking-flash | 官方文档 · 智谱 · GLM 4.1v Thinking Flash |
| web | zhipu/glm-4-long | https://docs.bigmodel.cn/cn/guide/models/text/glm-4-long | 官方文档 · 智谱 · GLM-4-long | 官方文档 · 智谱 · GLM 4 Long |
| web | zhipu/glm-4v-flash | https://docs.bigmodel.cn/cn/guide/models/free/glm-4v-flash | 官方文档 · 智谱 · GLM-4v-flash | 官方文档 · 智谱 · GLM 4v Flash |
| web | zhipu/cogview-3-flash | https://docs.bigmodel.cn/cn/guide/models/free/cogview-3-flash | 官方文档 · 智谱 · cogview-3-flash | 官方文档 · 智谱 · CogView 3 Flash |
| web | zhipu/cogview-4 | https://docs.bigmodel.cn/cn/guide/models/image-generation/cogview-4 | 官方文档 · 智谱 · cogview-4 | 官方文档 · 智谱 · CogView 4 |
| web | zhipu/cogview-4-250304 | https://docs.bigmodel.cn/cn/guide/models/image-generation/cogview-4 | 官方文档 · 智谱 · cogview-4 | 官方文档 · 智谱 · CogView 4 |
| web | siliconflow/tencent/Hy4-preview | https://huggingface.co/tencent/Hy4-preview | 官方文档 · Hugging Face · Hy4-preview | 官方文档 · Hugging Face · Hy4 Preview |
| web | siliconflow/inclusionAI/Ling-flash-2.0 | https://huggingface.co/inclusionAI/Ling-flash-2.0 | 官方文档 · Hugging Face · Ling-flash-2.0 | 官方文档 · Hugging Face · Ling Flash 2.0 |
| web | siliconflow/inclusionAI/Ling-mini-2.0 | https://huggingface.co/inclusionAI/Ling-mini-2.0 | 官方文档 · Hugging Face · Ling-mini-2.0 | 官方文档 · Hugging Face · Ling Mini 2.0 |
| web | recraft/recraftv4 | https://www.recraft.ai/docs/api-reference/models/recraft-v4 | 官方文档 · Recraft · recraftv4 | 官方文档 · Recraft · Recraft V4 |
| web | recraft/recraftv3 | https://www.recraft.ai/docs/api-reference/models/recraft-v3 | 官方文档 · Recraft · recraftv3 | 官方文档 · Recraft · Recraft V3 |
| web | recraft/recraftv2 | https://www.recraft.ai/docs/api-reference/models/recraft-v2 | 官方文档 · Recraft · recraftv2 | 官方文档 · Recraft · Recraft V2 |
| web | recraft/recraftv2_vector | https://www.recraft.ai/docs/api-reference/models/recraft-v2 | 官方文档 · Recraft · recraftv2 | 官方文档 · Recraft · Recraft V2 |
| web | xai/grok-4.20-0309-non-reasoning | https://docs.x.ai/developers/models/grok-4.20-0309-non-reasoning | 官方文档 · xAI · Grok-4.20-0309-non-reasoning | 官方文档 · xAI · Grok 4.20-0309 Non Reasoning |
| web | xai/grok-4.20-0309-reasoning | https://docs.x.ai/developers/models/grok-4.20-0309-reasoning | 官方文档 · xAI · Grok-4.20-0309-reasoning | 官方文档 · xAI · Grok 4.20-0309 Reasoning |
| web | xai/grok-4.20-multi-agent-0309 | https://docs.x.ai/developers/models/grok-4.20-multi-agent-0309 | 官方文档 · xAI · Grok 4.20 Multi-agent 0309 | 官方文档 · xAI · Grok 4.20 Multi Agent 0309 |
| web | xai/grok-imagine-image | https://docs.x.ai/developers/models/grok-imagine-image | 官方文档 · xAI · Grok-imagine-image | 官方文档 · xAI · Grok Imagine Image |
| web | xai/grok-imagine-image-quality | https://docs.x.ai/developers/models/grok-imagine-image-quality | 官方文档 · xAI · Grok-imagine-image-quality（文档） | 官方文档 · xAI · Grok Imagine Image Quality（文档） |
| web | xai/grok-imagine-image-quality | https://docs.x.ai/docs/models/grok-imagine-image-quality | 官方文档 · xAI · Grok-imagine-image-quality（文档 2） | 官方文档 · xAI · Grok Imagine Image Quality（文档 2） |
| web | xai/grok-build-0.1 | https://docs.x.ai/developers/models/grok-build-0.1 | 官方文档 · xAI · Grok-build-0.1（文档） | 官方文档 · xAI · Grok Build 0.1（文档） |
| web | xai/grok-build-0.1 | https://docs.x.ai/docs/models/grok-build-0.1 | 官方文档 · xAI · Grok-build-0.1（文档 2） | 官方文档 · xAI · Grok Build 0.1（文档 2） |
| web | gemini/gemini-3.1-flash-lite-image | https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite-image | 官方文档 · Google · Gemini 3.1 Flash Lite Image · Nano Banana 2 Lite | 官方文档 · Google · Gemini 3.1 Flash Lite Image（Nano Banana 2 Lite） |
| web | gemini/gemini-3.1-flash-image | https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-image | 官方文档 · Google · Gemini 3.1 Flash Image · Nano Banana 2 | 官方文档 · Google · Gemini 3.1 Flash Image（Nano Banana 2） |
| web | gemini/gemini-3-pro-image | https://ai.google.dev/gemini-api/docs/models/gemini-3-pro-image | 官方文档 · Google · Gemini 3 Pro Image · Nano Banana Pro | 官方文档 · Google · Gemini 3 Pro Image（Nano Banana Pro） |
| web | gemini/gemini-2.5-flash-image | https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-image | 官方文档 · Google · Gemini 2.5 Flash Image · Nano Banana | 官方文档 · Google · Gemini 2.5 Flash Image（Nano Banana） |
| web | bailian/glm-5.2-fast-preview | https://www.qianwenai.com/models/glm-5.2-fast-preview | 官方文档 · 千问 · GLM-5.2-fast-preview | 官方文档 · 千问 · GLM 5.2 Fast Preview |
| web | bailian/kimi-k2.7-code | https://help.aliyun.com/zh/model-studio/kimi-k2-7-code | 官方文档 · 百炼 · Kimi-k2.7-code | 官方文档 · 百炼 · Kimi K2.7 Code |
| web | bailian/kimi-k2.7-code | https://huggingface.co/moonshotai/Kimi-K2.7-Code | 官方文档 · Hugging Face · Kimi-k2.7-code | 官方文档 · Hugging Face · Kimi K2.7 Code |
| web | bailian/kimi/kimi-k2.7-code | https://huggingface.co/moonshotai/Kimi-K2.7-Code | 官方文档 · Hugging Face · Kimi-k2.7-code | 官方文档 · Hugging Face · Kimi K2.7 Code |
| web | bailian/qwen-image | https://help.aliyun.com/zh/model-studio/qwen-image-api | 官方文档 · 百炼 · Qwen-image API | 官方文档 · 百炼 · Qwen Image API |
| web | bailian/qwen-image | https://huggingface.co/Qwen/Qwen-Image | 官方文档 · Hugging Face · Qwen-image | 官方文档 · Hugging Face · Qwen Image |
| web | bailian/qwen3.7-max | https://help.aliyun.com/zh/model-studio/qwen3-7-max | 官方文档 · 百炼 · Qwen3.7-max | 官方文档 · 百炼 · Qwen3.7 Max |
| web | bailian/qwen3.6-plus | https://help.aliyun.com/zh/model-studio/qwen3-6-plus | 官方文档 · 百炼 · Qwen3.6-plus | 官方文档 · 百炼 · Qwen3.6 Plus |
| web | bailian/qwen3.5-omni-flash | https://help.aliyun.com/zh/model-studio/qwen3-5-omni-flash | 官方文档 · 百炼 · Qwen3.5-omni-flash | 官方文档 · 百炼 · Qwen3.5 Omni Flash |
| web | bailian/stepfun/step-3.7-flash | https://platform.stepfun.com/docs/zh/guides/models/step-3.7-flash | 官方文档 · StepFun · step-3.7-flash | 官方文档 · StepFun · Step 3.7 Flash |
| web | bailian/wan2.6-image | https://help.aliyun.com/zh/model-studio/wan2-6-image | 官方文档 · 百炼 · wan2.6-image | 官方文档 · 百炼 · Wan2.6 Image |
| web | bailian/wan2.6-t2i | https://help.aliyun.com/zh/model-studio/wan2-6-t2i | 官方文档 · 百炼 · wan2.6-t2i | 官方文档 · 百炼 · Wan2.6 T2i |
| web | bailian/wan2.2-t2i-flash | https://help.aliyun.com/zh/model-studio/wan2-2-t2i-flash | 官方文档 · 百炼 · wan2.2-t2i-flash | 官方文档 · 百炼 · Wan2.2 T2i Flash |
| web | bailian/wan2.2-t2i-plus | https://help.aliyun.com/zh/model-studio/wan2-2-t2i-plus | 官方文档 · 百炼 · wan2.2-t2i-plus | 官方文档 · 百炼 · Wan2.2 T2i Plus |
| web | bailian/MiniMax/MiniMax-M3.1-Flash | https://help.aliyun.com/zh/model-studio/minimax-api-by-minimax | 官方文档 · 百炼 · MiniMax API By MiniMax | 官方文档 · 百炼 · MiniMax API |
| web | bailian/unisound/unisound-u2 | https://help.aliyun.com/zh/model-studio/unisound-u2-by-unisound | 官方文档 · 百炼 · unisound-u2 By Unisound | 官方文档 · 百炼 · Unisound U2 |
| web | bailian/wanx-v1 | https://help.aliyun.com/zh/model-studio/wanx-v1 | 官方文档 · 百炼 · wanx-v1 | 官方文档 · 百炼 · Wanx V1 |
| web | bailian/wanx2.0-t2i-turbo | https://help.aliyun.com/zh/model-studio/wanx2-0-t2i-turbo | 官方文档 · 百炼 · wanx2.0-t2i-turbo | 官方文档 · 百炼 · Wanx2.0 T2i Turbo |
| web | bailian/wanx2.1-t2i-plus | https://help.aliyun.com/zh/model-studio/wanx2-1-t2i-plus | 官方文档 · 百炼 · wanx2.1-t2i-plus | 官方文档 · 百炼 · Wanx2.1 T2i Plus |
| web | bailian/wanx2.1-t2i-turbo | https://help.aliyun.com/zh/model-studio/wanx2-1-t2i-turbo | 官方文档 · 百炼 · wanx2.1-t2i-turbo | 官方文档 · 百炼 · Wanx2.1 T2i Turbo |
| web | bailian/xiaomi/mimo-v2.5-pro | https://mimo.mi.com/models/en-US/mimo-v2.5-pro | 官方文档 · MiMo · mimo-v2.5-pro | 官方文档 · MiMo · MiMo V2.5 Pro |
| web | openai/gpt-image-2.5-flare | https://developers.openai.com/api/docs/models/gpt-image-2.5-flare.md | 官方文档 · OpenAI · GPT Image 2.5 Flare · 2026-09-08（Markdown） | 官方文档 · OpenAI · GPT Image 2.5 Flare（2026-09-08）（Markdown） |
| web | openai/gpt-image-2.5-flare | https://developers.openai.com/api/docs/models/gpt-image-2.5-flare | 官方文档 · OpenAI · GPT Image 2.5 Flare · 2026-09-08（文档） | 官方文档 · OpenAI · GPT Image 2.5 Flare（2026-09-08）（文档） |
| web | openai/gpt-image-2.5-sunburst | https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst.md | 官方文档 · OpenAI · GPT Image 2.5 Sunburst · 2026-09-08（Markdown） | 官方文档 · OpenAI · GPT Image 2.5 Sunburst（2026-09-08）（Markdown） |
| web | openai/gpt-image-2.5-sunburst | https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst | 官方文档 · OpenAI · GPT Image 2.5 Sunburst · 2026-09-08（文档） | 官方文档 · OpenAI · GPT Image 2.5 Sunburst（2026-09-08）（文档） |
| web | openai/gpt-5.5 | https://developers.openai.com/api/docs/models/gpt-5.5.md | 官方文档 · OpenAI · GPT-5.5 · 2026-04-23（Markdown） | 官方文档 · OpenAI · GPT-5.5（2026-04-23）（Markdown） |
| web | openai/gpt-5.5 | https://developers.openai.com/api/docs/models/gpt-5.5 | 官方文档 · OpenAI · GPT-5.5 · 2026-04-23（文档） | 官方文档 · OpenAI · GPT-5.5（2026-04-23）（文档） |
| web | openai/gpt-5.5-pro | https://developers.openai.com/api/docs/models/gpt-5.5-pro.md | 官方文档 · OpenAI · GPT-5.5 Pro · 2026-04-23（Markdown） | 官方文档 · OpenAI · GPT-5.5 Pro（2026-04-23）（Markdown） |
| web | openai/gpt-5.5-pro | https://developers.openai.com/api/docs/models/gpt-5.5-pro | 官方文档 · OpenAI · GPT-5.5 Pro · 2026-04-23（文档） | 官方文档 · OpenAI · GPT-5.5 Pro（2026-04-23）（文档） |
| web | openai/gpt-5.4 | https://developers.openai.com/api/docs/models/gpt-5.4.md | 官方文档 · OpenAI · GPT-5.4 · 2026-03-05（Markdown） | 官方文档 · OpenAI · GPT-5.4（2026-03-05）（Markdown） |
| web | openai/gpt-5.4 | https://developers.openai.com/api/docs/models/gpt-5.4 | 官方文档 · OpenAI · GPT-5.4 · 2026-03-05（文档） | 官方文档 · OpenAI · GPT-5.4（2026-03-05）（文档） |
| web | openai/gpt-5.4-mini | https://developers.openai.com/api/docs/models/gpt-5.4-mini.md | 官方文档 · OpenAI · GPT-5.4 Mini · 2026-03-17（Markdown） | 官方文档 · OpenAI · GPT-5.4 Mini（2026-03-17）（Markdown） |
| web | openai/gpt-5.4-mini | https://developers.openai.com/api/docs/models/gpt-5.4-mini | 官方文档 · OpenAI · GPT-5.4 Mini · 2026-03-17（文档） | 官方文档 · OpenAI · GPT-5.4 Mini（2026-03-17）（文档） |
| web | openai/gpt-5.4-nano | https://developers.openai.com/api/docs/models/gpt-5.4-nano.md | 官方文档 · OpenAI · GPT-5.4 Nano · 2026-03-17（Markdown） | 官方文档 · OpenAI · GPT-5.4 Nano（2026-03-17）（Markdown） |
| web | openai/gpt-5.4-nano | https://developers.openai.com/api/docs/models/gpt-5.4-nano | 官方文档 · OpenAI · GPT-5.4 Nano · 2026-03-17（文档） | 官方文档 · OpenAI · GPT-5.4 Nano（2026-03-17）（文档） |
| web | openai/gpt-5.4-pro | https://developers.openai.com/api/docs/models/gpt-5.4-pro.md | 官方文档 · OpenAI · GPT-5.4 Pro · 2026-03-05（Markdown） | 官方文档 · OpenAI · GPT-5.4 Pro（2026-03-05）（Markdown） |
| web | openai/gpt-5.4-pro | https://developers.openai.com/api/docs/models/gpt-5.4-pro | 官方文档 · OpenAI · GPT-5.4 Pro · 2026-03-05（文档） | 官方文档 · OpenAI · GPT-5.4 Pro（2026-03-05）（文档） |
| web | openai/gpt-5.3-codex | https://developers.openai.com/api/docs/models/gpt-5.3-codex.md | 官方文档 · OpenAI · GPT-5.3-codex（Markdown） | 官方文档 · OpenAI · GPT 5.3 Codex（Markdown） |
| web | openai/gpt-5.3-codex | https://developers.openai.com/api/docs/models/gpt-5.3-codex | 官方文档 · OpenAI · GPT-5.3-codex（文档） | 官方文档 · OpenAI · GPT 5.3 Codex（文档） |
| web | openai/gpt-5.2 | https://developers.openai.com/api/docs/models/gpt-5.2.md | 官方文档 · OpenAI · GPT-5.2 · 2025-12-11（Markdown） | 官方文档 · OpenAI · GPT-5.2（2025-12-11）（Markdown） |
| web | openai/gpt-5.2 | https://developers.openai.com/api/docs/models/gpt-5.2 | 官方文档 · OpenAI · GPT-5.2 · 2025-12-11（文档） | 官方文档 · OpenAI · GPT-5.2（2025-12-11）（文档） |
| web | openai/gpt-5.2-pro | https://developers.openai.com/api/docs/models/gpt-5.2-pro.md | 官方文档 · OpenAI · GPT-5.2-pro · 2025-12-11（Markdown） | 官方文档 · OpenAI · GPT 5.2 Pro（2025-12-11）（Markdown） |
| web | openai/gpt-5.2-pro | https://developers.openai.com/api/docs/models/gpt-5.2-pro | 官方文档 · OpenAI · GPT-5.2-pro · 2025-12-11（文档） | 官方文档 · OpenAI · GPT 5.2 Pro（2025-12-11）（文档） |
| web | openai/gpt-5.1 | https://developers.openai.com/api/docs/models/gpt-5.1.md | 官方文档 · OpenAI · GPT-5.1 · 2025-11-13（Markdown） | 官方文档 · OpenAI · GPT-5.1（2025-11-13）（Markdown） |
| web | openai/gpt-5.1 | https://developers.openai.com/api/docs/models/gpt-5.1 | 官方文档 · OpenAI · GPT-5.1 · 2025-11-13（文档） | 官方文档 · OpenAI · GPT-5.1（2025-11-13）（文档） |
| web | openai/gpt-5 | https://developers.openai.com/api/docs/models/gpt-5.md | 官方文档 · OpenAI · GPT-5 · 2025-08-07（Markdown） | 官方文档 · OpenAI · GPT-5（2025-08-07）（Markdown） |
| web | openai/gpt-5 | https://developers.openai.com/api/docs/models/gpt-5 | 官方文档 · OpenAI · GPT-5 · 2025-08-07（文档） | 官方文档 · OpenAI · GPT-5（2025-08-07）（文档） |
| web | openai/gpt-5-mini | https://developers.openai.com/api/docs/models/gpt-5-mini.md | 官方文档 · OpenAI · GPT-5-mini · 2025-08-07（Markdown） | 官方文档 · OpenAI · GPT 5 Mini（2025-08-07）（Markdown） |
| web | openai/gpt-5-mini | https://developers.openai.com/api/docs/models/gpt-5-mini | 官方文档 · OpenAI · GPT-5-mini · 2025-08-07（文档） | 官方文档 · OpenAI · GPT 5 Mini（2025-08-07）（文档） |
| web | openai/gpt-5-nano | https://developers.openai.com/api/docs/models/gpt-5-nano.md | 官方文档 · OpenAI · GPT-5-nano · 2025-08-07（Markdown） | 官方文档 · OpenAI · GPT 5 Nano（2025-08-07）（Markdown） |
| web | openai/gpt-5-nano | https://developers.openai.com/api/docs/models/gpt-5-nano | 官方文档 · OpenAI · GPT-5-nano · 2025-08-07（文档） | 官方文档 · OpenAI · GPT 5 Nano（2025-08-07）（文档） |
| web | openai/gpt-5-pro | https://developers.openai.com/api/docs/models/gpt-5-pro.md | 官方文档 · OpenAI · GPT-5-pro · 2025-10-06（Markdown） | 官方文档 · OpenAI · GPT 5 Pro（2025-10-06）（Markdown） |
| web | openai/gpt-5-pro | https://developers.openai.com/api/docs/models/gpt-5-pro | 官方文档 · OpenAI · GPT-5-pro · 2025-10-06（文档） | 官方文档 · OpenAI · GPT 5 Pro（2025-10-06）（文档） |
| web | openai/gpt-4.1 | https://developers.openai.com/api/docs/models/gpt-4.1.md | 官方文档 · OpenAI · GPT-4.1 · 2025-04-14（Markdown） | 官方文档 · OpenAI · GPT-4.1（2025-04-14）（Markdown） |
| web | openai/gpt-4.1 | https://developers.openai.com/api/docs/models/gpt-4.1 | 官方文档 · OpenAI · GPT-4.1 · 2025-04-14（文档） | 官方文档 · OpenAI · GPT-4.1（2025-04-14）（文档） |
| web | openai/gpt-4.1-mini | https://developers.openai.com/api/docs/models/gpt-4.1-mini.md | 官方文档 · OpenAI · GPT-4.1 Mini · 2025-04-14（Markdown） | 官方文档 · OpenAI · GPT-4.1 Mini（2025-04-14）（Markdown） |
| web | openai/gpt-4.1-mini | https://developers.openai.com/api/docs/models/gpt-4.1-mini | 官方文档 · OpenAI · GPT-4.1 Mini · 2025-04-14（文档） | 官方文档 · OpenAI · GPT-4.1 Mini（2025-04-14）（文档） |
| web | openai/gpt-4.1-nano | https://developers.openai.com/api/docs/models/gpt-4.1-nano.md | 官方文档 · OpenAI · GPT-4.1-nano · 2025-04-14（Markdown） | 官方文档 · OpenAI · GPT 4.1 Nano（2025-04-14）（Markdown） |
| web | openai/gpt-4.1-nano | https://developers.openai.com/api/docs/models/gpt-4.1-nano | 官方文档 · OpenAI · GPT-4.1-nano · 2025-04-14（文档） | 官方文档 · OpenAI · GPT 4.1 Nano（2025-04-14）（文档） |
| web | openai/gpt-4o | https://developers.openai.com/api/docs/models/gpt-4o.md | 官方文档 · OpenAI · GPT-4o · 2024-08-06（Markdown） | 官方文档 · OpenAI · GPT-4o（2024-08-06）（Markdown） |
| web | openai/gpt-4o | https://developers.openai.com/api/docs/models/gpt-4o | 官方文档 · OpenAI · GPT-4o · 2024-08-06（文档） | 官方文档 · OpenAI · GPT-4o（2024-08-06）（文档） |
| web | openai/gpt-4o-mini | https://developers.openai.com/api/docs/models/gpt-4o-mini.md | 官方文档 · OpenAI · GPT-4o-mini · 2024-07-18（Markdown） | 官方文档 · OpenAI · GPT 4o Mini（2024-07-18）（Markdown） |
| web | openai/gpt-4o-mini | https://developers.openai.com/api/docs/models/gpt-4o-mini | 官方文档 · OpenAI · GPT-4o-mini · 2024-07-18（文档） | 官方文档 · OpenAI · GPT 4o Mini（2024-07-18）（文档） |
| web | openai/gpt-4-turbo | https://developers.openai.com/api/docs/models/gpt-4-turbo.md | 官方文档 · OpenAI · GPT-4-turbo · 2024-04-09（Markdown） | 官方文档 · OpenAI · GPT 4 Turbo（2024-04-09）（Markdown） |
| web | openai/gpt-4-turbo | https://developers.openai.com/api/docs/models/gpt-4-turbo | 官方文档 · OpenAI · GPT-4-turbo · 2024-04-09（文档） | 官方文档 · OpenAI · GPT 4 Turbo（2024-04-09）（文档） |
| web | openai/gpt-4 | https://developers.openai.com/api/docs/models/gpt-4.md | 官方文档 · OpenAI · GPT-4 · 0613（Markdown） | 官方文档 · OpenAI · GPT-4（0613）（Markdown） |
| web | openai/gpt-4 | https://developers.openai.com/api/docs/models/gpt-4 | 官方文档 · OpenAI · GPT-4 · 0613（文档） | 官方文档 · OpenAI · GPT-4（0613）（文档） |
| web | openai/gpt-image-2 | https://developers.openai.com/api/docs/models/gpt-image-2.md | 官方文档 · OpenAI · GPT Image 2 · 2026-04-21（Markdown） | 官方文档 · OpenAI · GPT Image 2（2026-04-21）（Markdown） |
| web | openai/gpt-image-2 | https://developers.openai.com/api/docs/models/gpt-image-2 | 官方文档 · OpenAI · GPT Image 2 · 2026-04-21（文档） | 官方文档 · OpenAI · GPT Image 2（2026-04-21）（文档） |
| web | openai/gpt-image-1.5 | https://developers.openai.com/api/docs/models/gpt-image-1.5.md | 官方文档 · OpenAI · GPT-image-1.5 · 2025-12-16（Markdown） | 官方文档 · OpenAI · GPT Image 1.5（2025-12-16）（Markdown） |
| web | openai/gpt-image-1.5 | https://developers.openai.com/api/docs/models/gpt-image-1.5 | 官方文档 · OpenAI · GPT-image-1.5 · 2025-12-16（文档） | 官方文档 · OpenAI · GPT Image 1.5（2025-12-16）（文档） |
| web | openai/chat-latest | https://developers.openai.com/api/docs/models/chat-latest.md | 官方文档 · OpenAI · chat-latest（Markdown） | 官方文档 · OpenAI · Chat Latest（Markdown） |
| web | openai/chat-latest | https://developers.openai.com/api/docs/models/chat-latest | 官方文档 · OpenAI · chat-latest（文档） | 官方文档 · OpenAI · Chat Latest（文档） |
| web | openai/chatgpt-image-latest | https://developers.openai.com/api/docs/models/chatgpt-image-latest.md | 官方文档 · OpenAI · chatgpt-image-latest（Markdown） | 官方文档 · OpenAI · ChatGPT Image Latest（Markdown） |
| web | openai/chatgpt-image-latest | https://developers.openai.com/api/docs/models/chatgpt-image-latest | 官方文档 · OpenAI · chatgpt-image-latest（文档） | 官方文档 · OpenAI · ChatGPT Image Latest（文档） |
| web | openai/gpt-3.5-turbo | https://developers.openai.com/api/docs/models/gpt-3.5-turbo.md | 官方文档 · OpenAI · GPT-3.5-turbo · 0125（Markdown） | 官方文档 · OpenAI · GPT 3.5 Turbo（0125）（Markdown） |
| web | openai/gpt-3.5-turbo | https://developers.openai.com/api/docs/models/gpt-3.5-turbo | 官方文档 · OpenAI · GPT-3.5-turbo · 0125（文档） | 官方文档 · OpenAI · GPT 3.5 Turbo（0125）（文档） |
| web | openai/o1 | https://developers.openai.com/api/docs/models/o1.md | 官方文档 · OpenAI · o1 · 2024-12-17（Markdown） | 官方文档 · OpenAI · O1（2024-12-17）（Markdown） |
| web | openai/o1 | https://developers.openai.com/api/docs/models/o1 | 官方文档 · OpenAI · o1 · 2024-12-17（文档） | 官方文档 · OpenAI · O1（2024-12-17）（文档） |
| web | openai/o1-2024-12-17 | https://developers.openai.com/api/docs/models/o1 | 官方文档 · OpenAI · o1 | 官方文档 · OpenAI · O1 |
| web | openai/o1-pro | https://developers.openai.com/api/docs/models/o1-pro.md | 官方文档 · OpenAI · o1-pro · 2025-03-19（Markdown） | 官方文档 · OpenAI · O1 Pro（2025-03-19）（Markdown） |
| web | openai/o1-pro | https://developers.openai.com/api/docs/models/o1-pro | 官方文档 · OpenAI · o1-pro · 2025-03-19（文档） | 官方文档 · OpenAI · O1 Pro（2025-03-19）（文档） |
| web | openai/o3 | https://developers.openai.com/api/docs/models/o3.md | 官方文档 · OpenAI · o3 · 2025-04-16（Markdown） | 官方文档 · OpenAI · O3（2025-04-16）（Markdown） |
| web | openai/o3 | https://developers.openai.com/api/docs/models/o3 | 官方文档 · OpenAI · o3 · 2025-04-16（文档） | 官方文档 · OpenAI · O3（2025-04-16）（文档） |
| web | openai/o3-2025-04-16 | https://developers.openai.com/api/docs/models/o3 | 官方文档 · OpenAI · o3 | 官方文档 · OpenAI · O3 |
| web | openai/o3-mini | https://developers.openai.com/api/docs/models/o3-mini.md | 官方文档 · OpenAI · o3-mini · 2025-01-31（Markdown） | 官方文档 · OpenAI · O3 Mini（2025-01-31）（Markdown） |
| web | openai/o3-mini | https://developers.openai.com/api/docs/models/o3-mini | 官方文档 · OpenAI · o3-mini · 2025-01-31（文档） | 官方文档 · OpenAI · O3 Mini（2025-01-31）（文档） |
| web | openai/o3-pro | https://developers.openai.com/api/docs/models/o3-pro.md | 官方文档 · OpenAI · o3-pro · 2025-06-10（Markdown） | 官方文档 · OpenAI · O3 Pro（2025-06-10）（Markdown） |
| web | openai/o3-pro | https://developers.openai.com/api/docs/models/o3-pro | 官方文档 · OpenAI · o3-pro · 2025-06-10（文档） | 官方文档 · OpenAI · O3 Pro（2025-06-10）（文档） |
| web | openai/o4-mini | https://developers.openai.com/api/docs/models/o4-mini.md | 官方文档 · OpenAI · o4-mini · 2025-04-16（Markdown） | 官方文档 · OpenAI · O4 Mini（2025-04-16）（Markdown） |
| web | openai/o4-mini | https://developers.openai.com/api/docs/models/o4-mini | 官方文档 · OpenAI · o4-mini · 2025-04-16（文档） | 官方文档 · OpenAI · O4 Mini（2025-04-16）（文档） |
| web | bfl/flux-2-flex | https://docs.bfl.ml/api-reference/models/generate-or-edit-an-image-with-flux2-[flex] | 官方文档 · BFL · FLUX-2-flex | 官方文档 · BFL · FLUX 2 Flex |
| web | bfl/flux-2-klein-4b | https://docs.bfl.ml/api-reference/models/generate-or-edit-an-image-with-flux2-[klein]-4b | 官方文档 · BFL · FLUX-2-klein-4b | 官方文档 · BFL · FLUX 2 Klein 4b |
| web | bfl/flux-2-klein-9b | https://docs.bfl.ml/api-reference/models/generate-or-edit-an-image-with-flux2-[klein]-9b | 官方文档 · BFL · FLUX-2-klein-9b | 官方文档 · BFL · FLUX 2 Klein 9b |
| web | bfl/flux-2-klein-9b-preview | https://docs.bfl.ml/api-reference/models/generate-or-edit-an-image-with-flux2-[klein]-9b-preview | 官方文档 · BFL · FLUX-2-klein-9b-preview | 官方文档 · BFL · FLUX 2 Klein 9b Preview |
| web | bfl/flux-2-max | https://docs.bfl.ml/api-reference/models/generate-or-edit-an-image-with-flux2-[max] | 官方文档 · BFL · FLUX-2-max | 官方文档 · BFL · FLUX 2 Max |
| web | bfl/flux-2-pro | https://docs.bfl.ml/api-reference/models/generate-or-edit-an-image-with-flux2-[pro] | 官方文档 · BFL · FLUX-2-pro | 官方文档 · BFL · FLUX 2 Pro |
| web | bfl/flux-2-pro-preview | https://docs.bfl.ml/api-reference/models/generate-or-edit-an-image-with-flux2-[pro]-preview | 官方文档 · BFL · FLUX-2-pro-preview | 官方文档 · BFL · FLUX 2 Pro Preview |
| web | ideogram/p-image-ideogram | https://developer.ideogram.ai/v2/api-reference/images/generate/p-image-ideogram | 官方文档 · Ideogram · p-image-ideogram（文档） | 官方文档 · Ideogram · P Image Ideogram（文档） |
| web | ideogram/p-image-ideogram | https://developer.ideogram.ai/api-reference/generate-images/generate-p-image-ideogram | 官方文档 · Ideogram · p-image-ideogram（文档 2） | 官方文档 · Ideogram · P Image Ideogram（文档 2） |
| web | mistral/zai-glm-5-3 | https://docs.mistral.ai/models/zai-glm-5-3 | 官方文档 · Mistral · zai-glm-5-3 | 官方文档 · Mistral · Zai GLM 5-3 |
| web | mistral/zai-glm-5-2 | https://docs.mistral.ai/models/zai-glm-5-2 | 官方文档 · Mistral · zai-glm-5-2 | 官方文档 · Mistral · Zai GLM 5-2 |
| web | mistral/codestral-2508 | https://docs.mistral.ai/models/codestral-25-08 | 官方文档 · Mistral · codestral-2508 | 官方文档 · Mistral · Codestral 2508 |
| web | mistral/codestral-latest | https://docs.mistral.ai/models/codestral-25-08 | 官方文档 · Mistral · Codestral · 2508 | 官方文档 · Mistral · Codestral（2508） |
| web | fireworks/accounts/fireworks/models/step-3p7-flash-nvfp4 | https://fireworks.ai/models/fireworks/step-3p7-flash-nvfp4 | 官方文档 · Fireworks · Step 3.7 Flash · NVFP4（文档） | 官方文档 · Fireworks · Step 3.7 Flash（NVFP4）（文档） |
| web | fireworks/accounts/fireworks/models/step-3p7-flash-nvfp4 | https://app.fireworks.ai/models/fireworks/step-3p7-flash-nvfp4 | 官方文档 · Fireworks · Step 3.7 Flash · NVFP4（控制台） | 官方文档 · Fireworks · Step 3.7 Flash（NVFP4）（控制台） |
| web | fal/alibaba/qwen-image-3/text-to-image | https://fal.ai/models/alibaba/qwen-image-3/text-to-image/api | 官方文档 · fal · Qwen-image-3 API 文档 | 官方文档 · fal · Qwen Image 3 API 文档 |
| web | fal/bytedance/seedream/v5/pro/text-to-image | https://fal.ai/models/bytedance/seedream/v5/pro/text-to-image/api | 官方文档 · fal · Seedream · v5 · pro API 文档 | 官方文档 · fal · Seedream（v5，pro） API 文档 |
| web | fal/fal-ai/bytedance/seedream/v5/lite/edit | https://fal.ai/models/fal-ai/bytedance/seedream/v5/lite/edit/api | 官方文档 · fal · Seedream · v5 · lite · edit API 文档 | 官方文档 · fal · Seedream（v5，lite，edit） API 文档 |
| web | fal/fal-ai/bytedance/seedream/v4.5/text-to-image | https://fal.ai/models/fal-ai/bytedance/seedream/v4.5/text-to-image/api | 官方文档 · fal · Seedream · v4.5 API 文档 | 官方文档 · fal · Seedream（v4.5） API 文档 |
| web | fal/fal-ai/bytedance/seedream/v4/text-to-image | https://fal.ai/models/fal-ai/bytedance/seedream/v4/text-to-image/api | 官方文档 · fal · Seedream · v4 API 文档 | 官方文档 · fal · Seedream（v4） API 文档 |
| web | fal/fal-ai/fast-sdxl | https://fal.ai/models/fal-ai/fast-sdxl/api | 官方文档 · fal · fast-sdxl API 文档 | 官方文档 · fal · Fast SDXL API 文档 |
| web | fal/fal-ai/flux-2-flex | https://fal.ai/models/fal-ai/flux-2-flex/api | 官方文档 · fal · FLUX-2-flex API 文档 | 官方文档 · fal · FLUX 2 Flex API 文档 |
| web | fal/fal-ai/flux-2-pro | https://fal.ai/models/fal-ai/flux-2-pro/api | 官方文档 · fal · FLUX-2-pro API 文档 | 官方文档 · fal · FLUX 2 Pro API 文档 |
| web | fal/fal-ai/flux-2/flash | https://fal.ai/models/fal-ai/flux-2/flash/api | 官方文档 · fal · FLUX-2 · flash API 文档 | 官方文档 · fal · FLUX-2（flash） API 文档 |
| web | fal/fal-ai/flux-2/klein/9b | https://fal.ai/models/fal-ai/flux-2/klein/9b/api | 官方文档 · fal · FLUX-2 · klein · 9b API 文档 | 官方文档 · fal · FLUX-2（klein，9b） API 文档 |
| web | fal/fal-ai/flux-2/turbo | https://fal.ai/models/fal-ai/flux-2/turbo/api | 官方文档 · fal · FLUX-2 · turbo API 文档 | 官方文档 · fal · FLUX-2（turbo） API 文档 |
| web | fal/fal-ai/flux-kontext-lora | https://fal.ai/models/fal-ai/flux-kontext-lora/api | 官方文档 · fal · FLUX-kontext-lora API 文档 | 官方文档 · fal · FLUX Kontext LoRA API 文档 |
| web | fal/fal-ai/flux-pro/kontext | https://fal.ai/models/fal-ai/flux-pro/kontext/api | 官方文档 · fal · FLUX-pro · kontext API 文档 | 官方文档 · fal · FLUX Pro（Kontext） API 文档 |
| web | fal/fal-ai/flux-pro/v1.1 | https://fal.ai/models/fal-ai/flux-pro/v1.1/api | 官方文档 · fal · FLUX-pro · v1.1 API 文档 | 官方文档 · fal · FLUX Pro（V1.1） API 文档 |
| web | fal/fal-ai/flux-pro/v1.1-ultra | https://fal.ai/models/fal-ai/flux-pro/v1.1-ultra/api | 官方文档 · fal · FLUX-pro · v1.1-ultra API 文档 | 官方文档 · fal · FLUX Pro（V1.1 Ultra） API 文档 |
| web | fal/fal-ai/flux-1/schnell | https://fal.ai/models/fal-ai/flux-1/schnell/api | 官方文档 · fal · FLUX-1 · schnell API 文档 | 官方文档 · fal · FLUX-1（schnell） API 文档 |
| web | fal/fal-ai/flux-lora | https://fal.ai/models/fal-ai/flux-lora/api | 官方文档 · fal · FLUX-lora API 文档 | 官方文档 · fal · FLUX LoRA API 文档 |
| web | fal/fal-ai/flux/dev | https://fal.ai/models/fal-ai/flux/dev/api | 官方文档 · fal · FLUX · dev API 文档 | 官方文档 · fal · FLUX（dev） API 文档 |
| web | fal/fal-ai/flux/schnell | https://fal.ai/models/fal-ai/flux/schnell/api | 官方文档 · fal · FLUX · schnell API 文档 | 官方文档 · fal · FLUX（schnell） API 文档 |
| web | fal/fal-ai/nano-banana-2 | https://fal.ai/models/fal-ai/nano-banana-2/api | 官方文档 · fal · nano-banana-2 API 文档 | 官方文档 · fal · Nano Banana 2 API 文档 |
| web | fal/fal-ai/qwen-image | https://fal.ai/models/fal-ai/qwen-image/api | 官方文档 · fal · Qwen-image API 文档 | 官方文档 · fal · Qwen Image API 文档 |
| web | fal/google/nano-banana-2-lite | https://fal.ai/models/google/nano-banana-2-lite/api | 官方文档 · fal · nano-banana-2-lite API 文档 | 官方文档 · fal · Nano Banana 2 Lite API 文档 |
| web | fal/fal-ai/nano-banana-pro | https://fal.ai/models/fal-ai/nano-banana-pro/api | 官方文档 · fal · nano-banana-pro API 文档 | 官方文档 · fal · Nano Banana Pro API 文档 |
| web | fal/fal-ai/nano-banana | https://fal.ai/models/fal-ai/nano-banana/api | 官方文档 · fal · nano-banana API 文档 | 官方文档 · fal · Nano Banana API 文档 |
| web | fal/openai/gpt-image-2 | https://fal.ai/models/openai/gpt-image-2/api | 官方文档 · fal · GPT-image-2 API 文档 | 官方文档 · fal · GPT Image 2 API 文档 |
| web | fal/openai/gpt-image-2 | https://developers.openai.com/api/docs/models/gpt-image-2 | 官方文档 · OpenAI · GPT-image-2 | 官方文档 · OpenAI · GPT Image 2 |
| web | fal/fal-ai/gpt-image-1.5 | https://fal.ai/models/fal-ai/gpt-image-1.5/api | 官方文档 · fal · GPT-image-1.5 API 文档 | 官方文档 · fal · GPT Image 1.5 API 文档 |
| web | fal/xai/grok-imagine-image/v2.0/text-to-image | https://fal.ai/models/xai/grok-imagine-image/v2.0/text-to-image/api | 官方文档 · fal · Grok-imagine-image · v2.0 API 文档 | 官方文档 · fal · Grok Imagine Image（V2.0） API 文档 |
| web | fal/xai/grok-imagine-image | https://fal.ai/models/xai/grok-imagine-image/api | 官方文档 · fal · Grok-imagine-image API 文档 | 官方文档 · fal · Grok Imagine Image API 文档 |
| web | fal/xai/grok-imagine-image/quality/text-to-image | https://fal.ai/models/xai/grok-imagine-image/quality/text-to-image/api | 官方文档 · fal · Grok-imagine-image · quality API 文档 | 官方文档 · fal · Grok Imagine Image（Quality） API 文档 |
| web | fal/bria/fibo-edit-1.5/edit | https://fal.ai/models/bria/fibo-edit-1.5/edit/api | 官方文档 · fal · fibo-edit-1.5 · edit API 文档 | 官方文档 · fal · Fibo Edit 1.5（Edit） API 文档 |
| web | fal/bria/fibo-gen-1.5/text-to-image | https://fal.ai/models/bria/fibo-gen-1.5/text-to-image/api | 官方文档 · fal · fibo-gen-1.5 API 文档 | 官方文档 · fal · Fibo Gen 1.5 API 文档 |
| web | fal/fal-ai/krea-2/turbo | https://fal.ai/models/fal-ai/krea-2/turbo/api | 官方文档 · fal · krea-2 · turbo API 文档 | 官方文档 · fal · Krea 2（Turbo） API 文档 |
| web | fal/fal-ai/z-image/turbo | https://fal.ai/models/fal-ai/z-image/turbo/api | 官方文档 · fal · z-image · turbo API 文档 | 官方文档 · fal · Z Image（Turbo） API 文档 |
| web | fal/imagineart/imagineart-2.0-preview/text-to-image | https://fal.ai/models/imagineart/imagineart-2.0-preview/text-to-image/api | 官方文档 · fal · imagineart-2.0-preview API 文档 | 官方文档 · fal · Imagineart 2.0 Preview API 文档 |
| web | fal/meta/muse-image/text-to-image | https://fal.ai/models/meta/muse-image/text-to-image/api | 官方文档 · fal · muse-image API 文档 | 官方文档 · fal · Muse Image API 文档 |
| web | replicate/google/gemini-3.5-flash | https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash | 官方文档 · Google · gemini-3.5-flash | 官方文档 · Google · Gemini 3.5 Flash |
| web | replicate/google/gemini-3.5-flash | https://replicate.com/google/gemini-3.5-flash | 官方文档 · Replicate · gemini-3.5-flash | 官方文档 · Replicate · Gemini 3.5 Flash |
| web | replicate/deepseek-ai/deepseek-v3.1 | https://huggingface.co/deepseek-ai/DeepSeek-V3.1 | 官方文档 · Hugging Face · deepseek-v3.1 | 官方文档 · Hugging Face · DeepSeek V3.1 |
| web | replicate/deepseek-ai/deepseek-v3.1 | https://replicate.com/deepseek-ai/deepseek-v3.1 | 官方文档 · Replicate · deepseek-v3.1 | 官方文档 · Replicate · DeepSeek V3.1 |
| web | replicate/alibaba/qwen-image-3 | https://replicate.com/alibaba/qwen-image-3 | 官方文档 · Replicate · Qwen-image-3 | 官方文档 · Replicate · Qwen Image 3 |
| web | replicate/alibaba/qwen-image-3-pro | https://replicate.com/alibaba/qwen-image-3-pro | 官方文档 · Replicate · Qwen-image-3-pro | 官方文档 · Replicate · Qwen Image 3 Pro |
| web | replicate/alibaba/wan-3 | https://replicate.com/alibaba/wan-3 | 官方文档 · Replicate · wan-3 | 官方文档 · Replicate · Wan 3 |
| web | replicate/black-forest-labs/flux-2-flex | https://replicate.com/black-forest-labs/flux-2-flex | 官方文档 · Replicate · FLUX-2-flex | 官方文档 · Replicate · FLUX 2 Flex |
| web | replicate/black-forest-labs/flux-2-klein-4b | https://replicate.com/black-forest-labs/flux-2-klein-4b | 官方文档 · Replicate · FLUX-2-klein-4b | 官方文档 · Replicate · FLUX 2 Klein 4b |
| web | replicate/black-forest-labs/flux-2-max | https://replicate.com/black-forest-labs/flux-2-max | 官方文档 · Replicate · FLUX-2-max | 官方文档 · Replicate · FLUX 2 Max |
| web | replicate/black-forest-labs/flux-2-pro | https://replicate.com/black-forest-labs/flux-2-pro | 官方文档 · Replicate · FLUX-2-pro | 官方文档 · Replicate · FLUX 2 Pro |
| web | replicate/black-forest-labs/flux-kontext-dev | https://replicate.com/black-forest-labs/flux-kontext-dev | 官方文档 · Replicate · FLUX-kontext-dev | 官方文档 · Replicate · FLUX Kontext Dev |
| web | replicate/black-forest-labs/flux-kontext-max | https://replicate.com/black-forest-labs/flux-kontext-max | 官方文档 · Replicate · FLUX-kontext-max | 官方文档 · Replicate · FLUX Kontext Max |
| web | replicate/black-forest-labs/flux-kontext-pro | https://replicate.com/black-forest-labs/flux-kontext-pro | 官方文档 · Replicate · FLUX-kontext-pro | 官方文档 · Replicate · FLUX Kontext Pro |
| web | replicate/bytedance/seedream-5-lite | https://replicate.com/bytedance/seedream-5-lite | 官方文档 · Replicate · Seedream-5-lite | 官方文档 · Replicate · Seedream 5 Lite |
| web | replicate/google/gemini-3-flash | https://replicate.com/google/gemini-3-flash | 官方文档 · Replicate · gemini-3-flash | 官方文档 · Replicate · Gemini 3 Flash |
| web | replicate/google/gemini-2.5-flash | https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash | 官方文档 · Google · gemini-2.5-flash | 官方文档 · Google · Gemini 2.5 Flash |
| web | replicate/google/gemini-2.5-flash | https://replicate.com/google/gemini-2.5-flash | 官方文档 · Replicate · gemini-2.5-flash | 官方文档 · Replicate · Gemini 2.5 Flash |
| web | replicate/google/nano-banana-2 | https://replicate.com/google/nano-banana-2 | 官方文档 · Replicate · nano-banana-2 | 官方文档 · Replicate · Nano Banana 2 |
| web | replicate/google/nano-banana-pro | https://replicate.com/google/nano-banana-pro | 官方文档 · Replicate · nano-banana-pro | 官方文档 · Replicate · Nano Banana Pro |
| web | replicate/google/nano-banana | https://replicate.com/google/nano-banana | 官方文档 · Replicate · nano-banana | 官方文档 · Replicate · Nano Banana |
| web | replicate/ideogram-ai/ideogram-v3-balanced | https://replicate.com/ideogram-ai/ideogram-v3-balanced | 官方文档 · Replicate · ideogram-v3-balanced | 官方文档 · Replicate · Ideogram V3 Balanced |
| web | replicate/ideogram-ai/ideogram-v3-quality | https://replicate.com/ideogram-ai/ideogram-v3-quality | 官方文档 · Replicate · ideogram-v3-quality | 官方文档 · Replicate · Ideogram V3 Quality |
| web | replicate/ideogram-ai/ideogram-v3-turbo | https://replicate.com/ideogram-ai/ideogram-v3-turbo | 官方文档 · Replicate · ideogram-v3-turbo | 官方文档 · Replicate · Ideogram V3 Turbo |
| web | replicate/ideogram-ai/ideogram-v2a | https://replicate.com/ideogram-ai/ideogram-v2a | 官方文档 · Replicate · ideogram-v2a | 官方文档 · Replicate · Ideogram V2a |
| web | replicate/ideogram-ai/ideogram-v2a-turbo | https://replicate.com/ideogram-ai/ideogram-v2a-turbo | 官方文档 · Replicate · ideogram-v2a-turbo | 官方文档 · Replicate · Ideogram V2a Turbo |
| web | replicate/ideogram-ai/ideogram-v2 | https://replicate.com/ideogram-ai/ideogram-v2 | 官方文档 · Replicate · ideogram-v2 | 官方文档 · Replicate · Ideogram V2 |
| web | replicate/ideogram-ai/ideogram-v2-turbo | https://replicate.com/ideogram-ai/ideogram-v2-turbo | 官方文档 · Replicate · ideogram-v2-turbo | 官方文档 · Replicate · Ideogram V2 Turbo |
| web | replicate/moonshotai/kimi-k2-thinking | https://huggingface.co/moonshotai/Kimi-K2-Thinking | 官方文档 · Hugging Face · kimi-k2-thinking | 官方文档 · Hugging Face · Kimi K2 Thinking |
| web | replicate/moonshotai/kimi-k2-thinking | https://replicate.com/moonshotai/kimi-k2-thinking | 官方文档 · Replicate · kimi-k2-thinking | 官方文档 · Replicate · Kimi K2 Thinking |
| web | replicate/openai/gpt-image-2 | https://developers.openai.com/api/docs/models/gpt-image-2 | 官方文档 · OpenAI · GPT-image-2 | 官方文档 · OpenAI · GPT Image 2 |
| web | replicate/openai/gpt-image-2 | https://replicate.com/openai/gpt-image-2 | 官方文档 · Replicate · GPT-image-2 | 官方文档 · Replicate · GPT Image 2 |
| web | replicate/openai/gpt-image-1.5 | https://developers.openai.com/api/docs/models/gpt-image-1.5 | 官方文档 · OpenAI · GPT-image-1.5 | 官方文档 · OpenAI · GPT Image 1.5 |
| web | replicate/openai/gpt-image-1.5 | https://replicate.com/openai/gpt-image-1.5 | 官方文档 · Replicate · GPT-image-1.5 | 官方文档 · Replicate · GPT Image 1.5 |
| web | replicate/prunaai/flux-kontext-fast | https://replicate.com/prunaai/flux-kontext-fast | 官方文档 · Replicate · FLUX-kontext-fast | 官方文档 · Replicate · FLUX Kontext Fast |
| web | replicate/black-forest-labs/flux-1.1-pro | https://replicate.com/black-forest-labs/flux-1.1-pro | 官方文档 · Replicate · FLUX-1.1-pro | 官方文档 · Replicate · FLUX 1.1 Pro |
| web | replicate/black-forest-labs/flux-1.1-pro-ultra | https://replicate.com/black-forest-labs/flux-1.1-pro-ultra | 官方文档 · Replicate · FLUX-1.1-pro-ultra | 官方文档 · Replicate · FLUX 1.1 Pro Ultra |
| web | replicate/black-forest-labs/flux-dev | https://replicate.com/black-forest-labs/flux-dev | 官方文档 · Replicate · FLUX-dev | 官方文档 · Replicate · FLUX Dev |
| web | replicate/black-forest-labs/flux-dev-lora | https://replicate.com/black-forest-labs/flux-dev-lora | 官方文档 · Replicate · FLUX-dev-lora | 官方文档 · Replicate · FLUX Dev LoRA |
| web | replicate/black-forest-labs/flux-pro | https://replicate.com/black-forest-labs/flux-pro | 官方文档 · Replicate · FLUX-pro | 官方文档 · Replicate · FLUX Pro |
| web | replicate/black-forest-labs/flux-schnell | https://replicate.com/black-forest-labs/flux-schnell | 官方文档 · Replicate · FLUX-schnell | 官方文档 · Replicate · FLUX Schnell |
| web | replicate/prunaai/flux-fast | https://replicate.com/prunaai/flux-fast | 官方文档 · Replicate · FLUX-fast | 官方文档 · Replicate · FLUX Fast |
| web | replicate/qwen/qwen-image | https://replicate.com/qwen/qwen-image | 官方文档 · Replicate · Qwen-image | 官方文档 · Replicate · Qwen Image |
| web | replicate/qwen/qwen-image-edit | https://replicate.com/qwen/qwen-image-edit | 官方文档 · Replicate · Qwen-image-edit | 官方文档 · Replicate · Qwen Image Edit |
| web | replicate/qwen/qwen-image-edit-plus | https://replicate.com/qwen/qwen-image-edit-plus | 官方文档 · Replicate · Qwen-image-edit-plus | 官方文档 · Replicate · Qwen Image Edit Plus |
| web | replicate/qwen/qwen3-235b-a22b-instruct-2507 | https://huggingface.co/Qwen/Qwen3-235B-A22B-Instruct-2507 | 官方文档 · Hugging Face · qwen3-235b-a22b-instruct-2507 | 官方文档 · Hugging Face · Qwen3-235b A22b Instruct 2507 |
| web | replicate/qwen/qwen3-235b-a22b-instruct-2507 | https://replicate.com/qwen/qwen3-235b-a22b-instruct-2507 | 官方文档 · Replicate · qwen3-235b-a22b-instruct-2507 | 官方文档 · Replicate · Qwen3-235b A22b Instruct 2507 |
| web | replicate/recraft-ai/recraft-v4.1 | https://replicate.com/recraft-ai/recraft-v4.1 | 官方文档 · Replicate · recraft-v4.1 | 官方文档 · Replicate · Recraft V4.1 |
| web | replicate/recraft-ai/recraft-v4-pro | https://replicate.com/recraft-ai/recraft-v4-pro | 官方文档 · Replicate · recraft-v4-pro | 官方文档 · Replicate · Recraft V4 Pro |
| web | replicate/recraft-ai/recraft-v3 | https://replicate.com/recraft-ai/recraft-v3 | 官方文档 · Replicate · recraft-v3 | 官方文档 · Replicate · Recraft V3 |
| web | replicate/stability-ai/stable-diffusion-3.5-large | https://replicate.com/stability-ai/stable-diffusion-3.5-large | 官方文档 · Replicate · stable-diffusion-3.5-large | 官方文档 · Replicate · Stable Diffusion 3.5 Large |
| web | replicate/stability-ai/stable-diffusion-3.5-large-turbo | https://replicate.com/stability-ai/stable-diffusion-3.5-large-turbo | 官方文档 · Replicate · stable-diffusion-3.5-large-turbo | 官方文档 · Replicate · Stable Diffusion 3.5 Large Turbo |
| web | replicate/stability-ai/stable-diffusion-3.5-medium | https://replicate.com/stability-ai/stable-diffusion-3.5-medium | 官方文档 · Replicate · stable-diffusion-3.5-medium | 官方文档 · Replicate · Stable Diffusion 3.5 Medium |
| web | replicate/stability-ai/sdxl | https://replicate.com/stability-ai/sdxl | 官方文档 · Replicate · sdxl | 官方文档 · Replicate · SDXL |
| web | replicate/stability-ai/stable-diffusion | https://replicate.com/stability-ai/stable-diffusion | 官方文档 · Replicate · stable-diffusion | 官方文档 · Replicate · Stable Diffusion |
| web | replicate/wan-video/wan-2.7-image | https://replicate.com/wan-video/wan-2.7-image | 官方文档 · Replicate · wan-2.7-image | 官方文档 · Replicate · Wan 2.7 Image |
| web | replicate/wan-video/wan-2.7-image-pro | https://replicate.com/wan-video/wan-2.7-image-pro | 官方文档 · Replicate · wan-2.7-image-pro | 官方文档 · Replicate · Wan 2.7 Image Pro |
| web | replicate/prunaai/wan-2.2-image | https://replicate.com/prunaai/wan-2.2-image | 官方文档 · Replicate · wan-2.2-image | 官方文档 · Replicate · Wan 2.2 Image |
| web | replicate/xai/grok-imagine-image | https://replicate.com/xai/grok-imagine-image | 官方文档 · Replicate · Grok-imagine-image | 官方文档 · Replicate · Grok Imagine Image |
| web | replicate/xai/grok-imagine-image-2 | https://replicate.com/xai/grok-imagine-image-2 | 官方文档 · Replicate · Grok-imagine-image-2 | 官方文档 · Replicate · Grok Imagine Image 2 |
| web | replicate/adirik/realvisxl-v3.0-turbo | https://replicate.com/adirik/realvisxl-v3.0-turbo | 官方文档 · Replicate · adirik · realvisxl-v3.0-turbo | 官方文档 · Replicate · Adirik（Realvisxl V3.0 Turbo） |
| web | replicate/ai-forever/kandinsky-2 | https://replicate.com/ai-forever/kandinsky-2 | 官方文档 · Replicate · kandinsky-2 | 官方文档 · Replicate · Kandinsky 2 |
| web | replicate/ai-forever/kandinsky-2.2 | https://replicate.com/ai-forever/kandinsky-2.2 | 官方文档 · Replicate · kandinsky-2.2 | 官方文档 · Replicate · Kandinsky 2.2 |
| web | replicate/bria/fibo | https://replicate.com/bria/fibo | 官方文档 · Replicate · fibo | 官方文档 · Replicate · Fibo |
| web | replicate/bria/fibo-edit | https://replicate.com/bria/fibo-edit | 官方文档 · Replicate · fibo-edit | 官方文档 · Replicate · Fibo Edit |
| web | replicate/bria/image-3.2 | https://replicate.com/bria/image-3.2 | 官方文档 · Replicate · image-3.2 | 官方文档 · Replicate · Image 3.2 |
| web | replicate/bytedance/bagel | https://replicate.com/bytedance/bagel | 官方文档 · Replicate · bagel | 官方文档 · Replicate · Bagel |
| web | replicate/bytedance/sdxl-lightning-4step | https://replicate.com/bytedance/sdxl-lightning-4step | 官方文档 · Replicate · sdxl-lightning-4step | 官方文档 · Replicate · SDXL Lightning 4step |
| web | replicate/datacte/proteus-v0.2 | https://replicate.com/datacte/proteus-v0.2 | 官方文档 · Replicate · datacte · proteus-v0.2 | 官方文档 · Replicate · Datacte（Proteus V0.2） |
| web | replicate/datacte/proteus-v0.3 | https://replicate.com/datacte/proteus-v0.3 | 官方文档 · Replicate · datacte · proteus-v0.3 | 官方文档 · Replicate · Datacte（Proteus V0.3） |
| web | replicate/fofr/latent-consistency-model | https://replicate.com/fofr/latent-consistency-model | 官方文档 · Replicate · fofr · latent-consistency-model | 官方文档 · Replicate · Fofr（Latent Consistency Model） |
| web | replicate/fofr/sdxl-emoji | https://replicate.com/fofr/sdxl-emoji | 官方文档 · Replicate · fofr · sdxl-emoji | 官方文档 · Replicate · Fofr（SDXL Emoji） |
| web | replicate/fofr/sticker-maker | https://replicate.com/fofr/sticker-maker | 官方文档 · Replicate · fofr · sticker-maker | 官方文档 · Replicate · Fofr（Sticker Maker） |
| web | replicate/krea/krea-2-medium | https://replicate.com/krea/krea-2-medium | 官方文档 · Replicate · krea-2-medium | 官方文档 · Replicate · Krea 2 Medium |
| web | replicate/leonardoai/lucid-origin | https://replicate.com/leonardoai/lucid-origin | 官方文档 · Replicate · lucid-origin | 官方文档 · Replicate · Lucid Origin |
| web | replicate/lucataco/dreamshaper-xl-turbo | https://replicate.com/lucataco/dreamshaper-xl-turbo | 官方文档 · Replicate · lucataco · dreamshaper-xl-turbo | 官方文档 · Replicate · Lucataco（Dreamshaper Xl Turbo） |
| web | replicate/lucataco/omnigen2 | https://replicate.com/lucataco/omnigen2 | 官方文档 · Replicate · lucataco · omnigen2 | 官方文档 · Replicate · Lucataco（Omnigen2） |
| web | replicate/lucataco/open-dalle-v1.1 | https://replicate.com/lucataco/open-dalle-v1.1 | 官方文档 · Replicate · lucataco · open-dalle-v1.1 | 官方文档 · Replicate · Lucataco（Open Dalle V1.1） |
| web | replicate/lucataco/realistic-vision-v5.1 | https://replicate.com/lucataco/realistic-vision-v5.1 | 官方文档 · Replicate · lucataco · realistic-vision-v5.1 | 官方文档 · Replicate · Lucataco（Realistic Vision V5.1） |
| web | replicate/lucataco/ssd-1b | https://replicate.com/lucataco/ssd-1b | 官方文档 · Replicate · lucataco · ssd-1b | 官方文档 · Replicate · Lucataco（Ssd 1b） |
| web | replicate/luma/photon | https://replicate.com/luma/photon | 官方文档 · Replicate · photon | 官方文档 · Replicate · Photon |
| web | replicate/luma/photon-flash | https://replicate.com/luma/photon-flash | 官方文档 · Replicate · photon-flash | 官方文档 · Replicate · Photon Flash |
| web | replicate/minimax/image-01 | https://replicate.com/minimax/image-01 | 官方文档 · Replicate · image-01 | 官方文档 · Replicate · Image 01 |
| web | replicate/nvidia/sana | https://replicate.com/nvidia/sana | 官方文档 · Replicate · sana | 官方文档 · Replicate · Sana |
| web | replicate/nvidia/sana-sprint-1.6b | https://replicate.com/nvidia/sana-sprint-1.6b | 官方文档 · Replicate · sana-sprint-1.6b | 官方文档 · Replicate · Sana Sprint 1.6b |
| web | replicate/playgroundai/playground-v2.5-1024px-aesthetic | https://replicate.com/playgroundai/playground-v2.5-1024px-aesthetic | 官方文档 · Replicate · playground-v2.5-1024px-aesthetic | 官方文档 · Replicate · Playground V2.5-1024px Aesthetic |
| web | replicate/prunaai/hidream-l1-dev | https://replicate.com/prunaai/hidream-l1-dev | 官方文档 · Replicate · hidream-l1-dev | 官方文档 · Replicate · Hidream L1 Dev |
| web | replicate/prunaai/hidream-l1-fast | https://replicate.com/prunaai/hidream-l1-fast | 官方文档 · Replicate · hidream-l1-fast | 官方文档 · Replicate · Hidream L1 Fast |
| web | replicate/prunaai/hidream-l1-full | https://replicate.com/prunaai/hidream-l1-full | 官方文档 · Replicate · hidream-l1-full | 官方文档 · Replicate · Hidream L1 Full |
| web | replicate/prunaai/p-image | https://replicate.com/prunaai/p-image | 官方文档 · Replicate · p-image | 官方文档 · Replicate · P Image |
| web | replicate/prunaai/p-image-edit | https://replicate.com/prunaai/p-image-edit | 官方文档 · Replicate · p-image-edit | 官方文档 · Replicate · P Image Edit |
| web | replicate/prunaai/p-image-ideogram | https://replicate.com/prunaai/p-image-ideogram | 官方文档 · Replicate · p-image-ideogram | 官方文档 · Replicate · P Image Ideogram |
| web | replicate/prunaai/p-image-lora | https://replicate.com/prunaai/p-image-lora | 官方文档 · Replicate · p-image-lora | 官方文档 · Replicate · P Image LoRA |
| web | replicate/prunaai/sdxl-lightning | https://replicate.com/prunaai/sdxl-lightning | 官方文档 · Replicate · sdxl-lightning | 官方文档 · Replicate · SDXL Lightning |
| web | replicate/prunaai/z-image-turbo | https://replicate.com/prunaai/z-image-turbo | 官方文档 · Replicate · z-image-turbo | 官方文档 · Replicate · Z Image Turbo |
| web | replicate/sourceful/riverflow-2.0-pro | https://replicate.com/sourceful/riverflow-2.0-pro | 官方文档 · Replicate · riverflow-2.0-pro | 官方文档 · Replicate · Riverflow 2.0 Pro |
| web | replicate/tencent/hunyuan-image-3 | https://replicate.com/tencent/hunyuan-image-3 | 官方文档 · Replicate · hunyuan-image-3 | 官方文档 · Replicate · Hunyuan Image 3 |
| web | replicate/tstramer/material-diffusion | https://replicate.com/tstramer/material-diffusion | 官方文档 · Replicate · tstramer · material-diffusion | 官方文档 · Replicate · Tstramer（Material Diffusion） |
| web | replicate/zsxkib/step1x-edit | https://replicate.com/zsxkib/step1x-edit | 官方文档 · Replicate · zsxkib · step1x-edit | 官方文档 · Replicate · Zsxkib（Step1x Edit） |
| web | tokendance/deepseek-v4-flash-vision-exp | https://api-docs.deepseek.com/news/news260821/ | 原厂规格 · DeepSeek · News260821 | 原厂规格 · DeepSeek · 更新日志 2026-08-21 |
| web | tokendance/deepseek-v4-flash | https://api-docs.deepseek.com/news/news260424/ | 官方文档 · DeepSeek · News260424 | 官方文档 · DeepSeek · 更新日志 2026-04-24 |
| web | tokendance/deepseek-chat-v3-0324 | https://api-docs.deepseek.com/news/news250325 | 原厂规格 · V3-0324 Release &#124; DeepSeek API Docs | 原厂规格 · DeepSeek · V3-0324 Release |
| web | tokendance/ling-3.0-flash | https://tokendance.space/models/ling-3.0-flash | 官方文档 · TokenDance · Ling-3.0-flash | 官方文档 · TokenDance · Ling 3.0 Flash |
| web | runware/google:nano-banana@2.1 | https://runware.ai/docs/models/google-nano-banana-2-1 | 官方文档 · Runware · Runware - Nano Banana 2.1 | 官方文档 · Runware · Runware |
| web | runware/bfl:flux@3-image | https://runware.ai/docs/models/bfl-flux-3-image | 官方文档 · Runware · Runware - FLUX 3 Image | 官方文档 · Runware · Runware |
| web | runware/ideogram:4.5@precise-edit | https://runware.ai/docs/models/ideogram-4-5-precise-edit | 官方文档 · Runware · Runware - Ideogram 4.5 Precise Edit | 官方文档 · Runware · Runware |
| web | runware/bytedance:seedream@5.0-flash | https://runware.ai/docs/models/bytedance-seedream-5-0-flash | 官方文档 · Runware · Runware - Seedream 5.0 Flash | 官方文档 · Runware · Runware |
| web | runware/recraft:v4.1@flash | https://www.recraft.ai/docs/api-reference/models/recraft-v4-1-flash | 官方文档 · Recraft · Runware - Recraft V4.1 Flash | 官方文档 · Recraft · Runware |
| web | runware/recraft:v4.1@flash | https://runware.ai/docs/models/recraft-v4-1-flash | 官方文档 · Runware · Runware - Recraft V4.1 Flash | 官方文档 · Runware · Runware |
| web | runware/alibaba:qwen-image@2.1-pro | https://runware.ai/docs/models/alibaba-qwen-image-2-1-pro | 官方文档 · Runware · Runware - Qwen-Image-2.1-Pro | 官方文档 · Runware · Runware |
| web | tokenhub/deepseek/deepseek-v4-flash-vision-exp | https://api-docs.deepseek.com/news/news260821/ | 官方文档 · DeepSeek · News260821 | 官方文档 · DeepSeek · 更新日志 2026-08-21 |
| web | qianfan/deepseek-v4.1-flash | https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash | 官方文档 · Hugging Face · DeepSeek-V4.1-flash | 官方文档 · Hugging Face · DeepSeek V4.1 Flash |
| web | qianfan/deepseek-v4.1-flash | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · Klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/deepseek-v4.1-flash | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台 | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/deepseek-v4.1-flash-1017 | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台 | 官方文档 · 百度千帆 · 模型列表 |
| web | qianfan/deepseek-v4-pro-0813 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · Klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/deepseek-v4-pro-0813 | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台 | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/deepseek-v4-flash-0731 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · Klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/deepseek-v4-flash-0731 | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台 | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/deepseek-v4-flash | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · Klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/deepseek-v4-flash | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台 | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/deepseek-v4-pro | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · Klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/deepseek-v4-pro | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台 | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/deepseek-v3.2 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · Klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/deepseek-v3.2 | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台 | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/deepseek-v3.2-think | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · Klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/deepseek-v3.2-think | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台 | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/glm-5.3 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · Klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/glm-5.3 | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台 | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/glm-5.3-flash | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · Klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/glm-5.3-flash | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台 | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/glm-5.2 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · Klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/glm-5.2 | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台 | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/glm-5.1 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · Klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/glm-5.1 | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台 | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/glm-5 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · Klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/glm-5 | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台 | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/kimi-k2.6 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · Klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/kimi-k2.6 | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台 | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/qwen-image | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · Klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/qwen-image | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台 | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/qwen-image-edit | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · Klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/qwen-image-edit | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台 | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/qwen3.5-122b-a10b | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · Klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/qwen3.5-122b-a10b | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台 | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/qwen3.5-27b | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · Klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/qwen3.5-27b | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台 | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/qwen3.5-35b-a3b | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · Klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/qwen3.5-35b-a3b | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台 | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/qwen3.5-397b-a17b | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · Klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/qwen3.5-397b-a17b | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台 | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/deepseek-flash | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · Klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/deepseek-flash | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台 | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/deepseek-ocr | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/deepseek-ocr | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · Klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/ernie-4.5-turbo-128k | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/ernie-4.5-turbo-128k | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · Klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/ernie-4.5-turbo-20260402 | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/ernie-4.5-turbo-20260402 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · Klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/ernie-4.5-turbo-32k | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/ernie-4.5-turbo-32k | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · Klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/ernie-4.5-turbo-vl | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/ernie-4.5-turbo-vl | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · Klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/ernie-4.5-turbo-vl-32k | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/ernie-4.5-turbo-vl-32k | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · Klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/ernie-5.0 | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/ernie-5.0 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · Klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/ernie-5.0-thinking-exp | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/ernie-5.0-thinking-exp | https://cloud.baidu.com/doc/qianfan-docs/s/Jm8r1826a | 官方文档 · 百度千帆 · Jm8r1826a | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/ernie-5.0-thinking-exp | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · Klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档 3） |
| web | qianfan/ernie-5.0-thinking-latest | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/ernie-5.0-thinking-latest | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · Klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/ernie-5.0-thinking-preview | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · Klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/ernie-5.0-thinking-preview | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台 | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/ernie-5.1 | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/ernie-5.1 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · Klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/ernie-x1.1 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · Klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/ernie-x1.1 | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台 | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/ernie-x1.1-preview | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · Klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/ernie-x1.1-preview | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台 | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/internvl3-38b | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/internvl3-38b | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · Klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/musesteamer-air-image | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · Klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/musesteamer-air-image | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台 | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | qianfan/qianfan-ocr | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台 | 官方文档 · 百度千帆 · 模型列表（文档） |
| web | qianfan/qianfan-ocr | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · Klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档 2） |
| web | antling/Ling-3.0-flash-VL | https://huggingface.co/inclusionAI/Ling-3.0-flash-VL | 官方文档 · Hugging Face · Ling 3.0-flash-VL | 官方文档 · Hugging Face · Ling 3.0 Flash VL |
| web | antling/Ling-3.0-tiny | https://huggingface.co/inclusionAI/Ling-3.0-tiny | 官方文档 · Hugging Face · Ling 3.0-tiny | 官方文档 · Hugging Face · Ling 3.0 Tiny |
| web | antling/Ling-3.0-flash | https://huggingface.co/inclusionAI/Ling-3.0-flash | 官方文档 · Hugging Face · Ling 3.0-flash | 官方文档 · Hugging Face · Ling 3.0 Flash |
| web | antling/Ling-2.6-flash | https://huggingface.co/inclusionAI/Ling-2.6-flash | 官方文档 · Hugging Face · Ling 2.6-flash | 官方文档 · Hugging Face · Ling 2.6 Flash |
| mini | zhipu/glm-5.3-flash | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5.3-flash | 官方文档 · 智谱 · GLM-5.3-flash | 官方文档 · 智谱 · GLM 5.3 Flash |
| mini | zhipu/glm-5-turbo | https://docs.bigmodel.cn/cn/guide/models/text/glm-5-turbo | 官方文档 · 智谱 · GLM-5-turbo | 官方文档 · 智谱 · GLM 5 Turbo |
| mini | zhipu/glm-4.7-flash | https://docs.bigmodel.cn/cn/guide/models/free/glm-4.7-flash | 官方文档 · 智谱 · GLM-4.7-flash | 官方文档 · 智谱 · GLM 4.7 Flash |
| mini | zhipu/glm-4.6v-flash | https://docs.bigmodel.cn/cn/guide/models/free/glm-4.6v-flash | 官方文档 · 智谱 · GLM-4.6v-flash | 官方文档 · 智谱 · GLM 4.6v Flash |
| mini | zhipu/glm-4.5-flash | https://docs.bigmodel.cn/cn/guide/models/free/glm-4.5-flash | 官方文档 · 智谱 · GLM-4.5-flash | 官方文档 · 智谱 · GLM 4.5 Flash |
| mini | zhipu/glm-4.1v-thinking-flash | https://docs.bigmodel.cn/cn/guide/models/free/glm-4.1v-thinking-flash | 官方文档 · 智谱 · GLM-4.1v-thinking-flash | 官方文档 · 智谱 · GLM 4.1v Thinking Flash |
| mini | zhipu/glm-4-long | https://docs.bigmodel.cn/cn/guide/models/text/glm-4-long | 官方文档 · 智谱 · GLM-4-long | 官方文档 · 智谱 · GLM 4 Long |
| mini | zhipu/glm-4v-flash | https://docs.bigmodel.cn/cn/guide/models/free/glm-4v-flash | 官方文档 · 智谱 · GLM-4v-flash | 官方文档 · 智谱 · GLM 4v Flash |
| mini | zhipu/cogview-3-flash | https://docs.bigmodel.cn/cn/guide/models/free/cogview-3-flash | 官方文档 · 智谱 · cogview-3-flash | 官方文档 · 智谱 · CogView 3 Flash |
| mini | zhipu/cogview-4 | https://docs.bigmodel.cn/cn/guide/models/image-generation/cogview-4 | 官方文档 · 智谱 · cogview-4 | 官方文档 · 智谱 · CogView 4 |
| mini | zhipu/cogview-4-250304 | https://docs.bigmodel.cn/cn/guide/models/image-generation/cogview-4 | 官方文档 · 智谱 · cogview-4 | 官方文档 · 智谱 · CogView 4 |
| mini | siliconflow/tencent/Hy4-preview | https://huggingface.co/tencent/Hy4-preview | 官方文档 · Hugging Face · Hy4-preview | 官方文档 · Hugging Face · Hy4 Preview |
| mini | siliconflow/inclusionAI/Ling-flash-2.0 | https://huggingface.co/inclusionAI/Ling-flash-2.0 | 官方文档 · Hugging Face · Ling-flash-2.0 | 官方文档 · Hugging Face · Ling Flash 2.0 |
| mini | siliconflow/inclusionAI/Ling-mini-2.0 | https://huggingface.co/inclusionAI/Ling-mini-2.0 | 官方文档 · Hugging Face · Ling-mini-2.0 | 官方文档 · Hugging Face · Ling Mini 2.0 |
| mini | recraft/recraftv4 | https://www.recraft.ai/docs/api-reference/models/recraft-v4 | 官方文档 · Recraft · recraftv4 | 官方文档 · Recraft · Recraft V4 |
| mini | recraft/recraftv3 | https://www.recraft.ai/docs/api-reference/models/recraft-v3 | 官方文档 · Recraft · recraftv3 | 官方文档 · Recraft · Recraft V3 |
| mini | recraft/recraftv2 | https://www.recraft.ai/docs/api-reference/models/recraft-v2 | 官方文档 · Recraft · recraftv2 | 官方文档 · Recraft · Recraft V2 |
| mini | recraft/recraftv2_vector | https://www.recraft.ai/docs/api-reference/models/recraft-v2 | 官方文档 · Recraft · recraftv2 | 官方文档 · Recraft · Recraft V2 |
| mini | xai/grok-4.20-0309-non-reasoning | https://docs.x.ai/developers/models/grok-4.20-0309-non-reasoning | 官方文档 · xAI · Grok-4.20-0309-non-reasoning | 官方文档 · xAI · Grok 4.20-0309 Non Reasoning |
| mini | xai/grok-4.20-0309-reasoning | https://docs.x.ai/developers/models/grok-4.20-0309-reasoning | 官方文档 · xAI · Grok-4.20-0309-reasoning | 官方文档 · xAI · Grok 4.20-0309 Reasoning |
| mini | xai/grok-4.20-multi-agent-0309 | https://docs.x.ai/developers/models/grok-4.20-multi-agent-0309 | 官方文档 · xAI · Grok 4.20 Multi-agent 0309 | 官方文档 · xAI · Grok 4.20 Multi Agent 0309 |
| mini | xai/grok-imagine-image | https://docs.x.ai/developers/models/grok-imagine-image | 官方文档 · xAI · Grok-imagine-image | 官方文档 · xAI · Grok Imagine Image |
| mini | xai/grok-imagine-image-quality | https://docs.x.ai/developers/models/grok-imagine-image-quality | 官方文档 · xAI · Grok-imagine-image-quality | 官方文档 · xAI · Grok Imagine Image Quality |
| mini | xai/grok-build-0.1 | https://docs.x.ai/developers/models/grok-build-0.1 | 官方文档 · xAI · Grok-build-0.1 | 官方文档 · xAI · Grok Build 0.1 |
| mini | gemini/gemini-3.1-flash-lite-image | https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite-image | 官方文档 · Google · Gemini 3.1 Flash Lite Image · Nano Banana 2 Lite | 官方文档 · Google · Gemini 3.1 Flash Lite Image（Nano Banana 2 Lite） |
| mini | gemini/gemini-3.1-flash-image | https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-image | 官方文档 · Google · Gemini 3.1 Flash Image · Nano Banana 2 | 官方文档 · Google · Gemini 3.1 Flash Image（Nano Banana 2） |
| mini | gemini/gemini-3-pro-image | https://ai.google.dev/gemini-api/docs/models/gemini-3-pro-image | 官方文档 · Google · Gemini 3 Pro Image · Nano Banana Pro | 官方文档 · Google · Gemini 3 Pro Image（Nano Banana Pro） |
| mini | gemini/gemini-2.5-flash-image | https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-image | 官方文档 · Google · Gemini 2.5 Flash Image · Nano Banana | 官方文档 · Google · Gemini 2.5 Flash Image（Nano Banana） |
| mini | bailian/glm-5.2-fast-preview | https://www.qianwenai.com/models/glm-5.2-fast-preview | 官方文档 · 千问 · GLM-5.2-fast-preview | 官方文档 · 千问 · GLM 5.2 Fast Preview |
| mini | bailian/kimi-k2.7-code | https://help.aliyun.com/zh/model-studio/kimi-k2-7-code | 官方文档 · 百炼 · Kimi-k2.7-code | 官方文档 · 百炼 · Kimi K2.7 Code |
| mini | bailian/qwen-image | https://help.aliyun.com/zh/model-studio/qwen-image-api | 官方文档 · 百炼 · Qwen-image API | 官方文档 · 百炼 · Qwen Image API |
| mini | bailian/qwen3.7-max | https://help.aliyun.com/zh/model-studio/qwen3-7-max | 官方文档 · 百炼 · Qwen3.7-max | 官方文档 · 百炼 · Qwen3.7 Max |
| mini | bailian/qwen3.6-plus | https://help.aliyun.com/zh/model-studio/qwen3-6-plus | 官方文档 · 百炼 · Qwen3.6-plus | 官方文档 · 百炼 · Qwen3.6 Plus |
| mini | bailian/qwen3.5-omni-flash | https://help.aliyun.com/zh/model-studio/qwen3-5-omni-flash | 官方文档 · 百炼 · Qwen3.5-omni-flash | 官方文档 · 百炼 · Qwen3.5 Omni Flash |
| mini | bailian/wan2.6-image | https://help.aliyun.com/zh/model-studio/wan2-6-image | 官方文档 · 百炼 · wan2.6-image | 官方文档 · 百炼 · Wan2.6 Image |
| mini | bailian/wan2.6-t2i | https://help.aliyun.com/zh/model-studio/wan2-6-t2i | 官方文档 · 百炼 · wan2.6-t2i | 官方文档 · 百炼 · Wan2.6 T2i |
| mini | bailian/wan2.2-t2i-flash | https://help.aliyun.com/zh/model-studio/wan2-2-t2i-flash | 官方文档 · 百炼 · wan2.2-t2i-flash | 官方文档 · 百炼 · Wan2.2 T2i Flash |
| mini | bailian/wan2.2-t2i-plus | https://help.aliyun.com/zh/model-studio/wan2-2-t2i-plus | 官方文档 · 百炼 · wan2.2-t2i-plus | 官方文档 · 百炼 · Wan2.2 T2i Plus |
| mini | bailian/unisound/unisound-u2 | https://help.aliyun.com/zh/model-studio/unisound-u2-by-unisound | 官方文档 · 百炼 · unisound-u2 By Unisound | 官方文档 · 百炼 · Unisound U2 |
| mini | bailian/wanx-v1 | https://help.aliyun.com/zh/model-studio/wanx-v1 | 官方文档 · 百炼 · wanx-v1 | 官方文档 · 百炼 · Wanx V1 |
| mini | bailian/wanx2.0-t2i-turbo | https://help.aliyun.com/zh/model-studio/wanx2-0-t2i-turbo | 官方文档 · 百炼 · wanx2.0-t2i-turbo | 官方文档 · 百炼 · Wanx2.0 T2i Turbo |
| mini | bailian/wanx2.1-t2i-plus | https://help.aliyun.com/zh/model-studio/wanx2-1-t2i-plus | 官方文档 · 百炼 · wanx2.1-t2i-plus | 官方文档 · 百炼 · Wanx2.1 T2i Plus |
| mini | bailian/wanx2.1-t2i-turbo | https://help.aliyun.com/zh/model-studio/wanx2-1-t2i-turbo | 官方文档 · 百炼 · wanx2.1-t2i-turbo | 官方文档 · 百炼 · Wanx2.1 T2i Turbo |
| mini | openai/gpt-image-2.5-flare | https://developers.openai.com/api/docs/models/gpt-image-2.5-flare.md | 官方文档 · OpenAI · GPT Image 2.5 Flare · 2026-09-08 | 官方文档 · OpenAI · GPT Image 2.5 Flare（2026-09-08） |
| mini | openai/gpt-image-2.5-sunburst | https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst.md | 官方文档 · OpenAI · GPT Image 2.5 Sunburst · 2026-09-08 | 官方文档 · OpenAI · GPT Image 2.5 Sunburst（2026-09-08） |
| mini | openai/gpt-5.5 | https://developers.openai.com/api/docs/models/gpt-5.5.md | 官方文档 · OpenAI · GPT-5.5 · 2026-04-23 | 官方文档 · OpenAI · GPT-5.5（2026-04-23） |
| mini | openai/gpt-5.5-pro | https://developers.openai.com/api/docs/models/gpt-5.5-pro.md | 官方文档 · OpenAI · GPT-5.5 Pro · 2026-04-23 | 官方文档 · OpenAI · GPT-5.5 Pro（2026-04-23） |
| mini | openai/gpt-5.4 | https://developers.openai.com/api/docs/models/gpt-5.4.md | 官方文档 · OpenAI · GPT-5.4 · 2026-03-05 | 官方文档 · OpenAI · GPT-5.4（2026-03-05） |
| mini | openai/gpt-5.4-mini | https://developers.openai.com/api/docs/models/gpt-5.4-mini.md | 官方文档 · OpenAI · GPT-5.4 Mini · 2026-03-17 | 官方文档 · OpenAI · GPT-5.4 Mini（2026-03-17） |
| mini | openai/gpt-5.4-nano | https://developers.openai.com/api/docs/models/gpt-5.4-nano.md | 官方文档 · OpenAI · GPT-5.4 Nano · 2026-03-17 | 官方文档 · OpenAI · GPT-5.4 Nano（2026-03-17） |
| mini | openai/gpt-5.4-pro | https://developers.openai.com/api/docs/models/gpt-5.4-pro.md | 官方文档 · OpenAI · GPT-5.4 Pro · 2026-03-05 | 官方文档 · OpenAI · GPT-5.4 Pro（2026-03-05） |
| mini | openai/gpt-5.3-codex | https://developers.openai.com/api/docs/models/gpt-5.3-codex.md | 官方文档 · OpenAI · GPT-5.3-codex | 官方文档 · OpenAI · GPT 5.3 Codex |
| mini | openai/gpt-5.2 | https://developers.openai.com/api/docs/models/gpt-5.2.md | 官方文档 · OpenAI · GPT-5.2 · 2025-12-11 | 官方文档 · OpenAI · GPT-5.2（2025-12-11） |
| mini | openai/gpt-5.2-pro | https://developers.openai.com/api/docs/models/gpt-5.2-pro.md | 官方文档 · OpenAI · GPT-5.2-pro · 2025-12-11 | 官方文档 · OpenAI · GPT 5.2 Pro（2025-12-11） |
| mini | openai/gpt-5.1 | https://developers.openai.com/api/docs/models/gpt-5.1.md | 官方文档 · OpenAI · GPT-5.1 · 2025-11-13 | 官方文档 · OpenAI · GPT-5.1（2025-11-13） |
| mini | openai/gpt-5 | https://developers.openai.com/api/docs/models/gpt-5.md | 官方文档 · OpenAI · GPT-5 · 2025-08-07 | 官方文档 · OpenAI · GPT-5（2025-08-07） |
| mini | openai/gpt-5-mini | https://developers.openai.com/api/docs/models/gpt-5-mini.md | 官方文档 · OpenAI · GPT-5-mini · 2025-08-07 | 官方文档 · OpenAI · GPT 5 Mini（2025-08-07） |
| mini | openai/gpt-5-nano | https://developers.openai.com/api/docs/models/gpt-5-nano.md | 官方文档 · OpenAI · GPT-5-nano · 2025-08-07 | 官方文档 · OpenAI · GPT 5 Nano（2025-08-07） |
| mini | openai/gpt-5-pro | https://developers.openai.com/api/docs/models/gpt-5-pro.md | 官方文档 · OpenAI · GPT-5-pro · 2025-10-06 | 官方文档 · OpenAI · GPT 5 Pro（2025-10-06） |
| mini | openai/gpt-4.1 | https://developers.openai.com/api/docs/models/gpt-4.1.md | 官方文档 · OpenAI · GPT-4.1 · 2025-04-14 | 官方文档 · OpenAI · GPT-4.1（2025-04-14） |
| mini | openai/gpt-4.1-mini | https://developers.openai.com/api/docs/models/gpt-4.1-mini.md | 官方文档 · OpenAI · GPT-4.1 Mini · 2025-04-14 | 官方文档 · OpenAI · GPT-4.1 Mini（2025-04-14） |
| mini | openai/gpt-4.1-nano | https://developers.openai.com/api/docs/models/gpt-4.1-nano.md | 官方文档 · OpenAI · GPT-4.1-nano · 2025-04-14 | 官方文档 · OpenAI · GPT 4.1 Nano（2025-04-14） |
| mini | openai/gpt-4o | https://developers.openai.com/api/docs/models/gpt-4o.md | 官方文档 · OpenAI · GPT-4o · 2024-08-06 | 官方文档 · OpenAI · GPT-4o（2024-08-06） |
| mini | openai/gpt-4o-mini | https://developers.openai.com/api/docs/models/gpt-4o-mini.md | 官方文档 · OpenAI · GPT-4o-mini · 2024-07-18 | 官方文档 · OpenAI · GPT 4o Mini（2024-07-18） |
| mini | openai/gpt-4-turbo | https://developers.openai.com/api/docs/models/gpt-4-turbo.md | 官方文档 · OpenAI · GPT-4-turbo · 2024-04-09 | 官方文档 · OpenAI · GPT 4 Turbo（2024-04-09） |
| mini | openai/gpt-4 | https://developers.openai.com/api/docs/models/gpt-4.md | 官方文档 · OpenAI · GPT-4 · 0613 | 官方文档 · OpenAI · GPT-4（0613） |
| mini | openai/gpt-image-2 | https://developers.openai.com/api/docs/models/gpt-image-2.md | 官方文档 · OpenAI · GPT Image 2 · 2026-04-21 | 官方文档 · OpenAI · GPT Image 2（2026-04-21） |
| mini | openai/gpt-image-1.5 | https://developers.openai.com/api/docs/models/gpt-image-1.5.md | 官方文档 · OpenAI · GPT-image-1.5 · 2025-12-16 | 官方文档 · OpenAI · GPT Image 1.5（2025-12-16） |
| mini | openai/chat-latest | https://developers.openai.com/api/docs/models/chat-latest.md | 官方文档 · OpenAI · chat-latest | 官方文档 · OpenAI · Chat Latest |
| mini | openai/chatgpt-image-latest | https://developers.openai.com/api/docs/models/chatgpt-image-latest.md | 官方文档 · OpenAI · chatgpt-image-latest | 官方文档 · OpenAI · ChatGPT Image Latest |
| mini | openai/gpt-3.5-turbo | https://developers.openai.com/api/docs/models/gpt-3.5-turbo.md | 官方文档 · OpenAI · GPT-3.5-turbo · 0125 | 官方文档 · OpenAI · GPT 3.5 Turbo（0125） |
| mini | openai/o1 | https://developers.openai.com/api/docs/models/o1.md | 官方文档 · OpenAI · o1 · 2024-12-17 | 官方文档 · OpenAI · O1（2024-12-17） |
| mini | openai/o1-2024-12-17 | https://developers.openai.com/api/docs/models/o1 | 官方文档 · OpenAI · o1 | 官方文档 · OpenAI · O1 |
| mini | openai/o1-pro | https://developers.openai.com/api/docs/models/o1-pro.md | 官方文档 · OpenAI · o1-pro · 2025-03-19 | 官方文档 · OpenAI · O1 Pro（2025-03-19） |
| mini | openai/o3 | https://developers.openai.com/api/docs/models/o3.md | 官方文档 · OpenAI · o3 · 2025-04-16 | 官方文档 · OpenAI · O3（2025-04-16） |
| mini | openai/o3-2025-04-16 | https://developers.openai.com/api/docs/models/o3 | 官方文档 · OpenAI · o3 | 官方文档 · OpenAI · O3 |
| mini | openai/o3-mini | https://developers.openai.com/api/docs/models/o3-mini.md | 官方文档 · OpenAI · o3-mini · 2025-01-31 | 官方文档 · OpenAI · O3 Mini（2025-01-31） |
| mini | openai/o3-pro | https://developers.openai.com/api/docs/models/o3-pro.md | 官方文档 · OpenAI · o3-pro · 2025-06-10 | 官方文档 · OpenAI · O3 Pro（2025-06-10） |
| mini | openai/o4-mini | https://developers.openai.com/api/docs/models/o4-mini.md | 官方文档 · OpenAI · o4-mini · 2025-04-16 | 官方文档 · OpenAI · O4 Mini（2025-04-16） |
| mini | bfl/flux-2-flex | https://docs.bfl.ml/api-reference/models/generate-or-edit-an-image-with-flux2-[flex] | 官方文档 · BFL · FLUX-2-flex | 官方文档 · BFL · FLUX 2 Flex |
| mini | bfl/flux-2-klein-4b | https://docs.bfl.ml/api-reference/models/generate-or-edit-an-image-with-flux2-[klein]-4b | 官方文档 · BFL · FLUX-2-klein-4b | 官方文档 · BFL · FLUX 2 Klein 4b |
| mini | bfl/flux-2-klein-9b | https://docs.bfl.ml/api-reference/models/generate-or-edit-an-image-with-flux2-[klein]-9b | 官方文档 · BFL · FLUX-2-klein-9b | 官方文档 · BFL · FLUX 2 Klein 9b |
| mini | bfl/flux-2-klein-9b-preview | https://docs.bfl.ml/api-reference/models/generate-or-edit-an-image-with-flux2-[klein]-9b-preview | 官方文档 · BFL · FLUX-2-klein-9b-preview | 官方文档 · BFL · FLUX 2 Klein 9b Preview |
| mini | bfl/flux-2-max | https://docs.bfl.ml/api-reference/models/generate-or-edit-an-image-with-flux2-[max] | 官方文档 · BFL · FLUX-2-max | 官方文档 · BFL · FLUX 2 Max |
| mini | bfl/flux-2-pro | https://docs.bfl.ml/api-reference/models/generate-or-edit-an-image-with-flux2-[pro] | 官方文档 · BFL · FLUX-2-pro | 官方文档 · BFL · FLUX 2 Pro |
| mini | bfl/flux-2-pro-preview | https://docs.bfl.ml/api-reference/models/generate-or-edit-an-image-with-flux2-[pro]-preview | 官方文档 · BFL · FLUX-2-pro-preview | 官方文档 · BFL · FLUX 2 Pro Preview |
| mini | ideogram/p-image-ideogram | https://developer.ideogram.ai/v2/api-reference/images/generate/p-image-ideogram | 官方文档 · Ideogram · p-image-ideogram | 官方文档 · Ideogram · P Image Ideogram |
| mini | mistral/zai-glm-5-3 | https://docs.mistral.ai/models/zai-glm-5-3 | 官方文档 · Mistral · zai-glm-5-3 | 官方文档 · Mistral · Zai GLM 5-3 |
| mini | mistral/zai-glm-5-2 | https://docs.mistral.ai/models/zai-glm-5-2 | 官方文档 · Mistral · zai-glm-5-2 | 官方文档 · Mistral · Zai GLM 5-2 |
| mini | mistral/codestral-2508 | https://docs.mistral.ai/models/codestral-25-08 | 官方文档 · Mistral · codestral-2508 | 官方文档 · Mistral · Codestral 2508 |
| mini | mistral/codestral-latest | https://docs.mistral.ai/models/codestral-25-08 | 官方文档 · Mistral · Codestral · 2508 | 官方文档 · Mistral · Codestral（2508） |
| mini | fireworks/accounts/fireworks/models/step-3p7-flash-nvfp4 | https://fireworks.ai/models/fireworks/step-3p7-flash-nvfp4 | 官方文档 · Fireworks · Step 3.7 Flash · NVFP4 | 官方文档 · Fireworks · Step 3.7 Flash（NVFP4） |
| mini | fal/alibaba/qwen-image-3/text-to-image | https://fal.ai/models/alibaba/qwen-image-3/text-to-image/api | 官方文档 · fal · Qwen-image-3 API 文档 | 官方文档 · fal · Qwen Image 3 API 文档 |
| mini | fal/bytedance/seedream/v5/pro/text-to-image | https://fal.ai/models/bytedance/seedream/v5/pro/text-to-image/api | 官方文档 · fal · Seedream · v5 · pro API 文档 | 官方文档 · fal · Seedream（v5，pro） API 文档 |
| mini | fal/fal-ai/bytedance/seedream/v5/lite/edit | https://fal.ai/models/fal-ai/bytedance/seedream/v5/lite/edit/api | 官方文档 · fal · Seedream · v5 · lite · edit API 文档 | 官方文档 · fal · Seedream（v5，lite，edit） API 文档 |
| mini | fal/fal-ai/bytedance/seedream/v4.5/text-to-image | https://fal.ai/models/fal-ai/bytedance/seedream/v4.5/text-to-image/api | 官方文档 · fal · Seedream · v4.5 API 文档 | 官方文档 · fal · Seedream（v4.5） API 文档 |
| mini | fal/fal-ai/bytedance/seedream/v4/text-to-image | https://fal.ai/models/fal-ai/bytedance/seedream/v4/text-to-image/api | 官方文档 · fal · Seedream · v4 API 文档 | 官方文档 · fal · Seedream（v4） API 文档 |
| mini | fal/fal-ai/fast-sdxl | https://fal.ai/models/fal-ai/fast-sdxl/api | 官方文档 · fal · fast-sdxl API 文档 | 官方文档 · fal · Fast SDXL API 文档 |
| mini | fal/fal-ai/flux-2-flex | https://fal.ai/models/fal-ai/flux-2-flex/api | 官方文档 · fal · FLUX-2-flex API 文档 | 官方文档 · fal · FLUX 2 Flex API 文档 |
| mini | fal/fal-ai/flux-2-pro | https://fal.ai/models/fal-ai/flux-2-pro/api | 官方文档 · fal · FLUX-2-pro API 文档 | 官方文档 · fal · FLUX 2 Pro API 文档 |
| mini | fal/fal-ai/flux-2/flash | https://fal.ai/models/fal-ai/flux-2/flash/api | 官方文档 · fal · FLUX-2 · flash API 文档 | 官方文档 · fal · FLUX-2（flash） API 文档 |
| mini | fal/fal-ai/flux-2/klein/9b | https://fal.ai/models/fal-ai/flux-2/klein/9b/api | 官方文档 · fal · FLUX-2 · klein · 9b API 文档 | 官方文档 · fal · FLUX-2（klein，9b） API 文档 |
| mini | fal/fal-ai/flux-2/turbo | https://fal.ai/models/fal-ai/flux-2/turbo/api | 官方文档 · fal · FLUX-2 · turbo API 文档 | 官方文档 · fal · FLUX-2（turbo） API 文档 |
| mini | fal/fal-ai/flux-kontext-lora | https://fal.ai/models/fal-ai/flux-kontext-lora/api | 官方文档 · fal · FLUX-kontext-lora API 文档 | 官方文档 · fal · FLUX Kontext LoRA API 文档 |
| mini | fal/fal-ai/flux-pro/kontext | https://fal.ai/models/fal-ai/flux-pro/kontext/api | 官方文档 · fal · FLUX-pro · kontext API 文档 | 官方文档 · fal · FLUX Pro（Kontext） API 文档 |
| mini | fal/fal-ai/flux-pro/v1.1 | https://fal.ai/models/fal-ai/flux-pro/v1.1/api | 官方文档 · fal · FLUX-pro · v1.1 API 文档 | 官方文档 · fal · FLUX Pro（V1.1） API 文档 |
| mini | fal/fal-ai/flux-pro/v1.1-ultra | https://fal.ai/models/fal-ai/flux-pro/v1.1-ultra/api | 官方文档 · fal · FLUX-pro · v1.1-ultra API 文档 | 官方文档 · fal · FLUX Pro（V1.1 Ultra） API 文档 |
| mini | fal/fal-ai/flux-1/schnell | https://fal.ai/models/fal-ai/flux-1/schnell/api | 官方文档 · fal · FLUX-1 · schnell API 文档 | 官方文档 · fal · FLUX-1（schnell） API 文档 |
| mini | fal/fal-ai/flux-lora | https://fal.ai/models/fal-ai/flux-lora/api | 官方文档 · fal · FLUX-lora API 文档 | 官方文档 · fal · FLUX LoRA API 文档 |
| mini | fal/fal-ai/flux/dev | https://fal.ai/models/fal-ai/flux/dev/api | 官方文档 · fal · FLUX · dev API 文档 | 官方文档 · fal · FLUX（dev） API 文档 |
| mini | fal/fal-ai/flux/schnell | https://fal.ai/models/fal-ai/flux/schnell/api | 官方文档 · fal · FLUX · schnell API 文档 | 官方文档 · fal · FLUX（schnell） API 文档 |
| mini | fal/fal-ai/qwen-image | https://fal.ai/models/fal-ai/qwen-image/api | 官方文档 · fal · Qwen-image API 文档 | 官方文档 · fal · Qwen Image API 文档 |
| mini | fal/openai/gpt-image-2 | https://fal.ai/models/openai/gpt-image-2/api | 官方文档 · fal · GPT-image-2 API 文档 | 官方文档 · fal · GPT Image 2 API 文档 |
| mini | fal/fal-ai/gpt-image-1.5 | https://fal.ai/models/fal-ai/gpt-image-1.5/api | 官方文档 · fal · GPT-image-1.5 API 文档 | 官方文档 · fal · GPT Image 1.5 API 文档 |
| mini | fal/xai/grok-imagine-image/v2.0/text-to-image | https://fal.ai/models/xai/grok-imagine-image/v2.0/text-to-image/api | 官方文档 · fal · Grok-imagine-image · v2.0 API 文档 | 官方文档 · fal · Grok Imagine Image（V2.0） API 文档 |
| mini | fal/xai/grok-imagine-image | https://fal.ai/models/xai/grok-imagine-image/api | 官方文档 · fal · Grok-imagine-image API 文档 | 官方文档 · fal · Grok Imagine Image API 文档 |
| mini | fal/xai/grok-imagine-image/quality/text-to-image | https://fal.ai/models/xai/grok-imagine-image/quality/text-to-image/api | 官方文档 · fal · Grok-imagine-image · quality API 文档 | 官方文档 · fal · Grok Imagine Image（Quality） API 文档 |
| mini | fal/bria/fibo-edit-1.5/edit | https://fal.ai/models/bria/fibo-edit-1.5/edit/api | 官方文档 · fal · fibo-edit-1.5 · edit API 文档 | 官方文档 · fal · Fibo Edit 1.5（Edit） API 文档 |
| mini | fal/bria/fibo-gen-1.5/text-to-image | https://fal.ai/models/bria/fibo-gen-1.5/text-to-image/api | 官方文档 · fal · fibo-gen-1.5 API 文档 | 官方文档 · fal · Fibo Gen 1.5 API 文档 |
| mini | fal/fal-ai/krea-2/turbo | https://fal.ai/models/fal-ai/krea-2/turbo/api | 官方文档 · fal · krea-2 · turbo API 文档 | 官方文档 · fal · Krea 2（Turbo） API 文档 |
| mini | fal/fal-ai/z-image/turbo | https://fal.ai/models/fal-ai/z-image/turbo/api | 官方文档 · fal · z-image · turbo API 文档 | 官方文档 · fal · Z Image（Turbo） API 文档 |
| mini | fal/imagineart/imagineart-2.0-preview/text-to-image | https://fal.ai/models/imagineart/imagineart-2.0-preview/text-to-image/api | 官方文档 · fal · imagineart-2.0-preview API 文档 | 官方文档 · fal · Imagineart 2.0 Preview API 文档 |
| mini | fal/meta/muse-image/text-to-image | https://fal.ai/models/meta/muse-image/text-to-image/api | 官方文档 · fal · muse-image API 文档 | 官方文档 · fal · Muse Image API 文档 |
| mini | replicate/google/gemini-3.5-flash | https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash | 官方文档 · Google · gemini-3.5-flash | 官方文档 · Google · Gemini 3.5 Flash |
| mini | replicate/deepseek-ai/deepseek-v3.1 | https://huggingface.co/deepseek-ai/DeepSeek-V3.1 | 官方文档 · Hugging Face · deepseek-v3.1 | 官方文档 · Hugging Face · DeepSeek V3.1 |
| mini | replicate/alibaba/qwen-image-3 | https://replicate.com/alibaba/qwen-image-3 | 官方文档 · Replicate · Qwen-image-3 | 官方文档 · Replicate · Qwen Image 3 |
| mini | replicate/alibaba/qwen-image-3-pro | https://replicate.com/alibaba/qwen-image-3-pro | 官方文档 · Replicate · Qwen-image-3-pro | 官方文档 · Replicate · Qwen Image 3 Pro |
| mini | replicate/alibaba/wan-3 | https://replicate.com/alibaba/wan-3 | 官方文档 · Replicate · wan-3 | 官方文档 · Replicate · Wan 3 |
| mini | replicate/black-forest-labs/flux-2-flex | https://replicate.com/black-forest-labs/flux-2-flex | 官方文档 · Replicate · FLUX-2-flex | 官方文档 · Replicate · FLUX 2 Flex |
| mini | replicate/black-forest-labs/flux-2-klein-4b | https://replicate.com/black-forest-labs/flux-2-klein-4b | 官方文档 · Replicate · FLUX-2-klein-4b | 官方文档 · Replicate · FLUX 2 Klein 4b |
| mini | replicate/black-forest-labs/flux-2-max | https://replicate.com/black-forest-labs/flux-2-max | 官方文档 · Replicate · FLUX-2-max | 官方文档 · Replicate · FLUX 2 Max |
| mini | replicate/black-forest-labs/flux-2-pro | https://replicate.com/black-forest-labs/flux-2-pro | 官方文档 · Replicate · FLUX-2-pro | 官方文档 · Replicate · FLUX 2 Pro |
| mini | replicate/black-forest-labs/flux-kontext-dev | https://replicate.com/black-forest-labs/flux-kontext-dev | 官方文档 · Replicate · FLUX-kontext-dev | 官方文档 · Replicate · FLUX Kontext Dev |
| mini | replicate/black-forest-labs/flux-kontext-max | https://replicate.com/black-forest-labs/flux-kontext-max | 官方文档 · Replicate · FLUX-kontext-max | 官方文档 · Replicate · FLUX Kontext Max |
| mini | replicate/black-forest-labs/flux-kontext-pro | https://replicate.com/black-forest-labs/flux-kontext-pro | 官方文档 · Replicate · FLUX-kontext-pro | 官方文档 · Replicate · FLUX Kontext Pro |
| mini | replicate/bytedance/seedream-5-lite | https://replicate.com/bytedance/seedream-5-lite | 官方文档 · Replicate · Seedream-5-lite | 官方文档 · Replicate · Seedream 5 Lite |
| mini | replicate/google/gemini-3-flash | https://replicate.com/google/gemini-3-flash | 官方文档 · Replicate · gemini-3-flash | 官方文档 · Replicate · Gemini 3 Flash |
| mini | replicate/google/gemini-2.5-flash | https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash | 官方文档 · Google · gemini-2.5-flash | 官方文档 · Google · Gemini 2.5 Flash |
| mini | replicate/ideogram-ai/ideogram-v3-balanced | https://replicate.com/ideogram-ai/ideogram-v3-balanced | 官方文档 · Replicate · ideogram-v3-balanced | 官方文档 · Replicate · Ideogram V3 Balanced |
| mini | replicate/ideogram-ai/ideogram-v3-quality | https://replicate.com/ideogram-ai/ideogram-v3-quality | 官方文档 · Replicate · ideogram-v3-quality | 官方文档 · Replicate · Ideogram V3 Quality |
| mini | replicate/ideogram-ai/ideogram-v3-turbo | https://replicate.com/ideogram-ai/ideogram-v3-turbo | 官方文档 · Replicate · ideogram-v3-turbo | 官方文档 · Replicate · Ideogram V3 Turbo |
| mini | replicate/ideogram-ai/ideogram-v2a | https://replicate.com/ideogram-ai/ideogram-v2a | 官方文档 · Replicate · ideogram-v2a | 官方文档 · Replicate · Ideogram V2a |
| mini | replicate/ideogram-ai/ideogram-v2a-turbo | https://replicate.com/ideogram-ai/ideogram-v2a-turbo | 官方文档 · Replicate · ideogram-v2a-turbo | 官方文档 · Replicate · Ideogram V2a Turbo |
| mini | replicate/ideogram-ai/ideogram-v2 | https://replicate.com/ideogram-ai/ideogram-v2 | 官方文档 · Replicate · ideogram-v2 | 官方文档 · Replicate · Ideogram V2 |
| mini | replicate/ideogram-ai/ideogram-v2-turbo | https://replicate.com/ideogram-ai/ideogram-v2-turbo | 官方文档 · Replicate · ideogram-v2-turbo | 官方文档 · Replicate · Ideogram V2 Turbo |
| mini | replicate/moonshotai/kimi-k2-thinking | https://huggingface.co/moonshotai/Kimi-K2-Thinking | 官方文档 · Hugging Face · kimi-k2-thinking | 官方文档 · Hugging Face · Kimi K2 Thinking |
| mini | replicate/openai/gpt-image-2 | https://developers.openai.com/api/docs/models/gpt-image-2 | 官方文档 · OpenAI · GPT-image-2 | 官方文档 · OpenAI · GPT Image 2 |
| mini | replicate/openai/gpt-image-1.5 | https://developers.openai.com/api/docs/models/gpt-image-1.5 | 官方文档 · OpenAI · GPT-image-1.5 | 官方文档 · OpenAI · GPT Image 1.5 |
| mini | replicate/prunaai/flux-kontext-fast | https://replicate.com/prunaai/flux-kontext-fast | 官方文档 · Replicate · FLUX-kontext-fast | 官方文档 · Replicate · FLUX Kontext Fast |
| mini | replicate/black-forest-labs/flux-1.1-pro | https://replicate.com/black-forest-labs/flux-1.1-pro | 官方文档 · Replicate · FLUX-1.1-pro | 官方文档 · Replicate · FLUX 1.1 Pro |
| mini | replicate/black-forest-labs/flux-1.1-pro-ultra | https://replicate.com/black-forest-labs/flux-1.1-pro-ultra | 官方文档 · Replicate · FLUX-1.1-pro-ultra | 官方文档 · Replicate · FLUX 1.1 Pro Ultra |
| mini | replicate/black-forest-labs/flux-dev | https://replicate.com/black-forest-labs/flux-dev | 官方文档 · Replicate · FLUX-dev | 官方文档 · Replicate · FLUX Dev |
| mini | replicate/black-forest-labs/flux-dev-lora | https://replicate.com/black-forest-labs/flux-dev-lora | 官方文档 · Replicate · FLUX-dev-lora | 官方文档 · Replicate · FLUX Dev LoRA |
| mini | replicate/black-forest-labs/flux-pro | https://replicate.com/black-forest-labs/flux-pro | 官方文档 · Replicate · FLUX-pro | 官方文档 · Replicate · FLUX Pro |
| mini | replicate/black-forest-labs/flux-schnell | https://replicate.com/black-forest-labs/flux-schnell | 官方文档 · Replicate · FLUX-schnell | 官方文档 · Replicate · FLUX Schnell |
| mini | replicate/prunaai/flux-fast | https://replicate.com/prunaai/flux-fast | 官方文档 · Replicate · FLUX-fast | 官方文档 · Replicate · FLUX Fast |
| mini | replicate/qwen/qwen-image | https://replicate.com/qwen/qwen-image | 官方文档 · Replicate · Qwen-image | 官方文档 · Replicate · Qwen Image |
| mini | replicate/qwen/qwen-image-edit | https://replicate.com/qwen/qwen-image-edit | 官方文档 · Replicate · Qwen-image-edit | 官方文档 · Replicate · Qwen Image Edit |
| mini | replicate/qwen/qwen-image-edit-plus | https://replicate.com/qwen/qwen-image-edit-plus | 官方文档 · Replicate · Qwen-image-edit-plus | 官方文档 · Replicate · Qwen Image Edit Plus |
| mini | replicate/qwen/qwen3-235b-a22b-instruct-2507 | https://huggingface.co/Qwen/Qwen3-235B-A22B-Instruct-2507 | 官方文档 · Hugging Face · qwen3-235b-a22b-instruct-2507 | 官方文档 · Hugging Face · Qwen3-235b A22b Instruct 2507 |
| mini | replicate/recraft-ai/recraft-v4.1 | https://replicate.com/recraft-ai/recraft-v4.1 | 官方文档 · Replicate · recraft-v4.1 | 官方文档 · Replicate · Recraft V4.1 |
| mini | replicate/recraft-ai/recraft-v4-pro | https://replicate.com/recraft-ai/recraft-v4-pro | 官方文档 · Replicate · recraft-v4-pro | 官方文档 · Replicate · Recraft V4 Pro |
| mini | replicate/recraft-ai/recraft-v3 | https://replicate.com/recraft-ai/recraft-v3 | 官方文档 · Replicate · recraft-v3 | 官方文档 · Replicate · Recraft V3 |
| mini | replicate/stability-ai/stable-diffusion-3.5-large | https://replicate.com/stability-ai/stable-diffusion-3.5-large | 官方文档 · Replicate · stable-diffusion-3.5-large | 官方文档 · Replicate · Stable Diffusion 3.5 Large |
| mini | replicate/stability-ai/stable-diffusion-3.5-large-turbo | https://replicate.com/stability-ai/stable-diffusion-3.5-large-turbo | 官方文档 · Replicate · stable-diffusion-3.5-large-turbo | 官方文档 · Replicate · Stable Diffusion 3.5 Large Turbo |
| mini | replicate/stability-ai/stable-diffusion-3.5-medium | https://replicate.com/stability-ai/stable-diffusion-3.5-medium | 官方文档 · Replicate · stable-diffusion-3.5-medium | 官方文档 · Replicate · Stable Diffusion 3.5 Medium |
| mini | replicate/stability-ai/sdxl | https://replicate.com/stability-ai/sdxl | 官方文档 · Replicate · sdxl | 官方文档 · Replicate · SDXL |
| mini | replicate/stability-ai/stable-diffusion | https://replicate.com/stability-ai/stable-diffusion | 官方文档 · Replicate · stable-diffusion | 官方文档 · Replicate · Stable Diffusion |
| mini | replicate/wan-video/wan-2.7-image | https://replicate.com/wan-video/wan-2.7-image | 官方文档 · Replicate · wan-2.7-image | 官方文档 · Replicate · Wan 2.7 Image |
| mini | replicate/wan-video/wan-2.7-image-pro | https://replicate.com/wan-video/wan-2.7-image-pro | 官方文档 · Replicate · wan-2.7-image-pro | 官方文档 · Replicate · Wan 2.7 Image Pro |
| mini | replicate/prunaai/wan-2.2-image | https://replicate.com/prunaai/wan-2.2-image | 官方文档 · Replicate · wan-2.2-image | 官方文档 · Replicate · Wan 2.2 Image |
| mini | replicate/xai/grok-imagine-image | https://replicate.com/xai/grok-imagine-image | 官方文档 · Replicate · Grok-imagine-image | 官方文档 · Replicate · Grok Imagine Image |
| mini | replicate/xai/grok-imagine-image-2 | https://replicate.com/xai/grok-imagine-image-2 | 官方文档 · Replicate · Grok-imagine-image-2 | 官方文档 · Replicate · Grok Imagine Image 2 |
| mini | replicate/adirik/realvisxl-v3.0-turbo | https://replicate.com/adirik/realvisxl-v3.0-turbo | 官方文档 · Replicate · adirik · realvisxl-v3.0-turbo | 官方文档 · Replicate · Adirik（Realvisxl V3.0 Turbo） |
| mini | replicate/ai-forever/kandinsky-2 | https://replicate.com/ai-forever/kandinsky-2 | 官方文档 · Replicate · kandinsky-2 | 官方文档 · Replicate · Kandinsky 2 |
| mini | replicate/ai-forever/kandinsky-2.2 | https://replicate.com/ai-forever/kandinsky-2.2 | 官方文档 · Replicate · kandinsky-2.2 | 官方文档 · Replicate · Kandinsky 2.2 |
| mini | replicate/bria/fibo | https://replicate.com/bria/fibo | 官方文档 · Replicate · fibo | 官方文档 · Replicate · Fibo |
| mini | replicate/bria/fibo-edit | https://replicate.com/bria/fibo-edit | 官方文档 · Replicate · fibo-edit | 官方文档 · Replicate · Fibo Edit |
| mini | replicate/bria/image-3.2 | https://replicate.com/bria/image-3.2 | 官方文档 · Replicate · image-3.2 | 官方文档 · Replicate · Image 3.2 |
| mini | replicate/bytedance/bagel | https://replicate.com/bytedance/bagel | 官方文档 · Replicate · bagel | 官方文档 · Replicate · Bagel |
| mini | replicate/bytedance/sdxl-lightning-4step | https://replicate.com/bytedance/sdxl-lightning-4step | 官方文档 · Replicate · sdxl-lightning-4step | 官方文档 · Replicate · SDXL Lightning 4step |
| mini | replicate/datacte/proteus-v0.2 | https://replicate.com/datacte/proteus-v0.2 | 官方文档 · Replicate · datacte · proteus-v0.2 | 官方文档 · Replicate · Datacte（Proteus V0.2） |
| mini | replicate/datacte/proteus-v0.3 | https://replicate.com/datacte/proteus-v0.3 | 官方文档 · Replicate · datacte · proteus-v0.3 | 官方文档 · Replicate · Datacte（Proteus V0.3） |
| mini | replicate/fofr/latent-consistency-model | https://replicate.com/fofr/latent-consistency-model | 官方文档 · Replicate · fofr · latent-consistency-model | 官方文档 · Replicate · Fofr（Latent Consistency Model） |
| mini | replicate/fofr/sdxl-emoji | https://replicate.com/fofr/sdxl-emoji | 官方文档 · Replicate · fofr · sdxl-emoji | 官方文档 · Replicate · Fofr（SDXL Emoji） |
| mini | replicate/fofr/sticker-maker | https://replicate.com/fofr/sticker-maker | 官方文档 · Replicate · fofr · sticker-maker | 官方文档 · Replicate · Fofr（Sticker Maker） |
| mini | replicate/krea/krea-2-medium | https://replicate.com/krea/krea-2-medium | 官方文档 · Replicate · krea-2-medium | 官方文档 · Replicate · Krea 2 Medium |
| mini | replicate/leonardoai/lucid-origin | https://replicate.com/leonardoai/lucid-origin | 官方文档 · Replicate · lucid-origin | 官方文档 · Replicate · Lucid Origin |
| mini | replicate/lucataco/dreamshaper-xl-turbo | https://replicate.com/lucataco/dreamshaper-xl-turbo | 官方文档 · Replicate · lucataco · dreamshaper-xl-turbo | 官方文档 · Replicate · Lucataco（Dreamshaper Xl Turbo） |
| mini | replicate/lucataco/omnigen2 | https://replicate.com/lucataco/omnigen2 | 官方文档 · Replicate · lucataco · omnigen2 | 官方文档 · Replicate · Lucataco（Omnigen2） |
| mini | replicate/lucataco/open-dalle-v1.1 | https://replicate.com/lucataco/open-dalle-v1.1 | 官方文档 · Replicate · lucataco · open-dalle-v1.1 | 官方文档 · Replicate · Lucataco（Open Dalle V1.1） |
| mini | replicate/lucataco/realistic-vision-v5.1 | https://replicate.com/lucataco/realistic-vision-v5.1 | 官方文档 · Replicate · lucataco · realistic-vision-v5.1 | 官方文档 · Replicate · Lucataco（Realistic Vision V5.1） |
| mini | replicate/lucataco/ssd-1b | https://replicate.com/lucataco/ssd-1b | 官方文档 · Replicate · lucataco · ssd-1b | 官方文档 · Replicate · Lucataco（Ssd 1b） |
| mini | replicate/luma/photon | https://replicate.com/luma/photon | 官方文档 · Replicate · photon | 官方文档 · Replicate · Photon |
| mini | replicate/luma/photon-flash | https://replicate.com/luma/photon-flash | 官方文档 · Replicate · photon-flash | 官方文档 · Replicate · Photon Flash |
| mini | replicate/minimax/image-01 | https://replicate.com/minimax/image-01 | 官方文档 · Replicate · image-01 | 官方文档 · Replicate · Image 01 |
| mini | replicate/nvidia/sana | https://replicate.com/nvidia/sana | 官方文档 · Replicate · sana | 官方文档 · Replicate · Sana |
| mini | replicate/nvidia/sana-sprint-1.6b | https://replicate.com/nvidia/sana-sprint-1.6b | 官方文档 · Replicate · sana-sprint-1.6b | 官方文档 · Replicate · Sana Sprint 1.6b |
| mini | replicate/playgroundai/playground-v2.5-1024px-aesthetic | https://replicate.com/playgroundai/playground-v2.5-1024px-aesthetic | 官方文档 · Replicate · playground-v2.5-1024px-aesthetic | 官方文档 · Replicate · Playground V2.5-1024px Aesthetic |
| mini | replicate/prunaai/hidream-l1-dev | https://replicate.com/prunaai/hidream-l1-dev | 官方文档 · Replicate · hidream-l1-dev | 官方文档 · Replicate · Hidream L1 Dev |
| mini | replicate/prunaai/hidream-l1-fast | https://replicate.com/prunaai/hidream-l1-fast | 官方文档 · Replicate · hidream-l1-fast | 官方文档 · Replicate · Hidream L1 Fast |
| mini | replicate/prunaai/hidream-l1-full | https://replicate.com/prunaai/hidream-l1-full | 官方文档 · Replicate · hidream-l1-full | 官方文档 · Replicate · Hidream L1 Full |
| mini | replicate/prunaai/p-image | https://replicate.com/prunaai/p-image | 官方文档 · Replicate · p-image | 官方文档 · Replicate · P Image |
| mini | replicate/prunaai/p-image-edit | https://replicate.com/prunaai/p-image-edit | 官方文档 · Replicate · p-image-edit | 官方文档 · Replicate · P Image Edit |
| mini | replicate/prunaai/p-image-ideogram | https://replicate.com/prunaai/p-image-ideogram | 官方文档 · Replicate · p-image-ideogram | 官方文档 · Replicate · P Image Ideogram |
| mini | replicate/prunaai/p-image-lora | https://replicate.com/prunaai/p-image-lora | 官方文档 · Replicate · p-image-lora | 官方文档 · Replicate · P Image LoRA |
| mini | replicate/prunaai/sdxl-lightning | https://replicate.com/prunaai/sdxl-lightning | 官方文档 · Replicate · sdxl-lightning | 官方文档 · Replicate · SDXL Lightning |
| mini | replicate/prunaai/z-image-turbo | https://replicate.com/prunaai/z-image-turbo | 官方文档 · Replicate · z-image-turbo | 官方文档 · Replicate · Z Image Turbo |
| mini | replicate/sourceful/riverflow-2.0-pro | https://replicate.com/sourceful/riverflow-2.0-pro | 官方文档 · Replicate · riverflow-2.0-pro | 官方文档 · Replicate · Riverflow 2.0 Pro |
| mini | replicate/tencent/hunyuan-image-3 | https://replicate.com/tencent/hunyuan-image-3 | 官方文档 · Replicate · hunyuan-image-3 | 官方文档 · Replicate · Hunyuan Image 3 |
| mini | replicate/tstramer/material-diffusion | https://replicate.com/tstramer/material-diffusion | 官方文档 · Replicate · tstramer · material-diffusion | 官方文档 · Replicate · Tstramer（Material Diffusion） |
| mini | replicate/zsxkib/step1x-edit | https://replicate.com/zsxkib/step1x-edit | 官方文档 · Replicate · zsxkib · step1x-edit | 官方文档 · Replicate · Zsxkib（Step1x Edit） |
| mini | tokendance/deepseek-v4-flash-vision-exp | https://api-docs.deepseek.com/news/news260821/ | 原厂规格 · DeepSeek · News260821 | 原厂规格 · DeepSeek · 更新日志 2026-08-21 |
| mini | tokendance/deepseek-chat-v3-0324 | https://api-docs.deepseek.com/news/news250325 | 原厂规格 · V3-0324 Release &#124; DeepSeek API Docs | 原厂规格 · DeepSeek · V3-0324 Release |
| mini | tokendance/ling-3.0-flash | https://tokendance.space/models/ling-3.0-flash | 官方文档 · TokenDance · Ling-3.0-flash | 官方文档 · TokenDance · Ling 3.0 Flash |
| mini | runware/google:nano-banana@2.1 | https://runware.ai/docs/models/google-nano-banana-2-1 | 官方文档 · Runware · Runware - Nano Banana 2.1 | 官方文档 · Runware · Runware |
| mini | runware/bfl:flux@3-image | https://runware.ai/docs/models/bfl-flux-3-image | 官方文档 · Runware · Runware - FLUX 3 Image | 官方文档 · Runware · Runware |
| mini | runware/ideogram:4.5@precise-edit | https://runware.ai/docs/models/ideogram-4-5-precise-edit | 官方文档 · Runware · Runware - Ideogram 4.5 Precise Edit | 官方文档 · Runware · Runware |
| mini | runware/bytedance:seedream@5.0-flash | https://runware.ai/docs/models/bytedance-seedream-5-0-flash | 官方文档 · Runware · Runware - Seedream 5.0 Flash | 官方文档 · Runware · Runware |
| mini | runware/recraft:v4.1@flash | https://www.recraft.ai/docs/api-reference/models/recraft-v4-1-flash | 官方文档 · Recraft · Runware - Recraft V4.1 Flash | 官方文档 · Recraft · Runware |
| mini | runware/alibaba:qwen-image@2.1-pro | https://runware.ai/docs/models/alibaba-qwen-image-2-1-pro | 官方文档 · Runware · Runware - Qwen-Image-2.1-Pro | 官方文档 · Runware · Runware |
| mini | tokenhub/deepseek/deepseek-v4-flash-vision-exp | https://api-docs.deepseek.com/news/news260821/ | 官方文档 · DeepSeek · News260821 | 官方文档 · DeepSeek · 更新日志 2026-08-21 |
| mini | qianfan/deepseek-v4.1-flash | https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash | 官方文档 · Hugging Face · DeepSeek-V4.1-flash | 官方文档 · Hugging Face · DeepSeek V4.1 Flash |
| mini | qianfan/deepseek-v4.1-flash-1017 | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台 | 官方文档 · 百度千帆 · 模型列表 |
| mini | qianfan/deepseek-v3.2-think | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · Klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表 |
| mini | qianfan/ernie-4.5-turbo-128k | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台 | 官方文档 · 百度千帆 · 模型列表 |
| mini | qianfan/ernie-4.5-turbo-20260402 | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台 | 官方文档 · 百度千帆 · 模型列表 |
| mini | qianfan/ernie-4.5-turbo-32k | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台 | 官方文档 · 百度千帆 · 模型列表 |
| mini | qianfan/ernie-4.5-turbo-vl | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台 | 官方文档 · 百度千帆 · 模型列表 |
| mini | qianfan/ernie-4.5-turbo-vl-32k | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台 | 官方文档 · 百度千帆 · 模型列表 |
| mini | qianfan/ernie-5.0 | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台 | 官方文档 · 百度千帆 · 模型列表 |
| mini | qianfan/ernie-5.0-thinking-exp | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台 | 官方文档 · 百度千帆 · 模型列表 |
| mini | qianfan/ernie-5.0-thinking-latest | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台 | 官方文档 · 百度千帆 · 模型列表 |
| mini | qianfan/ernie-5.0-thinking-preview | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · Klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表 |
| mini | qianfan/ernie-5.1 | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台 | 官方文档 · 百度千帆 · 模型列表 |
| mini | qianfan/ernie-x1.1 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · Klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表 |
| mini | qianfan/ernie-x1.1-preview | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · Klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表 |
| mini | qianfan/musesteamer-air-image | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · Klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表 |
| mini | qianfan/qianfan-ocr | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台 | 官方文档 · 百度千帆 · 模型列表 |

The companion [JSON](model-card-source-titles-r24.json) also includes the complete changed dialog text/tooltip inventory. Reproduce with `node scripts/report-source-titles-r24.mjs --check`.

## R24 Phase I3

Baseline: **9a7128d613c339a999dad1e7dad50affe1ea230d** (I2 committed). All 1,064 cards per client and seven Web notices are compared to the lossless starting-HEAD snapshot. The I2 section above is historical; its claim of zero defects missed meaningless disambiguation qualifiers and is superseded here.

Require role · curated site · readable page. Reject opaque mixed letter/digit IDs, news/anchor fragments, site suffixes, lowercase or kebab/snake slugs, raw hosts/API paths, empty or leftover separators, repeated page brands, missing segments, and collapsed/split/hyphenated dotted versions. Reject counter-only and format-only qualifiers including （文档）, （文档 2）, （Markdown）; meaningful interface versions, languages and release codes remain valid. Genuine model/version/date hyphens remain valid; picker spelling is not an exemption for source slugs.

The former collision helper appended 文档, 文档 2 or Markdown, and the I2 scanner explicitly stripped those suffixes before checking the page. I3 rejects those counter/format-only suffixes, scans machine URLs too, and retains real model/date codes (0613, 0125, 2508) only when independently present in the card name or ID. Language, console/product namespaces and actual interface versions describe real distinctions.

Qianfan: the captured v24 title for rmh4stp0j is 模型列表; the WENXINWORKSHOP namespace is labelled 千帆 ModelBuilder 旧版入口（平台首页）, reflecting the newly captured redirect to the platform index. The qianfan-docs page Jm8r1826a has the captured title 价格 and now reads AI 应用开发入门：价格. Volcengine 1330310 redirects to ark/model-list and now reads 模型列表. Capture time, status, final URL and body hash are stored in `config/channel-audit/source-titles-r24-i3.json`. Other collisions use path-derived Kimi Code/开放平台, xAI 开发者指南/模型指南, Ideogram interface versions and image operations, Fireworks 模型库/控制台, MiniMax site regions, and the AntLing chat API section. The other namespace distinctions are inferred from URL paths; only the three recorded captures are newly fetched titles or redirects.

OpenAI documentation .md links map to the same captured human HTML page; the independent literal URL mapping contains 42 pairs and one raw MiniMax Markdown removal, used on 44 cards per client. Web removes 43 Markdown duplicates and one raw MiniMax Markdown row; one OpenAI card gains its HTML equivalent without removing a duplicate. Together keeps the primary 原厂规格 role when the HTML and Markdown rows merge. Web removes duplicate rows and Mini keeps its source access through HTML. Other raw .md/.mdx and llms text variants are hidden. GitHub/Hugging Face blob Markdown URLs are rendered HTML readers and remain human sources. Raw evidence, field provenance, picker identities, execution facts, 65,536 and the 15-model decision remain unchanged.

### I3 counts

| Client | Cards | Source rows before → after | Changed rows | Renamed human rows | HTML replacements | Strict findings before → after |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| web | 1064 | 2494 → 2450 | 310 | 265 | 44 | 318 → 0 |
| mini | 1064 | 1103 → 1103 | 77 | 33 | 44 | 44 → 0 |
| notices | 7 | 7 → 7 | 0 | 0 | 0 | 0 → 0 |

### I3 full before → after list

| Client | Card | Before URL | After URL | Before label | After label | Action |
| --- | --- | --- | --- | --- | --- | --- |
| web | kimi/kimi-k2.7-code-highspeed | https://www.kimi.com/code/docs/en/kimi-code/models | https://www.kimi.com/code/docs/en/kimi-code/models | 官方文档 · Kimi · 模型列表（英文） | 官方文档 · Kimi · 模型列表（Kimi Code，英文版） | rename |
| web | kimi/kimi-k2.7-code-highspeed | https://platform.kimi.com/docs/models | https://platform.kimi.com/docs/models | 官方文档 · Kimi · 模型列表（文档） | 官方文档 · Kimi · 模型列表（开放平台） | rename |
| web | xai/grok-4.5 | https://docs.x.ai/docs/models | https://docs.x.ai/docs/models | 官方文档 · xAI · 模型列表（文档） | 官方文档 · xAI · 模型列表（模型指南） | rename |
| web | xai/grok-4.5 | https://docs.x.ai/developers/models | https://docs.x.ai/developers/models | 官方文档 · xAI · 模型列表（文档 2） | 官方文档 · xAI · 模型列表（开发者指南） | rename |
| web | xai/grok-4.3 | https://docs.x.ai/docs/models | https://docs.x.ai/docs/models | 官方文档 · xAI · 模型列表（文档） | 官方文档 · xAI · 模型列表（模型指南） | rename |
| web | xai/grok-4.3 | https://docs.x.ai/developers/models | https://docs.x.ai/developers/models | 官方文档 · xAI · 模型列表（文档 2） | 官方文档 · xAI · 模型列表（开发者指南） | rename |
| web | xai/grok-4.20-0309-non-reasoning | https://docs.x.ai/docs/models | https://docs.x.ai/docs/models | 官方文档 · xAI · 模型列表（文档） | 官方文档 · xAI · 模型列表（模型指南） | rename |
| web | xai/grok-4.20-0309-non-reasoning | https://docs.x.ai/developers/models | https://docs.x.ai/developers/models | 官方文档 · xAI · 模型列表（文档 2） | 官方文档 · xAI · 模型列表（开发者指南） | rename |
| web | xai/grok-4.20-0309-reasoning | https://docs.x.ai/docs/models | https://docs.x.ai/docs/models | 官方文档 · xAI · 模型列表（文档） | 官方文档 · xAI · 模型列表（模型指南） | rename |
| web | xai/grok-4.20-0309-reasoning | https://docs.x.ai/developers/models | https://docs.x.ai/developers/models | 官方文档 · xAI · 模型列表（文档 2） | 官方文档 · xAI · 模型列表（开发者指南） | rename |
| web | xai/grok-4.20-multi-agent | https://docs.x.ai/docs/models | https://docs.x.ai/docs/models | 官方文档 · xAI · 模型列表（文档） | 官方文档 · xAI · 模型列表（模型指南） | rename |
| web | xai/grok-4.20-multi-agent | https://docs.x.ai/developers/models | https://docs.x.ai/developers/models | 官方文档 · xAI · 模型列表（文档 2） | 官方文档 · xAI · 模型列表（开发者指南） | rename |
| web | xai/grok-4.20-multi-agent-0309 | https://docs.x.ai/docs/models | https://docs.x.ai/docs/models | 官方文档 · xAI · 模型列表（文档） | 官方文档 · xAI · 模型列表（模型指南） | rename |
| web | xai/grok-4.20-multi-agent-0309 | https://docs.x.ai/developers/models | https://docs.x.ai/developers/models | 官方文档 · xAI · 模型列表（文档 2） | 官方文档 · xAI · 模型列表（开发者指南） | rename |
| web | xai/grok-imagine-image-2.0 | https://docs.x.ai/docs/models | https://docs.x.ai/docs/models | 官方文档 · xAI · 模型列表（文档） | 官方文档 · xAI · 模型列表（模型指南） | rename |
| web | xai/grok-imagine-image-2.0 | https://docs.x.ai/developers/models | https://docs.x.ai/developers/models | 官方文档 · xAI · 模型列表（文档 2） | 官方文档 · xAI · 模型列表（开发者指南） | rename |
| web | xai/grok-imagine-image | https://docs.x.ai/docs/models | https://docs.x.ai/docs/models | 官方文档 · xAI · 模型列表（文档） | 官方文档 · xAI · 模型列表（模型指南） | rename |
| web | xai/grok-imagine-image | https://docs.x.ai/developers/models | https://docs.x.ai/developers/models | 官方文档 · xAI · 模型列表（文档 2） | 官方文档 · xAI · 模型列表（开发者指南） | rename |
| web | xai/grok-imagine-image-quality | https://docs.x.ai/developers/models/grok-imagine-image-quality | https://docs.x.ai/developers/models/grok-imagine-image-quality | 官方文档 · xAI · Grok Imagine Image Quality（文档） | 官方文档 · xAI · Grok Imagine Image Quality（开发者指南） | rename |
| web | xai/grok-imagine-image-quality | https://docs.x.ai/docs/models/grok-imagine-image-quality | https://docs.x.ai/docs/models/grok-imagine-image-quality | 官方文档 · xAI · Grok Imagine Image Quality（文档 2） | 官方文档 · xAI · Grok Imagine Image Quality（模型指南） | rename |
| web | xai/grok-build-0.1 | https://docs.x.ai/developers/models/grok-build-0.1 | https://docs.x.ai/developers/models/grok-build-0.1 | 官方文档 · xAI · Grok Build 0.1（文档） | 官方文档 · xAI · Grok Build 0.1（开发者指南） | rename |
| web | xai/grok-build-0.1 | https://docs.x.ai/docs/models/grok-build-0.1 | https://docs.x.ai/docs/models/grok-build-0.1 | 官方文档 · xAI · Grok Build 0.1（文档 2） | 官方文档 · xAI · Grok Build 0.1（模型指南） | rename |
| web | bailian/MiniMax/MiniMax-M3 | https://help.aliyun.com/zh/model-studio/models | https://help.aliyun.com/zh/model-studio/models | 官方文档 · 百炼 · 模型列表（文档） | 官方文档 · 百炼 · 模型列表（中文版） | rename |
| web | bailian/MiniMax/MiniMax-M3 | https://help.aliyun.com/en/model-studio/models | https://help.aliyun.com/en/model-studio/models | 官方文档 · 百炼 · 模型列表（英文） | 官方文档 · 百炼 · 模型列表（英文版） | rename |
| web | bailian/qwen-image-3.0-pro | https://help.aliyun.com/zh/model-studio/models | https://help.aliyun.com/zh/model-studio/models | 官方文档 · 百炼 · 模型列表（文档） | 官方文档 · 百炼 · 模型列表（中文版） | rename |
| web | bailian/qwen-image-3.0-pro | https://help.aliyun.com/en/model-studio/models | https://help.aliyun.com/en/model-studio/models | 官方文档 · 百炼 · 模型列表（英文） | 官方文档 · 百炼 · 模型列表（英文版） | rename |
| web | bailian/qwen3.7-flash | https://help.aliyun.com/zh/model-studio/models | https://help.aliyun.com/zh/model-studio/models | 官方文档 · 百炼 · 模型列表（文档） | 官方文档 · 百炼 · 模型列表（中文版） | rename |
| web | bailian/qwen3.7-flash | https://help.aliyun.com/en/model-studio/models | https://help.aliyun.com/en/model-studio/models | 官方文档 · 百炼 · 模型列表（英文） | 官方文档 · 百炼 · 模型列表（英文版） | rename |
| web | bailian/deepseek-v4-pro | https://help.aliyun.com/zh/model-studio/models | https://help.aliyun.com/zh/model-studio/models | 官方文档 · 百炼 · 模型列表（文档） | 官方文档 · 百炼 · 模型列表（中文版） | rename |
| web | bailian/deepseek-v4-pro | https://help.aliyun.com/en/model-studio/models | https://help.aliyun.com/en/model-studio/models | 官方文档 · 百炼 · 模型列表（英文） | 官方文档 · 百炼 · 模型列表（英文版） | rename |
| web | bailian/glm-5.2 | https://help.aliyun.com/zh/model-studio/models | https://help.aliyun.com/zh/model-studio/models | 官方文档 · 百炼 · 模型列表（文档） | 官方文档 · 百炼 · 模型列表（中文版） | rename |
| web | bailian/glm-5.2 | https://help.aliyun.com/en/model-studio/models | https://help.aliyun.com/en/model-studio/models | 官方文档 · 百炼 · 模型列表（英文） | 官方文档 · 百炼 · 模型列表（英文版） | rename |
| web | bailian/kimi/kimi-k3 | https://help.aliyun.com/zh/model-studio/models | https://help.aliyun.com/zh/model-studio/models | 官方文档 · 百炼 · 模型列表（文档） | 官方文档 · 百炼 · 模型列表（中文版） | rename |
| web | bailian/kimi/kimi-k3 | https://help.aliyun.com/en/model-studio/models | https://help.aliyun.com/en/model-studio/models | 官方文档 · 百炼 · 模型列表（英文） | 官方文档 · 百炼 · 模型列表（英文版） | rename |
| web | bailian/qwen-image-2.0 | https://help.aliyun.com/zh/model-studio/models | https://help.aliyun.com/zh/model-studio/models | 官方文档 · 百炼 · 模型列表（文档） | 官方文档 · 百炼 · 模型列表（中文版） | rename |
| web | bailian/qwen-image-2.0 | https://help.aliyun.com/en/model-studio/models | https://help.aliyun.com/en/model-studio/models | 官方文档 · 百炼 · 模型列表（英文） | 官方文档 · 百炼 · 模型列表（英文版） | rename |
| web | bailian/qwen-image-2.0-pro | https://help.aliyun.com/zh/model-studio/models | https://help.aliyun.com/zh/model-studio/models | 官方文档 · 百炼 · 模型列表（文档） | 官方文档 · 百炼 · 模型列表（中文版） | rename |
| web | bailian/qwen-image-2.0-pro | https://help.aliyun.com/en/model-studio/models | https://help.aliyun.com/en/model-studio/models | 官方文档 · 百炼 · 模型列表（英文） | 官方文档 · 百炼 · 模型列表（英文版） | rename |
| web | bailian/qwen3.7-plus | https://help.aliyun.com/zh/model-studio/models | https://help.aliyun.com/zh/model-studio/models | 官方文档 · 百炼 · 模型列表（文档） | 官方文档 · 百炼 · 模型列表（中文版） | rename |
| web | bailian/qwen3.7-plus | https://help.aliyun.com/en/model-studio/models | https://help.aliyun.com/en/model-studio/models | 官方文档 · 百炼 · 模型列表（英文） | 官方文档 · 百炼 · 模型列表（英文版） | rename |
| web | bailian/wan2.7-image | https://help.aliyun.com/zh/model-studio/models | https://help.aliyun.com/zh/model-studio/models | 官方文档 · 百炼 · 模型列表（文档） | 官方文档 · 百炼 · 模型列表（中文版） | rename |
| web | bailian/wan2.7-image | https://help.aliyun.com/en/model-studio/models | https://help.aliyun.com/en/model-studio/models | 官方文档 · 百炼 · 模型列表（英文） | 官方文档 · 百炼 · 模型列表（英文版） | rename |
| web | bailian/wan2.7-image-pro | https://help.aliyun.com/zh/model-studio/models | https://help.aliyun.com/zh/model-studio/models | 官方文档 · 百炼 · 模型列表（文档） | 官方文档 · 百炼 · 模型列表（中文版） | rename |
| web | bailian/wan2.7-image-pro | https://help.aliyun.com/en/model-studio/models | https://help.aliyun.com/en/model-studio/models | 官方文档 · 百炼 · 模型列表（英文） | 官方文档 · 百炼 · 模型列表（英文版） | rename |
| web | bailian/z-image-turbo | https://help.aliyun.com/zh/model-studio/models | https://help.aliyun.com/zh/model-studio/models | 官方文档 · 百炼 · 模型列表（文档） | 官方文档 · 百炼 · 模型列表（中文版） | rename |
| web | bailian/z-image-turbo | https://help.aliyun.com/en/model-studio/models | https://help.aliyun.com/en/model-studio/models | 官方文档 · 百炼 · 模型列表（英文） | 官方文档 · 百炼 · 模型列表（英文版） | rename |
| web | openai/gpt-6-luna | https://developers.openai.com/api/docs/models/gpt-6-luna.md | https://developers.openai.com/api/docs/models/gpt-6-luna | 官方文档 · OpenAI · GPT-6 Luna（Markdown） | 官方文档 · OpenAI · GPT-6 Luna | hide machine duplicate; retain HTML |
| web | openai/gpt-6-luna | https://developers.openai.com/api/docs/models/gpt-6-luna | https://developers.openai.com/api/docs/models/gpt-6-luna | 官方文档 · OpenAI · GPT-6 Luna（文档） | 官方文档 · OpenAI · GPT-6 Luna | rename |
| web | openai/gpt-6-sol | https://developers.openai.com/api/docs/models/gpt-6-sol.md | https://developers.openai.com/api/docs/models/gpt-6-sol | 官方文档 · OpenAI · GPT-6 Sol（Markdown） | 官方文档 · OpenAI · GPT-6 Sol | hide machine duplicate; retain HTML |
| web | openai/gpt-6-sol | https://developers.openai.com/api/docs/models/gpt-6-sol | https://developers.openai.com/api/docs/models/gpt-6-sol | 官方文档 · OpenAI · GPT-6 Sol（文档） | 官方文档 · OpenAI · GPT-6 Sol | rename |
| web | openai/gpt-image-2.5-flare | https://developers.openai.com/api/docs/models/gpt-image-2.5-flare.md | https://developers.openai.com/api/docs/models/gpt-image-2.5-flare | 官方文档 · OpenAI · GPT Image 2.5 Flare（2026-09-08）（Markdown） | 官方文档 · OpenAI · GPT Image 2.5 Flare（2026-09-08） | hide machine duplicate; retain HTML |
| web | openai/gpt-image-2.5-flare | https://developers.openai.com/api/docs/models/gpt-image-2.5-flare | https://developers.openai.com/api/docs/models/gpt-image-2.5-flare | 官方文档 · OpenAI · GPT Image 2.5 Flare（2026-09-08）（文档） | 官方文档 · OpenAI · GPT Image 2.5 Flare（2026-09-08） | rename |
| web | openai/gpt-image-2.5-sunburst | https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst.md | https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst | 官方文档 · OpenAI · GPT Image 2.5 Sunburst（2026-09-08）（Markdown） | 官方文档 · OpenAI · GPT Image 2.5 Sunburst（2026-09-08） | hide machine duplicate; retain HTML |
| web | openai/gpt-image-2.5-sunburst | https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst | https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst | 官方文档 · OpenAI · GPT Image 2.5 Sunburst（2026-09-08）（文档） | 官方文档 · OpenAI · GPT Image 2.5 Sunburst（2026-09-08） | rename |
| web | openai/gpt-6-astra | https://developers.openai.com/api/docs/models/gpt-6-astra.md | https://developers.openai.com/api/docs/models/gpt-6-astra | 官方文档 · OpenAI · GPT-6 Astra（Markdown） | 官方文档 · OpenAI · GPT-6 Astra | hide machine duplicate; retain HTML |
| web | openai/gpt-6-astra | https://developers.openai.com/api/docs/models/gpt-6-astra | https://developers.openai.com/api/docs/models/gpt-6-astra | 官方文档 · OpenAI · GPT-6 Astra（文档） | 官方文档 · OpenAI · GPT-6 Astra | rename |
| web | openai/gpt-5.6-luna | https://developers.openai.com/api/docs/models/gpt-5.6-luna.md | https://developers.openai.com/api/docs/models/gpt-5.6-luna | 官方文档 · OpenAI · GPT-5.6 Luna（Markdown） | 官方文档 · OpenAI · GPT-5.6 Luna | hide machine duplicate; retain HTML |
| web | openai/gpt-5.6-luna | https://developers.openai.com/api/docs/models/gpt-5.6-luna | https://developers.openai.com/api/docs/models/gpt-5.6-luna | 官方文档 · OpenAI · GPT-5.6 Luna（文档） | 官方文档 · OpenAI · GPT-5.6 Luna | rename |
| web | openai/gpt-5.6-sol | https://developers.openai.com/api/docs/models/gpt-5.6-sol.md | https://developers.openai.com/api/docs/models/gpt-5.6-sol | 官方文档 · OpenAI · GPT-5.6 Sol | 官方文档 · OpenAI · GPT-5.6 Sol | replace machine link with HTML |
| web | openai/gpt-5.6-terra | https://developers.openai.com/api/docs/models/gpt-5.6-terra.md | https://developers.openai.com/api/docs/models/gpt-5.6-terra | 官方文档 · OpenAI · GPT-5.6 Terra（Markdown） | 官方文档 · OpenAI · GPT-5.6 Terra | hide machine duplicate; retain HTML |
| web | openai/gpt-5.6-terra | https://developers.openai.com/api/docs/models/gpt-5.6-terra | https://developers.openai.com/api/docs/models/gpt-5.6-terra | 官方文档 · OpenAI · GPT-5.6 Terra（文档） | 官方文档 · OpenAI · GPT-5.6 Terra | rename |
| web | openai/gpt-5.5 | https://developers.openai.com/api/docs/models/gpt-5.5.md | https://developers.openai.com/api/docs/models/gpt-5.5 | 官方文档 · OpenAI · GPT-5.5（2026-04-23）（Markdown） | 官方文档 · OpenAI · GPT-5.5（2026-04-23） | hide machine duplicate; retain HTML |
| web | openai/gpt-5.5 | https://developers.openai.com/api/docs/models/gpt-5.5 | https://developers.openai.com/api/docs/models/gpt-5.5 | 官方文档 · OpenAI · GPT-5.5（2026-04-23）（文档） | 官方文档 · OpenAI · GPT-5.5（2026-04-23） | rename |
| web | openai/gpt-5.5-pro | https://developers.openai.com/api/docs/models/gpt-5.5-pro.md | https://developers.openai.com/api/docs/models/gpt-5.5-pro | 官方文档 · OpenAI · GPT-5.5 Pro（2026-04-23）（Markdown） | 官方文档 · OpenAI · GPT-5.5 Pro（2026-04-23） | hide machine duplicate; retain HTML |
| web | openai/gpt-5.5-pro | https://developers.openai.com/api/docs/models/gpt-5.5-pro | https://developers.openai.com/api/docs/models/gpt-5.5-pro | 官方文档 · OpenAI · GPT-5.5 Pro（2026-04-23）（文档） | 官方文档 · OpenAI · GPT-5.5 Pro（2026-04-23） | rename |
| web | openai/gpt-5.4 | https://developers.openai.com/api/docs/models/gpt-5.4.md | https://developers.openai.com/api/docs/models/gpt-5.4 | 官方文档 · OpenAI · GPT-5.4（2026-03-05）（Markdown） | 官方文档 · OpenAI · GPT-5.4（2026-03-05） | hide machine duplicate; retain HTML |
| web | openai/gpt-5.4 | https://developers.openai.com/api/docs/models/gpt-5.4 | https://developers.openai.com/api/docs/models/gpt-5.4 | 官方文档 · OpenAI · GPT-5.4（2026-03-05）（文档） | 官方文档 · OpenAI · GPT-5.4（2026-03-05） | rename |
| web | openai/gpt-5.4-mini | https://developers.openai.com/api/docs/models/gpt-5.4-mini.md | https://developers.openai.com/api/docs/models/gpt-5.4-mini | 官方文档 · OpenAI · GPT-5.4 Mini（2026-03-17）（Markdown） | 官方文档 · OpenAI · GPT-5.4 Mini（2026-03-17） | hide machine duplicate; retain HTML |
| web | openai/gpt-5.4-mini | https://developers.openai.com/api/docs/models/gpt-5.4-mini | https://developers.openai.com/api/docs/models/gpt-5.4-mini | 官方文档 · OpenAI · GPT-5.4 Mini（2026-03-17）（文档） | 官方文档 · OpenAI · GPT-5.4 Mini（2026-03-17） | rename |
| web | openai/gpt-5.4-nano | https://developers.openai.com/api/docs/models/gpt-5.4-nano.md | https://developers.openai.com/api/docs/models/gpt-5.4-nano | 官方文档 · OpenAI · GPT-5.4 Nano（2026-03-17）（Markdown） | 官方文档 · OpenAI · GPT-5.4 Nano（2026-03-17） | hide machine duplicate; retain HTML |
| web | openai/gpt-5.4-nano | https://developers.openai.com/api/docs/models/gpt-5.4-nano | https://developers.openai.com/api/docs/models/gpt-5.4-nano | 官方文档 · OpenAI · GPT-5.4 Nano（2026-03-17）（文档） | 官方文档 · OpenAI · GPT-5.4 Nano（2026-03-17） | rename |
| web | openai/gpt-5.4-pro | https://developers.openai.com/api/docs/models/gpt-5.4-pro.md | https://developers.openai.com/api/docs/models/gpt-5.4-pro | 官方文档 · OpenAI · GPT-5.4 Pro（2026-03-05）（Markdown） | 官方文档 · OpenAI · GPT-5.4 Pro（2026-03-05） | hide machine duplicate; retain HTML |
| web | openai/gpt-5.4-pro | https://developers.openai.com/api/docs/models/gpt-5.4-pro | https://developers.openai.com/api/docs/models/gpt-5.4-pro | 官方文档 · OpenAI · GPT-5.4 Pro（2026-03-05）（文档） | 官方文档 · OpenAI · GPT-5.4 Pro（2026-03-05） | rename |
| web | openai/gpt-5.3-codex | https://developers.openai.com/api/docs/models/gpt-5.3-codex.md | https://developers.openai.com/api/docs/models/gpt-5.3-codex | 官方文档 · OpenAI · GPT 5.3 Codex（Markdown） | 官方文档 · OpenAI · GPT 5.3 Codex | hide machine duplicate; retain HTML |
| web | openai/gpt-5.3-codex | https://developers.openai.com/api/docs/models/gpt-5.3-codex | https://developers.openai.com/api/docs/models/gpt-5.3-codex | 官方文档 · OpenAI · GPT 5.3 Codex（文档） | 官方文档 · OpenAI · GPT 5.3 Codex | rename |
| web | openai/gpt-5.2 | https://developers.openai.com/api/docs/models/gpt-5.2.md | https://developers.openai.com/api/docs/models/gpt-5.2 | 官方文档 · OpenAI · GPT-5.2（2025-12-11）（Markdown） | 官方文档 · OpenAI · GPT-5.2（2025-12-11） | hide machine duplicate; retain HTML |
| web | openai/gpt-5.2 | https://developers.openai.com/api/docs/models/gpt-5.2 | https://developers.openai.com/api/docs/models/gpt-5.2 | 官方文档 · OpenAI · GPT-5.2（2025-12-11）（文档） | 官方文档 · OpenAI · GPT-5.2（2025-12-11） | rename |
| web | openai/gpt-5.2-pro | https://developers.openai.com/api/docs/models/gpt-5.2-pro.md | https://developers.openai.com/api/docs/models/gpt-5.2-pro | 官方文档 · OpenAI · GPT 5.2 Pro（2025-12-11）（Markdown） | 官方文档 · OpenAI · GPT 5.2 Pro（2025-12-11） | hide machine duplicate; retain HTML |
| web | openai/gpt-5.2-pro | https://developers.openai.com/api/docs/models/gpt-5.2-pro | https://developers.openai.com/api/docs/models/gpt-5.2-pro | 官方文档 · OpenAI · GPT 5.2 Pro（2025-12-11）（文档） | 官方文档 · OpenAI · GPT 5.2 Pro（2025-12-11） | rename |
| web | openai/gpt-5.1 | https://developers.openai.com/api/docs/models/gpt-5.1.md | https://developers.openai.com/api/docs/models/gpt-5.1 | 官方文档 · OpenAI · GPT-5.1（2025-11-13）（Markdown） | 官方文档 · OpenAI · GPT-5.1（2025-11-13） | hide machine duplicate; retain HTML |
| web | openai/gpt-5.1 | https://developers.openai.com/api/docs/models/gpt-5.1 | https://developers.openai.com/api/docs/models/gpt-5.1 | 官方文档 · OpenAI · GPT-5.1（2025-11-13）（文档） | 官方文档 · OpenAI · GPT-5.1（2025-11-13） | rename |
| web | openai/gpt-5 | https://developers.openai.com/api/docs/models/gpt-5.md | https://developers.openai.com/api/docs/models/gpt-5 | 官方文档 · OpenAI · GPT-5（2025-08-07）（Markdown） | 官方文档 · OpenAI · GPT-5（2025-08-07） | hide machine duplicate; retain HTML |
| web | openai/gpt-5 | https://developers.openai.com/api/docs/models/gpt-5 | https://developers.openai.com/api/docs/models/gpt-5 | 官方文档 · OpenAI · GPT-5（2025-08-07）（文档） | 官方文档 · OpenAI · GPT-5（2025-08-07） | rename |
| web | openai/gpt-5-mini | https://developers.openai.com/api/docs/models/gpt-5-mini.md | https://developers.openai.com/api/docs/models/gpt-5-mini | 官方文档 · OpenAI · GPT 5 Mini（2025-08-07）（Markdown） | 官方文档 · OpenAI · GPT 5 Mini（2025-08-07） | hide machine duplicate; retain HTML |
| web | openai/gpt-5-mini | https://developers.openai.com/api/docs/models/gpt-5-mini | https://developers.openai.com/api/docs/models/gpt-5-mini | 官方文档 · OpenAI · GPT 5 Mini（2025-08-07）（文档） | 官方文档 · OpenAI · GPT 5 Mini（2025-08-07） | rename |
| web | openai/gpt-5-nano | https://developers.openai.com/api/docs/models/gpt-5-nano.md | https://developers.openai.com/api/docs/models/gpt-5-nano | 官方文档 · OpenAI · GPT 5 Nano（2025-08-07）（Markdown） | 官方文档 · OpenAI · GPT 5 Nano（2025-08-07） | hide machine duplicate; retain HTML |
| web | openai/gpt-5-nano | https://developers.openai.com/api/docs/models/gpt-5-nano | https://developers.openai.com/api/docs/models/gpt-5-nano | 官方文档 · OpenAI · GPT 5 Nano（2025-08-07）（文档） | 官方文档 · OpenAI · GPT 5 Nano（2025-08-07） | rename |
| web | openai/gpt-5-pro | https://developers.openai.com/api/docs/models/gpt-5-pro.md | https://developers.openai.com/api/docs/models/gpt-5-pro | 官方文档 · OpenAI · GPT 5 Pro（2025-10-06）（Markdown） | 官方文档 · OpenAI · GPT 5 Pro（2025-10-06） | hide machine duplicate; retain HTML |
| web | openai/gpt-5-pro | https://developers.openai.com/api/docs/models/gpt-5-pro | https://developers.openai.com/api/docs/models/gpt-5-pro | 官方文档 · OpenAI · GPT 5 Pro（2025-10-06）（文档） | 官方文档 · OpenAI · GPT 5 Pro（2025-10-06） | rename |
| web | openai/gpt-4.1 | https://developers.openai.com/api/docs/models/gpt-4.1.md | https://developers.openai.com/api/docs/models/gpt-4.1 | 官方文档 · OpenAI · GPT-4.1（2025-04-14）（Markdown） | 官方文档 · OpenAI · GPT-4.1（2025-04-14） | hide machine duplicate; retain HTML |
| web | openai/gpt-4.1 | https://developers.openai.com/api/docs/models/gpt-4.1 | https://developers.openai.com/api/docs/models/gpt-4.1 | 官方文档 · OpenAI · GPT-4.1（2025-04-14）（文档） | 官方文档 · OpenAI · GPT-4.1（2025-04-14） | rename |
| web | openai/gpt-4.1-mini | https://developers.openai.com/api/docs/models/gpt-4.1-mini.md | https://developers.openai.com/api/docs/models/gpt-4.1-mini | 官方文档 · OpenAI · GPT-4.1 Mini（2025-04-14）（Markdown） | 官方文档 · OpenAI · GPT-4.1 Mini（2025-04-14） | hide machine duplicate; retain HTML |
| web | openai/gpt-4.1-mini | https://developers.openai.com/api/docs/models/gpt-4.1-mini | https://developers.openai.com/api/docs/models/gpt-4.1-mini | 官方文档 · OpenAI · GPT-4.1 Mini（2025-04-14）（文档） | 官方文档 · OpenAI · GPT-4.1 Mini（2025-04-14） | rename |
| web | openai/gpt-4.1-nano | https://developers.openai.com/api/docs/models/gpt-4.1-nano.md | https://developers.openai.com/api/docs/models/gpt-4.1-nano | 官方文档 · OpenAI · GPT 4.1 Nano（2025-04-14）（Markdown） | 官方文档 · OpenAI · GPT 4.1 Nano（2025-04-14） | hide machine duplicate; retain HTML |
| web | openai/gpt-4.1-nano | https://developers.openai.com/api/docs/models/gpt-4.1-nano | https://developers.openai.com/api/docs/models/gpt-4.1-nano | 官方文档 · OpenAI · GPT 4.1 Nano（2025-04-14）（文档） | 官方文档 · OpenAI · GPT 4.1 Nano（2025-04-14） | rename |
| web | openai/gpt-4o | https://developers.openai.com/api/docs/models/gpt-4o.md | https://developers.openai.com/api/docs/models/gpt-4o | 官方文档 · OpenAI · GPT-4o（2024-08-06）（Markdown） | 官方文档 · OpenAI · GPT-4o（2024-08-06） | hide machine duplicate; retain HTML |
| web | openai/gpt-4o | https://developers.openai.com/api/docs/models/gpt-4o | https://developers.openai.com/api/docs/models/gpt-4o | 官方文档 · OpenAI · GPT-4o（2024-08-06）（文档） | 官方文档 · OpenAI · GPT-4o（2024-08-06） | rename |
| web | openai/gpt-4o-mini | https://developers.openai.com/api/docs/models/gpt-4o-mini.md | https://developers.openai.com/api/docs/models/gpt-4o-mini | 官方文档 · OpenAI · GPT 4o Mini（2024-07-18）（Markdown） | 官方文档 · OpenAI · GPT 4o Mini（2024-07-18） | hide machine duplicate; retain HTML |
| web | openai/gpt-4o-mini | https://developers.openai.com/api/docs/models/gpt-4o-mini | https://developers.openai.com/api/docs/models/gpt-4o-mini | 官方文档 · OpenAI · GPT 4o Mini（2024-07-18）（文档） | 官方文档 · OpenAI · GPT 4o Mini（2024-07-18） | rename |
| web | openai/gpt-4-turbo | https://developers.openai.com/api/docs/models/gpt-4-turbo.md | https://developers.openai.com/api/docs/models/gpt-4-turbo | 官方文档 · OpenAI · GPT 4 Turbo（2024-04-09）（Markdown） | 官方文档 · OpenAI · GPT 4 Turbo（2024-04-09） | hide machine duplicate; retain HTML |
| web | openai/gpt-4-turbo | https://developers.openai.com/api/docs/models/gpt-4-turbo | https://developers.openai.com/api/docs/models/gpt-4-turbo | 官方文档 · OpenAI · GPT 4 Turbo（2024-04-09）（文档） | 官方文档 · OpenAI · GPT 4 Turbo（2024-04-09） | rename |
| web | openai/gpt-4 | https://developers.openai.com/api/docs/models/gpt-4.md | https://developers.openai.com/api/docs/models/gpt-4 | 官方文档 · OpenAI · GPT-4（0613）（Markdown） | 官方文档 · OpenAI · GPT-4（0613） | hide machine duplicate; retain HTML |
| web | openai/gpt-4 | https://developers.openai.com/api/docs/models/gpt-4 | https://developers.openai.com/api/docs/models/gpt-4 | 官方文档 · OpenAI · GPT-4（0613）（文档） | 官方文档 · OpenAI · GPT-4（0613） | rename |
| web | openai/gpt-image-2 | https://developers.openai.com/api/docs/models/gpt-image-2.md | https://developers.openai.com/api/docs/models/gpt-image-2 | 官方文档 · OpenAI · GPT Image 2（2026-04-21）（Markdown） | 官方文档 · OpenAI · GPT Image 2（2026-04-21） | hide machine duplicate; retain HTML |
| web | openai/gpt-image-2 | https://developers.openai.com/api/docs/models/gpt-image-2 | https://developers.openai.com/api/docs/models/gpt-image-2 | 官方文档 · OpenAI · GPT Image 2（2026-04-21）（文档） | 官方文档 · OpenAI · GPT Image 2（2026-04-21） | rename |
| web | openai/gpt-image-1.5 | https://developers.openai.com/api/docs/models/gpt-image-1.5.md | https://developers.openai.com/api/docs/models/gpt-image-1.5 | 官方文档 · OpenAI · GPT Image 1.5（2025-12-16）（Markdown） | 官方文档 · OpenAI · GPT Image 1.5（2025-12-16） | hide machine duplicate; retain HTML |
| web | openai/gpt-image-1.5 | https://developers.openai.com/api/docs/models/gpt-image-1.5 | https://developers.openai.com/api/docs/models/gpt-image-1.5 | 官方文档 · OpenAI · GPT Image 1.5（2025-12-16）（文档） | 官方文档 · OpenAI · GPT Image 1.5（2025-12-16） | rename |
| web | openai/gpt-image-1 | https://developers.openai.com/api/docs/models/gpt-image-1.md | https://developers.openai.com/api/docs/models/gpt-image-1 | 官方文档 · OpenAI · GPT Image 1（Markdown） | 官方文档 · OpenAI · GPT Image 1 | hide machine duplicate; retain HTML |
| web | openai/gpt-image-1 | https://developers.openai.com/api/docs/models/gpt-image-1 | https://developers.openai.com/api/docs/models/gpt-image-1 | 官方文档 · OpenAI · GPT Image 1（文档） | 官方文档 · OpenAI · GPT Image 1 | rename |
| web | openai/gpt-image-1-mini | https://developers.openai.com/api/docs/models/gpt-image-1-mini.md | https://developers.openai.com/api/docs/models/gpt-image-1-mini | 官方文档 · OpenAI · GPT Image 1 Mini（Markdown） | 官方文档 · OpenAI · GPT Image 1 Mini | hide machine duplicate; retain HTML |
| web | openai/gpt-image-1-mini | https://developers.openai.com/api/docs/models/gpt-image-1-mini | https://developers.openai.com/api/docs/models/gpt-image-1-mini | 官方文档 · OpenAI · GPT Image 1 Mini（文档） | 官方文档 · OpenAI · GPT Image 1 Mini | rename |
| web | openai/chat-latest | https://developers.openai.com/api/docs/models/chat-latest.md | https://developers.openai.com/api/docs/models/chat-latest | 官方文档 · OpenAI · Chat Latest（Markdown） | 官方文档 · OpenAI · Chat Latest | hide machine duplicate; retain HTML |
| web | openai/chat-latest | https://developers.openai.com/api/docs/models/chat-latest | https://developers.openai.com/api/docs/models/chat-latest | 官方文档 · OpenAI · Chat Latest（文档） | 官方文档 · OpenAI · Chat Latest | rename |
| web | openai/chatgpt-image-latest | https://developers.openai.com/api/docs/models/chatgpt-image-latest.md | https://developers.openai.com/api/docs/models/chatgpt-image-latest | 官方文档 · OpenAI · ChatGPT Image Latest（Markdown） | 官方文档 · OpenAI · ChatGPT Image Latest | hide machine duplicate; retain HTML |
| web | openai/chatgpt-image-latest | https://developers.openai.com/api/docs/models/chatgpt-image-latest | https://developers.openai.com/api/docs/models/chatgpt-image-latest | 官方文档 · OpenAI · ChatGPT Image Latest（文档） | 官方文档 · OpenAI · ChatGPT Image Latest | rename |
| web | openai/gpt-3.5-turbo | https://developers.openai.com/api/docs/models/gpt-3.5-turbo.md | https://developers.openai.com/api/docs/models/gpt-3.5-turbo | 官方文档 · OpenAI · GPT 3.5 Turbo（0125）（Markdown） | 官方文档 · OpenAI · GPT 3.5 Turbo（0125） | hide machine duplicate; retain HTML |
| web | openai/gpt-3.5-turbo | https://developers.openai.com/api/docs/models/gpt-3.5-turbo | https://developers.openai.com/api/docs/models/gpt-3.5-turbo | 官方文档 · OpenAI · GPT 3.5 Turbo（0125）（文档） | 官方文档 · OpenAI · GPT 3.5 Turbo（0125） | rename |
| web | openai/o1 | https://developers.openai.com/api/docs/models/o1.md | https://developers.openai.com/api/docs/models/o1 | 官方文档 · OpenAI · O1（2024-12-17）（Markdown） | 官方文档 · OpenAI · O1（2024-12-17） | hide machine duplicate; retain HTML |
| web | openai/o1 | https://developers.openai.com/api/docs/models/o1 | https://developers.openai.com/api/docs/models/o1 | 官方文档 · OpenAI · O1（2024-12-17）（文档） | 官方文档 · OpenAI · O1（2024-12-17） | rename |
| web | openai/o1-pro | https://developers.openai.com/api/docs/models/o1-pro.md | https://developers.openai.com/api/docs/models/o1-pro | 官方文档 · OpenAI · O1 Pro（2025-03-19）（Markdown） | 官方文档 · OpenAI · O1 Pro（2025-03-19） | hide machine duplicate; retain HTML |
| web | openai/o1-pro | https://developers.openai.com/api/docs/models/o1-pro | https://developers.openai.com/api/docs/models/o1-pro | 官方文档 · OpenAI · O1 Pro（2025-03-19）（文档） | 官方文档 · OpenAI · O1 Pro（2025-03-19） | rename |
| web | openai/o3 | https://developers.openai.com/api/docs/models/o3.md | https://developers.openai.com/api/docs/models/o3 | 官方文档 · OpenAI · O3（2025-04-16）（Markdown） | 官方文档 · OpenAI · O3（2025-04-16） | hide machine duplicate; retain HTML |
| web | openai/o3 | https://developers.openai.com/api/docs/models/o3 | https://developers.openai.com/api/docs/models/o3 | 官方文档 · OpenAI · O3（2025-04-16）（文档） | 官方文档 · OpenAI · O3（2025-04-16） | rename |
| web | openai/o3-mini | https://developers.openai.com/api/docs/models/o3-mini.md | https://developers.openai.com/api/docs/models/o3-mini | 官方文档 · OpenAI · O3 Mini（2025-01-31）（Markdown） | 官方文档 · OpenAI · O3 Mini（2025-01-31） | hide machine duplicate; retain HTML |
| web | openai/o3-mini | https://developers.openai.com/api/docs/models/o3-mini | https://developers.openai.com/api/docs/models/o3-mini | 官方文档 · OpenAI · O3 Mini（2025-01-31）（文档） | 官方文档 · OpenAI · O3 Mini（2025-01-31） | rename |
| web | openai/o3-pro | https://developers.openai.com/api/docs/models/o3-pro.md | https://developers.openai.com/api/docs/models/o3-pro | 官方文档 · OpenAI · O3 Pro（2025-06-10）（Markdown） | 官方文档 · OpenAI · O3 Pro（2025-06-10） | hide machine duplicate; retain HTML |
| web | openai/o3-pro | https://developers.openai.com/api/docs/models/o3-pro | https://developers.openai.com/api/docs/models/o3-pro | 官方文档 · OpenAI · O3 Pro（2025-06-10）（文档） | 官方文档 · OpenAI · O3 Pro（2025-06-10） | rename |
| web | openai/o4-mini | https://developers.openai.com/api/docs/models/o4-mini.md | https://developers.openai.com/api/docs/models/o4-mini | 官方文档 · OpenAI · O4 Mini（2025-04-16）（Markdown） | 官方文档 · OpenAI · O4 Mini（2025-04-16） | hide machine duplicate; retain HTML |
| web | openai/o4-mini | https://developers.openai.com/api/docs/models/o4-mini | https://developers.openai.com/api/docs/models/o4-mini | 官方文档 · OpenAI · O4 Mini（2025-04-16）（文档） | 官方文档 · OpenAI · O4 Mini（2025-04-16） | rename |
| web | ark/deepseek-v4-1-flash-260910 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | 官方文档 · 火山方舟 · 模型列表 | rename |
| web | ark/deepseek-v4-flash-260425 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | 官方文档 · 火山方舟 · 模型列表 | rename |
| web | ark/deepseek-v4-flash-ga-260731 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | 官方文档 · 火山方舟 · 模型列表 | rename |
| web | ark/deepseek-v4-pro-260425 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | 官方文档 · 火山方舟 · 模型列表 | rename |
| web | ark/deepseek-v4-pro-ga-260813 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | 官方文档 · 火山方舟 · 模型列表 | rename |
| web | ark/doubao-seed-2-1-pro-260628 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | 官方文档 · 火山方舟 · 模型列表 | rename |
| web | ark/doubao-seed-2-1-pro-260915 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | 官方文档 · 火山方舟 · 模型列表 | rename |
| web | ark/doubao-seed-2-1-turbo-260628 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | 官方文档 · 火山方舟 · 模型列表 | rename |
| web | ark/doubao-seed-2-0-code-preview-260215 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档） | 官方文档 · 火山方舟 · 模型列表（产品文档） | rename |
| web | ark/doubao-seed-2-0-code-preview-260215 | https://docs.volcengine.com/docs/82379/1330310?lang=zh | https://docs.volcengine.com/docs/82379/1330310?lang=zh | 官方文档 · 火山方舟 · 文档 1330310（文档 2） | 官方文档 · 火山方舟 · 模型列表（开发者文档，中文版） | rename |
| web | ark/doubao-seed-2-0-lite-260215 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档） | 官方文档 · 火山方舟 · 模型列表（产品文档） | rename |
| web | ark/doubao-seed-2-0-lite-260215 | https://docs.volcengine.com/docs/82379/1330310?lang=zh | https://docs.volcengine.com/docs/82379/1330310?lang=zh | 官方文档 · 火山方舟 · 文档 1330310（文档 2） | 官方文档 · 火山方舟 · 模型列表（开发者文档，中文版） | rename |
| web | ark/doubao-seed-2-0-lite-260428 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | 官方文档 · 火山方舟 · 模型列表 | rename |
| web | ark/doubao-seed-2-0-mini-260215 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档） | 官方文档 · 火山方舟 · 模型列表（产品文档） | rename |
| web | ark/doubao-seed-2-0-mini-260215 | https://docs.volcengine.com/docs/82379/1330310?lang=zh | https://docs.volcengine.com/docs/82379/1330310?lang=zh | 官方文档 · 火山方舟 · 文档 1330310（文档 2） | 官方文档 · 火山方舟 · 模型列表（开发者文档，中文版） | rename |
| web | ark/doubao-seed-2-0-mini-260428 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | 官方文档 · 火山方舟 · 模型列表 | rename |
| web | ark/doubao-seed-2-0-pro-260215 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档） | 官方文档 · 火山方舟 · 模型列表（产品文档） | rename |
| web | ark/doubao-seed-2-0-pro-260215 | https://docs.volcengine.com/docs/82379/1330310?lang=zh | https://docs.volcengine.com/docs/82379/1330310?lang=zh | 官方文档 · 火山方舟 · 文档 1330310（文档 2） | 官方文档 · 火山方舟 · 模型列表（开发者文档，中文版） | rename |
| web | ark/doubao-seed-1-8-251228 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档） | 官方文档 · 火山方舟 · 模型列表（产品文档） | rename |
| web | ark/doubao-seed-1-8-251228 | https://docs.volcengine.com/docs/82379/1330310 | https://docs.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档 2） | 官方文档 · 火山方舟 · 模型列表（开发者文档） | rename |
| web | ark/doubao-seed-1-6-250615 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档） | 官方文档 · 火山方舟 · 模型列表（产品文档） | rename |
| web | ark/doubao-seed-1-6-250615 | https://docs.volcengine.com/docs/82379/1330310 | https://docs.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档 2） | 官方文档 · 火山方舟 · 模型列表（开发者文档） | rename |
| web | ark/doubao-seed-1-6-251015 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档） | 官方文档 · 火山方舟 · 模型列表（产品文档） | rename |
| web | ark/doubao-seed-1-6-251015 | https://docs.volcengine.com/docs/82379/1330310 | https://docs.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档 2） | 官方文档 · 火山方舟 · 模型列表（开发者文档） | rename |
| web | ark/doubao-seed-1-6-flash-250615 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档） | 官方文档 · 火山方舟 · 模型列表（产品文档） | rename |
| web | ark/doubao-seed-1-6-flash-250615 | https://docs.volcengine.com/docs/82379/1330310 | https://docs.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档 2） | 官方文档 · 火山方舟 · 模型列表（开发者文档） | rename |
| web | ark/doubao-seed-1-6-flash-250828 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档） | 官方文档 · 火山方舟 · 模型列表（产品文档） | rename |
| web | ark/doubao-seed-1-6-flash-250828 | https://docs.volcengine.com/docs/82379/1330310 | https://docs.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档 2） | 官方文档 · 火山方舟 · 模型列表（开发者文档） | rename |
| web | ark/doubao-seed-1-6-vision-250815 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档） | 官方文档 · 火山方舟 · 模型列表（产品文档） | rename |
| web | ark/doubao-seed-1-6-vision-250815 | https://docs.volcengine.com/docs/82379/1330310 | https://docs.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档 2） | 官方文档 · 火山方舟 · 模型列表（开发者文档） | rename |
| web | ark/doubao-1-5-lite-32k-250115 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档） | 官方文档 · 火山方舟 · 模型列表（产品文档） | rename |
| web | ark/doubao-1-5-lite-32k-250115 | https://docs.volcengine.com/docs/82379/1330310 | https://docs.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档 2） | 官方文档 · 火山方舟 · 模型列表（开发者文档） | rename |
| web | ark/doubao-1-5-pro-32k-250115 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档） | 官方文档 · 火山方舟 · 模型列表（产品文档） | rename |
| web | ark/doubao-1-5-pro-32k-250115 | https://docs.volcengine.com/docs/82379/1330310 | https://docs.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档 2） | 官方文档 · 火山方舟 · 模型列表（开发者文档） | rename |
| web | ark/doubao-1-5-vision-pro-32k-250115 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档） | 官方文档 · 火山方舟 · 模型列表（产品文档） | rename |
| web | ark/doubao-1-5-vision-pro-32k-250115 | https://docs.volcengine.com/docs/82379/1330310 | https://docs.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档 2） | 官方文档 · 火山方舟 · 模型列表（开发者文档） | rename |
| web | ark/doubao-seedream-5-0-260128 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | 官方文档 · 火山方舟 · 模型列表 | rename |
| web | ark/doubao-seedream-5-0-flash-260915 | https://docs.volcengine.com/docs/ark/image-generation-api?lang=en | https://docs.volcengine.com/docs/ark/image-generation-api?lang=en | 官方文档 · 火山方舟 · Image Generation API（英文） | 官方文档 · 火山方舟 · Image Generation API（开发者文档，英文版） | rename |
| web | ark/doubao-seedream-5-0-flash-260915 | https://docs.volcengine.com/docs/ark/image-generation-api?lang=zh | https://docs.volcengine.com/docs/ark/image-generation-api?lang=zh | 官方文档 · 火山方舟 · Image Generation API（文档） | 官方文档 · 火山方舟 · Image Generation API（开发者文档，中文版） | rename |
| web | ark/doubao-seedream-5-0-pro-260628 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | 官方文档 · 火山方舟 · 模型列表 | rename |
| web | ark/doubao-seedream-4-5-251128 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | 官方文档 · 火山方舟 · 模型列表 | rename |
| web | ark/doubao-seedream-4-0-250828 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | 官方文档 · 火山方舟 · 模型列表 | rename |
| web | ark/glm-5-3-flash-260828 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | 官方文档 · 火山方舟 · 模型列表 | rename |
| web | ark/glm-5-2-260617 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | 官方文档 · 火山方舟 · 模型列表 | rename |
| web | ark/doubao-seed-code-preview-251028 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档） | 官方文档 · 火山方舟 · 模型列表（产品文档） | rename |
| web | ark/doubao-seed-code-preview-251028 | https://docs.volcengine.com/docs/82379/1330310 | https://docs.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档 2） | 官方文档 · 火山方舟 · 模型列表（开发者文档） | rename |
| web | ark/doubao-seed-evolving | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | 官方文档 · 火山方舟 · 模型列表 | rename |
| web | ark/glm-4-7-251222 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档） | 官方文档 · 火山方舟 · 模型列表（产品文档） | rename |
| web | ark/glm-4-7-251222 | https://docs.volcengine.com/docs/82379/1330310 | https://docs.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310（文档 2） | 官方文档 · 火山方舟 · 模型列表（开发者文档） | rename |
| web | ideogram/ideogram-v4 | https://developer.ideogram.ai/v1/api-reference/generate-images/generate-v4 | https://developer.ideogram.ai/v1/api-reference/generate-images/generate-v4 | 官方文档 · Ideogram · Generate V4（文档） | 官方文档 · Ideogram · Generate V4（V1 接口，图像生成） | rename |
| web | ideogram/ideogram-v4 | https://developer.ideogram.ai/api-reference/generate-images/generate-v4 | https://developer.ideogram.ai/api-reference/generate-images/generate-v4 | 官方文档 · Ideogram · Generate V4（文档 2） | 官方文档 · Ideogram · Generate V4（API 参考，图像生成） | rename |
| web | ideogram/ideogram-v4-transparent | https://developer.ideogram.ai/v1/api-reference/generate-images/generate-transparent-v4 | https://developer.ideogram.ai/v1/api-reference/generate-images/generate-transparent-v4 | 官方文档 · Ideogram · Generate Transparent V4（文档） | 官方文档 · Ideogram · Generate Transparent V4（V1 接口，图像生成） | rename |
| web | ideogram/ideogram-v4-transparent | https://developer.ideogram.ai/api-reference/generate-images/generate-transparent-v4 | https://developer.ideogram.ai/api-reference/generate-images/generate-transparent-v4 | 官方文档 · Ideogram · Generate Transparent V4（文档 2） | 官方文档 · Ideogram · Generate Transparent V4（API 参考，图像生成） | rename |
| web | ideogram/ideogram-v3 | https://developer.ideogram.ai/v1/api-reference/generate-images/generate-v3 | https://developer.ideogram.ai/v1/api-reference/generate-images/generate-v3 | 官方文档 · Ideogram · Generate V3（文档） | 官方文档 · Ideogram · Generate V3（V1 接口，图像生成） | rename |
| web | ideogram/ideogram-v3 | https://developer.ideogram.ai/api-reference/generate-images/generate-v3 | https://developer.ideogram.ai/api-reference/generate-images/generate-v3 | 官方文档 · Ideogram · Generate V3（文档 2） | 官方文档 · Ideogram · Generate V3（API 参考，图像生成） | rename |
| web | ideogram/ideogram-v3-transparent | https://developer.ideogram.ai/v1/api-reference/generate-images/generate-transparent-v3 | https://developer.ideogram.ai/v1/api-reference/generate-images/generate-transparent-v3 | 官方文档 · Ideogram · Generate Transparent V3（文档） | 官方文档 · Ideogram · Generate Transparent V3（V1 接口，图像生成） | rename |
| web | ideogram/ideogram-v3-transparent | https://developer.ideogram.ai/api-reference/generate-images/generate-transparent-v3 | https://developer.ideogram.ai/api-reference/generate-images/generate-transparent-v3 | 官方文档 · Ideogram · Generate Transparent V3（文档 2） | 官方文档 · Ideogram · Generate Transparent V3（API 参考，图像生成） | rename |
| web | ideogram/V_2A | https://developer.ideogram.ai/v1/api-reference/legacy-endpoints/generate | https://developer.ideogram.ai/v1/api-reference/legacy-endpoints/generate | 官方文档 · Ideogram · Generate（文档） | 官方文档 · Ideogram · Generate（V1 接口，图像生成） | rename |
| web | ideogram/V_2A | https://developer.ideogram.ai/api-reference/legacy-endpoints/generate | https://developer.ideogram.ai/api-reference/legacy-endpoints/generate | 官方文档 · Ideogram · Generate（文档 2） | 官方文档 · Ideogram · Generate（API 参考，图像生成） | rename |
| web | ideogram/V_2A_TURBO | https://developer.ideogram.ai/v1/api-reference/legacy-endpoints/generate | https://developer.ideogram.ai/v1/api-reference/legacy-endpoints/generate | 官方文档 · Ideogram · Generate（文档） | 官方文档 · Ideogram · Generate（V1 接口，图像生成） | rename |
| web | ideogram/V_2A_TURBO | https://developer.ideogram.ai/api-reference/legacy-endpoints/generate | https://developer.ideogram.ai/api-reference/legacy-endpoints/generate | 官方文档 · Ideogram · Generate（文档 2） | 官方文档 · Ideogram · Generate（API 参考，图像生成） | rename |
| web | ideogram/V_2 | https://developer.ideogram.ai/v1/api-reference/legacy-endpoints/generate | https://developer.ideogram.ai/v1/api-reference/legacy-endpoints/generate | 官方文档 · Ideogram · Generate（文档） | 官方文档 · Ideogram · Generate（V1 接口，图像生成） | rename |
| web | ideogram/V_2 | https://developer.ideogram.ai/api-reference/legacy-endpoints/generate | https://developer.ideogram.ai/api-reference/legacy-endpoints/generate | 官方文档 · Ideogram · Generate（文档 2） | 官方文档 · Ideogram · Generate（API 参考，图像生成） | rename |
| web | ideogram/V_2_TURBO | https://developer.ideogram.ai/v1/api-reference/legacy-endpoints/generate | https://developer.ideogram.ai/v1/api-reference/legacy-endpoints/generate | 官方文档 · Ideogram · Generate（文档） | 官方文档 · Ideogram · Generate（V1 接口，图像生成） | rename |
| web | ideogram/V_2_TURBO | https://developer.ideogram.ai/api-reference/legacy-endpoints/generate | https://developer.ideogram.ai/api-reference/legacy-endpoints/generate | 官方文档 · Ideogram · Generate（文档 2） | 官方文档 · Ideogram · Generate（API 参考，图像生成） | rename |
| web | ideogram/V_1 | https://developer.ideogram.ai/v1/api-reference/legacy-endpoints/generate | https://developer.ideogram.ai/v1/api-reference/legacy-endpoints/generate | 官方文档 · Ideogram · Generate（文档） | 官方文档 · Ideogram · Generate（V1 接口，图像生成） | rename |
| web | ideogram/V_1 | https://developer.ideogram.ai/api-reference/legacy-endpoints/generate | https://developer.ideogram.ai/api-reference/legacy-endpoints/generate | 官方文档 · Ideogram · Generate（文档 2） | 官方文档 · Ideogram · Generate（API 参考，图像生成） | rename |
| web | ideogram/V_1_TURBO | https://developer.ideogram.ai/v1/api-reference/legacy-endpoints/generate | https://developer.ideogram.ai/v1/api-reference/legacy-endpoints/generate | 官方文档 · Ideogram · Generate（文档） | 官方文档 · Ideogram · Generate（V1 接口，图像生成） | rename |
| web | ideogram/V_1_TURBO | https://developer.ideogram.ai/api-reference/legacy-endpoints/generate | https://developer.ideogram.ai/api-reference/legacy-endpoints/generate | 官方文档 · Ideogram · Generate（文档 2） | 官方文档 · Ideogram · Generate（API 参考，图像生成） | rename |
| web | ideogram/AUTO | https://developer.ideogram.ai/v1/api-reference/legacy-endpoints/generate | https://developer.ideogram.ai/v1/api-reference/legacy-endpoints/generate | 官方文档 · Ideogram · Generate（文档） | 官方文档 · Ideogram · Generate（V1 接口，图像生成） | rename |
| web | ideogram/AUTO | https://developer.ideogram.ai/api-reference/legacy-endpoints/generate | https://developer.ideogram.ai/api-reference/legacy-endpoints/generate | 官方文档 · Ideogram · Generate（文档 2） | 官方文档 · Ideogram · Generate（API 参考，图像生成） | rename |
| web | ideogram/ideogram-4-5 | https://developer.ideogram.ai/v2/api-reference/images/generate/ideogram-4-5 | https://developer.ideogram.ai/v2/api-reference/images/generate/ideogram-4-5 | 官方文档 · Ideogram · Ideogram 4.5（文档） | 官方文档 · Ideogram · Ideogram 4.5（V2 接口，图像生成） | rename |
| web | ideogram/ideogram-4-5 | https://developer.ideogram.ai/api-reference/images/generate/ideogram-4-5 | https://developer.ideogram.ai/api-reference/images/generate/ideogram-4-5 | 官方文档 · Ideogram · Ideogram 4.5（文档 2） | 官方文档 · Ideogram · Ideogram 4.5（API 参考，图像生成） | rename |
| web | ideogram/ideogram-4-5 | https://developer.ideogram.ai/api-reference/images/precise-edit/ideogram-4-5 | https://developer.ideogram.ai/api-reference/images/precise-edit/ideogram-4-5 | 官方文档 · Ideogram · Ideogram 4.5（文档 3） | 官方文档 · Ideogram · Ideogram 4.5（API 参考，精确编辑） | rename |
| web | ideogram/ideogram-edit | https://developer.ideogram.ai/v1/api-reference/edit-images/edit-with-prompt | https://developer.ideogram.ai/v1/api-reference/edit-images/edit-with-prompt | 官方文档 · Ideogram · Edit With Prompt（文档） | 官方文档 · Ideogram · Edit With Prompt（V1 接口，图像编辑） | rename |
| web | ideogram/ideogram-edit | https://developer.ideogram.ai/api-reference/edit-images/edit-with-prompt | https://developer.ideogram.ai/api-reference/edit-images/edit-with-prompt | 官方文档 · Ideogram · Edit With Prompt（文档 2） | 官方文档 · Ideogram · Edit With Prompt（API 参考，图像编辑） | rename |
| web | ideogram/p-image-ideogram | https://developer.ideogram.ai/v2/api-reference/images/generate/p-image-ideogram | https://developer.ideogram.ai/v2/api-reference/images/generate/p-image-ideogram | 官方文档 · Ideogram · P Image Ideogram（文档） | 官方文档 · Ideogram · P Image Ideogram（V2 接口，图像生成） | rename |
| web | ideogram/p-image-ideogram | https://developer.ideogram.ai/api-reference/generate-images/generate-p-image-ideogram | https://developer.ideogram.ai/api-reference/generate-images/generate-p-image-ideogram | 官方文档 · Ideogram · P Image Ideogram（文档 2） | 官方文档 · Ideogram · P Image Ideogram（API 参考，图像生成） | rename |
| web | minimax/MiniMax-M3.1-Flash | https://platform.minimax.io/docs/guides/text-generation | https://platform.minimax.io/docs/guides/text-generation | 官方文档 · MiniMax · Text Generation（文档） | 官方文档 · MiniMax · Text Generation（国际站） | rename |
| web | minimax/MiniMax-M3.1-Flash | https://platform.minimax.io/docs/api-reference/text-chat-openai.md | null | 官方文档 · MiniMax · Text Chat OpenAI | null | hide machine document |
| web | minimax/MiniMax-M3.1-Flash | https://platform.minimax.cn/docs/guides/text-generation | https://platform.minimax.cn/docs/guides/text-generation | 官方文档 · MiniMax · Text Generation（文档 2） | 官方文档 · MiniMax · Text Generation（中国站） | rename |
| web | minimax/image-01-live | https://platform.minimax.cn/docs/api-reference/image-generation-t2i | https://platform.minimax.cn/docs/api-reference/image-generation-t2i | 官方文档 · MiniMax · Image Generation T2i（文档） | 官方文档 · MiniMax · Image Generation T2i（中国站） | rename |
| web | minimax/image-01-live | https://platform.minimaxi.com/docs/api-reference/image-generation-t2i | https://platform.minimaxi.com/docs/api-reference/image-generation-t2i | 官方文档 · MiniMax · Image Generation T2i（文档 2） | 官方文档 · MiniMax · Image Generation T2i（开放平台） | rename |
| web | together/openai/gpt-image-2 | https://developers.openai.com/api/docs/models/gpt-image-2.md | https://developers.openai.com/api/docs/models/gpt-image-2 | 原厂规格 · OpenAI · GPT Image 2 | 原厂规格 · OpenAI · GPT Image 2 | hide machine duplicate; retain HTML |
| web | together/openai/gpt-image-2 | https://developers.openai.com/api/docs/models/gpt-image-2 | https://developers.openai.com/api/docs/models/gpt-image-2 | 官方文档 · OpenAI · GPT Image 2 | 原厂规格 · OpenAI · GPT Image 2 | rename |
| web | together/openai/gpt-image-1.5 | https://developers.openai.com/api/docs/models/gpt-image-1.5.md | https://developers.openai.com/api/docs/models/gpt-image-1.5 | 原厂规格 · OpenAI · GPT Image 1.5 | 原厂规格 · OpenAI · GPT Image 1.5 | hide machine duplicate; retain HTML |
| web | together/openai/gpt-image-1.5 | https://developers.openai.com/api/docs/models/gpt-image-1.5 | https://developers.openai.com/api/docs/models/gpt-image-1.5 | 官方文档 · OpenAI · GPT Image 1.5 | 原厂规格 · OpenAI · GPT Image 1.5 | rename |
| web | fireworks/accounts/fireworks/models/glm-5p3 | https://fireworks.ai/models/fireworks/glm-5p3 | https://fireworks.ai/models/fireworks/glm-5p3 | 官方文档 · Fireworks · GLM 5.3（文档） | 官方文档 · Fireworks · GLM 5.3（模型库） | rename |
| web | fireworks/accounts/fireworks/models/glm-5p3-flash | https://fireworks.ai/models/fireworks/glm-5p3-flash | https://fireworks.ai/models/fireworks/glm-5p3-flash | 官方文档 · Fireworks · GLM 5.3 Flash（文档） | 官方文档 · Fireworks · GLM 5.3 Flash（模型库） | rename |
| web | fireworks/accounts/fireworks/models/kimi-k3 | https://fireworks.ai/models/fireworks/kimi-k3 | https://fireworks.ai/models/fireworks/kimi-k3 | 官方文档 · Fireworks · Kimi K3（文档） | 官方文档 · Fireworks · Kimi K3（模型库） | rename |
| web | fireworks/accounts/fireworks/models/kimi-k2p5 | https://fireworks.ai/models/fireworks/kimi-k2p5 | https://fireworks.ai/models/fireworks/kimi-k2p5 | 官方文档 · Fireworks · Kimi K2.5（文档） | 官方文档 · Fireworks · Kimi K2.5（模型库） | rename |
| web | fireworks/accounts/fireworks/models/minimax-m3 | https://fireworks.ai/models/fireworks/minimax-m3 | https://fireworks.ai/models/fireworks/minimax-m3 | 官方文档 · Fireworks · MiniMax M3（文档） | 官方文档 · Fireworks · MiniMax M3（模型库） | rename |
| web | fireworks/accounts/fireworks/models/qwen3p8-max | https://fireworks.ai/models/fireworks/qwen3p8-max | https://fireworks.ai/models/fireworks/qwen3p8-max | 官方文档 · Fireworks · Qwen 3.8 Max（文档） | 官方文档 · Fireworks · Qwen 3.8 Max（模型库） | rename |
| web | fireworks/accounts/fireworks/models/qwen3p7-plus | https://fireworks.ai/models/fireworks/qwen3p7-plus | https://fireworks.ai/models/fireworks/qwen3p7-plus | 官方文档 · Fireworks · Qwen 3.7 Plus（文档） | 官方文档 · Fireworks · Qwen 3.7 Plus（模型库） | rename |
| web | fireworks/accounts/fireworks/models/qwen3-8b | https://fireworks.ai/models/fireworks/qwen3-8b | https://fireworks.ai/models/fireworks/qwen3-8b | 官方文档 · Fireworks · Qwen3 8B（文档） | 官方文档 · Fireworks · Qwen3 8B（模型库） | rename |
| web | fireworks/accounts/fireworks/models/gemma-4-31b-it | https://fireworks.ai/models/fireworks/gemma-4-31b-it | https://fireworks.ai/models/fireworks/gemma-4-31b-it | 官方文档 · Fireworks · Gemma 4-31b It（文档） | 官方文档 · Fireworks · Gemma 4-31b It（模型库） | rename |
| web | fireworks/accounts/fireworks/models/gpt-oss-120b | https://fireworks.ai/models/fireworks/gpt-oss-120b | https://fireworks.ai/models/fireworks/gpt-oss-120b | 官方文档 · Fireworks · GPT-OSS 120B（文档） | 官方文档 · Fireworks · GPT-OSS 120B（模型库） | rename |
| web | fireworks/accounts/fireworks/models/nemotron-3-ultra-nvfp4 | https://fireworks.ai/models/fireworks/nemotron-3-ultra-nvfp4 | https://fireworks.ai/models/fireworks/nemotron-3-ultra-nvfp4 | 官方文档 · Fireworks · Nemotron 3 Ultra Nvfp4（文档） | 官方文档 · Fireworks · Nemotron 3 Ultra Nvfp4（模型库） | rename |
| web | fireworks/accounts/fireworks/models/nemotron-lightning-3p5-30b-a3b | https://fireworks.ai/models/fireworks/nemotron-lightning-3p5-30b-a3b | https://fireworks.ai/models/fireworks/nemotron-lightning-3p5-30b-a3b | 官方文档 · Fireworks · Nemotron Lightning 3p5-30b A3b（文档） | 官方文档 · Fireworks · Nemotron Lightning 3p5-30b A3b（模型库） | rename |
| web | fireworks/accounts/fireworks/models/nvidia-nemotron-3-nano-omni-30b-a3b | https://fireworks.ai/models/fireworks/nvidia-nemotron-3-nano-omni-30b-a3b | https://fireworks.ai/models/fireworks/nvidia-nemotron-3-nano-omni-30b-a3b | 官方文档 · Fireworks · NVIDIA Nemotron 3 Nano Omni 30B A3B（文档） | 官方文档 · Fireworks · NVIDIA Nemotron 3 Nano Omni 30B A3B（模型库） | rename |
| web | fireworks/accounts/fireworks/models/qwen3-omni-30b-a3b-instruct | https://fireworks.ai/models/fireworks/qwen3-omni-30b-a3b-instruct | https://fireworks.ai/models/fireworks/qwen3-omni-30b-a3b-instruct | 官方文档 · Fireworks · Qwen3 Omni 30B A3B Instruct（文档） | 官方文档 · Fireworks · Qwen3 Omni 30B A3B Instruct（模型库） | rename |
| web | fireworks/accounts/fireworks/models/step-3p7-flash-nvfp4 | https://fireworks.ai/models/fireworks/step-3p7-flash-nvfp4 | https://fireworks.ai/models/fireworks/step-3p7-flash-nvfp4 | 官方文档 · Fireworks · Step 3.7 Flash（NVFP4）（文档） | 官方文档 · Fireworks · Step 3.7 Flash（NVFP4）（模型库） | rename |
| web | qianfan/deepseek-v4.1-flash | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） | 官方文档 · 百度千帆 · 千帆 ModelBuilder 旧版入口（平台首页） | rename |
| web | qianfan/deepseek-v4.1-flash | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档 2） | 官方文档 · 百度千帆 · 模型列表 | rename |
| web | qianfan/deepseek-v4-pro-0813 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） | 官方文档 · 百度千帆 · 千帆 ModelBuilder 旧版入口（平台首页） | rename |
| web | qianfan/deepseek-v4-pro-0813 | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档 2） | 官方文档 · 百度千帆 · 模型列表 | rename |
| web | qianfan/deepseek-v4-flash-0731 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） | 官方文档 · 百度千帆 · 千帆 ModelBuilder 旧版入口（平台首页） | rename |
| web | qianfan/deepseek-v4-flash-0731 | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档 2） | 官方文档 · 百度千帆 · 模型列表 | rename |
| web | qianfan/deepseek-v4-flash | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） | 官方文档 · 百度千帆 · 千帆 ModelBuilder 旧版入口（平台首页） | rename |
| web | qianfan/deepseek-v4-flash | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档 2） | 官方文档 · 百度千帆 · 模型列表 | rename |
| web | qianfan/deepseek-v4-pro | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） | 官方文档 · 百度千帆 · 千帆 ModelBuilder 旧版入口（平台首页） | rename |
| web | qianfan/deepseek-v4-pro | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档 2） | 官方文档 · 百度千帆 · 模型列表 | rename |
| web | qianfan/deepseek-v3.2 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） | 官方文档 · 百度千帆 · 千帆 ModelBuilder 旧版入口（平台首页） | rename |
| web | qianfan/deepseek-v3.2 | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档 2） | 官方文档 · 百度千帆 · 模型列表 | rename |
| web | qianfan/deepseek-v3.2-think | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） | 官方文档 · 百度千帆 · 千帆 ModelBuilder 旧版入口（平台首页） | rename |
| web | qianfan/deepseek-v3.2-think | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档 2） | 官方文档 · 百度千帆 · 模型列表 | rename |
| web | qianfan/glm-5.3 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） | 官方文档 · 百度千帆 · 千帆 ModelBuilder 旧版入口（平台首页） | rename |
| web | qianfan/glm-5.3 | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档 2） | 官方文档 · 百度千帆 · 模型列表 | rename |
| web | qianfan/glm-5.3-flash | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） | 官方文档 · 百度千帆 · 千帆 ModelBuilder 旧版入口（平台首页） | rename |
| web | qianfan/glm-5.3-flash | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档 2） | 官方文档 · 百度千帆 · 模型列表 | rename |
| web | qianfan/glm-5.2 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） | 官方文档 · 百度千帆 · 千帆 ModelBuilder 旧版入口（平台首页） | rename |
| web | qianfan/glm-5.2 | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档 2） | 官方文档 · 百度千帆 · 模型列表 | rename |
| web | qianfan/glm-5.1 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） | 官方文档 · 百度千帆 · 千帆 ModelBuilder 旧版入口（平台首页） | rename |
| web | qianfan/glm-5.1 | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档 2） | 官方文档 · 百度千帆 · 模型列表 | rename |
| web | qianfan/glm-5 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） | 官方文档 · 百度千帆 · 千帆 ModelBuilder 旧版入口（平台首页） | rename |
| web | qianfan/glm-5 | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档 2） | 官方文档 · 百度千帆 · 模型列表 | rename |
| web | qianfan/kimi-k2.6 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） | 官方文档 · 百度千帆 · 千帆 ModelBuilder 旧版入口（平台首页） | rename |
| web | qianfan/kimi-k2.6 | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档 2） | 官方文档 · 百度千帆 · 模型列表 | rename |
| web | qianfan/qwen-image | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） | 官方文档 · 百度千帆 · 千帆 ModelBuilder 旧版入口（平台首页） | rename |
| web | qianfan/qwen-image | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档 2） | 官方文档 · 百度千帆 · 模型列表 | rename |
| web | qianfan/qwen-image-edit | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） | 官方文档 · 百度千帆 · 千帆 ModelBuilder 旧版入口（平台首页） | rename |
| web | qianfan/qwen-image-edit | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档 2） | 官方文档 · 百度千帆 · 模型列表 | rename |
| web | qianfan/qwen3.5-122b-a10b | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） | 官方文档 · 百度千帆 · 千帆 ModelBuilder 旧版入口（平台首页） | rename |
| web | qianfan/qwen3.5-122b-a10b | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档 2） | 官方文档 · 百度千帆 · 模型列表 | rename |
| web | qianfan/qwen3.5-27b | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） | 官方文档 · 百度千帆 · 千帆 ModelBuilder 旧版入口（平台首页） | rename |
| web | qianfan/qwen3.5-27b | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档 2） | 官方文档 · 百度千帆 · 模型列表 | rename |
| web | qianfan/qwen3.5-35b-a3b | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） | 官方文档 · 百度千帆 · 千帆 ModelBuilder 旧版入口（平台首页） | rename |
| web | qianfan/qwen3.5-35b-a3b | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档 2） | 官方文档 · 百度千帆 · 模型列表 | rename |
| web | qianfan/qwen3.5-397b-a17b | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） | 官方文档 · 百度千帆 · 千帆 ModelBuilder 旧版入口（平台首页） | rename |
| web | qianfan/qwen3.5-397b-a17b | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档 2） | 官方文档 · 百度千帆 · 模型列表 | rename |
| web | qianfan/deepseek-flash | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） | 官方文档 · 百度千帆 · 千帆 ModelBuilder 旧版入口（平台首页） | rename |
| web | qianfan/deepseek-flash | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档 2） | 官方文档 · 百度千帆 · 模型列表 | rename |
| web | qianfan/deepseek-ocr | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档） | 官方文档 · 百度千帆 · 模型列表 | rename |
| web | qianfan/deepseek-ocr | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档 2） | 官方文档 · 百度千帆 · 千帆 ModelBuilder 旧版入口（平台首页） | rename |
| web | qianfan/ernie-4.5-turbo-128k | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档） | 官方文档 · 百度千帆 · 模型列表 | rename |
| web | qianfan/ernie-4.5-turbo-128k | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档 2） | 官方文档 · 百度千帆 · 千帆 ModelBuilder 旧版入口（平台首页） | rename |
| web | qianfan/ernie-4.5-turbo-20260402 | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档） | 官方文档 · 百度千帆 · 模型列表 | rename |
| web | qianfan/ernie-4.5-turbo-20260402 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档 2） | 官方文档 · 百度千帆 · 千帆 ModelBuilder 旧版入口（平台首页） | rename |
| web | qianfan/ernie-4.5-turbo-32k | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档） | 官方文档 · 百度千帆 · 模型列表 | rename |
| web | qianfan/ernie-4.5-turbo-32k | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档 2） | 官方文档 · 百度千帆 · 千帆 ModelBuilder 旧版入口（平台首页） | rename |
| web | qianfan/ernie-4.5-turbo-vl | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档） | 官方文档 · 百度千帆 · 模型列表 | rename |
| web | qianfan/ernie-4.5-turbo-vl | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档 2） | 官方文档 · 百度千帆 · 千帆 ModelBuilder 旧版入口（平台首页） | rename |
| web | qianfan/ernie-4.5-turbo-vl-32k | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档） | 官方文档 · 百度千帆 · 模型列表 | rename |
| web | qianfan/ernie-4.5-turbo-vl-32k | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档 2） | 官方文档 · 百度千帆 · 千帆 ModelBuilder 旧版入口（平台首页） | rename |
| web | qianfan/ernie-5.0 | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档） | 官方文档 · 百度千帆 · 模型列表 | rename |
| web | qianfan/ernie-5.0 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档 2） | 官方文档 · 百度千帆 · 千帆 ModelBuilder 旧版入口（平台首页） | rename |
| web | qianfan/ernie-5.0-thinking-exp | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档） | 官方文档 · 百度千帆 · 模型列表 | rename |
| web | qianfan/ernie-5.0-thinking-exp | https://cloud.baidu.com/doc/qianfan-docs/s/Jm8r1826a | https://cloud.baidu.com/doc/qianfan-docs/s/Jm8r1826a | 官方文档 · 百度千帆 · 模型列表（文档 2） | 官方文档 · 百度千帆 · AI 应用开发入门：价格 | rename |
| web | qianfan/ernie-5.0-thinking-exp | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档 3） | 官方文档 · 百度千帆 · 千帆 ModelBuilder 旧版入口（平台首页） | rename |
| web | qianfan/ernie-5.0-thinking-latest | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档） | 官方文档 · 百度千帆 · 模型列表 | rename |
| web | qianfan/ernie-5.0-thinking-latest | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档 2） | 官方文档 · 百度千帆 · 千帆 ModelBuilder 旧版入口（平台首页） | rename |
| web | qianfan/ernie-5.0-thinking-preview | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） | 官方文档 · 百度千帆 · 千帆 ModelBuilder 旧版入口（平台首页） | rename |
| web | qianfan/ernie-5.0-thinking-preview | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档 2） | 官方文档 · 百度千帆 · 模型列表 | rename |
| web | qianfan/ernie-5.1 | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档） | 官方文档 · 百度千帆 · 模型列表 | rename |
| web | qianfan/ernie-5.1 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档 2） | 官方文档 · 百度千帆 · 千帆 ModelBuilder 旧版入口（平台首页） | rename |
| web | qianfan/ernie-x1.1 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） | 官方文档 · 百度千帆 · 千帆 ModelBuilder 旧版入口（平台首页） | rename |
| web | qianfan/ernie-x1.1 | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档 2） | 官方文档 · 百度千帆 · 模型列表 | rename |
| web | qianfan/ernie-x1.1-preview | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） | 官方文档 · 百度千帆 · 千帆 ModelBuilder 旧版入口（平台首页） | rename |
| web | qianfan/ernie-x1.1-preview | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档 2） | 官方文档 · 百度千帆 · 模型列表 | rename |
| web | qianfan/internvl3-38b | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档） | 官方文档 · 百度千帆 · 模型列表 | rename |
| web | qianfan/internvl3-38b | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档 2） | 官方文档 · 百度千帆 · 千帆 ModelBuilder 旧版入口（平台首页） | rename |
| web | qianfan/musesteamer-air-image | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档） | 官方文档 · 百度千帆 · 千帆 ModelBuilder 旧版入口（平台首页） | rename |
| web | qianfan/musesteamer-air-image | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档 2） | 官方文档 · 百度千帆 · 模型列表 | rename |
| web | qianfan/qianfan-ocr | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 官方文档 · 百度千帆 · 模型列表（文档） | 官方文档 · 百度千帆 · 模型列表 | rename |
| web | qianfan/qianfan-ocr | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表（文档 2） | 官方文档 · 百度千帆 · 千帆 ModelBuilder 旧版入口（平台首页） | rename |
| web | antling/Ling-3.0-flash-VL | https://developer.ant-ling.com/zh-CN/docs/api-reference/chat/openai/ | https://developer.ant-ling.com/zh-CN/docs/api-reference/chat/openai/ | 官方文档 · 蚂蚁百灵 · OpenAI（文档） | 官方文档 · 蚂蚁百灵 · OpenAI（对话接口兼容指南） | rename |
| web | antling/Ling-3.0-flash-VL | https://developer.ant-ling.com/zh-CN/docs/api-reference/openai/ | https://developer.ant-ling.com/zh-CN/docs/api-reference/openai/ | 官方文档 · 蚂蚁百灵 · OpenAI（文档 2） | 官方文档 · 蚂蚁百灵 · OpenAI（接口兼容指南） | rename |
| web | antling/Ling-3.0-tiny | https://developer.ant-ling.com/zh-CN/docs/api-reference/chat/openai/ | https://developer.ant-ling.com/zh-CN/docs/api-reference/chat/openai/ | 官方文档 · 蚂蚁百灵 · OpenAI（文档） | 官方文档 · 蚂蚁百灵 · OpenAI（对话接口兼容指南） | rename |
| web | antling/Ling-3.0-tiny | https://developer.ant-ling.com/zh-CN/docs/api-reference/openai/ | https://developer.ant-ling.com/zh-CN/docs/api-reference/openai/ | 官方文档 · 蚂蚁百灵 · OpenAI（文档 2） | 官方文档 · 蚂蚁百灵 · OpenAI（接口兼容指南） | rename |
| web | antling/Ling-3.0-flash | https://developer.ant-ling.com/zh-CN/docs/api-reference/chat/openai/ | https://developer.ant-ling.com/zh-CN/docs/api-reference/chat/openai/ | 官方文档 · 蚂蚁百灵 · OpenAI（文档） | 官方文档 · 蚂蚁百灵 · OpenAI（对话接口兼容指南） | rename |
| web | antling/Ling-3.0-flash | https://developer.ant-ling.com/zh-CN/docs/api-reference/openai/ | https://developer.ant-ling.com/zh-CN/docs/api-reference/openai/ | 官方文档 · 蚂蚁百灵 · OpenAI（文档 2） | 官方文档 · 蚂蚁百灵 · OpenAI（接口兼容指南） | rename |
| mini | openai/gpt-6-luna | https://developers.openai.com/api/docs/models/gpt-6-luna.md | https://developers.openai.com/api/docs/models/gpt-6-luna | 官方文档 · OpenAI · GPT-6 Luna | 官方文档 · OpenAI · GPT-6 Luna | replace machine link with HTML |
| mini | openai/gpt-6-sol | https://developers.openai.com/api/docs/models/gpt-6-sol.md | https://developers.openai.com/api/docs/models/gpt-6-sol | 官方文档 · OpenAI · GPT-6 Sol | 官方文档 · OpenAI · GPT-6 Sol | replace machine link with HTML |
| mini | openai/gpt-image-2.5-flare | https://developers.openai.com/api/docs/models/gpt-image-2.5-flare.md | https://developers.openai.com/api/docs/models/gpt-image-2.5-flare | 官方文档 · OpenAI · GPT Image 2.5 Flare（2026-09-08） | 官方文档 · OpenAI · GPT Image 2.5 Flare（2026-09-08） | replace machine link with HTML |
| mini | openai/gpt-image-2.5-sunburst | https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst.md | https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst | 官方文档 · OpenAI · GPT Image 2.5 Sunburst（2026-09-08） | 官方文档 · OpenAI · GPT Image 2.5 Sunburst（2026-09-08） | replace machine link with HTML |
| mini | openai/gpt-6-astra | https://developers.openai.com/api/docs/models/gpt-6-astra.md | https://developers.openai.com/api/docs/models/gpt-6-astra | 官方文档 · OpenAI · GPT-6 Astra | 官方文档 · OpenAI · GPT-6 Astra | replace machine link with HTML |
| mini | openai/gpt-5.6-luna | https://developers.openai.com/api/docs/models/gpt-5.6-luna.md | https://developers.openai.com/api/docs/models/gpt-5.6-luna | 官方文档 · OpenAI · GPT-5.6 Luna | 官方文档 · OpenAI · GPT-5.6 Luna | replace machine link with HTML |
| mini | openai/gpt-5.6-sol | https://developers.openai.com/api/docs/models/gpt-5.6-sol.md | https://developers.openai.com/api/docs/models/gpt-5.6-sol | 官方文档 · OpenAI · GPT-5.6 Sol | 官方文档 · OpenAI · GPT-5.6 Sol | replace machine link with HTML |
| mini | openai/gpt-5.6-terra | https://developers.openai.com/api/docs/models/gpt-5.6-terra.md | https://developers.openai.com/api/docs/models/gpt-5.6-terra | 官方文档 · OpenAI · GPT-5.6 Terra | 官方文档 · OpenAI · GPT-5.6 Terra | replace machine link with HTML |
| mini | openai/gpt-5.5 | https://developers.openai.com/api/docs/models/gpt-5.5.md | https://developers.openai.com/api/docs/models/gpt-5.5 | 官方文档 · OpenAI · GPT-5.5（2026-04-23） | 官方文档 · OpenAI · GPT-5.5（2026-04-23） | replace machine link with HTML |
| mini | openai/gpt-5.5-pro | https://developers.openai.com/api/docs/models/gpt-5.5-pro.md | https://developers.openai.com/api/docs/models/gpt-5.5-pro | 官方文档 · OpenAI · GPT-5.5 Pro（2026-04-23） | 官方文档 · OpenAI · GPT-5.5 Pro（2026-04-23） | replace machine link with HTML |
| mini | openai/gpt-5.4 | https://developers.openai.com/api/docs/models/gpt-5.4.md | https://developers.openai.com/api/docs/models/gpt-5.4 | 官方文档 · OpenAI · GPT-5.4（2026-03-05） | 官方文档 · OpenAI · GPT-5.4（2026-03-05） | replace machine link with HTML |
| mini | openai/gpt-5.4-mini | https://developers.openai.com/api/docs/models/gpt-5.4-mini.md | https://developers.openai.com/api/docs/models/gpt-5.4-mini | 官方文档 · OpenAI · GPT-5.4 Mini（2026-03-17） | 官方文档 · OpenAI · GPT-5.4 Mini（2026-03-17） | replace machine link with HTML |
| mini | openai/gpt-5.4-nano | https://developers.openai.com/api/docs/models/gpt-5.4-nano.md | https://developers.openai.com/api/docs/models/gpt-5.4-nano | 官方文档 · OpenAI · GPT-5.4 Nano（2026-03-17） | 官方文档 · OpenAI · GPT-5.4 Nano（2026-03-17） | replace machine link with HTML |
| mini | openai/gpt-5.4-pro | https://developers.openai.com/api/docs/models/gpt-5.4-pro.md | https://developers.openai.com/api/docs/models/gpt-5.4-pro | 官方文档 · OpenAI · GPT-5.4 Pro（2026-03-05） | 官方文档 · OpenAI · GPT-5.4 Pro（2026-03-05） | replace machine link with HTML |
| mini | openai/gpt-5.3-codex | https://developers.openai.com/api/docs/models/gpt-5.3-codex.md | https://developers.openai.com/api/docs/models/gpt-5.3-codex | 官方文档 · OpenAI · GPT 5.3 Codex | 官方文档 · OpenAI · GPT 5.3 Codex | replace machine link with HTML |
| mini | openai/gpt-5.2 | https://developers.openai.com/api/docs/models/gpt-5.2.md | https://developers.openai.com/api/docs/models/gpt-5.2 | 官方文档 · OpenAI · GPT-5.2（2025-12-11） | 官方文档 · OpenAI · GPT-5.2（2025-12-11） | replace machine link with HTML |
| mini | openai/gpt-5.2-pro | https://developers.openai.com/api/docs/models/gpt-5.2-pro.md | https://developers.openai.com/api/docs/models/gpt-5.2-pro | 官方文档 · OpenAI · GPT 5.2 Pro（2025-12-11） | 官方文档 · OpenAI · GPT 5.2 Pro（2025-12-11） | replace machine link with HTML |
| mini | openai/gpt-5.1 | https://developers.openai.com/api/docs/models/gpt-5.1.md | https://developers.openai.com/api/docs/models/gpt-5.1 | 官方文档 · OpenAI · GPT-5.1（2025-11-13） | 官方文档 · OpenAI · GPT-5.1（2025-11-13） | replace machine link with HTML |
| mini | openai/gpt-5 | https://developers.openai.com/api/docs/models/gpt-5.md | https://developers.openai.com/api/docs/models/gpt-5 | 官方文档 · OpenAI · GPT-5（2025-08-07） | 官方文档 · OpenAI · GPT-5（2025-08-07） | replace machine link with HTML |
| mini | openai/gpt-5-mini | https://developers.openai.com/api/docs/models/gpt-5-mini.md | https://developers.openai.com/api/docs/models/gpt-5-mini | 官方文档 · OpenAI · GPT 5 Mini（2025-08-07） | 官方文档 · OpenAI · GPT 5 Mini（2025-08-07） | replace machine link with HTML |
| mini | openai/gpt-5-nano | https://developers.openai.com/api/docs/models/gpt-5-nano.md | https://developers.openai.com/api/docs/models/gpt-5-nano | 官方文档 · OpenAI · GPT 5 Nano（2025-08-07） | 官方文档 · OpenAI · GPT 5 Nano（2025-08-07） | replace machine link with HTML |
| mini | openai/gpt-5-pro | https://developers.openai.com/api/docs/models/gpt-5-pro.md | https://developers.openai.com/api/docs/models/gpt-5-pro | 官方文档 · OpenAI · GPT 5 Pro（2025-10-06） | 官方文档 · OpenAI · GPT 5 Pro（2025-10-06） | replace machine link with HTML |
| mini | openai/gpt-4.1 | https://developers.openai.com/api/docs/models/gpt-4.1.md | https://developers.openai.com/api/docs/models/gpt-4.1 | 官方文档 · OpenAI · GPT-4.1（2025-04-14） | 官方文档 · OpenAI · GPT-4.1（2025-04-14） | replace machine link with HTML |
| mini | openai/gpt-4.1-mini | https://developers.openai.com/api/docs/models/gpt-4.1-mini.md | https://developers.openai.com/api/docs/models/gpt-4.1-mini | 官方文档 · OpenAI · GPT-4.1 Mini（2025-04-14） | 官方文档 · OpenAI · GPT-4.1 Mini（2025-04-14） | replace machine link with HTML |
| mini | openai/gpt-4.1-nano | https://developers.openai.com/api/docs/models/gpt-4.1-nano.md | https://developers.openai.com/api/docs/models/gpt-4.1-nano | 官方文档 · OpenAI · GPT 4.1 Nano（2025-04-14） | 官方文档 · OpenAI · GPT 4.1 Nano（2025-04-14） | replace machine link with HTML |
| mini | openai/gpt-4o | https://developers.openai.com/api/docs/models/gpt-4o.md | https://developers.openai.com/api/docs/models/gpt-4o | 官方文档 · OpenAI · GPT-4o（2024-08-06） | 官方文档 · OpenAI · GPT-4o（2024-08-06） | replace machine link with HTML |
| mini | openai/gpt-4o-mini | https://developers.openai.com/api/docs/models/gpt-4o-mini.md | https://developers.openai.com/api/docs/models/gpt-4o-mini | 官方文档 · OpenAI · GPT 4o Mini（2024-07-18） | 官方文档 · OpenAI · GPT 4o Mini（2024-07-18） | replace machine link with HTML |
| mini | openai/gpt-4-turbo | https://developers.openai.com/api/docs/models/gpt-4-turbo.md | https://developers.openai.com/api/docs/models/gpt-4-turbo | 官方文档 · OpenAI · GPT 4 Turbo（2024-04-09） | 官方文档 · OpenAI · GPT 4 Turbo（2024-04-09） | replace machine link with HTML |
| mini | openai/gpt-4 | https://developers.openai.com/api/docs/models/gpt-4.md | https://developers.openai.com/api/docs/models/gpt-4 | 官方文档 · OpenAI · GPT-4（0613） | 官方文档 · OpenAI · GPT-4（0613） | replace machine link with HTML |
| mini | openai/gpt-image-2 | https://developers.openai.com/api/docs/models/gpt-image-2.md | https://developers.openai.com/api/docs/models/gpt-image-2 | 官方文档 · OpenAI · GPT Image 2（2026-04-21） | 官方文档 · OpenAI · GPT Image 2（2026-04-21） | replace machine link with HTML |
| mini | openai/gpt-image-1.5 | https://developers.openai.com/api/docs/models/gpt-image-1.5.md | https://developers.openai.com/api/docs/models/gpt-image-1.5 | 官方文档 · OpenAI · GPT Image 1.5（2025-12-16） | 官方文档 · OpenAI · GPT Image 1.5（2025-12-16） | replace machine link with HTML |
| mini | openai/gpt-image-1 | https://developers.openai.com/api/docs/models/gpt-image-1.md | https://developers.openai.com/api/docs/models/gpt-image-1 | 官方文档 · OpenAI · GPT Image 1 | 官方文档 · OpenAI · GPT Image 1 | replace machine link with HTML |
| mini | openai/gpt-image-1-mini | https://developers.openai.com/api/docs/models/gpt-image-1-mini.md | https://developers.openai.com/api/docs/models/gpt-image-1-mini | 官方文档 · OpenAI · GPT Image 1 Mini | 官方文档 · OpenAI · GPT Image 1 Mini | replace machine link with HTML |
| mini | openai/chat-latest | https://developers.openai.com/api/docs/models/chat-latest.md | https://developers.openai.com/api/docs/models/chat-latest | 官方文档 · OpenAI · Chat Latest | 官方文档 · OpenAI · Chat Latest | replace machine link with HTML |
| mini | openai/chatgpt-image-latest | https://developers.openai.com/api/docs/models/chatgpt-image-latest.md | https://developers.openai.com/api/docs/models/chatgpt-image-latest | 官方文档 · OpenAI · ChatGPT Image Latest | 官方文档 · OpenAI · ChatGPT Image Latest | replace machine link with HTML |
| mini | openai/gpt-3.5-turbo | https://developers.openai.com/api/docs/models/gpt-3.5-turbo.md | https://developers.openai.com/api/docs/models/gpt-3.5-turbo | 官方文档 · OpenAI · GPT 3.5 Turbo（0125） | 官方文档 · OpenAI · GPT 3.5 Turbo（0125） | replace machine link with HTML |
| mini | openai/o1 | https://developers.openai.com/api/docs/models/o1.md | https://developers.openai.com/api/docs/models/o1 | 官方文档 · OpenAI · O1（2024-12-17） | 官方文档 · OpenAI · O1（2024-12-17） | replace machine link with HTML |
| mini | openai/o1-pro | https://developers.openai.com/api/docs/models/o1-pro.md | https://developers.openai.com/api/docs/models/o1-pro | 官方文档 · OpenAI · O1 Pro（2025-03-19） | 官方文档 · OpenAI · O1 Pro（2025-03-19） | replace machine link with HTML |
| mini | openai/o3 | https://developers.openai.com/api/docs/models/o3.md | https://developers.openai.com/api/docs/models/o3 | 官方文档 · OpenAI · O3（2025-04-16） | 官方文档 · OpenAI · O3（2025-04-16） | replace machine link with HTML |
| mini | openai/o3-mini | https://developers.openai.com/api/docs/models/o3-mini.md | https://developers.openai.com/api/docs/models/o3-mini | 官方文档 · OpenAI · O3 Mini（2025-01-31） | 官方文档 · OpenAI · O3 Mini（2025-01-31） | replace machine link with HTML |
| mini | openai/o3-pro | https://developers.openai.com/api/docs/models/o3-pro.md | https://developers.openai.com/api/docs/models/o3-pro | 官方文档 · OpenAI · O3 Pro（2025-06-10） | 官方文档 · OpenAI · O3 Pro（2025-06-10） | replace machine link with HTML |
| mini | openai/o4-mini | https://developers.openai.com/api/docs/models/o4-mini.md | https://developers.openai.com/api/docs/models/o4-mini | 官方文档 · OpenAI · O4 Mini（2025-04-16） | 官方文档 · OpenAI · O4 Mini（2025-04-16） | replace machine link with HTML |
| mini | ark/deepseek-v4-1-flash-260910 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | 官方文档 · 火山方舟 · 模型列表 | rename |
| mini | ark/deepseek-v4-flash-260425 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | 官方文档 · 火山方舟 · 模型列表 | rename |
| mini | ark/deepseek-v4-flash-ga-260731 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | 官方文档 · 火山方舟 · 模型列表 | rename |
| mini | ark/deepseek-v4-pro-260425 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | 官方文档 · 火山方舟 · 模型列表 | rename |
| mini | ark/deepseek-v4-pro-ga-260813 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | 官方文档 · 火山方舟 · 模型列表 | rename |
| mini | ark/doubao-seed-2-1-pro-260628 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | 官方文档 · 火山方舟 · 模型列表 | rename |
| mini | ark/doubao-seed-2-1-pro-260915 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | 官方文档 · 火山方舟 · 模型列表 | rename |
| mini | ark/doubao-seed-2-1-turbo-260628 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | 官方文档 · 火山方舟 · 模型列表 | rename |
| mini | ark/doubao-seed-2-0-code-preview-260215 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | 官方文档 · 火山方舟 · 模型列表 | rename |
| mini | ark/doubao-seed-2-0-lite-260215 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | 官方文档 · 火山方舟 · 模型列表 | rename |
| mini | ark/doubao-seed-2-0-lite-260428 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | 官方文档 · 火山方舟 · 模型列表 | rename |
| mini | ark/doubao-seed-2-0-mini-260215 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | 官方文档 · 火山方舟 · 模型列表 | rename |
| mini | ark/doubao-seed-2-0-mini-260428 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | 官方文档 · 火山方舟 · 模型列表 | rename |
| mini | ark/doubao-seed-2-0-pro-260215 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | 官方文档 · 火山方舟 · 模型列表 | rename |
| mini | ark/doubao-seed-1-6-250615 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | 官方文档 · 火山方舟 · 模型列表 | rename |
| mini | ark/doubao-seed-1-6-251015 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | 官方文档 · 火山方舟 · 模型列表 | rename |
| mini | ark/doubao-seed-1-6-flash-250615 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | 官方文档 · 火山方舟 · 模型列表 | rename |
| mini | ark/doubao-seed-1-6-flash-250828 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | 官方文档 · 火山方舟 · 模型列表 | rename |
| mini | ark/doubao-seed-1-6-vision-250815 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | 官方文档 · 火山方舟 · 模型列表 | rename |
| mini | ark/doubao-1-5-lite-32k-250115 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | 官方文档 · 火山方舟 · 模型列表 | rename |
| mini | ark/doubao-1-5-pro-32k-250115 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | 官方文档 · 火山方舟 · 模型列表 | rename |
| mini | ark/doubao-1-5-vision-pro-32k-250115 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | 官方文档 · 火山方舟 · 模型列表 | rename |
| mini | ark/doubao-seedream-4-5-251128 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | 官方文档 · 火山方舟 · 模型列表 | rename |
| mini | ark/doubao-seedream-4-0-250828 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | 官方文档 · 火山方舟 · 模型列表 | rename |
| mini | ark/glm-5-3-flash-260828 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | 官方文档 · 火山方舟 · 模型列表 | rename |
| mini | ark/glm-5-2-260617 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | 官方文档 · 火山方舟 · 模型列表 | rename |
| mini | ark/doubao-seed-evolving | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | 官方文档 · 火山方舟 · 模型列表 | rename |
| mini | ark/glm-4-7-251222 | https://www.volcengine.com/docs/82379/1330310 | https://www.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 文档 1330310 | 官方文档 · 火山方舟 · 模型列表 | rename |
| mini | together/openai/gpt-image-2 | https://developers.openai.com/api/docs/models/gpt-image-2.md | https://developers.openai.com/api/docs/models/gpt-image-2 | 原厂规格 · OpenAI · GPT Image 2 | 原厂规格 · OpenAI · GPT Image 2 | replace machine link with HTML |
| mini | together/openai/gpt-image-1.5 | https://developers.openai.com/api/docs/models/gpt-image-1.5.md | https://developers.openai.com/api/docs/models/gpt-image-1.5 | 原厂规格 · OpenAI · GPT Image 1.5 | 原厂规格 · OpenAI · GPT Image 1.5 | replace machine link with HTML |
| mini | qianfan/deepseek-v3.2-think | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表 | 官方文档 · 百度千帆 · 千帆 ModelBuilder 旧版入口（平台首页） | rename |
| mini | qianfan/ernie-5.0-thinking-preview | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表 | 官方文档 · 百度千帆 · 千帆 ModelBuilder 旧版入口（平台首页） | rename |
| mini | qianfan/ernie-x1.1 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表 | 官方文档 · 百度千帆 · 千帆 ModelBuilder 旧版入口（平台首页） | rename |
| mini | qianfan/ernie-x1.1-preview | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表 | 官方文档 · 百度千帆 · 千帆 ModelBuilder 旧版入口（平台首页） | rename |
| mini | qianfan/musesteamer-air-image | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · 模型列表 | 官方文档 · 百度千帆 · 千帆 ModelBuilder 旧版入口（平台首页） | rename |

The JSON I3 section contains this complete inventory plus every changed tooltip/dialog string. Reproduce both historical preservation and the current scan with `node scripts/report-source-titles-r24.mjs --check`.

## R24 Phase I4

I2/I3 above are immutable historical records. I4 corrects evidence attribution on six cards per client; three unsupported Bailian notice links are removed from public dialogs. Seven existing lifecycle schedules and all execution cutoffs remain unchanged. The single exact TokenDance llms-full.txt URL is a human-readable retirement citation; all other machine-document filters remain active. [Evidence, quotes and decisions](model-card-qwen35plus-evidence-r24.md#real-browser-verification-2026-11-10).

| Client | Cards | Source rows before → after | Changed cards | Title/copy findings |
| --- | ---: | ---: | ---: | ---: |
| web | 1064 | 2450 → 2449 | 6 | 0 |
| mini | 1064 | 1103 → 1102 | 6 | 0 |
| notices | 7 | 7 → 4 | 3 | 0 |

| Client | Card | Before | After |
| --- | --- | --- | --- |
| web | siliconflow/Qwen/Qwen-Image-Edit | [{"url":"https://huggingface.co/Qwen/Qwen-Image-Edit","label":"官方文档 · Hugging Face · Qwen-Image-Edit"},{"url":"https://help.aliyun.com/zh/model-studio/model-depreciation","label":"下线公告 · 百炼 · 模型下线公告"},{"url":"https://www.siliconflow.cn/models","label":"官方文档 · SiliconFlow · 模型列表"}] | [{"url":"https://huggingface.co/Qwen/Qwen-Image-Edit","label":"官方文档 · Hugging Face · Qwen-Image-Edit"},{"url":"https://www.siliconflow.cn/models","label":"官方文档 · SiliconFlow · 模型列表"}] |
| web | bailian/qwen3.5-plus | [{"url":"https://help.aliyun.com/zh/model-studio/model-depreciation","label":"下线公告 · 百炼 · 模型下线公告"},{"url":"https://help.aliyun.com/zh/model-studio/model-pricing","label":"官方文档 · 百炼 · 模型定价"}] | [{"url":"https://help.aliyun.com/zh/model-studio/qwen3-5-plus","label":"官方文档 · 百炼 · Qwen3.5 Plus"},{"url":"https://help.aliyun.com/zh/model-studio/model-pricing","label":"官方文档 · 百炼 · 模型定价"}] |
| web | bailian/qwen3.5-plus-2026-02-15 | [{"url":"https://help.aliyun.com/zh/model-studio/model-depreciation","label":"下线公告 · 百炼 · 模型下线公告"},{"url":"https://help.aliyun.com/zh/model-studio/model-pricing","label":"官方文档 · 百炼 · 模型定价"}] | [{"url":"https://help.aliyun.com/zh/model-studio/qwen3-5-plus","label":"官方文档 · 百炼 · Qwen3.5 Plus"},{"url":"https://help.aliyun.com/zh/model-studio/model-pricing","label":"官方文档 · 百炼 · 模型定价"}] |
| web | bailian/qwen3.5-plus-2026-04-20 | [{"url":"https://help.aliyun.com/zh/model-studio/model-depreciation","label":"下线公告 · 百炼 · 模型下线公告"},{"url":"https://help.aliyun.com/zh/model-studio/model-pricing","label":"官方文档 · 百炼 · 模型定价"}] | [{"url":"https://help.aliyun.com/zh/model-studio/qwen3-5-plus","label":"官方文档 · 百炼 · Qwen3.5 Plus"},{"url":"https://help.aliyun.com/zh/model-studio/model-pricing","label":"官方文档 · 百炼 · 模型定价"}] |
| web | tokendance/qwen3.5-plus | [{"url":"https://tokendance.space/models/qwen3.5-plus","label":"官方文档 · TokenDance · Qwen3.5 Plus"},{"url":"https://help.aliyun.com/zh/model-studio/model-depreciation","label":"下线公告 · 百炼 · 模型下线公告"}] | [{"url":"https://tokendance.space/models/qwen3.5-plus","label":"官方文档 · TokenDance · Qwen3.5 Plus"},{"url":"https://help.aliyun.com/zh/model-studio/qwen3-5-plus","label":"原厂规格 · 百炼 · Qwen3.5 Plus"},{"url":"https://tokendance.space/llms-full.txt","label":"下线公告 · TokenDance · Qwen3.5 Plus 下线（2027-01-19）"}] |
| web | qianfan/qwen-image-edit | [{"url":"https://huggingface.co/Qwen/Qwen-Image-Edit","label":"官方文档 · Hugging Face · Qwen Image Edit"},{"url":"https://help.aliyun.com/zh/model-studio/model-depreciation","label":"下线公告 · 百炼 · 模型下线公告"},{"url":"https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5","label":"官方文档 · 百度千帆 · 千帆 ModelBuilder 旧版入口（平台首页）"},{"url":"https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j","label":"官方文档 · 百度千帆 · 模型列表"}] | [{"url":"https://huggingface.co/Qwen/Qwen-Image-Edit","label":"官方文档 · Hugging Face · Qwen Image Edit"},{"url":"https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5","label":"官方文档 · 百度千帆 · 千帆 ModelBuilder 旧版入口（平台首页）"},{"url":"https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j","label":"官方文档 · 百度千帆 · 模型列表"}] |
| mini | siliconflow/Qwen/Qwen-Image-Edit | [{"url":"https://huggingface.co/Qwen/Qwen-Image-Edit","label":"官方文档 · Hugging Face · Qwen-Image-Edit"},{"url":"https://help.aliyun.com/zh/model-studio/model-depreciation","label":"下线公告 · 百炼 · 模型下线公告"}] | [{"url":"https://huggingface.co/Qwen/Qwen-Image-Edit","label":"官方文档 · Hugging Face · Qwen-Image-Edit"}] |
| mini | bailian/qwen3.5-plus | [{"url":"https://help.aliyun.com/zh/model-studio/model-depreciation","label":"下线公告 · 百炼 · 模型下线公告"}] | [{"url":"https://help.aliyun.com/zh/model-studio/qwen3-5-plus","label":"官方文档 · 百炼 · Qwen3.5 Plus"}] |
| mini | bailian/qwen3.5-plus-2026-02-15 | [{"url":"https://help.aliyun.com/zh/model-studio/model-depreciation","label":"下线公告 · 百炼 · 模型下线公告"}] | [{"url":"https://help.aliyun.com/zh/model-studio/qwen3-5-plus","label":"官方文档 · 百炼 · Qwen3.5 Plus"}] |
| mini | bailian/qwen3.5-plus-2026-04-20 | [{"url":"https://help.aliyun.com/zh/model-studio/model-depreciation","label":"下线公告 · 百炼 · 模型下线公告"}] | [{"url":"https://help.aliyun.com/zh/model-studio/qwen3-5-plus","label":"官方文档 · 百炼 · Qwen3.5 Plus"}] |
| mini | tokendance/qwen3.5-plus | [{"url":"https://tokendance.space/models/qwen3.5-plus","label":"官方文档 · TokenDance · Qwen3.5 Plus"},{"url":"https://help.aliyun.com/zh/model-studio/model-depreciation","label":"下线公告 · 百炼 · 模型下线公告"}] | [{"url":"https://tokendance.space/models/qwen3.5-plus","label":"官方文档 · TokenDance · Qwen3.5 Plus"},{"url":"https://help.aliyun.com/zh/model-studio/qwen3-5-plus","label":"原厂规格 · 百炼 · Qwen3.5 Plus"},{"url":"https://tokendance.space/llms-full.txt","label":"下线公告 · TokenDance · Qwen3.5 Plus 下线（2027-01-19）"}] |
| mini | qianfan/qwen-image-edit | [{"url":"https://huggingface.co/Qwen/Qwen-Image-Edit","label":"官方文档 · Hugging Face · Qwen Image Edit"},{"url":"https://help.aliyun.com/zh/model-studio/model-depreciation","label":"下线公告 · 百炼 · 模型下线公告"}] | [{"url":"https://huggingface.co/Qwen/Qwen-Image-Edit","label":"官方文档 · Hugging Face · Qwen Image Edit"}] |
| notices | bailian/qwen3.5-plus | [{"url":"https://help.aliyun.com/zh/model-studio/model-depreciation","label":"下线公告 · 百炼 · 模型下线公告"}] | [] |
| notices | bailian/qwen3.5-plus-2026-02-15 | [{"url":"https://help.aliyun.com/zh/model-studio/model-depreciation","label":"下线公告 · 百炼 · 模型下线公告"}] | [] |
| notices | bailian/qwen3.5-plus-2026-04-20 | [{"url":"https://help.aliyun.com/zh/model-studio/model-depreciation","label":"下线公告 · 百炼 · 模型下线公告"}] | [] |

## R25 I5

R25 Phase I5 preserves the completed phase reports above. **Six of 20 numeric-document URLs now have captured page titles; 14 remain on the exact unfetchable allow-list.** The new Aliyun retirement notice has its own captured title as well. Plain unauthenticated public GETs only; date **2026-11-10**. Raw body SHA-256, status, final URL, UTC and Asia/Shanghai timestamps, extraction paths and redirect attempts are retained in [capture data](../config/channel-audit/source-titles-r25-i5.json). The empty Volcengine HTML title is resolved from the matching current-route `curDoc.Title`, never from a guessed slug.

Titles remain `角色 · 站点 · 页面`. Site suffixes and the redundant 百炼 product prefix are stripped. `Kimi K3 (Bailian hosted)` becomes `Kimi K3（百炼托管）`; `(Free)` becomes `（免费）`. Other English parentheses were reviewed: model/version or product-mode names (e.g. Nano Banana, FLUX dev/schnell, Grok Imagine Image Quality, Fibo Edit 1.5, Krea 2 Turbo, Z Image Turbo, NVFP4) remain unchanged. Picker names and all 15 deferred image-input decisions stay fixed. Date labels in source dialogs and modality tooltips use `日期：YYYY-MM-DD`. The strict scan now rejects numeric document/page IDs unless the exact URL is documented below, untranslated documentation/hosting qualifiers, and missing date colons.

Three Bailian badges now cite notice 118728, with the matching **2027-01-19** retirement date and exact model IDs from the public page-entry JSON. Mini badges copy their own retirement source, independently of the first specification link. Missing/excluded sources suppress a display badge; execution notices remain unchanged. [Evidence](model-card-qwen35plus-evidence-r24.md#r25-phase-i5).

| Client | Cards | Source rows before → after | Changed cards | Changed title rows | Title/copy findings |
| --- | ---: | ---: | ---: | ---: | ---: |
| web | 1064 | 2449 → 2452 | 20 | 18 | 0 |
| mini | 1064 | 1102 → 1105 | 11 | 8 | 0 |
| notices | 7 | 4 → 7 | 3 | 0 | 0 |

### Captured page titles

| URL | Before → after page title | Extraction | SHA-256 |
| --- | --- | --- | --- |
| https://www.aliyun.com/notice/118344 | 文档 118344 → 部分历史主线模型下线通知 | h1 | `763a39cdd1c68a26d9c5e0e018f6060480fc75e7e0f21d0ce0e50e156975211f` |
| https://www.aliyun.com/notice/118345 | 文档 118345 → 部分历史快照模型下线通知 | h1 | `2fe1ae2b57e2f50252cac9fee434ba9d5a1eac485ddcddb79e3c547e0321f2b7` |
| https://www.aliyun.com/notice/118177 | 文档 118177 → 部分历史主线模型下线通知 | h1 | `60e4d904a71427d5c5cff494934632396853e3e28e9e5c65a20259075a13fd81` |
| https://developer.volcengine.com/articles/7577301460712030258 | 文档 7577301460712030258 → 豆包编程模型发布！AI 程序员双十一大促9.9元到岗 | h1 | `ee0e1b905be85909c10323ea90ce3a790bb88ee2f3d2e04eafa035ff9a89b1dc` |
| https://www.aliyun.com/notice/118728 | 新增来源 → 部分 Qwen3.5 系列旧版本模型下线通知 | h1 | `280ebdede0418fd532c8947ab248ed2d2ac6a9e981d13e8594144c7ebec6036f` |
| https://docs.volcengine.com/docs/82379/1159178?lang=zh | 文档 1159178 → 模型发布公告 | window._ROUTER_DATA.loaderData current route.curDoc.Title | `98a1f64cef736817e57f8c90b405c75c54a553029e4c5744b0c7269c975eeaff` |
| https://docs.volcengine.com/docs/82379/2549861?lang=zh | 文档 2549861 → Seed-Evolving | window._ROUTER_DATA.loaderData current route.curDoc.Title | `cba4fe9a549c25e32155b90fc56a102807e87ad9cb4660cef135f440365de01f` |

### Unfetchable allow-list

These exact URLs keep their ID form. HTTP 200 is not treated as a successfully captured title. No bot challenge was executed.

| URL | HTTP | Reason | SHA-256 |
| --- | ---: | --- | --- |
| https://docs.volcengine.com/docs/82379/1824121?lang=zh | 200 | Empty title and article; embedded RedirectHint leads to a JS-only page with no title, og:title, h1 or document title. | `286d72456f79be17a29c761667a09d16d1eba5014bab6b85c1469b3ae9e20567` |
| https://cloud.tencent.com/document/product/1823/130051 | 200 | HTTP 200 JavaScript bot-check shell (988 bytes); no title, og:title, h1 or embedded page title. No challenge executed or cookies sent. | `cd74a60efa582cb143395b48d8185ac3a3ad27c545defb19fb417d9d902a9134` |
| https://cloud.tencent.com/document/product/1823/130079 | 200 | HTTP 200 JavaScript bot-check shell (988 bytes); no title, og:title, h1 or embedded page title. No challenge executed or cookies sent. | `6fbd2718f7d25b04765482a0efc16e7ad01e3700ee3266c18bad25009ae04330` |
| https://cloud.tencent.com/document/product/1823/130055 | 200 | HTTP 200 JavaScript bot-check shell (988 bytes); no title, og:title, h1 or embedded page title. No challenge executed or cookies sent. | `aab03f03b51d66d0e9bc220138a7e90592c78bb4462d4eed61f601ed11d4cb31` |
| https://cloud.tencent.com/document/product/1823/132248 | 200 | HTTP 200 JavaScript bot-check shell (988 bytes); no title, og:title, h1 or embedded page title. No challenge executed or cookies sent. | `ceeae03b16e711f2ac73101f6698902934bc83aae4efb044dd05529995e935a9` |
| https://cloud.tencent.com/document/product/1823/132061 | 200 | HTTP 200 JavaScript bot-check shell (988 bytes); no title, og:title, h1 or embedded page title. No challenge executed or cookies sent. | `6a1b17036a1e0fd57dc211445e22bdda7ab572a12155f7324f9e33438ca5ffe7` |
| https://cloud.tencent.com/document/product/1823/132252 | 200 | HTTP 200 JavaScript bot-check shell (988 bytes); no title, og:title, h1 or embedded page title. No challenge executed or cookies sent. | `2e68eaef7cffcd589add1c9720d38dda6b8b9243e62bae24e7c58399d70f7d0a` |
| https://cloud.tencent.com/document/product/1823/132232 | 200 | HTTP 200 JavaScript bot-check shell (988 bytes); no title, og:title, h1 or embedded page title. No challenge executed or cookies sent. | `c87e457979a5de40881a0d9e84d3ef71b80923371a01402fe37c93a1603a65d4` |
| https://cloud.tencent.com/document/product/1823/132246 | 200 | HTTP 200 JavaScript bot-check shell (988 bytes); no title, og:title, h1 or embedded page title. No challenge executed or cookies sent. | `5147111aeb5a16878a24e83104c1004c11edd2377cce7adf8aec6b93c0f52406` |
| https://cloud.tencent.com/document/product/1823/136956 | 200 | HTTP 200 JavaScript bot-check shell (988 bytes); no title, og:title, h1 or embedded page title. No challenge executed or cookies sent. | `54216f85d49a962f35d5fe9a665932fb2dee73d0b277082729d891ea50ae8ef7` |
| https://cloud.tencent.com/document/product/1823/135745 | 200 | HTTP 200 JavaScript bot-check shell (988 bytes); no title, og:title, h1 or embedded page title. No challenge executed or cookies sent. | `dc7663eea42d21b4bf292fd3e086a79b7a67c1eaa052cdf31813685338a44b3f` |
| https://cloud.tencent.com/document/product/1823/136609 | 200 | HTTP 200 JavaScript bot-check shell (988 bytes); no title, og:title, h1 or embedded page title. No challenge executed or cookies sent. | `f0735aa7095222c50e55cc16fb865d3292e4ca58f61baef3d52ee039004cce26` |
| https://cloud.tencent.com/document/product/1823/135746 | 200 | HTTP 200 JavaScript bot-check shell (988 bytes); no title, og:title, h1 or embedded page title. No challenge executed or cookies sent. | `1a3c85684ed68fb6067b79315d1a7a05fc783e766efe3fc9846e73afee5c610c` |
| https://cloud.tencent.com/document/product/1823/137203 | 200 | HTTP 200 JavaScript bot-check shell (988 bytes); no title, og:title, h1 or embedded page title. No challenge executed or cookies sent. | `0d366cc2218ff7ec8c8dd98189ce8155ecfb7f65f2e6d996fc572725fc170e78` |

### Complete before → after list

Each changed card is listed below with its full ordered source rows, including retained URLs and newly restored retirement links.

| Client | Card | Before | After |
| --- | --- | --- | --- |
| web | bailian/kimi-k3 | [{"url":"https://help.aliyun.com/zh/model-studio/kimi-k3","label":"官方文档 · 百炼 · Kimi K3 (Bailian hosted)"},{"url":"https://help.aliyun.com/zh/model-studio/newly-released-models","label":"官方文档 · 百炼 · 模型更新"},{"url":"https://huggingface.co/moonshotai/Kimi-K3","label":"官方文档 · Hugging Face · Kimi K3 (Bailian hosted)"}] | [{"url":"https://help.aliyun.com/zh/model-studio/kimi-k3","label":"官方文档 · 百炼 · Kimi K3（百炼托管）"},{"url":"https://help.aliyun.com/zh/model-studio/newly-released-models","label":"官方文档 · 百炼 · 模型更新"},{"url":"https://huggingface.co/moonshotai/Kimi-K3","label":"官方文档 · Hugging Face · Kimi K3（百炼托管）"}] |
| web | bailian/qwen3.5-plus | [{"url":"https://help.aliyun.com/zh/model-studio/qwen3-5-plus","label":"官方文档 · 百炼 · Qwen3.5 Plus"},{"url":"https://help.aliyun.com/zh/model-studio/model-pricing","label":"官方文档 · 百炼 · 模型定价"}] | [{"url":"https://help.aliyun.com/zh/model-studio/qwen3-5-plus","label":"官方文档 · 百炼 · Qwen3.5 Plus"},{"url":"https://www.aliyun.com/notice/118728","label":"下线公告 · 百炼 · 部分 Qwen3.5 系列旧版本模型下线通知"},{"url":"https://help.aliyun.com/zh/model-studio/model-pricing","label":"官方文档 · 百炼 · 模型定价"}] |
| web | bailian/qwen3.5-plus-2026-02-15 | [{"url":"https://help.aliyun.com/zh/model-studio/qwen3-5-plus","label":"官方文档 · 百炼 · Qwen3.5 Plus"},{"url":"https://help.aliyun.com/zh/model-studio/model-pricing","label":"官方文档 · 百炼 · 模型定价"}] | [{"url":"https://help.aliyun.com/zh/model-studio/qwen3-5-plus","label":"官方文档 · 百炼 · Qwen3.5 Plus"},{"url":"https://www.aliyun.com/notice/118728","label":"下线公告 · 百炼 · 部分 Qwen3.5 系列旧版本模型下线通知"},{"url":"https://help.aliyun.com/zh/model-studio/model-pricing","label":"官方文档 · 百炼 · 模型定价"}] |
| web | bailian/qwen3.5-plus-2026-04-20 | [{"url":"https://help.aliyun.com/zh/model-studio/qwen3-5-plus","label":"官方文档 · 百炼 · Qwen3.5 Plus"},{"url":"https://help.aliyun.com/zh/model-studio/model-pricing","label":"官方文档 · 百炼 · 模型定价"}] | [{"url":"https://help.aliyun.com/zh/model-studio/qwen3-5-plus","label":"官方文档 · 百炼 · Qwen3.5 Plus"},{"url":"https://www.aliyun.com/notice/118728","label":"下线公告 · 百炼 · 部分 Qwen3.5 系列旧版本模型下线通知"},{"url":"https://help.aliyun.com/zh/model-studio/model-pricing","label":"官方文档 · 百炼 · 模型定价"}] |
| web | bailian/qwen3-max | [{"url":"https://www.aliyun.com/notice/118344","label":"下线公告 · 百炼 · 文档 118344"},{"url":"https://help.aliyun.com/zh/model-studio/models","label":"官方文档 · 百炼 · 模型列表"}] | [{"url":"https://www.aliyun.com/notice/118344","label":"下线公告 · 百炼 · 部分历史主线模型下线通知"},{"url":"https://help.aliyun.com/zh/model-studio/models","label":"官方文档 · 百炼 · 模型列表"}] |
| web | bailian/qwen3-max-2025-09-23 | [{"url":"https://www.aliyun.com/notice/118345","label":"下线公告 · 百炼 · 文档 118345"},{"url":"https://help.aliyun.com/zh/model-studio/models","label":"官方文档 · 百炼 · 模型列表"}] | [{"url":"https://www.aliyun.com/notice/118345","label":"下线公告 · 百炼 · 部分历史快照模型下线通知"},{"url":"https://help.aliyun.com/zh/model-studio/models","label":"官方文档 · 百炼 · 模型列表"}] |
| web | bailian/qwen3-max-2026-01-23 | [{"url":"https://www.aliyun.com/notice/118345","label":"下线公告 · 百炼 · 文档 118345"},{"url":"https://help.aliyun.com/zh/model-studio/models","label":"官方文档 · 百炼 · 模型列表"}] | [{"url":"https://www.aliyun.com/notice/118345","label":"下线公告 · 百炼 · 部分历史快照模型下线通知"},{"url":"https://help.aliyun.com/zh/model-studio/models","label":"官方文档 · 百炼 · 模型列表"}] |
| web | bailian/qwen3-max-preview | [{"url":"https://www.aliyun.com/notice/118344","label":"下线公告 · 百炼 · 文档 118344"},{"url":"https://help.aliyun.com/zh/model-studio/models","label":"官方文档 · 百炼 · 模型列表"}] | [{"url":"https://www.aliyun.com/notice/118344","label":"下线公告 · 百炼 · 部分历史主线模型下线通知"},{"url":"https://help.aliyun.com/zh/model-studio/models","label":"官方文档 · 百炼 · 模型列表"}] |
| web | bailian/qwen-turbo | [{"url":"https://www.aliyun.com/notice/118177","label":"下线公告 · 百炼 · 文档 118177"},{"url":"https://help.aliyun.com/zh/model-studio/models","label":"官方文档 · 百炼 · 模型列表"}] | [{"url":"https://www.aliyun.com/notice/118177","label":"下线公告 · 百炼 · 部分历史主线模型下线通知"},{"url":"https://help.aliyun.com/zh/model-studio/models","label":"官方文档 · 百炼 · 模型列表"}] |
| web | bailian/qwen3-coder-next | [{"url":"https://www.aliyun.com/notice/118345","label":"下线公告 · 百炼 · 文档 118345"},{"url":"https://help.aliyun.com/zh/model-studio/models","label":"官方文档 · 百炼 · 模型列表"}] | [{"url":"https://www.aliyun.com/notice/118345","label":"下线公告 · 百炼 · 部分历史快照模型下线通知"},{"url":"https://help.aliyun.com/zh/model-studio/models","label":"官方文档 · 百炼 · 模型列表"}] |
| web | ark/deepseek-v4-flash-260425 | [{"url":"https://www.volcengine.com/docs/82379/1330310","label":"官方文档 · 火山方舟 · 模型列表"},{"url":"https://docs.volcengine.com/docs/82379/1159178?lang=zh","label":"官方文档 · 火山方舟 · 文档 1159178"}] | [{"url":"https://www.volcengine.com/docs/82379/1330310","label":"官方文档 · 火山方舟 · 模型列表"},{"url":"https://docs.volcengine.com/docs/82379/1159178?lang=zh","label":"官方文档 · 火山方舟 · 模型发布公告"}] |
| web | ark/deepseek-v4-flash-ga-260731 | [{"url":"https://www.volcengine.com/docs/82379/1330310","label":"官方文档 · 火山方舟 · 模型列表"},{"url":"https://docs.volcengine.com/docs/82379/1159178?lang=zh","label":"官方文档 · 火山方舟 · 文档 1159178"}] | [{"url":"https://www.volcengine.com/docs/82379/1330310","label":"官方文档 · 火山方舟 · 模型列表"},{"url":"https://docs.volcengine.com/docs/82379/1159178?lang=zh","label":"官方文档 · 火山方舟 · 模型发布公告"}] |
| web | ark/deepseek-v4-pro-260425 | [{"url":"https://www.volcengine.com/docs/82379/1330310","label":"官方文档 · 火山方舟 · 模型列表"},{"url":"https://docs.volcengine.com/docs/82379/1159178?lang=zh","label":"官方文档 · 火山方舟 · 文档 1159178"}] | [{"url":"https://www.volcengine.com/docs/82379/1330310","label":"官方文档 · 火山方舟 · 模型列表"},{"url":"https://docs.volcengine.com/docs/82379/1159178?lang=zh","label":"官方文档 · 火山方舟 · 模型发布公告"}] |
| web | ark/deepseek-v4-pro-ga-260813 | [{"url":"https://www.volcengine.com/docs/82379/1330310","label":"官方文档 · 火山方舟 · 模型列表"},{"url":"https://docs.volcengine.com/docs/82379/1159178?lang=zh","label":"官方文档 · 火山方舟 · 文档 1159178"}] | [{"url":"https://www.volcengine.com/docs/82379/1330310","label":"官方文档 · 火山方舟 · 模型列表"},{"url":"https://docs.volcengine.com/docs/82379/1159178?lang=zh","label":"官方文档 · 火山方舟 · 模型发布公告"}] |
| web | ark/doubao-seed-2-1-pro-260628 | [{"url":"https://www.volcengine.com/docs/82379/1330310","label":"官方文档 · 火山方舟 · 模型列表"},{"url":"https://docs.volcengine.com/docs/82379/1159178?lang=zh","label":"官方文档 · 火山方舟 · 文档 1159178"}] | [{"url":"https://www.volcengine.com/docs/82379/1330310","label":"官方文档 · 火山方舟 · 模型列表"},{"url":"https://docs.volcengine.com/docs/82379/1159178?lang=zh","label":"官方文档 · 火山方舟 · 模型发布公告"}] |
| web | ark/doubao-seed-2-1-turbo-260628 | [{"url":"https://www.volcengine.com/docs/82379/1330310","label":"官方文档 · 火山方舟 · 模型列表"},{"url":"https://docs.volcengine.com/docs/82379/1159178?lang=zh","label":"官方文档 · 火山方舟 · 文档 1159178"}] | [{"url":"https://www.volcengine.com/docs/82379/1330310","label":"官方文档 · 火山方舟 · 模型列表"},{"url":"https://docs.volcengine.com/docs/82379/1159178?lang=zh","label":"官方文档 · 火山方舟 · 模型发布公告"}] |
| web | ark/glm-5-2-260617 | [{"url":"https://www.volcengine.com/docs/82379/1330310","label":"官方文档 · 火山方舟 · 模型列表"},{"url":"https://docs.volcengine.com/docs/82379/1159178?lang=zh","label":"官方文档 · 火山方舟 · 文档 1159178"}] | [{"url":"https://www.volcengine.com/docs/82379/1330310","label":"官方文档 · 火山方舟 · 模型列表"},{"url":"https://docs.volcengine.com/docs/82379/1159178?lang=zh","label":"官方文档 · 火山方舟 · 模型发布公告"}] |
| web | ark/doubao-seed-code-preview-251028 | [{"url":"https://docs.volcengine.com/docs/ark/model-release-announcement-2025?lang=en","label":"官方文档 · 火山方舟 · Model Release Announcement 2025"},{"url":"https://developer.volcengine.com/articles/7577301460712030258","label":"官方文档 · 火山方舟 · 文档 7577301460712030258"},{"url":"https://www.volcengine.com/docs/82379/1330310","label":"官方文档 · 火山方舟 · 模型列表（产品文档）"},{"url":"https://docs.volcengine.com/docs/82379/1330310","label":"官方文档 · 火山方舟 · 模型列表（开发者文档）"}] | [{"url":"https://docs.volcengine.com/docs/ark/model-release-announcement-2025?lang=en","label":"官方文档 · 火山方舟 · Model Release Announcement 2025"},{"url":"https://developer.volcengine.com/articles/7577301460712030258","label":"官方文档 · 火山方舟 · 豆包编程模型发布！AI 程序员双十一大促9.9元到岗"},{"url":"https://www.volcengine.com/docs/82379/1330310","label":"官方文档 · 火山方舟 · 模型列表（产品文档）"},{"url":"https://docs.volcengine.com/docs/82379/1330310","label":"官方文档 · 火山方舟 · 模型列表（开发者文档）"}] |
| web | ark/doubao-seed-evolving | [{"url":"https://www.volcengine.com/docs/82379/1330310","label":"官方文档 · 火山方舟 · 模型列表"},{"url":"https://docs.volcengine.com/docs/82379/2549861?lang=zh","label":"官方文档 · 火山方舟 · 文档 2549861"}] | [{"url":"https://www.volcengine.com/docs/82379/1330310","label":"官方文档 · 火山方舟 · 模型列表"},{"url":"https://docs.volcengine.com/docs/82379/2549861?lang=zh","label":"官方文档 · 火山方舟 · Seed-Evolving"}] |
| web | tokendance/dots-3-note-preview | [{"url":"https://tokendance.space/models/dots-3-note-preview","label":"官方文档 · TokenDance · Dots3-Note Preview（Free）"}] | [{"url":"https://tokendance.space/models/dots-3-note-preview","label":"官方文档 · TokenDance · Dots3-Note Preview（免费）"}] |
| mini | bailian/kimi-k3 | [{"url":"https://help.aliyun.com/zh/model-studio/kimi-k3","label":"官方文档 · 百炼 · Kimi K3 (Bailian hosted)"}] | [{"url":"https://help.aliyun.com/zh/model-studio/kimi-k3","label":"官方文档 · 百炼 · Kimi K3（百炼托管）"}] |
| mini | bailian/qwen3.5-plus | [{"url":"https://help.aliyun.com/zh/model-studio/qwen3-5-plus","label":"官方文档 · 百炼 · Qwen3.5 Plus"}] | [{"url":"https://help.aliyun.com/zh/model-studio/qwen3-5-plus","label":"官方文档 · 百炼 · Qwen3.5 Plus"},{"url":"https://www.aliyun.com/notice/118728","label":"下线公告 · 百炼 · 部分 Qwen3.5 系列旧版本模型下线通知"}] |
| mini | bailian/qwen3.5-plus-2026-02-15 | [{"url":"https://help.aliyun.com/zh/model-studio/qwen3-5-plus","label":"官方文档 · 百炼 · Qwen3.5 Plus"}] | [{"url":"https://help.aliyun.com/zh/model-studio/qwen3-5-plus","label":"官方文档 · 百炼 · Qwen3.5 Plus"},{"url":"https://www.aliyun.com/notice/118728","label":"下线公告 · 百炼 · 部分 Qwen3.5 系列旧版本模型下线通知"}] |
| mini | bailian/qwen3.5-plus-2026-04-20 | [{"url":"https://help.aliyun.com/zh/model-studio/qwen3-5-plus","label":"官方文档 · 百炼 · Qwen3.5 Plus"}] | [{"url":"https://help.aliyun.com/zh/model-studio/qwen3-5-plus","label":"官方文档 · 百炼 · Qwen3.5 Plus"},{"url":"https://www.aliyun.com/notice/118728","label":"下线公告 · 百炼 · 部分 Qwen3.5 系列旧版本模型下线通知"}] |
| mini | bailian/qwen3-max | [{"url":"https://www.aliyun.com/notice/118344","label":"下线公告 · 百炼 · 文档 118344"}] | [{"url":"https://www.aliyun.com/notice/118344","label":"下线公告 · 百炼 · 部分历史主线模型下线通知"}] |
| mini | bailian/qwen3-max-2025-09-23 | [{"url":"https://www.aliyun.com/notice/118345","label":"下线公告 · 百炼 · 文档 118345"}] | [{"url":"https://www.aliyun.com/notice/118345","label":"下线公告 · 百炼 · 部分历史快照模型下线通知"}] |
| mini | bailian/qwen3-max-2026-01-23 | [{"url":"https://www.aliyun.com/notice/118345","label":"下线公告 · 百炼 · 文档 118345"}] | [{"url":"https://www.aliyun.com/notice/118345","label":"下线公告 · 百炼 · 部分历史快照模型下线通知"}] |
| mini | bailian/qwen3-max-preview | [{"url":"https://www.aliyun.com/notice/118344","label":"下线公告 · 百炼 · 文档 118344"}] | [{"url":"https://www.aliyun.com/notice/118344","label":"下线公告 · 百炼 · 部分历史主线模型下线通知"}] |
| mini | bailian/qwen-turbo | [{"url":"https://www.aliyun.com/notice/118177","label":"下线公告 · 百炼 · 文档 118177"}] | [{"url":"https://www.aliyun.com/notice/118177","label":"下线公告 · 百炼 · 部分历史主线模型下线通知"}] |
| mini | bailian/qwen3-coder-next | [{"url":"https://www.aliyun.com/notice/118345","label":"下线公告 · 百炼 · 文档 118345"}] | [{"url":"https://www.aliyun.com/notice/118345","label":"下线公告 · 百炼 · 部分历史快照模型下线通知"}] |
| mini | tokendance/dots-3-note-preview | [{"url":"https://tokendance.space/models/dots-3-note-preview","label":"官方文档 · TokenDance · Dots3-Note Preview（Free）"}] | [{"url":"https://tokendance.space/models/dots-3-note-preview","label":"官方文档 · TokenDance · Dots3-Note Preview（免费）"}] |
| notices | bailian/qwen3.5-plus | [] | [{"url":"https://www.aliyun.com/notice/118728","label":"下线公告 · 百炼 · 部分 Qwen3.5 系列旧版本模型下线通知"}] |
| notices | bailian/qwen3.5-plus-2026-02-15 | [] | [{"url":"https://www.aliyun.com/notice/118728","label":"下线公告 · 百炼 · 部分 Qwen3.5 系列旧版本模型下线通知"}] |
| notices | bailian/qwen3.5-plus-2026-04-20 | [] | [{"url":"https://www.aliyun.com/notice/118728","label":"下线公告 · 百炼 · 部分 Qwen3.5 系列旧版本模型下线通知"}] |

## R26 I6

All **1,064 cards per client** and all seven retirement dialogs were scanned. One promotional title (one Web row; absent from Mini source rows) was found. The curated capture override changes `官方文档 · 火山方舟 · 豆包编程模型发布！AI 程序员双十一大促9.9元到岗` to `官方文档 · 火山方舟 · 豆包编程模型发布公告`, preserving the role and site prefixes. The strict scanner now rejects 大促, 元到岗, 限时, 秒杀, 优惠, 爆款, 免费领, 抢, 狂欢, 折, exclamation marks, emoji and prices. Captured original titles remain evidence; generated display titles use the override. The existing 14 unfetchable numeric-page exceptions are unchanged.

Bailian qwen3.5-397b-a17b now cites notice 118728 instead of the generic depreciation page. The other six badges retain verified sources; no allow-list exceptions. See [R26 retirement source audit](model-card-qwen35plus-evidence-r24.md#r26-retirement-source-audit).

**Date rule:** show the card verification date once, as the first line. Known-field dates equal to it are omitted; differing dates appear only inside that field's source line, e.g. `最大输出：源自原厂（核实日期：2026-11-10）`. Unknown fields and unknown modality icons never carry a verification date. The dialog's expanded modality descriptions omit tooltip dates because field provenance is already above; standalone known-icon tooltips retain their own dated evidence. Unknown source attribution remains visible. Both clients use `该渠道页面与图研之前记录的信息不一致，这里只保留已经核实过的内容，没核实的显示为「未知」。` on the same 66 conflict cards. Historical reports and raw captures above remain frozen.

| Client | Cards | Source rows | Changed title rows | Changed dialogs | Findings |
| --- | ---: | ---: | ---: | ---: | ---: |
| web | 1064 | 2452 | 1 | 1007 | 0 |
| mini | 1064 | 1105 | 0 | 1064 | 0 |
| notices | 7 | 7 | 0 | 0 | 0 |

### Captured neutral title override

| URL | Before → after | SHA-256 | Fetch UTC / Asia/Shanghai |
| --- | --- | --- | --- |
| https://developer.volcengine.com/articles/7577301460712030258 | 豆包编程模型发布！AI 程序员双十一大促9.9元到岗 → 豆包编程模型发布公告 | `b1a6ca3c2dc5056d7a273fb73d23b82eba4ab679ca4789fffb4be606e5fc4444` | 2026-11-10T00:27:10.927773+00:00 / 2026-11-10T08:27:10.927773+08:00 |

### Complete source-row changes

| Client | Card | Before | After |
| --- | --- | --- | --- |
| web | bailian/qwen3.5-397b-a17b | [{"url":"https://help.aliyun.com/zh/model-studio/model-depreciation","label":"下线公告 · 百炼 · 模型下线公告"},{"url":"https://huggingface.co/Qwen/Qwen3.5-397B-A17B","label":"官方文档 · Hugging Face · Qwen3.5-397b-a17b"},{"url":"https://help.aliyun.com/zh/model-studio/model-pricing","label":"官方文档 · 百炼 · 模型定价"}] | [{"url":"https://www.aliyun.com/notice/118728","label":"下线公告 · 百炼 · 部分 Qwen3.5 系列旧版本模型下线通知"},{"url":"https://huggingface.co/Qwen/Qwen3.5-397B-A17B","label":"官方文档 · Hugging Face · Qwen3.5-397b-a17b"},{"url":"https://help.aliyun.com/zh/model-studio/model-pricing","label":"官方文档 · 百炼 · 模型定价"}] |
| web | ark/doubao-seed-code-preview-251028 | [{"url":"https://docs.volcengine.com/docs/ark/model-release-announcement-2025?lang=en","label":"官方文档 · 火山方舟 · Model Release Announcement 2025"},{"url":"https://developer.volcengine.com/articles/7577301460712030258","label":"官方文档 · 火山方舟 · 豆包编程模型发布！AI 程序员双十一大促9.9元到岗"},{"url":"https://www.volcengine.com/docs/82379/1330310","label":"官方文档 · 火山方舟 · 模型列表（产品文档）"},{"url":"https://docs.volcengine.com/docs/82379/1330310","label":"官方文档 · 火山方舟 · 模型列表（开发者文档）"}] | [{"url":"https://docs.volcengine.com/docs/ark/model-release-announcement-2025?lang=en","label":"官方文档 · 火山方舟 · Model Release Announcement 2025"},{"url":"https://developer.volcengine.com/articles/7577301460712030258","label":"官方文档 · 火山方舟 · 豆包编程模型发布公告"},{"url":"https://www.volcengine.com/docs/82379/1330310","label":"官方文档 · 火山方舟 · 模型列表（产品文档）"},{"url":"https://docs.volcengine.com/docs/82379/1330310","label":"官方文档 · 火山方舟 · 模型列表（开发者文档）"}] |
| mini | bailian/qwen3.5-397b-a17b | [{"url":"https://help.aliyun.com/zh/model-studio/model-depreciation","label":"下线公告 · 百炼 · 模型下线公告"}] | [{"url":"https://www.aliyun.com/notice/118728","label":"下线公告 · 百炼 · 部分 Qwen3.5 系列旧版本模型下线通知"}] |
| notices | bailian/qwen3.5-397b-a17b | [{"url":"https://help.aliyun.com/zh/model-studio/model-depreciation","label":"下线公告 · 百炼 · 模型下线公告"}] | [{"url":"https://www.aliyun.com/notice/118728","label":"下线公告 · 百炼 · 部分 Qwen3.5 系列旧版本模型下线通知"}] |

## R27 I7

Founder decision A (2026-11-10): exactly 15 cards per client now cite the verified edit/remix interface for image input. All 1,064 cards and seven retirement dialogs pass the existing strict title and copy scans. Unchanged output citations are preserved. The original I2-I6 reports above remain frozen. [Complete presentation diff](model-modality-r27-i7-card-diff.json).

| Client | Cards | Source rows | Changed cards | Findings |
| --- | ---: | ---: | ---: | ---: |
| web | 1064 | 2462 | 15 | 0 |
| mini | 1064 | 1105 | 15 | 0 |
| notices | 7 | 7 | 0 | 0 |

| Client | Card | Before | After |
| --- | --- | --- | --- |
| web | ideogram/ideogram-v4 | [{"url":"https://developer.ideogram.ai/v2/api-reference/images/generate/ideogram-4","label":"官方文档 · Ideogram · Ideogram 4"},{"url":"https://developer.ideogram.ai/v1/api-reference/generate-images/generate-v4","label":"官方文档 · Ideogram · Generate V4（V1 接口，图像生成）"},{"url":"https://developer.ideogram.ai/","label":"官方文档 · Ideogram · 文档首页"},{"url":"https://developer.ideogram.ai/api-reference/generate-images/generate-v4","label":"官方文档 · Ideogram · Generate V4（API 参考，图像生成）"}] | [{"url":"https://developer.ideogram.ai/v1/api-reference/edit-images/remix-v4","label":"官方文档 · Ideogram · Ideogram 4.0 编辑接口"},{"url":"https://developer.ideogram.ai/v2/api-reference/images/generate/ideogram-4","label":"官方文档 · Ideogram · Ideogram 4"},{"url":"https://developer.ideogram.ai/v1/api-reference/generate-images/generate-v4","label":"官方文档 · Ideogram · Generate V4（V1 接口，图像生成）"},{"url":"https://developer.ideogram.ai/","label":"官方文档 · Ideogram · 文档首页"},{"url":"https://developer.ideogram.ai/api-reference/generate-images/generate-v4","label":"官方文档 · Ideogram · Generate V4（API 参考，图像生成）"}] |
| web | fal/bytedance/seedream/v5/flash/text-to-image | [{"url":"https://fal.ai/models/bytedance/seedream/v5/flash/text-to-image/api","label":"官方文档 · fal · Seedream v5 Flash API 文档"},{"url":"https://fal.ai/models/bytedance/seedream/v5/flash/edit/api","label":"官方文档 · fal · Seedream v5 Flash Edit API 文档"}] | [{"url":"https://fal.ai/models/bytedance/seedream/v5/flash/edit/api","label":"官方文档 · fal · Seedream v5 Flash 编辑接口"},{"url":"https://fal.ai/models/bytedance/seedream/v5/flash/text-to-image/api","label":"官方文档 · fal · Seedream v5 Flash API 文档"}] |
| web | fal/bytedance/seedream/v5/pro/text-to-image | [{"url":"https://fal.ai/models/bytedance/seedream/v5/pro/text-to-image/api","label":"官方文档 · fal · Seedream（v5，pro） API 文档"}] | [{"url":"https://fal.ai/models/bytedance/seedream/v5/pro/edit/api","label":"官方文档 · fal · Seedream v5 pro 编辑接口"},{"url":"https://fal.ai/models/bytedance/seedream/v5/pro/text-to-image/api","label":"官方文档 · fal · Seedream（v5，pro） API 文档"}] |
| web | fal/fal-ai/bytedance/seedream/v4.5/text-to-image | [{"url":"https://fal.ai/models/fal-ai/bytedance/seedream/v4.5/text-to-image/api","label":"官方文档 · fal · Seedream（v4.5） API 文档"}] | [{"url":"https://fal.ai/models/fal-ai/bytedance/seedream/v4.5/edit/api","label":"官方文档 · fal · Seedream v4.5 编辑接口"},{"url":"https://fal.ai/models/fal-ai/bytedance/seedream/v4.5/text-to-image/api","label":"官方文档 · fal · Seedream（v4.5） API 文档"}] |
| web | fal/fal-ai/bytedance/seedream/v4/text-to-image | [{"url":"https://fal.ai/models/fal-ai/bytedance/seedream/v4/text-to-image/api","label":"官方文档 · fal · Seedream（v4） API 文档"}] | [{"url":"https://fal.ai/models/fal-ai/bytedance/seedream/v4/edit/api","label":"官方文档 · fal · Seedream v4 编辑接口"},{"url":"https://fal.ai/models/fal-ai/bytedance/seedream/v4/text-to-image/api","label":"官方文档 · fal · Seedream（v4） API 文档"}] |
| web | fal/fal-ai/flux-2-pro | [{"url":"https://fal.ai/models/fal-ai/flux-2-pro/api","label":"官方文档 · fal · FLUX 2 Pro API 文档"}] | [{"url":"https://fal.ai/models/fal-ai/flux-2-pro/edit/api","label":"官方文档 · fal · FLUX 2 Pro 编辑接口"},{"url":"https://fal.ai/models/fal-ai/flux-2-pro/api","label":"官方文档 · fal · FLUX 2 Pro API 文档"}] |
| web | fal/blackforestlabs/flux-3/klein/base/text-to-image | [{"url":"https://fal.ai/models/blackforestlabs/flux-3/klein/base/text-to-image/api","label":"官方文档 · fal · FLUX.3 Klein Base API 文档"},{"url":"https://fal.ai/models/blackforestlabs/flux-3/klein/base/edit-image/api","label":"官方文档 · fal · FLUX.3 Klein Base Edit Image API 文档"}] | [{"url":"https://fal.ai/models/blackforestlabs/flux-3/klein/base/edit-image/api","label":"官方文档 · fal · FLUX.3 Klein Base 编辑接口"},{"url":"https://fal.ai/models/blackforestlabs/flux-3/klein/base/text-to-image/api","label":"官方文档 · fal · FLUX.3 Klein Base API 文档"}] |
| web | fal/blackforestlabs/flux-3/klein/text-to-image | [{"url":"https://fal.ai/models/blackforestlabs/flux-3/klein/text-to-image/api","label":"官方文档 · fal · FLUX.3 Klein API 文档"},{"url":"https://fal.ai/models/blackforestlabs/flux-3/klein/edit-image/api","label":"官方文档 · fal · FLUX.3 Klein Edit Image API 文档"}] | [{"url":"https://fal.ai/models/blackforestlabs/flux-3/klein/edit-image/api","label":"官方文档 · fal · FLUX.3 Klein 编辑接口"},{"url":"https://fal.ai/models/blackforestlabs/flux-3/klein/text-to-image/api","label":"官方文档 · fal · FLUX.3 Klein API 文档"}] |
| web | fal/blackforestlabs/flux-3/text-to-image | [{"url":"https://fal.ai/models/blackforestlabs/flux-3/text-to-image/api","label":"官方文档 · fal · FLUX.3 API 文档"},{"url":"https://fal.ai/models/blackforestlabs/flux-3/edit-image/api","label":"官方文档 · fal · FLUX.3 Edit Image API 文档"}] | [{"url":"https://fal.ai/models/blackforestlabs/flux-3/edit-image/api","label":"官方文档 · fal · FLUX.3 编辑接口"},{"url":"https://fal.ai/models/blackforestlabs/flux-3/text-to-image/api","label":"官方文档 · fal · FLUX.3 API 文档"}] |
| web | fal/openai/gpt-image-2.5/flare/text-to-image | [{"url":"https://fal.ai/models/openai/gpt-image-2.5/flare/text-to-image/api","label":"官方文档 · fal · GPT Image 2.5 Flare API 文档"}] | [{"url":"https://fal.ai/models/openai/gpt-image-2.5/flare/edit/api","label":"官方文档 · fal · GPT Image 2.5 Flare 编辑接口"},{"url":"https://fal.ai/models/openai/gpt-image-2.5/flare/text-to-image/api","label":"官方文档 · fal · GPT Image 2.5 Flare API 文档"}] |
| web | fal/openai/gpt-image-2.5/sunburst/text-to-image | [{"url":"https://fal.ai/models/openai/gpt-image-2.5/sunburst/text-to-image/api","label":"官方文档 · fal · GPT Image 2.5 Sunburst API 文档"}] | [{"url":"https://fal.ai/models/openai/gpt-image-2.5/sunburst/edit/api","label":"官方文档 · fal · GPT Image 2.5 Sunburst 编辑接口"},{"url":"https://fal.ai/models/openai/gpt-image-2.5/sunburst/text-to-image/api","label":"官方文档 · fal · GPT Image 2.5 Sunburst API 文档"}] |
| web | fal/xai/grok-imagine-image | [{"url":"https://fal.ai/models/xai/grok-imagine-image/api","label":"官方文档 · fal · Grok Imagine Image API 文档"}] | [{"url":"https://fal.ai/models/xai/grok-imagine-image/edit/api","label":"官方文档 · fal · Grok Imagine Image 编辑接口"},{"url":"https://fal.ai/models/xai/grok-imagine-image/api","label":"官方文档 · fal · Grok Imagine Image API 文档"}] |
| web | fal/xai/grok-imagine-image/quality/text-to-image | [{"url":"https://fal.ai/models/xai/grok-imagine-image/quality/text-to-image/api","label":"官方文档 · fal · Grok Imagine Image（Quality） API 文档"}] | [{"url":"https://fal.ai/models/xai/grok-imagine-image/quality/edit/api","label":"官方文档 · fal · Grok Imagine Image Quality 编辑接口"},{"url":"https://fal.ai/models/xai/grok-imagine-image/quality/text-to-image/api","label":"官方文档 · fal · Grok Imagine Image（Quality） API 文档"}] |
| web | fal/krea/v3/text-to-image | [{"url":"https://fal.ai/models/krea/v3/text-to-image/api","label":"官方文档 · fal · Krea 3 API 文档"},{"url":"https://fal.ai/models/krea/v3/edit/api","label":"官方文档 · fal · V3 Edit API 文档"}] | [{"url":"https://fal.ai/models/krea/v3/edit/api","label":"官方文档 · fal · Krea 3 编辑接口"},{"url":"https://fal.ai/models/krea/v3/text-to-image/api","label":"官方文档 · fal · Krea 3 API 文档"}] |
| web | fal/meta/muse-image/text-to-image | [{"url":"https://fal.ai/models/meta/muse-image/text-to-image/api","label":"官方文档 · fal · Muse Image API 文档"}] | [{"url":"https://fal.ai/models/meta/muse-image/edit/api","label":"官方文档 · fal · Muse Image 编辑接口"},{"url":"https://fal.ai/models/meta/muse-image/text-to-image/api","label":"官方文档 · fal · Muse Image API 文档"}] |
| mini | ideogram/ideogram-v4 | [{"url":"https://developer.ideogram.ai/v2/api-reference/images/generate/ideogram-4","label":"官方文档 · Ideogram · Ideogram 4"}] | [{"url":"https://developer.ideogram.ai/v1/api-reference/edit-images/remix-v4","label":"官方文档 · Ideogram · Ideogram 4.0 编辑接口"}] |
| mini | fal/bytedance/seedream/v5/flash/text-to-image | [{"url":"https://fal.ai/models/bytedance/seedream/v5/flash/text-to-image/api","label":"官方文档 · fal · Seedream v5 Flash API 文档"}] | [{"url":"https://fal.ai/models/bytedance/seedream/v5/flash/edit/api","label":"官方文档 · fal · Seedream v5 Flash 编辑接口"}] |
| mini | fal/bytedance/seedream/v5/pro/text-to-image | [{"url":"https://fal.ai/models/bytedance/seedream/v5/pro/text-to-image/api","label":"官方文档 · fal · Seedream（v5，pro） API 文档"}] | [{"url":"https://fal.ai/models/bytedance/seedream/v5/pro/edit/api","label":"官方文档 · fal · Seedream v5 pro 编辑接口"}] |
| mini | fal/fal-ai/bytedance/seedream/v4.5/text-to-image | [{"url":"https://fal.ai/models/fal-ai/bytedance/seedream/v4.5/text-to-image/api","label":"官方文档 · fal · Seedream（v4.5） API 文档"}] | [{"url":"https://fal.ai/models/fal-ai/bytedance/seedream/v4.5/edit/api","label":"官方文档 · fal · Seedream v4.5 编辑接口"}] |
| mini | fal/fal-ai/bytedance/seedream/v4/text-to-image | [{"url":"https://fal.ai/models/fal-ai/bytedance/seedream/v4/text-to-image/api","label":"官方文档 · fal · Seedream（v4） API 文档"}] | [{"url":"https://fal.ai/models/fal-ai/bytedance/seedream/v4/edit/api","label":"官方文档 · fal · Seedream v4 编辑接口"}] |
| mini | fal/fal-ai/flux-2-pro | [{"url":"https://fal.ai/models/fal-ai/flux-2-pro/api","label":"官方文档 · fal · FLUX 2 Pro API 文档"}] | [{"url":"https://fal.ai/models/fal-ai/flux-2-pro/edit/api","label":"官方文档 · fal · FLUX 2 Pro 编辑接口"}] |
| mini | fal/blackforestlabs/flux-3/klein/base/text-to-image | [{"url":"https://fal.ai/models/blackforestlabs/flux-3/klein/base/text-to-image/api","label":"官方文档 · fal · FLUX.3 Klein Base API 文档"}] | [{"url":"https://fal.ai/models/blackforestlabs/flux-3/klein/base/edit-image/api","label":"官方文档 · fal · FLUX.3 Klein Base 编辑接口"}] |
| mini | fal/blackforestlabs/flux-3/klein/text-to-image | [{"url":"https://fal.ai/models/blackforestlabs/flux-3/klein/text-to-image/api","label":"官方文档 · fal · FLUX.3 Klein API 文档"}] | [{"url":"https://fal.ai/models/blackforestlabs/flux-3/klein/edit-image/api","label":"官方文档 · fal · FLUX.3 Klein 编辑接口"}] |
| mini | fal/blackforestlabs/flux-3/text-to-image | [{"url":"https://fal.ai/models/blackforestlabs/flux-3/text-to-image/api","label":"官方文档 · fal · FLUX.3 API 文档"}] | [{"url":"https://fal.ai/models/blackforestlabs/flux-3/edit-image/api","label":"官方文档 · fal · FLUX.3 编辑接口"}] |
| mini | fal/openai/gpt-image-2.5/flare/text-to-image | [{"url":"https://fal.ai/models/openai/gpt-image-2.5/flare/text-to-image/api","label":"官方文档 · fal · GPT Image 2.5 Flare API 文档"}] | [{"url":"https://fal.ai/models/openai/gpt-image-2.5/flare/edit/api","label":"官方文档 · fal · GPT Image 2.5 Flare 编辑接口"}] |
| mini | fal/openai/gpt-image-2.5/sunburst/text-to-image | [{"url":"https://fal.ai/models/openai/gpt-image-2.5/sunburst/text-to-image/api","label":"官方文档 · fal · GPT Image 2.5 Sunburst API 文档"}] | [{"url":"https://fal.ai/models/openai/gpt-image-2.5/sunburst/edit/api","label":"官方文档 · fal · GPT Image 2.5 Sunburst 编辑接口"}] |
| mini | fal/xai/grok-imagine-image | [{"url":"https://fal.ai/models/xai/grok-imagine-image/api","label":"官方文档 · fal · Grok Imagine Image API 文档"}] | [{"url":"https://fal.ai/models/xai/grok-imagine-image/edit/api","label":"官方文档 · fal · Grok Imagine Image 编辑接口"}] |
| mini | fal/xai/grok-imagine-image/quality/text-to-image | [{"url":"https://fal.ai/models/xai/grok-imagine-image/quality/text-to-image/api","label":"官方文档 · fal · Grok Imagine Image（Quality） API 文档"}] | [{"url":"https://fal.ai/models/xai/grok-imagine-image/quality/edit/api","label":"官方文档 · fal · Grok Imagine Image Quality 编辑接口"}] |
| mini | fal/krea/v3/text-to-image | [{"url":"https://fal.ai/models/krea/v3/text-to-image/api","label":"官方文档 · fal · Krea 3 API 文档"}] | [{"url":"https://fal.ai/models/krea/v3/edit/api","label":"官方文档 · fal · Krea 3 编辑接口"}] |
| mini | fal/meta/muse-image/text-to-image | [{"url":"https://fal.ai/models/meta/muse-image/text-to-image/api","label":"官方文档 · fal · Muse Image API 文档"}] | [{"url":"https://fal.ai/models/meta/muse-image/edit/api","label":"官方文档 · fal · Muse Image 编辑接口"}] |

## R28 fal sources

All **61 fields across 36 model pages moved** after public unauthenticated GET HTTP 200, exact endpoint identity and every modality value were verified in the corresponding Input/Output schema. **0 kept** the catalog source. Each URL was fetched once; [dated review](../config/channel-audit/review-r28-20261110.json) records status, UTC and Asia/Shanghai time, SHA-256, identity and verbatim schema evidence (visible page text, whitespace normalized, scripts/styles excluded). No execution facts changed.

Web and Mini share sourceTitle and preserve each field source. Tooltips/tap dialogs show the same 渠道资料 · fal · 页面 title; Mini source-copy rows now include secondary field pages. isApiSource still hides https://api.fal.ai/v1/models as a link. If retained in any field/custom fact, its attribution remains plain text 渠道资料 · fal 模型目录; it is never a clickable JSON URL.

| Card | Field | Decision | Visible field source title | URL |
| --- | --- | --- | --- | --- |
| fal/alibaba/qwen-image-3/text-to-image | inputModalities | moved | 渠道资料 · fal · Qwen Image 3 Text To Image API 文档 | https://fal.ai/models/alibaba/qwen-image-3/text-to-image/api |
| fal/alibaba/qwen-image-3/text-to-image | outputModalities | moved | 渠道资料 · fal · Qwen Image 3 Text To Image API 文档 | https://fal.ai/models/alibaba/qwen-image-3/text-to-image/api |
| fal/bytedance/seedream/v5/pro/text-to-image | outputModalities | moved | 渠道资料 · fal · Seedream（v5，pro Text To Image API 文档） | https://fal.ai/models/bytedance/seedream/v5/pro/text-to-image/api |
| fal/fal-ai/bytedance/seedream/v4.5/text-to-image | outputModalities | moved | 渠道资料 · fal · Bytedance Seedream（v4.5 Text To Image API 文档） | https://fal.ai/models/fal-ai/bytedance/seedream/v4.5/text-to-image/api |
| fal/fal-ai/bytedance/seedream/v4/text-to-image | outputModalities | moved | 渠道资料 · fal · Bytedance Seedream V4 Text To Image API 文档 | https://fal.ai/models/fal-ai/bytedance/seedream/v4/text-to-image/api |
| fal/fal-ai/fast-sdxl | inputModalities | moved | 渠道资料 · fal · Fast SDXL API 文档 | https://fal.ai/models/fal-ai/fast-sdxl/api |
| fal/fal-ai/fast-sdxl | outputModalities | moved | 渠道资料 · fal · Fast SDXL API 文档 | https://fal.ai/models/fal-ai/fast-sdxl/api |
| fal/fal-ai/flux-2 | inputModalities | moved | 渠道资料 · fal · FLUX.2 API 文档 | https://fal.ai/models/fal-ai/flux-2/api |
| fal/fal-ai/flux-2 | outputModalities | moved | 渠道资料 · fal · FLUX.2 API 文档 | https://fal.ai/models/fal-ai/flux-2/api |
| fal/fal-ai/flux-2-flex | inputModalities | moved | 渠道资料 · fal · FLUX.2 [flex] API 文档 | https://fal.ai/models/fal-ai/flux-2-flex/api |
| fal/fal-ai/flux-2-flex | outputModalities | moved | 渠道资料 · fal · FLUX.2 [flex] API 文档 | https://fal.ai/models/fal-ai/flux-2-flex/api |
| fal/fal-ai/flux-2-pro | outputModalities | moved | 渠道资料 · fal · FLUX.2 [pro] API 文档 | https://fal.ai/models/fal-ai/flux-2-pro/api |
| fal/fal-ai/flux-2/flash | inputModalities | moved | 渠道资料 · fal · FLUX-2（flash API 文档） | https://fal.ai/models/fal-ai/flux-2/flash/api |
| fal/fal-ai/flux-2/flash | outputModalities | moved | 渠道资料 · fal · FLUX-2（flash API 文档） | https://fal.ai/models/fal-ai/flux-2/flash/api |
| fal/fal-ai/flux-2/klein/9b | inputModalities | moved | 渠道资料 · fal · FLUX.2 [klein] 9B API 文档 | https://fal.ai/models/fal-ai/flux-2/klein/9b/api |
| fal/fal-ai/flux-2/klein/9b | outputModalities | moved | 渠道资料 · fal · FLUX.2 [klein] 9B API 文档 | https://fal.ai/models/fal-ai/flux-2/klein/9b/api |
| fal/fal-ai/flux-2/turbo | inputModalities | moved | 渠道资料 · fal · FLUX-2（turbo API 文档） | https://fal.ai/models/fal-ai/flux-2/turbo/api |
| fal/fal-ai/flux-2/turbo | outputModalities | moved | 渠道资料 · fal · FLUX-2（turbo API 文档） | https://fal.ai/models/fal-ai/flux-2/turbo/api |
| fal/fal-ai/flux-kontext-lora | inputModalities | moved | 渠道资料 · fal · FLUX Kontext LoRA API 文档 | https://fal.ai/models/fal-ai/flux-kontext-lora/api |
| fal/fal-ai/flux-kontext-lora | outputModalities | moved | 渠道资料 · fal · FLUX Kontext LoRA API 文档 | https://fal.ai/models/fal-ai/flux-kontext-lora/api |
| fal/fal-ai/flux-pro/kontext | inputModalities | moved | 渠道资料 · fal · FLUX Pro Kontext API 文档 | https://fal.ai/models/fal-ai/flux-pro/kontext/api |
| fal/fal-ai/flux-pro/kontext | outputModalities | moved | 渠道资料 · fal · FLUX Pro Kontext API 文档 | https://fal.ai/models/fal-ai/flux-pro/kontext/api |
| fal/fal-ai/flux-pro/v1.1 | inputModalities | moved | 渠道资料 · fal · FLUX Pro（V1.1 API 文档） | https://fal.ai/models/fal-ai/flux-pro/v1.1/api |
| fal/fal-ai/flux-pro/v1.1 | outputModalities | moved | 渠道资料 · fal · FLUX Pro（V1.1 API 文档） | https://fal.ai/models/fal-ai/flux-pro/v1.1/api |
| fal/fal-ai/flux-pro/v1.1-ultra | outputModalities | moved | 渠道资料 · fal · FLUX Pro（V1.1 Ultra API 文档） | https://fal.ai/models/fal-ai/flux-pro/v1.1-ultra/api |
| fal/fal-ai/flux-1/schnell | inputModalities | moved | 渠道资料 · fal · FLUX.1 [schnell] API 文档 | https://fal.ai/models/fal-ai/flux-1/schnell/api |
| fal/fal-ai/flux-1/schnell | outputModalities | moved | 渠道资料 · fal · FLUX.1 [schnell] API 文档 | https://fal.ai/models/fal-ai/flux-1/schnell/api |
| fal/fal-ai/flux-lora | inputModalities | moved | 渠道资料 · fal · FLUX LoRA API 文档 | https://fal.ai/models/fal-ai/flux-lora/api |
| fal/fal-ai/flux-lora | outputModalities | moved | 渠道资料 · fal · FLUX LoRA API 文档 | https://fal.ai/models/fal-ai/flux-lora/api |
| fal/fal-ai/flux/dev | inputModalities | moved | 渠道资料 · fal · FLUX Dev API 文档 | https://fal.ai/models/fal-ai/flux/dev/api |
| fal/fal-ai/flux/dev | outputModalities | moved | 渠道资料 · fal · FLUX Dev API 文档 | https://fal.ai/models/fal-ai/flux/dev/api |
| fal/fal-ai/flux/schnell | inputModalities | moved | 渠道资料 · fal · FLUX Schnell API 文档 | https://fal.ai/models/fal-ai/flux/schnell/api |
| fal/fal-ai/flux/schnell | outputModalities | moved | 渠道资料 · fal · FLUX Schnell API 文档 | https://fal.ai/models/fal-ai/flux/schnell/api |
| fal/fal-ai/ideogram/v3 | inputModalities | moved | 渠道资料 · fal · Ideogram V3 API 文档 | https://fal.ai/models/fal-ai/ideogram/v3/api |
| fal/fal-ai/ideogram/v3 | outputModalities | moved | 渠道资料 · fal · Ideogram V3 API 文档 | https://fal.ai/models/fal-ai/ideogram/v3/api |
| fal/fal-ai/qwen-image | inputModalities | moved | 渠道资料 · fal · Qwen Image API 文档 | https://fal.ai/models/fal-ai/qwen-image/api |
| fal/fal-ai/qwen-image | outputModalities | moved | 渠道资料 · fal · Qwen Image API 文档 | https://fal.ai/models/fal-ai/qwen-image/api |
| fal/fal-ai/recraft/v4/pro/text-to-image | inputModalities | moved | 渠道资料 · fal · Recraft V4 Pro Text To Image API 文档 | https://fal.ai/models/fal-ai/recraft/v4/pro/text-to-image/api |
| fal/fal-ai/recraft/v4/pro/text-to-image | outputModalities | moved | 渠道资料 · fal · Recraft V4 Pro Text To Image API 文档 | https://fal.ai/models/fal-ai/recraft/v4/pro/text-to-image/api |
| fal/fal-ai/recraft/v3/text-to-image | inputModalities | moved | 渠道资料 · fal · Recraft V3 Text To Image API 文档 | https://fal.ai/models/fal-ai/recraft/v3/text-to-image/api |
| fal/fal-ai/recraft/v3/text-to-image | outputModalities | moved | 渠道资料 · fal · Recraft V3 Text To Image API 文档 | https://fal.ai/models/fal-ai/recraft/v3/text-to-image/api |
| fal/openai/gpt-image-2.5/flare/text-to-image | outputModalities | moved | 渠道资料 · fal · GPT Image 2.5 Flare Text To Image API 文档 | https://fal.ai/models/openai/gpt-image-2.5/flare/text-to-image/api |
| fal/openai/gpt-image-2.5/sunburst/text-to-image | outputModalities | moved | 渠道资料 · fal · GPT Image 2.5 Sunburst Text To Image API 文档 | https://fal.ai/models/openai/gpt-image-2.5/sunburst/text-to-image/api |
| fal/openai/gpt-image-2 | outputModalities | moved | 渠道资料 · fal · GPT Image 2 API 文档 | https://fal.ai/models/openai/gpt-image-2/api |
| fal/fal-ai/gpt-image-1.5 | inputModalities | moved | 渠道资料 · fal · GPT Image 1.5 API 文档 | https://fal.ai/models/fal-ai/gpt-image-1.5/api |
| fal/fal-ai/gpt-image-1.5 | outputModalities | moved | 渠道资料 · fal · GPT Image 1.5 API 文档 | https://fal.ai/models/fal-ai/gpt-image-1.5/api |
| fal/xai/grok-imagine-image/v2.0/text-to-image | inputModalities | moved | 渠道资料 · fal · Grok Imagine Image（V2.0 Text To Image API 文档） | https://fal.ai/models/xai/grok-imagine-image/v2.0/text-to-image/api |
| fal/xai/grok-imagine-image/v2.0/text-to-image | outputModalities | moved | 渠道资料 · fal · Grok Imagine Image（V2.0 Text To Image API 文档） | https://fal.ai/models/xai/grok-imagine-image/v2.0/text-to-image/api |
| fal/xai/grok-imagine-image | outputModalities | moved | 渠道资料 · fal · Grok Imagine Image API 文档 | https://fal.ai/models/xai/grok-imagine-image/api |
| fal/xai/grok-imagine-image/quality/text-to-image | outputModalities | moved | 渠道资料 · fal · Grok Imagine Image Quality Text To Image API 文档 | https://fal.ai/models/xai/grok-imagine-image/quality/text-to-image/api |
| fal/bria/fibo-edit-1.5/edit | inputModalities | moved | 渠道资料 · fal · Fibo Edit 1.5（Edit API 文档） | https://fal.ai/models/bria/fibo-edit-1.5/edit/api |
| fal/bria/fibo-edit-1.5/edit | outputModalities | moved | 渠道资料 · fal · Fibo Edit 1.5（Edit API 文档） | https://fal.ai/models/bria/fibo-edit-1.5/edit/api |
| fal/bria/fibo-gen-1.5/text-to-image | inputModalities | moved | 渠道资料 · fal · Fibo Gen 1.5 Text To Image API 文档 | https://fal.ai/models/bria/fibo-gen-1.5/text-to-image/api |
| fal/bria/fibo-gen-1.5/text-to-image | outputModalities | moved | 渠道资料 · fal · Fibo Gen 1.5 Text To Image API 文档 | https://fal.ai/models/bria/fibo-gen-1.5/text-to-image/api |
| fal/fal-ai/krea-2/turbo | inputModalities | moved | 渠道资料 · fal · Krea 2（Turbo API 文档） | https://fal.ai/models/fal-ai/krea-2/turbo/api |
| fal/fal-ai/krea-2/turbo | outputModalities | moved | 渠道资料 · fal · Krea 2（Turbo API 文档） | https://fal.ai/models/fal-ai/krea-2/turbo/api |
| fal/fal-ai/z-image/turbo | inputModalities | moved | 渠道资料 · fal · Z Image Turbo API 文档 | https://fal.ai/models/fal-ai/z-image/turbo/api |
| fal/fal-ai/z-image/turbo | outputModalities | moved | 渠道资料 · fal · Z Image Turbo API 文档 | https://fal.ai/models/fal-ai/z-image/turbo/api |
| fal/krea/v2/large/text-to-image | inputModalities | moved | 渠道资料 · fal · V2 Large Text To Image API 文档 | https://fal.ai/models/krea/v2/large/text-to-image/api |
| fal/krea/v2/large/text-to-image | outputModalities | moved | 渠道资料 · fal · V2 Large Text To Image API 文档 | https://fal.ai/models/krea/v2/large/text-to-image/api |
| fal/meta/muse-image/text-to-image | outputModalities | moved | 渠道资料 · fal · Muse Image Text To Image API 文档 | https://fal.ai/models/meta/muse-image/text-to-image/api |

## R29 title unification

Existing sourceIdentity: strip fragment and trailing slash, remove utm_*/ref/referrer/fbclid/gclid/msclkid, sort remaining query keys; preserve semantic queries. Existing humanSourceUrl aliases OpenAI and Ideogram .md to HTML. Navigation/evidence URLs unchanged.

One role · site · page per normalized URL. URL-wide readable title outranks card spelling and list position. Non-fal: frozen unscoped title, meaningful namespace/region/language qualifier when needed, then sorted strict readable candidates; omit card-specific dates/aliases. Numeric release codes stay in the model subject. Hidden Runware schema JSON attribution uses the parent model plus API 规格.

Fal is always 渠道资料. API title uses the longest matching catalog endpoint name, normalizing slug separators/case without changing picker names, plus remaining endpoint segments and API 文档. If no catalog identity matches, retain the existing unscoped subject. Example: 渠道资料 · fal · FLUX 2 Pro API 文档; edit: 渠道资料 · fal · FLUX 2 Pro Edit API 文档.

Vendor documentation and vendor repositories: 官方文档. Fal, TokenDance, Replicate, Fireworks, Novita, Runware, SiliconFlow, OpenRouter, Together and Tencent MaaS: 渠道资料. Alibaba/Baidu/Volcengine/Tencent hosted pages: 渠道资料 except paths naming their own Qwen/QVQ/Wan/Tongyi, ERNIE, Doubao/Seedream/Seedance or Hunyuan family: 官方文档. Retirement notices keep 下线公告. Field provenance is separate; catalog/product explanations precede the canonical title with a colon.

Count each Web footer link, dialog link, distinct title per input/output dialog field, each titled icon tooltip, and retirement dialog. Mini counts every footer/source-copy button and its dialog, distinct field title, each titled icon tooltip and retirement source. Accessibility mirrors the tooltip and is checked but not counted again. Verification dates and provenance explanations are not part of the title.

Across **1064 cards per client**, **1088 URLs** and **18469 occurrences**: URLs with multiple titles **353 → 0**; **1012 distinct title strings** (1256 URL/title pairs), **993 URLs**, and **16388 card-surface occurrences changed** (Web 9964, Mini 6424). **65 fal API pages changed**, covering 570 occurrences. Every shared URL has identical Web/Mini titles.

Before/after strings below exclude verification dates and separate provenance. Counts and exact title-only presentation patches are checked offline; prior report sections remain historical.

| URL | Before titles | After title | Changed occurrences |
| --- | --- | --- | ---: |
| https://api-docs.deepseek.com/quick_start/pricing | 原厂规格 · DeepSeek · 价格与规格<br>原厂资料 · DeepSeek · 价格与规格<br>官方文档 · DeepSeek · 价格与规格<br>渠道资料 · DeepSeek · 价格与规格 | 官方文档 · DeepSeek · 价格与规格 | 291 |
| https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro-0813 | 图研既有核实 · Hugging Face · DeepSeek-V4-Pro 0813<br>官方文档 · Hugging Face · DeepSeek-V4-Pro 0813<br>官方文档 · Hugging Face · DeepSeek-V4-Pro 0813 正式版<br>官方文档 · Hugging Face · DeepSeek-V4-Pro-0813 | 官方文档 · Hugging Face · DeepSeek-V4-Pro 0813 | 136 |
| https://huggingface.co/moonshotai/Kimi-K3 | 图研既有核实 · Hugging Face · Kimi K3<br>官方文档 · Hugging Face · Kimi K3<br>官方文档 · Hugging Face · Kimi K3（百炼托管） | 官方文档 · Hugging Face · Kimi K3 | 79 |
| https://platform.kimi.com/docs/models | 图研既有核实 · Kimi · 模型列表<br>官方文档 · Kimi · 模型列表<br>官方文档 · Kimi · 模型列表（开放平台） | 官方文档 · Kimi · 模型列表（开放平台） | 25 |
| https://huggingface.co/moonshotai/Kimi-K2.7-Code | 图研既有核实 · Hugging Face · Kimi K2.7 Code<br>官方文档 · Hugging Face · Kimi K2.7 Code<br>官方文档 · Hugging Face · Kimi-K2.7-Code | 官方文档 · Hugging Face · Kimi K2.7 Code | 64 |
| https://www.kimi.com/code/docs/en/kimi-code/models | 图研既有核实 · Kimi · 模型列表<br>官方文档 · Kimi · 模型列表<br>官方文档 · Kimi · 模型列表（Kimi Code，英文版） | 官方文档 · Kimi · 模型列表（Kimi Code，英文版） | 58 |
| https://huggingface.co/moonshotai/Kimi-K2.6 | 图研既有核实 · Hugging Face · Kimi K2.6<br>官方文档 · Hugging Face · Kimi K2.6<br>官方文档 · Hugging Face · Kimi-K2.6<br>官方文档 · Hugging Face · Kimi-k2.6 | 官方文档 · Hugging Face · Kimi K2.6 | 86 |
| https://docs.bigmodel.cn/cn/guide/models/text/glm-5.3 | 图研既有核实 · 智谱 · GLM 5.3<br>官方文档 · 智谱 · GLM 5.3<br>官方文档 · 智谱 · GLM-5.3 | 官方文档 · 智谱 · GLM 5.3 | 120 |
| https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5.3-flash | 图研既有核实 · 智谱 · GLM 5.3 Flash<br>官方文档 · 智谱 · GLM 5.3 Flash<br>官方文档 · 智谱 · GLM-5.3 Flash<br>官方文档 · 智谱 · GLM-5.3-Flash | 官方文档 · 智谱 · GLM 5.3 Flash | 190 |
| https://docs.bigmodel.cn/cn/guide/models/text/glm-5.2 | 图研既有核实 · 智谱 · GLM 5.2<br>官方文档 · 智谱 · GLM 5.2<br>官方文档 · 智谱 · GLM-5.2 | 官方文档 · 智谱 · GLM 5.2 | 141 |
| https://docs.bigmodel.cn/cn/guide/models/text/glm-5.1 | 图研既有核实 · 智谱 · GLM 5.1<br>官方文档 · 智谱 · GLM-5.1<br>官方文档 · 智谱 · GLM-5.1（2026-10-08下线） | 官方文档 · 智谱 · GLM 5.1 | 98 |
| https://docs.bigmodel.cn/cn/guide/models/text/glm-5 | 图研既有核实 · 智谱 · GLM 5<br>官方文档 · 智谱 · GLM-5<br>官方文档 · 智谱 · GLM-5（2026-10-08下线） | 官方文档 · 智谱 · GLM 5 | 120 |
| https://docs.bigmodel.cn/cn/guide/models/text/glm-5-turbo | 图研既有核实 · 智谱 · GLM 5 Turbo<br>官方文档 · 智谱 · GLM 5 Turbo<br>官方文档 · 智谱 · GLM-5-Turbo（2026-10-08下线） | 官方文档 · 智谱 · GLM 5 Turbo | 44 |
| https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5v-turbo | 图研既有核实 · 智谱 · GLM 5V Turbo<br>官方文档 · 智谱 · GLM 5V Turbo<br>官方文档 · 智谱 · GLM-5V-Turbo（2026-10-30下线） | 官方文档 · 智谱 · GLM 5V Turbo | 44 |
| https://docs.bigmodel.cn/cn/guide/models/text/glm-4.7 | 图研既有核实 · 智谱 · GLM 4.7<br>官方文档 · 智谱 · GLM 4.7<br>官方文档 · 智谱 · GLM-4.7 | 官方文档 · 智谱 · GLM 4.7 | 44 |
| https://docs.bigmodel.cn/cn/guide/models/free/glm-4.7-flash | 图研既有核实 · 智谱 · GLM 4.7 Flash<br>官方文档 · 智谱 · GLM 4.7 Flash | 官方文档 · 智谱 · GLM 4.7 Flash | 20 |
| https://docs.bigmodel.cn/cn/guide/models/text/glm-4.6 | 图研既有核实 · 智谱 · GLM-4.6<br>官方文档 · 智谱 · GLM-4.6 | 官方文档 · 智谱 · GLM-4.6 | 20 |
| https://docs.bigmodel.cn/cn/guide/models/vlm/glm-4.6v | 图研既有核实 · 智谱 · GLM 4.6v<br>官方文档 · 智谱 · GLM 4.6v<br>官方文档 · 智谱 · GLM-4.6v | 官方文档 · 智谱 · GLM 4.6v | 44 |
| https://docs.bigmodel.cn/cn/guide/models/free/glm-4.6v-flash | 图研既有核实 · 智谱 · GLM 4.6v Flash<br>官方文档 · 智谱 · GLM 4.6v Flash | 官方文档 · 智谱 · GLM 4.6v Flash | 21 |
| https://docs.bigmodel.cn/cn/guide/models/text/glm-4.5 | 图研既有核实 · 智谱 · GLM 4.5<br>官方文档 · 智谱 · GLM 4.5 | 官方文档 · 智谱 · GLM 4.5 | 60 |
| https://docs.bigmodel.cn/cn/guide/models/free/glm-4.5-flash | 图研既有核实 · 智谱 · GLM 4.5 Flash<br>官方文档 · 智谱 · GLM 4.5 Flash | 官方文档 · 智谱 · GLM 4.5 Flash | 20 |
| https://docs.bigmodel.cn/cn/guide/models/free/glm-4.1v-thinking-flash | 图研既有核实 · 智谱 · GLM 4.1v Thinking Flash<br>官方文档 · 智谱 · GLM 4.1v Thinking Flash | 官方文档 · 智谱 · GLM 4.1v Thinking Flash | 21 |
| https://docs.bigmodel.cn/cn/guide/models/vlm/glm-4.1v-thinking | 图研既有核实 · 智谱 · GLM 4.1v Thinking<br>官方文档 · 智谱 · GLM 4.1v Thinking | 官方文档 · 智谱 · GLM 4.1v Thinking | 20 |
| https://docs.bigmodel.cn/cn/guide/models/text/glm-4 | 图研既有核实 · 智谱 · GLM 4<br>官方文档 · 智谱 · GLM 4 | 官方文档 · 智谱 · GLM 4 | 40 |
| https://docs.bigmodel.cn/cn/guide/models/text/glm-4-long | 图研既有核实 · 智谱 · GLM 4 Long<br>官方文档 · 智谱 · GLM 4 Long | 官方文档 · 智谱 · GLM 4 Long | 20 |
| https://docs.bigmodel.cn/cn/guide/models/free/glm-4v-flash | 图研既有核实 · 智谱 · GLM 4v Flash<br>官方文档 · 智谱 · GLM 4v Flash | 官方文档 · 智谱 · GLM 4v Flash | 20 |
| https://docs.bigmodel.cn/cn/guide/models/free/cogview-3-flash | 图研既有核实 · 智谱 · CogView 3 Flash<br>官方文档 · 智谱 · CogView 3 Flash | 官方文档 · 智谱 · CogView 3 Flash | 20 |
| https://docs.bigmodel.cn/cn/guide/models/image-generation/cogview-4 | 图研既有核实 · 智谱 · CogView 4<br>官方文档 · 智谱 · CogView 4 | 官方文档 · 智谱 · CogView 4 | 40 |
| https://docs.bigmodel.cn/cn/guide/models/image-generation/glm-image | 图研既有核实 · 智谱 · GLM Image<br>官方文档 · 智谱 · GLM Image | 官方文档 · 智谱 · GLM Image | 20 |
| https://huggingface.co/XingChen-AGI/Xing4.0-29B-A4B | 图研既有核实 · Hugging Face · Xing4.0-29B A4B<br>官方文档 · Hugging Face · Xing4.0 29B A4B<br>官方文档 · Hugging Face · Xing4.0-29B A4B | 官方文档 · Hugging Face · Xing4.0-29B A4B | 22 |
| https://www.siliconflow.cn/models | 图研既有核实 · SiliconFlow · 模型列表<br>官方文档 · SiliconFlow · 模型列表 | 渠道资料 · SiliconFlow · 模型列表 | 91 |
| https://huggingface.co/tencent/Hy4-preview | 图研既有核实 · Hugging Face · Hy4 Preview<br>官方文档 · Hugging Face · Hy4 Preview<br>官方文档 · Hugging Face · Hy4 preview | 官方文档 · Hugging Face · Hy4 Preview | 44 |
| https://help.aliyun.com/zh/model-studio/models | 原厂规格 · 百炼 · 模型列表<br>原厂资料 · 百炼 · 模型列表<br>官方文档 · 百炼 · 模型列表<br>官方文档 · 百炼 · 模型列表（中文版）<br>渠道资料 · 百炼 · 模型列表 | 渠道资料 · 百炼 · 模型列表（中文版） | 1093 |
| https://huggingface.co/Qwen/Qwen3.8-27B | 官方文档 · Hugging Face · Qwen3.8 27B<br>官方文档 · Hugging Face · Qwen3.8-27B | 官方文档 · Hugging Face · Qwen3.8 27B | 1 |
| https://huggingface.co/MiniMaxAI/MiniMax-M2.5 | 图研既有核实 · Hugging Face · MiniMax M2.5<br>官方文档 · Hugging Face · MiniMax M2.5<br>官方文档 · Hugging Face · MiniMax-M2.5 | 官方文档 · Hugging Face · MiniMax M2.5 | 70 |
| https://huggingface.co/Qwen/Qwen-Image-Edit-2509 | 图研既有核实 · Hugging Face · Qwen-Image-Edit-2509<br>官方文档 · Hugging Face · Qwen-Image-Edit-2509 | 官方文档 · Hugging Face · Qwen-Image-Edit-2509 | 20 |
| https://docs.siliconflow.cn/docs/api/images-generations-post | 官方文档 · SiliconFlow · Images Generations Post | 渠道资料 · SiliconFlow · Images Generations Post | 2 |
| https://huggingface.co/Qwen/Qwen-Image-Edit | 图研既有核实 · Hugging Face · Qwen Image Edit<br>官方文档 · Hugging Face · Qwen Image Edit<br>官方文档 · Hugging Face · Qwen-Image-Edit | 官方文档 · Hugging Face · Qwen Image Edit | 44 |
| https://huggingface.co/Qwen/Qwen3.6-27B | 图研既有核实 · Hugging Face · Qwen3.6-27B<br>官方文档 · Hugging Face · Qwen3.6-27B<br>官方文档 · Hugging Face · Qwen3.6-27b | 官方文档 · Hugging Face · Qwen3.6-27B | 44 |
| https://huggingface.co/Qwen/Qwen3.6-35B-A3B | 图研既有核实 · Hugging Face · Qwen3.6-35b A3b<br>官方文档 · Hugging Face · Qwen3.6-35B-A3B<br>官方文档 · Hugging Face · Qwen3.6-35b-a3b | 官方文档 · Hugging Face · Qwen3.6-35b A3b | 48 |
| https://huggingface.co/Qwen/Qwen3.5-122B-A10B | 官方文档 · Hugging Face · Qwen3.5-122B-A10B<br>官方文档 · Hugging Face · Qwen3.5-122b-a10b | 官方文档 · Hugging Face · Qwen3.5-122b A10b | 3 |
| https://huggingface.co/Qwen/Qwen3.5-27B | 官方文档 · Hugging Face · Qwen3.5-27B<br>官方文档 · Hugging Face · Qwen3.5-27b | 官方文档 · Hugging Face · Qwen3.5-27B | 1 |
| https://huggingface.co/Qwen/Qwen3.5-35B-A3B | 官方文档 · Hugging Face · Qwen3.5-35B-A3B<br>官方文档 · Hugging Face · Qwen3.5-35b-a3b | 官方文档 · Hugging Face · Qwen3.5-35b A3b | 3 |
| https://huggingface.co/Qwen/Qwen3.5-397B-A17B | 图研既有核实 · Hugging Face · Qwen3.5-397b A17b<br>官方文档 · Hugging Face · Qwen3.5-397B-A17B<br>官方文档 · Hugging Face · Qwen3.5-397b-a17b | 官方文档 · Hugging Face · Qwen3.5-397b A17b | 57 |
| https://huggingface.co/Qwen/Qwen3.5-4B | 图研既有核实 · Hugging Face · Qwen3.5-4B<br>官方文档 · Hugging Face · Qwen3.5-4B | 官方文档 · Hugging Face · Qwen3.5-4B | 20 |
| https://huggingface.co/Qwen/Qwen3.5-9B | 图研既有核实 · Hugging Face · Qwen3.5 9B<br>官方文档 · Hugging Face · Qwen3.5 9B<br>官方文档 · Hugging Face · Qwen3.5-9B | 官方文档 · Hugging Face · Qwen3.5 9B | 44 |
| https://huggingface.co/Qwen/Qwen3-14B | 图研既有核实 · Hugging Face · Qwen3-14B<br>官方文档 · Hugging Face · Qwen3-14B | 官方文档 · Hugging Face · Qwen3-14B | 20 |
| https://huggingface.co/Qwen/Qwen3-30B-A3B-Instruct-2507 | 原厂规格 · Hugging Face · Qwen3 30B A3B Instruct 2507<br>图研既有核实 · Hugging Face · Qwen3 30B A3B Instruct 2507<br>官方文档 · Hugging Face · Qwen3-30B-A3B-Instruct-2507 | 官方文档 · Hugging Face · Qwen3 30B A3B Instruct 2507 | 28 |
| https://huggingface.co/Qwen/Qwen3-32B | 图研既有核实 · Hugging Face · Qwen3-32B<br>官方文档 · Hugging Face · Qwen3-32B | 官方文档 · Hugging Face · Qwen3-32B | 20 |
| https://huggingface.co/Qwen/Qwen3-8B | 图研既有核实 · Hugging Face · Qwen3 8B<br>官方文档 · Hugging Face · Qwen3-8B | 官方文档 · Hugging Face · Qwen3 8B | 24 |
| https://huggingface.co/Qwen/Qwen2.5-7B-Instruct | 图研既有核实 · Hugging Face · Qwen2.5-7B-Instruct<br>官方文档 · Hugging Face · Qwen2.5-7B-Instruct | 官方文档 · Hugging Face · Qwen2.5-7B-Instruct | 40 |
| https://huggingface.co/Qwen/Qwen2.5-32B-Instruct | 图研既有核实 · Hugging Face · Qwen2.5-32B-Instruct<br>官方文档 · Hugging Face · Qwen2.5-32B-Instruct | 官方文档 · Hugging Face · Qwen2.5-32B-Instruct | 20 |
| https://huggingface.co/Qwen/Qwen2.5-72B-Instruct | 图研既有核实 · Hugging Face · Qwen2.5-72B-Instruct<br>官方文档 · Hugging Face · Qwen2.5-72B-Instruct | 官方文档 · Hugging Face · Qwen2.5-72B-Instruct | 40 |
| https://docs.siliconflow.cn/cn/api-reference/chat-completions/chat-completions | 官方文档 · SiliconFlow · Chat Completions | 渠道资料 · SiliconFlow · Chat Completions | 2 |
| https://docs.siliconflow.cn/docs/release-notes/overview | 官方文档 · SiliconFlow · Release Notes | 渠道资料 · SiliconFlow · Release Notes | 1 |
| https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash | 原厂规格 · Hugging Face · DeepSeek-V4-Flash Preview<br>图研既有核实 · Hugging Face · DeepSeek V4 Flash<br>官方文档 · Hugging Face · DeepSeek V4 Flash<br>官方文档 · Hugging Face · DeepSeek V4 Flash 0731<br>官方文档 · Hugging Face · DeepSeek-V4-Flash<br>官方文档 · Hugging Face · DeepSeek-V4-Flash-0731 | 官方文档 · Hugging Face · DeepSeek V4 Flash | 94 |
| https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro | 图研既有核实 · Hugging Face · DeepSeek V4 Pro<br>官方文档 · Hugging Face · DeepSeek V4 Pro<br>官方文档 · Hugging Face · DeepSeek V4 Pro 0813<br>官方文档 · Hugging Face · DeepSeek-V4-Pro | 官方文档 · Hugging Face · DeepSeek V4 Pro | 25 |
| https://huggingface.co/deepseek-ai/DeepSeek-V3.2 | 原厂规格 · Hugging Face · DeepSeek-V3.2<br>图研既有核实 · Hugging Face · DeepSeek-V3.2<br>官方文档 · Hugging Face · DeepSeek-V3.2 | 官方文档 · Hugging Face · DeepSeek-V3.2 | 64 |
| https://huggingface.co/deepseek-ai/DeepSeek-V3.1-Terminus | 图研既有核实 · Hugging Face · DeepSeek-V3.1-Terminus<br>官方文档 · Hugging Face · DeepSeek-V3.1-Terminus | 官方文档 · Hugging Face · DeepSeek-V3.1-Terminus | 60 |
| https://huggingface.co/deepseek-ai/DeepSeek-R1-0528-Qwen3-8B | 图研既有核实 · Hugging Face · DeepSeek-R1-0528-Qwen3-8B<br>官方文档 · Hugging Face · DeepSeek-R1-0528-Qwen3-8B | 官方文档 · Hugging Face · DeepSeek-R1-0528-Qwen3-8B | 20 |
| https://docs.siliconflow.cn/docs/userguide/capabilities/vision | 官方文档 · SiliconFlow · Vision | 渠道资料 · SiliconFlow · Vision | 1 |
| https://platform.stepfun.com/docs/zh/guides/models/list | 原厂规格 · StepFun · List<br>原厂资料 · StepFun · List<br>官方文档 · StepFun · List<br>渠道资料 · StepFun · List | 官方文档 · StepFun · List | 68 |
| https://platform.stepfun.com/docs/zh/guides/models/step-3.5-flash | 官方文档 · StepFun · Step 3.5 Flash<br>官方文档 · StepFun · Step-3.5-Flash | 官方文档 · StepFun · Step 3.5 Flash | 1 |
| https://docs.bigmodel.cn/cn/guide/models/vlm/glm-4.5v | 图研既有核实 · 智谱 · GLM-4.5V<br>官方文档 · 智谱 · GLM-4.5V | 官方文档 · 智谱 · GLM-4.5V | 20 |
| https://github.com/zai-org/GLM-4/blob/main/README.md | 图研既有核实 · GitHub · README<br>官方文档 · GitHub · README | 官方文档 · GitHub · README | 60 |
| https://huggingface.co/deepseek-ai/DeepSeek-V3 | 图研既有核实 · Hugging Face · DeepSeek V3<br>官方文档 · Hugging Face · DeepSeek V3<br>官方文档 · Hugging Face · DeepSeek-V3 | 官方文档 · Hugging Face · DeepSeek V3 | 68 |
| https://huggingface.co/ByteDance-Seed/Seed-OSS-36B-Instruct | 图研既有核实 · Hugging Face · Seed-OSS-36B-Instruct<br>官方文档 · Hugging Face · Seed-OSS-36B-Instruct | 官方文档 · Hugging Face · Seed-OSS-36B-Instruct | 20 |
| https://huggingface.co/Kwai-Kolors/Kolors | 图研既有核实 · Hugging Face · Kolors<br>官方文档 · Hugging Face · Kolors | 官方文档 · Hugging Face · Kolors | 10 |
| https://huggingface.co/deepseek-ai/DeepSeek-R1 | 图研既有核实 · Hugging Face · DeepSeek R1<br>官方文档 · Hugging Face · DeepSeek R1<br>官方文档 · Hugging Face · DeepSeek-R1 | 官方文档 · Hugging Face · DeepSeek R1 | 68 |
| https://huggingface.co/Qwen/Qwen3-Coder-30B-A3B-Instruct | 图研既有核实 · Hugging Face · Qwen3-Coder-30B-A3B-Instruct<br>官方文档 · Hugging Face · Qwen3-Coder-30B-A3B-Instruct | 官方文档 · Hugging Face · Qwen3-Coder-30B-A3B-Instruct | 20 |
| https://huggingface.co/Qwen/Qwen3-Omni-30B-A3B-Instruct | 图研既有核实 · Hugging Face · Qwen3 Omni 30B A3B Instruct<br>官方文档 · Hugging Face · Qwen3-Omni-30B-A3B-Instruct | 官方文档 · Hugging Face · Qwen3 Omni 30B A3B Instruct | 24 |
| https://huggingface.co/Qwen/Qwen3-Omni-30B-A3B-Thinking | 图研既有核实 · Hugging Face · Qwen3-Omni-30B-A3B-Thinking<br>官方文档 · Hugging Face · Qwen3-Omni-30B-A3B-Thinking | 官方文档 · Hugging Face · Qwen3-Omni-30B-A3B-Thinking | 20 |
| https://huggingface.co/Qwen/Qwen3-VL-30B-A3B-Instruct | 图研既有核实 · Hugging Face · Qwen3-VL-30B-A3B-Instruct<br>官方文档 · Hugging Face · Qwen3-VL-30B-A3B-Instruct | 官方文档 · Hugging Face · Qwen3-VL-30B-A3B-Instruct | 20 |
| https://huggingface.co/Qwen/Qwen3-VL-30B-A3B-Thinking | 图研既有核实 · Hugging Face · Qwen3-VL-30B-A3B-Thinking<br>官方文档 · Hugging Face · Qwen3-VL-30B-A3B-Thinking | 官方文档 · Hugging Face · Qwen3-VL-30B-A3B-Thinking | 20 |
| https://huggingface.co/Qwen/Qwen3-VL-32B-Instruct | 图研既有核实 · Hugging Face · Qwen3-VL-32B-Instruct<br>官方文档 · Hugging Face · Qwen3-VL-32B-Instruct | 官方文档 · Hugging Face · Qwen3-VL-32B-Instruct | 20 |
| https://huggingface.co/Qwen/Qwen3-VL-32B-Thinking | 图研既有核实 · Hugging Face · Qwen3-VL-32B-Thinking<br>官方文档 · Hugging Face · Qwen3-VL-32B-Thinking | 官方文档 · Hugging Face · Qwen3-VL-32B-Thinking | 20 |
| https://huggingface.co/Qwen/Qwen3-VL-8B-Instruct | 图研既有核实 · Hugging Face · Qwen3-VL-8B-Instruct<br>官方文档 · Hugging Face · Qwen3-VL-8B-Instruct | 官方文档 · Hugging Face · Qwen3-VL-8B-Instruct | 20 |
| https://huggingface.co/Qwen/Qwen3-VL-8B-Thinking | 图研既有核实 · Hugging Face · Qwen3-VL-8B-Thinking<br>官方文档 · Hugging Face · Qwen3-VL-8B-Thinking | 官方文档 · Hugging Face · Qwen3-VL-8B-Thinking | 20 |
| https://huggingface.co/Tongyi-MAI/Z-Image | 图研既有核实 · Hugging Face · Z Image<br>官方文档 · Hugging Face · Z-Image | 官方文档 · Hugging Face · Z Image | 24 |
| https://huggingface.co/Tongyi-MAI/Z-Image-Turbo | 官方文档 · Hugging Face · Z-Image Turbo<br>官方文档 · Hugging Face · Z-Image-Turbo | 官方文档 · Hugging Face · Z Image Turbo | 2 |
| https://huggingface.co/baidu/ERNIE-Image-Turbo | 图研既有核实 · Hugging Face · ERNIE Image Turbo<br>官方文档 · Hugging Face · ERNIE-Image-Turbo | 官方文档 · Hugging Face · ERNIE Image Turbo | 24 |
| https://huggingface.co/inclusionAI/Ling-flash-2.0 | 图研既有核实 · Hugging Face · Ling Flash 2.0<br>官方文档 · Hugging Face · Ling Flash 2.0 | 官方文档 · Hugging Face · Ling Flash 2.0 | 20 |
| https://huggingface.co/inclusionAI/Ling-mini-2.0 | 图研既有核实 · Hugging Face · Ling Mini 2.0<br>官方文档 · Hugging Face · Ling Mini 2.0 | 官方文档 · Hugging Face · Ling Mini 2.0 | 20 |
| https://huggingface.co/meituan-longcat/LongCat-2.0 | 原厂规格 · Hugging Face · LongCat 2.0<br>图研既有核实 · Hugging Face · LongCat 2.0<br>官方文档 · Hugging Face · LongCat-2.0 | 官方文档 · Hugging Face · LongCat 2.0 | 48 |
| https://huggingface.co/nex-agi/Nex-N2-Pro | 图研既有核实 · Hugging Face · Nex-N2-Pro<br>官方文档 · Hugging Face · Nex-N2-Pro | 官方文档 · Hugging Face · Nex-N2-Pro | 20 |
| https://huggingface.co/tencent/Hunyuan-A13B-Instruct | 图研既有核实 · Hugging Face · Hunyuan-A13B-Instruct<br>官方文档 · Hugging Face · Hunyuan-A13B-Instruct | 官方文档 · Hugging Face · Hunyuan-A13B-Instruct | 20 |
| https://platform.claude.com/docs/en/models/haiku-5-5/overview | 图研既有核实 · Claude · Haiku 5-5<br>官方文档 · Claude · Haiku 5-5 | 官方文档 · Claude · Haiku 5-5 | 20 |
| https://platform.claude.com/docs/en/models/sonnet-5-5/overview | 图研既有核实 · Claude · Sonnet 5-5<br>官方文档 · Claude · Sonnet 5-5 | 官方文档 · Claude · Sonnet 5-5 | 20 |
| https://docs.anthropic.com/en/docs/about-claude/models/overview | 官方文档 · Anthropic · 模型列表<br>渠道资料 · Anthropic · 模型列表 | 官方文档 · Anthropic · 模型列表 | 20 |
| https://platform.claude.com/docs/en/models/opus-5/overview | 图研既有核实 · Claude · Opus 5<br>官方文档 · Claude · Opus 5 | 官方文档 · Claude · Opus 5 | 20 |
| https://platform.claude.com/docs/en/models/sonnet-5/overview | 图研既有核实 · Claude · Sonnet 5<br>官方文档 · Claude · Sonnet 5 | 官方文档 · Claude · Sonnet 5 | 20 |
| https://platform.claude.com/docs/en/models/fable-5/overview | 图研既有核实 · Claude · Fable 5<br>官方文档 · Claude · Fable 5 | 官方文档 · Claude · Fable 5 | 20 |
| https://platform.claude.com/docs/en/models/opus-4-8/overview | 图研既有核实 · Claude · Opus 4-8<br>官方文档 · Claude · Opus 4-8 | 官方文档 · Claude · Opus 4-8 | 20 |
| https://platform.claude.com/docs/en/models/opus-4-7/overview | 图研既有核实 · Claude · Opus 4-7<br>官方文档 · Claude · Opus 4-7 | 官方文档 · Claude · Opus 4-7 | 20 |
| https://platform.claude.com/docs/en/models/sonnet-4-6/overview | 图研既有核实 · Claude · Sonnet 4-6<br>官方文档 · Claude · Sonnet 4-6 | 官方文档 · Claude · Sonnet 4-6 | 20 |
| https://platform.claude.com/docs/en/models/opus-4-6/overview | 图研既有核实 · Claude · Opus 4-6<br>官方文档 · Claude · Opus 4-6 | 官方文档 · Claude · Opus 4-6 | 20 |
| https://platform.claude.com/docs/en/models/opus-4-5/overview | 图研既有核实 · Claude · Opus 4-5<br>官方文档 · Claude · Opus 4-5 | 官方文档 · Claude · Opus 4-5 | 20 |
| https://platform.claude.com/docs/en/models/sonnet-4-5/overview | 图研既有核实 · Claude · Sonnet 4-5<br>官方文档 · Claude · Sonnet 4-5 | 官方文档 · Claude · Sonnet 4-5 | 20 |
| https://platform.claude.com/docs/en/models/haiku-4-5/overview | 图研既有核实 · Claude · Haiku 4-5<br>官方文档 · Claude · Haiku 4-5 | 官方文档 · Claude · Haiku 4-5 | 20 |
| https://www.recraft.ai/docs/api-reference/models/recraft-v4-1 | 图研既有核实 · Recraft · Recraft V4.1<br>官方文档 · Recraft · Recraft V4.1 | 官方文档 · Recraft · Recraft V4.1 | 160 |
| https://www.recraft.ai/docs/api-reference/models/recraft-v4-1-flash | 图研既有核实 · Recraft · Recraft V4.1 Flash<br>官方文档 · Recraft · Recraft V4.1 Flash<br>官方文档 · Recraft · Runware | 官方文档 · Recraft · Recraft V4.1 Flash | 44 |
| https://www.recraft.ai/docs/api-reference/models/recraft-v4 | 图研既有核实 · Recraft · Recraft V4<br>官方文档 · Recraft · Recraft V4 | 官方文档 · Recraft · Recraft V4 | 80 |
| https://www.recraft.ai/docs/api-reference/models/recraft-v3 | 图研既有核实 · Recraft · Recraft V3<br>官方文档 · Recraft · Recraft V3 | 官方文档 · Recraft · Recraft V3 | 40 |
| https://www.recraft.ai/docs/api-reference/models/recraft-v2 | 图研既有核实 · Recraft · Recraft V2<br>官方文档 · Recraft · Recraft V2 | 官方文档 · Recraft · Recraft V2 | 40 |
| https://docs.x.ai/developers/models/grok-4.7 | 官方文档 · xAI · Grok 4.7<br>渠道资料 · xAI · Grok 4.7 | 官方文档 · xAI · Grok 4.7 | 6 |
| https://docs.x.ai/docs/models | 官方文档 · xAI · 模型列表<br>官方文档 · xAI · 模型列表（模型指南）<br>渠道资料 · xAI · 模型列表 | 官方文档 · xAI · 模型列表 | 24 |
| https://docs.x.ai/developers/models/grok-4.6 | 官方文档 · xAI · Grok 4.6<br>渠道资料 · xAI · Grok 4.6 | 官方文档 · xAI · Grok 4.6 | 6 |
| https://docs.x.ai/developers/models/grok-4.5 | 官方文档 · xAI · Grok-4.5<br>渠道资料 · xAI · Grok-4.5 | 官方文档 · xAI · Grok-4.5 | 6 |
| https://docs.x.ai/developers/models/grok-4.3 | 官方文档 · xAI · Grok-4.3<br>渠道资料 · xAI · Grok 4.3 | 官方文档 · xAI · Grok 4.3 | 10 |
| https://docs.x.ai/developers/models/grok-4.20-0309-non-reasoning | 官方文档 · xAI · Grok 4.20-0309 Non Reasoning<br>渠道资料 · xAI · Grok 4.20-0309 Non Reasoning | 官方文档 · xAI · Grok 4.20-0309 Non Reasoning | 6 |
| https://docs.x.ai/developers/models/grok-4.20-0309-reasoning | 官方文档 · xAI · Grok 4.20-0309 Reasoning<br>渠道资料 · xAI · Grok 4.20-0309 Reasoning | 官方文档 · xAI · Grok 4.20-0309 Reasoning | 6 |
| https://docs.x.ai/developers/models/grok-4.20-multi-agent-0309 | 图研既有核实 · xAI · Grok 4.20 Multi Agent 0309<br>官方文档 · xAI · Grok 4.20 Multi Agent 0309<br>渠道资料 · xAI · Grok 4.20 Multi Agent 0309 | 官方文档 · xAI · Grok 4.20 Multi Agent 0309 | 26 |
| https://docs.x.ai/developers/models/grok-imagine-image-2.0 | 图研既有核实 · xAI · Grok Imagine Image 2.0<br>官方文档 · xAI · Grok Imagine Image 2.0 | 官方文档 · xAI · Grok Imagine Image 2.0 | 20 |
| https://docs.x.ai/developers/models/grok-imagine-image | 图研既有核实 · xAI · Grok Imagine Image<br>官方文档 · xAI · Grok Imagine Image | 官方文档 · xAI · Grok Imagine Image | 20 |
| https://docs.x.ai/developers/models/grok-imagine-image-quality | 图研既有核实 · xAI · Grok Imagine Image Quality<br>官方文档 · xAI · Grok Imagine Image Quality<br>官方文档 · xAI · Grok Imagine Image Quality（开发者指南） | 官方文档 · xAI · Grok Imagine Image Quality（开发者指南） | 22 |
| https://docs.x.ai/docs/models/grok-imagine-image-quality | 官方文档 · xAI · Grok Imagine Image Quality（模型指南） | 官方文档 · xAI · Grok Imagine Image Quality | 1 |
| https://docs.x.ai/developers/models/grok-build-0.1 | 官方文档 · xAI · Grok Build 0.1<br>官方文档 · xAI · Grok Build 0.1（开发者指南）<br>渠道资料 · xAI · Grok Build 0.1 | 官方文档 · xAI · Grok Build 0.1（开发者指南） | 8 |
| https://docs.x.ai/docs/models/grok-build-0.1 | 官方文档 · xAI · Grok Build 0.1（模型指南） | 官方文档 · xAI · Grok Build 0.1 | 1 |
| https://ai.google.dev/gemini-api/docs/models/gemini-4-argon | 图研既有核实 · Google · Gemini 4 Argon<br>官方文档 · Google · Gemini 4 Argon | 官方文档 · Google · Gemini 4 Argon | 20 |
| https://ai.google.dev/gemini-api/docs/models/gemini-nano-banana-2.1 | 图研既有核实 · Google · Gemini Nano Banana 2.1<br>官方文档 · Google · Gemini Nano Banana 2.1<br>官方文档 · Google · Nano Banana 2.1 | 官方文档 · Google · Gemini Nano Banana 2.1 | 38 |
| https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash | 图研既有核实 · Google · Gemini 3.8 Flash<br>官方文档 · Google · Gemini 3.8 Flash | 官方文档 · Google · Gemini 3.8 Flash | 20 |
| https://ai.google.dev/gemini-api/docs/models/gemini-3.7-flash | 图研既有核实 · Google · Gemini 3.7 Flash<br>官方文档 · Google · Gemini 3.7 Flash | 官方文档 · Google · Gemini 3.7 Flash | 20 |
| https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash | 图研既有核实 · Google · Gemini 3.6 Flash<br>官方文档 · Google · Gemini 3.6 Flash | 官方文档 · Google · Gemini 3.6 Flash | 20 |
| https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite | 图研既有核实 · Google · Gemini 3.5 Flash-Lite<br>官方文档 · Google · Gemini 3.5 Flash-Lite | 官方文档 · Google · Gemini 3.5 Flash-Lite | 20 |
| https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite-image | 图研既有核实 · Google · Gemini 3.1 Flash Lite Image<br>官方文档 · Google · Gemini 3.1 Flash Lite Image<br>官方文档 · Google · Gemini 3.1 Flash Lite Image（Nano Banana 2 Lite） | 官方文档 · Google · Gemini 3.1 Flash Lite Image | 88 |
| https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-image | 图研既有核实 · Google · Gemini 3.1 Flash Image<br>官方文档 · Google · Gemini 3.1 Flash Image<br>官方文档 · Google · Gemini 3.1 Flash Image（Nano Banana 2） | 官方文档 · Google · Gemini 3.1 Flash Image | 88 |
| https://ai.google.dev/gemini-api/docs/models/gemini-3-pro-image | 图研既有核实 · Google · Gemini 3 Pro Image<br>官方文档 · Google · Gemini 3 Pro Image<br>官方文档 · Google · Gemini 3 Pro Image（Nano Banana Pro） | 官方文档 · Google · Gemini 3 Pro Image | 74 |
| https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash | 图研既有核实 · Google · Gemini 3.5 Flash<br>官方文档 · Google · Gemini 3.5 Flash | 官方文档 · Google · Gemini 3.5 Flash | 40 |
| https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite | 图研既有核实 · Google · Gemini 3.1 Flash Lite<br>官方文档 · Google · Gemini 3.1 Flash-Lite | 官方文档 · Google · Gemini 3.1 Flash Lite | 24 |
| https://ai.google.dev/gemini-api/docs/models/gemini-3.1-pro-preview | 图研既有核实 · Google · Gemini 3.1 Pro Preview<br>官方文档 · Google · Gemini 3.1 Pro Preview | 官方文档 · Google · Gemini 3.1 Pro Preview | 20 |
| https://ai.google.dev/gemini-api/docs/models/gemini-3-flash-preview | 图研既有核实 · Google · Gemini 3 Flash Preview<br>官方文档 · Google · Gemini 3 Flash Preview | 官方文档 · Google · Gemini 3 Flash Preview | 20 |
| https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash | 图研既有核实 · Google · Gemini 2.5 Flash<br>官方文档 · Google · Gemini 2.5 Flash | 官方文档 · Google · Gemini 2.5 Flash | 40 |
| https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-image | 图研既有核实 · Google · Gemini 2.5 Flash Image<br>官方文档 · Google · Gemini 2.5 Flash Image<br>官方文档 · Google · Gemini 2.5 Flash Image（Nano Banana） | 官方文档 · Google · Gemini 2.5 Flash Image | 94 |
| https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-lite | 图研既有核实 · Google · Gemini 2.5 Flash-Lite<br>官方文档 · Google · Gemini 2.5 Flash-Lite | 官方文档 · Google · Gemini 2.5 Flash-Lite | 20 |
| https://ai.google.dev/gemini-api/docs/models/gemini-2.5-pro | 图研既有核实 · Google · Gemini 2.5 Pro<br>官方文档 · Google · Gemini 2.5 Pro | 官方文档 · Google · Gemini 2.5 Pro | 20 |
| https://help.aliyun.com/zh/model-studio/deepseek-v4-1-flash | 官方文档 · 百炼 · DeepSeek-V4.1-Flash | 渠道资料 · 百炼 · DeepSeek-V4.1-Flash | 4 |
| https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash | 图研既有核实 · Hugging Face · DeepSeek V4.1 Flash<br>官方文档 · Hugging Face · DeepSeek V4.1 Flash<br>官方文档 · Hugging Face · DeepSeek-V4.1-Flash | 官方文档 · Hugging Face · DeepSeek V4.1 Flash | 45 |
| https://help.aliyun.com/zh/model-studio/newly-released-models | 官方文档 · 百炼 · 模型更新 | 渠道资料 · 百炼 · 模型更新 | 11 |
| https://help.aliyun.com/zh/model-studio/vision-model | 图研既有核实 · 百炼 · Vision Model<br>官方文档 · 百炼 · Vision Model | 渠道资料 · 百炼 · Vision Model | 28 |
| https://help.aliyun.com/zh/model-studio/text-generation-model | 官方文档 · 百炼 · Text Generation Model | 渠道资料 · 百炼 · Text Generation Model | 6 |
| https://help.aliyun.com/zh/model-studio/kimi-k3 | 官方文档 · 百炼 · Kimi K3（百炼托管） | 渠道资料 · 百炼 · Kimi K3 | 4 |
| https://huggingface.co/Qwen/Qwen3.8-2.4T-A95B | 官方文档 · Hugging Face · Qwen3.8 2.4T A95B<br>官方文档 · Hugging Face · Qwen3.8-2.4T-A95B | 官方文档 · Hugging Face · Qwen3.8 2.4T A95B | 1 |
| https://huggingface.co/MiniMaxAI/MiniMax-M3 | 图研既有核实 · Hugging Face · MiniMax M3<br>官方文档 · Hugging Face · MiniMax M3<br>官方文档 · Hugging Face · MiniMax-M3<br>官方文档 · Hugging Face · Minimax M3 | 官方文档 · Hugging Face · MiniMax M3 | 68 |
| https://help.aliyun.com/en/model-studio/models | 官方文档 · 百炼 · 模型列表（英文版） | 渠道资料 · 百炼 · 模型列表（英文版） | 12 |
| https://help.aliyun.com/zh/model-studio/model-pricing | 官方文档 · 百炼 · 模型定价 | 渠道资料 · 百炼 · 模型定价 | 84 |
| https://huggingface.co/MiniMaxAI/MiniMax-M2.7 | 图研既有核实 · Hugging Face · MiniMax M2.7<br>官方文档 · Hugging Face · MiniMax M2.7<br>官方文档 · Hugging Face · MiniMax-M2.7 | 官方文档 · Hugging Face · MiniMax M2.7 | 45 |
| https://help.aliyun.com/zh/model-studio/deepseek-api | 图研既有核实 · 百炼 · DeepSeek API<br>官方文档 · 百炼 · DeepSeek API | 渠道资料 · 百炼 · DeepSeek API | 24 |
| https://help.aliyun.com/zh/model-studio/rate-limit | 官方文档 · 百炼 · Rate Limit | 渠道资料 · 百炼 · Rate Limit | 1 |
| https://help.aliyun.com/zh/model-studio/context-cache | 官方文档 · 百炼 · Context Cache | 渠道资料 · 百炼 · Context Cache | 1 |
| https://help.aliyun.com/zh/model-studio/deepseek-api-by-vanchin | 官方文档 · 百炼 · DeepSeek API By Vanchin | 渠道资料 · 百炼 · DeepSeek API By Vanchin | 9 |
| https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731 | 图研既有核实 · Hugging Face · DeepSeek-V4-Flash 0731<br>官方文档 · Hugging Face · DeepSeek-V4-Flash 0731<br>官方文档 · Hugging Face · DeepSeek-V4-Flash 0731 正式版<br>官方文档 · Hugging Face · DeepSeek-V4-Flash-0731 | 官方文档 · Hugging Face · DeepSeek-V4-Flash 0731 | 116 |
| https://help.aliyun.com/zh/model-studio/glm-5-2 | 官方文档 · 百炼 · GLM 5.2 | 渠道资料 · 百炼 · GLM 5.2 | 4 |
| https://help.aliyun.com/zh/model-studio/glm-5-1 | 官方文档 · 百炼 · GLM-5.1 | 渠道资料 · 百炼 · GLM-5.1 | 4 |
| https://help.aliyun.com/zh/model-studio/kimi-k2-7-code | 官方文档 · 百炼 · Kimi K2.7 Code | 渠道资料 · 百炼 · Kimi K2.7 Code | 4 |
| https://help.aliyun.com/zh/model-studio/kimi-k2-6 | 官方文档 · 百炼 · Kimi-k2.6 | 渠道资料 · 百炼 · Kimi-k2.6 | 4 |
| https://help.aliyun.com/zh/model-studio/kimi-k2-5 | 官方文档 · 百炼 · Kimi-k2.5 | 渠道资料 · 百炼 · Kimi-k2.5 | 4 |
| https://huggingface.co/moonshotai/Kimi-K2.5 | 图研既有核实 · Hugging Face · Kimi K2.5<br>官方文档 · Hugging Face · Kimi-k2.5 | 官方文档 · Hugging Face · Kimi K2.5 | 25 |
| https://help.aliyun.com/zh/model-studio/qwen-image-2-1-pro | 图研既有核实 · 百炼 · Qwen Image 2.1 Pro<br>官方文档 · 百炼 · Qwen Image 2.1 Pro | 官方文档 · 百炼 · Qwen Image 2.1 Pro | 20 |
| https://help.aliyun.com/zh/model-studio/qwen-image-2-1-turbo | 图研既有核实 · 百炼 · Qwen Image 2.1 Turbo<br>官方文档 · 百炼 · Qwen Image 2.1 Turbo | 官方文档 · 百炼 · Qwen Image 2.1 Turbo | 20 |
| https://help.aliyun.com/zh/model-studio/qwen-image-2-0-pro | 图研既有核实 · 百炼 · Qwen Image 2.0 Pro<br>官方文档 · 百炼 · Qwen Image 2.0 Pro | 官方文档 · 百炼 · Qwen Image 2.0 Pro | 10 |
| https://help.aliyun.com/zh/model-studio/qwen-image-2-0 | 图研既有核实 · 百炼 · Qwen Image 2.0<br>官方文档 · 百炼 · Qwen Image 2.0 | 官方文档 · 百炼 · Qwen Image 2.0 | 10 |
| https://help.aliyun.com/zh/model-studio/qwen3-7-plus | 图研既有核实 · 百炼 · Qwen3.7 Plus<br>官方文档 · 百炼 · Qwen3.7 Plus | 官方文档 · 百炼 · Qwen3.7 Plus | 20 |
| https://help.aliyun.com/zh/model-studio/qwen3-5-plus | 原厂规格 · 百炼 · Qwen3.5 Plus<br>官方文档 · 百炼 · Qwen3.5 Plus<br>渠道资料 · 百炼 · Qwen3.5 Plus | 官方文档 · 百炼 · Qwen3.5 Plus | 39 |
| https://platform.stepfun.com/docs/zh/guides/models/step-3.7-flash | 图研既有核实 · StepFun · Step 3.7 Flash<br>官方文档 · StepFun · Step 3.7 Flash | 官方文档 · StepFun · Step 3.7 Flash | 15 |
| https://help.aliyun.com/zh/model-studio/wan2-6-image | 图研既有核实 · 百炼 · Wan2.6 Image<br>官方文档 · 百炼 · Wan 2.6 Image<br>官方文档 · 百炼 · Wan2.6 Image | 官方文档 · 百炼 · Wan2.6 Image | 24 |
| https://help.aliyun.com/zh/model-studio/minimax-m3-1-flash | 官方文档 · 百炼 · MiniMax M3.1 Flash | 渠道资料 · 百炼 · MiniMax M3.1 Flash | 4 |
| https://help.aliyun.com/zh/model-studio/minimax-api-by-minimax | 官方文档 · 百炼 · MiniMax API | 渠道资料 · 百炼 · MiniMax API | 1 |
| https://help.aliyun.com/zh/model-studio/unisound-u2-by-unisound | 官方文档 · 百炼 · Unisound U2 | 渠道资料 · 百炼 · Unisound U2 | 4 |
| https://help.aliyun.com/zh/model-studio/wanx-v1 | 官方文档 · 百炼 · Wanx V1 | 渠道资料 · 百炼 · Wanx V1 | 4 |
| https://help.aliyun.com/zh/model-studio/wanx2-0-t2i-turbo | 官方文档 · 百炼 · Wanx2.0 T2i Turbo | 渠道资料 · 百炼 · Wanx2.0 T2i Turbo | 4 |
| https://help.aliyun.com/zh/model-studio/wanx-image-edit-api-reference | 官方文档 · 百炼 · Wanx Image Edit API Reference<br>渠道资料 · 百炼 · Wanx Image Edit API Reference | 渠道资料 · 百炼 · Wanx Image Edit API Reference | 4 |
| https://help.aliyun.com/zh/model-studio/wanx-image-edit | 官方文档 · 百炼 · Wanx Image Edit | 渠道资料 · 百炼 · Wanx Image Edit | 1 |
| https://help.aliyun.com/zh/model-studio/wanx2-1-t2i-plus | 官方文档 · 百炼 · Wanx2.1 T2i Plus | 渠道资料 · 百炼 · Wanx2.1 T2i Plus | 4 |
| https://help.aliyun.com/zh/model-studio/wanx2-1-t2i-turbo | 官方文档 · 百炼 · Wanx2.1 T2i Turbo | 渠道资料 · 百炼 · Wanx2.1 T2i Turbo | 4 |
| https://mimo.mi.com/docs/zh-CN/updates/deprecate | 下线公告 · MiMo · 模型下线公告<br>原厂资料 · MiMo · 模型下线公告 | 下线公告 · MiMo · 模型下线公告 | 20 |
| https://mimo.mi.com/models/en-US/mimo-v2.5-pro | 图研既有核实 · MiMo · MiMo V2.5 Pro<br>官方文档 · MiMo · MiMo V2.5 Pro<br>官方文档 · MiMo · MiMo-V2.5-Pro | 官方文档 · MiMo · MiMo V2.5 Pro | 11 |
| https://mimo.mi.com/docs/zh-CN/quick-start/summary/model | 原厂规格 · MiMo · 模型说明<br>官方文档 · MiMo · 模型说明<br>渠道资料 · MiMo · 模型说明 | 官方文档 · MiMo · 模型说明 | 34 |
| https://help.aliyun.com/zh/model-studio/mimo-v2-6-pro-ultraspeed | 官方文档 · 百炼 · MiMo V2.6 Pro UltraSpeed | 渠道资料 · 百炼 · MiMo V2.6 Pro UltraSpeed | 4 |
| https://help.aliyun.com/zh/model-studio/mimo | 官方文档 · 百炼 · MiMo | 渠道资料 · 百炼 · MiMo | 1 |
| https://developers.openai.com/api/docs/models/gpt-6.1-sol | 图研既有核实 · OpenAI · GPT-6.1 Sol<br>官方文档 · OpenAI · GPT-6.1 Sol | 官方文档 · OpenAI · GPT-6.1 Sol | 20 |
| https://developers.openai.com/api/docs/models/gpt-6-luna | 官方文档 · OpenAI · GPT-6 Luna<br>渠道资料 · OpenAI · GPT-6 Luna | 官方文档 · OpenAI · GPT-6 Luna | 10 |
| https://developers.openai.com/api/docs/models/gpt-6-sol | 官方文档 · OpenAI · GPT-6 Sol<br>渠道资料 · OpenAI · GPT-6 Sol | 官方文档 · OpenAI · GPT-6 Sol | 10 |
| https://developers.openai.com/api/docs/models/gpt-image-2.5-flare | 图研既有核实 · OpenAI · GPT Image 2.5 Flare<br>官方文档 · OpenAI · GPT Image 2.5 Flare<br>官方文档 · OpenAI · GPT Image 2.5 Flare（2026-09-08）<br>渠道资料 · OpenAI · GPT Image 2.5 Flare | 官方文档 · OpenAI · GPT Image 2.5 Flare | 54 |
| https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst | 图研既有核实 · OpenAI · GPT Image 2.5 Sunburst<br>官方文档 · OpenAI · GPT Image 2.5 Sunburst<br>官方文档 · OpenAI · GPT Image 2.5 Sunburst（2026-09-08）<br>渠道资料 · OpenAI · GPT Image 2.5 Sunburst | 官方文档 · OpenAI · GPT Image 2.5 Sunburst | 54 |
| https://developers.openai.com/api/docs/models/gpt-6-astra | 官方文档 · OpenAI · GPT-6 Astra<br>渠道资料 · OpenAI · GPT-6 Astra | 官方文档 · OpenAI · GPT-6 Astra | 10 |
| https://developers.openai.com/api/docs/models/gpt-5.6-luna | 官方文档 · OpenAI · GPT-5.6 Luna<br>渠道资料 · OpenAI · GPT-5.6 Luna | 官方文档 · OpenAI · GPT-5.6 Luna | 10 |
| https://developers.openai.com/api/docs/models/gpt-5.6-sol | 官方文档 · OpenAI · GPT-5.6 Sol<br>渠道资料 · OpenAI · GPT-5.6 Sol | 官方文档 · OpenAI · GPT-5.6 Sol | 10 |
| https://developers.openai.com/api/docs/models/gpt-5.6-terra | 官方文档 · OpenAI · GPT-5.6 Terra<br>渠道资料 · OpenAI · GPT-5.6 Terra | 官方文档 · OpenAI · GPT-5.6 Terra | 10 |
| https://developers.openai.com/api/docs/models/gpt-5.5 | 官方文档 · OpenAI · GPT-5.5（2026-04-23）<br>渠道资料 · OpenAI · GPT-5.5 | 官方文档 · OpenAI · GPT-5.5 | 14 |
| https://developers.openai.com/api/docs/models/gpt-5.5-pro | 官方文档 · OpenAI · GPT-5.5 Pro（2026-04-23）<br>渠道资料 · OpenAI · GPT-5.5 Pro | 官方文档 · OpenAI · GPT-5.5 Pro | 14 |
| https://developers.openai.com/api/docs/models/gpt-5.4 | 官方文档 · OpenAI · GPT-5.4（2026-03-05）<br>渠道资料 · OpenAI · GPT-5.4 | 官方文档 · OpenAI · GPT-5.4 | 14 |
| https://developers.openai.com/api/docs/models/gpt-5.4-mini | 官方文档 · OpenAI · GPT-5.4 Mini（2026-03-17）<br>渠道资料 · OpenAI · GPT-5.4 Mini | 官方文档 · OpenAI · GPT-5.4 Mini | 14 |
| https://developers.openai.com/api/docs/models/gpt-5.4-nano | 官方文档 · OpenAI · GPT-5.4 Nano（2026-03-17）<br>渠道资料 · OpenAI · GPT-5.4 Nano | 官方文档 · OpenAI · GPT-5.4 Nano | 14 |
| https://developers.openai.com/api/docs/models/gpt-5.4-pro | 官方文档 · OpenAI · GPT-5.4 Pro（2026-03-05）<br>渠道资料 · OpenAI · GPT-5.4 Pro | 官方文档 · OpenAI · GPT-5.4 Pro | 14 |
| https://developers.openai.com/api/docs/models/gpt-5.3-codex | 官方文档 · OpenAI · GPT 5.3 Codex<br>渠道资料 · OpenAI · GPT 5.3 Codex | 官方文档 · OpenAI · GPT 5.3 Codex | 10 |
| https://developers.openai.com/api/docs/models/gpt-5.2 | 图研既有核实 · OpenAI · GPT 5.2<br>官方文档 · OpenAI · GPT 5.2<br>官方文档 · OpenAI · GPT-5.2（2025-12-11）<br>渠道资料 · OpenAI · GPT 5.2 | 官方文档 · OpenAI · GPT 5.2 | 34 |
| https://developers.openai.com/api/docs/models/gpt-5.2-pro | 官方文档 · OpenAI · GPT 5.2 Pro（2025-12-11）<br>渠道资料 · OpenAI · GPT 5.2 Pro | 官方文档 · OpenAI · GPT 5.2 Pro | 14 |
| https://developers.openai.com/api/docs/models/gpt-5.1 | 图研既有核实 · OpenAI · GPT-5.1<br>官方文档 · OpenAI · GPT-5.1<br>官方文档 · OpenAI · GPT-5.1（2025-11-13）<br>渠道资料 · OpenAI · GPT-5.1 | 官方文档 · OpenAI · GPT-5.1 | 34 |
| https://developers.openai.com/api/docs/models/gpt-5 | 图研既有核实 · OpenAI · GPT 5<br>官方文档 · OpenAI · GPT 5<br>官方文档 · OpenAI · GPT-5（2025-08-07）<br>渠道资料 · OpenAI · GPT 5 | 官方文档 · OpenAI · GPT 5 | 34 |
| https://developers.openai.com/api/docs/models/gpt-5-mini | 图研既有核实 · OpenAI · GPT 5 Mini<br>官方文档 · OpenAI · GPT 5 Mini<br>官方文档 · OpenAI · GPT 5 Mini（2025-08-07）<br>渠道资料 · OpenAI · GPT 5 Mini | 官方文档 · OpenAI · GPT 5 Mini | 34 |
| https://developers.openai.com/api/docs/models/gpt-5-nano | 图研既有核实 · OpenAI · GPT 5 Nano<br>官方文档 · OpenAI · GPT 5 Nano<br>官方文档 · OpenAI · GPT 5 Nano（2025-08-07）<br>渠道资料 · OpenAI · GPT 5 Nano | 官方文档 · OpenAI · GPT 5 Nano | 34 |
| https://developers.openai.com/api/docs/models/gpt-5-pro | 图研既有核实 · OpenAI · GPT 5 Pro<br>官方文档 · OpenAI · GPT 5 Pro<br>官方文档 · OpenAI · GPT 5 Pro（2025-10-06）<br>渠道资料 · OpenAI · GPT 5 Pro | 官方文档 · OpenAI · GPT 5 Pro | 34 |
| https://developers.openai.com/api/docs/models/gpt-4.1 | 图研既有核实 · OpenAI · GPT 4.1<br>官方文档 · OpenAI · GPT 4.1<br>官方文档 · OpenAI · GPT-4.1（2025-04-14）<br>渠道资料 · OpenAI · GPT 4.1 | 官方文档 · OpenAI · GPT 4.1 | 34 |
| https://developers.openai.com/api/docs/models/gpt-4.1-mini | 图研既有核实 · OpenAI · GPT-4.1 Mini<br>官方文档 · OpenAI · GPT-4.1 Mini<br>官方文档 · OpenAI · GPT-4.1 Mini（2025-04-14）<br>渠道资料 · OpenAI · GPT-4.1 Mini | 官方文档 · OpenAI · GPT-4.1 Mini | 34 |
| https://developers.openai.com/api/docs/models/gpt-4.1-nano | 图研既有核实 · OpenAI · GPT 4.1 Nano<br>官方文档 · OpenAI · GPT 4.1 Nano<br>官方文档 · OpenAI · GPT 4.1 Nano（2025-04-14）<br>渠道资料 · OpenAI · GPT 4.1 Nano | 官方文档 · OpenAI · GPT 4.1 Nano | 34 |
| https://developers.openai.com/api/docs/models/gpt-4o | 图研既有核实 · OpenAI · GPT 4o<br>官方文档 · OpenAI · GPT 4o<br>官方文档 · OpenAI · GPT-4o（2024-08-06）<br>渠道资料 · OpenAI · GPT 4o | 官方文档 · OpenAI · GPT 4o | 74 |
| https://developers.openai.com/api/docs/models/gpt-4o-mini | 图研既有核实 · OpenAI · GPT 4o Mini<br>官方文档 · OpenAI · GPT 4o Mini<br>官方文档 · OpenAI · GPT 4o Mini（2024-07-18）<br>渠道资料 · OpenAI · GPT 4o Mini | 官方文档 · OpenAI · GPT 4o Mini | 34 |
| https://developers.openai.com/api/docs/models/gpt-4-turbo | 图研既有核实 · OpenAI · GPT 4 Turbo<br>官方文档 · OpenAI · GPT 4 Turbo<br>官方文档 · OpenAI · GPT 4 Turbo（2024-04-09）<br>渠道资料 · OpenAI · GPT 4 Turbo | 官方文档 · OpenAI · GPT 4 Turbo | 34 |
| https://developers.openai.com/api/docs/models/gpt-4 | 图研既有核实 · OpenAI · GPT 4<br>官方文档 · OpenAI · GPT 4<br>官方文档 · OpenAI · GPT-4（0613）<br>渠道资料 · OpenAI · GPT 4 | 官方文档 · OpenAI · GPT 4 | 32 |
| https://developers.openai.com/api/docs/models/gpt-4-turbo-preview | 图研既有核实 · OpenAI · GPT 4 Turbo Preview<br>官方文档 · OpenAI · GPT 4 Turbo Preview | 官方文档 · OpenAI · GPT 4 Turbo Preview | 20 |
| https://developers.openai.com/api/docs/models/gpt-image-2 | 原厂规格 · OpenAI · GPT Image 2<br>原厂资料 · OpenAI · GPT Image 2<br>图研既有核实 · OpenAI · GPT Image 2<br>官方文档 · OpenAI · GPT Image 2<br>官方文档 · OpenAI · GPT Image 2（2026-04-21）<br>渠道资料 · OpenAI · GPT Image 2 | 官方文档 · OpenAI · GPT Image 2 | 58 |
| https://developers.openai.com/api/docs/models/gpt-image-1.5 | 原厂规格 · OpenAI · GPT Image 1.5<br>原厂资料 · OpenAI · GPT Image 1.5<br>图研既有核实 · OpenAI · GPT Image 1.5<br>官方文档 · OpenAI · GPT Image 1.5<br>官方文档 · OpenAI · GPT Image 1.5（2025-12-16）<br>渠道资料 · OpenAI · GPT Image 1.5 | 官方文档 · OpenAI · GPT Image 1.5 | 60 |
| https://developers.openai.com/api/docs/models/gpt-image-1 | 原厂规格 · OpenAI · GPT Image 1<br>官方文档 · OpenAI · GPT Image 1<br>渠道资料 · OpenAI · GPT Image 1 | 官方文档 · OpenAI · GPT Image 1 | 14 |
| https://developers.openai.com/api/docs/models/gpt-image-1-mini | 官方文档 · OpenAI · GPT Image 1 Mini<br>渠道资料 · OpenAI · GPT Image 1 Mini | 官方文档 · OpenAI · GPT Image 1 Mini | 10 |
| https://developers.openai.com/api/docs/models/chat-latest | 官方文档 · OpenAI · Chat Latest<br>渠道资料 · OpenAI · Chat Latest | 官方文档 · OpenAI · Chat Latest | 10 |
| https://developers.openai.com/api/docs/models/chatgpt-image-latest | 官方文档 · OpenAI · ChatGPT Image Latest<br>渠道资料 · OpenAI · ChatGPT Image Latest | 官方文档 · OpenAI · ChatGPT Image Latest | 12 |
| https://developers.openai.com/api/docs/models/gpt-3.5-turbo | 图研既有核实 · OpenAI · GPT 3.5 Turbo<br>官方文档 · OpenAI · GPT 3.5 Turbo<br>官方文档 · OpenAI · GPT 3.5 Turbo（0125）<br>渠道资料 · OpenAI · GPT 3.5 Turbo | 官方文档 · OpenAI · GPT 3.5 Turbo | 52 |
| https://developers.openai.com/api/docs/models/gpt-image-2.6-flare | 官方文档 · OpenAI · GPT Image 2.6 Flare<br>渠道资料 · OpenAI · GPT Image 2.6 Flare | 官方文档 · OpenAI · GPT Image 2.6 Flare | 10 |
| https://developers.openai.com/api/docs/models/gpt-image-2.6-sunburst | 官方文档 · OpenAI · GPT Image 2.6 Sunburst<br>渠道资料 · OpenAI · GPT Image 2.6 Sunburst | 官方文档 · OpenAI · GPT Image 2.6 Sunburst | 10 |
| https://developers.openai.com/api/docs/models/o1 | 图研既有核实 · OpenAI · O1<br>官方文档 · OpenAI · O1<br>官方文档 · OpenAI · O1（2024-12-17）<br>渠道资料 · OpenAI · O1 | 官方文档 · OpenAI · O1 | 34 |
| https://developers.openai.com/api/docs/models/o1-pro | 图研既有核实 · OpenAI · O1 Pro<br>官方文档 · OpenAI · O1 Pro<br>官方文档 · OpenAI · O1 Pro（2025-03-19）<br>渠道资料 · OpenAI · O1 Pro | 官方文档 · OpenAI · O1 Pro | 34 |
| https://developers.openai.com/api/docs/models/o3 | 图研既有核实 · OpenAI · O3<br>官方文档 · OpenAI · O3<br>官方文档 · OpenAI · O3（2025-04-16）<br>渠道资料 · OpenAI · O3 | 官方文档 · OpenAI · O3 | 34 |
| https://developers.openai.com/api/docs/models/o3-mini | 图研既有核实 · OpenAI · O3 Mini<br>官方文档 · OpenAI · O3 Mini<br>官方文档 · OpenAI · O3 Mini（2025-01-31）<br>渠道资料 · OpenAI · O3 Mini | 官方文档 · OpenAI · O3 Mini | 32 |
| https://developers.openai.com/api/docs/models/o3-pro | 图研既有核实 · OpenAI · O3 Pro<br>官方文档 · OpenAI · O3 Pro<br>官方文档 · OpenAI · O3 Pro（2025-06-10）<br>渠道资料 · OpenAI · O3 Pro | 官方文档 · OpenAI · O3 Pro | 34 |
| https://developers.openai.com/api/docs/models/o4-mini | 图研既有核实 · OpenAI · O4 Mini<br>官方文档 · OpenAI · O4 Mini<br>官方文档 · OpenAI · O4 Mini（2025-04-16）<br>渠道资料 · OpenAI · O4 Mini | 官方文档 · OpenAI · O4 Mini | 34 |
| https://www.volcengine.com/docs/82379/1330310 | 图研既有核实 · 火山方舟 · 模型列表<br>官方文档 · 火山方舟 · 模型列表<br>官方文档 · 火山方舟 · 模型列表（产品文档） | 渠道资料 · 火山方舟 · 模型列表（产品文档） | 476 |
| https://docs.volcengine.com/docs/ark/model-release-announcement?lang=zh | 图研既有核实 · 火山方舟 · Model Release Announcement<br>官方文档 · 火山方舟 · Model Release Announcement | 渠道资料 · 火山方舟 · Model Release Announcement | 75 |
| https://ark.volcengine.com/region:cn-beijing/docs/deepseek-v4-1-flash | 官方文档 · 火山方舟 · DeepSeek V4.1 Flash | 渠道资料 · 火山方舟 · DeepSeek V4.1 Flash | 2 |
| https://docs.volcengine.com/docs/82379/1159178?lang=zh | 官方文档 · 火山方舟 · 模型发布公告 | 渠道资料 · 火山方舟 · 模型发布公告 | 7 |
| https://docs.volcengine.com/docs/82379/1330310?lang=zh | 官方文档 · 火山方舟 · 模型列表（开发者文档，中文版） | 渠道资料 · 火山方舟 · 模型列表（开发者文档，中文版） | 4 |
| https://docs.volcengine.com/docs/ark/bytedance-seed-1-8?lang=zh | 图研既有核实 · 火山方舟 · Bytedance Seed 1-8<br>官方文档 · 火山方舟 · Bytedance Seed 1-8 | 渠道资料 · 火山方舟 · Bytedance Seed 1-8 | 24 |
| https://docs.volcengine.com/docs/82379/1330310 | 官方文档 · 火山方舟 · 模型列表（开发者文档） | 渠道资料 · 火山方舟 · 模型列表（开发者文档） | 11 |
| https://docs.volcengine.com/docs/ark/seedream-4-0-5-0?lang=zh | 图研既有核实 · 火山方舟 · Seedream 4-0-5-0<br>官方文档 · 火山方舟 · Seedream 4-0-5-0 | 官方文档 · 火山方舟 · Seedream 4-0-5-0 | 120 |
| https://docs.volcengine.com/docs/ark/image-generation-api?lang=en | 官方文档 · 火山方舟 · Image Generation API<br>官方文档 · 火山方舟 · Image Generation API（开发者文档，英文版） | 渠道资料 · 火山方舟 · Image Generation API（开发者文档，英文版） | 6 |
| https://docs.volcengine.com/docs/82379/1824121?lang=zh | 官方文档 · 火山方舟 · 文档 1824121 | 渠道资料 · 火山方舟 · 文档 1824121 | 3 |
| https://docs.volcengine.com/docs/ark/image-generation-api?lang=zh | 官方文档 · 火山方舟 · Image Generation API（开发者文档，中文版） | 渠道资料 · 火山方舟 · Image Generation API（开发者文档，中文版） | 1 |
| https://api.volcengine.com/api-docs/view?action=ImageGenerations&serviceCode=ark&version=2024-01-01 | 官方文档 · 火山方舟 · View | 渠道资料 · 火山方舟 · View | 1 |
| https://docs.volcengine.com/docs/ark/model-release-announcement-2025?lang=en | 图研既有核实 · 火山方舟 · Model Release Announcement 2025<br>官方文档 · 火山方舟 · Model Release Announcement 2025 | 渠道资料 · 火山方舟 · Model Release Announcement 2025 | 24 |
| https://developer.volcengine.com/articles/7577301460712030258 | 官方文档 · 火山方舟 · 豆包编程模型发布公告 | 渠道资料 · 火山方舟 · 豆包编程模型发布公告 | 1 |
| https://docs.volcengine.com/docs/82379/2549861?lang=zh | 官方文档 · 火山方舟 · Seed-Evolving | 渠道资料 · 火山方舟 · Seed-Evolving | 1 |
| https://docs.bfl.ml/api-reference/models/generate-or-edit-an-image-with-flux2-[flex] | 图研既有核实 · BFL · Generate Or Edit An Image With FLUX.2 [flex]<br>官方文档 · BFL · FLUX 2 Flex<br>官方文档 · BFL · FLUX.2 \[flex] | 官方文档 · BFL · Generate Or Edit An Image With FLUX.2 [flex] | 48 |
| https://docs.bfl.ml/api-reference/models/generate-or-edit-an-image-with-flux2-[klein]-4b | 图研既有核实 · BFL · Generate Or Edit An Image With FLUX.2 [klein] 4B<br>官方文档 · BFL · FLUX 2 Klein 4b | 官方文档 · BFL · Generate Or Edit An Image With FLUX.2 [klein] 4B | 24 |
| https://docs.bfl.ml/api-reference/models/generate-or-edit-an-image-with-flux2-[klein]-9b | 图研既有核实 · BFL · Generate Or Edit An Image With FLUX.2 [klein] 9B<br>官方文档 · BFL · FLUX 2 Klein 9b | 官方文档 · BFL · Generate Or Edit An Image With FLUX.2 [klein] 9B | 24 |
| https://docs.bfl.ml/api-reference/models/generate-or-edit-an-image-with-flux2-[klein]-9b-preview | 图研既有核实 · BFL · Generate Or Edit An Image With FLUX 2 Klein 9b Preview<br>官方文档 · BFL · FLUX 2 Klein 9b Preview | 官方文档 · BFL · Generate Or Edit An Image With FLUX 2 Klein 9b Preview | 24 |
| https://docs.bfl.ml/api-reference/models/generate-or-edit-an-image-with-flux2-[max] | 图研既有核实 · BFL · Generate Or Edit An Image With FLUX.2 [max]<br>官方文档 · BFL · FLUX 2 Max | 官方文档 · BFL · Generate Or Edit An Image With FLUX.2 [max] | 24 |
| https://docs.bfl.ml/api-reference/models/generate-or-edit-an-image-with-flux2-[pro] | 图研既有核实 · BFL · Generate Or Edit An Image With FLUX.2 [pro]<br>官方文档 · BFL · FLUX 2 Pro<br>官方文档 · BFL · FLUX.2 \[pro] | 官方文档 · BFL · Generate Or Edit An Image With FLUX.2 [pro] | 48 |
| https://docs.bfl.ml/api-reference/models/generate-or-edit-an-image-with-flux2-[pro]-preview | 图研既有核实 · BFL · Generate Or Edit An Image With FLUX 2 Pro Preview<br>官方文档 · BFL · FLUX 2 Pro Preview | 官方文档 · BFL · Generate Or Edit An Image With FLUX 2 Pro Preview | 24 |
| https://docs.bfl.ml/api-reference/models/edit-or-create-an-image-with-flux1-kontext-[max] | 图研既有核实 · BFL · Edit Or Create An Image With FLUX.1 Kontext [max]<br>官方文档 · BFL · Edit Or Create An Image With FLUX.1 Kontext [max]<br>官方文档 · BFL · Flux.1 Kontext \[max] | 官方文档 · BFL · Edit Or Create An Image With FLUX.1 Kontext [max] | 44 |
| https://docs.bfl.ml/api-reference/models/edit-or-create-an-image-with-flux1-kontext-[pro] | 图研既有核实 · BFL · Edit Or Create An Image With FLUX.1 Kontext [pro]<br>官方文档 · BFL · Edit Or Create An Image With FLUX.1 Kontext [pro]<br>官方文档 · BFL · Flux.1 Kontext \[pro] | 官方文档 · BFL · Edit Or Create An Image With FLUX.1 Kontext [pro] | 44 |
| https://docs.bfl.ml/api-reference/utility/generate-an-image-with-flux-3 | 图研既有核实 · BFL · Generate An Image With FLUX 3<br>官方文档 · BFL · Generate An Image With FLUX 3 | 官方文档 · BFL · Generate An Image With FLUX 3 | 20 |
| https://docs.bfl.ml/api-reference/utility/generate-an-image-with-flux-3-klein | 图研既有核实 · BFL · Generate An Image With FLUX.3 Klein<br>官方文档 · BFL · Generate An Image With FLUX.3 Klein | 官方文档 · BFL · Generate An Image With FLUX.3 Klein | 20 |
| https://docs.bfl.ml/api-reference/models/generate-an-image-with-flux1-[dev] | 图研既有核实 · BFL · Generate An Image With FLUX.1 [dev]<br>官方文档 · BFL · Generate An Image With FLUX.1 [dev] | 官方文档 · BFL · Generate An Image With FLUX.1 [dev] | 20 |
| https://docs.bfl.ml/api-reference/models/generate-an-image-with-flux11-[pro] | 图研既有核实 · BFL · Generate An Image With FLUX.1.1 [pro]<br>官方文档 · BFL · Flux1.1 \[pro]<br>官方文档 · BFL · Generate An Image With FLUX.1.1 [pro] | 官方文档 · BFL · Generate An Image With FLUX.1.1 [pro] | 44 |
| https://docs.bfl.ml/api-reference/models/generate-an-image-with-flux11-[pro]-ultra-mode | 图研既有核实 · BFL · Generate An Image With FLUX.1.1 [pro] Ultra Mode<br>官方文档 · BFL · Generate An Image With FLUX.1.1 [pro] Ultra Mode | 官方文档 · BFL · Generate An Image With FLUX.1.1 [pro] Ultra Mode | 20 |
| https://platform.stability.ai/docs/api-reference | 图研既有核实 · Stability · API 文档<br>官方文档 · Stability · API 文档 | 官方文档 · Stability · API 文档 | 120 |
| https://developer.ideogram.ai/v1/api-reference/edit-images/remix-v4 | 官方文档 · Ideogram · Ideogram 4.0 编辑接口<br>渠道资料 · Ideogram · Ideogram 4.0 编辑接口 | 官方文档 · Ideogram · Ideogram 4.0 编辑接口 | 6 |
| https://developer.ideogram.ai/v2/api-reference/images/generate/ideogram-4 | 图研既有核实 · Ideogram · Ideogram 4<br>官方文档 · Ideogram · Ideogram 4 | 官方文档 · Ideogram · Ideogram 4 | 10 |
| https://developer.ideogram.ai/v2/api-reference/images/generate/ideogram-4-transparent | 图研既有核实 · Ideogram · Ideogram 4 Transparent<br>官方文档 · Ideogram · Ideogram 4 Transparent | 官方文档 · Ideogram · Ideogram 4 Transparent | 20 |
| https://developer.ideogram.ai/v2/api-reference/images/generate/ideogram-3 | 图研既有核实 · Ideogram · Ideogram 3<br>官方文档 · Ideogram · Ideogram 3 | 官方文档 · Ideogram · Ideogram 3 | 20 |
| https://developer.ideogram.ai/v2/api-reference/images/generate/ideogram-3-transparent | 图研既有核实 · Ideogram · Ideogram 3 Transparent<br>官方文档 · Ideogram · Ideogram 3 Transparent | 官方文档 · Ideogram · Ideogram 3 Transparent | 20 |
| https://developer.ideogram.ai/v1/api-reference/legacy-endpoints/generate | 图研既有核实 · Ideogram · Generate<br>官方文档 · Ideogram · Generate<br>官方文档 · Ideogram · Generate（V1 接口，图像生成） | 官方文档 · Ideogram · Generate（V1 接口，图像生成） | 154 |
| https://developer.ideogram.ai/v2/api-reference/images/generate/ideogram-4-5 | 图研既有核实 · Ideogram · Ideogram 4.5<br>官方文档 · Ideogram · Ideogram 4.5<br>官方文档 · Ideogram · Ideogram 4.5（V2 接口，图像生成） | 官方文档 · Ideogram · Ideogram 4.5（V2 接口，图像生成） | 22 |
| https://developer.ideogram.ai/v2/api-reference/images/precise-edit/ideogram-4-5 | 图研既有核实 · Ideogram · Ideogram 4.5<br>官方文档 · Ideogram · Ideogram 4.5 | 官方文档 · Ideogram · Ideogram 4.5 | 20 |
| https://developer.ideogram.ai/v2/api-reference/images/generate/p-image-ideogram | 图研既有核实 · Ideogram · P Image Ideogram<br>官方文档 · Ideogram · P Image Ideogram<br>官方文档 · Ideogram · P Image Ideogram（V2 接口，图像生成） | 官方文档 · Ideogram · P Image Ideogram（V2 接口，图像生成） | 22 |
| https://developer.ideogram.ai/api-reference/generate-images/generate-p-image-ideogram | 官方文档 · Ideogram · P Image Ideogram（API 参考，图像生成） | 官方文档 · Ideogram · Generate P Image Ideogram | 1 |
| https://platform.minimax.cn/docs/api-reference/text-anthropic-api | 图研既有核实 · MiniMax · Text Anthropic API<br>官方文档 · MiniMax · Text Anthropic API | 官方文档 · MiniMax · Text Anthropic API | 60 |
| https://huggingface.co/MiniMaxAI/MiniMax-M2.1 | 图研既有核实 · Hugging Face · MiniMax M2.1<br>官方文档 · Hugging Face · MiniMax M2.1 | 官方文档 · Hugging Face · MiniMax M2.1 | 20 |
| https://huggingface.co/MiniMaxAI/MiniMax-M2 | 图研既有核实 · Hugging Face · MiniMax M2<br>官方文档 · Hugging Face · MiniMax M2 | 官方文档 · Hugging Face · MiniMax M2 | 20 |
| https://platform.minimax.io/docs/guides/text-generation | 图研既有核实 · MiniMax · Text Generation<br>官方文档 · MiniMax · Text Generation<br>官方文档 · MiniMax · Text Generation（国际站） | 官方文档 · MiniMax · Text Generation（国际站） | 22 |
| https://platform.minimax.io/docs/api-reference/image-generation-t2i | 图研既有核实 · MiniMax · Image Generation T2i<br>官方文档 · MiniMax · Image Generation T2i | 官方文档 · MiniMax · Image Generation T2i | 20 |
| https://platform.minimax.cn/docs/api-reference/image-generation-t2i | 图研既有核实 · MiniMax · Image Generation T2i<br>官方文档 · MiniMax · Image Generation T2i<br>官方文档 · MiniMax · Image Generation T2i（中国站） | 官方文档 · MiniMax · Image Generation T2i（中国站） | 22 |
| https://docs.mistral.ai/models/mistral-large-4-0 | 图研既有核实 · Mistral · Mistral Large 4-0<br>官方文档 · Mistral · Mistral Large 4-0 | 官方文档 · Mistral · Mistral Large 4-0 | 20 |
| https://docs.mistral.ai/models/zai-glm-5-3 | 图研既有核实 · Mistral · Zai GLM 5-3<br>官方文档 · Mistral · Zai GLM 5-3 | 官方文档 · Mistral · Zai GLM 5-3 | 20 |
| https://docs.mistral.ai/models/mistral-medium-3-5-26-04 | 图研既有核实 · Mistral · Mistral Medium 3-5-26-04<br>官方文档 · Mistral · Mistral Medium 3-5-26-04 | 官方文档 · Mistral · Mistral Medium 3-5-26-04 | 60 |
| https://docs.mistral.ai/models/zai-glm-5-3-flash | 图研既有核实 · Mistral · Zai GLM 5-3 Flash<br>官方文档 · Mistral · GLM 5.3 Flash | 官方文档 · Mistral · Zai GLM 5-3 Flash | 24 |
| https://docs.mistral.ai/models/zai-glm-5-2 | 图研既有核实 · Mistral · Zai GLM 5-2<br>官方文档 · Mistral · Zai GLM 5-2 | 官方文档 · Mistral · Zai GLM 5-2 | 20 |
| https://docs.mistral.ai/models/codestral-25-08 | 图研既有核实 · Mistral · Codestral（2508）<br>官方文档 · Mistral · Codestral 2508<br>官方文档 · Mistral · Codestral（2508） | 官方文档 · Mistral · Codestral | 48 |
| https://docs.mistral.ai/models/leanstral-1-5 | 图研既有核实 · Mistral · Leanstral 1-5<br>官方文档 · Mistral · Leanstral 1-5 | 官方文档 · Mistral · Leanstral 1-5 | 20 |
| https://docs.mistral.ai/models/ministral-3-14b-25-12 | 图研既有核实 · Mistral · Ministral 3-14b 25-12<br>官方文档 · Mistral · Ministral 3-14b 25-12 | 官方文档 · Mistral · Ministral 3-14b 25-12 | 40 |
| https://docs.mistral.ai/models/ministral-3-3b-25-12 | 图研既有核实 · Mistral · Ministral 3-3b 25-12<br>官方文档 · Mistral · Ministral 3-3b 25-12 | 官方文档 · Mistral · Ministral 3-3b 25-12 | 40 |
| https://docs.mistral.ai/models/ministral-3-8b-25-12 | 图研既有核实 · Mistral · Ministral 3-8b 25-12<br>官方文档 · Mistral · Ministral 3-8b 25-12 | 官方文档 · Mistral · Ministral 3-8b 25-12 | 40 |
| https://docs.mistral.ai/models/mistral-large-3-25-12 | 图研既有核实 · Mistral · Mistral Large 3-25-12<br>官方文档 · Mistral · Mistral Large 3-25-12 | 官方文档 · Mistral · Mistral Large 3-25-12 | 20 |
| https://docs.mistral.ai/models/mistral-small-4-0-26-03 | 图研既有核实 · Mistral · Mistral Small 4-0-26-03<br>官方文档 · Mistral · Mistral Small 4-0-26-03 | 官方文档 · Mistral · Mistral Small 4-0-26-03 | 20 |
| https://docs.together.ai/docs/serverless-models | 官方文档 · Together · Serverless Models | 渠道资料 · Together · Serverless Models | 93 |
| https://docs.together.ai/docs/serverless/models | 图研既有核实 · Together · 模型列表<br>官方文档 · Together · 模型列表 | 渠道资料 · Together · 模型列表 | 168 |
| https://docs.together.ai/docs/inference/images/overview | 官方文档 · Together · Images | 渠道资料 · Together · Images | 5 |
| https://docs.together.ai/docs/inference/images/reference-images | 官方文档 · Together · Reference Images | 渠道资料 · Together · Reference Images | 5 |
| https://docs.together.ai/docs/inference/images/parameters | 官方文档 · Together · Parameters | 渠道资料 · Together · Parameters | 5 |
| https://huggingface.co/prism-ml/Ternary-Bonsai-27B-gguf | 图研既有核实 · Hugging Face · Ternary Bonsai 27B Gguf<br>官方文档 · Hugging Face · Ternary Bonsai 27B Gguf | 官方文档 · Hugging Face · Ternary Bonsai 27B Gguf | 20 |
| https://www.together.ai/models/llama-3-3-70b | 图研既有核实 · Together · Llama 3.3 70B<br>官方文档 · Together · Llama 3.3 70B | 渠道资料 · Together · Llama 3.3 70B | 24 |
| https://developers.openai.com/api/docs/models/gpt-oss-120b | 图研既有核实 · OpenAI · GPT-OSS 120B<br>官方文档 · OpenAI · GPT-OSS 120B | 官方文档 · OpenAI · GPT-OSS 120B | 20 |
| https://fireworks.ai/models/fireworks/glm-5p3 | 官方文档 · Fireworks · GLM 5.3<br>官方文档 · Fireworks · GLM 5.3（模型库）<br>渠道资料 · Fireworks · GLM 5.3 | 渠道资料 · Fireworks · GLM 5.3（模型库） | 8 |
| https://app.fireworks.ai/models/fireworks/glm-5p3 | 官方文档 · Fireworks · GLM 5.3（控制台） | 渠道资料 · Fireworks · GLM 5.3（控制台） | 1 |
| https://fireworks.ai/models/fireworks/glm-5p3-flash | 官方文档 · Fireworks · GLM 5.3 Flash<br>官方文档 · Fireworks · GLM 5.3 Flash（模型库）<br>渠道资料 · Fireworks · GLM 5.3 Flash | 渠道资料 · Fireworks · GLM 5.3 Flash（模型库） | 10 |
| https://app.fireworks.ai/models/fireworks/glm-5p3-flash | 官方文档 · Fireworks · GLM 5.3 Flash（控制台） | 渠道资料 · Fireworks · GLM 5.3 Flash（控制台） | 1 |
| https://fireworks.ai/models/fireworks/kimi-k3 | 官方文档 · Fireworks · Kimi K3<br>官方文档 · Fireworks · Kimi K3（模型库）<br>渠道资料 · Fireworks · Kimi K3 | 渠道资料 · Fireworks · Kimi K3（模型库） | 10 |
| https://app.fireworks.ai/models/fireworks/kimi-k3 | 官方文档 · Fireworks · Kimi K3（控制台） | 渠道资料 · Fireworks · Kimi K3（控制台） | 1 |
| https://fireworks.ai/models/fireworks/kimi-k2p5 | 官方文档 · Fireworks · Kimi K2.5<br>官方文档 · Fireworks · Kimi K2.5（模型库）<br>渠道资料 · Fireworks · Kimi K2.5 | 渠道资料 · Fireworks · Kimi K2.5（模型库） | 10 |
| https://app.fireworks.ai/models/fireworks/kimi-k2p5 | 官方文档 · Fireworks · Kimi K2.5（控制台） | 渠道资料 · Fireworks · Kimi K2.5（控制台） | 1 |
| https://fireworks.ai/models/fireworks/minimax-m3 | 官方文档 · Fireworks · MiniMax M3<br>官方文档 · Fireworks · MiniMax M3（模型库）<br>渠道资料 · Fireworks · MiniMax M3 | 渠道资料 · Fireworks · MiniMax M3（模型库） | 8 |
| https://app.fireworks.ai/models/fireworks/minimax-m3 | 官方文档 · Fireworks · MiniMax M3（控制台） | 渠道资料 · Fireworks · MiniMax M3（控制台） | 1 |
| https://fireworks.ai/models/fireworks/qwen3p8-max | 官方文档 · Fireworks · Qwen 3.8 Max<br>官方文档 · Fireworks · Qwen 3.8 Max（模型库）<br>渠道资料 · Fireworks · Qwen3.8 Max | 渠道资料 · Fireworks · Qwen3.8 Max（模型库） | 10 |
| https://app.fireworks.ai/models/fireworks/qwen3p8-max | 官方文档 · Fireworks · Qwen 3.8 Max（控制台） | 渠道资料 · Fireworks · Qwen3.8 Max（控制台） | 1 |
| https://fireworks.ai/models/fireworks/qwen3p7-plus | 官方文档 · Fireworks · Qwen 3.7 Plus<br>官方文档 · Fireworks · Qwen 3.7 Plus（模型库）<br>渠道资料 · Fireworks · Qwen3.7 Plus | 渠道资料 · Fireworks · Qwen3.7 Plus（模型库） | 10 |
| https://app.fireworks.ai/models/fireworks/qwen3p7-plus | 官方文档 · Fireworks · Qwen 3.7 Plus（控制台） | 渠道资料 · Fireworks · Qwen3.7 Plus（控制台） | 1 |
| https://fireworks.ai/models/fireworks/qwen3-8b | 官方文档 · Fireworks · Qwen3 8B<br>官方文档 · Fireworks · Qwen3 8B（模型库）<br>渠道资料 · Fireworks · Qwen3 8B | 渠道资料 · Fireworks · Qwen3 8B（模型库） | 8 |
| https://app.fireworks.ai/models/fireworks/qwen3-8b | 官方文档 · Fireworks · Qwen3 8B（控制台） | 渠道资料 · Fireworks · Qwen3 8B（控制台） | 1 |
| https://fireworks.ai/models/deepseek-ai/deepseek-v4p1-flash | 官方文档 · Fireworks · DeepSeek-V4.1-Flash<br>渠道资料 · Fireworks · DeepSeek V4.1 Flash | 渠道资料 · Fireworks · DeepSeek V4.1 Flash（模型库） | 10 |
| https://fireworks.ai/models/deepseek-ai/deepseek-v4p1-flash-1017 | 图研既有核实 · Fireworks · DeepSeek V4.1 Flash 1017<br>官方文档 · Fireworks · DeepSeek V4.1 Flash 1017 | 渠道资料 · Fireworks · DeepSeek V4.1 Flash 1017（模型库） | 24 |
| https://fireworks.ai/models | 官方文档 · Fireworks · 模型列表 | 渠道资料 · Fireworks · 模型列表 | 1 |
| https://fireworks.ai/models/fireworks/gemma-4-31b-it | 官方文档 · Fireworks · Gemma 4-31b It<br>官方文档 · Fireworks · Gemma 4-31b It（模型库）<br>渠道资料 · Fireworks · Gemma 4-31b It | 渠道资料 · Fireworks · Gemma 4-31b It（模型库） | 10 |
| https://app.fireworks.ai/models/fireworks/gemma-4-31b-it | 官方文档 · Fireworks · Gemma 4-31b It（控制台） | 渠道资料 · Fireworks · Gemma 4-31b It（控制台） | 1 |
| https://fireworks.ai/models/fireworks/gpt-oss-120b | 官方文档 · Fireworks · GPT-OSS 120B<br>官方文档 · Fireworks · GPT-OSS 120B（模型库）<br>渠道资料 · Fireworks · GPT-OSS 120B | 渠道资料 · Fireworks · GPT-OSS 120B（模型库） | 8 |
| https://app.fireworks.ai/models/fireworks/gpt-oss-120b | 官方文档 · Fireworks · GPT-OSS 120B（控制台） | 渠道资料 · Fireworks · GPT-OSS 120B（控制台） | 1 |
| https://fireworks.ai/models/fireworks/kimi-k3p1-pro | 官方文档 · Fireworks · Kimi K3.1 Pro | 渠道资料 · Fireworks · Kimi K3.1 Pro（模型库） | 4 |
| https://fireworks.ai/models/fireworks/minimax-m3p1-flash | 图研既有核实 · Fireworks · MiniMax M3.1 Flash<br>官方文档 · Fireworks · MiniMax M3.1 Flash | 渠道资料 · Fireworks · MiniMax M3.1 Flash（模型库） | 24 |
| https://fireworks.ai/models/fireworks/muse-spark-open | 图研既有核实 · Fireworks · Muse Spark Open<br>官方文档 · Fireworks · Muse Spark Open | 渠道资料 · Fireworks · Muse Spark Open（模型库） | 24 |
| https://fireworks.ai/models/fireworks/nemotron-3-ultra-nvfp4 | 官方文档 · Fireworks · Nemotron 3 Ultra Nvfp4<br>官方文档 · Fireworks · Nemotron 3 Ultra Nvfp4（模型库）<br>渠道资料 · Fireworks · Nemotron 3 Ultra Nvfp4 | 渠道资料 · Fireworks · Nemotron 3 Ultra Nvfp4（模型库） | 8 |
| https://app.fireworks.ai/models/fireworks/nemotron-3-ultra-nvfp4 | 图研既有核实 · Fireworks · Nemotron 3 Ultra Nvfp4<br>官方文档 · Fireworks · Nemotron 3 Ultra Nvfp4（控制台） | 渠道资料 · Fireworks · Nemotron 3 Ultra Nvfp4（控制台） | 6 |
| https://fireworks.ai/models/fireworks/nemotron-lightning-3p5-30b-a3b | 官方文档 · Fireworks · Nemotron Lightning 3p5-30b A3b<br>官方文档 · Fireworks · Nemotron Lightning 3p5-30b A3b（模型库）<br>渠道资料 · Fireworks · Nemotron Lightning 3p5-30b A3b | 渠道资料 · Fireworks · Nemotron Lightning 3p5-30b A3b（模型库） | 8 |
| https://app.fireworks.ai/models/fireworks/nemotron-lightning-3p5-30b-a3b | 官方文档 · Fireworks · Nemotron Lightning 3p5-30b A3b（控制台） | 渠道资料 · Fireworks · Nemotron Lightning 3p5-30b A3b（控制台） | 1 |
| https://fireworks.ai/models/fireworks/nvidia-nemotron-3-nano-omni-30b-a3b | 官方文档 · Fireworks · NVIDIA Nemotron 3 Nano Omni 30B A3B<br>官方文档 · Fireworks · NVIDIA Nemotron 3 Nano Omni 30B A3B（模型库）<br>渠道资料 · Fireworks · NVIDIA Nemotron 3 Nano Omni 30B A3B | 渠道资料 · Fireworks · NVIDIA Nemotron 3 Nano Omni 30B A3B（模型库） | 8 |
| https://app.fireworks.ai/models/fireworks/nvidia-nemotron-3-nano-omni-30b-a3b | 官方文档 · Fireworks · NVIDIA Nemotron 3 Nano Omni 30B A3B（控制台） | 渠道资料 · Fireworks · NVIDIA Nemotron 3 Nano Omni 30B A3B（控制台） | 1 |
| https://fireworks.ai/models/fireworks/qwen3-omni-30b-a3b-instruct | 官方文档 · Fireworks · Qwen3 Omni 30B A3B Instruct<br>官方文档 · Fireworks · Qwen3 Omni 30B A3B Instruct（模型库）<br>渠道资料 · Fireworks · Qwen3 Omni 30B A3B Instruct | 渠道资料 · Fireworks · Qwen3 Omni 30B A3B Instruct（模型库） | 10 |
| https://app.fireworks.ai/models/fireworks/qwen3-omni-30b-a3b-instruct | 官方文档 · Fireworks · Qwen3 Omni 30B A3B Instruct（控制台） | 渠道资料 · Fireworks · Qwen3 Omni 30B A3B Instruct（控制台） | 1 |
| https://fireworks.ai/models/fireworks/step-3p7-flash-nvfp4 | 官方文档 · Fireworks · Step 3.7 Flash（NVFP4）<br>官方文档 · Fireworks · Step 3.7 Flash（NVFP4）（模型库）<br>渠道资料 · Fireworks · Step 3.7 Flash（NVFP4） | 渠道资料 · Fireworks · Step 3.7 Flash（NVFP4）（模型库） | 10 |
| https://app.fireworks.ai/models/fireworks/step-3p7-flash-nvfp4 | 图研既有核实 · Fireworks · Step 3.7 Flash（NVFP4）<br>官方文档 · Fireworks · Step 3.7 Flash（NVFP4）（控制台） | 渠道资料 · Fireworks · Step 3.7 Flash（NVFP4）（控制台） | 6 |
| https://fal.ai/models/alibaba/qwen-image-3/text-to-image/api | 官方文档 · fal · Qwen Image 3 API 文档<br>渠道资料 · fal · Qwen Image 3 Text To Image API 文档 | 渠道资料 · fal · Qwen Image 3 API 文档 | 12 |
| https://fal.ai/models/bytedance/seedream/v5/flash/edit/api | 官方文档 · fal · Seedream v5 Flash 编辑接口<br>渠道资料 · fal · Seedream v5 Flash 编辑接口 | 渠道资料 · fal · Seedream V5 Flash Edit API 文档 | 10 |
| https://fal.ai/models/bytedance/seedream/v5/flash/text-to-image/api | 图研既有核实 · fal · Seedream v5 Flash Text To Image API 文档<br>官方文档 · fal · Seedream v5 Flash API 文档 | 渠道资料 · fal · Seedream V5 Flash API 文档 | 11 |
| https://fal.ai/models/bytedance/seedream/v5/pro/edit/api | 官方文档 · fal · Seedream v5 pro 编辑接口<br>渠道资料 · fal · Seedream v5 pro 编辑接口 | 渠道资料 · fal · Seedream V5 Pro Edit API 文档 | 10 |
| https://fal.ai/models/bytedance/seedream/v5/pro/text-to-image/api | 官方文档 · fal · Seedream（v5，pro） API 文档<br>渠道资料 · fal · Seedream（v5，pro Text To Image API 文档） | 渠道资料 · fal · Seedream V5 Pro API 文档 | 7 |
| https://fal.ai/models/fal-ai/bytedance/seedream/v5/lite/edit/api | 图研既有核实 · fal · Bytedance Seedream（v5，lite，edit API 文档）<br>官方文档 · fal · Seedream（v5，lite，edit） API 文档 | 渠道资料 · fal · Seedream V5 Lite Edit API 文档 | 24 |
| https://fal.ai/models/fal-ai/bytedance/seedream/v4.5/edit/api | 官方文档 · fal · Seedream v4.5 编辑接口<br>渠道资料 · fal · Seedream v4.5 编辑接口 | 渠道资料 · fal · Seedream V4.5 Edit API 文档 | 10 |
| https://fal.ai/models/fal-ai/bytedance/seedream/v4.5/text-to-image/api | 官方文档 · fal · Seedream（v4.5） API 文档<br>渠道资料 · fal · Bytedance Seedream（v4.5 Text To Image API 文档） | 渠道资料 · fal · Seedream V4.5 API 文档 | 7 |
| https://fal.ai/models/fal-ai/bytedance/seedream/v4/edit/api | 官方文档 · fal · Seedream v4 编辑接口<br>渠道资料 · fal · Seedream v4 编辑接口 | 渠道资料 · fal · Seedream V4 Edit API 文档 | 10 |
| https://fal.ai/models/fal-ai/bytedance/seedream/v4/text-to-image/api | 官方文档 · fal · Seedream（v4） API 文档<br>渠道资料 · fal · Bytedance Seedream V4 Text To Image API 文档 | 渠道资料 · fal · Seedream V4 API 文档 | 7 |
| https://fal.ai/models/fal-ai/fast-sdxl/api | 官方文档 · fal · Fast SDXL API 文档<br>渠道资料 · fal · Fast SDXL API 文档 | 渠道资料 · fal · Fast SDXL API 文档 | 4 |
| https://fal.ai/models/fal-ai/flux-2/api | 官方文档 · fal · FLUX-2 API 文档<br>渠道资料 · fal · FLUX.2 API 文档 | 渠道资料 · fal · FLUX 2 API 文档 | 12 |
| https://fal.ai/models/fal-ai/flux-2-flex/api | 官方文档 · fal · FLUX 2 Flex API 文档<br>渠道资料 · fal · FLUX.2 [flex] API 文档 | 渠道资料 · fal · FLUX 2 Flex API 文档 | 12 |
| https://fal.ai/models/fal-ai/flux-2-pro/edit/api | 官方文档 · fal · FLUX 2 Pro 编辑接口<br>渠道资料 · fal · FLUX 2 Pro 编辑接口 | 渠道资料 · fal · FLUX 2 Pro Edit API 文档 | 10 |
| https://fal.ai/models/fal-ai/flux-2-pro/api | 官方文档 · fal · FLUX 2 Pro API 文档<br>渠道资料 · fal · FLUX.2 [pro] API 文档 | 渠道资料 · fal · FLUX 2 Pro API 文档 | 7 |
| https://fal.ai/models/fal-ai/flux-2/flash/api | 官方文档 · fal · FLUX-2（flash） API 文档<br>渠道资料 · fal · FLUX-2（flash API 文档） | 渠道资料 · fal · FLUX 2 Flash API 文档 | 12 |
| https://fal.ai/models/fal-ai/flux-2/klein/9b/api | 官方文档 · fal · FLUX-2（klein，9b） API 文档<br>渠道资料 · fal · FLUX.2 [klein] 9B API 文档 | 渠道资料 · fal · FLUX 2 Klein 9b API 文档 | 12 |
| https://fal.ai/models/fal-ai/flux-2/turbo/api | 官方文档 · fal · FLUX-2（turbo） API 文档<br>渠道资料 · fal · FLUX-2（turbo API 文档） | 渠道资料 · fal · FLUX 2 Turbo API 文档 | 12 |
| https://fal.ai/models/fal-ai/flux-kontext-lora/api | 官方文档 · fal · FLUX Kontext LoRA API 文档<br>渠道资料 · fal · FLUX Kontext LoRA API 文档 | 渠道资料 · fal · FLUX Kontext LoRA API 文档 | 4 |
| https://fal.ai/models/fal-ai/flux-pro/kontext/api | 官方文档 · fal · FLUX Pro（Kontext） API 文档<br>渠道资料 · fal · FLUX Pro Kontext API 文档 | 渠道资料 · fal · FLUX Pro Kontext API 文档 | 4 |
| https://fal.ai/models/fal-ai/flux-pro/v1.1/api | 官方文档 · fal · FLUX Pro（V1.1） API 文档<br>渠道资料 · fal · FLUX Pro（V1.1 API 文档） | 渠道资料 · fal · FLUX Pro V1.1 API 文档 | 12 |
| https://fal.ai/models/fal-ai/flux-pro/v1.1-ultra/api | 官方文档 · fal · FLUX Pro（V1.1 Ultra） API 文档<br>渠道资料 · fal · FLUX Pro（V1.1 Ultra API 文档） | 渠道资料 · fal · FLUX Pro V1.1 Ultra API 文档 | 8 |
| https://fal.ai/models/blackforestlabs/flux-3/klein/base/edit-image/api | 官方文档 · fal · FLUX.3 Klein Base 编辑接口<br>渠道资料 · fal · FLUX.3 Klein Base 编辑接口 | 渠道资料 · fal · FLUX.3 Klein Base Edit API 文档 | 10 |
| https://fal.ai/models/blackforestlabs/flux-3/klein/base/text-to-image/api | 图研既有核实 · fal · FLUX.3 Klein Base Text To Image API 文档<br>官方文档 · fal · FLUX.3 Klein Base API 文档 | 渠道资料 · fal · FLUX.3 Klein Base API 文档 | 11 |
| https://fal.ai/models/blackforestlabs/flux-3/klein/edit-image/api | 官方文档 · fal · FLUX.3 Klein 编辑接口<br>渠道资料 · fal · FLUX.3 Klein 编辑接口 | 渠道资料 · fal · FLUX.3 Klein Edit API 文档 | 10 |
| https://fal.ai/models/blackforestlabs/flux-3/klein/text-to-image/api | 图研既有核实 · fal · FLUX.3 Klein Text To Image API 文档<br>官方文档 · fal · FLUX.3 Klein API 文档 | 渠道资料 · fal · FLUX.3 Klein API 文档 | 11 |
| https://fal.ai/models/blackforestlabs/flux-3/edit-image/api | 官方文档 · fal · FLUX.3 编辑接口<br>渠道资料 · fal · FLUX.3 编辑接口 | 渠道资料 · fal · FLUX.3 Edit API 文档 | 10 |
| https://fal.ai/models/blackforestlabs/flux-3/text-to-image/api | 图研既有核实 · fal · FLUX 3 Text To Image API 文档<br>官方文档 · fal · FLUX.3 API 文档 | 渠道资料 · fal · FLUX.3 API 文档 | 11 |
| https://fal.ai/models/fal-ai/flux-1/schnell/api | 官方文档 · fal · FLUX-1（schnell） API 文档<br>渠道资料 · fal · FLUX.1 [schnell] API 文档 | 渠道资料 · fal · FLUX 1 Schnell API 文档 | 12 |
| https://fal.ai/models/fal-ai/flux-lora/api | 官方文档 · fal · FLUX LoRA API 文档<br>渠道资料 · fal · FLUX LoRA API 文档 | 渠道资料 · fal · FLUX LoRA API 文档 | 4 |
| https://fal.ai/models/fal-ai/flux/dev/api | 官方文档 · fal · FLUX（dev） API 文档<br>渠道资料 · fal · FLUX Dev API 文档 | 渠道资料 · fal · FLUX Dev API 文档 | 4 |
| https://fal.ai/models/fal-ai/flux/schnell/api | 官方文档 · fal · FLUX（schnell） API 文档<br>渠道资料 · fal · FLUX Schnell API 文档 | 渠道资料 · fal · FLUX Schnell API 文档 | 4 |
| https://fal.ai/models/fal-ai/ideogram/v3/api | 官方文档 · fal · Ideogram V3 API 文档<br>渠道资料 · fal · Ideogram V3 API 文档 | 渠道资料 · fal · Ideogram V3 API 文档 | 4 |
| https://fal.ai/models/fal-ai/nano-banana-2/api | 官方文档 · fal · Nano Banana 2 API 文档 | 渠道资料 · fal · Nano Banana 2 API 文档 | 1 |
| https://fal.ai/models/fal-ai/qwen-image/api | 官方文档 · fal · Qwen Image API 文档<br>渠道资料 · fal · Qwen Image API 文档 | 渠道资料 · fal · Qwen Image API 文档 | 4 |
| https://fal.ai/models/fal-ai/recraft/v4/pro/text-to-image/api | 官方文档 · fal · Recraft V4 Pro API 文档<br>渠道资料 · fal · Recraft V4 Pro Text To Image API 文档 | 渠道资料 · fal · Recraft V4 Pro API 文档 | 12 |
| https://fal.ai/models/fal-ai/recraft/v3/text-to-image/api | 官方文档 · fal · Recraft V3 API 文档<br>渠道资料 · fal · Recraft V3 Text To Image API 文档 | 渠道资料 · fal · Recraft V3 API 文档 | 12 |
| https://fal.ai/models/google/nano-banana-2-lite/api | 官方文档 · fal · Nano Banana 2 Lite API 文档 | 渠道资料 · fal · Nano Banana 2 Lite API 文档 | 1 |
| https://fal.ai/models/fal-ai/nano-banana-pro/api | 官方文档 · fal · Nano Banana Pro API 文档 | 渠道资料 · fal · Nano Banana Pro API 文档 | 1 |
| https://fal.ai/models/fal-ai/nano-banana/api | 官方文档 · fal · Nano Banana API 文档 | 渠道资料 · fal · Nano Banana API 文档 | 1 |
| https://fal.ai/models/google/nano-banana-2.1/api | 官方文档 · fal · Nano Banana 2.1 API 文档<br>渠道资料 · fal · Nano Banana 2.1 API 文档 | 渠道资料 · fal · Nano Banana 2.1 API 文档 | 4 |
| https://fal.ai/models/google/nano-banana-2.1/edit/api | 官方文档 · fal · Nano Banana 2.1 Edit API 文档 | 渠道资料 · fal · Nano Banana 2.1 Edit API 文档 | 1 |
| https://fal.ai/models/openai/gpt-image-2.5/flare/edit/api | 官方文档 · fal · GPT Image 2.5 Flare 编辑接口<br>渠道资料 · fal · GPT Image 2.5 Flare 编辑接口 | 渠道资料 · fal · GPT Image 2.5 Flare Edit API 文档 | 10 |
| https://fal.ai/models/openai/gpt-image-2.5/flare/text-to-image/api | 官方文档 · fal · GPT Image 2.5 Flare API 文档<br>渠道资料 · fal · GPT Image 2.5 Flare Text To Image API 文档 | 渠道资料 · fal · GPT Image 2.5 Flare API 文档 | 7 |
| https://fal.ai/models/openai/gpt-image-2.5/sunburst/edit/api | 官方文档 · fal · GPT Image 2.5 Sunburst 编辑接口<br>渠道资料 · fal · GPT Image 2.5 Sunburst 编辑接口 | 渠道资料 · fal · GPT Image 2.5 Sunburst Edit API 文档 | 10 |
| https://fal.ai/models/openai/gpt-image-2.5/sunburst/text-to-image/api | 官方文档 · fal · GPT Image 2.5 Sunburst API 文档<br>渠道资料 · fal · GPT Image 2.5 Sunburst Text To Image API 文档 | 渠道资料 · fal · GPT Image 2.5 Sunburst API 文档 | 7 |
| https://fal.ai/models/openai/gpt-image-2/api | 官方文档 · fal · GPT Image 2 API 文档<br>渠道资料 · fal · GPT Image 2 API 文档 | 渠道资料 · fal · GPT Image 2 API 文档 | 4 |
| https://fal.ai/models/fal-ai/gpt-image-1.5/api | 官方文档 · fal · GPT Image 1.5 API 文档<br>渠道资料 · fal · GPT Image 1.5 API 文档 | 渠道资料 · fal · GPT Image 1.5 API 文档 | 4 |
| https://fal.ai/models/xai/grok-imagine-image/v2.0/text-to-image/api | 官方文档 · fal · Grok Imagine Image（V2.0） API 文档<br>渠道资料 · fal · Grok Imagine Image（V2.0 Text To Image API 文档） | 渠道资料 · fal · Grok Imagine Image V2.0 API 文档 | 12 |
| https://fal.ai/models/xai/grok-imagine-image/edit/api | 官方文档 · fal · Grok Imagine Image 编辑接口<br>渠道资料 · fal · Grok Imagine Image 编辑接口 | 渠道资料 · fal · Grok Imagine Image Edit API 文档 | 10 |
| https://fal.ai/models/xai/grok-imagine-image/api | 官方文档 · fal · Grok Imagine Image API 文档<br>渠道资料 · fal · Grok Imagine Image API 文档 | 渠道资料 · fal · Grok Imagine Image API 文档 | 3 |
| https://fal.ai/models/xai/grok-imagine-image/quality/edit/api | 官方文档 · fal · Grok Imagine Image Quality 编辑接口<br>渠道资料 · fal · Grok Imagine Image Quality 编辑接口 | 渠道资料 · fal · Grok Imagine Image Quality Edit API 文档 | 10 |
| https://fal.ai/models/xai/grok-imagine-image/quality/text-to-image/api | 官方文档 · fal · Grok Imagine Image（Quality） API 文档<br>渠道资料 · fal · Grok Imagine Image Quality Text To Image API 文档 | 渠道资料 · fal · Grok Imagine Image Quality API 文档 | 7 |
| https://fal.ai/models/bria/fibo-edit-1.5/edit/api | 官方文档 · fal · Fibo Edit 1.5（Edit） API 文档<br>渠道资料 · fal · Fibo Edit 1.5（Edit API 文档） | 渠道资料 · fal · Fibo Edit 1.5 Edit API 文档 | 14 |
| https://fal.ai/models/bria/fibo-gen-1.5/text-to-image/api | 官方文档 · fal · Fibo Gen 1.5 API 文档<br>渠道资料 · fal · Fibo Gen 1.5 Text To Image API 文档 | 渠道资料 · fal · Fibo Gen 1.5 API 文档 | 12 |
| https://fal.ai/models/fal-ai/krea-2/turbo/api | 官方文档 · fal · Krea 2（Turbo） API 文档<br>渠道资料 · fal · Krea 2（Turbo API 文档） | 渠道资料 · fal · Krea 2 Turbo API 文档 | 12 |
| https://fal.ai/models/fal-ai/z-image/turbo/api | 官方文档 · fal · Z Image（Turbo） API 文档<br>渠道资料 · fal · Z Image Turbo API 文档 | 渠道资料 · fal · Z Image Turbo API 文档 | 4 |
| https://fal.ai/models/ideogram/v4.5/api | 图研既有核实 · fal · V4.5 API 文档<br>官方文档 · fal · Ideogram 4.5 API 文档 | 渠道资料 · fal · Ideogram 4.5 API 文档 | 24 |
| https://fal.ai/models/ideogram/v4.5/edit/api | 官方文档 · fal · V4.5 Edit API 文档 | 渠道资料 · fal · Ideogram 4.5 Edit API 文档 | 1 |
| https://fal.ai/models/imagineart/imagineart-2.0-preview/text-to-image/api | 图研既有核实 · fal · Imagineart 2.0 Preview Text To Image API 文档<br>官方文档 · fal · Imagineart 2.0 Preview API 文档 | 渠道资料 · fal · Imagineart 2.0 Preview API 文档 | 24 |
| https://fal.ai/models/krea/v2/large/text-to-image/api | 官方文档 · fal · Krea V2 Large API 文档<br>渠道资料 · fal · V2 Large Text To Image API 文档 | 渠道资料 · fal · Krea V2 Large API 文档 | 12 |
| https://fal.ai/models/krea/v3/edit/api | 官方文档 · fal · Krea 3 编辑接口<br>渠道资料 · fal · Krea 3 编辑接口 | 渠道资料 · fal · Krea 3 Edit API 文档 | 10 |
| https://fal.ai/models/krea/v3/text-to-image/api | 图研既有核实 · fal · V3 Text To Image API 文档<br>官方文档 · fal · Krea 3 API 文档 | 渠道资料 · fal · Krea 3 API 文档 | 11 |
| https://fal.ai/models/meta/muse-image/edit/api | 官方文档 · fal · Muse Image 编辑接口<br>渠道资料 · fal · Muse Image 编辑接口 | 渠道资料 · fal · Muse Image Edit API 文档 | 10 |
| https://fal.ai/models/meta/muse-image/text-to-image/api | 官方文档 · fal · Muse Image API 文档<br>渠道资料 · fal · Muse Image Text To Image API 文档 | 渠道资料 · fal · Muse Image API 文档 | 7 |
| https://replicate.com/google/gemini-3.5-flash | 官方文档 · Replicate · Gemini 3.5 Flash | 渠道资料 · Replicate · Gemini 3.5 Flash | 1 |
| https://huggingface.co/deepseek-ai/DeepSeek-V3.1 | 图研既有核实 · Hugging Face · DeepSeek V3.1<br>官方文档 · Hugging Face · DeepSeek V3.1 | 官方文档 · Hugging Face · DeepSeek V3.1 | 20 |
| https://replicate.com/deepseek-ai/deepseek-v3.1 | 官方文档 · Replicate · DeepSeek V3.1 | 渠道资料 · Replicate · DeepSeek V3.1 | 1 |
| https://replicate.com/alibaba/qwen-image-3 | 官方文档 · Replicate · Qwen Image 3 | 渠道资料 · Replicate · Qwen Image 3 | 4 |
| https://replicate.com/collections/official | 官方文档 · Replicate · Official | 渠道资料 · Replicate · Official | 97 |
| https://replicate.com/alibaba/qwen-image-3/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/alibaba/qwen-image-3-pro | 官方文档 · Replicate · Qwen Image 3 Pro | 渠道资料 · Replicate · Qwen Image 3 Pro | 4 |
| https://replicate.com/alibaba/qwen-image-3-pro/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/alibaba/wan-3 | 官方文档 · Replicate · Wan 3 | 渠道资料 · Replicate · Wan 3 | 4 |
| https://replicate.com/alibaba/wan-3/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/anthropic/claude-opus-5.5 | 官方文档 · Replicate · Claude Opus 5.5 | 渠道资料 · Replicate · Claude Opus 5.5 | 4 |
| https://replicate.com/anthropic/claude-opus-5.5/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/black-forest-labs/flux-2-flex | 官方文档 · Replicate · FLUX 2 Flex | 渠道资料 · Replicate · FLUX 2 Flex | 4 |
| https://replicate.com/black-forest-labs/flux-2-flex/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/black-forest-labs/flux-2-klein-4b | 官方文档 · Replicate · FLUX 2 Klein 4b | 渠道资料 · Replicate · FLUX 2 Klein 4b | 4 |
| https://replicate.com/black-forest-labs/flux-2-klein-4b/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/black-forest-labs/flux-2-max | 官方文档 · Replicate · FLUX 2 Max | 渠道资料 · Replicate · FLUX 2 Max | 4 |
| https://replicate.com/black-forest-labs/flux-2-max/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/black-forest-labs/flux-2-pro | 官方文档 · Replicate · FLUX 2 Pro | 渠道资料 · Replicate · FLUX 2 Pro | 4 |
| https://replicate.com/black-forest-labs/flux-2-pro/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/black-forest-labs/flux-kontext-dev | 官方文档 · Replicate · FLUX Kontext Dev | 渠道资料 · Replicate · FLUX Kontext Dev | 4 |
| https://replicate.com/black-forest-labs/flux-kontext-dev/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/black-forest-labs/flux-kontext-max | 官方文档 · Replicate · FLUX Kontext Max | 渠道资料 · Replicate · FLUX Kontext Max | 4 |
| https://replicate.com/black-forest-labs/flux-kontext-max/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/black-forest-labs/flux-kontext-pro | 官方文档 · Replicate · FLUX Kontext Pro | 渠道资料 · Replicate · FLUX Kontext Pro | 4 |
| https://replicate.com/bytedance/seedream-5-lite | 官方文档 · Replicate · Seedream 5 Lite | 渠道资料 · Replicate · Seedream 5 Lite | 4 |
| https://replicate.com/bytedance/seedream-5-lite/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/bytedance/seedream-4.5 | 官方文档 · Replicate · Seedream-4.5 | 渠道资料 · Replicate · Seedream-4.5 | 4 |
| https://replicate.com/bytedance/seedream-4.5/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/bytedance/seedream-4 | 官方文档 · Replicate · Seedream-4 | 渠道资料 · Replicate · Seedream-4 | 4 |
| https://replicate.com/bytedance/seedream-4/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/bytedance/seedream-3 | 官方文档 · Replicate · Seedream-3 | 渠道资料 · Replicate · Seedream-3 | 4 |
| https://replicate.com/bytedance/seedream-3/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/google/gemini-3-flash | 官方文档 · Replicate · Gemini 3 Flash | 渠道资料 · Replicate · Gemini 3 Flash | 4 |
| https://replicate.com/google/gemini-3-flash/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/google/gemini-2.5-flash | 官方文档 · Replicate · Gemini 2.5 Flash | 渠道资料 · Replicate · Gemini 2.5 Flash | 1 |
| https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/4-0-generate | 原厂规格 · Google Cloud · 4-0 Generate | 官方文档 · Google Cloud · 4-0 Generate | 12 |
| https://replicate.com/google/imagen-4/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/google/imagen-4-fast/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/google/imagen-4-ultra/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/3-0-generate | 原厂规格 · Google Cloud · 3-0 Generate | 官方文档 · Google Cloud · 3-0 Generate | 8 |
| https://replicate.com/google/imagen-3/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/google/imagen-3-fast/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/google/nano-banana-2 | 官方文档 · Replicate · Nano Banana 2 | 渠道资料 · Replicate · Nano Banana 2 | 1 |
| https://replicate.com/google/nano-banana-2-lite | 官方文档 · Replicate · Nano Banana 2 Lite | 渠道资料 · Replicate · Nano Banana 2 Lite | 1 |
| https://replicate.com/google/nano-banana-pro | 官方文档 · Replicate · Nano Banana Pro | 渠道资料 · Replicate · Nano Banana Pro | 1 |
| https://replicate.com/google/nano-banana | 官方文档 · Replicate · Nano Banana | 渠道资料 · Replicate · Nano Banana | 1 |
| https://replicate.com/google/nano-banana-2.1 | 官方文档 · Replicate · Nano Banana 2.1 | 渠道资料 · Replicate · Nano Banana 2.1 | 4 |
| https://replicate.com/ideogram-ai/ideogram-v3-balanced | 官方文档 · Replicate · Ideogram V3 Balanced | 渠道资料 · Replicate · Ideogram V3 Balanced | 4 |
| https://replicate.com/ideogram-ai/ideogram-v3-balanced/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/ideogram-ai/ideogram-v3-quality | 官方文档 · Replicate · Ideogram V3 Quality | 渠道资料 · Replicate · Ideogram V3 Quality | 4 |
| https://replicate.com/ideogram-ai/ideogram-v3-quality/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/ideogram-ai/ideogram-v3-turbo | 官方文档 · Replicate · Ideogram V3 Turbo | 渠道资料 · Replicate · Ideogram V3 Turbo | 4 |
| https://replicate.com/ideogram-ai/ideogram-v3-turbo/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/ideogram-ai/ideogram-v2a | 官方文档 · Replicate · Ideogram V2a | 渠道资料 · Replicate · Ideogram V2a | 4 |
| https://replicate.com/ideogram-ai/ideogram-v2a/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/ideogram-ai/ideogram-v2a-turbo | 官方文档 · Replicate · Ideogram V2a Turbo | 渠道资料 · Replicate · Ideogram V2a Turbo | 4 |
| https://replicate.com/ideogram-ai/ideogram-v2a-turbo/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/ideogram-ai/ideogram-v2 | 官方文档 · Replicate · Ideogram V2 | 渠道资料 · Replicate · Ideogram V2 | 4 |
| https://replicate.com/ideogram-ai/ideogram-v2/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/ideogram-ai/ideogram-v2-turbo | 官方文档 · Replicate · Ideogram V2 Turbo | 渠道资料 · Replicate · Ideogram V2 Turbo | 4 |
| https://replicate.com/ideogram-ai/ideogram-v2-turbo/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://huggingface.co/moonshotai/Kimi-K2-Thinking | 图研既有核实 · Hugging Face · Kimi K2 Thinking<br>官方文档 · Hugging Face · Kimi K2 Thinking | 官方文档 · Hugging Face · Kimi K2 Thinking | 20 |
| https://replicate.com/moonshotai/kimi-k2-thinking | 官方文档 · Replicate · Kimi K2 Thinking | 渠道资料 · Replicate · Kimi K2 Thinking | 1 |
| https://replicate.com/openai/gpt-image-2.5-flare | 官方文档 · Replicate · GPT Image 2.5 Flare | 渠道资料 · Replicate · GPT Image 2.5 Flare | 1 |
| https://replicate.com/openai/gpt-image-2.5-sunburst | 官方文档 · Replicate · GPT Image 2.5 Sunburst | 渠道资料 · Replicate · GPT Image 2.5 Sunburst | 1 |
| https://replicate.com/openai/gpt-image-2 | 官方文档 · Replicate · GPT Image 2 | 渠道资料 · Replicate · GPT Image 2 | 1 |
| https://replicate.com/openai/gpt-image-1.5 | 官方文档 · Replicate · GPT Image 1.5 | 渠道资料 · Replicate · GPT Image 1.5 | 1 |
| https://replicate.com/prunaai/flux-kontext-fast | 官方文档 · Replicate · FLUX Kontext Fast | 渠道资料 · Replicate · FLUX Kontext Fast | 4 |
| https://replicate.com/prunaai/flux-kontext-fast/api/schema | 图研既有核实 · Replicate · Schema<br>渠道资料 · Replicate · Schema | 渠道资料 · Replicate · Schema | 5 |
| https://replicate.com/black-forest-labs/flux-1.1-pro | 官方文档 · Replicate · FLUX 1.1 Pro | 渠道资料 · Replicate · FLUX 1.1 Pro | 4 |
| https://replicate.com/black-forest-labs/flux-1.1-pro/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/black-forest-labs/flux-1.1-pro-ultra | 官方文档 · Replicate · FLUX 1.1 Pro Ultra | 渠道资料 · Replicate · FLUX 1.1 Pro Ultra | 4 |
| https://replicate.com/black-forest-labs/flux-1.1-pro-ultra/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/black-forest-labs/flux-3-image | 官方文档 · Replicate · FLUX 3 Image | 渠道资料 · Replicate · FLUX 3 Image | 4 |
| https://replicate.com/black-forest-labs/flux-3-image/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/black-forest-labs/flux-dev | 官方文档 · Replicate · FLUX Dev | 渠道资料 · Replicate · FLUX Dev | 4 |
| https://replicate.com/black-forest-labs/flux-dev/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/black-forest-labs/flux-dev-lora | 官方文档 · Replicate · FLUX Dev LoRA | 渠道资料 · Replicate · FLUX Dev LoRA | 4 |
| https://replicate.com/black-forest-labs/flux-dev-lora/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/black-forest-labs/flux-pro | 官方文档 · Replicate · FLUX Pro | 渠道资料 · Replicate · FLUX Pro | 4 |
| https://replicate.com/black-forest-labs/flux-pro/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/black-forest-labs/flux-schnell | 官方文档 · Replicate · FLUX Schnell | 渠道资料 · Replicate · FLUX Schnell | 4 |
| https://replicate.com/black-forest-labs/flux-schnell/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/prunaai/flux-fast | 官方文档 · Replicate · FLUX Fast | 渠道资料 · Replicate · FLUX Fast | 4 |
| https://replicate.com/prunaai/flux-fast/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/qwen/qwen-image | 官方文档 · Replicate · Qwen Image | 渠道资料 · Replicate · Qwen Image | 4 |
| https://replicate.com/qwen/qwen-image/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/qwen/qwen-image-edit | 官方文档 · Replicate · Qwen Image Edit | 渠道资料 · Replicate · Qwen Image Edit | 4 |
| https://replicate.com/qwen/qwen-image-edit/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/qwen/qwen-image-edit-plus | 官方文档 · Replicate · Qwen Image Edit Plus | 渠道资料 · Replicate · Qwen Image Edit Plus | 4 |
| https://replicate.com/qwen/qwen-image-edit-plus/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://huggingface.co/Qwen/Qwen3-235B-A22B-Instruct-2507 | 图研既有核实 · Hugging Face · Qwen3-235b A22b Instruct 2507<br>官方文档 · Hugging Face · Qwen3-235b A22b Instruct 2507 | 官方文档 · Hugging Face · Qwen3-235b A22b Instruct 2507 | 20 |
| https://replicate.com/qwen/qwen3-235b-a22b-instruct-2507 | 官方文档 · Replicate · Qwen3-235b A22b Instruct 2507 | 渠道资料 · Replicate · Qwen3-235b A22b Instruct 2507 | 1 |
| https://replicate.com/qwen/qwen3-7-plus | 官方文档 · Replicate · Qwen3.7 Plus | 渠道资料 · Replicate · Qwen3.7 Plus | 1 |
| https://replicate.com/recraft-ai/recraft-v4.1 | 官方文档 · Replicate · Recraft V4.1 | 渠道资料 · Replicate · Recraft V4.1 | 4 |
| https://replicate.com/recraft-ai/recraft-v4.1/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/recraft-ai/recraft-v4-pro | 官方文档 · Replicate · Recraft V4 Pro | 渠道资料 · Replicate · Recraft V4 Pro | 4 |
| https://replicate.com/recraft-ai/recraft-v4-pro/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/recraft-ai/recraft-v3 | 官方文档 · Replicate · Recraft V3 | 渠道资料 · Replicate · Recraft V3 | 4 |
| https://replicate.com/recraft-ai/recraft-v3/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/stability-ai/stable-diffusion-3.5-large | 官方文档 · Replicate · Stable Diffusion 3.5 Large | 渠道资料 · Replicate · Stable Diffusion 3.5 Large | 4 |
| https://replicate.com/stability-ai/stable-diffusion-3.5-large/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/stability-ai/stable-diffusion-3.5-large-turbo | 官方文档 · Replicate · Stable Diffusion 3.5 Large Turbo | 渠道资料 · Replicate · Stable Diffusion 3.5 Large Turbo | 4 |
| https://replicate.com/stability-ai/stable-diffusion-3.5-large-turbo/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/stability-ai/stable-diffusion-3.5-medium | 官方文档 · Replicate · Stable Diffusion 3.5 Medium | 渠道资料 · Replicate · Stable Diffusion 3.5 Medium | 4 |
| https://replicate.com/stability-ai/stable-diffusion-3.5-medium/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/stability-ai/sdxl | 官方文档 · Replicate · SDXL | 渠道资料 · Replicate · SDXL | 4 |
| https://replicate.com/stability-ai/sdxl/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/stability-ai/stable-diffusion | 官方文档 · Replicate · Stable Diffusion | 渠道资料 · Replicate · Stable Diffusion | 4 |
| https://replicate.com/stability-ai/stable-diffusion/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/wan-video/wan-2.7-image | 官方文档 · Replicate · Wan 2.7 Image | 渠道资料 · Replicate · Wan 2.7 Image | 4 |
| https://replicate.com/wan-video/wan-2.7-image/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/wan-video/wan-2.7-image-pro | 官方文档 · Replicate · Wan 2.7 Image Pro | 渠道资料 · Replicate · Wan 2.7 Image Pro | 4 |
| https://replicate.com/wan-video/wan-2.7-image-pro/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/prunaai/wan-2.2-image | 官方文档 · Replicate · Wan 2.2 Image | 渠道资料 · Replicate · Wan 2.2 Image | 4 |
| https://replicate.com/prunaai/wan-2.2-image/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/xai/grok-imagine-image | 官方文档 · Replicate · Grok Imagine Image | 渠道资料 · Replicate · Grok Imagine Image | 4 |
| https://replicate.com/xai/grok-imagine-image/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/xai/grok-imagine-image-2 | 官方文档 · Replicate · Grok Imagine Image 2 | 渠道资料 · Replicate · Grok Imagine Image 2 | 4 |
| https://replicate.com/xai/grok-imagine-image-2/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/adirik/realvisxl-v3.0-turbo | 官方文档 · Replicate · Adirik（Realvisxl V3.0 Turbo） | 渠道资料 · Replicate · Realvisxl V3.0 Turbo | 4 |
| https://replicate.com/adirik/realvisxl-v3.0-turbo/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/ai-forever/kandinsky-2 | 官方文档 · Replicate · Kandinsky 2 | 渠道资料 · Replicate · Kandinsky 2 | 4 |
| https://replicate.com/ai-forever/kandinsky-2/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/ai-forever/kandinsky-2.2 | 官方文档 · Replicate · Kandinsky 2.2 | 渠道资料 · Replicate · Kandinsky 2.2 | 4 |
| https://replicate.com/ai-forever/kandinsky-2.2/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/bria/fibo | 官方文档 · Replicate · Fibo | 渠道资料 · Replicate · Fibo | 4 |
| https://replicate.com/bria/fibo/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/bria/fibo-edit | 官方文档 · Replicate · Fibo Edit | 渠道资料 · Replicate · Fibo Edit | 4 |
| https://replicate.com/bria/fibo-edit/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/bria/image-3.2 | 官方文档 · Replicate · Image 3.2 | 渠道资料 · Replicate · Image 3.2 | 4 |
| https://replicate.com/bria/image-3.2/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/bytedance/bagel | 官方文档 · Replicate · Bagel | 渠道资料 · Replicate · Bagel | 4 |
| https://replicate.com/bytedance/bagel/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/bytedance/sdxl-lightning-4step | 官方文档 · Replicate · SDXL Lightning 4step | 渠道资料 · Replicate · SDXL Lightning 4step | 4 |
| https://replicate.com/bytedance/sdxl-lightning-4step/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/datacte/proteus-v0.2 | 官方文档 · Replicate · Datacte（Proteus V0.2） | 渠道资料 · Replicate · Proteus V0.2 | 4 |
| https://replicate.com/datacte/proteus-v0.2/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/datacte/proteus-v0.3 | 官方文档 · Replicate · Datacte（Proteus V0.3） | 渠道资料 · Replicate · Proteus V0.3 | 4 |
| https://replicate.com/datacte/proteus-v0.3/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/fofr/latent-consistency-model | 官方文档 · Replicate · Fofr（Latent Consistency Model） | 渠道资料 · Replicate · Latent Consistency Model | 4 |
| https://replicate.com/fofr/latent-consistency-model/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/fofr/sdxl-emoji | 官方文档 · Replicate · Fofr（SDXL Emoji） | 渠道资料 · Replicate · SDXL Emoji | 4 |
| https://replicate.com/fofr/sdxl-emoji/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/fofr/sticker-maker | 官方文档 · Replicate · Fofr（Sticker Maker） | 渠道资料 · Replicate · Sticker Maker | 4 |
| https://replicate.com/fofr/sticker-maker/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/ideogram-ai/ideogram-4-5 | 官方文档 · Replicate · Ideogram 4.5 | 渠道资料 · Replicate · Ideogram 4.5 | 4 |
| https://replicate.com/ideogram-ai/ideogram-4-5/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/ideogram-ai/ideogram-4-5-precise-edit | 官方文档 · Replicate · Ideogram 4.5 Precise Edit | 渠道资料 · Replicate · Ideogram 4.5 Precise Edit | 4 |
| https://replicate.com/ideogram-ai/ideogram-4-5-precise-edit/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/krea/krea-2-medium | 官方文档 · Replicate · Krea 2 Medium | 渠道资料 · Replicate · Krea 2 Medium | 4 |
| https://replicate.com/krea/krea-2-medium/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/leonardoai/lucid-origin | 官方文档 · Replicate · Lucid Origin | 渠道资料 · Replicate · Lucid Origin | 4 |
| https://replicate.com/leonardoai/lucid-origin/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/lucataco/dreamshaper-xl-turbo | 官方文档 · Replicate · Lucataco（Dreamshaper Xl Turbo） | 渠道资料 · Replicate · Dreamshaper Xl Turbo | 4 |
| https://replicate.com/lucataco/dreamshaper-xl-turbo/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/lucataco/omnigen2 | 官方文档 · Replicate · Lucataco（Omnigen2） | 渠道资料 · Replicate · Omnigen2 | 4 |
| https://replicate.com/lucataco/open-dalle-v1.1 | 官方文档 · Replicate · Lucataco（Open Dalle V1.1） | 渠道资料 · Replicate · Open Dalle V1.1 | 4 |
| https://replicate.com/lucataco/open-dalle-v1.1/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/lucataco/realistic-vision-v5.1 | 官方文档 · Replicate · Lucataco（Realistic Vision V5.1） | 渠道资料 · Replicate · Realistic Vision V5.1 | 4 |
| https://replicate.com/lucataco/ssd-1b | 官方文档 · Replicate · Lucataco（Ssd 1b） | 渠道资料 · Replicate · Ssd 1b | 4 |
| https://replicate.com/lucataco/ssd-1b/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/luma/photon | 官方文档 · Replicate · Photon | 渠道资料 · Replicate · Photon | 4 |
| https://replicate.com/luma/photon/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/luma/photon-flash | 官方文档 · Replicate · Photon Flash | 渠道资料 · Replicate · Photon Flash | 4 |
| https://replicate.com/luma/photon-flash/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/minimax/image-01 | 官方文档 · Replicate · Image 01 | 渠道资料 · Replicate · Image 01 | 4 |
| https://replicate.com/minimax/image-01/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/nvidia/sana | 官方文档 · Replicate · Sana | 渠道资料 · Replicate · Sana | 4 |
| https://replicate.com/nvidia/sana-sprint-1.6b | 官方文档 · Replicate · Sana Sprint 1.6b | 渠道资料 · Replicate · Sana Sprint 1.6b | 4 |
| https://replicate.com/nvidia/sana-sprint-1.6b/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/playgroundai/playground-v2.5-1024px-aesthetic | 官方文档 · Replicate · Playground V2.5-1024px Aesthetic | 渠道资料 · Replicate · Playground V2.5-1024px Aesthetic | 4 |
| https://replicate.com/playgroundai/playground-v2.5-1024px-aesthetic/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/prunaai/hidream-l1-dev | 官方文档 · Replicate · Hidream L1 Dev | 渠道资料 · Replicate · Hidream L1 Dev | 4 |
| https://replicate.com/prunaai/hidream-l1-dev/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/prunaai/hidream-l1-fast | 官方文档 · Replicate · Hidream L1 Fast | 渠道资料 · Replicate · Hidream L1 Fast | 4 |
| https://replicate.com/prunaai/hidream-l1-fast/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/prunaai/hidream-l1-full | 官方文档 · Replicate · Hidream L1 Full | 渠道资料 · Replicate · Hidream L1 Full | 4 |
| https://replicate.com/prunaai/hidream-l1-full/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/prunaai/p-image | 官方文档 · Replicate · P Image | 渠道资料 · Replicate · P Image | 4 |
| https://replicate.com/prunaai/p-image/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/prunaai/p-image-edit | 官方文档 · Replicate · P Image Edit | 渠道资料 · Replicate · P Image Edit | 4 |
| https://replicate.com/prunaai/p-image-edit/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/prunaai/p-image-ideogram | 官方文档 · Replicate · P Image Ideogram | 渠道资料 · Replicate · P Image Ideogram | 4 |
| https://replicate.com/prunaai/p-image-ideogram/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/prunaai/p-image-lora | 官方文档 · Replicate · P Image LoRA | 渠道资料 · Replicate · P Image LoRA | 4 |
| https://replicate.com/prunaai/p-image-lora/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/prunaai/sdxl-lightning | 官方文档 · Replicate · SDXL Lightning | 渠道资料 · Replicate · SDXL Lightning | 4 |
| https://replicate.com/prunaai/sdxl-lightning/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/prunaai/z-image-turbo | 官方文档 · Replicate · Z Image Turbo | 渠道资料 · Replicate · Z Image Turbo | 4 |
| https://replicate.com/prunaai/z-image-turbo/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/sourceful/riverflow-2.0-pro | 官方文档 · Replicate · Riverflow 2.0 Pro | 渠道资料 · Replicate · Riverflow 2.0 Pro | 4 |
| https://replicate.com/sourceful/riverflow-2.0-pro/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/tencent/hunyuan-image-3 | 官方文档 · Replicate · Hunyuan Image 3 | 渠道资料 · Replicate · Hunyuan Image 3 | 4 |
| https://replicate.com/tencent/hunyuan-image-3/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/tstramer/material-diffusion | 官方文档 · Replicate · Tstramer（Material Diffusion） | 渠道资料 · Replicate · Material Diffusion | 4 |
| https://replicate.com/tstramer/material-diffusion/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://replicate.com/zsxkib/step1x-edit | 官方文档 · Replicate · Zsxkib（Step1x Edit） | 渠道资料 · Replicate · Step1x Edit | 4 |
| https://replicate.com/zsxkib/step1x-edit/api/schema | 图研既有核实 · Replicate · Schema | 渠道资料 · Replicate · Schema | 10 |
| https://tokendance.space/models/deepseek-v4.1-flash | 官方文档 · TokenDance · DeepSeek-V4.1-Flash | 渠道资料 · TokenDance · DeepSeek-V4.1-Flash | 4 |
| https://tokendance.space/models/deepseek-v4.1-flash-1017 | 官方文档 · TokenDance · DeepSeek V4.1 Flash 1017 | 渠道资料 · TokenDance · DeepSeek V4.1 Flash 1017 | 4 |
| https://api-docs.deepseek.com/news/news260821 | 原厂规格 · DeepSeek · 更新日志 2026-08-21<br>图研既有核实 · DeepSeek · 更新日志 2026-08-21<br>官方文档 · DeepSeek · 更新日志 2026-08-21 | 官方文档 · DeepSeek · 更新日志 2026-08-21 | 14 |
| https://tokendance.space/models/deepseek-v4-pro-0813 | 官方文档 · TokenDance · DeepSeek-V4-Pro-0813 | 渠道资料 · TokenDance · DeepSeek-V4-Pro-0813 | 4 |
| https://tokendance.space/models/deepseek-v4-flash-0731 | 官方文档 · TokenDance · DeepSeek-V4-Flash-0731 | 渠道资料 · TokenDance · DeepSeek-V4-Flash-0731 | 4 |
| https://tokendance.space/models/deepseek-v4-pro | 官方文档 · TokenDance · DeepSeek-V4-Pro Preview | 渠道资料 · TokenDance · DeepSeek-V4-Pro Preview | 4 |
| https://api-docs.deepseek.com/news/news250325 | 原厂规格 · DeepSeek · V3-0324 Release | 官方文档 · DeepSeek · V3-0324 Release | 4 |
| https://tokendance.space/models/glm-5.3 | 官方文档 · TokenDance · GLM 5.3 | 渠道资料 · TokenDance · GLM 5.3 | 4 |
| https://tokendance.space/models/glm-5.3-flash | 官方文档 · TokenDance · GLM 5.3 Flash | 渠道资料 · TokenDance · GLM 5.3 Flash | 4 |
| https://tokendance.space/models/glm-5.3-flashx | 官方文档 · TokenDance · GLM 5.3 FlashX | 渠道资料 · TokenDance · GLM 5.3 FlashX | 4 |
| https://tokendance.space/models/glm-5.2 | 官方文档 · TokenDance · GLM 5.2 | 渠道资料 · TokenDance · GLM 5.2 | 4 |
| https://tokendance.space/models/glm-5.1 | 官方文档 · TokenDance · GLM 5.1 | 渠道资料 · TokenDance · GLM 5.1 | 4 |
| https://tokendance.space/models/glm-5 | 官方文档 · TokenDance · GLM 5 | 渠道资料 · TokenDance · GLM 5 | 4 |
| https://tokendance.space/models/glm-5v-turbo | 官方文档 · TokenDance · GLM 5V Turbo | 渠道资料 · TokenDance · GLM 5V Turbo | 4 |
| https://tokendance.space/models/glm-4.7 | 官方文档 · TokenDance · GLM 4.7 | 渠道资料 · TokenDance · GLM 4.7 | 4 |
| https://tokendance.space/models/glm-4.6v | 官方文档 · TokenDance · GLM 4.6V | 渠道资料 · TokenDance · GLM 4.6V | 4 |
| https://tokendance.space/models/glm-4.5-air | 官方文档 · TokenDance · GLM 4.5 Air | 渠道资料 · TokenDance · GLM 4.5 Air | 4 |
| https://tokendance.space/models/hy4-preview | 官方文档 · TokenDance · Hy4 preview | 渠道资料 · TokenDance · Hy4 preview | 4 |
| https://tokendance.space/models/hy3 | 官方文档 · TokenDance · Hy3 | 渠道资料 · TokenDance · Hy3 | 4 |
| https://tokendance.space/models/hy3-preview | 官方文档 · TokenDance · Hy3 preview | 渠道资料 · TokenDance · Hy3 preview | 4 |
| https://tokendance.space/models/kimi-k3 | 官方文档 · TokenDance · Kimi K3 | 渠道资料 · TokenDance · Kimi K3 | 4 |
| https://tokendance.space/models/kimi-k2.7-code | 官方文档 · TokenDance · Kimi K2.7 Code | 渠道资料 · TokenDance · Kimi K2.7 Code | 4 |
| https://tokendance.space/models/kimi-k2.6 | 官方文档 · TokenDance · Kimi K2.6 | 渠道资料 · TokenDance · Kimi K2.6 | 4 |
| https://tokendance.space/models/kimi-k2.5 | 官方文档 · TokenDance · Kimi K2.5 | 渠道资料 · TokenDance · Kimi K2.5 | 4 |
| https://tokendance.space/models/minimax-m3 | 官方文档 · TokenDance · MiniMax M3 | 渠道资料 · TokenDance · MiniMax M3 | 4 |
| https://tokendance.space/models/minimax-m2.7 | 官方文档 · TokenDance · MiniMax M2.7 | 渠道资料 · TokenDance · MiniMax M2.7 | 4 |
| https://tokendance.space/models/minimax-m2.5 | 官方文档 · TokenDance · MiniMax M2.5 | 渠道资料 · TokenDance · MiniMax M2.5 | 4 |
| https://tokendance.space/models/qwen3.8-flash | 官方文档 · TokenDance · Qwen3.8 Flash | 渠道资料 · TokenDance · Qwen3.8 Flash | 4 |
| https://tokendance.space/models/qwen3.8-max | 官方文档 · TokenDance · Qwen3.8 Max | 渠道资料 · TokenDance · Qwen3.8 Max | 4 |
| https://tokendance.space/models/qwen3.8-max-0902 | 官方文档 · TokenDance · Qwen3.8-Max-0902 | 渠道资料 · TokenDance · Qwen3.8-Max-0902 | 4 |
| https://tokendance.space/models/qwen3.7-max | 官方文档 · TokenDance · Qwen3.7 Max | 渠道资料 · TokenDance · Qwen3.7 Max | 4 |
| https://tokendance.space/models/qwen3.7-plus | 官方文档 · TokenDance · Qwen3.7 Plus | 渠道资料 · TokenDance · Qwen3.7 Plus | 4 |
| https://help.aliyun.com/zh/model-studio/qwen3-6-max | 原厂规格 · 百炼 · Qwen3.6 Max | 官方文档 · 百炼 · Qwen3.6 Max | 4 |
| https://tokendance.space/models/qwen3.6-plus | 官方文档 · TokenDance · Qwen3.6 Plus | 渠道资料 · TokenDance · Qwen3.6 Plus | 4 |
| https://tokendance.space/models/qwen3.5-35b-a3b | 官方文档 · TokenDance · Qwen3.5-35B-A3B | 渠道资料 · TokenDance · Qwen3.5-35B-A3B | 4 |
| https://tokendance.space/models/qwen3.5-flash | 官方文档 · TokenDance · Qwen3.5 Flash | 渠道资料 · TokenDance · Qwen3.5 Flash | 4 |
| https://tokendance.space/models/qwen3.5-plus | 官方文档 · TokenDance · Qwen3.5 Plus | 渠道资料 · TokenDance · Qwen3.5 Plus | 4 |
| https://tokendance.space/models/seed-2.1-pro | 官方文档 · TokenDance · Seed-2.1-Pro | 渠道资料 · TokenDance · Seed-2.1-Pro | 4 |
| https://tokendance.space/models/seed-2.1-turbo | 官方文档 · TokenDance · Seed-2.1-Turbo | 渠道资料 · TokenDance · Seed-2.1-Turbo | 4 |
| https://tokendance.space/models/seed-2.0-code | 官方文档 · TokenDance · Seed-2.0-Code | 渠道资料 · TokenDance · Seed-2.0-Code | 4 |
| https://tokendance.space/models/seed-2.0-lite | 官方文档 · TokenDance · Seed-2.0-Lite | 渠道资料 · TokenDance · Seed-2.0-Lite | 4 |
| https://tokendance.space/models/seed-2.0-mini | 官方文档 · TokenDance · Seed-2.0-Mini | 渠道资料 · TokenDance · Seed-2.0-Mini | 4 |
| https://tokendance.space/models/seed-2.0-pro | 官方文档 · TokenDance · Seed-2.0-Pro | 渠道资料 · TokenDance · Seed-2.0-Pro | 4 |
| https://tokendance.space/models/seedream-5.0-lite | 官方文档 · TokenDance · Seedream 5.0 lite | 渠道资料 · TokenDance · Seedream 5.0 lite | 4 |
| https://tokendance.space/models/seedream-5.0-pro | 官方文档 · TokenDance · Seedream 5.0 Pro | 渠道资料 · TokenDance · Seedream 5.0 Pro | 4 |
| https://tokendance.space/models/step-5-preview | 官方文档 · TokenDance · Step 5 Preview | 渠道资料 · TokenDance · Step 5 Preview | 4 |
| https://platform.stepfun.com/docs/zh/guides/models/step-5-preview | 原厂规格 · StepFun · Step 5 Preview<br>图研既有核实 · StepFun · Step 5 Preview<br>官方文档 · StepFun · Step 5 Preview | 官方文档 · StepFun · Step 5 Preview | 23 |
| https://tokendance.space/models/step-3.7-flash | 官方文档 · TokenDance · Step 3.7 Flash | 渠道资料 · TokenDance · Step 3.7 Flash | 4 |
| https://tokendance.space/models/step-3.5-flash | 官方文档 · TokenDance · Step 3.5 Flash | 渠道资料 · TokenDance · Step 3.5 Flash | 4 |
| https://tokendance.space/models/cogevol-base | 官方文档 · TokenDance · CogEvol Base | 渠道资料 · TokenDance · CogEvol Base | 4 |
| https://tokendance.space/models/cogevol-interactive-0828 | 官方文档 · TokenDance · CogEvol Interactive 0828 | 渠道资料 · TokenDance · CogEvol Interactive 0828 | 4 |
| https://tokendance.space/models/cogevol-slide-0828 | 官方文档 · TokenDance · CogEvol Slide 0828 | 渠道资料 · TokenDance · CogEvol Slide 0828 | 4 |
| https://tokendance.space/models/dots-3-note-preview | 官方文档 · TokenDance · Dots3-Note Preview（免费） | 渠道资料 · TokenDance · Dots 3 Note Preview | 4 |
| https://tokendance.space/models/kimi-k3.1-pro | 官方文档 · TokenDance · Kimi K3.1 Pro | 渠道资料 · TokenDance · Kimi K3.1 Pro | 4 |
| https://tokendance.space/models/ling-3.0-flash | 官方文档 · TokenDance · Ling 3.0 Flash | 渠道资料 · TokenDance · Ling 3.0 Flash | 4 |
| https://tokendance.space/models/ling-3.1-flash | 官方文档 · TokenDance · Ling 3.1 Flash | 渠道资料 · TokenDance · Ling 3.1 Flash | 4 |
| https://tokendance.space/models/longcat-2.0 | 官方文档 · TokenDance · LongCat-2.0 | 渠道资料 · TokenDance · LongCat-2.0 | 4 |
| https://tokendance.space/models/mimo-v2.5 | 官方文档 · TokenDance · MiMo-V2.5 | 渠道资料 · TokenDance · MiMo-V2.5 | 4 |
| https://tokendance.space/models/mimo-v2.5-pro | 官方文档 · TokenDance · MiMo-V2.5-Pro | 渠道资料 · TokenDance · MiMo-V2.5-Pro | 4 |
| https://tokendance.space/models/mimo-v2.6-flash | 官方文档 · TokenDance · Mimo-V2.6-Flash | 渠道资料 · TokenDance · Mimo-V2.6-Flash | 4 |
| https://mimo.mi.com/docs/zh-CN/api/chat/openai-api | 原厂规格 · MiMo · OpenAI API<br>官方文档 · MiMo · OpenAI API | 官方文档 · MiMo · OpenAI API | 6 |
| https://mimo.mi.com/docs/zh-CN/usage-guide/multimodal-understanding/image-understanding | 原厂规格 · MiMo · Image Understanding<br>官方文档 · MiMo · Image Understanding | 官方文档 · MiMo · Image Understanding | 6 |
| https://tokendance.space/models/mimo-v2.6-pro | 官方文档 · TokenDance · Mimo-V2.6-Pro | 渠道资料 · TokenDance · Mimo-V2.6-Pro | 4 |
| https://tokendance.space/models/mimo-v2.6-ultraspeed | 官方文档 · TokenDance · MiMo-V2.6-Pro-UltraSpeed | 渠道资料 · TokenDance · MiMo-V2.6-Pro-UltraSpeed | 4 |
| https://tokendance.space/models/minimax-m3.1-flash | 官方文档 · TokenDance · MiniMax M3.1 Flash | 渠道资料 · TokenDance · MiniMax M3.1 Flash | 4 |
| https://tokendance.space/models/qwen3-vl-plus | 官方文档 · TokenDance · Qwen3 VL Plus | 渠道资料 · TokenDance · Qwen3 VL Plus | 4 |
| https://tokendance.space/models/seed-evolving | 官方文档 · TokenDance · Seed-Evolving | 渠道资料 · TokenDance · Seed-Evolving | 4 |
| https://tokendance.space/models/spark-x2.5-1.7b | 官方文档 · TokenDance · Spark-X2.5-1.7B | 渠道资料 · TokenDance · Spark-X2.5-1.7B | 4 |
| https://tokendance.space/models/spark-x2.5-4b | 官方文档 · TokenDance · Spark-X2.5-4B | 渠道资料 · TokenDance · Spark-X2.5-4B | 4 |
| https://tokendance.space/models/unifuncs-s3 | 官方文档 · TokenDance · Deep Search S3 | 渠道资料 · TokenDance · Deep Search S3 | 4 |
| https://tokendance.space/models/unifuncs-s3-pro | 官方文档 · TokenDance · Deep Search S3 Pro | 渠道资料 · TokenDance · Deep Search S3 Pro | 4 |
| https://tokendance.space/models/unifuncs-u3 | 官方文档 · TokenDance · Deep Research U3 | 渠道资料 · TokenDance · Deep Research U3 | 4 |
| https://tokendance.space/models/unifuncs-u3-pro | 官方文档 · TokenDance · Deep Research U3 Pro | 渠道资料 · TokenDance · Deep Research U3 Pro | 4 |
| https://runware.ai/docs/models/bfl-flux-3-image-klein | 官方文档 · Runware · FLUX 3 Image Klein | 渠道资料 · Runware · FLUX 3 Image Klein | 4 |
| https://runware.ai/docs/models/bfl-flux-3-image-klein/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · BFL:FLUX@3 Image Klein API 规格 | 10 |
| https://runware.ai/docs/models/bfl-flux-3-image-klein-base | 官方文档 · Runware · FLUX 3 Image Klein Base | 渠道资料 · Runware · FLUX 3 Image Klein Base | 4 |
| https://runware.ai/docs/models/bfl-flux-3-image-klein-base/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · BFL:FLUX@3 Image Klein Base API 规格 | 10 |
| https://runware.ai/docs/models/alibaba-qwen-image-2-1-turbo | 官方文档 · Runware · Qwen-Image-2.1-Turbo | 渠道资料 · Runware · Qwen-Image-2.1-Turbo | 4 |
| https://runware.ai/docs/models/alibaba-qwen-image-2-1-turbo/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Alibaba:Qwen Image@2.1 Turbo API 规格 | 10 |
| https://runware.ai/docs/models/google-nano-banana-2-1 | 官方文档 · Runware · Runware | 渠道资料 · Runware · Runware | 4 |
| https://runware.ai/docs/models/google-nano-banana-2-1/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Google:Nano Banana@2.1 API 规格 | 10 |
| https://runware.ai/docs/models/bfl-flux-3-image | 官方文档 · Runware · Runware | 渠道资料 · Runware · Runware | 4 |
| https://runware.ai/docs/models/bfl-flux-3-image/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · BFL:FLUX@3 Image API 规格 | 10 |
| https://runware.ai/docs/models/ideogram-4-5 | 官方文档 · Runware · Ideogram 4.5 | 渠道资料 · Runware · Ideogram 4.5 | 4 |
| https://runware.ai/docs/models/ideogram-4-5/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Ideogram 4.5 API 规格 | 10 |
| https://runware.ai/docs/models/ideogram-4-5-precise-edit | 官方文档 · Runware · Runware | 渠道资料 · Runware · Runware | 4 |
| https://runware.ai/docs/models/ideogram-4-5-precise-edit/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Ideogram 4.5 Precise Edit API 规格 | 10 |
| https://runware.ai/docs/models/bytedance-seedream-5-0-flash | 官方文档 · Runware · Runware | 渠道资料 · Runware · Runware | 4 |
| https://runware.ai/docs/models/bytedance-seedream-5-0-flash/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Bytedance:Seedream@5.0 Flash API 规格 | 10 |
| https://runware.ai/docs/models/recraft-v4-1-flash | 官方文档 · Runware · Runware | 渠道资料 · Runware · Runware | 1 |
| https://runware.ai/docs/models/alibaba-qwen-image-2-1-pro | 官方文档 · Runware · Runware | 渠道资料 · Runware · Runware | 4 |
| https://runware.ai/docs/models/alibaba-qwen-image-2-1-pro/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Alibaba:Qwen Image@2.1 Pro API 规格 | 10 |
| https://runware.ai/docs/models/openai-gpt-image-2-5-flare | 官方文档 · Runware · GPT-Image-2.5 Flare | 渠道资料 · Runware · GPT-Image-2.5 Flare | 4 |
| https://runware.ai/docs/en/getting-started/introduction | 官方文档 · Runware · Introduction | 渠道资料 · Runware · Introduction | 138 |
| https://runware.ai/docs/models/openai-gpt-image-2-5-flare/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · OpenAI:GPT Image@2.5 Flare API 规格 | 10 |
| https://runware.ai/docs/models/openai-gpt-image-2-5-sunburst | 官方文档 · Runware · GPT-Image-2.5 Sunburst | 渠道资料 · Runware · GPT-Image-2.5 Sunburst | 4 |
| https://runware.ai/docs/models/openai-gpt-image-2-5-sunburst/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · OpenAI:GPT Image@2.5 Sunburst API 规格 | 10 |
| https://runware.ai/docs/models/xai-grok-imagine-image-2-0 | 官方文档 · Runware · Grok Imagine Image 2.0 | 渠道资料 · Runware · Grok Imagine Image 2.0 | 4 |
| https://runware.ai/docs/models/xai-grok-imagine-image-2-0/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Xai:Grok Imagine@Image 2.0 API 规格 | 10 |
| https://runware.ai/docs/models/alibaba-qwen-image-3-0 | 官方文档 · Runware · Qwen-Image-3.0 | 渠道资料 · Runware · Qwen-Image-3.0 | 4 |
| https://runware.ai/docs/models/alibaba-qwen-image-3-0/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Alibaba:Qwen Image@3.0 API 规格 | 10 |
| https://runware.ai/docs/models/alibaba-qwen-image-3-0-pro | 官方文档 · Runware · Qwen-Image-3.0-Pro | 渠道资料 · Runware · Qwen-Image-3.0-Pro | 4 |
| https://runware.ai/docs/models/alibaba-qwen-image-3-0-pro/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Alibaba:Qwen Image@3.0 Pro API 规格 | 10 |
| https://runware.ai/docs/models/deepseek-v4-flash | 官方文档 · Runware · DeepSeek-V4-Flash-0731 | 渠道资料 · Runware · DeepSeek-V4-Flash-0731 | 1 |
| https://runware.ai/docs/models/prunaai-p-image-ideogram | 官方文档 · Runware · P-Image-Ideogram | 渠道资料 · Runware · P-Image-Ideogram | 4 |
| https://runware.ai/docs/models/prunaai-p-image-ideogram/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Prunaai:P Image@Ideogram API 规格 | 10 |
| https://runware.ai/docs/models/krea-2-turbo | 官方文档 · Runware · Krea 2 Turbo | 渠道资料 · Runware · Krea 2 Turbo | 4 |
| https://runware.ai/docs/models/krea-2-turbo/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Krea 2（Turbo） API 规格 | 10 |
| https://runware.ai/docs/models/bytedance-seedream-5-0-pro | 官方文档 · Runware · Seedream 5.0 Pro | 渠道资料 · Runware · Seedream 5.0 Pro | 4 |
| https://runware.ai/docs/models/bytedance-seedream-5-0-pro/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Bytedance:Seedream@5.0 Pro API 规格 | 10 |
| https://runware.ai/docs/models/meta-muse-image | 官方文档 · Runware · Muse Image | 渠道资料 · Runware · Muse Image | 4 |
| https://runware.ai/docs/models/meta-muse-image/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Meta:Muse@Image API 规格 | 10 |
| https://runware.ai/docs/models/google-nano-banana-2-lite | 官方文档 · Runware · Nano Banana 2 Lite | 渠道资料 · Runware · Nano Banana 2 Lite | 4 |
| https://runware.ai/docs/models/google-nano-banana-2-lite/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Google:Nano Banana@2 Lite API 规格 | 10 |
| https://runware.ai/docs/models/krea-2-raw | 官方文档 · Runware · Krea 2 Raw | 渠道资料 · Runware · Krea 2 Raw | 4 |
| https://runware.ai/docs/models/krea-2-raw/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Krea 2 Raw API 规格 | 10 |
| https://runware.ai/docs/models/rundiffusion-juggernaut-z-fast | 官方文档 · Runware · Juggernaut Z Fast | 渠道资料 · Runware · Juggernaut Z Fast | 4 |
| https://runware.ai/docs/models/rundiffusion-juggernaut-z-fast/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Rundiffusion Juggernaut Z Fast API 规格 | 10 |
| https://runware.ai/docs/models/anthropic-claude-fable-5 | 官方文档 · Runware · Claude Fable 5 | 渠道资料 · Runware · Claude Fable 5 | 4 |
| https://runware.ai/docs/models/anthropic-claude-fable-5/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Anthropic:Claude@Fable 5 API 规格 | 10 |
| https://runware.ai/docs/models/sourceful-riverflow-2-5-fast | 官方文档 · Runware · Riverflow 2.5 Fast | 渠道资料 · Runware · Riverflow 2.5 Fast | 4 |
| https://runware.ai/docs/models/sourceful-riverflow-2-5-fast/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Sourceful:Riverflow 2.5@Fast API 规格 | 10 |
| https://runware.ai/docs/models/sourceful-riverflow-2-5-pro | 官方文档 · Runware · Riverflow 2.5 Pro | 渠道资料 · Runware · Riverflow 2.5 Pro | 4 |
| https://runware.ai/docs/models/sourceful-riverflow-2-5-pro/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Sourceful:Riverflow 2.5@Pro API 规格 | 10 |
| https://runware.ai/docs/models/ideogram-4-0 | 官方文档 · Runware · Ideogram 4.0 | 渠道资料 · Runware · Ideogram 4.0 | 4 |
| https://runware.ai/docs/models/ideogram-4-0/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Ideogram 4.0 API 规格 | 10 |
| https://runware.ai/docs/models/ideogram-4-0q | 官方文档 · Runware · Ideogram 4.0q | 渠道资料 · Runware · Ideogram 4.0q | 4 |
| https://runware.ai/docs/models/ideogram-4-0q/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Ideogram 4.0q API 规格 | 10 |
| https://runware.ai/docs/models/ideogram-4-0-remix | 官方文档 · Runware · Ideogram 4.0 Remix | 渠道资料 · Runware · Ideogram 4.0 Remix | 4 |
| https://runware.ai/docs/models/ideogram-4-0-remix/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Ideogram 4.0 Remix API 规格 | 10 |
| https://runware.ai/docs/models/krea-2-medium-turbo | 官方文档 · Runware · Krea 2 Medium Turbo | 渠道资料 · Runware · Krea 2 Medium Turbo | 4 |
| https://runware.ai/docs/models/krea-2-medium-turbo/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Krea 2 Medium Turbo API 规格 | 10 |
| https://runware.ai/docs/models/minimax-m3 | 官方文档 · Runware · MiniMax M3 | 渠道资料 · Runware · MiniMax M3 | 4 |
| https://runware.ai/docs/models/minimax-m3/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · MiniMax M3 API 规格 | 10 |
| https://runware.ai/docs/models/anthropic-claude-opus-4-8 | 官方文档 · Runware · Claude Opus 4.8 | 渠道资料 · Runware · Claude Opus 4.8 | 4 |
| https://runware.ai/docs/models/anthropic-claude-opus-4-8/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Anthropic:Claude@Opus 4.8 API 规格 | 10 |
| https://runware.ai/docs/models/krea-2-large | 官方文档 · Runware · Krea 2 Large | 渠道资料 · Runware · Krea 2 Large | 4 |
| https://runware.ai/docs/models/krea-2-large/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Krea 2 Large API 规格 | 10 |
| https://runware.ai/docs/models/krea-2-medium | 官方文档 · Runware · Krea 2 Medium | 渠道资料 · Runware · Krea 2 Medium | 4 |
| https://runware.ai/docs/models/krea-2-medium/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Krea 2 Medium API 规格 | 10 |
| https://runware.ai/docs/models/google-gemini-3-5-flash | 官方文档 · Runware · Gemini 3.5 Flash | 渠道资料 · Runware · Gemini 3.5 Flash | 4 |
| https://runware.ai/docs/models/google-gemini-3-5-flash/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Google:Gemini@3.5 Flash API 规格 | 10 |
| https://runware.ai/docs/models/recraft-v4-1-pro | 官方文档 · Runware · Recraft V4.1 Pro | 渠道资料 · Runware · Recraft V4.1 Pro | 4 |
| https://runware.ai/docs/models/recraft-v4-1-pro/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Recraft V4.1 Pro API 规格 | 10 |
| https://runware.ai/docs/models/recraft-v4-1-utility-pro | 官方文档 · Runware · Recraft V4.1 Utility Pro | 渠道资料 · Runware · Recraft V4.1 Utility Pro | 4 |
| https://runware.ai/docs/models/recraft-v4-1-utility-pro/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Recraft V4.1 Utility Pro API 规格 | 10 |
| https://runware.ai/docs/models/recraft-v4-1-utility | 官方文档 · Runware · Recraft V4.1 Utility | 渠道资料 · Runware · Recraft V4.1 Utility | 4 |
| https://runware.ai/docs/models/recraft-v4-1-utility/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Recraft V4.1 Utility API 规格 | 10 |
| https://runware.ai/docs/models/recraft-v4-1 | 官方文档 · Runware · Recraft V4.1 | 渠道资料 · Runware · Recraft V4.1 | 4 |
| https://runware.ai/docs/models/recraft-v4-1/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Recraft V4.1 API 规格 | 10 |
| https://runware.ai/docs/models/xai-grok-imagine-image-quality/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Xai:Grok Imagine@Image Quality API 规格 | 10 |
| https://runware.ai/docs/models/luma-uni-1 | 官方文档 · Runware · UNI-1 | 渠道资料 · Runware · UNI-1 | 4 |
| https://runware.ai/docs/models/luma-uni-1/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Luma:Uni@1 API 规格 | 10 |
| https://runware.ai/docs/models/luma-uni-1-max | 官方文档 · Runware · UNI-1 Max | 渠道资料 · Runware · UNI-1 Max | 4 |
| https://runware.ai/docs/models/luma-uni-1-max/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Luma:Uni@1 Max API 规格 | 10 |
| https://runware.ai/docs/models/xai-grok-4-3 | 官方文档 · Runware · Grok 4.3 | 渠道资料 · Runware · Grok 4.3 | 4 |
| https://runware.ai/docs/models/xai-grok-4-3/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Xai:Grok@4.3 API 规格 | 10 |
| https://runware.ai/docs/models/rundiffusion-juggernaut-z | 官方文档 · Runware · Juggernaut Z | 渠道资料 · Runware · Juggernaut Z | 4 |
| https://runware.ai/docs/models/rundiffusion-juggernaut-z/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Rundiffusion Juggernaut Z API 规格 | 10 |
| https://runware.ai/docs/models/openai-gpt-5-5 | 官方文档 · Runware · GPT-5.5 | 渠道资料 · Runware · GPT-5.5 | 4 |
| https://runware.ai/docs/models/openai-gpt-5-5/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · OpenAI:GPT@5.5 API 规格 | 10 |
| https://runware.ai/docs/models/openai-gpt-image-2 | 官方文档 · Runware · GPT Image 2 | 渠道资料 · Runware · GPT Image 2 | 4 |
| https://runware.ai/docs/models/openai-gpt-image-2/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · OpenAI:GPT Image@2 API 规格 | 10 |
| https://runware.ai/docs/models/anthropic-claude-opus-4-7 | 官方文档 · Runware · Claude Opus 4.7 | 渠道资料 · Runware · Claude Opus 4.7 | 4 |
| https://runware.ai/docs/models/anthropic-claude-opus-4-7/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Anthropic:Claude@Opus 4.7 API 规格 | 10 |
| https://runware.ai/docs/models/baidu-ernie-image | 官方文档 · Runware · ERNIE-Image | 渠道资料 · Runware · ERNIE-Image | 4 |
| https://runware.ai/docs/models/baidu-ernie-image/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Baidu ERNIE Image API 规格 | 10 |
| https://runware.ai/docs/models/baidu-ernie-image-turbo | 官方文档 · Runware · ERNIE-Image-Turbo | 渠道资料 · Runware · ERNIE-Image-Turbo | 4 |
| https://runware.ai/docs/models/baidu-ernie-image-turbo/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Baidu:ERNIE Image@Turbo API 规格 | 10 |
| https://runware.ai/docs/models/imagineart-2-0 | 官方文档 · Runware · ImagineArt 2.0 | 渠道资料 · Runware · ImagineArt 2.0 | 4 |
| https://runware.ai/docs/models/imagineart-2-0/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Imagineart 2.0 API 规格 | 10 |
| https://runware.ai/docs/models/zai-glm-5-1 | 官方文档 · Runware · GLM-5.1 | 渠道资料 · Runware · GLM-5.1 | 4 |
| https://runware.ai/docs/models/zai-glm-5-1/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Zai:GLM@5.1 API 规格 | 10 |
| https://runware.ai/docs/models/google-gemma-4-31b | 官方文档 · Runware · Gemma 4 31B | 渠道资料 · Runware · Gemma 4 31B | 4 |
| https://runware.ai/docs/models/google-gemma-4-31b/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Google:Gemma@4-31b API 规格 | 10 |
| https://runware.ai/docs/models/alibaba-wan2-7-image | 官方文档 · Runware · Wan2.7 Image | 渠道资料 · Runware · Wan2.7 Image | 4 |
| https://runware.ai/docs/models/alibaba-wan2-7-image/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Alibaba:Wan@2.7 Image API 规格 | 10 |
| https://runware.ai/docs/models/alibaba-wan2-7-image-pro | 官方文档 · Runware · Wan2.7 Image Pro | 渠道资料 · Runware · Wan2.7 Image Pro | 4 |
| https://runware.ai/docs/models/alibaba-wan2-7-image-pro/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Alibaba:Wan@2.7 Image Pro API 规格 | 10 |
| https://runware.ai/docs/models/bfl-flux-2-klein-9b-kv | 官方文档 · Runware · FLUX.2 [klein] 9B KV | 渠道资料 · Runware · FLUX.2 [klein] 9B KV | 4 |
| https://runware.ai/docs/models/bfl-flux-2-klein-9b-kv/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · BFL FLUX.2 [klein] 9B KV API 规格 | 10 |
| https://runware.ai/docs/models/minimax-m2-7 | 官方文档 · Runware · MiniMax M2.7 | 渠道资料 · Runware · MiniMax M2.7 | 4 |
| https://runware.ai/docs/models/minimax-m2-7/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · MiniMax M2.7 API 规格 | 10 |
| https://runware.ai/docs/models/minimax-m2-7-highspeed | 官方文档 · Runware · MiniMax M2.7 Highspeed | 渠道资料 · Runware · MiniMax M2.7 Highspeed | 4 |
| https://runware.ai/docs/models/minimax-m2-7-highspeed/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · MiniMax M2.7 Highspeed API 规格 | 10 |
| https://runware.ai/docs/models/openai-gpt-5-4-mini | 官方文档 · Runware · GPT-5.4 Mini | 渠道资料 · Runware · GPT-5.4 Mini | 4 |
| https://runware.ai/docs/models/openai-gpt-5-4-mini/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · OpenAI:GPT@5.4 Mini API 规格 | 10 |
| https://runware.ai/docs/models/openai-gpt-5-4-nano | 官方文档 · Runware · GPT-5.4 Nano | 渠道资料 · Runware · GPT-5.4 Nano | 4 |
| https://runware.ai/docs/models/openai-gpt-5-4-nano/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · OpenAI:GPT@5.4 Nano API 规格 | 10 |
| https://runware.ai/docs/models/openai-gpt-5-4 | 官方文档 · Runware · GPT-5.4 | 渠道资料 · Runware · GPT-5.4 | 4 |
| https://runware.ai/docs/models/openai-gpt-5-4/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · OpenAI:GPT@5.4 API 规格 | 10 |
| https://runware.ai/docs/models/openai-gpt-5-4-pro | 官方文档 · Runware · GPT-5.4 Pro | 渠道资料 · Runware · GPT-5.4 Pro | 4 |
| https://runware.ai/docs/models/openai-gpt-5-4-pro/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · OpenAI:GPT@5.4 Pro API 规格 | 10 |
| https://runware.ai/docs/models/google-gemini-3-1-flash-lite | 官方文档 · Runware · Gemini 3.1 Flash Lite | 渠道资料 · Runware · Gemini 3.1 Flash Lite | 4 |
| https://runware.ai/docs/models/google-gemini-3-1-flash-lite/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Google:Gemini@3.1 Flash Lite API 规格 | 10 |
| https://runware.ai/docs/models/google-nano-banana-2 | 官方文档 · Runware · Nano Banana 2 | 渠道资料 · Runware · Nano Banana 2 | 4 |
| https://runware.ai/docs/models/google-nano-banana-2/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Google Nano Banana 2 API 规格 | 10 |
| https://runware.ai/docs/models/bytedance-seedream-5-0-lite | 官方文档 · Runware · Seedream 5.0 Lite | 渠道资料 · Runware · Seedream 5.0 Lite | 4 |
| https://runware.ai/docs/models/bytedance-seedream-5-0-lite/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Bytedance:Seedream@5.0 Lite API 规格 | 10 |
| https://runware.ai/docs/models/google-gemini-3-1-pro | 官方文档 · Runware · Gemini 3.1 Pro | 渠道资料 · Runware · Gemini 3.1 Pro | 4 |
| https://runware.ai/docs/tools/compatible-apis | 官方文档 · Runware · Compatible Apis | 渠道资料 · Runware · Compatible Apis | 2 |
| https://runware.ai/docs/models/google-gemini-3-1-pro/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Google:Gemini@3.1 Pro API 规格 | 10 |
| https://runware.ai/docs/models/anthropic-claude-sonnet-4-6 | 官方文档 · Runware · Claude Sonnet 4.6 | 渠道资料 · Runware · Claude Sonnet 4.6 | 4 |
| https://runware.ai/docs/models/anthropic-claude-sonnet-4-6/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Anthropic:Claude@Sonnet 4.6 API 规格 | 10 |
| https://runware.ai/docs/models/recraft-v4-pro | 官方文档 · Runware · Recraft V4 Pro | 渠道资料 · Runware · Recraft V4 Pro | 4 |
| https://runware.ai/docs/models/recraft-v4-pro/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Recraft V4 Pro API 规格 | 10 |
| https://runware.ai/docs/models/recraft-v4 | 官方文档 · Runware · Recraft V4 | 渠道资料 · Runware · Recraft V4 | 4 |
| https://runware.ai/docs/models/recraft-v4/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Recraft V4 API 规格 | 10 |
| https://runware.ai/docs/models/alibaba-qwen-image-2-0 | 官方文档 · Runware · Qwen-Image-2.0 | 渠道资料 · Runware · Qwen-Image-2.0 | 4 |
| https://runware.ai/docs/models/alibaba-qwen-image-2-0/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Alibaba:Qwen Image@2.0 API 规格 | 10 |
| https://runware.ai/docs/models/alibaba-qwen-image-2-0-pro | 官方文档 · Runware · Qwen-Image-2.0-Pro | 渠道资料 · Runware · Qwen-Image-2.0-Pro | 4 |
| https://runware.ai/docs/models/alibaba-qwen-image-2-0-pro/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Alibaba:Qwen Image@2.0 Pro API 规格 | 10 |
| https://runware.ai/docs/models/klingai-image-3-0 | 官方文档 · Runware · Klingai Image 3-0 | 渠道资料 · Runware · Klingai Image 3-0 | 4 |
| https://runware.ai/docs/models/klingai-image-3-0/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Klingai Image 3-0 API 规格 | 10 |
| https://runware.ai/docs/models/klingai-image-o3 | 官方文档 · Runware · Klingai Image O3 | 渠道资料 · Runware · Klingai Image O3 | 4 |
| https://runware.ai/docs/models/klingai-image-o3/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Klingai Image O3 API 规格 | 10 |
| https://runware.ai/docs/models/sourceful-riverflow-2-0-fast | 官方文档 · Runware · Riverflow 2.0 Fast | 渠道资料 · Runware · Riverflow 2.0 Fast | 4 |
| https://runware.ai/docs/models/sourceful-riverflow-2-0-fast/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Sourceful:Riverflow 2.0@Fast API 规格 | 10 |
| https://runware.ai/docs/models/sourceful-riverflow-2-0-pro | 官方文档 · Runware · Riverflow 2.0 Pro | 渠道资料 · Runware · Riverflow 2.0 Pro | 4 |
| https://runware.ai/docs/models/sourceful-riverflow-2-0-pro/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Sourceful:Riverflow 2.0@Pro API 规格 | 10 |
| https://runware.ai/docs/models/xai-grok-imagine-image | 官方文档 · Runware · Grok Imagine Image | 渠道资料 · Runware · Grok Imagine Image | 4 |
| https://runware.ai/docs/models/xai-grok-imagine-image/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Xai:Grok Imagine@Image API 规格 | 10 |
| https://runware.ai/docs/models/alibaba-z-image | 官方文档 · Runware · Z-Image | 渠道资料 · Runware · Z-Image | 4 |
| https://runware.ai/docs/models/alibaba-z-image/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Alibaba Z Image API 规格 | 10 |
| https://runware.ai/docs/models/bfl-flux-2-klein-9b | 官方文档 · Runware · FLUX.2 [klein] 9B | 渠道资料 · Runware · FLUX.2 [klein] 9B | 4 |
| https://runware.ai/docs/models/bfl-flux-2-klein-9b/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · BFL FLUX.2 [klein] 9B API 规格 | 10 |
| https://runware.ai/docs/models/bria-fibo-2-0-edit | 官方文档 · Runware · Bria FIBO 2.0 Edit | 渠道资料 · Runware · Bria FIBO 2.0 Edit | 4 |
| https://runware.ai/docs/models/bria-fibo-edit/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Bria Fibo Edit API 规格 | 10 |
| https://runware.ai/docs/models/imagineart-1-5-pro | 官方文档 · Runware · ImagineArt 1.5 Pro | 渠道资料 · Runware · ImagineArt 1.5 Pro | 4 |
| https://runware.ai/docs/models/imagineart-1-5-pro/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · ImagineArt 1.5 Pro API 规格 | 10 |
| https://runware.ai/docs/models/bfl-flux-2-klein-9b-base | 官方文档 · Runware · FLUX.2 [klein] 9B Base | 渠道资料 · Runware · FLUX.2 [klein] 9B Base | 4 |
| https://runware.ai/docs/models/bfl-flux-2-klein-9b-base/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · BFL FLUX.2 [klein] 9B Base API 规格 | 10 |
| https://runware.ai/docs/models/bfl-flux-2-klein-4b | 官方文档 · Runware · FLUX.2 [klein] 4B | 渠道资料 · Runware · FLUX.2 [klein] 4B | 4 |
| https://runware.ai/docs/models/bfl-flux-2-klein-4b/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · BFL FLUX.2 [klein] 4B API 规格 | 10 |
| https://runware.ai/docs/models/bfl-flux-2-klein-4b-base | 官方文档 · Runware · FLUX.2 [klein] 4B Base | 渠道资料 · Runware · FLUX.2 [klein] 4B Base | 4 |
| https://runware.ai/docs/models/bfl-flux-2-klein-4b-base/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · BFL FLUX.2 [klein] 4B Base API 规格 | 10 |
| https://runware.ai/docs/models/bria-fibo-lite | 官方文档 · Runware · Bria FIBO Lite | 渠道资料 · Runware · Bria FIBO Lite | 4 |
| https://runware.ai/docs/models/bria-fibo-lite/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Bria Fibo Lite API 规格 | 10 |
| https://runware.ai/docs/models/twinflow-z-image-turbo | 官方文档 · Runware · TwinFlow Z-Image-Turbo | 渠道资料 · Runware · TwinFlow Z-Image-Turbo | 4 |
| https://runware.ai/docs/models/twinflow-z-image-turbo/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Twinflow Z Image Turbo API 规格 | 10 |
| https://runware.ai/docs/models/alibaba-qwen-image-2512 | 官方文档 · Runware · Qwen-Image-2512 | 渠道资料 · Runware · Qwen-Image-2512 | 4 |
| https://runware.ai/docs/models/alibaba-qwen-image-2512/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Alibaba:Qwen Image@2512 API 规格 | 10 |
| https://runware.ai/docs/models/google-gemini-3-flash | 官方文档 · Runware · Gemini 3 Flash | 渠道资料 · Runware · Gemini 3 Flash | 4 |
| https://runware.ai/docs/models/google-gemini-3-flash/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Google:Gemini@3 Flash API 规格 | 10 |
| https://runware.ai/docs/models/alibaba-wan2-6-image | 官方文档 · Runware · Wan2.6 Image | 渠道资料 · Runware · Wan2.6 Image | 4 |
| https://runware.ai/docs/models/alibaba-wan2-6-image/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Alibaba:Wan@2.6 Image API 规格 | 10 |
| https://runware.ai/docs/models/bfl-flux-2-max | 官方文档 · Runware · FLUX.2 [max] | 渠道资料 · Runware · FLUX.2 [max] | 4 |
| https://runware.ai/docs/models/bfl-flux-2-max/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · BFL FLUX.2 [max] API 规格 | 10 |
| https://runware.ai/docs/models/openai-gpt-image-1-5 | 官方文档 · Runware · GPT Image 1.5 | 渠道资料 · Runware · GPT Image 1.5 | 4 |
| https://runware.ai/docs/models/openai-gpt-image-1-5/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · OpenAI GPT Image 1.5 API 规格 | 10 |
| https://runware.ai/docs/models/bytedance-seedream-4-5 | 官方文档 · Runware · Seedream 4.5 | 渠道资料 · Runware · Seedream 4.5 | 4 |
| https://runware.ai/docs/models/bytedance-seedream-4-5/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Bytedance:Seedream@4.5 API 规格 | 10 |
| https://runware.ai/docs/models/klingai-image-o1 | 官方文档 · Runware · Klingai Image O1 | 渠道资料 · Runware · Klingai Image O1 | 4 |
| https://runware.ai/docs/models/klingai-image-o1/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Klingai Image O1 API 规格 | 10 |
| https://runware.ai/docs/models/prunaai-p-image | 官方文档 · Runware · P-Image | 渠道资料 · Runware · P-Image | 4 |
| https://runware.ai/docs/models/prunaai-p-image/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Prunaai P Image API 规格 | 10 |
| https://runware.ai/docs/models/bfl-flux-2-pro | 官方文档 · Runware · FLUX.2 [pro] | 渠道资料 · Runware · FLUX.2 [pro] | 4 |
| https://runware.ai/docs/models/bfl-flux-2-pro/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · BFL FLUX.2 [pro] API 规格 | 10 |
| https://runware.ai/docs/models/kandinsky-5-0-image-lite | 官方文档 · Runware · Kandinsky 5.0 Image Lite | 渠道资料 · Runware · Kandinsky 5.0 Image Lite | 4 |
| https://runware.ai/docs/models/kandinsky-5-0-image-lite/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Kandinsky 5.0 Image Lite API 规格 | 10 |
| https://runware.ai/docs/models/alibaba-z-image-turbo | 官方文档 · Runware · Z-Image-Turbo | 渠道资料 · Runware · Z-Image-Turbo | 4 |
| https://runware.ai/docs/models/alibaba-z-image-turbo/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Alibaba Z Image Turbo API 规格 | 10 |
| https://runware.ai/docs/models/alibaba-qwen-image-edit-2511 | 官方文档 · Runware · Qwen-Image-Edit-2511 | 渠道资料 · Runware · Qwen-Image-Edit-2511 | 4 |
| https://runware.ai/docs/models/alibaba-qwen-image-edit-2511/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Alibaba:Qwen Image Edit@2511 API 规格 | 10 |
| https://runware.ai/docs/models/bfl-flux-2-flex | 官方文档 · Runware · FLUX.2 [flex] | 渠道资料 · Runware · FLUX.2 [flex] | 4 |
| https://runware.ai/docs/models/bfl-flux-2-flex/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · BFL FLUX.2 [flex] API 规格 | 10 |
| https://runware.ai/docs/models/bfl-flux-2-dev | 官方文档 · Runware · FLUX.2 [dev] | 渠道资料 · Runware · FLUX.2 [dev] | 4 |
| https://runware.ai/docs/models/bfl-flux-2-dev/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · BFL FLUX.2 [dev] API 规格 | 10 |
| https://runware.ai/docs/models/google-nano-banana-pro | 官方文档 · Runware · Nano Banana Pro | 渠道资料 · Runware · Nano Banana Pro | 4 |
| https://runware.ai/docs/models/google-nano-banana-pro/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Google Nano Banana Pro API 规格 | 10 |
| https://runware.ai/docs/models/imagineart-1-5 | 官方文档 · Runware · ImagineArt 1.5 | 渠道资料 · Runware · ImagineArt 1.5 | 4 |
| https://runware.ai/docs/models/imagineart-1-5/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · ImagineArt 1.5 API 规格 | 10 |
| https://runware.ai/docs/models/prunaai-p-image-edit | 官方文档 · Runware · P-Image-Edit | 渠道资料 · Runware · P-Image-Edit | 4 |
| https://runware.ai/docs/models/prunaai-p-image-edit/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Prunaai P Image Edit API 规格 | 10 |
| https://runware.ai/docs/models/bria-fibo-2-0 | 官方文档 · Runware · Bria FIBO 2.0 | 渠道资料 · Runware · Bria FIBO 2.0 | 4 |
| https://runware.ai/docs/models/bria-fibo/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Bria Fibo API 规格 | 10 |
| https://runware.ai/docs/models/anthropic-claude-haiku-4-5 | 官方文档 · Runware · Claude Haiku 4.5 | 渠道资料 · Runware · Claude Haiku 4.5 | 4 |
| https://runware.ai/docs/models/anthropic-claude-haiku-4-5/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Anthropic:Claude@Haiku 4.5 API 规格 | 10 |
| https://runware.ai/docs/models/alibaba-wan2-5-preview-image | 官方文档 · Runware · Wan2.5-Preview Image | 渠道资料 · Runware · Wan2.5-Preview Image | 4 |
| https://runware.ai/docs/models/alibaba-wan2-5-preview-image/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Alibaba Wan2.5 Preview Image API 规格 | 10 |
| https://runware.ai/docs/models/alibaba-qwen-image-edit-plus | 官方文档 · Runware · Qwen-Image-Edit-Plus | 渠道资料 · Runware · Qwen-Image-Edit-Plus | 4 |
| https://runware.ai/docs/models/alibaba-qwen-image-edit-plus/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Alibaba Qwen Image Edit Plus API 规格 | 10 |
| https://runware.ai/docs/models/bria-image-replace-background | 官方文档 · Runware · Bria Image Replace Background | 渠道资料 · Runware · Bria Image Replace Background | 4 |
| https://runware.ai/docs/models/bria-image-replace-background/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Bria Image Replace Background API 规格 | 10 |
| https://runware.ai/docs/models/flux-1-dev-srpo | 官方文档 · Runware · FLUX.1 [dev] SRPO | 渠道资料 · Runware · FLUX.1 [dev] SRPO | 4 |
| https://runware.ai/docs/models/flux-1-dev-srpo/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · FLUX.1 [dev] SRPO API 规格 | 10 |
| https://runware.ai/docs/models/bytedance-seedream-4-0 | 官方文档 · Runware · Seedream 4.0 | 渠道资料 · Runware · Seedream 4.0 | 4 |
| https://runware.ai/docs/models/bytedance-seedream-4-0/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Bytedance Seedream 4.0 API 规格 | 10 |
| https://runware.ai/docs/models/google-nano-banana | 官方文档 · Runware · Nano Banana | 渠道资料 · Runware · Nano Banana | 1 |
| https://runware.ai/docs/models/alibaba-qwen-image-edit | 官方文档 · Runware · Qwen-Image-Edit | 渠道资料 · Runware · Qwen-Image-Edit | 4 |
| https://runware.ai/docs/models/alibaba-qwen-image-edit/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Alibaba Qwen Image Edit API 规格 | 10 |
| https://runware.ai/docs/models/runway-gen-4-image-turbo | 官方文档 · Runware · Runway Gen-4 Image Turbo | 渠道资料 · Runware · Runway Gen-4 Image Turbo | 4 |
| https://runware.ai/docs/models/runway-gen-4-image-turbo/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Runway Gen-4 Image Turbo API 规格 | 10 |
| https://runware.ai/docs/models/openai-gpt-5-mini | 官方文档 · Runware · GPT-5 Mini | 渠道资料 · Runware · GPT-5 Mini | 4 |
| https://runware.ai/docs/models/openai-gpt-5-mini/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · OpenAI:GPT@5 Mini API 规格 | 10 |
| https://runware.ai/docs/models/openai-gpt-5-nano | 官方文档 · Runware · GPT-5 Nano | 渠道资料 · Runware · GPT-5 Nano | 4 |
| https://runware.ai/docs/models/openai-gpt-5-nano/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · OpenAI:GPT@5 Nano API 规格 | 10 |
| https://runware.ai/docs/models/alibaba-qwen-image | 官方文档 · Runware · Qwen-Image | 渠道资料 · Runware · Qwen-Image | 4 |
| https://runware.ai/docs/models/alibaba-qwen-image/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Alibaba Qwen Image API 规格 | 10 |
| https://runware.ai/docs/models/krea-flux-1-krea-dev | 官方文档 · Runware · FLUX.1 Krea [dev] | 渠道资料 · Runware · FLUX.1 Krea [dev] | 4 |
| https://runware.ai/docs/models/krea-flux-1-krea-dev/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Krea FLUX.1 Krea [dev] API 规格 | 10 |
| https://runware.ai/docs/models/bfl-flux-1-kontext-pro | 官方文档 · Runware · FLUX.1 Kontext [pro] | 渠道资料 · Runware · FLUX.1 Kontext [pro] | 4 |
| https://runware.ai/docs/models/bfl-flux-1-kontext-pro/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · BFL FLUX.1 Kontext [pro] API 规格 | 10 |
| https://runware.ai/docs/models/bfl-flux-1-kontext-max | 官方文档 · Runware · FLUX.1 Kontext [max] | 渠道资料 · Runware · FLUX.1 Kontext [max] | 4 |
| https://runware.ai/docs/models/bfl-flux-1-kontext-max/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · BFL FLUX.1 Kontext [max] API 规格 | 10 |
| https://runware.ai/docs/models/bfl-flux-1-kontext-dev | 官方文档 · Runware · FLUX.1 Kontext [dev] | 渠道资料 · Runware · FLUX.1 Kontext [dev] | 4 |
| https://runware.ai/docs/models/bfl-flux-1-kontext-dev/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · BFL FLUX.1 Kontext [dev] API 规格 | 10 |
| https://runware.ai/docs/models/stabilityai-stable-diffusion-3 | 官方文档 · Runware · Stable Diffusion 3 | 渠道资料 · Runware · Stable Diffusion 3 | 4 |
| https://runware.ai/docs/models/stabilityai-stable-diffusion-3/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Stabilityai Stable Diffusion 3 API 规格 | 10 |
| https://runware.ai/docs/models/bria-3-2 | 官方文档 · Runware · Bria 3.2 | 渠道资料 · Runware · Bria 3.2 | 4 |
| https://runware.ai/docs/models/bria-3-2/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Bria 3.2 API 规格 | 10 |
| https://runware.ai/docs/models/runway-gen-4-image | 官方文档 · Runware · Runway Gen-4 Image | 渠道资料 · Runware · Runway Gen-4 Image | 4 |
| https://runware.ai/docs/models/runway-gen-4-image/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Runway Gen-4 Image API 规格 | 10 |
| https://runware.ai/docs/models/ideogram-3-0-edit | 官方文档 · Runware · Ideogram 3.0 Edit | 渠道资料 · Runware · Ideogram 3.0 Edit | 4 |
| https://runware.ai/docs/models/ideogram-3-0-edit/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Ideogram 3.0 Edit API 规格 | 10 |
| https://runware.ai/docs/models/ideogram-3-0-remix | 官方文档 · Runware · Ideogram 3.0 Remix | 渠道资料 · Runware · Ideogram 3.0 Remix | 4 |
| https://runware.ai/docs/models/ideogram-3-0-remix/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Ideogram 3.0 Remix API 规格 | 10 |
| https://runware.ai/docs/models/openai-gpt-image-1-mini | 官方文档 · Runware · GPT Image 1 Mini | 渠道资料 · Runware · GPT Image 1 Mini | 4 |
| https://runware.ai/docs/models/openai-gpt-image-1-mini/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · OpenAI GPT Image 1 Mini API 规格 | 10 |
| https://runware.ai/docs/models/hidream-i1-dev | 官方文档 · Runware · HiDream-I1 Dev | 渠道资料 · Runware · HiDream-I1 Dev | 4 |
| https://runware.ai/docs/models/hidream-i1-dev/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · HiDream I1 Dev API 规格 | 10 |
| https://runware.ai/docs/models/hidream-i1-full | 官方文档 · Runware · HiDream-I1 Full | 渠道资料 · Runware · HiDream-I1 Full | 4 |
| https://runware.ai/docs/models/hidream-i1-full/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · HiDream I1 Full API 规格 | 10 |
| https://runware.ai/docs/models/hidream-i1-fast | 官方文档 · Runware · HiDream-I1 Fast | 渠道资料 · Runware · HiDream-I1 Fast | 4 |
| https://runware.ai/docs/models/hidream-i1-fast/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · HiDream I1 Fast API 规格 | 10 |
| https://runware.ai/docs/models/vidu-q1-image | 官方文档 · Runware · Vidu Q1 | 渠道资料 · Runware · Vidu Q1 | 4 |
| https://runware.ai/docs/models/vidu-q1-image/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Vidu:Q1@Image API 规格 | 10 |
| https://runware.ai/docs/models/ideogram-3-0 | 官方文档 · Runware · Ideogram 3.0 | 渠道资料 · Runware · Ideogram 3.0 | 4 |
| https://runware.ai/docs/models/ideogram-3-0/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Ideogram 3.0 API 规格 | 10 |
| https://runware.ai/docs/models/ideogram-3-0-replace-background | 官方文档 · Runware · Ideogram 3.0 Replace Background | 渠道资料 · Runware · Ideogram 3.0 Replace Background | 4 |
| https://runware.ai/docs/models/ideogram-3-0-replace-background/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Ideogram 3.0 Replace Background API 规格 | 10 |
| https://runware.ai/docs/models/openai-gpt-image-1/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · OpenAI GPT Image 1 API 规格 | 10 |
| https://runware.ai/docs/models/rundiffusion-juggernaut-lightning-flux | 官方文档 · Runware · Juggernaut Lightning Flux | 渠道资料 · Runware · Juggernaut Lightning Flux | 4 |
| https://runware.ai/docs/models/rundiffusion-juggernaut-lightning-flux/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Rundiffusion Juggernaut Lightning FLUX API 规格 | 10 |
| https://runware.ai/docs/models/rundiffusion-juggernaut-base-flux | 官方文档 · Runware · Juggernaut Base Flux | 渠道资料 · Runware · Juggernaut Base Flux | 4 |
| https://runware.ai/docs/models/rundiffusion-juggernaut-base-flux/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Rundiffusion Juggernaut Base FLUX API 规格 | 10 |
| https://runware.ai/docs/models/rundiffusion-juggernaut-pro-flux | 官方文档 · Runware · Juggernaut Pro Flux | 渠道资料 · Runware · Juggernaut Pro Flux | 4 |
| https://runware.ai/docs/models/rundiffusion-juggernaut-pro-flux/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Rundiffusion Juggernaut Pro FLUX API 规格 | 10 |
| https://runware.ai/docs/models/ideogram-2a | 官方文档 · Runware · Ideogram 2a | 渠道资料 · Runware · Ideogram 2a | 4 |
| https://runware.ai/docs/models/ideogram-2a/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Ideogram 2a API 规格 | 10 |
| https://runware.ai/docs/models/ideogram-2a-remix | 官方文档 · Runware · Ideogram 2a Remix | 渠道资料 · Runware · Ideogram 2a Remix | 4 |
| https://runware.ai/docs/models/ideogram-2a-remix/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Ideogram 2a Remix API 规格 | 10 |
| https://runware.ai/docs/models/bfl-flux-1-fill-dev | 官方文档 · Runware · FLUX.1 Fill [dev] | 渠道资料 · Runware · FLUX.1 Fill [dev] | 4 |
| https://runware.ai/docs/models/bfl-flux-1-fill-dev/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · BFL FLUX.1 Fill [dev] API 规格 | 10 |
| https://runware.ai/docs/models/bfl-flux-1-1-pro-ultra | 官方文档 · Runware · FLUX.1.1 [pro] Ultra | 渠道资料 · Runware · FLUX.1.1 [pro] Ultra | 4 |
| https://runware.ai/docs/models/bfl-flux-1-1-pro-ultra/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · BFL FLUX.1.1 [pro] Ultra API 规格 | 10 |
| https://runware.ai/docs/models/bfl-flux-1-fill-pro | 官方文档 · Runware · FLUX.1 Fill [pro] | 渠道资料 · Runware · FLUX.1 Fill [pro] | 4 |
| https://runware.ai/docs/models/bfl-flux-1-fill-pro/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · BFL FLUX.1 Fill [pro] API 规格 | 10 |
| https://runware.ai/docs/models/ideogram-2-0-remix | 官方文档 · Runware · Ideogram 2.0 Remix | 渠道资料 · Runware · Ideogram 2.0 Remix | 4 |
| https://runware.ai/docs/models/ideogram-2-0-remix/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Ideogram 2.0 Remix API 规格 | 10 |
| https://runware.ai/docs/models/bfl-flux-1-1-pro | 官方文档 · Runware · FLUX.1.1 [pro] | 渠道资料 · Runware · FLUX.1.1 [pro] | 4 |
| https://runware.ai/docs/models/bfl-flux-1-1-pro/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · BFL FLUX.1.1 [pro] API 规格 | 10 |
| https://runware.ai/docs/models/ideogram-2-0 | 官方文档 · Runware · Ideogram 2.0 | 渠道资料 · Runware · Ideogram 2.0 | 4 |
| https://runware.ai/docs/models/ideogram-2-0/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Ideogram 2.0 API 规格 | 10 |
| https://runware.ai/docs/models/bfl-flux-1-schnell | 官方文档 · Runware · FLUX.1 [schnell] | 渠道资料 · Runware · FLUX.1 [schnell] | 4 |
| https://runware.ai/docs/models/bfl-flux-1-schnell/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · BFL FLUX.1 [schnell] API 规格 | 10 |
| https://runware.ai/docs/models/bfl-flux-1-dev | 官方文档 · Runware · FLUX.1 [dev] | 渠道资料 · Runware · FLUX.1 [dev] | 4 |
| https://runware.ai/docs/models/bfl-flux-1-dev/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · BFL FLUX.1 [dev] API 规格 | 10 |
| https://runware.ai/docs/models/meta-llava-1-6-mistral-7b | 官方文档 · Runware · LLaVA-1.6-Mistral-7B | 渠道资料 · Runware · LLaVA-1.6-Mistral-7B | 4 |
| https://runware.ai/docs/models/meta-llava-1-6-mistral-7b/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Meta LLaVA-1.6 Mistral-7B API 规格 | 10 |
| https://runware.ai/docs/models/alibaba-qwen2-5-vl-3b-instruct | 官方文档 · Runware · Qwen2.5-VL-3B-Instruct | 渠道资料 · Runware · Qwen2.5-VL-3B-Instruct | 4 |
| https://runware.ai/docs/models/alibaba-qwen2-5-vl-3b-instruct/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Alibaba Qwen2.5 VL-3B Instruct API 规格 | 10 |
| https://runware.ai/docs/models/alibaba-qwen2-5-vl-7b-instruct | 官方文档 · Runware · Qwen2.5-VL-7B-Instruct | 渠道资料 · Runware · Qwen2.5-VL-7B-Instruct | 4 |
| https://runware.ai/docs/models/alibaba-qwen2-5-vl-7b-instruct/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Alibaba Qwen2.5 VL-7B Instruct API 规格 | 10 |
| https://runware.ai/docs/models/stabilityai-stable-diffusion-xl-v1-0-vae-fix | 官方文档 · Runware · Stable Diffusion XL v1.0 VAE Fix | 渠道资料 · Runware · Stable Diffusion XL v1.0 VAE Fix | 4 |
| https://runware.ai/docs/models/stabilityai-stable-diffusion-xl-v1-0-vae-fix/schema.json | 图研既有核实 · Runware · Schema.Json | 渠道资料 · Runware · Stabilityai Stable Diffusion XL v1.0 VAE Fix API 规格 | 10 |
| https://cloud.tencent.com/document/product/1823/130051 | 图研既有核实 · 腾讯云 · 文档 130051<br>官方文档 · 腾讯云 · 文档 130051 | 渠道资料 · 腾讯云 · 文档 130051 | 250 |
| https://cloud.tencent.com/document/product/1823/130079 | 官方文档 · 腾讯云 · 文档 130079 | 渠道资料 · 腾讯云 · 文档 130079 | 6 |
| https://cloud.tencent.com/document/product/1823/130055 | 官方文档 · 腾讯云 · 文档 130055 | 渠道资料 · 腾讯云 · 文档 130055 | 4 |
| https://cloud.tencent.com/document/product/1823/132248 | 官方文档 · 腾讯云 · 文档 132248 | 渠道资料 · 腾讯云 · 文档 132248 | 12 |
| https://cloud.tencent.com/document/product/1823/132061 | 官方文档 · 腾讯云 · 文档 132061 | 渠道资料 · 腾讯云 · 文档 132061 | 8 |
| https://cloud.tencent.com/document/product/1823/132252 | 官方文档 · 腾讯云 · 文档 132252 | 渠道资料 · 腾讯云 · 文档 132252 | 6 |
| https://cloud.tencent.com/document/product/1823/132232 | 官方文档 · 腾讯云 · 文档 132232 | 渠道资料 · 腾讯云 · 文档 132232 | 7 |
| https://cloud.tencent.com/document/product/1823/132246 | 官方文档 · 腾讯云 · 文档 132246 | 渠道资料 · 腾讯云 · 文档 132246 | 3 |
| https://cloud.tencent.com/document/product/1823/136956 | 官方文档 · 腾讯云 · 文档 136956 | 渠道资料 · 腾讯云 · 文档 136956 | 3 |
| https://cloud.tencent.com/document/product/1823/135745 | 官方文档 · 腾讯云 · 文档 135745 | 渠道资料 · 腾讯云 · 文档 135745 | 2 |
| https://mimo.mi.com/models/en-US/mimo-v2.6-flash | 图研既有核实 · MiMo · MiMo V2.6 Flash<br>官方文档 · MiMo · MiMo V2.6 Flash<br>官方文档 · MiMo · MiMo-V2.6-Flash | 官方文档 · MiMo · MiMo V2.6 Flash | 24 |
| https://mimo.mi.com/models/en-US/mimo-v2.6-pro | 图研既有核实 · MiMo · MiMo V2.6 Pro<br>官方文档 · MiMo · MiMo V2.6 Pro<br>官方文档 · MiMo · MiMo-V2.6-Pro | 官方文档 · MiMo · MiMo V2.6 Pro | 24 |
| https://cloud.tencent.com/document/product/1823/136609 | 官方文档 · 腾讯云 · 文档 136609 | 渠道资料 · 腾讯云 · 文档 136609 | 2 |
| https://cloud.tencent.com/document/product/1823/135746 | 官方文档 · 腾讯云 · 文档 135746 | 渠道资料 · 腾讯云 · 文档 135746 | 1 |
| https://cloud.tencent.com/document/product/1823/137203 | 官方文档 · 腾讯云 · 文档 137203 | 渠道资料 · 腾讯云 · 文档 137203 | 3 |
| https://platform.sensenova.cn/docs | 图研既有核实 · SenseNova · 文档首页<br>官方文档 · SenseNova · 文档首页 | 官方文档 · SenseNova · 文档首页 | 20 |
| https://github.com/OpenSenseNova/SenseNova6.8/blob/main/API.md | 图研既有核实 · GitHub · API<br>官方文档 · GitHub · API | 官方文档 · GitHub · API | 20 |
| https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5 | 官方文档 · 百度千帆 · 千帆 ModelBuilder 旧版入口（平台首页） | 渠道资料 · 百度千帆 · 千帆 ModelBuilder 旧版入口（平台首页） | 51 |
| https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j | 图研既有核实 · 百度千帆 · 模型列表<br>官方文档 · 百度千帆 · 模型列表 | 渠道资料 · 百度千帆 · 模型列表 | 278 |
| https://huggingface.co/deepseek-ai/DeepSeek-OCR | 图研既有核实 · Hugging Face · DeepSeek OCR<br>官方文档 · Hugging Face · DeepSeek-OCR | 官方文档 · Hugging Face · DeepSeek OCR | 24 |
| https://cloud.baidu.com/doc/qianfan-docs/s/Jm8r1826a | 官方文档 · 百度千帆 · AI 应用开发入门：价格 | 渠道资料 · 百度千帆 · AI 应用开发入门：价格 | 1 |
| https://huggingface.co/OpenGVLab/InternVL3-38B | 图研既有核实 · Hugging Face · InternVL3-38B<br>官方文档 · Hugging Face · InternVL3-38B | 官方文档 · Hugging Face · InternVL3-38B | 18 |
| https://www.xfyun.cn/doc/spark/HTTP%E8%B0%83%E7%94%A8%E6%96%87%E6%A1%A3.html | 图研既有核实 · 讯飞星火 · HTTP调用文档<br>官方文档 · 讯飞星火 · HTTP调用文档 | 官方文档 · 讯飞星火 · HTTP调用文档 | 40 |
| https://maas.xfyun.cn/api/v1/gpt-finetune/model/base/list-v2?page=1&size=9999 | 图研既有核实 · 讯飞星辰 · List V2 | 官方文档 · 讯飞星辰 · List V2 | 70 |
| https://huggingface.co/Qwen/Qwen2.5-14B-Instruct | 图研既有核实 · Hugging Face · Qwen2.5-14B Instruct<br>官方文档 · Hugging Face · Qwen2.5-14B Instruct | 官方文档 · Hugging Face · Qwen2.5-14B Instruct | 20 |
| https://longcat.ai/platform/docs/zh/api/model-params | 图研既有核实 · LongCat · Model Params<br>官方文档 · LongCat · Model Params | 官方文档 · LongCat · Model Params | 20 |
| https://longcat.chat/platform/docs/change-log | 官方文档 · LongCat · Change Log<br>渠道资料 · LongCat · Change Log | 官方文档 · LongCat · Change Log | 4 |
| https://developer.ant-ling.com/zh-CN/docs/api-reference/chat/openai | 官方文档 · 蚂蚁百灵 · OpenAI<br>官方文档 · 蚂蚁百灵 · OpenAI（对话接口兼容指南）<br>渠道资料 · 蚂蚁百灵 · OpenAI | 官方文档 · 蚂蚁百灵 · OpenAI（对话接口兼容指南） | 62 |
| https://developer.ant-ling.com/zh-CN/docs/api-reference/openai | 官方文档 · 蚂蚁百灵 · OpenAI<br>官方文档 · 蚂蚁百灵 · OpenAI（接口兼容指南） | 官方文档 · 蚂蚁百灵 · OpenAI（接口兼容指南） | 3 |
| https://huggingface.co/inclusionAI/Ling-2.6-1T | 图研既有核实 · Hugging Face · Ling 2.6-1T<br>官方文档 · Hugging Face · Ling 2.6-1T | 官方文档 · Hugging Face · Ling 2.6-1T | 10 |
| https://huggingface.co/inclusionAI/Ling-2.6-flash | 图研既有核实 · Hugging Face · Ling 2.6 Flash<br>官方文档 · Hugging Face · Ling 2.6 Flash | 官方文档 · Hugging Face · Ling 2.6 Flash | 10 |
| https://huggingface.co/inclusionAI/Ring-2.6-1T | 图研既有核实 · Hugging Face · Ring 2.6-1T<br>官方文档 · Hugging Face · Ring 2.6-1T | 官方文档 · Hugging Face · Ring 2.6-1T | 10 |
| https://docs.novita.ai/api-reference/model-apis-ming-image-txt2img | 图研既有核实 · Novita · Model Apis Ming Image Txt2img<br>官方文档 · Novita · Model Apis Ming Image Txt2img | 渠道资料 · Novita · Model Apis Ming Image Txt2img | 24 |
| https://docs.novita.ai/api-reference/model-apis-llm-list-models | 官方文档 · Novita · Model Apis Llm List Models | 渠道资料 · Novita · Model Apis Llm List Models | 1 |
| https://novita.ai/models/model-detail/ming-image-0.1-design | 官方文档 · Novita · Ming Image 0.1 Design | 渠道资料 · Novita · Ming Image 0.1 Design | 1 |
