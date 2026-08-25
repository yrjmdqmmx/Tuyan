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

Quick/full 正式阶段只允许通过手工 `Run Bounded Benchmark Phase Operator` workflow 执行单个已批准 run 的单个 phase。它不是审批入口：管理员必须先通过 `adminBenchmarkApprove` 明确确认 entitlement、公开 HTTPS 价格来源/快照、生成次数、Judge 次数和最高估算美元预算，再通过 `adminBenchmarkControl` 将同一 run 精确推进到 `quick_running` 或 `full_running`。进入 running 后可用同一 action 的只读 `command=phaseOperatorAttestation` 取得已经由 Core 验证过、无密钥的 workflow 输入；operator 不会自动 approve/reapprove 候选，不会改变 run state 进入 running，也不会扩大或替换已签署预算。

一次性 phase operator 的授权信封必须同时绑定已部署的 40 位代码 SHA、phase、runId、provider、modelId、lane、suite ID/hash、Judge epoch/stack hash、Core 已签署的 phase authorization hash、price hash、两类单次估算、完整价格来源/币种/采集时间、固定确认短语，以及完整的 Core 验证不可变运行事实：`runHash`、canonical `runFacts`、首次审批 candidate snapshot、`aspectRatios`、`registryHash`、run integrity HMAC 及各自 canonical hash。旧记录或任一缺失、变异都会失败关闭。Worker 只用 `_id + expected running state + expired/missing lease` CAS 获取目标 run，并在加载正式执行路径前重算、逐项比较 Mongo 中的不可变运行事实、phase approval version、当前 approval、价格与全部 caps；任何差异都在 Provider/Judge dispatch 前失败。

预算同时显式签署“逻辑 Judgment 数”和“Judge dispatch 尝试数”，不能混用：quick 上限为 24 generation / 48 个逻辑 Judgment / 192 次 Judge dispatch，full 上限为 144 / 288 / 1152。每个逻辑 Judgment 最多发生四次 dispatch（首次请求、一次 JSON repair，以及现有 429 规则对这两个请求各至多一次有界重发）；每次 dispatch 都先占用 `maxJudgeCalls` 与美元预算。审批的最坏情况估算使用 `maxGenerations × estimatedPerGeneration + maxJudgeCalls × estimatedPerJudge`，不得超过签署的总美元 cap。能力缺口可以使实际调用更少，不能使任何 cap 更大。

每次 Judge dispatch 必须先保守占用调用与美元预算，再向内部 `paperbanana_benchmark_dispatches` 写入仅含 `_id/runId/sampleId/phase/logicalProvider/dispatchIndex/judgeEpoch` 的 canonical marker，插入成功后才允许网络请求。该 collection 对 Worker 只有 `find/insert` 权限、对 Core 只有 `find` 权限；没有 update/remove，也不存在失败后删除 marker 的路径。重复或插入失败视为 unknown outcome 且不发起付费请求，已占预算允许保守高估。quick/full 审核导出都把当前 phase 的完整样本、automatic judgment、连续且每个逻辑 Judgment 1–4 个 marker，以及 `generationCalls / logicalJudgments / judgeDispatchCalls` 签入 source manifest；导入会重建并验签。缺首项、索引空洞、尾部删除/降级、重复、未知样本/provider/phase/epoch、额外当前 phase marker、旧版不完整 marker 或 judgments 中的 `status=dispatched` marker 均失败关闭。provisional/verified publish 及其 Mongo transaction snapshot 都分别重读 suite/run/samples/judgments/dispatches，并从 source manifest 独立重建 quick/full 形状与实际成本；quick 必须是固定 12 个 case 各 2 次，仅允许由已签署 ratio capability plan 产生的固定比例缺口。发布按 `judgeDispatchCalls` 而非完成 Judgment 数计价，独立检查签署的三类调用 cap 与美元 cap，绝不信任 `run.usage` 或 `usageByPhase`。公开 `estimatedCost.automaticJudgeCalls` 保留为逻辑 Judgment 兼容别名，同时新增 `logicalJudgments` 与 `judgeDispatchCalls`。

常驻 `benchmark-worker` 在执行前后都必须健康且保持 `PAPERBANANA_BENCH_ENABLED=false`、`PAPERBANANA_BENCH_CONCURRENCY=1`。host wrapper 持有香港生产共享锁，验证 Core/Worker baked SHA 相同，并在启动任何 one-off Worker 容器前使用受保护环境中的 Gateway/Admin transport token 和不可变管理员身份调用本机 Core 的只读 `phaseOperatorAttestation`；Core 返回值写入 0600 临时文件，完整 identity/hash/cap/price 对象必须与 workflow 输入深度精确相等，否则立即退出且不启动 one-off。通过后仅以 `docker compose run --rm --no-deps` 启动一次性容器；dry-run 不启动容器、不调用 Core，测试根目录永不允许 `--apply`。未知 Provider 结果暂停且不重发；429 仅保留既有有界规则。成功后 quick 进入 `quick_review`、full 进入 `codex_audit`；任何退出路径都必须证明目标 run 不再 running 且 lease 已释放。
