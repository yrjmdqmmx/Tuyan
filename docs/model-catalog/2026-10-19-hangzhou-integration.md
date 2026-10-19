# 杭州工作树模型目录 v35 接入记录

日期：2026-10-19。用户确认“先接入模型，提速只出分析”。本轮完成本地接入和验证，未提交、推送、部署或进行真实模型调用。

## 当前基线与来源

- 唯一后续开发基线：`/Users/a1-6/.codex/worktrees/tuyan-hangzhou-oss-migration/paperbanana（tuyan）`，分支 `codex/hangzhou-production`，HEAD `d23fbab0eb2811e480eeba5bcfb671cf822dd123`。
- 只读核实的线上版本：`051cf4bd4a84e2b974159c751341a50b015732bf`；本地 HEAD 只追加了上一轮交付文档。杭州 SSH 可达、10 容器健康，真实账号可读取任务。上一轮真实验收不重做。
- 来源会话“图研模型目录每周更新”的 v35 增量，源工作树为 `tuyan-v400-workflow-20261009`。该树含大量继承改动，未整体合并；Desktop main 亦未使用。
- 本目录的 `2026-10-19-update.md`、coverage、evidence、validation 是源会话的原样证据。其“有效工作树”和验证次数描述源会话，不替代本记录的杭州基线与本轮结果。
- 对 21 个导入文件逐一验证源文件 after-hash 和目的文件 preimage；共享生成物在杭州树重新生成。未复制旧 runtime handler 或旧 SYNC。
- 后续交接仍使用 lineage `lin-611beb1188a02984`；parent 为 `20261019-092001-codex-tuyan-workspace-production-fixes-and-acc-01a14ce4-6069-76b0-96cb-`。本轮未另建交接快照。

## 接入结果

目录由 1099 增为 1103 条静态渠道型号，版本 `2026-10-19.v35`。31 个静态渠道及 OpenRouter 动态发现架构保持。

| 渠道 | 精确请求 ID | 本轮启用角色 | 公开依据 |
|---|---|---|---|
| Together | `reflection/Beam-1.0-501B-A23B` | 主模型 | [Serverless 目录](https://docs.together.ai/docs/serverless/models) |
| Fireworks | `accounts/fireworks/models/deepseek-v4p1-flash-1017` | 主模型、视觉理解 | [精确型号](https://fireworks.ai/models/deepseek-ai/deepseek-v4p1-flash-1017) |
| 百度千帆 | `deepseek-v4.1-flash-1017` | 主模型、视觉理解 | [型号表](https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j) |
| TokenDance | `deepseek-v4.1-flash-1017` | 主模型；内部 optimize | [公开目录](https://tokendance.space/gateway/v1/models) |

继续使用原有“渠道 → 厂商 → 已添加模型”和模型库卡片；补齐 Reflection 图标、输入/输出模态、上下文和官方来源。TokenDance 新型号沿用既有增量加入逻辑，重复刷新不重复添加，已有禁用选择保持。其他渠道仍通过用户保存的对应连接添加，不自动写入真实账号。

所有新增项仍为 `verified=false / verificationState=catalog`。现有适配器的离线请求合同已验证，账户权益、真实推理与输出质量未验证。千帆官方最大输出 393216 只作为规格，实际请求预算仍为 8192。

同时迁入：

- 20 条方舟生命周期修正：12 条于 9 月 21 日到期；2 条于 10 月 22 日 14:00（北京时间）到期；6 条于 11 月 24 日 14:00 到期。保留历史 ID，到期禁选、调用前拦截，无静默替换。
- DeepSeek 原厂的 3 个精确服务映射和 TokenHub 的 `deepseek/deepseek-flash` 映射。实际请求 ID、原有禁用状态和默认选择保持。
- fal Krea 文档默认值更新为 medium，应用仍显式发送 low。
- TokenDance Qwen Image 2.1 新协议、Seedream 5 Flash 未核实合同，以及 Fireworks 专属部署型号继续待适配。

## 本轮验证

| 检查 | 结果 |
|---|---|
| Core 目录、渠道、生命周期、TokenDance | 258 个不同用例最终通过：239 项目录/合同 + 19 项 TokenDance |
| Web 目录、模型规格、隔离、选择器和新增工作区回归 | 71/71 |
| Core TypeScript | `tsc --noEmit` 通过 |
| Web 生产构建 | 通过；仍有既有大 chunk 提示 |
| 生成一致性 | v35 / 1103 条，无漂移；跳过小程序 |
| 本地 Chrome | 实际组件搜索、4 条新型号显示、Reflection 图标/规格、精确选择绑定通过 |
| 改动范围 | runtime 除生成目录段和目录版本外逐字一致；现有选择器、卡片、TokenDance 加入逻辑、生成提示词及材料代理均未改 |
| 小程序 | 219 个基线文件 SHA-256 不变；微信开发目录未触碰 |
| 付费调用 / 生产写入 / 推送 | 0 / 0 / 0 |

首次检查揭示两类集成遗漏，均已修正：Web 的品牌与规格 JSON 为手工维护文件，需单独迁入；杭州 TokenDance 测试的目录/角色/请求数量仍为旧版，已按新增 1 个文本型号更新并复测。没有用跳过测试处理失败。

测试和构建加载既有离线护栏，外网 fetch/http/https/socket 被阻断，通道请求由 fixture 接管。浏览器仅使用本树实际组件、静态目录和内存连接，无真实账户请求。临时页面已移出项目，5198 服务已停止。

[测试日志与边界哈希](/Users/a1-6/.codex/artifacts/tuyan-hangzhou-catalog-v35-20261019/integration-boundaries.json)；[迁入基线](/Users/a1-6/.codex/artifacts/tuyan-hangzhou-catalog-v35-20261019/integration-baseline.json)；[选择器截图](/Users/a1-6/.codex/artifacts/tuyan-hangzhou-catalog-v35-20261019/picker-beam.png)；[三渠道卡片截图](/Users/a1-6/.codex/artifacts/tuyan-hangzhou-catalog-v35-20261019/catalog-deepseek-1017.png)。

## 下一步边界

本地接入无未解决失败。上线仍是独立动作，当前没有推送发布授权；分支代码推送会触发杭州自动发布。新型号的真实调用亦未被本地测试替代。小程序继续暂停。

速度分析见 [生成耗时分析](/Users/a1-6/.codex/worktrees/tuyan-hangzhou-oss-migration/paperbanana（tuyan）/docs/operations/2026-10-19-generation-performance-analysis.md)，本轮未实施其中任何优化。
