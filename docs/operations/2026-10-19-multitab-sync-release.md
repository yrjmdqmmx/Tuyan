# 多标签页同步发布验证

基线：1272fb2ef094732e9018d40e17e9cf903dfb9c40。独立发布树 codex/multitab-sync-release-20261019 仅提取同步修复；原工作树的个人资料、阶段内容、移动端样式等未发布变更保留原地。

## 发布前保护

两个域名真实账号先各自通过 UI 导出本机备份：CN 61 任务 / 64 执行 / 59 个非空分支草稿；Asia 62 任务 / 65 执行 / 59 个非空草稿，包括已有冲突副本，全部保留。私有备份存于本机 artifacts，不进 Git。

生产 Mongo 使用现有 mongodump --oplog 脚本备份，文件 paperbanana-mongo-20261019T111537Z.archive.gz，132670757 bytes。OSS 回读 SHA256：cff6e925e8d10e6cfe69f4c959230aecf8eef2e26555628a4eddaccb737468c7。

## 验证及运维修复

- Web 1027 / 1027，Gateway 176 项（普通套件跳过的隔离 Mongo 检查另跑），真实 MongoDB 8.0.16 副本集 14 / 14，Core 1,523 / 1,523、Benchmark 200 / 200、部署契约 32 / 32，类型检查和构建通过。
- Mongo 集成覆盖实际 HTTP 路由、真实事务 CAS、三客户端并发与独立来源、离线冲突及重启恢复、结果去重/配额、删除恢复、执行锁与账号生命周期。固定测试身份仅用于隔离集成；不冒充生产验收。
- CI 新增 run-workspace-sync.sh，使用唯一命名的临时副本集和随机数据库，结束仅清理自身容器和测试库。
- 旧域名的 edge 和杭州 relay 旧 1100k 限额阻断 workspace/results，浏览器表现为 CORS Failed to fetch；现只对 workspace 元数据 / results 精确路径配置 3m / 15m，保留应用既有 2 MB / 10 MB 限额、认证、Origin、所有权、配额及 revision CAS。其他路由仍为 1100k。
- 实际线上 nginx 配置在 deploy/hangzhou/nginx/api.paperbanana.asia-edge.conf 和 tuyan-legacy-hk-relay.conf 留档。宿主配置不由 CI 自动覆盖；两台先备份至 *.pre-multitab-20261019，再 nginx -t 并 reload。保留证书校验、来源 IP 限制和已有上游/模型路由。

## 生产发布与真实账号验收

已发布提交 `9142a4c3cddd2c8bf1faafc458503faffeed1307`。GitHub Actions [39244298735](https://github.com/yrjmdqmmx/Tuyan/actions/runs/39244298735) verify / images / deploy / pages 全部成功；杭州健康回执完成于 2026-10-19T11:52:52Z。两个公开 version.json 分别为 Hangzhou / GitHub Pages，同一 SHA。

使用用户现有真实账号，新开两个 tuyansci.cn 标签页和一个 www.paperbanana.asia 标签页。原有生产标签在本次工作开始前已关闭；本次先导出新开页面恢复的本机数据，再为加载新版执行一次刷新。后续所有同步验收未点击“重新同步”、刷新或导入。

| 场景 | 真实结果 |
| --- | --- |
| 不同任务 | A / B 各自编辑，第三个跨域页面自动出现两项；原页当前任务、输入焦点与光标位置保持。 |
| 同任务不同字段 | B 的重命名对话框打开期间，Asia 修改正文；保存名称后名称和补充正文自动合并，无冲突副本。 |
| 同内容离线冲突 | 通过 Chrome DevTools Network 仅将 Asia 标签设为 Offline；Asia 写低温方案，CN 写常温方案。恢复 No throttling 后自动保留一份确定 ID 的冲突副本，双方逐字核对。其他任务仍成功保存。 |
| 冲突处理 | 在状态面板保留测试副本为独立任务，双方正文均在，冲突提示自动消失；已有用户冲突副本未删除。 |
| 设置 | 16:9 比例自动出现在 Asia；再切专业模式，Asia 自动显示专业模式及对应 3 候选预设。 |
| 删除 / 恢复 | 仅删除专用 B 任务；Asia 保持原任务标题和位置，显示恢复入口。Asia 恢复后 CN 自动恢复，正文完整。 |
| 后台恢复 | CN 账户页滚动到 1766，B 新建“后台补齐”任务；CN 恢复前台后自动补齐，仍是账户页，scrollTop 仍为 1766。 |
| 真实生成 | G 使用已授权 TokenDance 默认 Qwen3.8 Flash / Seedream 5.0 Pro，提交一次。其他页自动显示执行中标记；规划过程在提交页可见，完成后 CN 与 Asia 都收到 PNG。Asia 图片实际加载为 1424 × 800。期间输入的下一次草稿完整保留。 |
| 无重复执行 | Mongo 只存在一条该任务执行，状态 succeeded；runId f70e95f3-6222-4d5c-951e-2c0acd54a7a9，jobId 1792411009091-osg6eqhn。 |

验收操作结束后，三标签页闲置观察 210 秒，两次只读 Mongo 审计完全一致，revision 均为 448，任务仍为 67 项，该生成仍只有一条执行；未出现空闲同步写入循环。证据：`account-idle-start.json`、`account-idle-end.json`、`idle-loop-check.json`。

## 数据保全核对

两域名验收后各导出 67 个任务。原来两域名合计 62 个唯一任务全部在；原草稿 text / caption / avoid / mode / settings / attachments 无变化，原执行 ID 和所有结果版本 ID 无丢失，备份中 data URL 图片逐版本 SHA256 一致。新增 5 项均为本次专用 A、B、G、离线冲突副本及后台补齐任务，验收后保留便于复核。

本机证据目录：`/Users/a1-6/.codex/artifacts/tuyan-multitab-release-20261019`。`preservation-report.json`、`browser-acceptance-observations.json`、`account-generation-check.json`、`deployment/deployment-receipt.json` 与 CI 日志可复核；含用户正文的 JSON 备份权限为 0600，不进入 Git。

截图：`production-offline-conflict.png`、`production-cross-domain-result.png`。断网模拟已恢复为 No throttling；只清理本轮临时测试 Mongo 容器。
