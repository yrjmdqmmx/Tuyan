# 图片型号 / 渠道 / 操作核对矩阵（2026-09-07）

> v13 阶段记录；当前目录、MiniMax 区域规则和不兼容条目处理以 [v14 审计](2026-09-07-catalog-v14.md) 为准。

82 条静态图片路线；每条分别引用生成和精修尺寸契约。精修模式为 `analyze-redraw` 时，先由视觉模型分析，再按生成契约重绘，不能理解为厂商支持通用图像编辑。OpenRouter 使用渠道动态 schema，不混入这张静态矩阵。

规则来源：[机器可读配置](../../config/image-size-contracts.json)。核对日期为文档核对日期，不是账户推理验证日期。地区为所接 API 端点范围，不代表数据处理地区承诺；可用性、到期日期仍由运行时生命周期逻辑判断。

| 渠道 / 准确 ID | 生成契约 | 精修模式 / 契约 | 地区 / 生命周期 | 官方来源 |
| --- | --- | --- | --- | --- |
| `zhipu/glm-image` | `glm` | analyze-redraw / `glm` | cn / stable | [来源1](https://docs.bigmodel.cn/api-reference/模型-api/图像生成) |
| `zhipu/cogview-4-250304` | `cogview` | analyze-redraw / `cogview` | cn / stable | [来源1](https://docs.bigmodel.cn/api-reference/模型-api/图像生成) |
| `zhipu/cogview-4` | `cogview` | analyze-redraw / `cogview` | cn / stable | [来源1](https://docs.bigmodel.cn/api-reference/模型-api/图像生成) |
| `zhipu/cogview-3-flash` | `cogview` | analyze-redraw / `cogview` | cn / stable | [来源1](https://docs.bigmodel.cn/api-reference/模型-api/图像生成) |
| `siliconflow/Qwen/Qwen-Image` | `siliconflow-Qwen-Qwen-Image` | analyze-redraw / `siliconflow-Qwen-Qwen-Image` | cn / stable | [来源1](https://docs.siliconflow.cn/docs/api/images-generations-post) |
| `siliconflow/Kwai-Kolors/Kolors` | `siliconflow-Kwai-Kolors-Kolors` | direct-edit / `siliconflow-Kwai-Kolors-Kolors` | cn / stable | [来源1](https://docs.siliconflow.cn/docs/api/images-generations-post) |
| `siliconflow/baidu/ERNIE-Image-Turbo` | `siliconflow-baidu-ERNIE-Image-Turbo` | analyze-redraw / `siliconflow-baidu-ERNIE-Image-Turbo` | cn / stable | [来源1](https://docs.siliconflow.cn/docs/api/images-generations-post) |
| `siliconflow/Tongyi-MAI/Z-Image` | `siliconflow-Tongyi-MAI-Z-Image` | analyze-redraw / `siliconflow-Tongyi-MAI-Z-Image` | cn / stable | [来源1](https://docs.siliconflow.cn/docs/api/images-generations-post) |
| `siliconflow/Tongyi-MAI/Z-Image-Turbo` | `siliconflow-Tongyi-MAI-Z-Image-Turbo` | analyze-redraw / `siliconflow-Tongyi-MAI-Z-Image-Turbo` | cn / stable | [来源1](https://docs.siliconflow.cn/docs/api/images-generations-post) |
| `siliconflow/Qwen/Qwen-Image-Edit` | — | direct-edit / `siliconflow-Qwen-Qwen-Image-Edit` | cn / stable | [来源1](https://docs.siliconflow.cn/docs/api/images-generations-post) |
| `siliconflow/Qwen/Qwen-Image-Edit-2509` | — | direct-edit / `siliconflow-Qwen-Qwen-Image-Edit-2509` | cn / stable | [来源1](https://docs.siliconflow.cn/docs/api/images-generations-post) |
| `recraft/recraftv4_1` | `recraft-recraftv4_1` | direct-edit / `recraft-recraftv4_1-edit` | 沿用渠道端点 / stable | [来源1](https://www.recraft.ai/docs/api-reference/appendix) / [来源2](https://www.recraft.ai/docs/api-reference/endpoints) |
| `recraft/recraftv4_1_pro` | `recraft-recraftv4_1_pro` | direct-edit / `recraft-recraftv4_1_pro-edit` | 沿用渠道端点 / stable | [来源1](https://www.recraft.ai/docs/api-reference/appendix) / [来源2](https://www.recraft.ai/docs/api-reference/endpoints) |
| `recraft/recraftv4_1_vector` | `recraft-recraftv4_1_vector` | direct-edit / `recraft-recraftv4_1_vector-edit` | 沿用渠道端点 / stable | [来源1](https://www.recraft.ai/docs/api-reference/appendix) / [来源2](https://www.recraft.ai/docs/api-reference/endpoints) |
| `recraft/recraftv4_1_pro_vector` | `recraft-recraftv4_1_pro_vector` | direct-edit / `recraft-recraftv4_1_pro_vector-edit` | 沿用渠道端点 / stable | [来源1](https://www.recraft.ai/docs/api-reference/appendix) / [来源2](https://www.recraft.ai/docs/api-reference/endpoints) |
| `recraft/recraftv4_1_utility` | `recraft-recraftv4_1_utility` | direct-edit / `recraft-recraftv4_1_utility-edit` | 沿用渠道端点 / stable | [来源1](https://www.recraft.ai/docs/api-reference/appendix) / [来源2](https://www.recraft.ai/docs/api-reference/endpoints) |
| `recraft/recraftv4_1_utility_vector` | `recraft-recraftv4_1_utility_vector` | direct-edit / `recraft-recraftv4_1_utility_vector-edit` | 沿用渠道端点 / stable | [来源1](https://www.recraft.ai/docs/api-reference/appendix) / [来源2](https://www.recraft.ai/docs/api-reference/endpoints) |
| `recraft/recraftv4_1_utility_pro` | `recraft-recraftv4_1_utility_pro` | direct-edit / `recraft-recraftv4_1_utility_pro-edit` | 沿用渠道端点 / stable | [来源1](https://www.recraft.ai/docs/api-reference/appendix) / [来源2](https://www.recraft.ai/docs/api-reference/endpoints) |
| `recraft/recraftv4_1_utility_pro_vector` | `recraft-recraftv4_1_utility_pro_vector` | direct-edit / `recraft-recraftv4_1_utility_pro_vector-edit` | 沿用渠道端点 / stable | [来源1](https://www.recraft.ai/docs/api-reference/appendix) / [来源2](https://www.recraft.ai/docs/api-reference/endpoints) |
| `recraft/recraftv4` | `recraft-recraftv4` | direct-edit / `recraft-recraftv4-edit` | 沿用渠道端点 / stable | [来源1](https://www.recraft.ai/docs/api-reference/appendix) / [来源2](https://www.recraft.ai/docs/api-reference/endpoints) |
| `recraft/recraftv4_vector` | `recraft-recraftv4_vector` | direct-edit / `recraft-recraftv4_vector-edit` | 沿用渠道端点 / stable | [来源1](https://www.recraft.ai/docs/api-reference/appendix) / [来源2](https://www.recraft.ai/docs/api-reference/endpoints) |
| `recraft/recraftv4_pro` | `recraft-recraftv4_pro` | direct-edit / `recraft-recraftv4_pro-edit` | 沿用渠道端点 / stable | [来源1](https://www.recraft.ai/docs/api-reference/appendix) / [来源2](https://www.recraft.ai/docs/api-reference/endpoints) |
| `recraft/recraftv4_pro_vector` | `recraft-recraftv4_pro_vector` | direct-edit / `recraft-recraftv4_pro_vector-edit` | 沿用渠道端点 / stable | [来源1](https://www.recraft.ai/docs/api-reference/appendix) / [来源2](https://www.recraft.ai/docs/api-reference/endpoints) |
| `recraft/recraftv3` | `recraft-recraftv3` | direct-edit / `recraft-recraftv3-edit` | 沿用渠道端点 / stable | [来源1](https://www.recraft.ai/docs/api-reference/appendix) / [来源2](https://www.recraft.ai/docs/api-reference/endpoints) |
| `recraft/recraftv3_vector` | `recraft-recraftv3_vector` | direct-edit / `recraft-recraftv3_vector-edit` | 沿用渠道端点 / stable | [来源1](https://www.recraft.ai/docs/api-reference/appendix) / [来源2](https://www.recraft.ai/docs/api-reference/endpoints) |
| `recraft/recraftv2` | `recraft-recraftv2` | analyze-redraw / `recraft-recraftv2` | 沿用渠道端点 / stable | [来源1](https://www.recraft.ai/docs/api-reference/appendix) / [来源2](https://www.recraft.ai/docs/api-reference/endpoints) |
| `recraft/recraftv2_vector` | `recraft-recraftv2_vector` | analyze-redraw / `recraft-recraftv2_vector` | 沿用渠道端点 / stable | [来源1](https://www.recraft.ai/docs/api-reference/appendix) / [来源2](https://www.recraft.ai/docs/api-reference/endpoints) |
| `xai/grok-imagine-image-2.0` | `xai-grok-imagine-image-2.0` | direct-edit / `xai-grok-imagine-image-2.0` | 沿用渠道端点 / stable | [来源1](https://docs.x.ai/developers/model-capabilities/images/generation) / [来源2](https://docs.x.ai/developers/model-capabilities/images/editing) |
| `xai/grok-imagine-image` | `xai-grok-imagine-image` | direct-edit / `xai-grok-imagine-image` | 沿用渠道端点 / stable | [来源1](https://docs.x.ai/developers/model-capabilities/images/generation) / [来源2](https://docs.x.ai/developers/model-capabilities/images/editing) |
| `gemini/gemini-3.1-flash-image` | `gemini-gemini-3.1-flash-image` | direct-edit / `gemini-gemini-3.1-flash-image` | 沿用渠道端点 / stable | [来源1](https://ai.google.dev/gemini-api/docs/image-generation) |
| `gemini/gemini-3.1-flash-lite-image` | `gemini-gemini-3.1-flash-lite-image` | direct-edit / `gemini-gemini-3.1-flash-lite-image` | 沿用渠道端点 / stable | [来源1](https://ai.google.dev/gemini-api/docs/image-generation) |
| `gemini/gemini-3-pro-image` | `gemini-gemini-3-pro-image` | direct-edit / `gemini-gemini-3-pro-image` | 沿用渠道端点 / stable | [来源1](https://ai.google.dev/gemini-api/docs/image-generation) |
| `gemini/gemini-2.5-flash-image` | `gemini-gemini-2.5-flash-image` | direct-edit / `gemini-gemini-2.5-flash-image` | 沿用渠道端点 / legacy | [来源1](https://ai.google.dev/gemini-api/docs/image-generation) |
| `bailian/wan2.7-image-pro` | `wanPro` | direct-edit / `wan` | cn-beijing / stable | [来源1](https://help.aliyun.com/zh/model-studio/wan-image-generation-and-editing-api-reference) |
| `bailian/wan2.7-image` | `wan` | direct-edit / `wan` | cn-beijing / stable | [来源1](https://help.aliyun.com/zh/model-studio/wan-image-generation-and-editing-api-reference) |
| `bailian/qwen-image-3.0` | `qwen` | direct-edit / `qwen` | cn-beijing / stable | [来源1](https://help.aliyun.com/zh/model-studio/qwen-image-generation-and-editing-api-reference) |
| `bailian/qwen-image-3.0-pro` | `qwen` | direct-edit / `qwen` | cn-beijing / invite-only | [来源1](https://help.aliyun.com/zh/model-studio/qwen-image-generation-and-editing-api-reference) |
| `bailian/qwen-image-2.0-pro` | `qwen` | direct-edit / `qwen` | cn-beijing / stable | [来源1](https://help.aliyun.com/zh/model-studio/qwen-image-api) / [来源2](https://help.aliyun.com/zh/model-studio/qwen-image-edit-api) |
| `bailian/qwen-image-2.0` | `qwen` | direct-edit / `qwen` | cn-beijing / stable | [来源1](https://help.aliyun.com/zh/model-studio/qwen-image-api) / [来源2](https://help.aliyun.com/zh/model-studio/qwen-image-edit-api) |
| `bailian/z-image-turbo` | `qwen` | analyze-redraw / `qwen` | cn-beijing / stable | [来源1](https://help.aliyun.com/zh/model-studio/z-image-api-reference) |
| `bailian/qwen-image-2.0-pro-2026-06-22` | `qwen` | direct-edit / `qwen` | cn-beijing / stable | [来源1](https://help.aliyun.com/zh/model-studio/qwen-image-api) / [来源2](https://help.aliyun.com/zh/model-studio/qwen-image-edit-api) |
| `bailian/qwen-image-2.0-pro-2026-04-22` | `qwen` | direct-edit / `qwen` | cn-beijing / stable | [来源1](https://help.aliyun.com/zh/model-studio/qwen-image-api) / [来源2](https://help.aliyun.com/zh/model-studio/qwen-image-edit-api) |
| `bailian/qwen-image-2.0-pro-2026-03-03` | `qwen` | direct-edit / `qwen` | cn-beijing / stable | [来源1](https://help.aliyun.com/zh/model-studio/qwen-image-api) / [来源2](https://help.aliyun.com/zh/model-studio/qwen-image-edit-api) |
| `bailian/qwen-image-2.0-2026-03-03` | `qwen` | direct-edit / `qwen` | cn-beijing / stable | [来源1](https://help.aliyun.com/zh/model-studio/qwen-image-api) / [来源2](https://help.aliyun.com/zh/model-studio/qwen-image-edit-api) |
| `bailian/wan2.6-t2i` | `wanT2i` | analyze-redraw / `wanT2i` | cn-beijing / stable | [来源1](https://help.aliyun.com/zh/model-studio/text-to-image) |
| `bailian/wan2.5-t2i-preview` | `wanT2i` | analyze-redraw / `wanT2i` | cn-beijing / stable | [来源1](https://help.aliyun.com/zh/model-studio/text-to-image) |
| `bailian/wan2.2-t2i-plus` | `wanOld` | analyze-redraw / `wanOld` | cn-beijing / stable | [来源1](https://help.aliyun.com/zh/model-studio/text-to-image) |
| `bailian/wan2.2-t2i-flash` | `wanOld` | analyze-redraw / `wanOld` | cn-beijing / stable | [来源1](https://help.aliyun.com/zh/model-studio/text-to-image) |
| `bailian/wanx2.1-t2i-plus` | `wanOld` | analyze-redraw / `wanOld` | cn-beijing / stable | [来源1](https://help.aliyun.com/zh/model-studio/text-to-image) |
| `bailian/wanx2.1-t2i-turbo` | `wanOld` | analyze-redraw / `wanOld` | cn-beijing / stable | [来源1](https://help.aliyun.com/zh/model-studio/text-to-image) |
| `bailian/wanx2.0-t2i-turbo` | `wanOld` | analyze-redraw / `wanOld` | cn-beijing / stable | [来源1](https://help.aliyun.com/zh/model-studio/text-to-image) |
| `bailian/wanx-v1` | `bailian-wanx-v1` | analyze-redraw / `bailian-wanx-v1` | cn-beijing / stable | [来源1](https://help.aliyun.com/zh/model-studio/text-to-image) |
| `bailian/wan2.6-image` | `wan26Gen` | direct-edit / `wan26Edit` | cn-beijing / stable | [来源1](https://help.aliyun.com/zh/model-studio/wan-image-generation-api-reference) |
| `bailian/wan2.5-i2i-preview` | — | direct-edit / `wan25Edit` | cn-beijing / stable | [来源1](https://help.aliyun.com/zh/model-studio/wan-image-edit) |
| `bailian/wanx2.1-imageedit` | — | direct-edit / `bailian-wanx2.1-imageedit` | cn-beijing / stable | [来源1](https://help.aliyun.com/zh/model-studio/wanx-image-edit-api-reference) |
| `bailian/kling/kling-v3-image-generation` | `bailian-kling-kling-v3-image-generation` | direct-edit / `bailian-kling-kling-v3-image-generation` | cn-beijing / stable | [来源1](https://help.aliyun.com/zh/model-studio/kling-image-generation-api-reference) |
| `bailian/kling/kling-v3-omni-image-generation` | `bailian-kling-kling-v3-omni-image-generation` | direct-edit / `bailian-kling-kling-v3-omni-image-generation` | cn-beijing / stable | [来源1](https://help.aliyun.com/zh/model-studio/kling-image-generation-api-reference) |
| `bailian/vidu/vidu-image_reference2image` | `bailian-vidu-vidu-image_reference2image` | direct-edit / `bailian-vidu-vidu-image_reference2image` | cn-beijing / stable | [来源1](https://help.aliyun.com/zh/model-studio/vidu-image-generation-api-reference) |
| `bailian/vidu/vidu-image-pro_reference2image` | `bailian-vidu-vidu-image-pro_reference2image` | direct-edit / `bailian-vidu-vidu-image-pro_reference2image` | cn-beijing / stable | [来源1](https://help.aliyun.com/zh/model-studio/vidu-image-generation-api-reference) |
| `bailian/vidu/vidu-image-lite_reference2image` | `bailian-vidu-vidu-image-lite_reference2image` | direct-edit / `bailian-vidu-vidu-image-lite_reference2image` | cn-beijing / stable | [来源1](https://help.aliyun.com/zh/model-studio/vidu-image-generation-api-reference) |
| `bailian/vidu/viduq3-fast_reference2image` | `bailian-vidu-viduq3-fast_reference2image` | direct-edit / `bailian-vidu-viduq3-fast_reference2image` | cn-beijing / stable | [来源1](https://help.aliyun.com/zh/model-studio/vidu-image-generation-api-reference) |
| `bailian/vidu/viduq2-pro_reference2image` | `bailian-vidu-viduq2-pro_reference2image` | direct-edit / `bailian-vidu-viduq2-pro_reference2image` | cn-beijing / stable | [来源1](https://help.aliyun.com/zh/model-studio/vidu-image-generation-api-reference) |
| `bailian/vidu/viduq2-fast_reference2image` | `bailian-vidu-viduq2-fast_reference2image` | direct-edit / `bailian-vidu-viduq2-fast_reference2image` | cn-beijing / stable | [来源1](https://help.aliyun.com/zh/model-studio/vidu-image-generation-api-reference) |
| `openai/gpt-image-2` | `gpt2` | direct-edit / `gpt2` | 沿用渠道端点 / stable | [来源1](https://developers.openai.com/api/docs/guides/image-generation) |
| `openai/gpt-image-1` | `openai-gpt-image-1` | direct-edit / `openai-gpt-image-1` | 沿用渠道端点 / legacy，到期 2026-10-23 | [来源1](https://developers.openai.com/api/docs/guides/image-generation) |
| `openai/gpt-image-1-mini` | `openai-gpt-image-1-mini` | direct-edit / `openai-gpt-image-1-mini` | 沿用渠道端点 / legacy，到期 2026-12-01 | [来源1](https://developers.openai.com/api/docs/guides/image-generation) |
| `openai/gpt-image-1.5` | `openai-gpt-image-1.5` | direct-edit / `openai-gpt-image-1.5` | 沿用渠道端点 / legacy，到期 2026-12-01 | [来源1](https://developers.openai.com/api/docs/guides/image-generation) |
| `openai/chatgpt-image-latest` | `openai-chatgpt-image-latest` | direct-edit / `openai-chatgpt-image-latest` | 沿用渠道端点 / legacy，到期 2026-12-01 | [来源1](https://developers.openai.com/api/docs/guides/image-generation) |
| `ark/doubao-seedream-5-0-pro-260628` | `arkPro` | direct-edit / `arkPro` | cn-beijing / stable | [来源1](https://docs.volcengine.com/docs/82379/1541523?lang=zh) |
| `ark/doubao-seedream-5-0-260128` | `ark45` | direct-edit / `ark45` | cn-beijing / stable | [来源1](https://docs.volcengine.com/docs/82379/1541523?lang=zh) |
| `ark/doubao-seedream-4-5-251128` | `ark45` | direct-edit / `ark45` | cn-beijing / legacy | [来源1](https://docs.volcengine.com/docs/82379/1541523?lang=zh) |
| `ark/doubao-seedream-4-0-250828` | `ark4` | direct-edit / `ark4` | cn-beijing / legacy | [来源1](https://docs.volcengine.com/docs/82379/1541523?lang=zh) |
| `bfl/flux-2-pro` | `bflFlux2` | direct-edit / `bflFlux2` | global-endpoint / stable | [来源1](https://docs.bfl.ai/flux_2/flux2_image_editing) |
| `bfl/flux-2-flex` | `bflFlux2` | direct-edit / `bflFlux2` | global-endpoint / stable | [来源1](https://docs.bfl.ai/flux_2/flux2_image_editing) |
| `stability/stable-image-ultra` | `stabilityUltra` | direct-edit / `stabilityUltra` | global-endpoint / stable | [来源1](https://platform.stability.ai/docs/api-reference) |
| `stability/stable-image-core` | `stabilityCore` | analyze-redraw / `stabilityCore` | global-endpoint / stable | [来源1](https://platform.stability.ai/docs/api-reference) |
| `ideogram/ideogram-v4` | `ideogram4` | direct-edit / `ideogram4` | global-endpoint / stable | [来源1](https://developer.ideogram.ai/api-reference/generate-images/generate-v4) / [来源2](https://developer.ideogram.ai/api-reference/edit-images/remix-v4) |
| `minimax/image-01` | `minimaxImage01` | analyze-redraw / `minimaxImage01` | global-endpoint / stable | [来源1](https://platform.minimax.io/docs/api-reference/image-generation-t2i) |
| `together/black-forest-labs/FLUX.2-pro` | `togetherFlux2` | direct-edit / `togetherFlux2` | global-endpoint / stable | [来源1](https://docs.together.ai/docs/quickstart-flux) |
| `together/black-forest-labs/FLUX.2-flex` | `togetherFlux2` | direct-edit / `togetherFlux2` | global-endpoint / stable | [来源1](https://docs.together.ai/docs/quickstart-flux) |
| `fal/fal-ai/flux-2-pro` | `falFlux2` | direct-edit / `falFlux2` | global-endpoint / stable | [来源1](https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=fal-ai/flux-2-pro) / [来源2](https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=fal-ai/flux-2-pro/edit) |
| `replicate/black-forest-labs/flux-2-pro` | `replicateFlux2` | direct-edit / `replicateFlux2` | global-endpoint / stable | [来源1](https://replicate.com/black-forest-labs/flux-2-pro/api/schema) |

## 尺寸契约

1K/2K/4K 是产品档位；自定义模型按目标面积或目标长边选取合法整数尺寸。固定枚举的近似比例标签保留官方像素，不擅自四舍五入。“原生”表示不发送尺寸参数。默认产品边界是单边 16384、20×1024² 像素；未显式登记的厂商边界不据此冒称已确认。

| 契约 | 类型 / 自动行为 | 各档目标或固定请求值 | 边长 / 总像素 / 宽高比 / 对齐 |
| --- | --- | --- | --- |
| `qwen` | pixels / square | **1K**：目标面积 1048576<br>**2K**：目标面积 4194304 | 最小像素 262144；最大像素 4194304；最大长短边比 8 |
| `wan` | pixels / tier | **1K**：目标面积 1048576<br>**2K**：目标面积 4194304 | 最小像素 589824；最大像素 4194304；最大长短边比 8 |
| `wanPro` | pixels / tier | **1K**：目标面积 1048576<br>**2K**：目标面积 4194304<br>**4K**：目标面积 16777216 | 最小像素 589824；最大像素 16777216；最大长短边比 8 |
| `wanT2i` | pixels / square | **1K**：目标面积 1048576 | 最小像素 1638400；最大像素 2073600；最大长短边比 4 |
| `wan26Gen` | pixels / square | **1K**：目标面积 1048576 | 最小像素 589824；最大像素 1638400；最大长短边比 4 |
| `wan26Edit` | pixels / tier | **1K**：目标面积 1048576<br>**2K**：目标面积 4194304 | 最小像素 589824；最大像素 4194304；最大长短边比 4 |
| `wan25Edit` | pixels / omit | **1K**：目标面积 1048576 | 最小像素 589824；最大像素 1638400；最大长短边比 4 |
| `wanOld` | pixels / square | **1K**：目标面积 1048576 | 最小边 512；最大边 1440；最小像素 262144；最大像素 2073600 |
| `gpt2` | pixels / square | **1K**：目标长边 1024<br>**2K**：目标长边 2048<br>**4K**：目标长边 3840 | 最大边 3840；最小像素 655360；最大像素 8294400；最大长短边比 3；尺寸倍数 16 |
| `glm` | pixels / square | **1K**：目标面积 1048576<br>**2K**：目标面积 4194304 | 最小边 512；最大边 2048；最小像素 262144；最大像素 4194304；尺寸倍数 32 |
| `cogview` | pixels / square | **1K**：目标面积 1048576<br>**2K**：目标面积 4194304 | 最小边 512；最大边 2048；最小像素 262144；最大像素 2097152；尺寸倍数 16 |
| `arkPro` | pixels / tier | **1K**：目标面积 1048576<br>**2K**：目标面积 4194304 | 最小像素 921600；最大像素 4624220；最大长短边比 16 |
| `ark45` | pixels / tier | **2K**：目标面积 4194304<br>**4K**：目标面积 16777216 | 最小像素 3686400；最大像素 16777216；最大长短边比 16 |
| `ark4` | pixels / tier | **1K**：目标面积 1048576<br>**2K**：目标面积 4194304<br>**4K**：目标面积 16777216 | 最小像素 921600；最大像素 16777216；最大长短边比 16 |
| `siliconflow-Qwen-Qwen-Image` | table / square | **1K**：1:1 → 1328x1328；16:9 → 1664x928；9:16 → 928x1664；4:3 → 1472x1140；3:4 → 1140x1472；3:2 → 1584x1056；2:3 → 1056x1584 | 按官方枚举/原生输出 |
| `siliconflow-Kwai-Kolors-Kolors` | table / square | **1K**：1:1 → 1024x1024；3:4 → 960x1280；9:16 → 720x1280；1:2 → 720x1440 | 按官方枚举/原生输出 |
| `siliconflow-baidu-ERNIE-Image-Turbo` | table / square | **1K**：1:1 → 1024x1024 | 按官方枚举/原生输出 |
| `siliconflow-Tongyi-MAI-Z-Image` | table / square | **1K**：1:1 → 1024x1024 | 按官方枚举/原生输出 |
| `siliconflow-Tongyi-MAI-Z-Image-Turbo` | table / square | **1K**：1:1 → 1024x1024 | 按官方枚举/原生输出 |
| `siliconflow-Qwen-Qwen-Image-Edit` | inherit / square | **auto**：原生参数 | 按官方枚举/原生输出 |
| `siliconflow-Qwen-Qwen-Image-Edit-2509` | inherit / square | **auto**：原生参数 | 按官方枚举/原生输出 |
| `recraft-recraftv4_1` | ratio / omit | **1K**：目标面积 1048576 | 按官方枚举/原生输出 |
| `recraft-recraftv4_1-edit` | inherit / square | **auto**：原生参数 | 按官方枚举/原生输出 |
| `recraft-recraftv4_1_pro` | ratio / omit | **2K**：目标面积 4194304 | 按官方枚举/原生输出 |
| `recraft-recraftv4_1_pro-edit` | inherit / square | **auto**：原生参数 | 按官方枚举/原生输出 |
| `recraft-recraftv4_1_vector` | ratio / omit | **1K**：目标面积 1048576 | 按官方枚举/原生输出 |
| `recraft-recraftv4_1_vector-edit` | inherit / square | **auto**：原生参数 | 按官方枚举/原生输出 |
| `recraft-recraftv4_1_pro_vector` | ratio / omit | **2K**：目标面积 4194304 | 按官方枚举/原生输出 |
| `recraft-recraftv4_1_pro_vector-edit` | inherit / square | **auto**：原生参数 | 按官方枚举/原生输出 |
| `recraft-recraftv4_1_utility` | ratio / omit | **1K**：目标面积 1048576 | 按官方枚举/原生输出 |
| `recraft-recraftv4_1_utility-edit` | inherit / square | **auto**：原生参数 | 按官方枚举/原生输出 |
| `recraft-recraftv4_1_utility_vector` | ratio / omit | **1K**：目标面积 1048576 | 按官方枚举/原生输出 |
| `recraft-recraftv4_1_utility_vector-edit` | inherit / square | **auto**：原生参数 | 按官方枚举/原生输出 |
| `recraft-recraftv4_1_utility_pro` | ratio / omit | **2K**：目标面积 4194304 | 按官方枚举/原生输出 |
| `recraft-recraftv4_1_utility_pro-edit` | inherit / square | **auto**：原生参数 | 按官方枚举/原生输出 |
| `recraft-recraftv4_1_utility_pro_vector` | ratio / omit | **2K**：目标面积 4194304 | 按官方枚举/原生输出 |
| `recraft-recraftv4_1_utility_pro_vector-edit` | inherit / square | **auto**：原生参数 | 按官方枚举/原生输出 |
| `recraft-recraftv4` | ratio / omit | **1K**：目标面积 1048576 | 按官方枚举/原生输出 |
| `recraft-recraftv4-edit` | inherit / square | **auto**：原生参数 | 按官方枚举/原生输出 |
| `recraft-recraftv4_vector` | ratio / omit | **1K**：目标面积 1048576 | 按官方枚举/原生输出 |
| `recraft-recraftv4_vector-edit` | inherit / square | **auto**：原生参数 | 按官方枚举/原生输出 |
| `recraft-recraftv4_pro` | ratio / omit | **2K**：目标面积 4194304 | 按官方枚举/原生输出 |
| `recraft-recraftv4_pro-edit` | inherit / square | **auto**：原生参数 | 按官方枚举/原生输出 |
| `recraft-recraftv4_pro_vector` | ratio / omit | **2K**：目标面积 4194304 | 按官方枚举/原生输出 |
| `recraft-recraftv4_pro_vector-edit` | inherit / square | **auto**：原生参数 | 按官方枚举/原生输出 |
| `recraft-recraftv3` | ratio / omit | **1K**：目标面积 1048576 | 按官方枚举/原生输出 |
| `recraft-recraftv3-edit` | inherit / square | **auto**：原生参数 | 按官方枚举/原生输出 |
| `recraft-recraftv3_vector` | ratio / omit | **1K**：目标面积 1048576 | 按官方枚举/原生输出 |
| `recraft-recraftv3_vector-edit` | inherit / square | **auto**：原生参数 | 按官方枚举/原生输出 |
| `recraft-recraftv2` | ratio / omit | **1K**：目标面积 1048576 | 按官方枚举/原生输出 |
| `recraft-recraftv2_vector` | ratio / omit | **1K**：目标面积 1048576 | 按官方枚举/原生输出 |
| `xai-grok-imagine-image-2.0` | ratio / omit | **1K**：目标面积 1048576<br>**2K**：目标面积 4194304 | 按官方枚举/原生输出 |
| `xai-grok-imagine-image` | ratio / omit | **1K**：目标面积 1048576<br>**2K**：目标面积 4194304 | 按官方枚举/原生输出 |
| `gemini-gemini-3.1-flash-image` | ratio / omit | **512**：原生参数，比例 1:1, 3:2, 2:3, 4:3, 3:4, 16:9, 9:16, 21:9, 1:4, 4:1, 4:5, 5:4, 1:8, 8:1<br>**1K**：目标面积 1048576<br>**2K**：目标面积 4194304<br>**4K**：目标面积 16777216 | 按官方枚举/原生输出 |
| `gemini-gemini-3.1-flash-lite-image` | ratio / omit | **1K**：目标面积 1048576 | 按官方枚举/原生输出 |
| `gemini-gemini-3-pro-image` | ratio / omit | **1K**：目标面积 1048576<br>**2K**：目标面积 4194304<br>**4K**：目标面积 16777216 | 按官方枚举/原生输出 |
| `gemini-gemini-2.5-flash-image` | ratio / omit | **1K**：目标面积 1048576 | 按官方枚举/原生输出 |
| `bailian-wanx-v1` | table / square | **1K**：1:1 → 1024*1024；16:9 → 1280*720；9:16 → 720*1280 | 按官方枚举/原生输出 |
| `bailian-wanx2.1-imageedit` | inherit / square | **auto**：原生参数 | 按官方枚举/原生输出 |
| `bailian-kling-kling-v3-image-generation` | ratio / omit | **1K**：目标面积 1048576<br>**2K**：目标面积 4194304 | 按官方枚举/原生输出 |
| `bailian-kling-kling-v3-omni-image-generation` | ratio / omit | **1K**：目标面积 1048576<br>**2K**：目标面积 4194304<br>**4K**：目标面积 16777216 | 按官方枚举/原生输出 |
| `bailian-vidu-vidu-image_reference2image` | table / square | **1K**：1:1 → 1024*1024；1:2 → 720*1440；2:1 → 1440*720；4:3 → 1024*768；3:4 → 768*1024；16:9 → 1920*1088；9:16 → 1088*1920；3:2 → 1536*1024；2:3 → 1024*1536；21:9 → 1920*816；9:21 → 816*1920<br>**2K**：1:1 → 2048*2048；1:2 → 1088*2160；2:1 → 2160*1088；4:3 → 2736*2048；3:4 → 2048*2736；16:9 → 2560*1440；9:16 → 1440*2560；3:2 → 3072*2048；2:3 → 2048*3072；21:9 → 2560*1104；9:21 → 1104*2560<br>**4K**：1:1 → 2880*2880；1:2 → 1440*2880；2:1 → 2880*1440；4:3 → 3312*2480；3:4 → 2480*3312；16:9 → 3840*2160；9:16 → 2160*3840；3:2 → 3520*2352；2:3 → 2352*3520；21:9 → 3840*1648；9:21 → 1648*3840 | 按官方枚举/原生输出 |
| `bailian-vidu-vidu-image-pro_reference2image` | table / square | **1K**：1:1 → 1024*1024；1:2 → 720*1440；2:1 → 1440*720；4:3 → 1024*768；3:4 → 768*1024；16:9 → 1920*1088；9:16 → 1088*1920；3:2 → 1536*1024；2:3 → 1024*1536；21:9 → 1920*816；9:21 → 816*1920<br>**2K**：1:1 → 2048*2048；1:2 → 1088*2160；2:1 → 2160*1088；4:3 → 2736*2048；3:4 → 2048*2736；16:9 → 2560*1440；9:16 → 1440*2560；3:2 → 3072*2048；2:3 → 2048*3072；21:9 → 2560*1104；9:21 → 1104*2560<br>**4K**：1:1 → 2880*2880；1:2 → 1440*2880；2:1 → 2880*1440；4:3 → 3312*2480；3:4 → 2480*3312；16:9 → 3840*2160；9:16 → 2160*3840；3:2 → 3520*2352；2:3 → 2352*3520；21:9 → 3840*1648；9:21 → 1648*3840 | 按官方枚举/原生输出 |
| `bailian-vidu-vidu-image-lite_reference2image` | table / square | **1K**：1:1 → 1024*1024；1:2 → 720*1440；2:1 → 1440*720；4:3 → 1024*768；3:4 → 768*1024；16:9 → 1920*1088；9:16 → 1088*1920；3:2 → 1536*1024；2:3 → 1024*1536；21:9 → 1920*816；9:21 → 816*1920<br>**2K**：1:1 → 2048*2048；1:2 → 1088*2160；2:1 → 2160*1088；4:3 → 2736*2048；3:4 → 2048*2736；16:9 → 2560*1440；9:16 → 1440*2560；3:2 → 3072*2048；2:3 → 2048*3072；21:9 → 2560*1104；9:21 → 1104*2560<br>**4K**：1:1 → 2880*2880；1:2 → 1440*2880；2:1 → 2880*1440；4:3 → 3312*2480；3:4 → 2480*3312；16:9 → 3840*2160；9:16 → 2160*3840；3:2 → 3520*2352；2:3 → 2352*3520；21:9 → 3840*1648；9:21 → 1648*3840 | 按官方枚举/原生输出 |
| `bailian-vidu-viduq3-fast_reference2image` | table / square | **1K**：1:1 → 1024*1024；9:16 → 768*1376；2:3 → 848*1264；3:4 → 896*1200；4:5 → 928*1152；5:4 → 1152*928；4:3 → 1200*896；3:2 → 1264*848；16:9 → 1376*768；21:9 → 1584*672；1:4 → 512*2064；4:1 → 2064*512；1:8 → 352*2928；8:1 → 2928*352<br>**2K**：1:1 → 2048*2048；9:16 → 1536*2752；2:3 → 1696*2528；3:4 → 1792*2400；4:5 → 1856*2304；5:4 → 2304*1856；4:3 → 2400*1792；3:2 → 2528*1696；16:9 → 2752*1536；21:9 → 3168*1344；1:4 → 1024*4128；4:1 → 4128*1024；1:8 → 704*5856；8:1 → 5856*704<br>**4K**：1:1 → 4096*4096；9:16 → 3072*5504；2:3 → 3392*5056；3:4 → 3584*4800；4:5 → 3712*4608；5:4 → 4608*3712；4:3 → 4800*3584；3:2 → 5056*3392；16:9 → 5504*3072；21:9 → 6336*2688；1:4 → 2048*8256；4:1 → 8256*2048；1:8 → 1408*11712；8:1 → 11712*1408 | 按官方枚举/原生输出 |
| `bailian-vidu-viduq2-pro_reference2image` | table / square | **1K**：1:1 → 1024*1024；9:16 → 768*1376；2:3 → 848*1264；3:4 → 896*1200；4:5 → 928*1152；5:4 → 1152*928；4:3 → 1200*896；3:2 → 1264*848；16:9 → 1376*768；21:9 → 1584*672<br>**2K**：1:1 → 2048*2048；9:16 → 1536*2752；2:3 → 1696*2528；3:4 → 1792*2400；4:5 → 1856*2304；5:4 → 2304*1856；4:3 → 2400*1792；3:2 → 2528*1696；16:9 → 2752*1536；21:9 → 3168*1344<br>**4K**：1:1 → 4096*4096；9:16 → 3072*5504；2:3 → 3392*5056；3:4 → 3584*4800；4:5 → 3712*4608；5:4 → 4608*3712；4:3 → 4800*3584；3:2 → 5056*3392；16:9 → 5504*3072；21:9 → 6336*2688 | 按官方枚举/原生输出 |
| `bailian-vidu-viduq2-fast_reference2image` | table / square | **1K**：1:1 → 1024*1024；9:16 → 768*1376；2:3 → 848*1264；3:4 → 896*1200；4:5 → 928*1152；5:4 → 1152*928；4:3 → 1200*896；3:2 → 1264*848；16:9 → 1376*768；21:9 → 1584*672 | 按官方枚举/原生输出 |
| `openai-gpt-image-1` | table / literal | **1K**：1:1 → 1024x1024；3:2 → 1536x1024；2:3 → 1024x1536 | 按官方枚举/原生输出 |
| `openai-gpt-image-1-mini` | table / literal | **1K**：1:1 → 1024x1024；3:2 → 1536x1024；2:3 → 1024x1536 | 按官方枚举/原生输出 |
| `openai-gpt-image-1.5` | table / literal | **1K**：1:1 → 1024x1024；3:2 → 1536x1024；2:3 → 1024x1536 | 按官方枚举/原生输出 |
| `openai-chatgpt-image-latest` | table / literal | **1K**：1:1 → 1024x1024；3:2 → 1536x1024；2:3 → 1024x1536 | 按官方枚举/原生输出 |
| `bflFlux2` | pixels / square | **1K**：目标面积 1048576<br>**2K**：目标面积 4194304 | 最小边 64；最大边 16384；最大像素 4194304；尺寸倍数 16 |
| `togetherFlux2` | pixels / square | **1K**：目标面积 1048576<br>**2K**：目标面积 4194304 | 最小边 256；最大边 1920；最大像素 3686400；尺寸倍数 16 |
| `falFlux2` | pixels / square | **1K**：目标面积 1048576<br>**2K**：目标面积 4194304 | 最小边 256；最大边 2560；最大像素 4194304；尺寸倍数 16 |
| `replicateFlux2` | pixels / square | **1K**：目标面积 1048576<br>**2K**：目标面积 4194304 | 最小边 256；最大边 2048；最大像素 4194304；尺寸倍数 16 |
| `minimaxImage01` | pixels / square | **1K**：目标面积 1048576<br>**2K**：目标面积 4194304 | 最小边 512；最大边 2048；最大像素 4194304；尺寸倍数 8 |
| `stabilityUltra` | ratio / omit | **1K**：原生参数，比例 16:9, 1:1, 21:9, 2:3, 3:2, 4:5, 5:4, 9:16, 9:21 | 按官方枚举/原生输出 |
| `stabilityCore` | ratio / omit | **auto**：原生参数，比例 16:9, 1:1, 21:9, 2:3, 3:2, 4:5, 5:4, 9:16, 9:21 | 按官方枚举/原生输出 |
| `ideogram4` | table / square | **1K**：1:1 → 1024x1024；4:5 → 896x1120；5:4 → 1120x896；3:4 → 864x1152；4:3 → 1152x864；2:3 → 832x1248；3:2 → 1248x832；5:8 → 800x1280；8:5 → 1280x800；9:16 → 720x1280；16:9 → 1280x720；1:2 → 720x1440；2:1 → 1440x720；1:3 → 512x1536；3:1 → 1536x512<br>**2K**：1:1 → 2048x2048；1:2 → 1440x2880；2:1 → 2880x1440；2:3 → 1664x2496；3:2 → 2496x1664；4:5 → 1792x2240；5:4 → 2240x1792；9:16 → 1440x2560；16:9 → 2560x1440；5:8 → 1600x2560；8:5 → 2560x1600；3:4 → 1728x2304；4:3 → 2304x1728；9:22 → 1296x3168；22:9 → 3168x1296；9:23 → 1152x2944；23:9 → 2944x1152；3:8 → 1248x3328；8:3 → 3328x1248；5:12 → 1280x3072；12:5 → 3072x1280；1:3 → 1024x3072；3:1 → 3072x1024 | 按官方枚举/原生输出 |

## 限制与明确保留项

- Together 的 256..1920 是该渠道范围；16 对齐是产品采用的合法保守子集。fal 编辑端 schema 没有生成端的 `x-fal` 限制，本轮编辑使用 256..2560 / 4 MP 的保守子集，不将其称作官方编辑硬上限。
- 硅基流动 ERNIE/Z-Image 公开接口未提供完整自定义边界，仍只开放登记的方形尺寸；不按原厂能力扩大。旧 wanx-v1 的尺寸枚举沿用官方历史资料，旧型号当前账户可用性未做推理验证。
- Recraft 和硅基流动 Qwen Edit 原生编辑尺寸由源图决定。图研源图上传仍有既有文件大小限制，并非厂商允许的所有文件都在产品界面开放。
- 38 个产品候选比例是固定官方列表的并集及自定义尺寸候选；每个型号/操作/分辨率只启用其能转换成合法请求的子集。
