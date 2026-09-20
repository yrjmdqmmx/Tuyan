# 通用 API 连接级模型目录

核对日期：2026-09-20。以下是官方公开文档与本地模拟验证，不代表任何账号的真实模型调用已成功；本轮生成调用为 0。

## 连接与模型分别配置

`universalApiCheck` 新增可选 `connection`。读取目录无需 `modelId`、能力、图片限额或输出尺寸；选中 ID 之后，实际调用仍走原有严格 `normalizeUniversalRoute`，能力和限额由用户按服务文档明确声明，目录条目不会自动授予能力。

```json
{
  "action": "universalApiCheck",
  "check": "catalog",
  "connection": {
    "version": 1,
    "connectionId": "my-connection",
    "protocol": "openai-chat",
    "baseUrl": "https://api.openai.com/v1",
    "auth": "bearer",
    "catalogFormat": "auto"
  },
  "selectedModelId": "optional-exact-id",
  "apiKeys": { "custom": "原有按连接 ID 组织的绑定密钥信封 JSON 字符串" }
}
```

`auth` 缺省仍按所选协议给出默认值。`catalogFormat` 缺省为 `auto`；可选 `openai`、`anthropic`、`gemini` 或 `none`。`none` 保留手动型号填写且不发送目录请求。`selectedModelId` 可省略或为空，仅用于结果中的可见性对照，不影响目录获取。

原 `route` 请求继续兼容并保留严格模型配置验证；不会通过目录接口放宽生成入口。连接模式的配置检查返回 `connection-valid`，旧路线配置检查保持 `configuration-valid`。

## 已核对目录适配器

| 格式 | 官方目录与响应 | 分页方式 | `auto` 允许的连接 |
| --- | --- | --- | --- |
| OpenAI | `GET https://api.openai.com/v1/models`；`data[].id` | 文档列出完整列表，无分页参数 | 准确 `/v1`、OpenAI 三种协议、Bearer |
| Anthropic | `GET https://api.anthropic.com/v1/models`；`data[].id`，`anthropic-version: 2023-06-01` | `limit=1000`；响应 `has_more`、`last_id`，下一页 `after_id` | 准确 `/v1`、Anthropic Messages、x-api-key |
| Gemini | `GET https://generativelanguage.googleapis.com/v1beta/models`；`models[].name`，保留 `models/` 前缀 | `pageSize=1000`；`nextPageToken` → `pageToken` | 准确 `/v1beta`、两种 Gemini 协议、x-goog-api-key |
| OpenRouter | `GET https://openrouter.ai/api/v1/models`；`data[].id` | 本适配器使用文档中的非分页列表 | 准确 `/api/v1`、OpenAI 三种协议、Bearer |

已核对官方来源：[OpenAI List models](https://developers.openai.com/api/reference/resources/models/methods/list)、[Claude List Models](https://platform.claude.com/docs/en/api/models/list)、[Gemini models.list](https://ai.google.dev/api/models)、[OpenRouter List models](https://openrouter.ai/docs/api/api-reference/models/list-all-models-and-their-properties)。OpenRouter 的该接口是服务目录，不能据此宣称账号已获得调用权限；目录适配与生成协议支持各自校验。

`auto` 对 host、路径、协议和鉴权方式进行准确匹配，不接受后缀伪装或未知路径。其他兼容服务、不同路径和未核对版本必须由用户根据服务文档明确选择目录格式；选择表示确认 Base URL 下的 `/models` 路径、对应 JSON 格式和分页约定。不能仅因生成接口兼容 Chat Completions，就假设该服务必有 OpenAI 模型目录。DashScope 等没有已核对映射的连接也保留手动填写，若服务方确有上述目录约定，可显式选择。

## 返回状态与隔离

结果固定包含 `verified:false`、`inferenceVerified:false`、`fetchedAt`、`complete`、`truncated`、`models:[{id}]`、`warnings:[{row,code}]`、`selectedModelVisible` 和中文 `message`。无选中 ID 时 `selectedModelVisible=null`。此字段仅反映本次有效结果中是否出现准确 ID；`false` 不是无权限或型号不存在的结论。

- `catalog-visible`：列表完整且全部行有效。
- `catalog-partial`：仍有可用行，但部分记录被隔离、分页中断或达到读取上限。
- `catalog-empty`：目录结构有效、完整读完且为空。
- `catalog-invalid`：已返回的所有记录均未通过校验。
- `unsupported`：没有明确可用的目录适配器，未发送目录 GET。

`complete` 只表示分页完整结束，不表示所有行都有效。`truncated` 表示达到页数、记录数或累计字节边界时还有后续页面。单条 null、缺失 ID、非法类型、控制字符、路径穿越、已提供却异常的协议元数据会逐行隔离。跨页相同 ID 的所有记录都隔离，包括其中一条还含有其他字段错误的情况。记录级告警用从 0 开始的全目录行号；分页告警行号为 `-1`。返回条目仅有 ID，绝不根据名称猜能力或复制未经确认的上游能力值。

错误 JSON、错误列表字段、非法分页结构、循环游标都不会被当成成功空目录。第一批记录尚未获得时返回失败；已有记录后失败则保留已验证行并返回不完整状态、`page_fetch_failed` 警告和可选 `error`。失败信息不包含原始响应、地址、游标、API Key 或上游文本。

目录整体失败采用 `{code: HTTP状态数值, error: 中文原因, catalogError: 脱敏结构, requestState:'not_sent', inferenceVerified:false}`。权限、频率、超时、网络、服务故障、大小和格式问题有目录专用 `CATALOG_*` 错误码与建议。这里 `not_sent` 指未发送推理请求；目录 GET 自身可能已发送。目录失败不会进入任务执行/可能扣费的文案。

## 安全与资源边界

目录仍要求受认证的 Tuyan 请求、准确连接 ID、HTTPS 地址、协议、鉴权绑定密钥。凭据不进入 URL、模型记录、日志或错误文本。目录格式是本地元数据；改变目录格式不改变密钥的地址/协议/鉴权绑定。

仅 GET，无请求体。每页 4 MiB、累计 16 MiB、最多 10 页 / 10,000 行，共享 30 秒截止信号；没有自动重试。分页游标作为不透明值通过 `URLSearchParams` 编码，最长 2048 字符。传输层只允许 `/models` 上的 `limit` / `after_id` 或 `pageSize` / `pageToken` 组合，拒绝重复字段、非法大小与混合约定；推理 URL 仍禁止查询参数。

公网 HTTPS、固定 DNS、私网/混合 DNS 拒绝、重定向拒绝、官方出口精确主机白名单全部保留。分页不会采用服务方返回的任意下一页 URL，因此不会将密钥发往另一个地址。异常情况下只保留当前读到的数据，用户可继续手动填写 ID。

## 本地验证

`apps/paperbanana-api/tests/universal-catalog.test.ts` 覆盖空型号连接、严格推理校验、官方/未知来源、逐行与跨页重复隔离、Anthropic/Gemini 分页、循环与非法游标、途中失败、页数/条数/字节边界、私网/重定向/查询约束、绑定密钥、目录专用中文错误，以及受认证的实际 Laf/Core 桥接。现有七协议生成、恢复与传输回归继续执行。

测试使用模拟响应与本地测试请求；另外仅只读获取一次 OpenRouter 公共 `/api/v1/models`（无需凭据），返回 446 个 ID。当前适配器解析为 446 条有效记录、0 条警告。未调用任何生成端点，未验证受密钥保护服务的目录权限。

2026-09-20 本地结果：Core 全套 645/645 通过，`pnpm check` 与 `pnpm build` 通过，`node scripts/sync-model-catalog.mjs --check` 无漂移，`git diff --check` 通过。该记录仅覆盖此实现时点；部署、Web 浏览器验收与真实服务权益须分别记录。
