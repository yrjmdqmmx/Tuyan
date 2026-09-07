# 账号生命周期 v3 与保留原身份恢复发布记录

2026-09-07，用户明确授权“保留原账号身份，走上线流程”。Core、Gateway、Web 已发布，账号原身份恢复已完成并验收；小程序上传继续暂缓。没有模型推理、真实邮件发送、生成任务或业务资料删除。

## 固定版本与发布证据

- 实现 PR [#168](https://github.com/yrjmdqmmx/Tuyan/pull/168)，合并及实际部署 SHA `590419b24e222b23d4f6adafc2474e0106153dc1`。
- 合并前 [分支 CI](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34097743387)、[PR CI](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34097837648) 均通过；[合并版本 CI](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34098132594) 的 Node 全栈、Mongo 8 迁移集成、镜像构建三个任务全部通过。
- [Core 镜像](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34098164889)：`ghcr.io/yrjmdqmmx/paperbanana-core-api@sha256:b7167668bc94fe7ad4512a63ab7b97b3ff2b840da047ff37ca738fb4e3555503`。
- [Gateway 镜像](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34098168589)：`ghcr.io/yrjmdqmmx/paperbanana-auth-gateway@sha256:9feee7f1744bfcdf2eec970bfb84349255e1ad62ea22ff99b4e94daeb2f3d058`。
- [配套 Worker 镜像](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34098329957)：`ghcr.io/yrjmdqmmx/paperbanana-benchmark-worker@sha256:781b51951e0fad600ab7f0ed1126346a5fc8e7d11348d85c0f0532a9db85d641`。与 Core 的共享代码及来源保持一致，生产始终 disabled、单并发。首次误用另一工作流确认值的运行被跳过，没有执行构建或部署。
- [香港生产部署](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34098510229) 成功。按既有 main 环境保护及共享主机锁执行，先停旧 Gateway，再停并排空旧 Core，之后启动新版本；三份实际容器的镜像引用和 revision 均与上述值逐项一致。
- [Web Pages](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34098748870) 成功；固定输入为上述 SHA，`bench_enabled=true`。生产首页加载 `assets/main-DPHUbL5i.js`。
- Plot Worker、Mongo 镜像与 SG 配置保持既有版本；未部署 Sealaf 旧实例或上传小程序。

## 生产前后证据

恢复前重新核查：14 个 Auth 身份，邮箱均为规范化值且没有重复；Mongo 副本集及事务可用；全站活跃生成任务为 0。新 Gateway 的大小写不敏感邮箱唯一索引已建立，恢复队列为空。Core 返回注销契约版本 3，对历史中断账号返回 `review_required / legacy_review`。

旧清扫最后时间停在 `2026-09-07T08:04:01Z` 附近。部署后两次完整摘要一致，至 `08:06:08Z` 未再推进，涵盖超过两个原 30 秒清扫周期；实际旧镜像容器已经停止。恢复后其他五条历史 head 的摘要仍完全一致。

原身份恢复于 **2026-09-07 16:07:38 北京时间**（`08:07:38.113Z`）完成。运维在共享主机锁下启用维护、停止所有当前 Core/Gateway，通过已发布 Gateway 镜像中的 `account-restoration.js` 执行真实 Mongo 跨 Auth/Business DB 事务。账号通过不可变 ID 指纹 `24d87b8676e0`、Auth 创建时间、旧注销时间、任务/反馈数和完整快照摘要限定；恢复没有使用邮箱匹配。

| 项目 | 恢复前后结果 |
| --- | --- |
| 用户身份与创建时间 | 完全不变，仍为 `2026-05-14T15:00:35.523Z` 创建的原身份 |
| 密码凭证 | 1 条，完整记录摘要不变 |
| 会话 | 23 条存储记录，完整摘要不变；此数量不表示全部仍有效 |
| 历史任务 | 44 条，完整记录摘要不变 |
| 反馈 | 4 条，完整记录摘要不变 |
| 上传状态 | 0 条，未新增签名上传或对象 |
| 旧注销记录 | 原样归档，`cleanupAllowed=false`，保留固定旧范围和审核摘要 |
| 当前生命周期 | durable head 为 `active`、contractVersion 3，具有新的周期编号和归档指针 |
| 其他账号 | Auth 总数仍为 14，其他五条注销 head 摘要不变 |

本次恢复的审核摘要为 `e261b1cb03e2e105415e916ed34ee66ff76be42672af616c23b936ef481ce1df`。现场操作前后分别计算用户、凭证、会话、任务、反馈、上传记录 SHA-256，并逐项断言一致；旧注销归档内容与原记录摘要相等。生产该账号没有新 Auth 删除操作，因此没有删除执行队列项，仅创建可供以后归档使用的集合。

恢复后以同一不可变镜像重启 Core/Gateway，健康、隔离、未授权 Core 拒绝、Benchmark disabled 和 Auth 事务 smoke 均通过。一次临时运维脚本的 stdin 被子命令消费，导致其末尾解除维护步骤未执行；检查发现维护仍在后，在共享锁下重新核验固定 SHA 与健康状态，单独完成解除维护。恢复事务没有重跑或改写数据。未来通过落盘脚本或对子命令显式关闭 stdin 执行，避免同类操作脚本问题。

## 功能与权限验收

- Core 的当前账号状态为 active，Gateway 当前账号删除队列为空；保留原注册时间和身份。使用空 `apiKeys` 的生成请求仅验证准入，返回 `Missing API key for provider openai`，没有再次被注销状态阻断，也没有调用 Provider 或创建任务。
- Web 现有 Chrome 标签刷新后，原 Cookie 登录仍有效；首页删除中警告消失，账号设置无处理中/待核对告警。未输入密码或点击删除、生成、优化按钮。
- 新任务由服务端绑定 `accountGeneration`；新参考图进入 `references/<userId>/lifecycles/<generation>/...`。本地实际 Core 函数及真实 Mongo 测试已验证：旧后台写回、旧操作编号、旧周期请求被拒绝；之后用户新发起的注销仍可完成。
- Benchmark API 的实际 Mongo 权限中，remove 仅限 `paperbanana_benchmark_prompt_submissions`；其他集合没有 remove 权限，个人投稿当前为 0。公开评测不属于账号恢复清理范围。
- 公网 `/ready` 为成功，Mongo/OSS/Provider Egress/Benchmark 均 ready。公开排行榜保持 41 个模型，releaseId `bench-scientific-v2-release-1f652f6370203d1ecf6a`、releaseHash `1f652f6370203d1ecf6a8f8ce679097b968b412cd4ab0bdf0362e3a5dce9d482` 不变。

## 验证边界与后续

本地 Core 428、Gateway 132、Web 335、共享 API 28、Laf 策略 6、香港部署契约 220 项及小程序 21 个测试文件通过。真实本地 Mongo 8 + Better Auth 覆盖并发注册、旧验证令牌隔离、恢复事务及幂等、之后再次注销、存储失败续跑、Auth 事务与丢失确认后的恢复；该联调已进入合并 CI。生产未创建/注销验收账号或发送验证邮件，没有用业务账号做删除测试。

此前只读发现的 98 个缺失对象未被本次恢复重建，44 条历史记录保留不代表图片文件已恢复；备份可用性未确定。另一中断账号 `fe1ba00370e4` 继续暂停，未获该账号的独立处置决定。新注销对签名 PUT 使用到期后再等待 24 小时的保守收尾窗口，未验证 OSS 服务端对极端长时间在途 PUT 的硬时限；本次恢复账号不存在上传状态或在途任务。

禁止直接回退到旧 Core 的无限历史前缀清扫实现。若需回退，应保持维护和停止删除续跑，保留 v3 清理边界与新生命周期数据，再修复向前发布。小程序代码及本地检查完成，上传/平台发布继续按用户要求暂缓。
