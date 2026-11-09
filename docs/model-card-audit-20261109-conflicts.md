# 模型卡 85 项冲突复核 · 2026-11-09 R6A

基线 main `c7b6a2fc`，保留 R4 的原始 85 行及审计值，逐项复核精确渠道和型号。以下原文仅合并排版空白；没有原文的行明确标为未证实，不伪造引文。机器可读证据与决策见 `config/channel-audit/review-r6a-20261109.json`。

**49 项由官方原文支持；36 项撤回审计覆盖，回退既有值/未知。** 模态始终保留既有支持项及图研输入要求，未列出的模态是未知。厂商 token 参考仍标“原厂”；第三方 DeepSeek Flash 的图像能力不能继承原厂页面。

Qwen Plus 三个日期快照均逐一定位到该版本的“上下文限制”，不是取同页其他版本。R8 按百炼 Kimi K3 精确规格表采用 1048576 上下文（下方补充原文）。TokenDance LongCat-2.0 采用精确 ID 的 `context_length`；SiliconFlow Qwen3.8-27B 未取得渠道原文，撤回 1M 覆盖；只读 `git show c7b6a2fc:apps/web/src/lib/staticModelCatalog.js` 确认该精确身份无窗口字段，静态卡显示“未知”，不采用 262144。动态卡仅在自身提供已核实规格时回退。Ling VL 使用其本节 256K 原文，普通 Flash 保留原生窗口和扩展窗口的区别。

| # | 渠道 / API ID | 字段 | 原审计值 | 既有值 | 官方原文 | 本轮决定 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | deepseek / `deepseek-flash` | maxOutputTokens | 393216 | 384000 | “MAX OUTPUT MAXIMUM: 384K” [原文](https://api-docs.deepseek.com/quick_start/pricing/) | 采用 384K；模态取并集 |
| 2 | deepseek / `deepseek-v4-flash-vision-exp` | maxOutputTokens | 393216 | 384000 | “MAX OUTPUT MAXIMUM: 384K” [原文](https://api-docs.deepseek.com/quick_start/pricing/) | 采用 384K；模态取并集 |
| 3 | deepseek / `deepseek-v4-pro` | maxOutputTokens | 393216 | 384000 | “MAX OUTPUT MAXIMUM: 384K” [原文](https://api-docs.deepseek.com/quick_start/pricing/) | 采用 384K；模态取并集 |
| 4 | deepseek / `deepseek-v4-flash` | maxOutputTokens | 393216 | 384000 | “MAX OUTPUT MAXIMUM: 384K” [原文](https://api-docs.deepseek.com/quick_start/pricing/) | 采用 384K；模态取并集 |
| 5 | xai / `grok-4.20-multi-agent-0309` | inputModalities | ["text"] | ["text","image"] | “Modalities Text, Image Text” [原文](https://docs.x.ai/developers/models/grok-4.20-multi-agent-0309) | 采用 ["text","image"]；模态取并集 |
| 6 | bailian / `qwen3.8-flash` | inputModalities | ["text"] | ["text","image","video"] | 未取得支持原审计值的精确渠道原文；已查：[原文](https://help.aliyun.com/zh/model-studio/models)、[原文](https://help.aliyun.com/zh/model-studio/vision-model)、[原文](https://help.aliyun.com/zh/model-studio/text-generation-model) | 未获得支持原审计值的精确渠道原文；撤回该审计字段，使用既有值，缺项为未知。 已知模态取并集；图研必需的图像输入独立保留。 |
| 7 | bailian / `glm-5.2-fast-preview` | totalContextTokens | 1048576 | 1000000 | “支持 1M 超长上下文” [原文](https://www.qianwenai.com/models/glm-5.2-fast-preview) | 采用 1M；模态取并集 |
| 8 | bailian / `qwen3.7-max-2026-06-08` | inputModalities | ["text"] | ["text","image","video"] | 未取得支持原审计值的精确渠道原文；已查：[原文](https://help.aliyun.com/zh/model-studio/models)、[原文](https://help.aliyun.com/zh/model-studio/qwen3-7-max) | 未获得支持原审计值的精确渠道原文；撤回该审计字段，使用既有值，缺项为未知。 已知模态取并集；图研必需的图像输入独立保留。 |
| 9 | bailian / `qwen-max` | totalContextTokens | 32768 | 32000 | “qwen-max 32k” [原文](https://help.aliyun.com/zh/model-studio/text-generation-model) | 采用 32k；模态取并集 |
| 10 | bailian / `qwen-plus-2025-01-25` | totalContextTokens | 131072 | 1000000 | “上下文长度 131072” [原文](https://help.aliyun.com/zh/model-studio/qwen-plus)（qwen-plus-2025-01-25 / 上下文限制） | 采用 131072；模态取并集 |
| 11 | bailian / `qwen-plus-2025-04-28` | totalContextTokens | 131072 | 1000000 | “上下文长度 131072” [原文](https://help.aliyun.com/zh/model-studio/qwen-plus)（qwen-plus-2025-04-28 / 上下文限制） | 采用 131072；模态取并集 |
| 12 | bailian / `qwen-plus-2025-07-14` | totalContextTokens | 131072 | 1000000 | “上下文长度 131072” [原文](https://help.aliyun.com/zh/model-studio/qwen-plus)（qwen-plus-2025-07-14 / 上下文限制） | 采用 131072；模态取并集 |
| 13 | together / `Qwen/Qwen3.8-Flash` | inputModalities | ["text"] | ["text","image","video"] | 未取得支持原审计值的精确渠道原文；已查：[原文](https://help.aliyun.com/zh/model-studio/models)、[原文](https://help.aliyun.com/zh/model-studio/vision-model)、[原文](https://help.aliyun.com/zh/model-studio/text-generation-model) | 未获得支持原审计值的精确渠道原文；撤回该审计字段，使用既有值，缺项为未知。 已知模态取并集；图研必需的图像输入独立保留。 |
| 14 | fal / `fal-ai/nano-banana-2` | inputModalities | ["text"] | ["text","image","video","file"] | 未取得支持原审计值的精确渠道原文；已查：[原文](https://api.fal.ai/v1/models)、[原文](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-image) | 未获得支持原审计值的精确渠道原文；撤回该审计字段，使用既有值，缺项为未知。 已知模态取并集；图研必需的图像输入独立保留。 |
| 15 | fal / `fal-ai/nano-banana-2` | outputModalities | ["image"] | ["text","image"] | 未取得支持原审计值的精确渠道原文；已查：[原文](https://api.fal.ai/v1/models)、[原文](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-image) | 未获得支持原审计值的精确渠道原文；撤回该审计字段，使用既有值，缺项为未知。 已知模态取并集；图研必需的图像输入独立保留。 |
| 16 | fal / `google/nano-banana-2-lite` | inputModalities | ["text"] | ["text","image","video","file"] | 未取得支持原审计值的精确渠道原文；已查：[原文](https://api.fal.ai/v1/models)、[原文](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite-image) | 未获得支持原审计值的精确渠道原文；撤回该审计字段，使用既有值，缺项为未知。 已知模态取并集；图研必需的图像输入独立保留。 |
| 17 | fal / `google/nano-banana-2-lite` | outputModalities | ["image"] | ["text","image"] | 未取得支持原审计值的精确渠道原文；已查：[原文](https://api.fal.ai/v1/models)、[原文](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite-image) | 未获得支持原审计值的精确渠道原文；撤回该审计字段，使用既有值，缺项为未知。 已知模态取并集；图研必需的图像输入独立保留。 |
| 18 | fal / `fal-ai/nano-banana-pro` | inputModalities | ["text"] | ["text","image"] | 未取得支持原审计值的精确渠道原文；已查：[原文](https://api.fal.ai/v1/models)、[原文](https://ai.google.dev/gemini-api/docs/models/gemini-3-pro-image) | 未获得支持原审计值的精确渠道原文；撤回该审计字段，使用既有值，缺项为未知。 已知模态取并集；图研必需的图像输入独立保留。 |
| 19 | fal / `fal-ai/nano-banana-pro` | outputModalities | ["image"] | ["text","image"] | 未取得支持原审计值的精确渠道原文；已查：[原文](https://api.fal.ai/v1/models)、[原文](https://ai.google.dev/gemini-api/docs/models/gemini-3-pro-image) | 未获得支持原审计值的精确渠道原文；撤回该审计字段，使用既有值，缺项为未知。 已知模态取并集；图研必需的图像输入独立保留。 |
| 20 | fal / `fal-ai/nano-banana` | inputModalities | ["text"] | ["text","image"] | 未取得支持原审计值的精确渠道原文；已查：[原文](https://api.fal.ai/v1/models)、[原文](https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-image) | 未获得支持原审计值的精确渠道原文；撤回该审计字段，使用既有值，缺项为未知。 已知模态取并集；图研必需的图像输入独立保留。 |
| 21 | fal / `fal-ai/nano-banana` | outputModalities | ["image"] | ["text","image"] | 未取得支持原审计值的精确渠道原文；已查：[原文](https://api.fal.ai/v1/models)、[原文](https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-image) | 未获得支持原审计值的精确渠道原文；撤回该审计字段，使用既有值，缺项为未知。 已知模态取并集；图研必需的图像输入独立保留。 |
| 22 | tokendance / `deepseek-v4-flash` | inputModalities | ["text","image"] | ["text"] | 未取得支持原审计值的精确渠道原文；已查：[原文](https://api-docs.deepseek.com/quick_start/pricing/)、[原文](https://api-docs.deepseek.com/news/news260424/)、[原文](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash) | 原厂页面不能证明第三方渠道的图像输入；撤回跨渠道继承，回退既有值/未知。 已知模态取并集；图研必需的图像输入独立保留。 |
| 23 | tokendance / `deepseek-v4-pro` | totalContextTokens | 1048576 | 1000000 | “"context_length":1048576” [原文](https://tokendance.space/gateway/v1/models) | 采用 1048576；模态取并集 |
| 24 | tokendance / `hy4-preview` | totalContextTokens | 1024000 | 1000000 | “"context_length":1024000” [原文](https://tokendance.space/gateway/v1/models) | 采用 1024000；模态取并集 |
| 25 | tokendance / `qwen3.8-flash` | inputModalities | ["text"] | ["text","image","video"] | 未取得支持原审计值的精确渠道原文；已查：[原文](https://help.aliyun.com/zh/model-studio/models)、[原文](https://help.aliyun.com/zh/model-studio/vision-model)、[原文](https://help.aliyun.com/zh/model-studio/text-generation-model) | 未获得支持原审计值的精确渠道原文；撤回该审计字段，使用既有值，缺项为未知。 已知模态取并集；图研必需的图像输入独立保留。 |
| 26 | tokendance / `qwen3.5-35b-a3b` | totalContextTokens | 256000 | 262144 | “"context_length":256000” [原文](https://tokendance.space/gateway/v1/models) | 采用 256000；模态取并集 |
| 27 | tokendance / `seed-evolving` | totalContextTokens | 1000000 | 1024000 | “"context_length":1000000” [原文](https://tokendance.space/gateway/v1/models) | 采用 1000000；模态取并集 |
| 28 | tokenhub / `deepseek-v4-flash` | inputModalities | ["text","image"] | ["text"] | 未取得支持原审计值的精确渠道原文；已查：[原文](https://api-docs.deepseek.com/quick_start/pricing/)、[原文](https://api-docs.deepseek.com/news/news260424/)、[原文](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash) | 原厂页面不能证明第三方渠道的图像输入；撤回跨渠道继承，回退既有值/未知。 已知模态取并集；图研必需的图像输入独立保留。 |
| 29 | xiaomi / `mimo-v2.6-flash` | maxOutputTokens | 128000 | 131072 | “最大输出：128K” [原文](https://mimo.mi.com/docs/zh-CN/quick-start/summary/model) | 采用 128K；模态取并集 |
| 30 | xiaomi / `mimo-v2.6-pro` | maxOutputTokens | 128000 | 131072 | “最大输出：128K” [原文](https://mimo.mi.com/docs/zh-CN/quick-start/summary/model) | 采用 128K；模态取并集 |
| 31 | xiaomi / `mimo-v2.6-pro-ultraspeed` | totalContextTokens | 1000000 | 1048576 | “上下文窗口：1M” [原文](https://mimo.mi.com/docs/zh-CN/quick-start/summary/model) | 采用 1M；模态取并集 |
| 32 | xiaomi / `mimo-v2.6-pro-ultraspeed` | maxOutputTokens | 128000 | 131072 | “最大输出：128K” [原文](https://mimo.mi.com/docs/zh-CN/quick-start/summary/model) | 采用 128K；模态取并集 |
| 33 | sensenova / `deepseek-v4-flash` | inputModalities | ["text","image"] | ["text"] | 未取得支持原审计值的精确渠道原文；已查：[原文](https://api-docs.deepseek.com/quick_start/pricing/)、[原文](https://api-docs.deepseek.com/news/news260424/)、[原文](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash) | 原厂页面不能证明第三方渠道的图像输入；撤回跨渠道继承，回退既有值/未知。 已知模态取并集；图研必需的图像输入独立保留。 |
| 34 | qianfan / `deepseek-v4-flash` | inputModalities | ["text","image"] | ["text"] | 未取得支持原审计值的精确渠道原文；已查：[原文](https://api-docs.deepseek.com/quick_start/pricing/)、[原文](https://api-docs.deepseek.com/news/news260424/)、[原文](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash) | 原厂页面不能证明第三方渠道的图像输入；撤回跨渠道继承，回退既有值/未知。 已知模态取并集；图研必需的图像输入独立保留。 |
| 35 | siliconflow / `Qwen/Qwen3.8-27B` | totalContextTokens | 1000000 | null（main 缺项） | 未取得支持原审计值的精确渠道原文；已查：[原文](https://help.aliyun.com/zh/model-studio/models)、[原文](https://huggingface.co/Qwen/Qwen3.8-27B) | 未获得支持原审计值的精确渠道原文；撤回该审计字段，使用既有值，缺项为未知。 |
| 36 | siliconflow / `deepseek-ai/DeepSeek-V4-Flash` | inputModalities | ["text","image"] | ["text"] | 未取得支持原审计值的精确渠道原文；已查：[原文](https://api-docs.deepseek.com/quick_start/pricing/)、[原文](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash) | 原厂页面不能证明第三方渠道的图像输入；撤回跨渠道继承，回退既有值/未知。 已知模态取并集；图研必需的图像输入独立保留。 |
| 37 | xai / `grok-4.7` | inputModalities | ["text"] | ["text","image"] | “Modalities Text, Image Text” [原文](https://docs.x.ai/developers/models/grok-4.7) | 采用 ["text","image"]；模态取并集 |
| 38 | xai / `grok-4.6` | inputModalities | ["text"] | ["text","image"] | “Modalities Text, Image Text” [原文](https://docs.x.ai/developers/models/grok-4.6) | 采用 ["text","image"]；模态取并集 |
| 39 | xai / `grok-4.5` | inputModalities | ["text"] | ["text","image"] | “Modalities Text, Image Text” [原文](https://docs.x.ai/developers/models/grok-4.5) | 采用 ["text","image"]；模态取并集 |
| 40 | xai / `grok-4.3` | inputModalities | ["text"] | ["text","image"] | “Modalities Text, Image Text” [原文](https://docs.x.ai/developers/models/grok-4.3) | 采用 ["text","image"]；模态取并集 |
| 41 | xai / `grok-4.20-0309-non-reasoning` | inputModalities | ["text"] | ["text","image"] | “Modalities Text, Image Text” [原文](https://docs.x.ai/developers/models/grok-4.20-0309-non-reasoning) | 采用 ["text","image"]；模态取并集 |
| 42 | xai / `grok-4.20-0309-reasoning` | inputModalities | ["text"] | ["text","image"] | “Modalities Text, Image Text” [原文](https://docs.x.ai/developers/models/grok-4.20-0309-reasoning) | 采用 ["text","image"]；模态取并集 |
| 43 | xai / `grok-build-0.1` | inputModalities | ["text"] | ["text","image"] | “Modalities Text, Image Text” [原文](https://docs.x.ai/developers/models/grok-build-0.1) | 采用 ["text","image"]；模态取并集 |
| 44 | bailian / `kimi-k3` | totalContextTokens | 262144 | 1000000 | “上下文长度” / “1048576”（完整表格原文见 R8 补充） [原文](https://help.aliyun.com/zh/model-studio/kimi-k3) | R8 采用 1048576；输入仅 text、image，输出 text |
| 45 | bailian / `qwen3.8-27b` | totalContextTokens | 1000000 | 262144 | “上下文长度 1000000” [原文](https://help.aliyun.com/zh/model-studio/qwen3-8-27b) | 采用 1000000；模态取并集 |
| 46 | bailian / `ZHIPU/GLM-5.3` | totalContextTokens | 1048576 | 1000000 | 未取得支持原审计值的精确渠道原文；已查：[原文](https://help.aliyun.com/zh/model-studio/models)、[原文](https://docs.bigmodel.cn/cn/guide/models/text/glm-5.3) | 未获得支持原审计值的精确渠道原文；撤回该审计字段，使用既有值，缺项为未知。 |
| 47 | bailian / `qwen3.8-2.4t-a95b` | totalContextTokens | 1000000 | 262144 | “上下文长度 1000000” [原文](https://help.aliyun.com/zh/model-studio/qwen3-8-2-4t-a95b) | 采用 1000000；模态取并集 |
| 48 | bailian / `MiniMax/MiniMax-M3` | totalContextTokens | 1048576 | 1000000 | 未取得支持原审计值的精确渠道原文；已查：[原文](https://help.aliyun.com/zh/model-studio/models)、[原文](https://huggingface.co/MiniMaxAI/MiniMax-M3) | 未获得支持原审计值的精确渠道原文；撤回该审计字段，使用既有值，缺项为未知。 |
| 49 | bailian / `ZHIPU/GLM-5.2` | totalContextTokens | 1048576 | 1000000 | 未取得支持原审计值的精确渠道原文；已查：[原文](https://help.aliyun.com/zh/model-studio/models)、[原文](https://docs.bigmodel.cn/cn/guide/models/text/glm-5.2) | 未获得支持原审计值的精确渠道原文；撤回该审计字段，使用既有值，缺项为未知。 |
| 50 | bailian / `qwen-image-3.0` | inputModalities | ["text"] | ["image","text"] | 未取得支持原审计值的精确渠道原文；已查：[原文](https://help.aliyun.com/zh/model-studio/models)、[原文](https://help.aliyun.com/zh/model-studio/qwen-image-3-0) | 未获得支持原审计值的精确渠道原文；撤回该审计字段，使用既有值，缺项为未知。 已知模态取并集；图研必需的图像输入独立保留。 |
| 51 | bailian / `qwen-image-3.0-pro` | inputModalities | ["text"] | ["image","text"] | 未取得支持原审计值的精确渠道原文；已查：[原文](https://help.aliyun.com/zh/model-studio/models)、[原文](https://help.aliyun.com/zh/model-studio/qwen-image-3-0-pro) | 未获得支持原审计值的精确渠道原文；撤回该审计字段，使用既有值，缺项为未知。 已知模态取并集；图研必需的图像输入独立保留。 |
| 52 | bailian / `glm-5.2` | totalContextTokens | 1048576 | 1000000 | “上下文长度 1048576” [原文](https://help.aliyun.com/zh/model-studio/glm-5-2) | 采用 1048576；模态取并集 |
| 53 | bailian / `ZHIPU/GLM-5.1` | totalContextTokens | 202745 | 200000 | 未取得支持原审计值的精确渠道原文；已查：[原文](https://help.aliyun.com/zh/model-studio/models)、[原文](https://docs.bigmodel.cn/cn/guide/models/text/glm-5.1) | 未获得支持原审计值的精确渠道原文；撤回该审计字段，使用既有值，缺项为未知。 |
| 54 | bailian / `glm-5.1` | totalContextTokens | 202745 | 200000 | “上下文长度 202745” [原文](https://help.aliyun.com/zh/model-studio/glm-5-1) | 采用 202745；模态取并集 |
| 55 | bailian / `kimi/kimi-k3` | totalContextTokens | 262144 | 1000000 | 未取得支持原审计值的精确渠道原文；已查：[原文](https://help.aliyun.com/zh/model-studio/models)、[原文](https://huggingface.co/moonshotai/Kimi-K3) | 未获得支持原审计值的精确渠道原文；撤回该审计字段，使用既有值，缺项为未知。 |
| 56 | bailian / `kimi-k2.7-code` | totalContextTokens | 262144 | 256000 | “上下文长度 262144” [原文](https://help.aliyun.com/zh/model-studio/kimi-k2-7-code) | 采用 262144；模态取并集 |
| 57 | bailian / `kimi/kimi-k2.7-code` | totalContextTokens | 262144 | 256000 | 未取得支持原审计值的精确渠道原文；已查：[原文](https://help.aliyun.com/zh/model-studio/models)、[原文](https://huggingface.co/moonshotai/Kimi-K2.7-Code) | 未获得支持原审计值的精确渠道原文；撤回该审计字段，使用既有值，缺项为未知。 |
| 58 | bailian / `kimi-k2.6` | totalContextTokens | 262144 | 256000 | “上下文长度 262144” [原文](https://help.aliyun.com/zh/model-studio/kimi-k2-6) | 采用 262144；模态取并集 |
| 59 | bailian / `kimi/kimi-k2.6` | totalContextTokens | 262144 | 256000 | 未取得支持原审计值的精确渠道原文；已查：[原文](https://help.aliyun.com/zh/model-studio/models)、[原文](https://huggingface.co/moonshotai/Kimi-K2.6) | 未获得支持原审计值的精确渠道原文；撤回该审计字段，使用既有值，缺项为未知。 |
| 60 | bailian / `kimi-k2.5` | totalContextTokens | 262144 | 256000 | “上下文长度 262144” [原文](https://help.aliyun.com/zh/model-studio/kimi-k2-5) | 采用 262144；模态取并集 |
| 61 | bailian / `qwen-image-2.0` | inputModalities | ["text"] | ["text","image"] | “输入模态 Text Image” [原文](https://help.aliyun.com/zh/model-studio/qwen-image-2-0) | 采用 ["text","image"]；模态取并集 |
| 62 | bailian / `qwen-image-2.0-pro` | inputModalities | ["text"] | ["text","image"] | “输入模态 Text Image” [原文](https://help.aliyun.com/zh/model-studio/qwen-image-2-0-pro) | 采用 ["text","image"]；模态取并集 |
| 63 | bailian / `wan2.7-image` | inputModalities | ["text"] | ["image","text"] | 未取得支持原审计值的精确渠道原文；已查：[原文](https://help.aliyun.com/zh/model-studio/models)、[原文](https://help.aliyun.com/zh/model-studio/wan2-7-image) | 未获得支持原审计值的精确渠道原文；撤回该审计字段，使用既有值，缺项为未知。 已知模态取并集；图研必需的图像输入独立保留。 |
| 64 | bailian / `wan2.7-image-pro` | inputModalities | ["text"] | ["image","text"] | 未取得支持原审计值的精确渠道原文；已查：[原文](https://help.aliyun.com/zh/model-studio/models)、[原文](https://help.aliyun.com/zh/model-studio/wan2-7-image-pro) | 未获得支持原审计值的精确渠道原文；撤回该审计字段，使用既有值，缺项为未知。 已知模态取并集；图研必需的图像输入独立保留。 |
| 65 | bailian / `wan2.6-image` | inputModalities | ["text"] | ["text","image"] | “输入模态 Text Image” [原文](https://help.aliyun.com/zh/model-studio/wan2-6-image) | 采用 ["text","image"]；模态取并集 |
| 66 | bailian / `wan2.6-image` | outputModalities | ["image"] | ["image","text"] | “输出模态 Image Text” [原文](https://help.aliyun.com/zh/model-studio/wan2-6-image) | 采用 ["text","image"]；模态取并集 |
| 67 | bailian / `wanx2.1-imageedit` | inputModalities | ["text"] | ["text","image"] | “base_image_url string （必选） 输入图像的 URL 或 Base64 编码数据。” [原文](https://help.aliyun.com/zh/model-studio/wanx-image-edit-api-reference) | 采用 ["text","image"]；模态取并集 |
| 68 | together / `Qwen/Qwen-Image-2.0` | inputModalities | ["text"] | ["text","image"] | 未取得支持原审计值的精确渠道原文；已查：[原文](https://help.aliyun.com/zh/model-studio/models)、[原文](https://help.aliyun.com/zh/model-studio/qwen-image-2-0) | 未获得支持原审计值的精确渠道原文；撤回该审计字段，使用既有值，缺项为未知。 已知模态取并集；图研必需的图像输入独立保留。 |
| 69 | together / `Qwen/Qwen-Image-2.0-Pro` | inputModalities | ["text"] | ["text","image"] | 未取得支持原审计值的精确渠道原文；已查：[原文](https://help.aliyun.com/zh/model-studio/models)、[原文](https://help.aliyun.com/zh/model-studio/qwen-image-2-0-pro) | 未获得支持原审计值的精确渠道原文；撤回该审计字段，使用既有值，缺项为未知。 已知模态取并集；图研必需的图像输入独立保留。 |
| 70 | together / `Qwen/Qwen3.8-2.4T-A95B` | totalContextTokens | 1000000 | 262144 | 未取得支持原审计值的精确渠道原文；已查：[原文](https://help.aliyun.com/zh/model-studio/models)、[原文](https://huggingface.co/Qwen/Qwen3.8-2.4T-A95B) | 未获得支持原审计值的精确渠道原文；撤回该审计字段，使用既有值，缺项为未知。 |
| 71 | together / `Wan-AI/Wan2.6-image` | inputModalities | ["text"] | ["text","image"] | 未取得支持原审计值的精确渠道原文；已查：[原文](https://help.aliyun.com/zh/model-studio/models)、[原文](https://help.aliyun.com/zh/model-studio/wan2-6-image) | 未获得支持原审计值的精确渠道原文；撤回该审计字段，使用既有值，缺项为未知。 已知模态取并集；图研必需的图像输入独立保留。 |
| 72 | together / `Wan-AI/Wan2.6-image` | outputModalities | ["image"] | ["image","text"] | 未取得支持原审计值的精确渠道原文；已查：[原文](https://help.aliyun.com/zh/model-studio/models)、[原文](https://help.aliyun.com/zh/model-studio/wan2-6-image) | 未获得支持原审计值的精确渠道原文；撤回该审计字段，使用既有值，缺项为未知。 已知模态取并集；图研必需的图像输入独立保留。 |
| 73 | fal / `openai/gpt-image-2` | inputModalities | ["text"] | ["text","image"] | 未取得支持原审计值的精确渠道原文；已查：[原文](https://api.fal.ai/v1/models)、[原文](https://developers.openai.com/api/docs/models/gpt-image-2) | 未获得支持原审计值的精确渠道原文；撤回该审计字段，使用既有值，缺项为未知。 已知模态取并集；图研必需的图像输入独立保留。 |
| 74 | tokendance / `deepseek-v4-pro-0813` | totalContextTokens | 1000000 | 1048576 | “"context_length":1000000” [原文](https://tokendance.space/gateway/v1/models) | 采用 1000000；模态取并集 |
| 75 | tokendance / `deepseek-v4-flash-0731` | totalContextTokens | 1048576 | 1000000 | “"context_length":1048576” [原文](https://tokendance.space/gateway/v1/models) | 采用 1048576；模态取并集 |
| 76 | tokendance / `glm-5.1` | totalContextTokens | 202752 | 200000 | “"context_length":202752” [原文](https://tokendance.space/gateway/v1/models) | 采用 202752；模态取并集 |
| 77 | tokendance / `glm-5v-turbo` | totalContextTokens | 202752 | 200000 | “"context_length":202752” [原文](https://tokendance.space/gateway/v1/models) | 采用 202752；模态取并集 |
| 78 | tokendance / `minimax-m2.7` | totalContextTokens | 200000 | 204800 | “"context_length":200000” [原文](https://tokendance.space/gateway/v1/models) | 采用 200000；模态取并集 |
| 79 | tokendance / `minimax-m2.5` | totalContextTokens | 200000 | 204800 | “"context_length":200000” [原文](https://tokendance.space/gateway/v1/models) | 采用 200000；模态取并集 |
| 80 | tokendance / `longcat-2.0` | totalContextTokens | 1000000 | 262144 | “"context_length":1000000” [原文](https://tokendance.space/gateway/v1/models) | 采用 1000000；模态取并集 |
| 81 | tokendance / `mimo-v2.5` | totalContextTokens | 1048576 | 1000000 | “"context_length":1048576” [原文](https://tokendance.space/gateway/v1/models) | 采用 1048576；模态取并集 |
| 82 | tokendance / `mimo-v2.5-pro` | totalContextTokens | 1048576 | 1000000 | “"context_length":1048576” [原文](https://tokendance.space/gateway/v1/models) | 采用 1048576；模态取并集 |
| 83 | tokenhub / `deepseek/deepseek-v4-flash` | inputModalities | ["text","image"] | ["text"] | 未取得支持原审计值的精确渠道原文；已查：[原文](https://api-docs.deepseek.com/quick_start/pricing/)、[原文](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash) | 原厂页面不能证明第三方渠道的图像输入；撤回跨渠道继承，回退既有值/未知。 已知模态取并集；图研必需的图像输入独立保留。 |
| 84 | antling / `Ling-3.0-flash-VL` | totalContextTokens | 262144 | 256000 | “上下文窗口 256K Token” [原文](https://developer.ant-ling.com/zh-CN/docs/models/ling/)（Ling-3.0-flash-VL） | 采用 256K；模态取并集 |
| 85 | antling / `Ling-3.0-flash` | totalContextTokens | 262144 | 256000 | “原生 256K 上下文窗口，最高可扩展至 1M” [原文](https://developer.ant-ling.com/zh-CN/docs/models/ling/)（Ling-3.0-flash） | 采用 256K；模态取并集 |

## R8 百炼 Kimi K3 精确规格补充（2026-11-09）

仅作用于 `bailian/kimi-k3`，其他渠道与 `bailian/kimi/kimi-k3` 保持不变。来源：https://help.aliyun.com/zh/model-studio/kimi-k3 ，操作方于 2026-11-09 16:55（UTC+8）抓取，证据文件 `.audit-input/r8/kimi-k3-evidence.md`。版本化原文与日期同时记录在 `config/channel-audit/input-20261109.json` 的四个 fieldProvenance。

```text
| 输入模态 | Text Image | 输出模态 | Text |
| 最大输入长度 | 1048576 | 最大输出长度 | 1048576 |
| 上下文长度 | 1048576 | 最大输入长度（思考模式下） | 1048576 |
| 最大输出长度（思考模式下） | 1048576 | 最大思维链长度 | 1048576 |
```

由“上下文长度”独立确认 totalContextTokens=1048576；maxOutputTokens 保持 1048576。输入为 text、image，输出为 text；移除之前误记的 video，不将“未列出”标记为明确不支持。字段覆盖华北 2（北京）等所有区域；此处仅改该精确渠道+型号的显示事实。
