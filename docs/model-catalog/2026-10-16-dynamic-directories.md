# 2026-10-16 动态渠道目录与单模型规格核查

状态：本地 v33，工作树 `tuyan-v400-workflow-20261009`。未提交、推送或部署；无生成、编辑、付费探测请求。核查范围是现有 32 个渠道，不代表市场上全部供应商。账户目录的代码接入、公开目录的实际读取、模型的真实调用是三种不同证据。

## 本轮结果与统计口径

- 5 个公开动态渠道已读取；18 个 API Key 渠道、1 个业务空间渠道、2 个管理目录渠道已实现读取入口与分页，尚未使用真实账户凭据核验。6 个渠道未找到可确认的枚举接口，保留逐型号文档目录，不伪造 `/models`。
- 截至 `2026-10-16T08:44:14.759Z`，页面合并静态与动态目录共有 **3,460 条渠道—型号路由**，其中可能包含相同原厂型号的跨渠道身份、日期版本、别名、组件。不是 3,460 个独立模型，也不代表均可调用。
- **3,460 条有来源链接**；其中 **1,406 条输入/输出模态无待确认项**，**831 条有数值 token 上下文**，**146 条以生图/编辑提示词上限替代未公布上下文**。有来源不等于来源已公布所有字段，不能据此声称全部规格已补齐。
- 本轮新增逐型号证据：101 个 OpenAI 模型专页、380 个 Runware 专属 schema、8 组精确版本/渠道补充、1 组 Images API 提示词约束。生成数据有 941 个精确查找键，其中 215 个带提示词约束，包含别名；不能用这个数字代替页面路由覆盖数。
- 模型卡片保留型号、输入/输出图标、上下文或提示词上限、官方来源。模型使用厂商 logo；OpenRouter 使用已保存的官网 Ink SVG。文案和 tooltip 不再加“（原厂）”。

逐路由结果见 [CSV](2026-10-16-dynamic-coverage.csv)，统计与目录状态见 [JSON](2026-10-16-dynamic-coverage.json)。可用 `scripts/audit-model-card-coverage.mjs` 对真实 `modelRegistry` 响应重新计算。

## 32 个渠道逐项核查

“当前行数”含静态保留与动态新增，账户尚未登录的渠道仍是已有目录行数。

| 渠道 | 目录入口 | 当前行数 | 核查结论与范围 | 来源 |
|---|---|---:|---|---|
| openrouter | 公开动态 | 514 | 已实读公开目录；文本目录 + 独立图像目录；Batch、未适配与不可调用身份均保留 | [官方依据](https://openrouter.ai/docs/api-reference/models/get-models) |
| tokendance | 公开动态 | 113 | 已实读公开目录；109 条在线记录；另保留 4 个当前缺失的旧 ID，禁用调用 | [官方依据](https://tokendance.space/gateway/v1/models) |
| fal | 公开动态 | 1527 | 已实读公开目录；两轮均完整读取 1,524 个端点、153 页；限流续读及上次完整目录保留已验证 | [官方依据](https://fal.ai/docs/platform-apis/v1/models) |
| runware | 公开动态 | 382 | 已实读公开目录；补充账户未实读；380 个在线单模型 schema；另有 API Key 私有/社区 modelSearch 入口 | [官方依据](https://runware.ai/docs/models-api/model-schemas) |
| novita | 公开动态 | 95 | 已实读公开目录；补充账户未实读；95 个公开 LLM；API Key 补充 /v3/model 图像/私有目录与游标，含模型组件，不擅自视为可生成 | [官方依据](https://novita.ai/docs/api-reference/model-apis-llm-list-models) |
| openai | API Key | 69 | 接口实现及离线契约通过；待账户实读；按官方模型列表接口读取；不主动调用模型 | [官方依据](https://developers.openai.com/api/reference/resources/models/methods/list) |
| anthropic | API Key | 14 | 接口实现及离线契约通过；待账户实读；after_id 分页；输入上限不冒充上下文 | [官方依据](https://platform.claude.com/docs/en/api/models/list) |
| gemini | API Key | 17 | 接口实现及离线契约通过；待账户实读；pageToken 分页；inputTokenLimit 不与 outputTokenLimit 相加 | [官方依据](https://ai.google.dev/api/models) |
| deepseek | API Key | 4 | 接口实现及离线契约通过；待账户实读；按官方模型列表接口读取；不主动调用模型 | [官方依据](https://api-docs.deepseek.com/api/list-models) |
| kimi | API Key | 4 | 接口实现及离线契约通过；待账户实读；按官方模型列表接口读取；不主动调用模型 | [官方依据](https://platform.kimi.com/docs/api/list-models) |
| siliconflow | API Key | 68 | 接口实现及离线契约通过；待账户实读；按官方模型列表接口读取；不主动调用模型 | [官方依据](https://docs.siliconflow.com/en/api-reference/models/get-model-list) |
| mistral | API Key | 17 | 接口实现及离线契约通过；待账户实读；按官方模型列表接口读取；不主动调用模型 | [官方依据](https://docs.mistral.ai/api/endpoint/models) |
| together | API Key | 50 | 接口实现及离线契约通过；待账户实读；按官方模型列表接口读取；不主动调用模型 | [官方依据](https://docs.together.ai/reference/models) |
| fireworks | API Key | 24 | 接口实现及离线契约通过；待账户实读；pageToken；默认 fireworks，另可填账户 ID 查询私有/微调模型 | [官方依据](https://docs.fireworks.ai/api-reference/list-models) |
| xai | API Key | 12 | 接口实现及离线契约通过；待账户实读；models + language-models + image-generation-models + video-generation-models | [官方依据](https://docs.x.ai/developers/rest-api-reference/inference/models) |
| minimax | API Key | 10 | 接口实现及离线契约通过；待账户实读；按已选 CN/global 区域读取，不跨区发送密钥 | [官方依据](https://platform.minimax.io/docs/api-reference/models/openai/list-models) |
| stepfun | API Key | 7 | 接口实现及离线契约通过；待账户实读；按官方模型列表接口读取；不主动调用模型 | [官方依据](https://platform.stepfun.com/docs/zh/api-reference/models/list) |
| tokenhub | API Key | 45 | 接口实现及离线契约通过；待账户实读；按官方模型列表接口读取；不主动调用模型 | [官方依据](https://cloud.tencent.com/document/product/1823/130078) |
| xiaomi | API Key | 5 | 接口实现及离线契约通过；待账户实读；按官方模型列表接口读取；不主动调用模型 | [官方依据](https://mimo.mi.com/docs/en-US/api/model/list-models) |
| qianfan | API Key | 36 | 接口实现及离线契约通过；待账户实读；按官方模型列表接口读取；不主动调用模型 | [官方依据](https://cloud.baidu.com/doc/qianfan-api/s/Dmba8k71y) |
| longcat | API Key | 2 | 接口实现及离线契约通过；待账户实读；按官方模型列表接口读取；不主动调用模型 | [官方依据](https://longcat.chat/platform/docs/zh/api/models.html) |
| replicate | API Key | 107 | 接口实现及离线契约通过；待账户实读；next URL 分页，限制同源同路径；解析返回的 latest_version schema | [官方依据](https://replicate.com/docs/reference/http/#models.list) |
| bailian | 业务空间 + Key | 180 | 接口实现及离线契约通过；待账户实读；北京业务空间 ID + 对应 API Key；page_no/page_size | [官方依据](https://help.aliyun.com/zh/model-studio/list-models) |
| ark | 管理凭据 | 33 | 接口实现及离线契约通过；待账户实读；AK/SK（可选 STS）；基础模型、具体版本、接入点三类列表，保留进度 | [官方依据](https://docs.volcengine.com/docs/ark/list-foundation-models-api?lang=zh) |
| sensenova | 管理凭据 | 8 | 接口实现及离线契约通过；待账户实读；旧版 SenseCore 目录 JWT；不混用 token.sensenova.cn 推理密钥 | [官方依据](https://console.sensecore.cn/micro/help/docs/model-as-a-service/nova/overview/Models/GetModelList/) |
| zhipu | 逐型号文档 | 28 | 未确认可用枚举接口；官方接口索引未列出模型目录 API，按具体型号文档核查 | [官方依据](https://docs.bigmodel.cn/llms.txt) |
| recraft | 逐型号文档 | 17 | 未确认可用枚举接口；官方未提供已确认的模型枚举接口 | [官方依据](https://www.recraft.ai/docs/llms.txt) |
| bfl | 逐型号文档 | 14 | 未确认可用枚举接口；按具体模型的生成与编辑接口核查，未确认目录 API | [官方依据](https://docs.bfl.ai/llms.txt) |
| stability | API Key | 6 | 接口实现及离线契约通过；待账户实读；v1 引擎枚举；不能把这个列表误称为 v2 全部模型 | [官方依据](https://platform.stability.ai/docs/api-reference#tag/v1generation) |
| ideogram | 逐型号文档 | 14 | 未确认可用枚举接口；官方未提供已确认的模型枚举接口 | [官方依据](https://developer.ideogram.ai/api-reference/api-reference) |
| iflytek | 逐型号文档 | 32 | 未确认可用枚举接口；按模型及独立服务接口核查，未确认统一目录 API | [官方依据](https://www.xfyun.cn/doc/spark/Web.html) |
| antling | 逐型号文档 | 6 | 未确认可用枚举接口；未找到可用于现有接入凭据的官方模型枚举接口 | [官方依据](https://www.tbox.cn/) |

Novita 图像/私有补充接口的依据是 [Get Model](https://docs.novita.ai/api-reference/model-apis-get-model)，不是 LLM 列表。`sd_name_in_api` 是调用名称，游标来自 `pagination.next_cursor`。LoRA / VAE 等组件保留在目录但不授予独立生图能力。Fireworks 根据 [List Models](https://docs.fireworks.ai/api-reference/list-models) 支持账户 ID；不将 `accounts/fireworks` 当成用户私有账户的全部目录。

## 具体型号与限制

| 型号/版本 | 本轮补齐/纠正 | 精确来源 |
|---|---|---|
| GPT Image 2.5 Sunburst（含 2026-09-08） | 文本、图像输入；图像输出。专页未列 token 上下文，展示生图提示词 32,000 字符、编辑提示词 32,000 字符 | [型号专页](https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst)、[生成接口](https://developers.openai.com/api/reference/resources/images/methods/generate)、[编辑接口](https://developers.openai.com/api/reference/resources/images/methods/edit) |
| Qwen3.8 Max / 0902 | 文本、图像、视频输入；文本输出；1,000,000 tokens，不外推 Prime | [专页](https://help.aliyun.com/zh/model-studio/qwen3-8-max) |
| Qwen3.7 Max / 05-20 等已列别名 | 文本输入、文本输出；1,000,000 tokens | [专页](https://help.aliyun.com/zh/model-studio/qwen3-7-max) |
| Qwen3.7 Max 2026-06-08 | 文本、图像、视频输入；文本输出；1,000,000 tokens，与早期快照分别记录 | [专页](https://help.aliyun.com/zh/model-studio/qwen3-7-max) |
| Qwen3.6 Plus / 04-02 | 文本、图像、视频输入；文本输出；1,000,000 tokens | [专页](https://help.aliyun.com/zh/model-studio/qwen3-6-plus) |
| Qwen3.6 Max Preview | 文本输入/输出；262,144 tokens | [专页](https://help.aliyun.com/zh/model-studio/qwen3-6-max) |
| Qwen3.5-35B-A3B | 文本、图像、视频输入；文本输出；原生 262,144 tokens。扩展长度不当成原生窗口 | [官方模型卡](https://huggingface.co/Qwen/Qwen3.5-35B-A3B) |
| SenseNova 6.8 Flash Lite | API 文档确认文本、图像输入/文本输出；所查专页未给上下文数值 | [官方 API.md](https://github.com/OpenSenseNova/SenseNova6.8/blob/main/API.md) |
| Runware 的具体图片模型 | 读取各自 schema 的 positivePrompt / prompt maxLength，按 text-to-image、image-to-image 分别记录；示例 Qwen Image 2.0 为 2,000 字符 | [专属 schema](https://runware.ai/docs/models/alibaba-qwen-image-2-0/schema.json) |

提示词上限属于对应端点的文本字段约束，不是图像+文字的总上下文。字符、字节、tokens 原样保存；不拿样例长度、negativePrompt 长度、推理预算、max output 或输入上限冒充上下文。有明确 token 窗口时优先显示窗口；没有时可显示生图、编辑任一或两项已证实的限制。缺乏适用型号或字段来源的数值仍不填写。fal 根据具体端点 OpenAPI 提取明确 maxLength；未列上限或条件冲突则保持未知。

## 仍无法确认的旧缺口及版本边界

- Ark 四个旧 ID：`doubao-1-5-lite-32k-250115`、`doubao-1-5-pro-32k-250115`、`doubao-1-5-vision-pro-32k-250115`、`doubao-seed-1-6-vision-250815`。能确认身份/模态，但未取得精确旧版本上下文证据，不从名称中的 32k 推算。[官方下线迁移通知](https://docs.volcengine.com/docs/ark/model-deprecation-notice?lang=zh) 已列出迁移关系；迁移后的模型规格不作为原历史版本规格。
- UniFuncs `unifuncs-u3` / `u3-pro` / `s3` / `s3-pro`：所查 [DeepResearch](https://unifuncs.com/api/deepresearch) 与 [DeepSearch](https://unifuncs.com/api/deepsearch) 提供研究/搜索额度，未确认总上下文；额度不转换为窗口。
- 千帆 `ernie-5.1`：当前有 128K 目录依据，但精确输入模态仍待确认，不能沿用 ERNIE 5.0 的宣传规格。
- 讯飞 `xspark13b6k` / `xsparkprox`：MaaS 调用 ID 与现有 [HTTP 文档](https://www.xfyun.cn/doc/spark/HTTP调用文档.html) 的 domain 对应仍未确证，不把输入上限加输出上限当上下文。
- Qwen3 Max 的精确旧版本/别名仍需继续核查。TokenDance 当前目录还缺失 `deepseek-v4-flash-vision-exp`、`deepseek-v3.2`、`deepseek-chat-v3-0324`、`qwen3-max`，这些旧路由保留但暂停调用，不自动替换 ID。
- Runware 150@2 LLaVA 的已核对 schema 没有给出窗口；不沿用基础 Mistral 模型数值。新增目录中的未知字段继续标明待确认，不宣称供应商永远没有公布。

## 可靠性与核验

- 公开读取：OpenRouter 514 条（文本+图像）、TokenDance 109 条、fal 完整一轮 1,524 条/153 页、Runware 380 条、Novita LLM 95 条。本次 fal 刷新曾被 429 打断并续读，已于 08:36:32 UTC 完成全部 153 页，当前 ready；限流期间上一轮完整数据始终可见。
- 新条目未通过适配检查时仍可查看规格和来源，但不能直接选择调用；不因目录返回一个 ID 就宣称模型已接通或账户可用。
- 分页覆盖：fal cursor、Anthropic after_id、Gemini/Fireworks pageToken、Replicate 同源 next、百炼 page_no、Ark 三阶段管理列表、Runware offset、Novita pagination.cursor。中断后继续；完整刷新结束后才移除上一轮已下架项。
- 只读目的地白名单；管理凭据/密钥/认证头脱敏；账户目录仅页面内存，不进入公开 checkpoint；新密钥、账户、区域、工作区变化会丢弃旧结果和迟到响应。
- 最新定向测试：Core 目录与脱敏 25/25，Web 目录/规格/交互 27/27，本地目录缓存 5/5；OpenRouter 相关 34/34；Gateway/客户端元数据与脱敏检查通过。Core 类型检查、Web 构建通过。构建仍有原有大 chunk 警告。
- 实际浏览器 1440×1000 与 390×844 检查通过，覆盖 OpenRouter、fal、Runware、Novita、OpenAI、Fireworks、Ark、百炼及 Sunburst 提示词卡片；无页面错误、横向溢出或生成请求。
- 本轮只报告定向测试；未宣称仓库全量测试通过。真实账户枚举、实际生成质量、生产部署均未验证。

证据索引：[单模型页面及哈希](2026-10-16-specific-page-sources.json)、[目录接口来源及已读事实](2026-10-16-directory-sources.json)。本地原始抓取、响应与截图位于 `/Users/a1-6/.codex/artifacts/tuyan-all-channel-catalog-20261016/`，不包含账户密钥。
