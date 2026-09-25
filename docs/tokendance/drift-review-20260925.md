# 2026-09-25 TokenDance 漂移复核

## 故障与范围

每日 `Model registry drift report` 的 [#35](https://github.com/yrjmdqmmx/Tuyan/actions/runs/35833667542)、[#36](https://github.com/yrjmdqmmx/Tuyan/actions/runs/35970727496)、[#37](https://github.com/yrjmdqmmx/Tuyan/actions/runs/36110103646) 均在 `0b60f85c8387ddc41b05b55c3952c36f685f42fa` 运行。TokenDance 脚本对任意差异退出 2，导致已知缺失、促销文案、未使用协议等每天重复显示为工作流失败。三次 OpenRouter job 均成功。

本次只修改 CI 监控分级、可读报告与缺失复核记录。`config/tokendance/catalog.json`、生成的客户端目录、适配器、默认型号与历史身份均不改；不会自动接入新模型或部署业务服务。此项不改变跨端 API 契约。

## 只读证据与决定

2026-09-25 重新请求 [TokenDance 公开目录](https://tokendance.space/gateway/v1/models)，使用现有公开 `X-App-URL`，无登录凭据、模型 Key 或推理请求。105 条目录记录，相对 95 条审核记录：新增 13、缺失 3、协议集合变化 3、元数据变化 5。快照哈希及完整分类见 [结构化复核](drift-review-20260925.json)。目录可见不证明账号权益或真实调用成功。

| 项目 | 核对结果 | 监控处理 |
| --- | --- | --- |
| `deepseek-v4-flash`、`deepseek-v4-pro` | `openai:responses` 不再列出；`openai:chat-completions`、`anthropic:messages` 仍在。图研实际所选协议是 Chat。 | 保留协议差异供审阅，未丢失当前调用协议。 |
| `kling-3.0` | 新增 `kling:motion-control`；既有两个视频协议仍在。该型号没有图研可用角色。 | 提示，不接入或改变能力。 |
| `deepseek-chat-v3-0324`、`deepseek-v4-flash-vision-exp` | 实时目录缺失；已有运行时逐型号禁用保护，前序 [目录隔离记录](catalog-isolation-20260919.md) 记载其异常/缺失。 | 精确登记为已复核缺失，持续报告；仍由实时目录保护阻止调用。没有据此认定 TokenDance 官方退役或替换 ID。 |
| `deepseek-ocr-2` | 实时目录缺失；审核目录的 roles 为空，原本就未接入。 | 在“未接入型号缺失”中提示。 |
| `deepseek-v4-pro-0813` | 名称冒号的全角/半角变化。 | 元数据审阅。 |
| `deepseek-v4.1-flash`、`glm-5.3-flash`、`kimi-k3`、`minimax-h3` | 促销描述变化；该次上下文数值没有降低。 | 元数据审阅，不据描述新增模态能力。 |
| 13 个新增条目 | 包含 MiMo、CogEvol、搜索、语音、OCR、rerank 等；目录协议不足以确认所有图研角色。 | 完整列入待审核清单，不自动加入已审核共享目录。 |

三个缺失型号的详情 URL 返回网页壳，未提供足以确认当前服务或正式下线的内容；缺失结论仅限本渠道公开目录。

## 持续检查规则

- 正常目录或只有待审核差异：退出 0；差异仍生成 warning、Job Summary 与保留 30 天的 JSON artifact。
- 新出现的已接入型号缺失、实际所选协议丢失、已接入型号上下文容量减少/不再声明：退出 2。已知缺失例外不能覆盖协议/容量回归。
- 空目录、非法/重复 ID、协议类型异常、HTTP/网络/JSON 错误或无效复核配置：退出 1，不声称检查成功。
- 缺失复核绑定精确 ID、角色、所选协议、日期、来源与理由；修改角色/协议必须重新审核。恢复的型号独立列出，运行时照常刷新并校验。
- `--strict` 用于需要所有差异都失败的显式审核；`--file` 用于离线复现。

针对性测试覆盖当前事故、协议增减、未接入型号、精确缺失例外、恢复时协议/容量回归、新出现的缺失、空/非法目录、HTTP/JSON 失败、CLI 退出码、摘要与日志脱敏。原有 Core 目录隔离测试继续验证调用前拒绝缺失/不兼容型号，正常型号不受单条故障影响。
