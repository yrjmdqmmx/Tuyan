# 当前架构与运行核查

核查日期：**2026-09-27**，只读 SSH、Docker inspect/stats、systemd、Nginx 配置及当前 `/health`、`/ready`。实机配置优先于旧部署文档。证据摘要见 [JSON](2026-09-27-host-evidence.json)；本次代码清理见[交付记录](2026-09-27-platform-retirement.md)。

| 项目 | 香港业务主机 | 新加坡出口主机 |
| --- | --- | --- |
| 操作系统 | Debian 12，Linux 6.1，x86_64 | Ubuntu 24.04.4 LTS |
| CPU / 内存 | 4 vCPU；系统可见 15,936,344,064 bytes（约 14.84 GiB，16 GB 规格） | 2 vCPU；3,669,192,704 bytes（约 3.42 GiB，4 GB 规格） |
| 磁盘 / Swap | 根卷约 84.16 GB，使用 73%；4 GiB Swap，当时未用 | 根卷约 84.15 GB，使用 7%；1 GiB Swap，当时未用 |
| 服务 | Nginx 1.22.1、Docker 29.7.1、Compose 5.3.1 | WireGuard、Squid 6.14，无 Docker |
| 入口 | `api.paperbanana.asia` TLS → `127.0.0.1:13005` | 仅隧道 `10.77.0.2:3128` 接收 HK 代理请求 |

香港为共享主机，存在其他项目容器。因此不修改全局防火墙、不进行全局 Docker prune，也不把整机资源都分配给图研。上表是观察时快照，不能当作压测数据或永久容量承诺。

```mermaid
flowchart LR
  C[Web / 微信小程序] --> N[香港 Nginx TLS]
  N --> G[Node 24 Auth Gateway]
  G --> A[Node 24 Core]
  G --> M[本机 MongoDB 副本集]
  A --> M
  A --> O[香港私有 OSS 内网端点]
  A --> P[隔离 Plot Worker / gVisor]
  A --> W[WireGuard → 新加坡 Squid]
  W --> V[获准的模型服务域名]
  A --> D[按策略直连的国内服务]
  C --> U[OSS 公网签名上传 / 下载]
```

## 容器与数据

Compose 项目名 `paperbanana-hk`，业务 API/Core/Mongo/Worker 不暴露公网端口。观察到五个运行容器全部 healthy，`mongo-init` 已成功退出是正常状态。

| 服务 | CPU 上限 | 内存上限 | 用途 |
| --- | --- | --- | --- |
| auth-gateway | 0.5 | 512 MiB | Better Auth、会话、所有权、管理身份与 API 转发 |
| paperbanana-api | 1.5 | 3 GiB | 生成/精修、角色路由、加密恢复和对象存储 |
| mongodb | 1 | 3.5 GiB | 单成员副本集，逻辑数据库/用户隔离 |
| plot-worker | 1 | 2 GiB | `runsc`、只读根目录、内网与出站防火墙隔离 |
| benchmark-worker | 1 | 2 GiB | 容器运行；`PAPERBANANA_BENCH_ENABLED=false`，不执行评测 |

Mongo 数据、备份、secret 与控制文件位于 `/opt/paperbanana`，不随 checkout 替换。Mongo 单成员副本集支持事务，但不具备多节点高可用。OSS 为 `oss-cn-hongkong`：服务端 `oss-cn-hongkong-internal.aliyuncs.com`，客户端签名 `oss-cn-hongkong.aliyuncs.com`，两者不能混用。实时 readiness 的 Mongo、私有 OSS 检查均 ready；本轮没有上传/删除生产对象。

2026-09-27 经用户授权，Core、Gateway 与完整 Benchmark 镜像已部署 `24ed37b45c25d35581d92dfb412f412ebd5a3db0`，五个容器健康、运行来源与镜像 digest 核验一致。Mongo/Plot 镜像保持不变，Benchmark 执行器关闭；见[发布记录](../releases/2026-09-27-tuyan-v3.8.1.md)。

## 出口与部署

Core 现网模式为 `sg-required`，WireGuard 最近握手正常。Squid 仅允许 HK 隧道来源、CONNECT 443，拒绝 IP 字面量和私网目的地；允许列表采用逐主机规则，其中 BFL 使用已审计的 `.bfl.ai` 子域规则。国内直连与海外代理的精确分类以 [Core 策略](../../apps/paperbanana-api/src/provider-egress.ts) 与 [SG 配置](../../deploy/sg-egress)为准。代理失败不降级到香港直连。

发布入口为手动 GitHub Actions 和 [项目部署脚本](../../deploy/hk-single-host/README.md)：固定源码 → GHCR 镜像 digest → 锁定清单 → 项目锁、维护/排空、停止旧单副本 → 启动/验收。Web 单独发布 Pages，小程序单独走微信审核。CI 只做测试/构建，不等于生产发布。

Sealos / Sealaf 已退役，没有平台回退路径。恢复仅在当前架构中选择已验证镜像与相容数据方案。旧历史记录见[归档索引](../archive/platform-retirement/README.md)，不能据此操作生产。

## 监控、缺口与发布前工作

- 健康、出口、DirectMail 出站规则刷新（五分钟）和每日 Mongo 备份 timers 启用。2026-09-27 03:24 的备份失败已在用户追加授权后修复：Tailscale 丢弃 OSS 内网 CGNAT 回包，按准确 DNS IP 临时豁免已建立 HTTPS 回包后上传恢复；归档/校验文件完整回读一致、对象 AES256 加密、规则清理均核验。备份脚本安装于 checkout 外 `/opt/paperbanana/operations/backup`；本地完成文件只在两次上传成功后公开。详见[修复证据](2026-09-27-backup-benchmark-repair.md)。
- 已按追加授权从现网监控中移除退役平台代理探针；备份修复后监控恢复健康。其他检查仍覆盖 API/readiness、容器、Mongo、任务、备份时效、TLS 和 Nginx 5xx。
- 用户授权上线后，SG ACL 已仅增加 `api.novita.ai`，Squid 配置校验/reload/active 通过。HK 经 SG 查询公开模型目录为 CONNECT 200 / HTTP 200，未批准域名仍 CONNECT 403；没有推理请求，连通不代表账户权限。
- 生产健康响应已移除 `laf` 别名；Compose 的 `PAPERBANANA_STRICT_OBJECT_STORAGE` 和网关不再读取的 `ADMIN_TOKEN` 已清理。Core 内部业务 admin 凭据保留，生产严格存储行为保持；其余凭据文件指纹未变。
- 微信控制台合法域名、已发客户端版本、提供商账户权限和账单未在本轮重新登录核实；本地测试不代表真实调用或微信发布。
- 未查询旧云平台账户的资源/计费清单；也未改变其资源。无法据此声称已停止所有历史账单，后续资源销毁需要单独授权。
