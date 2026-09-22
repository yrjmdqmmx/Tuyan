# 百度千帆：普通 API 完整目录与边界审计

核对日期：2026-09-22。只读公开官方资料，无生产密钥，无真实推理、充值、历史重跑或发布。逐条机器记录见 [qianfan.json](../../../config/channel-audit/v24/qianfan.json)。JSON 的 `selectable` 是在完成适配后可开放的建议，不能当成本研究已实现或账号已开通。

## 覆盖结果

- [普通目录](https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j) 13 张型号表，去重 **49 个准确调用 ID**，逐项均有决策。
- 建议适配 **36 个 ID**：主模型 30、视觉 14、图片 3，角色有重叠。视觉包含当前模型公告补证的 Qwen3.5 四型、DeepSeek V4.1 Flash、GLM 5.3 Flash；普通目录的视觉小节并非完整能力表。
- 当前普通目录另有 13 个专用 ID：2 个布局/OCR、7 个向量、4 个重排序，逐项排除通用工作台路线。
- 额外记录 232 条排除/暂缓记录，包括 191 条历史预置退役记录、16 个国际站 ID、内部图片服务、旧图片文档、专用 OCR 与订阅入口。不同地区及历史公告可以出现同名项，不能把记录条数当作当前型号数。
- 使用 36 个官方来源，记录 URL、文档更新日、抓取 SHA-256。没有调用账户级 `GET /v2/models`；该接口文档中的示例用于结构/归属证据，不能当实时目录。

## 账号、地域、套餐

普通入口是 `https://qianfan.baidubce.com/v2`，认证为 `Authorization: Bearer <普通千帆 API Key>`。官方服务域名页标“全局”，但这不表示国内与国际账号共享权限。AppID 与接入点授权必须同时满足，自定义接入点与预置接入点权限独立。[服务域名](https://cloud.baidu.com/doc/qianfan/s/8mh4sv3sb)、[认证](https://cloud.baidu.com/doc/qianfan-api/s/ym9chdsy5)、[细粒度权限](https://cloud.baidu.com/doc/qianfan/s/wmh8l6tnf)。

国际站使用 `https://api.baiduqianfan.ai/v1`，目录、额度和价格分别核对；本次保留 16 个国际 ID 的逐项记录，未把它们混入国内账号路线。[国际快速开始](https://intl.cloud.baidu.com/en/doc/qianfan/s/qm8qxemze-intl-en)、[国际目录](https://intl.cloud.baidu.com/en/doc/qianfan/s/7m95lyy43-intl-en)。

Token Plan 个人版、企业版及旧 Coding Plan 都有专属 key 和入口，而且官方明确限于兼容编程/智能体工具中的交互使用，禁止自动化脚本和应用后端。本项目后端不能拿这些权益替代普通 API；不应以自动切换套餐绕过鉴权失败。[个人版](https://cloud.baidu.com/doc/qianfan/s/Dmrabu8b6)、[企业版](https://cloud.baidu.com/doc/qianfan/s/ymq8wwch2)、[Coding Plan](https://cloud.baidu.com/doc/qianfan/s/imlg0beiu)、[停售公告](https://cloud.baidu.com/doc/qianfan/s/Fmrexuejc)。

旧 `/rpc/2.0/ai_custom/v1/wenxinworkshop/**` 已于 2026-08-31 下线，不设计新接入。[生命周期](https://cloud.baidu.com/doc/qianfan/s/zmh4stou3)。

## 当前建议型号

`maxImages` 为整次输入总量，原图也占名额；0 表示此路线未开放图片输入。通用视觉 10 张来自官方视觉指南，账号实际限制未测试。仅输出 text 的视觉模型不能借此宣称会生成图片。

| 调用 ID | 工作台角色 | maxImages | 版本类型 | 特别约束 |
|---|---|---:|---|---|
| `ernie-5.1` | main | 0 | rolling |  |
| `ernie-5.0` | main, vision | 10 | rolling |  |
| `ernie-5.0-thinking-preview` | main, vision | 10 | rolling |  |
| `ernie-5.0-thinking-latest` | main, vision | 10 | rolling |  |
| `ernie-5.0-thinking-exp` | main | 0 | rolling |  |
| `ernie-4.5-turbo-32k` | main | 0 | rolling |  |
| `ernie-4.5-turbo-128k` | main | 0 | rolling |  |
| `ernie-4.5-turbo-20260402` | main | 0 | fixed |  |
| `ernie-4.5-turbo-vl` | main, vision | 10 | rolling |  |
| `ernie-4.5-turbo-vl-32k` | main, vision | 10 | rolling |  |
| `deepseek-v4.1-flash` | main, vision | 10 | unconfirmed |  |
| `deepseek-v4-pro-0813` | main | 0 | fixed |  |
| `deepseek-v4-pro` | main | 0 | unconfirmed |  |
| `deepseek-v4-flash-0731` | main | 0 | fixed |  |
| `deepseek-v4-flash` | main | 0 | unconfirmed | 9 月 29 日退役 |
| `deepseek-v3.2` | main | 0 | unconfirmed | 9 月 29 日退役 |
| `internvl3-38b` | vision | 10 | unconfirmed |  |
| `ernie-x1.1-preview` | main | 0 | rolling | 9 月 29 日退役 |
| `ernie-x1.1` | main | 0 | rolling | 9 月 29 日退役 |
| `deepseek-flash` | main | 0 | unconfirmed | 官方两表 ID 差异；不合并 |
| `deepseek-v3.2-think` | main | 0 | unconfirmed | 9 月 29 日退役 |
| `qwen3.5-397b-a17b` | main, vision | 10 | unconfirmed |  |
| `qwen3.5-122b-a10b` | main, vision | 10 | unconfirmed |  |
| `qwen3.5-27b` | main, vision | 10 | unconfirmed |  |
| `qwen3.5-35b-a3b` | main, vision | 10 | unconfirmed |  |
| `glm-5.3-flash` | main, vision | 10 | unconfirmed |  |
| `glm-5.3` | main | 0 | unconfirmed |  |
| `glm-5.2` | main | 0 | unconfirmed |  |
| `glm-5.1` | main | 0 | unconfirmed |  |
| `glm-5` | main | 0 | unconfirmed | 9 月 29 日退役 |
| `kimi-k2.6` | main | 0 | unconfirmed | 9 月 29 日退役 |
| `deepseek-ocr` | vision | 1 | unconfirmed | 只 user、单轮 |
| `qianfan-ocr` | vision | 10 | unconfirmed |  |
| `musesteamer-air-image` | image | 0 | unconfirmed | 1000 字符；专用 JSON 图片请求 |
| `qwen-image` | image | 0 | unconfirmed | 800 字符；专用 JSON 图片请求 |
| `qwen-image-edit` | image | 3 | unconfirmed | 800 字符；专用 JSON 图片请求 |

DeepSeek-V4.1-Flash 在文本表为 `deepseek-v4.1-flash`，深度思考表为 `deepseek-flash`；原样记录为两个准确 ID，未证实互为别名。Kimi-K2.6 的套餐文案含视觉能力，但未拿套餐能力直接推及普通 API；ERNIE 5.0 Exp 的视觉价格行也不足以补造完整请求能力。

## 调用实现要点

### 文本与视觉

同用 `POST /v2/chat/completions`，同步 `stream:false`，最终答案读取 `choices[0].message.content`；`reasoning_content` 不是最终答案。只传所选 ID 已证实支持的控制参数，保留 `usage` 与请求 ID。[文本 API](https://cloud.baidu.com/doc/qianfan-api/s/3m7of64lb)、[视觉 API](https://cloud.baidu.com/doc/qianfan-api/s/rm7u7qdiq)。

视觉以 `user.content[]` 的 `image_url.url` 传公网 HTTPS URL 或 `data:image/...;base64,...`。通用指南列 JPEG/PNG/BMP、10MB、最多 10 图；API 的 URL UTF-8 上限是 1024 字节、最短边 5px，优先执行较严格的 API 限制。Qwen 与 ERNIE 4.5 Turbo VL 推荐图片在文字之前。[视觉指南](https://cloud.baidu.com/doc/qianfan-docs/s/fm8r1ndsm)。

DeepSeek-OCR 是单轮单图、只能 `user`，不可直接发送系统消息或多张参考图。可在同一 user 文本中拼入应用指导；其任务包括图表解析与图像描述，但不开放主模型规划角色。PaddleOCR-VL 与 PP-StructureV3 使用专用 file/fileType 文档解析契约，不能按 OpenAI chat 直接调用。[DeepSeek-OCR](https://cloud.baidu.com/doc/qianfan-api/s/6mhelwygh)、[PaddleOCR](https://cloud.baidu.com/doc/qianfan-api/s/zmho8omz3)、[PP-Structure](https://cloud.baidu.com/doc/qianfan-api/s/Nmj124ro4)。

JSON Schema 明确支持的范围按 [结构化输出](https://cloud.baidu.com/doc/qianfan-docs/s/6m8r1x5hz) 逐 ID 记录；其余型号使用提示词要求 JSON 并在本地严格解析，不发送猜测的 `response_format`。思考开关分 `thinking.type` 与 `enable_thinking`，不能从厂商名继承到所有新型号。ERNIE 的 thinking_budget 在目录与指南中矛盾，因此省略；未确认开关的型号保持提供方默认，不声称关闭思考。[思考指南](https://cloud.baidu.com/doc/qianfan-docs/s/Wm95lyynv)。

max_tokens 的语义也须按型号区分：ERNIE 思考模型目录说包含思考与回答；通用 API 说仅最终回答，DeepSeek V3.2 / V3.2 Think 另有已明确的 max_completion_tokens 总上限参数。新型号未明确支持该总上限参数时不能擅自发送，不能把 max_tokens 当作保证的全量费用上限。[上下文控制](https://cloud.baidu.com/doc/qianfan-docs/s/Imkdq47r5)。

### 生图与精修

| ID | POST 路径 | 已确认行为 |
|---|---|---|
| `musesteamer-air-image` | `/v2/musesteamer/images/generations` | 纯文生图；1000 字符；10 个固定尺寸；`response_format=url/b64_json` |
| `qwen-image` | `/v2/images/generations` | 纯文生图；800 字符；n=1；512–2048 自定义宽高 |
| `qwen-image-edit` | `/v2/images/edits` | 1–3 图；800 字符；n=1；`image` 为字符串或字符串数组；不支持 mask/feature |

以上都用 JSON body，不是 multipart；结果位于 `data[].url`，有效期 24h。Qwen 输入支持 data URL；编辑图大小 <10MB，最小边 128px，长宽比不超过 4 倍。应用必须先拒绝不支持尺寸，不能依赖服务端静默改成默认尺寸。prompt_extend 关闭可避免提供方改写科研提示词；这只是请求选项，不代表科研质量已经验证。[蒸汽机](https://cloud.baidu.com/doc/qianfan-api/s/Ymio9i9i4)、[生成](https://cloud.baidu.com/doc/qianfan-api/s/8m7u6un8a)、[编辑](https://cloud.baidu.com/doc/qianfan-api/s/Rm9m76ekf)。

三个普通图片 API 均无已确认的可查询任务恢复协议。同步提交结果未知时停止，**不再 POST**；已有 URL 则只重新下载并存储结果，不把失败下载变成新生成。

### 已审计但未开放的异步图片协议

`v3-base`、`o1-base`、`v3o` 有完整创建、查询和积分价文档，但官方目录导航写明 **Qianfan-Image（内部使用）**，因此 `selectable=false`。这属于开通状态未知，不是退役。其完整 schema 留在 JSON，日后取得明确权益后可实现，不需重新猜协议。

共同创建地址 `POST /beta/image/qianfan-image-v1`，返回 `data.task_id`。v3-base 为 `type=generations`、`model_parameters.image` 字符串；o1-base/v3o 为 `type=omni`、`model_parameters.image_list:[{image:...}]`，最多 10 图且含主体合计不超 10。v3-base 的 base64 明确不能有 data 前缀；omni 文档没明确前缀，优先 URL。仅开放文档枚举的 1k/2k；v3o 价格表列 4K，不等于请求接口支持 4k。[创建](https://cloud.baidu.com/doc/qianfan-api/s/jmmot21am)、[omni](https://cloud.baidu.com/doc/qianfan-multimodal/s/8mmt3c9jr)、[能力地图](https://cloud.baidu.com/doc/qianfan-multimodal/s/mmmt2nl4z)。

恢复只发 `GET /beta/image/qianfan-image-v1?task_id=<原任务>`：submitted/processing 等待，succeed 读取 `data.task_result.images[].url`，failed 读取 `task_status_msg`。提交超时没有 task_id 时不补发。查询返回积分 usage 和 `final_unit_deduction`，不能直接称为已核对人民币账单；资源 30 天清理，应及时存储。[查询](https://cloud.baidu.com/doc/qianfan-multimodal/s/gmmt3c9im)、[价格](https://cloud.baidu.com/doc/qianfan-multimodal/s/mmmt5xhbv)。

## 生命周期与价格

七个当前 ID 已公告 **2026-09-29** 退役：ERNIE X1.1、X1.1 Preview、GLM-5、Kimi-K2.6、DeepSeek V4 Flash、V3.2、V3.2 Think。今天保留弃用状态和准确 ID；原文没有精确时刻，`retirementTimestamp=null`，实现可采用明确标注的上海自然日保守截止，禁止自动改成推荐型号。

ERNIE-Image-Turbo 的 API 页面仍在线，但官方已公告 2026-06-30 退役，必须排除。`ernie-irag-edit`、`flux.1-schnell`、`ernie-image` 是文档残留或不完整条目，当前开通不明；没有把目录缺失认定为退役。[退役历史](https://cloud.baidu.com/doc/qianfan/s/zmh4stou3)。

公开图片参考价为蒸汽机 0.05 元/张、Qwen Image 0.25 元/张（均是页面列出的 1024×1024 规格）、Qwen Edit 0.3 元/张。文本采用原始十进制单价和输入长度/峰谷条件；旧缓存价、活动价和最终账单必须区分。128K 文本价格页标签与旧文档有冲突、部分闲时输入价缺项，保留未知而不补算。[当前计费](https://cloud.baidu.com/doc/qianfan/s/wmh4sv6ya)。

## 本研究验证

JSON 解析通过，36 个建议 ID 唯一，49 个普通目录 ID 全部落入建议适配或专用排除，每条推荐记录都有来源、请求、恢复和生命周期。模型网页、权限、推理、收费是不同证据层次；本研究完成官方资料核对，适配器、本地模拟与 UI 验收由主任务继续完成。
