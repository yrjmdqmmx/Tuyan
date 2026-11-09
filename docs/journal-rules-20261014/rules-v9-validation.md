# v9 本地验证 · 2026-10-14

有效工作树：`/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009`。分支 `codex/tuyan-v400-workflow-20261009`，HEAD `5e6989f59416e44d9f22fd26703d3830ed861ea7`，结束未改变。

## 测试与证据

| 验证 | 结果 | 范围 |
| --- | --- | --- |
| Core 集成链路 | 26/26 | 真实本地 Gateway/Core + 内存数据库/对象存储，520 次模拟提供商响应，真实模型调用 0 |
| Core 规则与实际文件检查 | 50/50 | 各历史规则版本、v9 来源与适用域、实际 PNG/SVG/TIFF、宽度范围与不确定性 |
| Web 定向回归 | 54/54 | 选择、搜索、取消、保存、请求、历史、精修来源身份、换图隔离、导出错误 |
| TypeScript | 通过 | `npm run check` |
| Web 构建 | 通过 | `npm run build`，既有大 chunk 提示仍在，不等于性能/生产验收 |
| Chrome 桌面及 390×844 | 操作通过 | 四本新刊搜索、部分支持状态、规则、复用原图型、取消保留原选择、无横向挤压；错误日志为空 |

第一次 Core 全组为 75/76，唯一失败是 v6 旧目录测试错误遍历当前 17 刊，包含当时不存在的四本新刊。修正测试后重跑全部规则/文件测试 50/50，集成 26/26 已通过且实现没有继续改动。因此有效覆盖为 76 个不同 Core 案例；没有将重叠重跑相加。Web 初跑 53/54，唯一旧文案断言更新后重跑 54/54。

命令：

```sh
# Core（首次全组含 26 个集成案例）
node --import tsx --test tests/journal*.test.ts
# 历史测试修正后的最终规则/文件回归
node --import tsx --test tests/journal-rules*.test.ts
npm run check
# Web
node --import tsx --import ./tests/dom-setup.mjs --test tests/journal-rules.test.mjs tests/refine-source-contract.test.mjs tests/refine-upload.test.mjs tests/figure-restore-privacy.test.mjs tests/rendered-interactions.test.mjs src/lib/refineSource.test.js
npm run build
```

日志与汇总：`/Users/a1-6/.codex/visualizations/2026/10/14/tuyan-journal-rules-v9` 下 `core-regression.log`、`core-rules-final.log`、`web-regression.log`、`core-typecheck.log`、`web-build.log`、`regression-summary.json`。较早的 22 项定向结果是重叠覆盖，不另行累加。

## 关键行为

- 四本新增期刊和 Cell/HSSC 当前及 v8 历史版本都经过完整请求→服务端冻结规则→规划/生成→原图精修→结果记录→按归属导出→历史恢复。记录原规则版本，旧任务不自动升级。
- 现有任务精修继承原图型、期刊选择和规则；新上传原图需要自己的性质确认。更换图片清除上一张的性质与期刊判断，迟到的任务读取不能覆盖新原图。
- HSSC 预检只知道扩展名时仍保留 87/88 mm 待确认。读取简单无资源引用 SVG 后，87/180 mm 为已检查、88 mm 不满足一般建议；这不意味着可编辑性、字体、原生细节通过。
- PNG 与原像素转 TIFF 的 87/88 mm 都保留待确认；180 mm 可检查。含图片、外链、数据链接、foreignObject、过滤器、样式、动态处理和其他无法确认节点的 SVG 不获宽度范围认证。
- 新增国内期刊没有杜撰统一 DPI、色彩、独立图件格式或栏宽。实际文件检查将缺失/含糊阈值列 pending，将字体和科学真实性列 uncheckable；伪造高 DPI 元数据不会让未核实规则通过。
- Cell 精修仍有准确的未单列许可提示；说明图创作的有条件许可不被精修未知误伤。数据图重绘、原始科研图像、GA/封面既有限制继续在调用模型前生效。

## 本轮失败的性质

1. v8 历史测试从“当前目录”取默认版本，会随着默认版本变化；固定其 v8 选择，保留旧断言。直接导入未声明类型的旧 JS 目录触发 TS7016，改用已有类型的快照接口，没有关闭类型检查。
2. v6 旧测试遍历了 v9 新增 ID；固定 v6 当时的 13 刊。没有向旧目录追补新刊。
3. Web 测试匹配“未单独逐项说明”的旧措辞；新文本增加官方速查表证据但仍为未单列精修许可，更新文案断言，不更改正确准入行为。

## 保留核查与运行状态

开工前 4336 个非忽略文件哈希对照：没有原文件丢失，v1–v8 规则目录原字节相同，小程序无本轮变化。并行 SVG 工作涉及 `SvgEditorCanvas.jsx`、`svgSelection.js`、`svg-selection.test.mjs`；本轮未编辑或回退这些文件。`preservation.json` 保存逐文件变化清单。

本地 8797 已确认是合成 fixture 后重载新目录，注册表返回 `journalRuleVersion=2026-10-14.v9`、`journalExportVersion=1`；5187 为有效工作树的 Vite。未启动真实后端。浏览器没有提交模型任务，最终取消期刊草稿并恢复不指定期刊，窄屏覆盖已重置。

没有付费/真实模型调用、上游同步、提交、推送或部署；小程序继续暂停。HSSC 位图单栏重叠及 AI 条款优先级、Cell 说明图生成式精修的单独许可仍未取得足以消除疑点的官方证明。上述本地通过不代表真实模型质量、科学正确性、生产或投稿通过。

![国内期刊规则（桌面）](/Users/a1-6/.codex/visualizations/2026/10/14/tuyan-journal-rules-v9/domestic-desktop.jpg)

![国内期刊规则（390 px）](/Users/a1-6/.codex/visualizations/2026/10/14/tuyan-journal-rules-v9/domestic-mobile.jpg)
