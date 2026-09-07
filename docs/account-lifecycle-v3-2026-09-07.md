# 账号生命周期 v3 修复与发布说明

本分支基于 `8460584908e7dfd4ca6089f0e28b8d1611db9b4e`。生命周期基础修复为 `18e2a89`。用户现已明确选择保留原账号身份并授权上线；以下补齐恢复实现与发布门，生产结果以本次 release 记录为准。

## 历史记录必须先隔离

2026-09-07 只读核查：14 个认证账号、6 条注销记录；2 条 deleting 的原身份仍存在，4 条 deleted 的原身份已不存在。账号指纹 `24d87b8676e0` 的当前认证 ID 与 8 月 23 日注销 ID 相同，注册/凭证时间为 5 月 14 日；44 条任务和 4 条反馈残留，任务引用的 98 个对象键当前全部 HEAD 404。另一条中断记录指纹 `fe1ba00370e4`，无任务。这些是当时快照，处置前必须重查。

v3 不自动接管这些记录。Core 启动后不再按历史邮箱/任务前缀执行删除；历史标记仍阻断工作并通过账号状态接口显示 review_required。没有迁移脚本自动清除标记，也不会因用户再次输入密码而扩大历史清理范围。Auth 的新恢复队列只消费本版本持久化授权的操作，不从旧 tombstone 猜测授权。

历史处置必须独立确认：

1. 先部署清理边界修复，观察旧记录不再有对象清扫；不要直接回滚到会无限清扫的旧 Core。
2. 在只读清单中核对当前 ID、Auth 创建时间、任务/文件归属与已有清理范围，排除新 ID 与邮箱复用。
3. 资料恢复能力单独核查：当前桶 404 不能证明存在可用备份，也不能证明具体删除时间。本分支不承诺恢复缺失文件。
4. 对仍有原 Auth 的两条记录，由账号所有者决定保留原身份还是完成注销；前者需要新的生命周期/对象命名空间与清理终止证明，后者需要审定的 ID 范围和明确继续删除授权。不能直接执行 `unset deleting`，也不能把旧 jobIds/邮箱目录直接转入新任务。
5. 对已完成的四条旧记录保留最小 ID 阻断凭据；不因同邮箱出现新账号而继续扫描可复用邮箱目录。

## 新流程与边界

Gateway 在密码确认后把 `operationId/userId/phase/status/nextAttemptAt` 写入 Auth DB，再调用 Core。数据库唯一 `_id=userId` 和租约协调多个请求/进程，等待及失败每 30 秒或指定时间重试，服务重启从数据库恢复；密码不会写入队列。

Core 阶段：waiting → objects → business → awaiting_auth → completed。任务、反馈、权限以不可变 ID 为准；仅当主 ID 缺失时兼容 `user_id`，永不回退邮箱。未知历史数据、非规范路径、跨账号引用和清单外任务进入 review_required。

waiting 等待已发放签名 PUT 的全部状态（包含 finalized）的失效时间再加 24 小时收尾期，以及所有运行中任务结束。然后只在当前 ID 和已归属任务 ID 下列举文件，把精确对象键和任务清单持久化；删除阶段按游标幂等续跑。停止扫描可复用邮箱前缀，不对已完成账号继续无限列举。24 小时是保守的在途上传收尾窗口，并非本轮验证过的 OSS 服务端硬超时；发布前需核对实际存储入口是否允许超长在途 PUT，若超过窗口，应先增加入口限制或延长策略，不能宣称对此类请求已做真实验证。

Auth 的 user/account/session、一次性邮箱验证令牌、按 userId 保存的密码重置记录与 `phase=ack` 在同一 Mongo 事务内提交。确认响应丢失时，下一进程只继续确认，不依赖已经失效的登录 Cookie。新账号获得新 ID，旧操作无法继承新身份的任何范围。

原始 Benchmark 个人投稿纳入删除；写入前后检查 Core tombstone。已由管理员汇总的候选及公开评测发布属于独立研究工件，本分支不修改已发布榜单、审核证据或其他用户贡献。生产核查时个人投稿总数为 0。

会话/凭证创建增加前后身份检查，阻止旧重置请求在 Auth 删除后补写孤儿凭证。旧注册的邮箱验证 JWT 仅绑定邮箱，本版改为随机一次性令牌，其哈希、不可变用户 ID、发起时邮箱摘要和 1 小时有效期落库，验证事务仅更新该 ID。旧链接按无效处理，用户可重新申请。邮件发送仍使用既有服务，没有新增发信渠道。

## API 与兼容

- `GET /api/account/status`：仅当前登录身份，返回 `state/phase/startedAt/completedAt/error/deletionContractVersion`，不接受查询其他用户 ID。
- `POST /api/account/delete`：保留邮箱 + 当前密码确认。最终成功为原 `200 {code:0,ok:true}`；持久化受理为 `202 {code:202,accepted:true,phase,error,retryAfterSeconds}`；待核对为 `409 ACCOUNT_DELETION_REVIEW_REQUIRED`。
- 内部 `accountDeletionCapability` 返回 v3；`deleteAccount` 需要不可变 ID 与操作 ID，只有 business 完成才允许 Auth 阶段；`completeAccountDeletion` 在 Auth 事务成功后确认最终状态。内部操作不通过公共 action 路由开放。
- Web/小程序不把 202 当作删除完成，不清除本地任务/草稿；账号设置显示处理状态。注册中性响应不再显示“新账号已创建”或“邮件必定已发送”。
- 旧 Gateway 只接受 v2，遇到 v3 会安全拒绝注销；新 Gateway 对旧 Core 同样拒绝。不能让旧版与新版清理器同时处理新 v3 标记。

## 发布顺序与回退

1. 生产只读预检：记录镜像/SHA；核对历史记录、Auth 邮箱 trim/lowercase 唯一性；验证 Auth DB 事务支持和建索引权限；按更新的 `init-mongo.sh` 将 Benchmark API 的 `remove` 权限仅授予 `paperbanana_benchmark_prompt_submissions`（不授予 Worker 或公开评测集合），并检查生效；确认没有旧注销请求/清理器仍在途。
2. 安排短暂维护并停止旧 Core 清理器，部署 Core v3。确认所有 Core 实例均为 v3、旧实例已停止，再部署 Gateway v3；维护期间 Gateway 恢复队列也暂停。Web 可随后部署；小程序上传暂缓。
3. Gateway 启动会预检规范化邮箱并建立大小写不敏感唯一索引、验证令牌 TTL 索引、恢复队列索引。历史非规范邮箱/冲突会令启动失败，必须先审定迁移，不能自动修改账号数据。新集合由同一 Auth DB 管理，不新增生产密钥。
4. 使用专用验收账号测试注册、验证、登录、注销等待/完成与同邮箱重注册，不使用业务账号做删除验收。本地联调不等于该生产验收已完成。
5. 若发布失败，先保持维护并停新旧恢复任务；回退必须保留 v3 清理边界修复，不能直接恢复 v2 的无限前缀清扫。新旧验证链接切换需提示重发；不靠回滚覆盖新数据库状态。

## 验证

- Core：实际生产函数 + 隔离数据库/OSS/时钟的同邮箱、历史冻结、游标恢复、跨阶段失败、在途 PUT、工作等待与错误操作 ID 回归。
- Gateway：持久化续跑、租约/维护、旧契约拒绝、Auth 与完成凭据事务回滚、邮箱索引、会话/凭证竞态、一次性验证跨 ID 隔离。
- Web：账号状态和 202 行为的真实组件交互；小程序 TS/JS 构建及账号工具回归。
- 本地 Mongo 8 副本集 + 实际 Better Auth：并发注册只能产生一个身份和凭证；实际 Core/Gateway 存储失败续跑、Auth 事务、丢失确认后重启；旧 Cookie/重置令牌失效；同邮箱重新注册得到新 ID、旧验证链接拒绝、新验证链接成功。无外部发信、模型调用或生产连接。
- 可复现命令：`apps/auth-gateway/tests/integration/run-account-lifecycle.sh`。脚本只发布 loopback 端口，使用一次性测试库和容器，结束自动清理；已接入 CI。


## 本轮本地验证结果

- Gateway 132/132；Core 428/428；Web 335/335；小程序 21/21 测试文件。
- Laf 策略 6/6；共享 API 28/28；香港部署契约 220/220。
- Gateway 语法检查、Core TypeScript/服务端构建、Web 生产构建、小程序 TypeScript/JS 构建通过。
- Mongo 8 实际 Better Auth/Core/Gateway 生命周期集成通过；Mongo 8 受限 API/Worker 角色集成通过，私人投稿允许删除，评测/发布数据删除仍拒绝。
- Web 保留现有大 chunk 构建提示；未发起外部模型调用或真实邮件。
- 以上为本地结果；合并前与合并版本 CI 均通过，Core/Gateway/Web 已上线，授权的原身份已恢复，详见 [发布记录](releases/2026-09-07-account-lifecycle-v3.md)。缺失图片可恢复性、另一历史账号处置及 OSS 超长在途 PUT 边界仍是独立事项。


## 保留原身份的恢复操作

恢复只适用于经逐账号核查的旧版 `deleting` 且原 Auth 身份、凭证仍存在的账号。新增受控运维模块 `apps/auth-gateway/src/account-restoration.js` 与镜像内 CLI `scripts/restore-account.mjs`，没有公开 HTTP 入口。生产执行必须在共享 host lock 下开启维护、停止全部 Gateway/Core 实例；通过只读 `inspect <账号指纹>` 生成包含身份、凭证、会话、任务、反馈、上传及注销记录的 SHA-256 审核摘要，再以 `restore <指纹> <摘要>` 执行。摘要变化、活跃任务、未过期上传、仍可执行的 Auth 删除操作或不匹配身份均拒绝恢复。

跨 Auth/Business DB 的一个 Mongo 事务会把旧删除范围及操作原样存入 `paperbanana_account_deletion_history` / `accountDeletionOperationHistory`，标为关闭且 `cleanupAllowed=false`；当前 head 保留在 `paperbanana_account_deletions`，状态为 active，具有随机 `accountGeneration`、恢复时间及归档指针。只归档处于 review_required 的 Auth 操作并移出执行队列；绝不删除或重建 user/account/session、任务、反馈或存储对象。同一审核摘要可幂等重试，不生成第二个生命周期。

Core 在服务端绑定生命周期编号，忽略客户端伪造值。新任务入库及后台写回均校验该编号；旧任务体缺少编号时不能在恢复后写入。新参考图目录为 `references/<userId>/lifecycles/<generation>/...`，旧 PUT URL 无法写到新目录，旧 finalize/abort 不能作用于新周期。后续用户再次明确注销时，Gateway 把当前编号绑定到新的持久化操作，Core 才允许 active → deleting；旧操作无此编号会被拒绝。新注销按该身份的全部历史记录和固定 ID 目录清理，关闭的历史记录不参与自动清理。

`GET /api/account/status` 增加可选 `accountGeneration/restoredAt`，客户端仍用 active 状态开放操作；编号由服务端维护，客户端无需发送。私人投稿的前后检查也绑定同一周期。Webhook、其他客户端及模型目录无新要求。

本次生产处置范围只包括指纹 `24d87b8676e0`。另一条中断记录仍暂停并保留，等待该账号的独立处置决定。98 个当前缺失对象不在身份恢复操作中重建，历史任务记录保留不代表图片已经恢复。

运行 CLI 的一次性容器使用已核验的 Gateway 不可变镜像、仅挂载只读 Mongo root password 文件、只接 backend 网络、只读文件系统、移除所有 Linux capabilities；不启动 Web 服务、邮件或模型调用。凭证只在进程内使用，不输出或写入审核清单。维护停止约束由 host 操作核验，CLI 同时要求 `PAPERBANANA_RESTORATION_QUIESCED=true`。结束后用同一不可变镜像重启 Core/Gateway，验收通过才解除维护。
