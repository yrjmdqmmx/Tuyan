# 通用 API 协议与适配矩阵

核验日期：2026-09-20。以下“支持”指本仓库适配器和模拟回归覆盖，不等同于账号有权限、渠道在线或真实推理验证。本次不发起付费请求。协议决定报文格式，服务商决定地址、权限、价格与实际模型限制；同一协议可用于多个渠道，不能按渠道数计算协议数。

## 首版范围

首版实现七个协议族的同步、非流式子集。模型 ID 原样传递；所有能力、图片数量/字节/尺寸及输出尺寸映射均来自精确官方型号配置或用户明确声明，协议本身不保证任意模型具有这些能力。平台上限与声明上限取较严格值。没有适配器的协议不出现在可选项。

| 协议族 | 首版能力（仍受具体型号约束） | 认证 / Base URL 与操作路径 | 请求 → 响应 | 机制、限制、错误与兼容差异 |
| --- | --- | --- | --- | --- |
| OpenAI Chat Completions | 文本、识图；显式 OpenRouter 图片输出扩展可生图/编辑 | Bearer；`https://api.openai.com/v1` + `/chat/completions` | `model,messages`，图片为 `image_url` → `choices[].message.content`；扩展 `message.images` | 官方支持 SSE，首版 `stream:false`。图片上限随型号/渠道变化；兼容服务可能不支持 system、多模态、工具或额外参数。错误 `error.{message,type,code}`。OpenRouter 的 `modalities/image_config` 是扩展，不假设普通兼容服务支持。 |
| OpenAI Responses | 文本、识图 | Bearer；同上 + `/responses` | `model,instructions,input`，`input_image` → `output[].content[].output_text` | SSE、后台响应、服务端工具属协议能力，首版只消费同步完成的文本输出，工具调用/未完成响应拒绝。与 Chat 的字段结构不同。 |
| OpenAI Images | 生图、直接编辑 | Bearer；同上 + `/images/generations` 或 `/images/edits` | 生图 JSON；编辑 multipart 文件；`data[].b64_json/url` | 尺寸和编辑张数依型号；OpenAI-compatible 并不保证图片编辑兼容。显式 Ark 变体使用 `/images/generations` JSON `image`，不是标准 multipart。 |
| Anthropic Messages | 文本、识图；不生图 | `x-api-key` + `anthropic-version`；`https://api.anthropic.com/v1` + `/messages` | `model,max_tokens,system,messages`；image source → `content[]` text | 官方支持 SSE，首版同步；不默认发送 temperature 等型号差异参数。原生图像限制含数量、单图尺寸、请求体；例如官方文档区分上下文窗口及超过 20 张的尺寸限制，不能套成全型号统一上限。错误 `type:error,error.{type,message}`。 |
| Gemini GenerateContent | 文本、识图、生图、编辑 | `x-goog-api-key`；`https://generativelanguage.googleapis.com/v1beta` + `/models/{ID}:generateContent` | `contents.parts` text/inlineData，`generationConfig` → `candidates[].content.parts` | 官方另有 streamGenerateContent；首版同步，不混用 OpenAI compatibility 路径。图片输出需模型明确支持及 imageConfig 尺寸声明；错误 `error.{code,status,message}`。 |
| Gemini Interactions | 文本、识图、生图、编辑 | 同上 + `/interactions` | `model,input` typed parts；图片 response_format → steps/model_output 内容 | 与 GenerateContent 不同的状态/响应结构；首版 `store:false`，不启用 background、previous_interaction_id 或服务端工具。异步或未完成步骤停止，费用未知。 |
| DashScope Multimodal Generation | 文本、识图、生图、编辑 | Bearer；业务空间 `https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1` + `/services/aigc/multimodal-generation/generation` | `model,input.messages,parameters` → `output.choices[].message.content` | 原生多模态同步接口；Qwen-Image 不支持直接当作 OpenAI-compatible Chat 模型。地域/业务空间地址与 Key 配套。旧地址 dashscope.aliyuncs.com 仅作为旧账户地址示例，不替用户推断 workspace。错误 `code,message,request_id`。万相异步 text2image 是另一操作契约，首版不冒充支持。 |

官方来源：[OpenAI Chat](https://developers.openai.com/api/reference/resources/chat)、[文本与 Responses](https://developers.openai.com/api/docs/guides/text)、[图片输入](https://developers.openai.com/api/docs/guides/images-vision)、[Images](https://developers.openai.com/api/reference/resources/images)、[Anthropic API](https://platform.claude.com/docs/en/api/overview)、[Messages](https://platform.claude.com/docs/en/build-with-claude/working-with-messages)、[Vision](https://platform.claude.com/docs/en/build-with-claude/vision)、[Gemini GenerateContent](https://ai.google.dev/api/generate-content)、[Interactions](https://ai.google.dev/gemini-api/docs/interactions-overview)、[Gemini 生图](https://ai.google.dev/gemini-api/docs/image-generation)、[Gemini OpenAI 兼容](https://ai.google.dev/gemini-api/docs/openai)、[DashScope 原生](https://help.aliyun.com/zh/model-studio/qwen-api-via-dashscope)、[Qwen Image](https://help.aliyun.com/zh/model-studio/qwen-image-api)、[Qwen Image Edit](https://help.aliyun.com/en/model-studio/qwen-image-edit-api)。

## 代表服务与首版边界

- OpenAI、DeepSeek、通义兼容接口、智谱、硅基流动、Mistral、Together、Fireworks、OpenRouter 等可采用 Chat 类报文，但不是新增协议。仅在其官方明确提供兼容操作、用户声明能力且认证匹配时使用。目录可见不证明图片理解、编辑或生成可用。
- OpenRouter 图片扩展必须主动选择；[当前 Chat 参考](https://openrouter.ai/docs/api/api-reference/chat/create-a-chat-completion) 仍列出 modalities/image_config。同时，[独立 Image API](https://openrouter.ai/docs/guides/overview/multimodal/image-generation) 使用 /api/v1/images，是不同操作端点，本版尚未实现，列入第二批。标准 Chat 不发送 `modalities`，不把文本响应当图片。Ark 图片编辑必须选择 JSON 图片变体。火山文档入口 [图片 API](https://www.volcengine.com/docs/82379/1541523) 本轮抓取受限；变体实现还需与真实服务作一次单独授权的验收，现有原生适配证据不等于通用适配已实测。
- 自定义 Base URL 填到 API 根路径，包含所需版本与网关前缀。例如 `https://gateway.example/api/v1`。仅根域名会按协议补默认前缀；填写完整操作端点会报中文错误，避免重复拼接。第三方代理的额外签名、厂商自定义字段、任意请求模板和私有网络不属于本版范围。

## 后续协议与原因

| 协议 / 平台 | 官方机制与差异 | 首版状态 / 次序 |
| --- | --- | --- |
| Replicate Predictions | Bearer；`/v1/predictions` version 或 `/v1/models/{owner}/{name}/predictions`；input schema 随模型变化；返回 id/status/urls，Prefer wait 仍可返回未完成 | 暂不支持通用任意模型。第二批：持久化 task ID 后只做 GET 轮询，绑定显式模型输入 schema。 |
| fal Queue | `Authorization: Key`；queue.fal.run/{endpoint}，返回 request_id/status_url/response_url；输入因 endpoint 而异 | 第二批，与持久化异步恢复一起实现；不能套 Chat。 |
| BFL 原生 | `x-key`；`api.bfl.ai/v1/{endpoint}`；返回 polling_url，最终 result.sample；地区轮询地址和临时产物链接有意义 | 第二批；原生预设渠道不受本次通用入口范围影响。 |
| Stability 原生 | 官方图片 API 为独立接口族，常见 multipart 生图/编辑；Bearer、模型特定字段 | 第三批。官方文档网页本轮未能解析正文，不能把旧字段审计当成当天接口核验。 |
| Bedrock Converse / InvokeModel | 区域模型路径与报文不同；现已支持 Bedrock Bearer API Key，也有 SigV4；模型权限和临时 Key 有独立规则 | 原生协议后续支持；明确的 OpenAI-compatible 端点可走 Chat 配置，但没有本轮真实验证。不得再笼统说 Bedrock 只有 SigV4。 |
| Vertex AI / Azure OpenAI | Vertex 常规 OAuth/项目区域与 express API key 不同；Azure v1 与旧 deployment/api-version 形式、api-key/Entra 不同 | 首版只支持认证和路径确实匹配已实现适配器的子集；OAuth、SigV4、deployment 查询参数暂不支持，不能伪装完整平台支持。 |

来源：[Replicate 创建任务](https://replicate.com/docs/topics/predictions/create-a-prediction)、[HTTP 参考](https://replicate.com/docs/reference/http)、[fal Queue](https://fal.ai/docs/documentation/model-apis/inference/queue)、[BFL](https://docs.bfl.ai/quick_start/generating_images)、[Stability](https://platform.stability.ai/docs/api-reference)、[Bedrock Keys](https://docs.aws.amazon.com/bedrock/latest/userguide/api-keys.html)、[Bedrock Chat](https://docs.aws.amazon.com/bedrock/latest/userguide/inference-chat-completions.html)、[Google Cloud 认证](https://docs.cloud.google.com/docs/authentication)、[Azure OpenAI](https://learn.microsoft.com/en-us/azure/foundry/openai/reference)。

## 安全、目录与验证语义

服务端禁止非 HTTPS/非 443、内网或保留地址、混合 DNS、userinfo、查询参数、完整操作地址及重定向；自定义连接固定已校验 IP，TLS 校验原主机。模型返回的公网图片单独校验、限量下载，绝不附带 API Key。密钥按规范化 Base URL、协议和认证方式绑定，切换地址立即解除旧绑定。

目录逐项校验 ID、字段类型、协议元数据及重复 ID。异常项排除，完整目录格式错误单独报告；未知协议不补造。只读检查不跨连接缓存目录，不拿过去一次可见性作为后续调用保证。模型请求仍重新验证所选配置、阶段能力和预算。

“配置有效”仅表示配置/地址检查通过；“目录可见”仅表示只读目录出现该 ID；“真实调用验证成功”需要确有成功调用证据。本轮只有模拟与只读检查，不标记真实服务调用成功。
