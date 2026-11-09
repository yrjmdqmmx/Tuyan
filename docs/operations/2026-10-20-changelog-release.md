# Tuyan 4.0 更新日志双站发布

## 授权与范围

用户授权将补全后的 4.0 更新日志发布到两个站点，并明确仅包含本次日志相关改动，保留其他会话修改。

- 发布源码：`40a58947f44b103645b97f23c3b6c318aca6b5c0`，父提交 `1d963ef7bab2a7f093f475361dd42cc7a9ea1855`。
- 原线上版本：`a5cba1d5c2afbf8e59c54d377efe84489d216eaa`；父提交相对线上仅补文档。
- 初次发布提交仅包含 7 个日志相关文件：中英文数据、两份日志测试、维护说明和两份审计记录。
- 60 项变化（28 新增、22 优化、10 修复），77 个英文文案键，14 份公开来源。23 条既有产品记录、4 条生态事件和 190 个既有英文键保持原样。
- 另一个会话的 `WorkspaceModelPanels.jsx`、`workspaceModels.css`、`WorkspaceChannelPicker.jsx` 未进入提交、未被回退；发布前保存只读指纹及本机备份。
- 与原线上版本比较，除 Markdown 外只有两份日志 JSON 和两份日志测试变化，Core/Gateway/模型界面源码相同。

## 发布与验收

[CI 39381782714](https://github.com/yrjmdqmmx/Tuyan/actions/runs/39381782714) 全部成功：

- Core 1,532 / 1,532、Web 1,119 / 1,119、Benchmark 200 / 200；Gateway 194 通过、1 项既有隔离集成常规跳过，独立真实 MongoDB 事务测试 24 / 24 通过，无跳过。
- 类型检查、两站 Web 构建及 Core / Gateway / Plot / Benchmark 四个镜像检查通过。
- 杭州最终回执于 `2026-10-20T07:10:50Z` 报告 `healthy`，源码与发布提交一致，`modelCalls: 0`。回滚备份 `/var/backups/hangzhou-ci-39381782714-1`。内层服务切换回执的 `maintenance_held: true` 为正常中间态，外层接收器完成静态目录和运行配置校验、解除自身维护标记后才发出最终 healthy 回执。
- Pages 随后成功完成；`https://tuyansci.cn/version.json` 与 `https://www.paperbanana.asia/version.json` 均为 `40a58947f44b103645b97f23c3b6c318aca6b5c0`，target 分别为 Hangzhou / GitHub Pages。
- 两入口 `/ready` 均为 `ok: true`，认证、Core、MongoDB、OSS、模型出口及 Benchmark 依赖均 ready。
- Chrome 全新匿名上下文验证两个域名 × 1440 / 390px × 中文 / 英文：60 条正文与已提交 JSON 逐项相同，14 个来源 URL 一致；汇总 28 条、图研分类 15 条，旧记录及 `#v3-8-1` 保留，`#v4-0-0` 直达、分类切换、来源展开正常。
- 四个浏览器上下文均无横向溢出、页面错误、失败资源或意外请求；仅 GET 静态资源及匿名会话读取，不登录、不执行工具、不发起模型调用，不创建或删除原任务。已关闭验收 Chromium。已查看桌面英文与手机中文截图，布局正常。
- 发布期间其他会话新增的本地工作也未进入固定提交。验收时共有 8 个其他会话改动文件，完整状态及哈希留本机；最初三个文件仍与发布前逐字节相同。

其他会话文件（仅记录，未修改）：

- `apps/web/src/workspace/TaskComposer.jsx`
- `apps/web/src/workspace/TaskWorkspace.jsx`
- `apps/web/src/workspace/WorkspaceModelPanels.jsx`
- `apps/web/src/workspace/workspace.css`
- `apps/web/src/workspace/workspaceModels.css`
- `apps/web/tests/workspace-mobile-composer.test.mjs`
- `apps/web/src/workspace/WorkspaceChannelPicker.jsx`
- `apps/web/src/workspace/WorkspacePromptGuide.jsx`

发布沿用既有 `Deploy Hangzhou Production` 门禁，从固定 Git 提交构建，杭州健康后再发布相同源码的 GitHub Pages。没有把带其他会话修改的本机 dist 上传生产。

本机证据：`/Users/a1-6/.codex/artifacts/tuyan-v400-changelog-release-20261020/`。

此次发布回执本身为后续纯文档补记，不重跑部署，不将本机其他修改带入线上。
