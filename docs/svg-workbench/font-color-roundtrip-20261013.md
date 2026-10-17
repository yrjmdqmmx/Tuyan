# 四份真实 SVG：字体、字距与色彩复测

2026-10-13。有效工作树 `tuyan-v400-workflow-20261009`，分支 `codex/tuyan-v400-workflow-20261009`，HEAD `5e6989f59416e44d9f22fd26703d3830ed861ea7`。

结论：修复网页样式继承到 SVG 的问题，新增字体名探测、批量选择文字、字重/字形/字距/词距编辑。四份既有 SVG 的编辑稿使用本机两端可用字体后，文字宽度差异显著缩小。原件不变、文字未转曲，浏览器保存重开和导出一致；Inkscape 保存重开后渲染一致。仍不承诺任意字体、任意 SVG 或跨软件逐像素一致。

## 实际根因与修复

1. **Shadow DOM 仍继承应用字体设置。** 网页根样式的 `font-synthesis:none`、`text-rendering:optimizeLegibility` 会进入旧画布。现在在 SVG 外层 shadow host 上重置继承，保留 SVG 自身的字体、字重、字号、颜色和排版属性。没有把 reset 写到 SVG 根元素上覆盖原件声明。浏览器复核为 `font-synthesis:weight style small-caps`、`text-rendering:auto`，与独立 SVG 的默认环境一致。[CSS all 的适用范围](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/all)
2. **缺失字体使两端使用不同回退。** 本机没有样本声明的 Noto 字体；Chrome 实际字体接口显示渐变图使用 `PingFangSC-Regular`。Inkscape 自带 Fontconfig 配置对缺失的 Noto 匹配 Verdana；该图实际 PDF 字体资源也确认 Verdana / HiraginoSansGB-W3。此 Inkscape 配置也找不到浏览器可用的苹方，不能用“macOS 有此字体”推断 Inkscape 能用。
3. **编辑器原来只有字体和字号，难以处理字距问题。** 现在支持选择全部文字并设置字体，保留独立 tspan；增加字重、正体/斜体、字距和词距。明确选择的字体会写入各个文字片段，避免子 tspan 的原覆盖继续生效；透明度仍只对顶层选中对象应用，防止嵌套片段重复相乘。
4. **字体可定位与完整兼容分开说明。** `FontFace(local(...))` 仅探测本地名字，不下载字体；缺失名字会提示，未自动替换。探测不保证全部字符覆盖、各字重可用或 Inkscape 的字体环境。导出继续不嵌入字体。

代码仅涉及 Web 的 `SvgEditorCanvas.jsx`、`svgWorkspace.css`、新增 `svgTypography.js` 和 `svg-workspace.test.mjs`。没有后端/共享契约变化，无需新增 SYNC 项。

## 四图操作和一致性

本轮沿用[上一轮四份真实文件及来源哈希](./real-corpus-roundtrip-20261013.md)，在上一轮浏览器编辑稿上继续测试，不生成新素材。

证据目录：

`/Users/a1-6/.codex/visualizations/2026/10/13/01a1342b-d103-7102-b88e-beffa957f764/svg-font-color-round3`

- `before/`：上一轮实际导出稿的完整副本。
- `after/*-export.svg`：本轮在图研点击导出得到的实际下载文件。
- `inkscape-saved/`：Inkscape 1.4.4 另存的 Plain SVG 副本，未指定转曲选项。
- `renders/`：两端同尺寸渲染 PNG；Inkscape 再次读取其保存的 SVG 渲染结果。
- `final-workbench.jpg`：真实浏览器画布及字体属性界面；`four-svg-browser-inkscape.png`：四图对照。

四图在工作台分别选择全部文字，指定现有字体栈 `Liberation Sans, WenQuanYi Micro Hei, STIX Two Math, sans-serif`。逐一将字距改为 `0.5px`，撤销、重做，再撤销回原字距，保存并导出。刷新页面后通过“重新打开草稿”恢复任务，切换四个候选：画布 XML 均与刷新前逐字节一致。实际下载文件与画布 XML 结构 4/4 一致。撤销历史仍只在当前页面会话保留。

此字体栈只是这台机器的验收选择，没有成为所有用户的默认字体，没有安装、复制或分发字体。四份最终编辑稿与本轮开始时的编辑稿相比，**仅改变 font-family**；字重、字号、文本内容、源数据、数值标签、几何、颜色和渐变完全未改。四份最初生成原件的 SHA-256 全部不变。

| 样本 | 保留结构 | 保存与外部结果 |
| --- | --- | --- |
| chinese-tspan | 6 text、2 tspan、1 marker；中文、μ ± σ、Δx/x 下标 | 浏览器恢复/导出一致；Inkscape 保存后重读渲染逐像素一致 |
| chinese-groups | 6 text、6 g、1 marker；α ≤ β、Unicode 下标、包装组变换 | 同上，分组和箭头保持 |
| gradient-groups | 14 text、2 g、1 linearGradient、1 marker；Δ、斜体标签 | 同上，共享渐变仍是一份定义 |
| nested-workflow-bar | 22 text、58 g、13 path、2 marker、1 clipPath | 同上，中文粗体、嵌套图、箭头及数据图结构保留 |

本轮浏览器四图均实际操作。外部四图的另存/重新读取通过 Inkscape 官方 CLI 执行并逐张查看实际渲染对照；原生 GUI 另核第一张中文/数学文本的独立文字光标和属性。没有把本轮概括为四张都重新完成原生 GUI 改字。上一轮四张原生 GUI 改字/另存/重开的证据仍独立保留。

Inkscape 整理了 chinese-tspan 的标签间缩进空白，原始 `textContent` 字符串因此不完全相同，但非空白文字片段、两个 tspan、dy 下标位置均保留；该文件保存前后的 Inkscape 渲染逐像素相同。没有将这一格式化变化冒称为字节级无损。

## 字体和字距结果

Chrome 实际字体读取使用 CDP `CSS.getPlatformFontsForNode`，不是仅查看 CSS family 名字。修改后四图实际使用 LiberationSans、WenQuanYiMicroHei，并保留需要的 LiberationSans-Italic / Bold。Inkscape 的 PDF 字体资源确认相应实际字体；第四图的合成字形子集由 Cairo 命名，不能从子集名推断所有字重渲染完全相同。

以下抽查来自渐变图；Chrome `getComputedTextLength` 与 Inkscape 生成 PDF 中的文本宽度（换算回 SVG 单位）对照：

| 文字 | 修改前宽度差 | 共同字体后宽度差 |
| --- | ---: | ---: |
| Input | 9.7551 | 0.0056 |
| Output | 6.7366 | 0.0072 |
| Alpha | 3.9862 | 0.0009 |
| Beta | 2.3401 | 0.0035 |

这是四个标签的实测，不代表所有文字组合都达到该精度。中文与数学符号、上下标位置也做了图像检查；尚有抗锯齿、细笔画和合成粗体差异。这里验证普通 Unicode 文字和上下标，不包含 LaTeX 公式排版编辑器。

字体资源诊断中的 3 份旧字体 PDF 被 Poppler 判定缺少有效尾部；它们未用于宽度对比或 PDF 交付声明。渐变样本的前后 PDF 均可读，四份新字体 PDF 均可读。此辅助诊断不构成对任意 PDF 输出的验收。

## 色调结果

不能直接比较两种屏幕截图的 RGB 来补偿 SVG 颜色：本次截图工具给出的文件实际是 JPEG，浏览器截图无 ICC 标签，Inkscape 原生截图带 `Display` ICC。它们还有缩放和 JPEG 压缩因素。已将截图扩展名改为 `.jpg`，没有改写 SVG 色值。

颜色对比改用相同 SVG、相同尺寸、白底的浏览器实际 SVG 图像渲染与 Inkscape PNG：

- 原有纯色主色值一致，例如数据柱 `#4A90E2`、流程图 `#487968`、浅蓝填充 `#E3F2FD`。
- 渐变内部 9 个取样点，每个 RGB 通道差异为 0 或 1（8 bit，最大 1/255）；色标、位置、引用均不变。
- 同一 Inkscape 保存前/保存后重开的四图渲染均逐像素相同。
- 两种不同渲染器仍非逐像素相同，主要差异集中在文字/边缘。本轮没有为迁就截图去修改色调、转换文字或生成替代位图。

`pixel-diff.json` 保留全图均值差异作为辅助指标。图中留白很多，此数值不能单独当作外观或质量评分。

## VectorCraft 的功能是否都在图研中

**没有。当前图研是保留原生 SVG 的基础对象编辑层，尚未接入完整 VectorCraft 引擎。** 一些现有工具随选中对象出现或在折叠区内，另一些功能确实尚未实现。

| 功能 | 图研当前情况 |
| --- | --- |
| 选中、移动、缩放、旋转、多选、撤销、保存 | 已有；属性区按选择显示，40 个历史快照上限 |
| 中文/数学文字、字体字号、颜色对齐 | 已有；本轮补上字重、字形、字距、词距、全部文字选择与字体提示 |
| 简单箭头、填充/描边/透明度、已有渐变色标 | 已有；不等于任意箭头造型或完整渐变编辑器 |
| 分组、取消分组、对齐、分布、置顶/置底 | 已有；带样式表的组拆合仍拒绝，以免改变选择器语义 |
| 图层/对象树、锁定/隐藏、复制/删除、新增基本图形 | 尚未提供完整操作面板；目前主要修改已生成对象 |
| 钢笔、曲率/贝塞尔节点、画笔、橡皮、吸管、路径布尔运算 | 尚未实现 |
| 网格/参考线/吸附、画板管理、符号库、图案、渐变网格 | 尚未实现；相关 SVG 结构的保留不等于有参数编辑器 |
| 裁剪、蒙版、路径文字和复杂富文本排版 | 部分结构可以保留；没有完整编辑工具 |

VectorCraft 固定源码 `0d0ea352df99044589a7ce0efc7004f7a5b6b7c0` 的 tools 目录存在 pen/direct/curvature/shape/text/gradient/eyedropper 等实际实现，但没有在本轮逐项验收其功能。其[菜单代码](https://github.com/storytold/vectorcraft/blob/0d0ea352df99044589a7ce0efc7004f7a5b6b7c0/crates/ui-egui/src/menus.rs#L1)明确说明未实现项以禁用形式展示，并包含 `Item::Todo`；拼写检查、部分库入口、光学边距、字形吸附、SVG Interactivity 等仍有占位。因此截图中“有入口”也不等于 VectorCraft 自己全部完成。

若要把图研做到更完整，优先项应是对象/图层列表、复制删除与新增文字/形状、明确的图形控制点和更好找的属性入口。完整钢笔、复杂排版、路径布尔等需要独立设计与兼容测试，不能只复制侧栏图标。Rust/WASM + egui 的完整 VectorCraft 需要专用嵌入、文档/命令/历史/选择事件/只读/IME 接口；之前实际导入还会改写 marker 等结构。当前没有复制其代码、素材、字体或品牌。

## 验证与保留边界

- `tests/svg-workspace.test.mjs`：16/16 通过，含批量 tspan 字体/间距、透明度不重复合成、本地字体探测；`tests-svg.log`。
- 移动工作台与材料工作流 UI：10/10 通过，含 SVG/PNG 切换保持模型选择；`tests-web-regression.log`。
- 最后修改后 Web build 成功，保留原有大包体提示；`build.log`。当前验收浏览器 error/warn 日志为空。
- 起始 3108 个脏文件没有缺失。期刊相关文件与 SYNC 在过程中有并发变化，本会话没有编辑、覆盖或回滚；见 `preservation-audit.json`。
- 4 份原件不变；改稿仅改变 font-family，见 `source-and-edit-scope.json`。没有任何新付费/真实模型调用、提交、推送、部署、上游同步或旧补丁应用；小程序继续暂停。
- 本轮 4 份样本没有嵌入位图，不能宣称覆盖了新的真实图片嵌入场景。字体跨机器可用性、完整数学排版、任意复杂 SVG、云端草稿持久化、真实模型效果、费用和生产链路仍未由本轮验收证明。
