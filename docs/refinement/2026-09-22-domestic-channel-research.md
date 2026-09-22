# 科研绘图渠道调研与优先级

核查日期：**2026-09-22（Asia/Shanghai）**。先审计本地目录和调用链，再查官方模型/API/价格/条款。推荐是接入价值判断，未做付费质量或成本基准；“可调用”均需账号授权验证。模型研发方与 API 运营方分别列示。实施范围为 Runware、腾讯 TokenHub，加上用户后续明确要求的小米主模型/识图；其余渠道仅建议。

## 官方厂商渠道

| 候选 / 运营方与研发方 | 代表型号与增量 | 规划/视觉/生图/编辑、多图和尺寸 | 协议、认证、调用与条件 | 价格/数据透明度 | 成本与等级、主要限制 | 官方来源（核查日同上） |
| --- | --- | --- | --- | --- | --- | --- |
| 小米 MiMo 官方，研发小米 | **V2.6 Pro、Flash**（9 月 22 日发布）；补最新官方主模型与视觉路线，旧百炼/观猹 MiMo 记录不等于本次官方接入 | 文本+图像理解；本轮不声称生图/编辑。URL/Base64；新型号精确图片硬限额待确认，图研保守 3 图 | Chat Completions，Bearer/API-key，同步；普通 Pro/Flash 100 RPM、10M TPM/账号模型；UltraSpeed 需定制。普通 API Key 与 Token Plan 区分 | CNY/百万 token：Pro 输入未命中 3、缓存 .025、输出 6；Flash 1/.02/2。海外计价另表。精确保留、训练使用和账号地区条款待确认 | **A，已实施 Pro/Flash**；文本适配低、输入预算/错误处理/元数据中。UltraSpeed 30/.25/60，先不推荐普通用户接入 | [发布](https://mimo.mi.com/docs/en-US/updates/model)、[API](https://mimo.mi.com/docs/en-US/api/chat/openai-api)、[限流](https://mimo.mi.com/docs/en-US/api/guidance/rate-limit)、[价格](https://mimo.mi.com/docs/en-US/price/pay-as-you-go)、[隐私入口](https://mimo.mi.com/docs/terms/privacy-policy) |
| 腾讯 TokenHub；本轮选腾讯研发 HY，但平台也运营其他厂商模型 | `hy3`、`hy-vision-2.0-instruct`、`hy-image-v3`；官方 HY 规划/理解/图片链路。Replicate 已有 Hunyuan 家族，不等于 TokenHub 接入 | HY3 文本；HY Vision 识图；HY Image v3 生成/编辑最多总 3 图、512–2048 px 且 ≤1 MP，无本轮已核实遮罩/结构化。HY Image 3.5 Preview 另接口、20 图/更大尺寸，未混用 | 文本 Chat Completions；图片专用同步 JSON；Bearer。大陆与海外入口/Key 分开，配额按模型账号；不沿用旧混元 SecretId/TC3 或计费规则 | 公开表 CNY/百万 token：HY3 输入 1、输出 4、缓存 .25；HY Vision 输入 7.5、输出 17.5。HY Image 已改 Token 后付费，20k token≈¥.2 只是迁移示例，不是固定按张报价。业务数据合同/保留配置待确认 | **A，已实施三个 SKU**；图片专用适配与恢复中等。同步结果丢失不能安全重提交；账号额度/实际账单未核验 | [目录](https://cloud.tencent.com/document/product/1823/130051)、[API](https://cloud.tencent.com/document/product/1823/130078)、[识图](https://cloud.tencent.com/document/product/1823/136956)、[生图](https://cloud.tencent.com/document/product/1823/135745)、[当前价格](https://cloud.tencent.com/document/product/1823/130055) |
| 百度千帆；百度自研加第三方托管，应逐 SKU 区分 | `ernie-image-turbo`；百度自研图像路线可补研发方覆盖；不要把千帆托管 Qwen 再算一套独有能力 | 文生图已见官方 API；该 SKU 的编辑、遮罩、多参考图无可靠证据。7 个固定尺寸。千帆另有规划/视觉系列，其精确可调用版本待确认 | Bearer；`/v2/ernie-image/images/generations` 同步；账号开通、限流/地区待确认。可复用 HTTP/图片下载骨架，新增专用字段/尺寸校验 | 图片按成功张数后付费；该精确 SKU 当前单价待确认。通用隐私政策不能代替企业业务数据协议；日志存储另有可选配置 | **B，后续研究候选**；中等成本。接口对错误尺寸可能回退到默认大小，接入前必须本地拒绝，不能当成功保真。对本次可控精修增量较小 | [精确 API](https://cloud.baidu.com/doc/qianfan-api/s/Imo9g5a6a)、[模型目录](https://cloud.baidu.com/doc/qianfan-api/s/Dmba8k71y)、[生图说明](https://cloud.baidu.com/doc/qianfan-docs/s/bm8wv3h6f)、[隐私](https://cloud.baidu.com/doc/Agreements/s/Plr0fi68q)、[可选日志](https://cloud.baidu.com/doc/qianfan/s/zmh4sub5e) |
| 阶跃星辰官方，研发阶跃 | `step-image-edit-2`；与 Replicate 已登记的社区 Step1X Edit 不是同一 SKU | 单图编辑，≤4096²；`size` 对此接口不生效，继承输入尺寸。`text_mode` 是原生文字优化，不是独立文字图层。其他主模型/视觉版本本次未完成精确核查 | Bearer、multipart `/v1/images/edits` 同步；账号限流与地区待确认 | 有官方 API，但图片 API 已公告 2026-10-10 下线；当前价格、业务数据政策待确认 | **D，当前不新增图片接入**；临近下线，维护成本不合理。不能因宣传能力继续推荐即将退出的入口 | [编辑 API](https://platform.stepfun.com/docs/zh/api-reference/images/edits)、[下线公告](https://platform.stepfun.com/docs/zh/guides/image-offline-notice) |

MiMo 官网的 V2.6 发布/API 列表已更新，部分图像理解指南仍出现 V2.5 旧说明；据新型号发布与通用图片字段实施保守路径，未把旧型号输入上限当作 V2.6 保证。腾讯 `hy3`、`hy-image-v3` 的服务 SKU 明确，但固定权重日期仍待确认；目录将这些性质与显示名称分开记录。

## 聚合/API 运营渠道

| 平台 / 模型研发方 | 代表型号、实际增量 | 能力与输入控制 | 接入、限流、账号/地区 | 价格、模型来源与数据 | 等级与接入成本 | 官方来源（核查日同上） |
| --- | --- | --- | --- | --- | --- | --- |
| Runware / Alibaba、Google；国外运营平台，列入对照 | Qwen Image 2512、Qwen Image Edit 2511、Gemini 3.1 Flash Lite；主要是费用/可靠性备选，并非这三个家族首次进入图研 | 原生文本+视觉；独立生成/编辑 SKU；编辑总 3 图；明确尺寸/16 对齐。遮罩与结构化不从平台通用能力推断 | 原生数组任务、Bearer、UUID、async/getResponse；查询退避；账号容量/地区资格待核验。复用工作流但新增专用协议，接入成本中高 | AIR ID 明确，权重不可变性另标。文本公开 USD/百万 token 输入文本/图像 .25、输出 1.5；图像随型号/参数，`includeCost` 返回费用。服务条款受模型许可证约束；训练数据条款不能直接扩大成全部推理数据零保留承诺 | **A，已实施有限三个 SKU**。优势是可恢复任务与可记录费用，不能据标价宣称科研质量相同且最便宜 | [文本](https://runware.ai/docs/models/google-gemini-3-1-flash-lite)、[AIR 示例](https://runware.ai/docs/models/google-gemini-3-1-flash-lite/examples)、[生图](https://runware.ai/docs/models/alibaba-qwen-image-2512)、[编辑](https://runware.ai/docs/models/alibaba-qwen-image-edit-2511)、[价格](https://runware.ai/docs/platform/pricing)、[限流](https://runware.ai/docs/platform/rate-limits)、[条款](https://runware.ai/terms) |
| 派欧云 PPIO / Alibaba 等第三方研发 | 官方 `qwen-image-edit` 路线可作国内成本备选；与现有百炼/Replicate/Runware Qwen 家族重复，具体权重版本未公开绑定 2511 | 当前编辑文档只有单图 `image`、prompt/seed/output_format；不能声称多参考图、遮罩、原生结构化。另有文本及视觉接口，代表 Qwen2.5-VL-72B，覆盖增量有限 | Bearer；图片 `/v3/async/qwen-image-edit` 返回 task_id 后查询；文本类兼容 Chat，配额按账号等级且图像 IPM 与文本 RPM/TPM 不同。生产账号/企业条件须核验 | 公价 Qwen Image/Edit ¥.145/张，是否适用指定版本及账号待确认。隐私条款称未经授权不用于训练，同时有匿名化统计/改进条款；不能简化为绝对零保留。需落实型号来源与企业数据约定 | **B，优先于继续导入重复大目录，但本轮不实现**；成本中，主要价值是人民币计费备选，当前文档未补多图编辑缺口 | [编辑 API](https://ppio.com/docs/models/reference-qwen-image-edit)、[视觉](https://ppio.com/docs/model/visual)、[限流](https://ppio.com/docs/model/llm-rate-limits)、[价格](https://resource.ppio.com/pricing)、[隐私](https://resource.ppio.com/legal/privacy-policy)、[服务条款](https://ppio.com/legal/model-terms-of-service) |
| 302.AI 国内入口 / Alibaba 等第三方研发 | 宣传/产品目录可见 Qwen Image Edit，但与现有路线高度重复 | 型号对应权重、多图、遮罩、尺寸及最终协议字段未取得足够证据，均待确认 | 精确认证/端点/异步恢复、账号地区与限流待确认；不能仅因“兼容”进入实施名单 | 产品页 .05 PTC/张；PTC 实际兑换/税费、模型来源及业务数据保留待确认，不直接换算人民币或对比 ¥.145 | **C，暂不接入**；证据补齐前无法可靠估算维护成本 | [运营方产品页](https://dash-cn.302.ai/product/detail/tongyiwanxiang-qwen-image-edit) |
| 魔搭 ModelScope / 各模型作者 | 实验性覆盖与社区模型，不能把仓库可下载视为托管推理权 | 各角色/多参考图/编辑能力按具体托管端点另查，未统一核实 | API Inference 额度、商业账号、稳定性、地区及限流以账号/官方限制页为准；本轮文档内容未完整取到 | 每日额度/收费及业务数据保留待确认；模型仓库许可证与托管服务合同分开审查 | **C，仅观察/实验**；不作为有 SLA 的成本替代承诺 | [官方限制入口](https://modelscope.cn/docs/model-service/API-Inference/limits) |

已有 DeepSeek、Kimi、智谱、MiniMax、百炼、方舟、硅基流动、观猹 TokenDance 等渠道不重复推荐为新增。百炼/方舟本身也承载第三方模型；应以“运营方 + 精确调用 ID + 研发方”去重，而非只按营销名称或模型家族计数。

## 推荐顺序与决策依据

1. **先用已有 fal BRIA 与 Replicate Qwen 补精修控制。** BRIA 原生遮罩/结构化字段最直接补科研图局部修改缺口；Qwen 多参考图补布局/风格约束。无需仅为界面功能再增加运营方。
2. **新增 MiMo V2.6 Flash/Pro 和腾讯 HY 规划/视觉。** 解决用户明确要求的主模型及识图覆盖；按角色选择，低标价只是成本候选，不能替代中文小字、箭头关系和学术术语的真实评测。
3. **Runware 有限 SKU 与 TokenHub HY Image。** 补渠道选择、原生任务恢复和费用记录；同家族重复有成本/可靠性价值时保留，否则不批量导入。
4. **后续国内优先审查 PPIO，其次百度自研图像。** 前者做账号级价格与精确版本核验，后者做独有模型覆盖及质量评估。阶跃即将下线的图像入口、302.AI 和魔搭本轮不进入实施范围。

统一未验证项：真实权限、余额/计费生效、端点地区可达、限流档位、最终模型版本回显、业务数据处理合同、科研图质量和端到端实际单位成本。整轮没有充值或触发付费推理；模拟测试只证明代码/契约路径。
