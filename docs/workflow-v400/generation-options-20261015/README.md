# 4.0 生成流程选项调整 · 2026-10-15

用户明确指定开发中的 4.0，快速生成保留评审。只改 Web，正式域名入口、小程序、Core、期刊规则与模型目录均未修改或部署。

- 页面只显示“快速生成 / 完整生成”，教程、普通模式摘要和英文名称同步。
- 快速生成仍提交 planner_critic，保留规划、绘制、当前版本评审及按需修改；省去风格整理。完整生成仍提交 full。
- 普通与专业模式默认 full；旧版本浏览器流程偏好迁移到 full，保留候选数、修改次数、视觉偏好。更新后的手动选择仍会保存与恢复。
- 本地偏好键保留 tuyan.workflow-settings.v1，内部 version 更新为 2；这不是服务端 API 或任务合同变更。历史任务依然可按现有恢复流程明确复用。

验证：8 条本次定向回归通过、Web 构建通过，浏览器检查普通/专业默认完整生成、快速选项刷新持久化及两项说明；无模型调用。更广的相关测试为 28/29，其中“disabled vision drafts have no credential, probe or custom extension requirement and are retained”有既有失败：当前路由逻辑从提交中剔除停用视觉角色，但旧断言要求结果仍包含该角色。使用本次修改前的测试原文复现；未改该断言或相关模型路由逻辑。

构建仅有现有大 chunk 提示。未提交、推送或部署；不代表模型效果或生产验收。session-only.patch 记录本轮相对已有脏文件的增量，仅供审阅，不自动应用。

本地预览 http://127.0.0.1:5186/ 使用只读模拟 API http://127.0.0.1:8793，模拟 API 拒绝生成任务与账号操作。截图 workflow-options.jpg 为真实浏览器界面。

## 视觉路由旧断言修复 · 2026-10-15

按用户后续指令复现并核查上述失败，结论是测试断言过时，当前实现正确。`visionMode: none` 表示不使用独立视觉角色；草稿留在前端状态与本地存储，生成请求不携带该路由、旧版 `referenceVisionModelName` 字段或该角色专属凭据，也不探测停用模型。成图评审仍由主模型执行。

证据：Web 的 `buildModelSubmission` 按任务所需角色构造请求，不修改原始草稿；App 独立保存完整模型选择；Core 的 `resolveModelRouting` 将停用视觉角色排除在执行和凭据验证之外。现有 App 集成测试同时验证提交省略视觉路由、本地存储保留选择及页面重建后的视觉偏好恢复。

本轮仅修正 `apps/web/src/lib/workflowSettings.test.js` 中的断言，并新增启用视觉角色的对照测试：生成和精修均须验证完整模型选择、通用 API 与扩展支持，通过后应提交视觉路由和模型名。未修改 Web 或后端运行实现，也未覆盖其他会话的改动。

本轮验证：

- Web 相关五文件 **30/30 通过**，见 `vision-route-web-tests.log`。包含原失败项、启用视觉角色的对照、草稿持久化和普通/专业生成选项回归。
- Core/Gateway 本地模拟 **3/3 通过**，见 `vision-route-core-tests.log`。覆盖主模型识图能力与视觉开关的组合，以及无效停用视觉草稿不触发独立观察调用或凭据要求。
- 测试使用模拟提供商，真实模型调用为 0；没有重新部署、提交或推送。以上是本地契约与回归验证，不等于真实模型效果或生产验收。

复现命令（各自在对应目录执行）：

```sh
# apps/web
node --import tsx --import ./tests/dom-setup.mjs --test src/lib/workflowSettings.test.js tests/guide-refresh.test.mjs tests/inactive-route-ui.test.mjs tests/upstream-repairs.test.mjs tests/workflow-v400-ui.test.mjs
# apps/paperbanana-api
node --import tsx --test --test-name-pattern='workflow boundaries|all main capability|disabled observer' tests/workflow-v400.test.ts
```

此前 `related-tests.log` 与 `existing-assertion-failure.log` 保留为修复前记录；`session-only.patch` 仍仅对应上一轮生成选项修改，未包含本轮测试修复。
