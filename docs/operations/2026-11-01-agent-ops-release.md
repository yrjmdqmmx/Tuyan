# Agent 运营只读接口发布 · 2026-11-01

Owner 授权发布本批 HTTP / MCP 接口。使用独立工作树 `codex/tuyan-ops-agent-20261101`，保留并整合先行的杭州发布保留策略提交；没有使用 Desktop main 或改动其他会话工作树。

## 发布与接入

- 应用源码：`051f222000f3a8c0745debc605421f198f1043a3`；[CI 41312747009](https://github.com/yrjmdqmmx/Tuyan/actions/runs/41312747009)。全部 CI job 成功；双站 `version.json` 均为该应用 SHA，双入口 readiness 均成功。
- CN 私有入口：`https://tuyansci.cn/api/agent-ops/mcp`，三个固定工具 `tuyan_ops_overview`、`tuyan_ops_failures`、`tuyan_ops_health`；同前缀提供三个 GET。
- 单独的服务凭据只赋予三个 read scope，Gateway 只保留摘要。凭据与可导入的 MCP 配置仅保存在 Owner Mac 的私密目录，仓库及本记录不收录凭据值。
- 宿主 Mac 自检入口：`python3 /Users/a1-6/.config/tuyan-ops/grokbot-20261101/tuyan-ops-client.py doctor`。接入文字在同目录 `CONNECT.txt`；客户端配置在私密的 `mcp-settings.json`。
- Grok Bot 自身尚需 Owner 把接入指令交给它，再由它注册工具并调用验证；不能把本轮 HTTP/MCP 协议验收表述为 Grok Bot 已完成连接。

## 生产变更范围

- CI 按既有流程发布 Core、Gateway、相关 worker 镜像与双站网页。版本化配置操作仅作用 CN Gateway 的 `TUYAN_OPS_*`、既有内部只读 token 与一个固定只读主机快照挂载。
- 只复用既有 `tuyan-observation.service` / timer，增加可选汇总文件输出，没有创建新监控。原 JSONL 历史采样继续保留。
- 本次操作使用 `/opt/paperbanana/operations/ops-agent-20261101/release.py`，没有覆盖共享生产发布器、CI receiver 或另一会话安装的保留策略。
- 未执行短信、真实模型调用、购买、计费或账户操作；新接口不返回用户明细、论文、提示词、错误原文、图片 URL 或模型凭据。

## 验收

- 2026-11-01 14:34:43 UTC：杭州部署 healthy；14:35:31 UTC：CN 私有入口配置 healthy，维护标记已释放。部署与配置回执均记录本次模型调用数为 0。
- 2026-11-01 14:35–14:37 UTC：HTTP overview/failures/health、MCP initialize/tools-list/三个 tools-call、宿主 Mac doctor 均通过。返回 no-store；账户、任务、失败、Core 进程/队列与新鲜主机快照可读。
- 匿名及无效凭据 401，写方法 405，浏览器 Origin 403，额外 action 参数 400。公开 `api.paperbanana.asia/mcp` 仍仅有科研知识工具；该旧网关的私有 ops 路径保持 404。
- 对同一固定 24 小时窗口和 30 天窗口，用 Mongo 独立 countDocuments 核对账户、每项任务状态及所有失败分类，全部一致。30 天窗口包含成功和失败的非空数据；24 小时无结束任务时成功率正确为 null。仅保留聚合证据，没有导出用户记录。
- Core 与旧 Gateway 环境摘要保持一致（仅忽略发布代码 SHA）；CN 只变更批准的四个 ops 相关环境字段及固定只读挂载。两网关短信关闭、Plus 执行/购买/后台核对关闭；Mongo 与四个 OpenAcad 容器的 ID、镜像和环境摘要保持不变。
- 原采样 timer 保持 active，主机快照挂载只读；共享 release.py 摘要不变。部署回执位于 `/opt/tuyan-entry/releases/ci-41312747009-1-051f222000f3/receipt.json`，配置回执位于 `/var/backups/hangzhou-ops-agent-20261101-051f2220/receipt.json`。
- 私密聚合验收证据保存在 Owner Mac `/Users/a1-6/.codex/visualizations/2026/11/01/tuyan-ops-agent-release/`，包括线上协议、独立数据库计数、双站版本与 readiness、doctor 输出。未将实际运营明细或凭据写进本记录。

## 数据限制

- 数据库已有权限不足以读取全局 `serverStatus`，health 对该分项返回 `available:false`；保留原权限，不为此扩大数据库授权。队列、进程、主机和业务聚合的可用性分别判断。
- 当前保留账户数不是 DAU 或历史累计注册量；任务按创建窗口与当前状态汇总，删除记录不计入，任务次数不是收入。成功率分母为空时为 null。
- 未分类历史错误进入 unknown；不可用、过期、未知和零值分开。多来源分别采样，不声称事务一致快照。
- 凭据到期为 `2027-01-30T13:45:50.939Z`；续期/撤销方法见 [接入说明](agent-read-access.md)。未另建提醒或监控。
