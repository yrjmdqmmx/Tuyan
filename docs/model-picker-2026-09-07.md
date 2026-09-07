# 模型选择与比例设置核对记录（目录 v15）

核对日期：2026-09-07。基线：`100ed29f1e90270c1b4f9023fa3a473e0ceb40fb`。本次只更新目录呈现及客户端选择行为，承接 v14 的渠道接口、地区和尺寸契约。

## 问题与处理

| 问题 | 实现 |
| --- | --- |
| 一次展示全部 45 种比例，不支持项占据列表 | Web、小程序共享比例函数；先按渠道内型号、生成/编辑和当前分辨率取交集，只渲染可用项 |
| 切换型号、分辨率后旧比例可能失效 | 保留仍合法的选择，否则依次回到自动、首个合法值；能力缺失或操作不可用时返回空列表，提交前再次校验 |
| 原目录只有 15 个静态型号具备明确发布日期，版本顺序依赖原数组 | 当前 66 个静态型号有明确日期，458 个有经过整理的版本关系；日期优先，版本关系补充，完全未知的稳定放在末尾；推荐标签不参与排序 |
| `Pro`、托管路径被误认为厂商，别名形成重复组 | 维护公司身份和经过核对的渠道路径规则；`Pro` 单独作为服务档位；陌生命名空间不推断公司 |
| 直连跳过厂商，聚合平台才有三级 | 所有渠道都保持 API 接入渠道 → 模型厂商 → 服务端模型目录；窄屏、小程序逐层前进和返回 |
| 栏宽不足、标签拥挤、完整 ID 不易查看 | 桌面三栏，渠道/厂商分别约 196/194 px，其余留给模型；窄屏单栏步骤；名称和 ID 可换行，ID 可选择和复制，说明折叠到详情 |

静态目录仍为 **669 个调用 ID**。逐型号比较确认：ID、协议、角色、地区、输入输出模态及能力配置与基线一致；499 条厂商展示名发生规范化。显示名称独立于调用 ID，复制及请求均保留完整官方 ID。

## 名称与归属的官方依据

| 对象 | 展示及映射决定 | 官方依据 |
| --- | --- | --- |
| DeepSeek / deepseek-ai | 渠道、开发公司展示为“深度求索”；记录法律主体“杭州深度求索人工智能基础技术研究有限公司” | [公司站点](https://www.deepseek.com/zh/)、[服务条款](https://cdn.deepseek.com/policies/zh-CN/deepseek-terms-of-use.html) |
| xAI / x-ai | 当前官方站点使用 **SpaceXAI**，记录 SpaceXAI LLC、母公司 SpaceX；保留 `xai` 渠道键、`x-ai/...` 模型 ID 及现有 API 域名 | [官方站点](https://x.ai/)、[加入 SpaceX 公告](https://x.ai/news/xai-joins-spacex)、[模型文档](https://docs.x.ai/developers/models) |
| 智谱 / Z.ai / zai-org | 展示“智谱”；`Pro/zai-org/GLM-5.1` 归入智谱 | [GLM 官方仓库](https://github.com/zai-org/GLM-4)、[硅基流动目录](https://docs.siliconflow.cn/docs/models) |
| THUDM | 官方 GLM 仓库已转到 zai-org；只将已核对的 GLM/ChatGLM 路径归智谱，不把 THUDM 所有研究成果视为同一公司产品 | [旧仓库重定向](https://github.com/THUDM/GLM-4) |
| MiniMax / MiniMaxAI | 统一为 MiniMax；国内/国际仍用入口内区域配置及独立 Key | [官方模型组织](https://huggingface.co/MiniMaxAI) |
| Moonshot / moonshotai | 开发公司“月之暗面”，API 平台入口“Kimi”，模型名保留 Kimi 系列 | [公司站点](https://www.moonshot.cn/)、[API 平台](https://platform.kimi.com/docs/get-api-key) |
| Qwen / Wan / Tongyi-MAI | 开发公司“阿里巴巴”，接入渠道“阿里云百炼” | [官方平台](https://qwen.ai/apiplatform)、[模型更新](https://docs.qwencloud.com/changelog/models) |
| ByteDance / ByteDance-Seed | 开发公司“字节跳动”，接入渠道“火山方舟” | [官方组织](https://huggingface.co/ByteDance-Seed) |
| inclusionAI | 开发公司“蚂蚁集团” | [官方组织说明](https://huggingface.co/inclusionAI) |
| 硅基流动 / SiliconFlow | 渠道只展示“硅基流动”，内部模型仍归实际开发方 | [平台文档](https://docs.siliconflow.cn/docs) |
| Google Gemini API / Anthropic Claude | 分别缩为 Google / Anthropic，Gemini / Claude 保留在模型名称 | [Google 文档](https://ai.google.dev/gemini-api/docs/models)、[Anthropic 文档](https://platform.claude.com/docs/en/models/overview) |
| Mistral 的 `zai-glm-*` | 渠道是 Mistral AI，模型开发方是智谱 | [Mistral 官方第三方模型列表](https://docs.mistral.ai/models) |
| fal / Replicate / Fireworks | 使用逐渠道路径映射。例如 fal-ai/flux 属 BFL；zsxkib/step1x-edit 属阶跃星辰；Fireworks 的 accounts/fireworks/models 不作为开发方 | [fal 模型页](https://fal.ai/models/fal-ai/flux-2-pro)、[Replicate 模型页](https://replicate.com/zsxkib/step1x-edit)、[Fireworks 模型库](https://fireworks.ai/models) |

完整机器可读名称、别名及特殊路径规则见 [`config/model-presentation.json`](../config/model-presentation.json)。每个公司、路径规则和版本关系均有来源字段。此文件是维护入口，不应编辑客户端生成副本。

## 日期和版本排序

排序采用稳定的有向关系排序，避免“有日期就按日期，否则比版本”形成不一致比较结果。明确日期的先后关系优先；已确认的型号版本关系用于缺失日期的条目；发生冲突时保留日期关系。相同日期、相同版本和完全未知条目保留目录原顺序，模型 ID 字典序与推荐标签均不参与。

| 型号/系列 | 本轮确认信息 | 来源 |
| --- | --- | --- |
| GPT-6 Astra | 2026-09-03 发布 | [OpenAI 发布说明](https://openai.com/index/safety-overview-gpt-6-astra/) |
| Claude Fable 5.1 / Opus 5 / Sonnet 5 | 分别为 2026-09-01、2026-07-24、2026-06-30 | [Fable](https://www.anthropic.com/claude/fable)、[Opus 5 公告](https://www.anthropic.com/news/claude-opus-5)、[Sonnet](https://www.anthropic.com/claude/sonnet) |
| Gemini 3.8 / 3.7 Flash | 2026-09-02 / 2026-08-13；其他 GA 型号按官方变更日志核对，不将预览版日期混作 GA 日期 | [官方变更日志](https://ai.google.dev/gemini-api/docs/changelog) |
| DeepSeek V4 / V3 / R1 | 依据逐次发布日志；硅基流动的 V3 别名另按该平台迁移公告映射 | [DeepSeek 更新](https://api-docs.deepseek.com/updates/)、[硅基流动更新](https://docs.siliconflow.cn/docs/release-notes/overview) |
| 百炼 Qwen | 对应平台日期单独匹配。例如 `qwen3.7-flash-2026-07-15` 的公布日是 07-25，不能把 ID 中的日期直接当发布日期 | [官方模型更新](https://docs.qwencloud.com/changelog/models) |
| GLM、MiniMax、Kimi、FLUX 等无完整日期的版本 | 使用明确列出的官方版本关系；未知未来小版本不会因正则前缀匹配被当成旧版本 | 各系列来源保存在名称配置 `families[].source` |

MiniMax M3 的首页卡片和文章日期存在一天差异，本轮保留版本顺序而未填入未经消歧的精确日期。OpenRouter `created` 只代表目录创建时间，不用来冒充开发厂商发布日期；带 `latest` 的浮动别名也不从命名猜测发布日期。

## 比例与请求契约

- `config/image-size-contracts.json` 继续分别维护渠道/型号的生成和编辑规则；后端尺寸解析验证宽高、像素、边长、对齐和固定尺寸枚举。
- `packages/types/src/aspect-ratios.ts` 为两个客户端生成同一份比例过滤及默认值函数；已存在的逐分辨率 map 缺项时不回退到比例并集。
- 模型数据尚未加载时不覆盖用户保存的选择；目录到达后立即归一化。提交前校验实际执行 image 路线的任务，包含 Recraft 原生 SVG；文本直接生成 SVG 的任务沿用原契约。
- 每个被展示的静态比例组合都经过合法尺寸求解，共 **15,502** 个渠道/型号/操作/分辨率/比例组合；不是 15,502 次外部调用。OpenRouter 的动态能力仍以服务器返回及该渠道原有适配契约为准。

## 实现与验证范围

- Core / Laf 使用同一份生成后的名称与排序逻辑；动态 OpenRouter 目录同样规范化。共享目录、Web、小程序 TS/JS 同步；目录版本为 `2026-09-07.v15`，未新增 action、生产环境变量或网关转发规则。
- Core：451 项本地测试通过；新增共享契约测试覆盖三端比例一致、请求尺寸、别名与完整 ID、日期/版本冲突及稳定排序。类型检查通过。
- Web：342 项测试及生产构建通过；真实 Chrome / Playwright 在 1440×1000 和 390×844 验证三层切换、分类、排序、完整 ID 复制、键盘焦点及无横向溢出。浏览器另外验证 Ideogram 4 从 2K 切到 1K，以及切换到 GPT Image 1.5 后的失效比例隐藏与自动回退。
- 小程序：22 个测试文件、TS 构建通过，另有生成/编辑/原生 SVG 的请求构造边界检查；使用微信官方 `miniprogram-simulate` 在 Chrome 渲染实际 WXML/WXSS 与编译 JS，验证三层列表和复制行为。完整注册表留在逻辑层，列表分页传入视图层；3.13 MB 目录夹具的最大单次视图更新为 20,188 字节。
- 仓库契约：10 项、共享 API 28 项测试通过；生成目录漂移检查通过；669 个静态型号的调用字段与原能力逐项对比一致。
- Web 渲染所需后端响应通过本地拦截提供；未使用真实用户 Key，未调用付费模型。真实微信开发者工具因需要重新登录未完成原生模拟器验证，官方组件模拟不等同于真机验收。
- **发布：v15 Web / Core 已发布并通过生产验收。** PR #172，实际部署 SHA `b96d507c4bcb2424c1814d6cdf4e81aae2b4cfb6`；完整 CI、669 型号 14,049 字段与顺序、真实生产浏览器验证均通过，见[发布记录](releases/2026-09-07-model-picker-v15.md)。微信原生验收、上传及平台发布按用户要求暂缓；本次未调用付费模型。

## 开发方尚不能确认的条目

对下列社区衍生模型，托管页面不足以证明开发公司的正式主体。本轮保留现有兼容接口，分组为“开发方待确认”，不把托管者或基础模型公司冒认成衍生模型开发公司。后续有可靠依据后只需补映射，不必更改调用 ID。

静态 Replicate 目录的 11 项：

```
adirik/realvisxl-v3.0-turbo
datacte/proteus-v0.2
datacte/proteus-v0.3
fofr/latent-consistency-model
fofr/sdxl-emoji
fofr/sticker-maker
lucataco/dreamshaper-xl-turbo
lucataco/omnigen2
lucataco/open-dalle-v1.1
lucataco/realistic-vision-v5.1
tstramer/material-diffusion
```

交叉核对的 OpenRouter 466 项目录快照中另有 12 项社区开发方待确认：`anthracite-org/magnum-v4-72b`、`cognitivecomputations/dolphin-mistral-24b-venice-edition`、`dots-studio/dots-3-note-preview:free`、`gryphe/mythomax-l2-13b`、`mancer/weaver`、三个 `sao10k/*`、三个 `thedrummer/*`、`undi95/remm-slerp-l2-13b`。该快照不是账户推理授权证明。

另外六个 `openrouter/auto`、`auto-beta`、`bodybuilder`、`free`、`fusion`、`pareto-code` 是动态路由服务，实际开发方由每次选中的底层模型决定，因此不将 OpenRouter 平台本身当作固定底层模型开发公司。动态新增、未在映射表确认的命名空间采取同样处理。
