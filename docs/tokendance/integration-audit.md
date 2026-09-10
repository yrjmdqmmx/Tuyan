# TokenDance 接入核对与实施设计

核对日期 2026-09-09；主线 `27aa954d168e7e0ed05d6b2251965161f8d66e30`；独立分支 `codex/tokendance-integration-20260909`。本文件记录设计和证据边界，完成状态另见[验证记录](validation.md)，接口与运维见[实现说明](implementation.md)。

## 资料范围

已完整读取 [索引](https://tokendance.space/llms.txt)、[全文](https://tokendance.space/llms-full.txt)，枚举索引及其关联的 68 份独立 Markdown 文档，逐份获取并与全文规范化对照。67 份一致；docs-updates 的动态表与全文展开表不同，已补读独立内容。来源、字节数、SHA256、访问状态见 [read-manifest.json](read-manifest.json)。范围包含授权、PKCE、Key 管理、钱包、支付、归因、分润说明、所有公开模型协议、路由/降级、限流、异步回调、错误处理及各客户端实践。另读渲染后的多协议、Ark 图片接口页、产品方 pricing/integration 页面，以及全部 93 个实时型号的详情和快速开始。

模型依据 [公开实时 API](https://tokendance.space/gateway/v1/models)、[模型列表及详情](https://tokendance.space/models) 与协议。公开 API 不含模态；详情页 architecture 用于补齐。登录态中的 portal 模型目录只用于本轮只读交叉核对，不成为产品依赖。完整清单见 [model-coverage.md](model-coverage.md)，结构化版本见 [catalog.json](../../config/tokendance/catalog.json)。

Seedream 的 TokenDance 文档引用的[官方使用说明](https://console.volcengine.com/ark/region:cn-beijing/docs/82379/2582774?lang=zh)及[图片 API 参数](https://ark.volcengine.com/region:cn-beijing/docs/82379/1541523?lang=zh)已补读。Pro：1K/1.5K/2K、921600–4624220 像素、最多 10 张参考图；Lite：2K/3K/4K、3686400–16777216 像素、最多 14 张参考图；宽高比均 1:16–16:1。均支持 PNG/JPEG、URL/base64 输入及输出、同一 Ark 端点的文生图和图片编辑。图研选择单张 PNG 输出；Pro 不发送 stream/sequential 字段，Lite 明确禁用组图。默认和固定比例按各自合法尺寸计算，不采用 Lite OpenAI 通用示例中不合法的 1024x1024。

## 接入决策

- 62 个独立型号：60 主模型/提示词优化、27 视觉（与主模型重叠）、2 生成及直接精修。31 个不映射现有功能，逐项列出；包含 18 视频、6 音频、2 向量、3 搜索/阅读、2 专用 OCR。OCR 无法作为现有通用视觉评审角色，需要单独文档识别能力，不能凭 Chat 协议放开。
- 所有在公开 API 中且已审核适用的旧版、快照和免费型号保留。deepseek-chat-v3-0324 和 deepseek-ocr-2 的下线公告与实时目录冲突，保留事实及服务状态待验；前者仍接入。deepseek-v4.1-flash、qwen3.6-plus 描述与模态字段冲突，只开放已确认文本能力。
- 文本/视觉统一选择各型号明确支持的 Chat Completions 协议，默认流式读取并只取文本增量，保留实际返回 model、request id。不凭“OpenAI 兼容”发送 temperature、reasoning_effort、response_format、工具参数。现有结构化任务继续提示词约束和解析；不保证所有小模型的输出质量。
- 图像单独 Ark 适配。供应商自动路由只在用户选定的精确模型内工作，不发送跨模型 fallback；不伪造实际供应商。返回有模型/请求 ID 就记录，否则明确未知。若未来开放供应商固定选择，必须配合 only 和 allow_fallbacks:false。

## 授权、账户与支付

- 所有 OAuth app_url 和出站 X-App-URL 固定 `https://www.paperbanana.asia/`，禁止去掉末尾斜线或让客户端覆盖。
- 图研登录用户发起 S256 PKCE，服务端保存短期 flow，绑定不可变用户 ID、一次性 state、43–128 字符 verifier；交换成功后只在服务端加密保存 Key。授权不替代图研登录，无 client secret / refresh token。
- code 最长 10 分钟且一次性；交换响应丢失后要求重新授权。取消/过期/重复回调均有独立状态，不能把其他用户的回调绑定到当前用户。断开删除图研保存的 Key；远端撤销需用户到 TokenDance Key 管理操作，公开文档没有远端撤销接口。
- 钱包余额单位为微元（1 元 = 1,000,000）；Key 额度是另一个限制，公开 API 未提供单个 Key 的额度查询，界面显示无法查询而非假装无限。
- 支付 amount 为整数人民币元 1–100000。桌面用 payment_url 二维码，移动端只在用户点击时打开 alipay_url；每 3 秒用服务端受控 status_url 查询，以 paid 确认到账，不以返回页面或余额变化代替。支付创建无已公开幂等字段，超时不自动重建订单。
- TokenDance-Recovery-Action 的 top_up_balance、reauthorize_api_key、api_key_quota 分开处理；429 保留重试时间。图研任务采用服务端加密执行凭据和持久化模型步骤结果，恢复读取完成步骤；上游已发出但结果不确定的请求锁定为人工核对，防止重复扣费。
- 用户调用 Key 与产品方管理 Key 分离。产品后台显示的分润价目端点需要产品方账号 Key；只在管理员界面读取，并明确是预估单位收益。实际收益/结算查询、远端撤销、Key 剩余额度无公开契约，列为待确认，不抓取私有接口实现。

## 架构缺口与实施顺序

现有 Web/小程序把渠道 Key 暂存在客户端并随任务发送，Gateway 注入用户身份，Node Core 执行旧 Laf 处理器，Mongo 保存任务/阶段，OSS 保存图片。当前注册表含 677 静态型号和 OpenRouter 动态目录；失败任务没有可避免重复扣费的持久化模型步骤。

1. 建立 TokenDance canonical snapshot、审核 profile 和更新差异机制，生成 Core/Web/小程序目录，扩展合法尺寸档位。
2. 独立文本/视觉/Ark 图片适配与契约测试，保持精准型号、归因、错误信息及调用记录。
3. Core 加密连接服务、Gateway 登录与身份边界、PKCE 与支付状态；关闭缺少必要服务配置的入口。
4. 任务执行快照、模型结果检查点、按原任务恢复和不确定请求阻断，涵盖混合渠道已完成步骤。
5. Web 与小程序授权/连接/钱包/充值/恢复 UI，共享 DTO；站长分润入口；更新 SYNC。
6. 目录/全型号契约、登录回调、幂等/恢复/金额/支付/归因测试；构建、类型检查、桌面和窄屏验收。真实供应商及支付必须单独记录。

## 当前访问与待确认

产品方后台已有浏览器登录，App URL 可核对；不读取或导出浏览器凭据。尚未配置本次服务端加密主密钥、独立产品管理 Key、用于真实调用的用户授权 Key；没有确定的真实支付/模型消费测试额度。这些不阻塞本地实现和测试桩验证，但阻塞真实收费联调。当前生产版本、SSH 权限、CI 和小程序平台状态不沿用交接作为新鲜事实，发布前需重验。

恢复已读取 protocol、code profile、START_HERE、manifest、handoff、ledger、brief、access、secret-decisions、verification，并核对本仓库 AGENTS/SYNC。ledger 与 handoff 一致：上一轮完成 Image 2.5 v16 跨端目录、#185/#186 发布及 #187 证据记录；生产执行 SHA 为 83bb83b，当前主线 27aa 为后续文档。#183 是独立未合并工作，不纳入本轮。原目录是同一项目但旧主线，已保留原改动，在新隔离工作区实施。交接 lineage `lin-8d844715eaed7a33`，parent `20260909-150926-codex-tuyan-image25-v16-production-release-01a08449-e269-7641-98d8-`。
