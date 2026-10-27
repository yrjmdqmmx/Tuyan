# 百炼三个新型号：图片理解与卡片补齐 · 2026-10-26

状态：本地目录 `2026-10-26.v38`，仍为1125个型号。本轮在v37基础上补齐三个百炼型号的图片理解，未新增型号。用户明确要求“把该接通的都接通”，范围为现有科研图示流程所需的能力。真实调用未验证，生产未发布。

## 已完成

- `deepseek-v4.1-flash-1017`、`MiniMax/MiniMax-M3.1-Flash`、`xiaomi/mimo-v2.6-pro-ultraspeed` 均开放主模型与视觉角色，支持文字和图片输入、文字输出。可用于图片/文档材料理解、绘图规划、SVG/PNG图像评审和输入优化。这些型号本身不直接生成PNG图片。
- 私有图片先在本地读取真实字节，再通过 Chat Completions `image_url` 的 Base64 Data URL 提交。校验实际格式、静态图片、数量、字节与尺寸；未透传私有对象地址。三个型号统一使用当前已有产品额度：3张、4MiB/张、12MiB合计、边长4096像素、8MP/张、编码后请求20MB。产品额度不冒充厂商最大值。
- MiniMax M3.1 Flash 接入现有思考设置：low/medium/high/xhigh/max五档，服务默认max；不提供关闭选项。显式选择才写入 `reasoning_effort`，未增加输出预算。图片路径使用同一严格响应处理；失败不重发、不自动换型号或旧端点。
- 卡片显示官方渠道模态与图研可用输入/输出、提交额度、最大输入/输出、分地区公开价格、思考与固定参数、限制、核查日期、来源和验证状态。该扩展仅应用于本轮有逐项证据的三个卡片，其余既有卡片展示保留。
- 业务空间合同升级v2；Web拒绝向仅支持旧v1文本合同的服务提交新选择。五个既有DeepSeek Chat地区与MiniMax/MiMo北京限制保留；业务空间、密钥绑定与历史恢复规则保留。

## 官方证据与已知边界

核查日期：2026-10-26。仅公开只读文档，无账户接口、推理或秘密读取。

| 精确型号 | 已核实事实 | 官方来源 |
| --- | --- | --- |
| deepseek-v4.1-flash-1017 | API明确支持图片；通用Chat定义Data URL。更新日志1M上下文仍以近似展示，API明确max_tokens默认393216，结合384K最大输出记录393216上限；未将上下文当输出。北京及全球部署范围忙/闲输入2/1、输出8/4 CNY/百万Token；新加坡国际输入2.188/1.094、输出8.75/4.375。缓存命中输入10%；忙时北京时间08:00–22:00。 | [API](https://help.aliyun.com/zh/model-studio/deepseek-api)、[更新日志](https://help.aliyun.com/zh/model-studio/newly-released-models)、[价格](https://help.aliyun.com/zh/model-studio/model-pricing)、[缓存](https://help.aliyun.com/zh/model-studio/context-cache) |
| MiniMax/MiniMax-M3.1-Flash | 专项API明确单图/多图、URL/Base64、PNG/JPEG/WebP/GIF、10MB/张；上下文1000000；始终思考、五档effort默认max；固定temperature=1/top_p=0.95。北京输入1、输出4、缓存0.1 CNY/百万Token。 | [API与图片限制](https://help.aliyun.com/zh/model-studio/minimax-api-by-minimax)、[型号与价格](https://help.aliyun.com/zh/model-studio/minimax-m3-1-flash) |
| xiaomi/mimo-v2.6-pro-ultraspeed | 专项API明确该精确ID的图片image_url；通用Chat定义Data URL。上下文/最大输入1048576、最大输出131072；输出包含思考。北京输入30、输出60、缓存0.25 CNY/百万Token；固定temperature=1/top_p=0.95。 | [API](https://help.aliyun.com/zh/model-studio/mimo)、[型号与价格](https://help.aliyun.com/zh/model-studio/mimo-v2-6-pro-ultraspeed) |

通用图片传输合同：[OpenAI兼容Chat](https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-chat-completions)，User Message明确image_url.url接受URL或Base64 Data URL。与专项型号页的图片能力合并构成渠道证据，未用原厂能力替代百炼协议。

仍未确认：DeepSeek1017独立最大输入、精确图片限制、该快照的可调思考枚举/开关/默认；MiniMax独立最大输入/输出；MiMo UltraSpeed精确图片限制及该型号思考开关/默认。DeepSeek和MiMo继续省略未确认思考参数，不能直接套用未带1017的DeepSeek或旧MiMo2.5配置。公开型号列表及猜测的DeepSeek型号页读取失败，不作为下架或不支持证据。近似上下文不是精确输入额度，所有价格均为公开渠道参考，未核账户优惠与账单。

音频、视频、Function Calling与Responses工具不属于本轮现有图片工作流适配；卡片区分官方支持和图研实际能力，没有冒充接通。香港Chat的型号级地区合同未纳入现有五地区白名单；账户目录仍只覆盖北京，其他地区账户权限与网络没有验证。

## 本地改动与验证

源码变更：config/bailian-workspace.json、model-catalog-updates.json、model-specifications.json、thinking-audit/domestic.json；Core图片请求和旧视觉入口；shared规格类型与图片政策；Web卡片、后端版本保护、连接说明；相关生成物和离线测试。新增报告/evidence/validation，SYNC顶部记录已完成端与暂停端。

- Core相关62/62；包含三个型号×SVG/PNG共6条模拟完整流程、同型号看图评审、私有图片字节一致性、五档思考参数、无重试/换型、图片限制、三个型号的原件优化及跨账号拒绝。
- Web卡片/连接32/32，工作区/思考相关57/57；Gateway路由/凭据/历史15/15。Core类型检查通过。初次新增测试的联合类型标注失败已局部修正，最终通过。
- Web Vite构建通过，保留既有大chunk警告。目录、思考、图片政策生成一致性及1512行型号版本报告检查通过；支持跳过小程序的脚本均传入 `--skip-miniprogram`。
- 外部网络阻断护栏覆盖测试和构建；模型及密钥为本地夹具。未复跑上一轮已证实继承失败的千帆旧思考断言；其源文件未修改，旧维护项仍存在。本轮通过不代表全仓所有测试通过。
- 1125个精确ID和31组默认配置不变；原有思考profiles保持，仅新增三个精确条目。每次写入前比对起点/本轮最后哈希，无并发冲突。224个小程序文件哈希不变；Desktop旧副本与独立微信工程未修改。

零真实/付费模型调用；未提交、推送、PR、部署、修改生产设置或业务数据。浏览器真实账户、设备端、模型质量及生产交付未验收。

唯一工作树：`/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009`。起点HEAD、origin、分支不变。基线、公开读取结果、测试日志、增量patch和哈希在 `/Users/a1-6/.codex/artifacts/tuyan-bailian-multimodal-20261026`。此前v37文字适配报告是历史阶段，本报告覆盖其“图片待适配”状态。
