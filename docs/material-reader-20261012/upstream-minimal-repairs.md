# 上游审计最小修复记录 · 2026-10-12

本轮完成已授权的局部修复。SVG 检查能拦截已知 r7 箭头误判，**不表示 r7 成图质量已经全部通过**。没有重新生成 r7 图、调用付费模型、同步上游、提交、推送或部署。

## 有效基线与范围

- 工作树：`/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009`；分支 `codex/tuyan-v400-workflow-20261009`；HEAD `5e6989f59416e44d9f22fd26703d3830ed861ea7`，未变化。
- 以本轮开始时的全部 4,255 个已跟踪及非忽略未跟踪文件为基线，包含原有脏改动。修改 17 个已有文件，新增 7 个文件（检测器、测试与原始 SVG 测试样本、本文）；其余 4,238 个文件哈希未变，未删除原文件。所有修改前副本与基线 SHA 均一致。
- 小程序继续暂停；工程内小程序文件哈希未变，独立开发者工具目录未写入。暂存区为空，无提交、推送或部署。
- 原审计结论和历史真实调用证据保留；本轮验证包括源码、真实本地渲染、模拟供应商的实际 Gateway/Core 与 Web DOM 链路。**不把模拟调用当真实模型或生产验收。**

## 修复与证据

| 审计项 | 本轮修复 | 验证与限制 |
|---|---|---|
| F01 SVG 质量误判 | 增加声明的箭头标记像素贡献检测：仅对检测副本禁用单个 marker-start/end，使用同一 Resvg、字体与尺寸重渲染，对比 RGBA 像素。结果与 SVG/PNG 哈希绑定，进入渲染和评审阶段。模型 passed 不能覆盖本地问题或覆盖不足；保留原模型字段及 localAccepted。 | 两个原始 r7 SVG 各检出 2 个零可见贡献标记；实际渲染 PNG 与历史保存文件逐字节一致。可见、部分可见、半透明覆盖、继承、transform、viewBox、refX、Unicode、CSS/CDATA、use、检查预算均有对照。不是箭头语义或全部画质证明。 |
| F01 数值评审单位错误 | 为明确提供的 numericReview.checks[].linearScale 重新计算单位尺度与期望坐标；不一致不能通过。SVG 提示要求线性轴提供结构化算式。 | `(800−550)/(40−0)=6.25 px/单位`；62.5 被拒绝。原图 218.75 / 75 像素柱高仍正确对应 35 / 12；没有“修正”本来正确的柱高。字段可选，且坐标/来源由模型提供，尚不是数据真值核验。 |
| F02 完整流程入口 | 普通/专业设置均可选 planner_critic / full；保存当前浏览器选择，历史 demo_full 恢复为 full。修复共享请求适配器把 canonical full 错映射为 planner_critic 的兼容缺口。 | 真正挂载 App，点击、提交、卸载重开、恢复旧任务均验证；Gateway/Core 替身执行 planner→stylist→SVG→review，确实读取完整风格指南。没有恢复新任务 vanilla / 零评审。 |
| F03 旧评估高分兜底 | 无效、缺失、越界及字符串分数返回 null；无效 winner 返回 null；status 为 unevaluable，附维度错误，不聚合不完整维度。有效 0 分保留。 | 实际管理诊断分支替身测试：畸形回复不再变 7 分或 Both are good；有效 pairwise 和 reference-free 保持工作。不因解析失败隐式重试。 |
| F04 材料与 GT 语义 | 旧 evaluateJob 对 model-v1 / 原材料任务在调用前返回 422 / EVALUATION_CONTEXT_UNSUPPORTED。上传图片不再隐含 GT；显式 groundTruthObjectKey 必须属于同任务上传，且 groundTruthConfirmed 必须为 true。 | 拒绝分支模型调用数为 0；普通风格上传走 reference-free；显式确认才做对照。**修正了错误评估行为，未实现完整的新材料评估器。** 诊断结果仍为即时返回，不新增任务评分持久化。 |
| F05 失败结果展示 | 历史 JobTable 有结果 URL 就显示预览、逐张下载和全部下载；保留任务失败、评审问题、任务详情及恢复入口。 | 有部分 SVG 结果的失败卡片显示下载与问题；空结果失败卡片不产生下载入口。既有详情候选进度测试继续通过。 |
| F06/F07 帮助和测试 | 挂载帮助及英文说明更新为两种新流程、强制当前版本检查、最多 R 次修改 / R+1 次检查、材料与检索独立、新任务 SVG 路径及局限。修正三个失效旧测试，并补实际入口、请求与恢复验证。 | Web 39 项通过；保留 legacy 工作流测试，未删掉旧 API 合同测试。普通模式仍固定 1 张/最多 1 次修改，专业模式才配置数量。 |

## 成本、依赖及副作用

- 箭头检测复用已有 `saxes` 与 Resvg，不新增依赖或模型调用。最多 12 个 start/end 声明、累计 16,000,000 对照像素、循环软限 3 秒，仍受现有 worker 15 秒总时限与 256 MiB WASM 上限约束。单次渲染不能被软限中途打断。此次两个 r7 完整离线渲染与检查耗时分别约 135 / 128 ms，只是本机样本。
- CSS marker 规则（含 CDATA）、混合 shorthand/longhand、use/symbol 实例、mid 标记、超出预算等不声称完整覆盖。检测不足会阻止自动通过，复杂 SVG 可能需要人工核查。零像素贡献也可能来自有意重叠或透明样式，不自动认定箭头语义错误、不重写图。
- 当模型判通过、本地否决时停止并保留原图，**不自动追加修订调用**。模型明确提出问题并提供完整方案时，原有修改预算仍按既有合同运行；本轮没有真实执行这些模型分支。
- 完整流程今后由用户选择运行时，每张候选比默认流程增加 1 次主模型风格调用，可能简化细节，不能保证质量提高。
- 新的旧评估返回包含 null / unevaluable；外部管理工具需要处理该返回，而不能直接求平均。没有 Web 正常生成用户界面依赖此管理诊断返回。Mini 及其他端待办记录在 SYNC。
- 本地检测不会回写历史 r7 模型判定或任务库，也未更新线上服务。渐变缺失、科学含义、材料理解/规划完整性及真实模型复审效果仍需要独立验收。

## 本地验证

| 检查 | 结果 | 证据 |
|---|---|---|
| Core：新修复、SVG 工作流/渲染器、数值核对、材料生成与 v400 流程 | 65/65 通过 | [core-regression.log](/Users/a1-6/.codex/visualizations/2026/10/12/01a1301f-211c-7480-9a9b-41bbb8c1e41b/upstream-fixes/core-regression.log) |
| Web：完整流程/历史恢复/失败展示、材料 UI、图库与精修来源合同、设置 | 39/39 通过 | [web-regression.log](/Users/a1-6/.codex/visualizations/2026/10/12/01a1301f-211c-7480-9a9b-41bbb8c1e41b/upstream-fixes/web-regression.log) |
| 共享任务请求 | 30/30 通过 | [shared-tests.log](/Users/a1-6/.codex/visualizations/2026/10/12/01a1301f-211c-7480-9a9b-41bbb8c1e41b/upstream-fixes/shared-tests.log) |
| 最后 SVG 保护与测试类型修正后复核 | 23/23 通过，与上面部分重叠，不重复统计 | [core-final-svg.log](/Users/a1-6/.codex/visualizations/2026/10/12/01a1301f-211c-7480-9a9b-41bbb8c1e41b/upstream-fixes/core-final-svg.log) |
| Core TypeScript、Core/Web 构建 | 通过 | [core-check.log](/Users/a1-6/.codex/visualizations/2026/10/12/01a1301f-211c-7480-9a9b-41bbb8c1e41b/upstream-fixes/core-check.log)、[core-build.log](/Users/a1-6/.codex/visualizations/2026/10/12/01a1301f-211c-7480-9a9b-41bbb8c1e41b/upstream-fixes/core-build.log)、[web-build.log](/Users/a1-6/.codex/visualizations/2026/10/12/01a1301f-211c-7480-9a9b-41bbb8c1e41b/upstream-fixes/web-build.log) |
| 编译后真实渲染冒烟：8MP 中英文/科学符号、字体、哈希、WASM 限制与本地检测模块 | 通过 | [renderer-smoke.log](/Users/a1-6/.codex/visualizations/2026/10/12/01a1301f-211c-7480-9a9b-41bbb8c1e41b/upstream-fixes/renderer-smoke.log) |
| 两个 r7 原图离线重放 | SVG 和历史 PNG 字节均保留，检出 4 个标记 | [r7-marker-replay.json](/Users/a1-6/.codex/visualizations/2026/10/12/01a1301f-211c-7480-9a9b-41bbb8c1e41b/upstream-fixes/r7-marker-replay.json) |
| Web 工作流生成文件一致性（跳过小程序） | `node scripts/sync-workflow.mjs --check --skip-miniprogram` 通过 | 只检查，未同步文件 |

Web 构建仍提示已有大 bundle 警告；本轮未扩展为打包优化。开发过程中的正对照曾检出检测副本空 CSS 声明导致 Resvg 忽略覆盖的问题，已修正并以可见/不可见对照复核；没有用“所有标记都不变”的错误检测结果交付。

## 可定位实现

- 检测器：[apps/paperbanana-api/assets/svg-review/marker-visibility.cjs](</Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009/apps/paperbanana-api/assets/svg-review/marker-visibility.cjs>)；接入与原图保留：[apps/paperbanana-api/runtime/handler.ts](</Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009/apps/paperbanana-api/runtime/handler.ts:6539>)、[apps/paperbanana-api/src/svg-review.ts](</Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009/apps/paperbanana-api/src/svg-review.ts:52>)。
- 数值算式：[packages/api/src/numeric-review.ts](</Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009/packages/api/src/numeric-review.ts:12>)；SVG 提示：[packages/api/src/svg-workflow.ts](</Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009/packages/api/src/svg-workflow.ts>)。
- 完整流程与恢复：[apps/web/src/App.jsx](</Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009/apps/web/src/App.jsx:1479>)、[apps/web/src/lib/workflowSettings.js](</Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009/apps/web/src/lib/workflowSettings.js:7>)；共享转发：[packages/api/src/jobs.js](</Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009/packages/api/src/jobs.js:437>)。
- 旧诊断保护：[apps/paperbanana-api/runtime/handler.ts](</Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009/apps/paperbanana-api/runtime/handler.ts:11561>)；失败卡片：[apps/web/src/components/JobTable.jsx](</Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009/apps/web/src/components/JobTable.jsx:119>)；帮助：[apps/web/src/components/GuidePanel.jsx](</Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009/apps/web/src/components/GuidePanel.jsx>)。
- 回归：[apps/paperbanana-api/tests/upstream-repairs.test.ts](</Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009/apps/paperbanana-api/tests/upstream-repairs.test.ts>)、[apps/paperbanana-api/tests/svg-local-quality.test.ts](</Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009/apps/paperbanana-api/tests/svg-local-quality.test.ts>)、[apps/web/tests/upstream-repairs.test.mjs](</Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009/apps/web/tests/upstream-repairs.test.mjs>)。

本轮差异以修复前脏工作树为比较对象，见 [repair.patch](/Users/a1-6/.codex/visualizations/2026/10/12/01a1301f-211c-7480-9a9b-41bbb8c1e41b/upstream-fixes/repair.patch)，不是把整个历史 dirty diff 当作本轮修改。完整校验见 [preservation.json](/Users/a1-6/.codex/visualizations/2026/10/12/01a1301f-211c-7480-9a9b-41bbb8c1e41b/upstream-fixes/preservation.json)。
