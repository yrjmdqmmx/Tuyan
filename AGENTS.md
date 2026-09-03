# AGENTS.md

图研Tuyan monorepo：用户客户端只保留 Web（`apps/web`，React + Vite）与微信小程序（`apps/miniprogram`）；服务端继续保留 `paperbanana-api`、`auth-gateway`、`laf-functions`、`plot-worker` 和 `benchmark-worker`。**各模块常由不同的、互不可见的 AI 会话分别开发。**

## ⚠️ 跨端协调（最重要）
**开工前先读 [SYNC.md](./SYNC.md) 并遵守它的协议：**
- 补齐你负责那一端在 SYNC.md 里未打勾 `[ ]` 的待办；
- 当你改了**后端 / 共享契约**（API 字段、action、model 列表、env 变量、任务记录字段、网关转发规则）时，**必须**在 SYNC.md 顶部新增一条，写清变更与各端待办；本端做完就把自己那一格打勾。
- 纯单端 UI / 样式 / 文案 / 本地 bugfix 不用记。

这条规则的目的：让每个独立会话不靠人肉传话就能知道"别人改了什么、我这端还欠什么"。

## 架构 / 部署速览（详见 README.md）
- **auth-gateway** = Sealos「应用管理 / App Launchpad」的 Docker 容器（镜像 ghcr，push 后 CI 自动构建 + `kubectl set image` 滚动更新）。
- **paperbanana-api** = Sealos「云开发 / Sealaf」云函数（push 改 `apps/laf-functions/paperbanana-api.ts` → CI `laf func push` 自动部署）。
- 对象存储桶名由 env `PAPERBANANA_BUCKET` 指定（在 Sealaf 函数环境变量里配，改 env 后需**应用级重启**才生效）。
- ⚠️ 别给 auth-gateway 加自定义启动命令 / `/config` ConfigMap 挂载，会覆盖镜像代码。
