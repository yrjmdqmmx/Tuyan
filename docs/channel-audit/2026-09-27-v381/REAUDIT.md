# v3.8.1 复核与纠正（2026-09-27，未发布）

本次在 `5d32f1d` 上继续修改。目录升级为 `2026-09-27.v27`，静态身份 1,040 个：相对 v3.8.0 新增百灵 6 个、LongCat 2.5 1 个、Novita Ming 1 个；角色重叠为 7 个主模型、2 个识图模型、1 个生图模型。全部真实调用均未验证，无付费请求、充值、生产部署或微信发布。Web 与小程序共享目录均生成；原生小程序的通用 API UI 合并问题仍见 SYNC。

## 原结论为什么错，如何修正

| 原结论 / 原依据 | 复核发现 | 修正与实施 |
|---|---|---|
| LongCat 2.5 已宣布视觉，但 Chat 表只写 `content:string`，所以图片契约不足 | **漏查页面**：官网 HTML 的 `__VP_HASH_MAP__` 包含 `zh_image-video-understanding.md`，当前侧栏却不链接它。打开该页及其英文版、`.chat` 副本，均有精确图片块、Base64/URL、cURL/Python、Anthropic 示例及限额 | 原“缺少识图契约”结论不成立。现有目录只给 `main`，本地 `maxImages:0` 阻止图片；已补 `vision`、输入政策和 schema，复用现有识图/评审流程 |
| LongCat `.chat` 是旧域名，可能应替换 API host | `.ai` 与 `.chat` 当前 Chat HTML 本次 SHA-256 完全相同；`.ai` 官方总览仍指定 `https://api.longcat.chat` | 文档引用更新到 `.ai`，实际 API host 保留。部分 `.html` Chat 页面只列 2.0，不代表当前能力；`ImageVideoUnderstanding.html` 则有新视觉内容，不能一概按扩展名判新旧 |
| Cline 要取消 Supports Images，说明无法识图 | Cline 文档即便填 2.5 仍保留该指引，与专门视觉教程直接矛盾 | 以包含精确型号、请求和限制的视觉教程决定适配；记录冲突，不让旧配置指南覆盖专门 API 示例 |
| 百灵及 LongCat 生图/编辑没有“可执行契约” | 官方开源仓库有可运行本地推理代码；Ming-Image 官方仓库/ling-cookbook 还链接到 Novita 托管 API，蚂蚁数科 MaaS 也提供独立生图示例 | 原表述过宽。分别记录本地权重、百灵原厂端点、第三方 Novita、数科 MaaS。用户明确授权后新增独立 Novita 渠道；不把独立平台 Key 归入 `antling` |
| Ling-3.0-flash 没有 `max_tokens` 文档，因此省略 | API 参数表没写，但官方快速开始 Python 与 Node 示例使用该字段 | 仅对该精确 Flash ID 使用产品 8,192 输出预算；VL 仍用教程明确的 `max_completion_tokens`，不外推给其余 ID |

本轮没有另建视觉功能。既有路径为：目录 `roles` → 独立 `modelRoutes.vision` → `buildVisionImageInputs` / `assertVisionInputBudget` → `callVisionModelRaw` → `callAuditedTextChannel` → `buildAuditedTextBody`。此前主要缺口在目录准入和具体型号规则，不是缺少整个识图系统。

## LongCat 2.5：文字与图片理解均已适配

官方来源：[视觉理解（中文）](https://longcat.ai/platform/docs/zh/image-video-understanding)、[英文版](https://longcat.ai/platform/docs/image-video-understanding)、[.chat 副本](https://longcat.chat/platform/docs/zh/image-video-understanding)、[9 月 25 日 API 公告](https://longcat.ai/platform/docs/zh/change-log)、[接口总览](https://longcat.ai/platform/docs/zh/api-docs)、[Chat 参数](https://longcat.ai/platform/docs/zh/api/chat)、[Messages](https://longcat.ai/platform/docs/zh/api/messages)、[模型列表](https://longcat.ai/platform/docs/zh/api/models)、[模型详情](https://longcat.ai/platform/docs/zh/api/model)、[Cline 冲突页](https://longcat.ai/platform/docs/zh/cline)。

- 准确请求 ID `LongCat-2.5-Preview`；POST `https://api.longcat.chat/openai/v1/chat/completions`；`Authorization: Bearer <LongCat Key>`、JSON。文字 `content` 可以是字符串；图片为 `[{type:"text",text:…},{type:"image_url",image_url:{url:…}}]`。教程明确支持公网 HTTP(S) 或 Base64 data URL，响应文字在 `choices[0].message.content`。
- 图研沿用已有 OpenAI Chat 路径，读取冻结图片后发送 Base64 PNG/JPEG/WebP，不发送 `detail` 或视频块。主模型、识图模型各自使用显式 role 和独立密钥；可以与百灵/通用主模型、Novita/其他生图渠道组合。评审和分析后重绘都复用既有流程。
- 官方格式 PNG/JPG/JPEG/WebP/GIF；单图 ≤10 MB，原始比例 ≤200:1，单请求 **50 张（暂定）**。图研现有静态图片流程采用更低的 **3 张、4 MiB/张、合计 12 MiB、4096 边长、8 MP、完整 JSON 20 MB**；GIF/视频未纳入本轮。官方未列出整包数值、最大单边或像素数；产品额度不冒充官方上限，也不妨碍已确认协议的本地适配。
- 文字和视觉都支持 `thinking.type=enabled|disabled`；“默认”省略。`temperature` 0–1，`max_tokens` 1–131072，图研预算保持 8192。上下文 1M，模型详情示例 1,048,576；不从模型名称推导固定权重快照。
- 官方图像 token 估算为像素数 / 784，再加边界 token；这只是参考，真实 usage/费用以响应和账单为准，代码不把估算写成实付。公开限时价 CNY 2 / 0.04 / 8 或 USD 0.30 / 0.006 / 1.20 每百万输入/缓存输入/输出 token：[价格页](https://longcat.ai/platform/docs/zh/pricing/longcat-2.5)。结束时间和账号币种未验证。
- 保留 LongCat 2.0 主模型默认及历史身份。此前空的渠道识图默认现在填入唯一新增视觉 ID 2.5，以满足 Web/小程序目录对“有可选角色就须有有效默认”的校验；**不改用户已经保存的其他渠道识图选择**。
- [FAQ](https://longcat.ai/platform/docs/zh/faq)区分国内与国际账户认证/充值规则；国内充值/资源包需要认证，国际章节不要求强制身份认证但企业权益另有条件。未取得完整地域白名单，也未登录确认本用户 Key 的权限、限流或余额。

已查侧栏全部中文页面、正确英文页面（无 `/en/` 前缀）、隐藏页索引、示例 tab 对应公开 JS 的 rawMarkdown、模型与定价、工具教程、更新公告，以及 [官方 GitHub](https://github.com/meituan-longcat) / [官方模型组织](https://huggingface.co/meituan-longcat)。没有用搜索无结果判定不支持。网页检索工具对视觉教程报内部错误，普通 HTTPS GET 成功取得完整正文，中文/英文交叉一致；检索工具失败不是页面不存在。

## 百灵与 Ming：服务边界及四类能力

| 服务 | 文字 | 视觉理解 | 生图 | 图片编辑 / 分层 |
|---|---|---|---|---|
| 百灵原厂 `api.ant-ling.com` | 6 个精确 ID，已适配 | `Ling-3.0-flash-VL`，已适配 | 未确认此原厂 host 上的 Ming 请求 ID、图片端点和响应 | 同样缺原厂 ID、端点、输入编码/返回格式；不能从明闪权重推导 |
| inclusionAI 官方开源代码 | 各仓库分别支持 | Ming/Ming-UniVision 等本地能力 | Ming、Ming-Image、LLaDA-Image 有本地执行示例 | 明确区分编辑模型与 Ming-Image-Layer 分层模型；未在图研服务器部署权重 |
| **Novita**（本轮新增） | 本轮未收录其他 Novita 文本模型 | 本轮未收录其他 Novita 视觉模型 | `ming-image-0.1-design` **已适配** | `ming-image-0.1-design-layer` API 已确认，但未接入多图层结果工作流；不是普通单图指令编辑 |
| 蚂蚁数科 MaaS（另一账号/Key） | 公共文档和目录存在 | 目录有 Ling VL | `ming-image-0.1-design` 有明确 SDK 生图示例，见下文；本轮未新增第二个 MaaS 渠道 | Layer 有目录，但 API 调试仍套用无图片的 Chat 示例，不能据此实现分层传输 |

百灵六 ID 与价格保留 [README](README.md) 的逐项表；新增证据是 [快速开始](https://developer.ant-ling.com/zh-CN/docs/getting-started/quickstart/) 中 Flash 的 `max_tokens` 示例。主/视觉都使用 Bearer JSON `https://api.ant-ling.com/v1/chat/completions`；VL 为 `image_url` 内联 PNG/JPEG、官方 40 张和 32 MB 限制，产品仍为 3 张等更低额度。其他 ID 不继承 VL 或 Flash 的未明确参数。个人支付宝绑定、开通和代扣条件见 [准备工作](https://developer.ant-ling.com/zh-CN/docs/getting-started/prerequisites/)。没有为本次核查登录、开通或扣款。

此前遗漏的官方代码与链接链：

- [Ming](https://github.com/inclusionAI/Ming)：明闪系列本地多模态理解/生成/编辑 cookbook。Ming-flash-omni 2.0 repo 日期为 2026-02-11，百灵模型页时间线写 2026.01；记录差异，均不当作托管 API 上线证据。
- [Ming-UniVision](https://github.com/inclusionAI/Ming-UniVision)、[LLaDA-Image](https://github.com/inclusionAI/LLaDA-Image)：本地视觉或生成/编辑实现，不映射成百灵原厂 API ID。
- [Ming-Image](https://github.com/inclusionAI/Ming-Image)：`inclusionAI/Ming-Image-0.1-Design` 与 `inclusionAI/Ming-Image-0.1-Layer` 是权重身份；后一模型分解 RGBA 图层。仓库给出约 80 GiB BF16 GPU 的本地要求，并链接 [ling-ui-design](https://github.com/inclusionAI/ling-cookbook/tree/main/resources/recommended-skills/ling-ui-design)、[image-to-editable-ppt](https://github.com/inclusionAI/ling-cookbook/tree/main/resources/recommended-skills/image-to-editable-ppt) 托管示例。
- 这些官方 cookbook 推荐的是 **Novita**；本轮只把代码作为协议证据阅读，没有安装/执行其中 skill、依赖或推理脚本。仓库固定版本及页面哈希见 `reaudit-sources.json`。

## Novita Ming：本次实际接入

[生图 API](https://docs.novita.ai/api-reference/model-apis-ming-image-txt2img)、[分层 API](https://docs.novita.ai/api-reference/model-apis-ming-image-layer)、[公共模型/价格](https://novita.ai/models?type=images)。API 文档 2026-09-22 修改；网页检索工具失败后，完整 HTML、Markdown 与浏览器正文均成功读取。`llms.txt` 未列 Ming，但网页导航存在，所以没有用索引缺项否定 API。

- 新渠道 `novita`，放在国外聚合组，研发方仍为蚂蚁集团。独立 Bearer Key；POST `https://api.novita.ai/openai/v1/images/generations`。请求准确 ID 为小写 `ming-image-0.1-design`，不得发送权重组织前缀或响应中的 `…StressTest` 名称。
- JSON 必填 `model`、`prompt`；官方 `output_format=png|jpeg`，`response_format=b64_json|url`（URL 24 小时），`size=auto|WxH`，1K 及以上，示例含 1024×1024/2048×2048；`watermark` 默认 false。本次产品只开放两种明确方图尺寸，输出 PNG/Base64，省略 `n`、`enable_thinking` 和未选的可选字段。
- 读取 `data[0].b64_json` 或备用 URL；`output_format`、`size`、`usage`、`model`、`id` **在响应根层**。记录真实响应的 resolvedModel 和 token usage，公开价/估算/实付保持分离。返回多个图层时拒绝伪装成单图成功。
- durable checkpoint 先于唯一 POST；请求失联/5xx/截断响应阻止重发；已保存结果恢复只读取 Base64 或下载，下载不带 API Key。记录失败后保留已完成结果并可恢复记录。没有可确认的查询接口，不用 response id 猜轮询 URL。
- 官方 cookbook 的 `enable_thinking=true`、WebP 选项与 Novita 精确 API 参考不同，优先采用 Novita API 文档：不发送思考开关，不接受 WebP 输出。也不接收原图、参考图、遮罩或假定支持编辑。产品“分析后重绘”仍由独立识图模型先分析，再走纯文本生图。
- 公共目录同时显示输入/输出 $0/Mt 与 $1/Mt；未明确促销结束时间和账号适用条件，记录为“公开展示、条件未核准”，**不称永久免费**。本轮未读取账户余额、Key 模型访问策略或 IP 策略；没有找到完整 Ming 地域名单、精确 prompt 长度和整包上限。它们是实服验收待查项，不阻塞已确认协议的本地实现。

分层接口虽也位于 `/images/edits`，但不是普通图片编辑：multipart 的 `image[]`、`model=ming-image-0.1-design-layer`、`prompt`；多条 `data[]` 分别为图层，`revised_prompt` 带画布和区域布局 JSON。官方 cookbook 的 `image` 单字段与平台文档 `image[]` 也不一致。现有图研单图精修不会保存全套图层/布局，故仅记录此 API，未将它当作一般编辑型号上架；并非“没有可执行 API”。

蚂蚁数科 MaaS 另行核实了 [Design 详情与 API 调试](https://maas.antdigital.com/models/modelservice-1788918605869001081)、[Layer 详情](https://maas.antdigital.com/models/modelservice-1788923727244001352)、[文档 iframe](https://maas.antdigital.com/dt-maas-docs/intro)：Design 给 `OpenAI(base_url="https://maas-api.antdigital.com/v1").images.generate(model="ming-image-0.1-design",prompt=…)` 并读 `resp.data[0].url`；其模型描述明确**自动尺寸、显式 size/比例会拒绝**，与 Novita 不同，不能共用凭据或参数。本轮按用户明确选择新增 Novita，不再增加另一套 MaaS 接入；不将 MaaS 的可执行生图示例写成“缺少 API”。Layer 调试页仍是通用 Chat 模板，缺该渠道图层输入编码和布局响应说明。MaaS API Key 文档还区分 Token Plan 与按量账户，实际权益和价格未验证。

## LongCat 生图 / 编辑：准确的未接入原因

[LongCat-Image 官方仓库](https://github.com/meituan-longcat/LongCat-Image)明确提供 `meituan-longcat/LongCat-Image`、`LongCat-Image-Dev`、`LongCat-Image-Edit`、`LongCat-Image-Edit-Turbo` 本地推理；[LongCat-Next](https://github.com/meituan-longcat/LongCat-Next)与[推理框架](https://github.com/meituan-longcat/LongCat-Next-inference)也含视觉与生成能力。这些是各自的权重/本地接口，不是 LongCat 2.5 托管 API 型号。

当前原厂平台的生图/编辑仍缺：**可调用模型 ID、图片生成/编辑 endpoint、原图/参考图/遮罩字段及编码、图片结果或任务查询响应**。公开 API 导航/隐藏页面索引、模型/详情、更新日志、上述官方仓库未提供将这些图像权重绑定到原厂托管 API 的说明。Image repo 中 `prompt_rewrite_api.py` 调用 DeepSeek 改写提示词，不是 LongCat 托管生图。故原厂渠道暂不上架；没有将“支持看图”外推成“支持生图/编辑”，也没有把本地代码写成不可执行。

## 验证状态与剩余边界

| 能力 | 目录已收录 | 代码已适配 | 真实调用已验证 |
|---|---|---|---|
| 百灵 6 文本 ID / VL 识图 | 是 | 是 | 否 |
| LongCat 2.5 文本 / 思考 / **现有识图流程** | 是，main+vision | 是，OpenAI image_url + 内联图片 | 否 |
| Novita Ming Design 文生图 | 是，独立 image 渠道 | 是，单次提交和恢复 | 否 |
| Novita Ming Layer | 审计记录，不进入单图选择器 | 未做图层结果工作流 | 否 |
| 蚂蚁数科 MaaS Design | 审计记录，未新增该渠道 | 否；本次指定 Novita 接入 | 否 |
| 百灵原厂 / LongCat 原厂生图编辑 | 不冒用权重 ID | 托管字段缺口如上 | 否 |

本地验证涵盖完整 Core、Web、小程序源码、三角色混用、既有识图评审、图片政策/参数、生成物、出口 ACL、桌面与 390/320px。最新数量与日志摘要见 [交付记录](../../releases/2026-09-27-tuyan-v3.8.1.md)。公开来源清单含抓取时间、哈希及不可访问/空壳/截断情况，见 [复核来源](reaudit-sources.json)；不提交网页全文或凭据。生产 Novita 出口 ACL 仅修改源码，尚未部署，发布时必须同步该配置。
