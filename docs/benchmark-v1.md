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

校准与 canary 使用手工 `Run Benchmark Paid Operator` workflow，并在常驻 Worker 仍 disabled 时启动一次性容器：

- Calibration 使用六张原创缺陷金标，固定覆盖漏节点、反向箭头、乱码、遮挡、低对比和比例违约；OpenRouter 与百炼 Judge 各评一次，可解析修复也计入 dispatch 上限。红线准确率低于 85% 或两 Judge 一致率低于 80% 时不得记录该 epoch。
- Canary 固定 `complex_topology-01` 与 `math_symbols-01`，精确生成两张图，由两位 Judge 各评一次；任何 JSON 修复或 429 有界重发均占最多六次 Judge dispatch 的预算。
- operator 绑定当前代码 SHA、Judge stack、无密钥授权信封、价格快照、生成/Judge 次数和最高 3 美元估算费用派发上限。实际账单由 Provider 最终计费决定；完整报告只写入私有 `bench/operator-reports/`，Actions 日志不得输出图片、自动评分、凭据或未审证据。Core 在记录校准前从私有 OSS 有界回读原件并重算报告、授权和价格 hash，请求中仅有格式正确的伪造 hash 不能通过。
- Calibration 与 canary 都不是公开画像；只有随后完成 quick/full、Codex 盲审与不可变发布，`/bench` 才能读取结果。
