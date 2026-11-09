# v10 本地验证 · 2026-10-14

有效工作树：`/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009`。分支 `codex/tuyan-v400-workflow-20261009`，HEAD `5e6989f59416e44d9f22fd26703d3830ed861ea7`；没有改变提交。

## 结果

| 检查 | 结果 | 实际覆盖 |
| --- | --- | --- |
| Gateway / Core 集成 | 28/28 | 真实本地路由和任务执行，内存数据库/存储及合成提供商；560 次模拟响应，真实模型 0 次 |
| 规则与实际文件 | 56/56 | v1–v10、来源/适用范围、实际 PNG/SVG/TIFF、HSSC 位图/简单矢量/未知内容、Cell 分类及新国内规则 |
| Web 定向回归 | 54/54 | 搜索选择、取消、保存、请求、原任务设置继承、换图隔离、历史、导出错误 |
| TypeScript | 通过 | 最终 `tsc --noEmit` |
| Web 构建 | 通过 | 最终构建成功；仍有既有大 chunk 提示，不等于性能验收 |
| Chrome 本地页面 | 操作通过 | v10 HSSC 阶段切换及新宽度、Cell 条件说明、心理学报自检来源、复用方法框架图；取消后仍不指定期刊 |

共 84 个不同 Core 案例。首次全组为 82/84；集成 28 组全部通过，修正两处测试前提后重跑规则/文件组 56/56。未改实现来迎合失败测试，也未把重叠运行累加。

## 失败分类

1. 通用旧测试把 Cell 的当前政策假设为必有 pending/conflict；v10 的说明图判断已有 conditional 依据。改为分别检查 Cell/Scientific Reports 的 conditional 和 IEEE 的 unspecified，同时保留非阻断与原始科研图像等限制断言。
2. 新测试把所有国内宽度检查统一假设为 pending；《图书情报工作》已有需要人工确认排图方式的 manual 规则，正确结果是 uncheckable。按具体规则断言，保持实现。
3. Web 初跑 52/54：两项仍匹配旧 Cell 精修与 HSSC AI 文案，更新对应断言；当前宽度文本断言随范围解释更新。最后 54/54。
4. v9 测试先固定到其历史 17 刊和 v9 选择，避免默认版本更新改变旧测试含义；旧文件未改写。

## 链路和实际文件

- 新旧 Cell/HSSC 及新增国内期刊经过选择请求→服务端规则快照→规划/生成→精修→结果记录→归属校验导出→历史恢复。v9 Cell 精修仍为 unspecified，v10 为 conditional；原任务规则不自动升级。
- 原任务精修继承图型和期刊；新上传图像有独立身份及性质，换图清除上一张判断。哈希不匹配、跨账号、伪造来源/规则与原始科研图像等拒绝在模型桩调用前发生。
- HSSC 当前位图 88/180 mm 通过宽度建议检查；87/120 mm 为 unmet，未变成任务硬阻断。简单矢量 87/180 通过，88 不满足一般建议；混合和未知 SVG 的单栏仍为 pending。初投不套用制作宽度。预检不凭 SVG/PNG 扩展名认证实际图像类别。
- 可复查文件：证据目录的 `synthetic-hssc-88mm.png`、`synthetic-hssc-88mm.tiff`、`actual-file-reports.json`。这些是 1024×512 的空白合成测试图，非模型成果或科研图片。源 PNG 标注 1200 DPI，但按 88 mm 实际为 295.56 ppi；v10 宽度 checked、300 ppi 建议 unmet，TIFF 保持像素数；同文件 v9 宽度仍 pending。字体、原生细节和科学真实性不自动通过。
- 心理学期刊 AI 自检条款进入生成/精修上下文；数据来源要求只在数据图适用。关联数据仓库推荐格式没有被转成正文图件接收清单。人口研究线条区分没有虚构数值线宽，图书情报工作复杂表格允许全表格线。
- Cell 说明图有条件精修不覆盖数据图模型重绘、原始科研图像、GA/封面；TOC/艺术性插图也不获得说明图许可。HSSC 仍保留集团替代本刊专项条款未被官方确认这一事实。

## 运行、保留与证据

证据目录：`/Users/a1-6/.codex/visualizations/2026/10/14/tuyan-journal-rules-v10`。

- 日志：`core-tests.log`、`core-rules-final.log`、`core-typecheck-final.log`、`web-tests.log`、`web-tests-final.log`、`web-build-final.log`。
- 官方附件及完整提取文本 10 份的哈希见 `download-sha256.json`。
- 开工前 4342 个文件的哈希对照见 `baseline.json` 与 `preservation.json`：没有文件丢失，v1–v9 规则原字节一致，小程序无本轮变动。
- 并行 SVG 会话更改 `SvgEditorCanvas.jsx`、`SvgPathNodes.jsx`、`svgWorkspace.css`、`svgPath.js` 并新增 `svg-path.test.mjs`；本轮没有修改或回退这些文件。浏览器保留两条 01:22:53 UTC 的 SVG 热更新错误，重新构建成功且刷新可正常加载，没有据旧日志声称当前页面失败，也未把其他会话改动算成本轮成果。
- 8797 进程经 PID/工作目录/启动命令确认是合成 fixture 后重载，注册表返回 `journalRuleVersion=2026-10-14.v10`、`journalExportVersion=1`；5187 是有效工作树的 Vite。浏览器未提交模型任务；核验草稿已取消。

未调用真实/付费模型，未同步上游、提交、推送或部署，小程序继续暂停。本地规则、模拟任务与文件检查通过，不代表真实模型质量、生产、科研正确性或投稿通过。
