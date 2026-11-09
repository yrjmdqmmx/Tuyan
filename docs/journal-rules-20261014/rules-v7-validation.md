# v7 本地验证 · 2026-10-14

工作树：`/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009`，分支 `codex/tuyan-v400-workflow-20261009`，HEAD `5e6989f59416e44d9f22fd26703d3830ed861ea7`。桌面副本未作为开发目标。

## 验证结果

| 验证 | 结果 | 边界 |
| --- | --- | --- |
| Core `node --import tsx --test tests/journal*.test.ts` | 56/56 通过 | 包含 18 组真实本地 Gateway/Core/内存数据库/对象存储链路；全部模型响应由桩替代。最终一轮 360 次桩响应，真实调用 0 |
| Web 6 个定向文件 | 52/52 通过 | 期刊选择、取消与 Escape、设置保存、生成/精修请求、历史 JSON、来源任务继承、替换/移除/上传晚回包隔离等 |
| Core `npm run check` | 通过 | TypeScript 静态检查 |
| Web `npm run build` | 通过 | 仍有已存在的大 chunk 提示，不据此宣称性能或生产通过 |
| Chrome 本地界面 | 通过本轮目标操作 | HSSC 显示 v7；录用后 87 mm 提示待确认，180 mm 不再显示宽度待确认；取消后入口仍为不指定期刊。仅浏览/改弹窗草稿，无生成请求 |

Web 命令（Node 24 路径 `/usr/local/bin`）：

```sh
node --import tsx --import ./tests/dom-setup.mjs --test tests/journal-rules.test.mjs tests/refine-source-contract.test.mjs tests/refine-upload.test.mjs tests/figure-restore-privacy.test.mjs tests/rendered-interactions.test.mjs src/lib/refineSource.test.js
```

新回归覆盖：

- v6 HSSC/Sage/Cell 经新代码执行历史快照的生成、精修、历史与导出，保持旧版含义；v6 数据文件 SHA-256 未变化。
- HSSC PDF 预检在 initial/revision 报格式不符合，production 保留技术列表与人工矢量条件；实际 PDF 输入和 PDF 导出均仍拒绝，不能凭规则列表声称功能已实现。
- 180 / 87 / 88 / 150 mm 分别得到已检查 / 待确认 / 待确认 / 建议未满足。真实合成 PNG 转 TIFF 后像素维持 1200×600；即使源 PNG 的 DPI 元数据为 1200，180 mm 下有效像素密度仍不足 300，不会冒充通过。
- SVG 内嵌位图时宽度与可编辑性分开报告；宽度通过不将其认证成纯矢量。生成与精修 AI 条件仍需人工检查。
- Cell 失败的来源明确标为 `unverified-access`；历史 GA 数值保持 `null/pending`，未知政策不会新增禁止。

## 失败分类与修复

1. v6 定向测试此前依赖当前默认目录：默认升 v7 后应固定读取 v6，继续验证历史原语义。只调整版本入口，不改 v6 规则期待。
2. 第一轮 Web 发现新数据移除旧字段时遗留 `pendingFormats:undefined`，JSON 往返会丢弃该键。修复为实际删除字段，保留深度相等断言。
3. 第一轮 Core 发现 v6 已将 `cellSubmission` 重复加入来源。属于真实数据缺陷；在 v7 去重，不修改历史 v6。最终整组 56 项通过，未弱化唯一性断言。

日志位于 `/Users/a1-6/.codex/visualizations/2026/10/14/tuyan-journal-rules-v7`：`core-tests-final.log`、`web-tests-final.log`、`core-typecheck.log`、`web-build-final.log`。首轮失败日志保留，不与最终通过轮次叠加计数。

## 脏改动与本地运行状态

开发前保存 4324 个文件哈希。结束比对没有删除原文件；v1–v6 目录原字节保持，小程序文件无本轮变化。期间观察到 SVG 编辑器/对象树/结果工作区/样式/测试的并行改动，未改写或回退。详见证据目录 `baseline.json` 和 `preservation.json`。

仅重启已核对命令和 cwd 的 `8797` 本地合成 fixture，使注册表读取 v7；`5187` 前端经 HMR 显示新目录。没有启动生产服务、同步上游、提交、推送、部署或付费/真实模型调用；小程序继续暂停。

![HSSC v7 本地页面](/Users/a1-6/.codex/visualizations/2026/10/14/tuyan-journal-rules-v7/hssc-desktop.png)

这些结果证明规则传递、历史隔离与文件检查逻辑在本地回归中工作。它们不证明真实模型图像质量、出版方对未决条款的确认、实际投稿合规或生产可用性。官方证据及未决范围见 [核验记录](rules-v7-verification.md)。
