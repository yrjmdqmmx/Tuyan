# 按版本更新日志本地验收

2026-09-22，隔离工作树 `model-catalog-channels-20260921`，基线 `0884129`。仅 Web 页面/数据/维护文档变更，无后端契约或数据库迁移。未推送或部署、未充值/推理/重跑历史任务，未上传微信。

## 自动检查

| 检查 | 结果 |
| --- | --- |
| 版本数据及组件专项测试 | 28 / 28 通过 |
| Web 完整测试（包含上述专项） | 501 / 501 通过 |
| Web 生产构建 | 通过；保留既有主包大 chunk 提示，未据此声称移动设备性能达标 |
| Git diff 空白检查 | 通过 |
| 公开历史 commit / 文档目标对象 | 29 个去重目标均可在已获取的 Git 历史中解析；历史文档固定到已在 GitHub main 的 d651519，不链接尚未推送提交 |

数据检查覆盖语义版本数字排序、重复版本、非法与未来日期、未发布不得伪造发布日期、公告日期保留、逐条来源引用、PR不能冒充部署、客户端发布状态隔离、禁止私密地址/账户信息，以及排除论文绘图／论文画布和 OpenAcad。旧批次锚点仍可解析至新版本，不因合并内容丢失入口。

历史事实核验是独立证据层：工作台1.0.0–3.7.1对应Actions/PR核对见历史审计；本地测试只能保证整理数据与页面行为，不能自动证明上线或补齐未知历史。

## 浏览器检查

流程：打开更新日志 → 查看版本与发布状态 → 搜索版本/功能 → 展开来源 → 清空/空结果恢复 → 打开旧锚点 → 移动端更多菜单。

使用现有本地 Vite 预览 `http://127.0.0.1:5177/changelog`，Chrome / Playwright，桌面 1440×1000、移动视口 390×1000 与 320×1000。没有可用的专属 Browser 技能，沿用 frontend-testing-debugging 技能的 Playwright 分支；浏览器依赖已存在，未安装依赖。验收以匿名会话进行，上游仅本地模拟；最终页面错误、外部请求、POST请求均为0。

| 项目 | 结果 |
| --- | --- |
| 直接打开 /changelog、尾斜线、index.html 并刷新 | 标题和主要内容正确，没有框架错误遮罩 |
| 版本分区 | 13个图研版本；仅3.8.0位于待发布区域，无虚构发布日期；7项旧版归属待核实保留 |
| 搜索 | v3.7.1精确命中，3.8.0正文提到3.7.1不会误命中；版本+功能多词、无结果及恢复通过 |
| 证据与日期 | 可展开公共来源；1.0.0公告日期仍在，但发布状态待核实；3.7.1显示已发布Web |
| 旧链接 | #watcha-login滚动到v3-7-1；组件测试另覆盖#reference-budget归并到v3-8-0 |
| 移动布局 | 390px、320px均无横向溢出；搜索可操作；更多顺序仍为工作台、排行榜、更新日志，当前项选中 |

## 证据

产物位于 [/Users/a1-6/.codex/visualizations/2026/09/22/tuyan-version-changelog](/Users/a1-6/.codex/visualizations/2026/09/22/tuyan-version-changelog)，包括可复跑 `qa.mjs`、`checks.json`、测试和构建日志，以及下列截图：

- [桌面3.8.0待发布区域](/Users/a1-6/.codex/visualizations/2026/09/22/tuyan-version-changelog/desktop-380.png)
- [桌面3.7.1精确搜索](/Users/a1-6/.codex/visualizations/2026/09/22/tuyan-version-changelog/desktop-371-search.png)
- [早期历史的待核实状态](/Users/a1-6/.codex/visualizations/2026/09/22/tuyan-version-changelog/desktop-unverified-history.png)
- [390px待发布版](/Users/a1-6/.codex/visualizations/2026/09/22/tuyan-version-changelog/mobile-390-380.png)
- [320px历史版本](/Users/a1-6/.codex/visualizations/2026/09/22/tuyan-version-changelog/mobile-320-371.png)
- [390px更多菜单](/Users/a1-6/.codex/visualizations/2026/09/22/tuyan-version-changelog/mobile-390-more.png)

已查看桌面和窄屏截图，版本号、状态和正文无裁切重叠。长版本内容使用正常页面滚动。初始验收脚本把本地只读 `adminStatus` POST也当成提交而失败，后来以匿名会话重跑；这是验收脚本范围修正，未修改应用权限或隐藏实际提交。

未验收真实 Safari/微信设备，未重新验收生产功能。原有共享导航中的外部入口保持不变；OpenAcad没有进入更新日志内容。3.8.0正式版本必须等后续授权、实际部署及相应端验收后再改为已发布。
