# 2026-10-18 杭州服务清理与图研 / OpenAcad 迁移

用户授权范围：删除杭州的 OpenVac 正式、预发布、测试实例、OpenTrad、Age of Mechs；将图研和 OpenAcad 迁到杭州。业务切换已完成。最终实机检查时间为北京时间 2026-10-18 11:20 左右。

## 当前运行位置

| 位置 | 当前职责 |
| --- | --- |
| 杭州 116.62.146.226 | 图研前端、两套 Auth Gateway、Core、MongoDB、gVisor Plot Worker、关闭执行器的 Benchmark Worker；OpenAcad 前端、API、两个导出 Worker、Redis；原有 DingyiVac 保留 |
| 香港 47.243.4.247 | 旧域名 / 兼容入口经 Nginx 转发杭州；图研和 OpenAcad 的原业务容器停止，保留冻结数据；Tensor Auto、任务大厅保持运行 |
| 新加坡 47.84.201.88 | 既有 WireGuard + Squid 受控模型出口，新增只允许杭州主机的隧道接入 |
| 香港私有 OSS | 仍保存现有图片、素材及备份；没有迁移 Bucket 地域。杭州服务端使用原 Bucket 的 HTTPS 公网端点，权限、对象键、签名策略不变 |

杭州 Compose 项目仍名为 `paperbanana-hk`，这是兼容保留的项目名，不能据名称判断服务器位置。业务主数据现以杭州为准。

## 已删除的杭州服务

- OpenVac 正式环境、预发布环境、`openvac-full-smoke` 测试实例。
- OpenTrad API、Worker、ClamAV。
- Age of Mechs 服务及备份定时任务。
- 共移除 12 个业务容器、5 个确认归属的专用数据卷、相关网络、镜像、项目目录、Nginx 站点、服务单元及旧证书续期配置。
- 未注销域名或修改 DNS；未清理其他项目。一个无法确认归属、没有容器引用的约 49.7 MB 匿名 PostgreSQL 卷保留，不属于运行服务。

清理前的文件、数据库和镜像恢复归档保存在杭州 `/var/backups/service-retirement-20261018/`，仅 root 可读。删除范围和归档校验见同目录 `receipt.json`。归档含原服务凭据，不应公开、提交仓库或直接打印。

## 迁移方法与数据校验

切换前确认图研没有活动生成任务、OpenAcad 队列无待执行或执行中任务。短暂停写，停止香港业务写入和源备份 / 监控定时任务，冷拷贝 MongoDB 与 Redis 后在杭州启动，最后切换 Nginx 并解除杭州停写。

- MongoDB 冷数据目录 340 个文件的 SHA-256 完全一致。
- 三个逻辑数据库所有集合数量在杭州启动后、恢复业务写入前逐项一致；包括用户 21、会话 52、账户关联 22、任务 97、参考条目 306、图片记录 17、TokenDance 连接 5。保留既有账号、任务、授权密文与评测数据。
- 冷数据包：735,967,165 bytes，SHA-256 `d68a49569de992d327986723f674afd0f9d24ad53d976007557e2811999f8018`。
- Redis RDB：956 bytes，SHA-256 `990f8c2e541780b23202ae508166923d852ba8487751b5ea233c4ca42aa65024`。
- 源迁移材料：香港 `/var/backups/hangzhou-migration-20261018/`；目标材料：杭州 `/var/backups/hangzhou-direct-20261018/`。
- 临时迁移 SSH 授权和私钥已删除。既有长期登录方式不变。

## 配置与代码变化

Core 以实际线上代码基线 `a68bb2684db01ee1e593260bd01eac86444b3831` 创建独立补丁，没有混入主开发工作区未发布功能。

- 部署源码提交：`95589896186bc077c6e142040464905ddfcac338`。
- Core 镜像：`tuyan-core-hangzhou:95589896186b`。
- 当前运行镜像 ID：`sha256:8d3caecae31bccd41923e68660e179f1aee52fbd569e984e7cc10f6619055b81`。
- 新增严格配置 `PAPERBANANA_OSS_SERVER_ENDPOINT_MODE=internal|public`，默认 internal；杭州显式 public。原内网 / 公网端点分别保留，拒绝非法模式或域名。Benchmark 使用其已有独立 public 模式。
- 其余业务服务复用源主机的相同镜像。迁移补丁在独立本地分支 `codex/hangzhou-oss-migration-20261018`；未推送 GitHub 或发布 GHCR。
- 保留原 gVisor 版本和 Plot 隔离策略。杭州 WireGuard 地址 `10.77.0.5`，新加坡代理 `10.77.0.2:3128`；新加坡仅新增杭州来源的 UDP 51820 安全组规则及代理来源 ACL，模型目的域名白名单不变。
- 跨地域 OSS readiness 探测超时调整为 10 秒，Core / 原网关 Compose 健康检查超时 15 秒；不改变生成请求超时。CN 网关 Compose 文件也对齐到 15 秒，下次重建生效，本次没有为该文件变动额外重启健康的 CN 网关。
- 香港兼容入口到杭州使用 HTTPS，验证证书，SNI 为 `tuyansci.cn`、验证深度 3；旧 API 的杭州接入口限制为香港来源，不开放匿名旁路。
- 备份、健康监控、DirectMail 目标地址刷新和 WireGuard 定时 / 启动服务在杭州运行；源业务监控与备份停用。备份脚本改用 OSS 公网端点，保留原桶、前缀及校验方式。

## 验证结果

| 检查 | 结果 |
| --- | --- |
| 杭州业务容器 | 10 / 10 healthy，所有 RestartCount 为 0 |
| 香港迁出业务 | 对应 10 个容器已停止；其他项目继续运行 |
| 图研新入口 | `https://tuyansci.cn/ready` HTTP 200，最终单次约 1.31 秒 |
| 图研旧入口 | `https://api.paperbanana.asia/ready` HTTP 200，最终单次约 1.73 秒 |
| OpenAcad | `https://openacad.xyz/api/health` HTTP 200，最终单次约 0.24 秒 |
| 图研部署 smoke | Mongo 事务、OSS readiness、授权边界、受限出口、Plot 出站隔离、Benchmark 禁用检查通过 |
| 图研实际 Plot 渲染 | Core → gVisor Worker 返回有效 PNG，25,163 bytes；未调用模型 |
| OpenAcad 实际队列导出 | PNG 导出完成，1,970 bytes；SHA-256 `fb38aa6bf0b55a87a0c942b085c2f73fba41f4b0c82e5c815d6520c397a1cdb0`；成功样例已删除 |
| 公开目录接口 | modelRegistry、referenceLibrary HTTP 200、业务 code=0 |
| 备份 | 杭州实际 Mongo 备份 79,158,531 bytes，成功上传既有 OSS；systemd Result=success、ExecMainStatus=0 |
| Core 补丁 | config / OSS 29 项测试、类型检查、构建通过；补丁同步至原开发工作区后 29 项测试再次通过 |
| Nginx | 配置检查成功；保留既有重复协议选项警告，不影响本次请求验证 |

这几次 HTTP 耗时只是健康检查单次测量，不能作为模型首字延迟、生成速度或线路排名。没有重新登录所有第三方账号，没有真实模型推理，也没有验证所有图像 / SVG 生成流程。

最终资源快照：杭州根盘 79 GB，已用约 27 GB，可用约 48 GB；内存可用约 12.4 GB，Swap 使用为 0。归档占用包含在磁盘用量内，不是容量压测结论。

## 后续部署和恢复边界

两个仍描述旧拓扑的手动 GitHub Actions 已停用：`Deploy Hong Kong Production`、`Deliver Singapore Provider Egress`。这防止旧流程重新启用香港写入或覆盖新增杭州隧道。**杭州的新自动部署流程尚未改造、验收；不能宣称 CI/CD 已迁移完成。** 下一次发布前需分别更新业务部署目标和新加坡双来源配置，不可直接修改共享 HK_HOST 密钥，也不可直接重新启用旧工作流。杭州运行源码是迁移副本，不含 `.git`，旧脚本的 git fetch 假设不成立。

香港冻结副本和迁移前归档只代表切换时状态。杭州恢复写入后，禁止直接启动香港旧 Mongo / 应用当作回滚；需要先停写、备份并反向同步最新数据，验证一致性，再切入口。香港两个 `migrated-to-hangzhou` 标记记录该边界。

本轮没有新增付费云资源或付费模型调用。现有服务器和 OSS 仍按原方案计费；跨地域 OSS 公网流量成本没有在本轮账单核对，不能承诺后续总成本为零。香港和新加坡的分渠道模型速度 / 质量比较尚未完成，本轮保留既有受控出口策略。

证据见 [迁移清单](hangzhou-migration-20261018/verification-summary.json) 和 [最终实机核查](hangzhou-migration-20261018/final-live-audit.json)。本次操作脚本是分阶段记录，不能作为一键迁移或回滚脚本重复执行。
