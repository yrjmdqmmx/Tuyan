# 期刊规则 v3 本地验证

日期：2026-10-13。有效工作树：`/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009`。

## 已完成

- Core：28 项通过。包含规则证据、操作分类、明确禁止与未知/冲突分离、v1/v2 冻结、真正 PNG/SVG/TIFF 字节检查。
- 6 组本地 Gateway/Core 模拟链路：Frontiers v1/v2/v3，以及 IEEE Access、Scientific Reports、Cell Reports v3。覆盖生成、规划/评审提示、精修继承、换图不沿用旧判断、原图哈希/归属反例、历史恢复、实际原文件及 TIFF 导出。所有 provider 都是本地合成响应，网络桩拒绝未预期地址。
- Web：45 项通过。选择、取消、搜索、Escape、设置保存、旧任务重开、生成/精修请求、原图绑定和导出失败状态；新增待确认/冲突提示没有“当前不可执行”，明确 GA 限制仍显示不可执行。
- Core TypeScript 检查通过；Web Vite 构建通过。仍有既有大块体积提示，本轮未扩展为打包优化。

首次 Web 回归 43/44：一项仍匹配 v2 的旧摘要文案。更新为 v3 来源冲突摘要后，连同新增用例 45/45；未为该断言改变正确行为。

## 版本与原文件

- v1 catalog SHA-256 保持：`543814eaa2dd03a9aa841d55ad4b7f3199f3cadfa92489a933f60e303e0d65c0`。
- v2 catalog SHA-256 保持：`aed74a57de5bbf7f6cd85fbc300dc0bab3cf69b311d8967ae5b9e967194d515c`。
- 修改前对 4303 个受控/非忽略文件做哈希基线；原有脏改动和并行 SVG 工作均保留，详见证据目录的 preservation.json。

证据目录：`/Users/a1-6/.codex/visualizations/2026/10/13/01a1331a-22f1-70d0-bbcc-0190e8bdab9f/journal-adaptation/rules-v3/`。包括 API/Web 日志、检查/构建日志、6 份官方页面读取记录、IEEE 原版 PDF 与提取文本、修改前后保留核查。

## 验证边界

73 项通过仅表示本地自动化及模拟链路通过，未验证真实模型绘图质量、科学真实性或期刊编辑接受结果。Cell Reports 专项条款仍未取得，Scientific Reports 官方冲突仍未解决，IEEE 图像操作许可未逐项规定；没有宣称七刊全部适配。

未调用付费/真实模型，未同步上游、提交、推送或部署。小程序保持暂停。
