# 既有真实 SVG 第二轮往返验收

日期：2026-10-13。工作树 `tuyan-v400-workflow-20261009`，分支 `codex/tuyan-v400-workflow-20261009`，起止 HEAD 均为 `5e6989f59416e44d9f22fd26703d3830ed861ea7`。

结论：4 份图研既有 SVG 均完成工作台编辑、浏览器保存、刷新后重开、实际下载导出，以及 Inkscape 打开、独立改字、另存、关闭重开。发现并修复 2 个编辑问题。文档结构和所测对象保留，跨应用字体及部分色调存在差异，不能称为像素级一致或通用无损兼容。

本轮没有新模型调用，也没有修改期刊规则、提交、推送或部署。小程序继续暂停。

## 样本和证据

证据根目录：

`/Users/a1-6/.codex/visualizations/2026/10/13/01a1342b-d103-7102-b88e-beffa957f764/svg-roundtrip-real-corpus`

`sources.json` 保存绝对来源、原件副本及 SHA-256；`inputs/` 原件逐字节保留。本轮使用真实留存文件，不为验收重新拼造 SVG。但这些文件部分源自明确标注的合成教学材料，不能用来证明真实科研数据或生成质量。希腊字母和运算符由本轮实际手工编辑加入，不是模型本轮生成的公式。

| 样本 | 既有来源 | 覆盖内容 |
| --- | --- | --- |
| chinese-tspan | `docs/workflow-v400/bailian-followup-20261010/svg-fresh/ordinary-assisted/candidate-0.svg` | 中文、独立 text、两个 tspan、位移下标、marker 箭头 |
| chinese-groups | `docs/workflow-v400/bailian-followup-20261010/svg-fresh/ordinary-direct/candidate-0.svg` | 中文、Unicode 下标、带 translate 的分组、箭头 |
| gradient-groups | `~/.codex/visualizations/2026/10/12/01a12e7b-3a96-76f3-a717-3f85b95c73aa/integration-live-r5/restored-svg-1-candidate-0.svg` | 共享线性渐变、分组、箭头、独立柱状图面板 |
| nested-workflow-bar | `docs/infographic-v400/completion/evidence/live-bailian/mixed-workflow-bar-svg/candidate-0.svg` | 5 个 SVG 根/嵌套 SVG、58 个组、裁剪、样式表、引用、流程和数据面板 |

前两份及第四份是本轮新增验收样本；渐变样本上一轮也用过，本轮扩大了实际编辑及共享渐变检查。

SHA-256：

```text
chinese-tspan        980882f74f83fbabc2059815836816053f16c63e6f1689f585f8d2b11418f4bf
chinese-groups       5d46a17d1259a07f43221151d2f3dfbbc82b163fda1b2abd4aa2b30496979ead
gradient-groups      781e8a23da8fa50f24e18a7cead80360201d5700ebb8b0e5efc141498beb2f4e
nested-workflow-bar  3f8ab1b4a4aa4efa2e8548a1fc1baad1c90e79d984bcc021e9a4539477fbe5f9
```

## 实际操作和结果

专用本地页面 `http://127.0.0.1:5191/`，文件回放 API `127.0.0.1:5192`。`server.mjs` 只返回上述已有文件，页面明确标识“本地任务回放 · 未调用模型”，`actions.jsonl` 留存任务创建记录。使用任务 `svg-round2-1` 的 4 个候选完成验收，没有请求模型服务。

| 样本 | 图研工作台的实际修改 | 保存及外部检查 |
| --- | --- | --- |
| chinese-tspan | “样品输入”改为“样品 μ ± σ”；第一个 tspan 改为“Δx / x”，第二个下标 tspan 保持独立；撤销、重做 | 保存、刷新重开、导出一致；Inkscape 文字工具追加“ · I”，另存后关闭重开；下标位置保留 |
| chinese-groups | 中间组向下移动 10 单位；文字改为“标准化 α ≤ β”；取消分组后选择两段文字重新分组并整体微移 | 修复后重组及单击选择整个新组成功；Inkscape 追加“ · II”，另存、关闭重开；原组变换和子对象样式保留 |
| gradient-groups | “Check”改为“检查 Δ”；共享渐变两色标改为 `#3b8c84` / `#163f64`，第二色标位置改为 85%；撤销、重做 | 三个框继续共用同一渐变，未复制成位图；Inkscape 追加“ · III”，另存、关闭重开；下方数据面板未改 |
| nested-workflow-bar | “Receive sample”改为“接收样本 μ ± σ”；嵌套组向右移动 10 个根坐标单位；第一箭头改为双向、线宽 3、颜色 `#8e456d`、终点 y=110 | 嵌套坐标换算正确，clipPath、引用和组保留；Inkscape 追加“ · IV”，另存、关闭重开；右侧数据面板未改 |

4 个候选刷新后重开，与刷新前的实际画布 SVG DOM 字符串完全一致，记录在 `browser-reopen-results.json`。撤销历史只在当前页面会话保留，重开恢复当前稿，不声称重建旧撤销栈。

实际点击“导出 SVG”得到的下载文件与画布 XML 做结构比较，4/4 一致；序列化空标签形式不同不算文档内容差异，见 `export-validation.json`。两份包含柱状图的样本，其数据面板在原件与浏览器编辑导出中逐节点一致，仅忽略编辑器补充的 `data-tuyan-id`；没有改变源数据、数值标签或编码几何。

4 份导出和 4 份原件均经 Inkscape 1.4.4 CLI 渲染，全部退出码 0；又在 Inkscape 原生窗口完成独立文字修改及保存重开。原生另存副本保留 text 数量分别为 6、6、14、22；渐变样本保留 1 个 linearGradient/2 个 stop；复杂样本仍有 5 个 SVG、58 个 g、1 个 clipPath 和 2 个 marker。见 `inkscape-roundtrip-validation.json`。结构计数只是辅助，验收同时逐张查看了浏览器截图、原生窗口和外部渲染图。

外观结论：所测文字、下标、箭头、渐变方向、分组位置和嵌套布局保留。浏览器与 Inkscape 的部分字形、字距及色调不完全相同；Inkscape 文字工具栏出现字体警告。导出不携带字体，没有强制替换字体或将文字转曲。未确定全部色差的根因，不能将其直接归因于某个渲染器或色彩配置。

输出文件约定：

- `outputs/*-export.svg`：实际浏览器下载的编辑稿。
- `outputs/*-reopened-browser.svg`：刷新后重开的画布源文档。
- `outputs/*-original-browser-full.png`、`*-edited-browser-full.png`、`*-reopened-browser-full.png`：各阶段浏览器全窗口截图。
- `outputs/*-edited-inkscape.png`：浏览器导出稿在 Inkscape 中的独立渲染。
- `outputs/*-inkscape-roundtrip.svg`、`*.png`：原生另存并重开的外部软件副本及其渲染。
- `outputs/*-inkscape-reopened.png`：原生窗口重开截图；`outputs/final-workbench.png` 为最终工作台。

原生自动化曾因多个 Inkscape 窗口抢焦点生成错误的临时副本 `/tmp/tuyan-rt-3-ink.svg`，未作为验收结果。渐变图的有效副本来自 `/tmp/tuyan-rt-3-ink-verified.svg`，已通过目标文字和文档结构复核后复制到证据目录。浏览器导出及原件没有被覆盖。

## 发现并修复的问题

1. **带变换的分组取消后不能重新分组，重组后的单击选择也被透明包装层截断。** 取消分组为保留继承样式和变换会留下单子节点包装组，旧逻辑只比较文字的直接父级。现在将这些包装层作为原子节点重新组合，选择逻辑跨过透明包装层找到真实外层组；Alt 仍可选择叶节点。真实样本修复前报“需同一父组”，修复后能重新分组、单击整体选中并移动，变换和样式保持不变。
2. **桌面/窄屏布局切换重新挂载 SVG 结果，丢失候选位置、展开状态及撤销栈。** 通过稳定的 portal 容器移动 SVG 结果，保留同一个编辑器实例。真实浏览器 1600×1000 → 390×844 → 1600×1000，修复前候选 2 退回候选 1、画布收起且撤销失效；修复后候选、展开状态、源文档与撤销状态均保留，并实际成功撤销。证据 `resize-before-fix.json` / `resize-after-fix.json`。

本轮代码只有 5 个文件：`SvgEditorCanvas.jsx`、`svgDocument.js`、`svg-workspace.test.mjs`，以及共享 UI 的最小接入 `App.jsx` / `GenerationWorkspace.jsx`。App 仅增加 `preserveResults={useSvgWorkspace(job, outputFormat)}` 一行；PNG 默认仍走原有渲染路径。没有后端或共享契约变化，本轮无需新增 SYNC 协议项。

## 自动检查与边界

串行执行以下 24 项测试全部通过（14 SVG、5 移动工作台、5 材料 UI，包含 SVG/PNG 切换保留模型选择）：

```sh
pnpm --filter @paperbanana/web exec node --import tsx --import ./tests/dom-setup.mjs --test --test-concurrency=1 tests/svg-workspace.test.mjs tests/mobile-workbench.test.mjs tests/material-workflow-ui.test.mjs
pnpm --filter @paperbanana/web build
```

构建成功，仍有现有大包体警告。并行测试与构建同时进行时，材料替换用例有一次 `replacement.json` 等待超时（23/24），改为串行后 24/24 通过；未改测试逻辑或放宽断言。保留 `tests-parallel.log`、`tests-serial.log` 和 `build.log`。

开始时记录 3105 个已有脏文件的哈希；结束检查没有文件缺失，4 份原件 SHA 不变。本轮 5 个代码文件以外，期刊规则测试、期刊目录及 SYNC.md 在核对期间有并发改动，未编辑或回滚这些文件。`preservation-audit.json` 记录差异；`baseline/` 保存本轮编辑前的相关源码。

仍然不支持任意贝塞尔节点编辑、完整富文本排版、任意 marker 内部几何编辑、裁剪/蒙版/图案参数编辑，带样式表的分组拆合仍会明确拒绝以避免改变选择器语义。字体不嵌入，跨软件外观不保证完全相同。本轮 4 份真实样本没有嵌入位图，不能把上一轮夹具覆盖当成这轮真实图片样本验收。

这次只证明既有文件的本地编辑和保存链路。没有重新验证真实模型生成、费用、账号云端草稿持久化、生产任务传输或部署；也没有把旧评审结论转移给手工稿。
