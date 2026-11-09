# 模型卡第二轮审计（2026-11-09，目录 v43）

工作树 `Tuyan-wt-model-cards`，分支 `codex/model-card-specs`，PR #245 基线仍为 `codex/hangzhou-production`（本地只读基线 `f3b8f91d`）。本轮覆盖第一轮的隐藏旧型号方案。未 commit、push、merge、部署，未更改价格、计费、权限、密钥或服务器，未执行真实/付费提供商请求。

## A. 紧凑卡片

沿用现有白色卡片、图标、徽标、字体和间距：名称、厂商/渠道、API ID/角色、分隔线、输入、输出、上下文窗口、最大输出、底部来源及操作。删除独立核实日期、未核实、重复生命周期及连接信息行；同一型号多连接的区别保留在厂商/渠道同行及按钮可访问名称中。规格保持四行，只比生产参考多“最大输出”一行。

仅显示一个有名称的来源（官方文档 / 下线公告 / 原厂规格），其余来源、逐字段 provenance、核实日期、未核实、生命周期及 Ling 扩展窗口说明进入 `title` 和 `aria-label`；触屏点击通过既有对话框查看。全未知模态为灰色“模态未知”；部分未知仅对应图标有灰色问号，无棕色/虚线。上下文/最大输出未知为既有中性灰。

将下线徽标复用角色徽标；卡片的替代建议放 tooltip，不占新行。任务/预设字段的紧凑按钮使用精确 API ID，打开既有确认弹框，含“取消”和“确认切换”，复用连接弹框 footer 的桌面右对齐及移动并排样式。仅确认后写入当前角色。桌面 ≥1280 三列、390 单列；本沙箱仍不能完成真实浏览器/微信开发者工具截图验收，不能把 DOM/CSS 检查说成实屏像素验收。

## B. 从源目录删除，保留已存身份

源配置 `config/model-catalog-updates.json` 删除 67 项；百炼 `deepseek-v4-flash` 还从旧 Core 静态声明删除。同步清理对应版本/规格/尺寸/渠道契约，运行 `node scripts/sync-model-catalog.mjs` 生成 Core、Web、Gateway 与小程序数据，静态目录 **1132 → 1064**。61 项正式退役（百炼 57、小米 2、阶跃 2）及 7 项 Fireworks serverless 条目全部物理删除，无隐藏目录记录。其他渠道同一底模保留。

`config/removed-models.json` 只保留精确渠道/ID → `{stopDate,replacementApiId,sourceUrl}`。运行时用于不可用错误、拒绝新增和旧配置空槽提示，不转为模型条目；账号目录刷新也不能重新加入这些 ID。预设、任务及模型库存储不迁移、不删除：渲染旧引用显示“原型号已不可用，请重新选择”，有精确替代项再加“，可改选 <API ID>”。小程序选择器和设置字段同样处理。

Core 的路由校验及文本/视觉/图像传输入口，在任何提供商调用之前抛出 `MODEL_UNAVAILABLE`，含中文建议和 `requestState=not_sent`；无需保留旧错误码别名。Gateway 拒绝新增旧身份，但已有精确连接/型号可原样往返保存。预览 7 条库记录存储前后均为 7，展示 5 张卡片，2 条显示空槽提示。

**发现一个需 Owner 决策的默认值**：`stepfun.defaults.image = step-2x-large`。已将该默认项留空，不自动选择另一型号；没有改变用户已保存选择。请另行确定 StepFun 默认绘图型号，或继续留空。其余出厂默认值没有命中这 68 个精确渠道/ID；其他渠道的相同 ID 保留。推荐项随目录条目删除，旧用例保留为拒绝/历史身份测试。

百炼四项 `qwen3.5-plus` 家族仍在目录，2027-01-19 UTC 零点前为“将下线”，精确替代 `qwen3.8-flash`；到期后由相同不可用校验/空槽提示阻止新请求，不改存储。

### Fireworks 逐项结果

Tuyan 使用 `https://api.fireworks.ai/inference/v1/chat/completions` 和 `accounts/fireworks/models/...`，未使用 dedicated deployment。全部通告仅停用 serverless，自 2026-09-25 起；原底模其他渠道不变。以下候选都在通告中、官方 replacement 页面标记 Serverless Supported，且本地 Fireworks 精确 ID 存在并可选。生成器加入三条件校验，后续若目录漂移会报错而不是保留不成立的建议。已移除型号只有提示，没有一键切换/确认流程。

| 删除的 API ID（均带 `accounts/fireworks/models/` 前缀） | 显示的替代提示（同前缀） | 依据 / 备选 |
| --- | --- | --- |
| `deepseek-v4-flash-0731` | `deepseek-v4p1-flash` | [官方通告](https://fireworks.ai/models/deepseek-ai/deepseek-v4-flash-0731)；通告 + Serverless Supported + 本地精确 ID 可选。 |
| `deepseek-v4-flash-vision-exp` | `deepseek-v4p1-flash` | [官方通告](https://fireworks.ai/models/deepseek-ai/deepseek-v4-flash-vision-exp)；通告 + Serverless Supported + 本地精确 ID 可选。 |
| `deepseek-v4-pro-0813` | `deepseek-v4p1-flash` | [官方通告](https://fireworks.ai/models/deepseek-ai/deepseek-v4-pro-0813)；通告 + Serverless Supported + 本地精确 ID 可选。 |
| `glm-5p2` | `glm-5p3` | [官方通告](https://fireworks.ai/models/fireworks/glm-5p2)；通告 + Serverless Supported + 本地精确 ID 可选。 |
| `kimi-k2p6` | `glm-5p3` | [官方通告](https://fireworks.ai/models/fireworks/kimi-k2p6)；通告另列 `kimi-k3`，也满足三个条件；采用通告中第一个可选项 `glm-5p3`。 |
| `kimi-k2p7-code` | `glm-5p3` | [官方通告](https://fireworks.ai/models/fireworks/kimi-k2p7-code)；通告另列 `kimi-k3`，也满足三个条件；采用通告中第一个可选项 `glm-5p3`。 |
| `muse-glimmer-30b` | `nemotron-lightning-3p5-30b-a3b` | [官方通告](https://fireworks.ai/models/fireworks/muse-glimmer-30b)；通告 + Serverless Supported + 本地精确 ID 可选。 |

`deepseek-v4-flash-vision-exp` 和 `deepseek-v4-pro-0813` 已按第二轮证据补上 DeepSeek V4.1 Flash 建议。此处没有因服务端超时换线或探测账户权益。

### 全部 68 项删除明细

“—”表示无精确替代 API ID；四项公告仅给 Qwen3.6/3.7 系列建议，不把系列名冒充 API ID。核实日期为 2026-11-09。

| 渠道 | 删除 API ID | 停用日期 | 替代 API ID | 证据 URL / 依据 |
| --- | --- | --- | --- | --- |
| bailian | `MiniMax-M2.1` | 2026-10-10 | `qwen3.7-plus` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `MiniMax/MiniMax-M2.1` | 2026-10-10 | `qwen3.7-plus` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `Moonshot-Kimi-K2-Instruct` | 2026-10-10 | `qwen3.7-plus` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `deepseek-r1` | 2026-10-10 | `qwen3.7-plus` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `deepseek-r1-0528` | 2026-10-10 | `qwen3.7-plus` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `deepseek-r1-distill-qwen-14b` | 2026-10-10 | `qwen3.7-plus` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `deepseek-r1-distill-qwen-32b` | 2026-10-10 | `qwen3.7-plus` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `deepseek-r1-distill-qwen-7b` | 2026-10-10 | `qwen3.7-plus` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `deepseek-v3` | 2026-10-10 | `qwen3.7-plus` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `deepseek-v3.1` | 2026-10-10 | `qwen3.7-plus` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `deepseek-v3.2` | 2026-10-10 | `qwen3.7-plus` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `deepseek-v3.2-exp` | 2026-10-10 | `qwen3.7-plus` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `deepseek-v4-flash` | 2026-10-10 | `deepseek-v4-flash-0731` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `glm-4.5` | 2026-10-10 | `glm-5.2` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `glm-4.5-air` | 2026-10-10 | `glm-5.2` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `glm-4.7` | 2026-10-10 | `qwen3.7-plus` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `kimi-k2-thinking` | 2026-10-10 | `qwen3.7-plus` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `qvq-max` | 2026-10-10 | —（仅系列建议） | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `qvq-plus` | 2026-10-10 | —（仅系列建议） | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `qwen-image-edit` | 2026-10-10 | `qwen-image-3.0` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `qwen-image-edit-max` | 2026-10-10 | `qwen-image-3.0` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `qwen-image-edit-max-2026-01-16` | 2026-10-10 | `qwen-image-3.0` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `qwen-image-edit-plus` | 2026-10-10 | `qwen-image-3.0` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `qwen-image-edit-plus-2025-10-30` | 2026-10-10 | `qwen-image-3.0` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `qwen-image-edit-plus-2025-12-15` | 2026-10-10 | `qwen-image-3.0` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `qwen-image-max` | 2026-10-10 | `qwen-image-3.0` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `qwen-image-max-2025-12-30` | 2026-10-10 | `qwen-image-3.0` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `qwen-image-plus` | 2026-10-10 | `qwen-image-3.0` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `qwen-image-plus-2026-01-09` | 2026-10-10 | `qwen-image-3.0` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `qwen-long-2025-01-25` | 2026-10-10 | `qwen3.7-plus` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `qwen-long-latest` | 2026-10-10 | `qwen3.7-plus` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `qwen-omni-turbo` | 2026-10-10 | `qwen3.5-omni-plus` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `qwen-vl-max` | 2026-10-10 | —（仅系列建议） | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `qwen-vl-plus` | 2026-10-10 | —（仅系列建议） | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `qwen2.5-omni-7b` | 2026-10-10 | `qwen3.5-omni-plus` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `qwen3-14b` | 2026-10-10 | `qwen3.6-flash` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `qwen3-235b-a22b` | 2026-10-10 | `qwen3.7-plus` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `qwen3-235b-a22b-instruct-2507` | 2026-10-10 | `qwen3.7-plus` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `qwen3-235b-a22b-thinking-2507` | 2026-10-10 | `qwen3.7-plus` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `qwen3-30b-a3b` | 2026-10-10 | `qwen3.7-plus` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `qwen3-30b-a3b-instruct-2507` | 2026-10-10 | `qwen3.7-plus` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `qwen3-30b-a3b-thinking-2507` | 2026-10-10 | `qwen3.7-plus` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `qwen3-32b` | 2026-10-10 | `qwen3.7-plus` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `qwen3-8b` | 2026-10-10 | `qwen3.6-flash` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `qwen3-coder-30b-a3b-instruct` | 2026-10-10 | `qwen3.7-plus` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `qwen3-coder-480b-a35b-instruct` | 2026-10-10 | `qwen3.7-plus` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `qwen3-coder-plus` | 2026-10-10 | `qwen3.7-plus` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `qwen3-coder-plus-2025-07-22` | 2026-10-10 | `qwen3.7-plus` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `qwen3-coder-plus-2025-09-23` | 2026-10-10 | `qwen3.7-plus` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `qwen3-next-80b-a3b-instruct` | 2026-10-10 | `qwen3.7-plus` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `qwen3-next-80b-a3b-thinking` | 2026-10-10 | `qwen3.7-plus` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `qwen3-omni-flash` | 2026-10-10 | `qwen3.5-omni-plus` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `qwen3-omni-flash-2025-09-15` | 2026-10-10 | `qwen3.5-omni-plus` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `qwen3-omni-flash-2025-12-01` | 2026-10-10 | `qwen3.5-omni-plus` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `qwen3-vl-flash` | 2026-10-10 | `qwen3.6-flash` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `qwen3.6-max-preview` | 2026-10-10 | `qwen3.7-max` | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| bailian | `qwq-plus` | 2026-10-10 | —（仅系列建议） | [official retirement notice](https://help.aliyun.com/zh/model-studio/model-depreciation) |
| fireworks | `accounts/fireworks/models/deepseek-v4-flash-0731` | 2026-09-25 | `accounts/fireworks/models/deepseek-v4p1-flash` | [Fireworks serverless deprecation notice](https://fireworks.ai/models/deepseek-ai/deepseek-v4-flash-0731) |
| fireworks | `accounts/fireworks/models/deepseek-v4-flash-vision-exp` | 2026-09-25 | `accounts/fireworks/models/deepseek-v4p1-flash` | [Fireworks serverless deprecation notice](https://fireworks.ai/models/deepseek-ai/deepseek-v4-flash-vision-exp) |
| fireworks | `accounts/fireworks/models/deepseek-v4-pro-0813` | 2026-09-25 | `accounts/fireworks/models/deepseek-v4p1-flash` | [Fireworks serverless deprecation notice](https://fireworks.ai/models/deepseek-ai/deepseek-v4-pro-0813) |
| fireworks | `accounts/fireworks/models/glm-5p2` | 2026-09-25 | `accounts/fireworks/models/glm-5p3` | [Fireworks serverless deprecation notice](https://fireworks.ai/models/fireworks/glm-5p2) |
| fireworks | `accounts/fireworks/models/kimi-k2p6` | 2026-09-25 | `accounts/fireworks/models/glm-5p3` | [Fireworks serverless deprecation notice](https://fireworks.ai/models/fireworks/kimi-k2p6) |
| fireworks | `accounts/fireworks/models/kimi-k2p7-code` | 2026-09-25 | `accounts/fireworks/models/glm-5p3` | [Fireworks serverless deprecation notice](https://fireworks.ai/models/fireworks/kimi-k2p7-code) |
| fireworks | `accounts/fireworks/models/muse-glimmer-30b` | 2026-09-25 | `accounts/fireworks/models/nemotron-lightning-3p5-30b-a3b` | [Fireworks serverless deprecation notice](https://fireworks.ai/models/fireworks/muse-glimmer-30b) |
| stepfun | `step-2x-large` | 2026-10-10 | — | [official retirement notice](https://platform.stepfun.com/docs/zh/guides/models/deprecations) |
| stepfun | `step-image-edit-2` | 2026-10-10 | — | [official retirement notice](https://platform.stepfun.com/docs/zh/announcements/image-model-retirement) |
| xiaomi | `mimo-v2.5` | 2026-10-21T10:00:00+08:00 | `mimo-v2.6-flash` | [official retirement notice](https://mimo.mi.com/docs/zh-CN/updates/deprecate) |
| xiaomi | `mimo-v2.5-pro` | 2026-10-21T10:00:00+08:00 | `mimo-v2.6-pro` | [official retirement notice](https://mimo.mi.com/docs/zh-CN/updates/deprecate) |

## C. Ant Ling 补充证据

补充证据纳入版本化源文件 `config/channel-audit/model-audit-supplement-20261109.json`；生成器及普通同步都会读取，完全不依赖 `.audit-input/`。源证据：[模型指南](https://developer.ant-ling.com/zh-CN/docs/models/ling/)、[Chat API](https://developer.ant-ling.com/zh-CN/docs/api-reference/chat/openai/)、[多模态教程](https://developer.ant-ling.com/zh-CN/docs/tutorials/multimodal-understanding/)、[API 概览](https://developer.ant-ling.com/zh-CN/docs/api-reference/)。逐字段来源和核实日期 **2026-11-09** 保留在完整快照。

| 精确 API ID | 已知输入 | 仍未知的输入 | 输出 | 上下文 tokens | 最大输出 |
| --- | --- | --- | --- | ---: | --- |
| Ling-3.2-flash | 文本、图像、视频 | 音频 | 文本 | 1,048,576 | 未知 |
| Ling-3.1-flash | 文本 | 图像、音频、视频 | 文本 | 1,048,576 | 未知 |
| Ling-3.0-flash-VL | 文本、图像、视频 | 音频 | 文本 | 262,144 | 未知 |
| Ling-3.0-flash | 文本 | 图像、音频、视频 | 文本 | 262,144 | 未知 |
| Ling-3.0-tiny | 文本 | 图像、音频、视频 | 文本 | 未知 | 未知 |

采用现有审计快照中的二进制 token 单位惯例：1M = 1,048,576，256K = 262,144。Ling-3.0-flash 的“最高可扩展至 1M”只进 tooltip，数值仍为原生 256K；文档未明确输入输出共享窗口，**不标注共享**。未列支持不等于明确不支持，因此部分模态保持 unknown。只修正规格/元数据，没有凭规格快照扩展调用适配、价格或权限。

[Ant Ling 下线页](https://developer.ant-ling.com/zh-CN/docs/models/deprecation/)所列型号中，本目录含 `Ling-2.6-1T`、`Ring-2.6-1T`、`Ling-2.6-flash` 三项（公告 2026-11-15 UTC+8 下线）；不含 `Ling-1T`、`Ring-1T`、`Ling-2.5-1T`、`Ring-2.5-1T`。按本轮要求仅报告，没有变更其生命周期，待 PM 决策。

## D. 小程序包预算

恢复源码和运行文件两项阈值为原始 **1.5 × 1024 × 1024 = 1,572,864 bytes**；媒体维持 200 KiB。测试实际检查整个 `miniprogram/` 的文件，包括 `.ts`，不是仅微信运行文件。第一轮超标的是含 TS 的源目录，超出 **128,658 bytes**；运行文件未超标。

| 测量 | 第一轮 before | 第二轮 after | 限额 |
| --- | ---: | ---: | ---: |
| 全部文件（含 TS） | 1,701,522 | 1,559,326 | 1,572,864 |
| 运行源文件（排除 TS） | 1,283,180 | 1,139,605 | 1,572,864 |
| 图片/音视频 | 189,978 | 189,978 | 204,800 |

源码减少 142,196 bytes，距预算余 13,538 bytes。未删 TS 或放宽测试。`scripts/lib/mini-model-catalog.mjs` 投影去掉完整来源档案、旧规格对象和未使用的协议详情，保留全部实际选择、角色、尺寸及编辑约束；新的审计数据仅包含模态/未知项、上下文、最大输出、生命周期日期/替代项及一条 URL。复用静态目录索引，不再第二次打包全部 ID。来源档案仍完整保存在 Web/Core 和 config。投影/codec 测试仍校验每个保留字段、独立对象和原预算。未执行微信原生包扫描，未恢复小程序发布。

## E. 只读计数证明

```sh
node scripts/count-model-catalog.mjs .
node scripts/count-model-catalog.mjs /Users/apple/agent-tools/tuyan-dev/Tuyan-wt-baseline
# 如需逐 ID 校验，可追加 --keys
```

脚本在内存 bundle 指定 checkout 的真实 `catalogRows` / `libraryRows` / `partitionRegistryModels`；Core `modelRegistry` 使用内存服务和模拟 metadata 传输。没有复制一套 UI 计数条件，没有监听端口或网络请求，不写目标 checkout。日期固定为 2026-11-09，两份工作树均成功执行，基线工作树仍干净。

| scope | base f3b8f91d | head | 精确差分 |
| --- | ---: | ---: | --- |
| static registry | 1125 | 1064 | 1125 − 68 + 7 |
| local mock registry endpoint | 1122 | 1061 | 1122 − 68 + 7 |
| 模型目录（catalogRows） | 923 | 919 | 923 − 11 + 7 |
| 新任务角色可选并集（main/vision/image；生成） | 884 | 878 | 884 − 11 + 5 |
| 既有日期等规则隐藏的 deprecated | 127 | 70 | 127 − 57 |
| 目录中 channel-unavailable 审计状态 | 0 | 0 | 7 条 Fireworks 已物理删除，记在 68 条 lookup 中 |
| 根据本轮公告匹配的 scheduled | 4 | 4 | 基线没有新审计徽标，脚本另报 scheduledUiState 0 → 4 |
| unverified（静态审计分母） | 无该审计字段 | 667 | 不把基线的缺字段猜成已核实 |
| 新增 / 其中不可选 | 0 / 0 | 7 / 2 | OpenAI 两个 2.6 图像型号仍缺尺寸契约、不可选 |
| 预览模型库存储 | 7 | 7 | head 5 卡片 + 2 空槽，数据不变 |

目录口径只减 11：57 项已经因基线到期字段隐藏；本次真正从可见/可选集合退出的 11 项为百炼 `MiniMax/MiniMax-M2.1`、`qwen3-omni-flash`、`qwen3-omni-flash-2025-09-15`、`qwen3-omni-flash-2025-12-01`，以及七个 Fireworks 项。新增 7 项全部进目录，其中 2 项不进入新任务可选集合。

本地静态与 endpoint 差 3 来自 Core 既有公开目录过滤（非本轮删除）：`fal/imagineart/imagineart-2.0-preview/text-to-image`、`replicate/alibaba/wan-3`、`stability/sd3.5-flash`，base/head 相同；模型目录再应用角色、缺失/到期规则。模拟 TokenDance 返回空目录，将 66 项标为缺失；若改成 503 失败而非空列表，既有保守回退会保留这些项，得到 985，不能拿这个数冒充原本的本地预览。

**919 与生产截图 1408**：本轮物理删除后仍为 919，因为第一轮已隐藏这 68 项。UI tab 计数取 `catalogRows(registry,{role:catalogRole}).length`，registry 来自后端、不是静态数组长度。后端会合并 OpenRouter 公共模型/图像目录、fal/Runware/Novita 公共目录及 TokenDance 当前目录；显式账号目录另经 `readAccountModelCatalog` 合并，本地 mock 不加载真实账号目录。生产截图比当前本地多 489，比同条件基线本地多 485。没有提供生产 JSON 快照，本轮不请求生产/真实提供商，**无法逐 ID 证明这 489 项各自属于哪个实时目录**；已证明本 PR 的实际可见差分是 −4，而非 −61。精确生产归因需 Owner 提供同一时点/角色筛选的只读 modelRegistry 响应，再离线比较。

### 每渠道计数（base → head）

| 渠道 | static | mock endpoint | catalog-visible | picker-selectable |
| --- | ---: | ---: | ---: | ---: |
| anthropic | 14 → 14 | 14 → 14 | 14 → 14 | 14 → 14 |
| antling | 6 → 8 | 6 → 8 | 6 → 8 | 6 → 8 |
| ark | 36 → 36 | 36 → 36 | 22 → 22 | 22 → 22 |
| bailian | 183 → 126 | 183 → 126 | 123 → 119 | 121 → 117 |
| bfl | 14 → 14 | 14 → 14 | 14 → 14 | 14 → 14 |
| deepseek | 4 → 4 | 4 → 4 | 2 → 2 | 2 → 2 |
| fal | 49 → 49 | 48 → 48 | 48 → 48 | 44 → 44 |
| fireworks | 26 → 20 | 26 → 20 | 26 → 20 | 26 → 20 |
| gemini | 17 → 17 | 17 → 17 | 17 → 17 | 17 → 17 |
| ideogram | 14 → 14 | 14 → 14 | 14 → 14 | 13 → 13 |
| iflytek | 34 → 34 | 34 → 34 | 34 → 34 | 34 → 34 |
| kimi | 6 → 6 | 6 → 6 | 6 → 6 | 6 → 6 |
| longcat | 2 → 3 | 2 → 3 | 2 → 3 | 2 → 3 |
| minimax | 11 → 11 | 11 → 11 | 11 → 11 | 11 → 11 |
| mistral | 18 → 18 | 18 → 18 | 16 → 16 | 16 → 16 |
| novita | 1 → 1 | 1 → 1 | 1 → 1 | 1 → 1 |
| openai | 69 → 71 | 69 → 71 | 49 → 51 | 49 → 49 |
| qianfan | 37 → 37 | 37 → 37 | 30 → 30 | 29 → 29 |
| recraft | 17 → 17 | 17 → 17 | 17 → 17 | 17 → 17 |
| replicate | 109 → 109 | 108 → 108 | 108 → 108 | 99 → 99 |
| runware | 148 → 148 | 148 → 148 | 144 → 144 | 124 → 124 |
| sensenova | 8 → 8 | 8 → 8 | 8 → 8 | 8 → 8 |
| siliconflow | 68 → 68 | 68 → 68 | 63 → 63 | 61 → 61 |
| stability | 6 → 6 | 5 → 5 | 5 → 5 | 5 → 5 |
| stepfun | 7 → 5 | 7 → 5 | 5 → 5 | 5 → 5 |
| together | 53 → 53 | 53 → 53 | 52 → 52 | 52 → 52 |
| tokendance | 74 → 74 | 74 → 74 | 0 → 0 | 0 → 0 |
| tokenhub | 49 → 50 | 49 → 50 | 44 → 45 | 44 → 45 |
| xai | 12 → 12 | 12 → 12 | 11 → 11 | 11 → 11 |
| xiaomi | 5 → 3 | 5 → 3 | 3 → 3 | 3 → 3 |
| zhipu | 28 → 28 | 28 → 28 | 28 → 28 | 28 → 28 |

## F. 移动标签截断

比对只读基线和当前 `WorkspaceModelPanels.jsx` 的 tabs markup 及 `workspaceModels.css` 中所有 `.tw-model-tabs` / `.tw-model-custom-link` 规则：此 PR 未改这些代码；移动 `flex-wrap:nowrap; overflow-x:auto` 已在基线。按要求不修复这项既有截断/横向滚动表现，避免混入 UI 变更。

## G. 本地预览与截图夹具

完整启动命令、**精确 localStorage 片段**、IndexedDB 缓存接入原因、所有渠道/厂商/搜索路径、已有预设字段和将下线确认对话框入口，见 [第二轮预览夹具](model-card-audit-20261109-preview.md)。片段已在离线 fake IndexedDB 环境实际运行：7 条模型记录、两份草稿分别保留 `mimo-v2.5` 和 `qwen3.5-plus`；它不属于任何生产导入路径。

## 验证

| 检查 | 命令 / 范围 | 结果 |
| --- | --- | --- |
| 生成器、codec、Gateway 审计 | `node --test scripts/generate-model-audit.test.mjs scripts/pack-model-catalog.test.mjs apps/auth-gateway/tests/model-audit.test.js` | 11/11（生成器 4、codec/投影 4、Gateway 3） |
| 原证据再生成 | `node scripts/generate-model-audit.mjs .audit-input --check` | 通过：1106 个证据 pair、4 条 scheduled、7 个 additions；删除条目不在 rows |
| 无原输入的同步 | `node scripts/sync-model-catalog.mjs --check` | 通过：1064 个静态型号、无漂移 |
| Gateway 全套 | `pnpm --filter @paperbanana/auth-gateway test` | 276 项：188 通过、87 失败、1 跳过；87 项全部为沙箱 `listen EPERM`，非业务断言失败；无监听的审计 3/3 通过 |
| Gateway 语法 | `pnpm --filter @paperbanana/auth-gateway check` | 通过 |
| Core 定向 | `pnpm --filter @paperbanana/paperbanana-api exec node --import tsx --test tests/core-composition.test.ts tests/model-audit.test.ts tests/model-registry-drift.test.ts` | 204 项：203 通过、1 既有失败；本轮审计 4/4 通过 |
| Core 类型 | `pnpm --filter @paperbanana/paperbanana-api check` | 通过 |
| 小程序全套、类型、构建 | `pnpm --filter @paperbanana/miniprogram test` / `check` / `build` | 123/123；1.5 MiB 原预算通过；类型与构建通过 |
| Web 全套 | `pnpm --filter @paperbanana/web test` | 1333 项：1321 通过、12 既有失败 |
| Web 相关定向 | `model-audit`、`model-specifications`、`rendered-interactions`、`workspace-model-catalog`、`workspace-model-picker`、`workspace-catalog-v35` | 87/87 通过；旧禁用原因断言改查可访问 tooltip，确认不增加卡片行 |
| Web 构建 | `pnpm --filter @paperbanana/web build` | 通过；既有大 chunk 提示保留 |
| 计数 | 上述只读脚本分别运行 head / base | 均成功；详见 E；基线没有写入 |

Web 的 12 项失败集中在 `inactive-route-ui`、`professional-custom-v381`、`workflow-v400-ui`、`workspace-migration`；在只读基线用相同四个文件重新运行 32 项，20 通过、同样 12 项失败。Core 唯一失败为 `xAI normalizes WebP references to supported PNG for planning, vision and image editing`：原测试选择的 `grok-imagine-image-quality` 已于 2026-11-02 到期，先被既有到期校验拒绝；第一轮已在基线复现，本轮未更改该测试或该型号。

真实浏览器启动在本沙箱退出 134，本地监听报 `EPERM`；因此尚无桌面/移动实屏截图，未进行微信原生包扫描。提供可由审阅人直接运行的离线预览步骤，不将这些环境限制包装成通过。

所有提供商传输均为 mock；静态/测试数据不是账户权限、真实质量或生产服务验收。沙箱不能监听端口或启动 Chrome，不把缺少的 HTTP / 实屏验收标为通过。
