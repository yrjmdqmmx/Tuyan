# 模型卡审计验收 · 2026-11-09 R10

## R10：渠道明确排除、完整 registry 回归与改选正文（当前验收）

保留工作区现状继续完成任务；未运行 Git 写命令，无真实/付费模型调用、提交、推送或部署。小米原名仍为 `MiMo-v2.5` / `MiMo-v2.5-pro`，源码预算及既有测试断言均未放宽。

### A / D：百炼 kimi-k3

官方页最大输出与上下文均标注 1048576。

仅为 `bailian/kimi-k3` 登记输入 audio/video、输出 image/audio/video 的明确不支持，官方原文为 `| 输入模态 | Text Image | 输出模态 | Text |`，来源 [百炼 Kimi K3](https://help.aliyun.com/zh/model-studio/kimi-k3)，核实日期 `2026-11-09`。原文、URL、日期保存在 `config/channel-audit/model-audit-supplement-20261109.json`，生成时缺引文、来源或日期不符、支持与排除冲突均报错。

根因是完整 registry 对象携带旧 `specificModelSpecifications`，R6 的模态并集把 video 加回并使 catalog 事实占据输入来源；只传 `{id}` 无法复现。现在有官方证据的渠道排除项先从并集中移除，并保留渠道审计事实及来源，产品图像下限也不能覆盖明确排除。操作方完整对象已原样复制到 `apps/web/tests/fixtures/kimi-k3-live-registry-model.json`；普通/紧凑卡片 DOM 断言输入仅文本、图像，音频/视频不支持，输出图像/音频/视频不支持，可见来源为上面的阿里云精确页，title 日期为 `2026-11-09`。小程序编译产物同样保留排除元数据并显示“不支持”。

变更前后对 1064 张卡分别以最小对象和完整静态对象逐卡对照，**只有百炼 kimi-k3 变化**；其余 1063 张卡的事实、来源和展示未改。其他型号仍沿用原模态并集、未知语义与产品输入下限。

**同类官方表格发现：百炼 20 张，其他 30 渠道各 0 张（已登记证据口径，排除 kimi-k3）。** 使用完整目录对象，统计其来源中已有官方渠道页面、包含明确 `输入模态 | …` / `输出模态 | …` 表格且仍有至少一个未知图标的卡片；同一页对应多个精确 ID 时按卡计数。复核 R6 已留存来源，并在 R10 只读补查百炼 25 个未缓存的已登记 URL（百炼合计 36 个 URL）。四列并排表和两列逐行表均计入；原厂继承页、说明文字/标题形式和未核实页面不计入，0 表示该口径无已核实命中，不表示全网不存在页面。页面逐字短引文及 URL 见 `config/channel-audit/modality-table-review-r10-20261109.json`；例如 [Qwen-Image 2.0](https://help.aliyun.com/zh/model-studio/qwen-image-2-0) 和 [MiniMax M3.1 Flash](https://help.aliyun.com/zh/model-studio/minimax-m3-1-flash)。**其余卡片未作修改，待 PM 决定是否扩大明确排除规则。**

**最小对象与完整对象差异：389 / 1064 张**；可见来源不同 89 张，模态不同 388 张，两者交集 88 张。完整对象使用 `STATIC_MODEL_REGISTRY` 的整个 model 条目（含 roles/capabilities/specifications 等已有字段），最小对象只传 `{id}`；来源比较实际展示的第一条链接，模态比较输入/输出四种图标状态。此统计与操作方实时 Core 夹具回归分开，不能把静态目录对象统计称为逐个实时 Core 响应核查。逐渠道如下，两项差异可以重叠：

| 渠道 | 其他同表格且仍未知卡 | 可见来源差异 | 模态差异 | 任一差异 |
| --- | ---: | ---: | ---: | ---: |
| deepseek | 0 | 0 | 0 | 0 |
| kimi | 0 | 2 | 5 | 5 |
| zhipu | 0 | 0 | 5 | 5 |
| siliconflow | 0 | 2 | 21 | 21 |
| anthropic | 0 | 2 | 12 | 12 |
| recraft | 0 | 1 | 15 | 15 |
| xai | 0 | 1 | 3 | 3 |
| gemini | 0 | 12 | 12 | 12 |
| bailian | 20 | 5 | 14 | 15 |
| openai | 0 | 1 | 21 | 21 |
| ark | 0 | 3 | 7 | 7 |
| bfl | 0 | 2 | 12 | 12 |
| stability | 0 | 0 | 5 | 5 |
| ideogram | 0 | 1 | 4 | 4 |
| minimax | 0 | 1 | 2 | 2 |
| mistral | 0 | 1 | 12 | 12 |
| together | 0 | 5 | 13 | 13 |
| fireworks | 0 | 3 | 3 | 3 |
| fal | 0 | 6 | 7 | 7 |
| replicate | 0 | 12 | 57 | 57 |
| tokendance | 0 | 9 | 18 | 18 |
| runware | 0 | 8 | 101 | 101 |
| tokenhub | 0 | 8 | 21 | 21 |
| xiaomi | 0 | 0 | 0 | 0 |
| sensenova | 0 | 1 | 4 | 4 |
| stepfun | 0 | 0 | 0 | 0 |
| qianfan | 0 | 1 | 6 | 6 |
| iflytek | 0 | 2 | 8 | 8 |
| longcat | 0 | 0 | 0 | 0 |
| antling | 0 | 0 | 0 | 0 |
| novita | 0 | 0 | 0 | 0 |
| **合计** | **20** | **89** | **388** | **389** |

逐 ID 清单和完整分母见 [R10 计数](model-card-audit-20261109-r10-counts.json)，可用 `node scripts/report-model-card-r10.mjs --check` 离线复核。报告和表格证据仅供审计，不参与运行时生成规则。

### B / C：显示名与确认弹窗

- 小程序非移除型号恢复静态目录 label 查询；未命中时移除 `accounts/…/models/` 前缀。移除型号优先使用 removed-models 的 displayName。修改落在生成源，重新同步后仍保留；新增目录 label、前缀回退、移除 displayName 三类测试。
- Web 改选确认框的 `.tw-dialog-body > p` 明确使用 **14px**，桌面与移动端均高于 12px。DOM 测试检查全部正文段落的计算字号，另递归核对相关 CSS 声明（含媒体规则）；jsdom 不执行真实视口媒体布局，因此这是 DOM/CSS 验收，不冒称实屏截图。

### 验证与包体

- Web 受影响测试：**131/131**，含 R3–R10 模型审计、规格、改选、模型库/选择器/设置；新增 R10 **3/3**。
- 小程序全套：**138/138**；`build` / `check` 通过。目录 label、前缀、移除名称及明确排除新增 **4/4**。
- 生成器、目录 codec、registry 测试：**22/22**；Core 审计 **7/7**、类型检查通过；Gateway 审计 **6/6**。
- Web `build` 通过；保留已有大 chunk 提示。审计生成、目录同步已运行；审计生成 `--check`、目录/参考上传两个 `sync --check`、thinking `--check` 与 R10 计数 `--check` 均通过。
- 小程序精确源码 **1,568,676 bytes**，runtime **1,145,277 bytes**，媒体 **189,978 bytes**。比 R9 的 1,567,915 增加 **761 bytes**，距原 **1,572,864** 上限还余 **4,188 bytes**；预算和预算测试未修改，生成 `.js` 与 `.ts` 已同步。

## R9：显示名清理与渠道来源优先（历史验收）

基线为 `785b99df`。全程未运行 Git 写命令；无真实/付费模型调用、提交、推送或部署。

- 小米移除项显示名逐字保留 `MiMo-v2.5` / `MiMo-v2.5-pro`。
- `config/removed-models.json` 的 `bailian/deepseek-v4-flash` 显示名改为 `DeepSeek-V4-Flash`。原 `c7b6a2fc` 名称夹具保留不动，`removed-model-name-overrides-r9.json` 仅允许这一身份覆盖并写明原因；Web、小程序和生成器原有逐项断言继续覆盖全部 68 项，未降低数量、跳过或删减断言。
- 清查同类文案：版本目录中 5 个名称的“（具体版本待确认）”备注一并移除，包含 DeepSeek 直连、硅基两项及百炼两项；共享无具体版本提示改为“具体版本未知”。Core/Web/小程序派生目录同步，不改变模型 ID、版本事实、调用标识、能力或权限。历史审计文档和冻结名称夹具保留原文用于追溯；运行时清理正则仅作防御，不输出该措辞。
- 卡片来源统一按**最终展示字段**的 `provenance === 'channel'` 选择安全 HTTPS 来源（输入、输出、上下文、最大输出的固定顺序），优先于生命周期、原厂及通用目录链接；只有没有展示字段的渠道审计来源时，才沿用既有来源回退，包括 `officialSourceUrl`。已被回退替换的审计字段不能抢占首链接。全部次级证据仍在详情中，下线徽标和弹层保留；共享 URL 同时被标记为原厂来源时，渠道事实的首链接仍标为“官方文档”。
- 百炼 `kimi-k3` 可见链接为 `https://help.aliyun.com/zh/model-studio/kimi-k3`，文字为“官方文档 · help.aliyun.com”，title 沿用“核实日期 2026-11-09”格式。**当前基线 R8 已输出该链接**，因此它不计入本轮实际变化的 46 项；新增 DOM 测试另外注入 `huggingface.co` 通用目录来源，确认无法覆盖百炼证据，普通/紧凑卡片与触屏详情均覆盖。

### R9 全目录首链接变化

按精确 `channel/id` 对比修改前后的生产 `modelCardSpecifications(...).sources[0]`，全静态目录 **1,064 张中 46 张改变、1,018 张不变**，不是角色重复数，也不是来源列表中的 URL 数。只改变来源优先级，没有添加/删除卡片或修改规格事实。

| 渠道 | 首链接变化数 |
| --- | ---: |
| TokenDance / `tokendance` | 38 |
| 百炼 / `bailian` | 3 |
| Ant Ling / `antling` | 5 |
| 合计 | **46** |

沿用现有只读离线计数器 `node scripts/count-model-catalog.mjs . --keys`：静态 1064、完整 mock registry 1061、可见目录 919、可选 878。mock 可见集合中受影响 **8 张**（百炼 3 + Ant Ling 5）；该夹具的 TokenDance 账号目录为空，38 项仍完整纳入全静态统计。直接以静态 registry 驱动目录时可见 985 张，其中 44 张受影响，另 2 张 TokenDance 小米旧型号被生命周期过滤。以上不是实时生产账号目录的计数。

### R9 验证

| 验证 | 结果 |
| --- | --- |
| Web 受影响模型/卡片/目录测试 | **87/87**，包括新增 R9 四项：跨运行时显示名/通知/错误、Kimi 链接与 title 日期、全目录来源规则与安全回退、触屏详情 |
| Web 全量 | **1360/1372**，12 失败，0 跳过 |
| 同环境只读基线 | `git archive HEAD` 导出 `785b99df` 到临时目录，复跑 4 个失败文件 **20/32**；12 个失败名称与本轮完全一致 |
| 小程序全量 / build | **134/134**；`tsc` 通过；预算测试 **2/2** |
| Core model-audit / Gateway model-audit | **8/8** / **6/6**；本地夹具与模拟传输 |
| scripts 全量 | **30/30** |
| 审计生成器 / 目录同步 / 参考上传同步 | 已生成；`generate-model-audit.mjs --check`、`sync-model-catalog.mjs --check`、`sync-reference-upload.mjs --check` 均通过 |
| Web build | 通过；保留已有大 chunk 警告 |
| Git diff 空白检查 | 通过 |

小程序源码 **1,567,915 bytes**、runtime **1,144,691 bytes**、媒体 **189,978 bytes**；相对 R8 源码减少 **140 bytes**，原上限 **1,572,864** 未改，余 **4,949 bytes**。预算测试未修改，生成 `.js` 与 `.ts` 一致。

Web 既有失败分布：`inactive-route-ui` 1、`professional-custom-v381` 8、`workflow-v400-ui` 2、`workspace-migration` 1。日志为 `/tmp/r9-web-full.log`、`/tmp/r9-baseline-web.log`，其他测试/构建为 `/tmp/r9-*.log`。额外检查历史版本报表生成器 `sync-model-version-report.mjs --check` 时，当前和 `785b99df` 基线都报同一 `docs/model-version-mapping.csv` 漂移；该旧报表不属于本轮双 sync，未批量重写历史报表。

验证路径：模型卡 → 查看“官方文档 · help.aliyun.com”链接/title → 触屏点击 → 详情显示同一 URL 与核实日期。Browser 插件未提供；`pnpm --dir apps/web exec playwright --version` 返回 command not found，未安装依赖。证据为真实组件 DOM/交互测试；未声称完成真浏览器截图或微信原生扫描，小程序继续暂停发布。

### R9 附录：46 张首链接变化完整列表

下表每行是一张精确渠道卡片，按渠道/ID 排序；完整 URL 保留以便复查。

| 精确渠道 / 型号 | 修改前可见链接 | 修改后可见链接 |
| --- | --- | --- |
| `antling/Ling-3.0-flash` | https://developer.ant-ling.com/zh-CN/docs/models/ling/ | https://developer.ant-ling.com/zh-CN/docs/api-reference/chat/openai/ |
| `antling/Ling-3.0-flash-VL` | https://developer.ant-ling.com/zh-CN/docs/models/ling/ | https://developer.ant-ling.com/zh-CN/docs/api-reference/chat/openai/ |
| `antling/Ling-3.0-tiny` | https://developer.ant-ling.com/zh-CN/docs/models/ling/ | https://developer.ant-ling.com/zh-CN/docs/api-reference/chat/openai/ |
| `antling/Ling-3.1-flash` | https://developer.ant-ling.com/zh-CN/docs/models/ling/ | https://developer.ant-ling.com/zh-CN/docs/api-reference/chat/openai/ |
| `antling/Ling-3.2-flash` | https://developer.ant-ling.com/zh-CN/docs/models/ling/ | https://developer.ant-ling.com/zh-CN/docs/api-reference/chat/openai/ |
| `bailian/qwen3.7-max-2026-06-08` | https://help.aliyun.com/zh/model-studio/qwen3-7-max | https://help.aliyun.com/zh/model-studio/models |
| `bailian/qwen3.8-flash` | https://help.aliyun.com/zh/model-studio/vision-model | https://help.aliyun.com/zh/model-studio/models |
| `bailian/qwen3.8-max` | https://help.aliyun.com/zh/model-studio/qwen3-8-max | https://help.aliyun.com/zh/model-studio/models |
| `tokendance/deepseek-v4-pro` | https://api-docs.deepseek.com/quick_start/pricing/ | https://tokendance.space/gateway/v1/models |
| `tokendance/deepseek-v4.1-flash` | https://api-docs.deepseek.com/quick_start/pricing/ | https://tokendance.space/gateway/v1/models |
| `tokendance/dots-3-note-preview` | https://github.com/studio-dots-ai/dots3-note-prev | https://tokendance.space/gateway/v1/models |
| `tokendance/glm-5.3-flashx` | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5.3-flash | https://tokendance.space/gateway/v1/models |
| `tokendance/hy4-preview` | https://huggingface.co/tencent/Hy4-preview | https://tokendance.space/gateway/v1/models |
| `tokendance/kimi-k2.5` | https://tokendance.space/docs/kimi-thinking-models.md | https://tokendance.space/gateway/v1/models |
| `tokendance/kimi-k2.6` | https://platform.kimi.com/docs/models | https://tokendance.space/gateway/v1/models |
| `tokendance/kimi-k2.7-code` | https://platform.kimi.com/docs/models | https://tokendance.space/gateway/v1/models |
| `tokendance/kimi-k3` | https://platform.kimi.com/docs/models | https://tokendance.space/gateway/v1/models |
| `tokendance/mimo-v2.5` | https://mimo.mi.com/docs/zh-CN/updates/deprecate | https://tokendance.space/gateway/v1/models |
| `tokendance/mimo-v2.5-pro` | https://mimo.mi.com/docs/zh-CN/updates/deprecate | https://tokendance.space/gateway/v1/models |
| `tokendance/qwen3-vl-plus` | https://platform.qianwenai.com/docs/developer-guides/getting-started/vision-models | https://tokendance.space/gateway/v1/models |
| `tokendance/qwen3.5-35b-a3b` | https://help.aliyun.com/zh/model-studio/models | https://tokendance.space/gateway/v1/models |
| `tokendance/qwen3.5-flash` | https://help.aliyun.com/zh/model-studio/models | https://tokendance.space/gateway/v1/models |
| `tokendance/qwen3.5-plus` | https://help.aliyun.com/zh/model-studio/model-depreciation | https://tokendance.space/gateway/v1/models |
| `tokendance/qwen3.6-plus` | https://help.aliyun.com/zh/model-studio/models | https://tokendance.space/gateway/v1/models |
| `tokendance/qwen3.7-max` | https://help.aliyun.com/zh/model-studio/models | https://tokendance.space/gateway/v1/models |
| `tokendance/qwen3.7-plus` | https://help.aliyun.com/zh/model-studio/models | https://tokendance.space/gateway/v1/models |
| `tokendance/qwen3.8-flash` | https://help.aliyun.com/zh/model-studio/vision-model | https://tokendance.space/gateway/v1/models |
| `tokendance/qwen3.8-max` | https://help.aliyun.com/zh/model-studio/qwen3-8-max | https://tokendance.space/gateway/v1/models |
| `tokendance/qwen3.8-max-0902` | https://help.aliyun.com/zh/model-studio/models | https://tokendance.space/gateway/v1/models |
| `tokendance/seed-2.0-lite` | https://www.volcengine.com/docs/82379/1330310 | https://tokendance.space/gateway/v1/models |
| `tokendance/seed-2.0-mini` | https://www.volcengine.com/docs/82379/1330310 | https://tokendance.space/gateway/v1/models |
| `tokendance/seed-2.0-pro` | https://www.volcengine.com/docs/82379/1330310 | https://tokendance.space/gateway/v1/models |
| `tokendance/seed-2.1-pro` | https://www.volcengine.com/docs/82379/1330310 | https://tokendance.space/gateway/v1/models |
| `tokendance/seed-2.1-turbo` | https://www.volcengine.com/docs/82379/1330310 | https://tokendance.space/gateway/v1/models |
| `tokendance/seed-evolving` | https://www.volcengine.com/docs/82379/1330310 | https://tokendance.space/gateway/v1/models |
| `tokendance/seedream-5.0-lite` | https://docs.volcengine.com/docs/ark/seedream-4-0-5-0?lang=zh | https://tokendance.space/gateway/v1/models |
| `tokendance/seedream-5.0-pro` | https://docs.volcengine.com/docs/ark/seedream-4-0-5-0?lang=zh | https://tokendance.space/gateway/v1/models |
| `tokendance/spark-x2.5-1.7b` | https://maas.xfyun.cn/api/v1/gpt-finetune/model/base/list-v2?page=1&size=9999 | https://tokendance.space/gateway/v1/models |
| `tokendance/spark-x2.5-4b` | https://maas.xfyun.cn/api/v1/gpt-finetune/model/base/list-v2?page=1&size=9999 | https://tokendance.space/gateway/v1/models |
| `tokendance/step-3.5-flash` | https://platform.stepfun.com/docs/zh/guides/models/list | https://tokendance.space/gateway/v1/models |
| `tokendance/step-3.7-flash` | https://platform.stepfun.com/docs/zh/guides/models/list | https://tokendance.space/gateway/v1/models |
| `tokendance/step-5-preview` | https://platform.stepfun.com/docs/zh/guides/models/list | https://tokendance.space/gateway/v1/models |
| `tokendance/unifuncs-s3` | https://unifuncs.com/api/deepsearch | https://tokendance.space/gateway/v1/models |
| `tokendance/unifuncs-s3-pro` | https://unifuncs.com/api/deepsearch | https://tokendance.space/gateway/v1/models |
| `tokendance/unifuncs-u3` | https://unifuncs.com/api/deepresearch | https://tokendance.space/gateway/v1/models |
| `tokendance/unifuncs-u3-pro` | https://unifuncs.com/api/deepresearch | https://tokendance.space/gateway/v1/models |

## R8：PM 小项修正（历史验收，R9 覆盖显示名与来源规则）

基于 PR #245 的 `942f6078`。只读 Git；未执行 Git 写命令，未调用真实/付费模型，未提交、推送或部署。以下覆盖 R7/R6B 的显示名、错误文案、token 单位与百炼 Kimi K3 结论。

1. **显示名**：68 个移除记录逐一补入 `displayName`，全部来自只读 `git show c7b6a2fc:apps/web/src/lib/staticModelCatalog.js` 的精确渠道与 ID 对应 `label`；替代名同源。保留 main 的原始大小写、空格与限定语，未按 API ID 猜测。小程序只携带消息/确认所需原名与替代名，复用现有压缩格式；没有下发完整历史目录或证据。Web 我的模型、角色 helper、小程序两个确认入口与 Core/Gateway/Web 错误均有全量移除表断言；原始 ID 仍用于机器字段，显示不泄漏 API ID（main 标签与 ID 逐字相同的条目除外）。
2. **选择按钮**：目录与任务内 ModelPicker 页脚共用同一规则，修正目录通用字号覆盖；字号、最小高度、圆角、背景、颜色及 padding 在 DOM 计算样式中一致。
3. **改选与确认**：我的模型去掉下划线及桌面专用按钮缩小规则；共用 `tw-secondary`。配置 helper 的按钮增加 8px 起始间距，对桌面/移动均生效；确认弹层 `min-height:0; height:auto`，保留通用最大高度与滚动。取消、角色隔离、原库条目及机器身份不变。
4. **百炼 Kimi K3**：仅 `bailian/kimi-k3` 的 totalContextTokens 改为 1048576，maxOutputTokens 仍为 1048576；输入 text、image，输出 text。2026-11-09 官方精确规格原文、URL、日期写入版本化输入与[冲突补充](model-card-audit-20261109-conflicts.md#r8-百炼-kimi-k3-精确规格补充2026-11-09)。对比 `942f6078` 的全部审计字段，只有此精确身份的输入值/来源、输出来源和上下文值变化；其他渠道不变。
5. **单位**：卡片保留官方数字、小数精度和限定语，单位后缀显示大写 K/M；源值及来源详情保留原标签。Web 真实 DOM 和小程序编译后 renderer 各逐卡覆盖 1064 项，既检查无小写单位，又确认原始标签仍在。
6. **错误与文档**：MODEL_UNAVAILABLE 统一为 `模型 {displayName}：原型号已不可用，请重新选择。推荐：{replacementDisplayName}`，无替代时省略推荐段；businessCode/code/statusCode/replacement/sourceUrl 与 not_sent 均保留。只读核对 main 的 SiliconFlow `Qwen/Qwen3.8-27B` 无上下文窗口字段，冲突表、单位表及机器复核记录统一为撤回 1000000 后未知；卡片实测未知。

### R8 验证

| 验证 | 结果 |
| --- | --- |
| 审计生成器、目录同步、参考上传同步 | 已生成；三个 `--check` 均通过 |
| Web 模型/目录/规格定向 | 95/95；最终 R8 文件再跑 4/4 |
| Web 全量 | 1356/1368，12 失败，0 跳过 |
| 只读 HEAD 基线复核 | `git archive 942f6078` 导出到 `/tmp/r8-baseline-7bz7h5cz`，同依赖、同环境跑上述四个失败文件：20/32，12 个失败名称与全量完全一致，无新增失败 |
| 小程序 | 全量 134/134；build 通过；预算测试 2/2 |
| Core model-audit 两文件 | 8/8；Core TypeScript check 通过 |
| Gateway model-audit | 6/6 |
| scripts 全量 | 30/30 |
| Web build | 通过；既有大 chunk 警告保留 |
| Git diff 空白检查 | 通过 |

小程序源码 **1,568,055 bytes**，runtime **1,144,828**，媒体 **189,978**；相对 R7 源码增加 **3,727**，原上限 **1,572,864** 不变，余 **4,809 bytes**。所有 `.js` 已由 `.ts` 编译；预算测试未修改、未跳过。测试只使用本地夹具/模拟传输。

Web 既有失败分布：inactive-route-ui 1、professional-custom-v381 8、workflow-v400-ui 2、workspace-migration 1。日志：`/tmp/r8-web-full.log`、`/tmp/r8-baseline-web.log`；定向及其他验证日志采用 `/tmp/r8-*.log`。没有将这些失败改为通过或跳过。

Browser 插件未提供；`pnpm --dir apps/web exec playwright --version` 返回 command not found，未安装依赖。验证为 DOM/计算样式、编译后小程序组件与构建；1280/390 真浏览器截图、微信原生扫描未完成。小程序继续暂停发布。

### R8 移除显示名逐项来源

下表 68 项的来源均为 **`c7b6a2fc:apps/web/src/lib/staticModelCatalog.js` → `STATIC_MODEL_REGISTRY[channel].models` → 精确 `id` 的 `label`**。冻结测试夹具：`apps/web/tests/fixtures/removed-model-names-main-c7b6a2fc.json`。特别地，main 小米标签为 `MiMo-v2.5` / `MiMo-v2.5-pro`，逐字保留，没有替换为任务示例中的大写 V。

| 精确渠道 / 型号 | displayName（逐字） |
| --- | --- |
| `bailian/MiniMax-M2.1` | `MiniMax-M2.1` |
| `bailian/MiniMax/MiniMax-M2.1` | `MiniMax-M2.1` |
| `bailian/Moonshot-Kimi-K2-Instruct` | `Moonshot-Kimi-K2-Instruct` |
| `bailian/deepseek-r1` | `DeepSeek-r1` |
| `bailian/deepseek-r1-0528` | `DeepSeek-r1-0528` |
| `bailian/deepseek-r1-distill-qwen-14b` | `DeepSeek-r1-distill-qwen-14b` |
| `bailian/deepseek-r1-distill-qwen-32b` | `DeepSeek-r1-distill-qwen-32b` |
| `bailian/deepseek-r1-distill-qwen-7b` | `DeepSeek-r1-distill-qwen-7b` |
| `bailian/deepseek-v3` | `DeepSeek-V3` |
| `bailian/deepseek-v3.1` | `DeepSeek-V3.1` |
| `bailian/deepseek-v3.2` | `DeepSeek-V3.2` |
| `bailian/deepseek-v3.2-exp` | `DeepSeek-V3.2-exp` |
| `bailian/deepseek-v4-flash` | `DeepSeek-V4-Flash（具体版本待确认）` |
| `bailian/glm-4.5` | `GLM-4.5` |
| `bailian/glm-4.5-air` | `GLM-4.5-air` |
| `bailian/glm-4.7` | `GLM-4.7` |
| `bailian/kimi-k2-thinking` | `Kimi-k2-thinking` |
| `bailian/qvq-max` | `qvq-max` |
| `bailian/qvq-plus` | `qvq-plus` |
| `bailian/qwen-image-edit` | `Qwen-image-edit` |
| `bailian/qwen-image-edit-max` | `Qwen-image-edit-max` |
| `bailian/qwen-image-edit-max-2026-01-16` | `Qwen-image-edit-max-2026-01-16` |
| `bailian/qwen-image-edit-plus` | `Qwen-image-edit-plus` |
| `bailian/qwen-image-edit-plus-2025-10-30` | `Qwen-image-edit-plus-2025-10-30` |
| `bailian/qwen-image-edit-plus-2025-12-15` | `Qwen-image-edit-plus-2025-12-15` |
| `bailian/qwen-image-max` | `Qwen-image-max` |
| `bailian/qwen-image-max-2025-12-30` | `Qwen-image-max-2025-12-30` |
| `bailian/qwen-image-plus` | `Qwen-image-plus` |
| `bailian/qwen-image-plus-2026-01-09` | `Qwen-image-plus-2026-01-09` |
| `bailian/qwen-long-2025-01-25` | `Qwen-long-2025-01-25` |
| `bailian/qwen-long-latest` | `Qwen-long-latest` |
| `bailian/qwen-omni-turbo` | `Qwen-omni-turbo` |
| `bailian/qwen-vl-max` | `Qwen-vl-max` |
| `bailian/qwen-vl-plus` | `Qwen-vl-plus` |
| `bailian/qwen2.5-omni-7b` | `Qwen2.5-omni-7b` |
| `bailian/qwen3-14b` | `Qwen3-14b` |
| `bailian/qwen3-235b-a22b` | `Qwen3-235b-a22b` |
| `bailian/qwen3-235b-a22b-instruct-2507` | `Qwen3-235b-a22b-instruct-2507` |
| `bailian/qwen3-235b-a22b-thinking-2507` | `Qwen3-235b-a22b-thinking-2507` |
| `bailian/qwen3-30b-a3b` | `Qwen3-30b-a3b` |
| `bailian/qwen3-30b-a3b-instruct-2507` | `Qwen3-30b-a3b-instruct-2507` |
| `bailian/qwen3-30b-a3b-thinking-2507` | `Qwen3-30b-a3b-thinking-2507` |
| `bailian/qwen3-32b` | `Qwen3-32b` |
| `bailian/qwen3-8b` | `Qwen3-8b` |
| `bailian/qwen3-coder-30b-a3b-instruct` | `Qwen3-coder-30b-a3b-instruct` |
| `bailian/qwen3-coder-480b-a35b-instruct` | `Qwen3-coder-480b-a35b-instruct` |
| `bailian/qwen3-coder-plus` | `Qwen3-coder-plus` |
| `bailian/qwen3-coder-plus-2025-07-22` | `Qwen3-coder-plus-2025-07-22` |
| `bailian/qwen3-coder-plus-2025-09-23` | `Qwen3-coder-plus-2025-09-23` |
| `bailian/qwen3-next-80b-a3b-instruct` | `Qwen3-next-80b-a3b-instruct` |
| `bailian/qwen3-next-80b-a3b-thinking` | `Qwen3-next-80b-a3b-thinking` |
| `bailian/qwen3-omni-flash` | `Qwen3-omni-flash` |
| `bailian/qwen3-omni-flash-2025-09-15` | `Qwen3-omni-flash-2025-09-15` |
| `bailian/qwen3-omni-flash-2025-12-01` | `Qwen3-omni-flash-2025-12-01` |
| `bailian/qwen3-vl-flash` | `Qwen3-vl-flash` |
| `bailian/qwen3.6-max-preview` | `Qwen3.6-max-preview` |
| `bailian/qwq-plus` | `qwq-plus` |
| `fireworks/accounts/fireworks/models/deepseek-v4-flash-0731` | `DeepSeek V4 Flash (0731)` |
| `fireworks/accounts/fireworks/models/deepseek-v4-flash-vision-exp` | `DeepSeek V4 Flash Vision Exp` |
| `fireworks/accounts/fireworks/models/deepseek-v4-pro-0813` | `DeepSeek-V4-Pro-0813` |
| `fireworks/accounts/fireworks/models/glm-5p2` | `GLM 5.2` |
| `fireworks/accounts/fireworks/models/kimi-k2p6` | `Kimi K2.6` |
| `fireworks/accounts/fireworks/models/kimi-k2p7-code` | `Kimi K2.7 Code` |
| `fireworks/accounts/fireworks/models/muse-glimmer-30b` | `Muse Glimmer 30B` |
| `stepfun/step-2x-large` | `Step 2x Large` |
| `stepfun/step-image-edit-2` | `Step Image Edit 2` |
| `xiaomi/mimo-v2.5` | `MiMo-v2.5` |
| `xiaomi/mimo-v2.5-pro` | `MiMo-v2.5-pro` |



## R6B：界面修正（历史验收）

基于已提交的 R6A `b418f1f7`，保留数据事实、任意角色空默认和执行合同。未运行 Git 写入命令，未调用真实/付费模型，未提交、推送或部署。下方 R6A/R5 等记录保留为历史；本节覆盖界面相关的旧文案和样式结论。

| 项 | 本轮结果 |
| --- | --- |
| 4 | 九张带限定语的窗口统一为“数值 tokens（限定语）”，Web DOM 与编译后小程序均逐卡覆盖：SiliconFlow 6、讯飞 1 为 `≈ 131K tokens（需 YaRN）` / `128K tokens（需 YaRN；原生 32K）`；Runware 2 在 R6A 已为默认 32768，保留 `≈ 33K tokens（默认）`，不改回 YaRN 扩展窗口。精确值悬停不变。 |
| 6 | 未知模态统一使用既有灰色图标，移除 `?`，保留可访问的“未知”语义；全未知也显示灰色图标。最大输出使用同一 Lucide 图标集的 TextCursorInput，上下文仍为 ScanText。小程序现有文本布局保留灰色未知项并去掉问号。 |
| 7 | 单条或合并的已移除通知出现时，不再同时显示“还没有添加模型 / 没有匹配的模型 / 清除筛选”。短展示名用于通知、角色 helper、切换按钮、确认弹框和下线详情；API ID 仍用于查找、提交及悬停身份信息。 |
| 8 | 统一“原型号已不可用，请重新选择”，有替代时追加“。推荐：MiMo-V2.6-Flash / GLM 5.3”等短名。Web 改选复用现有有边框的次级按钮样式；我的模型通知也支持显式确认。小程序选择器复用 secondary-button，配置面板保留 role-key-button。取消不写入，确认只改当前角色；原记录/停用状态与其他角色保留。 |
| 9 | 仅来源和下线弹层设置 `min-height:0; height:auto`，覆盖移动端通用 45dvh 下限；保留最大高度与滚动。来源链接显示“下线公告 / 官方文档 · 域名”，完整 URL 保留在链接目标和悬停；小程序原生详情显示域名，复制仍得到完整 URL。DOM 验证两类弹层的计算样式及触屏交互。 |
| 10 | 网格卡片顶部对齐；标题最多两行并有完整 title。API ID 与角色标签保持一行，ID 可收缩且完整值保留在 DOM/title；连接 ID 从可见副标题移入 title，选择器也仅显示连接名。延用紧凑 padding、四条规格与共用来源/操作行，不新增卡片区块。像素高度相对 main 的“一行以内”仍需实屏验收。 |

### 验证与边界

- Web 定向：模型、目录、思考及 rendered-interactions 共 **205/205**；新增 R6B DOM **6/6**，保留原确认/取消、来源、精确身份与空默认断言。
- Web 全量：**1345 通过 / 12 失败 / 0 跳过**（1357 总数）。从 `b418f1f7` 用只读 `git archive` 解出临时源树，同一环境对失败文件复跑 **20 通过 / 12 失败 / 0 跳过**；失败名称集合完全一致。涉及 inactive-route-ui 1、professional-custom-v381 8、workflow-v400-ui 2、workspace-migration 1。本轮没有修改这些默认/迁移合同或跳过失败。
- 小程序：**130/130**，`build` / `check` 通过。源码 **1,564,174 bytes**（比 R6A 少 **195**），runtime **1,141,303**、媒体 **189,978 bytes**；原上限 **1,572,864** 不变，余 **8,690**。移除选择器未渲染的重复投影字段，复用生成的短名/hint helper；保留 availabilityNotes、版本详情、选择约束和原预算测试。`.js` 已由 `.ts` 编译。
- 生成器：scripts **28/28**；`sync-model-catalog.mjs --check`、`sync-reference-upload.mjs --check`、`generate-model-audit.mjs --check` 通过。小程序后缀为显示字段，服务端审计事实、API、价格和权限不变。
- Web build 通过，已有大 chunk 提示仍在；`git diff --check` 通过。
- 验证流程：模型目录/我的模型 → 失效通知与改选确认；模型选择器 → 灰色未知模态、带限定语的窗口；触屏来源/下线徽标 → 内容高度弹层。Browser 插件未提供，`pnpm --dir apps/web exec playwright --version` 返回 command not found；未安装依赖。以上为 DOM/组件与 CSS 计算样式证据，不是 1280/390 实屏或微信原生扫描。小程序继续暂停发布，外部实屏待办保留。

## R6A / R6A2：数据阻塞项完成（R6B 的数据基线）

继续保留工作区既有修改，完成任务 1、2、3、5、11；没有运行 Git 写命令，没有真实/付费模型调用、提交、推送或部署。main 基线仍为 `c7b6a2fc`，工作区 HEAD `5798720c`。以下是本轮结果；后面的 R4/R5 数字与“审计优先”规则仅为历史记录。

### 1 · 模态合并与全目录下限

共享显示层对输入/输出取已知支持项的并集；vision、编辑、源图、参考图及要求图像输入的 operation 至少保留图像输入。产品推导显示“图研输入要求”，不冒充“渠道公布”；未列出的模态仍为未知，明确不支持必须有官方原文。没有改变执行能力、角色、默认型号或请求参数。

全量静态 **1064** 张卡检查通过，**345 张 / 351 个模态字段**修正；其中 **41** 张原来错误显示仅文本的卡已修复，另有此前未知的角色必需输入得到补全。与 main 的已核实支持项相比，原退化实际是 **9 个精确渠道+ID / 13 个字段**，全部恢复；任务举例的“12”把 fal 同卡的输入、输出分别计入，且全量另发现百炼 `qwen3.7-max-2026-06-08`。本轮测试对全部型号逐模态核对冻结 main 夹具，未降低已知支持项。

| 渠道 | 修正卡数 | 原错误仅文本 | 原低于 main 的卡数 |
| --- | --- | --- | --- |
| zhipu | 2 | 0 | 0 |
| siliconflow | 20 | 0 | 0 |
| anthropic | 10 | 0 | 0 |
| recraft | 14 | 0 | 0 |
| xai | 10 | 8 | 1 |
| bailian | 28 | 18 | 2 |
| openai | 20 | 0 | 0 |
| ark | 4 | 0 | 0 |
| bfl | 10 | 0 | 0 |
| stability | 5 | 0 | 0 |
| ideogram | 3 | 0 | 0 |
| minimax | 1 | 0 | 0 |
| mistral | 11 | 0 | 0 |
| together | 13 | 0 | 1 |
| fal | 16 | 14 | 4 |
| replicate | 45 | 0 | 0 |
| tokendance | 8 | 1 | 1 |
| runware | 93 | 0 | 0 |
| tokenhub | 15 | 0 | 0 |
| sensenova | 4 | 0 | 0 |
| qianfan | 7 | 0 | 0 |
| iflytek | 6 | 0 | 0 |

全量 Web 与小程序投影的四字段 value/state/provenance 均一致；原对象不变断言覆盖每个型号。

### 2 · 官方 K/M 标签和整数

采用单一约定：官方给整数则存整数；只给 K/k/M 标签则存字面字符串，保留大小写、小数精度，不按 1000 或 1024 反推。两种写法并列时采用明确整数。已有 catalog 的文字标签也直接保留。整数依旧走现有 formatter，精确整数放在悬停和来源详情；标签不加 ≈。小程序仅存标签值，不再同时存一个不展示的推算整数。

全目录 **126 张卡 / 157 个 token 字段**变化，其中 **145 个字段**改用标签；源输入、canonical、claims、supplement 共 **142 处**字段变更。300 个输入正整数字段逐项记录整数原文、原厂参考、标签转换或未证实别名回退。DeepSeek `384K` 不再显示为 `≈ 393K`；Fireworks `1040k`、Step 5 `64k`、GLM Fast Preview `131K` 等保留原文精度。百炼 Kimi K3 的新官方最大输出表值为 1048576；无精确别名证据的 `kimi/kimi-k3` 旧 16384 覆盖撤回。所有逐值清单见 [单位复核](model-card-audit-20261109-units.md) 和 `config/channel-audit/review-r6a-20261109.json`。

### 3 · 图像角色的 token 展示

静态目录 437 张 image 角色卡中，**24 张**恢复已核实最大输出（Gemini 5、Together 4、fal 5、Replicate 5、Runware 5）；**410 张**仍为不适用，另 3 张缺 token 证据但有文本输出语义，显示未知。这 24 张的最大输入上限不是总上下文窗口：上下文保持未知，不凭名称或 image 角色覆盖已知 token 值，也不把输入限制冒充窗口。

### 5 · 原始 85 项冲突逐项保留

[冲突表](model-card-audit-20261109-conflicts.md) 已为全部 85 行增加“官方原文”及决定，**49 项原文支持、36 项撤回覆盖并回退**。未取得可用原文的行明确写出未证实和已检查链接，未制造引文。三条 Qwen Plus 快照按各自章节确认 131072；百炼 Kimi K3 撤回 262144；TokenDance LongCat-2.0 按该渠道精确 JSON 行确认 1000000；SiliconFlow Qwen3.8-27B 无渠道原文，回退既有值/未知。第三方 DeepSeek Flash 图像输入已撤回原厂继承；产品角色要求独立保留。

### 11 · 在线开关序列化恢复

原 qwen3-omni-flash 及日期快照均已移除；当前 Omni 3.5 明确禁止思考。使用仍在库、同 `bailian-openai-chat` 协议的 **qwen3.8-flash**，对 main/vision × true/false/省略运行 **6 次真实适配器 + mock fetch**，保留响应、单次请求、完整 URL、model、stream、enable_thinking、audio/effort/budget/extra_body 缺省断言。Omni 当前型号的另外 4 个省略路径继续断言 `modalities=['text']`；这个 Omni 专属字段不能泄漏到 Qwen3.8。旧 ID 零传输/零工作流/零记录拒绝和旧思考快照的纯序列化断言仍在。

### 全量计数：同一显示规则解析 main / head

使用当前只读计数脚本分别运行 `node scripts/count-model-catalog.mjs ../Tuyan-wt-baseline --keys` 和 `node scripts/count-model-catalog.mjs . --keys`；两根都使用本轮共同显示规则，base 不存在审计层时为空。不是把历史 UI 截图计数当作当前规则计数。输入/输出数只表示至少一个已知模态，不等于全部模态已核实。

| 分母 | 总数 main → head | 已知输入 | 已知输出 | 已知上下文 | 已知最大输出 |
| --- | --- | --- | --- | --- | --- |
| 静态目录 | 1125 → 1064 | 746 → 791 | 327 → 495 | 224 → 350 | 74 → 209 |
| 可见目录 | 923 → 919 | 869 → 868 | 819 → 838 | 411 → 412 | 68 → 181 |
| 完整 mock registry | 1122 → 1061 | 1032 → 997 | 968 → 967 | 534 → 519 | 74 → 209 |

可选模型 884 → 878；目录仍为 1125 − 68 + 7 = 1064，7 项将下线。完整差异、逐渠道卡数与逐字段修改见 [R6A 计数 JSON](model-card-audit-20261109-count-r6a.json)。完整 mock 的部分总数减少来自移除集合及无原文覆盖撤回；没有恢复已移除型号，也未改变任意角色可空默认的 H 决策。

### 小程序载荷与构建一致性

继续复用原 pack/delta codec。模态值与既有 registry 相同则存引用，差异保存运算项并在运行时取并集；图像角色下限使用同一共享函数推导。相同字段来源引用行默认来源，避免每条事实重复存 URL 索引。未展示的审核标志和移除记录日期/证据不打包；显示用来源、说明、限制、精确身份和替代提示保持。

源码包 **1,564,369 bytes**，比 main 的 1,570,043 少 **5,674 bytes**；比原上限 **1,572,864** 少 **8,495 bytes**。runtime **1,141,228 bytes**，媒体 **189,978 bytes**。未修改预算或预算测试，未压缩/混淆手写源码，已执行 tsc build，提交目录内 `.js` 与 `.ts` 一致。小程序仍暂停发布。

### 最终验证

| 范围 | 命令 / 结果 |
| --- | --- |
| 审计、目录、参考上传 | generate-model-audit；sync-model-catalog；sync-reference-upload，各自 --check 通过 |
| scripts 全套 | `node --test scripts/*.test.mjs`：28/28 |
| Web 模型、目录、思考 | `node --import tsx --import ./tests/dom-setup.mjs --test tests/*model*.test.mjs tests/catalog-isolation.test.mjs tests/provider-catalogs.test.mjs tests/*thinking*.test.mjs tests/workspace-catalog-v35.test.mjs`：179/179 |
| 小程序 | `pnpm --dir apps/miniprogram test`：128/128；build/check 和原包体预算通过 |
| 受影响 API | `thinking-bailian-console-54`、`model-audit`、`model-audit-http`：10/10；Core check 通过 |
| Web 构建 | `pnpm --dir apps/web build` 通过；已有大 chunk 提示仍在 |
| Git 只读检查 | `git diff --check` 通过；未运行 Git 写命令 |

本轮没有重跑全部 Core/Web/Gateway；不将上述定向验证写成全量通过。Browser 插件未提供，按前端验证流程尝试现有 Playwright 时 `pnpm exec playwright --version` 返回 command not found，未安装新依赖；真实浏览器截图/移动实屏和微信原生扫描仍未完成，DOM 交互已覆盖标签、来源详情和选择行为。

---

本报告取代旧轮次的基线、计数和测试汇总。PR 基线为 **main `c7b6a2fc`**；第三轮 1–6 已在 `00d04cee`，main 已于 `fe5a764d` 合入。R4 修改留在工作区，未运行任何 Git 写命令、部署或真实/付费提供商调用；不更改价格、计费、许可、权限、凭据或服务器配置。

## A–P 逐项记录

| 项 | 处理结果 | 文件与验证 |
| --- | --- | --- |
| A | 卡片按字段回退到既有已核实数据，标记 catalog / 图研既有核实，保留来源、日期和限定语；审计优先并记录冲突。 | apps/web/src/lib/catalogCardFacts.js、modelCardSpecifications.js；model-audit-r4 / model-specifications 测试及双根计数。 |
| B | 未列出的模态显示中性问号；空模态数组也为未知，只有带官方来源的明确 false / unsupported 才是不支持。Web、小程序同义。 | modelModalityIcons.js、model-picker.ts、generate-model-audit.mjs；生成器、Web 及小程序模态回归。 |
| C | 恢复既有输入/窗口断言；qwen3.8-max 的 text-only 缺明确证据，移除该审计字段以回退文本/图像/视频；Ling-3.0-flash-VL 的视频来源和 image_url / video_url 说明写入补充数据。main 的小程序默认断言保持原强度。 | provider-catalogs、bailian-multimodal、model-registry 测试；config/channel-audit/model-audit-supplement-20261109.json。 |
| D | Core 顶层和 optimizeInputs 捕获 MODEL_UNAVAILABLE，返回 400、替代提示、not_sent。 | runtime/handler.ts；model-audit.test.ts，提供商全 mock。 |
| E | 自定义 API / TokenDance 凭据预检返回相同 400；在读取凭据或调用处理器前停止。 | src/server.ts；model-audit-http.test.ts 通过内存 HTTP 走真实 Express 中间件。 |
| F | 首次同步无服务端存档及显式 import 保留历史条目；用户添加传 intent=add，继续拒绝移除 ID。已有存档普通保存仍按精确身份验证新条目。调用前可用性检查仍独立生效。 | packages/api/src/model-audit.ts、model-library.js、useWorkspaceModels.js；Gateway 首次同步/导入与 Web hook 往返测试。 |
| G | 保留生产 formatContextLimit 十进制 K/M 规则及原有 ≈；精确整数放悬停或点击详情。 | modelCardSpecifications.js、小程序 model-picker.ts；R3 格式回归。 |
| H | 保留 availabilityNotes；保留 main 对所有角色允许空默认的规则及移除默认的跳过逻辑，StepFun 默认绘图仍为空。 | scripts/lib/mini-model-catalog.mjs；model-registry / package-budget / R3 空槽测试。 |
| I | 恢复选择器思考状态、连接说明；我的模型显示连接名 · 完整连接 ID，同渠道同名连接可区分。 | ModelPicker.jsx、WorkspaceModelCatalog.jsx；model-audit-r4.test.mjs。 |
| J | 确认替换只更新当前角色；原库条目的启用/停用状态保持原样，所有其他预设继续保留原绑定。 | ModelReplacement.jsx；确认、取消、库对象不变的 DOM 回归。 |
| K | 57 个百炼删除型号在 main 均只配置 cn-beijing，全部保留删除，国际恢复和待国际公告确认均为 0。 | 逐 ID 地区表见 model-card-audit-20261109-regions.md。 |
| L | 生成器默认读取版本化最小输入快照，--check 无需私有审计目录、网络或基线工作树。 | config/channel-audit/input-20261109.json（478430 bytes）；generate-model-audit.mjs / --check。 |
| M | 报告和计数只用仓库相对路径；扫描相对 main 的全部新增差异，不含绝对本机路径。 | 本系列文档、计数脚本与 JSON；git diff 只读检查。 |
| N | 百炼 kimi/kimi-k2.7-code-highspeed 最大输出设为 null，阻止旧值回退，并注明“待核实：官方页面需浏览器渲染核对”。 | 补充数据 fieldOverrides / suppressFallback；Web、生成器回归。 |
| O | 历史沙箱失败与任务提供的沙箱外结果分别记录；本轮 head/base 的沙箱结果单独列出。 | 本文及 SYNC.md。 |
| P | Web 按静态目录顺序引用身份，保留动态目录额外行，去掉生成器 additions 清单；小程序仅带卡片/选择字段，移除不用的服务端验证函数。 | sync-model-catalog.mjs、mini-model-catalog.mjs；codec、完整小程序测试及构建。 |

## 第三轮 1–6 合并后复验

| 项 | 仍成立的行为 | 验证入口 |
| --- | --- | --- |
| 1 | StepFun 绘图默认为空，“应用此连接的默认组合”显示此连接暂无默认绘图模型；其他角色空默认也沿用 main 规则。 | model-audit-r3.test.mjs / 小程序 model-registry |
| 2 | Ling-2.6-1T、Ling-2.6-flash、Ring-2.6-1T 保留至 2026-11-15 00:00 UTC+8，替代 Ling-3.1-flash；将下线总数 7。四个更早退役型号仍不在目录。 | deprecations-addendum-20261109.json；生成器/Core/Gateway 边界测试 |
| 3 | 生产 formatContextLimit(1048576) 为 ≈ 1M，262144 为 ≈ 262K，393216 为 ≈ 393K；精确整数和完整 URL 在详情。 | Web R3 / 小程序 model-audit |
| 4 | 移除提示按当前渠道和厂商过滤；多个提示合为一个可展开通知，替代名优先短且无歧义展示名。 | Web R3；13 条公共预览夹具 |
| 5 | 移除槽为请选择 + 单句 helper + 改选确认，不在打开/刷新时自动改写；只改当前角色。 | Web R3 / 小程序移除角色回归 |
| 6 | 将下线徽标在标题旁；API ID 保持完整 DOM 和换行布局，点击徽标可读日期及替代型号。 | Web R3；1280/390 实屏仍需外部环境 |

## main 与 head 计数

运行同一只读脚本：

```sh
node scripts/count-model-catalog.mjs ../Tuyan-wt-baseline --keys
node scripts/count-model-catalog.mjs . --keys
```

计数日期固定 2026-11-09，所有外部目录请求均 mock。TokenDance 空账号目录，其他动态目录离线失败。四项已知计数使用当前同一个 `modelCardSpecifications`，分别注入两根的静态目录/既有规格/审计数据；main 无审计层，输入为空审计。数字不适用行不算已知窗口。

| 范围 | main c7b6a2fc | head |
| --- | --- | --- |
| staticRegistry | 1125 | 1064 |
| mockRegistry | 1122 | 1061 |
| catalogVisible | 923 | 919 |
| pickerSelectable | 884 | 878 |

| 已知字段 | main | head | 差值 |
| --- | --- | --- | --- |
| inputModalities | 746 | 791 | 45 |
| outputModalities | 327 | 495 | 168 |
| totalContextTokens | 224 | 350 | 126 |
| maxOutputTokens | 74 | 209 | 135 |

静态目录和可见卡片的四项总数均未下降。完整 mock registry 包括已删除历史型号，其减少另见下表逐项说明。静态净变化为删除 68、增加 7；目录净变化为移除 11 个原可见项、增加 7；可选集合增加的 7 项中 OpenAI 两个图像型号仍缺尺寸合同、保持不可选。已删除 ID 没有重新进入目录；将下线为 7；未核实为 667。既有模型库夹具 13 条原样保存，显示 10 张卡、3 条移除引用提示。生产 1408 不具备同一时点可重放快照，不作逐 ID 差额推断。

| 渠道 | 静态 base → head | mock base → head | 目录 base → head | 可选 base → head |
| --- | --- | --- | --- | --- |
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

| mockRegistry 已知字段 | main | head | 差值 |
| --- | --- | --- | --- |
| inputModalities | 1032 | 997 | -35 |
| outputModalities | 968 | 967 | -1 |
| totalContextTokens | 534 | 519 | -15 |
| maxOutputTokens | 74 | 209 | 135 |

| catalogVisible 已知字段 | main | head | 差值 |
| --- | --- | --- | --- |
| inputModalities | 869 | 868 | -1 |
| outputModalities | 819 | 838 | 19 |
| totalContextTokens | 411 | 412 | 1 |
| maxOutputTokens | 68 | 181 | 113 |

完整 mock 的已知数量减少仅由明确删除的历史型号造成；每个失去的已知字段都在[逐项表](model-card-audit-20261109-field-losses.md)列出，存续型号没有规格回退。

完整机器计数：[count-r3.json](model-card-audit-20261109-count-r3.json)（沿用文件名，内容已更新为 main/R4 双根比较）。85 项规格差异见[冲突表](model-card-audit-20261109-conflicts.md)，百炼逐 ID 地区见[地区表](model-card-audit-20261109-regions.md)。

## 离线证据与打包

`input-20261109.json` 仅包含生成器读取的精确 ID、字段值、来源/映射、公告和七项新增的必要证据。`model-audit-supplement-20261109.json` 保存 Ling 视频来源、已知/未知边界及 Kimi 待核实覆盖；`deprecations-addendum-20261109.json` 保存三项 Ling 时间边界。无密钥、本机路径或账户数据。CI 顺序：

```sh
node scripts/generate-model-audit.mjs --check
node scripts/sync-model-catalog.mjs --check
node scripts/sync-reference-upload.mjs --check
node --test scripts/pack-model-catalog.test.mjs scripts/generate-model-audit.test.mjs
```

普通同步与默认生成器均可独立复现；比较脚本才需要只读基线。Ling-3.0-flash-VL 的视频证据来自[Chat API](https://developer.ant-ling.com/zh-CN/docs/api-reference/chat/openai/)及[型号页](https://developer.ant-ling.com/zh-CN/docs/models/ling/)，任务提供的说明明确图片使用 image_url、视频使用 video_url，本轮未重新访问网页。

| Web 产物 | 修改前 raw / gzip bytes | 修改后 raw / gzip bytes |
| --- | --- | --- |
| modelAudit.js | 86295 / 13408 | 57528 / 8445 |
| 包含它的 WorkspaceRoot chunk | 5480897 / 796857 | 5459168 / 794198 |

构建前 chunk 为 `WorkspaceRoot-lM_XlHeN.js`，构建后为 `WorkspaceRoot-Bhzx-oTm.js`；gzip 使用 Node zlib 默认参数。

| 小程序预算测量（bytes） | main | R4 修改前 | R4 head | 上限 |
| --- | --- | --- | --- | --- |
| source | 1570043 | 1527613 | 1571089 | 1572864 |
| runtime | 1157620 | 1104307 | 1148153 | 1572864 |
| media | 189978 | 189978 | 189978 | 204800 |

源码包相对 main 增加 1046 bytes，距原 1.5 MiB 上限尚余 1775 bytes；相对修改前增加主要来自恢复 availabilityNotes 和既有规格/来源。预算未提高。源码测量含 TS，运行产物测量排除 TS；这不是微信原生包扫描。

## 验证与失败归类

| 范围 | head | 同环境 main |
| --- | --- | --- |
| 同步目录、参考上传、生成器 --check | 全部通过 | 基线只读，未重新生成 |
| 生成器 + codec + Gateway audit | 17 通过 / 0 失败 / 0 跳过（17 项） | 新增审计行为，定向 fixture 全 mock |
| Core 新增审计/预检 | 7 / 7 通过 | main 尚无审计层 |
| Core 主回归 core-composition | 193 通过 / 1 失败 / 0 跳过（194 项） | 193 通过 / 1 失败 / 0 跳过（194 项） |
| Core HTTP / 地区 / 目录定向（head 含上述 7 项） | 15 通过 / 31 失败 / 0 跳过（46 项） | 8 通过 / 31 失败 / 0 跳过（39 项） |
| Core TypeScript check | 通过 | 未改基线 |
| Gateway 全套（当前沙箱） | 190 通过 / 87 失败 / 1 跳过（278 项） | 185 通过 / 87 失败 / 1 跳过（273 项） |
| Web 全套 | 1334 通过 / 12 失败 / 0 跳过（1346 项） | 1310 通过 / 14 失败 / 0 跳过（1324 项） |
| Web 审计/模型管理定向 | 82 通过 / 0 失败 / 0 跳过（82 项） | 新增断言与恢复既有规格断言 |
| 小程序全套 | 127 通过 / 0 失败 / 0 跳过（127 项） | 121 通过 / 0 失败 / 0 跳过（121 项） |
| 根目录 + client-platform | 33 通过 / 3 失败 / 0 跳过（36 项） | 33 通过 / 3 失败 / 0 跳过（36 项） |
| 构建 | Web build、小程序 build/check 通过 | 基线只读，不构建 |

R4 上表已执行的定向范围未发现新增失败；随后操作方的全量 Core 对比发现 19 项新增失败，修复与最新验证见下方 R5。逐测试名的双根归类见[失败比较 JSON](model-card-audit-20261109-test-comparison.json)。Web 的 12 个失败均在 main 复现；main 另外两项 Vite 构建用例无法向只读基线输出文件，未修改基线以绕过。Core 主回归唯一失败是 xAI 样本已于 2026-11-02 过期；HTTP/地区定向的 31 个失败在 main 同样复现，属于本沙箱监听/本地 HTTP 限制。根目录 3 项均为 main 已有历史目录/版本快照断言。

**Gateway 两次环境结果不可混写**：任务提供的此前沙箱外完整执行为 **275 通过 / 0 失败 / 1 跳过**（276 项）；旧沙箱执行为 188 / 87 / 1。上表本轮沙箱 head 已增加审计测试，为 190 / 87 / 1；main 为 185 / 87 / 1。87 个监听失败是当前运行环境结果，不能冒充真实环境业务失败，也不能当作本轮沙箱外已重跑通过。

任务注明 main 的 account-lifecycle.mjs:146 历史失败及完整 Core 并发 1578/2/1，本轮未重跑这些额外集成/全并发范围，不把它们作为本轮新增证据。未跳过测试或降低预算；仅将与新规格/投影不相容的断言换为精确值、来源、完整投影与历史条目不变的断言。

## 预览边界

[截图夹具与 UI 路径](model-card-audit-20261109-preview.md)已更新到 13 条，新增 Ling-3.0-flash-VL。1–6 的 DOM/交互及保留字段回归通过；当前没有可用监听/浏览器环境，1280/390 实屏和微信原生扫描仍待外部验收。小程序继续暂停，生产未发布。


## R5：修复全量 Core 新增的 19 项回归

操作方提供的沙箱外全量结果为 main `c7b6a2fc` 1580 通过 / 13 失败 / 1 跳过，R5 前 head 1567 / 32 / 1。本节按失败日志中的实际测试名与文件定位；任务摘要中部分文件名错位。`core-composition`、`material-files`、`task-material-lifecycle`、`original-material-workflow` 对应的是已给出的基线失败，本轮未改这些文件。

保留 61 个退役型号和 7 个 Fireworks serverless 型号的物理删除，未改 `MODEL_UNAVAILABLE` 守卫。新增测试辅助 `tests/helpers/catalog-retirements.ts` 冻结枚举全部 68 个移除身份，逐一检查静态目录/源目录/可执行合同缺席及 `config/removed-models.json` 的精确 stopDate、sourceUrl；七项新增也逐项核对角色、未实测状态和 OpenAI 禁用原因。总量使用 **1125 − 枚举的 68 + 枚举的 7 = 1064**，不以当前目录反推预期数。历史默认仅 StepFun 已移除的 image 默认变为空，其余全部保留原断言。

以下路径均相对 `apps/paperbanana-api/tests/`；同文件的存续身份、请求内容、计费/恢复断言均保留，没有删测试或新增跳过。

| # | 文件 / 原失败测试 | 修复 |
| --- | --- | --- |
| 1 | `official-catalog-v24.test.ts` · September 29 and October 10 retirement gates | Step 两个移除 ID 改查退役证据和原审计的中国零点产品策略；即使回放历史时间也禁止调用。千帆原时间边界断言保留。 |
| 2 | `official-image-size-v24.test.ts` · all advertised SenseNova/StepFun selections | 原四型号集合减去明确枚举的两个 Step ID，并逐个断言删除证据；其余全部 504 个操作/档位/画幅组合继续检查，原 >250 覆盖门槛保留。 |
| 3 | `official-image-size-v24.test.ts` · Step image lifecycle cutoff | 从移除表读取同一 ID、日期和来源；对照历史公告及 `Asia/Shanghai` 产品零点，保留官方仅有日期、无具体时刻的边界。 |
| 4 | `thinking-bailian-console-54.test.ts` · actual Omni text and vision adapters | 使用在库 `qwen3.5-omni-plus`，保留真实适配器的双角色文本 SSE、模型 ID、端点、字段省略断言；旧 ID 在传输/工作流/计费记录前报 MODEL_UNAVAILABLE。 |
| 5 | `model-channel-contracts.test.ts` · catalog lifecycle and regional corrections | 百炼 qwen-image-edit 的存在断言改为明确缺席与精确退役证据；其他生命周期、地区、角色断言保留。 |
| 6 | `official-catalog-v24.test.ts` · v24 coverage totals | 从原清单 84 减去明确移除的两项，得到 82；main/vision/image 同样逐角色相减，为 73/26/5。 |
| 7 | `official-catalog-v24.test.ts` · v24 longcat exact identity/role | 原 v24 集合继续精确相等，LongCat-2.5 归入后续新增，并由当前目录/文本合同测试独立检查。 |
| 8 | `official-catalog-v24.test.ts` · v24 stepfun exact identity/role | 两个移除项逐一验证缺席、日期、来源与原身份；所有存续 ID 的角色、协议、未实测边界不变。 |
| 9 | `thinking-contracts.test.ts` · every full static catalog runtime disposition | 在 domestic/global 审计源补全七项精确 disposition，生成 Core/Web/support.csv；每个角色/协议仍恰好一项，并验证空 wire、拒绝未审核控制、两款 OpenAI 图像继续禁用。 |
| 10 | `catalog-20261026.test.ts` · new retirement metadata | 小米 mimo-v2.5/pro 改查缺席与精确 `2026-10-21T10:00:00+08:00` 证据；动态目录也缺席，调用报 MODEL_UNAVAILABLE 且零传输；其他日期级证据断言保留。 |
| 11 | `official-text-channels.test.ts` · official text selection | 保留历史 MaaS/LongCat 精确集合；单独检查后来新增 LongCat-2.5 的 main 角色、openai-chat 与官方端点。 |
| 12 | `thinking-other-110.test.ts` · real Fireworks adapter functions | muse-glimmer fixture 换为在库 kimi-k3，按其已审核 effort 枚举走同一 Chat Completions 文本/视觉路径，所有 wire 断言保留；旧 ID 零传输、零工作流/计费记录拒绝。 |
| 13 | `refine-controls.test.ts` · stepfun lost-submit recovery | 换用在库 SenseNova Fast，共用 callOfficialImageChannel 的同步 checkpoint/计费路径；保留一次提交、不可恢复、不重复规划/计费等全部断言，另验证 Step 旧 ID 调用前拒绝。 |
| 14 | `refine-controls.test.ts` · stepfun download recovery | 同一当前 fixture，保留下载可恢复、同 jobId、一次计费提交及规划复用等全部断言；Step 拒绝检查使用有效所属原图且零提供商调用/执行记录。 |
| 15 | `frontier-refresh.test.ts` · real dynamic catalog five routes | 注册表版本对齐 v43；五个同步路由、五个 Batch 排除及不授予图像输出的断言不变。 |
| 16 | `channels-v381.test.ts` · v3.8.1 exact identities | 精确集合增加 Ling-3.1/3.2 和 LongCat-2.5；所有既有 ID、角色、默认、Preview 与证据边界断言保留。 |
| 17 | `catalog-20261016.test.ts` · v32 preserves defaults / 20 identities | 版本对齐 v43；20 项身份原断言保留；默认逐项保留或验证退役缺席，并检查完整枚举差额。 |
| 18 | `catalog-20261026.test.ts` · weekly 19 identities | 版本与总量改为 v43 和显式增减清单；原新增身份、角色、默认和不支持协议检查保留。 |
| 19 | `catalog-20261019.test.ts` · weekly additions preserve defaults | 同上；原未实测状态、思考边界与未适配发现的关闭断言保留。 |

Omni 当前在库型号的既有审核明确不支持 thinking 开关，不能把旧快照的 true/false 权限继承给 3.5。旧快照的布尔序列化、默认省略、错误枚举测试原样保留；当前适配器检查未提供配置和空配置两个场景，并额外拒绝 true/false。Fireworks 也沿用替换 fixture 自己的已审核枚举，没有把 muse 的 xhigh 推给 Kimi。七项新增 disposition 全部为 `unconfirmed` / 空 controls，OpenAI 两款的说明明确待尺寸合同；未修改任何价格、计费实现、模型权限或可选状态。

逐文件执行指定命令 `pnpm --filter @paperbanana/paperbanana-api exec node --import tsx --test tests/<file>`，结果如下（通过 / 失败）：

| 文件 | 原生沙箱命令 | 补充内存 HTTP 验证 |
| --- | --- | --- |
| official-catalog-v24 | 56 / 0 | 无需 |
| official-image-size-v24 | 2 / 0 | 无需 |
| official-text-channels | 42 / 0 | 无需 |
| model-channel-contracts | 2 / 0 | 无需 |
| thinking-bailian-console-54 | 3 / 0 | 无需 |
| thinking-other-110 | 4 / 0 | 无需 |
| thinking-contracts | 10 / 0 | 无需 |
| channels-v381 | 12 / 0 | 无需 |
| catalog-20261016 | 2 / 6（listen EPERM） | 8 / 0 |
| catalog-20261019 | 3 / 2（listen EPERM） | 5 / 0 |
| catalog-20261026 | 3 / 2（listen EPERM） | 5 / 0 |
| frontier-refresh | 1 / 3（listen EPERM） | 4 / 0 |
| refine-controls | 1 / 19（listen EPERM） | 20 / 0 |

五个受阻文件补充内存 HTTP 验证合计 **42/42**，加上无需监听的八文件 **131/131**，13 个受影响文件的全部断言共 **173/173**，包含上述 19 个原失败测试。原生沙箱命令仍为 141 通过 / 32 个监听失败 / 0 跳过；32 个均在请求断言前因绑定 loopback 失败，不能当作通过。补充验证使用临时、不提交的 Node HTTP shim，把 loopback 请求交给原服务器 request listener；测试代码、Gateway/Core 中间件与所有断言照常执行，提供商仍全部 mock。它不代表沙箱外真实监听或全量 Core 已复跑；操作方仍需按原命令复核全量。

其他回归：Web 模型/目录/思考测试 **180/180**；小程序 **127/127** 及 build 通过；Core `check` 通过。根目录 `node --test scripts/*.test.mjs tests/*.test.mjs` 为 head **56 通过 / 3 失败**，同环境只读 main 为 **49 / 3**，失败名相同：旧审计行 siliconflow/ERNIE、760 历史数量快照、DeepSeek-V4.1-Flash 版本元数据；数量快照实际值 head 761 / main 822，均属原有快照过时，非声称错误值完全相同。目录、参考上传两项 `--check`，以及 thinking 同步和审计生成器 `--check` 均通过。

小程序 build 后源码 **1,571,089**、runtime **1,148,153**、媒体 **189,978 bytes**；源码距未提高的 **1,572,864** 上限仍余 **1,775 bytes**。本轮没有 Git 写命令、网络提供商请求、付费调用或生产发布，既有未提交修改保留。

## 沙箱外全量测试（main c7b6a2fc vs head ccb972e2，同一台机器）

| 套件 | main 通过/失败/跳过 | head 通过/失败/跳过 | 新增失败 |
| --- | --- | --- | --- |
| Web | 1312 / 12 / 0 | 1334 / 12 / 0 | 0（12 项同名，均在 main 复现） |
| paperbanana-api (Core) | 1580 / 13 / 1 | 1586 / 13 / 1 | 0（13 项同名，均在 main 复现，含已到期 xAI WebP 样例） |
| auth-gateway | 272 / 0 / 1 | 277 / 0 / 1 | 0 |
| 小程序 | 121 / 0 / 0 | 127 / 0 / 0 | 0 |
| scripts/*.test.mjs | 20 / 0 / 0 | 27 / 0 / 0 | 0 |
| tests/*.test.mjs（根目录） | 29 / 3 / 0 | 29 / 3 / 0 | 0（与 PR #247 记录的 29/3 一致） |

Web / 小程序构建、Core `tsc --noEmit`、`sync-model-catalog --check`、`sync-reference-upload --check` 均通过。小程序源码包 main 1,570,043 → head 1,571,089 bytes（上限 1,572,864 未改，余 1,775）。CI 中 account-lifecycle.mjs:146 依赖 Mongo 副本集，本机未运行，按 PR #247 记为 main 已知失败。


> 2026-11-09 R6 复算（2c6363b5，同一 count 脚本同时作用于 main c7b6a2fc 与 head）：上表三组已知字段已更新为 R6 规则（角色所需图像输入下限、官方 K/M 标签、图像卡 token 值）下的结果。main 侧数字随规则同步复算，因此与 R4 记录不同。mockRegistry 与 catalogVisible 的减少全部来自已删除型号（catalogVisible 删除 11、新增 7）；全目录测试确认存续型号没有低于 main 的已知模态。

## R6 沙箱外全量测试（main c7b6a2fc vs head 2c6363b5，同一台机器）

| 套件 | main 通过/失败/跳过 | head 通过/失败/跳过 | 新增失败 |
| --- | --- | --- | --- |
| Web | 1312 / 12 / 0 | 1345 / 12 / 0 | 0 |
| paperbanana-api (Core) | 1580 / 13 / 1 | 1586 / 13 / 1 | 0 |
| auth-gateway | 272 / 0 / 1 | 277 / 0 / 1 | 0 |
| 小程序 | 121 / 0 / 0 | 130 / 0 / 0 | 0 |
| scripts/*.test.mjs | 20 / 0 / 0 | 28 / 0 / 0 | 0 |
| tests/*.test.mjs | 29 / 3 / 0 | 29 / 3 / 0 | 0 |

失败名称集合与 main 完全一致。Web / 小程序构建、Core `tsc --noEmit` 通过。小程序源码包 main 1,570,043 → head 1,564,174 bytes（上限 1,572,864 未改）。
