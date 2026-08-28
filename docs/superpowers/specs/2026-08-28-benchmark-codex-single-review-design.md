# PaperBanana Bench Codex 单审公开榜设计

## 目标

将 Bench v1 从“出图 + OpenRouter/百炼双自动 Judge + Codex 抽审”改为“三家渠道只出图，全部图片由 Codex 盲审”。目标是显著降低费用和 Provider 不确定性，同时保留公开排行榜所需的可追溯证据、版本隔离和限制披露。

首批出图渠道固定为阿里百炼、OpenRouter、火山方舟。各渠道只调用被测图像模型，不再承担评分。

## 选择的方案

采用 **Codex 全量两遍盲审**：每张完成图片都进入同一个签名审核包；审核包不包含渠道、模型身份或历史分数。Codex 第一遍独立评分，第二遍只做一致性复核和红线确认，最终导入七维分数、可见证据、置信度与确认红线。

公开页面明确标注：

- `evaluationMode = codex_single`
- 自动 Judge 数量为 0
- 审阅者是 Codex，不标注为人类专家
- reviewer epoch 和审核协议版本
- 单一审阅者可能存在系统性偏差，分数只应与相同 suite、lane、evaluation mode、reviewer epoch 的结果比较

这是公开排行榜，不是综合总榜；仍保留七个单维榜、置信区间、成功率、延迟与生成成本。

## 未采用的方案

1. **保留一个自动 Judge + Codex**：费用和 Provider 超时仍然存在，节省有限。
2. **只抽审 10%**：剩余样本没有可靠分数，不能支持公开七维榜。
3. **用户投票**：难以控制身份、样本暴露和刷票，暂不引入。

## 运行与预算

### Quick

- 12 题 × 2 次，最多 24 张图。
- 预算只包含 generation calls 与 generation USD。
- `maxJudgments = 0`、`maxJudgeCalls = 0`、`estimatedPerJudgeCallUsd = 0`。
- 所有完成样本都设置 `auditRequired = true`。
- 生成结束后直接进入 `quick_review`。
- Codex 全量审核导入后才允许发布 provisional release。

### Full

- 48 题 × 3 次，按能力缺口最多 144 张图。
- 同样只有生成预算，没有 Judge 预算。
- 所有完成样本进入完整 Codex 审核包。
- 导入全部审核结果后才允许发布 verified release。

常驻 Worker 继续默认 disabled、并发 1；付费阶段仍使用共享生产锁和一次性 operator。

## 数据与完整性

新增公开字段：

- `evaluationMode: 'codex_single'`
- `evaluationEpoch`
- `reviewProtocol: 'codex-single-two-pass-v1'`
- `automaticJudges: []`
- `reviewerKind: 'codex'`
- `reviewerPasses: 2`

为降低迁移风险，内部 run facts 暂时保留既有 `judgeEpoch` 与 `judgeStackHash` 字段，但新 run 固定为无自动 Judge 的兼容哨兵：

- `judgeEpoch = 'judge-none-codex-single-v1'`
- `judgeStackHash = canonicalHash({ evaluationMode: 'codex_single', automaticJudges: [] })`
- `reviewerEpoch = 'codex-single-2026-08-v1'`

新 release 的比较分区使用 `suiteId + lane + evaluationMode + evaluationEpoch`。历史双 Judge release 保持原样，不覆盖、不迁移、不与 Codex 单审榜混排。

新运行的 phase source manifest 必须精确绑定：

- 全部当前 phase samples
- 空 automatic judgments 集
- 空 Judge dispatch 集
- generation-only usage
- 完整 Codex packet、review hash 与 review attestation

发布时不信任 run 汇总字段，而是从 samples 与 accepted Codex judgments 重建结果。每个可执行样本必须恰好有一个当前 packet、reviewer epoch 的 accepted Codex judgment。

## 评分与统计

七维保持不变：忠实度、简洁度、可读性、美观度、文字/符号、拓扑、指令遵从。

新模式下不再计算三方中位数，直接使用 Codex 分数，并执行 Codex 确认的红线封顶。重复样本先在题目内聚合，再跨题计算均值和 case-level bootstrap 95% 区间。

公开费用字段保持兼容：

- `generationCalls` 为实际出图次数
- `automaticJudgeCalls = 0`
- `logicalJudgments = 0`
- `judgeDispatchCalls = 0`
- `estimatedCost.usd` 只包含生成估算费用

## API 与页面

公开 actions 名称不变：`benchmarkLeaderboard`、`benchmarkModelProfile`、`benchmarkMethodology`。

站长 actions 名称不变，但 approval、attestation、review export/import 和 publish 必须识别 `evaluationMode`。旧双 Judge run 继续按旧规则校验；新 Codex 单审 run 禁止出现 automatic judgment 或 Judge dispatch。

`/bench` 方法学区域改为：

- 三家渠道只负责出图
- Codex 全量结构化盲审
- 两遍审核协议
- reviewer epoch
- 单审偏差限制

模型卡继续区分接入渠道与模型开发者。OpenRouter 接入不得展示成模型官方直连。

## 失败与恢复

- 生成结果未知：保持现有 `UNKNOWN_PROVIDER_OUTCOME`，不自动重试。
- Codex packet 过期：允许从同一不可变样本集重新导出新 packet，旧 packet 不可导入。
- 审核未覆盖全部样本：禁止发布。
- 任意新模式 run 出现 automatic judgment 或 Judge dispatch：完整性校验失败并暂停。
- reviewer epoch 变化：创建新 evaluation epoch，不与旧榜混排。

## 范围外

- 不运行官方 PaperBananaBench 赛道。
- 不增加用户投票、综合总分或自动模型接纳。
- 不重新评分或覆盖已经发布的双 Judge 历史 release。
- 本次不启动任何新的付费 Quick 或 Full。

## 验收标准

- 新 Quick/Full 在零 Judge 调用下完成生成并进入全量 Codex 审核。
- 审核包不含模型身份、渠道或自动分数。
- 发布门要求全部完成样本均有 accepted Codex judgment。
- 新公开 release 明确显示 Codex 单审和 reviewer epoch。
- 历史双 Judge release 仍可读取，但不会与新模式混排。
- Worker 默认 disabled、并发 1，预算仅计算生成。
