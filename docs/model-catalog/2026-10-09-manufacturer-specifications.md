# 厂商官方规格补全与渠道差异复核

核查截止：2026-10-09（Asia/Shanghai）。接续 `26424cb`，独立分支 `codex/model-catalog-20261009`。本轮为目录规格与卡片展示补全；没有新增可选身份、改默认、扩大调用能力或调整请求额度。

- [41 项逐项核查表](2026-10-09-manufacturer-specifications.csv)：精确渠道/API ID、原厂映射、输入/输出上限、差异、来源、日期、适配状态和缺口。
- [32 个公开来源的快照索引与 SHA-256](../../config/channel-audit/catalog-20261009-manufacturer-evidence.json)。原始页面保存在索引指定的本机 artifact 目录；全部公开 GET，无密钥。
- [上轮适配与验收](2026-10-09-adaptation.md)仍有效；本轮不把原厂文档参数当成新的渠道适配或真实调用证据。

## 新增证据与纠正

### Google：逐个型号取官方参数页，不从 AA 抄数值

以下均为 **输入上限 / 输出上限**，单位 tokens。Google API 的 `inputTokenLimit` 与合计上下文不是同一字段，故不把最大输入冒充合计上下文。

| 官方 API ID | 最大输入 | 最大输出 | 原厂模态 / 思考 | 来源 |
|---|---:|---:|---|---|
| gemini-3.8-flash | 1,048,576 | 65,536 | 文本/图像/音频/视频 → 文本；思考 | [参数页](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash) |
| gemini-3.7-flash | 1,048,576 | 65,536 | 同上；不接受 minimal 思考档位 | [参数页](https://ai.google.dev/gemini-api/docs/models/gemini-3.7-flash) |
| gemini-3.6-flash | 1,048,576 | 65,536 | 文本/图像/音频/视频 → 文本；思考 | [参数页](https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash) |
| gemini-3.5-flash-lite | 1,048,576 | 65,536 | 同上 | [参数页](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite) |
| gemini-3.5-flash | 1,048,576 | 65,536 | 同上 | [参数页](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash) |
| gemini-3.1-flash-lite | 1,048,576 | 65,536 | 同上 | [参数页](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite) |
| gemini-3.1-pro-preview | 1,048,576 | 65,536 | 同上；预览版 | [参数页](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-pro-preview) |
| gemini-3-flash-preview | 1,048,576 | 65,536 | 同上；预览版 | [参数页](https://ai.google.dev/gemini-api/docs/models/gemini-3-flash-preview) |
| gemini-2.5-flash | 1,048,576 | 65,536 | 同上；现有限制见下文 | [参数页](https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash) |
| gemini-2.5-flash-lite | 1,048,576 | 65,536 | 同上 | [参数页](https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-lite) |
| gemini-2.5-pro | 1,048,576 | 65,536 | 同上 | [参数页](https://ai.google.dev/gemini-api/docs/models/gemini-2.5-pro) |
| gemini-nano-banana-2.1 | 131,072 | 32,768 | 文本/图像/视频 → 文本/图像；思考 | [参数页](https://ai.google.dev/gemini-api/docs/models/gemini-nano-banana-2.1) |
| gemini-3.1-flash-image | 131,072 | 32,768 | 同上 | [参数页](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-image) |
| gemini-3.1-flash-lite-image | 65,536 | 4,096 | 同上；独立较小输出上限 | [参数页](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite-image) |
| gemini-3-pro-image | 65,536 | 32,768 | 文本/图像 → 文本/图像；思考 | [参数页](https://ai.google.dev/gemini-api/docs/models/gemini-3-pro-image) |
| gemini-2.5-flash-image | 65,536 | 32,768 | 文本/图像 → 文本/图像；明确不支持思考 | [参数页](https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-image) |

文件格式与模态分列：PDF 不列为新模态；图片理解的 PNG/JPEG/WebP/HEIC/HEIF 来自 [GenerateContent 图片理解文档](https://ai.google.dev/gemini-api/docs/generate-content/image-understanding)。该协议允许最多 3,600 张图片，内联请求总大小上限 20MB；这些是原厂理解接口限制，不能套用为图像生成端点或图研上传额度。图研现有限制保留。

Google 2.5 Flash / Flash-Lite / Pro 页面明确限制为过去活跃使用过该系列的用户，并说明尚未弃用。目录保留旧选择，详情补账户限制；不推断 Replicate 也有相同账户限制。图像生成和原图编辑仍由已有逐端点能力合同决定；没有因“输入输出均含图像”新增编辑角色。

### 聚合渠道与原厂必须分开

| 渠道 / 精确 API ID | 原记录缺口或易错点 | 本轮证据与结果 |
|---|---|---|
| Replicate / google/gemini-3.5-flash、google/gemini-2.5-flash | 渠道 schema 没有上下文，卡片只显示待确认 | 增加 Google 最大输入参考；渠道最大输出 **65,535** 与 Google **65,536** 分列，图研每请求仍 8,192。Google 思考字段不覆盖 Replicate 枚举。 |
| Replicate / google/gemini-3-flash | 渠道 ID 不含 preview | 官方参考为 gemini-3-flash-preview，但底层修订映射没有确认；仅详情展示，不在摘要中当作匹配型号参数。 |
| Replicate / google/nano-banana-2.1 | 缺原厂 token 参考 | 加原厂 131,072 输入 / 32,768 输出；不写成渠道 token 限制，图像摘要不强填上下文。 |
| Replicate / qwen/qwen3-7-plus；TokenDance / qwen3.7-plus | 未补厂商资料 | [阿里官方](https://help.aliyun.com/zh/model-studio/qwen3-7-plus)：上下文 1,000,000；输出 131,072；非思考/思考输入分别 991,808 / 983,616。Replicate 输出仍 65,536；官方视觉/视频能力不自动成为图研此渠道角色。百炼同型号用自身官方 API 资料直接补全。 |
| Replicate / qwen/qwen3-235b-a22b-instruct-2507；百炼同型号 | 思考未知、上下文未补 | [Qwen 官方模型卡](https://huggingface.co/Qwen/Qwen3-235B-A22B-Instruct-2507)：仅非思考，原生 262,144；1,010,000 需额外部署配置。推荐输出 16,384 不是模型最大值；Replicate 上限另由 schema 确认。原厂“不支持思考”和渠道“无已确认控件”分开。 |
| Replicate / deepseek-ai/deepseek-v3.1 | 上下文未知 | [DeepSeek 模型卡](https://huggingface.co/deepseek-ai/DeepSeek-V3.1) 标称 128K；[配置](https://huggingface.co/deepseek-ai/DeepSeek-V3.1/raw/main/config.json) 为 163840 位置长度，后者不是 API 窗口保证。参考显示约 128K，渠道值不变。 |
| Replicate / moonshotai/kimi-k2-thinking；百炼 kimi-k2-thinking | 上下文未知 | [月之暗面模型卡](https://huggingface.co/moonshotai/Kimi-K2-Thinking) 与[配置](https://huggingface.co/moonshotai/Kimi-K2-Thinking/raw/main/config.json)支持原生 262,144；评测思考预算不作为最大输出。 |
| TokenDance / kimi-k3、kimi-k2.7-code、kimi-k2.6 | 只有渠道窗口，原厂差异不明 | 增加月之暗面官方参考。K3 原厂“100 万”和渠道 1,048,576 保持各自原值。[K2.7](https://platform.kimi.com/docs/guide/kimi-k2-7-code-quickstart) / [K2.6](https://platform.kimi.com/docs/guide/kimi-k2-6-quickstart) 的 32,768 是默认输出，不能补成最大输出。官方格式、100M 请求体和 base64 限制放详情，不继承为渠道能力。 |
| TokenDance / mimo-v2.6-pro、mimo-v2.6-flash | 缺原厂输出/思考参数参考 | [小米 API](https://mimo.mi.com/docs/zh-CN/api/chat/openai-api)给出 max_completion_tokens 1–131,072（含思考），thinking.type enabled/disabled；仅补参考，不认定 TokenDance 支持透传。小米直连同步补准确说明。 |
| TokenDance / mimo-v2.6-ultraspeed | 变体名称和直连 ID 混淆风险 | 小米 API 枚举及[型号页](https://mimo.mi.com/models/zh-CN/mimo-v2.6-pro-ultraspeed)已确认 **mimo-v2.6-pro-ultraspeed**；型号页 RPM/TPM 仍为定制服务。TokenDance ID 少 pro，映射待确认，不自动改名或新增直连可选项。 |
| TokenDance / ling-3.1-flash | 1M/256K 冲突 | [蚂蚁官方](https://developer.ant-ling.com/zh-CN/docs/models/ling/)区分模型上限 1M 与官方服务当前 256K。TokenDance 精确端点 256,000 保留；原厂服务窗口不能证明直连 API ID 或可调字段。 |

本轮未重新扩大 fal / Replicate 图像端点或硅基流动的接入范围；上轮逐渠道 schema 证据仍为调用合同。本轮没有新增、停用或替换型号。

## 实现、兼容与合并

- 唯一来源仍为 `config/model-specifications.json`：规格行 61→80，实际更新/新增 41 行。目录版本 `2026-10-09.v31`，静态身份仍 1,079。
- `ModelSpecifications` v1 增加可选 `manufacturer` 和 `inputFormats`。manufacturer 有独立型号、匹配状态、日期、来源和数值。旧数据缺字段仍可正常显示未知。
- 渠道上下文/输入上限优先；只有确认型号匹配的原厂参考可在摘要后备展示，并明示“原厂参考 · 渠道待确认”。`reference-only` 仅在详情显示。原厂思考/模态不会赋给调用能力或控件。
- 详情使用完整整数 tokens；最大输入、合计上下文、最大输出分列；文件格式单列，图像型号不强填上下文。参数不参与请求构造。
- 对 26424cb 的 1,079 个条目移除规格字段后作全量相等比较：身份、默认、角色、能力、版本、请求元数据均一致。
- 与 4.0 的潜在冲突限于 ModelSpecifications 组件、i18n、可选共享类型、生成器和目录生成区。合并时先合并源配置和组件局部修改，再生成 Web/Core；不要整文件覆盖 runtime handler 或 4.0 的设置组件。
- 小程序保持暂停：使用 `--skip-miniprogram`，219 文件哈希不变。共享类型/源配置已有变化，但小程序未同步、未构建、未跑测试、未验收或发布。

## 验证

- Web 完整测试 **598/598**；新增原厂/渠道隔离、准确输入与合计上下文、错配变体不进摘要、Qwen 非思考、无效参数、Kimi 默认额度和 DeepSeek 配置容量等用例。
- Core 受影响目录与注册表测试 **198/198**；`tsc --noEmit` 与 Core 构建通过。生成器 `--check --skip-miniprogram` 无漂移。
- Web 构建通过；仍有已有的大 chunk 提示，本轮没有扩大到打包重构。
- 真实浏览器、本地 Web + 模拟 registry：1440px、390px、320px卡片，键盘 Enter、移动端点击、展开/收起、参数差异、未知变体和横向溢出检查通过。模拟数据来自本轮生成目录，不含账户密钥。
- 本轮不包含模型真实调用、账户权益、付费探测、生产部署、充值、密钥操作或微信发布。

[机器可读验收结果](2026-10-09-manufacturer-validation.json)。界面证据：[320px 摘要](2026-10-09-manufacturer-assets/summary-320.png)、[390px 原厂详情](2026-10-09-manufacturer-assets/manufacturer-390.png)、[Google 直连桌面详情](2026-10-09-manufacturer-assets/google-1440.png)。完整本地 QA 脚本及截图在工作树 `output/playwright/manufacturer/`；浏览器接口为模拟响应。

## 剩余缺口与下一步证据

1. Ling 3.1 直连：已查型号页、索引与 quickstart；后者仍展示 3.0 示例。仍需明确的 3.1 请求枚举/官方调用示例、输出上限与思考 schema，不能由文档标题猜 API ID。
2. TokenDance MiMo 视觉/思考控制与最大输出：原厂参数已补，但还需 TokenDance 对精确模型的字段透传规则、图片 schema 与端点限制。Kimi 默认额度也不能填成渠道最大输出。
3. Gemini 3 Flash 的 Replicate 底层修订、TD UltraSpeed 的 pro 变体：需要渠道声明或带模型版本的 API schema；暂只列原厂参考。
4. Kimi K3/K2.7/K2.6、K2 Thinking 与 DeepSeek V3.1 的部分最大输出仍缺独立上限证据。已排除将默认值、评测预算和权重配置位置长度冒充服务上限。
5. Cogevol 三个渠道 ID 的原厂权重映射仍不明确；论文/开源项目同名不足以建立与 base / interactive-0828 / slide-0828 的一一映射，不能填其他尺寸模型的参数。待渠道发布对应原厂版本及参数表后补全。

所有真实账户调用均未验证；本轮“完成”仅指公开文档核查、信息数据/界面实现及本地模拟验收。
