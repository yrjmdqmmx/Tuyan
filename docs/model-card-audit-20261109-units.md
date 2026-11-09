# K/M 与 token 字段逐值复核 · 2026-11-09 R6A

存储约定：官方给整数时保存整数；只给 K/k/M 标签时保存字面字符串，保留大小写和小数精度，不乘 1000 或 1024。同一来源同时给整数和括号标签时保留整数。R8 卡片保留原数字及小数精度，只将单位后缀规范为大写 K/M；存储与详情仍保留原始标签；整数继续使用现有格式器并在详情保留精确整数。既有 reviewed catalog 的标签也不再先转换为整数。此为展示数据，不修改请求额度、模型参数或计费。

静态全目录 126 张卡的 157 个 token 字段改变，其中 145 个改用官方/既有核实标签；其余为原文纠正或无证据回退。下面列出全部字段，完整源数据变更另列后表。整数复核清单在 review JSON 的 integerReview：300 个输入正整数字段均有处理决定，区分原厂参考、渠道整数、官方标签及无精确别名证据的回退；未将文档中的请求默认值当成最大输出。

24 个 Gemini 图像卡只有已核实的最大输出字段恢复展示；其输入 token 上限仍不是总上下文窗口，不据此推断窗口。

| 渠道 / API ID | 字段 | 修改前 | 修改后 | 来源 |
| --- | --- | --- | --- | --- |
| `deepseek/deepseek-flash` | totalContextTokens | 1000000 | 1M | [原文](https://api-docs.deepseek.com/quick_start/pricing/) |
| `deepseek/deepseek-flash` | maxOutputTokens | 393216 | 384K | [原文](https://api-docs.deepseek.com/quick_start/pricing/) |
| `deepseek/deepseek-v4-flash-vision-exp` | totalContextTokens | 1000000 | 1M | [原文](https://api-docs.deepseek.com/quick_start/pricing/) |
| `deepseek/deepseek-v4-flash-vision-exp` | maxOutputTokens | 393216 | 384K | [原文](https://api-docs.deepseek.com/quick_start/pricing/) |
| `deepseek/deepseek-v4-pro` | totalContextTokens | 1000000 | 1M | [原文](https://api-docs.deepseek.com/quick_start/pricing/) |
| `deepseek/deepseek-v4-pro` | maxOutputTokens | 393216 | 384K | [原文](https://api-docs.deepseek.com/quick_start/pricing/) |
| `deepseek/deepseek-v4-flash` | totalContextTokens | 1000000 | 1M | [原文](https://api-docs.deepseek.com/quick_start/pricing/) |
| `deepseek/deepseek-v4-flash` | maxOutputTokens | 393216 | 384K | [原文](https://api-docs.deepseek.com/quick_start/pricing/) |
| `zhipu/glm-4.7-flashx` | totalContextTokens | 200000 | 200K | [原文](https://docs.bigmodel.cn/cn/guide/models/text/glm-4.7) |
| `zhipu/glm-4.6v-flash` | totalContextTokens | 128000 | 128K | [原文](https://docs.bigmodel.cn/cn/guide/models/free/glm-4.6v-flash) |
| `zhipu/glm-4.6v-flashx` | totalContextTokens | 128000 | 128K | [原文](https://docs.bigmodel.cn/cn/guide/models/vlm/glm-4.6v) |
| `zhipu/glm-4.5-airx` | totalContextTokens | 128000 | 128K | [原文](https://docs.bigmodel.cn/cn/guide/models/text/glm-4.5) |
| `zhipu/glm-4.5-flash` | totalContextTokens | 128000 | 128K | [原文](https://docs.bigmodel.cn/cn/guide/models/free/glm-4.5-flash) |
| `zhipu/glm-4.1v-thinking-flash` | totalContextTokens | 64000 | 64K | [原文](https://docs.bigmodel.cn/cn/guide/models/free/glm-4.1v-thinking-flash) |
| `zhipu/glm-4.1v-thinking-flashx` | totalContextTokens | 64000 | 64K | [原文](https://docs.bigmodel.cn/cn/guide/models/vlm/glm-4.1v-thinking) |
| `zhipu/glm-4-flash-250414` | totalContextTokens | 128000 | 128K | [原文](https://docs.bigmodel.cn/cn/guide/models/text/glm-4) |
| `zhipu/glm-4-flashx-250414` | totalContextTokens | 128000 | 128K | [原文](https://docs.bigmodel.cn/cn/guide/models/text/glm-4) |
| `zhipu/glm-4-long` | totalContextTokens | 1000000 | 1M | [原文](https://docs.bigmodel.cn/cn/guide/models/text/glm-4-long) |
| `zhipu/glm-4v-flash` | totalContextTokens | 16000 | 16K | [原文](https://docs.bigmodel.cn/cn/guide/models/free/glm-4v-flash) |
| `siliconflow/XingChenAGI/Xing4.0-29B` | totalContextTokens | 256000 | 256K | [原文](https://huggingface.co/XingChen-AGI/Xing4.0-29B-A4B) |
| `siliconflow/tencent/Hy4-preview` | totalContextTokens | 1000000 | 1M | [原文](https://huggingface.co/tencent/Hy4-preview) |
| `siliconflow/Qwen/Qwen3.8-27B` | totalContextTokens | 1000000 | null | main c7b6a2fc 静态目录无窗口字段；卡片显示未知，与冲突表第 35 项一致 |
| `siliconflow/deepseek-ai/DeepSeek-V4-Flash` | totalContextTokens | 1000000 | 1M | [原文](https://api-docs.deepseek.com/quick_start/pricing/) |
| `siliconflow/deepseek-ai/DeepSeek-V4-Flash` | maxOutputTokens | 393216 | 384K | [原文](https://api-docs.deepseek.com/quick_start/pricing/) |
| `siliconflow/deepseek-ai/DeepSeek-V4-Pro` | totalContextTokens | 1000000 | 1M | [原文](https://api-docs.deepseek.com/quick_start/pricing/) |
| `siliconflow/deepseek-ai/DeepSeek-V4-Pro` | maxOutputTokens | 393216 | 384K | [原文](https://api-docs.deepseek.com/quick_start/pricing/) |
| `siliconflow/stepfun-ai/Step-3.5-Flash` | totalContextTokens | 256000 | 256K | [原文](https://platform.stepfun.com/docs/zh/guides/models/list) |
| `siliconflow/THUDM/GLM-4-32B-0414` | totalContextTokens | 128000 | 128K | [原文](https://github.com/zai-org/GLM-4/blob/main/README.md) |
| `siliconflow/THUDM/GLM-4-9B-0414` | totalContextTokens | 128000 | 128K | [原文](https://github.com/zai-org/GLM-4/blob/main/README.md) |
| `siliconflow/THUDM/GLM-Z1-9B-0414` | totalContextTokens | 128000 | 128K | [原文](https://github.com/zai-org/GLM-4/blob/main/README.md) |
| `bailian/deepseek-v4.1-flash` | totalContextTokens | 1000000 | 1M | [原文](https://api-docs.deepseek.com/quick_start/pricing/) |
| `bailian/deepseek-v4.1-flash` | maxOutputTokens | 393216 | 384K | [原文](https://api-docs.deepseek.com/quick_start/pricing/) |
| `bailian/kimi-k3` | totalContextTokens | 262144 | 1048576 | [原文](https://help.aliyun.com/zh/model-studio/kimi-k3) |
| `bailian/kimi-k3` | maxOutputTokens | 16384 | 1048576 | [原文](https://help.aliyun.com/zh/model-studio/kimi-k3) |
| `bailian/ZHIPU/GLM-5.3` | totalContextTokens | 1048576 | null | 既有值缺项 / 未知 |
| `bailian/MiniMax/MiniMax-M3` | totalContextTokens | 1048576 | null | 既有值缺项 / 未知 |
| `bailian/ZHIPU/GLM-5.3-FlashX` | totalContextTokens | 1000000 | 1M | [原文](https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5.3-flash) |
| `bailian/ZHIPU/GLM-5.2` | totalContextTokens | 1048576 | null | 既有值缺项 / 未知 |
| `bailian/deepseek-v4-pro` | totalContextTokens | 1000000 | 1M | [原文](https://api-docs.deepseek.com/quick_start/pricing/) |
| `bailian/deepseek-v4-pro` | maxOutputTokens | 393216 | 384K | [原文](https://api-docs.deepseek.com/quick_start/pricing/) |
| `bailian/glm-5.2-fast-preview` | totalContextTokens | 1048576 | 1M | [原文](https://www.qianwenai.com/models/glm-5.2-fast-preview) |
| `bailian/glm-5.2-fast-preview` | maxOutputTokens | 131072 | 131K | [原文](https://www.qianwenai.com/models/glm-5.2-fast-preview) |
| `bailian/ZHIPU/GLM-5.1` | totalContextTokens | 202745 | null | 既有值缺项 / 未知 |
| `bailian/kimi/kimi-k3` | totalContextTokens | 262144 | null | 既有值缺项 / 未知 |
| `bailian/kimi/kimi-k3` | maxOutputTokens | 16384 | null | 既有值缺项 / 未知 |
| `bailian/kimi/kimi-k2.7-code` | totalContextTokens | 262144 | null | 既有值缺项 / 未知 |
| `bailian/kimi/kimi-k2.6` | totalContextTokens | 262144 | null | 既有值缺项 / 未知 |
| `bailian/stepfun/step-3.7-flash` | totalContextTokens | 256000 | 256K | [原文](https://platform.stepfun.com/docs/zh/guides/models/list) |
| `bailian/qwen-max` | totalContextTokens | 32768 | 32k | [原文](https://help.aliyun.com/zh/model-studio/text-generation-model) |
| `bailian/xiaomi/mimo-v2.5-pro` | totalContextTokens | 1000000 | 1M | [原文](https://mimo.mi.com/docs/zh-CN/quick-start/summary/model) |
| `ark/doubao-seed-2-1-pro-260628` | totalContextTokens | 256000 | 256K | [原文](https://www.volcengine.com/docs/82379/1330310) |
| `ark/doubao-seed-2-1-pro-260915` | totalContextTokens | 1024000 | 1024K | [原文](https://www.volcengine.com/docs/82379/1330310) |
| `ark/doubao-seed-2-1-turbo-260628` | totalContextTokens | 256000 | 256K | [原文](https://www.volcengine.com/docs/82379/1330310) |
| `ark/doubao-seed-2-0-code-preview-260215` | totalContextTokens | 256000 | 256K | [原文](https://www.volcengine.com/docs/82379/1330310) |
| `ark/doubao-seed-2-0-lite-260215` | totalContextTokens | 256000 | 256K | [原文](https://www.volcengine.com/docs/82379/1330310) |
| `ark/doubao-seed-2-0-lite-260428` | totalContextTokens | 256000 | 256K | [原文](https://www.volcengine.com/docs/82379/1330310) |
| `ark/doubao-seed-2-0-mini-260215` | totalContextTokens | 256000 | 256K | [原文](https://www.volcengine.com/docs/82379/1330310) |
| `ark/doubao-seed-2-0-mini-260428` | totalContextTokens | 256000 | 256K | [原文](https://www.volcengine.com/docs/82379/1330310) |
| `ark/doubao-seed-2-0-pro-260215` | totalContextTokens | 256000 | 256K | [原文](https://www.volcengine.com/docs/82379/1330310) |
| `ark/doubao-seed-1-8-251228` | totalContextTokens | 256000 | 256K | [原文](https://docs.volcengine.com/docs/ark/bytedance-seed-1-8?lang=zh) |
| `ark/doubao-seed-code-preview-251028` | totalContextTokens | 256000 | 256K | [原文](https://docs.volcengine.com/docs/ark/model-release-announcement-2025?lang=en) |
| `ark/doubao-seed-evolving` | totalContextTokens | 1024000 | 1024K | [原文](https://www.volcengine.com/docs/82379/1330310) |
| `mistral/codestral-2508` | totalContextTokens | 128000 | 128K | [原文](https://docs.mistral.ai/models/codestral-25-08) |
| `mistral/codestral-latest` | totalContextTokens | 128000 | 128K | [原文](https://docs.mistral.ai/models/codestral-25-08) |
| `together/Qwen/Qwen3.8-2.4T-A95B` | totalContextTokens | 1000000 | null | 既有值缺项 / 未知 |
| `together/deepseek-ai/DeepSeek-V4.1-Flash` | totalContextTokens | 1000000 | 1M | [原文](https://api-docs.deepseek.com/quick_start/pricing/) |
| `together/deepseek-ai/DeepSeek-V4.1-Flash` | maxOutputTokens | 393216 | 384K | [原文](https://api-docs.deepseek.com/quick_start/pricing/) |
| `together/Prism-ML/Ternary-Bonsai-27B` | totalContextTokens | 262000 | 262K | [原文](https://huggingface.co/prism-ml/Ternary-Bonsai-27B-gguf) |
| `together/meta-llama/Llama-3.3-70B-Instruct-Turbo` | totalContextTokens | 128000 | 128K | [原文](https://www.together.ai/models/llama-3-3-70b) |
| `fireworks/accounts/fireworks/models/glm-5p3` | totalContextTokens | 1040000 | 1040k | [原文](https://fireworks.ai/models/fireworks/glm-5p3) |
| `fireworks/accounts/fireworks/models/glm-5p3-flash` | totalContextTokens | 1040000 | 1040k | [原文](https://fireworks.ai/models/fireworks/glm-5p3-flash) |
| `fireworks/accounts/fireworks/models/kimi-k3` | totalContextTokens | 1040000 | 1040k | [原文](https://fireworks.ai/models/fireworks/kimi-k3) |
| `fireworks/accounts/fireworks/models/kimi-k2p5` | totalContextTokens | 262000 | 262k | [原文](https://fireworks.ai/models/fireworks/kimi-k2p5) |
| `fireworks/accounts/fireworks/models/minimax-m3` | totalContextTokens | 512000 | 512k | [原文](https://fireworks.ai/models/fireworks/minimax-m3) |
| `fireworks/accounts/fireworks/models/qwen3-8b` | totalContextTokens | 40900 | 40.9k | [原文](https://fireworks.ai/models/fireworks/qwen3-8b) |
| `fireworks/accounts/fireworks/models/deepseek-v4p1-flash` | totalContextTokens | 1040000 | 1040k | [原文](https://fireworks.ai/models/deepseek-ai/deepseek-v4p1-flash) |
| `fireworks/accounts/fireworks/models/deepseek-v4p1-flash` | maxOutputTokens | 393216 | 384K | [原文](https://api-docs.deepseek.com/quick_start/pricing/) |
| `fireworks/accounts/fireworks/models/gemma-4-31b-it` | totalContextTokens | 262000 | 262k | [原文](https://fireworks.ai/models/fireworks/gemma-4-31b-it) |
| `fireworks/accounts/fireworks/models/gpt-oss-120b` | totalContextTokens | 131000 | 131k | [原文](https://fireworks.ai/models/fireworks/gpt-oss-120b) |
| `fireworks/accounts/fireworks/models/kimi-k3p1-pro` | totalContextTokens | 1048576 | 1040k | [原文](https://fireworks.ai/models/fireworks/kimi-k3p1-pro) |
| `fireworks/accounts/fireworks/models/nemotron-3-ultra-nvfp4` | totalContextTokens | 262000 | 262k | [原文](https://fireworks.ai/models/fireworks/nemotron-3-ultra-nvfp4) |
| `fireworks/accounts/fireworks/models/nemotron-lightning-3p5-30b-a3b` | totalContextTokens | 262000 | 262k | [原文](https://fireworks.ai/models/fireworks/nemotron-lightning-3p5-30b-a3b) |
| `fireworks/accounts/fireworks/models/nvidia-nemotron-3-nano-omni-30b-a3b` | totalContextTokens | 262000 | 262k | [原文](https://fireworks.ai/models/fireworks/nvidia-nemotron-3-nano-omni-30b-a3b) |
| `fireworks/accounts/fireworks/models/qwen3-omni-30b-a3b-instruct` | totalContextTokens | 65500 | 65.5k | [原文](https://fireworks.ai/models/fireworks/qwen3-omni-30b-a3b-instruct) |
| `fireworks/accounts/fireworks/models/step-3p7-flash-nvfp4` | totalContextTokens | 262000 | 262k | [原文](https://fireworks.ai/models/fireworks/step-3p7-flash-nvfp4) |
| `tokendance/deepseek-v4.1-flash` | maxOutputTokens | 393216 | 384K | [原文](https://api-docs.deepseek.com/quick_start/pricing/) |
| `tokendance/deepseek-v4-flash-vision-exp` | totalContextTokens | 1000000 | 1M | [原文](https://api-docs.deepseek.com/quick_start/pricing/) |
| `tokendance/deepseek-v4-flash-vision-exp` | maxOutputTokens | 393216 | 384K | [原文](https://api-docs.deepseek.com/quick_start/pricing/) |
| `tokendance/deepseek-v4-flash` | totalContextTokens | 1000000 | 1M | [原文](https://api-docs.deepseek.com/quick_start/pricing/) |
| `tokendance/deepseek-v4-flash` | maxOutputTokens | 393216 | 384K | [原文](https://api-docs.deepseek.com/quick_start/pricing/) |
| `tokendance/deepseek-v4-pro` | maxOutputTokens | 393216 | 384K | [原文](https://api-docs.deepseek.com/quick_start/pricing/) |
| `tokendance/step-5-preview` | maxOutputTokens | 64000 | 64k | [原文](https://platform.stepfun.com/docs/zh/guides/models/step-5-preview) |
| `runware/google:gemini@3.1-pro` | totalContextTokens | 1000000 | 1M | [原文](https://runware.ai/docs/models/google-gemini-3-1-pro) |
| `runware/google:gemini@3-flash` | totalContextTokens | 1000000 | 1M | [原文](https://runware.ai/docs/models/google-gemini-3-flash) |
| `tokenhub/deepseek/deepseek-v4-flash-vision-exp` | totalContextTokens | 1000000 | 1M | [原文](https://api-docs.deepseek.com/quick_start/pricing/) |
| `tokenhub/deepseek/deepseek-v4-flash-vision-exp` | maxOutputTokens | 393216 | 384K | [原文](https://api-docs.deepseek.com/quick_start/pricing/) |
| `tokenhub/deepseek-v4-flash` | totalContextTokens | 1000000 | 1M | [原文](https://api-docs.deepseek.com/quick_start/pricing/) |
| `tokenhub/deepseek-v4-flash` | maxOutputTokens | 393216 | 384K | [原文](https://api-docs.deepseek.com/quick_start/pricing/) |
| `tokenhub/deepseek-v4-pro` | totalContextTokens | 1000000 | 1M | [原文](https://api-docs.deepseek.com/quick_start/pricing/) |
| `tokenhub/deepseek-v4-pro` | maxOutputTokens | 393216 | 384K | [原文](https://api-docs.deepseek.com/quick_start/pricing/) |
| `tokenhub/deepseek/deepseek-v4-flash` | totalContextTokens | 1000000 | 1M | [原文](https://api-docs.deepseek.com/quick_start/pricing/) |
| `tokenhub/deepseek/deepseek-v4-flash` | maxOutputTokens | 393216 | 384K | [原文](https://api-docs.deepseek.com/quick_start/pricing/) |
| `tokenhub/deepseek/deepseek-v4-pro` | totalContextTokens | 1000000 | 1M | [原文](https://api-docs.deepseek.com/quick_start/pricing/) |
| `tokenhub/deepseek/deepseek-v4-pro` | maxOutputTokens | 393216 | 384K | [原文](https://api-docs.deepseek.com/quick_start/pricing/) |
| `tokenhub/glm-5.3-flashx` | totalContextTokens | 1000000 | 1M | [原文](https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5.3-flash) |
| `tokenhub/hy4-preview` | totalContextTokens | 1000000 | 1M | [原文](https://huggingface.co/tencent/Hy4-preview) |
| `tokenhub/deepseek/deepseek-flash` | totalContextTokens | 1000000 | 1M | [原文](https://api-docs.deepseek.com/quick_start/pricing/) |
| `tokenhub/deepseek/deepseek-flash` | maxOutputTokens | 393216 | 384K | [原文](https://api-docs.deepseek.com/quick_start/pricing/) |
| `tokenhub/hunyuan-t1-vision-20250916` | totalContextTokens | 40000 | 40K | [原文](https://cloud.tencent.com/document/product/1823/130051) |
| `tokenhub/hy-vision-2.0-instruct` | totalContextTokens | 44000 | 44K | [原文](https://cloud.tencent.com/document/product/1823/130051) |
| `tokenhub/mimo-v2.5-pro` | totalContextTokens | 1000000 | 1M | [原文](https://mimo.mi.com/docs/zh-CN/quick-start/summary/model) |
| `tokenhub/youtu-vita` | totalContextTokens | 128000 | 128K | [原文](https://cloud.tencent.com/document/product/1823/130051) |
| `xiaomi/mimo-v2.6-flash` | totalContextTokens | 1000000 | 1M | [原文](https://mimo.mi.com/docs/zh-CN/quick-start/summary/model) |
| `xiaomi/mimo-v2.6-flash` | maxOutputTokens | 128000 | 128K | [原文](https://mimo.mi.com/docs/zh-CN/quick-start/summary/model) |
| `xiaomi/mimo-v2.6-pro` | totalContextTokens | 1000000 | 1M | [原文](https://mimo.mi.com/docs/zh-CN/quick-start/summary/model) |
| `xiaomi/mimo-v2.6-pro` | maxOutputTokens | 128000 | 128K | [原文](https://mimo.mi.com/docs/zh-CN/quick-start/summary/model) |
| `xiaomi/mimo-v2.6-pro-ultraspeed` | totalContextTokens | 1000000 | 1M | [原文](https://mimo.mi.com/docs/zh-CN/quick-start/summary/model) |
| `xiaomi/mimo-v2.6-pro-ultraspeed` | maxOutputTokens | 128000 | 128K | [原文](https://mimo.mi.com/docs/zh-CN/quick-start/summary/model) |
| `sensenova/deepseek-v4-flash` | totalContextTokens | 1000000 | 1M | [原文](https://api-docs.deepseek.com/quick_start/pricing/) |
| `sensenova/deepseek-v4-flash` | maxOutputTokens | 393216 | 384K | [原文](https://api-docs.deepseek.com/quick_start/pricing/) |
| `sensenova/deepseek-v4-pro` | totalContextTokens | 1000000 | 1M | [原文](https://api-docs.deepseek.com/quick_start/pricing/) |
| `sensenova/deepseek-v4-pro` | maxOutputTokens | 393216 | 384K | [原文](https://api-docs.deepseek.com/quick_start/pricing/) |
| `stepfun/step-5-preview` | totalContextTokens | 1000000 | 1M | [原文](https://platform.stepfun.com/docs/zh/guides/models/list) |
| `stepfun/step-5-preview` | maxOutputTokens | 64000 | 64k | [原文](https://platform.stepfun.com/docs/zh/guides/models/step-5-preview) |
| `stepfun/step-3.7-flash` | totalContextTokens | 256000 | 256K | [原文](https://platform.stepfun.com/docs/zh/guides/models/list) |
| `stepfun/step-3.5-flash` | totalContextTokens | 256000 | 256K | [原文](https://platform.stepfun.com/docs/zh/guides/models/list) |
| `stepfun/step-3.5-flash-2603` | totalContextTokens | 256000 | 256K | [原文](https://platform.stepfun.com/docs/zh/guides/models/list) |
| `stepfun/step-1o-turbo-vision` | totalContextTokens | 32000 | 32K | [原文](https://platform.stepfun.com/docs/zh/guides/models/list) |
| `qianfan/deepseek-v4.1-flash` | totalContextTokens | 1000000 | 1M | [原文](https://api-docs.deepseek.com/quick_start/pricing/) |
| `qianfan/deepseek-v4.1-flash` | maxOutputTokens | 393216 | 384K | [原文](https://api-docs.deepseek.com/quick_start/pricing/) |
| `qianfan/deepseek-v4-flash` | totalContextTokens | 1000000 | 1M | [原文](https://api-docs.deepseek.com/quick_start/pricing/) |
| `qianfan/deepseek-v4-flash` | maxOutputTokens | 393216 | 384K | [原文](https://api-docs.deepseek.com/quick_start/pricing/) |
| `qianfan/deepseek-v4-pro` | totalContextTokens | 1000000 | 1M | [原文](https://api-docs.deepseek.com/quick_start/pricing/) |
| `qianfan/deepseek-v4-pro` | maxOutputTokens | 393216 | 384K | [原文](https://api-docs.deepseek.com/quick_start/pricing/) |
| `qianfan/deepseek-flash` | totalContextTokens | 1000000 | 1M | [原文](https://api-docs.deepseek.com/quick_start/pricing/) |
| `qianfan/deepseek-flash` | maxOutputTokens | 393216 | 384K | [原文](https://api-docs.deepseek.com/quick_start/pricing/) |
| `qianfan/deepseek-ocr` | totalContextTokens | 8000 | 8K | [原文](https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j) |
| `qianfan/ernie-4.5-turbo-128k` | totalContextTokens | 128000 | 128K | [原文](https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j) |
| `qianfan/ernie-4.5-turbo-20260402` | totalContextTokens | 128000 | 128K | [原文](https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j) |
| `qianfan/ernie-4.5-turbo-32k` | totalContextTokens | 32000 | 32K | [原文](https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j) |
| `qianfan/ernie-4.5-turbo-vl` | totalContextTokens | 128000 | 128K | [原文](https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j) |
| `qianfan/ernie-4.5-turbo-vl-32k` | totalContextTokens | 32000 | 32K | [原文](https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j) |
| `qianfan/ernie-5.0` | totalContextTokens | 128000 | 128K | [原文](https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j) |
| `qianfan/ernie-5.0-thinking-exp` | totalContextTokens | 128000 | 128K | [原文](https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j) |
| `qianfan/ernie-5.0-thinking-latest` | totalContextTokens | 128000 | 128K | [原文](https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j) |
| `qianfan/ernie-5.1` | totalContextTokens | 128000 | 128K | [原文](https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j) |
| `qianfan/internvl3-38b` | totalContextTokens | 32000 | 32K | [原文](https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j) |
| `qianfan/qianfan-ocr` | totalContextTokens | 32000 | 32K | [原文](https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j) |
| `iflytek/spark-x2.5` | totalContextTokens | 256000 | 256k | [原文](https://maas.xfyun.cn/api/v1/gpt-finetune/model/base/list-v2?page=1&size=9999) |
| `iflytek/spark-x2.5-1.7b` | totalContextTokens | 1000000 | 1M | [原文](https://maas.xfyun.cn/api/v1/gpt-finetune/model/base/list-v2?page=1&size=9999) |
| `iflytek/spark-x2.5-4b` | totalContextTokens | 1000000 | 1M | [原文](https://maas.xfyun.cn/api/v1/gpt-finetune/model/base/list-v2?page=1&size=9999) |
| `iflytek/xsparkx2` | totalContextTokens | 192000 | 192k | [原文](https://maas.xfyun.cn/api/v1/gpt-finetune/model/base/list-v2?page=1&size=9999) |
| `iflytek/xsparkx2flash` | totalContextTokens | 256000 | 256k | [原文](https://maas.xfyun.cn/api/v1/gpt-finetune/model/base/list-v2?page=1&size=9999) |
| `antling/Ling-3.0-flash-VL` | totalContextTokens | 262144 | 256K | [原文](https://developer.ant-ling.com/zh-CN/docs/models/ling/) |
| `antling/Ling-3.0-flash` | totalContextTokens | 262144 | 256K | [原文](https://developer.ant-ling.com/zh-CN/docs/models/ling/) |
| `antling/Ling-3.1-flash` | totalContextTokens | 1048576 | 1M | [原文](https://developer.ant-ling.com/zh-CN/docs/models/ling/) |
| `antling/Ling-3.2-flash` | totalContextTokens | 1048576 | 1M | [原文](https://developer.ant-ling.com/zh-CN/docs/models/ling/) |

## 源数据 142 处逐值变更

包括输入 pairs、canonical、claims 与 supplement；同一事实在多处引用分别计数，不等同于卡片数量。

| 位置 | 字段 | 原值 | 新值 |
| --- | --- | --- | --- |
| `pairs/bailian/MiniMax/MiniMax-M3` | totalContextTokens | 1048576 | null |
| `pairs/bailian/ZHIPU/GLM-5.1` | totalContextTokens | 202745 | null |
| `pairs/bailian/ZHIPU/GLM-5.2` | totalContextTokens | 1048576 | null |
| `pairs/bailian/ZHIPU/GLM-5.3` | totalContextTokens | 1048576 | null |
| `pairs/bailian/deepseek-v4-flash` | totalContextTokens | 1000000 | 1M |
| `pairs/bailian/deepseek-v4-flash` | maxOutputTokens | 393216 | 384K |
| `pairs/bailian/deepseek-v4-pro` | totalContextTokens | 1000000 | 1M |
| `pairs/bailian/deepseek-v4-pro` | maxOutputTokens | 393216 | 384K |
| `pairs/bailian/deepseek-v4.1-flash` | totalContextTokens | 1000000 | 1M |
| `pairs/bailian/deepseek-v4.1-flash` | maxOutputTokens | 393216 | 384K |
| `pairs/bailian/glm-5.2-fast-preview` | totalContextTokens | 1048576 | 1M |
| `pairs/bailian/glm-5.2-fast-preview` | maxOutputTokens | 131072 | 131K |
| `pairs/bailian/kimi-k3` | totalContextTokens | 262144 | 1048576 |
| `pairs/bailian/kimi-k3` | maxOutputTokens | 16384 | 1048576 |
| `pairs/bailian/kimi/kimi-k2.6` | totalContextTokens | 262144 | null |
| `pairs/bailian/kimi/kimi-k2.7-code` | totalContextTokens | 262144 | null |
| `pairs/bailian/kimi/kimi-k3` | totalContextTokens | 262144 | null |
| `pairs/bailian/kimi/kimi-k3` | maxOutputTokens | 16384 | null |
| `pairs/bailian/qwen-max` | totalContextTokens | 32768 | 32k |
| `pairs/bailian/stepfun/step-3.7-flash` | totalContextTokens | 256000 | 256K |
| `pairs/bailian/xiaomi/mimo-v2.5-pro` | totalContextTokens | 1000000 | 1M |
| `pairs/deepseek/deepseek-flash` | totalContextTokens | 1000000 | 1M |
| `pairs/deepseek/deepseek-flash` | maxOutputTokens | 393216 | 384K |
| `pairs/deepseek/deepseek-v4-flash` | totalContextTokens | 1000000 | 1M |
| `pairs/deepseek/deepseek-v4-flash` | maxOutputTokens | 393216 | 384K |
| `pairs/deepseek/deepseek-v4-flash-vision-exp` | totalContextTokens | 1000000 | 1M |
| `pairs/deepseek/deepseek-v4-flash-vision-exp` | maxOutputTokens | 393216 | 384K |
| `pairs/deepseek/deepseek-v4-pro` | totalContextTokens | 1000000 | 1M |
| `pairs/deepseek/deepseek-v4-pro` | maxOutputTokens | 393216 | 384K |
| `pairs/fireworks/accounts/fireworks/models/deepseek-v4-flash-0731` | totalContextTokens | 1040000 | 1040k |
| `pairs/fireworks/accounts/fireworks/models/deepseek-v4-flash-0731` | maxOutputTokens | 393216 | 384K |
| `pairs/fireworks/accounts/fireworks/models/deepseek-v4-flash-vision-exp` | totalContextTokens | 1040000 | 1040k |
| `pairs/fireworks/accounts/fireworks/models/deepseek-v4-flash-vision-exp` | maxOutputTokens | 393216 | 384K |
| `pairs/fireworks/accounts/fireworks/models/deepseek-v4-pro-0813` | totalContextTokens | 1040000 | 1040k |
| `pairs/fireworks/accounts/fireworks/models/deepseek-v4-pro-0813` | maxOutputTokens | 393216 | 384K |
| `pairs/fireworks/accounts/fireworks/models/deepseek-v4p1-flash` | totalContextTokens | 1040000 | 1040k |
| `pairs/fireworks/accounts/fireworks/models/deepseek-v4p1-flash` | maxOutputTokens | 393216 | 384K |
| `pairs/fireworks/accounts/fireworks/models/gemma-4-31b-it` | totalContextTokens | 262000 | 262k |
| `pairs/fireworks/accounts/fireworks/models/glm-5p2` | totalContextTokens | 1040000 | 1040k |
| `pairs/fireworks/accounts/fireworks/models/glm-5p3` | totalContextTokens | 1040000 | 1040k |
| `pairs/fireworks/accounts/fireworks/models/glm-5p3-flash` | totalContextTokens | 1040000 | 1040k |
| `pairs/fireworks/accounts/fireworks/models/gpt-oss-120b` | totalContextTokens | 131000 | 131k |
| `pairs/fireworks/accounts/fireworks/models/kimi-k2p5` | totalContextTokens | 262000 | 262k |
| `pairs/fireworks/accounts/fireworks/models/kimi-k2p6` | totalContextTokens | 262000 | 262k |
| `pairs/fireworks/accounts/fireworks/models/kimi-k2p7-code` | totalContextTokens | 262000 | 262k |
| `pairs/fireworks/accounts/fireworks/models/kimi-k3` | totalContextTokens | 1040000 | 1040k |
| `pairs/fireworks/accounts/fireworks/models/minimax-m3` | totalContextTokens | 512000 | 512k |
| `pairs/fireworks/accounts/fireworks/models/muse-glimmer-30b` | totalContextTokens | 131000 | 131k |
| `pairs/fireworks/accounts/fireworks/models/nemotron-3-ultra-nvfp4` | totalContextTokens | 262000 | 262k |
| `pairs/fireworks/accounts/fireworks/models/nemotron-lightning-3p5-30b-a3b` | totalContextTokens | 262000 | 262k |
| `pairs/fireworks/accounts/fireworks/models/nvidia-nemotron-3-nano-omni-30b-a3b` | totalContextTokens | 262000 | 262k |
| `pairs/fireworks/accounts/fireworks/models/qwen3-8b` | totalContextTokens | 40900 | 40.9k |
| `pairs/fireworks/accounts/fireworks/models/qwen3-omni-30b-a3b-instruct` | totalContextTokens | 65500 | 65.5k |
| `pairs/fireworks/accounts/fireworks/models/step-3p7-flash-nvfp4` | totalContextTokens | 262000 | 262k |
| `pairs/qianfan/deepseek-flash` | totalContextTokens | 1000000 | 1M |
| `pairs/qianfan/deepseek-flash` | maxOutputTokens | 393216 | 384K |
| `pairs/qianfan/deepseek-v4-flash` | totalContextTokens | 1000000 | 1M |
| `pairs/qianfan/deepseek-v4-flash` | maxOutputTokens | 393216 | 384K |
| `pairs/qianfan/deepseek-v4-pro` | totalContextTokens | 1000000 | 1M |
| `pairs/qianfan/deepseek-v4-pro` | maxOutputTokens | 393216 | 384K |
| `pairs/qianfan/deepseek-v4.1-flash` | totalContextTokens | 1000000 | 1M |
| `pairs/qianfan/deepseek-v4.1-flash` | maxOutputTokens | 393216 | 384K |
| `pairs/sensenova/deepseek-v4-flash` | totalContextTokens | 1000000 | 1M |
| `pairs/sensenova/deepseek-v4-flash` | maxOutputTokens | 393216 | 384K |
| `pairs/sensenova/deepseek-v4-pro` | totalContextTokens | 1000000 | 1M |
| `pairs/sensenova/deepseek-v4-pro` | maxOutputTokens | 393216 | 384K |
| `pairs/siliconflow/Qwen/Qwen3.8-27B` | totalContextTokens | 1000000 | null |
| `pairs/siliconflow/deepseek-ai/DeepSeek-V4-Flash` | totalContextTokens | 1000000 | 1M |
| `pairs/siliconflow/deepseek-ai/DeepSeek-V4-Flash` | maxOutputTokens | 393216 | 384K |
| `pairs/siliconflow/deepseek-ai/DeepSeek-V4-Pro` | totalContextTokens | 1000000 | 1M |
| `pairs/siliconflow/deepseek-ai/DeepSeek-V4-Pro` | maxOutputTokens | 393216 | 384K |
| `pairs/siliconflow/stepfun-ai/Step-3.5-Flash` | totalContextTokens | 256000 | 256K |
| `pairs/stepfun/step-1o-turbo-vision` | totalContextTokens | 32000 | 32K |
| `pairs/stepfun/step-3.5-flash` | totalContextTokens | 256000 | 256K |
| `pairs/stepfun/step-3.5-flash-2603` | totalContextTokens | 256000 | 256K |
| `pairs/stepfun/step-3.7-flash` | totalContextTokens | 256000 | 256K |
| `pairs/stepfun/step-5-preview` | totalContextTokens | 1000000 | 1M |
| `pairs/stepfun/step-5-preview` | maxOutputTokens | 64000 | 64k |
| `pairs/together/Qwen/Qwen3.8-2.4T-A95B` | totalContextTokens | 1000000 | null |
| `pairs/together/deepseek-ai/DeepSeek-V4.1-Flash` | totalContextTokens | 1000000 | 1M |
| `pairs/together/deepseek-ai/DeepSeek-V4.1-Flash` | maxOutputTokens | 393216 | 384K |
| `pairs/tokendance/deepseek-v4-flash` | totalContextTokens | 1000000 | 1M |
| `pairs/tokendance/deepseek-v4-flash` | maxOutputTokens | 393216 | 384K |
| `pairs/tokendance/deepseek-v4-flash-vision-exp` | totalContextTokens | 1000000 | 1M |
| `pairs/tokendance/deepseek-v4-flash-vision-exp` | maxOutputTokens | 393216 | 384K |
| `pairs/tokendance/deepseek-v4-pro` | maxOutputTokens | 393216 | 384K |
| `pairs/tokendance/deepseek-v4.1-flash` | maxOutputTokens | 393216 | 384K |
| `pairs/tokendance/mimo-v2.5-tts` | maxOutputTokens | 8000 | 8K |
| `pairs/tokendance/mimo-v2.5-tts-voiceclone` | maxOutputTokens | 8000 | 8K |
| `pairs/tokendance/mimo-v2.5-tts-voicedesign` | maxOutputTokens | 8000 | 8K |
| `pairs/tokendance/step-5-preview` | maxOutputTokens | 64000 | 64k |
| `pairs/tokenhub/deepseek-v4-flash` | totalContextTokens | 1000000 | 1M |
| `pairs/tokenhub/deepseek-v4-flash` | maxOutputTokens | 393216 | 384K |
| `pairs/tokenhub/deepseek-v4-pro` | totalContextTokens | 1000000 | 1M |
| `pairs/tokenhub/deepseek-v4-pro` | maxOutputTokens | 393216 | 384K |
| `pairs/tokenhub/deepseek/deepseek-flash` | totalContextTokens | 1000000 | 1M |
| `pairs/tokenhub/deepseek/deepseek-flash` | maxOutputTokens | 393216 | 384K |
| `pairs/tokenhub/deepseek/deepseek-v4-flash` | totalContextTokens | 1000000 | 1M |
| `pairs/tokenhub/deepseek/deepseek-v4-flash` | maxOutputTokens | 393216 | 384K |
| `pairs/tokenhub/deepseek/deepseek-v4-flash-vision-exp` | totalContextTokens | 1000000 | 1M |
| `pairs/tokenhub/deepseek/deepseek-v4-flash-vision-exp` | maxOutputTokens | 393216 | 384K |
| `pairs/tokenhub/deepseek/deepseek-v4-pro` | totalContextTokens | 1000000 | 1M |
| `pairs/tokenhub/deepseek/deepseek-v4-pro` | maxOutputTokens | 393216 | 384K |
| `pairs/tokenhub/mimo-v2.5-pro` | totalContextTokens | 1000000 | 1M |
| `pairs/xiaomi/mimo-v2.5` | totalContextTokens | 1000000 | 1M |
| `pairs/xiaomi/mimo-v2.5-asr` | totalContextTokens | 8000 | 8k |
| `pairs/xiaomi/mimo-v2.5-asr` | maxOutputTokens | 2000 | 2k |
| `pairs/xiaomi/mimo-v2.5-pro` | totalContextTokens | 1000000 | 1M |
| `pairs/xiaomi/mimo-v2.5-tts` | totalContextTokens | 8000 | 8K |
| `pairs/xiaomi/mimo-v2.5-tts` | maxOutputTokens | 8000 | 8K |
| `pairs/xiaomi/mimo-v2.5-tts-voiceclone` | totalContextTokens | 8000 | 8K |
| `pairs/xiaomi/mimo-v2.5-tts-voiceclone` | maxOutputTokens | 8000 | 8K |
| `pairs/xiaomi/mimo-v2.5-tts-voicedesign` | totalContextTokens | 8000 | 8K |
| `pairs/xiaomi/mimo-v2.5-tts-voicedesign` | maxOutputTokens | 8000 | 8K |
| `pairs/xiaomi/mimo-v2.6-flash` | totalContextTokens | 1000000 | 1M |
| `pairs/xiaomi/mimo-v2.6-flash` | maxOutputTokens | 128000 | 128K |
| `pairs/xiaomi/mimo-v2.6-pro` | totalContextTokens | 1000000 | 1M |
| `pairs/xiaomi/mimo-v2.6-pro` | maxOutputTokens | 128000 | 128K |
| `pairs/xiaomi/mimo-v2.6-pro-ultraspeed` | totalContextTokens | 1000000 | 1M |
| `pairs/xiaomi/mimo-v2.6-pro-ultraspeed` | maxOutputTokens | 128000 | 128K |
| `canonical/deepseek-flash` | totalContextTokens | 1000000 | 1M |
| `canonical/deepseek-flash` | maxOutputTokens | 393216 | 384K |
| `canonical/deepseek-v4-flash` | totalContextTokens | 1000000 | 1M |
| `canonical/deepseek-v4-flash` | maxOutputTokens | 393216 | 384K |
| `canonical/deepseek-v4-flash-vision-exp` | totalContextTokens | 1000000 | 1M |
| `canonical/deepseek-v4-flash-vision-exp` | maxOutputTokens | 393216 | 384K |
| `canonical/deepseek-v4-pro` | totalContextTokens | 1000000 | 1M |
| `canonical/deepseek-v4-pro` | maxOutputTokens | 393216 | 384K |
| `canonical/deepseek-v4.1-flash` | totalContextTokens | 1000000 | 1M |
| `canonical/deepseek-v4.1-flash` | maxOutputTokens | 393216 | 384K |
| `canonical/mimo-v2.5-pro` | totalContextTokens | 1000000 | 1M |
| `canonical/mimo-v2.5-tts` | maxOutputTokens | 8000 | 8K |
| `canonical/mimo-v2.5-tts-voiceclone` | maxOutputTokens | 8000 | 8K |
| `canonical/mimo-v2.5-tts-voicedesign` | maxOutputTokens | 8000 | 8K |
| `canonical/step-3.5-flash` | totalContextTokens | 256000 | 256K |
| `canonical/step-3.7-flash` | totalContextTokens | 256000 | 256K |
| `canonical/step-5-preview` | maxOutputTokens | 64000 | 64k |
| `claims/1` | totalContextTokens | 1048576 | 1040k |
| `supplement/antling/Ling-3.2-flash` | totalContextTokens | 1048576 | 1M |
| `supplement/antling/Ling-3.1-flash` | totalContextTokens | 1048576 | 1M |
| `supplement/antling/Ling-3.0-flash-VL` | totalContextTokens | 262144 | 256K |
| `supplement/antling/Ling-3.0-flash` | totalContextTokens | 262144 | 256K |
