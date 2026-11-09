# 模型卡规格差异 · 2026-11-09 R4

基线为 main `c7b6a2fc`。逐字段对照审计与图研既有核实；审计已知值优先，缺项才回退。模态比较忽略数组顺序。差异不改调用适配、请求上限或模型身份。`catalog` 是此前核实的来源，不表示本轮重新访问官方网页。

共 85 项：maxOutputTokens 7、inputModalities 34、totalContextTokens 38、outputModalities 6。以下 sources 同时保留审计和既有来源；源 URL 相同也可能是不同日期的解析值。

| 渠道 | API ID | 字段 | 审计值（展示） | 既有值 | 来源 |
| --- | --- | --- | --- | --- | --- |
| deepseek | `deepseek-flash` | maxOutputTokens | 393216 | 384000 | https://api-docs.deepseek.com/quick_start/pricing/<br>https://api-docs.deepseek.com/quick_start/pricing<br>https://api-docs.deepseek.com/news/news261017/ |
| deepseek | `deepseek-v4-flash-vision-exp` | maxOutputTokens | 393216 | 384000 | https://api-docs.deepseek.com/quick_start/pricing/<br>https://api-docs.deepseek.com/quick_start/pricing<br>https://api-docs.deepseek.com/news/news261017/ |
| deepseek | `deepseek-v4-pro` | maxOutputTokens | 393216 | 384000 | https://api-docs.deepseek.com/quick_start/pricing/<br>https://api-docs.deepseek.com/quick_start/pricing |
| deepseek | `deepseek-v4-flash` | maxOutputTokens | 393216 | 384000 | https://api-docs.deepseek.com/quick_start/pricing/<br>https://api-docs.deepseek.com/quick_start/pricing<br>https://api-docs.deepseek.com/news/news261017/ |
| xai | `grok-4.20-multi-agent-0309` | inputModalities | ["text"] | ["text", "image"] | https://docs.x.ai/docs/models<br>https://docs.x.ai/developers/models/grok-4.20-multi-agent-0309 |
| bailian | `qwen3.8-flash` | inputModalities | ["text"] | ["text", "image", "video"] | https://help.aliyun.com/zh/model-studio/models<br>https://help.aliyun.com/zh/model-studio/vision-model<br>https://help.aliyun.com/zh/model-studio/text-generation-model |
| bailian | `glm-5.2-fast-preview` | totalContextTokens | 1048576 | 1000000 | https://help.aliyun.com/zh/model-studio/models<br>https://www.qianwenai.com/models/glm-5.2-fast-preview<br>https://platform.qianwenai.com/docs/developer-guides/run-and-scale/prime-mode |
| bailian | `qwen3.7-max-2026-06-08` | inputModalities | ["text"] | ["text", "image", "video"] | https://help.aliyun.com/zh/model-studio/models<br>https://help.aliyun.com/zh/model-studio/qwen3-7-max |
| bailian | `qwen-max` | totalContextTokens | 32768 | 32000 | https://help.aliyun.com/zh/model-studio/models<br>https://help.aliyun.com/zh/model-studio/text-generation-model |
| bailian | `qwen-plus-2025-01-25` | totalContextTokens | 131072 | 1000000 | https://help.aliyun.com/zh/model-studio/models<br>https://help.aliyun.com/zh/model-studio/text-generation-model |
| bailian | `qwen-plus-2025-04-28` | totalContextTokens | 131072 | 1000000 | https://help.aliyun.com/zh/model-studio/models<br>https://help.aliyun.com/zh/model-studio/text-generation-model |
| bailian | `qwen-plus-2025-07-14` | totalContextTokens | 131072 | 1000000 | https://help.aliyun.com/zh/model-studio/models<br>https://help.aliyun.com/zh/model-studio/text-generation-model |
| together | `Qwen/Qwen3.8-Flash` | inputModalities | ["text"] | ["text", "image", "video"] | https://help.aliyun.com/zh/model-studio/models<br>https://help.aliyun.com/zh/model-studio/vision-model<br>https://help.aliyun.com/zh/model-studio/text-generation-model |
| fal | `fal-ai/nano-banana-2` | inputModalities | ["text"] | ["text", "image", "video", "file"] | https://api.fal.ai/v1/models<br>https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-image |
| fal | `fal-ai/nano-banana-2` | outputModalities | ["image"] | ["text", "image"] | https://api.fal.ai/v1/models<br>https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-image |
| fal | `google/nano-banana-2-lite` | inputModalities | ["text"] | ["text", "image", "video", "file"] | https://api.fal.ai/v1/models<br>https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite-image |
| fal | `google/nano-banana-2-lite` | outputModalities | ["image"] | ["text", "image"] | https://api.fal.ai/v1/models<br>https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite-image |
| fal | `fal-ai/nano-banana-pro` | inputModalities | ["text"] | ["text", "image"] | https://api.fal.ai/v1/models<br>https://ai.google.dev/gemini-api/docs/models/gemini-3-pro-image |
| fal | `fal-ai/nano-banana-pro` | outputModalities | ["image"] | ["text", "image"] | https://api.fal.ai/v1/models<br>https://ai.google.dev/gemini-api/docs/models/gemini-3-pro-image |
| fal | `fal-ai/nano-banana` | inputModalities | ["text"] | ["text", "image"] | https://api.fal.ai/v1/models<br>https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-image |
| fal | `fal-ai/nano-banana` | outputModalities | ["image"] | ["text", "image"] | https://api.fal.ai/v1/models<br>https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-image |
| tokendance | `deepseek-v4-flash` | inputModalities | ["text", "image"] | ["text"] | https://api-docs.deepseek.com/quick_start/pricing/<br>https://api-docs.deepseek.com/news/news260424/<br>https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash |
| tokendance | `deepseek-v4-pro` | totalContextTokens | 1048576 | 1000000 | https://tokendance.space/gateway/v1/models<br>https://api-docs.deepseek.com/news/news260424/<br>https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro |
| tokendance | `hy4-preview` | totalContextTokens | 1024000 | 1000000 | https://tokendance.space/gateway/v1/models<br>https://huggingface.co/tencent/Hy4-preview |
| tokendance | `qwen3.8-flash` | inputModalities | ["text"] | ["text", "image", "video"] | https://help.aliyun.com/zh/model-studio/models<br>https://help.aliyun.com/zh/model-studio/vision-model<br>https://help.aliyun.com/zh/model-studio/text-generation-model |
| tokendance | `qwen3.5-35b-a3b` | totalContextTokens | 256000 | 262144 | https://tokendance.space/gateway/v1/models<br>https://huggingface.co/Qwen/Qwen3.5-35B-A3B |
| tokendance | `seed-evolving` | totalContextTokens | 1000000 | 1024000 | https://tokendance.space/gateway/v1/models<br>https://www.volcengine.com/docs/82379/1330310 |
| tokenhub | `deepseek-v4-flash` | inputModalities | ["text", "image"] | ["text"] | https://api-docs.deepseek.com/quick_start/pricing/<br>https://api-docs.deepseek.com/news/news260424/<br>https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash |
| xiaomi | `mimo-v2.6-flash` | maxOutputTokens | 128000 | 131072 | https://mimo.mi.com/docs/zh-CN/quick-start/summary/model<br>https://mimo.mi.com/docs/zh-CN/api/chat/openai-api<br>https://mimo.mi.com/docs/zh-CN/usage-guide/multimodal-understanding/image-understanding |
| xiaomi | `mimo-v2.6-pro` | maxOutputTokens | 128000 | 131072 | https://mimo.mi.com/docs/zh-CN/quick-start/summary/model<br>https://mimo.mi.com/docs/zh-CN/api/chat/openai-api<br>https://mimo.mi.com/docs/zh-CN/usage-guide/multimodal-understanding/image-understanding |
| xiaomi | `mimo-v2.6-pro-ultraspeed` | totalContextTokens | 1000000 | 1048576 | https://mimo.mi.com/docs/zh-CN/quick-start/summary/model |
| xiaomi | `mimo-v2.6-pro-ultraspeed` | maxOutputTokens | 128000 | 131072 | https://mimo.mi.com/docs/zh-CN/quick-start/summary/model |
| sensenova | `deepseek-v4-flash` | inputModalities | ["text", "image"] | ["text"] | https://api-docs.deepseek.com/quick_start/pricing/<br>https://api-docs.deepseek.com/news/news260424/<br>https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash |
| qianfan | `deepseek-v4-flash` | inputModalities | ["text", "image"] | ["text"] | https://api-docs.deepseek.com/quick_start/pricing/<br>https://api-docs.deepseek.com/news/news260424/<br>https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash |
| siliconflow | `Qwen/Qwen3.8-27B` | totalContextTokens | 1000000 | 262144 | https://help.aliyun.com/zh/model-studio/models<br>https://huggingface.co/Qwen/Qwen3.8-27B |
| siliconflow | `deepseek-ai/DeepSeek-V4-Flash` | inputModalities | ["text", "image"] | ["text"] | https://api-docs.deepseek.com/quick_start/pricing/<br>https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash |
| xai | `grok-4.7` | inputModalities | ["text"] | ["text", "image"] | https://docs.x.ai/docs/models<br>https://docs.x.ai/developers/models/grok-4.7 |
| xai | `grok-4.6` | inputModalities | ["text"] | ["text", "image"] | https://docs.x.ai/docs/models<br>https://docs.x.ai/developers/models/grok-4.6 |
| xai | `grok-4.5` | inputModalities | ["text"] | ["text", "image"] | https://docs.x.ai/docs/models<br>https://docs.x.ai/developers/models/grok-4.5 |
| xai | `grok-4.3` | inputModalities | ["text"] | ["text", "image"] | https://docs.x.ai/docs/models<br>https://docs.x.ai/developers/models/grok-4.3 |
| xai | `grok-4.20-0309-non-reasoning` | inputModalities | ["text"] | ["text", "image"] | https://docs.x.ai/docs/models<br>https://docs.x.ai/developers/models/grok-4.20-0309-non-reasoning |
| xai | `grok-4.20-0309-reasoning` | inputModalities | ["text"] | ["text", "image"] | https://docs.x.ai/docs/models<br>https://docs.x.ai/developers/models/grok-4.20-0309-reasoning |
| xai | `grok-build-0.1` | inputModalities | ["text"] | ["text", "image"] | https://docs.x.ai/docs/models<br>https://docs.x.ai/developers/models/grok-build-0.1 |
| bailian | `kimi-k3` | totalContextTokens | 262144 | 1000000 | https://help.aliyun.com/zh/model-studio/models<br>https://huggingface.co/moonshotai/Kimi-K3 |
| bailian | `qwen3.8-27b` | totalContextTokens | 1000000 | 262144 | https://help.aliyun.com/zh/model-studio/models<br>https://huggingface.co/Qwen/Qwen3.8-27B |
| bailian | `ZHIPU/GLM-5.3` | totalContextTokens | 1048576 | 1000000 | https://help.aliyun.com/zh/model-studio/models<br>https://docs.bigmodel.cn/cn/guide/models/text/glm-5.3 |
| bailian | `qwen3.8-2.4t-a95b` | totalContextTokens | 1000000 | 262144 | https://help.aliyun.com/zh/model-studio/models<br>https://huggingface.co/Qwen/Qwen3.8-2.4T-A95B |
| bailian | `MiniMax/MiniMax-M3` | totalContextTokens | 1048576 | 1000000 | https://help.aliyun.com/zh/model-studio/models<br>https://huggingface.co/MiniMaxAI/MiniMax-M3 |
| bailian | `ZHIPU/GLM-5.2` | totalContextTokens | 1048576 | 1000000 | https://help.aliyun.com/zh/model-studio/models<br>https://docs.bigmodel.cn/cn/guide/models/text/glm-5.2 |
| bailian | `qwen-image-3.0` | inputModalities | ["text"] | ["image", "text"] | https://help.aliyun.com/zh/model-studio/models<br>https://help.aliyun.com/zh/model-studio/qwen-image-3-0 |
| bailian | `qwen-image-3.0-pro` | inputModalities | ["text"] | ["image", "text"] | https://help.aliyun.com/zh/model-studio/models<br>https://help.aliyun.com/zh/model-studio/qwen-image-3-0-pro |
| bailian | `glm-5.2` | totalContextTokens | 1048576 | 1000000 | https://help.aliyun.com/zh/model-studio/models<br>https://docs.bigmodel.cn/cn/guide/models/text/glm-5.2 |
| bailian | `ZHIPU/GLM-5.1` | totalContextTokens | 202745 | 200000 | https://help.aliyun.com/zh/model-studio/models<br>https://docs.bigmodel.cn/cn/guide/models/text/glm-5.1 |
| bailian | `glm-5.1` | totalContextTokens | 202745 | 200000 | https://help.aliyun.com/zh/model-studio/models<br>https://docs.bigmodel.cn/cn/guide/models/text/glm-5.1 |
| bailian | `kimi/kimi-k3` | totalContextTokens | 262144 | 1000000 | https://help.aliyun.com/zh/model-studio/models<br>https://huggingface.co/moonshotai/Kimi-K3 |
| bailian | `kimi-k2.7-code` | totalContextTokens | 262144 | 256000 | https://help.aliyun.com/zh/model-studio/models<br>https://huggingface.co/moonshotai/Kimi-K2.7-Code |
| bailian | `kimi/kimi-k2.7-code` | totalContextTokens | 262144 | 256000 | https://help.aliyun.com/zh/model-studio/models<br>https://huggingface.co/moonshotai/Kimi-K2.7-Code |
| bailian | `kimi-k2.6` | totalContextTokens | 262144 | 256000 | https://help.aliyun.com/zh/model-studio/models<br>https://huggingface.co/moonshotai/Kimi-K2.6 |
| bailian | `kimi/kimi-k2.6` | totalContextTokens | 262144 | 256000 | https://help.aliyun.com/zh/model-studio/models<br>https://huggingface.co/moonshotai/Kimi-K2.6 |
| bailian | `kimi-k2.5` | totalContextTokens | 262144 | 256000 | https://help.aliyun.com/zh/model-studio/models<br>https://huggingface.co/moonshotai/Kimi-K2.5 |
| bailian | `qwen-image-2.0` | inputModalities | ["text"] | ["text", "image"] | https://help.aliyun.com/zh/model-studio/models<br>https://help.aliyun.com/zh/model-studio/qwen-image-2-0 |
| bailian | `qwen-image-2.0-pro` | inputModalities | ["text"] | ["text", "image"] | https://help.aliyun.com/zh/model-studio/models<br>https://help.aliyun.com/zh/model-studio/qwen-image-2-0-pro |
| bailian | `wan2.7-image` | inputModalities | ["text"] | ["image", "text"] | https://help.aliyun.com/zh/model-studio/models<br>https://help.aliyun.com/zh/model-studio/wan2-7-image |
| bailian | `wan2.7-image-pro` | inputModalities | ["text"] | ["image", "text"] | https://help.aliyun.com/zh/model-studio/models<br>https://help.aliyun.com/zh/model-studio/wan2-7-image-pro |
| bailian | `wan2.6-image` | inputModalities | ["text"] | ["text", "image"] | https://help.aliyun.com/zh/model-studio/models<br>https://help.aliyun.com/zh/model-studio/wan2-6-image |
| bailian | `wan2.6-image` | outputModalities | ["image"] | ["image", "text"] | https://help.aliyun.com/zh/model-studio/models<br>https://help.aliyun.com/zh/model-studio/wan2-6-image |
| bailian | `wanx2.1-imageedit` | inputModalities | ["text"] | ["text", "image"] | https://help.aliyun.com/zh/model-studio/models<br>https://help.aliyun.com/zh/model-studio/wanx-image-edit<br>https://help.aliyun.com/zh/model-studio/wanx-image-edit-api-reference |
| together | `Qwen/Qwen-Image-2.0` | inputModalities | ["text"] | ["text", "image"] | https://help.aliyun.com/zh/model-studio/models<br>https://help.aliyun.com/zh/model-studio/qwen-image-2-0 |
| together | `Qwen/Qwen-Image-2.0-Pro` | inputModalities | ["text"] | ["text", "image"] | https://help.aliyun.com/zh/model-studio/models<br>https://help.aliyun.com/zh/model-studio/qwen-image-2-0-pro |
| together | `Qwen/Qwen3.8-2.4T-A95B` | totalContextTokens | 1000000 | 262144 | https://help.aliyun.com/zh/model-studio/models<br>https://huggingface.co/Qwen/Qwen3.8-2.4T-A95B |
| together | `Wan-AI/Wan2.6-image` | inputModalities | ["text"] | ["text", "image"] | https://help.aliyun.com/zh/model-studio/models<br>https://help.aliyun.com/zh/model-studio/wan2-6-image |
| together | `Wan-AI/Wan2.6-image` | outputModalities | ["image"] | ["image", "text"] | https://help.aliyun.com/zh/model-studio/models<br>https://help.aliyun.com/zh/model-studio/wan2-6-image |
| fal | `openai/gpt-image-2` | inputModalities | ["text"] | ["text", "image"] | https://api.fal.ai/v1/models<br>https://developers.openai.com/api/docs/models/gpt-image-2 |
| tokendance | `deepseek-v4-pro-0813` | totalContextTokens | 1000000 | 1048576 | https://tokendance.space/gateway/v1/models<br>https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro-0813<br>https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro-0813/blob/main/config.json |
| tokendance | `deepseek-v4-flash-0731` | totalContextTokens | 1048576 | 1000000 | https://tokendance.space/gateway/v1/models<br>https://tokendance.space/models/deepseek-v4-flash-0731 |
| tokendance | `glm-5.1` | totalContextTokens | 202752 | 200000 | https://tokendance.space/gateway/v1/models<br>https://docs.bigmodel.cn/cn/guide/models/text/glm-5.1 |
| tokendance | `glm-5v-turbo` | totalContextTokens | 202752 | 200000 | https://tokendance.space/gateway/v1/models<br>https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5v-turbo |
| tokendance | `minimax-m2.7` | totalContextTokens | 200000 | 204800 | https://tokendance.space/gateway/v1/models<br>https://huggingface.co/MiniMaxAI/MiniMax-M2.7<br>https://platform.minimax.io/docs/api-reference/text-openai-api |
| tokendance | `minimax-m2.5` | totalContextTokens | 200000 | 204800 | https://tokendance.space/gateway/v1/models<br>https://huggingface.co/MiniMaxAI/MiniMax-M2.5<br>https://platform.minimax.io/docs/api-reference/text-openai-api |
| tokendance | `longcat-2.0` | totalContextTokens | 1000000 | 262144 | https://tokendance.space/gateway/v1/models<br>https://huggingface.co/meituan-longcat/LongCat-2.0<br>https://huggingface.co/meituan-longcat/LongCat-2.0/blob/main/config.json |
| tokendance | `mimo-v2.5` | totalContextTokens | 1048576 | 1000000 | https://tokendance.space/gateway/v1/models<br>https://mimo.mi.com/models/en-US/mimo-v2.5 |
| tokendance | `mimo-v2.5-pro` | totalContextTokens | 1048576 | 1000000 | https://tokendance.space/gateway/v1/models<br>https://mimo.mi.com/models/en-US/mimo-v2.5-pro |
| tokenhub | `deepseek/deepseek-v4-flash` | inputModalities | ["text", "image"] | ["text"] | https://api-docs.deepseek.com/quick_start/pricing/<br>https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash |
| antling | `Ling-3.0-flash-VL` | totalContextTokens | 262144 | 256000 | https://developer.ant-ling.com/zh-CN/docs/models/ling/<br>https://huggingface.co/inclusionAI/Ling-3.0-flash-VL<br>https://developer.ant-ling.com/zh-CN/docs/models/ling/#ling-30-flash-vl |
| antling | `Ling-3.0-flash` | totalContextTokens | 262144 | 256000 | https://developer.ant-ling.com/zh-CN/docs/models/ling/<br>https://huggingface.co/inclusionAI/Ling-3.0-flash<br>https://developer.ant-ling.com/zh-CN/docs/models/ling/#ling-30-flash |
