# PaperBanana 全量生图模型轻量公开榜设计

## 目标

建立唯一的 `Standard` 公开诊断阶段。阿里百炼、OpenRouter、火山方舟只负责调用被测生图模型；自动 Judge 调用为 0，所有成功图片由 Codex 进行全量两遍结构化盲审。

榜单用于观察模型差异，不产生综合总分或“绝对领先”标签。历史 Quick/Full 双 Judge release 继续只读保留，但不迁移、不覆盖，也不与新榜混排。

## 冻结范围与模型归一

- 每次批次冻结完整生产 registry version、registry hash、55 个原始 route、canonical 映射和 manifest hash。
- 运行时别名及跨渠道同一实际模型只测试一次；当前基线预期归一为 48 个 canonical 模型。
- 主渠道优先百炼/方舟官方直连，无直连时才使用 OpenRouter；替代渠道作为公开元数据保留。
- 批次冻结后新增的模型不插入当前批次，进入下一次 snapshot。
- 无权限、目录漂移或生成失败的模型继续出现在公开目录，但标记未进入质量排名。

## Standard 题集与预算

不可变 suite 为 `pb-image-light-v1`，固定四题：

- `complex_topology-05`
- `bilingual_terms-01`
- `math_symbols-01`
- `negative_constraints-05`

每个 canonical 模型每题只生成一次，最多 4 次，不自动重试。最多 48 个模型、192 次生成。审批固定为 `maxGenerations=4`、`maxJudgments=0`、`maxJudgeCalls=0`、`estimatedPerJudgeCall=0`；批次总预算在正式运行前由各模型公开价格快照汇总。

分辨率按声明能力选择 `2K → 1K → 4K`。未声明分辨率的 OpenRouter 模型使用 Provider 默认输出。每张成功图片记录实际宽、高、像素数和文件大小；按产品决定，不同原生分辨率仍进入同榜，并在页面明确披露。

## 状态与运行边界

新状态流为：

`detected → approved → standard_running → codex_review → published`

同时保留 `paused / failed / cancelled / superseded`。常驻 Worker 默认 disabled、并发 1。一次性 Standard batch operator 持有生产共享锁，顺序执行已批准 run；最多 48 个 canonical 模型和 192 次生成。单模型未知 Provider 结果立即暂停该模型且不自动重试，批次可继续其他模型。

## Codex 审核与统计

- `evaluationMode = codex_single`
- `evaluationEpoch = codex-single-2026-08-v1`
- `reviewProtocol = codex-single-two-pass-v1`
- `reviewerKind = codex`
- `reviewerPasses = 2`
- `automaticJudges = []`

所有成功样本进入同一个签名 packet。packet 只含盲标签、图片、题目要求、rubric 及对应 hash，不含模型、渠道或历史分数。导入必须覆盖 packet 的全部成功样本，并提供七维最终分数、可见证据、置信度、确认红线和一致性复核结果。

统计直接使用 Codex 最终分数并执行确认红线封顶。至少成功并审核 3/4 张才进入七维排名；不足 3 张仍公开展示，但标记“样本不足、未排名”。成功率、延迟、实际像素和 generation-only 成本独立展示。

## 数据完整性与发布

新 run 的兼容哨兵为：

- `judgeEpoch = judge-none-codex-single-v1`
- `judgeStackHash = canonicalHash({ evaluationMode: 'codex_single', automaticJudges: [] })`

source manifest 必须绑定全部 Standard 成功样本、空 automatic judgment、空 Judge dispatch、actual pixels 和 generation-only usage。出现任何 automatic judgment 或 dispatch 都失败关闭。

发布时从 suite、signed run facts、approval、samples、accepted Codex judgments 和 packet attestation 独立重建画像，不信任 `run.usage` 或 `releaseDraft`。新 release 的比较身份为 `suiteId + evaluationMode + evaluationEpoch`，状态为 `published`。公开费用中的 `automaticJudgeCalls`、`logicalJudgments`、`judgeDispatchCalls` 固定为 0。

## 公共页面

公开 actions 名称保持不变：`benchmarkLeaderboard`、`benchmarkModelProfile`、`benchmarkMethodology`。

`/bench` 一行对应一个 canonical 实际模型，展示开发者、主接入渠道、替代渠道、样本数、七维分数和区间、实际像素、成功率、延迟和生成成本。页面明确披露小样本、单一审阅者和混合原生分辨率限制，不显示 Quick/Full、临时画像、双模型评审或 Judge 费用。

## 范围外

- 不运行或发布官方 PaperBananaBench 赛道。
- 不评 main/vision、精修或图生图。
- 不增加用户投票、综合总分或自动扣费。
- 实现、测试和构建阶段不发起任何 Provider 或 Judge 付费请求。
