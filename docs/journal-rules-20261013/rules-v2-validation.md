# 期刊规则 v2 本地验证

日期：2026-10-13；工作树：`/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009`，分支 `codex/tuyan-v400-workflow-20261009`，HEAD `5e6989f59416e44d9f22fd26703d3830ed861ea7`。这是未发布的开发状态，没有线上用户迁移。

## 已通过

| 范围 | 命令 / 结果 | 证明与限制 |
| --- | --- | --- |
| Core 规则与链路 | API 目录 `node --import tsx --test tests/journal-rules.test.ts tests/journal-rules-v2.test.ts tests/journal-integration.test.ts`：20/20 | 真实 Gateway/Core、内存数据库、对象文件；所有提供方回复均为本地模拟 |
| 最后阶段/边界修订 | `journal-rules-v2.test.ts`：8/8 重跑 | 修回制作规则不泄漏到初投；45K 边界和实际像素反例；这 8 项包含在上述 20 项中，不重复累计 |
| Web 定向回归 | `node --import tsx --import ./tests/dom-setup.mjs --test tests/journal-rules.test.mjs tests/figure-restore-privacy.test.mjs tests/refine-source-contract.test.mjs tests/refine-upload.test.mjs tests/rendered-interactions.test.mjs`：44/44 | 实际组件、设置保存、取消、搜索、未知版本、旧任务恢复、精修新图身份与上传、请求传递 |
| 类型 | API `npm run check`：通过 | TypeScript 静态检查 |
| 构建 | Web `npm run build`：通过 | 本地 Vite 产物；保留原有大 chunk 提示，没有部署 |
| 工作区文本 | `git diff --check`：通过 | 不能代替行为测试 |
| Chrome | `http://127.0.0.1:5187/`：IEEE Access / Scientific Reports v2 已实际显示 | 来源、许可待确认、图型复用可见；本轮没有声称完成新的窄屏专项验收 |

共 64 项不重复定向测试通过。v1 和 v2 各运行一次全链路：生成 → 图像精修 → 精修结果 TIFF → 原图重新上传后按任务哈希恢复 → 再次精修/导出 → 历史 → SVG 路径。每版 20 次模拟提供方调用，真实模型调用 0。校验结果绑定实际源文件和导出文件 SHA-256。

旧版归档 SHA-256 与修改前目录一致；v1 历史记录保持旧版来源和状态，新默认选择使用 v2。取消新选择仍保留旧任务。权限、错误材料哈希及明确原始科研图像等负例均在模型调用前失败。

界面回归初次出现两项测试定位问题：重复的政策正文/提示被 `getByText` 当作唯一元素，以及新写历史测试的旧文案与归档不符。分别改为查询状态提示、使用实际 v1 文案；未改变产品行为迎合断言。早期一次测试命令在仓库根目录找不到 tsx，改在已安装依赖的 API 目录执行。它们不计作产品缺陷。

浏览器的 8797 服务是本会话创建的模拟后端，已重启加载 v2；只读 `modelRegistry` 返回 `code:0`、`journalRuleVersion:2026-10-13.v2`、`journalExportVersion:1`。5187 前端已热更新。没有对真实环境执行发布或模型任务。

## 保留核查与证据

本轮开始对 4295 个已跟踪及非忽略文件记录哈希。没有基线文件丢失；`apps/miniprogram/` 全部哈希不变。另一个任务同时修改 SVG 编辑器、结果工作区、文档处理和测试，并新增 SVG 验证文档；这些改动没有回退、重写或纳入本轮期刊实现的完成声明。`SYNC.md` 只追加本轮条目，保留其 SVG 条目。

证据目录：`/Users/a1-6/.codex/visualizations/2026/10/13/01a1331a-22f1-70d0-bbcc-0190e8bdab9f/journal-adaptation/rules-v2/`。

- `baseline-sha256.json` / `preservation.json`：前后差异与小程序保留结果。
- `journal-catalog-v1.original.js`：修改前原件。
- `core-tests.log` / `final-unit-tests.log` / `web-tests.log` / `types.log` / `web-build.log`：本地验证输出。
- `ieee-access-v2-desktop.png`：Chrome 展示截图。
- `Access-Template-2024.docx` / `official-document-sha256.json`：实际下载的官方模板及哈希，来源链接在官方复核记录。

## 未完成的能力

Cell Reports 专刊页面仍无法取得；ACS EPS、IEEE 录用后 PNG 等官方列表差异没有擅自定论；IEEE/SR 的具体生成式图像操作许可仍待确认。字体、线宽、科研真实性、图注、完整补充文件及真实原生细节不由当前文件检查认证。EPS/PDF/JPEG 等导出没有在本轮实现。

本地规则和模拟验证不等于真实模型质量、生产验证或投稿接受。没有付费模型调用、提交、推送、同步上游或部署；小程序继续暂停。
