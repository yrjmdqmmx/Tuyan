# 2026-09-27 · 每日备份与 Benchmark 运行镜像修复

本次用户追加授权修复这两项故障。业务版本仍为现网 v3.8.0 / `9a52aa7`；v3.8.1 待发布。未启用 Benchmark 执行器、发起模型或 Judge 调用、推送运行镜像或部署业务容器。

## 备份根因与修复范围

2026-09-27 03:24 的 `ossutil PutObject` 连接 `100.115.61.4:443` 超时。当前 OSS 内网域名返回 `100.115.61.3–10`；宿主机 Tailscale 的 `ts-input` 丢弃非 tailscale0 的 `100.64.0.0/10` 流量，已有豁免只覆盖旧 `100.115.92.0/23`。同机无凭据 HTTPS 请求复现超时；为单个解析 IP 加入 eth0、TCP 源端口 443、ESTABLISHED、REPLY 的临时规则后，1 ms 建连并收到正常未鉴权 HTTP 403，精确规则命中 9 个包。删除实验规则后才实施正式修复。因此不是凭据失效或 bucket 不存在的猜测。

- `with-backup-oss-network.py` 每次上传解析准确 bucket 内网域名，验证 HK HTTPS endpoint、CGNAT 地址数量/范围以及 eth0 路由，再在 INPUT 顶部临时加入精确回包规则。正常结束、上传错误、部分安装失败和 SIGTERM 均清理，systemd 的受锁保护 ExecStopPost 处理强制退出残留。保持 Tailscale、自有防护链和其他项目规则；不扩大全网段豁免，不写全局持久防火墙。
- 原 OSS 内网地址、RAM 凭据、私有桶、AES256 加密和本地保留策略沿用。unit 只为路由/iptables 添加 AF_NETLINK；仍为 oneshot、2 小时上限、root 0077 和互斥锁。
- 安装器将脚本原子复制到 root-only `/opt/paperbanana/operations/backup`，与可替换的业务 checkout 分离。Compose 路径继续为 `/opt/paperbanana/repo/deploy/hk-single-host`。
- 验收复现了“备份进行中 checksum 尚不存在”的监控误报。现在 dump 和 checksum 先使用 `.partial`，两次 OSS 上传成功后先公开 checksum、再原子公开归档；失败仍返回失败，保留 partial 用于诊断。
- 从现网健康脚本精确删除两行旧平台代理探针。其他检查不变；安装后脚本 hash 与当前仓库完全一致。没有修改业务容器或数据库业务内容。

已完成多次真实备份上传，并对归档和 checksum 完整回读后比较 SHA-256，执行 gzip 完整性检查，核验对象 SSE=AES256 和剩余临时规则数为 0。备份过程中及完成后的健康检查均作为最终验收项。最终备份于北京时间 **12:10:47–12:10:56** 完成，归档 **68,859,943 bytes**；SHA-256 为 `359f6e1f2113c7b8e9821b8ce370aed64278702406d519ce6c4637ea371a3654`。12:10:49 备份进行中的健康检查通过，12:12:20 完成后的检查也通过。详细对象/安装文件 hash、容器状态见[脱敏证据](2026-09-27-backup-benchmark-evidence.json)。**本轮未向生产库恢复数据，也未做完整 Mongo 恢复演练**；回读校验不能替代恢复演练。次日定时触发尚未发生，不把手动启动同一服务称为已验证次日运行。

服务器审计/原文件副本位于 root-only `/opt/paperbanana/ops-repairs/20260927-backup`。该目录保留安装前脚本/unit、候选文件和私有对象元数据；仓库只保存脱敏证据。业务容器的镜像和启动时间保持不变。

## Benchmark 完整镜像

原失败位于最终 runtime 的 apt 字体安装，HTTP Debian 源返回 502；其后的 “repository is not signed” 是获取 InRelease 失败的结果，不能据此关闭签名检查。再次排查还发现本机访问 Debian 官方 HTTPS 域名发生连接重置，而阿里云 Debian 镜像三组 InRelease 均可正常读取。

- slim 基础镜像没有系统 CA bundle。安装脚本从同一 Node 基础镜像的内置 Mozilla CA 导出临时信任文件，用验证 TLS 的 HTTPS 获取 Debian 签名索引和软件包，再安装系统 `ca-certificates`。
- 默认仍为官方 `https://deb.debian.org/debian` 与 `/debian-security`；提供两个 HTTPS 构建参数以支持受限网络。本地验收使用 `https://mirrors.aliyun.com/debian` 与 `/debian-security`，没有修改默认 CI 镜像源。
- 保留 `fonts-noto-cjk=1:20220127+repack1-1`；不禁用 TLS 或 apt 签名校验；索引下载任一失败均使构建失败，传输重试限 3 次。
- 最终 `linux/amd64` 镜像包含 Core image runtime、Worker production dependencies、原生 Sharp/WebP、Resvg WASM 和固定 CJK 字体。CI 现会 load 完整镜像，执行无网络、uid 1000 的镜像内 smoke，校验 codeSha、校准渲染、共享 runtime import、WASM、PNG/WebP。
- 另在无外网的临时 Docker 网络内，用真实 Mongo 8 与目录 HTTP 替身启动 Worker，验证 `ready`、`enabled=false`、仅一次目录发现。没有生产凭据或 Provider/Judge 请求。

## 验证与剩余边界

本地香港运维 228 项、Benchmark 200 项、备份网络/发布时序 12 项通过；Shell 语法与 diff 检查通过。完整 amd64 镜像构建与离线 smoke、隔离 Worker 启动通过。最终完整镜像由干净的代码提交 `f2d0eb5cef2ab6d90eed196d853b394ff8d0126a` 构建，镜像内 codeSha 核验一致；本地镜像 `tuyan-benchmark-repair:sha-f2d0eb5cef2ab6d90eed196d853b394ff8d0126a`，本地 manifest digest `sha256:5d618b442666bfef67fe3890ee6861cdfdf3e920bb84e3da0729b6f9074a2141`。最终镜像离线 smoke 与隔离 Worker 启动均再次通过。初步 working-tree 构建仅作排障，不作为最终来源；该 digest 不是 GHCR 发布证明。

未推送 GHCR、运行发布 workflow 或替换现网 Benchmark 镜像；Worker 执行器继续关闭。未运行真实评测、付费模型调用或微信发布。v3.8.1 剩余业务发布、SG Novita ACL、旧环境项清理仍按已有待办处理。系统单元校验另提示现有第三方 CloudMonitor 的 KillMode/PIDFile 警告，与本次故障无关，本轮未改第三方服务。

核查日期：2026-09-27。官方背景：[Tailscale CGNAT 冲突](https://tailscale.com/docs/reference/troubleshooting/network-configuration/cgnat-conflicts)、[Node 内置 CA API 源文档](https://github.com/nodejs/node/blob/v24.x/doc/api/tls.md)、[OSS HeadObject 元数据](https://www.alibabacloud.com/help/en/oss/developer-reference/headobject)。故障结论主要依据实机对照请求、规则计数、服务退出码和完整对象回读，而非仅凭文档推断。
