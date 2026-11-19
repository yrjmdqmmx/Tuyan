# 图研被动事件（新留言 / 捕获的服务端异常）

状态：**代码已就绪，默认关闭，未上线**。未设置 `TUYAN_OPS_EVENTS_ENABLED=true` 时网关不发任何外部请求。打开需要 Owner 批准的生产环境变更（见文末）。

## 做什么

`auth-gateway` 在两种情况下向一个外部 HTTPS 地址发送带 HMAC 签名的 POST：

| 事件 `type` | 触发点 | 级别 |
| --- | --- | --- |
| `feedback.created` | `submitFeedback` 被 Core 成功写入（HTTP 200 且 `code: 0`） | `info` |
| `error.captured` | 网关最终错误处理器返回 5xx（未处理异常、Core 不可达等） | `error` |

发送是“尽力而为”：不阻塞、不改变用户请求结果；失败只记一条不含内容的警告日志。漏掉的事件用只读窗口补齐（见下）。

## 负载（只含这些字段）

```json
{ "schemaVersion": 1, "id": "<uuid>", "type": "feedback.created", "level": "info",
  "occurredAt": "2026-11-18T12:00:00.000Z", "source": "gateway", "ref": "feedback-xxxx" }
```

```json
{ "schemaVersion": 1, "id": "<uuid>", "type": "error.captured", "level": "error",
  "occurredAt": "2026-11-18T12:00:00.000Z", "source": "gateway",
  "status": 502, "code": "REQUEST_FAILED", "area": "paperbanana-api.createJob",
  "fingerprint": "<16 hex>", "suppressedSincePrevious": 3 }
```

- 永不包含留言正文、联系方式、用户 ID/邮箱、IP、UA、请求路径参数、错误堆栈或任何密钥。
- `area` 只取首个路径段、`/api/<路由名>` 或旧接口的 action 名；`code` 只接受 `A-Z0-9_` 形式，否则为 `REQUEST_FAILED`。
- 同一留言 id、同一错误指纹 10 分钟内只发一次；全局每 10 分钟最多 30 条。被合并/丢弃的条数记在下一条事件的 `suppressedSincePrevious`。
- 网络错误、5xx、429 最多重试 3 次（约 1s、4s 退避加抖动）；其他 4xx 不重试；单次超时 5 秒；不跟随重定向。

## 签名

请求头：

- `x-tuyan-event-id`: 与负载 `id` 相同，用于去重
- `x-tuyan-event-timestamp`: Unix 秒
- `x-tuyan-event-signature`: `v1=` + hex(HMAC-SHA256(`TUYAN_OPS_EVENTS_SECRET`, `<timestamp>.<原始请求体>`))

接收方应：用常量时间比较校验签名；拒绝与当前时间相差超过 300 秒的时间戳；按 `id` 去重。参考实现：`apps/auth-gateway/src/ops-events.js` 的 `verifyOpsEvent`。

## 只读补数窗口

`GET /api/agent-ops/feedback?from=<ISO>&to=<ISO>`（MCP 工具 `tuyan_ops_feedback`），使用现有 agent-ops 服务凭据，需新增 `feedback:read` 权限。返回窗口内留言的 `id`、`createdAt`、`category`、`platform`、`status`，按时间升序、最多 100 条；`truncated=true` 时用 `nextFrom` 作为下一次的 `from`（同一毫秒的记录可能重复，按 id 去重）。不返回正文或联系方式；正文在管理后台查看。现有凭据不会自动获得此权限。

## 接到 Grok Bot 例行任务（由 Owner 创建，不在本 PR 内）

1. 在 Grok Bot 创建一个“Webhook 触发”的例行任务，拿到它的触发 URL。若该 URL 自带令牌，按密钥对待：只放进服务器 600 权限的环境文件，不进仓库、聊天或日志。
2. 例行任务收到的请求体就是上面的 JSON。若该触发器不能校验 HMAC，例行任务应把事件只当作“唤醒提示”，提醒前先用只读窗口（`tuyan_ops_feedback` / `tuyan_ops_health` / `tuyan_ops_failures`）核实，防止伪造事件触发误报。
3. 建议路由：`error.captured` 全天提醒；`feedback.created` 夜间静默、白天汇总。

## 打开步骤（需 Owner 批准，均为生产变更）

1. 生成一个仅用于此用途、≥32 字符的随机密钥（不得与其他密钥相同，网关启动时会校验）。
2. 在杭州 `cn-gateway` 的环境中设置 `TUYAN_OPS_EVENTS_ENABLED=true`、`TUYAN_OPS_EVENTS_URL=<https 触发 URL>`、`TUYAN_OPS_EVENTS_SECRET=<密钥>`，可选 `TUYAN_OPS_EVENTS_SOURCE=hz`。`deploy/hangzhou/release.py` 的环境补丁已接受这四项（仅限 `cn-gateway`，URL 须 https 且不含账号，密钥须为 32–128 位 `A-Za-z0-9_-`）；用它执行仍是生产发布，需 Owner 批准。
3. 若需要补数窗口：为 Grok Bot 的 agent-ops 凭据增加 `feedback:read`（`release.py` 已允许该权限）。
4. 验证：提交一条测试留言，确认例行任务收到 `feedback.created`，且请求体不含正文。确认之前不得宣称告警已上线。
