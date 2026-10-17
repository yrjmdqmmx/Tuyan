# 完整流程与精修四项修复

2026-10-13，本地实现与离线验证完成。有效工作树 `/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009`，分支 `codex/tuyan-v400-workflow-20261009`，HEAD `5e6989f59416e44d9f22fd26703d3830ed861ea7`。在既有脏改动上作局部修改，未整体覆盖、同步上游、调用付费模型、提交、推送或部署。

| 审计项 | 修复后的行为 | 实现与证据 |
|---|---|---|
| F-01 精修评审缺证据 | 原图、辅助图、遮罩的送审顺序/hash与当前编辑约束贯穿规划和独立评审。单次放不下时按原角色分批观察，保留各批来源及不确定项。结构化对象/属性/关系/保留要求、遮罩和参考用途必须逐项返回 `editChecks`；漏项、重复/过期编号、空证据不能通过，uncertain/issues_found 阻止通过。无额外约束的精修不强加新回复字段。 | [精修执行](/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009/apps/paperbanana-api/runtime/handler.ts:7031)、[派生要求与核对](/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009/packages/api/src/refine-review.ts:1)、[与现有评审门槛组合](/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009/packages/api/src/png-workflow.ts:37)。新矩阵覆盖直接/辅助两种模式、同批/单图分批、缺核对、未解决问题、hash 与实际送审字节对应。 |
| F-02 辅助视觉材料页未分批 | 所有页先按实际单图/数量/总字节限制规划批次，任何单页不可提交就停止，不丢页。各批保存 `vision_batch_received`、原页 hash 与实际提交 hash；只有全部完成后才形成材料读取结果。原 12 页图/阶段、16 次工具决策和文字预算保留；辅助观察文字也计入预算。 | [有界分批](/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009/apps/paperbanana-api/src/image-evidence.ts:1)、[材料代理](/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009/apps/paperbanana-api/src/material-agent.ts:15)、handler 的 `readTaskMaterials`。单图辅助视觉完整/精修都读完 PDF 第 1、3 页，两个阶段共 4 批；第二批失败不生成图、不记录理解完成。 |
| F-03 材料观察漏掉本次修改 | 主模型材料读取、同主模型分批及辅助视觉分批共用原任务、当前 editInstruction、图注、图型、阶段计划/核查上下文；明确当前编辑要求优先，文件内容仅作证据。 | handler 的 `materialTask` 与页图观察请求。原图上传场景下，两个材料阶段的实际模型出站请求均含 `CURRENT_EDIT_ONLY` 测试指令。 |
| F-04 风格阶段接受无效非空方案 | 新 model-v1 风格回复使用 ready/needs_input、missingInputs、完整 plan 协议。保留原始风格回复后校验，再替换可执行方案；缺材料、非 JSON、空方案、无需修改占位符均在绘图前阻断，已发生调用与本地校验失败正确区分。结构化 plan 保留嵌套事实。旧纯文字风格接口保留原行为。 | [方案校验](/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009/apps/paperbanana-api/src/material-plan.ts:6)、[风格步骤](/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009/apps/paperbanana-api/runtime/handler.ts:6975)。完整 PNG/SVG 常规 8 组合通过；3 类风格异常均无绘图请求；无异常格式修复调用或静默回退。 |
| T-01 旧回归桩失效 | 定量材料测试采用明确标为模拟的合法逐项数值回复，恢复全部材料/格式/检索/精修矩阵执行；另保留数值免检负例，不放松产品门槛。相关风格桩改为新结构，精修顺序断言检查带 hash 的实际输入身份。 | [原文件全链路](/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009/apps/paperbanana-api/tests/original-material-workflow.test.ts:29)、[模拟数值回复边界](/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009/apps/paperbanana-api/tests/helpers/material-review-fixture.ts:1)。模拟数值回复只用于检查协议和流程，不声称已测量 mock 图片的几何。 |

新增/更新的回归包括 [完整 Gateway/Core 矩阵](/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009/apps/paperbanana-api/tests/full-refine-flow-fixes.test.ts:1)、[编辑约束与分批反例](/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009/apps/paperbanana-api/tests/refine-review.test.ts:1)、[材料代理反例](/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009/apps/paperbanana-api/tests/material-agent.test.ts:1)、[风格解析反例](/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009/apps/paperbanana-api/tests/material-plan.test.ts:1)。帮助及英文文案说明分批可能增加调用、证据不足不通过和风格校验的停止条件；SYNC 已登记共享变化，小程序保持暂停。

## 验证

| 检查 | 结果 / 日志 |
|---|---|
| 原材料、格式/检索、上游修复及基础读取/方案 | 16/16；[日志](/Users/a1-6/.codex/visualizations/2026/10/12/01a1301f-211c-7480-9a9b-41bbb8c1e41b/full-refine-flow-fixes/initial-regression-corrected.log)。包含原先失败的 PDF/PPTX/精修全链路测试，现在完整执行通过。 |
| 新门槛、分批、材料失败与风格校验 | 17/17；[日志](/Users/a1-6/.codex/visualizations/2026/10/12/01a1301f-211c-7480-9a9b-41bbb8c1e41b/full-refine-flow-fixes/new-regressions.log)。与前组部分重叠，不相加宣称独立用例数。 |
| 最终完整/精修矩阵 | 1 个集成测试包含 **27 个场景**；全部满足预期，包括预期失败和不通过状态。[最终日志](/Users/a1-6/.codex/visualizations/2026/10/12/01a1301f-211c-7480-9a9b-41bbb8c1e41b/full-refine-flow-fixes/final-matrix.log)、[逐场景请求/结果](/Users/a1-6/.codex/visualizations/2026/10/12/01a1301f-211c-7480-9a9b-41bbb8c1e41b/full-refine-flow-fixes/integration/results.json)。只有基础设施及供应商响应被模拟，Gateway/Core、原始材料解析、SVG/PNG处理和请求构造实际执行。 |
| 既有精修接口、恢复、不确定调用、PNG/SVG/数值/逐项裁决/材料生命周期 | 首轮 95 项中 94 通过，发现新 JSON 观察校验误施加到旧纯文字精修。已修复兼容边界，并完整复跑受影响的旧流程 22 项，22/22 通过；其余 73 项已通过。[首轮保留日志](/Users/a1-6/.codex/visualizations/2026/10/12/01a1301f-211c-7480-9a9b-41bbb8c1e41b/full-refine-flow-fixes/related-regressions.log)、[最终旧流程日志](/Users/a1-6/.codex/visualizations/2026/10/12/01a1301f-211c-7480-9a9b-41bbb8c1e41b/full-refine-flow-fixes/legacy-workflow-final.log)。新路径非法初始观察仍明确阻断，已加入最终矩阵反例。 |
| Web 定向测试 | 17/17；[日志](/Users/a1-6/.codex/visualizations/2026/10/12/01a1301f-211c-7480-9a9b-41bbb8c1e41b/full-refine-flow-fixes/web-tests.log)。材料/精修入口、帮助、数值精修边界及结果展示。 |
| 类型、构建、共享生成物 | Core TypeScript、Core build、Web build 通过；`sync-workflow.mjs --check --skip-miniprogram` 无漂移；Git diff 空白检查通过。[类型](/Users/a1-6/.codex/visualizations/2026/10/12/01a1301f-211c-7480-9a9b-41bbb8c1e41b/full-refine-flow-fixes/final-typecheck.log)、[Core构建](/Users/a1-6/.codex/visualizations/2026/10/12/01a1301f-211c-7480-9a9b-41bbb8c1e41b/full-refine-flow-fixes/core-build.log)、[Web构建](/Users/a1-6/.codex/visualizations/2026/10/12/01a1301f-211c-7480-9a9b-41bbb8c1e41b/full-refine-flow-fixes/web-build.log)。Web 仍有既有 bundle 大小警告。 |

## 成本、边界与保留核查

- 未增加绘制/修改轮数。模型单次容量不足时，材料页与精修输入的分批观察会增加真实运行时的观察调用，受输入额度和原阶段预算约束；帮助已说明。无效风格结果不追加格式纠正调用。
- 精修无额外控制时保持现有评审回复合同；旧非 model-v1 精修的纯文字观察继续兼容，新材料任务仍要求结构化观察。没有恢复已移除的逐文件用途表单；当前 Web 统一材料入口保持原设计，旧 reference 接口证据也得到修复。
- 27 个场景的模型回复全部为确定性桩；本轮不证明真实模型理解、数值测量或成图质量，也未验收真实 Mongo/OSS/登录/生产。既有持久恢复用例通过，但跨本次代码版本的旧未完成任务没有生产验收。
- [保留核查](/Users/a1-6/.codex/visualizations/2026/10/12/01a1301f-211c-7480-9a9b-41bbb8c1e41b/full-refine-flow-fixes/preservation.json)、[相对本轮开始的局部补丁](/Users/a1-6/.codex/visualizations/2026/10/12/01a1301f-211c-7480-9a9b-41bbb8c1e41b/full-refine-flow-fixes/repair.patch)。所有既有文件均保留；修改仅限该修复、测试、帮助、SYNC 与报告。暂存区为空，HEAD/分支不变，小程序文件不变。
