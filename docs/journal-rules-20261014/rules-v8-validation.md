# v8 本地验证 · 2026-10-14

工作树：`/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009`，分支 `codex/tuyan-v400-workflow-20261009`，HEAD `5e6989f59416e44d9f22fd26703d3830ed861ea7`。桌面旧副本未用于开发。

## 验证结果

| 验证 | 结果 | 证明范围 |
| --- | --- | --- |
| Core `node --import tsx --test tests/journal*.test.ts` | 64/64 | 包含 20 组本地 Gateway/Core/内存数据库/对象存储链路；400 次合成模型响应、真实调用 0 |
| Web 6 个定向文件 | 53/53 | 选择/取消/Escape、保存、请求、原图身份与图型继承、换图隔离、历史、导出错误、现行与旧版规则 |
| Core `npm run check` | 通过 | TypeScript 静态检查 |
| Web `npm run build` | 通过 | 仍有既存大 chunk 提示，不代表性能或生产验收 |
| Chrome 桌面与 390×844 | 通过本轮操作 | Cell 部分支持、v8、本刊正文/GA 差异、8–12 pt、通用 AI 限制、取消后仍为不指定期刊；没有发起模型任务；浏览器错误日志为空 |

Core 最终日志为 `core-tests-final.log`。Web 命令：

```sh
node --import tsx --import ./tests/dom-setup.mjs --test tests/journal-rules.test.mjs tests/refine-source-contract.test.mjs tests/refine-upload.test.mjs tests/figure-restore-privacy.test.mjs tests/rendered-interactions.test.mjs src/lib/refineSource.test.js
```

日志、PDF 及图片位于 `/Users/a1-6/.codex/visualizations/2026/10/14/tuyan-journal-rules-v8`。定向重跑与全组存在重叠，不相加计算通过数量。

## 本轮关键覆盖

- v7 Cell/HSSC 与当前版本分别经生成、原图精修、任务记录、来源材料身份恢复和导出；旧版本不自动升 v8。v1–v7 数据文件原字节保持，来源和规则日期可追溯。
- Current Cell 的 GA/封面生成及精修在模型调用前拒绝。数据原图上传后精修拒绝且没有增加模型调用；数据生成的人工条件不被精修禁令错误阻断。示意图精修的未单列许可保持未规定，而非冒充官方禁止。
- PNG/TIFF 实际文件核对：低像素图不能靠高 DPI 元数据或 TIFF 包装通过；转换保持原像素。彩色/灰度不误用 500 ppi 阈值，线稿按 1000 ppi；黑白类别与字体为不可自动检查。
- GA 尺寸检查使用真实 1200×1200、1024×1024、1200×600 文件，尺寸、密度与 AI 许可独立报告。直接检查器夹具验证不表示可以绕过 GA 生成限制创建实际模型任务。
- 共同最大宽度检查允许低于最大值的宽度，不把 85/114/174 强行当作离散唯一值。Supplementary 与 GA 不继承正文终稿格式。
- SVG 内嵌位图仍不认证完整可编辑矢量；PDF 导出仍明确不支持。
- HSSC 180 mm 可判定，87/88 mm 局部待确认，编辑推广指导不能自动认证本刊旧 AI 条款失效。

## 失败分类及修复

1. v7 版本测试错误依赖当前默认目录：固定读取 v7，继续验证历史原语义。测试的直接 JS 目录导入没有类型声明，改用版本常量与已声明的快照 API，未削弱类型检查。
2. 3 项 Web 旧断言仍期待当前 Cell 专项政策未读到或 2018 字体来源：历史案例固定旧版本，当前案例改为已核实的说明图创作条件与尚未单列的精修许可。保留历史日期和取消不升级断言。
3. 新增精修政策测试未提供原图，先触发来源 403：修正夹具使用已上传、归属正确的实际原图，再断言期刊规则 400 和零模型调用。没有放宽来源校验以凑通过。
4. 浏览器发现生成/精修同文政策重复显示：仅合并重复提示，仍保留两份操作证据并优先显示当前阻断状态。
5. 390 px 实看发现列表在有限高度内压缩隐式网格行到 44 px，文字实际需 57 px，溢出到相邻期刊。期刊列表改为内容行高并独立滚动；实测 Cell 按钮高 67 px、内容高 65 px。没有扩大全局按钮样式。

## 保留与运行边界

开发前 4330 个文件哈希，结束无原文件丢失；小程序无本轮变化，旧目录 v1–v7 不变。基线对比中出现 SVG 编辑器、样式和测试的并行改动，本轮未编辑或回退它们。`App.jsx`、Core handler 仅针对期刊操作准入作局部修改，未整体覆盖。

原本 8797/5187 未监听，已启动本地合成 fixture 8797 和仅绑定 127.0.0.1 的 Vite 5187 供界面核验；没有启动真实后端或配置付费任务。浏览器草稿最终取消，恢复原不指定期刊设置，临时窄屏覆盖已重置。

没有同步上游、提交、推送、部署或真实/付费模型调用。小程序继续暂停。以上只证明本地契约、历史和检查程序行为；真实模型质量、科研正确性、期刊接受、HSSC 未决范围和生产验证均不由本轮通过。

![Cell Reports 当前 GA 规则（桌面）](/Users/a1-6/.codex/visualizations/2026/10/14/tuyan-journal-rules-v8/cell-ga-desktop.jpg)

![窄屏列表文字溢出修复](/Users/a1-6/.codex/visualizations/2026/10/14/tuyan-journal-rules-v8/cell-ga-mobile.jpg)
