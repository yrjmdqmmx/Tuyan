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
