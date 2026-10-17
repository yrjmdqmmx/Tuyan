# 2026-10-16 单型号规格与渠道下架续核（本地 v34）

本轮在独立工作树 `tuyan-v400-workflow-20261009` 更新 Web/Core。没有真实模型调用、提交、推送或部署，小程序继续暂停。每条记录按 **渠道＋精确调用 ID** 计数，同名模型在不同渠道是不同记录。

## 规格结果

当前目录含 32 个渠道、3,460 条记录，包含已适配、历史停用以及只发现但未适配的型号。与本轮开始时的动态目录快照比较：

| 字段 | 开始时 | 本轮后 | 新增 |
| --- | ---: | ---: | ---: |
| 已有完整输入/输出模态依据 | 1,406 | 1,863 | 457 |
| 数值上下文窗口 | 831 | 1,070 | 239 |
| 生图或编辑提示词上限 | 146 | 269 | 123 |

951 条记录至少一个展示字段变化。新增核查配置含 357 组规格，绑定 702 个精确渠道 ID、351 个来源 URL；这些是配置覆盖数量，不等于新增 702 个独立模型。全部目录记录已有来源链接，但 **链接存在不代表规格齐全或调用可用**。

- [逐条字段变化](2026-10-16-followup-changes.csv)
- [当前完整展示值](2026-10-16-followup-coverage.csv)
- [待确认字段与原因](2026-10-16-followup-remaining.csv)
- [25 组既有版本问题在当前目录中的 44 条渠道记录](2026-10-16-followup-versions.csv)
- [精确来源及证据索引](2026-10-16-specific-page-sources.json)

当前仍有 1,893 条目录记录含待确认字段，其中 **171 条属于当前可选型号**；其余主要为仅发现、未适配的目录资产。另有图片型号专页/API 没有公开总上下文，显示“官方未公布”；其中有明确提示词限制的显示生图/编辑上限，未公开的保持未公开，不把示例或请求额度当成上限。

## 重点补证与版本处理

| 精确型号或服务 | 本轮处理 | 直接来源 |
| --- | --- | --- |
| Claude Opus 5.5 | 文本、图像输入，文本输出，约 1M 上下文 | [型号专页](https://platform.claude.com/docs/en/models/opus-5-5/overview) |
| OpenAI GPT Image 2.5 Sunburst | 文本、图像输入，图像输出；未公开总窗口，生图/编辑提示词各 32,000 字符 | [型号专页](https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst)、[图像接口](https://developers.openai.com/api/reference/resources/images/methods/generate) |
| 百炼 Qwen Image 2.0 | 当前同步生成/编辑 API 为 1,300 tokens；不沿用旧异步接口的字符上限 | [型号专页](https://help.aliyun.com/zh/model-studio/qwen-image-2-0)、[生图 API](https://help.aliyun.com/zh/model-studio/qwen-image-api)、[编辑 API](https://help.aliyun.com/zh/model-studio/qwen-image-edit-api) |
| MiniMax image-01 / image-01-live | 文本、图像输入，图像输出；生图/编辑各 1,500 字符。live 的依据限中国区 | [中国区生图](https://platform.minimax.cn/docs/api-reference/image-generation-t2i)、[中国区编辑](https://platform.minimax.cn/docs/api-reference/image-generation-i2i) |
| Stability SD3.5 Flash | 生图/编辑各 10,000 字符；API 的模型枚举说明明确包含 Flash | [对应生成/编辑端点](https://platform.stability.ai/docs/api-reference#tag/Generate/paths/~1v2beta~1stable-image~1generate~1sd3/post) |
| DeepSeek 直连 V4 Pro / Flash 旧 ID | 按官方映射展示当前服务版本；请求 ID 保留，第三方托管身份不继承直连重定向 | [官方当前 API 型号](https://api-docs.deepseek.com/quick_start/pricing)、[Pro 0813 模型卡](https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro-0813) |
| 小米直连 MiMo V2.5 / Pro | 分别注明实际服务 V2.6 Flash / Pro，及旧别名停止日期；不向其他渠道传播此映射 | [Flash 专页](https://mimo.mi.com/models/en-US/mimo-v2.6-flash)、[Pro 专页](https://mimo.mi.com/models/en-US/mimo-v2.6-pro)、[旧别名公告](https://mimo.mi.com/docs/en-US/updates/deprecate) |
| TokenDance Hy3 / Hy3 Preview | 官方渠道专页明确文本输入/输出、约 256K | [Hy3](https://tokendance.space/models/hy3)、[Preview](https://tokendance.space/models/hy3-preview) |
| TokenDance Seed 2.0 Code / Seed 2.1 Pro | 文本、图像、视频输入，文本输出，渠道约 256K；不推断 Seed 2.1 Pro 对应哪个原厂日期版本 | [Code](https://tokendance.space/models/seed-2.0-code)、[Pro](https://tokendance.space/models/seed-2.1-pro) |
| TokenDance DeepSeek V4 Flash 0731 | 渠道专页明确文本输入/输出、约 1M | [精确服务页](https://tokendance.space/models/deepseek-v4-flash-0731) |
| TokenDance UniFuncs S3 / S3 Pro / U3 / U3 Pro | 四个精确服务页均列文本输入/输出、约 200K；不使用累计研究预算推断窗口 | [S3](https://tokendance.space/models/unifuncs-s3)、[S3 Pro](https://tokendance.space/models/unifuncs-s3-pro)、[U3](https://tokendance.space/models/unifuncs-u3)、[U3 Pro](https://tokendance.space/models/unifuncs-u3-pro) |

TokenDance 的模型详情是动态页面。本轮实际渲染并保存其型号、服务商、模态、窗口和精确 API 示例；仅下载 HTML 外壳不足以取得这些字段。原始来源和页面文本留存于本机 `/Users/a1-6/.codex/artifacts/tuyan-model-followup-20261016/sources/`，核查配置保存文件名及 SHA-256。

Qwen3 Omni 使用 thinker 文本配置的 65,536 容量，未把音频解码器的 8,000 或示例请求值误作总窗口。Fireworks MiniMax M3 的介绍与规格表对图像输入有冲突，保留部分确认状态。GPT Pro 后缀、CogEvol 服务变体、Gemini Preview、Seed 日期不明的别名继续逐条留痕；不因名称相似、网页跳转或字段齐全而宣称版本映射已确认。

## 已下架与不支持型号

- 本轮新增暂停 **Runware `deepseek:v4@flash`**：完整托管索引无此精确 ID，原型号页及 schema 均返回 404。记录保留供旧配置识别，选择及服务端调用均拒绝；不影响其他渠道的 DeepSeek。[完整托管索引](https://runware.ai/docs/models/index.json)
- 继续执行已有明确停用日期：当前目录 82 条已到期，72 条预告日期尚未到期。到期前后由服务端时间判断，不把“已弃用”直接当成“已停用”。另有历史排除、未适配等不同原因，均在清单分别注明，不能统称官方下架。
- 新增 OpenAI 的 8 个精确型号停用日期：5 个 GPT-4 系列快照为 2027-01-14，GPT-5.3-Codex、GPT-5.4-Nano、GPT-5.1 为 2027-04-01。当前仍可选，届时自动禁用，不自动替用户换模型。[官方停用公告](https://developers.openai.com/api/docs/deprecations)
- OpenAI 账户目录的 `shutdown_date` 现在也会进入该账户的可用性展示；账户读取结果不进入公开缓存。[模型目录字段](https://developers.openai.com/api/reference/resources/models/methods/list)
- fal 列表缺失的 3 个已接入 ID，经 `endpoint_id` 精确查询全部找回，**没有误下架**：Seedream V5 Lite Edit、FLUX.3 Klein Base、ImagineArt 2.0 Preview。列表游标不保证快照一致，缺项必须复查。[官方精确查询契约](https://fal.ai/docs/platform-apis/v1/models)

[逐型号生命周期及停用依据](2026-10-16-lifecycle-followup.csv) · [32 渠道核查范围](2026-10-16-lifecycle-followup.json)

动态同步仅使用已知范围的完整公开目录：Runware 托管目录、Novita LLM 目录，以及经过缺项精确查询的 fal。Novita LLM 目录不能停用图片型号；Stability v1 引擎列表不能停用 v2。账户、地区、私有目录缺项以及 401/403/404/429、分页未完成、空结果均不构成全渠道下架依据。旧条目被禁用后，服务端在发送推理请求前拦截；上次完整目录在暂时刷新失败时保留。

最终读取中 fal 刷新遇到 429，保留当天先前的 1,524 项完整快照及已读新页，尊重 Retry-After。3 个列表缺项已用独立精确查询验证。TokenDance 的 4 个既有缺项继续按渠道暂停。没有各渠道账户/管理凭据，不能宣称那些账户目录已完成真实权限核验。

## 实现与验证

- 展示新增可选 `sourceScope` 和 `resolvedModel`，精确页可覆盖旧的待确认字段；渠道上下文优先于原厂参考值，保留部分模态标记及提示词单位。型号 API ID、付费额度、角色和调用适配不因规格补证而扩大。
- 修复 fal schema 将回显的 `prompt` 当作文本输出的问题；图片输出中的种子、提示词元数据不再产生文本输出图标。
- 模型卡继续只显示型号、模态图标、上下文或提示词限制，以及来源。沿用已有厂商 Logo，不恢复冗余详情。
- Core 目录、停用、版本、调用隔离定向测试通过；另有 Core 目录相关 28 项回归通过。最终动态目录传输测试 6/6、目录与停用测试 25/25，包含精确查询的 Retry-After 保留。Web 规格和目录定向测试 29/29，通过类型检查、Web 构建及目录生成器无漂移检查。构建保留已有大包警告；重叠测试集合不相加。
- Chrome 桌面 1440px / 手机 390px 共 20 项检查通过，覆盖模态图标、来源、别名、提示词限制及已停用型号不能选择。测试仅使用公开元数据及本地桩响应，不代表真实调用或生产验收。
