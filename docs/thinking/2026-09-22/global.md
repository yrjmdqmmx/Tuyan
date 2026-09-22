# 国外渠道思考参数审计（2026-09-22）

审计对象为当前静态目录 2026-09-22.v24 中 16 个指定渠道的 515 个型号、641 个 role/protocol 身份，以及 OpenRouter 公开目录的 444 条 Chat 记录和 52 条独立图片记录。完整机器可读证据在 [global.json](../../../config/thinking-audit/global.json)。

只读取本地代码、官方文档及无需认证的公开目录；没有真实推理、付费请求、部署或历史任务重跑。接口接受字段、目录可见、账号可调用及成功推理是不同证据层级。

关键前提修正：模型能推理不代表当前渠道提供可调思考；同名型号也不能跨渠道、角色或协议继承控件。quality、steps、guidance、verbosity、显示思考文本和 reasoning usage 不是可调思考强度。

## 覆盖与状态

| 渠道 | 静态型号 | 全部 profiles | 可调 supported | 无字段 unsupported | 待确认 unconfirmed | 固定 fixed |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| openai | 66 | 66 | 30 | 29 | 5 | 2 |
| anthropic | 11 | 11 | 11 | 0 | 0 | 0 |
| gemini | 15 | 15 | 13 | 1 | 0 | 1 |
| xai | 12 | 12 | 6 | 4 | 0 | 2 |
| mistral | 16 | 16 | 2 | 0 | 14 | 0 |
| together | 48 | 48 | 7 | 0 | 41 | 0 |
| fireworks | 23 | 23 | 8 | 0 | 15 | 0 |
| openrouter | 0 | 496 | 223 | 172 | 71 | 30 |
| fal | 42 | 42 | 3 | 39 | 0 | 0 |
| replicate | 97 | 97 | 4 | 93 | 0 | 0 |
| runware | 138 | 138 | 30 | 108 | 0 | 0 |
| recraft | 16 | 16 | 0 | 16 | 0 | 0 |
| bfl | 12 | 12 | 0 | 12 | 0 | 0 |
| stability | 6 | 6 | 0 | 0 | 6 | 0 |
| ideogram | 13 | 13 | 0 | 13 | 0 | 0 |
| custom | 0 | 0 | 0 | 0 | 0 | 0 |

状态只描述此身份的可调接口：supported 有可核实控件；unsupported 表示已检查的当前请求 schema 不提供此控件；fixed 表示固定推理行为；unconfirmed 表示精确字段、枚举、别名映射或来源不足。未知默认值记为 null，含义是“不填写字段”，不可发送字面 null。custom 没有静态身份，保留逐 endpoint/model/role/protocol 审核要求。

静态身份完整覆盖；OpenRouter 静态模型数为 0，动态 Chat 和 Images 独立建档。展开后共 1,284 个唯一 provider/modelId/role/protocol 身份，重复 0、静态遗漏 0、控件默认值错误 0、错误 vision 角色 0。batch 记录保留审计但 roles 为空，不开放同步调用。

## 与当前请求构造的关系

历史或旧客户端没有 thinkingConfig 时保留原行为；新版显式选择“服务商默认”仅删除 clearFields 内已核实思考字段，不删除 max_tokens、max_output_tokens 或 max_completion_tokens。更高强度可能增加耗时、输出 token 和费用；当前变更不自动增加输出上限。

OpenAI 当前 gpt-5.1 / gpt-5.2 分支固定发送 reasoning_effort=none 并附带 temperature；改为有思考强度时必须移除不兼容 sampling 字段。Chat 使用 reasoning_effort，Responses 使用 reasoning.effort。GPT-5.6 的 standard/pro mode 仅获 Responses 文档支持，而当前目录为 Chat，不开放该 mode。GPT Image 的 quality（包括 xhigh/max）不是 reasoning。来源：[推理指南](https://developers.openai.com/api/docs/guides/reasoning)、[兼容参数](https://developers.openai.com/api/docs/guides/latest-model?model=gpt-5.2)、[图片接口](https://developers.openai.com/api/docs/guides/image-generation)。

Claude：effort 位于 output_config.effort，即使 thinking.disabled 也有效；只有明确型号规则禁止的组合才拒绝，例如 Opus 5 disabled+xhigh/max。Fable 5/5.1 不可关闭。Opus 4.7/4.8 与新 5 系列拒绝旧 enabled/budget；4.6 仍接受但已弃用；4.5 使用 enabled+预算。预算最少 1024，必须小于现有 max_tokens=16384，所以产品上限为 16383；这不是厂商固定上限。Opus 4.5 的 effort 与 enabled/budget 可组合。来源：[effort](https://platform.claude.com/docs/en/build-with-claude/effort)、[型号兼容表](https://platform.claude.com/docs/en/build-with-claude/thinking-troubleshooting)、[预算](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)。

Gemini 文本 GenerateContent 使用 generationConfig.thinkingConfig.thinkingLevel 或 thinkingBudget；图片当前走 Interactions，使用 generation_config.thinking_level。2.5 Pro 预算 128..32768 和 -1；2.5 Flash 为 0..24576 和 -1；Flash Lite 为 512..24576，以及 0/-1 特殊值。-1 为动态，0 仅在允许的型号关闭；最小正数以下的间隙不能接受。3.1 Flash/Flash Lite 图片 minimal/high；3 Pro 图片固定内部思考；2.5 Flash Image 不继承文本预算。来源：[GenerateContent 思考](https://ai.google.dev/gemini-api/docs/generate-content/thinking?hl=en)、[图片 Interactions](https://ai.google.dev/gemini-api/docs/image-generation)。

xAI Responses 使用 reasoning.effort；4.5 和 4.3 的概述文字与精确型号页在 xhigh 上不一致，本审计采用精确型号页并保留 conflicts。Multi-agent 的 effort 改变协作 agent 数量（low/medium 为 4，high/xhigh 为 16），不等于普通模型的思考深度。Mistral 已确认两型号使用 reasoning_effort=none/high；high 返回 text/thinking 分块，应仅拼接 text。来源：[xAI reasoning](https://docs.x.ai/developers/model-capabilities/text/reasoning)、[多 agent](https://docs.x.ai/developers/model-capabilities/text/multi-agent)、[Mistral](https://docs.mistral.ai/studio/conversations/reasoning)。

Together 的确证开关使用 reasoning.enabled；Fireworks 的有效档位与底层厂商不同，例如 medium→high、xhigh→max。Together DeepSeek V4 的 high/max 描述互相冲突，因此仅开放独立明确的 on/off；Fireworks 的通用指南和 API reference 对 effort/thinking 并存优先级不同，保守互斥。Fireworks DeepSeek V4.1 正整数 reasoning_effort 是思考 token 上限，不是原厂 1..100 强度；现有请求未显式设置总输出上限，预算仅列入 documentedControls，暂不开放。来源：[Together](https://docs.together.ai/docs/inference/chat/reasoning)、[Fireworks API](https://docs.fireworks.ai/api-reference/post-chatcompletions)。

## 图片接口的精确位置

| 渠道 / 型号 | 思考字段 | 取值与默认 | 适用操作 |
| --- | --- | --- | --- |
| gemini / `gemini-3.1-flash-lite-image` | `generation_config.thinking_level` | `minimal`, `high`；默认 `minimal` | generation, editing |
| gemini / `gemini-3.1-flash-image` | `generation_config.thinking_level` | `minimal`, `high`；默认 `minimal` | generation, editing |
| fal / `fal-ai/nano-banana-2` | `thinking_level` | `minimal`, `high`；默认 未确认 / 省略 | generation, editing |
| fal / `google/nano-banana-2-lite` | `thinking_level` | `minimal`, `high`；默认 未确认 / 省略 | generation, editing |
| fal / `imagineart/imagineart-2.0-preview/text-to-image` | `reasoning` | `low`, `high`；默认 `low` | generation |
| replicate / `wan-video/wan-2.7-image` | `input.thinking_mode` | `false`, `true`；默认 `true` | generation |
| replicate / `wan-video/wan-2.7-image-pro` | `input.thinking_mode` | `false`, `true`；默认 `true` | generation |
| replicate / `bytedance/bagel` | `input.enable_thinking` | `false`, `true`；默认 `false` | generation, editing |
| replicate / `prunaai/p-image-ideogram` | `input.thinking` | `very low`, `low`, `medium`, `high`, `very high`；默认 `high` | generation |
| runware / `prunaai:p-image@ideogram` | `settings.thinkingLevel` | `very low`, `low`, `medium`, `high`；默认 `high` | generation |
| runware / `bytedance:seedream@5.0-pro` | `settings.thinking` | `false`, `true`；默认 `true` | generation, editing |
| runware / `meta:muse@image` | `settings.thinkingLevel` | `high`, `low`；默认 `high` | generation, editing |
| runware / `google:nano-banana@2-lite` | `settings.thinking` | `MINIMAL`, `HIGH`；默认 未确认 / 省略 | generation, editing |
| runware / `sourceful:riverflow-2.5@fast` | `settings.thinkingLevel` | `low`, `medium`, `high`；默认 `medium` | generation, editing |
| runware / `sourceful:riverflow-2.5@pro` | `settings.thinkingLevel` | `low`, `medium`, `high`, `xhigh`；默认 `medium` | generation, editing |
| runware / `imagineart:2.0@0` | `settings.thinkingLevel` | `high`, `low`；默认 `high` | generation, editing |
| runware / `alibaba:wan@2.7-image` | `settings.thinking` | `false`, `true`；默认 `true` | generation |
| runware / `alibaba:wan@2.7-image-pro` | `settings.thinking` | `false`, `true`；默认 `true` | generation |
| runware / `google:4@3` | `settings.thinking` | `MINIMAL`, `HIGH`；默认 未确认 / 省略 | generation, editing |

Runware 为数组内 task.model AIR 身份，参数写入 settings；Replicate 常用 /v1/models/{owner}/{name}/predictions 路径识别模型，参数必须位于 input，版本式请求还需核对 pinnedSchemaVersion；fal 从 queue endpoint 路径识别，字段位于根级，编辑端点另行记录 endpointAliases。不能依赖这些请求一定有 body.model。每条精确来源和 Replicate schema 哈希见 JSON。

Replicate Wan 2.7 的 thinking_mode 仅用于无 input.images 且未启用 image_set_mode 的纯文生图；Runware Wan 2.7 也以保守产品限制仅开放文生图，已区分“厂商说明”与“产品限制”。Riverflow thinkingLevel 调节编辑/评判迭代次数。fal Nano Banana 的文档把省略描述为禁用，而 Gemini 原生称内部思考始终存在：保留渠道语义，不创造 off 枚举。

## OpenRouter 动态目录

Chat 逐条保存 supported_parameters、reasoning、context_length、top_provider.max_completion_tokens、per_request_limits 和 default_parameters。roles 由 input/output modalities 决定，只有支持图像输入且输出文本的身份才有 vision。supported_efforts 缺失表示不能据此建档位选择器；显式 null 表示网关全部档位；mandatory 决定是否允许关闭。仅泛化 reasoning 字段而缺少精确 metadata 的路由模型保持 unconfirmed。来源：[公开 Chat 目录](https://openrouter.ai/api/v1/models)、[字段含义](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens)。

52 条图片目录使用 openrouter-images，其参数 schema 没有思考字段；同名 Chat 模型参数不能移入图片接口。来源：[独立图片目录](https://openrouter.ai/api/v1/images/models)。

supports_max_tokens=true 只说明可接收预算，通常没有精确边界。唯一同时获官方网关界限说明的当前 Anthropic 身份是 claude-opus-4.6：最少 1024、最多 128000，并要求 budget<max_tokens；现有 Chat 请求不提供 max_tokens，因此预算保留 documentedControls，不编造默认上限或自动扩大输出。网关 effort/budget 并用文档存在歧义，产品互斥；enabled=false+非 none effort 的优先级也未独立确证，保守拒绝，不继承原生 Claude 规则。

## 未开放与证据局限

Stability 文档返回 HTTP 200 外壳但未取得可读参数表，保留 unconfirmed；不能把 HTTP 200 当 schema 已核实。Recraft 完整参数表、BFL OpenAPI、Ideogram 操作 schema 已核对，没有思考字段。OpenAI o1-pro/o3-pro/chat-latest、Mistral 别名及未精确绑定的 Together/Fireworks 型号维持 unconfirmed；不是停服或不可调用判断。

来源元数据共 390 条，记录 checkedAt、HTTP 状态及可得的 SHA-256；catalog-reference-only 表示仅作为目录来源入口，不冒充已阅读全文。OpenAI 发布页由 web search 读取，直接 fetch 为 403 已如实保留。所有 supported 的控件值保留 wire 大小写、空格、布尔类型，不按型号名字补齐。

## 全量静态身份矩阵

下表逐型号列出当前静态目录的角色、协议、状态与可调字段。完整限制、逐型号未开放原因及来源 URL 在同名 JSON profile/excluded；所有 444+52 条 OpenRouter 动态身份也在 JSON 中逐条保存。

| 渠道 | 精确 model ID | roles | protocol | 状态 | 可调字段 |
| --- | --- | --- | --- | --- | --- |
| openai | `gpt-image-2.5-flare` | image | `openai-images` | unsupported | — |
| openai | `gpt-image-2.5-flare-2026-09-08` | image | `openai-images` | unsupported | — |
| openai | `gpt-image-2.5-sunburst` | image | `openai-images` | unsupported | — |
| openai | `gpt-image-2.5-sunburst-2026-09-08` | image | `openai-images` | unsupported | — |
| openai | `gpt-6-astra` | main, vision | `openai-responses` | supported | `reasoning.effort` |
| openai | `gpt-5.6-luna` | main, vision | `openai-chat-completions` | supported | `reasoning_effort` |
| openai | `gpt-5.6-sol` | main, vision | `openai-chat-completions` | supported | `reasoning_effort` |
| openai | `gpt-5.6-terra` | main, vision | `openai-chat-completions` | supported | `reasoning_effort` |
| openai | `gpt-5.5` | main, vision | `openai-chat-completions` | supported | `reasoning_effort` |
| openai | `gpt-5.5-pro` | main, vision | `openai-responses` | supported | `reasoning.effort` |
| openai | `gpt-5.4` | main, vision | `openai-chat-completions` | supported | `reasoning_effort` |
| openai | `gpt-5.4-mini` | main, vision | `openai-chat-completions` | supported | `reasoning_effort` |
| openai | `gpt-5.4-nano` | main, vision | `openai-chat-completions` | supported | `reasoning_effort` |
| openai | `gpt-5.4-pro` | main, vision | `openai-responses` | supported | `reasoning.effort` |
| openai | `gpt-5.3-codex` | main, vision | `openai-responses` | supported | `reasoning.effort` |
| openai | `gpt-5.2` | main, vision | `openai-chat-completions` | supported | `reasoning_effort` |
| openai | `gpt-5.2-2025-12-11` | main, vision | `openai-chat-completions` | supported | `reasoning_effort` |
| openai | `gpt-5.2-pro` | main, vision | `openai-responses` | supported | `reasoning.effort` |
| openai | `gpt-5.1` | main, vision | `openai-chat-completions` | supported | `reasoning_effort` |
| openai | `gpt-5.1-2025-11-13` | main, vision | `openai-chat-completions` | supported | `reasoning_effort` |
| openai | `gpt-5` | main, vision | `openai-chat-completions` | supported | `reasoning_effort` |
| openai | `gpt-5-2025-08-07` | main, vision | `openai-chat-completions` | supported | `reasoning_effort` |
| openai | `gpt-5-mini` | main, vision | `openai-chat-completions` | supported | `reasoning_effort` |
| openai | `gpt-5-mini-2025-08-07` | main, vision | `openai-chat-completions` | supported | `reasoning_effort` |
| openai | `gpt-5-nano` | main, vision | `openai-chat-completions` | supported | `reasoning_effort` |
| openai | `gpt-5-nano-2025-08-07` | main, vision | `openai-chat-completions` | supported | `reasoning_effort` |
| openai | `gpt-5-pro` | main, vision | `openai-responses` | fixed | — |
| openai | `gpt-5-pro-2025-10-06` | main, vision | `openai-responses` | fixed | — |
| openai | `gpt-4.1` | main, vision | `openai-chat-completions` | unsupported | — |
| openai | `gpt-4.1-2025-04-14` | main, vision | `openai-chat-completions` | unsupported | — |
| openai | `gpt-4.1-mini` | main, vision | `openai-chat-completions` | unsupported | — |
| openai | `gpt-4.1-mini-2025-04-14` | main, vision | `openai-chat-completions` | unsupported | — |
| openai | `gpt-4.1-nano` | main, vision | `openai-chat-completions` | unsupported | — |
| openai | `gpt-4.1-nano-2025-04-14` | main, vision | `openai-chat-completions` | unsupported | — |
| openai | `gpt-4o` | main, vision | `openai-chat-completions` | unsupported | — |
| openai | `gpt-4o-2024-05-13` | main, vision | `openai-chat-completions` | unsupported | — |
| openai | `gpt-4o-2024-08-06` | main, vision | `openai-chat-completions` | unsupported | — |
| openai | `gpt-4o-2024-11-20` | main, vision | `openai-chat-completions` | unsupported | — |
| openai | `gpt-4o-mini` | main, vision | `openai-chat-completions` | unsupported | — |
| openai | `gpt-4o-mini-2024-07-18` | main, vision | `openai-chat-completions` | unsupported | — |
| openai | `gpt-4-turbo` | main, vision | `openai-chat-completions` | unsupported | — |
| openai | `gpt-4-turbo-2024-04-09` | main, vision | `openai-chat-completions` | unsupported | — |
| openai | `gpt-4` | main | `openai-chat-completions` | unsupported | — |
| openai | `gpt-4-0613` | main | `openai-chat-completions` | unsupported | — |
| openai | `gpt-4-1106-preview` | main | `openai-chat-completions` | unsupported | — |
| openai | `gpt-image-2` | image | `openai-images` | unsupported | — |
| openai | `gpt-image-1.5` | image | `openai-images` | unsupported | — |
| openai | `gpt-image-1` | image | `openai-images` | unsupported | — |
| openai | `gpt-image-1-mini` | image | `openai-images` | unsupported | — |
| openai | `chat-latest` | main, vision | `openai-chat-completions` | unconfirmed | — |
| openai | `chatgpt-image-latest` | image | `openai-images` | unsupported | — |
| openai | `gpt-3.5-turbo` | main | `openai-chat-completions` | unsupported | — |
| openai | `gpt-3.5-turbo-0125` | main | `openai-chat-completions` | unsupported | — |
| openai | `gpt-3.5-turbo-1106` | main | `openai-chat-completions` | unsupported | — |
| openai | `o1` | main, vision | `openai-chat-completions` | supported | `reasoning_effort` |
| openai | `o1-2024-12-17` | main, vision | `openai-chat-completions` | supported | `reasoning_effort` |
| openai | `o1-pro` | main, vision | `openai-responses` | unconfirmed | — |
| openai | `o1-pro-2025-03-19` | main, vision | `openai-responses` | unconfirmed | — |
| openai | `o3` | main, vision | `openai-chat-completions` | supported | `reasoning_effort` |
| openai | `o3-2025-04-16` | main, vision | `openai-chat-completions` | supported | `reasoning_effort` |
| openai | `o3-mini` | main | `openai-chat-completions` | supported | `reasoning_effort` |
| openai | `o3-mini-2025-01-31` | main | `openai-chat-completions` | supported | `reasoning_effort` |
| openai | `o3-pro` | main, vision | `openai-responses` | unconfirmed | — |
| openai | `o3-pro-2025-06-10` | main, vision | `openai-responses` | unconfirmed | — |
| openai | `o4-mini` | main, vision | `openai-chat-completions` | supported | `reasoning_effort` |
| openai | `o4-mini-2025-04-16` | main, vision | `openai-chat-completions` | supported | `reasoning_effort` |
| anthropic | `claude-fable-5-1` | main, vision | `anthropic-messages` | supported | `thinking.type`, `output_config.effort` |
| anthropic | `claude-opus-5` | main, vision | `anthropic-messages` | supported | `thinking.type`, `output_config.effort` |
| anthropic | `claude-sonnet-5` | main, vision | `anthropic-messages` | supported | `thinking.type`, `output_config.effort` |
| anthropic | `claude-fable-5` | main, vision | `anthropic-messages` | supported | `thinking.type`, `output_config.effort` |
| anthropic | `claude-opus-4-8` | main, vision | `anthropic-messages` | supported | `thinking.type`, `output_config.effort` |
| anthropic | `claude-opus-4-7` | main, vision | `anthropic-messages` | supported | `thinking.type`, `output_config.effort` |
| anthropic | `claude-sonnet-4-6` | main, vision | `anthropic-messages` | supported | `thinking.type`, `output_config.effort`, `thinking.budget_tokens` |
| anthropic | `claude-opus-4-6` | main, vision | `anthropic-messages` | supported | `thinking.type`, `output_config.effort`, `thinking.budget_tokens` |
| anthropic | `claude-opus-4-5-20251101` | main, vision | `anthropic-messages` | supported | `thinking.type`, `output_config.effort`, `thinking.budget_tokens` |
| anthropic | `claude-sonnet-4-5-20250929` | main, vision | `anthropic-messages` | supported | `thinking.type`, `thinking.budget_tokens` |
| anthropic | `claude-haiku-4-5-20251001` | main, vision | `anthropic-messages` | supported | `thinking.type`, `thinking.budget_tokens` |
| gemini | `gemini-3.8-flash` | main, vision | `gemini-generate-content` | supported | `generationConfig.thinkingConfig.thinkingLevel` |
| gemini | `gemini-3.7-flash` | main, vision | `gemini-generate-content` | supported | `generationConfig.thinkingConfig.thinkingLevel` |
| gemini | `gemini-3.6-flash` | main, vision | `gemini-generate-content` | supported | `generationConfig.thinkingConfig.thinkingLevel` |
| gemini | `gemini-3.5-flash-lite` | main, vision | `gemini-generate-content` | supported | `generationConfig.thinkingConfig.thinkingLevel` |
| gemini | `gemini-3.1-flash-lite-image` | image | `gemini-interactions` | supported | `generation_config.thinking_level` |
| gemini | `gemini-3.1-flash-image` | image | `gemini-interactions` | supported | `generation_config.thinking_level` |
| gemini | `gemini-3-pro-image` | image | `gemini-interactions` | fixed | — |
| gemini | `gemini-3.5-flash` | main, vision | `gemini-generate-content` | supported | `generationConfig.thinkingConfig.thinkingLevel` |
| gemini | `gemini-3.1-flash-lite` | main, vision | `gemini-generate-content` | supported | `generationConfig.thinkingConfig.thinkingLevel` |
| gemini | `gemini-3.1-pro-preview` | main, vision | `gemini-generate-content` | supported | `generationConfig.thinkingConfig.thinkingLevel` |
| gemini | `gemini-3-flash-preview` | main, vision | `gemini-generate-content` | supported | `generationConfig.thinkingConfig.thinkingLevel` |
| gemini | `gemini-2.5-flash` | main, vision | `gemini-generate-content` | supported | `generationConfig.thinkingConfig.thinkingBudget` |
| gemini | `gemini-2.5-flash-image` | image | `gemini-generate-content` | unsupported | — |
| gemini | `gemini-2.5-flash-lite` | main, vision | `gemini-generate-content` | supported | `generationConfig.thinkingConfig.thinkingBudget` |
| gemini | `gemini-2.5-pro` | main, vision | `gemini-generate-content` | supported | `generationConfig.thinkingConfig.thinkingBudget` |
| xai | `grok-4.7` | main, vision | `openai-responses` | supported | `reasoning.effort` |
| xai | `grok-4.6` | main, vision | `openai-responses` | supported | `reasoning.effort` |
| xai | `grok-4.5` | main, vision | `openai-responses` | supported | `reasoning.effort` |
| xai | `grok-4.3` | main, vision | `openai-responses` | supported | `reasoning.effort` |
| xai | `grok-4.20-0309-non-reasoning` | main, vision | `openai-responses` | unsupported | — |
| xai | `grok-4.20-0309-reasoning` | main, vision | `openai-responses` | fixed | — |
| xai | `grok-4.20-multi-agent` | main, vision | `openai-responses` | supported | `reasoning.effort` |
| xai | `grok-4.20-multi-agent-0309` | main, vision | `openai-responses` | supported | `reasoning.effort` |
| xai | `grok-imagine-image-2.0` | image | `provider-images` | unsupported | — |
| xai | `grok-imagine-image` | image | `provider-images` | unsupported | — |
| xai | `grok-imagine-image-quality` | image | `provider-images` | unsupported | — |
| xai | `grok-build-0.1` | main, vision | `openai-responses` | fixed | — |
| mistral | `zai-glm-5-3` | main | `openai-chat-completions` | unconfirmed | — |
| mistral | `mistral-medium-3-5` | main, vision | `openai-chat-completions` | supported | `reasoning_effort` |
| mistral | `mistral-medium-3` | main, vision | `openai-chat-completions` | unconfirmed | — |
| mistral | `zai-glm-5-2` | main | `openai-chat-completions` | unconfirmed | — |
| mistral | `codestral-2508` | main | `openai-chat-completions` | unconfirmed | — |
| mistral | `codestral-latest` | main | `openai-chat-completions` | unconfirmed | — |
| mistral | `labs-leanstral-1-5` | main | `openai-chat-completions` | unconfirmed | — |
| mistral | `ministral-14b-2512` | main, vision | `openai-chat-completions` | unconfirmed | — |
| mistral | `ministral-14b-latest` | main, vision | `openai-chat-completions` | unconfirmed | — |
| mistral | `ministral-3b-2512` | main, vision | `openai-chat-completions` | unconfirmed | — |
| mistral | `ministral-3b-latest` | main, vision | `openai-chat-completions` | unconfirmed | — |
| mistral | `ministral-8b-2512` | main, vision | `openai-chat-completions` | unconfirmed | — |
| mistral | `ministral-8b-latest` | main, vision | `openai-chat-completions` | unconfirmed | — |
| mistral | `mistral-large-2512` | main, vision | `openai-chat-completions` | unconfirmed | — |
| mistral | `mistral-medium-latest` | main, vision | `openai-chat-completions` | unconfirmed | — |
| mistral | `mistral-small-2603` | main, vision | `openai-chat-completions` | supported | `reasoning_effort` |
| together | `ByteDance/Seedream-5.0-lite` | image | `provider-images` | unconfirmed | — |
| together | `MiniMaxAI/MiniMax-M3` | main, vision | `openai-chat-completions` | supported | `reasoning.enabled` |
| together | `Qwen/Qwen-Image-2.0` | image | `provider-images` | unconfirmed | — |
| together | `Qwen/Qwen-Image-2.0-Pro` | image | `provider-images` | unconfirmed | — |
| together | `Qwen/Qwen-Image` | image | `provider-images` | unconfirmed | — |
| together | `Qwen/Qwen3.8-2.4T-A95B` | main | `openai-chat-completions` | unconfirmed | — |
| together | `Qwen/Qwen3.8-Flash` | main | `openai-chat-completions` | unconfirmed | — |
| together | `Qwen/Qwen3.7-Max` | main | `openai-chat-completions` | unconfirmed | — |
| together | `Qwen/Qwen3.7-Plus` | main | `openai-chat-completions` | unconfirmed | — |
| together | `Qwen/Qwen3.6-Plus` | main | `openai-chat-completions` | supported | `reasoning.enabled` |
| together | `Qwen/Qwen3.5-9B` | main, vision | `openai-chat-completions` | supported | `reasoning.enabled` |
| together | `Wan-AI/Wan2.6-image` | image | `provider-images` | unconfirmed | — |
| together | `black-forest-labs/FLUX.2-dev` | image | `provider-images` | unconfirmed | — |
| together | `black-forest-labs/FLUX.2-flex` | image | `provider-images` | unconfirmed | — |
| together | `black-forest-labs/FLUX.2-max` | image | `provider-images` | unconfirmed | — |
| together | `black-forest-labs/FLUX.2-pro` | image | `provider-images` | unconfirmed | — |
| together | `deepseek-ai/DeepSeek-V4.1-Flash` | main | `openai-chat-completions` | unconfirmed | — |
| together | `deepseek-ai/DeepSeek-V4-Pro-0813` | main | `openai-chat-completions` | supported | `reasoning.enabled` |
| together | `deepseek-ai/DeepSeek-V4-Flash-0731` | main | `openai-chat-completions` | unconfirmed | — |
| together | `google/gemini-3-pro-image` | image | `provider-images` | unconfirmed | — |
| together | `moonshotai/Kimi-K3` | main, vision | `openai-chat-completions` | supported | `reasoning.enabled` |
| together | `openai/gpt-image-2` | image | `provider-images` | unconfirmed | — |
| together | `openai/gpt-image-1.5` | image | `provider-images` | unconfirmed | — |
| together | `stabilityai/stable-diffusion-xl-base-1.0` | image | `provider-images` | unconfirmed | — |
| together | `zai-org/GLM-5.3` | main | `openai-chat-completions` | unconfirmed | — |
| together | `zai-org/GLM-5.3-Flash` | main | `openai-chat-completions` | unconfirmed | — |
| together | `zai-org/GLM-5.2` | main | `openai-chat-completions` | supported | `reasoning.enabled` |
| together | `ByteDance-Seed/Seedream-3.0` | image | `provider-images` | unconfirmed | — |
| together | `ByteDance-Seed/Seedream-4.0` | image | `provider-images` | unconfirmed | — |
| together | `Prism-ML/Ternary-Bonsai-27B` | main | `openai-chat-completions` | unconfirmed | — |
| together | `RunDiffusion/Juggernaut-pro-flux` | image | `provider-images` | unconfirmed | — |
| together | `Rundiffusion/Juggernaut-Lightning-Flux` | image | `provider-images` | unconfirmed | — |
| together | `black-forest-labs/FLUX.1-kontext-max` | image | `provider-images` | unconfirmed | — |
| together | `black-forest-labs/FLUX.1-kontext-pro` | image | `provider-images` | unconfirmed | — |
| together | `black-forest-labs/FLUX.1.1-pro` | image | `provider-images` | unconfirmed | — |
| together | `google/flash-image-2.5` | image | `provider-images` | unconfirmed | — |
| together | `google/flash-image-3.1` | image | `provider-images` | unconfirmed | — |
| together | `google/flash-image-3.1-lite` | image | `provider-images` | unconfirmed | — |
| together | `google/imagen-4.0-fast` | image | `provider-images` | unconfirmed | — |
| together | `google/imagen-4.0-preview` | image | `provider-images` | unconfirmed | — |
| together | `google/imagen-4.0-ultra` | image | `provider-images` | unconfirmed | — |
| together | `ideogram/ideogram-3.0` | image | `provider-images` | unconfirmed | — |
| together | `ideogram/ideogram-4.0` | image | `provider-images` | unconfirmed | — |
| together | `meta-llama/Llama-3.3-70B-Instruct-Turbo` | main | `openai-chat-completions` | unconfirmed | — |
| together | `meta-models/Muse-Glimmer-30B` | main | `openai-chat-completions` | unconfirmed | — |
| together | `openai/gpt-oss-120b` | main | `openai-chat-completions` | supported | `reasoning_effort` |
| together | `prunaai/p-image-ideogram` | image | `provider-images` | unconfirmed | — |
| together | `thinkingmachines/Inkling` | main | `openai-chat-completions` | unconfirmed | — |
| fireworks | `accounts/fireworks/models/deepseek-v4-flash-vision-exp` | main, vision | `openai-chat-completions` | supported | `reasoning_effort` |
| fireworks | `accounts/fireworks/models/deepseek-v4-pro-0813` | main | `openai-chat-completions` | supported | `reasoning_effort` |
| fireworks | `accounts/fireworks/models/deepseek-v4-flash-0731` | main | `openai-chat-completions` | supported | `reasoning_effort` |
| fireworks | `accounts/fireworks/models/glm-5p3` | main | `openai-chat-completions` | unconfirmed | — |
| fireworks | `accounts/fireworks/models/glm-5p3-flash` | main, vision | `openai-chat-completions` | unconfirmed | — |
| fireworks | `accounts/fireworks/models/glm-5p2` | main | `openai-chat-completions` | supported | `reasoning_effort` |
| fireworks | `accounts/fireworks/models/kimi-k3` | main, vision | `openai-chat-completions` | supported | `reasoning_effort` |
| fireworks | `accounts/fireworks/models/kimi-k2p7-code` | main, vision | `openai-chat-completions` | unconfirmed | — |
| fireworks | `accounts/fireworks/models/kimi-k2p6` | main, vision | `openai-chat-completions` | unconfirmed | — |
| fireworks | `accounts/fireworks/models/kimi-k2p5` | main, vision | `openai-chat-completions` | unconfirmed | — |
| fireworks | `accounts/fireworks/models/minimax-m3` | main | `openai-chat-completions` | supported | `reasoning_effort` |
| fireworks | `accounts/fireworks/models/qwen3p8-max` | main, vision | `openai-chat-completions` | unconfirmed | — |
| fireworks | `accounts/fireworks/models/qwen3p7-plus` | main, vision | `openai-chat-completions` | unconfirmed | — |
| fireworks | `accounts/fireworks/models/qwen3-8b` | main | `openai-chat-completions` | unconfirmed | — |
| fireworks | `accounts/fireworks/models/deepseek-v4p1-flash` | main, vision | `openai-chat-completions` | supported | `reasoning_effort` |
| fireworks | `accounts/fireworks/models/gemma-4-31b-it` | main, vision | `openai-chat-completions` | unconfirmed | — |
| fireworks | `accounts/fireworks/models/gpt-oss-120b` | main | `openai-chat-completions` | supported | `reasoning_effort` |
| fireworks | `accounts/fireworks/models/muse-glimmer-30b` | main, vision | `openai-chat-completions` | unconfirmed | — |
| fireworks | `accounts/fireworks/models/nemotron-3-ultra-nvfp4` | main | `openai-chat-completions` | unconfirmed | — |
| fireworks | `accounts/fireworks/models/nemotron-lightning-3p5-30b-a3b` | main | `openai-chat-completions` | unconfirmed | — |
| fireworks | `accounts/fireworks/models/nvidia-nemotron-3-nano-omni-30b-a3b` | main | `openai-chat-completions` | unconfirmed | — |
| fireworks | `accounts/fireworks/models/qwen3-omni-30b-a3b-instruct` | main, vision | `openai-chat-completions` | unconfirmed | — |
| fireworks | `accounts/fireworks/models/step-3p7-flash-nvfp4` | main, vision | `openai-chat-completions` | unconfirmed | — |
| fal | `alibaba/qwen-image-3/text-to-image` | image | `provider-images` | unsupported | — |
| fal | `bytedance/seedream/v5/pro/text-to-image` | image | `provider-images` | unsupported | — |
| fal | `fal-ai/bytedance/seedream/v5/lite/edit` | image | `provider-images` | unsupported | — |
| fal | `fal-ai/bytedance/seedream/v4.5/text-to-image` | image | `provider-images` | unsupported | — |
| fal | `fal-ai/bytedance/seedream/v4/text-to-image` | image | `provider-images` | unsupported | — |
| fal | `fal-ai/fast-sdxl` | image | `provider-images` | unsupported | — |
| fal | `fal-ai/flux-2` | image | `provider-images` | unsupported | — |
| fal | `fal-ai/flux-2-flex` | image | `provider-images` | unsupported | — |
| fal | `fal-ai/flux-2-pro` | image | `provider-images` | unsupported | — |
| fal | `fal-ai/flux-2/flash` | image | `provider-images` | unsupported | — |
| fal | `fal-ai/flux-2/klein/9b` | image | `provider-images` | unsupported | — |
| fal | `fal-ai/flux-2/turbo` | image | `provider-images` | unsupported | — |
| fal | `fal-ai/flux-kontext-lora` | image | `provider-images` | unsupported | — |
| fal | `fal-ai/flux-pro/kontext` | image | `provider-images` | unsupported | — |
| fal | `fal-ai/flux-pro/v1.1` | image | `provider-images` | unsupported | — |
| fal | `fal-ai/flux-pro/v1.1-ultra` | image | `provider-images` | unsupported | — |
| fal | `fal-ai/flux-1/schnell` | image | `provider-images` | unsupported | — |
| fal | `fal-ai/flux-lora` | image | `provider-images` | unsupported | — |
| fal | `fal-ai/flux/dev` | image | `provider-images` | unsupported | — |
| fal | `fal-ai/flux/schnell` | image | `provider-images` | unsupported | — |
| fal | `fal-ai/ideogram/v3` | image | `provider-images` | unsupported | — |
| fal | `fal-ai/nano-banana-2` | image | `provider-images` | supported | `thinking_level` |
| fal | `fal-ai/qwen-image` | image | `provider-images` | unsupported | — |
| fal | `fal-ai/recraft/v4/pro/text-to-image` | image | `provider-images` | unsupported | — |
| fal | `fal-ai/recraft/v3/text-to-image` | image | `provider-images` | unsupported | — |
| fal | `google/nano-banana-2-lite` | image | `provider-images` | supported | `thinking_level` |
| fal | `fal-ai/nano-banana-pro` | image | `provider-images` | unsupported | — |
| fal | `fal-ai/nano-banana` | image | `provider-images` | unsupported | — |
| fal | `openai/gpt-image-2.5/flare/text-to-image` | image | `provider-images` | unsupported | — |
| fal | `openai/gpt-image-2.5/sunburst/text-to-image` | image | `provider-images` | unsupported | — |
| fal | `openai/gpt-image-2` | image | `provider-images` | unsupported | — |
| fal | `fal-ai/gpt-image-1.5` | image | `provider-images` | unsupported | — |
| fal | `xai/grok-imagine-image/v2.0/text-to-image` | image | `provider-images` | unsupported | — |
| fal | `xai/grok-imagine-image` | image | `provider-images` | unsupported | — |
| fal | `xai/grok-imagine-image/quality/text-to-image` | image | `provider-images` | unsupported | — |
| fal | `bria/fibo-edit-1.5/edit` | image | `provider-images` | unsupported | — |
| fal | `bria/fibo-gen-1.5/text-to-image` | image | `provider-images` | unsupported | — |
| fal | `fal-ai/krea-2/turbo` | image | `provider-images` | unsupported | — |
| fal | `fal-ai/z-image/turbo` | image | `provider-images` | unsupported | — |
| fal | `imagineart/imagineart-2.0-preview/text-to-image` | image | `provider-images` | supported | `reasoning` |
| fal | `krea/v2/large/text-to-image` | image | `provider-images` | unsupported | — |
| fal | `meta/muse-image/text-to-image` | image | `provider-images` | unsupported | — |
| replicate | `alibaba/qwen-image-3` | image | `replicate-predictions` | unsupported | — |
| replicate | `alibaba/qwen-image-3-pro` | image | `replicate-predictions` | unsupported | — |
| replicate | `alibaba/wan-3` | image | `provider-images` | unsupported | — |
| replicate | `black-forest-labs/flux-2-flex` | image | `provider-images` | unsupported | — |
| replicate | `black-forest-labs/flux-2-klein-4b` | image | `provider-images` | unsupported | — |
| replicate | `black-forest-labs/flux-2-max` | image | `provider-images` | unsupported | — |
| replicate | `black-forest-labs/flux-2-pro` | image | `provider-images` | unsupported | — |
| replicate | `black-forest-labs/flux-kontext-dev` | image | `provider-images` | unsupported | — |
| replicate | `black-forest-labs/flux-kontext-max` | image | `provider-images` | unsupported | — |
| replicate | `black-forest-labs/flux-kontext-pro` | image | `provider-images` | unsupported | — |
| replicate | `bytedance/seedream-5-lite` | image | `provider-images` | unsupported | — |
| replicate | `bytedance/seedream-4.5` | image | `provider-images` | unsupported | — |
| replicate | `bytedance/seedream-4` | image | `provider-images` | unsupported | — |
| replicate | `bytedance/seedream-3` | image | `provider-images` | unsupported | — |
| replicate | `google/imagen-4` | image | `provider-images` | unsupported | — |
| replicate | `google/imagen-4-fast` | image | `provider-images` | unsupported | — |
| replicate | `google/imagen-4-ultra` | image | `provider-images` | unsupported | — |
| replicate | `google/imagen-3` | image | `provider-images` | unsupported | — |
| replicate | `google/imagen-3-fast` | image | `provider-images` | unsupported | — |
| replicate | `google/nano-banana-2` | image | `provider-images` | unsupported | — |
| replicate | `google/nano-banana-2-lite` | image | `provider-images` | unsupported | — |
| replicate | `google/nano-banana-pro` | image | `provider-images` | unsupported | — |
| replicate | `google/nano-banana` | image | `provider-images` | unsupported | — |
| replicate | `ideogram-ai/ideogram-v3-balanced` | image | `provider-images` | unsupported | — |
| replicate | `ideogram-ai/ideogram-v3-quality` | image | `provider-images` | unsupported | — |
| replicate | `ideogram-ai/ideogram-v3-turbo` | image | `provider-images` | unsupported | — |
| replicate | `ideogram-ai/ideogram-v2a` | image | `provider-images` | unsupported | — |
| replicate | `ideogram-ai/ideogram-v2a-turbo` | image | `provider-images` | unsupported | — |
| replicate | `ideogram-ai/ideogram-v2` | image | `provider-images` | unsupported | — |
| replicate | `ideogram-ai/ideogram-v2-turbo` | image | `provider-images` | unsupported | — |
| replicate | `openai/gpt-image-2.5-flare` | image | `provider-images` | unsupported | — |
| replicate | `openai/gpt-image-2.5-sunburst` | image | `provider-images` | unsupported | — |
| replicate | `openai/gpt-image-2` | image | `provider-images` | unsupported | — |
| replicate | `openai/gpt-image-1.5` | image | `provider-images` | unsupported | — |
| replicate | `prunaai/flux-kontext-fast` | image | `provider-images` | unsupported | — |
| replicate | `black-forest-labs/flux-1.1-pro` | image | `provider-images` | unsupported | — |
| replicate | `black-forest-labs/flux-1.1-pro-ultra` | image | `provider-images` | unsupported | — |
| replicate | `black-forest-labs/flux-dev` | image | `provider-images` | unsupported | — |
| replicate | `black-forest-labs/flux-dev-lora` | image | `provider-images` | unsupported | — |
| replicate | `black-forest-labs/flux-pro` | image | `provider-images` | unsupported | — |
| replicate | `black-forest-labs/flux-schnell` | image | `provider-images` | unsupported | — |
| replicate | `prunaai/flux-fast` | image | `provider-images` | unsupported | — |
| replicate | `qwen/qwen-image` | image | `provider-images` | unsupported | — |
| replicate | `qwen/qwen-image-edit` | image | `provider-images` | unsupported | — |
| replicate | `qwen/qwen-image-edit-plus` | image | `provider-images` | unsupported | — |
| replicate | `recraft-ai/recraft-v4.1` | image | `provider-images` | unsupported | — |
| replicate | `recraft-ai/recraft-v4-pro` | image | `provider-images` | unsupported | — |
| replicate | `recraft-ai/recraft-v3` | image | `provider-images` | unsupported | — |
| replicate | `stability-ai/stable-diffusion-3.5-large` | image | `provider-images` | unsupported | — |
| replicate | `stability-ai/stable-diffusion-3.5-large-turbo` | image | `provider-images` | unsupported | — |
| replicate | `stability-ai/stable-diffusion-3.5-medium` | image | `provider-images` | unsupported | — |
| replicate | `stability-ai/sdxl` | image | `provider-images` | unsupported | — |
| replicate | `stability-ai/stable-diffusion` | image | `provider-images` | unsupported | — |
| replicate | `wan-video/wan-2.7-image` | image | `provider-images` | supported | `input.thinking_mode` |
| replicate | `wan-video/wan-2.7-image-pro` | image | `provider-images` | supported | `input.thinking_mode` |
| replicate | `prunaai/wan-2.2-image` | image | `provider-images` | unsupported | — |
| replicate | `xai/grok-imagine-image` | image | `provider-images` | unsupported | — |
| replicate | `xai/grok-imagine-image-2` | image | `replicate-predictions` | unsupported | — |
| replicate | `adirik/realvisxl-v3.0-turbo` | image | `provider-images` | unsupported | — |
| replicate | `ai-forever/kandinsky-2` | image | `provider-images` | unsupported | — |
| replicate | `ai-forever/kandinsky-2.2` | image | `provider-images` | unsupported | — |
| replicate | `bria/fibo` | image | `provider-images` | unsupported | — |
| replicate | `bria/fibo-edit` | image | `provider-images` | unsupported | — |
| replicate | `bria/image-3.2` | image | `provider-images` | unsupported | — |
| replicate | `bytedance/bagel` | image | `provider-images` | supported | `input.enable_thinking` |
| replicate | `bytedance/sdxl-lightning-4step` | image | `provider-images` | unsupported | — |
| replicate | `datacte/proteus-v0.2` | image | `provider-images` | unsupported | — |
| replicate | `datacte/proteus-v0.3` | image | `provider-images` | unsupported | — |
| replicate | `fofr/latent-consistency-model` | image | `provider-images` | unsupported | — |
| replicate | `fofr/sdxl-emoji` | image | `provider-images` | unsupported | — |
| replicate | `fofr/sticker-maker` | image | `provider-images` | unsupported | — |
| replicate | `krea/krea-2-medium` | image | `replicate-predictions` | unsupported | — |
| replicate | `leonardoai/lucid-origin` | image | `provider-images` | unsupported | — |
| replicate | `lucataco/dreamshaper-xl-turbo` | image | `provider-images` | unsupported | — |
| replicate | `lucataco/omnigen2` | image | `provider-images` | unsupported | — |
| replicate | `lucataco/open-dalle-v1.1` | image | `provider-images` | unsupported | — |
| replicate | `lucataco/realistic-vision-v5.1` | image | `provider-images` | unsupported | — |
| replicate | `lucataco/ssd-1b` | image | `provider-images` | unsupported | — |
| replicate | `luma/photon` | image | `provider-images` | unsupported | — |
| replicate | `luma/photon-flash` | image | `provider-images` | unsupported | — |
| replicate | `minimax/image-01` | image | `provider-images` | unsupported | — |
| replicate | `nvidia/sana` | image | `provider-images` | unsupported | — |
| replicate | `nvidia/sana-sprint-1.6b` | image | `provider-images` | unsupported | — |
| replicate | `playgroundai/playground-v2.5-1024px-aesthetic` | image | `provider-images` | unsupported | — |
| replicate | `prunaai/hidream-l1-dev` | image | `provider-images` | unsupported | — |
| replicate | `prunaai/hidream-l1-fast` | image | `provider-images` | unsupported | — |
| replicate | `prunaai/hidream-l1-full` | image | `provider-images` | unsupported | — |
| replicate | `prunaai/p-image` | image | `provider-images` | unsupported | — |
| replicate | `prunaai/p-image-edit` | image | `provider-images` | unsupported | — |
| replicate | `prunaai/p-image-ideogram` | image | `replicate-predictions` | supported | `input.thinking` |
| replicate | `prunaai/p-image-lora` | image | `provider-images` | unsupported | — |
| replicate | `prunaai/sdxl-lightning` | image | `provider-images` | unsupported | — |
| replicate | `prunaai/z-image-turbo` | image | `provider-images` | unsupported | — |
| replicate | `sourceful/riverflow-2.0-pro` | image | `provider-images` | unsupported | — |
| replicate | `tencent/hunyuan-image-3` | image | `provider-images` | unsupported | — |
| replicate | `tstramer/material-diffusion` | image | `provider-images` | unsupported | — |
| replicate | `zsxkib/step1x-edit` | image | `provider-images` | unsupported | — |
| runware | `openai:gpt-image@2.5-flare` | image | `provider-images` | unsupported | — |
| runware | `openai:gpt-image@2.5-sunburst` | image | `provider-images` | unsupported | — |
| runware | `xai:grok-imagine@image-2.0` | image | `provider-images` | unsupported | — |
| runware | `alibaba:qwen-image@3.0` | image | `provider-images` | unsupported | — |
| runware | `alibaba:qwen-image@3.0-pro` | image | `provider-images` | unsupported | — |
| runware | `deepseek:v4@flash` | main | `runware-text` | supported | `settings.thinkingLevel` |
| runware | `prunaai:p-image@ideogram` | image | `provider-images` | supported | `settings.thinkingLevel` |
| runware | `krea:krea@2-turbo` | image | `provider-images` | unsupported | — |
| runware | `bytedance:seedream@5.0-pro` | image | `provider-images` | supported | `settings.thinking` |
| runware | `meta:muse@image` | image | `provider-images` | supported | `settings.thinkingLevel` |
| runware | `google:nano-banana@2-lite` | image | `provider-images` | supported | `settings.thinking` |
| runware | `krea:krea@2-raw` | image | `provider-images` | unsupported | — |
| runware | `rundiffusion:300@100` | image | `provider-images` | unsupported | — |
| runware | `anthropic:claude@fable-5` | main, vision | `runware-text` | supported | `settings.thinkingLevel` |
| runware | `sourceful:riverflow-2.5@fast` | image | `provider-images` | supported | `settings.thinkingLevel` |
| runware | `sourceful:riverflow-2.5@pro` | image | `provider-images` | supported | `settings.thinkingLevel` |
| runware | `ideogram:4@0` | image | `provider-images` | unsupported | — |
| runware | `ideogram:4@q` | image | `provider-images` | unsupported | — |
| runware | `ideogram:4@remix` | image | `provider-images` | unsupported | — |
| runware | `krea:krea@2-medium-turbo` | image | `provider-images` | unsupported | — |
| runware | `minimax:m3@0` | main, vision | `runware-text` | unsupported | — |
| runware | `anthropic:claude@opus-4.8` | main, vision | `runware-text` | supported | `settings.thinkingLevel` |
| runware | `krea:krea@2-large` | image | `provider-images` | unsupported | — |
| runware | `krea:krea@2-medium` | image | `provider-images` | unsupported | — |
| runware | `google:gemini@3.5-flash` | main, vision | `runware-text` | supported | `settings.thinkingLevel` |
| runware | `recraft:v4.1-pro@0` | image | `provider-images` | unsupported | — |
| runware | `recraft:v4.1-utility-pro@0` | image | `provider-images` | unsupported | — |
| runware | `recraft:v4.1-utility@0` | image | `provider-images` | unsupported | — |
| runware | `recraft:v4.1@0` | image | `provider-images` | unsupported | — |
| runware | `xai:grok-imagine@image-quality` | image | `provider-images` | unsupported | — |
| runware | `luma:uni@1` | image | `provider-images` | unsupported | — |
| runware | `luma:uni@1-max` | image | `provider-images` | unsupported | — |
| runware | `xai:grok@4.3` | main, vision | `runware-text` | supported | `settings.thinkingLevel` |
| runware | `rundiffusion:200@100` | image | `provider-images` | unsupported | — |
| runware | `openai:gpt@5.5` | main, vision | `runware-text` | supported | `settings.thinkingLevel` |
| runware | `openai:gpt-image@2` | image | `provider-images` | unsupported | — |
| runware | `anthropic:claude@opus-4.7` | main, vision | `runware-text` | supported | `settings.thinkingLevel` |
| runware | `baidu:ernie-image@0` | image | `provider-images` | unsupported | — |
| runware | `baidu:ernie-image@turbo` | image | `provider-images` | unsupported | — |
| runware | `imagineart:2.0@0` | image | `provider-images` | supported | `settings.thinkingLevel` |
| runware | `zai:glm@5.1` | main | `runware-text` | supported | `settings.thinkingLevel` |
| runware | `google:gemma@4-31b` | main, vision | `runware-text` | supported | `settings.thinkingLevel` |
| runware | `alibaba:wan@2.7-image` | image | `provider-images` | supported | `settings.thinking` |
| runware | `alibaba:wan@2.7-image-pro` | image | `provider-images` | supported | `settings.thinking` |
| runware | `runware:400@6` | image | `provider-images` | unsupported | — |
| runware | `minimax:m2.7@0` | main | `runware-text` | unsupported | — |
| runware | `minimax:m2.7@highspeed` | main | `runware-text` | unsupported | — |
| runware | `openai:gpt@5.4-mini` | main, vision | `runware-text` | supported | `settings.thinkingLevel` |
| runware | `openai:gpt@5.4-nano` | main, vision | `runware-text` | supported | `settings.thinkingLevel` |
| runware | `openai:gpt@5.4` | main, vision | `runware-text` | supported | `settings.thinkingLevel` |
| runware | `openai:gpt@5.4-pro` | main, vision | `runware-text` | supported | `settings.thinkingLevel` |
| runware | `google:gemini@3.1-flash-lite` | main, vision | `runware-text` | supported | `settings.thinkingLevel` |
| runware | `google:4@3` | image | `provider-images` | supported | `settings.thinking` |
| runware | `bytedance:seedream@5.0-lite` | image | `provider-images` | unsupported | — |
| runware | `google:gemini@3.1-pro` | main, vision | `runware-text` | supported | `settings.thinkingLevel` |
| runware | `anthropic:claude@sonnet-4.6` | main, vision | `runware-text` | supported | `settings.thinkingLevel` |
| runware | `recraft:v4-pro@0` | image | `provider-images` | unsupported | — |
| runware | `recraft:v4@0` | image | `provider-images` | unsupported | — |
| runware | `alibaba:qwen-image@2.0` | image | `provider-images` | unsupported | — |
| runware | `alibaba:qwen-image@2.0-pro` | image | `provider-images` | unsupported | — |
| runware | `klingai:kling-image@3` | image | `provider-images` | unsupported | — |
| runware | `klingai:kling-image@o3` | image | `provider-images` | unsupported | — |
| runware | `sourceful:riverflow-2.0@fast` | image | `provider-images` | unsupported | — |
| runware | `sourceful:riverflow-2.0@pro` | image | `provider-images` | unsupported | — |
| runware | `xai:grok-imagine@image` | image | `provider-images` | unsupported | — |
| runware | `runware:z-image@0` | image | `provider-images` | unsupported | — |
| runware | `runware:400@2` | image | `provider-images` | unsupported | — |
| runware | `bria:21@1` | image | `provider-images` | unsupported | — |
| runware | `imagineart:1.5-pro@0` | image | `provider-images` | unsupported | — |
| runware | `runware:400@3` | image | `provider-images` | unsupported | — |
| runware | `runware:400@4` | image | `provider-images` | unsupported | — |
| runware | `runware:400@5` | image | `provider-images` | unsupported | — |
| runware | `bria:20@3` | image | `provider-images` | unsupported | — |
| runware | `runware:twinflow-z-image-turbo@0` | image | `provider-images` | unsupported | — |
| runware | `alibaba:qwen-image@2512` | image | `provider-images` | unsupported | — |
| runware | `google:gemini@3-flash` | main, vision | `runware-text` | supported | `settings.thinkingLevel` |
| runware | `alibaba:wan@2.6-image` | image | `provider-images` | unsupported | — |
| runware | `bfl:7@1` | image | `provider-images` | unsupported | — |
| runware | `openai:4@1` | image | `provider-images` | unsupported | — |
| runware | `bytedance:seedream@4.5` | image | `provider-images` | unsupported | — |
| runware | `klingai:kling-image@o1` | image | `provider-images` | unsupported | — |
| runware | `prunaai:1@1` | image | `provider-images` | unsupported | — |
| runware | `bfl:5@1` | image | `provider-images` | unsupported | — |
| runware | `runware:kandinsky-5.0-image-lite@1` | image | `provider-images` | unsupported | — |
| runware | `runware:z-image@turbo` | image | `provider-images` | unsupported | — |
| runware | `alibaba:qwen-image-edit@2511` | image | `provider-images` | unsupported | — |
| runware | `bfl:6@1` | image | `provider-images` | unsupported | — |
| runware | `runware:400@1` | image | `provider-images` | unsupported | — |
| runware | `google:4@2` | image | `provider-images` | unsupported | — |
| runware | `imagineart:1@5` | image | `provider-images` | unsupported | — |
| runware | `prunaai:2@1` | image | `provider-images` | unsupported | — |
| runware | `bria:20@1` | image | `provider-images` | unsupported | — |
| runware | `anthropic:claude@haiku-4.5` | main, vision | `runware-text` | supported | `settings.thinkingLevel` |
| runware | `runware:201@10` | image | `provider-images` | unsupported | — |
| runware | `runware:108@22` | image | `provider-images` | unsupported | — |
| runware | `bria:11@1` | image | `provider-images` | unsupported | — |
| runware | `runware:111@1` | image | `provider-images` | unsupported | — |
| runware | `bytedance:5@0` | image | `provider-images` | unsupported | — |
| runware | `google:4@1` | image | `provider-images` | unsupported | — |
| runware | `runware:108@20` | image | `provider-images` | unsupported | — |
| runware | `runway:4@2` | image | `provider-images` | unsupported | — |
| runware | `openai:gpt@5-mini` | main, vision | `runware-text` | supported | `settings.thinkingLevel` |
| runware | `openai:gpt@5-nano` | main, vision | `runware-text` | supported | `settings.thinkingLevel` |
| runware | `runware:108@1` | image | `provider-images` | unsupported | — |
| runware | `runware:107@1` | image | `provider-images` | unsupported | — |
| runware | `bfl:3@1` | image | `provider-images` | unsupported | — |
| runware | `bfl:4@1` | image | `provider-images` | unsupported | — |
| runware | `runware:106@1` | image | `provider-images` | unsupported | — |
| runware | `runware:5@1` | image | `provider-images` | unsupported | — |
| runware | `bria:10@1` | image | `provider-images` | unsupported | — |
| runware | `runway:4@1` | image | `provider-images` | unsupported | — |
| runware | `ideogram:4@3` | image | `provider-images` | unsupported | — |
| runware | `ideogram:4@2` | image | `provider-images` | unsupported | — |
| runware | `openai:1@2` | image | `provider-images` | unsupported | — |
| runware | `runware:97@2` | image | `provider-images` | unsupported | — |
| runware | `runware:97@1` | image | `provider-images` | unsupported | — |
| runware | `runware:97@3` | image | `provider-images` | unsupported | — |
| runware | `vidu:q1@image` | image | `provider-images` | unsupported | — |
| runware | `ideogram:4@1` | image | `provider-images` | unsupported | — |
| runware | `ideogram:4@5` | image | `provider-images` | unsupported | — |
| runware | `openai:1@1` | image | `provider-images` | unsupported | — |
| runware | `rundiffusion:110@101` | image | `provider-images` | unsupported | — |
| runware | `rundiffusion:120@100` | image | `provider-images` | unsupported | — |
| runware | `rundiffusion:130@100` | image | `provider-images` | unsupported | — |
| runware | `ideogram:2@1` | image | `provider-images` | unsupported | — |
| runware | `ideogram:2@2` | image | `provider-images` | unsupported | — |
| runware | `runware:102@1` | image | `provider-images` | unsupported | — |
| runware | `bfl:2@2` | image | `provider-images` | unsupported | — |
| runware | `bfl:1@2` | image | `provider-images` | unsupported | — |
| runware | `ideogram:3@2` | image | `provider-images` | unsupported | — |
| runware | `bfl:2@1` | image | `provider-images` | unsupported | — |
| runware | `ideogram:3@1` | image | `provider-images` | unsupported | — |
| runware | `runware:100@1` | image | `provider-images` | unsupported | — |
| runware | `runware:101@1` | image | `provider-images` | unsupported | — |
| runware | `runware:150@2` | vision | `runware-text` | unsupported | — |
| runware | `runware:152@1` | vision | `runware-text` | unsupported | — |
| runware | `runware:152@2` | vision | `runware-text` | unsupported | — |
| runware | `civitai:101055@128078` | image | `provider-images` | unsupported | — |
| recraft | `recraftv4_1` | image | `provider-images` | unsupported | — |
| recraft | `recraftv4_1_pro` | image | `provider-images` | unsupported | — |
| recraft | `recraftv4_1_pro_vector` | image | `provider-images` | unsupported | — |
| recraft | `recraftv4_1_utility` | image | `provider-images` | unsupported | — |
| recraft | `recraftv4_1_utility_pro` | image | `provider-images` | unsupported | — |
| recraft | `recraftv4_1_utility_pro_vector` | image | `provider-images` | unsupported | — |
| recraft | `recraftv4_1_utility_vector` | image | `provider-images` | unsupported | — |
| recraft | `recraftv4_1_vector` | image | `provider-images` | unsupported | — |
| recraft | `recraftv4` | image | `provider-images` | unsupported | — |
| recraft | `recraftv4_pro` | image | `provider-images` | unsupported | — |
| recraft | `recraftv4_pro_vector` | image | `provider-images` | unsupported | — |
| recraft | `recraftv4_vector` | image | `provider-images` | unsupported | — |
| recraft | `recraftv3` | image | `provider-images` | unsupported | — |
| recraft | `recraftv3_vector` | image | `provider-images` | unsupported | — |
| recraft | `recraftv2` | image | `provider-images` | unsupported | — |
| recraft | `recraftv2_vector` | image | `provider-images` | unsupported | — |
| bfl | `flux-2-flex` | image | `provider-images` | unsupported | — |
| bfl | `flux-2-klein-4b` | image | `provider-images` | unsupported | — |
| bfl | `flux-2-klein-9b` | image | `provider-images` | unsupported | — |
| bfl | `flux-2-klein-9b-preview` | image | `provider-images` | unsupported | — |
| bfl | `flux-2-max` | image | `provider-images` | unsupported | — |
| bfl | `flux-2-pro` | image | `provider-images` | unsupported | — |
| bfl | `flux-2-pro-preview` | image | `provider-images` | unsupported | — |
| bfl | `flux-kontext-max` | image | `provider-images` | unsupported | — |
| bfl | `flux-kontext-pro` | image | `provider-images` | unsupported | — |
| bfl | `flux-dev` | image | `provider-images` | unsupported | — |
| bfl | `flux-pro-1.1` | image | `provider-images` | unsupported | — |
| bfl | `flux-pro-1.1-ultra` | image | `provider-images` | unsupported | — |
| stability | `sd3.5-flash` | image | `provider-images` | unconfirmed | — |
| stability | `sd3.5-large` | image | `provider-images` | unconfirmed | — |
| stability | `sd3.5-large-turbo` | image | `provider-images` | unconfirmed | — |
| stability | `sd3.5-medium` | image | `provider-images` | unconfirmed | — |
| stability | `stable-image-core` | image | `provider-images` | unconfirmed | — |
| stability | `stable-image-ultra` | image | `provider-images` | unconfirmed | — |
| ideogram | `ideogram-v4` | image | `provider-images` | unsupported | — |
| ideogram | `ideogram-v4-transparent` | image | `provider-images` | unsupported | — |
| ideogram | `ideogram-v3` | image | `provider-images` | unsupported | — |
| ideogram | `ideogram-v3-transparent` | image | `provider-images` | unsupported | — |
| ideogram | `V_2A` | image | `provider-images` | unsupported | — |
| ideogram | `V_2A_TURBO` | image | `provider-images` | unsupported | — |
| ideogram | `V_2` | image | `provider-images` | unsupported | — |
| ideogram | `V_2_TURBO` | image | `provider-images` | unsupported | — |
| ideogram | `V_1` | image | `provider-images` | unsupported | — |
| ideogram | `V_1_TURBO` | image | `provider-images` | unsupported | — |
| ideogram | `AUTO` | image | `provider-images` | unsupported | — |
| ideogram | `ideogram-edit` | image | `provider-images` | unsupported | — |
| ideogram | `p-image-ideogram` | image | `provider-images` | unsupported | — |

## 本地校验

已读取静态真实目录逐 role/protocol 比对；515 型号 / 641 静态身份全部覆盖。展开全 profiles 后无重复身份，因此不会因 find 顺序遮蔽另一规则。枚举默认值、整数特殊值、思考字段清理集合与 OpenRouter vision modalities 均通过结构校验。此校验不调用模型，也不证明账号权限、请求成功或收费结果。
