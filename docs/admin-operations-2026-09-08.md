# 站长运营后台升级与验收

本轮将账号、任务、反馈与社区评估题整合到一个站长工作区，补齐真实统计、服务端列表和详情，并为任务跟进、社区编辑和审核保留处理记录。实现位于 `codex/admin-operations-20260908`，起点为主线 `1508d699a6bb1731408295e63d730feacee417be`。实现已在 PR #181 合并，发布 SHA 为 `fc962212bfa497aab91c770a4edfa7050c027e93`；发布前合入最新主线精修上传及恢复身份修正。生产门禁与浏览器结果见 [发布记录](releases/2026-09-08-admin-operations.md)。

## 现状与实施范围

| 原有能力与问题 | 本轮实现 |
| --- | --- |
| 站长页一次读取最多 100 个账号、50 个任务，页面行数不能当总量 | 独立真实总览；账号、任务、社区、反馈统一服务端分页、筛选与稳定排序 |
| 认证账号、登录方式、会话与业务用户资料分散，最近登录混用了资料更新时间 | 以不可变用户 ID 汇总身份、邮箱验证、登录方式、有效会话、注销状态；登录时间仅取保留会话的创建时间 |
| 任务大卡片直接加载完整输入与图片，列表难检索 | 摘要表格与独立详情；搜索、日期、状态、模型、类型、跟进状态筛选；只在详情获取结果链接 |
| 任务没有安全取消、重试、删除的管理员契约 | 提供独立运营跟进与说明；不改变任务执行状态、不触发新的生成调用 |
| 社区审核分散在排行榜页面，只读取三类待处理记录，处理后不可追踪 | 原入口复用统一后台；全部实际状态可检索，保留原稿、编辑、归组候选及处理历史 |
| 没有可靠的提交到正式题集或发布结果关联 | 明示关联缺口；审核通过仅进入下期候选，不伪造“已发布”或关联评估分数 |

实施顺序：先完成服务端查询和权限校验，再接总览/用户/任务/社区工作区，最后统一交互并进行真实数据库与浏览器验收。既有反馈查询和高级评测运行入口保留，不增加封禁、删除或批量操作。

## 数据来源与统计口径

- 账号来自 Auth 数据库 `user`；登录方式只读取 `account.providerId` 等必要字段；会话通过聚合读取最新保留的 `createdAt` 和 `expiresAt > now` 的会话数。
- 账号状态来自 `accountDeletionOperations`。没有注销操作的存续账号为正常；`pending` 为注销处理中，`review_required` 为待复核。完成注销的用户通常已经从 `user` 集合删除，因此不在当前账号列表中虚构已删除资料。
- 任务、反馈来自业务库 `paperbanana_jobs`、`paperbanana_feedback`。联系方式仅使用真实存在的反馈 `contact`，注明用户自填、未经身份验证。
- 社区提交和归组候选来自评测库 `paperbanana_benchmark_prompt_submissions`、`paperbanana_benchmark_prompt_digests`。
- 用户总数为当前仍存在的账号总数；新增注册为所选日期内创建且仍存在的账号。不是包含已清理账号的历史累计数。
- 近期任务以创建时间进入统计范围，包含访客任务。成功率为成功数除以成功数加失败数；预留、排队、执行中不进入分母。没有已结束任务时显示无数据，不显示 0% 的假结论。
- 待审核数量为全部时间内当前 `pending / grouped / candidate` 的总和；其指标跳转使用同一状态集合，不继承近期任务的时间范围。
- 前端日期使用浏览器本地自然日，服务端接收 UTC ISO `[from,to)`；结束日期包含全天。跨数据源分别读取并展示读取时间，属于当前快照。

## 接口与兼容性

所有请求均经认证网关 `POST /paperbanana-api`，使用 `action` 分派。

| Action | 作用 |
| --- | --- |
| `adminOverview` | Gateway 汇总账号和 Core 统计；某个来源不可用时单独报告不可用 |
| `adminUserList` / `adminUserDetail` | Auth 账号列表、登录方式、会话和生命周期详情 |
| `adminOperationsOverview` | Core 的任务分布与社区待审核统计 |
| `adminTaskList` / `adminTaskDetail` | 任务摘要、输入、结果、失败原因和执行/处理记录 |
| `adminTaskFollowup` | 保存运营跟进状态和说明，执行状态保持不变 |
| `adminCommunityList` / `adminCommunityDetail` | 全状态社区列表、原稿、有效编辑、真实归组关联和审核历史 |
| `adminCommunityEdit` | 在允许审核的状态内保存编辑，保留原始提交 |
| `adminBenchmarkPromptDecision` | 沿用既有审核路由与终态规则，补充版本比较和历史 |
| `adminFeedbackList` / `adminContactMatches` | 反馈分页和按实际反馈联系方式查找用户 ID |

列表返回 `{code:0,rows,pagination:{page,pageSize,total,totalPages}}`。`pageSize` 只允许 10、20、50；`page` 为正整数且有上限。通用筛选为 `q/from/to/sort`；业务列表支持 `userId`。任务增加 `status/type/model/followup`，用户增加 `searchBy/verified/status`，社区增加 `status/category`。`newest/oldest` 以 `createdAt` 与 `_id` 做稳定排序；任务额外支持 `duration_desc`。搜索将正则字符转义，字段、排序、长度、日期和页码均校验。

旧 `adminUsers/adminJobs/adminFeedback/adminBenchmarkPromptQueue` 读取接口保留兼容；统一后台改用新查询。既有社区审核调用可不传版本，服务端仍读取当前版本并原子比较后写入；新页面始终传 `expectedRevision`。无新增环境变量，小程序原登录、任务与提交能力无需修改，也未在本轮发布。

## 权限、隐私与写入规则

- 网关只按服务端配置的不可变管理员用户 ID 判断站长身份。浏览器提交的 `adminToken/adminUserId` 不能获得权限。
- Core 同时要求内部网关凭证、独立管理员传输断言和管理员 ID；新 service 自身也拒绝非管理员调用。
- 新查询使用字段白名单，账号/任务摘要不返回密码、OAuth 凭证、原始 session token、IP、User-Agent 或 API 密钥。自由文本另行脱敏。结果详情仅返回实际需要的短期结果链接。
- 列表邮箱、联系方式默认脱敏。完整邮箱和反馈联系方式需在单个用户详情显式查看；不能用 `revealContact:true` 批量获取所有反馈联系人。
- `expectedRevision` 由更新时间与 `adminVersion` 构成。编辑/跟进/审核用 compare-and-swap 原子更新，并在同一文档追加处理人、时间、说明和变更记录。并发修改返回 409，页面保留草稿供刷新核对。
- 任务 `adminOperations.status` 只有未跟进、跟进中、已处理，独立于执行状态。账号处于注销或复核屏障时拒绝关联修改。
- 社区仅 `pending/grouped/candidate` 可编辑和审核；通过、合并、拒绝后不可在此再次编辑。原始题目与分类保持不变，编辑写入专用字段；不会改写正式题集、样本、成绩或榜单。
- 每条记录最多保留 200 条新运营历史，达到上限则拒绝继续追加，避免无声丢弃历史。历史审核只展示已保存的处理人、时间和说明，不编造上线前审计记录。

## 验收

| 检查 | 结果 |
| --- | --- |
| Auth Gateway 单元/接口回归 | 140 项通过 |
| Core 单元/接口回归 | 458 项通过 |
| Web 回归 | 361 项通过 |
| 共享 API 回归 | 29 项通过 |
| Core TypeScript / Core 构建 / Web 构建 | 通过；Web 仍有现有大 chunk 提示 |
| 新后台真实集成 | 66 项断言通过：Mongo 副本集 + 真实 Better Auth + Gateway + Core |
| 既有账号生命周期真实集成 | 通过：并发验证、注册唯一性、恢复、跨库注销、存储失败重试、旧身份隔离 |
| Chrome 浏览器验收 | 15 条流程通过，1440px 桌面与 390px 窄屏，零脚本错误、无页面横向溢出 |

本地浏览器使用隔离数据库中的测试账号和业务记录，所有后台查询、权限校验、编辑、审核与跟进操作经过实际服务代码。结果图使用本地测试图片，不触发真实模型调用。本地阶段未读取或修改生产用户、未审核真实社区提交、未发送真实邮件、未发起正式评测或发布。

覆盖：总览计数及指标跳转；时间范围；关键词与反馈联系方式搜索；模型/类型/审核状态/分类筛选；分页；详情返回页码和滚动位置；完整联系方式显式查看；用户到任务与社区提交关联；输入、图片和执行记录；跟进状态更新；社区编辑和审核确认；审核后离开待处理列表；并发冲突及刷新保留草稿；空列表；服务故障和重试；匿名及普通账号权限拒绝；退出登录后忽略迟到查询结果。

可复现检查（Node 24、pnpm 10.28.2、Docker）：

```sh
pnpm --filter @paperbanana/auth-gateway test
pnpm --filter @paperbanana/paperbanana-api test
pnpm --filter @paperbanana/paperbanana-api check
pnpm --filter @paperbanana/paperbanana-api build
pnpm --filter @paperbanana/web test
pnpm --filter @paperbanana/web build
node --test packages/api/src/*.test.js
apps/paperbanana-api/tests/integration/run-admin-operations.sh
apps/auth-gateway/tests/integration/run-account-lifecycle.sh
```

新的 Mongo 集成步骤已加入主 CI。浏览器脚本位于 `apps/web/tests/browser/admin-operations.mjs`，使用已安装的 Playwright 与 Chrome；通过 `PLAYWRIGHT_MODULE_PATH` 指定已有模块路径，`ADMIN_BROWSER_OUTPUT_DIR` 指定截图/JSON 输出目录。它自动创建并清理本地 Mongo 容器与数据库：

```sh
PLAYWRIGHT_MODULE_PATH=/path/to/playwright/index.mjs \
ADMIN_BROWSER_OUTPUT_DIR=/tmp/tuyan-admin-acceptance \
pnpm --filter @paperbanana/paperbanana-api exec node --import tsx ../web/tests/browser/admin-operations.mjs
```

## 限制与上线依赖

1. 目前没有提交到正式发布题集的可靠关联，也没有安全取消/重试/删除任务或封禁用户的现有契约。本轮不提供这些按钮，不以“已通过”替代“已发布”。高级评测运行沿用原有独立预算与发布流程，本轮未执行真实付费验收。
2. 新运营接口依赖 Node Core、Auth Gateway 及既有 Mongo 数据库。评测库缺少配置或不可用时明确显示不可用，不返回虚假的零计数。Laf 回退环境尚不支持这些新接口。
3. 启动时创建列表索引，需要 Auth/业务/评测库对应的 `createIndex` 权限；上线前应核对生产索引和数据量。新增记录使用原集合嵌入字段，不要求对正式评估集合扩大写权限。
4. 联系方式通过反馈反查，至少输入 3 个字符，最多匹配 2,000 个不同用户；超过时要求缩小范围，避免静默截断。自由文本搜索使用转义后的匹配而非专门全文索引，大库有 10 秒查询超时保护，未进行生产规模压测。
5. 已清理的用户资料、会话和业务记录不重建。详情保留最多最近 200 条执行日志、20 个归组批次并明确标注；不把这些窗口当作完整历史。
6. Web、Node Core 与 Gateway 已按顺序发布并通过生产管理员只读验收，现有权限可创建新增索引。小程序发布保持原有暂缓边界；后续版本继续分别核验 CI、镜像、服务健康和实际页面。
