# R11 模态待复核清单（仅列出，不修正）

完整 Core registry 共 1061 卡；27 卡 / 30 个字段图标差异，其中显示支持但官方未列/不支持 30 项，显示不支持但官方列为支持 0 项。无渠道官方模态证据 406 卡；仅一侧模态证据 28 卡；另有 137 卡使用官方任务标签的正向证据，未把标签遗漏当作不支持。未知图标不算不支持。

仅使用仓库已捕获证据，未联网补证。逐 channel/id 匹配，并验证来源属于该渠道；原厂页不能证明第三方渠道支持。已有结构化模态数组按 R10 表格 → generated 渠道事实 → 未撤回的输入快照 → 10 月规格 → 精确型号页 → v24 记录排序。产品 roles/capabilities、请求上限与通用接口能力不作为官方模态证据；明确记载 PDF 输入或 pdf_url 的渠道说明计入 file。Runware 的官方 text-to-image 等标签仅证明对应正向能力，不构成完整输入清单，不能据其遗漏判定多余模态。未列不等于明确不支持，以下为 PM 待复核项。

R10 同页多变体表取并集，避免把较窄的表外推到全部 ID；歧义、证据文件及无证据卡片逐 ID 见 [JSON](model-card-audit-20261109-r11-misleading.json)。当前有 5 个卡片字段使用这种保守口径。证据有日期差异，清单不代表今日在线规格或真实模型调用验收。

| 渠道 | 涉及卡片 | 差异项 | 按字段计数 | 无渠道模态证据卡片 |
| --- | ---: | ---: | --- | ---: |
| anthropic | 0 | 0 | — | 0 |
| antling | 0 | 0 | — | 1 |
| ark | 0 | 0 | — | 35 |
| bailian | 0 | 0 | — | 33 |
| bfl | 0 | 0 | — | 13 |
| deepseek | 0 | 0 | — | 0 |
| fal | 15 | 15 | input/image: 14；output/text: 1 | 5 |
| fireworks | 0 | 0 | — | 4 |
| gemini | 0 | 0 | — | 16 |
| ideogram | 1 | 1 | input/image: 1 | 0 |
| iflytek | 0 | 0 | — | 2 |
| kimi | 0 | 0 | — | 6 |
| longcat | 0 | 0 | — | 1 |
| minimax | 0 | 0 | — | 6 |
| mistral | 0 | 0 | — | 1 |
| novita | 0 | 0 | — | 1 |
| openai | 0 | 0 | — | 26 |
| qianfan | 8 | 9 | input/image: 2；input/video: 7 | 1 |
| recraft | 0 | 0 | — | 0 |
| replicate | 2 | 4 | input/file: 1；input/image: 1；input/video: 1；output/text: 1 | 19 |
| runware | 0 | 0 | — | 3 |
| sensenova | 1 | 1 | input/video: 1 | 0 |
| siliconflow | 0 | 0 | — | 68 |
| stability | 0 | 0 | — | 0 |
| stepfun | 0 | 0 | — | 0 |
| together | 0 | 0 | — | 48 |
| tokendance | 0 | 0 | — | 59 |
| tokenhub | 0 | 0 | — | 49 |
| xai | 0 | 0 | — | 0 |
| xiaomi | 0 | 0 | — | 0 |
| zhipu | 0 | 0 | — | 9 |

## 完整清单

| channel | model id | field | card value | official value | source URL |
| --- | --- | --- | --- | --- | --- |
| fal | `blackforestlabs/flux-3/klein/base/text-to-image` | input/image | 支持 | 未列支持（不等于明确不支持） | https://fal.ai/models/blackforestlabs/flux-3/klein/base/text-to-image/api |
| fal | `blackforestlabs/flux-3/klein/text-to-image` | input/image | 支持 | 未列支持（不等于明确不支持） | https://fal.ai/models/blackforestlabs/flux-3/klein/text-to-image/api |
| fal | `blackforestlabs/flux-3/text-to-image` | input/image | 支持 | 未列支持（不等于明确不支持） | https://fal.ai/models/blackforestlabs/flux-3/text-to-image/api |
| fal | `bytedance/seedream/v5/flash/text-to-image` | input/image | 支持 | 未列支持（不等于明确不支持） | https://fal.ai/models/bytedance/seedream/v5/flash/text-to-image/api |
| fal | `bytedance/seedream/v5/pro/text-to-image` | input/image | 支持 | 未列支持（不等于明确不支持） | https://fal.ai/models/bytedance/seedream/v5/pro/text-to-image/api |
| fal | `fal-ai/bytedance/seedream/v4.5/text-to-image` | input/image | 支持 | 未列支持（不等于明确不支持） | https://fal.ai/models/fal-ai/bytedance/seedream/v4.5/text-to-image/api |
| fal | `fal-ai/bytedance/seedream/v4/text-to-image` | input/image | 支持 | 未列支持（不等于明确不支持） | https://fal.ai/models/fal-ai/bytedance/seedream/v4/text-to-image/api |
| fal | `fal-ai/flux-2-pro` | input/image | 支持 | 未列支持（不等于明确不支持） | https://fal.ai/models/fal-ai/flux-2-pro/api |
| fal | `google/nano-banana-2.1` | output/text | 支持 | 未列支持（不等于明确不支持） | https://fal.ai/models/google/nano-banana-2.1/api |
| fal | `krea/v3/text-to-image` | input/image | 支持 | 未列支持（不等于明确不支持） | https://fal.ai/models/krea/v3/text-to-image/api |
| fal | `meta/muse-image/text-to-image` | input/image | 支持 | 未列支持（不等于明确不支持） | https://fal.ai/models/meta/muse-image/text-to-image/api |
| fal | `openai/gpt-image-2.5/flare/text-to-image` | input/image | 支持 | 未列支持（不等于明确不支持） | https://fal.ai/models/openai/gpt-image-2.5/flare/text-to-image/api |
| fal | `openai/gpt-image-2.5/sunburst/text-to-image` | input/image | 支持 | 未列支持（不等于明确不支持） | https://fal.ai/models/openai/gpt-image-2.5/sunburst/text-to-image/api |
| fal | `xai/grok-imagine-image` | input/image | 支持 | 未列支持（不等于明确不支持） | https://fal.ai/models/xai/grok-imagine-image/api |
| fal | `xai/grok-imagine-image/quality/text-to-image` | input/image | 支持 | 未列支持（不等于明确不支持） | https://fal.ai/models/xai/grok-imagine-image/quality/text-to-image/api |
| ideogram | `ideogram-v4` | input/image | 支持 | 未列支持（不等于明确不支持） | https://developer.ideogram.ai/v2/api-reference/images/generate/ideogram-4 |
| qianfan | `ernie-5.0-thinking-exp` | input/image | 支持 | 未列支持（不等于明确不支持） | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j |
| qianfan | `glm-5.3-flash` | input/video | 支持 | 未列支持（不等于明确不支持） | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j |
| qianfan | `internvl3-38b` | input/video | 支持 | 未列支持（不等于明确不支持） | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j |
| qianfan | `kimi-k2.6` | input/image | 支持 | 未列支持（不等于明确不支持） | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j |
| qianfan | `kimi-k2.6` | input/video | 支持 | 未列支持（不等于明确不支持） | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j |
| qianfan | `qwen3.5-122b-a10b` | input/video | 支持 | 未列支持（不等于明确不支持） | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j |
| qianfan | `qwen3.5-27b` | input/video | 支持 | 未列支持（不等于明确不支持） | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j |
| qianfan | `qwen3.5-35b-a3b` | input/video | 支持 | 未列支持（不等于明确不支持） | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j |
| qianfan | `qwen3.5-397b-a17b` | input/video | 支持 | 未列支持（不等于明确不支持） | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j |
| replicate | `google/nano-banana-2.1` | input/file | 支持 | 未列支持（不等于明确不支持） | https://replicate.com/google/nano-banana-2.1/api/schema |
| replicate | `google/nano-banana-2.1` | input/video | 支持 | 未列支持（不等于明确不支持） | https://replicate.com/google/nano-banana-2.1/api/schema |
| replicate | `google/nano-banana-2.1` | output/text | 支持 | 未列支持（不等于明确不支持） | https://replicate.com/google/nano-banana-2.1/api/schema |
| replicate | `prunaai/flux-kontext-fast` | input/image | 支持 | 未列支持（不等于明确不支持） | https://replicate.com/prunaai/flux-kontext-fast/api/schema |
| sensenova | `kimi-k3` | input/video | 支持 | 未列支持（不等于明确不支持） | https://platform.sensenova.cn/docs |
