# TokenHub、MiMo、Runware 全目录审计与本地实现

核查日期：2026-09-22，Asia/Shanghai。基于隔离分支 `codex/refine-controls-runware-tokenhub-20260922`，变更前为 `8bc6e246`。本轮没有充值、付费推理、push 或部署。目录与模拟测试不证明账号权益或科研图质量。

## 交付范围

[491 项逐型号对照表](official-directory.md) · [含价格、尺寸、图片和恢复字段的 CSV](official-directory.csv) · [验证记录](validation.md) · [其他国内候选建议](../../refinement/2026-09-22-domestic-channel-research.md)。角色可重叠，不将角色数相加当作型号数。

| API 服务运营方 | 目录核对条目 | 图研当前型号 | 本轮新增 | 主模型/规划 | 视觉理解 | 生图/精修 |
|---|---:|---:|---:|---:|---:|---:|
| 腾讯 TokenHub | 127 | 41 | 38 | 32 | 14 | 8 |
| 小米 MiMo | 9 | 4 | 2 | 4 | 3 | 0 |
| Runware | 355 | 138 | 135 | 23 | 22 | 112 |

这 183 项的准确渠道 ID、角色、尺寸与输入约束进入目录、界面、后端调用及测试，状态均为 **适配链路已完成但真实调用未验证**。其余 308 项在逐项表说明范围或缺口，没有伪装成可用选项。Runware 的 355 项是官方精选文档目录；该平台另有社区和用户上传模型，本报告不声称穷尽它们。

已确认下线或暂不可用的型号从 Web 和小程序可选列表、搜索结果、厂商分组隐藏。旧选择仍保留在当前配置/历史中，并显示不可用原因、阻止提交；不删除历史、替换渠道或代换型号。`verificationState=catalog` 本身不等于不可用，不能误隐藏所有尚未实测的型号。

## 官方现状与取舍

- **MiMo**：保留 V2.6 Pro/Flash 主模型与识图，并补仍在服务期内的 V2.5、V2.5 Pro。V2.5 Pro 是文本型号，不能用于识图；两者 2026-10-21 10:00（北京时间）到期隐藏。V2.6 Pro UltraSpeed 需联系商务获取定制权限，未开放成普通可选型号。4 个 ASR/TTS 相关项目属范围外。精确模型 ID 不等同不可变权重版本，未确认快照仍标“版本待确认”。[模型目录](https://mimo.mi.com/docs/zh-CN/quick-start/summary/model)、[更新](https://mimo.mi.com/docs/zh-CN/updates/model)、[API](https://mimo.mi.com/docs/zh-CN/api/chat/openai-api)。
- **TokenHub**：与型号详情取并集，补 HY4 Preview、HY 视觉、DeepSeek 托管/原厂直供的独立 ID、GLM、Kimi、MiniMax、MiMo 文本与视觉；图片补 HY 3.5 Preview、WAND Vega 三档、Vidu Q2、Seedream 5 Pro/Lite，保留 `hy-image-v3`。`hy-image-v3.0` 已停用，不能与 `hy-image-v3` 合并。已下线的 Qwen3.5 Flash/Plus 与音视频旧项不进入选择器。GLM 5/5.1/5 Turbo、5V Turbo 分别按官方 10 月 8 日/30 日下线日执行。翻译专用、角色扮演、音视频、3D、向量条目逐项排除。[总目录](https://cloud.tencent.com/document/product/1823/130051)、[HY](https://cloud.tencent.com/document/product/1823/132252)、[DeepSeek](https://cloud.tencent.com/document/product/1823/132248)、[GLM](https://cloud.tencent.com/document/product/1823/132061)、[Kimi](https://cloud.tencent.com/document/product/1823/132232)、[MiniMax](https://cloud.tencent.com/document/product/1823/132246)、[视觉](https://cloud.tencent.com/document/product/1823/136956)。
- **Runware**：逐一读取 355 项的详情和官方 JSON Schema，以请求 `model.const` 为调用 ID，记录哈希。覆盖最新 GPT Image 2.5、Qwen Image 3.0、Seedream、FLUX、Gemini、Claude、GPT、DeepSeek、GLM、MiniMax 等，保留原有 3 项。确认的 future deactivation 保留时间戳，到期拒绝：Nano Banana 10 月 2 日、GPT Image 1 10 月 23 日、Grok Image Quality 11 月 2 日、GPT Image 1.5/Mini 12 月 1 日（均按官方 UTC 时间）。没有把 `deprecated` 的未来日期误写成今天已下线。[官方目录](https://runware.ai/docs/models)、[更新记录](https://runware.ai/docs/changelog)。

尚未开放但可能有科研增量的专用工具包括：Qwen Image Layered、Ideogram Layerize Text、多种擦除/扩边、BRIA Fibo Edit Tools、Recraft Styles、SVG/vectorize、预处理/超分。当前单张自然语言精修契约不能正确表达它们的输入角色或保留多资产输出，故没有把接口返回的一张像素图冒充完整功能。Recraft Styles 仅提取参考风格，不保证保留原图；BRIA Tools 需要操作选择和专属字段。OpenAI CLIP 条目的 caption schema 与对比编码描述冲突，待确认。各型号的缺失环节均在全表中；这部分工作没有完成，也未加入可用列表。

## 实际协议与能力

| 路线 | 本轮实际字段与行为 | 限制/恢复 |
|---|---|---|
| MiMo Chat | Bearer、`/v1/chat/completions`；图片为 `image_url`，按量普通 Key；`max_completion_tokens` 与 thinking 参数按型号 | 统一端点；100 RPM、10M TPM 的公开常规限流，账号实际配额待确认。当前图研识图保守最多 3 张；不声称生图 |
| TokenHub 文本/视觉 | Bearer Chat；Kimi K3 Base64 输入及专属 token 字段、Kimi reasoning、GLM 思考限制、MiniMax reasoning_split 分别适配 | 广州入口；新加坡需独立 Key 和目录复核，未启用同目录跨区猜测。同步结果未知停止，不重发 |
| HY Image 3.5 Preview | `/v1/wand/hunyuan-image/v35-generation`，messages 图文输入，读取 SSE 中 image URL 和 usage | 官方最多 20 图；图研最多总 9 图。256–8192 像素、总面积限制由型号尺寸契约处理；未核验 mask/结构化故不开启 |
| Seedream Pro/Lite | `/v1/wand/si-image/generation`，`images` Data URI、精确 WxH、PNG/URL；Lite 关闭序列多图 | 官方 Pro 10 / Lite 14 图；图研总 9。Pro/Lite 像素面积区间分开。原生分层输出未实现，不宣称可编辑矢量 |
| Vidu Q2 | `/v1/wand/vidu-image/generation` + `tasks/{id}`；aspect_ratio、1080p/2K/4K 分开字段 | 总 7 图，短边至少 128、比例 1:4–4:1；返回 creations URL。UI 1K 对应 1080p，实际原生尺寸见 CSV |
| WAND Vega Lite/Flash/Pro | `/v1/wand/vega-images/generations`，原图与辅助图上传后提供可访问 URL，`input[].content[]`；`tasks/{id}` 轮询 | Lite 总 3，Flash/Pro 总 6。固定尺寸表。已确认 task_id 只 GET 恢复；丢失确认且无任务号停止 |
| Runware 文本/识图 | 原生 textInference；3 个 caption 型号只给识图角色、单图；systemPrompt 仅在型号正式支持时使用 | Grok 4.3 没有独立 system 字段，系统要求作为用户内容前缀传递，优先级隔离不等价；不宣称无差别兼容 |
| Runware 生图/精修 | 按型号 schema 的 seedImage / image / referenceImages / maskImage，实际像素和约束校验；PNG、单结果 | UUID 在计费 POST 前持久化；超时只 getResponse，429/5xx 查询退避。不重放提交；mask 与多图组合单独核对 |

腾讯图片来源：[HY 3.5](https://cloud.tencent.com/document/product/1823/135745)、[Vidu](https://cloud.tencent.com/document/product/1823/135746)、[Seedream](https://cloud.tencent.com/document/product/1823/136609)、[WAND](https://cloud.tencent.com/document/product/1823/137203)。Runware 每项 schema 链接与输入/输出、白改黑留遮罩证据见 CSV；[认证](https://runware.ai/docs/platform/authentication)、[限流](https://runware.ai/docs/platform/rate-limits)、[任务轮询](https://runware.ai/docs/platform/task-polling)。Runware 当前文档采用共享队列、无统一硬性 RPM，建议通常 2–4 并发，上游型号容量仍会触发 429/503/504；不能将建议并发数当作账号保证。实际地域准入和每个型号授权待确认。

精修输入仍采用上一轮的共享契约：原图与辅助图冻结无损 PNG，不自动缩小、裁剪或截断；4 MiB/图、4096 单边、8 MP，以及编码后总请求 20 MB 限制。辅助图上限为 min(产品 8, 模型总图数−1)，原图占一个名额；遮罩单独按具体型号。切换保留图片、用途、说明、指令、旧尺寸和比例，不兼容时阻止提交。上游模型的内部采样不在图研控制范围内。

本轮没有增加通用“JSON 编辑”包装。已有 fal BRIA 原生 structured_instruction 表单与结果元数据保留；Runware/Tencent 未明确核验的结构化能力不开放。遮罩/像素图层与独立矢量文字、箭头对象不是同一种产物。

## 价格与数据边界

公开价格保存在各型号 contract / CSV，注明 CNY 或 USD、每百万 token 或示例条件；金额未知为 null / 待确认。运行记录分别保存 `publicPrice`、`estimatedCost`（本轮未做用户侧报价估算）、渠道 `reportedCost/usage`、`invoiceCost`（始终未核账）。不把 token 用量或 Runware 返回 cost 当作已核对账单。

| 例子 | 公开价格条件 | 不能直接推出的结论 |
|---|---|---|
| MiMo V2.6 Pro / Flash | CNY/百万 token：输入 3 / 1，命中缓存 .025 / .02，输出 6 / 2；USD 与 Batch 另表 | 普通 Key 与 Token Plan 权益不同；未测科研任务实际 token 消耗 |
| TokenHub HY3 | 广州 CNY/百万 token：输入 1、缓存 .25、输出 4 | 不代入 HY4、视觉或图像模型 |
| HY Image v3 | 图片输出 token 按当前 TokenHub 后付费表；公开示例 20k token≈¥0.20 | 不外推 HY3.5 Preview，后者公开精确单价待确认 |
| WAND Vega Lite | 输出 10 CNY/百万 token，1K/2K/4K 分别 16200/18000/22500 token | Flash/Pro 的 token 档位与多参考附加量不同 |
| Seedream Pro/Lite | 当前 TokenHub token 表；Pro 区分面积/辅助图，Lite 22000 输出 token | 不使用旧混元或火山直连每张价冒充 TokenHub 账单 |
| Runware | 每型号页面的公开报价/示例按原条件保存，实际请求 `includeCost` | 示例不是所有尺寸/steps/编辑的固定价格 |

[MiMo 价格](https://mimo.mi.com/docs/zh-CN/price/pay-as-you-go)、[TokenHub 当前价格](https://cloud.tencent.com/document/product/1823/130055)、[Runware 价格机制](https://runware.ai/docs/platform/pricing)。DeepSeek 原厂直供的峰谷时段、长上下文与缓存档位在单型号价格对象中独立记录；没有承诺本账号一定享有该价。

运营方与模型研发方分离：腾讯 TokenHub、Runware 是跨研发方渠道，小米是官方自研直连。腾讯自部署与原厂直供不适用同一 SLA；第三方部署的保留/训练使用须按外部服务条款核对，不能由平台口号推断零保留。[TokenHub 第三方特别说明](https://cloud.tencent.com/document/product/301/136530)。Runware 区分商业合作、开源与社区来源，适用各模型许可；输出不由平台长期保存，精确保留期/企业区域约定仍需账号确认。[条款](https://runware.ai/terms)、[隐私](https://runware.ai/privacy)。MiMo 隐私入口已核对，但本轮页面正文未可靠提取，训练使用、存储期限及地区适用条款均标待确认。[隐私入口](https://mimo.mi.com/docs/terms/privacy-policy)。

## 未完成与权限缺口

真实账号/逐 SKU 权限、余额或后付费开通、429 配额档位、跨区可达性、返回模型版本、实际费用和科研质量均未实测。TokenHub 新加坡、MiMo UltraSpeed、Runware 社区模型及上述专用多资产/风格/工具模式未开放。小程序已同步目录、排序、不可用隐藏和上传约束；原生辅助图/遮罩/结构化编辑 UI 仍是 SYNC 待办。未自动部署。

源码入口为 `config/channel-audit/*`、`packages/api/src/audited-channel-contracts.ts`、`image-channel-adapters.ts`、`text-channel-adapters.ts`；生成器统一派生 Web/Core/小程序目录。`scripts/import-runware-audit.py` 仅读取公开快照；`scripts/report-channel-audit.py` 生成表格，均不会调用推理。
