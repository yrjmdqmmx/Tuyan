# GPT-6 Sol / Luna 与 Claude Opus 5.5 核查

核查日：2026-09-23。下述未部署状态为实现阶段记录；后续用户已授权并入 Tuyan v3.8.0 发布，实际进度见[本次发布记录](../../releases/2026-09-23-tuyan-v3.8.0-model-update.md)。基线 `54c90ad`，目录 `2026-09-23.v25`。本轮仅本地实现与模拟验证，未部署、未充值、未调用付费推理、未重跑历史任务。账号权限和账单均未验证。

## 官方结论

三个候选名称均准确。OpenAI 的 [发布公告](https://community.openai.com/t/announcing-gpt-6-sol-and-gpt-6-luna-in-the-api-codex-and-chatgpt/1399925) 和 [API 更新日志](https://developers.openai.com/api/docs/changelog) 确认 Sol、Luna 于 **2026-09-22** 开放 Responses / Chat Completions API。Anthropic 的 [公告](https://www.anthropic.com/claude-opus-5-5)、[型号页](https://platform.claude.com/docs/en/models/opus-5-5/overview) 确认 Opus 5.5 同日发布且 Claude API 已开放。这是 API 文档的结论，不是从 ChatGPT、Codex、Claude / Claude Code 选择器推断。

| 名称 / 研发方 | 官方准确调用 ID | 版本边界 | 输入 → 输出 | 上下文 / 最大输出 | 图研接入 |
|---|---|---|---|---|---|
| GPT-6 Sol / OpenAI | `gpt-6-sol` | 官方 current snapshot 就是此 ID；无已确认的日期后缀或独立 `-pro` 直连 ID | 文本、图片 → 文本 | 1,050,000 / 128,000 tokens；最大输入 922,000 | 主模型、参考图识别；Responses |
| GPT-6 Luna / OpenAI | `gpt-6-luna` | 同上 | 同上 | 同上 | 同上 |
| Claude Opus 5.5 / Anthropic | `claude-opus-5-5` | 固定快照；4.6 代起无日期 ID 不是滚动别名 | 文本、图片 → 文本 | 1,000,000 / 128,000 tokens | 主模型、参考图识别；Messages |

依据：[Sol](https://developers.openai.com/api/docs/models/gpt-6-sol)、[Luna](https://developers.openai.com/api/docs/models/gpt-6-luna)、[Anthropic 版本规则](https://platform.claude.com/docs/en/about-claude/models/model-ids-and-versions)。未虚构日期快照或把 OpenRouter canonical slug 当原厂调用 ID。Opus 5.5 目录标注 Active，最早退役不早于 2027-09-22；没有更改旧型号生命周期。

三者均不开放图研生图／图片编辑角色。Sol/Luna 能调用 Responses 的 image-generation 工具，与自身直接输出图片是两种能力；本轮沿用独立图像渠道。它们没有图片输出尺寸、画面比例或图片质量参数。

## 思考参数与限制

| 精确渠道 / 型号 / 图研协议 | 可选设置 | 接口默认 | 明确不开放 |
|---|---|---|---|
| OpenAI / `gpt-6-sol`, `gpt-6-luna` / Responses | `reasoning.effort`: none, low, medium, high, xhigh, max；`reasoning.mode`: standard, pro | medium；standard | minimal、ultra、手动思考 token 预算；不把最大输出长度当思考预算 |
| Anthropic / `claude-opus-5-5` / Messages | `output_config.effort`: low, medium, high, xhigh, max | medium；自适应思考始终开启 | disabled、enabled + budget_tokens、none；不显示冗余开关 |
| OpenRouter / `openai/gpt-6-sol`, `openai/gpt-6-luna` 及各自 `-pro` / Chat | `reasoning.effort`: max, xhigh, high, medium, low, none | 目录标注 medium | 无逐型号 `supports_max_tokens`，不提供预算；不透传原厂 `reasoning.mode` |
| OpenRouter / `anthropic/claude-opus-5.5` / Chat | `reasoning.effort`: max, xhigh, high, medium, low | **渠道目录标注 high** | mandatory=true：不提供关闭或 none；不套用直连 medium |

界面“默认”永远表示省略字段，不预选上表的接口默认。主模型与视觉角色各自保存，图片角色仍用自己模型的设置。切换渠道、型号或协议重新校验；回到同一身份可以恢复其原偏好。请求快照在任务创建时冻结，恢复不重新按新目录编译。

依据：[OpenAI reasoning](https://developers.openai.com/api/docs/guides/reasoning)、[GPT-6 参数兼容](https://developers.openai.com/api/docs/guides/latest-model)、[Claude effort](https://platform.claude.com/docs/en/build-with-claude/effort)、[Opus 5.5 变更](https://platform.claude.com/docs/en/models/opus-5-5/whats-new-opus-5-5)、[OpenRouter reasoning](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens)。

- OpenAI 非 none 强度不接受自定义采样/logprobs。图研 Responses 构造器原本就不发送采样字段；新型号继续省略。Chat 的带思考工具调用有限制，图研使用 Responses，不切到 Chat。Pro 是更多模型计算，可能产生更多 token，未自动开启。
- Opus 5.5 不支持强制 `tool_choice=any/tool`；图研本流程不发送工具、不回放 thinking block。保留 Messages 原有 `max_tokens=16384`，其中包含思考与回答；截断作为失败保存用量，不自动加额度重发。始终按 block.type 提取可见文本。
- 新账号（2026-08-31 起）的 preserved-thinking 前缀绑定约束不能忽略；本轮不新增有状态工具循环。任务恢复复用已完成文本结果，不重新提交原 thinking block。Anthropic 的 task budget / per-message effort 是独立 beta 功能，未当作本界面的手动思考预算。

## 价格、图片与准入

下表为普通公开 API 标准价格，单位 USD / 百万 tokens；**不是实际已付费用，也不适用于订阅额度换算**。

| 直连型号 | 输入 | 缓存读取 | 缓存写入 | 输出 |
|---|---:|---:|---:|---:|
| Sol | 2 | 0.20 | 2.50 | 10 |
| Luna | 0.10 | 0.01 | 0.125 | 0.50 |
| Opus 5.5 | 4 | 0.20 | 5（5 分钟）/ 8（1 小时） | 20 |

OpenAI 超过 272K 输入时整次请求输入/缓存费率 ×2、输出 ×1.5；Batch/Flex 半价、Fast 两倍、可用的地域处理加 10%。Sol/Luna 的 EU 数据驻留仅 Standard。图研本轮不增加地域端点或服务档位、不切换 Key。[价格](https://developers.openai.com/api/docs/pricing) · [数据与地域](https://developers.openai.com/api/docs/guides/your-data)。

Claude Batch 输入/输出半价，Fast 是独立研究预览；本轮使用普通 Messages。公共 API Key、Claude 订阅、云平台账号权益相互独立；AWS、Google Cloud、Foundry 的 ID、端点和授权不能通过改名复用。[Claude 价格与平台](https://platform.claude.com/docs/en/models/opus-5-5/overview) · [支持地区](https://platform.claude.com/docs/en/api/supported-regions)。

OpenRouter 的公开报价独立保存在本轮目录快照和合约中；GPT 的 Pro 路由以相同 token 单价计价，但更高 token 用量仍会增加费用。地域/上游筛选、余额、BYOK 以及账号许可尚未实测。目录中同名产品跨平台出现不意味着 Key 通用。

- OpenAI 通用图片文档：PNG/JPEG/WebP/非动画 GIF，单次总 payload 512 MB、最多 1,500 张。Sol/Luna 专属 patch/detail 细则未取得明确逐型号表，不照搬 Astra 的倍率。图研继续保守采用原上传管线及最多 8 张的平台额度、整包 50 MB、单图 16 MB、合计 48 MB；SVG 先走现有转换。[图片文档](https://developers.openai.com/api/docs/guides/images-vision)
- Claude：PNG/JPEG/GIF/WebP；此上下文档位最多 600 张，单图 Base64 后 10 MB、8,000×8,000，整包 32 MB；超过 20 张有更严格尺寸。4.7+ 内部高分辨率档为长边 2,576、最多 4,784 视觉 tokens。图研保留最多 8 张、单图原始 7 MB、合计 21 MB、请求整包 32 MB 的保守管线。[视觉文档](https://platform.claude.com/docs/en/build-with-claude/vision)
- OpenRouter 图片输入和参数以其渠道元数据为准；本轮只确认 image 输入，不把直连数量/大小上限当渠道保证。现有保守上传限制继续有效。
- 三个型号公开 API 的存在已确认；账号所在地区、付费层级、组织校验、单模型权限、实时速率限制均未用真实 Key 验证。OpenAI 两个型号的 Free 层不支持，公开 Tier 1 表均为 500 RPM / 500,000 TPM；实际以组织限额为准。[API 支持地区](https://help.openai.com/en/articles/5347006-openai-api-supported-countries-and-territories) 中未列出的地区不能据此声称可用，数据驻留选项也不等于接入地区许可。ChatGPT/Codex 的 Max/Ultra 界面含义不推导为 API 参数。

## 逐渠道结论

“模拟通过”只表示本地请求契约和恢复测试通过。下列已接入项真实调用均未验证；OpenRouter 采用既有动态目录，不复制为静态条目。

| API 渠道运营方 | 准确调用 ID | 角色 | 官方发布 / 渠道上架 / 图研适配 / 模拟 / 真实 |
|---|---|---|---|
| OpenAI | `gpt-6-sol`、`gpt-6-luna` | 主模型、识图 | 是 / 是 / 是 / 通过 / 未验证 |
| Anthropic | `claude-opus-5-5` | 主模型、识图 | 是 / 是 / 是 / 通过 / 未验证 |
| OpenRouter | `openai/gpt-6-sol`、`openai/gpt-6-luna` | 主模型、识图 | 是 / 是 / 是 / 通过 / 未验证 |
| OpenRouter | `openai/gpt-6-sol-pro`、`openai/gpt-6-luna-pro` | 主模型、识图 | 基础型号是 / 渠道 Pro 路由是 / 是 / 通过 / 未验证 |
| OpenRouter | `anthropic/claude-opus-5.5` | 主模型、识图 | 是 / 是 / 是 / 通过 / 未验证 |
| OpenRouter | 上述 5 个 ID 各自的 `:batch` | 不开放同步角色 | 基础型号是 / 是 / **不适配 Batch** / 隐藏规则验证 / 未验证 |
| 观猹 TokenDance | 未确认，不填写猜测 ID | 未开放 | 基础型号是 / 101 项公开目录未见 / 否 / 不适用 / 未验证 |
| 腾讯 TokenHub | 未确认 | 未开放 | 基础型号是 / 官方语言目录未取得上架证据 / 否 / 不适用 / 未验证 |
| 硅基流动 | 未确认 | 未开放 | 基础型号是 / 官方模型页未取得上架证据 / 否 / 不适用 / 未验证 |
| 阿里云百炼 | 未确认 | 未开放 | 基础型号是 / 官方模型列表未取得上架证据 / 否 / 不适用 / 未验证 |
| 火山方舟 | 未确认 | 未开放 | 基础型号是 / 官方模型目录未取得上架证据 / 否 / 不适用 / 未验证 |
| 百度千帆 | 未确认 | 未开放 | 基础型号是 / 官方模型列表未取得上架证据 / 否 / 不适用 / 未验证 |
| 讯飞星火 / MaaS | 未确认 | 未开放 | 基础型号是 / 公开基础模型列表未取得上架证据 / 否 / 不适用 / 未验证 |
| Together AI | 未确认 | 未开放 | 基础型号是 / 官方 serverless 列表未取得上架证据 / 否 / 不适用 / 未验证 |
| Fireworks AI | 未确认 | 未开放 | 基础型号是 / 官方模型页未取得上架证据 / 否 / 不适用 / 未验证 |
| fal | 未确认 | 未开放 | 基础型号是 / 文档索引及检索未取得逐型号端点与 schema / 否 / 不适用 / 未验证 |
| Replicate | 未确认 | 未开放 | 基础型号是 / 官方语言集合及检索未取得逐型号 schema / 否 / 不适用 / 未验证 |
| Runware | 未确认 | 未开放 | 基础型号是 / 官方模型目录未取得 AIR ID / 否 / 不适用 / 未验证 |

未取得证据不是“未发布”或“已退役”的断言。其余现有原厂直连不自动代理这三个候选厂商；未把原厂 ID 加进它们的目录。自定义 API 由用户指定端点，不能给所有自定义地址套统一能力或思考配置。

公开目录来源、读取状态、SHA-256、OpenRouter 精确元数据见 `config/channel-audit/2026-09-23/`；没有保存密钥或把目录可见性记作账号调用权限。OpenRouter 的 `canonical_slug`（如 `anthropic/claude-opus-5.5-20260921`）只用于渠道版本追溯，不用其中日期改写官方 9 月 22 日发布日期。

## 实现与维护

- 单一目录来源：`config/model-catalog-updates.json`、版本审计、展示规则；同步生成 Web/Core/小程序目录。新增 3 项后为 1,032 个静态型号，既有 1,029 项身份、默认值、可选状态及能力不变。
- 精确思考来源：`config/thinking-audit/global.json`；复用同一验证器、请求快照、Web 内联控件。累计 CSV 仍由 `sync-thinking.mjs` 写入 `docs/thinking/2026-09-22/support.csv`，每行自带实际核查日期，不表示新项在 9 月 22 日已适配。
- `frontier-refresh-contracts.json` 保存 8 个同步路由的独立价格来源和用量记录开关。保留 input/output/reasoning usage、请求 ID、实际返回型号、公开价；只记录 OpenRouter 返回的 cost 为 reportedCost，不伪造估算或账单。
- 这 8 个新路由即使没有思考配置也采用已有加密恢复与成功步骤复用。旧型号未设置时行为不变；未知结果先拒绝恢复，不误导用户连接 TokenDance。历史调用描述符与默认模型不迁移。
- 小程序共享目录已同步，已有任务配置/快照透传不变；原生思考编辑 UI、真机和微信发布仍欠缺。无新环境变量，契约仍为 v1。
- 追加时必须先记录本渠道证据，再更新合约与精确 profile，执行生成器、契约/恢复测试和桌面/移动验收。不要用字符串相似度替代逐型号支持。

逐项可导出的接入对照表见 [channel-matrix.csv](channel-matrix.csv)（8 个同步路由、5 个 Batch 路由、12 个待核实渠道）。本地验收详情见 [validation.md](validation.md)。
