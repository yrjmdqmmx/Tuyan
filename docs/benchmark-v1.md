# PaperBanana 出图模型 Bench v1

`/bench` 只观察文生图模型特点，不评 main/vision、精修或图生图，也不产生综合总分。

## Versioned method

- Suite: `pb-image-diagnostic-v1`，48 个原创 CC-BY-4.0 题目，八类各六题。
- Quick: 固定分层 12 题 × 2 次；Full: 48 题 × 3 次。
- Lanes: `2K-standard → 1K-standard → 4K-standard` 选择首个支持赛道；跨赛道不排名。
- Axes: 忠实度、简洁度、可读性、美观度、文字/符号、拓扑、指令遵从。
- Judges: OpenRouter `google/gemini-3.7-flash` 与百炼 `qwen3.7-plus`，严格 JSON，只修复一次。
- Audit: 任一维分歧大于 2、红线冲突、异常、公开证据及 run hash 固定 10% 进入 Codex 盲审。
- Aggregation: 先题内聚合，再跨题均值与 bootstrap 95% 区间；有 Codex 结果时取三方中位数并执行确认红线封顶。
- Traits: 仅正式画像、覆盖率至少 80%、相对同赛道中位数差至少 0.5 且差值区间支持方向时生成。

题目、rubric、registry、价格、代码 SHA、Judge/Reviewer epoch、样本与审计比例都进入不可变 release。公开接口只读取 release；修正创建 `supersedesReleaseId`，不覆盖历史。

## Release gate

Worker 初始必须 `PAPERBANANA_BENCH_ENABLED=false`。发现候选费用为零。任何两题 canary、24 图临时集或 144 图正式集都需要新的明确预算授权、专用凭据与通过的 Judge calibration 记录；本仓库构建、测试或部署流程不得自动开启付费运行。
