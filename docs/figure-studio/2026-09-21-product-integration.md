# 论文画布：产品一致性与共享能力

本轮在独立分支 `codex/figure-studio-20260921` 完成，本地验证，不包含发布或付费推理。

## 同步与分支

核对来源：隔壁“恢复 Tuyan 会话交接”的最终回复、Git 远程、PR #224 和其发布记录。结束前重新 fetch，main 仍为 `0d8b0b4500eb9ca6d8b1b5180450276c7f78b2fb`。

| 工作 | 核对结果 |
| --- | --- |
| 目录渠道/版本映射，排行榜双语和筛选 | PR #224 已合入 main；隔壁记录 Web/Core 已发布该 SHA |
| `codex/model-catalog-channels-20260921` / `4ae4bd5` | 旧独立分支保留；相应内容已包含在 #224 |
| `codex/leaderboard-i18n-filters-20260921` / `241a11e` | 分支仍存在；完整 tree 与 main `0d8b0b4` 一致。不能仅因 squash 后非祖先就判断遗漏 |
| 原图稿实现 `0374995` | 仍在本分支；merge `9ebba0f` 已接入最新 main，无 rebase 或覆盖其他工作树 |
| 本轮论文画布调整 | 独立分支内完成，尚未合入 main 或部署 |

目录与排行榜旧 SYNC 条目保留历史，本轮在顶部补充最新状态。微信平台上传/审核不是此次 Web/Core 发布的一部分。

## 名称与组件复用

采用“论文画布”，英文 Figure Canvas。标题、导航、移动副标题、加载和登录返回文案统一，地址保留 `/figure-studio/`。

| 能力 | 复用与必要适配 |
| --- | --- |
| 顶部导航 | WorkbenchHeader；桌面同级入口、手机公共“更多”菜单，保留排行榜双语支持 |
| 视觉 | 全站 paper/surface/ink/sage/accent、字号与圆角变量；公共 field、primary-button；对象自身配色不受 UI 主题影响 |
| 弹窗 | AccessibleDialog、GenerationSettingsDrawer，以及已有联系/反馈/小程序/智能体/账号弹窗。画布 CSS 只约束其专属控件 |
| 账号 | useAuthSession；独立页面和排行榜用 SitePageShell / SiteSessionProvider，共用 AuthPanel / AccountSettingsDialog。刷新、退出、切换账号后旧响应不能恢复会话 |
| 模型目录 | 提取工作台现有 loadPresentedModelRegistry，继续调用共享 health/modelRegistry，沿用厂商、版本、停用、排序与区域元数据；无平行静态列表 |
| 模型选择 | 同一 ModelPicker 和设置抽屉。画布只需主文本模型；按服务端支持范围过滤，不改工作台主/图像/识图三角色配置 |
| 渠道 Key | 抽出 NativeCredentialFields，双方复用字段、帮助和 MiniMax 区域选择。按区域与账号隔离，刷新或退出清除；切换画布页签不丢当前会话缓存 |
| 请求 | 画布薄适配调用 @paperbanana/api 的 figureStudioRequest，共用 fetchJson、凭据和错误。768 KiB 预检发生在发送前；支持 AbortSignal，不自动重试付费调用 |

## 保留的差异

- 画布源稿是对象文档；现有工作台是候选图/任务流程。源稿仍本机保存与下载，不声称账号云同步。接入已有对象存储还需要源稿版本、所有权与冲突处理契约。
- 两页面复用选择器和目录，但不复制或隐式迁移当前路线/Key。新画布由作者明确选择主模型，避免工作台的图像角色或旧选择意外触发不同渠道。
- 图稿服务当前只接受受支持渠道的用户自带 Key。观猹需接其账户授权和计费路径；通用 API 需承接连接绑定、协议/地址校验及未知结果恢复，不能仅显示入口便宣布支持。
- 手机本阶段支持源稿打开、预览、规则查看和导出；对象编辑保留宽屏模式。
- PDF/EPS 的已知 Inkscape 分组/文字合并和字体兼容限制延续前轮记录，本轮未扩大“可编辑”承诺。

## 验证

- Web 全量 **518/518**；共享 API 全量 **665/665**；生产 build 通过（既有大 chunk 警告仍在）；目录 v21 **760 项无漂移**。
- 新增实际 Editor + ModelSettings 的 A→B、A→退出→B 测试：重选渠道/地区不恢复旧 Key；缺 Key 不发送规划，新账号请求只携带自己的合成 Key。晚到能力/模型结果、请求取消信号与源稿保留另有覆盖。
- 浏览器实测桌面 1440×1000、手机 390×844：双向导航、公共模型抽屉/选择弹窗、公共登录提示/联系弹窗、文字单独修改与撤销重做、本机恢复、规则查看、SVG 下载与实际字节报告。手机导出面板实际宽 358px，左右 16px，报告也无内部横向溢出。
- 原工作台的普通/专业/通用 API 设置和精修入口正常呈现；原方法、图注、默认 ID 保留。未点击生成、上传或发送反馈。
- 本地 Vite 未连接登录/Core 后端：页面显示服务不可用，真实登录、目录网络、计费推理和网络 PDF/EPS 不能据此标记通过。相关请求行为以模拟集成测试验证。
- 本地截图与日志：`/Users/a1-6/.codex/visualizations/2026/09/21/tuyan-figure-ui-unification/`。
