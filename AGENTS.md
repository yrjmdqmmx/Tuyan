# AGENTS.md

## 当前生产位置（2026-10-18 更新）

2026-10-18 分渠道线路已部署：国内入口与 Fireworks 从杭州直连；OpenRouter、xAI、Novita、Stability、Together、Ideogram、Runware API、Mistral、BFL 三个入口、fal、Recraft、Replicate、MiniMax 国际共 16 个精确主机走新增香港受控代理（10.78.0.1:3128）；OpenAI / Anthropic / Gemini / Bedrock 等其余既有海外目标保留新加坡。SG 代理 DNS 已修正。禁止因网络超时自动换线重发付费请求。零推理测试不证明账户权益或模型质量；见[线路发布记录](docs/operations/provider-routing-rollout-20261018/report.md)。

图研和 OpenAcad 业务与数据库已在杭州 `116.62.146.226`；本轮业务素材、评测证据及 Mongo 备份也已迁杭州私有 OSS，服务端使用杭州 HTTPS 内网端点。2,775 个有效对象逐一校验，新备份完整读回通过，Core 源码 `3c90bb72011c69f350f41ec6fb27449022819682` 已上线。国内主入口 `tuyansci.cn` / `openacad.xyz` 直连杭州，旧 `api.paperbanana.asia` 仍经香港兼容转发。

香港保留受控模型出口、冻结业务与 OSS 恢复副本，旧业务不得直接重启写入；切换后回退须先同步杭州新增数据。日常备份与业务同在杭州，香港旧备份不是持续异地保护。Compose 名 `paperbanana-hk` 只是历史名称。旧 HK / SG GitHub Actions 保持停用，当前受保护的[杭州 SSH 人工发布入口](deploy/hangzhou/README.md)已实测，不代表自动 CI/CD 已启用。结果和边界见[存储验收](docs/operations/2026-10-18-hangzhou-storage.md)与[业务迁移记录](docs/operations/2026-10-18-hangzhou-migration.md)；下方 2026-09-27 架构仅为历史记录。小程序继续暂停，恢复前核实杭州 OSS 合法域名。

图研Tuyan monorepo：用户客户端只保留 Web（`apps/web`，React + Vite）与微信小程序（`apps/miniprogram`）；服务端继续保留 `paperbanana-api`、`auth-gateway`、`plot-worker` 和 `benchmark-worker`。**各模块常由不同的、互不可见的 AI 会话分别开发。**

## ⚠️ 跨端协调（最重要）
**开工前先读 [SYNC.md](./SYNC.md) 并遵守它的协议：**
- 补齐你负责那一端在 SYNC.md 里未打勾 `[ ]` 的待办；
- 当你改了**后端 / 共享契约**（API 字段、action、model 列表、env 变量、任务记录字段、网关转发规则）时，**必须**在 SYNC.md 顶部新增一条，写清变更与各端待办；本端做完就把自己那一格打勾。
- 纯单端 UI / 样式 / 文案 / 本地 bugfix 不用记。

这条规则的目的：让每个独立会话不靠人肉传话就能知道"别人改了什么、我这端还欠什么"。

## 当前架构与操作边界（2026-09-27 只读实机核查）
- 香港业务主机：Debian 12、4 vCPU / 16 GB，Docker Compose 项目 `paperbanana-hk`。宿主 Nginx → `127.0.0.1:13005` 网关 → 内网 Node 24 Core；MongoDB 8 单成员副本集、香港私有 OSS；Plot Worker 使用 gVisor。Benchmark Worker 容器存在但执行器关闭。
- 新加坡出口：Ubuntu 24.04、2 vCPU / 4 GB，WireGuard + Squid，无业务容器；受控海外请求走精确主机白名单。禁止代理故障后直接出香港。
- 业务主源码在 `apps/paperbanana-api/runtime/handler.ts`，服务适配器在 `src`；共享模型/协议直接导入 `packages/api`、`packages/types`。目录与客户端生成物仍需运行同步脚本检查。
- 部署通过手动 GitHub Actions、不可变 GHCR digest 和项目级 Compose 脚本；push/CI 不等于部署。任何生产部署、服务器配置变更、云资源或数据删除均需用户另外授权。
- Sealos / Sealaf 已彻底退役：不是运行平台、部署目标或回滚方案。不得恢复相关 SDK、环境变量、代理域名或发布工作流。历史记录只用于追溯，不能作为操作指引。
- 主机还承载其他项目。禁止全局 Docker 清理、全局防火墙替换或未经核对调整整机资源。回滚只能使用当前架构的已验证镜像和相容数据恢复方案。
- 以[当前架构与核查证据](docs/operations/current-architecture.md)、[部署说明](deploy/hk-single-host/README.md)为操作入口。核实实时状态后再修改；不打印 `.env`、密钥、认证头或完整生产 Compose 配置。
