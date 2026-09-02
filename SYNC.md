# 平台同步日志 (Platform Sync Log)

### [2026-09-02] Web 三输入栏 main 路由单次 AI 优化 — by Codex
变更：新增同步 `optimizeInputs` action，分别优化论文方法内容、目标图注或负向提示词。请求只携带当前生效的 `mainRoute {accessProvider,modelId}`、该 Provider 的单个 `apiKey` 和三栏只读快照；Core 校验主模型注册表角色后最多发起一次文本 Provider HTTP 请求，不重试、不回退、不落库。`modelRegistry` 顶层新增 `inputOptimizationContractVersion:1`，旧后端下 Web 隐藏入口。
契约（影响共享 / Web）：
- **请求/响应**：`optimizeInputs` 接受 `target=methodContent|caption|negativePrompt`、`inputs`、`mainRoute`、`apiKey`，成功仅返回 `{code:0,target,optimizedText}`；方法/图注需非空，负向提示词可由其他两栏从空白生成。
- **安全/失败**：Key 只进入单次执行闭包；Gateway 严格白名单、维护门禁与 50 秒专属超时，Core Provider 超时 45 秒。空白、无变化、超长、科研 token 漂移、Provider 超时/失败均保留原文并返回稳定错误，不暴露原始 Provider 响应。
- **Web 交互**：三个字段独立入口，候选经原文/优化稿差异弹窗确认后才采用；支持重新优化、取消和一次恢复优化前内容。页面不展示模型名或费用，缺主模型/对应 Key 时打开设置引导且不发起调用。
各端待办：
- [ ] packages-api / auth-gateway / paperbanana-api（共享 DTO、真实转发、单次 Provider 调用与 TDD）
- [ ] Web（三入口、可访问差异弹窗、采用与单步恢复）
- [x] 微信小程序 / Android / iOS / Windows / macOS / HarmonyOS（新增 action 为可选能力，现有请求不变）
- [ ] 部署 / 运维（PR/CI、Core/Gateway/HK/Pages 和生产非计费 smoke）

### [2026-09-02] Scientific V2 remediation Worker 报告继承 Codex provenance — by Codex
变更：当补跑批次只执行普通 Provider、最终签名状态报告为 `worker` 时，发布端不再要求该报告伪装成 `codex`，也不信任 Worker 自报 Codex provenance。发布端会沿 `remediationOf` 精确读取已发布源 batch/release、复验源 release 内容 hash、源 Codex 状态报告的 schema/HMAC/disclosure/9 题/36 次上限/artifact canary，再把源 Codex 题位按新 manifest 确定性重绑并与当前 9 个 Codex 题位逐字节 canonical 对比；Codex 被列为补跑目标、源链不完整或任一继承字段漂移均拒绝发布。题目、图片、评分、审核和 Provider 调用规则不变。
- [x] paperbanana-api（源发布 lineage、Codex provenance 与重绑定题位校验及正反回归）
- [ ] 部署 / 运维（部署后重放当前 Seedream remediation 原子发布）
- [x] Web / Gateway / 小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开契约不变，无需改造）

### [2026-09-02] Scientific V2 管理员发布失败的安全诊断码 — by Codex
变更：受保护的管理员内网传输在 Scientific V2 操作被拒绝时，可额外返回一个严格白名单 `diagnosticCode`：业务错误仅允许 `SCIENTIFIC_V2_*`，Mongo 错误仅允许数值 code 与规范化 codeName；公开/未授权请求继续只返回统一错误，不暴露数据库消息、键值、对象路径、凭据或响应正文。root-only 管理桥只把该白名单码附在失败标识后，便于定位原子发布回滚原因。成功响应、公开 API、排行榜字段、图片、评分、审核和 Provider 调用规则不变。
- [x] paperbanana-api / 运维桥（白名单诊断码、非管理员不泄漏及回归测试）
- [ ] 部署 / 运维（部署后重放同一原子发布并按诊断码完成修复）
- [x] Web / Gateway / 小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开契约不变，无需改造）

### [2026-09-02] Scientific V2 release head / lifecycle 最小 Mongo 权限 — by Codex
变更：生产原子替代发布需要 paperbanana-api 在独立 `paperbanana_benchmark_release_heads` 与 `paperbanana_benchmark_release_lifecycle` 集合上读取当前 active head、插入新 lifecycle 并以 CAS 更新旧 lifecycle/head。Mongo root migration 会在角色和服务启动前显式、幂等创建这两个集合，避免 MongoDB 多文档事务因禁止隐式建集合而在提交前整体回滚；同时只给 API 账号增加这两个集合的 `find/insert/update`，不授予 delete、drop、索引管理或宽泛数据库权限，常驻 Benchmark Worker 仍无这两个集合的读写权限。旧的 `scientific_v2_release_identity` 唯一索引与“release 文档不可变、允许 remediation 插入新 release、由 head 保证唯一 active”的契约冲突，迁移会先建立包含 `profileStatus/publishedAt` 的非唯一查询索引，再精确删除该旧索引，不修改任何 release 文档或证据。公开 API、排行榜字段、题集、图片、评分、审核和 Provider 调用规则不变。
- [x] paperbanana-api / Mongo 迁移（release 状态集合预创建、最小权限、旧唯一索引替换与 Mongo 8 集成回归）
- [ ] 部署 / 运维（运行 root Mongo migration，确认旧唯一索引不存在、API 可原子 supersede、Worker 仍拒绝写入后重试当前 remediation 发布）
- [x] Web / Gateway / 小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开契约不变，无需改造）

### [2026-09-02] Scientific V2 公开证据渲染绑定真实 batchId — by Codex
变更：公开证据 render bundle 暂存与执行工作流新增必填 `batch_id`，并分别与签名 operator attestation、受保护 render bundle 和最终 publish input 做精确相等校验；不再从 `manifestHash` 推导普通批次名，因此 remediation 批次可进入相同的零 Provider 证据渲染与原子发布链。暂存另以必填 `manifest_code_sha` 绑定原始冻结/生成 lineage，和当前 control/deployed SHA 分开校验，避免为执行后续安全修复而伪造原批次代码 provenance。普通批次传入自己的真实 batchId 与 manifest code SHA 即可，公开 API、排行榜字段、图片、评分和审核结果均不变。
- [x] Benchmark Worker / 运维（两条受保护渲染工作流、真实 batchId 绑定与失败关闭）
- [ ] 部署 / 运维（部署后渲染当前 Seedream remediation 公开证据并原子发布）
- [x] Web / Gateway / 小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开契约不变，无需改造）

### [2026-09-02] Scientific V2 已存盲审分配可安全刷新短时链接 — by Codex
变更：`adminBenchmarkReviewExport` 在批次进入 `review_dispute`、`review_finalized` 或 `published` 后，可重放与数据库中已存记录完全相同的 A/B 盲审分配，用于刷新过期的私有 OSS 签名链接；后续状态仍禁止新建分配、换包或改变 mapping/assignment attestation，所有对象仍按 hash、私有 key、metadata 和 ACL 复验。公开 action、字段、评分与盲审结果不变。
- [x] paperbanana-api（同一已存分配重放、后续状态新分配拒绝及 TDD）
- [ ] 部署 / 运维（部署后复验过期链接可刷新，继续当前 xhigh 仲裁与原子发布）
- [x] Web / Gateway / 小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开契约不变，无需改造）

### [2026-09-02] Scientific V2 审核与发布运维绑定真实 batchId — by Codex
变更：审核结果导入、仲裁结果导入、公开证据发布输入暂存及发布输入只读检查不再从 `manifestHash` 推导普通批次名，统一新增必填 `batch_id` 并校验后原样绑定到受保护 payload。这样 remediation 批次可以复用同一套签名审核、仲裁和原子发布链，普通批次行为不变；公开 API action、请求/响应字段、排行榜字段及客户端均不变。
- [x] Benchmark Worker / 运维（四条受保护工作流、真实 batchId 绑定与契约测试）
- [ ] 部署 / 运维（部署后继续当前 Seedream remediation 的 A/B 导入、仲裁与原子 supersede）
- [x] Web / Gateway / 小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开契约不变，无需改造）

### [2026-09-02] Scientific V2 已持久化 Worker 状态可零 Provider 重建签名导入 — by Codex
变更：当 360 题位的完整 Worker 状态报告超过 GitHub 单行日志上限时，新增受保护恢复入口。它只读取生产机上精确 SHA 绑定的 manifest、最终 completed state 与 post-run operator attestation，在共享锁内以不可变 Worker 镜像、`--network none` 和 root `0600` 输入重建同一状态的签名 Worker report，再通过 localhost admin transport 导入为 `review_ready`。流程固定校验 deployed SHA、镜像 digest、previous/final state hash、HMAC、代码 lineage 和常驻 Worker disabled/concurrency 1；不调用 Provider、不改变图片、题目、路由、评分或失败/unknown 规则。
- [x] Benchmark Worker / 控制面（离线签名 stager、root-only admin handoff 与契约测试）
- [ ] 部署 / 运维（完成当前 Seedream remediation 的签名导入、双盲复审与原子 supersede）

本仓库是多端 monorepo，由多个独立的 AI 会话 / 开发者分别开发各端
（`web` / `miniprogram` / `android` / `windows` / `macos` / `laf-functions` 后端 / `auth-gateway`）。
各会话互不可见——**本文件是唯一的跨端协调真相。**

## 协议（所有会话 / agent 必须遵守）
1. **开工前**：读下方「条目」里未完成的项，补齐你负责那一端欠的待办。
2. **当你改了"会影响其他端"的东西时**（见下「要记什么」），必须在「条目」最上方**新增一条**，
   写清 变更 / 契约 / 各端待办 checkbox；完成本端后把自己那一格打勾 `[x]`。
3. 只记**跨端契约级**变更；**纯单端 UI / 样式 / 文案 / 本地 bugfix 不用记**（git log 已经有）。

### 要记什么（= 会影响其他端，必须记）
- `createJob` 等请求/响应的字段增减或语义变化
- 新增 / 修改 action（如 `prepareReferenceUpload`、`modelCapability`）
- 共享 model 列表、provider、环境变量要求
- 任务记录（`paperbanana_jobs` / `publicJob`）字段变化
- `auth-gateway` 转发 / 鉴权规则变化

### 不用记
- 单端的 UI、样式、文案、纯本地 bugfix

---

## 条目（最新在上）

### [2026-09-02] 方舟 Seedream 5.0 / 4.5 分辨率档位契约修正 — by Codex
变更：`callArkImage` 对 `doubao-seedream-5-0-260128` 与 `doubao-seedream-4-5-251128` 不再把用户选择的 `2K/4K` 档位强制改写为固定 `2048x1152/4096x2304`，而是按火山方舟当前图片生成契约直接发送分辨率档位，由模型在既定档位与提示词比例约束下确定真实像素；生成后仍从原始图片读取实际宽高并保存 SHA-256，返回格式、重试、预算、并发、共享锁及 Scientific V2 评分规则不变。其他方舟模型沿用原请求格式。

各端待办：
- [x] paperbanana-api（模型特定档位映射与回归测试）
- [ ] Scientific V2 生产补跑（仅重新冻结并补跑 Seedream 4.5 / 5.0 的 18 个失败题位）
- [x] Web / Gateway / 小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开 action 与字段不变，无需改造）

### [2026-09-02] Scientific V2 remediation 原子替代发布与独立 lifecycle head — by Codex
变更：Scientific V2 immutable release 文档继续保持原字节和原 `releaseHash`，发布生命周期移到独立 `paperbanana_benchmark_release_heads` / `paperbanana_benchmark_release_lifecycle` 文档。首次发布原子建立 active head；后续若同一评测身份已有 active release，普通 batch 仍以 `SCIENTIFIC_V2_RELEASE_IDENTITY_CONFLICT` 拒绝，只有 `remediationOf` 精确绑定当前 active release 的 id/hash、源 batch/manifest 和非空目标集合且集合 hash 一致时，才在同一 Mongo 事务中插入新 release/证据、把旧 lifecycle 标为 superseded、移动 head 并 CAS 标记新 batch published。任一步失败全部回滚；公开 leaderboard/model 查询在 head 存在时只返回 active release，历史 release 仍可按内容 hash 校验和审计。公开 action 与 response 字段不变。

各端待办：
- [x] paperbanana-api（原子 head/lifecycle、精确 remediation 绑定、公开查询过滤及 TDD）
- [ ] 生产发布（审核完成后部署 Core 并以 remediation batch 原子替代当前 V2）
- [x] Web / Gateway / 小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开 action 与字段不变，无需改造）

### [2026-09-02] Scientific V2 修正批次可从签名 running 状态进入 full — by Codex
变更：Scientific V2 run-bundle stager 的 `full` 阶段除既有 `canary_complete` 外，新增严格的签名 running-resume 结构：同一 manifest/execution SHA、无 legacy rotation、至少一个非 canary 题位已经是成功/不支持/失败终态、至少一个题位仍为 pending/retrying，且所有题位只能处于这五种状态。这样 remediation 的 328 个携带终态 + 32 个待补跑题位可直接进入 full；仅完成 provider canary 的 running 状态仍被拒绝，避免跳过 canary 边界。最终是否可 claim 仍由 Mongo 的 `status=frozen + remediationOf + 无 claimToken` CAS 约束；unknown、预算阻塞、not_executed、artifact 等状态仍失败关闭。

各端待办：
- [x] Benchmark Worker / 运维（签名 running-resume 结构校验、防 canary 越级及 TDD）
- [ ] 生产执行（在最终代码 SHA 重新冻结同一 32 题集合并单并发补跑）
- [x] paperbanana-api / Web / Gateway / 原生端（公开 action 与字段不变，无需改造）

### [2026-09-02] Scientific V2 修正批次 manifest/state 同源签名导出 — by Codex
变更：`adminBenchmarkControl/operatorAttestation` 在既有签名报告之外新增仅限受保护管理员传输的 `manifestSnapshot`，与 `stateSnapshot` 一起由 Core 从实际冻结批次读取、复验并深冻结；root 运维桥分别以内容 SHA 写入 `0600` manifest/state 文件，公开 stdout 只返回 hash。通用 Scientific V2 管理输入 staging 新增精确 `attest` schema（仅 `batchId`、`manifestHash`），使 remediation 批次可从 Core 实际冻结数据构造 Worker run bundle，禁止在客户端重建 manifest 或绕过 hash/签名。公开 API、排行榜字段、题集、分辨率、评分、重试、预算及 provider 路由均不变。

各端待办：
- [x] paperbanana-api / Benchmark Worker / 运维（Core 同源 manifest/state 导出、内容寻址落盘、attest staging 与 TDD）
- [ ] 生产执行（为五模型 32 个精确失败题位生成 attestation/run bundle 后单并发补跑）
- [x] Web / Gateway / 小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开 action 与字段不变，无需改造）

### [2026-09-01] Scientific V2 五模型失败题位修正批次 — by Codex
变更：为已发布 V2 的五个指定模型增加受保护的 `adminBenchmarkControl/freezeRemediationBatch` 运维命令。命令只接受精确绑定的源 batch/manifest/release、排序后的模型与失败题位集合及集合 hash；服务端从已发布 completed 批次重建新 manifest，保留题目、路由、价格、分辨率、成功/unsupported 题位和原始图片，只把指定且已四次确认失败的题位重置为待执行，并把非目标 dispatch 审计账本原子继承到新批次。Worker 仍为 configured-disabled、并发 1、共享生产锁；新失败 marker 额外保存只含稳定 `SCIENTIFIC_V2_*` 代码的私有诊断，不进入公开 API。旧发布不原位改写，修正完成后必须重新双盲、仲裁并原子发布替代版本。

各端待办：
- [x] paperbanana-api / Benchmark Worker / 运维（修正冻结、精确继承、单并发补跑、私有失败代码及 TDD）
- [ ] 生产执行 / 审核 / 原子替代发布（仅 32 个指定失败题位；其余 328 个题位不得重跑）
- [x] Web / Gateway / 小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开 action 与字段暂不变，无需改造）

### [2026-09-01] V1 Benchmark 精确退役与 release tombstone — by Codex
变更：按站长明确删除要求，只针对已发布 V1 release `2688db534f05256b6ce25bbd29dc7d445052d347e576898962022e172900cdb2` 新增一次性退役链。退役前必须存在本机完整审计归档及逐文件 SHA-256 清单，并由只读 inspect 从 Mongo 与 OSS 重新枚举目标 run / sample / judgment / dispatch / public evidence、逐对象读回验 SHA、跨 release/记录计算引用数；apply 必须绑定 exact deployed SHA、当前 V2 release hash、归档 manifest hash 和 inspect inventory hash，只删除 V1 独占 `bench/objects/<hash>.png` 与 `bench/public/evidence/<sourceHash>/{thumbnail,detail,full}.webp`，共享对象保留。Mongo 删除仅使用 inspect 返回的精确 run IDs 与 release hash，保留 models/suite 和当前 V2，并在新集合 `paperbanana_benchmark_release_tombstones` 留下不含对象键的 hash/count/bytes tombstone。全程 Worker `configured-disabled`、`enabled=false`、并发 1、生产共享锁、Provider/Judge 调用 0。

各端待办：
- [x] Benchmark Worker / 运维代码（只读清单、共享引用保护、对象删除、Mongo tombstone、归档绑定及 TDD）
- [x] Web（移除总榜批次成功率条；动态详情链接经 200 静态入口恢复漂亮 URL；Top10 模型名可进入详情；动态深链回退不再显示假 404）
- [ ] 部署 / 生产退役（先发布 exact SHA 并运行 inspect；核对本地归档 `b91dcd6966c25f6b46ff0e759ed5f0de75d9caf3a5564171b8a1bdf910ba4e4c`、对象清单/字节/共享引用后再 apply；复验 V2、tombstone、旧 release/对象确已消失）
- [x] Gateway / 小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开 action 不变，无需改造）

### [2026-09-01] Scientific V2 原子发布验证接纳已审计的 unknown 对账链 — by Codex
变更：生产最终发布前检查发现 10 个曾暂停的 `UNKNOWN_PROVIDER_OUTCOME` 均已按既定规则完成零 Provider 调用、无候选产物的人工对账，并在签名最终 state 中转换为 `confirmed_technical_failure`，但不可变 dispatch marker 正确保留原始 `unknown_provider_outcome`，旧发布校验却要求 marker 与最终 attempt hash 完全相同，因而误拒绝合法批次。发布端现只在存在唯一、逐字段绑定 manifest/slot/attempt 的 `unknown_no_artifact_reconciliation` 审计时接受该差异，并复验原始 unknown、确认后失败、零候选/零 spool、凭据状态、时间、audit hash 与最终签名 state；缺失、额外或篡改审计仍拒绝。为准确区分冻结生成/评审数据面的 `executionCodeSha` 与修复后执行原子发布的代码，V2 release/methodology 新增 `publicationCodeSha`；manifest/execution SHA 保持原值。不修改题目、分辨率、四次上限、unknown 零自动重试、预算、评分或盲审。

各端待办：
- [x] paperbanana-api / Benchmark Worker（原子发布 ledger 对账、篡改回归测试）
- [x] Web / Gateway / 原生端（新增只读 provenance 字段 `publicationCodeSha`；现有 UI 无需改造）

### [2026-09-01] Scientific V2 公开证据结果改为容器直接保护落盘 — by Codex
变更：公开 WebP 全量重算与逐对象 SHA 已成功，但旧 workflow 依赖把完整 `{publishInput}` JSON 先装入远端 shell command-substitution、再复制到 root-only 文件；同时 `docker compose run -T` 仍继承 SSH heredoc 的 stdin，会把容器命令之后的落盘/验 hash/安装命令消费掉并以 0 退出，表现为图片已全部复验、GitHub 显示成功而发布输入不存在。容器命令现固定 `</dev/null`，并与既有 review 输出采用同一保护写入协议：容器以服务 UID 在独占 `0700` bind mount 内 `O_EXCL` 创建完整 `0600` publish input，stdout 只返回 hash 和计数；主机再验证所有字段、canonical hash、owner/mode/link 与字节稳定性后安装为 root `0600` 文件。Provider key 仍置空，Provider 调用固定为 0；不改图片、九题、十维、分辨率、评分、失败/unknown、盲审或原子发布规则。

各端待办：
- [x] Benchmark Worker / 部署运维（保护输出 sink、workflow 交接、174 项 Worker 与 37 项控制面测试）
- [x] paperbanana-api / Web / Gateway / 原生端（公开字段和访问方式不变；无需改造）

### [2026-09-01] Scientific V2 公开 WebP 幂等复验兼容 OSS 泛化重复响应 — by Codex
变更：生产只读复验发现阿里 OSS 对已经存在的确定性公开 WebP 有时仅返回无 status/code 的 `ResponseError`，旧 Worker 只把 `409/FileAlreadyExists` 识别为重复对象，因而在图片已存在且未丢失时误报 runtime failure；同一 SDK 的 buffered `get()`、开放式 Range 或无 Range `getStream()` 还可能在 HEAD/单字节 Range 均成功时中断或不结束完整对象流。公开 rendition 写入失败后现按刚生成的确定字节数使用 512 KiB 精确闭区间 Range 分块读取同一内容寻址对象，每块校验响应长度、最多尝试 3 次并丢弃不完整字节（仅重试零费用的 OSS 只读传输；不会重试 Provider），总字节仍硬限制 25 MiB（测试 store 无流接口时才回退 `get()`）；随后逐字节、SHA-256、`image/webp`、immutable cache-control、metadata hash 与 private ACL 复验。只有完全一致（或最小权限凭据精确返回 `403 AccessDenied`）才作为幂等成功，缺失、漂移或公开 ACL 仍失败。不重新生成模型图片、不改对象字节、题目、分辨率、评分、失败/unknown、盲审或发布规则。

各端待办：
- [x] Benchmark Worker / 部署运维（泛化重复响应复验、回归测试与零 Provider 重放）
- [x] paperbanana-api / Web / Gateway / 原生端（公开字段和访问方式不变；无需改造）

### [2026-09-01] Scientific V2 首次成功的 publish input 可零调用复验 — by Codex
变更：当前冻结批次的首次公开证据渲染已经把完整 `{batchId,objectBindings,evidence}` 结果持久化为生产机 root `0600` 文件；后续为了取回 hash 而重复运行图像转换，在已存在私有 WebP 的路径上返回了泛化 runtime error。新增只读复验入口，精确绑定 control/deployed SHA、immutable Worker digest、render bundle 与 manifest，在生产共享锁内使用 `O_NOFOLLOW` 读取原文件，重新计算 canonical `publishInputHash` 并仅输出 hash、evidence 数与 object binding 数；不打印对象键或证据内容，不改写 OSS/DB，不调用任何 Provider。最终 publish 仍由既有 staging 与管理员 action 对完整输入重新验签并原子发布。

各端待办：
- [x] 部署 / 运维（root-only publish input 只读复验与 37 项控制面测试）
- [x] Benchmark Worker / paperbanana-api / Web / Gateway / 原生端（公开字段、证据与评分规则不变；无需改造）

### [2026-09-01] Scientific V2 公开证据复验兼容审核后的批次状态 — by Codex
变更：生产复验发现同一冻结批次首次公开证据渲染已成功写入 325 个题位证据，但 A/B 双审把 API 控制状态推进到 `review_dispute` 后，Worker 的只读 completed-batch 查询仍只接受 `completed/review_ready`，导致幂等复验误报 `SCIENTIFIC_V2_PUBLIC_RENDER_BATCH_BINDING_INVALID`。查询现接受 `review_dispute/review_finalized/published` 等所有生成完成后的控制状态，同时继续精确绑定 batchId、manifestHash、stateHash，并强制内层签名 state.status 仍为 `completed`。不重新生成、不调用 Provider、不改图片、题目、十维评分、分辨率、失败/unknown、盲审或原子发布规则。

各端待办：
- [x] Benchmark Worker / 部署运维（后审核阶段只读证据复验与回归测试）
- [x] paperbanana-api / Web / Gateway / 原生端（公开字段和行为不变；无需改造）

### [2026-09-01] Scientific V2 争议导出复用 immutable Worker 正式入口并兼容 root UID — by Codex
变更：双审结果已形成 179 个既定争议项，但公开仲裁包被两个控制面假设拦截：生产 SSH 账号拥有临时回传目录时 UID 为 `0`，旧检查错误要求 UID 必须非零；同时 Worker 镜像只发布 esbuild 封装的 `dist/scientific-v2-operator.mjs`，并不存在旧脚本尝试直接 import 的 `dist/scientific-v2-review.js`。争议导出现与已验证的盲审分配导出一致接受任意纯数字的实际 owner UID/GID，并通过正式 `review_finalize` operator bundle 让 immutable Worker 在无网络、Provider key 置空的容器内验签 A/B 与重新计算争议，再将结果同已验签公开 assignment 做盲化绑定。目录非符号链接、模式 `0700`、文件逐字节 SHA 和 root-only 私有输入约束继续保留；争议集合、阈值、题目、分辨率、评分、签名与发布规则均不变。

各端待办：
- [x] 部署 / 运维（争议导出正式 Worker 入口、回传目录 owner 兼容与回归测试）
- [x] Benchmark Worker / paperbanana-api / Web / Gateway / 原生端（公开与共享契约不变；无需改造）

### [2026-09-01] Scientific V2 控制面 canonical JSON 与 Core 哈希排序一致 — by Codex
变更：盲审导出复核发现部分生产机 Python 交接脚本使用 Unicode code-point 键排序，而共享 `benchmark-core` 的冻结 hash 契约使用 JavaScript `localeCompare`；含 camelCase 邻接键（如 `sources/sourceSetHash`）时会把同一 JSON 误判为 hash 漂移。所有 Scientific V2 生成续跑、Codex 导入、公开渲染、review pack、A/B validation、review import、争议导出、仲裁导入和 publish input 的 Python canonical bridge 现对受限 ASCII schema 使用 case-fold 键序，并以跨 Node/Python fixture 证明输出与 Core 一致。既有 manifest/state/review hash、题目、分数和签名域不变，不重新生成或重签任何已冻结输入。

各端待办：
- [x] Benchmark Worker / paperbanana-api / 部署运维（全链路 canonical bridge 与跨运行时回归测试）
- [x] Web / Gateway / 原生端（公开数据和请求字段不变；无需改造）

### [2026-09-01] Scientific V2 证据统一保持私有并由 API 签名读取 — by Codex
变更：生产验证确认 benchmark OSS 桶级 ACL 已由 readiness 强制为 private，Worker 写入的原图和公开 WebP rendition 也都显式保持 private，但最小权限凭据无 `GetObjectACL`；旧 API 因逐对象 ACL 查询 `403 AccessDenied` 会在盲审分配导出阶段拒绝已经完成字节/hash/HEAD 元数据校验的对象，同时仍错误要求公开 rendition 为 `public-read`。`paperbanana-api` 现仅在精确 `AccessDenied + HTTP 403` 时把对象 ACL 标记为 `unavailable`，其他 ACL 错误继续失败；Scientific V2 原图与 rendition 都只接受 `private|unavailable`，明确拒绝 `public-read`，并继续逐对象验证字节 SHA、对象键、mime 与 cache-control。所有公开访问仍只通过 15 分钟签名 URL；九题、十维、盲审、失败记 0、预算与原子发布规则不变。

各端待办：
- [x] paperbanana-api / Benchmark Worker / 部署运维（私有证据策略、最小权限 ACL fallback、测试与生产部署）
- [x] Web / Gateway / 原生端（公开 URL 与 API 字段不变；无需改造）

### [2026-09-01] Benchmark Worker 的 SVG→PNG 路径显式绑定镜像内 Resvg WASM — by Codex
变更：生产冻结批次证明 OpenRouter `recraft/recraft-v4-pro-vector` 正常声明并返回 SVG 路线，但 Benchmark Worker 复用 API image runtime 时没有经过 API `main` 的启动初始化，`loadResvgWasm()` 因而错误回退到 Laf 专属 `/tmp/custom_dependency/.../index_bg.wasm`，导致已返回 SVG 在 PNG 导出前丢失并被记为 unknown。Worker authoritative runtime 与两类 Compose 服务现统一显式使用镜像内 `/app/node_modules/@resvg/resvg-wasm/index_bg.wasm`；一次性生产配置 workflow 先以 immutable Worker digest、`--network none` 验证该 WASM 文件，再在共享锁下原子更新 root `0600` `bench.env`，Provider 调用固定为 0。九题、十维、分辨率、路由、预算、重试/unknown、盲审和发布规则不变。

各端待办：
- [x] Benchmark Worker / 部署运维（Worker 默认路径、Compose 环境、生产现批次配置）
- [x] paperbanana-api / Web / Gateway / 原生端（API 已有自身 Resvg 初始化；公开契约不变）

### [2026-09-01] Scientific V2 UNKNOWN 经零产物人工对账后可从下一次尝试续跑 — by Codex
变更：当前冻结批次在 OpenRouter Recraft V4 Pro Vector 的首题返回 `UNKNOWN_PROVIDER_OUTCOME` 后按既定规则停机。只读对账 workflow `33453726938` 证明该请求时间窗内私有 OSS 新对象为 0、主机 artifact spool 文件为 0、未遗留 started dispatch，且三家凭据出口均为 HTTP 200。新增一次性、精确绑定 control/deployed SHA、Worker/Core digest、manifest/state/hash 与该对账 run ID 的人工恢复入口：它在生产共享锁下把原 unknown attempt 完整写入独立 immutable reconciliation audit，再将同一 attempt 归类为已人工确认的 technical failure，保留保守费用并从 attempt 2 续跑；绝不自动重试 unknown、绝不从 attempt 1 重发、Provider 并发仍为 1。九题、十维、分辨率、路由、预算、失败四次记 0、双盲审和原子发布规则不变。

各端待办：
- [x] 部署 / 运维（零产物人工对账、不可变审计、精确 CAS 与冻结批次续跑）
- [x] Benchmark Worker / paperbanana-api / Web / Gateway / 原生端（公开与共享契约不变；无需改造）

### [2026-09-01] Scientific V2 私有 draft asset 下载适配 GitHub installation token — by Codex
变更：正式 provider full 成功后，GPT Image 2 私有转运在 GitHub draft release binary 下载处收到 `403 Resource not accessible by integration`；release/asset ID、目标 SHA、大小与 SHA-256 均由本地授权态复核无漂移，未进入 SSH 或状态写入。GitHub 对 draft binary 的 installation token 要求 release-write scope，因此只有四个实际 GET 私有 draft asset 的封闭 workflow 将 `contents` 从 read 调整为 write；命令仍只允许精确 release/asset GET，静态测试禁止 release mutation 与 POST/PATCH/DELETE。旧部署还未预建首次使用的 `codex-artifacts` 子目录，staging 现只对该精确路径做 root `0700` 安全创建，并允许 9 PNG + metadata 全字节/hash/权限一致时幂等重放；任何部分或漂移内容仍拒绝。其他 workflow 权限不变，不重生成图片、不调用 Provider。

各端待办：
- [x] 部署 / 运维（Codex/admin/reviewer/arbitration 私有 draft 下载权限与只读命令门禁）
- [x] Benchmark Worker / paperbanana-api / Web / Gateway / 原生端（数据与公开契约不变；无需改造）

### [2026-09-01] Scientific V2 公开渲染修正 batchId 层级并为冻结批次提供专用 runner — by Codex
变更：发现旧 host operator 在 `render_public_evidence` 已完成 WebP 写入后错误读取不存在的顶层 `batchId`；Worker 的真实封闭 schema 为 `{operation,providerCalls,publishInput,publishInputHash}`，batch ID 位于 `publishInput.batchId`。未来 operator 已按该 schema 修正。为不改变当前冻结 manifest 的 `codeSha=5d9f42e…` 与 immutable Core/Worker digest，新增独立控制面 runner：绑定 current control SHA 与 frozen deployed SHA/镜像/manifest/bundle，使用生产共享锁、Provider key 强制置空、单次 1800 秒窗口运行同一冻结 Worker，重新计算 `publishInputHash` 后把完整结果持久化为 root `0600`。不重跑生成、不改 state、评分或证据字节。

各端待办：
- [x] 部署 / 运维（未来 operator 层级修复、当前冻结批次专用零 Provider render runner 与静态安全测试）
- [x] Benchmark Worker / paperbanana-api / Web / Gateway / 原生端（Worker/API 数据契约未变；无需改造）

### [2026-09-01] Scientific V2 公开证据 publish input 在生产机内封闭交接 — by Codex
变更：新增零 Provider 的 publish input staging。它只读取精确 `render_public_evidence` bundle 对应的 root `0600` `publish-input.json`，绑定 deployed SHA、immutable Worker digest、manifest 与 `publishInputHash`，重新计算 canonical hash 后仅把 `{batchId,objectBindings,evidence}` 写入生产机 root `0600` 管理员输入。公开 WebP 的对象/hash 清单在最终 `publish` 管理员 action 中与 DB、双审/仲裁重新计算并原子插入 release；CI、日志和外部草稿资产都不承载该完整输入。

各端待办：
- [x] 部署 / 运维（公开证据 publish input root-only handoff 与静态安全测试）
- [x] Benchmark Worker / paperbanana-api / Web / Gateway / 原生端（现有原子发布与公开接口契约不变；无需改造）

### [2026-09-01] Scientific V2 Worker 仲裁证明在生产机内重签为 API 导入证明 — by Codex
变更：新增零 Provider 的仲裁结果导入 staging。它绑定精确 `review_arbitrate` bundle、对应 root `0600` `review-arbitrated.json`、Worker arbitration/attestation hash、manifest 与 immutable Worker digest，先以 review signing secret 复验 Worker 的完整性证明；随后把已验证的 xhigh 结果加上 batch/sourceSet 上下文，按 API 既有 schema 重新计算 `arbitrationHash` 和专用 HMAC，并只写入生产机 root `0600` 管理员输入。两种 hash 域不混用，密钥和争议详情不进入日志。

各端待办：
- [x] 部署 / 运维（Worker 仲裁证明到 API 导入证明的域分离验签与静态安全测试）
- [x] Benchmark Worker / paperbanana-api / Web / Gateway / 原生端（现有仲裁导入、评分与公开接口契约不变；无需改造）

### [2026-09-01] Scientific V2 xhigh 仲裁回传绑定双份已验签结果 — by Codex
变更：新增零 Provider 的 `review_arbitrate` bundle staging。仅接受精确 draft asset 中封闭 schema 的 `reasoningEffort=xhigh` 仲裁结果，绑定 deployed SHA、manifest、两份独立 `review-validated` 文件、A/B result hash 与 sourceSetHash，并在生产机内加入 review signing secret 形成 root `0600` bundle。immutable Worker 后续会重新计算既定争议集合并拒绝缺失、额外或重复 item；automatic Judges 固定为空，Reviewer 身份、模型映射与签名密钥不进入 artifact 或日志。

各端待办：
- [x] 部署 / 运维（xhigh 仲裁回传闭合 schema、双审绑定与静态安全测试）
- [x] Benchmark Worker / paperbanana-api / Web / Gateway / 原生端（现有仲裁、评分与公开接口契约不变；无需改造）

### [2026-09-01] Scientific V2 争议包由 immutable Worker 离线派生并保持盲化 — by Codex
变更：新增零 Provider 的 A/B 争议导出控制面。它绑定精确 `review_pack`、两份 `review-validated` 结果、manifest、Worker digest 与各自 result hash，在 `--network none` immutable Worker 内重新验签双审、固定 automatic Judge 为 0，并按既定 `>2 分 / 红线冲突 / 低置信度` 规则派生争议。CI 仅获得保留 1 天的去模型身份 `public-arbitration.json`；`modelKey/runHash/privateMappings/privateEnvelope/attestationSecret` 均禁止出现在 artifact。无争议时明确返回 `canFinalize=true`，有争议时只供 `gpt-5.6-sol xhigh` 仲裁，不改变评分或发布公式。

各端待办：
- [x] 部署 / 运维（盲化争议 artifact、immutable Worker 双审验签与静态安全测试）
- [x] Benchmark Worker / paperbanana-api / Web / Gateway / 原生端（现有争议阈值、仲裁与公开接口契约不变；无需改造）

### [2026-09-01] Scientific V2 已验签 A/B 结果在生产机内转管理员导入 — by Codex
变更：新增零 Provider 的 Reviewer 结果导入 staging。它只读取精确 `review_validate` bundle 对应的 root `0600` `review-validated.json`，绑定 deployed SHA、Worker digest、manifest、role、result hash 和 result attestation hash，并使用生产 review signing secret 重新验签；随后在生产机内生成 `{batchId,result}` 管理员输入，全程不经 CI artifact、SCP 或外部草稿资产。automatic Judge 固定为 0，双审、争议阈值、九题、十维、分辨率、路由、预算、失败/unknown 与发布规则不变。

各端待办：
- [x] 部署 / 运维（A/B 验签结果 root-only 管理员导入与静态安全测试）
- [x] Benchmark Worker / paperbanana-api / Web / Gateway / 原生端（现有审核导入与公开接口契约不变；无需改造）

### [2026-09-01] Scientific V2 Reviewer A/B 回传增加私有映射复合验签 — by Codex
变更：新增零 Provider 的 `review_validate` bundle staging。每个 Reviewer 只回传一份封闭 schema 的去身份化公共 assignment 与逐包评分；受保护 workflow 绑定精确 draft asset、deployed SHA、manifest、原 `review_pack` bundle 和 `privateBundleHash`，仅在生产机内恢复对应 A/B 的 `privateMappings/privateEnvelope`，复验 assignment HMAC、包集合与 object mapping 后生成 root `0600` 验证 bundle。Reviewer 永远看不到模型映射或签名密钥；automatic Judge 固定为 0，九题、十维、分辨率、路由、预算、失败/unknown 与争议阈值不变。

各端待办：
- [x] 部署 / 运维（A/B 回传闭合 schema、生产机复合验签与静态安全测试）
- [x] Benchmark Worker / paperbanana-api / Web / Gateway / 原生端（现有审核导入与公开接口契约不变；无需改造）

### [2026-09-01] Scientific V2 A/B 盲包导出保持私有映射留在生产机 — by Codex
变更：新增零 Provider 的 A/B assignment 导出控制面。它使用已完成批次的精确 `review_pack` bundle 在 immutable Worker 中离线重放并核对 `privateBundleHash`，把带 `privateMappings/privateEnvelope` 的两份完整 assignment 与原图 object binding 分别写入生产机 root `0600` 管理员输入；CI 仅上传不含模型映射的 A/B 公共盲包，保留期 1 天。该步骤固定 automatic Judge 为 0，不调用 Provider，不发布 release，也不改变九题、十维、评分、分辨率、路由、预算、失败或 unknown 规则。

各端待办：
- [x] 部署 / 运维（生产机私有 assignment、短期公共盲包 artifact 与静态安全测试）
- [x] Benchmark Worker / paperbanana-api / Web / Gateway / 原生端（现有审核与公开接口契约不变；无需改造）

### [2026-09-01] Scientific V2 盲审前公开证据渲染增加受保护 staging — by Codex
变更：新增零 Provider 的 `render_public_evidence` bundle staging。仅在最终 `state=completed`、operator attestation HMAC、manifest/state/code lineage 与 immutable Worker digest 全部精确绑定时，生成 root `0600` 的离线渲染 bundle；后续只把已验 hash 的私有原图派生为内容寻址 WebP variants，供 A/B 盲审读取。该入口不能发布 release、不能写入评分、不能调用 Provider，也不暴露模型映射、Reviewer 身份或内部对象键；九题、十维、分辨率、路由、预算、失败/unknown 与双独立盲审规则均不变。

各端待办：
- [x] 部署 / 运维（公开 WebP rendition bundle staging 与静态安全测试）
- [x] Benchmark Worker / paperbanana-api / Web / Gateway / 原生端（现有证据与排行榜契约不变；无需改造）

### [2026-09-01] Scientific V2 结果导入与盲审 pack 增加受保护 staging — by Codex
变更：新增两个零 Provider 控制面入口。其一只从精确 GitHub draft asset 接受 `import-worker/import-codex/export-review/import-review/import-arbitration/publish` 六类封闭 JSON schema，绑定 deployed/control SHA、asset ID/名称/大小/SHA 后落入 root `0600` 管理员输入；拒绝 attestation secret 与 Provider/访问密钥字段。其二只在最终 `state=completed`、operator attestation HMAC 与 manifest/state/code lineage 全部通过时，通过已部署的 immutable Worker、`--network none` 和现有 `createScientificReviewPacket/createScientificReviewSourceBindings` 派生 `review_pack` bundle；A/B seed 固定、automatic Judge 调用固定 0。两者均使用生产共享锁，不改题集、路由、预算、分辨率、失败/unknown 或评分规则。

各端待办：
- [x] 部署 / 运维（私有管理员 JSON staging、离线 review pack staging 与静态安全测试）
- [x] Benchmark Worker / paperbanana-api / Web / Gateway / 原生端（现有导入/审核/公开契约不变；无需改造）

### [2026-09-01] Scientific V2 Codex 九图导入绑定补齐只读 metadata — by Codex
变更：GPT Image 2 私有交接目录除 9 个内容寻址 PNG 外，固定保存已验签 `metadata.json`（root:service-group `0440`），用于绑定每题 task/thread provenance、调用时序、实际像素、格式、字节和 SHA。新增零 Provider 的导入 bundle staging workflow：只在生产共享锁内读取精确 manifest/state/operator-attestation/metadata 文件 hash，验证 batch 已进入 `awaiting_artifacts`、Worker disabled/并发 1、代码和镜像 digest、operator attestation HMAC 与 9 个 Codex 槽位顺序，再生成 root `0600` 的 `import_codex` bundle。不得读取或传入三家 Provider 密钥；不修改九题、十维、分辨率、预算、重试或 unknown 规则。

各端待办：
- [x] 部署 / 运维（metadata 私有持久化、Codex import bundle staging 与静态安全测试）
- [x] Benchmark Worker / paperbanana-api / Web / Gateway / 原生端（导入与公开契约不变；无需改造）

### [2026-09-01] Scientific V2 GPT Image 2 原图使用私有草稿资产交接 — by Codex
变更：Codex 内置 `gpt-image-2` 的 9 张已审计原始 PNG 不进入 Git、不进入公开 release，也不经公网匿名 URL。新增受保护 workflow 只接受一个精确 GitHub draft release asset ID，绑定 deployed/control SHA、manifest、Worker digest、资产名称/大小/SHA 与 metadata SHA；下载后在生产共享锁内再次验证 Worker disabled/并发 1、归档固定 11 个成员、9 个内容寻址 PNG 的逐文件 SHA/字节和只读 metadata，再原子放入该 manifest 专属的 root:service-group `0550` 目录，文件为 `0440`。交接全程零 Provider 调用，批次未进入 `awaiting_artifacts` 前不会导入或改写 state；草稿资产在成功导入后删除。

各端待办：
- [x] 部署 / 运维（draft-only 私有交接 workflow 与静态安全测试）
- [x] Benchmark Worker / paperbanana-api / Web / Gateway / 原生端（执行与公开契约不变；无需改造）

### [2026-09-01] Scientific V2 正式 Provider 等待窗冻结为 300 秒 — by Codex
变更：生产 full 批次在 `qwen-image-3.0-pro` 编辑题精确运行到旧默认 120 秒后进入 `UNKNOWN_PROVIDER_OUTCOME`；只读人工对账已证明该 attempt 时间窗内私有 OSS 与受保护 spool 均无候选原图，三家凭据/出口均为 200。正式评测现在把每次 Provider 请求等待窗显式冻结为 300 秒，并限制可配置范围为 120–600 秒；运维 operator 固定传入 300000ms。30 秒 claim 心跳、并发 1、最高 2K/默认尺寸实测、九题十维、确认失败最多四次、unknown 零自动重试、预算与 canonical 路由全部不变。旧暂停批次仅保留审计；新代码 SHA 重新冻结整批执行。

各端待办：
- [x] paperbanana-api authoritative image runtime（300 秒默认值与 120–600 秒 fail-closed 边界 TDD）
- [x] Benchmark Worker / 部署运维（正式 operator 显式注入 300000ms；30 秒心跳不变）
- [x] Web / Gateway / 原生端（公开接口与 UI 无变化；无需改造）

### [2026-09-01] Scientific V2 unknown 对账改用已持久化 attempt 时间窗 — by Codex
变更：`UNKNOWN_PROVIDER_OUTCOME` 按规则原子写入 batch state 后，其 `started` dispatch marker 会随事务正常清理；旧只读失败检查却仍强制要求 marker 存在，因此无法检查已经暂停的 unknown 是否在私有 OSS 或受保护 spool 留下可恢复原始图片。检查 workflow 现在要求恰好一个 `status=unknown` 槽位和 `responseClass=unknown_provider_outcome` attempt，使用该 attempt 已签名状态中的 `startedAt/completedAt` 作为有界候选时间窗；若旧 marker 偶然仍存在则必须与 slot/attemptIndex 精确一致。整个操作只读、零 Provider 调用，不改变 unknown 零重试、题集、预算、路由或记分规则。

各端待办：
- [x] 部署 / 运维（只读 workflow 与 TDD；用于当前暂停批次人工对账）
- [x] Benchmark Worker / paperbanana-api / Web / Gateway / 原生端（数据与公开契约不变；无需改造）

### [2026-09-01] Scientific V2 百炼应用层失败保留可确认状态 — by Codex
变更：生产 full 批次已成功持久化 20 张原始图片，但 `qwen-image-3.0-pro` 首题遇到百炼 HTTP 200 包内的 `status_code/code` 错误时，legacy authoritative image runtime 只抛出无状态的普通 Error，Worker 因此按安全规则记录为 `unknown_provider_outcome` 并暂停。现在百炼明确声明的非 200 `status_code` 保留其 4xx/5xx 状态，只有 `code` 的应用层拒绝映射为 422；Worker 既有可信 own-property status 门禁会将其作为 confirmed failure，仍按最多 4 次总尝试处理。网络断开、超时、无响应等真正不确定结果仍不携带 status，继续零重试并暂停。同期 GPT Image 2 内置审计 9/9 一次成功，但内置渠道不提供尺寸参数；Codex importer 因而移除旧的 2048×1024 最低门槛，只对该固定默认尺寸渠道完整解码并记录真实像素、格式、字节和 SHA。三家可配置 provider 仍按冻结 route 请求最高 2K，并同样记录实际像素。九题、十维、canonical 路由、预算和评分规则均不变；旧 unknown 批次保留审计，不改写状态，修复后使用新代码 SHA 冻结新批次。

各端待办：
- [x] paperbanana-api / Laf authoritative image runtime（HTTP 200 应用层错误 403/422 RED/GREEN；API 357 tests）
- [x] Benchmark Worker（own-property status 与 unknown 防伪门禁不变；Codex 默认尺寸实测像素导入 RED/GREEN）
- [ ] 部署 / 运维（Core/Worker 以同一新 immutable SHA 部署后重新刷新价格、冻结并执行 V2）
- [x] Web / Gateway / 原生端（公开 API 与 UI 契约不变；无需改造）

### [2026-09-01] Scientific V2 私有证据在无 GetObjectACL 权限时做同字节 ACL 重申 — by Codex
变更：生产 Benchmark OSS RAM 用户可正常 Get/Put 私有内容寻址对象，但缺少独立 `oss:GetObjectAcl`，导致固定编辑源图已存在时被误判为本地产物对账失败；已生成的方舟编辑 PNG 因此只进入受保护 spool，没有丢失或重复调用 Provider。Worker 现在仅在 GetObject/GetStream 得到的字节、SHA-256、MIME、`private, no-store` 和内容寻址键全部精确匹配，且 GetObjectACL 明确返回 403 `AccessDenied` 时，使用同一字节、同一元数据幂等覆盖并重申 `private` ACL。任何内容/元数据差异、未知 ACL 错误或重申写入失败仍 fail closed；不降低私有证据规则，不改变九题、十维、路由、分辨率、重试、预算或公开 API。

各端待办：
- [x] Benchmark Worker（生成持久化与盲审读取两条路径 RED/GREEN；165 tests、check、build）
- [ ] 部署 / 运维（部署新 immutable Worker/Core provenance 后冻结新批次；旧暂停批次仅保留审计，不跨 SHA 续跑）
- [x] paperbanana-api / Web / Gateway / 原生端（公开契约不变；无需改造）

### [2026-09-01] Scientific V2 百炼 direct-edit 固定源图改用私有 OSS 公网签名 URL — by Codex
变更：生成题已恢复并取得百炼/方舟 2048×1152 与 OpenRouter 默认 1824×1024 的原始 PNG；首个百炼编辑题仍在 authoritative runtime 的 source-image 交接阶段失败。Worker 现在把 hash 固定的 2K PNG 编辑源图写入原有私有内容寻址对象，仅在百炼 direct-edit 调用前通过独立 `PAPERBANANA_BENCH_OSS_PUBLIC_ENDPOINT` 生成最长 900 秒的 V4 GET 签名 URL；legacy source normalizer 会先下载并校验该 URL 的像素字节，但为百炼保留原始 HTTPS，不再转回 data URL 后二次调用被禁用的 Laf storage。签名 URL 不落状态、不写审计、不进入公开证据。方舟/OpenRouter 编辑输入、题集、十维评分、路由优先级、失败/unknown 策略和分辨率规则均不变。签名或源图落盘在 provider 调用前失败时记为零费用 confirmed technical failure，确保不会把本地交接错误误报成 provider unknown。

各端待办：
- [x] Benchmark Worker（私有源图持久化、独立公网 signer、900 秒边界、零调用本地失败 TDD）
- [x] paperbanana-api authoritative runtime（已校验的远端 source URL 原样交给百炼，data URL 路径仍保持原有私有落盘行为）
- [ ] 部署 / 运维（Worker `run` secret 必须提供和 internal endpoint 不同的 HTTPS `PAPERBANANA_BENCH_OSS_PUBLIC_ENDPOINT`；部署同 SHA 后冻结新批次）
- [x] Web / Gateway / 原生端（公开 API 与 UI 契约不变；无需改造）

### [2026-09-01] Scientific V2 full 暂停态保留已完成 canary 终态 — by Codex
变更：canary-only 会先在执行序列后部留下其他 Provider 的成功 canary；full 从前部普通题位恢复后若遇到 unknown、价格/产物对账或预算门，状态机必须把后续未执行槽位置为 `not_executed`，但保留此前已经成功的 provider canary（以及由已确认失败 canary 派生的精确 route 失败终态）。此前 Worker/Core 镜像 verifier 错误要求中断槽位后的所有槽位一律为 `not_executed`，导致合法暂停态被拒绝并留下 started dispatch。现在两端只为经过既有 canary 证明的终态开放该例外；其他乱序终态仍 fail closed，unknown 零重试和九题/十维规则不变。

各端待办：
- [x] Benchmark Worker（canary → full → unknown RED/GREEN；本地 state verifier）
- [x] paperbanana-api / Laf Core（镜像 imported-state verifier 同步并由同一测试覆盖）
- [ ] 部署 / 运维（先对账当前 started dispatch；部署同 SHA Core/Worker 后冻结新批次重跑）
- [x] Web / Gateway / 原生端（公开契约不变；无需改造）

### [2026-09-01] Scientific V2 authoritative image runtime 恢复受限 PNG/JPEG 解码 — by Codex
变更：Benchmark Worker 动态加载由 `paperbanana-api` 构建的 authoritative image runtime 时，legacy Laf 模块会在进程级阻断 `VipsForeignLoad`，此前只重新放行 WebP，导致三家 Provider 已返回的 PNG/JPEG 在 Worker 原始字节检查阶段统一被误判为技术失败并触发重试。专用 image-runtime 入口现在只重新放行受 Worker 25 MiB / 4000 万像素 / 完整容器校验保护的 PNG、JPEG、WebP buffer loader；SVG 等其他 Sharp foreign loader 继续保持阻断。题集、路由、预算、失败/unknown 策略、API 与公开字段均不改变。

各端待办：
- [x] paperbanana-api image runtime / Benchmark Worker（隔离 RED 测试、PNG/JPEG/WebP 通过且 SVG 仍阻断；API/Worker test/check/build）
- [x] 部署 / 运维（已部署含新 `dist/image-runtime.mjs` 的 immutable Worker；旧 `0 succeeded / 33 failed` 批次保留失败审计；新批次三家正式 canary 均通过 full 门禁）
- [x] Web / Gateway / 原生端（公开契约不变；无需改造）

### [2026-08-31] Scientific V2 legacy recovery 允许一次 pre-execution SHA 迁移 — by Codex
变更：旧 `blocked/provider_canary_failed` 批次可能已被一次只读 attestation 过早写入 recovery `executionCodeSha`，但尚无任何导入的 Worker state report。Core 现在仅在原 blocked state/hash 完全未变、`revision=0`、`latestStateReportHash=null`、不存在 `started` dispatch、原 `legacyRecoveryStateHash` 精确匹配、目标 SHA 不回退到 manifest SHA 且从未迁移过时，允许以 CAS 将 `executionCodeSha` 迁移一次，并写入内部 `lineageRecoveryRotationUsed=true`。`beginDispatch` 在事务内以同一 batch CAS 设置内部 `activeDispatchId`，并绑定当时的 `executionCodeSha`；commit/unknown 在同一事务清除 reservation，rotation 则要求 reservation 不存在。因此 dispatch 与 SHA 迁移只能有一个先成功，stale claim 或跨集合检查竞态不能继续调用 Provider。后续 SHA 再漂移、任何 state/dispatch 进展或普通批次仍 fail closed。

兼容边界：operator attestation、Worker report、公开 release/API 字段均不变；内部布尔位不进入 state、HMAC payload 或公开投影。迁移本身零 Provider 调用，只修复 attestation 与实际执行之间的不可变代码绑定时点。

各端待办：
- [x] paperbanana-api / Laf Core（受约束 CAS 迁移、竞态处理、TDD）
- [ ] 部署 / 运维（部署同一 immutable Core/Worker 后重新 attest；成功导入 revision 1 后不可再迁移）
- [x] Benchmark Worker / Web / 原生端（契约不变；无需改造）

### [2026-08-31] Scientific V2 attestation 导出内容寻址 state snapshot — by Codex
变更：内部 `operatorAttestation` 在完整验证 DB 中 frozen manifest/state 与 `stateHash` 后，额外返回深拷贝冻结的 `stateSnapshot`。香港 admin operator 的 `attest` 仅在 root 私有通道接收该快照，独立写入 `0600` 内容寻址 `*.state.json`，stdout 只新增 `stateBundleSha256`，不输出 state 内容。run-bundle stager 继续以 state 文件 SHA、canonical state hash 与 attestation 中已签名的 `stateHash` 三重校验后组装执行包。

兼容边界：公开 leaderboard/methodology/model profile 不投影 `stateSnapshot`；普通用户请求与现有 attestation HMAC payload 不变。此能力只补齐旧失败运行已写 DB、但 host 未留下 state 文件时的零 Provider 调用恢复路径。

各端待办：
- [x] paperbanana-api / Laf Core（state 完整 verifier、冻结快照、公开投影隔离与 TDD）
- [x] 部署 / 运维（root `0600` 内容寻址落盘、安全摘要与合同测试）
- [x] Benchmark Worker / Web / 原生端（执行与公开请求契约不变）

### [2026-08-31] Scientific V2 canary 失败仅按精确 route identity 审计归零 — by Codex
纠正：单个 provider canary 槽位四次 confirmed failure 只证明精确 `{provider, canonicalModelId}` route identity 本次不可用。仅同时匹配该 provider 与 canonical model 的其他 supported 槽位可派生为 `failed + attempts=[] + costCny=0`；同 provider 的其他 canonical models，以及不同 provider 上的同一 canonical model，都必须继续真实执行，不能被归零或跳过。`providerCanaryAttestation.passed=false` 仍如实绑定 canary 事实，不代表 provider 内所有模型或该 canonical model 的其他路由失败。

兼容边界：旧 `blocked/provider_canary_failed` 状态继续仅用于恢复；unknown provider outcome 仍整批暂停且零重试；双 SHA 与 legacy recovery lineage 不变。公开失败原因仍为 `provider_canary_confirmed_failed`，但其归属严格由已验证 state 中相同 `{provider, canonicalModelId}` 的失败 canary 决定，预算/unknown/reconciliation 绝不折算为零。

各端待办：
- [x] paperbanana-api / Laf Core（镜像 verifier、report import、review/publish 与跨 provider/canonical TDD）
- [x] Benchmark Worker（runner/state verifier 以精确 `{provider, canonicalModelId}` 传播，并覆盖跨 provider 同 canonical 路由继续执行）
- [ ] 部署 / 运维（仅在 Worker/Core 同一 immutable SHA 且全量验证后恢复）
- [x] Web / 原生端（公开字段不变；无需请求改造）

### [2026-08-31] Scientific V2 manifest / execution 双 SHA 与一次性 legacy recovery lineage — by Codex
变更：Scientific V2 不再使用含义模糊的单一公开 `codeSha`。内部 operator attestation、state operation report、Core import/publish 绑定 `manifestCodeSha`、`executionCodeSha`、`legacyRecoveryStateHash`：普通执行必须两 SHA 相等且 recovery hash 为 null；仅 verifier 精确确认的旧 `blocked/provider_canary_failed` 状态可在首次恢复时绑定当时 state hash，并在同一 batch 后续阶段保持不可变 lineage。

公开契约：Scientific release 与 methodology 仅公开 `manifestCodeSha`、`executionCodeSha`、`legacyRecovery` 布尔值；不公开内部 state hash，也不再输出模糊单 `codeSha`。重新签 hash 但夹带 `codeSha/stateHash` 的 Scientific release 仍 fail closed。

各端待办：
- [x] paperbanana-api / Laf Core（lineage 原子固定、report/import/publish 精确校验、公开投影与 TDD）
- [x] Benchmark Worker（run bundle、state report 三字段与恢复续跑一致性）
- [x] 部署 / 运维（attest/stager/operator exact schema 与 immutable execution SHA）
- [x] Web / 原生端（字段为公开只读元数据；现有榜单无需请求参数变更）

### [2026-08-31] Scientific V2 provider canary 失败的分 provider 归零执行语义 — by Codex
变更：Benchmark Worker 不再因某 provider canary 的四次已确认失败而阻断整个批次。失败 canary 保留四次完整 attempts；同一 provider 的其余 supported slot 写入 `failed`、零 attempts、`costCny=0`，作为固定九槽的可审核零分结论，并不再调用该 provider。Ark/OpenRouter 可继续执行；unknown provider outcome 继续保持整批 `paused/reconciliation_required` 与零重试。旧的 `blocked/provider_canary_failed` 状态仍通过 verifier，以支持生产恢复。该语义已被上方“精确 route identity 审计归零”条目纠正。

契约（影响 Worker / Core API / 运维）：
- **state/report**：`providerCanaryAttestation.passed` 现在可为 `false`，但仍由完整 canonical state/report HMAC 绑定；新状态中 failed canary 必须恰为四次 confirmed failure，派生的同 provider 零 attempt failed 仅在非旧 blocked 状态合法。`canary_complete` 可包含一个此类失败 canary，后续 full 不得重派该 provider。该传播范围已被上方纠正条目收窄为精确 `{provider, canonicalModelId}`。
- **兼容边界**：Core API 的导入、review-ready、发布与公开 failure reason 必须同步接受并如实展示该可审核零分状态；在同步前不得把 Worker partial state 导入生产。

各端待办：
- [x] Benchmark Worker（runner、state verifier、state report、原子仓储 TDD）
- [x] paperbanana-api / Laf Core（镜像 verifier、state report/import/publish 与公开 failure reason）
- [ ] 部署 / 运维（仅在同一 immutable SHA 的 Worker+Core 都发布后恢复；旧 blocked state 仍可诊断/attest/stage）
- [x] Web / 原生端（公开客户端字段暂不变）

### [2026-08-31] Scientific V2 生产 canary 只读诊断契约 — by Codex
变更：内部 `adminBenchmarkControl` 新增 `operatorDiagnostic`（部署算子操作名 `diagnose`）。它严格只接受 `{batchId,manifestHash}`，以两者精确读取单一已冻结批次；零 provider 调用、零持久化写入。响应仅含批次/manifest/state hash、state 状态与 pause/block 原因、三家 provider 已花费/未核销金额、revision，以及每家 provider canary 的公开路由标识、case/slot、状态、次数、response class 与安全金额汇总。整个摘要以 canonical `diagnosticHash` 和独立域 HMAC `attestationHash` 绑定；不返回 payload hash、对象键、凭证、时间、评审身份或产物。

契约（影响其他端 / 共享）：
- **内部运维调用**：香港 `run-scientific-v2-admin-operator.sh --operation diagnose` 与受保护 workflow 使用既有 disabled-worker、单并发、同一生产锁及 root `0600` 输入边界；输入固定为上述两个字段，标准输出仅透传校验后的安全摘要，不创建私有结果文件。
- **兼容边界**：既有 `operatorAttestation` 与 stager 的请求/响应 schema 均未改变；此为内部管理命令，公开客户端与普通 benchmark action 无需接入。

各端待办：
- [x] paperbanana-api / Laf Core（精确读取、受限摘要、域隔离 HMAC、TDD）
- [x] 部署 / 运维（`diagnose` 选择项、两字段输入与安全响应校验、TDD）
- [x] Web / 原生端（不适用；无公开契约变更）

### [2026-08-31] 科研评测 v2 staging 使用完整私有 attestation — by Codex
变更：Scientific v2 admin operator 的 `attest` stdout 继续只暴露固定安全摘要，但 root `0600` admin-result 现在保存 Core 返回的完整 HMAC attestation（identity、daemon、并发、共享锁、provider budgets、Codex limit、revision/hash）；此前误把 allowlist 摘要保存为私有文件，导致 run-bundle stager 在任何 Provider 调用前因 attestation schema 缺字段失败。import-review/import-arbitration 的私有保存行为不变。

契约（影响科研 v2 运维）：
- stdout/public log 形状不变；仅受保护的 attest 私有 artifact 内容修正。stager 继续独立重算 HMAC 和全部 manifest/state/hash 门。

各端待办：
- [x] 香港 Scientific v2 admin operator / staging 合同测试
- [x] Core / Worker / Web / Gateway / 原生客户端（公开 API 与运行时字段不变，无需改造）
- [ ] 生产执行（部署同一不可变 SHA 后重新 attest/stage；失败 staging 未产生 Provider 调用）

### [2026-08-31] 科研评测 v2 受保护冻结请求体通道 — by Codex
变更：40 模型 Scientific v2 冻结信封约 1.70 MiB，超过 Core 普通 JSON 的 1 MiB 上限。Core 现仅对同时持有内部 gateway token、admin transport token 且声明 `x-paperbanana-scientific-v2-admin-operation: freeze` 的 localhost 冻结请求开放 8 MiB 上限；解析后再次要求 action/evaluationMode/command 精确为 `adminBenchmarkControl/codex_scientific_v2/freezeBatch`。其他请求继续使用 1 MiB，声明头不得复用于其他管理命令。补齐受生产 Environment、同一共享锁和精确 SHA/hash/phase 约束的 `stage-scientific-v2-run-bundle.yml` 手工入口，调用既有 root-only stager 将 frozen manifest/state 与 Core HMAC attestation 组装为内容寻址 canary/full bundle，阶段本身 Provider 调用为 0。

契约（影响 Core API / 科研 v2 运维）：
- `run-scientific-v2-admin-operator.sh` 的 freeze 调用新增内部声明头；非 freeze 阶段不发送。公开 API action、客户端字段和 CORS 不变。

各端待办：
- [x] paperbanana-api / 香港科研 v2 admin operator（受保护大请求解析、命令绑定、run-bundle staging workflow 与 TDD）
- [x] Web / Gateway / 微信小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开契约不变，无需改造）
- [ ] 生产执行（合并并部署同一不可变 SHA 后，重新 prepare/freeze；当前三家 Provider 调用仍为 0）

### [2026-08-31] 科研评测 v2 固定保守价格授权入口与 OpenRouter ¥360 硬上限 — by Codex
变更：新增 root-only `authorize-scientific-v2-price-snapshot` 生产入口。Worker 内置 77 条 exact `(provider, modelId, operation)` 保守 CNY 上界，根据已验签 registry authority、完整 official refresh report 与逐字节复验 captures 自动构造 extractor 实际仍 unresolved 的精确 requirement 集；拒绝未知 route/operation、缺失或额外 requirement、refresh/capturedAt/hash 漂移以及低于固定 map 的重签授权。授权与 signed snapshot 都以内容寻址 `0600` 落盘；宿主 wrapper 在同一生产共享锁内验证 HEAD、Core/Worker digest、running image/RepoDigest/build provenance、Worker disabled/concurrency 1 后先运行 authorization CLI，再调用既有 signer。GitHub workflow 只接收 SHA/digest/hash/固定确认词，signing secret 仅通过宿主受保护 env file 注入容器且不进入 argv/stdout；输出只含 authorization/snapshot hash、unresolved 数、三家 baseline/worst-case/cap 安全摘要。

契约（影响 Benchmark Core / Worker / Core API / 运维）：
- Scientific v2 provider budget 固定为 `bailian=180 / ark=180 / openrouter=360 CNY`；price preflight、batch manifest、API import、operator/stager 与公开 methodology 使用同一 provider-specific 值。baseline 必须不超过对应 cap；四次 attempt worst-case 继续只披露、不构成授权，runtime 每次 dispatch 前仍按对应硬上限停止。
- 保守 map 固定北京/官方 OpenRouter 路径与 USD×8 上界；FLUX provider-default 固定 output 4MP，仅 Flex edit 额外计入 2.359296MP source。UNKNOWN_PROVIDER_OUTCOME 仍零重试，并发 1、共享锁、常驻 Worker disabled 不变。
- price preflight schema 内预算从单值 `providerBudgetCnyAtoms` 改为 `providerBudgetsCnyAtoms`，每个 provider total 同时绑定自己的 `providerBudgetCnyAtoms`。

各端待办：
- [x] benchmark-core / Benchmark Worker / paperbanana-api（provider-specific cap、固定 map、严格 report/capture/authorization 验证与 TDD）
- [x] 香港部署代码（root CLI、共享锁 wrapper、固定 digest/provenance 门、手工 workflow 与合同测试）
- [x] Web / Gateway / 微信小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开 action 与客户端字段不变，无需改造）
- [ ] 生产执行（本条只提交代码；未部署、未读取真实 secret、未调用 Provider，必须以合并后的 immutable SHA/digests 和新鲜 authority/report 另行手工触发）

### [2026-08-31] 科研评测 v2 授权保守价格、三家 canary-only 与受保护宿主组装 — by Codex
变更：价格快照在 Ark/Krea 精确 raw-byte extractor 之外，允许 root-only signer 为仍未闭合的 requirement 使用显式 `operator_authorized_conservative_upper_bound`；授权文件绑定部署 SHA、canonical manifest、requirements、capture time、完整 unresolved requirementHash→unitCny 集合和固定确认词，并以 `operatorAuthorizationHash` 进入 price envelope 与 batch manifest，禁止 runtime/caller 临时选价。provider-default 固定以 2048×1152 预估，provider 成功后即使 artifact/spool/OSS 失败也按原始图片 width/height/hash 重算 actual CNY。新增固定官方源 refresh entry/workflow、root signer 镜像入口和 root run-bundle stager；secret 只从宿主受保护 env 读取，不进 argv/stdout。

契约（影响 Benchmark Core / Worker / Core API / 运维）：
- `ScientificV2BatchManifest` 新增必填 `priceOperatorAuthorizationHash`；价格 snapshot/envelope 新增 `operatorAuthorizationHash`。未使用上界时固定为 null，使用时必须与授权文件及所有 fallback observations 精确一致。
- `run` bundle 可带 `executionPhase=canary-only|full`。canary-only 仅按 Bailian→Ark→OpenRouter 执行每家首个 formal supported slot，成功即停该 provider 并形成 `canary_complete`；full 必须从该状态恢复且不重复 canary。每 provider ¥180、并发 1、共享锁及 UNKNOWN_PROVIDER_OUTCOME 零重试不变。
- admin attestation 安全响应新增 `revision/issuedAt`，以 `paperbanana/scientific-v2/operator-attestation/v1` 专用派生 key 签名并内容寻址落盘；`stage-scientific-v2-run-bundle.sh` 重算 canonical report/manifest/state/registry/price hash、验证 domain HMAC 与 disabled/concurrency/lock/budget 门后，才从 root-owned manifest/state/attestation 与本机 signing master 组装 run bundle，仅输出 `runBundleHash` 等安全摘要。
- registry authority 与 official refresh report 必须共享同一 `capturedAt`，Signer 与 Core freeze 的 freshness 门统一为 24 小时（恰好 24h 可接受，超过即拒绝），避免 refresh/人工 upper-bound staging 后出现 signer 可签但 freeze 因旧 5 分钟门失败。

各端待办：
- [x] benchmark-core / Benchmark Worker / paperbanana-api（授权上界、actual pixel reconciliation、canary state/resume、attestation 元数据与 TDD）
- [x] 香港部署代码（固定 URL 有界 refresh、root signer/stager、内容寻址 0600、workflow/合同测试）
- [x] Web / Gateway / 微信小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开 action 与客户端字段不变，无需改造）
- [ ] 生产执行（本条未提交/部署/读真实 secret/调用 Provider；合并后须先人工核验授权上界不低估，再以 immutable SHA/digests 执行 canary-only）
- [ ] 精确价格完善（完整百炼与非 Krea OpenRouter/MAI 仍须补 deterministic extractor；在完成前必须保留授权上界标记，不得宣称 exact）

### [2026-08-31] 科研评测 v2 固定官方价格 extractor、root signer 与实际像素费用对账 — by Codex
变更：Scientific V2 price snapshot 继续使用 schema v2，但新增 `canonicalManifestHash / capturesHash`，OpenRouter evidence 新增可空 `pricingPage`；签名 envelope 额外绑定 server-attested registry authority hash、captures hash 与 requirements hash。官方 refresh 固定使用火山方舟价格文档精确 URL，并为 Krea 2 Large / Medium / Medium Turbo 抓取精确详情页；raw bytes 经调用方保护 sink 持久化后，extractor 会重读并复验 byte size/hash，Ark exact production ID 与 Krea generation/style-reference 价格才可生成 observation。新增 official-only signer/落盘入口：复验 registry authority HMAC、code/manifest/capture/requirements、24h freshness，root-only 写入内容寻址 `0600` JSON，secret 不进入 argv/stdout。provider-default 预估固定 2048×1152；成功图片对 MP 计价或 Seedream 5 Pro 261 万像素阈值按原始 width/height/hash 重算 actual CNY，原有每 provider ¥180、UNKNOWN_PROVIDER_OUTCOME 零重试与 price-reconciliation 门不变。

契约（影响 Benchmark Core / Worker / 运维）：
- `ScientificV2PriceSnapshotV2` 顶层新增必填 `canonicalManifestHash / capturesHash`；`ScientificV2OpenRouterPriceEvidence` 新增必填但可为 null 的 `pricingPage`。所有消费者必须 exact schema 校验并重算 snapshot/envelope hash。
- 当前确定性 extractor 只闭合用户已授权的 Ark 四个 exact IDs 与 Krea 三个 exact IDs；百炼价格表、其他 OpenRouter endpoints、MAI token 上界及其余 provider-default MP 规则仍返回 `deterministic_official_price_extractor_unavailable`，official signer 对任一 unresolved 整体拒绝，因此尚未生成 production resolved snapshot。

各端待办：
- [x] benchmark-core / Benchmark Worker（固定来源 extractor、captures/manifest 绑定、root signer、实际像素对账与 TDD）
- [x] Web / Gateway / 微信小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开 action 与客户端字段不变，无需改造）
- [ ] 生产价格闭合 / 运维（补齐百炼、通用 OpenRouter/MAI 的 deterministic raw extractor 后重抓全部 77 requirements；在此之前不得签名完整 snapshot、prepare 或调用 Provider）

### [2026-08-31] 科研评测 v2 server-attested 生产桥、hash artifact 导入与受保护审核阶段 — by Codex
变更：科研 v2 新增 root-only prepare/admin host bridge。prepare 通过 localhost gateway/admin transport 读取当前 `modelRegistry`，只规范化 `registryVersion / routeContractVersion / providers.{bailian,ark,openrouter}` scientific subset，并由 Core 以现有 Bench review-signing master 的 registry 专用派生 key 绑定部署 SHA、当前 capturedAt 和 subset JSON bytes hash；缺任一三家或任一三家在 array/object `unavailableProviders` 中均拒绝。签名价格快照使用独立 domain key 验证，Actions 不接触 master secret。prepare 产出 root-owned `0600` 内容寻址 manifest/state/inspect/freeze/attest；inspect 可直接交 phase wrapper，freeze/attest 可直接交 admin wrapper。

契约（影响 Benchmark Worker / Core API / 运维）：
- 生产 Core 的 V2 `freezeBatch` 必须验证新鲜 registry authority、immutable code SHA 和 exact normalized registry bytes；caller 自证或重放旧 registry 不再可用。旧 V2 测试/非生产 repository 默认保持兼容，只有生产构造显式强制。
- 新增受保护内部 admin command `prepareScientificV2Registry`，继续复用既有 `adminBenchmarkControl` action 和 localhost admin transport，不新增公网 action。V2 admin wrapper 固定支持 `freeze / attest / import-worker / import-codex / export-review / import-review / import-arbitration / publish`，共享生产锁、root `0600` 输入、operation-specific stdout allowlist；发布只能走 Core API 原子事务。
- Codex 九图 JSON 不再搬运 base64；`import_codex` 只接受受保护 per-manifest 目录下的 `<sha256>.<png|jpeg|webp>` 引用。目录 root:service `0550`，文件 root:service `0440` 或 service `0600`；Worker 验 root/path inode 与时间戳、`O_NOFOLLOW`、单 hardlink、owner/mode、每图 25 MiB、总计 192 MiB、byte size/hash，并保留首题 canary/provenance。
- phase operator 新增 `review_validate / review_arbitrate`，内部组装 public/private assignment、验证 reviewer result HMAC 和 xhigh arbitration HMAC；private mapping、reviewer identity 与完整 validated/arbitrated/finalized body 只写受保护 `0600` 文件，stdout 仅 hash/count。admin import-review/import-arbitration 同样只持久化 root `0600` 完整结果，且逐 command 校验 Core 成功响应的必需字段，空 `data:{}` 不可成功。scientific workflow 新增必填 `expected_core_digest / expected_worker_digest` 64hex；prepare/admin/phase wrapper 同时核对 `.env`、running `.Config.Image`、RepoDigest、镜像内 build provenance，且实测 resident Worker disabled、concurrency 1。

各端待办：
- [x] Benchmark Worker / paperbanana-api（authority、prepare、artifactRef、review validate/arbitrate、atomic publish边界与TDD）
- [x] 香港部署代码（protected workflows、root wrappers、bootstrap/compose、共享锁、digest/secret/stdout/文件权限门）
- [x] Web / Gateway / 微信小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开 action 与客户端字段不变，无需改造）
- [ ] 生产执行（本条未提交、未部署、未调用 Provider、未读取真实 secret；须等权威价格 snapshot 全部 resolved 后，以合并后的 immutable SHA/digests 分阶段人工执行和浏览器验收）

### [2026-08-31] 科研评测 v2 权威价格证据、逐 route 输出档位与签名快照 — by Codex
变更：科研 v2 不再接受 caller 以 `sourceVerified:true` 自证的 CNY 单价。价格快照 v2 从 server-attested canonical manifest 唯一推导实际 `(provider, modelId, operation)`，为每条 physical route 固定输出请求档位（声明 2K 则 2K、仅 1K 则 1K、无 resolution 参数则 provider-default），生成和 direct-edit 必须分别有证据；编辑固定绑定 2048×1152 source hash。每条价格绑定原币、计价项/unit/variant、地区、官方 HTTPS URL、响应 bytes SHA-256/capturedAt；OpenRouter 额外绑定 models/endpoint 原始 pricing 与 ECB EUR 交叉 USD/CNY 汇率证据。CNY 以 1e-8 定点向上保守舍入，requirement/entry/preflight/snapshot 全部内容寻址。OpenRouter 多 variant 取请求档位下适用最高价，edit 累计适用 input image/reference/request；固定 1K/2K 像素不可由 caller 改小，provider-default 的 MP 或缺 token 上界均 unresolved 并整批停止。

契约（影响 Benchmark Worker / Core API / 运维）：
- `ScientificV2PriceSnapshot` 升级为 schema v2：顶层含 `imageSize=per-route / requirements / requirementsHash / entries / preflight / snapshotHash`；entry 含 `imageSize / billingRegion / outputWidth/Height / charges / source / openRouterEvidence / fxEvidence / originalCurrency / scenario / unitCnyAtoms / unitCny / rounding / entryHash`。
- execution slot 新增 `imageSize: 1K|2K|provider-default|null`，并进入 provider payload hash；Worker 与 Core API 必须 exact parity。旧 v1 benchmark 价格/授权契约保持不变。
- provider 预算仍为三家各 ¥180：prepare 只在全部固定 slots 的 baseline 超限时阻塞；同时披露每槽最多 4 次的 worst-case，实际 retry 每次仍在运行前计入同一硬上限。价格/汇率/像素/token 上界无法精确解析或 capture 漂移时 fail-close。
- price envelope 固定为 `scientific-v2-authoritative-price-v2`，绑定 code SHA、canonical manifest hash、snapshot hash/capturedAt；复用现有 review signing master，但先以 `paperbanana/scientific-v2/price-attestation/v2` 派生独立 domain key，禁止与 review/report/registry 签名互换。prepare 的 `createdAt` 必须直接使用该签名 snapshot 的 `capturedAt` 并再次精确校验，禁止依赖两个时钟的毫秒偶合。受保护 prepare 输入可含签名，公开/日志输出只能含 secret-free content-addressed snapshot/hash。
- OpenRouter `rawPricing` 的未知 billable/unit/variant 一律 fail-close，不再 filter 后忽略；官方 refresh 在读取前校验 `Content-Length`，并以 4 MiB streaming hard cap 读取和主动 abort。当前模块仅导出签名 verifier，不导出 caller observation 的生产 signer；refresh report 递归入口冻结且固定 `resolved:false`。未来 root signer 必须重读持久化 raw bytes、确定性解析全部官方来源并验证 `capturesHash` 后才能开放。

各端待办：
- [x] benchmark-core / Benchmark Worker（权威 schema、保守换算、baseline/worst-case preflight、逐 route lane、签名/过期验证、TDD）
- [x] paperbanana-api（freeze/import 对同一 snapshot、slot lane、payload hash exact parity）
- [x] Web / Gateway / 微信小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开 action 与客户端字段不变，无需改造）
- [ ] 生产价格 refresh / signer（必须以执行前 server-attested manifest 重抓并持久化 Alibaba Model Studio、Volcengine Ark、OpenRouter models/endpoints 与 ECB 原始 bytes，再由尚未实现的 deterministic extractor/root signer 重读、解析并绑定 capturesHash；当前 Ark exact endpoint/model 价、Krea 空 pricing、MAI token/部分 provider-default 上界等仍 unresolved，不得生成或签名完整 snapshot、不得调用 Provider）

### [2026-08-31] 科研评测 v2 七阶段受保护生产 operator 与持久 artifact spool — by Codex
变更：科研 v2 一次性 operator 从 `inspect/run` 扩展为 `inspect / run / reconcile_artifact / import_codex / render_public_evidence / review_pack / review_finalize` 七个固定阶段。每阶段均绑定精确部署 SHA、受保护 bundle SHA-256、registry/suite/price/manifest hash、模型数、常驻 Worker disabled、并发 1、香港生产共享锁和逐阶段确认短语；除 `run` 外均输出 `providerCalls=0` 证明。除 `inspect` 外六阶段缺少 `--apply` 会在任何主机/容器/DB/OSS/private handoff 前拒绝。`inspect` 与 review 两阶段使用不可变 Worker 镜像、只读根文件系统、`network none` 且不加载 Bench env；有网络但零 Provider 的导入/对账/渲染阶段会显式清空三家 Provider key。`render_public_evidence` 只产出 API publish input，禁止 operator 直写 release，最终发布仍由 Core API 事务原子完成。

契约（影响 Worker / 运维）：
- 新增运行时 env `PAPERBANANA_SCIENTIFIC_V2_ARTIFACT_SPOOL_DIR`，仅 `run/reconcile_artifact` 由 host wrapper 固定为容器内 `/var/lib/paperbanana/scientific-v2-artifact-spool`，精确映射宿主机 `/opt/paperbanana/data/scientific-v2-artifact-spool`。目录固定服务 UID/GID `1000:1000`、`0700`，bootstrap 与每次执行均要求至少 1 GiB 可用；其他五阶段不挂载该目录。
- bundle snapshot 使用 root-owned `0550` 输入目录和 `root:service 0440` 文件，容器只收到该文件的只读 bind；Worker 必须通过 `PAPERBANANA_SCIENTIFIC_V2_EXPECTED_BUNDLE_SHA256` 对同一打开文件的字节再次验 hash。review 私有输出另用 service-owned `0700` RW 目录及 `PAPERBANANA_SCIENTIFIC_V2_PRIVATE_OUTPUT_DIR`，禁止与输入 bundle 共用可写目录。
- review private mappings 只写 `/opt/paperbanana/operator-private/scientific-v2/<bundleHash>.review-private.json`，目录 `0700`、文件 `0600`，同 bundle 仅允许字节完全相同的幂等重放；stdout 只含公共审核包和安全 hash，不含映射、reviewer identity、attestation secret 或 provider 凭据。

各端待办：
- [x] 部署 / 运维代码（workflow、host wrapper、bootstrap/compose、七阶段/跨 manifest-state 负例、spool 权限/容量与脱敏测试）
- [x] Benchmark Worker / Core API（沿用现有七 operation 与 signed state import、review、publish input/atomic publish 契约；无新增直写发布路径）
- [x] Web / Gateway / 微信小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开 action 与客户端字段不变，无需改造）
- [ ] 生产执行（本条未部署、未调用 Provider、未导入真实审核、未发布 release；仍需合并后按固定 SHA 分阶段人工执行与浏览器验收）

### [2026-08-30] 科研插图评测 v2、批次原子发布与统一排行榜会话 — by Codex
变更：新增与历史 `pb-image-light-v1 / codex_single` 完全隔离的九题十维科研插图评测。正式身份固定为 `suiteId=pb-scientific-figure-v2`、`evaluationMode=codex_scientific_v2`、`evaluationEpoch=codex-scientific-2026-09-v1`、`reviewProtocol=codex-independent-double-review-v2`、`presentationVersion=scientific-leaderboard-v2`。六道生成题与三道确定性局部编辑题覆盖科研忠实度、结构拓扑、文字符号、数值图表、指令遵从、信息层级/可读性、信息密度、发表级美观、编辑目标命中和非目标保持；十维等权 raw mean，competition ranking 使用 `1,1,3`。v2 整批生成、编辑、A/B 独立盲审、争议仲裁、对象/hash 与费用对账全部完成后才原子发布；此前 v1 继续作为正式榜。

契约（影响 Web / Core / Worker / Gateway / 运维）：
- 生产 registry 中 selectable image route 按规范 identity 做 canonical 去重，访问优先级固定 `bailian → ark → openrouter`；OpenRouter 的 OpenAI/Google route 按规范化 provider/vendor/model identity 排除，另加入 `codex:gpt-image-2`。生成使用最高优先级 route；编辑只允许同 canonical 模型的最高优先级 `direct-edit`，不得使用 `analyze-redraw` 或失败后静默换渠道。
- 新 batch manifest/state 绑定代码 SHA、registry/suite/price hash、完整模型与九题清单、生成/编辑 route、三家各 ¥180 硬上限、Codex 最多 36 次工具调用、并发 1、生产共享锁、attempt/payload/响应分类/费用/原始文件 hash/像素/格式与执行次序。确认失败最多总计 4 次；`UNKNOWN_PROVIDER_OUTCOME` 零自动重试并暂停对账；预算/价格/unknown 未解决时禁止半批发布，也不得把未执行模型记 0。
- 审核包绑定题目、适用维度、图片、rubric 和 attempt；编辑项额外绑定 source/edited hash、编号区域和指令。A/B 使用不同盲标签排列；分差大于 2、红线冲突或低置信度才仲裁；automatic Judge 固定 0。公开接口在 v2 返回十维、生成/编辑成功率、尝试摘要、失败原因、九题 evidence 与编辑 before/after WebP，但继续隐藏 blind map、签名、内部对象键和 reviewer 身份。
- Web 新增统一 `LeaderboardRoot / LeaderboardSessionProvider / BenchmarkSiteHeader`。原五个导航文字、href、外链和 active 行为不变；新增意见反馈及登录/注册、邮箱、账号、退出。排行榜根只获取一次 session；投稿、管理员页和 header 共享状态；退出或删号立即清空管理员数据并阻止迟到响应回填。首页及其按钮保持不变。
- v2 最终生产验收后才可精确归档并退役 v1 evidence；只删除引用计数确认后的 v1 独占对象，保留 release hash tombstone，并经 D+7 健康/hash/清单复核后永久删除命名的临时归档与本地审计目录。

各端待办：
- [x] benchmark-core（独立 v2 contracts/suite/十维评分、canonical route、确定性编辑源图与审核绑定）
- [x] Benchmark Worker（batch 冻结、预算/锁/attempt、生成/编辑执行、Codex artifact 导入与双审分包）
- [x] paperbanana-api（batch/审核/仲裁存储、完整性重算、单 release 原子发布与 v2 公共投影）
- [x] Web（十维总榜/方法/九题 evidence/before-after、统一 header/session、登录反馈与管理员竞态保护）
- [x] packages-api / auth-gateway（沿用既有 action 与管理员身份边界；v2 新字段向后兼容，无新客户端 secret，无需改造）
- [x] Codex 周任务运行基座（detached clean worktree 固定 `3e63a5f59f206e4a37418a1a3d4dc529073fcae4`，三个投稿管理员 action 已核对；现有 `paperbanana` 自动化保留 ID/ACTIVE/周一 10:00/模型/通知策略并新增绝对路径、HEAD、clean、action 与只读 dry-run 零写入门）
- [ ] 部署 / 运维（固定 SHA/registry-suite-price hashes/模型数/三家预算/Codex 36 次/Worker disabled/并发 1/共享锁；只重建变更服务并复用其他 digest）
- [ ] GPT Image 2 生成审计（独立 Codex 任务、首题 artifact canary、九题原始文件与 provenance；未通过执行门前不得调用）
- [ ] 生产评测、双盲审核、原子发布、浏览器验收、v1 精确退役与 D+7 删除 heartbeat

### [2026-08-30] Bench 生成证据与社区候选题参与 — by Codex
变更：在已校验 `releaseHash` 的正式 `codex_single` / `published` 排行榜投影上新增公开生成证据，不迁移、不覆盖历史 Quick/Full、失败模型、盲审包或私有 PNG。`benchmarkModelProfile` 仅对公开合格 profile 懒加载 `evidence` / `cases`；新增匿名只读 `benchmarkCaseEvidence`，按题目每批最多 12 个模型返回。公开 evidence allowlist 固定为 `sampleId / caseId / profileId / modelId / imageHash / actualOutputPixels / variants / scores / reviewNotes`，WebP variant 只允许内容寻址的 `bench/public/evidence/<sourceHash>/*.webp`，每次签名之前复验对象 hash；盲标签、对象原路径、packet/review 签名、内部记录、投稿身份和管理员身份均不公开。Benchmark Worker 的 Standard 成功样本会生成不放大的 640 / 1600 / full 三档真实 WebP，原 PNG 不覆盖；新增受 disabled-worker、并发 1、固定 release hash、共享锁和显式确认保护的一次性幂等回填 entry，不产生生图或 Judge 调用。

契约（影响 Web / Core / Gateway / Worker / 运维）：
- 新增 `benchmarkPromptSubmission`：必须由 Gateway 注入已登录 `userId` 与可信 `clientIp`；只收五个文字字段，拒绝 HTML、URL、附件语义；账号每天 5 条、IP 每天 20 条，重复内容幂等。
- 新增管理员 action：`adminBenchmarkPromptQueue / adminBenchmarkPromptDigest / adminBenchmarkPromptDecision`。状态为 `pending → grouped → candidate → approved_for_next_suite / merged / rejected`；digest 使用共享租约锁、稳定 digest ID 与来源投稿 ID；批准只表示下期候选，不能修改正式 suite、启动生成或改变榜单。
- 新增 Mongo collection：`paperbanana_benchmark_public_evidence / paperbanana_benchmark_prompt_submissions / paperbanana_benchmark_prompt_digests` 及查询/限频索引。原始投稿身份只在管理员队列可见。
- 新增手工 `Backfill Public Benchmark Evidence` workflow：`inspect` 只读核对，`apply` 才写 WebP/evidence；两者均绑定 exact deployed SHA、source release hash、`configured-disabled`、Worker disabled/并发 1 与香港生产共享锁，输出固定证明 `generatedOrJudgeCalls=0`。
- 香港 Mongo 最小权限角色同步覆盖新集合：Core API 对三项新集合具备 `find/insert/update/createIndex/listIndexes`；disabled Benchmark Worker 对 public evidence 仅增加回填所需 `find/insert/update`，并对不可变 releases 增加回填校验所需的单一 `find` 权限，不扩大 release 写入、Provider 或正式测评权限。
- Web 新增 `/leaderboard/models/:profileId`、`/leaderboard/cases/:caseId`、`/leaderboard/submit-prompt`、`/leaderboard/admin/prompt-submissions`；排行榜首屏不请求样本图，证据图使用 `srcset + loading=lazy + decoding=async`，详情图只在主动放大时请求。

各端待办：
- [x] paperbanana-api / Core（公开 evidence 投影、投稿存储/限频、digest 锁、管理员审核、hash fail-closed 与 TDD）
- [x] auth-gateway / packages-api（匿名 evidence 读取、登录身份/IP 注入、三项管理员 action 转发）
- [x] Benchmark Worker（新样本三档 WebP、内容 hash、不可覆盖写、幂等回填 entry；生产 124 张已审核样本已完成回填）
- [x] Web（模型证据、同题对比、投稿与管理员页，静态入口/404 深链、懒加载与移动端布局）
- [x] 微信小程序 / Android / iOS / Windows / macOS / HarmonyOS（新 action 与页面只由 Web 使用；现有契约不变，无需改造）
- [x] Codex 定时任务（已创建 ACTIVE 项目级任务 `paperbanana`，每周一 10:00 按本机 Asia/Shanghai 时区；只整理 pending 并提交 digest，不得修改 suite 或运行测评；失败时通知）
- [x] 部署 / 运维（功能 PR #74 与生产修复 PR #76–#83 已合并。香港 Core / Benchmark Worker 固定代码 SHA `2151ce8390104cafa9ad7f239e8f02da1b0382cf`，最终镜像分别为 `paperbanana-core-api@sha256:10247c40…` / `paperbanana-benchmark-worker@sha256:c855935b…`；Gateway `sha256:2af6894e…`、Plot Worker `sha256:23894f48…`、Mongo `sha256:5dda65a8…` 均复用且 Plot Worker 未重建。生产部署 run `33307212688` 成功，Worker 保持 configured-disabled / disabled / 并发 1。只读 inspect run `33307277050` 验证 release `2688db53…`、31 模型、124 源样本、0 已发布；幂等 apply run `33307319063` 发布 124/124 evidence，固定证明 `generatedOrJudgeCalls=0`。Web/Pages SHA `b383262693aa5fecc9c77c18d360c537865901a4`、run `33308241316` 已发布；生产 API 验证模型证据 4 张、题目页 12→24→31 分页、三档 WebP、MIME `image/webp`、immutable 一年缓存与内容 hash 一致，匿名投稿返回 401；真实浏览器深链刷新、非法路由、390/430 无页面级横向溢出和懒加载契约通过。全过程未触发生图或 Judge）

### [2026-08-29] Bench 完整公开方法题集与独立方法页 — by Codex
变更：公开 `benchmarkMethodology` 在 `evaluationMode=codex_single` 且 `profileStatus=published` 的 Arena release 上，先做 `releaseHash` 校验，再新增顶层 `suite` / `scoring`；历史 Quick/Full、`provisional` / `verified` 与无 release 结果继续保持旧形状，不回填、不改名。`suite` 的权威来源是 `PB_IMAGE_LIGHT_V1` allowlist 的深拷贝：完整公开四题正/负向提示词、约束、七维 rubric、许可、case / suite hash；不公开盲标签、模型映射、审核记录、签名/密钥/operator 材料。`scoring` 公共化 0-10 评分，要求至少 3/4、最多 4，七维等权，competition 采用 `1,1,3`，并明确 confirmed axis cap。Web 总榜移除内嵌“读榜前需要知道”，新增 `/leaderboard/methodology` 以及静态 root / non-root / 尾斜杠入口；所有方法链接改为正式路由。方法页只请求 `benchmarkMethodology`，严格 normalize，复制状态防竞态，旧或畸形响应 fail closed，且不带内置 prompt 副本。公开 action 名称不变，新字段向后兼容，不触发任何生成 / Judge / 付费。
各端待办：
- [x] paperbanana-api（`benchmarkMethodology` 新增 `suite` / `scoring` 顶层字段，Arena release 仅在 `releaseHash` 校验后公开；历史形状保持不变）
- [x] Web（`/leaderboard/methodology`、静态 root / non-root / 尾斜杠入口、正式方法路由、严格 normalize / fail closed、移除内嵌方法提示）
- [x] packages-api / auth-gateway / 微信小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开 action 名称不变；新增字段向后兼容；无需改造）
- [x] 部署 / 运维（PR #71 合并为 `58c0f3f8cac89ffc9c47798f0e474c331cc56c66`；香港 Core/Benchmark 以不可变镜像部署，Gateway/Plot/Mongo 复用现网摘要，Worker 保持 configured-disabled / 并发 1；Pages 以 `bench_enabled=true` 发布。生产只读 smoke：`/health`、`/ready` 正常，方法接口返回 4 题 / 0 automatic Judge，方法页与总榜均为 200；未触发生成或 Judge 调用）

### [2026-08-29] Bench Arena 式公开排行榜投影与 Web 路由 — by Codex
变更：仅对 `evaluationMode=codex_single` 且 `profileStatus=published` 的新 Standard release，在源 `releaseHash` 校验后派生公开 presentation；历史 Quick/Full、`provisional` / `verified` 不迁移、不覆盖。公开资格只认 `ranked===true`、`sampleCount>=3`、七轴 `mean` 全 finite；公开 leaderboard/profile 隐藏失败、暂停、样本不足条目，但原不可变 release / 账本不物理删除。`overall` 为七维 raw mean 等权平均；`overall` / 七维都用 raw 降序 competition ranking `1,1,3`。新增公开字段 `overallScore`、`overallRank`、`dimensionRanks`、`sourceReleaseHash`、`presentationVersion`、`eligibleModelCount`、`rankingMethod`；方法学对新榜 `noOverallScore=false`。Web 正式路由改为 `/leaderboard` + 七个子路由并替换旧 `/bench`；GitHub Pages 生成静态入口和仅限 `leaderboard` / `bench` 的 404 fallback；顶栏改“排行榜”并移除 Windows / Mac，其他客户端 UI 不改。不展示置信区间；小榜仅 Top10、总矩阵显示 `rank + score`；不新增任何生成 / Judge 调用。
各端待办：
- [x] paperbanana-api（Standard release 公共 presentation 投影、公开字段/排序/方法学字段与后端兼容）
- [x] Web（`/leaderboard` + 七子路由、`/bench` 替换、GitHub Pages 静态入口与 404 fallback、顶栏文案调整）
- [x] auth-gateway / 微信小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开 action 名称不变，新增字段向后兼容，无需改造）
- [x] 部署 / 运维（随 PR #71 的不可变 SHA `58c0f3f8cac89ffc9c47798f0e474c331cc56c66` 完成 Core + Pages 发布；生产排行榜接口返回 `presentationVersion=arena-leaderboard-v1`、31 个合格模型，`/leaderboard/` 与 `/leaderboard/methodology/` 均为 200；未触发生成或 Judge 调用）

### [2026-08-28] Bench OSS 服务端公共端点模式与三容器显式 DNS — by Codex
变更：香港生产宿主机已可解析并访问公共 OSS，但 Docker embedded DNS 仍沿用不可达的旧解析器，且 Bench Core 的 OSS 服务端读写固定使用 internal endpoint，导致发布证据复验失败。Core 新增严格枚举 `PAPERBANANA_BENCH_OSS_SERVER_ENDPOINT_MODE=internal|public`，未设置时保持 `internal`；仅显式为 `public` 时，Bench OSS `serverClient` 才使用经过严格主机校验的公共 endpoint。签名客户端继续固定公共 endpoint，主业务 OSS 配置与行为不变，空串、大小写变体、前后空格和其他值均启动失败。香港 Compose 仅为 `paperbanana-api`、`benchmark-worker`、`benchmark-operator` 设置显式 DNS，`PAPERBANANA_BENCH_DNS_PRIMARY` / `PAPERBANANA_BENCH_DNS_SECONDARY` 默认分别为 `223.5.5.5` / `1.1.1.1`；其他服务保留原 Docker DNS。正式发布的不可变证据批次复验仍保持并发 8、单对象一次有界重试和失败关闭，但总 deadline 从 30 秒提高到 120 秒，以覆盖公共 OSS 大 PNG 的受限带宽。
各端待办：
- [x] paperbanana-api / Bench Core（严格配置、仅 Bench server I/O 切换、签名与主业务 OSS 隔离、TDD）
- [x] 香港部署代码（仅三个 Bench 相关运行时的可配置 DNS 与 Compose 契约测试）
- [x] 部署 / 运维（生产已部署不可变 Core/Worker `e46b2d75b0abdd18ae7f31626e92eb0399e4a778`；Core endpoint mode 显式为 `public`，三容器 DNS、`/ready`、私有 OSS 读回 SHA-256、Worker disabled/concurrency 1、完整 smoke 与 superseding release 均已验证）

### [2026-08-28] Bench 全量生图模型 Standard / Codex single 公开榜 — by Codex
变更：新增不可变 `pb-image-light-v1` 四题 Standard 阶段，三家生产 image registry route 先按运行时别名和跨渠道同模型归一为 canonical 实际模型，再由主接入渠道每题生成一次。当前 v9 fixture 锁定 55 route → 48 canonical 模型；单模型固定 4 generation / 0 automatic judgment / 0 Judge dispatch，全批次最多 48 模型 / 192 generation。全部成功图片进入 `codex-single-two-pass-v1` 两遍结构化盲审；至少完成并审核 3/4 才进入七维排名，不足者仍公开显示但不排名。实际宽高/像素/文件大小、主接入渠道、替代渠道和 generation-only 成本进入公共契约。新 release 状态为 `published`，比较身份为 `suiteId + evaluationMode + evaluationEpoch`；历史 Quick/Full、provisional/verified 和双 Judge release 保留只读且不混排。常驻 Worker 继续 disabled/并发 1；Standard batch operator 持有生产共享锁顺序执行，单模型未知 Provider 结果不重试但不阻止后续模型。
契约（影响 Web / Core / Worker / 运维）：
- 公共模型新增 `canonicalModelId / primaryAccessProvider / alternateAccessProviders / actualOutputPixels / ranked / unrankedReason`；release/methodology 新增 `evaluationMode=codex_single / evaluationEpoch / reviewProtocol / reviewerKind=codex / reviewerPasses=2 / automaticJudges=[]`。
- 新状态为 `approved → standard_running → codex_review → published`；站长审批必须显式传 `evaluationMode=codex_single` 与精确 4/0/0 caps，发布使用 `profileStatus=published`。
- 新模式发现、执行、审核包、导入和发布任一位置出现 automatic judgment 或 Judge dispatch 均失败关闭；公开费用三类 Judge 计数固定为 0。
各端待办：
- [x] benchmark-core / benchmark-worker / paperbanana-api（canonical manifest、Standard runner、签名审核与发布完整性门、旧 release 兼容、TDD）
- [x] Web（单阶段文案、canonical 模型行、实际像素/渠道/成本、样本不足不排名、390/430 响应式基础）
- [x] 部署 / 运维代码（单模型 Standard operator、批次 manifest 验证、48/192 总上限、共享锁、dry-run 零调用）
- [x] Gateway / 微信小程序 / Android / iOS / Windows / macOS / HarmonyOS（action 名称不变；非 Web 客户端无需改造）
- [ ] 生产付费运行（必须先重新读取生产 registry、冻结并签名 canonical manifest、取得全部模型价格/权限并确定精确总美元上限；本条实现与测试没有调用 Provider）

### [2026-08-28] Bench 确认未转发 Judge dispatch 的连续索引恢复 — by Codex
变更：新增仅用于有独立网络证据证明请求未到达 Provider 的一次性 dispatch 恢复器。它要求 run 精确为 `paused/UNKNOWN_PROVIDER_OUTCOME`、无租约、24 个 quick 样本完整、目标 automatic judgment 不存在、旧 marker 仅有 index 0，且代理证据固定为目标 `openrouter.ai:443`、HTTP CONNECT 503、响应字节 0、日志 SHA-256。恢复永不删除或改写旧 marker，先把证据和 operator SHA-256 追加到 run 的内部 `dispatchReconciliations`，再从连续 index 1 开始占用既有 Judge-call/USD 预算；最多允许现有 manifest 已定义的 index 0–3。成功只补该 logical judgment、清除租约并保留 `quick_running` 给原 phase operator，任何新未知结果重新暂停。公开 action、release、客户端响应不变。
各端待办：
- [x] benchmark-worker / 运维代码（TDD、严格 proof/state 门、连续 marker、预算与租约、一次性 bundle）
- [x] paperbanana-api / Web / Gateway / 原生客户端（内部 run 审计字段；公开与客户端契约不变）
- [ ] 部署 / 运维（后续发布含正式 entrypoint 的不可变 Worker 镜像；当前生产仅按 bundle SHA `4f67497f…` 对已证明 503/0-byte 的 OpenRouter dispatch 执行一次，常驻 Worker 保持 disabled）
- [x] 百炼未知结果（用户于 2026-08-28 明确接受可能重复计费并授权只重试该条；一次性 bundle SHA-256 `a063251a…` 在严格账本形状 24 generation / 33 logical judgment / 34 dispatch、无租约、Worker disabled 下，仅将目标 `bailian` marker 从 index 0 连续到 index 1，结果成功落库；随后原 quick operator 完成 24/24 双 Judge，Codex 盲审导入 14/14，并创建 provisional release `d45d7415…`）

### [2026-08-27] Bench run 比例数组规范化与零调用恢复 — by Codex
变更：新建 Bench run 时，顶层 `aspectRatios` 现在与已签名 `runFacts.aspectRatios` 使用同一字符串化排序顺序，避免候选注册表顺序不同导致一次性 phase operator 在首个预算预留/Provider 调用前失败。生产中唯一受影响且保持 0 generation / 0 judgment / 0 dispatch 的 run 只允许通过精确 CAS 将冗余顶层数组归一到已签名数组，不重签或改写审批、价格、runHash、candidateSnapshot。
契约（影响后端 / Worker）：
- Core 新 run 的顶层 `aspectRatios`、`runFacts.aspectRatios` 与 `candidateSnapshot.aspectRatios` 必须规范等价；Worker 继续失败关闭并验证顶层数组哈希，不放宽不可变事实校验。
- 旧 run 仅当状态为 `failed`、错误发生在 phase operator、所有付费/样本/dispatch 计数为 0、无租约，且顶层数组排序后精确等于已签名数组时，才允许一次性归一化；修复后必须重新通过完整 attestation 才能运行。
各端待办：
- [x] paperbanana-api / Benchmark Worker（TDD、规范化写入与严格校验保留）
- [ ] 部署 / 运维（后续发布新镜像；当前生产只对精确零调用 run 做一次性 CAS 修复，常驻 Worker 保持 disabled）
- [x] Web / Gateway / 原生客户端（内部 run 字段修复，不改变公开 action 或客户端请求）

### [2026-08-26] Bench OpenRouter Judge 固定新加坡出口 — by Codex
变更：Bench 的 OpenRouter 自动评审、只读 access diagnostic 与单请求探针新增独立、失败关闭的出口契约：`PAPERBANANA_BENCH_OPENROUTER_EGRESS_MODE=sg-required` 且 `PAPERBANANA_BENCH_SG_PROXY_URL=http://10.77.0.2:3128`。仅 `https://openrouter.ai` 可使用该代理；百炼/方舟与被测模型生成路径保持原有直连。`discovery-only` 明确为 `disabled`，`configured-disabled` 才配置固定代理；常驻 Worker 仍为 `PAPERBANANA_BENCH_ENABLED=false`、并发 1。该变更用于规避香港直连 OpenRouter runtime POST 的 opaque 403，不改变公共 action、公开响应或客户端契约。
各端待办：
- [x] benchmark-worker / 香港运维代码（固定 host/proxy allowlist、TDD、凭据激活与 smoke 契约）
- [x] Web / Core / Gateway / 微信小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开与客户端契约不变，无需改造）
- [ ] 部署 / 运维（合并后发布同一不可变 SHA，重新执行 configured-disabled 凭据配置与零调用诊断；Worker 保持 disabled）
- [ ] 付费执行（固定代理探针验证后，才按已授权预算恢复校准、canary、quick/full 与 Codex 审核）

### [2026-08-25] Bench quick/full 精确 run 单 phase 预算 operator — by Codex
变更：新增仅由 `workflow_dispatch` 手工触发的 quick/full 一次性 operator；常驻 Worker 始终保持 `PAPERBANANA_BENCH_ENABLED=false`、并发 1，不启动 discovery 或 daemon timer。管理员必须先用既有 `adminBenchmarkApprove` 明确批准 entitlement、公开 HTTPS 价格来源/快照、生成、逻辑 Judgment、Judge dispatch 与 USD caps，再用 `adminBenchmarkControl` 将同一 run 推进到精确 `quick_running|full_running`；进入 running 后可用同一 action 的只读 `command=phaseOperatorAttestation` 取得 Core 已验签、无密钥的 workflow 输入。operator 不会 approve/reapprove、推进 running 或扩大预算。审批 `priceSnapshot` 新增并签署 `source`，因此 price hash、phase authorization hash 与 run integrity attestation 均覆盖价格来源。一次性授权另绑定 exact deployed SHA、phase/runId/provider/model/lane/suite/hash/Judge epoch+stack、Core-signed authorization hash、price hash、完整价格字段、固定确认，以及 Core 验证的完整不可变运行事实信封（`runHash`、canonical `runFacts`、首次审批 candidate snapshot、`aspectRatios`、`registryHash`、run integrity HMAC 与各 canonical hash）；旧记录、缺失或任一变异均失败关闭。Worker 仅以 exact runId+state CAS 租约并在任何 Provider/Judge dispatch 前重算并逐项比较 Mongo signed approval 和不可变运行事实。quick 上限为 24 generation / 48 logical judgment / 192 Judge dispatch，full 为 144 / 288 / 1152；每个 logical judgment 最多覆盖首次、一次 JSON repair，以及两者各一次既有 429 有界重发，所有 dispatch 均先占用显式签署的调用与美元预算，最坏情况估算不得超过总 cap；能力缺口只允许实际更少。执行复用正式 image runtime、双 Judge、私有 OSS、Mongo idempotency/lease、未知结果暂停及既有 429 有界规则；成功进入 `quick_review|codex_audit`。host wrapper 使用香港生产共享锁，在任何 one-off Worker 启动前用 protected Gateway/Admin transport token 与 immutable admin identity 调用本机 Core attestation，并对完整 identity/hash/cap/price/immutable-facts 对象做深度精确比较；mismatch 零 one-off。随后才允许 `--no-deps` one-off，并在结束后执行 daemon health 与 lease/state 后置检查；dry-run 零容器/零 Core 调用，test-root 禁止 apply。公开 actions/客户端响应不变。
补充发布契约：durable Judge dispatch marker 移入内部 `paperbanana_benchmark_dispatches`，仅含 canonical `_id/runId/sampleId/phase/logicalProvider/dispatchIndex/judgeEpoch`；Worker 先占预算、再 insert、再允许网络，角色仅 `find/insert`，Core 角色仅 `find`，无 update/remove/cancel-delete 路径。quick/full source manifest 均签署当前 phase 的完整 samples、automatic judgments、marker 集和 `generationCalls/logicalJudgments/judgeDispatchCalls`，import 会重建验签；provisional/verified publish 及 transaction snapshot 分别从 suite/run/samples/judgments/dispatch collection 独立重建，按实际 dispatch 计价并检查全部 signed caps，绝不信任 `run.usage` 或 `usageByPhase`。quick 形状固定为 12 个 quick case 各 2 次，仅允许 signed ratio capability plan 的合法缺口；其他 phase/历史 marker 不污染当前 phase，旧 judgment marker、尾部删除/phase 降级、缺口/额外/篡改均失败关闭。公开费用保留 `automaticJudgeCalls` 兼容别名并新增 `logicalJudgments`、`judgeDispatchCalls`。
各端待办：
- [x] benchmark-core / benchmark-worker / paperbanana-api / 香港运维代码（signed price source、exact operator、复用执行路径、TDD、workflow 与文档）
- [x] Web / Gateway / 微信小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开及客户端 API 不变；站长批准请求后续必须提供 price source）
- [ ] 部署 / 运维（合并后发布同一不可变 SHA 的 Core/Worker，并继续 configured-disabled；本条未运行任何 Provider/Judge）
- [ ] 付费执行（仍须用户对 exact run/phase/model/Judge/价格/caps/总美元预算逐项明确审批；本条不构成费用授权）

### [2026-08-25] Bench quick/full 阶段纯净身份与 verified 发布 DB 形状门 — by Codex
变更：Bench sample 身份、automatic judgment 与预算用量均新增显式 `phase=quick|full`（预算持久化为 `usageByPhase.quick/full`）；同一 run 的 full 不再复用或消耗 quick 的 sample、Judge 结果与调用 caps。sample/judgment 旧索引迁移由 root `mongo-init` 在应用角色建立前按“创建并验证新索引，再幂等删除旧索引”的固定顺序完成；Worker 运行期只创建/验证当前索引，Mongo 角色没有 `dropIndex`。仓库新增 CI 强制执行的临时 MongoDB 8 replica-set 集成测试，连续运行两次真实迁移，验证完整 key/unique/partial-filter、legacy 删除及 Worker `dropIndex` Unauthorized。审核导出、导入后的评分重算按当前 phase 隔离；Core 使用仅自身持有的 `PAPERBANANA_BENCH_REVIEW_SIGNING_SECRET` 对 canonical immutable run facts、首次审批时的 candidate 展示/商业身份快照、以及 versioned quick/full 审批（authorizationHash、完整价格快照、caps、审批人和时间）生成 HMAC，reapprove/export/import/publish 均重构验旧 attestation，绝不重新签署未验证的 DB hash。full review export 还冻结全部 full samples、automatic judgments 与由其导出的 phase-pure 调用计数 canonical manifest，将其 HMAC 绑定进签名 packet 与 Codex review attestation；import 与 verified publish 的事务快照均重构验签，双 Judge 对未审样本等值篡改也会失败关闭。`verified` 发布不再信任 run 汇总字段、可写 usage/price/approval、live candidate 或 `releaseDraft`，而是独立验证当前 DB：不可变 suite 的 42 个 `auto` 题始终执行，6 个固定比例题仅在 `run.aspectRatios` 支持时执行；可执行题必须每题 3 个 completed 内容寻址样本和每样本 OpenRouter+Bailian 两个当前 `judgeEpoch` completed judgment，不支持题必须为零 full sample，并以稳定的 `case=<caseId>;aspectRatio=<ratio>` 逐题记录 capability gap。全比例模型仍严格为 48×3=144 样本、288 automatic judgments。发布端从 full automatic judgments 重建 disagreement、red-line conflict、异常、public evidence 与确定性 10% 的完整审核集合，要求 auditRequired、packet、当前 packet/review attestation 的 accepted Codex 四集合完全相等；旧 quick 或已被 full re-export 取代的 accepted 记录被精确忽略。发布同时验证 packet signature、review attestation、严格评分/证据/置信度/红线与正整数 latency；随后以 `applyCodexAdjudication + aggregateAxisScores` 重算 dimensions、coverage、capabilityCoverage、successRate、latency、auditRatio 与 signed price 下的正式集估算费用，从 attested candidate snapshot 派生展示身份，并构造固定 methodology。全部 OSS 内容寻址对象在事务外以有界并发、总 deadline 和一次重试验证；remaining timeout 传入 ali-oss，batch 使用共享 AbortController/stop flag，终局失败取消全部 active stream、停止领取新对象并等待 `allSettled` 清理，随后形成 manifest hash 与时间戳。短 Mongo 快照事务仅重读并重算 DB/manifest 后 CAS 比对并发布，不在事务中下载 OSS；事务测试强制同一 session、staged commit/rollback，并覆盖 release insert 后 run CAS 失败零落库。该边界依赖 Worker OSS 身份没有删除/覆盖权限，写入继续携带 `x-oss-forbid-overwrite:true`。公开 action/客户端请求响应不变。
各端待办：
- [x] benchmark-core / benchmark-worker / paperbanana-api（phase 身份、索引迁移、审核隔离、发布完整性门与 TDD）
- [x] Web / Gateway / 微信小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开及客户端 API 契约不变，无需改造）
- [ ] 部署 / 运维（合并后发布同一 SHA 的 Core 与 Worker；任何正式集仍需既有明确模型、Judge、价格与美元预算授权，本条未运行 Provider/Judge）

### [2026-08-25] Bench Judge 金标校准与两图付费 canary operator — by Codex
变更：新增六类原创 CC-BY-4.0 缺陷金标（漏节点、反向箭头、乱码、遮挡、低对比、比例违约）、固定双 Judge 校准报告和独立两图 canary。两者都只通过手工 `Run Benchmark Paid Operator` workflow 在一次性 Worker 容器中运行；常驻 `benchmark-worker` 必须保持 `PAPERBANANA_BENCH_ENABLED=false`、并发 1。operator 与正常部署共享香港生产主机锁，同时校验 Core/Worker 镜像内固化 SHA 与运行时 SHA，绑定 Judge stack、无密钥授权信封、价格来源/快照、调用次数与最高 3 美元估算费用派发上限（实际账单以 Provider 为准）。完整报告以内容 hash 写入私有 `bench/operator-reports/`；Core 有界回读私有 OSS 原件并重算报告/授权/价格 hash 后，才不可变记录派生的结果和用量，浏览器提交伪造 hash 不能放行。日志只显示 hash/计数/估算费用。校准低于 85% 红线准确率或 80% 双 Judge 一致率即失败且不记录；两图 canary 固定复杂拓扑与数学符号两题，精确 2 次生成、最多 6 次 Judge dispatch，不进入公开 release。
各端待办：
- [x] Worker / Core / 运维代码（TDD、一次性 operator、私有报告、Core 不可变校准记录、共享锁与手工 workflow）
- [x] Web / Gateway / 微信小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开及客户端 API 契约不变，无需改造）
- [ ] 生产发布（合并后发布新的不可变 Worker 镜像并以 configured-disabled 重新部署；尚未运行校准、生成或 Judge）
- [ ] 付费执行（仍须用户明确指定模型、Judge 价格快照及美元预算后，依次运行校准与两图 canary；本条不构成费用授权）

### [2026-08-25] 香港部署与 Bench 凭据激活共享主机锁 — by Codex
变更：正常香港部署与 Bench `configured-disabled` 凭据激活现在必须共享 `/run/lock/paperbanana-hk-production.lock`。正常部署由 root-only `apply-staged-deployment.sh` 在同一把锁内连续完成随机 0600 `/tmp` image-lock 安装、Bench mode bootstrap、`deploy.sh --apply`、smoke 与临时文件清理；凭据 operator 使用同一锁。Wrapper 通过继承的数字 FD 传递锁，`deploy.sh --apply` 在读取 `.env`、Compose preflight 或 maintenance mutation 前校验 FD 的真实路径与 `flock -n` 锁状态；无 FD、错误路径或伪造 sentinel 均失败关闭，dry-run 不再宣传直接 apply。两个 production workflow 也共享 non-canceling concurrency group 作为第二层保护。固定 `GITHUB_RUN_ID` staging path 已移除；本条不改变 `discovery-only|configured-disabled`、Worker disabled 或付费授权边界。
各端待办：
- [x] 部署 / 运维代码（共享主机锁、host wrapper、随机 staging、成功/失败双重清理、workflow concurrency 与回归测试）
- [x] Web / Core / Gateway / Worker / 微信小程序 / Android / iOS / Windows / macOS / HarmonyOS（运行时 API/客户端契约不变，无需改造）
- [x] 生产执行（PR #34 已合并为 `da5ac5f`；香港生产部署与 `configured-disabled` 凭据激活均经共享主机锁完成，独立 smoke 通过；Worker 仍为 disabled，未产生付费请求）

### [2026-08-25] Bench 专用凭据 configured-disabled 激活门 — by Codex
变更：香港单机部署新增显式 `PAPERBANANA_BENCH_SECRET_MODE=discovery-only|configured-disabled`。默认 `discovery-only` 继续拒绝全部 Provider/Bench OSS 凭据；新的 root-only 原子操作脚本仅通过 0600 临时 bundle 接收三项 Provider 与六项 Bench OSS 配置，要求 Core/Worker 的 `PAPERBANANA_CODE_SHA` 与人工输入的已部署 40 位 commit 完全一致，并在失败时恢复 `core.env`、`bench.env`、部署模式及原服务。`configured-disabled` 只打开 Core Bench API 的独立 OSS 读取/签名配置，Worker 始终保持 `PAPERBANANA_BENCH_ENABLED=false`、并发 1；本条不授权任何生成、Judge、canary 或付费请求。
各端待办：
- [x] 部署 / 运维代码（root-only operator、flock、原子回滚、显式 deploy mode、双模式 smoke、手工 GitHub Environment workflow、TDD 与凭据脱敏契约）
- [x] 生产 Bench OSS（已创建香港私有 LRS Bucket `paperbanana-bench-hk-d5cd3f4e8f68`、专用 RAM 用户 `paperbanana-benchmark-runtime`、最小权限策略 `PaperBananaBenchmarkOssRuntime` 与唯一 AccessKey；六项 `PAPERBANANA_BENCH_OSS_*` 已保存为 GitHub Environment Secrets，值未进入仓库或日志）
- [x] 生产 configured-disabled（GitHub Actions run `32821366044` 已按精确部署 SHA `da5ac5fc39f56ea4bb4e76d56167ab6088ce2f92` 完成；Core/Bench OSS/Mongo/隔离 smoke 通过，Worker disabled/并发 1、费用为零）
- [ ] Judge calibration / 两题 canary（执行器已实现但尚未发布或付费运行）；24 图临时集、144 图正式集仍需用户另行明确模型、Judge 与美元预算授权

### [2026-08-25] 出图模型 Bench v1 共享契约与独立 Worker — by Codex
变更：新增公开只读 `/bench` 模型观测台、不可变 `pb-image-diagnostic-v1` 48 题原创诊断集、七维评分/题内聚合/bootstrap 区间、双 Judge + Codex 盲审协议，以及默认关闭的独立 `benchmark-worker`。首版仅文生图，不使用 PaperBananaBench 官方题集，不产生综合总分，不自动扣费。
契约（影响 Web / Core / Gateway / Worker / 运维）：
- **公共 actions**：`benchmarkLeaderboard`、`benchmarkModelProfile`、`benchmarkMethodology` 仅返回已发布不可变 release；公开证据必须在 release allowlist 内且对象键位于私有 `bench/` 前缀，响应只签发短期 URL。
- **站长 actions**：`adminBenchmarkCandidates`、`adminBenchmarkApprove`、`adminBenchmarkControl`、`adminBenchmarkReviewExport`、`adminBenchmarkReviewImport`、`adminBenchmarkPublish`；继续由 Gateway 的不可变 `ADMIN_USER_IDS` 鉴权，Web 不接收 `ADMIN_TOKEN`。
- **公共类型 / 集合**：七个 `BenchmarkAxis`；`1K-standard|2K-standard|4K-standard`；`provisional|verified|superseded`；新增 `paperbanana_benchmark_{suites,models,runs,samples,judgments,releases}` 六个业务集合，以及仅供内部 append-only Judge dispatch 审计的 `paperbanana_benchmark_dispatches`。状态机与 suite/judge/reviewer/registry/price/code/release hash 均固定在共享包。
- **Worker 安全默认**：`PAPERBANANA_BENCH_ENABLED=false`、并发 1、每 6 小时只发现；只读取 `PAPERBANANA_BENCH_*` 专用 Provider/OSS 凭据，使用独立 `paperbanana_benchmark` Mongo 用户，无公网端口，仅 backend+egress 网络。候选必须先确认权益、价格、生成/Judge/USD 上限；未知 Provider 结果暂停且不自动重发。
- **内部信任与数据隔离**：Worker 只持有 discovery-only `PAPERBANANA_BENCH_DISCOVERY_TOKEN`，Core 仅允许它调用 `modelRegistry`；站长调用另用仅 Gateway/Core 持有的 `PAPERBANANA_ADMIN_TRANSPORT_TOKEN` 并覆盖真实不可变管理员 ID。Core 使用独立 `paperbanana_benchmark_api` Mongo 用户与 Bench-only OSS signer，不得从 `paperbanana_business` 或产品桶读取/签名 Bench 证据。
- **审核交换**：Codex packet 不含模型身份或自动分数；导入同时校验 packet/image/rubric hash。公开证据强制进入审计。临时画像不生成“维度领先”标签；不同 lane 禁止比较。
各端待办：
- [x] Web（feature-flag `/bench`、模型深链、七个单维榜、证据/方法学、390px/430px、独立站长控制面）
- [x] paperbanana-api / Core（共享 image runtime bundle、六集合 repository、公开 release 隔离、审核/发布 hash、短期证据签名）
- [x] auth-gateway / packages-api（匿名只读转发、六个站长 action 的不可变管理员鉴权、客户端请求契约）
- [x] benchmark-worker（发现、审批预算、租约/心跳/幂等、24/144 执行、双盲评、Codex audit、独立镜像与健康文件）
- [x] 微信小程序 / Android / iOS / Windows / macOS / HarmonyOS（首版无需改造，不得自行消费运行队列或未发布结果）
- [ ] 部署 / 运维（不可变 Worker 镜像、`enabled=false` discovery-only、独立 Mongo/OSS/Bench 凭据及 `configured-disabled` 已完成且费用为零；仍缺 Judge calibration。任何两题 canary、24 图临时集或 144 图正式集仍需用户新的明确模型、Judge 与美元预算授权）

### [2026-08-23] 账号删除 OSS V4 分页签名修复 — by Codex
变更：香港 Node Core 的 OSS 适配器不再把值为 `undefined` 的首次分页 `marker` 传给 `ali-oss`。此前该无效查询项会使 ListObjects V4 签名与实际查询串不一致，导致账号删除在清理 `references/<owner>/` 时返回 500；后续真实分页 marker 及严格清理语义保持不变。
各端待办：
- [x] paperbanana-api / Laf Core（失败回归测试、最小修复、全量测试、类型检查与生产构建）
- [x] Web / iOS / 微信小程序 / Android / Windows / macOS / HarmonyOS（删除请求与响应契约未变化，无需客户端改动）
- [x] 部署 / 运维（PR #28 已合并为 `e4502ab`；香港 Core 不可变镜像 `sha256:3a4dec8f…` 已部署。生产一次性账号验证通过：删除返回成功、旧会话失效、旧密码再次登录返回 401）

### [2026-08-23] 标准账号安全与邮件恢复契约 — by Codex
变更：auth-gateway 保持 Better Auth 1.6.11 与现有用户/会话/删除链路，新增邮箱验证、重发验证、忘记/重置密码、登录后修改密码以及 DirectMail 账号安全邮件。新注册和未验证登录需要邮箱验证；存量会话不失效，存量账号下次新登录时完成验证。验证和重置令牌均为 1 小时，密码 8–128 位，重置撤销全部旧会话，修改密码撤销其他会话。
契约（影响其他端 / 共享）：
- **Better Auth 路由**：`POST /api/auth/sign-up/email` 与 `sign-in/email` 支持固定 `callbackURL`；注册无论新邮箱还是重复邮箱均返回 `{status:true,emailVerificationRequired:true}` 且不创建/下发会话，避免暴露账号是否存在；新增客户端调用 `send-verification-email {email,callbackURL}`、`request-password-reset {email,redirectTo}`、`reset-password {token,newPassword}`、`change-password {currentPassword,newPassword,revokeOtherSessions:true}`。回调只允许 `paperbanana.asia` HTTPS 页面。
- **用户与错误**：session user 增加 `emailVerified:boolean`；客户端识别 `EMAIL_NOT_VERIFIED`、`INVALID_TOKEN`、`TOKEN_EXPIRED`、`TOKEN_USED` 和 HTTP 429 `X-Retry-After`，不得用英文文案猜状态。忘记密码响应不得泄漏邮箱是否存在。
- **邮件/限流 env**：新增 `AUTH_EMAIL_DELIVERY_ENABLED`、`AUTH_REQUIRE_EMAIL_VERIFICATION`、`AUTH_VERIFICATION_CALLBACK_URL`、`AUTH_PASSWORD_RESET_URL`、`AUTH_EMAIL_WINDOW_SECONDS/MAX/DAILY_MAX` 与 `ALIBABA_DIRECTMAIL_*`。DirectMail 固定使用杭州 `cn-hangzhou / dm.aliyuncs.com`；先开邮件、真实收信验证，再开强制验证；必须使用独立最小权限 RAM 凭据。
各端待办：
- [x] auth-gateway（Better Auth 配置、DirectMail 双语邮件、邮箱/IP HMAC 限流、数据库路由限流、日志脱敏与 TDD）
- [x] Web（验证/重置落地页、登录面板忘记密码/待验证/重发冷却）
- [x] iOS（`emailVerified`、明确状态枚举、安全中心、改密/恢复 API 与错误映射）
- [ ] 微信小程序 / Android / Windows / macOS / HarmonyOS（消费共享路由、状态字段和错误码；改造前不得开启其强制验证发布）
- [ ] 部署 / 运维（杭州 DirectMail 域名、SPF/MX/DKIM/DMARC、触发邮件地址和 `dm:SingleSendMail` 专用 RAM 已完成；生产环境密钥已安全暂存。仍需合并/部署 Web 与 Gateway、保持强制验证关闭完成三家真实邮箱 smoke，再开启强制验证）

### [2026-08-22] 评审取图失败保留已生成结果 — by Codex
变更：结构图或统计图 PNG 任务首次渲染已经成功后，视觉评审模型若因图片下载超时而失败，Core 会重试评审一次；仍失败或出现其他评审异常时，保留最后一张成功图片并完成任务，不再把已经出图的任务整体标记为失败。
契约（影响任务状态语义，不新增字段）：
- 已知图片下载超时的重试动作本身只重试评审，不重新规划或重复首次渲染。
- 评审最终失败时写入带 `error` 的 `critic` stage，标题标明“已跳过”，日志记录回退原因；最终 `status='succeeded'` 且 `resultImages` 正常可用。
- 规划、首次渲染、结果持久化等发生在可用图片产生前后的关键失败仍保持原有失败关闭语义；本条不会把真正未出图的任务误报为成功。
各端待办：
- [x] paperbanana-api / Laf Core（结构图与统计图的超时单次重试、最后成功图片回退与回归测试）
- [x] Web / 微信小程序 / packages-api（现有 `status/resultImages/stages/error` 契约可直接消费，无需客户端字段变更）
- [ ] 部署 / 运维（合并后部署香港 Core，并用非计费故障注入或真实偶发场景确认成功结果与评审警告同时可见）

### [2026-08-21] 图研Tuyan 微信小程序 1.0.0 全量升级 — by Codex
变更：仅微信小程序对外升级为“图研Tuyan 1.0.0”，技术标识继续使用 PaperBanana；客户端默认 API/Auth 已迁移到香港 `https://api.paperbanana.asia`。小程序完整消费当前 v9 registry、显式模型路由、负向提示词、生成/精修比例与清晰度、306 条参考库分页、结果 `objectKey`、独立精修和账户删除契约。
微信端验收：
- [x] 注册表驱动的五渠道模型选择与失败关闭；普通模式单渠道默认三角色，专业模式完整 `modelRoutes`，实际可达角色密钥作用域与 Ark 免费优先/图片付费二次确认。
- [x] 方案 A 分层工作台、六套精确模板、独立 `negativePrompt`、十种规范比例、生成设置原子保存、上传 finalize/abort 与参考来源互斥。
- [x] `scope=bench` 每页 12 条、搜索/双分面/diagram-plot、latest-wins、跨页最多 10 项与详情回退。
- [x] 任务来源/路由/负向提示词/比例/阶段/错误/资产归一；独立精修优先 `sourceImageObjectKey` 并分别消费 `refineResolutions/refineAspectRatios`。
- [x] 退出、隐私说明、密码重验与二次确认删除；成功清理 Cookie、草稿、任务缓存和内存密钥；原生折叠教程显示实时 registry 版本与默认路线。
- [x] TypeScript check/build 与小程序纯逻辑/契约测试；AppID、本地任务键、Cookie 键和数据库无需迁移。
- [ ] 微信后台精确 request/downloadFile 域名保存、开发者工具真机 QA、1.0.0 体验版上传、用户 BYOK 付费生成+精修冒烟、审核与正式发布。
- [ ] Android / iOS / Windows / macOS / HarmonyOS（本条不改造、不改名，继续按各自待办推进）。

### [2026-08-21] 精选模板、负向提示词与权威比例能力 v9 — by Codex
变更：Core 注册表升级为 `2026-08-21.v9`，Web 新增 6 套精选参考模板、醒目的生成设置卡、十种固定比例与新版教程；共享 API / Core 新增精确参考 ID 查询和独立负向提示词。新增字段均向后兼容，其他端可暂时忽略，但不得自行推断模型比例能力或把不支持比例降级为 `16:9`。
契约（影响其他端 / 共享）：
- **精确参考图库**：`referenceLibrary` 新增可选 `referenceIds`，只接受 1–6 个去重后的 ID，保持请求顺序并只签名所选图片；不得与 `scope/limit/page/pageSize/query/visualCategory/researchDomain/taskName` 混用。请求冲突返回 `400 + REFERENCE_LIBRARY_REQUEST_INVALID`；缺失、无图或无法签名返回 `422 + REFERENCE_LIBRARY_SELECTION_INVALID`。
- **负向提示词**：`createJob.negativePrompt` 可选、独立于 `methodContent`，trim 后最多 1,000 字符；Laf 使用 camelCase，FastAPI 兼容路径映射为 `negative_prompt`。Core 独立校验、持久化、计入输入字符数，并按方法内容既有可见范围返回；规划、首次渲染、评审后重渲染、SVG 与 Plot 的创建路径均使用独立 `<avoidance_constraints>` 区块，精修 action 语义不变。
- **比例能力**：固定目录为 `1:1/3:2/2:3/4:3/3:4/16:9/9:16/21:9/1:4/4:1`，另保留 `auto`。image 能力新增必定数组 `aspectRatios` 与 `refineAspectRatios`；OpenRouter 仅取官方目录 `supported_parameters.aspect_ratio` 的规范交集，缺失即空数组；其他 Provider 使用逐模型权威数组及精确比例/尺寸映射，未知或不支持项不得静默回落。
- **失败关闭**：非法比例返回 `400 + INVALID_ASPECT_RATIO`；生成不支持返回 `400 + ASPECT_RATIO_UNSUPPORTED`；精修不支持返回 `400 + REFINE_ASPECT_RATIO_UNSUPPORTED`。三类校验均须发生在账号检查、admission、任务写入和付费 Provider 调用前。旧客户端省略比例仍按历史 `16:9`；当所选模型不支持时会明确失败，客户端应从注册表选择支持项或 `auto`。
各端待办：
- [x] paperbanana-api / Laf Core / packages-api（精确参考、负向提示词、v9 比例目录、准入与 Provider 映射、TDD）
- [x] Web（6 套模板与轮播/预览/安全套用、设置卡、十比例禁用原因、负向提示词、新教程与桌面/390px 验收）
- [x] iOS（消费 `negativePrompt`、`aspectRatios/refineAspectRatios` 与新失败码，未登记能力失败关闭）
- [x] 微信小程序（已消费 `negativePrompt`、`aspectRatios/refineAspectRatios` 与新失败码；缺失能力只开放自动）
- [ ] Android / Windows / macOS / HarmonyOS（按需消费；未改造前不得宣称未登记比例可用）
- [x] 部署 / 运维（PR #10 已合并为 `6e03969`；香港 Core 镜像与生产部署、Pages 均已成功。生产已验证注册表 v9、六个固定参考 ID 顺序/签名、非法比例 `INVALID_ASPECT_RATIO` 失败关闭、模板套用、十比例设置和教程；未执行付费图片生成，真实比例与负向提示词生成仍需单独授权）

### [2026-08-20] OpenRouter 34 模型付费验证与 PNG 统一输出 — by Codex
变更：Core 注册表升级为 `2026-08-20.v8`。在用户授权的 9 美元上限内，对此前因输出格式元数据不兼容而禁用的 34 个 OpenRouter 图片模型逐项执行付费生成，34/34 均返回真实图片；实际默认响应为 14 个 PNG、10 个 JPEG、10 个 WebP。运行时按这份精确 ID 白名单开放模型，并在存储前统一为真实 PNG；本次验证总成本约 2.42 美元。
契约（影响其他端 / 共享）：
- **最终格式**：所有兼容 OpenRouter 图片路线对客户端统一暴露 `capabilities.outputFormats:['png']`；34 项付费白名单覆盖 14 个原生 PNG、10 个 JPEG、10 个 WebP，既有 SVG 兼容路线继续经有界 Resvg 栅格化。原生 PNG 必须通过完整 chunk/CRC、IHDR/IEND 与 8192 边长/20MP 上限校验；JPEG 沿用有界解码器转 PNG；WebP 仅允许静态、可解析尺寸且不超过同一上限，由精确 `sharp@0.35.3` 转 PNG。未知 ID、动画 WebP、损坏数据和其他格式继续失败关闭。
- **目录纠错**：`bytedance-seed/seedream-4.5` 的付费 1K 调用被供应商拒绝，运行时与注册表移除 1K，仅允许 2K/4K；不会从名称或错误目录值推断兼容性。
- **验证语义**：逐项付费结果只建立服务器内维护的精确转换白名单；公开动态项仍保持 `verificationState:'catalog'`、`verified:false`，不把一次测试冒充为所有用户账号权益。漂移检查会监控 34 个精确 ID 及 Seedream 4.5 的 canonical 2K/4K 能力，缺失或能力退化即 warning，永不自动接纳新项。
- **运行依赖**：香港 Node 镜像保留 `sharp@0.35.3` 为原生外部依赖，并在 Docker 构建中执行真实 WebP→PNG smoke；Core 的新加坡出口依赖同步固定到已修复已知安全公告的 `undici@7.29.0`。暂停的 Laf 回滚只有在控制台确认 `jpeg-js@0.4.4`、`sharp@0.35.3`、兼容 Node/OS/CPU 且真实 WebP smoke 通过后，才可人工发布；verification-only workflow 不安装、不登录、不 push。
各端待办：
- [x] paperbanana-api / Laf Core（v8 注册表、PNG/JPEG/WebP 归一、尺寸/结构边界、Seedream 4.5 纠错、漂移监控与 TDD）
- [x] Web（继续只消费服务端角色与 `outputFormats`；34 项会在 PNG 模式自动可选，无需名称推断）
- [x] iOS（动态 OpenRouter 图片目录仅消费 v8+ 权威能力）
- [x] 微信小程序（动态展示 OpenRouter 权威目录与 PNG 能力，不按模型名推断）
- [ ] Android / Windows / macOS / HarmonyOS（若展示动态 OpenRouter 图片目录，消费 v8 权威能力）
- [x] 部署 / 运维（PR/CI/香港 Core/Pages 已发布；用户于 2026-08-21 手工确认原生 PNG、JPEG→PNG、WebP→PNG 三条生产代表性 smoke 均通过）

### [2026-08-20] Ark 中国区完整相关目录与 Seed 2.1 / Seedream 5.0 路由 — by Codex
变更：Core 注册表升级为 `2026-08-20.v7`，依据火山方舟中国区当前模型列表、发布/下线公告、深度思考和图片生成文档，将 Ark 与 PaperBanana 文本、视觉、图像角色相关的现役目录从 3 项扩为 21 项。默认升级为 `doubao-seed-2-1-pro-260628`（main/vision）与 `doubao-seedream-5-0-pro-260628`（image）；不使用 ID 尾部日期猜测 `releasedAt`，所有 Ark 日期仍为 `null`。
契约（影响其他端 / 共享）：
- **目录与生命周期**：新增 Seed 2.1 Pro/Turbo、Seed Evolving、Seed 2.0 现役往期版、GLM 5.2、DeepSeek V4 现役版与 Seedream 5.0 Pro/5.0/4.5；Evolving 是滚动 alias，固定 `lifecycle:'unknown'`且不得设为默认。Code Preview 固定 `preview`；角色/翻译专用模型仅为目录完整性展示，`selectable:false`。已 EOM/EOS 的 Kimi 2.5、GLM 4.7、Seed 1.x、DeepSeek V3.2、Seedream/SeedEdit 3.0 不登记。
- **执行与能力**：Seed 2.x/Evolving/GLM 5.2/DeepSeek V4 的 Chat 请求显式 `thinking:{type:'disabled'}`，避免最小验证被默认深度思考误判超时。Seedream 5.0 Pro 仅允许 1K/2K 且不发其不支持的 `sequential_image_generation/stream`；5.0 映射 2K/4K，4.5 映射 2K/4K，4.0 映射 1K/2K/4K。`doubao-seedream-5-0-lite-260128` 仅作公开 alias，归一到 `doubao-seedream-5-0-260128`，不重复展示。
- **验证边界**：公开目录仍不等于用户已开通。`providerAccountCatalog` 继续固定 `accountCatalogAvailable:false`，仅用 inference API Key 对当前选中的最多 3 条路线做临时推理 smoke；绝不将 Bearer Key 发往需 AK/SK 签名的 `ListModelActivations`。未知 ID、错 role、未适配专用模型和不支持的分辨率仍在付费调用前失败关闭。
- **Web 展示**：OpenRouter、百炼、Ark 等所有 aggregator 均展示“暂不兼容”分区；只有禁用条目的模型厂商也会出现在二层厂商抽屉。搜索同时索引 role、能力和 protocol，不再只匹配名称。
各端待办：
- [x] paperbanana-api / Laf Core（v7 目录、默认、能力、alias、模型级请求契约与 TDD）
- [x] Web（最新 fallback、所有聚合渠道的禁用分区、禁用-only 厂商与能力搜索）
- [x] iOS（Ark 目录、现役项、不可选边界与付费图片探测确认由 live registry 驱动）
- [x] 微信小程序（消费 Ark v7 现役目录、不可选边界和账号 inference probe）
- [ ] Android / Windows / macOS / HarmonyOS（若展示 Ark 目录，同步 v7 边界）
- [ ] 部署 / 运维（本条尚未发布；发布后用授权 Ark Key 分别验证默认 main、vision 和付费 image，不把公开目录当作账号开通证据）

### [2026-08-20] OpenRouter 目录生命周期与验证状态如实化 — by Codex
变更：Core 注册表升级为 `2026-08-20.v6`，不再把 OpenRouter 全局匿名目录中的“存在且协议兼容”冒充为稳定版或真实调用已验证。动态目录项新增 `verificationState`，OpenRouter 全局项固定为 `catalog` 且保留兼容字段 `verified:false`；没有权威生命周期的项使用新增的 `lifecycle:'unknown'`，仅三项服务端静态正式推荐默认保留 `stable`。`releasedAt` 仍只接受厂商权威日期，未知保持 `null` 并排在已知日期之后。
契约（影响其他端 / 共享）：
- **模型条目**：新增向后兼容字段 `verificationState:'registry'|'catalog'|'account-visible'|'inference-verified'|'unverified'`；`lifecycle` 新增 `unknown`。旧客户端可继续忽略新字段，但不得把缺失/未知 lifecycle 默认显示为“稳定版”，也不得把 `verified` 或目录存在解释为付费调用成功。
- **OpenRouter 语义**：全局 `/models` 与 `/images/models` 只证明“目录兼容”，不证明用户账号可见、权益已开通或真实调用成功；逐模型付费 smoke 的结果必须以后续账号级/推理级状态单独记录，不得回写为全局目录事实。
- **Web 展示**：模型卡区分“目录兼容（未实测）”“账号可见（未实测）”“真实调用已验证”，未知 lifecycle 显示“状态未知”；推荐列表只接纳显式 `stable` 项。
各端待办：
- [x] paperbanana-api / Laf Core（v6 契约、OpenRouter 文本/视觉/图像动态项真值与回归测试）
- [x] Web / packages-api（Web 已消费并如实展示；packages-api 原样透传新增字段，无请求变更）
- [x] iOS（识别未知 lifecycle 与 `verificationState`，不把目录兼容冒充调用成功）
- [x] 微信小程序（区分 `unknown`、`catalog`、`registry` 与 `inference-verified`）
- [ ] Android / Windows / macOS / HarmonyOS（展示目录时识别生命周期与验证状态）
- [ ] 部署 / 运维（本条未发布；付费逐模型验证不得使用全局目录状态代替）

### [2026-08-20] 精修分辨率真实能力与入队前失败关闭 — by Codex
变更：Core 注册表升级为 `2026-08-20.v5`，每个 image 条目新增必定数组 `capabilities.refineResolutions`，仅可包含 `1K|2K|4K`，并与生成能力 `resolutions` 分离。`refineImage.imageSize` 现在精确接受 `1K|2K|4K`；解析所选权威 image route 后，不支持的尺寸在账号检查、admission、Mongo insert 和计费/推理 provider 调用前以 `400` + `REFINE_RESOLUTION_UNSUPPORTED` 拒绝，不再静默夹到其他尺寸。OpenRouter 权威解析可先发生无鉴权目录查询；入队后若目录漂移，执行仍会再次要求精确尺寸并失败关闭。
契约（影响其他端 / 共享）：
- **注册表**：Gemini 按各 image adapter 实际尺寸；百炼 direct-edit 最高 2K（`wan2.7-image-pro` 的生成 4K 不等于精修 4K），analyze-redraw 沿用其生成尺寸；OpenAI Images direct edit 固定为 2K；Ark Seedream 为 1K/2K/4K；OpenRouter 仅映射官方目录 `resolution.values` 中已声明的规范值，未声明时为空数组。
- **请求语义**：缺省 `imageSize` 仍为历史兼容的 `2K`；显式 `modelRoutes` 与 legacy model 字段路由都保持。客户端必须以 `refineResolutions` 提供可选项，不得从 `resolutions` 或模型名推断。
各端待办：
- [x] paperbanana-api / Laf Core（registry v5、精修准入、direct/analyze/1K/4K/OpenRouter 回归）
- [x] Web / packages-api（消费 `refineResolutions`、仅展示所选 image route 可执行的精修尺寸；旧目录保守回退 2K）
- [x] iOS（消费 `refineResolutions`，缺失保守兼容 2K、明确空集合禁用精修）
- [x] 微信小程序（独立消费 `refineResolutions`，空数组时禁止精修提交）
- [ ] Android / Windows / macOS / HarmonyOS（后续消费新字段，未改造前不得宣称 4K 精修可用）
- [ ] 部署 / 运维（本条未部署、未改环境变量）

### [2026-08-20] 显式路由目录校验、plot 可达能力与 Laf 手动回滚边界 — by Codex
变更：Core 将“显式 `modelRoutes` 的三路注册表合法性”与“本任务真实可达阶段”分开：显式三路均必须存在、role 正确且可选，但只有真实可达路线需要 key/调用成本。`prevalidatedManualReferences` 改为仅服务端手选查询后附加，客户端同名字段永不进入后台 DTO。2K/4K plot 仅当注册表解析为 `direct-edit` 时可达 image；显式 `maxCriticRounds=0` 不再被默认值覆盖。Laf 回滚 workflow 改为只读验证指引，暂停任何自动源码发布。
契约（影响其他端 / 共享）：
- **路由准入**：显式三路完整性与注册表合法性必须全部通过；key、Ark 账号 probe 和执行输出协议只对任务可达 role 生效。legacy 请求仍只校验实际可达路线。
- **createJob 语义**：`prevalidatedManualReferences` 是服务端内部字段，客户端不得传入或依赖；`maxCriticRounds=0` 精确表示无 critic。plot 的 2K/4K 只在 image route 为 `direct-edit` 时产生图像路线调用。
- **Laf 回滚**：`.github/workflows/deploy-laf-functions.yml` 仅验证仓库先决条件，不含任何 source push。获批回滚仅能在 Laf 控制台手动执行，且须先从控制台权威 custom dependency 元数据确认精确版本 `jpeg-js@0.4.4`；本条未部署、未改环境绑定。
各端待办：
- [x] paperbanana-api / Laf Core（服务端手选字段、双层路由校验、plot 能力与 zero-critic 回归）
- [x] CI / 回滚文档（verification-only，Laf README 标明 rollback-only）
- [x] Web（保留显式三路 role/selectable 预校验，并仅对实际可达 role 要求凭据与 Ark probe）
- [ ] 部署 / 运维（仅在获批回滚时按上述控制台流程处理；本条未发布）

### [2026-08-20] 多路由精确准入、Ark 探针截止时间与 Laf 回滚依赖门禁 — by Codex
变更：Core 在入队/持久化前按实际可达执行阶段校验 `main/image/vision`，精修任务保留归一后的 `configurationMode=simple|advanced`（旧请求默认 `simple`）；后台 DTO 改为字段白名单。Gateway 的 `providerAccountCatalog` 仅转发 `apiKeys.ark` 与探针契约字段。Ark 账号 probe 增加可中止端到端截止时间。Laf 原始源码回滚要求 custom dependency 精确版本 `jpeg-js@0.4.4`；其自动发布边界由上方新条目取代。注册表 v4 仅为有厂商官方精确证据的模型写入 ISO 发布日并按已知日期倒序、未知日期置后。
契约（影响其他端 / 共享）：
- **路由与任务 DTO**：`requiredCreateRouteRoles` / `requiredRefineRouteRoles` 的完整实际角色必须在 admission 前通过注册表校验；不会触达 vision 的旧 main-only 请求仍兼容。公开精修任务的 `configurationMode` 不再强制为 `advanced`，`routingMode` 仍完全由服务端路由推导。
- **密钥与探针**：后台 create/refine DTO 只含执行字段；账号目录网关丢弃 Ark 以外 provider key 和任意凭证别名。`PAPERBANANA_PROVIDER_ACCOUNT_PROBE_TIMEOUT_MS` 可选，默认 `12000`，限制 `100..30000` 毫秒，超时会 abort 并释放全局/owner/IP 槽位。
- **回滚发布**：此条当时的输入自证设计已被上方新条目取代；当前 workflow 仅做仓库验证，Laf 回滚仅能经控制台权威元数据核对后手动完成。
- **注册表日期**：`registryVersion=2026-08-20.v4`；`releasedAt` 只采信精确官方发布日期，已知日期倒序、`null` 置后，`officialSourceUrl` 继续保留。
各端待办：
- [x] paperbanana-api / Laf Core（精确准入、模式持久化、DTO 白名单、探针 deadline、注册表日期与测试）
- [x] auth-gateway（Ark key 透明转发收窄、全形态 `apiKeys/api_keys` 日志清洗）
- [x] CI / 回滚文档（已由上方新条目收紧为 verification-only；未部署）
- [x] Web（展示继续按 `releasedAt`，并接受精修历史默认 `simple`）
- [x] iOS（展示按权威 `releasedAt`，接受精修历史默认 `simple`）
- [x] 微信小程序（按 `releasedAt` 展示并接受精修历史默认 `simple`）
- [ ] Android / Windows / macOS / HarmonyOS（展示时继续按 `releasedAt`，并接受精修历史默认 `simple`）
- [ ] 部署 / 运维（获批回滚时仅能在 Laf 控制台核对 custom dependency 后手动发布；本条未改环境绑定、未发布）

### [2026-08-19] Ark CN 数据面出站白名单与香港健康探针 — by Codex
变更：Core `providerEgress` 与新加坡 Squid 仅新增精确数据面主机 `ark.cn-beijing.volces.com`；`sg-required` 走固定新加坡代理，`disabled` 对该主机及其单个根点等价形式继续失败关闭。香港定时 smoke 增加无鉴权、只读、非计费的 `GET /api/v3/models`，预期 401；未登记任何 Ark 控制面、CDN、通配符或后缀域名。
契约（影响其他端 / 共享）：
- **出站策略**：仅香港 WireGuard 源可通过 Squid CONNECT 到上述精确主机的 443；私网/混合 DNS、PTR、字面量、非 443、额外点及 lookalike 继续拒绝。TLS 不解密、不缓存。
- **发布边界**：本条只提交 Core/SG/HK 运维契约和测试；生产部署仍须由人工工作流完成，客户端不得因本条自动将 Ark 标记为已上线。
各端待办：
- [x] provider egress（Core 精确 origin、SG ACL、HK smoke/monitor、负路径与密钥扫描测试）
- [ ] 部署 / 运维（未发布；须先完成 Laf `jpeg-js@0.4.4` 回滚依赖、Web 联调和真实账号最小 smoke）
- [x] Web（仅将当前任务可达 Ark 角色在显式推理 probe 成功后视为可提交；不把静态目录冒充账号已开通）
- [x] iOS（未验证 Ark 条目不显示为账号已可用，按实际路线执行临时探测）
- [x] 微信小程序（未通过当前页面 inference probe 的 Ark 路线不显示为账号已验证且禁止提交）
- [ ] Android / Windows / macOS / HarmonyOS（未验证条目不得显示为账号可用）

### [2026-08-19] Core Ark 适配器、账号推理验证与模型注册表 v3 — by Codex
变更：Core 新增火山方舟（Ark）静态注册表、CN 数据面适配器和不冒充账号全量目录的 `providerAccountCatalog` 推理 smoke；同时更新 Gemini/OpenRouter/百炼当前默认项，并为所有 provider/model 补充访问类型、账号目录要求和官方来源元数据。本条不包含 Web、生产出口策略、原生端或部署。
契约（影响其他端 / 共享）：
- **注册表 v3**：provider 新增 `accessKind: direct|aggregator`、`routeContractVersion:1`、`accountCatalogRequired`；model 新增 nullable `releasedAt` 与 `officialSourceUrl`，未知发布时间固定为 `null`，OpenRouter `created` 不作为厂商发布时间。默认值更新为 Gemini `gemini-3.7-flash`、OpenRouter `openai/gpt-5.6-sol` / `sourceful/riverflow-v2.5-pro` / `google/gemini-3.7-flash`、百炼 `qwen3.8-max` / `wan2.7-image-pro` / `qwen3.7-plus`。
- **Ark 注册表/执行**：仅登记官方 ID `doubao-seed-2-0-lite-260428`、`doubao-seed-2-0-mini-260428`、`doubao-seedream-4-0-250828`；条目均 `verified:false`、需 entitlement。文本/视觉固定走 `https://ark.cn-beijing.volces.com/api/v3/chat/completions`；Seedream 4.0 生成/同模型直编走 `/images/generations`，强制 `response_format=b64_json`，URL-only 结果失败关闭且不下载；返回的 JPEG 经有界解码后转为真实 PNG 再进入既有存储/视觉链。未知 ID、错 role 和隐式替换均禁止。
- **账号验证 action**：`providerAccountCatalog` 只接受内存中的 `apiKeys.ark` 与最多 3 个去重显式 probe，固定返回 `accountCatalogAvailable:false`、`catalogAuth:access-key-required`、`verificationMode:inference-smoke`；main/vision 做最小推理，image 必须 `confirmPaidImageProbe:true`。绝不把 inference key 发往需 AK/SK 签名的 `ListModelActivations`，不持久化/缓存/回显密钥或原始失败。
- **发布边界**：当前 Core 已能通过注入 transport 保留标准出口失败信号，但生产 egress 尚未登记 Ark origin；Node 构建会内联 `jpeg-js`，原始 Laf 回滚源码则必须先在 Laf custom dependency 中确认 `jpeg-js@0.4.4`（现有源码推送 workflow 不负责安装）。出口策略与 Laf 依赖门禁完成前客户端不得把 Ark 标成生产可用，亦不得把静态条目当作账号已开通目录。
各端待办：
- [x] paperbanana-api / Laf Core（注册表、适配器、账号推理验证、混合路由、TDD 与文档）
- [x] packages-api / auth-gateway（账号目录 action 的安全转发与共享类型已在前序并行任务完成）
- [x] Web（消费 v3 元数据、显式触发账号 probe 与付费图片确认；未验证条目不得显示为账号可用）
- [x] provider egress（登记 Ark CN origin，disabled 与负路径必须失败关闭；不得扩展到控制面/CDN）
- [x] iOS（消费 Ark v3+ 注册表与最多三条路线探测，图片探测需明确付费确认）
- [x] 微信小程序（消费 v3+ 元数据、Ark probe 与账户验证边界）
- [ ] Android / Windows / macOS / HarmonyOS（按需消费新注册表）
- [ ] 部署 / 运维（未发布；须先完成出口策略、确认 Laf `jpeg-js@0.4.4` 回滚依赖、Web 联调和真实账号最小 smoke）

### [2026-08-19] Core 多 Provider 模型路由契约 v1 — by Codex
变更：`createJob` / `refineImage` 新增完整 `modelRoutes {main,image,vision}`，Core 按阶段路由主模型、图像模型和视觉模型；旧请求仍从 `provider/mainModelName/imageModelName/referenceVisionModelName` 派生单路由。本条仅交付 Laf/Core 契约与执行，未接入 Ark 适配器或任何客户端。
契约（影响其他端 / 共享）：
- **请求**：`modelRoutes.main/image/vision` 每项为 `{accessProvider,modelId}` 且必须完整；`configurationMode=simple` 禁止混合 provider，`advanced` 允许。显式 routes 与旧 `provider/*ModelName` 冲突时返回 `400 + businessCode=MODEL_ROUTE_CONFLICT`；顶层 `provider` 永远是 main route 的兼容影子，不会返回 `mixed`。
- **任务 DTO**：新建任务持久化并公开 `modelRoutes`、`routingMode=single|mixed`、`modelRoutingVersion=1`、`modelRoutingSource=explicit|legacy-derived`，同时保留旧模型字段。历史记录仅在 `provider + mainModelName + imageModelName` 完整时按旧语义补出 routes，不猜测不完整记录。
- **执行 / BYOK**：planner、stylist、文本 critic、SVG、plot 模型调用走 main；参考图分析和成图视觉 critic 走 vision；PNG 生成、重渲染、升清和 direct edit 走 image；plot-worker 不持有 key。后台 DTO 无密钥，准入闭包仅持有实际可达阶段所需 provider key；`direct-edit` 仅 image，`analyze-redraw` 仅 vision+image。
- **注册表**：`modelRegistry` 顶层新增 `routeContractVersion:1` 和 `supportsModelRoutes:true`。Core 类型已预留 `ark`，但未提供 Ark registry/adapter/egress，因此 Ark route 当前 fail-closed，不得在客户端标记为可用。
各端待办：
- [x] paperbanana-api / Laf Core（解析、校验、持久化/公开 DTO、阶段路由、最小密钥闭包与回归测试）
- [x] packages-api / auth-gateway（转发/归一 `modelRoutes`，保留旧字段与模型目录路由元数据；网关按写入主体安全转发 provider account catalog）
- [x] Web（专业模式支持分角色选 provider/model；普通模式仍单 provider）
- [x] iOS（普通模式单 Provider 三路默认；专业模式完整 `modelRoutes`，仅发送实际可达角色所需密钥）
- [x] 微信小程序（专业模式完整 `modelRoutes`，普通模式单渠道默认三角色）
- [ ] Android / Windows / macOS / HarmonyOS（后续按需接入）
- [ ] Ark adapter / registry / egress（后续独立任务，本次未实现）
- [ ] 部署 / 运维（本次未发布，须等后续合并与联调）

### [2026-08-19] 结果图公开权威 objectKey — by Codex
变更：生产百炼 smoke 发现结果图已写入 OSS，但公开任务 DTO 只有 `filename/url`，导致独立精修页无法按约定优先使用对象键；现在新任务持久化并返回 `resultImages[].objectKey`，历史 bucket 结果从既有 `filename` 只读补出该字段；已部署并完成百炼生成→`direct-edit` 精修验收。
契约（影响其他端 / 共享）：
- **公开任务 DTO**：`getJob/userJobs/adminJobs` 的 bucket 结果图新增稳定 `objectKey`；签名 `url` 仍只用于预览，客户端发起精修时优先传 `sourceImageObjectKey`。
- **兼容边界**：历史 `storage=bucket` 且只有 `filename` 的记录映射为同值 `objectKey`；数据库 data URL 回退不会伪造对象键。
各端待办：
- [x] paperbanana-api / Laf 回滚（新记录持久化、历史 DTO 兼容与测试）
- [x] packages-api / Web（已优先消费 `objectKey`，保留签名 URL 预览）
- [x] iOS（独立精修优先使用 `sourceImageObjectKey`，签名 URL 仅作预览与旧记录兼容）
- [x] 微信小程序（独立精修优先 `sourceImageObjectKey`，历史任务保留受控 URL 兼容）
- [ ] Android / Windows / macOS / HarmonyOS（后续精修入口改用对象键）
- [x] 部署 / 运维（Core 不可变镜像已发布；真实百炼 1K 生成与 2K `direct-edit` 精修成功，两个结果 DTO 均返回 `objectKey`）

### [2026-08-19] zh-CN.v2 固定语料补齐历史空白英文 — by Codex
变更：生产前置校验发现 306 条有图 bench 记录中 `ref_260`、`ref_305` 的历史英文 `summary` 为空；同步器现在只对缺失或纯空白的 `title/summary` 使用固定 PaperBananaBench 快照补齐，已有非空英文保持原值；已部署并完成 306/306 验收。
契约（影响其他端 / 共享）：
- **数据来源**：英文补齐值与中文元数据来自同一固定提交 `a876264bcd1e826a0320f805f8fb1cd705cf510f`，同步前后仍强制 306 个唯一业务 ID、306 条有图记录和 306 份完整英文搜索字段。
- **保留边界**：只补缺失、非字符串或纯空白英文；任何已有非空 `title/summary`、图片字段、`taskName`、任务和用户选择均不覆盖。
各端待办：
- [x] 语料迁移与 304→306、幂等及保留现有英文测试
- [x] paperbanana-api / Web / 其他客户端（公开字段和请求响应不变，无需改造）
- [x] 部署 / 运维（首次补齐 2 条、同步 306 条；随后幂等重跑为 0 变更且仍 localized=306）

### [2026-08-19] v2 参考元数据同步保留历史 taskName — by Codex
变更：zh-CN.v2 元数据同步与回滚不再覆盖 `paperbanana_references.taskName`，避免旧数据或自定义分类在回滚后被永久改写；已随 zh-CN.v2 生产迁移部署。
契约（影响其他端 / 共享）：
- **迁移边界**：v2 脚本只写本地化与语料版本字段；`taskName` 继续由原始 bench/import 记录所有，前向同步和元数据回滚都不改它。
- **306 条联合语料**：Web/Core 的 `scope=bench` 分页仍按业务 `id` + `source=paperbanana-bench` + `corpusVersion` 联合 306 条，不依赖迁移重写 `taskName`。
各端待办：
- [x] 语料迁移 / 回滚脚本与 306 条验收测试
- [x] paperbanana-api / Web（公开分页请求与响应字段不变，无额外改造）
- [x] 部署 / 运维（生产前向同步使用更正后脚本，未触发回滚）

### [2026-08-19] PaperBananaBench 306 条 zh-CN.v2 语料与服务端分页— by Codex
变更：参考库固定为当前 PaperBananaBench 306 条有图案例（66 diagram + 240 plot），4 条无图内部 fallback 与 bench 计数彻底分离；已部署香港 Core、Mongo 元数据与 Web。
契约（影响其他端 / 共享）：
- **语料字段**：`RetrievedReference`/`referenceLibrary` 在旧字段上新增 `shortIntroZh/detailZh/visualCategory/researchDomain/keywords/corpusVersion`；当前版本为 `zh-CN.v2`，英文 `title/summary` 继续用于检索。
- **分页请求**：`referenceLibrary` 支持 `scope/page/pageSize/query/visualCategory/researchDomain/taskName`，`pageSize` 默认 12；响应返回 `totalItems/totalPages/page/pageSize/facets/corpusVersion`。默认 `scope=bench` 且跨 taskName 暴露 306 条；仅发 `taskName/limit` 的旧端保持兼容。查询/分面在服务端分页前完成，只给当页图片签名。
- **手选参考**：`manualReferenceIds` 最多 10 个唯一 ID，服务端用 `$in` 直查且保留请求顺序，不再只扫前 200 条；缺失/无图返回 `422 + REFERENCE_SELECTION_INVALID`，超限返回 `400 + REFERENCE_SELECTION_LIMIT`，不再静默丢弃。
- **迁移/回滚**：香港同步脚本按业务 `id` 幂等更新且必须验收 306 条有图 v2 记录；`--rollback` 仅回滚元数据版本，不删图片、任务或选择记录。
各端待办：
- [x] paperbanana-api / Laf / packages-api（分页、分面、搜索、当页签名、手选严格错误）
- [x] 语料与迁移工具（306 条固定快照、质量门禁、幂等同步/元数据回滚）
- [x] Web（消费服务端分页/分面/详情字段，不再一次拉取 295 条本地过滤）
- [x] 部署 / 运维（生产返回 totalItems=306、pageSize=12、totalPages=26、corpusVersion=zh-CN.v2；当页图片与中文字段完整）
- [x] iOS（接入 v2 分页、搜索、facets、跨页选择缓存与 10 张上限）
- [x] 微信小程序（`scope=bench`、每页 12 条、搜索/分面/详情/跨页选择）
- [ ] Android / Windows / macOS / HarmonyOS（按需接入新分页响应）

### [2026-08-19] 模型注册表 v2 与模型级精修能力 — by Codex
变更：服务端 `modelRegistry` 成为模型可用性与精修语义的唯一权威，修正 Gemini/OpenAI/百炼直连目录与适配器，OpenRouter 继续以官方动态目录 fail-closed；已部署香港 Core 与 Web。
契约（影响其他端 / 共享）：
- **注册表字段**：每个 model 在旧有 `id/label/roles/capabilities/protocol/availabilityNotes` 上新增 `vendor`、`lifecycle`、`recommended`、`requiresEntitlement`、可选 `entitlement`、`inputModalities`、`outputModalities`、`verified`、`selectable`、可选 `disabledReason`、`roleReasons`；`capabilities` 新增 `imageEditMode: direct-edit|analyze-redraw|none` 和 `outputFormats`，保留旧字段向后兼容。OpenRouter 不兼容图像模型仍在目录可见，但 `selectable=false`、无 `image` role，且有精确禁用原因；客户可展示但不得提交。
- **精修契约**：`modelCapability` 新增 `supportsDirectEdit/refineMode/refineReason`；`refineImage` 成功响应新增 `refineCapability {mode,directEdit,reason}`，任务 DTO 新增 `refineMode/refineReason`。`direct-edit` 必须将源图传入图像模型；`analyze-redraw` 明确先视觉分析再重绘。`sourceImageObjectKey` 仍是受支持的权威源图输入。
- **适配器**：Gemini 3 图像模型使用 Interactions API，2.5 图像模型保留 `generateContent`；OpenAI Pro 模型使用 Responses API；OpenRouter 图像仍只使用 `GET/POST /api/v1/images*`，无 `input_references` 时禁止直编。
- **漂移检查**：新增只读定时/手动 workflow，用与运行时一致的“必须显式声明 PNG/SVG”规则报告 OpenRouter 目录与推荐项漂移；任一推荐项不可运行时输出 warning，永不自动把新模型提升为推荐。
各端待办：
- [x] paperbanana-api / Laf 回滚（注册表 v2、适配器、模型级精修执行）
- [x] packages-api / Web 共享传输（保留 refine capability 与任务字段）
- [x] iOS（以 live 注册表展示推荐、生命周期、验证状态、权益与精修方式，不再按名称猜测）
- [x] 微信小程序（展示推荐、生命周期、权益、禁用原因与精修方式，不按名称猜测）
- [ ] Android / Windows / macOS / HarmonyOS（后续消费新注册表字段）
- [x] CI / 运维代码（只报告漂移，不自动改推荐；未触发生产部署）
- [x] 生产部署 / 实测（百炼注册表默认值与 15 条目录已验收；`qwen3.7-plus` + `wan2.7-image-pro` 真实生成和直接精修成功）

### [2026-08-19] 模型目录下线项与注销迟到写保护 — by Codex
变更：按 OpenRouter 实时官方目录从全部客户端静态回退表移除已下线的 `openrouter/openai/gpt-5.3-chat`；账号注销增加 OSS 写入后的持久 tombstone 复核，并把所属 job id 保留在删除墓碑中供 Core 后台持续清扫迟到结果对象。公开 action、字段和成功 envelope 不变。
各端待办：
- [x] Web / 微信小程序 / Android / iOS / Windows / macOS（移除下线模型；HarmonyOS 原目录不含该值）
- [x] paperbanana-api / Laf 回滚（结果与阶段图写后复核、迟到 job prefix 后台清扫、轮转 tombstone 扫描）
- [x] 隐私披露（说明预签名链接失效前开始、失效后完成的上传由持久墓碑与后台重扫继续清理）

### [2026-08-19] 权威模型目录、中文参考库与任务来源端 — by Codex
变更：新增服务端权威 `modelRegistry`，OpenRouter 图片生成按官方当前 Dedicated Image API 分流；参考库增加 295 条版本化中文元数据；任务创建/精修与任务记录增加规范化 `clientPlatform`；Web 账号删除同步删除任务关联对象。
契约（影响其他端 / 共享）：
- **模型目录**：新增公开只读 action `modelRegistry`，返回静态厂商目录、默认模型、角色/图像能力与协议；OpenRouter 动态目录不可用时只标记该厂商不可用，静态厂商仍可返回。OpenRouter 图片模型以官方 `GET /api/v1/images/models` 为权威并统一调用 `POST /api/v1/images`；未知模型、错角色或目录故障均 fail-closed。`modelCapability` 与注册表保持同一能力来源。
- **参考库中文字段**：`referenceLibrary`/检索结果新增 `titleZh`、`introZh`，单次上限提高到 295；英文 `title`/`summary` 继续作为原始检索字段。版本 `2026-08-19.v1` 的 295 条元数据由香港部署脚本按既有 reference id 幂等同步，缺项或数量不符时部署失败关闭。
- **任务来源端**：`createJob`/`refineImage` 新增可选 `clientPlatform`，只允许 `web|miniprogram|android|ios|windows|macos|harmony`；缺失保持历史兼容，公开任务 DTO 同时归一 `clientPlatform`/`client_platform`，展示为“未记录”，不得按 User-Agent 猜测或回填。`submitFeedback.platform` 使用同一七端枚举，包含 `harmony`。
- **输入/上传/删除语义**：方法正文最多 12000 字、图注最多 1000 字；参考图上传新增 `finalizeReferenceUpload` / `abortReferenceUpload` 生命周期 action，现有客户端均在 PUT 后确认、失败时中止，旧客户端在创建任务时仍由服务端校验并兼容确认。账号注销先持久化不可变 user-id owner tombstone，拒绝新建/精修/上传/反馈并排空跨进程运行任务；仍有效的预签名上传返回可重试 409，删除请求执行多轮静默清扫，Core 后台继续清除迟到 PUT。网关必须先调用无副作用 `accountDeletionCapability` 确认 `deletionContractVersion=2`，随后才允许业务清理与 Auth 硬删；旧 Laf 回滚不得先执行破坏性删除。
各端待办：
- [x] paperbanana-api / Laf 回滚（注册表、OpenRouter 协议、中文字段、平台校验/持久化/公开 DTO、删除与输入限制）
- [x] auth-gateway / packages-api（公开只读 action 转发、共享请求/响应归一）
- [x] Web（动态模型目录、295 条中文宽屏图库/大图预览、任务来源、性能/错误恢复/账号删除/隐私一致性）
- [x] 微信小程序 / Android / iOS / Windows / macOS / HarmonyOS（创建参数与任务列表/详情来源展示；不支持精修入口的端无需发送 refine）
- [x] 部署/运维（已发布香港 Core/Gateway/Web，295 条 Mongo 元数据同步为 `2026-08-19.v1`；生产模型目录、中文图库、大图预览、健康/就绪与 SG 出口已只读验收）

### [2026-08-18] 新加坡模型出口交付契约 — by Codex
变更：香港 Core 新增显式 `disabled|sg-required` 出口模式、固定 `http://10.77.0.2:3128` 代理配置、可复现 `pbhk0` peer、独立手动 GitHub Environment 工作流与 fail-closed 回滚顺序；公开 API/action/envelope 不变。
契约（影响其他端 / 共享）：
- **Core env**：`PAPERBANANA_PROVIDER_EGRESS_MODE=disabled` 为安全上新/回滚值；OpenAI/Gemini/OpenRouter 在此模式下失败关闭，绝不恢复香港直连。`sg-required` 只允许在 SG/HK tunnel smoke 成功后启用。`PAPERBANANA_SG_PROXY_URL` 固定为 `http://10.77.0.2:3128`。
- **健康/就绪**：`providerEgress=degraded` 是可观察状态，但不改变 MongoDB/OSS 权威 `/ready`；隧道/代理路径由香港专用 monitor 独立告警。
- **运维顺序**：新 Core 先以 disabled 运行 → 安装 SG 与 HK `pbhk0` → monitor/smoke → 显式切 `sg-required` 且只重建 `paperbanana-api`。失败回滚到 disabled；不走香港直连。工作流不含卸载或 provider key。
各端待办：
- [x] paperbanana-api / 后端（Core 路由与健康契约、测试、README）
- [x] 部署/运维（HK env 原子切换、pbhk0、手动工作流、smoke/monitor、回滚文档）
- [x] Web/iOS/微信小程序/Android/Windows/macOS（公开 API 不变，客户端无需改动）

### [2026-08-15] 生产后端切换到阿里云香港单机栈 — by Codex
变更：`api.paperbanana.asia` 已切到现有香港轻量应用服务器；Nginx 后仅运行 Auth Gateway、Node 24 核心、单成员副本集 MongoDB 与 gVisor Plot Worker。旧 Laf 已暂停，旧 Auth Gateway 镜像已替换成无凭据 Caddy 兼容代理，源 Mongo 仅作回滚保留且关闭外网。
契约（影响其他端 / 共享）：
- **公开入口**：Web 与 iOS 的默认 API/Auth base 为 `https://api.paperbanana.asia`；公开 `/paperbanana-api`、`/api/auth/*`、`POST /api/account/delete` 和业务 envelope 不变。旧 Sealos 域名仅以固定 Caddy 镜像无状态转发到新网关，保留至 2026-09-14，不再连接旧 Mongo/Laf。
- **发布范围**：本次只切 Web 与 iOS。HarmonyOS、微信小程序、Android、Windows、macOS 仍含旧默认地址，必须在各自完成 Cookie/上传/CORS/备案验收后再切，不得把旧地址当成仍在线的生产后端。
- **数据与对象**：Better Auth 与业务 Mongo 全量迁移；生产 OSS 保持原 object key、content type 与字节内容。新环境开始写入后禁止仅靠 DNS 回滚到旧数据库。
- **运维**：每日 Mongo 逻辑备份到独立加密 OSS，并有恢复演练；云监控覆盖 CPU/内存/磁盘，主机健康定时器覆盖 API、Mongo、卡住任务、备份、TLS、Nginx 5xx 与 OpenVac。
各端待办：
- [x] Web（生产构建已使用新域名并发布）
- [x] iOS（默认地址、冒烟脚本与上架说明已更新；新构建需由 App Store 发布流程上传）
- [x] 后端/部署（香港单机栈、数据/OSS、DNS/TLS、备份/告警、旧环境停写）
- [x] 微信小程序（默认 API/Auth 已迁移香港域名；Auth 微信 Origin 生产验证通过）
- [ ] HarmonyOS / Android / Windows / macOS（后续逐端迁移）

### [2026-08-15] Auth Gateway 复审加固：Auth 限流、不可变管理员 ID、事务注销与权威就绪 — by Codex
变更：修复迁移复审发现的认证请求体绕过、邮箱管理员竞态、非事务注销、健康字段兼容与 readiness 污染问题；公开业务 action/请求/响应字段不变。
契约（影响其他端 / 共享）：
- **全路由 1 MiB**：`/api/auth/*` 现在与 `/paperbanana-api` 一样按实际流字节计数，包含 chunked 请求且不信任 Content-Length；超限统一返回 HTTP 413 `{code:413,error:'Request body too large'}`，限内 body 原样交给 Better Auth。
- **管理员只认不可变 ID**：新增必需 env `ADMIN_USER_IDS`（逗号分隔 Better Auth `user.id`）；废弃 `ADMIN_EMAILS`。邮箱、body `adminToken`、`X-Admin-Token` 一律不能授权；服务端 `ADMIN_TOKEN` 仅在已通过 ID 会话鉴权的 Laf 回滚管理员请求中内部注入。即使攻击者注册/改成相同邮箱也没有管理员权限。
- **账号注销原子性**：改用当前 session 的 `auth.api.verifyPassword`，不再通过 sign-in 产生新 session。业务数据先清理且仍须 HTTP 2xx + `{code:0,ok:true}`；随后在 Mongo transaction 内一次提交 session/account/user 删除，任一步失败全部回滚。提交后才尽力清 Cookie，清理 Cookie 失败不改变注销成功。Auth Mongo 必须运行单成员副本集以支持事务。
- **健康兼容/就绪权威**：`/health` 与兼容 health 响应恢复顶层 `auth:'better-auth'`，细节放入 `authReady`/`dependencies`，只增加 `backend` 状态并保留一版 `laf` 别名。Node readiness 固定调用核心 `GET /ready` 且要求 HTTP 2xx + `ready:true`；Laf 回滚才调用 health action。业务成功或 `{code:429}` 等业务 envelope 不再治愈/污染 readiness 缓存。
- **错误卫生**：未预期的 Mongo/内部异常仅返回稳定 `{code:500,error:'Internal server error'}`，详细错误只写入脱敏日志；明确的后端 502/504 类型仍保持公开。
各端待办：
- [x] auth-gateway / paperbanana-api 传输（实现、测试、文档）
- [x] 部署/运维（配置 `ADMIN_USER_IDS`，删除 `ADMIN_EMAILS`；Auth Mongo 以 replica set 启动并完成 transaction smoke）
- [x] Web/iOS（公开 API action/envelope 不变，无代码改动）

### [2026-08-14] Auth Gateway 切换香港 Node 核心、访客归属与精修授权 — by Codex (auth-gateway + shared transport)
变更：网关重构为 Node 24 可测试常驻服务，优先固定转发香港内部 Node 核心；新增匿名访客的稳定任务归属、精修源任务授权、动态维护模式和依赖就绪检查。公开 `/paperbanana-api` action/字段/业务 envelope 不变。
契约（影响其他端 / 共享）：
- **固定后端选择**：新增首选 env `PAPERBANANA_API_URL`；仅当它缺失时才使用 `LAF_API_URL` 回滚。两者同时存在时只选 Node，运行时故障绝不自动落回 Laf。`PAPERBANANA_GATEWAY_TOKEN` 必填；Node 通过内部 header 收 token，Laf 回滚才使用覆盖后的 body token。
- **HTTP 语义**：网关逐字转发后端 HTTP 状态和 JSON envelope；既有业务错误仍保持其上游语义，特别是任务准入满载的 HTTP 200 `{code:429,...}` 不改成公开 HTTP 429。网关 JSON 上限固定 1 MiB，超限返回稳定 413 envelope。
- **可信来源 IP**：网关只信一跳 Nginx，并从 `req.ip` 生成内部 `x-paperbanana-client-ip`，不转发客户端原始 X-Forwarded-For/X-Real-IP。Node 核心只把这个已认证值和安全 User-Agent 暴露给共享处理器；Laf 处理器优先读取新 header，同时保留旧 Laf forwarding fallback。
- **匿名任务归属**：`createJob`/`refineImage`/`prepareReferenceUpload` 未登录时由网关设置 30 天 `__Host-paperbanana_guest`（Secure、HttpOnly、Path=/、SameSite=Lax、无 Domain），Mongo 仅保存不可逆 `guest:<SHA-256>` owner。新增必需 env `PAPERBANANA_GUEST_COOKIE_SECRET`（至少 32 bytes），可选 `PAPERBANANA_GUEST_COOKIE_SECRET_PREVIOUS` 用于无 owner 变化的轮换。`getJob` 允许匹配 account id、历史 email、有效 guest owner 或登录管理员；owner 缺失/不匹配一律 403。guest 不获得 myJobs、删除账号或任何 admin/list 权限。
- **精修授权/SSRF**：`refineImage.sourceImageObjectKey`（或属于配置香港 OSS Bucket 的 V4 签名 URL）先从首段解析源 job id，再用 `getJob` 校验归属；有 object key 时丢弃 URL 并走内部 OSS 读取。Node 生产拒绝任意外部 URL。`PAPERBANANA_ALLOW_LEGACY_EXTERNAL_REFINE_URL=true` 只允许在明确 Laf 回滚模式临时兼容。
- **维护/健康**：`PAPERBANANA_MAINTENANCE_MODE` 或 `PAPERBANANA_MAINTENANCE_FILE` 动态阻断 create/refine/upload/submitFeedback/account delete 及 importReferences/evaluateJob/initDatabase，返回 503+Retry-After；auth、health、ready、getJob、myJobs 与只读/admin read 保持可用。`/health` 顶层仍为 `runtime:'gateway'` 且只读缓存；`/ready` 实探 Auth Mongo+所选后端；`laf` 作为 `backend` 的一版兼容别名。
- **账号删除**：只有业务清理同时满足 HTTP 2xx 与 `{code:0,ok:true}` 才清 Cookie/硬删 Auth；业务 code、`ok:false`/缺失、HTTP 错误或超时均原样返还且 Auth 不变。
各端待办：
- [x] auth-gateway（Node 24、固定后端、guest/owner/refine/maintenance/health/delete、测试与非 root 镜像）
- [x] paperbanana-api / laf-functions（可信 client-IP 传输与 Laf 兼容 fallback）
- [x] 部署/运维（补齐新 env；Compose 仅发布 `127.0.0.1:13005:3005`；Nginx 必须覆盖 forwarding headers；切流前维护/排空）
- [x] web/iOS（公开 action/envelope 不变；既有 credentials/cookie transport 与 objectKey 字段兼容，无代码改动）
- [ ] 其他客户端（本次发布范围外；后续仍须确认 cookie 持久化及 API base）

### [2026-08-14] Node API 有界任务准入、OSS 直传校验与无阻塞健康检查 — by Codex (paperbanana-api + laf compatibility)
变更：Node 单副本运行时新增进程级任务准入/排队、可追踪优雅退出、OSS 内外双端点与上传后权威校验；旧 Laf 只增加向后兼容的共享调度/校验能力，公开 action、字段和响应 envelope 不变。
契约（影响其他端 / 共享）：
- **任务准入**：`createJob`/`refineImage` 在任何异步预检和 Mongo insert 前预留容量；默认全服务 active=1、pending=2、每 owner=1、每 client IP=1。满载时仍走既有 HTTP 200 业务响应，返回稳定 `{code:429,error:...}`，且不插入孤儿任务。新增可选 env：`PAPERBANANA_MAX_ACTIVE_JOBS`、`PAPERBANANA_MAX_PENDING_JOBS`、`PAPERBANANA_MAX_JOBS_PER_OWNER`、`PAPERBANANA_MAX_JOBS_PER_IP`。
- **退出契约**：首次 SIGTERM/SIGINT 先停止准入和 HTTP 接入，再保持 Mongo 打开直至 reserved/queued/running 全部 drain；第二次信号才强制退出。仍必须 `PAPERBANANA_SINGLE_REPLICA=true` 且 Recreate/先停后启，禁止新旧实例重叠。
- **OSS 双端点**：Node 新增必需 env `OSS_INTERNAL_ENDPOINT=https://<region>-internal.aliyuncs.com`（服务端 put/list/stat/get/delete/probe）与 `OSS_PUBLIC_ENDPOINT=https://<region>.aliyuncs.com`（预签名）；二者必须分离，V4 virtual-hosted，禁止 path-style，桶启动时仍校验 private ACL。
- **直传签名与消费校验**：`prepareReferenceUpload` 的公开响应形状不变，但 PUT V4 签名现在同时绑定声明的精确 `Content-Type` 和 `Content-Length`。Web 继续上传已知大小 `File`/`Blob`、iOS 继续上传已知大小 `Data`：客户端设置精确 Content-Type，由 HTTP transport 自动产生匹配长度，**不得由客户端代码手写禁用的 Content-Length**。切流前必须各做一次真实 Chrome/iOS→OSS smoke；若 transport 不满足签名，后续由网关增加流式上传 fallback，不得静默削弱签名。服务端消费前会 stat 实际 size/type，错配/超 5 MiB 即拒绝并尽力删除。
- **下载上限**：参考图/精修图流式读取硬上限 5 MiB；provider 出图上限由 `PAPERBANANA_MAX_PROVIDER_IMAGE_BYTES` 控制（默认 20 MiB），即使响应缺失或伪造 Content-Length 也按实际字节截断拒绝。
- **健康检查**：`/health` 只读进程内缓存、绝不发 Mongo/OSS 网络请求；`/ready` 使用 `PAPERBANANA_READINESS_PROBE_TIMEOUT_MS`（默认 2000ms）的单飞有期限探测并更新缓存，依赖卡死时仍会有限时间返回 503。
各端待办：
- [x] paperbanana-api / laf-functions（准入、生命周期、OSS 双端点/校验/上限、健康检查与测试）
- [ ] 部署/运维（OSS 两端点、Recreate、`stop_grace_period` 与真实 Web/通用签名 PUT 已完成；新 iOS 构建发布前仍需在真机/模拟器做一次 OSS PUT smoke）
- [x] auth-gateway / clients（本次未改公开 route/action/envelope；现有已知大小直传逻辑无代码变更）

### [2026-08-14] Node API 收紧 BYOK、对象存储与请求体契约 — by Codex (paperbanana-api + laf compatibility)
变更：Node 运行时新增三项安全约束；旧 Laf 处理器仅增加向后兼容开关与无密钥后台 DTO，默认 Laf 行为仍可用于回滚。
契约（影响其他端 / 共享）：
- **BYOK 生命周期**：`createJob`/`refineImage` 选出当前 provider key 后，后台执行 DTO 会删除完整 `apiKeys` map，只把选中的单个 key 作为独立内存参数传递；不新增 Redis、队列或密钥持久化。
- **Node 严格对象存储**：新增必需 env `PAPERBANANA_STRICT_OBJECT_STORAGE=true`。Node 中结果图/阶段图写 OSS 失败会让任务失败，禁止写入 Mongo `database-data-url`/`data:` URL。Laf 未设置或设为 false 时保留历史回退，便于回滚。
- **请求体上限**：Node `POST /paperbanana-api` JSON 上限为 1 MiB，超限返回 HTTP `413 {code:413,error:'Request body too large'}`；参考图继续走既有预签名直传，不应放进 JSON/base64。
各端待办：
- [x] paperbanana-api / laf-functions（无密钥后台 DTO、严格存储开关、1 MiB 限制、组合测试）
- [x] 部署/运维（Node env 增加 `PAPERBANANA_STRICT_OBJECT_STORAGE=true`）
- [x] auth-gateway / clients（公开 action/envelope 与预签名上传流程不变，无代码改动）

### [2026-08-14] 新增阿里云香港 Node 24 内部业务 API — by Codex (paperbanana-api)
变更：新增 `apps/paperbanana-api`，构建时直接复用原 `apps/laf-functions/paperbanana-api.ts`，通过 Node 版 `@lafjs/cloud` 兼容层接入 MongoDB 与私有阿里云 OSS；旧 Laf 文件保持不变，可继续用于回滚。
契约（影响其他端 / 共享）：
- **内部路由**：Node 服务提供 `GET/POST/OPTIONS /paperbanana-api`、`GET /health`、`GET /ready`。业务 action、请求/响应 envelope 及 POST 业务错误 HTTP-200 语义不变，客户端公开路由形状不变。
- **网关 → Node 内部鉴权**：所有 `GET/POST /paperbanana-api` 必须带 header `x-paperbanana-gateway-token`，值与 Node env `PAPERBANANA_GATEWAY_TOKEN` 相同。Node 会丢弃 body 中任何客户端提供的 `gatewayToken`/`adminToken`，再把服务 token 注入旧处理器；旧 Laf 的 `health`/`modelCapability`/`referenceLibrary` 在 Node 服务内也没有直连豁免。
- **管理员动作**：若启用既有管理员 action，`ADMIN_TOKEN` 只配置在 Node 服务端；通过内部传输鉴权后，Node 仅为已知管理员 action 注入该 token，不信任调用 body 中的值。
- **Node 必需 env**：`PAPERBANANA_GATEWAY_TOKEN`、`PAPERBANANA_SINGLE_REPLICA=true`、`MONGODB_URI`、`PAPERBANANA_BUCKET`、`OSS_REGION`、`OSS_ACCESS_KEY_ID`、`OSS_ACCESS_KEY_SECRET`；`MONGODB_BUSINESS_DB` 默认 `paperbanana_business`。OSS 桶必须私有，禁止 path-style。
- **单副本恢复**：Node 在 readiness 前把遗留 `queued/running` 任务幂等标记为 `failed`，并写入 `errorCode='RUNTIME_RESTARTED_RETRY'`、`retryable=true`；既有终态任务不变。多副本在实现任务 lease 前不受支持。
- **健康检查**：`/health` 标识 `service='paperbanana-api'`、`runtime='node'` 并报告依赖 readiness；`/ready` 在 Mongo/OSS 任一不可用时返回 503。
各端待办：
- [x] paperbanana-api（Node 24 服务、Mongo/OSS 适配、恢复、鉴权、健康检查、测试与镜像）
- [x] auth-gateway（内部目标切到 Node，并用 header `x-paperbanana-gateway-token` 传服务 token；不得继续把 token 当客户端字段透传）
- [x] 部署/运维（配置上述必需 env；仅运行 1 副本且使用 Recreate/先停后启，禁止滚动更新时新旧实例重叠；把健康/就绪探针分别指向 `/health`、`/ready`）
- [x] web/miniprogram/android/ios/windows/macos（公开路由与业务 envelope 无变化，无需改客户端）

### [2026-06-20] 新增「删除账号」链路（App Store 5.1.1(v)）— by Claude (backend + ios)
变更：后端新增账号注销能力。`auth-gateway` 新增路由 `POST /api/account/delete`，`laf-functions` 新增 `deleteAccount` action（已登记进 `identityScopedActions`，受网关 token / IDOR 守卫）。iOS 已接入，其余端待办。
契约（影响其他端 / 共享）：
- **客户端 → 网关**：`POST /api/account/delete`，需带 session cookie，body `{ "email": <当前登录邮箱>, "password": <重新输入的密码> }`。
- **网关逻辑**：① 必须有有效 session 且 `session.user.email`（小写 trim 后）== `body.email`，否则 `403 {code:403,error:"EMAIL_MISMATCH"}`；未登录 `401`。② 用 Better Auth `signInEmail` 重新验证密码，密码错 → `401 {code:401,error:"INVALID_PASSWORD"}`。③ 调 Laf `deleteAccount` 清业务数据（先清，失败则不删账号、整体返错让客户端重试）。④ 清 cookie（Better Auth signOut）。⑤ 删 Better Auth `user`+`session`(+`account`)（Mongo 直删，真删，无法再登录）。成功返回 `200 {code:0,ok:true}`。
- **响应码（客户端照此处理）**：`200 {ok:true}` 成功；`400` email/password 缺失；`401 INVALID_PASSWORD` 密码错；`403 EMAIL_MISMATCH` 邮箱与当前 session 不符；`401` 未登录；`5xx` 服务端/Laf 故障（可重试，账号未删）。
- **Laf `deleteAccount`**：入参 `{action:'deleteAccount', userId, userEmail, gatewayToken}`。硬删 `paperbanana_jobs`（`userId`/`user_id`/`userEmail`/`user_email` 匹配）、`paperbanana_feedback`（同），尽力删对象存储 `references/<owner>/` 下该用户参考图（失败仅 `console.warn`，不阻断）；**结果图保留**。返回 `{code:0,ok:true,deletedJobCount,deletedFeedbackCount,deletedReferenceObjectCount}`。幂等。
- **环境变量**：复用既有 `PAPERBANANA_GATEWAY_TOKEN`（网关↔Laf 信任边界），无新增。
各端待办：
- [x] laf-functions（`deleteAccount` action + best-effort 删参考图 + policy test）
- [x] auth-gateway（`POST /api/account/delete`：session/邮箱校验 + signInEmail 验密 + 调 Laf + 删 user/session/account + 清 cookie）
- [x] iOS（设置页「删除账号」入口：二次确认重输密码 → 调本接口 → 成功后登出清本地态）
- [x] web（设置/账户页已增加删除入口并在退出/注销时清理本地 BYOK 与稿件状态）
- [ ] miniprogram（同步删除入口）
- [ ] android/macos/windows（同步删除入口）

### [2026-06-20] 上传参考图与检索设置改为前置互斥 — by Codex (ios)
变更：此前规则是“上传参考图后自动关闭检索”。产品侧改为更清晰的前置互斥：**只有检索设置为 `none` / “不使用检索”时，客户端才允许用户上传本地参考图**；若选择 `auto` / `random` / `manual` 检索，本地参考图上传入口应禁用并提示先切回“不使用检索”。
契约（影响其他端 / 共享）：
- 后端/`createJob` 的兜底语义仍应保留：`referenceImages` 非空时最终以上传图为唯一视觉来源，`retrievalSetting='none'`、`manualReferenceIds=[]`。
- 客户端 UI 应前置阻止冲突组合，而不是上传后替用户改检索；这能避免用户以为“检索库参考”和“自己上传参考图”会同时生效。
- 手动参考库仍只在 `retrievalSetting='manual'` 且没有上传参考图时展示。
各端待办：
- [x] ios（上传入口禁用/导入管线兜底/指南文案/契约测试）
- [x] web（检索非 none 时禁用本地参考图上传，显示切换提示且不自动更改检索选择）
- [ ] miniprogram/android/windows/macos（同步 UI：检索非 none 时禁用本地参考图上传，并提示先选择“不使用检索”）

### [2026-06-10] 更正：getJob"非法 JSON"系误报，后端无需修改 — by Claude (miniprogram)
变更：此前怀疑 `getJob` 响应含未转义控制字符——**已排除，系测试脚本误报**。复现验证：响应本身是合法 JSON（含 229 个正确的 `\n`/`\t` 转义序列）；测试脚本用 zsh 的 `echo "$RESP"` 中转响应，zsh echo 默认解释反斜杠转义，把合法的 `\n` 二字符序列变成裸换行字节，才导致严格解析失败。`printf '%s'` 对照实验解析通过，失败位置（char 936）与原报错完全一致。
契约（影响其他端 / 共享）：
- **laf-functions 无需任何修改**；各端无需为此排查。
- 经验：shell 脚本中转 JSON 一律用 `printf '%s'`，勿用 zsh/sh 的 `echo`。
- miniprogram 顺手加的防御解析 `coerceJsonResponse`（解析失败时清洗控制字符重试）保留——对网关/代理异常返回（HTML 错误页等）仍是合理兜底，非必须项。
各端待办：
- [x] laf-functions（无需修改）
- [x] miniprogram（防御解析保留，注释已更正为通用兜底说明）
- [x] web/android/windows/macos（无需行动）

### [2026-06-09] 上传参考图时自动关闭检索（二选一）— by Claude
变更：`createJob` 当请求带了有效 `referenceImages` 时，后端**强制** `retrievalSetting='none'`、`manualReferenceIds=[]`（以上传图为唯一视觉风格锚点，避免检索到的多张图与上传图风格相互打架）。检索一律不跑、不附检索图，任务记录里 `retrievalSetting` 即存为 `none`、徽标显示"不检索"。
契约（影响其他端 / 共享）：
- `createJob` 语义变化：**`referenceImages` 非空 ⇒ `retrievalSetting`/`manualReferenceIds` 被服务端忽略并归零**。后端权威，任何客户端无需改造即自动一致；但各端 UI 最好同步反映（上传参考图后把"检索设置"锁为不检索并提示），以免用户以为检索仍在生效。
- 不是字段增减，是既有字段组合的语义约定；后端单点 `paperbanana-api.ts` 归一化处生效。
各端待办：
- [x] laf-functions（归一化处：有上传图则 retrievalSetting→none、manualReferenceIds→[]）
- [x] web（检索设置 Select 在有参考图时锁为"不使用检索"+disabled+提示；payload 同步发 none；隐藏手动参考面板）
- [x] miniprogram（已同步：上传参考图后"检索设置"锁为"不使用检索"+提示文案；payload 双保险发 none/[]）
- [ ] android/windows/macos（UI 可选同步：上传参考图后提示"检索已自动关闭"；不改也不会出错，后端已强制）

### [2026-06-09] 输出清晰度 + 精修内联化 + 精修模型 bug 修复 — by Claude
变更：① 生成新增"输出清晰度"`imageSize`('2K'/'4K');② 精修分析步骤的模型选择修 bug;③ web 移除独立"精修图片"页签,改结果图"精修"按钮弹内联模态(纯前端)。
契约（影响其他端 / 共享）：
- `createJob` 新增可选字段 **`imageSize`('2K'|'4K',默认 2K)** —— 出图分辨率。`packages/api` 的 `createJobRequest` 已白名单;后端 `callImageModel(...,imageSize)` 按 provider 映射安全尺寸(bailian `bailianImageSize(aspectRatio,imageSize)`、gemini `geminiImageSize`:4K→2K 因 imageConfig 仅收 1K/2K)。各端可在生成参数里加该选项。
- `refineImage` 动作:**修复**——之前 `refineImageRequest` 漏传 `mainModelName`/`referenceVisionModelName`,后端退化用出图模型(如 wan2.7-image-pro)做"读源图"分析 → DashScope 报 `messages.0.role` 错。现在两字段都转发;后端 `runRefineJob` 非图生图分支的源图分析用 `referenceVisionModelName || mainModelName`(绝不用 imageModelName)。各端精修请求需带这两个模型名。
- 精修 UI 改为内联模态(web 单端),非契约;其他端可自行决定精修入口,但请求字段同上。
各端待办：
- [x] laf-functions（imageSize 接 callImageModel;refine 分析改视觉/主模型）
- [x] packages/api（createJobRequest 加 imageSize;refineImageRequest 转发 mainModelName/referenceVisionModelName）
- [x] web（输出清晰度 Select;精修内联模态;移除页签）
- [x] miniprogram（生成已加"输出清晰度"1K/2K/4K，按 provider/图像模型过滤并自动收敛；与 web 一致无手动精修 UI（精修由清晰度自动驱动），故无精修请求需补字段）
- [ ] android/windows/macos（生成加 imageSize 可选;精修请求补 mainModelName/referenceVisionModelName）

### [2026-06-08] 阿里百炼模型列表更正 + 参考图模式按固定能力 — by Claude
变更：之前 bailian 模型常量含**不存在/未激活**的名字;改为官方模型广场的真实模型,并把"参考图识别能力"按**模型**固定。
契约（影响其他端 / 共享 model 列表）：
- **bailian 真实模型**(各端 provider/model 常量需同步):文本主模型 `qwen3.7-max`(默认)/`qwen3.7-plus`/`qwen3.6-flash`/`deepseek-v4-pro`/`deepseek-v4-flash`/`kimi-k2.6`/`glm-5.1`/`MiniMax/MiniMax-M2.7`;出图 `wan2.7-image-pro`(默认)/`qwen-image-2.0-pro`;**图像理解(=参考图识别模型)** `qwen3.7-plus`(默认)/`qwen3.5-omni-plus`/`kimi-k2.6`。剔除 `mimo-v2.5-pro`(账号未激活)。MiniMax 需带前缀 `MiniMax/`。
- **能力固定**:Laf `modelCapability`/`referenceModelCapability` 对 bailian 按正则判定——含 `qwen3.7-plus|qwen3.5-omni|omni|kimi-k2.6|qwen-?vl|qvq` 才 supported(可直读图);其余文本模型 unsupported,会**静默改走独立识别模型**(不再报错)。前端有同名同义 helper `mainModelCanReadImages`(constants.js)。
- **参考图处理方式去掉"自动选择"**:前端按 `mainModelCanReadImages(provider, mainModel)` 固定缺省(能读→主模型直读,否则→独立识别模型);仍可手动切两种。`createJob.referenceImageMode` 不再发 `'auto'`(后端仍兼容 auto=按能力判定)。
- bailian 带图调用仍:data:URL→桶公网 URL、所选识别模型读不了图时兜底 VL(见上一条 bailian 视觉修复)。
各端待办：
- [x] laf-functions（能力正则、静默兜底、stage 标题中文）
- [x] web（真实模型常量、删自动选择、修图过大 CSS）
- [x] miniprogram（已同步 bailian 真实模型常量 + mainModelCanReadImages 固定能力;参考图模式按能力派生缺省，已去掉 auto 入口，展示层保留旧记录 auto 兼容）
- [ ] android/windows/macos（同步 bailian provider/model 常量到真实模型 + 识别模型能力;去掉 auto 入口）

### [2026-06-08] 修复越权(IDOR)：Laf 校验网关共享 token — by Claude
变更：公开的 Laf 端点(`https://sdswgya641.sealoshzh.site/paperbanana-api`)此前完全信任调用方传入的 `userId`/`userEmail`,任何人直连即可用受害者 `userId` 读其任务历史(`method_content`/`caption`/结果图 URL),绕过网关会话鉴权。现在 Laf 对「依赖调用方身份」的非管理员动作校验网关注入的共享 token。
契约（影响其他端 / 共享）：
- **网关信任边界**：Laf 对 `createJob` / `refineImage` / `submitFeedback` / `userJobs` / `getJob` / `prepareReferenceUpload` 这些读写用户数据的动作,要求请求携带 `gatewayToken`(由 auth-gateway 的 `withGatewayToken` 注入到 **body**,值=env `PAPERBANANA_GATEWAY_TOKEN`),或携带有效 `adminToken`(=`ADMIN_TOKEN`);否则返回 `401`。
- **复用既有 env**:网关侧无需改代码(`withGatewayToken` 已就绪)。新增的是 **Laf env `PAPERBANANA_GATEWAY_TOKEN`**,必须与 auth-gateway 的同名 env 取**同一值**。
- **豁免**:`health` / `modelCapability` / `referenceLibrary` 为无害只读,不强制 token。
- **admin 动作不变**:`adminJobs` / `adminFeedback` / `importReferences` / `evaluateJob` / `pingPlotWorker` 仍用 `ADMIN_TOKEN` 直连 Laf,不受影响。
- **向后兼容/灰度**:Laf 未设 `PAPERBANANA_GATEWAY_TOKEN` 时**不强制**(fail-open,仅打 warn 日志),避免部署时序造成中断;两端都配置后才真正生效。
- **各端要求**:所有客户端必须把后端地址指向**网关域名**(`https://yifbnnzrwmxn.sealoshzh.site`,各端默认值已如此),**禁止把 base 改成 Laf 域名 `sdswgya641` 直连**——直连模式下身份动作会被拒。任何端若有绕过网关直连 Laf 的身份动作路径,需改走网关或在受信服务端注入该 token(切勿把 token 下发到客户端)。
部署：①生成强随机串 S;②auth-gateway(Sealos App Launchpad)env `PAPERBANANA_GATEWAY_TOKEN=S` 并重启;③Laf(Sealaf 控制台 paperbanana-api 函数)env `PAPERBANANA_GATEWAY_TOKEN=S` 并应用级重启;④push 改动 → CI `laf func push` 自动部署;⑤验证:网关→Laf 正常、直连伪造 userId 的 `userJobs` 返回 401。
各端待办：
- [x] laf-functions（校验 `gatewayToken`/`adminToken`,fail-open 兜底）
- [x] auth-gateway（无需改：`withGatewayToken` 已注入;仅需在 Sealos 配置 `PAPERBANANA_GATEWAY_TOKEN` env）
- [x] web（默认 `VITE_API_BASE` 指向网关,经网关转发,无需改）
- [x] miniprogram（已确认：`miniprogram/utils/config.ts` 的 `API_BASE` 指向网关域名 `https://yifbnnzrwmxn.sealoshzh.site`，未直连 Laf）
- [ ] android（确认 `API_BASE_DEFAULT` 指向网关域名,勿直连 Laf）
- [ ] windows（确认 `DefaultApiBase` 指向网关域名,勿直连 Laf）
- [ ] macos（默认 `sealosAPIBase` 指向网关;若用户把"网关地址"改成 Laf 域名,身份动作将被拒——属预期）

### [2026-06-08] 向 dwzhu-pku/PaperBanana 深度对齐（prompt 质量 + plot + 参考数据 + eval）— by Claude
变更：在 Codex 的 10 项基础上做实质对齐——移植 root 完整 agent prompts + 104 行 NeurIPS 风格指南；critic 改 root 的 JSON 契约 + 空图守卫 + 失败回滚；refine 改真·图生图；检索候选 80→200、infographicCategory 真正注入 prompt；导入 PaperBananaBench 真实参考图；接入 plot 任务（经独立 plot-worker 渲染）；新增管理员评估。
契约（影响其他端 / 共享）：
- `createJob` 现接受 `taskName:'plot'`：走 matplotlib 代码生成 → 调外部 plot-worker 渲染 → 图像 critic 迭代。**diagram 路径不变**。`packages/api` 的 `createJobRequest` 已白名单 `taskName`，前端传 `'plot'` 即可。
- 新增 **admin 动作**：`importReferences`（从 hf-mirror 导入 PaperBananaBench → `paperbanana_references` + 对象存储）、`evaluateJob`（LLM-judge 4 维评分：有 GT 做 referenced，否则 reference-free）。两者 `ADMIN_TOKEN` 鉴权、**直连 Laf**（不经网关）。
- `paperbanana_references` 现含 **295 条真实 diagram 参考图**（`source=paperbanana-bench`）；reference URL 一律从 `imageObjectKey` 重签，不存死 URL。
- 新增 **env（Laf）**：`PLOT_WORKER_URL`、`PLOT_WORKER_TOKEN`（plot 任务调用渲染服务）。
- critic 输出改为 root 的 JSON 契约 `{critic_suggestions, revised_description}`（后端内部解析，兼容旧纯文本，不影响客户端）。
- 新增独立服务 `apps/plot-worker`（Python/FastAPI matplotlib 沙箱，已硬化）+ CI `build-plot-worker.yml`，部署在 Sealos「应用管理」。
各端待办：
- [x] laf-functions（prompt/robustness/plot 管线/importReferences/evaluateJob）
- [x] packages/api（`taskName` 已白名单，无需改）
- [x] web（plot 提交放开：data_stat 类别 → `taskName:'plot'`）
- [x] auth-gateway（无需改：plot 走 createJob 既有转发；admin 动作直连 Laf）
- [x] miniprogram（已接入：信息图类别选"数据统计图"时 `taskName:'plot'` + 提示"统计图由独立渲染服务生成"；参考库检索 taskName 同步切 plot）
- [ ] android/windows/macos（兼容 `taskName:'plot'`，后续补 plot UI）
- [x] plot-worker 已部署到 Sealos（Deployment+Service+NetworkPolicy，2Gi）+ Laf 已设 `PLOT_WORKER_URL`/`PLOT_WORKER_TOKEN`；`pingPlotWorker` 实测渲染通过

### [2026-06-08] PaperBanana 根项目 10 项功能对齐（diagram 主链路）— by Codex
变更：补齐 web 主链路的参考检索、手选参考、图像 Critic、Stylist 风格指南、pipeline stages、候选阶段记录、Refine Image、下载全部、管理员诊断摘要；`data_stat/plot` 明确标为二阶段能力，避免假入口。
契约：
- `createJob` 新增/启用 `taskName`、`retrievalSetting`(`none|auto|random|manual`)、`manualReferenceIds[]`；`manual` 必须带参考 id。
- 新增 action：`referenceLibrary`（列出 `paperbanana_references` + fallback 文本参考卡）、`refineImage`（源图 + 精修指令 → refine job）。
- `paperbanana_jobs/publicJob` 新增 `jobType`、`taskName`、`infographicCategory`、`retrievalSetting`、`manualReferenceIds`、`retrievedReferenceIds`、`retrievedReferences`、`stages`、`criticMode`、`imageSize`。
- `auth-gateway` 已放行 `referenceLibrary` / `refineImage`，精修会像 createJob 一样附登录用户身份；`ADMIN_TOKEN` 逻辑不变。
- 正式 PaperBananaBench 大图不进仓库；后续应把参考元数据导入 `paperbanana_references`，图片放对象存储。
各端待办：
- [x] laf-functions
- [x] auth-gateway
- [x] packages/api
- [x] web（manual 参考、timeline、zip、refine、plot 占位）
- [x] miniprogram（已兼容新增字段并补全 UI：检索设置 none/auto/random/manual、手动参考库选卡（≤10）、stages 生成演化时间线、检索参考展示、任务记录新徽标）
- [ ] android（兼容新增字段；后续补 UI）
- [ ] windows（兼容新增字段；后续补 UI）
- [ ] macos（兼容新增字段；后续补 UI）
- [ ] plot render worker（二阶段：Python/matplotlib 执行与图像 Critic）

### [2026-06-07] 管理员改为账号制(邮箱白名单) — by Codex
变更：admin 鉴权从手填 `ADMIN_TOKEN` 改为“登录邮箱 ∈ `ADMIN_EMAILS`”；新增 `adminStatus`；前端去掉 token 框、按 `adminStatus` 显示站长入口。
契约：网关新增 env `ADMIN_EMAILS` + `adminStatus` 动作；admin 动作不再接收用户 `adminToken`（网关内部注入）；`ADMIN_TOKEN` 仅网关内部保留。
各端待办：
- [x] auth-gateway
- [x] web
- [x] packages/api
- [x] miniprogram（无 admin 入口，无需改）
- [ ] 其它端无 admin UI 暂不涉及

### [2026-06-07] 用户意见反馈 submitFeedback — by Codex
变更：新增意见反馈（匿名可提，登录后由网关自动附身份）。
契约：新 action `submitFeedback` + `adminFeedback`；新集合 `paperbanana_feedback`；网关放行这两个 action；任务无关；不读取/存储 `apiKeys`。
各端待办：
- [x] laf-functions
- [x] auth-gateway
- [x] web（含 admin 反馈页）
- [x] miniprogram

### [2026-06-07] Web 近期大版本同步基线 — by Codex
**变更**：Web 端已完成一轮大版本更新，其他端同步时应以这些 API/数据契约为基线，而不是只同步单个页面 UI。
**契约**：
- `createJob` 支持 `outputFormat: 'png' | 'svg'`；`png` 走图像模型，`svg` 走 SVG 文本生成链路并由后端做安全清洗。
- 任务记录需要展示并消费完整图片资产字段：`result_images` / `resultImages`、`reference_images` / `referenceImages`，每个资产按 `mimeType` / 文件名判断 PNG 或 SVG。
- 结果图和参考图下载都要支持 bucket 签名 URL、`data:` URL、`image/png`、`image/svg+xml`；失败任务也应该展示可用的 `reference_images`。
- 任务记录字段应同步展示：`output_format`、`main_model_name`、`image_gen_model_name`、`reference_vision_model_name`、`reference_image_mode`、`reference_image_mode_used`、`method_content`、`caption`、`error`。
- 账号任务记录通过 auth-gateway：登录用户走 `myJobs`，管理员任务走 `adminJobs`，账号列表走 `adminUsers`；客户端不要再靠手填 email 查询用户任务。
- 当前核心 action 基线：`health`、`createJob`、`getJob`、`userJobs`、`adminJobs`、`adminUsers`、`prepareReferenceUpload`、`modelCapability`。
- 模型列表已在 Web 端按最新表固化，其他端需要同步 provider/model 常量；阿里百炼主模型直读参考图仍不启用，继续走独立识别模型。
- 参考图上传、主模型直读、SVG 参考图服务端栅格化的细节见下方对应条目。
**用户反馈 / 回归重点**：
- 用户反馈过生成失败后信息不够明确；各端任务记录必须展示 `error`，必要时兜底展示 `logs_tail`。
- 用户反馈任务记录里的图片/文件不好下载；各端要区分 PNG 与 SVG：PNG 才走保存到相册/图片保存，SVG 走复制链接或文件下载。
- 用户反馈失败任务也需要保留输入上下文；各端不要只在 `status=succeeded` 时展示参考图和任务详情。
- 用户反馈模型输入不应自由填写；各端要使用固定 provider/model 列表，并跟 Web 常量保持一致。
**各端待办**：
- [x] laf-functions
- [x] auth-gateway
- [x] web
- [x] miniprogram
- [ ] android
- [ ] windows
- [ ] macos

### [2026-06-07] 参考图上传 + 主模型直读 — by Codex
**变更**：新增参考图上传，以及「主模型直读 / 独立识别模型」两种参考图理解模式。
**契约**：
- `createJob` 新增 `referenceImages[]`、`referenceImageMode`(`auto|main_model|vision_model`)、`referenceVisionModelName`。
- 新增只读 action：`prepareReferenceUpload`（预签名直传对象存储）、`modelCapability`（查模型是否支持读图）。**`auth-gateway` 需放行转发这两个 action。**
- 任务记录新增 `referenceImages`、`referenceImageMode`、`referenceImageModeUsed`，并在 `publicJob` / `packages/api` 透出。
- 新增 env：`PAPERBANANA_MAX_REFERENCE_IMAGES`、`PAPERBANANA_MAX_REFERENCE_BYTES`、`PAPERBANANA_REFERENCE_UPLOAD_TTL_SECONDS`、`OPENROUTER_MODEL_CACHE_TTL_MS`。
- 注意：`packages/api/src/jobs.js` 的 `createJobRequest` 是**字段白名单**逐个拼包，新字段必须显式加进去才会发出去。
**各端待办**：
- [x] laf-functions
- [x] auth-gateway（已放行 prepareReferenceUpload / modelCapability）
- [x] web
- [x] miniprogram
- [ ] android
- [ ] windows
- [ ] macos

### [2026-06-07] SVG 参考图改服务端栅格化 — by Codex
**变更**：SVG 参考图不再要求客户端随附栅格化 PNG；后端会在需要喂给视觉模型/主模型直读时，把原始 SVG 服务端渲染为 PNG。
**契约**：
- `createJob.referenceImages[]` 中 SVG 参考图可以只传原始 `objectKey` / `mimeType=image/svg+xml`，不再强制 `analysisObjectKey`。
- Laf 后端遇到 SVG 且缺少 `analysisObjectKey` 时，会下载原始 SVG、sanitize、用 `@resvg/resvg-wasm` 栅格化为 PNG，并写回 bucket 为 `*-server-analysis.png`。
- 任务记录里的 `referenceImages[]` 会补上服务端生成的 `analysisObjectKey`、`analysisMimeType=image/png`、`analysisSize`；`publicJob` 同步返回 `analysisUrl`。
- 新增 env：`PAPERBANANA_SVG_REFERENCE_RASTER_WIDTH`，默认 `1024`，运行时限制在 `320-1536`。
- Laf 运行环境要求保留 Sealaf custom dependency：`@resvg/resvg-wasm`；wasm 路径按 `${CUSTOM_DEPENDENCY_BASE_PATH}/node_modules/@resvg/resvg-wasm/index_bg.wasm` 读取，不能使用 `require.resolve`。
- 各客户端只需要上传原始 SVG；不要再强制做本地 canvas/原生栅格化。Web 端已移除 `rasterizeSvgFile`。
- `auth-gateway` 无新增 action，无需改转发规则。
**用户反馈 / 回归重点**：
- 用户反馈非 Web 端无法使用 SVG 参考图；各端只上传原始 SVG 后，`main_model` 和 `vision_model` 两种参考图模式都必须能生成成功。
- 用户反馈大文件/大 payload 会导致小程序性能问题；各端不要把参考图或结果图 base64 写入页面状态或任务记录，只保留 URL/objectKey 元数据。
- 记录页应能看到原始 SVG 参考图；服务端生成的 PNG analysis 只用于模型理解和排查，不替代用户上传的原文件展示。
**各端待办**：
- [x] laf-functions
- [x] auth-gateway（无需改）
- [x] web
- [x] miniprogram
- [ ] android
- [ ] windows
- [ ] macos
