# v4.0 工作流：上一版 PNG 输入能力审计

审计日期：2026-10-09（Asia/Shanghai）。源码审计基线：本工作树 `5e6989f`，下文行号对应审计时源码，后续实现可能移动行号。

范围：普通生成工作流后续轮次向**原选定图像渠道及型号**传入“上一版 PNG + 完整修订提示词”。本报告只核查本地适配器、已记录的逐型号契约和公开官方文档，不执行真实推理，不验证账户权益、额度、地区可用性、收费或输出质量。

本文的“当前”与缺陷列表描述审计基线，不代表修复后的状态。4.0.0 已落实的能力 helper、严格尺寸校验、识图副本缩放和 Wan2.7 长度拒绝，及对应本地验证，见[实现与验收记录](2026-10-09-validation.md)。

## 结论与能力语义

现有适配器中已有多条真正发送单张源图的路径，可以复用。但目录中的 `referenceImages`、`imageEditing` 或尺寸表中的 `editing` 均不能单独证明某一工作流组合可用。必须交叉验证型号身份、生命周期、实际传输分支、无蒙版的单图操作和当前尺寸参数。

本次能力应称为“以上一版图片为参考生成”或“参考上一版图片迭代”。它不承诺像素级保留、不等于蒙版局部编辑，也不代表各渠道会保持原图尺寸。`imageEditMode: direct-edit` 是当前代码的输入路由分类，不能被翻译成这些额外保证。

证据必须分层记录：

| 层级 | 可以得出的结论 | 不能得出的结论 |
| --- | --- | --- |
| `audited-contract` | 具体型号的已审核契约和本地 adapter 都支持单源图传输 | 用户账户已经能调用、收费已核对、生成质量已验收 |
| `user-declared` | 用户明确声明 `imageEditing`，且已有 adapter 分支真实发送单源图；按其配置限制可以执行 | 官方已验证、自定义服务实际遵循该协议 |
| `unknown` | 型号、协议或源图传输证据不足 | 支持上一版图片输入 |
| `unsupported` | 已有证据证明当前组合不接受源图，或需要缺失的 mask、尺寸不兼容、操作不可用 | 可通过悄悄删图、降尺寸或换模型实现同一请求 |

自定义接入不能仅因其为用户配置就一律禁用。合法、明确声明能力且本地协议适配器确实发送单源图的配置可按 `user-declared` 执行，UI 和执行记录必须保留这个证据级别。

后续轮次若选择按完整修订提示词重画，应记录原因，并明确显示“本轮未传入上一版图片”。不得把文本重画记录为参考图迭代，不得为了获得源图能力自动切换渠道或型号。

## 主要内置渠道

业务入口：`apps/paperbanana-api/runtime/handler.ts` 的 `callImageModelRaw`（审计时 7600–7720 行）。

| 渠道 / 精确身份范围 | 源图在请求中的位置 | 条件与限制 |
| --- | --- | --- |
| TokenDance：目录中的 `seedream-5.0-pro`、`seedream-5.0-lite` | `handler.ts:7646–7660` → `tokenDanceImageBody`，`POST /gateway/ark/v3/images/generations` 的 `image: [dataUrl]` | 本地传输已接通。`packages/api/src/tokendance.ts:150–161` 校验型号、提示词和输出尺寸。保留原有 live-model/protocol 校验；本次官方 TokenDance 模型页未成功抓取，不能声称最新渠道可用性已验证。 |
| Ark：目录中的 `doubao-seedream-5-0-pro-260628`、`doubao-seedream-5-0-260128`、`doubao-seedream-4-5-251128`、`doubao-seedream-4-0-250828` | `handler.ts:7723–7757`，`POST /api/v3/images/generations` 的 `image: [source.dataUrl]` | 单参考图生成。按具体型号和编辑尺寸 contract 验证，不能将其他型号或 TokenDance 的能力合并推断到 Ark。未接 mask 或交互坐标编辑。 |
| OpenAI：当前目录中的 GPT Image 1 / mini / 1.5 / 2 / 2.5 及 `chatgpt-image-latest` | `handler.ts:7663–7665` → `callOpenAiImageEdit:8197–8226`，`POST /images/edits` multipart `image` + `prompt` | 本地发送真实图片文件，不是仅附加图片描述。当前 adapter 未发送 mask 或额外参考图。旧型号仅有约 1K 的三种标准尺寸，GPT Image 2/2.5 使用独立像素 contract；不得从新型号继承尺寸。 |
| Gemini：`gemini-3.1-flash-image`、`gemini-3.1-flash-lite-image`、`gemini-3-pro-image` | `handler.ts:8366–8387`，Interactions `input` 中 `{type:'image', mime_type, data}` | 原选定型号 + 完整 prompt。显式 `response_format` 控制输出，不承诺原图像素尺寸。各型号分辨率与比例分别校验。 |
| Gemini：`gemini-2.5-flash-image` | `handler.ts:8390–8417`，`generateContent` 的 `parts[].inlineData` | 独立旧协议分支，1K 限制不能因其他 Gemini 型号支持 2K/4K 而放宽。 |
| Bailian：Wan2.7、Qwen2/3 及目录内明确支持编辑的同步型号 | `handler.ts:8539–8579`，`input.messages[0].content[].image` + 单个 `text` | `wan2.7-image-pro` 生成可 4K，图像输入场景最高 2K；当前完整流程如选择 4K，后续源图迭代不可自动降为 2K。Qwen 与 Wan 的 size / prompt 限制分别校验。 |
| Bailian：`wan2.6-image`、已登记 Kling/Vidu 异步型号 | `handler.ts:8472–8490`，messages content 的 `image` | 只有匹配这些精确分支且目录支持的型号才可用。其他异步分支不能泛化。 |
| Bailian：`wan2.5-i2i-preview`、`wanx2.1-imageedit`、Qwen legacy edit 型号 | `handler.ts:8492–8500` 的 `images` / `base_image_url`，或同步 content `image` | 源图传输存在，但这些 edit-only 型号不能作为“无源图首轮生成 + 同一型号后续迭代”的完整流程图像型号。不能自动将生成型号切成同系列 edit 型号。 |
| Recraft：目录内允许的 V3 / V4 / V4.1（包括登记的 raster/vector 变体） | `handler.ts:7463–7473`，`POST /images/imageToImage` 的 `image_url: dataUrl` | 固定 `strength: 0.5`；编辑不发 `size`。当前编辑 profile 是 `auto/auto` 的继承模式，不能拿生成时 1K/2K + 固定比例直接续调。V2 不支持；官方当前也排除 V4.1 Flash，不可按 `recraft*` 前缀放行。 |
| OpenRouter | `handler.ts:8082–8131`，`POST /api/v1/images` 的 `input_references` | 必须由该精确模型路由声明 `input_references`。当前 model-level 参数是上游 endpoint 能力并集，不能把它当作每一个上游供应商都支持的证据。参见下方路由限制。 |
| xAI | `handler.ts:7447–7462`，`POST /images/edits` 的 `image` 或 `images` | 单 PNG wire 已接通，仍需精确目录、refine controls 和尺寸检查；不从同厂其他模型名称推断。 |
| SiliconFlow | `handler.ts:7478–7483`，`POST /images/generations` 的 `image` | 仅目录明确允许源图的型号可走该分支。Qwen Image Edit 型号为 edit-only 且输出尺寸由源图/模型决定；不能当作普通生成型号的无缝替代。 |

### 官方来源（本次打开核查）

- [火山方舟图片生成 API](https://docs.volcengine.com/docs/ark/image-generation-api?lang=zh&redirect=1)：`image` 接收 URL 或 data URL；单图参考生成与图层拆分/交互编辑分别说明。当前参考图限制为单图不超过 30 MB、总像素不超过 3600 万、每边大于 14 px、宽高比范围 1:16 至 16:1。不得套用 LakeAI 另一接入产品的限制。
- [OpenAI Images Edit API](https://developers.openai.com/api/reference/go/resources/images/methods/edit)：输入 image 和可选 mask 是不同参数。官方存在 mask 能力不等于 Tuyan adapter 已接入。尺寸规则也按型号区分。
- [Gemini 图片生成与编辑](https://ai.google.dev/gemini-api/docs/image-generation)：文本与图像可联合输入；默认尺寸与显式指定 `aspect_ratio` / `image_size` 的行为不同。
- [阿里百炼 Wan2.7 生成与编辑 API](https://help.aliyun.com/zh/model-studio/wan-image-generation-and-editing-api-reference)：文生图和图像输入场景有不同输出上限；官方提示输入文本超过 5,000 字符会截断。
- [阿里百炼 Qwen 生成与编辑 API](https://help.aliyun.com/zh/model-studio/qwen-image-generation-and-editing-api-reference)：同步 DashScope messages 图文 schema、输入图像约束与 size。当前主文档已包含更新型号，不能据此删除仍单独记录的旧型号。
- [Qwen Image 2.0 型号页](https://help.aliyun.com/zh/model-studio/qwen-image-2-0)、[Qwen Image 2.0 Pro 型号页](https://help.aliyun.com/zh/model-studio/qwen-image-2-0-pro)：确认 2.0 系列融合生成与编辑，不把新文档省略旧型号误判为不可用。
- [Recraft image-to-image](https://www.recraft.ai/docs/api-reference/tools/image-to-image)：明确 `image_url`、必需 `strength`、支持的型号；当前不支持 V4.1 Flash。[Recraft endpoint 总表](https://www.recraft.ai/docs/api-reference/endpoints) 将 image-to-image 与 inpaint/outpaint 分成不同接口。
- [OpenRouter 图片 API](https://openrouter.ai/docs/guides/overview/multimodal/image-generation)：`input_references` 支持 URL / data URL；model-level 能力为并集，per-endpoint 能力才是最终支持集合；提供 `provider.only` / `allow_fallbacks`。

TokenDance 官方来源地址为 [Seedream 5.0 Pro](https://tokendance.space/models/seedream-5.0-pro) / [Seedream 5.0 Lite](https://tokendance.space/models/seedream-5.0-lite)。本次工具无法读取这两页，`/docs` 返回 403；结论限于当前仓库契约与可见源码，不把此次读取失败改写为“不支持”，也不伪称新核验成功。

## 扩展 adapter：按契约开放，不能整渠道放行

源码：`packages/api/src/image-channel-adapters.ts`。

| 适配器 | 判定真实单源图传输的方法 | 必须排除或另行检查 |
| --- | --- | --- |
| fal / Replicate / BFL / Together | 存在 `IMAGE_CHANNEL_ROUTES[provider+'/'+model].editing` 且有 `sourceField`；`buildImageChannelBody:79–85` 按 base64、data URL 或 public URL 写入真实图像，缺字段会报错 | 精确型号 schema、必须 mask、多图最低数量、`sizeMode:'none'` / inherit。存在 editing endpoint 不意味着所选尺寸可用。 |
| Runware | `auditedChannelContract` 的 `editing`、`sourceField` 和 schema；`buildAuditedRunwareImage:104–124` 在 `inputs` 中写入图片并校验 | `runware/ideogram:4@3` 和 `runware/bfl:1@2` 必须 mask，不能用于本次无蒙版单图迭代。`singleImageInheritsSize` 型号要求 auto/auto。 |
| TokenHub | 精确 `taskType` 分支或 legacy `sourceField`；`buildAuditedTokenHubImage:126–140` 分别生成 messages、images 或 input.content | `hy-image-v3.5-preview` 的源图和 `size` 均进入 `body`，已用本地构造器及 JSON 序列化断言复核；仍需逐型号尺寸/schema 校验，不能用别的 TokenHub 型号代替。 |
| Ideogram | `300–310` 的具体 editing wire 或明确 v4 remix 分支，multipart image | 通用 edit 型号与普通生成型号不是同一身份，不能自动换型；同时检查尺寸。 |
| Stability | `315–328` multipart image、strength、mode | Core 无直接源图编辑。SD3.5 编辑继承原图，禁止指定 aspect ratio；当前 strength 为 0.65，flash 为 0.95。Ultra 为另一独立契约。 |
| SenseNova / StepFun | `packages/api/src/official-image-channels.ts:61–122` 的 PNG 校验和明确 source 字段 | Step Image Edit2 编辑保持原图尺寸；明确拒绝未核验 mask。保留原有生命周期判断：当前代码将 Step 图片服务提交截止设为 2026-10-10 00:00 中国时间。 |
| Qianfan | `packages/api/src/qianfan-image-channel.ts:65–90`，只有 `qwen-image-edit` 的 `body.image` | 该型号仅编辑；其他 Qianfan 生成型号显式拒绝 source。不能用于要求无图首轮的同型号完整流程。 |
| MiniMax / Novita | 现有生成 adapter 不提供本次通用源图编辑 | 不得把人物参考、图层输出等其他功能当作通用上一版 PNG 输入。 |

审计时 `config/image-channel-routes.json` 中有 editing 映射的条目数量：BFL 10、fal 18、Replicate 50、Together 7。这只是配置中的 wire 数量，不是本次逐一重新核验官方文档、账户权益或付费输出的数量，不应拿它当“已实测支持模型总数”。Runware/TokenHub 有专用 schema，不能仅用普通 `sourceField` 扫描计数。

可复核的官方 adapter 示例：[fal FLUX 2 Pro Edit](https://fal.ai/models/fal-ai/flux-2-pro/edit/api)、[BFL FLUX.2 编辑](https://docs.bfl.ai/flux_2/flux2_image_editing)、[Runware Qwen Image Edit 2511](https://runware.ai/docs/models/alibaba-qwen-image-edit-2511)、[Together 图片文档](https://docs.together.ai/docs/inference/images/overview)。其余逐型号来源沿用 `config/image-channel-routes.json`、`config/model-channel-schemas.json` 及 `packages/api/src/audited-channel-data.ts` 中的精确契约；本次没有把一家提供商示例外推为其所有型号均已重新核实。

## 自定义接入：保留用户声明的已有能力

`apps/paperbanana-api/src/universal-adapters.ts:128–176` 已有以下真实源图传输：

- `openai-images`：Images edit multipart `image` / `image[]`；`compatibility:'ark-images'` 则是 generation JSON 的 `image`。
- `openai-responses` + 合法 `imageTool`：`input_image`，工具 action 为 `edit`；OpenAI/Azure/xAI 各自限制仍由现有规范化器约束。
- `openai-chat` + `compatibility:'openrouter-image'`：messages 中图像内容。
- `gemini-generate-content` / `gemini-interactions`：各自原生图像 parts。
- `dashscope-multimodal`：messages.content 中的图片。
- `bedrock-invoke`：只有现有明确允许的 `stability.sd3-5-large-v1:0` 可送 `image`；需要用户配置 strength，且尺寸要求 auto/auto。

允许条件必须同时成立：

1. 通过 `normalizeUniversalRoute`，身份、地址、协议、鉴权类型与配置相容；不擅自补成其他协议。
2. 用户明确声明 `imageEditing:true`；完整流程首轮还需要 `imageGeneration:true`。
3. 命中上述实际发送单源图的 adapter 分支，不能仅依据兼容 OpenAI 或用户勾选能力推断。
4. 单图输入限额和精确输出 size 配置允许当前参数；通过实际 PNG 读取/解码与边界检查。
5. 不要求未提供的 mask 或其他输入；保留请求防重、加密恢复与受控出口校验。

满足时返回 `supported` 且 `evidence:'user-declared'`，UI 文案可为“按当前自定义接入配置支持参考上一版；实际服务能力由该接入决定”。不能显示“官方已验证”。没有命中传输协议或声明缺失时应返回 `unknown` / `unsupported` 并给原因，不自动剥夺其他合法配置的能力。

入口 `handler.ts:3857–3867` 会将源图转换成 `sourceImages` 交给 Universal runtime；runtime 的 `354–355` 会检查 imageEditing 并准备图像。现有 `universalRefineControls` 未覆盖的普通单图场景，不应仅因 controls 为 null 就拒绝：`refineInputIssue` 的默认单图语义允许无额外引用、无 mask 的输入。

## 已定位的缺陷和容易误判的位置

### 1. 编辑分辨率可能被静默替换

`handler.ts:7619–7621`：当 `strictImageSize=false` 且请求分辨率不在编辑支持集合时，会优先改成 2K 或第一个支持值。新工作流必须在进入请求前严格校验，并调用严格模式；不能先收费生成首轮后才发现下一轮必须换尺寸。

`requestNativeProviderImage:7442–7444` 和 OpenRouter resolution 选择也有默认选值逻辑。前置校验应覆盖这些分支，并确保原始选定参数未改变。

### 2. 更正：TokenHub hy35 的 size 正确进入请求体

初稿误读 `packages/api/src/image-channel-adapters.ts:134` 的紧凑对象表达式，将 `size` 误判为顶层字段。本次直接调用实际 `buildAuditedTokenHubImage` 构造器并检查序列化对象，确认结构为 `{ endpoint, body: { model, messages, size } }`。调用端提交 `prepared.body` 时，源图和 size 都会被发送。**原“size 丢失”结论撤回，不得据此排除此型号。**

复核使用本地合成的 1024×1024 PNG，输入 `size:'1365x768'`，未调用任何 provider。实际断言结果：

```json
{
  "topLevelKeys": ["endpoint", "body"],
  "bodyKeys": ["model", "messages", "size"],
  "serializedSize": "1365x768",
  "sourceImagePresent": true,
  "providerCalls": 0
}
```

另断言 `Object.hasOwn(result,'size') === false`，以及序列化前后 `body.messages[0].content[1].image_url.url` 是原 PNG data URL。该证据仅证明适配器传输结构正确，不是远端尺寸或输出质量验收。

### 3. Bailian 通用异步生成分支不发送 source

`handler.ts:8501–8505` 的兜底 text2image 分支只构造 `{prompt}`。当前 `callImageModelRaw:7639–7643` 对非 direct-edit 型号的拒绝可以阻止错误源图调用；新 helper 不得绕过此条件。不能因为尺寸表有 editing profile 就开放 `wan2.5-t2i-preview` 等生成专用型号。

### 4. 完整提示词可能在服务端被截断

Wan2.7 官方文档说明超过 5,000 字符会截断；`callBailianImage` 当前没有对应长度前置检查。修订提示词必须受具体型号/接口上限约束，超限应明确拒绝该参考图调用或在正式模型规划阶段生成符合限制的完整提示词；不可静默截断后宣称“完整提示词已发送”。不同渠道的字符计数和 token 限额不能混用。

### 5. 单 source 参数不能代表多参考图或 mask 已接通

TokenDance/Ark/OpenAI/Gemini/Bailian/OpenRouter 上述路径消费单个 `source`，不消费传入的 `edit.references` 或 `edit.mask`。本次单 PNG 工作流可复用；不能顺便宣布这些 adapter 已接入辅助参考图或蒙版。

`normalizeSourceImage:8173–8178` 在空 base64 data URL 时返回 null。迭代输入应来自已验证的上一版 PNG 字节，并在缺图时停止参考图操作；不能让 null 继续变成文生图。

### 6. OpenRouter 渠道身份与其内部供应商不是同一层

当前 adapter 检查 model-level `supportedParameters`（官方定义为 endpoint 能力并集）。除 MAI 特例外，没有固定 `provider.only`。如果产品要求只保持 `accessProvider:'openrouter'` 和 `modelId`，应准确记录这个范围；如果要求连 OpenRouter 内部供应商也保持不变，则必须读取精确 endpoint 能力、固定 `provider.only` 并禁用 fallback，当前实现不能保证。

## 建议的能力 helper 与执行前置校验

```ts
type IterationSourceCapability =
  | {
      status: 'supported'
      operation: 'reference-image-generation'
      sourceCount: 1
      requiresMask: false
      provider: string
      modelId: string
      transport: string
      evidence: 'audited-contract' | 'user-declared'
      sizePolicy: 'requested' | 'inherits-source'
    }
  | {
      status: 'unsupported' | 'unknown'
      code: string
      reason: string
    }

resolveIterationSourceCapability({
  route,              // 冻结 provider/model/custom，不返回替代路由
  registryEntry,      // 服务端目录，不信任客户端 capability
  aspectRatio,
  resolution,
  now,
}): IterationSourceCapability
```

建议按以下顺序执行：

1. 准入时冻结原 route 和请求身份；验证可选性、生命周期、地区。普通完整流程要求首轮生成能力，不把 edit-only 型号偷换进来。
2. 对内置型号要求 image 角色、`imageGeneration`、`imageEditMode:'direct-edit'`，并交叉检查精确 adapter source wire。对 custom 使用上文 user-declared 条件。
3. 调用 `refineInputIssue(refineControlsFor(...), {version:1}, ratio, resolution)` 或对应 custom controls。拒绝 `maskRequired`、多图最低数量大于 1、single-image-inherit 与参数冲突。controls 为 null 不代表单图一定不支持，仍依据实际 wire。
4. 使用 `resolveModelImageSize(..., true)` / `assertRouteImageSize(..., true)` 严格检查编辑尺寸，同时核对确实发送的尺寸字段或继承策略。拒绝静默 fallback；`auto` 按原契约处理，不称其必然等于原图尺寸。
5. 每轮读取上一版实际 PNG，校验有效字节、宽高、像素数、字节数、比例、颜色/透明度等该渠道约束。元数据不能代替图像内容；读取/解码失败不得降成空 source。
6. 校验完整修订提示词的精确接口限制；保持 prompt 非空、未截断。将 source hash、提示词 hash、route 身份和采用/未采用源图的原因写进已有执行记录/指纹。
7. 最终调用传递 `strictImageSize:true`，保留已有 durable checkpoint、unknown 不重发和恢复规则。源图能力不可用时若产品选择文本重画，明确记录并显示该降级，route 身份仍保持不变。

最低有效回归应验证最终序列化请求，而非只验证 helper 的布尔结果：TokenDance/Ark/OpenAI/Gemini/Bailian 源图字段；未知型号拒绝；生成专用型号拒绝；mask-required 拒绝；Wan Pro 4K 编辑不降为 2K；Recraft 固定参数与继承尺寸；TokenHub hy35 size；custom 合法 user-declared 单图允许、缺声明/无 adapter 拒绝；每轮 route 不变；缺失/无效源图不变成静默文生图；超长完整提示词不截断。

## 本次没有完成的验证

- 没有逐一请求所有模型的最新官方目录，也没有真实账号或推理调用；本报告不输出“所有模型实测可用”的结论。
- 没有验证付费、额度、地区权限、最终画质、局部内容保持或生成成本。
- 没有修改 adapter、工作流或共享契约。新增实现应在 `SYNC.md` 另记，并用模拟传输和对应客户端验收完成闭环。
