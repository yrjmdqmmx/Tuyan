# 科研精修与新渠道交付记录

> 后续发布状态：用户明确要求“上线”后，Web / Core 已发布 `f547344`，见 [发布记录](../releases/2026-09-22-refine-v23.md)。下文“未部署 / 无 push”描述当时的实施阶段；真实付费推理仍为 0，小程序未发布。

核查日期：2026-09-22（Asia/Shanghai）。基线：`0d8b0b4500eb9ca6d8b1b5180450276c7f78b2fb`；工作分支：`codex/refine-controls-runware-tokenhub-20260922`。本记录描述本地代码与模拟验证，不代表部署、账号授权或真实模型效果验证。真实推理、充值、生产写入均为 0。

## 现状审计与范围

审阅了生成页 `App.jsx` / `GenerationWorkspace`、`RefinePanel`、两个上传流程、`packages/api/src/reference-upload.ts`、静态目录和型号尺寸契约、`image-channel-adapters.ts`、Core 工作流、共享请求和公开任务记录。

基线有 22 个渠道、760 个静态条目，另有 OpenRouter 动态目录。新增后为 25 个渠道、768 个静态条目。条目数包括不同渠道的重复模型；不是独立研发模型数。

| 基线渠道 | 代码状态 | 本次审计的边界 |
| --- | --- | --- |
| Google、OpenAI、百炼、方舟 | 文本/识图/图像均有分型号适配；部分型号受地区或账号开通约束 | 单图编辑和分析后重绘不能等同多参考图、遮罩或结构化编辑 |
| DeepSeek、Kimi、智谱、Anthropic、xAI、MiniMax、Mistral | 有实际文本或多模态分派；具体角色以目录及适配器为准 | 不把所属厂商全部型号视为具备相同能力 |
| Recraft、BFL、Stability、Ideogram | 有原生图像路径，部分含单图编辑 | SVG 输出、像素编辑均不证明文字/箭头可独立编辑 |
| SiliconFlow、TokenDance、OpenRouter、Together、Fireworks | 有实际调用代码；需按型号/协议/账号权限区分 | 目录可见与协议字段不是授权证明 |
| fal、Replicate | 已有多种生成与单图编辑；本次补齐下面列明的精修能力 | 基线传图字段没有通用多参考图、遮罩、结构化契约 |

没有发现“整个旧渠道只登记、完全没有调用分派”的情况。仍有目录记录但被停用/隔离的具体 SKU，以及 `verified=false`、`verificationState=catalog` 的未实测条目。本次不改写它们的验证状态，也不将任何整个平台宣布为“完整实测接入”。新增八个条目均有实际适配及本地测试，但账号调用仍未验证。

### 上传与传递

- 当前 v2 生成上传平台限额：8 张、20 MiB/张、80 MiB 合计，单边 16384 px、32 MP；PNG/JPEG/WebP/SVG，SVG 原文件最多 5 MiB，并行上传 2。旧后端 v1 回退仍为 3 张、5 MiB/张、15 MiB 合计；不能用旧观察代替当前规则。
- 真实可提交数量取平台与所选型号更严格的值。未完整公布限额的型号，保守提交额度为 3 张、4 MiB/张、12 MiB 合计、4096 px、8 MP、20 MB 请求；已审定型号可覆盖这些数值。
- 浏览器上传原文件，不先做有损压缩。生成后端校正方向、检查 SVG 并栅格化；符合要求的 JPEG/WebP 可保留原字节，其余优先无损 PNG，必要时按公开规则缩小。密集文字仍受供应商内部图像处理影响。
- **基线生成参考图用于识图和规划，未直接送入最终生图接口；此轮没有把生成流程改成编辑流程。** 基线精修仅传一张原图；分析后重绘路径只在前置识图看到原图。
- 新精修辅助图复用 `ReferenceUploadPanel`、上传校验、预览、prepare/PUT/finalize 及原文件处理。辅助图可注明内容、布局、配色、风格和说明。与原图一起到达最终编辑接口，原图固定为图片 1。数量、字段不兼容均拒绝；不截断或静默忽略。
- 新精修控制路径只校正方向并转换无损 PNG，不自动缩小像素。单张保守提交 4 MiB、4096 px、8 MP；原图/参考图/遮罩合计 Base64 加请求余量须在 20 MB 内。转换后超限保留原文件并拒绝；SVG 栅格化不保留可编辑矢量对象。任务创建时冻结私有快照，历史任务图片也先校正方向并冻结，确保遮罩与最终原图像素一致；之后删除上传草稿不会改变已提交任务。
- 切换型号保留原图、辅助图、用途、说明、遮罩、结构化表单、指令、尺寸和比例。不兼容时明确阻止提交，不替换渠道/型号。账号或 API 地址变更会清理相关临时状态。

## 精修能力矩阵

所有“支持”均表示**代码与模拟链路完成**；尚无真实付费推理效果证据。原图占一个模型输入图片名额。产品辅助图上限为 8，实际按下表收紧。

| 渠道 / 精确型号 | 辅助图 | 遮罩 | 原生结构化指令 | 尺寸/组合约束 | 官方依据 |
| --- | --- | --- | --- | --- | --- |
| fal `bria/fibo-edit-1.5/edit` | 最多 3（总 4） | 支持画笔、笔刷大小、橡皮、撤销、清除 | `structured_instruction` 对象字段；自然语言/简洁表单映射 | 单图/遮罩继承原图尺寸，须 auto；多图可选 9 种明确比例。遮罩不能与辅助图同用 | [BRIA API](https://fal.ai/models/bria/fibo-edit-1.5/edit/api) |
| Replicate `qwen/qwen-image-edit-plus` | 最多 2（总 3） | 未开放 | 未开放 | 按该型号已审定尺寸接口；3 张是图研结合官方建议的保守产品限额，不声称是服务硬上限 | [Qwen 编辑](https://replicate.com/qwen/qwen-image-edit-plus) |
| Runware `alibaba:qwen-image-edit@2511` | 最多 2（总 3） | 未开放 | 未开放 | 512–2048 px、16 对齐；图研 1K/2K 合法组合；auto 比例明确按 1:1 输出 | [2511 API](https://runware.ai/docs/models/alibaba-qwen-image-edit-2511) |
| 腾讯 TokenHub `hy-image-v3` | 最多 2（总 3） | 未开放 | 未开放 | 每边 512–2048、总面积不超过 1024²；图研 1K 合法组合；auto 按 1:1 输出 | [当前 HY 生图 API](https://cloud.tencent.com/document/product/1823/135745) |
| 其他已接入型号 | 本轮不开放新增控制 | 不凭厂商能力统一开放 | 不用 JSON 提示词伪装 | 保留已有单图编辑/分析后重绘，并拒绝携带不支持的控制 | 以现有型号契约为准 |

BRIA 遮罩按原图校正方向后的真实宽高导出不透明黑白 PNG：白色修改、黑色保留；灰度、透明、全黑、尺寸不符在调用前拒绝。边界附近仍可能被模型改变，不承诺像素级区域外完全不变。BRIA 表单映射至正式的 `objects[].description/shape_and_color/relationship`、`context`、`edit_instruction` 等字段；保存提交表单和供应商返回结构化信息。结果仍是像素图，不承诺独立文字、箭头或矢量图层。

## 三个新增渠道的具体角色

| 渠道 | 本轮新增精确 API ID | 角色 / 价值 | 协议与限制 |
| --- | --- | --- | --- |
| 小米官方 MiMo | `mimo-v2.6-pro`、`mimo-v2.6-flash` | 两者均主模型+识图；Flash 作为成本候选，Pro 用于复杂规划 | Bearer、Chat Completions、非流式，显式关闭 thinking、最多 8192 输出 token；不新增生图角色。新模型专属图片限额尚待进一步账号核验，暂用平台保守额度 |
| 腾讯 TokenHub（运营方腾讯；本轮选择腾讯研发模型） | `hy3`、`hy-vision-2.0-instruct`、`hy-image-v3` | HY3 文本规划；HY Vision 主模型+识图；HY Image 生图+精修 | 文本为 Chat Completions；图像为专用同步 `/v1/wand/hunyuan-image/v3-generation`，不能用通用 Images API 替代 |
| Runware（API 运营方；模型研发方 Google/Alibaba） | `google:gemini@3.1-flash-lite`、`alibaba:qwen-image@2512`、`alibaba:qwen-image-edit@2511` | 文本+识图、生成、编辑三个明确 SKU；主要增加渠道/费用与异步恢复选择，已有相同模型家族时不宣称全新研发模型覆盖 | 原生 `textInference` / `imageInference`、AIR ID、Bearer、UUID v4、异步 `getResponse`；未使用其 OpenAI 兼容入口 |

MiMo 的 **2026-09-22 V2.6 发布**已由[官方更新日志](https://mimo.mi.com/docs/en-US/updates/model)与[当前 API 型号列表](https://mimo.mi.com/docs/en-US/api/chat/openai-api)交叉核对。`mimo-v2.6-pro-ultraspeed` 的限额为定制服务，先不登记为普通可调用型号；普通 Pro/Flash 的文档限额为每账号每模型 100 RPM / 10M TPM，具体以账号为准。[限流文档](https://mimo.mi.com/docs/en-US/api/guidance/rate-limit)。不把旧 V2.5 的即将下线信息套在 V2.6 上，不自动替换用户旧路线。

HY4 Preview、HY Image 3.5 Preview、其他大量重复托管模型未纳入本轮。HY Image 3.5 的接口、图片名额和尺寸不同，不能借用 v3 参数假称完整兼容。Runware 的 Qwen 2512 只开放本轮核对的文生图，未因其模型页列出其他输入就自动开放所有编辑能力。

## 请求、恢复与费用

- Runware 先持久化 UUID，再仅提交一次；超时/丢响应只按原 UUID 查询。查询使用渐增等待并尊重 Retry-After，单次等待窗口 10 分钟；新渠道的提交请求同样有 10 分钟上限，超时不重发。文本与图片都保存返回结果，下载失败恢复下载。输入使用内联 Data URI，不另建重复上传任务。[任务轮询](https://runware.ai/docs/platform/task-polling)、[文本示例 AIR ID](https://runware.ai/docs/models/google-gemini-3-1-flash-lite/examples)。
- 腾讯 HY 图像输入为 source-first 的原始 Base64 列表，`revise:false` 避免平台再改写已经确认的科研指令。同步回包的请求 ID、用量和图片 URL 原子保存；回包丢失时没有已核实的查询接口，因此停止重放并要求核对渠道记录。已知 URL 的下载失败只重下载；URL 文档有效期 12 小时，过期不重新生成。[当前 HY 文档](https://cloud.tencent.com/document/product/1823/135745)。
- MiMo/HY 文本同步错误或结果未知也不自动重复 POST；不把截断输出当成完整规划。429 或权限错误保留可核查的中文提示。无后台“切换另一个模型继续”。
- fal/Replicate 已返回的任务 ID、状态和结果地址进入同一持久恢复机制；在收到 ID 前丢失应答则停止重放。恢复原任务复用已完成步骤，跨模型混合流程也保留原路线。修复 Web 恢复同一个 job ID 后未重新启动轮询的问题；兼容旧观猹记录缺少 `recovery.channel` 的情况。
- `providerCalls` 分开记录公开价格来源/核查日期（文本另含参考费率）、估算费用、供应商返回用量/费用、实际核对账单。未核对账号费率时 `estimatedCost=null`，未对账时 `invoiceCost=null`；Runware `cost` 仅标为 `provider-response`。HY `tokenhub_usage` 是用量，不直接伪装为账单。公开费率见[渠道调研](2026-09-22-domestic-channel-research.md)。
- 新增渠道与 fal/Replicate 的任务恢复沿用 AES 加密快照和 7 天 TTL，需要现有 `TOKENDANCE_ENCRYPTION_KEY` 服务配置；不需要连接观猹账号。无新环境变量。浏览器密钥仍在当前会话；任务恢复所需凭据在服务端加密保存。旧 Laf 缺少持久恢复钩子时，Runware/TokenHub 图像调用在发送前拒绝。Runware 请求纳入现有海外出口；小米和当前腾讯入口不自动切换地区或账号。

## 跨端与验证

共享字段：`refineInputs`、`refineInputMetadata`、可选 `capabilities.refineControls`、`refineControlsContractVersion=1`、`providerCalls` 的费用分层、扩展 `recovery.channel`；请求封装与公开记录同步。新增 `runware-text` 协议标识，避免把原生文本接口误标为 OpenAI 兼容。旧客户端无新增字段仍可单图精修；BRIA 单图的无效尺寸选择会明确拒绝。

Web 实现全部新精修控制。小程序同步目录、渠道指南、TS/JS、视觉输入策略与共享契约，兼容新渠道任务恢复、加密保存提示和调用记录展示；**本轮未新增小程序原生辅助参考图、遮罩和结构化表单 UI**，这部分待办已在 SYNC 记录。其他保留端未发布新界面。没有后台/前端发布、微信上传、PR 或 push。

自动化结果、浏览器截图及重现方式见 [验收记录](/Users/a1-6/.codex/artifacts/tuyan-refine-channels-20260922/qa/README.md)。浏览器通过真实本地 Web → Gateway → Core → 供应商替身，覆盖上传/删除/用途说明、遮罩画擦撤销清除、不兼容提交、切换模型保留输入、原生结构化字段、失败与同任务恢复、桌面和窄屏；不是供应商实测。

尚未确认：各新增渠道账号是否持有所选模型调用权、余额、区域权限、实际速率/并发和最终费用；新模型科研图 OCR/关系保真/编辑质量；MiMo V2.6 精确图片硬限额；Runware/腾讯账号适用的数据保留与合同条款；UltraSpeed 定制条件。公开资料和本地通过不能解除这些缺口。
