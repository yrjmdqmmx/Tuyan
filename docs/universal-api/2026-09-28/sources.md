# 官方资料核查 — 2026-09-28

本文件是代码契约依据，不是账号可用性或真实调用凭证。研究报告中的 `turn…` 引用未作为证据。所有下列来源为官方页面；当前网页内容可能继续变化。

## OpenAI

- [Responses image generation guide](https://developers.openai.com/api/docs/guides/tools-image-generation)：`tools.image_generation`、工具型号、action、工具选择、输入图像、base64 图像调用输出；质量与格式随型号核对。
- [Image generation](https://developers.openai.com/api/docs/guides/image-generation)：独立 Images 与 Responses 图像工具区别、生成/编辑和尺寸；没有合并成同一个任意请求体。
- [Reasoning guide](https://developers.openai.com/api/docs/guides/reasoning)、[GPT-5](https://developers.openai.com/api/docs/models/gpt-5)：Responses `reasoning.effort`；复用已审计 effort 值，默认省略。

采用的调用型号与图像型号枚举见共享 `universal-api.ts`。指南支持列表与示例存在时间差：示例出现 `gpt-6-astra`，工具支持列表未同样列出；本轮不凭示例自动扩展调用白名单。工具输出多图可能产生多次费用，代码接收上限并非收费承诺。连续编辑选用图研持有的图片重新输入，`store=false`，不依赖服务端保存响应。

## xAI

- [Image generation tool](https://docs.x.ai/developers/tools/image-generation)：`grok-4.7` / `/v1/responses`、`image_generation` 与 action、图片输入及 `image_generation_call.result`，示例解码 JPEG。该工具不支持尺寸/格式选项。
- [Models](https://docs.x.ai/developers/models)、[独立图像生成](https://docs.x.ai/developers/model-capabilities/images/generation)：仅作交叉核对，不把独立 Images 的参数移入 Responses 工具。

未确认工具特有多图数量上限、可选实际图像型号、quality、精确尺寸保证；本轮单图输入、服务默认尺寸且不显示这些参数。不是断言 xAI 的其他 API 或模型没有这些能力。

## Azure OpenAI / Foundry

- [API lifecycle / v1](https://learn.microsoft.com/en-us/azure/foundry/openai/api-version-lifecycle)：v1 与历史版本区别。
- [Responses tutorial](https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/responses)：资源地址、部署名、API Key / Entra、区域和支持模型、图像部署 header。
- [Responses REST reference](https://learn.microsoft.com/en-us/rest/api/microsoft-foundry/azureopenai/responses)：ImageGenTool 的 action / size / quality / format 等 schema。
- [v1 preview REST reference](https://learn.microsoft.com/en-us/azure/foundry/openai/reference-preview-latest)：Images generations/edits 的明确 `api-version=preview`、multipart 输入与 base64 输出。
- [Reasoning](https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/reasoning)：部署型号的 effort 支持范围、Chat 与 Responses 请求路径。

差异处理：

1. 教程前面不支持图像 multi-turn/streaming，图像段落却列出 streaming 优点并再次说明工具不支持 streaming。本轮全部非流式，不依赖上次响应的服务端状态；图片重新输入使用独立请求。
2. Python/JS 图像示例设置 `x-ms-oai-image-generation-deployment` 和 `api_version: preview` header；REST 示例只有前者。代码按 SDK 示例设置二者，未把它们猜成通用查询参数；部署名仍由用户现有资源决定。
3. v1 Responses 与 v1 Images 的版本规则不同：Images reference 明确 preview query，本轮仅该 exact 路径允许固定 query；不得据此解除所有 URL query 防护。
4. Entra 教程采用 `https://ai.azure.com/.default`，REST 参考也列 `https://cognitiveservices.azure.com/.default`；UI 提醒按资源受众核实。本轮仅接收已获取 token 和实际到期时间，不代发 token、不猜 audience、不添加自动刷新流程。
5. 总模型列表包含 GPT Image 2.5，但图像工具说明仍限定 1 系列、REST enum 仍只有 1/mini/1.5；工具先支持后者，不因发布列表存在而继承 OpenAI 2.5 参数。Azure 文字调用型号名单独立维护，避免 OpenAI 后续新增时自动扩大 Azure 范围。
6. Learn 页面顶部出现“requires authorization”通用提示，但正文/参数/示例本轮可公开读取；无法据此获得真实账户、部署、配额或资源区域信息。

Foundry 其他厂商模型/Agent Service 与 OpenAI v1 不等同，本轮未将整个产品当作 OpenAI 兼容渠道。

## Amazon Bedrock

- [Converse API](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html)：`/model/{id}/converse`，message/content 图片 bytes、system、inferenceConfig 和响应。
- [InvokeModel API](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_InvokeModel.html)：`/model/{id}/invoke`、模型特定 payload、请求体 25,000,000 字节上限。
- [API Keys](https://docs.aws.amazon.com/bedrock/latest/userguide/api-keys.html)、[key reference](https://docs.aws.amazon.com/bedrock/latest/userguide/api-keys-reference.html)、[use API Keys](https://docs.aws.amazon.com/bedrock/latest/userguide/api-keys-use.html)：官方 Bearer 鉴权可用于上述操作；短期 key 与会话到期、长期 key 到期管理。采用它不代表支持任意 AWS REST 服务或自动创建权限。
- [Claude Sonnet 4.5 model card](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-sonnet-4-5.html)：精确 ID、200K context/64K output 与 US inference profile；该卡 in-region 不提供，本轮选 `us.anthropic.claude-sonnet-4-5-20250929-v1:0`，只接受已列 US 来源区域。不是自动把区域名当数据驻留保证。
- [Extended thinking](https://docs.aws.amazon.com/bedrock/latest/userguide/claude-messages-extended-thinking.html)：`additionalModelRequestFields.thinking`、预算/输出关联，不与服务商默认混淆。
- [Stable Image Core](https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-diffusion-stable-image-core-text-image-request-response.html)：`stability.stable-image-core-v1:1`、prompt/output_format，images/finish_reasons。
- [Stable Diffusion 3.5 Large](https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-diffusion-3-5-large.html)：`stability.sd3-5-large-v1:0`，mode、image、strength、支持格式和最小 64px。图生图示例未显式写 mode，但参数表要求指定图生图 mode；代码按表发送，不照搬缺字段示例。
- [Stability model cards](https://docs.aws.amazon.com/bedrock/latest/userguide/model-cards-stability-ai.html)：新模型卡索引与上述 API 文档并非同一完整目录；Core/SD3.5 的账号当前开放仍需实际账户确认，未从索引缺项判定退役。
- [Stable Image Inpaint](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-stability-ai-stable-image-inpaint.html)：独立遮罩模型和 US profile，不混同 SD3.5 整图重绘。本轮未接入该独立 schema。
- [Nova Canvas](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-amazon-nova-canvas.html)：Legacy，2026-09-30 EOL；本轮不作为新接入默认。Sonnet 4.5 卡中的 “no sooner than” 日期不当作已宣布退役。

**凭据取舍**：官方 Bearer Key 满足本轮独立 BYOK 连接；未实现 SigV4/access-key/session-token 组合，避免引入服务器云身份、浏览器云凭据持久化、角色刷新授权等另一套系统。用户必须已有模型访问权益、InvokeModel 权限与有效 key；本轮不验证/创建它们。

## 异步任务

- [fal queue](https://fal.ai/docs/documentation/model-apis/inference/queue)：旧 docs.fal.ai 入口已重定向；request_id、status_url、response_url、IN_QUEUE / IN_PROGRESS / COMPLETED；COMPLETED 仍可能带 error/error_type。官方支持取消请求，但不由图研自动代发。
- [Replicate HTTP](https://replicate.com/docs/reference/http)：prediction ID/urls.get 与 status；API 输入/输出/日志默认一小时清理，output 可变 null；需及时复制产物。
- [BFL generation](https://docs.bfl.ai/quick_start/generating_images)、[Get Result](https://docs.bfl.ai/api-reference/utility/get-result)：必须使用返回 polling_url，Ready/Error/Failed，签名图片链接 10 分钟。最初 `/api-reference/tasks/get-result` 无法读取，已从导航找到正确 utility 路径，未据无法访问推断缺少 API。
- [Runware task polling](https://runware.ai/docs/platform/task-polling)、[Zero Data Retention](https://runware.ai/docs/platform/zero-data-retention)、[platform introduction](https://runware.ai/docs/platform/introduction)：既有 taskUUID/getResponse 流程有效；默认输出保留与 ZDR TTL 不同，原任务仍可查不等于 URL 背后文件存在。最初 `/docs/en/image-inference/api-reference` 无法读取，已定位新 platform 导航。

没有依据承诺过期文件可重新生成链接；下载恢复只尝试原任务，不重新创建推理。fal 上游内部自动重试策略由服务商管理，图研“不重发”指自身不重复付费提交，不能承诺服务内部执行次数。
