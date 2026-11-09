# 模型卡审计验收 · 2026-11-09 R4 / R5

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
| inputModalities | 326 | 512 | 186 |
| outputModalities | 327 | 496 | 169 |
| totalContextTokens | 224 | 359 | 135 |
| maxOutputTokens | 50 | 186 | 136 |

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
| inputModalities | 983 | 976 | -7 |
| outputModalities | 968 | 967 | -1 |
| totalContextTokens | 534 | 519 | -15 |
| maxOutputTokens | 50 | 186 | 136 |

| catalogVisible 已知字段 | main | head | 差值 |
| --- | --- | --- | --- |
| inputModalities | 834 | 847 | 13 |
| outputModalities | 819 | 838 | 19 |
| totalContextTokens | 411 | 412 | 1 |
| maxOutputTokens | 45 | 159 | 114 |

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
