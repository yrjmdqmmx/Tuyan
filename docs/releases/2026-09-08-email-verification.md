# 邮箱验证反馈修复发布记录

2026-09-08，按用户“走上线流程”授权完成邮箱验证反馈修复的生产发布。验证链接在原有效期内重复打开会显示已验证，原注册页会检查本次注册的验证状态，普通登录不再跳到邮箱验证结果页。

## 发布版本与检查

- 实现 [PR #174](https://github.com/yrjmdqmmx/Tuyan/pull/174)，实际发布提交 `f84659eb4cafc9f1330a65f0aa0d6cf89695abd0`。
- 实现提交 `fa551c7` 的分支、PR CI 和合并提交的 [CI](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34184784540) 全部通过。Gateway 138、Web 349、Core 451 项本地测试通过；CI 另完成全栈测试、构建、客户端契约与真实 Mongo 8 集成。
- [Gateway 镜像](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34184803955)、[Core 镜像](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34184805975)、[配套 Worker 镜像](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34184808476) 构建成功，均锁定摘要。
- [香港部署](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34185014445) 成功，经过现有环境审批、主机锁、维护、排空及健康检查。2026-09-08 03:58 UTC 已完成切换，维护状态已解除。
- [Web Pages](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34185016924) 成功，使用同一固定提交，保留 `bench_enabled=true`。线上主资源为 `main-CEnDB2Og.js` 与 `appPaths-Ba0fLi8f.js`。

本记录在实际发布验收后补记，后续文档提交不改变上述部署 SHA。

## 修复与兼容性

Gateway 将验证结果的哈希回执保留到原 1 小时有效期结束。重复请求只在同一不可变账号 ID、原邮箱摘要、当前已验证且无注销操作的条件下返回 `TOKEN_USED`；不重复验证、不创建会话。过期、无效和暂时不可用分别提示。

注册响应新增可选 `verificationStatusToken`，用于只读 `POST /api/auth/verification-status`。它只能观察本次实际新注册的身份，不能完成验证、登录或查询任意邮箱。重复注册保持中性响应与随机观察凭证；凭证只存在页面内存中。旧网关缺少该字段时，网页仍提供直接登录指引。

原注册页在前台自动检查，回到页面时再次检查，成功后隐藏重发按钮。等待验证时清空密码。普通登录移除错误的邮箱验证回调，结果页提供 `/?auth=sign-in` 登录入口。

无新增环境变量或数据库迁移。沿用现有令牌集合、TTL 与注销清理。为满足现有发布器对 Core/Worker 版本标识的同步，配套镜像按同一提交重建；评测执行保持关闭。小程序兼容新增可选字段，本轮不发布。

## 验收证据

- 五个项目服务均 healthy；Gateway 运行源码的三个 SHA-256 与发布代码一致。Gateway/Core/Worker 镜像 revision，以及 Core/Worker 镜像内的构建来源，均匹配发布 SHA。
- 公网 `/health`、`/ready` HTTP 200，Auth、Mongo、OSS、出口及 Benchmark 依赖 ready。目录仍为 `2026-09-07.v15`，区域契约版本 1。
- Core 保持 `sg-required`；Worker 保持 disabled、并发 1。与发布前受保护备份比对，除部署器更新的 Core/Worker `PAPERBANANA_CODE_SHA` 外，环境值完全一致。
- 本地使用真实 Better Auth 和一次性 Mongo 副本集验证了首次/并发/重复验证、原注册页跨浏览器自动更新、密码清空、显式登录、重复注册隐私，以及注销和同邮箱重新注册。邮件使用内存传输。
- 生产 Chrome 在 1440×1000 和 390×844 下完成 10 项功能与布局检查：登录入口、已验证/过期/暂时不可用结果页、无效链接固定站内跳转、返回登录、无横向溢出、未产生登录会话。登录界面约 2.0/2.2 秒可见。
- 新状态接口在浏览器中返回 HTTP 200、`Cache-Control: no-store` 和中性的 `pending`；线上 `email-verified.js` 字节摘要与发布代码一致。
- 无应用脚本错误。唯一非阻塞资源提示为结果页既有的 `/favicon.ico` 404；上一生产版本也没有该图标文件或声明。原始资源提示和应用脚本错误分别记录在证据中。

完整工作流、镜像、源码摘要、健康和浏览器结果见[机器可读证据](2026-09-08-email-verification-evidence.json)。

## 边界与回退

本次没有发送真实邮件、创建或修改生产测试账号，也没有操作反馈用户的账号。真实 163/微信客户端首次点击情况未复测，因此不能认定服务商或客户端是首次错误的原因。生产结果页各状态展示已核对；真实新注册、验证、跨浏览器同步及登录的完整链路由本地真实认证服务与数据库集成覆盖。

旧版已经删除的令牌回执无法补回；相应页面会引导用户先尝试登录。账号已验证并能登录时无需重发邮件。

未触发回退。回退基线为 `b96d507c4bcb2424c1814d6cdf4e81aae2b4cfb6`，使用既有受锁发布入口和 `configured-disabled`；原 Gateway/Core/Worker 固定摘要保存在证据的 `rollback` 字段。Plot Worker 与 Mongo 镜像保持原值。生产配置及镜像锁已在主机受保护目录备份，未导出凭据。Web 可按同一旧提交重新发布。

微信小程序原生验收、上传和平台发布继续暂缓。没有付费模型调用或评测发布。
