# 2026-10-14 · 期刊规则 v6 本地验证

有效工作树：`/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009`。
分支 `codex/tuyan-v400-workflow-20261009`，HEAD `5e6989f59416e44d9f22fd26703d3830ed861ea7`。在原有脏树增量修改，未创建替代仓库或切回 Desktop。

## 自动化与实际文件

- **Core 49/49**：`node --import tsx --test tests/journal*.test.ts`。包括 v1–v6 版本追溯、规则适用域、人工/未知/冲突政策、原始科研图像能力限制及实际 PNG/SVG/TIFF 检查。
- **15 组 Gateway/Core 完整合成链路**：Frontiers v1/v2/v5/v6；Scientific Reports v3/v4/v6；IEEE、Cell、四本中文刊及新增 Sage Open/HSSC v6。每组 20 次合成模型响应，共 300 次；所有模型响应在本机桩中产生，非预期地址断言拒绝，真实模型调用为 0。
- 每组覆盖规划生成、PNG 精修、原任务期刊与图型继承、重新上传原图哈希绑定、换图/跨账号负例、任务详情与历史、SVG 生成、实际 PNG 和 TIFF 导出。核对文件 SHA-256、像素保持和版本不漂移；不根据客户端伪造规则执行。
- **数据/文件末次检查 14/14**：在最后补入 Cell 官方投稿导航证据后，重跑 `journal-rules-v6.test.ts` 与 `journal-rules.test.ts`。与 49 项集合重叠，不合计为 63。
- **Web 51/51**：`journal-rules.test.mjs`、`refine-source-contract.test.mjs`、`refine-upload.test.mjs`、`figure-restore-privacy.test.mjs`、`rendered-interactions.test.mjs`、`src/lib/refineSource.test.js`。含新刊搜索、确认/取消、线稿设置保存、阶段/用途切换、旧版本保留、生成/精修请求和返回历史快照；原图更换的判断隔离保持。
- Core `npm run check` 与 Web `npm run build` 通过。构建仍有既有的大 chunk 提示，未为本轮变更调整构建配置。

关键反例：

1. Sage 的 1200×600 原生 PNG，在 85 mm 排版宽度下彩色 300 dpi 采样检查通过，800 dpi 线稿检查不满足；转为 TIFF 仍保持原像素，不冒充新增细节。开放的格式建议列表不认证 PNG 或擅自拒绝 PNG。
2. HSSC 初投 180 mm 的相同图片不满足 300 dpi；1 MB 为建议项。录用后单栏 87/88 mm 差异保持 pending，不能静默选一个；审稿 PDF 冲突不影响 PNG/SVG 等已列格式的判断。
3. 含嵌入位图的 SVG 即使格式列表接收，矢量内容/可编辑性仍无法自动认证。字体、线宽、AI 例外适用及科学真实性不因像素或格式通过而改变。
4. 补充图不继承正文 DPI；补充合并文件的大小/包装仍按整体人工核对。已有原始科研图像限制及明确特殊用途禁令保留。

## 失败分类

- 初次 Core 48/49：旧测试把全部规则的核验日期硬编码为 2026-10-13。更新断言为旧规则保持 v5 原日期、新规则用本轮日期，业务行为未改。
- 新增 Web 测试初次 50/51：单元素查询同时匹配规则正文与来源备注，属于测试定位范围问题；改为检查匹配集合。未删去正确的来源信息来让测试通过。
- v5 历史测试显式固定 v5，不随默认版本自动漂移。新增 13 刊列表逐 ID 核对，不以放宽数量断言掩盖遗漏。
- 最终类型复查发现新增测试直接导入无声明的 v5 内部模块，另有可选字段缺少空值保护；改为通过已有类型的公开快照接口读取 v5，并保护可选字段。随后类型检查和上述 14 项重跑通过，没有放宽业务规则。

## 浏览器检查

使用已有 Vite `http://127.0.0.1:5187` 与本地合成后端 `http://127.0.0.1:8797`。只重启已核对进程身份的合成 fixture；注册表返回 `journalRuleVersion=2026-10-14.v6`、`journalExportVersion=1`。未在浏览器启动生成、精修或输入优化。

- Sage Open 可搜索、选择纯线稿，显示 300/800 dpi、EPS 能力边界、两类 AI 操作及官方链接；沿用现有方法框架图。取消后保持“不指定期刊”。
- HSSC 可按全名/简称搜索，切换录用后阶段显示 87/88/180 mm 规则；未错误出现线稿分类控件。
- 390×844 窄屏长刊名换行、列表和详情可操作，正文能滚动到 AI 条件，底部取消/确认始终可达。取消后恢复原选择，临时 viewport 已重置。
- 截图：`sage-desktop.png`、`hssc-mobile.png`、`hssc-mobile-rules.png`；实际界面已目视检查。

## 保留检查与结论边界

修改前记录 4318 个已跟踪及非忽略文件 SHA-256；检查没有文件丢失，v1–v5 规则档案原字节保持，小程序文件不变。原有脏改动保留，未整体覆盖、同步上游、提交、推送或部署。

基线核对同时发现其他会话对 SVG 编辑器/对象树的修改（`SvgEditorCanvas.jsx`、`SvgObjectTree.jsx`、`svgWorkspace.css`、`svgObjects.js`）及新增 `svgLayers.js`、`svg-layers.test.mjs`。这些不属于本轮期刊工作，未回退或覆盖，也不纳入本轮功能验收结论。测试/构建结论限于对应日志运行时的代码状态。

证据目录：
`/Users/a1-6/.codex/visualizations/2026/10/13/01a1331a-22f1-70d0-bbcc-0190e8bdab9f/journal-adaptation/rules-v6/`。
含源码前置哈希、保留清单、初次与最终测试日志、构建/类型检查日志、来源页面文本、截图、合成后端注册表版本。

本地检查证明规则进入任务链路及确定性文件检查。它不证明真实模型绘图质量、科研真实性、HSSC 的例外资格、投稿必然合规或生产通过。Cell Reports 的现行作者指南、历史规格有效性与本刊 AI 适用关系仍未核实，详见[核验记录](rules-v6-verification.md)。小程序继续暂停。
