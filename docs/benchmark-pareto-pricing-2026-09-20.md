# 图研帕累托视图：官方 API 价格核对（2026-09-20）

本表使用当前正式公开榜单 46 个模型，保留原评分、评语、图片、实际费用和历史证据。仅查询公开文档/元数据、读取原产物和参数，没有新增生图、评测或付费推理调用。Riverflow V2 Pro 和 codex:gpt-image-2 不在本表，不会重新入榜。

范围复核结果：**28 个可复算，1 个仅估算，16 个单价已知但关键条件缺失，1 个直营官方价格仍待确认**。18 个是首次暂定结果；复核 Recraft 的准确变体、生成/编辑接口和计费项后新增 10 个。只有可复算的 28 个进入默认成本散点和前沿。估算值独立标注，不与可核验值混排。

成本 = 原题集 6 道生成报价与 3 道单源图编辑报价之和 ÷ 9，每题单张，题位等权。源图固定为 2048×1152；生成不附参考图。按原模型请求分辨率、实际产物像素、质量档位和版本选择当前官方标准报价。原评测各模型分辨率不同，此口径是原题集的标准报价，不是统一分辨率重测；不累计历史重试、折扣、优惠或账单费用。失败题不视为免费，也不改成按成功张数平均。

先使用厂商直营标准价格。原渠道 ID 无法与直营准确版本对应时，列出已核实的渠道报价以供核查，但不套用同系列直营价。CNY 使用 ECB 2026-09-18（最近工作日）EUR/USD=1.1460、EUR/CNY=7.6755：CNY × 1.1460 ÷ 7.6755 = USD；这是参考汇率，不含账户汇兑/税费。价格和 FX 均用精确有理数计算，最后格式化显示。官方单张价如已包含输入，则明确标注包含；未知输入费不按 0。

前沿仅比较当前搜索、供应商、价格范围和评分维度筛选后的可复算模型。不受另一个模型以“不更高成本、不更低分数、且至少一项严格更好”支配即为前沿。同价同分的不同模型同时保留，图上合并同坐标标记；使用未四舍五入的分数和精确价格。缩放/线性-对数刻度只改变视窗，不改变前沿计算范围。

官方计算器复核：OpenAI 的输出 token 计算器明确要求显式 quality/size，并只估算输出费用。原 3 个 GPT Image 模型均为 quality=auto，因此没有擅自选择档位或记录与原条件不符的计算器结果。Grok 2.0 的 $0.07 仅根据官方当日公布的 auto 路由规则手工复算，列为估算，不是历史实际 quality 的确认。Google 固定输出 token 数（和 Pro 固定输入图 token 数）已用于核实费用组成；3.x 默认思考费不能省略。MAI 的像素/上下文上限不等于 token 用量，也不能使用别的模型的图像 token 公式。

定价数据独立保存在 `apps/web/src/data/benchmarkOfficialPrices.json`，不读取历史 `actualCost` 字段。仅连接当前公开模型；新模型无价格时保留普通排名，原产物 hash/像素/源图发生变化时成本失效并提示重核。分数或评语更新不会改变成本。

公开 releaseHash：`8e6619b57c6979d9c5687893afa64fa40a81b5976f49d1466506d3b4a9ddd2fc`。价格核对版本：`2026-09-20-r2`。

| 模型 | 榜单 ID | 官方 API ID / 版本 | 渠道 | 原币价格与单位 | 条件与公式 | USD/张 | 是否纳入 / 原因 | 来源与查询日期 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GPT-image-2 | openai/gpt-image-2 | gpt-image-2 / 官方当前模型别名；不推断底层快照 | 厂商直营 API | 每百万 token：文本输入 $2.50 / 图像输入 $4 / 图像输出 $15 | 请求 provider-default；原产物 2048×1152；quality=auto（原 Replicate 官方模型路由默认）；Σ(2.5×文本输入 tokens + 4×源图输入 tokens + 15×图像输出 tokens) ÷ 1,000,000 ÷ 9 USD/张；auto 对应输出量未核实。 | — | 不纳入：官方单价已核实、关键条件待确认；已核实准确模型单价与官方输出 token 计算器。原输出为 2048×1152、quality=auto；计算器明确要求显式 quality，auto 取决于生成结果。还需核对编辑输入编码的 image tokens，不能将工具的 output-only 估算当作全请求报价。 | [OpenAI API 标准定价](https://developers.openai.com/api/docs/pricing)；[官方图像计费公式与输出 token 计算器](https://developers.openai.com/api/docs/guides/image-generation#cost-and-latency)；2026-09-20 |
| GPT Image 2.5 Sunburst | openai/gpt-image-2.5-sunburst | gpt-image-2.5-sunburst / 官方当前模型别名；不推断底层快照 | 厂商直营 API | 每百万 token：文本输入 $5 / 图像输入 $8 / 图像输出 $30 | 请求 provider-default；原产物 2048×1152；quality=auto（原 Replicate 官方模型路由默认）；Σ(5×文本输入 tokens + 8×源图输入 tokens + 30×图像输出 tokens) ÷ 1,000,000 ÷ 9 USD/张；auto 对应输出量未核实。 | — | 不纳入：官方单价已核实、关键条件待确认；已核实准确模型单价与官方输出 token 计算器。原输出为 2048×1152、quality=auto；计算器明确要求显式 quality，auto 取决于生成结果。还需核对编辑输入编码的 image tokens，不能将工具的 output-only 估算当作全请求报价。 | [OpenAI API 标准定价](https://developers.openai.com/api/docs/pricing)；[官方图像计费公式与输出 token 计算器](https://developers.openai.com/api/docs/guides/image-generation#cost-and-latency)；2026-09-20 |
| Sourceful: Riverflow V2.5 Pro | sourceful/riverflow-v2.5-pro | riverflow-v2.5-pro / 准确渠道版本 riverflow-v2.5-pro | Sourceful 直营 / 官方发布渠道待统一核实 | OpenRouter 官方发布渠道按任务动态计价；非固定单张价格 | 请求 2K；原产物 2560×1440；原接口默认；未显式传 quality；Σ(对应分辨率基础输出费 + 必需动态处理费 + 输入附加费)÷9；动态处理量不可复算。 | — | 不纳入：官方单价已核实、关键条件待确认；官方发布渠道说明最终按任务的处理量、reasoning effort 与编辑复杂度动态计价。公开元数据的 2K output_image 起价不覆盖完整动态处理费；原请求未提供可复算处理量，不使用起价或账单总额替代。 | [Riverflow 官方平台 API](https://www.riverflow.ai/app/platform-api/docs)；[Riverflow 2.5 官方渠道说明](https://www.riverflow.ai/models/riverflow-2.5)；[官方发布渠道 OpenRouter](https://openrouter.ai/sourceful/riverflow-v2.5-pro)；[Sourceful 服务端公开计费元数据](https://openrouter.ai/api/v1/images/models/sourceful/riverflow-v2.5-pro/endpoints)；2026-09-20 |
| nano-banana-pro | google/nano-banana-pro | gemini-3-pro-image / 官方当前模型别名；不推断底层快照 | 厂商直营 API | 每百万 token：输入 $2 / 图像输出 $120；1K/2K 输出 1120 token；文本/思考输出 $12/百万 token | 请求 2K；原产物 2752×1536；原接口默认；未显式传 quality；1120 × 120 / 1,000,000 + Σ(2×文本/图片输入 tokens + 12×思考/文本输出 tokens) ÷ 1,000,000 ÷ 9 USD/张。 | — | 不纳入：官方单价已核实、关键条件待确认；图像输出固定 1120 tokens，编辑源图固定 560 tokens，这些费用已可复算；但官方说明 3.x 图像模型默认思考且思考 tokens 计费，原渠道未公开各题 thinking token 数。缺少输入精确计数及必收思考量，不能把它们设为 0。 | [Gemini Developer API 标准定价](https://ai.google.dev/gemini-api/docs/pricing)；[Gemini 图像生成参数与默认思考计费](https://ai.google.dev/gemini-api/docs/image-generation)；[Google 官方图文 token 规则](https://ai.google.dev/gemini-api/docs/tokens)；2026-09-20 |
| Qwen Image 3.0 Pro | qwen-image-3.0-pro | qwen-image-3.0-pro / 官方当前模型别名 | 阿里云百炼 · 中国内地（北京） | 输出 CNY .5/张；输入 CNY .02/张 | 请求 2K；原产物 2048×1152；原接口默认；未显式传 quality；(6×.5 + 3×(.5+.02)) ÷ 9 CNY/张，再 ×1.1460÷7.6755 折为 USD。 | 0.0756484919549 | 纳入：官方单价已核实、计费量可复算 | [阿里云百炼 · 北京标准按量价格](https://help.aliyun.com/zh/model-studio/model-pricing)；2026-09-20 |
| xAI: Grok Imagine Image 2.0 | x-ai/grok-imagine-image-2.0 | grok-imagine-image-2.0 / 官方当前模型别名 | 厂商直营 API | 2K 输出：low $0.06 / medium $0.08；输入 $0.01/张 | 请求 2K；原产物 2816×1584；原接口默认；未显式传 quality；估算 (6 × 0.06 + 3 × (0.08 + 0.01)) ÷ 9 = USD 0.07/张。依据官方当日 auto 行为，不使用官方计算器，不推断历史档位。 | 0.07（估算） | 不纳入：官方单价已核实、只能估算；仅估算：采用官方查询日公布的 auto 路由（生成 low、编辑 medium）和 2K 单价；原请求仍是 auto，实际所服务质量未记录，策略可能变化。不是声称原图使用了固定档位，不进入可核验成本前沿。 | [xAI 官方模型定价](https://docs.x.ai/developers/models/grok-imagine-image-2.0)；[xAI 质量档位说明](https://docs.x.ai/developers/migration/imagine-image-quality-nov-2)；2026-09-20 |
| GPT Image 2.5 Flare | openai/gpt-image-2.5-flare | gpt-image-2.5-flare / 官方当前模型别名；不推断底层快照 | 厂商直营 API | 每百万 token：文本输入 $5 / 图像输入 $8 / 图像输出 $30 | 请求 provider-default；原产物 2048×1152；quality=auto（原 Replicate 官方模型路由默认）；Σ(5×文本输入 tokens + 8×源图输入 tokens + 30×图像输出 tokens) ÷ 1,000,000 ÷ 9 USD/张；auto 对应输出量未核实。 | — | 不纳入：官方单价已核实、关键条件待确认；已核实准确模型单价与官方输出 token 计算器。原输出为 2048×1152、quality=auto；计算器明确要求显式 quality，auto 取决于生成结果。还需核对编辑输入编码的 image tokens，不能将工具的 output-only 估算当作全请求报价。 | [OpenAI API 标准定价](https://developers.openai.com/api/docs/pricing)；[官方图像计费公式与输出 token 计算器](https://developers.openai.com/api/docs/guides/image-generation#cost-and-latency)；2026-09-20 |
| Microsoft: MAI-Image-2.5 Pro | microsoft/mai-image-2.5-pro | MAI-Image-2.5-Pro / 2026-06-19 · Preview | Microsoft Foundry · Global Standard | 每百万 token：文本输入 $5 / 图像输入 $8 / 图像输出 $106 | 请求 provider-default；原产物 1360×768；原接口默认；未显式传 quality；Σ(文本 token 数×文本单价 + 源图 token 数×图像输入单价 + 输出图 token 数×图像输出单价) ÷ 1,000,000 ÷ 9。仅知道像素上限不能推出 tokens。 | — | 不纳入：官方单价已核实、关键条件待确认；已核对官方生成/编辑参数、固定单输出与最大 1,048,576 像素限制；官方资料没有给出此准确版本从原图像素到计费 tokens 的可验证公式。还缺文本与源图计量，不能以 1,024 tokens 上限或其他模型的切片规则替代。 | [Microsoft Foundry 模型版本](https://learn.microsoft.com/en-us/azure/foundry/foundry-models/how-to/use-foundry-models-mai-image)；[Azure 官方模型价格 / 计算器入口](https://azure.microsoft.com/en-us/pricing/details/ai-foundry-models/microsoft/)；[Microsoft 官方发布价格](https://microsoft.ai/?post_type=new)；2026-09-20 |
| Doubao Seedream 5.0 Pro | seedream-5.0-pro | doubao-seedream-5-0-pro-260628 / 260628 | 火山方舟 · 中国内地 | 单图 ≤261 万像素 CNY 0.30，以上 CNY 0.60；首张输入免费 | 请求 2K；原产物 2048×1152；原接口默认；未显式传 quality；Σ(每题输出费 + 文本输入费 + 该题参考图费 + 其他必收费) ÷ 9；CNY 再 × 1.1460 ÷ 7.6755。 | 0.0447918702365 | 纳入：官方单价已核实、计费量可复算 | [火山方舟 · 标准按量价格](https://docs.volcengine.com/docs/82379/1544106?lang=zh)；[火山方舟模型 ID](https://www.volcengine.com/docs/82379/1330310?lang=zh)；2026-09-20 |
| Qwen: Qwen Image 3 | qwen/qwen-image-3 | qwen/qwen-image-3-20260805（Alibaba 渠道版本；直营 ID 待映射） / 渠道 20260805；不等同于已确认的直营快照 | 厂商直营 API | Alibaba Cloud Int. 发布渠道：输入 $0.003/张，1K/2K 输出 $0.03/张 | 请求 2K；原产物 2048×1152；原接口默认；未显式传 quality；原渠道可复算 (6×0.03 + 3×(0.03+0.003))÷9 = $0.031/张；不是已核实的直营折算值。 | — | 不纳入：官方单价已核实、关键条件待确认；已核实准确渠道版本 20260805 及输入/输出单价；尚未找到其与百炼 qwen-image-3.0 当前别名/快照的官方映射。不能套用同系列直营价格，暂不进入优先直营的成本比较。 | [阿里云百炼 · 北京标准按量价格](https://help.aliyun.com/zh/model-studio/model-pricing)；[原模型渠道身份](https://openrouter.ai/qwen/qwen-image-3)；[Alibaba 发布渠道的准确端点版本](https://openrouter.ai/api/v1/models/qwen/qwen-image-3/endpoints)；[Alibaba 发布渠道图像收费项](https://openrouter.ai/api/v1/images/models/qwen/qwen-image-3/endpoints)；2026-09-20 |
| Doubao Seedream 5.0 | seedream-5.0 | doubao-seedream-5-0-260128 / 260128 · Seedream 5.0 Lite | 火山方舟 · 中国内地 | 输出 CNY .22/张；输入免费 | 请求 2K；原产物 2048×2048, 2848×1600；原接口默认；未显式传 quality；(6×.22 + 3×(.22+0)) ÷ 9 CNY/张，再 ×1.1460÷7.6755 折为 USD。 | 0.0328473715067 | 纳入：官方单价已核实、计费量可复算 | [火山方舟 · 标准按量价格](https://docs.volcengine.com/docs/82379/1544106?lang=zh)；[火山方舟模型 ID](https://www.volcengine.com/docs/82379/1330310?lang=zh)；2026-09-20 |
| Microsoft: MAI-Image-2.6 | microsoft/mai-image-2.6 | MAI-Image-2.6 / 2026-07-31 · Preview | Microsoft Foundry · Global Standard | 官方价格待确认 | 请求 provider-default；原产物 1360×768, 1365×768；原接口默认；未显式传 quality；Σ(文本 token 数×文本单价 + 源图 token 数×图像输入单价 + 输出图 token 数×图像输出单价) ÷ 1,000,000 ÷ 9。仅知道像素上限不能推出 tokens。 | — | 不纳入：官方价格待确认；官方模型版本与图像接口已确认；Foundry 2.6 定价公告访问被阻断，直营价格表未呈现此版本可核实金额。渠道列出 5/8/38 美元每百万 tokens，但不替代直营定价核验。另缺该模型图像 tokens 公式/用量。 | [Microsoft Foundry 模型版本](https://learn.microsoft.com/en-us/azure/foundry/foundry-models/how-to/use-foundry-models-mai-image)；[Azure 官方模型价格 / 计算器入口](https://azure.microsoft.com/en-us/pricing/details/ai-foundry-models/microsoft/)；[Microsoft 2.6 定价公告（访问受阻）](https://techcommunity.microsoft.com/blog/azure-ai-foundry-blog/mai-image-2-6-and-mai-image-2-6-flash-quality-and-speed-at-production-scale/4550970)；2026-09-20 |
| nano-banana-2 | google/nano-banana-2 | gemini-3.1-flash-image / 官方当前模型别名；不推断底层快照 | 厂商直营 API | 每百万 token：输入 $0.50 / 图像输出 $60；2K 输出 1680 token；文本/思考输出 $3/百万 token | 请求 2K；原产物 2752×1536；原接口默认；未显式传 quality；1680 × 60 / 1,000,000 + Σ(0.50×文本/图片输入 tokens + 3×思考/文本输出 tokens) ÷ 1,000,000 ÷ 9 USD/张。 | — | 不纳入：官方单价已核实、关键条件待确认；图像输出固定 1680 tokens，这些费用已可复算；但官方说明 3.x 图像模型默认思考且思考 tokens 计费，原渠道未公开各题 thinking token 数。缺少输入精确计数及必收思考量，不能把它们设为 0。 | [Gemini Developer API 标准定价](https://ai.google.dev/gemini-api/docs/pricing)；[Gemini 图像生成参数与默认思考计费](https://ai.google.dev/gemini-api/docs/image-generation)；[Google 官方图文 token 规则](https://ai.google.dev/gemini-api/docs/tokens)；2026-09-20 |
| Qwen Image 2.0 Pro | qwen-image-2.0-pro | qwen-image-2.0-pro / qwen-image-2.0-pro-2026-04-22 | 阿里云百炼 · 中国内地（北京） | 输出 CNY .5/张；输入 CNY 0/张 | 请求 2K；原产物 2048×1152；原接口默认；未显式传 quality；(6×.5 + 3×(.5+0)) ÷ 9 CNY/张，再 ×1.1460÷7.6755 折为 USD。 | 0.0746531170608 | 纳入：官方单价已核实、计费量可复算 | [阿里云百炼 · 北京标准按量价格](https://help.aliyun.com/zh/model-studio/model-pricing)；2026-09-20 |
| Microsoft: MAI-Image-2.5 | microsoft/mai-image-2.5 | MAI-Image-2.5 / 2026-06-02 · Preview | Microsoft Foundry · Global Standard | 每百万 token：文本输入 $5 / 图像输入 $8 / 图像输出 $47 | 请求 provider-default；原产物 1360×768；原接口默认；未显式传 quality；Σ(文本 token 数×文本单价 + 源图 token 数×图像输入单价 + 输出图 token 数×图像输出单价) ÷ 1,000,000 ÷ 9。仅知道像素上限不能推出 tokens。 | — | 不纳入：官方单价已核实、关键条件待确认；已核对官方生成/编辑参数、固定单输出与最大 1,048,576 像素限制；官方资料没有给出此准确版本从原图像素到计费 tokens 的可验证公式。还缺文本与源图计量，不能以 1,024 tokens 上限或其他模型的切片规则替代。 | [Microsoft Foundry 模型版本](https://learn.microsoft.com/en-us/azure/foundry/foundry-models/how-to/use-foundry-models-mai-image)；[Microsoft MAI-Image-2.5 发布](https://microsoft.ai/news/introducing-mai-image-2-5/)；[Azure 官方模型价格 / 计算器入口](https://azure.microsoft.com/en-us/pricing/details/ai-foundry-models/microsoft/)；2026-09-20 |
| Nano Banana 2 Lite | google/nano-banana-2-lite | gemini-3.1-flash-lite-image / 官方当前模型别名；不推断底层快照 | 厂商直营 API | 每百万 token：输入 $0.25 / 图像输出 $30；1K 输出 1120 token；文本/思考输出 $1.50/百万 token | 请求 provider-default；原产物 1376×768；原接口默认；未显式传 quality；1120 × 30 / 1,000,000 + Σ(0.25×文本/图片输入 tokens + 1.5×思考/文本输出 tokens) ÷ 1,000,000 ÷ 9 USD/张。 | — | 不纳入：官方单价已核实、关键条件待确认；图像输出固定 1120 tokens，这些费用已可复算；但官方说明 3.x 图像模型默认思考且思考 tokens 计费，原渠道未公开各题 thinking token 数。缺少输入精确计数及必收思考量，不能把它们设为 0。 | [Gemini Developer API 标准定价](https://ai.google.dev/gemini-api/docs/pricing)；[Gemini 图像生成参数与默认思考计费](https://ai.google.dev/gemini-api/docs/image-generation)；[Google 官方图文 token 规则](https://ai.google.dev/gemini-api/docs/tokens)；2026-09-20 |
| SpaceXAI: Grok Imagine Image Quality | x-ai/grok-imagine-image-quality | grok-imagine-image-quality / grok-imagine-image-quality-20260403 | 厂商直营 API | 2K 输出 $0.07/张；输入 $0.01/张 | 请求 2K；原产物 2816×1584；原接口默认；未显式传 quality；(6×.07 + 3×(.07+.01)) ÷ 9 USD/张。 | 0.0733333333333 | 纳入：官方单价已核实、计费量可复算 | [xAI 官方模型定价](https://docs.x.ai/developers/models/grok-imagine-image-quality)；2026-09-20 |
| Wan 2.7 Image | wan2.7-image | wan2.7-image / 官方当前模型别名 | 阿里云百炼 · 中国内地（北京） | 输出 CNY .2/张；输入 CNY 0/张 | 请求 2K；原产物 2048×1152；原接口默认；未显式传 quality；(6×.2 + 3×(.2+0)) ÷ 9 CNY/张，再 ×1.1460÷7.6755 折为 USD。 | 0.0298612468243 | 纳入：官方单价已核实、计费量可复算 | [阿里云百炼 · 北京标准按量价格](https://help.aliyun.com/zh/model-studio/model-pricing)；2026-09-20 |
| Wan 2.7 Image Pro | wan2.7-image-pro | wan2.7-image-pro / 官方当前模型别名 | 阿里云百炼 · 中国内地（北京） | 输出 CNY .5/张；输入 CNY 0/张 | 请求 2K；原产物 2048×1152；原接口默认；未显式传 quality；(6×.5 + 3×(.5+0)) ÷ 9 CNY/张，再 ×1.1460÷7.6755 折为 USD。 | 0.0746531170608 | 纳入：官方单价已核实、计费量可复算 | [阿里云百炼 · 北京标准按量价格](https://help.aliyun.com/zh/model-studio/model-pricing)；2026-09-20 |
| Qwen Image 2.0 | qwen-image-2.0 | qwen-image-2.0 / qwen-image-2.0-2026-03-03 | 阿里云百炼 · 中国内地（北京） | 输出 CNY .2/张；输入 CNY 0/张 | 请求 2K；原产物 2048×1152；原接口默认；未显式传 quality；(6×.2 + 3×(.2+0)) ÷ 9 CNY/张，再 ×1.1460÷7.6755 折为 USD。 | 0.0298612468243 | 纳入：官方单价已核实、计费量可复算 | [阿里云百炼 · 北京标准按量价格](https://help.aliyun.com/zh/model-studio/model-pricing)；2026-09-20 |
| Doubao Seedream 4.5 | seedream-4.5 | doubao-seedream-4-5-251128 / 251128 | 火山方舟 · 中国内地 | 输出 CNY .25/张；输入免费 | 请求 2K；原产物 1664×2496, 2048×2048, 2304×1728, 2848×1600；原接口默认；未显式传 quality；(6×.25 + 3×(.25+0)) ÷ 9 CNY/张，再 ×1.1460÷7.6755 折为 USD。 | 0.0373265585304 | 纳入：官方单价已核实、计费量可复算 | [火山方舟 · 标准按量价格](https://docs.volcengine.com/docs/82379/1544106?lang=zh)；[火山方舟模型 ID](https://www.volcengine.com/docs/82379/1330310?lang=zh)；2026-09-20 |
| Recraft: Recraft V4.1 Utility Pro | recraft/recraft-v4.1-utility-pro | recraftv4_1_utility_pro / v4.1-utility-pro | 厂商直营 API | 该准确变体 USD .21/输出张；源图输入不单独计费 | 请求 provider-default；原产物 2048×1152, 2688×1536；准确模型变体决定输出类型/档位；无通用 quality 参数；(6×.21 + 3×(.21+0)) ÷ 9 USD/张。 | 0.21 | 纳入：官方单价已核实、计费量可复算 | [Recraft 官方 API 定价](https://www.recraft.ai/docs/api-reference/pricing)；[Recraft 官方模型参数](https://www.recraft.ai/docs/api-reference/endpoints)；[Recraft 服务端公开计费项（交叉核验）](https://openrouter.ai/api/v1/images/models/recraft/recraft-v4.1-utility-pro/endpoints)；[Recraft 模型单张价格与支持操作](https://www.recraft.ai/docs/api-reference/models/recraft-v4-1)；2026-09-20 |
| nano-banana | google/nano-banana | gemini-2.5-flash-image / 官方当前模型别名；不推断底层快照 | 厂商直营 API | 每百万 token：输入 $0.30 / 图像输出 $30；1K 输出 1290 token | 请求 provider-default；原产物 1344×768；原接口默认；未显式传 quality；0.0387 + 0.30 × Σ(文本 tokens + 源图 tokens) ÷ 1,000,000 ÷ 9 USD/张；输入量未闭合。 | — | 不纳入：官方单价已核实、关键条件待确认；1K 输出固定 1290 tokens，可复算输出费 $0.0387。官方文本计数与图片切片文档已核对；原中文 prompt 缺少该准确模型可验证的 token 化结果，源图输入计量也未证实。不把确定的输出费冒充九题完整请求费。 | [Gemini Developer API 标准定价](https://ai.google.dev/gemini-api/docs/pricing)；[Gemini 图像生成参数与默认思考计费](https://ai.google.dev/gemini-api/docs/image-generation)；[Google 官方图文 token 规则](https://ai.google.dev/gemini-api/docs/tokens)；2026-09-20 |
| Black Forest Labs: FLUX.2 Flex | black-forest-labs/flux.2-flex | flux-2-flex / 官方当前模型别名 | 厂商直营 API | 首输出 MP $.05；额外输出 MP $.05；输入 MP $.05 | 请求 provider-default；原产物 1824×1024；原接口默认；未显式传 quality；生成：.05 + (ceil(1824×1024/1048576)−1)×.05；编辑另加 ceil(2048×1152/1048576)×.05；九题均值。 | 0.15 | 纳入：官方单价已核实、计费量可复算 | [BFL 官方 API 定价](https://bfl.ai/pricing?category=flux.2)；2026-09-20 |
| Recraft: Recraft V4.1 Vector | recraft/recraft-v4.1-vector | recraftv4_1_vector / v4.1-vector | 厂商直营 API | 该准确变体 USD .08/输出张；源图输入不单独计费 | 请求 provider-default；原产物 1024×576, 1024×585；准确模型变体决定输出类型/档位；无通用 quality 参数；(6×.08 + 3×(.08+0)) ÷ 9 USD/张。 | 0.08 | 纳入：官方单价已核实、计费量可复算 | [Recraft 官方 API 定价](https://www.recraft.ai/docs/api-reference/pricing)；[Recraft 官方模型参数](https://www.recraft.ai/docs/api-reference/endpoints)；[Recraft 服务端公开计费项（交叉核验）](https://openrouter.ai/api/v1/images/models/recraft/recraft-v4.1-vector/endpoints)；[Recraft 模型单张价格与支持操作](https://www.recraft.ai/docs/api-reference/models/recraft-v4-1)；2026-09-20 |
| Sourceful: Riverflow V2 Fast | sourceful/riverflow-v2-fast | riverflow-v2-fast / 准确渠道版本 riverflow-v2-fast | Sourceful 直营 / 官方发布渠道待统一核实 | OpenRouter / Sourceful：2K 输出 $0.04/张，input_reference $0.20/张；字体 $0.03/张（未使用） | 请求 2K；原产物 2048×1152；原接口默认；未显式传 quality；已核实渠道报价 (6×0.04 + 3×(0.04+0.20))÷9 = $0.1066666667/张；这是渠道条件核对结果，未采用为直营比较值。 | — | 不纳入：官方单价已核实、关键条件待确认；准确官方发布渠道单价与参考图费已核实；但直营 API 目前公布的是工作流 credits，尚无此准确模型版本的直营标准计价映射。按优先直营的本次口径不以渠道价代入主前沿。 | [Riverflow 官方平台 API](https://www.riverflow.ai/app/platform-api/docs)；[Riverflow 2.5 官方渠道说明](https://www.riverflow.ai/models/riverflow-2.5)；[官方发布渠道 OpenRouter](https://openrouter.ai/sourceful/riverflow-v2-fast)；[Sourceful 服务端公开计费元数据](https://openrouter.ai/api/v1/images/models/sourceful/riverflow-v2-fast/endpoints)；2026-09-20 |
| Doubao Seedream 4.0 | doubao-seedream-4-0-250828 | doubao-seedream-4-0-250828 / 250828 | 火山方舟 · 中国内地 | 输出 CNY .20/张；输入免费 | 请求 2K；原产物 2048×1152；原接口默认；未显式传 quality；(6×.20 + 3×(.20+0)) ÷ 9 CNY/张，再 ×1.1460÷7.6755 折为 USD。 | 0.0298612468243 | 纳入：官方单价已核实、计费量可复算 | [火山方舟 · 标准按量价格](https://docs.volcengine.com/docs/82379/1544106?lang=zh)；[火山方舟模型 ID](https://www.volcengine.com/docs/82379/1330310?lang=zh)；2026-09-20 |
| Recraft: Recraft V4.1 Pro | recraft/recraft-v4.1-pro | recraftv4_1_pro / v4.1-pro | 厂商直营 API | 该准确变体 USD .21/输出张；源图输入不单独计费 | 请求 provider-default；原产物 2048×1152, 2688×1536；准确模型变体决定输出类型/档位；无通用 quality 参数；(6×.21 + 3×(.21+0)) ÷ 9 USD/张。 | 0.21 | 纳入：官方单价已核实、计费量可复算 | [Recraft 官方 API 定价](https://www.recraft.ai/docs/api-reference/pricing)；[Recraft 官方模型参数](https://www.recraft.ai/docs/api-reference/endpoints)；[Recraft 服务端公开计费项（交叉核验）](https://openrouter.ai/api/v1/images/models/recraft/recraft-v4.1-pro/endpoints)；[Recraft 模型单张价格与支持操作](https://www.recraft.ai/docs/api-reference/models/recraft-v4-1)；2026-09-20 |
| Recraft: Recraft V4.1 | recraft/recraft-v4.1 | recraftv4_1 / v4.1 | 厂商直营 API | 该准确变体 USD .035/输出张；源图输入不单独计费 | 请求 provider-default；原产物 1344×768, 2048×1152；准确模型变体决定输出类型/档位；无通用 quality 参数；(6×.035 + 3×(.035+0)) ÷ 9 USD/张。 | 0.035 | 纳入：官方单价已核实、计费量可复算 | [Recraft 官方 API 定价](https://www.recraft.ai/docs/api-reference/pricing)；[Recraft 官方模型参数](https://www.recraft.ai/docs/api-reference/endpoints)；[Recraft 服务端公开计费项（交叉核验）](https://openrouter.ai/api/v1/images/models/recraft/recraft-v4.1/endpoints)；[Recraft 模型单张价格与支持操作](https://www.recraft.ai/docs/api-reference/models/recraft-v4-1)；2026-09-20 |
| Recraft: Recraft V4.1 Pro Vector | recraft/recraft-v4.1-pro-vector | recraftv4_1_pro_vector / v4.1-pro-vector | 厂商直营 API | 该准确变体 USD .30/输出张；源图输入不单独计费 | 请求 provider-default；原产物 1024×576, 1024×585；准确模型变体决定输出类型/档位；无通用 quality 参数；(6×.30 + 3×(.30+0)) ÷ 9 USD/张。 | 0.3 | 纳入：官方单价已核实、计费量可复算 | [Recraft 官方 API 定价](https://www.recraft.ai/docs/api-reference/pricing)；[Recraft 官方模型参数](https://www.recraft.ai/docs/api-reference/endpoints)；[Recraft 服务端公开计费项（交叉核验）](https://openrouter.ai/api/v1/images/models/recraft/recraft-v4.1-pro-vector/endpoints)；[Recraft 模型单张价格与支持操作](https://www.recraft.ai/docs/api-reference/models/recraft-v4-1)；2026-09-20 |
| Krea: Krea 2 Large | krea/krea-2-large | krea/krea-2/large / Krea 2 large | Krea 官方 API | 文本生图 $.060/张；Style references $.065/张 | 请求 1K；原产物 1376×768；原接口默认；未显式传 quality；(6 × .060 + 3 × .065) ÷ 9 USD/张。 | 0.0616666666667 | 纳入：官方单价已核实、计费量可复算 | [Krea 官方模型接口与价格](https://www.krea.ai/docs/api-reference/krea/krea-2-large)；2026-09-20 |
| Black Forest Labs: FLUX.2 Pro | black-forest-labs/flux.2-pro | flux-2-pro / 官方当前模型别名 | 厂商直营 API | 首输出 MP $.03；额外输出 MP $.015；输入 MP $.015 | 请求 provider-default；原产物 1824×1024；原接口默认；未显式传 quality；生成：.03 + (ceil(1824×1024/1048576)−1)×.015；编辑另加 ceil(2048×1152/1048576)×.015；九题均值。 | 0.06 | 纳入：官方单价已核实、计费量可复算 | [BFL 官方 API 定价](https://bfl.ai/pricing?category=flux.2)；2026-09-20 |
| Recraft: Recraft V4.1 Utility | recraft/recraft-v4.1-utility | recraftv4_1_utility / v4.1-utility | 厂商直营 API | 该准确变体 USD .035/输出张；源图输入不单独计费 | 请求 provider-default；原产物 1344×768, 2048×1152；准确模型变体决定输出类型/档位；无通用 quality 参数；(6×.035 + 3×(.035+0)) ÷ 9 USD/张。 | 0.035 | 纳入：官方单价已核实、计费量可复算 | [Recraft 官方 API 定价](https://www.recraft.ai/docs/api-reference/pricing)；[Recraft 官方模型参数](https://www.recraft.ai/docs/api-reference/endpoints)；[Recraft 服务端公开计费项（交叉核验）](https://openrouter.ai/api/v1/images/models/recraft/recraft-v4.1-utility/endpoints)；[Recraft 模型单张价格与支持操作](https://www.recraft.ai/docs/api-reference/models/recraft-v4-1)；2026-09-20 |
| Black Forest Labs: FLUX.2 Max | black-forest-labs/flux.2-max | flux-2-max / 官方当前模型别名 | 厂商直营 API | 首输出 MP $.07；额外输出 MP $.03；输入 MP $.03 | 请求 provider-default；原产物 1824×1024；原接口默认；未显式传 quality；生成：.07 + (ceil(1824×1024/1048576)−1)×.03；编辑另加 ceil(2048×1152/1048576)×.03；九题均值。 | 0.13 | 纳入：官方单价已核实、计费量可复算 | [BFL 官方 API 定价](https://bfl.ai/pricing?category=flux.2)；2026-09-20 |
| Krea: Krea 2 Medium Turbo | krea/krea-2-medium-turbo | krea/krea-2/medium-turbo / Krea 2 medium-turbo | Krea 官方 API | 文本生图 $.015/张；Style references $.0175/张 | 请求 1K；原产物 1376×768；原接口默认；未显式传 quality；(6 × .015 + 3 × .0175) ÷ 9 USD/张。 | 0.0158333333333 | 纳入：官方单价已核实、计费量可复算 | [Krea 官方模型接口与价格](https://www.krea.ai/docs/api-reference/krea/krea-2-turbo)；2026-09-20 |
| Recraft: Recraft V4 Vector | recraft/recraft-v4-vector | recraftv4_vector / v4-vector | 厂商直营 API | 该准确变体 USD .08/输出张；源图输入不单独计费 | 请求 provider-default；原产物 1024×576, 1024×585；准确模型变体决定输出类型/档位；无通用 quality 参数；(6×.08 + 3×(.08+0)) ÷ 9 USD/张。 | 0.08 | 纳入：官方单价已核实、计费量可复算 | [Recraft 官方 API 定价](https://www.recraft.ai/docs/api-reference/pricing)；[Recraft 官方模型参数](https://www.recraft.ai/docs/api-reference/endpoints)；[Recraft 服务端公开计费项（交叉核验）](https://openrouter.ai/api/v1/images/models/recraft/recraft-v4-vector/endpoints)；[Recraft 模型单张价格与支持操作](https://www.recraft.ai/docs/api-reference/models/recraft-v4)；2026-09-20 |
| Recraft: Recraft V4 | recraft/recraft-v4 | recraftv4 / v4 | 厂商直营 API | 该准确变体 USD .04/输出张；源图输入不单独计费 | 请求 provider-default；原产物 1344×768, 2048×1152；准确模型变体决定输出类型/档位；无通用 quality 参数；(6×.04 + 3×(.04+0)) ÷ 9 USD/张。 | 0.04 | 纳入：官方单价已核实、计费量可复算 | [Recraft 官方 API 定价](https://www.recraft.ai/docs/api-reference/pricing)；[Recraft 官方模型参数](https://www.recraft.ai/docs/api-reference/endpoints)；[Recraft 服务端公开计费项（交叉核验）](https://openrouter.ai/api/v1/images/models/recraft/recraft-v4/endpoints)；[Recraft 模型单张价格与支持操作](https://www.recraft.ai/docs/api-reference/models/recraft-v4)；2026-09-20 |
| Recraft: Recraft V4 Pro | recraft/recraft-v4-pro | recraftv4_pro / v4-pro | 厂商直营 API | 该准确变体 USD .25/输出张；源图输入不单独计费 | 请求 provider-default；原产物 2048×1152, 2688×1536；准确模型变体决定输出类型/档位；无通用 quality 参数；(6×.25 + 3×(.25+0)) ÷ 9 USD/张。 | 0.25 | 纳入：官方单价已核实、计费量可复算 | [Recraft 官方 API 定价](https://www.recraft.ai/docs/api-reference/pricing)；[Recraft 官方模型参数](https://www.recraft.ai/docs/api-reference/endpoints)；[Recraft 服务端公开计费项（交叉核验）](https://openrouter.ai/api/v1/images/models/recraft/recraft-v4-pro/endpoints)；[Recraft 模型单张价格与支持操作](https://www.recraft.ai/docs/api-reference/models/recraft-v4)；2026-09-20 |
| Sourceful: Riverflow V2.5 Fast | sourceful/riverflow-v2.5-fast | riverflow-v2.5-fast / 准确渠道版本 riverflow-v2.5-fast | Sourceful 直营 / 官方发布渠道待统一核实 | OpenRouter 官方发布渠道按任务动态计价；非固定单张价格 | 请求 2K；原产物 2048×1152；原接口默认；未显式传 quality；Σ(对应分辨率基础输出费 + 必需动态处理费 + 输入附加费)÷9；动态处理量不可复算。 | — | 不纳入：官方单价已核实、关键条件待确认；官方发布渠道说明最终按任务的处理量、reasoning effort 与编辑复杂度动态计价。公开元数据的 2K output_image 起价不覆盖完整动态处理费；原请求未提供可复算处理量，不使用起价或账单总额替代。 | [Riverflow 官方平台 API](https://www.riverflow.ai/app/platform-api/docs)；[Riverflow 2.5 官方渠道说明](https://www.riverflow.ai/models/riverflow-2.5)；[官方发布渠道 OpenRouter](https://openrouter.ai/sourceful/riverflow-v2.5-fast)；[Sourceful 服务端公开计费元数据](https://openrouter.ai/api/v1/images/models/sourceful/riverflow-v2.5-fast/endpoints)；2026-09-20 |
| Krea: Krea 2 Medium | krea/krea-2-medium | krea/krea-2/medium / Krea 2 medium | Krea 官方 API | 文本生图 $.030/张；Style references $.035/张 | 请求 1K；原产物 1376×768；原接口默认；未显式传 quality；(6 × .030 + 3 × .035) ÷ 9 USD/张。 | 0.0316666666667 | 纳入：官方单价已核实、计费量可复算 | [Krea 官方模型接口与价格](https://www.krea.ai/docs/api-reference/krea/krea-2-medium)；2026-09-20 |
| Recraft: Recraft V4 Pro Vector | recraft/recraft-v4-pro-vector | recraftv4_pro_vector / v4-pro-vector | 厂商直营 API | 该准确变体 USD .30/输出张；源图输入不单独计费 | 请求 provider-default；原产物 1024×576, 1024×585；准确模型变体决定输出类型/档位；无通用 quality 参数；(6×.30 + 3×(.30+0)) ÷ 9 USD/张。 | 0.3 | 纳入：官方单价已核实、计费量可复算 | [Recraft 官方 API 定价](https://www.recraft.ai/docs/api-reference/pricing)；[Recraft 官方模型参数](https://www.recraft.ai/docs/api-reference/endpoints)；[Recraft 服务端公开计费项（交叉核验）](https://openrouter.ai/api/v1/images/models/recraft/recraft-v4-pro-vector/endpoints)；[Recraft 模型单张价格与支持操作](https://www.recraft.ai/docs/api-reference/models/recraft-v4)；2026-09-20 |
| Black Forest Labs: FLUX.2 Klein 4B | black-forest-labs/flux.2-klein-4b | flux-2-klein-4b / 官方当前模型别名 | 厂商直营 API | 首输出 MP $.014；额外输出 MP $.001；输入 MP $.001 | 请求 provider-default；原产物 1824×1024；原接口默认；未显式传 quality；生成：.014 + (ceil(1824×1024/1048576)−1)×.001；编辑另加 ceil(2048×1152/1048576)×.001；九题均值。 | 0.016 | 纳入：官方单价已核实、计费量可复算 | [BFL 官方 API 定价](https://bfl.ai/pricing?category=flux.2)；2026-09-20 |
| Recraft: Recraft V3 | recraft/recraft-v3 | recraftv3 / v3 | 厂商直营 API | 栅格生成 / image-to-image 均 $0.04/张 | 请求 provider-default；原产物 1820×1024, 2048×1152；准确模型变体决定输出类型/档位；无通用 quality 参数；(6×.04 + 3×(.04+0)) ÷ 9 USD/张。 | 0.04 | 纳入：官方单价已核实、计费量可复算 | [Recraft 官方 API 定价](https://www.recraft.ai/docs/api-reference/pricing)；[Recraft 官方模型参数](https://www.recraft.ai/docs/api-reference/endpoints)；[Recraft 服务端公开计费项（交叉核验）](https://openrouter.ai/api/v1/images/models/recraft/recraft-v3/endpoints)；2026-09-20 |
| Recraft: Recraft V4 Styles Vector | recraft/recraft-v4-styles-vector | recraftv4_styles_vector / v4-styles-vector | 厂商直营 API | 生成 $.05/张（1,000 API units = $1） | 请求 provider-default；原产物 1024×585；准确模型变体决定输出类型/档位；无通用 quality 参数；编辑参考费可核验；生成六题缺少必需样式条件，不计算九题均值。 | — | 不纳入：官方单价已核实、关键条件待确认；已核实输出单价及每次内联样式创建 $0.005；该变体生成必须提供 style/style_id 或参考图，而原 6 道生成题没有样式参考并已失败。缺少有效生成所需的样式条件，不能擅自添源图形成九题报价。 | [Recraft 官方 API 定价](https://www.recraft.ai/docs/api-reference/pricing)；[Recraft 官方模型参数](https://www.recraft.ai/docs/api-reference/endpoints)；[Recraft 服务端公开计费项（交叉核验）](https://openrouter.ai/api/v1/images/models/recraft/recraft-v4-styles-vector/endpoints)；[Recraft V4 Styles 必需样式与参考输入](https://www.recraft.ai/docs/api-reference/models/recraft-v4-styles)；2026-09-20 |
| Recraft: Recraft V4 Styles Pro Vector | recraft/recraft-v4-styles-pro-vector | recraftv4_styles_pro_vector / v4-styles-pro-vector | 厂商直营 API | 生成 $.12/张（1,000 API units = $1） | 请求 provider-default；原产物 1024×585；准确模型变体决定输出类型/档位；无通用 quality 参数；编辑参考费可核验；生成六题缺少必需样式条件，不计算九题均值。 | — | 不纳入：官方单价已核实、关键条件待确认；已核实输出单价及每次内联样式创建 $0.005；该变体生成必须提供 style/style_id 或参考图，而原 6 道生成题没有样式参考并已失败。缺少有效生成所需的样式条件，不能擅自添源图形成九题报价。 | [Recraft 官方 API 定价](https://www.recraft.ai/docs/api-reference/pricing)；[Recraft 官方模型参数](https://www.recraft.ai/docs/api-reference/endpoints)；[Recraft 服务端公开计费项（交叉核验）](https://openrouter.ai/api/v1/images/models/recraft/recraft-v4-styles-pro-vector/endpoints)；[Recraft V4 Styles 必需样式与参考输入](https://www.recraft.ai/docs/api-reference/models/recraft-v4-styles)；2026-09-20 |
| Z-Image Turbo | z-image-turbo | z-image-turbo / 官方当前模型别名 | 阿里云百炼 · 中国内地（北京） | 生成 CNY 0.10/张（不扩写）或 0.20/张（prompt_extend） | 请求 2K, 缺失；原产物 2048×1152；原接口默认；未显式传 quality；6 题生成价不能替代固定 9 题成本。不得将 3 题 unsupported 的报价设为 0。 | — | 不纳入：官方单价已核实、关键条件待确认；原题集的 3 个编辑题不受支持，无法形成与其他模型同范围的九题生成/编辑标准报价；不把缺失图片计为免费。 | [阿里云百炼 · 北京标准按量价格](https://help.aliyun.com/zh/model-studio/model-pricing)；2026-09-20 |

## 各模型具体核对记录

### openai/gpt-image-2

生成接口：`POST https://api.openai.com/v1/images/generations`

编辑接口：`POST https://api.openai.com/v1/images/edits`

- 图像输出：每百万 token：文本输入 $2.50 / 图像输入 $4 / 图像输出 $15
- 文本输入：按该模型 text input token 单价单独计费
- 参考图输入：按 image input tokens 单独计费；1 张 2048×1152 源图
- 其他必收费：未启用流式 partial_images；不含 Responses 主模型调用费用，采用直接 Images API 口径

计算：Σ(2.5×文本输入 tokens + 4×源图输入 tokens + 15×图像输出 tokens) ÷ 1,000,000 ÷ 9 USD/张；auto 对应输出量未核实。

缺失字段：各题 auto 实际选择的质量档位/输出 token 数；编辑源图的 input_image_tokens / input fidelity；准确模型的文本 token 数（原提示词已保留）

核对说明：按查询日标准报价复算九题原条件，不依赖历史扣费金额；计费量和身份另行核验。

核对说明：已检查官方计算器的入参和性质；未自行选择 low/medium/high，未引用默认计算器数值。缺失的是质量/图像计费量，不是要求提供历史扣费日志。

资料：[OpenAI API 标准定价](https://developers.openai.com/api/docs/pricing)；[官方图像计费公式与输出 token 计算器](https://developers.openai.com/api/docs/guides/image-generation#cost-and-latency)

### openai/gpt-image-2.5-sunburst

生成接口：`POST https://api.openai.com/v1/images/generations`

编辑接口：`POST https://api.openai.com/v1/images/edits`

- 图像输出：每百万 token：文本输入 $5 / 图像输入 $8 / 图像输出 $30
- 文本输入：按该模型 text input token 单价单独计费
- 参考图输入：按 image input tokens 单独计费；1 张 2048×1152 源图
- 其他必收费：未启用流式 partial_images；不含 Responses 主模型调用费用，采用直接 Images API 口径

计算：Σ(5×文本输入 tokens + 8×源图输入 tokens + 30×图像输出 tokens) ÷ 1,000,000 ÷ 9 USD/张；auto 对应输出量未核实。

缺失字段：各题 auto 实际选择的质量档位/输出 token 数；编辑源图的 input_image_tokens / input fidelity；准确模型的文本 token 数（原提示词已保留）

核对说明：按查询日标准报价复算九题原条件，不依赖历史扣费金额；计费量和身份另行核验。

核对说明：已检查官方计算器的入参和性质；未自行选择 low/medium/high，未引用默认计算器数值。缺失的是质量/图像计费量，不是要求提供历史扣费日志。

资料：[OpenAI API 标准定价](https://developers.openai.com/api/docs/pricing)；[官方图像计费公式与输出 token 计算器](https://developers.openai.com/api/docs/guides/image-generation#cost-and-latency)

### sourceful/riverflow-v2.5-pro

生成接口：`官方发布渠道 POST https://openrouter.ai/api/v1/images`

编辑接口：`官方发布渠道 POST https://openrouter.ai/api/v1/images + input_references`

- 图像输出：OpenRouter 官方发布渠道按任务动态计价；非固定单张价格
- 文本输入：该渠道未列独立文本输入项；直营工作流口径未闭合
- 参考图输入：编辑参考图会影响动态复杂度；无证据证明总输入/处理费为 0
- 其他必收费：无另行启用的搜索、字体、超分或样式训练费用；不使用优惠或免费额度

计算：Σ(对应分辨率基础输出费 + 必需动态处理费 + 输入附加费)÷9；动态处理量不可复算。

缺失字段：精确 billable processing 工作量/动态收费公式；原请求服务的 reasoning effort 及编辑处理步骤

核对说明：按查询日标准报价复算九题原条件，不依赖历史扣费金额；计费量和身份另行核验。

资料：[Riverflow 官方平台 API](https://www.riverflow.ai/app/platform-api/docs)；[Riverflow 2.5 官方渠道说明](https://www.riverflow.ai/models/riverflow-2.5)；[官方发布渠道 OpenRouter](https://openrouter.ai/sourceful/riverflow-v2.5-pro)；[Sourceful 服务端公开计费元数据](https://openrouter.ai/api/v1/images/models/sourceful/riverflow-v2.5-pro/endpoints)

### google/nano-banana-pro

生成接口：`POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image:generateContent`

编辑接口：`POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image:generateContent（加入源图 part）`

- 图像输出：1120 固定输出 tokens × $120/百万 tokens
- 文本输入：$2/百万 input tokens；需该准确模型 tokenizer/countTokens 结果，中文原提示词不能直接按英文字符比率精确换算
- 参考图输入：每张固定 560 tokens × $2/百万 = $0.00112
- 其他必收费：默认思考与文本输出 $12/百万 tokens；不可按 0。未启用 Google Search grounding。

计算：1120 × 120 / 1,000,000 + Σ(2×文本/图片输入 tokens + 12×思考/文本输出 tokens) ÷ 1,000,000 ÷ 9 USD/张。

缺失字段：各题 billable thinking tokens；九题准确模型 text input token 数

核对说明：按查询日标准报价复算九题原条件，不依赖历史扣费金额；计费量和身份另行核验。

核对说明：已使用官方固定输出 tokens 复算费用组成；并非因为缺少历史账单而排除。未调用 countTokens 或付费推理，未用字符估算伪装精确计数。

资料：[Gemini Developer API 标准定价](https://ai.google.dev/gemini-api/docs/pricing)；[Gemini 图像生成参数与默认思考计费](https://ai.google.dev/gemini-api/docs/image-generation)；[Google 官方图文 token 规则](https://ai.google.dev/gemini-api/docs/tokens)

### qwen-image-3.0-pro

生成接口：`POST https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation`

编辑接口：`POST https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation（源图输入）`

- 图像输出：输出 CNY .5/张；输入 CNY .02/张
- 文本输入：包含于单张/像素价格，无独立文本计费项
- 参考图输入：CNY .02/张（3 道编辑题各 1 张；若为 0，依据厂商包含/免费输入条款）
- 其他必收费：无另行启用的搜索、字体、超分或样式训练费用；不使用优惠或免费额度

计算：(6×.5 + 3×(.5+.02)) ÷ 9 CNY/张，再 ×1.1460÷7.6755 折为 USD。

核对说明：按查询日标准报价复算九题原条件，不依赖历史扣费金额；计费量和身份另行核验。

资料：[阿里云百炼 · 北京标准按量价格](https://help.aliyun.com/zh/model-studio/model-pricing)

### x-ai/grok-imagine-image-2.0

生成接口：`POST https://api.x.ai/v1/images/generations`

编辑接口：`POST https://api.x.ai/v1/images/edits`

- 图像输出：估算：生成 2K low $0.06；编辑 2K medium $0.08
- 文本输入：包含于单张/像素价格，无独立文本计费项
- 参考图输入：编辑输入 $0.01/张，计入每道编辑题
- 其他必收费：无另行启用的搜索、字体、超分或样式训练费用；不使用优惠或免费额度

计算：估算 (6 × 0.06 + 3 × (0.08 + 0.01)) ÷ 9 = USD 0.07/张。依据官方当日 auto 行为，不使用官方计算器，不推断历史档位。

缺失字段：原九题 auto 实际服务的 quality（影响是否可核验）

核对说明：按查询日标准报价复算九题原条件，不依赖历史扣费金额；计费量和身份另行核验。

资料：[xAI 官方模型定价](https://docs.x.ai/developers/models/grok-imagine-image-2.0)；[xAI 质量档位说明](https://docs.x.ai/developers/migration/imagine-image-quality-nov-2)

### openai/gpt-image-2.5-flare

生成接口：`POST https://api.openai.com/v1/images/generations`

编辑接口：`POST https://api.openai.com/v1/images/edits`

- 图像输出：每百万 token：文本输入 $5 / 图像输入 $8 / 图像输出 $30
- 文本输入：按该模型 text input token 单价单独计费
- 参考图输入：按 image input tokens 单独计费；1 张 2048×1152 源图
- 其他必收费：未启用流式 partial_images；不含 Responses 主模型调用费用，采用直接 Images API 口径

计算：Σ(5×文本输入 tokens + 8×源图输入 tokens + 30×图像输出 tokens) ÷ 1,000,000 ÷ 9 USD/张；auto 对应输出量未核实。

缺失字段：各题 auto 实际选择的质量档位/输出 token 数；编辑源图的 input_image_tokens / input fidelity；准确模型的文本 token 数（原提示词已保留）

核对说明：按查询日标准报价复算九题原条件，不依赖历史扣费金额；计费量和身份另行核验。

核对说明：已检查官方计算器的入参和性质；未自行选择 low/medium/high，未引用默认计算器数值。缺失的是质量/图像计费量，不是要求提供历史扣费日志。

资料：[OpenAI API 标准定价](https://developers.openai.com/api/docs/pricing)；[官方图像计费公式与输出 token 计算器](https://developers.openai.com/api/docs/guides/image-generation#cost-and-latency)

### microsoft/mai-image-2.5-pro

生成接口：`POST {Microsoft Foundry endpoint}/mai/v1/images/generations`

编辑接口：`POST {Microsoft Foundry endpoint}/mai/v1/images/edits`

- 图像输出：$106/百万 image output tokens；不能以 1,024 token 上限冒充实际输出量
- 文本输入：$5/百万 tokens（2.6 待核实直营价格）
- 参考图输入：$8/百万 tokens（2.6 待核实直营价格）
- 其他必收费：原 2.6 路由明确 web_grounding=false；不计入联网搜索。模型上下文/输出 token 上限不能当作实际用量。

计算：Σ(文本 token 数×文本单价 + 源图 token 数×图像输入单价 + 输出图 token 数×图像输出单价) ÷ 1,000,000 ÷ 9。仅知道像素上限不能推出 tokens。

缺失字段：准确模型的文本 token 化计数；2048×1152 输入图的计费 tokens 公式/数量；该实际输出像素对应的 image output tokens 公式/数量

核对说明：按查询日标准报价复算九题原条件，不依赖历史扣费金额；计费量和身份另行核验。

资料：[Microsoft Foundry 模型版本](https://learn.microsoft.com/en-us/azure/foundry/foundry-models/how-to/use-foundry-models-mai-image)；[Azure 官方模型价格 / 计算器入口](https://azure.microsoft.com/en-us/pricing/details/ai-foundry-models/microsoft/)；[Microsoft 官方发布价格](https://microsoft.ai/?post_type=new)

### seedream-5.0-pro

生成接口：`POST https://ark.cn-beijing.volces.com/api/v3/images/generations`

编辑接口：`POST https://ark.cn-beijing.volces.com/api/v3/images/generations + image`

- 图像输出：单图 ≤261 万像素 CNY 0.30，以上 CNY 0.60；首张输入免费
- 文本输入：包含于单张/像素价格，无独立文本计费项
- 参考图输入：首张源图免费（5.0 Pro）或输入图免费（5.0 Lite / 4.5 / 4.0）；由官方明示免费条款确认
- 其他必收费：无另行启用的搜索、字体、超分或样式训练费用；不使用优惠或免费额度

计算：Σ(每题输出费 + 文本输入费 + 该题参考图费 + 其他必收费) ÷ 9；CNY 再 × 1.1460 ÷ 7.6755。

核对说明：按查询日标准报价复算九题原条件，不依赖历史扣费金额；计费量和身份另行核验。

资料：[火山方舟 · 标准按量价格](https://docs.volcengine.com/docs/82379/1544106?lang=zh)；[火山方舟模型 ID](https://www.volcengine.com/docs/82379/1330310?lang=zh)

### qwen/qwen-image-3

生成接口：`原渠道 POST https://openrouter.ai/api/v1/images`

编辑接口：`原渠道 POST https://openrouter.ai/api/v1/images + input_references`

- 图像输出：Alibaba Cloud Int. 官方发布渠道 $0.03/输出张（1K/2K）；直营版本映射待核实
- 文本输入：包含于单张/像素价格，无独立文本计费项
- 参考图输入：官方发布渠道每张 $0.003；直营版本映射待核实
- 其他必收费：无另行启用的搜索、字体、超分或样式训练费用；不使用优惠或免费额度

计算：原渠道可复算 (6×0.03 + 3×(0.03+0.003))÷9 = $0.031/张；不是已核实的直营折算值。

缺失字段：渠道 qwen-image-3-20260805 与直营准确 API ID/版本的第一方映射

核对说明：按查询日标准报价复算九题原条件，不依赖历史扣费金额；计费量和身份另行核验。

资料：[阿里云百炼 · 北京标准按量价格](https://help.aliyun.com/zh/model-studio/model-pricing)；[原模型渠道身份](https://openrouter.ai/qwen/qwen-image-3)；[Alibaba 发布渠道的准确端点版本](https://openrouter.ai/api/v1/models/qwen/qwen-image-3/endpoints)；[Alibaba 发布渠道图像收费项](https://openrouter.ai/api/v1/images/models/qwen/qwen-image-3/endpoints)

### seedream-5.0

生成接口：`POST https://ark.cn-beijing.volces.com/api/v3/images/generations`

编辑接口：`POST https://ark.cn-beijing.volces.com/api/v3/images/generations + image`

- 图像输出：输出 CNY .22/张；输入免费
- 文本输入：包含于单张/像素价格，无独立文本计费项
- 参考图输入：CNY 0/张（3 道编辑题各 1 张；若为 0，依据厂商包含/免费输入条款）
- 其他必收费：无另行启用的搜索、字体、超分或样式训练费用；不使用优惠或免费额度

计算：(6×.22 + 3×(.22+0)) ÷ 9 CNY/张，再 ×1.1460÷7.6755 折为 USD。

核对说明：按查询日标准报价复算九题原条件，不依赖历史扣费金额；计费量和身份另行核验。

资料：[火山方舟 · 标准按量价格](https://docs.volcengine.com/docs/82379/1544106?lang=zh)；[火山方舟模型 ID](https://www.volcengine.com/docs/82379/1330310?lang=zh)

### microsoft/mai-image-2.6

生成接口：`POST {Microsoft Foundry endpoint}/mai/v1/images/generations`

编辑接口：`POST {Microsoft Foundry endpoint}/mai/v1/images/edits`

- 图像输出：官方价格待确认
- 文本输入：$5/百万 tokens（2.6 待核实直营价格）
- 参考图输入：$8/百万 tokens（2.6 待核实直营价格）
- 其他必收费：原 2.6 路由明确 web_grounding=false；不计入联网搜索。模型上下文/输出 token 上限不能当作实际用量。

计算：Σ(文本 token 数×文本单价 + 源图 token 数×图像输入单价 + 输出图 token 数×图像输出单价) ÷ 1,000,000 ÷ 9。仅知道像素上限不能推出 tokens。

缺失字段：准确模型的文本 token 化计数；2048×1152 输入图的计费 tokens 公式/数量；该实际输出像素对应的 image output tokens 公式/数量；直营标准单价可访问的第一方证据

核对说明：按查询日标准报价复算九题原条件，不依赖历史扣费金额；计费量和身份另行核验。

资料：[Microsoft Foundry 模型版本](https://learn.microsoft.com/en-us/azure/foundry/foundry-models/how-to/use-foundry-models-mai-image)；[Azure 官方模型价格 / 计算器入口](https://azure.microsoft.com/en-us/pricing/details/ai-foundry-models/microsoft/)；[Microsoft 2.6 定价公告（访问受阻）](https://techcommunity.microsoft.com/blog/azure-ai-foundry-blog/mai-image-2-6-and-mai-image-2-6-flash-quality-and-speed-at-production-scale/4550970)

### google/nano-banana-2

生成接口：`POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent`

编辑接口：`POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent（加入源图 part）`

- 图像输出：1680 固定输出 tokens × $60/百万 tokens
- 文本输入：$0.50/百万 input tokens；需该准确模型 tokenizer/countTokens 结果，中文原提示词不能直接按英文字符比率精确换算
- 参考图输入：$0.50/百万 input tokens；通用文档的图像切片规则不冒充该图像模型的精确输入计量
- 其他必收费：默认思考与文本输出 $3/百万 tokens；不可按 0。未启用 Google Search grounding。

计算：1680 × 60 / 1,000,000 + Σ(0.50×文本/图片输入 tokens + 3×思考/文本输出 tokens) ÷ 1,000,000 ÷ 9 USD/张。

缺失字段：各题 billable thinking tokens；九题准确模型 text input token 数；源图在该模型下的 input tokens

核对说明：按查询日标准报价复算九题原条件，不依赖历史扣费金额；计费量和身份另行核验。

核对说明：已使用官方固定输出 tokens 复算费用组成；并非因为缺少历史账单而排除。未调用 countTokens 或付费推理，未用字符估算伪装精确计数。

资料：[Gemini Developer API 标准定价](https://ai.google.dev/gemini-api/docs/pricing)；[Gemini 图像生成参数与默认思考计费](https://ai.google.dev/gemini-api/docs/image-generation)；[Google 官方图文 token 规则](https://ai.google.dev/gemini-api/docs/tokens)

### qwen-image-2.0-pro

生成接口：`POST https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation`

编辑接口：`POST https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation（源图输入）`

- 图像输出：输出 CNY .5/张；输入 CNY 0/张
- 文本输入：包含于单张/像素价格，无独立文本计费项
- 参考图输入：CNY 0/张（3 道编辑题各 1 张；若为 0，依据厂商包含/免费输入条款）
- 其他必收费：无另行启用的搜索、字体、超分或样式训练费用；不使用优惠或免费额度

计算：(6×.5 + 3×(.5+0)) ÷ 9 CNY/张，再 ×1.1460÷7.6755 折为 USD。

核对说明：按查询日标准报价复算九题原条件，不依赖历史扣费金额；计费量和身份另行核验。

资料：[阿里云百炼 · 北京标准按量价格](https://help.aliyun.com/zh/model-studio/model-pricing)

### microsoft/mai-image-2.5

生成接口：`POST {Microsoft Foundry endpoint}/mai/v1/images/generations`

编辑接口：`POST {Microsoft Foundry endpoint}/mai/v1/images/edits`

- 图像输出：每百万 token：文本输入 $5 / 图像输入 $8 / 图像输出 $47
- 文本输入：$5/百万 tokens（2.6 待核实直营价格）
- 参考图输入：$8/百万 tokens（2.6 待核实直营价格）
- 其他必收费：原 2.6 路由明确 web_grounding=false；不计入联网搜索。模型上下文/输出 token 上限不能当作实际用量。

计算：Σ(文本 token 数×文本单价 + 源图 token 数×图像输入单价 + 输出图 token 数×图像输出单价) ÷ 1,000,000 ÷ 9。仅知道像素上限不能推出 tokens。

缺失字段：准确模型的文本 token 化计数；2048×1152 输入图的计费 tokens 公式/数量；该实际输出像素对应的 image output tokens 公式/数量

核对说明：按查询日标准报价复算九题原条件，不依赖历史扣费金额；计费量和身份另行核验。

资料：[Microsoft Foundry 模型版本](https://learn.microsoft.com/en-us/azure/foundry/foundry-models/how-to/use-foundry-models-mai-image)；[Microsoft MAI-Image-2.5 发布](https://microsoft.ai/news/introducing-mai-image-2-5/)；[Azure 官方模型价格 / 计算器入口](https://azure.microsoft.com/en-us/pricing/details/ai-foundry-models/microsoft/)

### google/nano-banana-2-lite

生成接口：`POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-image:generateContent`

编辑接口：`POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-image:generateContent（加入源图 part）`

- 图像输出：1120 固定输出 tokens × $30/百万 tokens
- 文本输入：$0.25/百万 input tokens；需该准确模型 tokenizer/countTokens 结果，中文原提示词不能直接按英文字符比率精确换算
- 参考图输入：$0.25/百万 input tokens；通用文档的图像切片规则不冒充该图像模型的精确输入计量
- 其他必收费：默认思考与文本输出 $1.5/百万 tokens；不可按 0。未启用 Google Search grounding。

计算：1120 × 30 / 1,000,000 + Σ(0.25×文本/图片输入 tokens + 1.5×思考/文本输出 tokens) ÷ 1,000,000 ÷ 9 USD/张。

缺失字段：各题 billable thinking tokens；九题准确模型 text input token 数；源图在该模型下的 input tokens

核对说明：按查询日标准报价复算九题原条件，不依赖历史扣费金额；计费量和身份另行核验。

核对说明：已使用官方固定输出 tokens 复算费用组成；并非因为缺少历史账单而排除。未调用 countTokens 或付费推理，未用字符估算伪装精确计数。

资料：[Gemini Developer API 标准定价](https://ai.google.dev/gemini-api/docs/pricing)；[Gemini 图像生成参数与默认思考计费](https://ai.google.dev/gemini-api/docs/image-generation)；[Google 官方图文 token 规则](https://ai.google.dev/gemini-api/docs/tokens)

### x-ai/grok-imagine-image-quality

生成接口：`POST https://api.x.ai/v1/images/generations`

编辑接口：`POST https://api.x.ai/v1/images/edits`

- 图像输出：2K 输出 $0.07/张；输入 $0.01/张
- 文本输入：包含于单张/像素价格，无独立文本计费项
- 参考图输入：USD .01/张（3 道编辑题各 1 张；若为 0，依据厂商包含/免费输入条款）
- 其他必收费：无另行启用的搜索、字体、超分或样式训练费用；不使用优惠或免费额度

计算：(6×.07 + 3×(.07+.01)) ÷ 9 USD/张。

核对说明：按查询日标准报价复算九题原条件，不依赖历史扣费金额；计费量和身份另行核验。

资料：[xAI 官方模型定价](https://docs.x.ai/developers/models/grok-imagine-image-quality)

### wan2.7-image

生成接口：`POST https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation`

编辑接口：`POST https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation（源图输入）`

- 图像输出：输出 CNY .2/张；输入 CNY 0/张
- 文本输入：包含于单张/像素价格，无独立文本计费项
- 参考图输入：CNY 0/张（3 道编辑题各 1 张；若为 0，依据厂商包含/免费输入条款）
- 其他必收费：无另行启用的搜索、字体、超分或样式训练费用；不使用优惠或免费额度

计算：(6×.2 + 3×(.2+0)) ÷ 9 CNY/张，再 ×1.1460÷7.6755 折为 USD。

核对说明：按查询日标准报价复算九题原条件，不依赖历史扣费金额；计费量和身份另行核验。

资料：[阿里云百炼 · 北京标准按量价格](https://help.aliyun.com/zh/model-studio/model-pricing)

### wan2.7-image-pro

生成接口：`POST https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation`

编辑接口：`POST https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation（源图输入）`

- 图像输出：输出 CNY .5/张；输入 CNY 0/张
- 文本输入：包含于单张/像素价格，无独立文本计费项
- 参考图输入：CNY 0/张（3 道编辑题各 1 张；若为 0，依据厂商包含/免费输入条款）
- 其他必收费：无另行启用的搜索、字体、超分或样式训练费用；不使用优惠或免费额度

计算：(6×.5 + 3×(.5+0)) ÷ 9 CNY/张，再 ×1.1460÷7.6755 折为 USD。

核对说明：按查询日标准报价复算九题原条件，不依赖历史扣费金额；计费量和身份另行核验。

资料：[阿里云百炼 · 北京标准按量价格](https://help.aliyun.com/zh/model-studio/model-pricing)

### qwen-image-2.0

生成接口：`POST https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation`

编辑接口：`POST https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation（源图输入）`

- 图像输出：输出 CNY .2/张；输入 CNY 0/张
- 文本输入：包含于单张/像素价格，无独立文本计费项
- 参考图输入：CNY 0/张（3 道编辑题各 1 张；若为 0，依据厂商包含/免费输入条款）
- 其他必收费：无另行启用的搜索、字体、超分或样式训练费用；不使用优惠或免费额度

计算：(6×.2 + 3×(.2+0)) ÷ 9 CNY/张，再 ×1.1460÷7.6755 折为 USD。

核对说明：按查询日标准报价复算九题原条件，不依赖历史扣费金额；计费量和身份另行核验。

资料：[阿里云百炼 · 北京标准按量价格](https://help.aliyun.com/zh/model-studio/model-pricing)

### seedream-4.5

生成接口：`POST https://ark.cn-beijing.volces.com/api/v3/images/generations`

编辑接口：`POST https://ark.cn-beijing.volces.com/api/v3/images/generations + image`

- 图像输出：输出 CNY .25/张；输入免费
- 文本输入：包含于单张/像素价格，无独立文本计费项
- 参考图输入：CNY 0/张（3 道编辑题各 1 张；若为 0，依据厂商包含/免费输入条款）
- 其他必收费：无另行启用的搜索、字体、超分或样式训练费用；不使用优惠或免费额度

计算：(6×.25 + 3×(.25+0)) ÷ 9 CNY/张，再 ×1.1460÷7.6755 折为 USD。

核对说明：按查询日标准报价复算九题原条件，不依赖历史扣费金额；计费量和身份另行核验。

资料：[火山方舟 · 标准按量价格](https://docs.volcengine.com/docs/82379/1544106?lang=zh)；[火山方舟模型 ID](https://www.volcengine.com/docs/82379/1330310?lang=zh)

### recraft/recraft-v4.1-utility-pro

生成接口：`POST https://external.api.recraft.ai/v1/images/generations`

编辑接口：`POST https://external.api.recraft.ai/v1/images/imageToImage`

- 图像输出：生成 $.21/张（1,000 API units = $1）
- 文本输入：包含于单张/像素价格，无独立文本计费项
- 参考图输入：USD 0/张（3 道编辑题各 1 张；若为 0，依据厂商包含/免费输入条款）
- 其他必收费：无另行启用的搜索、字体、超分或样式训练费用；不使用优惠或免费额度

计算：(6×.21 + 3×(.21+0)) ÷ 9 USD/张。

核对说明：按查询日标准报价复算九题原条件，不依赖历史扣费金额；计费量和身份另行核验。

核对说明：模型页按准确变体列出 Price per image 并列明 imageToImage；接口枚举确认该变体，Recraft 服务端公开账单项仅 output_image，与直营金额一致。旧独立操作价表仅列 V3 不等于新版不支持编辑。

资料：[Recraft 官方 API 定价](https://www.recraft.ai/docs/api-reference/pricing)；[Recraft 官方模型参数](https://www.recraft.ai/docs/api-reference/endpoints)；[Recraft 服务端公开计费项（交叉核验）](https://openrouter.ai/api/v1/images/models/recraft/recraft-v4.1-utility-pro/endpoints)；[Recraft 模型单张价格与支持操作](https://www.recraft.ai/docs/api-reference/models/recraft-v4-1)

### google/nano-banana

生成接口：`POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent`

编辑接口：`POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent（加入源图 part）`

- 图像输出：1290 固定输出 tokens × $30/百万 tokens
- 文本输入：$0.30/百万 input tokens；需该准确模型 tokenizer/countTokens 结果，中文原提示词不能直接按英文字符比率精确换算
- 参考图输入：$0.30/百万 input tokens；通用文档的图像切片规则不冒充该图像模型的精确输入计量
- 其他必收费：2.5 图像模型不使用 3.x 思考价格；未启用外部搜索

计算：0.0387 + 0.30 × Σ(文本 tokens + 源图 tokens) ÷ 1,000,000 ÷ 9 USD/张；输入量未闭合。

缺失字段：九题该模型 text input token 计数；2048×1152 源图的该模型 input tokens

核对说明：按查询日标准报价复算九题原条件，不依赖历史扣费金额；计费量和身份另行核验。

核对说明：已使用官方固定输出 tokens 复算费用组成；并非因为缺少历史账单而排除。未调用 countTokens 或付费推理，未用字符估算伪装精确计数。

资料：[Gemini Developer API 标准定价](https://ai.google.dev/gemini-api/docs/pricing)；[Gemini 图像生成参数与默认思考计费](https://ai.google.dev/gemini-api/docs/image-generation)；[Google 官方图文 token 规则](https://ai.google.dev/gemini-api/docs/tokens)

### black-forest-labs/flux.2-flex

生成接口：`POST https://api.bfl.ai/v1/flux-2-flex`

编辑接口：`POST https://api.bfl.ai/v1/flux-2-flex + input_image`

- 图像输出：首输出 MP $.05；额外输出 MP $.05；输入 MP $.05
- 文本输入：包含于单张/像素价格，无独立文本计费项
- 参考图输入：源图单独向上取整为 3 MP，每 MP $.05
- 其他必收费：无另行启用的搜索、字体、超分或样式训练费用；不使用优惠或免费额度

计算：生成：.05 + (ceil(1824×1024/1048576)−1)×.05；编辑另加 ceil(2048×1152/1048576)×.05；九题均值。

核对说明：按查询日标准报价复算九题原条件，不依赖历史扣费金额；计费量和身份另行核验。

资料：[BFL 官方 API 定价](https://bfl.ai/pricing?category=flux.2)

### recraft/recraft-v4.1-vector

生成接口：`POST https://external.api.recraft.ai/v1/images/generations`

编辑接口：`POST https://external.api.recraft.ai/v1/images/imageToImage`

- 图像输出：生成 $.08/张（1,000 API units = $1）
- 文本输入：包含于单张/像素价格，无独立文本计费项
- 参考图输入：USD 0/张（3 道编辑题各 1 张；若为 0，依据厂商包含/免费输入条款）
- 其他必收费：无另行启用的搜索、字体、超分或样式训练费用；不使用优惠或免费额度

计算：(6×.08 + 3×(.08+0)) ÷ 9 USD/张。

核对说明：按查询日标准报价复算九题原条件，不依赖历史扣费金额；计费量和身份另行核验。

核对说明：模型页按准确变体列出 Price per image 并列明 imageToImage；接口枚举确认该变体，Recraft 服务端公开账单项仅 output_image，与直营金额一致。旧独立操作价表仅列 V3 不等于新版不支持编辑。

资料：[Recraft 官方 API 定价](https://www.recraft.ai/docs/api-reference/pricing)；[Recraft 官方模型参数](https://www.recraft.ai/docs/api-reference/endpoints)；[Recraft 服务端公开计费项（交叉核验）](https://openrouter.ai/api/v1/images/models/recraft/recraft-v4.1-vector/endpoints)；[Recraft 模型单张价格与支持操作](https://www.recraft.ai/docs/api-reference/models/recraft-v4-1)

### sourceful/riverflow-v2-fast

生成接口：`官方发布渠道 POST https://openrouter.ai/api/v1/images`

编辑接口：`官方发布渠道 POST https://openrouter.ai/api/v1/images + input_references`

- 图像输出：Sourceful 官方发布渠道 $0.04/2K 输出张；直营模型级价目待核实
- 文本输入：该渠道未列独立文本输入项；直营工作流口径未闭合
- 参考图输入：$0.20/input_reference；原 3 道编辑题各 1 张，不为 0
- 其他必收费：无另行启用的搜索、字体、超分或样式训练费用；不使用优惠或免费额度

计算：已核实渠道报价 (6×0.04 + 3×(0.04+0.20))÷9 = $0.1066666667/张；这是渠道条件核对结果，未采用为直营比较值。

缺失字段：此准确版本的直营模型/API 对应关系及标准单价

核对说明：按查询日标准报价复算九题原条件，不依赖历史扣费金额；计费量和身份另行核验。

资料：[Riverflow 官方平台 API](https://www.riverflow.ai/app/platform-api/docs)；[Riverflow 2.5 官方渠道说明](https://www.riverflow.ai/models/riverflow-2.5)；[官方发布渠道 OpenRouter](https://openrouter.ai/sourceful/riverflow-v2-fast)；[Sourceful 服务端公开计费元数据](https://openrouter.ai/api/v1/images/models/sourceful/riverflow-v2-fast/endpoints)

### doubao-seedream-4-0-250828

生成接口：`POST https://ark.cn-beijing.volces.com/api/v3/images/generations`

编辑接口：`POST https://ark.cn-beijing.volces.com/api/v3/images/generations + image`

- 图像输出：输出 CNY .20/张；输入免费
- 文本输入：包含于单张/像素价格，无独立文本计费项
- 参考图输入：CNY 0/张（3 道编辑题各 1 张；若为 0，依据厂商包含/免费输入条款）
- 其他必收费：无另行启用的搜索、字体、超分或样式训练费用；不使用优惠或免费额度

计算：(6×.20 + 3×(.20+0)) ÷ 9 CNY/张，再 ×1.1460÷7.6755 折为 USD。

核对说明：按查询日标准报价复算九题原条件，不依赖历史扣费金额；计费量和身份另行核验。

资料：[火山方舟 · 标准按量价格](https://docs.volcengine.com/docs/82379/1544106?lang=zh)；[火山方舟模型 ID](https://www.volcengine.com/docs/82379/1330310?lang=zh)

### recraft/recraft-v4.1-pro

生成接口：`POST https://external.api.recraft.ai/v1/images/generations`

编辑接口：`POST https://external.api.recraft.ai/v1/images/imageToImage`

- 图像输出：生成 $.21/张（1,000 API units = $1）
- 文本输入：包含于单张/像素价格，无独立文本计费项
- 参考图输入：USD 0/张（3 道编辑题各 1 张；若为 0，依据厂商包含/免费输入条款）
- 其他必收费：无另行启用的搜索、字体、超分或样式训练费用；不使用优惠或免费额度

计算：(6×.21 + 3×(.21+0)) ÷ 9 USD/张。

核对说明：按查询日标准报价复算九题原条件，不依赖历史扣费金额；计费量和身份另行核验。

核对说明：模型页按准确变体列出 Price per image 并列明 imageToImage；接口枚举确认该变体，Recraft 服务端公开账单项仅 output_image，与直营金额一致。旧独立操作价表仅列 V3 不等于新版不支持编辑。

资料：[Recraft 官方 API 定价](https://www.recraft.ai/docs/api-reference/pricing)；[Recraft 官方模型参数](https://www.recraft.ai/docs/api-reference/endpoints)；[Recraft 服务端公开计费项（交叉核验）](https://openrouter.ai/api/v1/images/models/recraft/recraft-v4.1-pro/endpoints)；[Recraft 模型单张价格与支持操作](https://www.recraft.ai/docs/api-reference/models/recraft-v4-1)

### recraft/recraft-v4.1

生成接口：`POST https://external.api.recraft.ai/v1/images/generations`

编辑接口：`POST https://external.api.recraft.ai/v1/images/imageToImage`

- 图像输出：生成 $.035/张（1,000 API units = $1）
- 文本输入：包含于单张/像素价格，无独立文本计费项
- 参考图输入：USD 0/张（3 道编辑题各 1 张；若为 0，依据厂商包含/免费输入条款）
- 其他必收费：无另行启用的搜索、字体、超分或样式训练费用；不使用优惠或免费额度

计算：(6×.035 + 3×(.035+0)) ÷ 9 USD/张。

核对说明：按查询日标准报价复算九题原条件，不依赖历史扣费金额；计费量和身份另行核验。

核对说明：模型页按准确变体列出 Price per image 并列明 imageToImage；接口枚举确认该变体，Recraft 服务端公开账单项仅 output_image，与直营金额一致。旧独立操作价表仅列 V3 不等于新版不支持编辑。

资料：[Recraft 官方 API 定价](https://www.recraft.ai/docs/api-reference/pricing)；[Recraft 官方模型参数](https://www.recraft.ai/docs/api-reference/endpoints)；[Recraft 服务端公开计费项（交叉核验）](https://openrouter.ai/api/v1/images/models/recraft/recraft-v4.1/endpoints)；[Recraft 模型单张价格与支持操作](https://www.recraft.ai/docs/api-reference/models/recraft-v4-1)

### recraft/recraft-v4.1-pro-vector

生成接口：`POST https://external.api.recraft.ai/v1/images/generations`

编辑接口：`POST https://external.api.recraft.ai/v1/images/imageToImage`

- 图像输出：生成 $.30/张（1,000 API units = $1）
- 文本输入：包含于单张/像素价格，无独立文本计费项
- 参考图输入：USD 0/张（3 道编辑题各 1 张；若为 0，依据厂商包含/免费输入条款）
- 其他必收费：无另行启用的搜索、字体、超分或样式训练费用；不使用优惠或免费额度

计算：(6×.30 + 3×(.30+0)) ÷ 9 USD/张。

核对说明：按查询日标准报价复算九题原条件，不依赖历史扣费金额；计费量和身份另行核验。

核对说明：模型页按准确变体列出 Price per image 并列明 imageToImage；接口枚举确认该变体，Recraft 服务端公开账单项仅 output_image，与直营金额一致。旧独立操作价表仅列 V3 不等于新版不支持编辑。

资料：[Recraft 官方 API 定价](https://www.recraft.ai/docs/api-reference/pricing)；[Recraft 官方模型参数](https://www.recraft.ai/docs/api-reference/endpoints)；[Recraft 服务端公开计费项（交叉核验）](https://openrouter.ai/api/v1/images/models/recraft/recraft-v4.1-pro-vector/endpoints)；[Recraft 模型单张价格与支持操作](https://www.recraft.ai/docs/api-reference/models/recraft-v4-1)

### krea/krea-2-large

生成接口：`POST https://api.krea.ai/generate/image/krea/krea-2/large`

编辑接口：`POST https://api.krea.ai/generate/image/krea/krea-2/large + image_style_references`

- 图像输出：文本生图 $.060/张；Style references $.065/张
- 文本输入：包含于单张/像素价格，无独立文本计费项
- 参考图输入：已完整包含于 Style references 档位；不另加 moodboard 费用
- 其他必收费：无另行启用的搜索、字体、超分或样式训练费用；不使用优惠或免费额度

计算：(6 × .060 + 3 × .065) ÷ 9 USD/张。

核对说明：按查询日标准报价复算九题原条件，不依赖历史扣费金额；计费量和身份另行核验。

资料：[Krea 官方模型接口与价格](https://www.krea.ai/docs/api-reference/krea/krea-2-large)

### black-forest-labs/flux.2-pro

生成接口：`POST https://api.bfl.ai/v1/flux-2-pro`

编辑接口：`POST https://api.bfl.ai/v1/flux-2-pro + input_image`

- 图像输出：首输出 MP $.03；额外输出 MP $.015；输入 MP $.015
- 文本输入：包含于单张/像素价格，无独立文本计费项
- 参考图输入：源图单独向上取整为 3 MP，每 MP $.015
- 其他必收费：无另行启用的搜索、字体、超分或样式训练费用；不使用优惠或免费额度

计算：生成：.03 + (ceil(1824×1024/1048576)−1)×.015；编辑另加 ceil(2048×1152/1048576)×.015；九题均值。

核对说明：按查询日标准报价复算九题原条件，不依赖历史扣费金额；计费量和身份另行核验。

资料：[BFL 官方 API 定价](https://bfl.ai/pricing?category=flux.2)

### recraft/recraft-v4.1-utility

生成接口：`POST https://external.api.recraft.ai/v1/images/generations`

编辑接口：`POST https://external.api.recraft.ai/v1/images/imageToImage`

- 图像输出：生成 $.035/张（1,000 API units = $1）
- 文本输入：包含于单张/像素价格，无独立文本计费项
- 参考图输入：USD 0/张（3 道编辑题各 1 张；若为 0，依据厂商包含/免费输入条款）
- 其他必收费：无另行启用的搜索、字体、超分或样式训练费用；不使用优惠或免费额度

计算：(6×.035 + 3×(.035+0)) ÷ 9 USD/张。

核对说明：按查询日标准报价复算九题原条件，不依赖历史扣费金额；计费量和身份另行核验。

核对说明：模型页按准确变体列出 Price per image 并列明 imageToImage；接口枚举确认该变体，Recraft 服务端公开账单项仅 output_image，与直营金额一致。旧独立操作价表仅列 V3 不等于新版不支持编辑。

资料：[Recraft 官方 API 定价](https://www.recraft.ai/docs/api-reference/pricing)；[Recraft 官方模型参数](https://www.recraft.ai/docs/api-reference/endpoints)；[Recraft 服务端公开计费项（交叉核验）](https://openrouter.ai/api/v1/images/models/recraft/recraft-v4.1-utility/endpoints)；[Recraft 模型单张价格与支持操作](https://www.recraft.ai/docs/api-reference/models/recraft-v4-1)

### black-forest-labs/flux.2-max

生成接口：`POST https://api.bfl.ai/v1/flux-2-max`

编辑接口：`POST https://api.bfl.ai/v1/flux-2-max + input_image`

- 图像输出：首输出 MP $.07；额外输出 MP $.03；输入 MP $.03
- 文本输入：包含于单张/像素价格，无独立文本计费项
- 参考图输入：源图单独向上取整为 3 MP，每 MP $.03
- 其他必收费：无另行启用的搜索、字体、超分或样式训练费用；不使用优惠或免费额度

计算：生成：.07 + (ceil(1824×1024/1048576)−1)×.03；编辑另加 ceil(2048×1152/1048576)×.03；九题均值。

核对说明：按查询日标准报价复算九题原条件，不依赖历史扣费金额；计费量和身份另行核验。

资料：[BFL 官方 API 定价](https://bfl.ai/pricing?category=flux.2)

### krea/krea-2-medium-turbo

生成接口：`POST https://api.krea.ai/generate/image/krea/krea-2/medium-turbo`

编辑接口：`POST https://api.krea.ai/generate/image/krea/krea-2/medium-turbo + image_style_references`

- 图像输出：文本生图 $.015/张；Style references $.0175/张
- 文本输入：包含于单张/像素价格，无独立文本计费项
- 参考图输入：已完整包含于 Style references 档位；不另加 moodboard 费用
- 其他必收费：无另行启用的搜索、字体、超分或样式训练费用；不使用优惠或免费额度

计算：(6 × .015 + 3 × .0175) ÷ 9 USD/张。

核对说明：按查询日标准报价复算九题原条件，不依赖历史扣费金额；计费量和身份另行核验。

资料：[Krea 官方模型接口与价格](https://www.krea.ai/docs/api-reference/krea/krea-2-turbo)

### recraft/recraft-v4-vector

生成接口：`POST https://external.api.recraft.ai/v1/images/generations`

编辑接口：`POST https://external.api.recraft.ai/v1/images/imageToImage`

- 图像输出：生成 $.08/张（1,000 API units = $1）
- 文本输入：包含于单张/像素价格，无独立文本计费项
- 参考图输入：USD 0/张（3 道编辑题各 1 张；若为 0，依据厂商包含/免费输入条款）
- 其他必收费：无另行启用的搜索、字体、超分或样式训练费用；不使用优惠或免费额度

计算：(6×.08 + 3×(.08+0)) ÷ 9 USD/张。

核对说明：按查询日标准报价复算九题原条件，不依赖历史扣费金额；计费量和身份另行核验。

核对说明：模型页按准确变体列出 Price per image 并列明 imageToImage；接口枚举确认该变体，Recraft 服务端公开账单项仅 output_image，与直营金额一致。旧独立操作价表仅列 V3 不等于新版不支持编辑。

资料：[Recraft 官方 API 定价](https://www.recraft.ai/docs/api-reference/pricing)；[Recraft 官方模型参数](https://www.recraft.ai/docs/api-reference/endpoints)；[Recraft 服务端公开计费项（交叉核验）](https://openrouter.ai/api/v1/images/models/recraft/recraft-v4-vector/endpoints)；[Recraft 模型单张价格与支持操作](https://www.recraft.ai/docs/api-reference/models/recraft-v4)

### recraft/recraft-v4

生成接口：`POST https://external.api.recraft.ai/v1/images/generations`

编辑接口：`POST https://external.api.recraft.ai/v1/images/imageToImage`

- 图像输出：生成 $.04/张（1,000 API units = $1）
- 文本输入：包含于单张/像素价格，无独立文本计费项
- 参考图输入：USD 0/张（3 道编辑题各 1 张；若为 0，依据厂商包含/免费输入条款）
- 其他必收费：无另行启用的搜索、字体、超分或样式训练费用；不使用优惠或免费额度

计算：(6×.04 + 3×(.04+0)) ÷ 9 USD/张。

核对说明：按查询日标准报价复算九题原条件，不依赖历史扣费金额；计费量和身份另行核验。

核对说明：模型页按准确变体列出 Price per image 并列明 imageToImage；接口枚举确认该变体，Recraft 服务端公开账单项仅 output_image，与直营金额一致。旧独立操作价表仅列 V3 不等于新版不支持编辑。

资料：[Recraft 官方 API 定价](https://www.recraft.ai/docs/api-reference/pricing)；[Recraft 官方模型参数](https://www.recraft.ai/docs/api-reference/endpoints)；[Recraft 服务端公开计费项（交叉核验）](https://openrouter.ai/api/v1/images/models/recraft/recraft-v4/endpoints)；[Recraft 模型单张价格与支持操作](https://www.recraft.ai/docs/api-reference/models/recraft-v4)

### recraft/recraft-v4-pro

生成接口：`POST https://external.api.recraft.ai/v1/images/generations`

编辑接口：`POST https://external.api.recraft.ai/v1/images/imageToImage`

- 图像输出：生成 $.25/张（1,000 API units = $1）
- 文本输入：包含于单张/像素价格，无独立文本计费项
- 参考图输入：USD 0/张（3 道编辑题各 1 张；若为 0，依据厂商包含/免费输入条款）
- 其他必收费：无另行启用的搜索、字体、超分或样式训练费用；不使用优惠或免费额度

计算：(6×.25 + 3×(.25+0)) ÷ 9 USD/张。

核对说明：按查询日标准报价复算九题原条件，不依赖历史扣费金额；计费量和身份另行核验。

核对说明：模型页按准确变体列出 Price per image 并列明 imageToImage；接口枚举确认该变体，Recraft 服务端公开账单项仅 output_image，与直营金额一致。旧独立操作价表仅列 V3 不等于新版不支持编辑。

资料：[Recraft 官方 API 定价](https://www.recraft.ai/docs/api-reference/pricing)；[Recraft 官方模型参数](https://www.recraft.ai/docs/api-reference/endpoints)；[Recraft 服务端公开计费项（交叉核验）](https://openrouter.ai/api/v1/images/models/recraft/recraft-v4-pro/endpoints)；[Recraft 模型单张价格与支持操作](https://www.recraft.ai/docs/api-reference/models/recraft-v4)

### sourceful/riverflow-v2.5-fast

生成接口：`官方发布渠道 POST https://openrouter.ai/api/v1/images`

编辑接口：`官方发布渠道 POST https://openrouter.ai/api/v1/images + input_references`

- 图像输出：OpenRouter 官方发布渠道按任务动态计价；非固定单张价格
- 文本输入：该渠道未列独立文本输入项；直营工作流口径未闭合
- 参考图输入：编辑参考图会影响动态复杂度；无证据证明总输入/处理费为 0
- 其他必收费：无另行启用的搜索、字体、超分或样式训练费用；不使用优惠或免费额度

计算：Σ(对应分辨率基础输出费 + 必需动态处理费 + 输入附加费)÷9；动态处理量不可复算。

缺失字段：精确 billable processing 工作量/动态收费公式；原请求服务的 reasoning effort 及编辑处理步骤

核对说明：按查询日标准报价复算九题原条件，不依赖历史扣费金额；计费量和身份另行核验。

资料：[Riverflow 官方平台 API](https://www.riverflow.ai/app/platform-api/docs)；[Riverflow 2.5 官方渠道说明](https://www.riverflow.ai/models/riverflow-2.5)；[官方发布渠道 OpenRouter](https://openrouter.ai/sourceful/riverflow-v2.5-fast)；[Sourceful 服务端公开计费元数据](https://openrouter.ai/api/v1/images/models/sourceful/riverflow-v2.5-fast/endpoints)

### krea/krea-2-medium

生成接口：`POST https://api.krea.ai/generate/image/krea/krea-2/medium`

编辑接口：`POST https://api.krea.ai/generate/image/krea/krea-2/medium + image_style_references`

- 图像输出：文本生图 $.030/张；Style references $.035/张
- 文本输入：包含于单张/像素价格，无独立文本计费项
- 参考图输入：已完整包含于 Style references 档位；不另加 moodboard 费用
- 其他必收费：无另行启用的搜索、字体、超分或样式训练费用；不使用优惠或免费额度

计算：(6 × .030 + 3 × .035) ÷ 9 USD/张。

核对说明：按查询日标准报价复算九题原条件，不依赖历史扣费金额；计费量和身份另行核验。

资料：[Krea 官方模型接口与价格](https://www.krea.ai/docs/api-reference/krea/krea-2-medium)

### recraft/recraft-v4-pro-vector

生成接口：`POST https://external.api.recraft.ai/v1/images/generations`

编辑接口：`POST https://external.api.recraft.ai/v1/images/imageToImage`

- 图像输出：生成 $.30/张（1,000 API units = $1）
- 文本输入：包含于单张/像素价格，无独立文本计费项
- 参考图输入：USD 0/张（3 道编辑题各 1 张；若为 0，依据厂商包含/免费输入条款）
- 其他必收费：无另行启用的搜索、字体、超分或样式训练费用；不使用优惠或免费额度

计算：(6×.30 + 3×(.30+0)) ÷ 9 USD/张。

核对说明：按查询日标准报价复算九题原条件，不依赖历史扣费金额；计费量和身份另行核验。

核对说明：模型页按准确变体列出 Price per image 并列明 imageToImage；接口枚举确认该变体，Recraft 服务端公开账单项仅 output_image，与直营金额一致。旧独立操作价表仅列 V3 不等于新版不支持编辑。

资料：[Recraft 官方 API 定价](https://www.recraft.ai/docs/api-reference/pricing)；[Recraft 官方模型参数](https://www.recraft.ai/docs/api-reference/endpoints)；[Recraft 服务端公开计费项（交叉核验）](https://openrouter.ai/api/v1/images/models/recraft/recraft-v4-pro-vector/endpoints)；[Recraft 模型单张价格与支持操作](https://www.recraft.ai/docs/api-reference/models/recraft-v4)

### black-forest-labs/flux.2-klein-4b

生成接口：`POST https://api.bfl.ai/v1/flux-2-klein-4b`

编辑接口：`POST https://api.bfl.ai/v1/flux-2-klein-4b + input_image`

- 图像输出：首输出 MP $.014；额外输出 MP $.001；输入 MP $.001
- 文本输入：包含于单张/像素价格，无独立文本计费项
- 参考图输入：源图单独向上取整为 3 MP，每 MP $.001
- 其他必收费：无另行启用的搜索、字体、超分或样式训练费用；不使用优惠或免费额度

计算：生成：.014 + (ceil(1824×1024/1048576)−1)×.001；编辑另加 ceil(2048×1152/1048576)×.001；九题均值。

核对说明：按查询日标准报价复算九题原条件，不依赖历史扣费金额；计费量和身份另行核验。

资料：[BFL 官方 API 定价](https://bfl.ai/pricing?category=flux.2)

### recraft/recraft-v3

生成接口：`POST https://external.api.recraft.ai/v1/images/generations`

编辑接口：`POST https://external.api.recraft.ai/v1/images/imageToImage`

- 图像输出：栅格生成 / image-to-image 均 $0.04/张
- 文本输入：包含于单张/像素价格，无独立文本计费项
- 参考图输入：USD 0/张（3 道编辑题各 1 张；若为 0，依据厂商包含/免费输入条款）
- 其他必收费：无另行启用的搜索、字体、超分或样式训练费用；不使用优惠或免费额度

计算：(6×.04 + 3×(.04+0)) ÷ 9 USD/张。

核对说明：按查询日标准报价复算九题原条件，不依赖历史扣费金额；计费量和身份另行核验。

资料：[Recraft 官方 API 定价](https://www.recraft.ai/docs/api-reference/pricing)；[Recraft 官方模型参数](https://www.recraft.ai/docs/api-reference/endpoints)；[Recraft 服务端公开计费项（交叉核验）](https://openrouter.ai/api/v1/images/models/recraft/recraft-v3/endpoints)

### recraft/recraft-v4-styles-vector

生成接口：`POST https://external.api.recraft.ai/v1/images/generations`

编辑接口：`POST https://external.api.recraft.ai/v1/images/generations（style references，不是 imageToImage）`

- 图像输出：生成 $.05/张（1,000 API units = $1）
- 文本输入：包含于单张/像素价格，无独立文本计费项
- 参考图输入：$0.005/次请求（内联 style reference 创建），不能当作免费
- 其他必收费：无另行启用的搜索、字体、超分或样式训练费用；不使用优惠或免费额度

计算：编辑参考费可核验；生成六题缺少必需样式条件，不计算九题均值。

缺失字段：6 道生成题必需的 style_id / style reference（原题不存在）

核对说明：按查询日标准报价复算九题原条件，不依赖历史扣费金额；计费量和身份另行核验。

资料：[Recraft 官方 API 定价](https://www.recraft.ai/docs/api-reference/pricing)；[Recraft 官方模型参数](https://www.recraft.ai/docs/api-reference/endpoints)；[Recraft 服务端公开计费项（交叉核验）](https://openrouter.ai/api/v1/images/models/recraft/recraft-v4-styles-vector/endpoints)；[Recraft V4 Styles 必需样式与参考输入](https://www.recraft.ai/docs/api-reference/models/recraft-v4-styles)

### recraft/recraft-v4-styles-pro-vector

生成接口：`POST https://external.api.recraft.ai/v1/images/generations`

编辑接口：`POST https://external.api.recraft.ai/v1/images/generations（style references，不是 imageToImage）`

- 图像输出：生成 $.12/张（1,000 API units = $1）
- 文本输入：包含于单张/像素价格，无独立文本计费项
- 参考图输入：$0.005/次请求（内联 style reference 创建），不能当作免费
- 其他必收费：无另行启用的搜索、字体、超分或样式训练费用；不使用优惠或免费额度

计算：编辑参考费可核验；生成六题缺少必需样式条件，不计算九题均值。

缺失字段：6 道生成题必需的 style_id / style reference（原题不存在）

核对说明：按查询日标准报价复算九题原条件，不依赖历史扣费金额；计费量和身份另行核验。

资料：[Recraft 官方 API 定价](https://www.recraft.ai/docs/api-reference/pricing)；[Recraft 官方模型参数](https://www.recraft.ai/docs/api-reference/endpoints)；[Recraft 服务端公开计费项（交叉核验）](https://openrouter.ai/api/v1/images/models/recraft/recraft-v4-styles-pro-vector/endpoints)；[Recraft V4 Styles 必需样式与参考输入](https://www.recraft.ai/docs/api-reference/models/recraft-v4-styles)

### z-image-turbo

生成接口：`POST https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis`

编辑接口：`原正式协议标记 unsupported`

- 图像输出：生成 CNY 0.10/张（不扩写）或 0.20/张（prompt_extend）
- 文本输入：包含于单张/像素价格，无独立文本计费项
- 参考图输入：按下列公式计入 3 道编辑题
- 其他必收费：无另行启用的搜索、字体、超分或样式训练费用；不使用优惠或免费额度

计算：6 题生成价不能替代固定 9 题成本。不得将 3 题 unsupported 的报价设为 0。

缺失字段：原模型不存在的编辑接口/编辑标准报价

核对说明：按查询日标准报价复算九题原条件，不依赖历史扣费金额；计费量和身份另行核验。

资料：[阿里云百炼 · 北京标准按量价格](https://help.aliyun.com/zh/model-studio/model-pricing)
