# 图研运营数据：Agent 只读接入

状态：本地实现已验收，Owner 已授权本批生产发布，部署验收进行中。基于发布分支 `fd3959ba` 的独立工作树，公开科研知识 `/mcp` 保持原契约。

## 接入方式

部署并启用后，首选远程 Streamable HTTP MCP：`https://tuyansci.cn/api/agent-ops/mcp`。同一份查询也提供普通 HTTP。可用 [OpenAPI 文档](agent-ops.openapi.json) 导入支持 OpenAPI 的 Agent。

| MCP 工具 | HTTP GET | 权限 |
| --- | --- | --- |
| `tuyan_ops_overview` | `/api/agent-ops/overview` | `overview:read` |
| `tuyan_ops_failures` | `/api/agent-ops/failures` | `failures:read` |
| `tuyan_ops_health` | `/api/agent-ops/health` | `health:read` |

MCP 客户端设置：类型 `streamable-http`、上述 URL、私密请求头 `Authorization: Bearer <独立 Agent 凭据>`。这是服务凭据模式，没有 OAuth 登录/发现服务；客户端必须支持私密自定义请求头。若 Grokbot 的 MCP 配置只接受 OAuth，使用同表 HTTP 工具。具体 Grokbot 配置格式仍需在其客户端验证，不能假定 JSON 配置键名兼容所有客户端。

只通过 HTTPS 和 Authorization 头传凭据，不放进 URL、提示词、仓库、浏览器页面或聊天记录。不使用图研管理员 Cookie、云平台密钥或数据库密码。接口拒绝带 Origin 的浏览器请求，无 CORS 放行。

请求示例（不含凭据）：

```http
GET /api/agent-ops/overview?from=2026-10-31T16%3A00%3A00.000Z&to=2026-11-01T16%3A00%3A00.000Z
Authorization: Bearer <由客户端凭据库注入>
```

该例是北京时间 11 月 1 日整天，须在当天结束后查询；不接受未来结束时间。MCP 使用参数 `{"from":"2026-10-31T16:00:00.000Z","to":"2026-11-01T16:00:00.000Z"}`。也可传 `{}` 查询默认最近 24 小时（结束时间向下取整到分钟）。时间范围为 `[from,to)`、UTC ISO 格式、最多 90 天，两项须同时提供。health 不接受参数。无任意 SQL/Mongo、action、搜索、用户明细或分页入口。

## 数据口径

- `sampledAt`、每个来源的采样时间和 `window` 必须随报告保留。最多缓存 15 秒；多数据库分别采样，不是事务一致快照。
- `users.retainedAccounts` 是当前仍保留的账户数，`registrationsInWindow` 按账户 `createdAt` 计数。不是日活、累计历史注册量或会话数。
- `tasks` 统计时间窗内创建且仍保留的 Core job，状态取当前值。删除的 job、只在工作区存在的记录不计入。成功率为 succeeded / (succeeded + failed)，无结束任务时为 null。未分类状态进入 unknown。
- `failures` 仅统计当前失败、且在时间窗内创建的保留任务；按固定 category/stage/requestState 汇总，旧数据和缺少分类进入 unknown。失败原因原文、论文、提示词、邮箱、用户 ID、图片 URL、模型凭据均不返回。
- 收入、退款、实际计费、DAU、留存率本版不提供；不能从任务次数、登录状态或余额推断。
- `available:false` 代表不可用，不能视为零。成功返回 HTTP 200 也可能有部分来源不可用。
- health 仅投影 Core 进程、数据库队列和既有杭州主机采样；不声称所有容器/OSS/外部供应商就绪。Core 采样超过 60 秒、主机超过 5 分钟分别标记 stale；主机没有配置时明确 not_configured。磁盘返回 total/available 与可用比例，低于 10% 标记 lowDiskSpace；这不是包含预留块口径差异的 `df` Used% 复刻。

给 Agent 的工作指令可用：

> 查询图研运营数据时只使用 tuyan_ops_* 工具。报告北京时间范围、来源采样时间与缺失项。未知、不可用、过期和零值必须区分；遵循响应中的 definitions，不把保留账户数当日活，不把任务次数当收入。只做读取与分析，不尝试调用写接口或模型。

## 凭据与部署配置（本轮未执行）

1. 经生产发布授权后，在私密目录生成新的随机服务凭据：

   ```sh
   node scripts/create-ops-agent-credential.mjs /absolute/new-private-directory grokbot
   ```

   脚本仅离线生成两份 0600 文件，目录 0700；拒绝覆盖已有目录，不输出密钥。`agent-secret.json` 的 token 只导入 Grokbot 凭据库，`gateway-token-record.json` 保存摘要、权限、到期时间（默认 90 天）。不要将生成文件放进仓库。

2. Gateway 的受限环境配置：

   | 环境变量 | 用途 |
   | --- | --- |
   | `TUYAN_OPS_AGENT_ENABLED=true` | 显式启用，缺省关闭/404 |
   | `TUYAN_OPS_AGENT_TOKENS` | `gateway-token-record.json` 的完整单行 JSON；最多 8 个不同 ID/摘要，可删减 scopes |
   | `PAPERBANANA_OPERATIONS_TOKEN` | 与 Core 对应的独立内部只读凭据，至少 32 字符；绝不能给 Agent |
   | `TUYAN_OPS_HOST_SNAPSHOT_FILE` | 可选，容器内 `/run/tuyan-ops-host/hz-latest.json` |

   Core 沿用 `PAPERBANANA_OPERATIONS_ENABLED=true` 和内部 `PAPERBANANA_OPERATIONS_TOKEN`，新版本增加两个固定聚合 GET。拒绝用 Gateway/admin/Auth secret 作为 Agent 凭据或复用为内部只读凭据。`release.py` 只允许 CN Gateway 使用 `TUYAN_OPS_*` 配置；快照挂载固定为 `/var/lib/tuyan-observation/agent:/run/tuyan-ops-host:ro`，不允许任意宿主目录。保留原发布锁、五镜像比较与配置回滚。

3. 主机容量可选接入：复用已有 `observe-node.py` 服务/定时器，不新增监控。升级脚本后，在其既有采样命令加 `--agent-host-dir <专用目录> --agent-host-uid <Gateway运行UID>`。专用目录需事先建立并允许该 UID 读取/遍历；快照以 0600、该 UID 所有权原子替换。需由有权设置文件属主的既有采样进程执行。仅把这个专用目录以只读方式挂到 Gateway 的 `/run/tuyan-ops-host`；不要挂原始 JSONL、Docker socket 或全量运维目录。挂目录而非单文件，避免原子替换后容器仍读旧 inode。采样仍写原有历史记录，不删除数据。不加新参数时采样器行为不变。

4. 确认 Nginx 将该路径只转发至 Gateway，Core 内部接口不对公网开放。选择一个 Gateway 作为 Agent 入口即可；不因有两个站点而重复建监控。每个 Gateway 实例每凭据 60 次/分钟、聚合并发上限 4、Core 查询 5 秒、网络 7 秒、MCP 请求 16 KiB、Core 响应 128 KiB。两个独立网关的配额不共享；这些读查询仍会消耗数据库资源，建议常规报表按需调用，勿高频轮询。

5. 发布后用专用凭据验证 initialize、tools/list 和三个只读调用，确认实际来源与时间正确；检查无权限/过期凭据为 401、越权为 403、HTTP 写方法为 405、公共 `/mcp` 无私有工具。这些生产/Grokbot 验收当前待做。

撤销：从 `TUYAN_OPS_AGENT_TOKENS` 移除该记录并重启/滚动更新对应 Gateway；每次请求重新校验到期时间。轮换可短期保留两个不同 ID/摘要，客户端更新后撤销旧记录。紧急关闭设 enabled=false 并重启 Gateway。不会撤销普通用户登录，也不会删除业务数据。

## 本地验证

2026-11-01：Gateway 全量 270 通过 / 1 既有跳过，Core 全量 1593 通过 / 1 既有跳过，采样脚本 4 项通过；Core 类型检查、构建通过。离线凭据生成/0600 权限/禁止覆盖及 OpenAPI JSON 检查通过；仅使用一次性测试凭据，未创建生产密钥。测试生成的无关渲染产物移出隔离工作树，历史证据文件保持原样。

安全/协议测试使用模拟账户、模拟聚合数据和本地 HTTP 服务，不读取生产业务数据，不调用模型、短信或支付。覆盖禁用默认值、令牌隔离/期限/scope、只读方法、参数注入、数据投影、失败/空数据/未知分类、限流、MCP 并发、公开 MCP 隔离、响应体上限、禁止跳转、主机快照保密/过期与原子替换。Core 类型检查和构建已通过；真实 Mongo 数据口径及真实客户端连接仍需发布前/后授权验收。

## 宿主 Mac 一键查询

`scripts/tuyan-ops-client.py` 可复制到用户私密目录，与 `agent-secret.json` 相邻。执行 `python3 <私密目录>/tuyan-ops-client.py doctor` 可验证三个 HTTP 入口；其他命令为 `overview`、`failures`、`health`，前两项支持 `--from` / `--to`。程序使用系统 CA 验证 TLS、禁止重定向、固定 HTTPS 目标、限制响应大小；不会打印凭据或把凭据放进进程参数。

Grokbot 如果在隔离虚拟机运行，需要使用宿主 Mac 的终端工具调用该路径；不要误把虚拟机的同名路径视为宿主文件。也可通过其私密凭据导入机制连接远程 MCP。实际连接仍应由客户端运行 doctor 或 tools/list 验证。
