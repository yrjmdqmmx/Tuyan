# 多标签页同步发布验证

基线：1272fb2ef094732e9018d40e17e9cf903dfb9c40。独立发布树 codex/multitab-sync-release-20261019 仅提取同步修复；原工作树的个人资料、阶段内容、移动端样式等未发布变更保留原地。

## 发布前保护

两个域名真实账号先各自通过 UI 导出本机备份：CN 61 任务 / 64 执行 / 59 个非空分支草稿；Asia 62 任务 / 65 执行 / 59 个非空草稿，包括已有冲突副本，全部保留。私有备份存于本机 artifacts，不进 Git。

生产 Mongo 使用现有 mongodump --oplog 脚本备份，文件 paperbanana-mongo-20261019T111537Z.archive.gz，132670757 bytes。OSS 回读 SHA256：cff6e925e8d10e6cfe69f4c959230aecf8eef2e26555628a4eddaccb737468c7。

## 验证及运维修复

- Web 1027 / 1027，Gateway 176 项（普通套件跳过的隔离 Mongo 检查另跑），真实 MongoDB 8.0.16 副本集 14 / 14，部署契约 32 / 32，Web build 通过。
- Mongo 集成覆盖实际 HTTP 路由、真实事务 CAS、三客户端并发与独立来源、离线冲突及重启恢复、结果去重/配额、删除恢复、执行锁与账号生命周期。固定测试身份仅用于隔离集成；不冒充生产验收。
- CI 新增 run-workspace-sync.sh，使用唯一命名的临时副本集和随机数据库，结束仅清理自身容器和测试库。
- 旧域名的 edge 和杭州 relay 旧 1100k 限额阻断 workspace/results，浏览器表现为 CORS Failed to fetch；现只对 workspace 元数据 / results 精确路径配置 3m / 15m，保留应用既有 2 MB / 10 MB 限额、认证、Origin、所有权、配额及 revision CAS。其他路由仍为 1100k。
- 实际线上 nginx 配置在 deploy/hangzhou/nginx/api.paperbanana.asia-edge.conf 和 tuyan-legacy-hk-relay.conf 留档。宿主配置不由 CI 自动覆盖；两台先备份至 *.pre-multitab-20261019，再 nginx -t 并 reload。保留证书校验、来源 IP 限制和已有上游/模型路由。

## 待完成

配套发布、真实账号多标签页/跨域/断网重连验收、现有内容前后校验仍进行中。
