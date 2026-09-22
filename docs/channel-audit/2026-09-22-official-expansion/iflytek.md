# 讯飞官方渠道审计（2026-09-22）

已核对公开目录 62 项与 62 个详情。审核记录含 51 项相关 API 服务、49 项排除/套餐/缺失记录。建议可适配角色计数（重叠）：主模型 38、视觉 8、生图 1、精修 0。只核对公开资料，真实调用、权限与账单均未验证。

## 命名与渠道边界

用户给定入口的准确产品是「讯飞星辰 MaaS · Astron Token Plan」。主渠道建议命名「讯飞星辰 MaaS」，第三方模型分别保留研发方，归国内聚合。普通 Spark 服务另设「讯飞星火」国内官方直连。Token Plan、Coding Plan、Spark HTTP、签名三件套与 MaaS 服务 Key 不互换；不能只做一个 iflytek Key 槽。

普通 MaaS 首选逐型号公开 `urls.api.http`，只有 Anthropic 的型号须走其明确端点，只有 WebSocket 的型号须另用 appId/apiKey/apiSecret。`spark-x` 在 `/x2` 与 `/v2` 是两个不同服务身份；`general` 在图片理解与图片生成也不同。

Token Plan 文档确认 16 个有效 ID、2 个已下线 ID；每套餐独立 Key、31 天有效，常规价 200/600/2000 元每成员每月、积分 20000/60000/200000、TPM 200/300/500 万。6—7 月活动价已经过期，不能称当前价。其科研产品后端用途未得到明确许可，也未找到与 Coding Plan 相同的禁令；此次保留为独立未开放套餐。Coding Plan 第 4.1.4 明文排除自建应用后端、自动脚本与批量任务，不接入。

## 目录完整性与异常

全量公开 list-v2 和旧 list 均为 62 项，所有详情成功读取。官方前端明确 bit 1=精调、2=部署、4=体验、8=API调用；仅体验/精调不会因存在 serviceId 就转为可选 API。没有登录的 api-services/models 返回业务 code4001，不能用 HTTP200 当目录/权益成功。

PaddleOCR-VL-1.6 的原始 ID 有尾随空格，保留异常不自动修正。GLM-5、Qwen2.5-7B 的 serverStatus=0，其含义没有充分公开说明，暂缓选择且不称退役。OCR 与翻译专用模型单列工作流。Token Plan 的 Spark X2 下线不能外推到普通 MaaS，同 ID 普通目录仍列有 API 按钮。

文生图分类实时返回 0 项。搜索快照出现过 Qwen-Image-2512/Z-Image-Turbo，当前全目录没有它们：仅记录缺失，不推定退役，不猜 API ID。

## 请求、响应与恢复

MaaS Chat 使用 Bearer、`model/messages`，同步 `choices[0].message.content` 或 SSE `choices[0].delta.content`。视觉使用 image_url URL/data URL；公开每型号图片数量上限未知，JSON 保持 null，并将本地保守单图策略与提供方限制分开。默认并发20、TPM100万按 Key+模型；输入加 max_tokens 小于上下文。503 可能产生用量，未知结果不重放。服务旧版 v1 与新版 v2 按发布时间/服务调用信息区分。

Spark 图片理解为 WebSocket 签名，单图 raw-base64 排在首条；基础 `general` / 高级 `imagev3`。Spark 文生图是 HTTP 签名 `/v2.1/tti`，`parameter.chat.domain=general`，提示词最多1000字符；只开放文生图，输出 `payload.choices.text[].content` 为 base64，需保存原字节及元数据。十种尺寸与点数已逐项写入 JSON。

HiDream `s3fd61810` 接受 prompt/image，创建后返回 task_id，再签名 POST query；恢复只能查原任务，未知创建结果不能再创建。虽然有图像条件生成，但解码后结果 JSON 字段、输入图上限、完整比例枚举与真实底模版本未知；暂缓接入，不冒充 I1/E1/O1，也不宣称 mask/精确编辑。MaaS 文生图模板不能填入从其他渠道猜来的 ID。

## 逐 API 服务决策

| 内部渠道建议 | 型号 | API ID | 角色 | 协议 | 决策 |
|---|---|---|---|---|---|
| iflytek_maas | Spark-X2.5 | spark-x2.5 | main | openai-chat | eligible_for_local_adapter |
| iflytek_maas | Spark-X2.5-4B | spark-x2.5-4b | main | openai-chat | eligible_for_local_adapter |
| iflytek_maas | Spark-X2.5-1.7B | spark-x2.5-1.7b | main | openai-chat | eligible_for_local_adapter |
| iflytek_maas | GLM-5.3 | xopglm53 | main | openai-chat | eligible_for_local_adapter |
| iflytek_maas | DeepSeek-V4-Pro-0813 | xopdeepseekv4pro0813 | main | openai-chat | eligible_for_local_adapter |
| iflytek_maas | DeepSeek-V4-Flash-0731 | xopdeepseekv4flash0731 | main | openai-chat | eligible_for_local_adapter |
| iflytek_maas | Kimi-K2.7-Code | xopkimik27code | main,vision | openai-chat | eligible_for_local_adapter |
| iflytek_maas | GLM-5.2 | xopglm52 | main | openai-chat | eligible_for_local_adapter |
| iflytek_maas | DeepSeek-V4-Flash | xopdeepseekv4flash | main | openai-chat | eligible_for_local_adapter |
| iflytek_maas | Kimi-K2.6 | xopkimik26 | main,vision | openai-chat | eligible_for_local_adapter |
| iflytek_maas | DeepSeek-V4-Pro | xopdeepseekv4pro | main | openai-chat | eligible_for_local_adapter |
| iflytek_maas | Qwen3.6-35B-A3B | xopqwen36v35b | main,vision | openai-chat | eligible_for_local_adapter |
| iflytek_maas | Hy-MT2-7B | xophunyuan7bmt | main | openai-chat | hold_translation_workflow |
| iflytek_maas | PaddleOCR-VL-1.6 | xoppaddleocrv16  | vision | openai-chat | hold_specialized_ocr |
| iflytek_maas | Spark-X2-Flash | xsparkx2flash | main | openai-chat | eligible_for_local_adapter |
| iflytek_maas | GLM-5.1 | xopglm51 | main | openai-chat | eligible_for_local_adapter |
| iflytek_maas | Spark X2 | xsparkx2 | main | openai-chat | eligible_for_local_adapter |
| iflytek_maas | Qwen3.5-2B | xop35qwen2b | main | openai-chat | eligible_for_local_adapter |
| iflytek_maas | Qwen3.5-397B-A17B | xopqwen35397b | main,vision | openai-chat | eligible_for_local_adapter |
| iflytek_maas | MiniMax-M2.5 | xminimaxm25 | main | openai-chat | eligible_for_local_adapter |
| iflytek_maas | GLM-5 | xopglm5 | main | openai-chat | hold_status_conflict |
| iflytek_maas | Kimi-K2.5 | xopkimik25 | main,vision | openai-chat | eligible_for_local_adapter |
| iflytek_maas | GLM-4.7-Flash | xopglmv47flash | main | openai-chat | eligible_for_local_adapter |
| iflytek_maas | Qwen3-VL-32B-Instruct | xop3qwen32bvl | vision | openai-chat | eligible_for_local_adapter |
| iflytek_maas_ws | DeepSeek-OCR | xopdeepseekocr | vision | iflytek-websocket | hold_specialized_ocr |
| iflytek_maas_ws | HunyuanOCR | xophunyuanocr | vision | iflytek-websocket | hold_specialized_ocr |
| iflytek_maas | Qwen3-Next-80B-A3B-Instruct | xop3qwen80bnext | main | openai-chat | eligible_for_local_adapter |
| iflytek_maas_ws | Qwen3-235B-A22B-Instruct-2507 | xop3qwen235b2507 | main | iflytek-websocket | eligible_for_local_adapter |
| iflytek_maas | Qwen3-30B-A3B | xop3qwen30b | main | anthropic-messages | eligible_for_local_adapter |
| iflytek_maas | Qwen3-32B | xop3qwen32b | main | anthropic-messages | eligible_for_local_adapter |
| iflytek_maas | DeepSeek-R1-Distill-Qwen-32B | xdeepseekr1qwen32b | main | openai-chat | eligible_for_local_adapter |
| iflytek_maas | Qwen3-0.6B | xop3qwen0b6 | main | openai-chat | eligible_for_local_adapter |
| iflytek_maas | Qwen3-4B | xop3qwen4b | main | anthropic-messages | eligible_for_local_adapter |
| iflytek_maas | Qwen2.5-7B-Instruct | xqwen257bchat | main | openai-chat | hold_status_conflict |
| iflytek_maas | Qwen3-14B | xop3qwen14b | main | anthropic-messages | eligible_for_local_adapter |
| iflytek_maas | Qwen3-8B | xop3qwen8b | main | anthropic-messages | eligible_for_local_adapter |
| iflytek_maas | Spark Max | xsparkprox | main | anthropic-messages | eligible_for_local_adapter |
| iflytek_maas | Spark Lite | xspark13b6k | main | anthropic-messages | eligible_for_local_adapter |
| iflytek_maas | Qwen_v2.5_14b_Instruct | xqwen14bchat | main | anthropic-messages | eligible_for_local_adapter |
| iflytek_spark | Spark Lite | lite | main | openai-chat | eligible_for_local_adapter |
| iflytek_spark | Spark Pro | generalv3 | main | openai-chat | eligible_for_local_adapter |
| iflytek_spark | Spark Pro 128K | pro-128k | main | openai-chat | eligible_for_local_adapter |
| iflytek_spark | Spark Ultra | 4.0Ultra | main | openai-chat | eligible_for_local_adapter |
| iflytek_spark | Spark Max | generalv3.5 | main | openai-chat | hold_merged_legacy_plan |
| iflytek_spark | Spark Max 32K | max-32k | main | openai-chat | hold_merged_legacy_plan |
| iflytek_spark_x2 | Spark X2 | spark-x | main | openai-chat | eligible_for_local_adapter |
| iflytek_spark_v2 | Spark X1.5 | spark-x | main | openai-chat | eligible_for_local_adapter |
| iflytek_spark_vision | Spark 图片理解基础版 | general | vision | iflytek-websocket | eligible_for_local_adapter |
| iflytek_spark_vision | Spark 图片理解高级版 | imagev3 | vision | iflytek-websocket | eligible_for_local_adapter |
| iflytek_spark_image | Spark 图片生成 | general | image | iflytek-image | eligible_for_local_adapter |
| iflytek_hidream | HiDream 图片生成服务 | s3fd61810 | image | iflytek-hidream | hold_incomplete_response_and_reference_contract |

## 逐项排除记录

| 渠道 | 名称 | ID | 理由 |
|---|---|---|---|
| iflytek_maas | Deepseek-V3.2 | xopdeepseekv32 | Only fine-tuning/experience is enabled in the official public UI; serviceId alone is not a public API entitlement. |
| iflytek_maas | Qwen3-Coder-Next-FP8 | xop3qwencodernext | Only fine-tuning/experience is enabled in the official public UI; serviceId alone is not a public API entitlement. |
| iflytek_maas | GLM-4.7 | xopglm47blth2 | Only fine-tuning/experience is enabled in the official public UI; serviceId alone is not a public API entitlement. |
| iflytek_maas | Qwen3-30B-A3B-Instruct-2507 | xop3qwen30b2507 | Only fine-tuning/experience is enabled in the official public UI; serviceId alone is not a public API entitlement. |
| iflytek_maas | Qwen3-235B-A22B | xop3qwen235b | Only fine-tuning/experience is enabled in the official public UI; serviceId alone is not a public API entitlement. |
| iflytek_maas | Kimi-K2-thinking | xopkimik2blth | Only fine-tuning/experience is enabled in the official public UI; serviceId alone is not a public API entitlement. |
| iflytek_maas | Kimi-K2-Instruct | xopkimik2blins | Only fine-tuning/experience is enabled in the official public UI; serviceId alone is not a public API entitlement. |
| iflytek_maas | Qwen3-Reranker-8B | xop3qwen8breranker | Embedding/reranking endpoint is outside planning, vision, image generation and editing roles. |
| iflytek_maas | Qwen3-Embedding-8B | xop3qwen8bembedding | Embedding/reranking endpoint is outside planning, vision, image generation and editing roles. |
| iflytek_maas | Spark Mini | 未确认 | Only fine-tuning/experience is enabled in the official public UI; serviceId alone is not a public API entitlement. |
| iflytek_maas | Spark Mini Instruct | 未确认 | Only fine-tuning/experience is enabled in the official public UI; serviceId alone is not a public API entitlement. |
| iflytek_maas | Spark Tiny | 未确认 | Only fine-tuning/experience is enabled in the official public UI; serviceId alone is not a public API entitlement. |
| iflytek_maas | internlm2.5_7b_chat | 未确认 | Only fine-tuning/experience is enabled in the official public UI; serviceId alone is not a public API entitlement. |
| iflytek_maas | internlm2.5_1.8b_chat | 未确认 | Only fine-tuning/experience is enabled in the official public UI; serviceId alone is not a public API entitlement. |
| iflytek_maas | Qwen_v2.5_7b_base | 未确认 | Only fine-tuning/experience is enabled in the official public UI; serviceId alone is not a public API entitlement. |
| iflytek_maas | Qwen_v2.5_3b_Instruct | xsqwen2d53b | Only fine-tuning/experience is enabled in the official public UI; serviceId alone is not a public API entitlement. |
| iflytek_maas | Qwen_v2.5_3b_base | 未确认 | Only fine-tuning/experience is enabled in the official public UI; serviceId alone is not a public API entitlement. |
| iflytek_maas | Qwen_v2.5_1.5b_Instruct | 未确认 | Only fine-tuning/experience is enabled in the official public UI; serviceId alone is not a public API entitlement. |
| iflytek_maas | Qwen_v2.5_1.5b_base | 未确认 | Only fine-tuning/experience is enabled in the official public UI; serviceId alone is not a public API entitlement. |
| iflytek_maas | Qwen_v2.5_0.5b_Instruct | 未确认 | Only fine-tuning/experience is enabled in the official public UI; serviceId alone is not a public API entitlement. |
| iflytek_maas | Qwen_v2.5_0.5b_base | 未确认 | Only fine-tuning/experience is enabled in the official public UI; serviceId alone is not a public API entitlement. |
| iflytek_maas | Qwen_v2_1.5b_Instruct | xsqwenv2s1b5c | Only fine-tuning/experience is enabled in the official public UI; serviceId alone is not a public API entitlement. |
| iflytek_maas | Qwen_v2_0.5b_Instruct | xsqwenv2s0b5c | Only fine-tuning/experience is enabled in the official public UI; serviceId alone is not a public API entitlement. |
| iflytek_astron_token_plan | Spark-X2.5 | spark-x2.5 | Token Plan has independent per-package API Key, endpoint and points. Production research-workflow applicability is not confirmed by this coding-oriented page; no general prohibition was found, so do not misquote Coding Plan restrictions as Token Plan restrictions. |
| iflytek_astron_token_plan | Spark-X2-Flash | xsparkx2flash | Token Plan has independent per-package API Key, endpoint and points. Production research-workflow applicability is not confirmed by this coding-oriented page; no general prohibition was found, so do not misquote Coding Plan restrictions as Token Plan restrictions. |
| iflytek_astron_token_plan | GLM-5.2 | xopglm52 | Token Plan has independent per-package API Key, endpoint and points. Production research-workflow applicability is not confirmed by this coding-oriented page; no general prohibition was found, so do not misquote Coding Plan restrictions as Token Plan restrictions. |
| iflytek_astron_token_plan | GLM-5.1 | xopglm51 | Token Plan has independent per-package API Key, endpoint and points. Production research-workflow applicability is not confirmed by this coding-oriented page; no general prohibition was found, so do not misquote Coding Plan restrictions as Token Plan restrictions. |
| iflytek_astron_token_plan | GLM-5 | xopglm5 | Token Plan has independent per-package API Key, endpoint and points. Production research-workflow applicability is not confirmed by this coding-oriented page; no general prohibition was found, so do not misquote Coding Plan restrictions as Token Plan restrictions. |
| iflytek_astron_token_plan | DeepSeek-V4-Pro | xopdeepseekv4pro | Token Plan has independent per-package API Key, endpoint and points. Production research-workflow applicability is not confirmed by this coding-oriented page; no general prohibition was found, so do not misquote Coding Plan restrictions as Token Plan restrictions. |
| iflytek_astron_token_plan | DeepSeek-V4-Flash | xopdeepseekv4flash | Token Plan has independent per-package API Key, endpoint and points. Production research-workflow applicability is not confirmed by this coding-oriented page; no general prohibition was found, so do not misquote Coding Plan restrictions as Token Plan restrictions. |
| iflytek_astron_token_plan | DeepSeek-V3.2 | xopdeepseekv32 | Token Plan has independent per-package API Key, endpoint and points. Production research-workflow applicability is not confirmed by this coding-oriented page; no general prohibition was found, so do not misquote Coding Plan restrictions as Token Plan restrictions. |
| iflytek_astron_token_plan | Kimi-K2.6 | xopkimik26 | Token Plan has independent per-package API Key, endpoint and points. Production research-workflow applicability is not confirmed by this coding-oriented page; no general prohibition was found, so do not misquote Coding Plan restrictions as Token Plan restrictions. |
| iflytek_astron_token_plan | Kimi-K2.5 | xopkimik25 | Token Plan has independent per-package API Key, endpoint and points. Production research-workflow applicability is not confirmed by this coding-oriented page; no general prohibition was found, so do not misquote Coding Plan restrictions as Token Plan restrictions. |
| iflytek_astron_token_plan | MiniMax-M2.5 | xminimaxm25 | Token Plan has independent per-package API Key, endpoint and points. Production research-workflow applicability is not confirmed by this coding-oriented page; no general prohibition was found, so do not misquote Coding Plan restrictions as Token Plan restrictions. |
| iflytek_astron_token_plan | Qwen3.5-397B-A17B | xopqwen35397b | Token Plan has independent per-package API Key, endpoint and points. Production research-workflow applicability is not confirmed by this coding-oriented page; no general prohibition was found, so do not misquote Coding Plan restrictions as Token Plan restrictions. |
| iflytek_astron_token_plan | Qwen3.6-35B-A3B | xopqwen36v35b | Token Plan has independent per-package API Key, endpoint and points. Production research-workflow applicability is not confirmed by this coding-oriented page; no general prohibition was found, so do not misquote Coding Plan restrictions as Token Plan restrictions. |
| iflytek_astron_token_plan | Qwen3.5-35B-A3B | xopqwen35v35b | Token Plan has independent per-package API Key, endpoint and points. Production research-workflow applicability is not confirmed by this coding-oriented page; no general prohibition was found, so do not misquote Coding Plan restrictions as Token Plan restrictions. |
| iflytek_astron_token_plan | Qwen3-Coder-Next-FP8 | xop3qwencodernext | Token Plan has independent per-package API Key, endpoint and points. Production research-workflow applicability is not confirmed by this coding-oriented page; no general prohibition was found, so do not misquote Coding Plan restrictions as Token Plan restrictions. |
| iflytek_astron_token_plan | GLM-4.7-Flash | xopglmv47flash | Token Plan has independent per-package API Key, endpoint and points. Production research-workflow applicability is not confirmed by this coding-oriented page; no general prohibition was found, so do not misquote Coding Plan restrictions as Token Plan restrictions. |
| iflytek_astron_token_plan | Spark-X2-Agent | xsparkx2agent | Token Plan has independent per-package API Key, endpoint and points. Production research-workflow applicability is not confirmed by this coding-oriented page; no general prohibition was found, so do not misquote Coding Plan restrictions as Token Plan restrictions. |
| iflytek_astron_token_plan | Spark-X2 | xsparkx2 | Token Plan has independent per-package API Key, endpoint and points. Production research-workflow applicability is not confirmed by this coding-oriented page; no general prohibition was found, so do not misquote Coding Plan restrictions as Token Plan restrictions. |
| iflytek_astron_coding_plan | Astron Coding Plan 全套餐 | 未确认 | Official section 4.1.4 restricts to interactive coding tools and expressly prohibits automated scripts, batch tasks and self-built application backends. |
| iflytek_maas | Qwen-Image-2512 | 未确认 | Official search-index snapshot mentioned this name, but fresh complete 62-row directory and category7 query contain no row. No exact API ID, current entitlement or retirement evidence. |
| iflytek_maas | Z-Image-Turbo | 未确认 | Official search-index snapshot mentioned this name, but fresh complete 62-row directory and category7 query contain no row. No exact API ID, current entitlement or retirement evidence. |
| specialized | 星火智能体 Workflow | 未确认 | Requires separate workflow/assistant/knowledge-base/customization/batch resources; not a plain model ID for the current three-role synchronous pipeline. |
| specialized | 星火助手 | 未确认 | Requires separate workflow/assistant/knowledge-base/customization/batch resources; not a plain model ID for the current three-role synchronous pipeline. |
| specialized | 星火知识库 | 未确认 | Requires separate workflow/assistant/knowledge-base/customization/batch resources; not a plain model ID for the current three-role synchronous pipeline. |
| specialized | 星火可定制 API | 未确认 | Requires separate workflow/assistant/knowledge-base/customization/batch resources; not a plain model ID for the current three-role synchronous pipeline. |
| specialized | 批量推理 | 未确认 | Requires separate workflow/assistant/knowledge-base/customization/batch resources; not a plain model ID for the current three-role synchronous pipeline. |

## 主要官方来源

- [catalog](https://maas.xfyun.cn/api/v1/gpt-finetune/model/base/list-v2?page=1&size=9999)
- [square](https://maas.xfyun.cn/modelSquare)
- [bundle](https://maas.xfyun.cn/js/index-093305dc.js)
- [product](https://www.xfyun.cn/doc/spark/产品使用说明.html)
- [http](https://www.xfyun.cn/doc/spark/推理服务-http.html)
- [ws](https://www.xfyun.cn/doc/spark/推理服务-websocket.html)
- [vision](https://www.xfyun.cn/doc/spark/图像理解API-http.html)
- [visionWs](https://www.xfyun.cn/doc/spark/图像理解API-websocket.html)
- [maasImage](https://www.xfyun.cn/doc/spark/图片生成.html)
- [token](https://www.xfyun.cn/doc/spark/TokenPlan.html)
- [coding](https://www.xfyun.cn/doc/spark/CodingPlan.html)
- [spark](https://www.xfyun.cn/doc/spark/HTTP调用文档.html)
- [sparkX](https://www.xfyun.cn/doc/spark/X1http.html)
- [sparkVision](https://www.xfyun.cn/doc/spark/ImageUnderstanding.html)
- [sparkImage](https://www.xfyun.cn/doc/spark/ImageGeneration.html)
- [hidream](https://www.xfyun.cn/doc/spark/hidream.html)
- [hmac](https://www.xfyun.cn/doc/spark/http_url_authentication.html)
- [hmacWs](https://www.xfyun.cn/doc/spark/general_url_authentication.html)
- [billing](https://www.xfyun.cn/doc/spark/BillingDescription.html)

机器审计含每型号目录/详情来源、价格与原始协议字段；可选择仅表示实现候选，不能作为真实推理或部署证明。
