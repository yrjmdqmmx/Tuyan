# 首页卡片与设置交互发布回执 · 2026-10-21

## 发布版本

- 生产代码：`c99c2b5fe5237ddbd30bf5b72ccf012d594ae746`。
- 实现提交：`e9e60de1`；本地预览样式修复：`c99c2b5f`。
- [Deploy Hangzhou Production / 39547679495](https://github.com/yrjmdqmmx/Tuyan/actions/runs/39547679495)：verify、四个镜像构建、deploy、pages 全部成功。
- 杭州部署完成：2026-10-21 13:28:22（Asia/Shanghai）。随后完成双域名及浏览器检查。
- `https://tuyansci.cn/version.json` 与 `https://www.paperbanana.asia/version.json` 返回相同生产代码 SHA，target 分别为 Hangzhou / GitHub Pages。
- `https://tuyansci.cn/ready` 与 `https://api.paperbanana.asia/ready` 返回 ready，认证、Core、Mongo、对象存储、渠道出口及 Benchmark 检查通过。

## 本轮交付

- 专业模式新任务默认 1 个候选，PNG / SVG 一致；已有任务和用户保存的候选数保持原值。
- 首页扇形模板卡片支持鼠标拖动与手机触摸跟随，按距离和速度吸附切换，不足距离回弹；轻点预览、拖动不误触预览。
- 语言成为设置中的独立页面；退出登录和永久删除账号入口移到账户页顶部，保留原删除确认流程。
- 下拉框箭头统一保留 12px 右侧内距。
- 修复 `home-interactions.html` 本地预览入口缺少生产全局样式的问题：此前裸露的 fieldset / radio、桌面参考图偏好变单列是该预览入口的样式缺失。本次保持生产绘图设置原有布局。

## 验证证据

- 发布 CI：Core 1,547 项、Benchmark 200 项、Web 1,167 项通过；Gateway、真实隔离 Mongo 事务、离线模型并发、混合图流程预检、类型检查及 Web 构建通过。
- 本地相关验证覆盖专业默认值、已有候选 4 保留、拖动与轻点区分、390 / 320 手机布局、账号删除原有确认流程。
- 线上桌面：新任务切换专业后候选数 1；绘图设置参考图偏好仍为双列、生成流程保留卡片样式。已保存实际渲染截图。
- 线上鼠标拖动切换模板，不弹预览；随后轻点当前卡片可以打开对应预览。
- 线上 390×844 手机视口：触摸向左移动 80px 时卡片出现 `is-dragging`，变换包含 `translate3d(-80px, 9.6px, -36px)` 及旋转、缩放；松开从系统与记忆架构切换到多智能体方法框架，无误触预览。
- 线上账户页顶部显示退出登录 / 永久删除账号入口；语言独立页面在桌面和手机视口正常显示。未提交退出、永久删除或语言变更。
- 浏览器捕获的错误日志为空。验收结束已关闭触摸模拟并恢复桌面视口，停留普通模式首页。
- 本轮没有真实模型调用，未实际删除账号或任务；既有首页标语、SVG 自动保存与同任务连续 AI 修改功能沿用已发布基线。

## 回执与回退位置

- 发布回执：`ci-39547679495-1`，状态 healthy，`modelCalls: 0`。
- 服务器备份：`/var/backups/hangzhou-ci-39547679495-1`。
- Web 发布目录：`/opt/tuyan-entry/releases/ci-39547679495-1-c99c2b5fe523/web`。
- 本机证据目录：`/Users/a1-6/.codex/artifacts/tuyan-deck-settings-20261021/release/`，包含 CI 最终状态、日志、部署回执及桌面 / 手机截图。
- 本文与 SYNC 的后续记录提交仅更新文档；生产代码版本仍为上面的 `c99c2b5f`。
