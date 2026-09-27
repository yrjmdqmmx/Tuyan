# 旧云平台退役清理交付（2026-09-27，本地待发布）

> 后续状态更新：本记录保留清理阶段的只读/未发布边界。用户随后授权的每日备份现网修复、旧监控探针移除和 Benchmark 完整运行镜像验证均已完成，见[后续修复记录](2026-09-27-backup-benchmark-repair.md)。下方备份与镜像阻塞描述是修复前状态。

工作树：`/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v381-20260927`，分支 `codex/tuyan-v3.8.1`；起点 `83d25a25a7b2a64111da2c97631a7945b7e3ff10`。开工核对的远端 main 为 `e2b70cfc849cc4de323df63827262b877083d1c0`。未改 Desktop 旧 checkout、独立小程序原生工作树或微信项目副本，未 push。

## 先纠正的前提

Sealos / Sealaf 已退役的方向成立，但不能整块删掉原 `apps/laf-functions`：Core 和 Benchmark Docker 构建仍从中读取现役业务处理器，目录生成器与安全守卫也依赖它。旧 AGENTS 所称“push 自动发布云函数/更新 Kubernetes”与实机不符。已先追踪依赖，再迁移业务核心和每个构建/测试入口。

当前服务确为香港 Compose + Node + 自建 MongoDB + 私有 OSS，新加坡仅提供 WireGuard/Squid 出口；完整规格、镜像与核查方法见[架构](current-architecture.md)及[脱敏实机证据](2026-09-27-host-evidence.json)。配置、readiness、真实账户推理、生产发布是不同证据层级。

## 删除、迁移、替换和保留

| 处理 | 内容与理由 |
| --- | --- |
| 迁移现役业务 | 处理器移至 `apps/paperbanana-api/runtime/handler.ts`，服务入口改为 `core-entry`，六项安全守卫随 Node 包移动。任务生成、精修、识图、历史数据、账号删除、模型路由和加密恢复原有逻辑继续运行。 |
| 删除平台绑定 | 删除旧应用 package/README/env、`@lafjs/cloud` 导入别名、`laf-cloud` SDK 形状替身与全局声明；`core-services` 直接绑定 Mongo/OSS 实例。没有安装替代云函数 SDK。 |
| 共享源码归一 | 处理器直接导入 `packages/api` / `packages/types` 的协议、思考、图片参数和渠道模块。目录生成仍产生目录数据及 Web/Mini 产物；生成器内部 VM 只用于离线派生目录，不再将共享实现复制进生产处理器。Core/Benchmark Docker 增加真实共享类型源路径；仓库开发要求、Pages 构建和离线恢复工具统一为已验证的 Node 24。 |
| 替换旧运行限制 | Plot 请求由仅等待计时器改为 Node AbortSignal，中止请求与响应读取；网关配置缺失失败关闭；默认任务准入有界；禁止未注入受控传输时退到 global fetch。 |
| 删除存储降级 | 删除 `PAPERBANANA_STRICT_OBJECT_STORAGE` 开关；OSS 写失败不再新增 Mongo data URL，所有输入都须通过 HEAD/有界内网读取。删除签名公网 URL 下载退路及为旧函数环境准备的 `require`/依赖面板分支，`fflate` 由 Node 正式依赖提供。 |
| 删除网关/客户端回退 | 删除 `LAF_API_URL`、旧模式、网关侧业务 `ADMIN_TOKEN`、外部精修 URL 开关及健康 `laf` 别名。Web 固定网关，删除旧运行平台探测与 FastAPI 备用请求、无用 `VITE_BACKEND_MODE` 配置；小程序改读 `backend`。通用 API **模型渠道**与专业模式角色混用保持。 |
| 删除旧部署/监控 | 删除 Laf workflow、旧域名健康探测、Plot Kubernetes NetworkPolicy。文档以实际 Compose、gVisor、项目级 DOCKER-USER 边界替代；校正误写的 RLIMIT_AS 内存限制，当前 RSS 由 2 GiB cgroup 限制。 |
| 拆分迁移工具 | 删除仅能在 Laf 中运行的对象导出入口/库；保留平台无关的既有 bundle 校验与 OSS 恢复器，移至 `deploy/hk-single-host/object-restore`，保留摘要、路径穿越/重复项/元数据/全桶校验测试。当前用途是恢复已归档的对象包，不是回到源平台；实际恢复需另行授权。 |
| 保留历史用户数据 | 继续读取历史任务字段、旧配置、客户端平台标签和已经存在的 data URL，避免丢失用户记录。没有恢复旧平台请求路径或新写入降级。 |
| 保留当前必要依赖 | MongoDB、ali-oss、Undici、sharp、jpeg-js、Resvg、fflate 均有当前 Node/Worker 调用；通用 API 的白名单错误归一化保护跨模块错误契约，不能传播原始供应商报错。这些不是旧平台兼容层。 |
| 历史资料归档 | 旧迁移/版本证据保留原路径及数据/哈希并加醒目的历史标识；[归档索引](../archive/platform-retirement/README.md)明确禁止执行旧部署/回滚步骤。旧名称仅在此类追溯资料、退役规则和拒绝旧配置的防回归测试中保留。 |

同时修正此前 v3.8.1 根目录测试遗漏：百灵/Novita 的渠道顺序与历史基线排除、LongCat/百灵/Novita 的已有官方契约索引及“真实调用/账户权益/账单未验证”字段。没有变更模型默认值或把未真实调用标成验证成功。

## 验证

[最终验证汇总](2026-09-27-validation.json) · [逐文件残留用途清单](2026-09-27-residual-inventory.json)。

- Core：1,041 项全量通过；覆盖路由混用、任务准入、图片/上传验证、OSS 失败、旧记录、恢复防重、通用 API 及 LongCat 识图 + Novita 生图组合。新增服务绑定、缺失认证/伪造凭据及 Plot 请求/响应读取中止测试。
- Gateway + shared API：176 项通过；Web 529 项通过并构建；小程序 121 项通过，TS 检查与 JS 构建通过。后续共享 client 格式整理与法律文档守卫定向复验通过。
- Benchmark Worker：200 项通过，类型检查与源码构建通过。Core 类型检查、三个运行 bundle 构建和目录/思考/上传生成物无漂移检查通过。
- 根目录及客户端平台契约：36 项通过。香港/新加坡运维、部署、对象恢复与安全守卫共 353 项通过。Plot 认证边界 2 项通过；未以此替代生产 gVisor/防火墙压测。
- 隔离的真实 Mongo 8 副本集：Better Auth 注册/验证/并发/重新注册、跨数据库账号恢复/删除和失败重试通过；管理链路 66 项通过；加密恢复、嵌套步骤、并发 CAS、防重复支付/生成通过。所有模型、支付、OSS 写入均使用本地替身，未调用付费服务或写生产数据。
- Core Docker：本地 Linux arm64 与 **linux/amd64** 完整镜像构建通过，包括原生 WebP→PNG 自检；与生产架构对应的 amd64 路径不再复制旧目录。仅构建本地镜像，没有推送镜像或部署。
- Benchmark Docker：完整 `build` 阶段通过（包括 Core 共享 image runtime、Worker 构建、prod 依赖打包）。最终 runtime 阶段连续两次因本机访问 `http://deb.debian.org` 返回 HTTP 502 而失败，无法安装固定字体版本。未关闭 apt 签名校验；完整最终镜像仍待网络恢复后重验。

## 性能与资源影响

[原始测量](2026-09-27-local-measurements.json)：相同 Node 24.15.0 / macOS arm64，本地构建、7 个新进程导入 image runtime。Core bundle 从 7,041,876 降至 5,972,305 bytes（**-15.19%**），image runtime 从 4,168,874 增至 4,180,160 bytes（+0.27%）。进程 RSS 中位数从 148,963,328 降至 131,923,968 bytes（-11.44%）；导入时间从 144.55 升至 150.02 ms（+3.78%）。机器并行负载未控制，不能把这组微测量当生产性能基准，也没有证据宣称推理延迟变快。

明确的技术变化：消除 Core 重复模块及代码维护漂移；删除对象签名/公网回读的降级路径和多余 Base64 分配；Plot 计时到期会取消实际传输，减少悬挂请求；删除无用健康探测。现网原先已经强制严格存储，因此不应声称这次让正常生产 OSS 路径突然减少一次网络往返。未调整生产 CPU/内存、并发上限或共享主机资源。

## 仍未完成与生产边界

1. **未安装本次清理**：现网仍是 `9a52aa7`。旧域名探测、旧健康别名及无效环境项需在另行授权的发布中同步；本地改动不等于线上消失。v3.8.1 继续待发布。
2. **生产每日备份异常**：9 月 27 日 03:24–03:26 CST 的 OSS PutObject 连接内网目标超时，服务退出码 3，监控持续报“last daily backup did not succeed”。仅做只读诊断，未运行恢复/备份或改变生产网络，根因和恢复成功尚未确认。它与旧域名探测是两个问题。
3. **Novita 出口**：源码已经适配，生产 SG ACL 还未放行 `api.novita.ai`；不得宣称真实调用已验证。
4. **Benchmark 最终镜像**：如上所述，Debian 软件源 502 阻塞；正式发布前必须完成 runtime 镜像构建。
5. **微信与云账户**：未重新登录微信后台、发布小程序；未盘点/删除旧云资源或确认旧云账单停止。历史资源销毁和生产数据操作不在本轮授权内。

没有付费推理、充值、生产部署、生产配置写入、云资源删除或微信上传/审核/发布。
