# 美团 LongCat 官方 API 审计（2026-09-22）

当前公开 API 文档仅列 `LongCat-2.0`，主模型/规划1、视觉0、生图0、精修0。品牌 LongCat，运营与研发方美团，国内官方直连。无密钥请求、真实推理、充值或部署。

OpenAI endpoint 为 `https://api.longcat.chat/openai/v1/chat/completions`；Anthropic endpoint 为 `https://api.longcat.chat/anthropic/v1/messages`，两者共用 LongCat Bearer Key。当前协议明文限定纯文本输入；不能根据旧 Omni 或研究模型推断视觉/图片生成支持。1,048,576 token 上下文、最大输出131,072；thinking.type 为 enabled/disabled。模型精确 ID 确认，固定权重版本未确认。

同步文本取 choices[0].message.content，SSE取delta.content，思考字段与正文分离；usage是用量证据而非核对后账单。Anthropic system另置顶层。FAQ遗留native路径与专页不一致，使用专页v1路径；概览模型列表简写缺前缀，使用专页openai/anthropic前缀。

原价/百万tokens：人民币输入5、缓存0.10、输出20；限时价2/0.04/8。美元原价0.75/0.015/2.95，限时0.30/0.006/1.20；优惠结束日期未知，结算为准。不能混用地区/币种权益。资源包30天，先于按量余额消耗，缓存命中不扣资源包；并非编码工具专用套餐。官方说明确失败401/403/429/500不扣费，HTTP200成功按实际tokens结算；网络中断时仍不知道服务器结果，不可盲目重发，未见幂等或结果查询接口。

2026-05-29官方明确停止6个服务：LongCat-Flash-Chat、LongCat-Flash-Thinking、LongCat-Flash-Thinking-2601、LongCat-Flash-Lite、LongCat-Flash-Omni-2603、LongCat-Flash-Chat-2602-Exp。全部保留历史ID并禁止新选。LongCat-2.0-Preview仅在历史内测日志出现，当前调用页不列，状态未知，不能自行宣布退役。正式2.0于2026-06-30发布。

来源：

- [models](https://longcat.chat/platform/docs/zh/api/models.html)
- [model](https://longcat.chat/platform/docs/zh/api/model.html)
- [chat](https://longcat.chat/platform/docs/zh/api/chat.html)
- [messages](https://longcat.chat/platform/docs/zh/api/messages.html)
- [overview](https://longcat.chat/platform/docs/zh/APIDocs.html)
- [changelog](https://longcat.chat/platform/docs/zh/ChangeLog.html)
- [price](https://longcat.chat/platform/docs/zh/Pricing/LongCat-2.0.html)
- [pay](https://longcat.chat/platform/docs/zh/api-pay-as-you-go)
- [pack](https://longcat.chat/platform/docs/zh/token-pack)
- [faq](https://longcat.chat/platform/docs/zh/FAQ.html)
