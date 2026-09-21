# 模型版本核对 · 2026-09-21

本次在目录 v20 的基础上修正展示与版本证据，v21 没有新增、删除或替换调用 ID。760 个静态条目（其中 6 个已停用身份保留）全部逐 ID 建立记录；另记录 415 个 OpenRouter 同步候选目录身份，实际可选项仍由能力、协议、生命周期过滤。Batch 专用 ID 不计入同步候选。历史任务、默认配置、能力与调用协议未迁移。

展示名称校准 95 项，见 [展示名称变更表](model-version-label-changes.csv)；API ID 更名 0 项。

完整对照表：[全部 1175 行](model-version-mapping.csv)；[待确认 938 行](model-version-unconfirmed.csv)；[机器可读证据与来源哈希](../config/model-version-audit.json)。表中同时列出保存的配置 ID 和实际 API model ID / 端点 / version 参数，避免把展示名称当作调用 ID。

核对结果分为固定版本 126 行、滚动别名 139 行、固定性或版本待确认 910 行。滚动别名中 28 行尚无已确认的当前目标。固定性未知不等于型号不存在，也不等于停用；15 行仍有精确 ID 或历史版本证据缺口，详见独立 CSV。尝试读取 400 个官方 URL，其中 16 个返回 404；应用外壳、404、目录缺失均不作为下架依据。

| 渠道 | 展示名称 | API model ID | 性质 | 已核对版本 | 依据 |
|---|---|---|---|---|---|
| 阿里云百炼 | DeepSeek-V4-Pro（具体版本待确认） | `deepseek-v4-pro` | 固定性 / 对应版本待确认 | deepseek-v4-pro | [官方来源](https://help.aliyun.com/zh/model-studio/deepseek-api-by-vanchin) |
| 阿里云百炼 | DeepSeek-V4-Pro-0813 | `deepseek-v4-pro-0813` | 固定版本 | deepseek-v4-pro-0813 | [官方来源](https://help.aliyun.com/zh/model-studio/deepseek-v4-pro) |
| 深度求索 | DeepSeek-V4.1-Flash | `deepseek-flash` | 滚动别名 | DeepSeek-V4.1-Flash | [官方来源](https://api-docs.deepseek.com/quick_start/pricing) |
| 深度求索 | DeepSeek-V4-Pro-0813 | `deepseek-v4-pro` | 滚动别名 | DeepSeek-V4-Pro-0813 | [官方来源](https://api-docs.deepseek.com/quick_start/pricing) |
| OpenAI | GPT-4o · 2024-08-06 | `gpt-4o` | 滚动别名 | gpt-4o-2024-08-06 | [官方来源](https://developers.openai.com/api/docs/models/gpt-4o.md) |
| Mistral AI | Mistral Medium 3.5 | `mistral-medium-3` | 滚动别名 | mistral-medium-3-5 | [官方来源](https://docs.mistral.ai/models/mistral-medium-3-5-26-04) |
| OpenRouter | DeepSeek V4 Pro 0423 | `deepseek/deepseek-v4-pro` | 固定性 / 对应版本待确认 | deepseek/deepseek-v4-pro-20260423 | [官方来源](https://openrouter.ai/api/v1/models) |
| OpenRouter | DeepSeek V4 Pro 0813 | `deepseek/deepseek-v4-pro-0813` | 固定性 / 对应版本待确认 | deepseek/deepseek-v4-pro-20260813 | [官方来源](https://openrouter.ai/api/v1/models) |
| OpenRouter | DeepSeek V4.1 Flash | `deepseek/deepseek-v4.1-flash` | 固定性 / 对应版本待确认 | deepseek/deepseek-v4.1-flash-20260910 | [官方来源](https://openrouter.ai/api/v1/models) |

版本解释：

- DeepSeek 直连的两个 ID 是滚动别名，当前对应 V4.1 Flash / V4 Pro 0813。展示名更新，API ID 原样保留。
- 同名 OpenRouter Pro ID 的 canonical_slug 对应 20260423；独立 0813 ID 对应 20260813。canonical_slug 是永久目录身份，不额外宣称调用别名或权重永远不变。
- 百炼单列通用 Pro ID 与 0813 快照，不能套用原厂直连映射；TokenDance 的通用 Pro / Flash 仍显示其目录所称 Preview。
- 同时收紧 DeepSeek 通用 Pro / Flash 的发布日期规则：原厂滚动版本的更新日期只作用于直连，百炼和 OpenRouter 未确认的别名日期不再沿用旧缓存值。0423 条目不显示 0813 日期，也不从 canonical_slug 的数字推造发布日期。
- OpenAI 用具体型号页的 Default snapshot 字段，不按最新日期猜测。Claude 的无日期 ID 可为固定快照，依据其版本规则逐项处理。
- Replicate 固定 hash 请求继续使用原 hash；versionless 端点显示本轮 schema 的 version.id，仅为当时观察值。未用最新 hash 静默升级旧配置。
- 官方未披露更细版本时保留具体渠道 SKU，并标明固定性 / 具体目标待确认。没有用研发厂商资料补造聚合渠道的映射。

渠道分类次序（仅用于排序，界面名称及辅助标签不加国内 / 国外前缀；下面采用小程序 / 设置常量的既有同类顺序）：

1. 国内聚合：观猹 TokenDance → 硅基流动。
2. 国内官方直连：阿里云百炼 → 火山方舟 → 深度求索 → Kimi → 智谱 → MiniMax。
3. 国外官方直连：Google → OpenAI → Anthropic → Recraft → SpaceXAI → BFL → Stability AI → Ideogram → Mistral AI。
4. 国外聚合：OpenRouter → Together AI → Fireworks AI → fal.ai → Replicate。

同类内对传入顺序做稳定排序。Web 服务端注册表本来将深度求索 / Kimi / 智谱排在百炼 / 方舟之前，而小程序常量顺序相反；按本轮“保留现有相对顺序”要求保留该差异。四类优先级在所有入口一致，并非将同类全部重新排序。模型角色会过滤不支持该角色的渠道。

验证与部署记录见 [本地验证记录](model-version-validation-20260921.md)。本轮公开文档 / 目录使用只读请求，真实付费推理为 0；无 push、无自动部署、无微信上传发布。目录及本地模拟测试不能证明账号权益或真实推理成功。
