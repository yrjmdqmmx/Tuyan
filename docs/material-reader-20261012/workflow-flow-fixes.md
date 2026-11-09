# 生成流程审计四项修复 — 2026-10-12

工作树：`/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009`；分支 `codex/tuyan-v400-workflow-20261009`；HEAD `5e6989f59416e44d9f22fd26703d3830ed861ea7`。基于本会话上一轮流程审计，按 P-03 → P-01/P-02 → P-04 顺序修改。所有执行均为本地检查、真实本地 SVG 渲染或模拟供应商；没有付费模型调用、提交、推送、部署或上游同步。小程序保持暂停。

完整日志、反例和补丁位于 [本轮离线证据报告](/Users/a1-6/.codex/visualizations/2026/10/12/01a1301f-211c-7480-9a9b-41bbb8c1e41b/workflow-flow-fixes/REPORT.md)。

## 修复结论

| 审计项 | 修复后的行为 | 主要证据 | 成本、兼容与边界 |
|---|---|---|---|
| P-03：定量图以 applicable:false 免检 | 服务端从图型、数据输入、数据面板及精修原任务派生适用性。已知定量任务必须提供非空数值/几何核对，模型自报“不适用”不能通过；流程步骤编号不会自动触发定量门槛。 | [numeric-review.ts](/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009/packages/api/src/numeric-review.ts)、[PNG/SVG/精修接入](/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009/apps/paperbanana-api/runtime/handler.ts)、[单元反例](/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009/apps/paperbanana-api/tests/numeric-review.test.ts) | 无额外模型步骤。只堵住免检；任意自然语言任务中尚未结构化识别的量化意图、模型填写的来源和测量值，仍不能由此独立证明正确。旧路径未被强制升级成 model-v1 数值协议。 |
| P-01：SVG 被隐藏的坏图片模型草稿阻塞 | Web 仅发送必需角色和对应旧字段，本地草稿保留；Core 在校验路由、混合模式、角色思考和所选型号区域前确定执行角色。SVG 主模型路径兼容未使用的坏图片草稿和仅主模型旧字段请求。网关使用同源生成的角色策略。 | [Web 提交](/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009/apps/web/src/lib/modelRouting.js)、[共享角色策略](/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009/packages/api/src/workflow.ts)、[网关](/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009/apps/auth-gateway/src/app.js)、[真实 App 挂载测试](/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009/apps/web/tests/inactive-route-ui.test.mjs) | 没有静默更换执行模型。记录中未使用的角色仍可能保留兼容用的展示标识，不能把它理解为实际调用。全局配置错误仍按原规则校验。旧请求仍可携带全部角色。 |
| P-02：基础生成校验无用辅助视觉草稿 | 旧 vanilla 无参考、无检索、无评审时，只要求实际执行角色。已有参考时继续按主模型真实视觉能力决定直读或辅助观察。 | [Core 角色解析与鉴权](/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009/apps/paperbanana-api/runtime/handler.ts)、[端到端反例](/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009/apps/paperbanana-api/tests/workflow-flow-fixes.test.ts) | 不恢复新 model-v1 的 vanilla/零次检查入口，不减少新流程的最终检查。实际参与执行的自定义/TokenDance 角色仍需授权；伪造 referenceImageMode 不能绕过 Core 登录检查。 |
| P-04：辅助问题被无理由忽略 | 服务端为每个问题及不确定项分配绑定轮次、版本、摘要和当前/原图范围的 ID。主模型逐项返回 accept/reject/unresolved、理由及证据。采纳或未解决会阻止通过；缺项、重复/未知/旧轮次/旧版本/旧摘要 ID 则评审失败。允许有证据的驳回。 | [统一裁决校验](/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009/packages/api/src/review-adjudication.ts)、[裁决反例](/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009/apps/paperbanana-api/tests/review-adjudication.test.ts)、[PNG parser](/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009/packages/api/src/png-workflow.ts)、[SVG parser](/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009/packages/api/src/svg-workflow.ts) | 提示词与回复增加逐项记录，可能略增 token；不增加评审/修改预算，不新增模型调用步骤。无问题的旧观察报告可省略空裁决；不改写历史记录。新增证据可在已有阶段文本与评审记录查看。有效格式并不能保证裁决理由真实。 |

辅助裁决也覆盖已有 SVG 拓扑/组合分支与 model-v1 PNG 精修，精修分批观察的原图使用独立 scope。评审异常保留已生成结果，不冒充 passed；对主模型已判通过但被本地 SVG 检查否决的既有停止规则保持不变。

## 验证层级和结果

- Core 主要回归：**74 项通过**，包括基础/规划评审、SVG、原材料路径、前轮 SVG 离线检查及通用 API 恢复；日志 `core-regression.log`。
- 最后定向复核：**11 项通过**（增加强制数值契约本身要求记录的用例，并复核轮次绑定）。其中集成测试运行 **54 个生成/拒绝场景 + 2 个精修反例**。日志 `acceptance.log`，`integration/results.json` 与失败例请求、阶段和图片可独立复核。
- 旧拓扑/组合、思考配置与恢复专项：**38 项通过**，含与上述集成测试重叠的 1 项；不把不同批次直接相加为独立用例数。日志 `legacy-topology-thinking.log`。
- Web：**45 项通过**，包含实际 App 挂载的隐藏未完成自定义图片草稿、SVG 提交、切回 PNG 后草稿保留、未使用视觉凭据、设置恢复及帮助。日志 `web.log`。网络为替身，不是生产浏览器验收。
- Gateway：**61 项通过**，覆盖路由、游客身份和后端转发。日志 `gateway.log`。新增集成使用真实 Gateway → Core HTTP 组合，同时验证需执行的自定义视觉角色对游客返回 401，零模型调用。
- Core TypeScript 检查、Core/Web 构建、共享工作流同步检查通过。Web 构建仍有已有的大 chunk 提醒。
- 检查没有把模拟回复的“测量”当作独立几何验收。实际模型效果、真实账单、Mongo/OSS、生产和其他客户端未验收。

## 保留与复查

开始前保存了全部 4,262 个受版本管理或未忽略的既有文件的内容及 SHA-256。`before.json` 与 `before-files/` 为本轮起点，`preservation.json` 为最终逐文件核对，`repair.patch` 只表示本轮增量，可以对当前文件做反向 dry-run 检查，不是相对 HEAD 的全部脏改动。未改动小程序文件，未改动基线中的已有证据/报告；没有暂存文件。最终为 20 个既有文件的局部增量和 6 个新增文件；其余 4,242 个既有文件逐字节一致。反向补丁检查通过。

本轮也更新 [SYNC.md](/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009/SYNC.md)、帮助与英文说明。测试中的旧模拟回复补齐新裁决协议；负例仍明确保留漏项和错误回复，未通过降低断言掩盖失败。后续真实验收应在单独授权和可控预算下核对数字几何与观察驳回的事实依据；本轮未执行。
