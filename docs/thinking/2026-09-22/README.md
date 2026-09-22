# 三角色思考参数与更新日志：2026-09-22 本地交付

状态：开发完成、本地模拟验证；未发布。未调用付费推理、未重跑历史任务、未部署、未上传微信。工作树 `model-catalog-channels-20260921`，实施基线 `dc038f4`；Desktop 旧 checkout 保留。

## 核查范围与逐型号支持表

现有 29 个静态渠道、1,029 型号、1,327 个角色/协议身份全部纳入审计：268 型号有已核实可调参数，42 固定思考行为，323 当前接口无可调字段，396 证据不足。角色重叠；这些数字不是实际调用或账号准入验证。另独立审计 OpenRouter 444 条聊天目录与 52 条图片目录；223 个聊天型号开放已核实控制，图片目录不继承同名聊天型号参数。`custom` 必须逐自有端点取证，暂不开放猜测的参数。

- [逐型号 / 角色 / 协议 CSV](support.csv)：准确 API ID、字段、允许值/预算、默认值、操作限制、冲突、说明和官方来源。
- [国内逐型号结论](domestic.md) / [国内原始结构化证据](../../../config/thinking-audit/domestic.json)。
- [国外及聚合渠道逐型号结论](global.md) / [国外原始结构化证据](../../../config/thinking-audit/global.json)。

下表数字是该角色已适配可调思考的型号数，**0 不表示渠道不支持该模型角色**。字段仅适用于明细中指定的准确型号；同渠道不同型号也不得通用。

| 渠道 | 主模型 / 规划 | 视觉 | 图片 | 已核实字段族（准确范围见明细） |
|---|---:|---:|---:|---|
| 观猹 TokenDance (tokendance) | 0 | 0 | 0 | 暂无已核实可调字段 |
| 硅基流动 (siliconflow) | 2 | 0 | 0 | `reasoning_effort`、`enable_thinking`、`thinking_budget` |
| 腾讯 TokenHub (tokenhub) | 23 | 6 | 0 | `thinking.type`、`reasoning_effort` |
| 深度求索 (deepseek) | 2 | 1 | 0 | `reasoning_effort` |
| Kimi (kimi) | 2 | 2 | 0 | `reasoning_effort`、`thinking.type` |
| 智谱 (zhipu) | 12 | 4 | 0 | `reasoning_effort`、`thinking.type` |
| 阿里云百炼 (bailian) | 74 | 32 | 2 | `enable_thinking`、`reasoning_effort`、`thinking_budget`、`thinking.type`、`parameters.thinking_mode` |
| 火山方舟 (ark) | 16 | 12 | 0 | `reasoning_effort`、`thinking.type` |
| 稀宇科技 (minimax) | 1 | 1 | 0 | `thinking.type` |
| 小米 MiMo (xiaomi) | 4 | 3 | 0 | `thinking.type` |
| 商汤 SenseNova (sensenova) | 5 | 2 | 0 | `reasoning_effort` |
| 阶跃星辰 (stepfun) | 3 | 2 | 0 | `reasoning_effort` |
| 百度千帆 (qianfan) | 7 | 1 | 0 | `thinking.type`、`reasoning_effort`、`thinking_strategy`、`enable_thinking` |
| 讯飞星辰 MaaS (iflytek) | 0 | 0 | 0 | 暂无已核实可调字段 |
| 美团 LongCat (longcat) | 1 | 0 | 0 | `thinking.type` |
| Anthropic (anthropic) | 11 | 11 | 0 | `thinking.type`、`output_config.effort`、`thinking.budget_tokens` |
| Recraft (recraft) | 0 | 0 | 0 | 暂无已核实可调字段 |
| SpaceXAI (xai) | 6 | 6 | 0 | `reasoning.effort` |
| Google (gemini) | 11 | 11 | 2 | `generationConfig.thinkingConfig.thinkingLevel`、`generation_config.thinking_level`、`generationConfig.thinkingConfig.thinkingBudget` |
| OpenAI (openai) | 30 | 28 | 0 | `reasoning.effort`、`reasoning_effort` |
| BFL (bfl) | 0 | 0 | 0 | 暂无已核实可调字段 |
| Stability AI (stability) | 0 | 0 | 0 | 暂无已核实可调字段 |
| Ideogram (ideogram) | 0 | 0 | 0 | 暂无已核实可调字段 |
| Mistral AI (mistral) | 2 | 2 | 0 | `reasoning_effort` |
| Together AI (together) | 7 | 3 | 0 | `reasoning.enabled`、`reasoning_effort` |
| Fireworks AI (fireworks) | 8 | 3 | 0 | `reasoning_effort` |
| fal (fal) | 0 | 0 | 3 | `thinking_level`、`reasoning` |
| Replicate (replicate) | 0 | 0 | 4 | `input.thinking_mode`、`input.enable_thinking`、`input.thinking` |
| Runware (runware) | 20 | 18 | 10 | `settings.thinkingLevel`、`settings.thinking` |
| OpenRouter (openrouter) | 223 | 157 | 0 | `reasoning.enabled`、`reasoning.effort` |
| custom (custom) | 0 | 0 | 0 | 暂无已核实可调字段 |

## 默认、限制与兼容

- 新 Web 选择“服务商默认”时发送绑定准确身份的空 `options`，服务端去掉该型号已核实的思考字段；不发送 `null`，不暗选最高强度。强度、预算、输出 token 上限、温度、图片质量分开处理。没有 `thinkingConfig` 的旧客户端/历史任务保留原始请求行为。
- 三个角色分别保存，身份包含 provider、modelId、protocol、region；仅同一角色的完全相同身份可恢复本机偏好，新身份从默认开始。缓存最多 120 个身份且不含 Key。目录尚未加载时不覆盖已有偏好。过时参数可显示并拒绝提交，不静默迁移或升档。
- Claude 的 effort 可独立于 thinking；Opus 5 关闭思考与 xhigh/max 冲突。旧 Claude enabled 必须填写预算；adaptive 不接受固定预算。预算仍小于原有 `max_tokens=16384`，不扩大输出额度。Gemini 2.5 对 -1/0 的支持逐型号列出。
- Qwen3.8 的 effort 和 budget 互斥；预算独立于可见输出额度。显式 xhigh 与完全省略参数的预算行为不同，所以默认不能用 xhigh 代填。SiliconFlow 预算和 max_tokens 分离，不能套用 Claude 的总额度约束。细节及官方出处见国内审计。
- OpenRouter/Fireworks 有部分预算字段文档，但当前请求未明确总输出额度，无法本地校验 budget 与输出的关系；这些只记在 `documentedControls`，不开放预算输入。固定/未知型号没有伪造档位。
- 图片共 21 型号开放真正图片接口的思考控制：百炼 2、Gemini 2、fal 3、Replicate 4、Runware 10。WAN2.7 和其他仅纯文生图接口拒绝参考图、编辑或不支持的连续模式；Gemini Interactions 使用 `generation_config.thinking_level`，不套用 GenerateContent 字段。质量、steps、guidance、尺寸始终保持各自含义。

### 修正原有固定字段的范围

以下变化只发生在显式使用新思考契约的任务，旧请求与旧恢复描述符不变。逐准确 ID 的 `legacyFixedParameters`、官方依据和清理叶路径见审计 JSON。

| 既有代码 | 新“服务商默认”及影响 |
|---|---|
| OpenAI GPT-5.1/5.2 固定 `reasoning_effort=none` | 去掉思考字段，采用官方默认；按准确型号清理与思考冲突的采样字段，输出上限不变。 |
| Ark Seed 2.x/evolving、部分 DeepSeek/GLM 固定 `thinking.type=disabled` | 去掉该叶字段；官方默认可能开启思考，时间与 token 消耗可能增加。保留同对象的其他历史策略字段。 |
| 小米 MiMo V2.5/V2.6 四个型号固定 disabled | 默认改为参数省略；官方默认 enabled。选择关闭仍可显式发送 disabled。 |
| TokenHub Kimi K3/K2.8-preview 固定 low；K2.6/MiniMax M3 固定 disabled；部分 GLM/Kimi Code 固定 enabled | 默认去掉这些已存在固定字段；K2.8-preview 没有公开完整契约，不因此开放新档位。不同型号的官方默认独立记录。 |
| 百炼 WAN2.7 image/pro 固定 `parameters.thinking_mode=true` | 默认删除字段；仅纯文生图可显式 true/false。不得让编辑请求继承文生图思考参数。 |
| MiniMax `reasoning_split=true` | 保留。它控制返回格式，不是思考开关。 |

文本响应新增 Mistral 内容块解析与 Gemini thought 块过滤，只向业务流程提供最终可见文本，不把思考块误当成答案。

## 共享契约和恢复

`thinkingConfig={version:1,roles:{main?,vision?,image?}}`；每个角色是 `{provider,modelId,protocol,region?,options}`。客户端不提供可信 wire；服务端按已解析路由重新校验并编译 `thinkingSnapshot`，丢弃伪造快照。公开任务保存设置和实际编译的字段/清理策略，`providerCalls` 只在对应调用发生后记录该角色配置。配置存在不等于该角色已执行。

任务通过现有加密恢复机制保存原快照和所需 Key，成功后删除恢复密文，最长 7 天。恢复不重新读取前端设置、不重编译目录参数；成功步骤复用，未知提交不自动重发，并发恢复只能入队一次。使用现有恢复密钥，无新增环境变量。后端缺少恢复加密能力时 `thinkingContractVersion=0`，新设置拒绝提交，旧客户端继续旧行为。

模型函数不等于模型角色：视觉评审可调用文本函数，主模型可读取参考图。因此显式传递实际 role，确保同型号不同角色仍采用自己的配置。最终 POST 校验型号、协议、固定 Replicate 版本/Fal 端点，GET/资源上传/原任务轮询不注入参数。思考校验失败保留 `not_sent`，不能包装成 unknown 或查询一个未提交的任务。

启用新契约的百炼视觉请求不再在失败后自动替换为另一个 VL 型号，以免改变已冻结的模型身份与思考参数；没有思考配置的旧请求保留原有回退行为。

- Web：三角色设置、身份缓存、默认/不支持提示、生成与精修提交、任务记录与恢复已完成。
- 小程序：新增能力版本可读取；任务归一化与本地记录保留配置/快照；旧配置、目录与原任务恢复兼容。原生思考编辑表单未移植，不能宣称小程序已提供调节界面。未把大型审计数据打进小程序包。
- Core / Laf 共享源码与共享 types/API：已完成；独立旧 Laf 未配置持久工作流时不开放新功能。

## 更新日志页

[统一内容源](../../../apps/web/src/data/changelog.json) 收录 2026-09-07 至 2026-09-22 的 17 条有发布证据的主要 Web 更新，不宣称穷尽历史。日期来自对应发布记录，PR/提交仅作为可追溯依据。v24、本轮导航与思考功能均未上线，不写入正式更新条目。

`/changelog` 使用现有页面外壳、会话、反馈与导航；桌面顺序为“工作台 → 排行榜 → 更新日志”，移动端在“更多”中，三处保持当前页选中状态。内容支持搜索、稳定锚点和公开来源展开；独立懒加载，多页入口支持直接打开与刷新。

后续维护按照[说明](../../changelog-maintenance.md)和[条目模板](../../changelog-entry.template.json)，先确认对应端的实际发布证据，再追加 JSON。正式页面只接受 released，未发布内容留在开发文档。

## 验证与边界

详见 [validation.md](validation.md)。官方资料与公开目录读取、模拟协议测试、本地浏览器验收分别记录。没有真实 Key 的权限、限流、区域配额、实际思考成本和模型质量仍未验证；没有真实设备 Safari/微信验收、部署或微信发布。本机配置缓存不会替代服务端对账号权限的验证。

更新支持表时修改 `config/thinking-audit/*.json`，执行 `node scripts/sync-thinking.mjs`（生成 API/Web/Laf 与 CSV）和 `--check`；目录本身继续用 `sync-model-catalog.mjs`，两者互不覆盖。修改旧字段或恢复描述符必须同步检查历史兼容测试，不能把新版参数重新套到旧任务。
