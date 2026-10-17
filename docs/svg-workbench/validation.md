# SVG 生成与直接编辑：实现和本地验证

后续实测：[4 份既有真实 SVG 第二轮往返验收及两项修复](./real-corpus-roundtrip-20261013.md)。

字体与色彩复测：[继承样式修复、四图字体/字距对照及 VectorCraft 功能差距](./font-color-roundtrip-20261013.md)。

日期：2026-10-13。开发树：`tuyan-v400-workflow-20261009`，分支 `codex/tuyan-v400-workflow-20261009`，起始和结束 HEAD 均为 `5e6989f59416e44d9f22fd26703d3830ed861ea7`。尚未提交、推送或部署。

结论：现有 Web 生成结果区已接入原生 SVG 文档编辑。已用本地模拟任务、图研已有 SVG 和补充兼容性夹具实际完成生成阶段展示、直接编辑、保存重开、SVG 导出及 Inkscape 交叉检查。未调用真实或付费模型；这些结果不证明真实生成质量、科研正确性或生产通过。

## 技术核查与选择

### 实时输出的实际边界

- `apps/paperbanana-api/runtime/handler.ts` 的 `runSvgCandidate` 在每版 SVG 完成后，先保存 `svg_source` 文件阶段，再进入评审；自动修订产生下一份真实文件。最终结果另有文件及其评审记录。
- 当前模型请求与 `parseModelResponseText` 等适配层等待完整响应；部分路径显式设置 `stream = false`，SSE 响应也先读完再解析。前端沿用任务轮询，没有模型 token → 浏览器的增量传输接口。
- 因此画布展示的是服务器真实产生的完整 v1/v2 等版本，不播放完成后模拟绘制动画，也不宣称逐字流式生成。材料读取、规划阶段展示实际阶段记录；无图时保持空白画布。
- 新版本不完整、缺少 defs 引用、请求失败或包含危险内容时，保留上一份可显示版本。任务失败或取消后保留中间版本并开放编辑，明确标记未完成。
- 没有新增后端任务字段或传输契约。若以后要逐片段生成，仍需适配器流式事件、任务存储/重连与前端安全增量提交机制，不能仅加前端动画。

### VectorCraft 源码和实际往返结果

检查的是 [VectorCraft 固定提交](https://github.com/storytold/vectorcraft/tree/0d0ea352df99044589a7ce0efc7004f7a5b6b7c0)，不是仅依据 README。

| 项目 | 实际发现 | 对图研的影响 |
| --- | --- | --- |
| 文档模型 | `crates/doc/src/lib.rs` 的 Document、`node.rs` 的 NodeId/NodeKind/NodeExtras；原生版本化文档 | 原生对象模型与 SVG DOM 不等价，需处理双向转换和稳定标识 |
| 选择、文字、变换、历史 | engine 命令/选择状态，History/HistoryEntry；文字独立对象 | 可参考命令与历史思想，但无法作为 React 组件直接导入 |
| SVG 导入导出 | `crates/svg` 使用规范化几何，单独处理文字；支持嵌入原生编辑元数据 | 普通 SVG 往返可能改写原结构，私有元数据不保证外部软件保真 |
| 浏览器 | `apps/vectorcraft-web/src/main.rs`、`web.rs` 启动完整 eframe/egui 应用，Rust/WASM，WebGL/WebGPU | 核查时未发现窄的外部文档编辑通信接口；需要新增加载/导出、命令、选择与变更事件、只读状态、IME/焦点、尺寸和销毁接口，并裁剪完整 UI |
| 实际运行 | 官方原生 0.10.0 中，图研旧 SVG 文字、渐变和分组能编辑、保存重开；marker 在导入时拆为普通路径；字体发生回退 | 不能把“能打开 SVG”作为箭头语义保留或无损兼容证据 |

本次采用图研专用 SVG DOM 编辑层。收益是直接保留 text、marker、渐变引用、裁剪和原分组，无 Rust/WASM 构建或整套 egui 界面嵌入；代价是编辑范围较窄，复杂路径、文字排版及兼容维护由图研承担。没有复制 VectorCraft 代码、字体、图标或品牌资源，也没有增加依赖。若以后复用代码，需保留 MIT/Apache-2.0 许可证及 NOTICE，并另核字体、素材和品牌授权。

前置实测的证据：

`/Users/a1-6/.codex/visualizations/2026/10/13/01a1342b-d103-7102-b88e-beffa957f764/vectorcraft-roundtrip/验收记录.md`

## 实现范围

- SVG 路径在现有结果区直接显示画布；未生成时按比例显示空画布。没有独立页面或编辑模式入口。可在当前页面展开；候选标签分别保留文档、历史及草稿。
- 生成、自动评审与自动修订期间只读，可缩放和平移；终态自动编辑。单击选择/拖动，双击 text/tspan 改字，Shift 多选、Alt 选择组内对象。
- 紧凑属性区支持文字字体/字号/颜色/对齐，图形填充/描边/线宽/透明度，拖动缩放、旋转增量，简单箭头端点/方向/虚实线，渐变现有色标、分组/取消分组、六向对齐、水平/垂直均匀分布、置顶/置底。
- 撤销/重做使用完整 SVG 快照，最多 40 个历史状态并限制历史内存。历史只在当前会话保留，重开恢复当前草稿，不恢复整条撤销栈。
- 文档 XML 是编辑、草稿和导出的唯一源；运行时选择框不写入 SVG。保留原有 ID，补充 `data-tuyan-id`。不栅格化整图、不自动转曲文字。
- 原件与手工稿分开，草稿绑定 API、账号、任务和候选。手工稿仅标“已手动修改”；原始任务/评审置于明确标注的折叠记录中，修改版不继承原件通过结论。
- IndexedDB 保存当前稿，localStorage 写入同步恢复副本。写入失败、恢复副本及多页面保存冲突明确提示；待保存时提示页面关闭。跨账号不列出/加载他人草稿，退出账号沿用现有私有工作区清理。它是浏览器本地隔离，不是加密存储或账号云同步。
- AI 修订沿用已有 SVG 源码材料恢复流程，把当前稿和原任务输入回填左侧；只有用户提交才调用模型。本次没有自动触发模型或复评。数据图以及含内嵌图片/裁剪/复杂样式的稿件暂不开放此入口，并明确解释原因：浏览器可编辑子集比当前生成链更宽，不能默许有损再生成。
- 对已识别数据图，几何操作要求用户明确确认其数值表达影响；不修改原始数据。其他 SVG 也有数据表达提醒，因为任意 SVG 的数据语义不能可靠自动识别。
- Core 只追加一条独立 Unicode 文字、语义分组、稳定 ID 和 marker 箭头的生成提示，不能保证真实模型一定遵从。共享事项已登记 SYNC.md。

代码入口：`apps/web/src/components/SvgResultWorkspace.jsx`、`SvgEditorCanvas.jsx`、`svgWorkspace.css`；文档/草稿/阶段逻辑在 `apps/web/src/lib/svgDocument.js`、`svgDrafts.js`、`svgGeneration.js`。

## 实际验收

本轮证据目录（以下文件名均相对此目录）：

`/Users/a1-6/.codex/visualizations/2026/10/13/01a1342b-d103-7102-b88e-beffa957f764/svg-workbench-implementation`

专用 Vite `127.0.0.1:5189` 与模拟 API `127.0.0.1:5190`，页面有模拟标识。模拟 API 只读本地夹具，不连接模型服务。`local-server.mjs` 可复跑；`phase.json` 的 0/1/2/3/4 分别提供材料读取、规划、v1、v2、完成记录。它验证阶段传输/画布生命周期，不证明模型本身实现这些阶段。

| 验收 | 实际结果 |
| --- | --- |
| 选择 SVG、空画布、真实阶段 | 页面选择 SVG 后显示 16:9 空画布；按模拟后端记录显示读取、规划、实际已有文件 v1、不同 v2；运行中不能改字但能缩放 |
| 任务结束直接编辑 | 终态不需点击编辑入口；已有图研 SVG 的 Check 改为“手工检查 Δ ≤ 0.05”，撤销/重做、保存；候选切换保留 |
| 中文/数学与样式 | 补充夹具中的中文改为“编辑后样本 μ ± σ”；保留独立 text；修改渐变色标和箭头颜色/虚线 |
| 几何和分组 | 实际拖动矩形、旋转 12°、拖动缩放；线终点 X 425→445；三对象多选、对齐、均匀分布、分组及取消分组 |
| 保存、刷新和重新打开 | 实际点击保存，刷新页面，从草稿选择器重开候选 2；候选 1 的独立改字仍在 |
| 导出一致性 | 实际点击导出 SVG；浏览器所示、重开文档及导出文件做结构比较均一致，见 `export-consistency.json` |
| 元素独立性 | 实际导出保留 4 text、7 rect、3 g、1 line、1 marker、1 linearGradient、1 clipPath、1 内嵌 image；未扁平化 |
| Inkscape | 1.4.4 打开实际导出，文字工具独立选中中文，追加“ · Ink”，另存、关闭、重开；CLI 再读取并渲染实际保存文件 |
| PNG 与多候选 | 仍走原 JobStatus，两个 PNG 均实际加载（naturalWidth 900），原下载全部/单张下载/精修入口仍在；未将 PNG 当成可编辑 SVG |
| 小屏 | 390×844 展开画布检查，documentWidth 390、画布宽 382，无横向溢出；测试后恢复浏览器尺寸 |

PNG 模拟夹具最初给两张图相同 filename，造成原 JobStatus 的 React 重复 key 诊断；已修正本地夹具为不同文件名，不因此改动原产品组件。不得把早期浏览器日志概括为零错误。

实际导出 `edited-export.svg` 的 SHA-256：`f93b8ca226de522aef3e4277ec3350263af707049dc8f06926674a78c1884638`。

证据包含 `browser-final.png`、`browser-edited.png`、`browser-reopened.png`、`browser-mobile-expanded.png`、`browser-png-regression.png`、`inkscape-opened.png`、`inkscape-text-selection.png`、`inkscape-roundtrip.svg.svg`、`inkscape-roundtrip-render.png`。Inkscape 另存文件名的双扩展名来自原生保存对话框，不是模型输出。

## 自动化验证

在有效工作树运行：

```sh
pnpm --filter @paperbanana/web exec node --import tsx --import ./tests/dom-setup.mjs --test tests/svg-workspace.test.mjs tests/material-workflow-ui.test.mjs tests/figure-restore-privacy.test.mjs tests/journal-rules.test.mjs
pnpm --filter @paperbanana/paperbanana-api exec node --import tsx --test tests/svg-workflow.test.ts
pnpm --filter @paperbanana/web build
```

- 本任务 SVG 12 项与材料 UI 5 项 **17/17 通过**：含安全边界、defs/中文/marker/分组保留、历史、账号/候选隔离、IDB 失败恢复、写入冲突、坏版本不清空、任务恢复不覆盖手工稿、元数据不进入活动 DOM，以及更窄的 AI 再生成兼容提示。
- 早一轮含隐私/期刊的综合回归为 28/28；追加一项 SVG 兼容保护测试后，收尾综合结果为 **27/29**。期间并行期刊文件在 19:23 更新。当前失败为 `saved task restores canonical originals...` 的期刊按钮名称断言，以及 `pending scopes...` 对新增重复提示的单元素查询。使用本任务开始时的 App 基线重跑两项仍失败，见 `concurrent-baseline-tests.log`。本任务未改动这些期刊文件或断言；不能继续用早一轮结果宣称当前综合测试全绿。
- Core SVG 工作流 **16/16 通过**，使用模拟模型响应与本地渲染，没有付费调用。
- Web 生产构建通过。收尾主包约 4.88 MB / gzip 702 KB，有超过 500 KB 的 Vite 警告；不能据构建成功认定性能达标。
- 另运行既有 `figure-app-completion.test.mjs` 时有两项失败：专用图输入恢复/提交的旧断言与当前表单/能力桩不一致。使用本任务开始时保存的 App.jsx 基线，通过外部加载钩子重跑同样两项仍失败；未覆盖基线或修改期刊实现来消除它们。证据为 `baseline-tests.log` 和 `baseline-loader.mjs`。因此不宣称整个仓库测试全绿。

## 仍未支持或未通过的部分

1. 没有逐 token/片段流式 SVG；完整模型结果出现前只能展示真实阶段。失败版本和不支持的内容不会被伪造补全。
2. 不支持贝塞尔节点编辑、复杂路径箭头端点、复杂 textPath/富文本整体改字、裁剪/蒙版/图案/use 的内部参数编辑。简单箭头支持 line、polyline/polygon 端点与绝对 M/L 直线路径。已有轮廓文字不能直接改字。
3. SVG 子集有明确安全上限：2 MB / 12000 元素；拒绝外链、脚本、动画、foreignObject、滤镜和不支持的样式；不静默删除这些内容后宣称成功。元数据保留在文档和导出中，但不实例化为画布活动 DOM。
4. 改变带整体透明度/裁剪/蒙版或被引用的组、改变含样式表的分组，可能改变外观，因此相应分组操作明确拒绝；跨父组/不相邻对象也不强行重组。复杂结构原件保留。
5. 内嵌 PNG/JPEG/WebP 可作为对象移动/缩放，内部像素不可编辑。补充夹具发现浏览器与 Inkscape 对裁剪内图片宽高比/边缘的显示差异；虽保留同一 XML，也不能认定外观无损。
6. 中文与数学 Unicode 未转曲，实际可改；Inkscape 仍有字体回退提示。未安装字体或嵌入商业字体；复杂公式排版、所有平台字体一致性未验收。
7. 本地手工稿尚无账号云同步，清除浏览器数据会丢失；需导出备份。未增加审稿模型调用；原始版本的评审不适用于修改版。
8. 浏览器 CPU、超大复杂图性能、Safari/Firefox/其他客户端未验收。真实模型遵循 ID/分组提示的质量、模型费用和生产可用性均未验收。

## 并行工作保护

任务开始时的目标文件副本和哈希保存在 `baseline/` 与 `baseline-manifest.json`。结束时逐项对照：App.jsx 仅增加 SVG 组件导入和结果区条件接入，main.jsx 仅增加 CSS，handler.ts 仅追加上述提示行，SYNC.md 仅新增本任务条目；JobStatus.jsx 与本任务基线完全一致。没有回滚、整体覆盖或修改期刊规则实现，没有自动应用旧补丁或同步上游。小程序继续暂停，已有脏改动保留。
