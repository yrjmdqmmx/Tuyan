# Tuyan v3.8.1 渠道核对（2026-09-27，待发布）

此次只读取公开文档，未使用渠道凭据、未调用推理或充值。目录 v26 新增 7 个静态身份，总数 1,039；新增主模型 7 个、视觉角色 1 个（角色重叠）。OpenRouter 动态目录不计入此数。

## 蚂蚁百灵

入口 [官网](https://www.ant-ling.com/zh/) → [开发文档](https://developer.ant-ling.com/zh-CN/docs/) → [API 控制台](https://chat.ant-ling.com/)。内部渠道 `antling`，位于国内官方直连组；不是聚合平台的 inclusionAI 模型别名。

[OpenAI 契约](https://developer.ant-ling.com/zh-CN/docs/api-reference/openai/)列出的精确 ID 中，本次接入 `Ling-3.0-flash-VL`、`Ling-3.0-flash`、`Ling-3.0-tiny`、`Ling-2.6-1T`、`Ling-2.6-flash`、`Ring-2.6-1T`。均支持主模型；只有 VL 开放视觉角色。请求为 POST `https://api.ant-ling.com/v1/chat/completions`，JSON、Bearer Token。另有 Anthropic 兼容接口，本次原生渠道采用 OpenAI 路径，不混用两套思考字段。

仅 `Ling-3.0-flash` 开放 `thinking.type=enabled|disabled`；`Ring-2.6-1T` 开放 `reasoning.effort=high|xhigh`。图研的“默认”省略字段；其他精确 ID 的可配置思考参数仍未确认。通用 OpenAI 页未列明 `max_tokens`，因此不臆加；VL 教程有 `max_completion_tokens`，图研使用 8,192 的输出预算。同步调用 [官方限制](https://developer.ant-ling.com/zh-CN/docs/api-reference/queries-per-second/) 为 QPS 2 / 90 秒；没有用真实账号测吞吐或质量。并发用户可能遇到渠道限流，失败不自动重发收费请求。

[VL 图片契约](https://developer.ant-ling.com/zh-CN/docs/tutorials/multimodal-understanding/)：Base64 PNG/JPEG、最多 40 张，单图不超过 12,845,056 像素，Base64 字符串及完整请求 32 MB。图研采用更低的平台额度：3 张、4 MiB/张、8 MP、完整处理包 20 MB；最终协议包另受 32 MB 限制。转换后发送内联图片，不向该渠道发送对象存储 URL，不附加未确认的 `detail`。

[模型说明](https://developer.ant-ling.com/zh-CN/docs/models/ling/)：VL、Flash 的模型上下文为 256K；Ling-2.6-1T 权重可到 1M，但官方 API 明确为 256K。Tiny 的上下文表为空；其他型号未补猜精确 API 限额。模型能力说明不是承诺当前账号获得全部上下文额度。

[定价](https://developer.ant-ling.com/zh-CN/docs/models/price/)按人民币/百万 token：

| 型号 | 输入 / 缓存输入 / 输出原价 | 本次可见限时价 |
|---|---|---|
| Ling-3.0-flash-VL | 0.50 / 0.10 / 1.50 | 0.14 / 0.028 / 0.42 |
| Ling-3.0-flash | 0.50 / 0.10 / 1.50 | 0.125 / 0.025 / 0.375 |
| Ling-2.6-1T、Ring-2.6-1T | 4.50 / 0.90 / 18.00 | 未列 |
| Ling-2.6-flash | 0.60 / 0.12 / 1.80 | 未列 |
| Ling-3.0-tiny | 未列，记录 null | 未列 |

折扣截止时间未知；公开价、响应 usage、账单分开记录。未知价格不等于免费。

[准备工作](https://developer.ant-ling.com/zh-CN/docs/getting-started/prerequisites/)要求绑定个人支付宝并开通百灵服务；签署代扣后可能转按量计费。企业蚂蚁数科平台是另一服务。未找到完整可用国家/地域清单，不声称全球可用；本次账号权限、地区与账单均未验证。

[API 日志](https://developer.ant-ling.com/zh-CN/docs/getting-started/changelog/)用于 API 上架日期，不用权重发布日期代替。医疗专用 `AntAngelMed` 虽有 API ID，暂不作为通用科研绘图模型。临近退役的 Ling-2.5-1T / Ring-1T 本轮不新增，依据[下架页](https://developer.ant-ling.com/zh-CN/docs/models/deprecation/)，没有移除聚合平台的历史身份。

[Ming 页面](https://developer.ant-ling.com/zh-CN/docs/models/ming/)描述多模态生成/编辑与开放权重；截至本次核对，未取得普通百灵 API 的生图/编辑精确 ID、请求及响应契约。因此这两类能力未上架，不能用网页体验或开放权重证明可调用 API。

## 美团 LongCat

[当前更新日志](https://longcat.chat/platform/docs/zh/change-log)于 2026-09-25 公告 `LongCat-2.5-Preview`。本次新增此精确 ID，保留 `LongCat-2.0`、原默认及历史退役记录。Preview 状态保留，未找到不可变权重快照绑定，不将名称中的 2.5 当成固定快照。

[当前 Chat API](https://longcat.chat/platform/docs/zh/api/chat)：POST `https://api.longcat.chat/openai/v1/chat/completions`，Bearer、JSON、`thinking.type=enabled|disabled`，默认选项仍省略；`temperature` 范围 0–1。[快速开始](https://longcat.chat/platform/docs/zh/)说明上下文 1M、最大输出 128K；[模型详情](https://longcat.chat/platform/docs/zh/api/model)示例为 1,048,576 token，Chat `max_tokens` 最大 131,072。图研保持 8,192 输出预算，没有增加默认消耗。还提供 [Anthropic Messages](https://longcat.chat/platform/docs/zh/api/messages)，本次沿用已有 OpenAI 路径。

公告确认视觉理解，但当前 Chat 的 `content` 仍描述为 string，图片块、图片格式/数量/像素/请求限额未给出；当前文档没有可执行生图/编辑契约。因此代码只接入文本与思考参数，视觉列为“已公告，适配待明确请求契约”，不能说模型没有视觉能力。旧 `.html` 文档仍只列 2.0，本次采用无 `.html` 的当前站点路径。

[2.5 公开限时价](https://longcat.chat/platform/docs/zh/pricing/longcat-2.5)：每百万 token 输入/缓存输入/输出为 CNY 2 / 0.04 / 8，或 USD 0.30 / 0.006 / 1.20。未列原价、活动截止时间；不沿用 2.0 原价，不推断账号币种、地域或账单。

## 证据状态

| 内容 | 目录已收录 | 代码已适配 | 真实调用已验证 |
|---|---|---|---|
| 百灵六个文本 ID | 是 | 是 | 否 |
| Ling-3.0-flash-VL 图片理解 | 是 | 是（Base64） | 否 |
| 百灵生图/编辑 | 否，精确 API 契约待确认 | 否 | 否 |
| LongCat-2.5-Preview 文本/思考 | 是 | 是 | 否 |
| LongCat 2.5 视觉 | 公告已核对，未进视觉选择器 | 等待完整接口字段与图片限制 | 否 |
| LongCat 生图/编辑 | 无已确认公开 API | 否 | 否 |

公开页面读取快照的 SHA-256 见 `sources.json`（不包含网页全文、凭据或账户数据）。契约数据见 `config/channel-audit/v381-contracts.json`；模拟验证不是上游真实性能/价格验收。
