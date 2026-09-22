# 阶跃星辰 StepFun 官方目录与协议审计

核对时间：2026-09-22。中国普通 API 为本轮实现入口；真实 Key、鉴权目录、推理、充值、账单与部署均为 0。逐型号记录见 [stepfun.json](../../../config/channel-audit/v24/stepfun.json)。

## 目录覆盖、地区与产品入口

从 [国际入口](https://platform.stepfun.ai/docs/en/welcome)、[国际索引](https://platform.stepfun.ai/docs/llms.txt) 继续核对 [中国完整索引](https://platform.stepfun.com/docs/llms.txt)。中文目录补充了国际部分页面未完整列举的 Step 2x Large、Model Lab、Step Router、普通图生图与 Step Plan 协议。本轮相关 7 型号：5 主模型、3 视觉、2 生图/编辑。

| API ID | 主模型 | 视觉 | 生图/编辑 | 上下文 |
| --- | --- | --- | --- | --- |
| step-5-preview | 是 | 是 | — | 1M |
| step-3.7-flash | 是 | 是 | — | 256K |
| step-3.5-flash | 是 | — | — | 256K |
| step-3.5-flash-2603 | 是 | — | — | 256K |
| step-1o-turbo-vision | 是 | 是 | — | 32K |
| step-2x-large | — | — | 两者 | 不适用 |
| step-image-edit-2 | — | — | 两者 | 不适用 |

日期样式后缀不是不可变版本保证；除非明确声明，version.kind 保持 unconfirmed。普通中国 API 为 `https://api.stepfun.com/v1`；国际为 `https://api.stepfun.ai/v1`。均为 Bearer API Key，分别来自对应地区控制台，跨区兼容性未知。请求不自动换地区。

[Step Plan](https://platform.stepfun.com/docs/zh/step-plan/overview) 使用单独的 `/step_plan/v1`，不能把普通 /v1 成功当订阅权益可用。订阅模型、消耗倍率、额度与普通每 token 价格分离。`step-router-v1`、Step Plan 托管 `deepseek-v4-pro` 单列；Router 明确不支持图片理解，不能因为路由后使用 Step 3.7 就继承视觉。step-gui 为 Model Lab 实验 GUI 操作专用，官方不建议生产，不作为科研主模型。音频、语音、音乐、ASR 等精确 21 个 ID 逐条列入 excluded。

## 中国公开普通 API 价格

来源：[中国价格](https://platform.stepfun.com/docs/zh/guides/pricing/details)。金额是公开参考价，实际账号权益/折扣/账单未验证；国际 USD 价格另列在 JSON，未做汇率转换。

| 型号 | 输入 / 百万 tokens（元） | 缓存输入（元） | 输出（元） |
| --- | ---: | ---: | ---: |
| step-5-preview | 7 | 0.35 | 20 |
| step-3.7-flash | 1.35 | 0.27 | 8.1 |
| step-3.5-flash / -2603 | 0.7 | 0.14 | 2.1 |
| step-1o-turbo-vision | 2.5 | 0.5 | 8 |

图片 Step 2x Large ¥0.10/张、Step Image Edit 2 ¥0.02/张。国际分别 $0.02/张、$0.003/张。来源：[国际价格](https://platform.stepfun.ai/docs/en/guides/pricing/details)。

## 文字与视觉合同

`POST /chat/completions`，OpenAI messages；视觉为 `{type:"image_url",image_url:{url:DataURL或公开URL,detail:"high"}}`。当前三款视觉模型均有最多 60 张、合计 20 MB 的文档依据，JPEG/PNG/WebP/静态 GIF。4096 长边为建议值，不能伪写成硬性限制。Step 3.7 英文旧多图段 10–50 与当前能力段 60 有冲突，已记录。Step 1o 视频 MP4 小于 128 MB。细粒度/OCR 可用 detail=high。

输出 `choices[0].message.content`；reasoning_format 支持 general/deepseek-style，思考字段 reasoning/reasoning_content 均须兼容；SSE 以 [DONE] 结束。Step 5 输出上限64K；3.5-2603 reasoning_effort 只支持 low/high。精确限制与各型号来源在 JSON，未公布的最大输出保持 null。

## 两套图片编辑协议及尺寸

[生成图片](https://platform.stepfun.com/docs/zh/api-reference/images/image) 为同步 JSON `POST /images/generations`，两型号均支持，固定单图。Step 2x Large 使用 WxH；Step Image Edit 2 **明确使用 HxW**，适配层必须转换实际宽高。

| 型号/操作 | 输入合同 | 尺寸合同 |
| --- | --- | --- |
| step-2x-large 生图 | JSON，prompt ≤512 字符，steps 1–50 默认50，cfg_scale 1–10 默认6 | 256² / 512² / 768² / 1024² / 1280×800 / 800×1280 |
| step-2x-large 图生图 | [JSON /images/image2image](https://platform.stepfun.com/docs/zh/api-reference/images/image2image)，source_url 可完整 Data URL，source_weight 必填 (0,1]，越低越相似；prompt ≤1024，1 图，PNG/JPEG，≤10 MB、≤2048²，steps 1–100 | 同生图尺寸 |
| step-image-edit-2 生图 | JSON，prompt ≤512；steps 默认8，cfg_scale 默认1 | **HxW**：1024×1024 / 768×1360 / 896×1184 / 1360×768 / 1184×896 |
| step-image-edit-2 编辑 | [multipart /images/edits](https://platform.stepfun.com/docs/zh/api-reference/images/edits)，image 文件字段，prompt≤512，1 图，最大4096²；字节上限/穷举格式未公布 | size 字段不生效；返回与原图同尺寸 |

Step 2x 的文档把1280×800错误标为16:9，保留精确尺寸，不照抄比例。source_weight=0.5 来自官方示例，若用作产品默认需明确，不应声称官方缺省值。Step edit2 的编辑没有 n/mask 字段；文件上载让 HTTP 客户端自动生成 multipart boundary，不手填 Content-Type。负面词在 cfg_scale=1 时被忽略；text_mode 仅 edit2 支持。

响应为同步 `data[].url` / `b64_json`、seed、finish_reason；content_filtered 不能算可用图片。中国文档 URL 有效30天、国际2小时。采用 URL 时立刻持久化并下载；已有结果只重试下载，未知 POST 结果不重发。没有查到异步任务轮询端点，不能构造 task_id 假恢复。

## 退役与目录状态

[中国图片停服公告](https://platform.stepfun.com/docs/zh/guides/image-offline-notice) 和 [国际公告](https://platform.stepfun.ai/docs/en/guides/image-offline-notice) 明确：**2026-10-10**，普通 API 与 Step Plan 的 Step 2x Large / Step Image Edit 2 同时停止。审计日尚在此前，标为 scheduled-retirement。公告没有具体时刻/时区，retirementAt=null；若中国调用层采用北京时间当日零点保护，是产品保守策略，不是厂商公布时间。截止后停止新提交，但不能阻止已有 URL 下载。step-1x-edit 已明确不可用，但确切日期未知。

[2026-07-08 迁移公告](https://platform.stepfun.com/docs/zh/guides/model-migration) 明确退役：step-1-8k、step-1-32k、step-1v-8k、step-1v-32k、step-2-mini、step-1o-vision-32k、step-2-16k、step-3、step-1x-medium。历史 ID 保留，推荐替代项不自动替换用户配置。国际生成页未枚举 Step 2x 不等于退役，中国当前生成页与两区公告均说明它在截止前可用；本轮只实现中国精确协议。

